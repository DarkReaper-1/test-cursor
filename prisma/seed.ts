import { PrismaClient } from "@prisma/client";
import { ensureSqliteFile } from "../server/db/url";
import { seedCatalog } from "../server/db/seed-catalog";

async function main() {
  ensureSqliteFile();
  const prisma = new PrismaClient();
  try {
    await seedCatalog(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
