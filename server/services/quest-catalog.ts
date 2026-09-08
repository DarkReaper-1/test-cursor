import { z } from "zod";
import {
  QUEST_CATALOG,
  type QuestCatalogEntry,
  type QuestPredicate,
  type QuestType,
} from "@/lib/constants/quests";

const slugList = z.array(z.string().min(1)).min(1);

export const questPredicateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("REPS"), slugs: slugList }),
  z.object({ kind: z.literal("SETS"), slugs: slugList }),
  z.object({ kind: z.literal("DURATION"), slugs: slugList, unit: z.literal("minutes") }),
  z.object({ kind: z.literal("WORKOUT") }),
  z.object({ kind: z.literal("CONSISTENCY") }),
]);

export type PlayerProgressionHint = {
  level: number;
  strength: number;
  endurance: number;
  agility: number;
  vitality: number;
  discipline: number;
};

export function parseQuestPredicate(value: unknown): QuestPredicate | null {
  const parsed = questPredicateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function descriptionFor(entry: QuestCatalogEntry, target: number): string {
  return entry.descriptionTemplate.replaceAll("{target}", String(target));
}

/**
 * Scale catalog bases from player level (and a mild attribute hint).
 * Hard cap: 2× base. Workout quests stay at 1. Consistency never exceeds 6.
 */
export function scaleQuestTarget(
  entry: QuestCatalogEntry,
  player: PlayerProgressionHint,
): number {
  if (entry.type === "WORKOUT") return 1;

  const levelBonus = Math.min(Math.max(player.level - 1, 0), 20);
  const levelFactor = 1 + levelBonus * 0.05;

  const attr = relevantAttribute(entry.type, player);
  const attrBonus = Math.min(Math.max(attr - 10, 0), 20);
  const attrFactor = 1 + attrBonus * 0.01;

  const scaled = Math.round(entry.baseTarget * levelFactor * attrFactor);
  const capped = Math.min(entry.baseTarget * 2, Math.max(entry.baseTarget, scaled));

  if (entry.type === "CONSISTENCY") {
    const extra = Math.floor(levelBonus / 10);
    return Math.min(6, Math.max(entry.baseTarget, entry.baseTarget + extra));
  }

  return capped;
}

function relevantAttribute(type: QuestType, player: PlayerProgressionHint): number {
  if (type === "DURATION" || type === "CONSISTENCY") return player.endurance;
  if (type === "REPS" || type === "SETS") return player.strength;
  return player.discipline;
}

export function catalogByKey(): Map<string, QuestCatalogEntry> {
  return new Map(QUEST_CATALOG.map((entry) => [entry.key, entry]));
}

export function activeCatalogForTier(tier: QuestCatalogEntry["tier"]): QuestCatalogEntry[] {
  return QUEST_CATALOG.filter((entry) => entry.tier === tier).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}
