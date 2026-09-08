import type { Player, PlayerQuest, Prisma } from "@prisma/client";
import type { Db } from "../db/client";
import { prisma } from "../db/client";
import * as playerRepo from "../repositories/player";
import * as questRepo from "../repositories/quest";
import * as xpEventRepo from "../repositories/xp-event";
import * as eventRepo from "../repositories/progression-event";
import { QUEST_CATALOG, type QuestTier } from "@/lib/constants/quests";
import type { QuestBoardDto, QuestCompletionDto, QuestDto } from "@/lib/types";
import {
  activeCatalogForTier,
  descriptionFor,
  scaleQuestTarget,
} from "./quest-catalog";
import { dailyPeriod, weeklyPeriod } from "./quest-period";
import {
  activityFromWorkout,
  applyDelta,
  deltaForQuest,
  shouldComplete,
  type LoggedExercise,
} from "./quest-progress";

export async function syncQuestCatalog(db: Db): Promise<void> {
  for (const entry of QUEST_CATALOG) {
    await questRepo.upsertDefinition(db, entry);
  }
}

function toQuestDto(row: PlayerQuest): QuestDto {
  const percent =
    row.target <= 0 ? 0 : Math.min(100, Math.round((row.progress / row.target) * 100));
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    description: row.description,
    tier: row.tier,
    type: row.type,
    progress: row.progress,
    target: row.target,
    percent,
    status: row.status,
    xpReward: row.xpReward,
    startedAt: row.startedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

function boardFromRows(
  tier: QuestTier,
  periodKey: string,
  timezone: string,
  expiresAt: Date,
  rows: PlayerQuest[],
): QuestBoardDto {
  const catalogOrder = new Map(
    activeCatalogForTier(tier).map((entry, index) => [entry.key, index]),
  );
  const quests = [...rows]
    .filter((row) => row.tier === tier)
    .sort((a, b) => (catalogOrder.get(a.key) ?? 99) - (catalogOrder.get(b.key) ?? 99))
    .map(toQuestDto);
  const completedCount = quests.filter((quest) => quest.status === "COMPLETED").length;
  return {
    tier,
    periodKey,
    timezone,
    expiresAt: expiresAt.toISOString(),
    quests,
    completedCount,
    totalCount: quests.length,
    xpRewardTotal: quests.reduce((sum, quest) => sum + quest.xpReward, 0),
  };
}

async function ensurePeriodQuests(
  db: Db,
  player: Player,
  tier: QuestTier,
  now: Date,
): Promise<void> {
  const period = tier === "DAILY" ? dailyPeriod(now, player.timezone) : weeklyPeriod(now, player.timezone);
  const existing = await questRepo.listPlayerQuestsForPeriod(db, player.id, period.periodKey);
  const have = new Set(existing.map((row) => row.key));
  const rows: questRepo.PlayerQuestCreate[] = [];
  for (const entry of activeCatalogForTier(tier)) {
    if (have.has(entry.key)) continue;
    const definition = await questRepo.findDefinitionByKey(db, entry.key);
    if (!definition) continue;
    const target = scaleQuestTarget(entry, player);
    rows.push({
      playerId: player.id,
      definitionId: definition.id,
      key: entry.key,
      tier: entry.tier,
      type: entry.type,
      title: entry.title,
      description: descriptionFor(entry, target),
      predicate: entry.predicate as Prisma.InputJsonValue,
      periodKey: period.periodKey,
      target,
      xpReward: entry.xpReward,
      startedAt: period.startedAt,
      expiresAt: period.expiresAt,
    });
  }
  await questRepo.createPlayerQuestsIgnoreDupes(db, rows);
}

export async function ensurePlayerQuests(db: Db, player: Player, now: Date): Promise<void> {
  await syncQuestCatalog(db);
  await questRepo.expireOverdue(db, player.id, now);
  await ensurePeriodQuests(db, player, "DAILY", now);
  await ensurePeriodQuests(db, player, "WEEKLY", now);
}

export async function applyWorkoutToQuests(
  db: Db,
  input: {
    player: Player;
    workoutId: string;
    durationSec: number;
    exercises: LoggedExercise[];
    now: Date;
  },
): Promise<{ completions: QuestCompletionDto[]; questXp: number }> {
  await ensurePlayerQuests(db, input.player, input.now);
  const activity = activityFromWorkout({
    workoutId: input.workoutId,
    durationSec: input.durationSec,
    exercises: input.exercises,
  });
  const active = await questRepo.listActiveQuests(db, input.player.id);
  const completions: QuestCompletionDto[] = [];
  let questXp = 0;

  for (const quest of active) {
    if (quest.sourceIds.includes(input.workoutId)) continue;
    const delta = deltaForQuest({
      type: quest.type,
      predicate: quest.predicate,
      activity,
    });
    const progress = applyDelta(quest.progress, quest.target, delta);
    const sourceIds = [...quest.sourceIds, input.workoutId];
    const completes = quest.status === "ACTIVE" && shouldComplete(progress, quest.target);

    if (completes) {
      await questRepo.updatePlayerQuest(db, quest.id, {
        progress,
        status: "COMPLETED",
        completedAt: input.now,
        sourceIds,
      });
      await xpEventRepo.insertXpEvent(db, {
        playerId: input.player.id,
        amount: quest.xpReward,
        source: "QUEST",
        sourceId: quest.id,
        idempotencyKey: `quest:${quest.id}:complete`,
      });
      await eventRepo.insertProgressionEvent(db, {
        playerId: input.player.id,
        type: "QUEST_COMPLETED",
        payload: {
          questId: quest.id,
          key: quest.key,
          title: quest.title,
          xp: quest.xpReward,
          workoutId: input.workoutId,
        } as Prisma.InputJsonValue,
      });
      completions.push({
        id: quest.id,
        key: quest.key,
        title: quest.title,
        xp: quest.xpReward,
      });
      questXp += quest.xpReward;
    } else {
      await questRepo.updatePlayerQuest(db, quest.id, {
        progress,
        sourceIds,
      });
    }
  }

  return { completions, questXp };
}

async function boardFor(
  accountId: string,
  tier: QuestTier,
  now = new Date(),
): Promise<QuestBoardDto> {
  const player = await playerRepo.findPlayerByAccountId(prisma, accountId);
  if (!player) throw new Error("PLAYER_MISSING");
  await prisma.$transaction(async (tx) => {
    await ensurePlayerQuests(tx, player, now);
  });
  const period = tier === "DAILY" ? dailyPeriod(now, player.timezone) : weeklyPeriod(now, player.timezone);
  const rows = await questRepo.listPlayerQuestsForPeriod(prisma, player.id, period.periodKey);
  return boardFromRows(tier, period.periodKey, player.timezone, period.expiresAt, rows);
}

export async function getTodayQuests(accountId: string, now = new Date()): Promise<QuestBoardDto> {
  return boardFor(accountId, "DAILY", now);
}

export async function getWeekQuests(accountId: string, now = new Date()): Promise<QuestBoardDto> {
  return boardFor(accountId, "WEEKLY", now);
}

export async function getQuestPage(
  accountId: string,
  now = new Date(),
): Promise<{ daily: QuestBoardDto; weekly: QuestBoardDto }> {
  const player = await playerRepo.findPlayerByAccountId(prisma, accountId);
  if (!player) throw new Error("PLAYER_MISSING");
  await prisma.$transaction(async (tx) => {
    await ensurePlayerQuests(tx, player, now);
  });
  const daily = dailyPeriod(now, player.timezone);
  const weekly = weeklyPeriod(now, player.timezone);
  const dailyRows = await questRepo.listPlayerQuestsForPeriod(prisma, player.id, daily.periodKey);
  const weeklyRows = await questRepo.listPlayerQuestsForPeriod(prisma, player.id, weekly.periodKey);
  return {
    daily: boardFromRows("DAILY", daily.periodKey, player.timezone, daily.expiresAt, dailyRows),
    weekly: boardFromRows("WEEKLY", weekly.periodKey, player.timezone, weekly.expiresAt, weeklyRows),
  };
}
