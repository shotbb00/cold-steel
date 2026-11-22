// Tarvis, 1915–1917: the Tarvis (Tarvisio) gap and the Carnic and Julian Alps front. From May 1915 the Italian Alpini
// came over the passes against the corner where Austria, Italy and Carniola met — the market town of Tarvis with its
// fortified church and the junction of the Pontebbana railway (Udine–Pontafel–Tarvis) with the line north to Villach —
// held by Austro-Hungarian mountain troops, Kaiserschützen and Landsturm. The old Austrian forts that barred the valleys,
// Malborghet (Werk Hensel) over the Fella and Predil over the Raibl road, casemated batteries cut into the valley walls,
// were shelled to ruins by the Italian heavy guns in 1915–16 and still held; the front stood on the heights round
// Tarvis — Monte Lussari with its pilgrimage church among them — until Caporetto swept it away in October 1917.
// The ground: three valleys meet at Tarvis. The Slizza (Gailitz) comes down from the Raibl lake under the Predil past the
// mining town of Raibl, through Tarvis, and out north through the gorge past Goggau toward Arnoldstein; across it runs
// the Val Canale — west past Saifnitz on the watershed, where the Fella springs and runs west with the road and the
// railway toward Malborghet and Pontafel, and east to Weissenfels and its lakes. Between the valleys the mountains go
// up in four blocks of spruce forest, then pasture and limestone: the Lussari, the Predil's slopes, Malborghet's wall,
// the Ofen (Monte Forno) over the three-country corner. Mountain huts, a pilgrims' cableway, a military ropeway.
// Not mirrored but fair: the Slizza runs down the west side of its valley, the valley road base to base down the east
// bank, so the two sides' halves are alike across the Val Canale, not turned round each other. Each side has a mountain
// point over the Slizza, reached over its own bridge (Raibl for the Italians to the Lussari, Goggau for the Austrians to
// Fort Malborghet), on shelves of one height, and a mountain point on its own bank, reached by its own graded road
// (Fort Predil, the Ofen), on shelves of another height; one fort and one height each. Saifnitz lies over the Tarvis
// bridge for both, Weissenfels on the road bank for both, Tarvis straddles the bridge. The blocks' own shapes differ
// (the western walls lower, each block its own massif), the high ground is shared out evenly between the halves.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { segDist, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1915_0524);
/** The Slizza from the Raibl lake (the wide pool at its head, on the nato base's west flank) north through Tarvis and the gorge — down the west side of its valley all the way. */
const SLIZZA = [[-130, 497, 34], [-118, 464, 28], [-100, 425, 9], [-80, 340, 8], [-62, 250, 8], [-45, 160, 8], [-25, 75, 8], [4, 12, 8],
  [-26, -50, 8], [-50, -130, 8.5], [-74, -220, 9], [-100, -320, 9], [-122, -410, 9], [-140, -500, 9], [-148, -590, 9], [-156, -760, 9]];
/** The young Fella from its spring at Saifnitz west down the Val Canale. */
const FELLA = [[-335, 67, 3], [-390, 63, 4.5], [-450, 55, 5.5], [-510, 61, 6], [-580, 55, 6], [-760, 62, 6]];
const river = createRiver({
  paths: [SLIZZA, FELLA], halfWidth: 8, level: 0, depth: 2.4, valley: 36,
  crossings: [
    { name: 'Tarvis bridge', x: 4, z: 12, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Raibl bridge', x: -71, z: 300, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Goggau bridge', x: -100, z: -320, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Rio del Lago ford', x: -57, z: 222, kind: 'ford', width: 14, depth: 0.6, channel: 0 },
    { name: 'Gailitz ford', x: -62, z: -175, kind: 'ford', width: 14, depth: 0.6, channel: 0 },
    { name: 'Malborghet bridge', x: -450, z: 55, kind: 'bridge', width: 7, channel: 1 },
  ],
});
/** How far (x, z) is from the water's edge (up to ~40 m: past that the river isn't asked — its full search is slow far from every channel). */
const wet = (x: number, z: number) => { if (segD(WATER_S, x, z, 45) >= 45) return 40; const p = river.project(x, z); return p.d - p.hw; };

/** The valley roads: down the Slizza valley's east bank base to base, the Val Canale west (over the Tarvis bridge and the Fella) and east, the branches west over the Raibl and Goggau bridges. */
const ROAD_N = [[0, 570], [0, 500], [10, 400], [30, 300], [34, 200], [30, 110], [26, 40], [22, 3], [24, -30], [0, -110], [-16, -200], [-35, -320], [-12, -400], [0, -500], [0, -570]];
const ROAD_W = [[22, 3], [-14, 21], [-90, 32], [-180, 36], [-290, 35], [-380, 22], [-440, 21], [-447, 35], [-453, 75], [-470, 89], [-580, 87]];
const ROAD_E = [[22, 3], [100, -12], [200, -28], [330, -40], [440, -38], [580, -30]];
const BR_B = [[30, 300], [-51, 304], [-91, 296], [-150, 300]];
const BR_H = [[-35, -320], [-81, -325], [-119, -315], [-170, -300]];
const ROADS = [ROAD_N, ROAD_W, ROAD_E, BR_B, BR_H];
/** The graded mountain roads in zigzags: up to Fort Predil, to Fort Malborghet, to the Lussari, to the Ofen. */
const TRACK_LINES = [
  [[34, 200], [120, 195], [170, 250], [130, 320], [220, 300], [270, 350], [320, 290]],
  [[-170, -300], [-200, -375], [-235, -295], [-265, -375], [-300, -250]],
  [[-150, 300], [-185, 378], [-222, 294], [-262, 374], [-340, 320]],
  [[-16, -200], [85, -190], [150, -240], [110, -325], [205, -300], [275, -370], [370, -330]],
];
/** A polyline with each corner rounded into an arc of radius `R` (sampled every ~4 m): the hairpins of a mountain road,
 *  so the two legs of a bend never come close enough for their grades to fight. */
function fillet(poly: number[][], R: number) {
  const out = [poly[0]];
  for (let i = 1; i < poly.length - 1; i++) {
    const [ax, az] = poly[i - 1], [bx, bz] = poly[i], [cx, cz] = poly[i + 1];
    const l1 = Math.hypot(ax - bx, az - bz), l2 = Math.hypot(cx - bx, cz - bz);
    const u1 = [(ax - bx) / l1, (az - bz) / l1], u2 = [(cx - bx) / l2, (cz - bz) / l2];
    const half = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))) / 2;   // half the angle between the legs
    const t = Math.min(R / Math.tan(half), 0.45 * Math.min(l1, l2)), r = t * Math.tan(half);
    const p1 = [bx + u1[0] * t, bz + u1[1] * t], p2 = [bx + u2[0] * t, bz + u2[1] * t];
    const bis = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(bis[0], bis[1]) || 1, cd = r / Math.sin(half);
    const o = [bx + (bis[0] / bl) * cd, bz + (bis[1] / bl) * cd];
    let a0 = Math.atan2(p1[1] - o[1], p1[0] - o[0]), a1 = Math.atan2(p2[1] - o[1], p2[0] - o[0]);
    let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const n = Math.max(2, Math.ceil(Math.abs(da) * r / 4));
    for (let k = 0; k <= n; k++) { const a = a0 + (da * k) / n; out.push([o[0] + Math.cos(a) * r, o[1] + Math.sin(a) * r]); }
  }
  out.push(poly[poly.length - 1]);
  return out;
}
const TRACKS = TRACK_LINES.map((t) => fillet(t, 17));
/** The Val Canale's floor line (for the ground, not a road). */
const EW = [[-590, 65], [-450, 55], [-300, 35], [-150, 38], [-14, 21], [22, 3], [150, -15], [330, -40], [590, -30]];
/** The Pontebbana up the Fella's south bank into Tarvis station, and the station's siding. */
const RAIL = [[-590, 107], [-470, 109], [-390, 97], [-300, 75], [-200, 80], [-110, 70]];
const SIDING = [[-200, 86], [-110, 80]];
const SL2 = SLIZZA.map(([x, z]) => [x, z]);

/** Segments with their boxes: the distance to the nearest, up to `cap` m (asked for every vertex). */
const segs = (lines: number[][][]) => lines.flatMap((r) => r.slice(1).map((b, i) => { const a = r[i]; return [a[0], a[1], b[0], b[1], Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; }));
function segD(S: number[][], x: number, z: number, cap: number) {
  let best = cap;
  for (const [ax, az, bx, bz, x0, x1, z0, z1] of S) {
    if (x < x0 - best || x > x1 + best || z < z0 - best || z > z1 + best) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
const ROAD_S = segs([...ROADS, ...TRACKS]);
const WATER_S = segs([SL2, FELLA.map(([x, z]) => [x, z])]);
const VALLEY_S = segs([SL2, ROAD_N, EW]);
/** The road segments bucketed on a 40 m grid (each with every segment within 30 m of the cell): roadD asks only its own cell's. */
const RC = 40, RN = 44, R0 = -880;
const RBUCKETS: number[][][] = Array.from({ length: RN * RN }, () => []);
for (const sg of ROAD_S) {
  const [, , , , x0, x1, z0, z1] = sg;
  for (let j = Math.max(0, Math.floor((z0 - 30 - R0) / RC)); j <= Math.min(RN - 1, Math.floor((z1 + 30 - R0) / RC)); j++)
    for (let i = Math.max(0, Math.floor((x0 - 30 - R0) / RC)); i <= Math.min(RN - 1, Math.floor((x1 + 30 - R0) / RC)); i++) RBUCKETS[j * RN + i].push(sg);
}
const roadD = (x: number, z: number, cap = 30) => {
  const i = Math.floor((x - R0) / RC), j = Math.floor((z - R0) / RC);
  return i < 0 || j < 0 || i >= RN || j >= RN ? cap : segD(RBUCKETS[j * RN + i], x, z, Math.min(cap, 30));
};
const onRoad = (x: number, z: number) => roadD(x, z, 6) < 3.4;
/** How far (x, z) is from the valley floors (the Slizza's, the Val Canale's, the lake's basin). */
const valleyD0 = (x: number, z: number) => Math.min(segD(VALLEY_S, x, z, 700), Math.max(0, Math.hypot(x + 130, z - 497) - 40));
// (a distance field: worked out once on a 5 m grid and read back between its corners — it is asked for millions of times)
// (and only when the map is played: maps/index.js loads every map)
const VG = 5, VN = 348, V0 = -870;
let VGRID: Float32Array | null = null;
function valleyD(x: number, z: number) {
  if (!VGRID) { VGRID = new Float32Array(VN * VN); for (let j = 0; j < VN; j++) for (let i = 0; i < VN; i++) VGRID[j * VN + i] = valleyD0(V0 + i * VG, V0 + j * VG); }
  const fx = Math.max(0, Math.min(VN - 1.001, (x - V0) / VG)), fz = Math.max(0, Math.min(VN - 1.001, (z - V0) / VG));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, w = fz - j, k = j * VN + i;
  return (VGRID[k] * (1 - u) + VGRID[k + 1] * u) * (1 - w) + (VGRID[k + VN] * (1 - u) + VGRID[k + VN + 1] * u) * w;
}

/** Side ridges (+) and ravines (−) [x, z, r, h], each block its own: the Lussari's shoulder, the Predil's gully, Malborghet's ravine, the Ofen's spur. */
const SIDES = [[-200, 420, 90, 34], [230, 180, 70, -30], [-200, -170, 70, -28], [210, -430, 90, 32], [-430, 180, 80, 26], [440, -170, 80, 24]];
const LIFT = 0.5, RIDGE = 50, PACT_K = 0.95, WEST = -0.12;
/** The high massifs [x, z, r, h], one in each block and none where another's mirror would be: the Lussari's western
 *  ridge over the Fella, the Mangart's shoulder behind the Predil, the Ofen's ridge on the north edge, the Nebria over Malborghet. */
const MASSIFS = [[-450, 170, 150, 120], [460, 480, 170, 135], [190, -500, 160, 85], [-470, -120, 150, 90]];
/** The mountains between the valleys (no shelves): the four blocks rise from the valley floors to crags on the far flanks. */
function slope(x: number, z: number) {
  const v = valleyD(x, z);
  const k = smoothstep(55, 430, v);
  let h = 1.3 + smoothstep(12, 60, v) * 2.2;                                                   // the valley floors and their gravel terraces
  const lift = (1 + LIFT * fbm(noise, x * 0.0035 + 11, z * 0.0035 - 7, 2)) * (1 + WEST * (2 * smoothstep(90, -90, x) - 1)) * (1 + (PACT_K - 1) * smoothstep(60, -60, z));
  // (the western blocks lower on both sides, the eastern higher — no block the mirror of another; the pact half's bulk evened to the nato half's)
  h += 165 * k ** 1.3 * lift;
  h += ridged(noise, x * 0.0085 + 3, z * 0.0085, 4) * RIDGE * k;                                    // crests and gullies
  for (const [sx, sz, r, sh] of SIDES) h += sh * k * smoothstep(r, 0, Math.hypot(x - sx, z - sz)) ** 1.5;
  for (const [mx, mz, r, mh] of MASSIFS) h += mh * k * smoothstep(r, 0, Math.hypot(x - mx, z - mz)) ** 1.2; // each block's own high massif
  h += fbm(noise, x * 0.03, z * 0.03, 2) * 1.4;
  return h;
}
// the shelves the four mountain points stand on: Lussari, Fort Predil, Fort Malborghet, the Ofen — the two over the
// Slizza (Lussari, Malborghet) at one height, the two on the roads' bank (Predil, the Ofen) at another: each pair the
// mean of its own ground, so neither side looks down on the other
const SHELVES = [[-340, 320, 36], [320, 290, 34], [-300, -250, 34], [370, -330, 36]];
const NAT = SHELVES.map(([x, z]) => slope(x, z));
const WEST_H = Math.max(70, (NAT[0] + NAT[2]) / 2), EAST_H = Math.min(100, (NAT[1] + NAT[3]) / 2); // (within reach of the graded roads)
const SHELF_H = [WEST_H, EAST_H, WEST_H, EAST_H];
/** Nearest point on a polyline: its distance and how far along (m), and the polyline's length. */
function along(poly: number[][], x: number, z: number) {
  let best = { d: Infinity, s: 0 }, run = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[i + 1], l = Math.hypot(bx - ax, bz - az);
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (l * l)));
    const d = Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t);
    if (d < best.d) best = { d, s: run + t * l };
    run += l;
  }
  return { ...best, L: run };
}
/** The mountainside's steepness (rise over run), on a 4 m grid worked out the first time it's asked (the surface colours ask it for every vertex). */
const GG = 4, GN = 426, G0 = -852;
let GGRID: Float32Array | null = null;
function gradAt(x: number, z: number) {
  if (!GGRID) {
    const H = new Float32Array(GN * GN);
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) H[j * GN + i] = slope(G0 + i * GG, G0 + j * GG);
    GGRID = new Float32Array(GN * GN);
    for (let j = 1; j < GN - 1; j++) for (let i = 1; i < GN - 1; i++) GGRID[j * GN + i] = Math.hypot(H[j * GN + i + 1] - H[j * GN + i - 1], H[(j + 1) * GN + i] - H[(j - 1) * GN + i]) / (2 * GG);
  }
  const fx = Math.max(0, Math.min(GN - 1.001, (x - G0) / GG)), fz = Math.max(0, Math.min(GN - 1.001, (z - G0) / GG));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, w = fz - j, k = j * GN + i;
  return (GGRID[k] * (1 - u) + GGRID[k + 1] * u) * (1 - w) + (GGRID[k + GN] * (1 - u) + GGRID[k + GN + 1] * u) * w;
}
/** The ground with its shelves (the mountain roads are cut into this). */
function ground(x: number, z: number) {
  let h = slope(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { h += (SHELF_H[i] - h) * smoothstep(r + 28, r, Math.hypot(x - sx, z - sz)); });
  return h;
}
const TRACK_TO = [1, 2, 0, 3];
const GRADE = 0.27, STEP = 4;
/** Each mountain road's height along it (every STEP m): it follows the ground as closely as a grade of GRADE allows,
 *  from the valley floor to its shelf — so it is a road cut along the hillside, not a trench driven through the ridges. */
const PROFILES = TRACKS.map((t, i) => {
  const pts: number[][] = [];                                                                   // (a point every STEP m along it)
  let carry = 0;
  for (let j = 0; j < t.length - 1; j++) {
    const [ax, az] = t[j], [bx, bz] = t[j + 1], l = Math.hypot(bx - ax, bz - az);
    for (let u = carry; u < l; u += STEP) pts.push([ax + ((bx - ax) * u) / l, az + ((bz - az) * u) / l]);
    carry = (carry - l) % STEP; if (carry < 0) carry += STEP;
  }
  pts.push(t[t.length - 1]);
  const n = pts.length - 1, d = GRADE * STEP;
  const p = pts.map(([x, z]) => ground(x, z));
  p[n] = SHELF_H[TRACK_TO[i]];
  const nat = p.slice();
  for (let round = 0; round < 3; round++) {
    for (let k = 1; k < n; k++) p[k] = Math.max(p[k - 1] - d, Math.min(p[k - 1] + d, round ? p[k] : nat[k]));
    for (let k = n - 1; k > 0; k--) p[k] = Math.max(p[k + 1] - d, Math.min(p[k + 1] + d, p[k]));
  }
  for (let round = 0; round < 3; round++) { const q = p.slice(); for (let k = 2; k < n - 1; k++) p[k] = (q[k - 2] + q[k - 1] + q[k] + q[k + 1] + q[k + 2]) / 5; } // (no kinks)
  return p;
});
const TRACK_BOX = TRACKS.map((t) => [Math.min(...t.map((p) => p[0])) - 14, Math.max(...t.map((p) => p[0])) + 14, Math.min(...t.map((p) => p[1])) - 14, Math.max(...t.map((p) => p[1])) + 14]);
function height(x: number, z: number) {
  let h = ground(x, z);
  TRACKS.forEach((t, i) => {
    const [x0, x1, z0, z1] = TRACK_BOX[i];
    if (x < x0 || x > x1 || z < z0 || z > z1) return;
    const a = along(t, x, z);
    if (a.d >= 12) return;
    const P = PROFILES[i], f = Math.min(P.length - 1.001, a.s / STEP), k = Math.floor(f);
    h += (P[k] + (P[k + 1] - P[k]) * (f - k) - h) * smoothstep(12, 5, a.d);
  });
  return river.carve(x, z, h);
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Predil road', 0, 470, 'centre'),
  P('B', 'Monte Lussari', -340, 320, 'west', { radius: 24 }),
  P('C', 'Raibl', 28, 300, 'centre', { radius: 26 }),
  P('D', 'Fort Predil', 320, 290, 'east', { radius: 24 }),
  P('E', 'Saifnitz', -290, 35, 'west', { radius: 26 }),
  P('F', 'Tarvis', -22, 18, 'centre', { radius: 32 }),
  P('G', 'Weissenfels', 330, -40, 'east', { radius: 26 }),
  P('H', 'Fort Malborghet', -300, -250, 'west', { radius: 24 }),
  P('I', 'Goggau', -35, -320, 'centre', { radius: 26 }),
  P('J', 'Monte Forno', 370, -330, 'east', { radius: 24 }),
  P('K', 'Arnoldstein road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'tarvis',
  name: 'Tarvis',
  description: 'The Tarvis gap, 1915–1917: Alpini against Austro-Hungarian mountain troops and Kaiserschützen where three valleys meet under the Julian Alps — the town and its railway junction on the Slizza, the Fella and the Raibl lake, the casemated forts of Predil and Malborghet in the valley walls, and the Lussari’s pilgrimage church over the spruce forest.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (narrow valleys between mountains and the town: no runway fits — the aircraft come in from the map edge, systems/Airfields.js)
  armies: { nato: ['it'], pact: ['ah'] }, // (the Italian Carnia Group’s Alpini against the Austro-Hungarian Kärnten front: maps/index.js armiesOn)
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1700,
  segments: 720,
  bounds: { x: 500, z: 560 },
  steep: 0.55, // (wheels and horses keep to the valleys and the graded roads; men climb anywhere)
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 1915,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191524, cell: 60, weights: [0.55, 0.15, 0.05, 0.25] as any }),

  theme: {
    // a clear high-summer day in the Julian Alps: hard light on the limestone, haze in the valleys, snow left on the high crags
    fogColor: 0xb4c0c8, fogDensity: 0.0011, skyTop: 0x4a74a8, skyHorizon: 0xc0d0dc, skyBottom: 0x6e7a70,
    sunColor: 0xfff0d8, sunIntensity: 1.9, sunDisk: 0.3, clouds: 0.35, cloudLight: 0xf2f4f4, cloudDark: 0x9aa4ac,
    sunDir: [0.4, 0.62, 0.35], hemiSky: 0xc0d2e2, hemiGround: 0x4a5236, hemiIntensity: 1.3, rimColor: 0xd8e2ea, rimIntensity: 0.25,
    terrain: {
      grass: '#4f6a34', grassAlt: '#46602e', dryGrass: '#8a8650', dirt: '#5e5040', rock: '#9a988e',
      pasture: '#5a7438', ploughed: '#6a5c48', stubble: '#9a9258', meadow: '#5e7a3a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x928876, 0.9];                                                   // the graded roads (limestone grit)
        if (y < 2.4 && wet(x, z) < 12) return [0xc2beae, 0.95];                                   // the Slizza's and the Fella's pale gravel
        if (y > 12) {
          const g = gradAt(x, z);
          if (y > 190 && g < 0.9) return [0xe4e8ea, 0.85];                                        // the last snow on the crags
          if (g > 0.8) return [0xa29f94, Math.min(1, (g - 0.8) * 3)];                               // limestone walls
          if (y > 140) return [0x7c7a56, 0.6];                                                     // the high pastures
          return [0x4c5e30, 0.8 * smoothstep(12, 26, y) * (1 - smoothstep(110, 140, y))];        // the forest floor and the meadows under the spruce (not bare rock)
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each side's line across its slopes over the Val Canale (wire in front, gaps at the roads and the river), MG posts at its forts and summits. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -470; x <= 470; x += 30) { const X = x * s; pts.push([X, s > 0 ? 150 + 14 * Math.sin(X * 0.019) : -150 - 12 * Math.sin(X * 0.023 + 1)]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 55 })) if (roadD(w.x, w.z) > 10 && wet(w.x, w.z) > 8 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 32)) works.push(w);
      for (const id of s > 0 ? ['B', 'D'] : ['H', 'J']) {             // (two nests on the enemy's side of each, off the road up)
        const [px, pz] = at(id);
        [[-12, -15], [12, -15], [-17, -4], [17, -4], [0, -18]].map(([dx, dz]) => [px + dx, pz + dz * s]).filter(([x, z]) => roadD(x, z) > 7).slice(0, 2)
          .forEach(([x, z]) => works.push({ kind: 'mgNest', x, z, yaw: s > 0 ? Math.PI : 0, faction: f }));
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const skip = (x: number, z: number) => wet(x, z) < 10 || roadD(x, z, 12) < 9 || steepAt(x, z) > 0.3;
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + r);

    // Tarvis: stone houses on both banks round the bridge and the square; the fortified parish church on the west bank, the station and the Pontebbana's sidings
    {
      const r = (props.rand = mulberry32(19151));
      const [fx, fz] = at('F');
      placed.push([-70, 58, 12], [-150, 63, 16]);
      for (let i = 0; i < 160 && placed.length < 46; i++) {
        const a = r() * Math.PI * 2, d = 24 + r() * 85, x = fx + Math.cos(a) * d * 1.25, z = fz + Math.sin(a) * d * 0.85;
        if (skip(x, z) || Math.hypot(x - fx, z - fz) < 20 || !free(x, z, 7)) continue;
        placed.push([x, z, 7]);
        props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + r() * 0.2, width: 7 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.35 ? 3 : 2, damaged: 0.15 });
      }
      props.church({ x: -70, z: 58, yaw: Math.PI });
      for (const [x, z, yaw, l] of [[-70, 72, 0, 26], [-84, 56, Math.PI / 2, 30], [-56, 56, Math.PI / 2, 30]]) props.lowWall({ x, z, yaw, length: l, height: 2.2, color: 0x9a9284 }); // (the church's defensive wall)
      props.hall({ x: -150, z: 63, yaw: 0, width: 22, depth: 9, height: 6, color: 0xb0a080, roof: 0x5a3a2e, door: 4, name: 'Tarvis station' });
      props.sandbagRing({ x: -2, z: 30, radius: 4, toward: -1 });
      props.sandbagRing({ x: 30, z: -10, radius: 4, toward: 1 });
    }
    // the Pontebbana up the Val Canale on the Fella's south bank into Tarvis station, wagons in the sidings
    {
      for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
      props.rails({ x0: SIDING[0][0], z0: SIDING[0][1], x1: SIDING[1][0], z1: SIDING[1][1] });
      for (const [x, kind] of [[-182, 'box'], [-169, 'box'], [-142, 'open']] as const) props.wagon({ x, z: 86 - (x + 200) * 6 / 90, yaw: Math.atan2(90, -6), kind });
    }
    // the villages in the valleys: Raibl (the lead mine's headframe), Goggau, Saifnitz, Weissenfels; the hamlets by the bases
    for (const id of ['C', 'I', 'E', 'G']) { const [x, z] = at(id); farmVillage(props, x, z, 8, 19152 + Math.round(x * 3 + z * 7), (a, b) => skip(a, b) || !free(a, b, 6), 1.1); }
    props.headframe({ x: 72, z: 334, yaw: 0.3, height: 22 });
    placed.push([72, 334, 8], [82, 300, 12]);
    props.hall({ x: 82, z: 300, yaw: Math.PI / 2, width: 16, depth: 9, height: 6, color: 0x8a7e6c, roof: 0x4c4c4a, door: 4, name: 'Raibl mine works' });
    props.church({ x: 56, z: -282, yaw: 0.1 });

    // the forts: casemated batteries in the valley wall, a blockhouse, a stone glacis wall in front — shell-scarred
    const fort = (x: number, z: number, yaw: number, name: string, seed: number) => {
      props.rand = mulberry32(seed);
      props.hall({ x, z, yaw, width: 24, depth: 10, height: 4.6, color: 0x8a867a, roof: 0x5c5e56, door: 4, name });
      const g = terrain.heightAt(x, z);
      for (const side of [-1, 1]) for (let i = -2; i <= 2; i++) { const [ex, ez] = PropBuilder.local(x, z, yaw, i * 4.6, side * 5.2); props.box('metal', ex, g + 2.6, ez, 1.5, 0.8, 0.3, yaw, 0x18191a); } // the embrasures
      const [tx, tz] = PropBuilder.local(x, z, yaw, 15, -2);
      props.box('stone', tx, terrain.heightAt(tx, tz) + 4, tz, 7, 8, 7, yaw, 0x86827a);                                // the blockhouse
      props.box('stone', tx, terrain.heightAt(tx, tz) + 8.2, tz, 7.6, 0.5, 7.6, yaw, 0x6a6862);
      cover.addBox({ x: tx, z: tz, yaw, length: 7, thickness: 7, height: 8 });
      const [wx, wz] = PropBuilder.local(x, z, yaw, -2, 13);
      props.wall({ x: wx, z: wz, yaw, length: 30, height: 1.6, thickness: 0.9 });
      for (let k = 0; k < 10; k++) { const [rx, rz] = PropBuilder.local(x, z, yaw, (props.rand() - 0.5) * 34, 7 + props.rand() * 8); props.rubble(rx, rz, 0.3 + props.rand() * 0.5); }
      placed.push([x, z, 20], [tx, tz, 8]);
    };
    fort(352, 302, Math.PI, 'Fort Predil', 19153);
    fort(-330, -262, 0, 'Fort Malborghet', 19154);
    // the Lussari: the pilgrimage church on its summit and the pilgrims' houses
    props.church({ x: -366, z: 344, yaw: Math.PI - 0.6 });
    props.rand = mulberry32(19155);
    for (const [x, z] of [[-322, 350], [-388, 316], [-352, 362]]) if (roadD(x, z) > 8) props.house({ x, z, yaw: props.rand() * 3, width: 8, depth: 6, height: 3 });
    // the Ofen: the observation hut and the three-country stone on the top
    props.house({ x: 392, z: -352, yaw: 0.4, width: 7, depth: 5, height: 2.6 });
    props.column({ x: 384, z: -312, radius: 0.5, height: 1.4 });
    placed.push([-366, 344, 14], [392, -352, 6]);
    // the ropeways: the pilgrims' cableway up the Lussari from Saifnitz's side, the Austrian military ropeway up the Ofen from Weissenfels
    const ropeway = (a: number[], b: number[], n: number) => {
      let prev: any = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, g = terrain.heightAt(x, z);
        if (wet(x, z) < 4 || roadD(x, z) < 5) continue;
        const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]), top = { x, y: g + 9, z };
        props.box('plain', x, g + 4.5, z, 0.45, 9, 0.45, yaw, 0x4e3e2c);
        props.box('plain', x, g + 9, z, 3, 0.3, 0.3, yaw + Math.PI / 2, 0x4e3e2c);
        if (prev) props.beam('metal', prev, top, 0.06, 0x2a2c2c);
        prev = top;
      }
      for (const [x, z] of [a, b]) props.house({ x: x + 4, z: z + 4, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), width: 6, depth: 5, height: 3 });
    };
    ropeway([-250, 110], [-352, 296], 7);
    ropeway([270, -110], [356, -312], 7);
    // mountain huts and the summer dairies on the slopes; the sawmills' log piles in the valleys
    props.rand = mulberry32(19156);
    for (const [x, z] of [[-200, 210], [-420, 420], [180, 420], [430, 200], [-180, -420], [-430, -150], [210, -150], [440, -440], [-120, 470], [120, -470]]) if (!skip(x, z) && free(x, z, 8)) { props.house({ x, z, yaw: props.rand() * 3, width: 7, depth: 5, height: 2.6 }); placed.push([x, z, 8]); }
    for (const [x, z] of [[-230, -26], [-400, -30], [140, 30], [260, 18], [-30, 380], [-80, -380]]) if (!skip(x, z) && free(x, z, 6)) { props.logPile({ x, z, yaw: 0.3, length: 8 }); props.logPile({ x: x + 6, z: z + 5, yaw: 0.1, length: 7 }); }
    // rocks and old sangars over the slopes; hay and field walls in the valley meadows
    const r = mulberry32(19157);
    for (let i = 0; i < 560; i++) {
      const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 540, big = r();
      if (nearPoint(x, z, 30) || roadD(x, z, 10) < 6 || wet(x, z) < 6 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || !free(x, z, 3)) continue;
      if (big < 0.72) props.boulder({ x, z, radius: 1 + r() * 2 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 5, height: 1.2, color: 0x9e9a90 });
    }
    for (let i = 0, n = 0; i < 4000 && n < 40; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 540;
      if (valleyD(x, z) > 50 || skip(x, z) || nearPoint(x, z, 40) || !free(x, z, 10) || Math.hypot(x, Math.abs(z) - BASE_Z) < 50) continue;
      n++;
      placed.push([x, z, 10]);
      buildSite(props, { kind: ['hay', 'fieldwall', 'farm', 'fieldwall'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      ...placed.map(([x, z, pr]) => ({ x, z, r: pr + 3 })),
      { test: (x: number, z: number) => wet(x, z) < 11 || roadD(x, z, 8) < 6 || segDist(RAIL, x, z) < 4 || segDist(SIDING, x, z) < 4 }];
    // the spruce forest up the four blocks (as much on each side), larch and beech lower, the valley meadows open; bare above the treeline
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.006 + 40, z * 0.006, 3);
    const north = (x: number, z: number) => z > 0;
    const tP = evenThreshold(wood0, -0.2, north);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 11000, broadleaf: 0.12, autumn: 0, maxY: 175,
      forest: (x: number, z: number) => {
        const v = valleyD(x, z), w = wood0(x, z), t = z > 0 ? -0.2 : tP;
        if (v < 70) return v > 40 && w > t + 0.3 ? 0.35 : 0;
        return w > t ? 0.9 : 0.2;
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
