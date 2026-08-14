import * as THREE from 'three';

// One pooled THREE.Points cloud drives every particle burst (dust, sparks,
// boost streaks, confetti) — a single draw call for all VFX.
const MAX = 900;

export class Effects {
  constructor(scene) {
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);      // seconds remaining
    this.maxLife = new Float32Array(MAX);
    this.grav = new Float32Array(MAX);
    this.head = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.16, vertexColors: true, transparent: true, opacity: 0.95,
      sizeAttenuation: true, depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this._c = new THREE.Color();
  }

  spawn(x, y, z, { n = 8, color = 0xffffff, spread = 2.5, up = 2.5, grav = 8, life = 0.5, dirZ = 0 } = {}) {
    this._c.set(color);
    for (let k = 0; k < n; k++) {
      const i = this.head; this.head = (this.head + 1) % MAX;
      this.positions[i * 3] = x + (Math.random() - 0.5) * 0.3;
      this.positions[i * 3 + 1] = y + Math.random() * 0.15;
      this.positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.3;
      this.vel[i * 3] = (Math.random() - 0.5) * spread;
      this.vel[i * 3 + 1] = Math.random() * up;
      this.vel[i * 3 + 2] = (Math.random() - 0.5) * spread + dirZ;
      const shade = 0.75 + Math.random() * 0.35;
      this.colors[i * 3] = Math.min(1, this._c.r * shade);
      this.colors[i * 3 + 1] = Math.min(1, this._c.g * shade);
      this.colors[i * 3 + 2] = Math.min(1, this._c.b * shade);
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.7);
      this.grav[i] = grav;
    }
  }

  dust(x, y, z, big = false) {
    this.spawn(x, y, z, { n: big ? 14 : 7, color: 0xfff3dc, spread: big ? 4 : 2.4, up: big ? 3 : 1.6, grav: 6, life: 0.45 });
  }
  sparks(x, y, z) {
    this.spawn(x, y, z, { n: 2, color: 0xffc21e, spread: 2.2, up: 1.4, grav: 12, life: 0.3 });
  }
  boostBurst(x, y, z) {
    this.spawn(x, y + 0.8, z, { n: 20, color: 0xffe36b, spread: 3.5, up: 3.5, grav: 2, life: 0.6, dirZ: -4 });
  }
  trampBurst(x, y, z) {
    this.spawn(x, y, z, { n: 16, color: 0x8ce7ff, spread: 4.5, up: 5, grav: 4, life: 0.55 });
  }
  confetti(x, y, z) {
    for (const c of [0xff5d73, 0xffd93b, 0x51e08a, 0x35d0ff, 0xc490ff]) {
      this.spawn(x, y + 2.5, z, { n: 10, color: c, spread: 6, up: 7, grav: 7, life: 1.6 });
    }
  }
  trail(x, y, z) {
    this.spawn(x, y + 0.5, z, { n: 1, color: 0xffe36b, spread: 0.6, up: 0.4, grav: -0.5, life: 0.35 });
  }

  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -9999;   // hide
        continue;
      }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  reset() {
    this.life.fill(0);
    for (let i = 0; i < MAX; i++) this.positions[i * 3 + 1] = -9999;
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
