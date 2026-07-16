import * as THREE from "three";

/** Sagging web strand (line) + shoot travel + arcade pendulum. */
export function createWeb() {
  const positions = new Float32Array(18); // 6 points * 3
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0xe8f0ff,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.Line(geo, mat);
  mesh.visible = false;
  mesh.frustumCulled = false;

  // Glow twin
  const geo2 = geo.clone();
  const mat2 = new THREE.LineBasicMaterial({
    color: 0xaaccff,
    transparent: true,
    opacity: 0.35,
  });
  const mesh2 = new THREE.Line(geo2, mat2);
  mesh2.visible = false;
  mesh2.frustumCulled = false;

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  );
  flash.visible = false;

  return {
    mesh, mesh2, flash,
    active: false,
    shooting: false,
    shootT: 0,
    shootDuration: 0.1,
    anchor: new THREE.Vector3(),
    length: 0,
    restLength: 0,
    swings: 0,
  };
}

function writeStrand(geo, from, to, sag = 0.15) {
  const arr = geo.attributes.position.array;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = from.x + (to.x - from.x) * t;
    const z = from.z + (to.z - from.z) * t;
    const baseY = from.y + (to.y - from.y) * t;
    const drop = Math.sin(t * Math.PI) * Math.min(4.5, from.distanceTo(to) * sag);
    arr[i * 3] = x;
    arr[i * 3 + 1] = baseY - drop;
    arr[i * 3 + 2] = z;
  }
  geo.attributes.position.needsUpdate = true;
  geo.computeBoundingSphere();
}

export function attachWeb(web, anchor, hand) {
  web.anchor.copy(anchor);
  web.restLength = hand.distanceTo(anchor);
  web.length = web.restLength;
  web.active = true;
  web.shooting = true;
  web.shootT = 0;
  web.swings += 1;
  web.mesh.visible = true;
  web.mesh2.visible = true;
  web.flash.visible = true;
  web.flash.position.copy(anchor);
  web.flash.material.opacity = 1;
  writeStrand(web.mesh.geometry, hand, web.anchor, 0.06);
  writeStrand(web.mesh2.geometry, hand, web.anchor, 0.06);
}

export function releaseWeb(web) {
  web.active = false;
  web.shooting = false;
  web.mesh.visible = false;
  web.mesh2.visible = false;
  web.flash.visible = false;
}

export function swingStep(web, hero, dt, steer, zip) {
  if (!web.active) return { attached: false };

  if (web.shooting) {
    web.shootT += dt;
    const p = Math.min(1, web.shootT / web.shootDuration);
    const hand = handOf(hero);
    const tip = hand.clone().lerp(web.anchor, p);
    writeStrand(web.mesh.geometry, hand, tip, 0.04);
    writeStrand(web.mesh2.geometry, hand, tip, 0.04);
    web.flash.material.opacity = Math.max(0, 1 - p);
    web.flash.scale.setScalar(1 + p * 2.5);
    if (p >= 1) {
      web.shooting = false;
      web.flash.visible = false;
      const toAnchor = web.anchor.clone().sub(hand).normalize();
      hero.velocity.addScaledVector(toAnchor, 3.2);
      return { attached: true };
    }
    hero.velocity.y += -20 * dt;
    hero.root.position.addScaledVector(hero.velocity, dt * 0.85);
    return { attached: false };
  }

  hero.velocity.y += -25 * dt * 0.9;

  if (zip) {
    web.length = Math.max(7, web.length - 38 * dt);
    const pull = web.anchor.clone().sub(hero.root.position).normalize();
    hero.velocity.addScaledVector(pull, 10 * dt);
  }

  hero.root.position.addScaledVector(hero.velocity, dt);

  const hand = handOf(hero);
  const toHand = hand.clone().sub(web.anchor);
  const dist = toHand.length();

  if (dist > web.length) {
    const n = toHand.normalize();
    const corrected = web.anchor.clone().addScaledVector(n, web.length);
    hero.root.position.set(corrected.x, corrected.y - 0.85, corrected.z);

    const vDot = hero.velocity.dot(n);
    if (vDot > 0) hero.velocity.addScaledVector(n, -vDot * 1.08);

    let tangent = new THREE.Vector3(-n.z, 0, n.x);
    if (tangent.dot(new THREE.Vector3(1, 0, 0)) < 0) tangent.multiplyScalar(-1);

    const boost = Math.abs(steer) > 0.05 ? 16 : 5;
    hero.velocity.addScaledVector(tangent, (steer || 0.35) * boost * dt);
    hero.velocity.x += 6 * dt;

    if (hero.velocity.y > 0 && zip) {
      hero.velocity.addScaledVector(tangent, 8 * dt);
    }
  }

  hero.velocity.multiplyScalar(0.998);
  const spd = hero.velocity.length();
  if (spd > 62) hero.velocity.multiplyScalar(62 / spd);

  const h = handOf(hero);
  writeStrand(web.mesh.geometry, h, web.anchor, 0.14);
  writeStrand(web.mesh2.geometry, h, web.anchor, 0.14);
  return { attached: false };
}

export function releaseFling(web, hero) {
  if (!web.active) return;
  const hand = handOf(hero);
  const n = hand.clone().sub(web.anchor).normalize();
  const tangent = new THREE.Vector3(-n.z, 0.2, n.x).normalize();
  if (tangent.x < 0) tangent.multiplyScalar(-1);
  const boost = Math.min(22, 8 + hero.velocity.length() * 0.28);
  hero.velocity.addScaledVector(tangent, boost * 0.45);
  hero.velocity.y += 4.5 + Math.max(0, -n.y) * 5;
  hero.velocity.x += Math.max(3, hero.facing * 3);
}

function handOf(hero) {
  return new THREE.Vector3(
    hero.root.position.x,
    hero.root.position.y + 0.85,
    hero.root.position.z
  );
}
