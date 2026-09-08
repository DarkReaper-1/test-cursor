import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { completeWorkout } from "@/server/services/progression";
import { register } from "@/server/services/identity";
import { getAchievementBoard } from "@/server/services/achievement";
import { listActiveExercises } from "@/server/repositories/exercise";
import { POST as rejectUnlock } from "@/app/api/v1/achievements/[id]/unlock/route";
import { POST as rejectProgress } from "@/app/api/v1/achievements/[id]/progress/route";
import { ACHIEVEMENT_CATALOG } from "@/lib/constants/achievements";
import { levelFromTotalXp } from "@/server/services/level";
import { rankFromLevel } from "@/server/services/rank";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("achievement system integration", () => {
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
      email: `a-${suffix}@system.test`,
      password: "operator-1",
      username: `a_${suffix.replace(/-/g, "").slice(0, 12)}`,
      timezone: "UTC",
    });
  }

  async function exercise() {
    const catalog = await listActiveExercises(db);
    const push = catalog.find((row) => row.slug === "push_up")!;
    const squat = catalog.find((row) => row.slug === "squat")!;
    const hinge = catalog.find((row) => row.slug === "hinge")!;
    return { push, squat, hinge };
  }

  it("creates exactly one instance per catalog key", async () => {
    const { accountId, player } = await makePlayer();
    const first = await getAchievementBoard(accountId);
    const second = await getAchievementBoard(accountId);
    const keys = [...first.milestones, ...first.streak, ...first.mastery].map((row) => row.key);
    expect(keys.sort()).toEqual(ACHIEVEMENT_CATALOG.map((entry) => entry.key).sort());
    expect(second.milestones.map((row) => row.id)).toEqual(first.milestones.map((row) => row.id));
    const rows = await db.playerAchievement.findMany({ where: { playerId: player.id } });
    expect(rows).toHaveLength(7);
    expect(new Set(rows.map((row) => row.key)).size).toBe(7);
  });

  it("unlocks First Awakening on the first workout and grants XP once", async () => {
    const { accountId, player } = await makePlayer();
    const { hinge } = await exercise();
    const key = randomUUID();
    const first = await completeWorkout({
      playerId: player.id,
      idempotencyKey: key,
      durationSec: 900,
      exercises: [{ exerciseId: hinge.id, sets: 2, reps: 8, weight: 0 }],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    expect(first.achievementUnlocks.some((row) => row.key === "first_awakening")).toBe(true);
    expect(first.achievementXp).toBeGreaterThanOrEqual(50);
    expect(first.player.xp).toBe(first.xp + first.questXp + first.achievementXp);
    expect(first.player.level).toBe(levelFromTotalXp(first.player.xp));
    expect(first.player.rank).toBe(rankFromLevel(first.player.level));

    const replay = await completeWorkout({
      playerId: player.id,
      idempotencyKey: key,
      durationSec: 900,
      exercises: [{ exerciseId: hinge.id, sets: 9, reps: 50, weight: 0 }],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    expect(replay.replay).toBe(true);
    expect(replay.achievementXp).toBe(first.achievementXp);
    expect(replay.player.xp).toBe(first.player.xp);

    const xpEvents = await db.xpEvent.findMany({
      where: { playerId: player.id, source: "ACHIEVEMENT" },
    });
    const awakening = await db.playerAchievement.findFirst({
      where: { playerId: player.id, key: "first_awakening" },
    });
    expect(awakening?.status).toBe("UNLOCKED");
    expect(xpEvents.filter((row) => row.idempotencyKey === `achievement:${awakening?.id}:unlock`)).toHaveLength(1);
  });

  it("unlocks Circuit when rank reaches CIRCUIT in the same transaction", async () => {
    const { player } = await makePlayer();
    const { push, squat } = await exercise();
    let last = await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 1200,
      exercises: [
        { exerciseId: push.id, sets: 3, reps: 10, weight: 0 },
        { exerciseId: squat.id, sets: 3, reps: 8, weight: 0 },
      ],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    if (last.player.rank === "INITIATE") {
      last = await completeWorkout({
        playerId: player.id,
        idempotencyKey: randomUUID(),
        durationSec: 1200,
        exercises: [
          { exerciseId: push.id, sets: 3, reps: 10, weight: 0 },
          { exerciseId: squat.id, sets: 3, reps: 8, weight: 0 },
        ],
        now: new Date("2026-09-09T12:00:00Z"),
      });
    }
    expect(["CIRCUIT", "VOLTAGE", "KEYSTONE", "MERIDIAN", "SOVEREIGN"]).toContain(last.player.rank);
    const circuit = await db.playerAchievement.findFirst({
      where: { playerId: player.id, key: "circuit" },
    });
    expect(circuit?.status).toBe("UNLOCKED");
  });

  it("unlocks Limit Breaker from a server-side performance improvement, not XP", async () => {
    const { player } = await makePlayer();
    const { hinge } = await exercise();
    await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 900,
      exercises: [{ exerciseId: hinge.id, sets: 2, reps: 8, weight: 0 }],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    const improved = await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 600,
      exercises: [{ exerciseId: hinge.id, sets: 4, reps: 12, weight: 0 }],
      now: new Date("2026-09-09T12:00:00Z"),
    });
    expect(improved.achievementUnlocks.some((row) => row.key === "limit_breaker")).toBe(true);
    const row = await db.playerAchievement.findFirst({
      where: { playerId: player.id, key: "limit_breaker" },
    });
    expect(row?.status).toBe("UNLOCKED");
  });

  it("unlocks Iron Will at 7 days and keeps it after the streak breaks", async () => {
    const { player } = await makePlayer();
    const { hinge } = await exercise();
    let last;
    for (let day = 8; day <= 14; day += 1) {
      last = await completeWorkout({
        playerId: player.id,
        idempotencyKey: randomUUID(),
        durationSec: 900,
        exercises: [{ exerciseId: hinge.id, sets: 2, reps: 8, weight: 0 }],
        now: new Date(`2026-09-${String(day).padStart(2, "0")}T12:00:00Z`),
      });
    }
    expect(last?.player.streak).toBe(7);
    expect(last?.achievementUnlocks.some((row) => row.key === "iron_will")).toBe(true);
    const broken = await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 900,
      exercises: [{ exerciseId: hinge.id, sets: 2, reps: 8, weight: 0 }],
      now: new Date("2026-09-16T12:00:00Z"),
    });
    expect(broken.player.streak).toBe(1);
    const iron = await db.playerAchievement.findFirst({
      where: { playerId: player.id, key: "iron_will" },
    });
    expect(iron?.status).toBe("UNLOCKED");
    expect(iron?.unlockedAt).toBeTruthy();
  });

  it("unlocks Unbreakable at 30 days and Centurion at 100 workouts", async () => {
    const { player } = await makePlayer();
    const { hinge } = await exercise();
    const start = new Date("2026-01-01T12:00:00Z");
    for (let i = 0; i < 99; i += 1) {
      await db.workout.create({
        data: {
          playerId: player.id,
          durationSec: 900,
          completed: true,
          xpEarned: 20,
          completedAt: new Date(start.getTime() + i * 86_400_000),
          idempotencyKey: randomUUID(),
        },
      });
    }
    await db.player.update({
      where: { id: player.id },
      data: {
        streak: 29,
        lastActivityDate: new Date("2026-04-09T00:00:00Z"),
      },
    });
    const result = await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 900,
      exercises: [{ exerciseId: hinge.id, sets: 2, reps: 8, weight: 0 }],
      now: new Date("2026-04-10T12:00:00Z"),
    });
    const keys = result.achievementUnlocks.map((row) => row.key);
    expect(keys).toEqual(
      expect.arrayContaining(["centurion", "unbreakable", "first_awakening", "circuit"]),
    );
    expect(result.player.streak).toBe(30);
    expect(result.player.xp).toBe(result.xp + result.questXp + result.achievementXp);
    expect(result.player.level).toBe(levelFromTotalXp(result.player.xp));
    expect(result.player.rank).toBe(rankFromLevel(result.player.level));
    const rows = await db.playerAchievement.findMany({
      where: { playerId: player.id, key: { in: ["centurion", "unbreakable"] } },
    });
    expect(rows.every((row) => row.status === "UNLOCKED")).toBe(true);
  });

  it("rejects client achievement mutation", async () => {
    const unlock = await rejectUnlock();
    const progress = await rejectProgress();
    expect(unlock.status).toBe(405);
    expect(progress.status).toBe(405);
  });
});
