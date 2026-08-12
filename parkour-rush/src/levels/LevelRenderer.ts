import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BuiltLevel, RenderBox } from './LevelTypes';
import { THEMES, mulberry32 } from './LevelTypes';

/**
 * Turns a built level into renderable content with aggressive batching:
 * all static boxes merge into TWO meshes (one lit, one unlit/glow) —
 * two draw calls for the whole course. Background skyline uses instanced
 * boxes. Fog + hemisphere/directional lighting per theme.
 */

function boxGeometryFor(b: RenderBox, color: THREE.Color): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(b.sx, b.sy, b.sz);
  geo.translate(b.x, b.y, b.z);
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export class LevelRenderer {
  group = new THREE.Group();
  private disposables: (THREE.BufferGeometry | THREE.Material)[] = [];

  build(level: BuiltLevel, scene: THREE.Scene): void {
    this.dispose();
    const pal = THEMES[level.theme];
    const tmpColor = new THREE.Color();

    // ---- merge static boxes (lit vs glow)
    const litGeos: THREE.BufferGeometry[] = [];
    const glowGeos: THREE.BufferGeometry[] = [];
    for (const b of level.statics) {
      tmpColor.set(b.color);
      if (b.glow && b.glow > 0.2) {
        tmpColor.multiplyScalar(1);
        glowGeos.push(boxGeometryFor(b, tmpColor));
      } else {
        litGeos.push(boxGeometryFor(b, tmpColor));
      }
    }
    if (litGeos.length) {
      const merged = mergeGeometries(litGeos, false)!;
      litGeos.forEach((g) => g.dispose());
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      const mesh = new THREE.Mesh(merged, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.disposables.push(merged, mat);
    }
    if (glowGeos.length) {
      const merged = mergeGeometries(glowGeos, false)!;
      glowGeos.forEach((g) => g.dispose());
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
      const mesh = new THREE.Mesh(merged, mat);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.disposables.push(merged, mat);
    }

    // ---- background skyline (instanced, decorative only)
    const rng = mulberry32(level.length | 0);
    const bCount = 90;
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const bMat = new THREE.MeshLambertMaterial({ color: pal.prop1 });
    const inst = new THREE.InstancedMesh(bGeo, bMat, bCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < bCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const dist = 14 + rng() * 30;
      const h = 6 + rng() * 26;
      const w = 5 + rng() * 9;
      dummy.position.set(side * dist, h / 2 - 12, (i / bCount) * (level.length + 120) - 30);
      dummy.scale.set(w, h, w);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);
    this.disposables.push(bGeo, bMat);

    // ---- distant ground plane
    const groundGeo = new THREE.PlaneGeometry(400, level.length + 400);
    const groundMat = new THREE.MeshLambertMaterial({ color: pal.prop2 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -14, level.length / 2);
    this.group.add(ground);
    this.disposables.push(groundGeo, groundMat);

    // ---- lighting + atmosphere
    scene.background = new THREE.Color(pal.sky);
    scene.fog = new THREE.FogExp2(pal.fog, pal.fogDensity);
    const hemi = new THREE.HemisphereLight(pal.sky, pal.ambient, 0.95);
    const sun = new THREE.DirectionalLight(pal.sun, 1.15);
    sun.position.set(-8, 20, -10);
    this.group.add(hemi, sun);

    scene.add(this.group);
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
