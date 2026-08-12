import { expect, it } from 'vitest';
import { buildLevel, LevelCollisionWorld } from '../src/levels/LevelBuilder';
import { LEVELS } from '../src/levels/levels';
import { AIController, makeProfile, skillsForLevel } from '../src/game/AIController';
import { MovementController } from '../src/game/MovementController';
import { mulberry32 } from '../src/levels/LevelTypes';

/**
 * Pacing regression test: with a struggling beginner (~3.5 u/s effective),
 * rubber-banding must keep level-1 AI finish times humane (not "untouchably
 * fast") while every AI still completes the course without dying.
 */
it('level 1 AI pacing stays fair against a struggling beginner', () => {
  const def = LEVELS[0];
  const built = buildLevel(def);
  const world = new LevelCollisionWorld(built.colliders, built.halfWidth);
  const rng = mulberry32(def.id * 1337 + 7);
  const skills = skillsForLevel(def.difficulty, def.opponents);
  const DT = 1 / 120;

  // simulated struggling beginner: effective ~3.5 u/s (deaths, hesitation)
  const playerSpeed = 3.5;
  const minBand = 0.62 + def.difficulty * 0.05;

  const ais = skills.map((s, i) => {
    const profile = makeProfile(s, i, rng);
    profile.speedMult *= 0.92 + def.difficulty * 0.016;
    const mc = new MovementController();
    let lastCp = { x: 0, y: 0.2, z: 4 };
    mc.events = {
      onTrigger: (c) => {
        if (c.kind === 'boost') mc.applyBoost(c.data?.mult ?? 1.4, c.data?.dur ?? 2.2);
        else if (c.kind === 'launch' && mc.vy <= 1) {
          mc.vy = c.data?.vy ?? 14.5;
          mc.grounded = false;
          mc.applyBoost(c.data?.boost ?? 1.2, 1.2);
        } else if (c.kind === 'checkpoint') {
          lastCp = { x: 0, y: 0.2, z: (c.minZ + c.maxZ) / 2 + 0.5 };
        }
      },
    };
    mc.reset((i - 1) * 2, 0.2, 2.8);
    const ai = new AIController(mc, profile, built.aiActions, (i - 1) * 2, rng);
    return { ai, mc, profile, skill: s, finish: -1, deaths: 0, respawnT: -1, getCp: () => lastCp };
  });

  for (let step = 0; step < 120 * 180; step++) {
    const t = step * DT;
    const playerZ = Math.min(playerSpeed * t, built.finishZ);
    let allDone = true;
    for (const a of ais) {
      if (a.finish >= 0) continue;
      allDone = false;
      a.ai.updateRubberBand(playerZ, built.finishZ, minBand);
      a.ai.update(DT, world);
      if (a.mc.dead) {
        if (a.respawnT < 0) a.respawnT = 1.05;
        a.respawnT -= DT;
        if (a.respawnT <= 0) {
          a.respawnT = -1;
          a.deaths++;
          const cp = a.getCp();
          a.mc.respawn(cp.x, cp.y, cp.z);
          a.ai.syncPlanToPosition();
        }
      }
      if (a.mc.z >= built.finishZ) a.finish = t;
    }
    if (allDone) break;
  }

  for (const a of ais) {
    // everyone finishes and survives the course
    expect(a.finish, `${a.profile.name} (${a.skill}) should finish`).toBeGreaterThan(0);
    // nobody is untouchably fast on the tutorial level…
    expect(a.finish, `${a.profile.name} (${a.skill}) too fast`).toBeGreaterThan(34);
    // …but they don't crawl either
    expect(a.finish, `${a.profile.name} (${a.skill}) too slow`).toBeLessThan(75);
  }
});
