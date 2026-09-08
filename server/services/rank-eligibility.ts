import { dateKeyInTimeZone } from "@/lib/format";
import {
  RANK_IDENTITY_LINE,
  RANK_PROMOTIONS,
  type RankKey,
  type RankPromotionDef,
} from "@/lib/constants/ranks";
import type { PromotionDto, PromotionRequirementDto } from "@/lib/types";

export type RankEligibilityInput = {
  rank: RankKey;
  level: number;
  workoutCount: number;
  streak: number;
  bestStreak: number;
  distinctTrainingDays: number;
  unlockedAchievementKeys: string[];
};

export function nextRankAfter(rank: RankKey): RankPromotionDef | null {
  return RANK_PROMOTIONS.find((row) => row.from === rank) ?? null;
}

export function countDistinctTrainingDays(completedAt: Date[], timeZone: string): number {
  const keys = new Set<string>();
  for (const at of completedAt) {
    keys.add(dateKeyInTimeZone(at, timeZone));
  }
  return keys.size;
}

export function evaluatePromotion(input: RankEligibilityInput): PromotionDto {
  const def = nextRankAfter(input.rank);
  if (!def) {
    return {
      available: false,
      from: input.rank,
      to: null,
      identity: null,
      requirements: [],
    };
  }

  const unlocked = new Set(input.unlockedAchievementKeys);
  const requirements: PromotionRequirementDto[] = [
    {
      key: "level",
      label: "LEVEL",
      current: input.level,
      target: def.minLevel,
      met: input.level >= def.minLevel,
    },
    {
      key: "workouts",
      label: "WORKOUTS",
      current: input.workoutCount,
      target: def.minWorkouts,
      met: input.workoutCount >= def.minWorkouts,
    },
  ];

  if (def.currentStreak != null) {
    requirements.push({
      key: "streak",
      label: "STREAK",
      current: input.streak,
      target: def.currentStreak,
      met: input.streak >= def.currentStreak,
    });
  }
  if (def.bestStreak != null) {
    requirements.push({
      key: "best_streak",
      label: "BEST STREAK",
      current: input.bestStreak,
      target: def.bestStreak,
      met: input.bestStreak >= def.bestStreak,
    });
  }
  if (def.distinctTrainingDays != null) {
    requirements.push({
      key: "days",
      label: "TRAINING DAYS",
      current: input.distinctTrainingDays,
      target: def.distinctTrainingDays,
      met: input.distinctTrainingDays >= def.distinctTrainingDays,
    });
  }
  for (const key of def.achievementKeys) {
    const met = unlocked.has(key);
    requirements.push({
      key: `achievement:${key}`,
      label: key.replaceAll("_", " ").toUpperCase(),
      current: met ? 1 : 0,
      target: 1,
      met,
    });
  }

  return {
    available: requirements.every((row) => row.met),
    from: def.from,
    to: def.to,
    identity: RANK_IDENTITY_LINE[def.to],
    requirements,
  };
}
