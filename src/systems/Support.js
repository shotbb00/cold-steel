// Battlefield support: recovery vehicles (data/units/recovery.js, `repair`) mend friendly
// vehicles parked near them — hit points back, mine-blown tracks fixed after a few seconds —
// and field ambulances (ambulance.js, `heal`) patch up wounded infantry nearby. Left to
// themselves (no order of the player's standing), both drive to the nearest friendly work
// within `seek` metres that isn't in the middle of a fight. Runs where the simulation runs
// (the multiplayer host), twice a second.
import { dist2DSq } from '../core/math.js';
import { AIState } from '../ai/StackAI.js';

const TICK = 0.5;
const SEEK_EVERY = 3;   // seconds between looking for new work

export class Support {
  constructor(game) {
    this.game = game;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.t < TICK) return;
    const step = this.t;
    this.t = 0;
    const world = this.game.world;
    for (const s of world.stacks) {
      if (!s.alive) continue;
      const job = s.stats.repair ?? s.stats.heal;
      if (!job) continue;
      const repair = !!s.stats.repair;
      let working = false;
      for (const o of world.stacksOf(s.faction)) {
        if (o === s || !o.alive || o.stats.structure || o.usesCover === repair) continue;
        for (const u of o.units) {
          if (!u.alive || !this.needs(u, repair) || !s.units.some((m) => m.alive && dist2DSq(m.pos, u.pos) < job.range * job.range)) continue;
          working = true;
          u.hp = Math.min(u.maxHp, u.hp + job.rate * step);
          if (!u.wounded) u.woundedBarked = false;
          if (repair && u.speedMul === 0) {
            u.mendT = (u.mendT ?? 0) + step;
            if (u.mendT >= job.mend) {
              u.speedMul = 0.95;
              u.mendT = 0;
              this.game.tell(s.faction, `${s.name}: ${o.name} is moving again`);
            }
          }
        }
      }
      s.working = working;
      if (!working) this.seek(s, job, repair);
    }
  }

  needs(u, repair) {
    return repair ? u.hp < u.maxHp || u.speedMul === 0 : u.hp < u.maxHp;
  }

  /** Idle and unordered: drive over to the nearest friendly that needs us, away from the fighting. */
  seek(s, job, repair) {
    const now = this.game.time;
    if (now < (s.seekAt ?? 0)) return;
    s.seekAt = now + SEEK_EVERY;
    const ai = s.ai;
    if (ai.ordered || s.leader || (ai.state !== AIState.IDLE && ai.state !== AIState.DEFEND)) return;
    let best = null;
    let bestD = job.seek * job.seek;
    for (const o of this.game.world.stacksOf(s.faction)) {
      if (o === s || !o.alive || o.stats.structure || o.usesCover === repair) continue;
      if (this.game.time - o.lastHitTime < 6) continue; // still under fire: wait for it to pull back
      for (const u of o.units) {
        if (!u.alive || !(repair ? u.hp < u.maxHp * 0.8 || u.speedMul === 0 : u.wounded)) continue;
        const d = dist2DSq(u.pos, s.centroid);
        if (d < bestD && d > job.range * job.range * 0.5) { bestD = d; best = u; }
      }
    }
    if (best) ai.moveTo({ x: best.pos.x, z: best.pos.z }, { hold: true, ordered: false });
  }
}
