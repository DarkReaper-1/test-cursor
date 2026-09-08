import type { Account } from "@prisma/client";
import type { Db } from "../db/client";

export async function createAccount(
  db: Db,
  input: { email: string; passwordHash: string },
): Promise<Account> {
  return db.account.create({ data: input });
}

export async function findAccountByEmail(db: Db, email: string): Promise<Account | null> {
  return db.account.findUnique({ where: { email } });
}

export async function findAccountById(db: Db, id: string): Promise<Account | null> {
  return db.account.findUnique({ where: { id } });
}
