import { describe, expect, it } from "vitest";
import { isCameraExercise } from "@/lib/constants/vision";

describe("camera exercise gate", () => {
  it("requires SYSTEM to see every catalog movement", () => {
    expect(isCameraExercise("squat")).toBe(true);
    expect(isCameraExercise("walk")).toBe(true);
    expect(isCameraExercise("plank")).toBe(true);
    expect(isCameraExercise("row")).toBe(true);
  });
});
