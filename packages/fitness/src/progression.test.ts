import { describe, expect, it } from "vitest";
import { nextPrescription } from "./progression";

describe("nextPrescription", () => {
  it("repeats load at full reps after 8, 8, 7", () => {
    const next = nextPrescription({
      targetReps: 8,
      sets: [
        { load: 135, reps: 8 },
        { load: 135, reps: 8 },
        { load: 135, reps: 7 },
      ],
    });
    expect(next).toEqual([
      { load: 135, reps: 8 },
      { load: 135, reps: 8 },
      { load: 135, reps: 8 },
    ]);
  });

  it("adds load after all sets hit", () => {
    const next = nextPrescription({
      targetReps: 8,
      sets: [
        { load: 135, reps: 8 },
        { load: 135, reps: 8 },
        { load: 135, reps: 8 },
      ],
    });
    expect(next).toEqual([
      { load: 140, reps: 8 },
      { load: 140, reps: 8 },
      { load: 140, reps: 8 },
    ]);
  });

  it("deload reps when multiple sets miss", () => {
    const next = nextPrescription({
      targetReps: 8,
      sets: [
        { load: 135, reps: 6 },
        { load: 135, reps: 5 },
        { load: 135, reps: 5 },
      ],
    });
    expect(next[0]).toEqual({ load: 135, reps: 7 });
  });
});
