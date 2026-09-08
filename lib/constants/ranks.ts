export const RANK_KEYS = [
  "INITIATE",
  "CIRCUIT",
  "VOLTAGE",
  "KEYSTONE",
  "MERIDIAN",
  "SOVEREIGN",
] as const;

export type RankKey = (typeof RANK_KEYS)[number];

/** Minimum player level required to be eligible for each rank. Rank is accepted, not auto-applied. */
export const RANK_THRESHOLDS: ReadonlyArray<{ key: RankKey; minLevel: number }> = [
  { key: "INITIATE", minLevel: 1 },
  { key: "CIRCUIT", minLevel: 5 },
  { key: "VOLTAGE", minLevel: 10 },
  { key: "KEYSTONE", minLevel: 20 },
  { key: "MERIDIAN", minLevel: 35 },
  { key: "SOVEREIGN", minLevel: 50 },
];

export const RANK_IDENTITY_LINE: Record<Exclude<RankKey, "INITIATE">, string> = {
  CIRCUIT: "The circuit holds.",
  VOLTAGE: "The current holds.",
  KEYSTONE: "The structure bears load.",
  MERIDIAN: "The line is yours.",
  SOVEREIGN: "The system has nothing higher.",
};

export type RankPromotionDef = {
  from: RankKey;
  to: Exclude<RankKey, "INITIATE">;
  minLevel: number;
  minWorkouts: number;
  currentStreak?: number;
  bestStreak?: number;
  distinctTrainingDays?: number;
  achievementKeys: readonly string[];
};

export const RANK_PROMOTIONS: readonly RankPromotionDef[] = [
  {
    from: "INITIATE",
    to: "CIRCUIT",
    minLevel: 5,
    minWorkouts: 10,
    currentStreak: 7,
    achievementKeys: ["first_awakening"],
  },
  {
    from: "CIRCUIT",
    to: "VOLTAGE",
    minLevel: 10,
    minWorkouts: 25,
    currentStreak: 14,
    achievementKeys: ["circuit"],
  },
  {
    from: "VOLTAGE",
    to: "KEYSTONE",
    minLevel: 20,
    minWorkouts: 60,
    bestStreak: 21,
    achievementKeys: ["iron_will", "limit_breaker"],
  },
  {
    from: "KEYSTONE",
    to: "MERIDIAN",
    minLevel: 35,
    minWorkouts: 150,
    bestStreak: 30,
    achievementKeys: ["unbreakable", "centurion"],
  },
  {
    from: "MERIDIAN",
    to: "SOVEREIGN",
    minLevel: 50,
    minWorkouts: 300,
    bestStreak: 60,
    distinctTrainingDays: 90,
    achievementKeys: [
      "first_awakening",
      "circuit",
      "voltage",
      "iron_will",
      "limit_breaker",
      "unbreakable",
      "centurion",
    ],
  },
];
