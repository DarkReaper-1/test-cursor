/* =============================================================================
   controls.js — input + third-person orbit camera for Skyline Drifter
   -----------------------------------------------------------------------------
   Responsibilities:
     • Keyboard/mouse state tracking (WASD, sprint, jump, combat, dodge).
     • Pointer-lock management so mouse look works like a real game.
     • A smoothing third-person camera that orbits behind the player, eases
       toward a target distance, and pulls in when a building would clip it.
     • Exposing a "forward/right basis" derived from the camera yaw so movement
       is always relative to where the player is looking.

   It deliberately owns no game logic; player.js reads `input` each frame.
   ============================================================================= */

import * as THREE from 'three';
import { damp, clamp, raycastBoxes } from './physics.js';

/**
 * Mutable input snapshot shared with the player each frame. Booleans are held
 * state; `*Pressed` flags are one-frame edges consumed by the player.
 */
export const input = {
  forward: 0, right: 0,           // -1..1 movement axes
  sprint: false,
  jump: false, jumpPressed: false,
  climb: false,
  swing: false, swingPressed: false, swingReleased: false,
  zip: false, zipPressed: false,
  attack: false, attackPressed: false,
  web: false, webPressed: false,
  dodge: false, dodgePressed: false,
  // Look angles (radians). yaw around Y, pitch around X.
  yaw: 0, pitch: -0.15,
  mouseDX: 0, mouseDY: 0,
};

const keyState = {};

/**
 * Wire up DOM listeners. `onStart` fires when the user clicks to begin (used to
 * hide the overlay and start the loop). `dom` bundles the elements we toggle.
 */
export function initControls(dom, onStart) {
  const { canvas, overlay, startBtn, crosshair } = dom;

  // ---- Keyboard ----------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keyState[e.code] = true;
    // Edge-triggered actions:
    if (e.code === 'Space') input.jumpPressed = true;
    if (e.code === 'KeyF') input.attackPressed = true;
    if (e.code === 'KeyE') input.webPressed = true;
    if (e.code === 'KeyC') input.dodgePressed = true;
    // Prevent the page from scrolling on Space.
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keyState[e.code] = false; });

  // ---- Mouse buttons -----------------------------------------------------
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.swing = true; input.swingPressed = true; }
    if (e.button === 2) { input.zip = true; input.zipPressed = true; }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) { input.swing = false; input.swingReleased = true; }
    if (e.button === 2) { input.zip = false; }
  });
  // Suppress the context menu so right-click can be the zip control.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- Mouse look (pointer lock) ----------------------------------------
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    input.mouseDX += e.movementX;
    input.mouseDY += e.movementY;
  });

  // ---- Start / pointer-lock flow ----------------------------------------
  function begin() {
    overlay.classList.add('hidden');
    crosshair.classList.add('active');
    canvas.requestPointerLock?.();
    onStart();
  }
  startBtn.addEventListener('click', begin);
  canvas.addEventListener('click', () => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
  });

  return { begin };
}

/**
 * Fold the raw key state and accumulated mouse deltas into `input`. Called once
 * per frame before player.update. `sens` scales mouse look.
 */
export function sampleInput(sens = 0.0024) {
  input.forward = (keyState['KeyW'] || keyState['ArrowUp'] ? 1 : 0) - (keyState['KeyS'] || keyState['ArrowDown'] ? 1 : 0);
  input.right = (keyState['KeyD'] || keyState['ArrowRight'] ? 1 : 0) - (keyState['KeyA'] || keyState['ArrowLeft'] ? 1 : 0);
  input.sprint = !!keyState['ShiftLeft'] || !!keyState['ShiftRight'];
  input.jump = !!keyState['Space'];
  input.climb = !!keyState['Space'];
  input.attack = !!keyState['KeyF'];
  input.dodge = !!keyState['KeyC'];

  // Apply accumulated mouse movement to look angles.
  input.yaw -= input.mouseDX * sens;
  input.pitch -= input.mouseDY * sens;
  input.pitch = clamp(input.pitch, -0.9, 0.55);
  input.mouseDX = 0;
  input.mouseDY = 0;
}

/**
 * Clear the one-frame edge flags. Called at the very end of a frame.
 */
export function endFrameInput() {
  input.jumpPressed = false;
  input.swingPressed = false;
  input.swingReleased = false;
  input.zipPressed = false;
  input.attackPressed = false;
  input.webPressed = false;
  input.dodgePressed = false;
}

/**
 * A third-person camera that trails the player. It:
 *   • Orbits using input.yaw / input.pitch.
 *   • Keeps a look target slightly above the player's feet.
 *   • Eases its distance and position for a smooth, weighty feel.
 *   • Casts a ray from the target outward and shortens the boom if a building
 *     is in the way (no clipping through walls).
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = 9;          // desired boom length
    this.currentDist = 9;
    this.height = 3.2;          // look-at height above feet
    this.pos = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._boxes = [];
  }

  /**
   * @param {THREE.Vector3} target  player feet position
   * @param {number} dt
   * @param {import('./physics.js').SpatialHash} hash  for occlusion tests
   * @param {number} extraDist      pushes the camera out (e.g. while swinging)
   */
  update(target, dt, hash, extraDist = 0) {
    // Smoothly track the look target.
    this.lookAt.x = damp(this.lookAt.x, target.x, 14, dt);
    this.lookAt.y = damp(this.lookAt.y, target.y + this.height, 10, dt);
    this.lookAt.z = damp(this.lookAt.z, target.z, 14, dt);

    // Spherical offset from yaw/pitch.
    const cp = Math.cos(input.pitch);
    this._dir.set(
      Math.sin(input.yaw) * cp,
      Math.sin(input.pitch),
      Math.cos(input.yaw) * cp,
    );

    const wantDist = this.distance + extraDist;

    // Occlusion: cast from the look target backward along the boom.
    let allowed = wantDist;
    if (hash) {
      hash.query(this.lookAt.x, this.lookAt.z, 2, this._boxes);
      const hit = raycastBoxes(this.lookAt, this._dir.clone().multiplyScalar(1), wantDist + 1.5, this._boxes);
      if (hit) allowed = Math.max(2.2, hit.dist - 0.8);
    }
    this.currentDist = damp(this.currentDist, allowed, allowed < this.currentDist ? 30 : 6, dt);

    this._desired.copy(this.lookAt).addScaledVector(this._dir, this.currentDist);
    // Keep the camera from dipping under the street.
    if (this._desired.y < 1.2) this._desired.y = 1.2;

    // Ease camera position toward the desired boom end.
    this.pos.x = damp(this.pos.x, this._desired.x, 16, dt);
    this.pos.y = damp(this.pos.y, this._desired.y, 16, dt);
    this.pos.z = damp(this.pos.z, this._desired.z, 16, dt);

    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.lookAt);
  }

  /** Forward vector on the XZ plane (movement basis). */
  getForward(out) {
    out.set(-Math.sin(input.yaw), 0, -Math.cos(input.yaw)).normalize();
    return out;
  }
  /** Right vector on the XZ plane. */
  getRight(out) {
    out.set(Math.cos(input.yaw), 0, -Math.sin(input.yaw)).normalize();
    return out;
  }
  /** Full aim direction (includes pitch) for firing webs at what you look at. */
  getAim(out) {
    const cp = Math.cos(input.pitch);
    out.set(-Math.sin(input.yaw) * cp, Math.sin(input.pitch), -Math.cos(input.yaw) * cp).normalize();
    return out;
  }
}
