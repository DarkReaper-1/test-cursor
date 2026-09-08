import { NextResponse } from "next/server";
import { clearSessionCookieOnResponse } from "@/server/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearSessionCookieOnResponse(response);
}
