// Steering-only input, matching the one-finger control scheme of the genre:
// drag horizontally (touch/mouse) or hold A/D or arrow keys. Output is a
// smoothed steer value in [-1, 1].
export class Input {
  constructor(element) {
    this.steer = 0;          // smoothed, read by the game
    this.rawSteer = 0;       // instantaneous target
    this.pointerDown = false;
    this.anyTap = false;     // consumed by menus ("tap to race")

    this._keyLeft = false;
    this._keyRight = false;
    this._dragAnchorX = 0;
    this._dragSteer = 0;
    // Full steer is reached after dragging ~18% of the smaller screen dimension.
    this._dragRange = () => Math.min(window.innerWidth, window.innerHeight) * 0.18;

    element.addEventListener('pointerdown', (e) => {
      this.pointerDown = true;
      this.anyTap = true;
      this._dragAnchorX = e.clientX;
      this._dragSteer = 0;
      element.setPointerCapture?.(e.pointerId);
    });
    element.addEventListener('pointermove', (e) => {
      if (!this.pointerDown) return;
      const dx = e.clientX - this._dragAnchorX;
      this._dragSteer = clamp(dx / this._dragRange(), -1, 1);
      // Relative steering: the anchor trails the finger so re-centering the
      // finger re-centers the steer (feels like the mobile original).
      const over = Math.abs(dx) - this._dragRange();
      if (over > 0) this._dragAnchorX += Math.sign(dx) * over;
    });
    const release = () => { this.pointerDown = false; this._dragSteer = 0; };
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this._keyLeft = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this._keyRight = true;
      if (e.code === 'Space' || e.code === 'Enter') this.anyTap = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this._keyLeft = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this._keyRight = false;
    });
  }

  consumeTap() { const t = this.anyTap; this.anyTap = false; return t; }

  update(dt) {
    let target = 0;
    if (this._keyLeft) target -= 1;
    if (this._keyRight) target += 1;
    if (this.pointerDown) target = clamp(target + this._dragSteer, -1, 1);
    this.rawSteer = target;
    // Quick attack, slightly slower release, so taps produce crisp nudges.
    const rate = Math.abs(target) > Math.abs(this.steer) ? 14 : 10;
    this.steer += (target - this.steer) * Math.min(1, dt * rate);
    if (Math.abs(this.steer) < 0.001 && target === 0) this.steer = 0;
  }
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
