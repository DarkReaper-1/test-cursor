import type { AIAction, BoxCollider, LevelDef, PowerUpType, SegmentSpec } from '../core/types';
import type { CollisionWorld } from '../game/MovementController';
import { BuiltLevel, CheckpointDef, DynamicObjectDef, RenderBox, SweeperDef, THEMES, ThemePalette, mulberry32 } from './LevelTypes';

/**
 * Builds playable levels from modular piece specs. Every piece appends
 * colliders + render boxes + coins + AI hints at the current cursor and
 * advances it. All layouts are original and parameter-driven.
 */

const FLOOR_TH = 1.0; // floor slab thickness

class Ctx {
  z = 0;
  colliders: BoxCollider[] = [];
  statics: RenderBox[] = [];
  dynamics: DynamicObjectDef[] = [];
  sweepers: SweeperDef[] = [];
  coins: { x: number; y: number; z: number }[] = [];
  powerUps: { type: PowerUpType; x: number; y: number; z: number }[] = [];
  aiActions: AIAction[] = [];
  checkpoints: CheckpointDef[] = [];
  finishZ = 0;
  nextId = 1;
  cpIndex = 0;

  constructor(
    public half: number,
    public pal: ThemePalette,
    public rng: () => number,
    public difficulty: number,
  ) {}

  collider(c: Omit<BoxCollider, 'id'>): BoxCollider {
    const full = { ...c, id: this.nextId++ };
    this.colliders.push(full);
    return full;
  }

  box(b: RenderBox): void {
    this.statics.push(b);
  }

  /** solid slab: collider + render box */
  slab(cx: number, topY: number, cz: number, sx: number, sz: number, color: number, thickness = FLOOR_TH, glow = 0): BoxCollider {
    this.box({ x: cx, y: topY - thickness / 2, z: cz, sx, sy: thickness, sz, color, glow });
    return this.collider({
      kind: 'solid',
      minX: cx - sx / 2, maxX: cx + sx / 2,
      minY: topY - thickness, maxY: topY,
      minZ: cz - sz / 2, maxZ: cz + sz / 2,
    });
  }

  /** decorative-only box */
  deco(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: number, glow = 0): void {
    this.box({ x: cx, y: cy, z: cz, sx, sy, sz, color, glow });
  }

  floor(len: number, y = 0, xOff = 0, width?: number): void {
    const w = width ?? this.half * 2;
    this.slab(xOff, y, this.z + len / 2, w, len, this.pal.floor);
    // edge trim for readability
    this.deco(xOff - w / 2 + 0.15, y + 0.06, this.z + len / 2, 0.3, 0.12, len, this.pal.floorEdge);
    this.deco(xOff + w / 2 - 0.15, y + 0.06, this.z + len / 2, 0.3, 0.12, len, this.pal.floorEdge);
  }

  coinLine(x: number, y: number, zStart: number, count: number, spacing = 1.6): void {
    for (let i = 0; i < count; i++) this.coins.push({ x, y, z: zStart + i * spacing });
  }

  coinArc(x: number, zStart: number, count = 5, peak = 2.2, spacing = 1.5): void {
    for (let i = 0; i < count; i++) {
      const t = count <= 1 ? 0.5 : i / (count - 1);
      this.coins.push({ x, y: 0.8 + Math.sin(t * Math.PI) * peak, z: zStart + i * spacing });
    }
  }

  ai(a: AIAction): void {
    this.aiActions.push(a);
  }

  lanes(): number[] {
    const l = Math.max(1.5, this.half - 1.5);
    return [-l, 0, l];
  }
}

type PieceFn = (ctx: Ctx, len: number, p: Record<string, number>) => void;

// --------------------------------------------------------------- pieces

const pieces: Record<string, { defaultLen: number; build: PieceFn }> = {
  start: {
    defaultLen: 26,
    build: (ctx, len) => {
      ctx.floor(len);
      // start gate
      const g = ctx.pal.accent;
      ctx.deco(-ctx.half - 0.4, 2.6, ctx.z + 6, 0.7, 5.2, 0.7, g, 0.35);
      ctx.deco(ctx.half + 0.4, 2.6, ctx.z + 6, 0.7, 5.2, 0.7, g, 0.35);
      ctx.deco(0, 5.4, ctx.z + 6, ctx.half * 2 + 1.5, 0.7, 0.7, g, 0.35);
      ctx.z += len;
    },
  },

  run: {
    defaultLen: 18,
    build: (ctx, len) => {
      ctx.floor(len);
      // light decoration: side blocks
      if (ctx.rng() > 0.5) {
        const side = ctx.rng() > 0.5 ? 1 : -1;
        ctx.deco(side * (ctx.half - 0.8), 0.5, ctx.z + len * 0.5, 1.2, 1.0, 2.2, ctx.pal.prop1);
      }
      ctx.z += len;
    },
  },

  coinsRun: {
    defaultLen: 20,
    build: (ctx, len) => {
      ctx.floor(len);
      const lane = ctx.lanes()[Math.floor(ctx.rng() * 3)];
      ctx.coinLine(lane, 0.9, ctx.z + 3, Math.min(9, Math.floor(len / 2)));
      ctx.z += len;
    },
  },

  gap: {
    defaultLen: 0,
    build: (ctx, len, p) => {
      const width = p.width ?? 5;
      const lead = 10;
      ctx.floor(lead);
      // warning stripes at the edge
      ctx.deco(0, 0.06, ctx.z + lead - 0.5, ctx.half * 2, 0.14, 1, ctx.pal.accent, 0.25);
      ctx.z += lead;
      // coins over the gap reward a clean jump
      ctx.coinArc(0, ctx.z + 0.5, 4, 1.8, width / 4);
      ctx.ai({ z: ctx.z - 1.6, action: width > 7 ? 'doubleJump' : 'jump' });
      ctx.z += width;
      ctx.floor(8);
      ctx.z += 8;
    },
  },

  vaultBarrier: {
    defaultLen: 16,
    build: (ctx, len, p) => {
      ctx.floor(len);
      const h = p.height ?? 1.0;
      const zc = ctx.z + len / 2;
      ctx.collider({
        kind: 'vault',
        minX: -ctx.half, maxX: ctx.half,
        minY: 0, maxY: h,
        minZ: zc - 0.45, maxZ: zc + 0.45,
      });
      // body + bright top lip + approach chevrons for mobile readability
      ctx.deco(0, h / 2, zc, ctx.half * 2, h, 0.9, ctx.pal.vault, 0.1);
      ctx.deco(0, h - 0.06, zc, ctx.half * 2, 0.14, 1.05, 0xffffff, 0.45);
      ctx.deco(0, 0.05, zc - 2.2, 2.4, 0.1, 0.55, ctx.pal.accent, 0.35);
      ctx.deco(0, 0.05, zc - 1.4, 1.6, 0.1, 0.45, ctx.pal.accent, 0.25);
      ctx.coinArc(ctx.lanes()[1], zc - 2.5, 4, 1.9, 1.6);
      ctx.z += len;
    },
  },

  slideBar: {
    defaultLen: 16,
    build: (ctx, len, p) => {
      ctx.floor(len);
      const zc = ctx.z + len / 2;
      const barY = p.barY ?? 1.05;
      ctx.collider({
        kind: 'slideUnder',
        minX: -ctx.half, maxX: ctx.half,
        minY: barY, maxY: barY + 0.7,
        minZ: zc - 0.35, maxZ: zc + 0.35,
      });
      // hazard-striped bar + tall posts so the slide cue is unmistakable
      ctx.deco(0, barY + 0.35, zc, ctx.half * 2, 0.7, 0.7, ctx.pal.bar, 0.2);
      for (let i = -2; i <= 2; i++) {
        ctx.deco(i * (ctx.half / 2.5), barY + 0.35, zc + 0.02, 0.55, 0.72, 0.18, 0xfbbf24, 0.35);
      }
      ctx.deco(-ctx.half + 0.35, (barY + 0.7) / 2, zc, 0.7, barY + 0.7, 0.7, ctx.pal.obstacle);
      ctx.deco(ctx.half - 0.35, (barY + 0.7) / 2, zc, 0.7, barY + 0.7, 0.7, ctx.pal.obstacle);
      ctx.deco(0, 0.05, zc - 2.4, 2.2, 0.1, 0.5, ctx.pal.bar, 0.3);
      ctx.coinLine(0, 0.55, zc - 2.5, 4, 1.4);
      ctx.ai({ z: zc - 3.2, action: 'slide' });
      ctx.z += len;
    },
  },

  wallGap: {
    defaultLen: 0,
    build: (ctx, len, p) => {
      const width = p.width ?? 12;
      const side = (p.side ?? (ctx.rng() > 0.5 ? 1 : -1)) >= 0 ? 1 : -1;
      const lead = 10;
      ctx.floor(lead);
      ctx.deco(0, 0.06, ctx.z + lead - 0.5, ctx.half * 2, 0.14, 1, ctx.pal.accent, 0.25);
      ctx.z += lead;
      // wall-run panel spanning the gap
      const px = side * (ctx.half + 0.25);
      const panel = ctx.collider({
        kind: 'solid',
        wallRunnable: true,
        minX: side > 0 ? ctx.half - 0.15 : -ctx.half - 0.65,
        maxX: side > 0 ? ctx.half + 0.65 : -ctx.half + 0.15,
        minY: -1.5, maxY: 4.5,
        minZ: ctx.z - 1, maxZ: ctx.z + width + 1,
      });
      void panel;
      ctx.deco(px, 1.5, ctx.z + width / 2, 0.8, 6, width + 2, ctx.pal.wall);
      ctx.deco(px - side * 0.45, 1.5, ctx.z + width / 2, 0.1, 5.6, width + 2, ctx.pal.accent, 0.3);
      // coins along the wall
      ctx.coinLine(side * (ctx.half - 0.9), 1.6, ctx.z + 2, Math.floor(width / 2), 2);
      // AI: steer to wall, jump into wall-run
      ctx.ai({ z: ctx.z - 8, action: 'steer', targetX: side * (ctx.half - 0.6) });
      ctx.ai({ z: ctx.z - 1.4, action: 'jump' });
      ctx.z += width;
      ctx.floor(10);
      ctx.ai({ z: ctx.z + 2, action: 'steer', targetX: 0 });
      ctx.z += 10;
    },
  },

  platforms: {
    defaultLen: 0,
    build: (ctx, len, p) => {
      const count = Math.max(2, Math.floor(p.count ?? 3));
      const gapW = p.gap ?? 3.2;
      const platLen = p.platLen ?? 5;
      const lead = 8;
      ctx.floor(lead);
      ctx.z += lead;
      let y = 0;
      for (let i = 0; i < count; i++) {
        ctx.ai({ z: ctx.z - 1.4, action: 'jump' });
        ctx.z += gapW;
        y = Math.max(0, y + (ctx.rng() > 0.6 ? 0.6 : ctx.rng() > 0.4 ? 0 : -0.6));
        const lane = ctx.lanes()[Math.floor(ctx.rng() * 3)];
        const w = Math.max(3.4, ctx.half * (1.0 + ctx.rng() * 0.6));
        ctx.slab(lane * 0.4, y, ctx.z + platLen / 2, w, platLen, i % 2 ? ctx.pal.floor : ctx.pal.prop1);
        if (i % 2 === 0) ctx.coinLine(lane * 0.4, y + 0.9, ctx.z + 1, 3, 1.5);
        ctx.ai({ z: ctx.z - gapW - 1, action: 'steer', targetX: lane * 0.4 });
        ctx.z += platLen;
      }
      ctx.ai({ z: ctx.z - 1.2, action: 'jump' });
      ctx.z += gapW;
      ctx.floor(8);
      ctx.ai({ z: ctx.z + 1, action: 'steer', targetX: 0 });
      ctx.z += 8;
    },
  },

  movingPlatforms: {
    defaultLen: 0,
    build: (ctx, len, p) => {
      const count = Math.max(1, Math.floor(p.count ?? 2));
      const gapW = p.gap ?? 3.5;
      const lead = 8;
      ctx.floor(lead);
      ctx.z += lead;
      for (let i = 0; i < count; i++) {
        ctx.ai({ z: ctx.z - 1.4, action: 'jump' });
        ctx.z += gapW;
        const platLen = 4.5;
        const w = 4;
        const collider = ctx.collider({
          kind: 'solid',
          minX: -w / 2, maxX: w / 2,
          minY: -FLOOR_TH, maxY: 0,
          minZ: ctx.z, maxZ: ctx.z + platLen,
          behavior: { type: 'movingX', amplitude: Math.max(1.5, ctx.half - w / 2 - 0.4), speed: 0.22 + 0.06 * ctx.difficulty, phase: ctx.rng() },
        });
        ctx.dynamics.push({
          collider,
          box: { x: 0, y: -FLOOR_TH / 2, z: ctx.z + platLen / 2, sx: w, sy: FLOOR_TH, sz: platLen, color: ctx.pal.accent, glow: 0.12 },
          originX: 0, originY: 0, originZ: ctx.z + platLen / 2,
        });
        ctx.z += platLen;
      }
      ctx.ai({ z: ctx.z - 1.2, action: 'jump' });
      ctx.z += gapW;
      ctx.floor(8);
      ctx.z += 8;
    },
  },

  sweeper: {
    defaultLen: 22,
    build: (ctx, len, p) => {
      ctx.floor(len);
      const zc = ctx.z + len / 2;
      ctx.sweepers.push({
        x: 0, y: 0.7, z: zc,
        armLength: ctx.half * 1.6,
        speed: (0.8 + ctx.difficulty * 0.25) * (ctx.rng() > 0.5 ? 1 : -1),
        phase: ctx.rng() * Math.PI * 2,
        color: ctx.pal.hazard,
      });
      // center pole
      ctx.deco(0, 1.6, zc, 0.6, 3.2, 0.6, ctx.pal.obstacle);
      ctx.coinLine(ctx.lanes()[0], 0.9, zc - 3, 4, 2);
      ctx.coinLine(ctx.lanes()[2], 0.9, zc - 3, 4, 2);
      ctx.z += len;
    },
  },

  fallingFloor: {
    defaultLen: 0,
    build: (ctx, len, p) => {
      const tiles = Math.max(2, Math.floor(p.count ?? 4));
      const tileLen = 4;
      const lead = 8;
      ctx.floor(lead);
      ctx.deco(0, 0.06, ctx.z + lead - 0.5, ctx.half * 2, 0.14, 1, ctx.pal.hazard, 0.2);
      ctx.z += lead;
      for (let i = 0; i < tiles; i++) {
        const w = ctx.half * 2;
        const collider = ctx.collider({
          kind: 'solid',
          minX: -w / 2, maxX: w / 2,
          minY: -FLOOR_TH, maxY: 0,
          minZ: ctx.z, maxZ: ctx.z + tileLen,
          behavior: { type: 'falling', delay: Math.max(0.35, 0.75 - ctx.difficulty * 0.07) },
        });
        ctx.dynamics.push({
          collider,
          box: { x: 0, y: -FLOOR_TH / 2, z: ctx.z + tileLen / 2, sx: w - 0.3, sy: FLOOR_TH, sz: tileLen - 0.25, color: i % 2 ? ctx.pal.breakable : ctx.pal.prop1, glow: 0.05 },
          originX: 0, originY: 0, originZ: ctx.z + tileLen / 2,
        });
        ctx.z += tileLen;
      }
      ctx.floor(8);
      ctx.z += 8;
    },
  },

  launchPad: {
    defaultLen: 0,
    build: (ctx, len, p) => {
      const gapW = p.width ?? 12;
      const lead = 10;
      ctx.floor(lead);
      // pad at the edge
      const padZ = ctx.z + lead - 2;
      ctx.collider({
        kind: 'launch',
        minX: -ctx.half, maxX: ctx.half,
        minY: -0.2, maxY: 0.9,
        minZ: padZ - 1.2, maxZ: padZ + 1.2,
        data: { vy: 14.5, boost: 1.25 },
      });
      ctx.deco(0, 0.12, padZ, ctx.half * 2 - 0.6, 0.24, 2.4, ctx.pal.launch, 0.6);
      ctx.z += lead;
      ctx.coinArc(0, ctx.z + gapW * 0.25, 5, 3.4, gapW * 0.12);
      ctx.z += gapW;
      ctx.floor(10);
      ctx.z += 10;
    },
  },

  speedStrip: {
    defaultLen: 18,
    build: (ctx, len) => {
      ctx.floor(len);
      const zc = ctx.z + len / 2;
      ctx.collider({
        kind: 'boost',
        minX: -ctx.half, maxX: ctx.half,
        minY: -0.2, maxY: 0.8,
        minZ: zc - 2.5, maxZ: zc + 2.5,
        data: { mult: 1.4, dur: 2.2 },
      });
      for (let i = 0; i < 4; i++) {
        ctx.deco(0, 0.08, zc - 1.8 + i * 1.2, ctx.half * 2 - 1, 0.16, 0.7, ctx.pal.boost, 0.55);
      }
      ctx.z += len;
    },
  },

  breakableWall: {
    defaultLen: 16,
    build: (ctx, len, p) => {
      ctx.floor(len);
      const zc = ctx.z + len / 2;
      // wall spans the track and shatters on contact (visual is a dynamic
      // mesh so it can be hidden when broken)
      const collider = ctx.collider({
        kind: 'breakable',
        minX: -ctx.half, maxX: ctx.half,
        minY: 0, maxY: 2.4,
        minZ: zc - 0.35, maxZ: zc + 0.35,
      });
      ctx.dynamics.push({
        collider,
        box: { x: 0, y: 1.2, z: zc, sx: ctx.half * 2, sy: 2.4, sz: 0.6, color: ctx.pal.breakable, glow: 0.12 },
        originX: 0, originY: 1.2, originZ: zc,
      });
      ctx.dynamics.push({
        collider,
        box: { x: 0, y: 1.2, z: zc + 0.32, sx: ctx.half * 0.8, sy: 1.6, sz: 0.08, color: 0xffffff, glow: 0.25 },
        originX: 0, originY: 1.2, originZ: zc + 0.32,
      });
      ctx.z += len;
    },
  },

  split: {
    defaultLen: 0,
    build: (ctx, len, p) => {
      const secLen = p.len ?? 34;
      const lead = 8;
      ctx.floor(lead);
      ctx.z += lead;
      const half = ctx.half;
      const laneW = half - 0.6;
      const safeX = -half / 2 - 0.5;
      const riskX = half / 2 + 0.5;
      // SAFE: wide path with two vault barriers (slower)
      ctx.slab(safeX, 0, ctx.z + secLen / 2, laneW + 1.2, secLen, ctx.pal.floor);
      for (const fz of [0.3, 0.65]) {
        const zc = ctx.z + secLen * fz;
        ctx.collider({
          kind: 'vault',
          minX: safeX - laneW / 2 - 0.6, maxX: safeX + laneW / 2 + 0.6,
          minY: 0, maxY: 1.0,
          minZ: zc - 0.4, maxZ: zc + 0.4,
        });
        ctx.deco(safeX, 0.5, zc, laneW + 1.2, 1.0, 0.8, ctx.pal.vault, 0.1);
      }
      // RISKY: narrow beam, boost at end, coins along
      const beamW = 1.5;
      ctx.slab(riskX, 0, ctx.z + secLen / 2, beamW, secLen, ctx.pal.accent, FLOOR_TH, 0.15);
      ctx.coinLine(riskX, 0.9, ctx.z + 4, Math.floor(secLen / 3), 3);
      ctx.collider({
        kind: 'boost',
        minX: riskX - beamW / 2, maxX: riskX + beamW / 2,
        minY: -0.2, maxY: 0.8,
        minZ: ctx.z + secLen - 5, maxZ: ctx.z + secLen - 2,
        data: { mult: 1.45, dur: 2.6 },
      });
      ctx.deco(riskX, 0.08, ctx.z + secLen - 3.5, beamW - 0.2, 0.16, 2.6, ctx.pal.boost, 0.55);
      // AI: skilled racers take the risk side
      ctx.ai({ z: ctx.z - 6, action: 'steer', targetX: ctx.rng() > 0.5 ? riskX : safeX });
      ctx.z += secLen;
      ctx.floor(10);
      ctx.ai({ z: ctx.z + 1, action: 'steer', targetX: 0 });
      ctx.z += 10;
    },
  },

  beams: {
    defaultLen: 0,
    build: (ctx, len, p) => {
      const secLen = p.len ?? 22;
      const lead = 8;
      ctx.floor(lead);
      ctx.deco(0, 0.06, ctx.z + lead - 0.5, ctx.half * 2, 0.14, 1, ctx.pal.accent, 0.25);
      ctx.z += lead;
      const beams = Math.max(2, Math.floor(p.count ?? 2));
      const beamW = 1.4;
      const xs = beams === 2 ? [-ctx.half / 2, ctx.half / 2] : [-ctx.half + 1, 0, ctx.half - 1];
      for (let i = 0; i < beams; i++) {
        ctx.slab(xs[i], 0, ctx.z + secLen / 2, beamW, secLen, i % 2 ? ctx.pal.prop1 : ctx.pal.floor);
        if (i === 0) ctx.coinLine(xs[i], 0.9, ctx.z + 3, Math.floor(secLen / 3), 2.4);
      }
      ctx.ai({ z: ctx.z - 4, action: 'steer', targetX: xs[Math.floor(ctx.rng() * xs.length)] });
      ctx.z += secLen;
      ctx.floor(8);
      ctx.ai({ z: ctx.z + 1, action: 'steer', targetX: 0 });
      ctx.z += 8;
    },
  },

  rampJump: {
    defaultLen: 0,
    build: (ctx, len, p) => {
      const steps = 5;
      const stepH = 0.42;
      const stepLen = 1.6;
      const lead = 6;
      ctx.floor(lead);
      ctx.z += lead;
      // stepped ramp (climbable via stepUp)
      for (let i = 0; i < steps; i++) {
        ctx.slab(0, (i + 1) * stepH, ctx.z + stepLen / 2, ctx.half * 2, stepLen, ctx.pal.prop1, (i + 1) * stepH + FLOOR_TH);
        ctx.z += stepLen;
      }
      const topY = steps * stepH;
      // boost strip on the top
      ctx.collider({
        kind: 'boost',
        minX: -ctx.half, maxX: ctx.half,
        minY: topY - 0.2, maxY: topY + 0.8,
        minZ: ctx.z - stepLen, maxZ: ctx.z,
        data: { mult: 1.35, dur: 1.8 },
      });
      ctx.deco(0, topY + 0.08, ctx.z - stepLen / 2, ctx.half * 2 - 1, 0.16, 1.2, ctx.pal.boost, 0.55);
      const gapW = p.width ?? 9;
      ctx.ai({ z: ctx.z - 1.2, action: 'jump' });
      ctx.coinArc(0, ctx.z + 1, 5, topY + 1.5, gapW / 5);
      ctx.z += gapW;
      ctx.floor(10);
      ctx.z += 10;
    },
  },

  checkpoint: {
    defaultLen: 10,
    build: (ctx, len) => {
      ctx.floor(len);
      const zc = ctx.z + len / 2;
      const idx = ctx.cpIndex++;
      ctx.collider({
        kind: 'checkpoint',
        minX: -ctx.half, maxX: ctx.half,
        minY: -0.5, maxY: 4,
        minZ: zc - 0.5, maxZ: zc + 0.5,
        data: { index: idx },
      });
      ctx.checkpoints.push({ z: zc, index: idx, respawnX: 0, respawnY: 0.2 });
      // arch
      ctx.deco(-ctx.half - 0.3, 1.9, zc, 0.5, 3.8, 0.5, ctx.pal.accent, 0.4);
      ctx.deco(ctx.half + 0.3, 1.9, zc, 0.5, 3.8, 0.5, ctx.pal.accent, 0.4);
      ctx.deco(0, 3.9, zc, ctx.half * 2 + 1.1, 0.45, 0.45, ctx.pal.accent, 0.4);
      ctx.z += len;
    },
  },

  powerUp: {
    defaultLen: 12,
    build: (ctx, len, p) => {
      ctx.floor(len);
      const types: PowerUpType[] = ['speed', 'shield', 'magnet', 'slowmo', 'airboost'];
      const t = types[Math.floor((p.type ?? ctx.rng() * types.length)) % types.length];
      const lane = ctx.lanes()[Math.floor(ctx.rng() * 3)];
      ctx.powerUps.push({ type: t, x: lane, y: 1.1, z: ctx.z + len / 2 });
      ctx.z += len;
    },
  },

  finish: {
    defaultLen: 30,
    build: (ctx, len) => {
      ctx.floor(len);
      const zc = ctx.z + 8;
      ctx.finishZ = zc;
      ctx.collider({
        kind: 'finish',
        minX: -ctx.half - 1, maxX: ctx.half + 1,
        minY: -0.5, maxY: 6,
        minZ: zc - 0.6, maxZ: zc + 0.6,
      });
      // finish gate: checkered posts
      for (let i = 0; i < 6; i++) {
        ctx.deco(-ctx.half - 0.45, 0.5 + i, zc, 0.8, 1, 0.8, i % 2 ? 0xffffff : 0x111111);
        ctx.deco(ctx.half + 0.45, 0.5 + i, zc, 0.8, 1, 0.8, i % 2 ? 0x111111 : 0xffffff);
      }
      ctx.deco(0, 6.2, zc, ctx.half * 2 + 2.5, 0.8, 0.8, ctx.pal.accent, 0.4);
      ctx.z += len;
    },
  },
};

// --------------------------------------------------------------- builder

export function buildLevel(def: LevelDef): BuiltLevel {
  const pal = THEMES[def.theme];
  const rng = mulberry32(def.id * 7919 + 13);
  const ctx = new Ctx(def.halfWidth, pal, rng, def.difficulty);

  for (const seg of def.segments) {
    const piece = pieces[seg.type];
    if (!piece) {
      console.warn(`[LevelBuilder] unknown piece "${seg.type}"`);
      continue;
    }
    piece.build(ctx, seg.length ?? piece.defaultLen, seg.params ?? {});
  }
  if (ctx.finishZ === 0) {
    pieces.finish.build(ctx, pieces.finish.defaultLen, {});
  }

  // start slots spread across the track
  const totalRacers = def.opponents + 1;
  const slots: number[] = [];
  for (let i = 0; i < totalRacers; i++) {
    const t = totalRacers === 1 ? 0.5 : i / (totalRacers - 1);
    slots.push((t - 0.5) * (def.halfWidth * 2 - 1.6));
  }

  return {
    theme: def.theme,
    halfWidth: def.halfWidth,
    length: ctx.z,
    finishZ: ctx.finishZ,
    colliders: ctx.colliders,
    statics: ctx.statics,
    dynamics: ctx.dynamics,
    sweepers: ctx.sweepers,
    coins: ctx.coins,
    powerUps: ctx.powerUps,
    aiActions: ctx.aiActions.sort((a, b) => a.z - b.z),
    checkpoints: ctx.checkpoints,
    startSlots: slots,
  };
}

/** Z-bucketed collision index implementing CollisionWorld. */
export class LevelCollisionWorld implements CollisionWorld {
  private buckets = new Map<number, BoxCollider[]>();
  private bucketSize = 8;
  private out: BoxCollider[] = [];
  halfWidth: number;

  constructor(colliders: readonly BoxCollider[], halfWidth: number) {
    this.halfWidth = halfWidth;
    for (const c of colliders) this.insert(c);
  }

  insert(c: BoxCollider): void {
    const b0 = Math.floor(c.minZ / this.bucketSize);
    const b1 = Math.floor(c.maxZ / this.bucketSize);
    for (let b = b0; b <= b1; b++) {
      let arr = this.buckets.get(b);
      if (!arr) {
        arr = [];
        this.buckets.set(b, arr);
      }
      arr.push(c);
    }
  }

  /** Re-index a dynamic collider whose z range changed (rare; falling uses y only). */
  queryZ(zMin: number, zMax: number): readonly BoxCollider[] {
    this.out.length = 0;
    const b0 = Math.floor(zMin / this.bucketSize);
    const b1 = Math.floor(zMax / this.bucketSize);
    for (let b = b0; b <= b1; b++) {
      const arr = this.buckets.get(b);
      if (!arr) continue;
      for (const c of arr) {
        if (c.maxZ >= zMin && c.minZ <= zMax && !this.out.includes(c)) this.out.push(c);
      }
    }
    return this.out;
  }

  halfWidthAt(_z: number): number {
    return this.halfWidth;
  }
}
