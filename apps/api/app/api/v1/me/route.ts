import { characterSnapshot } from "@/lib/character";
import { jsonError, requireUser } from "@/lib/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    return NextResponse.json({
      userId: user.id,
      email: user.email,
      onboardingComplete: Boolean(user.profile?.onboardingCompletedAt),
      character: user.character ? characterSnapshot(user.character) : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
