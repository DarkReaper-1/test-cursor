import { describe, expect, it } from 'vitest';
import { CheckpointManager } from '../src/game/race/CheckpointManager';
import { RaceManager } from '../src/game/race/RaceManager';
import { RacePositionManager } from '../src/game/race/RacePositionManager';
import type { RacerSnapshot } from '../src/core/types';

const snap = (id: number, progress: number, opts: Partial<RacerSnapshot> = {}): RacerSnapshot => ({
  id,
  name: `R${id}`,
  isPlayer: id === 0,
  progress,
  finished: false,
  finishTime: 0,
  eliminated: false,
  ...opts,
});

describe('RacePositionManager', () => {
  const pm = new RacePositionManager();

  it('ranks by progress while racing', () => {
    const racers = [snap(0, 50), snap(1, 80), snap(2, 20)];
    expect(pm.standings(racers)).toEqual([1, 0, 2]);
    expect(pm.placementOf(racers, 0)).toBe(2);
    expect(pm.placementOf(racers, 1)).toBe(1);
    expect(pm.placementOf(racers, 2)).toBe(3);
  });

  it('finished racers outrank unfinished, ordered by time', () => {
    const racers = [
      snap(0, 100, { finished: true, finishTime: 62 }),
      snap(1, 100, { finished: true, finishTime: 58 }),
      snap(2, 90),
    ];
    expect(pm.standings(racers)).toEqual([1, 0, 2]);
  });

  it('computes gaps to nearest rivals', () => {
    const racers = [snap(0, 50), snap(1, 65), snap(2, 30), snap(3, 49)];
    const g = pm.gaps(racers, 0);
    expect(g.ahead).toBe(15);
    expect(g.behind).toBe(1);
  });

  it('formats ordinals', () => {
    expect(RacePositionManager.ordinal(1)).toBe('1st');
    expect(RacePositionManager.ordinal(2)).toBe('2nd');
    expect(RacePositionManager.ordinal(3)).toBe('3rd');
    expect(RacePositionManager.ordinal(4)).toBe('4th');
    expect(RacePositionManager.ordinal(11)).toBe('11th');
    expect(RacePositionManager.ordinal(22)).toBe('22nd');
  });
});

describe('RaceManager', () => {
  it('runs countdown then starts racing and tracks time', () => {
    const rm = new RaceManager(500);
    rm.addRacer(0, 'You', true);
    const ticks: number[] = [];
    rm.onCountdownTick = (n) => ticks.push(n);
    let started = false;
    rm.onStart = () => (started = true);
    rm.beginCountdown(3);
    expect(rm.phase).toBe('countdown');
    for (let i = 0; i < 400; i++) rm.update(0.01); // 4 seconds
    expect(started).toBe(true);
    expect(rm.phase).toBe('racing');
    expect(ticks).toContain(3);
    expect(ticks).toContain(1);
    expect(ticks).toContain(0);
    expect(rm.time).toBeGreaterThan(0.9);
  });

  it('detects finishes in order and computes player placement', () => {
    const rm = new RaceManager(100);
    rm.addRacer(0, 'You', true);
    rm.addRacer(1, 'A', false);
    rm.addRacer(2, 'B', false);
    rm.beginCountdown(0.01);
    rm.update(0.02);
    expect(rm.phase).toBe('racing');
    rm.update(10);
    expect(rm.finishRacer(1)).toBe(1);
    rm.update(5);
    expect(rm.finishRacer(0)).toBe(2);
    expect(rm.playerPlacement()).toBe(2);
    // player finished → race done
    expect(rm.phase).toBe('done');
    // repeated finish returns -1
    expect(rm.finishRacer(0)).toBe(-1);
  });

  it('final standings rank unfinished racers by progress', () => {
    const rm = new RaceManager(100);
    rm.addRacer(0, 'You', true);
    rm.addRacer(1, 'A', false);
    rm.addRacer(2, 'B', false);
    rm.beginCountdown(0.01);
    rm.update(0.02);
    rm.update(20);
    rm.setProgress(1, 80);
    rm.setProgress(2, 40);
    rm.finishRacer(0);
    const standings = rm.finalStandings();
    expect(standings.map((s) => s.id)).toEqual([0, 1, 2]);
  });
});

describe('CheckpointManager', () => {
  const cps = [
    { z: 100, index: 0, respawnX: 0, respawnY: 0.2 },
    { z: 200, index: 1, respawnX: 1, respawnY: 0.2 },
  ];

  it('tracks per-racer checkpoint progress monotonically', () => {
    const cm = new CheckpointManager(cps);
    expect(cm.reach(0, 0)).toBe(true);
    expect(cm.reach(0, 0)).toBe(false); // repeat
    expect(cm.reach(0, 1)).toBe(true);
    expect(cm.reach(0, 0)).toBe(false); // backwards
    expect(cm.highestReached(0)).toBe(1);
    expect(cm.highestReached(7)).toBe(-1);
  });

  it('respawns at level start before any checkpoint, then at last checkpoint', () => {
    const cm = new CheckpointManager(cps, 0, 0.2);
    expect(cm.respawnPose(0).z).toBe(2);
    cm.reach(0, 0);
    expect(cm.respawnPose(0).z).toBeCloseTo(100.5);
    cm.reach(0, 1);
    const pose = cm.respawnPose(0);
    expect(pose.z).toBeCloseTo(200.5);
    expect(pose.x).toBe(1);
    // other racers unaffected
    expect(cm.respawnPose(3).z).toBe(2);
  });
});
