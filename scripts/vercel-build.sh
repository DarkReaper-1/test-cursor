#!/usr/bin/env bash
# Vercel / production build. Ships a seeded SQLite file so the app runs
# without DATABASE_URL (Neon/Supabase are not required).
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" || "${DATABASE_URL}" == postgresql://* || "${DATABASE_URL}" == postgres://* ]]; then
  export DATABASE_URL="file:./dev.db"
fi

pnpm exec prisma generate
pnpm exec prisma db push --skip-generate --accept-data-loss
pnpm exec tsx prisma/seed.ts
pnpm exec next build
