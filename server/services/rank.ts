import { RANK_THRESHOLDS, type RankKey } from "@/lib/constants/ranks";

export function rankFromLevel(level: number): RankKey {
  let current: RankKey = "INITIATE";
  for (const row of RANK_THRESHOLDS) {
    if (level >= row.minLevel) current = row.key;
  }
  return current;
}

/** Next rank on the configured ladder, or null at Sovereign. Level-gate display only. */
export function nextRankThreshold(level: number): { key: RankKey; minLevel: number } | null {
  for (const row of RANK_THRESHOLDS) {
    if (level < row.minLevel) return row;
  }
  return null;
}
