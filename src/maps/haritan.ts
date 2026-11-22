// Haritan, 26 October 1918: the last action of the Sinai and Palestine campaign. Aleppo had fallen the day before;
// Mustafa Kemal pulled the remains of the Ottoman Seventh Army back up the Alexandretta road and left a rearguard on
// the low stony ridges round Haritan, north-west of the city. The 15th (Imperial Service) Cavalry Brigade of the 5th
// Cavalry Division — the Jodhpur and Mysore Lancers — rode at it with armoured cars of the Light Armoured Motor
// Batteries in support: the lancers charged the ridge, were checked by the Ottoman machine guns, and dismounted
// to hold on until dark. Five days later the armistice of Mudros ended the war with the Ottoman Empire.
// On the map, compressed: the rolling chalky plateau north-west of Aleppo, three low stone ridges across it — the
// Haritan ridge in the middle with the village of Haritan on its crest, Kafr Hamra at its west end and Bayanun at
// its east end, and a lower ridge on each half; olive and pistachio groves inside their stone walls (the pistachios
// turning red in October); the mud-brick villages of the Aleppo country with their domed beehive roofs; the
// Aleppo–Alexandretta road from the south edge through Haritan to the north edge; the Baghdad railway with the
// halt at Ein al-Tal and the junction station at Muslimiye; each side’s hasty rifle pits and machine-gun posts on
// its own ridge (no wire: this was a war of movement by now); and past the south edge, as a backdrop, the citadel
// of Aleppo on its great mound.
// Fair, not mirrored: Haritan, the middle point, sits on the crest of the middle ridge, which rises as gently from
// each side; Kafr Hamra answers Bayanun (both on the same crest, each as far from its own base). Each half has its
// own low ridge for its rifle pits at the same depth, its own groves of the same total area in other places, its own
// rail point (the halt answers the station) and its own villages (Kafr Dael answers Hayan, Sheikh Maqsud answers
// Anadan). The open plateau between the ridges is as wide on each half, so the charge pays for either side’s horsemen.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(1918_26);

/** The three low ridges (z of each crest): the Haritan ridge in the middle, a lower one on each half, each its own course. */
const ridgeMid = (x: number) => 28 * Math.sin(x * 0.006 + 1.2);
const ridgeOwn = (x: number, s: number) => (s > 0 ? 185 + 20 * Math.sin(x * 0.009 + 1.1) : -185 - 22 * Math.sin(x * 0.008 + 2.6));
/** The citadel of Aleppo on its mound, beyond the south edge (a backdrop). */
const CIT = { x: 300, z: 720 };

/** The Baghdad railway: from Aleppo past the Ein al-Tal halt, through a cutting in the Haritan ridge, to Muslimiye junction. */
const RAIL = [[150, 620], [110, 420], [45, 250], [75, 110], [95, 0], [40, -110], [-55, -215], [-95, -400], [-120, -620]];
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), EXT, 1);
const onRail = (x: number, z: number) => railD(x, z) < 2.4;
/** The Aleppo–Alexandretta road, the tracks along the middle ridge to Kafr Hamra and Bayanun and on, a lateral behind each ridge, a spur each. */
const ROADS = [
  [[40, 620], [0, 470], [-20, 330], [-15, 170], [0, ridgeMid(0)], [10, -160], [-10, -330], [0, -470], [-40, -620]],
  [[0, ridgeMid(0)], [-150, -5], [-320, ridgeMid(-320)], [-370, 150], [-370, 300], [-400, 620]],
  [[0, ridgeMid(0)], [150, 5], [280, ridgeMid(280)], [340, -120], [400, -285], [420, -620]],
  [[-520, 340], [-370, 300], [-150, 300], [60, 262], [310, 290], [520, 320]],
  [[-520, -330], [-280, -300], [-70, -238], [150, -270], [400, -285], [520, -290]],
  [[310, 290], [180, 160], [-15, 170]],
  [[-280, -300], [-160, -160], [10, -160]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
/** The olive (0) and pistachio (1) groves [x, z, w, d, kind]: the same area on each half, in other places. */
const GROVES = [[-230, 390, 90, 70, 0], [-440, 200, 70, 90, 1], [190, 400, 80, 60, 1], [430, 390, 60, 80, 0], [-160, 240, 60, 50, 0], [220, 90, 70, 50, 1],
  [160, -390, 80, 80, 0], [440, -160, 70, 80, 1], [-170, -400, 90, 60, 1], [-430, -390, 60, 80, 0], [60, -305, 60, 50, 0], [-220, -90, 70, 50, 1]];
const inGrove = (x: number, z: number, pad = 0, kind = -1) => GROVES.some(([gx, gz, w, d, k]) => (kind < 0 || k === kind) && Math.abs(x - gx) < w / 2 + pad && Math.abs(z - gz) < d / 2 + pad);

function groundRaw(x: number, z: number) {
  let h = 4 + fbm(noise, x * 0.004, z * 0.004, 4) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.7;           // the rolling chalk
  h += smoothstep(390 + 50 * Math.sin(z * 0.007 + 2), 560, Math.abs(x)) * (7 + ridged(noise, x * 0.008, z * 0.008, 4) * 9);  // rougher ground on the flanks
  const lump = fbm(noise, x * 0.015 + 30, z * 0.015, 2);
  h += 8.5 * smoothstep(95, 0, Math.abs(z - ridgeMid(x)) + lump * 10) ** 1.4;                                 // the Haritan ridge
  for (const [hx, hz, r, hh] of [[330, 340, 130, 5], [-250, -350, 140, 5], [-130, 400, 100, 4], [200, -380, 150, 3.5], [-420, 90, 110, 4], [430, -60, 120, 4]]) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5; // lesser rises, each half its own
  for (const s of [1, -1]) h += 6 * (0.8 + 0.3 * Math.sin(x * 0.01 + (s > 0 ? 0 : 2.2))) * smoothstep(75, 0, Math.abs(z - ridgeOwn(x, s)) + lump * 10) ** 1.4;      // each half’s own ridge
  for (const p of points) if (!['E', 'F', 'G'].includes(p.id)) h += (4 - h) * smoothstep(42, 24, Math.hypot(x - p.x, z - p.z));
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(32, 16, Math.hypot(x, z - bz));
  return h;
}
const cached = gridCacheSmooth(groundRaw, EXT, 2);
/** Beyond the edge: the citadel mound, steep glacis and a flat top (the cached grid stops short of it). */
const height = (x: number, z: number) => {
  const h = cached(x, z);
  if (z < 600) return h;
  const d = Math.hypot(x - CIT.x, (z - CIT.z) * 1.2);
  return h + 34 * smoothstep(105, 50, d) + 4 * smoothstep(200, 110, d);
};

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Aleppo road', 0, 470, 'centre'),
  P('B', 'Kafr Dael', -370, 300, 'west'),
  P('C', 'Ein al-Tal halt', 60, 222, 'centre'),
  P('D', 'Sheikh Maqsud', 310, 290, 'east'),
  P('E', 'Kafr Hamra', -320, ridgeMid(-320), 'west', { radius: 30 }),
  P('F', 'Haritan', 0, ridgeMid(0), 'centre', { radius: 34 }),
  P('G', 'Bayanun', 280, ridgeMid(280), 'east', { radius: 30 }),
  P('H', 'Anadan', -280, -300, 'west'),
  P('I', 'Muslimiye station', -110, -230, 'centre'),
  P('J', 'Hayan', 400, -285, 'east'),
  P('K', 'Alexandretta road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Section' }];

/** A village of the Aleppo country: mud-brick houses under domed beehive roofs, courtyard walls, a well (a mosque in the bigger ones). */
function domeVillage(props: any, x: number, z: number, n: number, seed: number, skip: (x: number, z: number) => boolean, mosque = true) {
  props.rand = mulberry32(seed);
  const r = props.rand, placed: number[][] = [];
  if (mosque) { props.flatHouse({ x: x + 6, z: z - 22, yaw: 0, width: 10, depth: 9, name: 'mosque', dome: true }); placed.push([x + 6, z - 22, 9]); }
  for (let i = 0; i < n * 3 && placed.length < n + (mosque ? 1 : 0); i++) {
    const a = r() * Math.PI * 2, d = 14 + r() * 28;
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (skip(px, pz) || placed.some(([qx, qz, qr]) => Math.hypot(qx - px, qz - pz) < qr + 6)) continue;
    placed.push([px, pz, 5]);
    const w = 5 + r() * 2;
    props.flatHouse({ x: px, z: pz, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: w, depth: w * (0.9 + r() * 0.2), dome: r() < 0.8 });
    if (r() < 0.6) props.lowWall({ x: px + 4.5, z: pz + 4, yaw: r() < 0.5 ? 0 : Math.PI / 2, length: 6 + r() * 5, height: 1.8, color: 0xb49a74 });
  }
  props.column({ x: x - 4, z: z + 3, radius: 1.3, height: 0.9 }); // the well
}

export default {
  id: 'haritan',
  name: 'Haritan',
  description: '26 October 1918: the low stony ridges north-west of Aleppo, olive and pistachio groves, domed mud-brick villages, the Alexandretta road and the Baghdad railway — the Jodhpur and Mysore Lancers charge Mustafa Kemal’s rearguard in the last fight of the Palestine campaign.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  armies: { nato: ['uk'], pact: ['ot'] }, // (the 15th Imperial Service Cavalry Brigade and the armoured cars against the Ottoman Seventh Army’s rearguard)
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 191826,
  height,
  fields: createFields({ seed: 191826, cell: 80 }),

  theme: {
    // a clear, cool late-October afternoon on the plateau, the chalk glaring white
    fogColor: 0xd8d0bc, fogDensity: 0.0008, skyTop: 0x6a90c0, skyHorizon: 0xe2dccc, skyBottom: 0xb4a88c,
    sunColor: 0xfff0d8, sunIntensity: 2.0, sunDisk: 0.8, clouds: 0.18, cloudLight: 0xf6f2ea, cloudDark: 0xc4bcb0,
    sunDir: [0.4, 0.42, 0.55], hemiSky: 0xd6dce4, hemiGround: 0x9c8c6c, hemiIntensity: 1.15, rimColor: 0xf0e4cc, rimIntensity: 0.3,
    terrain: {
      grass: '#b2a47e', grassAlt: '#a69a74', dryGrass: '#c8ba90', dirt: '#a88a64', rock: '#cec4aa',
      pasture: '#ae9e76', ploughed: '#9a7a58', stubble: '#ccb886', meadow: '#aca076',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRail(x, z)) return [0x6a5e50, 0.9];
        if (onRoad(x, z)) return [0xd4c8a8, 0.85];                                          // the chalky road
        if (inGrove(x, z, 2)) return [0x8a6a4a, 0.6];                                       // the groves’ tilled red earth
        if (y > 30) return [0xc4b494, 0.7];                                                  // the citadel mound
        const crest = Math.min(Math.abs(z - ridgeMid(x)), Math.abs(z - ridgeOwn(x, 1)), Math.abs(z - ridgeOwn(x, -1)));
        const chalk = fbm(noise, x * 0.04 + 9, z * 0.04, 2);
        if (crest < 30 && chalk > 0.05) return [0xd6ceb6, Math.min(0.6, (chalk - 0.05) * 2)];  // white chalk showing through on the crests
        return chalk < -0.3 ? [0x8e8458, Math.min(0.35, (-0.3 - chalk) * 2)] : null;          // thistle and dry grass
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

  /** Hasty rifle pits along each side’s own ridge, just over the crest (no wire), machine-gun posts on it and at Haritan’s edge. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -460; x <= 460; x += 30) pts.push([x * s, ridgeOwn(x * s, s) - 10 * s]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 0, belts: 0 })) if (roadD(w.x, w.z) > 6 && railD(w.x, w.z) > 6 && !inGrove(w.x, w.z, 3)) works.push(w);
      for (const mx of s > 0 ? [-200, 130, 380] : [-360, -110, 230]) works.push({ kind: 'mgNest', x: mx, z: ridgeOwn(mx, s) - 14 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      for (const dx of s > 0 ? [-30, 32] : [-36, 26]) works.push({ kind: 'mgNest', x: dx, z: 50 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => roadD(x, z) < 9 || railD(x, z) < 9 || inGrove(x, z, 4);

    // the villages: Haritan on the crest, Kafr Hamra and Bayanun at the ridge’s ends, one on each half’s flanks
    domeVillage(props, 0, ridgeMid(0), 14, 19261, skip);
    domeVillage(props, -320, ridgeMid(-320), 9, 19262, skip);
    domeVillage(props, 280, ridgeMid(280), 9, 19263, skip);
    domeVillage(props, -370, 300, 8, 19264, skip);
    domeVillage(props, 310, 290, 8, 19265, skip, false);
    domeVillage(props, -280, -300, 8, 19266, skip, false);
    domeVillage(props, 400, -285, 8, 19267, skip);
    // the railway: rails, Muslimiye station with water tower, goods shed and wagons; the Ein al-Tal halt
    props.rand = mulberry32(19268);
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 30);
      for (let k = 0; k < n; k++) props.rails({ x0: ax + (bx - ax) * k / n, z0: az + (bz - az) * k / n, x1: ax + (bx - ax) * (k + 1) / n, z1: az + (bz - az) * (k + 1) / n });
    }
    props.flatHouse({ x: -80, z: -205, yaw: Math.PI / 2, width: 16, depth: 8, storeys: 2, name: 'station' });
    props.hall({ x: -88, z: -262, yaw: Math.PI / 2, width: 18, depth: 10, height: 5, color: 0xb0a080, roof: 0x6a6660, door: 6, name: 'goods shed' });
    props.tanks({ x: -72, z: -186, yaw: 0, count: 1, radius: 2.2, height: 8, color: 0x5a5048 });
    for (const [z, kind, c] of [[-300, 'box', 0x6a4a34], [-314, 'box', 0x5a3e2c], [-328, 'open', 0x6a5a44]] as [number, string, number][]) {
      const t = (z + 215) / -185;
      props.wagon({ x: -55 - 40 * t, z, yaw: Math.atan2(40, 185), kind, color: c });
    }
    props.flatHouse({ x: 66, z: 200, yaw: Math.PI / 2, width: 10, depth: 7, name: 'halt' });
    props.tanks({ x: 30, z: 232, yaw: 0, count: 1, radius: 2, height: 7, color: 0x5a5048 });
    // the groves: dry-stone walls round them (a gap for the gate), a watchman’s hut in each
    props.rand = mulberry32(19269);
    for (const [gx, gz, w, d] of GROVES) {
      for (const [lx, lz, len, alongX] of [[0, d / 2, w, 1], [0, -d / 2, w, 1], [w / 2, 0, d, 0], [-w / 2, 0, d, 0]] as number[][]) {
        for (let t = -len / 2 + 5; t < len / 2 - 4; t += 10) {
          if (Math.abs(t) < 5) continue;
          const x = gx + lx + (alongX ? t : 0), z = gz + lz + (alongX ? 0 : t);
          if (roadD(x, z) > 5 && railD(x, z) > 5) props.lowWall({ x, z, yaw: alongX ? 0 : Math.PI / 2, length: 9, height: 1.1, color: 0xbcb094 });
        }
      }
      props.flatHouse({ x: gx + w / 4, z: gz - d / 4, yaw: 0, width: 4, depth: 4, name: 'watchman’s hut', dome: true });
    }
    // the stony crests: outcrops and boulders along all three ridges, as many on each half
    const r = mulberry32(1918);
    for (const [rz, n0, half] of [[ridgeMid, 50, 0], [(x: number) => ridgeOwn(x, 1), 40, 1], [(x: number) => ridgeOwn(x, -1), 40, -1]] as [(x: number) => number, number, number][]) {
      for (let i = 0, n = 0; i < 3000 && n < n0; i++) {
        const x = (r() * 2 - 1) * 480, z = rz(x) + (r() - 0.5) * 50;
        if (skip(x, z) || nearPoint(x, z, 36) || (half === 0 && Math.abs(z) < 4)) continue;
        n++;
        if (n % 4 === 0) buildSite(props, { kind: 'rocks', seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
        else props.boulder({ x, z, radius: 0.7 + r() * 1.3 });
      }
    }
    // field walls, stones and abandoned carts on the open plateau (each half its own)
    for (let i = 0, n = 0; i < 4000 && n < 60; i++) {
      const x = (r() * 2 - 1) * 470, z = (n % 2 ? -1 : 1) * (40 + r() * 470);
      if (skip(x, z) || nearPoint(x, z, 45) || Math.hypot(x, Math.abs(z) - BASE_Z) < 45) continue;
      n++;
      buildSite(props, { kind: ['fieldwall', 'rocks', 'fieldwall', 'wrecks'][Math.floor(n / 2) % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    // the citadel of Aleppo, beyond the south edge: the curtain wall and towers round the top of the mound, the keep, the minaret of its mosque
    props.rand = mulberry32(19270);
    const ty = (a: number) => a + Math.PI / 2;
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2, x = CIT.x + Math.cos(a) * 52, z = CIT.z + Math.sin(a) * 43;
      props.lowWall({ x, z, yaw: ty(a), length: 19, height: 7, color: 0xb8a684 });
      if (k % 3 === 0) props.flatHouse({ x, z, yaw: ty(a), width: 8, depth: 8, storeys: 3, name: 'citadel tower' });
    }
    props.flatHouse({ x: CIT.x, z: CIT.z + 10, yaw: 0, width: 20, depth: 16, storeys: 3, name: 'citadel keep', dome: true });
    props.column({ x: CIT.x - 18, z: CIT.z - 14, radius: 1.8, height: 22 });
    props.flatHouse({ x: CIT.x - 10, z: CIT.z - 16, yaw: 0, width: 12, depth: 10, name: 'citadel mosque', dome: true });
    // the edge of the city round the mound’s foot
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = 120 + r() * 70, x = CIT.x + Math.cos(a) * d, z = CIT.z + Math.sin(a) * d * 0.8;
      if (z < 610 || Math.abs(x) > 760 || z > 790) continue;
      props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 4, depth: 6 + r() * 4, storeys: r() < 0.4 ? 2 : 1, dome: r() < 0.5 });
    }
    commandPost(props, this.bases.nato, -1, 0xb0a07a);
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadD(x, z) < 4 || railD(x, z) < 4 }];
    // the olives (grey-green) and the pistachios (going red) in their rows; a thin scatter of wild olive and terebinth elsewhere, as thick on each half
    const olives = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 700, broadleaf: 1, autumn: 0.08, size: 0.6, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3, 0) }], forest: (x: number, z: number) => (inGrove(x, z, 0, 0) ? 1 : -1) });
    const pistachios = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 700, broadleaf: 1, autumn: 0.55, size: 0.45, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3, 1) }], forest: (x: number, z: number) => (inGrove(x, z, 0, 1) ? 1 : -1) });
    const f = (x: number, z: number) => fbm(noise, x * 0.01 + 20, z * 0.01, 2);
    const tP = evenThreshold(f, 0.35, (x, z) => z > 0);
    const wild = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 140, broadleaf: 1, autumn: 0.2, size: 0.55, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 6) || Math.hypot(x, z) < 60 }],
      forest: (x: number, z: number) => (f(x, z) > (z > 0 ? 0.35 : tP) ? 0.3 : 0.01) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.45, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); olives.update(dt, t); pistachios.update(dt, t); wild.update(dt, t); },
    };
  },
} satisfies MapDef;
