import type { RacerSnapshot } from '../../core/types';
import { RacePositionManager } from './RacePositionManager';

/**
 * Owns the race lifecycle: countdown → racing → finished, the race
 * timer, finish detection and final standings. Pure logic — unit tested.
 */

export type RacePhase = 'idle' | 'countdown' | 'racing' | 'done';

export interface RacerEntry {
  id: number;
  name: string;
  isPlayer: boolean;
  progress: number;
  finished: boolean;
  finishTime: number;
  eliminated: boolean;
}

export class RaceManager {
  phase: RacePhase = 'idle';
  time = 0;
  countdown = 0;
  finishZ: number;
  racers: RacerEntry[] = [];
  positions = new RacePositionManager();

  /** callbacks */
  onCountdownTick: ((n: number) => void) | null = null;
  onStart: (() => void) | null = null;
  onRacerFinish: ((racer: RacerEntry, placement: number) => void) | null = null;
  onAllDone: (() => void) | null = null;

  private countdownAccum = 0;
  private lastTick = -1;

  constructor(finishZ: number) {
    this.finishZ = finishZ;
  }

  addRacer(id: number, name: string, isPlayer: boolean): RacerEntry {
    const r: RacerEntry = { id, name, isPlayer, progress: 0, finished: false, finishTime: 0, eliminated: false };
    this.racers.push(r);
    return r;
  }

  beginCountdown(seconds = 3): void {
    this.phase = 'countdown';
    this.countdown = seconds;
    this.countdownAccum = 0;
    this.lastTick = -1;
    this.time = 0;
  }

  update(dt: number): void {
    if (this.phase === 'countdown') {
      this.countdownAccum += dt;
      const remaining = Math.ceil(this.countdown - this.countdownAccum);
      if (remaining !== this.lastTick && remaining > 0) {
        this.lastTick = remaining;
        this.onCountdownTick?.(remaining);
      }
      if (this.countdownAccum >= this.countdown) {
        this.phase = 'racing';
        this.onCountdownTick?.(0);
        this.onStart?.();
      }
      return;
    }
    if (this.phase === 'racing') {
      this.time += dt;
    }
  }

  setProgress(id: number, progress: number): void {
    const r = this.racers.find((x) => x.id === id);
    if (r && !r.finished) r.progress = progress;
  }

  /** Mark a racer past the finish line. Returns placement or -1 if already finished. */
  finishRacer(id: number): number {
    const r = this.racers.find((x) => x.id === id);
    if (!r || r.finished) return -1;
    r.finished = true;
    r.finishTime = this.time;
    r.progress = this.finishZ;
    const placement = this.racers.filter((x) => x.finished).length;
    this.onRacerFinish?.(r, placement);
    // Keep the race clock and AI simulation alive after the player finishes.
    // Otherwise every rival still on the course freezes and appears as DNF.
    if (this.racers.every((x) => x.finished || x.eliminated)) {
      this.phase = 'done';
      this.onAllDone?.();
    }
    return placement;
  }

  snapshots(): RacerSnapshot[] {
    return this.racers.map((r) => ({ ...r }));
  }

  playerPlacement(): number {
    const player = this.racers.find((r) => r.isPlayer);
    if (!player) return 0;
    if (player.finished) {
      // placement fixed at finish order
      return this.racers.filter((r) => r.finished && r.finishTime <= player.finishTime).length;
    }
    return this.positions.placementOf(this.snapshots(), player.id);
  }

  /** Estimated placements for the results screen: unfinished AI ranked by progress. */
  finalStandings(): RacerEntry[] {
    const ids = this.positions.standings(this.snapshots());
    return ids.map((id) => this.racers.find((r) => r.id === id)!).filter(Boolean);
  }
}
