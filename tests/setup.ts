import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path, { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PLAYTEST_AUTH_SECRET } from "../lib/runtime-env";
import { seedCatalog } from "../server/db/seed-catalog";

try {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1).replace(/^"|"$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env is optional for unit tests
}

process.env.DATABASE_URL = "file:./test.db";
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = PLAYTEST_AUTH_SECRET;
}

const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
if (existsSync(prismaCli)) {
  execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate", "--accept-data-loss"], {
    env: process.env,
    stdio: "pipe",
  });
}

const seedClient = new PrismaClient();
await seedCatalog(seedClient);
await seedClient.$disconnect();
