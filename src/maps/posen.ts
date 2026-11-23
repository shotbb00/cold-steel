// Posen, a battle that never happened. In 1914 the Russian plan for the war on Germany looked past East Prussia and
// Galicia to the straight road to Berlin: across the Prussian province of Posen, over the Warta and on along the
// railway to Frankfurt an der Oder. The Grand Duke’s great “drive on Berlin” was planned for the autumn of 1914, but
// Łódź and the winter stopped it, and no Russian soldier came within sight of Posen. Here it is fought: the Russian
// armies (nato, 'ru') come up from the south-east, +z, against the German garrison of Festung Posen (pact, 'de') to the
// north. On the map: the Warta from base edge to base edge down the east side, broad and unfordable, with the Great
// Bridge from the old town to Ostrów Tumski (the cathedral’s twin spires on its island) and one bridge in each half
// (Starołęka, Główna); on the west bank the old town round its town hall tower and the parish church, the Kaiserschloss
// (the Imperial Castle, finished in 1910) with its great tower, and the Hauptbahnhof at the head of the railway to
// Berlin; the citadel, Fort Winiary, on its hill over the Warta, and in the Russian half one of the modern detached forts
// of the outer ring (Fort Dębiec) on the same hill, each a ring of earth rampart behind its ditch with brick casemates
// buried under the earth; and round the city flat Greater Poland farmland — manors in their parks, poplar avenues, the
// lakes of Kiekrz and Górka, villages round their churches, and the field trenches each side dug in August 1914.
// Not mirrored but fair: the Warta runs from one base edge to the other, so both sides hold the same length of it with
// one bridge each at the same distance (Starołęka for the Russians, Główna for the Germans) and the Great Bridge between
// them in the middle; each half has one fort on one hill of the same height at the same reach from its base, the same
// ditch, rampart and wire, an east-bank village at the same place, a west-flank village by its own lake, a manor and
// its park, one trench line at the same depth and its own woods cut to the same area. The neutral middle: the
// Hauptbahnhof at the railhead, the Kaiserschloss, and Ostrów Tumski across the Great Bridge, all on the half line.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { createLakes } from '../world/Lakes.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const SEED = 1914_09;
const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const HWW = 20;                                              // the Warta: broad, deep, no fords
const noise = createNoise2D(SEED);

// ---- the Warta, down the east side; three bridges
const WX = (z: number) => 160 + 14 * Math.sin(z * 0.006 + 0.5) + 6 * Math.sin(z * 0.017);
const WARTA: number[][] = [];
for (let z = -640; z <= 640; z += 40) WARTA.push([WX(z), z, HWW]);
const BR = 300;
const river = createRiver({
  paths: [WARTA], halfWidth: HWW, level: 0, depth: 2.6, valley: 70,
  crossings: [
    { name: 'Starołęka bridge', x: WX(BR), z: BR, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Główna bridge', x: WX(-BR), z: -BR, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Great Bridge (Chwaliszewo)', x: WX(0), z: 0, kind: 'bridge', width: 9, channel: 0 },
  ],
});
// the lakes on the west flank, one each half: Kiekrz (German), Górka (Russian), long and narrow north–south
const lakes = createLakes({ lakes: [
  { x: -440, z: -175, rx: 32, rz: 68, rot: 0.12, depth: 3.5, seed: 2 },
  { x: -440, z: 175, rx: 32, rz: 68, rot: -0.12, depth: 3.5, seed: 5 },
] });
const vD = (x: number, z: number) => Math.abs(x - WX(z));
/** m from the nearest water's edge (negative: in it); the lakes roughly. */
const wetD = (x: number, z: number) => Math.min(vD(x, z) - HWW, (lakes.q(x, z) - 1) * 40);
const eastBank = (x: number, z: number) => x > WX(z);
const natoHalf = (_x: number, z: number) => z > 0;

// ---- the points
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Schrimm road', 0, 470, 'centre'),
  P('B', 'Luboń', -400, 310, 'west', { radius: 26 }),
  P('C', 'Fort Dębiec', 20, 270, 'centre', { radius: 28 }),
  P('D', 'Starołęka', 330, 300, 'east', { radius: 28 }),
  P('E', 'Hauptbahnhof', -330, 0, 'west', { radius: 28 }),
  P('F', 'Kaiserschloss', -110, 0, 'centre', { radius: 30 }),
  P('G', 'Ostrów Tumski', 320, 0, 'east', { radius: 30 }),
  P('H', 'Kiekrz', -400, -310, 'west', { radius: 26 }),
  P('I', 'Citadel (Fort Winiary)', 20, -270, 'centre', { radius: 28 }),
  P('J', 'Główna', 330, -300, 'east', { radius: 28 }),
  P('K', 'Obornik road', 0, -470, 'centre'),
] as any[];
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the roads: the centre road and the two flank roads (west through the Hauptbahnhof, east bank through Ostrów
// Tumski) from base to base; each side's lane through its village and fort to its bridge; the middle street from the
// station through the Kaiserschloss and the old town over the Great Bridge
const LANE = (s: number) => [[-525, 320 * s], [-400, 310 * s], [-250, 292 * s], [20, 270 * s], [100, 300 * s], [330, BR * s], [520, BR * s]];
const ROADS: number[][][] = [
  [[0, 600], [0, 470], [14, 360], [-8, 200], [-30, 80], [-30, 0]],
  [[0, -600], [0, -470], [-14, -360], [8, -200], [-30, -80], [-30, 0]],
  [[-330, 600], [-330, -600]],
  [[330, 600], [330, -600]],
  LANE(1), LANE(-1),
  [[-330, 0], [520, 0]],
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

// the railway to Berlin: in from the west edge along the half line to the Hauptbahnhof's terminus, two sidings
const RAIL_END = -372;
const railD = (x: number, z: number) => (x > RAIL_END + 4 ? 99 : Math.abs(z) - (x > -470 ? 8 : 0));
const STATION = { x: -356, z: 0 };

// each side's airfield on the open plain behind its fort (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip)
const AIR = [{ faction: 'nato', x: -185, z: 395, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -185, z: -395, yaw: -Math.PI / 2, large: false }];
const airD1 = (a: any, x: number, z: number) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52));
const airD = (x: number, z: number) => Math.min(airD1(AIR[0], x, z), airD1(AIR[1], x, z));

// ---- the forts: a ring rampart, the ditch outside it, two gates on the lane, the top graded flat
const FORTS = [points[2], points[8]].map((p) => {
  const s = p.z > 0 ? 1 : -1, c = { x: p.x, z: p.z }, gates = [[-250, 292 * s], [100, 300 * s]];
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
/** [x, z, r, h]: the fort hills (Winiary, Dębiec) over the Warta, a gentle rise on each west flank. */
const RISES = [[20, 270, 150, 8], [20, -270, 150, 8], [-380, 440, 110, 3], [-380, -440, 110, 3]];
const marshAt = gridCache((x: number, z: number) => (!eastBank(x, z) ? 0 : smoothstep(0.1, 0.35, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * (1 - smoothstep(45, 95, vD(x, z)))), { x: 520, z: 580 }, 4);
function open(x: number, z: number) {
  const dV = vD(x, z), n = fbm(noise, x * 0.004 + (natoHalf(x, z) ? 0 : 40), z * 0.004, 4);
  let h: number;
  if (eastBank(x, z)) h = 1.2 + smoothstep(30, 70, dV) * (1.9 + n * 0.8) + smoothstep(140, 300, dV) * 1.5;   // the low right-bank terrace
  else {
    let relief = 3 + n * 2.6 + fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 0.7;
    for (const [hx, hz, r, hh] of RISES) relief += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
    relief += 4 * smoothstep(45, 95, dV);                                                                 // the Warta's left-bank bluff
    h = 1.2 + smoothstep(28, 60, dV) * relief;
  }
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 6 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, -x) * 10;
  return h;
}
const FTOP = FORTS.map((F) => open(F.c.x, F.c.z)), ATOP = AIR.map((a) => open(a.x, a.z + 27 * Math.sign(a.z)));
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = open(x, z);
  const dV = vD(x, z);
  h += (1.4 - h) * marshAt(x, z) * 0.8;                                                                   // the Warta meadows
  for (const bz of [BR, -BR, 0]) h += (Math.min(h, 1.3 + Math.max(0, dV - 20) * 0.07) - h) * (1 - smoothstep(6, 18, Math.abs(z - bz))) * (1 - smoothstep(120, 170, dV)); // (the bridge ramps)
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  AIR.forEach((a, i) => { h += (ATOP[i] - h) * smoothstep(40, 4, airD1(a, x, z)); });
  FORTS.forEach((F, i) => { h += (FTOP[i] - h) * smoothstep(F.r + 30, F.r + 6, Math.hypot(x - F.c.x, z - F.c.z)); });
  return h;
}, { x: 640, z: 700 }, 4);
function height(x: number, z: number) {
  let h = ground(x, z);
  const fd = fortD(x, z);
  if (fd < 8 && fd > -16) { const [d, r] = works(x, z); h += 2.4 * r - 3 * d; }
  return lakes.carve(x, z, river.carve(x, z, Math.max(1.4, h)));
}

/** Each side's field trench line across the plain, 1914 style: one fire trench, the same depth from the half line. */
const trenchZ = (x: number, nato: boolean) => (nato ? 150 + 10 * Math.sin(x * 0.017) : -152 - 10 * Math.sin(x * 0.013 + 2));
const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, natoHalf(x, z))) < 28;

// ---- the towns: the old town (by F), Ostrów Tumski and Śródka (G), Starołęka (D), Główna (J), the station yard
const CASTLE = { x: -110, z: 0 };
const OLD = { x: 45, z: 0 };
const TOWNS = [{ x: OLD.x, z: 0, r: 80 }, { x: 300, z: 0, r: 80 }, { x: 330, z: 300, r: 60 }, { x: 330, z: -300, r: 60 }, { x: STATION.x, z: 0, r: 34 }];
const inTown = (x: number, z: number, pad = 0) => TOWNS.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + pad);
const castleD = (x: number, z: number) => Math.max(Math.abs(x - CASTLE.x) - 28, Math.abs(z - CASTLE.z) - 26);
// a manor in its park each side: on the west plain behind the trench line, and its brother on the east bank
const MANORS = [{ x: -190, z: 225 }, { x: -190, z: -225 }, { x: 440, z: 150 }, { x: 440, z: -150 }];
const manorD = (x: number, z: number) => Math.min(...MANORS.map((m) => Math.hypot(x - m.x, z - m.z)));

// ---- woods: copses over each half, cut to the same area
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const T_N = 0.22, T_P = evenThreshold(wn, T_N, natoHalf);
const woodField = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 8 || fortD(x, z) < 45 || airD(x, z) < 25 || Math.hypot(x, Math.abs(z) - BASE_Z) < 60 || inTown(x, z, 20) || castleD(x, z) < 20 || railD(x, z) < 12) return 0;
  return x < -480 || wn(x, z) > (natoHalf(x, z) ? T_N : T_P) ? 1 : 0;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'posen',
  name: 'Posen',
  description: 'Autumn 1914, as it might have been: the Russian drive on Berlin reaches Festung Posen. The Warta with its bridges, the old town’s spires, Ostrów Tumski’s cathedral and the new Kaiserschloss, the citadel on Winiary hill and a detached fort of the outer ring behind their ditches, the railway to Berlin, and flat Greater Poland farmland of manors, poplar avenues, lakes and villages.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de'] }, // (the hypothetical Russian drive on Berlin; the German garrison of Festung Posen)
  sides: { nato: 'Russia', pact: 'Germany' },
  conditions: { time: 'day', weather: 'clear' }, // (a dry September day over the stubble)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 80, weights: [0.25, 0.25, 0.3, 0.2] as any }),

  theme: {
    // a clear early-autumn day over the Greater Poland plain
    fogColor: 0xbec0b4, fogDensity: 0.0011, skyTop: 0x5884b2, skyHorizon: 0xd2d4c8, skyBottom: 0x888676,
    sunColor: 0xfff0d6, sunIntensity: 1.85, sunDisk: 0.3, clouds: 0.35, cloudLight: 0xf2f0ea, cloudDark: 0x9aa0a6,
    sunDir: [0.5, 0.55, 0.45], hemiSky: 0xc8ced6, hemiGround: 0x5a5a3c, hemiIntensity: 1.25, rimColor: 0xc8ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#66763e', grassAlt: '#5c6c38', dryGrass: '#a89c64', dirt: '#6a5a44', rock: '#8a867c', strip: '#5a4c38',
      pasture: '#64743c', ploughed: '#6a5a44', stubble: '#b8aa6a', meadow: '#6a7a40',
      farmX: [460, 600], farmZ: [520, 640], roads: [-330, 0, 330], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return inTown(x, z) || castleD(x, z) < 8 ? [0x7a766c, 0.9] : [0x8a7a5c, 0.85];   // cobbles in the city, dust on the avenues
        if (railD(x, z) < 2.4 && x > -520) return [0x4e4a44, 0.8];                             // ballast
        const fd = fortD(x, z);
        if (fd < 8 && fd > -16) { const [d] = works(x, z); if (d > 0.3) return [0x5e5442, 0.8]; }   // the fort ditches
        if (fd < 0) return [0x6e7448, 0.5];                                                    // the forts' turf
        if (y < 1.6 && wetD(x, z) < 10) return [0x6a6a48, 0.85];                              // the reedy banks
        const m = marshAt(x, z);
        if (m > 0.3) return [0x4e5a32, Math.min(0.85, m)];                                    // the Warta's wet meadows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-330, 0, 330] }, pact: { x: 0, z: -BASE_Z, entries: [-330, 0, 330] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side's field trench (two belts of wire before it), the fort wire, MGs at the roads, a few shell holes; nothing in ruins yet. */
  battlefield(_game: any) {
    const out: any[] = [];
    const ok = (w: any) => wetD(w.x, w.z) > 10 && airD(w.x, w.z) > 15 && roadD(w.x, w.z) > 7 && fortD(w.x, w.z) > 14 && !nearPt(w.x, w.z, 28) && !inTown(w.x, w.z, -20) && manorD(w.x, w.z) > 30;
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 22, belts: 2, gapEvery: 70 })) if (ok(w)) out.push(w);
      for (const bx of [-330, -30, 330]) out.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    for (const F of FORTS) {
      for (const off of [10, 16]) {
        const R = F.r + off, n = Math.round((2 * Math.PI * R) / 10.2);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          if (F.ga.some((g) => angGap(a, g) * R < 11)) continue;
          const x = F.c.x + Math.cos(a) * R, z = F.c.z + Math.sin(a) * R;
          if (roadD(x, z) > 5 && airD(x, z) > 10 && wetD(x, z) > 6) out.push({ kind: 'wire', x, z, yaw: -a + Math.PI / 2, faction: F.f });
        }
      }
      for (const da of [-0.9, 0.9]) {
        const a = Math.atan2(-F.s, 0) + da, R = F.r - 9;
        out.push({ kind: 'mgNest', x: F.c.x + Math.cos(a) * R, z: F.c.z + Math.sin(a) * R, yaw: F.f === 'nato' ? Math.PI : 0, faction: F.f });
      }
    }
    const dens = (_x: number, z: number) => { const dz = Math.abs(z) - 80; return 0.35 * Math.exp(-((dz / 50) ** 2)) + 0.02; };
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b: number[]) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => wetD(b[0], b[1]) > 10 && airD(b[0], b[1]) > 15 && !onRoad(b[0], b[1]) && fortD(b[0], b[1]) > 10 && !nearPt(b[0], b[1], 35) && !inTown(b[0], b[1]) && castleD(b[0], b[1]) > 10 && railD(b[0], b[1]) > 6);
    return { blasts, ruins: [], works: out };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const skip = (x: number, z: number) => wetD(x, z) < 10 || roadD(x, z) < 8 || trenchBand(x, z) || fortD(x, z) < 14 || airD(x, z) < 25
      || castleD(x, z) < 6 || railD(x, z) < 9 || manorD(x, z) < 26;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const BRICK = 0x8a4a36, GREEN = 0x4a7a64, SAND = 0xb8a888;
    const cone = (x: number, y: number, z: number, r: number, h: number, color: number, sides = 8) => {
      m4.compose(v.set(x, y + h / 2, z), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r, h, sides), m4, color);
    };
    /** A tall spired tower (cover at its foot). */
    const spire = (x: number, z: number, w: number, h: number, sh: number, color: number, roof: number, sides = 8) => {
      const g = terrain.heightAt(x, z) - 0.5;
      props.box('stone', x, g + h / 2, z, w, h, w, 0, color);
      props.box('metal', x, g + h - 3, z, w + 0.05, 1.6, w * 0.3, 0, 0x22201e);
      cone(x, g + h, z, w * 0.72, sh, roof, sides);
      cover.addBox({ x, z, yaw: 0, length: w, thickness: w, height: h });
    };

    // ---- the old town between the Kaiserschloss and the Warta: tall burghers' houses round the market, the Renaissance
    // town hall and its tower in the square, the baroque parish church (the Fara) to the north, the Franciscans' to the south
    props.rand = mulberry32(1550);
    const RATUSZ = { x: OLD.x, z: 22 }, FARA = { x: OLD.x - 20, z: -46 }, FRANC = { x: OLD.x - 20, z: 46 };
    for (let i = 0, n = 0; n < 26 && i < 900; i++) {
      const x = OLD.x + (props.rand() * 2 - 1) * 72, z = (props.rand() * 2 - 1) * 70;
      if (skip(x, z) || Math.hypot(x - RATUSZ.x, z - RATUSZ.z) < 22 || Math.hypot(x - FARA.x, z - FARA.z) < 18 || Math.hypot(x - FRANC.x, z - FRANC.z) < 16) continue;
      props.townHouse({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 8 + props.rand() * 3, depth: 9, storeys: 3, damaged: 0.03 });
      n++;
    }
    props.hall({ x: RATUSZ.x, z: RATUSZ.z, yaw: 0, width: 22, depth: 12, height: 10, color: 0xe0d6b8, roof: 0x7a3a2c, door: 3, name: 'town hall' });
    spire(RATUSZ.x, RATUSZ.z, 5, 30, 12, 0xe0d6b8, 0x3e5a4c);                                     // the town hall tower
    props.hall({ x: FARA.x, z: FARA.z, yaw: Math.PI / 2, width: 26, depth: 14, height: 13, color: 0xd8a890, roof: 0x5a4a40, door: 4, name: 'parish church (Fara)' });
    for (const dz of [-5, 5]) spire(FARA.x + dz, FARA.z + 15, 4, 24, 6, 0xd8a890, 0x3e5a4c);
    props.church({ x: FRANC.x, z: FRANC.z, yaw: 0 });                                            // the Franciscans

    // ---- the Kaiserschloss: four grey sandstone ranges round the court (gateways through the side ranges on the
    // street), the great tower on the town side, a tall hipped roof of slate
    {
      const { x: cx, z: cz } = CASTLE, stone = 0x9a9488, slate = 0x3e4246;
      for (const s of [1, -1]) props.hall({ x: cx, z: cz + 20 * s, yaw: 0, width: 52, depth: 11, height: 14, color: stone, roof: slate, door: 4, name: 'Kaiserschloss' });
      for (const [dx, dz] of [[-23, 1], [-23, -1], [23, 1], [23, -1]]) props.hall({ x: cx + dx, z: cz + 12 * dz, yaw: Math.PI / 2, width: 10, depth: 10, height: 14, color: stone, roof: slate, door: 3, name: 'Kaiserschloss' });
      const tx = cx + 23, tz = cz - 22, g = terrain.heightAt(tx, tz) - 0.5;                      // the tower over the north-east corner
      props.box('stone', tx, g + 21, tz, 10, 42, 10, 0, stone);
      for (const [ox, oz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) cone(tx + ox, g + 42, tz + oz, 1.2, 5, slate, 6);
      cone(tx, g + 42, tz, 7.4, 12, slate, 4);
      cover.addBox({ x: tx, z: tz, yaw: 0, length: 10, thickness: 10, height: 42 });
    }

    // ---- Ostrów Tumski: the cathedral's twin spires facing the Great Bridge, the archbishop's palace, St Mary's; Śródka's
    // houses round the square beyond
    {
      const KX = 250, KZ = -26;
      props.hall({ x: KX + 14, z: KZ, yaw: 0, width: 34, depth: 14, height: 15, color: BRICK, roof: 0x4a4440, door: 3, name: 'cathedral' });
      for (const dz of [-5, 5]) spire(KX - 6, KZ + dz, 6, 30, 14, BRICK, 0x2e3a34);
      props.hall({ x: 262, z: 30, yaw: 0, width: 26, depth: 11, height: 9, color: 0xd8ccb0, roof: 0x7a3a2c, door: 3, name: 'archbishop’s palace' });
      props.church({ x: 236, z: 28, yaw: Math.PI });                                             // St Mary's
      props.rand = mulberry32(1231);
      for (let i = 0, n = 0; n < 18 && i < 800; i++) {
        const x = 330 + (props.rand() * 2 - 1) * 70, z = (props.rand() * 2 - 1) * 70;
        if (skip(x, z) || x < 296 || nearPt(x, z, 14)) continue;                                 // (clear of the cathedral and the palace)
        props.townHouse({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 8 + props.rand() * 3, depth: 9, storeys: 2 + (props.rand() < 0.4 ? 1 : 0), damaged: 0.03 });
        n++;
      }
    }

    // ---- the east-bank villages, Starołęka and Główna, round their churches (built the same)
    for (const p of [points[3], points[9]]) {
      const s = p.z > 0 ? 1 : -1;
      farmVillage(props, p.x, p.z, 10, SEED * 10 + Math.round(p.z * 3), skip, 1.3);
      if (!skip(p.x + 34, p.z + 24 * s)) props.church({ x: p.x + 34, z: p.z + 24 * s, yaw: s > 0 ? 0 : Math.PI });
    }
    // ---- the west-flank villages by the lakes: Luboń and Kiekrz
    for (const p of [points[1], points[7]]) {
      const s = p.z > 0 ? 1 : -1;
      farmVillage(props, p.x, p.z, 8, SEED * 10 + Math.round(p.z * 7), skip, 1.2);
      if (!skip(p.x + 32, p.z + 22 * s)) props.church({ x: p.x + 32, z: p.z + 22 * s, yaw: s > 0 ? 0 : Math.PI });
    }

    // ---- the manors: the white house with its portico, the walled farmyard behind, a lime avenue up to the door
    for (const m of MANORS) {
      const s = m.z > 0 ? 1 : -1;
      props.hall({ x: m.x, z: m.z, yaw: 0, width: 22, depth: 11, height: 7, color: 0xe4dcc8, roof: 0x6a4030, door: 4, name: 'manor' });
      for (const dx of [-3, 3]) { const g = terrain.heightAt(m.x + dx, m.z - 7 * s); m4.compose(v.set(m.x + dx, g + 3, m.z - 7 * s), q.identity(), one); props.push('stone', new THREE.CylinderGeometry(0.4, 0.45, 6, 8), m4, 0xe8e2d0); }
      for (const [dx, dz, yaw, length] of [[0, 32, 0, 34], [-17, 23, Math.PI / 2, 18], [17, 23, Math.PI / 2, 18]] as const) props.wall({ x: m.x + dx, z: m.z + dz * s, yaw, length, height: 1.8 });
      props.hall({ x: m.x, z: m.z + 24 * s, yaw: 0, width: 26, depth: 7, height: 5, color: 0x8a6a50, roof: 0x5a4434, door: 4, name: 'manor barn' });
    }

    // ---- the forts, built the same: brick casemated barracks buried under earth at the gorge, caponiers in the ditch,
    // a traverse for the guns on the rampart, the gorge wall; the citadel's brick keep (the Kernwerk) on Winiary hill
    for (const F of FORTS) {
      const toward = -F.s, { x: cx, z: cz } = F.c;
      const bz = cz - toward * 14, by = terrain.heightAt(cx, bz);
      props.hall({ x: cx, z: bz, yaw: F.f === 'nato' ? Math.PI : 0, width: 24, depth: 9, height: 4.4, color: BRICK, roof: 0x5c5a50, door: 3, name: F.f === 'pact' ? 'Kernwerk casemates' : 'casemate barracks' });
      props.box('plain', cx, by + 5.2, bz, 25, 1.2, 10, 0, 0x6a7046);                          // (earth over it)
      props.box('stone', cx, terrain.heightAt(cx, cz + toward * 8) + 1, cz + toward * 8, 14, 2, 4, 0, BRICK);
      cover.addBox({ x: cx, z: cz + toward * 8, yaw: 0, length: 14, thickness: 4, height: 2 });
      for (const a of [Math.atan2(toward, 0), Math.atan2(toward, 0) + 2.1, Math.atan2(toward, 0) - 2.1]) {
        const x = cx + Math.cos(a) * F.r, z = cz + Math.sin(a) * F.r, g = terrain.heightAt(x, z);
        props.box('stone', x, g + 1, z, 6, 2.6, 6, -a, BRICK);                                    // caponier
        cover.addBox({ x, z, yaw: -a, length: 6, thickness: 6, height: 2.6 });
      }
      for (const dx of [-22, 22]) props.lowWall({ x: cx + dx, z: cz - toward * 30, yaw: 0, length: 14, height: 2.6, color: BRICK });
    }

    // ---- the Hauptbahnhof: the terminus hall across the tracks, the railway to Berlin west along the half line,
    // two sidings with wagons, a water tower
    props.hall({ x: STATION.x, z: STATION.z, yaw: Math.PI / 2, width: 34, depth: 12, height: 9, color: 0xa86a50, roof: 0x4a4c4e, door: 4, name: 'railway station' });
    props.rails({ x0: -520, z0: 0, x1: RAIL_END, z1: 0 });
    for (const s of [1, -1]) {
      props.rails({ x0: -470, z0: 8 * s, x1: RAIL_END, z1: 8 * s });
      props.rails({ x0: -490, z0: 0, x1: -470, z1: 8 * s });
      for (const x of [-450, -436, -422]) props.wagon({ x, z: 8 * s, yaw: Math.PI / 2, color: s > 0 ? 0x5a3426 : 0x4a4e3e });
    }
    {
      const tx = -395, tz = 20, g = terrain.heightAt(tx, tz);
      m4.compose(v.set(tx, g + 5, tz), q.identity(), one); props.push('stone', new THREE.CylinderGeometry(1.8, 2, 10, 10), m4, BRICK);
      m4.compose(v.set(tx, g + 11.5, tz), q.identity(), one); props.push('metal', new THREE.CylinderGeometry(3, 3, 3, 12), m4, 0x4a4e50);
      cover.addCylinder({ x: tx, z: tz, radius: 2, height: 10 });
    }

    // ---- the Great Bridge's iron lattice girders; stone piers at the ends of the other two
    for (const c of river.crossings) {
      const yaw = river.yawOf(c), deck = 1.15;
      if (c.name.startsWith('Great')) {
        for (const u of [-5.2, 5.2]) {
          for (let vv = -HWW - 6; vv <= HWW + 6; vv += 4) { const p = river.at(c, u, vv); props.box('metal', p.x, deck + 2.6, p.z, 0.3, 5.2, 0.3, yaw, 0x3a3e40); }
          const a = river.at(c, u, 0); props.box('metal', a.x, deck + 5.3, a.z, 0.5, 0.5, HWW * 2 + 14, yaw, 0x3a3e40);
        }
      } else {
        for (const u of [-5.4, 5.4]) for (const vv of [-HWW - 12, HWW + 12]) {
          const p = river.at(c, u, vv), g = terrain.heightAt(p.x, p.z);
          props.box('stone', p.x, g + 1.2, p.z, 1.4, 2.4, 1.4, yaw, SAND);
        }
      }
    }

    // ---- poplar avenues along the roads out on the plain
    props.rand = mulberry32(1914);
    const crown = new THREE.CylinderGeometry(0.3, 1.0, 1, 7), sc = new THREE.Vector3();
    const poplar = (x: number, z: number) => {
      const h = 16 + props.rand() * 6, gy = terrain.heightAt(x, z), c = props.rand() < 0.3 ? 0x8a8a3a : 0x4e6a2c, w = 1.1 + props.rand() * 0.4;
      props.box('plain', x, gy + h * 0.15, z, 0.4, h * 0.3, 0.4, 0, 0x4a4238);
      props.push('plain', crown, m4.compose(v.set(x, gy + h * 0.6, z), q.identity(), sc.set(w * 1.4, h * 0.75, w * 1.4)), c);
    };
    const rowOk = (x: number, z: number) => wetD(x, z) > 6 && roadD(x, z) > 5 && !inTown(x, z) && airD(x, z) > 15 && !nearPt(x, z, 34) && !trenchBand(x, z)
      && fortD(x, z) > 16 && Math.abs(x) < 495 && Math.abs(z) < 555 && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && castleD(x, z) > 8 && railD(x, z) > 6 && manorD(x, z) > 24;
    const avenue = (row: number[][], every: number) => {
      for (let i = 0; i < row.length - 1; i++) {
        const [ax, az] = row[i], [bx, bz] = row[i + 1], L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L;
        for (let t = 4; t < L; t += every) for (const s of [1, -1]) {
          const x = ax + (bx - ax) * t / L + nx * 6.5 * s, z = az + (bz - az) * t / L + nz * 6.5 * s;
          if (rowOk(x, z) && mulberry32(Math.round(x * 7 + z * 13))() < 0.85) poplar(x, z);
        }
      }
    };
    for (const row of ROADS) avenue(row, 9);
    for (const m of MANORS) { const s = m.z > 0 ? 1 : -1; avenue([[m.x, m.z - 14 * s], [m.x, m.z - 70 * s]], 8); }   // (the drive up to each manor)

    // farmsteads, hay and field walls over each half of the plain
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm'];
    for (let tries = 0, n = 0; n < 90 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.abs(z) < 60 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPt(x, z, 50) || skip(x, z) || woodField(x, z) > 0.5 || fortD(x, z) < 40 || inTown(x, z) || castleD(x, z) < 30 || manorD(x, z) < 45) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    lakes.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 3 || roadD(x, z) < 4.5 || airD(x, z) < 12 || fortD(x, z) < 26 || castleD(x, z) < 6 || railD(x, z) < 6 || manorD(x, z) < 20 },
    ];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3600, hedges: 900, autumn: 0.15, broadleaf: 0.65,
      forest: (x: number, z: number) => {
        if (wetD(x, z) < 3) return -1;
        if (trenchBand(x, z)) return 0.03;
        if (inTown(x, z)) return 0.05;                                       // garden trees
        if (manorD(x, z) < 70) return 0.5;                                   // the manor parks
        if (marshAt(x, z) > 0.5) return 0.25;                               // alder and willow in the meadows
        if (wetD(x, z) < 35) return 0.22;                                   // willows along the water
        return woodField(x, z) > 0.5 ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
