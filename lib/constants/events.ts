export const PROGRESSION_EVENT_TYPES = [
  "WORKOUT_COMPLETED",
  "QUEST_COMPLETED",
  "ACHIEVEMENT_UNLOCKED",
  "LEVEL_UP",
  "RANK_UP",
] as const;

export type ProgressionEventType = (typeof PROGRESSION_EVENT_TYPES)[number];

export const XP_SOURCES = ["WORKOUT", "QUEST", "ACHIEVEMENT"] as const;
export type XpSource = (typeof XP_SOURCES)[number];
