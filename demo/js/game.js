import * as THREE from "three";

const W = 852, H = 393;
const canvas = document.getElementById("c");
const boot = document.getElementById("boot");
const statusEl = document.getElementById("status");
const swingsEl = document.getElementById("swings");
const speedEl = document.getElementById("speed");
const knob = document.getElementById("knob");
const reticle = document.getElementById("reticle");

const input = { move: 0, web: false, aimX: W * 0.72, aimY: H * 0.42, jump: false };
window.gameInput = input;

let renderer, scene, camera, hero, webMesh;
let buildings = [];
let vel = new THREE.Vector3();
let web = null;
let swings = 0;
const clock = new THREE.Clock();

init();
setTimeout(() => boot.classList.add("gone"), 1600);
requestAnimationFrame(loop);

function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080c1a);
  scene.fog = new THREE.Fog(0x080c1a, 70, 210);

  camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 500);
  camera.position.set(-2, 8, 14);

  scene.add(new THREE.AmbientLight(0x5a6a88, 0.45));
  const sun = new THREE.DirectionalLight(0xfff0d5, 1.25);
  sun.position.set(40, 55, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x6a88cc, 0.35);
  fill.position.set(-25, 25, -15);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 90),
    new THREE.MeshStandardMaterial({ color: 0x0d1220, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  buildCity();
  buildHero();
  buildWeb();

  hero.position.set(8, roofAt(8, 0) + 1.25, 0);
}

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function buildCity() {
  const rnd = rngFactory(2026);
  let x = -18;
  while (x < 300) {
    const bw = 7 + rnd() * 9;
    const bd = 7 + rnd() * 7;
    const bh = 14 + rnd() * 38;
    const gap = 3 + rnd() * 7;
    const bz = -10 + rnd() * 20;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.58 + rnd() * 0.1, 0.22, 0.12 + rnd() * 0.08),
      roughness: 0.88,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
    mesh.position.set(x + bw / 2, bh / 2, bz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // roof ledge
    const ledge = new THREE.Mesh(
      new THREE.BoxGeometry(bw + 0.4, 0.3, bd + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222833, roughness: 0.7 })
    );
    ledge.position.set(0, bh / 2 - 0.05, 0);
    mesh.add(ledge);

    addWindows(mesh, bw, bh, bd, rnd);

    buildings.push({
      roofY: bh,
      minX: x, maxX: x + bw,
      minZ: bz - bd / 2, maxZ: bz + bd / 2,
      cx: x + bw / 2, cz: bz,
    });
    x += bw + gap;
  }

  // distant skyline
  x = 0;
  while (x < 300) {
    const w = 10 + rnd() * 14;
    const h = 36 + rnd() * 55;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, w),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.6, 0.12, 0.06),
        transparent: true, opacity: 0.38,
      })
    );
    m.position.set(x, h / 2, -50 + rnd() * 12);
    scene.add(m);
    x += w + 2 + rnd() * 6;
  }
}

function addWindows(parent, bw, bh, bd, rnd) {
  const rows = Math.floor(bh / 3.2);
  const cols = Math.floor(bw / 2.4);
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() > 0.6) continue;
      const lit = rnd() > 0.55;
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 1.25, 0.05),
        new THREE.MeshStandardMaterial({
          color: lit ? 0xffee88 : 0x101522,
          emissive: lit ? 0xffcc44 : 0x000000,
          emissiveIntensity: lit ? 0.55 : 0,
        })
      );
      pane.position.set(-bw / 2 + 1.3 + c * 2.4, -bh / 2 + r * 3.2, bd / 2 + 0.04);
      parent.add(pane);
    }
  }
}

function buildHero() {
  hero = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xeb3b4a, roughness: 0.55 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1a47d0, roughness: 0.55 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), red);
  torso.position.y = 0.6; torso.castShadow = true; hero.add(torso);

  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 4, 8), blue);
  legs.position.y = 0.18; legs.castShadow = true; hero.add(legs);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), red);
  head.position.y = 1.05; head.castShadow = true; hero.add(head);

  for (const sx of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), white);
    eye.position.set(sx, 1.08, 0.16);
    hero.add(eye);
  }
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.45, 4, 8), red);
    arm.position.set(sx * 0.32, 0.65, 0);
    arm.rotation.z = -sx * 0.4;
    hero.add(arm);
  }
  scene.add(hero);
}

function buildWeb() {
  const geo = new THREE.CylinderGeometry(0.028, 0.028, 1, 6);
  geo.translate(0, 0.5, 0);
  webMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xeef0ff, emissive: 0x8899cc, emissiveIntensity: 0.35,
    transparent: true, opacity: 0.9,
  }));
  webMesh.visible = false;
  scene.add(webMesh);
}

function roofAt(x, z) {
  let y = 0;
  for (const b of buildings) {
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) y = Math.max(y, b.roofY);
  }
  return y;
}

function hand() {
  return new THREE.Vector3(hero.position.x, hero.position.y + 0.8, hero.position.z);
}

function findAnchor(origin) {
  let best = null, bestScore = Infinity;
  const aim = new THREE.Vector3(
    origin.x + 20 + ((input.aimX / W) * 2 - 1) * 12,
    origin.y + 8 + (1 - (input.aimY / H) * 2) * 10,
    origin.z
  );
  const aimDir = aim.clone().sub(origin).normalize();

  for (const b of buildings) {
    const pts = [
      new THREE.Vector3(b.minX, b.roofY, b.cz),
      new THREE.Vector3(b.maxX, b.roofY, b.cz),
      new THREE.Vector3(b.cx, b.roofY, b.minZ),
      new THREE.Vector3(b.cx, b.roofY + 1.5, b.maxZ),
    ];
    for (const p of pts) {
      const d = origin.distanceTo(p);
      if (d < 10 || d > 58) continue;
      const align = 1 - Math.max(0, p.clone().sub(origin).normalize().dot(aimDir));
      const score = d + align * 40;
      if (score < bestScore) { bestScore = score; best = p; }
    }
  }
  return best;
}

function shoot() {
  const a = findAnchor(hand());
  if (!a) return;
  web = { anchor: a, length: hand().distanceTo(a) };
  webMesh.visible = true;
  swings++;
  statusEl.textContent = "Swinging!";
}

function release() {
  web = null;
  webMesh.visible = false;
  statusEl.textContent = "Ready to swing";
}

function drawWeb() {
  if (!web) return;
  const h = hand();
  const mid = h.clone().add(web.anchor).multiplyScalar(0.5);
  webMesh.position.copy(mid);
  const len = h.distanceTo(web.anchor);
  webMesh.scale.set(1, len, 1);
  webMesh.lookAt(web.anchor);
  webMesh.rotateX(Math.PI / 2);
}

function swing(dt) {
  vel.y += -18 * dt * 0.88;
  hero.position.addScaledVector(vel, dt);
  const h = hand();
  const dir = h.clone().sub(web.anchor);
  const dist = dir.length();
  if (dist > web.length) {
    dir.normalize();
    const corrected = web.anchor.clone().addScaledVector(dir, web.length);
    hero.position.set(corrected.x, corrected.y - 0.8, corrected.z);
    const vDot = vel.dot(dir);
    if (vDot > 0) vel.addScaledVector(dir, -vDot);
    if (Math.abs(input.move) > 0.1) {
      const t = new THREE.Vector3(-dir.z, 0, dir.x);
      vel.addScaledVector(t, input.move * 7 * dt);
    }
  }
  vel.multiplyScalar(0.997);
  drawWeb();
}

function freeMove(dt) {
  vel.y += -18 * dt;
  if (Math.abs(input.move) > 0.1) {
    vel.x += input.move * 16 * dt;
    vel.z += input.move * 3.5 * dt;
  }
  vel.x *= 0.9; vel.z *= 0.9;
  hero.position.addScaledVector(vel, dt);

  const roof = roofAt(hero.position.x, hero.position.z);
  if (hero.position.y <= roof + 1.15) {
    hero.position.y = roof + 1.15;
    vel.y = 0;
    if (!web) statusEl.textContent = "Ready to swing";
  }
  if (input.jump) {
    vel.y = 11;
    vel.x += (input.move || 1) * 3.5;
    input.jump = false;
    statusEl.textContent = "Airborne";
  }
  if (hero.position.y < -12) {
    hero.position.set(8, roofAt(8, 0) + 1.25, 0);
    vel.set(0, 0, 0);
    release();
  }
}

function updateCam(dt) {
  const swinging = !!web;
  const desired = new THREE.Vector3(
    hero.position.x - 2.5,
    hero.position.y + (swinging ? 7.5 : 5.5),
    hero.position.z + (swinging ? 16 : 12)
  );
  camera.position.lerp(desired, Math.min(1, 5.5 * dt));
  camera.lookAt(
    hero.position.x + vel.x * 0.25,
    hero.position.y + 1.1,
    hero.position.z + vel.z * 0.25
  );
}

function updateHUD() {
  swingsEl.textContent = `Swings  ${swings}`;
  speedEl.textContent = `${vel.length().toFixed(0)} m/s`;
  knob.style.transform = `translate(calc(-50% + ${input.move * 28}px), -50%)`;
  if (input.web) {
    reticle.classList.add("on");
    reticle.style.left = `${input.aimX}px`;
    reticle.style.top = `${input.aimY}px`;
  } else reticle.classList.remove("on");
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.04);

  if (input.web && !web) shoot();
  if (!input.web && web) release();
  if (web) swing(dt); else freeMove(dt);

  if (Math.abs(input.move) > 0.1) hero.rotation.y = input.move > 0 ? 0 : Math.PI;

  updateCam(dt);
  updateHUD();
  renderer.render(scene, camera);
}

// Manual play
canvas.addEventListener("mousedown", (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  if (x > W * 0.42) { input.web = true; input.aimX = x; input.aimY = y; }
  else input.move = Math.max(-1, Math.min(1, (x - 84) / 50));
});
window.addEventListener("mouseup", () => { input.web = false; input.move = 0; });
canvas.addEventListener("mousemove", (e) => {
  if (!input.web) return;
  const r = canvas.getBoundingClientRect();
  input.aimX = (e.clientX - r.left) * (W / r.width);
  input.aimY = (e.clientY - r.top) * (H / r.height);
});
document.getElementById("jump").addEventListener("click", () => { input.jump = true; });
