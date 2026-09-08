import type { RankKey } from "./constants/ranks";
import type { ProgressionEventType } from "./constants/events";
import type { QuestStatus, QuestTier, QuestType } from "./constants/quests";
import type { AchievementFamily, AchievementStatus } from "./constants/achievements";

export type PlayerSnapshot = {
  id: string;
  username: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpToNext: number;
  rank: RankKey;
  strength: number;
  endurance: number;
  agility: number;
  vitality: number;
  discipline: number;
  streak: number;
};

export type DirectiveExercise = {
  exerciseId: string;
  slug: string;
  name: string;
  description: string;
  movementType: string;
  difficulty: number;
  targetSets: number;
  targetReps: number;
  targetLoad: number;
};

export type TrainingDirective = {
  dateKey: string;
  title: string;
  body: string;
  minutes: number;
  restSeconds: number;
  exercises: DirectiveExercise[];
};

export type ProgressionEventDto = {
  type: ProgressionEventType;
  payload: Record<string, unknown>;
};

export type NextMilestone = {
  rank: RankKey;
  minLevel: number;
};

export type QuestCompletionDto = {
  id: string;
  key: string;
  title: string;
  xp: number;
};

export type QuestDto = {
  id: string;
  key: string;
  title: string;
  description: string;
  tier: QuestTier;
  type: QuestType;
  progress: number;
  target: number;
  percent: number;
  status: QuestStatus;
  xpReward: number;
  startedAt: string;
  expiresAt: string;
  completedAt: string | null;
};

export type QuestBoardDto = {
  tier: QuestTier;
  periodKey: string;
  timezone: string;
  expiresAt: string;
  quests: QuestDto[];
  completedCount: number;
  totalCount: number;
  xpRewardTotal: number;
};

export type AchievementUnlockDto = {
  id: string;
  key: string;
  family: AchievementFamily;
  title: string;
  description: string;
  identity: string;
  xp: number;
};

export type AchievementDto = {
  id: string;
  key: string;
  family: AchievementFamily;
  title: string;
  description: string;
  identity: string;
  progress: number;
  target: number;
  percent: number;
  status: AchievementStatus;
  xpReward: number;
  unlockedAt: string | null;
};

export type AchievementBoardDto = {
  milestones: AchievementDto[];
  streak: AchievementDto[];
  mastery: AchievementDto[];
};

export type WorkoutResult = {
  workoutId: string;
  replay: boolean;
  xp: number;
  questXp: number;
  questCompletions: QuestCompletionDto[];
  achievementXp: number;
  achievementUnlocks: AchievementUnlockDto[];
  leveledUp: boolean;
  rankUp: boolean;
  before: PlayerSnapshot;
  player: PlayerSnapshot;
  nextMilestone: NextMilestone | null;
  events: ProgressionEventDto[];
};
