// The first tanks' troubles (1918: data/units1918 `breakdown`, `ditch`). While a vehicle drives,
//   breakdown – the engine, the gearbox or a track gives: it stops where it is (the guns still fire)
//               while the crew mends it, 40–90 s
//   ditch     – crossing a trench or a shell hole it may belly in it and stick: the crew digs and
//               winches it out (the rhomboids' unditching beam), 25–60 s
// A recovery vehicle of its own side within RECOVER m (the supply tank) gets it going three times as
// fast. Britain's All arms (data/epoch.js): infantry of its own close by halves the breakdowns. The
// host decides; a guest sees it stop with the positions.
import { doctrine } from '../data/doctrine.js';

const ESCORT = 30;      // m: infantry this close to a British tank (All arms)
const RECOVER = 40;     // m: a recovery vehicle this close mends it sooner
const HOLE = 0.4;       // m: the ground this much below its surroundings is a hole to belly in
const CHECK = 0.5;      // s between checks

export class Breakdowns {
  constructor(game) {
    this.game = game;
    this.t = 0;
  }

  /** Is (x, z) a trench or a shell hole? (a trench's footprint, or ground lower than all round it) */
  rough(x, z) {
    const g = this.game, h = g.terrain.heightAt(x, z);
    const around = [[4, 0], [-4, 0], [0, 4], [0, -4]].reduce((a, [dx, dz]) => a + g.terrain.heightAt(x + dx, z + dz), 0) / 4;
    if (around - h > HOLE) return true;
    return g.construction.structures.some((s) => s.kind === 'trench' && Math.abs(s.x - x) < 6 && Math.abs(s.z - z) < 6);
  }

  update(dt) {
    const g = this.game;
    if (g.net?.isClient) return;
    this.t -= dt;
    if (this.t > 0) return;
    const step = CHECK - this.t;
    this.t = CHECK;
    for (const s of g.world.stacks) {
      const st = s.stats;
      if (!s.alive || (!st.breakdown && !st.ditch)) continue;
      const near = (test, r) => g.world.stacks.some((o) => o !== s && o.alive && o.faction === s.faction && test(o) && Math.hypot(o.centroid.x - s.centroid.x, o.centroid.z - s.centroid.z) < r);
      for (const u of s.units) {
        if (!u.alive) continue;
        if (u.fault) { // mending
          u.fault.t -= step * (near((o) => !!o.stats.repair, RECOVER) ? 3 : 1);
          if (u.fault.t <= 0) {
            u.speedMul = u.fault.prev;
            u.fault = null;
            if (g.isHuman(s.faction)) g.tell(s.faction, `${s.name}: moving again`);
          }
          continue;
        }
        if (!u.moving) continue;
        const escorted = doctrine(g, s.faction, 'allArms') && near((o) => o.usesCover, ESCORT);
        if (st.breakdown && Math.random() < st.breakdown * step * (escorted ? 0.5 : 1)) this.stop(s, u, 40 + Math.random() * 50, 'broken down — the crew is at the engine');
        else if (st.ditch && Math.random() < st.ditch * step && this.rough(u.pos.x, u.pos.z)) this.stop(s, u, 25 + Math.random() * 35, 'ditched — digging out');
      }
    }
  }

  stop(s, u, time, why) {
    u.fault = { t: time, prev: u.speedMul ?? 1 };
    u.speedMul = 0;
    this.game.effects.dust(u.pos, 2);
    this.game.tell(s.faction, `${s.name}: ${why}`);
  }
}
