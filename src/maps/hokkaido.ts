// Hokkaido, September 1985 (the big field, 1.0 × 1.12 km): the Soviet invasion of Hokkaido that every Cold War planner
// in Tokyo and Washington feared — the Far East Military District’s divisions have landed on the shore of Ishikari Bay
// and come over the Ishikari, and drive south across the Ishikari plain for Sapporo, against the US forces sent north
// to hold it (there is no Japanese army in the game: the US Army fights alone here). On the map, compressed: the
// Ishikari itself beyond the north edge, behind the Soviets; the Toyohira running north down the east of the plain from
// Sapporo to meet it, two bridges and the Kariki ford over it; the Teine mountains steep and wooded (conifer and birch)
// on the west flank, mostly too steep for vehicles (map.steep); the low Nopporo forest hills across the east. Between them the
// plain: rice paddies ripe for the harvest and still wet (soft), dairy pastures with red barns and silos, Japanese
// houses with their bright tin roofs in Shinkotoni, Hanakawa and Sapporo’s northern edge, the Sassho line up the
// middle through Sapporo station, the Hokkaido Jingu (a Shinto shrine, red torii before it) on wooded Maruyama, a
// village shrine in Shinkotoni. Behind each side’s west flank an air base’s edge: Okadama for the US, the strip the
// Soviet airborne took at Ishikari for the Soviets. The US hold the south (+z: Makomanai, Sapporo), the Soviets the
// north (-z: Ishikari, the bay).
// Fairness: not a mirror — the Toyohira wanders its own way, the towns, hills and points lie where each half has them
// (points measured with tools/map_fairness.py: their mirror images miss each other by ~35 m) — but the Teine mountains
// and the Nopporo hills straddle the middle so neither side starts on them; each side has its own bridge over the
// Toyohira at the same distance from its base (z ±422) and the one ford lies on the centre line; each side has a
// wooded hill on each flank of the same height (Maruyama and Nopporo against Zenibako and Tobetsu), a town on its
// centre road (Sapporo’s edge / Hanakawa) and an air base on its west flank; Nopporo, far over the river for the US,
// is answered by Tobetsu nearer the middle for the Soviets, and the sum of the points’ leads is about nil.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const LAND = 4;         // the plain’s level
const HW = 13;          // the Toyohira’s half-width
const noise = createNoise2D(1985_91);

// ---- the Toyohira down the east, south to north, into the Ishikari along the north edge (outside the field)
const TOYO = [[160, 700], [175, 560], [195, 430], [205, 310], [172, 190], [160, 70], [190, -5], [205, -140], [188, -250], [175, -380], [205, -480], [215, -600], [230, -690]];
const ISHIKARI = [[-820, -700, 60], [-300, -672, 60], [230, -695, 62], [820, -664, 58]];
const CROSS = [
  { name: 'Kariki bridge', x: 196, z: 422, kind: 'bridge', width: 14, channel: 0 },
  { name: 'Kariki ford', x: 190, z: -5, kind: 'ford', width: 18, channel: 0 },
  { name: 'Barato bridge', x: 188, z: -422, kind: 'bridge', width: 14, channel: 0 },
];
const river = createRiver({ paths: [TOYO, ISHIKARI], halfWidth: HW, level: 0, depth: 2.6, valley: 34, crossings: CROSS });
// (the courses are straight between their points: the distance to the polylines is exact, and far cheaper than
// river.project, which searches every resampled segment for ground away from the water)
const riverD = (x: number, z: number) => {
  let d = Infinity;
  for (const c of [TOYO, ISHIKARI]) for (let i = 0; i < c.length - 1; i++) d = Math.min(d, segDist(x, z, c[i], c[i + 1]));
  return d;
};

const points: ControlPointDef[] = [
  { id: 'A', name: 'Makomanai', x: 40, z: 465, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Maruyama', x: -350, z: 265, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Sapporo station', x: 60, z: 235, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Nopporo', x: 290, z: 330, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Teine', x: -255, z: 15, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Shinkotoni', x: -15, z: -20, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Kariki ford', x: 235, z: -5, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Zenibako', x: -265, z: -345, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Hanakawa', x: -95, z: -240, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Tobetsu', x: 370, z: -215, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Ishikari', x: -10, z: -470, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- roads: the Ishikari road up the middle, a west road under the Teine mountains, an east road over the two bridges
const ROADS: number[][][] = [
  [[0, 640], [0, BASE_Z], at('A'), [55, 360], at('C'), [20, 110], at('F'), [-50, -130], at('I'), [-40, -380], at('K'), [0, -BASE_Z], [0, -640]], // the Ishikari road
  [[0, BASE_Z], [-150, 420], at('B'), [-330, 150], at('E'), [-280, -130], at('H'), [-150, -430], [0, -BASE_Z]],                          // west: under Teine
  [[0, BASE_Z], [120, 450], [160, 432], [235, 412], [280, 395], at('D'), [280, 200], [255, 60], at('G'), [275, -110], at('J'), [290, -370], [230, -410], [150, -432], [90, -462], [0, -BASE_Z]], // east: over the bridges
  [at('B'), at('C')], [at('H'), at('I')],                                                                                                  // laterals, each half its own
  [at('E'), at('F')], [at('F'), [150, -8], at('G')],                                                                                       // through Shinkotoni, out over the ford
  [[-120, 60], [100, 40]], [[-100, -90], [80, -70]],                                                                                       // Shinkotoni’s streets
];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function roadDistExact(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
const CACHE = { x: 560, z: 620 }; // (the field and a margin: beyond it the exact functions)
const roadDist = gridCacheSmooth(roadDistExact, CACHE, 3);
// the Sassho line up the middle from Sapporo station towards Ishikari-Tobetsu (decoration: level crossings)
const RAIL = [[-30, 600], [-20, 420], [10, 300], [22, 200], [-50, 60], [-80, -40], [-125, -150], [-150, -300], [-90, -450], [-70, -600]];
function railDistExact(x: number, z: number) {
  let d = Infinity;
  for (let i = 0; i < RAIL.length - 1; i++) d = Math.min(d, segDist(x, z, RAIL[i], RAIL[i + 1]));
  return d;
}
const railDist = gridCacheSmooth(railDistExact, CACHE, 4);

/** Each side’s air base behind its west flank: Okadama (US), the Ishikari strip (Soviet airborne). Tower 55 m off the strip. */
const AIRFIELDS = [
  { faction: 'nato', x: -250, z: 470, yaw: Math.PI / 2, large: false, name: 'Okadama air base' },
  { faction: 'pact', x: -250, z: -470, yaw: -Math.PI / 2, large: false, name: 'Ishikari strip' },
];
/** How far outside the air bases’ ground (strip, tower, hangars): < 0 inside. */
const airD = (x: number, z: number) => Math.max(Math.abs(x + 250) - 150, Math.abs(Math.abs(z) - 497) - 58);

// the hills, each half its own: [x, z, radius, height] (the four flank hills first, the same height a side)
const HILLS = [[-350, 265, 70, 22], [290, 330, 62, 20], [-265, -345, 72, 22], [370, -215, 66, 20],
  [110, 350, 40, 9], [-200, 340, 42, 10], [-215, -185, 40, 11], [30, -300, 38, 9],         // the low rises, each half its own
  [440, 470, 70, 16], [450, -450, 66, 15]];
const BIG_HILLS = { nato: [[-350, 265], [290, 330]], pact: [[-265, -345], [370, -215]] };
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillHExact(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d = (Math.hypot(x - hx, z - hz) / r) * warp(x, z);
    h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  return h;
}
const hillH = gridCacheSmooth(hillHExact, CACHE, 4);

/** Low ground (0): along the roads, round the points and bases. */
function lowD(x: number, z: number) {
  let d = roadDist(x, z) - 14;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 55);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x, z - bz) - 70);
  return d;
}
/** The Teine mountains over the west, the Nopporo hills east of the Toyohira: both astride the middle. */
function massExact(x: number, z: number) {
  const teine = smoothstep(1.0, 0.3, Math.hypot((x + 440) / 160, (z - 10) / 230) + 0.12 * fbm(noise, x * 0.01 - 30, z * 0.01, 2));
  const nopporo = smoothstep(1.0, 0.35, Math.hypot((x - 470) / 100, (z - 25) / 230) + 0.12 * fbm(noise, x * 0.01 + 70, z * 0.01, 2)) * 0.55;
  return Math.max(teine, nopporo) * smoothstep(8, 80, lowD(x, z));
}
const mountK = gridCacheSmooth(massExact, CACHE, 4);
/** The towns: Shinkotoni round the middle, Sapporo’s northern edge round the station (US), Hanakawa (Soviet). */
const TOWNS = [{ x: -20, z: -25, rx: 125, rz: 110 }, { x: 70, z: 250, rx: 85, rz: 65 }, { x: -95, z: -250, rx: 80, rz: 65 }];
const townE = (x: number, z: number) => Math.min(...TOWNS.map((t) => Math.hypot((x - t.x) / t.rx, (z - t.z) / t.rz)));
const townK = (x: number, z: number) => smoothstep(1.0, 0.85, townE(x, z));
/** The towns’ big buildings (the station, the danchi blocks, Shinkotoni’s shrine and torii): [x, z, r] the houses keep out of. */
const BIG = [[32, 262, 21], [-78, 18, 22], [118, 222, 21], [-40, -262, 21], [40, -75, 18]];
/** The farmland: flat ground away from the hills, roads, towns, points and the river’s banks. */
function fieldKExact(x: number, z: number) {
  if (roadDist(x, z) < 8 || nearPoint(x, z, 40) || railDist(x, z) < 7 || riverD(x, z) < HW + 26 || airD(x, z) < 10) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(0.06, 0.01, mountK(x, z)) * (1 - townK(x, z))
    * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x)) * smoothstep(55, 70, Math.hypot(x, Math.abs(z) - BASE_Z));
}
const fieldK = gridCacheSmooth(fieldKExact, CACHE, 4);
/** Rice where the blob is high (the paddies), dairy pasture elsewhere. */
const blob = (x: number, z: number) => fbm(noise, x * 0.006 + 13, z * 0.006 - 7, 2);
const RICE = 0.0;

function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = LAND + n * 1.5 + hillH(x, z);
  const mk = mountK(x, z);
  if (mk > 0) h += mk * (22 + ridged(noise, x * 0.0055 + 9, z * 0.0055, 2) * 50); // (steep, but not so steep the conifers can’t hold on)
  const fk = fieldK(x, z);
  if (fk > 0) h += (LAND + Math.round(n * 5) * 0.25 - h) * fk;                     // terraced paddies and levelled pastures
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * (20 + ridged(noise, x * 0.01, z * 0.01, 3) * 24) * smoothstep(-640, -580, z);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, z) * 18;                         // Sapporo’s southern hills behind the south edge (the Ishikari’s flats behind the north)
  h += (LAND - h) * smoothstep(20, 0, airD(x, z));                                // the air bases’ levelled ground
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const fieldC = gridCache((x: number, z: number) => fieldK(x, z), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => { const fk = fieldC(x, z); return fk <= 0.05 || blob(x, z) < RICE ? 1 : 1 - fk * (foot ? 0.3 : 0.55); }; // (September: the paddies still wet)
/** Conifer and birch on the Teine mountains, the Nopporo hills and the flank hills. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(5, 12, hillH(x, z)), smoothstep(0.06, 0.25, mountK(x, z)))
  * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1) * smoothstep(0, 20, airD(x, z))
  * smoothstep(30, 42, Math.hypot(x - JINGU[0], z - JINGU[1]));                     // (the Jingu’s grounds and its torii walk kept clear)
const JINGU = [-381, 254]; // (between the hall at (-372, 238) and its outer torii)
const woodsC = gridCache(woodsK, BOUNDS);
const bund = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return Math.min(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11)) > 13.6;
};

/** A Hokkaido house: one or two storeys of pale siding under a low tin roof, painted red, blue or green. */
const ROOFS = [0x9a3a2e, 0x3e5a7e, 0x4a6e52, 0x7a4a2e, 0x8a2e34];
function jpHouse(props: any, { x, z, yaw, w, d, storeys = 2, name = 'house' }: any) {
  const r = props.rand;
  const b = props.beginBuilding(name, x, z, yaw, w, d);
  const siding = [0xc8c2b4, 0xb8b4a8, 0xd2c8b0, 0xa8aca6][Math.floor(r() * 4)];
  b.plaster = siding;
  const h = storeys * 2.8;
  props.shell(b, { height: h, storeys, t: 0.35, color: siding, bay: 2.4, sill: 0.9, head: 2.2, frame: 0x6a6a64, front: [(r() - 0.5) * w * 0.4] });
  props.piece('stone', b, 0, 0.1, 0, w + 0.2, 0.4, d + 0.2, 0x7a766e);
  props.gableRoof(b, { eave: h, pitch: 0.38, t: 0.35, overhang: 0.6, color: ROOFS[Math.floor(r() * ROOFS.length)] });
  props.endBuilding();
}
/** A dairy farm: the red barn, its silo, the farmhouse beside the yard. */
function dairyFarm(props: any, terrain: any, x: number, z: number, yaw: number) {
  const b = props.beginBuilding('dairy barn', x, z, yaw, 20, 10);
  b.plaster = 0x8a3428;
  props.shell(b, { height: 4.2, t: 0.4, color: 0x8a3428, bay: 3.2, sill: 1.6, head: 2.6, frame: 0xd8d4c8, front: [0, -5, 5] });
  props.gableRoof(b, { eave: 4.2, pitch: 0.8, t: 0.4, overhang: 0.5, color: 0x4e6a5a });
  props.endBuilding();
  const c = Math.cos(yaw), s = Math.sin(yaw);
  props.tanks({ x: x + c * 13, z: z - s * 13, yaw, count: 1, radius: 2.3, height: 12, color: 0xb4b0a4 });
  props.box('metal', x + c * 13, terrain.heightAt(x + c * 13, z - s * 13) + 12.6, z - s * 13, 3.6, 1.2, 3.6, yaw, 0x4e6a5a);
  jpHouse(props, { x: x + s * 16, z: z + c * 16, yaw, w: 9, d: 7, storeys: 2, name: 'farmhouse' });
}
/** A Shinto shrine: the hall under its green copper roof, the red torii before it. */
function shrine(props: any, terrain: any, x: number, z: number, yaw: number, name: string, big: boolean) {
  const w = big ? 14 : 8, d = big ? 10 : 6;
  const b = props.beginBuilding(name, x, z, yaw, w, d);
  b.plaster = 0x6a4a32;
  props.shell(b, { height: big ? 3.6 : 2.8, t: 0.35, color: 0x6a4a32, bay: 2.2, sill: 1.0, head: 2.4, frame: 0x3a2a1e, front: [0] });
  props.piece('stone', b, 0, 0.3, 0, w + 1.6, 0.8, d + 1.6, 0x8a8678);
  props.gableRoof(b, { eave: big ? 3.6 : 2.8, pitch: 0.6, t: 0.35, overhang: big ? 1.4 : 0.9, color: 0x4e7a6a });
  props.endBuilding();
  const s = Math.sin(yaw), c = Math.cos(yaw);
  for (const k of big ? [d / 2 + 12, d / 2 + 34] : [d / 2 + 9]) {
    const tx = x + s * k, tz = z + c * k, y = terrain.heightAt(tx, tz), hw = big ? 2.6 : 1.8, ht = big ? 5.6 : 4;
    for (const sd of [-1, 1]) props.box('plain', tx + c * hw * sd, y + ht / 2, tz - s * hw * sd, 0.55, ht, 0.55, yaw, 0xc0402a);
    props.box('plain', tx, y + ht + 0.2, tz, hw * 2 + 2.2, 0.38, 0.6, yaw, 0x2a2420);       // kasagi
    props.box('plain', tx, y + ht - 0.15, tz, hw * 2 + 1.6, 0.3, 0.5, yaw, 0xc0402a);
    props.box('plain', tx, y + ht - 1.1, tz, hw * 2 + 0.9, 0.26, 0.32, yaw, 0xc0402a);      // nuki
  }
}

export default {
  id: 'hokkaido',
  name: 'Hokkaido',
  description: 'The Ishikari plain north of Sapporo, September 1985: the Soviet army has landed in Ishikari Bay and drives south for Sapporo against the US forces — rice paddies and dairy farms, the Toyohira and its bridges, the wooded Teine mountains and Nopporo hills, Japanese towns with a Shinto shrine, an air base behind each flank.',
  epochs: ['1985'],
  region: 'korea',
  armies: { nato: ['us'], pact: ['sov'] }, // (the US forces flown north to hold Hokkaido against the Soviet Far East Military District)
  sides: { nato: 'United States', pact: 'Soviet Union' },
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  steep: 0.6, // (the Teine mountains: vehicles keep to the plain)
  soft,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIRFIELDS,
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a grey late-September day over the plain, the rice gold, the pastures still green, the birches just turning
    fogColor: 0xb4bab8, fogDensity: 0.0014,
    skyTop: 0x66788c, skyHorizon: 0xc8cecc, skyBottom: 0x76786c,
    sunColor: 0xf4ecd8, sunIntensity: 1.8, sunDisk: 0.25,
    clouds: 0.6, cloudLight: 0xe4e6e4, cloudDark: 0x8a9096,
    sunDir: [-0.35, 0.6, 0.6],
    hemiSky: 0xc4ccd4, hemiGround: 0x545a3a, hemiIntensity: 1.3,
    rimColor: 0xc8ced2, rimIntensity: 0.2,
    terrain: {
      grass: '#5a7034', grassAlt: '#52662e', dryGrass: '#8e8650', dirt: '#5e4e3a', rock: '#74706a',
      pasture: '#5c7636', ploughed: '#5a4834', stubble: '#9a8a52', meadow: '#668040',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < (townK(x, z) > 0.5 ? 5 : 4)) return [0x6e6c68, 0.88];                 // asphalt
        if (railDist(x, z) < 3) return [0x4e4a44, 0.9];                                            // ballast
        if (townK(x, z) > 0.6) return [0x8a8478, 0.6];                                             // lanes and yards
        if (riverD(x, z) < HW + 22 && y < 2.2) return [0x9e9884, 0.8];                             // the Toyohira’s gravel banks
        const fk = fieldC(x, z);
        if (fk > 0.3) {
          if (blob(x, z) < RICE) return [noise(x * 0.03, z * 0.03) > 0.25 ? 0x7a8a40 : 0x5e7a34, fk * 0.7]; // dairy pasture, a few hay meadows
          if (bund(x, z)) return [0x5e6a36, 0.8];                                                 // the bunds
          const k = noise(x * 0.04, z * 0.04);
          return [k > 0.3 ? 0xa89a48 : k > -0.3 ? 0xb8a650 : 0x8a8a44, fk * 0.85];                 // ripe rice
        }
        if (y > LAND + 55) return [0x8a8a80, smoothstep(0.0, 0.5, noise(x * 0.025, z * 0.025)) * smoothstep(LAND + 55, LAND + 90, y) * 0.8]; // Teine’s bare tops
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1-ya Rota', facing: 0 }],
  },

  // trenches and MG nests on each side's two flank hills, a dug-in post above its own bridge
  battlefield() {
    const works: any[] = [];
    for (const [f, m] of [['nato', 1], ['pact', -1]] as const) {
      for (const [hx, hz] of BIG_HILLS[f]) {
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + (m > 0 ? 0.2 : 0.7), x = hx + Math.cos(ang) * 32, z = hz + Math.sin(ang) * 32;
          if (roadDist(x, z) < 6) continue;
          works.push({ kind: a % 2 ? 'mgNest' : 'trench', x, z, yaw: Math.atan2(Math.cos(ang), Math.sin(ang)), faction: f });
        }
      }
      const c = river.crossings.find((q) => Math.sign(q.z) === m && Math.abs(q.z) > 300)!;
      const x = c.x - 40, z = c.z - m * 30;
      if (roadDist(x, z) > 8) works.push({ kind: 'trench', x, z, yaw: m > 0 ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);
    props.rand = mulberry32(1985_92);
    const r0 = props.rand;
    const free = (x: number, z: number, r: number) => roadDist(x, z) > 7 + r && railDist(x, z) > 6 + r && riverD(x, z) > HW + 12 + r
      && !nearPoint(x, z, 16 + r) && mountK(x, z) < 0.05 && hillH(x, z) < 6 && Math.hypot(x, Math.abs(z) - BASE_Z) > 45 && airD(x, z) > 10 + r;

    // ---- the Sassho line and Sapporo station beside it
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    props.townHouse({ x: 32, z: 262, yaw: Math.PI / 2 + 0.11, width: 24, depth: 10, storeys: 2, name: 'Sapporo station', damaged: 0 });
    props.wagon({ x: -14, z: 360, yaw: Math.PI / 2 - 0.08, kind: 'box', color: 0x5a3a2e });
    // ---- the towns: Japanese houses in their lanes, a few shops and a block of flats on the main road
    for (const t of TOWNS) for (let gx = t.x - t.rx; gx <= t.x + t.rx; gx += 14) for (let gz = t.z - t.rz; gz <= t.z + t.rz; gz += 13) {
      const x = gx + (r0() - 0.5) * 4, z = gz + (r0() - 0.5) * 4;
      if (townK(x, z) < 0.5 || !free(x, z, 3) || r0() < 0.2 || BIG.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br)) continue;
      const yaw = r0() < 0.5 ? 0 : Math.PI / 2;
      if (roadDist(x, z) < 22 && r0() < 0.25) props.flatHouse({ x, z, yaw, width: 9 + r0() * 3, depth: 8, storeys: 2 + Math.floor(r0() * 2), name: 'shop' });
      else jpHouse(props, { x, z, yaw, w: 8 + r0() * 2, d: 6.5 + r0() * 1.5, storeys: r0() < 0.6 ? 2 : 1 });
    }
    props.ruinBlock({ x: -78, z: 18, yaw: 0, width: 28, depth: 11, storeys: 5, ruin: 0, name: 'danchi apartment block' });
    props.ruinBlock({ x: 118, z: 222, yaw: Math.PI / 2, width: 26, depth: 11, storeys: 5, ruin: 0, name: 'danchi apartment block' });
    props.ruinBlock({ x: -40, z: -262, yaw: 0, width: 26, depth: 11, storeys: 4, ruin: 0, name: 'danchi apartment block' });
    // ---- the shrines: the Hokkaido Jingu on Maruyama, Shinkotoni’s village shrine
    shrine(props, terrain, -372, 238, -0.5, 'Hokkaido Jingu', true);
    shrine(props, terrain, 40, -70, Math.PI, 'Shinkotoni shrine', false);
    // ---- the dairy farms and paddy farmhouses out on the plain, hay and the bridgeheads’ sandbags (each half its own dice)
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_93 + m);
      const r = props.rand;
      let farms = 0;
      for (let i = 0; i < 160; i++) {
        const x = (r() * 2 - 1) * 460, z = (100 + r() * 410) * m;
        if (fieldC(x, z) < 0.5 || !free(x, z, 14)) continue;
        if (blob(x, z) < RICE && farms < 7 && free(x, z, 22)) { dairyFarm(props, terrain, x, z, r() < 0.5 ? 0 : Math.PI / 2); farms++; }
        else if (r() < 0.35) jpHouse(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 9, d: 7, storeys: 1, name: 'farmhouse' });
        else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 3) });
      }
      for (const [hx, hz] of BIG_HILLS[m > 0 ? 'nato' : 'pact']) props.mast({ x: hx + 9 * m, z: hz - 7 * m, height: 10 });
    }
    // ---- the villages on the far hills: Nopporo’s and Tobetsu’s farms
    for (const [x, z, yaw] of [[318, 368, 0], [262, 296, Math.PI / 2], [398, -190, 0], [342, -250, Math.PI / 2]] as const) dairyFarm(props, terrain, x, z, yaw);
    // ---- the air bases’ edges: hardened shelters beyond each strip’s west end
    for (const m of [1, -1]) for (const dz of [-20, 22]) props.aircraftShelter({ x: -432, z: m * (500 + dz), yaw: Math.PI / 2 });
    props.rand = mulberry32(1985_94);
    for (const c of river.crossings) props.sandbagRing({ x: c.x - 34, z: c.z + (c.z > 0 ? -22 : c.z < -200 ? 22 : 24), radius: 4.5, toward: c.z > 0 ? -1 : 1 });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: JINGU[0], z: JINGU[1], r: 32 },
      { test: (x: number, z: number) => roadDist(x, z) < 6 || railDist(x, z) < 5 || fieldC(x, z) > 0.2 || townK(x, z) > 0.3 || riverD(x, z) < HW + 24 || airD(x, z) < 12 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 12000, broadleaf: 0.4, autumn: 0.25, maxY: LAND + 140,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
