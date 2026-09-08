import type { Prisma } from "@prisma/client";
import type { Db } from "../db/client";
import { prisma } from "../db/client";
import * as playerRepo from "../repositories/player";
import * as exerciseRepo from "../repositories/exercise";
import * as workoutRepo from "../repositories/workout";
import * as xpEventRepo from "../repositories/xp-event";
import * as eventRepo from "../repositories/progression-event";
import { computeWorkoutXp } from "./xp";
import { levelFromTotalXp } from "./level";
import { nextRankThreshold, rankFromLevel } from "./rank";
import { nextStreak } from "./streak";
import { applyAttributeDeltas, attributeDeltas, type AttributeSnapshot } from "./attributes";
import { applyWorkoutToQuests } from "./quest";
import { applyWorkoutToAchievements } from "./achievement";
import { toPlayerSnapshot } from "@/lib/format";
import type {
  AchievementUnlockDto,
  PlayerSnapshot,
  ProgressionEventDto,
  QuestCompletionDto,
  WorkoutResult,
} from "@/lib/types";
import type { RankKey } from "@/lib/constants/ranks";

export type CompleteWorkoutInput = {
  playerId: string;
  idempotencyKey: string;
  durationSec: number;
  exercises: Array<{
    exerciseId: string;
    sets: number;
    reps: number;
    weight: number;
    durationSec?: number;
  }>;
  now?: Date;
};

function milestoneFor(level: number): WorkoutResult["nextMilestone"] {
  const next = nextRankThreshold(level);
  return next ? { rank: next.key, minLevel: next.minLevel } : null;
}

function toResult(input: {
  workoutId: string;
  replay: boolean;
  xp: number;
  questXp: number;
  questCompletions: QuestCompletionDto[];
  achievementXp: number;
  achievementUnlocks: AchievementUnlockDto[];
  before: PlayerSnapshot;
  after: PlayerSnapshot;
  events: ProgressionEventDto[];
}): WorkoutResult {
  return {
    workoutId: input.workoutId,
    replay: input.replay,
    xp: input.xp,
    questXp: input.questXp,
    questCompletions: input.questCompletions,
    achievementXp: input.achievementXp,
    achievementUnlocks: input.achievementUnlocks,
    leveledUp: input.after.level > input.before.level,
    rankUp: input.after.rank !== input.before.rank,
    before: input.before,
    player: input.after,
    nextMilestone: milestoneFor(input.after.level),
    events: input.events,
  };
}

function snapshotFromPayload(value: unknown): PlayerSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as PlayerSnapshot;
  if (typeof row.id !== "string" || typeof row.level !== "number" || typeof row.xp !== "number") {
    return null;
  }
  return row;
}

function completionsFromPayload(value: unknown): QuestCompletionDto[] {
  if (!Array.isArray(value)) return [];
  const rows: QuestCompletionDto[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.key !== "string") continue;
    if (typeof row.title !== "string" || typeof row.xp !== "number") continue;
    rows.push({ id: row.id, key: row.key, title: row.title, xp: row.xp });
  }
  return rows;
}

function unlocksFromPayload(value: unknown): AchievementUnlockDto[] {
  if (!Array.isArray(value)) return [];
  const rows: AchievementUnlockDto[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.key !== "string") continue;
    if (typeof row.title !== "string" || typeof row.xp !== "number") continue;
    if (typeof row.family !== "string" || typeof row.description !== "string") continue;
    rows.push({
      id: row.id,
      key: row.key,
      family: row.family as AchievementUnlockDto["family"],
      title: row.title,
      description: row.description,
      identity: typeof row.identity === "string" ? row.identity : "",
      xp: row.xp,
    });
  }
  return rows;
}

function resultFromStoredEvent(
  workoutId: string,
  xp: number,
  payload: Prisma.JsonValue | null,
  fallbackAfter: PlayerSnapshot,
  replay: boolean,
): WorkoutResult {
  const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const record = body as {
    before?: unknown;
    after?: unknown;
    events?: unknown;
    questXp?: unknown;
    questCompletions?: unknown;
    achievementXp?: unknown;
    achievementUnlocks?: unknown;
  };
  const before = snapshotFromPayload(record.before);
  const after = snapshotFromPayload(record.after) ?? fallbackAfter;
  const events = Array.isArray(record.events)
    ? (record.events as ProgressionEventDto[])
    : [{ type: "WORKOUT_COMPLETED" as const, payload: { workoutId, xp } }];
  const questCompletions = completionsFromPayload(record.questCompletions);
  const questXp = typeof record.questXp === "number" ? record.questXp : 0;
  const achievementUnlocks = unlocksFromPayload(record.achievementUnlocks);
  const achievementXp = typeof record.achievementXp === "number" ? record.achievementXp : 0;
  return toResult({
    workoutId,
    replay,
    xp,
    questXp,
    questCompletions,
    achievementXp,
    achievementUnlocks,
    before: before ?? after,
    after,
    events,
  });
}

async function evaluationForWorkout(
  db: Db,
  playerId: string,
  workoutId: string,
  replay: boolean,
): Promise<WorkoutResult> {
  const workout = await workoutRepo.findWorkoutById(db, workoutId);
  if (!workout || workout.playerId !== playerId) {
    throw new Error("WORKOUT_NOT_FOUND");
  }
  const player = await playerRepo.findPlayerById(db, playerId);
  if (!player) throw new Error("PLAYER_NOT_FOUND");
  const stored = await eventRepo.findWorkoutCompletedEvent(db, playerId, workoutId);
  return resultFromStoredEvent(
    workout.id,
    workout.xpEarned,
    stored?.payload ?? null,
    toPlayerSnapshot(player),
    replay,
  );
}

export async function getLatestEvaluation(accountId: string): Promise<WorkoutResult | null> {
  const player = await playerRepo.findPlayerByAccountId(prisma, accountId);
  if (!player) throw new Error("PLAYER_MISSING");
  const workout = await workoutRepo.findLatestCompletedWorkout(prisma, player.id);
  if (!workout) return null;
  return evaluationForWorkout(prisma, player.id, workout.id, true);
}

export async function completeWorkout(input: CompleteWorkoutInput): Promise<WorkoutResult> {
  const existing = await workoutRepo.findWorkoutByIdempotency(prisma, input.idempotencyKey);
  if (existing) {
    if (existing.playerId !== input.playerId) {
      throw new Error("IDEMPOTENCY_CONFLICT");
    }
    return evaluationForWorkout(prisma, input.playerId, existing.id, true);
  }

  return prisma.$transaction(async (tx) => {
    const player = await playerRepo.findPlayerById(tx, input.playerId);
    if (!player) throw new Error("PLAYER_NOT_FOUND");
    const before = toPlayerSnapshot(player);

    const catalog = await exerciseRepo.findExercisesByIds(
      tx,
      input.exercises.map((item) => item.exerciseId),
    );
    if (catalog.length !== input.exercises.length) {
      throw new Error("UNKNOWN_EXERCISE");
    }
    const byId = new Map(catalog.map((item) => [item.id, item]));

    const now = input.now ?? new Date();
    const xp = computeWorkoutXp({
      durationSec: input.durationSec,
      exercises: input.exercises.map((item) => ({
        sets: item.sets,
        reps: item.reps,
        difficulty: byId.get(item.exerciseId)?.difficulty ?? 1,
      })),
    });

    const workout = await workoutRepo.createCompletedWorkout(tx, {
      playerId: player.id,
      durationSec: input.durationSec,
      xpEarned: xp,
      idempotencyKey: input.idempotencyKey,
      completedAt: now,
      exercises: input.exercises.map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    });

    await xpEventRepo.insertXpEvent(tx, {
      playerId: player.id,
      amount: xp,
      source: "WORKOUT",
      sourceId: workout.id,
      idempotencyKey: `xp:${input.idempotencyKey}`,
    });

    const streak = nextStreak({
      lastActivityDate: player.lastActivityDate,
      timezone: player.timezone,
      currentStreak: player.streak,
      now,
    });

    const currentAttrs: AttributeSnapshot = {
      strength: player.strength,
      endurance: player.endurance,
      agility: player.agility,
      vitality: player.vitality,
      discipline: player.discipline,
    };
    const nextAttrs = applyAttributeDeltas(
      currentAttrs,
      attributeDeltas(catalog.map((item) => item.movementType)),
    );

    const questEval = await applyWorkoutToQuests(tx, {
      player,
      workoutId: workout.id,
      durationSec: input.durationSec,
      exercises: input.exercises.map((item) => ({
        slug: byId.get(item.exerciseId)?.slug ?? "",
        sets: item.sets,
        reps: item.reps,
        durationSec: item.durationSec,
      })),
      now,
    });

    let totalXp = await xpEventRepo.sumXp(tx, player.id);
    let nextLevel = levelFromTotalXp(totalXp);
    let nextRank = rankFromLevel(nextLevel) as RankKey;

    const performance = input.exercises.map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets,
      reps: item.reps,
      weight: item.weight,
    }));

    const achievementUnlocks: AchievementUnlockDto[] = [];
    let achievementXp = 0;
    for (let pass = 0; pass < 4; pass += 1) {
      const batch = await applyWorkoutToAchievements(tx, {
        playerId: player.id,
        now,
        workoutId: workout.id,
        level: nextLevel,
        rank: nextRank,
        streak: streak.streak,
        exercises: performance,
      });
      if (batch.unlocks.length === 0) break;
      achievementUnlocks.push(...batch.unlocks);
      achievementXp += batch.achievementXp;
      totalXp = await xpEventRepo.sumXp(tx, player.id);
      const raisedLevel = levelFromTotalXp(totalXp);
      const raisedRank = rankFromLevel(raisedLevel) as RankKey;
      if (raisedLevel === nextLevel && raisedRank === nextRank) break;
      nextLevel = raisedLevel;
      nextRank = raisedRank;
    }

    totalXp = await xpEventRepo.sumXp(tx, player.id);
    nextLevel = levelFromTotalXp(totalXp);
    nextRank = rankFromLevel(nextLevel) as RankKey;

    const leveledUp = nextLevel > player.level;
    const rankUp = nextRank !== player.rank;

    await playerRepo.savePlayerSnapshot(tx, player.id, {
      xp: totalXp,
      level: nextLevel,
      rank: nextRank,
      streak: streak.streak,
      lastActivityDate: streak.activityDate,
      strength: nextAttrs.strength,
      endurance: nextAttrs.endurance,
      agility: nextAttrs.agility,
      vitality: nextAttrs.vitality,
      discipline: nextAttrs.discipline,
    });

    const updated = await playerRepo.findPlayerById(tx, player.id);
    if (!updated) throw new Error("PLAYER_NOT_FOUND");
    const after = toPlayerSnapshot(updated);

    const events: ProgressionEventDto[] = [
      {
        type: "WORKOUT_COMPLETED",
        payload: { workoutId: workout.id, xp },
      },
    ];
    for (const completion of questEval.completions) {
      events.push({
        type: "QUEST_COMPLETED",
        payload: {
          questId: completion.id,
          key: completion.key,
          title: completion.title,
          xp: completion.xp,
        },
      });
    }
    for (const unlock of achievementUnlocks) {
      events.push({
        type: "ACHIEVEMENT_UNLOCKED",
        payload: {
          achievementId: unlock.id,
          key: unlock.key,
          title: unlock.title,
          description: unlock.description,
          identity: unlock.identity,
          family: unlock.family,
          xp: unlock.xp,
        },
      });
    }
    if (leveledUp) {
      events.push({ type: "LEVEL_UP", payload: { from: player.level, to: nextLevel } });
    }
    if (rankUp) {
      events.push({ type: "RANK_UP", payload: { from: player.rank, to: nextRank } });
    }

    await eventRepo.insertProgressionEvent(tx, {
      playerId: player.id,
      type: "WORKOUT_COMPLETED",
      payload: {
        workoutId: workout.id,
        xp,
        questXp: questEval.questXp,
        questCompletions: questEval.completions,
        achievementXp,
        achievementUnlocks,
        before,
        after,
        events,
      } as Prisma.InputJsonValue,
    });
    for (const event of events) {
      if (
        event.type === "WORKOUT_COMPLETED" ||
        event.type === "QUEST_COMPLETED" ||
        event.type === "ACHIEVEMENT_UNLOCKED"
      ) {
        continue;
      }
      await eventRepo.insertProgressionEvent(tx, {
        playerId: player.id,
        type: event.type,
        payload: event.payload as Prisma.InputJsonValue,
      });
    }

    return toResult({
      workoutId: workout.id,
      replay: false,
      xp,
      questXp: questEval.questXp,
      questCompletions: questEval.completions,
      achievementXp,
      achievementUnlocks,
      before,
      after,
      events,
    });
  });
}
