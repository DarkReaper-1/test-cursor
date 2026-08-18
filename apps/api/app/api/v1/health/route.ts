import { createAIProvider } from "@helix/ai";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function databaseStatus(): Promise<"connected" | "disconnected" | "unconfigured"> {
  const prisma = getPrisma();
  if (!prisma) {
    return "unconfigured";
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "connected";
  } catch {
    return "disconnected";
  }
}

export async function GET() {
  const database = await databaseStatus();
  return NextResponse.json({
    ok: true,
    service: "helix-api",
    version: "0.1.0",
    time: new Date().toISOString(),
    aiProvider: createAIProvider().id,
    database,
  });
}
