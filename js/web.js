import * as THREE from "three";

/** Web line mesh + pendulum constraint. */
export function createWeb() {
  const geo = new THREE.CylinderGeometry(0.03, 0.02, 1, 6);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe8ecff,
    emissive: 0x99aaff,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.92,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  mesh.castShadow = true;

  return {
    mesh,
    active: false,
    anchor: new THREE.Vector3(),
    length: 0,
    swings: 0,
  };
}

export function attachWeb(web, anchor, hand) {
  web.anchor.copy(anchor);
  web.length = hand.distanceTo(anchor);
  web.active = true;
  web.swings += 1;
  web.mesh.visible = true;
  drawWeb(web, hand);
}

export function releaseWeb(web) {
  web.active = false;
  web.mesh.visible = false;
}

export function drawWeb(web, hand) {
  if (!web.active) return;
  const mid = hand.clone().add(web.anchor).multiplyScalar(0.5);
  web.mesh.position.copy(mid);
  const len = hand.distanceTo(web.anchor);
  web.mesh.scale.set(1, len, 1);
  web.mesh.lookAt(web.anchor);
  web.mesh.rotateX(Math.PI / 2);
}

/**
 * High-feel swing: gravity, rope constraint, steer boost, zip shorten.
 */
export function swingStep(web, hero, dt, steer, zip) {
  if (!web.active) return;

  const g = -22;
  hero.velocity.y += g * dt * 0.9;

  // Optional zip: shorten rope for upward fling
  if (zip) {
    web.length = Math.max(10, web.length - 28 * dt);
  }

  hero.root.position.addScaledVector(hero.velocity, dt);

  const hand = new THREE.Vector3(
    hero.root.position.x,
    hero.root.position.y + 0.85,
    hero.root.position.z
  );
  const toHand = hand.clone().sub(web.anchor);
  const dist = toHand.length();

  if (dist > web.length) {
    const n = toHand.normalize();
    const corrected = web.anchor.clone().addScaledVector(n, web.length);
    hero.root.position.set(corrected.x, corrected.y - 0.85, corrected.z);

    const vDot = hero.velocity.dot(n);
    if (vDot > 0) hero.velocity.addScaledVector(n, -vDot);

    // Tangential boost
    if (Math.abs(steer) > 0.05) {
      const tangent = new THREE.Vector3(-n.z, 0, n.x);
      hero.velocity.addScaledVector(tangent, steer * 10 * dt);
      // Slight forward energy inject for fun arcade feel
      hero.velocity.x += steer * 4 * dt;
    }
  }

  hero.velocity.multiplyScalar(0.9965);
  drawWeb(web, hand.clone().set(
    hero.root.position.x,
    hero.root.position.y + 0.85,
    hero.root.position.z
  ));
}
