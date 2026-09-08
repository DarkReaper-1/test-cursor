export const ATTRIBUTE_KEYS = [
  "strength",
  "endurance",
  "agility",
  "vitality",
  "discipline",
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export const BASELINE_ATTRIBUTE = 10;
export const MAX_ATTRIBUTE_GAIN_PER_WORKOUT = 2;
