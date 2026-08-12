import type { GameState } from './types';
import { bus } from './EventBus';

/**
 * Finite state machine driving the game flow:
 * boot → menu → levelSelect → loading → countdown → racing ⇄ paused → finished → results → levelSelect
 */

const TRANSITIONS: Record<GameState, GameState[]> = {
  boot: ['menu'],
  menu: ['levelSelect', 'customize', 'settings', 'loading'],
  levelSelect: ['menu', 'loading', 'customize', 'settings'],
  customize: ['menu', 'levelSelect'],
  settings: ['menu', 'levelSelect'],
  loading: ['countdown', 'menu'],
  countdown: ['racing', 'menu', 'loading'],
  racing: ['paused', 'finished', 'loading', 'menu'],
  paused: ['racing', 'loading', 'menu', 'levelSelect'],
  finished: ['results'],
  results: ['levelSelect', 'loading', 'menu'],
};

export class GameStateManager {
  private state: GameState = 'boot';
  private listeners = new Set<(s: GameState, prev: GameState) => void>();

  get current(): GameState {
    return this.state;
  }

  canGo(to: GameState): boolean {
    return TRANSITIONS[this.state]?.includes(to) ?? false;
  }

  go(to: GameState): boolean {
    if (to === this.state) return true;
    if (!this.canGo(to)) {
      console.warn(`[GameState] illegal transition ${this.state} → ${to}`);
      return false;
    }
    const prev = this.state;
    this.state = to;
    bus.emit('stateChanged', { from: prev, to });
    for (const l of this.listeners) l(to, prev);
    return true;
  }

  onChange(fn: (s: GameState, prev: GameState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  is(...states: GameState[]): boolean {
    return states.includes(this.state);
  }
}
