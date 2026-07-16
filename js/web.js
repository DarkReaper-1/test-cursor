import * as THREE from "three";

/** Web line with shoot travel animation + tuned pendulum. */
export function createWeb() {
  const geo = new THREE.CylinderGeometry(0.035, 0.02, 1, 8);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf0f4ff,
    emissive: 0xaabbff,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.95,
    roughness: 0.25,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  mesh.castShadow = true;

  // Impact flash at anchor
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  );
  flash.visible = false;

  return {
    mesh,
    flash,
    active: false,
    shooting: false,
    shootT: 0,
    shootDuration: 0.12,
    anchor: new THREE.Vector3(),
    length: 0,
    restLength: 0,
    swings: 0,
  };
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
  web.flash.visible = true;
  web.flash.position.copy(anchor);
  web.flash.material.opacity = 0.9;
  drawWeb(web, hand, 0.05);
}

export function releaseWeb(web) {
  web.active = false;
  web.shooting = false;
  web.mesh.visible = false;
  web.flash.visible = false;
}

export function drawWeb(web, hand, progress = 1) {
  if (!web.active) return;
  const end = hand.clone().lerp(web.anchor, Math.min(1, progress));
  // While shooting, line goes from hand toward anchor
  const from = hand;
  const to = web.shooting ? end : web.anchor;
  const mid = from.clone().add(to).multiplyScalar(0.5);
  web.mesh.position.copy(mid);
  const len = from.distanceTo(to);
  web.mesh.scale.set(1, Math.max(0.05, len), 1);
  web.mesh.lookAt(to);
  web.mesh.rotateX(Math.PI / 2);
}

/**
 * Arcade-tuned swing: gravity, rope, steer, zip, slack, swing boost.
 */
export function swingStep(web, hero, dt, steer, zip) {
  if (!web.active) return { attached: false };

  if (web.shooting) {
    web.shootT += dt;
    const p = web.shootT / web.shootDuration;
    const hand = handOf(hero);
    drawWeb(web, hand, p);
    if (web.flash.visible) {
      web.flash.material.opacity = Math.max(0, 0.9 - p);
      web.flash.scale.setScalar(1 + p * 2);
    }
    if (p >= 1) {
      web.shooting = false;
      web.flash.visible = false;
      // Attach impulse toward swing
      const toAnchor = web.anchor.clone().sub(hand).normalize();
      hero.velocity.addScaledVector(toAnchor, 2.5);
      return { attached: true };
    }
    // Still move while web flies
    hero.velocity.y += -20 * dt;
    hero.root.position.addScaledVector(hero.velocity, dt);
    return { attached: false };
  }

  const g = -24;
  hero.velocity.y += g * dt * 0.92;

  // Zip shortens; holding opposite of zip (W) can slack slightly
  if (zip) {
    web.length = Math.max(8, web.length - 34 * dt);
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
    if (vDot > 0) hero.velocity.addScaledVector(n, -vDot * 1.05);

    // Build swing speed on the tangent
    const tangent = new THREE.Vector3(-n.z, 0, n.x);
    // Prefer swinging forward along +X
    const forward = new THREE.Vector3(1, 0, 0);
    const swingDir = tangent.dot(forward) >= 0 ? tangent : tangent.multiplyScalar(-1);

    if (Math.abs(steer) > 0.05) {
      hero.velocity.addScaledVector(swingDir, steer * 14 * dt);
      hero.velocity.x += Math.sign(steer || 1) * 5 * dt;
    } else {
      // Natural pendulum energy toward forward arc
      hero.velocity.addScaledVector(swingDir, 3.5 * dt);
    }

    // Slight spring pull for snappy feel
    const stretch = dist - web.length;
    if (stretch > 0) {
      hero.velocity.addScaledVector(n, -stretch * 2.5 * dt);
    }
  }

  hero.velocity.multiplyScalar(0.9975);
  // Soft speed cap
  const spd = hero.velocity.length();
  if (spd > 55) hero.velocity.multiplyScalar(55 / spd);

  drawWeb(web, handOf(hero), 1);
  return { attached: false };
}

/** Release fling — converts swing tangent into boost. */
export function releaseFling(web, hero) {
  if (!web.active) return;
  const hand = handOf(hero);
  const n = hand.clone().sub(web.anchor).normalize();
  const tangent = new THREE.Vector3(-n.z, 0.15, n.x).normalize();
  // Boost in current velocity direction + up
  const boost = Math.min(18, 6 + hero.velocity.length() * 0.25);
  hero.velocity.addScaledVector(tangent, boost * 0.35);
  hero.velocity.y += 3.5 + Math.max(0, -n.y) * 4;
  hero.velocity.x += Math.max(2, hero.facing * 2.5);
}

function handOf(hero) {
  return new THREE.Vector3(
    hero.root.position.x,
    hero.root.position.y + 0.85,
    hero.root.position.z
  );
}
