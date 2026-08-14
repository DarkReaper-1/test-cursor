import * as THREE from 'three';
import type { CharacterDef } from '../progression/CharacterSystem';

/**
 * Procedural Madbox-style stickman: round head, thin limbs, bright outfit.
 * Built entirely from primitives — no external meshes or textures.
 */

export interface RigParts {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  hipY: number;
  scale: number;
}

function mat(color: string | number, emissive = 0): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ color });
  if (emissive) {
    m.emissive = new THREE.Color(color);
    m.emissiveIntensity = emissive;
  }
  return m;
}

function addMesh(geo: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function createCharacterRig(def: CharacterDef, accentColor: string): RigParts {
  const s = def.scale;
  const root = new THREE.Group();
  const hipY = 0.88 * s;
  const hips = new THREE.Group();
  hips.position.y = hipY;
  root.add(hips);

  const limbMat = mat('#1a1a1e');
  const outfitMat = mat(def.bodyColor, 0.12);
  const accentMat = mat(accentColor, 0.22);
  const headMat = mat(def.headColor);

  // Capsule-ish torso (two stacked spheres + cylinder)
  const torso = addMesh(new THREE.CapsuleGeometry(0.16 * s, 0.38 * s, 4, 8), outfitMat, hips, 0, 0.34 * s, 0);
  addMesh(new THREE.SphereGeometry(0.09 * s, 8, 8), accentMat, hips, 0, 0.48 * s, 0.12 * s);

  // Round head sitting on a thin neck
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.72 * s;
  hips.add(headGroup);
  addMesh(new THREE.CylinderGeometry(0.045 * s, 0.05 * s, 0.1 * s, 8), limbMat, headGroup, 0, 0.04 * s, 0);
  const head = addMesh(
    new THREE.SphereGeometry(0.2 * s * def.headSize, 12, 10),
    headMat,
    headGroup,
    0,
    0.22 * s * def.headSize,
    0,
  );
  // tiny visor / face mark so facing reads at speed
  addMesh(
    new THREE.SphereGeometry(0.055 * s, 8, 8),
    mat(def.visorColor, 0.35),
    headGroup,
    0,
    0.24 * s * def.headSize,
    0.16 * s * def.headSize,
  );

  const mkArm = (side: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(side * 0.22 * s, 0.52 * s, 0);
    addMesh(new THREE.CapsuleGeometry(0.045 * s, 0.42 * s, 3, 6), limbMat, g, 0, -0.26 * s, 0);
    addMesh(new THREE.SphereGeometry(0.055 * s, 8, 8), accentMat, g, 0, -0.5 * s, 0);
    hips.add(g);
    return g;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  const mkLeg = (side: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(side * 0.1 * s, 0, 0);
    addMesh(new THREE.CapsuleGeometry(0.055 * s, 0.48 * s, 3, 6), limbMat, g, 0, -0.32 * s, 0);
    addMesh(new THREE.SphereGeometry(0.07 * s, 8, 8), accentMat, g, 0, -0.6 * s, 0.02 * s);
    hips.add(g);
    return g;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  root.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });

  return { root, hips, torso, head, armL, armR, legL, legR, hipY, scale: s };
}

export function setRigOpacity(rig: RigParts, opacity: number): void {
  rig.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const material = mesh.material as THREE.MeshLambertMaterial;
      material.transparent = opacity < 1;
      material.opacity = opacity;
    }
  });
}
