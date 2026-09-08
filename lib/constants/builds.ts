/**
 * Future player builds. Not persisted in Phase 0–3.
 * When added, a build may weight XP and attribute deltas — keep formulas
 * in services so a single lookup can bias progression later.
 */
export const BUILD_KEYS = ["POWER", "ENDURANCE", "SPEED", "BALANCED"] as const;

export type BuildKey = (typeof BUILD_KEYS)[number];
