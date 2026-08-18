import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { bearerToken, readAccessToken } from "./auth";
import { getPrisma } from "./prisma";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof Error && error.message.includes("AUTH_SECRET")) {
    return NextResponse.json(
      { error: "UNCONFIGURED", message: "Server auth is not configured." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "INTERNAL", message: "Unexpected error." }, { status: 500 });
}

export function requirePrisma(): PrismaClient {
  const prisma = getPrisma();
  if (!prisma) {
    throw new HttpError(503, "UNCONFIGURED", "Database is not configured.");
  }
  return prisma;
}

export async function requireUser(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    throw new HttpError(401, "UNAUTHORIZED", "Sign in required.");
  }
  let claims: { userId: string; email: string };
  try {
    claims = await readAccessToken(token);
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Session expired.");
  }
  const prisma = requirePrisma();
  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    include: { profile: true, character: { include: { scores: { include: { definition: true } } } } },
  });
  if (!user || user.status !== "active") {
    throw new HttpError(401, "UNAUTHORIZED", "Account not found.");
  }
  return { prisma, user };
}
