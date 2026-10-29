// Chemical fire mission: a support power beside the air strikes (I, COST CP, a cooldown per side).
// Click a spot: after the shells' flight time a few soft pops, then a low yellow-grey cloud
// that drifts with the wind (world/Wind.js) and thins over a few minutes. Infantry of both sides
// in or near it mask up, and keep the mask on a while after leaving: masked men aim worse
// (UnitStack.aim) and see less (VisibilitySystem). Vehicles are sealed and don't care. In direct
// control you look out through the mask's lenses and hear yourself breathe.
// The host runs the masks; each landing is sent to a multiplayer client ('gas' event), which
// grows and drifts the same cloud itself (the wind follows the shared battle clock).
import { wind } from '../world/Wind.js';

export const GAS = { cost: 200, cooldown: 150, label: 'Gas', key: 'I' };
const FLIGHT = 9;           // seconds from the call to the first shell landing
const SHELLS = 6;
const SPREAD = 14;          // metres around the aim point the shells fall
const RADIUS = 22;          // metres a cloud spreads to
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
    this.readyAt = {};      // faction → battle time it can fire again
    this.tick = 0;
    this.overlay = document.createElement('div');
    this.overlay.id = 'gas-mask';
    game.container.append(this.overlay);
    this.breath = null;
  }

  ready(faction) {
    return this.game.time >= (this.readyAt[faction] ?? 0);
  }

  cooldownLeft(faction) {
    return Math.max(0, (this.readyAt[faction] ?? 0) - this.game.time);
  }

  /** `faction` fires gas at (x, z). Returns false if it can't (cooldown, command points). */
  call(faction, x, z) {
    const g = this.game;
    if (g.air.limit[faction] === 0) return g.tell(faction, 'No support in this battle') ?? false; // the air support rule covers gas too
    if (!this.ready(faction)) return g.tell(faction, `Gas not ready (${Math.ceil(this.cooldownLeft(faction))} s)`) ?? false;
    if (!g.spend(faction, GAS.cost)) return g.tell(faction, `Not enough command points for gas (${GAS.cost})`) ?? false;
    this.readyAt[faction] = g.time + GAS.cooldown;
    for (let i = 0; i < SHELLS; i++) this.shells.push([g.time + FLIGHT + i * rnd(0.3, 0.8), x + rnd(-SPREAD, SPREAD), z + rnd(-SPREAD, SPREAD)]);
    g.tellBoth(faction, `Gas fire mission — shells landing in ${FLIGHT} s`, 'GAS, GAS, GAS! Chemical shells incoming. Masks on.');
    return true;
  }

  /** A shell bursts: a soft pop and the start of a cloud (on the client too, from the host's event). */
  land(x, z) {
    const g = this.game;
    g.netEvent('gas', Math.round(x * 10) / 10, Math.round(z * 10) / 10);
    const y = g.terrain.heightAt(x, z);
    g.audio?.play('smoke.pop', { x, y, z }, { volume: 0.7, throttle: 0.05 });
    for (let i = 0; i < 6; i++) g.effects.smoke.spawn(x, y + 0.5, z, { vx: rnd(-3, 3), vy: rnd(0.3, 1), vz: rnd(-3, 3), size: rnd(2, 3), grow: 2, life: rnd(6, 9), alpha: 0.6, color: COLOR, drag: 1.2, wind: 0.4 });
    this.clouds.push({ x, z, r: 0, t: 0 });
  }

  update(dt) {
    const g = this.game;
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
    if (this.tick > 0 || g.net?.isClient) return; // masks are the host's business
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
