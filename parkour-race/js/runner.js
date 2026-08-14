import * as THREE from 'three';
import { TRACK_HALF_WIDTH } from './course.js';

// ------------------------------------------------------------------ tuning
export const TUNE = {
  baseSpeed: 8.6,          // m/s auto-run cruise
  maxSpeed: 13.6,          // m/s reached by running clean
  boostedMax: 19.5,        // m/s cap while a bumper boost is active
  accel: 5.0,              // m/s^2 toward cruise/max
  chargeSlow: 0.72,        // speed multiplier while crouch-charging
  chargeTime: 0.55,        // s of hold for a full-power jump
  minJumpVy: 8.6,          // m/s vertical, tap jump
  maxJumpVy: 15.8,         // m/s vertical, fully charged
  jumpFwdBonus: 2.4,       // m/s forward burst added at full charge
  gravityUp: -30,          // gravity while rising (floatier apex)
  gravityDown: -46,        // gravity while falling (snappy landings)
  flipChargeMin: 0.45,     // charge needed to trigger a front flip
  steerSpeed: 7.2,         // m/s max lateral speed
  steerDragPx: 0.030,      // lateral meters per pointer pixel
  steerCost: 0.16,         // forward speed lost per m/s of lateral speed
  stepUp: 0.55,            // max ledge height walked up automatically
  vaultMax: 1.65,          // max ledge height auto-vaulted at speed
  vaultMinSpeed: 5.5,      // min speed to vault instead of stumble
  bumperBoost: 6.2,        // m/s added by a speed pad
  boostDecay: 3.2,         // m/s^2 bleed of boost speed above maxSpeed
  trampVy: 16.5,           // m/s vertical from a trampoline
  perfectAirTime: 0.42,    // min air time for a landing to count as perfect
  perfectWindow: 1.35,     // m past a gap's landing edge that scores PERFECT
  perfectBoost: 3.0,       // m/s reward
  stumbleSpeed: 2.6,       // m/s while stumbling
  stumbleTime: 0.85,       // s of stumble animation/penalty
  fallResetY: 11,          // m fallen below platform before respawn
  respawnPenalty: 1.0,     // s frozen after respawn
};

const STATES = { GROUND: 0, AIR: 1, RAIL: 2, STUMBLE: 3, FALLING: 4, RESPAWN: 5, FINISHED: 6 };
export { STATES };

// One racer's simulation. The player feeds real input; bots feed AI intents.
export class Runner {
  constructor(course, stickman, { name = 'Runner', isPlayer = false, startX = 0 } = {}) {
    this.course = course;
    this.stick = stickman;
    this.name = name;
    this.isPlayer = isPlayer;

    this.pos = new THREE.Vector3(startX, 0.05, -6);
    this.pos.y = course.groundHeight(startX, this.pos.z);
    this.vel = new THREE.Vector3();
    this.speed = 0;               // forward (z) speed
    this.lateralVel = 0;
    this.state = STATES.GROUND;
    this.running = false;         // gates auto-run (false until GO)
    this.finished = false;
    this.finishTime = 0;
    this.place = 0;

    // jump charge
    this.charging = false;
    this.charge = 0;

    // air bookkeeping
    this.airTime = 0;
    this.flipping = false;
    this.flipDuration = 1;
    this.lastGapCrossed = null;   // gap whose edge we jumped from

    // rails
    this.rail = null;

    // timers
    this.stumbleT = 0;
    this.respawnT = 0;
    this.boostT = 0;

    this.lastSafe = this.pos.clone();

    // events consumed by game layer (sfx/ui/particles)
    this.events = [];
  }

  emit(type, data) { this.events.push({ type, data }); }

  get grounded() { return this.state === STATES.GROUND; }
  get airborne() { return this.state === STATES.AIR || this.state === STATES.FALLING; }

  // ------------------------------------------------------------- controls
  /** Begin crouch-charging (only meaningful on the ground). */
  holdJump() {
    if (this.state === STATES.GROUND || this.state === STATES.RAIL) {
      this.charging = true;
    }
  }

  /** Release: perform the jump with current charge. */
  releaseJump() {
    if (!this.charging) return;
    this.charging = false;
    if (this.state !== STATES.GROUND && this.state !== STATES.RAIL) { this.charge = 0; return; }

    const c = Math.min(1, this.charge / TUNE.chargeTime);
    const wasOnRail = this.state === STATES.RAIL;
    if (wasOnRail) this.rail = null;

    this.vel.y = TUNE.minJumpVy + (TUNE.maxJumpVy - TUNE.minJumpVy) * c;
    this.speed += TUNE.jumpFwdBonus * c;
    this.state = STATES.AIR;
    this.airTime = 0;
    this.flipping = c >= TUNE.flipChargeMin;
    if (this.flipping) {
      // estimated hang time so the flip completes right at landing
      this.flipDuration = (2 * this.vel.y) / -TUNE.gravityUp * 0.92;
    }
    // remember which gap this jump is attempting (for PERFECT scoring)
    const edge = this.course.nextGapEdge(this.pos.z);
    this.lastGapCrossed = edge && edge.zEdge - this.pos.z < 14 ? edge : null;

    this.charge = 0;
    this.emit('jump', { charge: c, rail: wasOnRail });
  }

  steer(axis) { this._steerAxis = axis; }        // -1..1 from keys / AI
  steerDrag(px) { this._steerDrag = px; }        // raw pointer pixels

  // ------------------------------------------------------------- update
  update(dt) {
    this.events.length = 0;
    if (this.finished) { this._updateFinished(dt); return; }
    if (!this.running) { this.stick.update(dt, 'idle'); this._applyTransform(); return; }

    switch (this.state) {
      case STATES.GROUND: this._updateGround(dt); break;
      case STATES.AIR: this._updateAir(dt); break;
      case STATES.RAIL: this._updateRail(dt); break;
      case STATES.STUMBLE: this._updateStumble(dt); break;
      case STATES.FALLING: this._updateFalling(dt); break;
      case STATES.RESPAWN: this._updateRespawn(dt); break;
    }

    this._applyTransform();
    this._steerDrag = 0;
  }

  _targetSpeed() {
    // cruise builds toward max the longer you run clean
    return this.boostT > 0 ? TUNE.boostedMax : TUNE.maxSpeed;
  }

  _commonSteer(dt, control = 1) {
    const axis = this._steerAxis || 0;
    let target = axis * TUNE.steerSpeed * control;
    if (this._steerDrag) {
      // pointer drag: direct positional steering feel
      this.pos.x += this._steerDrag * TUNE.steerDragPx * control;
    }
    this.lateralVel += (target - this.lateralVel) * Math.min(1, dt * 10);
    this.pos.x += this.lateralVel * dt;
    const margin = 0.35;
    this.pos.x = Math.max(-TRACK_HALF_WIDTH + margin, Math.min(TRACK_HALF_WIDTH - margin, this.pos.x));
    // oversteering bleeds forward speed
    this.speed -= Math.abs(this.lateralVel) * TUNE.steerCost * dt * 10;
  }

  _advance(dt) {
    const z0 = this.pos.z;
    const z1 = z0 + this.speed * dt;

    // vault walls
    const v = this.course.vaultBetween(this.pos.x, z0, z1);
    if (v && this.grounded) {
      const top = this.course.groundHeight(this.pos.x, v.z - v.depth, this.pos.y + TUNE.stepUp) + v.height;
      if (this.pos.y < top - 0.05) {
        if (this.speed >= TUNE.vaultMinSpeed) {
          // clean auto-vault: small hop, keep almost all speed
          this.state = STATES.AIR;
          this.airTime = 0;
          this.vel.y = 7.5;
          this.speed *= 0.97;
          this.flipping = false;
          this.vaulting = true;
          this.vaultT = 0;
          this.emit('vault', {});
        } else {
          this._startStumble();
          return;
        }
      }
    } else if (v && this.airborne && this.pos.y < this.course.ceilingAt(this.pos.x, v.z - v.depth) + v.height - 0.15) {
      // clipped the wall mid-air
      this._startStumble();
      return;
    }

    this.pos.z = z1;

    // running face-first into a taller roof
    if (this.grounded) {
      const hereY = this.pos.y;
      const aheadY = this.course.ceilingAt(this.pos.x, z1 + 0.45);
      if (Number.isFinite(aheadY)) {
        const rise = aheadY - hereY;
        if (rise > TUNE.stepUp && rise <= TUNE.vaultMax && this.speed >= TUNE.vaultMinSpeed) {
          // climb-vault onto the ledge
          this.state = STATES.AIR;
          this.airTime = 0;
          this.vel.y = Math.sqrt(2 * -TUNE.gravityUp * (rise + 0.4));
          this.speed *= 0.94;
          this.vaulting = true;
          this.vaultT = 0;
          this.emit('vault', {});
        } else if (rise > TUNE.vaultMax) {
          this.pos.z = z0; // blocked
          this._startStumble();
        }
      }
    }
  }

  _updateGround(dt) {
    this.boostT = Math.max(0, this.boostT - dt);

    // accelerate toward target; charging slows you down (the crouch)
    let target = this._targetSpeed();
    if (this.charging) {
      this.charge = Math.min(TUNE.chargeTime, this.charge + dt);
      target *= TUNE.chargeSlow;
    }
    const rate = this.speed < target ? TUNE.accel : TUNE.boostDecay;
    this.speed += Math.sign(target - this.speed) * rate * dt;
    this.speed = Math.max(2.5, this.speed);

    this._commonSteer(dt, this.charging ? 0.7 : 1);
    this._advance(dt);
    if (this.state !== STATES.GROUND) { this._animate(dt); return; }

    // features underfoot
    const b = this.course.bumperAt(this.pos.x, this.pos.z);
    if (b && b !== this._lastBumper) {
      this._lastBumper = b;
      this.speed = Math.min(TUNE.boostedMax, this.speed + TUNE.bumperBoost);
      this.boostT = 1.8;
      this.emit('boost', { x: b.x, z: b.z });
    } else if (!b) {
      this._lastBumper = null;
    }

    const tr = this.course.trampAt(this.pos.x, this.pos.z);
    if (tr) { this._bounce(tr); this._animate(dt); return; }

    // follow terrain or start falling
    const g = this.course.groundHeight(this.pos.x, this.pos.z, this.pos.y + TUNE.stepUp);
    if (Number.isFinite(g)) {
      this.pos.y = g;
      this.lastSafe.set(this.pos.x, g, this.pos.z);
    } else {
      // ran off an edge: become airborne with whatever momentum we have
      this.state = STATES.AIR;
      this.airTime = 0;
      this.vel.y = 0;
      this.flipping = false;
      const edge = this.course.nextGapEdge(this.pos.z - 2);
      this.lastGapCrossed = edge;
    }

    this._animate(dt);
  }

  _bounce(tr) {
    this.state = STATES.AIR;
    this.airTime = 0;
    this.vel.y = TUNE.trampVy;
    this.flipping = true;
    this.flipDuration = (2 * TUNE.trampVy) / -TUNE.gravityUp * 0.92;
    this.charging = false;
    this.charge = 0;
    const edge = this.course.nextGapEdge(this.pos.z);
    this.lastGapCrossed = edge && edge.zEdge - this.pos.z < 8 ? edge : null;
    this.emit('tramp', {});
  }

  _updateAir(dt) {
    this.boostT = Math.max(0, this.boostT - dt);
    this.airTime += dt;
    if (this.vaulting) this.vaultT += dt;

    // two-phase gravity: floaty rise, fast fall — the classic snappy arc
    const g = this.vel.y > 0 ? TUNE.gravityUp : TUNE.gravityDown;
    this.vel.y += g * dt;
    this.pos.y += this.vel.y * dt;

    this._commonSteer(dt, 0.55); // limited air control
    this._advance(dt);
    if (this.state === STATES.STUMBLE) { this._animate(dt); return; }

    // roof wall collision while airborne: grab the ledge or faceplant
    const ceil = this.course.ceilingAt(this.pos.x, this.pos.z);
    if (Number.isFinite(ceil) && this.pos.y < ceil - 0.25) {
      if (ceil - this.pos.y <= 1.35 && this.vel.y < 2) {
        // ledge grab → climb up and keep running
        this.pos.y = ceil;
        this.vel.y = 0;
        this.state = STATES.GROUND;
        this.vaulting = false;
        this.flipping = false;
        this.speed *= 0.8;
        this.lastGapCrossed = null;
        this.lastSafe.set(this.pos.x, ceil, this.pos.z);
        this.emit('vault', {});
        this._animate(dt);
        return;
      }
      // smacked the wall face: slide back off it and fall
      this.pos.z -= this.speed * dt + 0.05;
      this.speed = 1.5;
      if (this.vel.y > 0) this.vel.y = 0;
      if (!this._wallHit) { this._wallHit = true; this.emit('stumbleWall', {}); }
    } else {
      this._wallHit = false;
    }

    // rail catch
    if (this.vel.y < 0) {
      const rn = this.course.railNear(this.pos.x, this.pos.z, this.pos.y);
      if (rn) {
        this.state = STATES.RAIL;
        this.rail = rn.rail;
        this.pos.y = rn.railY;
        this.vel.y = 0;
        this.vaulting = false;
        this.speed = Math.max(this.speed, 13.5);
        this.emit('rail', {});
        this._animate(dt);
        return;
      }
    }

    // trampoline catch in the air (landing on the pad)
    const trampled = this.vel.y < 0 ? this.course.trampAt(this.pos.x, this.pos.z) : null;
    if (trampled && this.pos.y <= trampled.y + 0.5) {
      this.pos.y = trampled.y + 0.4;
      this._bounce(trampled);
      this._animate(dt);
      return;
    }

    // landing
    if (this.vel.y < 0) {
      const gY = this.course.groundHeight(this.pos.x, this.pos.z, this.pos.y + 0.4);
      if (Number.isFinite(gY) && this.pos.y <= gY) {
        this._land(gY);
        this._animate(dt);
        return;
      }
      // fell below everything?
      const ceiling = this.course.ceilingAt(this.pos.x, this.pos.z);
      const floorRef = Number.isFinite(ceiling) ? ceiling : this.lastSafe.y;
      if (this.pos.y < floorRef - TUNE.fallResetY) {
        this.state = STATES.FALLING;
        this.fallT = 0;
        this.emit('fall', {});
      }
    }

    this._animate(dt);
  }

  _land(gY) {
    this.pos.y = gY;
    const impact = -this.vel.y;
    this.vel.y = 0;
    this.state = STATES.GROUND;
    this.vaulting = false;

    // PERFECT landing: a real jump, landed close past the gap's edge
    let perfect = false;
    if (this.airTime >= TUNE.perfectAirTime && this.lastGapCrossed) {
      const past = this.pos.z - this.lastGapCrossed.zLand;
      if (past >= -0.2 && past <= TUNE.perfectWindow) perfect = true;
    }
    if (perfect) {
      this.speed = Math.min(TUNE.boostedMax, this.speed + TUNE.perfectBoost);
      this.boostT = Math.max(this.boostT, 1.2);
      this.emit('perfect', {});
    } else if (impact > 28) {
      // pancake landing from very high: brief stumble
      this._startStumble();
      return;
    } else if (impact > 22) {
      this.speed *= 0.85; // heavy landing scrubs some speed
    }
    this.lastGapCrossed = null;
    this.lastSafe.set(this.pos.x, gY, this.pos.z);
    this.emit('land', { impact, perfect });
  }

  _updateRail(dt) {
    const r = this.rail;
    this.speed = Math.min(this.speed + 6 * dt, TUNE.boostedMax);
    if (this.charging) this.charge = Math.min(TUNE.chargeTime, this.charge + dt);
    this.pos.z += this.speed * dt;
    // stick to the rail line
    this.pos.x += (r.x - this.pos.x) * Math.min(1, dt * 12);
    if (this.pos.z >= r.zEnd) {
      // launched off the end
      this.rail = null;
      this.state = STATES.AIR;
      this.airTime = 0;
      this.vel.y = 3.5;
      this.flipping = false;
      this.lastGapCrossed = null;
    } else {
      this.pos.y = this.course.railYAt(r, this.pos.z);
    }
    this._animate(dt);
  }

  _startStumble() {
    this.state = STATES.STUMBLE;
    this.stumbleT = 0;
    this.speed = TUNE.stumbleSpeed;
    this.vel.y = 0;
    this.charging = false;
    this.charge = 0;
    this.vaulting = false;
    this.flipping = false;
    this.boostT = 0;
    this.emit('stumble', {});
  }

  _updateStumble(dt) {
    this.stumbleT += dt;
    this.pos.z += this.speed * dt;
    const g = this.course.groundHeight(this.pos.x, this.pos.z, this.pos.y + TUNE.stepUp + 0.6);
    if (Number.isFinite(g)) this.pos.y = g;
    if (this.stumbleT >= TUNE.stumbleTime) {
      this.state = STATES.GROUND;
      this.speed = TUNE.baseSpeed * 0.6;
    }
    this._animate(dt);
  }

  _updateFalling(dt) {
    this.fallT += dt;
    this.vel.y += TUNE.gravityDown * dt;
    this.pos.y += this.vel.y * dt;
    this.speed *= 1 - dt * 2;
    this.pos.z += this.speed * dt;
    if (this.fallT > 0.55) {
      this.state = STATES.RESPAWN;
      this.respawnT = 0;
      this.pos.copy(this.lastSafe);
      this.vel.set(0, 0, 0);
      this.speed = 0;
      this.emit('respawn', {});
    }
    this._animate(dt);
  }

  _updateRespawn(dt) {
    this.respawnT += dt;
    if (this.respawnT >= TUNE.respawnPenalty) {
      this.state = STATES.GROUND;
      this.speed = TUNE.baseSpeed * 0.5;
    }
    this._animate(dt);
  }

  _updateFinished(dt) {
    // cruise past the line, slow to a stop, celebrate
    this.speed = Math.max(0, this.speed - 10 * dt);
    this.pos.z += this.speed * dt;
    const g = this.course.groundHeight(this.pos.x, this.pos.z, this.pos.y + 1);
    if (Number.isFinite(g)) this.pos.y = g;
    this.stick.update(dt, this.speed > 1 ? 'run' : 'cheer', { speed: this.speed });
    this._applyTransform();
  }

  _animate(dt) {
    let state = 'run';
    const opts = { speed: this.speed, charge: Math.min(1, this.charge / TUNE.chargeTime) };
    if (this.state === STATES.AIR) {
      if (this.vaulting) { state = 'vault'; opts.flipT = Math.min(1, this.vaultT / 0.5); }
      else if (this.flipping) { state = 'flip'; opts.flipT = Math.min(1, this.airTime / this.flipDuration); }
      else state = 'air';
    } else if (this.state === STATES.RAIL) state = 'rail';
    else if (this.state === STATES.STUMBLE) { state = 'stumble'; opts.stumbleT = this.stumbleT / TUNE.stumbleTime; }
    else if (this.state === STATES.FALLING) state = 'fall';
    else if (this.state === STATES.RESPAWN) state = 'idle';
    else if (this.charging) state = 'charge';
    this.stick.update(dt, state, opts);
  }

  _applyTransform() {
    this.stick.root.position.copy(this.pos);
    // lean into lateral movement
    const targetTilt = -this.lateralVel * 0.03;
    this.stick.root.rotation.z += (targetTilt - this.stick.root.rotation.z) * 0.2;
    this.stick.root.rotation.y = Math.atan2(this.lateralVel * 0.35, Math.max(4, this.speed));
  }

  finish(time) {
    this.finished = true;
    this.finishTime = time;
    this.charging = false;
  }
}
