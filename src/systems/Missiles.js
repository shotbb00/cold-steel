// Anti-ship missiles, and the layers that stop them (1985 at sea: data/units/ships85.js).
// A missile is fired at a point — where a seen target will be, or a bearing fix (systems/Sensors.js)
// — flies there at its cruise height (a sea-skimmer a few metres over the waves, a big Soviet one high
// and diving at the end), switches its seeker on `seeker` m short of it and takes the nearest radar
// return ahead of it: the ship it was meant for, the one next to her, or a chaff cloud. Every
// launch shows the shooter to everyone for a while.
// The defence, ship by ship (stats.defence): `sam` area missiles (as many in the air at once as she
// has `channels` — a saturating raid gets through), `point` short-range missiles for what comes at
// her, `ciws` the last-ditch gun, `chaff` a decoy cloud off her beam when a seeker has her. All
// of it needs the missile seen: her radar on (a sea-skimmer only inside SKIM_HORIZON), or by eye
// close in. The host runs them; a multiplayer guest is sent each launch, interceptor, chaff cloud and end
// ('msl', 'mslsam', 'chaff', 'mslx': net/NetClient.js) and flies them to watch — the host deals the damage.
import * as THREE from 'three';
import { enemyOf } from '../data/factions.js';

const SKIM_HORIZON = 1100;  // m: a sea-skimmer shows on a ship's radar only this close (over the radar horizon)
const EYES = 450;           // m: seen by eye (no radar) — the gun's own director, the lookouts
const LIGHT_UP = 3200;      // m: a silent ship hearing an incoming missile's seeker this close switches her radars on (Missiles.defend)
const MISSILE_HIT = 0.6;     // share of a missile's listed damage one hit does: a cruiser takes three or four, not two (the defence, damage control and the helm get time to matter)
const CLIMB = 2.5;          // s from the launcher to cruise height
const TERMINAL = 700;       // m: a high-flyer comes down for the last run in
const CHAFF_LIFE = 12;      // s a chaff cloud fools a seeker
const CHAFF_FOOLS = 0.35;   // the chance a seeker switching on near a cloud takes it (once per missile and cloud)
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();

export class Missiles {
  constructor(game) {
    this.game = game;
    this.list = [];         // anti-ship missiles in flight
    this.interceptors = []; // SAMs after them
    this.chaff = [];        // { x, z, y, faction (the ship's side), until }
    this.nextId = 1;
  }

  // ---------------------------------------------------------------- a multiplayer guest: the host's missiles, to watch

  remote(list) {
    const level = this.game.world.river?.level ?? 0;
    for (const [id, x, y, z, ax, az, speed, cruise, skim, faction, seeker, left] of list) {
      this.list.push({ id, pos: new THREE.Vector3(x, y, z), dir: new THREE.Vector3(ax - x, 0.6 * Math.hypot(ax - x, az - z), az - z).normalize(), aim: { x: ax, z: az }, meant: null, target: null, decoy: null,
        speed, left, damage: 0, pierce: 0, seeker, skim: !!skim, cruise, level, age: 0, faction, source: null, engaged: 0, fx: 0, remote: true });
    }
  }
  remoteGone(id, how, x, y, z) {
    const i = this.list.findIndex((s) => s.id === id);
    const s = i >= 0 ? this.list.splice(i, 1)[0] : null;
    _p.set(x, y, z);
    if (how === 1) { this.game.effects.explosion(_p, 2.2, { ground: false, fire: 2.5 }); this.game.audio?.play('explosion.big', _p, { volume: 1 }); }
    else if (how === 2) { this.game.effects.explosion(_p, 1, { ground: false, fire: 1.2 }); this.game.audio?.play('explosion', _p, { volume: 0.7, throttle: 0.1 }); }
    else if (s) this.splash(s);
  }
  remoteSam(x, y, z, id, speed) {
    const t = this.list.find((s) => s.id === id);
    if (t) this.interceptors.push({ pos: new THREE.Vector3(x, y, z), dir: new THREE.Vector3(0, 1, 0), target: t, air: false, from: null, layer: 'remote', speed, pk: 0, age: 0, remote: true });
  }
  remoteChaff(x, y, z, faction) {
    const c = { x, y, z, faction, until: this.game.time + CHAFF_LIFE };
    this.chaff.push(c);
    this.chaffPuff(c);
  }
  /** Tell a guest a missile is gone: 0 into the sea, 1 a hit, 2 shot down. */
  gone(s, how) { if (s.id) this.game.netEvent('mslx', s.id, how, Math.round(s.pos.x), Math.round(s.pos.y), Math.round(s.pos.z)); }
  chaffPuff(c) {
    for (let k = 0; k < 14; k++) this.game.effects.smoke.spawn(c.x + (Math.random() - 0.5) * 30, c.y + (Math.random() - 0.5) * 16, c.z + (Math.random() - 0.5) * 30, { vx: 0, vy: -0.4, vz: 0, size: 5, grow: 1.6, life: CHAFF_LIFE * 0.6, alpha: 0.35, color: 0xd8dde2, drag: 1, wind: 0.6 });
  }

  /** Stack `src` (unit `u`) fires mount `m` at point (x, z) — `t` the ship it was aimed at, if any. */
  launch(src, u, from, x, z, m, t = null) {
    const g = this.game;
    const level = g.world.river?.level ?? 0;
    const first = this.list.length;
    for (let i = 0; i < (m.count ?? 1); i++) {
      if (m.left <= 0) break;
      m.left--;
      const yaw = Math.atan2(x - from.x, z - from.z) + (Math.random() - 0.5) * 0.06;
      this.list.push({
        pos: new THREE.Vector3(from.x, from.y, from.z), dir: new THREE.Vector3(Math.sin(yaw), 0.6, Math.cos(yaw)).normalize(),
        aim: { x: x + (Math.random() - 0.5) * 40, z: z + (Math.random() - 0.5) * 40 }, meant: t, target: null, decoy: null,
        speed: m.speed, left: m.range * 1.15, damage: m.damage, pierce: m.pierce ?? 0.6, seeker: m.seeker, skim: !!m.skim,
        cruise: level + (m.skim ? 5 : m.alt ?? 40), level, age: -i * 0.6, faction: src.faction, source: src, name: m.name, engaged: 0, fx: 0, id: this.nextId++,
      });
    }
    g.netEvent('msl', this.list.slice(first).map((s) => [s.id, Math.round(s.pos.x), Math.round(s.pos.y), Math.round(s.pos.z), Math.round(s.aim.x), Math.round(s.aim.z), s.speed, Math.round(s.cruise), s.skim ? 1 : 0, s.faction, s.seeker, Math.round(s.left)]));
    g.sensors?.launch(src.faction, from.x, from.z); // the launch: a flash and a booster — a bearing for the other side (systems/Sensors.js), not a position
    g.audio?.play('nato.mlrs', from, { volume: 1, rate: m.speed > 150 ? 0.8 : 1, throttle: 0.25 }); // (the booster's roar — a big supersonic one deeper)
    g.tell(src.faction, `${src.name}: ${m.name ?? 'missiles'} away`);
  }

  /** Missiles in flight meant for unit `t` (so a ship doesn't throw her whole load at one target). */
  inbound(t) {
    let n = 0;
    for (const s of this.list) if (s.meant === t || s.target === t) n++;
    return n;
  }

  update(dt) {
    if (this.game.net?.isClient) { this.flyMissiles(dt); this.flyInterceptors(dt); this.chaff = this.chaff.filter((c) => c.until > this.game.time); return; } // (a guest: the host's, to watch)
    if (!this.list.length && !this.interceptors.length && !this.game.air?.sorties.some((a) => a.airborne)) { if (this.chaff.length) this.chaff = this.chaff.filter((c) => c.until > this.game.time); return; }
    this.flyMissiles(dt);
    this.defend(dt);
    this.flyInterceptors(dt);
    this.chaff = this.chaff.filter((c) => c.until > this.game.time);
  }

  flyMissiles(dt) {
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      s.age += dt;
      if (s.age < 0) continue; // (the next of a salvo: still on the rail)
      // the seeker: on near the aim point, after a chaff cloud blooms, or when it has lost its ship
      const toAim = Math.hypot(s.aim.x - s.pos.x, s.aim.z - s.pos.z);
      if ((!s.target && !s.decoy && toAim < s.seeker) || (s.target && !s.target.alive)) this.seek(s);
      const goal = s.target?.pos ?? s.decoy ?? s.aim;
      // where to: the goal ahead (a ship: led a little), at cruise height — the last run low
      const gx = goal.x + (s.target?.vel?.x ?? 0) * 0.8, gz = goal.z + (s.target?.vel?.z ?? 0) * 0.8;
      const flat = Math.hypot(gx - s.pos.x, gz - s.pos.z);
      const want = s.age < CLIMB ? s.cruise * Math.min(1, s.age / CLIMB) + s.pos.y * (1 - s.age / CLIMB)
        : !s.skim && flat < TERMINAL ? s.level + 4 + (s.cruise - s.level) * (flat / TERMINAL) ** 2 : s.cruise;
      _d.set(gx - s.pos.x, (want - s.pos.y) * 3, gz - s.pos.z).normalize();
      s.dir.lerp(_d, Math.min(1, dt * (s.target ? 3 : 1.5))).normalize();
      const step = s.speed * Math.min(1, s.age / 1.2 + 0.25) * dt;
      s.pos.addScaledVector(s.dir, step);
      s.left -= step;
      if ((s.fx -= dt) <= 0) { // the motor's glow and a white trail, to be seen from kilometres away
        s.fx = 0.04;
        g.effects.fire.spawn(s.pos.x, s.pos.y, s.pos.z, { size: 2.6, grow: 0, life: 0.06, color: 0xffd28a, bright: 4 });
        g.effects.smoke.spawn(s.pos.x - s.dir.x * 3, s.pos.y, s.pos.z - s.dir.z * 3, { vx: 0, vy: 0.2, vz: 0, size: 1.4, grow: 1.6, life: s.skim ? 2.5 : 4, alpha: 0.55, color: 0xe8eaec, drag: 1, wind: 0.6 });
      }
      // the hit: inside her hull (length × beam, up to her upperworks)
      const h = s.target && this.hits(s, s.target);
      if (s.remote) { if (h || s.left <= -200) this.list.splice(i, 1); continue; } // (a guest: the host says when it ends — 'mslx'; a hit it shows then)
      if (h) { this.impact(s, s.target); this.gone(s, 1); this.list.splice(i, 1); continue; }
      if (s.decoy && Math.hypot(s.decoy.x - s.pos.x, s.decoy.z - s.pos.z) < 15) { this.splash(s); this.gone(s, 0); this.list.splice(i, 1); continue; } // into the chaff: the sea
      const ground = g.world.terrain.heightAt(s.pos.x, s.pos.z);
      if (ground > s.pos.y) { g.effects.explosion({ x: s.pos.x, y: ground, z: s.pos.z }, 1, { ground: true, fire: 0.6 }); this.gone(s, 0); this.list.splice(i, 1); continue; } // into an island: no missile flies through the land
      if (s.left <= 0 || s.pos.y < s.level - 1 || (s.target == null && s.decoy == null && toAim < 20 && s.age > CLIMB)) { this.splash(s); this.gone(s, 0); this.list.splice(i, 1); }
    }
  }

  /** The seeker looks ahead: the nearest enemy ship or chaff cloud in its cone and reach (a cloud shows big on its screen). */
  seek(s) {
    const g = this.game;
    let best = null, bestD = Infinity, cloud = null;
    const reach = s.seeker * 1.3;
    const fx = s.dir.x, fz = s.dir.z, fl = Math.hypot(fx, fz) || 1;
    const ahead = (x, z) => { const dx = x - s.pos.x, dz = z - s.pos.z, d = Math.hypot(dx, dz); return d < reach && (dx * fx + dz * fz) / (d * fl || 1) > 0.6 ? d : Infinity; }; // (±53°)
    for (const st of g.world.stacksOf(enemyOf(s.faction))) {
      if (!st.alive || !st.stats.naval) continue;
      for (const u of st.units) {
        if (!u.alive || (u.depth ?? 0) > 1) continue;
        const d = ahead(u.pos.x, u.pos.z) * (st.stats.smallCraft ? 1.4 : 1); // (a small boat: a small return)
        if (d < bestD) { bestD = d; best = u; cloud = null; }
      }
    }
    for (const c of this.chaff) {
      if (c.faction === s.faction) continue;
      const fooled = ((s.fooled ??= new Map()).has(c) ? s.fooled : s.fooled.set(c, Math.random() < CHAFF_FOOLS)).get(c);
      if (!fooled) continue; // (this seeker sees through it)
      const d = ahead(c.x, c.z);
      if (d < bestD) { bestD = d; best = null; cloud = c; }
    }
    s.target = best;
    s.decoy = cloud;
  }

  hits(s, u) {
    const hull = u.stack.type.hull;
    const dx = s.pos.x - u.pos.x, dz = s.pos.z - u.pos.z;
    const along = dx * Math.sin(u.yaw) + dz * Math.cos(u.yaw), across = dx * Math.cos(u.yaw) - dz * Math.sin(u.yaw);
    return Math.abs(along) < (hull?.length ?? 60) / 2 + 2 && Math.abs(across) < (hull?.beam ?? 10) / 2 + 3 && s.pos.y < u.pos.y + (u.stack.stats.height ?? 10) + 2;
  }

  impact(s, u) {
    const g = this.game;
    g.effects.explosion(s.pos, 2.2, { ground: false, fire: 2.5 });
    g.audio?.play('explosion.big', s.pos, { volume: 1 });
    if (g.net?.isClient) return;
    u.receiveDamage(s.damage * MISSILE_HIT, s.source, s.pierce, { x: s.dir.x, z: s.dir.z }, 1);
    if (u.alive) {
      u.blaze = Math.min(1, (u.blaze ?? 0) + 0.3); // (every hit: the fuel left in it, the aluminium upperworks — she burns)
      g.tell(u.stack.faction, `${u.stack.name}: missile hit — fire aboard!`);
    }
  }

  splash(s) {
    this.game.effects.waterSplash?.({ x: s.pos.x, y: s.level, z: s.pos.z }, 3);
    this.game.effects.explosion(s.pos, 0.8, { ground: false, fire: 0.6 });
  }

  // ---------------------------------------------------------------- the defence

  defend(dt) {
    const g = this.game;
    const now = g.time;
    for (const st of g.world.stacks) {
      const D = st.stats.defence;
      if (!D || !st.alive) continue;
      for (const u of st.units) {
        if (!u.alive || (u.depth ?? 0) > 1) continue;
        // a silent ship hears a missile's seeker switch on (it radiates: her ESM picks it up) and lights up her radars to fight it
        if (st.radarOn === false && st.stats.radar && st.stats.esm && this.list.some((s) => s.faction !== st.faction && s.age > 0 && (s.target || Math.hypot(s.aim.x - s.pos.x, s.aim.z - s.pos.z) < s.seeker * 1.2)
          && Math.hypot(s.pos.x - u.pos.x, s.pos.z - u.pos.z) < LIGHT_UP)) {
          st.radarOn = true;
          if (!(this.litAt?.[st.faction] > now - 20)) { (this.litAt ??= {})[st.faction] = now; g.tell(st.faction, `${st.name}: missile seekers heard — radars on, weapons free`); }
        }
        const radar = st.radarOn !== false && st.stats.radar;
        // what she sees coming: the high-flyers out to her SAMs' reach, a skimmer only over the horizon
        let nearest = null, nearestD = Infinity;
        for (const s of this.list) {
          if (s.faction === st.faction || s.age < 0) continue;
          const d = Math.hypot(s.pos.x - u.pos.x, s.pos.z - u.pos.z);
          const seen = d < EYES || (radar && d < (s.skim || s.pos.y - s.level < 12 ? SKIM_HORIZON : radar.range));
          if (!seen) continue;
          const mine = s.target === u || (!s.target && Math.hypot(s.aim.x - u.pos.x, s.aim.z - u.pos.z) < 600); // (coming for her)
          if (mine && !s.warned?.has(st.faction)) this.warn(st, u, s);
          if (D.sam) this.layer(st, u, D.sam, 'sam', s, d, now, true);
          if (D.point && mine) this.layer(st, u, D.point, 'point', s, d, now, false);
          if (mine && d < nearestD) { nearest = s; nearestD = d; }
        }
        if (nearest && D.ciws && nearestD < D.ciws.range) this.gun(st, u, D.ciws, nearest, dt);
        // enemy aircraft in her area SAMs' reach (her radar on): shot at again and again while they stay
        if (D.sam && radar) for (const a of g.air?.sorties ?? []) {
          if (a.faction === st.faction || !a.airborne) continue;
          const d = Math.hypot(a.pos.x - u.pos.x, a.pos.z - u.pos.z);
          if (d < D.sam.range) this.layer(st, u, D.sam, 'sam', a, d, now, true, true);
        }
        // chaff: a seeker on her, close — a cloud off her beam, and every seeker near it may take it instead
        if (D.chaff && nearest?.target === u && nearestD < 1600 && (u.chaffLeft ?? D.chaff.count) > 0 && !(u.chaffAt > now - D.chaff.cooldown)) {
          u.chaffLeft = (u.chaffLeft ?? D.chaff.count) - 1;
          u.chaffAt = now;
          const side = Math.random() < 0.5 ? -1 : 1, bx = Math.cos(u.yaw) * side, bz = -Math.sin(u.yaw) * side;
          const c = { x: u.pos.x + bx * 90, z: u.pos.z + bz * 90, y: u.pos.y + 25, faction: st.faction, until: now + CHAFF_LIFE };
          this.chaff.push(c);
          this.chaffPuff(c);
          g.netEvent('chaff', Math.round(c.x), Math.round(c.y), Math.round(c.z), c.faction);
          g.audio?.play(`${st.faction}.mortar`, u.pos, { volume: 0.5, throttle: 0.5 }); // (the chaff rockets' pop)
          for (const s of this.list) if (s.target === u) this.seek(s); // (seduced — or not: CHAFF_FOOLS, rolled per missile and cloud)
        }
      }
    }
  }

  /** "Vampire!" — her side is told once per raid that missiles are coming at her, and the klaxon sounds. */
  warn(st, u, s) {
    const g = this.game, now = g.time;
    (s.warned ??= new Set()).add(st.faction);
    if (this.warnedAt?.[st.faction] > now - 6) return; // (one call for a salvo)
    (this.warnedAt ??= {})[st.faction] = now;
    const n = Math.max(1, this.list.filter((m) => m.faction !== st.faction && Math.hypot(m.pos.x - u.pos.x, m.pos.z - u.pos.z) < 5000).length);
    const brg = Math.round(((Math.atan2(s.pos.x - u.pos.x, s.pos.z - u.pos.z) * 180) / Math.PI + 360) % 360);
    g.tell(st.faction, `${st.name}: vampire, vampire — ${n} missile${n > 1 ? 's' : ''} inbound, bearing ${brg}°`);
    if (st.faction === g.playerFaction) g.audio?.play('klaxon', u.pos, { volume: 0.7, throttle: 4 });
  }

  /** A missile layer: one more interceptor at `s` if a channel is free, it's in reach and not already covered. */
  layer(st, u, L, key, s, d, now, area, air = false) {
    if (d > L.range || (s.engaged ?? 0) >= 2) return;
    if (air) s.engaged ??= 0;
    // one shot each: an area layer's at it once (`shots`: Aegis twice) for the whole group, a ship's point layer once for herself
    if (!air && (area ? (s.areaShots ?? 0) >= (L.shots ?? 1) : (s.pointBy ??= new Set()).has(u))) return;
    const busy = this.interceptors.reduce((n, i) => n + (i.from === u && i.layer === key ? 1 : 0), 0);
    if (busy >= L.channels) return;
    if ((u[`${key}Left`] ?? L.load) <= 0 || u[`${key}At`] > now - L.reload) return;
    if (air) { /* (an aircraft: as long as it stays in reach) */ } else if (area) s.areaShots = (s.areaShots ?? 0) + 1; else s.pointBy.add(u);
    u[`${key}Left`] = (u[`${key}Left`] ?? L.load) - 1;
    u[`${key}At`] = now;
    s.engaged++;
    _p.set(u.pos.x, u.pos.y + (st.stats.height ?? 10) * 0.8, u.pos.z);
    if (!air && s.id) this.game.netEvent('mslsam', Math.round(_p.x), Math.round(_p.y), Math.round(_p.z), s.id, L.speed);
    this.interceptors.push({ pos: _p.clone(), dir: new THREE.Vector3(0, 1, 0), target: s, air, from: u, layer: key, speed: L.speed, pk: L.pk * (s.skim ? 0.75 : 1) * (air ? 0.8 : 1), age: 0 }); // (a sea-skimmer: low in the clutter, a harder shot; an aircraft jinks and jams)
    this.game.audio?.play(`${st.faction}.sam`, _p, { volume: 0.7, throttle: 0.2 });
  }

  flyInterceptors(dt) {
    const g = this.game;
    for (let i = this.interceptors.length - 1; i >= 0; i--) {
      const m = this.interceptors[i];
      m.age += dt;
      const t = m.target;
      const live = m.air ? t.airborne : this.list.includes(t);
      if (!live || m.age > 12) { this.interceptors.splice(i, 1); if (live) t.engaged--; continue; }
      // lead the missile: where it will be when we get there
      const dist = m.pos.distanceTo(t.pos);
      _d.copy(t.pos).addScaledVector(t.dir, t.speed * Math.min(2, dist / m.speed)).sub(m.pos).normalize();
      m.dir.lerp(_d, Math.min(1, dt * (m.age < 0.6 ? 2 : 6))).normalize();
      m.pos.addScaledVector(m.dir, m.speed * dt);
      g.effects.trail(m.pos, m.dir);
      if (dist < m.speed * dt * 1.5 + 4) {
        this.interceptors.splice(i, 1);
        t.engaged--;
        g.effects.explosion(m.pos, 0.6, { ground: false, fire: 0.8 });
        g.audio?.play('explosion.far', m.pos, { volume: 0.6, throttle: 0.1 });
        if (!m.remote && Math.random() < m.pk) { if (m.air) t.hit(6); else this.kill(t); } // (an aircraft: a hit brings it down — a big one takes two)
      }
    }
  }

  /** The last-ditch gun: a stream of tracer at it, a chance a second to blow it apart. */
  gun(st, u, C, s, dt) {
    const g = this.game;
    u.ciwsT = (u.ciwsT ?? 0) - dt;
    if (u.ciwsT <= 0) {
      u.ciwsT = 0.08;
      _p.set(u.pos.x, u.pos.y + (st.stats.height ?? 10) * 0.7, u.pos.z);
      _d.subVectors(s.pos, _p);
      const len = _d.length();
      _d.x += (Math.random() - 0.5) * len * 0.02; _d.y += (Math.random() - 0.5) * len * 0.02; _d.z += (Math.random() - 0.5) * len * 0.02;
      g.projectiles?.spawn({ origin: _p, dir: _d.normalize(), speed: 1100, damage: 0, faction: st.faction, color: st.boltColor, size: 0.7, source: st, life: len / 1100 + 0.1, tracer: true });
      if (!(u.ciwsSnd > g.time)) { u.ciwsSnd = g.time + 1.2; g.audio?.play('jet.gau8', _p, { volume: 0.7, rate: 1.6 }); } // (Phalanx, AK-630: the gatling's tearing burst)
    }
    if (Math.random() < C.pk * dt) this.kill(s);
  }

  kill(s) {
    const i = this.list.indexOf(s);
    if (i < 0) return;
    this.list.splice(i, 1);
    this.gone(s, 2);
    this.game.effects.explosion(s.pos, 1, { ground: false, fire: 1.2 });
    this.game.audio?.play('explosion', s.pos, { volume: 0.7, throttle: 0.1 });
  }
}
