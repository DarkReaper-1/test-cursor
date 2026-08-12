import { bus } from '../core/EventBus';
import type { SaveManager } from '../core/SaveManager';
import type { RaceResult } from '../core/types';
import { LEVELS } from '../levels/levels';

/**
 * XP, player level, stars, level unlocking and race reward computation.
 * No pay-to-win: everything is earned by racing.
 */

export const XP_PER_LEVEL = 500;

export function xpForPlacement(placement: number, totalRacers: number): number {
  const base = Math.max(0, (totalRacers - placement + 1) / totalRacers);
  return Math.round(60 + base * 140);
}

export function coinsForPlacement(placement: number): number {
  if (placement === 1) return 100;
  if (placement === 2) return 60;
  if (placement === 3) return 40;
  return 20;
}

export function starsForRace(placement: number, timeSeconds: number, targetTime: number): number {
  // 1 star: finish. 2 stars: podium. 3 stars: win (or podium + beat target time).
  if (placement === 1) return 3;
  if (placement <= 3) return timeSeconds <= targetTime ? 3 : 2;
  return 1;
}

export class ProgressionSystem {
  constructor(private save: SaveManager) {}

  get xp(): number {
    return this.save.data.xp;
  }

  get playerLevel(): number {
    return this.save.data.playerLevel;
  }

  get unlockedLevel(): number {
    return this.save.data.unlockedLevel;
  }

  isLevelUnlocked(levelId: number): boolean {
    return levelId <= this.save.data.unlockedLevel;
  }

  starsFor(levelId: number): number {
    return this.save.data.stars[levelId] ?? 0;
  }

  bestTimeFor(levelId: number): number | null {
    return this.save.data.bestTimes[levelId] ?? null;
  }

  totalStars(): number {
    return Object.values(this.save.data.stars).reduce((a, b) => a + b, 0);
  }

  /**
   * Apply a finished race: returns the fully-computed result including
   * rewards, stars, unlocks and best-time tracking.
   */
  completeRace(params: {
    levelId: number;
    placement: number;
    totalRacers: number;
    timeSeconds: number;
    coinsCollected: number;
    stuntScore: number;
    targetTime: number;
  }): RaceResult {
    const { levelId, placement, totalRacers, timeSeconds, coinsCollected, stuntScore, targetTime } = params;
    const d = this.save.data;

    const stars = starsForRace(placement, timeSeconds, targetTime);
    const xpEarned = xpForPlacement(placement, totalRacers) + Math.round(stuntScore * 0.5) + coinsCollected;
    const coinsEarned = coinsForPlacement(placement) + coinsCollected;

    // stars: keep best
    const prevStars = d.stars[levelId] ?? 0;
    if (stars > prevStars) d.stars[levelId] = stars;

    // best time
    const prevBest = d.bestTimes[levelId];
    const newBestTime = prevBest === undefined || timeSeconds < prevBest;
    if (newBestTime) d.bestTimes[levelId] = Math.round(timeSeconds * 100) / 100;

    // unlock next level on any finish
    const nextId = levelId + 1;
    if (nextId <= LEVELS.length && d.unlockedLevel < nextId) {
      d.unlockedLevel = nextId;
      bus.emit('levelUnlocked', { levelId: nextId });
    }

    // xp / player level
    d.xp += xpEarned;
    const newLevel = Math.floor(d.xp / XP_PER_LEVEL) + 1;
    if (newLevel > d.playerLevel) d.playerLevel = newLevel;
    bus.emit('xpChanged', { xp: d.xp, level: d.playerLevel });

    this.save.flush();

    return {
      placement,
      totalRacers,
      timeSeconds,
      coinsCollected,
      stuntScore,
      xpEarned,
      coinsEarned,
      stars,
      levelId,
      newBestTime,
    };
  }
}
