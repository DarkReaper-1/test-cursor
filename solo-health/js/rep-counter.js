import { angle, dist, mid, visible } from "./pose-math.js";

/**
 * Phase-based counters for camera-verified exercises.
 * Research basis: joint-angle up↔down state machines (MediaPipe / MoveNet fitness apps).
 */
export function createRepCounter(kind) {
  switch (kind) {
    case "pushup":
      return makeAngleRep({
        sample: (k) => avgAngles(k, [
          ["left_shoulder", "left_elbow", "left_wrist"],
          ["right_shoulder", "right_elbow", "right_wrist"],
        ]),
        downBelow: 95,
        upAbove: 150,
        cueDown: "Lower your chest — elbows bend",
        cueUp: "Press up to lockout",
      });
    case "squat":
      return makeAngleRep({
        sample: (k) => avgAngles(k, [
          ["left_hip", "left_knee", "left_ankle"],
          ["right_hip", "right_knee", "right_ankle"],
        ]),
        downBelow: 110,
        upAbove: 155,
        cueDown: "Sit hips back — deepen the squat",
        cueUp: "Drive up to stand tall",
      });
    case "situp":
      return makeAngleRep({
        sample: (k) => {
          const hip = mid(k.left_hip, k.right_hip);
          const shoulder = mid(k.left_shoulder, k.right_shoulder);
          const knee = mid(k.left_knee, k.right_knee);
          return angle(shoulder, hip, knee);
        },
        downBelow: 75,
        upAbove: 125,
        cueDown: "Curl shoulders toward knees",
        cueUp: "Control back down",
      });
    case "run":
      return makeStepCounter();
    case "hydrate":
      return makeDrinkCounter();
    case "mind":
      return makeStillnessCounter();
    default:
      return makeAngleRep({
        sample: () => null,
        downBelow: 90,
        upAbove: 150,
      });
  }
}

function avgAngles(k, triples) {
  const vals = [];
  for (const [a, b, c] of triples) {
    if (visible(k[a]) && visible(k[b]) && visible(k[c])) {
      const v = angle(k[a], k[b], k[c]);
      if (v != null) vals.push(v);
    }
  }
  if (!vals.length) return null;
  return vals.reduce((s, n) => s + n, 0) / vals.length;
}

function makeAngleRep({ sample, downBelow, upAbove, invert = false, cueDown, cueUp }) {
  let phase = "up";
  let reps = 0;
  let lastAngle = null;
  let cool = 0;

  return {
    kind: "rep",
    reset() {
      phase = "up";
      reps = 0;
      lastAngle = null;
      cool = 0;
    },
    getReps: () => reps,
    update(keymap, dt = 16) {
      cool = Math.max(0, cool - dt);
      const a = sample(keymap);
      lastAngle = a;
      if (a == null) {
        return { reps, angle: null, phase, cue: "Step into frame — full body visible", gained: 0 };
      }

      let gained = 0;
      if (!invert) {
        if (phase === "up" && a < downBelow) {
          phase = "down";
        } else if (phase === "down" && a > upAbove && cool <= 0) {
          phase = "up";
          reps += 1;
          gained = 1;
          cool = 280;
        }
      } else {
        // sit-up style: rising torso increases shoulder-hip-knee "openness" depending on camera;
        // use: start open (lying), curl closed, return open = 1 rep
        if (phase === "up" && a < downBelow) {
          phase = "down";
        } else if (phase === "down" && a > upAbove && cool <= 0) {
          phase = "up";
          reps += 1;
          gained = 1;
          cool = 320;
        }
      }

      const cue = phase === "up" ? cueDown : cueUp;
      return { reps, angle: a, phase, cue, gained };
    },
  };
}

function makeStepCounter() {
  let reps = 0; // steps
  let lastSide = null;
  let cool = 0;
  let prevL = null;
  let prevR = null;

  return {
    kind: "steps",
    reset() {
      reps = 0;
      lastSide = null;
      cool = 0;
      prevL = null;
      prevR = null;
    },
    getReps: () => reps,
    /** ~1400 steps ≈ 1 km jogging-in-place estimate */
    stepsToKm: (steps) => Math.round((steps / 1400) * 100) / 100,
    update(keymap, dt = 16) {
      cool = Math.max(0, cool - dt);
      const lk = keymap.left_knee;
      const rk = keymap.right_knee;
      const lh = keymap.left_hip;
      const rh = keymap.right_hip;
      if (!visible(lk) || !visible(rk) || !visible(lh) || !visible(rh)) {
        return { reps, angle: null, phase: "idle", cue: "Jog in place — knees visible", gained: 0, km: 0 };
      }

      const lLift = (lh.y - lk.y) / Math.max(40, Math.abs(lh.y - (keymap.left_ankle?.y ?? lk.y + 80)));
      const rLift = (rh.y - rk.y) / Math.max(40, Math.abs(rh.y - (keymap.right_ankle?.y ?? rk.y + 80)));

      let gained = 0;
      if (cool <= 0) {
        if (lLift > 0.18 && lastSide !== "L" && (prevL == null || lLift > prevL)) {
          lastSide = "L";
          reps += 1;
          gained = 1;
          cool = 180;
        } else if (rLift > 0.18 && lastSide !== "R" && (prevR == null || rLift > prevR)) {
          lastSide = "R";
          reps += 1;
          gained = 1;
          cool = 180;
        }
      }
      prevL = lLift;
      prevR = rLift;
      const km = Math.round((reps / 1400) * 100) / 100;
      return {
        reps,
        angle: Math.round(((lLift + rLift) / 2) * 100),
        phase: lastSide || "idle",
        cue: "Keep jogging — high knees",
        gained,
        km,
      };
    },
  };
}

function makeDrinkCounter() {
  let glasses = 0;
  let holding = 0;
  let cool = 0;

  return {
    kind: "glasses",
    reset() {
      glasses = 0;
      holding = 0;
      cool = 0;
    },
    getReps: () => glasses,
    update(keymap, dt = 16) {
      cool = Math.max(0, cool - dt);
      const nose = keymap.nose;
      const lw = keymap.left_wrist;
      const rw = keymap.right_wrist;
      if (!visible(nose)) {
        return { reps: glasses, cue: "Face the scanner to log hydration", gained: 0, hold: 0 };
      }
      const near =
        (visible(lw) && dist(lw, nose) < 55) ||
        (visible(rw) && dist(rw, nose) < 55);

      let gained = 0;
      if (near && cool <= 0) {
        holding += dt;
        if (holding >= 1400) {
          glasses += 1;
          gained = 1;
          holding = 0;
          cool = 1200;
        }
      } else if (!near) {
        holding = Math.max(0, holding - dt * 0.6);
      }

      return {
        reps: glasses,
        cue: near ? "Hold drink pose…" : "Raise wrist to mouth like drinking",
        gained,
        hold: Math.min(1, holding / 1400),
        angle: null,
        phase: near ? "sip" : "idle",
      };
    },
  };
}

function makeStillnessCounter() {
  let ms = 0;
  let samples = [];

  return {
    kind: "minutes",
    reset() {
      ms = 0;
      samples = [];
    },
    getReps: () => Math.floor(ms / 60000),
    getMinutes: () => Math.round((ms / 60000) * 10) / 10,
    update(keymap, dt = 16) {
      const shoulder = mid(keymap.left_shoulder, keymap.right_shoulder);
      const hip = mid(keymap.left_hip, keymap.right_hip);
      if (!shoulder || !hip) {
        return { reps: Math.floor(ms / 60000), minutes: ms / 60000, cue: "Sit in frame and hold still", gained: 0 };
      }
      samples.push({ x: shoulder.x, y: shoulder.y });
      if (samples.length > 18) samples.shift();
      let motion = 0;
      for (let i = 1; i < samples.length; i++) {
        motion += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
      }
      const still = samples.length >= 8 && motion / samples.length < 1.8;
      let gainedMin = 0;
      const before = Math.floor(ms / 60000);
      if (still) {
        ms += dt;
      }
      const after = Math.floor(ms / 60000);
      if (after > before) gainedMin = after - before;

      return {
        reps: after,
        minutes: Math.round((ms / 60000) * 10) / 10,
        cue: still ? "Focus lock engaged — hold" : "Reduce movement to train focus",
        gained: gainedMin,
        hold: still ? 1 : 0,
        phase: still ? "focus" : "idle",
        angle: motion,
      };
    },
  };
}

export function questKind(questId) {
  const id = String(questId).replace(/^p-/, "");
  if (id.includes("push")) return "pushup";
  if (id.includes("sit")) return "situp";
  if (id.includes("squat")) return "squat";
  if (id.includes("run")) return "run";
  if (id.includes("hydrate")) return "hydrate";
  if (id.includes("mind")) return "mind";
  return "pushup";
}
