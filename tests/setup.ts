import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "system-playtest-auth-secret-change-before-launch";
}
