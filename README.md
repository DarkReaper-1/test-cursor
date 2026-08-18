# Helix

Helix is a personal RPG that turns real-world progress into an evolving digital identity.

North star: **What should I do today to become better tomorrow?**

This is not a clone of Arise or any proprietary fitness RPG.

## Status

- **Phase 0:** Discovery — `docs/`
- **Phase 1:** Monorepo skeleton
- **Phase 2:** Identity + playable Today loop (auth, onboarding, server XP)
- **Phase 5/6 slice:** per-set session, wall-clock rest, history-based next work, coach.why

## Workspace

```
apps/mobile     Expo (auth, onboarding, Today, session, Character)
apps/api        Next.js  /api/v1/health  /auth  /today  /completions
packages/shared Zod contracts
packages/design Visual tokens (warm lattice, not a cyan HUD)
packages/rpg    XP, levels, ranks, momentum, RewardEngine, Today assembly
packages/fitness Adaptive set progression
packages/ai     AIProvider, NoneProvider, today explainer
```

## Commands

```bash
pnpm install
cp .env.example apps/api/.env   # set DATABASE_URL and AUTH_SECRET
pnpm --filter @helix/api db:generate
pnpm --filter @helix/api db:migrate
pnpm typecheck
pnpm test
```

API:

```bash
pnpm --filter @helix/api dev
# GET  /api/v1/health
# POST /api/v1/auth/register
# POST /api/v1/onboarding
# GET  /api/v1/today            (directive + coach.why)
# POST /api/v1/completions      (Bearer token, idempotency key, no client XP)
```

Optional Postgres:

```bash
docker compose up -d db
cp .env.example apps/api/.env
pnpm --filter @helix/api exec prisma migrate dev
```

Mobile:

```bash
pnpm --filter @helix/mobile start
# web preview (used for the recorded demo)
pnpm --filter @helix/mobile web
```

Demo recording (API + Expo web already running):

```bash
pnpm exec playwright install chrome
node scripts/record-demo.mjs
# writes /opt/cursor/artifacts/helix-demo.mp4
```

## Rules

- Never grant XP on the client. Preview is not a grant (`granted: false`).
- Completions require a session. XP is computed only on the server.
- AI never writes XP, payments, or health records.
- Do not commit secrets.

## Docs

See [`docs/README.md`](docs/README.md) and the [Project Readiness Report](docs/project/project-readiness-report.md).
