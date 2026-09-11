# SYSTEM

SYSTEM is an original fitness RPG. Your real-world training is the save file.

North star: **your body is the save file.**

> **Level is what you earn. Rank is what you are recognized as.**

## Playtest file

```text
callsign  tester
email     tester@system.test
password  testfile1
```

## Website

The public GitHub/Vercel link only serves SYSTEM after this app is on `main`. SQLite is bundled — no Neon/Supabase `DATABASE_URL` is required. See `docs/hosting.md`.

Local:

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in). Leave the prefilled playtest file. Press Enter.

## Rules

- The client never grants XP, level, rank, or attributes.
- Rank is accepted, never auto-applied from level.
- Repositories are the only Prisma callers.

## Phase 7 — Vision

V1 is **guided camera logging**. You pick the exercise; the camera counts reps on-device; SYSTEM still evaluates through `POST /api/v1/workouts`. There is no manual log — work is not filed until SYSTEM has seen it. Footage is not saved. See `docs/vision.md`.

