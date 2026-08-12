import { describe, expect, it } from 'vitest';
import { SaveManager, defaultSave, sanitizeSave, type KeyValueStore } from '../src/core/SaveManager';
import { CurrencySystem } from '../src/progression/CurrencySystem';
import { ProgressionSystem, coinsForPlacement, starsForRace, xpForPlacement, XP_PER_LEVEL } from '../src/progression/ProgressionSystem';
import { LEVELS } from '../src/levels/levels';

function memStore(): KeyValueStore & { raw: Map<string, string> } {
  const raw = new Map<string, string>();
  return {
    raw,
    getItem: (k) => raw.get(k) ?? null,
    setItem: (k, v) => void raw.set(k, v),
    removeItem: (k) => void raw.delete(k),
  };
}

describe('SaveManager', () => {
  it('starts with defaults and persists across instances', () => {
    const store = memStore();
    const s1 = new SaveManager(store);
    expect(s1.data.coins).toBe(0);
    expect(s1.data.unlockedLevel).toBe(1);
    s1.data.coins = 777;
    s1.data.unlockedLevel = 4;
    s1.data.bestTimes[2] = 45.5;
    s1.flush();
    const s2 = new SaveManager(store);
    expect(s2.data.coins).toBe(777);
    expect(s2.data.unlockedLevel).toBe(4);
    expect(s2.data.bestTimes[2]).toBe(45.5);
  });

  it('recovers from corrupt JSON', () => {
    const store = memStore();
    store.setItem('skyline-rush-save-v1', '{{{{not json');
    const s = new SaveManager(store);
    expect(s.data.coins).toBe(0);
    expect(s.data.settings.musicOn).toBe(true);
  });

  it('sanitizes malicious/invalid fields', () => {
    const d = sanitizeSave({
      coins: -50,
      xp: 'a lot',
      unlockedLevel: 99999,
      stars: { 1: 99, bogus: 2 },
      settings: { sensitivity: 100, controlScheme: 'invalid', quality: 'ultra' },
      selectedCharacter: 'not-owned-hack',
      ownedCharacters: ['dash'],
    });
    expect(d.coins).toBe(0);
    expect(d.xp).toBe(0);
    expect(d.unlockedLevel).toBe(999); // clamped to max bound
    expect(d.stars[1]).toBe(3);
    expect(d.settings.sensitivity).toBe(2);
    expect(d.settings.controlScheme).toBe('swipe');
    expect(d.settings.quality).toBe('auto');
    expect(d.selectedCharacter).toBe('dash');
  });

  it('reset restores defaults', () => {
    const store = memStore();
    const s = new SaveManager(store);
    s.data.coins = 500;
    s.flush();
    s.reset();
    expect(s.data.coins).toBe(0);
    expect(new SaveManager(store).data.coins).toBe(0);
  });
});

describe('CurrencySystem', () => {
  it('adds, spends and rejects overdrafts', () => {
    const save = new SaveManager(memStore());
    const c = new CurrencySystem(save);
    c.add(100);
    expect(c.coins).toBe(100);
    expect(c.spend(40)).toBe(true);
    expect(c.coins).toBe(60);
    expect(c.spend(100)).toBe(false);
    expect(c.coins).toBe(60);
    expect(c.canAfford(60)).toBe(true);
    expect(c.canAfford(61)).toBe(false);
    c.add(-5 as never);
    expect(c.coins).toBe(60);
  });
});

describe('ProgressionSystem', () => {
  it('reward tables scale with placement', () => {
    expect(coinsForPlacement(1)).toBeGreaterThan(coinsForPlacement(2));
    expect(coinsForPlacement(2)).toBeGreaterThan(coinsForPlacement(4));
    expect(xpForPlacement(1, 8)).toBeGreaterThan(xpForPlacement(8, 8));
    expect(starsForRace(1, 60, 50)).toBe(3);
    expect(starsForRace(2, 45, 50)).toBe(3); // podium + beat target
    expect(starsForRace(3, 60, 50)).toBe(2);
    expect(starsForRace(6, 60, 50)).toBe(1);
  });

  it('completing a race unlocks the next level, stores stars & best times, grants xp', () => {
    const save = new SaveManager(memStore());
    const p = new ProgressionSystem(save);
    expect(p.isLevelUnlocked(1)).toBe(true);
    expect(p.isLevelUnlocked(2)).toBe(false);

    const res = p.completeRace({
      levelId: 1, placement: 1, totalRacers: 4, timeSeconds: 40,
      coinsCollected: 25, stuntScore: 60, targetTime: 42,
    });
    expect(res.stars).toBe(3);
    expect(res.newBestTime).toBe(true);
    expect(p.isLevelUnlocked(2)).toBe(true);
    expect(p.isLevelUnlocked(3)).toBe(false);
    expect(p.starsFor(1)).toBe(3);
    expect(p.bestTimeFor(1)).toBe(40);
    expect(p.xp).toBe(res.xpEarned);

    // worse result later doesn't downgrade
    const res2 = p.completeRace({
      levelId: 1, placement: 5, totalRacers: 6, timeSeconds: 80,
      coinsCollected: 0, stuntScore: 0, targetTime: 42,
    });
    expect(res2.stars).toBe(1);
    expect(p.starsFor(1)).toBe(3);
    expect(p.bestTimeFor(1)).toBe(40);
  });

  it('levels up every XP_PER_LEVEL xp', () => {
    const save = new SaveManager(memStore());
    const p = new ProgressionSystem(save);
    let earned = 0;
    let guard = 0;
    while (earned < XP_PER_LEVEL && guard < 50) {
      const r = p.completeRace({
        levelId: 1, placement: 1, totalRacers: 8, timeSeconds: 40,
        coinsCollected: 30, stuntScore: 50, targetTime: 42,
      });
      earned += r.xpEarned;
      guard++;
    }
    expect(p.playerLevel).toBeGreaterThanOrEqual(2);
  });

  it('level unlock chain covers all defined levels', () => {
    const save = new SaveManager(memStore());
    const p = new ProgressionSystem(save);
    for (const lvl of LEVELS) {
      expect(p.isLevelUnlocked(lvl.id)).toBe(true);
      p.completeRace({
        levelId: lvl.id, placement: 2, totalRacers: 5, timeSeconds: 60,
        coinsCollected: 10, stuntScore: 10, targetTime: lvl.targetTime,
      });
    }
    expect(p.isLevelUnlocked(LEVELS.length)).toBe(true);
  });
});
