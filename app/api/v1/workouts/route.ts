import { NextResponse } from "next/server";
import { completeWorkoutSchema } from "@/server/validators";
import { getSessionAccountId } from "@/server/auth/session";
import { completeWorkout } from "@/server/services/progression";
import { getMe } from "@/server/services/identity";
import { fromUnknown, jsonError } from "@/server/http/errors";

export async function POST(request: Request) {
  try {
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return jsonError(401, "UNAUTHORIZED", "Sign in required.");
    }
    const player = await getMe(accountId);
    const body = completeWorkoutSchema.parse(await request.json());
    const result = await completeWorkout({
      playerId: player.id,
      idempotencyKey: body.idempotencyKey,
      durationSec: body.durationSec,
      exercises: body.exercises,
    });
    return NextResponse.json(result);
  } catch (err) {
    return fromUnknown(err);
  }
}
