import type { Prisma, RankPromotion } from "@prisma/client";
import type { Db } from "../db/client";

export async function insertRankPromotion(
  db: Db,
  input: {
    playerId: string;
    fromRank: string;
    toRank: string;
    levelAtAccept: number;
    xpAtAccept: number;
    workoutCountAtAccept: number;
    streakAtAccept: number;
    bestStreakAtAccept: number;
    requirementSnapshot: Prisma.InputJsonValue;
    acceptedAt: Date;
  },
): Promise<RankPromotion> {
  return db.rankPromotion.create({ data: input });
}

export async function findRankPromotion(
  db: Db,
  playerId: string,
  toRank: string,
): Promise<RankPromotion | null> {
  return db.rankPromotion.findUnique({
    where: { playerId_toRank: { playerId, toRank } },
  });
}

export async function findLatestRankPromotion(
  db: Db,
  playerId: string,
): Promise<RankPromotion | null> {
  return db.rankPromotion.findFirst({
    where: { playerId },
    orderBy: { acceptedAt: "desc" },
  });
}
