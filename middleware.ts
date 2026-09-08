import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "system_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
}

async function isSignedIn(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token || !process.env.AUTH_SECRET) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/api/") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico"
  ) {
    return NextResponse.next();
  }
  const signedIn = await isSignedIn(request);
  const isAuthPage = path === "/sign-in" || path === "/register";
  if (!signedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  if (signedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
