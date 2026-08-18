import { jsonError, HttpError, requireUser } from "@/lib/http";
import { onboardingRequestSchema } from "@helix/shared";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { prisma, user } = await requireUser(request);
    const body: unknown = await request.json().catch(() => null);
    const parsed = onboardingRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, "VALIDATION", "Onboarding answers are incomplete.");
    }
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        displayName: parsed.data.displayName,
        onboarding: parsed.data,
        onboardingCompletedAt: new Date(),
      },
      create: {
        userId: user.id,
        displayName: parsed.data.displayName,
        onboarding: parsed.data,
        onboardingCompletedAt: new Date(),
      },
    });
    await prisma.goal.create({
      data: { userId: user.id, type: parsed.data.goal, status: "active" },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
