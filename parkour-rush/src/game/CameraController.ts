import * as THREE from 'three';

/**
 * Third-person chase camera:
 *  - critically-damped smooth follow
 *  - lateral anticipation from player velocity
 *  - dynamic FOV that widens with speed / boost
 *  - impact shake (decaying noise), disabled by reduced-motion
 *  - never sinks below the runner (keeps geometry out of the lens
 *    for this track style without per-frame raycasts)
 */
export class CameraController {
  camera: THREE.PerspectiveCamera;
  baseFov = 70;
  maxFovBoost = 16;
  reducedMotion = false;
  shakeEnabled = true;

  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private shake = 0;
  private shakeTime = 0;
  private tmp = new THREE.Vector3();
  private initialized = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 400);
  }

  addShake(amount: number): void {
    if (!this.shakeEnabled || this.reducedMotion) return;
    this.shake = Math.min(1.2, this.shake + amount);
  }

  snapTo(x: number, y: number, z: number): void {
    this.pos.set(x, y + 3.4, z - 7.2);
    this.look.set(x, y + 1.6, z + 8);
    this.initialized = true;
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }

  update(
    dt: number,
    px: number,
    py: number,
    pz: number,
    vx: number,
    speedRatio: number,
    state: string,
  ): void {
    if (!this.initialized) this.snapTo(px, py, pz);
    this.shakeTime += dt;

    // anticipation: lead the player laterally in the direction of travel
    const anticipX = THREE.MathUtils.clamp(vx * 0.14, -1.4, 1.4);
    const targetX = px * 0.72 + anticipX;

    // camera rides a bit lower/further at speed for a sense of velocity
    const dist = 6.8 + speedRatio * 1.5;
    const height = 3.3 - speedRatio * 0.35 + (state === 'slide' ? -0.5 : 0);

    // vertical follow is softer so jumps read nicely
    const targetY = py + height;
    const targetZ = pz - dist;

    const kXZ = 1 - Math.exp(-dt * 7);
    const kY = 1 - Math.exp(-dt * (py < this.pos.y - 3 ? 9 : 4.5));
    this.pos.x += (targetX - this.pos.x) * kXZ;
    this.pos.z += (targetZ - this.pos.z) * kXZ;
    this.pos.y += (targetY - this.pos.y) * kY;

    // keep the lens above the deck
    if (this.pos.y < py + 1.0) this.pos.y = py + 1.0;

    // look ahead of the runner
    const lookTarget = this.tmp.set(px * 0.85 + anticipX * 0.6, py + 1.5 + speedRatio * 0.2, pz + 9);
    const kL = 1 - Math.exp(-dt * 10);
    this.look.lerp(lookTarget, kL);

    // shake
    let sx = 0;
    let sy = 0;
    if (this.shake > 0.001) {
      const s = this.shake * 0.22;
      sx = (Math.sin(this.shakeTime * 91) + Math.sin(this.shakeTime * 47)) * 0.5 * s;
      sy = (Math.cos(this.shakeTime * 83) + Math.sin(this.shakeTime * 59)) * 0.5 * s;
      this.shake *= Math.exp(-dt * 6);
    }

    this.camera.position.set(this.pos.x + sx, this.pos.y + sy, this.pos.z);
    this.camera.lookAt(this.look);

    // dynamic FOV
    const targetFov = this.reducedMotion ? this.baseFov : this.baseFov + speedRatio * speedRatio * this.maxFovBoost;
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-dt * 5));
    this.camera.updateProjectionMatrix();
  }
}
