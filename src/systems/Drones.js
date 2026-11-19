// Drones (2027): small machines over the battlefield that the teams on the ground fly. A unit's
// `stats.drone` { kind, count, every, range } — the team launches one when it has a target, every
// `every` s while it has `count` left (a recon drone: one up at a time, another when it is lost):
//   recon  — a quadcopter climbs over the enemy nearest the team (or out ahead toward the enemy's
//            base) and circles there: everyone it sees within `radius` is located (u.locatedUntil:
//            on your map through the fog, your guns' first choice), until its battery runs low
//   fpv    — a first-person-view drone with an RPG warhead: low and fast at a spotted enemy, a
//            vehicle first, and into its roof (no armour facing: top attack)
//   lancet — a loitering munition (Lancet, Switchblade 600, Warmate): high to the spotted vehicle or
//            gun, circling to search if it has gone, then a steep dive
// Defences: AA guns and missiles shoot them down (`antiAir` units, the guns most surely), anyone
// close under a low drone fires at it now and then; a cage (stats.cage) catches many a warhead
// short of the roof; active protection (stats.aps) shoots them down like a missile; a jammer
// (systems/Jamming.js) cuts the link — FPVs and Lancets fall out of the sky, a recon drone's
// picture goes dark.
//   usv    — 2027 at sea: an explosive sea drone (Magura V5 and the like), put over the side of a tender
//            (data/units2027/ships.js droneBoat) three at a time at a ship that has been found: low and fast
//            across the water at her, weaving, round the islands, into her side at the waterline — a heavy
//            torpedo's hit. Only the guns can touch it, and poorly (a CIWS or a RAM close in a little better);
//            each ship fights one at a time, so a swarm swamps her. Her jammer (defence.ecm) or one ashore
//            cuts its link: it stops dead in the water.
// Host-side simulation; a multiplayer guest draws what the host sends (net: `snap` / `apply`).
import * as THREE from 'three';
import { doctrine } from '../data/doctrine.js';

export const DRONE = {
  recon: { speed: 16, alt: 70, radius: 140, station: 80, hold: 4, mesh: 'quad', scale: 1.6, sound: ['drone.quad', 0.85, 0.2] },
  fpv: { speed: 30, alt: 12, damage: 950, pierce: 0.92, splash: 3, life: 40, search: 70, mesh: 'quad', scale: 1.2, sound: ['drone.quad', 2.1, 0.3] }, // (a racing quad's whine: high)
  usv: { speed: 22, alt: 0, damage: 2600, pierce: 0.7, splash: 4, life: 320, search: 2500, mesh: 'usv', scale: 1, sound: ['engine.dieselSmall', 1.8, 0.35] }, // (40 knots; ~5.5 m)
  lancet: { speed: 44, alt: 75, damage: 1500, pierce: 0.95, splash: 3.5, life: 100, search: 240, mesh: 'wing', scale: 1, sound: ['drone.lancet', 1, 0.24] },
};
const TICK = 0.25;
const RESTOCK = { field: 5, base: 4, radius: 200 }; // a drone back every 5 × `every` s in the field (FPV: a minute), four times as fast near the base
const MAX = 96;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _w = new THREE.Vector3();
const _near = [];
const NO_DIR = { x: 0, z: 0 };
const USV_JAM = 700; // m: how close a ship's jammer reaches a sea drone's link

function quadGeometry() {
  const parts = [new THREE.BoxGeometry(0.22, 0.09, 0.32)];
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
    const arm = new THREE.BoxGeometry(0.04, 0.03, 0.34);
    arm.rotateY(Math.atan2(x, z));
    arm.translate(x / 2, 0, z / 2);
    const rotor = new THREE.CylinderGeometry(0.13, 0.13, 0.01, 10);
    rotor.translate(x, 0.05, z);
    parts.push(arm, rotor);
  }
  return merge(parts);
}
function wingGeometry() {
  const body = new THREE.CylinderGeometry(0.1, 0.12, 1.6, 8);
  body.rotateX(Math.PI / 2);
  const nose = new THREE.ConeGeometry(0.1, 0.3, 8);
  nose.rotateX(Math.PI / 2);
  nose.translate(0, 0, 0.95);
  const parts = [body, nose];
  for (const z of [0.35, -0.55]) for (const a of [Math.PI / 4, -Math.PI / 4]) { // the X wings, front and back
    const w = new THREE.BoxGeometry(1.1, 0.02, 0.22);
    w.rotateZ(a);
    w.translate(0, 0, z);
    parts.push(w);
  }
  return merge(parts);
}
function usvGeometry() {
  const hull = new THREE.BoxGeometry(1.5, 0.5, 4.2);
  hull.translate(0, 0, -0.5);
  const bow = new THREE.ConeGeometry(0.75, 1.4, 4);
  bow.rotateX(Math.PI / 2);
  bow.rotateZ(Math.PI / 4);
  bow.scale(1, 0.45, 1);
  bow.translate(0, 0, 2.3);
  const hump = new THREE.BoxGeometry(0.8, 0.3, 1.2);
  hump.translate(0, 0.4, -1.2);
  return merge([hull, bow, hump]);
}
function merge(parts) {
  const geos = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of geos) { g.deleteAttribute('uv'); }
  const out = new THREE.BufferGeometry();
  const n = geos.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o * 3); nrm.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return out;
}

export class Drones {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.nextId = 1;
    this.t = 0;
    const mat = new THREE.MeshStandardMaterial({ color: 0x2c2e2c, roughness: 0.6, metalness: 0.2 });
    this.meshes = {
      quad: new THREE.InstancedMesh(quadGeometry(), mat, MAX),
      wing: new THREE.InstancedMesh(wingGeometry(), mat.clone(), MAX),
      usv: new THREE.InstancedMesh(usvGeometry(), new THREE.MeshStandardMaterial({ color: 0x3c4248, roughness: 0.5, metalness: 0.2 }), MAX),
    };
    for (const m of Object.values(this.meshes)) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      m.castShadow = true;
      game.scene.add(m);
    }
  }

  get client() { return !!this.game.net?.isClient; }

  update(dt) {
    if (!this.client) {
      if ((this.t += dt) >= TICK) { const step = this.t; this.t = 0; this.launches(step); this.defences(step); for (const d of this.list) this.lookAhead(d); }
      for (const d of [...this.list]) this.fly(d, dt);
    } else {
      for (const d of this.list) { d.pos.addScaledVector(d.vel, dt); if (d.to) d.pos.lerp(d.to, Math.min(1, dt * 4)); }
    }
    this.draw(dt);
  }

  // ---------------------------------------------------------------- the teams

  launches(step) {
    const g = this.game, now = g.time;
    for (const s of g.world.stacks) {
      const D = s.alive && s.stats.drone;
      if (!D || s.ai?.state === 'routed') continue;
      const op = s.units.find((u) => u.alive);
      if (!op) continue;
      s.dronesLeft ??= D.count ?? Infinity;
      this.restock(s, D, step);
      if (now < (s.droneAt ?? 0)) continue;
      if (s.dronesLeft <= 0) continue;
      if (D.kind === 'usv') { // a swarm over the side at the best ship in reach
        const t = this.pickShip(s, op.pos, D.range);
        if (!t) continue;
        const n = Math.min(D.salvo ?? 1, s.dronesLeft);
        for (let i = 0; i < n; i++) this.launch(s, op, 'usv', t, null);
        s.dronesLeft -= n;
        s.droneAt = now + D.every;
        g.tell(s.faction, `${s.name}: ${n} sea drone${n > 1 ? 's' : ''} away at the ${t.stack.name}`);
        continue;
      }
      if (D.kind === 'recon') {
        if (this.list.some((d) => d.owner === s)) continue;
        const spot = this.reconSpot(s, op, D.range);
        this.launch(s, op, 'recon', null, spot);
        s.droneAt = now + D.every;
        continue;
      }
      const target = this.pickTarget(s, op.pos, D.range, D.kind === 'lancet');
      if (!target) continue;
      this.launch(s, op, D.kind, target, null);
      s.dronesLeft--;
      s.droneAt = now + D.every * (doctrine(g, s.faction, 'dronewar')?.every ?? 1); // (Russia's drone war: faster)
    }
  }

  /**
   * Fresh drones come up with the supplies: one every RESTOCK.field × `every` s wherever the team is,
   * RESTOCK.base × as fast within RESTOCK.radius of the side's base (its label shows how many are left).
   */
  restock(s, D, step) {
    if (!Number.isFinite(D.count) || s.dronesLeft >= D.count) { s.restockT = 0; return; }
    const base = this.game.world.bases?.[s.faction], c = s.centroid;
    const home = base && Math.hypot(base.x - c.x, base.z - c.z) < RESTOCK.radius;
    s.restockT = (s.restockT ?? 0) + step * (home ? RESTOCK.base : 1);
    if (s.restockT >= D.every * RESTOCK.field) { s.restockT = 0; s.dronesLeft++; }
  }

  /** Over the enemy nearest the team that we know of, or straight out toward the enemy's base. */
  reconSpot(s, op, range) {
    const g = this.game;
    let best = null, bd = range * range;
    for (const e of g.world.stacks) {
      if (e.faction === s.faction || !e.alive) continue;
      const d = (e.centroid.x - op.pos.x) ** 2 + (e.centroid.z - op.pos.z) ** 2;
      if (d < bd && e.units.some((u) => u.alive && (u.spotted || u.locatedUntil > g.time))) { bd = d; best = e.centroid; }
    }
    if (best) return { x: best.x, z: best.z };
    const base = g.world.bases?.[s.faction === 'nato' ? 'pact' : 'nato'] ?? { x: 0, z: 0 };
    const dx = base.x - op.pos.x, dz = base.z - op.pos.z, L = Math.hypot(dx, dz) || 1, k = Math.min(range * 0.8, L);
    return { x: op.pos.x + (dx / L) * k, z: op.pos.z + (dz / L) * k };
  }

  /** A spotted enemy in reach, not already someone's drone's target: vehicles first (a Lancet: only vehicles and guns). */
  pickTarget(s, from, range, heavy, avoid = true) {
    const g = this.game;
    let best = null, bs = -Infinity;
    for (const e of g.world.stacks) {
      if (e.faction === s.faction || !e.alive || e.stats.structure || e.stats.air || e.stats.naval) continue;
      const vehicle = !e.usesCover;
      const big = vehicle || e.stats.gun; // (a Lancet: vehicles and guns first — men only when there is nothing better in reach)
      for (const u of e.units) {
        if (!u.alive || !(u.spotted || u.locatedUntil > g.time)) continue;
        const d2 = (u.pos.x - from.x) ** 2 + (u.pos.z - from.z) ** 2;
        if (d2 > range * range) continue;
        if (avoid && this.list.some((d) => d.target === u)) continue;
        const score = (vehicle ? 1000 + (e.stats.hp ?? 0) * 0.2 : 0) + (heavy && big ? 2000 : 0) - Math.sqrt(d2);
        if (score > bs) { bs = score; best = u; }
      }
    }
    return best;
  }

  /** A sea drone's target: a surfaced enemy ship found (seen or located) in reach, the biggest first. */
  pickShip(s, from, range) {
    const g = this.game;
    let best = null, bs = -Infinity;
    for (const e of g.world.stacks) {
      if (e.faction === s.faction || !e.alive || !e.stats.naval) continue;
      for (const u of e.units) {
        if (!u.alive || (u.depth ?? 0) > 1 || !(u.spotted || u.locatedUntil > g.time)) continue;
        const d = Math.hypot(u.pos.x - from.x, u.pos.z - from.z);
        const score = (e.type.hull?.length ?? 50) * 10 - d;
        if (d < range && score > bs) { bs = score; best = u; }
      }
    }
    return best;
  }

  launch(s, op, kind, target, spot) {
    const P = DRONE[kind];
    const g = this.game;
    const usv = kind === 'usv', level = g.world.river?.level ?? 0;
    const pos = usv ? new THREE.Vector3(op.pos.x + (Math.random() - 0.5) * 16, level + 0.35, op.pos.z + (Math.random() - 0.5) * 16) : new THREE.Vector3(op.pos.x, op.pos.y + 1.5, op.pos.z);
    const yaw = target ? Math.atan2(target.pos.x - pos.x, target.pos.z - pos.z) : 0;
    const d = { id: this.nextId++, kind, P, faction: s.faction, owner: s, target, spot, pos, vel: new THREE.Vector3(), age: 0, yaw, state: 'fly', orbitA: Math.random() * 6.28 };
    d.sound = g.audio?.loop?.(P.sound[0], pos, P.sound[2], 8);
    d.sound?.setRate?.(P.sound[1]);
    this.list.push(d);
    return d;
  }

  // ---------------------------------------------------------------- flight

  fly(d, dt) {
    const g = this.game, T = g.world.terrain, P = d.P;
    d.age += dt;
    if (d.kind === 'usv') return this.sail(d, dt);
    const ground = T.heightAt(d.pos.x, d.pos.z);
    if (d.state === 'fall') {
      d.vel.y -= 9.8 * dt;
      d.pos.addScaledVector(d.vel, dt);
      if (d.pos.y <= ground + 0.2) this.burst(d, null, d.kind !== 'recon' ? 0.35 : 0); // (a crashed FPV's warhead goes off where it lands)
      return;
    }
    let aim;
    if (d.kind === 'recon') {
      if (d.age > P.station) { aim = _p.set(d.owner.centroid?.x ?? d.pos.x, ground + 30, d.owner.centroid?.z ?? d.pos.z); if (d.age > P.station + 25) return this.remove(d); } // back home, its battery low
      else {
        d.orbitA += dt * 0.35;
        aim = _p.set(d.spot.x + Math.cos(d.orbitA) * 45, 0, d.spot.z + Math.sin(d.orbitA) * 45);
        aim.y = T.heightAt(aim.x, aim.z) + P.alt;
      }
    } else {
      if (d.age > P.life) return this.fall(d);
      if (!d.target?.alive) {
        d.target = this.pickTarget(d.owner, d.pos, P.search, d.kind === 'lancet', false); // the operator finds another in the camera
        if (!d.target) { // nothing: an FPV comes down, a Lancet circles and searches
          if (d.kind === 'fpv') return this.fall(d);
          d.orbitA += dt * 0.5;
          d.spot ??= { x: d.pos.x, z: d.pos.z };
          aim = _p.set(d.spot.x + Math.cos(d.orbitA) * 60, 0, d.spot.z + Math.sin(d.orbitA) * 60);
          aim.y = T.heightAt(aim.x, aim.z) + P.alt;
        }
      }
      if (d.target?.alive) {
        const t = d.target;
        const hd = Math.hypot(t.pos.x - d.pos.x, t.pos.z - d.pos.z);
        const ty = t.pos.y + (t.height ?? 2) * 0.8;
        const dive = d.kind === 'lancet' ? P.alt * 1.1 : 35;
        aim = _p.set(t.pos.x, hd > dive ? Math.max(T.heightAt(d.pos.x, d.pos.z), T.heightAt(t.pos.x, t.pos.z)) + P.alt : ty, t.pos.z);
        if (Math.hypot(hd, d.pos.y - ty) < 2.5) return this.strike(d, t);
        if (hd < 70 && !d.heard) { d.heard = true; t.stack.bark?.(t, 'drone', 1, true); } // ("Drone! Drone overhead!")
      }
    }
    // steer: toward the aim at its speed (a Lancet diving: faster), never into the ground
    _w.subVectors(aim, d.pos);
    const L = _w.length() || 1;
    const sp = P.speed * (d.kind === 'lancet' && d.target && aim.y < d.pos.y - 10 ? 1.5 : 1);
    _w.multiplyScalar(Math.min(sp, L / dt) / L);
    d.vel.lerp(_w, Math.min(1, dt * (d.kind === 'lancet' ? 2 : 4)));
    d.pos.addScaledVector(d.vel, dt);
    const close = d.target && Math.hypot(d.target.pos.x - d.pos.x, d.target.pos.z - d.pos.z) < 6; // (the last metres: down onto it)
    const ground1 = T.heightAt(d.pos.x, d.pos.z) + 1, over = close ? -Infinity : (d.over ?? -Infinity) + 2.5; // over the roofs and treetops ahead (lookAhead), never through them
    if (d.pos.y < ground1) d.pos.y = ground1;
    if (d.pos.y < over) { d.pos.y = Math.min(over, d.pos.y + 14 * dt); if (d.vel.y < 0) d.vel.y = 0; }
    if (Math.hypot(d.vel.x, d.vel.z) > 0.5) d.yaw = Math.atan2(d.vel.x, d.vel.z);
    d.sound?.setPos?.(d.pos);
    if (d.kind === 'recon' && !d.dark && d.age < P.station) this.watch(d);
  }

  /** A sea drone: low over the water at its ship, led a little, weaving; round the land ahead; into her side. */
  sail(d, dt) {
    const g = this.game, T = g.world.terrain, P = d.P, level = g.world.river?.level ?? 0;
    if (d.age > P.life) return this.fall(d);
    if (!d.target?.alive || (d.target.depth ?? 0) > 1) d.target = this.pickShip(d.owner, d.pos, P.search); // (the operator picks another in the camera)
    const t = d.target;
    if (t) d.spot = { x: t.pos.x, z: t.pos.z };
    const goal = t?.pos ?? d.spot; // (her gone: on to where she was, looking for another)
    const dist = Math.hypot(goal.x - d.pos.x, goal.z - d.pos.z), lead = t ? Math.min(20, dist / P.speed) * 0.8 : 0;
    if (!t && dist < 80) return this.fall(d);
    let want = Math.atan2(goal.x + (t?.vel?.x ?? 0) * lead - d.pos.x, goal.z + (t?.vel?.z ?? 0) * lead - d.pos.z);
    if (dist > 300) want += Math.sin(d.age * 0.9 + d.orbitA) * 0.3; // (weaving: a harder shot for the guns)
    // land or shallows ahead: the first heading either side that is open water (ponytail: a feeler, not a path — a long island can still trap it)
    for (const k of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) if (T.heightAt(d.pos.x + Math.sin(want + k) * 40, d.pos.z + Math.cos(want + k) * 40) < level - 0.8) { want += k; break; }
    d.yaw += Math.max(-1.4 * dt, Math.min(1.4 * dt, Math.atan2(Math.sin(want - d.yaw), Math.cos(want - d.yaw))));
    d.vel.set(Math.sin(d.yaw) * P.speed, 0, Math.cos(d.yaw) * P.speed);
    d.pos.addScaledVector(d.vel, dt);
    d.pos.y = level + 0.35 + Math.sin(d.age * 9 + d.orbitA) * 0.08; // (slamming through the chop)
    d.sound?.setPos?.(d.pos);
    if ((d.wakeT = (d.wakeT ?? 0) - dt) <= 0) { d.wakeT = 0.12; g.effects.smoke?.spawn(d.pos.x - d.vel.x * 0.12, level + 0.3, d.pos.z - d.vel.z * 0.12, { vx: 0, vy: 0.3, vz: 0, size: 0.9, grow: 1.4, life: 1.6, alpha: 0.5, color: 0xf2f4f4, drag: 1, wind: 0.3 }); }
    if (T.heightAt(d.pos.x, d.pos.z) > level - 0.3) return this.burst(d, null, 0.4); // (run up on the rocks)
    if (t && g.missiles?.hits({ pos: d.pos, dir: NO_DIR }, t)) this.strike(d, t);
  }

  /** What stands in its way: the highest roof, wall or treetop under it and up to 1.5 s ahead (4 times a second). */
  lookAhead(d) {
    if (d.state !== 'fly') return;
    const c = this.game.cover;
    let top = -Infinity;
    for (const k of [0, 0.5, 1, 1.5]) {
      const x = d.pos.x + d.vel.x * k, z = d.pos.z + d.vel.z * k;
      top = Math.max(top, c.topAt?.(x, z, 3) ?? -Infinity);
      for (const f of c.forests ?? []) top = Math.max(top, f.topAt?.(x, z, 1.5) ?? -Infinity);
    }
    d.over = top;
  }

  /** A recon drone's camera: every enemy under it located for a few seconds. */
  watch(d) {
    if ((d.watchT = (d.watchT ?? 0) - TICK / 2) > 0) return;
    d.watchT = 0.5;
    const g = this.game, r2 = d.P.radius ** 2;
    const mark = doctrine(g, d.faction, 'sensor'); // (the US Army's sensor-to-shooter)
    for (const s of g.world.stacks) {
      if (s.faction === d.faction || !s.alive || s.stats.naval) continue;
      for (const u of s.units) {
        if (!u.alive || (u.pos.x - d.pos.x) ** 2 + (u.pos.z - d.pos.z) ** 2 >= r2) continue;
        u.locatedUntil = Math.max(u.locatedUntil ?? 0, g.time + d.P.hold);
        if (mark) { s.markedUntil = g.time + mark.mark; s.markDamage = mark.damage; }
      }
    }
  }

  // ---------------------------------------------------------------- defences

  defences(step) {
    const g = this.game, busy = new Set();
    for (const d of [...this.list]) {
      if (d.state !== 'fly') continue;
      if (d.kind === 'usv') { this.seaDefence(d, step, busy); continue; }
      // a jammer: the link is cut
      const jammed = g.jamming?.jammed(d.faction, d.pos.x, d.pos.z) || this.trenchJam(d);
      d.dark = d.kind === 'recon' && jammed;
      if (jammed && d.kind !== 'recon' && Math.random() < step * (d.kind === 'fpv' ? 0.45 : 0.2)) { this.fall(d, true); continue; }
      // ground fire
      const agl = d.pos.y - g.world.terrain.heightAt(d.pos.x, d.pos.z);
      for (const s of g.world.stacks) {
        if (s.faction === d.faction || !s.alive) continue;
        const aa = s.stats.antiAir;
        const dx = s.centroid.x - d.pos.x, dz = s.centroid.z - d.pos.z, dist = Math.hypot(dx, dz);
        let p = 0;
        const small = d.kind === 'fpv'; // (an FPV: too small and low for a missile's seeker, hard even for the radar guns)
        if (aa && !(aa.missile && small) && dist < aa.range * (small ? 0.45 : aa.missile ? 1 : 0.8)) p = small ? 0.2 : aa.missile ? 0.3 : 0.45; // radar AA guns, missiles
        else if (agl < 25 && dist < 45 && s.units.some((u) => u.alive)) p = s.usesCover ? 0.08 : 0.05; // rifles, the tank's machine gun
        if (!p || Math.random() > p * step) continue;
        const u = s.units.find((m) => m.alive);
        if (u) this.tracer(u, d, !!aa && !aa.missile);
        this.shotDown(d);
        break;
      }
    }
  }

  /**
   * A sea drone under fire: a jammer (the ship's, or one ashore) may cut its link; the guns of each enemy ship in reach
   * shoot at one drone at a time (`busy`) — a poor chance, better for a CIWS and point missiles close in.
   */
  seaDefence(d, step, busy) {
    const g = this.game;
    if (g.jamming?.jammed(d.faction, d.pos.x, d.pos.z) && Math.random() < step * 0.3) return this.fall(d, true);
    for (const s of g.world.stacks) {
      if (s.faction === d.faction || !s.alive || !s.stats.naval || s.stats.submarine || busy.has(s)) continue;
      const u = s.units[0];
      if (!u?.alive) continue;
      const dist = Math.hypot(u.pos.x - d.pos.x, u.pos.z - d.pos.z), D = s.stats.defence ?? {};
      if (D.ecm && dist < USV_JAM && Math.random() < step * D.ecm * 0.15) return this.fall(d, true);
      let p = dist < 1200 ? 0.02 : 0; // (the guns: something small, low in the waves and quick)
      if (D.point && dist < D.point.range) p += 0.03;
      if (D.ciws && dist < D.ciws.range) p += 0.06;
      if (!p) continue;
      busy.add(s);
      if (Math.random() < 0.5) this.tracer(u, d, true);
      if (Math.random() < p * step) {
        g.effects.waterSplash?.({ x: d.pos.x, y: d.pos.y, z: d.pos.z }, 2);
        this.shotDown(d);
      }
      return; // (one ship's guns on it this tick: the rest are busy with the others)
    }
  }

  /** A trench jammer (stats.droneJam, the sappers carry one) near a drone low enough to hear it. */
  trenchJam(d) {
    if (d.pos.y - this.game.world.terrain.heightAt(d.pos.x, d.pos.z) > 40) return false;
    for (const s of this.game.world.stacks) {
      const J = s.alive && s.faction !== d.faction && s.stats.droneJam;
      if (J && (s.centroid.x - d.pos.x) ** 2 + (s.centroid.z - d.pos.z) ** 2 < J.radius * J.radius) return true;
    }
    return false;
  }

  tracer(u, d, burst) {
    const g = this.game;
    _p.set(u.pos.x, u.pos.y + 2, u.pos.z);
    _w.subVectors(d.pos, _p);
    const len = _w.length();
    for (let i = 0; i < (burst ? 4 : 1); i++) {
      g.projectiles.spawn({ origin: _p, dir: _w.clone().normalize().add(new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, 0)).normalize(), speed: 600, damage: 0, faction: u.faction, color: u.stack.boltColor, size: 0.8, life: len / 600, tracer: true });
    }
    g.audio?.weapon?.(u.faction, burst ? 'autocannon' : 'mg', _p);
  }

  shotDown(d) {
    this.game.effects.explosion(d.pos, 0.3, { ground: false });
    this.fall(d);
  }

  fall(d, jammed = false) {
    if (d.state === 'fall') return;
    this.game.bus.emit('drone:down', { faction: d.faction, kind: d.kind, jammed }); // (boot camp counts the jammed ones)
    d.state = 'fall';
    d.vel.multiplyScalar(0.4);
    d.sound?.stop?.();
    d.sound = null;
    if (d.kind === 'usv') this.remove(d); // (dead in the water, or gone up: nothing to fall)
  }

  // ---------------------------------------------------------------- the strike

  strike(d, t) {
    const g = this.game, s = t.stack, P = d.P, now = g.time;
    if (d.kind === 'usv') { // into her side at the waterline: as a torpedo (systems/Torpedoes.js)
      const sp = Math.hypot(d.vel.x, d.vel.z) || 1;
      t.receiveDamage(P.damage * (1 - (s.stats.armor ?? 0) * 0.5) * (d.owner?.units?.find((u) => u.alive)?.damageMult ?? 1), d.owner?.alive ? d.owner : null, P.pierce, { x: d.vel.x / sp, z: d.vel.z / sp }, 1);
      if (t.alive) s.shipHit?.(t, 0, true);
      g.effects.waterSplash?.({ x: d.pos.x, y: d.pos.y, z: d.pos.z }, 6);
      g.tell(s.faction, `${s.name}: sea drone hit!`);
      return this.burst(d, t, 1.8, true);
    }
    let dmg = P.damage;
    if (!s.usesCover) {
      const aps = s.stats.aps;
      if (aps) { // Trophy / Arena: shot down a few metres out, as a missile is (combat/ProjectileSystem.js aps)
        if (now - (t.apsUsedAt ?? -1e9) > 90) t.apsLeft = aps.charges;
        if (t.apsLeft > 0 && now >= (t.apsReady ?? 0)) {
          t.apsLeft--; t.apsUsedAt = now; t.apsReady = now + 0.6;
          if (Math.random() < aps.chance * 0.85) { g.bus.emit('aps', { stack: s, unit: t, left: t.apsLeft }); return this.burst(d, null, 0.4); }
        }
      }
      if (s.stats.cage && Math.random() < 0.5) dmg *= 0.25; // caught on the bars: the jet spends itself short of the roof
    }
    dmg *= d.owner?.units?.find((u) => u.alive)?.damageMult ?? 1; // (boot camp's targets: their drones do no harm)
    t.receiveDamage(dmg, d.owner?.alive ? d.owner : null, P.pierce, null, 1); // (no facing: down through the roof)
    this.burst(d, t, 1, true);
  }

  /** The warhead goes off at the drone: splinters for anyone near (`size` 0: nothing to go off). */
  burst(d, direct, size, hit = false) {
    const g = this.game;
    if (size > 0) {
      g.effects.explosion(d.pos, size, { ground: d.pos.y - g.world.terrain.heightAt(d.pos.x, d.pos.z) < 1.5, soot: hit && !!direct && !direct.stack.usesCover });
      g.audio?.play('explosion', d.pos, { volume: 0.7, throttle: 0.05 });
      const r = d.P.splash ?? 2;
      for (const u of g.world.neighbors(d.pos, r + 1, _near)) {
        if (u === direct || !u.alive || u.faction === d.faction || !u.stack.usesCover) continue;
        const dist = Math.hypot(u.pos.x - d.pos.x, u.pos.z - d.pos.z);
        if (dist < r) u.receiveDamage(120 * size * (1 - dist / r) * (d.owner?.units?.find((m) => m.alive)?.damageMult ?? 1), d.owner?.alive ? d.owner : null, 0, null, 1);
      }
      for (const u of g.world.neighbors(d.pos, r * 3, _near)) if (u.alive && u.faction !== d.faction) u.suppress?.(0.5);
    }
    this.remove(d);
  }

  remove(d) {
    d.sound?.stop?.();
    const i = this.list.indexOf(d);
    if (i >= 0) this.list.splice(i, 1);
  }

  // ---------------------------------------------------------------- looks and the net

  draw() {
    const counts = { quad: 0, wing: 0, usv: 0 };
    for (const d of this.list) {
      const m = this.meshes[d.P.mesh], i = counts[d.P.mesh]++;
      if (i >= MAX) continue;
      const pitch = d.kind === 'usv' ? -0.06 : d.kind === 'lancet' ? -Math.atan2(d.vel.y, Math.hypot(d.vel.x, d.vel.z) || 1) : Math.min(0.4, Math.hypot(d.vel.x, d.vel.z) * 0.015);
      _m.compose(d.pos, _q.setFromEuler(_e.set(pitch, d.yaw, 0, 'YXZ')), _s.setScalar(d.P.scale));
      m.setMatrixAt(i, _m);
    }
    for (const [k, m] of Object.entries(this.meshes)) { m.count = Math.min(MAX, counts[k]); m.instanceMatrix.needsUpdate = true; }
  }

  /** The host's drones for its state message. */
  snap() {
    const r = (v) => Math.round(v * 10) / 10;
    return this.list.map((d) => [d.id, d.kind, r(d.pos.x), r(d.pos.y), r(d.pos.z), r(d.vel.x), r(d.vel.y), r(d.vel.z)]);
  }

  /** A guest: the host's drones (gone ones low over the ground went off there). */
  apply(list) {
    const seen = new Set();
    for (const [id, kind, x, y, z, vx, vy, vz] of list ?? []) {
      seen.add(id);
      let d = this.list.find((o) => o.id === id);
      if (!d) {
        d = { id, kind, P: DRONE[kind], pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), yaw: 0 };
        d.sound = this.game.audio?.loop?.(d.P.sound[0], d.pos, d.P.sound[2], 8);
        d.sound?.setRate?.(d.P.sound[1]);
        this.list.push(d);
      }
      d.to = new THREE.Vector3(x, y, z);
      d.vel.set(vx, vy, vz);
      if (Math.hypot(vx, vz) > 0.5) d.yaw = Math.atan2(vx, vz);
      d.sound?.setPos?.(d.pos);
    }
    for (const d of [...this.list]) {
      if (seen.has(d.id)) continue;
      if (d.kind !== 'recon' && d.pos.y - this.game.world.terrain.heightAt(d.pos.x, d.pos.z) < 6) this.game.effects.explosion(d.pos, 1, { ground: true });
      this.remove(d);
    }
  }
}
