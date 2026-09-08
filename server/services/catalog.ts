import { prisma } from "../db/client";
import { listActiveExercises } from "../repositories/exercise";

export async function listCatalog() {
  return listActiveExercises(prisma);
}
