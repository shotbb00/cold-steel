// The Montello, 15–23 June 1918: the Battle of the Solstice. Before dawn on the 15th the Austro-Hungarian XXIV Corps
// crossed the Piave below the Montello on boats and pontoons at Falzè, Fontigo and Nervesa, climbed the long wooded
// hill and pushed along its numbered tracks toward the plain; Nervesa and the abbey of Sant’Eustachio were shot to
// rubble, the Italian Eighth Army held the hill’s southern edge, the Piave rose behind the attackers and tore their
// bridges away, and on the 23rd they went back over the river. On this map the break into the plain goes on: from
// the Montello down to the Brentella and the Treviso road, and the Italians, British and French striking back over the
// river into the Quartier del Piave.
// On the map: the Piave across the middle — a wide bed of white gravel between the dykes, two fast arms round the
// islands, the Fontigo pontoons in the west, a ford over the Grave di Falzè in the middle, the Priula road bridge in
// the east; the Montello on the Italian bank (south, +z), a long low whale-back of oak and chestnut cut by its parallel
// numbered tracks, the prese, running across it from the river to the plain, the Dorsale along its spine, Ciano under
// its west end, Nervesa with its ruined church and the abbey ruin at its east end, Giavera at its southern foot; on the
// Austrian bank (north, −z) the Collalto hills over the river with the castle of San Salvatore above Susegana,
// Collalto at their back and Sernaglia on the plain; behind each, the flat plain of maize, mulberry rows and vineyards,
// villas with their barns, a canal (the Brentella on the Italian side, the Soligo mill-race on the Austrian).
// Not mirrored but fair: the points stand point-for-point as far from each base. Each side has a long wooded ridge of
// the same height rising straight off its own dyke (the Montello on the west half of the Italian bank; the Collalto
// hills, shorter, wider-shouldered, on the east half of the Austrian), its summit point on the crest at the same reach,
// a crest road and tracks across it from the dyke road to its plain (the Montello’s twenty prese; fewer, the vineyard
// lanes, over Collalto, which is narrower), a village under each end, the same three crossings over both arms, its
// dyke and its canal; the river’s bends, the ridges’ shapes and each plain’s woods are its own.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, plantHedgerows, growGround } from '../world/Vegetation.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { pontoons, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 340;
const HW = 18;
const DYKE = 128;                                                // the dykes’ crests, m off the bed’s middle
const EXT = { x: 640, z: 700 };                                  // (the grids the dear parts are sampled onto)
const noise = createNoise2D(1918_0615);
const mid = (x: number) => 14 * Math.sin(x * 0.0045 + 0.9) + 7 * Math.sin(x * 0.012 + 2) - 22 * Math.cos(x * 0.0062) + 16; // (its own bends)
const armN = (x: number) => mid(x) + 46 + 6 * Math.sin(x * 0.016 + 0.4);
const armS = (x: number) => mid(x) - 46 - 7 * Math.sin(x * 0.013 + 2.1);
const CROSS = [-SIDE_X, 0, SIDE_X];
const crossings = [
  ...[0, 1].map((channel) => ({ name: 'Fontigo pontoon bridge', x: -SIDE_X, kind: 'bridge', width: 6, channel, pontoon: true })),
  ...[0, 1].map((channel) => ({ name: 'Grave di Falzè ford', x: 0, kind: 'ford', width: 18, depth: 0.7, channel })),
  ...[0, 1].map((channel) => ({ name: 'Ponte della Priula', x: SIDE_X, kind: 'bridge', width: 8, channel })),
];
const river = createRiver({ path: armN, paths: [armN, armS], halfWidth: HW, level: 0, depth: 2.8, valley: 34, crossings });
const away = (x: number, z: number) => Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x)));
const bed = (x: number, z: number) => Math.abs(z - mid(x));
const dykeZ = (x: number, s: number) => mid(x) + (DYKE + 22) * s;   // the road behind each dyke

// ---- the two ridges: the Montello (long, narrow, west half of the Italian bank), the Collalto hills (east half of the Austrian)
const MON = { x: -150, z: 250, rx: 370, rz: 86, h: 26 };
const COL = { x: 190, z: -265, rx: 320, rz: 95, h: 26, rot: -0.24 };   // (lying at a slant: off the river at Falzè, back from it above Susegana)
const ellQ = (e: { x: number; z: number; rx: number; rz: number; rot?: number }, x: number, z: number) => {
  const dx = x - e.x, dz = z - e.z, c = Math.cos(e.rot ?? 0), s = Math.sin(e.rot ?? 0);
  return Math.hypot((dx * c + dz * s) / e.rx, (dz * c - dx * s) / e.rz);
};
const colAxis = (t: number) => [COL.x + t * Math.cos(COL.rot), COL.z + t * Math.sin(COL.rot)];
const colAxisZ = (x: number) => COL.z + (x - COL.x) * Math.tan(COL.rot);
/** Collalto’s far (north) foot at x: the last z going north from the river still on the hill. */
const colBack = (x: number) => { let e = colAxisZ(x); for (let z = e; z > -600; z -= 2) if (ellQ(COL, x, z) < 1) e = z; return e; };
const edgeZ = (e: typeof MON, x: number, s: number) => { const d = (x - e.x) / e.rx; return Math.abs(d) < 1 ? e.z + s * e.rz * Math.sqrt(1 - d * d) : e.z; };
const hillK = (x: number, z: number) => Math.max(0, 1 - Math.min(ellQ(MON, x, z), ellQ(COL, x, z)));

// ---- the points
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Treviso road', 0, 470, 'centre'),
  P('B', 'Montello', -250, 250, 'west', { radius: 26 }),
  P('C', 'Giavera', 40, 348, 'centre'),
  P('D', 'Nervesa', 315, 228, 'east'),
  P('E', 'Ciano', -SIDE_X + 28, Math.round(dykeZ(-SIDE_X + 28, 1) + 6), 'west', { radius: 24 }),
  P('F', 'Grave di Falzè', 0, 0, 'centre', { radius: 26 }),
  P('G', 'Ponte della Priula', SIDE_X - 28, Math.round(dykeZ(SIDE_X - 28, -1) - 6), 'east', { radius: 24 }),
  P('H', 'Sernaglia', -286, -198, 'west'),
  P('I', 'Collalto', -79, -364, 'centre'),
  P('J', 'San Salvatore', 280, -283, 'east', { radius: 26 }),
  P('K', 'Conegliano road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the roads
const PRESE = Array.from({ length: 21 }, (_, i) => 170 - 34 * i).filter((x) => Math.abs((x - MON.x) / MON.rx) < 0.975);
const LANES = [-170, -85, 0, 85, 170, 255, 340, 425];            // Collalto’s vineyard lanes
const line = (x0: number, x1: number, f: (x: number) => number, step = 40) => { const o: number[][] = []; for (let x = x0; x <= x1; x += step) o.push([x, f(x)]); return o; };
const ROADS: number[][][] = [
  line(-560, 560, (x) => dykeZ(x, 1)), line(-560, 560, (x) => dykeZ(x, -1)),                 // behind the dykes
  ...CROSS.map((x) => [[x, dykeZ(x, 1)], [x, dykeZ(x, -1)]]),                                // over the bed
  ...PRESE.map((x) => [[x, dykeZ(x, 1)], [x, edgeZ(MON, x, 1) + 12]]),                       // the prese, river to plain
  ...LANES.map((x) => [[x, dykeZ(x, -1)], [x, colBack(x) - 12]]),
  line(-500, 200, (x) => MON.z + 6 * Math.sin(x * 0.01)), Array.from({ length: 15 }, (_, i) => colAxis(-280 + i * 40)), // the Dorsale; Collalto’s crest road
  [[0, 580], [0, 460], [20, 400], at('C'), [0, edgeZ(MON, 0, 1) + 12]],                      // the Treviso road up to Giavera
  [[0, -580], [0, -460], [-20, -400], at('I'), [0, colBack(0) - 12]],                 // the Conegliano road down to Collalto
  [[-560, 380], [-340, 372], [-150, 362], at('C'), [200, 356], [340, 340], [560, 350]],       // along each ridge’s back
  [[-560, -350], [-340, -330], [-200, -356], at('I'), [150, -380], [340, -416], [560, -424]],
  [[-SIDE_X, 580], [-SIDE_X, 330]], [[SIDE_X, -580], [SIDE_X, -330]],                         // in from the flank entries
  [[SIDE_X, 580], [SIDE_X, 330], at('D'), [SIDE_X, dykeZ(SIDE_X, 1)]], [at('D'), [200, MON.z]],
  [[-SIDE_X, -580], [-SIDE_X, -330], at('H'), [-SIDE_X, dykeZ(-SIDE_X, -1)]], [at('H'), colAxis(-280)],
];
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
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;

// ---- the canals: the Brentella across the Italian plain, the Soligo mill-race across the Austrian (culverts under the roads)
const CANALS = [
  [[-560, 408], [-300, 400], [-100, 412], [100, 402], [300, 410], [560, 402]],
  [[-560, -404], [-300, -412], [-100, -400], [100, -410], [300, -402], [560, -408]],
];
const canalRaw = segField(CANALS, 20), canalD = gridCacheSmooth(canalRaw, EXT, 2);

// ---- the vineyards: the same number on each plain, each from its own seed
const VINES: { x: number; z: number; yaw: number }[] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 6151 : 6187);
  for (let i = 0, n = 0; i < 4000 && n < 9; i++) {
    const x = (r() * 2 - 1) * 440, z = s * (180 + r() * 290), yaw = (r() - 0.5) * 0.5;
    if (nearPt(x, z, 60) || hillK(x, z) > 0 || bed(x, z) < DYKE + 50 || canalRaw(x, z) < 34 || Math.hypot(x, z - s * BASE_Z) < 70 || Math.abs(z) > 480
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
const ground = gridCacheSmooth((x: number, z: number) => {
  const b = bed(x, z);
  let h = 3 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.2;                                   // the plain
  h += (1.1 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.5 - h) * (1 - smoothstep(DYKE - 22, DYKE - 10, b)); // the gravel bed between the dykes
  const gap = CROSS.some((bx) => Math.abs(x - bx) < 12) ? 0.35 : 1;                         // (cut down where the roads go over the dyke)
  h += 4.6 * (1 - smoothstep(4, 13, Math.abs(b - DYKE))) * gap;                            // the argine
  const out = smoothstep(DYKE + 6, DYKE + 30, b);
  const qm = ellQ(MON, x, z), qc = ellQ(COL, x, z);
  h += out * MON.h * smoothstep(1.08, 0.1, qm + fbm(noise, x * 0.01 + 3, z * 0.01, 2) * 0.06);           // the Montello’s whale-back
  h += out * COL.h * smoothstep(1.08, 0.1, qc + fbm(noise, x * 0.01 - 9, z * 0.01, 2) * 0.06) ** 0.85;   // Collalto’s fuller shoulders
  h += out * fbm(noise, x * 0.03 + 7, z * 0.03, 2) * 2.5 * Math.max(0, 1 - Math.min(qm, qc) * 1.3); // dolines in the tops
  h -= 1.1 * Math.exp(-((canalD(x, z) / 2.1) ** 2)) * smoothstep(4, 9, roadD(x, z));       // the canals
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return h;
}, EXT, 2);
const height = (x: number, z: number) => river.carve(x, z, ground(x, z));

// ---- the woods: both ridges wooded but for the vine terraces on their back slopes; willow on the islands; each plain’s copses and mulberry rows its own
const wn = (x: number, z: number) => fbm(noise, x * 0.008 + 50, z * 0.008, 3);
const T_N = 0.4, T_P = evenThreshold((x, z) => (bed(x, z) > DYKE + 16 && hillK(x, z) <= 0 ? wn(x, z) : -9), T_N, (x, z) => z > mid(x));
const woodField = gridCache((x: number, z: number) => {
  if (away(x, z) < HW + 2) return -1;
  const b = bed(x, z);
  if (b < DYKE - 14) return fbm(noise, x * 0.03, z * 0.03, 2) > 0.25 ? 0.5 : 0;             // willow scrub on the gravel islands
  if (Math.abs(b - DYKE) < 16 || onRoad(x, z) || vineAt(x, z, 3) || canalD(x, z) < 3) return 0;
  const qm = ellQ(MON, x, z), qc = ellQ(COL, x, z);
  if (qm < 1 || qc < 1) {
    const back = qm < 1 ? z > MON.z : z < colAxisZ(x);
    return back && Math.min(qm, qc) > 0.55 && fbm(noise, x * 0.02 + 30, z * 0.02, 2) > 0 ? 0 : 0.85;  // oak and chestnut; the vine terraces
  }
  if (wn(x, z) > (z > mid(x) ? T_N : T_P)) return 0.6;                                     // copses and poplar rows
  if (fbm(noise, x * 0.006 - 40, z * 0.006, 2) > 0.1 && ((Math.abs(z) % 28) < 1.6)) return 0.5; // the mulberry rows along the fields
  return 0;
}, EXT, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'montello',
  name: 'Montello',
  description: 'June 1918, the Battle of the Solstice: the Austro-Hungarians cross the braided Piave and climb the Montello, the long wooded hill cut by its numbered tracks — from Nervesa’s ruins and the Priula bridge down into the plain of mulberry rows, vineyards and canals toward Treviso, the Collalto hills over the other bank.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (no strip long and flat enough clear of the ridges, the mulberry rows, the canals and the dykes: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['it', 'uk', 'fr'], pact: ['ah'] }, // (the Italian Eighth Army on the Montello, with the British and French divisions in Italy, against the Austro-Hungarian Isonzo Army’s XXIV Corps)
  sides: { nato: 'Italy, Britain and France', pact: 'Austria-Hungary' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 19180615,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191815, cell: 64, weights: [0.3, 0.4, 0.05, 0.25] as any }),
  woods: (x: number, z: number) => Math.max(0, woodField(x, z)) * 0.85,

  theme: {
    // a hot, hazy June day over the Venetian plain, the Alps a grey line behind
    fogColor: 0xbcc0b6, fogDensity: 0.0012, skyTop: 0x6a8eb4, skyHorizon: 0xd2d4ca, skyBottom: 0x888a7e,
    sunColor: 0xfff0d2, sunIntensity: 2.0, sunDisk: 0.35, clouds: 0.35, cloudLight: 0xf0f0ea, cloudDark: 0x9aa2a8,
    sunDir: [0.4, 0.75, 0.3], hemiSky: 0xc8d4de, hemiGround: 0x6a6440, hemiIntensity: 1.25, rimColor: 0xd8dce0, rimIntensity: 0.25,
    terrain: {
      grass: '#5a6a32', grassAlt: '#50622c', dryGrass: '#a49a5c', dirt: '#7a6a50', rock: '#b8b4a8', strip: '#5a4a36',
      pasture: '#5c6c34', ploughed: '#7c6a50', stubble: '#c4ae64', meadow: '#687a3a',
      farmX: [460, 600], farmZ: [520, 640], roads: CROSS, roadZ: 560,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.2) return [hillK(x, z) > 0.05 ? 0x7e6a4e : 0xa09478, 0.85];               // white roads; the prese’s earth
        const b = bed(x, z);
        if (b < DYKE - 12) return [fbm(noise, x * 0.012 + 8, z * 0.03, 3) > 0.05 ? 0xd4cebe : 0xa6a08c, y < 1.3 ? 1 : 0.85]; // the grave
        if (Math.abs(b - DYKE) < 12) return [0x7a8048, 0.6];                                   // the dyke’s turf
        if (canalD(x, z) < 2.4) return [0x3e4a40, 0.8];                                        // the canal’s banks
        if (vineAt(x, z)) return [0x7a6648, 0.55];                                             // the vineyards’ worked soil
        const k = hillK(x, z);
        if (k > 0) return [woodField(x, z) > 0.5 ? 0x4a5228 : 0x6a7036, Math.min(0.9, k * 6)];  // leaf litter under the oaks; the vine terraces’ grass
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

  /** Each army’s line dug into its dyke, wire toward the river (gaps at the crossings), MG posts on the crest; Nervesa and the riverside farms in ruins. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, mid(x * s) + (DYKE + 3) * s]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 60 })) if (CROSS.every((bx) => Math.abs(w.x - bx) > 10) && !onRoad(w.x, w.z)) works.push(w);
      for (const bx of CROSS) for (const dx of [-18, 18]) works.push({ kind: 'mgNest', x: bx + dx * s, z: mid(bx + dx * s) + DYKE * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (Math.hypot(b.x - 315, b.z - 228) < 70 || Math.hypot(b.x + 286, b.z + 198) < 70 ? 0.6 : bed(b.x, b.z) < 260 ? 0.25 : 0.06)).map((b: any) => b.index);
    return { blasts: [], ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const skip = (x: number, z: number) => bed(x, z) < DYKE + 16 || roadD(x, z) < 8 || canalD(x, z) < 6 || vineAt(x, z, 4) || hillK(x, z) > 0.35;

    // the villages with their campaniles: Nervesa and Sernaglia big, Ciano, Giavera, Collalto, Susegana by the bridge
    for (const [x, z, n, sp, sd] of [[315, 228, 10, 1.3, 1], [-286, -198, 10, 1.3, 2], [40, 348, 7, 1.1, 3], [-79, -364, 7, 1.1, 4],
      [-SIDE_X + 60, dykeZ(-SIDE_X + 60, 1) + 30, 6, 1, 5], [SIDE_X - 60, dykeZ(SIDE_X - 60, -1) - 30, 6, 1, 6]]) farmVillage(props, x, z, n, 191806 + sd, skip, sp);
    props.rand = mulberry32(1915);
    for (const [x, z, yaw] of [[60, 380, 0], [-100, -385, Math.PI], [-SIDE_X + 70, dykeZ(-SIDE_X + 70, 1) + 50, 0.2], [SIDE_X - 70, dykeZ(SIDE_X - 70, -1) - 50, Math.PI + 0.2], [-290, -262, Math.PI]]) if (!skip(x, z)) props.church({ x, z, yaw });
    // Nervesa’s ruined church and bell tower; the abbey of Sant’Eustachio on the Montello’s east end; the castle of San Salvatore
    props.ruinBlock({ x: 290, z: 252, yaw: 0.1, width: 20, depth: 11, storeys: 2, ruin: 0.6, name: 'church of Nervesa' });
    props.ruinBlock({ x: 276, z: 268, yaw: 0.1, width: 5, depth: 5, storeys: 4, ruin: 0.5, name: 'bell tower' });
    props.ruinBlock({ x: 170, z: 238, yaw: -0.2, width: 18, depth: 12, storeys: 2, ruin: 0.7, name: 'abbey of Sant’Eustachio' });
    props.hall({ x: 300, z: -310, yaw: 0.3, width: 18, depth: 14, height: 9, color: 0x9a8a72, roof: 0x7a3e2c, door: 4, name: 'castle of San Salvatore' });
    props.ruinBlock({ x: 325, z: -267, yaw: 0.3, width: 6, depth: 6, storeys: 4, ruin: 0.35, name: 'castle keep' });
    // the villas on each plain: the house, its barchessa, the garden wall
    for (const [x, z, yaw] of [[-210, 445, 0], [230, 440, 0], [-235, -440, Math.PI], [205, -446, Math.PI]]) {
      if (skip(x, z)) continue;
      props.townHouse({ x, z, yaw, width: 16, depth: 10, storeys: 2, name: 'villa', damaged: 0 });
      props.house({ x: x + 22, z, yaw: yaw + Math.PI / 2, width: 8, depth: 18 });
      props.lowWall({ x, z: z + (z > 0 ? -14 : 14), yaw, length: 26, height: 1.6, color: 0xc8b896 });
    }
    // farmhouses in the Montello’s clearings and on Collalto; boats and timber by the crossings (each bank its own)
    for (const [x, z] of [[-380, 290], [-70, 205], [40, 260], [-200, 300], [60, -295], [330, -220], [-110, -240], [200, -300]]) if (roadD(x, z) > 9) props.house({ x, z, yaw: props.rand() * 3, width: 9, depth: 7 });
    for (const s of [1, -1]) for (const bx of CROSS) {
      const z = (s > 0 ? armN(bx) : armS(bx)) + (HW + 12 + props.rand() * 6) * s, dx = 12 + props.rand() * 10;
      props.logPile({ x: bx + dx, z, yaw: props.rand() * 0.6, length: 7 });
      props.crates({ x: bx - dx, z: z + 4 * s, yaw: props.rand() * 3 });
    }
    // the vineyards: low rows of vines on their stakes, cut into lengths that follow the ground
    for (const v of VINES) {
      const L = (lx: number, lz: number) => [v.x + lx * Math.cos(v.yaw) + lz * Math.sin(v.yaw), v.z - lx * Math.sin(v.yaw) + lz * Math.cos(v.yaw)];
      for (let lz = -14; lz <= 14; lz += 3.5) for (let lx = -16; lx <= 16; lx += 10.6) {
        const [x, z] = L(lx, lz);
        props.box('plain', x, terrain.heightAt(x, z) + 0.6, z, 10, 1.2, 0.7, v.yaw, 0x4e6a2a);
      }
    }
    // the canals’ water
    for (const c of CANALS) for (let i = 0; i < c.length - 1; i++) {
      const [ax, az] = c[i], [bx, bz] = c[i + 1], len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax);
      for (let t = 4; t < len; t += 8) {
        const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len;
        if (roadD(x, z) < 6 || Math.abs(x) > 520) continue;
        props.box('plain', x, terrain.heightAt(x, z) + 0.35, z, 8.4, 0.06, 2.0, yaw, 0x4a5e5a);
      }
    }
    // farmsteads and hay over each plain (each its own)
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm'];
    for (let tries = 0, n = 0; n < 140 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (bed(x, z) < DYKE + 40 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPt(x, z, 45) || skip(x, z) || hillK(x, z) > 0) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => away(x, z) < HW + 3 || roadD(x, z) < 4.5 || canalD(x, z) < 3 || vineAt(x, z, 2) || (bed(x, z) < DYKE + 30 && CROSS.some((bx) => Math.abs(x - bx) < 9)) }];
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 7500, autumn: 0, broadleaf: 0.92, maxY: 60,
      forest: (x: number, z: number) => woodField(x, z),
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 5000, lane: 0,
      avoid: [...avoid, { test: (x: number, z: number) => bed(x, z) < DYKE + 20 || hillK(x, z) > 0 }] });
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3, fields: this.fields });
    return { buildings: props.buildings, update(dt: number, t: number) { grass.update(dt, t); trees.update(dt, t); hedges.update(dt, t); } };
  },
} satisfies MapDef;
