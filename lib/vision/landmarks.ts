export type Landmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export const POSE = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export function visible(point: Landmark | undefined, min = 0.45): boolean {
  if (!point) return false;
  if (point.visibility == null) return true;
  return point.visibility >= min;
}

export function angleDeg(
  a: Landmark | undefined,
  b: Landmark | undefined,
  c: Landmark | undefined,
): number | null {
  if (!a || !b || !c) return null;
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const denom = Math.hypot(bax, bay) * Math.hypot(bcx, bcy);
  if (denom < 1e-6) return null;
  const cos = Math.min(1, Math.max(-1, (bax * bcx + bay * bcy) / denom));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function mean(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

export function bodyInFrame(landmarks: Landmark[]): boolean {
  const leftHip = landmarks[POSE.LEFT_HIP];
  const rightHip = landmarks[POSE.RIGHT_HIP];
  const leftShoulder = landmarks[POSE.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE.RIGHT_SHOULDER];
  const hips = visible(leftHip) || visible(rightHip);
  const shoulders = visible(leftShoulder) || visible(rightShoulder);
  return hips && shoulders;
}
