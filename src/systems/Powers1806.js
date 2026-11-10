// 1806's support powers (the support bar, data/epoch.js): what an army of the era could call on
// instead of aircraft and radios.
//   battery  the grand battery: every gun of yours with the spot in reach fires three rounds on it
//   reserve  the cavalry reserve: a squadron of heavy horse rides in from your edge, charges the
//            enemy nearest the spot, and rides back off the field (an "air strike" on horseback)
//   guard    the Guard, once a battle: two veteran companies march in from your base to the spot
// At sea (a sea map: `sea` powers instead of the land's):
//   signal   'Engage the enemy more closely': for SIGNAL s every ship of yours reloads faster and holds out longer
//   fireship a fireship comes down the wind from upwind of the spot onto it (entities/sailDamage.js fireship)
//   squadron once a battle: two 74s come in from your edge to the spot
// call(faction, kind, x, z) spends command points and starts the cooldown; false if it can't.
// The AI side uses them too (update: think()). Host only — what they do reaches a guest as usual.
import { enemyOf } from '../data/factions.js';
import { RANKS } from '../entities/UnitStack.js';
import { year } from '../data/epoch.js';
import { windFrom } from '../entities/sailing.js';

const SIGNAL = 60; // s the close-action signal holds

export const POWERS_1806 = {
  battery: { label: 'Grand battery', icon: 'flare', key: 'barrage', cost: 120, cooldown: 120, tip: 'Every gun of yours in reach fires three rounds on the spot' },
  reserve: { label: 'Cavalry charge', icon: 'charge', key: 'jet', cost: 260, cooldown: 200, tip: 'A squadron of heavy horse rides in, charges the enemy nearest the spot, and rides off again' },
  guard: { label: 'The Guard', icon: 'reinforce', key: 'lift', cost: 350, once: true, tip: 'Once a battle: two veteran companies of the Guard march in to the spot' },
  signal: { sea: true, label: 'Close action', icon: 'flare', key: 'barrage', cost: 120, cooldown: 180, tip: '"Engage the enemy more closely": for a minute every ship of yours reloads faster and holds out longer before she strikes' },
  fireship: { sea: true, label: 'Fireship', icon: 'charge', key: 'jet', cost: 180, cooldown: 150, tip: 'A fireship comes down the wind from upwind onto the spot: what she touches catches fire' },
  squadron: { sea: true, label: 'Reserve squadron', icon: 'reinforce', key: 'lift', cost: 900, once: true, tip: 'Once a battle: two ships of the line come in from your edge to the spot' },
};
/** Whether a power belongs to this battle: the sea's three on a sea map, the land's three ashore. */
export const powerHere = (k, game) => !!POWERS_1806[k]?.sea === !!game.world.river?.sea;

export class Powers1806 {
  constructor(game) {
    this.game = game;
    this.readyAt = {};      // `${faction}:${kind}` → time
    this.used = new Set();  // the Guard, once
    this.reserves = [];     // { stack, x, z, charged }
    this.thinkT = 20;
  }

  key(f, k) { return `${f}:${k}`; }
  ready(f, k) { return !this.used.has(this.key(f, k)) && this.game.time >= (this.readyAt[this.key(f, k)] ?? 0); }
  cooldownLeft(f, k) { return this.used.has(this.key(f, k)) ? Infinity : Math.max(0, (this.readyAt[this.key(f, k)] ?? 0) - this.game.time); }

  call(f, k, x, z) {
    const g = this.game, P = POWERS_1806[k];
    if (!P || !powerHere(k, g)) return false;
    if (!this.ready(f, k)) return g.tell(f, `${P.label} not ready`) ?? false;
    if (k === 'battery' && !this.gunsFor(f, x, z).length) return g.tell(f, 'Grand battery: no guns in reach') ?? false;
    if (!g.spendFrom('support', f, P.cost)) return g.tell(f, `Not enough ${g.poolName('support')} (${P.cost})`) ?? false;
    if (P.once) this.used.add(this.key(f, k)); else this.readyAt[this.key(f, k)] = g.time + P.cooldown;
    this[k](f, x, z);
    return true;
  }

  gunsFor(f, x, z) {
    return this.game.world.stacksOf(f).filter((s) => s.alive && s.stats.gun && s.units.some((u) => u.alive && Math.hypot(u.pos.x - x, u.pos.z - z) <= u.stats.range));
  }

  battery(f, x, z) {
    const guns = this.gunsFor(f, x, z);
    for (const s of guns) {
      s.battery = { x, z, left: 3 * s.aliveCount, until: this.game.time + 60 };
      for (const u of s.units) u.retarget = 0;
    }
    this.game.tellBoth(f, `Grand battery: ${guns.length} batter${guns.length === 1 ? 'y' : 'ies'} open fire`, 'Enemy guns massing their fire!');
  }

  /** The edge of the field behind `f`'s base: where its reserves come from. */
  /** Where a reserve comes on for a target at `p`: behind our base, or the nearer flank edge level with it — whichever is closer. */
  entryFor(f, p) {
    const g = this.game, b = g.world.bounds, back = this.edge(f), base = g.world.bases[f];
    const homeward = Math.sign(base.z) || 1;
    const z = Math.max(-b.z + 20, Math.min(b.z - 20, p.z + homeward * 80)); // (a little on our side of it)
    const flanks = [{ x: -b.x + 10, z }, { x: b.x - 10, z }];
    return [back, ...flanks].sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z))[0];
  }

  edge(f) {
    const g = this.game, base = g.world.bases[f];
    const back = Math.sign(base.z) || 1;
    return g.world.clampToBounds({ x: base.x, z: base.z + back * 60 });
  }

  reserve(f, x, z) {
    const g = this.game;
    // the enemy nearest the spot is the target: the squadron rides for it wherever it goes, from the map edge nearest it on our side or a flank
    const target = g.world.stacksOf(enemyOf(f)).filter((e) => e.alive && !e.stats.loose && !e.stats.structure && !e.autonomous && Math.hypot(e.centroid.x - x, e.centroid.z - z) < 150)
      .sort((a, b) => Math.hypot(a.centroid.x - x, a.centroid.z - z) - Math.hypot(b.centroid.x - x, b.centroid.z - z))[0] ?? null;
    const from = this.entryFor(f, target ? target.centroid : { x, z });
    const s = g.spawnStack('tank', f, from, Math.atan2(x - from.x, z - from.z), 'Cavalry reserve');
    if (!s) return;
    s.autonomous = true;
    s.stats = { ...s.stats, speed: 7 }; // (up to the spot at the canter)
    for (const u of s.units) u.stats = s.stats;
    if (!(target && s.startCharge(target))) s.ai.moveTo({ x, z }, { ordered: true });
    this.reserves.push({ stack: s, x, z, charged: !!s.charging, home: from });
    g.tellBoth(f, 'The cavalry reserve is coming up', 'Enemy cavalry coming on!');
  }

  /** Close action: SIGNAL s of faster broadsides and stouter hearts (UnitStack updateShipWeapons, sailDamage strike). */
  signal(f) {
    (this.signalUntil ??= {})[f] = this.game.time + SIGNAL;
    for (const s of this.game.world.stacksOf(f)) if (s.stats.sail) s.morale = Math.min(1, s.morale + 0.2);
    this.game.tellBoth(f, '"Engage the enemy more closely" — the signal is flying', 'The enemy flagship signals close action!');
  }
  signalled(f) { return (this.signalUntil?.[f] ?? 0) > this.game.time; }

  /** A fireship from upwind of the spot, steered down onto it. */
  fireship(f, x, z) {
    const g = this.game, a = windFrom(), from = g.world.clampToBounds({ x: x + Math.sin(a) * 700, z: z + Math.cos(a) * 700 });
    const s = g.spawnStack('fireship', f, from, a + Math.PI);
    if (!s) return;
    s.ai.moveTo({ x, z }, { ordered: false });
    g.tellBoth(f, 'A fireship is coming down on them', 'A fireship bearing down on us!');
  }

  /** The reserve squadron: two 74s in from our edge. */
  squadron(f, x, z) {
    const g = this.game, from = this.edge(f);
    for (let i = 0; i < 2; i++) {
      const s = g.spawnStack('cruiser', f, { x: from.x + (i - 0.5) * 260, z: from.z }, Math.atan2(x - from.x, z - from.z));
      if (s) s.ai.moveTo({ x: x + (i - 0.5) * 200, z }, { ordered: false });
    }
    g.tellBoth(f, 'The reserve squadron is coming up', 'Enemy sail on the horizon — a fresh squadron!');
  }

  guard(f, x, z) {
    const g = this.game, base = g.world.bases[f];
    for (let i = 0; i < 2; i++) {
      const s = g.spawnStack('guard', f, { x: base.x + (i - 0.5) * 16, z: base.z }, Math.atan2(x - base.x, z - base.z), i ? 'The Guard (2)' : 'The Guard');
      if (!s) continue;
      if (s.xp < RANKS[2].xp) s.setXp(RANKS[2].xp);
      s.ai.moveTo({ x: x + (i - 0.5) * 18, z }, { ordered: true });
    }
    g.tellBoth(f, 'The Guard is marching up', 'The enemy\'s Guard is coming!');
  }

  update(dt) {
    const g = this.game;
    if (g.net?.isClient || year() >= 1900) return;
    // the reserves: up to the spot, the charge, then back off the field
    for (const r of [...this.reserves]) {
      const s = r.stack;
      if (!s.alive) { this.reserves.splice(this.reserves.indexOf(r), 1); continue; }
      if (s.charging) { r.charged = true; continue; }
      if (!r.charged) {
        const foe = g.world.stacksOf(enemyOf(s.faction)).filter((e) => e.alive && !e.stats.loose && !e.stats.structure && Math.hypot(e.centroid.x - r.x, e.centroid.z - r.z) < 110)
          .sort((a, b) => Math.hypot(a.centroid.x - s.centroid.x, a.centroid.z - s.centroid.z) - Math.hypot(b.centroid.x - s.centroid.x, b.centroid.z - s.centroid.z))[0];
        const near = Math.hypot(s.centroid.x - r.x, s.centroid.z - r.z) < 140;
        if (foe && near && s.startCharge(foe)) continue;
        if (Math.hypot(s.centroid.x - r.x, s.centroid.z - r.z) < 15) r.charged = true; // nobody there: ride back
        continue;
      }
      if (!r.leaving) { r.leaving = true; s.ai.moveTo(r.home, { ordered: true }); }
      if (Math.hypot(s.centroid.x - r.home.x, s.centroid.z - r.home.z) < 20) { g.removeStack(s); this.reserves.splice(this.reserves.indexOf(r), 1); }
    }
    if ((this.thinkT -= dt) > 0) return;
    this.thinkT = 8;
    for (const f of ['nato', 'pact']) if (this.aiSide(f)) this.think(f);
  }

  /** A side the computer plays (no human commands it). */
  aiSide(f) {
    const g = this.game;
    if (g.net) return g.coop && f !== g.playerFaction;
    return f !== g.playerFaction;
  }

  thinkSea(f) {
    const g = this.game, cp = g.modeState?.cp?.[f] ?? 0;
    const mine = g.world.stacksOf(f).filter((s) => s.stats.sail && !s.units[0]?.struck), foes = g.world.stacksOf(enemyOf(f)).filter((e) => e.stats.sail && !e.units[0]?.struck && e.units[0]?.spotted);
    if (!foes.length) return;
    if (this.ready(f, 'signal') && cp >= POWERS_1806.signal.cost && mine.filter((s) => s.units[0]?.target).length >= 2) { this.call(f, 'signal'); return; }
    const big = foes.slice().sort((a, b) => (b.type.cost ?? 0) - (a.type.cost ?? 0))[0];
    if (this.ready(f, 'fireship') && cp >= POWERS_1806.fireship.cost + 150) { this.call(f, 'fireship', big.centroid.x, big.centroid.z); return; }
    if (mine.length < foes.length * 0.7 && this.ready(f, 'squadron') && cp >= POWERS_1806.squadron.cost) this.call(f, 'squadron', big.centroid.x, big.centroid.z);
  }

  /** The AI's use of the powers: guns on massed enemies, the reserve on foot caught out of square, the Guard when it's going badly. */
  think(f) {
    const g = this.game;
    if (g.world.river?.sea) return this.thinkSea(f);
    const foes = g.world.stacksOf(enemyOf(f)).filter((e) => e.alive && !e.stats.loose && !e.stats.structure && !e.autonomous && e.units.some((u) => u.alive && u.spotted));
    if (!foes.length) return;
    const cp = g.modeState?.cp?.[f] ?? 0;
    const biggest = foes.slice().sort((a, b) => b.aliveCount - a.aliveCount)[0];
    if (this.ready(f, 'battery') && cp >= POWERS_1806.battery.cost && this.gunsFor(f, biggest.centroid.x, biggest.centroid.z).length >= 1 && biggest.aliveCount >= 10) {
      this.call(f, 'battery', biggest.centroid.x, biggest.centroid.z);
      return;
    }
    const prey = foes.find((e) => e.usesCover && !e.stats.square && e.form !== 'square');
    if (prey && this.ready(f, 'reserve') && cp >= POWERS_1806.reserve.cost + 100) { this.call(f, 'reserve', prey.centroid.x, prey.centroid.z); return; }
    const mine = g.world.stacksOf(f).filter((s) => s.alive && !s.autonomous && !s.stats.structure).length;
    if (mine < foes.length * 0.6 && this.ready(f, 'guard') && cp >= POWERS_1806.guard.cost) {
      const p = g.modeState?.points?.points?.find((pt) => pt.owner === f && pt.contested) ?? biggest.centroid;
      this.call(f, 'guard', p.x, p.z);
    }
  }
}
