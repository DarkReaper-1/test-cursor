import * as THREE from 'three';
import type { PowerUpPickupDef, PowerUpType } from '../../core/types';
import type { MovementController } from '../MovementController';

/**
 * Power-up pickups in the world + active effect timers on the player.
 *
 *  speed    — big speed boost for a few seconds
 *  shield   — absorbs one hazard hit / stumble
 *  magnet   — pulls nearby coins in
 *  slowmo   — slows rivals & obstacles (world timescale), player unaffected
 *  airboost — instant vertical + forward surge (air rescue)
 */

export const POWERUP_COLORS: Record<PowerUpType, number> = {
  speed: 0x22d3ee,
  shield: 0x4ade80,
  magnet: 0xf472b6,
  slowmo: 0xa78bfa,
  airboost: 0xfb923c,
};

export const POWERUP_LABELS: Record<PowerUpType, string> = {
  speed: 'Speed Surge',
  shield: 'Shield',
  magnet: 'Coin Magnet',
  slowmo: 'Slow-Mo',
  airboost: 'Air Boost',
};

export const POWERUP_DURATIONS: Record<PowerUpType, number> = {
  speed: 4,
  shield: 0, // until hit
  magnet: 7,
  slowmo: 3.5,
  airboost: 0, // instant
};

interface Pickup {
  def: PowerUpPickupDef;
  mesh: THREE.Mesh;
  taken: boolean;
}

export interface ActiveEffect {
  type: PowerUpType;
  remaining: number;
  total: number;
}

export class PowerUpSystem {
  group = new THREE.Group();
  /** world timescale for rivals/obstacles (slowmo) */
  worldTimeScale = 1;

  private pickups: Pickup[] = [];
  private active = new Map<PowerUpType, ActiveEffect>();
  private time = 0;

  onPickup: ((type: PowerUpType, x: number, y: number, z: number) => void) | null = null;
  onExpire: ((type: PowerUpType) => void) | null = null;
  onMagnet: ((duration: number) => void) | null = null;

  build(defs: readonly PowerUpPickupDef[]): void {
    this.dispose();
    for (const d of defs) {
      const geo = new THREE.IcosahedronGeometry(0.42, 0);
      const mat = new THREE.MeshLambertMaterial({
        color: POWERUP_COLORS[d.type],
        emissive: POWERUP_COLORS[d.type],
        emissiveIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(d.x, d.y, d.z);
      this.group.add(mesh);
      this.pickups.push({ def: d, mesh, taken: false });
    }
  }

  activeEffects(): ActiveEffect[] {
    return [...this.active.values()];
  }

  hasShield(): boolean {
    return this.active.has('shield');
  }

  consumeShield(): void {
    if (this.active.delete('shield')) this.onExpire?.('shield');
  }

  update(dt: number, player: MovementController): void {
    this.time += dt;

    // pickups
    for (const p of this.pickups) {
      if (p.taken) continue;
      const dz = p.def.z - player.z;
      if (dz < -4 || dz > 40) continue;
      p.mesh.rotation.y += dt * 2.2;
      p.mesh.rotation.x += dt * 1.1;
      p.mesh.position.y = p.def.y + Math.sin(this.time * 2.5) * 0.12;
      const dx = p.def.x - player.x;
      const dy = p.def.y - (player.y + 0.9);
      if (dx * dx + dy * dy + dz * dz < 1.4) {
        p.taken = true;
        p.mesh.visible = false;
        this.apply(p.def.type, player);
        this.onPickup?.(p.def.type, p.def.x, p.def.y, p.def.z);
      }
    }

    // active timers
    for (const [type, eff] of this.active) {
      if (eff.total === 0) continue; // shield persists until hit
      eff.remaining -= dt;
      if (eff.remaining <= 0) {
        this.active.delete(type);
        this.expire(type, player);
        this.onExpire?.(type);
      }
    }

    // shield state sync
    player.shield = this.hasShield();
  }

  apply(type: PowerUpType, player: MovementController): void {
    const dur = POWERUP_DURATIONS[type];
    switch (type) {
      case 'speed':
        player.applyBoost(1.55, dur);
        break;
      case 'shield':
        player.shield = true;
        break;
      case 'magnet':
        this.onMagnet?.(dur);
        break;
      case 'slowmo':
        this.worldTimeScale = 0.55;
        break;
      case 'airboost':
        player.vy = Math.max(player.vy, 10.5);
        player.grounded = false;
        player.applyBoost(1.3, 1.6);
        break;
    }
    if (dur > 0 || type === 'shield') {
      this.active.set(type, { type, remaining: dur, total: dur });
    }
  }

  private expire(type: PowerUpType, _player: MovementController): void {
    if (type === 'slowmo') this.worldTimeScale = 1;
  }

  reset(): void {
    this.active.clear();
    this.worldTimeScale = 1;
  }

  dispose(): void {
    for (const p of this.pickups) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      this.group.remove(p.mesh);
    }
    this.pickups = [];
    this.reset();
  }
}
