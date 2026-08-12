/**
 * Lightweight haptic feedback wrapper (Vibration API where supported).
 * All calls are no-ops when disabled or unsupported.
 */
export class Haptics {
  enabled = true;

  private vibrate(pattern: number | number[]): void {
    if (!this.enabled) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      /* unsupported */
    }
  }

  tap(): void {
    this.vibrate(8);
  }

  light(): void {
    this.vibrate(12);
  }

  medium(): void {
    this.vibrate(25);
  }

  heavy(): void {
    this.vibrate([35, 20, 35]);
  }

  success(): void {
    this.vibrate([15, 30, 15, 30, 40]);
  }

  failure(): void {
    this.vibrate([60, 40, 60]);
  }
}

export const haptics = new Haptics();
