import * as THREE from "three";

export function createHero() {
  const root = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xe11d2e, roughness: 0.38, metalness: 0.2 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1a3fcc, roughness: 0.42, metalness: 0.14 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });

  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.55, 4, 10), blue);
  legs.position.y = 0.2; legs.castShadow = true; root.add(legs);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 4, 12), red);
  torso.position.y = 0.72; torso.castShadow = true; root.add(torso);

  const emblem = new THREE.Mesh(
    new THREE.CircleGeometry(0.11, 14),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5 })
  );
  emblem.position.set(0, 0.78, 0.24); root.add(emblem);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 22), red);
  head.position.y = 1.18; head.castShadow = true; root.add(head);

  for (const sx of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), white);
    eye.scale.set(1.1, 1.45, 0.5);
    eye.position.set(sx, 1.21, 0.19);
    eye.rotation.z = sx * 0.4;
    root.add(eye);
  }

  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 4, 8), red);
    arm.position.set(sx * 0.36, 0.78, 0);
    arm.rotation.z = -sx * 0.45;
    arm.castShadow = true;
    root.add(arm);
    arms.push(arm);
  }

  for (const sx of [-1, 1]) {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 6, 14), black);
    cuff.position.set(sx * 0.44, 0.52, 0.06);
    cuff.rotation.y = Math.PI / 2;
    root.add(cuff);
  }

  const trailCount = 40;
  const trailPos = new Float32Array(trailCount * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
    color: 0xff3b4a, transparent: true, opacity: 0.6,
  }));
  trail.frustumCulled = false;

  return {
    root, legs, torso, arms, trail, trailPos, trailCount,
    velocity: new THREE.Vector3(),
    grounded: false,
    facing: 1,
    swingPose: 0,
    wallRunning: false,
    airJumps: 1,
    trickSpin: 0,
  };
}

export function updateTrail(hero) {
  const pos = hero.trail.geometry.attributes.position.array;
  for (let i = hero.trailCount - 1; i > 0; i--) {
    pos[i * 3] = pos[(i - 1) * 3];
    pos[i * 3 + 1] = pos[(i - 1) * 3 + 1];
    pos[i * 3 + 2] = pos[(i - 1) * 3 + 2];
  }
  pos[0] = hero.root.position.x;
  pos[1] = hero.root.position.y + 0.55;
  pos[2] = hero.root.position.z;
  hero.trail.geometry.attributes.position.needsUpdate = true;
  hero.trail.material.opacity = Math.min(0.85, 0.2 + hero.velocity.length() * 0.025);
}

export function updatePose(hero, swinging) {
  let target = 0;
  if (swinging) target = 1;
  else if (hero.wallRunning) target = 0.7;
  hero.swingPose += (target - hero.swingPose) * 0.18;
  const t = hero.swingPose;
  if (hero.arms?.[0] && hero.arms?.[1]) {
    hero.arms[0].rotation.z = 0.45 + t * 0.95;
    hero.arms[1].rotation.z = -0.45 - t * 0.95;
    hero.arms[0].rotation.x = -t * 0.85;
    hero.arms[1].rotation.x = -t * 0.85;
  }
  if (hero.legs) hero.legs.rotation.x = t * 0.55;
}

export function handPoint(hero) {
  return new THREE.Vector3(
    hero.root.position.x,
    hero.root.position.y + 0.85,
    hero.root.position.z
  );
}

/** Speed line streak VFX parented conceptually to camera view. */
export function createSpeedLines(scene) {
  const group = new THREE.Group();
  group.visible = false;
  const lines = [];
  for (let i = 0; i < 28; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2 - Math.random() * 4),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.35,
    }));
    line.position.set(
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.3) * 10,
      -6 - Math.random() * 8
    );
    group.add(line);
    lines.push(line);
  }
  scene.add(group);
  return { group, lines };
}

export function updateSpeedLines(fx, camera, speed) {
  const show = speed > 22;
  fx.group.visible = show;
  if (!show) return;
  fx.group.position.copy(camera.position);
  fx.group.quaternion.copy(camera.quaternion);
  const op = Math.min(0.55, (speed - 22) * 0.025);
  for (const line of fx.lines) {
    line.material.opacity = op;
    line.position.z += speed * 0.02;
    if (line.position.z > -2) {
      line.position.z = -8 - Math.random() * 6;
      line.position.x = (Math.random() - 0.5) * 16;
      line.position.y = (Math.random() - 0.3) * 10;
    }
  }
}
