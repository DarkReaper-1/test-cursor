import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/server/auth/session";
import { getPromotionForAccount } from "@/server/services/rank-promotion";
import { fromUnknown, jsonError } from "@/server/http/errors";

export async function GET() {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return jsonError(401, "UNAUTHORIZED", "Sign in required.");
    }
    const promotion = await getPromotionForAccount(accountId);
    return NextResponse.json({ promotion });
  } catch (err) {
    return fromUnknown(err);
  }
}
