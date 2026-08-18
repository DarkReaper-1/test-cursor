# Phase 1 skeleton

Implemented:

- pnpm workspaces
- Expo app: Today + Character (original Helix visual tokens)
- Next.js API: `GET /api/v1/health`, `POST /api/v1/rewards/preview`, `POST /api/v1/completions` (401)
- Prisma schema: users, profiles, characters, attribute catalog, xp_events
- `RewardEngine`, levels, ranks, momentum
- Fitness `nextPrescription` (8,8,7 → 8,8,8)
- `AIProvider` / `NoneProvider`
- GitHub Actions `verify`
- `.env.example`

Verified 2026-08-18:

- `pnpm typecheck` and `pnpm test` pass
- `GET /api/v1/health` → `{ ok: true, aiProvider: "none", database: "unconfigured" }`
- `POST /api/v1/completions` → 401
- `POST /api/v1/rewards/preview` returns `granted: false` and ignores client `xp`

- Auth sessions
- Persisted completions
- Camera, HealthKit, paywalls
- Vendor LLM adapters beyond the interface
