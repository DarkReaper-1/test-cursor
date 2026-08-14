import { mulberry32 } from './track.js';

// AI opponents run the exact same Runner physics as the player — they only
// produce a steer value each frame, following the track's racing line with a
// per-bot lateral offset, reaction lag and occasional mistakes.
export class AIBrain {
  constructor(runner, track, { skill = 0.5, seed = 1 } = {}) {
    this.runner = runner;
    this.track = track;
    this.skill = skill;
    this.rng = mulberry32(seed * 7919 + 13);
    this.offset = (this.rng() - 0.5) * 3.4;         // personal lane preference
    this.offsetTimer = 0;
    this.steer = 0;
    this.wanderTimer = 0;
    this.mistake = 0;
  }

  update(dt, playerZ) {
    const r = this.runner;
    if (!r.running || r.finished || r.respawnTimer > 0) { this.steer = 0; return 0; }

    // wander: re-pick lateral offset now and then (spreads the crowd out)
    this.offsetTimer -= dt;
    if (this.offsetTimer <= 0) {
      this.offsetTimer = 2 + this.rng() * 3;
      const spread = 2.6 - this.skill * 1.4;        // good bots track the line
      this.offset = (this.rng() - 0.5) * 2 * spread;
    }

    // occasional deliberate mistake for low skill: veer briefly
    this.mistake -= dt;
    if (this.mistake <= -4 && this.rng() < (0.35 - this.skill * 0.3) * dt) {
      this.mistake = 0.5;
    }

    const lookahead = 4.5 + r.speed * 0.35;
    let targetX = this.track.waypointX(r.z + lookahead) + this.offset * 0.4
      + this.track.waypointX(r.z + lookahead) * 0; // (keep line dominant)
    // clamp the personal offset near special features so bots still hit them
    targetX += this.offset * 0.5;

    let s = (targetX - r.x) * 0.45 - r.yaw * 0.9;
    if (this.mistake > 0) s += Math.sin(this.mistake * 12) * 0.8;
    s = Math.max(-1, Math.min(1, s));

    // reaction lag scales with skill
    const react = 6 + this.skill * 8;
    this.steer += (s - this.steer) * Math.min(1, dt * react);

    // gentle rubber-banding, disabled near the finish so results feel earned
    const nearEnd = r.z > this.track.finishZ - 45;
    if (!nearEnd) {
      const gap = playerZ - r.z;
      if (gap > 30) r.maxSpeed = r.baseMaxSpeed * 1.06;
      else if (gap < -30) r.maxSpeed = r.baseMaxSpeed * 0.94;
      else r.maxSpeed = r.baseMaxSpeed;
    } else {
      r.maxSpeed = r.baseMaxSpeed;
    }

    return this.steer;
  }
}
