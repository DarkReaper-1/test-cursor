import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { completeWorkout } from "@/server/services/progression";
import { acceptNextRank, getPromotionForAccount } from "@/server/services/rank-promotion";
import { register } from "@/server/services/identity";
import { listActiveExercises } from "@/server/repositories/exercise";
import { promoteRankSchema } from "@/server/validators";
import { levelFromTotalXp } from "@/server/services/level";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("rank promotion", () => {
  const db = new PrismaClient();

  beforeAll(async () => {
    await db.$connect();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function makePlayer() {
    const suffix = randomUUID().slice(0, 8);
    return register({
      email: `r-${suffix}@system.test`,
      password: "operator-1",
      username: `r_${suffix.replace(/-/g, "").slice(0, 12)}`,
      timezone: "UTC",
    });
  }

  async function hingeId() {
    const catalog = await listActiveExercises(db);
    const hinge = catalog.find((row) => row.slug === "hinge");
    const push = catalog.find((row) => row.slug === "push_up");
    return { hinge: hinge!, push: push! };
  }

  async function trainDays(
    playerId: string,
    exerciseId: string,
    days: number,
    start = new Date("2026-01-01T12:00:00Z"),
  ) {
    let last = null;
    for (let i = 0; i < days; i += 1) {
      last = await completeWorkout({
        playerId,
        idempotencyKey: randomUUID(),
        durationSec: 1200,
        exercises: [
          { exerciseId, sets: 3, reps: 10, weight: 0 },
        ],
        now: new Date(start.getTime() + i * 86_400_000),
      });
    }
    return last!;
  }

  it("keeps INITIATE when XP crosses Circuit’s level gate", async () => {
    const { player } = await makePlayer();
    const { hinge } = await hingeId();
    const result = await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 1800,
      exercises: [{ exerciseId: hinge.id, sets: 5, reps: 15, weight: 0 }],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    expect(result.player.rank).toBe("INITIATE");
    expect(result.rankUp).toBe(false);
    expect(result.events.some((row) => row.type === "RANK_UP")).toBe(false);
    const circuit = await db.playerAchievement.findFirst({
      where: { playerId: player.id, key: "circuit" },
    });
    expect(circuit?.status).not.toBe("UNLOCKED");
  });

  it("unlocks Circuit only after accepted rank, and does not auto-accept Voltage", async () => {
    const { accountId, player } = await makePlayer();
    const { hinge } = await hingeId();
    const trained = await trainDays(player.id, hinge.id, 25);
    expect(trained.player.rank).toBe("INITIATE");
    expect(trained.promotion.available).toBe(true);
    expect(trained.promotion.to).toBe("CIRCUIT");

    const before = await db.playerAchievement.findFirst({
      where: { playerId: player.id, key: "circuit" },
    });
    expect(before?.status).not.toBe("UNLOCKED");

    const accepted = await acceptNextRank({ playerId: player.id, now: new Date("2026-01-26T12:00:00Z") });
    expect(accepted.replay).toBe(false);
    expect(accepted.from).toBe("INITIATE");
    expect(accepted.to).toBe("CIRCUIT");
    expect(accepted.identity).toBe("The circuit holds.");
    expect(accepted.player.rank).toBe("CIRCUIT");
    expect(accepted.player.xp).toBeGreaterThan(0);
    expect(accepted.player.level).toBe(levelFromTotalXp(accepted.player.xp));
    expect(accepted.achievementUnlocks.some((row) => row.key === "circuit")).toBe(true);
    expect(accepted.achievementXp).toBe(150);
    expect(accepted.events.some((row) => row.type === "RANK_UP")).toBe(true);
    const rankUp = accepted.events.find((row) => row.type === "RANK_UP");
    expect(rankUp?.payload).toMatchObject({ from: "INITIATE", to: "CIRCUIT" });
    expect(rankUp?.payload).toHaveProperty("level");
    expect(rankUp?.payload).toHaveProperty("xp");
    expect(rankUp?.payload).toHaveProperty("requirementSnapshot");

    const circuit = await db.playerAchievement.findFirst({
      where: { playerId: player.id, key: "circuit" },
    });
    expect(circuit?.status).toBe("UNLOCKED");

    expect(accepted.player.rank).not.toBe("VOLTAGE");
    expect(accepted.promotion.to).toBe("VOLTAGE");
    expect(accepted.promotion.available).toBe(true);

    const voltage = await db.playerAchievement.findFirst({
      where: { playerId: player.id, key: "voltage" },
    });
    expect(voltage?.status).not.toBe("UNLOCKED");

    const history = await db.rankPromotion.findMany({ where: { playerId: player.id } });
    expect(history).toHaveLength(1);
    expect(history[0]?.toRank).toBe("CIRCUIT");

    const offered = await getPromotionForAccount(accountId);
    expect(offered.available).toBe(true);
    expect(offered.to).toBe("VOLTAGE");
  });

  it("rejects promotion after the current streak breaks", async () => {
    const { player } = await makePlayer();
    const { hinge } = await hingeId();
    await trainDays(player.id, hinge.id, 10);
    const broken = await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 1200,
      exercises: [{ exerciseId: hinge.id, sets: 3, reps: 10, weight: 0 }],
      now: new Date("2026-01-13T12:00:00Z"),
    });
    expect(broken.player.streak).toBe(1);
    expect(broken.player.rank).toBe("INITIATE");
    expect(broken.promotion.available).toBe(false);
    await expect(acceptNextRank({ playerId: player.id })).rejects.toThrow("PROMOTION_NOT_AVAILABLE");
  });

  it("is idempotent under concurrent accept", async () => {
    const { player } = await makePlayer();
    const { hinge } = await hingeId();
    await trainDays(player.id, hinge.id, 10);
    const [a, b] = await Promise.all([
      acceptNextRank({ playerId: player.id, now: new Date("2026-01-12T12:00:00Z") }),
      acceptNextRank({ playerId: player.id, now: new Date("2026-01-12T12:00:00Z") }),
    ]);
    const rows = await db.rankPromotion.findMany({ where: { playerId: player.id } });
    expect(rows).toHaveLength(1);
    expect([a.replay, b.replay].sort()).toEqual([false, true]);
    expect(a.to).toBe("CIRCUIT");
    expect(b.to).toBe("CIRCUIT");
    const updated = await db.player.findUnique({ where: { id: player.id } });
    expect(updated?.rank).toBe("CIRCUIT");
  });

  it("rejects a second sequential accept when the next rank is not available", async () => {
    const { player } = await makePlayer();
    const { hinge } = await hingeId();
    await trainDays(player.id, hinge.id, 10);
    const first = await acceptNextRank({ playerId: player.id });
    expect(first.to).toBe("CIRCUIT");
    expect(first.promotion.available).toBe(false);
    await expect(acceptNextRank({ playerId: player.id })).rejects.toThrow("PROMOTION_NOT_AVAILABLE");
  });

  it("does not let the client choose a later rank", async () => {
    const { player } = await makePlayer();
    const { hinge } = await hingeId();
    await trainDays(player.id, hinge.id, 10);
    const accepted = await acceptNextRank({ playerId: player.id });
    expect(accepted.to).toBe("CIRCUIT");
    expect(accepted.player.rank).toBe("CIRCUIT");
    expect(promoteRankSchema.parse({ rank: "SOVEREIGN", xp: 9999 })).toEqual({});
  });
});
