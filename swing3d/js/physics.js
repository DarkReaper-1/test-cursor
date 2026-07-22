/* =============================================================================
   physics.js — math + simulation helpers for Skyline Drifter
   -----------------------------------------------------------------------------
   This module is intentionally free of any rendering or input concerns. It only
   knows about vectors, an axis-aligned-box world, gravity, capsule collision,
   and a position-based-dynamics (PBD) distance constraint that we use to make
   the web-line behave like a taut rope.

   Everything here operates on plain THREE.Vector3 objects so the player and
   camera code can share the same math without conversions.
   ============================================================================= */

import * as THREE from 'three';

/* World tuning constants. Units are "meters"; 1 unit ~= 1 metre. */
export const GRAVITY = 34;              // m/s^2 — snappier than real 9.8 for game feel
export const MAX_FALL_SPEED = 140;      // terminal velocity clamp
export const AIR_DRAG = 0.015;          // fraction of horizontal speed shed per second in air
export const GROUND_FRICTION = 8.5;     // velocity damping while grounded

/* Reusable scratch vectors so the hot loop never allocates. */
const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpC = new THREE.Vector3();

/**
 * Clamp a scalar into [min, max].
 */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * Frame-rate independent exponential smoothing (a.k.a. "lerp toward target").
 * `rate` is roughly "how much of the remaining gap is closed per second".
 */
export function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/**
 * Vector version of {@link damp}, writing into `out`.
 */
export function dampVec3(out, target, rate, dt) {
  const t = 1 - Math.exp(-rate * dt);
  out.x += (target.x - out.x) * t;
  out.y += (target.y - out.y) * t;
  out.z += (target.z - out.z) * t;
  return out;
}

/**
 * An axis-aligned bounding box helper describing one building.
 * We keep min/max in world space plus a cached centre for spatial hashing.
 */
export class Box {
  constructor(minX, minY, minZ, maxX, maxY, maxZ) {
    this.minX = minX; this.minY = minY; this.minZ = minZ;
    this.maxX = maxX; this.maxY = maxY; this.maxZ = maxZ;
  }
  get cx() { return (this.minX + this.maxX) * 0.5; }
  get cz() { return (this.minZ + this.maxZ) * 0.5; }
}

/**
 * Uniform-grid spatial hash. The city can contain hundreds of buildings, so we
 * bucket them into cells and only test the handful near the player each frame.
 * This is the main "optimise for desktop browsers" lever for collision cost.
 */
export class SpatialHash {
  constructor(cellSize = 60) {
    this.cell = cellSize;
    this.map = new Map();
  }

  _key(ix, iz) { return ix + ',' + iz; }

  /** Insert a box, registering it in every cell its footprint overlaps. */
  insert(box) {
    const c = this.cell;
    const x0 = Math.floor(box.minX / c), x1 = Math.floor(box.maxX / c);
    const z0 = Math.floor(box.minZ / c), z1 = Math.floor(box.maxZ / c);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = this._key(ix, iz);
        let arr = this.map.get(k);
        if (!arr) { arr = []; this.map.set(k, arr); }
        arr.push(box);
      }
    }
  }

  /**
   * Collect boxes within `radius` cells of a world position into `out`.
   * Deduplicates using a visited stamp so multi-cell boxes appear once.
   */
  query(x, z, radius, out) {
    out.length = 0;
    const c = this.cell;
    const cx = Math.floor(x / c), cz = Math.floor(z / c);
    this._stamp = (this._stamp || 0) + 1;
    const stamp = this._stamp;
    for (let ix = cx - radius; ix <= cx + radius; ix++) {
      for (let iz = cz - radius; iz <= cz + radius; iz++) {
        const arr = this.map.get(this._key(ix, iz));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const b = arr[i];
          if (b._stamp === stamp) continue; // already added this query
          b._stamp = stamp;
          out.push(b);
        }
      }
    }
    return out;
  }
}

/**
 * Result object describing the contacts a capsule made this step. Reused across
 * frames to avoid garbage.
 */
export class ContactInfo {
  constructor() {
    this.grounded = false;
    this.groundY = 0;
    this.touchingWall = false;
    this.wallNormal = new THREE.Vector3();
    this.ceiling = false;
  }
  reset() {
    this.grounded = false;
    this.groundY = 0;
    this.touchingWall = false;
    this.wallNormal.set(0, 0, 0);
    this.ceiling = false;
  }
}

/**
 * Resolve a vertical capsule (approximated as a point with `radius` and total
 * `height`) against the ground plane and a list of building boxes.
 *
 * The capsule origin `pos` is treated as the point at the character's feet.
 * We push the capsule out of penetrations and zero the velocity component that
 * points into each surface, filling `contact` with what we hit so the player
 * state machine can decide to wall-run, climb, land, etc.
 *
 * @param {THREE.Vector3} pos       feet position (mutated)
 * @param {THREE.Vector3} vel       velocity (mutated)
 * @param {number} radius           capsule radius
 * @param {number} height           capsule height (feet -> head)
 * @param {Box[]}  boxes            candidate buildings (from SpatialHash.query)
 * @param {ContactInfo} contact     output contacts (reset internally)
 */
export function resolveCapsule(pos, vel, radius, height, boxes, contact) {
  contact.reset();

  // --- Ground plane (streets sit at y = 0). ---
  if (pos.y <= 0) {
    pos.y = 0;
    if (vel.y < 0) vel.y = 0;
    contact.grounded = true;
    contact.groundY = 0;
  }

  const headY = pos.y + height;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];

    // Broad vertical reject: capsule span must overlap the box span.
    if (headY < b.minY || pos.y > b.maxY) continue;

    // Closest point on the box footprint to the capsule axis (in XZ).
    const cx = clamp(pos.x, b.minX, b.maxX);
    const cz = clamp(pos.z, b.minZ, b.maxZ);
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const distSq = dx * dx + dz * dz;

    const insideXZ = distSq < 1e-6;

    if (!insideXZ && distSq > radius * radius) continue; // clearly outside

    // --- Landing on / standing on a rooftop or setback. ---
    // If our feet are near the top of the box and we're moving down, treat the
    // roof as ground. This makes rooftops walkable.
    if (pos.y <= b.maxY + 0.6 && pos.y >= b.maxY - 2.5 && vel.y <= 0.5 &&
        pos.x > b.minX - radius && pos.x < b.maxX + radius &&
        pos.z > b.minZ - radius && pos.z < b.maxZ + radius) {
      pos.y = b.maxY;
      if (vel.y < 0) vel.y = 0;
      contact.grounded = true;
      contact.groundY = b.maxY;
      continue;
    }

    // Skip walls we're standing on top of.
    if (pos.y >= b.maxY - 0.05) continue;

    // --- Horizontal wall collision. ---
    if (insideXZ) {
      // Capsule axis is inside the footprint (shouldn't happen often); push out
      // along the smallest face distance.
      const toMinX = pos.x - b.minX, toMaxX = b.maxX - pos.x;
      const toMinZ = pos.z - b.minZ, toMaxZ = b.maxZ - pos.z;
      const m = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
      if (m === toMinX) { pos.x = b.minX - radius; contact.wallNormal.set(-1, 0, 0); }
      else if (m === toMaxX) { pos.x = b.maxX + radius; contact.wallNormal.set(1, 0, 0); }
      else if (m === toMinZ) { pos.z = b.minZ - radius; contact.wallNormal.set(0, 0, -1); }
      else { pos.z = b.maxZ + radius; contact.wallNormal.set(0, 0, 1); }
      contact.touchingWall = true;
    } else {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist, nz = dz / dist;
      const push = radius - dist;
      pos.x += nx * push;
      pos.z += nz * push;
      contact.wallNormal.set(nx, 0, nz);
      contact.touchingWall = true;
    }

    // Remove the into-wall velocity component so we slide along the facade.
    const vn = vel.x * contact.wallNormal.x + vel.z * contact.wallNormal.z;
    if (vn < 0) {
      vel.x -= vn * contact.wallNormal.x;
      vel.z -= vn * contact.wallNormal.z;
    }
  }

  return contact;
}

/**
 * Cast a ray against a list of boxes, returning the nearest hit within maxDist,
 * or null. Used to decide whether a web-line may attach (only to buildings) and
 * to find the exact anchor point.
 *
 * @returns {{point:THREE.Vector3, normal:THREE.Vector3, dist:number, box:Box}|null}
 */
export function raycastBoxes(origin, dir, maxDist, boxes) {
  let best = null;
  let bestT = maxDist;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    // Slab method for ray/AABB.
    let tmin = 0, tmax = bestT;
    let hitAxis = -1, hitSign = 1;

    // X slab
    let inv = 1 / dir.x;
    let t1 = (b.minX - origin.x) * inv;
    let t2 = (b.maxX - origin.x) * inv;
    let sign = -1;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; sign = 1; }
    if (t1 > tmin) { tmin = t1; hitAxis = 0; hitSign = sign; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) continue;

    // Y slab
    inv = 1 / dir.y;
    t1 = (b.minY - origin.y) * inv;
    t2 = (b.maxY - origin.y) * inv;
    sign = -1;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; sign = 1; }
    if (t1 > tmin) { tmin = t1; hitAxis = 1; hitSign = sign; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) continue;

    // Z slab
    inv = 1 / dir.z;
    t1 = (b.minZ - origin.z) * inv;
    t2 = (b.maxZ - origin.z) * inv;
    sign = -1;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; sign = 1; }
    if (t1 > tmin) { tmin = t1; hitAxis = 2; hitSign = sign; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) continue;

    if (tmin > 0 && tmin < bestT) {
      bestT = tmin;
      const point = new THREE.Vector3(
        origin.x + dir.x * tmin,
        origin.y + dir.y * tmin,
        origin.z + dir.z * tmin,
      );
      const normal = new THREE.Vector3();
      if (hitAxis === 0) normal.set(hitSign, 0, 0);
      else if (hitAxis === 1) normal.set(0, hitSign, 0);
      else normal.set(0, 0, hitSign);
      best = { point, normal, dist: tmin, box: b };
    }
  }
  return best;
}

/**
 * Position-based distance constraint — the heart of the web-swing feel.
 *
 * Given the capsule position, its anchor and a rest length, if the capsule is
 * farther than `rest` from the anchor we project it back onto the sphere of
 * radius `rest`. Crucially we also project the *velocity*: we strip out the
 * component pointing away from the anchor (radial), keeping only the tangential
 * part. That is exactly what a real rope does — it can pull but not push — and
 * it makes momentum carry smoothly around the arc.
 *
 * @param {THREE.Vector3} pos     capsule position (mutated when taut)
 * @param {THREE.Vector3} vel     velocity (mutated when taut)
 * @param {THREE.Vector3} anchor  fixed web attach point
 * @param {number} rest           current rope length
 * @param {number} stiffness      0..1, how hard the rope corrects (1 = rigid)
 * @returns {boolean} true if the rope was taut and applied a correction
 */
export function solveRope(pos, vel, anchor, rest, stiffness = 1) {
  const dx = pos.x - anchor.x;
  const dy = pos.y - anchor.y;
  const dz = pos.z - anchor.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len <= rest || len < 1e-4) return false; // slack rope does nothing

  const nx = dx / len, ny = dy / len, nz = dz / len;
  const correction = (len - rest) * stiffness;

  // Pull the position back toward the sphere surface.
  pos.x -= nx * correction;
  pos.y -= ny * correction;
  pos.z -= nz * correction;

  // Remove outward radial velocity so only tangential (swing) motion survives.
  const vr = vel.x * nx + vel.y * ny + vel.z * nz;
  if (vr > 0) {
    vel.x -= vr * nx;
    vel.y -= vr * ny;
    vel.z -= vr * nz;
  }
  return true;
}

export { _tmpA, _tmpB, _tmpC };
