// The computer's admiral on the open-sea maps (Frontline at sea: modes/frontline.js runs this
// instead of the land army's FrontlineDirector). Every few seconds it:
//   buys     – a fleet in turns (destroyers, escorts, cruisers, a submarine, the carrier, the
//              battleship), within the class limits and the stack cap
//   steers   – the surface ships to the nearest zone it doesn't hold (a contested one first); the
//              carrier hangs back by the home zone with an escort; the submarines go out ahead at
//              periscope depth — found by a hunter, they dive deep and run silent, and come back
//              up once it has lost them; at night the Imperial Navy's destroyers go in with the
//              torpedo against the enemy's big ships
//   strikes  – with its carrier: bombers at the most valuable ship it can see (carrier, battleship,
//              cruiser…), fighters over its own fleet when enemy aircraft come, a scout when it
//              sees nothing
import { enemyOf } from '../data/factions.js';
import { UNIT_TYPES, getUnitType } from '../data/units/index.js';
import { unitCost } from '../data/doctrine.js';

const THINK = 3;          // s between looks at the fleet
const AIR_EVERY = 8;      // s between looks at the air
const ORDER = ['destroyer', 'frigate', 'cruiser', 'destroyer', 'submarine', 'carrier', 'destroyer', 'battleship', 'cruiser', 'frigate', 'submarine', 'destroyer'];
const VALUE = { carrier: 5, battleship: 4, cruiser: 3, destroyer: 2, frigate: 1, submarine: 1 };

export class SeaDirector {
  constructor(game, faction, state, { tempo = 1 } = {}) {
    this.game = game;
    this.faction = faction;
    this.state = state;
    this.tempo = tempo;
    this.t = 0;
    this.airT = 4;
    this.buyIndex = 0;
  }

  get points() { return this.state.points.points; }
  ships() { return this.game.world.stacksOf(this.faction).filter((s) => s.alive && s.stats.naval); }
  foes() { return this.game.world.stacksOf(enemyOf(this.faction)).filter((s) => s.alive && s.stats.naval); }
  move(s, x, z) { this.game.orders.run(this.faction, { t: 'move', m: [[s.id, Math.round(x), Math.round(z)]] }, 'ai'); }

  update(dt) {
    this.t -= dt * this.tempo;
    this.airT -= dt;
    if (this.t <= 0) {
      this.t = THINK;
      this.buy();
      this.steer();
    }
    if (this.airT <= 0) {
      this.airT = AIR_EVERY;
      this.air();
    }
  }

  buy() {
    const mine = this.ships();
    if (mine.length >= this.state.maxStacks) return;
    const army = this.game.armyOf(this.faction);
    const allowed = (id) => !!UNIT_TYPES[id] && (!this.state.allow || this.state.allow(getUnitType(id)));
    const capped = (id) => { const t = getUnitType(id); return t.limit && mine.filter((s) => s.type.id === id).length >= t.limit; };
    for (let tries = 0; tries < ORDER.length; tries++) {
      const id = ORDER[this.buyIndex % ORDER.length];
      if (!allowed(id) || capped(id)) { this.buyIndex++; continue; }
      if (this.state.cp[this.faction] >= unitCost(getUnitType(id), army)) {
        this.state.buy(this.faction, id);
        this.buyIndex++;
      }
      return; // bought, or saving up for it
    }
  }

  /** The zone to go for: a contested one of ours or theirs first, then the nearest not ours to our home. */
  objective() {
    const home = this.points.find((p) => p.owner === this.faction) ?? this.game.world.bases[this.faction];
    const open = this.points.filter((p) => p.owner !== this.faction);
    const contested = this.points.find((p) => p.contested);
    if (contested) return contested;
    return open.sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z))[0] ?? home;
  }

  steer() {
    const g = this.game;
    const target = this.objective();
    const home = this.game.world.bases[this.faction];
    const night = !!g.conditions?.night;
    const bigFoes = this.foes().filter((s) => s.units[0]?.spotted && VALUE[s.type.id] >= 3);
    const fleet = this.ships();
    let escort = null;
    for (const s of fleet) {
      const u = s.units[0];
      if (!u?.alive || s.ai.ordered) continue; // (a player's ships in co-op are theirs to steer)
      const d = (p) => Math.hypot(u.pos.x - p.x, u.pos.z - p.z);
      if (s.type.id === 'carrier') { // back by home, a little toward the fight
        const want = { x: home.x + (target.x - home.x) * 0.15, z: home.z + (target.z - home.z) * 0.15 };
        if (d(want) > 250 && !s.moveTarget) this.move(s, want.x, want.z);
        continue;
      }
      if (s.stats.submarine) { this.submarine(s, u, target); continue; }
      if (s.type.id === 'frigate' && !escort && fleet.some((o) => o.type.id === 'carrier')) { // one escort stays with the carrier
        escort = s;
        const cv = fleet.find((o) => o.type.id === 'carrier').units[0];
        if (d(cv.pos) > 400 && !s.moveTarget) this.move(s, cv.pos.x + 200, cv.pos.z + (home.z > 0 ? -150 : 150));
        continue;
      }
      // the Imperial Navy at night: the destroyers go in with the Long Lance at the big ships
      if (night && s.type.id === 'destroyer' && this.game.armyOf(this.faction) !== 'us' && this.faction === 'pact' && bigFoes.length) {
        const b = bigFoes.sort((a, c) => d(a.centroid) - d(c.centroid))[0];
        if (d(b.centroid) > 1200) this.move(s, b.centroid.x, b.centroid.z);
        continue;
      }
      if (u.target && d(u.target.pos) < (s.stats.range ?? 2000) * 0.9) continue; // in a fight already: let the guns work
      if (d(target) > target.radius * 0.6) {
        // spread out round the zone a little, each its own spot
        const a = (s.id * 2.399) % (Math.PI * 2);
        const r = target.radius * 0.45;
        const goal = { x: target.x + Math.cos(a) * r, z: target.z + Math.sin(a) * r };
        if (!s.moveTarget || Math.hypot(s.moveTarget.x - goal.x, s.moveTarget.z - goal.z) > 80) this.move(s, goal.x, goal.z);
      }
    }
  }

  /** A submarine: out ahead at periscope depth; found by a hunter, deep and silent until it has lost the boat. */
  submarine(s, u, target) {
    const g = this.game;
    const hunter = this.foes().some((f) => f.stats.depthCharges && f.units.some((v) => v.alive && Math.hypot(v.pos.x - u.pos.x, v.pos.z - u.pos.z) < 900));
    if (u.spotted && hunter) {
      if (u.depthMode !== 'deep') g.orders.run(this.faction, { t: 'subDepth', s: [s.id], d: 'deep' }, 'ai');
      if (!s.silent) g.orders.run(this.faction, { t: 'silent', s: [s.id], on: 1 }, 'ai');
      s.hidingSince = g.time;
      return;
    }
    if (u.depthMode === 'deep' && g.time - (s.hidingSince ?? 0) > 30) { // it's quiet up there again
      g.orders.run(this.faction, { t: 'subDepth', s: [s.id], d: 'periscope' }, 'ai');
      g.orders.run(this.faction, { t: 'silent', s: [s.id], on: 0 }, 'ai');
    }
    if (u.target || s.moveTarget) return;
    // lie in wait beyond the zone, on the enemy's side of it
    const foeHome = g.world.bases[enemyOf(this.faction)];
    this.move(s, target.x + (foeHome.x - target.x) * 0.25, target.z + (foeHome.z - target.z) * 0.25);
  }

  /** The carrier's air group: strikes at the best ship in sight, fighters over the fleet, a scout when blind. */
  air() {
    const g = this.game;
    const f = this.faction;
    const fleet = this.ships();
    if (!fleet.some((s) => s.stats.carrier && s.units[0]?.alive)) return;
    const support = this.state.support?.[f] ?? this.state.cp[f];
    const seen = this.foes().filter((s) => s.units.some((u) => u.alive && u.spotted && (u.depth ?? 0) < 1));
    const best = seen.sort((a, b) => (VALUE[b.type.id] ?? 0) - (VALUE[a.type.id] ?? 0))[0];
    const call = (kind, x, z) => g.air.ready(f, kind) && support >= g.air.terms(f, kind).cost && g.air.call(f, x, z, null, kind);
    if (best) {
      const c = best.centroid;
      if (call('torpBomb', c.x, c.z)) return;
      if (call('diveBomb', c.x, c.z)) return;
    }
    const mid = fleet.reduce((a, s) => ({ x: a.x + s.centroid.x / fleet.length, z: a.z + s.centroid.z / fleet.length }), { x: 0, z: 0 });
    if (g.air.nearestThreat(f, { x: mid.x, y: 0, z: mid.z }, 2500) && call('navCap', mid.x, mid.z)) return;
    if (!seen.length) {
      const foeHome = g.world.bases[enemyOf(f)];
      call('navScout', (mid.x + foeHome.x) / 2, (mid.z + foeHome.z) / 2);
    }
  }
}
