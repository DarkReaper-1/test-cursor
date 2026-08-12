import * as THREE from "three";

const GEO = {
  head: new THREE.SphereGeometry(0.28, 20, 16),
  neck: new THREE.SphereGeometry(0.16, 12, 10),
  torso: new THREE.SphereGeometry(0.28, 18, 14),
  pelvis: new THREE.SphereGeometry(0.24, 14, 12),
  shorts: new THREE.CylinderGeometry(0.25, 0.28, 0.34, 18),
  shoulder: new THREE.SphereGeometry(0.14, 12, 10),
  upperArm: new THREE.CapsuleGeometry(0.1, 0.16, 5, 12),
  elbow: new THREE.SphereGeometry(0.12, 12, 10),
  forearm: new THREE.CapsuleGeometry(0.095, 0.14, 5, 12),
  hand: new THREE.SphereGeometry(0.11, 12, 10),
  hip: new THREE.SphereGeometry(0.15, 12, 10),
  thigh: new THREE.CapsuleGeometry(0.12, 0.2, 5, 12),
  knee: new THREE.SphereGeometry(0.13, 12, 10),
  shin: new THREE.CapsuleGeometry(0.105, 0.18, 5, 12),
  shoe: new THREE.SphereGeometry(0.115, 12, 10),
};

const _world = new THREE.Vector3();

const toonGradient = (() => {
  const data = new Uint8Array([165, 165, 165, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 2, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

function toonMat(hex) {
  return new THREE.MeshToonMaterial({
    color: hex,
    emissive: hex,
    emissiveIntensity: 0.14,
    gradientMap: toonGradient,
  });
}

function mesh(geometry, mat, { x = 0, y = 0, z = 0, outline = false } = {}) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.userData.outline = outline;
  return m;
}

function inflateOutline(target) {
  const g = target.geometry.clone();
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const inflate = THREE.MathUtils.clamp(g.boundingSphere.radius * 0.32, 0.055, 0.1);
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + nrm.getX(i) * inflate,
      pos.getY(i) + nrm.getY(i) * inflate,
      pos.getZ(i) + nrm.getZ(i) * inflate
    );
  }
  pos.needsUpdate = true;
  const shell = new THREE.Mesh(
    g,
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
  );
  shell.castShadow = false;
  shell.receiveShadow = false;
  shell.renderOrder = -1;
  target.add(shell);
}

function createHandStreak(color) {
  const geom = new THREE.PlaneGeometry(0.22, 1.55);
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, 0, -0.78);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const streak = new THREE.Mesh(geom, mat);
  streak.frustumCulled = false;
  streak.visible = false;
  streak.renderOrder = 3;
  return streak;
}

function kitColor(bodyHex, redKit) {
  if (redKit) return { shorts: 0xe01832, shoe: 0xc41028 };
  const c = new THREE.Color(bodyHex);
  const shorts = c.clone().offsetHSL(0.02, 0.08, -0.16).getHex();
  const shoe = c.clone().offsetHSL(0, 0.05, -0.22).getHex();
  return { shorts, shoe };
}

export function createStickman(color, { outlined = false, redKit = outlined } = {}) {
  const group = new THREE.Group();
  const bodyMat = toonMat(color);
  const kit = kitColor(color, redKit);
  const red = toonMat(kit.shorts);
  const shoe = toonMat(kit.shoe);

  const hips = new THREE.Group();
  hips.position.y = 0.8;
  group.add(hips);

  const pelvis = mesh(GEO.pelvis, bodyMat, { y: 0.04 });
  const shorts = mesh(GEO.shorts, red, { y: 0.02 });
  const torso = mesh(GEO.torso, bodyMat, { y: 0.34, outline: true });
  torso.scale.set(0.95, 1.18, 0.78);
  const neck = mesh(GEO.neck, bodyMat, { y: 0.56 });
  const head = mesh(GEO.head, bodyMat, { y: 0.76, outline: true });
  hips.add(pelvis, shorts, torso, neck, head);

  function arm(side) {
    const root = new THREE.Group();
    root.position.set(side * 0.23, 0.46, 0.04);
    const shoulder = mesh(GEO.shoulder, bodyMat);
    const upper = mesh(GEO.upperArm, bodyMat, { y: -0.13, outline: true });
    const elbowG = new THREE.Group();
    elbowG.position.y = -0.26;
    const elbow = mesh(GEO.elbow, bodyMat);
    const lower = mesh(GEO.forearm, bodyMat, { y: -0.11, outline: true });
    const handG = new THREE.Group();
    handG.position.y = -0.24;
    const hand = mesh(GEO.hand, red, { outline: true });
    hand.scale.set(1.1, 0.9, 1.15);
    handG.add(hand);
    elbowG.add(elbow, lower, handG);
    root.add(shoulder, upper, elbowG);
    hips.add(root);
    return { root, elbow: elbowG, hand: handG, palm: hand };
  }

  function leg(side) {
    const root = new THREE.Group();
    root.position.set(side * 0.09, 0.04, 0);
    const hip = mesh(GEO.hip, bodyMat);
    const thigh = mesh(GEO.thigh, bodyMat, { y: -0.14, outline: true });
    const kneeG = new THREE.Group();
    kneeG.position.y = -0.3;
    const knee = mesh(GEO.knee, bodyMat);
    const shin = mesh(GEO.shin, bodyMat, { y: -0.13, outline: true });
    const footG = new THREE.Group();
    footG.position.set(0, -0.28, 0.07);
    const foot = mesh(GEO.shoe, shoe, { outline: true });
    foot.scale.set(1.2, 0.7, 1.6);
    footG.add(foot);
    kneeG.add(knee, shin, footG);
    root.add(hip, thigh, kneeG);
    hips.add(root);
    return { root, knee: kneeG, foot: footG };
  }

  const leftArm = arm(-1);
  const rightArm = arm(1);
  const leftLeg = leg(-1);
  const rightLeg = leg(1);

  if (outlined) {
    const parts = [];
    hips.traverse((obj) => {
      if (obj.isMesh && obj.userData.outline) parts.push(obj);
    });
    for (const p of parts) inflateOutline(p);
  }

  const trailL = createHandStreak(color);
  const trailR = createHandStreak(color);
  group.add(trailL, trailR);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 18),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  if (outlined) group.scale.setScalar(1.06);

  group.userData = {
    mat: bodyMat,
    red,
    shoe,
    hips,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    trailL,
    trailR,
    shadow,
    outlined,
    flip: 0,
    color,
  };

  return group;
}

export function setStickmanColor(mesh, color) {
  mesh.userData.mat.color.setHex(color);
  mesh.userData.mat.emissive.setHex(color);
  mesh.userData.trailL.material.color.setHex(color);
  mesh.userData.trailR.material.color.setHex(color);
  mesh.userData.color = color;
}

export function animateStickman(mesh, dt, { speed, grounded, action, wall, lateral }) {
  const u = mesh.userData;
  const t = performance.now() / 1000;
  const run = grounded && action === "run";
  const cadence = 7.4 + Math.min(speed, 28) * 0.1;
  const swing = Math.sin(t * cadence) * (run ? 1 : 0.1);

  const la = u.leftArm.root;
  const ra = u.rightArm.root;
  const le = u.leftArm.elbow;
  const re = u.rightArm.elbow;
  const ll = u.leftLeg.root;
  const rl = u.rightLeg.root;
  const lk = u.leftLeg.knee;
  const rk = u.rightLeg.knee;

  la.rotation.set(0, 0, 0.2);
  ra.rotation.set(0, 0, -0.2);
  le.rotation.set(0.2, 0, 0);
  re.rotation.set(0.2, 0, 0);
  ll.rotation.set(0, 0, 0);
  rl.rotation.set(0, 0, 0);
  lk.rotation.set(0, 0, 0);
  rk.rotation.set(0, 0, 0);
  u.hips.rotation.set(0, 0, 0);
  u.hips.position.y = 0.8;
  mesh.rotation.x = 0;
  mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, -lateral * 0.12, 8, dt);

  if (run) {
    mesh.rotation.x = 0.24;
    la.rotation.x = -swing * 1.15;
    ra.rotation.x = swing * 1.15;
    le.rotation.x = 0.55 + Math.max(0, -swing) * 0.45;
    re.rotation.x = 0.55 + Math.max(0, swing) * 0.45;
    ll.rotation.x = swing * 1.12;
    rl.rotation.x = -swing * 1.12;
    lk.rotation.x = Math.max(0, -swing) * 1.15;
    rk.rotation.x = Math.max(0, swing) * 1.15;
    u.hips.position.y = 0.8 + Math.abs(Math.sin(t * cadence)) * 0.04;
  } else if (action === "jump" || action === "fall") {
    mesh.rotation.x = 0.1;
    la.rotation.set(-0.2, 0, 1.15);
    ra.rotation.set(-0.2, 0, -1.15);
    ll.rotation.x = -0.8;
    rl.rotation.x = -0.5;
    lk.rotation.x = 1.1;
    rk.rotation.x = 0.85;
  } else if (action === "vault") {
    mesh.rotation.x = -0.35;
    u.hips.rotation.z = 0.18;
    la.rotation.set(0.45, 0, 0.3);
    ra.rotation.set(-1.15, 0, -0.65);
    ll.rotation.x = 1.2;
    rl.rotation.x = -0.5;
    lk.rotation.x = 0.35;
    rk.rotation.x = 0.65;
  } else if (action === "flip") {
    u.flip += dt * 11;
    mesh.rotation.x = -u.flip;
    la.rotation.set(-0.45, 0, 1.1);
    ra.rotation.set(-0.45, 0, -1.1);
    ll.rotation.x = 1.2;
    rl.rotation.x = 1.2;
    lk.rotation.x = 1.15;
    rk.rotation.x = 1.15;
  } else if (action === "slide") {
    u.hips.position.y = 0.42;
    u.hips.rotation.x = 1.05;
    ll.rotation.x = 0.12;
    rl.rotation.x = 1.4;
    la.rotation.set(0.65, 0, 0.5);
    ra.rotation.set(-0.3, 0, -0.8);
  } else if (action === "wall") {
    mesh.rotation.z = -(wall || 1) * 0.48;
    la.rotation.x = -swing;
    ra.rotation.x = swing;
    ll.rotation.x = swing * 0.8;
    rl.rotation.x = -swing * 0.8;
  } else if (action === "stumble") {
    u.hips.rotation.x = 0.32;
    la.rotation.set(0.45, 0, 0.65);
    ra.rotation.set(-0.15, 0, -0.95);
    ll.rotation.x = 0.4;
    rl.rotation.x = -0.12;
  } else if (action === "idle") {
    const bob = Math.sin(t * 2.1) * 0.018;
    u.hips.position.y = 0.8 + bob;
    la.rotation.z = 0.32;
    ra.rotation.z = -0.32;
    mesh.rotation.x = 0.06;
  } else if (action === "win") {
    const arms = 1.3 + Math.sin(t * 7) * 0.14;
    la.rotation.set(-arms, 0, 0.32);
    ra.rotation.set(-arms, 0, -0.32);
    u.hips.position.y = 0.8 + Math.abs(Math.sin(t * 5)) * 0.1;
    ll.rotation.x = 0.12;
    rl.rotation.x = -0.12;
  }

  if (action !== "flip") u.flip = 0;
  if (u.shadow) u.shadow.material.opacity = grounded ? 0.22 : 0.08;
  updateStreak(u.trailL, u.leftArm.palm, mesh, speed, action);
  updateStreak(u.trailR, u.rightArm.palm, mesh, speed, action);
}

function updateStreak(streak, hand, root, speed, action) {
  if (!root.userData.outlined || action === "idle" || action === "win") {
    streak.visible = false;
    return;
  }
  hand.getWorldPosition(_world);
  root.worldToLocal(_world);
  streak.position.copy(_world);
  streak.rotation.set(-0.4, 0, 0);
  const moving = speed > 12 || action === "jump" || action === "flip" || action === "vault";
  streak.visible = moving;
  streak.scale.set(1, 1, 0.9 + Math.min(speed, 26) * 0.025);
  streak.material.opacity = THREE.MathUtils.clamp((speed - 10) / 26, 0.2, 0.5);
}

export function createNameTag(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(2.2, 0.55, 1);
  spr.position.y = 2.05;
  spr.userData.canvas = canvas;
  spr.userData.tex = tex;
  writeNameTag(spr, text);
  return spr;
}

export function writeNameTag(spr, text) {
  const canvas = spr.userData.canvas;
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
  spr.userData.tex.needsUpdate = true;
}
