// The Soviet Army's preparatory barrage (data/doctrine.js 'mass'): a support power beside the air
// strikes (Z). Click a spot: after the shells' flight a whole sector `radius` m round it
// is shelled for `duration` s by the division's guns off the map — heavy shells falling at random
// across it, cratering, felling trees, pinning everything inside. It hits whoever is there.
import { VisibilitySystem } from './VisibilitySystem.js';
import * as THREE from 'three';
import { doctrine } from '../data/doctrine.js';
import { enemyOf } from '../data/factions.js';

const FLIGHT = 12;          // seconds from the call to the first shells
const RATE = 2.5;           // shells a second across the sector
const SHELL = { damage: 170, splash: 7, crater: 0.5, height: 140, speed: 170 };
const COLOR = new THREE.Color(1, 0.8, 0.5);
const DOWN = new THREE.Vector3(0, -1, 0);
const _o = new THREE.Vector3();
const _t = new THREE.Vector3();

export class Barrage {
  constructor(game) {
    this.game = game;
    this.readyAt = {};
    this.active = [];
  }

  ready(faction) {
    return this.game.time >= (this.readyAt[faction] ?? 0);
  }

  cooldownLeft(faction) {
    return Math.max(0, (this.readyAt[faction] ?? 0) - this.game.time);
  }

  /** `faction` calls the barrage on (x, z). False if it can't (not its army's, cooldown, CP). */
  call(faction, x, z) {
    const g = this.game;
    const tot = doctrine(g, faction, 'tot');
    if (tot) return this.timeOnTarget(faction, x, z, tot);
    const m = doctrine(g, faction, 'mass');
    if (!m) return false;
    if (g.air.limit[faction] === 0) return g.tell(faction, 'No support in this battle') ?? false;
    if (!this.ready(faction)) return g.tell(faction, `Barrage not ready (${Math.ceil(this.cooldownLeft(faction))} s)`) ?? false;
    if (!g.spendFrom('support', faction, m.cost)) return g.tell(faction, `Not enough ${g.poolName('support')} for the barrage (${m.cost})`) ?? false;
    this.readyAt[faction] = g.time + m.cooldown;
    this.active.push({ faction, x, z, r: m.radius, start: g.time + FLIGHT, end: g.time + FLIGHT + m.duration, acc: 0 });
    g.tell(faction, `Preparatory barrage — the guns open up in ${FLIGHT} s`);
    g.tell(enemyOf(faction), 'Heavy artillery coming in!');
    return true;
  }

  /**
   * The 1945 US Army's Time on Target: every gun and mortar of `faction` (in co-op the caller's)
   * with (x, z) in its reach fires one round per tube, each launched so that its shell is in the
   * air exactly `flight` s — they all land in the same moment, scattered as each gun scatters.
   */
  timeOnTarget(faction, x, z, t) {
    const g = this.game;
    if (!this.ready(faction)) return g.tell(faction, `Time on Target not ready (${Math.ceil(this.cooldownLeft(faction))} s)`) ?? false;
    const tubes = [];
    for (const s of g.world.stacksOf(faction)) {
      if (g.coop && g.currentOwner && s.owner && s.owner !== g.currentOwner) continue;
      for (const u of s.units) {
        const st = u.stats;
        if (!u.alive || !st.indirect) continue;
        const d = Math.hypot(x - u.pos.x, z - u.pos.z);
        if (d <= st.range && d >= (st.minRange ?? 0)) tubes.push({ s, u, d });
      }
    }
    if (!tubes.length) return g.tell(faction, 'Time on Target: no guns or mortars in range') ?? false;
    if (!g.spendFrom('support', faction, t.cost)) return g.tell(faction, `Not enough ${g.poolName('support')} for Time on Target (${t.cost})`) ?? false;
    this.readyAt[faction] = g.time + t.cooldown;
    const T = t.flight;
    for (const { s, u, d } of tubes) {
      const st = u.stats;
      const miss = ((st.scatter ?? 3) + (st.scatterPerM ?? 0.03) * d) * s.observed({ x, z });
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * miss;
      const tx = x + Math.cos(a) * r;
      const tz = z + Math.sin(a) * r;
      const ty = g.terrain.heightAt(tx, tz);
      s.muzzleWorld(u, _o);
      const grav = st.gravity ?? 25;
      // the launch velocity that puts the shell on (tx, ty, tz) after exactly T s
      const vx = (tx - _o.x) / T;
      const vz = (tz - _o.z) / T;
      const vy = (ty - _o.y + 0.5 * grav * T * T) / T;
      const speed = Math.hypot(vx, vy, vz);
      g.projectiles.spawn({
        origin: _o, dir: _t.set(vx / speed, vy / speed, vz / speed), speed, damage: st.damage * u.damageMult, faction,
        color: s.boltColor, size: st.boltSize, source: s, life: T + 3, splash: st.splash, pierce: st.pierce ?? 0, vsArmor: st.vsArmor ?? 1, suppress: 3,
        gravity: grav, target: new THREE.Vector3(tx, ty, tz), whistleAt: T - 1.1, crater: st.crater ?? 0, tracer: false,
      });
      g.effects.muzzle(_o, _t, 1, st.muzzleKind ?? 'artillery');
      g.audio?.weapon(faction, st.weaponSound ?? s.weaponSound, _o);
      VisibilitySystem.revealShooter(u);
    }
    g.tell(faction, `Time on Target: ${tubes.length} tube${tubes.length > 1 ? 's' : ''} fired — all rounds land together in ${T} s`);
    return true;
  }

  update(dt) {
    const g = this.game;
    if (g.net?.isClient) return;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      if (g.time > b.end) { this.active.splice(i, 1); continue; }
      if (g.time < b.start) continue;
      for (b.acc += dt * RATE; b.acc >= 1; b.acc--) this.shell(b);
    }
  }

  shell(b) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * b.r;
    const x = b.x + Math.cos(a) * r;
    const z = b.z + Math.sin(a) * r;
    const y = this.game.terrain.heightAt(x, z);
    this.game.projectiles.spawn({
      origin: _o.set(x, y + SHELL.height, z), dir: DOWN, speed: SHELL.speed, damage: SHELL.damage, faction: b.faction,
      color: COLOR, size: 1.5, life: SHELL.height / SHELL.speed + 1, splash: SHELL.splash, pierce: 0.3, vsArmor: 0.8, suppress: 3,
      target: _t.set(x, y, z), whistleAt: Math.max(0.2, SHELL.height / SHELL.speed - 1.1), crater: SHELL.crater, tracer: false,
    });
  }
}
