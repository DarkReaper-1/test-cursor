import type { QuestPredicate, QuestType } from "@/lib/constants/quests";
import { parseQuestPredicate } from "./quest-catalog";

export type WorkoutActivity = {
  workoutId: string;
  durationSec: number;
  bySlug: Record<string, { sets: number; reps: number; durationSec: number }>;
};

export type LoggedExercise = {
  slug: string;
  sets: number;
  reps: number;
  durationSec?: number | null;
};

export function activityFromWorkout(input: {
  workoutId: string;
  durationSec: number;
  exercises: LoggedExercise[];
}): WorkoutActivity {
  const bySlug: WorkoutActivity["bySlug"] = {};
  for (const item of input.exercises) {
    const current = bySlug[item.slug] ?? { sets: 0, reps: 0, durationSec: 0 };
    current.sets += item.sets;
    current.reps += item.sets * item.reps;
    current.durationSec += item.durationSec ?? 0;
    bySlug[item.slug] = current;
  }
  return {
    workoutId: input.workoutId,
    durationSec: input.durationSec,
    bySlug,
  };
}

/**
 * Fail closed: unknown predicates and type/kind mismatches contribute 0.
 */
export function deltaForQuest(input: {
  type: QuestType | string;
  predicate: unknown;
  activity: WorkoutActivity;
}): number {
  const predicate = parseQuestPredicate(input.predicate);
  if (!predicate) return 0;
  if (predicate.kind !== input.type) return 0;

  switch (predicate.kind) {
    case "REPS":
      return sumSlugs(input.activity, predicate.slugs).reps;
    case "SETS":
      return sumSlugs(input.activity, predicate.slugs).sets;
    case "DURATION":
      return durationMinutes(input.activity, predicate.slugs);
    case "WORKOUT":
    case "CONSISTENCY":
      return 1;
    default: {
      const _never: never = predicate;
      void _never;
      return 0;
    }
  }
}

function sumSlugs(activity: WorkoutActivity, slugs: string[]): {
  sets: number;
  reps: number;
  durationSec: number;
  matched: boolean;
} {
  let sets = 0;
  let reps = 0;
  let durationSec = 0;
  let matched = false;
  for (const slug of slugs) {
    const row = activity.bySlug[slug];
    if (!row) continue;
    matched = true;
    sets += row.sets;
    reps += row.reps;
    durationSec += row.durationSec;
  }
  return { sets, reps, durationSec, matched };
}

function durationMinutes(activity: WorkoutActivity, slugs: string[]): number {
  const summed = sumSlugs(activity, slugs);
  if (!summed.matched) return 0;
  if (summed.durationSec > 0) return Math.floor(summed.durationSec / 60);
  if (activity.durationSec > 0) return Math.floor(activity.durationSec / 60);
  return 0;
}

export function applyDelta(progress: number, target: number, delta: number): number {
  if (delta <= 0) return progress;
  return Math.min(target, progress + delta);
}

export function shouldComplete(progress: number, target: number): boolean {
  return target > 0 && progress >= target;
}
