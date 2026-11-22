// Beersheba, 31 October 1917: the eastern end of the Gaza–Beersheba line, and Allenby’s real blow. At dawn the British
// infantry of XX Corps stormed the redoubts on the hills south-west of the town (Hill 1070 among them); all day the
// Desert Mounted Corps worked round to the east, and the New Zealanders took Tel el Saba in the afternoon. With the
// light going and the horses a day without water, Chauvel sent the 4th Australian Light Horse Brigade in: the 4th and
// 12th Light Horse charged at the gallop across six kilometres of open plain, bayonets in their fists, jumped the
// Ottoman trenches and rode into the town before the garrison could blow the wells.
// On the map, compressed: the small Ottoman town of Beersheba in the middle, its grid of streets, the mosque of 1906,
// the Serai and the government houses, the wells in the bed of the Wadi Saba that winds across the whole map through
// the town; the railway from the north (the station on the Ottoman half) running on south towards Asluj (the halt at
// Iswaiwin on the British half); Hill 1070 on the British half and Tel el Saba, the ancient tell, on the Ottoman half;
// the bare stony plain with low scrub where the Light Horse rode, the low rises of Khashim Zanna and Ras Ghannam, the
// Bedouin camps and the stone villages; each side’s line of trenches facing the plain, with a single thin belt of
// wire, and its redoubts on its hill.
// Fair, not mirrored: the town and its wells are the middle point and lie on both banks of the wadi, so neither side
// starts nearer. Tel el Saba’s answer is Hill 1070 — as high, as far from the town and from its own base, each on its
// own side of the wadi; one is a steep round tell with a flat top, the other a broad stony hill. Khashim Zanna answers
// Ras Ghannam, Esani answers Sakati, the Iswaiwin halt answers the station. Each half has the same open plain between
// its line and the town, so the charge pays for either side’s horsemen; the wadi crosses every route once.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { arabVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(1917_10);

/** The Wadi Saba, dry in October, from the west edge through the town to the east edge. */
const WADI = [[-560, 170], [-430, 92], [-310, 40], [-190, 58], [-90, 30], [0, 0], [95, -18], [200, -50], [320, -12], [440, -58], [560, -92]];
const wadiD = gridCache((x: number, z: number) => segDist(WADI, x, z) + fbm(noise, x * 0.02 + 3, z * 0.02, 2) * 3, EXT, 2);
/** The railway: from the north to the station, past the town’s west edge, over the wadi and on south to the Iswaiwin halt. */
const RAIL = [[-110, -600], [-85, -400], [-66, -215], [-72, -110], [-66, 0], [-40, 110], [12, 190], [40, 250], [62, 400], [86, 600]];
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), EXT, 1);
const onRail = (x: number, z: number) => railD(x, z) < 2.4;
/** The tracks: the Asluj road and the Hebron road through the town, the tracks to Tel el Saba and Hill 1070, a lateral road behind each line. */
const ROADS = [
  [[0, 600], [0, 470], [22, 330], [12, 180], [0, 60], [0, 0], [-12, -80], [-30, -200], [0, -340], [0, -470], [0, -600]],
  [[0, 0], [150, -84], [295, -195], [395, -265], [420, -600]],
  [[0, 0], [-150, 80], [-300, 175], [-370, 300], [-400, 600]],
  [[-520, 340], [-370, 300], [-150, 290], [40, 250], [310, 290], [520, 320]],
  [[-520, -330], [-280, -300], [-70, -215], [150, -270], [395, -265], [520, -290]],
  [[310, 290], [200, 150], [12, 120]],
  [[-280, -300], [-180, -150], [-20, -120]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
const TOWN_R = 95;
/** Each side’s fire trench facing the plain (z of it), at the same depth, each its own course. */
const lineZ = (x: number, s: number) => (s > 0 ? 150 + 16 * Math.sin(x * 0.009 + 0.7) : -150 - 18 * Math.sin(x * 0.011 + 2.2));
const HILL = { x: -290, z: 160 };   // Hill 1070
const TEL = { x: 295, z: -195 };    // Tel el Saba

function groundRaw(x: number, z: number) {
  let h = 3 + fbm(noise, x * 0.004, z * 0.004, 4) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.8;
  h += smoothstep(380 + 60 * Math.sin(z * 0.006 + 1), 560, Math.abs(x)) * (10 + ridged(noise, x * 0.008, z * 0.008, 4) * 12) * (1 + 0.06 * smoothstep(-100, 100, z)); // the bare hills round the basin (the ridged noise runs a touch lower on the British half: evened)
  for (const [hx, hz, r, hh] of [[310, 290, 120, 6], [-280, -300, 130, 6], [-140, 380, 100, 4], [220, -340, 150, 3]]) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5; // Khashim Zanna, Ras Ghannam and lesser rises
  // Hill 1070: a broad stony hill, its redoubt on top
  h += 19.5 * smoothstep(135, 0, Math.hypot((x - HILL.x) * 0.8, (z - HILL.z) * 1.3) + fbm(noise, x * 0.02, z * 0.02, 2) * 10) ** 1.4;
  // Tel el Saba: a low skirt, then the steep round tell with its flat top
  const td = Math.hypot(x - TEL.x, z - TEL.z) + fbm(noise, x * 0.03, z * 0.03, 2) * 6;
  h += 5 * smoothstep(150, 60, td) + 12 * smoothstep(78, 30, td);
  const w = wadiD(x, z);
  h -= 3 * smoothstep(13, 4, w);                                                       // the wadi’s bed
  for (const p of points) if (p.id !== 'E' && p.id !== 'G') h += (3 - h) * smoothstep(42, 24, Math.hypot(x - p.x, z - p.z));
  for (const bz of [BASE_Z, -BASE_Z]) h += (3.5 - h) * smoothstep(32, 16, Math.hypot(x, z - bz));
  return h;
}
const height = gridCacheSmooth(groundRaw, EXT, 2);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Asluj road', 0, 470, 'centre'),
  P('B', 'Esani', -370, 300, 'west'),
  P('C', 'Iswaiwin halt', 40, 250, 'centre'),
  P('D', 'Khashim Zanna', 310, 290, 'east'),
  P('E', 'Hill 1070', HILL.x, HILL.z, 'west', { radius: 30 }),
  P('F', 'Beersheba wells', 0, 0, 'centre', { radius: 34 }),
  P('G', 'Tel el Saba', TEL.x, TEL.z, 'east', { radius: 30 }),
  P('H', 'Ras Ghannam', -280, -300, 'west'),
  P('I', 'Beersheba station', -70, -215, 'centre'),
  P('J', 'Sakati', 395, -265, 'east'),
  P('K', 'Hebron road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Section' }];

export default {
  id: 'beersheba',
  name: 'Beersheba',
  description: '31 October 1917, at dusk: the small Ottoman town of Beersheba and its wells in the dry Wadi Saba, Hill 1070 and the tell of Tel el Saba, the railway and its station, and the bare stony plain where the Australian Light Horse charged the trenches at the gallop.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  armies: { nato: ['anzac', 'uk'], pact: ['ot', 'de'] }, // (the Desert Mounted Corps and XX Corps against the Ottoman III Corps, German officers and MGs with it)
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  conditions: { time: 'dusk', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.6, // (the tell’s sides)
  seed: 1917,
  height,
  fields: createFields({ seed: 191710, cell: 80 }),

  theme: {
    // a dry October evening, the sun going down behind the town, dust kicked up over the plain
    fogColor: 0xd6b892, fogDensity: 0.001, skyTop: 0x5a78a6, skyHorizon: 0xeec394, skyBottom: 0xb09070,
    sunColor: 0xffc890, sunIntensity: 1.9, sunDisk: 0.9, clouds: 0.1, cloudLight: 0xf8dcc0, cloudDark: 0xb89888,
    sunDir: [-0.7, 0.22, -0.4], hemiSky: 0xd4ccc8, hemiGround: 0x9a7c58, hemiIntensity: 1.1, rimColor: 0xf6c890, rimIntensity: 0.4,
    terrain: {
      grass: '#ae9870', grassAlt: '#a28e66', dryGrass: '#c4ae7e', dirt: '#9c7a56', rock: '#a69882',
      pasture: '#aa966c', ploughed: '#98744e', stubble: '#c6ae7c', meadow: '#a8966c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRail(x, z)) return [0x6a5e50, 0.9];
        if (onRoad(x, z)) return [0xc8b48c, 0.85];                                         // the dusty tracks
        if (wadiD(x, z) < 9) return [0xd8cdb4, 0.85];                                       // the wadi’s pale stones and gravel
        if (Math.hypot(x, z) < TOWN_R) return [0xbca886, 0.55];                              // the town’s beaten earth
        if (Math.hypot(x - TEL.x, z - TEL.z) < 80) return [0xb8a688, 0.6];                  // the tell’s ancient rubble
        if (y > 12) return [0xb2a07c, 0.55];                                                // stony hilltops
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.2 ? [0x8a8256, Math.min(0.4, (scrub - 0.2) * 2)] : null;             // the low scrub
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Takım' })),
  },

  /** Each side’s fire trench facing the plain, one thin belt of wire with many gaps; a redoubt on each hill; MGs at the town’s edge. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -460; x <= 460; x += 30) pts.push([x * s, lineZ(x * s, s)]);           // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 30, belts: 1, gapEvery: 36 })) if (!onRoad(w.x, w.z) && !onRail(w.x, w.z) && wadiD(w.x, w.z) > 14) works.push(w);
      // the redoubt: a ring of trench round the hilltop, no wire
      const c = f === 'nato' ? HILL : TEL, ring: number[][] = [];
      for (let a = 0; a <= 12; a++) ring.push([c.x + Math.cos(a * Math.PI / 6) * 20, c.z - Math.sin(a * Math.PI / 6) * 20]);
      for (const w of trenchLine(ring, f, { wireAt: 0, belts: 0 })) if (!onRoad(w.x, w.z)) works.push(w);
      for (const dx of s > 0 ? [-26, 30] : [-34, 22]) works.push({ kind: 'mgNest', x: dx, z: 58 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => onRoad(x, z) || onRoad(x + 6, z) || onRoad(x - 6, z) || onRoad(x, z + 6) || onRoad(x, z - 6) || railD(x, z) < 9 || wadiD(x, z) < 13;

    // the town: a grid of flat-roofed houses on both banks, the mosque, the Serai and the government houses, the wells in the bed
    props.rand = mulberry32(1917);
    const tr = props.rand;
    props.flatHouse({ x: 34, z: -44, yaw: 0, width: 12, depth: 10, name: 'mosque', dome: true });
    props.column({ x: 44, z: -36, radius: 1.4, height: 14 });                                 // its minaret
    props.flatHouse({ x: -34, z: -48, yaw: 0, width: 22, depth: 12, storeys: 2, name: 'Serai' });
    props.flatHouse({ x: 36, z: 46, yaw: 0, width: 18, depth: 10, storeys: 2, name: 'government house' });
    props.flatHouse({ x: -38, z: 44, yaw: 0, width: 16, depth: 10, storeys: 2, name: 'hospital' });
    const taken = [[34, -44, 12], [-34, -48, 16], [36, 46, 14], [-38, 44, 13]];
    for (let gx = -84; gx <= 84; gx += 19) for (let gz = -84; gz <= 84; gz += 17) {
      const x = gx + (tr() - 0.5) * 3, z = gz + (tr() - 0.5) * 3;
      if (Math.hypot(x, z) > TOWN_R - 6 || Math.hypot(x, z) < 26 || skip(x, z) || tr() < 0.25 || taken.some(([a, b, r]) => Math.hypot(a - x, b - z) < r + 5)) continue;
      props.flatHouse({ x, z, yaw: 0, width: 7 + tr() * 4, depth: 6 + tr() * 3, storeys: tr() < 0.25 ? 2 : 1 });
      if (tr() < 0.4) props.lowWall({ x: x + 6, z: z + 5, yaw: Math.PI / 2, length: 7, height: 1.7, color: 0xb8a07a });
    }
    for (const [x, z] of [[-10, 6], [8, -6], [2, 14], [-16, -8]]) { props.column({ x, z, radius: 1.5, height: 0.9 }); props.lowWall({ x: x + 2.5, z, yaw: Math.PI / 2, length: 3, height: 0.8, color: 0xc0b090 }); } // the wells and their troughs
    // the villages of Esani and Sakati, the halt village at Iswaiwin
    arabVillage(props, -370, 300, 9, 19171, skip);
    arabVillage(props, 395, -265, 9, 19172, skip);
    arabVillage(props, 70, 290, 5, 19173, skip, false);
    // the railway: rails, the station with its water tower and goods shed, wagons in the siding; the Iswaiwin halt
    props.rand = mulberry32(19174);
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 30);
      for (let k = 0; k < n; k++) props.rails({ x0: ax + (bx - ax) * k / n, z0: az + (bz - az) * k / n, x1: ax + (bx - ax) * (k + 1) / n, z1: az + (bz - az) * (k + 1) / n });
    }
    props.flatHouse({ x: -46, z: -212, yaw: Math.PI / 2, width: 16, depth: 8, storeys: 2, name: 'station' });
    props.hall({ x: -48, z: -250, yaw: Math.PI / 2, width: 18, depth: 10, height: 5, color: 0xa89878, roof: 0x6a6660, door: 6, name: 'goods shed' });
    props.tanks({ x: -84, z: -190, yaw: 0, count: 1, radius: 2.2, height: 8, color: 0x5a5048 });
    for (const [z, kind, c] of [[-300, 'box', 0x6a4a34], [-314, 'box', 0x5a3e2c], [-328, 'open', 0x6a5a44]] as [number, string, number][]) {
      props.wagon({ x: -85 + 19 * (z + 400) / 185, z, yaw: Math.atan2(19, 185), kind, color: c });   // (in the siding north of the station)
    }
    props.flatHouse({ x: 64, z: 248, yaw: Math.PI / 2, width: 10, depth: 7, name: 'halt' });
    props.tanks({ x: 20, z: 278, yaw: 0, count: 1, radius: 2, height: 7, color: 0x5a5048 });
    props.hall({ x: 4, z: 214, yaw: Math.PI / 2, width: 14, depth: 8, height: 4.5, color: 0xa89878, roof: 0x6a6660, door: 5, name: 'store shed' });
    // the Bedouin camps on Khashim Zanna and Ras Ghannam: black tents, stone folds
    for (const [cx, cz, seed] of [[310, 290, 19175], [-280, -300, 19176]]) {
      props.rand = mulberry32(seed);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + props.rand(), d = 14 + props.rand() * 16, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (!skip(x, z)) props.tent({ x, z, yaw: a, color: 0x3a3430 });
      }
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.5, x = cx + Math.cos(a) * 34, z = cz + Math.sin(a) * 34;
        if (!skip(x, z)) props.lowWall({ x, z, yaw: a + Math.PI / 2, length: 10, height: 1.2, color: 0xa89878 });
      }
    }
    // the tell’s top: fallen ashlars, the defenders’ sangars; Hill 1070’s stones
    props.rand = mulberry32(19177);
    for (const [x, z, yaw, length] of [[-14, 8, 0.3, 12], [18, -6, 1.4, 9], [6, 18, 1.1, 8]]) props.lowWall({ x: TEL.x + x, z: TEL.z + z, yaw, length, height: 1.25, color: 0xb4a688 });
    for (let i = 0; i < 10; i++) props.boulder({ x: TEL.x + (props.rand() - 0.5) * 60, z: TEL.z + (props.rand() - 0.5) * 60, radius: 0.8 + props.rand() });
    for (let i = 0; i < 14; i++) props.boulder({ x: HILL.x + (props.rand() - 0.5) * 120, z: HILL.z + (props.rand() - 0.5) * 100, radius: 0.8 + props.rand() * 1.2 });
    // stones and sangars on the plain, kept off the middle of each half so the horsemen have their run
    const r = mulberry32(1918);
    const open = (x: number, z: number) => Math.abs(x) < 200 && Math.abs(z) > 60 && Math.abs(z) < 230;
    for (let i = 0, n = 0; i < 4000 && n < 56; i++) {
      const x = (r() * 2 - 1) * 470, z = (n % 2 ? -1 : 1) * (30 + r() * 480);
      if (skip(x, z) || open(x, z) || nearPoint(x, z, 45) || Math.hypot(x, z) < TOWN_R + 20 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45) continue;
      n++;
      buildSite(props, { kind: ['rocks', 'fieldwall', 'rocks', 'wrecks'][Math.floor(n / 2) % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    // palms by the wells, along the bed through the town (where no house stands)
    for (let i = 0; i < 60; i++) {
      const a = r() * Math.PI * 2, d = 18 + r() * 70, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (onRoad(x, z) || railD(x, z) < 6 || wadiD(x, z) > 12 || wadiD(x, z) < 6) continue;
      props.rand = mulberry32(i);
      props.palm({ x, z, height: 7 + r() * 5 });
    }
    commandPost(props, this.bases.nato, -1, 0xb0a07a);
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { x: 0, z: 0, r: TOWN_R },
      { test: (x: number, z: number) => onRoad(x, z) || railD(x, z) < 4 || wadiD(x, z) < 3 }];
    // tamarisks along the wadi, a thin scatter of acacia over the rest (as thick on each half)
    const f = (x: number, z: number) => fbm(noise, x * 0.01 + 20, z * 0.01, 2);
    const tP = evenThreshold(f, 0.35, (x, z) => z > 0);
    const tamarisks = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 260, broadleaf: 1, autumn: 0.15, size: 0.55, maxY: 60,
      avoid, forest: (x: number, z: number) => (wadiD(x, z) < 22 ? 0.5 : -1) });
    const acacias = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 140, broadleaf: 1, autumn: 0.25, size: 0.6, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => Math.abs(x) < 200 && Math.abs(z) > 60 && Math.abs(z) < 230 }],
      forest: (x: number, z: number) => (f(x, z) > (z > 0 ? 0.35 : tP) ? 0.3 : 0.01) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.45, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); tamarisks.update(dt, t); acacias.update(dt, t); },
    };
  },
} satisfies MapDef;
