// The client's side of a multiplayer battle. Nothing is simulated here: the client builds the
// same map, and its stacks are copies of the host's that take their state from the stream.
//   • snapshots are buffered and played ~0.12 s behind the host's clock, each unit interpolated
//     between the two snapshots around that moment — smooth motion whatever the network does
//     (the delay grows a little when snapshots come late, and shrinks back when they're steady)
//   • events (effects, sounds, rounds fired, new stacks, structures …) wait in a queue for the
//     same moment, so a muzzle flash shows when the soldier who fired is drawn firing
//   • walking, gait and footfall come from the interpolated motion; renderers, effects, sound,
//     labels, minimap and HUD then run as in single player
// Orders go to the host (core/Orders.js); the host's simulation answers in the next snapshots.
import * as THREE from 'three';
import { decodeSnapshot, unpackArgs, FLAG } from './protocol.js';
import { FX_CALLS, SOUND_CALLS } from './NetHost.js';
import { SortieView } from '../systems/AirStrike.js';
import { enemyOf } from '../data/factions.js';
import { angleDelta } from '../core/math.js';

const BASE_DELAY = 0.12;     // seconds behind the host
const MAX_DELAY = 0.4;
const TELEPORT = 6;          // metres: a jump bigger than this isn't walked
const STALE_SKIP = new Set(['f', 'a', 'p', 'bark']); // cosmetic events not worth showing late

const lerp = (a, b, k) => a + (b - a) * k;
const lerpAngle = (a, b, k) => a + angleDelta(a, b) * k;
const _color = new THREE.Color();
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export class NetClient {
  constructor(game, link) {
    this.game = game;
    this.link = link;
    this.isHost = false;
    this.isClient = true;
    this.remoteFaction = game.coop ? game.playerFaction : enemyOf(game.playerFaction);
    this.snaps = [];          // decoded snapshots, oldest first
    this.queue = [];          // [host time, event] in arrival (= time) order
    this.offset = null;       // host clock − local clock (s)
    this.delay = BASE_DELAY;
    this.renderTime = 0;
    this.started = false;
    this.seq = 0;
    this.lastSeq = -1;
    this.latest = -Infinity;  // newest snapshot time
    game.projectiles.cosmetic = true;

    link.on('init', (m) => this.init(m));
    link.on('ev', (m) => { for (const e of m.e) this.queue.push([m.t, e]); });
    link.on('st', (m) => this.queue.push([m.t, ['state', m]]));
    link.onSnapshot((buf) => this.onSnapshot(buf));
    link.on('bye', () => this.hostLeft());
    link.onClose(() => this.hostLeft());
  }

  /** The world is built: tell the host to start. */
  attached() {
    this.link.send({ k: 'ready' });
  }

  sendOrder(cmd) {
    this.link.send({ k: 'order', o: cmd });
  }

  get status() {
    return this.link.closed ? 'Disconnected' : `Ping ${Math.round(this.link.rtt)} ms`;
  }

  // ---------------------------------------------------------------- incoming

  init(m) {
    for (const args of m.stacks) this.spawn(args);
    for (const [id, kind, x, z, yaw, faction] of m.sites ?? []) this.game.construction.place(kind, x, z, yaw, faction, null, { id, force: true });
    for (const i of m.collapsed ?? []) this.game.buildings.collapseVisual(this.game.buildings.list[i]);
    this.clock(m.t);
    this.renderTime = m.t - this.delay;
    this.started = true;
  }

  onSnapshot(buf) {
    const snap = decodeSnapshot(buf);
    if (!snap || snap.time <= this.latest) return; // late and out of order: a newer one is here
    snap.seq = this.seq++;
    this.latest = snap.time;
    this.snaps.push(snap);
    this.clock(snap.time);
  }

  /** Track the host clock from message timestamps (they arrive at most a little late). */
  clock(hostTime) {
    const sample = hostTime - performance.now() / 1000;
    if (this.offset === null) this.offset = sample;
    else if (sample < this.offset - 0.5) this.offset = sample;                  // the host's clock fell behind (slow machine): follow it
    else if (sample > this.offset) this.offset += (sample - this.offset) * 0.2; // fresher than we thought
    else this.offset += (sample - this.offset) * 0.02;                          // network wobble: drift
  }

  hostLeft() {
    const g = this.game;
    if (g.ended) return;
    g.end({ victory: false, title: 'Disconnected', subtitle: 'The connection to the host was lost.' });
  }

  // ---------------------------------------------------------------- per frame

  update(dt) {
    const g = this.game;
    if (!this.started || this.offset === null) return;
    const wall = performance.now() / 1000;
    const real = Math.min(1, wall - (this.lastWall ?? wall)); // real time since the last frame (dt is capped)
    this.lastWall = wall;
    const target = wall + this.offset - this.delay;
    // the clock never runs backwards, and eases toward the target instead of snapping; a big
    // gap (tab was hidden) is jumped
    if (target > this.renderTime + 1) this.renderTime = target;
    else this.renderTime = Math.max(this.renderTime + real * 0.5, Math.min(target, this.renderTime + real * 1.5));
    // never run ahead of what the host has sent (a slow host's battle runs slower than real time)
    if (this.latest > -Infinity) this.renderTime = Math.min(this.renderTime, this.latest + 0.05);
    const now = this.renderTime;
    const span = now - (this.prevNow ?? now); // battle time shown since the last frame
    this.prevNow = now;
    g.time = g.world.time = now;

    // keep a little buffer: starving → play further behind; long steady → creep closer
    const ahead = this.latest - now;
    if (ahead < 0.01) this.delay = Math.min(MAX_DELAY, this.delay + 0.004);
    else if (ahead > this.delay * 0.9 && this.delay > BASE_DELAY) this.delay = Math.max(BASE_DELAY, this.delay - 0.0005);

    let n = 0;
    while (n < this.queue.length && this.queue[n][0] <= now) n++;
    if (n) {
      for (const [t, e] of this.queue.splice(0, n)) {
        // back from a hidden tab: don't replay a minute of gunfire at once — only the state
        if (t < now - 0.5 && STALE_SKIP.has(e[0])) continue;
        this.apply(e);
      }
    }

    while (this.snaps.length > 2 && this.snaps[1].time <= now) this.snaps.shift();
    const a = this.snaps[0];
    if (!a) return;
    const b = this.snaps[1] && this.snaps[1].time > a.time ? this.snaps[1] : null;
    const k = b ? Math.max(0, Math.min(1, (now - a.time) / (b.time - a.time))) : 0;
    const fresh = a.seq !== this.lastSeq;
    this.lastSeq = a.seq;
    for (const s of g.world.stacks) {
      if (!s.alive) continue;
      const sa = a.stacks.get(s.id);
      if (sa) this.applyStack(s, sa, b?.stacks.get(s.id) ?? sa, k, fresh, dt, span);
    }
    this.applySorties(a, b, k, dt);
  }

  /** `dt`: frame time (for smoothing and timers); `span`: battle time it covered (for motion). */
  applyStack(s, sa, sb, k, fresh, dt, span) {
    const g = this.game;
    const own = s.faction === g.playerFaction;
    const terrain = g.terrain;
    let anyVisible = own;
    const n = Math.min(sa.n, s.units.length);
    for (let i = 0; i < n; i++) {
      const u = s.units[i];
      const o = i * 9;
      const f = sa.f[i];
      if (!(f & FLAG.alive)) {
        if (u.alive) this.kill(s, u);
        continue;
      }
      if (!u.alive) continue; // (no coming back)
      const st = u.stats;
      const da = sa.d;
      const db = sb.n > i ? sb.d : da;
      const x = lerp(da[o], db[o], k);
      const z = lerp(da[o + 1], db[o + 1], k);
      // motion: velocity from the interpolated path drives gait and footfall like the host's
      const dx = x - u.pos.x;
      const dz = z - u.pos.z;
      if (dx * dx + dz * dz > TELEPORT * TELEPORT || !u.netPlaced) {
        u.vel.set(0, 0, 0);
        u.netPlaced = true;
      } else if (span > 0) {
        u.vel.x += (dx / span - u.vel.x) * Math.min(1, span * 12);
        u.vel.z += (dz / span - u.vel.z) * Math.min(1, span * 12);
      }
      u.pos.set(x, terrain.heightAt(x, z), z);
      const speed = Math.hypot(u.vel.x, u.vel.z);
      u.moving = speed > 0.5;
      u.gait += (Math.min(1, speed / (st.speed * 1.5)) - u.gait) * Math.min(1, dt * 8);
      u.walkPhase += span * speed * (Math.PI / (st.stride ?? 1.1));
      if (u.moving) u.moveYaw = Math.atan2(u.vel.x, u.vel.z);
      u.yaw = lerpAngle(da[o + 2], db[o + 2], k);
      u.turretYaw = lerpAngle(da[o + 3], db[o + 3], k);
      u.gunPitch = lerp(da[o + 4], db[o + 4], k);
      u.crouch = lerp(da[o + 5], db[o + 5], k);
      u.prone = lerp(da[o + 6], db[o + 6], k);
      u.reloadAnim = lerp(da[o + 7], db[o + 7], k);
      u.height = st.height * (1 - 0.42 * u.crouch) * (1 - 0.72 * u.prone);
      u.aimHeight = st.aimHeight * (1 - 0.38 * u.crouch) * (1 - 0.75 * u.prone);
      const hp = da[o + 8] * u.maxHp;
      if (hp < u.hp - 0.5) { u.flash = 0.12; u.flinch = 1; }
      u.hp = hp;
      u.spotted = !!(f & FLAG.spotted);
      u.run = !!(f & FLAG.run);
      u.working = !!(f & FLAG.working);
      u.peekT = f & FLAG.peek ? 0.2 : 0;
      u.reloadT = f & FLAG.reloading ? 1 : 0;
      if (fresh && f & FLAG.recoil) u.recoil = 1;
      const ts = sa.ts[i];
      u.target = ts ? g.world.stackById(ts)?.units[sa.ti[i]] ?? null : null;
      if (u.target && !u.target.alive) u.target = null;
      u.visible = own || u.spotted;
      if (u.visible) anyVisible = true;
      s.decayTimers(u, dt);
    }
    s.visible = anyVisible;
    s.updateCentroid();
    s.anchor.copy(s.centroid);
  }

  kill(s, u) {
    u.alive = false;
    u.hp = 0;
    u.deathTime = 0;
    u.target = null;
    u.vel.set(0, 0, 0);
    s.aliveCount = Math.max(0, s.aliveCount - 1);
    s.renderer.done = false;
    if (s.aliveCount === 0) this.game.bus.emit('stack:destroyed', s);
  }

  applySorties(a, b, k, dt) {
    const air = this.game.air;
    for (let i = air.sorties.length - 1; i >= 0; i--) {
      const view = air.sorties[i];
      const sa = a.sorties.get(view.id);
      if (!sa) {
        // shown before and now gone from the host's list: it went home, or crashed
        if (view.rig && !this.snaps.some((sn) => sn.sorties.has(view.id))) {
          view.finish();
          air.sorties.splice(i, 1);
        }
        continue;
      }
      const sb = b?.sorties.get(view.id) ?? sa;
      view.show({
        state: sa.state,
        x: lerp(sa.x, sb.x, k), y: lerp(sa.y, sb.y, k), z: lerp(sa.z, sb.z, k),
        yaw: lerpAngle(sa.yaw, sb.yaw, k), pitch: lerp(sa.pitch, sb.pitch, k), roll: lerp(sa.roll, sb.roll, k),
      }, dt);
    }
  }

  // ---------------------------------------------------------------- events

  spawn([id, typeId, faction, x, z, facing, name, count, owner]) {
    if (this.game.world.stackById(id)) return;
    this.game.currentOwner = owner;
    const s = this.game.spawnStack(typeId, faction, { x, z }, facing, name, { count, id });
    this.game.currentOwner = null;
    s.owner = owner ?? s.owner;
  }

  apply(e) {
    const g = this.game;
    const [type] = e;
    switch (type) {
      case 'f': g.effects[FX_CALLS[e[1]]](...unpackArgs(e.slice(2))); break;
      case 'a': g.audio[SOUND_CALLS[e[1]]](...unpackArgs(e.slice(2))); break;
      case 'p': this.shot(e[1]); break;
      case 'smoke': g.smoke.add(e[1], e[2], e[3] ?? undefined); break;
      case 'spawn': this.spawn(e.slice(1)); break;
      case 'dead': {
        const s = g.world.stackById(e[1]);
        if (s) for (const u of s.units) if (u.alive) this.kill(s, u);
        break;
      }
      case 'removed': {
        const s = g.world.stackById(e[1]);
        if (s && !s.removed) g.removeStack(s);
        break;
      }
      case 'bark': {
        const s = g.world.stackById(e[1]);
        const u = s?.units[e[2]];
        if (u?.alive) g.bus.emit('bark', { unit: u, stack: s, text: e[3], priority: !!e[4] });
        break;
      }
      case 'toast': g.bus.emit('toast', e[1]); break;
      case 'site': g.construction.place(e[2], e[3], e[4], e[5], e[6], null, { id: e[1], force: true, stackId: e[7] ?? null }); break;
      case 'unsite': {
        const site = g.construction.sites.find((s) => s.id === e[1]);
        if (site) g.construction.cancel(site);
        break;
      }
      case 'built': {
        const site = g.construction.sites.find((s) => s.id === e[1]);
        if (site) g.construction.finish(site);
        break;
      }
      case 'revealed': {
        const ob = g.construction.obstacles.find((o) => o.site.id === e[1]);
        if (ob) { ob.revealed = true; g.construction.showObstacle(ob); }
        break;
      }
      case 'cleared': {
        const ob = g.construction.obstacles.find((o) => o.site.id === e[1]);
        if (ob) g.construction.removeObstacle(ob);
        break;
      }
      case 'collapse': {
        const b = g.buildings.list[e[1]];
        if (b) g.buildings.collapseVisual(b);
        break;
      }
      case 'air': g.air.sorties.push(new SortieView(g, e[1], e[2], e[3], e[4], e[5], e[6] ?? 'heli')); break;
      case 'flare': g.flares.add(e[1], e[2], e[3]); break;
      case 'gas': g.gas.land(e[1], e[2]); break;
      case 'fire': g.fire.light(e[1], e[2]); break;
      case 'span': {
        const river = g.world.river;
        if (river) { river.lay(e[1], g.terrain, g.scene); g.bus.emit('terrain:changed'); }
        for (const s of g.world.stacks) if (s.stats.bridgeLayer && Math.abs(s.centroid.x - e[1]) < 25) s.units[0].dropped = true; // its bridge is down
        break;
      }
      case 'bridge': {
        const river = g.world.river;
        const c = river?.crossings[e[1]];
        if (c) { river.blow(c, g.terrain, g.scene); g.bus.emit('terrain:changed'); }
        break;
      }
      case 'end': g.end(e[1]); break;
      case 'state': this.applyState(e[1]); break;
      default: break;
    }
  }

  shot(o) {
    const g = this.game;
    g.projectiles.spawn({
      origin: V(o.o), dir: V(o.d), speed: o.s, damage: 0, faction: o.f, color: _color.setHex(o.c), size: o.z,
      life: o.l, splash: o.sp ?? 0, gravity: o.g ?? 0, target: o.tg ? V(o.tg) : null, whistleAt: o.w ?? -1,
      crater: o.cr ?? 0, tracer: !!o.tr, trail: !!o.tl, smoke: !!o.sm, flare: !!o.fl,
      guide: o.gu ? g.world.stackById(o.gu[0])?.units[o.gu[1]] ?? null : null,
      ignore: o.ig >= 0 ? g.cover.colliders[o.ig] ?? null : null,
    });
  }

  applyState(m) {
    const g = this.game;
    for (const [id, state, defendTime, morale, passengers, smokeLeft, smokeRounds, garrison, ordered, rank, autonomous] of m.s) {
      const s = g.world.stackById(id);
      if (!s) continue;
      s.ai.state = state;
      s.ai.defendTime = defendTime;
      s.ai.ordered = !!ordered;
      s.morale = morale;
      s.passengers = passengers;
      s.smokeLeft = smokeLeft;
      s.smokeRounds = smokeRounds;
      s.garrison = garrison >= 0 ? g.buildings.list[garrison] : null;
      s.rank = rank ?? 0;
      s.autonomous = !!autonomous;
    }
    const ms = g.modeState;
    if (ms) {
      if (m.cp) Object.assign(ms.cp, m.cp);
      if (m.str) Object.assign(ms.strength, m.str);
      if (m.pts) m.pts.forEach(([progress, owner, contested, locked], i) => {
        const p = ms.points.points[i];
        if (p) ms.points.apply(p, progress, owner, !!contested, !!locked);
      });
      if (m.status !== undefined) ms.statusText = m.status ?? '';
    }
    if (m.air) Object.assign(g.air.readyAt, m.air);
    if (m.gas) Object.assign(g.gas.readyAt, m.gas);
    for (const [id, progress] of m.sites ?? []) {
      const site = g.construction.sites.find((s) => s.id === id);
      if (site) { site.progress = progress; g.construction.showProgress(site); }
    }
  }
}
