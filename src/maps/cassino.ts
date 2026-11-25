// Monte Cassino, January–May 1944 — the Gustav Line on the road to Rome (1945 epoch; the big field, 1.0 × 1.12 km).
// Four battles were fought here: the US 36th Division’s crossing of the Rapido at Sant’Angelo in January, drowned in
// the flooded river; the 34th Division across the fords at Caira and up into the hills; the bombing of the abbey on
// 15 February and of the town on 15 March, after which the New Zealanders and Indians fought the 1st Fallschirmjäger
// Division through the rubble of Cassino and on Castle Hill; and in May, Operation Diadem: the British 8th Army over
// the Gari into the Liri valley, the Poles over Snakeshead Ridge and Point 593 onto the ruins of the abbey on the 18th.
// The map is the May battle, turned so the Allies come up the floor of the Liri valley from the south (+z) and the
// Germans hold from the north (−z), down the upper Rapido valley on the Atina road. The real ground, as it lies then:
// the Monte Cassino massif fills the whole north-west of the field — Monastery Hill with the abbey on the promontory at
// its south-east corner, a steep face down to the town on the east, another down to the Liri valley on the south, and
// behind it the ridges running north (Snakeshead, Point 593) rising toward Monte Cairo off the map. Cassino is a strip
// of rubble at the foot of the eastern face, Castle Hill (Rocca Janula) a spur over it, Hangman’s Hill a shoulder under
// the abbey. The Rapido runs lengthwise down the east flank — from Caira and the Italian barracks past the town — and
// on south as the Gari past Sant’Angelo on its bluff; Highway 6 comes over it from the east into the town and bends
// round the foot of Monastery Hill to run west along the mountain’s southern foot toward Piedimonte and Rome. The Liri
// valley’s olive groves and Pignataro fill the south-west; across the river, Monte Trocchio stands alone on the east bank
// and the Cifalco hills rise over Caira.
// Fair by distance, not mirrored: the Germans have the mountain (the abbey, Point 593, Castle Hill), Caira and the town
// nearer them; the Allies have the open valley, its olive groves and villages (Pignataro, Sant’Angelo), Monte Trocchio
// over the river and the Hotel Continental at the bend of Highway 6 — distance and cover against height.
// No `climate`: Italy in spring, olive drab and field grey.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, shellField } from './common.js';
import { segDist, graded } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1944_05);

// ---- the Rapido down the east flank (x = RX(z)), from Caira in the north past the town, and on south as the Gari
const RIV = [[250, -760], [235, -520], [180, -330], [150, -250], [110, -130], [92, -60], [110, 40], [150, 130], [210, 220], [265, 320], [320, 480], [350, 760]];
const RX = (z: number) => {
  for (let i = 0; i < RIV.length - 1; i++) {
    const [ax, az] = RIV[i], [bx, bz] = RIV[i + 1];
    if (z <= bz) return ax + (bx - ax) * Math.max(0, (z - az) / (bz - az));
  }
  return RIV[RIV.length - 1][0];
};
const HW = 9;
const river = createRiver({
  path: RIV, halfWidth: HW, level: 0, depth: 2.8, valley: 34,
  crossings: [
    { name: 'Caira ford', x: RX(-300), z: -300, kind: 'ford', width: 14, depth: 0.7 },
    { name: 'Highway 6 bridge', x: RX(-60), z: -60, kind: 'bridge', width: 9 },
    { name: 'Amazon Bridge', x: RX(180), z: 180, kind: 'bridge', width: 7 },
    { name: 'Sant’Angelo ford', x: RX(400), z: 400, kind: 'ford', width: 14, depth: 0.7 },
  ],
});
/** Distance from the river's middle (near enough: across the local run of the course). */
const away = (x: number, z: number) => { const s = (RX(z + 5) - RX(z - 5)) / 10; return Math.abs(x - RX(z)) / Math.sqrt(1 + s * s); };

// ---- the massif: its eastern face's foot (x = xE(z), swinging west behind Caira) and its southern face's foot (z = zS(x),
// running WNW toward Piedimonte); `inside` is how far into the mountain (x, z) lies from the nearer foot
const xE = (z: number) => -40 - 60 * smoothstep(-250, -560, z) + 10 * Math.sin(z * 0.013);
const zS = (x: number) => -40 + 0.55 * Math.max(0, -60 - x) + 8 * Math.sin(x * 0.017);
const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - (h * h * k) / 4; };
const inside = (x: number, z: number) => smin(xE(z) - x, zS(x) - z, 50);

// ---- the heights: each an asymmetric dome (cx, cz, radii +x/−x/toward z = 0/away, height)
type Hill = { x: number; z: number; e: number; w: number; f: number; b: number; h: number; top: number };
const ABBEY = { x: -175, z: -135 };   // the abbey on Monastery Hill, the promontory at the massif’s south-east corner
const PT593 = { x: -240, z: -280 };   // Point 593 on Snakeshead Ridge, north of it
const CASTLE = { x: -50, z: -200 };   // Castle Hill, Rocca Janula, a spur of the face over the town
const TROCCHIO_P = { x: 420, z: 230 };
const PEAKS: Hill[] = [
  { x: ABBEY.x, z: ABBEY.z, e: 90, w: 90, f: 85, b: 85, h: 30, top: 0.25 },
  { x: PT593.x, z: PT593.z, e: 80, w: 90, f: 100, b: 90, h: 38, top: 0.3 },
  { x: CASTLE.x, z: CASTLE.z, e: 50, w: 55, f: 45, b: 60, h: 32, top: 0.3 },
  { x: -100, z: -105, e: 45, w: 45, f: 40, b: 45, h: 10, top: 0.4 },          // Hangman’s Hill, a shoulder under the abbey
];
/** Monte Trocchio: alone on the east bank, the Allies’ observation post. */
const TROCCHIO: Hill = { x: TROCCHIO_P.x, z: TROCCHIO_P.z, e: 110, w: 130, f: 120, b: 110, h: 42, top: 0.3 };
/** A dome's share at (x, z) (0 outside, 1 on its top). `f` faces z = 0, `b` faces away. */
function dome(H: Hill, x: number, z: number) {
  const dx = x - H.x, dz = z - H.z;
  const rx = dx > 0 ? H.e : H.w, rzz = (dz > 0) === (H.z < 0) ? H.f : H.b;
  let e = Math.hypot(dx / rx, dz / rzz);
  if (e < 1.2) e *= 1 + 0.12 * noise(x * 0.011 + H.x, z * 0.011);   // (no drawn ellipse: spurs and re-entrants)
  return e >= 1 ? 0 : smoothstep(1, H.top, e);
}

// ---- the points
const SANT_ANGELO = { x: 220, z: 360 };
const PIGNATARO = { x: -260, z: 380 };
const CAIRA = { x: 80, z: -260 };
const CONTINENTAL = { x: 10, z: 90 };
const TOWN_PT = { x: 30, z: -100 };
const H_PT = { x: -145, z: -118 };    // the abbey's gate, on its terrace, where the abbey road comes up

// ---- the roads: Highway 6 over the river into the town and round the foot of Monastery Hill to the west, the Atina road
// down the upper Rapido, the valley roads, the crossings' roads
const HWY: number[][] = [[620, -50], [450, -55], [300, -60], [160, -62], [40, -62], [0, -20], [-20, 40], [-70, 100], [-200, 90], [-350, 175], [-620, 330]];
const ROADS: number[][][] = [
  HWY,
  [[0, 620], [0, BASE_Z], [-30, 350], [-60, 200], [-70, 100]],                                             // up the Liri valley to Highway 6
  [[0, -620], [0, -BASE_Z], [40, -380], [CAIRA.x, CAIRA.z], [60, -150], [40, -62]],                         // the Atina road down the Rapido
  [[0, BASE_Z], [140, 430], [SANT_ANGELO.x, SANT_ANGELO.z], [180, 250], [130, 170], [90, 100], [40, -62]],  // Sant’Angelo and the Gari road
  [[0, BASE_Z], [-140, 430], [PIGNATARO.x, PIGNATARO.z], [-300, 250], [-350, 175]],                         // Pignataro
  [[130, 170], [150, 202], [216, 158], [330, 150]],                                                         // the Amazon Bridge (8th Army, May)
  [[CAIRA.x, CAIRA.z], [130, -315], [210, -285], [320, -260], [500, -300]],                                 // the Caira ford (34th Division, January)
  [[SANT_ANGELO.x, SANT_ANGELO.z], [255, 413], [330, 387], [500, 420]],                                     // the Sant’Angelo ford (36th Division, January)
  [[320, -260], [300, -60], [330, 150], [360, 300], [330, 387]],                                            // the east-bank road
];
/** The graded roads to the shelves at their ends: the abbey road's hairpins up the eastern face from the town, the track
 *  along Snakeshead Ridge to Point 593, the track winding up Castle Hill from the Atina road, the Trocchio road. */
export const TRACKS: number[][][] = [
  [[-10, -35], [-50, -45], [-56, -150], [-72, -158], [-76, -50], [-92, -45], [-98, -150], [-114, -156], [-118, -60], [-132, -58], [-140, -100], [H_PT.x, H_PT.z]],
  [[H_PT.x, H_PT.z], [-140, -160], [-170, -200], [-205, -235], [PT593.x, PT593.z]],
  [[60, -160], [20, -215], [-10, -238], [-35, -228], [CASTLE.x, CASTLE.z]],
  [[330, 150], [400, 140], [470, 180], [470, 245], [TROCCHIO_P.x, TROCCHIO_P.z]],
];
/** Distance to the nearest of `lines`, each cut into short pieces with their boxes: far pieces are skipped (the caches fill fast). */
function nearest(lines: number[][][]) {
  const parts: [number[][], number, number, number, number][] = [];
  for (const l of lines) for (let i = 0; i < l.length - 1; i += 4) {
    const p = l.slice(i, i + 5), xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
    parts.push([p, Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]);
  }
  return (x: number, z: number) => {
    let d = Infinity;
    for (const [p, x0, x1, z0, z1] of parts) {
      const bx = Math.max(x0 - x, 0, x - x1), bz = Math.max(z0 - z, 0, z - z1);
      if (bx * bx + bz * bz < d * d) d = Math.min(d, segDist(p, x, z));
    }
    return d;
  };
}
const roadD = gridCacheSmooth(nearest([...ROADS, ...TRACKS]), { x: 800, z: 800 }, 2.5);

// ---- the ground: the valley floor, the massif, the heights, the bluffs and shelves; cached (the noise is dear), the river cut live
function ground0(x: number, z: number) {
  let h = 2.6 + fbm(noise, x * 0.006, z * 0.006, 3) * 1.6;
  const d = inside(x, z);
  if (d > -30) {   // the massif: steep faces from the foot, its ridges and ravines running north toward Monte Cairo (higher north and west)
    const k = smoothstep(-8, 165, d), Hm = 50 + 28 * smoothstep(-100, -560, z) + 10 * smoothstep(-100, -500, x);
    h += Hm * k ** 0.85 + (ridged(noise, x * 0.012 + 3, z * 0.0055, 3) - 0.3) * 55 * smoothstep(10, 140, d);   // (the ridges run north: Snakeshead, Phantom, the ravines between)
  }
  for (const H of PEAKS) h += H.h * dome(H, x, z);
  const t = dome(TROCCHIO, x, z);
  if (t > 0) h += TROCCHIO.h * t + ridged(noise, x * 0.012 + 3, z * 0.012, 3) * 16 * t * (1 - t);   // limestone crests and gullies on its flanks
  h += 55 * smoothstep(260, 600, x) * smoothstep(-120, -600, z) ** 1.2;                                // the Cifalco hills over Caira, east of the river
  h += 14 * smoothstep(330, 600, x) * smoothstep(300, 600, z);                                         // the rise toward Monte Porchia beyond the Gari
  h += 6 * smoothstep(80, 30, Math.hypot(x - SANT_ANGELO.x - 10, z - SANT_ANGELO.z));                  // Sant’Angelo’s bluff
  h += smoothstep(440, 580, z) * 5;                                                                    // the rear rising gently
  return h;
}
const SHELVES = [[ABBEY.x, ABBEY.z, 44], [H_PT.x, H_PT.z, 20], [PT593.x, PT593.z, 22], [CASTLE.x, CASTLE.z, 18], [TROCCHIO_P.x, TROCCHIO_P.z, 24],
  [0, BASE_Z, 34], [0, -BASE_Z, 34], [SANT_ANGELO.x, SANT_ANGELO.z, 26], [PIGNATARO.x, PIGNATARO.z, 26]];
const SHELF_H = SHELVES.map(([x, z]) => ground0(x, z));
SHELF_H[1] = SHELF_H[0]; // (the gate on the abbey's terrace)
const TRACK_H = TRACKS.map((t) => {
  const [ex, ez] = t[t.length - 1], end = SHELF_H[SHELVES.reduce((b, s, i) => (Math.hypot(s[0] - ex, s[1] - ez) < Math.hypot(SHELVES[b][0] - ex, SHELVES[b][1] - ez) ? i : b), 0)];
  if (t.length > 3) { // (the mountain roads: the ground's own height at each corner, smoothed along the road, the shelf at its end)
    let hs = t.map(([x, z]) => ground0(x, z));
    hs[hs.length - 1] = end;
    SHELVES.forEach(([sx, sz, r], i) => { if (Math.hypot(t[0][0] - sx, t[0][1] - sz) < r) hs[0] = SHELF_H[i]; });   // (a road off a shelf: level with it)
    for (let pass = 0; pass < 4; pass++) hs = hs.map((h, i) => (i === 0 || i === hs.length - 1 ? h : (hs[i - 1] + 2 * h + hs[i + 1]) / 4));
    const len = t.map((p, i) => (i ? Math.hypot(p[0] - t[i - 1][0], p[1] - t[i - 1][1]) : 0));
    for (let pass = 0; pass < 6; pass++) { // (no stretch steeper than 3 in 10: the trucks get up)
      for (let i = 1; i < hs.length - 1; i++) hs[i] = Math.min(Math.max(hs[i], hs[i - 1] - 0.3 * len[i]), hs[i - 1] + 0.3 * len[i]);
      for (let i = hs.length - 2; i > 0; i--) hs[i] = Math.min(Math.max(hs[i], hs[i + 1] - 0.3 * len[i + 1]), hs[i + 1] + 0.3 * len[i + 1]);
    }
    return hs;
  }
  const run = [0]; for (let i = 1; i < t.length; i++) run.push(run[i - 1] + Math.hypot(t[i][0] - t[i - 1][0], t[i][1] - t[i - 1][1]));
  const h0 = ground0(t[0][0], t[0][1]), L = run[run.length - 1];
  return run.map((s) => h0 + (end - h0) * (s / L));
});
const REACH = 160; // (far enough that the cut and fill meet the ground again on their own: no wall where they stop)
const TRACK_BOX = TRACKS.map((t) => [Math.min(...t.map((p) => p[0])) - REACH, Math.max(...t.map((p) => p[0])) + REACH, Math.min(...t.map((p) => p[1])) - REACH, Math.max(...t.map((p) => p[1])) + REACH]);
function ground1(x: number, z: number) {
  let h = ground0(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { const d = Math.hypot(x - sx, z - sz); if (d < r + 24) h += (SHELF_H[i] - h) * smoothstep(r + 24, r, d); });
  // each road level, its cut and fill sloping off steeper than wheels take, as men climb (where two roads' slopes meet: both kept)
  let lo = -Infinity, hi = Infinity, near = Infinity, nearH = 0;
  TRACKS.forEach((t, i) => {
    const [x0, x1, z0, z1] = TRACK_BOX[i];
    if (x < x0 || x > x1 || z < z0 || z > z1) return;
    const g = graded(t, TRACK_H[i], x, z);
    if (g.d >= REACH) return;
    const m = 0.6 * Math.max(0, g.d - 6) + 0.02 * Math.max(0, g.d - 50) ** 2; // (easing off further out: the ground takes over again without a step)
    lo = Math.max(lo, g.h - m); hi = Math.min(hi, g.h + m);
    if (g.d < near) { near = g.d; nearH = g.h + Math.max(-m, Math.min(m, h - g.h)); }
  });
  if (near === Infinity) return h;
  return lo <= hi ? Math.max(lo, Math.min(hi, h)) : nearH;
}
const cached = gridCacheSmooth(ground1, { x: BOUNDS.x + 20, z: BOUNDS.z + 20 }, 2.5);
const height = (x: number, z: number) => river.carve(x, z, cached(x, z));

// ---- the town of Cassino: a strip between the mountain's eastern face and the river, from the bend of Highway 6 north
const inTown = (x: number, z: number) => z > -215 && z < -5 && x > xE(z) + 6 && x < RX(z) - HW - 10;
const olive0 = (x: number, z: number) => fbm(noise, x * 0.008 + 11, z * 0.008 - 4, 2);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Liri valley', x: 0, z: BASE_Z - 30, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Sant’Angelo', x: SANT_ANGELO.x, z: SANT_ANGELO.z, owner: null, sector: 'east' },
  { id: 'C', name: 'Pignataro', x: PIGNATARO.x, z: PIGNATARO.z, owner: null, sector: 'west' },
  { id: 'D', name: 'Monte Trocchio', x: TROCCHIO_P.x, z: TROCCHIO_P.z, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Hotel Continental', x: CONTINENTAL.x, z: CONTINENTAL.z, owner: null, sector: 'centre' },
  { id: 'F', name: 'Cassino', x: TOWN_PT.x, z: TOWN_PT.z, owner: null, sector: 'centre', radius: 34 },
  { id: 'G', name: 'Point 593', x: PT593.x, z: PT593.z, owner: null, sector: 'west', radius: 24 },
  { id: 'H', name: 'Monte Cassino', x: H_PT.x, z: H_PT.z, owner: null, sector: 'west', radius: 26 },
  { id: 'I', name: 'Castle Hill', x: CASTLE.x, z: CASTLE.z, owner: null, sector: 'centre', radius: 22 },
  { id: 'J', name: 'Caira', x: CAIRA.x, z: CAIRA.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Atina road', x: 0, z: -BASE_Z + 30, owner: 'pact', sector: 'centre' },
];

const layout = [{ unit: 'rifles', x: 12, z: BASE_Z - 20, name: '1st Platoon' }];

export default {
  id: 'cassino',
  name: 'Monte Cassino',
  description: 'Italy, May 1944, the Gustav Line on the road to Rome: the Monte Cassino massif fills the north-west — the ruined abbey on Monastery Hill, Snakeshead Ridge and Point 593 behind it — with Cassino in rubble at the foot of its face and Castle Hill over the town; the Rapido and the Gari down the east flank, Highway 6 bending round the mountain, the Liri valley’s olive groves opening to the south.',
  epochs: ['1945'],
  region: 'africa', // (the North Africa & Mediterranean menu, as Gela: maps/index.js REGIONS)
  sides: { nato: 'Allies', pact: 'Germany' },
  armies: { nato: ['us', 'brit'], pact: ['wh', 'fj'] }, // (the US Fifth Army and the British 8th Army against the XIV Panzer Corps and the 1st Fallschirmjäger Division)
  conditions: { time: 'day', weather: 'overcast' }, // (grey skies over the rubble)
  airfields: [], // (no room for a runway between the river, the town and the mountains: the aircraft come in from the map edge)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.5, // (the mountain faces are for men on foot: vehicles keep to the valley, the mountain roads and the backs of the hills)
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 1944,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => (away(x, z) < 30 || inTown(x, z) ? 0 : smoothstep(0.0, 0.3, olive0(x, z)) * 0.45),
  fields: createFields({ seed: 194405, cell: 60, weights: [0.4, 0.3, 0.1, 0.2] as any }),

  theme: {
    // an overcast spring day, smoke over the town
    fogColor: 0xa4a49c, fogDensity: 0.0015, skyTop: 0x66717c, skyHorizon: 0xb4b4aa, skyBottom: 0x6c6c64,
    sunColor: 0xeee4cc, sunIntensity: 1.5, sunDisk: 0.08, clouds: 0.85, cloudLight: 0xc4c4bc, cloudDark: 0x666a6c,
    sunDir: [0.4, 0.6, 0.55], hemiSky: 0xbcc2c4, hemiGround: 0x545040, hemiIntensity: 1.3, rimColor: 0xc4c4be, rimIntensity: 0.22,
    terrain: {
      grass: '#5e6a3c', grassAlt: '#566236', dryGrass: '#8a8054', dirt: '#6a5a44', rock: '#7e7a68',
      pasture: '#62703e', ploughed: '#6a5640', stubble: '#948658', meadow: '#66743e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.6) return [0x9a9282, 0.9];                                                // white limestone roads
        if (inTown(x, z)) return [0x7e766a, 0.85];                                            // rubble dust
        if (away(x, z) < HW + 6 && y < 1.6) return [0x4e4636, 0.9];                          // the Rapido's mud banks
        if (y > 12) {
          const g = Math.hypot(cached(x + 2, z) - cached(x - 2, z), cached(x, z + 2) - cached(x, z - 2)) / 4;
          if (g > 0.75) return [0x9a968a, Math.min(0.9, (g - 0.75) * 2.5)];                    // limestone crags
          const n = fbm(noise, x * 0.025 + 7, z * 0.025, 2);                                  // macchia — scrub oak and broom — and bare, shelled earth
          return [n > 0 ? 0x545a30 : 0x786c52, (0.45 + Math.abs(n) * 0.5) * smoothstep(12, 35, y)];
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-250, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [0, 150, 250] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  // the bombing and the shelling: the town ploughed up, craters on Castle Hill, round the abbey and Point 593, along the river
  battlefield() {
    const dens = (x: number, z: number) => {
      if (away(x, z) < HW + 6 || roadD(x, z) < 4) return 0;
      if (inTown(x, z)) return 1.6;
      if (Math.hypot(x - CASTLE.x, z - CASTLE.z) < 70 || Math.hypot(x - ABBEY.x, z - ABBEY.z) < 110) return 0.9;
      if (Math.hypot(x - PT593.x, z - PT593.z) < 90) return 0.7;
      if (Math.hypot(x - TROCCHIO_P.x, z - TROCCHIO_P.z) < 70 || Math.hypot(x - CONTINENTAL.x, z - CONTINENTAL.z) < 60) return 0.5;
      return away(x, z) < 120 ? 0.15 : 0.03;
    };
    // (shellField scatters the +z half and mirrors it: the +z half of one field, the mirrored half of another)
    const blasts = [...shellField(1944_0315, BOUNDS, dens).filter((b: number[]) => b[1] >= 0),
      ...shellField(1944_0215, BOUNDS, (x: number, z: number) => dens(-x, -z)).filter((b: number[]) => b[1] < 0)];
    return { blasts, ruins: [], works: [] };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 3, z) - terrain.heightAt(x - 3, z), terrain.heightAt(x, z + 3) - terrain.heightAt(x, z - 3)) / 6;
    const clear = (x: number, z: number, r: number) => roadD(x, z) > r + 4 && away(x, z) > HW + r + 6 && steepAt(x, z) < 0.22;

    // ---- Cassino: gutted blocks and roofless houses in streets of rubble, the hotels at the foot of Monastery Hill
    props.rand = mulberry32(1944_03_15);
    {
      const r = props.rand;
      const named: [number, number, number, number, number, string][] = [
        [CONTINENTAL.x - 30, CONTINENTAL.z + 8, 0.5, 24, 13, 'Continental Hotel'], [-12, -10, 0.2, 18, 11, 'Hotel des Roses'], [10, -172, 0, 24, 12, 'Baron’s Palace'],
        [0, -130, 0, 14, 22, 'Chiesa Madre'], [50, -40, 0, 16, 11, 'town hall'],
      ];
      const placed: number[][] = [];
      for (const [x, z, yaw, w, d, name] of named) {
        props.ruinBlock({ x, z, yaw, width: w, depth: d, storeys: name === 'Chiesa Madre' ? 3 : 2 + Math.floor(r() * 2), ruin: 0.35 + r() * 0.25, name });
        placed.push([x, z, Math.max(w, d) / 2 + 3]);
      }
      for (let gx = -40; gx <= 110; gx += 16) {
        for (let gz = -215; gz <= -5; gz += 15) {
          const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3;
          const w = 9 + r() * 4, d = 8 + r() * 3, hw = Math.max(w, d) / 2;
          if (!inTown(x, z) || r() < 0.18 || !clear(x, z, hw) || nearPoint(x, z, 8 + hw) || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + hw)) continue;
          placed.push([x, z, hw]);
          const k = r(), yaw = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.1;
          if (k < 0.7) props.ruinBlock({ x, z, yaw, width: w, depth: d, storeys: 2 + Math.floor(r() * 2), ruin: 0.3 + r() * 0.4, name: 'ruined house' });
          else if (k < 0.88) props.townHouse({ x, z, yaw, width: w, depth: d, storeys: 2, name: 'town house', damaged: 1 });
          else for (let i = 0; i < 3; i++) props.rubble(x + (r() - 0.5) * 6, z + (r() - 0.5) * 6, 0.8 + r() * 0.8);
        }
      }
      // the bridgeheads: sandbags at each end of the Highway 6 bridge
      props.sandbagRing({ x: RX(-60) + HW + 16, z: -76, radius: 4.5, toward: -1 });
      props.sandbagRing({ x: RX(-60) - HW - 16, z: -44, radius: 4.5, toward: 1 });
    }

    // ---- the abbey on its summit: the great ruined walls round the cloisters, the basilica; Castle Hill's keep
    props.rand = mulberry32(1944_02_15);
    props.ruinBlock({ x: ABBEY.x - 10, z: ABBEY.z - 5, yaw: 0.78, width: 56, depth: 36, storeys: 3, ruin: 0.5, name: 'Abbey of Monte Cassino' });
    props.ruinBlock({ x: CASTLE.x - 22, z: CASTLE.z - 16, yaw: 0.3, width: 10, depth: 10, storeys: 3, ruin: 0.4, name: 'Rocca Janula' });   // (the keep on the crag beside the point, the road coming up the other side)
    for (const [lx, lz, ry] of [[0, -9, 0], [-9, 0, Math.PI / 2]]) {
      const [wx, wz] = PropBuilder.local(CASTLE.x - 22, CASTLE.z - 16, 0.3, lx, lz);
      props.lowWall({ x: wx, z: wz, yaw: 0.3 + ry, length: 14, height: 1.5, color: 0xa8a294 });
    }
    // the stone sangars on Point 593, Trocchio's observation post
    for (const [dx, dz] of [[16, 10], [-14, 14], [4, -18]]) props.sandbagRing({ x: PT593.x + dx, z: PT593.z + dz, radius: 3.5, toward: 1 });
    props.sandbagRing({ x: TROCCHIO_P.x - 18, z: TROCCHIO_P.z - 14, radius: 5, toward: -1 });

    // ---- the villages: stone houses, most of them knocked about; the Italian barracks at Caira
    const village = (cx: number, cz: number, n: number, spread: number, seed: number) => {
      const r = (props.rand = mulberry32(seed));
      const placed: number[][] = [];
      for (let i = 0; i < n * 6 && placed.length < n; i++) {
        const a = r() * Math.PI * 2, dist = 14 + r() * spread, x = cx + Math.cos(a) * dist, z = cz + Math.sin(a) * dist;
        const w = 7 + r() * 3, d = 7 + r() * 2;
        if (!clear(x, z, w / 2) || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 13) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
        placed.push([x, z]);
        const yaw = Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (r() - 0.5) * 0.2;
        if (r() < 0.35) props.ruinBlock({ x, z, yaw, width: w, depth: d, storeys: 2, ruin: 0.3 + r() * 0.3, name: 'ruined house' });
        else props.townHouse({ x, z, yaw, width: w, depth: d, storeys: r() < 0.4 ? 1 : 2, name: 'stone house', damaged: 0.6 });
      }
    };
    village(SANT_ANGELO.x, SANT_ANGELO.z, 8, 34, 4401);
    village(PIGNATARO.x, PIGNATARO.z, 9, 38, 4402);
    village(CAIRA.x + 10, CAIRA.z - 10, 6, 30, 4404);
    props.hall({ x: 22, z: -312, yaw: 1.3, width: 30, depth: 12, height: 6, color: 0xa89a7c, roof: 0x7a4a36, door: 5, name: 'Italian barracks' });
    props.hall({ x: 14, z: -352, yaw: 1.3, width: 26, depth: 11, height: 6, color: 0xa89a7c, roof: 0x7a4a36, door: 5, name: 'Italian barracks' });
    village(-430, 270, 5, 30, 4405);                                              // Piumarola on Highway 6, under the mountain
    village(70, -BASE_Z + 50, 4, 30, 4406);                                       // the hamlet on the Atina road
    village(360, 230, 4, 30, 4407);                                               // the farms at Trocchio's foot

    // ---- the farms and dry-stone terraces of the valley, rocks on the mountains
    const r = mulberry32(1944_01);
    for (let i = 0, n = 0; i < 3000 && n < 40; i++) {
      const x = (r() * 2 - 1) * 470, z = (n % 2 ? -1 : 1) * (40 + r() * 470);
      if (!clear(x, z, 8) || nearPoint(x, z, 45) || inTown(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || terrain.heightAt(x, z) > 25) continue;
      n++;
      const yaw = r() * 3;
      props.townHouse({ x, z, yaw, width: 9 + r() * 3, depth: 7, storeys: r() < 0.5 ? 1 : 2, name: 'farmhouse', damaged: 0.5 });
      const [wx, wz] = PropBuilder.local(x, z, yaw, 0, 9);
      if (roadD(wx, wz) > 14) props.lowWall({ x: wx, z: wz, yaw, length: 16, height: 1.2, color: 0xa49c88 });
    }
    for (let i = 0; i < 120; i++) {
      const x = (r() * 2 - 1) * 470, z = (i % 2 ? -1 : 1) * (40 + r() * 480), yaw = r() < 0.5 ? 0 : Math.PI / 2, len = 14 + r() * 26;
      if (roadD(x, z) < 6 + len / 2 || away(x, z) < HW + 10 + len / 2 || nearPoint(x, z, 30 + len / 2) || inTown(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 + len / 2 || steepAt(x, z) > 0.25) continue;
      props.lowWall({ x, z, yaw, length: len, height: 1.1, color: 0xa8a08c });
    }
    for (let i = 0; i < 420; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (60 + r() * 480);
      if (terrain.heightAt(x, z) < 18 || roadD(x, z) < 6 || nearPoint(x, z, 28)) continue;
      props.boulder({ x, z, radius: 0.8 + r() * 1.8 });
    }
    commandPost(props, this.bases.nato, -1, 0x5e5e44);
    commandPost(props, this.bases.pact, 1, 0x56584a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => away(x, z) < HW + 5 || roadD(x, z) < 5.5 || inTown(x, z) || Math.hypot(x - ABBEY.x, z - ABBEY.z) < 50 }];
    // the olive groves of the Liri valley and up the lower slopes, poplars and willows along the river
    const olives = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 3800, broadleaf: 1, autumn: 0, size: 0.6, maxY: 45,
      forest: (x: number, z: number) => {
        const o = smoothstep(0.0, 0.3, olive0(x, z)) * (z > 0 && x < 180 ? 1 : 0.5);   // (thickest in the Liri valley)
        return Math.max(o, smoothstep(HW + 14, HW + 7, away(x, z)) * 0.5);
      },
    });
    // scrub oak and broom on the mountains, thinned by the shelling
    const scrub = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2200, broadleaf: 0.85, autumn: 0.15, size: 0.7, maxY: 160,
      forest: (x: number, z: number) => { const y = cached(x, z); return y < 14 ? 0 : 0.45 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.5; },
    });
    cover.finalize(bounds);
    const grow = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grow.update(dt, t); olives.update?.(dt, t); scrub.update?.(dt, t); },
    };
  },
} satisfies MapDef;
