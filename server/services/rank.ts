import { RANK_THRESHOLDS, type RankKey } from "@/lib/constants/ranks";

export function rankFromLevel(level: number): RankKey {
  let current: RankKey = "INITIATE";
  for (const row of RANK_THRESHOLDS) {
    if (level >= row.minLevel) current = row.key;
  }
  return current;
}
