import * as THREE from "three";

const canvas = document.getElementById("game-canvas");
const launchScreen = document.getElementById("launch-screen");
const statusEl = document.getElementById("status");
const swingsEl = document.getElementById("swings");
const speedEl = document.getElementById("speed");
const joystickKnob = document.getElementById("joystick-knob");
const crosshair = document.getElementById("crosshair");

const W = 852, H = 393;
const GRAVITY = -18;
const MOVE_SPEED = 14;

let renderer, scene, camera, player, webLine, buildings = [];
let velocity = new THREE.Vector3();
let web = null;
let swingCount = 0;
let cameraTarget = new THREE.Vector3();
let clock = new THREE.Clock();

const input = {
  move: 0,
  webHeld: false,
  aimX: W * 0.75,
  aimY: H * 0.5,
  jump: false,
};

// Expose for demo recorder
window.gameInput = input;
window.gameAPI = {
  getSwingCount: () => swingCount,
  getSpeed: () => velocity.length(),
  getStatus: () => statusEl.textContent,
};

init();
animate();

function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e23);
  scene.fog = new THREE.Fog(0x0a0e23, 80, 200);

  camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 500);
  camera.position.set(-3, 8, 14);

  const ambient = new THREE.AmbientLight(0x556688, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0d0, 1.2);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x6688cc, 0.4);
  fill.position.set(-20, 30, -10);
  scene.add(fill);

  generateCity();
  createPlayer();
  createWebLine();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 80),
    new THREE.MeshStandardMaterial({ color: 0x0d1220, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  setTimeout(() => launchScreen.classList.add("hidden"), 1800);
}

function generateCity() {
  let x = -20;
  let seed = 42;
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  while (x < 280) {
    const bw = 6 + rng() * 8;
    const bd = 6 + rng() * 8;
    const bh = 12 + rng() * 33;
    const gap = 4 + rng() * 8;
    const bz = -8 + rng() * 16;

    const hue = 0.58 + rng() * 0.08;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.2, 0.14 + rng() * 0.08),
      roughness: 0.85,
      metalness: 0.05,
    });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
    mesh.position.set(x + bw / 2, bh / 2, bz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    addWindows(mesh, bw, bh, bd, rng);

    buildings.push({
      mesh,
      roofY: bh,
      minX: x,
      maxX: x + bw,
      minZ: bz - bd / 2,
      maxZ: bz + bd / 2,
    });

    x += bw + gap;
  }

  // Distant skyline
  x = 0;
  while (x < 280) {
    const w = 8 + rng() * 12;
    const h = 30 + rng() * 50;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.6 + rng() * 0.1, 0.15, 0.06),
      transparent: true,
      opacity: 0.35,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    mesh.position.set(x, h / 2, -40 + rng() * 10);
    scene.add(mesh);
    x += w + 2 + rng() * 6;
  }
}

function addWindows(building, bw, bh, bd, rng) {
  const rows = Math.floor(bh / 3);
  const cols = Math.floor(bw / 2.2);
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() > 0.55) continue;
      const lit = rng() > 0.55;
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.2, 0.05),
        new THREE.MeshStandardMaterial({
          color: lit ? 0xffee88 : 0x141a28,
          emissive: lit ? 0xffcc44 : 0x000000,
          emissiveIntensity: lit ? 0.5 : 0,
        })
      );
      win.position.set(
        -bw / 2 + 1.2 + c * 2.2,
        -bh / 2 + r * 3,
        bd / 2 + 0.03
      );
      building.add(win);
    }
  }
}

function createPlayer() {
  player = new THREE.Group();

  const red = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.6 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 8), red);
  torso.position.y = 0.55;
  torso.castShadow = true;
  player.add(torso);

  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), blue);
  legs.position.y = 0.15;
  legs.castShadow = true;
  player.add(legs);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), red);
  head.position.y = 0.95;
  head.castShadow = true;
  player.add(head);

  const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const le = new THREE.Mesh(eyeGeo, white);
  le.position.set(-0.08, 0.98, 0.14);
  player.add(le);
  const re = new THREE.Mesh(eyeGeo, white);
  re.position.set(0.08, 0.98, 0.14);
  player.add(re);

  player.position.set(5, roofHeight(5, 0) + 1.2, 0);
  scene.add(player);
}

function createWebLine() {
  const geo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xeeeeff,
    emissive: 0x8888cc,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.85,
  });
  webLine = new THREE.Mesh(geo, mat);
  webLine.visible = false;
  scene.add(webLine);
}

function roofHeight(x, z) {
  let h = 0;
  for (const b of buildings) {
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      h = Math.max(h, b.roofY);
    }
  }
  return h;
}

function findWebAnchor(point) {
  let best = null, bestDist = Infinity;
  for (const b of buildings) {
    const anchors = [
      new THREE.Vector3(b.minX, b.roofY, (b.minZ + b.maxZ) / 2),
      new THREE.Vector3(b.maxX, b.roofY, (b.minZ + b.maxZ) / 2),
      new THREE.Vector3((b.minX + b.maxX) / 2, b.roofY, b.minZ),
      new THREE.Vector3((b.minX + b.maxX) / 2, b.roofY + 2, b.minZ),
    ];
    for (const a of anchors) {
      const d = point.distanceTo(a);
      if (d < 55 && d > 8 && d < bestDist) {
        bestDist = d;
        best = a.clone();
      }
    }
  }
  return best;
}

function getAttachPoint() {
  return new THREE.Vector3(player.position.x, player.position.y + 0.75, player.position.z);
}

function shootWeb() {
  const anchor = findWebAnchor(getAttachPoint());
  if (!anchor) return;
  const attach = getAttachPoint();
  web = { anchor, length: attach.distanceTo(anchor) };
  webLine.visible = true;
  swingCount++;
  statusEl.textContent = "Swinging!";
}

function releaseWeb() {
  web = null;
  webLine.visible = false;
  statusEl.textContent = "Ready to swing";
}

function updateWebLine() {
  if (!web) return;
  const attach = getAttachPoint();
  const mid = new THREE.Vector3().addVectors(attach, web.anchor).multiplyScalar(0.5);
  webLine.position.copy(mid);
  const len = attach.distanceTo(web.anchor);
  webLine.scale.set(1, len, 1);
  webLine.lookAt(web.anchor);
  webLine.rotateX(Math.PI / 2);
}

function applySwing(dt) {
  velocity.y += GRAVITY * dt * 0.85;
  player.position.x += velocity.x * dt;
  player.position.y += velocity.y * dt;
  player.position.z += velocity.z * dt;

  const attach = getAttachPoint();
  const dir = new THREE.Vector3().subVectors(attach, web.anchor);
  const dist = dir.length();
  if (dist > web.length) {
    dir.normalize();
    const corrected = web.anchor.clone().add(dir.multiplyScalar(web.length));
    player.position.set(corrected.x, corrected.y - 0.75, corrected.z);

    const vDotN = velocity.dot(dir);
    if (vDotN > 0) velocity.addScaledVector(dir, -vDotN);

    const tangent = new THREE.Vector3(-dir.z, 0, dir.x);
    if (Math.abs(input.move) > 0.1) {
      velocity.addScaledVector(tangent, input.move * 6 * dt);
    }
  }
  velocity.multiplyScalar(0.998);
  updateWebLine();
}

function applyNormal(dt) {
  velocity.y += GRAVITY * dt;
  if (Math.abs(input.move) > 0.1) {
    velocity.x += input.move * MOVE_SPEED * dt;
    velocity.z += input.move * 4 * dt;
  }
  velocity.x *= 0.92;
  velocity.z *= 0.92;

  player.position.x += velocity.x * dt;
  player.position.y += velocity.y * dt;
  player.position.z += velocity.z * dt;

  const roof = roofHeight(player.position.x, player.position.z);
  if (player.position.y <= roof + 1) {
    player.position.y = roof + 1;
    velocity.y = 0;
    if (!web) statusEl.textContent = "Ready to swing";
  }

  if (input.jump) {
    velocity.y = 10;
    velocity.x += (input.move || 1) * 4;
    input.jump = false;
    statusEl.textContent = "Airborne";
  }

  if (player.position.y < -10) {
    player.position.set(5, roofHeight(5, 0) + 1.2, 0);
    velocity.set(0, 0, 0);
    releaseWeb();
  }
}

function updateCamera(dt) {
  const swinging = !!web;
  const target = new THREE.Vector3(
    player.position.x - 3,
    player.position.y + (swinging ? 7 : 5),
    player.position.z + (swinging ? 16 : 12)
  );
  camera.position.lerp(target, Math.min(1, 6 * dt));
  cameraTarget.set(
    player.position.x + velocity.x * 0.3,
    player.position.y + 1.2,
    player.position.z + velocity.z * 0.3
  );
  camera.lookAt(cameraTarget);
}

function updateHUD() {
  swingsEl.textContent = `Swings: ${swingCount}`;
  speedEl.textContent = `${velocity.length().toFixed(1)} m/s`;
  joystickKnob.style.transform = `translate(calc(-50% + ${input.move * 30}px), -50%)`;
  if (input.webHeld) {
    crosshair.classList.add("visible");
    crosshair.style.left = `${input.aimX}px`;
    crosshair.style.top = `${input.aimY}px`;
  } else {
    crosshair.classList.remove("visible");
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  if (input.webHeld && !web) shootWeb();
  if (!input.webHeld && web) releaseWeb();

  if (web) applySwing(dt);
  else applyNormal(dt);

  if (Math.abs(input.move) > 0.1) {
    player.rotation.y = input.move > 0 ? 0 : Math.PI;
  }

  updateCamera(dt);
  updateHUD();
  renderer.render(scene, camera);
}

// Touch / mouse for manual play
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  if (x > W * 0.45) {
    input.webHeld = true;
    input.aimX = x; input.aimY = y;
  } else {
    input.move = Math.max(-1, Math.min(1, (x - 90) / 55));
  }
});
canvas.addEventListener("mouseup", () => { input.webHeld = false; input.move = 0; });
canvas.addEventListener("mousemove", (e) => {
  if (!input.webHeld) return;
  const rect = canvas.getBoundingClientRect();
  input.aimX = (e.clientX - rect.left) * (W / rect.width);
  input.aimY = (e.clientY - rect.top) * (H / rect.height);
});
document.getElementById("jump-btn").addEventListener("click", () => { input.jump = true; });
