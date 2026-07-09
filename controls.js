import * as THREE from "three";

/**
 * Centralised keyboard, mouse, and pointer-lock input.
 *
 * Game systems read actions from this class instead of registering their own
 * browser events. That makes rebinding controls and adding gamepad support
 * straightforward later.
 */
export class Controls {
  constructor(canvas, onPauseChange) {
    this.canvas = canvas;
    this.onPauseChange = onPauseChange;
    this.keys = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.buttons = new Set();
    this.buttonPressed = new Set();
    this.buttonReleased = new Set();
    this.yaw = Math.PI;
    this.pitch = -0.18;
    this.sensitivity = 0.0022;
    this.locked = false;
    this.enabled = false;

    this.#bindEvents();
  }

  #bindEvents() {
    window.addEventListener("keydown", (event) => {
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);

      // Prevent movement controls from scrolling the document.
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      this.released.add(event.code);
    });

    this.canvas.addEventListener("mousedown", (event) => {
      if (!this.locked) {
        this.requestPointerLock();
        return;
      }
      if (!this.buttons.has(event.button)) this.buttonPressed.add(event.button);
      this.buttons.add(event.button);
    });

    window.addEventListener("mouseup", (event) => {
      this.buttons.delete(event.button);
      this.buttonReleased.add(event.button);
    });

    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    document.addEventListener("mousemove", (event) => {
      if (!this.locked || !this.enabled) return;
      this.yaw -= event.movementX * this.sensitivity;
      this.pitch -= event.movementY * this.sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.05, 0.72);
    });

    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this.enabled) this.onPauseChange(!this.locked);
    });

    window.addEventListener("blur", () => this.reset());
  }

  requestPointerLock() {
    try {
      const request = this.canvas.requestPointerLock?.();
      // Some embedded and automated browsers reject pointer lock. The game can
      // still run with keyboard controls, so treat that policy decision as a
      // graceful capability fallback rather than an unhandled promise error.
      request?.catch?.(() => {});
    } catch {
      // Legacy implementations may throw synchronously instead of returning a
      // rejected promise. No action is needed for this optional capability.
    }
  }

  reset() {
    this.keys.clear();
    this.pressed.clear();
    this.released.clear();
    this.buttons.clear();
    this.buttonPressed.clear();
    this.buttonReleased.clear();
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  wasReleased(code) {
    return this.released.has(code);
  }

  isMouseDown(button) {
    return this.buttons.has(button);
  }

  wasMousePressed(button) {
    return this.buttonPressed.has(button);
  }

  wasMouseReleased(button) {
    return this.buttonReleased.has(button);
  }

  /**
   * Return a normalised local movement vector. Positive z means forward;
   * camera-relative conversion is handled by the physics system.
   */
  getMoveVector(target = new THREE.Vector2()) {
    target.set(
      Number(this.isDown("KeyD")) - Number(this.isDown("KeyA")),
      Number(this.isDown("KeyW")) - Number(this.isDown("KeyS")),
    );
    if (target.lengthSq() > 1) target.normalize();
    return target;
  }

  get sprinting() {
    return this.isDown("ShiftLeft") || this.isDown("ShiftRight");
  }

  /**
   * Called after every simulation frame so edge-triggered actions fire once.
   */
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.buttonPressed.clear();
    this.buttonReleased.clear();
  }
}
