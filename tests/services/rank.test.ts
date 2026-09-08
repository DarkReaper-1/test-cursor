import { describe, expect, it } from "vitest";
import { rankFromLevel } from "@/server/services/rank";
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
});
