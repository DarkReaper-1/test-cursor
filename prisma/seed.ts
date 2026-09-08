import { PrismaClient } from "@prisma/client";
import { QUEST_CATALOG } from "../lib/constants/quests";
import { ACHIEVEMENT_CATALOG } from "../lib/constants/achievements";

const prisma = new PrismaClient();

const exercises = [
  {
    slug: "push_up",
    name: "Push-up",
    description: "Floor press. Keep the ribcage quiet.",
    muscleGroups: ["chest", "triceps", "shoulders"],
    difficulty: 2,
    equipment: ["none"],
    movementType: "push",
  },
  {
    slug: "squat",
    name: "Squat",
    description: "Sit between the heels. Stand with intent.",
    muscleGroups: ["quads", "glutes"],
    difficulty: 2,
    equipment: ["none"],
    movementType: "squat",
  },
  {
    slug: "hinge",
    name: "Hip hinge",
    description: "Push the hips back. Spine long.",
    muscleGroups: ["hamstrings", "glutes"],
    difficulty: 2,
    equipment: ["none"],
    movementType: "hinge",
  },
  {
    slug: "plank",
    name: "Plank",
    description: "Brace. Breathe without folding.",
    muscleGroups: ["core"],
    difficulty: 2,
    equipment: ["none"],
    movementType: "core",
  },
  {
    slug: "row",
    name: "Bodyweight row",
    description: "Pull the chest to a bar or table edge.",
    muscleGroups: ["back", "biceps"],
    difficulty: 3,
    equipment: ["none"],
    movementType: "pull",
  },
  {
    slug: "split_squat",
    name: "Split squat",
    description: "Rear knee toward the floor. Front heel heavy.",
    muscleGroups: ["quads", "glutes"],
    difficulty: 3,
    equipment: ["none"],
    movementType: "squat",
  },
  {
    slug: "walk",
    name: "Brisk walk",
    description: "Ten honest minutes. Arms swing.",
    muscleGroups: ["legs", "cardio"],
    difficulty: 1,
    equipment: ["none"],
    movementType: "locomotion",
  },
  {
    slug: "hip_bridge",
    name: "Hip bridge",
    description: "Squeeze at the top. Do not arch the neck.",
    muscleGroups: ["glutes", "hamstrings"],
    difficulty: 1,
    equipment: ["none"],
    movementType: "hinge",
  },
];

async function main() {
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { slug: exercise.slug },
      update: exercise,
      create: exercise,
    });
  }

  for (const entry of QUEST_CATALOG) {
    await prisma.questDefinition.upsert({
      where: { key: entry.key },
      update: {
        tier: entry.tier,
        type: entry.type,
        title: entry.title,
        description: entry.descriptionTemplate,
        baseTarget: entry.baseTarget,
        xpReward: entry.xpReward,
        predicate: entry.predicate,
        active: true,
        sortOrder: entry.sortOrder,
      },
      create: {
        key: entry.key,
        tier: entry.tier,
        type: entry.type,
        title: entry.title,
        description: entry.descriptionTemplate,
        baseTarget: entry.baseTarget,
        xpReward: entry.xpReward,
        predicate: entry.predicate,
        active: true,
        sortOrder: entry.sortOrder,
      },
    });
  }

  for (const entry of ACHIEVEMENT_CATALOG) {
    await prisma.achievementDefinition.upsert({
      where: { key: entry.key },
      update: {
        family: entry.family,
        title: entry.title,
        description: entry.description,
        identity: entry.identity,
        baseTarget: entry.baseTarget,
        xpReward: entry.xpReward,
        predicate: entry.predicate,
        active: true,
        sortOrder: entry.sortOrder,
      },
      create: {
        key: entry.key,
        family: entry.family,
        title: entry.title,
        description: entry.description,
        identity: entry.identity,
        baseTarget: entry.baseTarget,
        xpReward: entry.xpReward,
        predicate: entry.predicate,
        active: true,
        sortOrder: entry.sortOrder,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
