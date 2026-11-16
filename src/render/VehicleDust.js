// What a moving vehicle throws up behind it: a dust plume on a desert map, a spray of snow in winter,
// a light haze on a dry day anywhere else — none in rain or at sea. Faster, thicker; only where it can be
// seen (a hidden enemy's dust would give it away — fog of war decides, as for everything else).
const LOOK = {
  desert: { color: 0xc8b48a, k: 2.2, size: 1.7 },
  winter: { color: 0xe8ecf0, k: 1.1, size: 1.1 },
  dry: { color: 0x8a7a62, k: 0.55, size: 1 },
};
const MIN_SPEED = 1.5; // m/s

export class VehicleDust {
  constructor(game) {
    this.game = game;
    const w = game.conditions?.weather;
    this.look = game.map.climate === 'desert' ? LOOK.desert : game.map.climate === 'winter' ? LOOK.winter : w === 'rain' ? null : LOOK.dry;
    this.t = 0;
  }

  update(dt) {
    if (!this.look || dt <= 0 || (this.t += dt) < 0.1) return;
    const span = this.t;
    this.t = 0;
    const { color, k, size } = this.look;
    const smoke = this.game.effects.smoke;
    const T = this.game.world.terrain;
    for (const s of this.game.world.stacks) {
      if (!s.alive || s.stats.naval || s.stats.air || s.kind === 'infantry' || s.kind === 'cavalry' || s.visible === false) continue;
      for (const u of s.units) {
        if (!u.alive || u.visible === false) continue;
        const v = Math.hypot(u.vel.x, u.vel.z);
        if (v < MIN_SPEED || Math.random() > Math.min(1, (v / 12) * k * span * 16)) continue;
        const back = -(u.radius ?? 2) * 0.9;
        const x = u.pos.x + Math.sin(u.yaw) * back + (Math.random() - 0.5) * 1.2;
        const z = u.pos.z + Math.cos(u.yaw) * back + (Math.random() - 0.5) * 1.2;
        smoke.spawn(x, T.heightAt(x, z) + 0.3, z, {
          vy: 0.3 + Math.random() * 0.4,
          size: size * (1.3 + v / 10), grow: 2.4, life: 2 + Math.random() * 1.6, alpha: 0.4, color, drag: 1, wind: 0.9,
        });
      }
    }
  }
}
