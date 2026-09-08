import type { Exercise } from "@prisma/client";
import type { Db } from "../db/client";

export async function listActiveExercises(db: Db): Promise<Exercise[]> {
  return db.exercise.findMany({ where: { active: true }, orderBy: { slug: "asc" } });
}

export async function findExercisesByIds(db: Db, ids: string[]): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  return db.exercise.findMany({ where: { id: { in: ids } } });
}
