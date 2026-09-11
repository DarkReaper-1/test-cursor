import { describe, expect, it } from "vitest";
import { isCameraExercise } from "@/lib/constants/vision";

describe("camera exercise gate", () => {
  it("allows guided counting only for V1 movements", () => {
    expect(isCameraExercise("squat")).toBe(true);
    expect(isCameraExercise("walk")).toBe(false);
    expect(isCameraExercise("plank")).toBe(false);
  });
});
