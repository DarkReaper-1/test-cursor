import { bus } from '../core/EventBus';
import { haptics } from '../core/Haptics';
import type { InputManager } from '../core/InputManager';
import type { MoveInput } from '../core/types';
import type { CollisionWorld } from './MovementController';
import { MovementController } from './MovementController';

/**
 * Binds InputManager → MovementController for the human racer, forwards
 * movement events to the global bus (audio/VFX/UI/haptics), and tracks
 * the stunt score (style points for parkour moves).
 */
export class PlayerController {
  mc: MovementController;
  stuntScore = 0;
  private input: InputManager;
  private frame: MoveInput = { steer: 0, jump: false, slide: false };
  private world: CollisionWorld | null = null;

  constructor(input: InputManager) {
    this.input = input;
    this.mc = new MovementController({}, {
      onJump: (double) => {
        bus.emit('playerJump', { double });
        if (double) this.stuntScore += 5;
        haptics.tap();
      },
      onLand: (impact) => {
        bus.emit('playerLand', { impact });
        if (impact > 0.5) haptics.light();
      },
      onSlideStart: () => {
        bus.emit('playerSlideStart');
        this.stuntScore += 2;
      },
      onSlideEnd: () => bus.emit('playerSlideEnd'),
      onVault: () => {
        bus.emit('playerVault');
        this.stuntScore += 8;
        haptics.light();
      },
      onWallRunStart: (side) => {
        bus.emit('playerWallRunStart', { side });
        this.stuntScore += 10;
        haptics.light();
      },
      onWallRunEnd: () => bus.emit('playerWallRunEnd'),
      onWallJump: () => {
        bus.emit('playerWallJump');
        this.stuntScore += 12;
        haptics.medium();
      },
      onStumble: (severity) => {
        bus.emit('playerStumble', { severity });
        haptics.medium();
      },
      onDeath: (reason) => {
        bus.emit('playerDeath', { reason });
        haptics.failure();
      },
      onTrigger: (c) => this.onTrigger?.(c),
    });
  }

  /** wired by Game for boost/launch/breakable/finish/checkpoint volumes */
  onTrigger: ((c: import('../core/types').BoxCollider) => void) | null = null;

  setWorld(world: CollisionWorld): void {
    this.world = world;
  }

  update(dt: number, allowControl: boolean): void {
    if (!this.world) return;
    const polled = this.input.poll();
    if (allowControl) {
      this.frame.steer = polled.steer;
      this.frame.jump = polled.jump;
      this.frame.slide = polled.slide;
      if (polled.moveLeft) this.mc.shiftLane(-1, this.world);
      if (polled.moveRight) this.mc.shiftLane(1, this.world);
    } else {
      this.frame.steer = 0;
      this.frame.jump = false;
      this.frame.slide = false;
    }
    this.mc.step(dt, this.frame, this.world);
  }

  resetScore(): void {
    this.stuntScore = 0;
  }
}
