import * as THREE from 'three';
import { audio } from '../core/AudioManager';
import { bus } from '../core/EventBus';
import { haptics } from '../core/Haptics';
import type { InputManager } from '../core/InputManager';
import type { BoxCollider, LevelDef, PowerUpType, RacerSnapshot, SettingsData } from '../core/types';
import { buildLevel, LevelCollisionWorld } from '../levels/LevelBuilder';
import { LevelRenderer } from '../levels/LevelRenderer';
import { THEMES } from '../levels/LevelTypes';
import { AIController, makeProfile, skillsForLevel } from './AIController';
import { AnimationController } from './AnimationController';
import { CameraController } from './CameraController';
import { createCharacterRig, RigParts, setRigOpacity } from './CharacterRig';
import { MovementController } from './MovementController';
import { ParkourController, SurfaceAhead } from './ParkourController';
import { PlayerController } from './PlayerController';
import { CheckpointManager } from './race/CheckpointManager';
import { RaceManager } from './race/RaceManager';
import { CollectibleSystem } from './systems/CollectibleSystem';
import { ObstacleSystem } from './systems/ObstacleSystem';
import { PowerUpSystem } from './systems/PowerUpSystem';
import { VFXManager } from './systems/VFXManager';
import { CHARACTERS, CharacterDef } from '../progression/CharacterSystem';
import { mulberry32 } from '../levels/LevelTypes';

/**
 * Game: owns the three.js scene + render loop and orchestrates every
 * gameplay system for one race at a time. Menus live in the DOM (UIManager);
 * this class is created once and loads/unloads levels.
 */

interface Racer {
  id: number;
  name: string;
  isPlayer: boolean;
  color: string;
  mc: MovementController;
  rig: RigParts;
  anim: AnimationController;
  ai: AIController | null;
  respawnTimer: number;
}

export interface HudSnapshot {
  position: number;
  totalRacers: number;
  time: number;
  progress: number; // 0..1
  coins: number;
  effects: { type: PowerUpType; remaining: number; total: number }[];
  gapAhead: number | null;
  gapBehind: number | null;
  speedRatio: number;
  prompt: SurfaceAhead;
}

export interface RaceEndData {
  placement: number;
  totalRacers: number;
  time: number;
  coins: number;
  stuntScore: number;
  standings: { name: string; isPlayer: boolean; finished: boolean; time: number }[];
}

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  cameraCtl: CameraController;
  vfx = new VFXManager();

  private levelRenderer = new LevelRenderer();
  private obstacles = new ObstacleSystem();
  private collectibles = new CollectibleSystem();
  private powerUps = new PowerUpSystem();
  private parkour = new ParkourController();

  private world: LevelCollisionWorld | null = null;
  private levelDef: LevelDef | null = null;
  private race: RaceManager | null = null;
  private checkpoints: CheckpointManager | null = null;

  player: PlayerController;
  private racers: Racer[] = [];
  private racerGroup = new THREE.Group();

  private running = false;
  private paused = false;
  private accumulator = 0;
  private lastTime = 0;
  private readonly FIXED_DT = 1 / 120;
  private raceEndTimer = -1;
  private snapshotCache: RacerSnapshot[] = [];
  private hudPrompt: SurfaceAhead = { type: 'none' };
  private promptTimer = 0;
  private fpsSamples: number[] = [];
  private autoQualityLevel = 2; // 0 low, 1 med, 2 high
  private settings: SettingsData | null = null;
  private launchCooldown = 0;

  onRaceEnd: ((data: RaceEndData) => void) | null = null;
  onHud: ((hud: HudSnapshot) => void) | null = null;
  onCountdown: ((n: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, input: InputManager) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraCtl = new CameraController(window.innerWidth / window.innerHeight);
    this.player = new PlayerController(input);
    this.scene.add(this.racerGroup, this.vfx.group, this.obstacles.group, this.powerUps.group);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.wireVfx();
    this.obstacles.onBarrierBreak = (x, y, z, color) => {
      this.vfx.breakDebris(x, y, z, color);
      this.cameraCtl.addShake(0.5);
      bus.emit('barrierBroken');
      haptics.heavy();
    };
    this.obstacles.onSweeperHit = (mc) => {
      const wasPlayer = mc === this.player.mc;
      mc.stumble(1.2);
      if (wasPlayer) this.cameraCtl.addShake(0.6);
    };
  }

  applySettings(s: SettingsData): void {
    this.settings = s;
    this.cameraCtl.reducedMotion = s.reducedMotion;
    this.cameraCtl.shakeEnabled = s.cameraShake;
    this.vfx.reducedMotion = s.reducedMotion;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (s.quality === 'low') {
      this.renderer.setPixelRatio(Math.min(dpr, 1) * 0.8);
      this.vfx.density = 0.5;
    } else if (s.quality === 'medium') {
      this.renderer.setPixelRatio(Math.min(dpr, 1.5));
      this.vfx.density = 0.8;
    } else if (s.quality === 'high') {
      this.renderer.setPixelRatio(Math.min(dpr, 2));
      this.vfx.density = 1;
    } else {
      this.applyAutoQuality();
    }
  }

  private applyAutoQuality(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const levels = [
      { pr: Math.min(dpr, 1) * 0.8, density: 0.5 },
      { pr: Math.min(dpr, 1.5), density: 0.8 },
      { pr: Math.min(dpr, 2), density: 1 },
    ];
    const l = levels[this.autoQualityLevel];
    this.renderer.setPixelRatio(l.pr);
    this.vfx.density = l.density;
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraCtl.camera.aspect = w / h;
    this.cameraCtl.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ level load

  loadLevel(def: LevelDef, playerChar: CharacterDef, playerColor: string, trailColor: string | null): void {
    this.unload();
    this.levelDef = def;
    const built = buildLevel(def);
    this.world = new LevelCollisionWorld(built.colliders, built.halfWidth);
    this.levelRenderer.build(built, this.scene);
    this.obstacles.build(built);
    this.collectibles.build(built.coins, this.scene);
    this.powerUps.build(built.powerUps);
    this.vfx.setTrail(trailColor);
    this.checkpoints = new CheckpointManager(built.checkpoints, 0, 0.2);
    this.race = new RaceManager(built.finishZ);
    this.race.onCountdownTick = (n) => {
      bus.emit('raceCountdown', { count: n });
      this.onCountdown?.(n);
    };
    this.race.onStart = () => {
      bus.emit('raceStarted');
      audio.startMusic(def.difficulty / 5);
    };
    this.race.onRacerFinish = (racer, placement) => {
      bus.emit('racerFinished', { racerId: racer.id, isPlayer: racer.isPlayer, placement });
      if (racer.isPlayer) this.handlePlayerFinish(placement);
    };

    // ---- player
    const startZ = 4;
    const slots = built.startSlots;
    const playerSlot = slots[Math.floor(slots.length / 2)];
    this.player.mc = this.rebuildPlayerMc();
    this.player.setWorld(this.world);
    this.player.resetScore();
    this.player.mc.reset(playerSlot, 0.2, startZ);
    this.player.onTrigger = (c) => this.handleTrigger(this.playerRacer(), c);

    const playerRig = createCharacterRig(playerChar, playerColor);
    this.racerGroup.add(playerRig.root);
    this.racers.push({
      id: 0,
      name: 'You',
      isPlayer: true,
      color: playerColor,
      mc: this.player.mc,
      rig: playerRig,
      anim: new AnimationController(playerRig, playerChar.scale),
      ai: null,
      respawnTimer: -1,
    });
    this.race.addRacer(0, 'You', true);

    // ---- AI opponents
    const rng = mulberry32(def.id * 1337 + 7);
    const skills = skillsForLevel(def.difficulty, def.opponents);
    let slotIdx = 0;
    for (let i = 0; i < def.opponents; i++) {
      if (slotIdx === Math.floor(slots.length / 2)) slotIdx++;
      const slot = slots[slotIdx % slots.length];
      slotIdx++;
      const profile = makeProfile(skills[i], i, rng);
      // gentler fields on early levels, full pace at difficulty 5
      profile.speedMult *= 0.92 + def.difficulty * 0.016;
      const events = this.makeAiEvents();
      const mc = new MovementController({}, events.handlers);
      mc.reset(slot, 0.2, startZ - 1.2);
      const charDef = CHARACTERS[(i + 1) % CHARACTERS.length];
      const rig = createCharacterRig(charDef, profile.color);
      this.racerGroup.add(rig.root);
      const ai = new AIController(mc, profile, built.aiActions, slot, rng);
      const racer: Racer = {
        id: i + 1,
        name: profile.name,
        isPlayer: false,
        color: profile.color,
        mc,
        rig,
        anim: new AnimationController(rig, charDef.scale),
        ai,
        respawnTimer: -1,
      };
      events.bind(racer, this);
      this.racers.push(racer);
      this.race.addRacer(racer.id, profile.name, false);
    }

    this.cameraCtl.snapTo(playerSlot, 0.2, startZ);
    this.raceEndTimer = -1;
    this.accumulator = 0;
    this.promptTimer = 0;
  }

  private rebuildPlayerMc(): MovementController {
    // keep the PlayerController's event wiring but fresh movement state
    const old = this.player.mc;
    old.reset(0, 0.2, 0);
    old.finished = false;
    old.cfg.baseSpeed = 11.5;
    return old;
  }

  private makeAiEvents(): { handlers: import('./MovementController').MovementEvents; bind: (r: Racer, g: Game) => void } {
    let racer: Racer | null = null;
    let game: Game | null = null;
    return {
      handlers: {
        onTrigger: (c) => {
          if (racer && game) game.handleTrigger(racer, c);
        },
        onDeath: () => {
          /* respawn scheduled in update */
        },
      },
      bind: (r, g) => {
        racer = r;
        game = g;
      },
    };
  }

  private playerRacer(): Racer {
    return this.racers[0];
  }

  unload(): void {
    for (const r of this.racers) {
      this.racerGroup.remove(r.rig.root);
      r.rig.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
    }
    this.racers = [];
    this.levelRenderer.dispose();
    this.obstacles.dispose();
    this.collectibles.dispose();
    this.powerUps.dispose();
    this.vfx.clear();
    this.race = null;
    this.world = null;
    audio.stopMusic();
  }

  // -------------------------------------------------------------- triggers

  private handleTrigger(racer: Racer, c: BoxCollider): void {
    if (!this.race || !this.world || !this.levelDef) return;
    const mc = racer.mc;
    switch (c.kind) {
      case 'boost': {
        const wasBoosting = mc.boostTimer > 0.2;
        mc.applyBoost(c.data?.mult ?? 1.4, c.data?.dur ?? 2.2);
        if (racer.isPlayer && !wasBoosting) {
          bus.emit('playerBoost', { source: 'strip' });
          haptics.light();
        }
        break;
      }
      case 'launch': {
        if (this.launchCooldown > 0 && racer.isPlayer) break;
        if (mc.vy <= 1) {
          mc.vy = c.data?.vy ?? 14.5;
          mc.grounded = false;
          mc.applyBoost(c.data?.boost ?? 1.2, 1.2);
          if (racer.isPlayer) {
            bus.emit('playerLaunched');
            this.cameraCtl.addShake(0.3);
            haptics.medium();
            this.launchCooldown = 0.6;
          }
        }
        break;
      }
      case 'breakable': {
        const pal = THEMES[this.levelDef.theme];
        if (this.obstacles.handleBreakable(c, mc, pal.breakable)) {
          this.obstacles.hideBreakableVisual(c.id);
        }
        break;
      }
      case 'checkpoint': {
        const idx = c.data?.index ?? 0;
        if (this.checkpoints?.reach(racer.id, idx) && racer.isPlayer) {
          bus.emit('checkpointReached', { index: idx, total: this.checkpoints.total });
        }
        break;
      }
      case 'finish': {
        if (!mc.finished) {
          mc.finished = true;
          const placement = this.race.finishRacer(racer.id);
          if (!racer.isPlayer && placement > 0) {
            mc.state = 'victory';
          }
        }
        break;
      }
    }
  }

  private handlePlayerFinish(placement: number): void {
    const mc = this.player.mc;
    mc.finished = true;
    mc.state = placement <= 3 ? 'victory' : 'defeat';
    bus.emit('raceFinished');
    audio.stopMusic();
    if (placement === 1) audio.victory();
    else if (placement > 3) audio.defeat();
    if (placement <= 3) haptics.success();
    const pr = this.playerRacer();
    this.vfx.confetti(mc.x, mc.y, mc.z + 2);
    void pr;
    this.raceEndTimer = 1.9;
  }

  // ------------------------------------------------------------- lifecycle

  startRace(): void {
    if (!this.race) return;
    this.race.beginCountdown(3);
    this.paused = false;
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  pause(): void {
    if (this.paused || !this.race || this.race.phase !== 'racing') return;
    this.paused = true;
    audio.stopMusic();
    bus.emit('racePaused');
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.lastTime = performance.now();
    if (this.race?.phase === 'racing') audio.startMusic((this.levelDef?.difficulty ?? 1) / 5);
    bus.emit('raceResumed');
  }

  stop(): void {
    this.running = false;
    this.unload();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get racePhase(): string {
    return this.race?.phase ?? 'idle';
  }

  // ------------------------------------------------------------- main loop

  private loop(now: number): void {
    if (!this.running) return;
    requestAnimationFrame((t) => this.loop(t));
    let dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (this.paused) return;

    // auto quality monitoring
    if (this.settings?.quality === 'auto' && dt > 0) {
      this.fpsSamples.push(1 / dt);
      if (this.fpsSamples.length >= 120) {
        const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
        this.fpsSamples.length = 0;
        if (avg < 42 && this.autoQualityLevel > 0) {
          this.autoQualityLevel--;
          this.applyAutoQuality();
        } else if (avg > 57 && this.autoQualityLevel < 2) {
          this.autoQualityLevel++;
          this.applyAutoQuality();
        }
      }
    }

    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= this.FIXED_DT && steps < 8) {
      this.simulate(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
      steps++;
    }
    this.render(dt);
  }

  private simulate(dt: number): void {
    if (!this.race || !this.world) return;
    this.race.update(dt);
    if (this.launchCooldown > 0) this.launchCooldown -= dt;
    const racing = this.race.phase === 'racing';
    const worldScale = this.powerUps.worldTimeScale;

    // player
    this.player.update(dt, racing && !this.player.mc.finished);
    const pmc = this.player.mc;

    // AI racers (affected by slow-mo)
    if (racing) {
      const aiDt = dt * worldScale;
      for (const r of this.racers) {
        if (r.isPlayer || !r.ai) continue;
        r.ai.updateRubberBand(pmc.z, this.race.finishZ);
        r.ai.update(aiDt, this.world);
      }
    }

    // obstacles (slow-mo affects them too)
    const mcs = this.racers.map((r) => r.mc);
    this.obstacles.update(dt * worldScale, mcs);

    // pickups & power-ups (player only)
    this.powerUps.update(dt, pmc);
    this.collectibles.update(dt, pmc.x, pmc.y, pmc.z);

    // progress + respawns
    for (const r of this.racers) {
      this.race.setProgress(r.id, Math.min(r.mc.z, this.race.finishZ));
      if (r.mc.dead && r.respawnTimer < 0) r.respawnTimer = 1.05;
      if (r.respawnTimer > 0) {
        r.respawnTimer -= dt;
        if (r.respawnTimer <= 0) {
          r.respawnTimer = -1;
          const pose = this.checkpoints!.respawnPose(r.id);
          r.mc.respawn(pose.x, pose.y, pose.z);
          r.ai?.syncPlanToPosition();
          if (r.isPlayer) bus.emit('playerRespawn');
        }
      }
    }

    // race-over timer → results
    if (this.raceEndTimer > 0) {
      this.raceEndTimer -= dt;
      if (this.raceEndTimer <= 0) {
        this.raceEndTimer = -1;
        this.emitRaceEnd();
      }
    }
  }

  private emitRaceEnd(): void {
    if (!this.race) return;
    const standings = this.race.finalStandings();
    const placement = this.race.playerPlacement();
    this.onRaceEnd?.({
      placement,
      totalRacers: this.racers.length,
      time: this.race.racers.find((r) => r.isPlayer)?.finishTime ?? this.race.time,
      coins: this.collectibles.collectedCount,
      stuntScore: this.player.stuntScore,
      standings: standings.map((s) => ({
        name: s.name,
        isPlayer: s.isPlayer,
        finished: s.finished,
        time: s.finishTime,
      })),
    });
  }

  private render(dt: number): void {
    const pmc = this.player.mc;
    const speedRatio = Math.min(1, pmc.speed / pmc.cfg.maxBoostSpeed);

    // rigs
    for (const r of this.racers) {
      const mc = r.mc;
      r.rig.root.position.set(mc.x, mc.y, mc.z);
      const targetYaw = THREE.MathUtils.clamp(mc.vx * 0.04, -0.4, 0.4);
      r.rig.root.rotation.y += (targetYaw - r.rig.root.rotation.y) * Math.min(1, dt * 8);
      const sr = Math.min(1, mc.speed / mc.cfg.maxBoostSpeed);
      r.anim.update(dt, mc.state, sr, mc.vx, mc.grounded);
      // respawn blink
      if (mc.invulnTimer > 0 && !mc.dead) {
        setRigOpacity(r.rig, Math.sin(performance.now() * 0.02) > 0 ? 0.35 : 0.8);
      } else {
        setRigOpacity(r.rig, 1);
      }
    }

    // continuous VFX
    const boosting = pmc.boostMult > 1.05;
    if (boosting && !this.vfx.reducedMotion) this.vfx.boostFlames(pmc.x, pmc.y, pmc.z);
    if (pmc.wallRun) this.vfx.wallRunSparks(pmc.x, pmc.y, pmc.z, pmc.wallRun);
    this.vfx.update(dt, pmc.x, pmc.y, pmc.z, speedRatio, boosting);

    // audio footsteps
    audio.tickFootsteps(dt, pmc.grounded && !pmc.sliding, speedRatio);

    // camera
    this.cameraCtl.update(dt, pmc.x, pmc.y, pmc.z, pmc.vx, speedRatio, pmc.state);

    // HUD (throttle prompts scan)
    this.promptTimer -= dt;
    if (this.promptTimer <= 0 && this.world) {
      this.promptTimer = 0.15;
      this.hudPrompt = this.parkour.detectAhead(pmc, this.world);
    }
    if (this.onHud && this.race) {
      this.snapshotCache = this.race.snapshots();
      const gaps = this.race.positions.gaps(this.snapshotCache, 0);
      this.onHud({
        position: this.race.playerPlacement(),
        totalRacers: this.racers.length,
        time: this.race.time,
        progress: Math.min(1, pmc.z / this.race.finishZ),
        coins: this.collectibles.collectedCount,
        effects: this.powerUps.activeEffects(),
        gapAhead: gaps.ahead,
        gapBehind: gaps.behind,
        speedRatio,
        prompt: this.hudPrompt,
      });
    }

    this.renderer.render(this.scene, this.cameraCtl.camera);
  }

  private wireVfx(): void {
    bus.on('playerLand', ({ impact }) => {
      const mc = this.player.mc;
      this.vfx.landingDust(mc.x, mc.y, mc.z, impact);
      if (impact > 0.35) this.cameraCtl.addShake(impact * 0.4);
    });
    bus.on('playerJump', () => {
      const mc = this.player.mc;
      this.vfx.jumpPuff(mc.x, mc.y, mc.z);
    });
    bus.on('playerStumble', () => this.cameraCtl.addShake(0.55));
    bus.on('playerDeath', () => {
      const mc = this.player.mc;
      this.vfx.deathBurst(mc.x, mc.y, mc.z);
      this.cameraCtl.addShake(0.9);
    });
    bus.on('coinCollected', ({ x, y, z }) => this.vfx.coinSparkle(x, y, z));
    bus.on('playerBoost', () => this.cameraCtl.addShake(0.15));
  }

  /** wiring for pickups → bus/HUD */
  bindPickupEvents(): void {
    this.collectibles.onCollect = (x, y, z) => {
      bus.emit('coinCollected', { total: this.collectibles.collectedCount, x, y, z });
      haptics.tap();
    };
    this.powerUps.onPickup = (type, x, y, z) => {
      bus.emit('powerUpCollected', { type });
      this.vfx.powerUpBurst(x, y, z, POWERUP_COLOR_LOOKUP[type]);
      haptics.medium();
    };
    this.powerUps.onExpire = (type) => bus.emit('powerUpExpired', { type });
    this.powerUps.onMagnet = (dur) => this.collectibles.activateMagnet(dur);
  }
}

const POWERUP_COLOR_LOOKUP: Record<string, number> = {
  speed: 0x22d3ee,
  shield: 0x4ade80,
  magnet: 0xf472b6,
  slowmo: 0xa78bfa,
  airboost: 0xfb923c,
};
