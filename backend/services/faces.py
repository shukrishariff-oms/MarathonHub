"""Face embedding helpers — encoding, similarity, ingest auth, selfie proxy.

The actual neural-net inference (insightface) lives on Syuk's RTX 2070 PC,
not on the VPS. This module is intentionally numpy-only so the VPS stays
light: ~5MB extra dependency, no GPU, no onnxruntime, no model files.

Two roles for this service:

1. INGEST PATH — the PC runs insightface on a folder of marathon photos
   and POSTs batches of {photo_id, embedding, bbox, ...} to
   /api/faces/ingest. This module decodes/validates each embedding.

2. SEARCH PATH — when a runner uploads a selfie, we need ONE embedding
   for the selfie. Two options, pick whichever is configured:
     a) FACES_EMBED_URL env points to PC's /embed endpoint
        (Cloudflare tunnel) — we forward the selfie there and get back
        a 512-float vector.
     b) Caller already computed the embedding and passes it directly
        (frontend face-api.js path, future).

Embeddings are stored as raw little-endian float32 bytes:
    np.asarray(vec, dtype="<f4").tobytes()
That's 512 dims * 4 bytes = 2048 bytes per face. Decoded on demand at
search time — at ~50K rows for the projected catalogue this is fast
enough for SQLite brute-force scan (~50ms with numpy vectorisation).
"""

from __future__ import annotations

import json
import os
import secrets
from typing import Iterable, List, Optional, Sequence
from urllib import request as _urlreq, error as _urlerr

import numpy as np


EMBEDDING_DIM = 512  # insightface buffalo_l default
EMBEDDING_BYTES = EMBEDDING_DIM * 4  # float32


# ---------------------------------------------------------------------------
# Auth — simple shared-token for the PC ingest worker.
# ---------------------------------------------------------------------------
def get_ingest_token() -> str:
    """Return the configured ingest token, or "" if not set.

    Set FACES_INGEST_TOKEN as a Coolify env var. Anyone with this token
    can write face embeddings — treat it like a write-only API key. We
    don't auto-generate a fallback because silent token rotation =
    silent ingest breakage on the PC side.
    """

    return os.getenv("FACES_INGEST_TOKEN", "").strip()


def verify_ingest_token(provided: Optional[str]) -> bool:
    expected = get_ingest_token()
    if not expected:
        # Fail closed: no token configured = ingest is disabled.
        return False
    if not provided:
        return False
    # Constant-time compare to avoid token-length leak via timing.
    return secrets.compare_digest(expected, provided.strip())


# ---------------------------------------------------------------------------
# Embedding encode / decode
# ---------------------------------------------------------------------------
def encode_embedding(vec: Sequence[float]) -> bytes:
    """Validate + serialise a single embedding to float32 little-endian bytes."""

    arr = np.asarray(vec, dtype="<f4")
    if arr.ndim != 1:
        raise ValueError(f"embedding must be 1-D, got shape {arr.shape}")
    if arr.shape[0] != EMBEDDING_DIM:
        raise ValueError(
            f"embedding must have {EMBEDDING_DIM} dims, got {arr.shape[0]}"
        )
    if not np.isfinite(arr).all():
        raise ValueError("embedding contains NaN/Inf")
    return arr.tobytes()


def decode_embedding(blob: bytes) -> np.ndarray:
    if len(blob) != EMBEDDING_BYTES:
        raise ValueError(
            f"embedding blob must be {EMBEDDING_BYTES} bytes, got {len(blob)}"
        )
    return np.frombuffer(blob, dtype="<f4")


def normalise(arr: np.ndarray) -> np.ndarray:
    """L2-normalise so cosine similarity = dot product.

    Insightface already returns L2-normalised embeddings, but we
    re-normalise defensively in case the ingest source skipped it (or
    used a different backbone). Cheap operation, eliminates a class of
    silent threshold-tuning bugs.
    """

    norm = np.linalg.norm(arr)
    if norm < 1e-9:
        return arr  # zero vector — caller should reject upstream
    return arr / norm


def cosine_search(
    query: np.ndarray,
    candidates: np.ndarray,
    threshold: float = 0.5,
    top_k: int = 50,
) -> List[tuple[int, float]]:
    """Return [(index_in_candidates, similarity), ...] sorted desc.

    `candidates` must be shape (N, EMBEDDING_DIM), already L2-normalised.
    `query` must be shape (EMBEDDING_DIM,), already L2-normalised.

    Threshold defaults to 0.5 — insightface buffalo_l on faces of the
    same person typically scores 0.55-0.85 cosine. Below 0.4 is almost
    always a different person; 0.5 is a fair middle ground. Tune via
    the search endpoint's threshold query param.
    """

    if candidates.size == 0:
        return []
    sims = candidates @ query  # (N,)
    # argpartition + filter is faster than full sort for top-k on big N.
    above = np.where(sims >= threshold)[0]
    if above.size == 0:
        return []
    above_sims = sims[above]
    order = np.argsort(-above_sims)[:top_k]
    return [(int(above[i]), float(above_sims[i])) for i in order]


# ---------------------------------------------------------------------------
# Selfie embedding proxy (forward to PC's /embed endpoint).
# ---------------------------------------------------------------------------
class EmbedError(Exception):
    """Raised when the selfie-embedding backend is unreachable or failed."""


def get_embed_url() -> str:
    return os.getenv("FACES_EMBED_URL", "").strip()


def embed_selfie_via_proxy(
    image_bytes: bytes,
    content_type: str = "image/jpeg",
    timeout: float = 15.0,
) -> List[float]:
    """POST a selfie to the configured embed endpoint, return one embedding.

    Expected upstream contract (on PC's side, we'll write the worker
    later):
        POST {FACES_EMBED_URL}
        Headers: Authorization: Bearer <FACES_EMBED_TOKEN>  (optional)
        Body: raw image bytes, Content-Type: image/jpeg|png
        Response 200: {"embedding": [512 floats], "det_score": 0.99}
        Response 400: {"detail": "no face detected"} (etc.)
    """

    url = get_embed_url()
    if not url:
        raise EmbedError(
            "Face embedding service tidak dikonfigurasi (FACES_EMBED_URL kosong). "
            "PC RTX 2070 belum ON ke?"
        )

    req = _urlreq.Request(url, data=image_bytes, method="POST")
    req.add_header("Content-Type", content_type)
    token = os.getenv("FACES_EMBED_TOKEN", "").strip()
    if token:
        req.add_header("Authorization", f"Bearer {token}")

    try:
        with _urlreq.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
    except _urlerr.HTTPError as exc:
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("detail", "")
        except Exception:
            detail = ""
        raise EmbedError(
            f"Embed service balas {exc.code}: {detail or exc.reason}"
        ) from exc
    except (_urlerr.URLError, TimeoutError) as exc:
        raise EmbedError(
            f"Embed service tidak dapat dihubungi: {exc}. PC RTX 2070 ON tak?"
        ) from exc

    try:
        payload = json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise EmbedError(f"Embed service balas bukan JSON: {exc}") from exc

    vec = payload.get("embedding")
    if not isinstance(vec, list) or len(vec) != EMBEDDING_DIM:
        raise EmbedError(
            f"Embed response invalid: expected {EMBEDDING_DIM}-dim list, "
            f"got {type(vec).__name__} len={len(vec) if isinstance(vec, list) else '?'}"
        )
    return vec


# ---------------------------------------------------------------------------
# Bulk loader — used by the search endpoint to slurp candidate embeddings
# for an event into memory in one shot. SQLite + numpy is plenty fast at
# the scale we expect (one event ≈ 1-5K photos × 12 faces ≈ ~60K vectors).
# ---------------------------------------------------------------------------
def stack_embeddings(rows: Iterable[bytes]) -> np.ndarray:
    """Return (N, EMBEDDING_DIM) float32 array, L2-normalised row-wise."""

    blobs = list(rows)
    if not blobs:
        return np.zeros((0, EMBEDDING_DIM), dtype="<f4")
    n = len(blobs)
    out = np.empty((n, EMBEDDING_DIM), dtype="<f4")
    for i, b in enumerate(blobs):
        if len(b) != EMBEDDING_BYTES:
            # Skip corrupt rows rather than blowing up the whole search.
            out[i] = 0.0
            continue
        out[i] = np.frombuffer(b, dtype="<f4")
    # Vectorised normalise.
    norms = np.linalg.norm(out, axis=1, keepdims=True)
    norms[norms < 1e-9] = 1.0
    out /= norms
    return out
