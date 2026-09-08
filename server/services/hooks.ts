/**
 * Achievement evaluation remains a no-op until a later phase.
 * Quest evaluation runs inside the workout completion transaction
 * via `applyWorkoutToQuests` — do not call Prisma from UI.
 */
export async function onAchievementHook(_input: {
  playerId: string;
  eventType: string;
}): Promise<void> {
  return;
}
