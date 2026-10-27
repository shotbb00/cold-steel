// Leadership: allied units near the unit you are controlling fight harder (faster fire,
// more damage, quicker reloads via the `buffed` flag) and their stacks steady faster.
// Recomputed every frame, so stepping away drops the buff.
import { dist2DSq } from '../core/math.js';

export const LEADER_AURA = { radius: 16, fireRate: 1.3, damage: 1.2 };

export class AuraSystem {
  constructor(world) {
    this.world = world;
    this.count = 0; // allies currently empowered (for the HUD)
  }

  update(leader) {
    for (const s of this.world.stacks) {
      for (const u of s.units) {
        u.fireRateMult = 1;
        u.damageMult = 1;
        u.buffed = false;
      }
    }
    this.count = 0;
    if (!leader || !leader.alive) return;
    const { radius, fireRate, damage } = LEADER_AURA;
    const r2 = radius * radius;
    for (const s of this.world.stacks) {
      if (s.faction !== leader.faction || !s.alive) continue;
      for (const u of s.units) {
        if (!u.alive || u === leader || dist2DSq(u.pos, leader.pos) > r2) continue;
        u.fireRateMult = fireRate;
        u.damageMult = damage;
        u.buffed = true;
        this.count++;
      }
    }
  }
}
