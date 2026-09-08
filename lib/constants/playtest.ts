/**
 * PLAYTEST ONLY — delete this file and its usages before launch.
 * Lets operators enter SYSTEM without a real email.
 */
export const PLAYTEST_OPERATOR = {
  username: "tester",
  email: "tester@system.test",
  password: "testfile1",
} as const;

export function isPlaytestOperator(input: { email: string; username?: string; password?: string }): boolean {
  const email = input.email.trim().toLowerCase();
  if (email !== PLAYTEST_OPERATOR.email) return false;
  if (input.username != null && input.username.trim() !== PLAYTEST_OPERATOR.username) return false;
  if (input.password != null && input.password !== PLAYTEST_OPERATOR.password) return false;
  return true;
}
