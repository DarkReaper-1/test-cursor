export const MOMENTUM_MIN = 0;
export const MOMENTUM_MAX = 100;
export const MOMENTUM_START = 50;

export const MOMENTUM_DELTA = {
  missedPriority: -8,
  recoveryQuest: 5,
  allDailyPriorities: 3,
  completedMain: 2,
} as const;

export function clampMomentum(value: number): number {
  return Math.min(MOMENTUM_MAX, Math.max(MOMENTUM_MIN, Math.round(value)));
}

export function applyMomentumDelta(current: number, delta: number): number {
  return clampMomentum(current + delta);
}
