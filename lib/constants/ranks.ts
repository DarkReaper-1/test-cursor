export const RANK_KEYS = [
  "INITIATE",
  "CIRCUIT",
  "VOLTAGE",
  "KEYSTONE",
  "MERIDIAN",
  "SOVEREIGN",
] as const;

export type RankKey = (typeof RANK_KEYS)[number];

/** Minimum player level required to hold each rank. */
export const RANK_THRESHOLDS: ReadonlyArray<{ key: RankKey; minLevel: number }> = [
  { key: "INITIATE", minLevel: 1 },
  { key: "CIRCUIT", minLevel: 5 },
  { key: "VOLTAGE", minLevel: 10 },
  { key: "KEYSTONE", minLevel: 20 },
  { key: "MERIDIAN", minLevel: 35 },
  { key: "SOVEREIGN", minLevel: 50 },
];
