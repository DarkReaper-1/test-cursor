# SYSTEM

SYSTEM is an original fitness RPG. Your real-world training is the save file.

This is not a franchise clone. No hunter guilds, dungeon windows, or borrowed chrome.

## Status

Phases 0–3: scaffold, identity, training log, Today / train / result UI.

Quests, achievements, builds, AI, social, wearables, camera, and payments are not implemented.

## Setup

```bash
cp .env.example .env   # DATABASE_URL, AUTH_SECRET
pnpm install
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
pnpm typecheck
pnpm test
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The sign-in form is prefilled with the playtest file (remove before launch):

```text
callsign  tester
email     tester@system.test
password  testfile1
```

Press **Enter**. Then begin today’s directive.

## Rules

- The client never grants XP, level, rank, or attributes.
- `XpEvent` is the source of truth; Player fields are snapshots.
- Workout completion is transactional and idempotent.
- Repositories are the only Prisma callers.
- Rank names live in `lib/constants/ranks.ts`.
