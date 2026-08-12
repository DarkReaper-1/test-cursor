import type { RacerSnapshot } from '../../core/types';

/**
 * Computes live race placements. Finished racers rank by finish time,
 * everyone else by distance along the track. Pure logic — unit tested.
 */
export class RacePositionManager {
  /** Returns racer ids sorted best (index 0 = 1st place) to worst. */
  standings(racers: readonly RacerSnapshot[]): number[] {
    const sorted = [...racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      if (a.eliminated && !b.eliminated) return 1;
      if (b.eliminated && !a.eliminated) return -1;
      return b.progress - a.progress;
    });
    return sorted.map((r) => r.id);
  }

  /** 1-based placement of a racer. */
  placementOf(racers: readonly RacerSnapshot[], racerId: number): number {
    return this.standings(racers).indexOf(racerId) + 1;
  }

  /** Signed distance (m) from the given racer to the nearest rival ahead/behind. */
  gaps(racers: readonly RacerSnapshot[], racerId: number): { ahead: number | null; behind: number | null } {
    const me = racers.find((r) => r.id === racerId);
    if (!me) return { ahead: null, behind: null };
    let ahead: number | null = null;
    let behind: number | null = null;
    for (const r of racers) {
      if (r.id === racerId || r.eliminated) continue;
      const d = r.progress - me.progress;
      if (d > 0 && (ahead === null || d < ahead)) ahead = d;
      if (d < 0 && (behind === null || -d < behind)) behind = -d;
    }
    return { ahead, behind };
  }

  static ordinal(n: number): string {
    const rem10 = n % 10;
    const rem100 = n % 100;
    if (rem10 === 1 && rem100 !== 11) return `${n}st`;
    if (rem10 === 2 && rem100 !== 12) return `${n}nd`;
    if (rem10 === 3 && rem100 !== 13) return `${n}rd`;
    return `${n}th`;
  }
}
