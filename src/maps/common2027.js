// The 2027 maps' shared kit (maps/suwalkiGap.ts and the six after it): today's Polish and
// Lithuanian countryside — villages of plastered houses with their farm sheds, silos and church,
// blocks of flats, wind turbines, solar fields, power lines, asphalt with its lane lines — and the
// usual mirrored layout (NATO south, +z; Russia north) and the vegetation pass. Everything builds in
// point-mirrored pairs from one seed, so neither side gets the better ground (coverSites with `mirror` false: each half its own).
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32 } from '../core/math.js';

/** fn(m, flip) twice from one seed: m = 1, then -1 (multiply x and z by it), flip 0 then π. */
export function both(props, seed, fn) {
  for (const m of [1, -1]) { props.rand = mulberry32(seed); fn(m, m > 0 ? 0 : Math.PI); }
}

/** A late-summer theme for the lake country, with `o` over it (o.terrain merged). @returns {any} */
export function theme2027(o = {}) {
  return {
    fogColor: 0xa8b4bc, fogDensity: 0.0015, skyTop: 0x5a7fa6, skyHorizon: 0xc2cdd2, skyBottom: 0x7a7f78,
    sunColor: 0xfff1d8, sunIntensity: 2.3, sunDisk: 0.5, clouds: 0.45, cloudLight: 0xf2f2ee, cloudDark: 0x9aa2aa,
    sunDir: [-0.5, 0.62, -0.6], hemiSky: 0xc6d4e2, hemiGround: 0x4e4a36, hemiIntensity: 1.2, rimColor: 0xc8d0d8, rimIntensity: 0.22,
    ...o,
    terrain: {
      grass: '#5a6a36', grassAlt: '#4e6032', dryGrass: '#94864e', dirt: '#5c4a38', rock: '#6e6a60',
      pasture: '#5e6e38', ploughed: '#5a4632', stubble: '#a8955a', meadow: '#6e7a3e',
      farmX: [500, 580], farmZ: [560, 640], roads: [-330, 330], roadZ: 540,
      ...o.terrain,
    },
  };
}

/**
 * The control points from our half: [id, name, x, z, extra] for A–F (F on the centre line or not),
 * and the names of their mirrors G–K (G mirrors E, H mirrors D … K mirrors A). A and K are the homes.
 */
export function pointsFrom(half, mirrorNames) {
  const pts = half.map(([id, name, x, z, o = {}]) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : null, sector: o.sector ?? (Math.abs(x) < 120 ? 'centre' : x < 0 ? 'west' : 'east'), ...(o.radius ? { radius: o.radius } : {}) }));
  const out = [...pts];
  const ids = ['G', 'H', 'I', 'J', 'K'];
  const src = pts.filter((p) => !(p.x === 0 && p.z === 0)).reverse().slice(0, 5); // E, D, C, B, A → G, H, I, J, K
  src.forEach((p, i) => out.push({ ...p, id: ids[i], name: mirrorNames[i], x: -p.x, z: -p.z, owner: p.owner ? 'pact' : null, sector: p.sector === 'west' ? 'east' : p.sector === 'east' ? 'west' : 'centre' }));
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * A village at point p (mirrored by `m`): houses along a street, garden walls, a farm shed and silos,
 * a church (`church`), a wrecked car. `skip(x, z, r)` keeps them off water and roads.
 */
/** @param {any} o */
export function modernVillage(props, p, m, flip, o) {
  const { street = null, off = 0, n = 6, church = true, skip = (x, z, r) => false } = o;
  const r = props.rand, X = p.x * m, Z = p.z * m;
  const st = (street ?? r() * Math.PI) + flip;
  for (let i = 0; i < n; i++) {
    const along = (i - (n - 1) / 2) * 15 + (r() - 0.5) * 3, side = i % 2 ? 1 : -1;
    const [hx, hz] = PropBuilder.local(X, Z, st, side * (off + 10 + r() * 3), along);
    if (skip(hx, hz, 6)) continue;
    props.townHouse({ x: hx, z: hz, yaw: st + (side > 0 ? Math.PI / 2 : -Math.PI / 2), width: 9 + r() * 2, depth: 8 + r() * 2, storeys: r() < 0.5 ? 1 : 2, name: ['house', 'farmhouse', 'shop', 'house'][i % 4], damaged: 0 });
    const [gx, gz] = PropBuilder.local(X, Z, st, side * (off + 18 + r() * 2), along);
    if (!skip(gx, gz, 3)) props.lowWall({ x: gx, z: gz, yaw: st, length: 9, height: 1, color: [0x8a867c, 0x9a8a72, 0x6e6a62][Math.floor(r() * 3)] });
  }
  const [sx, sz] = PropBuilder.local(X, Z, st, -(off + 34), (r() - 0.5) * 20);
  if (!skip(sx, sz, 14)) {
    props.hall({ x: sx, z: sz, yaw: st + Math.PI / 2, width: 20, depth: 12, height: 6, color: 0x8a8a84, roof: 0x5a3a2e, door: 6, name: 'farm shed' });
    const [tx, tz] = PropBuilder.local(sx, sz, st, 0, 14);
    props.tanks({ x: tx, z: tz, yaw: st, count: 2, radius: 2.4, height: 11, color: 0xb8bab4 });
  }
  if (church) {
    const [cx, cz] = PropBuilder.local(X, Z, st, off + 30, (r() - 0.5) * 10);
    if (!skip(cx, cz, 12)) props.church({ x: cx, z: cz, yaw: st + Math.PI / 2 });
  }
  const [wx, wz] = PropBuilder.local(X, Z, st, (r() - 0.5) * 8, (r() - 0.5) * 30);
  if (!skip(wx, wz, 2)) props.wreckCar({ x: wx, z: wz, yaw: st + r() });
}

/** A block of flats: flat-roofed, `storeys` high, light plaster (occupiable). */
export function flats(props, { x, z, yaw, storeys = 4, width = 28, depth = 11, name = 'block of flats' }) {
  return props.flatHouse({ x, z, yaw, width, depth, storeys, name });
}

/** Wind turbines at [x, z, yaw], each with its mirror; returns the rotors (spin them in update). */
export function turbines(props, list) {
  const rotors = [];
  for (const [x, z, yaw] of list) for (const m of [1, -1]) rotors.push(props.windTurbine({ x: x * m, z: z * m, yaw }));
  return rotors;
}

/** A power line along `z(x)` across the map (and its mirror); pylons skipped where `skip(x, z)` (the wires span). */
export function powerLine(props, seed, z, skip, step = 72) {
  both(props, seed, (m) => {
    let prev = null;
    for (let x = -540; x <= 540; x += step) {
      const X = x * m, Z = z(x) * m;
      if (skip(X, Z)) continue;
      const tips = props.pylon({ x: X, z: Z, yaw: Math.atan2(1, (z(x + 1) - z(x))) });
      if (prev) props.wires(prev, tips);
      prev = tips;
    }
  });
}

/** Lane lines and a median barrier along a dual carriageway whose centre is x = cx(z). */
export function laneLines(props, terrain, cx, z0 = -600, z1 = 600, step = 12, median = true) {
  for (let z = z0; z < z1; z += step) {
    const a = cx(z), yaw = Math.atan2(cx(z + 6) - a, 6);
    for (const o of [-4.2, 4.2]) props.box('plain', a + o, terrain.heightAt(a + o, z) + 0.02, z + 3, 0.15, 0.04, 5, yaw, 0xd8d8d0);
    for (const o of [-8, 8]) props.box('plain', a + o, terrain.heightAt(a + o, z) + 0.02, z + 6, 0.18, 0.04, 12, yaw, 0xd8d8d0);
    if (median) props.box('metal', a, terrain.heightAt(a, z) + 0.6, z + 6, 0.12, 0.3, 12, yaw, 0xa0a4a6);
  }
}

/** Cover sites over the fields, mirrored (`ok(x, z)` says where one may go); `mirror` false: `count` over the whole map, each its own. */
export function coverSites(props, rand, bounds, ok, count = 130, kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'wrecks', 'hay', 'fieldwall', 'roadblock'], build, mirror = true) {
  const sites = [];
  for (let tries = 0; sites.length < count && tries < 9000; tries++) {
    const x = (rand() * 2 - 1) * (bounds.x - 20);
    const z = mirror ? 14 + rand() * (bounds.z - 60) : (rand() * 2 - 1) * (bounds.z - 40);
    if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 30 * 30) || !ok(x, z)) continue;
    sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
  }
  for (const s of sites) { build(props, s, s.x, s.z, s.yaw); if (mirror) build(props, s, -s.x, -s.z, s.yaw + Math.PI); }
}

/** The vegetation pass every map ends with: trees (`forest(x, z)`: density, -1 none), hedges (not where `noHedge(x, z)`), ground cover. @param {any} o */
export function vegetation(o) {
  const { scene, terrain, cover, rand, bounds, fields, palette, avoid, forest, trees = 3000, hedges = 9000, autumn = 0.15, noHedge = null } = o;
  const t = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: trees, forest, autumn, broadleaf: o.broadleaf ?? 0.55 });
  cover.finalize(bounds);
  const h = hedges ? plantHedgerows({ scene, terrain, cover, rand, fields, area: bounds, avoid: noHedge ? [...avoid, { test: noHedge }] : avoid, count: hedges, lane: 0 }) : null;
  const g = growGround({ scene, terrain, cover, rand, area: bounds, palette, avoid, density: 3, fields });
  return (dt, time) => { g.update(dt, time); t.update(dt, time); h?.update(dt, time); };
}
