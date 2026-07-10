# CONTRIBUTING.md

Thank you for your interest in contributing to **StadiumPulse AI**! 🏟️

## Development Setup

```bash
# Clone the repo
git clone https://github.com/bahathraheel/promptwars-4.git
cd promptwars-4

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Copy and configure environment variables
cd ../backend && cp .env.example .env
# Add GEMINI_API_KEY or ANTHROPIC_API_KEY to .env
```

## Running Locally

```bash
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 5173, separate terminal)
cd frontend && npm run dev
```

## Running Tests

```bash
# Run full test suite (174 tests)
cd backend && npm test

# Run benchmarks
cd backend && npm run bench
```

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production branch — always deployable |
| `feature/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `docs/<name>` | Documentation updates |

## Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add multilingual concierge endpoint
fix: correct Dijkstra step-free routing for Gate 4
docs: update ALIGNMENT.md with new endpoints
test: add coverage for /api/translate
```

## Code Standards

- **TypeScript strict mode** throughout the backend
- **Zod** for all request validation
- **JSDoc** on every exported function and route
- **ESLint + Prettier** — run `npm run lint` before PRs
- All new routes must have integration tests in `backend/src/__tests__/`

## Pull Request Checklist

- [ ] All existing tests pass (`npm test`)
- [ ] New code has tests
- [ ] JSDoc added to new functions/routes
- [ ] No secrets committed
- [ ] Frontend builds cleanly (`cd frontend && npm run build`)
