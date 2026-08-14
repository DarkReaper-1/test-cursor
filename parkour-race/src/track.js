import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Track data model. Forward is +Z. Every surface/solid is axis-aligned, which
// keeps the physics exact and cheap:
//   platforms: flat tops   { x0,x1,z0,z1, y }
//   ramps:     slopes in Z { x0,x1,z0,z1, y0(y at z0), y1(y at z1), flip }
//   vaults:    low boxes   { x0,x1,z0,z1, y0,y1 }   auto-vault at speed
//   walls:     solid boxes { x0,x1,z0,z1, y0,y1 }   bump = lose speed
//   bumpers:   boost zones { x0,x1,z0,z1, y }
//   tramps:    launchers   { x,z,r, y, vy }
//   rails:     grind lines { x, y, z0,z1 }
// ---------------------------------------------------------------------------

export const PATH_W = 9;           // default half-usable course width is PATH_W/2

const PAL = {
  deckA: 0xf0e6d8, deckB: 0xe4d5c0, deckC: 0xdccbb2,
  side: 0xb9906b, sideB: 0xa87f5c,
  edge: 0xffffff,
  ramp: 0xffc21e, rampSide: 0xe09a00,
  vault: 0xff6b81, vaultTop: 0xffe0e5,
  wall: 0x8f6ad1, wallTop: 0xb79aec,
  bumper: 0xfff06a,
  tramp: 0x35d0ff, trampRim: 0x1287b8,
  rail: 0xffe9b0, post: 0x8a6f52,
  finishA: 0x222233, finishB: 0xf2f2f2,
};

export class Track {
  constructor() {
    this.platforms = [];
    this.ramps = [];
    this.vaults = [];
    this.walls = [];
    this.bumpers = [];
    this.tramps = [];
    this.rails = [];
    this.checkpoints = [];   // { x, y, z }
    this.waypoints = [];     // { z, x } sorted by z — AI racing line
    this.finishZ = 0;
    this.startX = 0;
    this.startY = 0;
    this.length = 0;
    this.decor = [];         // extra colored boxes (visual only)
  }

  // Highest walkable surface at (x, z) with top <= maxY. Returns
  // { y, ramp } or null. `ramp` is set when standing on a slope.
  groundAt(x, z, maxY) {
    let best = null, bestY = -Infinity, bestRamp = null;
    for (const p of this.platforms) {
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      if (p.y <= maxY && p.y > bestY) { bestY = p.y; best = p; bestRamp = null; }
    }
    for (const r of this.ramps) {
      if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue;
      const y = r.y0 + (r.y1 - r.y0) * ((z - r.z0) / (r.z1 - r.z0));
      if (y <= maxY && y > bestY) { bestY = y; best = r; bestRamp = r; }
    }
    for (const v of this.vaults) {   // you can stand on top of a vault box
      if (x < v.x0 || x > v.x1 || z < v.z0 || z > v.z1) continue;
      if (v.y1 <= maxY && v.y1 > bestY) { bestY = v.y1; best = v; bestRamp = null; }
    }
    if (!best) return null;
    return { y: bestY, ramp: bestRamp };
  }

  // Solid boxes for lateral collision: walls, vault boxes, and the sides of
  // platforms whose tops are above what the runner can step onto.
  *solidsNear(z, pad = 6) {
    for (const w of this.walls) if (w.z1 > z - pad && w.z0 < z + pad) yield w;
    for (const v of this.vaults) if (v.z1 > z - pad && v.z0 < z + pad) yield v;
    for (const p of this.platforms) {
      if (p.z1 > z - pad && p.z0 < z + pad) {
        yield { x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1, y0: p.y - 60, y1: p.y, platform: true };
      }
    }
    for (const r of this.ramps) {
      if (r.z1 > z - pad && r.z0 < z + pad) {
        yield { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, y0: Math.min(r.y0, r.y1) - 60,
                y1: Math.max(r.y0, r.y1), ramp: r };
      }
    }
  }

  waypointX(z) {
    const w = this.waypoints;
    if (w.length === 0) return 0;
    if (z <= w[0].z) return w[0].x;
    for (let i = 1; i < w.length; i++) {
      if (z <= w[i].z) {
        const t = (z - w[i - 1].z) / (w[i].z - w[i - 1].z);
        return w[i - 1].x + (w[i].x - w[i - 1].x) * t;
      }
    }
    return w[w.length - 1].x;
  }

  lastCheckpointBefore(z) {
    let best = this.checkpoints[0];
    for (const c of this.checkpoints) if (c.z <= z && c.z >= best.z) best = c;
    return best;
  }
}

// ---------------------------------------------------------------------------
// Level builder — appends authored segments along +Z.
// ---------------------------------------------------------------------------

class Builder {
  constructor(seed) {
    this.t = new Track();
    this.z = 0;              // build cursor
    this.y = 0;              // current deck height
    this.cx = 0;             // current path centre x
    this.rng = mulberry32(seed);
    this._deckFlip = false;
  }

  rand(a, b) { return a + this.rng() * (b - a); }

  wp(x = this.cx) { this.t.waypoints.push({ z: this.z, x }); }

  deck(len, { w = PATH_W, dx = 0 } = {}) {
    const x = this.cx + dx;
    this._deckFlip = !this._deckFlip;
    this.t.platforms.push({ x0: x - w / 2, x1: x + w / 2, z0: this.z, z1: this.z + len,
      y: this.y, tint: this._deckFlip ? PAL.deckA : PAL.deckB });
    return this.t.platforms[this.t.platforms.length - 1];
  }

  checkpoint() { this.t.checkpoints.push({ x: this.cx, y: this.y, z: this.z + 1.5 }); }

  // --- segments -----------------------------------------------------------

  startPad() {
    this.deck(16, { w: PATH_W + 3 });
    this.t.startX = this.cx; this.t.startY = this.y;
    this.checkpoint();
    this.wp();
    this.z += 16;
    this.wp();
  }

  runway(len = 18, nBumpers = 0) {
    this.deck(len);
    for (let i = 0; i < nBumpers; i++) {
      const bz = this.z + (len * (i + 1)) / (nBumpers + 1);
      const bx = this.cx + this.rand(-1.6, 1.6);
      this.t.bumpers.push({ x0: bx - 1.7, x1: bx + 1.7, z0: bz - 1.1, z1: bz + 1.1, y: this.y });
      this.t.waypoints.push({ z: bz, x: bx });
    }
    this.z += len; this.wp();
  }

  gap(width = 4, drop = 0, landLen = 14) {
    // Auto-jump clears ~7.5m at full speed; wider gaps need boost.
    this.z += width;
    this.y -= drop;
    this.deck(landLen);
    this.z += landLen;
    this.wp();
  }

  flipRamp(gapW = 9, drop = 2.5, landLen = 16) {
    const rampLen = 3.2, rise = 1.35;
    this.t.ramps.push({ x0: this.cx - PATH_W / 2, x1: this.cx + PATH_W / 2,
      z0: this.z, z1: this.z + rampLen, y0: this.y, y1: this.y + rise, flip: true });
    this.z += rampLen;
    this.wp();
    this.z += gapW;
    this.y -= drop;
    this.deck(landLen);
    this.z += landLen;
    this.wp();
  }

  vaultLine(n = 2, spacing = 7) {
    const len = n * spacing + 5;
    this.deck(len);
    for (let i = 0; i < n; i++) {
      const vz = this.z + 4 + i * spacing;
      this.t.vaults.push({ x0: this.cx - PATH_W / 2, x1: this.cx + PATH_W / 2,
        z0: vz, z1: vz + 0.7, y0: this.y, y1: this.y + 1.05 });
    }
    this.z += len; this.wp();
  }

  slalom(n = 3, spacing = 8) {
    const len = n * spacing + 6;
    this.deck(len);
    let side = this.rng() < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const wz = this.z + 4 + i * spacing;
      const wall = { z0: wz, z1: wz + 0.8, y0: this.y, y1: this.y + 2.2 };
      if (side > 0) { wall.x0 = this.cx - 0.6; wall.x1 = this.cx + PATH_W / 2; }
      else { wall.x0 = this.cx - PATH_W / 2; wall.x1 = this.cx + 0.6; }
      this.t.walls.push(wall);
      this.t.waypoints.push({ z: wz, x: this.cx - side * (PATH_W / 2 - 1.6) });
      side = -side;
    }
    this.z += len; this.wp();
  }

  railBridge(len = 14, drop = 1) {
    const y = this.y + 0.1;
    for (const off of [-1.9, 0, 1.9]) {
      this.t.rails.push({ x: this.cx + off, y, z0: this.z - 0.5, z1: this.z + len + 0.5 });
    }
    this.z += len;
    this.y -= drop;
    this.deck(14);
    this.z += 14;
    this.wp();
  }

  trampJump(rise = 4, pitDepth = 3.5) {
    // pit with a trampoline at the bottom, then a higher deck beyond
    const pitLen = 5.5;
    const ty = this.y - pitDepth;
    this.t.platforms.push({ x0: this.cx - PATH_W / 2, x1: this.cx + PATH_W / 2,
      z0: this.z, z1: this.z + pitLen, y: ty, tint: PAL.deckC });
    const tramp = { x: this.cx, z: this.z + pitLen / 2, r: 2.4, y: ty + 0.25,
      vy: Math.sqrt(2 * 32 * (pitDepth + rise + 1.6)) };
    this.t.tramps.push(tramp);
    this.t.waypoints.push({ z: tramp.z, x: tramp.x });
    this.z += pitLen;
    this.y += rise;
    this.deck(20);
    this.z += 20;
    this.wp();
  }

  split(len = 26) {
    // left lane: narrow but has bumpers (fast). right lane: wide and safe.
    const gapBetween = 2.5;
    const wL = 3.4, wR = 5.4;
    const xL = this.cx - (gapBetween / 2 + wL / 2);
    const xR = this.cx + (gapBetween / 2 + wR / 2);
    this.t.platforms.push({ x0: xL - wL / 2, x1: xL + wL / 2, z0: this.z, z1: this.z + len, y: this.y, tint: PAL.deckB });
    this.t.platforms.push({ x0: xR - wR / 2, x1: xR + wR / 2, z0: this.z, z1: this.z + len, y: this.y, tint: PAL.deckA });
    for (let i = 0; i < 2; i++) {
      const bz = this.z + (len * (i + 1)) / 3;
      this.t.bumpers.push({ x0: xL - 1.5, x1: xL + 1.5, z0: bz - 1.1, z1: bz + 1.1, y: this.y });
    }
    // AI line favours the fast lane
    this.t.waypoints.push({ z: this.z + 2, x: xL });
    this.t.waypoints.push({ z: this.z + len - 2, x: xL });
    this.z += len;
    this.deck(10, { w: PATH_W + 2 });
    this.z += 10;
    this.wp();
  }

  bigDrop(drop = 5) {
    this.z += 2.5;
    this.y -= drop;
    this.deck(16);
    this.z += 16;
    this.wp();
  }

  finishPad() {
    this.checkpoint();
    this.deck(30, { w: PATH_W + 4 });
    this.t.finishZ = this.z + 6;
    this.z += 30;
    this.wp();
    this.t.length = this.t.finishZ;
  }
}

// ---------------------------------------------------------------------------
// Level definitions — difficulty ramps up with the level number.
// ---------------------------------------------------------------------------

export function buildLevel(levelIndex) {
  const b = new Builder(1234 + levelIndex * 777);
  const L = levelIndex;   // 0-based
  b.startPad();

  const menu = [];
  // A curated sequment sequence per level, growing in length and complexity.
  switch (L % 6) {
    case 0:
      menu.push(['runway', 20, 1], ['gap', 3.5, 1], ['flipRamp'], ['runway', 16, 1],
        ['vaultLine', 2], ['gap', 4.5, 2], ['runway', 14, 1], ['flipRamp', 10, 3]);
      break;
    case 1:
      menu.push(['runway', 18, 1], ['vaultLine', 2], ['gap', 4, 1], ['slalom', 3],
        ['flipRamp'], ['railBridge', 13, 1], ['runway', 12, 1], ['gap', 5, 2], ['flipRamp', 10, 3]);
      break;
    case 2:
      menu.push(['runway', 16, 1], ['gap', 4, 0], ['trampJump', 4], ['runway', 12, 1],
        ['vaultLine', 3], ['flipRamp'], ['slalom', 3], ['gap', 5, 2], ['railBridge', 14, 1]);
      break;
    case 3:
      menu.push(['runway', 14, 1], ['split'], ['flipRamp'], ['vaultLine', 2],
        ['gap', 4.5, 1], ['slalom', 4], ['trampJump', 5], ['runway', 10, 1],
        ['gap', 5.5, 2], ['flipRamp', 11, 3]);
      break;
    case 4:
      menu.push(['runway', 14, 1], ['railBridge', 15, 1], ['vaultLine', 3], ['flipRamp'],
        ['bigDrop', 5], ['slalom', 4], ['gap', 5, 1], ['trampJump', 5], ['split'],
        ['gap', 6, 2], ['flipRamp', 11, 3]);
      break;
    default:
      menu.push(['runway', 12, 1], ['gap', 4, 1], ['flipRamp'], ['slalom', 4],
        ['railBridge', 16, 1], ['vaultLine', 3], ['trampJump', 6], ['split'],
        ['bigDrop', 5], ['gap', 6, 2], ['flipRamp', 12, 3], ['vaultLine', 2]);
  }

  let sinceCp = 0;
  for (const [name, ...args] of menu) {
    b[name](...args);
    sinceCp++;
    if (sinceCp >= 2) { b.checkpoint(); sinceCp = 0; }
  }
  b.finishPad();
  return b.t;
}

// ---------------------------------------------------------------------------
// Geometry: everything merged into two draw calls (lit + glow) + skyline.
// ---------------------------------------------------------------------------

class MeshBucket {
  constructor() { this.pos = []; this.norm = []; this.col = []; this._c = new THREE.Color(); }

  quad(a, b, c, d, color, nx, ny, nz) {
    this._c.set(color);
    const r = this._c.r, g = this._c.g, bl = this._c.b;
    for (const v of [a, b, c, a, c, d]) {
      this.pos.push(v[0], v[1], v[2]);
      this.norm.push(nx, ny, nz);
      this.col.push(r, g, bl);
    }
  }

  box(x0, x1, y0, y1, z0, z1, topColor, sideColor = topColor, bottom = false) {
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], topColor, 0, 1, 0);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], sideColor, 0, 0, -1); // -Z
    this.quad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], sideColor, 0, 0, 1);  // +Z
    this.quad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], sideColor, -1, 0, 0); // -X
    this.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], sideColor, 1, 0, 0);  // +X
    if (bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], sideColor, 0, -1, 0);
  }

  wedge(x0, x1, z0, z1, y0, y1, depth, topColor, sideColor) {
    // Sloped top from (z0,y0) to (z1,y1); flat front/back faces.
    const yb = Math.min(y0, y1) - depth;
    const len = Math.hypot(z1 - z0, y1 - y0);
    const ny = (z1 - z0) / len, nz = -(y1 - y0) / len;
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y0, z0], [x0, y0, z0], topColor, 0, ny, nz);
    this.quad([x0, yb, z0], [x1, yb, z0], [x1, y0, z0], [x0, y0, z0], sideColor, 0, 0, -1);
    this.quad([x1, yb, z1], [x0, yb, z1], [x0, y1, z1], [x1, y1, z1], sideColor, 0, 0, 1);
    // sides (two quads approximating the trapezoid)
    this.quad([x0, yb, z1], [x0, yb, z0], [x0, y0, z0], [x0, y1, z1], sideColor, -1, 0, 0);
    this.quad([x1, yb, z0], [x1, yb, z1], [x1, y1, z1], [x1, y0, z0], sideColor, 1, 0, 0);
  }

  build(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.norm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return new THREE.Mesh(g, material);
  }
}

export function buildTrackMeshes(track) {
  const lit = new MeshBucket();
  const glow = new MeshBucket();
  const group = new THREE.Group();

  const DECK_T = 60;   // building facades extend far down

  for (const p of track.platforms) {
    lit.box(p.x0, p.x1, p.y - DECK_T, p.y, p.z0, p.z1, p.tint ?? PAL.deckA,
      ((p.z0 * 7 | 0) % 2 === 0) ? PAL.side : PAL.sideB);
    // bright edge trim to read ledges clearly
    lit.box(p.x0, p.x1, p.y - 0.28, p.y + 0.02, p.z1 - 0.35, p.z1, PAL.edge, PAL.edge);
    lit.box(p.x0, p.x1, p.y - 0.28, p.y + 0.02, p.z0, p.z0 + 0.35, PAL.edge, PAL.edge);
  }
  for (const r of track.ramps) {
    lit.wedge(r.x0, r.x1, r.z0, r.z1, r.y0, r.y1, 1.2, r.flip ? PAL.ramp : PAL.deckB, PAL.rampSide);
    if (r.flip) {  // glowing chevrons on flip ramps
      for (let i = 0; i < 3; i++) {
        const t0 = 0.2 + i * 0.25, t1 = t0 + 0.12;
        const zA = r.z0 + (r.z1 - r.z0) * t0, zB = r.z0 + (r.z1 - r.z0) * t1;
        const yA = r.y0 + (r.y1 - r.y0) * t0 + 0.03, yB = r.y0 + (r.y1 - r.y0) * t1 + 0.03;
        glow.quad([r.x0 + 0.7, yA, zA], [r.x1 - 0.7, yA, zA], [r.x1 - 0.7, yB, zB], [r.x0 + 0.7, yB, zB], 0xffffff, 0, 1, 0);
      }
    }
  }
  for (const v of track.vaults) {
    lit.box(v.x0, v.x1, v.y0, v.y1, v.z0, v.z1, PAL.vaultTop, PAL.vault);
  }
  for (const w of track.walls) {
    lit.box(w.x0, w.x1, w.y0, w.y1, w.z0, w.z1, PAL.wallTop, PAL.wall);
  }
  for (const bp of track.bumpers) {
    glow.box(bp.x0, bp.x1, bp.y + 0.02, bp.y + 0.1, bp.z0, bp.z1, PAL.bumper, PAL.bumper);
    // chevron arrows
    const cx = (bp.x0 + bp.x1) / 2;
    for (let i = 0; i < 2; i++) {
      const z = bp.z0 + 0.5 + i * 1.1;
      glow.quad([cx - 0.8, bp.y + 0.12, z], [cx, bp.y + 0.12, z + 0.7], [cx + 0.8, bp.y + 0.12, z],
        [cx, bp.y + 0.12, z + 0.25], 0xff9d00, 0, 1, 0);
    }
  }
  for (const tr of track.tramps) {
    // rim
    lit.box(tr.x - tr.r, tr.x + tr.r, tr.y - 0.25, tr.y - 0.05, tr.z - tr.r, tr.z + tr.r, PAL.trampRim, PAL.trampRim);
    glow.box(tr.x - tr.r + 0.3, tr.x + tr.r - 0.3, tr.y - 0.08, tr.y, tr.z - tr.r + 0.3, tr.z + tr.r - 0.3, PAL.tramp, PAL.tramp);
  }
  for (const rl of track.rails) {
    lit.box(rl.x - 0.09, rl.x + 0.09, rl.y - 0.16, rl.y, rl.z0, rl.z1, PAL.rail, PAL.rail);
    const n = Math.max(2, Math.round((rl.z1 - rl.z0) / 5));
    for (let i = 0; i <= n; i++) {
      const z = rl.z0 + ((rl.z1 - rl.z0) * i) / n;
      lit.box(rl.x - 0.06, rl.x + 0.06, rl.y - 3.2, rl.y - 0.1, z - 0.06, z + 0.06, PAL.post, PAL.post);
    }
  }

  // finish gate: checkered strip + two posts and a banner
  {
    const z = track.finishZ, y = track.startYAtFinish ?? nearestDeckY(track, z);
    const x0 = track.waypointX(z) - (PATH_W + 4) / 2, x1 = track.waypointX(z) + (PATH_W + 4) / 2;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const xa = x0 + ((x1 - x0) * i) / n, xb = x0 + ((x1 - x0) * (i + 1)) / n;
      glow.box(xa, xb, y + 0.02, y + 0.06, z - 0.9, z, i % 2 ? PAL.finishA : PAL.finishB);
      glow.box(xa, xb, y + 0.02, y + 0.06, z, z + 0.9, i % 2 ? PAL.finishB : PAL.finishA);
    }
    lit.box(x0 - 0.5, x0, y, y + 5.4, z - 0.3, z + 0.3, PAL.finishA, PAL.finishA);
    lit.box(x1, x1 + 0.5, y, y + 5.4, z - 0.3, z + 0.3, PAL.finishA, PAL.finishA);
    const nb = 12;
    for (let i = 0; i < nb; i++) {
      const xa = x0 - 0.5 + ((x1 - x0 + 1) * i) / nb, xb = x0 - 0.5 + ((x1 - x0 + 1) * (i + 1)) / nb;
      glow.box(xa, xb, y + 4.6, y + 5.4, z - 0.12, z + 0.12, i % 2 ? PAL.finishA : PAL.finishB);
    }
  }

  // checkpoint arches (subtle)
  for (const c of track.checkpoints.slice(1)) {
    glow.box(c.x - PATH_W / 2 - 0.4, c.x - PATH_W / 2, c.y, c.y + 3.4, c.z - 0.12, c.z + 0.12, 0x9fe8ff);
    glow.box(c.x + PATH_W / 2, c.x + PATH_W / 2 + 0.4, c.y, c.y + 3.4, c.z - 0.12, c.z + 0.12, 0x9fe8ff);
  }

  const litMesh = lit.build(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const glowMesh = glow.build(new THREE.MeshBasicMaterial({ vertexColors: true }));
  litMesh.name = 'track-lit'; glowMesh.name = 'track-glow';
  group.add(litMesh, glowMesh);

  group.add(buildSkyline(track));
  return group;
}

function nearestDeckY(track, z) {
  let best = 0, bd = Infinity;
  for (const p of track.platforms) {
    if (z >= p.z0 && z <= p.z1) return p.y;
    const d = Math.min(Math.abs(z - p.z0), Math.abs(z - p.z1));
    if (d < bd) { bd = d; best = p.y; }
  }
  return best;
}

function buildSkyline(track) {
  const rng = mulberry32(99);
  const boxes = [];
  const len = track.length + 80;
  for (let z = -40; z < len; z += 14) {
    for (const side of [-1, 1]) {
      if (rng() < 0.2) continue;
      const dist = 22 + rng() * 46;
      const w = 8 + rng() * 12, d = 8 + rng() * 12, h = 12 + rng() * 34;
      const yTop = -20 + rng() * 14;
      boxes.push({ x: side * dist, z: z + rng() * 8, w, d, h, yTop });
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const hues = [0x8a7fd6, 0x7fa8d6, 0x9b8fe0, 0x7f93c9, 0xa79ae6];
  const mesh = new THREE.InstancedMesh(geo,
    new THREE.MeshLambertMaterial({ color: 0xffffff }), boxes.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  boxes.forEach((b, i) => {
    m.makeScale(b.w, b.h, b.d);
    m.setPosition(b.x, b.yTop - b.h / 2, b.z);   // top of the box sits at yTop
    mesh.setMatrixAt(i, m);
    c.set(hues[i % hues.length]).multiplyScalar(0.75 + (i % 5) * 0.06);
    mesh.setColorAt(i, c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.name = 'skyline';
  return mesh;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
