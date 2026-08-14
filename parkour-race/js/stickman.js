import * as THREE from 'three';

// Original low-poly stick figure, ~1.8 m tall, animated procedurally.
// Poses are driven by the runner state each frame (run / crouch / jump-tuck /
// flip / vault / rail slide / stumble / cheer).
export class Stickman {
  constructor(color = 0x222233, accent = 0xffd54a) {
    this.root = new THREE.Group();        // world transform (set by runner)
    this.body = new THREE.Group();        // flip rotation happens here
    this.root.add(this.body);

    const mat = new THREE.MeshLambertMaterial({ color });
    const accentMat = new THREE.MeshLambertMaterial({ color: accent });

    const limbGeo = new THREE.CapsuleGeometry(0.07, 0.38, 3, 8);

    // torso
    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 4, 10), mat);
    this.torso.position.y = 1.05;
    this.body.add(this.torso);

    // head
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), mat);
    this.head.position.y = 1.62;
    this.body.add(this.head);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.035, 8, 16), accentMat);
    band.rotation.x = Math.PI / 2.4;
    band.position.copy(this.head.position);
    band.position.y += 0.04;
    this.body.add(band);

    // limbs: pivot groups at shoulder/hip so we can swing them
    const makeLimb = (px, py, useAccent = false) => {
      const pivot = new THREE.Group();
      pivot.position.set(px, py, 0);
      const mesh = new THREE.Mesh(limbGeo, useAccent ? accentMat : mat);
      mesh.position.y = -0.26;
      pivot.add(mesh);
      this.body.add(pivot);
      return pivot;
    };
    this.armL = makeLimb(-0.24, 1.32);
    this.armR = makeLimb(0.24, 1.32);
    this.legL = makeLimb(-0.11, 0.72, true);
    this.legR = makeLimb(0.11, 0.72, true);

    this.runPhase = Math.random() * Math.PI * 2;
    this.flipAngle = 0;

    this.root.traverse((o) => { o.castShadow = true; });
  }

  /**
   * @param state one of: idle, run, charge, air, flip, vault, rail, stumble, cheer, fall
   */
  update(dt, state, { speed = 0, charge = 0, flipT = 0, stumbleT = 0 } = {}) {
    const b = this.body;

    // reset per-frame targets, then blend toward them
    let torsoLean = 0, crouch = 0;
    let aL = 0, aR = 0, lL = 0, lR = 0; // limb swing angles (x-rotation)
    let armSpread = 0.12;
    let flip = 0;

    switch (state) {
      case 'run': {
        this.runPhase += dt * (6 + speed * 1.15);
        const s = Math.sin(this.runPhase);
        const amp = Math.min(1.15, 0.4 + speed * 0.055);
        lL = s * amp; lR = -s * amp;
        aL = -s * amp * 0.8; aR = s * amp * 0.8;
        torsoLean = 0.18 + speed * 0.012;
        crouch = Math.abs(Math.cos(this.runPhase)) * 0.04;
        break;
      }
      case 'charge': {
        this.runPhase += dt * (5 + speed);
        const s = Math.sin(this.runPhase);
        lL = s * 0.5; lR = -s * 0.5;
        aL = -0.9; aR = -0.9; armSpread = 0.35;
        crouch = 0.22 + charge * 0.3;
        torsoLean = 0.45 + charge * 0.25;
        break;
      }
      case 'air': {
        // reaching pose, legs split
        lL = 0.85; lR = -0.55;
        aL = -2.4; aR = 0.6;
        torsoLean = 0.25;
        break;
      }
      case 'flip': {
        // full front flip, tucked
        flip = flipT * Math.PI * 2;
        lL = 1.9; lR = 1.9;   // knees to chest
        aL = 1.2; aR = 1.2;
        crouch = 0.1;
        break;
      }
      case 'vault': {
        flip = flipT * Math.PI * 0.5; // quarter rotation over the wall
        lL = 1.4; lR = 0.4;
        aL = -1.6; aR = 1.4; armSpread = 0.5;
        break;
      }
      case 'rail': {
        crouch = 0.34;
        torsoLean = 0.35;
        lL = 0.9; lR = -0.2;
        aL = -0.5; aR = 0.9; armSpread = 0.6;
        break;
      }
      case 'stumble': {
        const w = Math.sin(stumbleT * 30) * (1 - stumbleT);
        torsoLean = 0.7 - stumbleT * 0.5;
        crouch = 0.18;
        aL = -1.8 + w; aR = -1.6 - w; armSpread = 0.8;
        lL = w * 0.7; lR = -w * 0.7;
        break;
      }
      case 'cheer': {
        this.runPhase += dt * 10;
        const s = Math.sin(this.runPhase);
        aL = -2.9 + s * 0.15; aR = -2.9 - s * 0.15;
        crouch = Math.max(0, -s) * 0.1;
        break;
      }
      case 'fall': {
        this.runPhase += dt * 14;
        const s = Math.sin(this.runPhase);
        aL = -2.5 + s; aR = -2.5 - s; armSpread = 0.9;
        lL = s; lR = -s;
        break;
      }
      default: { // idle
        this.runPhase += dt * 2;
        crouch = 0.02 + Math.sin(this.runPhase) * 0.015;
        aL = 0.1; aR = -0.1;
      }
    }

    const k = Math.min(1, dt * 18); // blend speed
    this.legL.rotation.x += (lL - this.legL.rotation.x) * k;
    this.legR.rotation.x += (lR - this.legR.rotation.x) * k;
    this.armL.rotation.x += (aL - this.armL.rotation.x) * k;
    this.armR.rotation.x += (aR - this.armR.rotation.x) * k;
    this.armL.rotation.z += (armSpread - this.armL.rotation.z) * k;
    this.armR.rotation.z += (-armSpread - this.armR.rotation.z) * k;

    b.position.y += (-crouch - b.position.y) * k;

    if (state === 'flip' || state === 'vault') {
      this.flipAngle = flip; // driven directly for crisp rotation
    } else {
      this.flipAngle += (0 - this.flipAngle) * Math.min(1, dt * 14);
    }
    b.rotation.x = torsoLean * 0 + this.flipAngle; // flip around hips
    this.torso.rotation.x = torsoLean;
    this.head.rotation.x = -torsoLean * 0.5;
  }
}
