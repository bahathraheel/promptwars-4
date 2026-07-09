# StadiumPulse AI

**GenAI operating layer for FIFA World Cup 2026 — Fan Copilot + Ops Copilot**

---

## Live Deployments
* **Firebase Hosting URL**: [https://stadiumpulse-ai-app.web.app](https://stadiumpulse-ai-app.web.app)
* **Backend API URL**: [https://promptwars-backend-681763957794.us-central1.run.app](https://promptwars-backend-681763957794.us-central1.run.app)


---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (React/TS)                  │
│                                                         │
│     ┌────────────────── Auth Gate ──────────────────┐   │
│     │  Firebase Auth (Manual Email/Pass & Google)   │   │
│     └───────────────────────┬───────────────────────┘   │
│                             │ (Authenticated)           │
│                             ▼                           │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  Fan Copilot   │  │ Ops Dashboard│  │  What-If /  │  │
│  │  (chat, SMS,   │  │(crowd KPIs,  │  │Sustainability│  │
│  │ voice, pictog.)│  │HITL actions) │  │   pages)    │  │
│  └───────┬────────┘  └──────┬───────┘  └──────┬──────┘  │
└──────────┼──────────────────┼─────────────────┼─────────┘
           │  REST + JSON     │                 │
┌──────────▼──────────────────▼─────────────────▼─────────┐
│              Node/Express + TypeScript Backend            │
│                                                           │
│  ┌──────────────────────────────────────────────────┐     │
│  │             RAG Knowledge Base Engine             │     │
│  │  (TF cosine-similarity, loaded at startup)        │     │
│  └─────────────────────┬────────────────────────────┘     │
│                        │                                   │
│  ┌─────────────────────▼────────────────────────────┐     │
│  │           Retrieval Confidence Guard              │     │
│  │  score < 0.25 → explicit refusal (code-level)    │     │
│  └─────────────────────┬────────────────────────────┘     │
│                        │                                   │
│  ┌─────────────────────▼────────────────────────────┐     │
│  │         LLM Router (Gemini or Claude)             │     │
│  │                                                  │     │
│  │  Uses GEMINI_API_KEY if present, else Anthropic. │     │
│  │  FAQ/general → gemini-2.5-flash / haiku          │     │
│  │  Navigation/safety → gemini-2.5-flash / sonnet   │     │
│  │  Agent/simulation  → gemini-2.5-pro / sonnet     │     │
│  └──────────────────────────────────────────────────┘     │
│                                                           │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐   │
│  │ Sensor Simulator│  │  Ops Agent  │  │ Audit Store │   │
│  │ (privacy-safe  │  │(HITL ranking)│  │(immutable   │   │
│  │  agg. counts)  │  │              │  │ decision log│   │
│  └────────────────┘  └──────────────┘  └─────────────┘   │
└───────────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────┐
│            knowledge-base/ (JSON files)                  │
│  stadium-map.json · transit-and-transport.json           │
│  policies-and-faqs.json                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 20
- An Anthropic API key (Claude) OR Google Gemini API key (Gemini 2.5)

### 1. Clone and configure

```bash
cd backend
cp .env.example .env
# Edit .env and paste your ANTHROPIC_API_KEY
```

### 2. Install and start backend

```bash
cd backend
npm install
npm run dev
# Starts on http://localhost:3001
```

### 3. Install and start frontend

```bash
cd frontend
npm install
npm run dev
# Opens on http://localhost:5173
```

### 4. Run tests

```bash
cd backend
npm test
```

### 5. Run load test (backend must be running)

```bash
cd backend
node load-test.mjs 20 100
# 100 requests, 20 concurrent
```

### 6. Deploy to Firebase Hosting

```bash
# Build the frontend assets
cd frontend
npm run build

# Deploy using Firebase Tools
cd ..
npx firebase-tools deploy --only hosting --project promptwars-4-a706d
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | — | **Optional.** Google Gemini API Key. If set, default to Gemini 2.5 Flash & Pro models. |
| `ANTHROPIC_API_KEY` | — | **Required (if no Gemini key).** Anthropic Claude API key |
| `PORT` | `3001` | Backend port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `RETRIEVAL_CONFIDENCE_THRESHOLD` | `0.25` | Min retrieval score before refusal |
| `RATE_LIMIT_MAX_REQUESTS` | `60` | Requests per minute per IP |

---

## Module-to-Requirement Mapping

| Requirement | Module / File |
|---|---|
| Navigation assistance | `backend/src/routes/chat.ts` + knowledge-base/stadium-map.json |
| Crowd management | `backend/src/services/sensorSimulator.ts` + `opsAgent.ts` |
| Accessibility | `frontend/src/pages/FanCopilot.tsx` (pictogram/voice modes) + WCAG CSS |
| Transportation | `knowledge-base/transit-and-transport.json` + chat route |
| Sustainability | `backend/src/routes/sustainability.ts` + `frontend/src/pages/Sustainability.tsx` |
| Multilingual | `backend/src/routes/chat.ts` (language detection + LLM translation) |
| Operational intelligence | `backend/src/services/opsAgent.ts` + `frontend/src/pages/OpsDashboard.tsx` |
| Real-time decision support | Ops Dashboard HITL approve/reject + `backend/src/services/auditStore.ts` |
| Grounded RAG | `backend/src/services/knowledgeBase.ts` (cosine similarity, confidence guard) |
| Security/no-PII | `backend/src/services/security.ts` + `sensorSimulator.ts` (aggregate only) |
| What-If simulation | `backend/src/routes/whatif.ts` + `frontend/src/pages/WhatIf.tsx` |
| Audit log | `backend/src/services/auditStore.ts` + `frontend/src/pages/AuditLog.tsx` |

---

## Scaling Notes (Production Path)

- **Embeddings:** Replace in-memory TF cosine with a vector DB (Chroma/Pinecone) backed by an embedding model.
- **LLM calls:** Add response caching for repeated FAQ queries (Redis TTL ~5 min).
- **Backend:** Horizontal scaling via container replicas + a load balancer; session state is stateless (store audit log in Postgres).
- **Sensor pipeline:** Replace synthetic generator with real IoT MQTT/WebSocket feed; privacy guard (aggregate-only) remains the same.
- **Frontend:** Deploy to CDN with pre-rendered routes for sub-second TTFB.

---

## Privacy & Security

- **No PII.** Only aggregate crowd counts flow through the system. No camera feeds, no biometrics, no facial recognition.
- **Prompt injection guard.** `security.ts` detects and blocks injection attempts before LLM call.
- **Secrets management.** All keys via environment variables. `.env` is gitignored.
- **Rate limiting.** `express-rate-limit` on all `/api/` routes.
- **Input sanitization.** Zod schema validation + PII scrubber on every chat request.

---

## Accessibility

- **WCAG 2.2 AA target.** All text/background pairs have ≥ 4.5:1 contrast ratio (dark navy backgrounds, high-chroma text).
- **Keyboard navigation.** All interactive elements are reachable via Tab; visible focus ring via `:focus-visible` (2px teal outline).
- **ARIA.** All chat logs (`role="log" aria-live="polite"`), buttons, progress bars, and form controls have descriptive `aria-label` attributes.
- **Skip link.** "Skip to main content" link appears on focus for screen-reader users.
- **Voice mode.** Web Speech API `SpeechRecognition` + `speechSynthesis` wired in (degrades gracefully if not supported).
- **Pictogram mode.** Adds leading emoji to all responses; kept concise for low-literacy support.
- **SMS mock.** Plain-text, no rich UI — demonstrates accessible path without a smartphone.
- **Sign language widget.** Placeholder component + captioned text in FanCopilot sidebar (architecture supports video injection).
- **Known gap:** axe-core automated run to be executed after local startup (`npx axe http://localhost:5173` — add results here).
- **Screen reader pass:** Manually tested with NVDA on Chrome (Windows) — chat log is announced correctly; gate status cards read `gateId + alert level`.