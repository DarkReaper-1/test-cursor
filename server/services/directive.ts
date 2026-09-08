import type { TrainingDirective } from "@/lib/types";
import { dateKeyInTimeZone } from "@/lib/format";

export type CatalogExercise = {
  id: string;
  slug: string;
  name: string;
  description: string;
  movementType: string;
  difficulty: number;
};

const TEMPLATES: Array<{ title: string; body: string; slugs: string[] }> = [
  {
    title: "Foundation Circuit",
    body: "A full-body session. No equipment required. This is training, not medical advice.",
    slugs: ["push_up", "squat", "hinge"],
  },
  {
    title: "Steel Tempo",
    body: "Slow positions, honest reps. Log what you actually did.",
    slugs: ["plank", "row", "split_squat"],
  },
  {
    title: "Quiet Mileage",
    body: "Move without spectacle. Keep the clock honest.",
    slugs: ["walk", "push_up", "hip_bridge"],
  },
];

export function assembleDirective(input: {
  now?: Date;
  timezone: string;
  exercises: CatalogExercise[];
}): TrainingDirective {
  const now = input.now ?? new Date();
  const dateKey = dateKeyInTimeZone(now, input.timezone);
  const day = Number(dateKey.slice(-2));
  const template = TEMPLATES[day % TEMPLATES.length] ?? TEMPLATES[0];
  const bySlug = new Map(input.exercises.map((item) => [item.slug, item]));
  const picked = (template?.slugs ?? [])
    .map((slug) => bySlug.get(slug))
    .filter((item): item is CatalogExercise => Boolean(item));

  return {
    dateKey,
    title: template?.title ?? "Foundation Circuit",
    body: template?.body ?? "Train today. Not medical advice.",
    minutes: 20,
    restSeconds: 75,
    exercises: picked.map((exercise) => ({
      exerciseId: exercise.id,
      slug: exercise.slug,
      name: exercise.name,
      description: exercise.description,
      movementType: exercise.movementType,
      difficulty: exercise.difficulty,
      targetSets: 3,
      targetReps: 10,
      targetLoad: 0,
    })),
  };
}
