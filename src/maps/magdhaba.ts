// The Battle of Magdhaba, 23 December 1916. After the Ottomans left El Arish, Chauvel’s ANZAC Mounted Division and the
// Imperial Camel Corps Brigade rode through the night some 30 km up the Wadi El Arish to Magdhaba, where the garrison of
// the 80th Regiment held five redoubts dug in on the low rises either side of the wadi, round the wells and the mud-brick
// buildings — the last water before the desert. Bristol fighters and BE2s of No. 1 Squadron AFC spotted the redoubts
// from the air; the Light Horse, the New Zealanders and the cameliers closed in from the north, east and west, and with
// the horses’ water running out and Chauvel about to call it off, No. 2 Redoubt fell to the bayonet and the rest followed.
// On the map, compressed: the wide dry bed of the Wadi El Arish winding west–east across the middle, pale gravel between
// steep earth banks, tamarisk scrub thick along it; Magdhaba in the bed and on both banks, its mud-brick houses, the
// police post and the wells; the five redoubts on low rises; the El Arish road from the north (the British base), the
// Hassana track from the south (the Ottoman base); gravel desert with low dunes round it all, soft on the dune crests.
// Fair, not mirrored: the wadi meanders, so the western ford lies just inside the British half beside No. 2 Redoubt
// and the eastern ford just inside the Ottoman half beside No. 3 Redoubt — one crossing each, at the same depth, each
// under its own redoubt. No. 1 Redoubt (British half) answers No. 4 (Ottoman half), as high, as far from home; Lahfan’s
// wells answer the garrison camp, the Camel Corps dune the Abu Aweigila dune. No. 5 Redoubt rings the wells at Magdhaba
// itself, in the middle, and belongs to neither; the village straddles the bed, half on each bank.
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
const SIDE_X = 300;
const noise = createNoise2D(1916_12);

/** The Wadi El Arish, dry in December, west to east: north of the middle in the west, south of it in the east. */
const WADI = [[-560, 150], [-420, 105], [-290, 45], [-170, 52], [-70, 22], [0, 0], [70, -22], [170, -52], [290, -45], [420, -105], [560, -150]];
const wadiD = gridCache((x: number, z: number) => segDist(WADI, x, z) + fbm(noise, x * 0.02 + 3, z * 0.02, 2) * 3, EXT, 2);
/** The crossings: the western ford (British half), Magdhaba, the eastern ford (Ottoman half). */
const FORDS = [[-280, 44], [0, 0], [280, -44]];
/** The tracks: the El Arish road – Magdhaba – Hassana track through the middle, a track over each ford from flank to
 * flank, each side’s lateral behind its line. */
const ROADS = [
  [[0, 600], [0, 470], [40, 250], [15, 110], [0, 0], [-15, -110], [-90, -235], [0, -470], [0, -600]],
  [[-520, 370], [-360, 300], [-290, 100], [-280, 44], [-260, -60], [-340, -330], [-520, -390]],
  [[520, 390], [330, 300], [290, 60], [280, -44], [330, -90], [290, -310], [520, -370]],
  [[-360, 300], [-150, 380], [0, 400], [330, 380], [330, 300]],
  [[-340, -330], [-150, -400], [0, -405], [290, -380], [290, -310]],
  [[-290, 100], [-150, 105], [15, 110]],
  [[330, -90], [150, -105], [-15, -110]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
const fordK = (x: number, z: number) => { let k = 0; for (const [fx, fz] of FORDS) k = Math.max(k, smoothstep(34, 14, Math.hypot(x - fx, z - fz))); return k; };

/** The low rises [x, z, r, height]: the four outer redoubts, the two big dunes, Lahfan and the garrison camp are flats. */
const RISES = [[40, 250, 70, 7], [-90, -235, 70, 7], [-290, 100, 60, 6], [330, -90, 60, 6], [330, 300, 105, 13], [290, -310, 105, 13]];

function groundRaw(x: number, z: number) {
  let h = 5 + fbm(noise, x * 0.003, z * 0.003, 3) * 2.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.6;
  for (const [rx, rz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - rx, z - rz)) ** 1.4;
  // the low dunes on the gravel: away from the wadi, the tracks and the points
  const u = x * 0.8 + z * 0.6, v = -x * 0.6 + z * 0.8;
  let keep = smoothstep(6, 20, roadD(x, z)) * smoothstep(40, 80, wadiD(x, z));
  for (const p of points) keep = Math.min(keep, smoothstep(26, 50, Math.hypot(x - p.x, z - p.z)));
  h += keep * (ridged(noise, u * 0.008 + 3, v * 0.02, 3) * 4.5 + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.8);
  // the wadi: a flat gravel bed 4 m down between steep banks, shallower and ramped at the fords
  const w = wadiD(x, z);
  h -= (4.2 - 2.8 * fordK(x, z)) * smoothstep(17, 9, w);
  for (const bz of [BASE_Z, -BASE_Z]) h += (5 - h) * smoothstep(36, 18, Math.hypot(x, z - bz));
  return Math.max(h, 0.5);
}
const height = gridCacheSmooth(groundRaw, EXT, 2);

/** Loose sand on the dune crests and the big dunes; the gravel, the wadi bed and the tracks are firm. */
const sandK = gridCache((x: number, z: number) => {
  const firm = Math.max(smoothstep(8, 3, roadD(x, z)), smoothstep(60, 30, wadiD(x, z)));
  return (1 - firm) * smoothstep(6.5, 11, height(x, z));
}, EXT, 4);
const soft = (x: number, z: number, foot: boolean) => 1 - sandK(x, z) * (foot ? 0.25 : 0.45);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'El Arish road', 0, 470, 'centre'),
  P('B', 'Lahfan wells', -360, 300, 'west'),
  P('C', 'No. 1 Redoubt', 40, 250, 'centre'),
  P('D', 'Camel Corps dune', 330, 300, 'east'),
  P('E', 'No. 2 Redoubt', -290, 100, 'west'),
  P('F', 'Magdhaba', 0, 0, 'centre', { radius: 34 }),
  P('G', 'No. 3 Redoubt', 330, -90, 'east'),
  P('H', 'Garrison camp', -340, -330, 'west'),
  P('I', 'No. 4 Redoubt', -90, -235, 'centre'),
  P('J', 'Abu Aweigila dune', 290, -310, 'east'),
  P('K', 'Hassana track', 0, -470, 'centre'),
] as any[];

/** The five redoubts [x, z, ring radius]: No. 1–4 on their rises, No. 5 round the wells. */
const REDOUBTS = [[40, 250, 20], [-290, 100, 20], [330, -90, 20], [-90, -235, 20], [0, 0, 44]];
const villageSkip = (x: number, z: number) => onRoad(x, z) || roadD(x, z) < 7 || wadiD(x, z) < 15 || Math.hypot(x, z) < 50;

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Section' }];

export default {
  id: 'magdhaba',
  name: 'Magdhaba',
  description: '23 December 1916, at dawn: the Ottoman garrison’s five redoubts on the low rises either side of the dry Wadi El Arish, round the wells and mud-brick houses of Magdhaba — the wide gravel bed between steep banks, tamarisk scrub, and gravel desert with low dunes all round, where the ANZAC Mounted Division and the Camel Corps rode in through the night.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  armies: { nato: ['anzac', 'uk'], pact: ['ot', 'de'] }, // (the ANZAC Mounted Division and the Imperial Camel Corps against the Ottoman 80th Regiment)
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.6, // (the wadi banks)
  seed: 1916,
  height,
  soft,
  fields: createFields({ seed: 191612, cell: 80 }),

  theme: {
    // a cold, clear December dawn in the Sinai: long shadows, the gravel still blue-grey
    fogColor: 0xd8ccb8, fogDensity: 0.0009, skyTop: 0x6c8cbc, skyHorizon: 0xecd6b8, skyBottom: 0xbaa486,
    sunColor: 0xffe2bc, sunIntensity: 2.0, sunDisk: 0.8, clouds: 0.06, cloudLight: 0xf8ecdc, cloudDark: 0xc8bcae,
    sunDir: [0.7, 0.3, 0.35], hemiSky: 0xd6d8e0, hemiGround: 0xa48c66, hemiIntensity: 1.15, rimColor: 0xf4dcb8, rimIntensity: 0.35,
    terrain: {
      grass: '#b8a47c', grassAlt: '#ae9a72', dryGrass: '#c8b484', dirt: '#a2845c', rock: '#a89a80',
      pasture: '#b4a078', ploughed: '#9c7e58', stubble: '#c6b082', meadow: '#b2a078',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0xc2ac84, 0.8];                                           // the beaten track
        const w = wadiD(x, z);
        if (w < 11) return [0xd6ccb6, 0.85];                                                 // the wadi bed: pale stones and gravel
        if (w < 18) return [0x9a8058, 0.6];                                                  // the earth banks
        const k = sandK(x, z);
        if (k > 0.15) return [0xe2d2a8, Math.min(0.85, k)];                                  // loose sand on the dunes
        const g = fbm(noise, x * 0.04 + 40, z * 0.04, 2);
        return g > 0.1 ? [0x9c907a, Math.min(0.45, (g - 0.1) * 2)] : null;                   // the dark desert gravel
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

  /** The five redoubts: a ring of fire trench with a belt of wire, a machine gun facing the far side; No. 5 round the wells. */
  battlefield() {
    const works: any[] = [];
    for (const [rx, rz, rr] of REDOUBTS) {
      const f = rz > 0 ? 'nato' : 'pact';
      const ring: number[][] = [];
      for (let a = 0; a <= 12; a++) ring.push([rx + rr * Math.cos(a * Math.PI / 6), rz + rr * Math.sin(a * Math.PI / 6)]);
      for (const w of trenchLine(ring, f, { wireAt: rr > 30 ? 0 : 14, belts: rr > 30 ? 0 : 1, gapEvery: 50 })) if (!onRoad(w.x, w.z) && wadiD(w.x, w.z) > 18) works.push(w);
      if (rr < 30) works.push({ kind: 'mgNest', x: rx + 6, z: rz - 10 * Math.sign(rz), yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearRedoubt = (x: number, z: number) => REDOUBTS.some(([rx, rz, rr]) => Math.abs(Math.hypot(rx - x, rz - z) - rr) < 18);
    const skip = (x: number, z: number) => roadD(x, z) < 8 || wadiD(x, z) < 15 || nearRedoubt(x, z);

    // Magdhaba: mud-brick houses on both banks, the police post on each, the wells and troughs in the bed
    arabVillage(props, -70, 55, 7, 1916_21, villageSkip, false);
    arabVillage(props, 70, -55, 7, 1916_22, villageSkip, false);
    props.flatHouse({ x: -62, z: 92, yaw: 0.3, width: 14, depth: 10, storeys: 1, name: 'police post' });
    props.flatHouse({ x: 62, z: -92, yaw: 0.3, width: 14, depth: 10, storeys: 1, name: 'barracks' });
    for (const [x, z] of [[-14, 6], [12, -4], [0, 14], [-4, -12]]) { props.column({ x, z, radius: 1.5, height: 0.9 }); props.lowWall({ x: x + 2.5, z, yaw: Math.PI / 2, length: 3, height: 0.8, color: 0xa88e6a }); }
    // the wells at Lahfan and by the garrison camp, the camp’s tents; the Light Horse lines by Lahfan
    props.rand = mulberry32(1916_23);
    for (const [x, z] of [[-372, 288], [-328, -318]]) { props.column({ x, z, radius: 1.5, height: 0.9 }); props.flatHouse({ x: x + 14, z: z + 8, yaw: 0.2, width: 4, depth: 4, name: 'well-house' }); }
    for (let i = 0; i < 10; i++) props.tent({ x: -380 + (i % 5) * 11, z: -362 + Math.floor(i / 5) * 12, yaw: 0.2, color: 0xb0a07a });
    for (let i = 0; i < 10; i++) props.tent({ x: -380 + (i % 5) * 11, z: 340 + Math.floor(i / 5) * 12, yaw: 0.2, color: 0xc8b890 });
    // sandbags round the dunes and the redoubts’ rises
    for (const p of points) {
      if (!['C', 'D', 'E', 'G', 'I', 'J'].includes(p.id)) continue;
      props.rand = mulberry32(1918 + p.x + p.z);
      props.sandbagRing({ x: p.x + 28, z: p.z - 8, radius: 4.5, toward: p.z > 0 ? -1 : 1 });
      props.sandbagRing({ x: p.x - 28, z: p.z + 10, radius: 4.5, toward: p.z > 0 ? -1 : 1 });
    }
    // stones and wrecked carts on the gravel, as many on each half
    const r = mulberry32(1916);
    for (let i = 0, n = 0; i < 4000 && n < 44; i++) {
      const x = (r() * 2 - 1) * 470, z = (n % 2 ? -1 : 1) * (70 + r() * 420);
      if (skip(x, z) || nearPoint(x, z, 45) || Math.hypot(x, Math.abs(z) - BASE_Z) < 45) continue;
      n++;
      buildSite(props, { kind: ['rocks', 'wrecks', 'rocks'][n % 3], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    // date palms by the wells of Magdhaba (on the banks, where no house stands)
    for (let i = 0; i < 50; i++) {
      const a = r() * Math.PI * 2, d = 20 + r() * 80, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (onRoad(x, z) || roadD(x, z) < 6 || wadiD(x, z) < 12 || wadiD(x, z) > 28 || nearRedoubt(x, z)) continue;
      props.rand = mulberry32(i);
      props.palm({ x, z, height: 7 + r() * 5 });
    }
    commandPost(props, this.bases.nato, -1, 0xc8b890);
    commandPost(props, this.bases.pact, 1, 0xb0a07a);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { x: 0, z: 0, r: 50 },
      ...FORDS.map(([x, z]) => ({ x, z, r: 26 })),
      { test: (x: number, z: number) => roadD(x, z) < 5 || wadiD(x, z) < 4 || nearRedoubt(x, z) }];
    // tamarisk scrub along the wadi (in the bed’s edges and on the banks), a thin scatter of acacia, as thick on each half
    const f = (x: number, z: number) => fbm(noise, x * 0.01 + 20, z * 0.01, 2);
    const tP = evenThreshold(f, 0.4, (x, z) => z > 0);
    const tamarisks = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 320, broadleaf: 1, autumn: 0.2, size: 0.5, maxY: 60,
      avoid, forest: (x: number, z: number) => { const w = wadiD(x, z); return w > 6 && w < 30 ? 0.55 : -1; } });
    const acacias = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 90, broadleaf: 1, autumn: 0.3, size: 0.55, maxY: 60,
      avoid, forest: (x: number, z: number) => (f(x, z) > (z > 0 ? 0.4 : tP) ? 0.25 : 0.005) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.3, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); tamarisks.update(dt, t); acacias.update(dt, t); },
    };
  },
} satisfies MapDef;
