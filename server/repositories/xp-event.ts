import type { XpEvent } from "@prisma/client";
import type { Db } from "../db/client";

export async function insertXpEvent(
  db: Db,
  input: {
    playerId: string;
    amount: number;
    source: string;
    sourceId: string;
    idempotencyKey: string;
  },
): Promise<XpEvent> {
  return db.xpEvent.create({ data: input });
}

export async function sumXp(db: Db, playerId: string): Promise<number> {
  const result = await db.xpEvent.aggregate({
    where: { playerId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}
