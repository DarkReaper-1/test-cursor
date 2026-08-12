import type { CheckpointDef } from '../../levels/LevelTypes';

/**
 * Tracks per-racer checkpoint progress and provides respawn poses.
 * Pure logic — unit tested.
 */
export class CheckpointManager {
  private checkpoints: CheckpointDef[];
  private reached = new Map<number, number>(); // racerId → highest checkpoint index
  private startX: number;
  private startY: number;

  constructor(checkpoints: CheckpointDef[], startX = 0, startY = 0.2) {
    this.checkpoints = [...checkpoints].sort((a, b) => a.index - b.index);
    this.startX = startX;
    this.startY = startY;
  }

  get total(): number {
    return this.checkpoints.length;
  }

  /** Register that a racer touched checkpoint `index`. Returns true if new. */
  reach(racerId: number, index: number): boolean {
    const prev = this.reached.get(racerId) ?? -1;
    if (index > prev) {
      this.reached.set(racerId, index);
      return true;
    }
    return false;
  }

  highestReached(racerId: number): number {
    return this.reached.get(racerId) ?? -1;
  }

  /** Respawn pose = last reached checkpoint (or level start). */
  respawnPose(racerId: number): { x: number; y: number; z: number } {
    const idx = this.highestReached(racerId);
    if (idx < 0) return { x: this.startX, y: this.startY, z: 2 };
    const cp = this.checkpoints.find((c) => c.index === idx);
    if (!cp) return { x: this.startX, y: this.startY, z: 2 };
    return { x: cp.respawnX, y: cp.respawnY, z: cp.z + 0.5 };
  }

  reset(): void {
    this.reached.clear();
  }
}
