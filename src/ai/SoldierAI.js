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
const _slot = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } };

/**
 * A vehicle's place in the formation on the move, eased: a slot pulled in behind a hedge (UnitStack.fitSlot) and out
 * again past it jumps metres in a step, and the hull swerved after every jump — tanks snaking. The place it drives for
 * follows its slot no faster than the platoon moves plus a little; halted, or in single file, it is the slot itself.
 */
function easedSlot(u, stack) {
  const now = stack.world.time;
  const dt = Math.min(0.5, Math.max(0, now - (u.slotT ?? now)));
  u.slotT = now;
  stack.slotPosition(u, _slot);
  // its place across a hedge or a wall from it (the leader went through a gap): it follows the leader's track through
  // the gap, as a crew would, instead of a route back round to it — until it has its place in sight a while (TRACK_HOLD)
  const nav = stack.world.nav;
  if (nav && stack.moveTarget && !stack.column) {
    if (!nav.visible(u.pos, _slot, stack.navFoot, u.radius)) u.trackUntil = now + TRACK_HOLD;
    if (now < (u.trackUntil ?? 0)) { if (u.colRank == null) stack.fallIn(); stack.columnSlot(u, _slot); }
  } else u.trackUntil = 0;
  const e = u.slotEase;
  if (!e || !stack.moveTarget || stack.column) u.slotEase = { x: _slot.x, z: _slot.z };
  else {
    const dx = _slot.x - e.x, dz = _slot.z - e.z, d = Math.hypot(dx, dz), max = (stack.stats.speed * SLOT_EASE + 1.5) * dt;
    if (d > max) { e.x += (dx / d) * max; e.z += (dz / d) * max; } else { e.x = _slot.x; e.z = _slot.z; }
  }
  // in single file, its place still behind it (the way the stack goes): it waits for the file to come by — not a turn right round
  if ((stack.column || now < (u.trackUntil ?? 0)) && stack.moveTarget && (_slot.x - u.pos.x) * Math.sin(stack.facing) + (_slot.z - u.pos.z) * Math.cos(stack.facing) < -3) { u.dest.copy(u.pos); return; }
  u.dest.set(u.slotEase.x, stack.world.terrain.heightAt(u.slotEase.x, u.slotEase.z), u.slotEase.z);
}
const TRACK_HOLD = 3;   // s its place must be in sight before it leaves the leader's track for it again
const SLOT_EASE = 1.15; // the eased place's speed, times the stack's: it keeps up, a jump becomes a drift

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

  // 1806 bayonets: an enemy within reach is struck (a hit or a parry, every think)
  if (s.bayonet && threat && !u.window && dist2DSq(u.pos, threat.pos) < (1.5 + (threat.radius ?? 0.4)) ** 2 && Math.random() < 0.55) {
    threat.receiveDamage(s.bayonet * (0.6 + Math.random() * 0.7) * u.damageMult * (threat.stack.stats.cavalry ? 0.6 : 1), stack, 0, null, 0.05); // (a rider sits high, out of the bayonet's reach)
  }
  // charging: the ranks break into the enemy, each man for the nearest
  if (stack.charging && threat && dist2DSq(u.pos, threat.pos) < 14 * 14) {
    if (u.coverSpot) cover.release(u);
    u.dest.set(threat.pos.x, threat.pos.y, threat.pos.z);
    u.run = true;
    return;
  }
  // Drilled foot (1806 line infantry): every man keeps his place in the ranks — no cover, no shuffle.
  if (s.drill && !u.window) {
    u.run = !!stack.charging;
    if (u.coverSpot) cover.release(u);
    u.wander.set(0, 0);
    stack.slotPosition(u, u.dest);
    return;
  }

  // In a building: each man stays at his window (or in the room) — systems/Buildings.js.
  if (u.window) {
    u.dest.set(u.window.x, u.window.y, u.window.z);
    u.run = false;
    return;
  }

  // Tanks and guns don't hide: they hold their place in the formation and let the
  // turret do the work.
  if (stack.stats.naval) { // a ship: straight along its route, or stop where it is
    if (stack.moveTarget) { const r = stack.routeTarget(); u.dest.set(r.x, u.pos.y, r.z); } else u.dest.copy(u.pos);
    return;
  }
  if (!stack.usesCover) {
    const pos = ai.plannedSpots?.get(u); // a dug-in vehicle position the order gave it
    const doz = u.dozing;                // a combat engineer vehicle digging: back and forth over the pit
    if (doz) {
      const k = Math.sin(stack.world.time * 0.45 + u.phase) * 3;
      u.dest.set(doz.x + Math.sin(doz.yaw) * k, 0, doz.z + Math.cos(doz.yaw) * k);
      u.dest.y = stack.world.terrain.heightAt(u.dest.x, u.dest.z);
    } else if (pos) u.dest.set(pos.x, stack.world.terrain.heightAt(pos.x, pos.z), pos.z);
    else easedSlot(u, stack);
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
  u.run = (marching && stack.sprinting) || (!!threat && ((u.wounded && !u.atCover) || (marching && ai.ordered))); // a sprint order, or ordered moves under fire

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
    // the spot the order planned (and the command view showed), while it is still free
    const planned = ai.plannedSpots?.get(u);
    const free = planned && (!planned.occupant || planned.occupant === u || !planned.occupant.alive);
    const spot = free ? planned : cover.findSpot(u, _center, anchor, leash, s.range);
    if (spot) cover.claim(spot, u);
    else u.coverSearchT = 3;
  }
  if (u.coverSpot) u.dest.set(u.coverSpot.x, u.coverSpot.y, u.coverSpot.z);
  else stack.slotPosition(u, u.dest);
}
