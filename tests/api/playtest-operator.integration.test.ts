import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { register } from "@/server/services/identity";
import { PLAYTEST_OPERATOR } from "@/lib/constants/playtest";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("playtest operator", () => {
  const db = new PrismaClient();

  beforeAll(async () => {
    await db.$connect();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("lets the seeded tester file register twice without a false callsign error", async () => {
    const first = await register({
      email: PLAYTEST_OPERATOR.email,
      password: PLAYTEST_OPERATOR.password,
      username: PLAYTEST_OPERATOR.username,
      timezone: "UTC",
    });
    expect(first.player.username).toBe("tester");
    const second = await register({
      email: PLAYTEST_OPERATOR.email,
      password: PLAYTEST_OPERATOR.password,
      username: PLAYTEST_OPERATOR.username,
      timezone: "UTC",
    });
    expect(second.player.id).toBe(first.player.id);
    expect(second.player.rank).toBe("INITIATE");
  });
});
