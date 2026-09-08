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
import { rankFromLevel } from "./rank";
import { nextStreak } from "./streak";
import { applyAttributeDeltas, attributeDeltas, type AttributeSnapshot } from "./attributes";
import { onAchievementHook, onQuestHook } from "./hooks";
import { toPlayerSnapshot } from "@/lib/format";
import type { ProgressionEventDto, WorkoutResult } from "@/lib/types";
import type { ATTRIBUTE_KEYS } from "@/lib/constants/attributes";

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

async function snapshotResult(db: Db, playerId: string, extra: Partial<WorkoutResult>): Promise<WorkoutResult> {
  const player = await playerRepo.findPlayerById(db, playerId);
  if (!player) {
    throw new Error("PLAYER_NOT_FOUND");
  }
  return {
    replay: extra.replay ?? false,
    xp: extra.xp ?? 0,
    leveledUp: extra.leveledUp ?? false,
    rankUp: extra.rankUp ?? false,
    player: toPlayerSnapshot(player),
    events: extra.events ?? [],
  };
}

export async function completeWorkout(input: CompleteWorkoutInput): Promise<WorkoutResult> {
  const existing = await workoutRepo.findWorkoutByIdempotency(prisma, input.idempotencyKey);
  if (existing) {
    if (existing.playerId !== input.playerId) {
      throw new Error("IDEMPOTENCY_CONFLICT");
    }
    return snapshotResult(prisma, input.playerId, {
      replay: true,
      xp: existing.xpEarned,
    });
  }

  return prisma.$transaction(async (tx) => {
    const player = await playerRepo.findPlayerById(tx, input.playerId);
    if (!player) throw new Error("PLAYER_NOT_FOUND");

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

    const totalXp = await xpEventRepo.sumXp(tx, player.id);
    const nextLevel = levelFromTotalXp(totalXp);
    const nextRank = rankFromLevel(nextLevel);
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

    const events: ProgressionEventDto[] = [
      {
        type: "WORKOUT_COMPLETED",
        payload: { workoutId: workout.id, xp },
      },
    ];
    if (leveledUp) {
      events.push({ type: "LEVEL_UP", payload: { from: player.level, to: nextLevel } });
    }
    if (rankUp) {
      events.push({ type: "RANK_UP", payload: { from: player.rank, to: nextRank } });
    }

    for (const event of events) {
      await eventRepo.insertProgressionEvent(tx, {
        playerId: player.id,
        type: event.type,
        payload: event.payload as Prisma.InputJsonValue,
      });
    }

    await onQuestHook({ playerId: player.id, eventType: "WORKOUT_COMPLETED" });
    await onAchievementHook({ playerId: player.id, eventType: "WORKOUT_COMPLETED" });

    const updated = await playerRepo.findPlayerById(tx, player.id);
    if (!updated) throw new Error("PLAYER_NOT_FOUND");

    return {
      replay: false,
      xp,
      leveledUp,
      rankUp,
      player: toPlayerSnapshot(updated),
      events,
    };
  });
}
