import * as THREE from 'three';

/**
 * Pooled particle effects + player speed trail. One Points batch (single
 * draw call) drives every burst effect; particles are recycled, never
 * allocated during gameplay.
 */

const MAX_PARTICLES = 640;

interface Particle {
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  drag: number;
}

export class VFXManager {
  group = new THREE.Group();
  /** particle density scale from quality settings (0..1) */
  density = 1;
  reducedMotion = false;

  private geo: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private particles: Particle[] = [];
  private cursor = 0;
  private points: THREE.Points;

  // trail ribbon
  private trailGeo: THREE.BufferGeometry;
  private trailMesh: THREE.Mesh;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private trailHistory: { x: number; y: number; z: number }[] = [];
  private trailColor = new THREE.Color('#38bdf8');
  private trailEnabled = false;
  private static readonly TRAIL_LEN = 22;

  private tmpColor = new THREE.Color();

  constructor() {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, gravity: 0, drag: 0 });
      this.positions[i * 3 + 1] = -1000;
    }
    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    // trail: triangle strip ribbon
    const TL = VFXManager.TRAIL_LEN;
    this.trailPositions = new Float32Array(TL * 2 * 3);
    this.trailColors = new Float32Array(TL * 2 * 4);
    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 4));
    const idx: number[] = [];
    for (let i = 0; i < TL - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.trailGeo.setIndex(idx);
    const trailMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.trailMesh = new THREE.Mesh(this.trailGeo, trailMat);
    this.trailMesh.frustumCulled = false;
    this.trailMesh.visible = false;
    this.group.add(this.trailMesh);
  }

  setTrail(colorHex: string | null): void {
    this.trailEnabled = colorHex !== null;
    this.trailMesh.visible = this.trailEnabled;
    if (colorHex) this.trailColor.set(colorHex);
    this.trailHistory.length = 0;
  }

  // -------------------------------------------------------------- bursts

  burst(
    x: number, y: number, z: number,
    color: number | string,
    count: number,
    speed = 3,
    opts: { gravity?: number; up?: number; life?: number; spread?: number } = {},
  ): void {
    const n = Math.max(1, Math.round(count * this.density * (this.reducedMotion ? 0.4 : 1)));
    const { gravity = 6, up = 1.5, life = 0.6, spread = 1 } = opts;
    this.tmpColor.set(color);
    for (let i = 0; i < n; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;
      const p = this.particles[idx];
      p.life = life * (0.6 + Math.random() * 0.6);
      p.maxLife = p.life;
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * speed * spread;
      p.vx = Math.cos(ang) * r;
      p.vz = Math.sin(ang) * r;
      p.vy = up + Math.random() * speed;
      p.gravity = gravity;
      p.drag = 2;
      this.positions[idx * 3] = x + (Math.random() - 0.5) * 0.3;
      this.positions[idx * 3 + 1] = y + (Math.random() - 0.5) * 0.2;
      this.positions[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.3;
      const v = 0.75 + Math.random() * 0.25;
      this.colors[idx * 3] = this.tmpColor.r * v;
      this.colors[idx * 3 + 1] = this.tmpColor.g * v;
      this.colors[idx * 3 + 2] = this.tmpColor.b * v;
      this.sizes[idx] = 0.15 + Math.random() * 0.2;
    }
  }

  landingDust(x: number, y: number, z: number, impact: number): void {
    this.burst(x, y + 0.1, z, 0xcfcfc4, 6 + impact * 10, 1.5 + impact * 2, { gravity: 2, up: 0.8, life: 0.5 });
  }

  jumpPuff(x: number, y: number, z: number): void {
    this.burst(x, y + 0.05, z, 0xe8e8e0, 5, 1.2, { gravity: 1.5, up: 0.5, life: 0.35 });
  }

  wallRunSparks(x: number, y: number, z: number, side: 'L' | 'R'): void {
    this.burst(x + (side === 'L' ? -0.4 : 0.4), y + 0.4, z, 0xffd166, 2, 1.4, { gravity: 4, up: 0.4, life: 0.3 });
  }

  coinSparkle(x: number, y: number, z: number): void {
    this.burst(x, y, z, 0xffe066, 8, 1.6, { gravity: -0.5, up: 0.9, life: 0.45 });
  }

  powerUpBurst(x: number, y: number, z: number, color: number | string): void {
    this.burst(x, y, z, color, 18, 2.6, { gravity: 0, up: 1.6, life: 0.7 });
  }

  boostFlames(x: number, y: number, z: number): void {
    this.burst(x, y + 0.4, z - 0.4, 0x4cc9f0, 2, 0.8, { gravity: -1, up: 0.2, life: 0.35 });
  }

  breakDebris(x: number, y: number, z: number, color: number): void {
    this.burst(x, y + 1, z, color, 26, 4.5, { gravity: 10, up: 3.5, life: 0.9 });
  }

  deathBurst(x: number, y: number, z: number): void {
    this.burst(x, y + 0.8, z, 0xff4d6d, 22, 3.5, { gravity: 5, up: 2.5, life: 0.8 });
  }

  confetti(x: number, y: number, z: number): void {
    const colors = [0xff5d8f, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xa78bfa];
    for (const c of colors) this.burst(x + (Math.random() - 0.5) * 3, y + 2, z, c, 10, 3, { gravity: 3, up: 4, life: 1.4 });
  }

  // --------------------------------------------------------------- update

  update(dt: number, playerX: number, playerY: number, playerZ: number, speedRatio: number, boosting: boolean): void {
    // particles
    const pos = this.positions;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        pos[i * 3 + 1] = -1000;
        continue;
      }
      p.vy -= p.gravity * dt;
      const drag = Math.max(0, 1 - p.drag * dt);
      p.vx *= drag;
      p.vz *= drag;
      pos[i * 3] += p.vx * dt;
      pos[i * 3 + 1] += p.vy * dt;
      pos[i * 3 + 2] += p.vz * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;

    // trail ribbon follows the runner when moving fast / boosting
    if (this.trailEnabled) {
      const active = speedRatio > 0.45 || boosting;
      this.trailHistory.unshift({ x: playerX, y: playerY + 0.9, z: playerZ });
      if (this.trailHistory.length > VFXManager.TRAIL_LEN) this.trailHistory.pop();
      const TL = VFXManager.TRAIL_LEN;
      const half = 0.16 + (boosting ? 0.1 : 0);
      for (let i = 0; i < TL; i++) {
        const h = this.trailHistory[Math.min(i, this.trailHistory.length - 1)] ?? { x: playerX, y: playerY, z: playerZ };
        const fade = active ? Math.max(0, 1 - i / TL) : 0;
        const o = i * 6;
        this.trailPositions[o] = h.x - half;
        this.trailPositions[o + 1] = h.y;
        this.trailPositions[o + 2] = h.z;
        this.trailPositions[o + 3] = h.x + half;
        this.trailPositions[o + 4] = h.y;
        this.trailPositions[o + 5] = h.z;
        const co = i * 8;
        for (let s = 0; s < 2; s++) {
          this.trailColors[co + s * 4] = this.trailColor.r;
          this.trailColors[co + s * 4 + 1] = this.trailColor.g;
          this.trailColors[co + s * 4 + 2] = this.trailColor.b;
          this.trailColors[co + s * 4 + 3] = fade * 0.55;
        }
      }
      this.trailGeo.attributes.position.needsUpdate = true;
      this.trailGeo.attributes.color.needsUpdate = true;
    }
  }

  clear(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].life = 0;
      this.positions[i * 3 + 1] = -1000;
    }
    this.trailHistory.length = 0;
    this.geo.attributes.position.needsUpdate = true;
  }
}
