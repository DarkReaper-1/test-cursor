import fs from "fs";
import path from "path";
import { applyAuthSecret, resolveDatabaseUrl } from "@/lib/runtime-env";

function packagedDatabasePaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "prisma", "dev.db"),
    path.join(cwd, "dev.db"),
    path.resolve(__dirname, "../../prisma/dev.db"),
    path.join(cwd, ".next", "server", "prisma", "dev.db"),
  ];
}

function findPackagedDatabase(): string | null {
  for (const candidate of packagedDatabasePaths()) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function sqliteFilePath(url: string): string | null {
  if (!url.startsWith("file:")) return null;
  const raw = url.slice("file:".length);
  if (path.isAbsolute(raw)) return raw;
  return path.join(process.cwd(), "prisma", path.basename(raw));
}

/**
 * Point Prisma at a local SQLite file and, on serverless hosts, copy the
 * packaged playtest database into a writable path before the client connects.
 */
export function ensureSqliteFile(): string {
  applyAuthSecret();
  const url = resolveDatabaseUrl();
  process.env.DATABASE_URL = url;

  const dest = sqliteFilePath(url);
  if (dest && !fs.existsSync(dest)) {
    const src = findPackagedDatabase();
    if (src && src !== dest) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  return url;
}
