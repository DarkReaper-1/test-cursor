# SYSTEM

SYSTEM is an original fitness RPG. Your real-world training is the save file.

This is not a franchise clone. No hunter guilds, dungeon windows, or borrowed chrome.

North star: **your body is the save file.**

> **Level is what you earn. Rank is what you are recognized as.**

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 0–3 | Foundation, training, XP / level / attributes | Locked |
| 4 / 4.5 / 4.6 | Quests + daily-target + Iron Week 400 | Locked |
| 5 | Lifetime achievements | Locked |
| 5.5 / 6 | Rank economy + accepted promotion | Locked |
| **6.5** | **Playtest & balance — no new features** | **Active** |

AI, builds, dungeons, social, wearables, camera, payments, and adaptive training are **not** in this phase. See `docs/phase-6.5-playtest.md`.

## The loop

Today’s directive → train → workout XP → quest progress/complete → achievement progress/unlock → level (automatic) → rank eligibility → player accepts → rank up.

## Setup

```bash
cp .env.example .env   # DATABASE_URL, AUTH_SECRET
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm typecheck
pnpm test
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Register a callsign, begin today’s directive, log the work. XP is awarded on the server.

## Rules

- The client never grants XP, level, rank, or attributes.
- `XpEvent` is the source of truth; Player fields are snapshots.
- Workout completion is transactional and idempotent.
- Rank promotion is next-rank only, server-derived, and accepted — never auto-applied from level.
- Repositories are the only Prisma callers.
- Rank names and promotion requirements live in `lib/constants/ranks.ts`.
