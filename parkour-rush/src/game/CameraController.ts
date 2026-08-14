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
  baseFov = 62;
  maxFovBoost = 14;
  reducedMotion = false;
  shakeEnabled = true;

  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private shake = 0;
  private shakeTime = 0;
  private tmp = new THREE.Vector3();
  private initialized = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 520);
  }

  addShake(amount: number): void {
    if (!this.shakeEnabled || this.reducedMotion) return;
    this.shake = Math.min(1.2, this.shake + amount);
  }

  snapTo(x: number, y: number, z: number): void {
    this.pos.set(x, y + 4.4, z - 9.2);
    this.look.set(x, y + 1.35, z + 11);
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

    // Stickman sits in the lower third; the course fills the rest of the frame.
    const anticipX = THREE.MathUtils.clamp(vx * 0.1, -1.1, 1.1);
    const targetX = px * 0.55 + anticipX;

    const dist = 8.8 + speedRatio * 2.2;
    const height = 4.6 - speedRatio * 0.45 + (state === 'slide' ? -0.45 : 0);

    const targetY = py + height;
    const targetZ = pz - dist;

    const kXZ = 1 - Math.exp(-dt * 6.5);
    const kY = 1 - Math.exp(-dt * (py < this.pos.y - 3 ? 9 : 4.2));
    this.pos.x += (targetX - this.pos.x) * kXZ;
    this.pos.z += (targetZ - this.pos.z) * kXZ;
    this.pos.y += (targetY - this.pos.y) * kY;

    if (this.pos.y < py + 1.4) this.pos.y = py + 1.4;

    const lookTarget = this.tmp.set(px * 0.7 + anticipX * 0.45, py + 1.15 + speedRatio * 0.15, pz + 14);
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
