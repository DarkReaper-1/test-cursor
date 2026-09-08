import type { ProgressionEvent, Prisma } from "@prisma/client";
import type { Db } from "../db/client";

export async function insertProgressionEvent(
  db: Db,
  input: {
    playerId: string;
    type: string;
    payload: Prisma.InputJsonValue;
  },
): Promise<ProgressionEvent> {
  return db.progressionEvent.create({ data: input });
}

export async function findWorkoutCompletedEvent(
  db: Db,
  playerId: string,
  workoutId: string,
): Promise<ProgressionEvent | null> {
  return db.progressionEvent.findFirst({
    where: {
      playerId,
      type: "WORKOUT_COMPLETED",
      payload: {
        path: ["workoutId"],
        equals: workoutId,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listRecentProgressionEvents(
  db: Db,
  playerId: string,
  take = 20,
): Promise<ProgressionEvent[]> {
  return db.progressionEvent.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
