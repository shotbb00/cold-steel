// Kasserine Pass, February 1943 (1945 only; North Africa): Rommel's panzers through the Western Dorsal of
// Tunisia against the green troops of US II Corps. The pass runs along z through the middle of the map: a
// throat ~200 m wide between Djebel Chambi (west) and Djebel Semmama (east), steep rock 200+ m high that only
// men on foot climb (`steep`). Through it, side by side, the dry stony bed of the Hatab (a few pools), the road
// and the railway — they cross at the ford in the throat. At each end the pass opens onto the grey-brown
// highland plain: a crossroads where the Tebessa road forks off, an Arab village of flat-roofed mud-brick
// houses, a supply dump, foxholes and sandbagged positions. Point-mirrored like the other maps: each side holds
// one end and the plain beyond it, both fight for the throat. The US comes in from the north (+z, Thala),
// the Germans from the south (Kasserine, Sbeitla).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 560, z: 720 };
const BASE_Z = 660;
const noise = createNoise2D(1943_02);

// ---- the lines through the pass, all odd in z (point-mirrored): x of the road, the wadi, the railway at z
const road = (z: number) => (Math.abs(z) < 380 ? 35 * Math.sin((Math.PI * z) / 380) : 0);
const wadi = (z: number) => -45 * Math.sin((Math.PI * z) / 560) - Math.sign(z) * smoothstep(380, 700, Math.abs(z)) * 200;
const rail = (z: number) => (Math.abs(z) < 400 ? -80 * Math.sin((Math.PI * z) / 400) : Math.sign(z) * (Math.abs(z) - 400) * 0.9);
const line = (f: (z: number) => number) => Array.from({ length: 61 }, (_, i) => [f(i * 12), i * 12]);
// the roads in the north half (the south half is their point-mirror): the Thala road through the pass, the
// Tebessa road forking off north-west at the crossroads, the track to the supply dump
const ROADS = [line(road), [[0, 380], [-150, 420], [-300, 452], [-570, 505]], [[0, 470], [150, 452], [300, 432]]];
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
/** Distance to the nearest road (both halves). */
const roadDist = (x: number, z: number) => Math.min(...ROADS.map((p) => Math.min(segDist(p, x, z), segDist(p, -x, -z))));
const onRail = (x: number, z: number) => Math.min(segDist(RAIL, x, z), segDist(RAIL, -x, -z)) < 2.4;
const wadiDist = (x: number, z: number) => Math.abs(x - wadi(z));

/** The west mountain, Djebel Chambi; Djebel Semmama is its point-mirror. */
function djebel(x: number, z: number) {
  const az = Math.abs(z);
  const foot = 82 + fbm(noise, z * 0.008, 5.5, 2) * 16 + 70 * smoothstep(140, 400, az);
  const u = -x - foot;                                                    // m in from its foot
  if (u < -12) return 0;
  const end = smoothstep(440, 270, az + fbm(noise, x * 0.008, 9.1, 3) * 70); // it ends in a steep, broken face over the plain
  const k = smoothstep(0, 220, u) * end;
  const peak = 170 + fbm(noise, x * 0.004 + 3, z * 0.004, 4) * 110;
  return peak * k ** 1.3 + ridged(noise, x * 0.006 + 2, z * 0.006, 4) * 90 * k * k // the crests and gullies
    + ridged(noise, x * 0.025, z * 0.025, 3) * 12 * k + 2.5 * smoothstep(-12, 30, u) * end; // rock, and a scree apron at the foot
}

// levelled ground (and its point-mirror): the bases, the village, the crossroads, the dump, the hamlet in the pass
const FLAT = [[0, BASE_Z, 34], [-300, 452, 58], [-10, 375, 56], [300, 432, 48], [62, 142, 26]];
const SPUR = { x: -140, z: 60, h: 24 }; // the shelf on Chambi's flank over the throat (and its mirror on Semmama)

function height(x: number, z: number) {
  const plain = (a: number, b: number) => fbm(noise, a * 0.004, b * 0.004, 4) * 2.6 + ridged(noise, a * 0.02 + 11, b * 0.02, 2) * 0.7;
  let h = plain(x, z) + plain(-x, -z) + djebel(x, z) + djebel(-x, -z);
  h += smoothstep(500, 620, Math.abs(x)) * 10;                                        // the rising ground beyond the edges
  h -= 2.6 * smoothstep(14, 4, wadiDist(x, z));                                         // the Hatab's stony bed
  for (const [fx, fz, fr] of FLAT) for (const m of [1, -1]) h += (1.5 - h) * smoothstep(fr, fr - 20, Math.hypot(x - fx * m, z - fz * m));
  for (const m of [1, -1]) h += (SPUR.h - h) * smoothstep(34, 14, Math.hypot(x - SPUR.x * m, z - SPUR.z * m));
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Thala road', x: 0, z: 625, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bou Chebka road', x: -300, z: 452, owner: null, sector: 'west' },
  { id: 'C', name: 'Hatab crossroads', x: 0, z: 380, owner: null, sector: 'centre' },
  { id: 'D', name: 'US supply dump', x: 300, z: 432, owner: null, sector: 'east' },
  { id: 'E', name: 'Djebel Chambi', x: SPUR.x, z: SPUR.z, owner: null, sector: 'west' },
  { id: 'F', name: 'The Throat', x: 0, z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Djebel Semmama', x: -SPUR.x, z: -SPUR.z, owner: null, sector: 'east' },
  { id: 'H', name: 'Afrika Korps dump', x: -300, z: -432, owner: null, sector: 'west' },
  { id: 'I', name: 'Kasserine crossroads', x: 0, z: -380, owner: null, sector: 'centre' },
  { id: 'J', name: 'Douar Kasserine', x: 300, z: -452, owner: null, sector: 'east' },
  { id: 'K', name: 'Sbeitla road', x: 0, z: -625, owner: 'pact', sector: 'centre' },
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
    { faction: 'pact', x: 320, z: -585, yaw: -Math.PI / 2, name: 'Sbeitla airstrip' },
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

  /** The positions dug before the battle: foxholes and MG nests across each mouth of the pass, mirrored. */
  battlefield() {
    const works: any[] = [];
    const add = (kind: string, x: number, z: number) => {
      works.push({ kind, x, z, yaw: Math.PI, faction: 'nato' });
      works.push({ kind, x: -x, z: -z, yaw: 0, faction: 'pact' });
    };
    for (const x of [-82, -72, -62, -52]) add('trench', x, 300);  // the north mouth, west of the road
    for (const x of [50, 60, 70]) add('trench', x, 296);           // and east of it
    add('mgNest', -40, 292);
    add('mgNest', 86, 292);
    add('mgNest', SPUR.x + 6, SPUR.z - 14);                        // on the spur, over the throat
    for (const x of [-26, 22]) add('sandbags', x, 360);            // the crossroads
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1943);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const clear = (x: number, z: number, d = 10) => roadDist(x, z) > d && !onRail(x, z) && wadiDist(x, z) > d;
    const MUD = 0xb09c80;

    // ---- the villages: flat-roofed mud-brick houses round a mosque, garden walls (Bou Chebka road / Douar Kasserine)
    mirrored(props, 31, (m, flip) => {
      const cx = -300 * m, cz = 452 * m;
      const placed = [[cx + 4 * m, cz - 26 * m, 9]];
      props.flatHouse({ x: placed[0][0], z: placed[0][1], yaw: flip, width: 11, depth: 9, name: 'mosque', dome: true });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + props.rand() * 0.4;
        const d = 18 + props.rand() * 18;
        const x = cx + Math.cos(a) * d * m, z = cz + Math.sin(a) * d * m;
        if (roadDist(x, z) < 8 || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 7)) continue;
        placed.push([x, z, 6]);
        props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 6 + props.rand() * 4, depth: 5 + props.rand() * 3, storeys: props.rand() < 0.2 ? 2 : 1 });
        if (props.rand() < 0.6) props.lowWall({ x: x + 5 * m, z: z + 4 * m, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, length: 6 + props.rand() * 6, height: 1.6, color: MUD });
      }
      props.column({ x: cx - 6 * m, z: cz + 2 * m, radius: 1.4, height: 0.9 }); // the well
    });
    // ---- the crossroads at each mouth: a few houses, a café, the level crossing
    mirrored(props, 32, (m, flip) => {
      props.flatHouse({ x: 26 * m, z: 400 * m, yaw: flip, width: 9, depth: 7, name: 'café' });
      props.flatHouse({ x: 28 * m, z: 360 * m, yaw: flip + Math.PI / 2, width: 8, depth: 6 });
      props.flatHouse({ x: -62 * m, z: 362 * m, yaw: flip, width: 7, depth: 6, name: 'gendarmerie', storeys: 2 });
      props.lowWall({ x: 38 * m, z: 380 * m, yaw: Math.PI / 2, length: 14, height: 1.5, color: MUD });
      props.wreckCar({ x: 12 * m, z: 345 * m, yaw: 0.6 + flip });
    });
    // ---- the hamlet in the pass, by the road, under the east (west) mountain
    mirrored(props, 33, (m, flip) => {
      props.flatHouse({ x: 58 * m, z: 130 * m, yaw: flip + Math.PI / 2, width: 7, depth: 6 });
      props.flatHouse({ x: 70 * m, z: 150 * m, yaw: flip + Math.PI / 2, width: 8, depth: 6 });
      props.flatHouse({ x: 56 * m, z: 158 * m, yaw: flip, width: 6, depth: 5 });
      props.lowWall({ x: 74 * m, z: 132 * m, yaw: 0, length: 9, height: 1.5, color: MUD });
    });
    // ---- the supply dumps on the plain: crate stacks, fuel drums, tents, a store shed, trucks
    mirrored(props, 34, (m, flip) => {
      const cx = 300 * m, cz = 432 * m;
      props.hall({ x: cx + 22 * m, z: cz + 14 * m, yaw: flip, width: 20, depth: 10, height: 5, color: 0x9a8c70, roof: 0x6a665c, door: 6, name: 'store shed' });
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) props.crates({ x: cx + (-20 + k * 5) * m, z: cz + (-6 - row * 5) * m, yaw: flip });
      for (let k = 0; k < 3; k++) props.tanks({ x: cx + (-18 + k * 4) * m, z: cz + 14 * m, yaw: flip, count: 4, radius: 0.35, height: 0.9, color: 0x4a5034 });
      props.tent({ x: cx - 30 * m, z: cz + 8 * m, yaw: 0.2 + flip, color: 0xa8a080 });
      props.tent({ x: cx - 30 * m, z: cz - 6 * m, yaw: -0.1 + flip, color: 0xa8a080 });
      props.sandbagRing({ x: cx + 4 * m, z: cz - 30 * m, radius: 5, toward: -m });
      props.wreckCar({ x: cx + 8 * m, z: cz + 2 * m, yaw: 1.5 + flip });
      props.wreckCar({ x: cx - 40 * m, z: cz + 24 * m, yaw: 0.4 + flip });
    });
    // ---- the railway, a few wagons standing on it
    const railTrack = (sign: number) => {
      for (let i = 0; i < RAIL.length - 1; i++) {
        const [x0, z0] = RAIL[i], [x1, z1] = RAIL[i + 1];
        props.rails({ x0: x0 * sign, z0: z0 * sign, x1: x1 * sign, z1: z1 * sign });
      }
    };
    railTrack(1);
    railTrack(-1);
    for (const [z, kind, c] of [[520, 'box', 0x7a5a40], [532, 'tank', 0x3a3a34]] as [number, string, number][]) {
      const x = rail(z), yaw = Math.atan2(rail(z + 6) - rail(z - 6), 12);
      props.wagon({ x, z, yaw, kind, color: c });
      props.wagon({ x: -x, z: -z, yaw: yaw + Math.PI, kind, color: c });
    }
    // ---- old sangars, boulders and wrecks in the pass and on the plains; scree and boulders up the djebels
    for (let i = 0; i < 140; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 20);
      const z = 10 + r() * (BASE_Z - 60);
      if (near(x, z, 40) || !clear(x, z) || Math.abs(x) < 15) continue;
      const seed = Math.floor(r() * 1e9);
      const kind = r();
      const slope = steepAt(x, z);
      mirrored(props, seed, (m, flip) => {
        if (slope > 0.35 || kind > 0.75) { for (let k = 0; k < 3; k++) props.boulder({ x: x * m + (props.rand() - 0.5) * 10, z: z * m + (props.rand() - 0.5) * 10, radius: 1 + props.rand() * 1.8 }); }
        else if (kind < 0.2) props.wreckCar({ x: x * m, z: z * m, yaw: props.rand() * 3 + flip });
        else if (kind < 0.5) props.lowWall({ x: x * m, z: z * m, yaw: props.rand() * 3, length: 5 + props.rand() * 6, height: 1.1, color: 0x8a8274 }); // a stone sangar
        else props.sandbagRing({ x: x * m, z: z * m, radius: 3.5 + props.rand() * 1.5, toward: m });
      });
    }
    // boulders along the wadi bed
    for (let i = 0; i < 40; i++) {
      const z = 20 + r() * 640;
      const x = wadi(z) + (r() - 0.5) * 10;
      if (roadDist(x, z) < 8 || onRail(x, z) || near(x, z, 25)) continue;
      const rad = 0.6 + r() * 1;
      props.boulder({ x, z, radius: rad });
      props.boulder({ x: -x, z: -z, radius: rad });
    }
    const sites: any[] = [];
    for (let tries = 0; sites.length < 26 && tries < 4000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 30 + rand() * (bounds.z - 40);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 40 * 40) || near(x, z, 50) || !clear(x, z, 12) || steepAt(x, z) > 0.3 || Math.hypot(x, z - BASE_Z) < 45) continue;
      sites.push({ x, z, kind: r() < 0.6 ? 'rocks' : 'wrecks', yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
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
