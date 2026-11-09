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
// Movement (world/Nav.js): the anchor follows a route round cover and deep water (bridges are
// open ground), each member walks to its slot — straight when the way is open, else by a route
// of its own; men climb low walls. Where it's too narrow for the formation (a bridge, a gate, a
// lane) the stack goes in single file along the anchor's trail (`this.column`).
//
// Veterancy: kills earn experience (systems/BattleStats.js → gainXp); ranks 1–3 (Veteran,
// Hardened, Elite) aim faster and truer, shrug off losses and steady themselves sooner.
//
// Infantry is fragile on purpose: a solid hit usually puts a soldier down, otherwise he is
// wounded (slow, goes prone, crawls back) and the next hit finishes him. Soldiers stand,
// crouch or go prone; rifles aim before every shot (longer at range and under fire), so
// long-range contact is a slow exchange of single shots rather than a firestorm.
import * as THREE from 'three';
import { FACTIONS, enemyOf, DEFAULT_ARMY, forArmy } from '../data/factions.js';
import { FORMS, FORM_TIME, formOffsets } from '../data/formations.js';
import { barkLine } from '../data/barks.js';
/** What a ship's crew calls out instead of the soldiers' lines (data/barks.js); the rest it doesn't. */
const SHIP_BARK = { hit: 'shipHit', wounded: 'shipBad', contact: 'shipContact', straddle: 'straddle' };
import { angleDelta, clamp, dist2DSq } from '../core/math.js';
import { Unit } from './Unit.js';
import { KITS } from '../data/kits.js';
import { touchScreen } from '../core/Keys.js';
import { createRenderer } from '../render/index.js';
import { thinkSoldier } from '../ai/SoldierAI.js';
import { AIState } from '../ai/StackAI.js';
import { VisibilitySystem } from '../systems/VisibilitySystem.js';
import { CLIMB, LOCAL, SHIP } from '../world/Nav.js';
import { armyDoctrine, ARTILLERY } from '../data/doctrine.js';
import { RECON } from '../systems/Doctrine.js';

const TRACERS = 1.6; // every weapon's tracer share (stats.tracer) times this: the battle reads better with more of them

// Officers: a rifle platoon's first man leads it. While he lives, his own men and every friendly
// stack within LEAD_RANGE lose morale slower, rally faster and react quicker; once he's down
// his platoon is slower than one that never had him.
const PACK = 0.5;          // packing up takes this share of the set-up time
const NO_PROGRESS = 3;     // s without getting nearer before a unit plans its own way round
const PARKED = 1.5;        // m: a parked vehicle ignores its slot drifting less than this
const REVERSE = { angle: 2.3, within: 14, speed: 0.5 }; // vehicles back up to points just behind them, at half speed
const WITHDRAWN = 30;      // m from its base where a withdrawing stack leaves the field
const SET_UP_SLACK = 2.5;  // m a unit may shuffle and still count as set up (u.setUp)
const RADAR_BONUS = 1.2; // air defence under a friendly air search radar reaches this much further (AirStrike.radarCovers)
const LEAD_RANGE = 45;      // metres
const LED = { nerve: 0.6, rally: 1.5, react: 0.75 };
const LEADERLESS = { react: 1.25 };
const OFFICER_DOWN = 0.25;  // morale lost on top when the platoon leader falls
// Ambush: a unit nobody has spotted yet fires its first volley with this much more punch
const AMBUSH = { damage: 1.6, suppress: 2, tellEvery: 30 };
// Hand grenades (stats.grenades per man): at an enemy `min`–`range` m off who is in cover, a house,
// a trench or a bunker, or bunched with others; one throw per man every `every` s, back to full
// after `refill` s without a target
// Vehicle damage: an anti-armour hit that doesn't kill knocks out a part `chance` of the time —
// which one by where it struck (front: the gun, sides: the tracks, rear: the engine). Tracks the
// crew mends itself (`fix` s once out of fire for `calm` s); gun and engine need a recovery vehicle.
const PARTS = { chance: 0.5, fix: 40, calm: 10, engine: 0.4, recoverable: 0.5 };
// a ship's engine orders (stack.shipSpeed): the share of her top speed, and how loud her screws are to a
// listening submarine (VisibilitySystem: the boats' `hearing` × noise)
export const SHIP_SPEEDS = { slow: { k: 0.35, noise: 0.5, name: 'Slow' }, half: { k: 0.6, noise: 0.75, name: 'Half' }, full: { k: 1, noise: 1, name: 'Full' }, flank: { k: 1.12, noise: 1.5, name: 'Flank' } };
const ZIGZAG = { period: 40, swing: 0.5 }; // s a leg pair, rad off the course each way
const SMOKE_SHIP = { every: 2.5, radius: 60, last: 110 };
// gunnery at sea (UnitStack.fireControl): a firing solution builds over SOLUTION s of shooting at one target
// until then the shells fall long or short, up to RANGE_ERR of the range, walking onto her; her sharp turns
// and changes of speed spoil it. The same for both navies: in AI-v-AI soaks on mirrored Midway even 16 vs 19
// gave the US 9:1 (the US radar edge is its night sight, NAVAL nightSight)
const SOLUTION = { nato: 17, pact: 17 };
const SEARCHLIGHT = 1200; // m a ship's searchlight reaches at night (the sea's game scale: data/units45/ships.js RANGE)
const DC_FOCUS = 2.2; // damage control where the captain puts it (UnitStack.shipUpkeep)…
const DC_ELSE = 0.55; // …and everywhere else meanwhile
const RANGE_ERR = 0.07;
export const GRENADE = { range: 25, min: 6, every: 10, damage: 220, splash: 4, refill: 60, gravity: 9.8 };
// a rifle squad's light anti-tank rockets (stats.lightAT: how many the squad carries — M72 LAW,
// Panzerfaust 44, RPG-18): one man fires one at an enemy vehicle in reach, the squad's stock
// refills after a lull like the grenades
const REFILL = { base: 150, post: 80 }; // m: how near the base or a set-up command post a squad must be to take in new men
export const LAW = { range: 110, min: 12, every: 4, damage: 380, splash: 2, pierce: 0.6, vsArmor: 1, speed: 130, size: 1.1, spread: 0.02 };
const CLIMB_SPEED = 0.45;   // share of the speed while climbing over a wall
// stuck: trying to move but less than `moved` m in `every` s — plan again; `ghost` times in a
// row: squeeze through (collisions off for `ghostT` s, the last resort)
const STUCK = { every: 2.5, everyVehicle: 4, moved: 1, ghost: 2, ghostVehicle: 3, ghostT: 1.6, ghostTVehicle: 3.5 };
// single file: m between men (× spacing), m of trail kept; where there's less room than `narrow`
// m round the anchor (a bridge, a gate), until `after` m of more than `wide` m
const COLUMN = { gap: 1.3, trail: 120, narrow: 2.5, wide: 4, after: 10, afterVehicle: 40 }; // narrow: only a real choke point (a gate, a bridge, a gap in a wall) — not a hedge beside the way // (vehicles: every switch swung the wing hulls 13 m across — tanks snaking)
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
const FLAME = new THREE.Color(1, 0.55, 0.15).multiplyScalar(2.2);
const _w = new THREE.Vector3();
const _p = new THREE.Vector3();
const _near = [];
// ships' hulls as segments, stern to bow (x, z, x, z, half the beam), and the closest points between two
const _ha = [0, 0, 0, 0, 0];
const _hb = [0, 0, 0, 0, 0];
const _seg = [0, 0, 0, 0];
/** Closest points between segments a and b (2D, [x0, z0, x1, z1]) into out [ax, az, bx, bz]; returns the distance. */
function segClosest(a, b, out) {
  const d1x = a[2] - a[0], d1z = a[3] - a[1], d2x = b[2] - b[0], d2z = b[3] - b[1], rx = a[0] - b[0], rz = a[1] - b[1];
  const A = d1x * d1x + d1z * d1z, E = d2x * d2x + d2z * d2z, F = d2x * rx + d2z * rz, C = d1x * rx + d1z * rz, B = d1x * d2x + d1z * d2z;
  const den = A * E - B * B;
  let sa = den > 1e-9 ? clamp((B * F - C * E) / den, 0, 1) : 0;
  let tb = E > 1e-9 ? (B * sa + F) / E : 0;
  if (tb < 0) { tb = 0; sa = A > 1e-9 ? clamp(-C / A, 0, 1) : 0; } else if (tb > 1) { tb = 1; sa = A > 1e-9 ? clamp((B - C) / A, 0, 1) : 0; }
  out[0] = a[0] + d1x * sa; out[1] = a[1] + d1z * sa; out[2] = b[0] + d2x * tb; out[3] = b[1] + d2z * tb;
  return Math.hypot(out[0] - out[2], out[1] - out[3]);
}

let nextId = 1;

/** A warship's own name (type.names per side, data/units45/ships.js): the class's next one not yet afloat in this battle. */
function shipName(type, faction, world) {
  const list = type.names?.[faction];
  if (!list?.length) return null;
  const used = (world.shipNames ??= new Map());
  const key = `${type.id}:${faction}`;
  const i = used.get(key) ?? 0;
  used.set(key, i + 1);
  const n = list[i % list.length] + (i >= list.length ? ` ${Math.floor(i / list.length) + 1}` : '');
  return faction === 'nato' && !n.startsWith('SS ') ? `USS ${n}` : n; // (a merchantman is SS already)
}

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
    this.army = services.world?.armies?.[faction] ?? DEFAULT_ARMY[faction]; // US Army / Bundeswehr, Soviet Army / NVA
    const fs = type.factionStats;
    this.stats = fs?.[faction] || fs?.[this.army] ? { ...type.stats, ...fs[faction], ...fs[this.army] } : type.stats; // per-side (and per-army) differences
    const cav = RECON.has(type.id) && armyDoctrine(this.army, 'cavalry'); // the US Army's Cavalry screen sees further
    if (cav) this.stats = { ...this.stats, sight: (this.stats.sight ?? 100) * cav.sight };
    const walze = ARTILLERY.has(type.id) && armyDoctrine(this.army, 'walze'); // the NVA's Feuerwalze reloads faster
    if (walze) this.stats = { ...this.stats, fireCooldown: this.stats.fireCooldown * walze.cooldown };
    const quick = this.stats.gun && this.stats.towed && armyDoctrine(this.army, 'quickGuns'); // Bavaria's reformed artillery unlimbers sooner
    if (quick) this.stats = { ...this.stats, towed: { ...this.stats.towed, deploy: this.stats.towed.deploy * quick.deploy } };
    this.faction = faction;
    this.factionDef = FACTIONS[faction];
    this.name = name ?? shipName(type, faction, services.world ?? {}) ?? `${forArmy(type.variants, this.army, faction)?.name ?? type.shortName} ${this.id}`; // (the army's own name for it; a warship her own)
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
      this.world.cover?.resolveCircle(u.pos, u.radius * 0.85); // never born inside a wall or a hedge
      u.dest.copy(u.pos);
      this.units.push(u);
    }
    this.aliveCount = count;
    if (this.stats.formations) this.setForm(type.light ? 'skirmish' : 'line', true); // (1806: a company arrives in line; the light infantry in skirmish order)
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
    this._specialistStats ??= { ...this.stats, ...sp.stats, ...(sp.armyStats?.[this.army] ?? sp.armyStats?.[this.faction]) }; // (an army's own: the MG 42's rate)
    return this._specialistStats;
  }

  /** A squad kit (data/kits.js) on top of its stats: every member re-equipped (the specialists keep their own weapon). */
  setKit(id) {
    const kit = KITS[id];
    if (!kit || id === 'standard') return;
    this.kit = id;
    this.stats = { ...this.stats, ...kit.stats(this.stats) };
    this._specialistStats = null;
    this.lightAT = this.stats.lightAT ?? 0;
    // the riflemen it re-arms (not the squad's specialist: its MG gunner keeps the MG)
    const carry = kit.carry;
    let left = carry?.count ?? 0;
    for (const u of this.units) {
      u.stats = this.unitStats(u.index);
      u.grenades = u.stats.grenades ?? 0;
      const specialist = u.index < (this.type.specialist?.count ?? 0);
      u.kitWeapon = carry && !specialist && left-- > 0 ? carry.weapon : null;
    }
    if (carry && this.renderer) { // the new weapons in their hands (the renderer was built with the stack, before its kit)
      this.renderer.dispose();
      this.renderer = createRenderer(this, this.services.scene);
    }
  }

  /** Foot on a sprint order (core/Orders.js 'sprint'): at the run while it lasts, then winded a while. */
  get sprinting() { return this.moveTarget && (this.sprintUntil ?? 0) > this.world.time; }
  get winded() { return (this.windedUntil ?? 0) > this.world.time && !this.sprinting; }

  /** How this stack routes (world/Nav.js): men, vehicles — or a ship, deep water only. */
  get navFoot() { return this.stats.naval ? SHIP : this.usesCover; }

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

  /** A heavy weapon (artillery, a tank's main gun): seconds till every gun of it is loaded again (0: ready). Others: null. */
  get reloadLeft() {
    const s = this.stats;
    if (this.usesCover || !(s.indirect || s.fireCooldown >= 3)) return null;
    let left = 0;
    if (s.naval) { // a ship: her main battery's mounts (shipFire m.cd) — the next salvo
      const u = this.units.find((x) => x.alive), ms = u ? this.shipMounts(u).filter((m) => !m.torpedo && !m.out) : [];
      const top = Math.max(0, ...ms.map((m) => m.damage));
      const cds = ms.filter((m) => m.damage === top).map((m) => Math.max(0, m.cd ?? 0));
      return cds.length ? Math.min(...cds) : null;
    }
    for (const u of this.units) if (u.alive) left = Math.max(left, u.reloadT > 0 ? u.reloadT : u.cooldown / ((u.fireRateMult || 1) * (this.doc?.fire ?? 1)));
    return left;
  }

  /** The label's state line, with the reload count of your own heavy weapons. */
  get stateText() {
    const left = this.reloadLeft;
    return left > 0.5 && this.services.game?.mine?.(this) ? `${this.ai.state} · Reload ${Math.ceil(left)} s` : this.ai.state;
  }

  get moraleWord() {
    if (this.ai?.state === AIState.RETREAT) return 'Broken';
    if (!this.usesCover) { // a machine: what is knocked out
      const hurt = (k) => this.units.some((u) => u.alive && (k === 'tracks' ? u.speedMul === 0 : u[k]));
      if (hurt('gunOut')) return 'Gun out';
      if (hurt('tracks')) return 'Tracks hit';
      if (hurt('engineHit')) return 'Engine hit';
    }
    if (!this.stats.breakMorale) return 'Resolute'; // machines don't break
    if (this.dugIn) return 'Dug in';
    return this.morale > 0.66 ? 'Steady' : this.morale > 0.4 ? 'Shaken' : 'Wavering';
  }

  /** The player's unit in this stack, if any. */
  get leader() {
    return this.units.find((u) => u.possessed && u.alive) ?? null;
  }

  /** A member's loose formation position around the anchor, on the ground. */
  /** Men missing from a squad (infantry only: vehicles come back through recovery). */
  get missing() {
    return this.usesCover && !this.stats.structure ? this.units.filter((u) => !u.alive).length : 0;
  }

  /** Within reach of supply: your base, or a forward command post that is set up (core/Orders.js 'refill'). */
  get supplied() {
    const base = this.world.bases[this.faction];
    if (base && Math.hypot(base.x - this.centroid.x, base.z - this.centroid.z) < REFILL.base) return true;
    return this.world.stacksOf(this.faction).some((o) => (o.postReady && Math.hypot(o.centroid.x - this.centroid.x, o.centroid.z - this.centroid.z) < REFILL.post)
      || (o.stats.supply && o.setUpFully() && Math.hypot(o.centroid.x - this.centroid.x, o.centroid.z - this.centroid.z) < o.stats.supply.radius)); // (the Fallschirmjäger's supply lorry, 1945)
  }

  /** The missing men rejoin, each in his slot by the squad (the new men thin its experience a little). */
  refill() {
    let n = 0;
    for (const u of this.units) {
      if (u.alive) continue;
      this.slotPosition(u, _v);
      u.alive = true;
      u.hp = u.maxHp;
      u.deathTime = 0;
      u.suppression = 0;
      u.target = null;
      u.pos.set(_v.x, this.world.terrain.heightAt(_v.x, _v.z), _v.z);
      u.dest.copy(u.pos);
      u.vel.set(0, 0, 0);
      this.aliveCount++;
      n++;
    }
    if (!n) return 0;
    this.renderer.done = false;
    this.setXp(this.xp * (1 - 0.25 * (n / this.units.length)));
    this.morale = Math.min(1, this.morale + 0.2);
    return n;
  }

  /** Put the whole stack at (x, z) at once, facing `facing` (the deployment phase, systems/Deployment.js): every man or vehicle in its formation slot, off anything solid. */
  placeAt(x, z, facing = this.facing) {
    const w = this.world;
    if (this.stats.naval && w.nav) { // a ship: the nearest water deep enough for her hull (never on the reef)
      const k = w.nav.snap(x, z, SHIP, this.units[0]?.radius ?? 6);
      if (k >= 0) ({ x, z } = w.nav.point(k));
    }
    this.facing = facing;
    this.holdFacing = null;
    this.anchor.set(x, w.terrain.heightAt(x, z), z);
    this.centroid.copy(this.anchor);
    this.moveTarget = null;
    this.route = null;
    this.column = false;
    this.garrison = null;
    this.ai.plannedSpots = null;
    for (const u of this.units) {
      if (!u.alive) continue;
      this.slotPosition(u, _v);
      // off walls and houses: a little further out round the slot until it's clear
      for (let k = 1; k < 14 && w.cover.pointBlocked(_v.x, _v.z, u.radius + 0.3); k++) {
        this.slotPosition(u, _v);
        _v.x += Math.cos(k * 2.4) * k * 1.2;
        _v.z += Math.sin(k * 2.4) * k * 1.2;
      }
      w.cover.release(u);
      u.pos.set(_v.x, w.terrain.heightAt(_v.x, _v.z), _v.z);
      u.dest.copy(u.pos);
      u.vel.set(0, 0, 0);
      u.yaw = facing;
      if (u.turretYaw !== undefined) u.turretYaw = facing;
    }
    this.ai.defend();
  }

  slotPosition(u, out) {
    if (this.column) return this.columnSlot(u, out);
    const c = Math.cos(this.facing);
    const s = Math.sin(this.facing);
    const wx = this.usesCover && !this.form ? u.wander.x : 0; // the idle shuffle is for men: a parked vehicle stays put (and keeps its facing)
    const wy = this.usesCover && !this.form ? u.wander.y : 0; // (1806: a formed company stands in its ranks)
    const loose = this.form ? 1 : LOOSENESS; // (1806 formations: the exact places)
    const ox = u.offset.x * loose + wx;
    const oy = u.offset.y * loose + wy;
    out.set(this.anchor.x + ox * c + oy * s, 0, this.anchor.z - ox * s + oy * c);
    this.fitSlot(u, out);
    this.onDeck(out);
    out.y = this.world.terrain.heightAt(out.x, out.z);
    return out;
  }

  /** A slot behind a wall or in a hedge comes in toward the anchor until it is open ground in sight of it. */
  fitSlot(u, out) {
    const nav = this.world.nav;
    const a = this.anchor;
    if (!nav || nav.visible(a, out, this.navFoot, u.radius)) return;
    const x = out.x - a.x;
    const z = out.z - a.z;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 5; i++) {
      const m = (lo + hi) / 2;
      _p.set(a.x + x * m, 0, a.z + z * m);
      if (nav.visible(a, _p, this.navFoot, u.radius)) lo = m; else hi = m;
    }
    out.set(a.x + x * lo, 0, a.z + z * lo);
  }

  /** Single file: each man his place along the way the anchor came, the first right behind it. */
  columnSlot(u, out) {
    let rank = 0;
    for (const o of this.units) { if (o === u) break; if (o.alive) rank++; }
    let back = rank * this.type.formation.spacing * COLUMN.gap;
    let px = this.anchor.x;
    let pz = this.anchor.z;
    for (const q of this.trail) {
      if (back <= 0) break;
      const l = Math.hypot(q.x - px, q.z - pz);
      if (l < 1e-6) continue;
      if (l >= back) { px += ((q.x - px) * back) / l; pz += ((q.z - pz) * back) / l; back = 0; break; }
      back -= l;
      px = q.x;
      pz = q.z;
    }
    // the trail is shorter than the column: on straight back from where it began
    out.set(px - Math.sin(this.facing) * back, 0, pz - Math.cos(this.facing) * back);
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
    if (!river || this.usesCover && !body && !this.column) return;
    const c = river.bridgeAt(p.x, p.z); // whichever deck it is on or beside
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
      if (this.form) this.updateForm(dt);
      if (this.charging) this.updateCharge(dt);
      if (this.stats.cavalry && !this.stats.loose) this.updateSabres(dt);
      if (this.stats.loose) this.updateLoose(dt);
      if (this.stats.dismounted) this.updateDismounted(dt);
    }
    // (the renderer is updated by GameEngine after the simulation step)
  }

  /**
   * Where the anchor heads now: the next corner of its route to the move target (planned again
   * when the target moves or the ground changes), or the target itself. `last`: it is the end.
   */
  routeTarget() {
    const t = this.moveTarget;
    const nav = this.world.nav;
    if (!nav) return { x: t.x, z: t.z, last: true };
    let r = this.route;
    if (!r || r.version !== nav.version || Math.hypot(r.to.x - t.x, r.to.z - t.z) > 2) {
      const p = nav.path(this.anchor, t, this.navFoot, this.stats.radius);
      r = this.route = { to: { x: t.x, z: t.z }, version: nav.version, pts: p?.pts ?? [{ x: t.x, z: t.z }], i: 0 };
    }
    while (r.i < r.pts.length - 1 && Math.hypot(r.pts[r.i].x - this.anchor.x, r.pts[r.i].z - this.anchor.z) < 1.5) r.i++;
    const p = r.pts[r.i];
    return { x: p.x, z: p.z, last: r.i === r.pts.length - 1 };
  }

  updateAnchor(dt) {
    const s = this.stats;
    if (s.naval) { // a ship is its own stack: the anchor rides on it, and it steers along the route itself (SoldierAI)
      const u = this.units[0];
      if (u?.alive) { this.anchor.x = u.pos.x; this.anchor.z = u.pos.z; }
      if (this.moveTarget && Math.hypot(this.anchor.x - this.moveTarget.x, this.anchor.z - this.moveTarget.z) < 25 + s.radius) { this.moveTarget = null; this.route = null; }
      this.anchor.y = this.world.terrain.heightAt(this.anchor.x, this.anchor.z);
      return;
    }
    if (this.moveTarget && this.deploySeconds && this.units.some((u) => u.alive && (u.deployK ?? 0) > 0)) return; // still packing up
    if (this.moveTarget) {
      const goal = this.routeTarget();
      _v.set(goal.x - this.anchor.x, 0, goal.z - this.anchor.z);
      const d = _v.length();
      if (d < 0.6 && goal.last) {
        this.moveTarget = null;
        this.route = null;
      } else if (d >= 0.6) {
        // Don't outrun the troops: slow down while they are behind their places (a column
        // strung out over a bridge is in its places, not behind)
        let lag = 0;
        let n = 0;
        for (const u of this.units) if (u.alive && !u.possessed) { lag += Math.hypot(u.pos.x - u.dest.x, u.pos.z - u.dest.z); n++; }
        lag = n ? lag / n : 0;
        const k = clamp(1.4 - lag / (8 + this.footprint * 0.3), 0.15, 1);
        const speed = s.speed * (this.ai.state === AIState.RETREAT ? 1.45 : this.sprinting ? 1.5 : 1) * (this.winded ? 0.8 : 1) * k;
        this.anchor.addScaledVector(_v, Math.min(d, speed * dt) / d);
        if (!this.faceTarget) this.turnToward(Math.atan2(_v.x, _v.z), dt);
      }
    }
    if (this.faceTarget) {
      _v.subVectors(this.faceTarget, this.anchor);
      if (_v.x * _v.x + _v.z * _v.z > 1) this.turnToward(Math.atan2(_v.x, _v.z), dt);
    }
    this.anchor.y = this.world.terrain.heightAt(this.anchor.x, this.anchor.z);
    this.updateTrail();
  }

  /** The way the anchor came (newest first), for single file — and whether it's narrow here. */
  updateTrail() {
    const a = this.anchor;
    const t = (this.trail ??= []);
    const last = t[0];
    if (!last || Math.hypot(last.x - a.x, last.z - a.z) > 6) t.length = 0; // a jump (into a building, out of one): start again
    const step = !t.length || Math.hypot(t[0].x - a.x, t[0].z - a.z) >= 1;
    if (step) {
      t.unshift({ x: a.x, z: a.z });
      if (t.length > COLUMN.trail) t.pop();
    }
    // really narrow (a hedge along the road isn't): single file while moving, and back into the
    // formation only once it's open for a while — every change strings the men out again
    const nav = this.world.nav;
    const room = nav ? nav.clearance(a.x, a.z, this.navFoot) : Infinity;
    if (!this.moveTarget || this.units.length < 2 || this.form) this.column = false; // (1806: a formed company keeps its ranks — the slots squeeze in round trees and walls, fitSlot)
    else if (!this.column) { if (room < COLUMN.narrow) { this.column = true; this.wideFor = 0; } }
    else if (room <= COLUMN.wide) this.wideFor = 0;
    else if (step && ++this.wideFor > (this.usesCover ? COLUMN.after : COLUMN.afterVehicle)) this.column = false;
  }

  /**
   * Turn the wanted velocity w (seek + look-ahead + separation) into how a vehicle moves: the
   * hull turns toward it at its turn rate and the vehicle drives along the hull, slower the further
   * off it points; well off to the side it pivots first; a short way to a point behind it, it backs.
   */
  driveAlongHull(u, w, d, dt) {
    const want = Math.hypot(w.x, w.z);
    if (want < 0.05) { w.set(0, 0, 0); return; }
    const s = u.stats;
    const heading = Math.atan2(w.x, w.z);
    if (s.naval) { // a ship: the rudder bites only with way on, and it keeps going round the turn
      const way = Math.hypot(u.vel.x, u.vel.z) / s.speed;
      const diff = angleDelta(u.yaw, heading);
      const rate = s.turnRate * clamp(way * 1.6, 0.12, 1) * (u.rudderHit > this.world.time ? 0.25 : 1);
      u.yaw += clamp(diff, -rate * dt, rate * dt);
      u.turning = clamp(diff / 0.6, -1, 1) * Math.min(1, way * 2); // (the heel into the turn: the model)
      const speed = want * (0.45 + 0.55 * Math.max(0, Math.cos(diff)));
      w.set(Math.sin(u.yaw) * speed, 0, Math.cos(u.yaw) * speed);
      return;
    }
    let diff = angleDelta(u.yaw, heading);
    const back = Math.abs(diff) > REVERSE.angle && d < REVERSE.within; // just behind: reverse into it
    if (back) diff = angleDelta(u.yaw, heading + Math.PI);
    u.yaw += clamp(diff, -s.turnRate * dt, s.turnRate * dt);
    const along = Math.cos(diff);
    // well off the line: turn on the spot first
    const speed = along > 0.3 ? want * along * along : 0;
    const dir = back ? -1 : 1;
    w.set(Math.sin(u.yaw) * speed * dir * (back ? REVERSE.speed : 1), 0, Math.cos(u.yaw) * speed * dir * (back ? REVERSE.speed : 1));
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
    let maxSpeed = s.speed * u.speedMul * (this.doc?.speed ?? 1) * (u.slow ?? 1) * (u.run ? 1.65 : 1.12) * (u.wounded && this.usesCover ? 0.6 : 1) * this.wading(u)
      * (mud ? mud[this.usesCover ? 'infantry' : 'vehicle'] : 1);
    if (u.crouch > 0.5) maxSpeed *= 0.45;
    if (this.winded) maxSpeed *= 0.8;
    // radars, jammers, command posts: set up while parked (deployK 0 → 1 over `deploy` s: masts and
    // tents go up, the vehicle kit's `deploy`), and when ordered off they pack up first, standing
    // still, in PACK of that time — they only work fully set up
    const deploy = this.deploySeconds;
    if (deploy) {
      const off = !!this.moveTarget;
      u.deployK = Math.min(1, Math.max(0, (u.deployK ?? 0) + (off ? -dt / (deploy * PACK) : dt / deploy)));
      if (off && u.deployK > 0) maxSpeed = 0;
    }
    if (u.prone > 0.5) maxSpeed = Math.min(maxSpeed, 0.7); // crawling
    if (u.engineHit) maxSpeed *= PARTS.engine;
    if (s.naval) {
      this.shipUpkeep(u, dt);
      if (!u.alive) return;
      maxSpeed *= 1 - (u.flood ?? 0) * 0.6;
      maxSpeed *= SHIP_SPEEDS[this.shipSpeed]?.k ?? 1;
      if (s.smallCraft) maxSpeed *= 1 - ((this.services.game?.seaState ?? 1) - 1) * 0.55; // (a PT boat in a rough sea: pounding, half speed)
      if (!u.possessed) {
        this.keepStation(u, dt);
        const m = this.stationSpeed(u);
        if (m != null) maxSpeed = Math.min(maxSpeed, m);
        this.watchTorpedoes(u, dt);
      }
      this.laySmoke(u, dt);
      if (s.submarine) maxSpeed = Math.min(maxSpeed, (u.depth ?? 0) > 2 ? s.submarine.submerged : maxSpeed) * (this.silent ? 0.5 : 1); // under the surface: on the batteries (silent running: slower still)
    }
    if (u.speedMul === 0 && !this.usesCover && this.world.time - this.lastHitTime > PARTS.calm && (u.fixT = (u.fixT ?? 0) + dt) > PARTS.fix) {
      u.speedMul = 0.95; // the crew got the track back on
      this.services.tell(this.faction, `${this.name}: tracks mended`);
    }
    if (u.climbY > 0.2) maxSpeed *= CLIMB_SPEED;            // over a wall
    let way = this.steerTo(u, dt); // the next corner on the way to its place (or the place)
    if (s.naval && !u.possessed) way = this.shipCourse(u, way); // combing a torpedo track, zig-zagging
    const dDest = Math.hypot(u.dest.x - u.pos.x, u.dest.z - u.pos.z);
    _v.set(way.x - u.pos.x, 0, way.z - u.pos.z);
    const d = way === u.dest ? _v.length() : Math.max(_v.length(), Math.min(dDest, 6)); // (no slowing down at a corner)
    u.wantsMove = dDest > 1.5;
    _w.set(0, 0, 0);
    if (d > 0.2 + u.radius * 0.3) _w.copy(_v).multiplyScalar(Math.min(maxSpeed, d * 1.8) / d);
    this.separate(u, _w);
    // a vehicle goes where its hull points, never sideways — except while it squeezes free of
    // something it got stuck on: then it may shuffle, hull following
    const freeing = !this.usesCover && u.ghostT > 0;
    if (freeing) {
      const want = Math.hypot(_w.x, _w.z);
      if (want > 0.3) u.yaw += clamp(angleDelta(u.yaw, Math.atan2(_w.x, _w.z)), -s.turnRate * dt, s.turnRate * dt);
    } else if (!this.usesCover) {
      if (!this.moveTarget && dDest < PARKED) _w.set(0, 0, 0); // arrived: a small correction isn't worth turning the hull for
      this.driveAlongHull(u, _w, d, dt);
    }
    u.vel.lerp(_w, Math.min(1, dt * (this.usesCover ? 7 : s.naval ? s.accel ?? 0.25 : 2.5))); // vehicles accelerate gently, ships slowly (way on, way off)
    if (!this.usesCover && !freeing) { // …and only along the hull: no skating sideways while the old heading blends out
      const fx = Math.sin(u.yaw), fz = Math.cos(u.yaw), along = u.vel.x * fx + u.vel.z * fz;
      u.vel.set(fx * along, 0, fz * along);
    }
    this.moveBody(u, dt);
    this.checkStuck(u, dt, dDest, Math.min(maxSpeed, d * 1.8));
    u.atCover = !!u.coverSpot && dist2DSq(u.pos, u.coverSpot) < 0.8;

    this.updateWeapon(u, dt);

    // Facing matters (view cones): aim at the target, else look where fire came from, else
    // slowly scan the sector (cover direction or the squad's facing) — nobody stares forever.
    u.alertT -= dt;
    const scan = Math.sin(this.world.time * 0.35 + u.phase * 3) * 0.7;
    if (this.usesCover) {
      const desired = u.airTarget ? u.airYaw : u.target ? u.aimYaw
        : this.form && this.stats.drill ? this.facing + (this.stats.square ? u.faceOut ?? 0 : 0)
        : u.alertT > 0 ? u.alertYaw
          : u.moving ? u.moveYaw
            : (u.atCover ? Math.atan2(u.coverSpot.dirX, u.coverSpot.dirZ) : this.facing) + scan;
      u.yaw += angleDelta(u.yaw, desired) * Math.min(1, dt * (u.target || u.alertT > 0 ? 7 : 1.5));
    } else {
      // hull turns toward travel; the turret tracks the target (or sweeps) on its own
      const casemate = s.traverse != null && (u.target || u.airTarget); // (a fixed gun on a target: the hull answers to the gun, not the ordered facing)
      if (u.wantsMove) { /* the hull is steered in driveAlongHull */ } else if (!casemate && (this.ai.plannedSpots?.get(u)?.yaw ?? this.holdFacing) != null && this.ai.state === AIState.DEFEND) {
        u.yaw += clamp(angleDelta(u.yaw, this.ai.plannedSpots?.get(u)?.yaw ?? this.holdFacing), -s.turnRate * dt * 0.6, s.turnRate * dt * 0.6); // turn on the spot to face the order
      }
      const aim = u.airTarget ? u.airYaw : u.target ? u.aimYaw : u.alertT > 0 ? u.alertYaw : u.yaw + scan;
      this.aimGun(u, aim, dt, 1, !!(u.target || u.airTarget || u.alertT > 0));
      // gun elevation (AA guns follow the helicopter up; others keep a slight rise)
      const wantPitch = u.airTarget ? u.airPitch : 0.05;
      u.gunPitch = (u.gunPitch ?? 0.05) + (wantPitch - (u.gunPitch ?? 0.05)) * Math.min(1, dt * 4);
    }
    this.decayTimers(u, dt);
  }

  /**
   * The next point on u's way to its place (u.dest): the place itself when the walk there is
   * open, else the next corner of a route of its own (planned again when the place moves off
   * it, the ground changes, or it got stuck).
   */
  steerTo(u, dt) {
    const nav = this.world.nav;
    const dest = u.dest;
    if (u.detour) { // a ship going round ships in her way (checkStuck), then on along her route
      if (Math.hypot(u.detour.x - u.pos.x, u.detour.z - u.pos.z) < 80 || this.world.time > u.detour.until) { u.detour = null; u.path = null; u.navT = 0; }
      else return u.detour;
    }
    if (!nav || u.ghostT > 0) return dest;
    if ((u.navT = (u.navT ?? 0) - dt) <= 0) {
      u.navT = 0.3 + Math.random() * 0.2;
      if (Math.hypot(dest.x - u.pos.x, dest.z - u.pos.z) < 1.5 || nav.visible(u.pos, dest, this.navFoot, u.radius)) u.path = null;
      else if (!u.path || u.path.version !== nav.version || Math.hypot(u.path.to.x - dest.x, u.path.to.z - dest.z) > 2) {
        const p = nav.path(u.pos, dest, this.navFoot, u.radius, LOCAL);
        u.path = p && { to: { x: dest.x, z: dest.z }, version: nav.version, pts: p.pts, i: 0, reached: p.reached };
      }
    }
    const p = u.path;
    if (!p) return dest;
    while (p.i < p.pts.length - 1 && Math.hypot(p.pts[p.i].x - u.pos.x, p.pts[p.i].z - u.pos.z) < u.radius + 0.8) p.i++;
    return p.i === p.pts.length - 1 && p.reached ? dest : p.pts[p.i]; // (no way there: as near as it gets)
  }

  /**
   * Trying to move but getting nowhere (a crowd, a corner the route cut too fine): plan again;
   * after STUCK.ghost such spells in a row, squeeze through (collisions off for a moment).
   */
  checkStuck(u, dt, distToDest, wantSpeed) {
    if (this.stats.naval) return this.checkHeadway(u, dt, distToDest, wantSpeed);
    if (u.ghostT > 0) u.ghostT -= dt;
    if (distToDest < 2 || wantSpeed < 0.3) {
      u.stuckT = 0;
      u.stuckN = 0;
      u.stuckAt = null;
      return;
    }
    const v = !this.usesCover;
    if (!u.stuckAt) u.stuckAt = { x: u.pos.x, z: u.pos.z };
    if ((u.stuckT += dt) < (v ? STUCK.everyVehicle : STUCK.every)) return;
    const moved = Math.hypot(u.pos.x - u.stuckAt.x, u.pos.z - u.stuckAt.z);
    u.stuckT = 0;
    u.stuckAt = { x: u.pos.x, z: u.pos.z };
    if (moved > STUCK.moved) { u.stuckN = 0; return; }
    u.stuckN++;
    u.path = null;
    u.navT = 0;
    if (u.stuckN >= (v ? STUCK.ghostVehicle : STUCK.ghost)) u.ghostT = v ? STUCK.ghostTVehicle : STUCK.ghostT;
  }

  /** How loud her screws are (her engine order; a submarine's silent running is its own). */
  get noise() { return SHIP_SPEEDS[this.shipSpeed]?.noise ?? 1; }

  /**
   * The way a ship steers this moment, given the way her route wants: hard round onto a torpedo track she
   * has seen coming (u.evade, watchTorpedoes), or — ordered to zig-zag and with sea room to go — weaving
   * ZIGZAG.swing either side of it (a torpedo aimed at where she'd be finds water).
   */
  shipCourse(u, way) {
    const t = this.world.time;
    if (u.evade) {
      if (t < u.evade.until) return { x: u.pos.x + Math.sin(u.evade.yaw) * 400, z: u.pos.z + Math.cos(u.evade.yaw) * 400 };
      u.evade = null;
    }
    if (!this.zigzag || Math.hypot(u.dest.x - u.pos.x, u.dest.z - u.pos.z) < 300) return way;
    const a = Math.sin((t / ZIGZAG.period) * Math.PI * 2 + this.id * 1.7) * ZIGZAG.swing;
    const dx = way.x - u.pos.x, dz = way.z - u.pos.z;
    const c = Math.cos(a), sn = Math.sin(a);
    return { x: u.pos.x + dx * c + dz * sn, z: u.pos.z - dx * sn + dz * c };
  }

  /**
   * Torpedoes she can see coming (a wake from 1 km; the wakeless Long Lance only within 200 m) that would
   * hit her: she turns to comb the track — her bow or stern onto it, whichever is the shorter turn — and
   * holds that till they're past.
   */
  watchTorpedoes(u, dt) {
    if ((u.torpLook = (u.torpLook ?? 0) - dt) > 0) return;
    u.torpLook = 0.5;
    const list = this.services.game?.torpedoes?.list;
    if (!list?.length || (u.depth ?? 0) > 3) return;
    const half = (this.type.hull?.length ?? 100) * 0.5;
    for (const tp of list) {
      if (tp.faction === this.faction) continue;
      const dx = u.pos.x - tp.x, dz = u.pos.z - tp.z;
      const d = Math.hypot(dx, dz);
      if (d > (tp.wakeless ? 200 : 1000)) continue;
      const rvx = tp.dx * tp.speed - u.vel.x, rvz = tp.dz * tp.speed - u.vel.z;
      const rv2 = rvx * rvx + rvz * rvz;
      if (rv2 < 1) continue;
      const tca = (dx * rvx + dz * rvz) / rv2;
      if (tca <= 0 || tca > 70) continue;
      if (Math.hypot(dx - rvx * tca, dz - rvz * tca) > half + 25) continue; // it misses as she goes
      const along = Math.atan2(tp.dx, tp.dz);
      const yaw = Math.abs(angleDelta(u.yaw, along)) < Math.PI / 2 ? along : along + Math.PI; // the shorter turn: stern or bow onto it
      if (!u.evade) this.services.tell(this.faction, `${this.name}: torpedo tracks — turning to comb them`);
      u.evade = { yaw, until: this.world.time + Math.min(18, tca + 6) };
      return;
    }
  }

  /** A ship in formation (stack.station: on a leader, an offset in his frame): her place there, a little ahead of where he is now. */
  stationPoint() {
    const st = this.station;
    const lead = st && this.world.stackById(st.lead);
    const L = lead?.alive ? lead.units[0] : null;
    if (!L?.alive) { this.station = null; return null; }
    const c = Math.cos(L.yaw), s = Math.sin(L.yaw);
    return { x: L.pos.x + st.dx * c + st.dz * s + L.vel.x * 6, z: L.pos.z - st.dx * s + st.dz * c + L.vel.z * 6, lead: L };
  }

  /** Steer for her place in the formation (a fresh move order as it drifts). */
  keepStation(u, dt) {
    if (!this.station || (this.stationT = (this.stationT ?? 0) - dt) > 0) return;
    this.stationT = 1.5;
    const p = this.stationPoint();
    if (!p) return;
    const goal = this.world.clampToBounds({ x: p.x, z: p.z });
    if (!this.moveTarget || Math.hypot(this.moveTarget.x - goal.x, this.moveTarget.z - goal.z) > 35) this.ai.moveTo(goal, { ordered: true, keepStation: true });
  }

  /**
   * Near her place in the formation she matches the leader's speed (a little over, to close up); null: free.
   * The leader herself keeps to 85 % of her slowest follower's best, so the line can form up and hold.
   */
  stationSpeed(u) {
    if (!this.station) {
      if ((this.leadT = (this.leadT ?? 0) - 1 / 30) <= 0) { // (who follows her: looked up now and then)
        this.leadT = 2;
        const followers = this.world.stacks.filter((s) => s.alive && s.station?.lead === this.id);
        this.leadCap = followers.length ? Math.min(...followers.map((s) => s.stats.speed * (SHIP_SPEEDS[s.shipSpeed]?.k ?? 1))) * 0.85 : null;
      }
      return this.leadCap ?? null;
    }
    const p = this.stationPoint();
    if (!p) return null;
    const d = Math.hypot(p.x - u.pos.x, p.z - u.pos.z);
    if (d > 250) return null;
    return Math.hypot(p.lead.vel.x, p.lead.vel.z) + 0.5 + d * 0.03;
  }

  /** A destroyer or escort laying smoke (stats.smokeGen, ordered: stack.smokeUntil): clouds off her stern while she's under way. */
  laySmoke(u, dt) {
    if (!(this.smokeUntil > this.world.time) || (u.smokeT = (u.smokeT ?? 0) - dt) > 0) return;
    u.smokeT = SMOKE_SHIP.every;
    if (Math.hypot(u.vel.x, u.vel.z) < 1) return;
    const back = (this.type.hull?.length ?? 100) * 0.5;
    this.services.smoke?.add(u.pos.x - Math.sin(u.yaw) * back, u.pos.z - Math.cos(u.yaw) * back, { radius: SMOKE_SHIP.radius, duration: SMOKE_SHIP.last });
  }

  /**
   * A ship making no headway (other ships across her way: the route planner doesn't see them) goes round
   * them: a detour point ahead and out to the side with the fewer ships, in deep water.
   */
  checkHeadway(u, dt, distToDest, wantSpeed) {
    if (distToDest < 60 || wantSpeed < 0.3 || u.detour) { u.stuckT = 0; u.bestD = null; return; }
    if ((u.stuckT = (u.stuckT ?? 0) + dt) < 6) return;
    u.stuckT = 0;
    const gain = (u.bestD ?? Infinity) - distToDest;
    u.bestD = distToDest;
    if (gain > 15) return;
    const L = this.type.hull?.length ?? 100;
    if (distToDest < L * 1.5) return; // (a crowd at her goal: near enough — no circling off)
    const dl = Math.hypot(u.dest.x - u.pos.x, u.dest.z - u.pos.z) || 1;
    const fx = (u.dest.x - u.pos.x) / dl, fz = (u.dest.z - u.pos.z) / dl; // toward where she's going
    // only for ships in the way (stuck on anything else: the route planner's business)
    const blocked = this.world.stacks.some((st) => st !== this && st.alive && st.stats.naval && st.units.some((o) => {
      if (!o.alive || (o.depth ?? 0) > 3) return false;
      const ox = o.pos.x - u.pos.x, oz = o.pos.z - u.pos.z, ahead = ox * fx + oz * fz;
      return ahead > 0 && ahead < L + 200 && Math.abs(ox * fz - oz * fx) < (L + (st.type.hull?.length ?? 100)) * 0.6;
    }));
    if (!blocked) return;
    const nav = this.world.nav;
    let best = null, bestScore = -Infinity;
    for (const side of [-1, 1]) {
      const p = this.world.clampToBounds({ x: u.pos.x + fx * L * 0.9 + fz * side * L * 1.1, z: u.pos.z + fz * L * 0.9 - fx * side * L * 1.1 });
      if (nav && !nav.passable(p.x, p.z, SHIP, u.radius)) continue;
      let score = Infinity; // the room there: to the nearest other ship
      for (const st of this.world.stacks) if (st !== this && st.alive && st.stats.naval) score = Math.min(score, Math.hypot(st.centroid.x - p.x, st.centroid.z - p.z));
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (best) { u.detour = { x: best.x, z: best.z, until: this.world.time + 45 }; u.bestD = null; }
  }

  /** A ship's hull into `out` as a segment stern → bow (the bow stretched `ahead` m) and half its beam. */
  hullOf(u, out, ahead = 0) {
    const h = this.type.hull;
    const half = (h?.length ?? u.radius * 8) * 0.46;
    const sx = Math.sin(u.yaw), sz = Math.cos(u.yaw);
    out[0] = u.pos.x - sx * half; out[1] = u.pos.z - sz * half;
    out[2] = u.pos.x + sx * (half + ahead); out[3] = u.pos.z + sz * (half + ahead);
    out[4] = (h?.beam ?? u.radius * 2) * 0.5;
    return out;
  }

  /**
   * Every other ship's hull near u's (not a submarine below 3 m: she passes under), called with the closest
   * points (in _seg), the distance between the hulls and the room they want between them.
   */
  eachHull(u, ahead, fn) {
    if ((u.depth ?? 0) > 3) return;
    const a = this.hullOf(u, _ha, ahead);
    const myHalf = (this.type.hull?.length ?? u.radius * 8) * 0.5 + ahead;
    for (const s of this.world.stacks) {
      if (s === this || !s.alive || !s.stats.naval) continue;
      const reach = myHalf + (s.type.hull?.length ?? 100) * 0.5 + 40;
      for (const o of s.units) {
        if (!o.alive || (o.depth ?? 0) > 3 || Math.abs(o.pos.x - u.pos.x) > reach || Math.abs(o.pos.z - u.pos.z) > reach) continue;
        const b = s.hullOf(o, _hb);
        fn(o, segClosest(a, b, _seg), a[4] + b[4]);
      }
    }
  }

  /** Push away from neighbours, scaled by both bodies' sizes. */
  separate(u, out) {
    if (this.stats.naval) { // ships: keep off each other's hulls, looking ahead along the course
      const v = Math.hypot(u.vel.x, u.vel.z);
      this.eachHull(u, v * 8, (o, d, beams) => {
        const want = beams + 30;
        if (d >= want) return;
        let nx = _seg[0] - _seg[2], nz = _seg[1] - _seg[3];
        const nl = Math.hypot(nx, nz) || 1;
        nx /= nl; nz /= nl;
        const push = ((want - d) / want) * Math.max(2, this.stats.speed * 0.6);
        out.x += nx * push;
        out.z += nz * push;
        // and round it: along its side, the way she was heading anyway (a ship lying in the way is passed, not pushed against)
        let tx = -nz, tz = nx;
        if (tx * out.x + tz * out.z < 0) { tx = -tx; tz = -tz; }
        out.x += tx * push * 1.5;
        out.z += tz * push * 1.5;
      });
      return;
    }
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
    if (s.naval) { this.floatBody(u, px, pz, dt); return; }
    if (!(u.ghostT > 0)) this.world.cover.resolveCircle(u.pos, u.radius * 0.85, this.climb); // ghostT: climbing through
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
    // climbing a low wall: up on it while over it
    const up = this.climb ? this.world.cover.climbHeight(u.pos.x, u.pos.z, u.radius * 0.6, this.climb) : 0;
    u.climbY = (u.climbY ?? 0) + (up - (u.climbY ?? 0)) * Math.min(1, dt * 10);
    u.pos.y = this.world.terrain.heightAt(u.pos.x, u.pos.z) + (u.window?.floor ?? u.climbY); // (an upstairs window: its floor, systems/Buildings.js)
    const speed = Math.hypot(u.vel.x, u.vel.z);
    u.moving = speed > 0.5;
    // where and since when it has stayed put (the idle shuffle of a metre or two doesn't count)
    if (!u.setUp || (u.pos.x - u.setUp.x) ** 2 + (u.pos.z - u.setUp.z) ** 2 > SET_UP_SLACK * SET_UP_SLACK) u.setUp = { x: u.pos.x, z: u.pos.z, at: this.world.time };

    u.gait += (Math.min(1, speed / (s.speed * 1.5)) - u.gait) * Math.min(1, dt * 8);
    u.walkPhase += dt * speed * (Math.PI / (s.stride ?? 1.1));
    if (u.moving) u.moveYaw = Math.atan2(u.vel.x, u.vel.z);
  }

  /** A ship: deep water only (running onto a reef or the shallows stops it), afloat at the sea's level. */
  floatBody(u, px, pz, dt) {
    const w = this.world.river?.water;
    this.world.clampToBounds(u.pos);
    const nav = this.world.nav;
    // the shallows: her middle keeps her own radius off them (as her route does), her bow (some nine radii
    // ahead) stays off them too — a move that closes on them is refused, one that opens away never is
    const fx = Math.sin(u.yaw) * u.radius * 9, fz = Math.cos(u.yaw) * u.radius * 9;
    const closes = (cNew, cOld, r) => cNew < r && cNew < cOld;
    if (nav && (closes(nav.clearance(u.pos.x, u.pos.z, SHIP), nav.clearance(px, pz, SHIP), u.radius)
      || closes(nav.clearance(u.pos.x + fx, u.pos.z + fz, SHIP), nav.clearance(px + fx, pz + fz, SHIP), 0.5))) {
      u.pos.x = px;
      u.pos.z = pz;
      u.vel.multiplyScalar(0.2); // aground, near enough: stopped (it backs off on the next order)
    }
    // two hulls never overlap: each ship backs off half of it, and loses the way it had toward the other
    // (after the shallows: a ship stopped by them still gets out of another's way — turning on the spot
    // beside a shoal she would otherwise swing her hull into her neighbour's) — but never shoved onto them:
    // that push is the other ship's to make (a ship stopped there lies still, so she takes all of it)
    this.eachHull(u, 0, (o, d, beams) => {
      const min = beams + 2;
      if (d >= min) return;
      let nx = _seg[0] - _seg[2], nz = _seg[1] - _seg[3];
      let nl = Math.hypot(nx, nz);
      if (nl < 1e-3) { nx = u.pos.x - o.pos.x; nz = u.pos.z - o.pos.z; nl = Math.hypot(nx, nz) || 1; }
      nx /= nl; nz /= nl;
      const k = (min - d) * (Math.hypot(o.vel.x, o.vel.z) > 0.3 ? 0.5 : 1); // (half each when both are under way; all of it against a ship lying still)
      const vn = u.vel.x * nx + u.vel.z * nz;
      if (vn < 0) { u.vel.x -= nx * vn; u.vel.z -= nz * vn; } // (always: pinned against a shoal she still mustn't drive on into her)
      const qx = u.pos.x + nx * k, qz = u.pos.z + nz * k;
      if (nav && (closes(nav.clearance(qx, qz, SHIP), nav.clearance(u.pos.x, u.pos.z, SHIP), u.radius)
        || closes(nav.clearance(qx + fx, qz + fz, SHIP), nav.clearance(u.pos.x + fx, u.pos.z + fz, SHIP), 0.5))) return;
      u.pos.x = qx;
      u.pos.z = qz;
    });
    u.pos.y = (w?.level ?? 0) - (u.sink ?? 0) - (u.depth ?? 0);
    u.climbY = 0;
    const speed = Math.hypot(u.vel.x, u.vel.z);
    u.moving = speed > 0.5;
    if (!u.setUp || (u.pos.x - u.setUp.x) ** 2 + (u.pos.z - u.setUp.z) ** 2 > SET_UP_SLACK * SET_UP_SLACK) u.setUp = { x: u.pos.x, z: u.pos.z, at: this.world.time };
    u.gait = Math.min(1, speed / this.stats.speed);
    u.walkPhase += dt * speed;
    if (u.moving) u.moveYaw = Math.atan2(u.vel.x, u.vel.z);
  }

  /** Body upkeep for a player-driven unit: reload, posture, timers. */
  updateBody(u, dt) {
    const s = u.stats;
    u.cooldown -= dt * u.fireRateMult * (this.doc?.fire ?? 1);
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
    if (s.naval) return this.updateShipWeapons(u, dt);
    // a towed gun: hitched to its truck while it moves, and it takes `towed.deploy` s from
    // stopping to being unhitched and laid — no shooting until then (the renderer shows the truck)
    if (s.towed) {
      u.towing = !u.setUp || this.world.time - u.setUp.at < s.towed.deploy;
      if (u.towing) { u.target = null; u.airTarget = null; return; }
      // an anti-tank gun left in place 20 s: the crew piles a sandbag wall in front of the shield (free; it stays when they go)
      const g = this.services.game;
      if (s.antiArmor && !s.indirect && u.pitAt !== u.setUp && g && !g.net?.isClient && this.world.time - u.setUp.at > s.towed.deploy + 20) {
        u.pitAt = u.setUp;
        const site = g.construction.place('sandbags', u.pos.x + Math.sin(u.yaw) * 2.4, u.pos.z + Math.cos(u.yaw) * 2.4, u.yaw, this.faction, null, { force: true });
        if (site) g.construction.finish(site);
      }
    }
    u.cooldown -= dt * u.fireRateMult * (this.doc?.fire ?? 1);
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
      u.target = this.smokeMission(u) ?? this.barrageMission(u) ?? this.batteryMission(u) ?? this.pickTarget(u);
    }
    if (u.target) u.aimYaw = Math.atan2(u.target.pos.x - u.pos.x, u.target.pos.z - u.pos.z);

    if (!this.usesCover) {
      if (u.gunOut) { u.target = null; u.airTarget = null; return; }
      if (s.antiAir && (s.antiAir.missile ? this.engageAirMissile(u, dt) : this.engageAir(u, dt))) return; // aircraft first
      this.updateHeavyWeapon(u);
      return;
    }
    if (s.antiAir?.missile && this.engageAirMissile(u, dt)) u.target = null; // the launcher is busy: no rifle shots
    else if (s.antiAir && !s.antiAir.missile && this.engageAir(u, dt)) { u.target = null; return; } // an AA machine gun on its tripod (1945): aircraft first

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
    } else if (s.stance === 'stand' && !u.wounded) {
      // (1806: the line stands — to fire, to reload, to take the enemy's volley)
    } else if (pinned || u.wounded || u.suppression > 0.6 || s.stance === 'prone' || (u.target && !s.indirect && !s.marksman && distToTarget > s.range * 0.55)) { // (a sniper kneels to shoot: lying flat, the ground in between takes his rounds)
      wantProne = 1;
    } else if (reloading || u.suppression > 0.3 || u.target) {
      wantCrouch = 0.85;
    }
    if (u.working && !u.target && !pinned) { wantCrouch = 1; wantProne = 0; } // kneeling, digging
    const settled = u.prone > 0.85 || u.prone < 0.1; // can't shoot while dropping or getting up

    if (u.target && !reloading && u.mag > 0 && !fleeing && settled && this.deployed(u) && this.formReady(u)) {
      if (u.burstLeft > 0) {
        u.peekT = 0.35;
        u.burstTimer -= dt;
        // From cover (crouched), wait until we've actually risen before shooting.
        const ready = !inCover || u.prone > 0.85 || u.crouch < 0.35;
        if (u.burstTimer <= 0 && ready && (!s.volley || this.volleyLets(u))) {
          this.fire(u);
          u.mag--;
          u.burstLeft--;
          u.burstTimer = s.burstInterval;
          if (u.mag <= 0) {
            u.burstLeft = 0;
            this.startReload(u);
          }
        }
      } else if (u.cooldown <= 0 && this.lightATAt(u, distToTarget)) {
        this.fireLightAT(u);
        u.cooldown = 3;
        u.peekT = 0.8; // up over the cover with the tube on the shoulder
      } else if (u.cooldown <= 0 && this.grenadeAt(u, distToTarget)) {
        this.throwGrenade(u);
        u.cooldown = 2.5;
        u.peekT = 0.6; // up over the cover to throw
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
    if (u.target) u.calmT = 0;
    else if ((u.calmT = (u.calmT ?? 0) + dt) > GRENADE.refill * (this.nearSupply ?? 1)) { u.grenades = s.grenades ?? 0; this.lightAT = s.lightAT ?? 0; this.smokeLeft = this.stats.smoke?.charges ?? 0; } // grenades, rockets and smoke from the platoon's stock

    if (u.peekT > 0) {
      u.peekT -= dt;
      if (inCover && wantProne < 0.5) wantCrouch = 0; // rise to fire over the cover
    }
    this.applyPosture(u, wantCrouch, wantProne, dt);
    u.reloadAnim += ((reloading || u.working ? 1 : 0) - u.reloadAnim) * Math.min(1, dt * 6);
  }

  // ------------------------------------------------------------------ 1806: formations and the charge

  /** Form `form` (data/formations.js): the men walk to their new places; no firing until it's done. */
  setForm(form, instant = false) {
    const F = FORMS[form];
    if (!F || !this.stats.formations || this.form === form) return false;
    this.formBase ??= this.stats;
    const base = this.formBase;
    this.form = form;
    // the armies' signatures (data/epoch.js, 1806): France's quick columns and skirmishers, Prussia's drilled line and slow re-forming
    const pas = form === 'column' && armyDoctrine(this.army, 'pasDeCharge');
    const pel = form === 'line' && armyDoctrine(this.army, 'peloton');
    const tir = form === 'skirmish' && armyDoctrine(this.army, 'tirailleurs');
    this.stats = {
      ...base, ...F.stats, speed: base.speed * (F.speed ?? 1) * (pas?.speed ?? 1),
      ...(pel ? { reloadTime: base.reloadTime * pel.reload, spread: base.spread * pel.spread } : {}),
      ...(tir ? { stealth: (base.stealth ?? 1) / tir.stealth, suppressPower: (base.suppressPower ?? 1) * tir.suppress } : {}),
    };
    this._specialistStats = null;
    this.packForm();
    this.formedAt = instant ? 0 : this.world.time + FORM_TIME * (armyDoctrine(this.army, 'cuirassiers')?.form ?? 1);
    for (const u of this.units) { u.stats = this.unitStats(u.index); u.volleyWait = false; u.volleyGo = false; }
    this.volleyFirst = null;
    return true;
  }

  /** The places of the living men in the formation (closing the ranks over the fallen). */
  packForm() {
    const alive = this.units.filter((u) => u.alive);
    const offs = formOffsets(this.form, alive.length, this.type.formation.spacing);
    alive.forEach((u, i) => { u.offset.set(offs[i].x, offs[i].y); u.formRow = offs[i].row; u.faceOut = offs[i].out; });
    this.packedFor = alive.length;
  }

  /** May `u` fire now? Not while re-forming or charging; a column only from its front rank. */
  formReady(u) {
    if (!this.form) return true;
    return this.world.time >= this.formedAt && !this.charging && (!this.stats.frontOnly || !u.formRow);
  }

  updateForm() {
    if (this.aliveCount !== this.packedFor && this.world.time >= (this.repackAt ?? 0)) { this.packForm(); this.repackAt = this.world.time + 4; } // close up every few seconds
  }

  updateCharge(dt) {
    const c = this.charging;
    const t = c.target;
    // horses won't go into a square: they swerve off it, and the riders lose heart
    const square = t.stats.square && this.world.time >= (t.formedAt ?? 0); // (a square still forming is caught half-made: no refusal, the full shock)
    if (this.stats.cavalry && square && Math.hypot(t.centroid.x - this.centroid.x, t.centroid.z - this.centroid.z) < 16) {
      this.morale = Math.max(0, this.morale - 0.15);
      const a = Math.atan2(this.centroid.x - t.centroid.x, this.centroid.z - t.centroid.z);
      this.endCharge();
      this.ai.moveTo(this.world.clampToBounds({ x: t.centroid.x + Math.sin(a) * 70, z: t.centroid.z + Math.cos(a) * 70 }), { ordered: false });
      this.services.tell?.(this.faction, `${this.name}: the horses won't face the square`);
      return;
    }
    // a broken enemy is ridden down a while (horse ~6 s, the bayonets ~4 s), then the charge rallies
    if (t.alive && t.ai.state === AIState.RETREAT) c.pursueUntil ??= this.world.time + (this.stats.cavalry ? 6 : 4);
    if (!t.alive || this.world.time > (c.pursueUntil ?? Infinity) || this.world.time > c.until || this.morale < (this.stats.breakMorale ?? 0)) { this.endCharge(); return; }
    if ((c.steer -= dt) <= 0) { c.steer = 0.5; this.ai.moveTo({ x: t.centroid.x, z: t.centroid.z }, { ordered: true }); }
    const d = Math.hypot(t.centroid.x - this.centroid.x, t.centroid.z - this.centroid.z);
    if (!c.shocked && d < 30) {
      // the bayonets coming on: the target's nerve takes the blow (a square shrugs off foot)
      c.shocked = true;
      const steady = square && armyDoctrine(t.army, 'squares'); // (Saxony's squares don't flinch)
      t.morale = Math.max(0, t.morale - 0.3 * (c.shock ?? 1) * (steady ? 0 : square ? 0.4 : 1));
      this.bark(this.units.find((u) => u.alive), 'flank', 1);
    }
  }

  /** The bayonet charge on `target`: at the run, no firing; men within reach fight hand to hand (ai/SoldierAI.js). */
  startCharge(target) {
    if (!(this.form || this.stats.cavalry) || this.stats.loose || !target?.alive || this.charging) return false;
    const cav = this.stats.cavalry;
    const perk = cav ? (this.type.id === 'tank' && armyDoctrine(this.army, 'cuirassiers')) : armyDoctrine(this.army, 'pasDeCharge'); // (Prussia's cuirassiers, France's pas de charge)
    const far = Math.hypot(target.centroid.x - this.centroid.x, target.centroid.z - this.centroid.z);
    this.charging = { target, steer: 0, shocked: false, until: this.world.time + Math.max(cav ? 30 : 45, far / (cav?.chargeSpeed ?? 3) + 15), // (long enough to get there on the big maps)
      shock: (cav?.shock ? cav.shock / 0.3 : 1) * (perk?.shock ?? 1) };
    if (cav) { // at the gallop, sabres forward
      for (const u of this.units) u.sabreUp = true;
      this.chargeBase = this.stats;
      this.stats = { ...this.stats, speed: cav.chargeSpeed };
      for (const u of this.units) u.stats = this.stats;
    }
    this.ai.moveTo({ x: target.centroid.x, z: target.centroid.z }, { ordered: true });
    return true;
  }

  endCharge() {
    const t = this.charging?.target;
    this.charging = null;
    for (const u of this.units) u.sabreUp = false;
    if (this.chargeBase) { this.stats = this.chargeBase; this.chargeBase = null; for (const u of this.units) u.stats = this.stats; }
    if (!this.alive) return;
    // horse doesn't stand about in musket range: with the enemy still on its feet close by, it rides
    // back out of reach and re-forms there (the charge done, the squadron saved for the next one)
    if (this.stats.cavalry && t?.alive && t.ai.state !== AIState.RETREAT) {
      const dx = this.centroid.x - t.centroid.x, dz = this.centroid.z - t.centroid.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 120) {
        this.ai.moveTo(this.world.clampToBounds({ x: t.centroid.x + (dx / d) * 130, z: t.centroid.z + (dz / d) * 130 }), { hold: true, ordered: false });
        return;
      }
    }
    this.ai.defend();
  }

  /** Sabres: a trooper strikes at the enemy within reach — hard at the gallop, less in a mêlée. */
  updateSabres(dt) {
    const cav = this.stats.cavalry;
    if (!cav?.sabre) return;
    const rate = this.charging ? 1.5 : 1; // (cuts a second in the mêlée, more at the gallop)
    for (const u of this.units) {
      if (!u.alive || Math.random() > rate * dt) continue;
      let best = null, bd = (cav.reach + 0.6) ** 2;
      for (const o of this.world.neighbors(u.pos, cav.reach + 0.6, _near)) {
        if (!o.alive || o.faction === this.faction || o.stack.stats.loose) continue;
        if (o.stack.stats.square && this.world.time >= (o.stack.formedAt ?? 0) && Math.random() > 0.15) continue; // a formed square: the horses won't close on its bayonets
        const d = dist2DSq(u.pos, o.pos);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) { best.receiveDamage(cav.sabre * (0.6 + Math.random() * 0.7) * u.damageMult, this, 0, null, 1); u.slashT = 0.35; } // (the cut shows: models/napCavalry.js)
    }
  }

  // ------------------------------------------------------------------ 1806: horse and rider

  /**
   * A trooper is down: the rider, the horse, or both (u.fate, for the rig's fall). A horse that
   * lives runs on as a loose horse; a rider who lives gets up and goes on foot. Host only (the
   * new stacks reach a guest by their spawn).
   */
  unhorse(u) {
    if (this.stats.loose) { u.fate = 'horse'; return; }
    const r = Math.random();
    u.fate = r < 0.4 ? 'rider' : r < 0.75 ? 'horse' : 'both';
    const g = this.services.game;
    if (!g || g.net?.isClient || u.fate === 'both') return;
    const side = { x: Math.cos(u.yaw), z: -Math.sin(u.yaw) };
    if (u.fate === 'rider') {
      const h = g.spawnStack('looseHorse', this.faction, { x: u.pos.x, z: u.pos.z }, u.yaw, 'Loose horse');
      if (h) { h.autonomous = true; h.panicUntil = this.world.time + 8 + Math.random() * 6; }
    } else {
      const m = g.spawnStack('dismounted', this.faction, { x: u.pos.x + side.x * 1.4, z: u.pos.z + side.z * 1.4 }, u.yaw, `${this.name}: unhorsed`);
      if (m) { m.autonomous = true; m.origin = this; m.originType = this.type.id; }
    }
  }

  /** A loose horse: it bolts from fire and from the enemy, then wanders and grazes. */
  updateLoose(dt) {
    if ((this.looseT = (this.looseT ?? 0) - dt) > 0) return;
    this.looseT = 1;
    const u = this.units[0];
    if (!u?.alive) return;
    if (this.stats === this.type.stats) this.stats = { ...this.stats };
    const threat = this.world.nearestEnemyCombatant(u.pos, this.faction, 45, false);
    const scared = threat || this.world.time - this.lastHitTime < 3 || this.world.time < (this.panicUntil ?? 0);
    this.stats.speed = scared ? 9 : 1.5;
    u.stats = this.stats;
    if (scared && (threat || this.world.time - (this.boltAt ?? -99) > 4)) {
      this.boltAt = this.world.time;
      const from = threat?.pos ?? this.lastAttacker?.centroid ?? { x: u.pos.x - Math.sin(u.yaw), z: u.pos.z - Math.cos(u.yaw) };
      const a = Math.atan2(u.pos.x - from.x, u.pos.z - from.z) + (Math.random() - 0.5) * 0.8;
      this.ai.moveTo(this.world.clampToBounds({ x: u.pos.x + Math.sin(a) * 60, z: u.pos.z + Math.cos(a) * 60 }), { ordered: false });
    } else if (!scared && Math.random() < 0.08) { // a few steps to fresh grass
      const a = Math.random() * Math.PI * 2;
      this.ai.moveTo(this.world.clampToBounds({ x: u.pos.x + Math.sin(a) * 8, z: u.pos.z + Math.cos(a) * 8 }), { ordered: false });
    }
  }

  /** A trooper on foot: to the nearest loose horse of his side and back into the saddle, else home. */
  updateDismounted(dt) {
    if ((this.footT = (this.footT ?? 0) - dt) > 0) return;
    this.footT = 0.5;
    const u = this.units[0];
    if (!u?.alive || this.services.game?.net?.isClient) return;
    let horse = null, hd = 80 * 80;
    for (const h of this.world.stacksOf(this.faction)) {
      if (!h.stats.loose || !h.alive) continue;
      const d = dist2DSq(h.units[0].pos, u.pos);
      if (d < hd) { hd = d; horse = h; }
    }
    if (horse && hd < 2.5 * 2.5) return this.remount(horse);
    if (horse) { this.ai.moveTo({ x: horse.units[0].pos.x, z: horse.units[0].pos.z }, { ordered: false }); u.run = true; return; }
    if (!this.homeward) { // no horse about: back to his own lines
      this.homeward = true;
      const base = this.world.bases?.[this.faction];
      if (base) this.ai.moveTo(this.world.clampToBounds({ x: base.x, z: base.z }), { ordered: false });
    }
  }

  /** Back in the saddle: into his own squadron's empty place if it still rides, else a squadron of one. */
  remount(horse) {
    const g = this.services.game;
    const at = horse.units[0].pos;
    const o = this.origin;
    const slot = o?.alive && o.units.find((m) => !m.alive);
    if (slot) {
      slot.alive = true;
      slot.hp = slot.maxHp;
      slot.fate = null;
      slot.pos.set(at.x, at.y, at.z);
      slot.dest.copy(slot.pos);
      o.aliveCount++;
      o.renderer.done = false;
      if (o.form) o.packForm();
    } else if (this.originType) {
      const s = g.spawnStack(this.originType, this.faction, { x: at.x, z: at.z }, horse.units[0].yaw, this.name.replace(': unhorsed', ''), { count: 1 });
      if (s && o?.owner) s.owner = o.owner;
    }
    g.removeStack(horse);
    g.removeStack(this);
    g.tell?.(this.faction, 'A trooper caught a loose horse and is back in the saddle');
  }

  /**
   * A 1806 gun's shot at `t`: canister inside its range (a spray of balls, one report), roundshot
   * beyond (flat, low, through the ranks and bouncing). The grand battery's point counts as a target.
   * Howitzers lob shells (fire's indirect path) unless canister range. True: handled here.
   */
  gunFire(u, t) {
    const s = u.stats, G = s.gun;
    this.muzzleWorld(u, _p);
    const d = Math.hypot(t.pos.x - _p.x, t.pos.z - _p.z);
    if (t.battery) this.battery.left--;
    if (d <= G.canister && !t.battery) {
      _v.set(t.pos.x, t.pos.y + 0.9, t.pos.z);
      for (let i = 0; i < G.pellets; i++) this.shoot(u, _v, G.pelletSpread, { damage: G.pelletDamage, through: 1, size: 0.5, tracer: false, quiet: true, life: (G.canister * 1.4) / s.boltSpeed });
      this.services.effects.muzzle(_p, _w, 2, 'cannon');
      this.services.effects.powderBank?.(_p.x, this.world.terrain.heightAt(_p.x, _p.z), _p.z, u.turretYaw, 4);
      this.firedAt = this.world.time; // (the minimap shows where the fighting is)
      this.services.audio?.weapon(this.faction, s.weaponSound ?? this.weaponSound, _p);
      VisibilitySystem.revealShooter(u);
      return true;
    }
    if (s.indirect) return false; // the howitzer's shell: lobbed (fire)
    // roundshot: aimed low, to strike short and skip on into the target
    _v.set(t.pos.x, t.pos.y + 0.6, t.pos.z);
    this.shoot(u, _v, s.spread * (1 + d / s.range), { through: G.through, bounce: G.bounce, splash: 0, tracer: true, size: 1.4 });
    this.services.effects.powderBank?.(_p.x, this.world.terrain.heightAt(_p.x, _p.z), _p.z, u.turretYaw, 5);
    return true;
  }

  /** The grand battery's spot (systems/Powers1806.js): a pseudo-target for every gun given the order. */
  batteryMission(u) {
    const b = this.battery;
    if (!b || !u.stats.gun) return null;
    if (b.left <= 0 || this.world.time > b.until) { this.battery = null; return null; }
    b.target ??= { pos: new THREE.Vector3(b.x, this.world.terrain.heightAt(b.x, b.z), b.z), alive: true, spotted: true, aimHeight: 0, battery: true, vel: null, stack: null };
    return b.target;
  }

  /**
   * The volley (1806 drilled foot): a loaded, aimed man waits for the word. When most of the loaded
   * men are waiting — or the first has waited 3 s — the company fires together, each man within a
   * quarter of a second, and its powder smoke hangs in front of the line (systems/Smoke.js).
   */
  volleyLets(u) {
    if (u.volleyGo) { u.volleyGo = false; return true; }
    if (!u.volleyWait) { u.volleyWait = true; this.volleyFirst ??= this.world.time; }
    const loaded = this.units.filter((m) => m.alive && m.target && m.mag > 0 && m.reloadT <= 0);
    const waiting = loaded.filter((m) => m.volleyWait).length;
    if (waiting < Math.max(1, loaded.length * 0.6) && this.world.time - this.volleyFirst < 3) return false;
    for (const m of this.units) if (m.volleyWait) { m.volleyWait = false; m.volleyGo = true; m.burstTimer = Math.random() * 0.25; }
    this.volleyFirst = null;
    // the powder smoke in front of each man who fires — where the muskets are (one bank across the
    // company's spread drew a long line over empty ground when the men were strung out)
    const share = touchScreen() ? 0.5 : 1; // (a phone: every other man's smoke; a computer: every man's, fainter and longer — EffectsSystem.powderBank)
    for (const m of this.units) if (m.volleyGo && Math.random() < share) this.services.effects?.powderBank(m.pos.x, m.pos.y, m.pos.z, m.yaw, 1.6); // (a haze: it doesn't blind like a screen)
    return false;
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
    if (this.stats.naval) { // her heavy AA (the 5-inch): further out than the 40s, black bursts round the planes long before they close
      u.flakT = (u.flakT ?? 0) - dt;
      const far = u.flakT <= 0 && air?.nearestThreat(this.faction, u.pos, aa.range * 1.8);
      if (far) {
        u.flakT = 0.5 + Math.random() * 0.6;
        const r = 12 + Math.random() * 35, a = Math.random() * Math.PI * 2;
        _v.set(far.pos.x + Math.cos(a) * r, far.pos.y + (Math.random() - 0.3) * 20, far.pos.z + Math.sin(a) * r);
        this.services.effects.flak?.(_v);
        this.services.audio?.play('explosion.far', _v, { volume: 0.3, throttle: 0.25 });
      }
    }
    const h = air?.nearestThreat(this.faction, u.pos, reach);
    u.airTarget = h;
    if (!h) return false;
    const dx = h.pos.x - u.pos.x;
    const dz = h.pos.z - u.pos.z;
    const dist = Math.hypot(dx, dz);
    u.airYaw = Math.atan2(dx, dz);
    u.airPitch = Math.atan2(h.pos.y - (u.pos.y + 2), dist);
    if (!this.stats.naval && Math.abs(angleDelta(u.turretYaw, u.airYaw)) > 0.08) return true; // still slewing (a ship's AA is all round her: no turret to wait for)
    // burst / pause cycle
    u.aaCycle = (u.aaCycle ?? 0) + dt;
    if (u.aaCycle > aa.burst + aa.pause) u.aaCycle = 0;
    if (u.aaCycle > aa.burst) return true;
    u.aaT = (u.aaT ?? 0) - dt;
    while (u.aaT <= 0) {
      u.aaT += 1 / aa.rate;
      this.muzzleWorld(u, _p);
      if (this.stats.naval) { // a ship's AA: the 40s and 20s along her whole length, not one muzzle
        const hl = this.hullOf(u, _seg);
        const t = Math.random();
        _p.set(hl[0] + (hl[2] - hl[0]) * t + (Math.random() - 0.5) * hl[4], u.pos.y + (this.stats.height ?? 10) * 0.55, hl[1] + (hl[3] - hl[1]) * t + (Math.random() - 0.5) * hl[4]);
      }
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
      // (no minimap pulse for flak: the fighting it shows is on the ground and the water)
      this.services.audio?.weapon(this.faction, this.stats.naval ? 'aa' : this.weaponSound, _p); // (a ship's AA: the AA guns' bark, not her main battery)
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
    // (no minimap pulse for flak)
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
    this.firedAt = this.world.time; // (the minimap shows where the fighting is)
    this.services.audio?.weapon(this.faction, 'rocket', _p);
    VisibilitySystem.revealShooter(u);
  }

  /**
   * Lay the gun toward `aim` at its traverse rate (× `rate`). A gun with a narrow arc (stats.traverse,
   * radians either side of the hull: casemates, fixed rails, field guns on their trails) stays in
   * it, and — standing still, with `turnHull` — the hull swings round to bring the aim into it.
   */
  aimGun(u, aim, dt, rate = 1, turnHull = true) {
    const s = u.stats;
    const step = s.turretRate * rate * dt;
    if (s.traverse == null) { u.turretYaw += clamp(angleDelta(u.turretYaw, aim), -step, step); return; }
    const off = angleDelta(u.yaw, aim);
    if (turnHull && !u.moving && !u.wantsMove && Math.abs(off) > s.traverse * 0.7) u.yaw += clamp(off, -s.turnRate * dt, s.turnRate * dt);
    const want = u.yaw + clamp(angleDelta(u.yaw, aim), -s.traverse, s.traverse);
    u.turretYaw += clamp(angleDelta(u.turretYaw, want), -step, step);
    u.turretYaw = u.yaw + clamp(angleDelta(u.yaw, u.turretYaw), -s.traverse, s.traverse);
  }

  /** Tanks and guns: fire once the turret is on target. */
  updateHeavyWeapon(u) {
    const s = u.stats;
    if (!u.target) return;
    if (s.noStabilizer && u.moving) return; // no stabiliser (1945 tanks but the Sherman): only fires standing still
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
    if (s.indirect) return this.holdFire ? null : this.pickIndirectTarget(u); // hold fire: only what it is sent at (fire missions come before this)
    for (const e of this.world.combatants(enemyOf(this.faction))) {
      if (!e.alive || !e.spotted) continue; // you can only shoot what your side can see
      const d2 = dist2DSq(u.pos, e.pos);
      if (d2 > r2) continue;
      if (d2 > gun2 && (e.stack.usesCover || !missiles)) continue; // beyond the gun: only a vehicle, only with a missile
      if (s.structure && e.stack.stats.structure) continue; // concrete fights troops, not other concrete
      if ((e.depth ?? 0) > 3 && !s.depthCharges) continue; // a submarine under the surface: only depth charges reach it
      if (this.holdFire && !(this.ai.ordered && this.ai.state === AIState.ATTACK && e.stack === focus) && d2 > 15 * 15) continue; // hold fire (the player's order): the attack target, or someone right on top of them
      let score = Math.sqrt(d2);
      if (e.coverSpot && e.crouch > 0.6) score += 10;
      if (e.prone > 0.8) score += 8;
      if (focus && e.stack === focus) score -= 6;
      if (e === u.target) score -= 3;
      if (s.depthCharges && (e.depth ?? 0) > 3) score -= 600; // the escort's job: the boat it has found
      if (s.antiArmor && e.stack.kind !== 'infantry') score -= 15; // cannons and beams hunt big game
      else if (s.weapon === 'rocket' && this.usesCover && !e.coverSpot?.interior && !e.coverSpot?.omni && d2 > 30 * 30) continue; // an infantry rocket: vehicles, houses, trenches — men in the open only close by
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
      // not on its own side's heads: no shells where friends are near the target (orders and fire missions decide for themselves)
      const safe = Math.max(20, (s.splash ?? 4) * 3);
      if (this.world.neighbors(e.pos, safe, _near).some((o) => o.faction === this.faction && o.alive && dist2DSq(o.pos, e.pos) < safe * safe)) continue;
      let cluster = 0;
      for (const o of this.world.neighbors(e.pos, 8, _near)) if (o.faction === foe) cluster++;
      const located = e.locatedUntil > this.world.time ? 30 : 0; // the counter-battery radar's find: the enemy's guns first
      const score = d * 0.05 - cluster * 6 - located - (e.stack.dugIn ? 4 : 0) - (e.stack.usesCover ? 0 : 3) + (e.stack.stats.medical ? 20 : 0);
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  /** A grenade instead of a shot? The target close, and dug in, in a house or a bunker, or bunched up. */
  /** May `u` fire one of the squad's light anti-tank rockets at its target, `d` m away? */
  lightATAt(u, d) {
    const s = u.stats;
    const t = u.target;
    if (!s.lightAT || d > LAW.range || d < LAW.min || t.stack.usesCover || t.stack.stats.structure) return false; // vehicles only
    if (this.kit === 'at' && u.kitWeapon !== 'at') return false; // the anti-tank kit: its launchers are in three men's hands
    this.lightAT ??= s.lightAT;
    return this.lightAT > 0 && this.world.time >= (this.nextLightAT ?? 0);
  }

  /** One of the squad's rockets at u's target (led), or at the point `at` (direct control: the crosshair). */
  fireLightAT(u, at = null) {
    const t = u.target;
    this.lightAT--;
    this.nextLightAT = this.world.time + LAW.every;
    this.muzzleWorld(u, _p);
    if (at) _v.copy(at);
    else {
      _v.set(t.pos.x, t.pos.y + t.aimHeight, t.pos.z);
      if (t.vel) _v.addScaledVector(t.vel, _v.distanceTo(_p) / LAW.speed * 0.8);
    }
    _w.subVectors(_v, _p).normalize();
    const sp = LAW.spread * (1 + u.suppression) * (u.moving ? 2 : 1);
    _w.x += (Math.random() - 0.5) * sp * 2;
    _w.y += (Math.random() - 0.5) * sp;
    _w.z += (Math.random() - 0.5) * sp * 2;
    _w.normalize();
    this.services.projectiles.spawn({
      origin: _p, dir: _w, speed: LAW.speed, damage: LAW.damage * u.damageMult, faction: this.faction, color: this.boltColor,
      size: LAW.size, source: this, life: (LAW.range * 1.5) / LAW.speed + 0.2, splash: LAW.splash, pierce: LAW.pierce, vsArmor: LAW.vsArmor,
      suppress: 2, ignore: u.coverSpot?.collider ?? null, tracer: true, trail: true,
    });
    this.services.effects.muzzle(_p, _w, 1.2, 'rocket');
    this.firedAt = this.world.time; // (the minimap shows where the fighting is)
    this.services.audio?.weapon(this.faction, 'rocket', _p, u.atCover && !!u.coverSpot?.interior);
    VisibilitySystem.revealShooter(u);
    u.recoil = 1;
  }

  grenadeAt(u, d) {
    const s = u.stats;
    const t = u.target;
    if (!s.grenades || s.indirect || s.marksman || d > GRENADE.range || d < GRENADE.min) return false;
    if (!t.stack.usesCover && !t.stack.stats.structure) return false; // not against armour
    u.grenades ??= s.grenades;
    if (u.grenades <= 0 || this.world.time < (u.nextGrenade ?? 0)) return false;
    if (t.atCover || t.window || t.stack.dugIn || t.stack.stats.structure) return true;
    let near = 0;
    for (const o of this.world.neighbors(t.pos, 4, _near)) if (o.faction === t.faction && o.alive) near++;
    return near >= 2;
  }

  /** Throw a hand grenade at u's target (or at the point `at`: direct control): a high lob that bursts where it lands (or on the wall it hits). */
  throwGrenade(u, at = u.target.pos) {
    const t = { pos: at };
    u.grenades--;
    u.nextGrenade = this.world.time + GRENADE.every;
    _p.set(u.pos.x, u.pos.y + 1.6, u.pos.z);
    const d0 = Math.hypot(t.pos.x - u.pos.x, t.pos.z - u.pos.z);
    const miss = 0.8 + d0 * 0.06; // thrown by hand, by a man under fire
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * miss * (1 + u.suppression);
    const tx = t.pos.x + Math.cos(a) * r;
    const tz = t.pos.z + Math.sin(a) * r;
    const ty = t.pos.y + 0.3;
    const dx = tx - _p.x;
    const dz = tz - _p.z;
    const d = Math.max(1, Math.hypot(dx, dz));
    const th = 0.85;
    const g = GRENADE.gravity;
    const v = Math.sqrt((g * d * d) / Math.max(1, 2 * Math.cos(th) ** 2 * (d * Math.tan(th) - (ty - _p.y))));
    const flight = d / (v * Math.cos(th));
    _w.set((dx / d) * Math.cos(th), Math.sin(th), (dz / d) * Math.cos(th));
    this.services.projectiles.spawn({
      origin: _p, dir: _w, speed: v, damage: GRENADE.damage * u.damageMult, faction: this.faction,
      color: this.boltColor, size: 0.3, source: this, life: flight + 1, splash: GRENADE.splash, pierce: 0,
      vsArmor: 0.05, suppress: 3, gravity: g, target: _v.set(tx, ty, tz), crater: 0.15, tracer: false,
    });
    VisibilitySystem.revealShooter(u);
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
    this.firedAt = this.world.time; // (the minimap shows where the fighting is)
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
    const he = o?.kind === 'he'; // shells on the spot: a fire mission called through binoculars (systems/PlayerControl.js)
    if (!o || !u.stats.indirect || (he ? 1 : flare ? this.flareRounds : this.smokeRounds) <= 0) return null;
    if (o.until && this.world.time > o.until) { this.smokeOrder = null; return null; } // sustained fire: its time is up
    o.target ??= { pos: { x: o.x, y: this.world.terrain.heightAt(o.x, o.z), z: o.z }, alive: true, spotted: true, aimHeight: 0, stack: { kind: 'infantry' }, smoke: !flare && !he, flare };
    if (o.area) { // sustained fire: each aim at another point of the area
      const a = Math.random() * Math.PI * 2;
      const r = o.area * Math.sqrt(Math.random());
      const p = o.target.pos;
      p.x = o.x + Math.sin(a) * r; p.z = o.z + Math.cos(a) * r; p.y = this.world.terrain.heightAt(p.x, p.z);
    }
    return o.target;
  }

  /**
   * The NVA's Feuerwalze (data/doctrine.js 'walze'): the guns fire on a stand-in target that
   * systems/Doctrine.js walks forward `step` m every `every` s, toward the enemy, `steps` times.
   */
  startBarrage(x, z) {
    const w = armyDoctrine(this.army, 'walze');
    if (!w || !this.stats.indirect) return;
    const d = Math.hypot(x - this.centroid.x, z - this.centroid.z);
    if (d > this.stats.range) return this.services.tell(this.faction, `${this.name}: out of range (${this.stats.range} m)`);
    const foe = this.world.bases[enemyOf(this.faction)] ?? { x, z: z + 1 };
    const yaw = Math.atan2(foe.x - x, foe.z - z);
    this.ai.halt();
    this.barrage = {
      yaw, t: 0, left: w.steps, step: w.step, every: w.every,
      target: { pos: { x, y: this.world.terrain.heightAt(x, z), z }, alive: true, spotted: true, aimHeight: 0, stack: { kind: 'infantry' } },
    };
    for (const u of this.units) u.retarget = 0;
    this.services.tell(this.faction, `${this.name}: Feuerwalze — the barrage walks forward`);
  }

  barrageMission(u) {
    return this.barrage && u.stats.indirect ? this.barrage.target : null;
  }

  /** A part knocked out by a hit from `facing` (1 head-on, -1 from behind). */
  hitPart(u, facing) {
    if (Math.random() > PARTS.chance) return;
    const r = Math.random();
    const part = facing > 0.5 ? (r < 0.6 ? 'gun' : 'tracks') : facing > -0.5 ? (r < 0.65 ? 'tracks' : r < 0.85 ? 'gun' : 'engine') : (r < 0.6 ? 'engine' : 'tracks');
    if (part === 'gun' && !u.gunOut && (this.stats.weapon || this.stats.antiAir)) {
      u.gunOut = true;
      u.target = null;
      this.services.tell(this.faction, `${this.name}: the gun is knocked out — a recovery vehicle can mend it`);
    } else if (part === 'tracks' && u.speedMul !== 0 && this.stats.speed > 0) {
      u.speedMul = 0;
      u.fixT = 0;
      this.services.tell(this.faction, `${this.name}: tracks hit — the crew is on it`);
    } else if (part === 'engine' && !u.engineHit && this.stats.speed > 0) {
      u.engineHit = true;
      this.services.tell(this.faction, `${this.name}: engine hit — crawling`);
    }
  }


  // ------------------------------------------------------------------ ships (stats.naval)

  /** The mounts of a ship (data/units45/ships.js `mounts`, per side), each with its own reload and state. */
  shipMounts(u) {
    const m = this.type.mounts;
    return (u.mounts ??= ((m && (m[this.army] ?? m[this.faction])) ?? []).map((d) => ({ ...d, cd: Math.random() * d.reload, out: false })));
  }

  /** Where a mount's rounds leave: its place in the ship's frame (bow +z) turned with the hull. */
  mountWorld(u, at, out) {
    const c = Math.cos(u.yaw), s = Math.sin(u.yaw);
    return out.set(u.pos.x + at[0] * c + at[2] * s, u.pos.y + at[1], u.pos.z - at[0] * s + at[2] * c);
  }

  /** A ship's fight: one target for the whole ship; every mount bearing on it fires on its own. */
  updateShipWeapons(u, dt) {
    const s = u.stats;
    if (s.antiAir && (u.depth ?? 0) < 1) this.engageAir(u, dt); // the 40 mm and 20 mm at aircraft, whatever the main guns do
    u.retarget -= dt;
    if (u.target && (!u.target.alive || !u.target.spotted || dist2DSq(u.pos, u.target.pos) > s.range * s.range * 1.21)) u.target = null;
    if (u.retarget <= 0) {
      u.retarget = 1 + Math.random() * 0.6;
      u.target = this.pickTarget(u);
    }
    const t = u.target;
    u.turretYaw = t ? Math.atan2(t.pos.x - u.pos.x, t.pos.z - u.pos.z) : u.yaw;
    this.shine(u, t);
    if (!t) return;
    const d = Math.sqrt(dist2DSq(u.pos, t.pos));
    const depth = u.depth ?? 0;
    if (depth > 9) return; // a submarine deep down: blind and can't shoot
    // a boat with nowhere ordered to go brings its bow tubes round onto the target (it turns only with way on)
    if (u.stats.submarine && !this.moveTarget && Math.abs(angleDelta(u.yaw, u.turretYaw)) > 0.35 && (this.aimT = (this.aimT ?? 0) - dt) <= 0) {
      this.aimT = 6;
      this.ai.moveTo({ x: u.pos.x + Math.sin(u.turretYaw) * 220, z: u.pos.z + Math.cos(u.turretYaw) * 220 }, { ordered: false });
    }
    const under = (t.depth ?? 0) > 3; // the target is a submerged submarine: guns and torpedoes are no use, depth charges are
    if (under) { this.huntSub(u, t, d, dt); return; }
    const rel = angleDelta(u.yaw, u.turretYaw);
    const slow = u.bridgeHit > this.world.time ? 1.4 : 1; // (the bridge hit: orders come late)
    for (const m of this.shipMounts(u)) {
      m.cd -= dt;
      if (m.out || m.cd > 0 || d > m.range || (m.surfaced && depth > 1)) continue;
      const beam = m.torpedo && m.facing == null; // (a ship's torpedo mount trains to either beam; a boat's tubes point with the boat)
      if (beam ? Math.abs(Math.abs(rel) - Math.PI / 2) > m.arc / 2 : Math.abs(angleDelta(m.facing, rel)) > m.arc / 2) continue;
      m.cd = m.reload * slow * (0.85 + Math.random() * 0.3);
      this.mountWorld(u, m.at, _p);
      if (m.torpedo) {
        this.services.game?.torpedoes?.launch(this, _p, t, m);
        continue;
      }
      // the shell: led onto where the target will be, off by what the firing solution hasn't got yet, spread growing with the range
      _v.set(t.pos.x, t.pos.y + t.aimHeight, t.pos.z);
      if (t.vel) _v.addScaledVector(t.vel, d / m.shell);
      const fc = this.fireControl(u, t);
      const lx = (t.pos.x - u.pos.x) / (d || 1), lz = (t.pos.z - u.pos.z) / (d || 1);
      const long = (1 - fc.q) * RANGE_ERR * d * Math.sin(fc.n * 2.3 + this.id);       // long or short
      const wide = (1 - fc.q) * RANGE_ERR * 0.2 * d * Math.cos(fc.n * 1.7 + this.id); // left or right
      _v.x += lx * long + lz * wide;
      _v.z += lz * long - lx * wide;
      _w.subVectors(_v, _p).normalize();
      const spread = m.spread * (1 + 0.8 * d / m.range) * (u.moving ? 1.3 : 1) * u.skill * (1 - 0.1 * this.rank) * (1 + Math.abs(u.list ?? 0) * 4) * (this.services.game?.seaState ?? 1); // (a list throws the guns off: counter-flood; a rough sea too)
      _w.x += (Math.random() - 0.5) * spread * 2;
      _w.y += (Math.random() - 0.5) * spread * 0.6;
      _w.z += (Math.random() - 0.5) * spread * 2;
      _w.normalize();
      this.services.projectiles.spawn({
        origin: _p, dir: _w, speed: m.shell, damage: m.damage * u.damageMult, faction: this.faction, color: this.boltColor,
        size: m.size, source: this, life: (m.range * 1.4) / m.shell + 0.3, splash: m.splash, pierce: m.pierce, vsArmor: 1, suppress: 1, tracer: true,
      });
      if (m.damage >= 120) this.services.effects.muzzle(_p, _w, m.damage >= 1500 ? 3 : m.damage >= 500 ? 2 : 1, 'naval', this.world.river?.level ?? 0); // (the big guns: a fireball and the blast on the water)
      else this.services.effects.muzzle(_p, _w, m.size, 'artillery');
      this.services.audio?.weapon(this.faction, m.damage >= 500 ? 'navalHeavy' : m.damage >= 120 ? 'naval' : 'autocannon', _p); // (8-inch and up: the thunderclap; a PT boat's 40 mm)
      this.firedAt = this.world.time;
      VisibilitySystem.revealShooter(u);
    }
  }

  /**
   * A ship's searchlight at night (stack.searchlight): on her target within SEARCHLIGHT m — lit up as by day for
   * everyone (locatedUntil: VisibilitySystem.isSeen) — and on herself as much: the beam shows where she is.
   * With no target it sweeps ahead. u.lightOn: what systems/Searchlights.js draws the beam to.
   */
  shine(u, t) {
    const g = this.services.game;
    if (!this.searchlight || !g?.conditions?.night || (u.depth ?? 0) > 1) { u.lightOn = null; return; }
    const now = this.world.time;
    u.locatedUntil = Math.max(u.locatedUntil ?? 0, now + 0.6);
    if (t && dist2DSq(u.pos, t.pos) < SEARCHLIGHT * SEARCHLIGHT) {
      t.locatedUntil = Math.max(t.locatedUntil ?? 0, now + 0.6);
      u.lightOn = t.pos;
    } else {
      const a = u.yaw + Math.sin(now * 0.4 + this.id) * 0.9;
      u.lightOn = { x: u.pos.x + Math.sin(a) * 900, y: 0, z: u.pos.z + Math.cos(a) * 900 };
    }
  }

  /**
   * The firing solution on target unit `t` (ranging, at sea): from nothing when the guns turn on her, better
   * with every second of shooting (SOLUTION), halved when she turns hard or changes speed, worn by our own
   * hard turning. A straddle the first time it's good: the gunnery officer says so.
   */
  fireControl(u, t) {
    const now = this.world.time;
    const tv = Math.hypot(t.vel?.x ?? 0, t.vel?.z ?? 0);
    let fc = u.fc;
    if (!fc || fc.t !== t) fc = u.fc = { t, q: 0, yaw: t.yaw ?? 0, v: tv, n: 0, last: now, straddle: false };
    if (Math.abs(angleDelta(fc.yaw, t.yaw ?? 0)) > 0.25 || Math.abs(tv - fc.v) > 3) { fc.q *= 0.5; fc.yaw = t.yaw ?? 0; fc.v = tv; }
    if (Math.abs(u.turning ?? 0) > 0.5) fc.q *= 0.97;
    fc.q = Math.min(1, fc.q + (now - fc.last) / (SOLUTION[this.faction] ?? 18));
    fc.last = now;
    fc.n++;
    if (fc.q >= 0.75 && !fc.straddle) { fc.straddle = true; this.bark(u, 'straddle', 1, true); }
    return fc;
  }

  /**
   * A found submarine under the surface: a ship with depth charges runs in over it (unless the player
   * has it on another errand) and drops a pattern where it is (systems/Torpedoes.js charges).
   */
  huntSub(u, t, d, dt) {
    const dc = u.stats.depthCharges;
    if (!dc) return;
    if ((!this.ai.ordered || this.ai.state === AIState.ATTACK) && (this.chaseT = (this.chaseT ?? 0) - dt) <= 0) {
      this.chaseT = 3;
      this.ai.moveTo({ x: t.pos.x + (t.vel?.x ?? 0) * 8, z: t.pos.z + (t.vel?.z ?? 0) * 8 }, { ordered: false });
    }
    u.dcLeft ??= dc.count;
    if ((u.dcCd = (u.dcCd ?? 0) - dt) > 0 || u.dcLeft <= 0 || d > 60) return;
    u.dcCd = dc.reload;
    u.dcLeft--;
    this.services.game?.torpedoes?.dropCharges(this, u, t, dc);
    if (u.dcLeft === 0) this.services.tell(this.faction, `${this.name}: out of depth charges`);
  }

  /**
   * A hit on a ship that didn't sink it: below the waterline it leaks (flooding: UnitStack.shipUpkeep),
   * and now and then it knocks something out — the engines, the rudder, a mount, the bridge — or
   * starts a fire. `torpedo`: a hole in the hull for certain.
   */
  shipHit(u, dealt, torpedo = false) {
    const k = dealt / u.maxHp;
    const tell = (text) => this.services.tell(this.faction, `${this.name}: ${text}`);
    if (u.deckSpot > this.world.time) { // a carrier caught with her strike spotted on deck: armed and fuelled planes go up in flames
      u.blaze = Math.max(u.blaze ?? 0, 0.8);
      u.deckSpot = 0;
      tell('hit with armed planes on deck — she\'s burning!');
    }
    // a big ship has more compartments to fill, a belt keeps shells out and a bulge takes the edge off a torpedo
    const size = clamp(120 / (this.type.hull?.length ?? 120), 0.35, 1.2), belt = 1 - (this.stats.armor ?? 0);
    if (torpedo || Math.random() < (0.3 + k * 4) * belt) {
      const was = u.leak ?? 0;
      u.leak = was + (torpedo ? 0.012 * size * (1 - (this.stats.armor ?? 0) * 0.5) : Math.min(0.006, k * 0.03 + 0.002) * size); // (a torpedo opens a destroyer up, a battleship takes several; a shell or a charge springs a leak at most)
      if (torpedo) tell('torpedo hit — flooding!');
      else if (!was) tell('holed below the waterline');
    }
    if (Math.random() > Math.min(0.55, 0.06 + k * 5)) return;
    const now = this.world.time;
    const r = Math.random();
    if (r < 0.2) { u.engineHit = true; u.engineFix = now + 60; tell('engine room hit — losing speed'); }
    else if (r < 0.32) { u.rudderHit = now + 40; tell('rudder jammed'); }
    else if (r < 0.62) {
      const up = this.shipMounts(u).filter((m) => !m.out);
      const m = up[Math.floor(Math.random() * up.length)];
      if (m) { m.out = true; m.fixAt = Math.random() < 0.5 ? now + 60 : Infinity; tell(m.torpedo ? 'torpedo mount wrecked' : 'a gun mount knocked out'); }
    } else if (r < 0.72) { u.bridgeHit = now + 30; tell('bridge hit'); }
    else { u.blaze = Math.min(1, (u.blaze ?? 0) + 0.35); tell('fire aboard'); }
  }

  /**
   * A ship's own upkeep: water comes in through the leaks and the pumps fight it; fires burn and the
   * crews put them out (or don't: a big one can reach the magazine); damage gets mended. Flooding
   * settles the ship, lists and trims it (the model) and slows it; when it's full, it goes down.
   */
  shipUpkeep(u, dt) {
    const now = this.world.time;
    // damage control (u.dc, ordered from her tag: ui/StackLabels.js): its parties where the captain wants them —
    // the pumps, the fire, the repairs — work DC_FOCUS faster there and DC_ELSE as fast everywhere else
    const dc = (k) => (!u.dc ? 1 : u.dc === k ? DC_FOCUS : DC_ELSE);
    if (u.leak > 0) {
      u.flood = (u.flood ?? 0) + u.leak * dt;
      u.leak = Math.max(0, u.leak - dt * 0.00045 * dc('flood') * clamp((this.type.hull?.length ?? 120) / 120, 1, 2)); // damage control: the holes get plugged, one by one (a big ship has the bigger crew)
    } else if (u.flood > 0) u.flood = Math.max(0, u.flood - dt * 0.002 * dc('flood')); // …and pumped out
    for (const k of ['engineFix', 'rudderHit', 'bridgeHit']) if (u[k] > now) u[k] -= dt * (dc('repair') - 1); // (the repair parties: sooner, or later)
    for (const m of u.mounts ?? []) if (m.out && Number.isFinite(m.fixAt)) m.fixAt -= dt * (dc('repair') - 1);
    if (u.counterK != null && u.counterK < 1) u.counterK = Math.min(1, u.counterK + dt / 12); // counter-flooding: she comes upright over 12 s
    if (u.blaze > 0) {
      u.hp -= u.blaze * u.maxHp * 0.0025 * dt;
      const burn = u.dc === 'fire' ? -0.03 : u.blaze > 0.65 ? 0.008 : -0.02 * dc('fire'); // a small fire is put out, a big one spreads — unless every hose is on it
      u.blaze = Math.min(1, Math.max(0, u.blaze + burn * dt));
      if ((u.burnFx = (u.burnFx ?? 0) - dt) <= 0) {
        u.burnFx = 6;
        this.services.effects.burn({ x: u.pos.x, y: u.pos.y + 6, z: u.pos.z }, 8, 0.8 + u.blaze * 1.5);
      }
      if (u.blaze > 0.85 && Math.random() < dt * 0.01 * (1 - (this.stats.armor ?? 0) * 0.8)) { // the fire reaches a magazine (an armoured one, seldom)
        this.services.effects.explosion({ x: u.pos.x, y: u.pos.y + 8, z: u.pos.z }, 4, { ground: false, fire: 3 });
        this.services.tell(this.faction, `${this.name}: the magazine has gone up!`);
        this.damageUnit(u, u.hp * 10 + 1e5, this.lastAttacker ?? null, 1, null, 1);
        return;
      }
    }
    u.seaK = this.services.game?.seaState ?? 1; // (how she rolls and pitches: data/models/ships1945.js)
    const sm = u.stats.submarine;
    if (sm) { // dive or come up toward the ordered depth (never below the sea floor); badly holed, she has to surface
      u.depthMode ??= 'periscope';
      const floor = (this.world.river?.level ?? 0) - this.world.terrain.heightAt(u.pos.x, u.pos.z) - 5;
      let want = u.depthMode === 'surface' ? 0 : u.depthMode === 'deep' ? sm.deep : sm.periscope;
      if ((u.flood ?? 0) > 0.5) { want = 0; if (u.depthMode !== 'surface') { u.depthMode = 'surface'; this.services.tell(this.faction, `${this.name}: flooding — forced to surface!`); } }
      want = Math.max(0, Math.min(want, floor));
      u.depth = (u.depth ?? 0) + clamp(want - (u.depth ?? 0), -sm.dive * dt, sm.dive * dt);
    }
    if (u.engineHit && now > u.engineFix) { u.engineHit = false; this.services.tell(this.faction, `${this.name}: engines back`); }
    for (const m of u.mounts ?? []) if (m.out && now > m.fixAt) { m.out = false; this.services.tell(this.faction, `${this.name}: ${m.torpedo ? 'torpedo mount' : 'gun mount'} back in action`); }
    const f = u.flood ?? 0;
    u.listSide ??= Math.random() < 0.5 ? -1 : 1;
    u.list = f * 0.22 * u.listSide * (1 - (u.counterK ?? 0));
    u.trim = f * 0.03;
    u.sink = f * 2.5;
    if (f >= 1 || u.hp <= 0) this.damageUnit(u, u.hp * 10 + 1e5, this.lastAttacker ?? null, 1, null, 1); // (no more buoyancy: she goes down)
  }

  /** Smoke grenade launchers (vehicles) or thrown smoke grenades (infantry): a screen between `u` and the threat (dir: incoming shot). */
  popSmoke(u, dir = null) {
    if (this.smokeLeft <= 0 || this.world.time < (this.smokeReadyAt ?? 0)) return false;
    this.smokeLeft--;
    this.smokeReadyAt = this.world.time + 8;
    let yaw = this.usesCover ? u.yaw : u.turretYaw;
    if (dir) yaw = Math.atan2(-dir.x, -dir.z); // toward where the shot came from
    const d = 12;
    this.services.smoke?.add(u.pos.x + Math.sin(yaw) * d, u.pos.z + Math.cos(yaw) * d, this.usesCover ? { radius: 7, duration: 30 } : { radius: 9, duration: 40 });
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
      if (t.battery) this.battery.left--; // (a howitzer of the grand battery)
      if (t === this.smokeOrder?.target) { // a mission: smoke, illumination or shells on the spot
        if (flare) this.flareRounds--; else if (smoke) this.smokeRounds--;
        const left = flare ? this.flareRounds : smoke ? this.smokeRounds : 1;
        if (--this.smokeOrder.left <= 0 || left <= 0) { this.smokeOrder = null; u.target = null; }
      }
      return;
    }
    if (s.gun && this.gunFire(u, t)) return; // 1806 guns: roundshot or canister
    this.muzzleWorld(u, _p);
    _v.set(t.pos.x, t.pos.y + t.aimHeight, t.pos.z);
    const dist = _v.distanceTo(_p);
    if (t.vel) _v.addScaledVector(t.vel, (dist / s.boltSpeed) * (s.marksman ? 1 : 0.7)); // lead moving targets a little (a sniper: fully)
    const spread = s.spread * u.skill
      * (1 - 0.1 * this.rank)                  // veterans shoot straighter
      * (s.weapon === 'musket' && t.vel ? 1 + Math.min(1.2, Math.hypot(t.vel.x, t.vel.z) / 8) : 1) // (a smoothbore at a galloping horseman: far wider)
      * (1 + (0.8 * dist) / s.range)
      * (u.moving ? 2 : 1)
      * (1 + u.suppression * 1.4)
      * (u.wounded ? 1.3 : 1)
      * (u.prone > 0.8 ? 0.65 : 1)            // a steady prone rest
      * (this.deployed(u) ? 1 : 3)            // an MG fired from the hip sprays
      / (this.doc?.aim ?? 1);                 // the army's doctrine (systems/Doctrine.js)
    this.shoot(u, _v, spread);
  }

  /** Player shot toward a world point (much steadier hands). */
  fireAt(u, point) {
    const s = u.stats;
    if (s.weapon === 'artillery') return this.lob(u, point);
    const spread = s.spread * 0.3 * (u.moving ? 1.6 : 1) * (1 + u.suppression * 0.5)
      * (u.prone > 0.8 ? 0.6 : 1) * (this.deployed(u) ? 1 : 3);
    this.shoot(u, _v.copy(point), spread);
  }

  shoot(u, aimPoint, spread, over = null) {
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
      color: s.ignite ? FLAME : this.boltColor, // (a flamethrower's burning fuel)
      size: s.boltSize,
      source: this,
      life: (s.range * 1.5) / s.boltSpeed + 0.2,
      ignite: s.ignite ?? null,
      splash: s.splash ?? 0,
      pierce: s.pierce ?? 0,
      vsArmor: s.vsArmor ?? 1,
      suppress: (s.suppressPower ?? 1) * (ambush ? AMBUSH.suppress : 1),
      ignore: u.coverSpot?.collider ?? u.hullDown?.berm ?? null, // shoot over / around our own cover (or berm)
      tracer: !s.ignite && Math.random() < Math.min(1, (s.tracer ?? 1) * TRACERS), // (flame draws itself: ProjectileSystem)
      trail: !!s.trail,
      ...over,
    });
    if (over?.quiet) return; // (canister: one report for the whole load)
    this.services.effects.muzzle(_p, _w, this.usesCover ? 1 : 1.5, s.weapon ?? 'rifle');
    this.firedAt = this.world.time; // (the minimap shows where the fighting is)
    this.services.audio?.weapon(this.faction, s.weaponSound ?? this.weaponSound, _p, u.atCover && !!u.coverSpot?.interior, this.army, u.mag === 1);
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
    if (this.markedUntil > this.world.time) amount *= this.markDamage; // spotted by the US Army's Cavalry screen
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
      if (u.atCover && u.coverSpot?.interior) amount *= u.coverSpot.interior.fortified ? 0.36 : 0.6; // inside, behind brick walls (and sandbags: Buildings.upgrade)
      if (amount >= 35) {
        const pDown = u.wounded ? 1 : u.possessed ? 0.45 : 0.7;
        amount = Math.random() < pDown ? u.hp + 1 : Math.max(0, u.hp - this.stats.hp * 0.3);
      }
      u.hp -= amount;
    } else {
      // Armour: rifles barely scratch it; directional plating (front 1x, side 0.7x, rear 0.35x).
      let armor = this.stats.armor;
      let facing = 1;
      if (dir && !this.stats.naval) { // (a ship: one belt all round)
        const len = Math.hypot(dir.x, dir.z) || 1;
        facing = -(dir.x * Math.sin(u.yaw) + dir.z * Math.cos(u.yaw)) / len; // 1 = hit head-on
        armor *= facing > 0.5 ? 1 : facing > -0.5 ? 0.7 : 0.35;
      }
      const dealt = amount * vsArmor * (1 - armor * (1 - pierce)) * (u.possessed ? 0.6 : 1);
      u.hp -= dealt;
      if (this.stats.naval) { if (u.hp > 0) this.shipHit(u, dealt); } // (flooding, fires, parts)
      else if (u.hp > 0 && vsArmor >= 0.5 && dealt > u.maxHp * 0.08 && !this.stats.structure && !this.stats.cavalry) this.hitPart(u, facing);
      if (u.hp <= 0) u.recoverable = !this.stats.cavalry && Math.random() < PARTS.recoverable; // knocked out, not brewed up: a recovery vehicle can bring it back
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
      // infantry hit out in the open — in the attack, on the move, or pinned with nothing to hide behind: a
      // smoke grenade toward the shooter. Never from a house or from behind good cover: there the smoke
      // only hides the enemy coming across the open toward them
      const housed = this.garrison || this.entered || u.coverSpot?.interior;
      const exposed = this.moveTarget || this.ai.state === AIState.ATTACK || (u.suppression > 0.7 && !u.atCover);
      if (this.usesCover && this.smokeLeft > 0 && !u.possessed && !housed && exposed) {
        const from = source.centroid ?? source.pos;
        if (from) this.popSmoke(u, { x: u.pos.x - from.x, z: u.pos.z - from.z });
      }
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
    if (this.stats.cavalry) this.unhorse(u); // 1806: the horse, the rider or both
    if (this.form === 'square' && armyDoctrine(this.army, 'squares')) this.morale = Math.max(this.morale, (this.stats.breakMorale ?? 0) + 0.05); // Saxony's squares hold
    this.morale = Math.max(0, this.morale - ((this.form || this.stats.cavalry ? 0.035 : 0.1) + 0.3 / this.units.length) * (1 - 0.15 * this.rank) * this.nerve);
    if (u.officer) {
      this.morale = Math.max(0, this.morale - OFFICER_DOWN * (1 - 0.15 * this.rank));
      const w = this.units.find((m) => m.alive);
      if (w) this.bark(w, 'officer', 1, true);
      this.services.tell(this.faction, `${this.name}: the platoon leader is down!`);
    }
    const shock = this.usesCover || this.stats.cavalry ? 0.02 : 0.08; // a tank brewing up rattles everyone (a fallen horseman, no more than a man)
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
  /** Cover lower than this doesn't stop this stack: infantry climbs it (0: vehicles, stopped by all). */
  get climb() {
    return this.usesCover ? CLIMB : 0;
  }

  /** Seconds a radar / jammer / command post takes to set up (null: it doesn't). */
  get deploySeconds() {
    const s = this.stats;
    return s.commandPost?.deploy ?? s.jammer?.deploy ?? s.airRadar?.deploy ?? s.cbRadar?.deploy ?? s.smokeGen?.deploy ?? s.supply?.deploy ?? null;
  }

  /** Fully set up (and so working)? */
  setUpFully(u = this.units[0]) {
    return !!u?.alive && (u.deployK ?? 0) >= 1;
  }

  get postReady() {
    return !!this.stats.commandPost && this.setUpFully();
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
    if (this.stats.naval) { kind = SHIP_BARK[kind]; if (!kind) return; } // (a ship's crew: no legs, medics or magazines)
    if (Math.random() > chance) return;
    const t = this.world.time;
    if (!priority && t - this.lastBark < BARK_COOLDOWN) return;
    const text = barkLine(this.faction, kind, this.stats.naval && this.faction === 'pact' ? 'ijn' : this.army); // (at sea the other side is the Imperial Navy: Japanese)
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
