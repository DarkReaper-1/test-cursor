import type { Player, Prisma } from "@prisma/client";
import { BASELINE_ATTRIBUTE } from "@/lib/constants/attributes";
import type { Db } from "../db/client";

export type PlayerCreate = {
  accountId: string;
  username: string;
  timezone?: string;
};

export async function createPlayer(db: Db, input: PlayerCreate): Promise<Player> {
  return db.player.create({
    data: {
      accountId: input.accountId,
      username: input.username,
      timezone: input.timezone ?? "UTC",
      level: 1,
      xp: 0,
      rank: "INITIATE",
      strength: BASELINE_ATTRIBUTE,
      endurance: BASELINE_ATTRIBUTE,
      agility: BASELINE_ATTRIBUTE,
      vitality: BASELINE_ATTRIBUTE,
      discipline: BASELINE_ATTRIBUTE,
      streak: 0,
      bestStreak: 0,
    },
  });
}

export async function findPlayerByAccountId(db: Db, accountId: string): Promise<Player | null> {
  return db.player.findUnique({ where: { accountId } });
}

export async function findPlayerById(db: Db, id: string): Promise<Player | null> {
  return db.player.findUnique({ where: { id } });
}

export async function savePlayerSnapshot(
  db: Db,
  playerId: string,
  data: Prisma.PlayerUpdateInput,
): Promise<Player> {
  return db.player.update({ where: { id: playerId }, data });
}
