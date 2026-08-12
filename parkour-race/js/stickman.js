import * as THREE from "three";

function capsule(r, len, mat) {
  const g = new THREE.CapsuleGeometry(r, len, 6, 10);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

function addOutline(mesh, color = 0xffffff) {
  const outlineMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.setScalar(1.08);
  mesh.add(outline);
}

export function createStickman(color, { outlined = true } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });

  const hips = new THREE.Group();
  hips.position.y = 0.78;
  group.add(hips);

  const torso = capsule(0.2, 0.38, mat);
  torso.position.y = 0.28;
  hips.add(torso);
  if (outlined) addOutline(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), mat);
  head.position.y = 0.72;
  head.castShadow = true;
  hips.add(head);
  if (outlined) addOutline(head, 0xffffff);

  function arm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.28, 0.42, 0);
    const upper = capsule(0.075, 0.26, mat);
    upper.position.y = -0.18;
    const elbow = new THREE.Group();
    elbow.position.y = -0.34;
    const lower = capsule(0.065, 0.24, mat);
    lower.position.y = -0.16;
    if (outlined) {
      addOutline(upper);
      addOutline(lower);
    }
    elbow.add(lower);
    upper.add(elbow);
    shoulder.add(upper);
    hips.add(shoulder);
    return { shoulder, elbow };
  }

  function leg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.12, 0, 0);
    const thigh = capsule(0.09, 0.32, mat);
    thigh.position.y = -0.22;
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    const shin = capsule(0.08, 0.3, mat);
    shin.position.y = -0.2;
    if (outlined) {
      addOutline(thigh);
      addOutline(shin);
    }
    knee.add(shin);
    thigh.add(knee);
    hip.add(thigh);
    hips.add(hip);
    return { hip, knee };
  }

  const leftArm = arm(-1);
  const rightArm = arm(1);
  const leftLeg = leg(-1);
  const rightLeg = leg(1);

  const trailGeo = new THREE.BufferGeometry();
  const trailCount = 28;
  const trailPos = new Float32Array(trailCount * 6);
  trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  const trailMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.frustumCulled = false;
  group.add(trail);

  group.userData = {
    mat,
    trailMat,
    hips,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    trail,
    trailPos,
    trailCount,
    trailHistory: [],
    state: "run",
    stateT: 0,
    flip: 0,
    color,
  };

  return group;
}

export function setStickmanColor(mesh, color) {
  mesh.userData.mat.color.setHex(color);
  mesh.userData.trailMat.color.setHex(color);
  mesh.userData.color = color;
}

export function animateStickman(mesh, dt, { speed, grounded, action, wall, lateral }) {
  const u = mesh.userData;
  u.stateT += dt;
  const t = performance.now() / 1000;
  const cadence = 7 + speed * 0.18;
  const swing = Math.sin(t * cadence) * (grounded && action === "run" ? 0.9 : 0.15);

  const la = u.leftArm.shoulder;
  const ra = u.rightArm.shoulder;
  const ll = u.leftLeg.hip;
  const rl = u.rightLeg.hip;
  const lk = u.leftLeg.knee;
  const rk = u.rightLeg.knee;
  const le = u.leftArm.elbow;
  const re = u.rightArm.elbow;

  la.rotation.set(0, 0, 0.12);
  ra.rotation.set(0, 0, -0.12);
  ll.rotation.set(0, 0, 0);
  rl.rotation.set(0, 0, 0);
  lk.rotation.set(0, 0, 0);
  rk.rotation.set(0, 0, 0);
  u.hips.rotation.set(0, 0, 0);
  u.hips.position.y = 0.78;
  mesh.rotation.x = 0;
  mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, -lateral * 0.12, 8, dt);

  if (action === "run" && grounded) {
    la.rotation.x = -swing * 0.85;
    ra.rotation.x = swing * 0.85;
    ll.rotation.x = swing;
    rl.rotation.x = -swing;
    lk.rotation.x = Math.max(0, -swing) * 0.9;
    rk.rotation.x = Math.max(0, swing) * 0.9;
    le.rotation.x = 0.35;
    re.rotation.x = 0.35;
    u.hips.position.y = 0.78 + Math.abs(Math.sin(t * cadence)) * 0.04;
  } else if (action === "jump" || action === "fall") {
    la.rotation.set(-0.2, 0, 1.15);
    ra.rotation.set(-0.2, 0, -1.15);
    ll.rotation.x = -0.55;
    rl.rotation.x = -0.35;
    lk.rotation.x = 0.7;
    rk.rotation.x = 0.5;
  } else if (action === "vault") {
    la.rotation.set(0.6, 0, 0.4);
    ra.rotation.set(-1.1, 0, -0.8);
    ll.rotation.x = 1.1;
    rl.rotation.x = -0.4;
    mesh.rotation.x = -0.35;
    u.hips.rotation.z = 0.25;
  } else if (action === "flip") {
    u.flip += dt * 10;
    mesh.rotation.x = -u.flip;
    la.rotation.set(-0.4, 0, 1.2);
    ra.rotation.set(-0.4, 0, -1.2);
    ll.rotation.x = 1.2;
    rl.rotation.x = 1.2;
    lk.rotation.x = 1.1;
    rk.rotation.x = 1.1;
  } else if (action === "slide") {
    u.hips.position.y = 0.42;
    u.hips.rotation.x = 0.9;
    ll.rotation.x = 0.2;
    rl.rotation.x = 1.4;
    la.rotation.set(0.8, 0, 0.6);
    ra.rotation.set(-0.4, 0, -0.9);
  } else if (action === "wall") {
    const s = wall || 1;
    mesh.rotation.z = -s * 0.55;
    la.rotation.x = -swing;
    ra.rotation.x = swing;
    ll.rotation.x = swing * 0.8;
    rl.rotation.x = -swing * 0.8;
  } else if (action === "stumble") {
    u.hips.rotation.x = 0.4;
    la.rotation.set(0.6, 0, 0.8);
    ra.rotation.set(-0.3, 0, -1.1);
    ll.rotation.x = 0.5;
    rl.rotation.x = -0.2;
  } else if (action === "idle") {
    const bob = Math.sin(t * 2) * 0.02;
    u.hips.position.y = 0.78 + bob;
    la.rotation.z = 0.2;
    ra.rotation.z = -0.2;
  } else if (action === "win") {
    const arms = 1.4 + Math.sin(t * 8) * 0.2;
    la.rotation.set(-arms, 0, 0.4);
    ra.rotation.set(-arms, 0, -0.4);
    u.hips.position.y = 0.78 + Math.abs(Math.sin(t * 6)) * 0.12;
  }

  if (action !== "flip") u.flip = 0;
  updateTrail(mesh, speed, action);
}

function updateTrail(mesh, speed, action) {
  const u = mesh.userData;
  if (action === "idle") {
    u.trail.visible = false;
    return;
  }
  u.trail.visible = speed > 10 || action === "jump" || action === "flip" || action === "vault";
  const world = new THREE.Vector3();
  mesh.getWorldPosition(world);
  world.y += 0.35;
  u.trailHistory.unshift(world.clone());
  if (u.trailHistory.length > u.trailCount) u.trailHistory.pop();

  const pos = u.trailPos;
  const n = u.trailHistory.length;
  const local = new THREE.Vector3();
  for (let i = 0; i < u.trailCount; i++) {
    const a = u.trailHistory[Math.min(i, n - 1)] || world;
    local.copy(a);
    mesh.worldToLocal(local);
    const w = (1 - i / u.trailCount) * 0.22;
    const idx = i * 6;
    pos[idx] = local.x - w;
    pos[idx + 1] = local.y;
    pos[idx + 2] = local.z;
    pos[idx + 3] = local.x + w;
    pos[idx + 4] = local.y;
    pos[idx + 5] = local.z;
  }
  u.trail.geometry.attributes.position.needsUpdate = true;
}

export function createNameTag(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = "700 28px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.strokeText(text, 128, 32);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(2.2, 0.55, 1);
  spr.position.y = 2.15;
  return spr;
}
