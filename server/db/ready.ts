import { prisma } from "./client";
import { seedCatalog } from "./seed-catalog";

let prepared: Promise<void> | undefined;

export function prepareDatabase(): Promise<void> {
  prepared ??= (async () => {
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
