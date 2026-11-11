// The host's side of a multiplayer battle. The host's browser runs the whole simulation, for
// both sides, exactly as in single player; this module:
//   • runs the client's orders (core/Orders.js) for the client's faction at the start of a step
//   • streams the battle to the client: 15 binary snapshots a second of every unit and
//     helicopter (net/protocol.js), 4 state updates a second (squad states, CP, points,
//     blueprints, cooldowns), and the step's events — new and removed stacks, structures,
//     collapses, smoke screens, callouts, messages meant for the client's side
//   • records what the simulation shows and plays — muzzle flashes, impacts on the helicopters,
//     mine blasts, gunfire and other sounds, and every round fired — and sends those calls too, so
//     the client sees and hears the same battle. Rounds fly on the client as well (cosmetic: they
//     strike and burst there, but only the host's do damage). What renderers and the projectile
//     flight produce is left out of the recording: the client's own renderers and rounds make it.
import { encodeSnapshot, posScale, packArgs, v3, dir3, SNAPSHOT_RATE, STATE_RATE } from './protocol.js';
import { enemyOf } from '../data/factions.js';

const DEPLOY_CLOCK = -1e4; // deployment snapshots' clock (s): below any battle time

export const FX_CALLS = ['impact', 'dust', 'muzzle', 'explosion', 'trail', 'burn', 'weld', 'tend', 'powderBank']; // (new ones go at the end: the client looks them up by index)
export const SOUND_CALLS = ['play', 'weapon'];

const r2 = (n) => Math.round(n * 100) / 100;

export class NetHost {
  /** Position steps per metre in the snapshots: what fits this map (net/protocol.js posScale). */
  get posQ() { const b = this.game.world.bounds; return (this._posQ ??= posScale(Math.max(b.x, b.z) + 200)); }

  constructor(game, link) {
    this.game = game;
    this.link = link;
    this.isHost = true;
    this.isClient = false;
    this.remoteFaction = game.coop ? game.playerFaction : enemyOf(game.playerFaction);
    this.events = [];
    this.recording = false;   // inside the simulation part of a step
    this.muteDepth = 0;       // >0: projectile flight, renderers — not recorded
    this.callDepth = 0;       // calls made from inside a recorded call aren't recorded again
    this.orders = [];
    this.ready = false;       // the client has built its world and is listening
    this.snapT = 0;
    this.stateT = 0;

    this.wrap(game.effects, FX_CALLS, 'f');
    this.wrap(game.audio, SOUND_CALLS, 'a');
    this.wrapProjectiles();
    this.wrapSmoke();
    game.bus.on('bark', ({ unit, stack, text, priority }) => this.event('bark', stack.id, unit.index, text, priority ? 1 : 0));
    game.bus.on('stack:destroyed', (s) => this.event('dead', s.id));
    game.bus.on('stack:removed', (s) => this.event('removed', s.id));

    link.on('ready', () => this.start());
    link.on('order', (m) => this.orders.push(m.o));
    link.on('deploy-ready', () => { const d = game.deployment; if (d?.on) { d.ready.guest = true; d.maybeGo(); } });
    link.on('bye', () => this.peerLeft());
    link.onClose(() => this.peerLeft());
  }

  // ---------------------------------------------------------------- recording

  wrap(target, names, tag) {
    names.forEach((name, i) => {
      const call = target[name].bind(target);
      target[name] = (...args) => {
        if (this.recording && this.muteDepth === 0 && this.callDepth === 0) this.events.push([tag, i, ...packArgs(args)]);
        this.callDepth++;
        try { return call(...args); } finally { this.callDepth--; }
      };
    });
  }

  wrapProjectiles() {
    const ps = this.game.projectiles;
    const cover = this.game.cover;
    const spawn = ps.spawn.bind(ps);
    ps.spawn = (o) => {
      if (this.recording && this.muteDepth === 0) {
        const shot = {
          o: v3(o.origin), d: dir3(o.dir), s: r2(o.speed), f: o.faction, c: o.color.getHex(), z: o.size ?? 1,
          l: r2(o.life ?? 1.8), tr: o.tracer === false ? 0 : 1,
        };
        if (o.splash) shot.sp = o.splash;
        if (o.gravity) { shot.g = o.gravity; shot.w = r2(o.whistleAt ?? -1); if (o.target) shot.tg = v3(o.target); }
        if (o.crater) shot.cr = o.crater;
        if (o.trail) shot.tl = 1;
        if (o.smoke) shot.sm = 1;
        if (o.flare) shot.fl = 1;
        if (o.guide?.stack) shot.gu = [o.guide.stack.id, o.guide.index];
        if (o.ignore) shot.ig = (o.ignore._i ??= cover.colliders.indexOf(o.ignore));
        this.events.push(['p', shot]);
      }
      return spawn(o);
    };
  }

  /** Smoke screens are battlefield state (they block sight): always sent, even from a shell burst. */
  wrapSmoke() {
    const sm = this.game.smoke;
    const add = sm.add.bind(sm);
    sm.add = (x, z, opts) => {
      this.event('smoke', r2(x), r2(z), opts ?? null);
      return add(x, z, opts);
    };
  }

  /** An explicit state change for the client (see NetClient.apply for the list). */
  event(type, ...args) {
    this.events.push([type, ...args]);
  }

  toast(message) {
    this.event('toast', message);
  }

  sendEnd(result) {
    this.event('end', { ...result, report: result.report ?? this.game.stats?.report() });
  }

  onSpawn(s) {
    if (this.ready) this.event('spawn', ...this.spawnArgs(s));
  }

  spawnArgs(s) {
    return [s.id, s.type.id, s.faction, r2(s.anchor.x), r2(s.anchor.z), Math.round(s.facing * 1000) / 1000, s.name, s.units.length, s.owner ?? null];
  }

  mute() { this.muteDepth++; }
  unmute() { this.muteDepth--; }

  muted(fn) {
    this.mute();
    try { return fn(); } finally { this.unmute(); }
  }

  // ---------------------------------------------------------------- step

  /** Start of the simulation part of a step: run the client's orders. */
  begin() {
    this.recording = true;
    for (const o of this.orders.splice(0)) {
      try { this.game.orders.run(this.remoteFaction, o, 'guest'); } catch (e) { console.error('bad order', o, e); }
    }
  }

  /** End of it: send what happened. */
  end(dt) {
    this.recording = false;
    if (!this.ready) { this.events.length = 0; return; }
    const t = this.game.time;
    if (this.events.length) {
      this.link.send({ k: 'ev', t, e: this.events });
      this.events = [];
    }
    this.snapT -= dt;
    if (this.snapT <= 0) {
      this.snapT = Math.max(-0.1, this.snapT) + 1 / SNAPSHOT_RATE;
      this.sendSnapshot();
    }
    this.stateT -= dt;
    if (this.stateT <= 0) {
      this.stateT = Math.max(-0.2, this.stateT) + 1 / STATE_RATE;
      this.sendState();
    }
  }

  /**
   * Deployment (campaign co-op): the clock stands still, so the guest's orders run here and the
   * stacks go out on a clock of their own, far below the battle's — the battle's first real
   * snapshot is newer than all of them (and the guest resets its clock at deploy-go).
   */
  deploySnapshot(dt) {
    if (!this.ready) return;
    for (const o of this.orders.splice(0)) {
      try { this.game.orders.run(this.remoteFaction, o, 'guest'); } catch (e) { console.error('bad order', o, e); }
    }
    this.deployT = (this.deployT ?? 0) + dt;
    // what was bought meanwhile (a pitched battle: both armies are built now) — its spawns, on this clock, and the CP left
    if (this.events.length) { this.link.send({ k: 'ev', t: DEPLOY_CLOCK + this.deployT, e: this.events }); this.events = []; }
    if ((this.stateT -= dt) <= 0) { this.stateT = 0.5; this.sendState(); }
    this.snapT -= dt;
    if (this.snapT > 0) return;
    this.snapT = 1 / SNAPSHOT_RATE;
    this.link.sendSnapshot(encodeSnapshot(DEPLOY_CLOCK + this.deployT, this.game.world.stacks.filter((s) => s.alive), [], this.posQ));
  }

  sendSnapshot() {
    const g = this.game;
    const stacks = g.world.stacks.filter((s) => s.alive);
    const sorties = g.air.sorties.filter((s) => s.state !== 'inbound' && s.state !== 'done');
    this.link.sendSnapshot(encodeSnapshot(g.time, stacks, sorties, this.posQ));
  }

  /** `t`: the clock it's stamped on (the battle's; during deployment, deployment's — the guest takes it in order, by that clock). */
  sendState(t = this.game.deployment?.on ? DEPLOY_CLOCK + (this.deployT ?? 0) : this.game.time) {
    const g = this.game;
    const ms = g.modeState;
    const round = (o) => (o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r2(v)])) : null);
    this.link.send({
      k: 'st',
      t,
      s: g.world.stacks.filter((s) => s.alive).map((s) => [
        s.id, s.ai.state, Math.round(s.ai.defendTime ?? 0), r2(s.morale), s.passengers ?? 0,
        s.smokeLeft ?? 0, s.smokeRounds ?? 0, s.garrison?.index ?? -1, s.ai.ordered ? 1 : 0, s.rank, s.autonomous ? 1 : 0,
        s.job ?? '', s.tended && s.tended.until > g.time ? s.tended.kind : '', // a support vehicle's work, and whom it treats (systems/Support.js)
        s.radarOn === false ? 0 : 1, // (1985 ships: radar on or silent — a guest's ESM bearings, systems/Sensors.js)
        (() => { const l = s.stats.naval && s.units.find((u) => u.alive && u.lightOn)?.lightOn; return l ? [Math.round(l.x), Math.round(l.z)] : 0; })(), // a ship's searchlight on (x, z)
        (() => { const u = s.stats.sail && s.units[0]; return u ? (u.masts ?? [1, 1, 1]).reduce((a, m, i) => a | (m ? 1 << i : 0), 0) | (u.struck ? 8 : 0) : 0; })(), // (1806: her masts standing, struck)
        (() => { const u = s.stats.landingCraft && s.units[0]; return u ? Math.round((u.rampK ?? 0) * 100) + (u.beached ? 1000 : 0) : 0; })(), // (a landing craft: her ramp, aground)
      ]),
      cp: round(ms?.cp),
      str: round(ms?.strength),
      bud: ms?.build ? [round(ms.build), round(ms.support)] : null, // (systems/Economy.js)
      sd: ms?.sides?.points.map((p) => [Math.round((ms.sides.home === 'nato' ? p.progress : -p.progress) * 1000) / 1000, p.owner, p.contested ? 1 : 0]) ?? null,
      pts: ms?.points?.points.map((p) => [
        Math.round((ms.points.home === 'nato' ? p.progress : -p.progress) * 1000) / 1000, p.owner, p.contested ? 1 : 0, p.locked ? 1 : 0,
      ]) ?? null,
      status: ms?.statusFor?.(this.remoteFaction) ?? ms?.status?.() ?? null,
      air: round(g.air.readyAt),
      sites: g.construction.sites.map((s) => [s.id, r2(s.progress)]),
    });
  }

  // ---------------------------------------------------------------- connection

  /** The client is in: send it the battle as it stands, then let the simulation run. */
  start() {
    if (this.ready) return;
    const g = this.game;
    this.ready = true;
    this.link.send({
      k: 'init',
      t: g.time,
      stacks: g.world.stacks.filter((s) => s.alive).map((s) => this.spawnArgs(s)),
      sites: g.construction.sites.map((s) => [s.id, s.kind, s.x, s.z, s.yaw, s.faction]),
      collapsed: g.buildings.list.filter((b) => b.collapsed).map((b) => b.index),
    });
    this.sendState();
    g.setWaiting(false);
  }

  peerLeft() {
    const g = this.game;
    if (g.ended) return;
    g.setWaiting(false);
    g.end({ victory: true, title: 'Victory', subtitle: 'Your opponent has left the battle.' });
  }

  get status() {
    return this.link.closed ? 'Disconnected' : `Ping ${Math.round(this.link.rtt)} ms`;
  }
}
