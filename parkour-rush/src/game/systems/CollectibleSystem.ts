import * as THREE from 'three';
import type { CoinDef } from '../../core/types';

/**
 * Instanced coin collectibles: one draw call for every coin in the level.
 * Coins near the player spin; collected coins collapse to zero scale.
 * Supports the magnet power-up (nearby coins fly to the player).
 */

interface CoinState {
  x: number;
  y: number;
  z: number;
  collected: boolean;
  /** magnet flight progress */
  flying: boolean;
}

export class CollectibleSystem {
  mesh: THREE.InstancedMesh | null = null;
  collectedCount = 0;
  magnetTimer = 0;

  /** pure-logic collection radius (unit tested) */
  static COLLECT_RADIUS = 1.15;
  static MAGNET_RADIUS = 6.5;

  private coins: CoinState[] = [];
  private dummy = new THREE.Object3D();
  private time = 0;
  onCollect: ((x: number, y: number, z: number) => void) | null = null;

  build(defs: readonly CoinDef[], scene: THREE.Object3D): void {
    this.dispose();
    this.coins = defs.map((d) => ({ x: d.x, y: d.y, z: d.z, collected: false, flying: false }));
    this.collectedCount = 0;
    if (this.coins.length === 0) return;
    const geo = new THREE.CylinderGeometry(0.34, 0.34, 0.1, 12);
    geo.rotateZ(Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffd60a, emissive: 0x8a6d00 });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.coins.length);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < this.coins.length; i++) this.writeMatrix(i);
    scene.add(this.mesh);
  }

  activateMagnet(duration: number): void {
    this.magnetTimer = Math.max(this.magnetTimer, duration);
  }

  /**
   * Advance animation + collect coins near the player.
   * Returns the number collected this frame.
   */
  update(dt: number, px: number, py: number, pz: number): number {
    if (!this.mesh) return 0;
    this.time += dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;
    let collectedNow = 0;

    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (c.collected) continue;
      const dz = c.z - pz;
      // only animate/process coins near the player (perf)
      if (dz < -6 || dz > 40) continue;

      const dx = c.x - px;
      const dy = c.y - (py + 0.9);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (this.magnetTimer > 0 && dist < CollectibleSystem.MAGNET_RADIUS) c.flying = true;

      if (c.flying) {
        const k = Math.min(1, dt * 14);
        c.x -= dx * k;
        c.y -= dy * k;
        c.z -= dz * k;
      }

      if (dist < CollectibleSystem.COLLECT_RADIUS) {
        c.collected = true;
        this.collectedCount++;
        collectedNow++;
        this.onCollect?.(c.x, c.y, c.z);
        this.dummy.position.set(0, -1000, 0);
        this.dummy.scale.setScalar(0.0001);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      if (dz < 45) this.writeMatrix(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return collectedNow;
  }

  private writeMatrix(i: number): void {
    if (!this.mesh) return;
    const c = this.coins[i];
    this.dummy.position.set(c.x, c.y + Math.sin(this.time * 3 + i * 0.7) * 0.08, c.z);
    this.dummy.rotation.set(0, this.time * 2.5 + i * 0.35, 0);
    this.dummy.scale.setScalar(1);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(i, this.dummy.matrix);
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.parent?.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = null;
    }
    this.coins = [];
    this.collectedCount = 0;
    this.magnetTimer = 0;
  }
}

/**
 * Pure collection check used by unit tests (mirrors update() distance rule).
 */
export function isCoinCollected(coin: { x: number; y: number; z: number }, px: number, py: number, pz: number): boolean {
  const dx = coin.x - px;
  const dy = coin.y - (py + 0.9);
  const dz = coin.z - pz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) < CollectibleSystem.COLLECT_RADIUS;
}
