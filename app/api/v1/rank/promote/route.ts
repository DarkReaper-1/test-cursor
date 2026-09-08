import { NextResponse } from "next/server";
import { promoteRankSchema } from "@/server/validators";
import { getSessionAccountId } from "@/server/auth/session";
import { getMe } from "@/server/services/identity";
import { acceptNextRank } from "@/server/services/rank-promotion";
import { fromUnknown, jsonError } from "@/server/http/errors";

export async function POST(request: Request) {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return jsonError(401, "UNAUTHORIZED", "Sign in required.");
    }
    const player = await getMe(accountId);
    let raw: unknown = {};
    const text = await request.text();
    if (text.trim()) {
      raw = JSON.parse(text) as unknown;
    }
    promoteRankSchema.parse(raw);
    const result = await acceptNextRank({ playerId: player.id });
    return NextResponse.json(result);
  } catch (err) {
    return fromUnknown(err);
  }
}
