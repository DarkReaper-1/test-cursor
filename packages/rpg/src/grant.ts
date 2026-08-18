import { applyMomentumDelta, MOMENTUM_DELTA } from "./momentum";
import { levelFromTotalXp, rankFromLevel } from "./levels";
import type { RewardResult } from "./rewards";

export interface CharacterState {
  totalXp: number;
  momentum: number;
  scores: Record<string, number>;
}

export interface GrantedCharacter extends CharacterState {
  level: number;
  rankKey: ReturnType<typeof rankFromLevel>;
  xpIntoLevel: number;
  xpToNext: number;
  leveledUp: boolean;
}

export function applyGrant(
  current: CharacterState,
  reward: RewardResult,
  momentumDelta: number,
): GrantedCharacter {
  const previousLevel = levelFromTotalXp(current.totalXp).level;
  const scores = { ...current.scores };
  if (reward.xp > 0) {
    for (const [key, delta] of Object.entries(reward.attributeDeltas)) {
      scores[key] = (scores[key] ?? 10) + delta;
    }
  }
  const totalXp = current.totalXp + reward.xp;
  const progress = levelFromTotalXp(totalXp);
  return {
    totalXp,
    scores,
    momentum: applyMomentumDelta(current.momentum, momentumDelta),
    level: progress.level,
    rankKey: rankFromLevel(progress.level),
    xpIntoLevel: progress.xpIntoLevel,
    xpToNext: progress.xpToNext,
    leveledUp: progress.level > previousLevel,
  };
}

export function momentumForCompletion(category: "main" | "recovery"): number {
  return category === "recovery"
    ? MOMENTUM_DELTA.recoveryQuest
    : MOMENTUM_DELTA.completedMain + MOMENTUM_DELTA.allDailyPriorities;
}
