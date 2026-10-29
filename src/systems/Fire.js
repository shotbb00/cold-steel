// Grass and forest fires. HE bursts, burning wrecks and white phosphorus (the mortars' smoke
// rounds) can set the ground alight: stubble burns best, meadow and pasture less, ploughed earth
// hardly at all, woods well; damp weather slows it and rain puts it out. A fire spreads cell by
// cell, fastest downwind (world/Wind.js), burns out after a minute or so and leaves the ground
// black. Soldiers caught in it are burned and pull out upwind; vehicles shrug it off.
// The host decides where it burns; each newly lit cell goes to a multiplayer client ('fire').
import { FIELD } from '../world/Fields.js';
import { wind } from '../world/Wind.js';

const CELL = 6;                 // metres
const BURN = [40, 75];          // seconds a cell burns
const TICK = 0.5;
const SPREAD = 0.012;           // chance per tick a fully dry neighbour catches, before the wind
const MAX_BURNING = 70;         // cells alight at once
const MAX_LIT = 900;            // cells lit in a battle
const HURT = 14;                // hit points a second to a man standing in it
const FLEE_EVERY = 6;           // seconds between a stack's moves away from the fire
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
    if (river && g.terrain.heightAt(x, z) < river.level + 0.3) return 0; // water
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
    if (Math.random() < chance * this.fuel(ix * CELL, iz * CELL) * this.damp) this.light(ix, iz);
  }

  light(ix, iz) {
    const k = key(ix, iz);
    if (this.cells.has(k) || this.burning.length >= MAX_BURNING || this.lit >= MAX_LIT) return;
    const g = this.game;
    const cell = { ix, iz, x: ix * CELL, z: iz * CELL, t: 0, dur: rnd(...BURN), out: false };
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
    // looks, every frame: flames low in the grass, a grey-brown smoke drifting downwind
    for (const c of this.burning) {
      const k = 1 - c.t / c.dur;
      if (Math.random() < dt * 7 * Math.min(1, k * 2)) { // a tongue of flame (fire pool: ~400 of 1500 at the cap)
        const x = c.x + rnd(-CELL, CELL) * 0.5;
        const z = c.z + rnd(-CELL, CELL) * 0.5;
        g.effects.fire.spawn(x, g.terrain.heightAt(x, z) + 0.4, z, { vy: rnd(1, 2.4), size: rnd(1, 1.9), grow: 0.5, life: rnd(0.6, 1.1), color: 0xff7a22, bright: 2.2, drag: 1 });
      }
      if (Math.random() < dt * 2.5 * k) {
        g.effects.smoke.spawn(c.x + rnd(-2, 2), g.terrain.heightAt(c.x, c.z) + 1, c.z + rnd(-2, 2), {
          vx: rnd(-0.3, 0.3), vy: rnd(1.2, 2.4), vz: rnd(-0.3, 0.3), size: rnd(1.5, 2.5), grow: 3, life: rnd(7, 11), alpha: 0.35, color: 0x4a4540, drag: 0.4, wind: 1.6,
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
          if (Math.random() < p) this.light(c.ix + dx, c.iz + dz);
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
    if (nearest && nd < 120) {
      const pos = { x: nearest.x, y: g.terrain.heightAt(nearest.x, nearest.z) + 1, z: nearest.z };
      this.sound ??= g.audio?.loop('fire', pos, 0) ?? null;
      this.sound?.setPos(pos);
      this.sound?.setGain(Math.min(0.9, 0.3 + this.burning.length * 0.03));
    } else if (this.sound) { this.sound.stop(); this.sound = null; }
  }
}
