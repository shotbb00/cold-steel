// The AI in a pitched battle (modes/pitched.js): no points, so no operations — it builds an army,
// sets it up, waits a little, then advances as a body on your main force and fights it out.
//   build    at the start (the clock stopped): buys an army for its budget in one of three styles,
//            picked at random — balanced, armoured (horse in 1806), or infantry — keeping RESERVE
//            of it for support, and draws it up: foot in front, armour and horse on the wings,
//            guns behind.
//   hold     the first HOLD seconds: it stands and lets you come (and fires on what does).
//   advance  every few seconds the fighting stacks head for the enemy force it has seen (else
//            the enemy base), each keeping its place in the line; guns stay and fire from where
//            they are. A stack already fighting is left to it.
// Support with what CP is left: an air strike on what it sees (1945 / 1985); the 1806 powers run
// by themselves (systems/Powers1806.js), and 1806 foot keeps its drill (FrontlineDirector.drill).
import { enemyOf } from '../data/factions.js';
import { UNIT_TYPES } from '../data/units/index.js';
import { unitCost } from '../data/doctrine.js';
import { FrontlineDirector } from './FrontlineDirector.js';
import { AIState } from './StackAI.js';
import { SeaDirector } from './SeaDirector.js';
import { getUnitType } from '../data/units/index.js';
import { year } from '../data/epoch.js';

// at sea: the fleet it buys, in this order (within the class limits), and where each class goes
const FLEET = ['destroyer', 'cruiser', 'destroyer', 'lightCruiser', 'ptBoat', 'frigate', 'battleship', 'submarine', 'carrier', 'missileSub', 'destroyer', 'cruiser', 'escortCarrier', 'ptBoat', 'frigate', 'submarine', 'destroyer', 'lightCruiser', 'destroyer'];
const FLEET_1806 = ['cruiser', 'frigate', 'cruiser', 'battleship', 'destroyer', 'cruiser', 'fireship', 'frigate', 'cruiser', 'ptBoat', 'destroyer', 'cruiser']; // (under sail: the line of battle first)

const RESERVE = 0.12;       // of the budget kept for support
const HOLD = [35, 70];      // s standing before it advances
const THINK = 6;            // s between orders
const STYLES = {            // weights per category
  balanced: { infantry: 5, armour: 3, cavalry: 3, fire: 2, airdefence: 1 },
  armour: { infantry: 3, armour: 7, cavalry: 7, fire: 1, airdefence: 1 },
  infantry: { infantry: 9, armour: 1, cavalry: 1, fire: 2, airdefence: 0.5 },
};
// the backbone of an army comes up more often than the specialists (weights within a category)
const CORE = { rifles: 5, mgTeam: 3, atTeam: 3, tank: 4, heavyTank: 2, ifv: 2, reconVehicle: 2, artillery: 2 };
const pickWeighted = (entries) => {
  let r = Math.random() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[entries.length - 1]?.[0];
};

export class PitchedDirector {
  constructor(game, faction, state) {
    this.game = game;
    this.faction = faction;
    this.bot = true; // (systems/AutoFlares.js: a bot fires its own flares)
    this.state = state;
    const names = Object.keys(STYLES);
    this.style = names[Math.floor(Math.random() * names.length)];
    this.holdUntil = null;
    this.thinkT = 0;
    this.build();
  }

  get now() { return this.game.world.time; }
  myStacks() { return this.game.world.stacksOf(this.faction); }

  /** At sea: a fleet for the budget, in line abreast — the carrier behind, the submarines out ahead. */
  buildFleet() {
    const g = this.game;
    const f = this.faction;
    const army = g.armyOf(f);
    const budget = this.state.cp[f];
    const bought = [];
    const list = year() < 1900 ? FLEET_1806 : FLEET;
    for (let i = 0, misses = 0; misses < list.length && i < 200; i++) {
      const id = list[i % list.length];
      const t = UNIT_TYPES[id] && getUnitType(id);
      if (!t || !this.state.allow?.(t) && this.state.allow) { misses++; continue; } // (a ship this year hasn't got: the next — it used to stop buying there)
      if (t.armies && !t.armies.includes(army)) { misses++; continue; }
      const had = bought.filter((s) => s.type.id === t.id).length;
      if ((t.limit && had >= t.limit) || unitCost(t, army) > this.state.cp[f] - budget * RESERVE) { misses++; continue; }
      const s = this.state.buy(f, t.id);
      if (!s) break; // the stack limit
      bought.push(s);
      misses = 0;
    }
    const base = g.world.bases[f];
    const foe = g.world.bases[enemyOf(f)];
    const dx = foe.x - base.x, dz = foe.z - base.z, len = Math.hypot(dx, dz) || 1;
    const fx = dx / len, fz = dz / len, sx = -fz, sz = fx;
    const facing = Math.atan2(fx, fz);
    const line = bought.filter((s) => !s.stats.carrier && !s.stats.submarine);
    const put = (s, ahead, k) => { const p = g.world.clampToBounds({ x: base.x + fx * ahead + sx * k, z: base.z + fz * ahead + sz * k }); s.placeAt(p.x, p.z, facing); };
    line.forEach((s, i) => put(s, len * 0.12, (i - (line.length - 1) / 2) * 260));
    bought.filter((s) => s.stats.carrier).forEach((s, i) => put(s, len * 0.02, (i - 0.5) * 400));
    bought.filter((s) => s.stats.submarine).forEach((s, i) => put(s, len * 0.22, (i ? 1 : -1) * 700));
    this.sea = new SeaDirector(g, f, this.state, { hunt: true });
  }

  /** Buy the army and draw it up in its zone. */
  build() {
    const g = this.game;
    if (g.world.river?.sea) return this.buildFleet();
    const f = this.faction;
    const army = g.armyOf(f);
    const budget = this.state.cp[f];
    const types = Object.values(UNIT_TYPES).filter((t) => !t.hidden && !t.airOnly && !t.needsRiver && !t.stats.structure && STYLES.balanced[t.category] !== undefined
      && (t.stats.damage ?? 0) > 0 && !t.stats.observer && !t.stats.airRadar && !t.stats.cbRadar && t.id !== 'observers' // (fighting troops only: no radars or spotters)
      && (!t.armies || t.armies.includes(army)) && (g.rules.air !== false || t.category !== 'airdefence'));
    const weights = Object.entries(STYLES[this.style]).filter(([c]) => types.some((t) => t.category === c));
    const bought = [];
    for (let tries = 0; tries < 200; tries++) {
      const left = this.state.cp[f] - budget * RESERVE;
      const cat = pickWeighted(weights);
      const had = (id) => bought.filter((s) => s.type.id === id).length;
      const can = types.filter((t) => t.category === cat && unitCost(t, army) <= left && (CORE[t.id] || had(t.id) < 2)); // (specialists: two of a kind at most)
      if (!can.length) { if (!types.some((t) => unitCost(t, army) <= left)) break; continue; }
      const s = this.state.buy(f, pickWeighted(can.map((t) => [t.id, CORE[t.id] ?? 1])));
      if (!s) break; // the stack limit
      bought.push(s);
    }
    // the line: foot in front, horse and armour on the wings, guns behind
    const base = g.world.bases[f];
    const foe = g.world.bases[enemyOf(f)];
    const dx = foe.x - base.x, dz = foe.z - base.z, len = Math.hypot(dx, dz) || 1;
    const fx = dx / len, fz = dz / len, sx = -fz, sz = fx;
    const facing = Math.atan2(fx, fz);
    const role = (s) => (s.stats.indirect || s.stats.towed || s.type.category === 'fire' || s.type.category === 'airdefence' ? 'back' : s.usesCover ? 'front' : 'wing');
    const rows = { front: [], wing: [], back: [] };
    for (const s of bought) rows[role(s)].push(s);
    const put = (list, ahead, width, wings = false) => list.forEach((s, i) => {
      const k = wings ? (i % 2 ? -1 : 1) * (width * 0.55 + Math.floor(i / 2) * 26) : (i - (list.length - 1) / 2) * Math.min(32, width / Math.max(1, list.length - 1));
      const p = g.world.clampToBounds({ x: base.x + fx * ahead + sx * k, z: base.z + fz * ahead + sz * k });
      s.placeAt(p.x, p.z, facing);
    });
    const w = g.world.bounds.x * 1.2;
    put(rows.front, len * 0.28, w);
    put(rows.wing, len * 0.25, w, true);
    put(rows.back, len * 0.16, w * 0.6);
    this.line = new Map(bought.map((s) => [s, { k: (s.anchor.x - base.x) * sx + (s.anchor.z - base.z) * sz }])); // each stack's place across the line
    this.dir = { fx, fz, sx, sz };
  }

  update(dt) {
    const g = this.game;
    if (this.state.setup || g.net?.isClient) return;
    this.holdUntil ??= this.now + HOLD[0] + Math.random() * (HOLD[1] - HOLD[0]);
    if (this.sea) { this.sea.holdUntil = this.holdUntil; this.sea.update(dt); return; } // (at sea: the admiral, waiting first)
    if (this.myStacks().some((s) => s.stats.formations)) FrontlineDirector.prototype.drill.call(this); // 1806: column, line, square, the bayonet
    if ((this.thinkT -= dt) > 0) return;
    this.thinkT = THINK;
    this.support();
    if (this.now < this.holdUntil) return;
    // the enemy force it knows of — else their base
    const foes = g.world.stacksOf(enemyOf(this.faction)).filter((e) => !e.stats.structure && e.units.some((u) => u.alive && u.spotted));
    let tx, tz;
    if (foes.length) {
      const w = foes.reduce((a, e) => a + e.aliveCount, 0);
      tx = foes.reduce((a, e) => a + e.centroid.x * e.aliveCount, 0) / w;
      tz = foes.reduce((a, e) => a + e.centroid.z * e.aliveCount, 0) / w;
    } else ({ x: tx, z: tz } = g.world.bases[enemyOf(this.faction)]);
    const { fx, fz, sx, sz } = this.dir;
    for (const s of this.myStacks()) {
      if (s.stats.structure || s.stats.loose || s.charging || s.ai.state === AIState.RETREAT || s.ai.state === AIState.ATTACK) continue;
      if (s.stats.indirect || s.stats.towed || s.type.category === 'fire' || s.type.category === 'airdefence') continue; // the guns fire from where they stand
      if (s.ai.targetGroup?.alive) continue; // already fighting
      const k = this.line.get(s)?.k ?? 0;
      const p = g.world.clampToBounds({ x: tx - fx * 40 + sx * k * 0.6, z: tz - fz * 40 + sz * k * 0.6 }); // up to them, still in line
      s.ai.moveTo(p, { ordered: false });
    }
  }

  /** What CP is left: an air strike on enemies it can see (1945 / 1985). */
  support() {
    const g = this.game;
    const air = g.air;
    if (!air || !air.ready?.(this.faction) || (this.state.cp[this.faction] ?? 0) < 240) return;
    const seen = g.world.stacksOf(enemyOf(this.faction)).filter((e) => !e.stats.structure && e.units.some((u) => u.alive && u.spotted));
    if (!seen.length) return;
    const t = seen.sort((a, b) => b.aliveCount * (b.usesCover ? 1 : 3) - a.aliveCount * (a.usesCover ? 1 : 3))[0];
    air.call(this.faction, t.centroid.x, t.centroid.z, null, t.usesCover ? 'heli' : 'jet');
  }
}
