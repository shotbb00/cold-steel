// Warsaw, July–August 1915: the fall of Warsaw. All winter the German Ninth Army and the Russian Second Army faced each
// other in deep trenches along the Bzura and the Rawka, fifty kilometres west of the city — Bolimów, where the Germans
// first fired gas shells in January, and Sochaczew, shot to ruins on the river. In the great retreat of summer 1915 the
// Russians gave up the Bzura–Rawka line and the ring of outer forts, blew the Vistula bridges behind them, and on
// 5 August the Bavarians of Prince Leopold marched into Warsaw. Here it is the land battle for the Warsaw province, and in
// the 1917 campaign the Russian counter-offensive to take it back. On the map: the Vistula down the east side, wide and
// unfordable, with the Kierbedź bridge under the Royal Castle and the Old Town’s spires on the escarpment, the Poniatowski
// bridge by Powiśle’s gasworks, and Praga on the low right bank with St Florian’s twin spires and the onion domes of the
// Orthodox cathedral; the Citadel’s brick walls behind the German line; two of the Russian outer forts, brick-and-earth
// works behind their ditches (Fort I Bema and Fort VI Okęcie); and west of the city the flat Mazovian plain with its poplar
// roads, villages and the Bzura and Rawka in their wet meadows round Bolimów, with the 1915 winter trenches on both banks.
// Russians (nato, 'ru') to the south, +z; Germans and Austro-Hungarians (pact, 'de', 'ah') to the north.
// Not mirrored but fair: the Vistula runs from one base edge to the other, so both sides hold the same length of it, one
// bridge each into Praga at the same distance (Poniatowski for the Russians, Kierbedź for the Germans) and the same
// escarpment on its left bank; the Bzura (with the Rawka splitting off round Bolimów) runs between the sides on the
// plain, crossed by the two Bolimów bridges on the west flank, the Sochaczew bridge in the middle and the Brochów ford by
// the mouth. Each side has one outer fort at the same place with the same ditch and rampart, a river-side town of the same
// size at the same reach (the Old Town and Castle, Powiśle), a village on the west flank (Babice, Raszyn), two trench
// lines at the same depth from the water and its own woods cut to the same area. The neutral middle: Bolimów on its
// island, Sochaczew astride its bridge, and Praga across the Vistula halfway between the two bridges.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const SEED = 1915_08;
const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const HWV = 24;                                              // the Vistula: broad, deep, no fords
const noise = createNoise2D(SEED);

// ---- the rivers
/** The Vistula's middle at z: down the east side from base edge to base edge. */
const VX = (z: number) => 285 + 12 * Math.sin(z * 0.005 + 0.6);
/** The Bzura's middle at x, west to east into the Vistula; the Rawka splits off round Bolimów island. */
const mid = (x: number) => 8 * Math.sin(x * 0.006 + 0.7) + 5 * Math.sin(x * 0.019) - 3;
const split = (x: number) => 44 * Math.exp(-(((x + 300) / 115) ** 2));
const armN = (x: number) => mid(x) + split(x), armS = (x: number) => mid(x) - split(x);
const MOUTH = 292;
const VISTULA: number[][] = [];
for (let z = -640; z <= 640; z += 40) VISTULA.push([VX(z), z, HWV]);
const BZURA: number[][] = [];
for (let x = -640; x < MOUTH; x += 20) BZURA.push([x, armN(x), 9 + 3 * smoothstep(0, 280, x)]);
BZURA.push([MOUTH, mid(MOUTH), 12]);
const RAWKA: number[][] = [];
for (let x = -640; x <= -100; x += 20) RAWKA.push([x, armS(x), 8]);
const BR = 300;                                              // the two Vistula bridges, z = ±300
const river = createRiver({
  paths: [VISTULA, BZURA, RAWKA], halfWidth: HWV, level: 0, depth: 2.6, valley: 70,
  crossings: [
    { name: 'Poniatowski bridge', x: VX(BR), z: BR, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Kierbedź bridge', x: VX(-BR), z: -BR, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Bolimów bridge (Bzura)', x: -330, z: armN(-330), kind: 'bridge', width: 6, channel: 1 },
    { name: 'Bolimów bridge (Rawka)', x: -330, z: armS(-330), kind: 'bridge', width: 6, channel: 2 },
    { name: 'Sochaczew bridge', x: 0, z: mid(0), kind: 'bridge', width: 7, channel: 1 },
    { name: 'Brochów ford', x: 170, z: mid(170), kind: 'ford', width: 14, channel: 1 },
  ],
});
/** m from the Bzura or Rawka's middle (past the mouth: from the mouth). */
const bzD = (x: number, z: number) => (x > MOUTH ? Math.hypot(x - MOUTH, z - mid(MOUTH)) : Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x))));
const vD = (x: number, z: number) => Math.abs(x - VX(z));
/** m from the nearest water's edge (negative: in it). */
const wetD = (x: number, z: number) => Math.min(bzD(x, z) - (x > 0 ? 12 : 9), vD(x, z) - HWV);
const praga = (x: number, z: number) => x > VX(z);
/** Which side's half: the north bank of the Bzura (and Praga north of the middle) is the Germans'. */
const natoHalf = (x: number, z: number) => (praga(x, z) ? z > 0 : z > mid(x));

// ---- the points
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Grójec road', 0, 470, 'centre'),
  P('B', 'Raszyn', -380, 300, 'west', { radius: 26 }),
  P('C', 'Fort VI Okęcie', -120, 265, 'centre', { radius: 28 }),
  P('D', 'Powiśle', 150, 318, 'east', { radius: 28 }),
  P('E', 'Bolimów', -300, Math.round(mid(-300)), 'west', { radius: 24 }),
  P('F', 'Sochaczew', 0, Math.round(mid(0)), 'centre', { radius: 30 }),
  P('G', 'Praga', 420, 0, 'east', { radius: 30 }),
  P('H', 'Babice', -380, -300, 'west', { radius: 26 }),
  P('I', 'Fort I Bema', -120, -265, 'centre', { radius: 28 }),
  P('J', 'Royal Castle', 150, -318, 'east', { radius: 28 }),
  P('K', 'Modlin road', 0, -470, 'centre'),
] as any[];
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the roads: the three poplar roads to each base (over the Bolimów bridges, the Sochaczew bridge, the Brochów ford),
// a lateral road behind each bank, each side's lane through its village, fort and town to its Vistula bridge, Praga's street
const along = (f: (x: number) => number, x0: number, x1: number) => { const o: number[][] = []; for (let x = x0; x <= x1; x += 25) o.push([x, f(x)]); return o; };
const bankZ = (x: number, north: boolean) => (north ? mid(x) + 160 + 8 * Math.sin(x * 0.01) : mid(x) - 162 - 9 * Math.sin(x * 0.008 + 2));
const LANE = (s: number) => [[-525, 310 * s], [-380, 300 * s], [-250, 292 * s], [-120, 265 * s], [0, 282 * s], [90, 298 * s], [150, BR * s], [420, BR * s]];
const ROADS: number[][][] = [
  [[0, 600], [0, 470], [14, 360], [-8, 200], [0, mid(0)]],
  [[0, -600], [0, -470], [-14, -360], [8, -200], [0, mid(0)]],
  ...[-330, 170].flatMap((x) => [[[x, 600], [x, mid(x)]], [[x, -600], [x, mid(x)]]]),
  along((x) => bankZ(x, true), -525, 250), along((x) => bankZ(x, false), -525, 250),
  LANE(1), LANE(-1),
  [[420, -600], [420, 600]],
];
function segDistAll(x: number, z: number) {
  let best = 80;
  for (const poly of ROADS) for (let k = 0; k < poly.length - 1; k++) {
    const [ax, az] = poly[k], [bx, bz] = poly[k + 1];
    if (Math.min(ax, bx) - best > x || Math.max(ax, bx) + best < x || Math.min(az, bz) - best > z || Math.max(az, bz) + best < z) continue;
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
const roadD = gridCache(segDistAll, { x: 520, z: 580 }, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;

// each side's airfield on the open plain behind its fort (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip)
const AIR = [{ faction: 'nato', x: -185, z: 395, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -185, z: -395, yaw: -Math.PI / 2, large: false }];
const airD1 = (a: any, x: number, z: number) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52));
const airD = (x: number, z: number) => Math.min(airD1(AIR[0], x, z), airD1(AIR[1], x, z));

// ---- the outer forts: a ring rampart, the ditch outside it, two gates on the lane, the top graded flat
const FORTS = [points[2], points[8]].map((p) => {
  const s = p.z > 0 ? 1 : -1, c = { x: p.x, z: p.z }, gates = [[-250, 292 * s], [0, 282 * s]];
  return { c, r: 38, s, f: s > 0 ? 'nato' as const : 'pact' as const, ga: gates.map(([gx, gz]) => Math.atan2(gz - c.z, gx - c.x)) };
});
const angGap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const fortD = (x: number, z: number) => Math.min(...FORTS.map((F) => Math.hypot(x - F.c.x, z - F.c.z) - F.r));
/** [ditch 0–1, rampart 0–1] at (x, z), the gates left open. */
function works(x: number, z: number) {
  for (const F of FORTS) {
    const d = Math.hypot(x - F.c.x, z - F.c.z);
    if (d < F.r - 16 || d > F.r + 8) continue;
    const a = Math.atan2(z - F.c.z, x - F.c.x);
    if (F.ga.some((g) => angGap(a, g) * d < 7)) return [0, 0];
    return [smoothstep(6, 2, Math.abs(d - F.r)), smoothstep(5, 1.5, Math.abs(d - (F.r - 9)))];
  }
  return [0, 0];
}

// ---- the ground
/** [x, z, r, h]: a low swell under each fort, one gentler rise on each west flank. */
const RISES = [[-120, 265, 140, 4], [-120, -265, 140, 4], [-330, 420, 130, 3], [-360, -430, 130, 3]];
const marshAt = gridCache((x: number, z: number) => (x > MOUTH - 30 ? 0 : smoothstep(0.15, 0.4, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * (1 - smoothstep(55, 105, bzD(x, z)))), { x: 520, z: 580 }, 4);
function open(x: number, z: number) {
  const dV = vD(x, z), dB = bzD(x, z), n = fbm(noise, x * 0.004 + (natoHalf(x, z) ? 0 : 40), z * 0.004, 4);
  let h: number;
  if (praga(x, z)) h = 1.2 + smoothstep(30, 70, dV) * (1.9 + n * 0.8);                                   // Praga: the low right-bank terrace
  else {
    let relief = 3 + n * 2.6 + fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 0.7;
    for (const [hx, hz, r, hh] of RISES) relief += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
    relief += 6 * smoothstep(45, 95, dV);                                                                 // the Vistula escarpment
    h = 1.2 + Math.min(smoothstep(25, 130, dB), smoothstep(28, 60, dV)) * relief;
  }
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 6 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, -x) * 12;
  return h;
}
const FTOP = FORTS.map((F) => open(F.c.x, F.c.z)), ATOP = AIR.map((a) => open(a.x, a.z + 27 * Math.sign(a.z)));
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = open(x, z);
  const dB = bzD(x, z), dV = vD(x, z);
  h += (1.4 - h) * marshAt(x, z) * 0.8;                                                                   // the wet meadows
  for (const bx of [-330, 0, 170]) h += (Math.min(h, 1.3 + dB * 0.06) - h) * (1 - smoothstep(5, 18, Math.abs(x - bx))) * (1 - smoothstep(110, 160, dB)); // (down to the Bzura crossings)
  for (const bz of [BR, -BR]) h += (Math.min(h, 1.3 + Math.max(0, dV - 20) * 0.07) - h) * (1 - smoothstep(6, 18, Math.abs(z - bz))) * (1 - smoothstep(120, 170, dV)); // (the bridge ramps down the escarpment)
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  AIR.forEach((a, i) => { h += (ATOP[i] - h) * smoothstep(40, 4, airD1(a, x, z)); });
  FORTS.forEach((F, i) => { h += (FTOP[i] - h) * smoothstep(F.r + 30, F.r + 6, Math.hypot(x - F.c.x, z - F.c.z)); });
  return h;
}, { x: 640, z: 700 }, 4);
function height(x: number, z: number) {
  let h = ground(x, z);
  const fd = fortD(x, z);
  if (fd < 8 && fd > -16) { const [d, r] = works(x, z); h += 2.4 * r - 3 * d; }
  return river.carve(x, z, Math.max(1.4, h));
}

/** Each side's two lines along the Bzura (`line` 0 the fire trench, 1 the support line), Praga's barricade line at the same depth. */
const trenchZ = (x: number, north: boolean, line: number) => (north
  ? mid(x) + split(x) * 0.6 + (line ? 205 : 100) + 9 * Math.sin(x * 0.017 + line)
  : mid(x) - split(x) * 0.6 - (line ? 202 : 102) - 10 * Math.sin(x * 0.013 + 2 + line));
const trenchBand = (x: number, z: number) => [0, 1].some((l) => Math.abs(z - trenchZ(x, natoHalf(x, z), l)) < (l ? 22 : 30));

// ---- the towns: the Old Town and Castle on the escarpment (J), Powiśle (D), Praga (G), Sochaczew (F), Bolimów (E)
const CASTLE = { x: 196, z: -338 };
const TOWNS = [{ x: 150, z: 318, r: 75 }, { x: 150, z: -318, r: 75 }, { x: 420, z: 0, r: 110 }, { x: 0, z: mid(0), r: 70 }, { x: -300, z: mid(-300), r: 50 }];
const inTown = (x: number, z: number, pad = 0) => TOWNS.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + pad);
const CITADEL = { x: 175, z: -478, w: 64, d: 44 }, BARRACKS = { x: 175, z: 478 };

// ---- woods: copses over each half, cut to the same area
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const T_N = 0.2, T_P = evenThreshold(wn, T_N, natoHalf);
const woodField = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 8 || fortD(x, z) < 45 || airD(x, z) < 25 || Math.hypot(x, Math.abs(z) - BASE_Z) < 60 || inTown(x, z, 20) || praga(x, z)) return 0;
  return x < -470 || wn(x, z) > (natoHalf(x, z) ? T_N : T_P) ? 1 : 0;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'warsaw',
  name: 'Warsaw',
  description: 'August 1915: the Germans break the Bzura–Rawka line, take the outer forts and march into Warsaw over the blown Vistula bridges. The Vistula with the Kierbedź and Poniatowski bridges, the Royal Castle and the Old Town’s spires on the escarpment, Praga across the river, brick-and-earth forts behind their ditches, and the flat Mazovian plain of poplar roads and villages with the Bzura and Rawka in their wet meadows and the deep trenches of the 1915 winter.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de', 'ah'] }, // (the Russian Second Army; the German Ninth Army and Prince Leopold’s Army Group, Austro-Hungarian divisions beside them)
  sides: { nato: 'Russia', pact: 'Central Powers' },
  conditions: { time: 'day', weather: 'clear' }, // (the hot, dusty August of the great retreat)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 80, weights: [0.25, 0.3, 0.2, 0.25] as any }),

  theme: {
    // a hot, hazy August day over the Mazovian plain
    fogColor: 0xbcbcac, fogDensity: 0.0012, skyTop: 0x5a86b0, skyHorizon: 0xd0d0c4, skyBottom: 0x868474,
    sunColor: 0xfff0d0, sunIntensity: 1.9, sunDisk: 0.3, clouds: 0.3, cloudLight: 0xf2f0ea, cloudDark: 0x9aa0a6,
    sunDir: [0.5, 0.55, 0.45], hemiSky: 0xc8ced6, hemiGround: 0x5a5a3c, hemiIntensity: 1.25, rimColor: 0xc8ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#66763e', grassAlt: '#5c6c38', dryGrass: '#a49a62', dirt: '#6a5a44', rock: '#8a867c', strip: '#5a4c38',
      pasture: '#64743c', ploughed: '#6a5a44', stubble: '#b4a868', meadow: '#6a7a40',
      farmX: [460, 600], farmZ: [520, 640], roads: [-330, 0, 170], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return inTown(x, z) ? [0x7a766c, 0.9] : [0x8a7a5c, 0.85];        // cobbles in the towns, dust on the poplar roads
        const fd = fortD(x, z);
        if (fd < 8 && fd > -16) { const [d] = works(x, z); if (d > 0.3) return [0x5e5442, 0.8]; }   // the fort ditches
        if (fd < 0) return [0x6e7448, 0.5];                                                    // the forts' turf
        if (y < 1.6 && wetD(x, z) < 10) return [0x6a6a48, 0.85];                              // the reedy banks, the Vistula's sand
        const m = marshAt(x, z);
        if (m > 0.3) return [0x4e5a32, Math.min(0.85, m)];                                    // wet meadow, sedge and reed
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-330, 0, 170] }, pact: { x: 0, z: -BASE_Z, entries: [-330, 0, 170] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side's two lines along the Bzura (three belts of wire before the first), the fort wire, MGs at the roads, the winter's shell holes; Sochaczew and Bolimów in ruins. */
  battlefield(game: any) {
    const out: any[] = [];
    const ok = (w: any) => wetD(w.x, w.z) > 10 && airD(w.x, w.z) > 15 && roadD(w.x, w.z) > 7 && fortD(w.x, w.z) > 14 && !nearPt(w.x, w.z, 28) && !inTown(w.x, w.z, -20);
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      for (const line of [0, 1]) {
        const pts: number[][] = [];
        for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato', line)]);   // (left to right as its owner looks)
        for (const w of trenchLine(pts, f, { wireAt: line ? 18 : 22, belts: line ? 1 : 3, gapEvery: line ? 50 : 70 })) if (ok(w)) out.push(w);
        for (const bx of [-330, 0, 170, 420]) out.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato', line) - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      }
    }
    for (const F of FORTS) {
      for (const off of [10, 16]) {
        const R = F.r + off, n = Math.round((2 * Math.PI * R) / 10.2);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          if (F.ga.some((g) => angGap(a, g) * R < 11)) continue;
          const x = F.c.x + Math.cos(a) * R, z = F.c.z + Math.sin(a) * R;
          if (roadD(x, z) > 5 && airD(x, z) > 10) out.push({ kind: 'wire', x, z, yaw: -a + Math.PI / 2, faction: F.f });
        }
      }
      for (const da of [-0.9, 0.9]) {
        const a = Math.atan2(-F.s, 0) + da, R = F.r - 9;
        out.push({ kind: 'mgNest', x: F.c.x + Math.cos(a) * R, z: F.c.z + Math.sin(a) * R, yaw: F.f === 'nato' ? Math.PI : 0, faction: F.f });
      }
    }
    const dens = (x: number, z: number) => { const dz = Math.abs(z - mid(x)) - 90; return 0.8 * Math.exp(-((dz / 45) ** 2)) + 0.04; };
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b: number[]) => b[1] >= mid(b[0])), ...shellField(SEED + 1, BOUNDS, dens).filter((b: number[]) => b[1] < mid(b[0]))]
      .filter((b: number[]) => wetD(b[0], b[1]) > 10 && airD(b[0], b[1]) > 15 && !onRoad(b[0], b[1]) && fortD(b[0], b[1]) > 10 && !nearPt(b[0], b[1], 35) && !praga(b[0], b[1]) && !inTown(b[0], b[1]));
    const r = mulberry32(SEED);
    const ruins = game.buildings.list.filter((b: any) => {
      if (b.name !== 'town house' && b.name !== 'house') return false;
      const dead = Math.hypot(b.x, b.z - mid(0)) < 85 || Math.hypot(b.x + 300, b.z - mid(-300)) < 60;   // (Sochaczew and Bolimów: a winter on the front line)
      return r() < (dead ? 0.7 : 0);
    }).map((b: any) => b.index);
    return { blasts, ruins, works: out };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const skip = (x: number, z: number) => wetD(x, z) < 10 || roadD(x, z) < 8 || trenchBand(x, z) || fortD(x, z) < 14 || airD(x, z) < 25
      || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 34 || Math.abs(x - CITADEL.x) < CITADEL.w / 2 + 6 && Math.abs(z - CITADEL.z) < CITADEL.d / 2 + 6;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const GOLD = 0xd0b050, BRICK = 0x8a4a36, GREEN = 0x4a7a64;
    const cone = (x: number, y: number, z: number, r: number, h: number, color: number, sides = 8) => {
      m4.compose(v.set(x, y + h / 2, z), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r, h, sides), m4, color);
    };
    /** An onion dome on its drum at (x, y, z). */
    const onion = (x: number, y: number, z: number, r: number, color: number, drum = 0xe6e2d8) => {
      m4.compose(v.set(x, y, z), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r * 0.75, r * 0.75, r * 1.6, 12), m4, drum);
      m4.compose(v.set(x, y + r * 1.6, z), q.identity(), v.clone().set(r, r * 1.2, r)); props.push('plain', new THREE.SphereGeometry(1, 12, 8), m4, color);
      cone(x, y + r * 2.4, z, r * 0.38, r * 1.2, GOLD);
      props.box('metal', x, y + r * 3.9, z, 0.15, 1.6, 0.15, 0, GOLD);
      props.box('metal', x, y + r * 4.1, z, 0.9, 0.12, 0.12, 0, GOLD);
    };
    /** A tall spired tower (cover at its foot). */
    const spire = (x: number, z: number, w: number, h: number, sh: number, color: number, roof: number) => {
      const g = terrain.heightAt(x, z) - 0.5;
      props.box('stone', x, g + h / 2, z, w, h, w, 0, color);
      props.box('metal', x, g + h - 3, z, w + 0.05, 1.6, w * 0.3, 0, 0x22201e);
      cone(x, g + h, z, w * 0.72, sh, roof, 8);
      cover.addBox({ x, z, yaw: 0, length: w, thickness: w, height: h });
    };
    const colors = [0xc8a878, 0xb87a5a, 0xd8c8a0, 0xa8b098, 0xc89a70, 0xe0d4b4, 0xb0886a];

    // ---- the Old Town on the escarpment: tall burghers' houses round J, St John's cathedral and St Anne's spires
    props.rand = mulberry32(1596);
    for (let i = 0, n = 0; n < 16 && i < 600; i++) {
      const x = 150 + (props.rand() * 2 - 1) * 66, z = -318 + (props.rand() * 2 - 1) * 54;
      if (skip(x, z) || Math.hypot(x - 150, z + 318) < 16 || Math.hypot(x - 108, z + 350) < 16) continue;
      props.townHouse({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 8 + props.rand() * 3, depth: 9, storeys: 3, damaged: 0.05 });
      n++;
    }
    props.church({ x: 108, z: -350, yaw: Math.PI / 2 });                                     // St John's
    spire(112, -280, 5, 26, 12, 0xb8a888, 0x3e5a4c);                                          // St Anne's tower
    // the Royal Castle: four ranges round the court, the Clock Tower on the town side; Sigismund's Column in the square
    {
      const { x: cx, z: cz } = CASTLE, sal = 0xc07858, roof = 0x7a3a2c;
      for (const [dx, dz, yaw, w] of [[0, -18, 0, 46], [0, 18, 0, 46], [-21, 0, Math.PI / 2, 26], [21, 0, Math.PI / 2, 26]] as const) {
        props.hall({ x: cx + dx, z: cz + dz, yaw, width: w, depth: 10, height: 11, color: sal, roof, door: 4, name: 'Royal Castle' });
      }
      spire(cx - 21, cz, 9, 36, 14, sal, 0x3e5a4c);                                          // the Clock (Zygmunt) Tower
      props.box('plain', cx - 25.6, terrain.heightAt(cx - 21, cz) + 26, cz, 0.3, 3.4, 3.4, 0, 0xe8e0c8);   // its clock face
      const sx = cx - 52, sz = cz + 6, g = terrain.heightAt(sx, sz);
      props.box('stone', sx, g + 1, sz, 3, 2, 3, 0, 0x8a8478);
      m4.compose(v.set(sx, g + 10, sz), q.identity(), one); props.push('stone', new THREE.CylinderGeometry(0.6, 0.7, 16, 10), m4, 0xa0503e);
      props.box('metal', sx, g + 19, sz, 1.2, 2.4, 1.2, 0, 0x3e4a44);                          // the king with his cross and sabre
      cover.addCylinder({ x: sx, z: sz, radius: 1.5, height: 2 });
    }
    // ---- Powiśle: tenements by the Poniatowski bridge, the gasworks' holders, the power station and its chimney
    props.rand = mulberry32(1904);
    for (let i = 0, n = 0; n < 16 && i < 600; i++) {
      const x = 150 + (props.rand() * 2 - 1) * 66, z = 318 + (props.rand() * 2 - 1) * 54;
      if (skip(x, z) || Math.hypot(x - 150, z - 318) < 16 || Math.hypot(x - 196, z - 338) < 34) continue;
      props.townHouse({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 9 + props.rand() * 3, depth: 9, storeys: 3, damaged: 0.05 });
      n++;
    }
    props.tanks({ x: 196, z: 330, yaw: 0, count: 2, radius: 9, height: 14, color: 0x6a6a62 });
    props.hall({ x: 196, z: 352, yaw: 0, width: 30, depth: 12, height: 10, color: BRICK, roof: 0x4a4c4e, door: 4, name: 'Powiśle power station' });
    props.chimney({ x: 216, z: 362, height: 34 });
    props.church({ x: 108, z: 350, yaw: -Math.PI / 2 });                                     // St Lazarus
    spire(112, 280, 5, 22, 10, 0xb8a888, 0x3e5a4c);

    // ---- Praga on the right bank: St Florian's twin spires, the Orthodox cathedral of St Mary Magdalene, tenements along
    // the street, warehouses at each bridgehead (the same each end)
    {
      props.rand = mulberry32(1888);
      props.hall({ x: 454, z: 4, yaw: Math.PI / 2, width: 30, depth: 13, height: 13, color: BRICK, roof: 0x4a4440, door: 3, name: 'St Florian’s' });
      for (const z of [-4, 12]) spire(442, z, 6, 40, 16, BRICK, 0x3e5a4c);
      const ox = 448, oz = 58;
      const b = props.beginBuilding('Orthodox cathedral', ox, oz, 0, 16, 16);
      b.plaster = 0xe6e2d8;
      props.shell(b, { height: 10, key: 'plaster', color: 0xe6e2d8, front: [0], left: [0], t: 0.8, bay: 3.4, sill: 2.2, head: 7.5, frame: 0xb8b0a0 });
      props.gableRoof(b, { eave: 10, pitch: 0.4, color: GREEN, t: 0.8 });
      props.endBuilding();
      onion(ox, b.ground + 13, oz, 3.4, GREEN);
      for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) onion(ox + dx, b.ground + 11.5, oz + dz, 1.4, GREEN);
      for (const s of [1, -1]) for (let z = 30; z <= 250; z += 14) {
        for (const side of [1, -1]) {
          const x = 420 + side * 21, zz = z * s;
          if (skip(x, zz) || Math.hypot(x - 450, zz - 4) < 24 || Math.hypot(x - ox, zz - oz) < 18 || nearPt(x, zz, 14)) continue;
          props.townHouse({ x, z: zz, yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2, width: 11, depth: 9, storeys: z < 150 ? 3 : 2, damaged: 0.05 });
        }
      }
      for (const s of [1, -1]) for (const [dx, dz] of [[-60, 26], [40, 26], [-60, -30], [40, -30]]) {
        const x = 420 + dx, z = BR * s + dz;
        if (!skip(x, z)) props.hall({ x, z, yaw: 0, width: 20, depth: 10, height: 6, color: 0x7a6a56, name: 'warehouse' });
      }
    }

    // ---- Sochaczew astride its bridge: houses on both banks, the church on the south bank, the town hall on the north
    props.rand = mulberry32(SEED + 1);
    for (let i = 0, n = 0; n < 22 && i < 600; i++) {
      const a = props.rand() * Math.PI * 2, d = 26 + props.rand() * 50, x = Math.cos(a) * d * 1.3, z = mid(x) + Math.sin(a) * d;
      if (skip(x, z) || Math.hypot(x - 40, z - mid(40) - 52) < 16 || Math.hypot(x + 40, z - mid(-40) + 52) < 14) continue;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.4 ? 1 : 0), damaged: 0.3 });
      n++;
    }
    props.church({ x: 40, z: mid(40) + 52, yaw: 0 });
    props.townHouse({ x: -40, z: mid(-40) - 52, yaw: Math.PI, width: 13, depth: 9, storeys: 2, name: 'town hall', damaged: 0.3 });
    // ---- Bolimów on its island: log houses round the church (the Rawka on one side, the Bzura on the other)
    props.rand = mulberry32(1915_01);
    for (let i = 0, n = 0; n < 9 && i < 400; i++) {
      const x = -300 + (props.rand() * 2 - 1) * 70, z = mid(x) + (props.rand() * 2 - 1) * 18;
      if (skip(x, z) || Math.hypot(x + 300, z - mid(-300)) < 14 || Math.hypot(x + 270, z - mid(-270)) < 12) continue;
      props.house({ x, z, yaw: 0, width: 7 + props.rand() * 2, depth: 6 });
      n++;
    }
    props.church({ x: -270, z: mid(-270), yaw: Math.PI / 2 });
    // ---- the west-flank villages: Raszyn and Babice, each round its church
    for (const p of [points[1], points[7]]) {
      farmVillage(props, p.x, p.z, 8, SEED * 10 + Math.round(p.z * 7), skip, 1.2);
      const s = p.z > 0 ? 1 : -1;
      if (!skip(p.x + 32, p.z + 22 * s)) props.church({ x: p.x + 32, z: p.z + 22 * s, yaw: s > 0 ? 0 : Math.PI });
    }

    // ---- the outer forts: brick casemated barracks dug in under earth at the gorge, brick caponiers in the ditch, the
    // gorge wall, a brick traverse on the rampart; both built the same
    for (const F of FORTS) {
      props.rand = mulberry32(1883);
      const toward = -F.s, { x: cx, z: cz } = F.c;
      const bz = cz - toward * 14, by = terrain.heightAt(cx, bz);
      props.hall({ x: cx, z: bz, yaw: F.f === 'nato' ? Math.PI : 0, width: 24, depth: 9, height: 4.4, color: BRICK, roof: 0x5c5a50, door: 3, name: 'casemate barracks' });
      props.box('plain', cx, by + 5.2, bz, 25, 1.2, 10, 0, 0x6a7046);                          // (earth over it)
      props.box('stone', cx, terrain.heightAt(cx, cz + toward * 8) + 1, cz + toward * 8, 14, 2, 4, 0, BRICK);   // a traverse for the guns
      cover.addBox({ x: cx, z: cz + toward * 8, yaw: 0, length: 14, thickness: 4, height: 2 });
      for (const a of [Math.atan2(toward, 0), Math.atan2(toward, 0) + 2.1, Math.atan2(toward, 0) - 2.1]) {
        const x = cx + Math.cos(a) * F.r, z = cz + Math.sin(a) * F.r, g = terrain.heightAt(x, z);
        props.box('stone', x, g + 1, z, 6, 2.6, 6, -a, BRICK);                                    // caponier
        cover.addBox({ x, z, yaw: -a, length: 6, thickness: 6, height: 2.6 });
      }
      for (const dx of [-22, 22]) props.lowWall({ x: cx + dx, z: cz - toward * 30, yaw: 0, length: 14, height: 2.6, color: BRICK });
    }

    // ---- the Citadel behind the German line (Alexander Citadel: brick walls, the Execution Gate, barracks) and the
    // Ujazdów barracks behind the Russian line: the same mass of brick each side
    {
      const { x, z, w, d } = CITADEL;
      for (const [dx, dz, yaw, L] of [[0, d / 2, 0, w], [0, -d / 2, 0, w], [w / 2, 0, Math.PI / 2, d], [-w / 2, 0, Math.PI / 2, d]] as const) {
        for (let t = -L / 2 + 2; t < L / 2; t += 4) {
          if (Math.abs(t) < 5 && dz > 0) continue;                                             // (the Execution Gate, toward the front)
          props.lowWall({ x: x + dx + (yaw ? 0 : t), z: z + dz + (yaw ? t : 0), yaw, length: 4.1, height: 4, color: BRICK });
        }
      }
      props.hall({ x, z: z - 8, yaw: 0, width: 36, depth: 10, height: 6, color: BRICK, roof: 0x4a4440, door: 3, name: 'Citadel barracks' });
      props.hall({ x: BARRACKS.x, z: BARRACKS.z, yaw: Math.PI, width: 36, depth: 10, height: 6, color: BRICK, roof: 0x4a4440, door: 3, name: 'Ujazdów barracks' });
      props.hall({ x: BARRACKS.x - 6, z: BARRACKS.z + 22, yaw: Math.PI, width: 30, depth: 10, height: 6, color: 0xa08a70, roof: 0x4a4440, door: 3, name: 'Ujazdów hospital' });
    }

    // ---- the bridges: Kierbedź's iron lattice girders, Poniatowski's gate towers at both ends
    for (const c of river.crossings.slice(0, 2)) {
      const yaw = river.yawOf(c), deck = 1.15;
      if (c.name.startsWith('Kierbedź')) {
        for (const u of [-5.2, 5.2]) {
          for (let vv = -HWV - 6; vv <= HWV + 6; vv += 4) { const p = river.at(c, u, vv); props.box('metal', p.x, deck + 2.6, p.z, 0.3, 5.2, 0.3, yaw, 0x3a3e40); }
          const a = river.at(c, u, 0); props.box('metal', a.x, deck + 5.3, a.z, 0.5, 0.5, HWV * 2 + 14, yaw, 0x3a3e40);
        }
      } else {
        for (const u of [-6.2, 6.2]) for (const vv of [-HWV - 14, HWV + 14]) {
          const p = river.at(c, u, vv), g = terrain.heightAt(p.x, p.z);
          props.box('stone', p.x, g + 5, p.z, 3.2, 10, 3.2, yaw, 0xc8bca0);
          cone(p.x, g + 10, p.z, 2.3, 4, 0x4a5a50, 4);
          cover.addBox({ x: p.x, z: p.z, yaw, length: 3.2, thickness: 3.2, height: 10 });
        }
      }
    }

    // ---- poplar rows along the roads out on the plain
    props.rand = mulberry32(1915);
    const crown = new THREE.CylinderGeometry(0.3, 1.0, 1, 7), sc = new THREE.Vector3();
    const poplar = (x: number, z: number) => {
      const h = 16 + props.rand() * 6, gy = terrain.heightAt(x, z), c = props.rand() < 0.25 ? 0x7a8236 : 0x4e6a2c, w = 1.1 + props.rand() * 0.4;
      props.box('plain', x, gy + h * 0.15, z, 0.4, h * 0.3, 0.4, 0, 0x4a4238);
      props.push('plain', crown, m4.compose(v.set(x, gy + h * 0.6, z), q.identity(), sc.set(w * 1.4, h * 0.75, w * 1.4)), c);
    };
    const rowOk = (x: number, z: number) => wetD(x, z) > 6 && roadD(x, z) > 5 && !inTown(x, z) && airD(x, z) > 15 && !nearPt(x, z, 34) && !trenchBand(x, z)
      && fortD(x, z) > 16 && Math.abs(x) < 495 && Math.abs(z) < 555 && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !praga(x, z);
    for (const row of ROADS.slice(0, 8)) for (let i = 0; i < row.length - 1; i++) {
      const [ax, az] = row[i], [bx, bz] = row[i + 1], L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L;
      for (let t = 4; t < L; t += 9) for (const s of [1, -1]) {
        const x = ax + (bx - ax) * t / L + nx * 6.5 * s, z = az + (bz - az) * t / L + nz * 6.5 * s;
        if (rowOk(x, z) && mulberry32(Math.round(x * 7 + z * 13))() < 0.85) poplar(x, z);
      }
    }

    // farmsteads, hay and field walls over each half of the plain
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm'];
    for (let tries = 0, n = 0; n < 100 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 130 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPt(x, z, 50) || skip(x, z) || woodField(x, z) > 0.5 || fortD(x, z) < 40 || inTown(x, z) || praga(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    // log piles for the dugouts behind each support line
    for (const s of [1, -1]) for (const bx of [-220, -60, 100]) {
      const x = bx * s, z = trenchZ(x, s > 0, 1) + 30 * s;
      if (!skip(x, z)) props.logPile({ x, z, yaw: 0.3, length: 7 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 3 || roadD(x, z) < 4.5 || airD(x, z) < 12 || fortD(x, z) < 26 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 34
        || Math.abs(x - CITADEL.x) < CITADEL.w / 2 + 4 && Math.abs(z - CITADEL.z) < CITADEL.d / 2 + 4 },
    ];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3600, hedges: 1000, autumn: 0, broadleaf: 0.7,
      forest: (x: number, z: number) => {
        if (wetD(x, z) < 3) return -1;
        if (trenchBand(x, z)) return 0.03;
        if (inTown(x, z)) return 0.05;                                       // garden trees
        if (marshAt(x, z) > 0.5) return 0.25;                               // alder and willow in the wet meadows
        if (wetD(x, z) < 35) return 0.22;                                   // willows along the water
        return woodField(x, z) > 0.5 ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
