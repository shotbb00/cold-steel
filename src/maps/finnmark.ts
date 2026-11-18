// Finnmark, winter 1985 (the big field, 1.0 × 1.12 km): the Soviet thrust from the Kola peninsula over the border
// into the far north-east corner of Norway — Sør-Varanger, Kirkenes and the Pasvik valley. Open snow-covered tundra
// and birch scrub, pine on the rises, frozen lakes (flat, firm, and nowhere to hide on them) and bogs under the snow
// that swallow vehicles (map.soft: tanks all but stop, men wade through the drifts). One real road, the E6, runs
// down the middle through Kirkenes with its ore works (A/S Sydvaranger); winter tracks up each flank. Norway holds
// the south (+z), the Soviet Army comes from the north. Not a mirror: the lakes, bogs, birch scrub and fells lie where
// the noise puts them, the E6 and the winter tracks wind their own ways and each half has its own laterals; but each
// side has a fell for overwatch on each flank, the same reach of road to its points and about as much ice, bog and
// scrub on its half (measured: tools/map_fairness.py), so neither side gets the better of it.
// Both sides have laid mines astride the E6 and the tracks in front of their own line (battlefield works).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildVillage, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE = 330;                      // the winter tracks up the flanks
const noise = createNoise2D(1985_11);

// ---- roads: the E6 down the middle (odd in z: point-symmetric), the tracks up each flank, the laterals between
const e6X = (z: number) => 34 * Math.sin(z * 0.006) + 10 * Math.sin(z * 0.019) + 16 * Math.cos(z * 0.0045 + 0.6) - 13;
const trackX = (rx: number, z: number) => rx + 18 * Math.sin(z * 0.01) + 12 * Math.cos(z * 0.007 + rx * 0.01);
// the laterals between the roads, each half its own
const SEGS: [number, number][][] = [[[-SIDE, 330], [0, 260]], [[0, 260], [SIDE, 300]], [[-220, 90], [0, 0]],
  [[SIDE, -300], [0, -230]], [[0, -230], [-SIDE, -280]], [[250, -110], [0, 0]]];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const e6Dist = (x: number, z: number) => Math.abs(x - e6X(z));
function roadDist(x: number, z: number) {
  let d = e6Dist(x, z);
  for (const rx of [-SIDE, SIDE]) d = Math.min(d, Math.abs(x - trackX(rx, z)));
  for (const [a, b] of SEGS) d = Math.min(d, segDist(x, z, a, b));
  return d;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Bjørnevatn', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Sandnes', x: trackX(-SIDE, 315), z: 315, owner: null, sector: 'west' },
  { id: 'C', name: 'Hesseng', x: e6X(238), z: 238, owner: null, sector: 'centre' },
  { id: 'D', name: 'Langfjord', x: trackX(SIDE, 300), z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Høybuktmoen', x: -220, z: 80, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Kirkenes', x: e6X(0), z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Elvenes', x: 250, z: -110, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Svanvik', x: trackX(-SIDE, -250), z: -250, owner: null, sector: 'west' },
  { id: 'I', name: 'Storskog', x: e6X(-215), z: -215, owner: null, sector: 'centre' },
  { id: 'J', name: 'Jarfjord', x: trackX(SIDE, -340), z: -340, owner: null, sector: 'east' },
  { id: 'K', name: 'Boris Gleb', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const DRY = [...points.map((p) => [p.x, p.z, 60]), [0, BASE_Z, 70], [0, -BASE_Z, 70]]; // firm ground round points and bases

const keepClear = (x: number, z: number) => {
  let k = smoothstep(8, 22, roadDist(x, z));
  for (const [px, pz, r] of DRY) k = Math.min(k, smoothstep(r - 15, r + 15, Math.hypot(x - px, z - pz)));
  return k;
};
/** Frozen lakes (0..1: 1 inside the ice) and bogs (0..1) — never on the roads or the points. */
const lakeK = (x: number, z: number) => smoothstep(0.08, 0.14, fbm(noise, x * 0.0045 + 236.8, z * 0.0045 - 145.6, 3)) * keepClear(x, z);
const bogK = (x: number, z: number) => smoothstep(0.06, 0.18, fbm(noise, x * 0.006 + 423.3, z * 0.006 - 261.1, 3)) * keepClear(x, z) * (1 - lakeK(x, z));
/** Birch scrub and pine on the rises. */
const woodsK = (x: number, z: number) => smoothstep(0.0, 0.2, fbm(noise, x * 0.007 + 908.2, z * 0.007 - 561.4, 3)) * smoothstep(4, 14, roadDist(x, z)) * (1 - lakeK(x, z)) * (1 - bogK(x, z));

function raw(x: number, z: number) {
  return fbm(noise, x * 0.004, z * 0.004, 4) * 10 + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.8;
}
// rises for overwatch on each flank, each half its own: the tundra's low fells
const RISES: [number, number, number, number][] = [[-170, 250, 70, 9], [190, 380, 60, 8], [-400, 120, 80, 12], [120, 130, 50, 6],
  [230, -230, 64, 11], [-130, -400, 66, 9], [420, -60, 74, 14], [-140, -120, 52, 7]];
function height(x: number, z: number) {
  let h = raw(x, z) * 0.8 + 8;
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  h -= smoothstep(18, 5, roadDist(x, z)) * (h - 7) * 0.5;                         // the roads keep to the low ground
  const lk = lakeK(x, z);
  if (lk > 0) h += (5.5 - h) * smoothstep(0, 0.5, lk);                            // the ice: dead flat
  h -= bogK(x, z) * 1.2;                                                           // the bog hollows
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * 18 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14;
  for (const bz of [BASE_Z, -BASE_Z]) h += (8 - h) * smoothstep(32, 16, Math.hypot(x, z - bz));
  return h;
}

/** The bogs under the snow: tanks all but stop and the routes go round, men wade through the drifts. */
function softAt(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 6) return 1;
  const b = bogK(x, z);
  return b <= 0.05 ? (foot ? 0.9 : 0.85) : 1 - b * (foot ? 0.55 : 0.9); // (deep snow everywhere off the roads: a little slower)
}

const softV = gridCache((x: number, z: number) => softAt(x, z, false), BOUNDS), softF = gridCache((x: number, z: number) => softAt(x, z, true), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z);
const woodsC = gridCache((x: number, z: number) => woodsK(x, z), BOUNDS);

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'finnmark',
  name: 'Finnmark',
  description: 'Sør-Varanger in winter: the Soviet thrust from Kola over the border. Snowed-over tundra, birch scrub, frozen lakes and bogs that swallow tanks, the E6 the only real road through Kirkenes.',
  epochs: ['1985'],
  region: 'north',
  armies: { nato: ['no'], pact: ['sov'] }, // (the Norwegian Army's Brigade Nord and the Garrison in Sør-Varanger against the Soviet Army)
  sides: { nato: 'Norway', pact: 'Soviet Union' },
  climate: 'winter', // whitewash and snow smocks (render/paint.js CLIMATE)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  soft,
  woods: (x: number, z: number) => woodsC(x, z) * 0.6, // (scrub: you see a little further through it than through spruce)

  theme: {
    // the low Arctic sun of late winter, long blue shadows
    fogColor: 0xbcc6d0, fogDensity: 0.0011,
    skyTop: 0x6a84a4, skyHorizon: 0xd8d4cc, skyBottom: 0x8e96a0,
    sunColor: 0xffe2c0, sunIntensity: 1.5, sunDisk: 0.3,
    clouds: 0.45, cloudLight: 0xe8e6e2, cloudDark: 0x8a92a0,
    sunDir: [0.3, 0.22, 0.9],
    hemiSky: 0xd0dcea, hemiGround: 0x8e949c, hemiIntensity: 1.45,
    rimColor: 0xc8d4e2, rimIntensity: 0.3,
    terrain: {
      grass: '#eef2f4', grassAlt: '#e2e8ec', dryGrass: '#d8d8d0', dirt: '#9a948a', rock: '#7c7e80',
      pasture: '#eceff0', ploughed: '#d0ccc4', stubble: '#dcd8ce', meadow: '#f2f4f4',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const rd = roadDist(x, z);
        if (rd < 4.5) return [e6Dist(x, z) < 4.5 ? 0xa8a49c : 0xc4c0b8, 0.8];     // ploughed E6 (grit) / packed winter track
        if (Math.abs(x + 220) < 70 && Math.abs(z - 120) < 12) return [0x9a9a98, 0.8]; // Høybuktmoen's runway, cleared
        const lk = lakeK(x, z);
        if (lk > 0.5) return [noise(x * 0.02, z * 0.02) > 0.3 ? 0xb8cad6 : 0xd6e2ea, 0.9]; // the ice, swept bare in places
        const b = bogK(x, z);
        if (b > 0.1) return [noise(x * 0.04 + 5, z * 0.04) > 0 ? 0x9a9c84 : 0xc8ccc0, b * 0.7]; // sedge and tussocks through the snow
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE, 0, SIDE] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE, 0, SIDE] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  // the mine belts each side has laid in front of its own line, astride the E6 and the flank tracks (the roads left open:
  // engineers' lanes — it is the snow either side that is sown)
  battlefield() {
    const works: any[] = [];
    for (const [f, m] of [['nato', 1], ['pact', -1]] as const) { // (each side's belts across its own roads, where they run on its half)
      const roadAt = (rx: number, z: number) => (rx === 0 ? e6X(z) : trackX(rx, z));
      for (const z of [150, 175]) for (const rx of [-SIDE, 0, SIDE]) for (const dx of [-30, -16, 16, 30]) {
        const zz = (z + (rx === 0 ? 0 : 20)) * m, x = roadAt(rx, zz) + dx;
        if (bogK(x, zz) < 0.3 && lakeK(x, zz) < 0.3) works.push({ kind: 'mines', x, z: zz, yaw: m > 0 ? 0 : Math.PI, faction: f });
      }
      for (const rx of [-SIDE, 0, SIDE]) { // a dug-in post covering each belt
        const z = (rx === 0 ? 205 : 225) * m, x = roadAt(rx, z) + 14 * m;
        works.push({ kind: 'trench', x, z, yaw: m > 0 ? Math.PI : 0, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });

    // ---- Kirkenes: wooden houses on a grid either side of the E6, the ore works (A/S Sydvaranger: the pellet plant, its
    // stack, the silos) west of it, the harbour's warehouses east, the church south and the town hall north
    props.rand = mulberry32(1985_21);
    const r0 = props.rand, fx = e6X(0);
    for (let gx = -150; gx <= 150; gx += 22) for (const gz of [-58, -32, 32, 58]) {
      const x = fx + gx + (r0() - 0.5) * 4, z = gz + (r0() - 0.5) * 4;
      if (Math.abs(gx) < 26 || roadDist(x, z) < 9 || r0() < 0.18) continue;
      props.townHouse({ x, z, yaw: gz < 0 ? 0 : Math.PI, width: 8 + r0() * 3, depth: 7 + r0() * 2, storeys: r0() < 0.5 ? 2 : 1, name: 'house', damaged: 0.1 });
    }
    props.hall({ x: fx - 60, z: 0, yaw: Math.PI / 2, width: 30, depth: 14, height: 9, color: 0x6e6a64, roof: 0x3e4044, door: 9, name: 'Sydvaranger works' });
    props.tanks({ x: fx - 105, z: 5, yaw: 0, count: 2, radius: 4, height: 14, color: 0x8e8e88 });
    props.chimney({ x: fx - 75, z: -12, height: 42 });
    props.hall({ x: fx + 72, z: 8, yaw: 0.1, width: 26, depth: 12, height: 7, color: 0x7a5a3e, roof: 0x3e4044, door: 8, name: 'harbour warehouse' });
    props.hall({ x: fx + 112, z: -6, yaw: Math.PI / 2, width: 20, depth: 12, height: 6, color: 0x8a2e22, roof: 0x3a3a3a, door: 6, name: 'harbour warehouse' });
    props.church({ x: fx - 26, z: 82, yaw: Math.PI });
    props.townHouse({ x: fx + 30, z: -84, yaw: 0, width: 18, depth: 11, storeys: 2, name: 'town hall', damaged: 0 });

    // ---- Høybuktmoen: the airport west of the town — a terminal and a hangar beside the runway
    props.controlTower({ x: -200, z: 150, yaw: Math.PI });
    props.timberHangar({ x: -260, z: 150, yaw: Math.PI });
    // ---- Elvenes: the Pasvik frozen and snowed over at its mouth, the customs house and a boathouse
    props.townHouse({ x: 270, z: -128, yaw: 0, width: 10, depth: 8, storeys: 2, name: 'customs house', damaged: 0 });
    props.hall({ x: 222, z: -84, yaw: 0.2, width: 18, depth: 10, height: 5, color: 0x8a2e22, name: 'boathouse' });
    // the barracks at Bjørnevatn (the Garrison in Sør-Varanger's) and at Boris Gleb
    props.hall({ x: 60, z: 455, yaw: 0, width: 28, depth: 10, height: 6, color: 0x8a2e22, name: 'barracks' });
    props.hall({ x: -72, z: -448, yaw: Math.PI + 0.3, width: 32, depth: 11, height: 6, color: 0x7a7a6a, name: 'barracks' });

    // ---- hamlets: red and ochre wooden houses round the other points (each its own)
    for (const p of points) {
      if (!'BCDEGHIJ'.includes(p.id)) continue;
      const seed = 9100 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      props.rand = mulberry32(seed + 1);
      const r = props.rand;
      for (let i = 0; i < 3; i++) {
        const a = r() * Math.PI * 2, d = 26 + r() * 12, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (roadDist(x, z) < 9) continue;
        props.house({ x, z, yaw: a, width: 8, depth: 6, height: 3 });
      }
    }

    // ---- by the roads: snowed-in wrecks, stacked birch logs, a few roadblocks; reindeer fences out on the tundra
    // (each half from its own dice: m = 1 the south, -1 the north)
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_22 + m);
      const r = props.rand, flip = 0;
      for (let i = 0; i < 40; i++) {
        const z = (40 + r() * 420) * m, rx = [-SIDE, 0, SIDE][i % 3];
        const x = (rx === 0 ? e6X(z) : trackX(rx, z)) + (r() < 0.5 ? -1 : 1) * (8 + r() * 4);
        if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 36) || Math.hypot(x, Math.abs(z) - BASE_Z) < 50) continue;
        const k = r();
        if (k < 0.35) props.wreckCar({ x, z, yaw: r() * 6 + flip });
        else if (k < 0.75) props.logPile({ x, z, yaw: flip + r() * 0.4, length: 6 + r() * 3 });
        else props.boulder({ x, z, radius: 1.2 + r() });
      }
      for (let i = 0; i < 30; i++) { // erratic boulders, the glacier's leavings
        const x = (r() * 2 - 1) * 470, z = (20 + r() * 520) * m;
        if (roadDist(x, z) < 12 || lakeK(x, z) > 0.1 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 30)) continue;
        props.boulder({ x, z, radius: 1.4 + r() * 2 });
      }
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || lakeK(x, z) > 0.2 || (Math.abs(x + 220) < 80 && Math.abs(z - 120) < 20) }];
    // pine on the rises, birch scrub (bare in winter: spruce-shaped stand-ins kept low) — small trees, the tree line is near
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 5200, broadleaf: 0, autumn: 1, size: 0.7,
      forest: (x: number, z: number) => woodsK(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.7 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
