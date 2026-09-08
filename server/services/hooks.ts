/**
 * Future quest evaluation. Phase 0–3 records WORKOUT_COMPLETED events only.
 * Quests must subscribe here later — do not call Prisma from UI.
 */
export async function onQuestHook(_input: {
  playerId: string;
  eventType: string;
}): Promise<void> {
  return;
}

/**
 * Future achievement evaluation. Fail closed until implemented.
 */
export async function onAchievementHook(_input: {
  playerId: string;
  eventType: string;
}): Promise<void> {
  return;
}
