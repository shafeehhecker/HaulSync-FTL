# Contributing to HaulSync TOS FTL

Thank you for helping improve HaulSync! This guide covers everything you need to get started.

---

## 🛠️ Development Setup

```bash
git clone https://github.com/your-org/haulsync-tos-ftl.git
cd haulsync-tos-ftl

# Backend
cd backend && cp .env.example .env && npm install
npx prisma migrate dev && node prisma/seed.js
npm run dev

# Frontend (new terminal)
cd frontend && cp .env.example .env && npm install
npm run dev
```

---

## 🌿 Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<slug>` | `feature/l2-fallback-logic` |
| Bug fix | `fix/<slug>` | `fix/pod-upload-crash` |
| Docs | `docs/<slug>` | `docs/gps-integration-guide` |
| Chore | `chore/<slug>` | `chore/upgrade-prisma-5` |

---

## 📝 Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add GPS webhook receiver for Vamosys
fix: resolve L1 award race condition on concurrent bids
docs: add e-way bill setup guide
chore: bump socket.io to 4.7.4
refactor: extract rate engine into standalone service
test: add unit tests for L1/L2 ranking logic
```

---

## 🔀 Pull Request Process

1. Fork the repo and create your branch from `main`
2. Run `npm run dev` and verify your changes work end-to-end
3. If adding a route, update `docs/API.md` with the new endpoint
4. If touching the Prisma schema, include a migration: `npx prisma migrate dev --name your-change`
5. Open a PR — fill in the template fully
6. PRs require at least one review before merge

 IMPORTANT NOTE : AI PULL REQUESTS IS HIGHLY DISCOURAGED AS THIS IS A SINGLE DEVELOPER PROJECT

---

## 📁 Where Things Live

| What | Where |
|------|-------|
| New API route | `backend/src/routes/<module>.js` + register in `server.js` |
| New Prisma model | `backend/prisma/schema.prisma` + migration |
| New frontend page | `frontend/src/pages/<Module>/` + route in `App.jsx` + nav item in `Layout.jsx` |
| Shared UI component | `frontend/src/components/common/index.jsx` |
| GPS provider adapter | `backend/src/integrations/gps/<provider>.js` |
| Environment variable | Add to both `.env.example` files + `docker-compose.yml` |

---

## 🚫 What We Won't Accept

- Breaking changes to existing API contracts without a migration path
- Removing the mock/fallback GPS mode (required for offline development)
- Changes that break the `docker compose up -d` one-command start
- Hardcoded credentials or secrets of any kind

---

## 🐛 Reporting Bugs

Open a GitHub Issue with:
- Steps to reproduce
- Expected vs actual behaviour
- Node.js and Docker versions
- Relevant logs (`docker compose logs backend`)

---

## 📜 License

By contributing, you agree your contributions are licensed under the MIT License.
