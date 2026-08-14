import type { MoveState } from '../core/types';
import type { RigParts } from './CharacterRig';

/**
 * Procedural animation state machine for the runner rig.
 *
 * Every state defines a target pose (joint rotations + hip offset), many
 * driven by a phase clock (run cycles). The controller *blends* joints
 * toward the active pose every frame, which gives smooth cross-fades
 * between states without discrete animation clips.
 */

interface Pose {
  hipsY: number;
  hipsPitch: number; // forward lean
  hipsRoll: number;
  hipsYaw: number;
  torsoPitch: number;
  headPitch: number;
  armL: number; // shoulder pitch
  armR: number;
  armLRoll: number;
  armRRoll: number;
  legL: number; // hip pitch
  legR: number;
  spin: number; // full-body flip angle (double jump)
}

const ZERO: Pose = {
  hipsY: 0, hipsPitch: 0, hipsRoll: 0, hipsYaw: 0, torsoPitch: 0, headPitch: 0,
  armL: 0, armR: 0, armLRoll: 0.08, armRRoll: -0.08, legL: 0, legR: 0, spin: 0,
};

export class AnimationController {
  private rig: RigParts;
  private phase = 0;
  private blend: Pose = { ...ZERO };
  private target: Pose = { ...ZERO };
  private spinProgress = 0;
  private prevState: MoveState = 'idle';
  private stateTime = 0;
  private baseScale: number;

  constructor(rig: RigParts, baseScale = 1) {
    this.rig = rig;
    this.baseScale = baseScale;
  }

  /**
   * @param speedRatio 0..1 how fast relative to max speed
   * @param vx lateral velocity for lean
   */
  update(dt: number, state: MoveState, speedRatio: number, vx: number, grounded: boolean): void {
    if (state !== this.prevState) {
      this.stateTime = 0;
      if (state === 'doubleJump' || state === 'jump') this.spinProgress = 0;
      this.prevState = state;
    }
    this.stateTime += dt;

    // run-cycle phase advances with speed
    this.phase += dt * (4 + speedRatio * 9);
    const p = this.phase;
    const t = this.target;
    Object.assign(t, ZERO);

    const runSwing = Math.sin(p) * (0.55 + speedRatio * 0.5);
    const bob = Math.abs(Math.sin(p)) * 0.05 * (0.5 + speedRatio);
    const lean = Math.max(-0.35, Math.min(0.35, -vx * 0.03));

    switch (state) {
      case 'idle':
        t.hipsY = Math.sin(p * 0.4) * 0.015;
        t.armL = 0.05;
        t.armR = -0.05;
        break;
      case 'run':
      case 'sprint': {
        const sprint = state === 'sprint' ? 1.25 : 1;
        t.legL = runSwing * sprint;
        t.legR = -runSwing * sprint;
        t.armL = -runSwing * 0.9 * sprint;
        t.armR = runSwing * 0.9 * sprint;
        t.hipsY = bob;
        t.hipsPitch = 0.12 + speedRatio * 0.16 * sprint;
        t.hipsRoll = lean;
        t.headPitch = -0.08;
        break;
      }
      case 'jump':
        t.legL = 0.7;
        t.legR = -0.35;
        t.armL = -1.4;
        t.armR = -1.2;
        t.armLRoll = 0.35;
        t.armRRoll = -0.35;
        t.hipsPitch = 0.1;
        break;
      case 'doubleJump': {
        // Full backflip — Parkour Race's signature air trick.
        this.spinProgress = Math.min(1, this.spinProgress + dt * 2.15);
        t.spin = this.spinProgress * Math.PI * 2;
        t.legL = 1.45;
        t.legR = 1.2;
        t.armL = -1.15;
        t.armR = -1.05;
        t.hipsPitch = 0.15;
        break;
      }
      case 'fall':
        t.legL = 0.35 + Math.sin(p * 1.6) * 0.12;
        t.legR = -0.2 + Math.cos(p * 1.6) * 0.12;
        t.armL = -2.4;
        t.armR = -2.4;
        t.armLRoll = 0.5;
        t.armRRoll = -0.5;
        t.hipsPitch = -0.06;
        break;
      case 'land':
        t.hipsY = -0.22;
        t.legL = 0.5;
        t.legR = 0.5;
        t.armL = 0.4;
        t.armR = 0.4;
        t.hipsPitch = 0.25;
        break;
      case 'slide':
        t.hipsY = -0.55;
        t.hipsPitch = -0.85;
        t.legL = 1.15;
        t.legR = 0.75;
        t.armL = 0.5;
        t.armR = -1.6;
        t.headPitch = 0.5;
        break;
      case 'vault':
        t.hipsY = 0.12;
        t.hipsPitch = 0.55;
        t.legL = 1.5;
        t.legR = 0.6;
        t.armL = -1.1;
        t.armR = 1.2;
        t.hipsRoll = 0.25;
        break;
      case 'wallRunL':
      case 'wallRunR': {
        const dir = state === 'wallRunL' ? 1 : -1;
        t.hipsRoll = dir * 0.5;
        t.legL = runSwing;
        t.legR = -runSwing;
        t.armL = dir > 0 ? -2.2 : -runSwing * 0.8;
        t.armR = dir > 0 ? runSwing * 0.8 : -2.2;
        t.hipsPitch = 0.2;
        break;
      }
      case 'wallJump':
        t.legL = 0.9;
        t.legR = -0.5;
        t.armL = -1.8;
        t.armR = -0.6;
        t.hipsYaw = 0.5;
        break;
      case 'stumble':
        t.hipsPitch = 0.55 + Math.sin(this.stateTime * 22) * 0.12;
        t.armL = -0.9 + Math.sin(this.stateTime * 25) * 0.4;
        t.armR = -0.9 - Math.sin(this.stateTime * 25) * 0.4;
        t.legL = runSwing * 0.5;
        t.legR = -runSwing * 0.5;
        t.headPitch = 0.3;
        break;
      case 'dead':
        t.hipsPitch = -0.9;
        t.hipsY = -0.3;
        t.armL = -2.6;
        t.armR = -2.6;
        t.legL = 0.4;
        t.legR = 0.6;
        break;
      case 'victory': {
        const hop = Math.abs(Math.sin(this.stateTime * 6));
        t.hipsY = hop * 0.18;
        t.armL = -2.9;
        t.armR = -2.9;
        t.armLRoll = 0.4 + Math.sin(this.stateTime * 8) * 0.2;
        t.armRRoll = -0.4 - Math.sin(this.stateTime * 8) * 0.2;
        break;
      }
      case 'defeat':
        t.hipsY = -0.28;
        t.hipsPitch = 0.5;
        t.headPitch = 0.55;
        t.armL = 0.15;
        t.armR = 0.15;
        t.legL = 0.35;
        t.legR = 0.35;
        break;
    }

    // blend all channels toward target (frame-rate independent smoothing)
    const k = 1 - Math.exp(-dt * (grounded ? 16 : 12));
    const b = this.blend;
    for (const key of Object.keys(ZERO) as (keyof Pose)[]) {
      if (key === 'spin') {
        b.spin = t.spin; // spin is driven directly, not smoothed
      } else {
        b[key] += (t[key] - b[key]) * k;
      }
    }

    // apply to rig
    const r = this.rig;
    const hipY = r.hipY ?? 0.88 * this.baseScale;
    r.hips.position.y = hipY + b.hipsY * this.baseScale;
    r.hips.rotation.set(b.hipsPitch + b.spin, b.hipsYaw, b.hipsRoll);
    r.torso.rotation.x = b.torsoPitch;
    r.head.rotation.x = b.headPitch;
    r.armL.rotation.set(b.armL, 0, b.armLRoll);
    r.armR.rotation.set(b.armR, 0, b.armRRoll);
    r.legL.rotation.x = b.legL;
    r.legR.rotation.x = b.legR;
  }
}
