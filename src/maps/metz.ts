// Metz, November 1918: the battle that never came. Foch’s Lorraine offensive was to go in on 14 November — Bullard’s new
// AEF Second Army and Mangin’s French Tenth and Eighth Armies against the fortress of Metz, the strongest place on the
// Western Front: the ring of modern German “Festen” on the heights round the city, concrete batteries of armoured turret
// guns behind deep ditches and belts of wire, their barracks dug into the hill. The Armistice of 11 November called it off.
// On the map: the Moselle valley running north from Pont-à-Mousson (the Allies’ end, south, +z) to Metz (the Germans’, north)
// with the cathedral of St Stephen and the Porte des Allemands behind the German base; the Côtes de Moselle rising along the
// west edge, the plateau along the east; Feste Kronprinz (Fort Driant) on its spur over Ars-sur-Moselle, with Feste Kaiserin’s
// outlying battery behind it toward Gorze; facing it the old French fort of the Mousson position on the east bank above
// Pont-à-Mousson, with its own outlying battery; Ars on its bridge in the middle; Pagny, Atton and Sainte-Geneviève on the
// Allied side, Gorze, Jouy-aux-Arches (the Roman aqueduct’s piers) and Marly on the German; vineyards on the slopes; the
// Bois-le-Prêtre on the Allies’ west bank; the November front of trenches and wire across the valley.
// Not mirrored but fair: the river runs the length of the field, turned half a circle about Ars, so each base sits on its
// own bank and each side has the same crossings at the same places (its town bridge, a ford and a wing bridge, Ars’s
// bridge in the middle shared). Each side holds a fortress group on its own bank — Kronprinz on the German west bank, the
// Mousson fort on the Allied east bank — the same height, the same ditch, wire, turrets and barracks, the same distance
// from its base and one bridge from the other side; each has an outlying battery on its flank, three villages as far back,
// a named wood of the same size behind its front and one on its far flank, two trench lines at the same depth, a town at its
// back edge (Metz, Pont-à-Mousson) and its airfield behind its open flank.
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
const SEED = 1918_11;
const noise = createNoise2D(SEED);
const MUD = new THREE.Color(0x544838);   // Lorraine clay, November

// ---- the Moselle, south to north (Pont-à-Mousson to Metz), turned half a circle about Ars, each half its own wander
const MOSELLE = [[-238, 640, 14], [-214, 470, 14], [-200, 320, 14], [-134, 184, 14], [-66, 66, 14], [0, 0, 14], [58, -74, 14], [146, -176, 14], [192, -326, 14], [226, -466, 14], [230, -640, 14]];
/** The river’s x at z. */
const riverX = (z: number) => {
  for (let i = 0; i < MOSELLE.length - 1; i++) if (z >= MOSELLE[i + 1][1]) return MOSELLE[i][0] + (MOSELLE[i + 1][0] - MOSELLE[i][0]) * (z - MOSELLE[i][1]) / (MOSELLE[i + 1][1] - MOSELLE[i][1]);
  return MOSELLE[MOSELLE.length - 1][0];
};
const XING: [string, number, string][] = [
  ['Pont-à-Mousson bridge', 440, 'bridge'], ['Pagny ford', 270, 'ford'], ['Novéant bridge', 130, 'bridge'], ['Ars bridge', 0, 'bridge'],
  ['Jouy bridge', -130, 'bridge'], ['Moulins ford', -270, 'ford'], ['Pont des Morts', -440, 'bridge'],
];
const river = createRiver({
  path: MOSELLE, halfWidth: 14, level: 0, depth: 2.6, valley: 48,
  crossings: XING.map(([name, z, kind]) => ({ name, x: riverX(z), z, kind, width: 8 })),
});
const wetD = (x: number, z: number) => river.project(x, z).d;
const isNato = (x: number, z: number) => z > 0;

// ---- the points
const KRON = { x: -290, z: -80 }, MOUS = { x: 305, z: 100 };           // the two fortress groups
const KAIS = { x: -415, z: -235 }, MBAT = { x: 415, z: 235 };         // their outlying batteries
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points: ControlPointDef[] = [
  P('A', 'Pont-à-Mousson', 0, 470, 'centre'),
  P('B', 'Pagny-sur-Moselle', -375, 290, 'west'),
  P('C', 'Atton', 80, 330, 'centre'),
  P('D', 'Sainte-Geneviève', 310, 280, 'east'),
  P('E', 'Feste Kronprinz', KRON.x, KRON.z, 'west', { radius: 30 }),
  P('F', 'Ars-sur-Moselle', 0, 0, 'centre', { radius: 28 }),
  P('G', 'Fort de Mousson', MOUS.x, MOUS.z, 'east', { radius: 30 }),
  P('H', 'Gorze', -340, -285, 'west'),
  P('I', 'Jouy-aux-Arches', -55, -320, 'centre'),
  P('J', 'Marly', 290, -300, 'east'),
  P('K', 'Metz', 0, -470, 'centre'),
];
const pt = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };

// ---- the roads: up the valley through Atton, Ars bridge and Jouy; each town bridge and wing bridge; the fort roads; the lanes behind each front
const XB = (z: number) => riverX(z);
const ROADS = [
  [[0, 580], [0, 470], pt('C'), [70, 150], [40, 40], [0, 0], [-40, -40], [-70, -150], pt('I'), [0, -470], [0, -580]],
  [[0, 470], [-110, 455], [XB(440) + 30, 440], [XB(440), 440], [XB(440) - 30, 440], [-300, 400], pt('B')],
  [[0, -470], [110, -455], [XB(-440) - 30, -440], [XB(-440), -440], [XB(-440) + 30, -440], [300, -400], pt('J')],
  [pt('B'), [-260, 190], [XB(130) - 30, 130], [XB(130), 130], [XB(130) + 30, 130], [-20, 150], [70, 150]],
  [pt('J'), [260, -190], [XB(-130) + 30, -130], [XB(-130), -130], [XB(-130) - 30, -130], [20, -150], [-70, -150]],
  [pt('H'), [-320, -190], [KRON.x, KRON.z], [-160, -50], [-40, -40]],
  [pt('D'), [320, 190], [MOUS.x, MOUS.z], [160, 50], [40, 40]],
  [pt('C'), [200, 320], pt('D')],
  [pt('I'), [-200, -320], pt('H')],
  [pt('H'), [KAIS.x, KAIS.z]], [pt('D'), [MBAT.x, MBAT.z]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

// each side’s airfield behind its open flank (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: 215, z: 410, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -215, z: -410, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

// ---- the forts: a ring ditch with two gates (the fort road in from behind and out toward Ars), the glacis bare, the top graded
const FORTS = [
  { c: KRON, r: 44, gates: [[-320, -190], [-160, -50]], f: 'pact' as const, big: true },
  { c: MOUS, r: 44, gates: [[320, 190], [160, 50]], f: 'nato' as const, big: true },
  { c: KAIS, r: 26, gates: [pt('H')], f: 'pact' as const, big: false },
  { c: MBAT, r: 26, gates: [pt('D')], f: 'nato' as const, big: false },
].map((o) => ({ ...o, ga: o.gates.map(([gx, gz]) => Math.atan2(gz - o.c.z, gx - o.c.x)) }));
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

// ---- the ground: the Moselle’s floodplain, the two fort spurs reaching out from the edge heights, the Côtes de Moselle (west) and the plateau (east)
const kronK = (x: number, z: number) => {                               // a long spur running back north-west into the Côtes
  const dx = x - KRON.x + 45, dz = z - KRON.z + 20, c = Math.cos(0.45), s = Math.sin(0.45);
  return smoothstep(1, 0.32, Math.hypot((dx * c - dz * s) / 215, (dx * s + dz * c) / 95));
};
const mousK = (x: number, z: number) => smoothstep(150, 55, Math.hypot(x - MOUS.x, z - MOUS.z));   // the Butte de Mousson: round, flat-topped
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 4 + fbm(noise, x * 0.0028, z * 0.0028, 3) * 2.4 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.35;
  const kk = kronK(x, z), mk = mousK(x, z);
  h += 22 * kk + fbm(noise, x * 0.03 + 3, z * 0.03, 2) * 1.2 * kk * (1 - kk);
  h += 22 * mk + fbm(noise, x * 0.03 - 9, z * 0.03, 2) * 1.2 * mk * (1 - mk);
  h += smoothstep(390 + 30 * Math.sin(z * 0.011), 500, -x) * 30;                 // the Côtes de Moselle: a steep wall
  h += smoothstep(380 + 40 * Math.sin(z * 0.013 + 2), 600, x) * 22;              // the plateau east of the river: a long rise
  h += smoothstep(540, 660, Math.abs(z)) * 8;
  for (const B of [KAIS, MBAT]) h += 9 * smoothstep(90, 30, Math.hypot(x - B.x, z - B.z));
  for (const p of points) if (p.id !== 'E' && p.id !== 'G') h += (4 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * 0.4;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4.5 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (4.5 - h) * smoothstep(30, 6, airD(x, z));
  h -= 2.2 * ditch(x, z);
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// the named woods (see below): Bois-le-Prêtre, its match, one behind each front
const NAMED = [[-410, 180, 70], [410, -180, 70], [175, 215, 58], [-175, -215, 58]];
/** The vineyards (0..1): the lower slopes of the spurs and the edge heights, sun side and shade alike. */
const vines = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 30 || fortD(x, z) < 30 || NAMED.some(([wx, wz, r]) => Math.hypot(x - wx, z - wz) < r)) return 0;
  const slope = Math.max(kronK(x, z), mousK(x, z));
  const edge = Math.max(smoothstep(330, 420, -x), smoothstep(330, 420, x)) * (1 - smoothstep(470, 500, Math.abs(x)));
  const k = Math.max(slope > 0.08 && slope < 0.55 ? 1 : 0, edge);
  return k * (fbm(noise, x * 0.012 + 40, z * 0.012 - 9, 2) > -0.05 ? 1 : 0);
}, { x: 520, z: 580 }, 4);

// ---- the trench lines of November 1918 across the valley: each side’s front and support lines the same depth, the forts their bastions
const LINES = [{ z: 62, wireAt: 18, belts: 2, seed: 17 }, { z: 128, wireAt: 14, belts: 1, seed: 53 }];
const linePts = (z: number, f: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(f === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
  for (let x = -480; x <= 480; x += 40) pts.push([x, z + (r() - 0.5) * 12 + 8 * Math.sin(x * 0.011 + ph)]);
  return f === 'nato' ? pts : pts.map(([x, zz]) => [-x, -zz]);
};
const trenchBand = (_x: number, z: number) => LINES.some((l) => Math.abs(Math.abs(z) - l.z) < 26);
/** No man’s land: the strip between the two front lines. */
const nml = (_x: number, z: number) => 1 - smoothstep(40, 70, Math.abs(z));

// ---- the woods: Bois-le-Prêtre on the Allies’ west bank, its match on the German east bank; one behind each front
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const T_N = 0.4, T_P = evenThreshold(wn, T_N, isNato);
const woodField = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 14) return 0;
  let k = 0;
  for (const [wx, wz, r] of NAMED) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz)));
  if (wn(x, z) > (isNato(x, z) ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 60) k = Math.max(k, 0.7);
  if (airD(x, z) < 25 || fortD(x, z) < 45 || vines(x, z) > 0.5 || Math.abs(z) > 495) k = 0;   // (the glacis cleared for the guns)
  return k;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon, 109th Infantry' }];

export default {
  id: 'metz',
  name: 'Metz',
  description: 'November 1918, the Lorraine offensive the Armistice called off: the AEF Second Army and the French against the fortress of Metz — the Moselle valley from Pont-à-Mousson to the city, Feste Kronprinz’s turrets, ditch and wire on its spur over Ars-sur-Moselle, the old French fort of Mousson facing it across the river, vineyards on the slopes and the November trench lines across the valley.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['aef', 'fr'], pact: ['de'] }, // (Bullard’s Second Army with the French Tenth and Eighth, against Armee-Abteilung C; aef has no units yet: fr fights for it)
  sides: { nato: 'United States', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'overcast' },  // (14 November: a grey Lorraine morning)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 80, weights: [0.34, 0.26, 0.12, 0.28] as any }),
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a raw grey November dawn over the Moselle
    fogColor: 0x9c9e9a, fogDensity: 0.0016, skyTop: 0x5c646c, skyHorizon: 0xb0b0a8, skyBottom: 0x68665e,
    sunColor: 0xe6dccc, sunIntensity: 1.6, sunDisk: 0.06, clouds: 0.85, cloudLight: 0xbabcb8, cloudDark: 0x60666c,
    sunDir: [0.6, 0.5, 0.45], hemiSky: 0xc0c6cc, hemiGround: 0x4c4636, hemiIntensity: 1.35, rimColor: 0xb4bcc4, rimIntensity: 0.25,
    terrain: {
      grass: '#55603a', grassAlt: '#4c5634', dryGrass: '#7e7450', dirt: '#5a4c3c', rock: '#9a927c', strip: '#4a3e30',
      pasture: '#56623a', ploughed: '#6e6250', stubble: '#8a7e54', meadow: '#5e6a3e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-300, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [0x867c68, 0.8];                                    // metalled roads
        if (rd < 5.5) return [0x6e6452, 0.3];
        if (ditch(x, z) > 0.3) return [0x5c5244, 0.8];                           // the fort ditches
        if (fortD(x, z) < 0) return [0x6c6a5a, 0.5];                             // the fort tops: earth over concrete
        if (y < 1.6 && wetD(x, z) < 26) return [0x4c5630, 0.7];                  // reed and wet meadow along the river
        if (vines(x, z) > 0.5) return (x * 0.6 + z * 0.8) % 2.6 < 0.9 ? [0x4a3e2c, 0.75] : [0x6e6440, 0.55]; // the vine rows, leaves gone
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Königs-Infanterie-Regiment 145' })),
  },

  /** The November front: trench lines and wire across the valley, the fort wire belts, shell holes in no man’s land, a few villages knocked about. */
  battlefield(game: any) {
    const near = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const ok = (w: any) => wetD(w.x, w.z) > 22 && roadD(w.x, w.z) > 5 && !near(w.x, w.z, 34) && Math.hypot(w.x, w.z) > 100 && airD(w.x, w.z) > 15 && fortD(w.x, w.z) > 14 && Math.hypot(w.x, Math.abs(w.z) - BASE_Z) > 45;
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, yaw = f === 'nato' ? Math.PI : 0;
      for (const l of LINES) for (const w of trenchLine(linePts(l.z, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: 70 })) if (ok(w)) works.push(w);
      for (const x of [-380, -150, 120, 360]) { const w = { kind: 'mgNest', x: x * s, z: s * (LINES[0].z - 6), yaw, faction: f }; if (ok(w)) works.push(w); }
    }
    // the fort wire: two belts round each fort beyond its ditch (the gates left open), machine guns on the ramparts
    for (const F of FORTS) {
      for (const [off, step] of [[10, 10.2], [16, 10.2]]) {
        const R = F.r + off, n = Math.round((2 * Math.PI * R) / step);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          if (F.ga.some((g) => angGap(a, g) * R < 11)) continue;
          const x = F.c.x + Math.cos(a) * R, z = F.c.z + Math.sin(a) * R;
          if (wetD(x, z) > 22 && roadD(x, z) > 5) works.push({ kind: 'wire', x, z, yaw: -a + Math.PI / 2, faction: F.f });
        }
      }
      const toward = F.f === 'nato' ? -1 : 1;
      for (const da of F.big ? [-0.9, 0.9] : [0]) {
        const a = Math.atan2(toward, 0) + da, R = F.r - 9;
        works.push({ kind: 'mgNest', x: F.c.x + Math.cos(a) * R, z: F.c.z + Math.sin(a) * R, yaw: F.f === 'nato' ? Math.PI : 0, faction: F.f });
      }
    }
    const dens = (x: number, z: number) => (wetD(x, z) < 26 || fortD(x, z) < 0 ? 0 : nml(x, z) * 2.2 + (fortD(x, z) < 40 ? 0.5 : 0) + 0.1);
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter((b) => roadD(b[0], b[1]) > 5 && airD(b[0], b[1]) > 15 && ditch(b[0], b[1]) < 0.1);
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (Math.abs(b.z) < 200 ? 0.45 : 0.08)).map((b: any) => b.index);
    const paint = (terrain: any) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
        const k = nml(x, z) * (0.55 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5) * (wetD(x, z) < 20 ? 0.3 : 1);
        if (k > 0.05) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.7, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => wetD(x, z) < 22 || roadD(x, z) < 8 || trenchBand(x, z) || airD(x, z) < 25 || fortD(x, z) < 12;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V1 = new THREE.Vector3(1, 1, 1);
    /** A round tower or turret drum (cover). */
    const drum = (x: number, z: number, r: number, h: number, color: number, y0 = terrain.heightAt(x, z), key = 'stone') => {
      M.compose(new THREE.Vector3(x, y0 + h / 2, z), Q, V1);
      props.push(key, new THREE.CylinderGeometry(r, r, h, 14), M, color);
      cover.addCylinder({ x, z, radius: r, height: h });
    };

    // the villages, Ars the biggest (on both banks of its bridge), a church in each of the bigger ones
    for (const id of ['B', 'C', 'D', 'F', 'H', 'I', 'J']) {
      const [x, z] = pt(id), big = id === 'F' || id === 'B' || id === 'J';
      farmVillage(props, x, z, id === 'F' ? 12 : big ? 9 : 7, 1918 * 11 + Math.round(x * 3 + z * 7), skip, id === 'F' ? 1.45 : big ? 1.3 : 1.1);
    }
    props.rand = mulberry32(1911);
    for (const s of [1, -1]) for (const [x, z] of [[49, 31], [31, 49], [70, 60]]) props.townHouse({ x: s * x, z: s * z, yaw: Math.PI / 4 + (s < 0 ? Math.PI : 0), width: 8, depth: 9, storeys: 2 });   // Ars by its bridge
    for (const [id, dx, dz, yaw] of [['B', 26, 24, 0.2], ['J', -26, 30, Math.PI + 0.2], ['H', 32, -26, 0.1], ['C', 30, 26, Math.PI]] as [string, number, number, number][]) {
      const [x, z] = pt(id);
      if (!skip(x + dx, z + dz)) props.church({ x: x + dx, z: z + dz, yaw });
    }
    for (const [x, z, yaw] of [[-46, 34, 0.8], [46, -34, 0.8 + Math.PI]]) if (!skip(x, z)) props.church({ x, z, yaw });

    // the forts: concrete batteries of armoured turret guns, the barracks dug in behind, an observation cupola, the earth rampart
    for (const F of FORTS) {
      const de = F.f === 'pact', toward = de ? 1 : -1;                         // (toward the enemy: +z for the Germans)
      const conc = de ? 0x8e8a80 : 0x9c9482, steel = de ? 0x3a3e40 : 0x46443e;   // (German concrete, the French fort’s masonry)
      const cx = F.c.x, cz = F.c.z;
      if (F.big) {
        // two gun batteries across the front of the fort, two turrets each; the barracks at the back; the gorge wall
        for (const bx of [-18, 18]) {
          const x = cx + bx, z = cz + toward * 14, y = terrain.heightAt(x, z);
          props.box('plain', x, y + 0.7, z, 16, 1.8, 9, 0, conc);
          for (const tx of [-4.5, 4.5]) {
            drum(x + tx, z, 2.2, 1.1, steel, y + 1.5, 'metal');
            props.box('metal', x + tx, y + 2.15, z + toward * 3.6, 0.45, 0.45, 5, 0, 0x1c1e20);   // (the gun, laid toward the front)
          }
        }
        const by = terrain.heightAt(cx, cz - toward * 16);
        props.hall({ x: cx, z: cz - toward * 16, yaw: de ? 0 : Math.PI, width: 30, depth: 9, height: 4.6, color: conc, roof: 0x5c5a50, door: 4, name: de ? 'Kaserne' : 'casernement' });
        props.box('plain', cx, by + 5.6, cz - toward * 16, 31, 1.2, 10, 0, 0x5e5c48);         // (earth over its roof)
        drum(cx + 26, cz + toward * 2, 1.4, 1.6, steel, terrain.heightAt(cx + 26, cz + toward * 2) + 0.2, 'metal');   // the observation cupola
      } else {
        const y = terrain.heightAt(cx, cz);
        props.box('plain', cx, y + 0.7, cz, 14, 1.8, 8, 0, conc);
        for (const tx of [-3.8, 3.8]) {
          drum(cx + tx, cz, 2, 1, steel, y + 1.5, 'metal');
          props.box('metal', cx + tx, y + 2.05, cz + toward * 3.4, 0.4, 0.4, 4.6, 0, 0x1c1e20);
        }
        props.hall({ x: cx, z: cz - toward * 14, yaw: de ? 0 : Math.PI, width: 14, depth: 7, height: 4, color: conc, roof: 0x5c5a50, door: 3, name: de ? 'Unterstand' : 'abri' });
      }
    }
    // the Mousson butte’s castle ruin above the French fort
    for (const [dx, dz, yaw, len] of [[60, 34, 0.3, 18], [70, 22, 0.3 + Math.PI / 2, 12]]) props.lowWall({ x: MOUS.x + dx, z: MOUS.z + dz, yaw, length: len, height: 2.8, color: 0x9a927e });

    // Metz at the German back edge: the old town, the cathedral of St Stephen in its yellow Jaumont stone, the Porte des Allemands on the road out
    const town = (x0: number, x1: number, z0: number, z1: number, seed: number) => {
      props.rand = mulberry32(seed);
      for (let z = z0; z <= z1; z += 15) for (let x = x0; x <= x1; x += 13) {
        const px = x + (props.rand() - 0.5) * 3, pz = z + (props.rand() - 0.5) * 3;
        if (wetD(px, pz) < 24 || roadD(px, pz) < 8 || Math.hypot(px, Math.abs(pz) - BASE_Z) < 50 || airD(px, pz) < 20 || Math.abs(px - (seed > 0 ? 120 : -125)) < 30 && Math.abs(Math.abs(pz) - 530) < 14) continue;
        props.townHouse({ x: px, z: pz, yaw: Math.round(props.rand()) * Math.PI, width: 8, depth: 9, storeys: 2 + Math.round(props.rand()), damaged: 0 });
      }
    };
    town(55, 195, -552, -480, 57);
    town(-195, -55, 480, 552, -57);
    {
      const x = 125, z = -530, g = terrain.heightAt(x, z), stone = 0xbca870;
      props.hall({ x, z, yaw: 0, width: 36, depth: 12, height: 15, color: stone, roof: 0x3c4248, door: 4, name: 'Cathédrale Saint-Étienne' });
      for (const s of [1, -1]) props.box('plain', x, g + 18.2, z + s * 3.1, 37, 0.5, 7.8, 0, 0x3c4a4e, s * 0.75, 0);   // the steep copper-green roof
      props.box('stone', x - 22, g + 17, z, 7, 34, 7, 0, stone);                    // the Tour de Mutte
      M.compose(new THREE.Vector3(x - 22, g + 38, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)), V1);
      props.push('plain', new THREE.ConeGeometry(4.6, 9, 4), M, 0x3c4a4e);
      cover.addBox({ x: x - 22, z, yaw: 0, length: 7, thickness: 7, height: 34 });
      for (const bx of [-12, 0, 12]) for (const s of [1, -1]) props.box('stone', x + bx, g + 7, z + s * 7.2, 1.6, 14, 2.2, 0, stone);   // the flying buttresses’ piers
    }
    {
      // the Porte des Allemands: two round towers either side of the road, the gate passage over it, a pepper-pot roof on each tower
      const gx = 75, gz = -460, yaw = Math.atan2(110, 15);   // (on the road out of Metz toward the Pont des Morts)
      const nx = Math.cos(yaw), nz = -Math.sin(yaw);
      for (const s of [-1, 1]) {
        const tx = gx + nx * s * 8, tz = gz + nz * s * 8, g = terrain.heightAt(tx, tz);
        drum(tx, tz, 3.4, 12, 0x8e8672);
        M.compose(new THREE.Vector3(tx, g + 15, tz), Q, V1);
        props.push('plain', new THREE.ConeGeometry(4, 6, 12), M, 0x3a3c40);
      }
      props.box('stone', gx, terrain.heightAt(gx, gz) + 9, gz, 14, 5, 7, yaw, 0x8e8672);
    }
    {
      // Pont-à-Mousson’s abbey of the Premonstratensians by the road to its bridge
      const x = -125, z = 530;
      props.hall({ x, z, yaw: Math.PI, width: 36, depth: 12, height: 11, color: 0xc4b48c, roof: 0x5a3a2e, door: 4, name: 'Abbaye des Prémontrés' });
    }
    // Jouy-aux-Arches: the Roman aqueduct’s piers striding down to the river
    for (let i = 0; i < 9; i++) {
      const x = -150 + i * 13, z = -262 + i * 7;
      if (roadD(x, z) < 7 || wetD(x, z) < 22) continue;
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + 6, z, 3.4, 12 - (i % 3) * 2.5, 3.4, -0.5, 0xa8987a);
      cover.addBox({ x, z, yaw: -0.5, length: 3.4, thickness: 3.4, height: 10 });
    }

    // farmsteads, field walls and hay (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'rocks'];
    for (let tries = 0, n = 0; n < 80 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 40), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (woodField(x, z) > 0.3 || nml(x, z) > 0.3 || Math.abs(z) > 470 || nearPoint(x, z, 50) || skip(x, z) || fortD(x, z) < 50 || vines(x, z) > 0.5) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0xcfc8b0);
    commandPost(props, this.bases.pact, 1, 0xb8b4a0);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 12 || roadD(x, z) < 4.5 || airD(x, z) < 12 || fortD(x, z) < 22 || ditch(x, z) > 0 || (Math.abs(z) > 475 && Math.abs(x) < 210) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4000, hedges: 1500, autumn: 0.6, broadleaf: 0.85,
      noHedge: (x: number, z: number) => nml(x, z) > 0.2 || trenchBand(x, z) || vines(x, z) > 0.5 || fortD(x, z) < 40,
      forest: (x: number, z: number) => {
        if (wetD(x, z) < 12 || vines(x, z) > 0.5) return -1;
        const k = woodField(x, z);
        if (nml(x, z) > 0.3) return k > 0.5 ? 0.2 : 0.005;
        if (k > 0.5) return trenchBand(x, z) ? 0.25 : 0.85;
        return wetD(x, z) < 30 ? 0.1 : 0;                                        // (poplars and willows along the Moselle)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
