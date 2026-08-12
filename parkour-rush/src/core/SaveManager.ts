import type { SaveData, SettingsData } from './types';

/**
 * Robust local persistence with versioning, validation and migration.
 * Storage backend is injectable so unit tests can run without a browser.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SAVE_KEY = 'skyline-rush-save-v1';
const SAVE_VERSION = 1;

export function defaultSettings(): SettingsData {
  return {
    musicOn: true,
    sfxOn: true,
    hapticsOn: true,
    reducedMotion: false,
    controlScheme: 'swipe',
    sensitivity: 1.0,
    quality: 'auto',
    cameraShake: true,
  };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    xp: 0,
    playerLevel: 1,
    unlockedLevel: 1,
    stars: {},
    bestTimes: {},
    ownedCharacters: ['dash'],
    ownedTrails: ['none'],
    ownedColors: ['#38bdf8'],
    selectedCharacter: 'dash',
    selectedTrail: 'none',
    selectedColor: '#38bdf8',
    lastPlayedLevel: 1,
    tutorialDone: false,
    settings: defaultSettings(),
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Merge a parsed blob onto defaults, keeping only valid typed fields. */
export function sanitizeSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!isObject(raw)) return d;

  const num = (v: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.length < 64 ? v : fallback);
  const strArr = (v: unknown, fallback: string[]) =>
    Array.isArray(v) && v.every((s) => typeof s === 'string') ? (v as string[]) : fallback;

  d.coins = Math.floor(num(raw.coins, d.coins));
  d.xp = Math.floor(num(raw.xp, d.xp));
  d.playerLevel = Math.floor(num(raw.playerLevel, d.playerLevel, 1, 999));
  d.unlockedLevel = Math.floor(num(raw.unlockedLevel, d.unlockedLevel, 1, 999));
  d.tutorialDone = bool(raw.tutorialDone, d.tutorialDone);
  d.ownedCharacters = strArr(raw.ownedCharacters, d.ownedCharacters);
  d.ownedTrails = strArr(raw.ownedTrails, d.ownedTrails);
  d.ownedColors = strArr(raw.ownedColors, d.ownedColors);
  d.selectedCharacter = str(raw.selectedCharacter, d.selectedCharacter);
  d.selectedTrail = str(raw.selectedTrail, d.selectedTrail);
  d.selectedColor = str(raw.selectedColor, d.selectedColor);
  d.lastPlayedLevel = Math.floor(num(raw.lastPlayedLevel, d.lastPlayedLevel, 1, 999));
  if (!d.ownedCharacters.includes('dash')) d.ownedCharacters.push('dash');
  if (!d.ownedCharacters.includes(d.selectedCharacter)) d.selectedCharacter = 'dash';
  if (!d.ownedTrails.includes(d.selectedTrail)) d.selectedTrail = 'none';
  if (!d.ownedColors.includes('#38bdf8')) d.ownedColors.push('#38bdf8');
  if (!d.ownedColors.includes(d.selectedColor)) {
    // migrate: previously all colors were free — grant currently selected
    d.ownedColors.push(d.selectedColor);
  }

  if (isObject(raw.stars)) {
    for (const [k, v] of Object.entries(raw.stars)) {
      const id = Number(k);
      if (Number.isInteger(id) && typeof v === 'number') d.stars[id] = Math.min(3, Math.max(0, Math.floor(v)));
    }
  }
  if (isObject(raw.bestTimes)) {
    for (const [k, v] of Object.entries(raw.bestTimes)) {
      const id = Number(k);
      if (Number.isInteger(id) && typeof v === 'number' && v > 0) d.bestTimes[id] = v;
    }
  }
  if (isObject(raw.settings)) {
    const s = raw.settings;
    d.settings.musicOn = bool(s.musicOn, d.settings.musicOn);
    d.settings.sfxOn = bool(s.sfxOn, d.settings.sfxOn);
    d.settings.hapticsOn = bool(s.hapticsOn, d.settings.hapticsOn);
    d.settings.reducedMotion = bool(s.reducedMotion, d.settings.reducedMotion);
    d.settings.cameraShake = bool(s.cameraShake, d.settings.cameraShake);
    d.settings.sensitivity = num(s.sensitivity, d.settings.sensitivity, 0.5, 2);
    d.settings.controlScheme = s.controlScheme === 'buttons' ? 'buttons' : 'swipe';
    const q = s.quality;
    d.settings.quality = q === 'low' || q === 'medium' || q === 'high' || q === 'auto' ? q : 'auto';
  }
  return d;
}

export class SaveManager {
  data: SaveData;
  private store: KeyValueStore;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(store?: KeyValueStore) {
    this.store =
      store ??
      (typeof localStorage !== 'undefined'
        ? localStorage
        : (() => {
            const mem = new Map<string, string>();
            return {
              getItem: (k: string) => mem.get(k) ?? null,
              setItem: (k: string, v: string) => void mem.set(k, v),
              removeItem: (k: string) => void mem.delete(k),
            };
          })());
    this.data = this.load();
  }

  load(): SaveData {
    try {
      const raw = this.store.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      return sanitizeSave(JSON.parse(raw));
    } catch (err) {
      console.warn('[SaveManager] corrupt save, resetting', err);
      return defaultSave();
    }
  }

  /** Immediate synchronous save. */
  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      this.store.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.warn('[SaveManager] failed to persist', err);
    }
  }

  /** Debounced save for frequent updates (coins during race etc.). */
  save(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flush();
    }, 250);
  }

  reset(): void {
    this.data = defaultSave();
    this.flush();
  }
}
