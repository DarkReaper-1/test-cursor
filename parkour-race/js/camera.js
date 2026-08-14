import * as THREE from 'three';
import { TUNE } from './runner.js';

// Chase camera: sits behind & above the player, eases toward them, widens FOV
// with speed, and adds a little shake on big impacts.
export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.baseFov = 58;
    this.shake = 0;
    this._pos = new THREE.Vector3(0, 4.5, -14);
    this._look = new THREE.Vector3();
  }

  snapTo(runner) {
    this._pos.set(runner.pos.x * 0.6, runner.pos.y + 3.4, runner.pos.z - 7);
    this.camera.position.copy(this._pos);
  }

  addShake(amount) {
    this.shake = Math.min(1, this.shake + amount);
  }

  update(dt, runner) {
    const speedNorm = Math.min(1, runner.speed / TUNE.boostedMax);

    const targetPos = new THREE.Vector3(
      runner.pos.x * 0.55,
      runner.pos.y + 3.3,
      runner.pos.z - (6.4 + speedNorm * 1.6)
    );
    // vertical follows slower so jumps read tall on screen
    this._pos.x += (targetPos.x - this._pos.x) * Math.min(1, dt * 6);
    this._pos.y += (targetPos.y - this._pos.y) * Math.min(1, dt * 3.2);
    this._pos.z += (targetPos.z - this._pos.z) * Math.min(1, dt * 8);

    this.shake = Math.max(0, this.shake - dt * 3);
    const s = this.shake * this.shake * 0.35;
    this.camera.position.set(
      this._pos.x + (Math.random() - 0.5) * s,
      this._pos.y + (Math.random() - 0.5) * s,
      this._pos.z
    );

    this._look.set(runner.pos.x * 0.7, runner.pos.y + 1.3, runner.pos.z + 6);
    this.camera.lookAt(this._look);

    const targetFov = this.baseFov + speedNorm * 16 + (runner.boostT > 0 ? 4 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 5);
    this.camera.updateProjectionMatrix();
  }
}
