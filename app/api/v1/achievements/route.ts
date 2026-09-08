import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/server/auth/session";
import { getAchievementBoard } from "@/server/services/achievement";
import { fromUnknown, jsonError } from "@/server/http/errors";

export async function GET() {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return jsonError(401, "UNAUTHORIZED", "Sign in required.");
    }
    const payload = await getAchievementBoard(accountId);
    return NextResponse.json(payload);
  } catch (err) {
    return fromUnknown(err);
  }
}
