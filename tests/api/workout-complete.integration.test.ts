import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { completeWorkout, getLatestEvaluation } from "@/server/services/progression";
import { register } from "@/server/services/identity";
import { listActiveExercises } from "@/server/repositories/exercise";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("completeWorkout integration", () => {
  const db = new PrismaClient();

  beforeAll(async () => {
    await db.$connect();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("grants server XP once and replays the same idempotency key", async () => {
    const suffix = randomUUID().slice(0, 8);
    const { accountId, player } = await register({
      email: `op-${suffix}@system.test`,
      password: "operator-1",
      username: `op_${suffix.replace(/-/g, "").slice(0, 12)}`,
      timezone: "UTC",
    });
    const catalog = await listActiveExercises(db);
    const exercise = catalog[0];
    expect(exercise).toBeTruthy();
    const key = randomUUID();
    const first = await completeWorkout({
      playerId: player.id,
      idempotencyKey: key,
      durationSec: 1200,
      exercises: [{ exerciseId: exercise!.id, sets: 3, reps: 10, weight: 0 }],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    expect(first.replay).toBe(false);
    expect(first.xp).toBeGreaterThan(0);
    expect(first.player.xp).toBe(first.xp + first.questXp + first.achievementXp);
    expect(first.before.level).toBe(1);
    expect(first.before.xp).toBe(0);
    expect(first.player.level).toBeGreaterThanOrEqual(first.before.level);
    expect(first.workoutId.length).toBeGreaterThan(0);
    expect(first.nextMilestone?.rank).toBe("CIRCUIT");

    const latest = await getLatestEvaluation(accountId);
    expect(latest?.workoutId).toBe(first.workoutId);
    expect(latest?.xp).toBe(first.xp);
    expect(latest?.before.level).toBe(first.before.level);
    expect(latest?.player.xp).toBe(first.player.xp);
    expect(latest?.achievementXp).toBe(first.achievementXp);

    const second = await completeWorkout({
      playerId: player.id,
      idempotencyKey: key,
      durationSec: 1200,
      exercises: [{ exerciseId: exercise!.id, sets: 3, reps: 10, weight: 999 }],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    expect(second.replay).toBe(true);
    expect(second.xp).toBe(first.xp);
    expect(second.player.xp).toBe(first.player.xp);
  });
});
