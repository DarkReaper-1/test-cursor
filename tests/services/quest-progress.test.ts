import { describe, expect, it } from "vitest";
import {
  activityFromWorkout,
  applyDelta,
  deltaForQuest,
  shouldComplete,
} from "@/server/services/quest-progress";

const activity = activityFromWorkout({
  workoutId: "w1",
  durationSec: 1200,
  exercises: [
    { slug: "push_up", sets: 3, reps: 10, durationSec: 0 },
    { slug: "squat", sets: 3, reps: 8, durationSec: 0 },
    { slug: "walk", sets: 1, reps: 1, durationSec: 0 },
  ],
});

describe("quest progress", () => {
  it("advances REPS from matching workout sets", () => {
    expect(
      deltaForQuest({
        type: "REPS",
        predicate: { kind: "REPS", slugs: ["push_up"] },
        activity,
      }),
    ).toBe(30);
  });

  it("advances SETS from matching workout sets", () => {
    expect(
      deltaForQuest({
        type: "SETS",
        predicate: { kind: "SETS", slugs: ["squat"] },
        activity,
      }),
    ).toBe(3);
  });

  it("uses session duration when matching locomotion has no per-set duration", () => {
    expect(
      deltaForQuest({
        type: "DURATION",
        predicate: { kind: "DURATION", slugs: ["walk"], unit: "minutes" },
        activity,
      }),
    ).toBe(20);
  });

  it("counts a completed workout once for WORKOUT and CONSISTENCY", () => {
    expect(deltaForQuest({ type: "WORKOUT", predicate: { kind: "WORKOUT" }, activity })).toBe(1);
    expect(
      deltaForQuest({ type: "CONSISTENCY", predicate: { kind: "CONSISTENCY" }, activity }),
    ).toBe(1);
  });

  it("lets one workout feed multiple quest types", () => {
    const reps = deltaForQuest({
      type: "REPS",
      predicate: { kind: "REPS", slugs: ["push_up"] },
      activity,
    });
    const sets = deltaForQuest({
      type: "SETS",
      predicate: { kind: "SETS", slugs: ["squat"] },
      activity,
    });
    const sessions = deltaForQuest({
      type: "WORKOUT",
      predicate: { kind: "WORKOUT" },
      activity,
    });
    expect(reps).toBe(30);
    expect(sets).toBe(3);
    expect(sessions).toBe(1);
  });

  it("completes when progress reaches target", () => {
    expect(shouldComplete(applyDelta(0, 30, 30), 30)).toBe(true);
    expect(shouldComplete(applyDelta(12, 30, 10), 30)).toBe(false);
  });

  it("fails closed on unknown quest types and mismatched predicates", () => {
    expect(
      deltaForQuest({
        type: "REPS",
        predicate: { kind: "UNKNOWN", slugs: ["push_up"] },
        activity,
      }),
    ).toBe(0);
    expect(
      deltaForQuest({
        type: "REPS",
        predicate: { kind: "SETS", slugs: ["squat"] },
        activity,
      }),
    ).toBe(0);
    expect(
      deltaForQuest({
        type: "BOSS",
        predicate: { kind: "WORKOUT" },
        activity,
      }),
    ).toBe(0);
  });

  it("does not progress a slug the workout did not include", () => {
    expect(
      deltaForQuest({
        type: "REPS",
        predicate: { kind: "REPS", slugs: ["row"] },
        activity,
      }),
    ).toBe(0);
  });
});
