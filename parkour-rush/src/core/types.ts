/**
 * Shared types used across game systems. Pure data — no three.js imports here
 * so that logic modules remain unit-testable in Node.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Axis-aligned box collider. The whole game world collides through these. */
export interface BoxCollider {
  id: number;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  kind: ColliderKind;
  /** Side walls that support wall-running. */
  wallRunnable?: boolean;
  /** Disabled colliders are skipped (broken barriers, dropped platforms). */
  disabled?: boolean;
  /** Instantaneous velocity for moving platforms (units/s) so riders are carried. */
  velX?: number;
  velY?: number;
  velZ?: number;
  /** Behavior tag consumed by ObstacleSystem (moving, falling, sweeper...). */
  behavior?: ObstacleBehavior;
  /** Arbitrary payload (boost strength, damage...). */
  data?: Record<string, number>;
}

export type ColliderKind =
  | 'solid' // blocks and can be stood upon
  | 'vault' // low obstacle, auto-vaulted when approached on the ground
  | 'slideUnder' // overhead bar: must slide (or get knocked back)
  | 'hazard' // kills / stumbles on contact
  | 'launch' // launch pad: big vertical boost
  | 'boost' // speed strip
  | 'breakable' // breakable barrier
  | 'finish' // finish line trigger
  | 'checkpoint'; // checkpoint trigger

export interface ObstacleBehavior {
  type: 'movingX' | 'movingY' | 'falling' | 'sweeper';
  /** movement amplitude in units (movingX/movingY) or arm length (sweeper) */
  amplitude?: number;
  /** cycles per second */
  speed?: number;
  /** phase offset 0..1 */
  phase?: number;
  /** falling: seconds after touch before dropping */
  delay?: number;
}

/** Player/AI shared movement input for one simulation step. */
export interface MoveInput {
  /** continuous steering -1..1 (touch drag / buttons / AI) */
  steer: number;
  /** edge-triggered actions */
  jump: boolean;
  slide: boolean;
}

export type MoveState =
  | 'idle'
  | 'run'
  | 'sprint'
  | 'jump'
  | 'doubleJump'
  | 'fall'
  | 'land'
  | 'slide'
  | 'vault'
  | 'wallRunL'
  | 'wallRunR'
  | 'wallJump'
  | 'stumble'
  | 'dead'
  | 'victory'
  | 'defeat';

export type PowerUpType = 'speed' | 'shield' | 'magnet' | 'slowmo' | 'airboost';

export interface PowerUpPickupDef {
  type: PowerUpType;
  x: number;
  y: number;
  z: number;
}

export interface CoinDef {
  x: number;
  y: number;
  z: number;
}

export type LevelTheme =
  | 'rooftop'
  | 'construction'
  | 'street'
  | 'industrial'
  | 'bridge'
  | 'sunset'
  | 'night';

/** One modular level piece instance in a level definition. */
export interface SegmentSpec {
  type: SegmentType;
  /** length override in units */
  length?: number;
  /** generic params per piece type */
  params?: Record<string, number>;
}

export type SegmentType =
  | 'start'
  | 'run'
  | 'coinsRun'
  | 'gap'
  | 'vaultBarrier'
  | 'slideBar'
  | 'wallGap' // gap crossed by wall-running on side panels
  | 'platforms' // stepped platforms over a pit
  | 'movingPlatforms'
  | 'sweeper'
  | 'fallingFloor'
  | 'launchPad'
  | 'speedStrip'
  | 'breakableWall'
  | 'split' // risk/reward: safe long lane vs risky short lane
  | 'beams' // narrow beams over hazard
  | 'rampJump'
  | 'checkpoint'
  | 'powerUp'
  | 'finish';

export interface LevelDef {
  id: number;
  name: string;
  theme: LevelTheme;
  /** difficulty 1..5 shown in UI and used by AI tuning */
  difficulty: number;
  /** number of AI opponents */
  opponents: number;
  /** track half width in units */
  halfWidth: number;
  segments: SegmentSpec[];
  /** stars requirement: time (s) for bonus star */
  targetTime: number;
}

/** AI action generated from level geometry: "do X when reaching z". */
export interface AIAction {
  z: number;
  action: 'jump' | 'doubleJump' | 'slide' | 'steer';
  /** for steer: target x */
  targetX?: number;
  /** priority window length in units */
  window?: number;
}

export type AISkill = 'easy' | 'normal' | 'hard';

export interface RacerSnapshot {
  id: number;
  name: string;
  isPlayer: boolean;
  progress: number; // meters along track
  finished: boolean;
  finishTime: number;
  eliminated: boolean;
}

export interface RaceResult {
  placement: number;
  totalRacers: number;
  timeSeconds: number;
  coinsCollected: number;
  stuntScore: number;
  xpEarned: number;
  coinsEarned: number;
  stars: number;
  levelId: number;
  newBestTime: boolean;
}

export type GameState =
  | 'boot'
  | 'menu'
  | 'levelSelect'
  | 'customize'
  | 'settings'
  | 'loading'
  | 'countdown'
  | 'racing'
  | 'paused'
  | 'finished'
  | 'results';

export interface SettingsData {
  musicOn: boolean;
  sfxOn: boolean;
  hapticsOn: boolean;
  reducedMotion: boolean;
  /** 'swipe' | 'buttons' */
  controlScheme: 'swipe' | 'buttons';
  /** 0.5 .. 2.0 swipe sensitivity multiplier */
  sensitivity: number;
  /** 'low' | 'medium' | 'high' | 'auto' */
  quality: 'low' | 'medium' | 'high' | 'auto';
  cameraShake: boolean;
}

export interface SaveData {
  version: number;
  coins: number;
  xp: number;
  playerLevel: number;
  /** highest unlocked level id (1-based) */
  unlockedLevel: number;
  /** per level: stars earned 0..3 */
  stars: Record<number, number>;
  /** per level: best time in seconds */
  bestTimes: Record<number, number>;
  ownedCharacters: string[];
  ownedTrails: string[];
  selectedCharacter: string;
  selectedTrail: string;
  selectedColor: string;
  /** unlocked accent colors (hex ids) */
  ownedColors: string[];
  /** last level the player started */
  lastPlayedLevel: number;
  tutorialDone: boolean;
  settings: SettingsData;
}
