// The AI of a landing (modes/landing.js), either side, on top of the frontline AI (ai/FrontlineDirector.js:
// assaults on the open points, garrisons, support, observers):
//   landing  buys in a landing order into one sector at a time (the focus: where the defence on the beach is
//            thinnest, sticking with it a while, on to the next once it's taken), keeps two destroyers and
//            brings in the old battleship; the destroyers go in through the focus sector's swept lane and lie
//            close off the beach; its engineers blow the tank traps on the shingle and across the draw's mouth
//            so the armour can get off the sand
//   defence  holds (no offensives); when a sector falls, its reserves go to the village up that draw
import { FrontlineDirector } from './FrontlineDirector.js';
import { getUnitType, UNIT_TYPES } from '../data/units/index.js';
import { unitCost } from '../data/doctrine.js';
import { enemyOf } from '../data/factions.js';
import { KINDS } from '../systems/AirStrike.js';

const ORDER = ['rifles', 'rifles', 'engineers', 'ddTank', 'rifles', 'mgTeam', 'tank', 'rifles', 'engineers', 'mortar', 'rifles', 'tank', 'atTeam'];
const FOCUS_HOLD = 150;     // s it keeps landing in one sector before it looks again
const INSHORE = 395;        // z (from the sea's side) the destroyers lie at: a few hundred metres off the strongpoints
const WAVES_THROUGH = 150; // s: the destroyers wait in the offing till the first waves are through the lanes
const CLEAR_WAIT = 150;     // s for an engineer job before it's given again (under fire on the sand it takes a while)
const RESERVE = 2;          // defence: stacks sent to the village behind a fallen sector

export class LandingDirector extends FrontlineDirector {
  constructor(game, faction, state, opts = {}) {
    super(game, faction, state, opts);
    this.lands = state.attacker === faction;
    this.orderIndex = 0;
    this.focusUntil = 0;
  }

  update(dt) {
    const due = this.timer - dt <= 0;
    if (due && !this.lands) this.strikeShips(); // (before the buying spends it all: the landing ships are the defence's best target)
    super.update(dt);
    if (!due) return;
    if (this.lands) { this.pickFocus(); this.ships(); this.engineers(); this.stayInshore(); } else this.reserves();
  }

  /** The destroyers stay on their stations until they sink (pulled out to mend, they'd go back out through the mines). */
  stayInshore() {
    const sign = Math.sign(this.game.map.bases[this.faction].z) || 1, band = this.game.map.landing?.seaMines?.z;
    if (!band) return;
    for (const s of this.fleet) {
      if (!s.inshoreAt && s.type.id !== 'oldBattleship' && !s.owner) { s.offing ??= { x: s.centroid.x, z: s.centroid.z }; if (s.moveTarget && Math.hypot(s.moveTarget.x - s.offing.x, s.moveTarget.z - s.offing.z) > 40) s.ai.halt(); continue; } // (waiting in the offing: there, not wandering)
      if (s.type.id === 'oldBattleship' && !s.owner) { // (the old battleship: out in the transport area, her guns reach the bluffs from there)
        const off = { x: 0, z: sign * (band[1] + 230) };
        if (!s.moveTarget ? Math.abs(s.centroid.z) < band[1] + 150 : Math.abs(s.moveTarget.z) < band[1] + 150) s.ai.moveTo(off, { hold: true, ordered: false });
        continue;
      }
      if (s.type.id !== 'destroyer' || !s.inshoreAt || s.owner) continue;
      this.roles.delete(s); // (no jobs from the frontline AI: she fires from her station — any manoeuvre in there swings her toward the mines)
      const t = s.moveTarget, there = Math.hypot(s.centroid.x - s.inshoreAt.x, s.centroid.z - s.inshoreAt.z) < 60;
      if (there && t) { s.ai.halt(); continue; } // (on her station: she lies there and fires — no chasing targets round inside the mines)
      if (Math.abs(s.centroid.z) < band[0] && !there && (!t || Math.hypot(t.x - s.inshoreAt.x, t.z - s.inshoreAt.z) > 30)) s.ai.moveTo(s.inshoreAt, { hold: true, ordered: false });
    }
  }

  /** The frontline AI's stacks: the troops — the ships are this AI's own (an assault or a 'support' job would sail them over the mines). */
  myStacks() { return this.lands ? super.myStacks().filter((s) => !s.stats.naval) : super.myStacks(); }

  /** The landing's ships. */
  get fleet() { return this.game.world.stacksOf(this.faction).filter((s) => s.stats.naval && !s.stats.landingCraft && s.alive); }

  /** The landing leaves nobody sitting on what it holds (the defence doesn't counter-attack the beach): every squad for the assault. */
  garrison() { if (!this.lands) super.garrison(); }

  /** The beach sectors (points with `opens`), in the order of the base's entries (Dog, Easy, Fox). */
  get sectors() {
    const roads = this.game.map.bases[this.faction].entries ?? [0];
    return this.points.filter((p) => this.state.points.points.includes(p) && this.game.map.points.find((q) => q.id === p.id)?.opens)
      .map((p) => ({ p, road: roads.reduce((best, x, i) => (Math.abs(x - p.x) < Math.abs(roads[best] - p.x) ? i : best), 0) }));
  }

  /** Where to land: the sector not yet ours with the fewest defenders round it (their fortifications counted double). */
  pickFocus() {
    if (this.now < this.focusUntil && this.focus && this.focus.p.owner !== this.faction) return;
    const foes = this.game.world.stacksOf(enemyOf(this.faction)).filter((s) => s.alive && s.units.some((u) => u.alive && u.spotted));
    const weight = (sec) => foes.reduce((a, s) => a + (Math.hypot(s.centroid.x - sec.p.x, s.centroid.z - sec.p.z) < 260 ? (s.stats.structure ? 2 : 1) : 0), 0);
    const open = this.sectors.filter((sec) => sec.p.owner !== this.faction);
    const pick = (open.length ? open : this.sectors).sort((a, b) => weight(a) - weight(b))[0];
    if (!open.length && this.focus) { this.focusUntil = this.now + FOCUS_HOLD; return; } // (every sector ours: keep landing where it was)
    if (pick && pick !== this.focus && this.game.coop) this.game.tell(this.faction, `Landing now on ${pick.p.name}`); // (a co-op partner wants to know)
    this.focus = pick ?? null;
    this.focusUntil = this.now + FOCUS_HOLD * this.tempo;
  }

  buy() {
    if (!this.lands) return super.buy();
    const f = this.faction, army = this.game.armyOf(f), cp = this.state.cp[f];
    const cost = (id) => unitCost(getUnitType(id), army);
    const allowed = (id) => !!UNIT_TYPES[id] && (!this.state.allow || this.state.allow(UNIT_TYPES[id], f)); // (not in this war: skipped — 1985 has no DD tank)
    const ships = this.fleet;
    const road = () => (this.focus && Math.random() < 0.75 ? this.focus.road : null);
    // the ships first, when there's room: two destroyers inshore, the battleship once
    if (ships.filter((s) => s.type.id === 'destroyer').length < 2 && allowed('destroyer') && cp >= cost('destroyer') + 250) { this.state.buy(f, 'destroyer'); return; }
    if (this.now > 300 && !ships.some((s) => s.type.id === 'oldBattleship') && allowed('oldBattleship') && cp >= cost('oldBattleship') + 800) { this.state.buy(f, 'oldBattleship'); return; } // (once the troops are ashore and there's CP to spare)
    for (let tries = 0; tries < ORDER.length; tries++) {
      const id = ORDER[this.orderIndex % ORDER.length];
      if (!allowed(id)) { this.orderIndex++; continue; }
      if (cp < cost(id)) return; // (saving up for it)
      if (this.state.buy(f, id, road())) this.orderIndex++;
      return;
    }
  }

  /** The destroyers: in through the focus sector's lane, to lie close off its beach (they fire on what's spotted). */
  ships() {
    if (!this.focus || this.now < WAVES_THROUGH) return; // (the lanes are the boats' first: the destroyers go in behind the first waves)
    const sign = Math.sign(this.game.map.bases[this.faction].z) || 1;
    const lanes = this.game.map.landing?.seaMines?.lanes ?? [this.focus.p.x];
    const lane = lanes.reduce((a, x) => (Math.abs(x - this.focus.p.x) < Math.abs(a - this.focus.p.x) ? x : a), lanes[0]);
    const dds = this.fleet.filter((s) => s.type.id === 'destroyer');
    const band = this.game.map.landing?.seaMines?.z ?? [INSHORE + 20, INSHORE + 20];
    dds.forEach((s, i) => {
      if (s.inshoreLane === lane || s.owner) return; // (sent already; a co-op player's own)
      s.inshoreLane = lane;
      const off = (i % 2 ? 1 : -1) * 95; // (off the lane, between it and the next: the boats come down the lane itself)
      s.waypoints = null;
      s.inshoreAt = { x: lane + off, z: sign * INSHORE }; // (not s.station: that's a ship's place in a formation)
      s.ai.moveTo(s.inshoreAt, { hold: true, ordered: false }); // (systems/Landing.js pilot: by the lane through the mines)
    });
  }

  /** Engineers ashore: the tank traps on the shingle and across the draw of the focus sector (then the next sector's). */
  engineers() {
    const c = this.game.construction, g = this.game, level = g.world.river?.level ?? 0;
    if (this.clearing && (this.now - this.clearing.since > CLEAR_WAIT || !c.obstacles.includes(this.clearing.ob) || !this.clearing.eng.alive)) { if (this.roles.get(this.clearing.eng)?.role === 'job') this.roles.delete(this.clearing.eng); this.clearing = null; }
    if (this.clearing) return;
    const order = this.sectors.filter((sec) => c.obstacles.some((o) => o.kind === 'tankTraps' && o.faction !== this.faction && Math.abs(o.x - sec.p.x) < 14));
    const engs = this.myStacks().filter((s) => s.stats.engineer && s.alive);
    order.sort((a, b) => Math.min(...engs.map((e) => Math.abs(e.centroid.x - a.p.x))) - Math.min(...engs.map((e) => Math.abs(e.centroid.x - b.p.x)))); // (the draw nearest the engineers first)
    for (const sec of order) {
      const traps = c.obstacles.filter((o) => o.kind === 'tankTraps' && o.faction !== this.faction && Math.abs(o.x - sec.p.x) < 14);
      if (!traps.length) continue;
      const ashore = (s) => s.stats.engineer && s.alive && g.terrain.heightAt(s.centroid.x, s.centroid.z) > level - 0.9 && !c.sites.some((site) => site.stack === s); // (on the sand, or wading in)
      const eng = this.myStacks().filter(ashore).sort((a, b) => Math.hypot(a.centroid.x - sec.p.x, a.centroid.z - sec.p.z) - Math.hypot(b.centroid.x - sec.p.x, b.centroid.z - sec.p.z))[0];
      if (!eng) return;
      const ob = traps.sort((a, b) => Math.hypot(a.x - eng.centroid.x, a.z - eng.centroid.z) - Math.hypot(b.x - eng.centroid.x, b.z - eng.centroid.z))[0];
      const sea = Math.sign(this.game.map.bases[this.faction].z) || 1;
      if (!c.place('clear', ob.x, ob.z, sea > 0 ? Math.PI : 0, this.faction, eng, { force: true })) return; // (worked from the beach side of it)
      this.roles.set(eng, { role: 'job', point: sec.p, until: this.now + CLEAR_WAIT }); // (its own: the frontline AI leaves it be)
      this.smokeAt(ob.x, ob.z + (Math.sign(this.game.map.bases[this.faction].z) || 1) * -20);
      this.clearing = { eng, ob, since: this.now };
      return;
    }
  }

  /** Defence: a sector lost — reserves into the village up its draw, before the landing gets there. */
  /** The defence's anti-ship strike (a coastal map's, AirStrike KINDS.coastStrike): whenever it's ready and affordable, at the landing's biggest ship. */
  strikeShips() {
    const air = this.game.air;
    if (!air || KINDS.coastStrike?.off || !air.ready(this.faction, 'coastStrike') || !this.supportOver(KINDS.coastStrike.cost + 40)) return;
    const t = this.game.world.stacksOf(enemyOf(this.faction)).filter((s) => s.alive && s.stats.naval).sort((a, b) => (b.type.hull?.length ?? 0) - (a.type.hull?.length ?? 0))[0];
    if (t) air.call(this.faction, t.centroid.x, t.centroid.z, null, 'coastStrike');
  }

  reserves() {
    for (const id of this.state.taken ?? []) {
      const to = this.game.map.points.find((q) => q.id === id)?.opens;
      const p = this.points.find((q) => q.id === to);
      if (!p || p.owner === enemyOf(this.faction)) continue;
      const there = [...this.roles].filter(([s, r]) => s.alive && r.point === p).length;
      for (let k = there; k < RESERVE; k++) {
        const s = this.nearestFree(p, (q) => q.usesCover && !q.stats.structure);
        if (!s) break;
        this.roles.set(s, { role: 'garrison', point: p, until: this.now + 240 });
        s.ai.moveTo({ x: p.x + (Math.random() - 0.5) * 30, z: p.z + (Math.random() - 0.5) * 30 }, { ordered: false });
      }
    }
  }
}
