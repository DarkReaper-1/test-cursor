import { describe, expect, it } from "vitest";
import { cameraDurationSec, cameraWorkoutBody, summarizeCameraSets } from "@/lib/vision/workout-payload";

describe("camera workout payload", () => {
  it("averages uneven sets into the existing workout contract", () => {
    expect(summarizeCameraSets([8, 10, 9])).toEqual({ sets: 3, reps: 9 });
  });

  it("drops empty sets and clamps to the server maxima", () => {
    expect(summarizeCameraSets([0, 60, 12])).toEqual({ sets: 2, reps: 31 });
  });

  it("never sends a duration under the API minimum", () => {
    expect(cameraDurationSec(0, 12_000)).toBe(60);
  });

  it("builds a CAMERA workout contract", () => {
    const body = cameraWorkoutBody({
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      durationSec: 60,
      exercises: [{ exerciseId: "22222222-2222-4222-8222-222222222222", sets: 3, reps: 10 }],
    });
    expect(body.exercises[0]?.weight).toBe(0);
    expect(body.exercises[0]?.sets).toBe(3);
    expect(body.source).toBe("CAMERA");
  });
});
