import { describe, expect, it } from "vitest";
import { rankFromLevel, nextRankThreshold } from "@/server/services/rank";
import { RANK_THRESHOLDS } from "@/lib/constants/ranks";

describe("rankFromLevel", () => {
  it("uses the configured ladder only", () => {
    expect(rankFromLevel(1)).toBe("INITIATE");
    expect(rankFromLevel(5)).toBe("CIRCUIT");
    expect(rankFromLevel(10)).toBe("VOLTAGE");
    expect(rankFromLevel(20)).toBe("KEYSTONE");
    expect(rankFromLevel(35)).toBe("MERIDIAN");
    expect(rankFromLevel(50)).toBe("SOVEREIGN");
  });

  it("does not skip thresholds", () => {
    const keys = RANK_THRESHOLDS.map((row) => rankFromLevel(row.minLevel));
    expect(keys).toEqual(RANK_THRESHOLDS.map((row) => row.key));
  });

  it("points at the next configured rank without changing the ladder", () => {
    expect(nextRankThreshold(1)?.key).toBe("CIRCUIT");
    expect(nextRankThreshold(1)?.minLevel).toBe(5);
    expect(nextRankThreshold(4)?.key).toBe("CIRCUIT");
    expect(nextRankThreshold(5)?.key).toBe("VOLTAGE");
    expect(nextRankThreshold(50)).toBeNull();
  });
});
