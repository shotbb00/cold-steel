// The computer's admiral on the open-sea maps (Frontline at sea: modes/frontline.js runs this
// instead of the land army's FrontlineDirector). Every few seconds it:
//   buys     – a fleet in turns (destroyers, escorts, cruisers, a submarine, the carrier, the
//              battleship), within the class limits and the stack cap
//   steers   – the surface ships to the nearest zone it doesn't hold (a contested one first); the
//              carrier hangs back by the home zone with an escort; the submarines go out ahead at
//              periscope depth — found by a hunter, they dive deep and run silent, and come back
//              up once it has lost them; at night the Imperial Navy's destroyers go in with the
//              torpedo against the enemy's big ships
//   hunt     – (Pitched battle and Skirmish at sea: no zones) the objective is the enemy fleet it has
//              seen, else their base; `holdUntil` keeps it waiting first, and it does nothing while
//              the battle is still being set up (state.setup)
//   strikes  – with its carrier: bombers at the most valuable ship it can see (carrier, battleship,
//              cruiser…), fighters over its own fleet when enemy aircraft come, a scout when it
//              sees nothing
import { enemyOf } from '../data/factions.js';
import { UNIT_TYPES, getUnitType } from '../data/units/index.js';
import { unitCost } from '../data/doctrine.js';
import { year } from '../data/epoch.js';
import { windFrom } from '../entities/sailing.js';

const THINK = 3;          // s between looks at the fleet
const AIR_EVERY = 8;      // s between looks at the air
const ORDER = ['destroyer', 'frigate', 'cruiser', 'ptBoat', 'destroyer', 'lightCruiser', 'submarine', 'transport', 'carrier', 'destroyer', 'missileSub', 'battleship', 'escortCarrier', 'cruiser', 'ptBoat', 'frigate', 'submarine', 'destroyer']; // (missileSub: 1985 only — the others skip what their year doesn't have)
const SEA_ROOM = 160;   // m off the shallows the admiral wants his ships' spots (seaRoom)
const ORDER_1806 = ['cruiser', 'frigate', 'cruiser', 'destroyer', 'cruiser', 'battleship', 'frigate', 'cruiser', 'fireship', 'cruiser', 'destroyer', 'ptBoat']; // (under sail: the line first)
const VALUE = { carrier: 5, battleship: 4, escortCarrier: 4, cruiser: 3, lightCruiser: 3, destroyer: 2, transport: 2, frigate: 1, submarine: 1, ptBoat: 1 };

export class SeaDirector {
  constructor(game, faction, state, { tempo = 1, hunt = false, holdUntil = null } = {}) {
    this.game = game;
    this.faction = faction;
    this.bot = true; // (systems/AutoFlares.js: a bot fires its own flares)
    this.state = state;
    this.tempo = tempo;
    this.hunt = hunt;
    this.holdUntil = holdUntil;
    this.t = 0;
    this.airT = 4;
    this.buyIndex = 0;
  }

  get points() { return this.state.points?.points ?? []; }
  ships() { return this.game.world.stacksOf(this.faction).filter((s) => s.alive && s.stats.naval); }
  foes() { return this.game.world.stacksOf(enemyOf(this.faction)).filter((s) => s.alive && s.stats.naval); }
  move(s, x, z) { this.game.orders.run(this.faction, { t: 'move', m: [[s.id, Math.round(x), Math.round(z)]] }, 'ai'); }

  update(dt) {
    if (this.state.setup || this.game.net?.isClient) return;
    this.t -= dt * this.tempo;
    this.airT -= dt;
    if (this.t <= 0) {
      this.t = THINK;
      this.buy();
      if (this.holdUntil == null || this.game.world.time >= this.holdUntil) this.steer();
    }
    if (this.airT <= 0) {
      this.airT = AIR_EVERY;
      this.air();
    }
  }

  buy() {
    if (!this.state.buy) return; // (a fleet it was given: Pitched battle, Skirmish)
    const mine = this.ships();
    if (mine.length >= this.state.maxStacks) return;
    const army = this.game.armyOf(this.faction);
    const allowed = (id) => !!UNIT_TYPES[id] && (!this.state.allow || this.state.allow(getUnitType(id)));
    const capped = (id) => { const t = getUnitType(id); return t.limit && mine.filter((s) => s.type.id === id).length >= t.limit; };
    for (let tries = 0; tries < (year() < 1900 ? ORDER_1806 : ORDER).length; tries++) {
      const list = year() < 1900 ? ORDER_1806 : ORDER;
      const id = list[this.buyIndex % list.length];
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
    if (this.hunt) { // the enemy's ships it can see (their middle), else their base
      const seen = this.foes().filter((s) => s.units.some((u) => u.alive && u.spotted));
      if (seen.length) return { x: seen.reduce((a, s) => a + s.centroid.x, 0) / seen.length, z: seen.reduce((a, s) => a + s.centroid.z, 0) / seen.length, radius: 500 };
      const b = this.game.world.bases[enemyOf(this.faction)];
      return { x: b.x, z: b.z, radius: 600 };
    }
    const home = this.points.find((p) => p.owner === this.faction) ?? this.game.world.bases[this.faction];
    const open = this.points.filter((p) => p.owner !== this.faction);
    const contested = this.points.find((p) => p.contested);
    if (contested) return contested;
    return open.sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z))[0] ?? home;
  }

  /**
   * Radar discipline (1985): one picket radiating — the smallest ship — the rest silent, until there is contact
   * (an enemy seen, a missile in the air); then every radar on, and silent again a minute after the last contact.
   */
  emcon(fleet) {
    const g = this.game, now = g.world.time;
    const radars = fleet.filter((s) => s.stats.radar && s.units[0]?.alive);
    if (!radars.length) return;
    if (this.foes().some((s) => s.units.some((u) => u.alive && u.spotted && (u.depth ?? 0) < 1)) || g.missiles?.list.some((m) => m.faction !== this.faction)) this.contactAt = now;
    const loud = now - (this.contactAt ?? -999) < 60;
    const picket = radars.filter((s) => !s.stats.carrier).sort((a, b) => (VALUE[a.type.id] ?? 0) - (VALUE[b.type.id] ?? 0))[0] ?? radars[0];
    for (const s of radars) {
      const on = loud || s === picket;
      if ((s.radarOn !== false) !== on) g.orders.run(this.faction, { t: 'radar', s: [s.id], on: on ? 1 : 0 }, 'ai');
    }
  }

  /** An enemy radar it hears but can't see (systems/Sensors.js fixes): a missile salvo at the fix, now and then. */
  fireAtFixes(fleet) {
    const g = this.game, now = g.world.time;
    for (const fx of g.sensors?.fixes?.[this.faction] ?? []) {
      if (fx.stack.units.some((u) => u.alive && u.spotted)) continue; // (seen: the ships fire at her on their own)
      if ((this.fixFired?.[fx.stack.id] ?? -999) > now - 50) continue;
      const shooter = fleet.find((s) => { const u = s.units[0]; return u?.alive && (u.depth ?? 0) <= 9 && s.shipMounts(u).some((m) => m.missile && !m.out && m.left > 0 && Math.hypot(fx.x - u.pos.x, fx.z - u.pos.z) < m.range); });
      if (!shooter) continue;
      (this.fixFired ??= {})[fx.stack.id] = now;
      g.orders.run(this.faction, { t: 'missileAt', s: [shooter.id], x: Math.round(fx.x), z: Math.round(fx.z), n: 4 }, 'ai');
      return;
    }
  }

  /** Its ships' helicopters (1985): to a lost submarine contact, else ahead toward the enemy to see what's there. */
  helos(fleet) {
    const g = this.game, now = g.world.time;
    const seen = this.foes().some((s) => s.units.some((u) => u.alive && u.spotted));
    // a submarine its sonar held lately and has lost (contactAt: VisibilitySystem.underwater) — searched near where it was
    const sub = this.foes().flatMap((f) => f.units).find((u) => u.alive && u.stack.stats.submarine && !u.spotted && now - (u.contactAt ?? -99) < 40);
    const lost = sub && { x: sub.pos.x + (Math.random() - 0.5) * 300, z: sub.pos.z + (Math.random() - 0.5) * 300 };
    const foeHome = g.world.bases[enemyOf(this.faction)];
    for (const s of fleet) {
      const u = s.units[0];
      if (!u?.alive || !s.stats.helo || s.heloReadyAt > now || Math.random() > 0.35) continue;
      const to = lost && Math.hypot(lost.x - u.pos.x, lost.z - u.pos.z) < 2500 ? lost
        : !seen ? { x: u.pos.x + (foeHome.x - u.pos.x) * 0.35, z: u.pos.z + Math.sign(foeHome.z - u.pos.z) * 1300 } : null;
      if (to) { g.orders.run(this.faction, { t: 'helo', s: [s.id], x: Math.round(to.x), z: Math.round(to.z) }, 'ai'); return; }
    }
  }

  steer() {
    const g = this.game;
    this.emcon(this.ships());
    this.helos(this.ships()); // (missiles at fixes: every ship does that herself, either side — UnitStack.fireAtFix)
    const target = this.objective();
    const home = this.game.world.bases[this.faction];
    const night = !!g.conditions?.night;
    const bigFoes = this.foes().filter((s) => s.units[0]?.spotted && VALUE[s.type.id] >= 3);
    const fleet = this.ships();
    let escort = null;
    const line = fleet.filter((s) => s.stats.sail && !s.anchored && (s.type.id === 'cruiser' || s.type.id === 'battleship') && !s.units[0]?.struck && !s.units[0]?.grappled && !s.boardTarget && !s.owner);
    if (line.length >= 2 && line.filter((s) => !s.station).length > 1 && (this.lineT = (this.lineT ?? 0) - 1) <= 0) {
      this.lineT = 12; // (every dozen thoughts at most: let the line settle)
      g.orders.run(this.faction, { t: 'formation', s: line.map((s) => s.id), f: 'ahead' }, 'ai');
    }
    // the weather gauge: from upwind of the enemy (the wind behind, the choice of when to close), then down onto him
    const from = windFrom(), up = { x: Math.sin(from), z: Math.cos(from) };
    for (const s of fleet) {
      const u = s.units[0];
      if (!u?.alive || u.struck || s.owner) continue;
      const d = (p) => Math.hypot(u.pos.x - p.x, u.pos.z - p.z);
      if (s.stats.sail && !s.boardTarget && !u.grappled) { // (1806: a prize to be had — struck, or her crew cut down and his not)
        const prize = this.foes().filter((f) => f.stats.sail && f.units[0]?.alive && (f.units[0].struck || ((f.units[0].crew ?? 1) < 0.35 && (u.crew ?? 1) > 0.6)) && d(f.units[0].pos) < 1200).sort((a, b) => d(a.units[0].pos) - d(b.units[0].pos))[0];
        if (prize) { g.orders.run(this.faction, { t: 'board', s: [s.id], target: prize.id }, 'ai'); continue; }
      }
      if (s.boardTarget) continue; // (on her way alongside)
      if (s.stats.fireship) { // (1806: down onto the nearest enemy she can see — the bigger the better)
        const prey = this.foes().filter((f) => f.stats.sail && f.units[0]?.spotted && !f.units[0].struck).sort((a, b) => d(a.units[0].pos) - (VALUE[a.type.id] ?? 1) * 150 - d(b.units[0].pos) + (VALUE[b.type.id] ?? 1) * 150)[0];
        if (prey) { this.move(s, prey.units[0].pos.x, prey.units[0].pos.z); continue; }
      } // (a player's ships in co-op — owned by host or guest — are theirs to steer; its own move orders mark the rest 'ordered' too)
      if (s.stats.carrier) { // back by home, a little toward the fight
        const want = { x: home.x + (target.x - home.x) * 0.15, z: home.z + (target.z - home.z) * 0.15 };
        if (d(want) > 250 && !s.moveTarget) this.move(s, want.x, want.z);
        continue;
      }
      if (s.stats.submarine) { this.submarine(s, u, target); continue; }
      if (s.stats.landing) { // a transport: to the nearest zone we hold (her landing parties bring in CP there), and stays
        const held = this.points.filter((p) => p.owner === this.faction && !p.contested).sort((a, b) => d(a) - d(b))[0];
        if (held && d(held) > held.radius * 0.5 && !s.moveTarget) this.move(s, held.x, held.z);
        continue;
      }
      if (s.stats.smallCraft) { // a PT boat: a torpedo run at the biggest enemy ship within reach (at night from anywhere), else with the fleet
        const prey = this.foes().filter((f) => f.units[0]?.spotted && (VALUE[f.type.id] ?? 0) >= 2 && (night || d(f.centroid) < 1400)).sort((a, b) => (VALUE[b.type.id] ?? 0) - (VALUE[a.type.id] ?? 0) || d(a.centroid) - d(b.centroid))[0];
        if (prey) { if (!s.moveTarget || Math.hypot(s.moveTarget.x - prey.centroid.x, s.moveTarget.z - prey.centroid.z) > 150) this.move(s, prey.centroid.x, prey.centroid.z); continue; }
      }
      if (s.type.id === 'frigate' && !escort && fleet.some((o) => o.stats.carrier)) { // one escort stays with the carrier
        escort = s;
        const cv = fleet.find((o) => o.stats.carrier).units[0];
        if (d(cv.pos) > 400 && !s.moveTarget) this.move(s, cv.pos.x + 200, cv.pos.z + (home.z > 0 ? -150 : 150));
        continue;
      }
      // the Imperial Navy at night: the destroyers go in with the Long Lance at the big ships
      if (night && s.type.id === 'destroyer' && this.game.armyOf(this.faction) !== 'us' && this.faction === 'pact' && bigFoes.length) {
        const b = bigFoes.sort((a, c) => d(a.centroid) - d(c.centroid))[0];
        if (d(b.centroid) > 1200) this.move(s, b.centroid.x, b.centroid.z);
        continue;
      }
      // damage control where it's worst: a big fire first, then the flooding, else repairs; a bad list is counter-flooded
      const want = (u.blaze ?? 0) > 0.4 ? 'fire' : (u.flood ?? 0) > 0.3 || (u.leak ?? 0) > 0.004 ? 'flood' : u.engineHit || u.rudderHit > g.world.time ? 'repair' : 'auto';
      if ((u.dc ?? 'auto') !== want) g.orders.run(this.faction, { t: 'damageControl', s: [s.id], p: want }, 'ai');
      if (Math.abs(u.list ?? 0) > 0.08 && u.counterK == null) g.orders.run(this.faction, { t: 'damageControl', s: [s.id], p: 'counter' }, 'ai');
      // at night: a star shell over her target if nothing lights it; the Imperial Navy's ships now and then put a searchlight on it
      if (night && u.target && s.flareRounds > 0 && !(s.starAt > g.world.time - 35) && !g.flares?.lit(u.target.pos.x, u.target.pos.z)) {
        g.orders.run(this.faction, { t: 'flare', s: [s.id], x: Math.round(u.target.pos.x), z: Math.round(u.target.pos.z) }, 'ai');
      }
      if (night && this.faction === 'pact' && !s.stats.submarine) {
        const shine = !!u.target && d(u.target.pos) < 1000 && s.id % 3 === 0;
        if (!!s.searchlight !== shine) g.orders.run(this.faction, { t: 'searchlight', s: [s.id], on: shine ? 1 : 0 }, 'ai');
      }
      // badly hurt in sight of the enemy: a destroyer or escort hides behind her own smoke
      if (s.stats.smokeGen && s.hpRatio < 0.5 && u.target && !(s.smokeReady > g.world.time)) g.orders.run(this.faction, { t: 'shipSmoke', s: [s.id] }, 'ai');
      // cruising to a far objective: zig-zag (a submarine's torpedo finds water); in a fight: steady, the guns need it
      const cruising = !u.target && d(target) > 900 && !s.stats.sail; // (not under sail: the wind sets her course — and no submarines yet to dodge)
      if (!!s.zigzag !== cruising) g.orders.run(this.faction, { t: 'zigzag', s: [s.id], on: cruising ? 1 : 0 }, 'ai');
      if (u.target && d(u.target.pos) < (s.stats.range ?? 2000) * 0.9) continue; // in a fight already: let the guns work
      if (s.anchored) { // (at anchor in line: she lies there until the enemy is close or fire opens — then cuts her cable)
        if (this.foes().some((f) => f.units[0]?.spotted && d(f.units[0].pos) < 1000) || g.world.time - (s.lastHitTime ?? -1e9) < 5) s.anchored = false; else continue;
      }
      if (s.station && s.stats.sail) continue; // (in the line: she keeps her station on the leader)
      if (s.stats.sail && !s.stats.fireship) {
        const foe = this.foes().filter((f) => f.units[0]?.spotted && !f.units[0].struck).sort((a, b) => d(a.units[0].pos) - d(b.units[0].pos))[0];
        const windward = foe && ((u.pos.x - foe.units[0].pos.x) * up.x + (u.pos.z - foe.units[0].pos.z) * up.z) > 0; // (already upwind of him: hold the gauge; to leeward: no beating up for it — close him)
        if (foe && windward && d(foe.units[0].pos) > 1200) { // still closing: to windward of him first
          const gauge = this.seaRoom(g.world.clampToBounds({ x: foe.units[0].pos.x + up.x * 450, z: foe.units[0].pos.z + up.z * 450 }), 300);
          if (!s.moveTarget || Math.hypot(s.moveTarget.x - gauge.x, s.moveTarget.z - gauge.z) > 150) this.move(s, gauge.x, gauge.z);
          continue;
        }
        if (foe) { // close enough: bear down and lie alongside him at broadside range, on his beam
          const e = foe.units[0], side = Math.sign((u.pos.x - e.pos.x) * Math.cos(e.yaw) - (u.pos.z - e.pos.z) * Math.sin(e.yaw)) || 1;
          const spot = { x: e.pos.x + Math.cos(e.yaw) * side * 260 + (e.vel?.x ?? 0) * 20, z: e.pos.z - Math.sin(e.yaw) * side * 260 + (e.vel?.z ?? 0) * 20 };
          if (!s.moveTarget || Math.hypot(s.moveTarget.x - spot.x, s.moveTarget.z - spot.z) > 120) this.move(s, spot.x, spot.z);
          continue;
        }
      }
      if (d(target) > target.radius * 0.6) {
        // spread out round the zone a little, each its own spot
        const a = (s.id * 2.399) % (Math.PI * 2);
        const r = target.radius * 0.45;
        const goal = this.seaRoom({ x: target.x + Math.cos(a) * r, z: target.z + Math.sin(a) * r }, target.radius);
        if (!s.moveTarget || Math.hypot(s.moveTarget.x - goal.x, s.moveTarget.z - goal.z) > 80) this.move(s, goal.x, goal.z);
      }
    }
  }

  /** A spot with sea room: `p` if it's SEA_ROOM m off the shallows, else the deepest-water spot within `r` of it (a zone by an island: on its open side). */
  seaRoom(p, r = 150) {
    const nav = this.game.world.nav;
    if (!nav || nav.clearance(p.x, p.z, 'ship') >= SEA_ROOM) return p;
    let best = p, bestC = nav.clearance(p.x, p.z, 'ship');
    for (let i = 0; i < 12; i++) for (const k of [0.5, 1]) {
      const q = { x: p.x + Math.cos((i / 12) * Math.PI * 2) * r * k, z: p.z + Math.sin((i / 12) * Math.PI * 2) * r * k }, c = nav.clearance(q.x, q.z, 'ship');
      if (c > bestC) { best = q; bestC = c; }
    }
    return best;
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
    const support = this.state.support?.[f] ?? this.state.cp?.[f] ?? 0;
    const seen = this.foes().filter((s) => s.units.some((u) => u.alive && u.spotted && (u.depth ?? 0) < 1));
    const best = seen.sort((a, b) => (VALUE[b.type.id] ?? 0) - (VALUE[a.type.id] ?? 0))[0];
    const call = (kind, x, z) => g.air.ready(f, kind) && support >= g.air.terms(f, kind).cost && g.air.call(f, x, z, null, kind);
    if (best) {
      const c = best.centroid;
      if (call('seaStrike', c.x, c.z)) return; // (1985: the missile strike)
      if (call('torpBomb', c.x, c.z)) return;
      if (call('diveBomb', c.x, c.z)) return;
    }
    const mid = fleet.reduce((a, s) => ({ x: a.x + s.centroid.x / fleet.length, z: a.z + s.centroid.z / fleet.length }), { x: 0, z: 0 });
    if (g.air.nearestThreat(f, { x: mid.x, y: 0, z: mid.z }, 2500) && (call('seaCap', mid.x, mid.z) || call('navCap', mid.x, mid.z))) return;
    const foeHome = g.world.bases[enemyOf(f)];
    const ahead = { x: (mid.x + foeHome.x) / 2, z: (mid.z + foeHome.z) / 2 };
    if (this.foes().some((s) => s.stats.submarine && !s.units.some((u) => u.alive && u.spotted)) && Math.random() < 0.3 && call('asw', (mid.x + ahead.x) / 2, (mid.z + ahead.z) / 2)) return; // (1985: a patrol plane ahead of the fleet)
    if (!seen.length) call('aew', ahead.x, ahead.z) || call('navScout', ahead.x, ahead.z);
  }
}
