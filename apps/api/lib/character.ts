import { levelFromTotalXp, rankFromLevel } from "@helix/rpg";
import type { Character, AttributeScore, AttributeDefinition } from "@prisma/client";

type CharacterWithScores = Character & {
  scores: (AttributeScore & { definition: AttributeDefinition })[];
};

export function characterSnapshot(character: CharacterWithScores) {
  const progress = levelFromTotalXp(character.totalXp);
  const scores: Record<string, number> = {};
  for (const score of character.scores) {
    scores[score.definition.key] = score.value;
  }
  return {
    level: character.level,
    totalXp: character.totalXp,
    xpIntoLevel: progress.xpIntoLevel,
    xpToNext: progress.xpToNext,
    rankKey: character.rankKey || rankFromLevel(character.level),
    momentum: character.momentum,
    title: character.title,
    scores,
  };
}
