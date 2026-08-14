import * as THREE from 'three';

// Smooth chase camera: sits behind and above the runner, partially follows the
// heading, widens FOV on boost, and shakes on hard impacts.
export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
    this.shake = 0;
    this.baseFov = 62;
    this._tmp = new THREE.Vector3();
    this._initialized = false;
  }

  snapTo(runner) {
    this._initialized = false;
    this.update(0.016, runner, false);
  }

  addShake(amount) { this.shake = Math.min(1, this.shake + amount); }

  update(dt, r, boosted) {
    // camera yaw follows a fraction of the runner heading (feels like the
    // camera "swings out" on turns without losing the track direction)
    const camYaw = r.yaw * 0.45;
    const dist = 6.4, height = 3.35;
    const bx = r.x - Math.sin(camYaw) * dist;
    const bz = r.z - Math.cos(camYaw) * dist;
    // vertical: follow ground level rather than every hop — smooth on jumps
    const by = Math.max(r.y, r.lastGroundY) + height;

    this._tmp.set(bx, by, bz);
    if (!this._initialized) {
      this.pos.copy(this._tmp);
      this._initialized = true;
    } else {
      const kxz = Math.min(1, dt * 7.5);
      const ky = Math.min(1, dt * 4.2);
      this.pos.x += (this._tmp.x - this.pos.x) * kxz;
      this.pos.z += (this._tmp.z - this.pos.z) * kxz;
      this.pos.y += (this._tmp.y - this.pos.y) * ky;
    }

    // look ahead of the runner
    const lookAhead = 5.5;
    this._tmp.set(
      r.x + Math.sin(r.yaw) * lookAhead * 0.4,
      Math.max(r.y, r.lastGroundY) + 1.1,
      r.z + Math.cos(r.yaw) * lookAhead
    );
    this.lookTarget.lerp(this._tmp, this._initialized ? Math.min(1, dt * 9) : 1);

    // shake
    this.shake = Math.max(0, this.shake - dt * 2.4);
    const sh = this.shake * this.shake * 0.35;
    const t = performance.now() / 1000;

    this.camera.position.set(
      this.pos.x + Math.sin(t * 31) * sh,
      this.pos.y + Math.sin(t * 41) * sh,
      this.pos.z + Math.sin(t * 37) * sh * 0.4
    );
    this.camera.lookAt(this.lookTarget);

    // FOV kick on boost
    const targetFov = this.baseFov + (boosted ? 12 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 5);
    this.camera.updateProjectionMatrix();
  }
}
