import type { BoxCollider } from '../core/types';
import type { CollisionWorld, MovementController } from './MovementController';

/**
 * Parkour surface detection: scans the course ahead of a runner and
 * classifies upcoming interactions. Used for:
 *  - contextual tutorial prompts ("SWIPE DOWN!")
 *  - AI action planning fallback
 *  - forgiving auto-actions (auto-vault assist is handled in
 *    MovementController; this module decides *what's coming*).
 */

export type SurfaceAhead =
  | { type: 'none' }
  | { type: 'vault'; distance: number }
  | { type: 'slideBar'; distance: number }
  | { type: 'gap'; distance: number; width: number }
  | { type: 'wall'; distance: number; height: number }
  | { type: 'wallRunPanel'; distance: number; side: 'L' | 'R' }
  | { type: 'launchPad'; distance: number }
  | { type: 'breakable'; distance: number }
  | { type: 'hazard'; distance: number };

export class ParkourController {
  /** scan distance ahead in units */
  scanRange = 14;

  detectAhead(mc: MovementController, world: CollisionWorld): SurfaceAhead {
    const z0 = mc.z;
    const list = world.queryZ(z0, z0 + this.scanRange);
    let best: SurfaceAhead = { type: 'none' };
    let bestDist = Infinity;

    const laneMinX = mc.x - 1.0;
    const laneMaxX = mc.x + 1.0;

    for (const c of list) {
      if (c.disabled) continue;
      const dist = c.minZ - z0;
      if (dist < 0 || dist > this.scanRange || dist >= bestDist) continue;
      const inLane = c.maxX > laneMinX && c.minX < laneMaxX;

      if (c.kind === 'vault' && inLane && c.maxY - mc.y <= mc.cfg.vaultMaxHeight + 0.2 && c.maxY > mc.y + 0.2) {
        best = { type: 'vault', distance: dist };
        bestDist = dist;
      } else if (c.kind === 'slideUnder' && inLane && c.minY < mc.y + mc.cfg.standHeight && c.minY > mc.y + 0.5) {
        best = { type: 'slideBar', distance: dist };
        bestDist = dist;
      } else if (c.kind === 'hazard' && inLane && c.maxY >= mc.y - 0.5) {
        best = { type: 'hazard', distance: dist };
        bestDist = dist;
      } else if (c.kind === 'launch' && inLane) {
        best = { type: 'launchPad', distance: dist };
        bestDist = dist;
      } else if (c.kind === 'breakable' && inLane) {
        best = { type: 'breakable', distance: dist };
        bestDist = dist;
      } else if (c.kind === 'solid' && inLane && c.maxY - mc.y > mc.cfg.vaultMaxHeight && c.minY < mc.y + 1) {
        best = { type: 'wall', distance: dist, height: c.maxY - mc.y };
        bestDist = dist;
      } else if (c.wallRunnable && !inLane) {
        const side: 'L' | 'R' = (c.minX + c.maxX) / 2 < mc.x ? 'L' : 'R';
        if (dist < bestDist) {
          best = { type: 'wallRunPanel', distance: dist, side };
          bestDist = dist;
        }
      }
    }

    // gap detection: probe ground presence at intervals ahead
    const gapStart = this.findGap(mc, world);
    if (gapStart && gapStart.distance < bestDist) {
      best = gapStart;
    }
    return best;
  }

  /** Probe for missing ground ahead (a gap the runner must jump). */
  private findGap(mc: MovementController, world: CollisionWorld): { type: 'gap'; distance: number; width: number } | null {
    if (!mc.grounded) return null;
    const stepLen = 1.0;
    let gapAt = -1;
    for (let d = 1; d <= this.scanRange; d += stepLen) {
      const z = mc.z + d;
      if (!this.hasGroundAt(mc.x, mc.y, z, world)) {
        gapAt = d;
        break;
      }
    }
    if (gapAt < 0) return null;
    // measure width
    let width = stepLen;
    for (let d = gapAt + stepLen; d <= this.scanRange + 8; d += stepLen) {
      if (this.hasGroundAt(mc.x, mc.y, mc.z + d, world)) break;
      width += stepLen;
    }
    return { type: 'gap', distance: gapAt, width };
  }

  hasGroundAt(x: number, y: number, z: number, world: CollisionWorld): boolean {
    const list = world.queryZ(z - 0.5, z + 0.5);
    for (const c of list) {
      if (c.disabled) continue;
      if (c.kind !== 'solid' && c.kind !== 'vault') continue;
      if (x < c.minX - 0.3 || x > c.maxX + 0.3) continue;
      if (z < c.minZ || z > c.maxZ) continue;
      if (c.maxY <= y + 0.6 && c.maxY >= y - 3.5) return true;
    }
    return false;
  }
}
