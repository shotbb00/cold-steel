// Airfields (tester feedback 2026-11-17): on land and coastal maps each side gets an airfield near its
// base — or the map's own (`map.airfields`: [{ faction, x, z, yaw, large, group }], Midway's islands) — and
// its regular squadrons fly from there (systems/AirStrike.js: an airfield is a carrier whose deck is the
// runway). Placed the same on every machine (no dice: flat open ground near the base, mirrored for the
// enemy), the trees on the runway cleared and the runway, its markings and a hangar laid as props; the
// host spawns the airfield units (data/units/airfield.js). Shut when badly hit (CLOSED) until sappers, an
// engineer vehicle or a recovery vehicle within REPAIR.range repair it.
import * as THREE from 'three';
import { PropBuilder } from '../world/Props.js';
import { KINDS } from './AirStrike.js';
import { CLOSED } from '../data/units/airfield.js';
import { epoch } from '../data/epoch.js';

const RUNWAY = { len: 240, width: 32, side: 55 };   // m: the strip, and the tower this far off its centre line
const REPAIR = { range: 70, rate: 0.012 };          // a repair party within range: this share of its strength back a second
const REPAIRERS = new Set(['engineers', 'cev', 'recovery', 'mineClear']);

/** The squadrons an airfield holds: the land's (or at sea the island's) regular kinds this war flies. */
function defaultGroup(sea, game) {
  const g = sea ? (epoch() === '1985' ? { seaCap: 2, seaStrike: 3, aew: 1 } : { navCap: 3, diveBomb: 3, torpBomb: 2, navScout: 1 }) : { jet: 3, heli: 3, lift: 2, lightBomber: 2 };
  const n = game.rules?.airGroups; // the battle rule: this many groups of each kind in reserve
  for (const k of Object.keys(g)) { if (KINDS[k]?.off) delete g[k]; else if (n) g[k] = n; }
  return g;
}

export class Airfields {
  constructor(game) {
    this.game = game;
    this.list = []; // { faction, x, z, yaw, large, group }: the tower's spot
  }

  /** Where they go (every machine alike), clear the ground, lay the runways. `mineOnly`: the player's side's alone (boot camp). */
  plan(mineOnly = false) {
    const g = this.game, map = g.map;
    const sea = !!g.world.openSea;
    if (g.rules?.air === false || g.rules?.airfields === false || epoch() === '1806' || KINDS.jet?.off) return;
    if (sea && !map.airfields) return; // (at sea only a map's own: islands)
    if (map.airfields) this.list = map.airfields.map((a) => ({ ...a, group: { ...defaultGroup(sea, g), ...(a.group ?? {}) } }));
    else if (g.world.coastal) { // (a landing: not mirrored — each side where it has land behind it; the side coming from the sea has none)
      this.list = ['nato', 'pact'].map((f) => this.find(f)).filter(Boolean);
      for (const f of this.list) f.group = defaultGroup(false, g);
    } else {
      const a = this.find('nato'), b = this.find('pact');
      if (!a || !b) return; // (each its own strip — the maps are no longer mirrors — and one for each side or for neither)
      this.list = [a, b];
      for (const f of this.list) f.group = defaultGroup(false, g);
    }
    if (mineOnly) this.list = this.list.filter((a) => a.faction === g.playerFaction).map((a) => ({ ...a, group: { lightBomber: 2 } })); // (boot camp: the light bombers only — its earlier lessons call the rest from the map edge)
    const props = new PropBuilder({ scene: g.scene, terrain: g.terrain, cover: g.cover, seed: 77 });
    const had = new Set(g.cover?.colliders ?? []); // (by identity: clearing the trees takes colliders out of the list)
    for (const a of this.list) this.lay(props, a);
    props.finish();
    for (const c of g.cover?.colliders ?? []) if (!had.has(c)) c.airfield = true; // (its own tower and hangars: tools/airfield_check.py)
    this.clearDetail();
  }

  /** The grass, bushes, pebbles and hedges (world/Vegetation.js: meshes tagged userData.detail) off the runways. */
  clearDetail() {
    const strips = this.list.map((a) => this.strip(a)), M = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0), v = new THREE.Vector3();
    const towers = this.list.map((a) => ({ ...this.strip(a), cx: a.x, cz: a.z, len: 140, width: 44 })); // (the tower and the hangars beside it)
    const on = (x, z) => [...strips.map((s) => ({ ...s, len: s.len + 12, width: s.width + 8 })), ...towers].some((s) => Math.abs((x - s.cx) * s.fx + (z - s.cz) * s.fz) < s.len / 2 && Math.abs((x - s.cx) * s.fz - (z - s.cz) * s.fx) < s.width / 2);
    this.game.scene.traverse((o) => {
      if (!o.isInstancedMesh || !o.userData.detail) return;
      o.updateMatrixWorld();
      let hit = false;
      for (let i = 0, n = Math.max(o.count, o.userData.baseCount ?? 0); i < n; i++) { // (all of them: a lower quality draws fewer now, a higher one more later)
        o.getMatrixAt(i, M);
        v.setFromMatrixPosition(M).applyMatrix4(o.matrixWorld);
        if (on(v.x, v.z)) { o.setMatrixAt(i, Z); hit = true; }
      }
      if (hit) o.instanceMatrix.needsUpdate = true;
    });
  }

  /** The best flat open strip near `faction`'s base: the runway along x, the tower on the side toward the battle. */
  find(faction) {
    // flat ground first; hilly maps (Thuringian Forest) take a steeper strip — the runway follows the ground (lay) — further out
    // and nothing standing on it (a wall, a fence, a wreck: props can't be taken away once laid) — only if a crowded map has no such strip, one anyway
    for (const clean of [true, false]) for (const [rise, reach] of [[5, 200], [9, 320], [14, 420], [14, 560]]) { const a = this.findWith(faction, rise, reach, clean); if (a) return a; }
    return null;
  }

  findWith(faction, rise, reach, clean = true) {
    const g = this.game, map = g.map, T = g.terrain, base = map.bases?.[faction];
    if (!base) return null;
    const b = map.bounds, level = g.world.river?.level ?? -Infinity;
    const toward = -Math.sign(base.z) || 1; // (the battle lies this way in z)
    const works = (g.construction?.structures ?? []).map((w) => ({ x: w.x, z: w.z, r: Math.hypot(w.def?.length ?? 4, w.def?.width ?? 4) / 2 })); // (the map's trenches and wire: no runway across them)
    const blocked = (x, z, r) => (g.buildings?.list ?? []).some((h) => Math.hypot(h.x - x, h.z - z) < r) || (map.points ?? []).some((p) => Math.hypot(p.x - x, p.z - z) < r + (p.radius ?? 18))
      || works.some((w) => Math.hypot(w.x - x, w.z - z) < w.r + r * 0.6);
    const stand = (g.cover?.colliders ?? []).filter((c) => !c.tree); // (trees: lay() clears them)
    const clutter = (x, z, tz) => stand.filter((c) => (Math.abs(c.x - x) < RUNWAY.len / 2 + c.r + 6 && Math.abs(c.z - z) < RUNWAY.width / 2 + c.r + 4)
      || (Math.abs(c.x - x) < 70 + c.r && Math.abs(c.z - tz) < 22 + c.r)).length; // (the strip, the tower and the hangars beside it)
    let best = null, bestS = Infinity;
    for (let dz = 0; dz <= reach; dz += 20) {
      const z = base.z + toward * (40 + dz);
      if (Math.abs(z) > b.z - 30) continue;
      for (let x = -b.x * 0.75; x <= b.x * 0.75; x += 20) {
        if (Math.abs(x - base.x) < RUNWAY.len / 2 + 40 && dz < 80) continue; // (not through the base itself)
        let lo = Infinity, hi = -Infinity, bad = false;
        for (let s = -RUNWAY.len / 2; s <= RUNWAY.len / 2 && !bad; s += 20) {
          for (const w of [-RUNWAY.width / 2, 0, RUNWAY.width / 2]) {
            const h = T.heightAt(x + s, z + w);
            if (h < level + 1 || blocked(x + s, z + w, 22)) { bad = true; break; }
            lo = Math.min(lo, h); hi = Math.max(hi, h);
          }
        }
        const tz = z + toward * RUNWAY.side;
        if (bad || hi - lo > rise || blocked(x, tz, 18) || blocked(x + 40, tz, 20) || blocked(x - 40, tz, 20) || T.heightAt(x, tz) < level + 1) continue; // (the tower, the hangar beside it)
        const n = clutter(x, z, tz);
        if (clean && n) continue;
        const score = (hi - lo) + dz * 0.02 + Math.abs(Math.abs(x) - b.x * 0.4) * 0.01 + n * 50; // (no clean strip anywhere: the least cluttered)
        if (score < bestS) { bestS = score; best = { faction, x, z: tz, yaw: toward > 0 ? -Math.PI / 2 : Math.PI / 2, large: false }; }
      }
    }
    return best;
  }

  /** The runway's centre and direction for an airfield (the tower RUNWAY.side off it). */
  strip(a) {
    const fx = Math.sin(a.yaw), fz = Math.cos(a.yaw);
    return { cx: a.x - fz * RUNWAY.side, cz: a.z + fx * RUNWAY.side, fx, fz, len: RUNWAY.len, width: RUNWAY.width * (a.large ? 1.4 : 1) };
  }

  /** Is (x, z) on airfield stack `st`'s ground: its runway, or by its tower and hangar? */
  onField(st, x, z) {
    const u = st.units[0];
    if (!u) return false;
    const s = this.strip({ x: u.pos.x, z: u.pos.z, yaw: u.yaw ?? st.yaw ?? 0, large: (st.stats.carrier?.slots ?? 1) > 1 });
    const along = (x - s.cx) * s.fx + (z - s.cz) * s.fz, across = (x - s.cx) * s.fz - (z - s.cz) * s.fx;
    return Math.abs(along) < s.len / 2 && across > -s.width / 2 && across < RUNWAY.side + 20;
  }

  /** Clear the trees off it, and lay the asphalt, its markings and the hangars. */
  /** Is (x, z) within `m` m of an airfield's runway, tower or hangars? (the side objectives keep off them: systems/Economy.js) */
  covers(x, z, m = 0) {
    return (this.list ?? []).some((a) => {
      const s = this.strip(a);
      return [[s.cx, s.cz, s.len / 2, s.width / 2], [a.x, a.z, 70, 22]].some(([cx, cz, hl, hw]) => Math.abs((x - cx) * s.fx + (z - cz) * s.fz) < hl + m && Math.abs((x - cx) * s.fz - (z - cz) * s.fx) < hw + m);
    });
  }

  /** Nothing standing where the runway, the tower and the hangars go: the map's walls, fences, rocks and wrecks there
   *  lose their colliders, and their triangles in the merged prop meshes are folded to nothing (a wall across the edge
   *  ends at the tarmac). find() looks for a clean strip first; this is for the crowded maps. */
  carve(a) {
    const g = this.game, s = this.strip(a);
    const zones = [[s.cx, s.cz, s.len / 2 + 6, s.width / 2 + 4], [a.x, a.z, 70, 22]];
    const inside = (x, z, m = 0) => zones.some(([cx, cz, hl, hw]) => Math.abs((x - cx) * s.fx + (z - cz) * s.fz) < hl + m && Math.abs((x - cx) * s.fz - (z - cz) * s.fx) < hw + m);
    for (const c of [...(g.cover?.colliders ?? [])]) if (!c.tree && inside(c.x, c.z, c.r)) g.cover.remove(c);
    g.scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.userData.props || o.geometry.index) return;
      o.updateMatrixWorld();
      const pos = o.geometry.attributes.position, e = o.matrixWorld.elements;
      let hit = false;
      for (let i = 0; i + 2 < pos.count; i += 3) {
        const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3 + e[12], z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3 + e[14];
        if (!inside(x, z)) continue;
        for (const k of [1, 2]) pos.setXYZ(i + k, pos.getX(i), pos.getY(i), pos.getZ(i));
        hit = true;
      }
      if (hit) { pos.needsUpdate = true; o.geometry.computeBoundingSphere(); }
    });
  }

  lay(props, a) {
    this.carve(a);
    const g = this.game, T = g.terrain, s = this.strip(a);
    const along = (x, z) => (x - s.cx) * s.fx + (z - s.cz) * s.fz, across = (x, z) => (x - s.cx) * s.fz - (z - s.cz) * s.fx;
    for (const f of g.cover.forests ?? []) f.clear?.((x, z) => Math.abs(along(x, z)) < s.len / 2 + 30 && Math.abs(across(x, z)) < s.width / 2 + 45);
    const yaw = Math.atan2(s.fx, s.fz);
    // the asphalt: a sheet draped over the ground every 4 m (a flat slab would sink into a slope)
    const sheet = new THREE.PlaneGeometry(s.width, s.len, Math.ceil(s.width / 2.5), Math.ceil(s.len / 2.5)).rotateX(-Math.PI / 2), pos = sheet.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const w = pos.getX(i), t = pos.getZ(i), x = s.cx + s.fx * t + s.fz * w, z = s.cz + s.fz * t - s.fx * w;
      pos.setXYZ(i, x, T.heightAt(x, z) + 0.3, z);
    }
    sheet.computeVertexNormals();
    props.push('stone', sheet, new THREE.Matrix4(), 0x55555a);
    for (let t = -s.len / 2; t < s.len / 2; t += 20) { // the centre line
      const x = s.cx + s.fx * (t + 5), z = s.cz + s.fz * (t + 5);
      props.box('plain', x, T.heightAt(x, z) + 0.27, z, 0.5, 0.04, 6, yaw, 0xd8d8d0);
    }
    for (const end of [-1, 1]) for (let k = -3; k <= 3; k++) { // threshold bars
      const x = s.cx + s.fx * end * (s.len / 2 - 6) + s.fz * k * 3.4, z = s.cz + s.fz * end * (s.len / 2 - 6) - s.fx * k * 3.4;
      props.box('plain', x, T.heightAt(x, z) + 0.27, z, 1.6, 0.04, 8, yaw, 0xd8d8d0);
    }
    for (const k of a.large ? [-50, 50] : [40]) { // the hangars beside the tower
      const x = a.x + s.fx * k, z = a.z + s.fz * k;
      if (epoch() === '1945' || epoch() === '1918') props.timberHangar({ x, z, yaw: yaw + Math.PI / 2 });
      else props.hall({ x, z, yaw, width: 26, depth: 18, height: 8, color: 0x8a8c88, roof: 0x5a5c5e, door: 14, name: 'hangar' });
    }
  }

  /** The host: the airfield units at their spots, each with its own hangar and runway. */
  spawn() {
    const g = this.game;
    for (const a of this.list) {
      const st = g.spawnStack('airfield', a.faction, { x: a.x, z: a.z }, a.yaw, a.name ?? `${a.large ? 'Air base' : 'Airfield'}`);
      st.stats = { ...st.stats, carrier: { ...st.stats.carrier, deckX: -RUNWAY.side, slots: a.large ? 2 : 1, airGroup: a.group } };
      for (const u of st.units) u.hangar = { ...a.group };
      st.holdFire = true;
    }
  }

  /** Twice a second (systems/Support.js): repair parties at work on a damaged runway. */
  repair(step) {
    const g = this.game;
    for (const st of g.world.stacks) {
      if (!st.stats.airfield || !st.alive) continue;
      const u = st.units[0];
      if (!u?.alive || u.hp >= u.maxHp) { st.job = null; continue; }
      const crew = g.world.stacks.find((o) => o.faction === st.faction && o.alive && REPAIRERS.has(o.type.id) && Math.hypot(o.centroid.x - u.pos.x, o.centroid.z - u.pos.z) < REPAIR.range);
      const closed = u.hp < u.maxHp * CLOSED;
      if (!crew) { st.job = closed ? 'runway shut — needs sappers' : null; continue; }
      const was = closed;
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * REPAIR.rate * step);
      st.job = `repairing the runway ${Math.round((u.hp / u.maxHp) * 100)} %`;
      crew.job = `repairing ${st.name}`;
      if (was && u.hp >= u.maxHp * CLOSED) g.tell(st.faction, `${st.name}: runway repaired — flights can take off again`);
    }
  }
}

/** Is this base's runway open (a carrier's deck always is)? */
export const runwayOpen = (st) => !st.stats.airfield || (st.units[0]?.hp ?? 0) >= (st.units[0]?.maxHp ?? 1) * CLOSED;
