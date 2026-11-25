// The Montagne de Reims, July 1918 (1918 only; the Western Front; the big field, 1.0 × 1.12 km). The Second Battle of
// the Marne: on 15 July Ludendorff’s Friedensturm falls on both sides of Reims. East of the city Gouraud’s Fourth Army
// meets it with the elastic defence — a thin, sacrificial outpost line that only gives the alarm and breaks the
// assault, the main line of resistance two kilometres behind it, out of reach of the opening bombardment. South-west of
// the city the Germans cross the Marne at Dormans and push up the Ardre valley against the Italian II Corps at Bligny
// and the French on the wooded plateau of the Montagne de Reims; they are held, and on 18 July the French counter-stroke
// begins, rolling them back through Ville-en-Tardenois to the Vesle.
// On the map: the Montagne de Reims across the middle and east — a high wooded plateau (the Bois de Courton at its west
// end over the Ardre, Mont Sinaï its summit to the east), its chalk slopes planted in rows of vines down both faces;
// the Ardre valley down the west with Bligny (south, the Italians’) and Ville-en-Tardenois (north, the Germans’) on its
// east bank, and the Marne down the west flank with Dormans and its two bridges on the far bank. French (south, +z):
// Bligny, Nanteuil-la-Forêt, Hautvillers among the vines over Épernay. German (north): Ville-en-Tardenois, Sermiers,
// Rilly-la-Montagne. Reims and its cathedral stand in the north-east corner, outside the field. Each side holds a 1918
// defence in depth: a lightly wired outpost line at the plateau’s edge, communication trenches back through the vines,
// and the main line with two belts of wire half-way down its own slope.
// Not mirrored but fair: the plateau — the decisive ground — is no man’s land, its crest along the middle, both of its
// points (Bois de Courton, Mont Sinaï) on the middle line; each side has the same slope of vineyards below it, its two
// lines at the same depths, a village on the Ardre with its own bridge (Bligny; Ville-en-Tardenois), its own ford over
// the Ardre and its own bridge over the Marne into Dormans, a village in the middle and one among the vines on the east
// road, the same wooded area behind it (each its own shapes) and an airfield behind its centre.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite, shellField, trenchLine } from './common.js';
import { vegetation } from './common2027.js';
import { segDist, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const SEED = 1918_07;
const noise = createNoise2D(SEED);

// ---- the Marne down the west flank (Dormans on its far bank) and the Ardre, a brook in its own valley, east of it
const river = createRiver({
  paths: [
    [[-372, -720], [-392, -470], [-380, -260], [-388, -120], [-386, 130], [-398, 300], [-382, 520], [-394, 720]],
    [[-262, -720, 3.5], [-248, -430, 3.5], [-262, -210, 3.5], [-250, 0, 3.5], [-258, 200, 3.5], [-248, 430, 3.5], [-260, 720, 3.5]],
  ],
  halfWidth: 14, level: 0, depth: 2.6, valley: 58,
  crossings: [
    { name: 'Dormans bridge', x: -386, z: 50, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Dormans railway bridge', x: -388, z: -55, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Bligny bridge', x: -254, z: 300, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Ville-en-Tardenois bridge', x: -254, z: -300, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Marfaux ford', x: -252, z: 60, kind: 'ford', width: 14, depth: 0.5, channel: 1 },
    { name: 'Chaumuzy ford', x: -251, z: -66, kind: 'ford', width: 14, depth: 0.5, channel: 1 },
  ],
});
const wet = (x: number, z: number, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

// ---- the points
const P = { B: [-200, 300], C: [20, 300], D: [270, 300], E: [-455, 0], F: [-50, 0], G: [305, -6], H: [-200, -300], I: [20, -305], J: [270, -290] };
const points: ControlPointDef[] = [
  { id: 'A', name: 'Épernay road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bligny', x: P.B[0], z: P.B[1], owner: null, sector: 'west' },
  { id: 'C', name: 'Nanteuil-la-Forêt', x: P.C[0], z: P.C[1], owner: null, sector: 'centre' },
  { id: 'D', name: 'Hautvillers', x: P.D[0], z: P.D[1], owner: null, sector: 'east' },
  { id: 'E', name: 'Dormans', x: P.E[0], z: P.E[1], owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Bois de Courton', x: P.F[0], z: P.F[1], owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Mont Sinaï', x: P.G[0], z: P.G[1], owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Ville-en-Tardenois', x: P.H[0], z: P.H[1], owner: null, sector: 'west' },
  { id: 'I', name: 'Sermiers', x: P.I[0], z: P.I[1], owner: null, sector: 'centre' },
  { id: 'J', name: 'Rilly-la-Montagne', x: P.J[0], z: P.J[1], owner: null, sector: 'east' },
  { id: 'K', name: 'Fismes road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the roads: the Épernay–Reims road over the Montagne, the forest road through the Bois de Courton, the Ardre valley
// road, the lanes over the Ardre to the Dormans bridges, the Marne bank road, the lane between the waters, the cross lanes
const ROADS = [
  [[330, 580], [330, 440], [300, 370], P.D, [300, 200], [315, 100], P.G, [300, -110], [285, -200], P.J, [300, -370], [330, -440], [330, -580]],
  [[0, 580], [0, 470], [-20, 390], P.C, [0, 200], [-30, 120], [-40, 60], P.F, [-30, -70], [0, -160], [15, -230], P.I, [0, -400], [0, -470], [0, -580]],
  [[-180, 580], [-190, 450], P.B, [-215, 200], [-225, 60], [-220, 0], [-215, -66], [-225, -200], P.H, [-185, -450], [-180, -580]],
  [[-225, 60], [-252, 60], [-330, 52], [-386, 50], [-430, 40], P.E],
  [[-215, -66], [-251, -66], [-330, -58], [-388, -55], [-430, -40], P.E],
  [[-460, -580], [-462, -200], P.E, [-466, 200], [-470, 580]],
  [[-325, 580], [-322, 300], [-318, 56], [-320, -60], [-322, -300], [-325, -580]],
  [P.B, [-254, 300], [-322, 300]], [P.H, [-254, -300], [-322, -300]],
  [P.B, [-100, 280], P.C], [P.H, [-90, -285], P.I], [P.C, [150, 250], P.D], [P.I, [140, -255], P.J],
  [[-220, 0], [-140, 10], P.F, [80, 20], [180, -15], P.G, [420, 10], [560, 0]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

// ---- the Montagne: the crest’s line, the escarpment over the Ardre, the plateau and its slopes
const zw = (x: number) => 10 * Math.sin(x * 0.007 + 1.2) + 5 * Math.sin(x * 0.019);
const plateauK = (x: number) => smoothstep(-190, -100, x);
const crestD = (x: number, z: number) => Math.abs(z - zw(x));
// the rises and combes [x, z, rx, rz, h]: Mont Sinaï, the Bois de Courton’s knoll; a combe down each face (its own place)
const RISES = [[305, 0, 130, 120, 5], [-50, 0, 100, 90, 2.5], [130, 230, 45, 75, -5], [-10, -235, 45, 75, -5], [-330, 420, 70, 90, 3], [-320, -410, 70, 90, 3]];
// each side's airfield behind its centre (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: 160, z: 420, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 160, z: -420, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));
// Reims, out of the field in the north-east corner
const REIMS = { x: 660, z: -690 };
const reimsK = (x: number, z: number) => smoothstep(520, 580, x) * smoothstep(-590, -650, z);

const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 4 + fbm(noise, x * 0.003 + (z > 0 ? 0 : 31), z * 0.003, 4) * 3 + fbm(noise, x * 0.017 + 7, z * 0.017, 2) * 0.5;
  const d = crestD(x, z);
  h += 17 * plateauK(x) * (0.75 * smoothstep(270, 150, d) + 0.25 * smoothstep(330, 200, d));
  for (const [hx, hz, rx, rz, hh] of RISES) h += hh * Math.max(0, 1 - Math.hypot((x - hx) / rx, (z - hz) / rz)) ** 1.4;
  h += smoothstep(480, 620, Math.abs(x)) * 14 + smoothstep(545, 680, Math.abs(z)) * 12;   // (the rims beyond the edges)
  for (const p of points) h += (h * 0.6 + 1.8 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * (p.id === 'F' || p.id === 'G' ? 0.12 : 0.45);
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (4 - h) * smoothstep(30, 6, airD(x, z));
  h += (5 - h) * reimsK(x, z);
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// ---- the lines: each side's outpost line at the plateau's edge and its main line half-way down its own slope, each its own wander
const LINE_Z = { outpost: 125, main: 228 };
function linePts(z: number, f: 'nato' | 'pact', seed: number) {
  const r = mulberry32(f === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
  const s = f === 'nato' ? 1 : -1;
  for (let x = -400; x <= 480; x += 40) pts.push([x, s * (z + (r() - 0.5) * 18 + 12 * Math.sin(x * 0.009 + ph)) + zw(x)]);
  return f === 'nato' ? pts : pts.reverse();   // (trenchLine faces the right of the way along: nato's walk west to east facing -z, pact's east to west facing +z)
}
const LINES = {
  nato: { outpost: linePts(LINE_Z.outpost, 'nato', 11), main: linePts(LINE_Z.main, 'nato', 12) },
  pact: { outpost: linePts(LINE_Z.outpost, 'pact', 13), main: linePts(LINE_Z.main, 'pact', 14) },
};
// the communication trenches back from the outpost line to the main line, every 150 m or so (each side its own x)
const COMMS = {
  nato: [-150, 10, 160, 330, 450].map((x, i) => [[x, LINE_Z.main + zw(x) - 8], [x + 14 * (i % 2 ? 1 : -1), (LINE_Z.main + LINE_Z.outpost) / 2 + zw(x)], [x, LINE_Z.outpost + zw(x) + 8]]),
  pact: [-120, 40, 190, 300, 430].map((x, i) => [[x, -LINE_Z.main + zw(x) + 8], [x + 14 * (i % 2 ? -1 : 1), -(LINE_Z.main + LINE_Z.outpost) / 2 + zw(x)], [x, -LINE_Z.outpost + zw(x) - 8]]),
};
const ALL_LINES = [LINES.nato.outpost, LINES.nato.main, LINES.pact.outpost, LINES.pact.main, ...COMMS.nato, ...COMMS.pact];
const trenchD = gridCache((x: number, z: number) => { const d = crestD(x, z); return d < 85 || d > 290 ? 99 : Math.min(...ALL_LINES.map((l) => segDist(l, x, z))); }, { x: 520, z: 580 }, 3);

// ---- the vineyards: parcels of vines down both faces of the Montagne, rows running down the slope, chalk paths between
const vineK = gridCache((x: number, z: number) => {
  const d = crestD(x, z);
  if (d < 150 || d > 285 || plateauK(x) < 0.6 || Math.abs(x) > 492 || Math.abs(z) > 300) return 0;
  const cx = (x + 1000) / 46, cz = (z + 1000) / 34, i = Math.floor(cx), j = Math.floor(cz);
  if (mulberry32(i * 7919 + j * 104729 + (z > 0 ? 0 : 17))() > 0.72) return 0;
  if (Math.min(cx - i, 1 - (cx - i)) * 46 < 2 || Math.min(cz - j, 1 - (cz - j)) * 34 < 1.5) return 0;   // (the paths between the parcels)
  if (roadD(x, z) < 6 || trenchD(x, z) < 34 || wet(x, z, 10) || airD(x, z) < 20 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 38)) return 0;
  return 1;
}, { x: 520, z: 580 }, 2);

// ---- the woods: the Montagne's forest over the plateau (its ragged edge), named woods behind each side, copses of each half's own shapes
const forestK = (x: number, z: number) => plateauK(x) * smoothstep(170, 135, crestD(x, z) + fbm(noise, x * 0.02 + 9, z * 0.02, 2) * 30);
const NAMED = [[-120, 420, 58], [430, 400, 66], [-110, -430, 60], [430, -410, 64]];
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const T_N = 0.45, T_P = evenThreshold(wn, T_N, (x, z) => z > 0);
const woodField = gridCache((x: number, z: number) => {
  if (wet(x, z, 4) || airD(x, z) < 20) return 0;
  let k = forestK(x, z);
  for (const [wx, wz, r] of NAMED) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz)));
  if (wn(x, z) > (z > 0 ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 60 && vineK(x, z) === 0 && crestD(x, z) > 150) k = Math.max(k, 0.7);
  return k;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1re section, 4e Zouaves' }];

export default {
  id: 'montagne-de-reims',
  name: 'Montagne de Reims',
  description: 'July 1918, the Second Battle of the Marne: the Friedensturm breaks on the wooded plateau of the Montagne de Reims, held by the French and the Italians at Bligny, before the French counter-stroke. Chalk slopes in rows of vines, the Ardre valley and the Marne at Dormans on the west, an outpost line and a main line behind it on each side.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['fr', 'it'], pact: ['de', 'st'] }, // (Berthelot’s Fifth Army with the Italian II Corps at Bligny, against von Boehn’s Seventh and Mudra’s First; ‘it’ is an Italy-front army: on this map the French field the side)
  sides: { nato: 'France', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'clear' },     // (the Friedensturm went in at first light on 15 July, a hot summer)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 76, weights: [0.16, 0.12, 0.54, 0.18] as any }),   // (wheat ripening in the Ardre valley and below the slopes)
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a hot July dawn over Champagne
    fogColor: 0xbcb6a8, fogDensity: 0.0012, skyTop: 0x6a8cae, skyHorizon: 0xdcd6c6, skyBottom: 0x8e8a80,
    sunColor: 0xffe2bc, sunIntensity: 1.8, sunDisk: 0.3, clouds: 0.25, cloudLight: 0xf4ece0, cloudDark: 0x9ca2a6,
    sunDir: [0.6, 0.45, -0.5], hemiSky: 0xc8d2da, hemiGround: 0x6a6040, hemiIntensity: 1.25, rimColor: 0xe0d4c0, rimIntensity: 0.3,
    terrain: {
      grass: '#5c6a36', grassAlt: '#526031', dryGrass: '#a49656', dirt: '#7a6c54', rock: '#a8a294',
      pasture: '#5c6a38', ploughed: '#8e8268', stubble: '#c2aa5e', meadow: '#6a7440',
      farmX: [460, 600], farmZ: [520, 640], roads: [], roadZ: 560,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [0xb0a68a, 0.85];                                       // white chalk roads
        if (rd < 5.5) return [0x9a907a, 0.3];
        if (reimsK(x, z) > 0.5) return [0x8a8070, 0.6];                                // the city’s streets and yards
        if (y < 1.6 && wet(x, z, 10)) return [0x6e6450, 0.7];                          // the muddy banks
        if (vineK(x, z) > 0) return [0xb8ac8c, 0.8];                                   // the chalk between the rows of vines
        if (forestK(x, z) > 0.6) return [0x4a4a34, 0.6];                               // leaf litter under the Montagne’s beeches
        if (trenchD(x, z) < 6) return [0xa89e84, 0.6];                                 // the chalk thrown up from the trenches
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-180, 0, 330] }, pact: { x: 0, z: -BASE_Z, entries: [-180, 0, 330] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Grenadier-Regiment 89' })),
  },

  /** Each side’s outpost line (one belt of wire), communication trenches, main line (two belts, machine guns); the outpost zone shelled. */
  battlefield(game: any) {
    const works: any[] = [];
    const ok = (w: any) => !wet(w.x, w.z, 8) && roadD(w.x, w.z) > 7 && w.x > -400 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 28);
    for (const f of ['nato', 'pact'] as const) {
      const L = LINES[f], yaw = f === 'nato' ? Math.PI : 0, s = f === 'nato' ? 1 : -1;
      works.push(...trenchLine(L.outpost, f, { zig: 1.2, wireAt: 18, belts: 1, gapEvery: 50 }).filter(ok));
      works.push(...trenchLine(L.main, f, { zig: 1.5, wireAt: 22, belts: 2, gapEvery: 80 }).filter(ok));
      for (const c of COMMS[f]) works.push(...trenchLine(c, f, { zig: 1.8, belts: 0 }).filter(ok));
      const r = mulberry32(f === 'nato' ? 71 : 73);
      for (let x = -360 + r() * 40; x < 480; x += 110 + r() * 30) {
        const z = s * LINE_Z.main + zw(x), w = { kind: 'mgNest', x, z: z - 5 * s, yaw, faction: f };
        if (ok(w)) works.push(w);
      }
    }
    // the shelling: the outpost zone hardest (the bombardment fell on the empty outpost line), the main lines lighter, each half its own
    const dens = (x: number, z: number) => { const d = crestD(x, z); return 0.08 + 0.9 * Math.exp(-(((d - 125) / 40) ** 2)) + 0.35 * Math.exp(-(((d - 228) / 30) ** 2)) + (d < 90 ? 0.25 : 0); };
    const blasts = [...shellField(1907, BOUNDS, dens).filter((b: number[]) => b[1] >= 0), ...shellField(1908, BOUNDS, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => !wet(b[0], b[1], 10) && roadD(b[0], b[1]) > 5 && vineK(b[0], b[1]) === 0 && trenchD(b[0], b[1]) > 5 && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 25));
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (Math.abs(b.z) < 330 && b.x > -400 ? 0.3 : 0.1)).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => wet(x, z, 10) || roadD(x, z) < 9 || trenchD(x, z) < 14 || airD(x, z) < 25 || vineK(x, z) > 0;

    // the villages: farmsteads and walled gardens round their lanes, a church in each
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J']) {
      const p = points.find((q) => q.id === id)!;
      farmVillage(props, p.x, p.z, 8, 1918 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.25);
    }
    props.rand = mulberry32(1941);
    for (const [x, z, yaw] of [[P.B[0] + 32, P.B[1] + 26, 0.2], [P.C[0] + 34, P.C[1] + 24, 0.3], [P.D[0] - 34, P.D[1] + 26, -0.3], [P.H[0] + 30, P.H[1] - 28, Math.PI], [P.I[0] - 30, P.I[1] - 30, Math.PI + 0.2], [P.J[0] + 32, P.J[1] - 24, Math.PI - 0.4]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }
    // Hautvillers’ abbey wall (Dom Pérignon’s)
    props.lowWall({ x: P.D[0] + 30, z: P.D[1] + 34, yaw: 0, length: 30, height: 2.4, color: 0xb0a690 });
    // Mont Sinaï: the observers’ post on the summit, sandbagged
    props.sandbagRing({ x: P.G[0] + 18, z: P.G[1] + 14, radius: 4, toward: 1 });
    props.sandbagRing({ x: P.G[0] - 16, z: P.G[1] - 16, radius: 4, toward: -1 });

    // Dormans on the far bank of the Marne: stone houses along its streets, the church, the château’s park wall
    props.rand = mulberry32(1942);
    for (let z = -170; z <= 170; z += 13) for (let x = -496; x <= -414; x += 15) {
      const hx = x + (props.rand() - 0.5) * 4, hz = z + (props.rand() - 0.5) * 4;
      if (wet(hx, hz, 12) || roadD(hx, hz) < 7 || nearPoint(hx, hz, 16) || props.rand() < 0.2) continue;
      props.townHouse({ x: hx, z: hz, yaw: Math.PI / 2 * (props.rand() < 0.5 ? 1 : -1), width: 7 + props.rand() * 3, depth: 8, storeys: props.rand() < 0.6 ? 2 : 1, name: 'house', damaged: 0.2 });
    }
    props.church({ x: -480, z: -70, yaw: -Math.PI / 2 });
    for (const [x, z, yaw, len] of [[-482, 120, 0, 28], [-468, 140, Math.PI / 2, 22]]) props.lowWall({ x, z, yaw, length: len, height: 2.6, color: 0x9a927e });
    for (const z of [50, -55]) props.sandbagRing({ x: -368, z: z + 14 * Math.sign(z), radius: 4, toward: -1 });   // the machine-gunners at the bridgeheads

    // the vines: rows down the slope, a box per few metres tilted to the ground
    props.rand = mulberry32(1943);
    for (let x = -140; x <= 492; x += 2.6) for (let z = -300; z <= 300; z += 4.4) {
      if (Math.abs(z) < 120 || vineK(x, z) === 0 || vineK(x, z - 2) === 0 || vineK(x, z + 2) === 0) continue;
      const h0 = terrain.heightAt(x, z - 2), h1 = terrain.heightAt(x, z + 2);
      props.box('plain', x, (h0 + h1) / 2 + 0.5, z, 0.38, 0.9, 3.9, 0, props.rand() < 0.5 ? 0x4a5a2a : 0x52602e, -Math.atan2(h1 - h0, 4));
    }

    // farmsteads, field walls and hay over the valley and below the slopes (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'rocks'];
    for (let tries = 0, n = 0; n < 100 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (x < -400 || woodField(x, z) > 0.3 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }

    // Reims in the north-east corner, out of the field: its houses and the cathedral, west front and its two towers
    props.rand = mulberry32(1944);
    const C = REIMS, catD = (x: number, z: number) => Math.max(Math.abs(x - C.x) - 50, Math.abs(z - C.z) - 34);
    for (let z = -790; z <= -600; z += 14) for (let x = 560; x <= 790; x += 14) {
      const hx = x + (props.rand() - 0.5) * 4, hz = z + (props.rand() - 0.5) * 4;
      if (reimsK(hx, hz) < 0.6 || catD(hx, hz) < 10 || props.rand() < 0.12) continue;
      props.townHouse({ x: hx, z: hz, yaw: Math.PI / 2 * (props.rand() < 0.5 ? 1 : -1), width: 8 + props.rand() * 3, depth: 9, storeys: 2 + (props.rand() < 0.4 ? 1 : 0), name: 'house', damaged: 0.3 });
    }
    const g = terrain.heightAt(C.x, C.z), stone = 0xb4aa94;
    props.box('stone', C.x, g + 12, C.z, 72, 24, 16, 0, stone);                      // the nave
    props.box('plain', C.x, g + 27, C.z, 72, 6, 11, 0, 0x4a4c50);                     // its roof (burnt by the shelling of 1914, patched)
    props.box('stone', C.x + 10, g + 12, C.z, 14, 24, 44, 0, stone);                  // the transept
    props.box('stone', C.x + 40, g + 10, C.z, 12, 20, 14, 0, stone);                  // the apse
    for (const s of [-1, 1]) {                                                         // the west towers, open belfries
      props.box('stone', C.x - 38, g + 22, C.z + s * 10, 8, 44, 8, 0, stone);
      props.box('metal', C.x - 38, g + 38, C.z + s * 10, 8.1, 5, 2, 0, 0x1e2226);
      props.box('stone', C.x - 38, g + 46, C.z + s * 10, 6, 4, 6, 0, stone);
    }
    props.box('stone', C.x - 38, g + 16, C.z, 7, 32, 12, 0, stone);                   // the west front between them, its rose window
    props.box('metal', C.x - 41.6, g + 22, C.z, 0.3, 6, 6, 0, 0x2a2a34);

    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 4.5 || airD(x, z) < 12 || vineK(x, z) > 0 || reimsK(x, z) > 0.3 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 7000, hedges: 1500, autumn: 0.05, broadleaf: 0.85,
      noHedge: (x: number, z: number) => x < -400 || crestD(x, z) < 290,
      forest: (x: number, z: number) => {
        if (wet(x, z, 4)) return -1;
        if (trenchD(x, z) < 12) return 0.05;
        const k = woodField(x, z);
        if (k > 0.5) return 0.9;
        if (river.project(x, z).d < 34) return 0.25;                          // poplars along the Marne and the Ardre
        return 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
