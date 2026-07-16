import * as THREE from "three";

/** Stylized Spider-Man hero with trail. */
export function createHero() {
  const root = new THREE.Group();
  root.name = "hero";

  const red = new THREE.MeshStandardMaterial({
    color: 0xe11d2e,
    roughness: 0.45,
    metalness: 0.15,
  });
  const blue = new THREE.MeshStandardMaterial({
    color: 0x1a3fcc,
    roughness: 0.5,
    metalness: 0.1,
  });
  const white = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.15,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.55, 4, 10), blue);
  legs.position.y = 0.2;
  legs.castShadow = true;
  root.add(legs);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 4, 12), red);
  torso.position.y = 0.72;
  torso.castShadow = true;
  root.add(torso);

  // Spider emblem
  const emblem = new THREE.Mesh(
    new THREE.CircleGeometry(0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 })
  );
  emblem.position.set(0, 0.78, 0.23);
  root.add(emblem);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 20), red);
  head.position.y = 1.18;
  head.castShadow = true;
  root.add(head);

  // Mask eyes
  for (const sx of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), white);
    eye.scale.set(1, 1.35, 0.55);
    eye.position.set(sx, 1.2, 0.18);
    eye.rotation.z = sx * 0.35;
    root.add(eye);
  }

  // Arms
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.48, 4, 8), red);
    arm.position.set(sx * 0.36, 0.78, 0);
    arm.rotation.z = -sx * 0.45;
    arm.castShadow = true;
    root.add(arm);
  }

  // Web-shooter cuffs
  for (const sx of [-1, 1]) {
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.025, 6, 12),
      black
    );
    cuff.position.set(sx * 0.42, 0.55, 0.05);
    cuff.rotation.y = Math.PI / 2;
    root.add(cuff);
  }

  // Motion trail (ribbon of points)
  const trailGeo = new THREE.BufferGeometry();
  const trailCount = 24;
  const trailPos = new Float32Array(trailCount * 3);
  trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
  const trail = new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({
      color: 0xe11d2e,
      transparent: true,
      opacity: 0.45,
    })
  );
  trail.frustumCulled = false;

  return {
    root,
    trail,
    trailPos,
    trailCount,
    velocity: new THREE.Vector3(),
    grounded: false,
    facing: 1,
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
  pos[1] = hero.root.position.y + 0.6;
  pos[2] = hero.root.position.z;
  hero.trail.geometry.attributes.position.needsUpdate = true;
}

export function handPoint(hero) {
  return new THREE.Vector3(
    hero.root.position.x,
    hero.root.position.y + 0.85,
    hero.root.position.z
  );
}
