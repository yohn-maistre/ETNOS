# ETNOS Video → 3D Gaussian Splat Worker (Modal Free Tier)

Serverless GPU worker that converts a 15–90 second walk-around phone video into a compressed Niantic `.spz` (v2) 3D Gaussian Splat and posts it back to ETNOS via an HMAC-SHA256 signed webhook.

## Why Modal.com Free Tier

- **$30/month free GPU credit** with true scale-to-zero billing (0 idle cost).
- An L4 GPU costs ~$0.80/hour (~$0.004–$0.01 per fast 20–45 second capture), giving roughly **500 to 3,000+ free 3D reconstructions per month**.
- Multi-view geometry only (never single-image generative 3D hallucination), honoring `docs/plan/saluran-2026-11-22.md §4`.

## Deploy in 3 minutes

```bash
pip install modal
modal setup
modal secret create etnos-splat-secret ETNOS_SPLAT_SECRET="$(openssl rand -hex 32)"
modal deploy packages/splat-worker/modal_app.py
```

Copy the HTTPS endpoint printed by `modal deploy` and configure two Worker secrets on ETNOS:

- `ETNOS_SPLAT_WORKER_URL`: the Modal endpoint URL (`https://<user>--etnos-splat-worker-reconstruct.modal.run`)
- `ETNOS_SPLAT_SECRET`: the exact same shared secret created above

## Direct upload (zero GPU needed)

Members can also scan directly on their phone with **Scaniverse**, **KIRI Engine**, or **Polycam** (all free) and upload `.spz`, `.ply`, or `.glb` directly into ETNOS without touching any GPU worker.
