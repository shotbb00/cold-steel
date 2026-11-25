// The Garigliano, summer 1918: a battle that never came. Had the Piave line broken in 1917–18 — Cadorna’s and
// Diaz’s contingency plans looked at falling back to the Mincio and beyond — the Austro-Hungarians and the Germans
// would have come down the peninsula past Rome, and the last Italian stand south of the capital would have been the
// Garigliano: the river that bars the Via Appia and the coast road from Rome to Naples, where the Aurunci mountains
// come down to the sea. On this map the Italians, with the British and French divisions sent to Italy, hold the
// Naples bank (south, +z) and the Central Powers the Rome bank (north, −z).
// On the map (turned so the river runs across it, inland to the west, −x, the sea to the east, +x): the Garigliano
// across the middle in its flat valley between two low terrace banks, Ponte Real Ferdinando — the iron chain bridge
// of 1832 that carries the Via Appia — in the middle, the iron bridge of the Sparanise–Gaeta railway (the coast branch
// off the Rome–Naples line) in the east, the ford by Suio in the west; toward the mouth the valley widens into reed
// marsh and pools, the beach and the sea just past the east edge. On the Rome bank: Minturno on its hill with the
// castle, Santi Cosma e Damiano at the foot of the Aurunci, Tufo on the Via Appia, and by the railway bridge the Roman
// ruins of Minturnae — the theatre and the forum’s columns, the aqueduct’s arches striding across the plain from the
// hills. On the Naples bank: Castelforte on its spur with its tower, Cellole on the Via Appia, the Torre di Pandolfo
// by the marsh. Olive groves on the hills, vineyards and farms on both plains; the Aurunci and Monte Massico behind.
// (Compressed and folded: Castelforte really stands on the Rome bank up the valley, and the bridges are kilometres
// apart. The map puts one hill town on each bank so both sides have one.)
// Not mirrored but fair: each bank has a hill town of the same height on its own flank at the same reach from its
// base (Castelforte west on the Naples bank, a slanted spur; Minturno east on the Rome bank, a round hill), the same
// three crossings with a point at each bank’s end of one of them, a village on the Via Appia at its centre, a third
// village on the other flank, its terrace bank with a trench line, its vineyards, its olive groves and its railway
// stretch. The marsh at the mouth lies across both banks alike; the ruins of Minturnae are the Rome bank’s, the Torre
// and its masseria the Naples bank’s.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, plantHedgerows, growGround } from '../world/Vegetation.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 340;
const HW = 22;
const EXT = { x: 640, z: 700 };                                  // (the grids the dear parts are sampled onto)
const noise = createNoise2D(1918_0720);
const mid = (x: number) => 12 * Math.sin(x * 0.005 + 0.6) + 9 * Math.sin(x * 0.013 + 1.7) - 6;
const FP = (x: number) => 105 + 50 * smoothstep(380, 520, x);     // the valley floor’s half-width (wider toward the mouth)
const bed = (x: number, z: number) => Math.abs(z - mid(x));
const terrZ = (x: number, s: number) => mid(x) + (FP(x) + 18) * s; // the road along each terrace bank
const shoreX = (z: number) => 548 + 9 * Math.sin(z * 0.011 + 1);
const CROSS = [-SIDE_X, 0, SIDE_X];
const crossings = [
  { name: 'Suio ford', x: -SIDE_X, kind: 'ford', width: 18, depth: 0.7 },
  { name: 'Ponte Real Ferdinando', x: 0, kind: 'bridge', width: 8 },
  { name: 'railway bridge', x: SIDE_X, kind: 'bridge', width: 8 },
];
const river = createRiver({ path: mid, halfWidth: HW, level: 0, depth: 2.8, valley: 34, crossings });
const away = (x: number, z: number) => Math.abs(z - mid(x));

// ---- the two hill towns: Castelforte on its slanted spur (Naples bank, west), Minturno on its round hill (Rome bank, east)
const CAS = { x: -245, z: 262, rx: 150, rz: 100, h: 32, rot: 0.3 };
const MIN = { x: 285, z: -280, rx: 128, rz: 118, h: 32, rot: 0 };
const ellQ = (e: { x: number; z: number; rx: number; rz: number; rot?: number }, x: number, z: number) => {
  const dx = x - e.x, dz = z - e.z, c = Math.cos(e.rot ?? 0), s = Math.sin(e.rot ?? 0);
  return Math.hypot((dx * c + dz * s) / e.rx, (dz * c - dx * s) / e.rz);
};
const hillK = (x: number, z: number) => Math.max(0, 1 - Math.min(ellQ(CAS, x, z), ellQ(MIN, x, z)));
const inMarsh = (x: number, z: number) => x > 380 && bed(x, z) < FP(x) - 8;

// ---- the points
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Via Appia (Capua)', 0, 470, 'centre'),
  P('B', 'Castelforte', CAS.x, CAS.z, 'west', { radius: 26 }),
  P('C', 'Cellole', 40, 340, 'centre'),
  P('D', 'Torre di Pandolfo', 320, 228, 'east'),
  P('E', 'Suio', -SIDE_X + 28, Math.round(terrZ(-SIDE_X + 28, 1) + 6), 'west', { radius: 24 }),
  P('F', 'Ponte Real Ferdinando', 0, Math.round(mid(0)), 'centre', { radius: 26 }),
  P('G', 'Minturnae', SIDE_X - 28, Math.round(terrZ(SIDE_X - 28, -1) - 6), 'east', { radius: 24 }),
  P('H', 'Santi Cosma e Damiano', -280, -195, 'west'),
  P('I', 'Tufo', -80, -360, 'centre'),
  P('J', 'Minturno', MIN.x, MIN.z, 'east', { radius: 26 }),
  P('K', 'Via Appia (Formia)', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the roads and the railway
const line = (x0: number, x1: number, f: (x: number) => number, step = 40) => { const o: number[][] = []; for (let x = x0; x <= x1; x += step) o.push([x, f(x)]); return o; };
const ROADS: number[][][] = [
  line(-560, 520, (x) => terrZ(x, 1)), line(-560, 520, (x) => terrZ(x, -1)),               // along the terrace banks
  ...CROSS.map((x) => [[x, terrZ(x, 1)], [x, terrZ(x, -1)]]),                              // over the valley floor
  [[0, 580], [0, 470], [30, 410], at('C'), [15, 260], [0, terrZ(0, 1)]],                   // the Via Appia
  [[0, -580], [0, -470], [-40, -420], at('I'), [-30, -260], [0, terrZ(0, -1)]],
  [at('E'), [-300, 195], at('B')], [at('B'), [-120, 330], at('C')], [[-SIDE_X, 580], [-SIDE_X, 410], [-300, 340], at('B')], // Castelforte’s roads
  [at('G'), [300, -190], at('J')], [at('J'), [120, -345], at('I')], [[SIDE_X, -580], [SIDE_X, -410], [320, -360], at('J')], // Minturno’s
  [[SIDE_X, 580], [SIDE_X, 330], at('D'), [SIDE_X, terrZ(SIDE_X, 1)]],
  [[-SIDE_X, -580], [-SIDE_X, -330], at('H'), [-SIDE_X, terrZ(-SIDE_X, -1)]],
  [[-520, 405], [-200, 392], at('C'), [200, 378], [520, 386]],                             // across each plain’s back
  [[-520, -398], [-250, -385], at('I'), [150, -415], [520, -420]],
];
const RAIL = [[455, -580], [455, -380], [440, -240], [385, -160], [SIDE_X + 6, terrZ(SIDE_X + 6, -1)], [SIDE_X + 6, terrZ(SIDE_X + 6, 1)], [370, 160], [425, 300], [450, 580]];
/** Distance to the nearest segment of `polys`, capped at `cap`: segments bucketed on a 32 m grid (the Lys’s). */
function segField(polys: number[][][], cap: number) {
  const C = 32, grid = new Map<number, number[][]>(), key = (i: number, j: number) => i * 4096 + j;
  for (const poly of polys) for (let k = 0; k < poly.length - 1; k++) {
    const [ax, az] = poly[k], [bx, bz] = poly[k + 1], seg = [ax, az, bx, bz];
    for (let i = Math.floor((Math.min(ax, bx) - cap) / C); i <= Math.floor((Math.max(ax, bx) + cap) / C); i++)
      for (let j = Math.floor((Math.min(az, bz) - cap) / C); j <= Math.floor((Math.max(az, bz) + cap) / C); j++) {
        const g = grid.get(key(i, j)); if (g) g.push(seg); else grid.set(key(i, j), [seg]);
      }
  }
  return (x: number, z: number) => {
    const segs = grid.get(key(Math.floor(x / C), Math.floor(z / C)));
    let best = cap * cap;
    if (segs) for (const [ax, az, bx, bz] of segs) {
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), ex = x - ax - dx * t, ez = z - az - dz * t;
      best = Math.min(best, ex * ex + ez * ez);
    }
    return Math.sqrt(best);
  };
}
const roadRaw = segField(ROADS, 40), roadD = gridCache(roadRaw, EXT, 2);
const railRaw = segField([RAIL], 30), railD = gridCache(railRaw, EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;

// ---- the vineyards: the same number on each plain, each from its own seed
const VINES: { x: number; z: number; yaw: number }[] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 7201 : 7243);
  for (let i = 0, n = 0; i < 4000 && n < 9; i++) {
    const x = (r() * 2 - 1) * 430, z = s * (180 + r() * 290), yaw = (r() - 0.5) * 0.5;
    if (nearPt(x, z, 60) || hillK(x, z) > 0 || bed(x, z) < FP(x) + 50 || railRaw(x, z) < 30 || Math.hypot(x, z - s * BASE_Z) < 70 || Math.abs(z) > 480
      || [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].some(([a, b]) => roadRaw(x + a * 24, z + b * 18) < 6) || VINES.some((v) => Math.hypot(v.x - x, v.z - z) < 80)) continue;
    VINES.push({ x, z, yaw }); n++;
  }
}
const vLocal = (v: { x: number; z: number; yaw: number }, x: number, z: number) => {
  const dx = x - v.x, dz = z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
  return [dx * c - dz * s, dx * s + dz * c];
};
const vineAt = (x: number, z: number, m = 0) => VINES.some((v) => { const [lx, lz] = vLocal(v, x, z); return Math.abs(lx) < 22 + m && Math.abs(lz) < 16 + m; });

// ---- the ground
const marshN = (x: number, z: number) => fbm(noise, x * 0.03 + 11, z * 0.03, 2);
const ground = gridCacheSmooth((x: number, z: number) => {
  const b = bed(x, z), fp = FP(x);
  let h = 5 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.6 - 2.5 * smoothstep(250, 520, x);   // the plain, falling toward the coast
  let fh = 1.5 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.4;                                    // the valley floor
  if (x > 360) fh += (0.55 + marshN(x, z) * 0.7 - fh) * smoothstep(360, 420, x);            // the marsh: reeds and pools
  h = fh + (h - fh) * smoothstep(fp - 6, fp + 8, b);                                         // the terrace bank
  const out = smoothstep(fp + 10, fp + 40, b);
  h += out * CAS.h * smoothstep(1.08, 0.38, ellQ(CAS, x, z) + fbm(noise, x * 0.01 + 3, z * 0.01, 2) * 0.06);  // Castelforte’s spur
  h += out * MIN.h * smoothstep(1.08, 0.38, ellQ(MIN, x, z) + fbm(noise, x * 0.01 - 9, z * 0.01, 2) * 0.06);  // Minturno’s hill
  const back = smoothstep(590, 760, Math.abs(z)) * (1 - smoothstep(250, 520, x));            // the Aurunci and Monte Massico behind (off the field)
  h += back * (120 + fbm(noise, x * 0.006, z * 0.006 + 40, 3) * 50) + smoothstep(540, 760, -x) * (75 + fbm(noise, x * 0.008 + 20, z * 0.008, 3) * 60);
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  const sea = smoothstep(shoreX(z) - 40, shoreX(z) + 12, x);                                // the beach, then the sea floor
  return h * (1 - sea) + (0.6 - 4.5 * smoothstep(shoreX(z), shoreX(z) + 30, x)) * sea;
}, EXT, 2);
const height = (x: number, z: number) => { const g = ground(x, z), h = river.carve(x, z, g); return x > shoreX(z) - 20 ? Math.min(g, h) : h; }; // (no river banks out into the sea)

// ---- the woods: olive groves on the hills, reeds in the marsh, poplars and willows along the river, each plain’s copses its own
const wn = (x: number, z: number) => fbm(noise, x * 0.008 + 50, z * 0.008, 3);
const T_N = 0.3, T_P = evenThreshold((x, z) => (bed(x, z) > FP(x) + 16 && hillK(x, z) <= 0 ? wn(x, z) : -9), T_N, (x, z) => z > mid(x));
const woodField = gridCache((x: number, z: number) => {
  if (away(x, z) < HW + 2 || x > shoreX(z) - 30) return -1;
  const b = bed(x, z), fp = FP(x);
  if (b < fp - 8) {
    if (inMarsh(x, z)) return marshN(x, z) > -0.15 ? 0.45 : 0;                                  // reed beds
    return fbm(noise, x * 0.03, z * 0.03, 2) > 0.3 ? 0.55 : 0;                                 // poplars and willows by the water
  }
  if (Math.abs(b - fp) < 14 || onRoad(x, z) || vineAt(x, z, 3) || railD(x, z) < 5) return 0;
  const q = Math.min(ellQ(CAS, x, z), ellQ(MIN, x, z));
  if (q < 1) return q < 0.4 ? 0 : fbm(noise, x * 0.02 + 30, z * 0.02, 2) > -0.25 ? 0.45 : 0;  // the town on top; olive terraces down the slopes
  if (wn(x, z) > (z > mid(x) ? T_N : T_P)) return 0.6;                                        // copses of oak and pine
  if (fbm(noise, x * 0.012 - 40, z * 0.012, 2) > 0.28) return 0.4;                            // olive groves on the plain
  return 0;
}, EXT, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'garigliano',
  name: 'Garigliano',
  description: 'Summer 1918, the stand that never had to be made: with the Piave broken, the Italians and their allies hold the Garigliano on the road from Rome to Naples — the Via Appia’s chain bridge, the railway bridge and the Suio ford, Minturno on its hill and Castelforte on its spur, the ruins of Minturnae, olive groves, vineyards and the reed marsh at the mouth.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (no strip long and flat enough clear of the hills, the vineyards, the terrace banks and the railway: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['it', 'uk', 'fr'], pact: ['ah', 'de'] }, // (the Italian army with the British and French divisions in Italy, against the Austro-Hungarians and a German corps driving south)
  sides: { nato: 'Italy, Britain and France', pact: 'Austria-Hungary and Germany' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 19180720,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191872, cell: 64, weights: [0.35, 0.3, 0.1, 0.25] as any }),
  woods: (x: number, z: number) => Math.max(0, woodField(x, z)) * 0.85,

  theme: {
    // a hot, bright July day on the Tyrrhenian coast, the Aurunci blue behind
    fogColor: 0xc4c6bc, fogDensity: 0.0011, skyTop: 0x5a86b8, skyHorizon: 0xd6d8cc, skyBottom: 0x8c8c7e,
    sunColor: 0xfff2d6, sunIntensity: 2.1, sunDisk: 0.35, clouds: 0.25, cloudLight: 0xf2f2ec, cloudDark: 0xa0a8ae,
    sunDir: [0.45, 0.78, 0.25], hemiSky: 0xccd8e2, hemiGround: 0x6e6642, hemiIntensity: 1.25, rimColor: 0xd8dce0, rimIntensity: 0.25,
    terrain: {
      grass: '#66703a', grassAlt: '#5a6832', dryGrass: '#b0a464', dirt: '#806c50', rock: '#bab4a6', strip: '#5a4a36',
      pasture: '#64703a', ploughed: '#86704e', stubble: '#ccb468', meadow: '#6e7c3e',
      farmX: [460, 600], farmZ: [520, 640], roads: CROSS, roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (x > shoreX(z) - 34) return [y < 0.2 ? 0xa89a7a : 0xd2c49a, 1];                   // the beach
        const rd = roadD(x, z);
        if (rd < 3.2) return [hillK(x, z) > 0.05 ? 0x86745a : 0xa89c80, 0.85];                // white roads
        if (railD(x, z) < 3) return [0x5a524a, 0.85];                                          // the railway’s ballast
        if (inMarsh(x, z)) return [marshN(x, z) < -0.25 ? 0x4a5440 : 0x6e7a46, 0.8];           // the marsh’s mud and sedge
        const b = bed(x, z);
        if (Math.abs(b - FP(x)) < 9) return [0x7a8048, 0.5];                                   // the terrace bank’s turf
        if (vineAt(x, z)) return [0x84704c, 0.55];                                             // the vineyards’ worked soil
        const k = hillK(x, z);
        if (k > 0) return [woodField(x, z) > 0.3 ? 0x7c7650 : 0x8a7e58, Math.min(0.85, k * 6)]; // the olive terraces’ dry soil
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: CROSS }, pact: { x: 0, z: -BASE_Z, entries: CROSS } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each army’s line dug along its terrace bank, wire toward the river (gaps at the crossings), MG posts at each crossing; a few farms shot up. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 470; x += 30) pts.push([x * s, mid(x * s) + (FP(x * s) + 3) * s]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 60 })) if (CROSS.every((bx) => Math.abs(w.x - bx) > 10) && !onRoad(w.x, w.z) && railD(w.x, w.z) > 4) works.push(w);
      for (const bx of CROSS) for (const dx of [-18, 18]) works.push({ kind: 'mgNest', x: bx + dx * s, z: mid(bx + dx * s) + FP(bx + dx * s) * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (bed(b.x, b.z) < 220 ? 0.2 : 0.05)).map((b: any) => b.index);
    return { blasts: [], ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const skip = (x: number, z: number) => bed(x, z) < FP(x) + 16 || roadD(x, z) < 8 || railD(x, z) < 8 || vineAt(x, z, 4) || x > 470;
    const [bx, bz] = at('B'), [jx, jz] = at('J');

    // the hill towns: stone houses packed on the flat top, the church, the castle — the same in each
    for (const [x, z, sd] of [[bx, bz, 1], [jx, jz, 2]]) {
      const r = mulberry32(191872 + sd);
      for (let i = 0, n = 0; i < 60 && n < 13; i++) {
        const a = r() * Math.PI * 2, d = 18 + r() * 30, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (roadD(px, pz) < 7 || Math.hypot(px - x, pz - z) < 16) continue;
        props.townHouse({ x: px, z: pz, yaw: a + Math.PI / 2, width: 7 + r() * 3, depth: 8, storeys: 2, name: 'town house', damaged: 0.1 }); n++;
      }
      farmVillage(props, x, z, 8, 191800 + sd, skip, 1.7);
    }
    props.rand = mulberry32(1918);
    props.church({ x: bx - 22, z: bz - 34, yaw: Math.PI + 0.3 });
    props.church({ x: jx + 24, z: jz + 34, yaw: 0 });
    props.hall({ x: jx - 34, z: jz - 26, yaw: 0.2, width: 18, depth: 14, height: 9, color: 0xa8987c, roof: 0x7a3e2c, door: 4, name: 'castle of Minturno' });
    props.ruinBlock({ x: jx - 50, z: jz - 12, yaw: 0.2, width: 6, depth: 6, storeys: 4, ruin: 0.3, name: 'castle keep' });
    props.hall({ x: bx + 34, z: bz + 26, yaw: Math.PI + 0.3, width: 18, depth: 14, height: 9, color: 0xa8987c, roof: 0x7a3e2c, door: 4, name: 'castle of Castelforte' });
    props.ruinBlock({ x: bx + 50, z: bz + 12, yaw: 0.3, width: 6, depth: 6, storeys: 4, ruin: 0.3, name: 'Castelforte tower' });
    // the villages on the plains, each with its church
    for (const [x, z, n, sd] of [[40, 340, 9, 3], [-80, -360, 9, 4], [320, 228, 6, 5], [-280, -195, 8, 6], [-SIDE_X + 60, terrZ(-SIDE_X + 60, 1) + 34, 6, 7], [SIDE_X - 70, terrZ(SIDE_X - 70, -1) - 40, 3, 8]]) farmVillage(props, x, z, n, 191810 + sd, skip, 1.1);
    for (const [x, z, yaw] of [[70, 372, 0], [-110, -392, Math.PI], [-300, -250, Math.PI], [-SIDE_X + 76, terrZ(-SIDE_X + 76, 1) + 52, 0.2]]) if (!skip(x, z)) props.church({ x, z, yaw });
    // the Torre di Pandolfo by the marsh and its masseria
    props.ruinBlock({ x: 352, z: 196, yaw: 0.2, width: 7, depth: 7, storeys: 5, ruin: 0.2, name: 'Torre di Pandolfo' });
    props.townHouse({ x: 290, z: 262, yaw: 0.1, width: 16, depth: 10, storeys: 2, name: 'masseria', damaged: 0 });
    props.house({ x: 266, z: 262, yaw: 0.1 + Math.PI / 2, width: 8, depth: 18 });
    // Minturnae: the theatre’s stepped cavea and its stage wall, the forum’s columns, the aqueduct across the plain
    const [gx, gz] = at('G'), tx = gx - 70, tz = gz - 34;
    for (let row = 0; row < 6; row++) for (let a = -80; a <= 80; a += 13) {
      const rr = 13 + row * 2.4, t = (a * Math.PI) / 180, x = tx + Math.sin(t) * rr, z = tz - Math.cos(t) * rr;
      props.box('stone', x, terrain.heightAt(tx, tz) + 0.45 * (row + 1), z, 3.2, 0.9 * (row + 1), 2.6, t, 0xb0a48c);
    }
    props.lowWall({ x: tx, z: tz + 4, yaw: 0, length: 28, height: 4.5, color: 0xb0a48c });
    for (const [dx, dz] of [[-24, 30], [-16, 30], [-8, 30], [0, 30], [-24, 44], [0, 44]]) props.column({ x: gx - 60 + dx, z: gz - 40 - dz, height: 3 + props.rand() * 3 });
    const AQ = [[jx - 60, jz + 84], [gx - 6, gz - 52]];
    {
      const [[ax, az], [cx, cz]] = AQ, len = Math.hypot(cx - ax, cz - az), yaw = Math.atan2(cx - ax, cz - az);
      for (let t = 0; t <= len; t += 7) {
        const x = ax + (cx - ax) * t / len, z = az + (cz - az) * t / len;
        if (roadD(x, z) < 6 || nearPt(x, z, 20)) continue;
        const g = terrain.heightAt(x, z);
        props.box('stone', x, g + 4, z, 2.4, 8, 2.4, yaw, 0xa89c84);
        props.box('stone', x + (cx - ax) / len * 3.5, g + 7.6, z + (cz - az) / len * 3.5, 2.4, 1.0, 7, yaw, 0xa89c84);
        cover.addBox({ x, z, yaw, length: 2.4, thickness: 2.4, height: 8 });
      }
    }
    // the railway, its two stations, a goods train left standing
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [x0, z0] = RAIL[i], [x1, z1] = RAIL[i + 1];
      if (Math.abs(z0 - mid(x0)) < FP(x0) + 20 && Math.abs(z1 - mid(x1)) < FP(x1) + 20) continue;   // (over the bridge itself)
      props.rails({ x0, z0, x1, z1 });
    }
    props.hall({ x: 418, z: -226, yaw: Math.PI / 2 + 0.1, width: 24, depth: 10, height: 7, color: 0xc8b48c, roof: 0x7a3e2c, door: 4, name: 'Stazione di Minturno' });
    props.hall({ x: 448, z: 330, yaw: Math.PI / 2 - 0.15, width: 24, depth: 10, height: 7, color: 0xc8b48c, roof: 0x7a3e2c, door: 4, name: 'Stazione di Cellole' });
    for (const [x, z, yaw, kind] of [[452, -470, 0, 'box'], [452, -455, 0, 'box'], [448, 470, 0.05, 'tank']] as [number, number, number, string][]) props.wagon({ x, z, yaw, kind });
    // the vineyards: low rows of vines on their stakes
    for (const v of VINES) {
      const L = (lx: number, lz: number) => [v.x + lx * Math.cos(v.yaw) + lz * Math.sin(v.yaw), v.z - lx * Math.sin(v.yaw) + lz * Math.cos(v.yaw)];
      for (let lz = -14; lz <= 14; lz += 3.5) for (let lx = -16; lx <= 16; lx += 10.6) {
        const [x, z] = L(lx, lz);
        props.box('plain', x, terrain.heightAt(x, z) + 0.6, z, 10, 1.2, 0.7, v.yaw, 0x4e6a2a);
      }
    }
    // the marsh’s pools
    for (let x = 392; x < 500; x += 7) for (let z = -170; z < 170; z += 7) {
      if (!inMarsh(x, z) || away(x, z) < HW + 4 || marshN(x, z) > -0.3 || roadD(x, z) < 6) continue;
      props.box('plain', x, terrain.heightAt(x, z) + 0.12, z, 7.2, 0.05, 7.2, 0, 0x46605e);
    }
    // farmsteads and hay over each plain (each its own)
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm'];
    for (let tries = 0, n = 0; n < 130 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (bed(x, z) < FP(x) + 36 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPt(x, z, 45) || skip(x, z) || hillK(x, z) > 0) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);
    // the Tyrrhenian past the beach
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 4000, 1, 1), new THREE.MeshStandardMaterial({ color: 0x2a5e78, roughness: 0.15, metalness: 0.3 }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(560 + 700, -0.05, 0);
    sea.receiveShadow = true;
    sea.userData.noAO = true;
    scene.add(sea);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => away(x, z) < HW + 3 || roadD(x, z) < 4.5 || railD(x, z) < 4 || vineAt(x, z, 2) || (bed(x, z) < FP(x) + 30 && CROSS.some((cx) => Math.abs(x - cx) < 9)) }];
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4000, autumn: 0, broadleaf: 0.85, maxY: 60,
      forest: (x: number, z: number) => woodField(x, z),
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 4000, lane: 0,
      avoid: [...avoid, { test: (x: number, z: number) => bed(x, z) < FP(x) + 20 || hillK(x, z) > 0 }] });
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3, fields: this.fields });
    return { buildings: props.buildings, update(dt: number, t: number) { grass.update(dt, t); trees.update(dt, t); hedges.update(dt, t); } };
  },
} satisfies MapDef;
