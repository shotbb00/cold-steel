// A troop stack: a squad of one unit type sharing an anchor (operating area), orders and
// morale. Its StackAI moves the anchor; every member then acts on its own around it.
//
// Unit kinds (type.kind):
//   infantry – think (ai/SoldierAI.js), take cover, kneel, peek and fire, reload, flinch
//   vehicle  – hull steers toward its slot, turret tracks targets independently
// Weapons (stats.weapon): 'rifle' (default: rifles, MGs), 'rocket' (slow, smoke trail, splash),
// 'cannon' (tank gun, splash), 'artillery' (indirect ballistic lob), 'beam' (combat/BeamSystem.js,
// unused for now). `stats.tracer` is the share of rounds drawn as tracers.
// A unit the player has taken over (u.possessed) is driven by systems/PlayerControl.js; the
// stack only keeps its body state (reload, posture, timers) ticking.
// Rivers (world/River.js, maps with `river`): deep water stops everyone, shallow water slows;
// a stack whose goal is over the river steers its anchor to the best crossing, over it in a
// narrow column, and on (`this.crossing`).
//
// Veterancy: kills earn experience (systems/BattleStats.js → gainXp); ranks 1–3 (Veteran,
// Hardened, Elite) aim faster and truer, shrug off losses and steady themselves sooner.
//
// Infantry is fragile on purpose: a solid hit usually puts a soldier down, otherwise he is
// wounded (slow, goes prone, crawls back) and the next hit finishes him. Soldiers stand,
// crouch or go prone; rifles aim before every shot (longer at range and under fire), so
// long-range contact is a slow exchange of single shots rather than a firestorm.
import * as THREE from 'three';
import { MASKED } from '../systems/Gas.js';
import { FACTIONS, enemyOf } from '../data/factions.js';
import { barkLine } from '../data/barks.js';
import { angleDelta, clamp, dist2DSq } from '../core/math.js';
import { Unit } from './Unit.js';
import { createRenderer } from '../render/index.js';
import { thinkSoldier } from '../ai/SoldierAI.js';
import { AIState } from '../ai/StackAI.js';
import { VisibilitySystem } from '../systems/VisibilitySystem.js';

// Officers: a rifle platoon's first man leads it. While he lives, his own men and every friendly
// stack within LEAD_RANGE lose morale slower, rally faster and react quicker; once he's down
// his platoon is slower than one that never had him.
const WITHDRAWN = 30;      // m from its base where a withdrawing stack leaves the field
const SET_UP_SLACK = 2.5;  // m a unit may shuffle and still count as set up (u.setUp)
const RADAR_BONUS = 1.2; // air defence under a friendly air search radar reaches this much further (AirStrike.radarCovers)
const LEAD_RANGE = 45;      // metres
const LED = { nerve: 0.6, rally: 1.5, react: 0.75 };
const LEADERLESS = { react: 1.25 };
const OFFICER_DOWN = 0.25;  // morale lost on top when the platoon leader falls
// Ambush: a unit nobody has spotted yet fires its first volley with this much more punch
const AMBUSH = { damage: 1.6, suppress: 2, tellEvery: 30 };
// Look-ahead: a moving unit probes the way in front of it; when a wall, hedge or tree stands
// between it and where it's going, it heads for the obstacle's nearer end (or past a trunk) at
// once instead of walking into it, and turns back onto its line once that is clear.
// checkStuck's sidestep stays as the fallback for dead ends.
const LOOK = { every: 0.2, ahead: 1.6, min: 3, max: 8, clear: 0.8, passed: 2 };
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const LOOSENESS = 1.3;     // formation slots are spread this much wider than the nominal spacing
const PERSONAL_SPACE = 0.4; // metres kept between two bodies (on top of their radii)
const BARK_COOLDOWN = 2.2; // seconds between callouts from one stack
export const RANKS = [
  { name: 'Regular', xp: 0 },
  { name: 'Veteran', xp: 3 },
  { name: 'Hardened', xp: 8 },
  { name: 'Elite', xp: 16 },
];

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _p = new THREE.Vector3();
const _near = [];

let nextId = 1;

export class UnitStack {
  /**
   * @param {object} o
   * @param {object} o.type      unit type definition (data/units)
   * @param {string} o.faction   faction id
   * @param {{x:number,z:number}} o.position
   * @param {number} o.facing    yaw in radians (0 = +z)
   * @param {object} o.services  { scene, bus, projectiles, beams, effects, world, audio }
   */
  constructor({ type, faction, position, facing = 0, services, name, count: countOverride, id = null }) {
    this.id = id ?? nextId++;              // a multiplayer client takes the host's ids
    if (this.id >= nextId) nextId = this.id + 1;
    this.type = type;
    this.kind = type.kind ?? 'infantry';
    this.stats = type.factionStats?.[faction] ? { ...type.stats, ...type.factionStats[faction] } : type.stats; // per-side differences
    this.faction = faction;
    this.factionDef = FACTIONS[faction];
    this.name = name ?? `${type.shortName} ${this.id}`;
    this.services = services;
    this.world = services.world;

    // Group interface: alive, faction, centroid, units
    this.anchor = new THREE.Vector3(position.x, this.world.terrain.heightAt(position.x, position.z), position.z);
    this.centroid = this.anchor.clone();
    this.facing = facing;
    this.moveTarget = null; // Vector3 the anchor marches toward (set by AI)
    this.faceTarget = null; // Vector3 the squad orients toward (set by AI)
    this.ai = null;
    this.morale = 1;
    this.lastAttacker = null;
    this.lastHitTime = -Infinity;
    this.lastDamageDealt = this.world.time;
    this.lastBark = -Infinity;

    const { spacing } = type.formation;
    const count = countOverride ?? type.formation.count;
    const columns = Math.min(type.formation.columns, count);
    const rows = Math.ceil(count / columns);
    this.footprint = Math.max((Math.max(columns, rows) * spacing * LOOSENESS) / 2 + 0.6, this.stats.radius * 2.5);
    this.units = [];
    for (let i = 0; i < count; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const jitter = count > 1 ? 0.6 : 0;
      const offset = new THREE.Vector2(
        (col - (columns - 1) / 2) * spacing + (Math.random() - 0.5) * jitter,
        -(row - (rows - 1) / 2) * spacing + (Math.random() - 0.5) * jitter,
      );
      const u = new Unit(this, i, offset);
      this.slotPosition(u, u.pos);
      u.dest.copy(u.pos);
      this.units.push(u);
    }
    this.aliveCount = count;
    this.hadOfficer = type.kind === 'infantry' && count >= 8 && !type.stats.structure; // a rifle platoon has a leader
    if (this.hadOfficer) this.units[0].officer = true;
    this.led = false;
    this.smokeLeft = type.stats.smoke?.charges ?? 0;             // vehicle smoke grenade salvos
    this.smokeRounds = type.specialist?.stats.smokeRounds ?? this.stats.smokeRounds ?? 0;  // mortar smoke bombs (SP mortars: in stats)
    this.flareRounds = type.specialist?.stats.flareRounds ?? this.stats.flareRounds ?? 0;  // …and illumination rounds
    this.smokeOrder = null;
    this.xp = 0;
    this.rank = 0;

    this.baseColor = new THREE.Color(this.factionDef.color);
    this.glowColor = new THREE.Color(this.factionDef.marking); // armbands, ID panels, stars
    this.boltColor = new THREE.Color(this.factionDef.bolt).multiplyScalar(2.4); // tracer glow (>1 so bloom picks it up)
    this.renderer = createRenderer(this, services.scene);
    this.weaponSound = type.weaponSound ?? 'carbine';
    this.updateCentroid();
  }

  get alive() {
    return this.aliveCount > 0;
  }

  /** Experience carried in (the campaign): the rank it earned, without the announcement. */
  setXp(xp) {
    this.xp = xp;
    this.rank = 0;
    while (this.rank + 1 < RANKS.length && this.xp >= RANKS[this.rank + 1].xp) this.rank++;
  }

  /** Experience from a kill; a new rank is announced to its side. */
  gainXp(amount) {
    this.xp += amount;
    let rank = 0;
    while (rank + 1 < RANKS.length && this.xp >= RANKS[rank + 1].xp) rank++;
    if (rank > this.rank) {
      this.rank = rank;
      this.services.tell?.(this.faction, `${this.name} is now ${RANKS[rank].name}`);
    }
  }

  /** Stats for member `index`: specialists (type.specialist: { count, stats }) override some. */
  unitStats(index) {
    const sp = this.type.specialist;
    if (!sp || index >= sp.count) return this.stats;
    this._specialistStats ??= { ...this.stats, ...sp.stats };
    return this._specialistStats;
  }

  get usesCover() {
    return this.kind === 'infantry';
  }

  /** Infantry that has held a defensive position for a while is entrenched. */
  get dugIn() {
    return this.usesCover && this.ai?.state === AIState.DEFEND && this.ai.defendTime > 15;
  }

  get hpRatio() {
    let hp = 0;
    let max = 0;
    for (const u of this.units) { hp += u.hp; max += u.maxHp; }
    return max ? hp / max : 0;
  }

  get moraleWord() {
    if (this.ai?.state === AIState.RETREAT) return 'Broken';
    if (!this.stats.breakMorale) return 'Resolute'; // machines don't break
    if (this.dugIn) return 'Dug in';
    return this.morale > 0.66 ? 'Steady' : this.morale > 0.4 ? 'Shaken' : 'Wavering';
  }

  /** The player's unit in this stack, if any. */
  get leader() {
    return this.units.find((u) => u.possessed && u.alive) ?? null;
  }

  /** A member's loose formation position around the anchor, on the ground. */
  slotPosition(u, out) {
    const c = Math.cos(this.facing);
    const s = Math.sin(this.facing);
    const ox = this.crossing ? 0 : u.offset.x * LOOSENESS + u.wander.x; // over a bridge: single file
    const oy = (u.offset.y * LOOSENESS + u.wander.y) * (this.crossing ? 1.6 : 1) - (this.crossing ? Math.abs(u.offset.x) * 1.5 : 0);
    out.set(this.anchor.x + ox * c + oy * s, 0, this.anchor.z - ox * s + oy * c);
    this.onDeck(out);
    out.y = this.world.terrain.heightAt(out.x, out.z);
    return out;
  }

  /**
   * Over the river by a bridge, keep point p (a slot, a body) on the deck: its centre no
   * further from the bridge's middle than the deck's half-width less the unit's own half-width.
   */
  onDeck(p, body = false) {
    const river = this.world.river;
    if (!river || this.usesCover && !body && !this.crossing) return;
    // the bridge it is on (its own crossing, or whichever deck it stands beside — the stack's
    // crossing ends when its anchor is over, with the last of the column still on the bridge)
    const c = this.crossing?.crossing ?? river.bridgeAt(p.x, p.z);
    if (!c || c.blown || Math.abs(p.z - c.z) > river.halfWidth + (body ? 1 : 6)) return;
    if (Math.abs(p.x - c.x) > c.width / 2 + 4) return; // only beside the deck: never a jump
    const room = Math.max(0, c.width / 2 - this.stats.radius * 0.8);
    p.x = c.x + Math.max(-room, Math.min(room, p.x - c.x));
  }

  /** Shift the whole area (used by world separation). */
  nudge(dx, dz) {
    this.anchor.x += dx;
    this.anchor.z += dz;
    if (this.moveTarget) {
      this.moveTarget.x += dx;
      this.moveTarget.z += dz;
    }
  }

  turnToward(yaw, dt) {
    const rate = 1.6 * dt;
    this.facing += clamp(angleDelta(this.facing, yaw), -rate, rate);
  }

  /** World position where this unit's shots leave its weapon. */
  muzzleWorld(u, out) {
    if (this.renderer.muzzleWorld) return this.renderer.muzzleWorld(u, out);
    const m = this.renderer.muzzleOf?.(u.index) ?? this.stats.muzzle;
    const c = Math.cos(u.yaw);
    const s = Math.sin(u.yaw);
    const fwd = m.z + u.prone * 0.9;               // lying down, the gun is out in front
    const y = m.y * (1 - 0.72 * u.prone) - u.crouch * 0.4 * (1 - u.prone);
    return out.set(u.pos.x + m.x * c + fwd * s, u.pos.y + y, u.pos.z - m.x * s + fwd * c);
  }

  // ------------------------------------------------------------------ per frame

  update(dt, t) {
    if (this.withdrawing && this.alive) this.checkWithdrawn();
    if (this.alive) {
      this.updateAnchor(dt);
      for (const u of this.units) {
        if (!u.alive) continue;
        if (u.possessed) this.updateBody(u, dt);
        else this.updateUnit(u, dt);
      }
      this.updateMorale(dt);
      this.updateCentroid();
    }
    // (the renderer is updated by GameEngine after the simulation step)
  }

  /** Where the anchor heads now: the move target, or a crossing on the way to it. */
  routeTarget() {
    const t = this.moveTarget;
    const river = this.world.river;
    if (!river || !t) { this.crossing = null; return t; }
    const c = this.crossing;
    if (c && (c.target !== t || c.crossing.blown)) this.crossing = null; // new order, or the bridge went
    if (!this.crossing) {
      const plan = river.plan(this.anchor, t);
      if (!plan) return t;
      this.crossing = plan;
    }
    const p = this.crossing;
    const at = (q) => Math.hypot(q.x - this.anchor.x, q.z - this.anchor.z) < 4;
    if (!p.entered && at(p.entry)) p.entered = true;
    if (p.entered && at(p.exit)) { this.crossing = null; return t; }
    return p.entered ? p.exit : p.entry;
  }

  updateAnchor(dt) {
    const s = this.stats;
    if (this.moveTarget) {
      const goal = this.routeTarget();
      _v.subVectors(goal, this.anchor);
      _v.y = 0;
      const d = _v.length();
      if (d < 0.6 && goal === this.moveTarget) {
        this.moveTarget = null;
      } else if (d < 0.6) {
        // reached a crossing waypoint: next frame heads for the next one
      } else {
        // Don't outrun the troops: slow down while they lag behind the anchor.
        const lag = Math.hypot(this.centroid.x - this.anchor.x, this.centroid.z - this.anchor.z);
        const k = clamp(1.4 - lag / (8 + this.footprint * 0.3), 0.15, 1);
        const speed = s.speed * (this.ai.state === AIState.RETREAT ? 1.45 : 1) * k;
        this.anchor.addScaledVector(_v, Math.min(d, speed * dt) / d);
        if (!this.faceTarget) this.turnToward(Math.atan2(_v.x, _v.z), dt);
      }
    }
    if (this.faceTarget) {
      _v.subVectors(this.faceTarget, this.anchor);
      if (_v.x * _v.x + _v.z * _v.z > 1) this.turnToward(Math.atan2(_v.x, _v.z), dt);
    }
    this.anchor.y = this.world.terrain.heightAt(this.anchor.x, this.anchor.z);
  }

  updateUnit(u, dt) {
    const s = this.stats;
    const world = this.world;

    u.thinkT -= dt;
    u.coverSearchT -= dt;
    if (u.thinkT <= 0) {
      const interval = 0.35 + Math.random() * 0.3;
      u.thinkT = interval;
      thinkSoldier(u, this, world, interval);
    }

    // --- locomotion: seek destination, keep personal space, slide around cover
    const mud = this.world.conditions?.mud;
    let maxSpeed = s.speed * u.speedMul * (u.slow ?? 1) * (u.run ? 1.65 : 1.12) * (u.wounded && this.usesCover ? 0.6 : 1) * this.wading(u)
      * (mud ? mud[this.usesCover ? 'infantry' : 'vehicle'] : 1);
    if (u.crouch > 0.5) maxSpeed *= 0.45;
    if (u.prone > 0.5) maxSpeed = Math.min(maxSpeed, 0.7); // crawling
    _v.set(u.dest.x - u.pos.x, 0, u.dest.z - u.pos.z);
    const d = _v.length();
    u.wantsMove = d > 1.5;
    _w.set(0, 0, 0);
    if (d > 0.2 + u.radius * 0.3) _w.copy(_v).multiplyScalar(Math.min(maxSpeed, d * 1.8) / d);
    if (u.detourT > 0) {
      // sidestepping around whatever blocked us, still leaning a little toward the goal
      u.detourT -= dt;
      const sp = Math.max(Math.hypot(_w.x, _w.z), maxSpeed * 0.8);
      _w.multiplyScalar(0.25).add(_p.set(u.detourX * sp, 0, u.detourZ * sp));
    }
    if (!(u.ghostT > 0) && !(u.detourT > 0) && !((u.lookOffT -= dt) > 0)) this.lookAhead(u, _w, d, dt); // a sidestep in progress has the say
    this.separate(u, _w);
    u.vel.lerp(_w, Math.min(1, dt * (this.usesCover ? 7 : 2.5))); // vehicles accelerate gently
    const px = u.pos.x;
    const pz = u.pos.z;
    this.moveBody(u, dt);
    this.checkStuck(u, dt, d, Math.min(maxSpeed, d * 1.8), Math.hypot(u.pos.x - px, u.pos.z - pz) / dt);
    u.atCover = !!u.coverSpot && dist2DSq(u.pos, u.coverSpot) < 0.8;

    this.updateWeapon(u, dt);

    // Facing matters (view cones): aim at the target, else look where fire came from, else
    // slowly scan the sector (cover direction or the squad's facing) — nobody stares forever.
    u.alertT -= dt;
    const scan = Math.sin(this.world.time * 0.35 + u.phase * 3) * 0.7;
    if (this.usesCover) {
      const desired = u.airTarget ? u.airYaw : u.target ? u.aimYaw
        : u.alertT > 0 ? u.alertYaw
          : u.moving ? u.moveYaw
            : (u.atCover ? Math.atan2(u.coverSpot.dirX, u.coverSpot.dirZ) : this.facing) + scan;
      u.yaw += angleDelta(u.yaw, desired) * Math.min(1, dt * (u.target || u.alertT > 0 ? 7 : 1.5));
    } else {
      // hull turns toward travel; the turret tracks the target (or sweeps) on its own
      if (u.moving) u.yaw += clamp(angleDelta(u.yaw, u.moveYaw), -s.turnRate * dt, s.turnRate * dt);
      else if (this.holdFacing != null && this.ai.state === AIState.DEFEND) {
        u.yaw += clamp(angleDelta(u.yaw, this.holdFacing), -s.turnRate * dt * 0.6, s.turnRate * dt * 0.6); // turn on the spot to face the order
      }
      const aim = u.airTarget ? u.airYaw : u.target ? u.aimYaw : u.alertT > 0 ? u.alertYaw : u.yaw + scan;
      u.turretYaw += clamp(angleDelta(u.turretYaw, aim), -s.turretRate * dt, s.turretRate * dt);
      // gun elevation (AA guns follow the helicopter up; others keep a slight rise)
      const wantPitch = u.airTarget ? u.airPitch : 0.05;
      u.gunPitch = (u.gunPitch ?? 0.05) + (wantPitch - (u.gunPitch ?? 0.05)) * Math.min(1, dt * 4);
    }
    this.decayTimers(u, dt);
  }

  /**
   * No pathfinding, so walls and ruins can trap a unit pressing toward a point behind them.
   * When it keeps trying to move but barely gets anywhere, it sidesteps (alternating sides,
   * longer each time); after a few failed detours it climbs over (collisions off briefly).
   */
  checkStuck(u, dt, distToDest, wantSpeed, speed) {
    if (u.ghostT > 0) u.ghostT -= dt;
    if (distToDest < 2 || wantSpeed < 0.3) {
      u.stuckT = 0;
      u.stuckN = 0;
      return;
    }
    if (speed < wantSpeed * 0.3) u.stuckT += dt;
    else {
      u.stuckT = Math.max(0, u.stuckT - dt);
      if (u.detourT <= 0 && speed > wantSpeed * 0.6) u.stuckN = Math.max(0, u.stuckN - dt * 0.3);
    }
    if (u.stuckT < 0.7) return;
    u.stuckT = 0;
    u.stuckN++;
    const side = (u.stuckN % 2 ? 1 : -1) * (u.index % 2 ? 1 : -1);
    const dx = (u.dest.x - u.pos.x) / distToDest;
    const dz = (u.dest.z - u.pos.z) / distToDest;
    u.detourX = -dz * side;
    u.detourZ = dx * side;
    u.detourT = 0.5 + Math.min(u.stuckN, 4) * 0.35;
    u.avoid = null;    // the look-ahead's way round didn't work here: let the sidestep try
    u.lookOffT = 2;
    if (u.stuckN >= 3) u.ghostT = 1.6;
  }

  /**
   * Bend the wanted velocity `w` around cover ahead. Every LOOK.every seconds three rays (the
   * middle and both shoulders) go out a speed-scaled distance toward the destination; if one
   * hits short of it, the unit heads for the way round that obstacle (detour()) until the
   * straight line is free again.
   */
  lookAhead(u, w, distToDest, dt) {
    const speed = Math.hypot(w.x, w.z);
    u.avoidT = (u.avoidT ?? 0) - dt;
    if (speed < 0.5) { u.avoid = null; return; }
    if (u.avoidT <= 0) {
      u.avoidT = LOOK.every;
      const reach = Math.min(Math.max(speed * LOOK.ahead, LOOK.min), LOOK.max) + u.radius;
      const dx = (u.dest.x - u.pos.x) / (distToDest || 1);
      const dz = (u.dest.z - u.pos.z) / (distToDest || 1);
      // where the unit is really going: its slot only leads it by a few metres while the stack
      // moves, so the stack's goal decides whether cover ahead is in the way or where it's headed
      const goal = this.moveTarget ?? u.dest;
      const goalD = Math.max(distToDest, Math.hypot(goal.x - u.pos.x, goal.z - u.pos.z));
      const y = u.pos.y + 0.6; // at knee height: the rays are 3D, low walls stand on high ground too
      let hit = null;
      u.passedT = (u.passedT ?? 0) - LOOK.every;
      const passed = u.passedT > 0 ? u.passed : null; // just went round it: it's behind us now
      for (const side of [0, -1, 1]) {
        _a.set(u.pos.x - dz * side * u.radius * 0.9, y, u.pos.z + dx * side * u.radius * 0.9);
        _b.set(_a.x + dx * reach, y, _a.z + dz * reach);
        const t = this.world.cover.segmentHit(_a, _b, passed); // (cover right at the goal, the wall of a cover spot, is short of nothing)
        if (t >= 0 && t * reach < goalD - 0.4) { hit = this.world.cover.lastHit; break; } // in the way, short of the goal
      }
      if (!hit) u.avoid = null;
      else if (hit !== u.avoid?.c) u.avoid = this.detour(u, hit, goal); // null: no open way round, leave it to checkStuck
    }
    const a = u.avoid;
    if (!a) return;
    const ex = a.x - u.pos.x;
    const ez = a.z - u.pos.z;
    const d = Math.hypot(ex, ez);
    if (d < 1) { // round it: back to the straight line, and that obstacle is behind us
      u.passed = a.c;
      u.passedT = LOOK.passed;
      u.avoid = null;
      return;
    }
    w.x = (ex / d) * speed;
    w.z = (ez / d) * speed;
  }

  /**
   * The way round collider `c` toward `goal`: a wall or hedge's nearer end (the one that makes
   * the shorter path, unless that spot is itself blocked), a body's width clear of it; a tree or
   * post: past whichever side lies toward the goal.
   */
  detour(u, c, goal = u.dest) {
    const m = u.radius + LOOK.clear;
    const ends = [];
    if (c.type === 'cyl') {
      const dx = goal.x - u.pos.x;
      const dz = goal.z - u.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      for (const s of [1, -1]) ends.push({ x: c.x - (dz / l) * s * (c.r + m), z: c.z + (dx / l) * s * (c.r + m) });
    } else {
      const long = c.hx >= c.hz;
      const ax = long ? c.cos : c.sin;   // the long side's direction in the world
      const az = long ? -c.sin : c.cos;
      const half = (long ? c.hx : c.hz) + m;
      // past the end and a step onto the goal's side of the wall, so the way on is clear
      const nx = az;
      const nz = -ax;
      const toward = Math.sign((goal.x - c.x) * nx + (goal.z - c.z) * nz) || 1;
      const off = (long ? c.hz : c.hx) + m;
      for (const s of [1, -1]) ends.push({ x: c.x + ax * half * s + nx * toward * off, z: c.z + az * half * s + nz * toward * off });
    }
    const cost = (e) => Math.hypot(e.x - u.pos.x, e.z - u.pos.z) + Math.hypot(goal.x - e.x, goal.z - e.z)
      + (this.world.cover.pointBlocked(e.x, e.z, u.radius) ? 1000 : 0);
    ends.sort((p, q) => cost(p) - cost(q));
    // only a way round that is itself open: in a tangle of walls and trees no end may be, and then
    // checkStuck's sidestep does better than dithering between detours
    const y = u.pos.y + 0.6;
    for (const e of ends) {
      _a.set(u.pos.x, y, u.pos.z);
      _b.set(e.x, y, e.z);
      if (this.world.cover.segmentHit(_a, _b, c) < 0 && !this.world.cover.pointBlocked(e.x, e.z, u.radius)) return { c, x: e.x, z: e.z };
    }
    return null;
  }

  /** Push away from neighbours, scaled by both bodies' sizes. */
  separate(u, out) {
    for (const o of this.world.neighbors(u.pos, u.radius + 4.5, _near)) {
      if (o === u) continue;
      const min = u.radius + o.radius + PERSONAL_SPACE;
      const dx = u.pos.x - o.pos.x;
      const dz = u.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > min * min || d2 < 1e-6) continue;
      const dd = Math.sqrt(d2);
      const push = ((min - dd) / min) * 2.4 * (o.radius > u.radius * 2 ? 2 : 1); // give way to giants
      out.x += (dx / dd) * push;
      out.z += (dz / dd) * push;
    }
  }

  /** Speed factor in water: wading through a ford or the shallows is slow work. */
  wading(u) {
    const w = this.world.river?.water;
    if (!w) return 1;
    const depth = w.level - u.pos.y;
    if (depth <= 0.15) return 1;
    return this.usesCover ? 0.45 : 0.65;
  }

  /** Integrate velocity with cover collision, map bounds and ground height; update gait. */
  moveBody(u, dt) {
    const s = this.stats;
    const px = u.pos.x;
    const pz = u.pos.z;
    u.pos.x += u.vel.x * dt;
    u.pos.z += u.vel.z * dt;
    if (!(u.ghostT > 0)) this.world.cover.resolveCircle(u.pos, u.radius * 0.85); // ghostT: climbing over
    this.world.clampToBounds(u.pos);
    this.onDeck(u.pos, true); // nobody pushed off the side of a bridge
    const w = this.world.river?.water;
    if (w) {
      // deep water is a wall — but never a trap: going shallower is always allowed
      const depth = w.level - this.world.terrain.heightAt(u.pos.x, u.pos.z);
      if (depth > w.deep && depth > w.level - this.world.terrain.heightAt(px, pz) - 0.01) {
        u.pos.x = px;
        u.pos.z = pz;
        u.vel.multiplyScalar(0.3);
      }
    }
    u.pos.y = this.world.terrain.heightAt(u.pos.x, u.pos.z);
    const speed = Math.hypot(u.vel.x, u.vel.z);
    u.moving = speed > 0.5;
    // where and since when it has stayed put (the idle shuffle of a metre or two doesn't count)
    if (!u.setUp || (u.pos.x - u.setUp.x) ** 2 + (u.pos.z - u.setUp.z) ** 2 > SET_UP_SLACK * SET_UP_SLACK) u.setUp = { x: u.pos.x, z: u.pos.z, at: this.world.time };
    u.gait += (Math.min(1, speed / (s.speed * 1.5)) - u.gait) * Math.min(1, dt * 8);
    u.walkPhase += dt * speed * (Math.PI / (s.stride ?? 1.1));
    if (u.moving) u.moveYaw = Math.atan2(u.vel.x, u.vel.z);
  }

  /** Body upkeep for a player-driven unit: reload, posture, timers. */
  updateBody(u, dt) {
    const s = u.stats;
    u.cooldown -= dt * u.fireRateMult;
    if (u.reloadT > 0) {
      u.reloadT -= dt;
      if (u.reloadT <= 0) u.mag = s.magSize;
    }
    if (this.usesCover) {
      this.applyPosture(u, u.proneTarget > 0.5 ? 0 : u.crouchTarget, u.proneTarget, dt);
      // heavy weapons are set up where they stand: a step aside or a shove from a squad-mate doesn't
    // undo it, only moving off (more than 1.5 m) does — and setting up again takes deployTime
    if (!u.moving) {
      u.setupAt ??= { x: u.pos.x, z: u.pos.z };
      u.deployT += dt;
    } else if (!u.setupAt || (u.pos.x - u.setupAt.x) ** 2 + (u.pos.z - u.setupAt.z) ** 2 > 2.25) {
      u.setupAt = null;
      u.deployT = 0;
    }
    }
    u.reloadAnim += ((u.reloadT > 0 ? 1 : 0) - u.reloadAnim) * Math.min(1, dt * 6);
    this.decayTimers(u, dt);
  }

  /** Blend toward a posture and update the hit profile. Going prone / getting up takes time. */
  applyPosture(u, wantCrouch, wantProne, dt) {
    const s = u.stats;
    u.prone += clamp(wantProne - u.prone, -dt * 1.4, dt * 1.6);
    u.crouch += clamp(wantCrouch * (1 - u.prone) - u.crouch, -dt * 4, dt * 4);
    u.height = s.height * (1 - 0.42 * u.crouch) * (1 - 0.72 * u.prone);
    u.aimHeight = s.aimHeight * (1 - 0.38 * u.crouch) * (1 - 0.75 * u.prone);
    // in a trench only the head shows over the parapet — that's what the enemy aims at
    if (u.atCover && u.coverSpot?.omni) u.aimHeight = Math.max(0.2, u.height - 0.25);
  }

  /** Heavy weapons (MG) are only accurate once set up: stationary, prone or in cover. */
  deployed(u) {
    return !u.stats.deployTime || (u.deployT >= u.stats.deployTime && (u.prone > 0.8 || u.atCover || u.stats.indirect));
  }

  decayTimers(u, dt) {
    u.suppression = Math.max(0, u.suppression - dt * 0.35);
    u.flinch = Math.max(0, u.flinch - dt * 4);
    u.flash = Math.max(0, u.flash - dt);
    u.recoil = Math.max(0, u.recoil - dt * 3);
  }

  // ------------------------------------------------------------------ weapon & posture

  updateWeapon(u, dt) {
    const s = u.stats;
    // a towed gun: hitched to its truck while it moves, and it takes `towed.deploy` s from
    // stopping to being unhitched and laid — no shooting until then (the renderer shows the truck)
    if (s.towed) {
      u.towing = !u.setUp || this.world.time - u.setUp.at < s.towed.deploy;
      if (u.towing) { u.target = null; u.airTarget = null; return; }
    }
    u.cooldown -= dt * u.fireRateMult;
    u.retarget -= dt;
    if (u.reloadT > 0) {
      u.reloadT -= dt;
      if (u.reloadT <= 0) u.mag = s.magSize;
    }

    if (u.target && (!u.target.alive || !u.target.spotted || dist2DSq(u.pos, u.target.pos) > s.range * s.range * 1.21)) {
      u.target = null;
      u.retarget = Math.min(u.retarget, 0.15);
    }
    if (u.retarget <= 0) {
      u.retarget = (0.4 + Math.random() * 0.3 + u.suppression * 0.3) * (this.led ? LED.react : this.hadOfficer ? LEADERLESS.react : 1);
      u.target = this.smokeMission(u) ?? this.pickTarget(u);
    }
    if (u.target) u.aimYaw = Math.atan2(u.target.pos.x - u.pos.x, u.target.pos.z - u.pos.z);

    if (!this.usesCover) {
      if (s.antiAir && (s.antiAir.missile ? this.engageAirMissile(u, dt) : this.engageAir(u, dt))) return; // aircraft first
      this.updateHeavyWeapon(u);
      return;
    }
    if (s.antiAir?.missile && this.engageAirMissile(u, dt)) u.target = null; // the launcher is busy: no rifle shots

    const reloading = u.reloadT > 0;
    const inCover = u.atCover;
    const fleeing = this.ai.state === AIState.RETREAT && u.run;
    const distToTarget = u.target ? Math.sqrt(dist2DSq(u.pos, u.target.pos)) : 0;
    // heavy weapons are set up where they stand: a step aside or a shove from a squad-mate doesn't
    // undo it, only moving off (more than 1.5 m) does — and setting up again takes deployTime
    if (!u.moving) {
      u.setupAt ??= { x: u.pos.x, z: u.pos.z };
      u.deployT += dt;
    } else if (!u.setupAt || (u.pos.x - u.setupAt.x) ** 2 + (u.pos.z - u.setupAt.z) ** 2 > 2.25) {
      u.setupAt = null;
      u.deployT = 0;
    }

    // Posture. In cover: crouch behind it (or lie flat behind low cover). In the open: go
    // prone when pinned, wounded, it's the unit's stance, or the target is far; otherwise kneel.
    let wantCrouch = 0;
    let wantProne = 0;
    const pinned = u.suppression > 0.9;
    const ordered = this.ai.ordered && !!this.moveTarget; // a direct order gets men up even under fire
    if (u.wantsMove && (!pinned || ordered) && !u.wounded) {
      wantProne = 0;
    } else if (inCover) {
      if (u.coverSpot.height < 1.15 || u.wounded) wantProne = 1; else wantCrouch = 1;
    } else if (pinned || u.wounded || u.suppression > 0.6 || s.stance === 'prone' || (u.target && !s.indirect && distToTarget > s.range * 0.55)) {
      wantProne = 1;
    } else if (reloading || u.suppression > 0.3 || u.target) {
      wantCrouch = 0.85;
    }
    if (u.working && !u.target && !pinned) { wantCrouch = 1; wantProne = 0; } // kneeling, digging
    const settled = u.prone > 0.85 || u.prone < 0.1; // can't shoot while dropping or getting up

    if (u.target && !reloading && u.mag > 0 && !fleeing && settled && this.deployed(u)) {
      if (u.burstLeft > 0) {
        u.peekT = 0.35;
        u.burstTimer -= dt;
        // From cover (crouched), wait until we've actually risen before shooting.
        const ready = !inCover || u.prone > 0.85 || u.crouch < 0.35;
        if (u.burstTimer <= 0 && ready) {
          this.fire(u);
          u.mag--;
          u.burstLeft--;
          u.burstTimer = s.burstInterval;
          if (u.mag <= 0) {
            u.burstLeft = 0;
            this.startReload(u);
          }
        }
      } else if (u.cooldown <= 0) {
        // Aim before the shot (or burst): longer at range, under fire, and for marksmen.
        const aim = (s.aimTime ?? 0.3) * (0.6 + Math.random() * 0.8) * (1 + distToTarget / s.range) * (1 + u.suppression) * (1 - 0.1 * this.rank);
        u.burstLeft = s.burst;
        u.burstTimer = aim + (inCover && u.prone < 0.5 ? 0.3 : 0);
        u.cooldown = s.fireCooldown * (0.85 + Math.random() * 0.4) * (1 + u.suppression * 0.6) + aim;
      }
    } else {
      u.burstLeft = 0;
    }
    if (!u.target && !reloading && u.mag < s.magSize * 0.5) this.startReload(u); // top up in a lull

    if (u.peekT > 0) {
      u.peekT -= dt;
      if (inCover && wantProne < 0.5) wantCrouch = 0; // rise to fire over the cover
    }
    this.applyPosture(u, wantCrouch, wantProne, dt);
    u.reloadAnim += ((reloading || u.working ? 1 : 0) - u.reloadAnim) * Math.min(1, dt * 6);
  }

  /**
   * Anti-aircraft guns: track the nearest enemy helicopter the radar can see, and fire
   * lead-aimed bursts once the turret is on it — each round a chance to hit, falling off with
   * range. Returns true while engaged (ground targets wait).
   */
  engageAir(u, dt) {
    const aa = u.stats.antiAir;
    const air = this.services.air;
    // no radar of its own: the gunner's eyes, unless an air search radar of ours covers this spot
    const covered = air?.radarCovers?.(this.faction, u.pos);
    const reach = aa.range * (covered ? RADAR_BONUS : aa.optical ?? 1);
    const h = air?.nearestThreat(this.faction, u.pos, reach);
    u.airTarget = h;
    if (!h) return false;
    const dx = h.pos.x - u.pos.x;
    const dz = h.pos.z - u.pos.z;
    const dist = Math.hypot(dx, dz);
    u.airYaw = Math.atan2(dx, dz);
    u.airPitch = Math.atan2(h.pos.y - (u.pos.y + 2), dist);
    if (Math.abs(angleDelta(u.turretYaw, u.airYaw)) > 0.08) return true; // still slewing
    // burst / pause cycle
    u.aaCycle = (u.aaCycle ?? 0) + dt;
    if (u.aaCycle > aa.burst + aa.pause) u.aaCycle = 0;
    if (u.aaCycle > aa.burst) return true;
    u.aaT = (u.aaT ?? 0) - dt;
    while (u.aaT <= 0) {
      u.aaT += 1 / aa.rate;
      this.muzzleWorld(u, _p);
      // lead: where it will be when the round gets there
      const flight = Math.hypot(h.pos.x - _p.x, h.pos.y - _p.y, h.pos.z - _p.z) / 700;
      _v.copy(h.pos).addScaledVector(h.velocity, flight);
      _v.x += (Math.random() - 0.5) * 6;
      _v.y += (Math.random() - 0.5) * 4;
      _v.z += (Math.random() - 0.5) * 6;
      _w.subVectors(_v, _p);
      const len = _w.length();
      this.services.projectiles.spawn({
        origin: _p, dir: _w.normalize(), speed: 700, damage: 0, faction: this.faction, color: this.boltColor,
        size: 0.9, source: this, life: len / 700 + 0.3, tracer: Math.random() < 0.6,
      });
      this.services.effects.muzzle(_p, _w, 1.1, 'rifle');
      this.services.audio?.weapon(this.faction, this.weaponSound, _p);
      const k = Math.min(1, dist / reach);
      if (Math.random() < aa.hitNear + (aa.hitFar - aa.hitNear) * k) h.hit();
      u.recoil = 1;
    }
    VisibilitySystem.revealShooter(u);
    return true;
  }

  /**
   * Missile air defence (MANPADS, SAM vehicles): lock on to the nearest enemy aircraft in
   * range, launch (systems/AirStrike.js missile: it chases, then hits or misses), a few seconds
   * between shots, `count` ready rounds and then a long reload. Returns true while engaged.
   */
  engageAirMissile(u, dt) {
    const aa = u.stats.antiAir;
    const now = this.world.time;
    // `shared`: one rack for aircraft and armour (ADATS, Tunguska) — the ground missiles' count
    const pool = aa.shared ? 'atgmLeft' : 'missilesLeft';
    const full = aa.shared ? u.stats.atgm.count : aa.count;
    u[pool] ??= full;
    if (u[pool] <= 0 && now >= (u.missileReload ?? 0)) { u[pool] = full; u.missileReload = 0; }
    const air = this.services.air;
    const h = air?.nearestThreat(this.faction, u.pos, aa.range * (air?.radarCovers?.(this.faction, u.pos) ? RADAR_BONUS : 1));
    u.airTarget = u[pool] > 0 || !this.usesCover ? h : null;
    if (!u.airTarget) { u.lockT = 0; return false; }
    const dx = h.pos.x - u.pos.x;
    const dz = h.pos.z - u.pos.z;
    u.airYaw = Math.atan2(dx, dz);
    u.airPitch = Math.atan2(h.pos.y - (u.pos.y + 2), Math.hypot(dx, dz));
    if (u[pool] <= 0) return true;                        // vehicles keep tracking while they reload
    const aim = this.usesCover ? u.yaw : u.turretYaw;
    if (Math.abs(angleDelta(aim, u.airYaw)) > 0.15) return true; // still turning onto it
    u.lockT = (u.lockT ?? 0) + dt;                        // seeker growl until it locks
    if (u.lockT < 1.1 || now < (u.nextMissile ?? 0)) return true;
    u.lockT = 0;
    u.nextMissile = now + 3.5;
    if (--u[pool] <= 0) u.missileReload = now + aa.reload;
    this.muzzleWorld(u, _p);
    _p.y += 0.2;
    air.missile(_p, h, this.faction, aa);
    _w.subVectors(h.pos, _p).normalize();
    this.services.effects.muzzle(_p, _w, 1, 'rocket');
    this.services.audio?.weapon(this.faction, aa.sound ?? 'sam', _p);
    VisibilitySystem.revealShooter(u);
    u.recoil = 1;
    return true;
  }

  /** Wire-guided missile from an IFV's launcher: slow, smoky, deadly to tanks. */
  fireMissile(u, m) {
    if (--u.atgmLeft <= 0 && u.stats.antiAir?.shared) u.missileReload = this.world.time + u.stats.antiAir.reload; // the shared rack reloads
    u.atgmReady = this.world.time + m.reload;
    const t = u.target;
    this.muzzleWorld(u, _p);
    _p.y += 0.3;
    _v.set(t.pos.x, t.pos.y + t.aimHeight, t.pos.z);
    _w.subVectors(_v, _p);
    const len = _w.length();
    this.services.projectiles.spawn({
      origin: _p, dir: _w.normalize(), speed: m.speed, damage: m.damage, faction: this.faction, color: this.boltColor,
      size: 1.4, source: this, life: len / m.speed + 2, splash: m.splash, pierce: m.pierce, vsArmor: 1, suppress: 2,
      tracer: true, trail: true, guide: t,
    });
    this.services.effects.muzzle(_p, _w, 1, 'rocket');
    this.services.audio?.weapon(this.faction, 'rocket', _p);
    VisibilitySystem.revealShooter(u);
  }

  /** Tanks and guns: fire once the turret is on target. */
  updateHeavyWeapon(u) {
    const s = u.stats;
    if (!u.target) return;
    if (Math.abs(angleDelta(u.turretYaw, u.aimYaw)) > 0.12) return;
    const dist = Math.sqrt(dist2DSq(u.pos, u.target.pos));
    // IFV missile (TOW / Konkurs) against vehicles, on its own long reload
    if (s.atgm && !u.target.stack.usesCover && (u.atgmLeft ??= s.atgm.count) > 0 && this.world.time >= (u.atgmReady ?? 0) && dist <= s.atgm.range) {
      this.fireMissile(u, s.atgm);
      return;
    }
    if (u.reloadT > 0 || u.cooldown > 0) return;
    if (s.gunRange && dist > s.gunRange) return; // only the missile reaches that far
    if (s.weapon === 'artillery') {
      this.fire(u); // a shell — or a smoke / illumination round on a mission (SP mortars)
      u.mag--;
      u.cooldown = s.fireCooldown * (0.85 + Math.random() * 0.3);
      if (u.mag <= 0) this.startReload(u);
      return;
    }
    if (s.weapon === 'beam') {
      if (!u.beam) {
        this.services.beams.start(u, this);
        u.cooldown = s.beamDuration + s.fireCooldown * (0.85 + Math.random() * 0.3);
      }
      return;
    }
    this.fire(u);
    u.mag--;
    u.cooldown = s.fireCooldown * (0.85 + Math.random() * 0.3);
    if (u.mag <= 0) this.startReload(u);
  }

  startReload(u) {
    u.reloadT = u.stats.reloadTime * (0.9 + Math.random() * 0.2);
    this.services.audio?.play(`${this.faction}.reload`, u.pos, { volume: this.usesCover ? 0.4 : 0.7, throttle: 0.08 });
    this.bark(u, 'reload', 0.3);
  }

  /** Prefer exposed enemies, the squad's focus target, and whoever we're already shooting. */
  pickTarget(u) {
    const s = u.stats;
    const terrain = this.world.terrain;
    const r2 = s.range * s.range;
    // a gun plus an anti-tank missile (IFVs, ATGM carriers): the gun's reach for troops, the
    // missile's only against vehicles while there are missiles — else it locks onto men it can't hit
    const gun2 = s.gunRange ? s.gunRange * s.gunRange : r2;
    const missiles = s.atgm && (u.atgmLeft ?? s.atgm.count) > 0;
    const focus = this.ai?.targetGroup;
    const eyeY = u.pos.y + (s.eyeHeight ?? 1.4);
    let best = null;
    let bestScore = Infinity;
    if (s.indirect) return this.pickIndirectTarget(u);
    for (const e of this.world.combatants(enemyOf(this.faction))) {
      if (!e.alive || !e.spotted) continue; // you can only shoot what your side can see
      const d2 = dist2DSq(u.pos, e.pos);
      if (d2 > r2) continue;
      if (d2 > gun2 && (e.stack.usesCover || !missiles)) continue; // beyond the gun: only a vehicle, only with a missile
      if (s.structure && e.stack.stats.structure) continue; // concrete fights troops, not other concrete
      let score = Math.sqrt(d2);
      if (e.coverSpot && e.crouch > 0.6) score += 10;
      if (e.prone > 0.8) score += 8;
      if (focus && e.stack === focus) score -= 6;
      if (e === u.target) score -= 3;
      if (s.antiArmor && e.stack.kind !== 'infantry') score -= 15; // cannons and beams hunt big game
      if (e.stack.stats.medical) score += 60; // the red cross: anyone else first
      if (e.stack.stats.airRadar) score -= 25;     // the radar first: it is the enemy's air defence's eyes
      if (s.demolition && (e.stack.stats.structure || e.coverSpot?.interior || e.stack.dugIn)) score -= 80; // bunkers, held houses, trenches
      if (s.marksman) {
        if (!e.stack.usesCover) continue;      // a rifle bullet off armour gives him away for nothing
        if (e.officer) score -= 150;           // the platoon leader first
        else if (e.stack.stats.indirect || e.stack.stats.binoculars || e.stack.type.specialist) score -= 60; // then the crews and the eyes
      }
      if (score >= bestScore) continue;
      if (s.holdFire && !u.spotted && d2 > 30 * 30) continue; // recon: don't give yourself away
      if (!terrain.lineOfSight(u.pos.x, eyeY, u.pos.z, e.pos.x, e.pos.y + e.aimHeight, e.pos.z)) continue;
      if (this.services.smoke?.blocks(u.pos.x, u.pos.z, e.pos.x, e.pos.z)) continue;
      best = e;
      bestScore = score;
    }
    return best;
  }

  /**
   * Artillery: any spotted enemy between minRange and range — no line of sight needed —
   * preferring clusters (more men under one shell) and entrenched positions.
   */
  pickIndirectTarget(u) {
    const s = u.stats;
    const foe = enemyOf(this.faction);
    let best = null;
    let bestScore = Infinity;
    for (const e of this.world.combatants(foe)) {
      if (!e.alive || !e.spotted) continue;
      const d = Math.sqrt(dist2DSq(u.pos, e.pos));
      if (d < s.minRange || d > s.range) continue;
      let cluster = 0;
      for (const o of this.world.neighbors(e.pos, 8, _near)) if (o.faction === foe) cluster++;
      const located = e.locatedUntil > this.world.time ? 30 : 0; // the counter-battery radar's find: the enemy's guns first
      const score = d * 0.05 - cluster * 6 - located - (e.stack.dugIn ? 4 : 0) - (e.stack.usesCover ? 0 : 3) + (e.stack.stats.medical ? 20 : 0);
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  /**
   * Fire a shell on a ballistic arc at `point` (with scatter growing with range). Solves the
   * launch speed for a fixed ~55° elevation, including the height difference.
   */
  lob(u, point, smoke = false, flare = false) {
    const s = u.stats;
    this.muzzleWorld(u, _p);
    let dx = point.x - _p.x;
    let dz = point.z - _p.z;
    const scatter = ((s.scatter ?? 3) + (s.scatterPerM ?? 0.03) * Math.hypot(dx, dz)) * this.observed(point);
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * scatter;
    const tx = point.x + Math.cos(a) * r;
    const tz = point.z + Math.sin(a) * r;
    const ty = this.world.terrain.heightAt(tx, tz);
    dx = tx - _p.x;
    dz = tz - _p.z;
    const d = Math.max(1, Math.hypot(dx, dz));
    let th = 0.96;
    let denom = 2 * Math.cos(th) ** 2 * (d * Math.tan(th) - (ty - _p.y));
    if (denom < 1) { th = 1.25; denom = 2 * Math.cos(th) ** 2 * (d * Math.tan(th) - (ty - _p.y)); }
    const g = s.gravity ?? 25;
    const v = Math.sqrt((g * d * d) / Math.max(1, denom));
    const flight = d / (v * Math.cos(th));
    _w.set((dx / d) * Math.cos(th), Math.sin(th), (dz / d) * Math.cos(th));
    this.services.projectiles.spawn({
      origin: _p, dir: _w, speed: v, damage: smoke || flare ? 0 : s.damage * u.damageMult, faction: this.faction,
      color: this.boltColor, size: s.boltSize, source: this, life: flight + 3,
      splash: smoke || flare ? 0 : s.splash, pierce: s.pierce ?? 0, vsArmor: s.vsArmor ?? 1, suppress: smoke || flare ? 0 : 3,
      gravity: g, target: _v.set(tx, ty, tz), whistleAt: smoke || flare ? -1 : Math.max(0.2, flight - 1.1), crater: smoke || flare ? 0 : s.crater ?? 0,
      tracer: !!s.trail, trail: !!s.trail && !smoke && !flare, smoke, flare,
    });
    this.services.effects.muzzle(_p, _w, 1, s.muzzleKind ?? 'artillery');
    this.services.audio?.weapon(this.faction, s.weaponSound ?? this.weaponSound, _p);
    VisibilitySystem.revealShooter(u);
    if (!smoke && !flare) this.services.game?.counterBattery?.fired(this, u); // an enemy radar may track it back
    u.recoil = 1;
  }

  /**
   * Forward observers (data/units/observers.ts) who can see `point`: their scatter factor, else 1.
   * One of the team has to really see it — within his sight (more with binoculars while still),
   * over the terrain and not through a smoke screen. An observer behind a hill corrects nothing.
   */
  observed(point) {
    const terrain = this.world.terrain;
    const smoke = this.services.smoke;
    const gy = terrain.heightAt(point.x, point.z);
    for (const o of this.world.stacksOf(this.faction)) {
      const ob = o.stats.observer;
      if (!ob || !o.alive) continue;
      for (const u of o.units) {
        if (!u.alive) continue;
        if (this.services.game?.jamming?.jammed(this.faction, u.pos.x, u.pos.z)) continue; // his radio is jammed: no corrections get through
        const sight = o.stats.sight * (o.stats.binoculars && !u.moving ? 1.25 : 1);
        if (dist2DSq(u.pos, point) > sight * sight) continue;
        if (smoke?.blocks(u.pos.x, u.pos.z, point.x, point.z)) continue;
        if (terrain.lineOfSight(u.pos.x, u.pos.y + (o.stats.eyeHeight ?? 1.5), u.pos.z, point.x, gy + 1, point.z)) return ob.scatter; // eye height as for spotting (VisibilitySystem)
      }
    }
    return 1;
  }

  /**
   * A pending smoke order (this.smokeOrder, set by CommandSystem or the AI) for an indirect-fire
   * member that still has smoke bombs: a stand-in target at the spot, so the normal aim / fire
   * cycle lobs smoke there.
   */
  smokeMission(u) {
    const o = this.smokeOrder;
    const flare = o?.kind === 'flare';
    if (!o || !u.stats.indirect || (flare ? this.flareRounds : this.smokeRounds) <= 0) return null;
    o.target ??= { pos: { x: o.x, y: this.world.terrain.heightAt(o.x, o.z), z: o.z }, alive: true, spotted: true, aimHeight: 0, stack: { kind: 'infantry' }, smoke: !flare, flare };
    return o.target;
  }

  /** Vehicle smoke grenade launchers: a screen between `u` and the threat (dir: incoming shot). */
  popSmoke(u, dir = null) {
    if (this.smokeLeft <= 0 || this.world.time < (this.smokeReadyAt ?? 0)) return false;
    this.smokeLeft--;
    this.smokeReadyAt = this.world.time + 8;
    let yaw = u.turretYaw;
    if (dir) yaw = Math.atan2(-dir.x, -dir.z); // toward where the shot came from
    const d = 12;
    this.services.smoke?.add(u.pos.x + Math.sin(yaw) * d, u.pos.z + Math.cos(yaw) * d, { radius: 9, duration: 40 });
    this.services.tell?.(this.faction, `${this.name}: smoke!`);
    return true;
  }

  /** AI shot at the current target (with lead and human error). */
  fire(u) {
    const t = u.target;
    if (!t || !t.alive) {
      u.burstLeft = 0;
      return;
    }
    const s = u.stats;
    if (s.indirect) {
      // mortar: lob a bomb (or a smoke bomb / illumination round for a mission) at the target
      const smoke = !!t.smoke;
      const flare = !!t.flare;
      this.lob(u, _v.set(t.pos.x, t.pos.y, t.pos.z), smoke, flare);
      if (smoke || flare) {
        if (flare) this.flareRounds--; else this.smokeRounds--;
        const left = flare ? this.flareRounds : this.smokeRounds;
        if (--this.smokeOrder.left <= 0 || left <= 0) { this.smokeOrder = null; u.target = null; }
      }
      return;
    }
    this.muzzleWorld(u, _p);
    _v.set(t.pos.x, t.pos.y + t.aimHeight, t.pos.z);
    const dist = _v.distanceTo(_p);
    if (t.vel) _v.addScaledVector(t.vel, (dist / s.boltSpeed) * (s.marksman ? 1 : 0.7)); // lead moving targets a little (a sniper: fully)
    const spread = s.spread * u.skill
      * (1 - 0.1 * this.rank)                  // veterans shoot straighter
      * (1 + (0.8 * dist) / s.range)
      * (u.moving ? 2 : 1)
      * (1 + u.suppression * 1.4)
      * (u.wounded ? 1.3 : 1)
      * (u.masked > 0 ? MASKED.spread : 1)    // fogged gas-mask lenses (systems/Gas.js)
      * (u.prone > 0.8 ? 0.65 : 1)            // a steady prone rest
      * (this.deployed(u) ? 1 : 3);           // an MG fired from the hip sprays
    this.shoot(u, _v, spread);
  }

  /** Player shot toward a world point (much steadier hands). */
  fireAt(u, point) {
    const s = u.stats;
    if (s.weapon === 'artillery') return this.lob(u, point);
    const spread = s.spread * 0.3 * (u.moving ? 1.6 : 1) * (1 + u.suppression * 0.5) * (u.masked > 0 ? MASKED.spread : 1)
      * (u.prone > 0.8 ? 0.6 : 1) * (this.deployed(u) ? 1 : 3);
    this.shoot(u, _v.copy(point), spread);
  }

  shoot(u, aimPoint, spread) {
    const s = u.stats;
    const ambush = !u.spotted && !u.possessed; // nobody has seen us yet: the first volley counts
    if (ambush && this.world.time - (this.ambushAt ?? -Infinity) > AMBUSH.tellEvery) {
      this.ambushAt = this.world.time;
      this.services.game?.tellBoth(this.faction, `${this.name} springs an ambush!`, "Ambush! We're taking fire!");
    }
    this.muzzleWorld(u, _p);
    _w.subVectors(aimPoint, _p).normalize();
    _w.x += (Math.random() - 0.5) * spread * 2;
    _w.y += (Math.random() - 0.5) * spread;
    _w.z += (Math.random() - 0.5) * spread * 2;
    _w.normalize();
    this.services.projectiles.spawn({
      origin: _p,
      dir: _w,
      speed: s.boltSpeed,
      damage: s.damage * u.damageMult * (ambush ? AMBUSH.damage : 1),
      faction: this.faction,
      color: this.boltColor,
      size: s.boltSize,
      source: this,
      life: (s.range * 1.5) / s.boltSpeed + 0.2,
      splash: s.splash ?? 0,
      pierce: s.pierce ?? 0,
      vsArmor: s.vsArmor ?? 1,
      suppress: (s.suppressPower ?? 1) * (ambush ? AMBUSH.suppress : 1),
      ignore: u.coverSpot?.collider ?? u.hullDown?.berm ?? null, // shoot over / around our own cover (or berm)
      tracer: Math.random() < (s.tracer ?? 1),
      trail: !!s.trail,
    });
    this.services.effects.muzzle(_p, _w, this.usesCover ? 1 : 1.5, s.weapon ?? 'rifle');
    this.services.audio?.weapon(this.faction, s.weaponSound ?? this.weaponSound, _p, u.atCover && !!u.coverSpot?.interior);
    VisibilitySystem.revealShooter(u);
    u.recoil = 1;
  }

  /** Called by projectiles / beams when one of our hits lands on an enemy. */
  noteHit() {
    this.lastDamageDealt = this.world.time;
  }

  /**
   * Apply damage. `pierce` ignores part of the armour; `dir` (the shot's travel direction)
   * enables directional armour on vehicles: full plating from the front, 0.7x on
   * the sides, 0.35x from behind — flanking pays.
   */
  damageUnit(u, amount, source, pierce = 0, dir = null, vsArmor = 1) {
    if (!u.alive) return;
    if (u.invulnerable) {
      // a fortification that can't be attacked yet (modes/lanes.js): the round just spalls off
      u.flash = 0.06;
      if (source?.faction && source.faction !== this.faction && this.world.time > (this.shieldNoted ?? -99) + 6) {
        this.shieldNoted = this.world.time;
        this.services.tell?.(source.faction, `${this.name} is shielded — ${this.shieldReason ?? 'take the line in front of it first'}`);
      }
      return;
    }
    if (this.stats.structure) dir = null; // concrete all round: no weak sides
    if (this.stats.structure && source?.stats?.vsStructure) amount *= source.stats.vsStructure; // demolition charges are made for concrete
    if (this.usesCover) {
      // Infantry: a solid hit is usually decisive — down, or wounded if lucky. Wounded men
      // don't survive a second one. Small grazes (splash edges, beam spill) just wear on them.
      if (u.atCover && this.dugIn) amount *= 0.75; // entrenched defenders are harder to hurt
      if (u.atCover && u.coverSpot?.interior) amount *= 0.6; // inside, behind brick walls
      if (amount >= 35) {
        const pDown = u.wounded ? 1 : u.possessed ? 0.45 : 0.7;
        amount = Math.random() < pDown ? u.hp + 1 : Math.max(0, u.hp - this.stats.hp * 0.3);
      }
      u.hp -= amount;
    } else {
      // Armour: rifles barely scratch it; directional plating (front 1x, side 0.7x, rear 0.35x).
      let armor = this.stats.armor;
      if (dir) {
        const len = Math.hypot(dir.x, dir.z) || 1;
        const facing = -(dir.x * Math.sin(u.yaw) + dir.z * Math.cos(u.yaw)) / len; // 1 = hit head-on
        armor *= facing > 0.5 ? 1 : facing > -0.5 ? 0.7 : 0.35;
      }
      u.hp -= amount * vsArmor * (1 - armor * (1 - pierce)) * (u.possessed ? 0.6 : 1);
      // an anti-armour hit that didn't kill: the crew pops smoke toward the shooter
      if (u.hp > 0 && vsArmor >= 0.5 && this.stats.smoke && !u.possessed) this.popSmoke(u, dir);
    }
    u.flash = 0.12;
    u.flinch = 1;
    u.suppress(this.usesCover ? 0.35 : 0.05);
    this.morale = Math.max(0, this.morale - 0.006 * this.nerve);
    if (source && source.faction !== this.faction && source.alive) {
      this.lastAttacker = source;
      this.lastHitTime = this.world.time;
    }
    if (u.hp > 0) {
      if (u.wounded && !u.woundedBarked) {
        u.woundedBarked = true;
        this.bark(u, 'wounded', 0.8, true);
        this.world.cover.release(u); // get down and crawl back
      } else {
        this.bark(u, 'hit', 0.1);
      }
      return;
    }

    u.hp = 0;
    u.alive = false;
    u.target = null;
    u.deathTime = 0;
    u.vel.set(0, 0, 0);
    this.world.cover.release(u);
    this.aliveCount--;
    this.renderer.done = false;
    this.morale = Math.max(0, this.morale - (0.1 + 0.3 / this.units.length) * (1 - 0.15 * this.rank) * this.nerve);
    if (u.officer) {
      this.morale = Math.max(0, this.morale - OFFICER_DOWN * (1 - 0.15 * this.rank));
      const w = this.units.find((m) => m.alive);
      if (w) this.bark(w, 'officer', 1, true);
      this.services.tell(this.faction, `${this.name}: the platoon leader is down!`);
    }
    const shock = this.usesCover ? 0.02 : 0.08; // a tank brewing up rattles everyone
    for (const o of this.world.stacksOf(this.faction)) {
      if (o !== this && dist2DSq(o.centroid, this.centroid) < 1600) o.morale = Math.max(0, o.morale - shock);
    }
    const witnesses = this.units.filter((w) => w.alive);
    if (witnesses.length) this.bark(witnesses[Math.floor(Math.random() * witnesses.length)], 'down', 0.6);
    this.services.bus.emit('unit:death', { unit: u, stack: this, killer: source });
    if (this.aliveCount === 0) this.services.bus.emit('stack:destroyed', this);
  }

  updateMorale(dt) {
    let calm = true;
    for (const u of this.units) {
      if (!u.alive) continue;
      if (u.threat) calm = false;
    }
    this.ledT = (this.ledT ?? 0) - dt;
    if (this.ledT <= 0) {
      this.ledT = 1;
      this.led = this.world.stacksOf(this.faction).some((o) => (o.officerAlive && dist2DSq(o.centroid, this.centroid) < LEAD_RANGE * LEAD_RANGE)
        || (o.postReady && dist2DSq(o.centroid, this.centroid) < o.stats.commandPost.lead ** 2)); // a command post steadies those around it
    }
    const rate = (0.01 + (calm ? 0.03 : 0) + (this.ai.state === AIState.RETREAT ? 0.02 : 0) + 0.012 * this.rank) * (this.led ? LED.rally : 1);
    this.morale = Math.min(1, this.morale + rate * dt);
  }

  /** Is this platoon's leader still alive? */
  /** Withdrawing (Orders 'withdraw'): once it is back at its base it leaves the battle. */
  checkWithdrawn() {
    const base = this.services.game?.map.bases?.[this.faction];
    if (base && dist2DSq(this.centroid, base) < WITHDRAWN * WITHDRAWN) this.retireNow = true; // the engine takes it off after this frame's updates
  }

  /** A forward command post that has stood set up long enough to work (data/units/commandPost.ts). */
  get postReady() {
    const cp = this.stats.commandPost;
    const u = this.units[0];
    return !!cp && !!u?.alive && !!u.setUp && this.world.time - u.setUp.at >= cp.deploy;
  }

  get officerAlive() {
    return this.hadOfficer && !!this.units[0]?.alive;
  }

  /** How hard losses hit morale: an officer nearby steadies them. */
  get nerve() {
    return this.led ? LED.nerve : 1;
  }

  updateCentroid() {
    let x = 0;
    let y = 0;
    let z = 0;
    let n = 0;
    for (const u of this.units) {
      if (!u.alive) continue;
      x += u.pos.x;
      y += u.pos.y;
      z += u.pos.z;
      n++;
    }
    if (n) this.centroid.set(x / n, y / n, z / n);
  }

  // ------------------------------------------------------------------ voice

  bark(u, kind, chance = 1, priority = false) {
    if (Math.random() > chance) return;
    const t = this.world.time;
    if (!priority && t - this.lastBark < BARK_COOLDOWN) return;
    const text = barkLine(this.faction, kind);
    if (!text) return;
    this.lastBark = t;
    this.services.bus.emit('bark', { unit: u, stack: this, text, priority });
  }

  /** A callout from any living member (squad-level events like retreat or flank). */
  barkAny(kind) {
    const alive = this.units.filter((u) => u.alive);
    if (alive.length) this.bark(alive[Math.floor(Math.random() * alive.length)], kind, 1, true);
  }

  dispose() {
    this.renderer.dispose();
  }
}
