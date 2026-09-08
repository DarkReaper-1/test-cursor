import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";
import * as accountRepo from "../repositories/account";
import * as playerRepo from "../repositories/player";
import { toPlayerSnapshot } from "@/lib/format";
import type { PlayerSnapshot } from "@/lib/types";
import { isPlaytestOperator } from "@/lib/constants/playtest";

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function uniqueConstraintFields(err: unknown): string[] {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
    return [];
  }
  const target = err.meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") {
    const lower = target.toLowerCase();
    if (lower.includes("username")) return ["username"];
    if (lower.includes("email")) return ["email"];
    return [target];
  }
  return [];
}

export async function register(input: {
  email: string;
  password: string;
  username: string;
  timezone?: string;
}): Promise<{ accountId: string; player: PlayerSnapshot }> {
  const existing = await accountRepo.findAccountByEmail(prisma, input.email);
  if (existing) {
    if (isPlaytestOperator({ email: input.email, username: input.username, password: input.password })) {
      return login({ email: input.email, password: input.password });
    }
    throw new AuthError("EMAIL_TAKEN", "That email is already activated. Sign in instead.");
  }

  const taken = await playerRepo.findPlayerByUsername(prisma, input.username);
  if (taken) {
    throw new AuthError("USERNAME_TAKEN", "That callsign is taken.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await accountRepo.createAccount(tx, {
        email: input.email,
        passwordHash,
      });
      const player = await playerRepo.createPlayer(tx, {
        accountId: account.id,
        username: input.username,
        timezone: input.timezone,
      });
      return { accountId: account.id, player: toPlayerSnapshot(player) };
    });
    return result;
  } catch (err) {
    const fields = uniqueConstraintFields(err);
    if (fields.includes("username")) {
      throw new AuthError("USERNAME_TAKEN", "That callsign is taken.");
    }
    if (fields.includes("email")) {
      throw new AuthError("EMAIL_TAKEN", "That email is already activated. Sign in instead.");
    }
    throw err;
  }
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ accountId: string; player: PlayerSnapshot }> {
  const account = await accountRepo.findAccountByEmail(prisma, input.email);
  if (!account) {
    throw new AuthError("INVALID_CREDENTIALS", "Email or password is wrong.");
  }
  const ok = await bcrypt.compare(input.password, account.passwordHash);
  if (!ok) {
    throw new AuthError("INVALID_CREDENTIALS", "Email or password is wrong.");
  }
  const player = await playerRepo.findPlayerByAccountId(prisma, account.id);
  if (!player) {
    throw new AuthError("PLAYER_MISSING", "Account has no player.");
  }
  return { accountId: account.id, player: toPlayerSnapshot(player) };
}

export async function getMe(accountId: string): Promise<PlayerSnapshot> {
  const player = await playerRepo.findPlayerByAccountId(prisma, accountId);
  if (!player) {
    throw new AuthError("PLAYER_MISSING", "Account has no player.");
  }
  return toPlayerSnapshot(player);
}
