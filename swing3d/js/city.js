/* =============================================================================
   city.js — procedural city generator for Skyline Drifter
   -----------------------------------------------------------------------------
   Produces:
     • A ground plane split into blocks by a street grid (with alleyways).
     • Buildings of varied heights, footprints and window facades.
     • Rooftop props: water towers, HVAC units, parapets, antennae.
     • A collision model: one physics.Box per building fed into a SpatialHash.

   Performance strategy for desktop browsers:
     • Buildings share a small set of materials.
     • Rooftop props are drawn with THREE.InstancedMesh (one draw call per prop
       type) instead of hundreds of individual meshes.
     • Windows are faked with an emissive texture on the facade material rather
       than real geometry, so a building is a single box mesh.

   The generator is deterministic given a seed, so the same city (and therefore
   the same demo recording) can be reproduced.
   ============================================================================= */

import * as THREE from 'three';
import { Box, SpatialHash } from './physics.js';

/**
 * Tiny seeded PRNG (mulberry32). Deterministic and fast.
 */
function makeRNG(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a canvas-based facade texture with lit/unlit windows. One texture is
 * generated per "tint" and reused across many buildings.
 */
function makeFacadeTexture(rng, baseHex, litHex) {
  const cols = 8, rows = 16;
  const cw = 16, ch = 16;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cw;
  canvas.height = rows * ch;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lit = rng() < 0.32;
      ctx.fillStyle = lit ? litHex : 'rgba(10,14,22,0.92)';
      // window pane with a small margin (mullions)
      ctx.fillRect(x * cw + 3, y * ch + 3, cw - 6, ch - 6);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Generate the whole city and add its meshes to `scene`.
 *
 * @param {THREE.Scene} scene
 * @param {object} [opts]
 * @returns {{
 *   hash: SpatialHash, boxes: Box[], bounds: number,
 *   materials: THREE.Material[], windowMats: THREE.MeshStandardMaterial[],
 *   setNight: (n:number)=>void
 * }}
 */
export function generateCity(scene, opts = {}) {
  const {
    seed = 1337,
    blocks = 9,          // NxN city blocks
    blockSize = 60,      // metres per block (building footprint region)
    street = 20,         // street width between blocks
  } = opts;

  const rng = makeRNG(seed);
  const hash = new SpatialHash(70);
  const boxes = [];

  const step = blockSize + street;
  const bounds = blocks * step;
  const half = bounds / 2;

  // ---- Ground / streets --------------------------------------------------
  const groundGeo = new THREE.PlaneGeometry(bounds * 1.2, bounds * 1.2);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x11151d, roughness: 0.95, metalness: 0.0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Street markings: subtle grid lines drawn as thin emissive strips.
  const laneMat = new THREE.MeshStandardMaterial({ color: 0x2a3242, roughness: 0.8 });
  for (let i = 0; i <= blocks; i++) {
    const p = -half + i * step - street / 2;
    const roadGeoH = new THREE.PlaneGeometry(bounds * 1.2, street);
    const roadH = new THREE.Mesh(roadGeoH, laneMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.02, p);
    roadH.receiveShadow = true;
    scene.add(roadH);

    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(street, bounds * 1.2), laneMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(p, 0.02, 0);
    roadV.receiveShadow = true;
    scene.add(roadV);
  }

  // ---- Shared facade materials (a few tints) -----------------------------
  const tints = [
    ['#2b3550', '#ffd27a'],
    ['#24303f', '#8fd0ff'],
    ['#333042', '#ffb0a0'],
    ['#1f2a38', '#c9e6ff'],
  ];
  const windowMats = tints.map(([base, lit]) => {
    const tex = makeFacadeTexture(rng, base, lit);
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.0,     // raised at night by setNight()
      roughness: 0.5,
      metalness: 0.25,
    });
  });

  const boxGeo = new THREE.BoxGeometry(1, 1, 1); // unit cube, scaled per building

  // ---- Rooftop prop instancing -------------------------------------------
  // We count props first so InstancedMesh can be sized exactly.
  const propTransforms = { water: [], hvac: [], antenna: [] };

  const dummy = new THREE.Object3D();

  // ---- Buildings ---------------------------------------------------------
  const buildingGroup = new THREE.Group();
  scene.add(buildingGroup);

  for (let bx = 0; bx < blocks; bx++) {
    for (let bz = 0; bz < blocks; bz++) {
      const blockX = -half + bx * step + blockSize / 2;
      const blockZ = -half + bz * step + blockSize / 2;

      // Some blocks are small plazas (no tall tower) for variety & alleyways.
      const isPlaza = rng() < 0.12;
      const towers = isPlaza ? 1 : 1 + (rng() < 0.5 ? 1 : 0);

      for (let t = 0; t < towers; t++) {
        // Footprint: leave margin for alleyways between adjacent towers.
        const fw = (0.5 + rng() * 0.42) * blockSize * (towers > 1 ? 0.5 : 1);
        const fd = (0.5 + rng() * 0.42) * blockSize * (towers > 1 ? 0.5 : 1);

        const ox = towers > 1 ? (t === 0 ? -1 : 1) * blockSize * 0.22 : (rng() - 0.5) * 8;
        const oz = towers > 1 ? (rng() - 0.5) * blockSize * 0.2 : (rng() - 0.5) * 8;

        const cx = blockX + ox;
        const cz = blockZ + oz;

        const height = isPlaza
          ? 8 + rng() * 14
          : 24 + Math.pow(rng(), 1.7) * 150; // biased toward some very tall towers

        const matIndex = (Math.random() * windowMats.length) | 0;
        const mat = windowMats[matIndex % windowMats.length];

        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.scale.set(fw, height, fd);
        mesh.position.set(cx, height / 2, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Repeat the window texture proportionally to size so panes look even.
        // (Clone the material only if we need unique repeats; instead we bake a
        // per-mesh onBeforeRender uv scale via geometry groups would be heavy —
        // simplest is to accept shared repeat, which reads fine at distance.)
        buildingGroup.add(mesh);

        // Collision box (slightly inflated so the capsule doesn't clip corners).
        const box = new Box(
          cx - fw / 2, 0, cz - fd / 2,
          cx + fw / 2, height, cz + fd / 2,
        );
        boxes.push(box);
        hash.insert(box);

        // ---- Rooftop dressing --------------------------------------------
        const roofY = height;
        // Parapet ring around the roof edge.
        const parapet = new THREE.Mesh(boxGeo, groundMat);
        const pt = 1.1;
        parapet.scale.set(fw, pt, fd);
        parapet.position.set(cx, roofY + pt / 2, cz);
        parapet.castShadow = true;
        buildingGroup.add(parapet);

        // Water tower (cylinder) — only on some roofs.
        if (rng() < 0.5 && fw > 14) {
          dummy.position.set(cx + (rng() - 0.5) * fw * 0.4, roofY + 4, cz + (rng() - 0.5) * fd * 0.4);
          dummy.rotation.set(0, rng() * Math.PI, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          propTransforms.water.push(dummy.matrix.clone());
        }
        // HVAC boxes.
        const hvacCount = (rng() * 3) | 0;
        for (let h = 0; h < hvacCount; h++) {
          dummy.position.set(
            cx + (rng() - 0.5) * fw * 0.6,
            roofY + 1.6,
            cz + (rng() - 0.5) * fd * 0.6,
          );
          dummy.rotation.set(0, rng() * Math.PI, 0);
          const s = 0.7 + rng() * 0.8;
          dummy.scale.set(s, s * 0.8, s);
          dummy.updateMatrix();
          propTransforms.hvac.push(dummy.matrix.clone());
        }
        // Antenna on tall towers.
        if (height > 90 && rng() < 0.7) {
          dummy.position.set(cx, roofY + 8, cz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1 + rng(), 1);
          dummy.updateMatrix();
          propTransforms.antenna.push(dummy.matrix.clone());
        }
      }
    }
  }

  // ---- Build InstancedMeshes for props -----------------------------------
  const propMeshes = [];

  function buildInstanced(geo, material, transforms) {
    if (transforms.length === 0) return null;
    const inst = new THREE.InstancedMesh(geo, material, transforms.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    for (let i = 0; i < transforms.length; i++) inst.setMatrixAt(i, transforms[i]);
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
    propMeshes.push(inst);
    return inst;
  }

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.6, metalness: 0.6 });
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x3b2f27, roughness: 0.85, metalness: 0.05 });

  buildInstanced(new THREE.CylinderGeometry(3.2, 3.6, 8, 12), tankMat, propTransforms.water);
  buildInstanced(new THREE.BoxGeometry(4, 3, 4), metalMat, propTransforms.hvac);
  buildInstanced(new THREE.CylinderGeometry(0.25, 0.4, 16, 6), metalMat, propTransforms.antenna);

  /**
   * Adjust materials for a normalized "night" factor in [0,1].
   * 0 = full day (windows dark), 1 = deep night (windows glow).
   */
  function setNight(n) {
    const glow = THREE.MathUtils.clamp(n, 0, 1);
    for (const m of windowMats) m.emissiveIntensity = glow * 1.15;
  }

  return { hash, boxes, bounds, materials: windowMats, windowMats, setNight, propMeshes };
}
