// Landing craft on a coastal map (Omaha): how the side that lands gets its men and vehicles ashore.
// Whatever that side buys for the land (modes/shared.js makeBuyer) doesn't appear at its base out at
// sea: it comes in a landing craft — a squad in a Higgins boat (LCVP), a vehicle in an LCT — launched
// at the sea edge off the beach sector it was sent to (the base's `entries`: Dog, Easy, Fox). The craft
// runs straight in until she grounds (her `draft`), drops the ramp, and what she carried comes out and
// wades up onto the dry sand; then she backs off and goes back out to sea (and off the map). Sunk on
// the way in, she takes it with her. Only CRAFT craft per side are on a run at once.
// The map's `landing.waves` come in on their own at their times (the first: H-hour, at the start).
import { UNIT_TYPES } from '../data/units/index.js';
import { forArmy } from '../data/factions.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const CRAFT = 12;       // craft on a run at once, per side (the H-hour wave takes nine)
const RAMP = 1.6;              // s for the ramp to come down (and as long to go back up)
const UNLOAD = 3;              // s with the ramp down before she backs off
const BACK = 40;               // m she backs off before she turns for the sea

export class Landing {
  constructor(game) {
    this.game = game;
    this.runs = [];
    this.count = {};
    this.waves = (game.map.landing?.waves ?? []).map((w) => ({ ...w, done: false }));
    game.bus.on('stack:destroyed', (s) => {
      const r = this.runs.find((q) => q.craft === s);
      if (!r) return;
      this.runs.splice(this.runs.indexOf(r), 1);
      if (r.phase === 'in' || r.phase === 'ramp') game.tellBoth?.(s.faction, `${s.type.shortName} sunk with ${r.cargo.name} aboard`, `A landing craft sunk with ${r.cargo.name} aboard`);
    });
  }

  /** Does faction `f` land here (its base is out at sea)? */
  lands(f) {
    const g = this.game, b = g.map.bases?.[f], river = g.world.river;
    return !!(b && river && g.terrain.heightAt(b.x, b.z) < river.level);
  }

  /** Craft of faction `f` still on their way in or unloading (the sea-edge limit). */
  busy(f) { return this.runs.filter((r) => r.craft.faction === f && r.phase !== 'out').length; }

  /** Where a craft with this draft grounds off beach x: the first z (coming in from the sea) with the sand that shallow. */
  groundZ(x, draft) {
    const g = this.game, level = g.world.river.level, edge = g.world.bounds.z;
    for (let z = edge; z > -edge; z -= 2) if (g.terrain.heightAt(x, z) > level - draft) return z;
    return 0;
  }

  /**
   * Send `cargo` ({ typeId, name, kit }) of faction `f` in to beach x. Returns the craft's stack.
   * `z0`: where she starts (default: the sea edge).
   */
  launch(f, cargo, x, z0 = null) {
    const g = this.game, type = UNIT_TYPES[cargo.typeId];
    const kind = type?.kind === 'infantry' ? 'lcvp' : 'lct';
    const edge = g.world.bounds.z, sign = Math.sign(g.map.bases[f].z) || 1;
    const start = { x, z: z0 ?? sign * (edge - 25) };
    const craft = g.spawnStack(kind, f, start, sign > 0 ? Math.PI : 0, `${UNIT_TYPES[kind].shortName} (${cargo.name})`);
    craft.autonomous = true; // (hers is the coxswain's course: not yours to order)
    craft.cargo = cargo;
    const draft = craft.stats.draft ?? 1;
    const half = (craft.type.hull?.length ?? 10) / 2;
    const bowZ = this.groundZ(x, draft);
    const r = { craft, cargo, phase: 'in', t: 0, sign, x, way: { x, z: bowZ + sign * half * 0.9 }, still: 0 };
    craft.run = r;
    this.runs.push(r);
    return craft;
  }

  update(dt) {
    const g = this.game;
    for (const w of this.waves) {
      if (w.done || g.time < (w.t ?? 0)) continue;
      w.done = true;
      for (const f of ['nato', 'pact']) {
        if (!this.lands(f)) continue;
        const roads = g.map.bases[f].entries ?? [0];
        (w.units ?? []).forEach((o, i) => {
          const type = UNIT_TYPES[o.unit];
          if (!type) return;
          const count = g.modeState?.bought ?? this.count; // (one count with what's bought: no two Rifle Squad IIIs)
          count[o.unit] = (count[o.unit] ?? 0) + 1;
          const name = o.name ?? `${forArmy(type.variants, g.armyOf(f), f)?.name ?? type.shortName} ${ROMAN[count[o.unit] - 1] ?? count[o.unit]}`; // (as a bought one is named)
          const x = (roads[o.sector ?? 0] ?? 0) + (o.dx ?? (Math.random() - 0.5) * 70);
          this.launch(f, { typeId: o.unit, name, kit: o.kit ?? null }, x, Math.sign(g.map.bases[f].z) * (g.world.bounds.z - 25 - (i % 3) * 30));
        });
        if (w.say) g.tell(f, w.say);
      }
    }
    for (const r of this.runs.slice()) this.step(r, dt);
  }

  step(r, dt) {
    const g = this.game, s = r.craft, u = s.units[0];
    if (!s.alive || !u?.alive) return;
    r.t += dt;
    const d = Math.hypot(r.way.x - u.pos.x, r.way.z - u.pos.z);
    if (r.phase === 'in') {
      const speed = Math.hypot(u.vel.x, u.vel.z);
      r.still = speed < 0.3 && r.t > 5 ? r.still + dt : 0;
      // there, or past the line (a big craft can't turn tight enough to hit the spot), or stopped short
      if (d < 3 + s.stats.radius || (u.pos.z - r.way.z) * r.sign < 0 || r.still > 2.5) { r.phase = 'ramp'; r.t = 0; u.beached = true; r.way = { x: u.pos.x, z: u.pos.z }; }
    } else if (r.phase === 'ramp') {
      u.rampK = Math.min(1, r.t / RAMP);
      if (u.rampK >= 1 && !r.landed) { r.landed = true; this.unload(r, u); }
      if (r.landed && r.t > RAMP + UNLOAD) { r.phase = 'back'; r.t = 0; u.beached = false; r.way = { x: u.pos.x, z: u.pos.z + r.sign * BACK }; }
    } else if (r.phase === 'back') {
      u.rampK = Math.max(0, 1 - r.t / RAMP);
      if (d < 6 || r.t > 25) { r.phase = 'out'; r.way = { x: r.x + (Math.random() - 0.5) * 60, z: r.sign * (g.world.bounds.z + 40) }; }
    } else if (r.phase === 'out') {
      if (Math.abs(u.pos.z) > g.world.bounds.z - 30) { this.runs.splice(this.runs.indexOf(r), 1); s.run = null; g.removeStack(s); }
    }
  }

  /** Down the ramp and up the beach: the cargo becomes its own stack ahead of her bow, in water shallow enough to wade. */
  unload(r, u) {
    const g = this.game, s = r.craft, level = g.world.river.level;
    const fx = 0, fz = -r.sign, half = (s.type.hull?.length ?? 10) / 2; // (always out on the landward side, whichever way she swung)
    let x = u.pos.x + fx * (half + 3), z = u.pos.z + fz * (half + 3);
    for (let i = 0; i < 40 && level - g.terrain.heightAt(x, z) > 0.7; i++) { x += fx; z += fz; }
    const stack = g.spawnStack(r.cargo.typeId, s.faction, { x, z }, r.sign > 0 ? Math.PI : 0, r.cargo.name);
    if (r.cargo.kit) stack.setKit?.(r.cargo.kit);
    s.cargo = null;
    // up out of the water onto the dry sand, a little way: from there it's yours to command
    let ux = x, uz = z;
    for (let i = 0; i < 300 && g.terrain.heightAt(ux, uz) < level + 0.8; i++) { ux += fx; uz += fz; }
    stack.ai.moveTo({ x: ux + fx * 12, z: uz + fz * 12 }, { ordered: false });
    g.bus.emit('landed', { stack, craft: s });
  }
}
