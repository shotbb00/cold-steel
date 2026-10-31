// Counter-battery radar (data/units/cbRadar.ts): a set-up radar (UnitStack: parked, its mast up) watches a sector in
// front of it — about a quarter of the compass, so it must be faced toward the enemy. Every
// shell, bomb or rocket an enemy gun fires from inside that sector and within `range` is tracked
// back to where it came from: that gun counts as spotted for HOLD seconds (VisibilitySystem asks
// `located`), its side's radio is told where it is, and the radar's own artillery takes it as a
// target before anything else (UnitStack.pickIndirectTarget).
import { angleDelta } from '../core/math.js';

const HOLD = 25;          // seconds a located gun stays on the map
const TELL_EVERY = 15;    // seconds between radio calls about the same enemy battery

/** Compass direction from `a` to `b`: +z is north on our maps. */
function bearing(a, b) {
  const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return names[Math.round(((Math.atan2(b.x - a.x, b.z - a.z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
}

export class CounterBattery {
  constructor(game) {
    this.game = game;
  }

  update(dt) {
    for (const s of this.game.world.stacks) {
      if (!s.stats.cbRadar) continue;
      for (const u of s.units) {
        u.radarOn = s.setUpFully(u) && !this.game.jamming?.jammed(s.faction, u.pos.x, u.pos.z); // set up (UnitStack), not jammed
      }
    }
  }

  /** An indirect-fire weapon of `stack` (member `u`) has just fired: does a radar of the other side see it? */
  fired(stack, u) {
    const g = this.game;
    for (const s of g.world.stacks) {
      const R = s.stats.cbRadar;
      if (!R || s.faction === stack.faction || !s.alive) continue;
      for (const r of s.units) {
        if (!r.radarOn) continue;
        const dx = u.pos.x - r.pos.x;
        const dz = u.pos.z - r.pos.z;
        if (dx * dx + dz * dz > R.range * R.range) continue;
        if (Math.abs(angleDelta(r.yaw, Math.atan2(dx, dz))) > R.arc / 2) continue;
        for (const m of stack.units) m.locatedUntil = g.time + HOLD;
        if (g.time - (stack.locatedTold?.[s.faction] ?? -99) > TELL_EVERY) {
          (stack.locatedTold ??= {})[s.faction] = g.time;
          g.tell(s.faction, `Counter-battery: enemy ${stack.type.shortName.toLowerCase()} located to the ${bearing(r.pos, u.pos)}, ${Math.round(Math.hypot(dx, dz) / 10) * 10} m — guns, engage`);
          g.bus.emit('cb:located', { faction: s.faction, x: u.pos.x, z: u.pos.z, stack });
        }
        return;
      }
    }
  }
}
