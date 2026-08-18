import { jsonError, requireUser } from "@/lib/http";
import { getOrCreateToday } from "@/lib/today";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { prisma, user } = await requireUser(request);
    const today = await getOrCreateToday(prisma, user);
    return NextResponse.json({
      dateKey: today.dateKey,
      character: today.character,
      directive: {
        id: today.quest.id,
        category: today.quest.category,
        title: today.quest.title,
        body: today.quest.body,
        difficulty: today.quest.difficulty,
        status: today.quest.status,
        payload: today.quest.payload,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
