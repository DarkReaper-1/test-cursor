export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION: "VALIDATION",
  IDEMPOTENT_REPLAY: "IDEMPOTENT_REPLAY",
  RATE_LIMITED: "RATE_LIMITED",
  NOT_GRANTED: "NOT_GRANTED",
  UNSAFE_PROPOSAL: "UNSAFE_PROPOSAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const DEFAULT_ATTRIBUTE_KEYS = [
  "BODY",
  "VITALITY",
  "AGILITY",
  "MIND",
  "FOCUS",
  "DISCIPLINE",
] as const;

export type DefaultAttributeKey = (typeof DEFAULT_ATTRIBUTE_KEYS)[number];

export const RANK_KEYS = [
  "spark",
  "ember",
  "forge",
  "current",
  "lattice",
  "apex",
] as const;

export type RankKey = (typeof RANK_KEYS)[number];

export const ACTIVITY_TYPES = [
  "workout",
  "walking",
  "reading",
  "meditation",
  "habit",
  "quest",
  "recovery_quest",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];
