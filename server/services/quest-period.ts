import { dateKeyInTimeZone } from "@/lib/format";

export type Ymd = { year: number; month: number; day: number };

export type QuestPeriod = {
  periodKey: string;
  startedAt: Date;
  expiresAt: Date;
};

export function ymdInTimeZone(now: Date, timeZone: string): Ymd {
  const key = dateKeyInTimeZone(now, timeZone);
  const [year, month, day] = key.split("-").map(Number);
  return { year: year ?? 2026, month: month ?? 1, day: day ?? 1 };
}

function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant.getTime();
}

export function zonedWallTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset1 = tzOffsetMs(new Date(utcGuess), timeZone);
  const first = utcGuess - offset1;
  const offset2 = tzOffsetMs(new Date(first), timeZone);
  if (offset1 !== offset2) {
    return new Date(utcGuess - offset2);
  }
  return new Date(first);
}

export function addCalendarDays(ymd: Ymd, days: number): Ymd {
  const utc = Date.UTC(ymd.year, ymd.month - 1, ymd.day);
  const shifted = new Date(utc + days * 86_400_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function startOfLocalWeek(now: Date, timeZone: string): Date {
  const ymd = ymdInTimeZone(now, timeZone);
  const utcNoon = Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12, 0, 0);
  const dow = new Date(utcNoon).getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  const monday = addCalendarDays(ymd, -daysFromMonday);
  return zonedWallTimeToUtc(timeZone, monday.year, monday.month, monday.day);
}

export function dailyPeriod(now: Date, timeZone: string): QuestPeriod {
  const ymd = ymdInTimeZone(now, timeZone);
  const startedAt = zonedWallTimeToUtc(timeZone, ymd.year, ymd.month, ymd.day);
  const next = addCalendarDays(ymd, 1);
  const expiresAt = zonedWallTimeToUtc(timeZone, next.year, next.month, next.day);
  return {
    periodKey: dateKeyInTimeZone(now, timeZone),
    startedAt,
    expiresAt,
  };
}

export function weeklyPeriod(now: Date, timeZone: string): QuestPeriod {
  const startedAt = startOfLocalWeek(now, timeZone);
  const startYmd = ymdInTimeZone(startedAt, timeZone);
  const endYmd = addCalendarDays(startYmd, 7);
  const expiresAt = zonedWallTimeToUtc(timeZone, endYmd.year, endYmd.month, endYmd.day);
  return {
    periodKey: `week:${dateKeyInTimeZone(startedAt, timeZone)}`,
    startedAt,
    expiresAt,
  };
}
