import { z } from "zod";
import { RANK_KEYS, RANK_THRESHOLDS, type RankKey } from "@/lib/constants/ranks";
import {
  ACHIEVEMENT_CATALOG,
  type AchievementCatalogEntry,
  type AchievementPredicate,
  type AchievementStatus,
} from "@/lib/constants/achievements";

const achievementPredicateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("WORKOUT_COUNT"), min: z.number().int().positive() }),
  z.object({
    kind: z.literal("RANK_REACHED"),
    rank: z.enum(["INITIATE", "CIRCUIT", "VOLTAGE", "KEYSTONE", "MERIDIAN", "SOVEREIGN"]),
  }),
  z.object({ kind: z.literal("STREAK"), min: z.number().int().positive() }),
  z.object({ kind: z.literal("PERFORMANCE_PR") }),
]);

export type ExercisePerformance = {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
};

export type AchievementEvalContext = {
  workoutCount: number;
  level: number;
  rank: RankKey;
  streak: number;
  currentExercises: ExercisePerformance[];
  priorExercises: ExercisePerformance[];
};

export function parseAchievementPredicate(value: unknown): AchievementPredicate | null {
  const parsed = achievementPredicateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function catalogByKey(): Map<string, AchievementCatalogEntry> {
  return new Map(ACHIEVEMENT_CATALOG.map((entry) => [entry.key, entry]));
}

export function volumeOf(row: ExercisePerformance): number {
  return row.sets * row.reps;
}

function weightKey(weight: number): number {
  return Math.round(weight * 100);
}

/**
 * Conservative PR: more logged volume (sets × reps) on a known exercise,
 * or more reps at the same weight. First-ever logs are not PRs.
 */
export function isPerformancePr(
  current: ExercisePerformance[],
  prior: ExercisePerformance[],
): boolean {
  if (current.length === 0 || prior.length === 0) return false;
  const priorByExercise = new Map<string, ExercisePerformance[]>();
  for (const row of prior) {
    const list = priorByExercise.get(row.exerciseId) ?? [];
    list.push(row);
    priorByExercise.set(row.exerciseId, list);
  }
  for (const row of current) {
    const history = priorByExercise.get(row.exerciseId);
    if (!history || history.length === 0) continue;
    const bestVolume = Math.max(...history.map(volumeOf));
    if (volumeOf(row) > bestVolume) return true;
    const sameWeight = history.filter((item) => weightKey(item.weight) === weightKey(row.weight));
    if (sameWeight.length === 0) continue;
    const bestReps = Math.max(...sameWeight.map((item) => item.reps));
    if (row.reps > bestReps) return true;
  }
  return false;
}

function rankIndex(rank: string): number {
  const index = RANK_KEYS.indexOf(rank as RankKey);
  return index < 0 ? -1 : index;
}

function rankMinLevel(rank: RankKey): number {
  return RANK_THRESHOLDS.find((row) => row.key === rank)?.minLevel ?? 1;
}

export function evaluatePredicate(
  predicate: unknown,
  ctx: AchievementEvalContext,
): { qualifies: boolean; progress: number; target: number } | null {
  const parsed = parseAchievementPredicate(predicate);
  if (!parsed) return null;

  switch (parsed.kind) {
    case "WORKOUT_COUNT":
      return {
        qualifies: ctx.workoutCount >= parsed.min,
        progress: Math.min(ctx.workoutCount, parsed.min),
        target: parsed.min,
      };
    case "RANK_REACHED": {
      // Qualifies from accepted player.rank, not rankFromLevel().
      const target = rankMinLevel(parsed.rank);
      return {
        qualifies: rankIndex(ctx.rank) >= rankIndex(parsed.rank),
        progress: Math.min(ctx.level, target),
        target,
      };
    }
    case "STREAK":
      return {
        qualifies: ctx.streak >= parsed.min,
        progress: Math.min(ctx.streak, parsed.min),
        target: parsed.min,
      };
    case "PERFORMANCE_PR": {
      const qualifies = isPerformancePr(ctx.currentExercises, ctx.priorExercises);
      return {
        qualifies,
        progress: qualifies ? 1 : 0,
        target: 1,
      };
    }
    default: {
      const _never: never = parsed;
      void _never;
      return null;
    }
  }
}

export function nextAchievementStatus(input: {
  predicate: unknown;
  currentStatus: AchievementStatus | string;
  qualifies: boolean;
  progress: number;
  hasPriorPerformance: boolean;
}): AchievementStatus {
  if (input.currentStatus === "UNLOCKED") return "UNLOCKED";
  const parsed = parseAchievementPredicate(input.predicate);
  if (!parsed) return "LOCKED";
  if (input.qualifies) return "UNLOCKED";
  if (parsed.kind === "PERFORMANCE_PR") {
    return input.hasPriorPerformance ? "IN_PROGRESS" : "LOCKED";
  }
  if (input.progress > 0) return "IN_PROGRESS";
  if (parsed.kind === "RANK_REACHED" || parsed.kind === "WORKOUT_COUNT" || parsed.kind === "STREAK") {
    return "IN_PROGRESS";
  }
  return "LOCKED";
}
