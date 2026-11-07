// Strategic AI for a bot faction in Frontline mode. It plays defensively and in phases, so a
// battle breathes: long quiet stretches of sporadic shots between deliberate offensives.
//
//   build       regroup and reinforce (≈1.5–2.5 min). Garrisons dig in on its threatened points
//               (the most threatened doubled); now and then a scout or MG team is sent forward to
//               an overwatch spot to probe — that's where single shots ring out.
//   plan        pick the target: among the nearest points it doesn't own, in a sector where it
//               isn't already attacking, the one you hold most weakly. It wants 30 % local
//               superiority at first, less and less the longer it has gone without an assault.
//   stage       move the strike group to a flank — off the direct line, on the side where
//               you are weaker — and gather there.
//   assault     go in from that angle: infantry runs for the point and digs in on it, armour
//               fights whatever defends it, fresh squads follow in waves.
//   consolidate hold the prize for a while, then back to build. A failed assault (heavy
//               losses or too long) pulls back to the staging area instead.
// Offensives are separate *operations*: with a big enough army it runs two or three at once in
// different sectors (map points carry a `sector`), each with its own group drawn from the free
// stacks nearest its target, launched a minute or so apart — parallel battles on several axes.
// Before any of that, empty neutral points are claimed by single infantry stacks (the land grab
// that opens a battle); the one who took a point stays as its garrison.
// The group goes in as fire and manoeuvre: MG teams stop on the direct line as a base of fire
// while the rest comes in from the flank, and the mortars' smoke gets a few seconds to land
// before anyone moves. A failed assault pulls back under smoke (mortars between the objective
// and the group, vehicles popping theirs). Forward observers take ground that sees the objective
// of the running assault — or, between offensives, the enemy facing the most exposed point — so
// its guns land tight there (UnitStack.observed). Stacks with most of their men badly hurt pull
// out to the field ambulance (or the rear) and rejoin once patched up. Before going in, it looks
// at the approach: wire it can see and minefields it has found are cleared by its engineers
// under mortar smoke, and the assault waits for the lane (or a minute). Garrisons fortify in
// order — sandbags, a trench, wire, a minefield, then a second belt to the side — and a side
// that only defends (Breakthrough's defence) digs in twice as fast.
// Contested points of its own are reinforced at any time. Garrisons that have settled
// fortify (sandbags, then a trench). Assaults open with a helicopter strafing run on the target,
// and dug-in positions near its front get shelled now and then. It buys reinforcements from
// command points along a build order (with caps on armour and guns).
// Strength = remaining health fraction × unit cost, summed per stack.
// Who does what: only infantry takes points, so the army is sorted by job. ASSAULT squads take
// them (and most of them stay free for that: an attacking side garrisons only what is threatened,
// at most a third of its line); ESCORT vehicles fight whoever defends the objective; everything
// else (guns, radars, ambulances…) stands behind the line (support()) and never counts as attack
// strength. An assault needs squads to go in, they run for the point even under fire, and it
// presses on with second waves until the point falls or the group is spent.
// Options (other modes): attack (launch offensives), buy (spend CP), expand (claim neutral
// points), targetable(point) (which points it may go for), firstAssault (s). Locked points
// (point.locked) are never targeted.
import { AIState } from './StackAI.js';
import { getUnitType } from '../data/units/index.js';
import { enemyOf } from '../data/factions.js';
import { unitCost, doctrine } from '../data/doctrine.js';
import { STRUCTURES, structureCost } from '../systems/Construction.js';

const THINK = 4;
const BUILD_ORDER = [
  'mgTeam', 'tank', 'atTeam', 'scouts', 'mortar', 'ifv', 'engineers', 'observers', 'artillery', 'sniper', 'cbRadar', 'tank', 'cev', 'mineClear', 'jammer', 'commandPost', 'manpads', 'towedAA', 'airRadar', 'gunMissile',
  'reconVehicle', 'aa', 'mgTeam', 'tankDestroyer', 'ifv', 'spMortar', 'ambulance', 'atTeam', 'heavyTank', 'rifles', 'recovery',
  'rockets', 'sam', 'tank',
];
const CAPS = {
  tank: 4, mgTeam: 3, atTeam: 3, artillery: 1, aa: 1, mortar: 2, ifv: 3, scouts: 2, engineers: 1, observers: 1, manpads: 2,
  reconVehicle: 2, tankDestroyer: 2, spMortar: 1, ambulance: 1, heavyTank: 2, recovery: 1, rockets: 1, sam: 1, cev: 1,
};
// armour: the share of its fighting stacks the AI keeps in vehicles, and what it buys to get there
// (in turn, saving up for each — the rifle squads don't get to spend that money first)
const ARMOUR_SHARE = 0.4;
const ARMOUR_ORDER = ['tank', 'ifv', 'tank', 'tankDestroyer', 'ifv', 'heavyTank', 'tank', 'reconVehicle', 'tankDestroyer', 'cev', 'heavyTank'];
const VEHICLE = new Set(['tank', 'heavyTank', 'ifv', 'tankDestroyer', 'reconVehicle', 'cev']);
const MAX_EXPANDERS = 3;            // stacks out claiming neutral points at once
const OP_GAP = [45, 90];            // seconds between launching one operation and the next
const FIRST_ASSAULT = 110;          // seconds before the first offensive
const LULL = [90, 150];             // seconds of regrouping between offensives
const PROBE_EVERY = [45, 75];
const SMOKE_SETTLE = 9;             // seconds the assault waits for its smoke screen to land
const BREACH_WAIT = 60;             // seconds the assault waits for its engineers to open a lane
// what a settled garrison builds, in order: [kind, metres ahead, metres to the side]
const FORT = [['sandbags', 3.5, 0], ['trench', 1, 0], ['wire', 14, 0], ['mines', 30, 0], ['wire', 16, 11], ['mines', 34, -14]];
const RECOVER_AGAIN = 150;          // seconds before a stack that was pulled out goes again
const ASSAULT = new Set(['rifles', 'atTeam', 'kampfgruppe', 'airAssault']); // squads that go in and take a point
const LINE = new Set([...ASSAULT, 'mgTeam']);                 // infantry that can hold one too
const ESCORT = new Set(['tank', 'heavyTank', 'ifv', 'tankDestroyer', 'reconVehicle', 'cev', 'mineClear']); // goes with an assault
const OWN_ROLE = new Set(['scouts', 'sniper', 'crew']);       // have jobs of their own: not sent behind the line
const fighter = (s) => LINE.has(s.type.id) || ESCORT.has(s.type.id);
const GARRISON_SHARE = 0.34;        // of the line an attacking side leaves sitting on points
const THREATENED = 150;             // m: an enemy this near a point of ours is worth a garrison
const MIN_ASSAULT = 2;              // squads an assault needs: without them it can't take anything
const NERVE = { start: 1.3, least: 0.7, per: 180 }; // local superiority it wants; loses 0.3 per `per` s without an assault
const WAVE_EVERY = 50;              // seconds between second waves into a running assault
const ASSAULT_TIME = 170;           // seconds an assault gets to reach the point…
const ASSAULT_MAX = 320;            // …and in all, while men are on it
const HELP_TIME = 90;               // seconds a stack sent to a threatened point stays tied to it

/** Share of a stack's living men (or vehicles) under half health. */
const hurtShare = (s) => {
  const alive = s.units.filter((u) => u.alive);
  return alive.length ? alive.filter((u) => u.hp < u.maxHp * 0.5).length / alive.length : 0;
};

const strength = (s) => (s.alive ? s.hpRatio * (s.type.cost ?? 150) : 0);
const rand = ([a, b]) => a + Math.random() * (b - a);

export class FrontlineDirector {
  constructor(game, faction, state, opts = {}) {
    this.game = game;
    this.faction = faction;
    this.state = state;      // mode state: { points, cp, buy() }
    this.opts = { attack: true, buy: true, expand: true, targetable: null, firstAssault: FIRST_ASSAULT, tempo: 1, ...opts };
    this.tempo = this.opts.tempo;   // difficulty (data/rules.js): < 1 attacks sooner and more often
    this.timer = 6;          // let the opening settle
    this.buildIndex = 0;
    this.roles = new Map();  // stack → { role: 'garrison' | 'strike' | 'probe', point, until }
    this.ops = [];           // running operations: { phase, since, plan: { target, stage, group, startStrength } }
    this.nextOffensive = this.opts.firstAssault * this.tempo;
    this.nextProbe = 50;
    this.lastAssault = 0;
  }

  get points() {
    return this.state.points.points;
  }

  get now() {
    return this.game.world.time;
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = THINK;
    for (const s of this.roles.keys()) if (!s.alive) this.roles.delete(s);
    if (this.opts.buy) this.buy();
    this.illuminate();
    this.casualties();
    this.observe();
    if (this.opts.expand) this.expand();
    this.garrison();
    this.respond();
    this.support();
    if (this.opts.attack) this.offensive();
    else this.probe();
    this.drill();
  }

  /**
   * 1806 foot (stats.formations): column for the march, line to fight, square when horsemen come
   * close; and the bayonets into an enemy that is close and wavering, or caught reloading.
   */
  drill() {
    const foes = this.game.world.stacksOf(enemyOf(this.faction)).filter((e) => e.alive);
    for (const s of this.myStacks()) {
      if (s.stats.cavalry && !s.stats.loose && !s.charging && s.ai.state !== AIState.RETREAT && s.morale > 0.6 && this.now > (s.chargeAgain ?? 0)) {
        // horsemen: a charge at foot that is out of square (best: in the open, on the flank, broken), then rally
        const prey = foes.filter((e) => e.usesCover && !e.stats.square && e.units.some((u) => u.alive && u.spotted) && Math.hypot(e.centroid.x - s.centroid.x, e.centroid.z - s.centroid.z) < 170)
          .sort((a, b) => (a.morale + (a.form === 'line' ? 0 : 0.3)) - (b.morale + (b.form === 'line' ? 0 : 0.3)))[0];
        if (prey && s.startCharge(prey)) s.chargeAgain = this.now + 40;
        continue;
      }
      if (!s.stats.formations || s.charging || s.ai.state === AIState.RETREAT) continue;
      const near = (r, test = () => true) => foes.filter((e) => test(e) && Math.hypot(e.centroid.x - s.centroid.x, e.centroid.z - s.centroid.z) < r);
      const marching = s.moveTarget && Math.hypot(s.moveTarget.x - s.centroid.x, s.moveTarget.z - s.centroid.z) > 70 && !near(160).length;
      const horse = near(110, (e) => e.stats.cavalry && !e.stats.loose).length > 0 || near(220, (e) => e.stats.cavalry && !!e.charging).length > 0; // (a charge comes on at the gallop: form in time)
      const want = horse ? 'square' : s.type.light ? 'skirmish' : marching ? 'column' : 'line';
      if (s.form !== want) { s.setForm(want); continue; }
      const close = near(45, (e) => e.usesCover && e.units.some((u) => u.alive && u.spotted))[0];
      if (close && !horse && s.morale > 0.5) {
        const reloading = close.units.filter((u) => u.alive && u.reloadT > 0).length > close.aliveCount * 0.5;
        if (close.morale < 0.55 || reloading) s.startCharge(close);
      }
    }
  }

  /** May this side go for point `p` now? */
  canTarget(p) {
    return !p.locked && (this.opts.targetable?.(p) ?? true);
  }

  myStacks() {
    return this.game.world.stacksOf(this.faction);
  }

  free(s) {
    const r = this.roles.get(s);
    return (!r || r.role === 'support') && s.ai.state !== AIState.RETREAT;
  }

  setPhase(op, phase) {
    op.phase = phase;
    op.since = this.now;
  }

  /** How many operations the army can run at once. */
  maxOps() {
    const n = this.myStacks().length;
    return n >= 16 ? 3 : n >= 9 ? 2 : 1;
  }

  // ---------------------------------------------------------------- economy & defence

  buy() {
    const kampf = doctrine(this.game, this.faction, 'kampf') && getUnitType('kampfgruppe'); // the NVA raises militia outside the cap
    if (kampf && this.myStacks().filter((s) => s.type.id === 'kampfgruppe').length < 4 && this.state.cp[this.faction] >= kampf.cost * 3) this.state.buy(this.faction, 'kampfgruppe');
    const mine = this.myStacks().filter((s) => !s.type.uncapped);
    if (mine.length >= this.state.maxStacks) return;
    const army = this.game.armyOf(this.faction);
    const cp = this.state.cp[this.faction];
    const allowed = (id) => !this.state.allow || this.state.allow(getUnitType(id));
    const capped = (id) => CAPS[id] !== undefined && mine.filter((s) => s.type.id === id).length >= CAPS[id];
    const squads = mine.filter((s) => ASSAULT.has(s.type.id)).length;
    const rifles = () => { if (cp >= unitCost(getUnitType('rifles'), army)) this.state.buy(this.faction, 'rifles'); };
    // a floor of men to take points with comes first…
    if (squads < 3 && allowed('rifles')) return rifles();
    // …then three kinds of purchase take turns: armour (while under its share of the fighting
    // stacks), rifle squads (while the line is short of men), and the build order (MGs, mortars,
    // guns, support). Each saves up for its own next item; the turn passes only once it has bought
    // — so the cheap squads never spend what the tank was being saved for.
    const fighting = mine.filter(fighter);
    const vehicles = fighting.filter((s) => VEHICLE.has(s.type.id)).length;
    const next = (order, key) => { // the next item of `order` that may be bought, from this[key]
      for (let tries = 0; tries < order.length; tries++) {
        const id = order[(this[key] ?? 0) % order.length];
        if (allowed(id) && !capped(id)) return id;
        this[key] = (this[key] ?? 0) + 1;
      }
      return null;
    };
    const kinds = [
      () => (vehicles < ARMOUR_SHARE * Math.max(fighting.length, 5) ? [next(ARMOUR_ORDER, 'armourIndex'), 'armourIndex'] : null),
      () => (squads < 3 + Math.ceil(this.points.length / 3) && allowed('rifles') ? ['rifles', null] : null),
      () => [next(BUILD_ORDER, 'buildIndex'), 'buildIndex'],
    ];
    for (let k = 0; k < kinds.length; k++) {
      const turn = ((this.buyTurn ?? 0) + k) % kinds.length;
      const [id, key] = kinds[turn]() ?? [];
      if (!id) continue; // nothing wanted of this kind now: the next kind's turn
      if (cp >= unitCost(getUnitType(id), army)) {
        this.state.buy(this.faction, id);
        if (key) this[key] = (this[key] ?? 0) + 1;
        this.buyTurn = turn + 1;
      }
      return; // bought, or saving up for it
    }
  }

  /** At night: a flare over enemies pressing one of our points (mortars carry a few). */
  illuminate() {
    if (!this.game.conditions?.night || this.now < (this.nextFlare ?? 0)) return;
    const mortar = this.myStacks().find((s) => s.flareRounds > 0 && !s.smokeOrder);
    if (!mortar) return;
    const foes = this.game.world.stacksOf(enemyOf(this.faction));
    const range = mortar.unitStats(0).range;
    for (const p of this.points) {
      if (p.owner !== this.faction && !p.contested) continue;
      const foe = foes.find((f) => Math.hypot(f.centroid.x - p.x, f.centroid.z - p.z) < 90 && Math.hypot(f.centroid.x - mortar.centroid.x, f.centroid.z - mortar.centroid.z) < range);
      if (!foe) continue;
      this.game.orders.run(this.faction, { t: 'flare', s: [mortar.id], x: foe.centroid.x, z: foe.centroid.z });
      this.nextFlare = this.now + 35 + Math.random() * 25;
      return;
    }
  }

  /** Send free infantry to neutral points nobody holds or is fighting over. */
  expand() {
    const foes = this.game.world.stacksOf(enemyOf(this.faction));
    const claimed = new Map();
    for (const [s, r] of this.roles) {
      if (r.role !== 'expand') continue;
      if (r.point.owner === this.faction) { this.roles.set(s, { role: 'garrison', point: r.point }); continue; } // taken: hold it
      if (r.point.owner || this.now > r.until) { this.roles.delete(s); continue; } // lost the race, or stuck
      claimed.set(r.point, s);
    }
    const owned = this.points.filter((p) => p.owner === this.faction);
    const fromUs = (p) => Math.min(...owned.map((q) => Math.hypot(q.x - p.x, q.z - p.z)), Infinity);
    const open = this.points
      .filter((p) => !p.owner && this.canTarget(p) && !claimed.has(p) && !foes.some((f) => Math.hypot(f.centroid.x - p.x, f.centroid.z - p.z) < 70))
      .sort((a, b) => fromUs(a) - fromUs(b));
    for (const p of open) {
      if (claimed.size >= MAX_EXPANDERS) return;
      const s = this.nearestFree(p, (st) => LINE.has(st.type.id));
      if (!s) return;
      this.roles.set(s, { role: 'expand', point: p, until: this.now + 150 });
      s.ai.moveTo(this.jitter(p, 5), { hold: true, ordered: false });
      claimed.set(p, s);
    }
  }

  /** How exposed a point is: distance to the nearest point we don't own (smaller = front). */
  frontness(p) {
    let d = Infinity;
    for (const q of this.points) if (q.owner !== this.faction) d = Math.min(d, Math.hypot(q.x - p.x, q.z - p.z));
    return d;
  }

  garrison() {
    // only exposed points get a garrison (rear ones would tie the whole army down). A side that
    // also attacks keeps most of its line free for that: only what the enemy is near, within a budget
    const attacking = this.opts.attack;
    const foes = this.game.world.stacksOf(enemyOf(this.faction));
    const enemyNear = (p) => Math.min(...foes.map((f) => Math.hypot(f.centroid.x - p.x, f.centroid.z - p.z)), Infinity);
    const rank = attacking ? enemyNear : (p) => this.frontness(p);
    const owned = this.points.filter((p) => p.owner === this.faction && this.frontness(p) < 240).sort((a, b) => rank(a) - rank(b));
    let budget = attacking ? Math.max(1, Math.floor(this.myStacks().filter((st) => LINE.has(st.type.id)).length * GARRISON_SHARE)) : Infinity;
    const wanted = new Map();
    owned.forEach((p, i) => {
      if (budget <= 0 || (attacking && i > 0 && !p.contested && enemyNear(p) > THREATENED)) return;
      const want = Math.min(budget, i === 0 && (!attacking || enemyNear(p) < 100) ? 2 : 1);
      budget -= want;
      wanted.set(p, want);
      const have = [...this.roles].filter(([, r]) => r.role === 'garrison' && r.point === p).length;
      for (let k = have; k < want; k++) {
        const s = this.nearestFree(p, (st) => LINE.has(st.type.id));
        if (!s) return;
        this.roles.set(s, { role: 'garrison', point: p });
        s.ai.moveTo(this.offsetTowardFront(p, 5 + k * 9), { hold: true, ordered: false });
      }
    });
    // re-dig garrisons that wandered off; release ones whose point is gone or no longer needs them
    const kept = new Map();
    for (const [s, r] of this.roles) {
      if (r.role === 'probe' && this.now > r.until) { this.roles.delete(s); continue; }
      if (r.role !== 'garrison') continue;
      if (r.point.owner !== this.faction && !r.point.contested) { this.roles.delete(s); continue; }
      kept.set(r.point, (kept.get(r.point) ?? 0) + 1);
      if (attacking && !r.point.contested && kept.get(r.point) > (wanted.get(r.point) ?? 0)) { this.roles.delete(s); continue; }
      if (s.ai.state === AIState.IDLE) s.ai.moveTo(this.offsetTowardFront(r.point, 6), { hold: true, ordered: false });
      else this.fortify(s);
    }
  }

  /** A settled, quiet garrison digs in: sandbags first, later a trench, facing the enemy. */
  fortify(s) {
    const done = s.fortifications ?? 0;
    const pace = this.opts.attack ? 1 : 0.5; // a side that only defends digs in faster
    if (done >= FORT.length || s.ai.state !== AIState.DEFEND || s.ai.defendTime < (done ? 40 + done * 20 : 20) * pace) return;
    if (s.units.some((u) => u.alive && u.threat)) return;
    const [kind, ahead, side] = FORT[done];
    const foeBase = this.game.world.bases[enemyOf(this.faction)];
    const yaw = Math.atan2(foeBase.x - s.anchor.x, foeBase.z - s.anchor.z);
    const x = s.anchor.x + Math.sin(yaw) * ahead + Math.cos(yaw) * side + (Math.random() - 0.5) * 4;
    const z = s.anchor.z + Math.cos(yaw) * ahead - Math.sin(yaw) * side;
    const cost = structureCost(this.game, this.faction, STRUCTURES[kind]);
    if (!this.game.spend(this.faction, cost)) return;
    if (!this.game.construction.place(kind, x, z, yaw, this.faction, s)) {
      this.game.refund(this.faction, cost);
      s.fortifications = done + 1; // bad ground; don't keep trying here
    }
  }

  respond() {
    for (const [s, r] of this.roles) {
      if (r.role === 'strike' && !r.op && (this.now > r.until || r.point.owner !== this.faction || Math.abs(r.point.progress) >= 1)) this.roles.delete(s);
    }
    for (const p of this.points) {
      if (p.owner !== this.faction || (!p.contested && Math.abs(p.progress) >= 1)) continue; // (an empty point being taken isn't "contested")
      if ([...this.roles].some(([, r]) => r.role === 'strike' && r.point === p)) continue; // help is on the way
      const helper = this.nearestFree(p, fighter);
      if (!helper) continue;
      const foe = this.game.world.nearestEnemyGroup(p, this.faction, p.radius * 3);
      this.roles.set(helper, { role: 'strike', point: p, until: this.now + HELP_TIME });
      if (foe) helper.ai.attack(foe, { ordered: false });
      else helper.ai.moveTo(p, { ordered: false, hold: helper.usesCover });
    }
  }

  /** Guns, radars, ambulances and the like stand behind the line, where their reach covers it. */
  support() {
    const owned = this.points.filter((p) => p.owner === this.faction);
    if (!owned.length) return;
    const front = owned.reduce((a, b) => (this.frontness(b) < this.frontness(a) ? b : a));
    for (const s of this.myStacks()) {
      if (fighter(s) || OWN_ROLE.has(s.type.id) || s.stats.observer || s.stats.structure || s.autonomous || !this.free(s)) continue;
      const r = this.roles.get(s);
      if (r && this.now < r.until) continue;
      // what has to set up (towed guns and rockets, radars, command posts, smoke generators) is
      // left where it stands unless the front has moved well away: every move is a pack-up
      const settles = !!(s.stats.towed || s.deploySeconds);
      this.roles.set(s, { role: 'support', point: front, until: this.now + (settles ? 180 : 60) });
      const stand = s.stats.indirect ? Math.max(50, Math.min(140, s.unitStats(0).range * 0.45)) : 90;
      const spot = this.offsetTowardBase(front, stand);
      if (Math.hypot(s.anchor.x - spot.x, s.anchor.z - spot.z) > (settles ? 150 : 60)) s.ai.moveTo(this.jitter(spot, 15), { hold: s.usesCover, ordered: false });
    }
  }

  // ---------------------------------------------------------------- offensives

  offensive() {
    this.probe();
    for (const op of [...this.ops]) this.runOp(op);
    if (this.now < this.nextOffensive || this.ops.length >= this.maxOps()) return;
    const plan = this.makePlan(this.ops.map((o) => o.plan.target.sector ?? 'all'));
    if (!plan) { this.nextOffensive = this.now + 30; return; }
    const op = { phase: 'stage', since: this.now, plan };
    this.ops.push(op);
    for (const s of plan.group) {
      this.roles.set(s, { role: 'strike', point: plan.target, op });
      const base = this.baseOfFire(s);
      s.ai.moveTo(this.jitter(base ? plan.support : plan.stage, base ? 6 : 10), { hold: s.usesCover, ordered: false });
    }
    this.nextOffensive = this.now + rand(OP_GAP) * this.tempo; // the next operation can open on another axis
  }

  runOp(op) {
    const plan = op.plan;
    const group = plan.group.filter((s) => s.alive && this.roles.get(s)?.op === op); // not the ones pulled out hurt
    const t = plan.target;
    switch (op.phase) {
      case 'stage': {
        const gathered = group.every((s) => {
          const at = this.baseOfFire(s) ? plan.support : plan.stage;
          return Math.hypot(s.anchor.x - at.x, s.anchor.z - at.z) < 30 || s.ai.state === AIState.DEFEND;
        });
        if (!gathered && this.now - op.since < 70) return;
        this.game.air.call(this.faction, t.x, t.z); // a strafing run ahead of the assault (if affordable and ready)
        if (doctrine(this.game, this.faction, 'mass') && this.game.barrage.ready(this.faction) && this.state.cp[this.faction] > 300) this.game.barrage.call(this.faction, t.x, t.z); // the Soviet preparatory barrage
        for (const s of this.myStacks()) if (s.stats.indirect && !s.barrage) s.startBarrage(t.x, t.z); // the NVA's Feuerwalze (others: nothing)
        if (this.state.cp[this.faction] > 450) {
          const lz = this.offsetTowardBase(t, 35);
          this.game.air.call(this.faction, lz.x, lz.z, null, 'lift'); // and a squad landed right behind it
        }
        op.breach = this.breach(op, group, plan.stage, t);  // its smoke first: the mortars it takes are busy
        op.smoked = this.screenAssault(group.filter((s) => !this.baseOfFire(s)), t);
        this.setPhase(op, 'prep');
        return;
      }
      case 'prep': {
        if (op.smoked && this.now - op.since < SMOKE_SETTLE) return; // let the screen build up first
        if (op.breach) {
          // the engineers are cutting a lane: wait for it, a minute at most
          const left = op.breach.obstacles.filter((ob) => this.game.construction.obstacles.includes(ob));
          if (left.length && op.breach.stack.alive && this.now - op.since < BREACH_WAIT) {
            if (!left.includes(op.breach.current)) this.clearNext(op.breach, left[0]); // that one's gone: the next
            return;
          }
          op.breach = null;
        }
        this.game.bus.emit('toast', `Enemy assault on ${t.name}!`);
        for (const s of group) if (!this.baseOfFire(s)) this.goIn(s, t); // (the MGs stay on the line, shooting the defenders down)
        this.lastAssault = this.now;
        plan.startStrength = group.reduce((a, s) => a + strength(s), 0); // measured from who actually goes in
        op.nextWave = this.now + WAVE_EVERY;
        this.setPhase(op, 'assault');
        return;
      }
      case 'assault': {
        const left = group.reduce((a, s) => a + strength(s), 0);
        const taking = group.some((s) => s.usesCover && s.units.some((u) => u.alive && Math.hypot(u.pos.x - t.x, u.pos.z - t.z) < t.radius));
        const time = this.now - op.since;
        if (t.owner === this.faction) {
          this.setPhase(op, 'consolidate');
        } else if (!group.length || time > ASSAULT_MAX || (!taking && (left < plan.startStrength * 0.4 || time > ASSAULT_TIME))) {
          // failed: fall back to the staging area under smoke and regroup
          this.coverWithdrawal(group, t);
          for (const s of group) s.ai.moveTo(this.jitter(plan.stage, 10), { hold: s.usesCover, ordered: false });
          this.endOp(op);
        } else {
          this.keepGoing(op, group, t);
        }
        this.lastAssault = this.now;
        return;
      }
      case 'consolidate':
        if (this.now - op.since > 45) {
          // the infantry that took it stays as its garrison
          for (const s of group) if (s.usesCover) this.roles.set(s, { role: 'garrison', point: t });
          this.endOp(op);
        }
        return;
    }
  }

  /** Into the objective: squads run for the point and dig in on it, vehicles fight whoever defends it. */
  goIn(s, t) {
    if (s.usesCover) {
      s.ai.moveTo(this.jitter(t, 5), { hold: true, ordered: true }); // (ordered: they get up and sprint under fire)
      return;
    }
    const foe = this.game.world.nearestEnemyGroup(t, this.faction, 70);
    if (foe) s.ai.attack(foe, { ordered: true });
    else s.ai.moveTo(this.offsetTowardBase(t, 18), { ordered: false });
  }

  /** The assault presses on: whoever stopped short goes again, and fresh squads follow in waves. */
  keepGoing(op, group, t) {
    for (const s of group) {
      if (this.baseOfFire(s) || s.stats.engineer || s.ai.state === AIState.RETREAT || s.ai.state === AIState.MOVE) continue;
      if (s.usesCover ? Math.hypot(s.anchor.x - t.x, s.anchor.z - t.z) > t.radius - 4 : s.ai.state !== AIState.ATTACK) this.goIn(s, t);
    }
    if (this.now < op.nextWave) return;
    op.nextWave = this.now + WAVE_EVERY;
    const wave = this.nearestFree(t, (s) => ASSAULT.has(s.type.id));
    if (!wave) return;
    this.roles.set(wave, { role: 'strike', point: t, op });
    op.plan.group.push(wave);
    op.plan.startStrength += strength(wave);
    this.goIn(wave, t);
  }

  endOp(op) {
    for (const [s, r] of this.roles) if (r.role === 'strike' && r.op === op) this.roles.delete(s);
    this.ops.splice(this.ops.indexOf(op), 1);
    if (!this.ops.length) this.nextOffensive = Math.max(this.nextOffensive, this.now + rand(LULL) * this.tempo);
  }

  /**
   * Choose a target point (not in a sector already under attack) and a group for it. The group
   * is the free stacks nearest the target, enough for superiority, but never more than about
   * two thirds of the free strength — the rest stays for the next operation and for defence.
   */
  makePlan(busySectors = []) {
    const foe = enemyOf(this.faction);
    const theirStacks = this.game.world.stacksOf(foe);
    const near = (p, r) => theirStacks.filter((s) => Math.hypot(s.centroid.x - p.x, s.centroid.z - p.z) < r).reduce((a, s) => a + strength(s), 0);
    const owned = this.points.filter((p) => p.owner === this.faction);
    const from = owned.length ? owned : [this.game.world.bases[this.faction]]; // holding nothing (King of the Hill): from home
    const frontierDist = (p) => Math.min(...from.map((q) => Math.hypot(q.x - p.x, q.z - p.z)));

    // the nearest few points we don't own in free sectors; pick the most weakly held
    const candidates = this.points.filter((p) => p.owner !== this.faction && this.canTarget(p) && !busySectors.includes(p.sector ?? 'all'))
      .sort((a, b) => frontierDist(a) - frontierDist(b))
      .slice(0, 3)
      .map((p) => ({ p, defence: near(p, 80) + Math.random() * 60 }))
      .sort((a, b) => a.defence - b.defence);
    const { p: target, defence } = candidates[0] ?? {};
    if (!target) return null;
    const front = [...from].sort((a, b) => Math.hypot(a.x - target.x, a.z - target.z) - Math.hypot(b.x - target.x, b.z - target.z))[0];

    // the group: squads to take it first (no squads, no assault), then whoever fights nearest
    const free = this.myStacks().filter((s) => this.free(s) && fighter(s))
      .sort((a, b) => Math.hypot(a.centroid.x - target.x, a.centroid.z - target.z) - Math.hypot(b.centroid.x - target.x, b.centroid.z - target.z));
    const squads = free.filter((s) => ASSAULT.has(s.type.id));
    if (squads.length < MIN_ASSAULT) return null;
    const total = free.reduce((a, s) => a + strength(s), 0);
    // the longer since its last assault, the less superiority it waits for and the more it commits
    // (two thirds of what's free at first, the rest for other axes; with one objective, everything)
    const nerve = Math.max(NERVE.least, NERVE.start - ((this.now - this.lastAssault) / NERVE.per) * 0.3);
    const share = this.points.length <= 2 ? 1 : 0.67 + (NERVE.start - nerve) * 0.55;
    const group = squads.slice(0, MIN_ASSAULT);
    let ours = group.reduce((a, s) => a + strength(s), 0);
    for (const s of free) {
      if (group.includes(s)) continue;
      if (ours >= defence * 1.5 + 200 || ours + strength(s) > total * share) break;
      group.push(s);
      ours += strength(s);
    }
    if (ours < defence * nerve) return null;

    // stage on a flank: perpendicular to the front→target line, on the weaker side
    const dx = target.x - front.x;
    const dz = target.z - front.z;
    const d = Math.hypot(dx, dz) || 1;
    const px = -dz / d;
    const pz = dx / d;
    const sideCost = (k) => near({ x: target.x + px * 45 * k, z: target.z + pz * 45 * k }, 50);
    const side = sideCost(1) < sideCost(-1) ? 1 : -1;
    const stage = this.game.world.clampToBounds({
      x: target.x + px * 48 * side - (dx / d) * 38,
      z: target.z + pz * 48 * side - (dz / d) * 38,
    });
    // the base of fire: on the direct line from our front, short of the objective
    const support = this.game.world.clampToBounds({ x: target.x - (dx / d) * 60, z: target.z - (dz / d) * 60 });
    return { target, stage, support, group, startStrength: ours };
  }

  /** Send a marksman or MG team to overwatch ground ahead of the line for a while. */
  probe() {
    if (this.now < this.nextProbe) return;
    this.nextProbe = this.now + rand(PROBE_EVERY) * this.tempo;
    if (Math.random() < 0.35 && this.harass()) return;
    // a random exposed point of ours (so probes come from every sector), toward its nearest unowned point
    const exposed = this.points.filter((p) => p.owner === this.faction).sort((a, b) => this.frontness(a) - this.frontness(b)).slice(0, 3);
    const front = exposed[Math.floor(Math.random() * exposed.length)];
    const target = this.points.filter((p) => p.owner !== this.faction)
      .sort((a, b) => Math.hypot(a.x - (front?.x ?? 0), a.z - (front?.z ?? 0)) - Math.hypot(b.x - (front?.x ?? 0), b.z - (front?.z ?? 0)))[0];
    if (!front || !target) return;
    const scout = this.nearestFree(front, (s) => s.type.id === 'scouts') ?? this.nearestFree(front, (s) => s.type.id === 'mgTeam');
    if (!scout) return;
    const k = 0.35 + Math.random() * 0.2;
    const spot = { x: front.x + (target.x - front.x) * k + (Math.random() - 0.5) * 40, z: front.z + (target.z - front.z) * k };
    this.roles.set(scout, { role: 'probe', point: front, until: this.now + rand([80, 120]) });
    scout.ai.moveTo(this.game.world.clampToBounds(spot), { hold: true, ordered: false });
  }

  /** Mortars lay smoke on the far side of the approach, between the assault and the objective. */
  screenAssault(group, t) {
    const n = group.length || 1;
    const cx = group.reduce((a, s) => a + s.anchor.x, 0) / n;
    const cz = group.reduce((a, s) => a + s.anchor.z, 0) / n;
    const d = Math.hypot(t.x - cx, t.z - cz) || 1;
    return this.smokeAt(t.x - ((t.x - cx) / d) * 22, t.z - ((t.z - cz) / d) * 22);
  }

  /** Smoke from every mortar in range on (x, z). Did any take the order? */
  smokeAt(x, z) {
    let any = false;
    for (const s of this.game.world.stacksOf(this.faction)) {
      if (s.smokeRounds > 0 && !s.smokeOrder && Math.hypot(s.centroid.x - x, s.centroid.z - z) < s.unitStats(0).range) {
        s.smokeOrder = { x, z, left: 3 };
        any = true;
      }
    }
    return any;
  }

  /** A beaten assault: mortar smoke between the objective and the group, vehicles pop theirs. */
  coverWithdrawal(group, t) {
    const n = group.length || 1;
    const cx = group.reduce((a, s) => a + s.anchor.x, 0) / n;
    const cz = group.reduce((a, s) => a + s.anchor.z, 0) / n;
    this.smokeAt(cx + (t.x - cx) * 0.4, cz + (t.z - cz) * 0.4);
    for (const s of group) if (s.stats.smoke && s.smokeLeft > 0) this.game.orders.run(this.faction, { t: 'popSmoke', s: [s.id] });
  }

  /**
   * Obstacles of the enemy's on the way from `stage` to `target` that this side knows of — wire
   * (plain to see) and minefields that have been found — and engineers to clear them: the
   * group's own, or the nearest free ones. Sets the clearing jobs going under mortar smoke.
   * Returns { obstacles, stack } or null.
   */
  breach(op, group, stage, target) {
    const c = this.game.construction;
    const dx = target.x - stage.x;
    const dz = target.z - stage.z;
    const len2 = dx * dx + dz * dz || 1;
    const nearPath = (ob) => {
      const k = Math.max(0, Math.min(1, ((ob.x - stage.x) * dx + (ob.z - stage.z) * dz) / len2));
      return Math.hypot(stage.x + dx * k - ob.x, stage.z + dz * k - ob.z) < 14 + Math.max(ob.hx, ob.hz);
    };
    const obstacles = c.obstacles.filter((ob) => ob.faction !== this.faction && (ob.kind === 'wire' || ob.revealed) && nearPath(ob));
    if (!obstacles.length) return null;
    let eng = group.find((s) => s.stats.engineer && s.alive);
    if (!eng) {
      eng = this.nearestFree(obstacles[0], (s) => s.stats.engineer);
      if (!eng) return null;
      this.roles.set(eng, { role: 'strike', point: target, op });
      op.plan.group.push(eng);
    }
    // nearest first, one at a time (a job walks the engineers to it: clearNext)
    obstacles.sort((a, b) => Math.hypot(a.x - stage.x, a.z - stage.z) - Math.hypot(b.x - stage.x, b.z - stage.z));
    const b = { obstacles, stack: eng, yaw: Math.atan2(dx, dz), target };
    this.clearNext(b, obstacles[0]);
    return b;
  }

  /** The engineers onto obstacle `ob`, under smoke between it and the guns covering it. */
  clearNext(b, ob) {
    b.current = ob;
    this.game.construction.place('clear', ob.x, ob.z, b.yaw, this.faction, b.stack, { force: true });
    this.smokeAt(ob.x + (b.target.x - ob.x) * 0.3, ob.z + (b.target.z - ob.z) * 0.3);
  }

  /** Goes in as the base of fire rather than with the assault. */
  baseOfFire(s) {
    return s.type.id === 'mgTeam';
  }

  // ---------------------------------------------------------------- observers & casualties

  /**
   * Forward observers onto ground that sees what matters most right now: a point of ours under
   * attack, else the objective of a running assault, else the enemy point facing our most exposed
   * one. Our guns fire on whatever the side spots; an observer who sees the spot makes them land
   * far tighter there.
   */
  observe() {
    const focus = this.points.find((p) => p.owner === this.faction && p.contested)
      ?? this.ops.find((o) => o.phase !== 'consolidate')?.plan.target
      ?? this.facing();
    if (!focus) return;
    for (const s of this.myStacks()) {
      if (!s.stats.observer || s.ai.state === AIState.RETREAT) continue;
      const r = this.roles.get(s);
      if (r && !['observe', 'garrison', 'expand', 'probe'].includes(r.role)) continue; // hurt, or in an assault
      if (r?.role === 'observe' && (r.point === focus ? this.now < r.until : this.now < r.since + 45)) continue; // don't chase every flicker
      const spot = this.lookout(s, focus);
      this.roles.set(s, { role: 'observe', point: focus, spot, since: this.now, until: this.now + 60 });
      s.ai.moveTo(spot, { hold: true, ordered: false });
    }
  }

  /** The enemy-held point nearest our most exposed one. */
  facing() {
    const front = this.points.filter((p) => p.owner === this.faction).sort((a, b) => this.frontness(a) - this.frontness(b))[0];
    if (!front) return null;
    return this.points.filter((p) => p.owner !== this.faction)
      .sort((a, b) => Math.hypot(a.x - front.x, a.z - front.z) - Math.hypot(b.x - front.x, b.z - front.z))[0] ?? null;
  }

  /**
   * Where an observer team should lie to watch `p`: about 70 % of its sight away, on our side,
   * with a clear view of the ground there and no enemy close by — the higher the better.
   */
  lookout(s, p) {
    const world = this.game.world;
    const terrain = world.terrain;
    const base = world.bases[this.faction];
    const home = Math.atan2(base.x - p.x, base.z - p.z);
    const r = s.stats.sight * 0.7;
    const foes = world.stacksOf(enemyOf(this.faction));
    const gy = terrain.heightAt(p.x, p.z);
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      const a = home + (i - 4) * 0.3;
      const spot = world.clampToBounds({ x: p.x + Math.sin(a) * r, z: p.z + Math.cos(a) * r });
      const y = terrain.heightAt(spot.x, spot.z);
      let score = y - Math.abs(i - 4) * 0.5;
      if (!terrain.lineOfSight(spot.x, y + 1, spot.z, p.x, gy + 1, p.z)) score -= 100;
      if (foes.some((f) => Math.hypot(f.centroid.x - spot.x, f.centroid.z - spot.z) < 45)) score -= 60;
      if (score > bestScore) { bestScore = score; best = spot; }
    }
    return best;
  }

  /**
   * Stacks with most of their men (or vehicles) badly hurt pull out — to a field ambulance or
   * recovery vehicle if we have one (systems/Support.js patches them up), else back toward our
   * base — and rejoin the pool once fit or after a while. A garrison holds on while its point is
   * being fought for, unless it is nearly gone.
   */
  casualties() {
    const mine = this.myStacks();
    for (const [s, r] of this.roles) {
      if (r.role === 'recover' && (this.now > r.until || hurtShare(s) < 0.2)) {
        this.roles.delete(s);
        s.recoveredAt = this.now;
      }
    }
    for (const s of mine) {
      const r = this.roles.get(s);
      if (r?.role === 'recover' || s.stats.heal || s.stats.repair || s.stats.structure || s.ai.state === AIState.RETREAT) continue;
      if (this.now - (s.recoveredAt ?? -Infinity) < RECOVER_AGAIN || hurtShare(s) < 0.5) continue;
      if (r?.role === 'garrison' && r.point.contested && s.hpRatio > 0.25) continue;
      if (r?.op?.phase === 'assault' && s.hpRatio > 0.25) continue; // nobody walks out of an assault with a scratch
      const fixer = mine.find((o) => o.alive && (s.usesCover ? o.stats.heal : o.stats.repair));
      const to = fixer ? this.jitter(fixer.centroid, 6) : this.offsetTowardBase(s.centroid, 60);
      this.roles.set(s, { role: 'recover', until: this.now + (fixer ? 120 : 50) });
      s.ai.moveTo(this.game.world.clampToBounds(to), { hold: s.usesCover, ordered: false });
      if (fixer && !fixer.working) fixer.ai.moveTo(this.jitter(s.centroid, 8), { ordered: false });
    }
  }

  /** Send the helicopter at a spotted, entrenched enemy position near our front (and fighters up when enemy aircraft come). */
  harass() {
    const air = this.game.air;
    // the jets: a gun run on spotted enemy armour near our front
    if (air.ready(this.faction, 'jet') && this.state.cp[this.faction] >= 340) {
      const armour = this.game.world.stacksOf(enemyOf(this.faction)).filter((s) => !s.usesCover && !s.stats.structure
        && s.units.some((u) => u.alive && u.spotted)
        && this.points.some((p) => p.owner === this.faction && Math.hypot(s.centroid.x - p.x, s.centroid.z - p.z) < 200));
      if (armour.length) {
        const t = armour[Math.floor(Math.random() * armour.length)];
        if (air.call(this.faction, t.centroid.x, t.centroid.z, null, 'jet')) return true;
      }
    }
    // enemy strike aircraft over the field: fighters up over our nearest point
    const raid = air.sorties.find((s) => s.faction !== this.faction && s.airborne && s.kind !== 'cap');
    if (raid && air.ready(this.faction, 'cap') && this.state.cp[this.faction] >= 260) {
      const near = this.points.filter((p) => p.owner === this.faction).sort((a, b) => Math.hypot(a.x - raid.target.x, a.z - raid.target.z) - Math.hypot(b.x - raid.target.x, b.z - raid.target.z))[0];
      if (near && air.call(this.faction, near.x, near.z, null, 'cap')) return true;
    }
    if (!air.ready(this.faction) || this.state.cp[this.faction] < 260) return false;
    const front = this.points.filter((p) => p.owner === this.faction).sort((a, b) => this.frontness(a) - this.frontness(b))[0];
    if (!front) return false;
    const targets = this.game.world.stacksOf(enemyOf(this.faction)).filter((s) => s.usesCover
      && s.units.some((u) => u.alive && u.spotted)
      && Math.hypot(s.centroid.x - front.x, s.centroid.z - front.z) < 160
      && (s.dugIn || s.ai.state === AIState.DEFEND));
    if (!targets.length) return false;
    const t = targets[Math.floor(Math.random() * targets.length)];
    return air.call(this.faction, t.centroid.x, t.centroid.z);
  }

  // ---------------------------------------------------------------- helpers

  nearestFree(p, filter) {
    let best = null;
    let bestD = Infinity;
    for (const s of this.myStacks()) {
      if (!this.free(s) || !filter(s)) continue;
      const d = Math.hypot(s.centroid.x - p.x, s.centroid.z - p.z);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  jitter(p, r) {
    return { x: p.x + (Math.random() - 0.5) * r * 2, z: p.z + (Math.random() - 0.5) * r * 2 };
  }

  offsetTowardFront(p, dist) {
    const base = this.game.world.bases[this.faction];
    const dx = p.x - base.x;
    const dz = p.z - base.z;
    const d = Math.hypot(dx, dz) || 1;
    return { x: p.x + (dx / d) * dist + (Math.random() - 0.5) * 6, z: p.z + (dz / d) * dist };
  }

  offsetTowardBase(p, dist) {
    return this.offsetTowardFront(p, -dist);
  }
}
