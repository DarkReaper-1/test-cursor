#!/usr/bin/env bash
# Vercel / production build. Prisma generate needs a DATABASE_URL even when
# it will not connect; migrate/seed only run when a real host URL is present.
set -euo pipefail

DUMMY_DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
REAL_DATABASE_URL="${DATABASE_URL:-}"

export DATABASE_URL="${REAL_DATABASE_URL:-$DUMMY_DATABASE_URL}"
pnpm exec prisma generate

if [[ -n "$REAL_DATABASE_URL" ]]; then
  export DATABASE_URL="$REAL_DATABASE_URL"
  pnpm exec prisma migrate deploy
  pnpm exec tsx prisma/seed.ts
fi

pnpm exec next build
