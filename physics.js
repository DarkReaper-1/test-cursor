import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);
const TEMP_A = new THREE.Vector3();
const TEMP_B = new THREE.Vector3();

/**
 * Custom character and rope physics tuned for responsive traversal.
 *
 * The simulation uses a fixed timestep in main.js. Buildings remain static
 * axis-aligned boxes, so collision checks are inexpensive and deterministic.
 */
export class PhysicsSystem {
  constructor(city, notify) {
    this.city = city;
    this.notify = notify;
    this.gravity = -31;
    this.web = null;
    this.zip = null;
    this.traversal = null;
    this.wallContact = null;
    this.wallContactTime = 0;
    this.tension = 0;
    this.wasGrounded = false;
    this.lastSafePosition = city.getSpawnPoint();
    this.moveInput = new THREE.Vector2();
    this.moveDirection = new THREE.Vector3();
  }

  attachWeb(player, buildingHit) {
    if (!buildingHit || this.zip) return false;
    const attachPoint = player.position.clone().addScaledVector(UP, 1.25);
    const distance = attachPoint.distanceTo(buildingHit.point);
    if (distance < 4 || distance > 95) return false;

    // A slightly shortened initial rope makes the first frame feel taut while
    // preserving all pre-existing player momentum.
    this.web = {
      anchor: buildingHit.point.clone(),
      length: Math.max(4, distance * 0.96),
    };
    player.webAttached = true;
    this.notify("FILAMENT ATTACHED");
    return true;
  }

  releaseWeb(player) {
    if (!this.web) return;
    this.web = null;
    this.tension = 0;
    player.webAttached = false;
    player.hideWeb();
    this.notify("FILAMENT RELEASED");
  }

  startZip(player, buildingHit) {
    if (!buildingHit || buildingHit.distance < 3 || buildingHit.distance > 82) return false;
    this.releaseWeb(player);
    const surfaceNormal = buildingHit.normal.clone().normalize();
    this.zip = {
      anchor: buildingHit.point.clone(),
      target: buildingHit.point.clone().addScaledVector(surfaceNormal, player.radius + 0.45),
      normal: surfaceNormal,
      time: 0,
    };
    this.notify("KINETIC ZIP");
    return true;
  }

  cancelZip(player) {
    this.zip = null;
    if (!this.web) player.hideWeb();
  }

  beginAirAttack(player) {
    if (!player.startAirAttack()) return false;
    this.releaseWeb(player);
    this.zip = null;
    player.velocity.y = Math.min(player.velocity.y, -19);
    player.velocity.addScaledVector(player.facing, 7);
    this.notify("AERIAL STRIKE");
    return true;
  }

  /**
   * Advance one fixed simulation step.
   */
  update(player, controls, cameraForward, cameraRight, dt) {
    if (this.traversal) {
      this.#updateTraversal(player, dt);
      return;
    }

    this.wallContactTime = Math.max(0, this.wallContactTime - dt);
    controls.getMoveVector(this.moveInput);
    this.moveDirection.set(0, 0, 0);
    this.moveDirection.addScaledVector(cameraForward, this.moveInput.y);
    this.moveDirection.addScaledVector(cameraRight, this.moveInput.x);
    this.moveDirection.y = 0;
    if (this.moveDirection.lengthSq() > 1) this.moveDirection.normalize();

    if (this.moveDirection.lengthSq() > 0.01 && !player.action) {
      player.setFacing(this.moveDirection, dt);
    }

    this.#handleJumpAndDodge(player, controls);
    this.#applyMovementForces(player, controls, dt);

    if (this.zip) {
      this.#applyZip(player, dt);
    } else {
      player.velocity.y += this.gravity * dt * (player.wallMode ? 0.18 : this.web ? 0.88 : 1);
      if (this.web) this.#applyRopeForce(player, dt);
    }

    // Avoid numerical tunnelling during extreme dives while keeping release
    // velocities high enough for satisfying swing chains.
    player.velocity.y = Math.max(player.velocity.y, -62);
    const previous = player.position.clone();
    player.position.addScaledVector(player.velocity, dt);

    if (this.web) this.#enforceRopeConstraint(player);
    const collision = this.#resolveCollisions(player, previous, controls);
    this.#finishContactState(player, collision, dt);

    if (this.web) {
      player.showWeb(this.web.anchor, this.tension, false);
    } else if (this.zip) {
      player.showWeb(this.zip.anchor, 1, true);
    }

    if (player.grounded && player.position.y > 0.2) {
      this.lastSafePosition.copy(player.position);
    }
    if (
      player.position.y < -28 ||
      Math.abs(player.position.x) > this.city.worldSize * 0.56 ||
      Math.abs(player.position.z) > this.city.worldSize * 0.56
    ) {
      this.respawn(player);
    }
  }

  #handleJumpAndDodge(player, controls) {
    if (controls.wasPressed("Space")) {
      if (player.grounded) {
        player.velocity.y = 12.8;
        player.grounded = false;
        this.notify("JUMP");
      } else if (this.wallContactTime > 0 && this.wallContact) {
        player.velocity.addScaledVector(this.wallContact.normal, 10.5);
        player.velocity.y = 12.2;
        player.grounded = false;
        player.wallMode = false;
        this.wallContactTime = 0;
        this.notify("WALL KICK");
      }
    }

    if (
      (controls.wasPressed("ControlLeft") || controls.wasPressed("ControlRight")) &&
      player.startDodge()
    ) {
      const direction = this.moveDirection.lengthSq() > 0.01
        ? this.moveDirection
        : player.facing;
      player.velocity.x = direction.x * 18;
      player.velocity.z = direction.z * 18;
      this.notify("KINETIC DODGE");
    }
  }

  #applyMovementForces(player, controls, dt) {
    player.wallMode = false;
    const hasInput = this.moveDirection.lengthSq() > 0.01;
    const actionSpeed = player.action?.type === "dodge" ? 18 : null;

    if (player.grounded) {
      const maximumSpeed = actionSpeed ?? (controls.sprinting ? 15.5 : 9.2);
      const acceleration = actionSpeed ? 20 : 13;
      const targetX = hasInput ? this.moveDirection.x * maximumSpeed : 0;
      const targetZ = hasInput ? this.moveDirection.z * maximumSpeed : 0;
      const blend = 1 - Math.exp(-dt * acceleration);
      player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, targetX, blend);
      player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, targetZ, blend);
    } else {
      // Air acceleration is additive so swing and launch momentum is retained.
      if (hasInput) {
        const horizontalSpeed = player.horizontalSpeed;
        const control = horizontalSpeed < 24 ? 13 : 5;
        player.velocity.addScaledVector(this.moveDirection, control * dt);
      }

      if (this.wallContactTime > 0 && this.wallContact && controls.sprinting && hasInput) {
        const normal = this.wallContact.normal;
        const intoWall = this.moveDirection.dot(normal) < -0.08;
        if (intoWall || player.horizontalSpeed > 7) {
          player.wallMode = true;
          const tangent = this.moveDirection.clone().addScaledVector(
            normal,
            -this.moveDirection.dot(normal),
          );
          if (tangent.lengthSq() > 0.05) {
            tangent.normalize();
            player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, tangent.x * 13.5, 0.18);
            player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, tangent.z * 13.5, 0.18);
            player.setFacing(tangent, dt);
            player.velocity.y = Math.max(player.velocity.y, -1.3);
          } else if (controls.isDown("KeyW")) {
            // Pressing toward a wall transitions a wall run into a climb.
            player.velocity.x = -normal.x * 1.2;
            player.velocity.z = -normal.z * 1.2;
            player.velocity.y = Math.max(player.velocity.y, 6.6);
            player.setFacing(normal.clone().negate(), dt);
          }
        }
      }
    }
  }

  #applyRopeForce(player, dt) {
    const attach = TEMP_A.copy(player.position).addScaledVector(UP, 1.25);
    const towardAnchor = TEMP_B.copy(this.web.anchor).sub(attach);
    const distance = towardAnchor.length();
    if (distance < 0.001) return;
    towardAnchor.divideScalar(distance);
    const extension = Math.max(0, distance - this.web.length);
    const towardSpeed = player.velocity.dot(towardAnchor);
    const pull = Math.max(0, extension * 92 - towardSpeed * 1.8);
    player.velocity.addScaledVector(towardAnchor, pull * dt);

    // Input can pump a swing, but the modest acceleration prevents free speed.
    if (this.moveDirection.lengthSq() > 0.01) {
      player.velocity.addScaledVector(this.moveDirection, 7.5 * dt);
    }
    this.tension = THREE.MathUtils.clamp(extension * 2.2 + Math.max(0, -towardSpeed) * 0.03, 0, 1);
  }

  #enforceRopeConstraint(player) {
    const attach = TEMP_A.copy(player.position).addScaledVector(UP, 1.25);
    const outward = TEMP_B.copy(attach).sub(this.web.anchor);
    const distance = outward.length();
    if (distance <= this.web.length || distance < 0.001) return;
    outward.divideScalar(distance);
    attach.copy(this.web.anchor).addScaledVector(outward, this.web.length);
    player.position.copy(attach).addScaledVector(UP, -1.25);

    // Remove only velocity moving away from the anchor. Tangential momentum,
    // the source of the pendulum arc, remains untouched.
    const outwardSpeed = player.velocity.dot(outward);
    if (outwardSpeed > 0) player.velocity.addScaledVector(outward, -outwardSpeed);
  }

  #applyZip(player, dt) {
    this.zip.time += dt;
    const attach = TEMP_A.copy(player.position).addScaledVector(UP, 1.0);
    const direction = TEMP_B.copy(this.zip.target).sub(attach);
    const distance = direction.length();
    if (distance < 1.5 || this.zip.time > 1.4) {
      const launchDirection = direction.lengthSq() > 0.01 ? direction.normalize() : player.facing;
      player.velocity.copy(launchDirection).multiplyScalar(19);
      player.velocity.y = Math.max(player.velocity.y, 7.5);
      this.zip = null;
      player.hideWeb();
      this.notify("ZIP LAUNCH");
      return;
    }
    direction.normalize();
    const desiredVelocity = direction.multiplyScalar(43);
    player.velocity.lerp(desiredVelocity, 1 - Math.exp(-dt * 10));
  }

  #resolveCollisions(player, previous, controls) {
    const impactVelocity = player.velocity.y;
    const nearby = this.city.getNearbyColliders(player.position, player.radius + 1);
    let landingHeight = -Infinity;

    // Find the highest crossed surface under the character's feet.
    if (player.position.y <= 0 && previous.y >= -0.05) landingHeight = 0;
    if (player.velocity.y <= 0) {
      for (const collider of nearby) {
        const insideX = player.position.x > collider.min.x - player.radius * 0.4 &&
          player.position.x < collider.max.x + player.radius * 0.4;
        const insideZ = player.position.z > collider.min.z - player.radius * 0.4 &&
          player.position.z < collider.max.z + player.radius * 0.4;
        if (
          insideX &&
          insideZ &&
          previous.y >= collider.max.y - 0.08 &&
          player.position.y <= collider.max.y
        ) {
          landingHeight = Math.max(landingHeight, collider.max.y);
        }
      }
    }

    player.grounded = false;
    if (landingHeight > -Infinity) {
      player.position.y = landingHeight;
      player.velocity.y = 0;
      player.grounded = true;
      this.zip = null;
      if (!this.wasGrounded && impactVelocity < -19) {
        player.startRoll();
        player.velocity.addScaledVector(player.facing, Math.min(5, Math.abs(impactVelocity) * 0.12));
        this.notify("IMPACT ROLL");
      }
    }

    let contact = null;
    for (const collider of nearby) {
      if (
        player.position.y >= collider.max.y - 0.025 ||
        player.position.y + player.height <= collider.min.y + 0.02
      ) {
        continue;
      }

      const resolution = this.#circleBoxResolution(player.position, player.radius, collider);
      if (!resolution) continue;
      player.position.addScaledVector(resolution.normal, resolution.depth + 0.001);
      const intoSurface = player.velocity.dot(resolution.normal);
      if (intoSurface < 0) player.velocity.addScaledVector(resolution.normal, -intoSurface);
      contact = { normal: resolution.normal, collider };

      const topDifference = collider.max.y - player.position.y;
      const movingIntoSurface = this.moveDirection.dot(resolution.normal) < -0.12;
      if (
        collider.type === "obstacle" &&
        topDifference > 0.18 &&
        topDifference <= 1.35 &&
        movingIntoSurface &&
        (this.wasGrounded || player.grounded) &&
        player.horizontalSpeed > 3.8
      ) {
        this.#startTraversal(player, collider, resolution.normal, "vault");
        return { contact, traversing: true };
      }

      if (
        collider.type === "building" &&
        topDifference > 0.65 &&
        topDifference <= 2.05 &&
        movingIntoSurface &&
        (controls.isDown("KeyW") || this.wallContactTime > 0)
      ) {
        this.#startTraversal(player, collider, resolution.normal, "ledge");
        return { contact, traversing: true };
      }
    }
    return { contact, traversing: false };
  }

  #circleBoxResolution(position, radius, collider) {
    const closestX = THREE.MathUtils.clamp(position.x, collider.min.x, collider.max.x);
    const closestZ = THREE.MathUtils.clamp(position.z, collider.min.z, collider.max.z);
    let dx = position.x - closestX;
    let dz = position.z - closestZ;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared >= radius * radius) return null;

    if (distanceSquared > 0.000001) {
      const distance = Math.sqrt(distanceSquared);
      return {
        normal: new THREE.Vector3(dx / distance, 0, dz / distance),
        depth: radius - distance,
      };
    }

    // The circle centre is inside the box projection; use the nearest edge.
    const choices = [
      { distance: Math.abs(position.x - collider.min.x), normal: new THREE.Vector3(-1, 0, 0) },
      { distance: Math.abs(collider.max.x - position.x), normal: new THREE.Vector3(1, 0, 0) },
      { distance: Math.abs(position.z - collider.min.z), normal: new THREE.Vector3(0, 0, -1) },
      { distance: Math.abs(collider.max.z - position.z), normal: new THREE.Vector3(0, 0, 1) },
    ];
    choices.sort((a, b) => a.distance - b.distance);
    return { normal: choices[0].normal, depth: radius + choices[0].distance };
  }

  #finishContactState(player, collision, dt) {
    if (collision.contact) {
      this.wallContact = collision.contact;
      this.wallContactTime = 0.13;
    }
    if (!player.grounded && this.wallContactTime > 0 && !collision.traversing) {
      player.wallNormal.copy(this.wallContact.normal);
    }
    this.wasGrounded = player.grounded;

    // Ground drag is intentionally low at speed so rooftop runs flow directly
    // into jumps. The movement controller handles braking when input stops.
    if (player.grounded && !player.action) {
      player.velocity.x *= Math.exp(-dt * 0.25);
      player.velocity.z *= Math.exp(-dt * 0.25);
    }
  }

  #startTraversal(player, collider, normal, type) {
    this.releaseWeb(player);
    this.zip = null;
    const start = player.position.clone();
    const inward = normal.clone().negate();
    let travelDistance = player.radius + 0.82;
    if (type === "vault") {
      travelDistance += Math.abs(normal.x) > 0.5
        ? collider.max.x - collider.min.x
        : collider.max.z - collider.min.z;
    }
    const end = start.clone().addScaledVector(inward, travelDistance);
    end.y = collider.max.y + 0.025;
    this.traversal = {
      type,
      start,
      end,
      direction: inward,
      time: 0,
      duration: type === "vault" ? 0.34 : 0.44,
    };
    player.velocity.set(0, 0, 0);
    player.wallMode = type === "ledge";
    this.notify(type === "vault" ? "FLOW VAULT" : "LEDGE CLIMB");
  }

  #updateTraversal(player, dt) {
    const traversal = this.traversal;
    traversal.time += dt;
    const t = THREE.MathUtils.clamp(traversal.time / traversal.duration, 0, 1);
    const smooth = t * t * (3 - 2 * t);
    player.position.lerpVectors(traversal.start, traversal.end, smooth);
    player.position.y += Math.sin(t * Math.PI) * (traversal.type === "vault" ? 0.65 : 0.4);
    player.setFacing(traversal.direction, dt);
    player.wallMode = traversal.type === "ledge";
    player.grounded = false;

    if (t >= 1) {
      player.position.copy(traversal.end);
      player.velocity.copy(traversal.direction).multiplyScalar(traversal.type === "vault" ? 8.5 : 5);
      player.velocity.y = 0;
      player.grounded = true;
      player.wallMode = false;
      this.traversal = null;
      this.wasGrounded = true;
    }
  }

  respawn(player) {
    this.web = null;
    this.zip = null;
    this.traversal = null;
    this.wallContact = null;
    player.webAttached = false;
    player.hideWeb();
    player.setPosition(this.city.getSpawnPoint());
    player.velocity.set(0, 0, 0);
    player.grounded = true;
    player.healFully();
    this.wasGrounded = true;
    this.notify("RECALIBRATED");
  }
}
