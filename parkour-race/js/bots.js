import { Runner, TUNE, STATES } from './runner.js';
import { Stickman } from './stickman.js';

const BOT_NAMES = ['Blaze', 'Nova', 'Dash', 'Kiko', 'Rex', 'Milo', 'Zippy'];
const BOT_COLORS = [0xe74c3c, 0x2ecc71, 0x3498db, 0xe67e22, 0x1abc9c, 0xf05fa2, 0x95a5a6];

// AI racer: runs the same physics as the player, decides when to charge and
// release jumps at gap edges, and rubber-bands to keep the race close.
export class Bot {
  constructor(course, scene, index, skill) {
    this.stick = new Stickman(BOT_COLORS[index % BOT_COLORS.length], 0xffffff);
    scene.add(this.stick.root);
    const lane = ((index % 4) - 1.5) * 2.2 + (Math.random() - 0.5) * 0.6;
    this.runner = new Runner(course, this.stick, { name: BOT_NAMES[index % BOT_NAMES.length], startX: lane });
    this.runner.pos.z = -6 - Math.floor(index / 4) * 1.6;
    this.course = course;
    this.skill = skill;            // 0..1 — jump accuracy
    this.laneTarget = lane;
    this.laneTimer = 1 + Math.random() * 2;
    this.jumpPlan = null;          // {releaseZ, chargeStart}
    this.rubberband = 1;
  }

  update(dt, playerZ) {
    const r = this.runner;
    if (r.running && !r.finished) {
      this._think(dt, playerZ);
    }
    r.update(dt);
  }

  _think(dt, playerZ) {
    const r = this.runner;

    // ---- rubber-banding: behind → faster, ahead → slower
    const gap = playerZ - r.pos.z;   // positive when bot is behind
    const target = gap > 25 ? 1.14 : gap > 8 ? 1.06 : gap < -25 ? 0.88 : gap < -8 ? 0.95 : 1;
    this.rubberband += (target - this.rubberband) * Math.min(1, dt * 0.8);
    if (r.state === STATES.GROUND && !r.charging) {
      const cruise = TUNE.maxSpeed * this.rubberband * (0.94 + this.skill * 0.06);
      if (r.speed < cruise) r.speed = Math.min(cruise, r.speed + TUNE.accel * 1.1 * dt);
    }

    // ---- lane wandering + seeking bumpers
    this.laneTimer -= dt;
    if (this.laneTimer <= 0) {
      this.laneTimer = 1.2 + Math.random() * 2.2;
      let bumper = null;
      for (const b of this.course.bumpers) {
        const dz = b.z - r.pos.z;
        if (dz > 3 && dz < 26 && (!bumper || b.z < bumper.z)) bumper = b;
      }
      if (bumper && Math.random() < 0.45 + this.skill * 0.4) this.laneTarget = bumper.x;
      else this.laneTarget = (Math.random() - 0.5) * 7;
    }
    const laneErr = this.laneTarget - r.pos.x;
    r.steer(Math.max(-1, Math.min(1, laneErr * 0.8)));

    // ---- jump planning at gap edges and trampolines
    if (r.state === STATES.GROUND) {
      const edge = this.course.nextGapEdge(r.pos.z);
      if (edge) {
        const dist = edge.zEdge - r.pos.z;
        const gapLen = edge.zLand - edge.zEdge;
        const rise = Math.max(0, edge.yLand - edge.yEdge);

        // is there a trampoline or rail meant for this gap? then don't jump —
        // run onto the tramp / off the edge onto the rail instead
        const tramp = this.course.nextTramp(r.pos.z);
        const trampHandles = tramp && tramp.z < edge.zEdge && edge.zEdge - tramp.z < 6;
        const rail = this.course.rails.find(
          (rl) => rl.zStart <= edge.zEdge + 1 && rl.zEnd >= edge.zLand - 2
        );
        if (trampHandles) {
          if (dist < 10) this.laneTarget = tramp.x;
        } else if (rail) {
          if (dist < 14) this.laneTarget = rail.x;
        } else {
          // charge needed grows with gap length & rise
          const need = Math.min(1, (gapLen - 3) / 7 + rise * 0.22 + 0.15);
          const chargeLead = need * TUNE.chargeTime * r.speed; // distance covered while charging
          const err = (1 - this.skill) * (Math.random() - 0.35) * 2.2;
          if (!this.jumpPlan && dist < chargeLead + 2.5) {
            this.jumpPlan = { edge, releaseZ: edge.zEdge - 0.6 + err };
            r.holdJump();
          }
        }
      }
      if (this.jumpPlan) {
        if (r.pos.z >= this.jumpPlan.releaseZ) {
          r.releaseJump();
          this.jumpPlan = null;
        } else if (!edgeStillAhead(this.jumpPlan.edge, r.pos.z)) {
          this.jumpPlan = null; // already crossed somehow
        }
      }
    } else if (this.jumpPlan && r.state !== STATES.GROUND) {
      // got launched some other way; drop the plan
      if (r.charging) r.releaseJump();
      this.jumpPlan = null;
    }
  }
}

function edgeStillAhead(edge, z) {
  return edge.zEdge >= z - 1;
}

export function createBots(course, scene, count = 7) {
  const bots = [];
  for (let i = 0; i < count; i++) {
    // varied skill so the pack spreads out
    const skill = 0.35 + (i / Math.max(1, count - 1)) * 0.55;
    bots.push(new Bot(course, scene, i, skill));
  }
  return bots;
}
