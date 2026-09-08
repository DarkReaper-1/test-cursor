import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(120).transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8).max(72),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/)
    .transform((value) => value.trim()),
  timezone: z.string().min(1).max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8).max(72),
});

export const completeWorkoutSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    durationSec: z.number().int().min(60).max(60 * 180),
    exercises: z
      .array(
        z.object({
          exerciseId: z.string().uuid(),
          sets: z.number().int().min(1).max(12),
          reps: z.number().int().min(1).max(50),
          weight: z.number().min(0).max(1000),
          durationSec: z.number().int().min(0).max(3600).optional(),
        }),
      )
    .min(1)
    .max(12),
  })
  .strip();
