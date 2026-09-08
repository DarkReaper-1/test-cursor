import { NextResponse } from "next/server";
import { getSessionAccountId } from "@/server/auth/session";
import { listCatalog } from "@/server/services/catalog";
import { jsonError } from "@/server/http/errors";

export async function GET() {
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return jsonError(401, "UNAUTHORIZED", "Sign in required.");
  }
  const exercises = await listCatalog();
  return NextResponse.json({ exercises });
}
