// Hokkaido, September 1985 (the big field, 1.0 × 1.12 km): the Soviet invasion of Hokkaido that every Cold War planner
// in Tokyo and Washington feared — the Far East Military District’s divisions have landed on the shore of Ishikari Bay
// and drive south across the Ishikari plain for Sapporo, against the US forces sent north to hold it (there is no
// Japanese army in the game: the US Army fights alone here). The ground is the plain where it meets the volcanic
// uplands: Teine, an old volcano, stands alone in the middle-west of the field, a broad cone of lava ridges under
// birch and conifer with a little crater on top, the plain lapping round its feet; the Ishikari winds in great loops
// down the east, its old bends cut off as oxbow lakes (Barato) in the meadows, the Nopporo plateau and Tobetsu’s
// terrace beyond it — two bridges and the Kariki ford over it. The plain itself is the colonists’ grid: square fields
// of potatoes being lifted, ripe rice in the paddies, dairy pasture with red barns and silos, each block ringed by its
// windbreak of poplar and larch; Japanese houses with bright tin roofs in Sapporo’s northern edge, Shinkotoni at the
// volcano’s foot and Hanakawa; the Hokkaido Jingu on wooded Maruyama, the Zenibako hills over the coast road. Behind
// each side an air base’s edge: Okadama for the US, the strip the Soviet airborne took at Ishikari for the Soviets.
// The US hold the south (+z: Makomanai, Sapporo), the Soviets the north (-z: Ishikari, the bay).
// Fairness by distance: Teine straddles the middle so both sides climb it from their own foot; the river and the
// east bank are crossed by each side over its own bridge (as far from its base) and the ford lies on the middle line;
// each side has a town on its centre road (Sapporo’s edge, Hanakawa), a wooded hill on its west (Maruyama, Zenibako)
// and a village across the river (Nopporo, Tobetsu); the points’ leads sum to about nil (tools/map_fairness.py).
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
const HW = 19;          // the Ishikari’s half-width
const noise = createNoise2D(1985_91);

// ---- the Ishikari down the east in its loops (in from Ebetsu at the south-east, out to the bay past the north edge),
// and two of its old bends cut off: the oxbow by Shinkotoni, Barato lake on the east bank
const ISHIKARI = [[640, 430], [470, 400], [340, 345], [258, 252], [300, 150], [332, 62], [282, -8], [298, -108], [362, -178], [334, -282], [232, -360], [178, -470], [205, -700]];
const OXBOWS = [[[118, 205, 9], [92, 158, 11], [108, 104, 11], [158, 84, 9]], [[396, -46, 9], [446, -78, 11], [452, -140, 11], [410, -182, 9]]];
const CROSS = [
  { name: 'Kariki bridge', x: 291, z: 172, kind: 'bridge', width: 14, channel: 0 },
  { name: 'Kariki ford', x: 290, z: 4, kind: 'ford', width: 18, channel: 0 },
  { name: 'Barato bridge', x: 346, z: -228, kind: 'bridge', width: 14, channel: 0 },
];
const river = createRiver({ paths: [ISHIKARI, ...OXBOWS], halfWidth: HW, level: 0, depth: 2.8, valley: 38, crossings: CROSS });
// (the courses are straight between their points: the distance to the polylines is exact, and far cheaper than river.project;
// an oxbow is narrower than the river, so its distance counts from as far out as the river’s)
const riverD = (x: number, z: number) => {
  let d = Infinity;
  for (const c of [ISHIKARI, ...OXBOWS]) for (let i = 0; i < c.length - 1; i++) d = Math.min(d, segDist(x, z, c[i], c[i + 1]) + HW - (c[i][2] ?? HW));
  return d;
};

const points: ControlPointDef[] = [
  { id: 'A', name: 'Makomanai', x: 40, z: 465, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Maruyama', x: -365, z: 330, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Sapporo station', x: 75, z: 245, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Nopporo', x: 425, z: 265, owner: null, sector: 'east', radius: 26 },
  { id: 'E', name: 'Teine', x: -205, z: -25, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Shinkotoni', x: 115, z: -15, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Kariki ford', x: 262, z: 8, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Zenibako', x: -395, z: -270, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Hanakawa', x: -40, z: -245, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Tobetsu', x: 440, z: -285, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Ishikari', x: -10, z: -470, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- roads: the Ishikari road up the middle past Teine’s eastern foot, a west road round its western foot, the east
// road over the bridges and through Nopporo and Tobetsu, the old road up to the crater; the grid’s section lines
const ROADS: number[][][] = [
  [[0, 640], [0, BASE_Z], at('A'), [70, 360], at('C'), [100, 110], at('F'), [60, -150], at('I'), [-30, -390], at('K'), [0, -BASE_Z], [0, -640]], // the Ishikari road
  [[0, BASE_Z], [-150, 420], at('B'), [-430, 200], [-470, 40], [-450, -150], at('H'), [-200, -420], [0, -BASE_Z]],                         // west: round Teine
  [[0, BASE_Z], [150, 420], [240, 250], [278, 180], [330, 160], [390, 210], at('D'), [470, 120], [440, -40], [430, -150], [395, -215], [320, -240], [270, -300], [180, -400], [0, -BASE_Z]], // east: over the bridges
  [at('D'), [440, -40], at('J'), [395, -215]],                                                                                              // Nopporo – Tobetsu on the east bank
  [at('F'), [200, 0], at('G'), [330, 0], [440, -40]],                                                                                       // through Shinkotoni, out over the ford
  [at('F'), [-40, -10], [-130, -20], at('E')],                                                                                              // the crater road
  [at('B'), [-180, 250], at('C')], [at('H'), [-220, -300], at('I')],                                                                        // section lines, each half its own
  [[-470, 40], [-330, 60], at('E')],
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
const RAIL = [[30, 600], [40, 420], [45, 300], [40, 200], [20, 60], [20, -80], [-10, -200], [-90, -330], [-120, -450], [-130, -600]];
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

// ---- Teine: the old volcano, a cone of lava ridges with a crater on top
const VOL = { x: -205, z: -25, R: 255, H: 74 };
/** the hills, each half its own: [x, z, radius, height] — Maruyama, Zenibako, two old lava knolls */
const HILLS = [[-365, 330, 62, 17], [-395, -270, 66, 18], [-80, 175, 40, 6], [60, -170, 36, 5]];
const BIG_HILLS = { nato: [[-365, 330]], pact: [[-395, -270]] };
/** the low plateaus beyond the river: Nopporo’s forest, Tobetsu’s terrace */
const PLATEAUS = [{ x: 430, z: 270, rx: 105, rz: 150, h: 13 }, { x: 445, z: -295, rx: 95, rz: 120, h: 10 }];
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillHExact(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d = (Math.hypot(x - hx, z - hz) / r) * warp(x, z);
    h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  for (const p of PLATEAUS) h += p.h * smoothstep(1.0, 0.7, Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz) + 0.12 * fbm(noise, x * 0.012 - 9, z * 0.012, 2));
  return h;
}
const hillH = gridCacheSmooth(hillHExact, CACHE, 4);
/** the volcano: 0 at its foot, 1 at the crater’s rim */
function volKExact(x: number, z: number) {
  const a = Math.atan2(z - VOL.z, x - VOL.x);
  const r = Math.hypot(x - VOL.x, z - VOL.z) * (1 + 0.1 * Math.sin(a * 5 + 1) + 0.12 * fbm(noise, x * 0.009 - 30, z * 0.009, 2));
  return Math.max(0, 1 - r / VOL.R);
}
const volK = gridCacheSmooth(volKExact, CACHE, 3);
function volHExact(x: number, z: number) {
  const k = volK(x, z);
  if (k <= 0) return 0;
  const rc = Math.hypot(x - VOL.x, z - VOL.z);
  const lava = ridged(noise, Math.atan2(z - VOL.z, x - VOL.x) * 2.2 + 11, rc * 0.012, 2);          // the lava ridges down its sides
  return VOL.H * k ** 1.65 + k * (1 - k) * 18 * (lava - 0.5) - 7 * smoothstep(34, 8, rc);            // (the crater’s dip at the top)
}
const volH = gridCacheSmooth(volHExact, CACHE, 2);
/** The towns: Sapporo’s northern edge round the station (US), Shinkotoni at the volcano’s foot, Hanakawa (Soviet). */
const TOWNS = [{ x: 85, z: 255, rx: 95, rz: 70 }, { x: 115, z: -15, rx: 85, rz: 95 }, { x: -45, z: -250, rx: 85, rz: 65 }];
const townE = (x: number, z: number) => Math.min(...TOWNS.map((t) => Math.hypot((x - t.x) / t.rx, (z - t.z) / t.rz)));
const townK = (x: number, z: number) => smoothstep(1.0, 0.85, townE(x, z));
/** The towns’ big buildings (the station, the danchi blocks, Shinkotoni’s shrine): [x, z, r] the houses keep out of. */
const BIG = [[61, 272, 21], [150, 40, 22], [130, 230, 21], [-25, -270, 21], [80, -70, 18]];
/** The farmland: flat ground away from the hills, roads, towns, points and the river’s banks. */
function fieldKExact(x: number, z: number) {
  if (roadDist(x, z) < 8 || nearPoint(x, z, 40) || railDist(x, z) < 7 || riverD(x, z) < HW + 26 || airD(x, z) < 10) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(0.1, 0.02, volK(x, z)) * (1 - townK(x, z))
    * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x)) * smoothstep(55, 70, Math.hypot(x, Math.abs(z) - BASE_Z));
}
const fieldK = gridCacheSmooth(fieldKExact, CACHE, 4);
/** Which crop: rice where the blob is low (the wet ground), potatoes in the middle, dairy pasture high. */
const blob = (x: number, z: number) => fbm(noise, x * 0.006 + 13, z * 0.006 - 7, 2);
const RICE = -0.12, POTATO = 0.12;
/** The colonists’ grid: square blocks of 150 m, each ringed by its windbreak (a little off true north). */
const GRID = 150, GA = 0.12, GC = Math.cos(GA), GS = Math.sin(GA);
const gridD = (x: number, z: number) => {
  const u = x * GC + z * GS + 37, v = z * GC - x * GS + 61;
  return Math.max(Math.abs(((u % GRID) + GRID) % GRID - GRID / 2), Math.abs(((v % GRID) + GRID) % GRID - GRID / 2));
};
const windbreak = (x: number, z: number) => gridD(x, z) > GRID / 2 - 4;

function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = LAND + n * 1.5 + hillH(x, z) + volH(x, z);
  const fk = fieldK(x, z);
  if (fk > 0) h += (LAND + Math.round(n * 5) * 0.25 - h) * fk;                     // terraced paddies and levelled fields
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, z) * 18;                         // Sapporo’s southern hills behind the south edge (the bay’s flats behind the north)
  h += (LAND - h) * smoothstep(20, 0, airD(x, z));                                // the air bases’ levelled ground
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const fieldC = gridCache((x: number, z: number) => fieldK(x, z), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => { const fk = fieldC(x, z); return fk <= 0.05 || blob(x, z) > RICE ? 1 : 1 - fk * (foot ? 0.3 : 0.55); }; // (September: the paddies still wet)
const JINGU = [-392, 318]; // (between the hall at (-383, 302) and its outer torii)
/** Birch and conifer on Teine’s flanks (its top bare), the hills and the plateaus, the windbreaks round the fields. */
const woodsK = (x: number, z: number) => {
  const vk = volK(x, z);
  const vol = smoothstep(0.08, 0.2, vk) * smoothstep(0.9, 0.72, vk) * smoothstep(-0.15, 0.1, fbm(noise, x * 0.011 + 91, z * 0.011, 2) + 0.25 * (1 - vk)); // (birch groves between the lava fields)
  const brk = windbreak(x, z) && fieldC(x, z) > 0.3 ? 0.9 : 0;
  return Math.max(smoothstep(6, 11, hillH(x, z)), vol, brk)
    * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1) * smoothstep(0, 20, airD(x, z))
    * smoothstep(30, 42, Math.hypot(x - JINGU[0], z - JINGU[1]));                     // (the Jingu’s grounds and its torii walk kept clear)
};
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
  description: 'The Ishikari plain north of Sapporo, September 1985: the Soviet army has landed in Ishikari Bay and drives south for Sapporo against the US forces — the old volcano Teine alone in the plain, the Ishikari’s loops and oxbow lakes down the east, a grid of potato fields, paddies and dairy farms ringed by windbreaks, Japanese towns with a Shinto shrine, an air base behind each flank.',
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
  steep: 0.6, // (Teine’s lava ridges: vehicles keep to the crater road and the gentler flanks)
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
        if (riverD(x, z) < HW + 22 && y < 2.2) return [0x7e8456, 0.7];                             // the Ishikari’s reedy banks
        const fk = fieldC(x, z);
        if (fk > 0.3) {
          if (gridD(x, z) > GRID / 2 - 7) return [0x5a6a34, 0.8];                                 // the windbreaks’ verges
          const b = blob(x, z);
          if (b > POTATO) return [noise(x * 0.03, z * 0.03) > 0.25 ? 0x7a8a40 : 0x5e7a34, fk * 0.7]; // dairy pasture, a few hay meadows
          if (b > RICE) {                                                                          // potatoes: lifted (bare rows) or still in the haulm
            const u = x * GC + z * GS, rows = Math.abs(((u % 1.6) + 1.6) % 1.6 - 0.8) > 0.45;
            return [noise(x * 0.012 + 5, z * 0.012) > 0 ? (rows ? 0x5a4630 : 0x6a5438) : (rows ? 0x4e5a2e : 0x5e4c34), fk * 0.85];
          }
          if (bund(x, z)) return [0x5e6a36, 0.8];                                                 // the bunds
          const k = noise(x * 0.04, z * 0.04);
          return [k > 0.3 ? 0xa89a48 : k > -0.3 ? 0xb8a650 : 0x8a8a44, fk * 0.85];                 // ripe rice
        }
        if (volK(x, z) > 0.8) return [0x7a6e66, smoothstep(0.8, 0.9, volK(x, z)) * 0.8];                // Teine’s bare cinder top
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

  // trenches and MG nests on each side's flank hill, a dug-in post at its own bridge
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
      const c = river.crossings.find((q) => q.kind === 'bridge' && Math.sign(q.z) === m)!;
      const x = c.x - 38, z = c.z + m * 26;
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
      && !nearPoint(x, z, 16 + r) && volK(x, z) < 0.04 && hillH(x, z) < 6 && Math.hypot(x, Math.abs(z) - BASE_Z) > 45 && airD(x, z) > 10 + r;

    // ---- the Sassho line and Sapporo station beside it
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    props.townHouse({ x: 61, z: 272, yaw: Math.PI / 2 - 0.05, width: 24, depth: 10, storeys: 2, name: 'Sapporo station', damaged: 0 });
    props.wagon({ x: 42.5, z: 360, yaw: Math.PI / 2, kind: 'box', color: 0x5a3a2e });
    // ---- the towns: Japanese houses in their lanes, a few shops and a block of flats on the main road
    for (const t of TOWNS) for (let gx = t.x - t.rx; gx <= t.x + t.rx; gx += 14) for (let gz = t.z - t.rz; gz <= t.z + t.rz; gz += 13) {
      const x = gx + (r0() - 0.5) * 4, z = gz + (r0() - 0.5) * 4;
      if (townK(x, z) < 0.5 || !free(x, z, 3) || r0() < 0.2 || BIG.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br)) continue;
      const yaw = r0() < 0.5 ? 0 : Math.PI / 2;
      if (roadDist(x, z) < 22 && r0() < 0.25) props.flatHouse({ x, z, yaw, width: 9 + r0() * 3, depth: 8, storeys: 2 + Math.floor(r0() * 2), name: 'shop' });
      else jpHouse(props, { x, z, yaw, w: 8 + r0() * 2, d: 6.5 + r0() * 1.5, storeys: r0() < 0.6 ? 2 : 1 });
    }
    props.ruinBlock({ x: 150, z: 40, yaw: 0, width: 28, depth: 11, storeys: 5, ruin: 0, name: 'danchi apartment block' });
    props.ruinBlock({ x: 130, z: 230, yaw: Math.PI / 2, width: 26, depth: 11, storeys: 5, ruin: 0, name: 'danchi apartment block' });
    props.ruinBlock({ x: -25, z: -270, yaw: 0, width: 26, depth: 11, storeys: 4, ruin: 0, name: 'danchi apartment block' });
    // ---- the shrines: the Hokkaido Jingu on Maruyama, Shinkotoni’s village shrine
    shrine(props, terrain, -383, 302, -0.5, 'Hokkaido Jingu', true);
    shrine(props, terrain, 80, -70, Math.PI, 'Shinkotoni shrine', false);
    // ---- the dairy farms and paddy farmhouses out on the plain, hay and the bridgeheads’ sandbags (each half its own dice)
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_93 + m);
      const r = props.rand;
      let farms = 0;
      for (let i = 0; i < 160; i++) {
        const x = (r() * 2 - 1) * 460, z = (100 + r() * 410) * m;
        if (fieldC(x, z) < 0.5 || !free(x, z, 14)) continue;
        if (blob(x, z) > POTATO && farms < 7 && free(x, z, 22)) { dairyFarm(props, terrain, x, z, r() < 0.5 ? 0 : Math.PI / 2); farms++; }
        else if (r() < 0.35) jpHouse(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 9, d: 7, storeys: 1, name: 'farmhouse' });
        else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 3) });
      }
      for (const [hx, hz] of BIG_HILLS[m > 0 ? 'nato' : 'pact']) props.mast({ x: hx + 9 * m, z: hz - 7 * m, height: 10 });
    }
    // ---- the villages across the river: Nopporo’s and Tobetsu’s farms and houses
    for (const [x, z, yaw] of [[455, 300, 0], [392, 232, Math.PI / 2], [470, -257, 0], [410, -317, Math.PI / 2]] as const) dairyFarm(props, terrain, x, z, yaw);
    props.rand = mulberry32(1985_95);
    for (const p of points) if ('DJ'.includes(p.id)) for (let i = 0; i < 9; i++) { const a = props.rand() * 6.28, d = 20 + props.rand() * 40, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (free(x, z, 5) && Math.abs(x) < 490) jpHouse(props, { x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, w: 8 + props.rand() * 2, d: 7, storeys: props.rand() < 0.5 ? 2 : 1 }); }
    // ---- the air bases’ edges: hardened shelters beyond each strip’s west end
    for (const m of [1, -1]) for (const dz of [-20, 22]) props.aircraftShelter({ x: -432, z: m * (500 + dz), yaw: Math.PI / 2 });
    props.rand = mulberry32(1985_94);
    for (const c of river.crossings) { const x = c.x - 36, z = c.z + (c.z > 30 ? 20 : -20); if (!nearPoint(x, z, 10) && roadDist(x, z) > 6) props.sandbagRing({ x, z, radius: 4.5, toward: c.z > 30 ? -1 : 1 }); }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: JINGU[0], z: JINGU[1], r: 32 },
      { test: (x: number, z: number) => roadDist(x, z) < 6 || railDist(x, z) < 5 || (fieldC(x, z) > 0.2 && !windbreak(x, z)) || townK(x, z) > 0.3 || riverD(x, z) < HW + 24 || airD(x, z) < 12 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 6000, broadleaf: 0.45, autumn: 0.25, maxY: LAND + 140,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
