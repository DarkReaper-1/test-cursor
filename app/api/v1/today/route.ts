import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/server/auth/session";
import { getToday } from "@/server/services/today";
import { jsonError } from "@/server/http/errors";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return jsonError(401, "UNAUTHORIZED", "Sign in required.");
  }
  const payload = await getToday(accountId);
  return NextResponse.json(payload);
}
