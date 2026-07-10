<div align="center">

# 🏟️ StadiumPulse AI

### GenAI Stadium Operations & Fan-Experience Platform for the FIFA World Cup 2026

_One always-available AI assistant for **fans, organizers, volunteers and venue staff**
— across all 16 host stadiums in the USA, Canada & Mexico._

[![Live Site](https://img.shields.io/badge/▶_Live_Site-stadiumpulse--ai--app.web.app-00b2a9?style=for-the-badge)](https://stadiumpulse-ai-app.web.app)
[![Backend API](https://img.shields.io/badge/API-Cloud_Run-4285F4?style=for-the-badge&logo=google-cloud)](https://promptwars-backend-681763957794.us-central1.run.app/health)

![Tests](https://img.shields.io/badge/tests-180_passing-brightgreen?style=flat-square)
![WCAG](https://img.shields.io/badge/WCAG-2.1_AA-blueviolet?style=flat-square)
![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)
![AI](https://img.shields.io/badge/AI-Gemini_2.5_%7C_Claude-FF6B35?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

</div>

---

## 📑 Table of Contents

- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Feature Showcase](#-feature-showcase)
- [How We Meet Every Judging Criterion](#-how-we-meet-every-judging-criterion)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Quality, Testing & Security](#-quality-testing--security)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)

---

## 🎯 The Problem

A **48-team, 104-match** World Cup across **3 countries and 16 venues** creates enormous operational load: fans who speak dozens of languages, unfamiliar stadiums, accessibility needs, crowd surges at gates and transit hubs, and staff & volunteers making second-by-second decisions. Information is scattered, monolingual, and reactive.

## 💡 Our Solution

StadiumPulse AI centralises it all into **one GenAI platform** that turns Generative AI into practical, real-time help — implementing **every** capability area the challenge calls for, for **every** named audience.

<div align="center">

| For **Fans** | For **Organizers** | For **Volunteers** | For **Venue Staff** |
|:---:|:---:|:---:|:---:|
| Concierge · Wayfinding · Green travel · Match plan · Translation | Crowd intelligence · Incident triage · Announcements | Shift briefings · Announcements · Wayfinding | Incident triage · Crowd ops · Briefings · Announcements |

</div>

---

## ✨ Feature Showcase

Every capability area from the brief, implemented as a working, tested feature:

| # | Capability Area | Feature | Endpoint |
|:-:|---|---|---|
| 1 | 🗣️ **Multilingual Assistance** | RAG-grounded fan concierge in **10 languages** (RTL-aware) | `POST /api/concierge` |
| 2 | 🧭 **Navigation** | Shortest-path wayfinding + **step-free accessible mode** + SVG route map | `POST /api/navigate` |
| 3 | 👥 **Crowd Management** | Live per-zone density + AI-authored, prioritised actions | `GET /api/crowd/:venueId` |
| 4 | ⚡ **Real-time Decision Support** | Incident triage: priority, dispatch team, response SLA, escalation | `POST /api/incident` |
| 5 | 📢 **Operational Intelligence** | One-click **multilingual PA announcements** | `POST /api/announce` |
| 6 | 🦺 **Volunteer/Staff Enablement** | Role-specific **shift briefings** (duties, escalation, phrases) | `POST /api/briefing` |
| 7 | 🌱 **Sustainability & Transport** | Travel **carbon-footprint** comparison + greenest-choice nudge | `POST /api/sustainability/footprint` |
| 8 | 🗓️ **Match-Day Planning** | Personalised arrival plan from the fixture schedule | `GET /api/plan/:venueId` |
| 9 | 🌐 **Translation** | On-demand translation for staff & fans | `POST /api/translate` |
| ♿ | **Accessibility** | Accessible routing **and** a WCAG-2.1-AA, keyboard-navigable UI | _cross-cutting_ |

Coverage is machine-verifiable at [`GET /api/capabilities`](https://promptwars-backend-681763957794.us-central1.run.app/api/capabilities) and asserted by tests. Full matrix → [`docs/ALIGNMENT.md`](docs/ALIGNMENT.md).

---

## 🏆 How We Meet Every Judging Criterion

| Criterion | How StadiumPulse AI Delivers |
|---|---|
| **Code Quality** | Small single-responsibility modules · factory-built app · JSDoc throughout · consistent error model with machine-readable `code`s · OpenAPI 3.1 contract · ESLint + Prettier clean |
| **Security** | Helmet CSP/HSTS/Permissions-Policy · CORS allow-list · 2-tier rate limiting · `413`/`415` guards · typed Zod validation · **prompt-injection sanitisation** · `X-Request-Id` correlation · no prod stack-trace leakage |
| **Efficiency** | **gzip (~79% smaller)** · ETag/`304` caching · **memoised Dijkstra (~30× faster warm)** · AI response cache · startup-indexed data · observable at `/api/metrics` + `npm run bench` |
| **Testing** | **180 tests, 8 suites** · services, validators, middleware, AI gateway, full HTTP surface · all pass offline |
| **Accessibility** | Semantic HTML · ARIA Tabs + arrow keys · `aria-live`/`aria-busy` · per-result `lang`/`dir` · WCAG-AA contrast · `prefers-reduced-motion` / `forced-colors` · accessible SVG map · **first-class step-free routing** |
| **Problem Statement Alignment** | **All 8** capability areas **and all 4** named audiences covered · proven via `/api/capabilities` + tests · grounded in real 2026 data (16 venues, 48 teams, opening at Azteca, final at MetLife) |

---

## 🏗️ Architecture

```
Browser (React/TypeScript SPA · WCAG-AA · ARIA Tabs · SVG route map)
        │  fetch /api/*
        ▼
Express app (Node.js · TypeScript)
    requestId → helmet CSP/HSTS → Permissions-Policy → CORS
        → compression (gzip) → rate-limit (general + AI tier)
        → 415 content-type guard → Zod validation → router
        │
        ├─ routes/     REST surface (OpenAPI 3.1 · ETag caching · /api/metrics)
        ├─ services/   one module per capability — RAG KB · Dijkstra · LLM client
        │      └─ llmClient ──► GEMINI_API_KEY? → Gemini 2.5
        │                       ANTHROPIC_API_KEY? → Claude Sonnet
        ├─ data/       venues (16) · fixtures (104 matches) · KB · capabilities
        └─ __tests__/  180 Jest tests across 8 suites
```

Details → [`ARCHITECTURE.md`](ARCHITECTURE.md)

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/bahathraheel/promptwars-4.git
cd promptwars-4

# 2. Configure backend
cd backend && cp .env.example .env
# Add GEMINI_API_KEY or ANTHROPIC_API_KEY

# 3. Run backend (port 3001)
npm install && npm run dev

# 4. Run frontend (port 5173, new terminal)
cd ../frontend && npm install && npm run dev

# 5. Run all 180 tests
cd ../backend && npm test

# 6. Run benchmarks
npm run bench
```

---

## 🔌 API Reference

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/api/metrics` | AI + cache hit-rates, memory |
| `GET` | `/api/openapi.json` | OpenAPI 3.1 contract |
| `GET` | `/api/capabilities` | Capability → area → persona alignment |
| `GET` | `/api/tournament` | Tournament overview (48 teams, 104 matches) |
| `GET` | `/api/venues` · `/api/venues/:id` | All 16 host venues + detail |
| `GET` | `/api/matches` | Full 104-match fixture schedule |
| `GET` | `/api/config/options` | UI enums (languages, roles, severity) |
| `POST` | `/api/concierge` | Multilingual RAG Q&A |
| `POST` | `/api/navigate` | Wayfinding (with `stepFree` mode) |
| `GET` | `/api/crowd/:venueId` | Crowd/ops snapshot |
| `POST` | `/api/incident` | Real-time incident triage |
| `POST` | `/api/announce` | Multilingual PA announcement |
| `POST` | `/api/briefing` | Volunteer & staff shift briefing |
| `POST` | `/api/sustainability/footprint` | Travel carbon comparison |
| `GET` | `/api/plan/:venueId` | AI match-day arrival plan |
| `POST` | `/api/translate` | On-demand translation (10 languages) |
| `POST` | `/api/chat` | Fan Copilot RAG chat |
| `GET` | `/api/ops/report` · `POST /api/ops/generate` | Ops control room |
| `POST` | `/api/whatif` | What-If crowd surge simulation |

```bash
# Example: Incident triage
curl -X POST https://promptwars-backend-681763957794.us-central1.run.app/api/incident \
  -H 'content-type: application/json' \
  -d '{"category":"medical","gateId":"gate-2","severity":"high","description":"Fan collapsed near East Gate"}'
```

---

## 🧪 Quality, Testing & Security

```bash
npm test          # 180 unit + integration tests
npm run bench     # hot-path throughput benchmarks
```

- **180 unit + integration tests** across 8 suites — RAG knowledge base, Dijkstra memoisation, security middleware, LLM gateway (mocked), HITL ops, and the full HTTP surface. All pass offline with no API key.
- **Security**: Helmet CSP + HSTS + Permissions-Policy · CORS allow-list · 2-tier rate limiting · 413/415 guards · typed Zod validation · prompt-injection sanitisation · `X-Request-Id` tracing · no prod stack leakage. See [`SECURITY.md`](SECURITY.md).

---

## ☁️ Deployment

| Platform | Fit | |
|---|---|---|
| **Firebase Hosting + Cloud Run** | ✅ Live | Current production setup |
| **Docker** | ✅ Best | `Dockerfile` included |
| **Vercel** | ⚠️ Works | Serverless caveats for in-memory state |

Full guide → [`docs/DEPLOY.md`](docs/DEPLOY.md)

---

## 📂 Project Structure

```
promptwars-4/
├── backend/
│   ├── src/
│   │   ├── app.ts · server.ts
│   │   ├── routes/        # 12 API routers
│   │   ├── services/      # RAG KB · Dijkstra · LLM client · audit store
│   │   ├── data/          # venues (16) · fixtures (104) · capabilities
│   │   └── __tests__/     # 180 Jest tests across 8 suites
│   └── openapi.json       # OpenAPI 3.1 contract
├── frontend/
│   ├── src/
│   │   ├── pages/         # 8 feature pages
│   │   ├── api/           # typed API client
│   │   └── index.css      # WCAG-AA design system
│   └── public/
├── docs/
│   ├── ALIGNMENT.md       # Capability × persona coverage matrix
│   ├── ACCESSIBILITY.md   # WCAG 2.1 AA design decisions
│   └── DEPLOY.md          # Deployment guide
├── ARCHITECTURE.md
├── SECURITY.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── Dockerfile
```

---

## 📚 Documentation

| Doc | What's Inside |
|---|---|
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Firebase · Cloud Run · Docker · env vars · production checklist |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Layers, AI gateway pattern, Dijkstra algorithm, efficiency |
| [`docs/ALIGNMENT.md`](docs/ALIGNMENT.md) | Problem-statement coverage matrix (areas × personas) |
| [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) | WCAG 2.1 AA approach & design decisions |
| [`SECURITY.md`](SECURITY.md) | Security controls & deployment hardening checklist |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Dev workflow & PR checklist |
| [`CHANGELOG.md`](CHANGELOG.md) | Release notes |

---

<div align="center">

**StadiumPulse AI** — _navigation · crowd management · accessibility · transportation · sustainability · multilingual assistance · operational intelligence · real-time decision support_

Built for the **FIFA World Cup 2026** 🇺🇸 🇨🇦 🇲🇽

[Live Site →](https://stadiumpulse-ai-app.web.app) · [API →](https://promptwars-backend-681763957794.us-central1.run.app/health) · [GitHub →](https://github.com/bahathraheel/promptwars-4)

</div>