import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export function fromUnknown(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError(400, "INVALID", "Request did not match the contract.");
  }
  const message = err instanceof Error ? err.message : "Request failed";
  if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Sign in required.");
  if (message === "EMAIL_TAKEN") return jsonError(409, "EMAIL_TAKEN", "That email is already activated.");
  if (message === "USERNAME_TAKEN") return jsonError(409, "USERNAME_TAKEN", "That callsign is taken.");
  if (message === "INVALID_CREDENTIALS") return jsonError(401, "INVALID_CREDENTIALS", "Email or password is wrong.");
  if (message === "IDEMPOTENCY_CONFLICT") return jsonError(409, "IDEMPOTENCY_CONFLICT", "Key already used.");
  if (message === "UNKNOWN_EXERCISE") return jsonError(400, "UNKNOWN_EXERCISE", "Exercise is not in the catalog.");
  return jsonError(500, "ERROR", "SYSTEM could not complete that.");
}
