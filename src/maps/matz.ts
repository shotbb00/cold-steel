// The Matz (Operation Gneisenau), 9–13 June 1918 (1918 only; the Western Front; the big field, 1.0 × 1.12 km). The
// fourth German spring drive strikes between Montdidier and Noyon for Compiègne and the road to Paris: the Eighteenth
// Army storms the wooded Thiescourt massif and the Lassigny heights, crosses the little Matz at Ressons and Marest and
// pushes on toward the Aronde. Then on 11 June Mangin, without a barrage, sends four divisions of the French Tenth
// Army forward from Méry over the open wheat with the Schneider and Saint-Chamond groups and the Renault FTs behind
// him — Belloy, Courcelles and the Méry plateau change hands, and the drive on Compiègne is stopped for good.
// Mobile war: shallow trenches and scrapes dug in a night, machine-gun nests, a strand of wire; no deep trench systems.
// On the map: the Matz rising on the Courcelles plateau in the west and running east through Ressons-sur-Matz and its
// bridge, on through the wooded gorge at Marest between the Thiescourt massif (north) and the Elincourt heights
// (south), out past the east edge toward the Oise; the open plateau of wheat round it; Méry, Gournay-sur-Aronde and
// Elincourt on the French side (south, +z) with the Aronde in its shallow valley behind them and the edge of the Forest
// of Compiègne at their back; Belloy, Conchy-les-Pots and Thiescourt on the German side (north) with the Divette valley
// behind them; the Compiègne–Roye road over the Ressons bridge.
// Not mirrored but fair: the Matz runs across the middle, not in front of one side — every point of the middle row sits
// on it or on the open plateau where it rises, and each side comes down to it from its own bank. Each side has a
// village on the west plateau (Méry; Belloy), one on the main road (Gournay; Conchy), one on its own wooded height in the
// east (Elincourt on the Elincourt heights; Thiescourt on the Thiescourt massif, the same height and size), a stream
// valley behind its front (the Aronde; the Divette), a gentle rise behind it, a forest edge or wood of the same area at
// its back, and its own line of rifle pits. The Courcelles rise in the west straddles the middle line.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { segDist, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1918_0609);

// ---- the Matz: rising on the Courcelles plateau, east through Ressons and the Marest gorge, out at the east edge
const river = createRiver({
  path: [[-175, 6, 2], [-110, -4, 4.5], [-40, 4, 6.5], [0, 0, 7], [70, 10, 7.5], [150, 4, 8], [230, -8, 8], [300, 0, 8.5], [380, 8, 9], [470, -2, 9.5], [720, 4, 10]],
  halfWidth: 8, level: 0, depth: 2.6, valley: 46,
  crossings: [
    { name: 'mill ford', x: -110, z: -4, kind: 'ford', width: 10 },
    { name: 'Ressons bridge', x: 0, z: 0, kind: 'bridge', width: 9 },
    { name: 'Le Fayel ford', x: 150, z: 4, kind: 'ford', width: 10 },
    { name: 'Marest bridge', x: 300, z: 0, kind: 'bridge', width: 9 },
    { name: 'Chevincourt ford', x: 445, z: 1, kind: 'ford', width: 10 },
  ],
});
const wet = (x: number, z: number, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

// ---- the points
const P = { B: [-350, 320], C: [-60, 310], D: [280, 300], E: [-320, 0], F: [0, 0], G: [300, 0], H: [-300, -315], I: [40, -300], J: [270, -305] };
const points: ControlPointDef[] = [
  { id: 'A', name: 'Forêt de Compiègne', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Méry', x: P.B[0], z: P.B[1], owner: null, sector: 'west' },
  { id: 'C', name: 'Gournay-sur-Aronde', x: P.C[0], z: P.C[1], owner: null, sector: 'centre' },
  { id: 'D', name: 'Elincourt', x: P.D[0], z: P.D[1], owner: null, sector: 'east' },
  { id: 'E', name: 'Courcelles-Epayelles', x: P.E[0], z: P.E[1], owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Ressons-sur-Matz', x: P.F[0], z: P.F[1], owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Marest-sur-Matz', x: P.G[0], z: P.G[1], owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Belloy', x: P.H[0], z: P.H[1], owner: null, sector: 'west' },
  { id: 'I', name: 'Conchy-les-Pots', x: P.I[0], z: P.I[1], owner: null, sector: 'centre' },
  { id: 'J', name: 'Thiescourt', x: P.J[0], z: P.J[1], owner: null, sector: 'east' },
  { id: 'K', name: 'Roye road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the roads: the Compiègne–Roye road over the Ressons bridge, the plateau lane Méry – Courcelles – Belloy, the
// Elincourt – Marest – Thiescourt road through the gorge, the lanes behind each front and between the villages
const ROADS = [
  [[0, 560], [0, 470], [-30, 400], P.C, [-20, 200], [-10, 80], P.F, [15, -80], [30, -200], P.I, [10, -390], [0, -470], [0, -560]], // Compiègne–Roye road
  [[-560, 425], [-280, 448], [0, 470], [280, 448], [560, 430]],
  [[-560, -430], [-280, -450], [0, -470], [280, -452], [560, -440]],
  [[-300, 580], [-320, 440], P.B, [-340, 160], P.E, [-310, -160], P.H, [-290, -440], [-300, -580]], // the plateau lane
  [[300, 580], [290, 440], P.D, [310, 160], [295, 60], P.G, [300, -60], [285, -170], P.J, [290, -440], [300, -580]], // through the Marest gorge
  [P.C, [-200, 170], P.E], [P.I, [-150, -170], P.E],
  [P.C, [110, 290], P.D], [P.I, [160, -310], P.J],
  [P.F, [150, 60], [230, 40], P.G], // (the valley road, south bank)
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

// the rises: [x, z, rx, rz, h] — the Courcelles rise across the middle, the Elincourt heights and the Thiescourt
// massif (wooded) either side of the Marest gorge, a gentle rise behind each front
const RISES = [[-320, 0, 130, 100, 9], [300, 175, 120, 85, 10], [290, -178, 120, 85, 10], [-60, 410, 170, 90, 4], [60, -410, 170, 90, 4]];
const rise = (i: number, x: number, z: number) => { const [hx, hz, rx, rz] = RISES[i]; return Math.hypot((x - hx) / rx, (z - hz) / rz); };
// the two wooded heights: the Bois de Thiescourt and the Elincourt woods, ragged-edged
const heightWood = (x: number, z: number) => {
  const r = Math.min(rise(1, x, z), rise(2, x, z)) + fbm(noise, x * 0.013 + 3, z * 0.013 - 5, 3) * 0.25;
  return smoothstep(0.98, 0.78, r);
};
// the stream valleys behind each front: the Aronde (French) past Gournay, the Divette (German) past Thiescourt
const GULLIES: [number[][], number, number][] = [
  [[[-560, 380], [-350, 368], [-60, 345], [150, 362], [320, 395], [560, 400]], 3.2, 14],
  [[[-560, -365], [-300, -382], [40, -340], [270, -345], [560, -392]], 3.2, 14],
];
// each side's airfield behind its west flank (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: -215, z: 405, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -215, z: -405, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 3 + fbm(noise, x * 0.003, z * 0.003, 4) * 3 + fbm(noise, x * 0.017 + 7, z * 0.017, 2) * 0.5;
  for (let i = 0; i < RISES.length; i++) h += RISES[i][4] * Math.max(0, 1 - rise(i, x, z)) ** 1.4;
  h += heightWood(x, z) * fbm(noise, x * 0.04, z * 0.04, 3) * 1.4;                 // the massifs’ broken tops
  for (const [line, depth, width] of GULLIES) h -= depth * Math.exp(-((segDist(line, x, z) / width) ** 2));
  h += smoothstep(480, 620, Math.abs(x)) * 14 + smoothstep(545, 680, Math.abs(z)) * 12;   // (the rims beyond the edges)
  for (const p of points) h += (h * 0.5 + 2.2 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * (p.id === 'E' ? 0.15 : 0.5);
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (4 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// ---- the other woods: the edge of the Forest of Compiègne behind the French (south-east), the Bois de Lassigny
// behind the Germans (north-west) of the same size; small copses elsewhere, the same area on each half
const NAMED = [[400, 500, 110], [-400, -500, 110]];
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const nato = (x: number, z: number) => z > 0;
const T_N = 0.5, T_P = evenThreshold(wn, T_N, nato);
const woodField = gridCache((x: number, z: number) => {
  if (wet(x, z, 4)) return 0;
  let k = heightWood(x, z);
  for (const [wx, wz, r] of NAMED) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz)));
  if (wn(x, z) > (z > 0 ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 60) k = Math.max(k, 0.7);
  if (airD(x, z) < 20) k = 0;
  return k;
}, { x: 520, z: 580 }, 4);

// ---- the rifle pits: each side’s line of scrapes across its front, wavering; nests at the bridges and on the heights
const pitZ = (x: number, f: 'nato' | 'pact') => (f === 'nato' ? 150 + 20 * Math.sin(x * 0.012 + 2) : -150 - 20 * Math.sin(x * 0.011 + 5));
const NESTS = { nato: [[-40, 70], [40, 75], [250, 95], [350, 90], [-330, 110]], pact: [[-35, -72], [45, -70], [250, -95], [345, -92], [-310, -110]] };

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1re section, 1er bataillon, 412e RI' }];

export default {
  id: 'matz',
  name: 'The Matz',
  description: 'June 1918: the German drive between Montdidier and Noyon for Compiègne and Paris crosses the little Matz at Ressons — and Mangin’s tanks come back over the open wheat from Méry. Wooded heights at Thiescourt and Elincourt, the Aronde behind the French line, the Forest of Compiègne at its back. Scrapes and machine-gun nests, not trench systems.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['fr'], pact: ['de', 'st'] }, // (the French Third and Tenth Armies against the German Eighteenth Army and its storm battalions)
  sides: { nato: 'France', pact: 'Germany' },
  conditions: { time: 'day', weather: 'clear' },      // (warm, dry June weather)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1918_0609,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: 1918_0609, cell: 80, weights: [0.14, 0.1, 0.6, 0.16] as any }),   // (the Oise plateau: wheat nearly everywhere)
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a warm June day over the plateau
    fogColor: 0xb8b6a8, fogDensity: 0.001, skyTop: 0x6688ac, skyHorizon: 0xd4d4ca, skyBottom: 0x8c8a80,
    sunColor: 0xfff0d6, sunIntensity: 2.0, sunDisk: 0.3, clouds: 0.35, cloudLight: 0xf0f0e8, cloudDark: 0x9aa0a4,
    sunDir: [-0.4, 0.72, -0.4], hemiSky: 0xc8d2da, hemiGround: 0x6a6040, hemiIntensity: 1.25, rimColor: 0xd8d8cc, rimIntensity: 0.25,
    terrain: {
      grass: '#5e6a36', grassAlt: '#536131', dryGrass: '#a89a58', dirt: '#6a5a44', rock: '#8e8a7c', strip: '#4e4232',
      pasture: '#5c6a38', ploughed: '#80705a', stubble: '#c4ac60', meadow: '#6a7440',
      farmX: [460, 600], farmZ: [520, 640], roads: [-300, 0, 300], roadZ: 560,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [0x9a8e72, 0.85];                                       // chalk roads
        if (rd < 5.5) return [0x8a7e62, 0.3];
        if (y < 1.6 && wet(x, z, 12)) return [0x5e6a40, 0.6];                          // the Matz’s wet meadows
        if (heightWood(x, z) > 0.6) return [0x4a4a34, 0.5];                            // leaf litter under the massifs’ woods
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Infanterie-Regiment 90' })),
  },

  /** Scrapes and rifle pits along each front, nests at the bridges and on the heights, a strand of wire; the valley shelled. */
  battlefield(game: any) {
    const works: any[] = [];
    const near = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    for (const f of ['nato', 'pact'] as const) {
      const r = mulberry32(f === 'nato' ? 71 : 79), yaw = f === 'nato' ? Math.PI : 0, s = f === 'nato' ? 1 : -1;
      for (let x = -480 + r() * 20; x < 470; x += 34 + r() * 22) {
        const z = pitZ(x, f) + (r() - 0.5) * 16;
        if (heightWood(x, z) > 0.2 || roadD(x, z) < 8 || near(x, z, 30) || wet(x, z, 20)) continue;
        const n = 1 + Math.floor(r() * 2.5);
        for (let k = 0; k < n; k++) works.push({ kind: 'trench', x: x + k * 8.6, z: z + (r() - 0.5) * 2, yaw, faction: f });
        if (r() < 0.18) works.push({ kind: 'mgNest', x: x + 4, z: z - 8 * s, yaw, faction: f });
      }
      for (const [x, z] of NESTS[f]) {
        if (wet(x, z, 6) || roadD(x, z) < 6) continue;
        works.push({ kind: 'mgNest', x, z, yaw, faction: f });
        works.push({ kind: 'wire', x, z: z - 14 * s, yaw, faction: f });
      }
    }
    // the shelling: thickest along the Matz and in the woods of the heights, light over the wheat, each half its own
    const dens = (x: number, z: number) => 0.05 + heightWood(x, z) * 0.8 + (Math.abs(z) < 120 ? 0.45 : Math.abs(z) < 240 ? 0.2 : 0);
    const blasts = [...shellField(1909, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(1910, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter((b) => !wet(b[0], b[1], 10) && roadD(b[0], b[1]) > 5);
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (Math.abs(b.z) < 120 ? 0.4 : 0.12)).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const pitBand = (x: number, z: number) => Math.abs(z - pitZ(x, z > 0 ? 'nato' : 'pact')) < 22;
    const skip = (x: number, z: number) => wet(x, z, 10) || roadD(x, z) < 9 || pitBand(x, z) || airD(x, z) < 25;

    // the villages: farmsteads and walled gardens round their lanes, a church in each of the bigger ones
    for (const id of ['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J']) {
      const p = points.find((q) => q.id === id)!, big = id === 'B' || id === 'C' || id === 'H' || id === 'I';
      farmVillage(props, p.x, p.z, big ? 9 : 7, 1918 * 11 + Math.round(p.x * 3 + p.z * 7), skip, big ? 1.35 : 1.1);
    }
    props.rand = mulberry32(1941);
    for (const [x, z, yaw] of [[P.B[0] + 32, P.B[1] + 28, 0.3], [P.C[0] + 34, P.C[1] - 26, 0.1], [P.H[0] - 30, P.H[1] - 30, Math.PI + 0.2], [P.I[0] - 32, P.I[1] + 24, Math.PI - 0.3], [P.D[0] - 30, P.D[1] + 26, 0.5], [P.J[0] + 30, P.J[1] - 26, Math.PI]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }

    // Ressons-sur-Matz: a small market town on both banks of the bridge, stone houses along the road, its church
    props.rand = mulberry32(1942);
    for (let z = -110; z <= 110; z += 13) for (let x = -90; x <= 90; x += 15) {
      const hx = x + (props.rand() - 0.5) * 4, hz = z + (props.rand() - 0.5) * 4;
      if (wet(hx, hz, 10) || roadD(hx, hz) < 7 || nearPoint(hx, hz, 18) || Math.hypot(hx, hz) > 105 || props.rand() < 0.3) continue;
      props.townHouse({ x: hx, z: hz, yaw: Math.PI / 2 * (props.rand() < 0.5 ? 1 : -1), width: 7 + props.rand() * 3, depth: 8, storeys: props.rand() < 0.5 ? 2 : 1, name: 'house', damaged: 0.25 });
    }
    props.church({ x: 44, z: -40, yaw: Math.PI / 2 });
    for (const x of [0, 300]) for (const s of [1, -1]) props.sandbagRing({ x: x + 16, z: s * 24, radius: 4, toward: s }); // the machine-gunners at both bridgeheads

    // farmsteads, field walls and hay over the wheat (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'rocks'];
    for (let tries = 0, n = 0; n < 120 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (woodField(x, z) > 0.3 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || Math.hypot(x, z) < 120 || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 4.5 || airD(x, z) < 12 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 6000, hedges: 1500, autumn: 0.05, broadleaf: 0.85,
      forest: (x: number, z: number) => {
        if (wet(x, z, 4)) return -1;
        const k = woodField(x, z);
        if (k > 0.5) return heightWood(x, z) > 0.5 ? 1 : pitBand(x, z) ? 0.2 : 0.85;
        return wet(x, z, 14) ? 0.15 : 0;                                    // (willows along the Matz)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
