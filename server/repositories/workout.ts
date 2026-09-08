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
