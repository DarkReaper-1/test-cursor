import { Prisma } from "@prisma/client";
import type { PlayerQuest, QuestDefinition, QuestStatus, QuestTier } from "@prisma/client";
import type { Db } from "../db/client";
import type { QuestCatalogEntry } from "@/lib/constants/quests";

export async function upsertDefinition(db: Db, entry: QuestCatalogEntry): Promise<QuestDefinition> {
  const predicate = entry.predicate as Prisma.InputJsonValue;
  return db.questDefinition.upsert({
    where: { key: entry.key },
    update: {
      tier: entry.tier,
      type: entry.type,
      title: entry.title,
      description: entry.descriptionTemplate,
      baseTarget: entry.baseTarget,
      xpReward: entry.xpReward,
      predicate,
      active: true,
      sortOrder: entry.sortOrder,
    },
    create: {
      key: entry.key,
      tier: entry.tier,
      type: entry.type,
      title: entry.title,
      description: entry.descriptionTemplate,
      baseTarget: entry.baseTarget,
      xpReward: entry.xpReward,
      predicate,
      active: true,
      sortOrder: entry.sortOrder,
    },
  });
}

export async function listDefinitions(db: Db): Promise<QuestDefinition[]> {
  return db.questDefinition.findMany({
    where: { active: true },
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
  });
}

export async function findDefinitionByKey(db: Db, key: string): Promise<QuestDefinition | null> {
  return db.questDefinition.findUnique({ where: { key } });
}

export type PlayerQuestCreate = {
  playerId: string;
  definitionId: string;
  key: string;
  tier: QuestTier;
  type: QuestDefinition["type"];
  title: string;
  description: string;
  predicate: Prisma.InputJsonValue;
  periodKey: string;
  target: number;
  xpReward: number;
  startedAt: Date;
  expiresAt: Date;
};

export async function createPlayerQuest(db: Db, input: PlayerQuestCreate): Promise<PlayerQuest> {
  return db.playerQuest.create({ data: input });
}

export async function createPlayerQuestsIgnoreDupes(
  db: Db,
  rows: PlayerQuestCreate[],
): Promise<void> {
  for (const row of rows) {
    try {
      await db.playerQuest.create({ data: row });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
        throw err;
      }
    }
  }
}

export async function listPlayerQuestsForPeriod(
  db: Db,
  playerId: string,
  periodKey: string,
): Promise<PlayerQuest[]> {
  return db.playerQuest.findMany({
    where: { playerId, periodKey },
    orderBy: { createdAt: "asc" },
  });
}

export async function listActiveQuests(db: Db, playerId: string): Promise<PlayerQuest[]> {
  return db.playerQuest.findMany({
    where: { playerId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
}

export async function expireOverdue(
  db: Db,
  playerId: string,
  now: Date,
): Promise<number> {
  const result = await db.playerQuest.updateMany({
    where: {
      playerId,
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

export async function updatePlayerQuest(
  db: Db,
  id: string,
  data: {
    progress?: number;
    status?: QuestStatus;
    completedAt?: Date | null;
    sourceIds?: Prisma.InputJsonValue;
  },
): Promise<PlayerQuest> {
  return db.playerQuest.update({ where: { id }, data });
}

export async function findPlayerQuestById(db: Db, id: string): Promise<PlayerQuest | null> {
  return db.playerQuest.findUnique({ where: { id } });
}
