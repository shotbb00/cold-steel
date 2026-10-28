// Strategic AI for a bot faction in Frontline mode. It plays defensively and in phases, so a
// battle breathes: long quiet stretches of sporadic shots between deliberate offensives.
//
//   build       regroup and reinforce (≈1.5–2.5 min). Garrisons dig in on its exposed points
//               (the most exposed doubled); now and then a scout or MG team is sent forward to
//               an overwatch spot to probe — that's where single shots ring out.
//   plan        pick the target: among the nearest points it doesn't own, in a sector where it
//               isn't already attacking, the one you hold most weakly. Attack only with 30 %
//               local superiority, otherwise keep building.
//   stage       move the strike group to a flank — off the direct line, on the side where
//               you are weaker — and gather there.
//   assault     go in from that angle: infantry takes and digs into the point, armour hunts
//               whatever defends it.
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
// Options (other modes): attack (launch offensives), buy (spend CP), expand (claim neutral
// points), targetable(point) (which points it may go for), firstAssault (s). Locked points
// (point.locked) are never targeted.
import { AIState } from './StackAI.js';
import { getUnitType } from '../data/units/index.js';
import { enemyOf } from '../data/factions.js';
import { STRUCTURES } from '../systems/Construction.js';

const THINK = 4;
const BUILD_ORDER = [
  'rifles', 'scouts', 'mgTeam', 'atTeam', 'engineers', 'mortar', 'ifv', 'observers', 'artillery', 'rifles', 'tank', 'manpads',
  'reconVehicle', 'aa', 'mgTeam', 'tankDestroyer', 'ifv', 'spMortar', 'ambulance', 'atTeam', 'heavyTank', 'rifles', 'recovery',
  'rockets', 'sam', 'tank',
];
const CAPS = {
  tank: 2, mgTeam: 3, atTeam: 3, artillery: 1, aa: 1, mortar: 2, ifv: 2, scouts: 2, engineers: 1, observers: 1, manpads: 2,
  reconVehicle: 1, tankDestroyer: 1, spMortar: 1, ambulance: 1, heavyTank: 1, recovery: 1, rockets: 1, sam: 1,
};
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
    if (this.opts.attack) this.offensive();
    else this.probe();
  }

  /** May this side go for point `p` now? */
  canTarget(p) {
    return !p.locked && (this.opts.targetable?.(p) ?? true);
  }

  myStacks() {
    return this.game.world.stacksOf(this.faction);
  }

  free(s) {
    return !this.roles.has(s) && s.ai.state !== AIState.RETREAT;
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
    const mine = this.myStacks();
    if (mine.length >= this.state.maxStacks) return;
    for (let tries = 0; tries < BUILD_ORDER.length; tries++) {
      const id = BUILD_ORDER[this.buildIndex % BUILD_ORDER.length];
      const barred = this.state.allow && !this.state.allow(getUnitType(id)); // e.g. infantry only
      const capped = barred || (CAPS[id] !== undefined && mine.filter((s) => s.type.id === id).length >= CAPS[id]);
      if (capped) { this.buildIndex++; continue; }
      if (this.state.cp[this.faction] >= getUnitType(id).cost) {
        this.state.buy(this.faction, id);
        this.buildIndex++;
      }
      return; // save up for the next item in the order
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
      const s = this.nearestFree(p, (st) => st.usesCover && st.type.id !== 'scouts');
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
    // only exposed points get a garrison (rear ones would tie the whole army down)
    const owned = this.points.filter((p) => p.owner === this.faction && this.frontness(p) < 240).sort((a, b) => this.frontness(a) - this.frontness(b));
    owned.forEach((p, i) => {
      const want = i === 0 ? 2 : 1;
      const have = [...this.roles].filter(([, r]) => r.role === 'garrison' && r.point === p).length;
      for (let k = have; k < want; k++) {
        const s = this.nearestFree(p, (st) => st.usesCover);
        if (!s) return;
        this.roles.set(s, { role: 'garrison', point: p });
        s.ai.moveTo(this.offsetTowardFront(p, 5 + k * 9), { hold: true, ordered: false });
      }
    });
    // re-dig garrisons that wandered off; release ones whose point is gone
    for (const [s, r] of this.roles) {
      if (r.role === 'probe' && this.now > r.until) { this.roles.delete(s); continue; }
      if (r.role !== 'garrison') continue;
      if (r.point.owner !== this.faction && !r.point.contested) { this.roles.delete(s); continue; }
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
    if (!this.game.spend(this.faction, STRUCTURES[kind].cost)) return;
    if (!this.game.construction.place(kind, x, z, yaw, this.faction, s)) {
      this.game.refund(this.faction, STRUCTURES[kind].cost);
      s.fortifications = done + 1; // bad ground; don't keep trying here
    }
  }

  respond() {
    for (const p of this.points) {
      if (p.owner !== this.faction || !p.contested) continue;
      if ([...this.roles].some(([, r]) => r.role === 'strike' && r.point === p)) continue; // help is on the way
      const helper = this.nearestFree(p, () => true);
      if (!helper) continue;
      const foe = this.game.world.nearestEnemyGroup(p, this.faction, p.radius * 3);
      this.roles.set(helper, { role: 'strike', point: p });
      if (foe) helper.ai.attack(foe, { ordered: false });
      else helper.ai.moveTo(p, { ordered: false, hold: helper.usesCover });
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
        for (const s of group) {
          if (this.baseOfFire(s)) continue; // stays on the line, shooting the defenders down
          if (s.usesCover) s.ai.moveTo(this.jitter(t, 6), { hold: true, ordered: false }); // take it and dig in
          else {
            const foe = this.game.world.nearestEnemyGroup(t, this.faction, 100);
            if (foe) s.ai.attack(foe, { ordered: false });
            else s.ai.moveTo(this.offsetTowardBase(t, 25), { ordered: false });
          }
        }
        this.setPhase(op, 'assault');
        return;
      }
      case 'assault': {
        const left = group.reduce((a, s) => a + strength(s), 0);
        if (t.owner === this.faction) {
          this.setPhase(op, 'consolidate');
        } else if (left < plan.startStrength * 0.4 || this.now - op.since > 170 || !group.length) {
          // failed: fall back to the staging area under smoke and regroup
          this.coverWithdrawal(group, t);
          for (const s of group) s.ai.moveTo(this.jitter(plan.stage, 10), { hold: s.usesCover, ordered: false });
          this.endOp(op);
        }
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
    if (!owned.length) return null;
    const frontierDist = (p) => Math.min(...owned.map((q) => Math.hypot(q.x - p.x, q.z - p.z)));

    // the nearest few points we don't own in free sectors; pick the most weakly held
    const candidates = this.points.filter((p) => p.owner !== this.faction && this.canTarget(p) && !busySectors.includes(p.sector ?? 'all'))
      .sort((a, b) => frontierDist(a) - frontierDist(b))
      .slice(0, 3)
      .map((p) => ({ p, defence: near(p, 80) + Math.random() * 60 }))
      .sort((a, b) => a.defence - b.defence);
    const { p: target, defence } = candidates[0] ?? {};
    if (!target) return null;
    const front = owned.sort((a, b) => Math.hypot(a.x - target.x, a.z - target.z) - Math.hypot(b.x - target.x, b.z - target.z))[0];

    const free = this.myStacks().filter((s) => this.free(s))
      .sort((a, b) => Math.hypot(a.centroid.x - target.x, a.centroid.z - target.z) - Math.hypot(b.centroid.x - target.x, b.centroid.z - target.z));
    const total = free.reduce((a, s) => a + strength(s), 0);
    const group = [];
    let ours = 0;
    for (const s of free) {
      if (ours >= defence * 1.5 + 200 || (group.length >= 2 && ours + strength(s) > total * 0.67)) break;
      group.push(s);
      ours += strength(s);
    }
    if (group.length < 2 || ours < defence * 1.3) return null;

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
    const scout = this.nearestFree(front, (s) => s.type.id === 'scouts')
      ?? this.nearestFree(front, (s) => s.type.id === 'atTeam' || s.type.id === 'mgTeam')
      ?? this.nearestFree(front, (s) => s.usesCover);
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
      const fixer = mine.find((o) => o.alive && (s.usesCover ? o.stats.heal : o.stats.repair));
      const to = fixer ? this.jitter(fixer.centroid, 6) : this.offsetTowardBase(s.centroid, 60);
      this.roles.set(s, { role: 'recover', until: this.now + (fixer ? 120 : 50) });
      s.ai.moveTo(this.game.world.clampToBounds(to), { hold: s.usesCover, ordered: false });
      if (fixer && !fixer.working) fixer.ai.moveTo(this.jitter(s.centroid, 8), { ordered: false });
    }
  }

  /** Send the helicopter at a spotted, entrenched enemy position near our front. */
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
