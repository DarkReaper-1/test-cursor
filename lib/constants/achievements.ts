import type { RankKey } from "./ranks";

export const ACHIEVEMENT_FAMILIES = ["MILESTONE", "STREAK", "MASTERY"] as const;
export type AchievementFamily = (typeof ACHIEVEMENT_FAMILIES)[number];

export const ACHIEVEMENT_STATUSES = ["LOCKED", "IN_PROGRESS", "UNLOCKED"] as const;
export type AchievementStatus = (typeof ACHIEVEMENT_STATUSES)[number];

export type AchievementPredicate =
  | { kind: "WORKOUT_COUNT"; min: number }
  | { kind: "RANK_REACHED"; rank: RankKey }
  | { kind: "STREAK"; min: number }
  | { kind: "PERFORMANCE_PR" };

export type AchievementCatalogEntry = {
  key: string;
  family: AchievementFamily;
  title: string;
  description: string;
  identity: string;
  baseTarget: number;
  xpReward: number;
  sortOrder: number;
  predicate: AchievementPredicate;
};

export const ACHIEVEMENT_CATALOG: AchievementCatalogEntry[] = [
  {
    key: "first_awakening",
    family: "MILESTONE",
    title: "First Awakening",
    description: "Complete your first training session.",
    identity: "The file is open.",
    baseTarget: 1,
    xpReward: 50,
    sortOrder: 10,
    predicate: { kind: "WORKOUT_COUNT", min: 1 },
  },
  {
    key: "circuit",
    family: "MILESTONE",
    title: "Circuit",
    description: "Reach Circuit rank.",
    identity: "The first rank is yours.",
    baseTarget: 5,
    xpReward: 150,
    sortOrder: 20,
    predicate: { kind: "RANK_REACHED", rank: "CIRCUIT" },
  },
  {
    key: "voltage",
    family: "MILESTONE",
    title: "Voltage",
    description: "Reach Voltage rank.",
    identity: "The current holds.",
    baseTarget: 10,
    xpReward: 300,
    sortOrder: 30,
    predicate: { kind: "RANK_REACHED", rank: "VOLTAGE" },
  },
  {
    key: "iron_will",
    family: "STREAK",
    title: "Iron Will",
    description: "Train 7 consecutive days.",
    identity: "Seven days. Unbroken.",
    baseTarget: 7,
    xpReward: 250,
    sortOrder: 10,
    predicate: { kind: "STREAK", min: 7 },
  },
  {
    key: "unbreakable",
    family: "STREAK",
    title: "Unbreakable",
    description: "Train 30 consecutive days.",
    identity: "Thirty days. Unbroken.",
    baseTarget: 30,
    xpReward: 750,
    sortOrder: 20,
    predicate: { kind: "STREAK", min: 30 },
  },
  {
    key: "limit_breaker",
    family: "MASTERY",
    title: "Limit Breaker",
    description: "Beat a previous personal training performance.",
    identity: "You surpassed yourself.",
    baseTarget: 1,
    xpReward: 200,
    sortOrder: 10,
    predicate: { kind: "PERFORMANCE_PR" },
  },
  {
    key: "centurion",
    family: "MASTERY",
    title: "Centurion",
    description: "Complete 100 workouts.",
    identity: "You have entered the next hundred.",
    baseTarget: 100,
    xpReward: 750,
    sortOrder: 20,
    predicate: { kind: "WORKOUT_COUNT", min: 100 },
  },
];
