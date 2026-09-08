export const QUEST_TIERS = ["DAILY", "WEEKLY"] as const;
export type QuestTier = (typeof QUEST_TIERS)[number];

export const QUEST_TYPES = ["REPS", "SETS", "DURATION", "WORKOUT", "CONSISTENCY"] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

export const QUEST_STATUSES = ["ACTIVE", "COMPLETED", "EXPIRED"] as const;
export type QuestStatus = (typeof QUEST_STATUSES)[number];

export type QuestPredicate =
  | { kind: "REPS"; slugs: string[] }
  | { kind: "SETS"; slugs: string[] }
  | { kind: "DURATION"; slugs: string[]; unit: "minutes" }
  | { kind: "WORKOUT" }
  | { kind: "CONSISTENCY" };

export type QuestCatalogEntry = {
  key: string;
  tier: QuestTier;
  type: QuestType;
  title: string;
  descriptionTemplate: string;
  baseTarget: number;
  xpReward: number;
  sortOrder: number;
  predicate: QuestPredicate;
};

/**
 * Seed catalog. Titles are stable; descriptions interpolate `{target}` at generation.
 * Daily keys are always issued together so a refresh never reshuffles the set.
 */
export const QUEST_CATALOG: QuestCatalogEntry[] = [
  {
    key: "foundation_squats",
    tier: "DAILY",
    type: "SETS",
    title: "Foundation",
    descriptionTemplate: "Complete {target} sets of squats.",
    baseTarget: 3,
    xpReward: 80,
    sortOrder: 10,
    predicate: { kind: "SETS", slugs: ["squat"] },
  },
  {
    key: "upper_pushups",
    tier: "DAILY",
    type: "REPS",
    title: "Upper Body",
    descriptionTemplate: "Complete {target} push-ups.",
    baseTarget: 30,
    xpReward: 90,
    sortOrder: 20,
    predicate: { kind: "REPS", slugs: ["push_up"] },
  },
  {
    key: "daily_training",
    tier: "DAILY",
    type: "WORKOUT",
    title: "Today's Training",
    descriptionTemplate: "Complete today's training directive.",
    baseTarget: 1,
    xpReward: 80,
    sortOrder: 30,
    predicate: { kind: "WORKOUT" },
  },
  {
    key: "iron_week",
    tier: "WEEKLY",
    type: "CONSISTENCY",
    title: "Iron Week",
    descriptionTemplate: "Complete {target} training sessions.",
    baseTarget: 4,
    xpReward: 750,
    sortOrder: 10,
    predicate: { kind: "CONSISTENCY" },
  },
  {
    key: "movement_week",
    tier: "WEEKLY",
    type: "DURATION",
    title: "Movement Week",
    descriptionTemplate: "Accumulate {target} minutes of walking.",
    baseTarget: 90,
    xpReward: 500,
    sortOrder: 20,
    predicate: { kind: "DURATION", slugs: ["walk"], unit: "minutes" },
  },
];

export const DAILY_QUEST_KEYS = QUEST_CATALOG.filter((entry) => entry.tier === "DAILY").map(
  (entry) => entry.key,
);

export const WEEKLY_QUEST_KEYS = QUEST_CATALOG.filter((entry) => entry.tier === "WEEKLY").map(
  (entry) => entry.key,
);
