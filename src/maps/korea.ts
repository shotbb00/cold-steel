// The Korean DMZ at Chorwon, autumn 1985 (the big field, 1.0 × 1.12 km): the floor of the "Iron Triangle", the old
// invasion road to Seoul, where the second Korean War would have come through. Across the middle the Demilitarized
// Zone — the southern and northern limit-line fences, the minefields in front of each, guard posts, and in its
// overgrown no man's land the ruins of Old Chorwon (the Workers' Party building's shell). Behind the fences on each
// side a river in its basalt banks: the Hantan in the south (two bridges and a ford), the Yeokgok stream in the north.
// Beyond them steep wooded hills dug full of bunkers and trenches — White Horse Hill and Arrowhead for the ROK Army,
// the hills under Osong-san for the KPA — and between them the harvested rice paddies, flat, open and soft
// (vehicles wallow, map.soft). The KPA's infiltration tunnels (systems/Caves.js) run from its rear under the DMZ to a
// mouth out in the paddies south of the fence — Tunnel No. 2, found in 1975.
// South Korea holds the south (+z), North Korea comes from the north. Fairness: not a mirror — each side's hills,
// river bends, roads and villages are its own (the Yeokgok's ford is on the west, like the Hantan's) — but each side
// has two big dug-in hills on its flanks of about the same height, a river behind its fence with two bridges and a
// ford, the same roads up its sectors and its points at the same distances (measured: tools/map_fairness.py); the
// tunnels are the KPA's one extra, and their forward mouth lies in open paddies under the guns on White Horse Hill.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildVillage, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE = 330;
const FENCE_Z = 52;     // the limit-line fences at ±52 (the DMZ, scaled down)
const noise = createNoise2D(1985_10);

// ---- the rivers: the Hantan south of the DMZ, the Yeokgok stream north of it (each in its own bends)
const wob = (x: number) => 14 * Math.sin(x * 0.006 + 0.4) + 6 * Math.sin(x * 0.019);
const chanS = (x: number) => 195 + wob(x);
const chanN = (x: number) => -190 - 12 * Math.sin(x * 0.007 + 1.9) - 8 * Math.sin(x * 0.017 + 0.4);
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
    { name: 'Yeokgok bridge east', x: SIDE, kind: 'bridge', width: 8, channel: 1 },
    { name: 'Yeokgok ford', x: -SIDE, kind: 'ford', width: 14, channel: 1 },
  ],
});

const points: ControlPointDef[] = [
  { id: 'A', name: 'Dongsong', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'White Horse Hill', x: -SIDE, z: 330, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Daema-ri', x: 0, z: 285, owner: null, sector: 'centre' },
  { id: 'D', name: 'Arrowhead Hill', x: SIDE, z: 300, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Woljeong-ri station', x: -230, z: 100, owner: null, sector: 'west' },
  { id: 'F', name: 'Old Chorwon', x: 0, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Northern guard post', x: 255, z: -98, owner: null, sector: 'east' },
  { id: 'H', name: 'Osong-san spur', x: -360, z: -280, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Sangsa-ri', x: -40, z: -282, owner: null, sector: 'centre' },
  { id: 'J', name: 'Hill 391', x: 300, z: -345, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Pyonggang road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
// the hills, each side its own: [x, z, radius, height] — the two big dug-in ones on its flanks first
const HILLS = [[-SIDE, 330, 75, 34], [SIDE, 300, 65, 26], [-470, 140, 80, 30], [150, 410, 60, 18], [-200, 450, 55, 16], [450, 380, 70, 30], [-420, 420, 60, 22], [130, 250, 34, 9],
  [-360, -280, 72, 30], [300, -345, 68, 30], [480, -200, 80, 30], [-170, -425, 60, 18], [120, -470, 55, 16], [-470, -180, 75, 28], [420, -470, 60, 22], [-180, -330, 32, 9]];
const BIG_HILLS = { nato: [[-SIDE, 330], [SIDE, 300]], pact: [[-360, -280], [300, -345]] };

// ---- roads: up each sector over the crossings, the lateral by the DMZ and behind each river
const nsX = (rx: number, z: number) => rx + ((rx === 0 ? 8 : 16) * Math.sin(z * 0.011) + (rx === 0 ? 6 : 12) * Math.cos(z * 0.009 + rx * 0.01)) * smoothstep(25, 70, Math.abs(Math.abs(z) - 195)); // (straight over the crossings)
// the laterals, each side its own: behind the river, and by the DMZ
const SEGS: [number, number][][] = [[[-SIDE, 330], [0, 285]], [[0, 285], [SIDE, 300]], [[-SIDE, 100], [0, 70]], [[0, 70], [SIDE, 100]],
  [[-SIDE, -280], [0, -282]], [[0, -282], [SIDE, -335]], [[-SIDE, -85], [0, -70]], [[0, -70], [SIDE, -110]]];
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

/** Spurs and re-entrants: the hills' outlines broken up. */
const warp = (x: number, z: number) => 1 + 0.35 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
/** The hills (0..1 of each one's mass). */
function hillK(x: number, z: number) {
  let k = 0;
  for (const [cx, cz, r] of HILLS) k = Math.max(k, Math.exp(-(((Math.hypot(x - cx, z - cz) / r) * warp(x, z)) ** 2)));
  return k;
}
function hillH(x: number, z: number) {
  let h = 0;
  for (const [cx, cz, r, a] of HILLS) {
    const d = (Math.hypot(x - cx, z - cz) / r) * warp(x, z);
    h += a * Math.exp(-d * d) * (0.85 + 0.3 * ridged(noise, x * 0.02 + cx, z * 0.02, 2));
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
  const n = fbm(noise, x * 0.005, z * 0.005, 3) * 0.75;
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

/** Each side's lanes through its own minefield and fence (its guard posts' patrol lanes). */
const LANES = { nato: [0, -230, 230, -SIDE - 90, SIDE + 90], pact: [0, 255, -240, -SIDE - 60, SIDE + 110] };

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
      for (const [hx, hz] of BIG_HILLS[f]) {
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + (m > 0 ? 0.3 : 0.75), x = hx + Math.cos(ang) * 30, z = hz + Math.sin(ang) * 30;
          works.push({ kind: a % 2 ? 'mgNest' : 'trench', x, z, yaw: Math.atan2(Math.cos(ang), Math.sin(ang)), faction: f });
        }
      }
      for (let x = -470; x <= 470; x += 20) {
        if (LANES[f].some((g) => Math.abs(x - g) < 24)) continue;
        works.push({ kind: 'mines', x, z: (FENCE_Z - 12) * m, yaw: 0, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);

    // ---- the DMZ: both limit-line fences (gaps at each side's guard posts' lanes), the guard posts' towers
    props.rand = mulberry32(1985_30);
    for (const [f, z] of [['nato', FENCE_Z], ['pact', -FENCE_Z]] as const) props.fence({ x0: -bounds.x - 30, x1: bounds.x + 30, z, breaches: LANES[f].map((g) => [g - 14, g + 14]) });
    for (const [x, m] of [[-120, 1], [140, 1], [400, 1], [-380, -1], [-60, -1], [180, -1]]) {
      props.tower({ x, z: (FENCE_Z + 10) * m, concrete: m > 0 });
      props.sandbagRing({ x: x + 12 * m, z: (FENCE_Z + 14) * m, radius: 4.5, toward: -m });
    }
    // Old Chorwon: the shells of the town the war left, the Workers' Party building on the square
    props.ruinBlock({ x: -24, z: 14, yaw: 0, width: 22, depth: 12, storeys: 3, ruin: 0.55, name: "Workers' Party building" });
    for (const [x, z, yaw] of [[-60, -18, 0.1], [-72, 26, 0.1], [-40, 44, 0.1], [-95, 4, 0.1], [58, 24, -0.2], [80, -30, 0.3], [26, -46, -0.1], [104, 6, 1.5], [-8, -42, 0.2]]) props.ruinBlock({ x, z, yaw, width: 12, depth: 9, storeys: 2, ruin: 0.6, name: 'ruin' });
    for (let i = 0; i < 12; i++) props.rubble(-110 + props.rand() * 220, -40 + props.rand() * 80, 3 + props.rand() * 2);
    // Woljeong-ri station: the platform, the station house, the rusted locomotive the war stopped here
    props.townHouse({ x: -244, z: 82, yaw: 0, width: 16, depth: 8, storeys: 1, name: 'station house', damaged: 0.3 });
    props.rails({ x0: -480, z0: 70, x1: -160, z1: 70 });
    props.wagon({ x: -205, z: 70, yaw: Math.PI / 2, kind: 'tank', color: 0x5a3a2a });
    props.wagon({ x: -217, z: 70, yaw: Math.PI / 2, kind: 'open', color: 0x4a3426 });
    // the KPA's guard post north of the fence: its barracks, the tower, a wall of concrete and sandbags round it
    props.ruinBlock({ x: 272, z: -82, yaw: 0.2, width: 16, depth: 8, storeys: 1, ruin: 0, name: 'guard post barracks' });
    props.tower({ x: 236, z: -78, concrete: true });
    props.wall({ x: 255, z: -126, yaw: 0.1, length: 26, height: 1.8 });
    props.wall({ x: 226, z: -108, yaw: Math.PI / 2, length: 16, height: 1.8 });
    for (const [x, z] of [[282, -118], [238, -124]]) props.sandbagRing({ x, z, radius: 4.5, toward: 1 });

    // ---- the villages: tile-roofed farmhouses round the points behind the rivers, sheds, stacked rice straw
    for (const p of points) {
      if (!'ABCDHIJK'.includes(p.id)) continue;
      buildVillage(props, p, 9500 + Math.round(p.x * 3 + p.z), 1);
    }
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_32 + m);
      const r = props.rand, f = m > 0 ? 'nato' : 'pact';
      for (let i = 0; i < 70; i++) { // farmsteads out in the paddies on their mounds, straw stacks along the bunds
        const x = (r() * 2 - 1) * 470, z = (70 + r() * 440) * m;
        if (roadDist(x, z) < 10 || nearPoint(x, z, 40) || Math.abs(z - river.path(x, z)) < 30 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || hillK(x, z) > 0.3) continue;
        if (r() < 0.25) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 6, height: 2.8 });
        else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 3) });
      }
      for (const c of river.crossings) if (c.channel === (m > 0 ? 0 : 1)) props.sandbagRing({ x: c.x + (r() < 0.5 ? -14 : 14), z: c.z + m * (16 + r() * 14), radius: 4.5, toward: -m }); // the bridge and ford guards
      for (const [hx, hz] of BIG_HILLS[f]) props.mast({ x: hx + 8 * m, z: hz - 6 * m, height: 10 }); // the hilltop OPs' aerials
    }
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
