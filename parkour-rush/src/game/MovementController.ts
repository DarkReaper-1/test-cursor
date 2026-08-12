import type { BoxCollider, MoveInput, MoveState } from '../core/types';

/**
 * Kinematic arcade character movement shared by the player and AI racers.
 * Pure logic (no three.js / DOM) so it can be unit-tested headlessly.
 *
 * Handles: auto-run, steering/lanes, jump + double jump + buffering/coyote
 * time, slide + fast-fall, auto-vault, wall-run + wall-jump, ledge mantle,
 * air control, landing detection, boosts + momentum, stumble, death.
 */

export interface CollisionWorld {
  /** Return colliders overlapping the z range. Must be cheap (bucketed). */
  queryZ(zMin: number, zMax: number): readonly BoxCollider[];
  /** Track half width at a given z (walls clamp |x|). */
  halfWidthAt(z: number): number;
}

export interface MovementEvents {
  onJump?(double: boolean): void;
  onLand?(impact: number): void;
  onSlideStart?(): void;
  onSlideEnd?(): void;
  onVault?(): void;
  onWallRunStart?(side: 'L' | 'R'): void;
  onWallRunEnd?(): void;
  onWallJump?(): void;
  onStumble?(severity: number): void;
  onDeath?(reason: 'fall' | 'hazard'): void;
  /** trigger volumes: boost strips, launch pads, breakables, finish, checkpoints */
  onTrigger?(c: BoxCollider): void;
}

export interface MovementConfig {
  baseSpeed: number;
  maxBoostSpeed: number;
  accel: number;
  strafeSpeed: number;
  airControlMult: number;
  gravity: number;
  jumpVelocity: number;
  doubleJumpVelocity: number;
  slideDuration: number;
  vaultMaxHeight: number;
  wallRunMaxTime: number;
  wallJumpUp: number;
  wallJumpOut: number;
  laneWidth: number;
  killY: number;
  bodyHalfX: number;
  bodyHalfZ: number;
  standHeight: number;
  slideHeight: number;
  coyoteTime: number;
  jumpBufferTime: number;
  stepUp: number;
  mantleHeight: number;
}

export function defaultMovementConfig(): MovementConfig {
  return {
    baseSpeed: 11.5,
    maxBoostSpeed: 20,
    accel: 14,
    strafeSpeed: 9.5,
    airControlMult: 0.7,
    gravity: 30,
    jumpVelocity: 11.2,
    doubleJumpVelocity: 10.2,
    slideDuration: 0.72,
    vaultMaxHeight: 1.35,
    wallRunMaxTime: 1.25,
    wallJumpUp: 10.4,
    wallJumpOut: 7.5,
    laneWidth: 3,
    killY: -9,
    bodyHalfX: 0.38,
    bodyHalfZ: 0.38,
    standHeight: 1.7,
    slideHeight: 0.85,
    coyoteTime: 0.12,
    jumpBufferTime: 0.14,
    stepUp: 0.45,
    mantleHeight: 1.75,
  };
}

export class MovementController {
  cfg: MovementConfig;
  events: MovementEvents;

  // pose (y = feet height)
  x = 0;
  y = 0;
  z = 0;
  vy = 0;
  /** current forward speed (units/s) */
  speed = 0;
  /** smoothed lateral velocity for animation lean */
  vx = 0;
  targetX = 0;

  grounded = true;
  sliding = false;
  slideTimer = 0;
  jumpsUsed = 0;
  wallRun: 'L' | 'R' | null = null;
  wallRunTimer = 0;
  wallRunX = 0;
  vaultTimer = 0;
  stumbleTimer = 0;
  dead = false;
  deathTimer = 0;
  finished = false;

  /** speed multiplier from power-ups (speed boost) */
  boostTimer = 0;
  boostMult = 1;
  /** shield charges absorb one hazard/stumble */
  shield = false;
  /** invulnerability window after respawn */
  invulnTimer = 0;

  private coyote = 0;
  private jumpBuffer = 0;
  private groundVel = { x: 0, y: 0, z: 0 };
  private lastGroundY = 0;
  private fallStartY = 0;
  private prevGrounded = true;
  private queryOut: BoxCollider[] = [];
  private ignoreVaultId = -1;

  state: MoveState = 'idle';

  constructor(cfg?: Partial<MovementConfig>, events: MovementEvents = {}) {
    this.cfg = { ...defaultMovementConfig(), ...cfg };
    this.events = events;
  }

  reset(x: number, y: number, z: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.targetX = x;
    this.vy = 0;
    this.vx = 0;
    this.speed = 0;
    this.grounded = true;
    this.sliding = false;
    this.slideTimer = 0;
    this.jumpsUsed = 0;
    this.wallRun = null;
    this.wallRunTimer = 0;
    this.vaultTimer = 0;
    this.stumbleTimer = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.boostTimer = 0;
    this.boostMult = 1;
    this.invulnTimer = 1.2;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.state = 'run';
    this.fallStartY = y;
  }

  get height(): number {
    return this.sliding ? this.cfg.slideHeight : this.cfg.standHeight;
  }

  get effectiveTargetSpeed(): number {
    if (this.dead || this.finished) return 0;
    let s = this.cfg.baseSpeed * this.boostMult;
    if (this.stumbleTimer > 0) s *= 0.35;
    return Math.min(s, this.cfg.maxBoostSpeed);
  }

  applyBoost(mult: number, duration: number): void {
    this.boostMult = Math.max(this.boostMult, mult);
    this.boostTimer = Math.max(this.boostTimer, duration);
  }

  shiftLane(dir: -1 | 1, world: CollisionWorld): void {
    const half = world.halfWidthAt(this.z) - this.cfg.bodyHalfX - 0.1;
    this.targetX = Math.max(-half, Math.min(half, this.targetX + dir * this.cfg.laneWidth));
  }

  stumble(severity = 1, ignoreShield = false): void {
    if (this.invulnTimer > 0 || this.dead) return;
    if (this.shield && !ignoreShield) {
      this.shield = false;
      this.invulnTimer = 0.8;
      return;
    }
    this.stumbleTimer = Math.max(this.stumbleTimer, 0.35 + severity * 0.3);
    this.speed *= Math.max(0.15, 0.55 - severity * 0.2);
    this.events.onStumble?.(severity);
  }

  kill(reason: 'fall' | 'hazard'): void {
    if (this.dead || this.invulnTimer > 0) return;
    if (this.shield && reason === 'hazard') {
      this.shield = false;
      this.invulnTimer = 1.0;
      return;
    }
    this.dead = true;
    this.deathTimer = 0;
    this.state = 'dead';
    this.events.onDeath?.(reason);
  }

  respawn(x: number, y: number, z: number): void {
    this.reset(x, y, z);
  }

  /** One fixed simulation step. */
  step(dt: number, input: MoveInput, world: CollisionWorld): void {
    if (this.dead) {
      this.deathTimer += dt;
      // ragdoll-ish fall
      this.vy -= this.cfg.gravity * dt;
      this.y += this.vy * dt;
      this.speed = Math.max(0, this.speed - 20 * dt);
      this.z += this.speed * dt;
      return;
    }
    const cfg = this.cfg;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) this.boostMult = 1;
    }
    if (this.stumbleTimer > 0) this.stumbleTimer -= dt;
    if (this.vaultTimer > 0) this.vaultTimer -= dt;

    // ---- input intents
    if (input.jump) this.jumpBuffer = cfg.jumpBufferTime;
    else if (this.jumpBuffer > 0) this.jumpBuffer -= dt;

    if (input.slide) {
      if (this.grounded && !this.sliding) this.startSlide();
      else if (!this.grounded && !this.wallRun) this.vy = Math.min(this.vy, -16); // fast fall
    }

    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.endSlide(world);
    }

    // ---- steering
    const half = world.halfWidthAt(this.z) - cfg.bodyHalfX - 0.05;
    if (!this.wallRun) {
      const controlMult = this.grounded ? 1 : cfg.airControlMult;
      this.targetX += input.steer * cfg.strafeSpeed * controlMult * dt;
      this.targetX = Math.max(-half, Math.min(half, this.targetX));
      const k = this.grounded ? 14 : 9;
      const newX = this.x + (this.targetX - this.x) * Math.min(1, k * dt);
      this.vx = (newX - this.x) / Math.max(dt, 1e-6);
      this.x = newX;
    }

    // ---- forward speed with momentum
    const target = this.effectiveTargetSpeed;
    if (this.speed < target) this.speed = Math.min(target, this.speed + cfg.accel * dt);
    else this.speed = Math.max(target, this.speed - cfg.accel * 0.6 * dt);
    let slideBonus = this.sliding ? 1.12 : 1;

    // ---- vertical
    if (this.wallRun) {
      this.wallRunTimer -= dt;
      this.vy = -1.4;
      this.x = this.wallRunX;
      this.targetX = this.wallRunX;
      if (this.jumpBuffer > 0) {
        this.doWallJump();
      } else if (this.wallRunTimer <= 0 || !this.probeWall(world, this.wallRun)) {
        this.endWallRun();
      }
    } else if (!this.grounded) {
      this.vy -= cfg.gravity * dt;
    }

    // jump from ground / coyote / double jump
    if (this.jumpBuffer > 0 && !this.wallRun) {
      if (this.grounded || this.coyote > 0) {
        this.doJump(false);
      } else if (this.jumpsUsed < 2) {
        this.doJump(true);
      }
    }
    if (!this.grounded && this.coyote > 0) this.coyote -= dt;

    // ---- integrate
    const dz = this.speed * slideBonus * dt;
    this.z += dz;
    this.y += this.vy * dt;

    // carried by moving platform
    if (this.grounded && (this.groundVel.x !== 0 || this.groundVel.y !== 0)) {
      this.x += this.groundVel.x * dt;
      this.targetX += this.groundVel.x * dt;
      if (this.groundVel.y !== 0) this.y += this.groundVel.y * dt;
    }

    // ---- collisions
    this.resolveCollisions(dt, world);

    // wall-run acquisition (after collision so x is settled)
    if (!this.grounded && !this.wallRun && this.vy < 3.5 && this.vy > -12) {
      this.tryStartWallRun(world);
    }

    // ---- fall death
    if (this.y < cfg.killY) {
      this.invulnTimer = 0;
      this.shield = false;
      this.kill('fall');
      return;
    }

    // ---- state machine for animation
    this.updateState();
    this.prevGrounded = this.grounded;
  }

  // ------------------------------------------------------------ actions

  private doJump(double: boolean): void {
    const cfg = this.cfg;
    if (this.sliding) this.endSlideImmediate();
    this.vy = double ? cfg.doubleJumpVelocity : cfg.jumpVelocity;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumpsUsed = double ? 2 : 1;
    this.fallStartY = this.y;
    this.groundVel.x = 0;
    this.groundVel.y = 0;
    this.events.onJump?.(double);
  }

  private doWallJump(): void {
    const cfg = this.cfg;
    const dir = this.wallRun === 'L' ? 1 : -1;
    this.endWallRun(true);
    this.vy = cfg.wallJumpUp;
    this.targetX = this.x + dir * cfg.laneWidth * 1.1;
    this.jumpsUsed = 1;
    this.jumpBuffer = 0;
    this.speed = Math.min(this.speed + 1.5, cfg.maxBoostSpeed);
    this.state = 'wallJump';
    this.events.onWallJump?.();
  }

  private startSlide(): void {
    this.sliding = true;
    this.slideTimer = this.cfg.slideDuration;
    this.events.onSlideStart?.();
  }

  private endSlide(world: CollisionWorld): void {
    // don't stand up into a ceiling — extend the slide instead
    if (this.ceilingBlocked(world)) {
      this.slideTimer = 0.15;
      return;
    }
    this.endSlideImmediate();
  }

  private endSlideImmediate(): void {
    if (!this.sliding) return;
    this.sliding = false;
    this.slideTimer = 0;
    this.events.onSlideEnd?.();
  }

  private tryStartWallRun(world: CollisionWorld): void {
    const side = this.probeWall(world, 'L') ? 'L' : this.probeWall(world, 'R') ? 'R' : null;
    if (!side) return;
    this.wallRun = side;
    this.wallRunTimer = this.cfg.wallRunMaxTime;
    this.wallRunX = this.x;
    this.vy = 0;
    this.jumpsUsed = 1;
    this.events.onWallRunStart?.(side);
  }

  private endWallRun(silent = false): void {
    if (!this.wallRun) return;
    this.wallRun = null;
    if (!silent) this.events.onWallRunEnd?.();
    else this.events.onWallRunEnd?.();
  }

  /** Is there a wall-runnable surface hugging the given side? */
  private probeWall(world: CollisionWorld, side: 'L' | 'R'): boolean {
    const cfg = this.cfg;
    const probeX = this.x + (side === 'L' ? -1 : 1) * (cfg.bodyHalfX + 0.45);
    const list = world.queryZ(this.z - 1, this.z + 1.5);
    for (const c of list) {
      if (c.disabled || !c.wallRunnable) continue;
      if (probeX < c.minX || probeX > c.maxX) continue;
      if (this.z + cfg.bodyHalfZ < c.minZ || this.z - cfg.bodyHalfZ > c.maxZ) continue;
      // body must vertically overlap the wall
      if (this.y + 0.4 > c.maxY || this.y + this.height < c.minY) continue;
      // pin x flush to the wall face
      this.wallRunX = side === 'L' ? c.maxX + cfg.bodyHalfX + 0.02 : c.minX - cfg.bodyHalfX - 0.02;
      return true;
    }
    return false;
  }

  private ceilingBlocked(world: CollisionWorld): boolean {
    const cfg = this.cfg;
    const list = world.queryZ(this.z - 1, this.z + 1);
    for (const c of list) {
      if (c.disabled) continue;
      if (c.kind !== 'solid' && c.kind !== 'slideUnder') continue;
      if (
        this.x + cfg.bodyHalfX > c.minX &&
        this.x - cfg.bodyHalfX < c.maxX &&
        this.z + cfg.bodyHalfZ > c.minZ &&
        this.z - cfg.bodyHalfZ < c.maxZ &&
        this.y + cfg.standHeight > c.minY &&
        this.y + cfg.slideHeight < c.minY + 0.6
      ) {
        return true;
      }
    }
    return false;
  }

  // --------------------------------------------------------- collisions

  private resolveCollisions(dt: number, world: CollisionWorld): void {
    const cfg = this.cfg;
    const list = world.queryZ(this.z - 2.5, this.z + 2.5);
    const h = this.height;

    // clamp to track side bounds
    const half = world.halfWidthAt(this.z) - cfg.bodyHalfX;
    if (this.x > half) this.x = half;
    if (this.x < -half) this.x = -half;

    let bestGround = -Infinity;
    let groundCollider: BoxCollider | null = null;
    const wasGrounded = this.grounded;
    this.grounded = false;

    for (const c of list) {
      if (c.disabled) continue;
      const overlapX = this.x + cfg.bodyHalfX > c.minX && this.x - cfg.bodyHalfX < c.maxX;
      const overlapZ = this.z + cfg.bodyHalfZ > c.minZ && this.z - cfg.bodyHalfZ < c.maxZ;
      const overlapY = this.y + h > c.minY && this.y < c.maxY;

      // triggers fire on any overlap
      if (overlapX && overlapZ && overlapY) {
        if (c.kind === 'boost' || c.kind === 'launch' || c.kind === 'finish' || c.kind === 'checkpoint') {
          this.events.onTrigger?.(c);
          continue;
        }
        if (c.kind === 'hazard') {
          this.kill('hazard');
          continue;
        }
        if (c.kind === 'breakable') {
          this.events.onTrigger?.(c);
          continue;
        }
      }

      if (c.kind !== 'solid' && c.kind !== 'vault' && c.kind !== 'slideUnder') continue;

      // ---- ground: land on top surfaces while falling
      if (overlapX && overlapZ && this.vy <= 0.01) {
        const top = c.maxY;
        if (this.y >= top - Math.max(0.65, -this.vy * dt + 0.3) && this.y <= top + cfg.stepUp && top > bestGround) {
          // ensure we're not inside the box sideways only
          bestGround = top;
          groundCollider = c;
        }
      }

      // ---- slide-under bars
      if (c.kind === 'slideUnder' && overlapX && overlapZ && overlapY) {
        if (this.y + h > c.minY && this.y < c.minY) {
          // hit the bar standing: knock back
          this.z = c.minZ - cfg.bodyHalfZ - 0.02;
          this.stumble(1);
          continue;
        }
      }

      // ---- wall-run panels: lateral-only colliders (never block forward)
      if (c.wallRunnable) {
        if (overlapX && overlapZ && overlapY) {
          const cx = (c.minX + c.maxX) / 2;
          if (this.x < cx) {
            this.x = c.minX - cfg.bodyHalfX;
            this.targetX = Math.min(this.targetX, this.x);
          } else {
            this.x = c.maxX + cfg.bodyHalfX;
            this.targetX = Math.max(this.targetX, this.x);
          }
        }
        continue;
      }

      // ---- forward blocking faces
      if (c.kind === 'solid' || c.kind === 'vault') {
        // while vaulting over this collider, it neither blocks nor re-vaults
        if (c.id === this.ignoreVaultId) continue;
        const frontFace = c.minZ;
        const insideZ = this.z + cfg.bodyHalfZ > frontFace && this.z - cfg.bodyHalfZ < c.maxZ;
        if (overlapX && insideZ && overlapY && this.y < c.maxY - 0.05 && this.y + h > c.minY + 0.05) {
          const obstacleHeight = c.maxY - this.y;
          const movingIntoFace = this.z - cfg.bodyHalfZ < frontFace + 1.2;
          if (movingIntoFace) {
            if (obstacleHeight <= cfg.vaultMaxHeight && (wasGrounded || this.vaultTimer > 0)) {
              // auto-vault: pop just high enough to clear the obstacle
              const clearVy = Math.sqrt(2 * cfg.gravity * Math.min(cfg.vaultMaxHeight + 0.25, obstacleHeight + 0.25));
              this.vy = Math.max(this.vy, Math.min(9.5, clearVy));
              this.grounded = false;
              this.vaultTimer = 0.4;
              this.ignoreVaultId = c.id;
              this.jumpsUsed = Math.max(this.jumpsUsed, 1);
              this.events.onVault?.();
              continue;
            }
            if (!wasGrounded && this.vy < 2 && c.maxY <= this.y + cfg.mantleHeight && c.maxY >= this.y + 0.3) {
              // ledge mantle: pull up onto the platform
              this.y = c.maxY;
              this.vy = 0;
              this.grounded = true;
              this.jumpsUsed = 0;
              this.events.onLand?.(0.3);
              continue;
            }
            // blocked
            this.z = frontFace - cfg.bodyHalfZ - 0.02;
            if (this.speed > 4) this.stumble(Math.min(1.5, this.speed / 10));
            else this.speed = Math.min(this.speed, 1);
            continue;
          }
        }
        // lateral push-out when clipping into a wall from the side
        if (insideZ && overlapY && !overlapX) continue;
        if (insideZ && overlapY && overlapX && this.y < c.maxY - cfg.stepUp && this.y + h > c.minY) {
          const cx = (c.minX + c.maxX) / 2;
          if (this.x < cx) {
            const push = c.minX - cfg.bodyHalfX;
            if (this.x > push) {
              this.x = push;
              this.targetX = Math.min(this.targetX, push);
            }
          } else {
            const push = c.maxX + cfg.bodyHalfX;
            if (this.x < push) {
              this.x = push;
              this.targetX = Math.max(this.targetX, push);
            }
          }
        }
      }
    }

    if (this.ignoreVaultId !== -1) {
      // clear vault ignore once passed
      const c = list.find((k) => k.id === this.ignoreVaultId);
      if (!c || this.z - cfg.bodyHalfZ > c.maxZ) this.ignoreVaultId = -1;
    }

    if (groundCollider && bestGround > -Infinity) {
      const impactSpeed = -this.vy;
      this.y = bestGround;
      this.vy = 0;
      this.grounded = true;
      this.coyote = cfg.coyoteTime;
      this.jumpsUsed = 0;
      this.groundVel.x = groundCollider.velX ?? 0;
      this.groundVel.y = groundCollider.velY ?? 0;
      if (this.wallRun) this.endWallRun();
      if (!wasGrounded) {
        const fallDist = Math.max(0, this.fallStartY - this.y);
        const impact = Math.min(1.5, impactSpeed / 16 + fallDist / 14);
        this.events.onLand?.(impact);
        if (impact > 1.2) this.stumble(0.5);
      }
      this.lastGroundY = this.y;
    } else {
      if (wasGrounded) {
        this.fallStartY = this.y;
        this.groundVel.x = 0;
        this.groundVel.y = 0;
      }
    }
  }

  // ------------------------------------------------------------ anim state

  private updateState(): void {
    if (this.dead) {
      this.state = 'dead';
      return;
    }
    if (this.finished) {
      return; // victory/defeat set externally
    }
    if (this.stumbleTimer > 0.15) {
      this.state = 'stumble';
      return;
    }
    if (this.wallRun) {
      this.state = this.wallRun === 'L' ? 'wallRunL' : 'wallRunR';
      return;
    }
    if (this.vaultTimer > 0.15) {
      this.state = 'vault';
      return;
    }
    if (this.sliding) {
      this.state = 'slide';
      return;
    }
    if (!this.grounded) {
      if (this.vy > 1.5) this.state = this.jumpsUsed >= 2 ? 'doubleJump' : 'jump';
      else this.state = 'fall';
      return;
    }
    if (this.speed < 0.5) this.state = 'idle';
    else this.state = this.boostMult > 1.05 ? 'sprint' : 'run';
  }
}
