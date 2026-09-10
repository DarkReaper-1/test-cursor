import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { prepareDatabase } from "@/server/db/ready";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "disconnected";
  try {
    await prepareDatabase();
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "disconnected";
  }
  return NextResponse.json({
    ok: database === "connected",
    service: "system",
    version: "0.1.0",
    database,
    time: new Date().toISOString(),
  });
}
