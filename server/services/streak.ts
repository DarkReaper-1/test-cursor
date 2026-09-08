import { dateKeyInTimeZone } from "@/lib/format";

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function nextStreak(input: {
  lastActivityDate: Date | null;
  timezone: string;
  currentStreak: number;
  now?: Date;
}): { streak: number; activityDate: Date } {
  const now = input.now ?? new Date();
  const today = dateKeyInTimeZone(now, input.timezone);
  const last = input.lastActivityDate
    ? input.lastActivityDate.toISOString().slice(0, 10)
    : null;

  let streak = 1;
  if (last === today) {
    streak = Math.max(1, input.currentStreak);
  } else if (last && last === shiftDateKey(today, -1)) {
    streak = input.currentStreak + 1;
  }

  const [year, month, day] = today.split("-").map(Number);
  const activityDate = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1));
  return { streak, activityDate };
}
