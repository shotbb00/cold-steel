// Smoke screens. A cloud blocks line of sight through it — for spotting (VisibilitySystem) and
// for picking targets (UnitStack.pickTarget) — so a screen lets troops cross open ground, pull
// back, or blind an MG nest. Clouds billow up over a few seconds, hang, then thin out and stop
// blocking before the last wisps drift away. Sources:
//   vehicle smoke grenade launchers – popped automatically when an anti-armour hit lands, or on
//                                     command (K); `stats.smoke.charges` per stack
//   mortar smoke rounds             – K with a mortar team selected, then click the spot
//   (the enemy director screens its assaults with its mortars)
export const SMOKE = {
  radius: 10,       // metres, fully grown
  build: 3.5,       // seconds to billow to full size
  duration: 55,     // seconds it blocks sight
  thin: 12,         // last seconds over which it shrinks away
};

export class SmokeSystem {
  constructor(game) {
    this.game = game;
    this.clouds = [];
  }

  /** Lay a cloud at (x, z). */
  add(x, z, { radius = SMOKE.radius, duration = SMOKE.duration } = {}) {
    const cloud = { x, z, maxR: radius, r: 0, t: 0, duration };
    this.clouds.push(cloud);
    const y = this.game.terrain.heightAt(x, z);
    this.game.effects.screen({ x, y, z }, radius, duration + 6);
    this.game.audio?.play('smoke.pop', { x, y, z }, { volume: 0.5, throttle: 0.1 });
    return cloud;
  }

  update(dt) {
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      c.t += dt;
      if (c.t > c.duration) { this.clouds.splice(i, 1); continue; }
      const grow = Math.min(1, c.t / SMOKE.build);
      const fade = Math.min(1, (c.duration - c.t) / SMOKE.thin);
      c.r = c.maxR * grow * (0.4 + 0.6 * fade);
    }
  }

  /** True if the ground line a→b passes through any cloud. */
  blocks(ax, az, bx, bz) {
    for (const c of this.clouds) {
      if (c.r < 1.5) continue;
      const dx = bx - ax;
      const dz = bz - az;
      const len2 = dx * dx + dz * dz || 1e-6;
      const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / len2));
      const px = ax + dx * t - c.x;
      const pz = az + dz * t - c.z;
      if (px * px + pz * pz < c.r * c.r) return true;
    }
    return false;
  }

  /** True if (x, z) is inside a cloud. */
  inside(x, z) {
    for (const c of this.clouds) if ((x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return true;
    return false;
  }
}
