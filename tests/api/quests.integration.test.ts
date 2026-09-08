import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { completeWorkout } from "@/server/services/progression";
import { register } from "@/server/services/identity";
import { getTodayQuests, getWeekQuests } from "@/server/services/quest";
import { listActiveExercises } from "@/server/repositories/exercise";
import { POST as rejectQuestProgress } from "@/app/api/v1/quests/[id]/progress/route";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("quest system integration", () => {
  const db = new PrismaClient();

  beforeAll(async () => {
    await db.$connect();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function makePlayer(timezone = "UTC") {
    const suffix = randomUUID().slice(0, 8);
    return register({
      email: `q-${suffix}@system.test`,
      password: "operator-1",
      username: `q_${suffix.replace(/-/g, "").slice(0, 12)}`,
      timezone,
    });
  }

  function bySlug() {
    return listActiveExercises(db).then((rows) => {
      const map = new Map(rows.map((row) => [row.slug, row]));
      return {
        push: map.get("push_up")!,
        squat: map.get("squat")!,
        walk: map.get("walk")!,
        hinge: map.get("hinge")!,
      };
    });
  }

  it("creates a deterministic daily set and does not duplicate on refresh", async () => {
    const { accountId } = await makePlayer();
    const first = await getTodayQuests(accountId, new Date("2026-09-08T12:00:00Z"));
    const second = await getTodayQuests(accountId, new Date("2026-09-08T18:00:00Z"));
    expect(first.quests).toHaveLength(3);
    expect(second.quests.map((quest) => quest.id)).toEqual(first.quests.map((quest) => quest.id));
    expect(second.quests.map((quest) => quest.key)).toEqual(first.quests.map((quest) => quest.key));
    expect(new Set(first.quests.map((quest) => quest.key)).size).toBe(3);
  });

  it("creates weekly quests that survive a daily boundary", async () => {
    const { accountId, player } = await makePlayer("America/New_York");
    const monday = await getWeekQuests(accountId, new Date("2026-09-08T12:00:00Z"));
    const tuesday = await getWeekQuests(accountId, new Date("2026-09-09T12:00:00Z"));
    expect(monday.quests.length).toBeGreaterThanOrEqual(1);
    expect(monday.quests.length).toBeLessThanOrEqual(2);
    expect(tuesday.periodKey).toBe(monday.periodKey);
    expect(tuesday.quests.map((quest) => quest.id)).toEqual(monday.quests.map((quest) => quest.id));
    const iron = monday.quests.find((quest) => quest.key === "iron_week");
    expect(iron?.xpReward).toBe(400);
    const stored = await db.playerQuest.findFirst({
      where: { playerId: player.id, key: "iron_week" },
    });
    expect(stored?.xpReward).toBe(400);
  });

  it("uses the local timezone day, not UTC midnight", async () => {
    const { accountId } = await makePlayer("America/New_York");
    const lateSunday = await getTodayQuests(accountId, new Date("2026-09-08T03:30:00Z"));
    const monday = await getTodayQuests(accountId, new Date("2026-09-08T04:30:00Z"));
    expect(lateSunday.periodKey).toBe("2026-09-07");
    expect(monday.periodKey).toBe("2026-09-08");
    expect(monday.quests.map((quest) => quest.id)).not.toEqual(lateSunday.quests.map((quest) => quest.id));
  });

  it("advances and completes quests from workout data, granting quest XP once", async () => {
    const { accountId, player } = await makePlayer();
    const exercises = await bySlug();
    await getTodayQuests(accountId, new Date("2026-09-08T12:00:00Z"));

    const first = await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 1200,
      exercises: [
        { exerciseId: exercises.push.id, sets: 3, reps: 10, weight: 0 },
        { exerciseId: exercises.squat.id, sets: 3, reps: 8, weight: 0 },
      ],
      now: new Date("2026-09-08T12:00:00Z"),
    });

    expect(first.questCompletions.map((row) => row.key).sort()).toEqual(
      ["daily_training", "foundation_squats", "upper_pushups"].sort(),
    );
    expect(first.questXp).toBe(80 + 90 + 80);
    expect(first.player.xp).toBe(first.xp + first.questXp + first.achievementXp);
    expect(first.events.some((event) => event.type === "QUEST_COMPLETED")).toBe(true);

    const today = await getTodayQuests(accountId, new Date("2026-09-08T12:05:00Z"));
    expect(today.completedCount).toBe(3);
    const week = await getWeekQuests(accountId, new Date("2026-09-08T12:05:00Z"));
    const iron = week.quests.find((quest) => quest.key === "iron_week");
    expect(iron?.progress).toBe(1);
    expect(iron?.status).toBe("ACTIVE");
    expect(iron?.xpReward).toBe(400);

    const second = await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 1200,
      exercises: [{ exerciseId: exercises.push.id, sets: 3, reps: 10, weight: 0 }],
      now: new Date("2026-09-08T15:00:00Z"),
    });
    expect(second.questCompletions.some((row) => row.key === "upper_pushups")).toBe(false);
    const xpEvents = await db.xpEvent.findMany({
      where: { playerId: player.id, source: "QUEST" },
    });
    expect(xpEvents).toHaveLength(3);
    expect(xpEvents.reduce((sum, row) => sum + row.amount, 0)).toBe(first.questXp);

    const todayAfter = await getTodayQuests(accountId, new Date("2026-09-08T15:00:00Z"));
    const pushQuest = todayAfter.quests.find((quest) => quest.key === "upper_pushups");
    expect(pushQuest?.progress).toBe(pushQuest?.target);
    expect(pushQuest?.status).toBe("COMPLETED");
  });

  it("does not advance quests or grant XP again on workout replay", async () => {
    const { player } = await makePlayer();
    const exercises = await bySlug();
    const key = randomUUID();
    const first = await completeWorkout({
      playerId: player.id,
      idempotencyKey: key,
      durationSec: 900,
      exercises: [{ exerciseId: exercises.hinge.id, sets: 2, reps: 8, weight: 0 }],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    const replay = await completeWorkout({
      playerId: player.id,
      idempotencyKey: key,
      durationSec: 900,
      exercises: [{ exerciseId: exercises.hinge.id, sets: 9, reps: 50, weight: 0 }],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    expect(replay.replay).toBe(true);
    expect(replay.xp).toBe(first.xp);
    expect(replay.questXp).toBe(first.questXp);
    expect(replay.player.xp).toBe(first.player.xp);
    expect(replay.questCompletions).toEqual(first.questCompletions);
    const xpEvents = await db.xpEvent.findMany({ where: { playerId: player.id } });
    expect(xpEvents.filter((row) => row.source === "WORKOUT")).toHaveLength(1);
    expect(xpEvents.filter((row) => row.source === "QUEST")).toHaveLength(
      first.questCompletions.length,
    );
  });

  it("keeps expired daily quests in history without deleting them", async () => {
    const { accountId, player } = await makePlayer("UTC");
    const monday = await getTodayQuests(accountId, new Date("2026-09-07T12:00:00Z"));
    const tuesday = await getTodayQuests(accountId, new Date("2026-09-08T12:00:00Z"));
    expect(tuesday.periodKey).toBe("2026-09-08");
    expect(tuesday.quests.map((quest) => quest.id)).not.toEqual(monday.quests.map((quest) => quest.id));

    const stored = await db.playerQuest.findMany({
      where: { playerId: player.id, key: "foundation_squats" },
      orderBy: { periodKey: "asc" },
    });
    expect(stored).toHaveLength(2);
    const previous = stored.find((row) => row.periodKey === "2026-09-07");
    expect(previous?.status).toBe("EXPIRED");
    expect(previous?.completedAt).toBeNull();
  });

  it("rejects client-set quest progress", async () => {
    const response = await rejectQuestProgress();
    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body.error).toBe("METHOD_NOT_ALLOWED");
  });

  it("keeps next-day daily targets finishable from the 3x10 directive", async () => {
    const { accountId, player } = await makePlayer();
    const exercises = await bySlug();
    await completeWorkout({
      playerId: player.id,
      idempotencyKey: randomUUID(),
      durationSec: 1200,
      exercises: [
        { exerciseId: exercises.push.id, sets: 3, reps: 10, weight: 0 },
        { exerciseId: exercises.squat.id, sets: 3, reps: 8, weight: 0 },
      ],
      now: new Date("2026-09-08T12:00:00Z"),
    });
    const nextDay = await getTodayQuests(accountId, new Date("2026-09-09T12:00:00Z"));
    const squat = nextDay.quests.find((quest) => quest.key === "foundation_squats");
    const push = nextDay.quests.find((quest) => quest.key === "upper_pushups");
    expect(squat?.target).toBe(3);
    expect(push?.target).toBe(30);
    expect(nextDay.quests.find((quest) => quest.key === "daily_training")?.target).toBe(1);
  });
});
