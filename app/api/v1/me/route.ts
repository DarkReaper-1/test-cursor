import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/server/auth/session";
import { getMe } from "@/server/services/identity";
import { jsonError } from "@/server/http/errors";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return jsonError(401, "UNAUTHORIZED", "Sign in required.");
  }
  const player = await getMe(accountId);
  return NextResponse.json({ player });
}
