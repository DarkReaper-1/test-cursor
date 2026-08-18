import { DEFAULT_ATTRIBUTE_KEYS } from "@helix/shared";
import type { PrismaClient } from "@prisma/client";

const ATTRIBUTE_META: Record<string, { name: string; domain: string; sortOrder: number }> = {
  BODY: { name: "Body", domain: "physical", sortOrder: 1 },
  VITALITY: { name: "Vitality", domain: "physical", sortOrder: 2 },
  AGILITY: { name: "Agility", domain: "physical", sortOrder: 3 },
  MIND: { name: "Mind", domain: "cognitive", sortOrder: 4 },
  FOCUS: { name: "Focus", domain: "cognitive", sortOrder: 5 },
  DISCIPLINE: { name: "Discipline", domain: "cognitive", sortOrder: 6 },
};

export async function ensureAttributeCatalog(prisma: PrismaClient): Promise<void> {
  for (const key of DEFAULT_ATTRIBUTE_KEYS) {
    const meta = ATTRIBUTE_META[key];
    if (!meta) continue;
    await prisma.attributeDefinition.upsert({
      where: { key },
      update: { name: meta.name, domain: meta.domain, sortOrder: meta.sortOrder },
      create: { key, name: meta.name, domain: meta.domain, sortOrder: meta.sortOrder },
    });
  }
}

export async function createOperatorCharacter(prisma: PrismaClient, userId: string) {
  await ensureAttributeCatalog(prisma);
  const definitions = await prisma.attributeDefinition.findMany();
  return prisma.character.create({
    data: {
      userId,
      scores: {
        create: definitions.map((definition) => ({
          definitionId: definition.id,
          value: 10,
        })),
      },
    },
    include: { scores: { include: { definition: true } } },
  });
}
