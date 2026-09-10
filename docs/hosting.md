# Host SYSTEM on the public website

The GitHub repo website (https://test-cursor-eosin.vercel.app) deploys **`main`**. Until SYSTEM is on `main` with a Postgres URL, that link will keep serving an older app (Spider-Man, etc.) or a failed Vercel preview.

## Permanent setup (once)

1. Merge this branch into `main` so Vercel production builds SYSTEM, not the old static games.
2. Create a free Postgres database at [Neon](https://console.neon.tech) or [Supabase](https://supabase.com). Copy the connection string.
3. In Vercel → Project **test-cursor** → Settings → Environment Variables, add:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon/Supabase URL (`postgresql://…`) |
   | `AUTH_SECRET` | any long random string (override the playtest default before launch) |

   Apply to **Production**, **Preview**, and **Development**.
4. Redeploy Production (Deployments → … → Redeploy).

The build will run migrations and seed the playtest file:

```text
tester
tester@system.test
testfile1
```

5. Open https://test-cursor-eosin.vercel.app/sign-in and press Enter.

## What this repo already does

- Vercel build generates Prisma even if `DATABASE_URL` is missing, so the Next.js app can deploy.
- If the database is missing, sign-in shows that error instead of doing nothing.
- `AUTH_SECRET` has a playtest default in `vercel.json`. Change it before launch.
