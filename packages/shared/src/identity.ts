import { z } from "zod";

export const registerRequestSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(72),
});

export const loginRequestSchema = registerRequestSchema;

export const onboardingRequestSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  goal: z.enum(["strength", "consistency", "energy", "hybrid"]),
  equipment: z.enum(["none", "dumbbells", "gym"]),
  minutes: z.union([z.literal(10), z.literal(20), z.literal(45)]),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  constraints: z.string().max(240).default(""),
});

export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;

export const loggedSetSchema = z.object({
  exerciseKey: z.string().min(1).max(40),
  load: z.number().int().min(0).max(2000),
  reps: z.number().int().min(0).max(200),
  rpe: z.number().int().min(1).max(10).optional(),
});

export const completeTodayRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
  questId: z.string().uuid(),
  sets: z.array(loggedSetSchema).min(1).max(30),
});

export type CompleteTodayRequest = z.infer<typeof completeTodayRequestSchema>;

export const characterSnapshotSchema = z.object({
  level: z.number().int(),
  totalXp: z.number().int(),
  xpIntoLevel: z.number().int(),
  xpToNext: z.number().int(),
  rankKey: z.string(),
  momentum: z.number().int(),
  title: z.string(),
  scores: z.record(z.string(), z.number().int()),
});
