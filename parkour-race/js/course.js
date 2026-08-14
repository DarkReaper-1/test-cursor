import * as THREE from 'three';

// The course runs along +Z. Platforms are rooftop slabs; features sit on them.
export const TRACK_HALF_WIDTH = 5;

const ROOF_COLORS = [0x8d6ee8, 0x7a5cd6, 0x9b7bf0, 0x6f52c9];
const EDGE_COLOR = 0xffffff;

export class Course {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [];   // {zStart, zEnd, yStart, yEnd, x, halfW}
    this.vaults = [];      // {z, x, halfW, height, depth}
    this.bumpers = [];     // {x, z, r}
    this.tramps = [];      // {x, z, halfW, halfD, y}
    this.rails = [];       // {x, zStart, zEnd, yStart, yEnd}
    this.gapEdges = [];    // AI knowledge: {zEdge, zLand, yEdge, yLand}
    this.finishZ = 0;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._matCache = new Map();
    this._build();
  }

  _mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!this._matCache.has(key)) {
      this._matCache.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
    }
    return this._matCache.get(key);
  }

  // ---------------------------------------------------------------- building
  _addPlatform(zStart, zEnd, yStart, yEnd = yStart, x = 0, halfW = TRACK_HALF_WIDTH) {
    this.platforms.push({ zStart, zEnd, yStart, yEnd, x, halfW });

    const len = zEnd - zStart;
    const thick = 1.1;
    const slope = Math.atan2(yEnd - yStart, len);
    const meshLen = len / Math.cos(slope);

    const color = ROOF_COLORS[this.platforms.length % ROOF_COLORS.length];
    const box = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, thick, meshLen), this._mat(color));
    box.position.set(x, (yStart + yEnd) / 2 - thick / 2 - 0.01, (zStart + zEnd) / 2);
    box.rotation.x = -slope;
    box.receiveShadow = true;
    this.group.add(box);

    // white edge trim (helps read the gaps)
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2 + 0.06, 0.1, meshLen + 0.06),
      this._mat(EDGE_COLOR)
    );
    trim.position.copy(box.position);
    trim.position.y += thick / 2 - 0.04;
    trim.rotation.x = -slope;
    this.group.add(trim);

    // building body under the roof
    const depth = 26;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2 - 0.4, depth, Math.max(0.5, len - 0.3)),
      this._mat(0x4b3591)
    );
    body.position.set(x, Math.min(yStart, yEnd) - thick - depth / 2, (zStart + zEnd) / 2);
    this.group.add(body);
  }

  _addBumper(x, z) {
    this.bumpers.push({ x, z, r: 1.35 });
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.5, 0.22, 20),
      new THREE.MeshLambertMaterial({ color: 0xff9100, emissive: 0xd96a00, emissiveIntensity: 0.9 })
    );
    pad.position.set(x, this.groundHeight(x, z) + 0.11, z);
    this.group.add(pad);
    // arrow chevron on top
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 3), this._mat(0xfff3d0));
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(x, pad.position.y + 0.13, z);
    this.group.add(arrow);
  }

  _addVault(z, x = 0, halfW = TRACK_HALF_WIDTH) {
    const height = 1.15, depth = 0.55;
    this.vaults.push({ z, x, halfW, height, depth });
    const y = this.groundHeight(x, z);
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, height, depth),
      this._mat(0xe84f6b)
    );
    wall.position.set(x, y + height / 2, z);
    this.group.add(wall);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.1, 0.1, depth + 0.1), this._mat(0xffffff));
    cap.position.set(x, y + height + 0.03, z);
    this.group.add(cap);
  }

  _addTramp(x, z, halfW = 1.7, halfD = 1.4) {
    const y = this.groundHeight(x, z);
    this.tramps.push({ x, z, halfW, halfD, y });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, 0.35, halfD * 2), this._mat(0x2e2b48));
    frame.position.set(x, y + 0.17, z);
    this.group.add(frame);
    const skin = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2 - 0.4, 0.1, halfD * 2 - 0.4),
      new THREE.MeshLambertMaterial({ color: 0x37d5ff, emissive: 0x1490bb, emissiveIntensity: 0.8 })
    );
    skin.position.set(x, y + 0.36, z);
    this.group.add(skin);
  }

  _addRail(x, zStart, zEnd, yStart, yEnd) {
    this.rails.push({ x, zStart, zEnd, yStart, yEnd });
    const len = Math.hypot(zEnd - zStart, yEnd - yStart);
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, len, 8),
      new THREE.MeshLambertMaterial({ color: 0xffe066, emissive: 0x8a6d00, emissiveIntensity: 0.6 })
    );
    rail.position.set(x, (yStart + yEnd) / 2, (zStart + zEnd) / 2);
    rail.rotation.x = Math.PI / 2 - Math.atan2(yEnd - yStart, zEnd - zStart);
    this.group.add(rail);
    // support posts
    const n = Math.max(2, Math.floor(len / 6));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const z = zStart + (zEnd - zStart) * t;
      const y = yStart + (yEnd - yStart) * t;
      const groundY = this.groundHeight(x, z);
      const h = Math.max(0.4, y - (Number.isFinite(groundY) ? groundY : y - 3));
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6), this._mat(0x3a355e));
      post.position.set(x, y - h / 2, z);
      this.group.add(post);
    }
  }

  _addFinish(z) {
    this.finishZ = z;
    const y = this.groundHeight(0, z);
    const postGeo = new THREE.BoxGeometry(0.5, 6, 0.5);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, this._mat(0xffffff));
      post.position.set(side * (TRACK_HALF_WIDTH - 0.3), y + 3, z);
      this.group.add(post);
    }
    // checkered banner
    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 32;
    const g = cvs.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = (i + j) % 2 ? '#111' : '#fff';
      g.fillRect(i * 8, j * 8, 8, 8);
    }
    const tex = new THREE.CanvasTexture(cvs);
    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_HALF_WIDTH * 2, 1.4, 0.2),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    banner.position.set(0, y + 5.4, z);
    this.group.add(banner);
  }

  _gap(prevEnd, prevY, gapLen, nextY) {
    this.gapEdges.push({ zEdge: prevEnd, zLand: prevEnd + gapLen, yEdge: prevY, yLand: nextY });
  }

  _build() {
    let z = -14; // start pad behind the start line
    let y = 0;

    const flat = (len) => { this._addPlatform(z, z + len, y, y); z += len; };
    const ramp = (len, dy) => { this._addPlatform(z, z + len, y, y + dy); y += dy; z += len; };
    const gap = (len, dy = 0) => { this._gap(z, y, len, y + dy); z += len; y += dy; };

    // --- section 1: warmup straight with bumpers
    flat(46);
    this._addBumper(-2.2, z - 34);
    this._addBumper(2.2, z - 22);
    this._addBumper(0, z - 10);

    // --- section 2: first small gaps (teach the jump)
    gap(4.5); flat(16);
    this._addBumper(0, z - 8);
    gap(6); flat(18);
    this._addVault(z - 6);

    // --- section 3: drop-down gap + vault chain
    gap(6, -2.5); flat(24);
    this._addVault(z - 16);
    this._addVault(z - 8);
    this._addBumper(-2.4, z - 3);
    this._addBumper(2.4, z - 3);

    // --- section 4: ramp up then big jump down
    ramp(14, 3);
    flat(6);
    gap(9, -3.5);
    flat(20);
    this._addBumper(0, z - 14);

    // --- section 5: trampoline over a huge gap
    flat(6);
    this._addTramp(0, z - 3);
    gap(13, 1.5);
    flat(18);
    this._addVault(z - 6);

    // --- section 6: rail slide down
    flat(4);
    {
      const railLen = 26, drop = 7;
      this._addRail(0, z - 1, z + railLen + 1, y + 0.55, y - drop + 0.55);
      gap(railLen, -drop);
      flat(22);
      this._addBumper(-2.2, z - 16);
      this._addBumper(2.2, z - 10);
    }

    // --- section 7: staggered gaps (rhythm jumps)
    gap(5); flat(10);
    gap(6.5); flat(10);
    this._addBumper(0, z - 5);
    gap(8); flat(16);

    // --- section 8: tramp bounce up to high roof, vaults, final sprint
    flat(4);
    this._addTramp(0, z - 2);
    gap(10, 3.5);
    flat(14);
    this._addVault(z - 7);
    gap(6, -2);
    flat(30);
    this._addBumper(-2.4, z - 24);
    this._addBumper(0, z - 17);
    this._addBumper(2.4, z - 10);

    // --- finish
    flat(18);
    this._addFinish(z - 12);
    flat(30); // runoff

    this._addDecor(z);
    this._addStartArch();
  }

  _addStartArch() {
    const y = this.groundHeight(0, 0);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.5, 0.4), this._mat(0xffd54a));
      post.position.set(side * (TRACK_HALF_WIDTH - 0.3), y + 2.25, 0);
      this.group.add(post);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(TRACK_HALF_WIDTH * 2, 0.6, 0.5), this._mat(0xffd54a));
    top.position.set(0, y + 4.6, 0);
    this.group.add(top);
  }

  _addDecor(endZ) {
    // distant city blocks on both sides + below
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mats = [this._mat(0x3d2b7a), this._mat(0x46318c), this._mat(0x35256b)];
    const rng = mulberry32(7);
    const count = 130;
    const mesh = new THREE.InstancedMesh(geo, mats[0], count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const side = rng() < 0.5 ? -1 : 1;
      const x = side * (14 + rng() * 46);
      const zPos = -30 + rng() * (endZ + 80);
      const w = 6 + rng() * 12;
      const h = 8 + rng() * 26;
      m.makeScale(w, h, 6 + rng() * 12);
      m.setPosition(x, -22 + h / 2, zPos);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);

    // clouds
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.6 + rng() * 1.6, 10, 8), cloudMat);
        puff.position.set(j * 2.2 - 2.2, rng() * 0.8, rng() * 1.2);
        puff.scale.y = 0.55;
        c.add(puff);
      }
      c.position.set((rng() - 0.5) * 130, 14 + rng() * 18, rng() * (endZ + 60) - 20);
      this.group.add(c);
    }
  }

  // ---------------------------------------------------------------- queries
  /** Highest platform top at (x, z) that is not above maxY (feet + step allowance). -Infinity if over a gap. */
  groundHeight(x, z, maxY = Infinity) {
    let best = -Infinity;
    for (const p of this.platforms) {
      if (z < p.zStart || z > p.zEnd) continue;
      if (Math.abs(x - p.x) > p.halfW) continue;
      const t = (z - p.zStart) / (p.zEnd - p.zStart);
      const top = p.yStart + (p.yEnd - p.yStart) * t;
      if (top <= maxY && top > best) best = top;
    }
    return best;
  }

  /** Absolute highest platform top at (x, z) regardless of height. */
  ceilingAt(x, z) {
    return this.groundHeight(x, z, Infinity);
  }

  /** The vault wall crossed when moving from z0 to z1 near x, or null. */
  vaultBetween(x, z0, z1) {
    for (const v of this.vaults) {
      if (Math.abs(x - v.x) > v.halfW) continue;
      const front = v.z - v.depth / 2;
      if (z0 <= front && z1 >= front) return v;
    }
    return null;
  }

  trampAt(x, z) {
    for (const t of this.tramps) {
      if (Math.abs(x - t.x) <= t.halfW && Math.abs(z - t.z) <= t.halfD) return t;
    }
    return null;
  }

  bumperAt(x, z) {
    for (const b of this.bumpers) {
      const dx = x - b.x, dz = z - b.z;
      if (dx * dx + dz * dz <= b.r * b.r) return b;
    }
    return null;
  }

  railNear(x, z, y) {
    for (const r of this.rails) {
      if (z < r.zStart || z > r.zEnd) continue;
      if (Math.abs(x - r.x) > 0.9) continue;
      const t = (z - r.zStart) / (r.zEnd - r.zStart);
      const railY = r.yStart + (r.yEnd - r.yStart) * t;
      if (y >= railY - 0.35 && y <= railY + 1.1) return { rail: r, railY };
    }
    return null;
  }

  railYAt(rail, z) {
    const t = (z - rail.zStart) / (rail.zEnd - rail.zStart);
    return rail.yStart + (rail.yEnd - rail.yStart) * t;
  }

  /** Next gap edge at or after z (for AI). */
  nextGapEdge(z) {
    let best = null;
    for (const e of this.gapEdges) {
      if (e.zEdge >= z - 0.5 && (!best || e.zEdge < best.zEdge)) best = e;
    }
    return best;
  }

  nextTramp(z) {
    let best = null;
    for (const t of this.tramps) {
      if (t.z >= z && (!best || t.z < best.z)) best = t;
    }
    return best;
  }
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
