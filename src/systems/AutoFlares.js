// Flares on their own at night, for a side the player commands (the bots fire theirs themselves:
// ai/FrontlineDirector illuminate, ai/SeaDirector star shells). When one of our units is being shot
// at from the dark, a mortar or ship with illumination rounds puts one over the shooter — rarely
// (one a side every AUTO_EVERY s or so), never where it would light up our own men, and always
// keeping the last round for the player's own use.
import { enemyOf } from '../data/factions.js';

const AUTO_EVERY = [45, 70]; // s between a side's own flares
const HIT_RECENT = 8;        // s: a unit shot at this recently is "under fire"
const THREAT = 300;          // m: an enemy glimpsed this close to our men is worth lighting
const LAND_LIGHT = 110;      // m a flare lights (systems/Flares.js RADIUS); a star shell 450 (core/Orders.js)
const SEA_LIGHT = 450;

export class AutoFlares {
  constructor(game) {
    this.game = game;
    this.next = {};
    this.t = 0;
  }

  update(dt) {
    const g = this.game;
    if (!g.conditions?.night || (this.t += dt) < 2) return;
    this.t = 0;
    const now = g.world.time;
    for (const f of ['nato', 'pact']) {
      if (now < (this.next[f] ?? 0) || g.systems.some((s) => s.bot && s.faction === f)) continue; // (a bot's side: it has its own)
      const shot = this.target(f, now);
      if (shot) {
        g.orders.run(f, { t: 'flare', s: [shot.by.id], x: Math.round(shot.x), z: Math.round(shot.z) });
        this.next[f] = now + AUTO_EVERY[0] + Math.random() * (AUTO_EVERY[1] - AUTO_EVERY[0]);
      }
    }
  }

  /**
   * A shooter of ours with rounds to spare, and a spot over an enemy close to our men — one firing on
   * them, or one we glimpse (a muzzle flash, a shape) within THREAT m — that no flare lights yet.
   */
  target(f, now) {
    const g = this.game;
    const mine = g.world.stacksOf(f).filter((s) => s.alive);
    const guns = mine.filter((s) => s.flareRounds > 1 && !s.smokeOrder);
    if (!guns.length) return null;
    const near = (foe) => mine.reduce((best, s) => { const d = Math.hypot(foe.centroid.x - s.centroid.x, foe.centroid.z - s.centroid.z); return d < best.d ? { s, d } : best; }, { s: null, d: Infinity });
    const threats = [];
    for (const s of mine) if (s.lastAttacker?.alive && s.lastAttacker.faction === enemyOf(f) && now - (s.lastHitTime ?? -1e9) < HIT_RECENT) threats.push([s.lastAttacker, s]);
    for (const foe of g.world.stacksOf(enemyOf(f))) {
      if (!foe.alive || !foe.units.some((u) => u.alive && u.spotted)) continue;
      const n = near(foe);
      if (n.d < THREAT) threats.push([foe, n.s]);
    }
    for (const [foe, s] of threats) {
      if (g.flares?.lit(foe.centroid.x, foe.centroid.z)) continue;
      for (const by of guns) {
        const light = by.stats.naval ? SEA_LIGHT : LAND_LIGHT;
        // aimed past the enemy, away from our nearest men: he stays in the light, they at its edge
        const ax = foe.centroid.x - s.centroid.x, az = foe.centroid.z - s.centroid.z, al = Math.hypot(ax, az) || 1;
        let x = foe.centroid.x + (ax / al) * light * 0.45, z = foe.centroid.z + (az / al) * light * 0.45;
        const range = by.unitStats(0).range, d = Math.hypot(x - by.centroid.x, z - by.centroid.z);
        if (d > range) { x = by.centroid.x + ((x - by.centroid.x) * range) / d; z = by.centroid.z + ((z - by.centroid.z) * range) / d; } // (past its reach: as far as it reaches)
        if (Math.hypot(x - foe.centroid.x, z - foe.centroid.z) > light * 0.8) continue; // (he'd be out of the light)
        if (mine.some((o) => Math.hypot(o.centroid.x - x, o.centroid.z - z) < light * 0.45)) continue; // (our own men would stand under it: at its edge is fine — a night fight is close)
        return { by, x, z };
      }
    }
    return null;
  }
}
