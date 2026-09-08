import type { RankKey } from "./constants/ranks";
import type { ProgressionEventType } from "./constants/events";

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

export type WorkoutResult = {
  workoutId: string;
  replay: boolean;
  xp: number;
  leveledUp: boolean;
  rankUp: boolean;
  before: PlayerSnapshot;
  player: PlayerSnapshot;
  nextMilestone: NextMilestone | null;
  events: ProgressionEventDto[];
};
