// ---------------------------------------------------------------------------
// Runner — the shared character controller used by the player and every AI.
//
// Faithful to the genre's control model: the ONLY input is steering. Running
// is automatic; jumps, vaults, flips, grinds and boosts are all contextual:
//   • run off a ledge        -> automatic jump, arc scales with current speed
//   • yellow ramp            -> big launch + auto front-flip, landing = boost
//   • glowing bumper pads    -> instant speed boost
//   • trampolines            -> huge vertical launch (double flip)
//   • low pink barriers      -> auto-vault at speed (blocks you when slow)
//   • rails                  -> auto-grind when you land on one
//   • walls / hard bumps     -> stumble, speed collapses
//   • falling off the course -> respawn at the last checkpoint
// ---------------------------------------------------------------------------

export const GRAVITY = 34;
const STEP_UP = 0.55;        // max ledge height climbed without a jump
const SNAP_DOWN = 0.65;      // max drop glued to the ground while running
const RADIUS = 0.36;         // body radius for wall collision
const MAX_YAW = 0.62;        // radians of heading at full steer
const BASE_SPEED = 11.2;
const BOOST_MULT = 1.5;
const AIR_DRAG_BLEND = 1.1;  // how fast air velocity re-aligns to heading
const RAIL_SNAP_X = 0.62;
const RAIL_SNAP_Y_ABOVE = 0.65;
const RAIL_SNAP_Y_BELOW = 0.2;

export class Runner {
  constructor(track, { color = 0xffffff, name = 'Runner', isPlayer = false, maxSpeed = BASE_SPEED } = {}) {
    this.track = track;
    this.color = color;
    this.name = name;
    this.isPlayer = isPlayer;
    this.maxSpeed = maxSpeed;

    // events consumed by FX / audio (assigned by main)
    this.onEvent = null;   // (type, data) => {}

    this.reset();
  }

  reset(startOffsetX = 0, startOffsetZ = 0) {
    const t = this.track;
    this.x = t.startX + startOffsetX;
    this.y = t.startY;
    this.z = 2 + startOffsetZ;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = 0;
    this.speed = 0;
    this.running = false;      // becomes true at GO
    this.grounded = true;
    this.groundRamp = null;
    this.airTime = 0;
    this.lastGroundY = this.y;

    // tricks / modifiers
    this.flip = null;          // { total, progress, duration, fromTramp }
    this.vaultTimer = 0;
    this.boostTimer = 0;
    this.stumbleTimer = 0;
    this.bumperCooldown = 0;
    this.vaultCooldown = 0;
    this.grindRail = null;
    this.grindSteerTime = 0;

    // race state
    this.finished = false;
    this.finishTime = 0;
    this.place = 0;
    this.respawnTimer = 0;     // > 0: frozen at checkpoint after falling
    this.deadFalling = false;
    this.time = 0;

    this._stepAccum = 0;
  }

  emit(type, data) { if (this.onEvent) this.onEvent(type, data); }

  get bodyY() { return this.y; }   // feet height
  get boosted() { return this.boostTimer > 0; }

  progress() { return this.finished ? this.track.finishZ + 1000 - this.finishTime : this.z; }

  // ---------------------------------------------------------------------

  update(dt, steer) {
    this.time += dt;
    if (!this.running) return;

    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      return;
    }

    if (this.finished) {
      // glide to a stop past the line
      this.speed = Math.max(0, this.speed - dt * 10);
      this._integrateGround(dt, 0);
      return;
    }

    this.boostTimer = Math.max(0, this.boostTimer - dt);
    this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    this.bumperCooldown = Math.max(0, this.bumperCooldown - dt);
    this.vaultCooldown = Math.max(0, this.vaultCooldown - dt);
    this.vaultTimer = Math.max(0, this.vaultTimer - dt);

    // --- steering -> heading -------------------------------------------
    const steerLimit = this.grindRail ? 0 : 1;
    const targetYaw = steer * MAX_YAW * steerLimit;
    this.yaw += (targetYaw - this.yaw) * Math.min(1, dt * 9);

    // --- forward speed ---------------------------------------------------
    let target = this.maxSpeed;
    if (this.boostTimer > 0) target *= BOOST_MULT;
    target *= 1 - 0.28 * Math.abs(steer);            // oversteer bleeds speed
    if (this.stumbleTimer > 0) target *= 0.35;       // wall bump hurts
    if (this.grindRail) target = Math.max(target, this.maxSpeed * 1.12);
    const accel = target > this.speed ? (this.speed < 4 ? 9 : 3.4) : 5.5;
    this.speed += (target - this.speed) * Math.min(1, dt * accel);

    if (this.grindRail) { this._updateGrind(dt, steer); }
    else if (this.grounded) { this._updateGround(dt, steer); }
    else { this._updateAir(dt); }

    // --- race checkpoints / finish --------------------------------------
    if (!this.finished && this.z >= this.track.finishZ) {
      this.finished = true;
      this.finishTime = this.time;
      this.emit('finish');
    }
  }

  // --------------------------------------------------------------- ground

  _dirX() { return Math.sin(this.yaw); }
  _dirZ() { return Math.cos(this.yaw); }

  _integrateGround(dt, steer) {
    this.vx = this._dirX() * this.speed;
    this.vz = this._dirZ() * this.speed;
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this._collideWalls();
  }

  _updateGround(dt, steer) {
    const prevRamp = this.groundRamp;
    this._integrateGround(dt, steer);

    // trampoline?
    for (const tr of this.track.tramps) {
      const dx = this.x - tr.x, dz = this.z - tr.z;
      if (Math.abs(this.y - tr.y) < 0.7 && dx * dx + dz * dz < tr.r * tr.r) {
        this._launch(tr.vy, { flips: 2, fromTramp: true });
        this.emit('tramp');
        return;
      }
    }

    // bumper?
    if (this.bumperCooldown <= 0) {
      for (const b of this.track.bumpers) {
        if (this.x > b.x0 && this.x < b.x1 && this.z > b.z0 && this.z < b.z1 &&
            Math.abs(this.y - b.y) < 0.6) {
          this.boostTimer = Math.max(this.boostTimer, 1.7);
          this.speed = Math.min(this.speed + 3.5, this.maxSpeed * BOOST_MULT);
          this.bumperCooldown = 0.6;
          this.emit('bumper');
          break;
        }
      }
    }

    // auto-vault low barriers ahead
    if (this.vaultCooldown <= 0 && this.speed > 5.5) {
      const px = this.x + this._dirX() * 1.25, pz = this.z + this._dirZ() * 1.25;
      for (const v of this.track.vaults) {
        if (px > v.x0 && px < v.x1 && pz > v.z0 && pz < v.z1) {
          const h = v.y1 - this.y;
          if (h > 0.4 && h < 1.6) {
            const vy = Math.sqrt(2 * GRAVITY * (h + 0.42));
            this._launch(vy, { vault: true });
            this.vaultCooldown = 0.5;
            this.boostTimer = Math.max(this.boostTimer, 0.35);
            this.emit('vault');
            return;
          }
        }
      }
    }

    // ground follow / ledge detection
    const g = this.track.groundAt(this.x, this.z, this.y + STEP_UP);
    if (g && g.y > this.y - SNAP_DOWN) {
      this.y = g.y;
      this.groundRamp = g.ramp;
      this.lastGroundY = this.y;

      // footsteps for the player
      this._stepAccum += this.speed * dt;
      if (this._stepAccum > 2.2) { this._stepAccum = 0; this.emit('step', this.speed / (this.maxSpeed * BOOST_MULT)); }

      // checkpoint bookkeeping
      const cp = this.track.lastCheckpointBefore(this.z);
      if (cp && (!this.lastCp || cp.z > this.lastCp.z)) this.lastCp = cp;
    } else {
      // Left the ground. Was it the lip of a flip ramp, or a plain ledge?
      if (prevRamp && prevRamp.flip && this.z >= prevRamp.z1 - 0.3) {
        const slope = (prevRamp.y1 - prevRamp.y0) / (prevRamp.z1 - prevRamp.z0);
        const vy = clamp(slope * this.speed * 1.55, 7.5, 13.5);
        this._launch(vy, { flips: vy > 11.5 ? 2 : 1 });
        this.emit('rampLaunch');
      } else {
        this._ledgeJump();
      }
    }
  }

  // At a ledge: probe ahead for a landing. If there is a deck to reach, jump
  // with an arc that scales with speed — carrying speed IS the skill.
  _ledgeJump() {
    const dx = this._dirX(), dz = this._dirZ();
    let landing = null;
    for (let d = 1.5; d <= 10; d += 0.5) {
      const g = this.track.groundAt(this.x + dx * d, this.z + dz * d, this.y + 3.5);
      if (g && g.y > this.y - 4.5) { landing = { d, y: g.y }; break; }
    }
    let vy;
    if (landing && landing.d > 2.2) {
      vy = 3.9 + 5.1 * clamp(this.speed / (this.maxSpeed * 1.15), 0, 1.15);
    } else {
      vy = 2.7;   // small hop off a step / drop
    }
    this._launch(vy, {});
    this.emit('jump', { big: vy > 5 });
  }

  _launch(vy, { flips = 0, vault = false, fromTramp = false } = {}) {
    this.grounded = false;
    this.groundRamp = null;
    this.vy = vy;
    this.vx = this._dirX() * this.speed;
    this.vz = this._dirZ() * this.speed;
    this.airTime = 0;
    if (flips > 0) {
      const duration = (2 * vy) / GRAVITY * 1.06;   // approx airtime
      this.flip = { total: flips * Math.PI * 2, progress: 0, duration, fromTramp };
    }
    if (vault) this.vaultTimer = 0.42;
  }

  // ------------------------------------------------------------------ air

  _updateAir(dt) {
    this.airTime += dt;
    const prevY = this.y;
    this.vy -= GRAVITY * dt;

    // mild air control: velocity re-aligns toward heading
    const twx = this._dirX() * this.speed, twz = this._dirZ() * this.speed;
    const k = Math.min(1, dt * AIR_DRAG_BLEND);
    this.vx += (twx - this.vx) * k;
    this.vz += (twz - this.vz) * k;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;
    this._collideWalls();

    if (this.flip) {
      this.flip.progress = Math.min(1, this.flip.progress + dt / this.flip.duration);
    }

    // rail catch (only while falling)
    if (this.vy < 0) {
      for (const r of this.track.rails) {
        if (this.z > r.z0 && this.z < r.z1 && Math.abs(this.x - r.x) < RAIL_SNAP_X &&
            this.y - r.y < RAIL_SNAP_Y_ABOVE && r.y - this.y < RAIL_SNAP_Y_BELOW) {
          this._startGrind(r);
          return;
        }
      }
    }

    // landing: did our feet cross a surface this frame?
    if (this.vy <= 0) {
      const g = this.track.groundAt(this.x, this.z, prevY + 0.05);
      if (g && prevY >= g.y - 0.01 && this.y <= g.y) {
        this._land(g);
        return;
      }
    }

    // fell off the world?
    if (this.y < this.lastGroundY - 16 || this.y < -40) {
      this._die();
    }
  }

  _land(g) {
    this.y = g.y;
    this.grounded = true;
    this.groundRamp = g.ramp;
    this.lastGroundY = this.y;
    const impact = -this.vy;
    this.vy = 0;

    if (this.flip) {
      const done = this.flip.progress;
      if (done > 0.82) {
        // stuck the landing -> PERFECT boost
        this.boostTimer = Math.max(this.boostTimer, this.flip.fromTramp ? 1.2 : 1.8);
        this.speed = Math.min(this.speed + 2.5, this.maxSpeed * BOOST_MULT);
        this.emit('perfect');
      } else if (done > 0.55) {
        this.boostTimer = Math.max(this.boostTimer, 0.7);
        this.emit('goodLanding');
      } else {
        // under-rotated -> faceplant stumble
        this.stumbleTimer = 0.55;
        this.emit('badLanding');
      }
      this.flip = null;
    } else {
      this.emit('land', { impact });
    }
  }

  _die() {
    this.emit('fall');
    const cp = this.lastCp || this.track.lastCheckpointBefore(this.z) || this.track.checkpoints[0];
    this.x = cp.x; this.y = cp.y; this.z = cp.z;
    this.vx = this.vy = this.vz = 0;
    this.speed = 0;
    this.yaw = 0;
    this.grounded = true;
    this.groundRamp = null;
    this.flip = null;
    this.grindRail = null;
    this.boostTimer = 0;
    this.stumbleTimer = 0;
    this.respawnTimer = this.isPlayer ? 0.85 : 0.6;
    this.emit('respawn');
  }

  // ---------------------------------------------------------------- grind

  _startGrind(rail) {
    this.grindRail = rail;
    this.grindSteerTime = 0;
    this.vy = 0;
    this.y = rail.y;
    this.yaw = 0;
    this.flip = null;
    this.emit('grindStart');
  }

  _updateGrind(dt, steer) {
    const r = this.grindRail;
    this.x += (r.x - this.x) * Math.min(1, dt * 14);
    this.y = r.y;
    this.z += this.speed * dt;
    this.vx = 0; this.vz = this.speed; this.vy = 0;

    // hard steer for a moment hops off the rail early
    if (Math.abs(steer) > 0.85) this.grindSteerTime += dt;
    else this.grindSteerTime = 0;

    if (this.z >= r.z1 || this.grindSteerTime > 0.14) {
      this.grindRail = null;
      this.yaw = clamp(steer, -1, 1) * MAX_YAW * 0.5;
      this.emit('grindEnd');
      this._launch(3.4, {});
    }
  }

  // ------------------------------------------------------------ collision

  _collideWalls() {
    const head = this.y + 1.7;
    for (const s of this.track.solidsNear(this.z)) {
      if (s.ramp) continue;                       // ramps never block laterally
      if (head < s.y0 + 0.05 || this.y > s.y1 - 0.05) continue;
      if (s.y1 - this.y <= STEP_UP + 0.01) continue;   // low enough to step/land on
      // circle vs AABB in XZ
      const cx = clamp(this.x, s.x0, s.x1);
      const cz = clamp(this.z, s.z0, s.z1);
      let dx = this.x - cx, dz = this.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > RADIUS * RADIUS) continue;

      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = RADIUS - d;
        dx /= d; dz /= d;
        this.x += dx * push;
        this.z += dz * push;
        const vn = this.vx * dx + this.vz * dz;
        if (vn < 0) { this.vx -= vn * dx; this.vz -= vn * dz; }
        if (vn < -5 && this.stumbleTimer <= 0) {
          this.stumbleTimer = 0.5;
          this.speed *= 0.3;
          this.emit('wallBump');
        } else if (vn < -1.5) {
          this.speed *= 0.965;   // scraping a wall bleeds speed
        }
      } else {
        // centre inside the box: push out along the cheapest axis
        const pushLeft = this.x - s.x0 + RADIUS, pushRight = s.x1 - this.x + RADIUS;
        const pushBack = this.z - s.z0 + RADIUS, pushFwd = s.z1 - this.z + RADIUS;
        const m = Math.min(pushLeft, pushRight, pushBack, pushFwd);
        if (m === pushLeft) this.x = s.x0 - RADIUS;
        else if (m === pushRight) this.x = s.x1 + RADIUS;
        else if (m === pushBack) this.z = s.z0 - RADIUS;
        else this.z = s.z1 + RADIUS;
        if (this.stumbleTimer <= 0 && this.speed > 6) {
          this.stumbleTimer = 0.5;
          this.speed *= 0.3;
          this.emit('wallBump');
        }
      }
    }
  }
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
