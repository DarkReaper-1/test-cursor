import type { PlayerSnapshot } from "./types";
import { cumulativeXpForLevel, xpToClearLevel } from "./constants/xp";
import type { RankKey } from "./constants/ranks";

export function toPlayerSnapshot(player: {
  id: string;
  username: string;
  level: number;
  xp: number;
  rank: string;
  strength: number;
  endurance: number;
  agility: number;
  vitality: number;
  discipline: number;
  streak: number;
}): PlayerSnapshot {
  const floor = cumulativeXpForLevel(player.level);
  const span = xpToClearLevel(player.level);
  return {
    id: player.id,
    username: player.username,
    level: player.level,
    xp: player.xp,
    xpIntoLevel: Math.max(0, player.xp - floor),
    xpToNext: span,
    rank: player.rank as RankKey,
    strength: player.strength,
    endurance: player.endurance,
    agility: player.agility,
    vitality: player.vitality,
    discipline: player.discipline,
    streak: player.streak,
  };
}

export function dateKeyInTimeZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
