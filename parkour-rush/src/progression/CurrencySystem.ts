import { bus } from '../core/EventBus';
import type { SaveManager } from '../core/SaveManager';

/**
 * Coin wallet backed by the save file. All mutations clamp and persist.
 */
export class CurrencySystem {
  constructor(private save: SaveManager) {}

  get coins(): number {
    return this.save.data.coins;
  }

  add(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.save.data.coins = Math.min(9_999_999, this.save.data.coins + Math.floor(amount));
    this.save.save();
    bus.emit('currencyChanged', { coins: this.save.data.coins });
  }

  /** Returns true and deducts if affordable, false otherwise. */
  spend(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0) return false;
    if (this.save.data.coins < amount) return false;
    this.save.data.coins -= Math.floor(amount);
    this.save.save();
    bus.emit('currencyChanged', { coins: this.save.data.coins });
    return true;
  }

  canAfford(amount: number): boolean {
    return this.save.data.coins >= amount;
  }
}
