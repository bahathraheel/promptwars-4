# Security Policy

StadiumPulse AI is designed to run in a public-facing, high-traffic venue context — a live FIFA World Cup 2026 stadium hosting 80,000+ fans. Security is treated as a first-class engineering requirement, not an afterthought.

## Reporting a Vulnerability

If you discover a vulnerability, please open a **private security advisory** on GitHub rather than filing a public issue. We aim to acknowledge reports within **72 hours**.

---

## Controls Implemented

| Area | Control |
|---|---|
| **Transport / Headers** | `helmet` sets a strict Content-Security-Policy (no inline scripts), HSTS with `max-age=31536000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy`, and a restrictive `Permissions-Policy` (no `camera`, no `microphone`). `X-Powered-By` is disabled. |
| **Request Correlation** | Every request is assigned an `X-Request-Id` UUID (honoured if supplied by the client) — propagated into error responses and logs for cross-system traceability. |
| **Input Validation** | Every request field is validated and bounded (type, length, range, enum, array size) using **Zod schemas** before reaching any service layer. |
| **Body Limits** | JSON bodies are capped (`413 Payload Too Large` for oversized payloads). |
| **Content-Type Guard** | Mutating requests (`POST`, `PUT`, `PATCH`) must carry `Content-Type: application/json` — others receive `415 Unsupported Media Type`. |
| **Rate Limiting** | Two tiers via `express-rate-limit`: general per-IP limit (`100 req/min`) on `/api/` and a stricter AI limit (`15 req/min`) on all GenAI endpoints (`/api/chat`, `/api/concierge`, `/api/incident`, `/api/announce`, `/api/briefing`, `/api/translate`). |
| **Prompt Injection** | All free-text reaching the LLM is sanitised: instruction-override phrases neutralised, control characters stripped, length capped. User text is always placed in the **user role**, never merged into the system prompt. |
| **Error Handling** | A central error handler returns a consistent `{ error, code, requestId }` shape. Stack traces and internal messages are **suppressed in production** (`NODE_ENV=production`). |
| **CORS** | Strict allow-list via environment variable `CORS_ORIGIN`. Never `*` in production. |
| **Secrets** | No secrets committed. All configuration via environment variables. `.env` is git-ignored; `.env.example` documents required keys. |
| **Dependencies** | Minimal runtime dependencies, all pinned. `npm audit` runs in CI. |

---

## Secure Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set explicit `CORS_ORIGIN` (not wildcard)
- [ ] Provide `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` via platform secret store — never in repo
- [ ] Terminate TLS at the edge (HSTS is already advertised by the app)
- [ ] Wire health check to `GET /health`
- [ ] Tune `RATE_LIMIT_MAX_REQUESTS` to expected peak traffic
