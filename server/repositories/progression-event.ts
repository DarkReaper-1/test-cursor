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
