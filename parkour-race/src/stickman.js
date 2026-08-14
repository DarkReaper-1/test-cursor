import * as THREE from 'three';

// Procedural low-poly stickman: capsule limbs driven by a pose state machine
// (run cycle, air poses, flips, vault tuck, grind crouch, stumble, win/lose).
// All original geometry — bright flat-colour arcade look.

function capsule(r, len, color, mat) {
  const g = new THREE.CapsuleGeometry(r, len, 3, 8);
  return new THREE.Mesh(g, mat);
}

export class Stickman {
  constructor(color, { nameTag = null } = {}) {
    this.root = new THREE.Group();           // world position + heading yaw
    this.body = new THREE.Group();           // flip rotation, squash, bob
    this.root.add(this.body);

    const mat = new THREE.MeshLambertMaterial({ color });
    const dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.72) });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this._mats = [mat, dark, headMat];

    // torso + head
    this.torso = capsule(0.145, 0.42, color, mat);
    this.torso.position.y = 1.16;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), headMat);
    this.head.position.y = 1.62;
    const band = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
    band.position.y = 1.63;
    this.body.add(this.torso, this.head, band);

    // limbs: two-segment (pivot at hip/shoulder, child pivot at knee/elbow)
    const mkLimb = (r, upLen, loLen, upMat, loMat) => {
      const hip = new THREE.Group();
      const upper = capsule(r, upLen, 0, upMat);
      upper.position.y = -upLen / 2 - r * 0.5;
      const knee = new THREE.Group();
      knee.position.y = -upLen - r;
      const lower = capsule(r * 0.9, loLen, 0, loMat);
      lower.position.y = -loLen / 2 - r * 0.5;
      knee.add(lower);
      hip.add(upper, knee);
      return { pivot: hip, joint: knee };
    };

    this.legL = mkLimb(0.075, 0.4, 0.42, mat, dark);
    this.legR = mkLimb(0.075, 0.4, 0.42, mat, dark);
    this.legL.pivot.position.set(-0.1, 0.95, 0);
    this.legR.pivot.position.set(0.1, 0.95, 0);
    this.armL = mkLimb(0.055, 0.3, 0.3, dark, mat);
    this.armR = mkLimb(0.055, 0.3, 0.3, dark, mat);
    this.armL.pivot.position.set(-0.24, 1.36, 0);
    this.armR.pivot.position.set(0.24, 1.36, 0);
    this.body.add(this.legL.pivot, this.legR.pivot, this.armL.pivot, this.armR.pivot);

    this.phase = Math.random() * Math.PI * 2;
    this._flipAngle = 0;
    this._lean = 0;
    this._squash = 0;

    if (nameTag) {
      this.tag = makeNameSprite(nameTag, color);
      this.tag.position.y = 2.25;
      this.root.add(this.tag);
    }
  }

  setOutcomePose() {}   // reserved

  // Read the Runner state and pose the rig. `mode` overrides for menus etc.
  update(dt, r, mode = null) {
    this.root.position.set(r.x, r.y, r.z);
    this.root.rotation.y = r.yaw;

    const speed01 = Math.min(1, r.speed / 14);
    const t = performance.now() / 1000;

    // squash & stretch envelope decays
    this._squash += (0 - this._squash) * Math.min(1, dt * 9);

    // --- flip rotation --------------------------------------------------
    if (r.flip) {
      this._flipAngle = -r.flip.progress * r.flip.total;
    } else {
      // unwind to nearest full turn so landings never snap visually
      const rem = this._flipAngle % (Math.PI * 2);
      this._flipAngle -= rem * Math.min(1, dt * 14);
      if (Math.abs(rem) < 0.02) this._flipAngle = 0;
    }

    let pose;
    if (mode === 'idle') pose = this._poseIdle(t);
    else if (mode === 'win') pose = this._poseWin(t);
    else if (mode === 'lose') pose = this._poseLose();
    else if (r.respawnTimer > 0) pose = this._poseIdle(t);
    else if (r.grindRail) pose = this._poseGrind(t);
    else if (r.vaultTimer > 0) pose = this._poseVault();
    else if (!r.grounded) pose = this._poseAir(r);
    else if (r.stumbleTimer > 0) pose = this._poseStumble(t);
    else pose = this._poseRun(dt, r, speed01);

    this._apply(pose, dt);

    // body lean: forward with speed, sideways into steering
    const targetLean = (r.grounded && !r.grindRail) ? 0.16 + speed01 * 0.22 : 0.05;
    this._lean += (targetLean - this._lean) * Math.min(1, dt * 8);
    this.body.rotation.x = this._flipAngle + this._lean + (pose.bodyPitch || 0);
    this.body.rotation.z = pose.bodyRoll || 0;
    this.body.position.y = pose.bodyY || 0;
    const sq = 1 + this._squash;
    this.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));

    if (this.tag) this.tag.material.rotation = 0;
  }

  landSquash(hard) { this._squash = hard ? -0.22 : -0.12; }
  jumpStretch() { this._squash = 0.14; }

  _apply(p, dt) {
    const k = Math.min(1, dt * (p.snap || 14));
    lerpRot(this.legL.pivot, p.legL, k); lerpRot(this.legR.pivot, p.legR, k);
    lerpRot(this.legL.joint, p.kneeL, k); lerpRot(this.legR.joint, p.kneeR, k);
    lerpRot(this.armL.pivot, p.armL, k); lerpRot(this.armR.pivot, p.armR, k);
    lerpRot(this.armL.joint, p.elbowL, k); lerpRot(this.armR.joint, p.elbowR, k);
  }

  _poseRun(dt, r, speed01) {
    this.phase += dt * (6 + r.speed * 1.35);
    const s = Math.sin(this.phase), c = Math.sin(this.phase + Math.PI);
    const amp = 0.55 + speed01 * 0.75;
    return {
      legL: { x: s * amp }, legR: { x: c * amp },
      kneeL: { x: Math.max(0, -s) * 1.5 * amp }, kneeR: { x: Math.max(0, -c) * 1.5 * amp },
      armL: { x: c * amp * 0.9, z: 0.12 }, armR: { x: s * amp * 0.9, z: -0.12 },
      elbowL: { x: -0.9 }, elbowR: { x: -0.9 },
      bodyY: Math.abs(Math.sin(this.phase)) * 0.05 * (0.4 + speed01),
    };
  }

  _poseAir(r) {
    if (r.flip) {   // tucked
      return {
        legL: { x: -1.9 }, legR: { x: -1.9 }, kneeL: { x: 2.2 }, kneeR: { x: 2.2 },
        armL: { x: -2.4, z: 0.3 }, armR: { x: -2.4, z: -0.3 },
        elbowL: { x: -1.4 }, elbowR: { x: -1.4 }, snap: 18,
      };
    }
    const rising = r.vy > 1;
    return rising ? {   // hero leap: front leg forward, arms up
      legL: { x: 0.9 }, legR: { x: -0.9 }, kneeL: { x: 0.4 }, kneeR: { x: 1.6 },
      armL: { x: -2.6, z: 0.45 }, armR: { x: -2.2, z: -0.45 },
      elbowL: { x: -0.4 }, elbowR: { x: -0.4 }, bodyPitch: -0.1, snap: 10,
    } : {               // falling: legs pedal, arms wheel
      legL: { x: 0.5 }, legR: { x: -0.4 }, kneeL: { x: 0.9 }, kneeR: { x: 1.1 },
      armL: { x: -2.9, z: 0.6 }, armR: { x: -2.9, z: -0.6 },
      elbowL: { x: -0.5 }, elbowR: { x: -0.5 }, bodyPitch: 0.12, snap: 8,
    };
  }

  _poseVault() {
    return {
      legL: { x: -1.2, z: -0.5 }, legR: { x: -1.6, z: -0.7 },
      kneeL: { x: 2.3 }, kneeR: { x: 2.5 },
      armL: { x: -1.2, z: 0.9 }, armR: { x: 1.1, z: -0.4 },
      elbowL: { x: -0.3 }, elbowR: { x: -0.6 },
      bodyRoll: 0.5, bodyPitch: 0.35, snap: 20,
    };
  }

  _poseGrind(t) {
    const wob = Math.sin(t * 9) * 0.06;
    return {
      legL: { x: -0.7 }, legR: { x: 0.25 }, kneeL: { x: 1.7 }, kneeR: { x: 0.9 },
      armL: { x: -0.5, z: 1.15 + wob }, armR: { x: -0.5, z: -1.15 + wob },
      elbowL: { x: -0.2 }, elbowR: { x: -0.2 },
      bodyY: -0.3, bodyPitch: 0.18, bodyRoll: wob, snap: 10,
    };
  }

  _poseStumble(t) {
    const w = Math.sin(t * 26);
    return {
      legL: { x: 0.5 + w * 0.3 }, legR: { x: -0.5 - w * 0.3 },
      kneeL: { x: 0.8 }, kneeR: { x: 0.8 },
      armL: { x: -2.4 + w * 0.7, z: 0.9 }, armR: { x: -2.4 - w * 0.7, z: -0.9 },
      elbowL: { x: -0.3 }, elbowR: { x: -0.3 },
      bodyPitch: 0.32, bodyRoll: w * 0.14, snap: 16,
    };
  }

  _poseIdle(t) {
    const b = Math.sin(t * 2.4) * 0.04;
    return {
      legL: { x: 0.04 }, legR: { x: -0.04 }, kneeL: { x: 0.08 }, kneeR: { x: 0.08 },
      armL: { x: 0.12 + b, z: 0.16 }, armR: { x: -0.12 - b, z: -0.16 },
      elbowL: { x: -0.35 }, elbowR: { x: -0.35 },
      bodyY: b * 0.5, snap: 6,
    };
  }

  _poseWin(t) {
    const hop = Math.abs(Math.sin(t * 5));
    return {
      legL: { x: -0.2 }, legR: { x: 0.2 }, kneeL: { x: 0.5 * hop }, kneeR: { x: 0.5 * hop },
      armL: { x: -3, z: 0.5 }, armR: { x: -3, z: -0.5 },
      elbowL: { x: -0.25 }, elbowR: { x: -0.25 },
      bodyY: hop * 0.28, snap: 10,
    };
  }

  _poseLose() {
    return {
      legL: { x: 0.05 }, legR: { x: -0.05 }, kneeL: { x: 0.15 }, kneeR: { x: 0.15 },
      armL: { x: 0.35, z: 0.05 }, armR: { x: 0.35, z: -0.05 },
      elbowL: { x: -0.1 }, elbowR: { x: -0.1 },
      bodyPitch: 0.5, bodyY: -0.12, snap: 5,
    };
  }
}

function lerpRot(obj, target, k) {
  if (!target) return;
  obj.rotation.x += (((target.x ?? 0) - obj.rotation.x)) * k;
  obj.rotation.y += (((target.y ?? 0) - obj.rotation.y)) * k;
  obj.rotation.z += (((target.z ?? 0) - obj.rotation.z)) * k;
}

function makeNameSprite(text, color) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.font = '900 34px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeText(text, 128, 32);
  ctx.fillStyle = '#' + new THREE.Color(color).multiplyScalar(1.15).getHexString();
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 2;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(1.9, 0.475, 1);
  sp.renderOrder = 5;
  return sp;
}
