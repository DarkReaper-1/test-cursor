import { nextPrescription, type LoggedSet } from "./progression";

export interface PlannedExercise {
  key: string;
  name: string;
  targetSets: number;
  targetReps: number;
  load: number;
}

export function adaptExercise(
  planned: PlannedExercise,
  history: LoggedSet[],
): PlannedExercise {
  if (history.length === 0) {
    return planned;
  }

  if (planned.load === 0) {
    const hits = history.filter((set) => set.reps >= planned.targetReps).length;
    const last = history[history.length - 1];
    let nextReps = planned.targetReps;
    if (hits === history.length) {
      nextReps = planned.targetReps + 1;
    } else if (!(hits === history.length - 1 && last && last.reps === planned.targetReps - 1)) {
      nextReps = Math.max(5, planned.targetReps - 1);
    }
    return { ...planned, targetReps: nextReps, load: 0 };
  }

  const next = nextPrescription({
    targetReps: planned.targetReps,
    sets: history,
    increment: 5,
  });
  const first = next[0];
  return {
    ...planned,
    targetSets: next.length || planned.targetSets,
    targetReps: first?.reps ?? planned.targetReps,
    load: first?.load ?? planned.load,
  };
}

export function adaptPlan(
  exercises: PlannedExercise[],
  historyByExercise: Record<string, LoggedSet[]>,
): { exercises: PlannedExercise[]; adaptedFromHistory: boolean } {
  let adaptedFromHistory = false;
  const next = exercises.map((exercise) => {
    const history = historyByExercise[exercise.key] ?? [];
    if (history.length === 0) {
      return exercise;
    }
    adaptedFromHistory = true;
    return adaptExercise(exercise, history);
  });
  return { exercises: next, adaptedFromHistory };
}
