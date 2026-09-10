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
  const rows = await db.progressionEvent.findMany({
    where: { playerId, type: "WORKOUT_COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    rows.find((row) => {
      const payload = row.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
      return (payload as { workoutId?: unknown }).workoutId === workoutId;
    }) ?? null
  );
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
