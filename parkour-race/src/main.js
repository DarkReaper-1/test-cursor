import * as THREE from "three";

/* =========================================================================
   Parkour Race — Freerun  (original-code homage to the Madbox rooftop racer)
   - Auto-run forward, hold to charge a jump (longer hold = farther)
   - Steer left/right across rooftops, clear gaps, auto-vault obstacles
   - Hit glowing speed bumpers + land clean for momentum boosts
   - Race a pack of AI runners to the finish line
   ========================================================================= */

// ----------------------------- Tunables ----------------------------------
const LANE_HALF   = 3.2;     // steer bounds on X
const GRAVITY     = -34;
const CRUISE      = 16;       // speed everything relaxes toward
const SPEED_MIN   = 9;
const SPEED_MAX   = 30;
const STEER_SPEED = 8;
const CHARGE_TIME = 0.55;    // seconds to a full charge
const JUMP_MIN_VY = 7.5;
const JUMP_MAX_VY = 15;

// ----------------------------- Boot --------------------------------------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd3ff);
scene.fog = new THREE.Fog(0x8fd3ff, 80, 260);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 600);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

// ----------------------------- Lights ------------------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6b7a, 0.85));
const sun = new THREE.DirectionalLight(0xfff3d6, 1.25);
sun.position.set(40, 80, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 260;
const sc = 90;
sun.shadow.camera.left = -sc;
sun.shadow.camera.right = sc;
sun.shadow.camera.top = sc;
sun.shadow.camera.bottom = -sc;
scene.add(sun);
scene.add(sun.target);

// ----------------------------- RNG ---------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================ World / Course =============================
const worldGroup = new THREE.Group();
scene.add(worldGroup);

let platforms = [];   // {z0,z1,y,hw, mesh}
let bumpers   = [];   // {x,z,y,mesh,used}
let barriers  = [];   // {x,z,y,mesh}
let FINISH_Z  = 0;

const matRoof   = new THREE.MeshStandardMaterial({ color: 0x6b7a8f, roughness: 0.95 });
const matRoof2  = new THREE.MeshStandardMaterial({ color: 0x7d8ca0, roughness: 0.95 });
const matWall   = new THREE.MeshStandardMaterial({ color: 0x3d4a5c, roughness: 1 });
const matBumper = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 0.9, roughness: 0.4 });
const matBarrier= new THREE.MeshStandardMaterial({ color: 0xff5d73, roughness: 0.7 });

function makePlatform(z0, z1, y, hw, alt) {
  const len = z1 - z0;
  const depth = 14; // how far the building drops (visual)
  const g = new THREE.Group();
  // roof slab
  const roof = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 1, len), alt ? matRoof2 : matRoof);
  roof.position.set(0, y - 0.5, (z0 + z1) / 2);
  roof.receiveShadow = true;
  roof.castShadow = true;
  g.add(roof);
  // building body below the roof for depth
  const body = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 - 0.4, depth, len - 0.4), matWall);
  body.position.set(0, y - 1 - depth / 2, (z0 + z1) / 2);
  body.receiveShadow = true;
  g.add(body);
  // low parapet edges (visual only)
  worldGroup.add(g);
  return { z0, z1, y, hw, mesh: g };
}

function makeBumper(x, z, y) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.25, 20), matBumper);
  m.position.set(x, y + 0.12, z);
  m.castShadow = false;
  worldGroup.add(m);
  // glow ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.12, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xffe98a, emissive: 0xffd23f, emissiveIntensity: 1 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, y + 0.08, z);
  worldGroup.add(ring);
  return { x, z, y, mesh: m, ring, used: false };
}

function makeBarrier(x, z, y) {
  const w = 2.4, h = 1.0;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), matBarrier);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  worldGroup.add(m);
  return { x, z, y, w, mesh: m };
}

function buildCourse(seed = 7) {
  // clear
  worldGroup.clear();
  platforms = []; bumpers = []; barriers = [];
  const rng = mulberry32(seed);

  // start pad (no gap, wide, flat)
  platforms.push(makePlatform(-16, 30, 0, 6, false));

  let z = 30;
  let y = 0;
  let i = 0;
  while (z < 540) {
    const gap = 3.5 + rng() * (4.5 + Math.min(i * 0.15, 4)); // gaps grow a bit
    const zs = z + gap;
    const len = 15 + rng() * 15;
    // height change — gentle, occasional bigger drop
    let dh = (rng() - 0.5) * 2.2;
    if (rng() < 0.18) dh = -(1.5 + rng() * 2);
    y = Math.max(-4, Math.min(7, y + dh));
    const hw = 4.5 + rng() * 1.2;
    const p = makePlatform(zs, zs + len, y, hw, i % 2 === 0);
    platforms.push(p);

    // decorate
    if (rng() < 0.6) {
      const bx = (rng() * 2 - 1) * (hw - 1.4);
      bumpers.push(makeBumper(bx, zs + len * (0.35 + rng() * 0.4), y));
    }
    if (rng() < 0.35 && len > 20) {
      const bx = (rng() * 2 - 1) * (hw - 1.6);
      barriers.push(makeBarrier(bx, zs + len * 0.6, y));
    }

    z = zs + len;
    i++;
  }

  // finish pad
  const fz = z + 4;
  const fin = makePlatform(fz, fz + 46, y, 7, false);
  platforms.push(fin);
  FINISH_Z = fz + 3;

  // finish line + banner
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3),
    new THREE.MeshStandardMaterial({ map: makeCheckerTexture(), roughness: 1 })
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, y + 0.02, FINISH_Z);
  worldGroup.add(line);

  for (const sx of [-6.5, 6.5]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6), matWall);
    pole.position.set(sx, y + 3, FINISH_Z);
    worldGroup.add(pole);
  }
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(13.5, 1.6, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xff5d73 })
  );
  banner.position.set(0, y + 5.3, FINISH_Z);
  worldGroup.add(banner);

  buildSkyline(rng);
}

function makeCheckerTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const n = 8, s = 64 / n;
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      ctx.fillStyle = (a + b) % 2 ? "#111" : "#fff";
      ctx.fillRect(a * s, b * s, s, s);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}

// distant, non-interactive city for depth
function buildSkyline(rng) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mats = [0x2b3646, 0x33415a, 0x3c4a63].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 })
  );
  const inst = new THREE.InstancedMesh(geo, mats[0], 260);
  const m = new THREE.Matrix4();
  let idx = 0;
  for (let s = 0; s < 260; s++) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (16 + rng() * 90);
    const z = -30 + rng() * 640;
    const h = 12 + rng() * 60;
    const w = 6 + rng() * 12;
    m.makeScale(w, h, w);
    m.setPosition(x, h / 2 - 12, z);
    inst.setMatrixAt(idx++, m);
  }
  inst.count = idx;
  inst.castShadow = false;
  inst.receiveShadow = false;
  worldGroup.add(inst);
}

// world queries
function groundHeightAt(x, z) {
  for (let k = 0; k < platforms.length; k++) {
    const p = platforms[k];
    if (z >= p.z0 && z <= p.z1 && Math.abs(x) <= p.hw) return p.y;
  }
  return null;
}
function platformBefore(z) {
  let best = null;
  for (const p of platforms) if (p.z1 <= z + 0.01 && (!best || p.z1 > best.z1)) best = p;
  return best || platforms[0];
}
// smooth height along the course centre for AI (parabolic arcs over gaps)
function courseHeightAt(z) {
  for (const p of platforms) if (z >= p.z0 && z <= p.z1) return { y: p.y, air: 0 };
  // in a gap: find bounding platforms
  let A = null, B = null;
  for (const p of platforms) {
    if (p.z1 < z && (!A || p.z1 > A.z1)) A = p;
    if (p.z0 > z && (!B || p.z0 < B.z0)) B = p;
  }
  if (!A || !B) return { y: (A || B || platforms[0]).y, air: 0 };
  const t = (z - A.z1) / (B.z0 - A.z1);
  const base = A.y + (B.y - A.y) * t;
  const arc = 4.5 * 4 * t * (1 - t);
  return { y: base + arc, air: t > 0.05 && t < 0.95 ? 1 : 0 };
}

// ============================ Runner model ===============================
function makeRunner(color, isPlayer) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.8 });

  // pivot so 0 = feet, whole body flips around mid (~1.1)
  const bodyPivot = new THREE.Group();
  g.add(bodyPivot);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.6, 4, 10), skin);
  torso.position.y = 1.35;
  torso.castShadow = true;
  bodyPivot.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), skin);
  head.position.y = 2.05;
  head.castShadow = true;
  bodyPivot.add(head);

  function limb(x, y, len, mat) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, len, 4, 8), mat);
    mesh.position.y = -len / 2 - 0.1;
    mesh.castShadow = true;
    pivot.add(mesh);
    bodyPivot.add(pivot);
    return pivot;
  }
  const armL = limb(-0.42, 1.55, 0.55, skin);
  const armR = limb(0.42, 1.55, 0.55, skin);
  const legL = limb(-0.18, 0.85, 0.7, dark);
  const legR = limb(0.18, 0.85, 0.7, dark);

  // blob shadow
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  blob.rotation.x = -Math.PI / 2;

  scene.add(g);
  scene.add(blob);
  return { group: g, bodyPivot, armL, armR, legL, legR, torso, head, blob, isPlayer };
}

function poseRunner(r, phase, opts) {
  const { air = false, flip = 0, crouch = 0, tumble = 0 } = opts;
  const bp = r.bodyPivot;
  bp.rotation.set(0, 0, 0);
  bp.position.set(0, 0, 0);

  if (tumble > 0) {
    bp.rotation.x = tumble * 6;
    bp.rotation.z = Math.sin(tumble * 8) * 0.5;
    r.armL.rotation.x = 2; r.armR.rotation.x = -2;
    r.legL.rotation.x = 1.5; r.legR.rotation.x = -1.5;
    return;
  }

  if (air) {
    // flip around body centre + tuck
    bp.position.y = 1.1;
    bp.rotation.x = -flip * Math.PI * 2;
    bp.position.y = 0; // keep translation, rotate about pivot origin visually fine
    bp.rotation.x = -flip * Math.PI * 2;
    const tuck = 1.1;
    r.legL.rotation.x = tuck; r.legR.rotation.x = tuck * 0.8;
    r.armL.rotation.x = -1.4; r.armR.rotation.x = -1.4;
    r.torso.rotation.x = 0;
    return;
  }

  // grounded
  if (crouch > 0) {
    r.group.scale.y = 1 - crouch * 0.28;
    r.legL.rotation.x = crouch * 0.9;
    r.legR.rotation.x = crouch * 0.9;
    r.armL.rotation.x = -crouch * 1.2;
    r.armR.rotation.x = -crouch * 1.2;
    bp.rotation.x = crouch * 0.25;
    return;
  }
  r.group.scale.y = 1;
  const s = Math.sin(phase), c = Math.sin(phase + Math.PI);
  r.legL.rotation.x = s * 1.1;
  r.legR.rotation.x = c * 1.1;
  r.armL.rotation.x = c * 1.0;
  r.armR.rotation.x = s * 1.0;
  bp.rotation.x = 0.12; // slight forward lean
}

function placeRunner(r, x, y, z, headingWobble = 0) {
  r.group.position.set(x, y, z);
  r.group.rotation.y = headingWobble;
  r.blob.position.set(x, (groundHeightAt(x, z) ?? y) + 0.03, z);
  const dist = Math.max(0, y - (groundHeightAt(x, z) ?? y));
  r.blob.scale.setScalar(1 / (1 + dist * 0.25));
  r.blob.material.opacity = 0.28 / (1 + dist * 0.4);
}

// ============================ Game state =================================
const AI_COLORS = [0x4cc9f0, 0xff8fab, 0x80ed99, 0xffd166, 0xc77dff, 0xf4978e, 0x90dbf4];
let player, ais = [];
let state = "menu"; // menu | countdown | racing | done
let raceTime = 0;

function newRace() {
  buildCourse(7 + Math.floor(Math.random() * 9999));

  if (player) { scene.remove(player.group); scene.remove(player.blob); }
  for (const a of ais) { scene.remove(a.group); scene.remove(a.blob); }
  ais = [];

  player = makeRunner(0xffd23f, true);
  player.x = 0; player.z = 0; player.y = 0;
  player.vy = 0; player.speed = CRUISE;
  player.grounded = true; player.phase = 0;
  player.charging = false; player.charge = 0;
  player.jumping = false; player.jumpFlip = 0; player.airStart = 0;
  player.tumble = 0; player.lastGroundY = 0; player.steer = 0;
  player.finished = false; player.place = 0;

  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = makeRunner(AI_COLORS[i % AI_COLORS.length], false);
    a.z = -2 - Math.random() * 3;
    a.lane = (Math.random() * 2 - 1) * 2.4;
    a.phase = Math.random() * 6;
    // skill spread so 1st place is winnable but contested
    a.baseSpeed = CRUISE - 2.4 + Math.random() * 6.0;
    a.finished = false;
    ais.push(a);
  }
  raceTime = 0;
}

// ------------------------------ Input ------------------------------------
const keys = {};
addEventListener("keydown", (e) => {
  if (e.code === "Space") e.preventDefault();
  keys[e.code] = true;
  if (state === "menu" && (e.code === "Space" || e.code === "Enter")) startCountdown();
  if (state === "done" && (e.code === "Space" || e.code === "Enter")) toMenuThenRace();
});
addEventListener("keyup", (e) => { keys[e.code] = false; });

let pointerDown = false, pointerX = 0;
function onPointerDown(e) {
  pointerDown = true;
  pointerX = e.clientX ?? (e.touches && e.touches[0].clientX) ?? innerWidth / 2;
}
function onPointerMove(e) {
  if (!pointerDown) return;
  pointerX = e.clientX ?? (e.touches && e.touches[0].clientX) ?? pointerX;
}
function onPointerUp() { pointerDown = false; }
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
addEventListener("pointerup", onPointerUp);

function chargeHeld() {
  return keys["Space"] || pointerDown;
}
function steerInput() {
  let s = 0;
  if (keys["ArrowLeft"] || keys["KeyA"]) s -= 1;
  if (keys["ArrowRight"] || keys["KeyD"]) s += 1;
  if (s === 0 && pointerDown) {
    s = Math.max(-1, Math.min(1, (pointerX - innerWidth / 2) / (innerWidth * 0.28)));
  }
  return s;
}

// ------------------------------ Player update ----------------------------
function updatePlayer(dt) {
  const p = player;
  if (p.finished) return;

  raceTime += dt;

  // steer
  p.steer += (steerInput() * STEER_SPEED - p.steer) * Math.min(1, dt * 12);
  p.x += p.steer * dt;
  p.x = Math.max(-LANE_HALF, Math.min(LANE_HALF, p.x));

  // charge / jump
  if (p.tumble > 0) {
    p.tumble -= dt;
    if (p.tumble <= 0) respawn();
  } else if (p.grounded) {
    if (chargeHeld()) {
      p.charging = true;
      p.charge = Math.min(1, p.charge + dt / CHARGE_TIME);
    } else if (p.charging) {
      // release -> jump
      const vy = JUMP_MIN_VY + (JUMP_MAX_VY - JUMP_MIN_VY) * p.charge;
      p.vy = vy;
      p.grounded = false;
      p.jumping = true;
      p.jumpFlip = 0;
      p.speed = Math.min(SPEED_MAX, p.speed + p.charge * 4);
      p.charging = false;
      p.charge = 0;
    }
  }

  // forward momentum
  p.speed += (CRUISE - p.speed) * Math.min(1, dt * 0.5);
  p.speed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, p.speed));
  p.z += p.speed * dt;
  p.phase += p.speed * dt * 0.9;

  // vertical physics
  const gh = groundHeightAt(p.x, p.z);

  if (!p.grounded) {
    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.jumping) {
      // one flip spread over the airtime
      p.jumpFlip = Math.min(1, p.jumpFlip + dt * 1.4);
    }
    if (gh !== null && p.y <= gh && p.vy <= 0) {
      // land
      p.y = gh;
      p.vy = 0;
      p.grounded = true;
      const cleanFlip = p.jumping && p.jumpFlip > 0.6;
      p.jumping = false;
      p.jumpFlip = 0;
      p.lastGroundY = gh;
      if (cleanFlip) p.speed = Math.min(SPEED_MAX, p.speed + 2.5); // clean landing boost
    } else if (gh === null && p.y < p.lastGroundY - 6) {
      fall();
    }
  } else {
    if (gh === null) {
      // ran off an edge without jumping
      p.grounded = false;
      p.vy = 0;
      p.jumping = false;
    } else {
      p.y = gh;
      p.lastGroundY = gh;
    }
  }

  // auto-vault barriers when grounded and close
  if (p.grounded && p.tumble <= 0) {
    for (const b of barriers) {
      if (Math.abs(b.x - p.x) < 1.6 && Math.abs(b.z - p.z) < 1.1 && Math.abs(b.y - p.y) < 1.5) {
        p.vy = 8.5;
        p.grounded = false;
        p.jumping = true;
        p.jumpFlip = 0;
        p.speed = Math.min(SPEED_MAX, p.speed + 1.5);
        break;
      }
    }
  }

  // speed bumpers
  for (const bm of bumpers) {
    if (!bm.used && Math.abs(bm.x - p.x) < 1.5 && Math.abs(bm.z - p.z) < 1.4 && Math.abs(bm.y - p.y) < 1.6) {
      bm.used = true;
      bm.mesh.material = bm.mesh.material.clone();
      bm.mesh.material.emissiveIntensity = 0.1;
      p.speed = Math.min(SPEED_MAX, p.speed + 8);
      pulse();
    }
  }

  // finish
  if (p.z >= FINISH_Z) {
    p.finished = true;
    finishRace();
  }

  // pose
  const opts = { air: !p.grounded, flip: p.jumpFlip, crouch: p.charging ? p.charge : 0, tumble: p.tumble };
  poseRunner(p, p.phase, opts);
  placeRunner(p, p.x, p.y, p.z, -p.steer * 0.12);
}

function fall() {
  const p = player;
  p.tumble = 0.9;
  p.grounded = false;
  p.jumping = false;
}
function respawn() {
  const p = player;
  const pl = platformBefore(p.z);
  p.z = pl.z1 - 2;
  p.y = pl.y;
  p.lastGroundY = pl.y;
  p.x = Math.max(-pl.hw + 1, Math.min(pl.hw - 1, p.x));
  p.vy = 0;
  p.grounded = true;
  p.speed = SPEED_MIN;
  p.tumble = 0;
  p.charging = false; p.charge = 0;
}

// ------------------------------ AI update --------------------------------
function updateAI(dt) {
  for (const a of ais) {
    if (a.finished) { placeRunner(a, a.lane, a.y ?? 0, a.z); continue; }
    // rubber-band a touch toward the player for a lively pack
    const diff = player.z - a.z;
    const band = 1 + Math.max(-0.25, Math.min(0.3, diff * 0.01));
    const sp = a.baseSpeed * band * (0.95 + 0.1 * Math.sin(raceTime * 1.7 + a.phase));
    a.z += sp * dt;
    a.phase += sp * dt * 0.9;

    const h = courseHeightAt(a.z);
    a.y = h.y;
    placeRunner(a, a.lane, a.y, a.z, 0);
    poseRunner(a, a.phase, { air: h.air > 0, flip: h.air, crouch: 0, tumble: 0 });

    if (a.z >= FINISH_Z) { a.finished = true; a.finishT = raceTime; }
  }
}

// ------------------------------ Ranking ----------------------------------
function currentPlace() {
  let ahead = 0;
  for (const a of ais) if (a.z > player.z) ahead++;
  return ahead + 1;
}

// ============================ Camera =====================================
const camPos = new THREE.Vector3(0, 6, -9);
const camLook = new THREE.Vector3();
function updateCamera(dt, snap = false) {
  const p = player;
  const desired = new THREE.Vector3(p.x * 0.5, p.y + 5.2, p.z - 9);
  const k = snap ? 1 : Math.min(1, dt * 4);
  camPos.lerp(desired, k);
  camera.position.copy(camPos);
  camLook.lerp(new THREE.Vector3(p.x * 0.4, p.y + 1.6, p.z + 7), snap ? 1 : Math.min(1, dt * 6));
  camera.lookAt(camLook);
  sun.target.position.set(p.x, p.y, p.z);
  sun.position.set(p.x + 40, p.y + 80, p.z + 20);
}

// ============================ UI =========================================
const $ = (id) => document.getElementById(id);
const ui = {
  hud: $("hud"), start: $("start"), end: $("end"), countdown: $("countdown"),
  charge: $("charge"), chargeFill: $("charge-fill"),
  rankPos: $("rank-pos"), rankSuffix: $("rank-suffix"),
  progFill: $("progress-fill"), progRunner: $("progress-runner"),
  speedFill: $("speed-fill"),
  endTitle: $("end-title"), endPlace: $("end-place"), endTime: $("end-time"),
};
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const suffixOf = (n) => ordinal(n).replace(/^\d+/, "");

function updateHUD() {
  const place = currentPlace();
  ui.rankPos.textContent = place;
  ui.rankSuffix.textContent = suffixOf(place);
  const prog = Math.max(0, Math.min(1, player.z / FINISH_Z));
  ui.progFill.style.width = (prog * 100).toFixed(1) + "%";
  ui.progRunner.style.left = (prog * 100).toFixed(1) + "%";
  ui.speedFill.style.width = (((player.speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100).toFixed(0) + "%";

  if (player.charging) {
    ui.charge.classList.remove("hidden");
    ui.chargeFill.style.width = (player.charge * 100).toFixed(0) + "%";
  } else {
    ui.charge.classList.add("hidden");
  }
}

function pulse() {
  document.body.animate(
    [{ filter: "brightness(1)" }, { filter: "brightness(1.25)" }, { filter: "brightness(1)" }],
    { duration: 220 }
  );
}

// ------------------------------ Flow -------------------------------------
$("btn-start").addEventListener("click", startCountdown);
$("btn-again").addEventListener("click", toMenuThenRace);

function startCountdown() {
  if (state !== "menu") return;
  newRace();
  updateCamera(0, true);
  ui.start.classList.add("hidden");
  ui.hud.classList.remove("hidden");
  state = "countdown";
  let n = 3;
  ui.countdown.classList.remove("hidden");
  ui.countdown.textContent = n;
  const tick = () => {
    n--;
    if (n > 0) { ui.countdown.textContent = n; setTimeout(tick, 700); }
    else if (n === 0) { ui.countdown.textContent = "GO!"; setTimeout(tick, 600); }
    else { ui.countdown.classList.add("hidden"); state = "racing"; }
  };
  setTimeout(tick, 700);
}

function finishRace() {
  if (state === "done") return;
  state = "done";
  // settle final places: player time known; give unfinished AI projected times
  const results = [{ name: "You", t: raceTime, me: true }];
  for (const a of ais) {
    const t = a.finished ? a.finishT : raceTime + (FINISH_Z - a.z) / a.baseSpeed;
    results.push({ name: "AI", t });
  }
  results.sort((x, y) => x.t - y.t);
  const place = results.findIndex((r) => r.me) + 1;
  player.place = place;

  ui.endTitle.textContent = place === 1 ? "YOU WIN!" : "FINISH!";
  ui.endPlace.textContent = ordinal(place) + " place";
  ui.endTime.textContent = "Time " + raceTime.toFixed(2) + "s  ·  " + (ais.length + 1) + " racers";
  setTimeout(() => ui.end.classList.remove("hidden"), 500);
}

function toMenuThenRace() {
  ui.end.classList.add("hidden");
  ui.hud.classList.add("hidden");
  state = "menu";
  ui.start.classList.remove("hidden");
}

// ============================ Loop =======================================
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  dt = Math.min(dt, 0.05);

  if (state === "racing") {
    updatePlayer(dt);
    updateAI(dt);
    updateCamera(dt);
    updateHUD();
  } else if (state === "countdown") {
    updateAI(0); // hold pose
    poseRunner(player, player.phase, { air: false, flip: 0, crouch: 0, tumble: 0 });
    placeRunner(player, player.x, player.y, player.z, 0);
    updateCamera(dt);
    updateHUD();
  } else if (state === "done") {
    updateAI(dt);
    updateCamera(dt);
  }

  // animate bumper rings
  for (const bm of bumpers) if (bm.ring && !bm.used) bm.ring.rotation.z += dt * 2;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// build an idle scene behind the menu
buildCourse(7);
player = makeRunner(0xffd23f, true);
player.x = 0; player.y = 0; player.z = 0;
player.phase = 0; player.speed = CRUISE; player.grounded = true; player.steer = 0;
poseRunner(player, 0, { air: false, flip: 0, crouch: 0, tumble: 0 });
placeRunner(player, 0, 0, 0, 0);
updateCamera(0, true);
requestAnimationFrame(frame);
