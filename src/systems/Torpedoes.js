// Torpedoes: fired in a spread from a ship's torpedo mount (entities/UnitStack.js updateShipWeapons)
// at where the target will be, they run straight at their own speed just under the surface until
// they hit a ship (anywhere along its length and beam: data/units45/ships.js `hull`), run onto a
// reef or the shallows, or run out of range. A hit holes the hull (UnitStack.shipHit: flooding).
// The wake shows where one runs — the US Mark 15's bubbles plainly, the Japanese Long Lance
// (oxygen-driven, `wakeless`) hardly at all. The host runs them (a client sees the hits).
import { enemyOf } from '../data/factions.js';

const SPREAD = 0.045;   // rad between the fish of one spread
const RUN_DEPTH = 0.4;  // m under the surface

export class Torpedoes {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.charges = []; // depth charges sinking to their depth: { x, z, at, faction, source, radius, damage }
  }

  /**
   * A pattern from ship `src` (unit `u`) over submarine `t`: rolled off the stern and thrown either
   * side, laid round where the sonar puts the boat (some 15 m out, either way), set for its depth.
   */
  dropCharges(src, u, t, dc) {
    const now = this.game.time;
    const bx = Math.sin(u.yaw), bz = Math.cos(u.yaw);
    const cx = t.pos.x + (Math.random() - 0.5) * 30, cz = t.pos.z + (Math.random() - 0.5) * 30;
    for (let i = 0; i < dc.count; i++) {
      const side = (i - (dc.count - 1) / 2) * 14;   // across the track
      const back = ((i % 2) - 0.5) * 16;             // along it
      this.charges.push({ x: cx + bx * back + bz * side, z: cz + bz * back - bx * side, at: now + 3 + (t.depth ?? 20) * 0.08 + Math.random() * 0.6,
        faction: src.faction, source: src, radius: dc.radius, damage: dc.damage });
    }
    this.game.netEvent('dcs', this.charges.slice(-dc.count).map((c) => [Math.round(c.x), Math.round(c.z), Math.round((c.at - now) * 10) / 10, c.faction]));
    this.game.tell(src.faction, `${src.name}: depth charges!`);
  }

  /** A spread from `from` (world) at target unit `t`, by stack `src`'s mount `m` { count, speed, range, damage, wakeless }. */
  launch(src, from, t, m) {
    // where the target will be when the fish gets there (two rounds of the intercept are enough)
    let tx = t.pos.x, tz = t.pos.z;
    for (let i = 0; i < 2; i++) {
      const time = Math.hypot(tx - from.x, tz - from.z) / m.speed;
      tx = t.pos.x + (t.vel?.x ?? 0) * time;
      tz = t.pos.z + (t.vel?.z ?? 0) * time;
    }
    const yaw = Math.atan2(tx - from.x, tz - from.z);
    const level = this.game.world.river?.level ?? 0;
    for (let i = 0; i < m.count; i++) {
      const a = yaw + (i - (m.count - 1) / 2) * SPREAD + (Math.random() - 0.5) * 0.01;
      this.list.push({
        x: from.x + Math.sin(a) * 6, z: from.z + Math.cos(a) * 6, y: level - RUN_DEPTH, dx: Math.sin(a), dz: Math.cos(a),
        speed: m.speed, left: m.range, damage: m.damage, wakeless: !!m.wakeless, faction: src.faction, source: src, fx: Math.random() * 0.2,
      });
    }
    this.game.netEvent('torps', this.list.slice(-m.count).map((f) => [Math.round(f.x), Math.round(f.z), Math.round(f.dx * 1000) / 1000, Math.round(f.dz * 1000) / 1000, f.speed, Math.round(f.left), f.wakeless ? 1 : 0, f.faction]));
    this.game.audio?.play('torpedo.launch', from, { volume: 0.8, throttle: 0.5 });
    this.game.tell(src.faction, `${src.name}: torpedoes away`);
  }

  update(dt) {
    if (this.charges.length) this.updateCharges();
    if (!this.list.length) return;
    const g = this.game;
    const terrain = g.terrain;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      const step = f.speed * dt;
      f.x += f.dx * step;
      f.z += f.dz * step;
      f.left -= step;
      // the wake: bubbles behind it (a Long Lance's barely there)
      if ((f.fx -= dt) <= 0) {
        f.fx = f.wakeless ? 0.6 : 0.12;
        g.effects.smoke.spawn(f.x - f.dx * 4, f.y + 0.5, f.z - f.dz * 4, {
          vx: 0, vy: 0.2, vz: 0, size: f.wakeless ? 0.8 : 1.4, grow: 0.8, life: f.wakeless ? 2 : 5, alpha: f.wakeless ? 0.12 : 0.5, color: 0xeef4f6, drag: 1, wind: 0.1,
        });
      }
      let gone = f.left <= 0;
      if (!gone && terrain.heightAt(f.x, f.z) > f.y - 0.5) { // onto a reef or the shallows: it goes off there
        g.effects.waterSplash?.({ x: f.x, y: f.y + RUN_DEPTH, z: f.z }, 2);
        gone = true;
      }
      if (!gone) {
        const hit = this.shipAt(f);
        if (hit) {
          g.effects.waterSplash?.({ x: f.x, y: f.y + RUN_DEPTH, z: f.z }, 3.5);
          g.audio?.play('depthcharge', hit.pos, { volume: 1 });       // under her keel: the deep blow…
          g.audio?.play('splash.big', hit.pos, { volume: 1, throttle: 0 }); // …and the column thrown over her
          if (!g.net?.isClient) {
            hit.receiveDamage(f.damage, f.source, 0.7, { x: f.dx, z: f.dz }, 1);
            if (hit.alive) hit.stack.shipHit(hit, 0, true);
          }
          gone = true;
        }
      }
      if (gone) this.list.splice(i, 1);
    }
  }

  /** A multiplayer guest: the host's fish and charges, to watch (no damage dealt here). */
  remoteTorps(list) {
    const level = this.game.world.river?.level ?? 0;
    for (const [x, z, dx, dz, speed, left, wakeless, faction] of list) this.list.push({ x, z, y: level - RUN_DEPTH, dx, dz, speed, left, damage: 0, wakeless: !!wakeless, faction, source: null, fx: 0 });
  }

  remoteCharges(list) {
    for (const [x, z, delay, faction] of list) this.charges.push({ x, z, at: this.game.time + delay, faction, source: null, radius: 0, damage: 0 });
  }

  /** Depth charges going off: a hump of white water, and every enemy boat near enough down there is hurt. */
  updateCharges() {
    const g = this.game;
    const now = g.time;
    const level = g.world.river?.level ?? 0;
    for (let i = this.charges.length - 1; i >= 0; i--) {
      const c = this.charges[i];
      if (now < c.at) continue;
      this.charges.splice(i, 1);
      g.effects.waterSplash?.({ x: c.x, y: level, z: c.z }, 2.6);
      g.audio?.play('depthcharge', { x: c.x, y: level, z: c.z }, { volume: 0.85, throttle: 0.15 });
      g.audio?.play('splash', { x: c.x, y: level, z: c.z }, { volume: 0.6, throttle: 0.15 });
      if (g.net?.isClient) continue;
      for (const s of g.world.stacksOf(enemyOf(c.faction))) {
        if (!s.stats.submarine) continue;
        for (const u of s.units) {
          if (!u.alive) continue;
          const d = Math.hypot(u.pos.x - c.x, u.pos.z - c.z);
          if (d > c.radius) continue;
          const k = 1 - d / c.radius;
          u.receiveDamage(c.damage * k * k * ((u.depth ?? 0) > 25 ? 0.7 : 1), c.source, 0.9, null, 1); // (a deep boat is harder to bracket)
          if (u.alive && k > 0.4) u.leak = (u.leak ?? 0) + 0.0035 * k; // close: plates sprung, she takes water (a torpedo's hole is far worse)
        }
      }
    }
  }

  /** The enemy ship whose hull the torpedo `f` is inside, if any. */
  shipAt(f) {
    for (const s of this.game.world.stacksOf(enemyOf(f.faction))) {
      if (!s.stats.naval || !s.type.hull) continue;
      const { length, beam } = s.type.hull;
      for (const u of s.units) {
        if (!u.alive || (u.depth ?? 0) > 8) continue; // (a submarine deep down: under it)
        const dx = f.x - u.pos.x, dz = f.z - u.pos.z;
        const along = dx * Math.sin(u.yaw) + dz * Math.cos(u.yaw);
        const across = dx * Math.cos(u.yaw) - dz * Math.sin(u.yaw);
        if (Math.abs(along) < length / 2 && Math.abs(across) < beam / 2 + 0.8) return u;
      }
    }
    return null;
  }
}
