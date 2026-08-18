export function remainingMs(endsAt: number | null, now: number): number {
  if (endsAt === null) {
    return 0;
  }
  return Math.max(0, endsAt - now);
}

export function formatRest(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export const DEFAULT_REST_MS = 90_000;
