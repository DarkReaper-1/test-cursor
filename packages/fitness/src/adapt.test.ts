import { describe, expect, it } from "vitest";
import { adaptExercise, adaptPlan } from "./adapt";

describe("adaptExercise", () => {
  it("turns 135 x 8,8,7 into 135 x 8,8,8", () => {
    const next = adaptExercise(
      { key: "press", name: "Press", targetSets: 3, targetReps: 8, load: 135 },
      [
        { load: 135, reps: 8 },
        { load: 135, reps: 8 },
        { load: 135, reps: 7 },
      ],
    );
    expect(next.load).toBe(135);
    expect(next.targetReps).toBe(8);
  });

  it("adds load after all weighted sets hit", () => {
    const next = adaptExercise(
      { key: "press", name: "Press", targetSets: 3, targetReps: 8, load: 135 },
      [
        { load: 135, reps: 8 },
        { load: 135, reps: 8 },
        { load: 135, reps: 8 },
      ],
    );
    expect(next.load).toBe(140);
    expect(next.targetReps).toBe(8);
  });

  it("progresses bodyweight by reps, not fake load", () => {
    const next = adaptExercise(
      { key: "push_up", name: "Push-up", targetSets: 3, targetReps: 10, load: 0 },
      [
        { load: 0, reps: 10 },
        { load: 0, reps: 10 },
        { load: 0, reps: 10 },
      ],
    );
    expect(next.load).toBe(0);
    expect(next.targetReps).toBe(11);
  });
});

describe("adaptPlan", () => {
  it("leaves unmatched exercises unchanged", () => {
    const result = adaptPlan(
      [{ key: "row", name: "Row", targetSets: 3, targetReps: 8, load: 25 }],
      {},
    );
    expect(result.adaptedFromHistory).toBe(false);
    expect(result.exercises[0]?.load).toBe(25);
  });
});
