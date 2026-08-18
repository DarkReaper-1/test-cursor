import { calculateReward } from "@helix/rpg";
import { rewardPreviewRequestSchema } from "@helix/shared";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Preview only. Never persists XP. Clients must not treat this as a grant.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = rewardPreviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = calculateReward({
    activityType: parsed.data.activityType,
    difficulty: parsed.data.difficulty as 1 | 2 | 3 | 4 | 5,
    userLevel: parsed.data.userLevel,
    streakDays: parsed.data.streakDays,
    recentActivityCount24h: parsed.data.recentActivityCount24h,
    durationMinutes: parsed.data.durationMinutes,
    volumeLoad: parsed.data.volumeLoad,
    questCategory: parsed.data.questCategory,
  });

  return NextResponse.json({
    granted: false as const,
    ...result,
  });
}
