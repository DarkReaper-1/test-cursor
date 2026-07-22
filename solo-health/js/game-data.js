/** Solo Leveling–inspired ranks, stats, and quest templates */

export const RANKS = [
  { id: "E", name: "E-Rank Hunter", minXp: 0, color: "#6b7280", next: "D" },
  { id: "D", name: "D-Rank Hunter", minXp: 250, color: "#22c55e", next: "C" },
  { id: "C", name: "C-Rank Hunter", minXp: 700, color: "#3b82f6", next: "B" },
  { id: "B", name: "B-Rank Hunter", minXp: 1500, color: "#a855f7", next: "A" },
  { id: "A", name: "A-Rank Hunter", minXp: 3000, color: "#f59e0b", next: "S" },
  { id: "S", name: "S-Rank Hunter", minXp: 5500, color: "#ef4444", next: "N" },
  { id: "N", name: "National Level", minXp: 10000, color: "#00e5ff", next: null },
];

export const STAT_KEYS = [
  { key: "str", label: "STR", full: "Strength" },
  { key: "agi", label: "AGI", full: "Agility" },
  { key: "vit", label: "VIT", full: "Vitality" },
  { key: "int", label: "INT", full: "Intelligence" },
  { key: "sen", label: "SEN", full: "Sense" },
];

/** Daily quest pool — scaled lightly by rank index */
export function buildDailyQuests(rankIndex = 0) {
  const scale = 1 + rankIndex * 0.15;
  return [
    {
      id: "pushups",
      name: "Push-ups",
      target: Math.round(50 * scale),
      unit: "reps",
      stat: "str",
      xp: 25,
      progress: 0,
    },
    {
      id: "situps",
      name: "Sit-ups",
      target: Math.round(50 * scale),
      unit: "reps",
      stat: "vit",
      xp: 25,
      progress: 0,
    },
    {
      id: "squats",
      name: "Squats",
      target: Math.round(50 * scale),
      unit: "reps",
      stat: "str",
      xp: 25,
      progress: 0,
    },
    {
      id: "run",
      name: "Run",
      target: Math.round(10 * scale * 10) / 10,
      unit: "km",
      stat: "agi",
      xp: 40,
      progress: 0,
      step: 0.5,
    },
    {
      id: "hydrate",
      name: "Hydration",
      target: 8,
      unit: "glasses",
      stat: "vit",
      xp: 15,
      progress: 0,
    },
    {
      id: "mind",
      name: "Focus Training",
      target: 20,
      unit: "min",
      stat: "int",
      xp: 20,
      progress: 0,
      step: 5,
    },
  ];
}

/** Classic Solo Leveling penalty quest (adapted for health) */
export function buildPenaltyQuest(rankIndex = 0) {
  const scale = 1 + rankIndex * 0.2;
  return [
    {
      id: "p-pushups",
      name: "Penalty Push-ups",
      target: Math.round(100 * scale),
      unit: "reps",
      progress: 0,
      step: 10,
    },
    {
      id: "p-situps",
      name: "Penalty Sit-ups",
      target: Math.round(100 * scale),
      unit: "reps",
      progress: 0,
      step: 10,
    },
    {
      id: "p-squats",
      name: "Penalty Squats",
      target: Math.round(100 * scale),
      unit: "reps",
      progress: 0,
      step: 10,
    },
    {
      id: "p-run",
      name: "Penalty Run",
      target: Math.round(10 * scale * 10) / 10,
      unit: "km",
      progress: 0,
      step: 1,
    },
  ];
}

export function rankForXp(totalXp) {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (totalXp >= rank.minXp) current = rank;
  }
  return current;
}

export function rankIndex(id) {
  return Math.max(0, RANKS.findIndex((r) => r.id === id));
}

export function xpToNextLevel(level) {
  return Math.round(100 * Math.pow(1.35, level - 1));
}
