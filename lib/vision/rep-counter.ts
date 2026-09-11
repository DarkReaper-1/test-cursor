import type { CameraExerciseSlug } from "@/lib/constants/vision";
import { isCameraExercise } from "@/lib/constants/vision";
import { angleDeg, bodyInFrame, mean, POSE, type Landmark } from "./landmarks";

export type MovementPhase = "up" | "down";

export type RepCounterState = {
  phase: MovementPhase;
  reps: number;
  metric: number | null;
  inFrame: boolean;
  holdMs: number;
  lastTickMs: number | null;
};

export type RepGate = {
  down: number;
  up: number;
  invert?: boolean;
  hold?: boolean;
};

export const GATES: Record<CameraExerciseSlug, RepGate> = {
  squat: { down: 108, up: 158 },
  push_up: { down: 88, up: 148 },
  hinge: { down: 118, up: 162 },
  split_squat: { down: 112, up: 156 },
  hip_bridge: { down: 132, up: 168, invert: true },
  row: { down: 88, up: 148 },
  plank: { down: 150, up: 175, hold: true },
  walk: { down: 0.03, up: 0.012 },
};

export function emptyRepCounter(): RepCounterState {
  return { phase: "up", reps: 0, metric: null, inFrame: false, holdMs: 0, lastTickMs: null };
}

function hipLine(landmarks: Landmark[]): number | null {
  const ls = landmarks[POSE.LEFT_SHOULDER];
  const rs = landmarks[POSE.RIGHT_SHOULDER];
  const lh = landmarks[POSE.LEFT_HIP];
  const rh = landmarks[POSE.RIGHT_HIP];
  const la = landmarks[POSE.LEFT_ANKLE];
  const ra = landmarks[POSE.RIGHT_ANKLE];
  return mean([angleDeg(ls, lh, la), angleDeg(rs, rh, ra)]);
}

export function movementMetric(slug: string, landmarks: Landmark[]): number | null {
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

  if (slug === "push_up" || slug === "row") {
    return mean([angleDeg(ls, le, lw), angleDeg(rs, re, rw)]);
  }
  if (slug === "hinge" || slug === "hip_bridge") {
    return mean([angleDeg(ls, lh, lk), angleDeg(rs, rh, rk)]);
  }
  if (slug === "plank") {
    return hipLine(landmarks);
  }
  if (slug === "walk") {
    if (!lh || !rh) return null;
    return Math.abs(lh.y - rh.y);
  }
  return mean([angleDeg(lh, lk, la), angleDeg(rh, rk, ra)]);
}

export function gateFor(slug: string): RepGate {
  if (isCameraExercise(slug)) return GATES[slug];
  return GATES.squat;
}

export function tickRepCounter(
  state: RepCounterState,
  slug: string,
  landmarks: Landmark[],
  nowMs = 0,
): RepCounterState {
  const inFrame = bodyInFrame(landmarks);
  const metric = movementMetric(slug, landmarks);
  if (!inFrame || metric == null) {
    return { ...state, metric, inFrame: false, lastTickMs: nowMs || state.lastTickMs };
  }
  const gate = gateFor(slug);
  if (gate.hold) {
    const last = state.lastTickMs;
    let holdMs = state.holdMs;
    if (metric >= gate.down && last != null && nowMs > last) {
      holdMs += Math.min(250, nowMs - last);
    }
    return {
      phase: metric >= gate.down ? "down" : "up",
      reps: Math.min(50, Math.floor(holdMs / 1000)),
      metric,
      inFrame: true,
      holdMs,
      lastTickMs: nowMs || last,
    };
  }
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
  return { phase, reps, metric, inFrame: true, holdMs: state.holdMs, lastTickMs: nowMs || state.lastTickMs };
}
