import { signAccessToken, verifyPassword } from "@/lib/auth";
import { jsonError, requirePrisma, HttpError } from "@/lib/http";
import { loginRequestSchema } from "@helix/shared";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, "VALIDATION", "Invalid email or password.");
    }
    const prisma = requirePrisma();
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      include: { profile: true },
    });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid email or password.");
    }
    const token = await signAccessToken(user.id, user.email);
    return NextResponse.json({
      token,
      userId: user.id,
      email: user.email,
      onboardingComplete: Boolean(user.profile?.onboardingCompletedAt),
    });
  } catch (error) {
    return jsonError(error);
  }
}
