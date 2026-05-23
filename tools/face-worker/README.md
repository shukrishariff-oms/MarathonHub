# Face Worker — PC RTX 2070

Skrip yang run kat PC RTX 2070 untuk:
1. **`embed_server.py`** — server kecil yang serve `/embed` endpoint. MarathonHub VPS forward selfie ke sini, balas embedding 512-dim.
2. **`ingest_folder.py`** — scan folder gambar event, detect semua muka, hantar embeddings ke MH `/api/faces/ingest`.

Inference pakai insightface (buffalo_l, ~50ms/photo on RTX 2070).

## Setup PC (one-time)

Pastikan PC ada:
- Ubuntu / Linux dengan NVIDIA driver + CUDA 11.8+
- Python 3.10+
- Cloudflare Tunnel client (`cloudflared`) — supaya VPS boleh hubungi `/embed` lewat tunnel public.

```bash
# Clone repo & masuk folder
git clone https://github.com/shukrishariff-oms/MarathonHub.git
cd MarathonHub/tools/face-worker

# Virtual env
python3 -m venv .venv
source .venv/bin/activate

# Install (GPU build of onnxruntime)
pip install -r requirements.txt
```

Test GPU detected:
```bash
python -c "import onnxruntime as ort; print(ort.get_available_providers())"
# Expected: ['CUDAExecutionProvider', 'CPUExecutionProvider']
```

Kalau cuma `CPUExecutionProvider`, install `onnxruntime-gpu` ganti `onnxruntime`:
```bash
pip uninstall onnxruntime onnxruntime-gpu -y
pip install onnxruntime-gpu==1.17.1
```

## Step 1: Run embed_server.py

```bash
# Set port + token (any random string — must match VPS env FACES_EMBED_TOKEN)
export EMBED_PORT=8765
export EMBED_TOKEN=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
echo "EMBED_TOKEN=$EMBED_TOKEN  # save this — VPS needs it"

python embed_server.py
```

Server boot dengan banner:
```
[insightface] loading buffalo_l on CUDA...
[embed] ready on http://0.0.0.0:8765
```

## Step 2: Cloudflare Tunnel (so VPS boleh reach /embed)

```bash
# Login (one-time, opens browser)
cloudflared tunnel login

# Create tunnel + route
cloudflared tunnel create mh-faces
cloudflared tunnel route dns mh-faces faces.ohmaishoot.com

# Run tunnel pointing to local embed_server
cloudflared tunnel --url http://localhost:8765 run mh-faces
```

Tunnel sekarang serve `https://faces.ohmaishoot.com/embed`. Set kat Coolify VPS:

```
FACES_EMBED_URL=https://faces.ohmaishoot.com/embed
FACES_EMBED_TOKEN=<value sama dengan EMBED_TOKEN PC>
```

## Step 3: Ingest gambar event

```bash
# Photographer event folder kat PC (sebarang struktur)
FOLDER=/data/events/twincity-2026

# Hantar ke MH backend
python ingest_folder.py \
  --folder "$FOLDER" \
  --event-id 12 \
  --photographer-id 5 \
  --source mh \
  --base-url https://marathonhub.ohmaishoot.com \
  --token <FACES_INGEST_TOKEN_DARI_VPS> \
  --replace
```

Output:
```
[scan] 4012 photos found
[embed] processing... (RTX 2070, ~50ms/photo)
[batch 1/40] inserted=100 skipped=2
[batch 2/40] inserted=100 skipped=0
...
[done] 4012 photos -> 47,891 faces in 4m 12s
```

Lepas siap, shutdown PC. Embeddings dah duduk kat VPS DB, search 24/7.

## Re-ingest (event tambah gambar baru)

Drop `--replace` flag — script akan upsert based on `photo_id` (file hash).
Kalau nak refresh penuh dengan model version baru, pakai `--replace` untuk wipe event_id dulu.

## Photo identifier

Default: `photo_id = sha1(filepath)[:16]`. Boleh override dengan `--id-mode filename` untuk pakai nama file (kalau file unique).

## Troubleshoot

| Symptom | Fix |
|---|---|
| "no face detected" tinggi sangat | Threshold detector terlalu ketat; pakai `--min-face 30` (default 60px) |
| Out of GPU memory | Pakai `--batch-size 4` (default 8) |
| Connection refused (VPS to PC) | Cloudflare tunnel down / PC sleep — tunnel run as systemd service |
| 401 dari ingest | Token salah — copy semula dari `/root/.faces_ingest_token` kat VPS |
