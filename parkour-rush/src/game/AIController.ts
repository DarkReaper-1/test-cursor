import type { AIAction, AISkill, MoveInput } from '../core/types';
import type { CollisionWorld, MovementController } from './MovementController';
import { ParkourController } from './ParkourController';

/**
 * Waypoint/annotation-driven racing AI.
 *
 * Levels annotate actions ("jump at z=120", "steer to x=-3") when built.
 * Each AI executes those with per-skill reaction jitter and occasional
 * believable mistakes (late jumps, missed slides), plus a reactive
 * fallback scanner so racers recover instead of running into walls.
 */

export interface AIProfile {
  skill: AISkill;
  /** base speed multiplier relative to player base speed */
  speedMult: number;
  /** seconds of reaction delay applied to planned actions */
  reaction: number;
  /** 0..1 chance to flub a given action */
  mistakeChance: number;
  name: string;
  color: string;
}

const FIRST_NAMES = [
  'Blur', 'Volt', 'Kiko', 'Rex', 'Nova', 'Juno', 'Ace', 'Piper',
  'Zed', 'Momo', 'Sky', 'Turbo', 'Nix', 'Echo', 'Dash', 'Rift',
  'Bolt', 'Kai', 'Lux', 'Onyx', 'Fizz', 'Gum', 'Chip', 'Wick',
];

export function makeProfile(skill: AISkill, index: number, rng: () => number): AIProfile {
  const base = {
    easy: { speed: 0.78, speedVar: 0.05, reaction: 0.3, mistake: 0.24 },
    normal: { speed: 0.87, speedVar: 0.05, reaction: 0.17, mistake: 0.13 },
    hard: { speed: 0.95, speedVar: 0.05, reaction: 0.08, mistake: 0.06 },
  }[skill];
  const colors = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#a78bfa', '#f472b6', '#94a3b8'];
  return {
    skill,
    speedMult: base.speed + rng() * base.speedVar,
    reaction: base.reaction * (0.7 + rng() * 0.6),
    mistakeChance: base.mistake,
    name: FIRST_NAMES[index % FIRST_NAMES.length],
    color: colors[index % colors.length],
  };
}

/** Distribute skills for a level: harder levels get more hard AI. */
export function skillsForLevel(difficulty: number, count: number): AISkill[] {
  const out: AISkill[] = [];
  for (let i = 0; i < count; i++) {
    const roll = i / Math.max(1, count - 1);
    if (difficulty <= 1) out.push(roll < 0.6 ? 'easy' : 'normal');
    else if (difficulty === 2) out.push(roll < 0.35 ? 'easy' : roll < 0.85 ? 'normal' : 'hard');
    else if (difficulty === 3) out.push(roll < 0.2 ? 'easy' : roll < 0.65 ? 'normal' : 'hard');
    else out.push(roll < 0.1 ? 'easy' : roll < 0.45 ? 'normal' : 'hard');
  }
  return out;
}

interface PlannedAction {
  action: AIAction;
  triggerZ: number;
  flubbed: boolean;
  done: boolean;
}

export class AIController {
  profile: AIProfile;
  mc: MovementController;
  private plan: PlannedAction[] = [];
  private planIdx = 0;
  private steerTargetX: number;
  private parkour = new ParkourController();
  private scanTimer = 0;
  private pendingJumpAt = -1; // time-based second jump for planned double jumps
  private clock = 0;
  private rng: () => number;
  private baseSpeed: number;
  private rubberBand = 1;
  private input: MoveInput = { steer: 0, jump: false, slide: false };

  constructor(mc: MovementController, profile: AIProfile, actions: readonly AIAction[], startX: number, rng: () => number) {
    this.mc = mc;
    this.profile = profile;
    this.rng = rng;
    this.steerTargetX = startX;
    this.baseSpeed = mc.cfg.baseSpeed * profile.speedMult;
    mc.cfg.baseSpeed = this.baseSpeed;
    // pre-jitter the plan so each AI runs the course slightly differently
    this.plan = actions.map((a) => ({
      action: a,
      triggerZ: a.z + (rng() - 0.3) * 0.8 + profile.reaction * 8, // reaction expressed in distance at ~8 u/s
      flubbed: rng() < profile.mistakeChance,
      done: false,
    }));
    this.plan.sort((a, b) => a.triggerZ - b.triggerZ);
  }

  /** Advance plan pointer past actions behind the racer (used after respawn). */
  syncPlanToPosition(): void {
    this.planIdx = 0;
    for (const p of this.plan) {
      p.done = p.triggerZ < this.mc.z - 2;
    }
    while (this.planIdx < this.plan.length && this.plan[this.planIdx].done) this.planIdx++;
    this.steerTargetX = this.mc.x;
  }

  /**
   * Rubber-banding keeps races close but believable; softened near the
   * finish so results still feel earned. `minBand` is the strongest
   * catch-down factor (lower on easy levels so beginners stay in touch).
   */
  updateRubberBand(playerProgress: number, finishZ: number, minBand = 0.8): void {
    const nearFinish = this.mc.z > finishZ * 0.9;
    if (nearFinish) {
      this.rubberBand = 1;
    } else {
      const d = playerProgress - this.mc.z;
      if (d > 30) this.rubberBand = 1.09;
      else if (d > 12) this.rubberBand = 1.04;
      else if (d < -45) this.rubberBand = minBand;
      else if (d < -18) this.rubberBand = (1 + minBand) / 2;
      else this.rubberBand = 1;
    }
    this.mc.cfg.baseSpeed = this.baseSpeed * this.rubberBand;
    // when held back, boost pads shouldn't launch the AI out of reach
    if (this.rubberBand < 0.98 && this.mc.boostMult > 1.1) {
      this.mc.boostMult = 1.1;
    }
  }

  update(dt: number, world: CollisionWorld): void {
    const mc = this.mc;
    this.clock += dt;
    this.input.steer = 0;
    this.input.jump = false;
    this.input.slide = false;

    if (mc.dead || mc.finished) {
      mc.step(dt, this.input, world);
      return;
    }

    // planned actions
    while (this.planIdx < this.plan.length && mc.z >= this.plan[this.planIdx].triggerZ) {
      const p = this.plan[this.planIdx];
      this.planIdx++;
      if (p.done) continue;
      p.done = true;
      if (p.flubbed && p.action.action !== 'steer') {
        // believable mistake: act late (may still recover via reactive scan)
        p.done = false;
        p.flubbed = false;
        p.triggerZ += 1.6 + this.rng() * 1.4;
        // re-insert respecting order
        this.plan.sort((a, b) => a.triggerZ - b.triggerZ);
        this.planIdx = this.plan.findIndex((x) => !x.done && x.triggerZ > mc.z);
        if (this.planIdx < 0) this.planIdx = this.plan.length;
        continue;
      }
      switch (p.action.action) {
        case 'jump':
          this.input.jump = true;
          break;
        case 'doubleJump':
          this.input.jump = true;
          this.pendingJumpAt = this.clock + 0.28 + this.rng() * 0.1;
          break;
        case 'slide':
          this.input.slide = true;
          break;
        case 'steer':
          if (p.action.targetX !== undefined) this.steerTargetX = p.action.targetX;
          break;
      }
    }

    if (this.pendingJumpAt > 0 && this.clock >= this.pendingJumpAt) {
      this.input.jump = true;
      this.pendingJumpAt = -1;
    }

    // reactive fallback scanning (recovery + unplanned obstacles)
    this.scanTimer -= dt;
    if (this.scanTimer <= 0) {
      this.scanTimer = 0.12 + this.profile.reaction * 0.3;
      const ahead = this.parkour.detectAhead(mc, world);
      const reactDist = 2.2 + mc.speed * 0.12;
      if (ahead.type === 'gap' && ahead.distance < reactDist && mc.grounded) {
        this.input.jump = true;
        if (ahead.width > 7) this.pendingJumpAt = this.clock + 0.3;
      } else if (ahead.type === 'slideBar' && ahead.distance < reactDist + 1) {
        this.input.slide = true;
      } else if (ahead.type === 'wall' && ahead.distance < reactDist) {
        // steer around solid walls toward track center
        this.steerTargetX = mc.x > 0 ? mc.x - 3 : mc.x + 3;
      }
      // recovery: if falling into a pit but a wall-run panel is near, jump toward it
      if (!mc.grounded && mc.vy < -4 && ahead.type === 'wallRunPanel') {
        this.steerTargetX = ahead.side === 'L' ? -world.halfWidthAt(mc.z) : world.halfWidthAt(mc.z);
      }
    }

    // wall-run handling: jump off near the end of the run
    if (mc.wallRun && mc.wallRunTimer < 0.35) {
      this.input.jump = true;
    }

    // steering toward target
    const dx = this.steerTargetX - mc.x;
    this.input.steer = Math.max(-1, Math.min(1, dx * 0.9));

    mc.step(dt, this.input, world);
  }
}
