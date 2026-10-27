// Squad-level state machine. It moves the stack's anchor (the area its soldiers operate in)
// and picks the group to focus; each soldier then fights for itself around that anchor
// (ai/SoldierAI.js).
//
//   Idle    – hold the area; when enemies come inside aggroRange (or shoot us) the stack
//             digs in where it stands and fights from there — it never charges on its own
//   MoveTo  – march to a point (optionally switch to Defend on arrival)
//   Attack  – advance on a group from cover to cover, settle at preferredRange; flank if
//             the fight stalls
//   Defend  – never move; soldiers dig into cover around the anchor
//   Retreat – morale broke: fall back toward base, recover, then return to Idle
//   Follow  – the player has taken over one member: the rest move and fight around them
import * as THREE from 'three';

export const AIState = Object.freeze({
  IDLE: 'Idle', MOVE: 'MoveTo', ATTACK: 'Attack', DEFEND: 'Defend', RETREAT: 'Retreat', FOLLOW: 'Following you',
});

const THINK_INTERVAL = 0.25;
const RETALIATE_WINDOW = 5;  // seconds a hit keeps an idle stack interested in its attacker
const STALL_TIME = 15;       // seconds without landing a hit before an attack tries a flank

/** Squads in flight are left alone. */
export const notFleeing = (g) => g.ai?.state !== AIState.RETREAT;

/** A group we can actually see (at least one member spotted) that isn't fleeing. */
const seenAndFighting = (g) => notFleeing(g) && g.units.some((u) => u.alive && u.spotted);

export class StackAI {
  constructor(stack, world) {
    this.stack = stack;
    this.world = world;
    this.state = AIState.IDLE;
    this.targetGroup = null;
    this.ordered = false;      // true when the player gave this order explicitly
    this.holdOnArrival = false;
    this.think = Math.random() * THINK_INTERVAL;
    this.replan = 0;
    this.settle = 0;
    this.wasMoving = false;
    this.engagedSince = this.world.time;
    this.leader = null;        // the player's unit while in Follow
    this._v = new THREE.Vector3();
  }

  // ---------------------------------------------------------------- commands

  /** `face` (yaw): hold on arrival looking that way (the player's right-drag order). */
  moveTo(point, { hold = false, ordered = true, face = null } = {}) {
    const s = this.stack;
    this.state = AIState.MOVE;
    this.targetGroup = null;
    this.ordered = ordered;
    this.holdOnArrival = hold || face !== null;
    this.faceOnArrival = face;
    s.holdFacing = null;
    s.faceTarget = null;
    s.garrison = null; // a new move order leaves any building (Buildings.garrison sets it again)
    if (this.world.river) point = this.world.river.dry(point); // an order into the river: the nearer bank
    s.moveTarget = this.world.clampToBounds(new THREE.Vector3(point.x, 0, point.z));
    if (ordered) {
      // leave the old positions now, and don't snap back into them on the next think
      for (const u of s.units) {
        this.world.cover.release(u);
        u.coverSearchT = 1;
        u.stuckN = 0;
        u.thinkT = Math.min(u.thinkT, 0.05);
      }
    }
  }

  attack(group, { ordered = true } = {}) {
    if (!group || !group.alive) return;
    this.state = AIState.ATTACK;
    this.targetGroup = group;
    this.ordered = ordered;
    this.replan = 0;
    this.settle = 0;
    this.engagedSince = this.world.time;
  }

  /** Stop where they are (a new order that isn't a move — a fire mission, smoke — cancels the old move). */
  halt() {
    if (this.stack.moveTarget || this.state === AIState.MOVE) this.defend();
  }

  defend() {
    this.defendTime = 0;
    this.autoHold = false;
    if (this.faceOnArrival != null) {
      // the way the player pointed (vehicles turn their hulls there too: stack.holdFacing)
      this.stack.facing = this.stack.holdFacing = this.faceOnArrival;
      this.faceOnArrival = null;
    } else if (this.stack.holdFacing == null) {
      // face the enemy's side of the field while holding
      const foeBase = Object.entries(this.world.bases).find(([f]) => f !== this.stack.faction)?.[1];
      if (foeBase) this.stack.facing = Math.atan2(foeBase.x - this.stack.anchor.x, foeBase.z - this.stack.anchor.z);
    }
    this.state = AIState.DEFEND;
    this.targetGroup = null;
    this.ordered = true;
    this.stack.moveTarget = null;
    this.stack.faceTarget = null;
  }

  idle() {
    this.state = AIState.IDLE;
    this.targetGroup = null;
    this.ordered = false;
    this.leader = null;
    this.stack.faceTarget = null;
  }

  /** The player took over `unit`: keep the squad gathered around it. */
  follow(unit) {
    this.state = AIState.FOLLOW;
    this.leader = unit;
    this.targetGroup = null;
    this.ordered = true;
    this.stack.faceTarget = null;
  }

  updateFollow() {
    const s = this.stack;
    const l = this.leader;
    if (!l || !l.alive || !l.possessed) {
      this.idle();
      return;
    }
    // Trail a little behind the leader, re-centring only once they've moved off.
    const d = Math.hypot(l.pos.x - s.anchor.x, l.pos.z - s.anchor.z);
    if (d > 5 + s.footprint * 0.3) {
      const back = Math.min(d, 3 + s.footprint * 0.4);
      s.moveTarget = this.world.clampToBounds(new THREE.Vector3(
        l.pos.x - Math.sin(l.yaw) * back, 0, l.pos.z - Math.cos(l.yaw) * back,
      ));
    } else if (d < 3) {
      s.moveTarget = null;
    }
    s.facing += (Math.atan2(Math.sin(l.yaw - s.facing), Math.cos(l.yaw - s.facing))) * 0.02;
  }

  retreat() {
    const s = this.stack;
    const base = this.world.bases[s.faction] ?? { x: s.anchor.x, z: s.anchor.z };
    const v = this._v.set(base.x - s.anchor.x, 0, base.z - s.anchor.z);
    const d = v.length();
    this.state = AIState.RETREAT;
    this.targetGroup = null;
    this.ordered = false;
    s.faceTarget = null;
    s.moveTarget = d > 1
      ? this.world.clampToBounds(s.anchor.clone().addScaledVector(v, Math.min(40, d - 6) / d))
      : null;
    s.barkAny('retreat');
  }

  // ---------------------------------------------------------------- update

  update(dt) {
    const s = this.stack;
    if (!s.alive) return;
    if (s.stats.structure) { this.state = AIState.DEFEND; return; } // concrete doesn't go anywhere

    // A squad you are leading in person holds its nerve.
    if (this.state !== AIState.RETREAT && this.state !== AIState.FOLLOW && s.morale < s.stats.breakMorale) {
      this.retreat();
      return;
    }

    this.think -= dt;
    const thinkNow = this.think <= 0;
    if (thinkNow) this.think = THINK_INTERVAL;
    const arrived = this.wasMoving && !s.moveTarget;
    this.wasMoving = !!s.moveTarget;

    switch (this.state) {
      case AIState.IDLE:
        if (thinkNow) this.lookForFight();
        break;
      case AIState.MOVE:
        if (!s.moveTarget) {
          if (this.holdOnArrival) this.defend();
          else this.idle();
        }
        break;
      case AIState.ATTACK:
        this.updateAttack(dt, arrived);
        break;
      case AIState.DEFEND:
        s.moveTarget = null;
        this.defendTime = (this.defendTime ?? 0) + dt;
        if (this.autoHold) {
          // a self-chosen hold ends after 25 s with no enemy in reach, so the stack is free again
          if (this.targetGroup && !this.targetGroup.alive) this.targetGroup = null;
          const near = thinkNow && this.world.nearestEnemyGroup(s.centroid, s.faction, s.stats.aggroRange, seenAndFighting);
          if (near) { this.targetGroup = near; this.quietTime = 0; }
          this.quietTime += dt;
          if (this.quietTime > 25) this.idle();
        }
        break;
      case AIState.RETREAT:
        if (!s.moveTarget && s.morale > 0.55) {
          s.barkAny('rally');
          this.idle();
        }
        break;
      case AIState.FOLLOW:
        this.updateFollow();
        break;
    }
  }

  lookForFight() {
    const s = this.stack;
    const near = this.world.nearestEnemyGroup(s.centroid, s.faction, s.stats.aggroRange, seenAndFighting);
    const attacker = s.lastAttacker;
    const foe = near ?? (attacker && attacker.alive && notFleeing(attacker) && this.world.time - s.lastHitTime < RETALIATE_WINDOW ? attacker : null);
    if (foe) this.holdAgainst(foe);
  }

  /** Dig in where we stand and focus `foe` (self-chosen; released once things go quiet). */
  holdAgainst(foe) {
    this.defend();
    this.ordered = false;
    this.autoHold = true;
    this.quietTime = 0;
    this.targetGroup = foe;
  }

  updateAttack(dt, arrived) {
    const s = this.stack;
    const g = this.targetGroup;
    // Let broken squads run instead of hunting them down (unless the player insists).
    const fled = g?.ai?.state === AIState.RETREAT && !this.ordered;
    if (!g || !g.alive || fled) {
      this.idle();
      this.lookForFight();
      return;
    }
    s.faceTarget = g.centroid;
    if (arrived) this.settle = 2.5 + Math.random() * 3.5; // let the squad get into cover

    if (s.moveTarget) {
      this.replan -= dt;
      if (this.replan > 0) return;
    } else if (this.settle > 0) {
      this.settle -= dt;
      return;
    }
    this.replan = 4;

    const R = s.stats.preferredRange;
    const d = Math.hypot(g.centroid.x - s.anchor.x, g.centroid.z - s.anchor.z);
    const t = this.world.time;
    // Stall time only counts once we're within weapon range; the approach march isn't a stall.
    if (d > s.stats.range + 4) this.engagedSince = t;
    const stalled = t - s.lastDamageDealt > STALL_TIME && t - this.engagedSince > STALL_TIME;
    if (d <= R + 5 && !stalled) {
      s.moveTarget = null;
      this.settle = 2;
      return;
    }

    // Self-chosen fights may switch to a much closer threat; player orders stick.
    if (!this.ordered) {
      const closer = this.world.nearestEnemyGroup(s.centroid, s.faction, d * 0.6, notFleeing);
      if (closer && closer !== g) this.targetGroup = closer;
    }

    // Next bound: a cover position toward the target (or sideways when the fight stalled).
    let from = s.anchor;
    if (stalled) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const nx = (g.centroid.z - s.anchor.z) / (d || 1);
      const nz = -(g.centroid.x - s.anchor.x) / (d || 1);
      from = this._v.set(s.anchor.x + nx * 18 * side, 0, s.anchor.z + nz * 18 * side);
      this.engagedSince = t;
      s.lastDamageDealt = t;
      s.barkAny('flank');
    }
    // Infantry bound from cover to cover; vehicles just drive straight in.
    const spot = s.usesCover
      ? this.world.cover.findCoverArea(from, this.targetGroup.centroid, { ideal: R, maxHop: 30, minAdvance: stalled ? -100 : 6 })
      : null;
    const dest = new THREE.Vector3();
    if (spot) {
      dest.set(spot.x, 0, spot.z);
    } else {
      const hop = s.usesCover ? 28 : 40;
      const k = Math.min(hop, Math.max(0, d - R)) / (d || 1);
      dest.set(from.x + (g.centroid.x - from.x) * k, 0, from.z + (g.centroid.z - from.z) * k);
    }
    s.moveTarget = this.world.clampToBounds(dest);
  }
}
