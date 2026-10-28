// Chemical attack (single player). In some battles the enemy's guns fire persistent agent onto a
// village you hold: a few soft pops, then a low yellow-grey cloud that drifts with the wind
// (world/Wind.js) and thins over a few minutes. Infantry in or near it mask up, and keep the
// mask on a while after leaving: masked men aim worse (UnitStack.aim) and see less
// (VisibilitySystem). Vehicles are sealed and don't care. In direct control you look out through
// the mask's lenses and hear yourself breathe.
import { wind } from '../world/Wind.js';

const FIRST = [360, 840];   // seconds into the battle the attack may come
const CHANCE = 0.6;         // share of battles that get one
const SHELLS = 6;
const RADIUS = 22;          // metres, fully spread
const DURATION = 150;       // seconds the agent hangs
const MARGIN = 12;          // masks go on this far outside the cloud
const HOLD = 25;            // seconds a man keeps his mask on after leaving the gas
const COLOR = 0xb4b47c;
export const MASKED = { spread: 1.5, sight: 0.7 };

const rnd = (a, b) => a + Math.random() * (b - a);

export class Gas {
  constructor(game) {
    this.game = game;
    this.clouds = [];
    this.shells = [];       // [time, x, z] still in the air
    this.at = Math.random() < CHANCE ? rnd(...FIRST) : Infinity;
    this.tick = 0;
    this.overlay = document.createElement('div');
    this.overlay.id = 'gas-mask';
    game.container.append(this.overlay);
    this.breath = null;
  }

  /** Shell a village with gas now (also handy from the console: game.gas.strike()). */
  strike() {
    const g = this.game;
    const points = g.modeState?.points?.points ?? [];
    const mine = points.filter((p) => p.owner === g.playerFaction);
    const pool = mine.length ? mine : points.filter((p) => p.owner);
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (!p) return;
    for (let i = 0; i < SHELLS; i++) this.shells.push([g.time + 1.5 + i * rnd(0.3, 0.8), p.x + rnd(-14, 14), p.z + rnd(-14, 14)]);
    g.radio?.add(p.owner === g.playerFaction ? `GAS, GAS, GAS! Chemical shells on ${p.name}. Masks on.` : `Chemical strike on ${p.name}. The enemy is masking up.`, p.owner === g.playerFaction ? 'bad' : 'good');
  }

  land(x, z) {
    const g = this.game;
    const y = g.terrain.heightAt(x, z);
    g.audio?.play('smoke.pop', { x, y, z }, { volume: 0.7, throttle: 0.05 });
    for (let i = 0; i < 6; i++) g.effects.smoke.spawn(x, y + 0.5, z, { vx: rnd(-3, 3), vy: rnd(0.3, 1), vz: rnd(-3, 3), size: rnd(2, 3), grow: 2, life: rnd(6, 9), alpha: 0.6, color: COLOR, drag: 1.2, wind: 0.4 });
    this.clouds.push({ x, z, r: 0, t: 0 });
  }

  update(dt) {
    const g = this.game;
    if (g.time >= this.at) { this.at = Infinity; this.strike(); }
    for (let i = this.shells.length - 1; i >= 0; i--) {
      if (g.time < this.shells[i][0]) continue;
      this.land(this.shells[i][1], this.shells[i][2]);
      this.shells.splice(i, 1);
    }
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      c.t += dt;
      if (c.t > DURATION) { this.clouds.splice(i, 1); continue; }
      c.x += wind.x * 0.4 * dt; // heavier than air: it creeps
      c.z += wind.z * 0.4 * dt;
      const fade = Math.min(1, (DURATION - c.t) / 30);
      c.r = RADIUS * Math.min(1, c.t / 10) * (0.5 + 0.5 * fade);
      if (Math.random() < dt * 5 * fade) {
        const a = Math.random() * 6.283;
        const r = Math.sqrt(Math.random()) * c.r;
        const x = c.x + Math.cos(a) * r;
        const z = c.z + Math.sin(a) * r;
        g.effects.smoke.spawn(x, g.terrain.heightAt(x, z) + rnd(0.2, 1.2), z, {
          vx: rnd(-0.2, 0.2), vy: rnd(0.02, 0.15), vz: rnd(-0.2, 0.2), size: rnd(4, 6), grow: 0.6, life: rnd(9, 13), alpha: 0.3 * fade + 0.05, color: COLOR, drag: 0.6, wind: 0.4,
        });
      }
    }
    this.tick -= dt;
    if (this.tick > 0) return;
    const step = 0.5 - this.tick;
    this.tick = 0.5;
    for (const s of g.world.stacks) {
      if (!s.usesCover) continue;
      for (const u of s.units) {
        if (!u.alive) continue;
        const gassed = this.clouds.some((c) => (u.pos.x - c.x) ** 2 + (u.pos.z - c.z) ** 2 < (c.r + MARGIN) ** 2);
        u.masked = gassed ? HOLD : Math.max(0, (u.masked ?? 0) - step);
      }
    }
    const me = g.player.unit;
    const masked = !!me?.alive && me.masked > 0;
    this.overlay.classList.toggle('on', masked);
    if (masked && !this.breath) this.breath = g.audio?.loop('breath', g.audio.listenerPos, 0.5);
    this.breath?.setPos(g.audio.listenerPos);
    if (!masked && this.breath) { this.breath.stop(); this.breath = null; }
  }
}
