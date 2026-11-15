// Gas (1918: every army's second support power, data/epoch.js). Gas shells land round a spot after
// FLIGHT s; each burst leaves a cloud that billows low, drifts with the wind (world/Wind.js) and thins
// out over LIFE s — slower in a hollow, where the gas pools. Anyone on foot inside a cloud (infantry,
// gunners, cavalry; not a tank's crew):
//   unmasked – the first breaths: casualties and nerve, until his mask is on (MASK s, quicker for a
//              veteran); a man caught a second time puts it on at once
//   masked   – moves 20 % slower and shoots half as straight (UnitStack: u.masked), until he has been
//              out of the gas UNMASK s
// The host decides; every machine draws the clouds (net event 'gas'). The computer's side calls its gas
// and its creeping barrage too (think).
import { wind } from '../world/Wind.js';
import { enemyOf } from '../data/factions.js';
import { epoch } from '../data/epoch.js';

export const GAS = { cost: 150, cooldown: 140 };
const FLIGHT = 10;      // s from the call to the shells
const SHELLS = 6;       // bursts round the spot
const SPREAD = 26;      // m round it
const RADIUS = 13;      // m: one cloud, grown
const LIFE = 75;        // s
const MASK = 3;         // s to get the mask on
const UNMASK = 8;       // s out of the gas before it comes off
const HARM = 35;        // hit points a second to an unmasked man in thick gas (most get the mask on in time)

export class Gas {
  constructor(game) {
    this.game = game;
    this.clouds = [];
    this.pending = [];
    this.readyAt = {};
    this.thinkT = 60;    // (the AI's first call: not in the opening minute)
  }

  /** Has `faction` gas to call? (1918) */
  has() { return epoch() === '1918' && this.game.map?.theatre !== 'sea' && !this.game.map?.landing?.blockships; } // (not at sea: the sea's own powers; nor at Zeebrugge: its own three)
  ready(f) { return this.game.time >= (this.readyAt[f] ?? 0); }
  cooldownLeft(f) { return Math.max(0, (this.readyAt[f] ?? 0) - this.game.time); }

  /** `faction` calls a gas bombardment on (x, z). */
  call(faction, x, z) {
    const g = this.game;
    if (!this.has()) return false;
    if (g.air.limit[faction] === 0) return g.tell(faction, 'No support in this battle') ?? false;
    if (!this.ready(faction)) return g.tell(faction, `Gas not ready (${Math.ceil(this.cooldownLeft(faction))} s)`) ?? false;
    if (!g.spendFrom('support', faction, GAS.cost)) return g.tell(faction, `Not enough ${g.poolName('support')} for gas (${GAS.cost})`) ?? false;
    this.readyAt[faction] = g.time + GAS.cooldown;
    this.pending.push({ faction, x, z, at: g.time + FLIGHT });
    g.tell(faction, `Gas shells on the way — ${FLIGHT} s. Mind the wind.`);
    return true;
  }

  /** A cloud at (x, z): the host's, and a guest's copy of it (net event). */
  cloud(x, z, faction) {
    const g = this.game, y = g.terrain.heightAt(x, z);
    const c = { x, z, r: 0, t: 0, faction, emitter: g.effects.screen({ x, y, z }, RADIUS, LIFE + 4, { color: 0xb8b46a, low: true }) };
    this.clouds.push(c);
    g.audio?.play('smoke.pop', { x, y, z }, { volume: 0.7, throttle: 0.05 });
    return c;
  }

  update(dt) {
    const g = this.game;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      if (g.time < p.at) continue;
      this.pending.splice(i, 1);
      for (let k = 0; k < SHELLS; k++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * SPREAD;
        const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
        this.cloud(x, z, p.faction);
        g.netEvent('gas', Math.round(x * 10) / 10, Math.round(z * 10) / 10, p.faction);
      }
      g.tell(enemyOf(p.faction), 'GAS! Gas! Masks on!');
    }
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      const pool = Math.max(0, Math.min(1, (g.terrain.heightAt(c.x + 6, c.z) + g.terrain.heightAt(c.x - 6, c.z) + g.terrain.heightAt(c.x, c.z + 6) + g.terrain.heightAt(c.x, c.z - 6)) / 4 - g.terrain.heightAt(c.x, c.z))); // (a hollow: it lingers)
      c.t += dt * (1 - 0.5 * pool);
      c.x += wind.x * 0.5 * dt * (1 - pool);
      c.z += wind.z * 0.5 * dt * (1 - pool);
      if (c.emitter) { c.emitter.pos.x = c.x; c.emitter.pos.z = c.z; c.emitter.pos.y = g.terrain.heightAt(c.x, c.z); }
      if (c.t > LIFE) { this.clouds.splice(i, 1); continue; }
      c.r = RADIUS * Math.min(1, c.t / 4) * (0.5 + 0.5 * Math.min(1, (LIFE - c.t) / 20));
    }
    if (g.net?.isClient) return;
    if (this.has() && (this.thinkT -= dt) <= 0) {
      this.thinkT = 12;
      for (const f of ['nato', 'pact']) if (g.net ? g.coop && f !== g.playerFaction : f !== g.playerFaction) this.think(f);
    }
    for (const s of g.world.stacks) {
      if (!s.alive || !(s.usesCover || s.kind === 'gun' || s.kind === 'cavalry')) continue;
      for (const u of s.units) {
        if (!u.alive) continue;
        const thick = this.at(u.pos.x, u.pos.z);
        if (thick > 0) {
          u.gasOut = 0;
          if (!u.masked) {
            u.maskT = (u.maskT ?? (u.gassedBefore ? 0 : MASK * (u.skill ?? 1))) - dt;
            s.damageUnit?.(u, HARM * thick * dt, null, 1);
            u.suppression = Math.min(1, (u.suppression ?? 0) + dt * 0.6);
            if (u.maskT <= 0) { u.masked = true; u.maskT = undefined; u.gassedBefore = true; }
            if (g.time - (s.gasSaid ?? -99) > 20) { s.gasSaid = g.time; g.tell(s.faction, `${s.name}: gas! Masks on!`); }
          }
        } else if (u.masked && (u.gasOut = (u.gasOut ?? 0) + dt) > UNMASK) { u.masked = false; u.gasOut = 0; }
      }
    }
  }

  /** The computer's side: gas on the biggest group of enemy foot it can see, else the creeping barrage on it. */
  think(f) {
    const g = this.game;
    const foes = g.world.stacksOf(enemyOf(f)).filter((e) => e.alive && e.usesCover && e.units.some((u) => u.alive && u.spotted));
    if (!foes.length) return;
    const t = foes.sort((a, b) => b.aliveCount - a.aliveCount)[0];
    if (this.ready(f) && Math.random() < 0.5 && this.call(f, t.centroid.x, t.centroid.z)) return;
    if (g.barrage.ready(f) && Math.random() < 0.5) g.barrage.call(f, t.centroid.x, t.centroid.z);
  }

  /** How thick the gas is at (x, z): 0 none … 1 in the middle of a fresh cloud. */
  at(x, z) {
    let k = 0;
    for (const c of this.clouds) {
      if (c.r <= 0) continue;
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < c.r) k = Math.max(k, (1 - d / c.r) * (1 - c.t / LIFE) * 1.5);
    }
    return Math.min(1, k);
  }
}
