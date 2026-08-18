import { NextResponse } from "next/server";

/** Completions require auth (Phase 2). Never accept client-supplied XP. */
export async function POST() {
  return NextResponse.json(
    {
      error: "UNAUTHORIZED",
      message: "Completions are server-authoritative and require a session.",
    },
    { status: 401 },
  );
}
