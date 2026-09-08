import type {
  AchievementDefinition,
  AchievementFamily,
  AchievementStatus,
  PlayerAchievement,
  Prisma,
} from "@prisma/client";
import type { Db } from "../db/client";
import type { AchievementCatalogEntry } from "@/lib/constants/achievements";

export async function upsertDefinition(
  db: Db,
  entry: AchievementCatalogEntry,
): Promise<AchievementDefinition> {
  const predicate = entry.predicate as Prisma.InputJsonValue;
  return db.achievementDefinition.upsert({
    where: { key: entry.key },
    update: {
      family: entry.family,
      title: entry.title,
      description: entry.description,
      identity: entry.identity,
      baseTarget: entry.baseTarget,
      xpReward: entry.xpReward,
      predicate,
      active: true,
      sortOrder: entry.sortOrder,
    },
    create: {
      key: entry.key,
      family: entry.family,
      title: entry.title,
      description: entry.description,
      identity: entry.identity,
      baseTarget: entry.baseTarget,
      xpReward: entry.xpReward,
      predicate,
      active: true,
      sortOrder: entry.sortOrder,
    },
  });
}

export async function findDefinitionByKey(
  db: Db,
  key: string,
): Promise<AchievementDefinition | null> {
  return db.achievementDefinition.findUnique({ where: { key } });
}

export type PlayerAchievementCreate = {
  playerId: string;
  definitionId: string;
  key: string;
  family: AchievementFamily;
  title: string;
  description: string;
  identity: string;
  predicate: Prisma.InputJsonValue;
  target: number;
  xpReward: number;
};

export async function createPlayerAchievementsIgnoreDupes(
  db: Db,
  rows: PlayerAchievementCreate[],
): Promise<void> {
  if (rows.length === 0) return;
  await db.playerAchievement.createMany({ data: rows, skipDuplicates: true });
}

export async function listPlayerAchievements(
  db: Db,
  playerId: string,
): Promise<PlayerAchievement[]> {
  return db.playerAchievement.findMany({
    where: { playerId },
    orderBy: { createdAt: "asc" },
  });
}

export async function listUnlockedAchievementKeys(db: Db, playerId: string): Promise<string[]> {
  const rows = await db.playerAchievement.findMany({
    where: { playerId, status: "UNLOCKED" },
    select: { key: true },
  });
  return rows.map((row) => row.key);
}

export async function updatePlayerAchievement(
  db: Db,
  id: string,
  data: {
    progress?: number;
    status?: AchievementStatus;
    unlockedAt?: Date | null;
  },
): Promise<PlayerAchievement> {
  return db.playerAchievement.update({ where: { id }, data });
}
