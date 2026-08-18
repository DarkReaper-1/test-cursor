import { completeToday } from "@/lib/complete";
import { jsonError, requireUser } from "@/lib/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Completions require a session. XP amount is computed server-side. */
export async function POST(request: Request) {
  try {
    const { prisma, user } = await requireUser(request);
    const body: unknown = await request.json().catch(() => null);
    const result = await completeToday(prisma, user, body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
