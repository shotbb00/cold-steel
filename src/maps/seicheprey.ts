// Seicheprey, 20 April 1918: the first big German blow at the Americans. Before dawn, in fog and after a box barrage
// with gas, some 3,200 men of the 259th Reserve Infantry Regiment led by the Stoßtrupps of Sturmbataillon 14 hit the
// 102nd Infantry of the US 26th “Yankee” Division in the “quiet” Toul sector of Lorraine — over the old French
// trenches of 1914, through the Bois de Remières, into the ruins of Seicheprey. They held the village for a day, took
// 136 prisoners and went back to their own lines; the Americans lost 669 men and learned what a raid in force was.
// On the map: the flat, wet Woëvre with its sodden hollows and shell-pocked meadows; the Rupt de Mad, a narrow stream
// winding north through the middle of the sector toward Thiaucourt, its mill bridge on the Toul–Thiaucourt road, a ford
// and a bridge on either side of no man’s land; the ruins of Seicheprey west of the stream and the Bois de Remières east
// of it, both out between the wire; behind the American front Mandres, Beaumont and the Bois du Jury, Ansauville at the
// back; behind the German front Richecourt, Lahayville and Saint-Baussant, Maizerais at the back; three static years of
// trenches either side — a front line with deep wire belts, a support line with its dugouts, the old 1914 line behind —
// and Montsec’s bare hill on the German horizon to the north-west, out of play, the Hazelle heights behind the
// Americans to the south.
// Not mirrored but fair: the stream runs from the south-east corner to the north-west one through the middle, so it
// splits both halves alike — each base sits on its own bank with one point across the water (the Bois du Jury for the
// Americans, Richecourt for the Germans), each reached by its own rear bridge at the same depth, and each side has a
// ford the same distance in front of its front line. Seicheprey and the Bois de Remières face each other across the
// mill bridge within 25 m of the same distance from each base (a village’s ruins against a shattered wood, each with a copse beside
// it on the near side: the Bois du Jury’s tail and the Remières’ rear edge). Each half has its own ground noise, its own
// trench wander and woods of its own shapes but the same wooded area, the same low rise behind its front, the same
// trench depths and its airfield behind its far flank; Montsec and the Hazelle heights are both off the map.
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
const noise = createNoise2D(1918_04);
const MUD = new THREE.Color(0x4c4334);   // wet Woëvre clay

// ---- the Rupt de Mad, from the south-east corner north-west through the middle (point-symmetric course, wider downstream)
const RUPT = [[340, 640, 4], [300, 520, 4], [215, 400, 4.5], [180, 290, 4.5], [95, 180, 5], [60, 90, 5], [0, 0, 5.5],
  [-60, -90, 5.5], [-95, -180, 6], [-180, -290, 6], [-215, -400, 6.5], [-300, -520, 6.5], [-340, -640, 7]];
const river = createRiver({
  path: RUPT, halfWidth: 5, level: 0, depth: 2.2, valley: 34,
  crossings: [
    { name: 'Beaumont bridge', x: 210, z: 380, kind: 'bridge', width: 8 },
    { name: 'Seicheprey ford', x: 95, z: 180, kind: 'ford', width: 9 },
    { name: 'Remières mill bridge', x: 0, z: 0, kind: 'bridge', width: 8 },
    { name: 'Lahayville ford', x: -95, z: -180, kind: 'ford', width: 9 },
    { name: 'Saint-Baussant bridge', x: -210, z: -380, kind: 'bridge', width: 8 },
  ],
});
const wetD = gridCacheSmooth((x: number, z: number) => Math.min(200, river.project(x, z).d), { x: 520, z: 580 }, 4);
/** A road’s way over crossing i: 40 m out on each bank, square across the flow, then the deck. */
const over = (i: number, from: number) => { const c = river.crossings[i]; return [[c.x + from * c.nx * 40, c.z + from * c.nz * 40], [c.x, c.z], [c.x - from * c.nx * 40, c.z - from * c.nz * 40]]; };
const sideOf = (i: number, x: number, z: number) => { const c = river.crossings[i]; return Math.sign((x - c.x) * c.nx + (z - c.z) * c.nz) || 1; };

// ---- the points
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points: ControlPointDef[] = [
  P('A', 'Ansauville', 0, 470, 'centre'),
  P('B', 'Mandres', -345, 300, 'west'),
  P('C', 'Beaumont', 40, 330, 'centre'),
  P('D', 'Bois du Jury', 320, 300, 'east'),
  P('E', 'Seicheprey', -250, 40, 'west', { radius: 28 }),
  P('F', 'Remières mill', -18, 14, 'centre', { radius: 24 }),
  P('G', 'Bois de Remières', 270, -25, 'east', { radius: 28 }),
  P('H', 'Richecourt', -290, -330, 'west'),
  P('I', 'Lahayville', -10, -345, 'centre'),
  P('J', 'Saint-Baussant', 360, -285, 'east'),
  P('K', 'Maizerais', 15, -470, 'centre'),
];
const pt = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };

// ---- the roads: the Toul–Thiaucourt road corner to corner over the mill bridge, each side’s road up from its base to it,
// the lanes behind each front (over its rear bridge to its point across the water), Seicheprey’s and Remières’ lanes
const mill = (s: number) => over(2, s * sideOf(2, -200, 200));
const ROADS = [
  [[-590, 590], [-460, 450], pt('B'), [-150, 140], ...mill(1), [150, -140], pt('J'), [460, -450], [590, -590]],
  [[0, 590], pt('A'), pt('C'), [-10, 170], [-70, 75]],
  [[0, -590], pt('K'), pt('I'), [10, -170], [70, -75]],
  [pt('B'), [-150, 340], pt('C'), [140, 365], ...over(0, sideOf(0, 0, 380)), [270, 340], pt('D')],
  [pt('J'), [150, -340], pt('I'), [-140, -365], ...over(4, sideOf(4, 0, -380)), [-270, -340], pt('H')],
  [[-380, 590], pt('B')], [[160, 590], [110, 450], pt('C')],
  [[380, -590], pt('J')], [[-160, -590], [-110, -450], pt('I')],
  [pt('B'), [-300, 170], pt('E'), [-130, 60]],
  [pt('J'), [300, -170], pt('G'), [130, -60]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

// each side’s airfield behind its far flank (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: -170, z: 430, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 170, z: -430, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

// ---- the ground: the flat Woëvre, a low rise behind each front, Montsec (north-west) and the Hazelle heights (south) off the map
const MONTSEC = { x: -420, z: -800 };
const RISES = [[-140, 190, 130, 5], [140, -190, 130, 5]];
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 3.5 + fbm(noise, x * 0.0026, z * 0.0026, 3) * 2.0 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.35;
  for (const [rx, rz, r, rh] of RISES) h += rh * smoothstep(r, 0, Math.hypot(x - rx, z - rz)) ** 1.5;
  h += 70 * smoothstep(240, 60, Math.hypot(x - MONTSEC.x, (z - MONTSEC.z) * 1.4));               // Montsec, the butte the Germans watched from
  h += smoothstep(600 + 25 * Math.sin(x * 0.008), 720, z) * 26;                                  // the Hazelle heights
  h += smoothstep(560 + 30 * Math.sin(x * 0.011 + 2), 700, -z) * 14;
  h += smoothstep(450 + 40 * Math.sin(z * 0.012 + 1), 600, Math.abs(x)) * 16;                   // (the edges rise: one wave per half)
  for (const p of points) h += (3.5 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (4 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, { x: 700, z: 800 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));
/** The Woëvre’s sodden hollows (0..1). */
const marsh = gridCache((x: number, z: number) => smoothstep(0.15, 0.35, fbm(noise, x * 0.008 - 31, z * 0.008 + 17, 3)), { x: 520, z: 580 }, 8);

// ---- the trench lines: front (three deep wire belts) and support (dugouts behind it) the same depth each side, the old 1914 line behind
const LINES = [{ off: 85, wireAt: 20, belts: 3, seed: 23 }, { off: 145, wireAt: 14, belts: 2, seed: 61 }];
const linePts = (off: number, f: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(f === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6, s = f === 'nato' ? 1 : -1;
  for (let x = -480; x <= 480; x += 40) pts.push([x, s * (off + (r() - 0.5) * 12 + 9 * Math.sin(x * 0.012 + ph))]);
  return f === 'nato' ? pts : pts.reverse();   // (walked so the wire goes out in front)
};
const REAR_Z = 385;
const trenchBand = (_x: number, z: number) => { const a = Math.abs(z); return LINES.some((l) => Math.abs(a - l.off) < 26) || Math.abs(a - REAR_Z) < 18; };
/** No man’s land between the two front lines. */
const nml = (_x: number, z: number) => 1 - smoothstep(50, 90, Math.abs(z));
/** The dugout mouths behind each support line, facing back (x, nato’s z; pact’s turned half a circle). */
const DUGOUTS = [[-400, 168], [-200, 172], [-60, 166], [150, 170], [260, 168], [430, 174]];

// ---- the woods: the Bois du Jury’s tail by Seicheprey and the Bois de Remières, each its own named wood behind its front; noise woods per half
const NAMED = [[-295, 100, 70], [290, -80, 70], [330, 250, 60], [-330, -250, 60]];
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const isNato = (_x: number, z: number) => z > 0;
const T_N = 0.38, T_P = evenThreshold(wn, T_N, isNato);
const woodField = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 14) return 0;
  let k = 0;
  for (const [wx, wz, r] of NAMED) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz)));
  if (wn(x, z) > (isNato(x, z) ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 60) k = Math.max(k, 0.7);
  if (airD(x, z) < 25) k = 0;
  return k;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon, Company C, 102nd Infantry' }];

export default {
  id: 'seicheprey',
  name: 'Seicheprey',
  description: '20 April 1918, the “quiet” Toul sector of Lorraine: German storm troops raid the US 26th Division in fog and gas — the flat, wet Woëvre, the Rupt de Mad winding through the middle, the ruins of Seicheprey and the Bois de Remières between the deep wire belts, old French trenches of 1914 and Montsec on the German horizon.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['aef', 'fr'], pact: ['st', 'de'] }, // (the 102nd Infantry of the 26th Division against the Stoßtrupps of Sturmbataillon 14 and the 259th Reserve Infantry Regiment; aef has no units yet: fr fights for it)
  sides: { nato: 'United States', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'fog' },    // (the barrage fell at 03:00, the storm troops went over at first light in thick fog)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1918_04,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: 1918_04, cell: 76, weights: [0.38, 0.22, 0.1, 0.3] as any }),
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a raw April dawn, fog lying on the wet plain, the gas hanging yellow-grey in the hollows
    fogColor: 0xa4a698, fogDensity: 0.0019, skyTop: 0x687076, skyHorizon: 0xb4b4a6, skyBottom: 0x6a6a5e,
    sunColor: 0xe8dcc4, sunIntensity: 1.5, sunDisk: 0.06, clouds: 0.85, cloudLight: 0xbebeb6, cloudDark: 0x666c70,
    sunDir: [0.6, 0.45, 0.55], hemiSky: 0xc2c6c4, hemiGround: 0x4c4636, hemiIntensity: 1.35, rimColor: 0xb8bcbc, rimIntensity: 0.22,
    terrain: {
      grass: '#58623a', grassAlt: '#4e5834', dryGrass: '#7a7250', dirt: '#584a3c', rock: '#8a867a', strip: '#4a3e30',
      pasture: '#5a663c', ploughed: '#6c604e', stubble: '#867a54', meadow: '#606c40',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-300, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [0x847a66, 0.8];                                    // muddy metalled roads
        if (rd < 5.5) return [0x6e6452, 0.3];
        if (y < 1.6 && wetD(x, z) < 24) return [0x4c5630, 0.7];                  // reed and wet meadow along the stream
        const m = marsh(x, z);
        if (m > 0.5) return [0x505a36, 0.5 * m];                                 // the sodden hollows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-380, 0, 160] }, pact: { x: 0, z: -BASE_Z, entries: [-160, 0, 380] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Stoßtrupp, Sturmbataillon 14' })),
  },

  /** Three static years: the trench lines and deep wire each side, the old 1914 lines, shell holes in the meadows, the villages knocked about. */
  battlefield(game: any) {
    const near = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const ok = (w: any) => wetD(w.x, w.z) > 20 && roadD(w.x, w.z) > 5 && !near(w.x, w.z, 34) && airD(w.x, w.z) > 15 && Math.hypot(w.x, Math.abs(w.z) - BASE_Z) > 45;
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, yaw = f === 'nato' ? Math.PI : 0;
      for (const l of LINES) for (const w of trenchLine(linePts(l.off, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: 80 })) if (ok(w)) works.push(w);
      // the old line of 1914 (the French one the Americans took over; the Germans’ first line of the salient)
      const rear: number[][] = [];
      for (let x = -480; x <= 480; x += 60) rear.push([x, s * (REAR_Z + 8 * Math.sin(x * 0.013 + (f === 'nato' ? 1 : 4)))]);
      for (const w of trenchLine(f === 'nato' ? rear : rear.reverse(), f, { wireAt: 16, belts: 1, gapEvery: 60 })) if (ok(w)) works.push(w);
      for (const x of [-410, -250, -90, 100, 250, 420]) { const w = { kind: 'mgNest', x: x * s, z: s * (LINES[0].off - 6), yaw, faction: f }; if (ok(w)) works.push(w); }
      for (const x of [-300, 0, 300]) { const w = { kind: 'mgNest', x: x * s, z: s * (REAR_Z - 6), yaw, faction: f }; if (ok(w)) works.push(w); }
    }
    // a quiet sector’s scatter of old holes, thick only where the box barrage fell on the front lines and no man’s land
    const dens = (x: number, z: number) => (wetD(x, z) < 22 ? 0 : nml(x, z) * 2.2 + (1 - smoothstep(40, 90, Math.abs(Math.abs(z) - 120))) * 0.8 + 0.1);
    const blasts = [...shellField(1918_04, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(1918_05, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter((b) => roadD(b[0], b[1]) > 5 && airD(b[0], b[1]) > 15);
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (Math.abs(b.z) < 120 ? 0.9 : Math.abs(b.z) < 260 ? 0.5 : 0.15)).map((b: any) => b.index);
    const paint = (terrain: any) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
        const k = nml(x, z) * (0.55 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5) * (wetD(x, z) < 18 ? 0.3 : 1);
        if (k > 0.05) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.75, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => wetD(x, z) < 22 || roadD(x, z) < 8 || trenchBand(x, z) || airD(x, z) < 25;

    // the villages, Seicheprey the biggest; a church in Seicheprey, Beaumont, Mandres, Lahayville and Saint-Baussant
    for (const id of ['B', 'C', 'E', 'H', 'I', 'J']) {
      const [x, z] = pt(id), big = id === 'E' || id === 'C' || id === 'I';
      farmVillage(props, x, z, id === 'E' ? 11 : big ? 9 : 7, 1918 * 10 + Math.round(x * 3 + z * 7), skip, id === 'E' ? 1.4 : big ? 1.25 : 1.1);
    }
    props.rand = mulberry32(1904);
    for (const [x, z, yaw] of [[-232, 70, 0.2], [62, 350, 0.1], [-352, 340, 0.3], [-60, -350, Math.PI - 0.1], [350, -342, Math.PI + 0.2]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }
    // the mill on the stream by the bridge (a few walls left)
    for (const [x, z] of [[30, -28], [-28, 32]]) if (!skip(x, z)) props.house({ x, z, yaw: 0.6, width: 9, depth: 7 });
    // the dugout mouths behind each support line: a timbered portal into the clay, the dark stair, sandbags
    for (const [dx, dz] of DUGOUTS) for (const s of [1, -1]) {
      const x = dx * s, z = dz * s;
      if (skip(x, z + 26 * s) || wetD(x, z) < 26 || roadD(x, z) < 8 || nearPoint(x, z, 36)) continue;
      const y = terrain.heightAt(x, z), yaw = s > 0 ? 0 : Math.PI;
      props.box('plain', x, y + 1.0, z, 4.4, 2.0, 1.0, yaw, 0x5e4e3a);
      props.box('plain', x, y + 0.8, z + 0.35 * s, 1.8, 1.6, 0.5, yaw, 0x0c0b0a);
      props.box('plain', x, y + 2.15, z - 1.3 * s, 5.2, 0.4, 3.4, yaw, 0x6a5a44);
      props.sandbagRing({ x, z: z + 5 * s, radius: 3.5, toward: s });
    }

    // farmsteads, field walls and hay behind each side’s lines (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'rocks'];
    for (let tries = 0, n = 0; n < 80 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 40), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (woodField(x, z) > 0.3 || nml(x, z) > 0.3 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0xcfc8b0);
    commandPost(props, this.bases.pact, 1, 0xb8b4a0);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 10 || roadD(x, z) < 4.5 || airD(x, z) < 12 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3800, hedges: 1500, autumn: 0.05, broadleaf: 0.85,
      noHedge: (x: number, z: number) => nml(x, z) > 0.2 || trenchBand(x, z),
      forest: (x: number, z: number) => {
        if (wetD(x, z) < 10) return -1;
        const k = woodField(x, z);
        if (nml(x, z) > 0.3) return k > 0.5 ? 0.3 : 0.005;                       // (the Bois de Remières shot to stumps and splinters)
        if (k > 0.5) return trenchBand(x, z) ? 0.25 : 0.85;
        return wetD(x, z) < 28 ? 0.1 : 0;                                        // (willows along the stream)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
