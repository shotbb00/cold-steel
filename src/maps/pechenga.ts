// Pechenga, winter 1985 (the big field, 1.0 × 1.12 km): the Kola side of the Norwegian–Soviet border, where the
// Soviet Army would have attacked out of the Pechenga (Petsamo) district into Sør-Varanger, and where NATO would have
// pushed in a counterstroke. Bare tundra hills, birch scrub in the hollows, bogs under the snow; the border rivers —
// the Pasvik, wide and fast below the Boris Gleb power dam (open all winter), and the narrow Jakobselv down to the
// Barents Sea — across the middle; the Soviet nickel towns behind them. The map is turned: real south-west (Nikel,
// the Pasvik) is the west edge, the Barents coast the east edge, Norway the south (+z) and Kola the north (-z).
// On the map: NATO (Brigade Nord with the US Marines’ 4th MAB) comes from Jarfjordbotn, the Soviet Army from the
// Luostari garrison and its airfield. The Norwegian bank: Skoltefossen on the Pasvik, Gjøkåsen on the E105,
// Jarfjord on its fjord under Jarfjordfjellet. The border: the Boris Gleb dam and church, the Storskog bridge,
// Grense Jakobselv’s mouth with the King Oscar II chapel. The Soviet side: Nikel with its smelter stacks and slag,
// Zapolyarny with the ore plant and the open-pit’s spoil, Pechenga at the head of its long narrow bay.
// Fairness: not a mirror — the river winds its own way, Jarfjord is broad and short and Pechenga Bay long and narrow,
// the big fell is Jarfjordfjellet in the east on the Norwegian side and the ridge between Nikel and Zapolyarny in the
// west on the Soviet side — but each side has its own bank, one bridge on each flank and the Storskog bridge in the
// middle, a valley village, a road town and a fjord-side village at the same reach of road, a big fell and a low rise
// of its own, and a strip for its aircraft behind its line (measured: tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache } from './gridCache.js';
import { segDist, arcticTheme, snowSurface, snowSoft, woodenVillage, roadside, taiga } from './arctic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const DECK = 6.5;
const noise = createNoise2D(1985_81);

// ---- the border rivers, west to east across the middle: the Pasvik wide in the west, the Jakobselv narrow in the east
const riverZ = (x: number) => -0.05 * x + 16 * Math.sin(x * 0.008 + 0.5) + 6 * Math.sin(x * 0.022) - 2;
const riverW = (x: number) => Math.max(8, 15 - 0.012 * x + 2 * Math.sin(x * 0.02 + 1));
/** Metres from the river's water (negative: on it). */
const riverD = (x: number, z: number) => Math.abs(z - riverZ(x)) * 0.95 - riverW(x);
const BRIDGES = [{ x: -300, name: 'Boris Gleb dam' }, { x: 0, name: 'Storskog bridge' }, { x: 330, name: 'Jakobselv bridge' }]
  .map((b) => ({ ...b, z0: riverZ(b.x) - riverW(b.x) - 16, z1: riverZ(b.x) + riverW(b.x) + 16 }));
const onBridge = (x: number, z: number) => BRIDGES.some((b) => Math.abs(x - b.x) < 7 && z > b.z0 && z < b.z1);

// ---- the salt water on the east edge (never freezes): Jarfjord broad and short, Pechenga Bay long and narrow
const BAYS = [{ x: 560, z: 330, rx: 160, rz: 95, rot: 0.2 }, { x: 560, z: -310, rx: 250, rz: 55, rot: -0.15 }];
const bayQ = (x: number, z: number) => Math.min(...BAYS.map((B) => {
  const c = Math.cos(B.rot), s = Math.sin(B.rot), dx = x - B.x, dz = z - B.z;
  const lx = (dx * c - dz * s) / B.rx, lz = (dx * s + dz * c) / B.rz, a = Math.atan2(lz, lx);
  return Math.hypot(lx, lz) * (1 + 0.08 * Math.sin(3 * a + B.z) + 0.05 * Math.sin(5 * a));
}));

// ---- the roads, each half its own: the E105 down the middle over Storskog, a road up each flank over its bridge,
// a road along each bank
const ROADS: number[][][] = [
  [[0, 560], [0, 470], [30, 360], [-10, 250], [15, 140], [0, 90], [0, -90], [-25, -160], [-35, -250], [10, -370], [0, -470], [0, -560]], // the E105
  [[30, 360], [-170, 345], [-330, 300], [-320, 170], [-300, 70], [-300, -70], [-335, -170], [-340, -300], [-180, -340], [10, -370]],     // west: Skoltefossen, the dam, Nikel
  [[30, 360], [170, 330], [300, 280], [315, 160], [330, 62], [330, -90], [300, -180], [285, -275], [150, -350], [10, -370]],             // east: Jarfjord, Jakobselv, Pechenga
  [[-300, 75], [-150, 95], [0, 85], [150, 70], [330, 62]],                                                                               // the Norwegian bank road
  [[-300, -80], [-140, -70], [0, -80], [160, -95], [330, -90]],                                                                          // the Soviet bank road
];
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
/** x of a (z-monotone) road at z. */
const polyX = (l: number[][], z: number) => {
  for (let i = 0; i < l.length - 1; i++) { const [x0, z0] = l[i], [x1, z1] = l[i + 1]; if ((z - z0) * (z - z1) <= 0 && z0 !== z1) return x0 + (x1 - x0) * (z - z0) / (z1 - z0); }
  return l[0][0];
};
const mainDist = (x: number, z: number) => { let d = Infinity; const l = ROADS[0]; for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1])); return d; };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Jarfjordbotn', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Skoltefossen', x: -330, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Gjøkåsen', x: -10, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Jarfjord', x: 300, z: 280, owner: null, sector: 'east' },
  { id: 'E', name: 'Boris Gleb', x: -300, z: riverZ(-300), owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Storskog', x: 0, z: riverZ(0), owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Grense Jakobselv', x: 330, z: riverZ(330), owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Nikel', x: -340, z: -300, owner: null, sector: 'west', radius: 30 },
  { id: 'I', name: 'Zapolyarny', x: -35, z: -250, owner: null, sector: 'centre', radius: 28 },
  { id: 'J', name: 'Pechenga', x: 285, z: -275, owner: null, sector: 'east' },
  { id: 'K', name: 'Luostari', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// each side's airfield (systems/Airfields.js): Luostari's for the Soviets, a strip graded behind Jarfjordbotn for NATO —
// the runway 55 m behind the tower, graded flat and kept clear
const AIR = [{ faction: 'nato', x: 210, z: 390, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -170, z: -390, yaw: -Math.PI / 2, large: false }];
const STRIPS = AIR.map((a) => ({ x: a.x, z: a.z + (a.faction === 'nato' ? 55 : -55) }));
const onAir = (x: number, z: number, m = 0) => AIR.some((a, i) => Math.abs(x - a.x) < 125 + m && Math.abs(z - (a.z + STRIPS[i].z) / 2) < 50 + m);

const DRY = [...points.map((p) => [p.x, p.z, 55]), [0, BASE_Z, 70], [0, -BASE_Z, 70]];
const keepClear = (x: number, z: number) => {
  let k = smoothstep(10, 26, roadDist(x, z)) * smoothstep(6, 20, riverD(x, z));
  for (const [px, pz, r] of DRY) k = Math.min(k, smoothstep(r - 15, r + 15, Math.hypot(x - px, z - pz)));
  return Math.min(k, onAir(x, z, 30) ? 0 : 1, smoothstep(1.2, 1.6, bayQ(x, z)));
};
const bogC = gridCache((x: number, z: number) => smoothstep(0.1, 0.22, fbm(noise, x * 0.006 + 423.3, z * 0.006 - 261.1, 3)) * keepClear(x, z), BOUNDS);
// birch scrub in the hollows and along the rivers, bare tundra on the tops (taiga's maxY)
const woodsK = (x: number, z: number) => (riverD(x, z) < 3 || bayQ(x, z) < 1.1 ? -1 : 1) * (fbm(noise, x * 0.008 + 908.2, z * 0.008 - 561.4, 3) > 0.02 ? 0.75 : 0.03)
  * smoothstep(6, 16, roadDist(x, z)) * (1 - 0.7 * bogC(x, z)) * (onAir(x, z, 15) ? 0 : 1)
  * Math.min(1, ...DRY.map(([px, pz, r]) => smoothstep(r * 0.55, r + 10, Math.hypot(x - px, z - pz))));
const woodsC = gridCache((x: number, z: number) => Math.max(0, woodsK(x, z)), BOUNDS);

// the fells, each half its own: Jarfjordfjellet (east) and a low rise (west) on the Norwegian side; the ridge between
// Nikel and Zapolyarny (west) and a low rise over Pechenga (east) on the Soviet side; the smaller knolls by the bases
const RISES: [number, number, number, number][] = [[210, 170, 75, 20], [-150, 150, 55, 8], [-200, 410, 65, 12],
  [-150, -160, 80, 20], [140, -120, 50, 8], [120, -430, 60, 12]];
// Nikel's slag tips and Zapolyarny's open-pit spoil: black heaps beside the towns
const HEAPS: [number, number, number, number][] = [[-400, -330, 34, 7], [-100, -310, 30, 6]];
const heapK = (x: number, z: number) => HEAPS.reduce((k, [cx, cz, r]) => Math.max(k, smoothstep(r, r * 0.4, Math.hypot(x - cx, z - cz))), 0);

function ground(x: number, z: number) {
  const rd = riverD(x, z);
  if (rd < 0) return Math.max(-3.5, 0.8 + rd * 0.35);                                  // the river: a stony bed, deep in the middle
  let h = 12 + fbm(noise, x * 0.004, z * 0.004, 4) * 8 + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.8;
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  for (const [cx, cz, r, a] of HEAPS) h += a * smoothstep(r, r * 0.3, Math.hypot(x - cx, z - cz));
  h -= smoothstep(18, 5, roadDist(x, z)) * (h - 10) * 0.5;                            // the roads keep to the low ground
  h -= bogC(x, z) * 1.2;
  for (const s of STRIPS) h += (12 - h) * smoothstep(60, 20, Math.abs(z - s.z)) * smoothstep(170, 130, Math.abs(x - s.x)); // the strips graded flat
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14 + smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, -x) * 20;
  for (const bz of [BASE_Z, -BASE_Z]) h += (12 - h) * smoothstep(40, 20, Math.hypot(x, z - bz));
  h = 1.6 + (h - 1.6) * smoothstep(0, 70, rd);                                         // the banks down to the water (a broad valley)
  const q = bayQ(x, z);                                                                // the bays: the shore down to the sea
  if (q < 1) return Math.max(-6, (q - 1) * 25 - 0.5);
  return 1.4 + (h - 1.4) * smoothstep(1, 1.45, q);
}
function height(x: number, z: number) {
  let h = ground(x, z);
  for (const b of BRIDGES) { // the decks across the water, ramps down at each end
    const along = Math.max(b.z0 - z, z - b.z1, 0), k = smoothstep(8.5, 7, Math.abs(x - b.x)) * smoothstep(30, 0, along);
    if (k > 0) h += (Math.max(h, DECK - along * 0.12) - h) * k;
  }
  return h;
}

const softV = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, false), BOUNDS);
const softF = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, true), BOUNDS);

const water = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false, // (the rivers and the bays: water that stops — world/Sea.js answers the rest)
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a3c44, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
    this.waterMesh = m;
  },
};

export default {
  id: 'pechenga',
  name: 'Pechenga',
  description: 'The Kola side of the Norwegian–Soviet border in winter 1985: the Pasvik and Jakobselv border rivers, the nickel towns of Nikel and Zapolyarny, Pechenga at the head of its bay. Bare tundra hills, birch scrub and bogs under the snow.',
  epochs: ['1985'],
  region: 'north',
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (Brigade Nord and the US Marines’ 4th MAB against the Soviet Army on Kola)
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  climate: 'winter', // whitewash and snow smocks (render/paint.js CLIMATE)
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985_81,
  height,
  soft: (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z),
  river: water,
  airfields: AIR,
  woods: (x: number, z: number) => woodsC(x, z) * 0.6, // (scrub: you see a little further through it)

  theme: arcticTheme({
    clouds: 0.75, sunIntensity: 1.25, fogDensity: 0.0012, skyTop: 0x62788e,
    terrain: {
      surface(x: number, z: number, y: number) {
        if (onBridge(x, z)) return [0x6a6a6a, 0.95];                                      // the decks
        if (y < 1.3 && (riverD(x, z) < 6 || bayQ(x, z) < 1.3)) return [0x6a6862, 0.8];    // the dark stony shore
        const hk = heapK(x, z);
        if (hk > 0.05) return [0x4a4642, Math.min(1, hk * 1.5)];                           // the slag, too warm for snow to lie
        return snowSurface(x, z, { road: roadDist(x, z), main: mainDist(x, z) < 4.5, ice: () => 0, bog: bogC, noise });
      },
    },
  }),

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1-ya Rota', facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    water.build(scene);
    const skip = (x: number, z: number, r: number) => roadDist(x, z) < 9 + r || riverD(x, z) < 6 + r || bayQ(x, z) < 1.2 + r * 0.004 || onAir(x, z, r)
      || heapK(x, z) > 0 || BRIDGES.some((b) => Math.abs(x - b.x) < 14 + r && z > b.z0 - 30 && z < b.z1 + 30);
    const pt = (id: string) => points.find((p) => p.id === id)!;

    // ---- Nikel: the smelter's hall and stacks, Soviet blocks of flats on the rise beside it
    const h = pt('H');
    props.rand = mulberry32(1985_82);
    for (const [dx, dz] of [[45, -40], [55, 5], [45, 45], [-50, 40], [-10, 60], [-55, -15]]) if (!skip(h.x + dx, h.z + dz, 14)) flats(props, { x: h.x + dx, z: h.z + dz, yaw: Math.PI / 2, storeys: 5, width: 28, depth: 11 });
    props.hall({ x: h.x - 20, z: h.z - 75, yaw: 0.2, width: 42, depth: 18, height: 14, color: 0x5e5a54, roof: 0x3a3a3a, door: 10, name: 'Pechenganikel smelter' });
    for (const dx of [-12, 14]) props.chimney({ x: h.x - 20 + dx, z: h.z - 105, height: 50 });
    // ---- Zapolyarny: the ore plant (headframe, conveyor, silos) and the town's blocks
    const i0 = pt('I');
    props.rand = mulberry32(1985_83);
    for (const [dx, dz] of [[50, -30], [55, 20], [-55, 25], [-50, -25], [10, 55], [20, -60]]) if (!skip(i0.x + dx, i0.z + dz, 14)) flats(props, { x: i0.x + dx, z: i0.z + dz, yaw: dx > 0 ? Math.PI / 2 : 0, storeys: 5, width: 28, depth: 11 });
    props.hall({ x: i0.x - 110, z: i0.z - 15, yaw: Math.PI / 2, width: 36, depth: 16, height: 12, color: 0x6e6a64, roof: 0x3e4044, door: 10, name: 'ore concentrator' });
    props.headframe({ x: i0.x - 125, z: i0.z + 40, yaw: 0, height: 30 });
    props.tanks({ x: i0.x - 85, z: i0.z + 30, yaw: 0, count: 3, radius: 4, height: 14, color: 0x8e8e88 });
    props.conveyor({ x0: i0.x - 118, z0: i0.z + 30, y0: 18, x1: i0.x - 112, z1: i0.z - 4, y1: 10 });
    // ---- Pechenga: wooden houses and a few blocks at the head of the bay, the old monastery church; Luostari's barracks
    const j = pt('J');
    props.rand = mulberry32(1985_84);
    for (const [dx, dz] of [[-60, 20], [-55, -30]]) if (!skip(j.x + dx, j.z + dz, 14)) flats(props, { x: j.x + dx, z: j.z + dz, yaw: 0, storeys: 3, width: 24, depth: 11 });
    props.church({ x: j.x - 30, z: j.z + 50, yaw: 0 });
    for (const [dx, dz] of [[-70, 20], [70, 30], [-75, -30]]) props.hall({ x: dx, z: -BASE_Z + dz, yaw: 0, width: 30, depth: 10, height: 6, color: 0x7a7a6a, roof: 0x3a3a3a, door: 4, name: 'barracks' });
    // ---- Jarfjordbotn: the Garrison in Sør-Varanger's company post
    for (const [dx, dz] of [[-65, -20], [65, -25]]) props.hall({ x: dx, z: BASE_Z + dz, yaw: 0, width: 26, depth: 10, height: 6, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'barracks' });

    // ---- the border: the Boris Gleb power station by its dam and the church on the Soviet bank; Storskog's stations;
    // the King Oscar II chapel at Grense Jakobselv, Soviet watchtowers along their bank
    const e = pt('E');
    props.hall({ x: e.x - 40, z: e.z - 40, yaw: 0, width: 24, depth: 14, height: 10, color: 0x9a948a, roof: 0x3e4044, door: 6, name: 'Boris Gleb power station' });
    props.church({ x: e.x + 45, z: e.z - 48, yaw: Math.PI / 2 });
    props.hall({ x: 28, z: riverZ(0) + 48, yaw: 0, width: 22, depth: 10, height: 5, color: 0xc8c4b8, roof: 0x3e4044, door: 4, name: 'Storskog customs' });
    props.hall({ x: -28, z: riverZ(0) - 50, yaw: 0, width: 20, depth: 10, height: 5, color: 0x8a8a7a, roof: 0x3a3a3a, door: 4, name: 'Soviet border post' });
    props.rand = mulberry32(1985_85);
    for (const [dx, dz] of [[-6, 54], [6, 60], [-6, -58], [6, -64]]) props.jersey({ x: dx, z: riverZ(0) + dz, yaw: 0.1, length: 5 });
    const g = pt('G');
    props.church({ x: g.x - 40, z: g.z + 52, yaw: 0 });
    for (const tx of [-200, -100, 120, 200]) { const tz = riverZ(tx) - riverW(tx) - 22; if (!skip(tx, tz, 2)) props.tower({ x: tx, z: tz }); }

    // ---- the villages on the Norwegian bank (and Pechenga's wooden houses)
    for (const id of 'BCDJ') {
      const p = pt(id);
      props.rand = mulberry32(8100 + Math.round(p.x * 3 + p.z));
      woodenVillage(props, p, { n: id === 'J' ? 6 : 5, big: id === 'B', skip });
    }
    roadside(props, 1985_86, { along: (k: number, z: number) => [polyX(ROADS[k % 3], z)], points, road: (x: number, z: number) => (skip(x, z, 0) ? 0 : roadDist(x, z)), ice: () => 0, bases: [this.bases.nato, this.bases.pact] });

    // ---- the bridges: deck, rails, piers; the dam a wall of concrete under the west one
    for (const b of BRIDGES) {
      const mid = (b.z0 + b.z1) / 2, len = b.z1 - b.z0;
      props.box('plain', b.x, DECK - 0.2, mid, 14, 0.6, len, 0, 0x707070);
      for (const s of [-1, 1]) props.box('plain', b.x + s * 6.8, DECK + 0.6, mid, 0.2, 1, len, 0, 0x8a8a8a);
      if (b.x < 0) props.box('stone', b.x + 10, 1.5, mid, 6, 9, len - 20, 0, 0x8a8a84);
      else for (let z = b.z0 + 14; z < b.z1 - 10; z += 14) props.box('stone', b.x, 0.5, z, 8, 11, 2.5, 0, 0x7a7a74);
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 34 }, { x: 0, z: -BASE_Z, r: 34 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || riverD(x, z) < 3 || bayQ(x, z) < 1.1 || onAir(x, z, 10) || heapK(x, z) > 0 || onBridge(x, z) }];
    const update = taiga({ scene, terrain, cover, rand, bounds, palette: this.theme.terrain, avoid, forest: woodsK, maxY: 30, trees: 6000, size: 0.6 });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
