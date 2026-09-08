import { NextResponse } from "next/server";
import { loginSchema } from "@/server/validators";
import { AuthError, login } from "@/server/services/identity";
import { setSessionCookie } from "@/server/auth/session";
import { fromUnknown } from "@/server/http/errors";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const result = await login(body);
    await setSessionCookie(result.accountId);
    return NextResponse.json({ player: result.player });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 401 });
    }
    return fromUnknown(err);
  }
}
