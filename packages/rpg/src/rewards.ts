import type { ActivityType } from "@helix/shared";

export interface RewardContext {
  activityType: ActivityType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  userLevel: number;
  streakDays: number;
  recentActivityCount24h: number;
  durationMinutes?: number;
  volumeLoad?: number;
  questCategory?: string;
}

export interface RewardBonus {
  id: string;
  multiplier: number;
}

export interface AbuseFlags {
  duplicateRisk: boolean;
  impossibleActivity: boolean;
  suspiciousFrequency: boolean;
}

export interface RewardResult {
  xp: number;
  attributeDeltas: Record<string, number>;
  bonuses: RewardBonus[];
  flags: AbuseFlags;
}

const BASE_XP: Record<ActivityType, number> = {
  workout: 180,
  walking: 40,
  reading: 30,
  meditation: 20,
  habit: 10,
  quest: 100,
  recovery_quest: 80,
};

const ACTIVITY_ATTRIBUTES: Record<ActivityType, Record<string, number>> = {
  workout: { BODY: 2, VITALITY: 1 },
  walking: { VITALITY: 1, AGILITY: 1 },
  reading: { MIND: 2 },
  meditation: { FOCUS: 2, VITALITY: 1 },
  habit: { DISCIPLINE: 1 },
  quest: { DISCIPLINE: 1 },
  recovery_quest: { DISCIPLINE: 1, VITALITY: 1 },
};

const XP_HARD_CAP = 400;
const FREQUENCY_SOFT_CAP = 8;
const IMPOSSIBLE_MINUTES = 8 * 60;
const IMPOSSIBLE_VOLUME = 250_000;

function difficultyMultiplier(difficulty: number): number {
  return 0.7 + (difficulty - 1) * 0.15;
}

function streakMultiplier(streakDays: number): number {
  if (streakDays <= 0) return 1;
  return 1 + Math.min(0.2, streakDays * 0.01);
}

function levelSoftener(userLevel: number): number {
  // Higher-level operators earn slightly less raw XP per action.
  return Math.max(0.7, 1 - (userLevel - 1) * 0.004);
}

function frequencyPenalty(count: number): { multiplier: number; suspicious: boolean } {
  if (count >= FREQUENCY_SOFT_CAP) {
    return { multiplier: 0.25, suspicious: true };
  }
  if (count >= 5) {
    return { multiplier: 0.6, suspicious: false };
  }
  return { multiplier: 1, suspicious: false };
}

export function calculateReward(context: RewardContext): RewardResult {
  const flags: AbuseFlags = {
    duplicateRisk: false,
    impossibleActivity: false,
    suspiciousFrequency: false,
  };

  if (
    (context.durationMinutes !== undefined &&
      context.durationMinutes > IMPOSSIBLE_MINUTES) ||
    (context.volumeLoad !== undefined && context.volumeLoad > IMPOSSIBLE_VOLUME)
  ) {
    flags.impossibleActivity = true;
  }

  const freq = frequencyPenalty(context.recentActivityCount24h);
  flags.suspiciousFrequency = freq.suspicious;

  const bonuses: RewardBonus[] = [
    { id: "difficulty", multiplier: difficultyMultiplier(context.difficulty) },
    { id: "streak", multiplier: streakMultiplier(context.streakDays) },
    { id: "level", multiplier: levelSoftener(context.userLevel) },
    { id: "frequency", multiplier: freq.multiplier },
  ];

  if (context.questCategory === "recovery") {
    bonuses.push({ id: "recovery", multiplier: 1.05 });
  }

  const combined = bonuses.reduce((acc, bonus) => acc * bonus.multiplier, 1);
  let xp = Math.round(BASE_XP[context.activityType] * combined);
  xp = Math.min(XP_HARD_CAP, Math.max(0, xp));

  if (flags.impossibleActivity) {
    xp = 0;
  }

  const attributeDeltas = flags.impossibleActivity
    ? {}
    : { ...ACTIVITY_ATTRIBUTES[context.activityType] };

  return { xp, attributeDeltas, bonuses, flags };
}

export const RewardEngine = {
  calculateReward,
};
