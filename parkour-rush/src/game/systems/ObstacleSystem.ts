import * as THREE from 'three';
import type { BoxCollider } from '../../core/types';
import type { BuiltLevel, DynamicObjectDef, SweeperDef } from '../../levels/LevelTypes';
import type { MovementController } from '../MovementController';

/**
 * Animates dynamic obstacles and applies their gameplay effects:
 *  - moving platforms (colliders + rider velocity)
 *  - falling floor tiles (arm on touch → shake → drop → disable)
 *  - rotating sweeper arms (analytic hit tests against racers)
 *  - breakable barriers (break on contact, slow if hit slowly)
 */

interface FallingState {
  def: DynamicObjectDef;
  mesh: THREE.Mesh;
  state: 'idle' | 'armed' | 'falling' | 'gone';
  timer: number;
}

interface MovingState {
  def: DynamicObjectDef;
  mesh: THREE.Mesh;
}

interface SweeperState {
  def: SweeperDef;
  angle: number;
  pivot: THREE.Group;
}

export class ObstacleSystem {
  group = new THREE.Group();

  private moving: MovingState[] = [];
  private falling: FallingState[] = [];
  private sweepers: SweeperState[] = [];
  private breakableMeshMap = new Map<number, THREE.Object3D[]>();
  private time = 0;

  onBarrierBreak: ((x: number, y: number, z: number, color: number) => void) | null = null;
  onSweeperHit: ((mc: MovementController) => void) | null = null;

  build(level: BuiltLevel): void {
    this.dispose();
    for (const d of level.dynamics) {
      const geo = new THREE.BoxGeometry(d.box.sx, d.box.sy, d.box.sz);
      const mat = new THREE.MeshLambertMaterial({ color: d.box.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(d.box.x, d.box.y, d.box.z);
      this.group.add(mesh);
      if (d.collider.behavior?.type === 'movingX') {
        this.moving.push({ def: d, mesh });
      } else if (d.collider.behavior?.type === 'falling') {
        this.falling.push({ def: d, mesh, state: 'idle', timer: 0 });
      } else if (d.collider.kind === 'breakable') {
        const arr = this.breakableMeshMap.get(d.collider.id) ?? [];
        arr.push(mesh);
        this.breakableMeshMap.set(d.collider.id, arr);
      }
    }
    for (const s of level.sweepers) {
      const pivot = new THREE.Group();
      pivot.position.set(s.x, s.y, s.z);
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(s.armLength * 2, 0.5, 0.5),
        new THREE.MeshLambertMaterial({ color: s.color }),
      );
      pivot.add(arm);
      // warning tips
      const tipGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const tipA = new THREE.Mesh(tipGeo, tipMat);
      tipA.position.x = s.armLength;
      const tipB = tipA.clone();
      tipB.position.x = -s.armLength;
      pivot.add(tipA, tipB);
      this.group.add(pivot);
      this.sweepers.push({ def: s, angle: s.phase, pivot });
    }
  }

  /** Breakable barrier contact from a racer (via movement trigger). */
  handleBreakable(c: BoxCollider, mc: MovementController, color: number): boolean {
    if (c.disabled) return false;
    c.disabled = true;
    const cx = (c.minX + c.maxX) / 2;
    const cy = (c.minY + c.maxY) / 2;
    const cz = (c.minZ + c.maxZ) / 2;
    this.onBarrierBreak?.(cx, cy, cz, color);
    // slow crash if hit without speed
    if (mc.speed < 10 && mc.boostMult <= 1.05) mc.stumble(0.5);
    else mc.speed *= 0.92;
    return true;
  }

  /** Hide the static render boxes belonging to a broken barrier (matched by z overlap). */
  registerBreakableVisual(colliderId: number, objs: THREE.Object3D[]): void {
    this.breakableMeshMap.set(colliderId, objs);
  }

  hideBreakableVisual(colliderId: number): void {
    const objs = this.breakableMeshMap.get(colliderId);
    if (objs) for (const o of objs) o.visible = false;
  }

  update(dt: number, racers: readonly MovementController[]): void {
    this.time += dt;

    // moving platforms
    for (const m of this.moving) {
      const b = m.def.collider.behavior!;
      const omega = (b.speed ?? 0.25) * Math.PI * 2;
      const t = this.time * omega + (b.phase ?? 0) * Math.PI * 2;
      const x = m.def.originX + Math.sin(t) * (b.amplitude ?? 2);
      const vx = Math.cos(t) * (b.amplitude ?? 2) * omega;
      const w = m.def.box.sx;
      m.def.collider.minX = x - w / 2;
      m.def.collider.maxX = x + w / 2;
      m.def.collider.velX = vx;
      m.mesh.position.x = x;
    }

    // falling tiles
    for (const f of this.falling) {
      const c = f.def.collider;
      if (f.state === 'gone') continue;
      if (f.state === 'idle') {
        for (const mc of racers) {
          if (mc.dead) continue;
          if (
            mc.grounded &&
            Math.abs(mc.y - c.maxY) < 0.1 &&
            mc.x > c.minX - 0.3 && mc.x < c.maxX + 0.3 &&
            mc.z > c.minZ - 0.3 && mc.z < c.maxZ + 0.3
          ) {
            f.state = 'armed';
            f.timer = c.behavior?.delay ?? 0.6;
            break;
          }
        }
      } else if (f.state === 'armed') {
        f.timer -= dt;
        // shake warning
        f.mesh.position.x = f.def.originX + Math.sin(this.time * 55) * 0.05;
        if (f.timer <= 0) {
          f.state = 'falling';
          f.timer = 1.2;
        }
      } else if (f.state === 'falling') {
        f.timer -= dt;
        const drop = 9 * dt;
        c.minY -= drop;
        c.maxY -= drop;
        c.velY = -9;
        f.mesh.position.y -= drop;
        if (f.timer <= 0) {
          f.state = 'gone';
          c.disabled = true;
          f.mesh.visible = false;
        }
      }
    }

    // sweepers: analytic arm-vs-racer test
    for (const s of this.sweepers) {
      s.angle += s.def.speed * dt;
      s.pivot.rotation.y = s.angle;
      const dirX = Math.cos(s.angle);
      const dirZ = -Math.sin(s.angle);
      for (const mc of racers) {
        if (mc.dead || mc.invulnTimer > 0) continue;
        // vertical overlap (arm is ~0.5 thick at def.y; sliding ducks under nothing here — arm is low)
        if (mc.y > s.def.y + 0.35 || mc.y + mc.height < s.def.y - 0.35) continue;
        const relX = mc.x - s.def.x;
        const relZ = mc.z - s.def.z;
        const along = relX * dirX + relZ * dirZ;
        if (Math.abs(along) > s.def.armLength) continue;
        const perpX = relX - dirX * along;
        const perpZ = relZ - dirZ * along;
        const perp = Math.hypot(perpX, perpZ);
        if (perp < 0.75) {
          this.onSweeperHit?.(mc);
        }
      }
    }
  }

  dispose(): void {
    this.moving.length = 0;
    this.falling.length = 0;
    this.sweepers.length = 0;
    this.breakableMeshMap.clear();
    while (this.group.children.length) {
      const c = this.group.children.pop()!;
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
    }
    this.time = 0;
  }
}
