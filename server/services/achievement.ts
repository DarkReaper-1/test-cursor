import type { PlayerAchievement, Prisma } from "@prisma/client";
import type { Db } from "../db/client";
import { prisma } from "../db/client";
import * as playerRepo from "../repositories/player";
import * as achievementRepo from "../repositories/achievement";
import * as workoutRepo from "../repositories/workout";
import * as xpEventRepo from "../repositories/xp-event";
import * as eventRepo from "../repositories/progression-event";
import { ACHIEVEMENT_CATALOG, type AchievementFamily } from "@/lib/constants/achievements";
import type {
  AchievementBoardDto,
  AchievementDto,
  AchievementUnlockDto,
} from "@/lib/types";
import type { RankKey } from "@/lib/constants/ranks";
import {
  evaluatePredicate,
  nextAchievementStatus,
  type AchievementEvalContext,
  type ExercisePerformance,
} from "./achievement-eval";

export async function syncAchievementCatalog(db: Db): Promise<void> {
  for (const entry of ACHIEVEMENT_CATALOG) {
    await achievementRepo.upsertDefinition(db, entry);
  }
}

export async function ensurePlayerAchievements(db: Db, playerId: string): Promise<void> {
  await syncAchievementCatalog(db);
  const existing = await achievementRepo.listPlayerAchievements(db, playerId);
  const have = new Set(existing.map((row) => row.key));
  const rows: achievementRepo.PlayerAchievementCreate[] = [];
  for (const entry of ACHIEVEMENT_CATALOG) {
    if (have.has(entry.key)) continue;
    const definition = await achievementRepo.findDefinitionByKey(db, entry.key);
    if (!definition) continue;
    rows.push({
      playerId,
      definitionId: definition.id,
      key: entry.key,
      family: entry.family,
      title: entry.title,
      description: entry.description,
      identity: entry.identity,
      predicate: entry.predicate as Prisma.InputJsonValue,
      target: entry.baseTarget,
      xpReward: entry.xpReward,
    });
  }
  await achievementRepo.createPlayerAchievementsIgnoreDupes(db, rows);
}

function toAchievementDto(row: PlayerAchievement): AchievementDto {
  const percent =
    row.target <= 0 ? 0 : Math.min(100, Math.round((row.progress / row.target) * 100));
  return {
    id: row.id,
    key: row.key,
    family: row.family,
    title: row.title,
    description: row.description,
    identity: row.identity,
    progress: row.progress,
    target: row.target,
    percent,
    status: row.status,
    xpReward: row.xpReward,
    unlockedAt: row.unlockedAt ? row.unlockedAt.toISOString() : null,
  };
}

function boardFromRows(rows: PlayerAchievement[]): AchievementBoardDto {
  const order = new Map(ACHIEVEMENT_CATALOG.map((entry, index) => [entry.key, index]));
  const sorted = [...rows].sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99));
  const grouped = {
    MILESTONE: [] as AchievementDto[],
    STREAK: [] as AchievementDto[],
    MASTERY: [] as AchievementDto[],
  };
  for (const row of sorted) {
    grouped[row.family as AchievementFamily].push(toAchievementDto(row));
  }
  return {
    milestones: grouped.MILESTONE,
    streak: grouped.STREAK,
    mastery: grouped.MASTERY,
  };
}

async function evaluateAgainstState(
  db: Db,
  input: {
    playerId: string;
    now: Date;
    ctx: AchievementEvalContext;
  },
): Promise<{ unlocks: AchievementUnlockDto[]; achievementXp: number }> {
  const rows = await achievementRepo.listPlayerAchievements(db, input.playerId);
  const unlocks: AchievementUnlockDto[] = [];
  let achievementXp = 0;
  const hasPriorPerformance = input.ctx.priorExercises.length > 0;

  for (const row of rows) {
    if (row.status === "UNLOCKED") continue;
    const evaluated = evaluatePredicate(row.predicate, input.ctx);
    if (!evaluated) continue;

    const status = nextAchievementStatus({
      predicate: row.predicate,
      currentStatus: row.status,
      qualifies: evaluated.qualifies,
      progress: evaluated.progress,
      hasPriorPerformance,
    });

    if (status === "UNLOCKED") {
      await achievementRepo.updatePlayerAchievement(db, row.id, {
        progress: evaluated.target,
        status: "UNLOCKED",
        unlockedAt: input.now,
      });
      await xpEventRepo.insertXpEvent(db, {
        playerId: input.playerId,
        amount: row.xpReward,
        source: "ACHIEVEMENT",
        sourceId: row.id,
        idempotencyKey: `achievement:${row.id}:unlock`,
      });
      await eventRepo.insertProgressionEvent(db, {
        playerId: input.playerId,
        type: "ACHIEVEMENT_UNLOCKED",
        payload: {
          achievementId: row.id,
          key: row.key,
          title: row.title,
          description: row.description,
          identity: row.identity,
          family: row.family,
          xp: row.xpReward,
        } as Prisma.InputJsonValue,
      });
      unlocks.push({
        id: row.id,
        key: row.key,
        family: row.family,
        title: row.title,
        description: row.description,
        identity: row.identity,
        xp: row.xpReward,
      });
      achievementXp += row.xpReward;
    } else {
      await achievementRepo.updatePlayerAchievement(db, row.id, {
        progress: evaluated.progress,
        status,
      });
    }
  }

  return { unlocks, achievementXp };
}

export async function applyWorkoutToAchievements(
  db: Db,
  input: {
    playerId: string;
    now: Date;
    workoutId: string;
    level: number;
    rank: RankKey;
    streak: number;
    exercises: ExercisePerformance[];
  },
): Promise<{ unlocks: AchievementUnlockDto[]; achievementXp: number }> {
  await ensurePlayerAchievements(db, input.playerId);
  const workoutCount = await workoutRepo.countCompletedWorkouts(db, input.playerId);
  const priorExercises = await workoutRepo.listPriorExerciseLogs(db, input.playerId, input.workoutId);
  const ctx: AchievementEvalContext = {
    workoutCount,
    level: input.level,
    rank: input.rank,
    streak: input.streak,
    currentExercises: input.exercises,
    priorExercises,
  };
  return evaluateAgainstState(db, { playerId: input.playerId, now: input.now, ctx });
}

export async function getAchievementBoard(accountId: string): Promise<AchievementBoardDto> {
  const player = await playerRepo.findPlayerByAccountId(prisma, accountId);
  if (!player) throw new Error("PLAYER_MISSING");
  await prisma.$transaction(async (tx) => {
    await ensurePlayerAchievements(tx, player.id);
  });
  const rows = await achievementRepo.listPlayerAchievements(prisma, player.id);
  return boardFromRows(rows);
}
