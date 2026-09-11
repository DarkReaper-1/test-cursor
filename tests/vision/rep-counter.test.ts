import { describe, expect, it } from "vitest";
import { emptyRepCounter, movementMetric, tickRepCounter } from "@/lib/vision/rep-counter";
import type { Landmark } from "@/lib/vision/landmarks";
import { POSE } from "@/lib/vision/landmarks";

function point(x: number, y: number): Landmark {
  return { x, y, visibility: 1 };
}

function sideFigure(kneeAngleDeg: number): Landmark[] {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => point(0, 0));
  const knee = { x: 0.5, y: 0.52 };
  const hip = { x: 0.5, y: 0.3 };
  const rad = ((180 - kneeAngleDeg) * Math.PI) / 180;
  const shin = 0.24;
  const ankle = { x: knee.x + Math.sin(rad) * shin, y: knee.y + Math.cos(rad) * shin };
  const shoulder = { x: 0.5, y: 0.12 };
  const elbow = { x: 0.58, y: 0.22 };
  const wrist = { x: 0.62, y: 0.32 };
  const place = (left: number, right: number, value: { x: number; y: number }) => {
    landmarks[left] = point(value.x - 0.04, value.y);
    landmarks[right] = point(value.x + 0.04, value.y);
  };
  place(POSE.LEFT_HIP, POSE.RIGHT_HIP, hip);
  place(POSE.LEFT_KNEE, POSE.RIGHT_KNEE, knee);
  place(POSE.LEFT_ANKLE, POSE.RIGHT_ANKLE, ankle);
  place(POSE.LEFT_SHOULDER, POSE.RIGHT_SHOULDER, shoulder);
  place(POSE.LEFT_ELBOW, POSE.RIGHT_ELBOW, elbow);
  place(POSE.LEFT_WRIST, POSE.RIGHT_WRIST, wrist);
  return landmarks;
}

describe("tickRepCounter", () => {
  it("reads a standing knee as open and a squat as closed", () => {
    const stand = movementMetric("squat", sideFigure(170));
    const bottom = movementMetric("squat", sideFigure(90));
    expect(stand).toBeGreaterThan(155);
    expect(bottom).toBeLessThan(110);
  });

  it("counts a squat when the knees close then open", () => {
    let state = emptyRepCounter();
    state = tickRepCounter(state, "squat", sideFigure(170));
    state = tickRepCounter(state, "squat", sideFigure(90));
    expect(state.phase).toBe("down");
    expect(state.reps).toBe(0);
    state = tickRepCounter(state, "squat", sideFigure(168));
    expect(state.phase).toBe("up");
    expect(state.reps).toBe(1);
  });

  it("does not count while the body is out of frame", () => {
    const blank: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
    let state = emptyRepCounter();
    state = tickRepCounter(state, "squat", sideFigure(170));
    state = tickRepCounter(state, "squat", blank);
    expect(state.inFrame).toBe(false);
    state = tickRepCounter(state, "squat", sideFigure(170));
    expect(state.reps).toBe(0);
  });

  it("needs hysteresis so standing jitter is not a rep", () => {
    let state = emptyRepCounter();
    state = tickRepCounter(state, "squat", sideFigure(170));
    state = tickRepCounter(state, "squat", sideFigure(150));
    state = tickRepCounter(state, "squat", sideFigure(170));
    expect(state.reps).toBe(0);
  });

  it("counts plank hold time as reps", () => {
    const plank = sideFigure(170);
    let state = emptyRepCounter();
    for (let t = 0; t <= 4000; t += 100) {
      state = tickRepCounter(state, "plank", plank, t);
    }
    expect(state.reps).toBeGreaterThanOrEqual(3);
  });
});
