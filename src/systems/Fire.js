// Grass and forest fires. HE bursts, burning wrecks and white phosphorus (the mortars' smoke
// rounds) can set the ground alight: stubble burns best, meadow and pasture less, ploughed earth
// hardly at all, woods well; damp weather slows it and rain puts it out. A fire spreads cell by
// cell, fastest downwind (world/Wind.js), burns out after a minute or so and leaves the ground
// black. Every fire has its own size (FIRE_SIZE cells, shared by all it spreads to), so it burns
// itself out; water and bridges don't burn. Soldiers caught in it are burned (HURT a second)
// and pull out upwind; vehicles shrug it off.
// The host decides where it burns; each newly lit cell goes to a multiplayer client ('fire').
import { FIELD } from '../world/Fields.js';
import { wind } from '../world/Wind.js';

const CELL = 6;                 // metres
const BURN = [40, 75];          // seconds a cell burns
const TICK = 0.5;
const SPREAD = 0.012;           // chance per tick a fully dry neighbour catches, before the wind
const MAX_BURNING = 70;         // cells alight at once
const MAX_LIT = 400;            // cells lit in a battle
const FIRE_SIZE = [25, 60];     // cells one fire may burn before it runs out of steam
const HURT = 14;                // hit points a second to a man standing in it
const FLEE_EVERY = 6;           // seconds between a stack's moves away from the fire
const FLAMING = 0.35;           // share of a cell's burn it is in flames (the front); then it smoulders
const MAX_TUFTS = 45;           // flame tufts drawn at once (~18 particles each; the fire pool is 1500)
const CORE = 0xffc45a;          // flame colours: the bright core low down…
const OUTER = 0xff6a1e;         // …and the orange of the tongues (additive: they cool toward red)
const FUEL = { [FIELD.STUBBLE]: 1, [FIELD.MEADOW]: 0.75, [FIELD.PASTURE]: 0.45, [FIELD.PLOUGHED]: 0.04 };
const DAMP = { clear: 1, overcast: 0.7, fog: 0.4, rain: 0 };

const rnd = (a, b) => a + Math.random() * (b - a);
const key = (ix, iz) => ix * 10007 + iz;

export class Fire {
  constructor(game) {
    this.game = game;
    this.cells = new Map();  // every cell ever lit: { ix, iz, x, z, t, dur, out }
    this.burning = [];
    this.lit = 0;
    this.t = 0;
    this.sound = null;
  }

  get damp() {
    return DAMP[this.game.conditions?.weather] ?? 1;
  }

  /** How well the ground at (x, z) burns, 0..1. */
  fuel(x, z) {
    const g = this.game;
    const river = g.world.river;
    if (river && (g.terrain.heightAt(x, z) < river.level + 0.3 || river.bridgeAt(x, z))) return 0; // water, bridges
    const wood = g.map.woods?.(x, z) ?? 0;
    const field = g.map.fields ? FUEL[g.map.fields.at(x, z).type] ?? 0.3 : 0.3;
    return Math.max(field, wood * 0.9);
  }

  /** Maybe set (x, z) alight: `chance` scaled by the fuel there and the weather. */
  ignite(x, z, chance) {
    if (this.game.net?.isClient) return;
    const ix = Math.round(x / CELL);
    const iz = Math.round(z / CELL);
    if (this.cells.has(key(ix, iz))) return;
    if (Math.random() < chance * this.fuel(ix * CELL, iz * CELL) * this.damp) this.light(ix, iz, { left: Math.round(rnd(...FIRE_SIZE)) });
  }

  /** Set cell (ix, iz) burning, as part of `fire` (its budget of cells, shared with what it spreads to). */
  light(ix, iz, fire = { left: Infinity }) {
    const k = key(ix, iz);
    if (this.cells.has(k) || this.burning.length >= MAX_BURNING || this.lit >= MAX_LIT || fire.left <= 0) return;
    fire.left--;
    const g = this.game;
    const cell = { ix, iz, x: ix * CELL, z: iz * CELL, t: 0, dur: rnd(...BURN), out: false, fire };
    // three or four tufts of flame where the grass burns thickest
    cell.tufts = Array.from({ length: 3 + (Math.random() < 0.5 ? 1 : 0) }, () => {
      const x = cell.x + rnd(-0.4, 0.4) * CELL;
      const z = cell.z + rnd(-0.4, 0.4) * CELL;
      return { x, z, y: this.game.terrain.heightAt(x, z), heat: rnd(0.7, 1.2) };
    });
    this.cells.set(k, cell);
    this.burning.push(cell);
    this.lit++;
    g.terrain.scorch(cell.x, cell.z, CELL * 0.85, 0.55);
    g.netEvent('fire', ix, iz);
  }

  update(dt) {
    const g = this.game;
    if (!this.burning.length) {
      if (this.sound) { this.sound.stop(); this.sound = null; }
      return;
    }
    // looks, every frame. The front (a cell's first FLAMING share) burns in tongues of flame: a fast
    // stream of small sparks from each tuft that rise, slow and shrink — yellow at the core, orange
    // above — over a low glow, embers lifting off on the wind and thick smoke. Behind the front it
    // smoulders: a thin smoke and the odd ember.
    const F = g.effects.fire;
    const S = g.effects.smoke;
    let tufts = 0;
    for (const c of this.burning) {
      const p = c.t / c.dur;
      const flaming = p < FLAMING;
      if (flaming && tufts < MAX_TUFTS) {
        const k = Math.min(1, (FLAMING - p) / 0.08, c.t / 1.5); // flares up, dies down at the end of the front
        for (const f of c.tufts) {
          if (++tufts > MAX_TUFTS) break;
          const heat = f.heat * k * (0.75 + 0.25 * Math.sin(g.time * 9 + f.x)); // a flicker
          for (let n = Math.floor(dt * 28 * heat + Math.random()); n > 0; n--) { // a tongue: ~1.5–2 m of rising flame
            const core = Math.random() < 0.45;
            F.spawn(f.x + rnd(-0.3, 0.3), f.y + (core ? 0.25 : 0.55), f.z + rnd(-0.3, 0.3), {
              vx: rnd(-0.25, 0.25), vy: rnd(2.6, 4.2) * heat, vz: rnd(-0.25, 0.25), size: core ? rnd(0.9, 1.3) : rnd(0.7, 1.05), grow: -0.7,
              life: rnd(0.4, 0.65), color: core ? CORE : OUTER, bright: core ? 2.4 : 1.9, drag: 1.6, wind: 0.7, spin: 0,
            });
          }
          if (Math.random() < dt * 2.5 * heat) F.spawn(f.x, f.y + 0.2, f.z, { size: rnd(2.6, 3.4), grow: 0.15, life: 0.55, alpha: 0.2, color: OUTER, bright: 1.1, drag: 1 }); // glow on the ground
          if (Math.random() < dt * 1.2 * heat) F.spawn(f.x, f.y + 0.6, f.z, { vx: rnd(-0.6, 0.6), vy: rnd(2, 4), vz: rnd(-0.6, 0.6), size: 0.07, grow: 0, life: rnd(1.2, 2.2), color: CORE, bright: 3, drag: 0.6, wind: 1 }); // embers
        }
      } else if (Math.random() < dt * 0.25) {
        F.spawn(c.x + rnd(-2, 2), g.terrain.heightAt(c.x, c.z) + 0.2, c.z + rnd(-2, 2), { vy: rnd(1, 2), size: 0.06, grow: 0, life: rnd(0.8, 1.5), color: OUTER, bright: 2.5, drag: 0.6, wind: 1 });
      }
      if (Math.random() < dt * (flaming ? 2.2 : 0.5) * (1 - p)) {
        S.spawn(c.x + rnd(-2, 2), g.terrain.heightAt(c.x, c.z) + (flaming ? 1.6 : 0.5), c.z + rnd(-2, 2), {
          vx: rnd(-0.3, 0.3), vy: rnd(1.2, 2.4), vz: rnd(-0.3, 0.3), size: rnd(1.2, 2), grow: 4, life: rnd(7, 11),
          alpha: flaming ? 0.42 : 0.18, color: flaming ? 0x3e3832 : 0x6a6660, drag: 0.4, wind: 1.6,
        });
      }
    }
    this.t += dt;
    if (this.t < TICK) return;
    this.t = 0;
    const host = !g.net?.isClient;
    const damp = this.damp;
    const ws = Math.max(0.3, wind.speed);
    let nearest = null;
    let nd = Infinity;
    for (let i = this.burning.length - 1; i >= 0; i--) {
      const c = this.burning[i];
      c.t += TICK * (damp === 0 ? 4 : 1); // rain drowns it
      if (c.t >= c.dur) {
        c.out = true;
        this.burning.splice(i, 1);
        continue;
      }
      const d = g.audio ? g.audio.distanceTo({ x: c.x, y: g.terrain.heightAt(c.x, c.z), z: c.z }) : Infinity;
      if (d < nd) { nd = d; nearest = c; }
      if (!host) continue;
      // spread: each neighbour may catch, much more likely downwind
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dz) || this.cells.has(key(c.ix + dx, c.iz + dz))) continue;
          const down = Math.max(0, (dx * wind.x + dz * wind.z) / (Math.hypot(dx, dz) * ws));
          const p = SPREAD * this.fuel((c.ix + dx) * CELL, (c.iz + dz) * CELL) * damp * (0.25 + 4 * down * Math.min(2, ws / 1.5));
          if (Math.random() < p) this.light(c.ix + dx, c.iz + dz, c.fire);
        }
      }
      // burns whoever is in it; infantry pulls back upwind
      for (const u of g.world.neighbors({ x: c.x, y: 0, z: c.z }, CELL * 0.75, [])) {
        if (!u.alive) continue;
        const s = u.stack;
        u.receiveDamage(HURT * TICK * (s.usesCover ? 1 : 0.15), null, 0.2, null, 0.1);
        if (!s.usesCover || g.time < (s.fleeAt ?? 0)) continue; // nobody holds a position in a fire
        s.fleeAt = g.time + FLEE_EVERY;
        s.ai.moveTo(g.world.clampToBounds({ x: u.pos.x - (wind.x / ws) * 20, z: u.pos.z - (wind.z / ws) * 20 }), { ordered: false });
      }
    }
    // the roar and crackle of the nearest fire
    if (nearest && nd < 60) { // a crackle for whoever is close, not a roar over the battlefield
      const pos = { x: nearest.x, y: g.terrain.heightAt(nearest.x, nearest.z) + 1, z: nearest.z };
      this.sound ??= g.audio?.loop('fire', pos, 0, 4) ?? null;
      this.sound?.setPos(pos);
      this.sound?.setGain(Math.min(0.4, 0.12 + this.burning.length * 0.012) * (1 - nd / 60));
    } else if (this.sound) { this.sound.stop(); this.sound = null; }
  }
}
