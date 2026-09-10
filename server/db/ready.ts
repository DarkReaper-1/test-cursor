import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "./client";
import { seedCatalog } from "./seed-catalog";

let prepared: Promise<void> | undefined;

function tryPushSchema(): boolean {
  const cli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  if (!existsSync(cli)) return false;
  try {
    execFileSync(process.execPath, [cli, "db", "push", "--skip-generate", "--accept-data-loss"], {
      env: process.env,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

async function catalogReady(): Promise<boolean> {
  try {
    await prisma.exercise.count();
    return true;
  } catch {
    return false;
  }
}

export function prepareDatabase(): Promise<void> {
  prepared ??= (async () => {
    if (!(await catalogReady()) && tryPushSchema()) {
      await catalogReady();
    }
    try {
      const exercises = await prisma.exercise.count();
      if (exercises === 0) {
        await seedCatalog(prisma);
      }
    } catch {
      // Packaged sqlite should already have tables. Leave health to report otherwise.
    }
  })();
  return prepared;
}
