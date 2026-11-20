// The Northern Flank's kit (2027: maps/salla.ts, kuusamo.ts, ivalo.ts, pasvik.ts): Lapland and the Norwegian
// Arctic in winter, as maps/finnmark.ts (1985) has it — snow over everything, frozen lakes dead flat and bare,
// bogs under the snow that bog vehicles down, pine and spruce wherever the ground is dry — and the villages
// of the far north: a few wooden houses along the road, a red barn, a sauna by the water, logs stacked to dry.
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';

/** Distance from (x, z) to the segment a–b ([x, z] each). */
export function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

/**
 * Frozen lakes: wobbly ellipses [{ x, z, rx, rz, rot = 0, seed = 0 }] → k(x, z), 0 off the ice … 1 on it, the shore
 * a soft ramp. `clear(x, z)` (0…1, 0 = keep it dry: the roads, the points) eats into them.
 */
/** @param {any[]} list @param {(x: number, z: number) => number} [clear] */
export function iceLakes(list, clear = (x, z) => 1) {
  const q = (L, x, z) => {
    const c = Math.cos(L.rot ?? 0), s = Math.sin(L.rot ?? 0), dx = x - L.x, dz = z - L.z;
    const lx = (dx * c - dz * s) / L.rx, lz = (dx * s + dz * c) / L.rz, a = Math.atan2(lz, lx), sd = L.seed ?? 0;
    return Math.hypot(lx, lz) * (1 + 0.1 * Math.sin(3 * a + sd) + 0.06 * Math.sin(5 * a + 2.3 * sd));
  };
  return (x, z) => {
    let best = Infinity;
    for (const L of list) best = Math.min(best, q(L, x, z));
    return best > 1.3 ? 0 : smoothstep(1.3, 0.95, best) * clear(x, z);
  };
}

/** The Arctic winter: low sun, blue shadows, snow on the ground (`o` over it, o.terrain merged). @returns {any} */
export function arcticTheme(o = {}) {
  return {
    fogColor: 0xbcc6d0, fogDensity: 0.0012, skyTop: 0x6a84a4, skyHorizon: 0xd8d4cc, skyBottom: 0x8e96a0,
    sunColor: 0xffe2c0, sunIntensity: 1.5, sunDisk: 0.3, clouds: 0.5, cloudLight: 0xe8e6e2, cloudDark: 0x8a92a0,
    sunDir: [0.3, 0.22, 0.9], hemiSky: 0xd0dcea, hemiGround: 0x8e949c, hemiIntensity: 1.45, rimColor: 0xc8d4e2, rimIntensity: 0.3,
    ...o,
    terrain: {
      grass: '#eef2f4', grassAlt: '#e2e8ec', dryGrass: '#d8d8d0', dirt: '#9a948a', rock: '#7c7e80',
      pasture: '#eceff0', ploughed: '#d0ccc4', stubble: '#dcd8ce', meadow: '#f2f4f4',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      ...o.terrain,
    },
  };
}

/** The ground's paint under the snow: the ploughed road, packed winter tracks, the ice, sedge through the bogs (or null). */
export function snowSurface(x, z, { road, main, ice, bog, noise }) {
  if (road < 4.5) return [main ? 0xa8a49c : 0xc4c0b8, 0.8];
  const lk = ice(x, z);
  if (lk > 0.6) return [noise(x * 0.02, z * 0.02) > 0.3 ? 0xb8cad6 : 0xd6e2ea, 0.9]; // the ice, swept bare in places
  const b = bog(x, z);
  if (b > 0.1) return [noise(x * 0.04 + 5, z * 0.04) > 0 ? 0x9a9c84 : 0xc8ccc0, b * 0.7]; // sedge and tussocks through the snow
  return null;
}

/** Deep snow off the roads (a little slower), the bogs under it (vehicles all but stop, men wade). */
export function snowSoft(road, bog) {
  return (x, z, foot) => {
    if (road(x, z) < 6) return 1;
    const b = bog(x, z);
    return b <= 0.05 ? (foot ? 0.9 : 0.85) : 1 - b * (foot ? 0.55 : 0.9);
  };
}

const WOOD = [0x8a2e22, 0x8a2e22, 0xb8903a, 0x6e5a44, 0xc8c0a8]; // falu red, ochre, tarred brown, grey-white boards

/**
 * A village of the far north at p: `n` wooden houses either side of a street (yaw `street`), a barn, a sauna,
 * a stack of logs, a snowed-in car. `skip(x, z, r)` keeps them off the roads and the ice. `big`: a church too.
 */
/** @param {any} o */
export function woodenVillage(props, p, o) {
  const { street = props.rand() * Math.PI, n = 5, big = false, skip = () => false, spread = 1 } = o;
  const r = props.rand, X = p.x, Z = p.z;
  for (let i = 0; i < n; i++) {
    const along = (i - (n - 1) / 2) * 17 * spread + (r() - 0.5) * 4, side = i % 2 ? 1 : -1;
    const [hx, hz] = PropBuilder.local(X, Z, street, side * (13 + r() * 5), along);
    if (skip(hx, hz, 7)) continue;
    props.townHouse({ x: hx, z: hz, yaw: street + (side > 0 ? Math.PI / 2 : -Math.PI / 2), width: 8 + r() * 3, depth: 7 + r() * 2, storeys: r() < 0.7 ? 1 : 2, name: ['house', 'farmhouse', 'house', 'shop'][i % 4], damaged: 0 });
    if (r() < 0.6) {
      const [lx, lz] = PropBuilder.local(X, Z, street, side * (24 + r() * 3), along + (r() - 0.5) * 6);
      if (!skip(lx, lz, 4)) props.logPile({ x: lx, z: lz, yaw: street + (r() - 0.5) * 0.4, length: 4 + r() * 3 });
    }
  }
  const [bx, bz] = PropBuilder.local(X, Z, street, -(34 + r() * 6), (r() - 0.5) * 24);
  if (!skip(bx, bz, 12)) props.hall({ x: bx, z: bz, yaw: street + Math.PI / 2, width: 16, depth: 10, height: 5, color: WOOD[Math.floor(r() * 2)], roof: 0x3e4044, door: 5, name: 'barn' });
  const [sx, sz] = PropBuilder.local(X, Z, street, 32 + r() * 6, (r() - 0.5) * 30);
  if (!skip(sx, sz, 5)) props.hall({ x: sx, z: sz, yaw: street + r(), width: 5, depth: 4, height: 2.6, color: WOOD[2 + Math.floor(r() * 3)], roof: 0x3a3a3a, door: 1.2, name: 'sauna' });
  if (big) {
    const [cx, cz] = PropBuilder.local(X, Z, street, 34, (r() - 0.5) * 12 + 30);
    if (!skip(cx, cz, 12)) props.church({ x: cx, z: cz, yaw: street + Math.PI / 2 });
  }
  const [wx, wz] = PropBuilder.local(X, Z, street, (r() < 0.5 ? -1 : 1) * 8, (r() - 0.5) * 30);
  if (!skip(wx, wz, 2)) props.wreckCar({ x: wx, z: wz, yaw: street + r() });
}

/** By the roads, each half from its own dice: snowed-in wrecks, logs stacked to dry, erratic boulders out in the forest. */
export function roadside(props, seed, { along, points, road, ice, bases, bx = 470 }) {
  for (const m of [1, -1]) {
    props.rand = mulberry32(seed + m);
    const r = props.rand;
    for (let i = 0; i < 36; i++) {
      const z = (40 + r() * 420) * m, [x0] = along(i, z), x = x0 + (r() < 0.5 ? -1 : 1) * (9 + r() * 4);
      if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 36) || bases.some((b) => Math.hypot(b.x - x, b.z - z) < 50) || road(x, z) < 7 || ice(x, z) > 0.05) continue;
      const k = r();
      if (k < 0.3) props.wreckCar({ x, z, yaw: r() * 6 });
      else if (k < 0.75) props.logPile({ x, z, yaw: r() * 0.4 + (r() < 0.5 ? 0 : Math.PI / 2), length: 6 + r() * 3 });
      else props.boulder({ x, z, radius: 1.2 + r() });
    }
    for (let i = 0; i < 30; i++) {
      const x = (r() * 2 - 1) * bx, z = (20 + r() * 520) * m;
      if (road(x, z) < 12 || ice(x, z) > 0.05 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 30)) continue;
      props.boulder({ x, z, radius: 1.4 + r() * 2 });
    }
  }
}

/** The taiga: pine and spruce (`forest(x, z)` 0…1, -1 none), bare fell tops above `maxY`, snow-covered ground cover. @param {any} o */
export function taiga(o) {
  const { scene, terrain, cover, rand, bounds, palette, avoid, forest, trees = 11000, maxY = 32, birch = 0, size = 0.8 } = o;
  const t = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: trees, broadleaf: birch, autumn: 1, size, maxY, forest });
  cover.finalize(bounds);
  const g = growGround({ scene, terrain, cover, rand, area: bounds, palette, avoid, density: 0.7 });
  return (dt, time) => { g.update(dt, time); t.update(dt, time); };
}
