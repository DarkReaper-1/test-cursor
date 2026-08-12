import type { AIAction, BoxCollider, CoinDef, LevelTheme, PowerUpPickupDef } from '../core/types';

/** A renderable box (merged into batched geometry at build time). */
export interface RenderBox {
  x: number;
  y: number; // center y
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: number;
  /** emissive-ish boost for neon/glow pieces (applied via vertex color) */
  glow?: number;
}

/** A dynamic object: its collider is animated by ObstacleSystem and it owns a mesh. */
export interface DynamicObjectDef {
  collider: BoxCollider;
  box: RenderBox;
  /** origin values used by behaviors */
  originX: number;
  originY: number;
  originZ: number;
}

/** Rotating sweeper arm (analytic collision handled by ObstacleSystem). */
export interface SweeperDef {
  x: number;
  y: number;
  z: number;
  armLength: number;
  speed: number; // radians/s
  phase: number;
  color: number;
}

export interface CheckpointDef {
  z: number;
  index: number;
  /** respawn pose */
  respawnX: number;
  respawnY: number;
}

export interface BuiltLevel {
  theme: LevelTheme;
  halfWidth: number;
  length: number;
  finishZ: number;
  colliders: BoxCollider[];
  statics: RenderBox[];
  dynamics: DynamicObjectDef[];
  sweepers: SweeperDef[];
  coins: CoinDef[];
  powerUps: PowerUpPickupDef[];
  aiActions: AIAction[];
  checkpoints: CheckpointDef[];
  /** start x positions for racers */
  startSlots: number[];
}

export interface ThemePalette {
  sky: number;
  fog: number;
  floor: number;
  floorEdge: number;
  accent: number;
  obstacle: number;
  vault: number;
  bar: number;
  wall: number;
  hazard: number;
  boost: number;
  launch: number;
  breakable: number;
  prop1: number;
  prop2: number;
  sun: number;
  ambient: number;
  fogDensity: number;
}

export const THEMES: Record<LevelTheme, ThemePalette> = {
  rooftop: {
    sky: 0x87ceeb, fog: 0xa9d6e8, floor: 0x8d99ae, floorEdge: 0x5c677d, accent: 0xffd166,
    obstacle: 0x6c757d, vault: 0xe07a5f, bar: 0xef476f, wall: 0x94a3b8, hazard: 0xd90429,
    boost: 0x06d6a0, launch: 0x118ab2, breakable: 0xc9a227, prop1: 0x718096, prop2: 0x4a5568,
    sun: 0xfff3d6, ambient: 0x9db4d0, fogDensity: 0.0065,
  },
  construction: {
    sky: 0xbde0fe, fog: 0xcde6f5, floor: 0xb08968, floorEdge: 0x7f5539, accent: 0xffb703,
    obstacle: 0x6b705c, vault: 0xe76f51, bar: 0xf4a261, wall: 0xa98467, hazard: 0xe63946,
    boost: 0x2a9d8f, launch: 0x264653, breakable: 0xddb892, prop1: 0xbc6c25, prop2: 0x606c38,
    sun: 0xfff0c9, ambient: 0xb9c6cf, fogDensity: 0.007,
  },
  street: {
    sky: 0x90e0ef, fog: 0xade8f4, floor: 0x495057, floorEdge: 0x343a40, accent: 0xffdd00,
    obstacle: 0x6c757d, vault: 0xff6d00, bar: 0xff8500, wall: 0x8d99ae, hazard: 0xd00000,
    boost: 0x38b000, launch: 0x0077b6, breakable: 0xffba08, prop1: 0x778da9, prop2: 0x415a77,
    sun: 0xffffff, ambient: 0xa3b2c2, fogDensity: 0.006,
  },
  industrial: {
    sky: 0xc4d7e0, fog: 0xb8c9d4, floor: 0x5f6d7a, floorEdge: 0x3d4a54, accent: 0xf9c74f,
    obstacle: 0x577590, vault: 0xf3722c, bar: 0xf94144, wall: 0x6a7f92, hazard: 0xdd1c1a,
    boost: 0x43aa8b, launch: 0x277da1, breakable: 0xbf9b30, prop1: 0x4d5d6d, prop2: 0x37424d,
    sun: 0xf5efe0, ambient: 0x9fb1bd, fogDensity: 0.0075,
  },
  bridge: {
    sky: 0xa2d2ff, fog: 0xbde0fe, floor: 0x7f8c99, floorEdge: 0x55606b, accent: 0xff5d8f,
    obstacle: 0x66788a, vault: 0xff922b, bar: 0xff6b6b, wall: 0x8896a6, hazard: 0xc1121f,
    boost: 0x2ec4b6, launch: 0x3a86ff, breakable: 0xe9c46a, prop1: 0x6d597a, prop2: 0x355070,
    sun: 0xfff8e7, ambient: 0xaebfd0, fogDensity: 0.0055,
  },
  sunset: {
    sky: 0xffb47a, fog: 0xffc599, floor: 0x9a8c98, floorEdge: 0x6d597a, accent: 0xffd60a,
    obstacle: 0x7d6b91, vault: 0xf25c54, bar: 0xf27059, wall: 0xa392b5, hazard: 0xba181b,
    boost: 0x52b788, launch: 0x4361ee, breakable: 0xe8a536, prop1: 0x5c548c, prop2: 0x413d66,
    sun: 0xffd9a0, ambient: 0xc99ca8, fogDensity: 0.007,
  },
  night: {
    sky: 0x10162b, fog: 0x1a2340, floor: 0x2b3355, floorEdge: 0x1c2340, accent: 0x00f5d4,
    obstacle: 0x3d4670, vault: 0xf72585, bar: 0xb5179e, wall: 0x394270, hazard: 0xff2d55,
    boost: 0x00f5d4, launch: 0x4cc9f0, breakable: 0xf9c74f, prop1: 0x232b4d, prop2: 0x171e38,
    sun: 0x8ea8ff, ambient: 0x35406e, fogDensity: 0.009,
  },
};

/** Deterministic RNG so level decoration is stable per level. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
