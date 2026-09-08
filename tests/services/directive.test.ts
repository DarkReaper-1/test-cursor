import { describe, expect, it } from "vitest";
import { assembleDirective } from "@/server/services/directive";

describe("assembleDirective", () => {
  it("picks catalog exercises for a local date", () => {
    const directive = assembleDirective({
      timezone: "UTC",
      now: new Date("2026-09-08T12:00:00Z"),
      exercises: [
        {
          id: "1",
          slug: "push_up",
          name: "Push-up",
          description: "",
          movementType: "push",
          difficulty: 2,
        },
        {
          id: "2",
          slug: "squat",
          name: "Squat",
          description: "",
          movementType: "squat",
          difficulty: 2,
        },
        {
          id: "3",
          slug: "hinge",
          name: "Hip hinge",
          description: "",
          movementType: "hinge",
          difficulty: 2,
        },
      ],
    });
    expect(directive.exercises.length).toBeGreaterThan(0);
    expect(directive.title.length).toBeGreaterThan(0);
  });
});
