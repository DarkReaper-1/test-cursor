import { hashPassword, signAccessToken } from "@/lib/auth";
import { jsonError, requirePrisma, HttpError } from "@/lib/http";
import { createOperatorCharacter } from "@/lib/seed";
import { registerRequestSchema } from "@helix/shared";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = registerRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, "VALIDATION", "Use a valid email and a password of at least 8 characters.");
    }
    const prisma = requirePrisma();
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: { create: {} },
      },
    });
    await createOperatorCharacter(prisma, user.id);
    const token = await signAccessToken(user.id, user.email);
    return NextResponse.json({ token, userId: user.id, email: user.email, onboardingComplete: false });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(new HttpError(409, "CONFLICT", "An operator with that email already exists."));
    }
    return jsonError(error);
  }
}
