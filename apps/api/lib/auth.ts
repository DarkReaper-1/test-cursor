import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SALT_ROUNDS = 10;

export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecret());
}

export async function readAccessToken(token: string): Promise<{ userId: string; email: string }> {
  const { payload } = await jwtVerify(token, getAuthSecret());
  const userId = payload.sub;
  const email = payload.email;
  if (!userId || typeof email !== "string") {
    throw new Error("invalid token");
  }
  return { userId, email };
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice(7).trim() || null;
}
