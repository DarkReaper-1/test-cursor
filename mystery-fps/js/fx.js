import * as THREE from "three";

/** Floating dust motes for manor atmosphere */
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

/** Storm rain particle system */
export function createRain(count = 1400) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = Math.random() * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0x88aacc,
      size: 0.045,
      transparent: true,
      opacity: 0.4,
    })
  );
}

export function updateRain(rain, dt, cam) {
  if (!rain) return;
  const pos = rain.geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + 1] -= (8 + (i % 5)) * dt;
    pos[i] -= 1.5 * dt;
    if (pos[i + 1] < 0) {
      pos[i + 1] = 18 + Math.random() * 4;
      pos[i] = cam.position.x + (Math.random() - 0.5) * 40;
      pos[i + 2] = cam.position.z + (Math.random() - 0.5) * 40;
    }
  }
  rain.geometry.attributes.position.needsUpdate = true;
}
