import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { hashPassword } from "../lib/auth";
import { completeToday } from "../lib/complete";
import { createOperatorCharacter } from "../lib/seed";
import { getOrCreateToday } from "../lib/today";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

describeDb("identity and completion loop", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers an operator, completes today, and ignores a second grant without a new key", async () => {
    const email = `op-${randomUUID()}@helix.test`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword("password12"),
        profile: {
          create: {
            onboarding: {
              goal: "consistency",
              equipment: "none",
              minutes: 20,
              experience: "beginner",
              constraints: "",
            },
            onboardingCompletedAt: new Date(),
          },
        },
      },
    });
    await createOperatorCharacter(prisma, user.id);
    const loaded = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { profile: true, character: { include: { scores: { include: { definition: true } } } } },
    });

    const today = await getOrCreateToday(prisma, loaded);
    expect(today.quest.category).toBe("main");

    const key = randomUUID();
    const first = await completeToday(prisma, loaded, {
      idempotencyKey: key,
      questId: today.quest.id,
      sets: [
        { exerciseKey: "push_up", load: 0, reps: 10 },
        { exerciseKey: "squat", load: 0, reps: 10 },
        { exerciseKey: "hinge", load: 0, reps: 10 },
      ],
      xp: 99999,
    });
    expect(first.granted).toBe(true);
    expect(first.replay).toBe(false);
    expect(first.xp).toBeGreaterThan(0);
    expect(first.xp).toBeLessThan(400);

    const reloaded = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { profile: true, character: { include: { scores: { include: { definition: true } } } } },
    });
    const replay = await completeToday(prisma, reloaded, {
      idempotencyKey: key,
      questId: today.quest.id,
      sets: [{ exerciseKey: "push_up", load: 0, reps: 10 }],
    });
    expect(replay.replay).toBe(true);
    expect(replay.xp).toBe(first.xp);

    const other = await prisma.user.create({
      data: {
        email: `other-${randomUUID()}@helix.test`,
        passwordHash: await hashPassword("password12"),
      },
    });
    await createOperatorCharacter(prisma, other.id);
    const otherLoaded = await prisma.user.findUniqueOrThrow({
      where: { id: other.id },
      include: { profile: true, character: { include: { scores: { include: { definition: true } } } } },
    });
    await expect(
      completeToday(prisma, otherLoaded, {
        idempotencyKey: randomUUID(),
        questId: today.quest.id,
        sets: [{ exerciseKey: "push_up", load: 0, reps: 8 }],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("creates a recovery directive the day after a miss", async () => {
    const email = `miss-${randomUUID()}@helix.test`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword("password12"),
        profile: {
          create: {
            timezone: "UTC",
            onboarding: {
              goal: "strength",
              equipment: "gym",
              minutes: 45,
              experience: "intermediate",
              constraints: "",
            },
            onboardingCompletedAt: new Date(),
          },
        },
      },
    });
    await createOperatorCharacter(prisma, user.id);
    const loaded = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { profile: true, character: { include: { scores: { include: { definition: true } } } } },
    });
    const monday = new Date("2026-08-17T12:00:00.000Z");
    await getOrCreateToday(prisma, loaded, monday);
    const tuesday = new Date("2026-08-18T12:00:00.000Z");
    const next = await getOrCreateToday(prisma, loaded, tuesday);
    expect(next.quest.category).toBe("recovery");
    expect(next.quest.title).toBe("The Return Path");
  });

  it("progresses bodyweight reps from the last completed session", async () => {
    const email = `prog-${randomUUID()}@helix.test`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword("password12"),
        profile: {
          create: {
            timezone: "UTC",
            onboarding: {
              goal: "consistency",
              equipment: "none",
              minutes: 20,
              experience: "beginner",
              constraints: "",
            },
            onboardingCompletedAt: new Date(),
          },
        },
      },
    });
    await createOperatorCharacter(prisma, user.id);
    const loaded = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { profile: true, character: { include: { scores: { include: { definition: true } } } } },
    });
    const monday = new Date("2026-08-17T12:00:00.000Z");
    const first = await getOrCreateToday(prisma, loaded, monday);
    await completeToday(prisma, loaded, {
      idempotencyKey: randomUUID(),
      questId: first.quest.id,
      sets: ["push_up", "squat", "hinge"].flatMap((exerciseKey) =>
        [10, 10, 10].map((reps) => ({ exerciseKey, load: 0, reps })),
      ),
    });
    const tuesday = new Date("2026-08-18T12:00:00.000Z");
    const next = await getOrCreateToday(prisma, loaded, tuesday);
    expect(next.quest.category).toBe("main");
    const payload = next.quest.payload as { exercises: { key: string; targetReps: number }[] };
    expect(payload.exercises.find((item) => item.key === "push_up")?.targetReps).toBe(11);
    expect(next.coach.why.toLowerCase()).toContain("history");
  });
});
