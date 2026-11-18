// Kasserine Pass, February 1943 (1945 only; North Africa): Rommel's panzers through the Western Dorsal of
// Tunisia against the green troops of US II Corps. The pass runs along z through the middle of the map: a
// throat ~200 m wide between Djebel Chambi (west: Tunisia's highest, broad and massive) and Djebel Semmama
// (east: a narrower, lower ridge with the plain again behind it, reaching a little further south), steep rock 140+ m high
// that only men on foot climb (`steep`). Through it, side by side, the dry stony bed of the Hatab (a few
// pools), the road and the railway — they cross at the ford in the throat. At each end the pass opens onto the
// grey-brown highland plain. In the north (US): the Hatab crossroads where the Tebessa road forks off west, the
// Arab village on the Bou Chebka road, the US supply dump, a shelf on Chambi's flank over the throat. In the
// south (German): the Kasserine crossroads with the Sbeitla road running off east, Douar Kasserine out east,
// the Afrika Korps dump in the west, a shelf on Semmama's flank. Not a mirror but fair: each end has the same
// two mountains' flanks, a village, a dump, a crossroads and a shelf over the throat, all as
// far from its base as the other side's. The US come in from the north (+z, Thala), the Germans from the
// south (Kasserine, Sbeitla).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 560, z: 720 };
const BASE_Z = 660;
const noise = createNoise2D(1943_02);

// ---- the lines through the pass: x of the road, the wadi, the railway at z
const road = (z: number) => (Math.abs(z) < 380 ? (z > 0 ? 35 : 26) * Math.sin((Math.PI * z) / 380) + 6 * Math.sin(z * 0.02) : 0);
const wadi = (z: number) => -45 * Math.sin((Math.PI * z) / 560) + 10 * Math.cos(z * 0.012) - 10 - (z > 0 ? smoothstep(380, 700, z) * 200 : -smoothstep(-380, -700, z) * 150);
const rail = (z: number) => (Math.abs(z) < 400 ? -(z > 0 ? 80 : 64) * Math.sin((Math.PI * z) / 400) : (Math.abs(z) - 400) * (z > 0 ? 0.9 : 0.55));
const line = (f: (z: number) => number) => Array.from({ length: 121 }, (_, i) => [f(-720 + i * 12), -720 + i * 12]);
const XR = 380;   // the crossroads at each end
// the roads: the Thala–Kasserine road through the pass; in the north the Tebessa road forking off north-west at the
// crossroads and the track to the US dump; in the south the Sbeitla road running off east past Douar Kasserine and the
// track to the Afrika Korps dump
const ROADS = [line(road),
  [[0, XR], [-150, 420], [-300, 452], [-570, 505]], [[0, 470], [150, 452], [300, 432]],
  [[0, -XR + 20], [170, -392], [330, -410], [570, -440]], [[0, -480], [-140, -470], [-262, -470]]];
const RAIL = line(rail);

function segDist(poly: number[][], x: number, z: number) {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[i + 1];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
/** Distance to the nearest road. */
const roadDist = (x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z)));
const onRail = (x: number, z: number) => segDist(RAIL, x, z) < 2.4;
const wadiDist = (x: number, z: number) => Math.abs(x - wadi(z));

/**
 * A djebel on side w (-1 west, 1 east): `u` m in from its foot (x = w·foot(z)); it ends in a steep, broken face
 * over the plain at `endN` (north) / `endS` (south).
 */
function djebel(x: number, z: number, w: number, foot0: number, endN: number, endS: number, peak0: number, seed: number, width = 0) {
  const az = Math.abs(z), end = z > 0 ? endN : endS;
  const foot = foot0 + fbm(noise, z * 0.008 + seed, 5.5, 2) * 16 + 70 * smoothstep(140, 400, az);
  const u = w * x - foot;
  if (u < -12) return 0;
  const k0 = smoothstep(end, end - 170, az + fbm(noise, x * 0.008 + seed, 9.1, 3) * 70);
  const k = smoothstep(0, 220, u) * k0 * (width ? smoothstep(width + 160, width, u) : 1); // (a narrow ridge falls away again behind its crest)
  const peak = peak0 + fbm(noise, x * 0.004 + 3 + seed, z * 0.004, 4) * 110;
  return peak * k ** 1.3 + ridged(noise, x * 0.006 + 2 + seed, z * 0.006, 4) * 90 * k * k // the crests and gullies
    + ridged(noise, x * 0.025, z * 0.025, 3) * 12 * k + 2.5 * smoothstep(-12, 30, u) * k0; // rock, and a scree apron at the foot
}
/** Djebel Chambi: broad and high, Tunisia's highest; Djebel Semmama: a narrow, lower ridge nearer the road, the plain again behind it. */
const chambi = (x: number, z: number) => djebel(x, z, -1, 86, 440, 410, 210, 0);
const semmama = (x: number, z: number) => djebel(x, z, 1, 74, 400, 430, 140, 17, 90);

// levelled ground: the bases, the villages, the crossroads, the dumps, the hamlets in the pass
const FLAT = [[0, BASE_Z, 34], [0, -BASE_Z, 34], [-300, 452, 58], [330, -410, 58], [-10, 375, 56], [20, -355, 56], [300, 432, 48], [-262, -470, 48], [62, 142, 26], [-55, -195, 26]];
const SPURS = [{ x: -140, z: 60, h: 24 }, { x: 135, z: -100, h: 24 }]; // the shelves over the throat: on Chambi's flank (US), on Semmama's (German)

function height(x: number, z: number) {
  let h = fbm(noise, x * 0.004, z * 0.004, 4) * 2.6 + ridged(noise, x * 0.02 + 11, z * 0.02, 2) * 0.7;
  h += fbm(noise, x * 0.0035 + 40, z * 0.0035 - 20, 3) * 2.6;
  h += chambi(x, z) + semmama(x, z);
  h += smoothstep(500, 620, Math.abs(x)) * 10;                                        // the rising ground beyond the edges
  h -= 2.6 * smoothstep(14, 4, wadiDist(x, z));                                         // the Hatab's stony bed
  for (const [fx, fz, fr] of FLAT) h += (1.5 - h) * smoothstep(fr, fr - 20, Math.hypot(x - fx, z - fz));
  for (const s of SPURS) h += (s.h - h) * smoothstep(34, 14, Math.hypot(x - s.x, z - s.z));
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Thala road', x: -30, z: 625, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bou Chebka road', x: -300, z: 452, owner: null, sector: 'west' },
  { id: 'C', name: 'Hatab crossroads', x: 0, z: XR, owner: null, sector: 'centre' },
  { id: 'D', name: 'US supply dump', x: 300, z: 432, owner: null, sector: 'east' },
  { id: 'E', name: 'Djebel Chambi', x: SPURS[0].x, z: SPURS[0].z, owner: null, sector: 'west' },
  { id: 'F', name: 'The Throat', x: 10, z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Djebel Semmama', x: SPURS[1].x, z: SPURS[1].z, owner: null, sector: 'east' },
  { id: 'H', name: 'Afrika Korps dump', x: -262, z: -470, owner: null, sector: 'west' },
  { id: 'I', name: 'Kasserine crossroads', x: 20, z: -355, owner: null, sector: 'centre' },
  { id: 'J', name: 'Douar Kasserine', x: 330, z: -410, owner: null, sector: 'east' },
  { id: 'K', name: 'Sbeitla road', x: -30, z: -625, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'kasserine-pass',
  name: 'Kasserine Pass',
  description: 'Tunisia, February 1943: a narrow pass between two steep djebels, the dry Hatab, the road and the railway squeezed through its throat. Tanks fight for the pass, infantry for the heights over it.',
  epochs: ['1945'],
  region: 'africa', // (the menu's North Africa: maps/index.js REGIONS)
  climate: 'desert',  // sand paint and khaki drill (render/paint.js CLIMATE)
  sides: { nato: 'United States', pact: 'Germany' },
  armies: { nato: ['us'], pact: ['wh'] },
  size: 2000,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles: the djebels are for men only — the pass floor and the plains are the way)
  camera: { maxHeight: 520, far: 3000 },
  // each side's airstrip on its own plain, west of the road (east for the Germans): clear of the railway
  airfields: [
    { faction: 'nato', x: -320, z: 585, yaw: Math.PI / 2, name: 'Thala airstrip' },
    { faction: 'pact', x: 290, z: -600, yaw: -Math.PI / 2, name: 'Sbeitla airstrip' },
  ],
  seed: 1943,
  height,
  fields: createFields({ seed: 1943, cell: 80 }),

  theme: {
    // a clear, bright February day on the high plateau: cold blue sky, low sun, grey-brown ground
    fogColor: 0xc4cad0,
    fogDensity: 0.00045,
    skyTop: 0x5a8cc8,
    skyHorizon: 0xd4dce2,
    skyBottom: 0x9a9284,
    sunColor: 0xfff4e4,
    sunIntensity: 2.1,
    sunDisk: 0.8,
    clouds: 0.25,
    cloudLight: 0xf4f4f2,
    cloudDark: 0xb8bcc0,
    sunDir: [0.45, 0.55, 0.5],
    hemiSky: 0xd0d8e2,
    hemiGround: 0x7a6e5a,
    hemiIntensity: 1.2,
    rimColor: 0xe0e4e8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#9a8c6c',
      grassAlt: '#8a7e60',
      dryGrass: '#ac9e7a',
      dirt: '#7c6a52',
      rock: '#7e766a',
      pasture: '#948664',
      ploughed: '#8c7a5c',
      stubble: '#a49470',
      meadow: '#8e8462',
      farmX: [0, 1],     // no farmland
      farmZ: [0, 1],
      roads: [],
      roadZ: 0,
      surface(x: number, z: number) {
        if (onRail(x, z)) return [0x5e564c, 0.9];                                                    // ballast
        const rd = roadDist(x, z);
        if (rd < 4.5) return [0xa08c6c, smoothstep(4.5, 2.5, rd) * 0.95];                          // the dirt roads
        const wd = wadiDist(x, z);
        if (wd < 9) {
          const pool = fbm(noise, x * 0.02 + 40, z * 0.02, 2);
          if (wd < 4.5 && pool > 0.18) return [0x3e4a4e, 0.9];                                           // a pool left in the bed
          return [0xb4ac9c, smoothstep(9, 5, wd) * 0.85];                                            // pale stones
        }
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.2 ? [0x6c6a48, Math.min(0.45, (scrub - 0.2) * 2)] : null;                  // alfa grass and scrub
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 520 }, pact: { x: 0, z: -520 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0 })),
  },

  /** The positions dug before the battle: foxholes and MG nests across each mouth of the pass, each side's own line. */
  battlefield() {
    const works: any[] = [];
    const add = (f: 'nato' | 'pact', kind: string, x: number, z: number) => works.push({ kind, x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    for (const x of [-108, -98, -88, -78]) add('nato', 'trench', x, 300); // the north mouth, west of the road and the Hatab
    for (const x of [50, 60, 70]) add('nato', 'trench', x, 296);            // and east of it
    add('nato', 'mgNest', -40, 292);
    add('nato', 'mgNest', 86, 292);
    add('nato', 'mgNest', SPURS[0].x + 6, SPURS[0].z - 14);                 // on the shelf, over the throat
    for (const x of [-26, 22]) add('nato', 'sandbags', x, 360);             // the crossroads
    for (const x of [-60, -50, -40]) add('pact', 'trench', x, -318);        // the south mouth, west of the road
    for (const x of [60, 70, 80, 90]) add('pact', 'trench', x, -310);       // and east of it, beyond the railway
    add('pact', 'mgNest', -74, -310);
    add('pact', 'mgNest', 100, -302);
    add('pact', 'mgNest', SPURS[1].x - 8, SPURS[1].z + 14);
    for (const x of [-8, 44]) add('pact', 'sandbags', x, -334);
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1943);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const clear = (x: number, z: number, d = 10) => roadDist(x, z) > d && !onRail(x, z) && wadiDist(x, z) > d;
    const MUD = 0xb09c80;

    // ---- the villages: flat-roofed mud-brick houses round a mosque, garden walls (Bou Chebka road, round; Douar
    // Kasserine, strung out along the Sbeitla road)
    for (const [cx, cz, seed, sx, sz, myaw] of [[-300, 452, 31, 1, 1, 0], [330, -410, 35, 1.45, 0.7, Math.PI]] as number[][]) {
      props.rand = mulberry32(seed);
      const placed = [[cx + 4, cz + (myaw ? 24 : -26), 9]];
      props.flatHouse({ x: placed[0][0], z: placed[0][1], yaw: myaw, width: 11, depth: 9, name: 'mosque', dome: true });
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2 + props.rand() * 0.4;
        const d = 18 + props.rand() * 18;
        const x = cx + Math.cos(a) * d * sx, z = cz + Math.sin(a) * d * sz;
        if (roadDist(x, z) < 8 || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 7)) continue;
        placed.push([x, z, 6]);
        props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 6 + props.rand() * 4, depth: 5 + props.rand() * 3, storeys: props.rand() < 0.2 ? 2 : 1 });
        if (props.rand() < 0.6) props.lowWall({ x: x + 5, z: z + 4, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, length: 6 + props.rand() * 6, height: 1.6, color: MUD });
      }
      props.column({ x: cx - 6, z: cz + 2, radius: 1.4, height: 0.9 }); // the well
    }
    // ---- the crossroads at each mouth: a few houses, a café, the level crossing
    props.flatHouse({ x: 26, z: 400, yaw: 0, width: 9, depth: 7, name: 'café' });
    props.flatHouse({ x: 28, z: 360, yaw: Math.PI / 2, width: 8, depth: 6 });
    props.flatHouse({ x: -62, z: 362, yaw: 0, width: 7, depth: 6, name: 'gendarmerie', storeys: 2 });
    props.lowWall({ x: 38, z: 380, yaw: Math.PI / 2, length: 14, height: 1.5, color: MUD });
    props.wreckCar({ x: 12, z: 345, yaw: 0.6 });
    props.flatHouse({ x: -24, z: -372, yaw: Math.PI, width: 10, depth: 7, name: 'café' });
    props.flatHouse({ x: -30, z: -336, yaw: -Math.PI / 2, width: 7, depth: 6 });
    props.flatHouse({ x: 58, z: -378, yaw: Math.PI, width: 8, depth: 7, name: 'gendarmerie', storeys: 2 });
    props.flatHouse({ x: 62, z: -340, yaw: Math.PI, width: 6, depth: 5 });
    props.lowWall({ x: -40, z: -352, yaw: Math.PI / 2, length: 12, height: 1.5, color: MUD });
    props.wreckCar({ x: 4, z: -330, yaw: 2.3 });
    // ---- the hamlets in the pass, by the road: under Semmama in the north, under Chambi in the south
    props.flatHouse({ x: 58, z: 130, yaw: Math.PI / 2, width: 7, depth: 6 });
    props.flatHouse({ x: 70, z: 150, yaw: Math.PI / 2, width: 8, depth: 6 });
    props.flatHouse({ x: 56, z: 158, yaw: 0, width: 6, depth: 5 });
    props.lowWall({ x: 74, z: 132, yaw: 0, length: 9, height: 1.5, color: MUD });
    props.flatHouse({ x: -52, z: -182, yaw: -Math.PI / 2, width: 8, depth: 6 });
    props.flatHouse({ x: -66, z: -200, yaw: -Math.PI / 2, width: 7, depth: 6 });
    props.flatHouse({ x: -48, z: -210, yaw: Math.PI, width: 7, depth: 5 });
    props.lowWall({ x: -70, z: -186, yaw: Math.PI / 2, length: 10, height: 1.5, color: MUD });
    // ---- the supply dumps on the plain: crate stacks, fuel drums, tents, a store shed, trucks (the US one in rows,
    // the German one under the camouflage of a palm-thatch shed and a ring of sandbags)
    for (const [cx, cz, seed, flip] of [[300, 432, 34, 0], [-262, -470, 36, Math.PI]] as number[][]) {
      const m = flip ? -1 : 1;
      props.rand = mulberry32(seed);
      props.hall({ x: cx + (flip ? 18 : 22), z: cz + (flip ? 28 : 14) * m, yaw: flip + (flip ? 0.3 : 0), width: 20, depth: 10, height: 5, color: 0x9a8c70, roof: 0x6a665c, door: 6, name: 'store shed' });
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) props.crates({ x: cx + (flip ? -14 + k * 5 + row * 3 : -20 + k * 5), z: cz + (-6 - row * 5) * m, yaw: flip + (flip ? 0.3 : 0) });
      for (let k = 0; k < 3; k++) props.tanks({ x: cx + (flip ? -30 : -18 + k * 4), z: cz + (flip ? -10 + k * 5 : 14), yaw: flip, count: 4, radius: 0.35, height: 0.9, color: 0x4a5034 });
      props.tent({ x: cx - 30 * m, z: cz + 8 * m, yaw: 0.2 + flip, color: 0xa8a080 });
      props.tent({ x: cx + (flip ? 30 : -30), z: cz - 6 * m, yaw: -0.1 + flip, color: 0xa8a080 });
      props.sandbagRing({ x: cx + 4, z: cz - 30 * m, radius: 5, toward: -m });
      if (flip) props.sandbagRing({ x: cx - 34, z: cz - 26, radius: 5, toward: 1 });
      props.wreckCar({ x: cx + 8, z: cz + 2, yaw: 1.5 + flip });
      props.wreckCar({ x: cx - 40 * m, z: cz + 24 * m, yaw: 0.4 + flip });
    }
    // ---- the railway, a few wagons standing on it
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [x0, z0] = RAIL[i], [x1, z1] = RAIL[i + 1];
      props.rails({ x0, z0, x1, z1 });
    }
    for (const [z, kind, c] of [[520, 'box', 0x7a5a40], [532, 'tank', 0x3a3a34], [-470, 'open', 0x6a5440], [-482, 'box', 0x7a5a40], [-494, 'box', 0x5a4434]] as [number, string, number][]) {
      const x = rail(z), yaw = Math.atan2(rail(z + 6) - rail(z - 6), 12);
      props.wagon({ x, z, yaw, kind, color: c });
    }
    // ---- old sangars, boulders and wrecks in the pass and on the plains; scree and boulders up the djebels
    for (let i = 0; i < 280; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 20);
      const z = (r() * 2 - 1) * (BASE_Z - 60);
      if (near(x, z, 40) || !clear(x, z) || Math.abs(x) < 15) continue;
      const kind = r();
      const slope = steepAt(x, z);
      const R = (props.rand = mulberry32(Math.floor(r() * 1e9)));
      if (slope > 0.35 || kind > 0.75) { for (let k = 0; k < 3; k++) props.boulder({ x: x + (R() - 0.5) * 10, z: z + (R() - 0.5) * 10, radius: 1 + R() * 1.8 }); }
      else if (kind < 0.2) props.wreckCar({ x, z, yaw: R() * 6.28 });
      else if (kind < 0.5) props.lowWall({ x, z, yaw: R() * 3, length: 5 + R() * 6, height: 1.1, color: 0x8a8274 }); // a stone sangar
      else props.sandbagRing({ x, z, radius: 3.5 + R() * 1.5, toward: z > 0 ? 1 : -1 });
    }
    // boulders along the wadi bed
    for (let i = 0; i < 80; i++) {
      const z = (r() * 2 - 1) * 660;
      const x = wadi(z) + (r() - 0.5) * 10;
      if (roadDist(x, z) < 8 || onRail(x, z) || near(x, z, 25)) continue;
      props.boulder({ x, z, radius: 0.6 + r() * 1 });
    }
    const sites: any[] = [];
    for (let tries = 0; sites.length < 52 && tries < 8000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = (rand() * 2 - 1) * (bounds.z - 30);
      if (Math.abs(z) < 30 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 40 * 40) || near(x, z, 50) || !clear(x, z, 12) || steepAt(x, z) > 0.3 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45) continue;
      sites.push({ x, z, kind: r() < 0.6 ? 'rocks' : 'wrecks', yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    commandPost(props, this.bases.nato, -1, 0xa8a080);
    commandPost(props, this.bases.pact, 1, 0xa09878);
    props.finish();
    cover.finalize(bounds);
    // alfa grass and thorn scrub, thin; thinner still up the rock
    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })), { test: (x: number, z: number) => roadDist(x, z) < 4 || onRail(x, z) || wadiDist(x, z) < 5 }];
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.45, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); },
    };
  },
} satisfies MapDef;
