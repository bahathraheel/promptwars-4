# Deployment Guide

StadiumPulse AI is a **React/TypeScript frontend** (Firebase Hosting) + **Node.js/Express/TypeScript backend** (Google Cloud Run). There is no database — all state is in-memory and static data is bundled at startup.

---

## Live Deployments

| Component | URL |
|---|---|
| **Frontend** | https://stadiumpulse-ai-app.web.app |
| **Backend API** | https://promptwars-backend-681763957794.us-central1.run.app |

---

## Environment Variables

All backend environment variables are optional — the app boots with defaults.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Port to listen on |
| `NODE_ENV` | `development` | Set to `production` for generic error messages |
| `GEMINI_API_KEY` | _(empty)_ | Google Gemini API key (preferred) |
| `ANTHROPIC_API_KEY` | _(empty)_ | Anthropic Claude API key (fallback) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin — **set explicitly in production** |
| `RETRIEVAL_CONFIDENCE_THRESHOLD` | `0.25` | Min RAG cosine similarity before refusal |
| `RATE_LIMIT_MAX_REQUESTS` | `60` | Max requests/minute/IP |

---

## Option A — Firebase Hosting + Cloud Run (Production)

```bash
# Build frontend
cd frontend && npm run build

# Deploy frontend to Firebase Hosting
npx firebase-tools deploy --only hosting --project promptwars-4-a706d

# Deploy backend to Cloud Run
gcloud run deploy promptwars-backend \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,GEMINI_API_KEY=<your-key>
```

---

## Option B — Docker (portable)

```bash
docker build -t stadiumpulse-ai ./backend
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e GEMINI_API_KEY=<your-key> \
  -e CORS_ORIGIN=https://stadiumpulse-ai-app.web.app \
  stadiumpulse-ai
```

---

## Option C — Local Development

```bash
# Backend
cd backend && npm install && npm run dev
# → http://localhost:3001

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

---

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] Explicit `CORS_ORIGIN` (not `http://localhost:5173`)
- [ ] API key provided via platform secret store — never committed to repo
- [ ] TLS terminated at the edge (Firebase/Cloud Run handle this)
- [ ] Health check wired to `GET /health`
- [ ] Rate limits tuned to expected peak traffic

See [SECURITY.md](../SECURITY.md) for the full hardening checklist.
