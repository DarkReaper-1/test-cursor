import { describe, expect, it } from "vitest";
import { levelFromTotalXp } from "@/server/services/level";
import { cumulativeXpForLevel } from "@/lib/constants/xp";

describe("levelFromTotalXp", () => {
  it("starts at level 1 with zero XP", () => {
    expect(levelFromTotalXp(0)).toBe(1);
  });

  it("crosses a threshold only at the cumulative cost", () => {
    const need = cumulativeXpForLevel(2);
    expect(levelFromTotalXp(need - 1)).toBe(1);
    expect(levelFromTotalXp(need)).toBe(2);
  });
});
