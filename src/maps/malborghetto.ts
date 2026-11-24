// Malborghetto and the Carinthian passes, 15–18 May 1809: Prince Eugène’s Army of Italy came up the Fella from
// Pontebba towards Tarvis and Villach, and found the valley shut. Above Malborghetto Captain Hensel’s blockhouse —
// a timber-and-stone work on a bench of the north wall, its batteries over the road — held four days with 400 men,
// and the Predil fort did the same on the road south from Tarvis over the pass; the French took both by storm,
// climbing the slopes round them, and Hensel died at his guns. The French come up the valley from the west (+z here:
// the Pontebba road), the Austrians from Tarvis (−z). The Fella runs down the narrow floor, shallow and fast over its
// gravel; the road runs along it under the north wall, the blockhouse on its bench above in the middle. The walls
// rise 250–300 m: the Carnic side (north, −x) higher and unbroken, the Julian side (south, +x) cut by two side
// valleys — the Dogna valley on the French half, the Predil road up the Raibl valley on the Austrian half.
// Fair, not mirrored: the blockhouse, Malborghetto on the floor below it and the Miezegnot spur opposite are in the
// middle, as far from both bases. Each side has a floor village (San Leopoldo, Valbruna), a high alp on the north
// wall (Studena, Ugovizza) on the same bench height, and a side-valley mouth on the south (Val Dogna, the Predil road),
// each as far from its own base. The valley floor and both walls run the whole length, as high on each half.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const FLOOR = 5;
const W = 88;                                                                    // the floor’s half-width
const noise = createNoise2D(1809_0517);
/** The valley floor’s middle line. */
const fx = (z) => 60 + 30 * Math.sin(z * 0.0045 + 0.5) + 12 * Math.sin(z * 0.013);
/** The Fella: along the south side of the floor. */
const fellaX = (z) => fx(z) + 34 + 8 * Math.sin(z * 0.02);
/** The side valleys up the south wall: Val Dogna (French half), the Raibl valley and the Predil road (Austrian half). */
const SIDE = [{ z: 300, k: 0.0012 }, { z: -310, k: -0.0015 }];
const sideCut = (x, z) => Math.max(...SIDE.map((s) => Math.exp(-(((z - s.z - (x - fx(z)) * s.k * 100) / 52) ** 2))));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Pontebba road', x: Math.round(fx(430) - 30), z: 430, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Studena alp', x: Math.round(fx(290) - W - 105), z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'San Leopoldo', x: Math.round(fx(235) - 30), z: 235, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Val Dogna', x: Math.round(fx(300) + W + 70), z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Hensel blockhouse', x: Math.round(fx(-15) - W - 95), z: -15, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Malborghetto', x: Math.round(fx(15) - 30), z: 15, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Miezegnot spur', x: Math.round(fx(10) + W + 85), z: 10, owner: null, sector: 'east' },
  { id: 'H', name: 'Ugovizza alp', x: Math.round(fx(-290) - W - 105), z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Valbruna', x: Math.round(fx(-235) - 30), z: -235, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Predil road', x: Math.round(fx(-310) + W + 75), z: -310, owner: null, sector: 'east' },
  { id: 'K', name: 'Tarvis road', x: Math.round(fx(-430) - 30), z: -430, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

const fellaCourse: number[][] = [];
for (let z = -840; z <= 840; z += 24) fellaCourse.push([fellaX(z), z]);
const river = createRiver({
  path: fellaCourse,
  halfWidth: 8,
  level: 0,
  depth: 0.75,
  valley: 26,
  crossings: [
    { name: 'San Leopoldo bridge', x: fellaX(260), z: 260, kind: 'bridge', width: 6 },
    { name: 'Malborghetto bridge', x: fellaX(30), z: 30, kind: 'bridge', width: 6 },
    { name: 'Valbruna bridge', x: fellaX(-270), z: -270, kind: 'bridge', width: 6 },
  ],
});
const nearWater = (x, z, r) => Math.abs(x - fellaX(z)) < river.halfWidth + r;

/** The roads: the post road along the floor under the north wall; up the side valleys; the zigzag to the blockhouse; tracks to the alps. */
const ROAD_X = (z) => fx(z) - 30;
const zig = (p, s) => [[ROAD_X(p.z + s * 70), p.z + s * 70], [p.x + 55, p.z + s * 50], [p.x + 30, p.z - s * 25], [p.x + 8, p.z + s * 4]];
const ROADS: number[][][] = [
  [...Array.from({ length: 49 }, (_, i) => -600 + i * 25).map((z) => [ROAD_X(z), z])],
  [[ROAD_X(250), 250], [fellaX(260) - 10, 260], [fellaX(275) + 30, 280], [P.D.x, P.D.z], [P.D.x + 160, P.D.z + 30]],
  [[ROAD_X(-250), -250], [fellaX(-270) - 10, -270], [fellaX(-290) + 30, -300], [P.J.x, P.J.z], [P.J.x + 170, P.J.z - 45]],
  [[ROAD_X(15), 15], [fellaX(30) + 20, 30], [P.G.x - 40, P.G.z + 30], [P.G.x, P.G.z]],
  zig(P.E, 1),
  zig(P.B, -1),
  zig(P.H, 1),
];
const roadExact = (x, z) => Math.min(...ROADS.map((r) => segDist(r, x, z)));
const roadNear = gridCache(roadExact, { x: 520, z: 580 }, 8);
const roadD = (x, z) => (roadNear(x, z) > 18 ? 99 : roadExact(x, z));

/** The mountainsides alone (sampled once onto a 4 m grid: `mountain`). */
function mountainExact(x, z) {
  const c = fx(z), dN = c - W - x, dS = x - c - W;
  let h = FLOOR + fbm(noise, x * 0.004, z * 0.004, 2) * 1.5 + 2.5 * (-z / 560);  // (the floor climbing gently to Tarvis)
  if (dN > 0) h += 300 * smoothstep(0, 430, dN) ** 1.35;                          // the Carnic wall
  if (dS > 0) h += 250 * smoothstep(0, 380, dS) ** 1.3 * (1 - 0.82 * sideCut(x, z)) + 14 * smoothstep(0, 120, dS) * sideCut(x, z); // the Julian wall, the side valleys up into it
  const rise = Math.max(h - FLOOR - 4, 0);
  h += ridged(noise, x * 0.005 + 5, z * 0.005, 3) * Math.min(80, rise * 0.3);      // spurs and crests
  h -= ridged(noise, x * 0.004 - 9, z * 0.016, 2) * Math.min(45, rise * 0.22);     // gullies down the walls
  h += ridged(noise, x * 0.016 + 2, z * 0.016 - 4, 2) * Math.min(18, rise * 0.12);   // crags
  return h;
}
// the benches the points and bases stand on (their own height, levelled round them)
const SHELVES = [...POINTS.map((p) => [p.x, p.z, 'BEH'.includes(p.id) ? 28 : 32]), [P.A.x, BASE_Z, 30], [P.K.x, -BASE_Z, 30]];
const mountain = gridCacheSmooth(mountainExact, { x: 880, z: 880 }, 4);
const SHELF_H = SHELVES.map(([x, z]) => mountainExact(x, z));
SHELF_H[POINTS.findIndex((p) => p.id === 'H')] = SHELF_H[POINTS.findIndex((p) => p.id === 'B')]; // (the two alps on one bench height)

function height(x, z) {
  let h = mountain(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { if (Math.abs(x - sx) < r + 26 && Math.abs(z - sz) < r + 26) h += (SHELF_H[i] - h) * smoothstep(r + 26, r, Math.hypot(x - sx, z - sz)); });
  const d = roadD(x, z);
  if (d < 10) h += (Math.min(h, mountain(x, z) * 0.97 + 0.3) - h) * smoothstep(10, 4, d) * 0.6;   // (the roads benched into the slope)
  return river.carve(x, z, h);
}

/** The woods (0..1): spruce and larch up the walls to the tree line, a few copses on the floor. */
const woods = gridCache((x, z) => {
  const y = mountain(x, z);
  let k = smoothstep(0.5, 0.66, fbm(noise, x * 0.007 - 20, z * 0.007 + 3, 3)) * 0.5;
  k = Math.max(k, smoothstep(FLOOR + 14, FLOOR + 40, y) * smoothstep(230, 170, y) * (0.6 + 0.4 * smoothstep(0.3, 0.5, fbm(noise, x * 0.012, z * 0.012 - 8, 2))));
  for (const p of POINTS) k = Math.min(k, smoothstep(34, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadD(x, z)));
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'malborghetto',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Eugène’s Army of Italy against the Austrian border garrisons; the Austrians have no units yet: the Russians stand in)
  name: 'Malborghetto',
  description: 'Carinthia, May 1809: the narrow Fella valley between Pontebba and Tarvis, Hensel’s blockhouse on its bench above Malborghetto, the Predil road up the Raibl valley, the walls of the Carnic and Julian Alps with the last snow on them.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [], // (an Alpine valley: no aircraft in 1806 and nowhere to put a strip)
  conditions: { time: 'day', weather: 'clear' }, // (a bright May morning, snow still on the summits)
  size: 1700,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.55, // (guns and wagons keep to the floor, the side valleys and the benched tracks; men climb anywhere)
  overwatch: true,
  camera: { maxHeight: 700, far: 3600 },
  seed: 180905,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1809_5, cell: 66, weights: [0.15, 0.05, 0.5, 0.3] }), // (May: hay meadows greening, a little tilled ground on the floor)

  theme: {
    // a clear May day in the Julian Alps: hard light, deep shadow in the valley, snow on the summits
    fogColor: 0xc0ccd8,
    fogDensity: 0.0009,
    skyTop: 0x3e72b8,
    skyHorizon: 0xd0dce6,
    skyBottom: 0x80887c,
    sunColor: 0xfff4e4,
    sunIntensity: 2.0,
    sunDisk: 0.5,
    clouds: 0.35,
    cloudLight: 0xf4f6f8,
    cloudDark: 0x9aa2ac,
    sunDir: [0.35, 0.65, 0.4],
    hemiSky: 0xc8d6e4,
    hemiGround: 0x545a3c,
    hemiIntensity: 1.3,
    rimColor: 0xdce6f0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5e7238',
      grassAlt: '#566a34',
      dryGrass: '#8a8a56',
      dirt: '#5e5040',
      rock: '#a09e96',
      strip: '#4e4232',
      pasture: '#62763a',
      ploughed: '#5a4a38',
      stubble: '#8e8a58',
      meadow: '#68803e',
      farmX: [0, 1],
      farmZ: [0, 1],
      roads: [], // (the roads are this map’s own: ROADS)
      roadZ: 0,
      surface(x, z, y) {
        if (roadD(x, z) < 3.5) return [0x928a78, 0.85];                                     // the roads: limestone grit
        if (Math.abs(x - fellaX(z)) < 20 && y < 2.2) return [0xc8c6ba, 0.9];               // the Fella’s pale gravel
        if (y > FLOOR + 30) {
          const g = Math.hypot(mountain(x + 2, z) - mountain(x - 2, z), mountain(x, z + 2) - mountain(x, z - 2)) / 4;
          if (y > 200) return [0xeef0f2, smoothstep(200, 250, y) * (g > 1.1 ? 0.5 : 0.95)]; // the last snow on the heights
          if (g > 0.9) return [0xa4a29a, Math.min(1, (g - 0.9) * 3)];                       // limestone crags and scree
          if (g < 0.5) return [0x66783e, 0.8 * smoothstep(0.5, 0.3, g)];                    // the alps’ meadows
          if (y < 190) return [0x3e4c2c, 0.7 * smoothstep(190, 150, y)];                     // (the forest floor under the spruce)
        }
        return null;
      },
    },
  },

  bases: { nato: { x: P.A.x, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: P.K.x, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 60, z: 360 }, pact: { x: 60, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, x: P.A.x, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: P.K.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x, z) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const taken: number[][] = [];
    const free = (x, z, r = 14) => roadD(x, z) > 9 && !nearWater(x, z, 12) && steepAt(x, z) < 0.3 && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < r);

    // ---- Hensel’s blockhouse on its bench: the timber blockhouse, the stone battery wall before it over the road, the palisade round
    props.rand = mulberry32(1809_1517);
    const E = P.E, g0 = terrain.heightAt(E.x - 14, E.z);
    props.box('stone', E.x - 14, g0 + 3, E.z, 10, 7, 16, 0, 0x7a6248);                         // the blockhouse: squared logs on a stone foot
    props.box('stone', E.x - 14, g0 + 7.2, E.z, 12, 1.4, 18, 0, 0x4e4034);                     // (its shingled roof)
    props.cover.addBox({ x: E.x - 14, z: E.z, yaw: Math.PI / 2, length: 16, thickness: 10, height: 6.5 });
    props.wall({ x: E.x + 20, z: E.z, yaw: Math.PI / 2, length: 34, height: 1.8, thickness: 1.6 }); // the battery over the road
    for (const s of [-1, 1]) props.wall({ x: E.x + 4, z: E.z + s * 18, yaw: 0.25 * s, length: 30, height: 1.6, thickness: 0.6 }); // (the palisade’s sides)
    taken.push([E.x - 14, E.z], [E.x + 20, E.z]);
    // ---- Malborghetto, San Leopoldo, Valbruna: churches and houses along the road; the Venetian palazzo at Malborghetto
    for (const [q, seed, n] of [[P.F, 1809_51, 22], [P.C, 1809_52, 14], [P.I, 1809_53, 14]] as const) {
      props.rand = mulberry32(seed);
      props.church({ x: q.x - 26, z: q.z + 22 * Math.sign(q.z || 1), yaw: Math.PI / 2 });
      taken.push([q.x - 26, q.z + 22 * Math.sign(q.z || 1)]);
      const r = mulberry32(seed + 7);
      for (let i = 0, k = 0; i < n * 5 && k < n; i++) {
        const z = q.z + (r() * 2 - 1) * 80, x = ROAD_X(z) + (r() < 0.5 ? -1 : 1) * (14 + r() * 26);
        if (!free(x, z, 15) || Math.hypot(x - q.x, z - q.z) < 14) continue;
        taken.push([x, z]); k++;
        props.rand = mulberry32(Math.floor(r() * 1e9));
        props.townHouse({ x, z, yaw: Math.PI / 2, width: 7 + r() * 3, depth: 8, storeys: r() < 0.5 ? 2 : 1, damaged: 0 });
      }
    }
    props.rand = mulberry32(1809_54);
    props.townHouse({ x: P.F.x + 26, z: P.F.z - 30, yaw: Math.PI / 2, width: 16, depth: 11, storeys: 3, name: 'Palazzo Veneziano', damaged: 0 });
    taken.push([P.F.x + 26, P.F.z - 30]);
    for (const p of POINTS) if ('BDGHJ'.includes(p.id)) buildVillage(props, p, 18095 + Math.round(p.x * 3 + p.z * 7)); // (the alps’ huts, the side valleys’ farms)
    // ---- hay barns on the floor’s meadows, boulders under the walls
    const r = mulberry32(1809_55);
    for (let i = 0, n = 0; i < 6000 && n < 40; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 520;
      if (!free(x, z, 45) || nearPoint(x, z, 50) || Math.hypot(x - P.A.x, z - BASE_Z) < 60 || Math.hypot(x - P.K.x, z + BASE_Z) < 60 || mountain(x, z) > FLOOR + 14) continue;
      taken.push([x, z]);
      n++;
      buildSite(props, { kind: ['hay', 'fieldwall', 'farm', 'hay'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    for (let i = 0; i < 300; i++) {
      const x = (r() * 2 - 1) * 490, z = (r() * 2 - 1) * 550, y = mountain(x, z);
      if (y < FLOOR + 16 || y > 260 || nearPoint(x, z, 30) || roadD(x, z) < 8) continue;
      props.boulder({ x, z, radius: 1 + r() * 2.2 });
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 22, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 12, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: P.A.x, z: BASE_Z, r: 30 }, { x: P.K.x, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 18 })), { test: (x, z) => nearWater(x, z, 2) || roadD(x, z) < 5 }];
    // spruce and larch in their new green up to the tree line, beech and alder on the floor
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3000, broadleaf: 0.2, autumn: 0, maxY: 230, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.0, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
