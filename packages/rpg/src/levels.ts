import type { RankKey } from "@helix/shared";

/** XP required to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  if (level < 1) {
    throw new Error("level must be >= 1");
  }
  return 100 + (level - 1) * 40;
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let n = 1; n < level; n += 1) {
    total += xpToNextLevel(n);
  }
  return total;
}

export function levelFromTotalXp(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpToNext: number;
} {
  if (totalXp < 0) {
    throw new Error("totalXp must be >= 0");
  }
  let remaining = totalXp;
  let level = 1;
  while (remaining >= xpToNextLevel(level) && level < 100) {
    remaining -= xpToNextLevel(level);
    level += 1;
  }
  return {
    level,
    xpIntoLevel: remaining,
    xpToNext: xpToNextLevel(level),
  };
}

const RANK_BY_MIN_LEVEL: { key: RankKey; minLevel: number }[] = [
  { key: "apex", minLevel: 80 },
  { key: "lattice", minLevel: 55 },
  { key: "current", minLevel: 35 },
  { key: "forge", minLevel: 20 },
  { key: "ember", minLevel: 8 },
  { key: "spark", minLevel: 1 },
];

export function rankFromLevel(level: number): RankKey {
  const found = RANK_BY_MIN_LEVEL.find((row) => level >= row.minLevel);
  return found?.key ?? "spark";
}
