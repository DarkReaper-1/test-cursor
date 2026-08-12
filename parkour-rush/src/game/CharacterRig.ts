import * as THREE from 'three';
import type { CharacterDef } from '../progression/CharacterSystem';

/**
 * Original stylized low-poly runner built 100% procedurally (no external
 * assets): rounded torso, visor head, segmented arms/legs. Proportions and
 * palette come from the character definition; accent color is a cosmetic.
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
}

function part(geo: THREE.BufferGeometry, color: string | number, group: THREE.Group, x = 0, y = 0, z = 0): THREE.Mesh {
  const mat = new THREE.MeshLambertMaterial({ color });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

export function createCharacterRig(def: CharacterDef, accentColor: string): RigParts {
  const s = def.scale;
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.92 * s;
  root.add(hips);

  // torso
  const torsoGeo = new THREE.BoxGeometry(0.52 * s, 0.62 * s, 0.32 * s, 1, 1, 1);
  const torso = part(torsoGeo, def.bodyColor, hips, 0, 0.34 * s, 0);
  // chest accent stripe (cosmetic color)
  const stripe = part(new THREE.BoxGeometry(0.54 * s, 0.14 * s, 0.34 * s), accentColor, hips, 0, 0.44 * s, 0);
  stripe.renderOrder = 1;

  // head with visor
  const headSize = 0.34 * s * def.headSize;
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.78 * s;
  hips.add(headGroup);
  const head = part(new THREE.BoxGeometry(headSize, headSize, headSize), def.headColor, headGroup, 0, headSize * 0.55, 0);
  part(new THREE.BoxGeometry(headSize * 0.85, headSize * 0.38, 0.06), def.visorColor, headGroup, 0, headSize * 0.62, headSize * 0.5);

  // arms (pivot at shoulder)
  const mkArm = (side: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(side * 0.36 * s, 0.58 * s, 0);
    part(new THREE.BoxGeometry(0.16 * s, 0.52 * s, 0.16 * s), def.bodyColor, g, 0, -0.24 * s, 0);
    part(new THREE.BoxGeometry(0.14 * s, 0.18 * s, 0.14 * s), accentColor, g, 0, -0.55 * s, 0);
    hips.add(g);
    return g;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  // legs (pivot at hip)
  const mkLeg = (side: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(side * 0.15 * s, 0, 0);
    part(new THREE.BoxGeometry(0.19 * s, 0.6 * s, 0.19 * s), def.visorColor, g, 0, -0.32 * s, 0);
    part(new THREE.BoxGeometry(0.2 * s, 0.14 * s, 0.3 * s), accentColor, g, 0, -0.66 * s, 0.05 * s);
    hips.add(g);
    return g;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  root.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });

  return { root, hips, torso, head, armL, armR, legL, legR };
}

export function setRigOpacity(rig: RigParts, opacity: number): void {
  rig.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const mat = mesh.material as THREE.MeshLambertMaterial;
      mat.transparent = opacity < 1;
      mat.opacity = opacity;
    }
  });
}
