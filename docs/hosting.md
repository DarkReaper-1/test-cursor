# Host SYSTEM on the public website

The GitHub repo website (https://test-cursor-eosin.vercel.app) deploys **`main`**. Until SYSTEM is on `main`, that link will keep serving an older app (Spider-Man, etc.).

SYSTEM ships a SQLite save file. You do **not** need Neon, Supabase, or a Vercel `DATABASE_URL`.

## Permanent setup (once)

1. Merge this branch into `main` so Vercel production builds SYSTEM.
2. Redeploy Production if Vercel does not auto-deploy.

The build generates Prisma, pushes the SQLite schema, and seeds the playtest file into `prisma/dev.db`. On Vercel that file is copied to `/tmp/system.db` (the writable path) on boot.

Playtest file:

```text
tester
tester@system.test
testfile1
```

3. Open https://test-cursor-eosin.vercel.app/sign-in and press Enter.

`AUTH_SECRET` has a playtest default in `vercel.json`. Change it before launch.

## Notes

- Leftover `postgresql://…` env vars are ignored.
- Vercel serverless `/tmp` is per-instance, so playtest progress may reset between cold starts. That is enough to sign in and train. A hosted Postgres URL is optional later if you want durable saves.
