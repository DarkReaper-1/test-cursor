import { describe, expect, it } from 'vitest';
import { MovementController } from '../src/game/MovementController';
import { PowerUpSystem } from '../src/game/systems/PowerUpSystem';

describe('PowerUpSystem', () => {
  it('applies a temporary speed surge and expires it', () => {
    const pu = new PowerUpSystem();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    let expired = '';
    pu.onExpire = (t) => {
      expired = t;
    };
    pu.apply('speed', mc);
    expect(mc.boostMult).toBeGreaterThan(1);
    expect(pu.activeEffects().some((e) => e.type === 'speed')).toBe(true);

    // run past duration
    for (let i = 0; i < 50; i++) pu.update(0.1, mc);
    expect(expired).toBe('speed');
    expect(pu.activeEffects().some((e) => e.type === 'speed')).toBe(false);
  });

  it('magnet and slowmo set callbacks / world scale', () => {
    const pu = new PowerUpSystem();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    let magnetDur = 0;
    pu.onMagnet = (d) => {
      magnetDur = d;
    };
    pu.apply('magnet', mc);
    expect(magnetDur).toBeGreaterThan(0);
    pu.apply('slowmo', mc);
    expect(pu.worldTimeScale).toBeLessThan(1);
    for (let i = 0; i < 50; i++) pu.update(0.1, mc);
    expect(pu.worldTimeScale).toBe(1);
  });

  it('airboost launches the player upward', () => {
    const pu = new PowerUpSystem();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    mc.grounded = true;
    pu.apply('airboost', mc);
    expect(mc.vy).toBeGreaterThan(8);
    expect(mc.grounded).toBe(false);
  });

  it('shield absorbs one hit then is consumed (no re-apply)', () => {
    const pu = new PowerUpSystem();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    mc.invulnTimer = 0;
    let breaks = 0;
    mc.events.onShieldBreak = () => {
      breaks++;
      pu.consumeShield();
    };
    pu.apply('shield', mc);
    pu.update(0, mc);
    expect(pu.hasShield()).toBe(true);
    expect(mc.shield).toBe(true);

    mc.stumble(1);
    expect(breaks).toBe(1);
    expect(mc.shield).toBe(false);
    expect(pu.hasShield()).toBe(false);

    // subsequent sync must not resurrect the shield
    pu.update(0.016, mc);
    expect(mc.shield).toBe(false);
    expect(mc.stumbleTimer).toBe(0); // first hit absorbed, no stumble applied
  });

  it('shield absorbs a hazard kill once', () => {
    const pu = new PowerUpSystem();
    const mc = new MovementController();
    mc.reset(0, 0.2, 0);
    mc.invulnTimer = 0;
    mc.events.onShieldBreak = () => pu.consumeShield();
    pu.apply('shield', mc);
    pu.update(0, mc);

    mc.kill('hazard');
    expect(mc.dead).toBe(false);
    expect(pu.hasShield()).toBe(false);

    mc.invulnTimer = 0;
    mc.kill('hazard');
    expect(mc.dead).toBe(true);
  });

  it('picks up nearby world power-ups', () => {
    const pu = new PowerUpSystem();
    const mc = new MovementController();
    mc.reset(0, 0.2, 5);
    let got = '';
    pu.onPickup = (t) => {
      got = t;
    };
    pu.build([{ type: 'magnet', x: 0, y: 1, z: 5.2 }]);
    pu.update(0.016, mc);
    expect(got).toBe('magnet');
    expect(pu.activeEffects().some((e) => e.type === 'magnet')).toBe(true);
    pu.dispose();
  });
});

describe('MovementController — shield & reset', () => {
  it('reset clears finished and shield flags', () => {
    const mc = new MovementController();
    mc.finished = true;
    mc.shield = true;
    mc.reset(1, 0.2, 3);
    expect(mc.finished).toBe(false);
    expect(mc.shield).toBe(false);
    expect(mc.x).toBe(1);
    expect(mc.z).toBe(3);
  });
});
