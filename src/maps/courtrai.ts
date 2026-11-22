// Courtrai, October 1918 (1918 only; the Western Front; the big field, 1.0 × 1.12 km). The Hundred Days: on 14 October
// the Flanders Army Group — Plumer’s Second Army, the Belgians and Degoutte’s French — breaks out of the Ypres salient
// again, and by the 16th the British stand on the Lys in front of Courtrai. The Germans fall back by bounds toward the
// Scheldt, leaving machine-gun rearguards in the farms and behind hasty wire along the banks; the Lys is forced on the
// 19th–20th at Harelbeke and below Courtrai, and the town is entered as the Germans go. No deep trench system here:
// the fighting is mobile, over unspoilt Flemish farmland.
// On the map: the Lys across the field from the west edge (Wevelgem) through Courtrai in the middle to the east edge
// (Harelbeke), a canalised river with five bridges — the Wevelgem and Harelbeke bridges out on the flanks, the Broel
// bridge in the town between the two Broel towers, the railway bridge and the Leie bridge either side of it. Courtrai
// stands on both banks: the Grote Markt with its belfry and St Martin’s on the south bank, the Onze-Lieve-Vrouwekerk on
// the north bank. A canal leaves the Lys on each side of the town (the Bossuit canal to the south-east, the Roeselare
// canal to the north-west) with two bridges each. The railway runs through the town over its own bridge. Flat farmland:
// beet and stubble fields, red-brick farms, tall poplar rows along the roads and canals, villages round their churches.
// British (south, +z): Wevelgem, Marke, Zwevegem; German (north): Heule, Kuurne, Harelbeke; Bissegem (west, on the
// north bank) and Deerlijk (east, on the south bank) between. Each side holds a hasty line along its own bank — rifle
// pits, one belt of wire, machine-gun posts — and sandbagged posts at the bridgeheads.
// Not mirrored but fair: the Lys is the front, and it runs diagonally so each side has a bank of the same size; Courtrai
// and its Broel bridge are in the middle on the river; each side has its own flank bridge (Wevelgem, Harelbeke) at the
// same distance from its base, its own town bridge (railway; Leie), its own canal with two bridges and a pocket between
// the canal and the river holding a point (Bissegem; Deerlijk) the other side reaches over its flank bridge. The
// villages stand point for point at the same distances; the ground is each half’s own noise, rises, copses and meanders.
import * as THREE from 'three';
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
const SEED = 1918_10;
const noise = createNoise2D(SEED);

// ---- the Lys: diagonal across the field (west edge south of the middle, east edge north of it), its own meanders
const W0 = 14 * Math.sin(0.6) + 6 * Math.sin(1.1);
const RZ = (x: number) => -0.6 * x + 14 * Math.sin(0.011 * x + 0.6) + 6 * Math.sin(0.029 * x + 1.1) - W0;
const LYS: number[][] = [];
for (let x = -780; x <= 780; x += 30) LYS.push([x, RZ(x)]);
const N = [0.51, 0.857];   // across the Lys, toward the British bank
const at = (x: number, k = 0) => [x + N[0] * k, RZ(x) + N[1] * k];
// the canals, each leaving the Lys on its own side of the town: [mouth x, direction]
const CAN = { nato: { x: 190, d: [0.76, 0.65] }, pact: { x: -190, d: [-0.76, -0.65] } };
const canalPt = (f: 'nato' | 'pact', s: number) => { const c = CAN[f]; return [c.x + c.d[0] * 448 * s, RZ(c.x) + c.d[1] * 448 * s]; };
const BR = { W: at(-330), H: at(330), B: [0, 0], R: at(-110), L: at(110) };
const CB = { n1: canalPt('nato', 0.12), n2: canalPt('nato', 0.48), p1: canalPt('pact', 0.12), p2: canalPt('pact', 0.48) };

const river = createRiver({
  paths: [LYS, [[CAN.nato.x, RZ(CAN.nato.x), 6], ...[0.25, 0.5, 0.75, 1.05].map((s) => [...canalPt('nato', s), 6])], [[CAN.pact.x, RZ(CAN.pact.x), 6], ...[0.25, 0.5, 0.75, 1.05].map((s) => [...canalPt('pact', s), 6])]],
  halfWidth: 13, level: 0, depth: 2.6, valley: 50,
  crossings: [
    { name: 'Broel bridge', x: 0, z: 0, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Wevelgem bridge', x: BR.W[0], z: BR.W[1], kind: 'bridge', width: 8, channel: 0 },
    { name: 'Harelbeke bridge', x: BR.H[0], z: BR.H[1], kind: 'bridge', width: 8, channel: 0 },
    { name: 'railway bridge', x: BR.R[0], z: BR.R[1], kind: 'bridge', width: 9, channel: 0 },
    { name: 'Leie bridge', x: BR.L[0], z: BR.L[1], kind: 'bridge', width: 9, channel: 0 },
    { name: 'Bossuit canal bridge', x: CB.n1[0], z: CB.n1[1], kind: 'bridge', width: 7, channel: 1 },
    { name: 'Zwevegem canal bridge', x: CB.n2[0], z: CB.n2[1], kind: 'bridge', width: 7, channel: 1 },
    { name: 'Roeselare canal bridge', x: CB.p1[0], z: CB.p1[1], kind: 'bridge', width: 7, channel: 2 },
    { name: 'Heule canal bridge', x: CB.p2[0], z: CB.p2[1], kind: 'bridge', width: 7, channel: 2 },
  ],
});
const wet = (x: number, z: number, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

// ---- the points (at about the same distances from each base, not on each other's mirror)
const P = { A: [0, 470], B: [-250, 310], C: [-10, 300], D: [240, 300], E: [-370, 30], F: [0, 0], G: [345, -70], H: [-205, -320], I: [-35, -290], J: [285, -275], K: [0, -470] };
const points: ControlPointDef[] = [
  { id: 'A', name: 'Menin road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Wevelgem', x: P.B[0], z: P.B[1], owner: null, sector: 'west' },
  { id: 'C', name: 'Marke', x: P.C[0], z: P.C[1], owner: null, sector: 'centre' },
  { id: 'D', name: 'Zwevegem', x: P.D[0], z: P.D[1], owner: null, sector: 'east' },
  { id: 'E', name: 'Bissegem', x: P.E[0], z: P.E[1], owner: null, sector: 'west' },
  { id: 'F', name: 'Courtrai', x: 0, z: 0, owner: null, sector: 'centre', radius: 32 },
  { id: 'G', name: 'Deerlijk', x: P.G[0], z: P.G[1], owner: null, sector: 'east' },
  { id: 'H', name: 'Heule', x: P.H[0], z: P.H[1], owner: null, sector: 'west' },
  { id: 'I', name: 'Kuurne', x: P.I[0], z: P.I[1], owner: null, sector: 'centre' },
  { id: 'J', name: 'Harelbeke', x: P.J[0], z: P.J[1], owner: null, sector: 'east' },
  { id: 'K', name: 'Scheldt road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the roads: the Menin–Courtrai–Ghent road through the town over the Broel bridge, the flank roads over the
// Wevelgem and Harelbeke bridges, the quays along each bank over the canal mouths, the roads over the railway and Leie
// bridges, the roads over the canals, the lanes between the villages
const quay = (s: 1 | -1, ends: number[][]) => [ends[0], at(300 * s, 58 * s), ends[1], at(160 * s, 58 * s), at(80 * s, 58 * s), [26 * s, 44 * s]];
const ROADS = [
  [[0, 580], P.A, [-5, 390], P.C, [20, 180], at(0, 100), [0, 0], at(0, -100), [-20, -180], P.I, [5, -390], P.K, [0, -580]],
  [[-260, 580], [-255, 450], P.B, [-300, 260], at(-330, 32), BR.W, at(-330, -32), [-360, 110], P.E],
  [[260, -580], [270, -450], P.J, [300, -260], at(330, -32), BR.H, at(330, 32), [360, -110], P.G],
  [P.E, CB.p2, [-320, -120], P.H, [-270, -450], [-280, -580]],
  [P.G, CB.n2, [320, 120], P.D, [270, 450], [280, 580]],
  quay(-1, [P.E, CB.p1]), quay(1, [P.G, CB.n1]),
  [[-132, 20], at(-110, -32), BR.R, at(-110, 32), [-60, 150], [-30, 230], P.C],
  [[132, -20], at(110, 32), BR.L, at(110, -32), [60, -150], [30, -230], P.I],
  [P.B, [-130, 290], P.C, [120, 285], P.D], [P.H, [-120, -285], P.I, [130, -290], P.J],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);
// the railway (Lille – Courtrai – Ghent) through the town over its own bridge
const RAIL = [[-175, 620], [-150, 300], [-125, 140], BR.R, [-80, -60], [-60, -200], [-90, -400], [-140, -620]];
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), { x: 520, z: 580 }, 2);

// ---- Courtrai: round the Broel bridge on both banks; the Grote Markt on the south bank
const townK = (x: number, z: number) => smoothstep(175, 140, Math.hypot(x, z * 1.1));
const MARKT = { x: 95, z: 55 };
// each side's airfield behind its east wing (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: 140, z: 430, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 140, z: -430, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

// the low rises of the Flemish plain [x, z, rx, rz, h]: each half its own
const RISES = [[-380, 430, 100, 80, 3.8], [330, 190, 80, 90, 3.2], [380, -400, 90, 90, 2.8], [-300, -190, 90, 80, 2.5], [-90, 380, 70, 60, 1.5], [70, -380, 60, 70, 1.5], [130, 200, 90, 80, 3.5]];
const nSide = (x: number, z: number) => z > RZ(x);   // the British bank
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 4 + fbm(noise, x * 0.003 + (nSide(x, z) ? 0 : 31), z * 0.003, 4) * 3 + fbm(noise, x * 0.017 + 7, z * 0.017, 2) * 0.5;
  for (const [hx, hz, rx, rz, hh] of RISES) h += hh * Math.max(0, 1 - Math.hypot((x - hx) / rx, (z - hz) / rz)) ** 1.4;
  h += smoothstep(480, 620, Math.abs(x)) * 12 + smoothstep(545, 680, Math.abs(z)) * 10;   // (the rims beyond the edges)
  h += (3.4 - h) * townK(x, z) * 0.8;                                                      // (the town on its level ground)
  for (const p of points) if (p.id !== 'F') h += (h * 0.6 + 1.8 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * 0.45;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (4 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// ---- the hasty lines: rifle pits and one belt of wire along each bank, out of the town
function linePts(off: number, f: 'nato' | 'pact', seed: number) {
  const r = mulberry32(f === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6, s = f === 'nato' ? 1 : -1;
  for (let x = -480; x <= 480; x += 30) pts.push(at(x, s * (off + (r() - 0.5) * 14 + 8 * Math.sin(x * 0.011 + ph))));
  return f === 'nato' ? pts : pts.reverse();   // (trenchLine faces the right of the way along: toward the river for both)
}
const LINES = { nato: linePts(90, 'nato', 21), pact: linePts(90, 'pact', 22) };
const trenchD = gridCache((x: number, z: number) => Math.min(segDist(LINES.nato, x, z), segDist(LINES.pact, x, z)), { x: 520, z: 580 }, 3);

// ---- copses: few in Flanders, each half its own shapes, the same area
const wn = (x: number, z: number) => fbm(noise, x * 0.008 + 70, z * 0.008, 3);
const T_N = 0.5, T_P = evenThreshold(wn, T_N, nSide);
const woodField = gridCache((x: number, z: number) => {
  if (wet(x, z, 6) || airD(x, z) < 20 || townK(x, z) > 0.2) return 0;
  return wn(x, z) > (nSide(x, z) ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 60 ? 0.75 : 0;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon, 9th Royal Scots' }];

export default {
  id: 'courtrai',
  name: 'Courtrai',
  description: 'October 1918, the Hundred Days: British, Belgian and French troops close on the Lys at Courtrai as the Germans fall back toward the Scheldt. The river and its bridges through the town, its belfry and Broel towers, flat Flemish farmland with poplar rows, canals, the railway, and hasty rearguard lines along both banks.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['uk'], pact: ['de'] },   // (Plumer’s Second Army against Sixt von Armin’s Fourth Army)
  sides: { nato: 'Britain', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'fog' },   // (the attack of 14 October went in at 05:35 in thick mist)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 66, weights: [0.18, 0.36, 0.16, 0.3] as any }),   // (ploughed land, stubble, beet)
  woods: (x: number, z: number) => woodField(x, z),

  theme: {
    // a grey October morning over the Flemish plain
    fogColor: 0xa8aaa4, fogDensity: 0.0017, skyTop: 0x76808a, skyHorizon: 0xc4c4bc, skyBottom: 0x7a7a72,
    sunColor: 0xeee0c8, sunIntensity: 1.45, sunDisk: 0.12, clouds: 0.75, cloudLight: 0xd0d0cc, cloudDark: 0x80868a,
    sunDir: [0.5, 0.4, 0.6], hemiSky: 0xc4cad0, hemiGround: 0x5a5440, hemiIntensity: 1.25, rimColor: 0xd0ccc0, rimIntensity: 0.25,
    terrain: {
      grass: '#56643a', grassAlt: '#4e5c34', dryGrass: '#8a8052', dirt: '#6a5a46', rock: '#8a8478',
      pasture: '#58663a', ploughed: '#6c5c48', stubble: '#a8985c', meadow: '#3e5228',   // (meadow: the beet, dark leaves in rows)
      farmX: [460, 600], farmZ: [520, 640], roads: [], roadZ: 560,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [townK(x, z) > 0.3 ? 0x6e6a62 : 0x807a6c, 0.85];        // the setts of the Flemish roads
        if (rd < 5.5) return [0x7a7060, 0.3];
        if (railD(x, z) < 2.8) return [0x5e564c, 0.9];                                 // ballast
        if (townK(x, z) > 0.5) return [0x7c7266, 0.55];                                // the town’s yards and lanes
        if (Math.hypot(x - MARKT.x, z - MARKT.z) < 26) return [0x8a8274, 0.8];         // the Grote Markt
        if (y < 1.6 && wet(x, z, 10)) return [0x5e5646, 0.7];                          // the muddy banks
        if (trenchD(x, z) < 5) return [0x7a6a52, 0.6];                                 // spoil from the pits
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-260, 0, 280] }, pact: { x: 0, z: -BASE_Z, entries: [-280, 0, 260] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Infanterie-Regiment 75' })),
  },

  /** Each side’s hasty line along its bank (rifle pits, one belt of wire, machine-gun posts); light shelling near the river. */
  battlefield(game: any) {
    const works: any[] = [];
    const ok = (w: any) => !wet(w.x, w.z, 8) && roadD(w.x, w.z) > 7 && railD(w.x, w.z) > 5 && townK(w.x, w.z) < 0.05 && airD(w.x, w.z) > 10 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 28);
    for (const f of ['nato', 'pact'] as const) {
      works.push(...trenchLine(LINES[f], f, { zig: 1, wireAt: 16, belts: 1, gapEvery: 45 }).filter(ok));
      const r = mulberry32(f === 'nato' ? 81 : 83), s = f === 'nato' ? 1 : -1;
      for (let x = -440 + r() * 40; x < 470; x += 100 + r() * 30) {
        const [wx, wz] = at(x, s * 84), w = { kind: 'mgNest', x: wx, z: wz, yaw: f === 'nato' ? Math.PI + 0.54 : 0.54, faction: f };
        if (ok(w)) works.push(w);
      }
    }
    const dens = (x: number, z: number) => { const d = Math.abs(z - RZ(x)) / 1.17; return 0.05 + 0.5 * Math.exp(-((d / 110) ** 2)); };
    const blasts = [...shellField(1910, BOUNDS, dens).filter((b: number[]) => b[1] >= 0), ...shellField(1911, BOUNDS, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => !wet(b[0], b[1], 10) && roadD(b[0], b[1]) > 5 && railD(b[0], b[1]) > 4 && townK(b[0], b[1]) < 0.3 && airD(b[0], b[1]) > 10 && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 25));
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (townK(b.x, b.z) > 0.3 ? 0.14 : 0.08)).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => wet(x, z, 10) || roadD(x, z) < 9 || railD(x, z) < 8 || trenchD(x, z) < 12 || airD(x, z) < 25 || townK(x, z) > 0.05;

    // the villages: red-brick farmsteads and garden walls round their lanes, a church in each
    for (const id of ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J']) {
      const p = points.find((q) => q.id === id)!;
      farmVillage(props, p.x, p.z, 8, 1918 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.2);
    }
    props.rand = mulberry32(1941);
    for (const [x, z, yaw] of [[P.B[0] + 30, P.B[1] + 28, 0.3], [P.C[0] - 32, P.C[1] + 26, -0.2], [P.D[0] + 32, P.D[1] + 26, 0.2], [P.E[0] - 30, P.E[1] - 26, Math.PI], [P.G[0] + 30, P.G[1] + 26, 0.1],
      [P.H[0] - 30, P.H[1] - 28, Math.PI + 0.3], [P.I[0] + 32, P.I[1] - 26, Math.PI - 0.2], [P.J[0] - 32, P.J[1] - 26, Math.PI + 0.2]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }

    // Courtrai: brick houses along the streets on both banks, the square kept open
    props.rand = mulberry32(1942);
    for (let z = -190; z <= 190; z += 13) for (let x = -200; x <= 200; x += 14) {
      const hx = x + (props.rand() - 0.5) * 4, hz = z + (props.rand() - 0.5) * 4;
      if (townK(hx, hz) < 0.35 || wet(hx, hz, 13) || roadD(hx, hz) < 7 || railD(hx, hz) < 8 || Math.hypot(hx - MARKT.x, hz - MARKT.z) < 32 || Math.hypot(hx, hz) < 40
        || Math.hypot(hx + 70, hz + 60) < 22 || nearPoint(hx, hz, 18) || props.rand() < 0.22) continue;
      props.townHouse({ x: hx, z: hz, yaw: Math.atan2(N[0], N[1]) + (props.rand() < 0.5 ? 0 : Math.PI), width: 7 + props.rand() * 3, depth: 8, storeys: props.rand() < 0.65 ? 2 : 3, name: 'house', damaged: 0.15 });
    }
    // the Grote Markt: the belfry in the square, St Martin’s behind it
    const brick = 0x8a5a44, stone = 0xa89c86;
    let g = terrain.heightAt(MARKT.x, MARKT.z);
    props.box('stone', MARKT.x, g + 6, MARKT.z, 12, 12, 9, 0.54, brick);               // the old cloth hall’s stump the belfry stands on
    props.box('stone', MARKT.x, g + 20, MARKT.z, 6.5, 28, 6.5, 0.54, stone);            // the belfry
    props.box('metal', MARKT.x, g + 30, MARKT.z, 6.6, 2, 1.4, 0.54, 0x1e2226);
    for (const [dx, dz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) props.box('stone', MARKT.x + dx, g + 36, MARKT.z + dz, 1.1, 4, 1.1, 0, stone);   // its corner turrets
    props.box('plain', MARKT.x, g + 38, MARKT.z, 3, 8, 3, 0.79, 0x3a4440);              // the spire
    cover.addBox({ x: MARKT.x, z: MARKT.z, yaw: 0.54, length: 12, thickness: 9, height: 34 });
    props.church({ x: MARKT.x + 22, z: MARKT.z + 40, yaw: 0.54 });
    // the Onze-Lieve-Vrouwekerk on the north bank, its tall square tower
    props.church({ x: -70, z: -60, yaw: 0.54 + Math.PI });
    g = terrain.heightAt(-82, -78);
    props.box('stone', -82, g + 16, -78, 6, 32, 6, 0.54, stone);
    cover.addBox({ x: -82, z: -78, yaw: 0.54, length: 6, thickness: 6, height: 32 });
    // the Broel towers, one at each end of the Broel bridge, grey stone with slate cones
    for (const s of [1, -1]) {
      const tx = N[0] * 32 * s + 0.857 * 11 * s, tz = N[1] * 32 * s - 0.51 * 11 * s, tg = terrain.heightAt(tx, tz);
      props.box('stone', tx, tg + 9, tz, 7, 18, 7, 0.54, 0x8e8a7e);
      props.box('stone', tx, tg + 18.6, tz, 7.6, 1.2, 7.6, 0.54, 0x7e7a70);
      props.box('plain', tx, tg + 22, tz, 4.4, 6, 4.4, 1.33, 0x3a3e44);
      cover.addBox({ x: tx, z: tz, yaw: 0.54, length: 7, thickness: 7, height: 18 });
    }
    // sandbagged posts at the bridgeheads, each side on its own bank
    for (const b of [BR.B, BR.W, BR.H, BR.R, BR.L]) for (const s of [1, -1]) {
      const x = b[0] + N[0] * 34 * s + 0.857 * 10, z = b[1] + N[1] * 34 * s - 0.51 * 10;
      if (!wet(x, z, 4) && roadD(x, z) > 4) props.sandbagRing({ x, z, radius: 3.5, toward: -s });
    }

    // the railway: rails, Courtrai station on the south bank, wagons in the sidings
    props.rand = mulberry32(1943);
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let t = 0; t < L; t += 24) {
        const t1 = Math.min(L, t + 24), x0 = ax + (bx - ax) * t / L, z0 = az + (bz - az) * t / L, x1 = ax + (bx - ax) * t1 / L, z1 = az + (bz - az) * t1 / L;
        if (Math.abs(x0) > 520 || Math.abs(z0) > 580 || wet(x0, z0, 2) || wet(x1, z1, 2)) continue;
        props.rails({ x0, z0, x1, z1 });
      }
    }
    props.hall({ x: -112, z: 200, yaw: -0.08 + Math.PI / 2, width: 34, depth: 12, height: 8, color: brick, name: 'railway station' });
    for (const [x, z] of [[-140, 255], [-71, -130]]) props.wagon({ x, z, yaw: Math.atan2(-25, 160) + (z < 0 ? 0.2 : 0), kind: 'box' });

    // poplar rows along the roads and canals, out of the town (tall, narrow, turning yellow)
    props.rand = mulberry32(1944);
    const crown = new THREE.CylinderGeometry(0.3, 1.0, 1, 7), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const poplar = (x: number, z: number) => {
      const h = 16 + props.rand() * 6, gy = terrain.heightAt(x, z), c = props.rand() < 0.35 ? 0x8a8236 : 0x5a6a2e, w = 1.1 + props.rand() * 0.4;
      props.box('plain', x, gy + h * 0.15, z, 0.4, h * 0.3, 0.4, 0, 0x4a4238);
      props.push('plain', crown, m4.compose(v.set(x, gy + h * 0.6, z), q.identity(), sc.set(w * 1.4, h * 0.75, w * 1.4)), c);
    };
    const rowOk = (x: number, z: number) => !wet(x, z, 4) && roadD(x, z) > 5 && railD(x, z) > 6 && townK(x, z) < 0.05 && airD(x, z) > 15 && !nearPoint(x, z, 34) && trenchD(x, z) > 6
      && Math.abs(x) < 495 && Math.abs(z) < 555 && Math.hypot(x, Math.abs(z) - BASE_Z) > 40;
    const ROWS = [ROADS[0], ROADS[1], ROADS[2], ROADS[3], ROADS[4], ROADS[9], ROADS[10],
      [[CAN.nato.x, RZ(CAN.nato.x)], canalPt('nato', 1.05)], [[CAN.pact.x, RZ(CAN.pact.x)], canalPt('pact', 1.05)]];
    for (const [ri, row] of ROWS.entries()) for (let i = 0; i < row.length - 1; i++) {
      const [ax, az] = row[i], [bx, bz] = row[i + 1], L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L, off = ri >= 7 ? 14 : 6.5;
      for (let t = 4; t < L; t += 9) for (const s of [1, -1]) {
        const x = ax + (bx - ax) * t / L + nx * off * s, z = az + (bz - az) * t / L + nz * off * s;
        if (rowOk(x, z) && mulberry32(Math.round(x * 7 + z * 13))() < 0.85) poplar(x, z);
      }
    }

    // farmsteads, field walls and hay out on the plain (each half its own)
    const kinds = ['farm', 'hay', 'fieldwall', 'farm', 'hay'];
    for (let tries = 0, n = 0; n < 90 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (woodField(x, z) > 0.3 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }

    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 4.5 || railD(x, z) < 4 || airD(x, z) < 12 || townK(x, z) > 0.4 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3200, hedges: 700, autumn: 0.35, broadleaf: 0.95,
      noHedge: (x: number, z: number) => townK(x, z) > 0.1 || trenchD(x, z) < 10,
      forest: (x: number, z: number) => {
        if (wet(x, z, 4)) return -1;
        if (trenchD(x, z) < 10 || townK(x, z) > 0.2) return 0.02;
        const k = woodField(x, z);
        if (k > 0.5) return 0.85;
        if (river.project(x, z).d < 30) return 0.2;                           // willows along the Lys and the canals
        return 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
