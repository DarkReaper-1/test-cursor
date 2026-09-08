import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/server/auth/session";
import { getLatestEvaluation } from "@/server/services/progression";
import { jsonError } from "@/server/http/errors";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return jsonError(401, "UNAUTHORIZED", "Sign in required.");
  }
  const result = await getLatestEvaluation(accountId);
  if (!result) {
    return jsonError(404, "NO_EVALUATION", "No evaluation on file.");
  }
  return NextResponse.json(result);
}
