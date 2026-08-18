import { z } from "zod";
import { ACTIVITY_TYPES } from "./ids";

export const activityTypeSchema = z.enum(ACTIVITY_TYPES);

export const rewardPreviewRequestSchema = z.object({
  activityType: activityTypeSchema,
  difficulty: z.number().int().min(1).max(5).default(3),
  userLevel: z.number().int().min(1).max(100).default(1),
  streakDays: z.number().int().min(0).max(3650).default(0),
  recentActivityCount24h: z.number().int().min(0).max(100).default(0),
  durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
  volumeLoad: z.number().min(0).max(1_000_000).optional(),
  questCategory: z.string().max(40).optional(),
});

export type RewardPreviewRequest = z.infer<typeof rewardPreviewRequestSchema>;

export const rewardPreviewResponseSchema = z.object({
  granted: z.literal(false),
  xp: z.number().int().nonnegative(),
  attributeDeltas: z.record(z.string(), z.number().int()),
  bonuses: z.array(
    z.object({
      id: z.string(),
      multiplier: z.number(),
    }),
  ),
  flags: z.object({
    duplicateRisk: z.boolean(),
    impossibleActivity: z.boolean(),
    suspiciousFrequency: z.boolean(),
  }),
});

export type RewardPreviewResponse = z.infer<typeof rewardPreviewResponseSchema>;

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("helix-api"),
  version: z.string(),
  time: z.string(),
  aiProvider: z.string(),
  database: z.enum(["connected", "disconnected", "unconfigured"]),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
