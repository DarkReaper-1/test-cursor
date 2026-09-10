import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export function fromUnknown(err: unknown) {
  if (err instanceof ZodError) {
    const path = err.issues[0]?.path[0];
    if (path === "username") {
      return jsonError(
        400,
        "INVALID_CALLSIGN",
        "Callsign must be 3–24 letters, numbers, or underscores. No spaces.",
      );
    }
    if (path === "email") {
      return jsonError(400, "INVALID_EMAIL", "Enter a valid email. Playtest: tester@system.test");
    }
    if (path === "password") {
      return jsonError(400, "INVALID_PASSWORD", "Password must be at least 8 characters. Playtest: testfile1");
    }
    return jsonError(400, "INVALID", "Request did not match the contract.");
  }
  const message = err instanceof Error ? err.message : "Request failed";
  const name = err instanceof Error ? err.name : "";
  if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Sign in required.");
  if (message === "EMAIL_TAKEN") return jsonError(409, "EMAIL_TAKEN", "That email is already activated.");
  if (message === "USERNAME_TAKEN") return jsonError(409, "USERNAME_TAKEN", "That callsign is taken.");
  if (message === "INVALID_CREDENTIALS") return jsonError(401, "INVALID_CREDENTIALS", "Email or password is wrong.");
  if (message === "IDEMPOTENCY_CONFLICT") return jsonError(409, "IDEMPOTENCY_CONFLICT", "Key already used.");
  if (message === "UNKNOWN_EXERCISE") return jsonError(400, "UNKNOWN_EXERCISE", "Exercise is not in the catalog.");
  if (message === "PROMOTION_NOT_AVAILABLE") {
    return jsonError(409, "PROMOTION_NOT_AVAILABLE", "No rank promotion is available.");
  }
  if (
    message === "AUTH_SECRET is not set" ||
    message.includes("Can't reach database") ||
    message.includes("DATABASE_URL") ||
    (typeof name === "string" && name.includes("PrismaClientInitialization"))
  ) {
    return jsonError(
      503,
      "DATABASE",
      "SYSTEM could not open its save file. Restart the app; the SQLite database is created automatically.",
    );
  }
  return jsonError(500, "ERROR", "SYSTEM could not complete that.");
}
