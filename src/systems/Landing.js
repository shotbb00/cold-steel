// Landing craft on a coastal map (Omaha): how the side that lands gets its men and vehicles ashore.
// Whatever that side buys for the land (modes/shared.js makeBuyer) doesn't appear at its base out at
// sea: it comes in a landing craft — a squad in a Higgins boat (LCVP), a vehicle in an LCT — launched
// at the sea edge off the beach sector it was sent to (the base's `entries`: Dog, Easy, Fox). The craft
// runs straight in until she grounds (her `draft`), drops the ramp, and what she carried comes out and
// wades up onto the dry sand; then she backs off and goes back out to sea (and off the map). Sunk on
// the way in, she takes it with her. Only CRAFT craft per side are on a run at once.
// The map's `landing.waves` come in on their own at their times (the first: H-hour, at the start).
// The water off the beach (coastal step 4):
//   sea mines  the map's `landing.seaMines`: a band of moored mines across the approach, with swept
//              lanes off each sector (marked by dan buoys, red and green). A ship or craft that runs onto
//              one is holed (a craft: sunk). A minesweeper (`stats.sweeper`: her sweep's reach, m) cuts
//              every mine she passes, wherever she goes.
//   obstacles  the map's `landing.obstacles` on the tidal flat: hedgehogs, Belgian gates, ramped stakes,
//              many with a mine on top. Dry at low water (cover for the men crossing the sand); under
//              the water (the tide, coastal step 6) a craft runs onto them unseen: a mine sinks her,
//              the rest stop her short, and her men wade in from there.
import * as THREE from 'three';
import { UNIT_TYPES } from '../data/units/index.js';
import { forArmy } from '../data/factions.js';
import { mulberry32 } from '../core/math.js';
import { TIDE } from '../world/Sea.js';
import { P, merge } from '../data/units/geometry.js';

const SWAMP = 0.0032;          // a DD tank's chance a second of being swamped (times the sea state squared): at Omaha most went down
const DD_START = 40;           // m inshore of the mine band where the LCTs launch them

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const CRAFT = 12;       // craft on a run at once, per side (the H-hour wave takes nine)
const RAMP = 1.6;              // s for the ramp to come down (and as long to go back up)
const UNLOAD = 3;              // s with the ramp down before she backs off
const BACK = 40;               // m she backs off before she turns for the sea
const MINE_REACH = 7;          // m from a sea mine to a hull (plus her radius) that sets it off
const MINE_DAMAGE = 1700;      // a destroyer badly holed (flooding: she may still go down), a craft gone
const OBSTACLE_MINE = 500;     // a Teller mine on a stake: a Higgins boat gone, an LCT holed

export class Landing {
  constructor(game) {
    this.game = game;
    this.runs = [];
    this.count = {};
    this.waves = (game.map.landing?.waves ?? []).map((w) => ({ ...w, done: false }));
    this.mines = this.layMines(game.map.landing?.seaMines);
    this.obstacles = (game.map.landing?.obstacles ?? []).map((o, i) => ({ ...o, i }));
    this.drawObstacles();
    this.sweptN = 0;
    game.bus.on('stack:destroyed', (s) => {
      const r = this.runs.find((q) => q.craft === s);
      if (!r) return;
      this.runs.splice(this.runs.indexOf(r), 1);
      if (r.phase === 'in' || r.phase === 'ramp') game.tellBoth?.(s.faction, `${s.type.shortName} sunk with ${r.cargo.name} aboard`, `A landing craft sunk with ${r.cargo.name} aboard`);
    });
  }

  /**
   * The beach obstacles, one instanced mesh a kind (and one for the Teller mines on top), with their cover for the men
   * crossing the sand: so a blown one can go — its instance shrunk to nothing, its cover gone (hideObstacle).
   */
  drawObstacles() {
    const g = this.game, RUST = 0x4a3a2e, WOOD = 0x5a4a38;
    const geo = {
      hedgehog: merge([0, 1, 2].map((k) => P.box(0.14, 1.9, 0.14, { y: 0.62, ry: k * Math.PI / 3 * 2, rx: k === 2 ? 0 : 0.95, rz: k === 2 ? 0.95 : 0, color: RUST }))),
      gate: merge([
        P.box(3, 0.12, 0.12, { y: 1.4, color: RUST }), P.box(3, 0.12, 0.12, { y: 2.7, color: RUST }),
        ...[-1.4, 0, 1.4].map((x) => P.box(0.12, 2.8, 0.12, { x, y: 1.4, color: RUST })),
        P.box(0.1, 2.6, 0.1, { y: 1.2, z: -1.1, rx: 0.7, color: RUST }), P.box(2.8, 0.08, 0.08, { y: 0.3, z: -1.6, color: RUST }),
      ]),
      stake: merge([P.box(0.25, 2.6, 0.25, { y: 1.1, rx: 0.5, color: WOOD })]),
      mine: merge([P.cyl(0.17, 0.17, 0.1, { color: 0x3a3e32 }, 10)]),
    };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.75 });
    const r = mulberry32(44), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    this.obMesh = {};
    for (const kind of Object.keys(geo)) {
      const list = this.obstacles.filter((o) => (kind === 'mine' ? o.mine : o.kind === kind));
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(geo[kind], mat, list.length);
      mesh.castShadow = true;
      list.forEach((o, n) => {
        const y = g.terrain.heightAt(o.x, o.z), yaw = (o.yaw ??= r() * 0.6 - 0.3 + (o.kind === 'hedgehog' ? r() * 3 : 0));
        const top = kind === 'mine' ? (o.kind === 'gate' ? 2.85 : o.kind === 'stake' ? 2.2 : 1.6) : 0;
        q.setFromAxisAngle(up, yaw);
        m.compose(new THREE.Vector3(o.x, y + top, o.z + (kind === 'mine' && o.kind === 'stake' ? 0.55 : 0)), q, one);
        mesh.setMatrixAt(n, m);
        (o.slots ??= []).push([mesh, n]);
      });
      mesh.instanceMatrix.needsUpdate = true;
      g.scene.add(mesh);
      this.obMesh[kind] = mesh;
    }
    for (const o of this.obstacles) { // (cover: a hedgehog or a gate to lie behind; a stake is too thin)
      if (o.kind === 'hedgehog') o.collider = g.cover.addCylinder({ x: o.x, z: o.z, radius: 0.7, height: 1.2, spots: false });
      else if (o.kind === 'gate') o.collider = g.cover.addBox({ x: o.x, z: o.z, yaw: o.yaw, length: 3, thickness: 0.4, height: 2.6, spots: false });
    }
  }

  /** A blown obstacle: gone from the sand (`mineOnly`: the mine on it went up, the obstacle stands). Host and guest alike. */
  hideObstacle(o, mineOnly = false) {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const [mesh, n] of o.slots ?? []) {
      if (mineOnly && mesh !== this.obMesh.mine) continue;
      mesh.setMatrixAt(n, zero);
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (!mineOnly && o.collider) { this.game.cover.remove(o.collider); o.collider = null; }
    if (!o.gone) this.game.netEvent?.('beach', o.i, mineOnly ? 1 : 0);
    o.gone = !mineOnly;
  }

  /** On a multiplayer guest, each frame: the tide (by the clock: no route grid here, the host does the moving). */
  clientUpdate() { this.tide(true); }

  /** The moored mines (seeded: host and guest lay the same), and the dan buoys along the swept lanes. */
  layMines(o) {
    if (!o) return [];
    const g = this.game, r = mulberry32(o.seed ?? 6), bx = g.world.bounds.x, [z0, z1] = o.z;
    const inLane = (x) => o.lanes.some((lx) => Math.abs(x - lx) < o.lane);
    const mines = [];
    for (let i = 0; mines.length < o.count && i < o.count * 20; i++) {
      const x = (r() * 2 - 1) * bx, z = z0 + r() * (z1 - z0);
      if (!inLane(x)) mines.push({ x, z, live: true });
    }
    // the dan buoys: each lane's edges, red to port and green to starboard coming in
    const level = g.world.river.level;
    const geo = new THREE.ConeGeometry(0.9, 2.4, 8), pole = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 5);
    const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
    const red = mat(0xb8321e), green = mat(0x2e7a3a), dark = mat(0x222222);
    for (const lx of o.lanes) for (const side of [-1, 1]) for (let z = z0 - 10; z <= z1 + 10; z += (z1 - z0 + 20) / 3) {
      const b = new THREE.Mesh(geo, side < 0 ? green : red);
      b.position.set(lx + side * o.lane, level + 0.9, z);
      const p = new THREE.Mesh(pole, dark);
      p.position.set(0, 1.9, 0);
      b.add(p);
      g.scene.add(b);
    }
    return mines;
  }

  /**
   * Pilotage: a warship's next step (`way`, UnitStack.updateUnit) kept to the swept lanes — the buoys mark them, every
   * captain keeps to them. A move that would take her into or across the mine band goes by the nearest lane: to its
   * mouth, then straight down the middle of it, then on. A minesweeper goes where she's sent (that's her job), as do craft.
   */
  pilot(s, u, way) {
    const o = this.game.map.landing?.seaMines;
    u.piloting = false;
    if (!o || s.stats.sweeper || s.stats.landingCraft || !this.mines.some((m) => m.live)) { s.transit = null; return way; }
    const [b0, b1] = o.z, M = 22, mid = (b0 + b1) / 2;
    const sign = Math.sign(this.game.map.bases[s.faction]?.z ?? 1) || 1;
    const z = u.pos.z * sign;
    const W = (x, zz) => ({ x, z: zz * sign });
    // a passage begun is finished: to the mouth, then along the lane's centre line (steering at a point ahead on it:
    // a ship can't turn onto a spot, she converges on a line) and out the far side — whatever else she's told meanwhile
    if (s.transit) {
      const t = s.transit, mouthZ = t.dir < 0 ? b1 + M + 120 : b0 - M - 120, outZ = t.dir < 0 ? b0 - M - 15 : b1 + M + 15;
      if (t.dir < 0 ? z < outZ : z > outZ) s.transit = null; // (through)
      else {
        u.piloting = true;
        if (!t.line && Math.abs(u.pos.x - t.lane) < 35) t.line = true; // (lined up: only then down the lane)
        return t.line ? W(t.lane, z + t.dir * 70) : W(t.lane, mouthZ);
      }
    }
    const goal = s.moveTarget ?? way; // (where she's going, not the route's next corner: that cuts through the mines)
    const wz = goal.z * sign;
    const near = (q) => q > b0 - M && q < b1 + M;
    const side = z > mid ? 1 : -1, wside = wz > mid ? 1 : -1;
    if (!near(z) && !near(wz) && side === wside) return way; // (nowhere near the mines)
    u.piloting = z > b0 - M - 300 && z < b1 + M + 300; // (close to them: slow ahead, a tight turn — UnitStack)
    const cost = (x) => Math.abs(x - u.pos.x) + 2 * Math.abs(x - goal.x);
    const lane = o.lanes.reduce((a, x) => (cost(x) < cost(a) ? x : a), o.lanes[0]);
    const inLane = (x) => Math.abs(x - lane) < o.lane - 18;
    if (near(z) && !inLane(u.pos.x)) { // off the lane at (or in) the band: back out the way she came if she can, else on
      return Math.abs(z - (side > 0 ? b1 : b0)) < 45 ? W(u.pos.x, side > 0 ? b1 + M + 60 : b0 - M - 60) : way;
    }
    if (side === wside && near(z)) return W(lane, side > 0 ? b1 + M + 15 : b0 - M - 15); // (in the lane, going back the way she came: out)
    if (side === wside) return way;                                                    // (her goal's at the band's edge on her side: fine)
    s.transit = { lane, dir: -side, line: near(z) }; // (in the lane already: straight on along it)
    return this.pilot(s, u, way);
  }

  /** The water off the beach, every step: mines cut by a sweeper, mines and obstacles struck. */
  waters() {
    const g = this.game, level = g.world.river.level;
    const ships = g.world.stacks.filter((s) => s.alive && s.stats.naval);
    const sweepers = ships.filter((s) => s.stats.sweeper).map((s) => s.units[0]).filter((u) => u?.alive && Math.hypot(u.vel.x, u.vel.z) > 1);
    let cut = 0;
    for (const m of this.mines) {
      if (!m.live) continue;
      if (sweepers.some((u) => Math.hypot(u.pos.x - m.x, u.pos.z - m.z) < u.stats.sweeper)) { m.live = false; cut++; continue; }
      for (const s of ships) {
        const u = s.units[0];
        if (!u?.alive || Math.hypot(u.pos.x - m.x, u.pos.z - m.z) > MINE_REACH + u.radius) continue;
        m.live = false;
        this.blast(s, u, m, MINE_DAMAGE, 3.5);
        g.tellBoth(s.faction, `${s.name}: struck a mine!`, `${s.name} has struck one of our mines`);
        break;
      }
    }
    if (cut) {
      this.sweptN += cut;
      const sw = ships.find((s) => s.stats.sweeper);
      if (sw && (this.sweptT ?? 0) <= g.time) { this.sweptT = g.time + 20; g.tell(sw.faction, `${sw.name}: ${this.sweptN} mine${this.sweptN > 1 ? 's' : ''} swept`); this.sweptN = 0; }
    }
    // the obstacles: only under the water (at low tide they stand dry on the sand)
    for (const r of this.runs) {
      if (r.phase !== 'in') continue;
      const s = r.craft, u = s.units[0];
      if (!u?.alive) continue;
      for (const o of this.obstacles) {
        if (o.hit || Math.hypot(u.pos.x - o.x, u.pos.z - o.z) > u.radius + 1.2 || level - g.terrain.heightAt(o.x, o.z) < 0.4) continue;
        o.hit = true;
        if (o.mine) { this.blast(s, u, o, OBSTACLE_MINE, 1.6); this.hideObstacle(o, true); g.tell(s.faction, `${s.name}: blown up on a mined obstacle`); }
        else { s.damageUnit(u, 60, null); r.phase = 'ramp'; r.t = 0; u.beached = true; r.way = { x: u.pos.x, z: u.pos.z }; g.tell(s.faction, `${s.name}: stuck on the obstacles — the men go in from here`); }
        break;
      }
    }
  }

  blast(s, u, at, damage, size) {
    const g = this.game, pos = { x: at.x, y: g.world.river.level, z: at.z };
    g.effects.waterSplash?.(pos, size);
    g.effects.explosion?.(pos, size * 0.6, { ground: false });
    g.audio?.play('explosion', pos, { volume: 1 });
    s.damageUnit(u, damage, null, 1);
  }

  /** Does faction `f` land here (its base is out at sea)? */
  lands(f) {
    const g = this.game, b = g.map.bases?.[f], river = g.world.river;
    return !!(b && river && g.terrain.heightAt(b.x, b.z) < river.level);
  }

  /** Craft of faction `f` still on their way in or unloading (the sea-edge limit). */
  busy(f) { return this.runs.filter((r) => r.craft.faction === f && r.phase !== 'out').length; }

  /** x kept `margin` m inside the nearest swept lane (no mines: as it is). */
  inLane(x, margin) {
    const o = this.game.map.landing?.seaMines;
    if (!o) return x;
    const lane = o.lanes.reduce((a, l) => (Math.abs(l - x) < Math.abs(a - x) ? l : a), o.lanes[0]);
    return Math.max(lane - o.lane + margin, Math.min(lane + o.lane - margin, x));
  }

  /** Where a craft with this draft grounds off beach x: the first z (coming in from the sea) with the sand that shallow. */
  groundZ(x, draft) {
    const g = this.game, level = g.world.river.level, edge = g.world.bounds.z;
    for (let z = edge; z > -edge; z -= 2) if (g.terrain.heightAt(x, z) > level - draft) return z;
    return 0;
  }

  /**
   * Send `cargo` ({ typeId, name, kit }) of faction `f` in to beach x. Returns the craft's stack.
   * `z0`: where she starts (default: the sea edge).
   */
  launch(f, cargo, x, z0 = null) {
    const g = this.game, type = UNIT_TYPES[cargo.typeId];
    const kind = type?.dd ? 'ddCraft' : type?.kind === 'infantry' ? 'lcvp' : 'lct'; // (a DD tank swims in on its own screen)
    if (kind === 'ddCraft' && z0 == null) { const band = g.map.landing?.seaMines?.z; z0 = Math.sign(g.map.bases[f].z) * ((band ? band[0] : 400) - DD_START); }
    const edge = g.world.bounds.z, sign = Math.sign(g.map.bases[f].z) || 1;
    x = this.inLane(x, 15);
    const start = { x, z: z0 ?? sign * (edge - 25) };
    const craft = g.spawnStack(kind, f, start, sign > 0 ? Math.PI : 0, `${UNIT_TYPES[kind].shortName} (${cargo.name})`);
    craft.autonomous = true; // (hers is the coxswain's course: not yours to order)
    craft.cargo = cargo;
    const draft = craft.stats.draft ?? 1;
    const half = (craft.type.hull?.length ?? 10) / 2;
    const bowZ = this.groundZ(x, draft);
    const r = { craft, cargo, phase: 'in', t: 0, sign, x, way: { x, z: bowZ + sign * half * 0.9 }, still: 0 };
    craft.run = r;
    this.runs.push(r);
    return craft;
  }

  update(dt) {
    const g = this.game;
    for (const w of this.waves) {
      if (w.done || g.time < (w.t ?? 0)) continue;
      w.done = true;
      for (const f of ['nato', 'pact']) {
        if (!this.lands(f)) continue;
        const roads = g.map.bases[f].entries ?? [0];
        (w.units ?? []).forEach((o, i) => {
          const type = UNIT_TYPES[o.unit];
          if (!type) return;
          const count = g.modeState?.bought ?? this.count; // (one count with what's bought: no two Rifle Squad IIIs)
          count[o.unit] = (count[o.unit] ?? 0) + 1;
          const name = o.name ?? `${forArmy(type.variants, g.armyOf(f), f)?.name ?? type.shortName} ${ROMAN[count[o.unit] - 1] ?? count[o.unit]}`; // (as a bought one is named)
          const x = (roads[o.sector ?? 0] ?? 0) + (o.dx ?? (Math.random() - 0.5) * 70);
          this.launch(f, { typeId: o.unit, name, kit: o.kit ?? null }, x, Math.sign(g.map.bases[f].z) * (g.world.bounds.z - 25 - (i % 3) * 30));
        });
        if (w.say) g.tell(f, w.say);
      }
    }
    for (const r of this.runs.slice()) this.step(r, dt);
    this.waters();
    this.tide();
    if ((this.wadeT = (this.wadeT ?? 0) - dt) <= 0) { this.wadeT = 0.5; this.wading(); }
  }

  /** The tide coming in (the map's `landing.tide`: { rise m, over s }): the sea's level up, the beach narrower, the obstacles under. */
  tide(guest = false) {
    const T = this.game.map.landing?.tide, g = this.game, river = g.world.river;
    if (!T || !river) return;
    this.base ??= river.level;
    const k = Math.min(1, g.time / T.over), level = this.base + T.rise * k * k * (3 - 2 * k);
    if (Math.abs(level - river.level) < 0.003) return;
    river.level = level;
    if (river.water) river.water.level = level;
    TIDE.value = level - this.base;
    for (const m of river.meshes ?? []) m.position.y = level;
    g.cameraManager.waterLevel = level;
    if (!guest && Math.abs(level - (this.navAt ?? this.base)) >= 0.1) { this.navAt = level; g.world.nav.water(T.band ?? null); this.wadeIn(level); } // (men and vehicles: where the water is too deep now)
    if (!guest && !this.tideSaid && TIDE.value > T.rise * 0.35) { this.tideSaid = true; for (const f of ['nato', 'pact']) g.tell(f, 'The tide is coming in: the obstacles are going under, the beach is getting narrower'); }
  }

  /** Men and vehicles in water deeper than they can wade (a craft unloaded short, the tide over them): carried a little way in. */
  wading() {
    const g = this.game, level = g.world.river.level;
    for (const s of g.world.stacks) {
      if (!s.alive || s.stats.naval || s.stats.structure) continue;
      const sign = this.lands(s.faction) ? Math.sign(g.map.bases[s.faction].z) || 1 : -(Math.sign(g.map.bases[s.faction].z) || 1);
      for (const u of s.units) if (u.alive && level - g.terrain.heightAt(u.pos.x, u.pos.z) > 0.85) u.pos.z -= sign * 0.8;
    }
  }

  /** The tide over men and vehicles standing on the flat: each one caught in water too deep wades in, to where it's shallow. */
  wadeIn(level) {
    const g = this.game;
    for (const s of g.world.stacks) {
      if (!s.alive || s.stats.naval || s.stats.structure) continue;
      const deep = level - g.terrain.heightAt(s.centroid.x, s.centroid.z);
      if (deep < 0.6) continue;
      const sign = this.lands(s.faction) ? Math.sign(g.map.bases[s.faction].z) || 1 : -(Math.sign(g.map.bases[s.faction].z) || 1); // (toward the land)
      let z = s.centroid.z;
      for (let i = 0; i < 200 && level - g.terrain.heightAt(s.centroid.x, z) > 0.2; i++) z -= sign;
      s.ai.moveTo({ x: s.centroid.x, z: z - sign * 6 }, { ordered: false });
    }
  }

  /** Engineers' charges (systems/Construction.js clear): the beach obstacles round (x, z) blown — no craft will run onto them now. */
  clearObstacles(x, z, r) {
    let n = 0;
    for (const o of this.obstacles) if (!o.gone && Math.hypot(o.x - x, o.z - z) < r) { o.hit = true; o.cleared = true; this.hideObstacle(o); n++; }
    if (n) this.game.effects?.explosion?.({ x, y: this.game.terrain.heightAt(x, z), z }, 1.4);
    return n;
  }

  step(r, dt) {
    const g = this.game, s = r.craft, u = s.units[0];
    if (!s.alive || !u?.alive) return;
    r.t += dt;
    // a DD tank on its canvas screen: a wave over it and it's gone, crew and all
    if (s.stats.dd && r.phase === 'in' && Math.random() < SWAMP * dt * (g.seaState ?? 1) ** 2) {
      g.tellBoth(s.faction, `${r.cargo.name}: swamped — gone down with her crew`, 'One of their swimming tanks has gone under');
      s.damageUnit(u, 1e5, null, 1);
      return;
    }
    const d = Math.hypot(r.way.x - u.pos.x, r.way.z - u.pos.z);
    if (r.phase === 'in') {
      const speed = Math.hypot(u.vel.x, u.vel.z);
      r.still = speed < 0.3 && r.t > 5 ? r.still + dt : 0;
      // there, or past the line (a big craft can't turn tight enough to hit the spot), or stopped short
      const bowDepth = g.world.river.level - g.terrain.heightAt(u.pos.x, u.pos.z - r.sign * (s.type.hull?.length ?? 10) * 0.5);
      if (r.still > 2.5 && bowDepth > (s.stats.draft ?? 1) + 0.8) { r.still = 0; r.way = { x: this.inLane(r.way.x + (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 10), 10), z: r.way.z }; } // (jammed short, out in deep water: round the boat ahead)
      else if (d < 3 + s.stats.radius || (u.pos.z - r.way.z) * r.sign < 0 || r.still > 2.5) {
        if (s.stats.dd) { this.ashore(r, u); return; } // (her tracks on the sand: the screen comes down, she drives out)
        r.phase = 'ramp'; r.t = 0; u.beached = true; r.way = { x: u.pos.x, z: u.pos.z };
      }
    } else if (r.phase === 'ramp') {
      u.rampK = Math.min(1, r.t / RAMP);
      if (u.rampK >= 1 && !r.landed) { r.landed = true; this.unload(r, u); }
      if (r.landed && r.t > RAMP + UNLOAD) { r.phase = 'back'; r.t = 0; u.beached = false; r.way = { x: u.pos.x, z: u.pos.z + r.sign * BACK }; }
    } else if (r.phase === 'back') {
      u.rampK = Math.max(0, 1 - r.t / RAMP);
      if (d < 6 || r.t > 25) { r.phase = 'out'; r.way = { x: r.x + (Math.random() - 0.5) * 60, z: r.sign * (g.world.bounds.z + 40) }; }
    } else if (r.phase === 'out') {
      if (Math.abs(u.pos.z) > g.world.bounds.z - 30) { this.runs.splice(this.runs.indexOf(r), 1); s.run = null; this.remove(s); }
    }
  }

  /** A craft off the map (or a DD tank become a tank again): nobody's still aiming at her. */
  remove(s) {
    for (const o of this.game.world.stacks) for (const u of o.units) if (u.target?.stack === s) u.target = null;
    this.game.removeStack(s);
  }

  /** A DD tank touching bottom: the screen folds, the tank it was carries on as itself. */
  ashore(r, u) {
    const g = this.game, s = r.craft;
    this.runs.splice(this.runs.indexOf(r), 1);
    let x = u.pos.x, zz = u.pos.z - r.sign * 3; // (in where it can drive: no deeper than a tank wades)
    for (let i = 0; i < 120 && g.world.river.level - g.terrain.heightAt(x, zz) > 0.5; i++) zz -= r.sign;
    const stack = g.spawnStack(r.cargo.typeId, s.faction, { x, z: zz }, r.sign > 0 ? Math.PI : 0, r.cargo.name);
    s.cargo = null;
    s.run = null;
    this.remove(s);
    let z = u.pos.z;
    for (let i = 0; i < 200 && g.terrain.heightAt(u.pos.x, z) < g.world.river.level + 0.8; i++) z -= r.sign;
    stack.ai.moveTo({ x: u.pos.x, z: z - r.sign * 10 }, { ordered: false });
    g.bus.emit('landed', { stack, craft: s });
  }

  /** Down the ramp and up the beach: the cargo becomes its own stack ahead of her bow, in water shallow enough to wade. */
  unload(r, u) {
    const g = this.game, s = r.craft, level = g.world.river.level;
    const fx = 0, fz = -r.sign, half = (s.type.hull?.length ?? 10) / 2; // (always out on the landward side, whichever way she swung)
    let x = u.pos.x + fx * (half + 3), z = u.pos.z + fz * (half + 3);
    for (let i = 0; i < 120 && level - g.terrain.heightAt(x, z) > 0.5; i++) { x += fx; z += fz; } // (out where it's shallow enough to wade: never in over their heads)
    const stack = g.spawnStack(r.cargo.typeId, s.faction, { x, z }, r.sign > 0 ? Math.PI : 0, r.cargo.name);
    if (r.cargo.kit) stack.setKit?.(r.cargo.kit);
    s.cargo = null;
    // up out of the water onto the dry sand, a little way: from there it's yours to command
    let ux = x, uz = z;
    for (let i = 0; i < 300 && g.terrain.heightAt(ux, uz) < level + 0.8; i++) { ux += fx; uz += fz; }
    stack.ai.moveTo({ x: ux + fx * 12, z: uz + fz * 12 }, { ordered: false });
    g.bus.emit('landed', { stack, craft: s });
  }
}
