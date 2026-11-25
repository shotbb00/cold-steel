// St Mihiel, 12 September 1918: the first all-American offensive. Pershing’s First Army goes over at five in the morning
// after four hours of the guns, in rain and mud, against the salient the Germans had held since 1914 — Patton’s Renault
// FT tanks of the US Tank Corps grinding through the old wire, Billy Mitchell’s armada of nearly 1,500 aircraft overhead.
// The Germans were already pulling back to the Michel Stellung; by the next morning the pincers met at Vigneulles and the
// salient was gone.
// On the map: the flat, wet Woëvre plain with its marshy hollows; the Rupt de Mad brook winding across it from south-west to
// north-east, Thiaucourt on it in the middle, its fords and bridges; Montsec, the bare butte the Germans watched the whole
// plain from, on the west; the Butte de Mousson, the Allies’ own observation hill over the Moselle flank, on the east; the
// Côtes de Meuse rising along the west edge and the Moselle hills along the east; Xivray, Seicheprey and Limey on the
// American side (south, +z), Vigneulles, Nonsard and Jaulny on the German (north); the Bois de la Sonnard behind the
// American front, the Bois de Mort-Mare behind the German; four years of trenches and wire either side of the brook, the
// Michel Stellung’s concrete behind the German lines and the old French line behind the American.
// Not mirrored but fair: the brook runs between the sides, turned half a circle about the middle, so each side meets it
// as close to its base and has the same crossings at the same places (a ford on each flank, a bridge and a ford on each
// wing, Thiaucourt’s bridge in the middle). Montsec stands on the German side of the brook in the west and the Butte de
// Mousson on the American side in the east: the same height, the same distance from their bases (Montsec a round butte
// with a flat top, Mousson a long ridge), each one bridge away from the other side. Each side has three villages as far
// back, a named wood of the same size behind its front, a smaller one on its far flank, two trench lines at the same
// depth from the brook and a rear line, and its airfield behind its flank.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, shellField, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, segDist, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1918_09);
const MUD = new THREE.Color(0x4e4436);   // Woëvre clay, wet

// ---- the Rupt de Mad, south-west to north-east through Thiaucourt (turned half a circle about the middle, each half its own wander)
const RUPT = [[-570, 262, 6], [-440, 222, 6], [-330, 180, 6], [-230, 130, 6], [-120, 60, 7], [0, 0, 7], [115, -48, 7], [235, -118, 7], [335, -186, 8], [445, -206, 8], [570, -272, 8]];
/** The brook’s z at x. */
const brookZ = (x: number) => {
  for (let i = 0; i < RUPT.length - 1; i++) if (x <= RUPT[i + 1][0]) return RUPT[i][1] + (RUPT[i + 1][1] - RUPT[i][1]) * (x - RUPT[i][0]) / (RUPT[i + 1][0] - RUPT[i][0]);
  return RUPT[RUPT.length - 1][1];
};
const XING: [string, number, string][] = [
  ['Lahayville ford', -440, 'ford'], ['Richecourt bridge', -270, 'bridge'], ['Euvezin ford', -135, 'ford'], ['Thiaucourt bridge', 0, 'bridge'],
  ['Bouillonville ford', 135, 'ford'], ['Viéville bridge', 270, 'bridge'], ['Remenauville ford', 440, 'ford'],
];
const river = createRiver({
  path: RUPT, halfWidth: 7, level: 0, depth: 2.4, valley: 40,
  crossings: XING.map(([name, x, kind]) => ({ name, x, z: brookZ(x), kind, width: 8 })),
});
const wetD = (x: number, z: number) => river.project(x, z).d;

// ---- the points
const MONTSEC = { x: -270, z: -45 }, MOUSSON = { x: 320, z: 48 };
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points: ControlPointDef[] = [
  P('A', 'Beaumont', 0, 470, 'centre'),
  P('B', 'Xivray', -340, 330, 'west'),
  P('C', 'Seicheprey', 60, 320, 'centre'),
  P('D', 'Limey', 330, 300, 'east'),
  P('E', 'Montsec', MONTSEC.x, MONTSEC.z, 'west', { radius: 30 }),
  P('F', 'Thiaucourt', 0, 8, 'centre', { radius: 28 }),
  P('G', 'Butte de Mousson', MOUSSON.x, MOUSSON.z, 'east', { radius: 30 }),
  P('H', 'Vigneulles', -290, -280, 'west'),
  P('I', 'Nonsard', -110, -360, 'centre'),
  P('J', 'Jaulny', 300, -285, 'east'),
  P('K', 'Michel Stellung', 0, -470, 'centre'),
];
const pt = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };

// ---- the roads: Beaumont – Seicheprey – Thiaucourt – Nonsard up the middle, one over each wing bridge, the lanes behind each front
const ROADS = [
  [[0, 580], [0, 470], pt('C'), [30, 160], [8, brookZ(0) + 30], [0, brookZ(0)], pt('F'), [-8, brookZ(0) - 30], [-40, -160], pt('I'), [0, -470], [0, -580]],
  [[-300, 580], pt('B'), [-270, brookZ(-270) + 40], [-270, brookZ(-270)], [-270, brookZ(-270) - 40], [MONTSEC.x - 70, MONTSEC.z + 30], [-320, -150], pt('H'), [-300, -580]],
  [[300, -580], pt('J'), [270, brookZ(270) - 40], [270, brookZ(270)], [270, brookZ(270) + 40], [MOUSSON.x + 70, MOUSSON.z - 30], [320, 150], pt('D'), [300, 580]],
  [pt('B'), [-140, 350], pt('C'), [200, 330], pt('D')],
  [pt('H'), [-200, -340], pt('I'), [150, -320], pt('J')],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

// each side’s airfield behind its west/east flank (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: -215, z: 410, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 215, z: -410, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

// ---- the ground: the flat Woëvre with wet hollows, the two buttes, the Côtes de Meuse (west) and the Moselle hills (east) at the edges
const montsecK = (x: number, z: number) => smoothstep(135, 50, Math.hypot(x - MONTSEC.x, z - MONTSEC.z));           // a round butte, steep, flat-topped
const moussonK = (x: number, z: number) => {                                                                         // a long ridge, north-west to south-east
  const dx = x - MOUSSON.x, dz = z - MOUSSON.z, c = Math.cos(0.5), s = Math.sin(0.5);
  return smoothstep(1, 0.32, Math.hypot((dx * c - dz * s) / 175, (dx * s + dz * c) / 88));
};
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 3.5 + fbm(noise, x * 0.0028, z * 0.0028, 3) * 2.2 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.35;
  h += 21 * montsecK(x, z) + fbm(noise, x * 0.03 + 3, z * 0.03, 2) * 1.2 * montsecK(x, z);
  h += 21 * moussonK(x, z) + fbm(noise, x * 0.03 - 9, z * 0.03, 2) * 1.2 * moussonK(x, z);
  h += smoothstep(420 + 30 * Math.sin(z * 0.009), 560, -x) * 28;                // the Côtes de Meuse
  h += smoothstep(450 + 40 * Math.sin(z * 0.017 + 2), 580, x) * 14;             // the Moselle hills
  h += smoothstep(540, 660, Math.abs(z)) * 12;
  for (const p of points) if (p.id !== 'E' && p.id !== 'G') h += (3.5 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (4 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));
/** The marshy hollows of the Woëvre (0..1): low ground off the hills, each half its own. */
const marsh = (x: number, z: number) => smoothstep(0.15, 0.35, fbm(noise, x * 0.008 - 31, z * 0.008 + 17, 3)) * (1 - Math.max(montsecK(x, z), moussonK(x, z)));

// ---- the trench lines: each side’s front and support lines the same depth from the brook (each its own wander), the rear line
const LINES = [{ off: 70, wireAt: 18, belts: 2, seed: 17 }, { off: 125, wireAt: 14, belts: 1, seed: 53 }];
const linePts = (off: number, f: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(f === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6, s = f === 'nato' ? 1 : -1;
  for (let x = -480; x <= 480; x += 40) pts.push([x, brookZ(x) + s * (off + (r() - 0.5) * 12 + 8 * Math.sin(x * 0.011 + ph))]);
  return f === 'nato' ? pts : pts.reverse();   // (walked so the wire goes out in front, toward the brook)
};
const REAR_Z = 395;
const trenchBand = (x: number, z: number) => { const d = Math.abs(z - brookZ(x)); return LINES.some((l) => Math.abs(d - l.off) < 26) || Math.abs(Math.abs(z) - REAR_Z) < 18; };
/** No man’s land: the brook’s valley between the two front lines. */
const nml = (x: number, z: number) => 1 - smoothstep(55, 95, Math.abs(z - brookZ(x)));

// ---- the woods: Bois de la Sonnard behind the American front, Bois de Mort-Mare behind the German, a smaller one on each far flank
const NAMED = [[150, 215, 78], [-170, -225, 78], [-445, 345, 52], [445, -345, 52]];
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const isNato = (x: number, z: number) => z > brookZ(x);
const T_N = 0.4, T_P = evenThreshold(wn, T_N, isNato);
const woodField = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 14) return 0;
  let k = 0;
  for (const [wx, wz, r] of NAMED) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz)));
  if (wn(x, z) > (isNato(x, z) ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 60) k = Math.max(k, 0.7);
  if (airD(x, z) < 25 || montsecK(x, z) > 0.3 || moussonK(x, z) > 0.3) k = 0;   // (the buttes bare: the observers cut them clear)
  return k;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon, 16th Infantry' }];

export default {
  id: 'st-mihiel',
  name: 'St Mihiel',
  description: '12 September 1918: the first all-American offensive cuts off the St Mihiel salient — the flat, wet Woëvre plain, the Rupt de Mad brook winding through Thiaucourt, Montsec’s butte in the west and the Butte de Mousson in the east, four years of trenches and wire either side of the brook and the Michel Stellung behind.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['aef', 'fr'], pact: ['de'] }, // (Pershing’s First Army with the French II Colonial Corps, against Armee-Abteilung C; aef has no units yet: fr fights for it)
  sides: { nato: 'United States', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'rain' },    // (zero hour 05:00 after a night of rain)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1918_09,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: 1918_09, cell: 80, weights: [0.34, 0.24, 0.12, 0.3] as any }),
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a wet grey September dawn over the Woëvre
    fogColor: 0x9a9e9c, fogDensity: 0.0017, skyTop: 0x5e666e, skyHorizon: 0xaeb0aa, skyBottom: 0x66665e,
    sunColor: 0xe4dccc, sunIntensity: 1.7, sunDisk: 0.08, clouds: 0.9, cloudLight: 0xb8bab6, cloudDark: 0x62686e,
    sunDir: [0.5, 0.6, 0.5], hemiSky: 0xc0c6cc, hemiGround: 0x4c4636, hemiIntensity: 1.35, rimColor: 0xb4bcc4, rimIntensity: 0.25,
    terrain: {
      grass: '#56603a', grassAlt: '#4c5634', dryGrass: '#7c744e', dirt: '#584a3c', rock: '#8a867a', strip: '#4a3e30',
      pasture: '#56623a', ploughed: '#6e6250', stubble: '#8a7e54', meadow: '#5e6a3e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-300, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [0x847a66, 0.8];                                    // muddy metalled roads
        if (rd < 5.5) return [0x6e6452, 0.3];
        if (y < 1.6 && wetD(x, z) < 26) return [0x4c5630, 0.7];                  // reed and wet meadow along the brook
        const m = marsh(x, z);
        if (m > 0.5) return [0x505a36, 0.5 * m];                                 // the Woëvre’s sodden hollows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Landwehr-Infanterie-Regiment 31' })),
  },

  /** The old salient: trench lines and wire either side of the brook, the rear lines, shell holes in no man’s land, the villages knocked about. */
  battlefield(game: any) {
    const near = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const ok = (w: any) => wetD(w.x, w.z) > 22 && roadD(w.x, w.z) > 5 && !near(w.x, w.z, 34) && airD(w.x, w.z) > 15 && Math.hypot(w.x, Math.abs(w.z) - BASE_Z) > 45;
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, yaw = f === 'nato' ? Math.PI : 0;
      for (const l of LINES) for (const w of trenchLine(linePts(l.off, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: 70 })) if (ok(w)) works.push(w);
      // the rear line: the Michel Stellung’s concrete for the Germans, the old French line of 1915 for the Americans
      const rear: number[][] = [];
      for (let x = -480; x <= 480; x += 60) rear.push([x, s * (REAR_Z + 8 * Math.sin(x * 0.013 + (f === 'nato' ? 1 : 4)))]);
      for (const w of trenchLine(f === 'nato' ? rear : rear.reverse(), f, { wireAt: 16, belts: 1, gapEvery: 60 })) if (ok(w)) works.push(w);
      for (const x of [-420, -260, -90, 90, 260, 420]) { const w = { kind: 'mgNest', x: x * s, z: s * (REAR_Z - 6), yaw, faction: f }; if (ok(w)) works.push(w); }
      for (const x of [-300, -60, 180, 400]) { const z = brookZ(x * s) + s * (LINES[0].off - 6); const w = { kind: 'mgNest', x: x * s, z, yaw, faction: f }; if (ok(w)) works.push(w); }
    }
    const dens = (x: number, z: number) => (wetD(x, z) < 26 ? 0 : nml(x, z) * 2.6 + 0.12);
    const blasts = [...shellField(1918_09, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(1918_10, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter((b) => roadD(b[0], b[1]) > 5 && airD(b[0], b[1]) > 15);
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (Math.abs(b.z - brookZ(b.x)) < 200 ? 0.6 : 0.2)).map((b: any) => b.index);
    const paint = (terrain: any) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
        const k = nml(x, z) * (0.6 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5) * (wetD(x, z) < 20 ? 0.3 : 1);
        if (k > 0.05) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.8, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => wetD(x, z) < 22 || roadD(x, z) < 8 || trenchBand(x, z) || airD(x, z) < 25;

    // the villages, Thiaucourt the biggest, a church in each of the bigger ones
    for (const id of ['B', 'C', 'D', 'F', 'H', 'I', 'J']) {
      const [x, z] = pt(id), big = id === 'F' || id === 'C' || id === 'I';
      farmVillage(props, x, z, id === 'F' ? 12 : big ? 9 : 7, 1918 * 10 + Math.round(x * 3 + z * 7), skip, id === 'F' ? 1.45 : big ? 1.3 : 1.1);
    }
    props.rand = mulberry32(1912);
    for (const [x, z, yaw] of [[-30, 44, 0.3], [36, 342, 0.2], [-84, -368, Math.PI - 0.2], [-310, 352, 0.1], [326, -246, Math.PI]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }
    // Montsec: the Germans’ concrete observation posts dug into the top; Mousson: the castle ruin and its chapel, the French post
    const post = (x: number, z: number, yaw: number) => {
      const y = terrain.heightAt(x, z);
      props.box('plain', x, y + 1.0, z, 5, 2.2, 4, yaw, 0x8e8a80);
      props.box('plain', x, y + 1.5, z + 2.05 * Math.cos(yaw), 3, 0.35, 0.2, yaw, 0x0c0b0a);   // (the slit)
    };
    for (const [dx, dz] of [[-22, 30], [18, 34], [36, 4]]) post(MONTSEC.x + dx, MONTSEC.z + dz, 0);
    props.church({ x: MOUSSON.x + 30, z: MOUSSON.z - 14, yaw: 0.5 });
    for (const [dx, dz, yaw, len] of [[-34, 10, 0.5, 22], [-44, -6, 0.5 + Math.PI / 2, 16], [-20, 22, 0.5 + Math.PI / 2, 14]]) props.lowWall({ x: MOUSSON.x + dx, z: MOUSSON.z + dz, yaw, length: len, height: 2.6, color: 0x9a927e });
    for (const [dx, dz] of [[-10, -32], [26, -30]]) props.sandbagRing({ x: MOUSSON.x + dx, z: MOUSSON.z + dz, radius: 4, toward: -1 });

    // farmsteads, field walls and hay over the plain (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'rocks'];
    for (let tries = 0, n = 0; n < 90 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 40), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (woodField(x, z) > 0.3 || nml(x, z) > 0.3 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || skip(x, z) || montsecK(x, z) > 0.1 || moussonK(x, z) > 0.1) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0xcfc8b0);
    commandPost(props, this.bases.pact, 1, 0xb8b4a0);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 12 || roadD(x, z) < 4.5 || airD(x, z) < 12 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 1600, autumn: 0.12, broadleaf: 0.85,
      noHedge: (x: number, z: number) => nml(x, z) > 0.2 || trenchBand(x, z),
      forest: (x: number, z: number) => {
        if (wetD(x, z) < 12) return -1;
        const k = woodField(x, z);
        if (nml(x, z) > 0.3) return k > 0.5 ? 0.15 : 0.005;                      // (the woods in no man’s land shot to stumps)
        if (k > 0.5) return trenchBand(x, z) ? 0.25 : 0.85;
        return wetD(x, z) < 30 ? 0.08 : 0;                                       // (willows along the brook)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
