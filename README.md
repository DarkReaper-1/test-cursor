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

The public GitHub/Vercel link only serves SYSTEM after this app is on `main` **and** `DATABASE_URL` is set in Vercel. See `docs/hosting.md`.

Local:

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in). Leave the prefilled playtest file. Press Enter.

## Rules

- The client never grants XP, level, rank, or attributes.
- Rank is accepted, never auto-applied from level.
- Repositories are the only Prisma callers.
