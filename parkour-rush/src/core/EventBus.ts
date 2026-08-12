/**
 * Minimal typed event bus decoupling gameplay systems from UI/audio/VFX.
 */

export type EventMap = {
  // game flow
  stateChanged: { from: string; to: string };
  raceCountdown: { count: number }; // 3,2,1,0(GO)
  raceStarted: void;
  raceFinished: void;
  racePaused: void;
  raceResumed: void;

  // player events
  playerJump: { double: boolean };
  playerLand: { impact: number };
  playerSlideStart: void;
  playerSlideEnd: void;
  playerVault: void;
  playerWallRunStart: { side: 'L' | 'R' };
  playerWallRunEnd: void;
  playerWallJump: void;
  playerStumble: { severity: number };
  playerDeath: { reason: 'fall' | 'hazard' };
  playerRespawn: void;
  playerLaunched: void;
  playerBoost: { source: 'strip' | 'powerup' };
  barrierBroken: void;

  // pickups
  coinCollected: { total: number; x: number; y: number; z: number };
  powerUpCollected: { type: string };
  powerUpExpired: { type: string };

  // race progress
  checkpointReached: { index: number; total: number };
  positionChanged: { position: number; total: number };
  racerFinished: { racerId: number; isPlayer: boolean; placement: number };

  // meta
  currencyChanged: { coins: number };
  xpChanged: { xp: number; level: number };
  levelUnlocked: { levelId: number };
  itemUnlocked: { itemId: string };
  uiTap: void;
};

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler<unknown>>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    let set = this.handlers.get(event as string);
    if (!set) {
      set = new Set();
      this.handlers.set(event as string, set);
    }
    set.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    this.handlers.get(event as string)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, ...payload: EventMap[K] extends void ? [] : [EventMap[K]]): void {
    const set = this.handlers.get(event as string);
    if (!set) return;
    for (const h of set) {
      try {
        h(payload[0]);
      } catch (err) {
        console.error(`[EventBus] handler for "${String(event)}" threw`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

/** Global bus instance. Systems may also create private buses for tests. */
export const bus = new EventBus();
