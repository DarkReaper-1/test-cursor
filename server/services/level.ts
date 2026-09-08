import { cumulativeXpForLevel, xpToClearLevel } from "@/lib/constants/xp";

export function levelFromTotalXp(totalXp: number): number {
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= totalXp) {
    level += 1;
    if (level > 200) break;
  }
  return level;
}

export function xpProgress(totalXp: number, level: number): { into: number; toNext: number } {
  const floor = cumulativeXpForLevel(level);
  return { into: Math.max(0, totalXp - floor), toNext: xpToClearLevel(level) };
}
