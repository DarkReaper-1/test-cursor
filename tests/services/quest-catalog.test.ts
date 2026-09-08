import { describe, expect, it } from "vitest";
import { QUEST_CATALOG } from "@/lib/constants/quests";
import { descriptionFor, scaleQuestTarget } from "@/server/services/quest-catalog";

const basePlayer = {
  level: 1,
  strength: 10,
  endurance: 10,
  agility: 10,
  vitality: 10,
  discipline: 10,
};

describe("quest catalog scaling", () => {
  it("keeps level-1 targets at catalog bases", () => {
    const squat = QUEST_CATALOG.find((entry) => entry.key === "foundation_squats")!;
    const push = QUEST_CATALOG.find((entry) => entry.key === "upper_pushups")!;
    const session = QUEST_CATALOG.find((entry) => entry.key === "daily_training")!;
    expect(scaleQuestTarget(squat, basePlayer)).toBe(3);
    expect(scaleQuestTarget(push, basePlayer)).toBe(30);
    expect(scaleQuestTarget(session, basePlayer)).toBe(1);
  });

  it("does not ratchet daily targets above the directive after a level-up", () => {
    const squat = QUEST_CATALOG.find((entry) => entry.key === "foundation_squats")!;
    const push = QUEST_CATALOG.find((entry) => entry.key === "upper_pushups")!;
    const high = { ...basePlayer, level: 12, strength: 22, endurance: 10 };
    expect(scaleQuestTarget(squat, high)).toBe(3);
    expect(scaleQuestTarget(push, high)).toBe(30);
  });

  it("never exceeds 2x base even at a high level", () => {
    const walk = QUEST_CATALOG.find((entry) => entry.key === "movement_week")!;
    const high = { ...basePlayer, level: 80, strength: 40, endurance: 40 };
    expect(scaleQuestTarget(walk, high)).toBe(180);
  });

  it("caps consistency below an unreasonable weekly load", () => {
    const iron = QUEST_CATALOG.find((entry) => entry.key === "iron_week")!;
    expect(scaleQuestTarget(iron, { ...basePlayer, level: 50 })).toBe(6);
  });

  it("snapshots descriptions from the generated target", () => {
    const squat = QUEST_CATALOG.find((entry) => entry.key === "foundation_squats")!;
    expect(descriptionFor(squat, 5)).toBe("Complete 5 sets of squats.");
  });
});
