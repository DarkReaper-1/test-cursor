import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Weighted procedural animation keeps the hero expressive without relying on
 * external or copyrighted character assets. Every state contributes a pose;
 * exponentially-smoothed weights blend between poses without abrupt snaps.
 */
class ProceduralAnimator {
  constructor(player, bones) {
    this.player = player;
    this.bones = bones;
    this.time = 0;
    this.weights = {
      idle: 1,
      run: 0,
      air: 0,
      swing: 0,
      wall: 0,
      attack: 0,
      roll: 0,
      dodge: 0,
    };
  }

  update(dt) {
    this.time += dt;
    const player = this.player;
    const action = player.action?.type;
    const speed = player.horizontalSpeed;
    const targets = {
      idle: Number(player.grounded && speed < 1.5 && !action),
      run: Number(player.grounded && speed >= 1.5 && !action),
      air: Number(!player.grounded && !player.webAttached && !player.wallMode && !action),
      swing: Number(player.webAttached && !action),
      wall: Number(player.wallMode && !action),
      attack: Number(action === "punch" || action === "air-attack"),
      roll: Number(action === "roll"),
      dodge: Number(action === "dodge"),
    };

    const blendRate = 1 - Math.exp(-dt * 13);
    for (const state of Object.keys(this.weights)) {
      this.weights[state] = THREE.MathUtils.lerp(this.weights[state], targets[state], blendRate);
    }

    const cycle = this.time * THREE.MathUtils.clamp(speed * 0.72, 4, 12);
    const actionPhase = player.action ? player.action.time / player.action.duration : 0;
    const poses = {
      idle: {
        torsoX: Math.sin(this.time * 2) * 0.025,
        torsoZ: 0,
        leftArmX: 0.08,
        rightArmX: -0.08,
        leftArmZ: -0.1,
        rightArmZ: 0.1,
        leftLegX: 0,
        rightLegX: 0,
        rootY: Math.sin(this.time * 2) * 0.018,
      },
      run: {
        torsoX: -0.2,
        torsoZ: Math.sin(cycle) * 0.06,
        leftArmX: Math.sin(cycle) * 0.9,
        rightArmX: -Math.sin(cycle) * 0.9,
        leftArmZ: -0.08,
        rightArmZ: 0.08,
        leftLegX: -Math.sin(cycle) * 0.82,
        rightLegX: Math.sin(cycle) * 0.82,
        rootY: Math.abs(Math.sin(cycle)) * 0.08,
      },
      air: {
        torsoX: -0.16,
        torsoZ: 0.08,
        leftArmX: -0.45,
        rightArmX: 0.24,
        leftArmZ: -0.55,
        rightArmZ: 0.55,
        leftLegX: 0.58,
        rightLegX: -0.35,
        rootY: 0,
      },
      swing: {
        torsoX: 0.12,
        torsoZ: Math.sin(this.time * 3) * 0.12,
        leftArmX: Math.PI - 0.35,
        rightArmX: Math.PI - 0.18,
        leftArmZ: -0.22,
        rightArmZ: 0.22,
        leftLegX: 0.45 + Math.sin(this.time * 3) * 0.2,
        rightLegX: -0.52,
        rootY: 0,
      },
      wall: {
        torsoX: -0.35,
        torsoZ: 0,
        leftArmX: Math.sin(cycle) * 0.62,
        rightArmX: -Math.sin(cycle) * 0.62,
        leftArmZ: -0.55,
        rightArmZ: 0.55,
        leftLegX: -Math.sin(cycle) * 0.55,
        rightLegX: Math.sin(cycle) * 0.55,
        rootY: Math.abs(Math.sin(cycle)) * 0.04,
      },
      attack: this.#attackPose(actionPhase, action),
      roll: {
        torsoX: actionPhase * Math.PI * 2,
        torsoZ: 0,
        leftArmX: 0.75,
        rightArmX: 0.75,
        leftArmZ: -0.45,
        rightArmZ: 0.45,
        leftLegX: 0.8,
        rightLegX: 0.8,
        rootY: -0.35,
      },
      dodge: {
        torsoX: -0.48,
        torsoZ: Math.sin(actionPhase * Math.PI) * 0.65,
        leftArmX: 0.72,
        rightArmX: 0.72,
        leftArmZ: -0.22,
        rightArmZ: 0.22,
        leftLegX: -0.55,
        rightLegX: 0.72,
        rootY: -Math.sin(actionPhase * Math.PI) * 0.22,
      },
    };

    const blended = {};
    const properties = Object.keys(poses.idle);
    let totalWeight = 0;
    for (const value of Object.values(this.weights)) totalWeight += value;
    totalWeight = Math.max(totalWeight, 0.001);
    for (const property of properties) {
      blended[property] = 0;
      for (const [state, weight] of Object.entries(this.weights)) {
        blended[property] += poses[state][property] * weight / totalWeight;
      }
    }

    const poseLerp = 1 - Math.exp(-dt * 18);
    this.bones.torso.rotation.x = THREE.MathUtils.lerp(this.bones.torso.rotation.x, blended.torsoX, poseLerp);
    this.bones.torso.rotation.z = THREE.MathUtils.lerp(this.bones.torso.rotation.z, blended.torsoZ, poseLerp);
    this.bones.leftArm.rotation.x = THREE.MathUtils.lerp(this.bones.leftArm.rotation.x, blended.leftArmX, poseLerp);
    this.bones.rightArm.rotation.x = THREE.MathUtils.lerp(this.bones.rightArm.rotation.x, blended.rightArmX, poseLerp);
    this.bones.leftArm.rotation.z = THREE.MathUtils.lerp(this.bones.leftArm.rotation.z, blended.leftArmZ, poseLerp);
    this.bones.rightArm.rotation.z = THREE.MathUtils.lerp(this.bones.rightArm.rotation.z, blended.rightArmZ, poseLerp);
    this.bones.leftLeg.rotation.x = THREE.MathUtils.lerp(this.bones.leftLeg.rotation.x, blended.leftLegX, poseLerp);
    this.bones.rightLeg.rotation.x = THREE.MathUtils.lerp(this.bones.rightLeg.rotation.x, blended.rightLegX, poseLerp);
    this.bones.visual.position.y = THREE.MathUtils.lerp(this.bones.visual.position.y, blended.rootY, poseLerp);
  }

  #attackPose(phase, type) {
    const snap = Math.sin(Math.min(1, phase * 1.6) * Math.PI);
    const recovery = Math.sin(phase * Math.PI);
    if (type === "air-attack") {
      return {
        torsoX: -0.75 * recovery,
        torsoZ: 0,
        leftArmX: 0.9,
        rightArmX: -1.9 * snap,
        leftArmZ: -0.35,
        rightArmZ: 0.2,
        leftLegX: -0.55,
        rightLegX: 1.15 * snap,
        rootY: 0,
      };
    }
    const alternate = this.player.comboStep === 2 ? -1 : 1;
    return {
      torsoX: -0.18,
      torsoZ: alternate * snap * 0.45,
      leftArmX: this.player.comboStep === 2 ? -1.65 * snap : 0.3,
      rightArmX: this.player.comboStep === 2 ? 0.3 : -1.65 * snap,
      leftArmZ: -0.18,
      rightArmZ: 0.18,
      leftLegX: this.player.comboStep === 3 ? -0.8 * snap : 0,
      rightLegX: this.player.comboStep === 3 ? 0.65 * snap : 0,
      rootY: 0,
    };
  }
}

/**
 * Player state, original procedural hero model, and action animation timing.
 * World-space movement is intentionally delegated to PhysicsSystem.
 */
export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "Astra Vale — Skyline Sentinel";
    this.visual = new THREE.Group();
    this.group.add(this.visual);
    this.scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.radius = 0.46;
    this.height = 1.82;
    this.grounded = false;
    this.wallMode = false;
    this.webAttached = false;
    this.wallNormal = new THREE.Vector3();
    this.facing = new THREE.Vector3(0, 0, 1);
    this.health = 100;
    this.action = null;
    this.comboStep = 0;
    this.lastPunchAt = -10;
    this.pendingStrike = null;
    this.invulnerable = 0;
    this.clock = 0;

    this.bones = this.#createModel();
    this.animator = new ProceduralAnimator(this, this.bones);
    this.webVisual = this.#createWebVisual();
  }

  get position() {
    return this.group.position;
  }

  get horizontalSpeed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  #createModel() {
    const suit = new THREE.MeshStandardMaterial({
      color: 0x0f827b,
      roughness: 0.5,
      metalness: 0.22,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x07151b,
      roughness: 0.66,
      metalness: 0.16,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xff7139,
      emissive: 0x8c1e08,
      emissiveIntensity: 0.8,
      roughness: 0.38,
    });
    const visor = new THREE.MeshStandardMaterial({
      color: 0xb9fff0,
      emissive: 0x2effd1,
      emissiveIntensity: 2.4,
      metalness: 0.4,
      roughness: 0.18,
    });

    const hips = new THREE.Group();
    hips.position.y = 0.77;
    this.visual.add(hips);
    const hipMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.2, 4, 8), dark);
    hipMesh.castShadow = true;
    hips.add(hipMesh);

    const torso = new THREE.Group();
    torso.position.y = 0.18;
    hips.add(torso);
    const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.56, 6, 10), suit);
    torsoMesh.position.y = 0.34;
    torsoMesh.scale.set(1, 1, 0.7);
    torsoMesh.castShadow = true;
    torso.add(torsoMesh);

    // The angular chest crest identifies Astra without borrowing an emblem.
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), accent);
    crest.position.set(0, 0.42, 0.255);
    crest.scale.set(0.72, 1.45, 0.28);
    torso.add(crest);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.18, 8), dark);
    neck.position.y = 0.78;
    torso.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 10), dark);
    head.position.y = 1.02;
    head.scale.set(0.9, 1.12, 0.92);
    head.castShadow = true;
    torso.add(head);

    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.075, 0.035), visor);
    visorMesh.position.set(0, 1.06, 0.211);
    visorMesh.rotation.x = -0.08;
    torso.add(visorMesh);

    const leftArm = this.#createLimb(-1, torso, suit, dark, true);
    const rightArm = this.#createLimb(1, torso, suit, dark, true);
    const leftLeg = this.#createLimb(-1, hips, dark, suit, false);
    const rightLeg = this.#createLimb(1, hips, dark, suit, false);

    // Thin luminous filaments along the suit communicate kinetic charge.
    const filamentGeometry = new THREE.BoxGeometry(0.025, 0.55, 0.018);
    for (const side of [-1, 1]) {
      const filament = new THREE.Mesh(filamentGeometry, accent);
      filament.position.set(side * 0.25, 0.36, 0.22);
      filament.rotation.z = side * -0.16;
      torso.add(filament);
    }

    return { visual: this.visual, hips, torso, leftArm, rightArm, leftLeg, rightLeg };
  }

  #createLimb(side, parent, upperMaterial, lowerMaterial, arm) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (arm ? 0.36 : 0.17), arm ? 0.63 : -0.03, 0);
    parent.add(pivot);

    const upper = new THREE.Mesh(
      new THREE.CapsuleGeometry(arm ? 0.095 : 0.12, arm ? 0.37 : 0.48, 4, 7),
      upperMaterial,
    );
    upper.position.y = arm ? -0.26 : -0.32;
    upper.castShadow = true;
    pivot.add(upper);

    const joint = new THREE.Group();
    joint.position.y = arm ? -0.52 : -0.66;
    pivot.add(joint);
    const lower = new THREE.Mesh(
      new THREE.CapsuleGeometry(arm ? 0.085 : 0.105, arm ? 0.32 : 0.42, 4, 7),
      lowerMaterial,
    );
    lower.position.y = arm ? -0.22 : -0.29;
    lower.castShadow = true;
    joint.add(lower);

    if (arm) {
      const gauntlet = new THREE.Mesh(
        new THREE.BoxGeometry(0.19, 0.15, 0.19),
        new THREE.MeshStandardMaterial({
          color: 0xff7139,
          emissive: 0x80220b,
          emissiveIntensity: 0.7,
        }),
      );
      gauntlet.position.y = -0.43;
      joint.add(gauntlet);
    }
    return pivot;
  }

  #createWebVisual() {
    const points = Array.from({ length: 12 }, () => new THREE.Vector3());
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x9cfff0,
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
    });
    const line = new THREE.Line(geometry, material);
    line.name = "Kinetic filament rope";
    line.frustumCulled = false;
    line.visible = false;
    this.scene.add(line);
    return line;
  }

  setPosition(position) {
    this.group.position.copy(position);
  }

  setFacing(direction, dt = 1 / 60) {
    if (direction.lengthSq() < 0.001) return;
    this.facing.copy(direction).setY(0).normalize();
    const targetYaw = Math.atan2(this.facing.x, this.facing.z);
    let delta = targetYaw - this.visual.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    this.visual.rotation.y += delta * (1 - Math.exp(-dt * 14));
  }

  startPunch(now) {
    if (this.action && this.action.type !== "punch") return false;
    if (this.action && this.action.time < this.action.duration * 0.72) return false;
    this.comboStep = now - this.lastPunchAt < 0.82 ? (this.comboStep % 3) + 1 : 1;
    this.lastPunchAt = now;
    this.action = {
      type: "punch",
      time: 0,
      duration: this.comboStep === 3 ? 0.48 : 0.36,
      hitTriggered: false,
    };
    return true;
  }

  startAirAttack() {
    if (this.action) return false;
    this.action = { type: "air-attack", time: 0, duration: 0.55, hitTriggered: false };
    return true;
  }

  startDodge() {
    if (this.action || !this.grounded) return false;
    this.action = { type: "dodge", time: 0, duration: 0.46, hitTriggered: true };
    this.invulnerable = 0.52;
    return true;
  }

  startRoll() {
    this.action = { type: "roll", time: 0, duration: 0.62, hitTriggered: true };
    this.invulnerable = Math.max(this.invulnerable, 0.4);
  }

  update(dt) {
    this.clock += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);

    if (this.action) {
      this.action.time += dt;
      const hitMoment = this.action.type === "air-attack" ? 0.38 : 0.42;
      if (!this.action.hitTriggered && this.action.time >= this.action.duration * hitMoment) {
        this.action.hitTriggered = true;
        this.pendingStrike = {
          type: this.action.type,
          comboStep: this.comboStep,
        };
      }
      if (this.action.time >= this.action.duration) this.action = null;
    }

    if (this.clock - this.lastPunchAt > 1.1 && !this.action) this.comboStep = 0;
    this.animator.update(dt);
  }

  consumeStrike() {
    const strike = this.pendingStrike;
    this.pendingStrike = null;
    return strike;
  }

  takeDamage(amount) {
    if (this.invulnerable > 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = 0.65;
    return true;
  }

  healFully() {
    this.health = 100;
    this.invulnerable = 1.2;
  }

  /**
   * Draw a segmented, slightly sagging line. Taut ropes straighten as tension
   * rises; this gives immediate visual feedback about when a swing is pulling.
   */
  showWeb(anchor, tension = 1, zip = false) {
    const start = this.position.clone().add(new THREE.Vector3(0, 1.25, 0));
    const attribute = this.webVisual.geometry.attributes.position;
    const segmentCount = attribute.count - 1;
    const sag = zip ? 0.02 : THREE.MathUtils.lerp(0.8, 0.04, THREE.MathUtils.clamp(tension, 0, 1));
    for (let index = 0; index <= segmentCount; index += 1) {
      const t = index / segmentCount;
      const point = start.clone().lerp(anchor, t);
      point.y -= Math.sin(t * Math.PI) * sag;
      attribute.setXYZ(index, point.x, point.y, point.z);
    }
    attribute.needsUpdate = true;
    this.webVisual.material.color.setHex(zip ? 0xff8b4a : 0x9cfff0);
    this.webVisual.visible = true;
  }

  hideWeb() {
    this.webVisual.visible = false;
  }
}

/**
 * Lightweight arena combat layered over traversal. Hovering security drones
 * are original procedural targets; they pressure the player without turning
 * the movement sandbox into a scripted story.
 */
export class CombatSystem {
  constructor(scene, city, notify) {
    this.scene = scene;
    this.city = city;
    this.notify = notify;
    this.enemies = [];
    this.projectiles = [];
    this.combo = 0;
    this.comboTimer = 0;
    this.elapsed = 0;
    this.#spawnDrones(12);
  }

  #spawnDrones(count) {
    for (let index = 0; index < count; index += 1) {
      const group = new THREE.Group();
      group.name = `Harbor training drone ${index + 1}`;
      const shell = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.52, 0),
        new THREE.MeshStandardMaterial({
          color: 0x303d48,
          metalness: 0.72,
          roughness: 0.28,
        }),
      );
      shell.rotation.z = Math.PI / 4;
      shell.castShadow = true;
      group.add(shell);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 7),
        new THREE.MeshStandardMaterial({
          color: 0xff315f,
          emissive: 0xff174d,
          emissiveIntensity: 2.5,
          toneMapped: false,
        }),
      );
      eye.position.z = 0.48;
      group.add(eye);

      for (const side of [-1, 1]) {
        const rotor = new THREE.Mesh(
          new THREE.TorusGeometry(0.3, 0.045, 6, 16),
          new THREE.MeshBasicMaterial({ color: 0x45ffe0, toneMapped: false }),
        );
        rotor.position.x = side * 0.68;
        rotor.rotation.x = Math.PI / 2;
        group.add(rotor);
      }

      const spawn = this.city.getRandomRoofPoint(index + 2);
      group.position.copy(spawn);
      this.scene.add(group);
      this.enemies.push({
        group,
        spawn,
        health: 3,
        active: true,
        respawnTimer: 0,
        attackCooldown: 1 + index * 0.17,
        snared: 0,
        phase: index * 1.93,
        velocity: new THREE.Vector3(),
      });
    }
  }

  fireWebProjectile(origin, direction) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16, 1),
      new THREE.MeshBasicMaterial({ color: 0xbafff1, toneMapped: false }),
    );
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      velocity: direction.clone().normalize().multiplyScalar(42),
      life: 1.8,
    });
    this.notify("FILAMENT BOLT");
  }

  melee(player, strike) {
    const range = strike.type === "air-attack" ? 3.1 : 2.45 + strike.comboStep * 0.13;
    let hitCount = 0;
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const toEnemy = enemy.group.position.clone().sub(player.position);
      const distance = toEnemy.length();
      const forwardDot = toEnemy.setY(0).normalize().dot(player.facing);
      if (distance <= range && (strike.type === "air-attack" || forwardDot > 0.05)) {
        this.#damageEnemy(enemy, strike.comboStep === 3 ? 2 : 1, player.facing);
        hitCount += 1;
      }
    }
    if (hitCount) {
      this.combo += hitCount;
      this.comboTimer = 2.5;
      this.notify(strike.type === "air-attack" ? "AERIAL IMPACT" : `STRIKE x${this.combo}`);
    }
  }

  #damageEnemy(enemy, damage, direction) {
    enemy.health -= damage;
    enemy.velocity.addScaledVector(direction, 7);
    enemy.velocity.y += 4;
    if (enemy.health <= 0) {
      enemy.active = false;
      enemy.respawnTimer = 7;
      enemy.group.visible = false;
      this.combo += 2;
    }
  }

  update(dt, player) {
    this.elapsed += dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;

    for (const enemy of this.enemies) {
      if (!enemy.active) {
        enemy.respawnTimer -= dt;
        if (enemy.respawnTimer <= 0) {
          enemy.active = true;
          enemy.health = 3;
          enemy.group.position.copy(enemy.spawn);
          enemy.group.visible = true;
          enemy.velocity.set(0, 0, 0);
        }
        continue;
      }

      enemy.snared = Math.max(0, enemy.snared - dt);
      enemy.attackCooldown -= dt;
      const toPlayer = player.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(enemy.group.position);
      const distance = toPlayer.length();
      if (distance < 22 && enemy.snared <= 0) {
        enemy.velocity.addScaledVector(toPlayer.normalize(), dt * 3.4);
      } else {
        enemy.velocity.multiplyScalar(Math.exp(-dt * 2));
      }
      enemy.velocity.clampLength(0, 5.5);
      enemy.group.position.addScaledVector(enemy.velocity, dt);
      enemy.group.position.y += Math.sin(this.elapsed * 2.2 + enemy.phase) * dt * 0.22;
      enemy.group.lookAt(player.position.x, enemy.group.position.y, player.position.z);
      enemy.group.rotation.z = Math.sin(this.elapsed * 1.7 + enemy.phase) * 0.12;

      if (distance < 1.8 && enemy.attackCooldown <= 0) {
        if (player.takeDamage(8)) this.notify("SUIT IMPACT");
        enemy.attackCooldown = 1.5;
        enemy.velocity.addScaledVector(toPlayer.normalize(), -7);
      }
    }

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      projectile.life -= dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.rotation.x += dt * 12;
      projectile.mesh.rotation.y += dt * 9;
      let consumed = projectile.life <= 0;
      for (const enemy of this.enemies) {
        if (!enemy.active || consumed) continue;
        if (enemy.group.position.distanceToSquared(projectile.mesh.position) < 1.2) {
          enemy.snared = 2.4;
          this.#damageEnemy(enemy, 1, projectile.velocity.clone().normalize());
          this.combo += 1;
          this.comboTimer = 2.5;
          this.notify("DRONE SNARED");
          consumed = true;
        }
      }
      if (consumed) {
        this.scene.remove(projectile.mesh);
        projectile.mesh.geometry.dispose();
        projectile.mesh.material.dispose();
        this.projectiles.splice(index, 1);
      }
    }
  }
}
