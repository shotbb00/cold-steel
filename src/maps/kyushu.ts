// Kyushu, November 1945: Operation Olympic carried inland (1945 only; the big field, 1.0 × 1.12 km; the Pacific: the US
// Army’s I Corps and the Marines’ V Amphibious Corps against the Imperial Japanese Army’s 57th Army). The invasion of
// Japan that never came: had the war gone on, the Americans would have landed on the beaches of the Miyazaki coast on
// 1 November 1945 and fought inland across the Miyazaki plain against divisions dug in for the "decisive battle" of the
// homeland — every hill tunnelled, spider holes in the paddy bunds, the kamikaze airfields behind. On the map,
// compressed: the US come from the beaches (+z, Sumiyoshi on the coast), the Japanese from inland (-z, Takaoka up the
// valley). The Ōyodo runs down the west of the plain from the hills to the sea, bridged at Tachibana (the US end) and at
// Takaoka (the Japanese end), forded in the middle. East of the plain the terraced hills of Heiwadai and Kunitomi —
// cedar (sugi) and bamboo, rice terraces stepped up their lower slopes, cave galleries in their faces (systems/Caves.js:
// the Japanese defence’s) — with the Hakkō Ichiu tower on its hill; across the river Kibana and Tano. Between them the
// plain: harvested paddies behind their bunds (still wet: map.soft), rice drying on the racks, Miyazaki’s tile-roofed
// houses round its station on the Nippō line and its prefectural office, Miyazaki Jingū in the middle with its torii,
// Kiyotake on the Japanese half; the Ikime burial mounds on their hill. Behind each side’s east flank the edge of a
// kamikaze airfield: Miyazaki (Akae) taken by the US, Nyūtabaru still the Japanese’.
// Fairness: not a mirror — the Ōyodo wanders its own way, the towns, hills and points lie where each half has them —
// but the Heiwadai hills straddle the middle so neither side starts on them, and the one ford lies on the centre line;
// each side has its own bridge over the Ōyodo at the same distance from its base (z ±422); each has a wooded, terraced
// hill on each flank of the same height (Ikime and Kibana against Kunitomi and Tano), a town on its centre road
// (Miyazaki / Kiyotake, each with a station) and an airfield on its east flank; Kibana, far over the river for the US,
// is answered by Tano nearer the middle for the Japanese, and the points’ leads sum to about nil.
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
const HW = 12;          // the Ōyodo’s half-width
const noise = createNoise2D(1945_11);

// ---- the Ōyodo down the west of the plain, from the hills (-z) to the sea (+z)
const OYODO = [[-230, -690], [-214, -600], [-204, -480], [-176, -380], [-189, -250], [-214, -130], [-190, -5], [-176, 80], [-152, 180], [-205, 310], [-195, 430], [-176, 560], [-162, 700]];
const CROSS = [
  { name: 'Takaoka bridge', x: -189, z: -422, kind: 'bridge', width: 14, channel: 0 },
  { name: 'Ōyodo ford', x: -190, z: -5, kind: 'ford', width: 18, channel: 0 },
  { name: 'Tachibana bridge', x: -196, z: 422, kind: 'bridge', width: 14, channel: 0 },
];
const river = createRiver({ paths: [OYODO], halfWidth: HW, level: 0, depth: 2.6, valley: 34, crossings: CROSS });
const riverD = (x: number, z: number) => {
  let d = Infinity;
  for (let i = 0; i < OYODO.length - 1; i++) d = Math.min(d, segDist(x, z, OYODO[i], OYODO[i + 1]));
  return d;
};

const points: ControlPointDef[] = [
  { id: 'A', name: 'Sumiyoshi', x: -35, z: 465, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Ikime mounds', x: 352, z: 268, owner: null, sector: 'east', radius: 24 },
  { id: 'C', name: 'Miyazaki station', x: -60, z: 238, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Kibana', x: -292, z: 326, owner: null, sector: 'west', radius: 24 },
  { id: 'E', name: 'Hakkō Ichiu tower', x: 258, z: 12, owner: null, sector: 'east', radius: 24 },
  { id: 'F', name: 'Miyazaki Jingū', x: 12, z: -18, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Ōyodo ford', x: -236, z: -5, owner: null, sector: 'west', radius: 24 },
  { id: 'H', name: 'Kunitomi', x: 268, z: -342, owner: null, sector: 'east', radius: 24 },
  { id: 'I', name: 'Kiyotake', x: 92, z: -242, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Tano', x: -368, z: -218, owner: null, sector: 'west', radius: 24 },
  { id: 'K', name: 'Takaoka', x: 10, z: -470, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- roads: the Takaoka road up the middle, an east road under the hills, a west road over the two bridges
const ROADS: number[][][] = [
  [[0, 640], [0, BASE_Z], at('A'), [-55, 360], at('C'), [-20, 110], at('F'), [50, -130], at('I'), [40, -380], at('K'), [0, -BASE_Z], [0, -640]], // the Takaoka road
  [[0, BASE_Z], [150, 420], at('B'), [330, 150], at('E'), [280, -130], at('H'), [150, -430], [0, -BASE_Z]],                               // east: under the hills
  [[0, BASE_Z], [-120, 450], [-160, 432], [-235, 412], [-280, 395], at('D'), [-280, 200], [-255, 60], at('G'), [-275, -110], at('J'), [-290, -370], [-230, -410], [-150, -432], [-90, -462], [0, -BASE_Z]], // west: over the bridges
  [at('B'), at('C')], [at('H'), at('I')],                                                                                                  // laterals, each half its own
  [at('E'), at('F')], [at('F'), [-150, -8], at('G')],                                                                                      // through Miyazaki Jingū’s town, out over the ford
  [[120, 60], [-100, 40]], [[100, -90], [-80, -70]],                                                                                       // its streets
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
// the Nippō main line up the middle through Miyazaki station and Kiyotake (decoration: level crossings)
const RAIL = [[30, 600], [20, 420], [-10, 300], [-22, 200], [50, 60], [80, -40], [125, -150], [150, -300], [90, -450], [70, -600]];
function railDistExact(x: number, z: number) {
  let d = Infinity;
  for (let i = 0; i < RAIL.length - 1; i++) d = Math.min(d, segDist(x, z, RAIL[i], RAIL[i + 1]));
  return d;
}
const railDist = gridCacheSmooth(railDistExact, CACHE, 4);

/** Each side’s kamikaze airfield behind its east flank: Miyazaki (Akae, the US), Nyūtabaru (Japanese). Tower 55 m off the strip. */
const AIRFIELDS = [
  { faction: 'nato', x: 250, z: 470, yaw: Math.PI / 2, large: false, name: 'Miyazaki airfield' },
  { faction: 'pact', x: 250, z: -470, yaw: -Math.PI / 2, large: false, name: 'Nyūtabaru airfield' },
];
/** How far outside the airfields’ ground (strip, tower, hangars): < 0 inside. */
const airD = (x: number, z: number) => Math.max(Math.abs(x - 250) - 150, Math.abs(Math.abs(z) - 497) - 58);

// the hills, each half its own: [x, z, radius, height] (the four flank hills first, the same height a side)
const HILLS = [[352, 268, 70, 22], [-292, 326, 62, 20], [268, -342, 72, 22], [-368, -218, 66, 20],
  [-115, 345, 40, 9], [205, 335, 42, 10], [212, -190, 40, 11], [-30, -305, 38, 9],          // the low rises, each half its own
  [-440, 470, 70, 16], [-450, -450, 66, 15],
  [328, 238, 13, 4], [384, 300, 11, 3.5], [318, 302, 10, 3]];                             // the Ikime burial mounds round B
const BIG_HILLS = { nato: [[352, 268], [-292, 326]], pact: [[268, -342], [-368, -218]] };
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
/** The Heiwadai hills over the east, the low hills beyond the Ōyodo in the west: both astride the middle. */
function massExact(x: number, z: number) {
  const heiwadai = smoothstep(1.0, 0.3, Math.hypot((x - 440) / 160, (z - 10) / 230) + 0.12 * fbm(noise, x * 0.01 - 30, z * 0.01, 2));
  const west = smoothstep(1.0, 0.35, Math.hypot((x + 470) / 100, (z - 25) / 230) + 0.12 * fbm(noise, x * 0.01 + 70, z * 0.01, 2)) * 0.55;
  return Math.max(heiwadai, west) * smoothstep(8, 80, lowD(x, z));
}
const mountK = gridCacheSmooth(massExact, CACHE, 4);
/** The towns: round Miyazaki Jingū in the middle, Miyazaki round its station (US), Kiyotake (Japanese). */
const TOWNS = [{ x: 20, z: -25, rx: 125, rz: 110 }, { x: -70, z: 250, rx: 85, rz: 65 }, { x: 95, z: -250, rx: 80, rz: 65 }];
const townE = (x: number, z: number) => Math.min(...TOWNS.map((t) => Math.hypot((x - t.x) / t.rx, (z - t.z) / t.rz)));
const townK = (x: number, z: number) => smoothstep(1.0, 0.85, townE(x, z));
/** The towns’ big buildings (the stations, the prefectural office, the shrine, the rice store, the brewery): [x, z, r] the houses keep out of. */
const BIG = [[-32, 262, 21], [-118, 222, 21], [-40, -78, 24], [-40, -46, 14], [-40, -28, 10], [78, 18, 18], [40, -262, 18], [128, -252, 14]];
/** The farmland: flat ground away from the hills, roads, towns, points and the river’s banks. */
function fieldKExact(x: number, z: number) {
  if (roadDist(x, z) < 8 || nearPoint(x, z, 40) || railDist(x, z) < 7 || riverD(x, z) < HW + 26 || airD(x, z) < 10) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(0.06, 0.01, mountK(x, z)) * (1 - townK(x, z))
    * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x)) * smoothstep(55, 70, Math.hypot(x, Math.abs(z) - BASE_Z));
}
const fieldK = gridCacheSmooth(fieldKExact, CACHE, 4);
/** Rice nearly everywhere on the plain; a few dry fields of sweet potato and winter barley where the blob is low. */
const blob = (x: number, z: number) => fbm(noise, x * 0.006 + 13, z * 0.006 - 7, 2);
const DRY = -0.25;
/** The bunds round the paddy plots (30 × 22 m): 1 on a bund, 0 inside the plot. */
const bundK = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return smoothstep(12.2, 13.2, Math.max(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11) + 4));
};

function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = LAND + n * 1.5 + hillH(x, z);
  const mk = mountK(x, z);
  if (mk > 0) h += mk * (20 + ridged(noise, x * 0.0055 + 9, z * 0.0055, 2) * 46);
  // the terraces: the hills’ lower slopes stepped into rice terraces, a riser every 2.2 m (blended: vehicles still climb)
  const tk = smoothstep(LAND + 1.5, LAND + 4, h) * smoothstep(LAND + 26, LAND + 18, h);
  if (tk > 0) {
    const t = h / 2.2, f = Math.floor(t);
    h += ((f + smoothstep(0.55, 1, t - f)) * 2.2 - h) * tk * 0.6;
  }
  const fk = fieldK(x, z);
  if (fk > 0) h += (LAND + Math.round(n * 5) * 0.25 + 0.4 * bundK(x, z) - h) * fk;  // the paddies, each level behind its bund
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * (20 + ridged(noise, x * 0.01, z * 0.01, 3) * 24) * smoothstep(-640, -580, z);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, -z) * 22;                        // the Kirishima foothills behind the inland edge (the coast behind the other)
  h += (LAND - h) * smoothstep(20, 0, airD(x, z));                                // the airfields’ levelled ground
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const fieldC = gridCache((x: number, z: number) => fieldK(x, z), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => { const fk = fieldC(x, z); return fk <= 0.05 || blob(x, z) < DRY ? 1 : 1 - fk * (foot ? 0.25 : 0.5); }; // (November: the rice cut, the paddies still wet)
/** Cedar and broadleaf on the Heiwadai hills, the western hills and the flank hills. */
const TOWER = [272, 32]; // the Hakkō Ichiu tower on its hill (its forecourt kept clear)
const woodsK = (x: number, z: number) => Math.max(smoothstep(5, 12, hillH(x, z)) * smoothstep(13, 18, hillH(x, z) + mountK(x, z) * 40), smoothstep(0.1, 0.3, mountK(x, z)))
  * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1) * smoothstep(0, 20, airD(x, z))
  * smoothstep(22, 34, Math.hypot(x - TOWER[0], z - TOWER[1]));
const woodsC = gridCache(woodsK, BOUNDS);
const free = (x: number, z: number, r: number) => roadDist(x, z) > 7 + r && railDist(x, z) > 6 + r && riverD(x, z) > HW + 12 + r
  && !nearPoint(x, z, 16 + r) && mountK(x, z) < 0.05 && hillH(x, z) < 6 && Math.hypot(x, Math.abs(z) - BASE_Z) > 45 && airD(x, z) > 10 + r;
/** The bamboo groves round the farms and at the foot of the hills, each half its own dice: [x, z, r]. */
let groveList: number[][] | null = null;
function groves() {
  if (groveList) return groveList;
  groveList = [];
  for (const m of [1, -1]) {
    const r = mulberry32(1945_1101 + m);
    for (let i = 0, n = 0; i < 400 && n < 20; i++) {
      const x = (r() * 2 - 1) * 450, z = (80 + r() * 400) * m, rad = 6 + r() * 5;
      if (!free(x, z, rad + 4) || townK(x, z) > 0.2 || fieldC(x, z) > 0.6 || groveList.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < 40)) continue;
      groveList.push([x, z, rad]); n++;
    }
  }
  return groveList;
}
const groveC = gridCache((x: number, z: number) => (groves().some(([gx, gz, gr]) => Math.hypot(x - gx, z - gz) < gr) ? 0.8 : 0), BOUNDS);
/** The cave galleries (systems/Caves.js): dug into the hills for the decisive battle. */
const CAVES = [
  { name: 'Heiwadai, south face', x: 330, z: -52 },
  { name: 'Heiwadai, north face', x: 352, z: 112 },
  { name: 'Ikime hill', x: 398, z: 236 },
  { name: 'Kibana hill', x: -322, z: 296 },
  { name: 'Kunitomi hill', x: 296, z: -316 },
  { name: 'Tano hill', x: -396, z: -244 },
];

/** A Miyazaki house of 1945: dark cedar boards or white plaster, one or two storeys under grey kawara tiles. */
const ROOFS = [0x4a4c50, 0x3e4044, 0x55575a, 0x5a5048];
function jpHouse(props: any, { x, z, yaw, w, d, storeys = 1, name = 'house' }: any) {
  const r = props.rand;
  const b = props.beginBuilding(name, x, z, yaw, w, d);
  const wall = [0x5a4632, 0x4e3e2e, 0xd8d0be, 0x6a5440][Math.floor(r() * 4)];
  b.plaster = wall;
  const h = storeys * 2.7;
  props.shell(b, { height: h, storeys, t: 0.3, color: wall, bay: 1.8, sill: 0.8, head: 2.1, frame: 0x3a2e24, front: [(r() - 0.5) * w * 0.4] });
  props.piece('stone', b, 0, 0.15, 0, w + 0.2, 0.5, d + 0.2, 0x7a766e);
  props.gableRoof(b, { eave: h, pitch: 0.55, t: 0.35, overhang: 0.8, color: ROOFS[Math.floor(r() * ROOFS.length)] });
  props.endBuilding();
}
/** A Shinto shrine: the hall under its cypress-bark roof, the red torii before it. */
function shrine(props: any, terrain: any, x: number, z: number, yaw: number, name: string, big: boolean) {
  const w = big ? 14 : 8, d = big ? 10 : 6;
  const b = props.beginBuilding(name, x, z, yaw, w, d);
  b.plaster = 0x6a4a32;
  props.shell(b, { height: big ? 3.6 : 2.8, t: 0.35, color: 0x6a4a32, bay: 2.2, sill: 1.0, head: 2.4, frame: 0x3a2a1e, front: [0] });
  props.piece('stone', b, 0, 0.3, 0, w + 1.6, 0.8, d + 1.6, 0x8a8678);
  props.gableRoof(b, { eave: big ? 3.6 : 2.8, pitch: 0.6, t: 0.35, overhang: big ? 1.4 : 0.9, color: big ? 0x4a3a30 : 0x4e5a52 });
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
/** A kamikaze plane in its earth revetment: an old Zero waiting for its last flight (cover, not a unit). */
function revetedPlane(props: any, terrain: any, cover: any, x: number, z: number, yaw: number) {
  const g = terrain.heightAt(x, z), s = Math.sin(yaw), c = Math.cos(yaw);
  props.sandbagRing({ x, z, radius: 8, toward: Math.cos(yaw) > 0 ? -1 : 1 });
  props.box('metal', x, g + 1.4, z, 1.1, 1.1, 8, yaw, 0x4a5a3a);                                   // fuselage
  props.box('metal', x + s * 0.8, g + 1.0, z + c * 0.8, 11, 0.18, 1.9, yaw, 0x4a5a3a);            // wings
  props.box('metal', x - s * 3.6, g + 1.6, z - c * 3.6, 3.4, 0.14, 0.9, yaw, 0x4a5a3a);           // tailplane
  props.box('metal', x - s * 3.7, g + 2.3, z - c * 3.7, 0.12, 1.3, 1.1, yaw, 0x4a5a3a);           // fin
  props.box('metal', x + s * 4.1, g + 1.4, z + c * 4.1, 1.2, 1.2, 0.4, yaw, 0x2a2826);            // cowling
  cover.addBox({ x, z, yaw, length: 8, thickness: 3, height: 1.6 });
}

export default {
  id: 'kyushu',
  name: 'Miyazaki Plain',
  description: 'Kyushu, November 1945 — the invasion of Japan that never came: the Americans fight inland from the Miyazaki beaches across harvested paddies, the Ōyodo and its bridges, Miyazaki and its shrine, against terraced hills of cedar and bamboo full of caves, with the kamikaze airfields behind.',
  epochs: ['1945'],
  region: 'pacific',
  pacific: true,
  armies: { nato: ['us', 'usmc'], pact: ['jp'] }, // (Operation Olympic: the Sixth Army’s I Corps and V Amphibious Corps against the 57th Army)
  sides: { nato: 'United States', pact: 'Japan' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1945,
  height,
  steep: 0.6, // (the Heiwadai hills: vehicles keep to the plain and the terraces)
  soft,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIRFIELDS,
  caves: { owner: 'pact', list: CAVES },
  woods: (x: number, z: number) => Math.max(woodsC(x, z) * 0.85, groveC(x, z)),

  theme: {
    // a clear November day in the south: low autumn sun, the stubble gold, the cedars black-green, maples turning on the hills
    fogColor: 0xc4c8c4, fogDensity: 0.0011,
    skyTop: 0x5a80aa, skyHorizon: 0xd0d4cc, skyBottom: 0x80806c,
    sunColor: 0xfff0d4, sunIntensity: 2.0, sunDisk: 0.3,
    clouds: 0.35, cloudLight: 0xf0f0ec, cloudDark: 0x8e949a,
    sunDir: [0.45, 0.5, 0.55],
    hemiSky: 0xc8d0d8, hemiGround: 0x5a5638, hemiIntensity: 1.3,
    rimColor: 0xd0d4d6, rimIntensity: 0.2,
    terrain: {
      grass: '#5e6a34', grassAlt: '#56602e', dryGrass: '#988a50', dirt: '#5e4c36', rock: '#787264',
      pasture: '#64703a', ploughed: '#5a4632', stubble: '#a08c52', meadow: '#6a7440',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < (townK(x, z) > 0.5 ? 4.5 : 3.5)) return [0x8a7e66, 0.88];              // gravel and packed earth
        if (railDist(x, z) < 3) return [0x4e4a44, 0.9];                                            // ballast
        if (townK(x, z) > 0.6) return [0x8a8070, 0.6];                                             // lanes and yards
        if (riverD(x, z) < HW + 22 && y < 2.2) return [0xa49c88, 0.8];                             // the Ōyodo’s gravel banks
        const fk = fieldC(x, z);
        if (fk > 0.3) {
          if (blob(x, z) < DRY) return [noise(x * 0.03, z * 0.03) > 0.2 ? 0x6a7a3a : 0x5c4a34, fk * 0.7]; // dry fields: winter barley, dug potato rows
          if (bundK(x, z) > 0.5) return [0x5e6a34, 0.85];                                                 // the bunds
          const k = noise(x * 0.04, z * 0.04);
          return [k > 0.35 ? 0x6a6046 : k > -0.3 ? 0xa08e54 : 0x8a7a4a, fk * 0.85];               // the stubble, wet mud in the low plots
        }
        if (y > LAND + 1.5 && y < LAND + 22 && (hillH(x, z) > 2 || mountK(x, z) > 0.04)) {                // the terraces: stubble on the treads, grass on the risers
          const t = (y / 2.2) % 1;
          return t < 0.5 ? [0x9a8a52, 0.7] : [0x56622e, 0.6];
        }
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
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1st Company', facing: 0 }],
  },

  // trenches and MG nests on each side’s two flank hills, a dug-in post above its own bridge
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
      const x = c.x + 40, z = c.z - m * 30;
      if (roadDist(x, z) > 8) works.push({ kind: 'trench', x, z, yaw: m > 0 ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);
    props.rand = mulberry32(1945_1102);
    const r0 = props.rand;

    // ---- the Nippō line, Miyazaki station and the Kiyotake halt beside it
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    props.townHouse({ x: -32, z: 262, yaw: Math.PI / 2 - 0.11, width: 24, depth: 10, storeys: 2, name: 'Miyazaki station', damaged: 0.2 });
    props.townHouse({ x: 128, z: -252, yaw: Math.PI / 2 + 0.17, width: 14, depth: 8, storeys: 1, name: 'Kiyotake station', damaged: 0.1 });
    props.wagon({ x: 14, z: 360, yaw: Math.PI / 2 + 0.08, kind: 'box', color: 0x4a3a2e });
    props.wagon({ x: 112, z: -400, yaw: Math.PI / 2 - 0.35, kind: 'open', color: 0x4a3a2e });
    // ---- the towns: tile-roofed houses in their lanes, a few shops of two storeys on the main road, some burnt out by the B-29s
    for (const t of TOWNS) for (let gx = t.x - t.rx; gx <= t.x + t.rx; gx += 13) for (let gz = t.z - t.rz; gz <= t.z + t.rz; gz += 12) {
      const x = gx + (r0() - 0.5) * 4, z = gz + (r0() - 0.5) * 4;
      if (townK(x, z) < 0.5 || !free(x, z, 3) || r0() < 0.2 || BIG.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br)) continue;
      const yaw = r0() < 0.5 ? 0 : Math.PI / 2;
      if (r0() < 0.1) { // burnt out in the B-29 raids: ash, a charred post or two
        props.rubble(x, z, 0.5, true);
        for (const k of [-2, 2]) props.box('plain', x + k, terrain.heightAt(x + k, z) + 1.2, z + k * 0.6, 0.25, 2.4, 0.25, 0, 0x1e1a16, 0.15 * k, 0);
      } else jpHouse(props, { x, z, yaw, w: 7.5 + r0() * 2.5, d: 6 + r0() * 2, storeys: roadDist(x, z) < 20 && r0() < 0.5 ? 2 : 1, name: roadDist(x, z) < 20 ? 'shop' : 'house' });
    }
    props.townHouse({ x: -118, z: 222, yaw: 0, width: 26, depth: 12, storeys: 3, name: 'Miyazaki prefectural office', damaged: 0.15 });
    props.ruinBlock({ x: 78, z: 18, yaw: Math.PI / 2, width: 22, depth: 12, storeys: 1, ruin: 0, name: 'rice store' });
    props.ruinBlock({ x: 40, z: -262, yaw: 0, width: 20, depth: 11, storeys: 2, ruin: 0, name: 'sake brewery' });
    // ---- the shrines: Miyazaki Jingū in the middle, the town shrines of Miyazaki and Kiyotake
    shrine(props, terrain, -40, -82, 0, 'Miyazaki Jingū', true);
    shrine(props, terrain, -112, 290, Math.PI, 'Miyazaki town shrine', false);
    shrine(props, terrain, 60, -205, 0, 'Kiyotake shrine', false);
    // ---- the Hakkō Ichiu tower on its hill: a stone slab tower on a broad base
    {
      const [x, z] = TOWER, g = terrain.heightAt(x, z);
      props.box('stone', x, g + 0.6, z, 14, 1.8, 14, 0.3, 0x9a9488);
      props.box('stone', x, g + 9, z, 6, 16, 3.2, 0.3, 0xb0aa9c);
      props.box('stone', x, g + 18, z, 4.4, 2.4, 2.4, 0.3, 0xa8a294);
      cover.addBox({ x, z, yaw: 0.3, length: 6, thickness: 3.2, height: 8 });
    }
    // ---- the farms out on the plain, the rice on its drying racks, the bamboo groves (each half its own dice)
    for (const m of [1, -1]) {
      props.rand = mulberry32(1945_1103 + m);
      const r = props.rand;
      for (let i = 0; i < 160; i++) {
        const x = (r() * 2 - 1) * 460, z = (100 + r() * 410) * m;
        if (fieldC(x, z) < 0.5 || !free(x, z, 10)) continue;
        if (r() < 0.3) jpHouse(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 10, d: 7, storeys: 1, name: 'farmhouse' });
        else { // hazagake: a rail on posts hung with the cut rice
          const yaw = r() < 0.5 ? 0 : Math.PI / 2, s = Math.sin(yaw), c = Math.cos(yaw), g = terrain.heightAt(x, z);
          for (const k of [-3, 0, 3]) props.box('plain', x + s * k, g + 1.0, z + c * k, 0.12, 2.0, 0.12, yaw, 0x5a4a36);
          props.box('plain', x, g + 1.25, z, 0.5, 1.1, 6.6, yaw, 0xb09a5a);
          cover.addBox({ x, z, yaw, length: 6.6, thickness: 0.6, height: 1.6 });
        }
      }
      for (const [hx, hz] of BIG_HILLS[m > 0 ? 'nato' : 'pact']) props.mast({ x: hx - 9 * m, z: hz - 7 * m, height: 9 });
    }
    props.rand = mulberry32(1945_1104);
    for (const [gx, gz, gr] of groves()) { // culms leaning a little, their crowns pale green at the top
      const R = props.rand;
      for (let k = 0; k < gr * 4; k++) {
        const a = R() * Math.PI * 2, d = Math.sqrt(R()) * gr, x = gx + Math.cos(a) * d, z = gz + Math.sin(a) * d, g = terrain.heightAt(x, z), h = 7 + R() * 5;
        const lx = (R() - 0.5) * 0.16, lz = (R() - 0.5) * 0.16;
        props.box('plain', x, g + h / 2, z, 0.14, h, 0.14, 0, 0x6e8a3e, lx, lz);
        props.box('plain', x + lz * h * 0.4, g + h * 0.78, z - lx * h * 0.4, 1.3, h * 0.4, 1.3, R() * 3, R() < 0.5 ? 0x6a8a3e : 0x5a7a34, lx, lz);
      }
    }
    // ---- the spider holes in the hills’ approaches: a pit under its straw lid, propped open
    for (const [hx, hz] of [...BIG_HILLS.nato, ...BIG_HILLS.pact]) {
      const R = props.rand;
      for (let k = 0; k < 8; k++) {
        const a = R() * Math.PI * 2, x = hx + Math.cos(a) * (48 + R() * 16), z = hz + Math.sin(a) * (48 + R() * 16);
        if (roadDist(x, z) < 6 || nearPoint(x, z, 14)) continue;
        const g = terrain.heightAt(x, z);
        props.box('plain', x, g + 0.03, z, 1.0, 0.08, 1.0, a, 0x14120e);
        props.box('plain', x + 0.5, g + 0.25, z, 1.1, 0.12, 1.1, a, 0x9a8a58, 0, 0.5);
      }
    }
    // ---- the airfields’ edges: timber hangars beyond each strip’s east end, kamikaze planes in their revetments
    for (const m of [1, -1]) {
      for (const dz of [-24, 24]) props.timberHangar({ x: 432, z: m * (500 + dz), yaw: -Math.PI / 2 });
      for (const dx of [150, 190]) revetedPlane(props, terrain, cover, dx, m * 535, m > 0 ? Math.PI : 0);
    }
    props.rand = mulberry32(1945_1105);
    for (const c of river.crossings) props.sandbagRing({ x: c.x + 34, z: c.z + (c.z > 0 ? -22 : c.z < -200 ? 22 : 24), radius: 4.5, toward: c.z > 0 ? -1 : 1 });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x6a6640);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: TOWER[0], z: TOWER[1], r: 24 },
      { test: (x: number, z: number) => roadDist(x, z) < 6 || railDist(x, z) < 5 || fieldC(x, z) > 0.2 || townK(x, z) > 0.3 || riverD(x, z) < HW + 24 || airD(x, z) < 12 || groveC(x, z) > 0 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 12000, broadleaf: 0.3, autumn: 0.3, maxY: LAND + 140,
      forest: (x: number, z: number) => woodsC(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
