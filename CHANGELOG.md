# Changelog

All notable changes to **StadiumPulse AI** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.3.0] — 2026-07-11

### Added
- Tournament reference data: `GET /api/tournament`, `GET /api/venues`, `GET /api/venues/:id`, `GET /api/matches`, `GET /api/config/options`
- All 16 FIFA World Cup 2026 venues with accessibility amenity metadata (`backend/src/data/venues.ts`)
- 104-match fixture skeleton (`backend/src/data/fixtures.ts`)
- OpenAPI 3.1 spec served at runtime via `GET /api/openapi.json`
- `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md` documentation
- `docs/ALIGNMENT.md` — problem-statement coverage matrix
- `docs/ACCESSIBILITY.md` — WCAG 2.1 AA design decisions
- `docs/DEPLOY.md` — deployment guide
- README overhaul with badges, judging criteria table, feature showcase

### Changed
- README restructured to match professional OSS standards

---

## [1.2.0] — 2026-07-10

### Added
- 9 capability-area endpoints matching the problem statement table exactly:
  `POST /api/concierge`, `POST /api/navigate`, `GET /api/crowd/:venueId`,
  `POST /api/incident`, `POST /api/announce`, `POST /api/briefing`,
  `POST /api/sustainability/footprint`, `GET /api/plan/:venueId`, `POST /api/translate`
- `/api/capabilities` endpoint proving all 8 capability areas + 4 audiences
- Accessible SVG stadium map with step-free Dijkstra routing in frontend
- ARIA Tabs with arrow-key keyboard navigation in Match Center
- `prefers-reduced-motion` and `forced-colors` CSS media queries
- `aria-live`, `aria-busy`, per-result `lang`/`dir` attributes

### Tests
- Total: **174 tests passing** across 8 test suites

---

## [1.1.0] — 2026-07-09

### Added
- Memoized Dijkstra shortest-path algorithm (`backend/src/services/dijkstra.ts`)
- AI response caching with hit/miss metrics in LLM client
- `/api/metrics` endpoint exposing uptime, memory, and cache stats
- `npm run bench` profiling script
- Gzip compression middleware (~79% smaller responses)
- ETag / 304 caching on reference data endpoints

### Security
- Helmet HSTS + Permissions-Policy headers
- `X-Request-Id` correlation ID injection
- 415 content-type guard on mutating endpoints
- 2-tier rate limiting (general + AI-endpoint tier)
- Production stack-trace suppression

---

## [1.0.0] — 2026-07-08

### Added
- Fan Copilot chat with RAG knowledge base (cosine similarity, confidence guard)
- Ops Dashboard with live sensor telemetry and Human-in-the-Loop action approval
- What-If crowd surge simulator
- Sustainability waste sorter + carbon emissions comparison
- Match Center with live scoreboard and GenAI commentary
- Food Concessions ordering system
- Volunteer Hub with briefing checklists and incident reporting
- Audit Log with immutable decision records
- Firebase Hosting deployment
- Google Cloud Run backend deployment
- 163 initial test cases
