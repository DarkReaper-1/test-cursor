// Unified input: pointer (touch/mouse) + keyboard.
// - Hold anywhere = charge jump, release = leap (space also works)
// - Horizontal pointer drag or A/D/arrows = steer
export class Input {
  constructor(element) {
    this.holding = false;
    this.holdStart = 0;
    this.releasedThisFrame = false;
    this.releaseHoldTime = 0;
    // steer: -1..1 from keys, plus drag delta in px accumulated per frame
    this.keySteer = 0;
    this.dragDeltaX = 0;
    this._left = false;
    this._right = false;
    this._pointerId = null;
    this._lastPointerX = 0;

    element.addEventListener('pointerdown', (e) => {
      if (this._pointerId !== null) return;
      this._pointerId = e.pointerId;
      this._lastPointerX = e.clientX;
      this._beginHold();
      element.setPointerCapture?.(e.pointerId);
    });
    element.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._pointerId) return;
      this.dragDeltaX += e.clientX - this._lastPointerX;
      this._lastPointerX = e.clientX;
    });
    const endPointer = (e) => {
      if (e.pointerId !== this._pointerId) return;
      this._pointerId = null;
      this._endHold();
    };
    element.addEventListener('pointerup', endPointer);
    element.addEventListener('pointercancel', endPointer);

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { this._beginHold(); e.preventDefault(); }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this._left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this._right = true;
      this._updateKeySteer();
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') this._endHold();
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this._left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this._right = false;
      this._updateKeySteer();
    });
    window.addEventListener('blur', () => {
      this._left = this._right = false;
      this._updateKeySteer();
      if (this.holding) this._endHold();
    });
  }

  _updateKeySteer() {
    this.keySteer = (this._right ? 1 : 0) - (this._left ? 1 : 0);
  }

  _beginHold() {
    if (this.holding) return;
    this.holding = true;
    this.holdStart = performance.now();
  }

  _endHold() {
    if (!this.holding) return;
    this.holding = false;
    this.releasedThisFrame = true;
    this.releaseHoldTime = (performance.now() - this.holdStart) / 1000;
  }

  get holdTime() {
    return this.holding ? (performance.now() - this.holdStart) / 1000 : 0;
  }

  /** Call once at the end of each frame. */
  endFrame() {
    this.releasedThisFrame = false;
    this.dragDeltaX = 0;
  }
}
