// Electronic warfare (data/units/jammer.ts): a jammer parked for `deploy` seconds with its mast up
// fills a circle of `radius` with noise on the other side's radio nets:
//   • support calls aimed inside it — air strikes, gas — come late and land off the mark
//   • the other side's forward observers inside it lose their fire-direction bonus
//   • the other side's radars inside it (air search, counter-battery) go blind
// A jammer transmitting is easy to find by direction-finding: while it works, the enemy sees it.
export const JAM = { delay: 8, miss: 25 }; // seconds a jammed support call is late; metres it may land off

export class Jamming {
  constructor(game) {
    this.game = game;
    this.list = new Map();   // unit → { at, still }
  }

  update(dt) {
    const g = this.game;
    for (const s of g.world.stacks) {
      const J = s.stats.jammer;
      if (!J) continue;
      for (const u of s.units) {
        if (!this.list.has(u)) this.list.set(u, { faction: s.faction, radius: J.radius });
        u.jamming = s.setUpFully(u); // set up (UnitStack)
        if (u.jamming) u.locatedUntil = Math.max(u.locatedUntil ?? 0, g.time + 1.5); // direction-found while it transmits
      }
    }
  }

  /** Is (x, z) under a working jammer of `faction`'s enemies? */
  jammed(faction, x, z) {
    for (const [u, r] of this.list) {
      if (r.faction === faction || !u.jamming) continue;
      if ((u.pos.x - x) ** 2 + (u.pos.z - z) ** 2 < r.radius * r.radius) return true;
    }
    return false;
  }
}
