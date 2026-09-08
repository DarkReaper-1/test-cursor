import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { attachSessionCookie, SESSION_COOKIE } from "@/server/auth/session";

describe("session cookie", () => {
  it("attaches system_session to the JSON response so login can leave sign-in", async () => {
    const response = NextResponse.json({ ok: true });
    await attachSessionCookie(response, "account-test");
    const cookie = response.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe("/");
  });
});
