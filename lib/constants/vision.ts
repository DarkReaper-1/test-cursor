export const VISION_STAGE = "V1" as const;

export const CAMERA_EXERCISE_SLUGS = [
  "squat",
  "push_up",
  "hinge",
  "hip_bridge",
  "split_squat",
  "plank",
  "row",
  "walk",
] as const;

export type CameraExerciseSlug = (typeof CAMERA_EXERCISE_SLUGS)[number];

export function isCameraExercise(slug: string): slug is CameraExerciseSlug {
  return (CAMERA_EXERCISE_SLUGS as readonly string[]).includes(slug);
}

export const VISION_PRIVACY_LINE =
  "Footage stays on this device. SYSTEM keeps sets and reps. The video is discarded. Work is not filed until SYSTEM has seen it.";
