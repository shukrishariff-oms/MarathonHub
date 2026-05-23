"""Ingest folder of marathon photos -> face embeddings -> MH backend.

Runs on Syuk's RTX 2070 PC. Walks a folder, runs insightface on each
photo, batches the embeddings, POSTs to MH /api/faces/ingest.

Usage:
    python ingest_folder.py \\
        --folder /data/events/twincity-2026 \\
        --event-id 12 \\
        --photographer-id 5 \\
        --source mh \\
        --base-url https://marathonhub.ohmaishoot.com \\
        --token <FACES_INGEST_TOKEN> \\
        --replace

`--replace` wipes existing rows for that event_id BEFORE inserting (use
when re-running with a different model version). Otherwise we just
append; the photo_id key keeps everything idempotent on re-runs as
long as the source files haven't changed.

Designed for batch jobs (a few thousand photos, run once per event).
Not optimised for streaming or live updates — if you need live, run
embed_server and have your photographer-tools push selfies through
that instead.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Iterable, List, Optional

import cv2
import numpy as np
import requests
from tqdm import tqdm


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("ingest")


SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


# ---------------------------------------------------------------------------
# Photo identifier — stable across re-runs so re-ingest is idempotent.
# ---------------------------------------------------------------------------
def photo_id_for(path: Path, mode: str = "sha1") -> str:
    if mode == "filename":
        return path.name
    if mode == "relpath":
        return str(path)
    # default sha1 of full path — short, collision-free in practice.
    h = hashlib.sha1(str(path.resolve()).encode("utf-8")).hexdigest()
    return h[:16]


def iter_photos(folder: Path) -> Iterable[Path]:
    for p in sorted(folder.rglob("*")):
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXT:
            yield p


# ---------------------------------------------------------------------------
# Insightface loader
# ---------------------------------------------------------------------------
_face_app = None


def get_face_app(ctx_id: int = 0, det_size: int = 640, min_face: int = 60):
    global _face_app
    if _face_app is not None:
        return _face_app
    log.info("loading insightface buffalo_l (ctx_id=%d, det_size=%d)...", ctx_id, det_size)
    from insightface.app import FaceAnalysis

    fa = FaceAnalysis(
        name="buffalo_l",
        providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
    )
    fa.prepare(ctx_id=ctx_id, det_size=(det_size, det_size))
    _face_app = fa
    log.info("model ready")
    return _face_app


# ---------------------------------------------------------------------------
# Single-photo processing
# ---------------------------------------------------------------------------
def process_photo(
    path: Path,
    face_app,
    *,
    photo_id: str,
    source_url: str,
    thumbnail_url: Optional[str],
    event_id: Optional[int],
    photographer_id: Optional[int],
    source: str,
    min_face: int = 60,
    max_dim: int = 2000,
) -> List[dict]:
    """Return a list of FaceIngestItem dicts (one per detected face)."""

    img = cv2.imread(str(path))
    if img is None:
        log.warning("skip (cannot decode): %s", path)
        return []

    # Resize huge originals before detection — insightface resizes to
    # det_size internally anyway, but feeding it a 24MP file is slow
    # and uses VRAM unnecessarily.
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))

    faces = face_app.get(img)
    if not faces:
        return []

    items: List[dict] = []
    for f in faces:
        bbox = getattr(f, "bbox", None)
        if bbox is None or len(bbox) < 4:
            continue
        x1, y1, x2, y2 = map(int, bbox[:4])
        bw, bh = x2 - x1, y2 - y1
        if min(bw, bh) < min_face:
            continue
        emb = np.asarray(f.normed_embedding, dtype=np.float32)
        if emb.shape != (512,):
            log.warning("unexpected embedding shape %s on %s", emb.shape, path)
            continue
        items.append({
            "photo_id": photo_id,
            "event_id": event_id,
            "photographer_id": photographer_id,
            "source": source,
            "source_url": source_url,
            "thumbnail_url": thumbnail_url,
            "embedding": emb.tolist(),
            "bbox_x": x1,
            "bbox_y": y1,
            "bbox_w": bw,
            "bbox_h": bh,
            "det_score": float(getattr(f, "det_score", 0.0)),
        })
    return items


# ---------------------------------------------------------------------------
# Batch sender
# ---------------------------------------------------------------------------
class IngestClient:
    def __init__(self, base_url: str, token: str, batch_size: int = 200):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.batch_size = batch_size
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "MH-FaceWorker/0.1",
        })
        self.inserted = 0
        self.skipped = 0
        self.errors: List[str] = []

    def replace_event(self, event_id: int) -> int:
        """Wipe existing rows for an event before re-ingesting.

        Uses the dedicated DELETE endpoint so the server logs it as one
        explicit action (vs implicit replace_event in the ingest payload,
        which is also fine but harder to audit).
        """
        url = f"{self.base_url}/api/faces/event/{event_id}"
        r = self.session.delete(url, timeout=30)
        if r.status_code != 200:
            raise RuntimeError(f"replace_event failed: {r.status_code} {r.text[:200]}")
        return r.json().get("deleted", 0)

    def send_batch(self, items: List[dict]) -> None:
        if not items:
            return
        url = f"{self.base_url}/api/faces/ingest"
        r = self.session.post(
            url,
            data=json.dumps({"items": items}),
            timeout=120,
        )
        if r.status_code != 200:
            self.errors.append(f"batch failed {r.status_code}: {r.text[:200]}")
            log.error("batch failed: %s %s", r.status_code, r.text[:200])
            return
        body = r.json()
        self.inserted += body.get("inserted", 0)
        self.skipped += body.get("skipped", 0)
        if body.get("errors"):
            self.errors.extend(body["errors"])

    def send_in_chunks(self, items: List[dict]) -> None:
        for i in range(0, len(items), self.batch_size):
            self.send_batch(items[i:i + self.batch_size])


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Ingest a folder of photos into MH face index.")
    ap.add_argument("--folder", required=True, type=Path, help="Folder of photos to ingest.")
    ap.add_argument("--event-id", type=int, default=None)
    ap.add_argument("--photographer-id", type=int, default=None)
    ap.add_argument(
        "--source",
        default="mh",
        choices=["mh", "workonfaith", "rkshoots", "external"],
    )
    ap.add_argument("--base-url", default="https://marathonhub.ohmaishoot.com")
    ap.add_argument("--token", default=os.getenv("FACES_INGEST_TOKEN", ""))
    ap.add_argument(
        "--source-url-prefix",
        default="",
        help="Prefix to prepend to filename when building source_url. "
             "If empty, uses 'file://<absolute-path>'.",
    )
    ap.add_argument(
        "--id-mode",
        default="sha1",
        choices=["sha1", "filename", "relpath"],
        help="How to derive photo_id from each file path.",
    )
    ap.add_argument("--batch-size", type=int, default=200)
    ap.add_argument("--min-face", type=int, default=60, help="Drop faces smaller than this (px).")
    ap.add_argument("--ctx-id", type=int, default=0, help="GPU index. -1 for CPU.")
    ap.add_argument("--det-size", type=int, default=640)
    ap.add_argument("--replace", action="store_true",
                    help="Wipe existing embeddings for --event-id before inserting.")
    ap.add_argument("--limit", type=int, default=0, help="Only process first N files (debug).")
    args = ap.parse_args()

    if not args.token:
        log.error("missing --token (or set FACES_INGEST_TOKEN env)")
        sys.exit(1)
    if not args.folder.exists():
        log.error("folder not found: %s", args.folder)
        sys.exit(1)

    photos = list(iter_photos(args.folder))
    if args.limit > 0:
        photos = photos[:args.limit]
    if not photos:
        log.error("no photos found under %s", args.folder)
        sys.exit(1)
    log.info("scan: %d photos under %s", len(photos), args.folder)

    client = IngestClient(args.base_url, args.token, batch_size=args.batch_size)

    if args.replace:
        if args.event_id is None:
            log.error("--replace requires --event-id")
            sys.exit(1)
        deleted = client.replace_event(args.event_id)
        log.info("replace: deleted %d existing rows for event_id=%d", deleted, args.event_id)

    face_app = get_face_app(
        ctx_id=args.ctx_id,
        det_size=args.det_size,
        min_face=args.min_face,
    )

    started = time.time()
    pending: List[dict] = []
    no_face = 0

    for path in tqdm(photos, desc="embed", unit="photo"):
        pid = photo_id_for(path, mode=args.id_mode)
        if args.source_url_prefix:
            # E.g. https://photos.foo.com/event-12/IMG_0001.jpg
            rel = path.name
            source_url = args.source_url_prefix.rstrip("/") + "/" + rel
        else:
            source_url = f"file://{path.resolve()}"

        try:
            items = process_photo(
                path,
                face_app,
                photo_id=pid,
                source_url=source_url,
                thumbnail_url=None,
                event_id=args.event_id,
                photographer_id=args.photographer_id,
                source=args.source,
                min_face=args.min_face,
            )
        except Exception as exc:
            log.warning("error on %s: %s", path, exc)
            continue

        if not items:
            no_face += 1
            continue

        pending.extend(items)
        if len(pending) >= args.batch_size:
            client.send_in_chunks(pending)
            pending.clear()

    if pending:
        client.send_in_chunks(pending)

    elapsed = time.time() - started
    log.info(
        "done: photos=%d no_face=%d faces_inserted=%d faces_skipped=%d errors=%d in %.1fs",
        len(photos), no_face, client.inserted, client.skipped,
        len(client.errors), elapsed,
    )
    if client.errors:
        log.warning("first few errors: %s", client.errors[:5])


if __name__ == "__main__":
    main()
