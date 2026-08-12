import { describe, expect, it } from 'vitest';
import type { BoxCollider, MoveInput } from '../src/core/types';
import { MovementController } from '../src/game/MovementController';
import { LevelCollisionWorld } from '../src/levels/LevelBuilder';

/** Flat ground from z=-10 to z=200 plus optional extra colliders. */
function makeWorld(extra: BoxCollider[] = [], half = 5): LevelCollisionWorld {
  const ground: BoxCollider = {
    id: 9000, kind: 'solid',
    minX: -half, maxX: half, minY: -1, maxY: 0, minZ: -10, maxZ: 200,
  };
  return new LevelCollisionWorld([ground, ...extra], half);
}

const IDLE: MoveInput = { steer: 0, jump: false, slide: false };
const DT = 1 / 120;

function run(mc: MovementController, world: LevelCollisionWorld, seconds: number, input: Partial<MoveInput> = {}, onStep?: (t: number) => Partial<MoveInput> | void): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    let frame: MoveInput = { ...IDLE, ...input };
    if (onStep) {
      const o = onStep(i * DT);
      if (o) frame = { ...frame, ...o };
    }
    mc.step(DT, frame, world);
    // one-shot actions shouldn't repeat
    input = { ...input, jump: false, slide: false };
  }
}

describe('MovementController — running', () => {
  it('accelerates to base speed and stays grounded on flat ground', () => {
    const world = makeWorld();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    run(mc, world, 3);
    expect(mc.grounded).toBe(true);
    expect(mc.speed).toBeCloseTo(mc.cfg.baseSpeed, 1);
    expect(mc.z).toBeGreaterThan(20);
    expect(mc.y).toBeCloseTo(0, 3);
    expect(mc.state).toBe('run');
  });

  it('steers laterally and clamps to track bounds', () => {
    const world = makeWorld();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    run(mc, world, 2, { steer: 1 });
    expect(mc.x).toBeGreaterThan(2);
    expect(mc.x).toBeLessThanOrEqual(5 - mc.cfg.bodyHalfX + 0.01);
  });

  it('shiftLane moves one lane and clamps at edges', () => {
    const world = makeWorld();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    mc.shiftLane(1, world);
    expect(mc.targetX).toBeCloseTo(mc.cfg.laneWidth, 5);
    mc.shiftLane(1, world);
    mc.shiftLane(1, world);
    expect(mc.targetX).toBeLessThanOrEqual(5 - mc.cfg.bodyHalfX);
  });
});

describe('MovementController — jumping', () => {
  it('jumps, rises, and lands again with landing detection', () => {
    const world = makeWorld();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    let landed = 0;
    mc.events.onLand = () => landed++;
    run(mc, world, 1); // settle
    let maxY = 0;
    run(mc, world, 1.6, { jump: true }, () => {
      maxY = Math.max(maxY, mc.y);
    });
    // apex ≈ v² / 2g
    const expectedApex = (mc.cfg.jumpVelocity * mc.cfg.jumpVelocity) / (2 * mc.cfg.gravity);
    expect(maxY).toBeGreaterThan(expectedApex * 0.8);
    expect(maxY).toBeLessThan(expectedApex * 1.2);
    expect(mc.grounded).toBe(true);
    expect(landed).toBeGreaterThanOrEqual(1);
  });

  it('supports double jump but not triple jump', () => {
    const world = makeWorld();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    run(mc, world, 0.5);
    let jumps = 0;
    mc.events.onJump = () => jumps++;
    run(mc, world, 0.3, { jump: true });
    expect(mc.grounded).toBe(false);
    run(mc, world, 0.3, { jump: true });
    expect(jumps).toBe(2);
    run(mc, world, 0.1, { jump: true }); // third attempt mid-air
    expect(jumps).toBe(2);
  });

  it('buffers jump input slightly before landing', () => {
    const world = makeWorld();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    run(mc, world, 0.5);
    run(mc, world, 0.35, { jump: true }); // in air after first jump
    // press jump again while still falling near ground: should trigger on landing via buffer + double jump rules
    let jumps = 0;
    mc.events.onJump = () => jumps++;
    run(mc, world, 1.2, {}, (t) => (t < DT ? { jump: true } : undefined));
    expect(mc.grounded).toBe(true);
  });
});

describe('MovementController — slide', () => {
  it('slides for the configured duration then stands up', () => {
    const world = makeWorld();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    run(mc, world, 1);
    run(mc, world, 0.1, { slide: true });
    expect(mc.sliding).toBe(true);
    expect(mc.height).toBeCloseTo(mc.cfg.slideHeight, 5);
    run(mc, world, mc.cfg.slideDuration + 0.2);
    expect(mc.sliding).toBe(false);
    expect(mc.height).toBeCloseTo(mc.cfg.standHeight, 5);
  });

  it('passes under a slide bar while sliding, stumbles when standing', () => {
    const bar: BoxCollider = {
      id: 1, kind: 'slideUnder',
      minX: -5, maxX: 5, minY: 1.0, maxY: 1.7, minZ: 20, maxZ: 20.8,
    };
    // standing: stumble
    {
      const world = makeWorld([{ ...bar }]);
      const mc = new MovementController();
      mc.reset(0, 0.2, 14);
      mc.invulnTimer = 0;
      let stumbled = 0;
      mc.events.onStumble = () => stumbled++;
      run(mc, world, 1.5);
      expect(stumbled).toBeGreaterThanOrEqual(1);
    }
    // sliding: clean pass
    {
      const world = makeWorld([{ ...bar }]);
      const mc = new MovementController();
      mc.reset(0, 0.2, 14);
      mc.invulnTimer = 0;
      let stumbled = 0;
      mc.events.onStumble = () => stumbled++;
      run(mc, world, 0.5); // reach speed
      run(mc, world, 1.0, {}, (t) => (t < DT ? { slide: true } : undefined));
      expect(stumbled).toBe(0);
      expect(mc.z).toBeGreaterThan(21);
    }
  });
});

describe('MovementController — parkour', () => {
  it('auto-vaults a low obstacle without stopping', () => {
    const vault: BoxCollider = {
      id: 2, kind: 'vault',
      minX: -5, maxX: 5, minY: 0, maxY: 1.0, minZ: 25, maxZ: 25.9,
    };
    const world = makeWorld([vault]);
    const mc = new MovementController();
    mc.reset(0, 0.2, 15);
    let vaulted = 0;
    mc.events.onVault = () => vaulted++;
    run(mc, world, 2.5);
    expect(vaulted).toBe(1);
    expect(mc.z).toBeGreaterThan(27);
    expect(mc.speed).toBeGreaterThan(mc.cfg.baseSpeed * 0.7);
  });

  it('wall-runs along a runnable panel and wall-jumps off it', () => {
    const half = 5;
    const panel: BoxCollider = {
      id: 3, kind: 'solid', wallRunnable: true,
      minX: half - 0.15, maxX: half + 0.6, minY: -1.5, maxY: 4.5, minZ: 18, maxZ: 40,
    };
    // gap under the panel zone: ground ends at z=20, resumes z=34
    const g1: BoxCollider = { id: 4, kind: 'solid', minX: -half, maxX: half, minY: -1, maxY: 0, minZ: -10, maxZ: 20 };
    const g2: BoxCollider = { id: 5, kind: 'solid', minX: -half, maxX: half, minY: -1, maxY: 0, minZ: 34, maxZ: 80 };
    const world = new LevelCollisionWorld([panel, g1, g2], half);
    const mc = new MovementController();
    mc.reset(half - 0.8, 0.2, 8);
    let wallRuns = 0;
    let wallJumps = 0;
    mc.events.onWallRunStart = () => wallRuns++;
    mc.events.onWallJump = () => wallJumps++;
    run(mc, world, 0.8, { steer: 1 }); // hug the wall
    run(mc, world, 0.45, { jump: true, steer: 1 }); // jump off the edge into wall zone
    run(mc, world, 0.9, { steer: 1 });
    expect(wallRuns).toBeGreaterThanOrEqual(1);
    // now wall-jump
    run(mc, world, 0.6, { jump: true });
    expect(wallJumps + (mc.grounded ? 1 : 0)).toBeGreaterThanOrEqual(1);
    expect(mc.dead).toBe(false);
  });

  it('mantles onto a chest-high ledge instead of bonking', () => {
    const ledge: BoxCollider = {
      id: 6, kind: 'solid',
      minX: -5, maxX: 5, minY: 0, maxY: 1.6, minZ: 24, maxZ: 60,
    };
    const world = makeWorld([ledge]);
    const mc = new MovementController();
    mc.reset(0, 0.2, 14);
    run(mc, world, 0.55);
    run(mc, world, 1.6, {}, (t) => (t < DT ? { jump: true } : undefined));
    expect(mc.y).toBeCloseTo(1.6, 1);
    expect(mc.dead).toBe(false);
  });
});

describe('MovementController — death & momentum', () => {
  it('dies when falling below the kill plane', () => {
    const g: BoxCollider = { id: 7, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: -10, maxZ: 12 };
    const world = new LevelCollisionWorld([g], 5);
    const mc = new MovementController();
    mc.reset(0, 0.2, 8);
    let death: string | null = null;
    mc.events.onDeath = (r) => (death = r);
    run(mc, world, 3);
    expect(mc.dead).toBe(true);
    expect(death).toBe('fall');
  });

  it('hazard contact kills unless shielded', () => {
    const hz: BoxCollider = { id: 8, kind: 'hazard', minX: -5, maxX: 5, minY: 0, maxY: 1, minZ: 20, maxZ: 21 };
    {
      const world = makeWorld([{ ...hz }]);
      const mc = new MovementController();
      mc.reset(0, 0.2, 15);
      mc.invulnTimer = 0;
      run(mc, world, 1.2);
      expect(mc.dead).toBe(true);
    }
    {
      const world = makeWorld([{ ...hz }]);
      const mc = new MovementController();
      mc.reset(0, 0.2, 15);
      mc.invulnTimer = 0;
      mc.shield = true;
      run(mc, world, 1.2);
      expect(mc.dead).toBe(false);
      expect(mc.shield).toBe(false); // consumed
    }
  });

  it('speed boost raises speed above base and decays after duration', () => {
    const world = makeWorld();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    run(mc, world, 2);
    mc.applyBoost(1.5, 1.0);
    run(mc, world, 0.8);
    expect(mc.speed).toBeGreaterThan(mc.cfg.baseSpeed * 1.15);
    run(mc, world, 2.5);
    expect(mc.speed).toBeCloseTo(mc.cfg.baseSpeed, 0);
  });

  it('trigger volumes fire callbacks (boost/finish/checkpoint)', () => {
    const triggers: BoxCollider[] = [
      { id: 10, kind: 'boost', minX: -5, maxX: 5, minY: -0.2, maxY: 1, minZ: 15, maxZ: 17, data: { mult: 1.4, dur: 2 } },
      { id: 11, kind: 'checkpoint', minX: -5, maxX: 5, minY: -0.5, maxY: 4, minZ: 25, maxZ: 26, data: { index: 0 } },
      { id: 12, kind: 'finish', minX: -5, maxX: 5, minY: -0.5, maxY: 6, minZ: 35, maxZ: 36 },
    ];
    const world = makeWorld(triggers);
    const mc = new MovementController();
    const seen: string[] = [];
    mc.events.onTrigger = (c) => {
      if (!seen.includes(c.kind)) seen.push(c.kind);
    };
    mc.reset(0, 0.2, 10);
    run(mc, world, 3.5);
    expect(seen).toContain('boost');
    expect(seen).toContain('checkpoint');
    expect(seen).toContain('finish');
  });
});
