import { describe, expect, it } from 'vitest';
import { buildLevel, LevelCollisionWorld } from '../src/levels/LevelBuilder';
import { LEVELS } from '../src/levels/levels';
import { AIController, makeProfile, skillsForLevel } from '../src/game/AIController';
import { MovementController } from '../src/game/MovementController';
import { ParkourController } from '../src/game/ParkourController';
import { isCoinCollected } from '../src/game/systems/CollectibleSystem';
import { mulberry32 } from '../src/levels/LevelTypes';
import type { BoxCollider } from '../src/core/types';

describe('Level building', () => {
  it('ships at least 10 levels', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(10);
  });

  it('every level builds with a finish line, checkpoints, coins and colliders', () => {
    for (const def of LEVELS) {
      const built = buildLevel(def);
      expect(built.finishZ, `level ${def.id} finish`).toBeGreaterThan(50);
      expect(built.length).toBeGreaterThan(built.finishZ - 1);
      expect(built.colliders.length, `level ${def.id} colliders`).toBeGreaterThan(10);
      expect(built.coins.length, `level ${def.id} coins`).toBeGreaterThan(5);
      expect(built.checkpoints.length, `level ${def.id} checkpoints`).toBeGreaterThanOrEqual(1);
      expect(built.startSlots.length).toBe(def.opponents + 1);
      // checkpoints strictly increasing and before finish
      let prev = -1;
      for (const cp of built.checkpoints) {
        expect(cp.z).toBeGreaterThan(prev);
        expect(cp.z).toBeLessThan(built.finishZ);
        prev = cp.z;
      }
      // finish collider exists
      expect(built.colliders.some((c) => c.kind === 'finish')).toBe(true);
      // ground exists at start
      const world = new LevelCollisionWorld(built.colliders, built.halfWidth);
      const near = world.queryZ(0, 10);
      expect(near.some((c) => c.kind === 'solid' && c.maxY === 0)).toBe(true);
      // ai actions sorted
      for (let i = 1; i < built.aiActions.length; i++) {
        expect(built.aiActions[i].z).toBeGreaterThanOrEqual(built.aiActions[i - 1].z);
      }
    }
  });

  it('level builds are deterministic for the same definition', () => {
    const a = buildLevel(LEVELS[0]);
    const b = buildLevel(LEVELS[0]);
    expect(a.colliders.length).toBe(b.colliders.length);
    expect(a.coins).toEqual(b.coins);
    expect(a.finishZ).toBe(b.finishZ);
  });
});

describe('Collision world queries', () => {
  it('bucketed queries return exactly the overlapping colliders', () => {
    const cs: BoxCollider[] = [
      { id: 1, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: 0, maxZ: 50 },
      { id: 2, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: 100, maxZ: 120 },
    ];
    const world = new LevelCollisionWorld(cs, 5);
    expect(world.queryZ(10, 20).map((c) => c.id)).toEqual([1]);
    expect(world.queryZ(60, 70).length).toBe(0);
    expect(world.queryZ(45, 105).map((c) => c.id).sort()).toEqual([1, 2]);
  });
});

describe('ParkourController detection', () => {
  it('detects gaps ahead of the runner', () => {
    const cs: BoxCollider[] = [
      { id: 1, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: 0, maxZ: 20 },
      { id: 2, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: 26, maxZ: 60 },
    ];
    const world = new LevelCollisionWorld(cs, 5);
    const mc = new MovementController();
    mc.reset(0, 0, 12);
    mc.grounded = true;
    const pk = new ParkourController();
    const ahead = pk.detectAhead(mc, world);
    expect(ahead.type).toBe('gap');
    if (ahead.type === 'gap') {
      expect(ahead.distance).toBeGreaterThan(5);
      expect(ahead.distance).toBeLessThan(10);
    }
  });

  it('detects slide bars and vaults', () => {
    const cs: BoxCollider[] = [
      { id: 1, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: 0, maxZ: 80 },
      { id: 2, kind: 'slideUnder', minX: -5, maxX: 5, minY: 1.0, maxY: 1.7, minZ: 18, maxZ: 19 },
    ];
    const world = new LevelCollisionWorld(cs, 5);
    const mc = new MovementController();
    mc.reset(0, 0, 10);
    const pk = new ParkourController();
    expect(pk.detectAhead(mc, world).type).toBe('slideBar');
  });
});

describe('AI racing', () => {
  it('skill distribution matches difficulty', () => {
    expect(skillsForLevel(1, 4)).not.toContain('hard');
    expect(skillsForLevel(5, 6)).toContain('hard');
  });

  it('profiles have believable (non-perfect) parameters', () => {
    const rng = mulberry32(42);
    const easy = makeProfile('easy', 0, rng);
    const hard = makeProfile('hard', 1, rng);
    expect(easy.speedMult).toBeLessThan(hard.speedMult);
    expect(hard.speedMult).toBeLessThanOrEqual(1.04); // never impossibly fast
    expect(easy.mistakeChance).toBeGreaterThan(hard.mistakeChance);
    expect(hard.reaction).toBeGreaterThan(0); // still human
  });

  it('AI navigates waypoint annotations across a gap course', () => {
    // ground with a 5u gap at z=40, jump hint before it
    const cs: BoxCollider[] = [
      { id: 1, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: -10, maxZ: 40 },
      { id: 2, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: 45, maxZ: 140 },
    ];
    const world = new LevelCollisionWorld(cs, 5);
    const rng = mulberry32(7);
    const mc = new MovementController();
    mc.reset(0, 0.2, 4);
    const profile = makeProfile('hard', 0, rng);
    profile.mistakeChance = 0; // deterministic test
    const ai = new AIController(mc, profile, [{ z: 38.4, action: 'jump' }], 0, rng);
    const DT = 1 / 120;
    for (let i = 0; i < 120 * 9 && mc.z < 100; i++) {
      ai.update(DT, world);
      if (mc.dead) break;
    }
    expect(mc.dead).toBe(false);
    expect(mc.z).toBeGreaterThan(60);
  });

  it('AI recovers via reactive scan even without annotations', () => {
    const cs: BoxCollider[] = [
      { id: 1, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: -10, maxZ: 40 },
      { id: 2, kind: 'solid', minX: -5, maxX: 5, minY: -1, maxY: 0, minZ: 44, maxZ: 140 },
    ];
    const world = new LevelCollisionWorld(cs, 5);
    const rng = mulberry32(9);
    const mc = new MovementController();
    mc.reset(0, 0.2, 4);
    const profile = makeProfile('hard', 0, rng);
    const ai = new AIController(mc, profile, [], 0, rng); // no plan at all
    const DT = 1 / 120;
    for (let i = 0; i < 120 * 9 && mc.z < 100; i++) {
      ai.update(DT, world);
      if (mc.dead) break;
    }
    expect(mc.dead).toBe(false);
    expect(mc.z).toBeGreaterThan(60);
  });
});

describe('Collectibles', () => {
  it('collects coins inside the radius only', () => {
    expect(isCoinCollected({ x: 0, y: 0.9, z: 10 }, 0, 0, 10)).toBe(true);
    expect(isCoinCollected({ x: 0.5, y: 1.1, z: 10.4 }, 0, 0, 10)).toBe(true);
    expect(isCoinCollected({ x: 3, y: 0.9, z: 10 }, 0, 0, 10)).toBe(false);
    expect(isCoinCollected({ x: 0, y: 0.9, z: 14 }, 0, 0, 10)).toBe(false);
  });
});
