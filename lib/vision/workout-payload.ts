import { completeWorkoutSchema } from "@/server/validators";

export function summarizeCameraSets(setReps: number[]): { sets: number; reps: number } {
  const capped = setReps
    .map((reps) => Math.min(50, Math.max(0, Math.round(reps))))
    .filter((reps) => reps > 0)
    .slice(0, 12);
  if (capped.length === 0) {
    return { sets: 1, reps: 1 };
  }
  const average = Math.round(capped.reduce((sum, reps) => sum + reps, 0) / capped.length);
  return {
    sets: capped.length,
    reps: Math.min(50, Math.max(1, average)),
  };
}

export function cameraDurationSec(startedAtMs: number, endedAtMs: number): number {
  const seconds = Math.round((endedAtMs - startedAtMs) / 1000);
  return Math.min(60 * 180, Math.max(60, seconds));
}

export function cameraWorkoutBody(input: {
  idempotencyKey: string;
  durationSec: number;
  exercises: Array<{ exerciseId: string; sets: number; reps: number }>;
}) {
  return completeWorkoutSchema.parse({
    idempotencyKey: input.idempotencyKey,
    durationSec: input.durationSec,
    source: "CAMERA",
    exercises: input.exercises.map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets,
      reps: item.reps,
      weight: 0,
    })),
  });
}
