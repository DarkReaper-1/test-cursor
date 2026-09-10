export const PLAYTEST_AUTH_SECRET = "system-playtest-auth-secret-change-before-launch";

export function applyAuthSecret(): void {
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = PLAYTEST_AUTH_SECRET;
  }
}

export function isPostgresUrl(url: string | undefined): boolean {
  return Boolean(url && /^postgres(ql)?:\/\//i.test(url.trim()));
}

export function isServerlessHost(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/** Prisma SQLite URLs are relative to prisma/schema.prisma. */
export function defaultSqliteUrl(): string {
  if (isServerlessHost()) return "file:/tmp/system.db";
  return "file:./dev.db";
}

export function resolveDatabaseUrl(): string {
  const existing = process.env.DATABASE_URL;
  if (existing && !isPostgresUrl(existing)) return existing;
  return defaultSqliteUrl();
}
