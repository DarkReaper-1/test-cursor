import {
  ATTRIBUTE_KEYS,
  MAX_ATTRIBUTE_GAIN_PER_WORKOUT,
  type AttributeKey,
} from "@/lib/constants/attributes";

const MOVEMENT_TO_ATTRIBUTE: Record<string, AttributeKey> = {
  squat: "strength",
  hinge: "strength",
  push: "strength",
  pull: "strength",
  carry: "endurance",
  locomotion: "agility",
  core: "vitality",
};

export type AttributeSnapshot = Record<AttributeKey, number>;

export function attributeDeltas(movementTypes: string[]): Partial<Record<AttributeKey, number>> {
  const deltas: Partial<Record<AttributeKey, number>> = { vitality: 1, discipline: 1 };
  for (const movement of movementTypes) {
    const key = MOVEMENT_TO_ATTRIBUTE[movement];
    if (!key) continue;
    deltas[key] = Math.min(MAX_ATTRIBUTE_GAIN_PER_WORKOUT, (deltas[key] ?? 0) + 1);
  }
  return deltas;
}

export function applyAttributeDeltas(
  current: AttributeSnapshot,
  deltas: Partial<Record<AttributeKey, number>>,
): AttributeSnapshot {
  const next = { ...current };
  for (const key of ATTRIBUTE_KEYS) {
    next[key] = current[key] + (deltas[key] ?? 0);
  }
  return next;
}
