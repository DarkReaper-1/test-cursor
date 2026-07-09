/* =============================================================================
   player.js — the original hero, movement state machine & procedural animation
   -----------------------------------------------------------------------------
   The player is a fully ORIGINAL character ("Skyline Drifter"): a masked hero in
   a red-and-blue suit built entirely from primitive meshes — no imported models,
   textures, names or likenesses from any existing franchise.

   Capabilities implemented here:
     • Sprint / walk / idle ground movement (camera-relative).
     • Jump with coyote time + variable air control.
     • Wall-run (along a facade) and wall-climb (up a facade).
     • Roll on landing after a long fall.
     • Parkour: vault low obstacles, auto ledge-climb onto rooftops.
     • Physics web-swing: fire at buildings only, rope tension, momentum,
       release-to-launch, and smooth swing chaining.
     • Web-zip: rapid pull toward an aimed surface.
     • Combat: punch combo, air attack, dodge, web projectile.
     • Procedural skeletal animation with weight-blended poses (animation
       blending) so transitions between states look fluid.

   Rendering-agnostic math is delegated to physics.js.
   ============================================================================= */

import * as THREE from 'three';
import {
  GRAVITY, MAX_FALL_SPEED, AIR_DRAG, GROUND_FRICTION,
  clamp, damp, resolveCapsule, raycastBoxes, solveRope, ContactInfo,
} from './physics.js';

/* Movement tuning. */
const WALK_SPEED = 9;
const SPRINT_SPEED = 20;
const AIR_ACCEL = 26;
const GROUND_ACCEL = 70;
const JUMP_VELOCITY = 15.5;
const WALLRUN_SPEED = 22;
const WALLRUN_GRAVITY = 6;      // reduced gravity while wall-running
const CLIMB_SPEED = 6.5;
const COYOTE_TIME = 0.12;
const ROLL_FALL_SPEED = 34;     // impact speed that triggers a landing roll
const CAP_RADIUS = 1.1;
const CAP_HEIGHT = 3.6;

/* ---------------------------------------------------------------------------
   Pose system
   Each pose is a set of target Euler angles / offsets for the hero's limbs.
   We blend the active poses by weight every frame, then add procedural motion
   (e.g. leg cycling while running) on top. This is "animation blending" without
   needing baked clips.
   --------------------------------------------------------------------------- */
function pose(vals) {
  return Object.assign({
    torsoPitch: 0, torsoRoll: 0,
    headPitch: 0,
    armLU: 0, armLF: 0,   // left upper/forearm pitch
    armRU: 0, armRF: 0,
    armSpread: 0.18,      // shoulder abduction (arms out to side)
    legLU: 0, legLF: 0,   // left thigh/shin pitch
    legRU: 0, legRF: 0,
    crouch: 0,            // lowers the whole rig
  }, vals);
}

const POSES = {
  idle:    pose({ armLU: 0.1, armRU: 0.1, headPitch: 0.02 }),
  run:     pose({ torsoPitch: 0.22, armSpread: 0.12 }),
  sprint:  pose({ torsoPitch: 0.42, armSpread: 0.08 }),
  jump:    pose({ torsoPitch: 0.15, armLU: -1.9, armRU: -1.9, legLU: 0.7, legRU: -0.3, armSpread: 0.5 }),
  fall:    pose({ torsoPitch: 0.1, armLU: -2.3, armRU: -2.3, armSpread: 0.7, legLU: 0.3, legRU: -0.3 }),
  swing:   pose({ torsoPitch: 0.35, armRU: -2.7, armRF: -0.2, armLU: -0.6, legLU: 0.6, legRU: -0.8, armSpread: 0.25 }),
  climb:   pose({ torsoPitch: 0.0, armLU: -2.6, armRU: -2.6, legLU: 0.5, legRU: -0.5, armSpread: 0.35 }),
  wallrun: pose({ torsoRoll: 0.4, torsoPitch: 0.3, armLU: -1.6, armRU: -1.2, legLU: 0.8, legRU: -0.9 }),
  roll:    pose({ crouch: 1.5, torsoPitch: 1.4, armLU: -1.0, armRU: -1.0, legLU: 1.6, legRU: 1.6 }),
  punch:   pose({ torsoPitch: 0.2, torsoRoll: -0.2, armRU: -1.4, armRF: -0.1, armLU: -0.4 }),
  air:     pose({ torsoPitch: 0.5, armRU: -2.2, legLU: 0.9, legRU: 0.6 }),
  dodge:   pose({ crouch: 0.8, torsoRoll: 0.5, armLU: -0.8, armRU: -0.8 }),
};

/**
 * Build the hero mesh hierarchy and return handles to the animated parts.
 */
function buildHero() {
  const root = new THREE.Group();

  const red = new THREE.MeshStandardMaterial({ color: 0xd11f2a, roughness: 0.45, metalness: 0.15 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1f47c4, roughness: 0.5, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141821, roughness: 0.6 });
  const eye = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, emissive: 0xbcd4ff, emissiveIntensity: 0.6, roughness: 0.3 });

  // Pelvis/torso pivot sits at ~1.7m; the group's own origin is at the feet.
  const rig = new THREE.Group();
  rig.position.y = 0;
  root.add(rig);

  // Torso
  const torso = new THREE.Group();
  torso.position.y = 2.0;
  rig.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 0.9, 4, 10), red);
  chest.castShadow = true;
  torso.add(chest);
  // Blue emblem panel on the chest (original: a stylised diamond).
  const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), blue);
  emblem.scale.set(1, 1.6, 0.3);
  emblem.position.set(0, 0.15, 0.58);
  torso.add(emblem);

  // Head
  const head = new THREE.Group();
  head.position.y = 1.0;
  torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), red);
  skull.castShadow = true;
  head.add(skull);
  const maskL = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), eye);
  maskL.scale.set(1.3, 0.8, 0.6);
  maskL.position.set(-0.17, 0.05, 0.34);
  head.add(maskL);
  const maskR = maskL.clone();
  maskR.position.x = 0.17;
  head.add(maskR);

  // Helper to create a two-segment limb (upper + fore/lower) with pivots.
  function makeLimb(mat, upperLen, lowerLen, thick) {
    const upper = new THREE.Group();
    const upperMesh = new THREE.Mesh(new THREE.CapsuleGeometry(thick, upperLen, 4, 8), mat);
    upperMesh.position.y = -upperLen / 2 - thick / 2;
    upperMesh.castShadow = true;
    upper.add(upperMesh);

    const lower = new THREE.Group();
    lower.position.y = -upperLen - thick;
    upper.add(lower);
    const lowerMesh = new THREE.Mesh(new THREE.CapsuleGeometry(thick * 0.85, lowerLen, 4, 8), mat);
    lowerMesh.position.y = -lowerLen / 2 - thick / 2;
    lowerMesh.castShadow = true;
    lower.add(lowerMesh);

    return { upper, lower };
  }

  // Arms (attached near shoulders)
  const armL = makeLimb(blue, 0.7, 0.7, 0.2);
  armL.upper.position.set(-0.72, 0.7, 0);
  torso.add(armL.upper);
  const armR = makeLimb(blue, 0.7, 0.7, 0.2);
  armR.upper.position.set(0.72, 0.7, 0);
  torso.add(armR.upper);
  // Hands (web emitters)
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), red);
  handL.position.y = -0.8;
  armL.lower.add(handL);
  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), red);
  handR.position.y = -0.8;
  armR.lower.add(handR);

  // Legs (attached at pelvis)
  const legL = makeLimb(red, 0.85, 0.85, 0.24);
  legL.upper.position.set(-0.32, 0, 0);
  rig.add(legL.upper);
  legL.upper.position.y = 1.05;
  const legR = makeLimb(red, 0.85, 0.85, 0.24);
  legR.upper.position.set(0.32, 0, 0);
  legR.upper.position.y = 1.05;
  rig.add(legR.upper);
  // Boots
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.5), blue);
  bootL.position.set(0, -0.95, 0.1);
  legL.lower.add(bootL);
  const bootR = bootL.clone();
  legR.lower.add(bootR);

  return {
    root, rig, torso, head,
    armL, armR, legL, legR, handL, handR,
  };
}

export class Player {
  /**
   * @param {THREE.Scene} scene
   * @param {{hash:import('./physics.js').SpatialHash}} world
   */
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    this.hero = buildHero();
    scene.add(this.hero.root);

    // Kinematics (feet position).
    this.pos = new THREE.Vector3(0, 80, 0);
    this.vel = new THREE.Vector3();
    this.facing = 0;                 // yaw the model faces (radians)

    // State machine string: grounded | air | wallrun | climb | swing | roll
    this.state = 'air';
    this.contact = new ContactInfo();
    this._nearBoxes = [];
    this.coyote = 0;
    this.timeInState = 0;

    // Web / rope
    this.web = { active: false, anchor: new THREE.Vector3(), length: 0, hand: 'R' };
    this.zipTarget = null;
    this.zipTime = 0;

    // Combat
    this.comboCount = 0;
    this.comboTimer = 0;
    this.attackTimer = 0;
    this.dodgeTimer = 0;

    // Landing / roll bookkeeping.
    this.lastFallSpeed = 0;
    this.rollTimer = 0;

    // Animation blend weights (per pose name).
    this.blend = {};
    for (const k in POSES) this.blend[k] = 0;
    this.blend.idle = 1;
    this.cycle = 0;                  // run/climb cycle phase

    // Visuals for the web line + projectiles.
    this._initWebVisuals();
    this.projectiles = [];

    // Scratch.
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._aim = new THREE.Vector3();
    this._wish = new THREE.Vector3();
  }

  /* --------------------------------------------------------------------- */
  _initWebVisuals() {
    // A thin cylinder stretched between hand and anchor represents the web.
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
    geo.translate(0, -0.5, 0); // pivot at top so we can scale length downward
    this.webMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    this.webMesh = new THREE.Mesh(geo, this.webMat);
    this.webMesh.visible = false;
    this.scene.add(this.webMesh);

    // Small marker where a web anchors (nice feedback).
    this.anchorMark = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    this.anchorMark.visible = false;
    this.scene.add(this.anchorMark);
  }

  /** Horizontal speed (m/s), used by the HUD and animation intensity. */
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }

  /* =====================================================================
     Main per-frame update
     ===================================================================== */
  update(dt, input, camera) {
    dt = Math.min(dt, 0.033); // clamp for stability on frame hitches
    this.timeInState += dt;
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.comboCount = 0;
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);

    camera.getForward(this._fwd);
    camera.getRight(this._right);
    camera.getAim(this._aim);

    // Refresh nearby collision boxes once per frame.
    this.world.hash.query(this.pos.x, this.pos.z, 2, this._nearBoxes);

    // Handle web fire/release regardless of state (can swing from ground/air).
    this._handleWebInput(input);
    this._handleZipInput(input);
    this._handleCombat(input, dt);

    // Dispatch to the active locomotion state.
    switch (this.state) {
      case 'grounded': this._updateGrounded(dt, input); break;
      case 'air':      this._updateAir(dt, input); break;
      case 'wallrun':  this._updateWallrun(dt, input); break;
      case 'climb':    this._updateClimb(dt, input); break;
      case 'swing':    this._updateSwing(dt, input); break;
      case 'roll':     this._updateRoll(dt, input); break;
    }

    this._integrateAndCollide(dt);
    this._updateProjectiles(dt);
    this._updateAnimation(dt, input);
    this._updateWebVisual();
  }

  /* =====================================================================
     Locomotion states
     ===================================================================== */

  /** Build the desired horizontal move vector from input & camera basis. */
  _wishDir(input) {
    this._wish.set(0, 0, 0);
    this._wish.addScaledVector(this._fwd, input.forward);
    this._wish.addScaledVector(this._right, input.right);
    if (this._wish.lengthSq() > 1) this._wish.normalize();
    return this._wish;
  }

  _updateGrounded(dt, input) {
    const wish = this._wishDir(input);
    const maxSpeed = input.sprint ? SPRINT_SPEED : WALK_SPEED;

    // Accelerate toward wish velocity.
    const targetVX = wish.x * maxSpeed;
    const targetVZ = wish.z * maxSpeed;
    this.vel.x = damp(this.vel.x, targetVX, GROUND_ACCEL / maxSpeed * 2, dt);
    this.vel.z = damp(this.vel.z, targetVZ, GROUND_ACCEL / maxSpeed * 2, dt);

    // Friction when no input.
    if (wish.lengthSq() < 0.01) {
      const f = Math.max(0, 1 - GROUND_FRICTION * dt);
      this.vel.x *= f; this.vel.z *= f;
    }

    // Face movement direction.
    if (this.speed > 0.5) this.facing = Math.atan2(this.vel.x, this.vel.z);

    this.coyote = COYOTE_TIME;

    // Jump.
    if (input.jumpPressed) {
      this.vel.y = JUMP_VELOCITY;
      this._enter('air');
      return;
    }

    // Vault / ledge detection when running at a wall.
    if (this._tryParkour(input)) return;
  }

  _updateAir(dt, input) {
    const wish = this._wishDir(input);

    // Air control: accelerate but cap added speed so you can steer, not sprint.
    this.vel.x += wish.x * AIR_ACCEL * dt;
    this.vel.z += wish.z * AIR_ACCEL * dt;

    // Gentle air drag.
    const drag = Math.max(0, 1 - AIR_DRAG);
    this.vel.x *= drag; this.vel.z *= drag;

    this.vel.y -= GRAVITY * dt;
    if (this.vel.y < -MAX_FALL_SPEED) this.vel.y = -MAX_FALL_SPEED;

    if (this.speed > 1) this.facing = damp(this.facing, Math.atan2(this.vel.x, this.vel.z), 8, dt);

    this.coyote = Math.max(0, this.coyote - dt);

    // Coyote-time jump just after leaving a ledge.
    if (input.jumpPressed && this.coyote > 0) {
      this.vel.y = JUMP_VELOCITY;
      this.coyote = 0;
    }

    // Look for a wall to run/climb on when pressing toward it.
    this._tryWallContactStart(input);

    this.lastFallSpeed = -this.vel.y;
  }

  _updateWallrun(dt, input) {
    // Verify we still have a wall beside us; otherwise fall.
    const n = this.contact.wallNormal;
    if (!this.contact.touchingWall || this.timeInState > 1.6) {
      this._enter('air');
      // Small outward hop when the wall-run ends.
      this.vel.addScaledVector(n, 4);
      this.vel.y = Math.max(this.vel.y, 6);
      return;
    }

    // Move along the wall (tangent = wall normal rotated 90° around Y), biased
    // by the player's forward input so they run the way they look.
    const tangent = new THREE.Vector3(-n.z, 0, n.x);
    if (tangent.dot(this._fwd) < 0) tangent.multiplyScalar(-1);

    this.vel.x = damp(this.vel.x, tangent.x * WALLRUN_SPEED, 10, dt);
    this.vel.z = damp(this.vel.z, tangent.z * WALLRUN_SPEED, 10, dt);
    this.vel.y -= WALLRUN_GRAVITY * dt; // reduced gravity — you can run a while

    // Hold jump to climb up the wall instead of running along it.
    if (input.climb && input.forward > 0.1) {
      this.vel.y = Math.max(this.vel.y, CLIMB_SPEED);
    }

    this.facing = Math.atan2(tangent.x, tangent.z);

    // Wall-jump: leap off the wall.
    if (input.jumpPressed) {
      this.vel.addScaledVector(n, 12);
      this.vel.y = JUMP_VELOCITY;
      this._enter('air');
    }
  }

  _updateClimb(dt, input) {
    if (!this.contact.touchingWall) { this._enter('air'); return; }
    const n = this.contact.wallNormal;

    // Vertical climbing controlled by W/S; strafe by A/D along the wall.
    const tangent = new THREE.Vector3(-n.z, 0, n.x);
    this.vel.x = damp(this.vel.x, tangent.x * input.right * CLIMB_SPEED - n.x * 2, 12, dt);
    this.vel.z = damp(this.vel.z, tangent.z * input.right * CLIMB_SPEED - n.z * 2, 12, dt);
    this.vel.y = input.forward * CLIMB_SPEED;

    this.facing = Math.atan2(-n.x, -n.z);

    // Reached the top? Auto mantle onto the roof.
    if (input.forward > 0.1 && this._tryMantle()) return;

    // Jump off the wall.
    if (input.jumpPressed) {
      this.vel.addScaledVector(n, 10);
      this.vel.y = JUMP_VELOCITY;
      this._enter('air');
    }
    // Let go.
    if (!input.climb) { this._enter('air'); this.vel.addScaledVector(n, 3); }
  }

  _updateSwing(dt, input) {
    const wish = this._wishDir(input);

    // Gravity pulls; the rope constraint (applied in integrate) converts the
    // fall into an arc. Player can pump the swing with forward input.
    this.vel.y -= GRAVITY * dt;
    this.vel.addScaledVector(wish, 12 * dt);

    // Reel the rope in/out slightly for control (shorten to gain speed).
    if (input.forward > 0.1) this.web.length = Math.max(6, this.web.length - 14 * dt);
    if (input.forward < -0.1) this.web.length += 14 * dt;

    this.facing = damp(this.facing, Math.atan2(this.vel.x, this.vel.z), 6, dt);

    // Release to launch: keep all momentum (rope no longer constrains).
    if (input.swingReleased || !this.web.active) {
      this._releaseWeb();
      this._enter('air');
      // A little upward kick at release for that satisfying fling.
      this.vel.y += 2.5;
    }
  }

  _updateRoll(dt, input) {
    // Preserve forward momentum, decay over the roll, then stand up.
    this.rollTimer -= dt;
    const f = Math.max(0, 1 - 3 * dt);
    this.vel.x *= f; this.vel.z *= f;
    if (this.rollTimer <= 0) this._enter('grounded');
  }

  /* =====================================================================
     Parkour helpers: vault + ledge mantle
     ===================================================================== */

  /** If running into a low obstacle, vault over it. Returns true if handled. */
  _tryParkour(input) {
    if (input.forward <= 0.1 && this.speed < WALK_SPEED * 0.6) return false;
    // Probe forward for a wall.
    const dir = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    const origin = this.pos.clone(); origin.y += 1.0;
    const hit = raycastBoxes(origin, dir, CAP_RADIUS + 1.4, this._nearBoxes);
    if (!hit) return false;

    const ledgeY = hit.box.maxY;
    const rel = ledgeY - this.pos.y;
    // Low obstacle -> vault; medium ledge -> mantle up.
    if (rel > 0.6 && rel < 2.6) {
      this.pos.y = ledgeY + 0.05;
      this.vel.y = 6;
      this.vel.addScaledVector(dir, 6);
      this._enter('air');
      return true;
    }
    return false;
  }

  /** When climbing, if the hands reach above the roof edge, pull up. */
  _tryMantle() {
    const dir = new THREE.Vector3(-this.contact.wallNormal.x, 0, -this.contact.wallNormal.z);
    const headTop = this.pos.y + CAP_HEIGHT;
    // Find the wall box in front and check its top.
    const origin = this.pos.clone(); origin.y = headTop;
    const hit = raycastBoxes(origin, dir, CAP_RADIUS + 0.8, this._nearBoxes);
    if (!hit && this.contact.groundY < this.pos.y) {
      // Nothing at head height -> the top is below us; mantle onto the roof.
      // Snap forward and up.
      this.pos.addScaledVector(dir, CAP_RADIUS + 0.6);
      this.vel.set(dir.x * 4, 4, dir.z * 4);
      this._enter('air');
      return true;
    }
    return false;
  }

  _tryWallContactStart(input) {
    if (!this.contact.touchingWall) return;
    const n = this.contact.wallNormal;
    const intoWall = -(this._fwd.x * n.x + this._fwd.z * n.z); // >0 means pressing in
    const movingUp = this.vel.y > -2;

    // Press toward wall + look up-ish while rising/level => climb.
    if (input.climb && input.forward > 0.2 && intoWall > 0.2) {
      this._enter('climb');
      return;
    }
    // Moving fast along the wall => wall-run.
    if (this.speed > WALK_SPEED && intoWall > 0.05 && this.pos.y > 2) {
      this._enter('wallrun');
    }
  }

  /* =====================================================================
     Web swing & zip
     ===================================================================== */

  _handleWebInput(input) {
    if (input.swingPressed && this.state !== 'swing') {
      const anchor = this._findWebAnchor();
      if (anchor) {
        this.web.active = true;
        this.web.anchor.copy(anchor.point);
        this.web.length = this.pos.clone().sub(anchor.point).length() * 0.92;
        this.web.length = Math.max(8, this.web.length);
        this.anchorMark.position.copy(anchor.point);
        this.anchorMark.visible = true;
        this._enter('swing');
      }
    }
  }

  _handleZipInput(input) {
    if (input.zipPressed) {
      const anchor = this._findWebAnchor(500);
      if (anchor) {
        this.zipTarget = anchor.point.clone();
        this.zipTime = 0.55;
        this.anchorMark.position.copy(anchor.point);
        this.anchorMark.visible = true;
      }
    }
    if (this.zipTarget) {
      // Pull rapidly toward the target for a short window.
      const to = this.zipTarget.clone().sub(this.pos);
      const d = to.length();
      if (d < 4 || this.zipTime <= 0) {
        this.zipTarget = null;
        // Convert pull into forward momentum on arrival.
        this.vel.multiplyScalar(0.6);
        this.state === 'swing' && this._releaseWeb();
      } else {
        to.normalize();
        const pull = 95;
        this.vel.x = to.x * pull;
        this.vel.y = to.y * pull;
        this.vel.z = to.z * pull;
        this.facing = Math.atan2(to.x, to.z);
        if (this.state !== 'air') this._enter('air');
      }
    }
  }

  /**
   * Fire a probe from the camera aim and return the nearest building hit within
   * range — webs attach to BUILDINGS ONLY (never the ground/sky).
   */
  _findWebAnchor(maxDist = 220) {
    // Fire from roughly the chest, along the aim direction.
    const origin = this.pos.clone(); origin.y += 2.4;
    const hit = raycastBoxes(origin, this._aim, maxDist, this._nearBoxesWide());
    if (!hit) return null;
    // Reject near-horizontal hits on the ground plane (there are none, but keep
    // the anchor above the player for a usable swing).
    if (hit.point.y < this.pos.y - 4) return null;
    return hit;
  }

  /** Web anchoring wants a wider search than movement collision. */
  _nearBoxesWide() {
    this.world.hash.query(this.pos.x, this.pos.z, 4, this._nearBoxes);
    return this._nearBoxes;
  }

  _releaseWeb() {
    this.web.active = false;
    this.webMesh.visible = false;
    this.anchorMark.visible = false;
  }

  /* =====================================================================
     Combat
     ===================================================================== */
  _handleCombat(input, dt) {
    // Dodge (works on ground and in air).
    if (input.dodgePressed && this.dodgeTimer === 0) {
      this.dodgeTimer = 0.45;
      const wish = this._wishDir(input);
      const dir = wish.lengthSq() > 0.01 ? wish : this._fwd;
      this.vel.x = dir.x * 26;
      this.vel.z = dir.z * 26;
      if (this.state === 'grounded') this.vel.y = 3;
    }

    // Punch / air attack.
    if (input.attackPressed && this.attackTimer === 0) {
      this.attackTimer = 0.3;
      this.comboCount = Math.min(this.comboCount + 1, 3);
      this.comboTimer = 1.0;
      // A short forward lunge sells the hit.
      const lunge = this.state === 'air' ? 6 : 9;
      this.vel.addScaledVector(this._fwd, lunge);
      if (this.state === 'air') this.vel.y -= 4; // air attack drives downward
    }

    // Web projectile.
    if (input.webPressed) this._fireProjectile();
  }

  _fireProjectile() {
    const geo = new THREE.SphereGeometry(0.28, 8, 6);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const origin = this.pos.clone(); origin.y += 2.4;
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      vel: this._aim.clone().multiplyScalar(120),
      life: 1.6,
    });
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.vel.y -= GRAVITY * 0.3 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      // Remove on timeout or when it strikes a building/ground.
      const hitGround = p.mesh.position.y <= 0;
      let hitBox = false;
      this.world.hash.query(p.mesh.position.x, p.mesh.position.z, 1, this._nearBoxes);
      for (const b of this._nearBoxes) {
        if (p.mesh.position.x > b.minX && p.mesh.position.x < b.maxX &&
            p.mesh.position.z > b.minZ && p.mesh.position.z < b.maxZ &&
            p.mesh.position.y > b.minY && p.mesh.position.y < b.maxY) { hitBox = true; break; }
      }
      if (p.life <= 0 || hitGround || hitBox) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  /* =====================================================================
     Integration + collision + landing logic
     ===================================================================== */
  _integrateAndCollide(dt) {
    // Apply rope constraint BEFORE moving so the swing arc is stable.
    if (this.state === 'swing' && this.web.active) {
      // Predict next position, then solve the rope on it.
      this.pos.addScaledVector(this.vel, dt);
      const applied = solveRope(this.pos, this.vel, this.web.anchor, this.web.length, 1.0);
      if (!applied) {
        // Went slack — behave like free air but stay in swing until release.
      }
    } else {
      this.pos.addScaledVector(this.vel, dt);
    }

    const wasAir = (this.state === 'air' || this.state === 'swing');

    resolveCapsule(this.pos, this.vel, CAP_RADIUS, CAP_HEIGHT, this._nearBoxes, this.contact);

    // Landing transitions.
    if (this.contact.grounded && (this.state === 'air')) {
      if (this.lastFallSpeed > ROLL_FALL_SPEED) {
        // Hard landing -> roll to preserve some momentum.
        this._enter('roll');
        this.rollTimer = 0.55;
      } else {
        this._enter('grounded');
      }
    } else if (this.contact.grounded && this.state !== 'roll' && this.state !== 'swing') {
      this.state = 'grounded';
    } else if (!this.contact.grounded && this.state === 'grounded') {
      // Walked off an edge.
      this._enter('air');
      this.coyote = COYOTE_TIME;
    }

    // Track fall speed for the next landing test.
    if (!this.contact.grounded) this.lastFallSpeed = Math.max(this.lastFallSpeed, -this.vel.y);
    if (this.contact.grounded) this.lastFallSpeed = 0;
  }

  _enter(state) {
    if (this.state === state) return;
    this.state = state;
    this.timeInState = 0;
    if (state !== 'swing') { /* keep web visuals off unless swinging */ }
  }

  /* =====================================================================
     Procedural animation with pose blending
     ===================================================================== */
  _updateAnimation(dt, input) {
    // Decide the dominant pose(s) for the current state.
    const w = this.blend;
    // Decay all weights, then raise the active ones — this creates smooth
    // cross-fades (animation blending) whenever the state changes.
    const targets = {};
    for (const k in POSES) targets[k] = 0;

    const moving = this.speed > 1.5;
    switch (this.state) {
      case 'grounded':
        if (!moving) targets.idle = 1;
        else if (input.sprint) { targets.sprint = 1; }
        else targets.run = 1;
        break;
      case 'air':
        targets[this.vel.y > 1 ? 'jump' : 'fall'] = 1;
        break;
      case 'wallrun': targets.wallrun = 1; break;
      case 'climb': targets.climb = 1; break;
      case 'swing': targets.swing = 1; break;
      case 'roll': targets.roll = 1; break;
    }
    // Combat overlays.
    if (this.attackTimer > 0.05) targets[this.state === 'air' ? 'air' : 'punch'] = 1;
    if (this.dodgeTimer > 0.2) targets.dodge = 1;

    for (const k in POSES) w[k] = damp(w[k], targets[k], 16, dt);

    // Blend pose channels by weight.
    const out = pose({});
    let total = 0;
    for (const k in POSES) {
      const wt = w[k];
      if (wt < 0.001) continue;
      total += wt;
      const p = POSES[k];
      for (const ch in out) out[ch] += p[ch] * wt;
    }
    if (total > 0.0001) for (const ch in out) out[ch] /= total;

    // Procedural locomotion cycle (legs/arms swinging) layered on ground states.
    const speedN = clamp(this.speed / SPRINT_SPEED, 0, 1);
    if (this.state === 'grounded' && moving) {
      this.cycle += dt * (6 + speedN * 10);
      const s = Math.sin(this.cycle) * (0.5 + speedN * 0.6);
      const c = Math.sin(this.cycle + Math.PI) * (0.5 + speedN * 0.6);
      out.legLU += s; out.legRU += c;
      out.legLF += Math.max(0, -s) * 0.8; out.legRF += Math.max(0, -c) * 0.8;
      out.armLU += c * 0.5; out.armRU += s * 0.5;
    } else if (this.state === 'climb') {
      this.cycle += dt * 6;
      const s = Math.sin(this.cycle);
      out.armLU += s * 0.4; out.armRU += -s * 0.4;
      out.legLU += -s * 0.4; out.legRU += s * 0.4;
    } else if (this.state === 'roll') {
      // Spin the torso through the roll for a tumble effect.
      out.torsoPitch += (0.55 - this.rollTimer) * 8;
    }

    this._applyPose(out, dt);

    // Orient + place the model. Feet at pos; face movement/aim.
    const h = this.hero;
    h.root.position.copy(this.pos);
    // While swinging or aiming a web, face toward the anchor for readability.
    let targetFacing = this.facing;
    h.root.rotation.y = damp(h.root.rotation.y, targetFacing, 12, dt);

    // Crouch offset lowers the rig (roll/dodge/land).
    h.rig.position.y = -out.crouch * 0.5;
  }

  /** Write blended pose channels onto the rig bones. */
  _applyPose(p, dt) {
    const h = this.hero;
    h.torso.rotation.x = p.torsoPitch;
    h.torso.rotation.z = p.torsoRoll;
    h.head.rotation.x = p.headPitch;

    h.armL.upper.rotation.x = p.armLU;
    h.armL.upper.rotation.z = p.armSpread;
    h.armL.lower.rotation.x = p.armLF;
    h.armR.upper.rotation.x = p.armRU;
    h.armR.upper.rotation.z = -p.armSpread;
    h.armR.lower.rotation.x = p.armRF;

    h.legL.upper.rotation.x = p.legLU;
    h.legL.lower.rotation.x = p.legLF;
    h.legR.upper.rotation.x = p.legRU;
    h.legR.lower.rotation.x = p.legRF;

    // While swinging, point the active hand's arm at the anchor.
    if (this.state === 'swing' && this.web.active) {
      h.armR.upper.rotation.x = -2.6;
      h.armR.upper.rotation.z = -0.1;
    }
  }

  /** Stretch the web cylinder from the hero's hand to the anchor. */
  _updateWebVisual() {
    if (this.state === 'swing' && this.web.active) {
      const hand = new THREE.Vector3();
      this.hero.handR.getWorldPosition(hand);
      const to = this.web.anchor.clone().sub(hand);
      const len = to.length();
      this.webMesh.visible = true;
      this.webMesh.position.copy(hand);
      this.webMesh.scale.set(1, len, 1);
      // Orient the +Y cylinder along `to`.
      this.webMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), to.normalize(),
      );
      this.anchorMark.visible = true;
    } else if (!this.zipTarget) {
      this.webMesh.visible = false;
      this.anchorMark.visible = false;
    }
  }
}
