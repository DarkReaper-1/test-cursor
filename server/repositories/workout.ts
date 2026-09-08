import type { Workout, WorkoutExercise } from "@prisma/client";
import type { Db } from "../db/client";

export type LoggedSet = {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  durationSec?: number;
  sortOrder: number;
};

export async function findWorkoutByIdempotency(
  db: Db,
  idempotencyKey: string,
): Promise<(Workout & { exercises: WorkoutExercise[] }) | null> {
  return db.workout.findUnique({
    where: { idempotencyKey },
    include: { exercises: true },
  });
}

export async function findLatestCompletedWorkout(
  db: Db,
  playerId: string,
): Promise<(Workout & { exercises: WorkoutExercise[] }) | null> {
  return db.workout.findFirst({
    where: { playerId, completed: true },
    include: { exercises: true },
    orderBy: { completedAt: "desc" },
  });
}

export async function findWorkoutById(
  db: Db,
  id: string,
): Promise<(Workout & { exercises: WorkoutExercise[] }) | null> {
  return db.workout.findUnique({
    where: { id },
    include: { exercises: true },
  });
}

export async function createCompletedWorkout(
  db: Db,
  input: {
    playerId: string;
    durationSec: number;
    xpEarned: number;
    idempotencyKey: string;
    completedAt: Date;
    exercises: LoggedSet[];
  },
): Promise<Workout> {
  return db.workout.create({
    data: {
      playerId: input.playerId,
      durationSec: input.durationSec,
      completed: true,
      xpEarned: input.xpEarned,
      completedAt: input.completedAt,
      idempotencyKey: input.idempotencyKey,
      exercises: {
        create: input.exercises.map((item) => ({
          exerciseId: item.exerciseId,
          sets: item.sets,
          reps: item.reps,
          weight: item.weight,
          durationSec: item.durationSec,
          sortOrder: item.sortOrder,
        })),
      },
    },
  });
}

export async function countCompletedWorkouts(db: Db, playerId: string): Promise<number> {
  return db.workout.count({ where: { playerId, completed: true } });
}

export async function listPriorExerciseLogs(
  db: Db,
  playerId: string,
  excludeWorkoutId: string,
): Promise<Array<{ exerciseId: string; sets: number; reps: number; weight: number }>> {
  const rows = await db.workoutExercise.findMany({
    where: {
      workout: {
        playerId,
        completed: true,
        id: { not: excludeWorkoutId },
      },
    },
    select: { exerciseId: true, sets: true, reps: true, weight: true },
  });
  return rows.map((row) => ({
    exerciseId: row.exerciseId,
    sets: row.sets,
    reps: row.reps,
    weight: Number(row.weight),
  }));
}
