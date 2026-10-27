// Individual soldier decisions, made a few times per second per unit (UnitStack calls
// thinkSoldier). The stack says *where* the squad operates; each soldier decides *how*:
//   • under threat and not marching → find a cover spot around the squad that shields it
//     from the nearest enemy, claim it, and stay there (peek-and-shoot is handled in
//     UnitStack.updateWeapon)
//   • no cover available → hold a loose position, sidestep when suppressed
//   • badly wounded and not brave → pick cover further back from the threat
//   • squad retreating → drop cover and run with the group
//   • calm → drift around its loose formation slot so the group never looks rigid
import { AIState } from './StackAI.js';
import { dist2DSq } from '../core/math.js';

const _center = { x: 0, z: 0 };

export function thinkSoldier(u, stack, world, interval) {
  const s = stack.stats;
  const ai = stack.ai;
  const cover = world.cover;
  const anchor = stack.anchor;
  const leash = s.leash;

  u.wanderT -= interval;
  if (u.wanderT <= 0) {
    u.wanderT = 3 + Math.random() * 4;
    // the idle shuffle that keeps a squad from standing frozen — not for a mortar man at his tube
    if (u.stats.indirect) u.wander.set(0, 0);
    else u.wander.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4);
  }

  // Only enemies our side has spotted count as a threat; unseen ones make themselves known by
  // shooting (which reveals them).
  const threat = world.nearestEnemyCombatant(u.pos, u.faction, s.range * 1.35, true);
  if (threat && !u.threat) stack.bark(u, 'contact', 0.3);
  u.threat = threat;

  // In a building: each man stays at his window (or in the room) — systems/Buildings.js.
  if (u.window) {
    u.dest.set(u.window.x, u.window.y, u.window.z);
    u.run = false;
    return;
  }

  // Tanks and guns don't hide: they hold their place in the formation and let the
  // turret do the work.
  if (!stack.usesCover) {
    stack.slotPosition(u, u.dest);
    return;
  }

  if (ai.state === AIState.RETREAT) {
    u.run = true;
    cover.release(u);
    stack.slotPosition(u, u.dest);
    return;
  }

  // Following the player counts as marching only while the leader is actually on the move.
  const marching = !!stack.moveTarget && dist2DSq(anchor, stack.moveTarget) > 16
    && !(ai.state === AIState.FOLLOW && !ai.leader?.moving);
  u.run = !!threat && ((u.wounded && !u.atCover) || (marching && ai.ordered)); // ordered moves under fire: sprint

  // a mortar man with something to fire at (a fire mission, smoke, a flare) sets up where he
  // stands and stays at the tube until the squad is ordered on — no shuffling to a formation
  // slot or off to find cover, either of which would mean setting up all over again
  if (u.stats.indirect && u.target && !marching) {
    u.dest.set(u.pos.x, u.pos.y, u.pos.z);
    return;
  }

  if (threat && !marching) {
    let spot = u.coverSpot;
    if (spot && (cover.protection(spot, threat.pos.x, threat.pos.z) < 0.3 || dist2DSq(spot, anchor) > (leash + 3) ** 2)) {
      cover.release(u); // flanked, or the squad moved on
      spot = null;
    }
    if (!spot && u.coverSearchT <= 0) {
      _center.x = anchor.x;
      _center.z = anchor.z;
      if (u.wounded && u.courage < 1.1) {
        // back off: look for cover behind the squad, away from the threat
        const dx = anchor.x - threat.pos.x;
        const dz = anchor.z - threat.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        _center.x += (dx / d) * 7;
        _center.z += (dz / d) * 7;
      }
      spot = cover.findSpot(u, threat.pos, _center, leash, s.range);
      if (spot) {
        cover.claim(spot, u);
        stack.bark(u, 'cover', 0.3);
      } else {
        u.coverSearchT = 1.5; // nothing free; don't search every think
      }
    }
    if (spot) {
      u.dest.set(spot.x, spot.y, spot.z);
    } else {
      stack.slotPosition(u, u.dest);
      if (u.suppression > 0.6 && Math.random() < 0.35) {
        u.dest.x += (Math.random() - 0.5) * 4; // dive sideways out of the line of fire
        u.dest.z += (Math.random() - 0.5) * 4;
      }
      if (u.suppression > 0.9) stack.bark(u, 'pinned', 0.15);
    }
    return;
  }

  if (u.coverSpot && (marching || (!threat && ai.state !== AIState.DEFEND))) cover.release(u);
  if (!u.coverSpot && !marching && ai.state === AIState.DEFEND && u.coverSearchT <= 0) {
    // man the position before contact: cover that faces the squad's front
    _center.x = anchor.x + Math.sin(stack.facing) * 40;
    _center.z = anchor.z + Math.cos(stack.facing) * 40;
    const spot = cover.findSpot(u, _center, anchor, leash, s.range);
    if (spot) cover.claim(spot, u);
    else u.coverSearchT = 3;
  }
  if (u.coverSpot) u.dest.set(u.coverSpot.x, u.coverSpot.y, u.coverSpot.z);
  else stack.slotPosition(u, u.dest);
}
