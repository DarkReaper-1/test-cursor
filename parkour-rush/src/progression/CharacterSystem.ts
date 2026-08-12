import { bus } from '../core/EventBus';
import type { SaveManager } from '../core/SaveManager';
import type { CurrencySystem } from './CurrencySystem';

/**
 * Original character roster + cosmetic catalog (colors and trails).
 * Characters are stylized procedural runners — palettes and proportions,
 * no external assets.
 */

export interface CharacterDef {
  id: string;
  name: string;
  cost: number;
  /** body proportions for the procedural rig */
  bodyColor: string;
  headColor: string;
  visorColor: string;
  scale: number;
  headSize: number;
  description: string;
}

export interface TrailDef {
  id: string;
  name: string;
  cost: number;
  color: string | null; // null = no trail
}

export const CHARACTERS: CharacterDef[] = [
  { id: 'dash', name: 'Dash', cost: 0, bodyColor: '#38bdf8', headColor: '#fde68a', visorColor: '#0f172a', scale: 1.0, headSize: 1.0, description: 'The all-rounder. Fast feet, cool head.' },
  { id: 'bolt', name: 'Bolt', cost: 400, bodyColor: '#fbbf24', headColor: '#fef3c7', visorColor: '#1e293b', scale: 0.95, headSize: 1.05, description: 'Small frame, big energy.' },
  { id: 'titan', name: 'Titan', cost: 800, bodyColor: '#f87171', headColor: '#e2e8f0', visorColor: '#111827', scale: 1.12, headSize: 0.92, description: 'Powers through anything.' },
  { id: 'wisp', name: 'Wisp', cost: 1200, bodyColor: '#a78bfa', headColor: '#ede9fe', visorColor: '#312e81', scale: 0.92, headSize: 1.1, description: 'Barely touches the ground.' },
  { id: 'shade', name: 'Shade', cost: 2000, bodyColor: '#334155', headColor: '#94a3b8', visorColor: '#f43f5e', scale: 1.02, headSize: 1.0, description: 'Seen only at the finish line.' },
];

export const COLORS: { id: string; cost: number }[] = [
  { id: '#38bdf8', cost: 0 },
  { id: '#4ade80', cost: 150 },
  { id: '#fbbf24', cost: 150 },
  { id: '#f87171', cost: 150 },
  { id: '#a78bfa', cost: 250 },
  { id: '#f472b6', cost: 250 },
  { id: '#2dd4bf', cost: 250 },
  { id: '#ffffff', cost: 400 },
];

export const TRAILS: TrailDef[] = [
  { id: 'none', name: 'None', cost: 0, color: null },
  { id: 'sky', name: 'Sky Streak', cost: 300, color: '#38bdf8' },
  { id: 'ember', name: 'Ember', cost: 500, color: '#fb923c' },
  { id: 'lime', name: 'Lime Light', cost: 500, color: '#a3e635' },
  { id: 'violet', name: 'Violet Rush', cost: 800, color: '#a78bfa' },
  { id: 'gold', name: 'Gold Rush', cost: 1500, color: '#facc15' },
];

export class CharacterSystem {
  constructor(
    private save: SaveManager,
    private currency: CurrencySystem,
  ) {}

  get selectedCharacter(): CharacterDef {
    return CHARACTERS.find((c) => c.id === this.save.data.selectedCharacter) ?? CHARACTERS[0];
  }

  get selectedTrail(): TrailDef {
    return TRAILS.find((t) => t.id === this.save.data.selectedTrail) ?? TRAILS[0];
  }

  get selectedColor(): string {
    return this.save.data.selectedColor;
  }

  ownsCharacter(id: string): boolean {
    return this.save.data.ownedCharacters.includes(id);
  }

  ownsTrail(id: string): boolean {
    return this.save.data.ownedTrails.includes(id);
  }

  ownsColor(id: string): boolean {
    return this.save.data.ownedColors.includes(id);
  }

  buyCharacter(id: string): boolean {
    const def = CHARACTERS.find((c) => c.id === id);
    if (!def || this.ownsCharacter(id)) return false;
    if (!this.currency.spend(def.cost)) return false;
    this.save.data.ownedCharacters.push(id);
    this.save.flush();
    bus.emit('itemUnlocked', { itemId: id });
    return true;
  }

  buyTrail(id: string): boolean {
    const def = TRAILS.find((t) => t.id === id);
    if (!def || this.ownsTrail(id)) return false;
    if (!this.currency.spend(def.cost)) return false;
    this.save.data.ownedTrails.push(id);
    this.save.flush();
    bus.emit('itemUnlocked', { itemId: id });
    return true;
  }

  buyColor(id: string): boolean {
    const def = COLORS.find((c) => c.id === id);
    if (!def || this.ownsColor(id)) return false;
    if (!this.currency.spend(def.cost)) return false;
    this.save.data.ownedColors.push(id);
    this.save.flush();
    bus.emit('itemUnlocked', { itemId: id });
    return true;
  }

  selectCharacter(id: string): boolean {
    if (!this.ownsCharacter(id)) return false;
    this.save.data.selectedCharacter = id;
    this.save.flush();
    return true;
  }

  selectTrail(id: string): boolean {
    if (!this.ownsTrail(id)) return false;
    this.save.data.selectedTrail = id;
    this.save.flush();
    return true;
  }

  selectColor(id: string): boolean {
    if (!this.ownsColor(id)) return false;
    this.save.data.selectedColor = id;
    this.save.flush();
    return true;
  }
}
