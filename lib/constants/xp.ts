/** XP required to leave a given level (to reach level + 1). */
export function xpToClearLevel(level: number): number {
  if (level < 1) return 80;
  return 80 + level * 20;
}

/** Cumulative XP required to stand on `level` (level 1 = 0). */
export function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let current = 1; current < level; current += 1) {
    total += xpToClearLevel(current);
  }
  return total;
}

export const MAX_WORKOUT_XP = 180;
export const MIN_WORKOUT_XP = 20;
export const BASE_WORKOUT_XP = 40;
