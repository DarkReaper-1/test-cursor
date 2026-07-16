import * as THREE from "three";

export function createDust(count = 400) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 36;
    positions[i * 3 + 1] = 0.5 + Math.random() * 3.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 36;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xc9b896,
      size: 0.035,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
}

export function updateDust(dust, dt, cam) {
  if (!dust) return;
  const pos = dust.geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + 1] += Math.sin(performance.now() * 0.001 + i) * 0.002;
    pos[i] += 0.01 * dt;
    if (pos[i + 1] > 4) pos[i + 1] = 0.4;
    if (Math.abs(pos[i] - cam.position.x) > 20) pos[i] = cam.position.x + (Math.random() - 0.5) * 30;
    if (Math.abs(pos[i + 2] - cam.position.z) > 20) pos[i + 2] = cam.position.z + (Math.random() - 0.5) * 30;
  }
  dust.geometry.attributes.position.needsUpdate = true;
}

export function createProjectile(origin, direction) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xff6644 })
  );
  mesh.position.copy(origin);
  mesh.userData = {
    vel: direction.clone().normalize().multiplyScalar(14),
    life: 2.2,
    damage: 10,
  };
  const trail = new THREE.PointLight(0xff4422, 0.8, 2);
  mesh.add(trail);
  return mesh;
}

export function spawnDamageNumber(scene, point, text, color = "#ffcc66") {
  // Use a sprite via canvas texture
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.font = "bold 36px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, 64, 40);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(point);
  sprite.position.y += 0.4;
  sprite.scale.set(0.8, 0.4, 1);
  sprite.userData = { life: 0.7, vy: 1.4 };
  scene.add(sprite);
  return sprite;
}

export function updateFloating(list, dt, scene) {
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    s.userData.life -= dt;
    s.position.y += (s.userData.vy || 1) * dt;
    if (s.material) s.material.opacity = Math.max(0, s.userData.life / 0.7);
    if (s.userData.life <= 0) {
      scene.remove(s);
      list.splice(i, 1);
    }
  }
}
