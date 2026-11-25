// The Rhine, spring 1919: the crossing the Armistice made unnecessary. Had Germany refused the terms, Foch’s armies would
// have had to force the Rhine; as it was, they marched in unopposed in December 1918 and occupied the three bridgeheads
// at Cologne, Koblenz and Mainz — Koblenz with its fortress went to the US Third Army. This map fights the battle that never
// came: the Americans with the British and French on the left bank against the German army dug in on the right.
// On the map: the Rhine across the field at Koblenz (the Allies’ left bank south, +z; the Germans’ right bank north), the
// Moselle coming in from the Allied flank to meet it at the Deutsches Eck with the Kaiser Wilhelm monument on its tip and
// the Balduinbrücke over it, the Lahn coming in from the German flank at Lahnstein under Burg Lahneck. Koblenz’s old town
// with St Kastor on the left bank, Thal Ehrenbreitstein and Pfaffendorf on the right, the bridge of boats between them in
// the middle; the Pfaffendorf bridge and an engineers’ pontoon bridge either side; the Horchheim railway bridge upstream and
// the new Urmitz railway bridge downstream. The great fortress of Ehrenbreitstein on its cliff over the right bank, Feste
// Kaiser Franz on the Petersberg over the left; the lesser Prussian forts Konstantin and Asterstein above each town;
// Stolzenfels, Vallendar, Horchheim and Moselweiß, each with its church spire; vineyard terraces on the steep valley
// sides, barges moored along the banks, and each side’s trench lines along its own bank.
// Not mirrored but fair: the river, its crossings and the fortresses are laid out point-symmetrically about the bridge of
// boats, while the plateau’s swells and hills and the German villages (Vallendar, Asterstein, Horchheim) lie otherwise —
// each village the same distance from its base as its Allied match, each bank the same share of high ground. Each base sits
// on its own bank the same distance from the river with the same crossings at the same places (its town bridge in the
// middle, a bridge either side, a railway bridge at each end). Each side has a tributary on its open flank (the Moselle,
// the Lahn) with a bridge and a ford, and beyond it a Prussian fortress of the same height, ditch, walls and gates the same
// distance from its base (Kaiser Franz for the Allies, Ehrenbreitstein for the Germans) — and each fortress has the other
// side’s railway bridge landing under its cliff. Villages, woods, vineyards, trench lines and airfields come in pairs at
// the same depths; houses, churches and props differ.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, shellField, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, segDist, evenThreshold, pontoons } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SEED = 1919_06;
const noise = createNoise2D(SEED);
const MUD = new THREE.Color(0x5a4c3a);

// ---- the Rhine across the field (flowing to -x, as it flows north past Koblenz), narrower at the bridge of boats; point-symmetric
const RHINE = [[700, -40, 24], [480, -60, 24], [260, -40, 24], [120, -12, 20], [0, 0, 16], [-120, 12, 20], [-260, 40, 24], [-480, 60, 24], [-700, 40, 24]];
const RZ = [...RHINE].sort((a, b) => a[0] - b[0]);
/** The Rhine’s centre z at x. */
const rz = (x: number) => {
  for (let i = 0; i < RZ.length - 1; i++) if (x <= RZ[i + 1][0]) return RZ[i][1] + (RZ[i + 1][1] - RZ[i][1]) * Math.max(0, x - RZ[i][0]) / (RZ[i + 1][0] - RZ[i][0]);
  return RZ[RZ.length - 1][1];
};
const hwR = (x: number) => { const a = Math.abs(x); return a < 120 ? 16 + 4 * a / 120 : a < 260 ? 20 + 4 * (a - 120) / 140 : 24; };
// the Moselle in from the Allied west flank to the Deutsches Eck; the Lahn the same on the German east flank
const MOSELLE = [[-700, 380, 13], [-560, 350, 13], [-450, 360, 13], [-350, 300, 13], [-290, 200, 13], [-245, 110, 13], [-212, 32, 13]];
const LAHN = MOSELLE.map(([x, z, w]) => [-x, -z, w]);
const XING = [
  { name: 'Urmitz railway bridge', x: -420, z: rz(-420), kind: 'bridge', width: 8, channel: 0 },
  { name: 'Engineers’ pontoon bridge', x: -130, z: rz(-130), kind: 'bridge', width: 8, channel: 0, pontoon: true },
  { name: 'Bridge of boats', x: 0, z: 0, kind: 'bridge', width: 9, channel: 0, pontoon: true },
  { name: 'Pfaffendorf bridge', x: 130, z: rz(130), kind: 'bridge', width: 8, channel: 0 },
  { name: 'Horchheim railway bridge', x: 420, z: rz(420), kind: 'bridge', width: 8, channel: 0 },
  { name: 'Balduinbrücke', x: -265, z: 150, kind: 'bridge', width: 8, channel: 1 },
  { name: 'Güls ford', x: -400, z: 330, kind: 'ford', width: 10, channel: 1 },
  { name: 'Lahnstein bridge', x: 265, z: -150, kind: 'bridge', width: 8, channel: 2 },
  { name: 'Nievern ford', x: 400, z: -330, kind: 'ford', width: 10, channel: 2 },
];
const river = createRiver({ paths: [RHINE, MOSELLE, LAHN], halfWidth: 24, level: 0, depth: 2.8, valley: 44, crossings: XING });
const dRhine = (x: number, z: number) => Math.abs(z - rz(x)) * 0.985;   // (the course never leans more than 1 in 5: near enough the true distance, and cheap)
const dTrib = (x: number, z: number) => segDist(z > rz(x) ? MOSELLE : LAHN, x, z);   // (each on its own bank)
/** Distance from the nearest bank, plus 14 (Metz’s convention: 14 = the water’s edge). */
const wetD = (x: number, z: number) => Math.min(dRhine(x, z) - hwR(x), dTrib(x, z) - 13) + 14;
const isNato = (x: number, z: number) => z > rz(x);

// ---- the points
const KF = { x: -390, z: 200 }, EHR = { x: 390, z: -200 };            // Feste Kaiser Franz, Ehrenbreitstein
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points: ControlPointDef[] = [
  P('A', 'Karthause', 0, 470, 'centre'),
  P('B', 'Moselweiß', -290, 420, 'west'),
  P('C', 'Fort Konstantin', 90, 300, 'centre'),
  P('D', 'Stolzenfels', 330, 150, 'east'),
  P('E', 'Feste Kaiser Franz', KF.x, KF.z, 'west', { radius: 30 }),
  P('F', 'Schiffbrücke', 0, 0, 'centre', { radius: 36 }),
  P('G', 'Ehrenbreitstein', EHR.x, EHR.z, 'east', { radius: 30 }),
  P('H', 'Vallendar', -390, -190, 'west'),                              // (the German villages lie otherwise than the Allied ones, each the same distance from its base)
  P('I', 'Fort Asterstein', -150, -340, 'centre'),
  P('J', 'Horchheim', 250, -330, 'east'),
  P('K', 'Arenberg', 0, -470, 'centre'),
];
const pt = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const neg = (r: number[][]) => r.map(([x, z]) => [-x, -z]);

// ---- the roads: the spine over the bridge of boats; each half’s roads (mirrored): the Pfaffendorf/pontoon bridge road, the
// Balduinbrücke and the ford to the fortress, the railway bridge under the other fortress, the lanes behind the front
// (written for the Allied half; a letter is a point, resolved to its German counterpart on the other half, corners mirrored)
const HALF: (string | number[])[][] = [
  ['B', [-200, 300], [-150, 170], [-130, rz(-130) + 50], [-130, rz(-130) - 50], [-110, -150], 'I'],
  [[-150, 170], [-234, 166], [-296, 134], [-340, 160], 'E'],
  ['B', [-370, 380], [-385, 356], [-415, 304], 'E'],
  ['E', [-420, 100], [-420, rz(-420) + 46], [-420, rz(-420) - 46], 'H'],
  ['A', [-160, 440], 'B'],
  ['D', [220, 250], 'C'],
  ['C', [-40, 230], [-150, 170]],
];
const OTHER: Record<string, string> = { A: 'K', B: 'J', C: 'I', D: 'H', E: 'G', H: 'D', I: 'C' };
const resolve = (r: (string | number[])[], nato: boolean) => r.map((q) => (typeof q === 'string' ? pt(nato ? q : OTHER[q]) : nato ? q : [-q[0], -q[1]]));
const ROADS = [
  [[0, 580], pt('A'), pt('C'), [60, 150], [20, 42], [0, 0], [-20, -42], [-60, -150], pt('I'), pt('K'), [0, -580]],
  ...HALF.map((r) => resolve(r, true)), ...HALF.map((r) => resolve(r, false)),
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

// each side’s airfield on the plateau behind its open flank (the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: 300, z: 430, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -300, z: -430, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

// ---- the two fortresses: ring ditch and masonry walls, a gate on each road in, the top graded level
const gatesOf = (c: { x: number; z: number }, s: number) => [[-415, 304], [-340, 160], [-420, 100]].map(([x, z]) => Math.atan2(s * z - c.z, s * x - c.x));
const FORTS = [{ c: KF, r: 44, ga: gatesOf(KF, 1) }, { c: EHR, r: 44, ga: gatesOf(EHR, -1) }];
const angGap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
/** How deep the fort ditches are at (x, z), 0..1 (none in the gates). */
const ditch = (x: number, z: number) => {
  let k = 0;
  for (const F of FORTS) {
    const d = Math.hypot(x - F.c.x, z - F.c.z);
    if (Math.abs(d - F.r) > 6) continue;
    const a = Math.atan2(z - F.c.z, x - F.c.x);
    if (F.ga.some((g) => angGap(a, g) * d < 9)) continue;
    k = Math.max(k, smoothstep(6, 2, Math.abs(d - F.r)));
  }
  return k;
};
const fortD = (x: number, z: number) => Math.min(...FORTS.map((F) => Math.hypot(x - F.c.x, z - F.c.z) - F.r));

// ---- the ground: the valley floor, the steep valley sides up to the plateau (Hunsrück and Eifel edge, Westerwald), the two fortress spurs
const FORT_TOP = 30;
const RELIEF = 7, RELIEF_H = 16;   // (the noise offset that splits the top ground evenly between the banks)
const core = (x: number, z: number) => {
  let h = 3 + fbm(noise, x * 0.004, z * 0.004, 3) * 1.6;
  const dr = dRhine(x, z), dt = dTrib(x, z);
  // the steep valley sides up to the plateau; its long swells lie otherwise on each bank (point-mirrored they fall on the
  // other side’s hollows, yet each bank has the same share — and both fortresses stand over the same hollow)
  h += (24 + 10 * Math.sin(Math.PI * x / 390 + Math.PI / 4)) * Math.min(smoothstep(46, 190, dr), smoothstep(30, 150, dt));
  const rough = smoothstep(60, 200, Math.min(dr, dt + 40));
  if (rough > 0) h += (fbm(noise, x * 0.005 + RELIEF, z * 0.005, 3) * RELIEF_H + fbm(noise, x * 0.011 + 5, z * 0.011, 2) * 3) * rough;   // the plateau’s own hills and combes on each bank
  for (const F of FORTS) h += (FORT_TOP - h) * smoothstep(150, 55, Math.hypot(x - F.c.x, z - F.c.z));
  return h;
};
const BH = core(0, BASE_Z), AH = core(AIR[0].x, AIR[0].z);
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = core(x, z);
  for (const bz of [BASE_Z, -BASE_Z]) h += (BH - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (AH - h) * smoothstep(30, 6, airD(x, z));
  h -= 2.4 * ditch(x, z);
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// the named woods, a pair behind each front and a pair on the far flanks (the Koblenzer Stadtwald, its match in the Westerwald)
const NAMED = [[210, 250, 55], [-210, -250, 55], [-420, 470, 60], [420, -470, 60]];
/** The vineyards (0..1): terraces on the steep valley sides, both banks alike. */
const vines = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 34 || fortD(x, z) < 34 || roadD(x, z) < 6 || NAMED.some(([wx, wz, r]) => Math.hypot(x - wx, z - wz) < r)) return 0;
  const d = Math.min(dRhine(x, z), dTrib(x, z) + 20);
  if (d < 60 || d > 175) return 0;
  return fbm(noise, x * 0.012 + 40, z * 0.012 - 9, 2) > -0.15 ? 1 : 0;
}, { x: 520, z: 580 }, 4);

// ---- the trench lines along each bank: front and support lines the same depth from the river
const LINES = [{ off: 72, wireAt: 18, belts: 2, seed: 17 }, { off: 140, wireAt: 14, belts: 1, seed: 53 }];
const linePts = (off: number, f: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(f === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
  for (let x = -480; x <= 480; x += 40) pts.push([x, rz(x) + off + (r() - 0.5) * 12 + 8 * Math.sin(x * 0.011 + ph)]);
  return f === 'nato' ? pts : neg(pts);
};
const trenchBand = (x: number, z: number) => LINES.some((l) => Math.abs(Math.abs(z - rz(x)) - l.off) < 26);
/** No man’s land: the river and its banks between the two front lines. */
const nml = (x: number, z: number) => 1 - smoothstep(44, 72, Math.abs(z - rz(x)));
/** The two river towns: Koblenz (Allied bank), Thal Ehrenbreitstein and Pfaffendorf (German bank). */
const inTown = (x: number, z: number) => {
  const dz = z - rz(x);
  return (x > -195 && x < 110 && dz > 28 && dz < 150) || (x < 195 && x > -110 && dz < -28 && dz > -150);
};

// ---- the woods
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const T_N = 0.42, T_P = evenThreshold(wn, T_N, isNato);
const woodField = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 14) return 0;
  let k = 0;
  for (const [wx, wz, r] of NAMED) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz)));
  if (wn(x, z) > (isNato(x, z) ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 60) k = Math.max(k, 0.7);
  if (airD(x, z) < 25 || fortD(x, z) < 45 || vines(x, z) > 0.5 || inTown(x, z) || Math.abs(z) > 495) k = 0;
  return k;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon, 39th Infantry' }];

export default {
  id: 'rhine-1918',
  name: 'The Rhine 1918',
  description: 'Spring 1919, the Rhine crossing the Armistice made unnecessary: the Americans, British and French force the river at Koblenz — the Deutsches Eck where the Moselle comes in, the bridge of boats, Ehrenbreitstein on its cliff over the right bank facing Feste Kaiser Franz over the left, vineyard terraces on the steep valley sides and Rhine villages under their church spires.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['aef', 'uk', 'fr'], pact: ['de'] }, // (the US Third Army held Koblenz; aef has no units yet: uk, then fr, fight for it)
  sides: { nato: 'Allies', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'clear' },  // (a spring morning on the Rhine)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 80, weights: [0.36, 0.24, 0.12, 0.28] as any }),
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a clear spring dawn in the Rhine gorge, mist lifting off the water
    fogColor: 0xb4b8b4, fogDensity: 0.0014, skyTop: 0x5a7898, skyHorizon: 0xd8ccb4, skyBottom: 0x707060,
    sunColor: 0xffe2bc, sunIntensity: 2.0, sunDisk: 0.5, clouds: 0.35, cloudLight: 0xf0e4d0, cloudDark: 0x8a8c90,
    sunDir: [0.7, 0.4, 0.35], hemiSky: 0xc4d0dc, hemiGround: 0x4c4a36, hemiIntensity: 1.3, rimColor: 0xffd8b0, rimIntensity: 0.35,
    terrain: {
      grass: '#5a7038', grassAlt: '#4e6432', dryGrass: '#7e7a4c', dirt: '#5e4e3c', rock: '#8a8478', strip: '#4a3e30',
      pasture: '#5c7239', ploughed: '#6e5e48', stubble: '#8a8254', meadow: '#64783e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-300, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [0x867c68, 0.8];                                    // metalled roads
        if (rd < 5.5) return [0x6e6452, 0.3];
        if (ditch(x, z) > 0.3) return [0x5c5244, 0.8];                           // the fort ditches
        if (fortD(x, z) < 0) return [0x7a7262, 0.5];                             // the fort courtyards
        if (y < 1.6 && wetD(x, z) < 22) return [0x6a6656, 0.6];                  // the stone quays and gravel banks
        if (vines(x, z) > 0.5) return Math.min(dRhine(x, z), dTrib(x, z) + 20) % 3.2 < 1.1 ? [0x3e4a26, 0.75] : [0x6a5c44, 0.55]; // vine rows along the contour
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-140, 60, 300] }, pact: { x: 0, z: -BASE_Z, entries: [140, -60, -300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Infanterie-Regiment 68' })),
  },

  /** Each bank dug in: trench lines and wire, the fortress wire, shell holes along the river. */
  battlefield(game: any) {
    const near = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const ok = (w: any) => wetD(w.x, w.z) > 22 && roadD(w.x, w.z) > 5 && !near(w.x, w.z, 34) && !inTown(w.x, w.z) && airD(w.x, w.z) > 15 && fortD(w.x, w.z) > 14 && Math.hypot(w.x, Math.abs(w.z) - BASE_Z) > 45;
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, yaw = f === 'nato' ? Math.PI : 0;
      for (const l of LINES) for (const w of trenchLine(linePts(l.off, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: 70 })) if (ok(w)) works.push(w);
      for (const x of [-300, -240, 230, 300]) { const w = { kind: 'mgNest', x: x * s, z: s * (rz(x) + LINES[0].off - 6), yaw, faction: f }; if (ok(w)) works.push(w); }
    }
    for (const F of FORTS) {
      const f = isNato(F.c.x, F.c.z) ? 'nato' : 'pact';
      for (const [off, step] of [[10, 10.2], [16, 10.2]]) {
        const R = F.r + off, n = Math.round((2 * Math.PI * R) / step);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          if (F.ga.some((g) => angGap(a, g) * R < 11)) continue;
          const x = F.c.x + Math.cos(a) * R, z = F.c.z + Math.sin(a) * R;
          if (wetD(x, z) > 22 && roadD(x, z) > 5) works.push({ kind: 'wire', x, z, yaw: -a + Math.PI / 2, faction: f });
        }
      }
      for (const da of [-0.9, 0.9]) {
        const a = Math.atan2(-F.c.z, -F.c.x) + da, R = F.r - 9;   // (toward the river)
        works.push({ kind: 'mgNest', x: F.c.x + Math.cos(a) * R, z: F.c.z + Math.sin(a) * R, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      }
    }
    const dens = (x: number, z: number) => (wetD(x, z) < 20 || fortD(x, z) < 0 ? 0 : nml(x, z) * 1.4 + (fortD(x, z) < 40 ? 0.4 : 0));   // (the war never came here: shell holes only along the river and round the forts)
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => isNato(b[0], b[1])), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => !isNato(b[0], b[1]))]
      .filter((b) => roadD(b[0], b[1]) > 5 && airD(b[0], b[1]) > 15 && ditch(b[0], b[1]) < 0.1 && !inTown(b[0], b[1]));
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1919)() < (wetD(b.x, b.z) < 90 ? 0.3 : 0.05)).map((b: any) => b.index);
    const paint = (terrain: any) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
        if (wetD(x, z) < 24 || inTown(x, z)) continue;
        const k = nml(x, z) * (0.5 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5);
        if (k > 0.05) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.6, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => wetD(x, z) < 22 || roadD(x, z) < 8 || trenchBand(x, z) || airD(x, z) < 25 || fortD(x, z) < 12;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V1 = new THREE.Vector3(1, 1, 1);
    const drum = (x: number, z: number, r: number, h: number, color: number, y0 = terrain.heightAt(x, z), key = 'stone') => {
      M.compose(new THREE.Vector3(x, y0 + h / 2, z), Q, V1);
      props.push(key, new THREE.CylinderGeometry(r, r, h, 14), M, color);
      cover.addCylinder({ x, z, radius: r, height: h });
    };

    // the Rhine villages under their church spires
    for (const id of ['B', 'D', 'H', 'J']) {
      const [x, z] = pt(id);
      farmVillage(props, x, z, 9, 1919 * 7 + Math.round(x * 3 + z * 7), skip, 1.25);
    }
    props.rand = mulberry32(1919);
    for (const [id, dx, dz, yaw] of [['B', 26, -24, 0.2], ['D', -28, 22, 1.4], ['H', 28, -22, 1.4 + Math.PI], ['J', -26, 24, Math.PI + 0.2]] as [string, number, number, number][]) {
      const [x, z] = pt(id);
      if (!skip(x + dx, z + dz)) props.church({ x: x + dx, z: z + dz, yaw });
    }

    // Koblenz on the left bank, Thal Ehrenbreitstein and Pfaffendorf on the right: streets of town houses along the river
    const town = (s: number, seed: number) => {
      props.rand = mulberry32(seed);
      for (let x = -185; x <= 100; x += 13) for (let dz = 34; dz <= 146; dz += 15) {
        const px = s * (x + (props.rand() - 0.5) * 3), pz = rz(px) + s * (dz + (props.rand() - 0.5) * 3);
        if (wetD(px, pz) < 22 || roadD(px, pz) < 8 || nearPoint(px, pz, 24) || trenchBand(px, pz) && props.rand() < 0.6) continue;
        props.townHouse({ x: px, z: pz, yaw: (s > 0 ? Math.PI : 0) + Math.round(props.rand()) * Math.PI, width: 8, depth: 9, storeys: 2 + Math.round(props.rand() * 1.4), damaged: 0 });
      }
    };
    town(1, 57);
    town(-1, -57);
    for (const [x, dz, yaw] of [[-165, 50, 0.1], [-40, 110, 0.1], [165, -50, 0.1 + Math.PI], [40, -110, 0.1 + Math.PI]]) {
      const z = rz(x) + dz;
      if (!skip(x, z)) props.church({ x, z, yaw });     // St Kastor and the Liebfrauenkirche; Heilig Kreuz and St Peter in Pfaffendorf
    }

    // the Deutsches Eck: the Kaiser Wilhelm monument on the tip between the rivers; Burg Lahneck’s keep over the Lahn mouth
    {
      const x = -196, z = 66, g = terrain.heightAt(x, z), stone = 0x8e8070;
      props.box('stone', x, g + 3, z, 16, 6, 12, 0.3, stone);
      props.box('stone', x, g + 9, z, 8, 6, 6, 0.3, stone);
      props.box('metal', x, g + 14, z, 2.4, 4, 6, 0.3, 0x4a6458);                 // the Kaiser on horseback, in green copper
      props.box('metal', x, g + 17, z, 1, 3, 1, 0.3, 0x4a6458);
      cover.addBox({ x, z, yaw: 0.3, length: 16, thickness: 12, height: 6 });
      const lx = 196, lz = -66, lg = terrain.heightAt(lx, lz);
      drum(lx, lz, 5, 20, 0x9a8a72, lg);
      props.box('stone', lx + 8, lg + 4, lz - 4, 14, 8, 8, 0.3, 0x9a8a72);
      cover.addBox({ x: lx + 8, z: lz - 4, yaw: 0.3, length: 14, thickness: 8, height: 8 });
    }

    // the two fortresses, built alike: masonry curtain walls on the ring inside the ditch (gaps at the gates), corner
    // bastions, the long casemated barracks, the gate towers
    for (const F of FORTS) {
      const cx = F.c.x, cz = F.c.z, stone = 0xa29684;
      const R = F.r - 4, n = 28;
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        if (F.ga.some((g) => angGap(a, g) * R < 9)) continue;
        props.lowWall({ x: cx + Math.cos(a) * R, z: cz + Math.sin(a) * R, yaw: -a + Math.PI / 2, length: (2 * Math.PI * R) / n + 0.4, height: 3.2, color: stone });
      }
      for (const g of F.ga) for (const s of [-1, 1]) {
        const a = g + s * (11 / R);
        drum(cx + Math.cos(a) * R, cz + Math.sin(a) * R, 2.4, 5.5, stone);
      }
      for (const a of [0.8, 2.4, 3.9, 5.5]) {
        const x = cx + Math.cos(a) * (R - 6), z = cz + Math.sin(a) * (R - 6);
        if (!F.ga.some((g) => angGap(a, g) < 0.5)) drum(x, z, 5, 3.4, stone);
      }
      const toward = Math.atan2(-cz, -cx), by = -toward - Math.PI / 2;
      const hx = cx - Math.cos(toward) * 12, hz = cz - Math.sin(toward) * 12;
      props.hall({ x: hx, z: hz, yaw: by, width: 34, depth: 10, height: 7, color: stone, roof: 0x4e5254, door: 4, name: 'Kaserne' });
    }
    // Fort Konstantin and Fort Asterstein: small Prussian works above each town
    for (const id of ['C', 'I']) {
      const [x, z] = pt(id), s = id === 'C' ? 1 : -1;
      for (const [dx, dz, yaw, len] of [[-22, 0, Math.PI / 2, 18], [22, 0, Math.PI / 2, 18], [0, -22 * s, 0, 18]] as number[][]) props.lowWall({ x: x + dx, z: z + dz, yaw, length: len, height: 2.6, color: 0xa29684 });
      props.hall({ x: x + 30, z: z + 18 * s, yaw: 0, width: 16, depth: 8, height: 5, color: 0xa29684, roof: 0x4e5254, door: 3, name: 'Fort' });
    }
    // Stolzenfels castle on its rock above the village; its match, the Vallendar manor
    for (const [id, dx, dz] of [['D', 40, -40], ['H', -40, 40]] as [string, number, number][]) {
      const [x, z] = pt(id), X = x + dx, Z = z + dz, g = terrain.heightAt(X, Z);
      if (skip(X, Z)) continue;
      drum(X, Z, 4, 16, 0xb8a480, g);
      props.hall({ x: X + 12, z: Z, yaw: 0, width: 16, depth: 9, height: 8, color: 0xc4b08a, roof: 0x5a3a2e, door: 3, name: 'castle' });
    }

    // vineyard terrace walls along the contours, and the vintners’ huts
    for (let tries = 0, n = 0; n < 120 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (vines(x, z) < 0.5 || skip(x, z) || nearPoint(x, z, 30)) continue;
      props.lowWall({ x, z, yaw: -Math.atan2(rz(x + 1) - rz(x - 1), 2), length: 10, height: 0.9, color: 0x8a7e68 });
      n++;
    }

    // the railway bridges’ steel lattice girders over the stone piers; barges moored along the banks
    for (const c of river.crossings) {
      if (c.kind !== 'bridge' || c.channel !== 0 || !/railway/.test(c.name)) continue;
      const yaw = river.yawOf(c), L = (river.halfWidth + 6) * 2, deck = river.deck;
      for (const s of [-1, 1]) {
        const p = river.at(c, s * (c.width / 2 + 0.2), 0);
        props.box('metal', p.x, deck + 4.6, p.z, 0.4, 0.5, L, yaw, 0x3c4044);
        for (let v = -L / 2; v <= L / 2; v += 5) { const q = river.at(c, s * (c.width / 2 + 0.2), v); props.box('metal', q.x, deck + 2.4, q.z, 0.3, 4.4, 0.3, yaw, 0x3c4044); }
      }
    }
    props.rand = mulberry32(2019);
    for (const s of [1, -1]) for (const x0 of [-330, -60, 240, 360]) {
      const x = s * x0;
      if (river.crossings.some((c: any) => c.channel === 0 && Math.abs(c.x - x) < 45)) continue;
      const z = rz(x) + s * (hwR(x) - 5), sl = Math.atan2(rz(x + 1) - rz(x - 1), 2);
      props.box('plain', x, 0.5, z, 30, 1.6, 6, -sl, 0x2e2a26);                                         // the hull
      props.box('plain', x + 11 * Math.cos(sl), 1.8, z + 11 * Math.sin(sl), 4, 2, 4.6, -sl, 0xe8e0cc);   // the wheelhouse
    }

    // farmsteads, field walls and hay
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'rocks'];
    for (let tries = 0, n = 0; n < 70 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 40), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (woodField(x, z) > 0.3 || nml(x, z) > 0.3 || Math.abs(z) > 470 || nearPoint(x, z, 50) || skip(x, z) || fortD(x, z) < 50 || vines(x, z) > 0.5 || inTown(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0xcfc8b0);
    commandPost(props, this.bases.pact, 1, 0xb8b4a0);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);
    for (const c of river.crossings) if (c.pontoon && c.mesh) c.mesh.rotation.y = river.yawOf(c);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 12 || roadD(x, z) < 4.5 || airD(x, z) < 12 || fortD(x, z) < 22 || ditch(x, z) > 0 || (Math.abs(z) > 475 && Math.abs(x) < 210) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3800, hedges: 1400, autumn: 0.1, broadleaf: 0.8,
      noHedge: (x: number, z: number) => nml(x, z) > 0.2 || trenchBand(x, z) || vines(x, z) > 0.5 || fortD(x, z) < 40 || inTown(x, z),
      forest: (x: number, z: number) => {
        if (wetD(x, z) < 12 || vines(x, z) > 0.5) return -1;
        if (inTown(x, z)) return 0.01;
        const k = woodField(x, z);
        if (nml(x, z) > 0.3) return k > 0.5 ? 0.2 : 0.005;
        if (k > 0.5) return trenchBand(x, z) ? 0.25 : 0.85;
        return wetD(x, z) < 30 ? 0.1 : 0;                                        // (willows along the banks)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
