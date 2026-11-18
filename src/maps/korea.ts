// The Korean DMZ at Chorwon, autumn 1985 (the big field, 1.0 × 1.12 km): the floor of the "Iron Triangle", the old
// invasion road to Seoul, where the second Korean War would have come through. Across the middle the Demilitarized
// Zone — the southern and northern limit-line fences, the minefields in front of each, guard posts, and in its
// overgrown no man's land the ruins of Old Chorwon (the Workers' Party building's shell). Behind the fences on each
// side a river in its basalt banks: the Hantan in the south (two bridges and a ford), the Yeokgok stream in the north.
// Beyond them steep wooded hills dug full of bunkers and trenches — White Horse Hill and Arrowhead for the ROK Army,
// the hills under Osong-san for the KPA — and between them the harvested rice paddies, flat, open and soft
// (vehicles wallow, map.soft). The KPA's infiltration tunnels (systems/Caves.js) run from its rear under the DMZ to a
// mouth out in the paddies south of the fence — Tunnel No. 2, found in 1975.
// South Korea holds the south (+z), North Korea comes from the north. Fairness: the ground — hills, rivers, crossings,
// paddies, roads, bunkers — is point-symmetric, so each side has the same distances, high ground and ways across;
// the tunnels are the KPA's one extra, and their forward mouth lies in open paddies under the guns on White Horse Hill.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildVillage, commandPost, mirrored } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE = 330;
const FENCE_Z = 52;     // the limit-line fences at ±52 (the DMZ, scaled down)
const noise = createNoise2D(1985_10);

// ---- the rivers: the Hantan south of the DMZ, the Yeokgok stream north of it (a point-mirrored pair)
const wob = (x: number) => 14 * Math.sin(x * 0.006 + 0.4) + 6 * Math.sin(x * 0.019);
const chanS = (x: number) => 195 + wob(x);
const chanN = (x: number) => -chanS(-x);
const river = createRiver({
  paths: [chanS, chanN],
  halfWidth: 12,
  level: 0,
  depth: 2.6,
  valley: 34,
  crossings: [
    { name: 'Hantan bridge', x: 0, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Seungil bridge', x: SIDE, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Hantan ford', x: -SIDE, kind: 'ford', width: 14, channel: 0 },
    { name: 'Yeokgok bridge', x: 0, kind: 'bridge', width: 9, channel: 1 },
    { name: 'Yeokgok bridge west', x: -SIDE, kind: 'bridge', width: 8, channel: 1 },
    { name: 'Yeokgok ford', x: SIDE, kind: 'ford', width: 14, channel: 1 },
  ],
});

const points: ControlPointDef[] = [
  { id: 'A', name: 'Dongsong', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'White Horse Hill', x: -SIDE, z: 330, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Daema-ri', x: 0, z: 285, owner: null, sector: 'centre' },
  { id: 'D', name: 'Arrowhead Hill', x: SIDE, z: 300, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Woljeong-ri station', x: -230, z: 100, owner: null, sector: 'west' },
  { id: 'F', name: 'Old Chorwon', x: 0, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Northern guard post', x: 230, z: -100, owner: null, sector: 'east' },
  { id: 'H', name: 'Osong-san spur', x: -SIDE, z: -300, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Sangsa-ri', x: 0, z: -285, owner: null, sector: 'centre' },
  { id: 'J', name: 'Hill 391', x: SIDE, z: -330, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Pyonggang road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const HILLS = [[-SIDE, 330, 75, 34], [SIDE, 300, 65, 26], [-470, 140, 80, 30], [150, 410, 60, 18], [-200, 450, 55, 16], [450, 380, 70, 30], [-420, 420, 60, 22], [130, 250, 34, 9]]; // (and their mirrors)

// ---- roads: up each sector over the crossings, the lateral by the DMZ and behind each river
const nsX = (rx: number, z: number) => rx + (rx === 0 ? 8 : 16) * Math.sin(z * 0.011) * smoothstep(25, 70, Math.abs(Math.abs(z) - 195)); // (straight over the crossings)
const LAT: [number, number][][] = [[[-SIDE, 330], [0, 285]], [[0, 285], [SIDE, 300]], [[-SIDE, 100], [0, 70]], [[0, 70], [SIDE, 100]]];
const SEGS = LAT.flatMap(([a, b]) => [[a, b], [[-a[0], -a[1]], [-b[0], -b[1]]]] as [number, number][][]);
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const rx of [-SIDE, 0, SIDE]) d = Math.min(d, Math.abs(x - nsX(rx, z)));
  for (const [a, b] of SEGS) d = Math.min(d, segDist(x, z, a, b));
  return d;
}

/** Spurs and re-entrants: the hills' outlines broken up (read in each half's own frame, so the mirror matches). */
const warp = (x: number, z: number) => 1 + 0.35 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
/** The hills (0..1 of each one's mass), point-mirrored. */
function hillK(x: number, z: number) {
  let k = 0;
  for (const [cx, cz, r] of HILLS) for (const m of [1, -1]) k = Math.max(k, Math.exp(-(((Math.hypot(x - cx * m, z - cz * m) / r) * warp(x * m, z * m)) ** 2)));
  return k;
}
function hillH(x: number, z: number) {
  let h = 0;
  for (const [cx, cz, r, a] of HILLS) for (const m of [1, -1]) {
    const d = (Math.hypot(x - cx * m, z - cz * m) / r) * warp(x * m, z * m);
    h += a * Math.exp(-d * d) * (0.85 + 0.3 * ridged(noise, x * m * 0.02 + cx, z * m * 0.02, 2)); // (the same rock each side of the middle)
  }
  return h;
}
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
/** The rice paddies: the flat valley floor away from hills, roads, villages and the DMZ's no man's land. */
const paddyK = (x: number, z: number) => {
  if (Math.abs(z) < FENCE_Z + 8 || nearPoint(x, z, 45) || roadDist(x, z) < 8 || Math.abs(z - river.path(x, z)) < 22) return 0;
  return smoothstep(0.12, 0.04, hillK(x, z)) * smoothstep(BOUNDS.x + 10, BOUNDS.x - 30, Math.abs(x));
};

function height(x: number, z: number) {
  const n = (fbm(noise, x * 0.005, z * 0.005, 3) + fbm(noise, -x * 0.005, -z * 0.005, 3)) / 2;
  let h = 4 + n * 3 + hillH(x, z);
  const pk = paddyK(x, z);
  if (pk > 0) h += (4 + Math.round(n * 6) * 0.35 - h) * pk;                     // the paddies: terraced flats, a step every few fields
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * (20 + ridged(noise, x * 0.01, z * 0.01, 3) * 30);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 18;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(32, 16, Math.hypot(x, z - bz));
  h = river.carve(x, z, h);
  return h;
}

/** The paddies: vehicles wallow in the mud, men slog through it. */
const paddyC = gridCache((x: number, z: number) => paddyK(x, z), BOUNDS);
function soft(x: number, z: number, foot: boolean) {
  const pk = paddyC(x, z);
  return pk <= 0.05 ? 1 : 1 - pk * (foot ? 0.3 : 0.6);
}
/** Forest on the hills, scrub in the DMZ (no one has farmed it since 1953). */
const woodsK = (x: number, z: number) => Math.min(smoothstep(0.1, 0.3, hillK(x, z)), smoothstep(4, 10, roadDist(x, z)))
  * (nearPoint(x, z, 26) ? 0 : 1);

/** Paddy bunds: the low dikes between fields (a 34 × 24 m grid, a little skewed). */
const bund = (x: number, z: number) => {
  const u = x + z * 0.12, v = z - x * 0.08;
  return Math.min(Math.abs(((u % 34) + 34) % 34 - 17), Math.abs(((v % 24) + 24) % 24 - 12)) > 15.6;
};

const CAVES = [
  { x: -120, z: 128, name: 'Tunnel No. 2' },          // (the forward mouth, south of the fence: open paddies)
  { x: -150, z: -150, name: 'Tunnel No. 2, north adit' },
  { x: 40, z: -420, name: 'Pyonggang road adit' },
  { x: -300, z: -255, name: 'Osong-san galleries' },
  { x: 350, z: -285, name: 'Hill 391 galleries' },
];

export default {
  id: 'korea',
  name: 'Korean DMZ',
  description: 'The Chorwon valley, autumn: the DMZ fences and minefields, Old Chorwon\'s ruins, harvested paddies, the Hantan, and steep wooded hills full of bunkers. The KPA comes south through its tunnels.',
  epochs: ['1985'],
  region: 'korea',
  armies: { nato: ['rok', 'us'], pact: ['kpa'] }, // (the ROK Army and the US 2nd Infantry Division against the Korean People's Army)
  sides: { nato: 'South Korea', pact: 'North Korea' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  soft,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: gridCache((x: number, z: number) => woodsK(x, z) * 0.85, BOUNDS),
  caves: { owner: 'pact', list: CAVES },

  theme: {
    // a clear autumn day, the hills turning
    fogColor: 0xb4bcc0, fogDensity: 0.001,
    skyTop: 0x4e78a8, skyHorizon: 0xc8d0d4, skyBottom: 0x7a7e74,
    sunColor: 0xfff0d8, sunIntensity: 2.0, sunDisk: 0.4,
    clouds: 0.35, cloudLight: 0xf0f0ec, cloudDark: 0x9aa0a8,
    sunDir: [-0.4, 0.55, 0.7],
    hemiSky: 0xc4d0de, hemiGround: 0x5a4e36, hemiIntensity: 1.25,
    rimColor: 0xd0d6dc, rimIntensity: 0.22,
    terrain: {
      grass: '#6a6a3a', grassAlt: '#5e6236', dryGrass: '#a08e58', dirt: '#6a5038', rock: '#5c5a56',
      pasture: '#6a6a3a', ploughed: '#5a4632', stubble: '#b09a5e', meadow: '#7a7444',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        if (roadDist(x, z) < 4) return [0x8a7a62, 0.85];                                    // gravel road
        if (Math.abs(Math.abs(z) - FENCE_Z) < 3) return [0x7a6a52, 0.7];                     // the patrol track along each fence
        const pk = paddyK(x, z);
        if (pk > 0.3) {
          if (bund(x, z)) return [0x5e5a36, 0.8];                                            // the bunds, grassed
          const wet = noise(x * 0.05, z * 0.05) > 0.45;
          return [wet ? 0x5a5a48 : 0xb8a066, pk * 0.85];                                     // rice stubble, a few fields still wet
        }
        if (Math.abs(z) < FENCE_Z) return [0x8c8048, 0.5];                                   // the DMZ: tall grass gone to seed
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE, 0, SIDE] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE, 0, SIDE] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1st Platoon', facing: 0 }],
  },

  // dug in for thirty years: trenches and MG bunkers round every hilltop (each side its own), and the minefields in
  // front of each limit-line fence (the gaps at the crossings are the guard posts' patrol lanes)
  battlefield() {
    const works: any[] = [];
    for (const [f, m] of [['nato', 1], ['pact', -1]] as const) {
      for (const [hx, hz] of [[-SIDE, 330], [SIDE, 300]]) {
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + 0.3, x = hx + Math.cos(ang) * 30, z = hz + Math.sin(ang) * 30;
          works.push({ kind: a % 2 ? 'mgNest' : 'trench', x: x * m, z: z * m, yaw: Math.atan2(Math.cos(ang), Math.sin(ang)) + (m > 0 ? 0 : Math.PI), faction: f });
        }
      }
      for (let x = -470; x <= 470; x += 20) {
        if ([0, -230, 230, -SIDE - 90, SIDE + 90].some((g) => Math.abs(x - g) < 24)) continue;
        works.push({ kind: 'mines', x: x * m, z: (FENCE_Z - 12) * m, yaw: 0, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);

    // ---- the DMZ: both limit-line fences (gaps at the guard posts' lanes), the guard posts' towers
    const gaps = [[-14, 14], [-244, -216], [216, 244], [-SIDE - 104, -SIDE - 76], [SIDE + 76, SIDE + 104]];
    props.rand = mulberry32(1985_30);
    props.fence({ x0: -bounds.x - 30, x1: bounds.x + 30, z: FENCE_Z, breaches: gaps });
    props.fence({ x0: -bounds.x - 30, x1: bounds.x + 30, z: -FENCE_Z, breaches: gaps.map(([a, b]) => [-b, -a]) });
    mirrored(props, 1985_31, (m, flip) => {
      for (const x of [-120, 140, 400]) {
        props.tower({ x: x * m, z: (FENCE_Z + 10) * m, concrete: true });
        props.sandbagRing({ x: (x + 12) * m, z: (FENCE_Z + 14) * m, radius: 4.5, toward: -m });
      }
      // Old Chorwon: the shells of the town the war left, the Workers' Party building on the square
      props.ruinBlock({ x: -24 * m, z: 14 * m, yaw: flip, width: 22, depth: 12, storeys: 3, ruin: 0.55, name: "Workers' Party building" });
      for (const [x, z] of [[-60, -18], [-72, 26], [-40, 44], [-95, 4]]) props.ruinBlock({ x: x * m, z: z * m, yaw: flip + 0.1, width: 12, depth: 9, storeys: 2, ruin: 0.6, name: 'ruin' });
      for (let i = 0; i < 6; i++) props.rubble((-30 - props.rand() * 80) * m, (-40 + props.rand() * 80) * m, 3 + props.rand() * 2);
      // Woljeong-ri station: the platform, the station house, the rusted locomotive the war stopped here
      props.townHouse({ x: -244 * m, z: 82 * m, yaw: flip, width: 16, depth: 8, storeys: 1, name: 'station house', damaged: 0.3 });
      props.rails({ x0: -480 * m, z0: 70 * m, x1: -160 * m, z1: 70 * m });
      props.wagon({ x: -205 * m, z: 70 * m, yaw: Math.PI / 2, kind: 'tank', color: 0x5a3a2a });
      props.wagon({ x: -217 * m, z: 70 * m, yaw: Math.PI / 2, kind: 'open', color: 0x4a3426 });
    });

    // ---- the villages: tile-roofed farmhouses round the points behind the rivers, sheds, stacked rice straw
    for (const p of points) {
      if (!'ACBD'.includes(p.id)) continue;
      const seed = 9500 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }
    mirrored(props, 1985_32, (m, flip) => {
      const r = props.rand;
      for (let i = 0; i < 70; i++) { // farmsteads out in the paddies on their mounds, straw stacks along the bunds
        const x = (r() * 2 - 1) * 470, z = 70 + r() * 440;
        if (roadDist(x, z) < 10 || nearPoint(x, z, 40) || Math.abs(z - chanS(x)) < 30 || Math.hypot(x, z - BASE_Z) < 50 || hillK(x, z) > 0.3) continue;
        if (r() < 0.25) props.house({ x: x * m, z: z * m, yaw: flip + (r() < 0.5 ? 0 : Math.PI / 2), width: 9, depth: 6, height: 2.8 });
        else props.hayBales({ x: x * m, z: z * m, yaw: flip + r(), count: 2 + Math.floor(r() * 3) });
      }
      for (const [x, z] of [[-14, 210], [14, 180], [SIDE + 12, 222], [-SIDE - 12, 225]]) props.sandbagRing({ x: x * m, z: z * m, radius: 4.5, toward: -m }); // the bridge and ford guards
      for (const [hx, hz] of [[-SIDE, 330], [SIDE, 300]]) props.mast({ x: (hx + 8) * m, z: (hz - 6) * m, height: 10 }); // the hilltop OPs' aerials
    });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...CAVES.map((c) => ({ x: c.x, z: c.z, r: 8 })), { test: (x: number, z: number) => roadDist(x, z) < 5 || paddyK(x, z) > 0.2 }];
    // oak, pine and chestnut on the hills, turning; scattered scrub in the DMZ
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 6000, broadleaf: 0.65, autumn: 0.85, maxY: 70,
      forest: (x: number, z: number) => Math.max(woodsK(x, z) * 0.95, Math.abs(z) < FENCE_Z - 6 ? 0.08 : 0) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2.2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
