import type { CameraExerciseSlug } from "@/lib/constants/vision";
import { angleDeg, bodyInFrame, mean, POSE, type Landmark } from "./landmarks";

export type MovementPhase = "up" | "down";

export type RepCounterState = {
  phase: MovementPhase;
  reps: number;
  metric: number | null;
  inFrame: boolean;
};

export type RepGate = {
  /** Metric at the bottom / contracted position. */
  down: number;
  /** Metric at the standing / extended position. */
  up: number;
  /** When true, a rep completes on the way down (hip bridge). */
  invert?: boolean;
};

export const GATES: Record<CameraExerciseSlug, RepGate> = {
  squat: { down: 108, up: 158 },
  push_up: { down: 88, up: 148 },
  hinge: { down: 118, up: 162 },
  split_squat: { down: 112, up: 156 },
  hip_bridge: { down: 132, up: 168, invert: true },
};

export function emptyRepCounter(): RepCounterState {
  return { phase: "up", reps: 0, metric: null, inFrame: false };
}

export function movementMetric(slug: CameraExerciseSlug, landmarks: Landmark[]): number | null {
  if (!bodyInFrame(landmarks)) return null;
  const ls = landmarks[POSE.LEFT_SHOULDER];
  const rs = landmarks[POSE.RIGHT_SHOULDER];
  const le = landmarks[POSE.LEFT_ELBOW];
  const re = landmarks[POSE.RIGHT_ELBOW];
  const lw = landmarks[POSE.LEFT_WRIST];
  const rw = landmarks[POSE.RIGHT_WRIST];
  const lh = landmarks[POSE.LEFT_HIP];
  const rh = landmarks[POSE.RIGHT_HIP];
  const lk = landmarks[POSE.LEFT_KNEE];
  const rk = landmarks[POSE.RIGHT_KNEE];
  const la = landmarks[POSE.LEFT_ANKLE];
  const ra = landmarks[POSE.RIGHT_ANKLE];

  if (slug === "push_up") {
    return mean([angleDeg(ls, le, lw), angleDeg(rs, re, rw)]);
  }
  if (slug === "hinge") {
    return mean([angleDeg(ls, lh, lk), angleDeg(rs, rh, rk)]);
  }
  if (slug === "hip_bridge") {
    return mean([angleDeg(ls, lh, lk), angleDeg(rs, rh, rk)]);
  }
  return mean([angleDeg(lh, lk, la), angleDeg(rh, rk, ra)]);
}

export function tickRepCounter(
  state: RepCounterState,
  slug: CameraExerciseSlug,
  landmarks: Landmark[],
): RepCounterState {
  const inFrame = bodyInFrame(landmarks);
  const metric = movementMetric(slug, landmarks);
  if (!inFrame || metric == null) {
    return { ...state, metric, inFrame: false };
  }
  const gate = GATES[slug];
  let { phase, reps } = state;
  if (!gate.invert) {
    if (phase === "up" && metric <= gate.down) phase = "down";
    else if (phase === "down" && metric >= gate.up) {
      phase = "up";
      reps += 1;
    }
  } else {
    if (phase === "up" && metric >= gate.up) phase = "down";
    else if (phase === "down" && metric <= gate.down) {
      phase = "up";
      reps += 1;
    }
  }
  return { phase, reps, metric, inFrame: true };
}
