import { NextResponse } from "next/server";
import { registerSchema } from "@/server/validators";
import { AuthError, register } from "@/server/services/identity";
import { setSessionCookie } from "@/server/auth/session";
import { fromUnknown } from "@/server/http/errors";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const result = await register(body);
    await setSessionCookie(result.accountId);
    return NextResponse.json({ player: result.player });
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.code === "INVALID_CREDENTIALS" ? 401 : 409;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    return fromUnknown(err);
  }
}
