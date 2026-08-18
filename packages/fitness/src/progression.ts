export interface LoggedSet {
  load: number;
  reps: number;
}

export interface PrescriptionSet {
  load: number;
  reps: number;
}

export interface ProgressionInput {
  targetReps: number;
  sets: LoggedSet[];
  /** Smallest plate or increment, default 5. */
  increment?: number;
}

/**
 * If every working set hit the target, add load.
 * If the last set missed by 1 and earlier sets hit, repeat the same load at full reps.
 * If multiple sets missed, keep load and drop 1 rep (floor 5).
 */
export function nextPrescription(input: ProgressionInput): PrescriptionSet[] {
  const increment = input.increment ?? 5;
  const { targetReps, sets } = input;
  if (sets.length === 0) {
    return [
      { load: 0, reps: targetReps },
      { load: 0, reps: targetReps },
      { load: 0, reps: targetReps },
    ];
  }

  const load = sets[0]?.load ?? 0;
  const hits = sets.filter((set) => set.reps >= targetReps).length;
  const last = sets[sets.length - 1];

  if (hits === sets.length) {
    return sets.map(() => ({ load: load + increment, reps: targetReps }));
  }

  if (hits === sets.length - 1 && last && last.reps === targetReps - 1) {
    return sets.map(() => ({ load, reps: targetReps }));
  }

  const nextReps = Math.max(5, targetReps - 1);
  return sets.map(() => ({ load, reps: nextReps }));
}
