// Belleau Wood, June 1918 (1918 only; the Western Front; the big field, 1.0 × 1.12 km). The German spring drive has
// reached the Marne at Château-Thierry, fifty miles from Paris; the US 2nd Division — the Marine Brigade and the
// Army’s 3rd Brigade — is thrown in astride the Paris–Metz road to stop it, and on 6 June the Marines go forward
// through the wheat in long lines against the machine guns of Hill 142, Bouresches and the wood. Three weeks of fighting
// for the old hunting wood — rocky, dense, cut by ravines and strewn with boulders, every nest a fort — until on
// 26 June: “Woods now U.S. Marine Corps entirely”. The Army’s brigade takes Vaux on 1 July. Mobile war again: scrapes
// and rifle pits dug in the night, machine-gun nests, no deep trench systems.
// On the map: the wood in the middle on its rocky rise, its ravines and boulders and the hunting lodge; the open
// golden wheat round it; Hill 142 on the west, Hill 204 over the Marne on the east; Lucy-le-Bocage, Champillon and Vaux
// on the American side (south, +z), Torcy, Belleau and Bouresches on the German (north); the Paris–Metz road coming in
// from the south-west and the Soissons road from the north, both running down to the Marne along the east flank, where
// Château-Thierry lies on the far bank behind its stone bridge and the railway bridge.
// Not mirrored but fair: the wood and both named hills lie across the middle; the Marne runs down the east flank, not
// between the sides, and each side has its own bridge into Château-Thierry, as far from its base as the other’s. Each
// side has a village on its west flank (Champillon; Torcy), one in the middle by the forest ride (Lucy; Belleau), one on
// the east road (Vaux; Bouresches), a gentle rise behind its front (the Lucy rise; Hill 193), a ravine of its own (the
// Ru Gobert; the Clignon valley), a wood or two behind it of the same area, and its own line of rifle pits; inside the
// wood each holds the nests on its own edge.
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
const noise = createNoise2D(1918_06);

// ---- the Marne down the east flank: straight past Château-Thierry, where the two bridges cross it
const HW = 14;
const river = createRiver({
  path: [[372, -720], [392, -470], [378, -260], [387, -120], [386, 130], [400, 300], [382, 520], [394, 720]],
  halfWidth: HW, level: 0, depth: 3, valley: 58,
  crossings: [
    { name: 'Château-Thierry bridge', x: 386, z: 45, kind: 'bridge', width: 9 },
    { name: 'railway bridge', x: 387, z: -55, kind: 'bridge', width: 8 },
  ],
});
const wet = (x: number, z: number, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

// ---- the points
const P = { B: [-370, 320], C: [-110, 300], D: [250, 300], E: [-330, 30], F: [0, -10], G: [455, 0], H: [-290, -310], I: [-20, -305], J: [240, -290] };
const points: ControlPointDef[] = [
  { id: 'A', name: 'La Voie du Châtel', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Champillon', x: P.B[0], z: P.B[1], owner: null, sector: 'west' },
  { id: 'C', name: 'Lucy-le-Bocage', x: P.C[0], z: P.C[1], owner: null, sector: 'centre' },
  { id: 'D', name: 'Vaux', x: P.D[0], z: P.D[1], owner: null, sector: 'east' },
  { id: 'E', name: 'Hill 142', x: P.E[0], z: P.E[1], owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Belleau Wood', x: P.F[0], z: P.F[1], owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Château-Thierry', x: P.G[0], z: P.G[1], owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Torcy', x: P.H[0], z: P.H[1], owner: null, sector: 'west' },
  { id: 'I', name: 'Belleau', x: P.I[0], z: P.I[1], owner: null, sector: 'centre' },
  { id: 'J', name: 'Bouresches', x: P.J[0], z: P.J[1], owner: null, sector: 'east' },
  { id: 'K', name: 'Bussiares road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the roads: the Paris–Metz road and the Soissons road down to the bridges, the bank road through the town,
// the forest ride through the wood, the lanes between the villages
const ROADS = [
  [[-560, 425], [-280, 448], [0, 470], [140, 420], P.D, [320, 150], [352, 62], [372, 45], [402, 45], [440, 30], P.G],   // Paris–Metz road
  [[-560, -440], [-270, -455], [0, -470], [130, -410], P.J, [320, -160], [352, -72], [372, -55], [402, -55], [440, -30], P.G], // Soissons road
  [[470, -580], [462, -200], P.G, [466, 200], [476, 580]],                                   // the north-bank road through the town
  [[0, 470], [-60, 390], P.C, [-60, 160], [-10, 70], P.F, [-30, -110], [-20, -220], P.I, [0, -470]], // the forest ride: Lucy – the wood – Belleau
  [[-300, 580], [-330, 440], P.B, [-360, 180], P.E],
  [[-300, -580], [-280, -430], P.H, [-330, -160], P.E],
  [P.C, [-220, 170], P.E], [P.I, [-170, -180], P.E],
  [P.C, [60, 230], P.D], [P.I, [110, -250], P.J],
  [P.D, [270, 140], [292, 0], [280, -140], P.J],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

// ---- Belleau Wood: long north–south, pinched at the waist, its edge ragged
const woodMask = (x: number, z: number) => {
  const zz = z + 10, ax = 125 * (1 - 0.32 * Math.exp(-(((zz + 15) / 55) ** 2))), az = 195;
  const r = Math.hypot(x / ax, zz / az) + fbm(noise, x * 0.012 + 3, z * 0.012 - 5, 3) * 0.28;
  return smoothstep(1.05, 0.85, r);
};
// the ravines in the wood (one across the waist, one in each half) and outside it (the Ru Gobert behind Lucy; the Clignon by Torcy)
const GULLIES: [number[][], number, number][] = [
  [[[-95, -45], [-25, -28], [70, -62]], 3.2, 8], [[[35, 55], [55, 135]], 2.6, 7], [[[-55, -105], [-25, -175]], 2.6, 7],
  [[[-520, 250], [-420, 210], [-260, 215], [-200, 250]], 3.5, 12], [[[-520, -215], [-420, -235], [-200, -250]], 3.5, 12],
];
// the rises: [x, z, rx, rz, h] — Hill 142, Hill 204 over the Marne, the Lucy rise, Hill 193 behind Belleau
const RISES = [[-330, 40, 120, 95, 9.5], [300, -25, 95, 120, 9.5], [-40, 400, 170, 90, 4], [70, -400, 170, 90, 4]];
// each side's airfield behind its west flank (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: -215, z: 405, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -215, z: -405, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 3 + fbm(noise, x * 0.003, z * 0.003, 4) * 3 + fbm(noise, x * 0.017 + 7, z * 0.017, 2) * 0.5;
  for (const [hx, hz, rx, rz, hh] of RISES) h += hh * Math.max(0, 1 - Math.hypot((x - hx) / rx, (z - hz) / rz)) ** 1.4;
  const w = woodMask(x, z);
  h += w * (4 + fbm(noise, x * 0.045, z * 0.045, 3) * 1.6);                 // the wood’s rocky rise
  for (const [line, depth, width] of GULLIES) h -= depth * Math.exp(-((segDist(line, x, z) / width) ** 2));
  h += smoothstep(480, 620, Math.abs(x)) * 14 + smoothstep(545, 680, Math.abs(z)) * 12;   // (the rims beyond the edges)
  for (const p of points) h += (h * 0.5 + 2.2 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * (p.id === 'E' ? 0.15 : 0.5);
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (4 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// ---- the other woods: Bois de Veuilly and the Triangle wood behind the Americans, Bois de Bussiares and Etrepilly behind the Germans; copses elsewhere
const NAMED = [[-430, 430, 70], [170, 400, 60], [-420, -430, 72], [160, -420, 58]];
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const nato = (x: number, z: number) => z > 0;
const T_N = 0.42, T_P = evenThreshold(wn, T_N, nato);
const woodField = gridCache((x: number, z: number) => {
  if (wet(x, z, 4)) return 0;
  let k = woodMask(x, z);
  for (const [wx, wz, r] of NAMED) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz)));
  if (wn(x, z) > (z > 0 ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 60) k = Math.max(k, 0.7);
  if (airD(x, z) < 20) k = 0;
  return k;
}, { x: 520, z: 580 }, 4);

// ---- the rifle pits: each side’s line of scrapes across its front, wavering; the nests at its own edge of the wood
const pitZ = (x: number, f: 'nato' | 'pact') => (f === 'nato' ? 175 + 22 * Math.sin(x * 0.011 + 1) : -180 - 18 * Math.sin(x * 0.013 + 4));
const NESTS = { nato: [[-60, 150], [40, 160], [-90, 95], [95, 110]], pact: [[-70, -175], [50, -185], [-100, -120], [90, -140], [10, -80]] };

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon, 5th Marines' }];

export default {
  id: 'belleau-wood',
  name: 'Belleau Wood',
  description: 'June 1918: the US 2nd Division stops the German drive on Paris and the Marines take Belleau Wood — a rocky hunting wood of boulders and ravines in a sea of open wheat, Hill 142 to the west, the Marne and Château-Thierry’s bridges on the east flank. Rifle pits and machine-gun nests, not trench systems.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['aef', 'fr'], pact: ['de', 'st'] }, // (the US 2nd Division, the French beside it, against the German 237th and 28th Divisions; aef has no units yet: fr fights for it)
  sides: { nato: 'United States', pact: 'Germany' },
  conditions: { time: 'day', weather: 'clear' },      // (a hot, clear June)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1918_06,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: 1918_06, cell: 76, weights: [0.16, 0.1, 0.56, 0.18] as any }),   // (mostly wheat, standing and ripening)
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a hot June day over the Brie plateau
    fogColor: 0xb6b4a6, fogDensity: 0.001, skyTop: 0x648aae, skyHorizon: 0xd2d4ca, skyBottom: 0x8c8a80,
    sunColor: 0xfff0d4, sunIntensity: 2.0, sunDisk: 0.3, clouds: 0.3, cloudLight: 0xf0f0e8, cloudDark: 0x9ca2a6,
    sunDir: [0.45, 0.72, -0.35], hemiSky: 0xc8d2da, hemiGround: 0x6a6040, hemiIntensity: 1.25, rimColor: 0xd8d8cc, rimIntensity: 0.25,
    terrain: {
      grass: '#5c6a36', grassAlt: '#526031', dryGrass: '#a49656', dirt: '#6a5a44', rock: '#8e8a7c', strip: '#4e4232',
      pasture: '#5c6a38', ploughed: '#7e6e52', stubble: '#c2aa5e', meadow: '#6a7440',
      farmX: [460, 600], farmZ: [520, 640], roads: [-300, 0, 300], roadZ: 560,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [0x9a8e72, 0.85];                                       // white limestone roads
        if (rd < 5.5) return [0x8a7e62, 0.3];
        if (y < 1.6 && wet(x, z, 12)) return [0x6e6450, 0.7];                          // the Marne’s muddy banks
        if (woodMask(x, z) > 0.6) return [0x4a4a34, 0.5];                              // leaf litter and rock under the wood
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Infanterie-Regiment 461' })),
  },

  /** Scrapes and rifle pits in pairs along each front, nests at each side’s edge of the wood, a little wire; the wood and wheat shelled. */
  battlefield(game: any) {
    const works: any[] = [];
    const near = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    for (const f of ['nato', 'pact'] as const) {
      const r = mulberry32(f === 'nato' ? 61 : 67), yaw = f === 'nato' ? Math.PI : 0, s = f === 'nato' ? 1 : -1;
      for (let x = -480 + r() * 20; x < 350; x += 34 + r() * 22) {
        const z = pitZ(x, f) + (r() - 0.5) * 16;
        if (woodMask(x, z) > 0.2 || roadD(x, z) < 8 || near(x, z, 30) || wet(x, z, 20)) continue;
        const n = 1 + Math.floor(r() * 2.5);
        for (let k = 0; k < n; k++) works.push({ kind: 'trench', x: x + k * 8.6, z: z + (r() - 0.5) * 2, yaw, faction: f });
        if (r() < 0.18) works.push({ kind: 'mgNest', x: x + 4, z: z - 8 * s, yaw, faction: f });
      }
      for (const [x, z] of NESTS[f]) {
        works.push({ kind: 'mgNest', x, z, yaw, faction: f });
        works.push({ kind: 'wire', x, z: z - 16 * s, yaw, faction: f });   // (a strand or two in front of the nest)
      }
    }
    // the shelling: heavy in the wood (the guns shot it to stumps by the end), light over the wheat, each half its own
    const dens = (x: number, z: number) => 0.05 + woodMask(x, z) * 1.6 + (Math.abs(z) < 220 ? 0.25 : 0);
    const blasts = [...shellField(1906, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(1907, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter((b) => !wet(b[0], b[1], 10) && roadD(b[0], b[1]) > 5);
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (Math.abs(b.z) < 340 ? 0.35 : 0.12)).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const pitBand = (x: number, z: number) => Math.abs(z - pitZ(x, z > 0 ? 'nato' : 'pact')) < 22;
    const skip = (x: number, z: number) => wet(x, z, 10) || roadD(x, z) < 9 || pitBand(x, z) || airD(x, z) < 25;

    // the villages: farmsteads and walled gardens round their lanes, a church in each of the bigger ones
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J']) {
      const p = points.find((q) => q.id === id)!, big = id === 'C' || id === 'I' || id === 'J' || id === 'D';
      farmVillage(props, p.x, p.z, big ? 9 : 7, 1918 * 10 + Math.round(p.x * 3 + p.z * 7), skip, big ? 1.35 : 1.1);
    }
    props.rand = mulberry32(1931);
    for (const [x, z, yaw] of [[P.C[0] + 34, P.C[1] + 26, 0.3], [P.I[0] - 30, P.I[1] - 30, Math.PI + 0.2], [P.J[0] + 32, P.J[1] - 22, Math.PI - 0.4], [P.D[0] - 30, P.D[1] + 30, 0.5], [P.H[0] + 30, P.H[1] - 28, Math.PI]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }
    // the hunting lodge in the wood, its yard wall
    props.house({ x: P.F[0] + 22, z: P.F[1] - 18, yaw: 0.4, width: 10, depth: 8 });
    props.lowWall({ x: P.F[0] + 22, z: P.F[1] - 34, yaw: Math.PI / 2 + 0.4, length: 16, height: 1.2 });

    // Château-Thierry on the far bank: stone town houses along its streets, the church, the old castle’s wall on the rise
    props.rand = mulberry32(1932);
    for (let z = -170; z <= 170; z += 13) for (let x = 418; x <= 496; x += 15) {
      const hx = x + (props.rand() - 0.5) * 4, hz = z + (props.rand() - 0.5) * 4;
      if (wet(hx, hz, 12) || roadD(hx, hz) < 7 || nearPoint(hx, hz, 16) || props.rand() < 0.15) continue;
      props.townHouse({ x: hx, z: hz, yaw: Math.PI / 2 * (props.rand() < 0.5 ? 1 : -1), width: 7 + props.rand() * 3, depth: 8, storeys: props.rand() < 0.6 ? 2 : 1, name: 'house', damaged: 0.2 });
    }
    props.church({ x: 478, z: 62, yaw: Math.PI / 2 });
    for (const [x, z, yaw, len] of [[486, -96, 0, 26], [474, -120, Math.PI / 2, 22], [496, -120, Math.PI / 2, 22]]) props.lowWall({ x, z, yaw, length: len, height: 3, color: 0x9a927e });
    for (const z of [45, -55]) props.sandbagRing({ x: 360, z: z + 14, radius: 4, toward: 1 });   // the machine-gunners at the bridgeheads

    // the boulders of the wood: everywhere under the trees, thickest along the ravines
    props.rand = mulberry32(1933);
    for (let i = 0, n = 0; n < 260 && i < 6000; i++) {
      const x = (props.rand() * 2 - 1) * 140, z = -220 + props.rand() * 420;
      if (woodMask(x, z) < 0.55 || roadD(x, z) < 6 || nearPoint(x, z, 10)) continue;
      const g = Math.min(...GULLIES.slice(0, 3).map(([l]) => segDist(l, x, z)));
      if (g > 30 && props.rand() < 0.5) continue;
      props.boulder({ x, z, radius: 0.7 + props.rand() * (g < 20 ? 2 : 1.3) }); n++;
    }

    // farmsteads, field walls and hay over the wheat (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'rocks'];
    for (let tries = 0, n = 0; n < 120 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (x > 330 || woodField(x, z) > 0.3 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 4.5 || airD(x, z) < 12 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 6500, hedges: 1800, autumn: 0.05, broadleaf: 0.85,
      noHedge: (x: number, z: number) => x > 340,
      forest: (x: number, z: number) => {
        if (wet(x, z, 4)) return -1;
        const k = woodField(x, z);
        if (k > 0.5) return woodMask(x, z) > 0.5 ? 1 : pitBand(x, z) ? 0.2 : 0.85;
        return 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
