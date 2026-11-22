// Monte Cassino, January–May 1944 — the Gustav Line on the road to Rome (1945 epoch; the big field, 1.0 × 1.12 km).
// Four battles were fought here: the US 36th Division’s crossing of the Rapido at Sant’Angelo in January, drowned in
// the flooded river; the 34th Division across the fords at Caira and up into the hills; the bombing of the abbey on
// 15 February and of the town on 15 March, after which the New Zealanders and Indians fought the 1st Fallschirmjäger
// Division through the rubble of Cassino and on Castle Hill; and in May, Operation Diadem: the British 8th Army over
// the Gari on the Amazon Bridge into the Liri valley, the Poles onto the ruins of the abbey on the 18th.
// The map: the Allies come from the east (+z, San Vittore and Monte Trocchio on Highway 6), the Germans hold from the
// west (-z, Piedimonte on the Hitler Line). Real north is +x. Across the middle the Rapido — narrow, deep, steep-banked
// and flooded: only its crossings get anyone over — with Cassino in ruins round the Highway 6 bridge, the station
// quarter on the east bank. Over the town on the German side Castle Hill (Rocca Janula), and to the south-west Monte
// Cassino with the abbey on top, the Via Casilina bending round the foot of Monastery Hill; the abbey road winds up
// round it from the foot of Monastery Hill. In the south (−x) the olive groves of the Liri valley’s mouth on both banks and Sant’Angelo on its
// bluff; in the north the open Rapido valley — Caira and the Italian barracks under the Monte Cairo foothills, Cervaro
// and Sant’Elia on the east bank.
// Not a mirror but fair: the abbey’s mountain is matched by Monte Trocchio on the Allied side — each its own shape
// (a steep-faced massif running off the map, a long whale-back), each the same reach from its own base, each with one
// graded road winding up from its foot by the river and its summit a point; Castle Hill over the town is matched by Monte Porchia’s knoll across
// the river, the same height and reach. Each side has one riverside village on its own bank (Sant’Angelo, Cervaro),
// one valley village (Caira, Sant’Elia), and the town is shared across the bridge. Five crossings, spread along the
// river, serve both: the Sant’Angelo ford, the Amazon Bridge, the Highway 6 bridge, the Caira ford, the Sant’Elia bridge.
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

// ---- the Rapido (the Gari below the town), from the north (+x) to the south (−x)
const rz = (x: number) => 10 + 24 * Math.sin(x * 0.0058 - 0.3) + 7 * Math.sin(x * 0.019 + 1.1);
const HW = 9;
const river = createRiver({
  path: rz, halfWidth: HW, level: 0, depth: 2.8, valley: 34,
  crossings: [
    { name: 'Sant’Angelo ford', x: -430, kind: 'ford', width: 14, depth: 0.7 },
    { name: 'Amazon Bridge', x: -205, kind: 'bridge', width: 7 },
    { name: 'Highway 6 bridge', x: 0, kind: 'bridge', width: 9 },
    { name: 'Caira ford', x: 240, kind: 'ford', width: 14, depth: 0.7 },
    { name: 'Sant’Elia bridge', x: 425, kind: 'bridge', width: 7 },
  ],
});
const away = (x: number, z: number) => Math.abs(z - rz(x));

// ---- the heights: each an asymmetric dome (cx, cz, radii east/west/north(−z… the river side)/back, height)
type Hill = { x: number; z: number; e: number; w: number; f: number; b: number; h: number; top: number };
/** Monte Cassino: the abbey on its summit, steep faces to the town and the river, a long back running off the map. */
const ABBEY = { x: -290, z: -295 };
const MASSIF: Hill = { x: ABBEY.x, z: ABBEY.z, e: 190, w: 330, f: 185, b: 320, h: 118, top: 0.22 };
/** Monte Trocchio: a long whale-back along the valley, the Allies’ observation post. */
const TROCCHIO_P = { x: -320, z: 305 };
const TROCCHIO: Hill = { x: TROCCHIO_P.x, z: TROCCHIO_P.z, e: 205, w: 320, f: 125, b: 235, h: 106, top: 0.32 };
const CASTLE = { x: 75, z: -165 };   // Castle Hill, Rocca Janula, over the town
const PORCHIA = { x: 45, z: 165 };   // Monte Porchia’s knoll across the river
const KNOLLS: Hill[] = [
  { x: CASTLE.x, z: CASTLE.z, e: 75, w: 70, f: 58, b: 125, h: 40, top: 0.3 },
  { x: PORCHIA.x, z: PORCHIA.z, e: 70, w: 80, f: 62, b: 120, h: 39, top: 0.3 },
  { x: -175, z: -205, e: 60, w: 60, f: 55, b: 60, h: 14, top: 0.4 },          // Hangman’s Hill, a shoulder of the massif
];
/** A dome's share at (x, z) (0 outside, 1 on its top). `f` faces the river (toward z = 0), `b` faces away. */
function dome(H: Hill, x: number, z: number) {
  const dx = x - H.x, dz = z - H.z;
  const rx = dx > 0 ? H.e : H.w, rzz = (dz > 0) === (H.z < 0) ? H.f : H.b;
  let e = Math.hypot(dx / rx, dz / rzz);
  if (e < 1.2) e *= 1 + 0.12 * noise(x * 0.011 + H.x, z * 0.011);   // (no drawn ellipse: spurs and re-entrants)
  return e >= 1 ? 0 : smoothstep(1, H.top, e);
}

// ---- the points
const SANT_ANGELO = { x: -330, z: -60 };
const CERVARO = { x: 300, z: 52 };
const SANT_ELIA = { x: 335, z: 262 };
const CAIRA = { x: 345, z: -262 };
const H_PT = { x: -358, z: -319 };   // the abbey's gate, on its terrace, where the abbey road comes up
const B_PT = { x: -386, z: 323 };    // Trocchio's top, where its road comes up

// ---- the roads: Highway 6 (the Via Casilina) through the town, the river roads, the crossings' roads
const HWY: number[][] = [[-10, 600], [0, BASE_Z], [-60, 390], [-80, 290], [-40, 150], [0, 70], [0, rz(0)], [0, -40], [-40, -95], [-80, -150], [-82, -260], [-40, -400], [0, -BASE_Z], [10, -600]];
const ROADS: number[][][] = [
  HWY,
  [[-82, 300], [-200, 120], [-205, 60], [-205, rz(-205)], [-205, -70]],                          // the Amazon Bridge road (8th Army, May)
  [[SANT_ANGELO.x, SANT_ANGELO.z], [-205, -70], [-110, -70], [-40, -95]],                          // Sant’Angelo – Cassino, the west bank
  [[-430, 130], [-430, rz(-430)], [-430, -80], [SANT_ANGELO.x, SANT_ANGELO.z]],                   // the Sant’Angelo ford track
  [[-200, 120], [-430, 130]],                                                                      // under Trocchio’s face to the ford
  [[0, 70], [140, 80], [CERVARO.x, CERVARO.z], [425, 110], [425, rz(425)], [425, -110], [CAIRA.x, CAIRA.z]], // the east-bank road, the Sant’Elia bridge
  [[0, -40], [120, -70], [240, -95], [CAIRA.x, CAIRA.z]],                                          // Cassino – Caira, the west bank
  [[SANT_ELIA.x, SANT_ELIA.z], [240, 160], [240, rz(240)], [240, -95]],                            // the Caira ford track (34th Division, January)
  [[0, BASE_Z], [190, 400], [SANT_ELIA.x, SANT_ELIA.z], [CERVARO.x, CERVARO.z]],                   // San Vittore – Sant’Elia – Cervaro
  [[0, -BASE_Z], [190, -400], [CAIRA.x, CAIRA.z]],                                                 // Piedimonte – Caira
];
/** The graded roads to the shelves at their ends: the abbey road climbing round Monastery Hill from the foot over the town, the
 *  Trocchio road round the whale-back from its foot over the river, the tracks up the gentle backs of Castle Hill and Monte Porchia. */
/** A road climbing round dome H across its contours: each leg [from°, to°, from e, to e] round its middle (0° east, 90° toward +z). */
function climb(H: Hill, legs: number[][]) {
  const out: number[][] = [];
  for (const [a0, a1, e0, e1] of legs) {
    const n = Math.ceil(Math.abs(a1 - a0) / 5);
    for (let i = out.length ? 1 : 0; i <= n; i++) {
      const t = i / n, a = ((a0 + (a1 - a0) * t) * Math.PI) / 180, e = e0 + (e1 - e0) * t, c = Math.cos(a), sn = Math.sin(a);
      out.push([H.x + e * (c > 0 ? H.e : H.w) * c, H.z + e * ((sn > 0) === (H.z < 0) ? H.f : H.b) * sn]);
    }
  }
  return out;
}
export const TRACKS: number[][][] = [
  [[-85, -150], ...climb(MASSIF, [[60, -160, 0.97, 0.3]]), [H_PT.x, H_PT.z]],     // (off the Via Casilina at the foot of Monastery Hill, round the east face, the back and the west)
  [[-148, 200], ...climb(TROCCHIO, [[-60, 160, 0.97, 0.3]]), [B_PT.x, B_PT.z]],   // (off the Amazon Bridge road at Trocchio's foot, round the east face, the back and the west)
  [[-82, -260], [CASTLE.x - 20, CASTLE.z - 80], [CASTLE.x, CASTLE.z]],
  [[-60, 260], [PORCHIA.x - 30, PORCHIA.z + 70], [PORCHIA.x, PORCHIA.z]],
];
const roadD = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) d = Math.min(d, segDist(r, x, z)); for (const t of TRACKS) d = Math.min(d, segDist(t, x, z)); return d; };

// ---- the ground: the valley floor, the heights, the bluffs and shelves; cached (the noise is dear), the river cut live
function ground0(x: number, z: number) {
  let h = 2.6 + fbm(noise, x * 0.006, z * 0.006, 3) * 1.6;
  h += smoothstep(330, 500, x) * 14 * (0.7 + 0.3 * Math.sin(z * 0.01));             // the Monte Cairo / Sant’Elia foothills in the north
  h += smoothstep(-380, -520, x) * smoothstep(-100, 100, z) * 10;                     // Monte Camino’s foot beyond Trocchio
  h += smoothstep(380, 560, Math.abs(z)) * 6;                                          // the rear rising gently
  for (const H of [MASSIF, TROCCHIO]) {
    const k = dome(H, x, z);
    if (k > 0) h += H.h * k + ridged(noise, x * 0.012 + 3, z * 0.012, 3) * 38 * k * (1 - k);   // limestone crests and gullies on the flanks
  }
  for (const H of KNOLLS) h += H.h * dome(H, x, z);
  h += 7 * smoothstep(80, 30, Math.hypot(x - SANT_ANGELO.x, z - SANT_ANGELO.z - 12));   // Sant’Angelo’s bluff
  h += 6 * smoothstep(80, 30, Math.hypot(x - CERVARO.x, z - CERVARO.z + 10));          // Cervaro’s rise
  return h;
}
const SHELVES = [[ABBEY.x, ABBEY.z, 46], [H_PT.x, H_PT.z, 20], [B_PT.x, B_PT.z, 26], [CASTLE.x, CASTLE.z, 18], [PORCHIA.x, PORCHIA.z, 18],
  [0, BASE_Z, 34], [0, -BASE_Z, 34], [SANT_ANGELO.x, SANT_ANGELO.z, 26], [CERVARO.x, CERVARO.z, 26]];
const SHELF_H = SHELVES.map(([x, z]) => ground0(x, z));
SHELF_H[1] = SHELF_H[0]; // (the gate on the abbey's terrace)
const TRACK_H = TRACKS.map((t) => {
  const [ex, ez] = t[t.length - 1], end = SHELF_H[SHELVES.reduce((b, s, i) => (Math.hypot(s[0] - ex, s[1] - ez) < Math.hypot(SHELVES[b][0] - ex, SHELVES[b][1] - ez) ? i : b), 0)];
  if (t.length > 3) { // (the mountain roads: the ground's own height at each corner, smoothed along the road, the shelf at its end)
    let hs = t.map(([x, z]) => ground0(x, z));
    hs[hs.length - 1] = end;
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

// ---- the town of Cassino round the bridge: the old town on the west bank, the station quarter on the east
const inTown = (x: number, z: number) => {
  const r = rz(x);
  return z < r ? Math.hypot((x + 10) / 150, (z - r + 10) / 120) < 1 : Math.hypot(x / 110, (z - r) / 75) < 1;
};
const olive0 = (x: number, z: number) => fbm(noise, x * 0.008 + 11, z * 0.008 - 4, 2);

const points: ControlPointDef[] = [
  { id: 'A', name: 'San Vittore', x: 0, z: BASE_Z - 30, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Monte Trocchio', x: B_PT.x, z: B_PT.z, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Monte Porchia', x: PORCHIA.x, z: PORCHIA.z, owner: null, sector: 'centre', radius: 22 },
  { id: 'D', name: 'Sant’Elia', x: SANT_ELIA.x, z: SANT_ELIA.z, owner: null, sector: 'east' },
  { id: 'E', name: 'Sant’Angelo', x: SANT_ANGELO.x, z: SANT_ANGELO.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Cassino', x: 12, z: -12, owner: null, sector: 'centre', radius: 36 }, // (beside the highway at the town end of the bridge — not on its deck, the flag would block it — and reaching over the river)
  { id: 'G', name: 'Cervaro', x: CERVARO.x, z: CERVARO.z, owner: null, sector: 'east' },
  { id: 'H', name: 'Monte Cassino', x: H_PT.x, z: H_PT.z, owner: null, sector: 'west', radius: 26 },
  { id: 'I', name: 'Castle Hill', x: CASTLE.x, z: CASTLE.z, owner: null, sector: 'centre', radius: 22 },
  { id: 'J', name: 'Caira', x: CAIRA.x, z: CAIRA.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Piedimonte', x: 0, z: -BASE_Z + 30, owner: 'pact', sector: 'centre' },
];

const layout = [{ unit: 'rifles', x: 12, z: BASE_Z - 20, name: '1st Platoon' }];

export default {
  id: 'cassino',
  name: 'Monte Cassino',
  description: 'Italy, spring 1944, the Gustav Line on the road to Rome: the flooded Rapido and its few crossings, Cassino bombed to rubble round the Highway 6 bridge, Castle Hill over it and the ruined abbey on Monte Cassino; Monte Trocchio across the valley, olive groves in the mouth of the Liri valley.',
  epochs: ['1945'],
  region: 'africa', // (the North Africa & Mediterranean menu, as Gela: maps/index.js REGIONS)
  sides: { nato: 'Allies', pact: 'Germany' },
  armies: { nato: ['us', 'brit'], pact: ['wh', 'fj'] }, // (the US Fifth Army and the British 8th Army against the XIV Panzer Corps and the 1st Fallschirmjäger Division)
  conditions: { time: 'day', weather: 'overcast' }, // (March 1944: grey skies over the rubble)
  airfields: [], // (no room for a runway between the river, the town and the mountains: the aircraft come in from the map edge)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.5, // (the mountain faces are for men on foot: vehicles keep to the valley, the mountain roads and the backs of the knolls)
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 1944,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => (away(x, z) < 30 || inTown(x, z) ? 0 : smoothstep(0.0, 0.3, olive0(x, z)) * 0.45),
  fields: createFields({ seed: 194405, cell: 60, weights: [0.4, 0.3, 0.1, 0.2] as any }),

  theme: {
    // an overcast March day, smoke over the town
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
        if (inTown(x, z) && away(x, z) > HW + 4) return [0x7e766a, 0.85];                    // rubble dust
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

  bases: { nato: { x: 0, z: BASE_Z, entries: [-250, 0, 250] }, pact: { x: 0, z: -BASE_Z, entries: [-250, 0, 250] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  // the bombing and the shelling: the town ploughed up, craters on Castle Hill, round the abbey and along the river
  battlefield() {
    const dens = (x: number, z: number) => {
      if (away(x, z) < HW + 6 || roadD(x, z) < 4) return 0;
      if (inTown(x, z)) return 1.6;
      if (Math.hypot(x - CASTLE.x, z - CASTLE.z) < 70 || Math.hypot(x - ABBEY.x, z - ABBEY.z) < 110) return 0.9;
      if (Math.hypot(x - B_PT.x, z - B_PT.z) < 70 || Math.hypot(x - PORCHIA.x, z - PORCHIA.z) < 60) return 0.5;
      return away(x, z) < 120 ? 0.15 : 0.03;
    };
    // (shellField scatters the +z half and mirrors it: the +z half of one field, the mirrored half of another)
    const blasts = [...shellField(1944_0315, BOUNDS, dens).filter((b: number[]) => b[1] >= 0),
      ...shellField(1944_0215, BOUNDS, (x: number, z: number) => dens(-x, -z)).filter((b: number[]) => b[1] < 0)];
    return { blasts, ruins: [], works: [] };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 3, z) - terrain.heightAt(x - 3, z), terrain.heightAt(x, z + 3) - terrain.heightAt(x, z - 3)) / 6;
    const clear = (x: number, z: number, r: number) => roadD(x, z) > r + 4 && away(x, z) > HW + r + 6 && steepAt(x, z) < 0.22;

    // ---- Cassino: gutted blocks and roofless houses in streets of rubble, the station, the hotels at the foot of Monastery Hill
    props.rand = mulberry32(1944_03_15);
    {
      const r = props.rand;
      const named: [number, number, number, number, number, string][] = [
        [-95, -128, 0.3, 26, 14, 'Continental Hotel'], [-58, -72, 0.6, 20, 12, 'Hotel des Roses'], [-150, -40, 0, 30, 11, 'Cassino station'],
        [38, -60, 0.2, 14, 22, 'Chiesa Madre'], [-28, -20, 0, 18, 12, 'town hall'],
      ];
      const placed: number[][] = [];
      for (const [x, z, yaw, w, d, name] of named) {
        props.ruinBlock({ x, z, yaw, width: w, depth: d, storeys: name === 'Chiesa Madre' ? 3 : 2 + Math.floor(r() * 2), ruin: 0.35 + r() * 0.25, name });
        placed.push([x, z, Math.max(w, d) / 2 + 3]);
      }
      for (let gx = -160; gx <= 140; gx += 17) {
        for (let gz = -140; gz <= 90; gz += 16) {
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
      props.sandbagRing({ x: 14, z: rz(14) + HW + 14, radius: 4.5, toward: -1 });
      props.sandbagRing({ x: -14, z: rz(-14) - HW - 14, radius: 4.5, toward: 1 });
    }

    // ---- the abbey on its summit: the great ruined walls round the cloisters, the basilica; Castle Hill's keep
    props.rand = mulberry32(1944_02_15);
    props.ruinBlock({ x: ABBEY.x - 10, z: ABBEY.z - 12, yaw: 0.78, width: 56, depth: 36, storeys: 3, ruin: 0.5, name: 'Abbey of Monte Cassino' });
    props.ruinBlock({ x: CASTLE.x - 8, z: CASTLE.z - 10, yaw: 0.3, width: 10, depth: 10, storeys: 3, ruin: 0.4, name: 'Rocca Janula' });
    for (const [lx, lz, ry] of [[0, 15, 0], [14, 0, Math.PI / 2], [-14, 2, Math.PI / 2]]) {
      const [wx, wz] = PropBuilder.local(CASTLE.x - 8, CASTLE.z - 10, 0.3, lx, lz);
      props.lowWall({ x: wx, z: wz, yaw: 0.3 + ry, length: 18, height: 1.5, color: 0xa8a294 });
    }
    // Trocchio's and Porchia's observation posts
    props.sandbagRing({ x: B_PT.x + 18, z: B_PT.z - 14, radius: 5, toward: -1 });
    props.sandbagRing({ x: PORCHIA.x - 12, z: PORCHIA.z - 12, radius: 4.5, toward: -1 });

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
    village(CERVARO.x, CERVARO.z, 8, 34, 4402);
    village(SANT_ELIA.x, SANT_ELIA.z, 9, 38, 4403);
    village(CAIRA.x + 20, CAIRA.z - 30, 5, 26, 4404);
    props.hall({ x: CAIRA.x - 40, z: CAIRA.z + 30, yaw: 0.2, width: 30, depth: 12, height: 6, color: 0xa89a7c, roof: 0x7a4a36, door: 5, name: 'Italian barracks' });
    props.hall({ x: CAIRA.x - 5, z: CAIRA.z + 55, yaw: 0.2, width: 26, depth: 11, height: 6, color: 0xa89a7c, roof: 0x7a4a36, door: 5, name: 'Italian barracks' });
    village(-70, BASE_Z - 40, 4, 30, 4405);                                       // San Vittore's edge
    village(70, -BASE_Z + 40, 4, 30, 4406);                                       // Piedimonte's edge

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
    for (let i = 0; i < 360; i++) {
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
    // the olive groves in the mouth of the Liri valley and up the lower slopes, poplars and willows along the river
    const olives = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 6000, broadleaf: 1, autumn: 0, size: 0.6, maxY: 45,
      forest: (x: number, z: number) => {
        const o = smoothstep(0.0, 0.3, olive0(x, z)) * (x < 150 ? 1 : 0.5);
        return Math.max(o, smoothstep(HW + 14, HW + 7, away(x, z)) * 0.5);
      },
    });
    // scrub oak and broom on the mountains, thinned by the shelling
    const scrub = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3500, broadleaf: 0.85, autumn: 0.15, size: 0.7, maxY: 140,
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
