import { prisma } from "../db/client";
import * as playerRepo from "../repositories/player";
import * as exerciseRepo from "../repositories/exercise";
import { assembleDirective } from "./directive";
import { getTodayQuests } from "./quest";
import { toPlayerSnapshot } from "@/lib/format";
import type { PlayerSnapshot, QuestBoardDto, TrainingDirective } from "@/lib/types";

export async function getToday(accountId: string): Promise<{
  player: PlayerSnapshot;
  directive: TrainingDirective;
  dailyQuests: QuestBoardDto;
}> {
  const player = await playerRepo.findPlayerByAccountId(prisma, accountId);
  if (!player) {
    throw new Error("PLAYER_MISSING");
  }
  const exercises = await exerciseRepo.listActiveExercises(prisma);
  const directive = assembleDirective({
    timezone: player.timezone,
    exercises: exercises.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      movementType: item.movementType,
      difficulty: item.difficulty,
    })),
  });
  const dailyQuests = await getTodayQuests(accountId);
  return { player: toPlayerSnapshot(player), directive, dailyQuests };
}
