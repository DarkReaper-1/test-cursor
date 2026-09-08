import { BASE_WORKOUT_XP, MAX_WORKOUT_XP, MIN_WORKOUT_XP } from "@/lib/constants/xp";

export type WorkoutXpInput = {
  durationSec: number;
  exercises: Array<{
    sets: number;
    reps: number;
    difficulty: number;
  }>;
};

export function computeWorkoutXp(input: WorkoutXpInput): number {
  const minutes = Math.max(0, Math.floor(input.durationSec / 60));
  const volume = input.exercises.reduce(
    (sum, item) => sum + item.sets * item.reps * Math.max(1, item.difficulty),
    0,
  );
  const raw = BASE_WORKOUT_XP + minutes * 4 + Math.floor(volume / 8) + input.exercises.length * 6;
  return Math.min(MAX_WORKOUT_XP, Math.max(MIN_WORKOUT_XP, raw));
}
