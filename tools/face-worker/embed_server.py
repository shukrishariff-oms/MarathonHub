"""Embed server — runs on Syuk's RTX 2070 PC.

Single endpoint: POST /embed
  Body: raw image bytes (jpeg/png)
  Auth: Authorization: Bearer <EMBED_TOKEN>  (set via env)
  Response 200: {"embedding": [512 floats], "det_score": float}
  Response 400: {"detail": "no face detected"} (etc.)
  Response 401: {"detail": "invalid token"}

The MarathonHub VPS's /api/faces/search forwards a runner's selfie here
to compute its embedding (because the VPS has no GPU). One face per
selfie — if multiple faces are detected we pick the one with highest
detection score (usually the runner's own face, foreground/centered).

This is intentionally tiny: one model load at startup, one inference
per request, no batching, no queueing. RTX 2070 handles ~20 req/sec
which is way more than the rate limiter on the VPS allows anyway.

Run:
    EMBED_PORT=8765 EMBED_TOKEN=secret123 python embed_server.py

Then expose it via Cloudflare tunnel so the VPS can reach it:
    cloudflared tunnel --url http://localhost:8765 run mh-faces
"""

from __future__ import annotations

import io
import logging
import os
import secrets
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import uvicorn


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("embed")


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
EMBED_TOKEN = os.getenv("EMBED_TOKEN", "").strip()


def _check_auth(request: Request) -> None:
    if not EMBED_TOKEN:
        # Token not configured = open access. Log a warning so it's
        # obvious in the PC console, but allow it (user might be
        # testing on a private LAN with no tunnel exposed).
        return
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    provided = auth[7:].strip()
    if not secrets.compare_digest(EMBED_TOKEN, provided):
        raise HTTPException(status_code=401, detail="invalid token")


# ---------------------------------------------------------------------------
# Model — load once at startup.
# ---------------------------------------------------------------------------
_app_model = None


def _load_model():
    """Load insightface buffalo_l on GPU (falls back to CPU)."""
    global _app_model
    if _app_model is not None:
        return _app_model

    log.info("loading insightface buffalo_l...")
    # Lazy import so the script can at least show --help without GPU stack.
    from insightface.app import FaceAnalysis

    # ctx_id=0 -> first CUDA device. -1 = CPU.
    ctx_id = int(os.getenv("EMBED_CTX_ID", "0"))
    det_size = int(os.getenv("EMBED_DET_SIZE", "640"))

    fa = FaceAnalysis(
        name="buffalo_l",
        providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
    )
    fa.prepare(ctx_id=ctx_id, det_size=(det_size, det_size))
    _app_model = fa
    log.info("model ready (ctx_id=%d, det_size=%d)", ctx_id, det_size)
    return _app_model


# ---------------------------------------------------------------------------
# FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(title="MH Face Embed Server", version="0.1.0")


@app.on_event("startup")
def _startup():
    _load_model()


@app.get("/health")
def health():
    return {"ok": True, "model_loaded": _app_model is not None}


@app.post("/embed")
async def embed(request: Request):
    _check_auth(request)

    raw = await request.body()
    if not raw:
        raise HTTPException(status_code=400, detail="empty body")
    if len(raw) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="body too large (>12MB)")

    # Decode to BGR ndarray (insightface expects BGR, OpenCV default).
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="cannot decode image")

    # Hard cap on largest dimension — huge selfies waste GPU time and
    # don't actually improve recognition (det model resizes to 640 anyway).
    max_dim = 1600
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))

    model = _load_model()
    faces = model.get(img)

    if not faces:
        raise HTTPException(status_code=400, detail="no face detected")

    # Pick highest-detection-score face (usually the prominent one).
    faces.sort(key=lambda f: float(getattr(f, "det_score", 0.0)), reverse=True)
    best = faces[0]
    embedding = np.asarray(best.normed_embedding, dtype=np.float32)
    if embedding.shape != (512,):
        raise HTTPException(
            status_code=500,
            detail=f"unexpected embedding shape {embedding.shape}",
        )

    return JSONResponse({
        "embedding": embedding.tolist(),
        "det_score": float(getattr(best, "det_score", 0.0)),
        "face_count": len(faces),
    })


def main():
    port = int(os.getenv("EMBED_PORT", "8765"))
    host = os.getenv("EMBED_HOST", "0.0.0.0")
    log.info("starting on http://%s:%d", host, port)
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
