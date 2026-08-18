# Helix

Helix is a personal RPG that turns real-world progress into an evolving digital identity.

North star: **What should I do today to become better tomorrow?**

This is not a clone of Arise or any proprietary fitness RPG.

## Status

- **Phase 0:** Discovery — `docs/`
- **Phase 1:** Running skeleton (this tree)
- **MVP loop:** not fully wired (auth + completions land in Phases 2–5)

## Workspace

```
apps/mobile     Expo (Today + Character)
apps/api        Next.js  /api/v1/health  /api/v1/rewards/preview
packages/shared Zod contracts
packages/design Visual tokens (warm lattice, not a cyan HUD)
packages/rpg    XP, levels, ranks, momentum, RewardEngine
packages/fitness Adaptive set progression
packages/ai     AIProvider + NoneProvider
```

## Commands

```bash
pnpm install
pnpm --filter @helix/api db:generate
pnpm typecheck
pnpm test
```

API (no database required for health):

```bash
pnpm --filter @helix/api dev
# GET http://localhost:3000/api/v1/health
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
```

## Rules

- Never grant XP on the client. Preview is not a grant (`granted: false`).
- Completions return 401 until Phase 2 auth exists.
- AI never writes XP, payments, or health records.
- Do not commit secrets.

## Docs

See [`docs/README.md`](docs/README.md) and the [Project Readiness Report](docs/project/project-readiness-report.md).
