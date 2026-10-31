// Haune and Fulda, September 1985: two rivers run east–west across the map and split it in three —
// NATO's bank in the south (+z), the Pact's in the north, and between them the middle ground,
// a band of farmland and low wooded knolls that both sides must cross a river to reach. Each river
// has three bridges, one on each road, and nothing else: blow them and only a bridge layer
// gets you over again. Every way onto the middle ground is a choke point.
// Bridgehead villages on both outer banks, five villages on the middle ground; the centre village
// lies between the two centre bridges, not on either. Point-mirrored, like the other maps.
// One river object with two channels (world/River.js `paths`).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 280;
const ROAD_X = 170;
const noise = createNoise2D(1909);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// the Haune on NATO's side, the Fulda on the Pact's: each the other point-mirrored
const hauneZ = (x) => 95 + 10 * Math.sin(x * 0.009) + 5 * Math.sin(x * 0.023 + 1);
const fuldaZ = (x) => -hauneZ(-x);
const away = (x, z) => Math.min(Math.abs(z - hauneZ(x)), Math.abs(z - fuldaZ(x)));

const river = createRiver({
  paths: [hauneZ, fuldaZ],
  halfWidth: 10,
  level: 0,
  depth: 2.4,
  valley: 52,
  crossings: [
    { name: 'Burghaun bridge', x: -ROAD_X, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Kirchhasel bridge', x: 0, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Steinbach bridge', x: ROAD_X, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Neukirchen bridge', x: ROAD_X, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Wehrda bridge', x: 0, kind: 'bridge', width: 8, channel: 1 },
    { name: 'Schlitz bridge', x: -ROAD_X, kind: 'bridge', width: 7, channel: 1 },
  ],
});

// the low wooded knolls on the middle ground (and their mirrors)
const KNOLLS = [[-95, 30, 26, 6], [60, 40, 20, 4]];

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.006, z * 0.006, 5) * 5;                         // rolling ground
  h += fbm(noise, x * 0.05 + 50, z * 0.05, 3) * 0.5;
  h += smoothstep(55, 150, away(x, z)) * (7 + ridged(noise, x * 0.01 + 3, z * 0.01, 4) * 7); // the ground climbs away from the water
  for (const [cx, cz, r, a] of KNOLLS) h += hill(x, z, cx, cz, r, a) + hill(x, z, -cx, -cz, r, a);
  for (const [cx, cz, r, a] of [[-120, 205, 30, 10], [150, 230, 24, 7]]) h += hill(x, z, cx, cz, r, a) + hill(x, z, -cx, -cz, r, a); // heights over the outer banks
  h += smoothstep(300, 420, ax) * (14 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 22); // wooded edges
  h += smoothstep(320, 440, az) * 18;
  for (const bz of [BASE_Z, -BASE_Z]) {
    const k = smoothstep(28, 15, Math.hypot(x, z - bz));
    h += (h * 0.4 + 6 - h) * k; // a level base area
  }
  return river.carve(x, z, Math.max(1.4, h));
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Eiterfeld', x: 0, z: BASE_Z - 40, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Burghaun', x: -ROAD_X, z: hauneZ(-ROAD_X) + 55, owner: null, sector: 'west' },
  { id: 'C', name: 'Rothenkirchen', x: -150, z: 22, owner: null, sector: 'west' },
  { id: 'D', name: 'Steinbach', x: ROAD_X, z: hauneZ(ROAD_X) + 55, owner: null, sector: 'east' },
  { id: 'E', name: 'Hünhan', x: -55, z: 50, owner: null, sector: 'centre' },
  { id: 'F', name: 'Kirchhasel', x: 0, z: 0, owner: null, sector: 'centre' },
  { id: 'G', name: 'Großenmoor', x: 55, z: -50, owner: null, sector: 'centre' },
  { id: 'H', name: 'Neukirchen', x: ROAD_X, z: fuldaZ(ROAD_X) - 55, owner: null, sector: 'east' },
  { id: 'I', name: 'Wehrda', x: 150, z: -22, owner: null, sector: 'east' },
  { id: 'J', name: 'Schlitz', x: -ROAD_X, z: fuldaZ(-ROAD_X) - 55, owner: null, sector: 'west' },
  { id: 'K', name: 'Niederaula', x: 0, z: -(BASE_Z - 40), owner: 'pact', sector: 'centre' },
];

export default {
  id: 'haune-fulda',
  name: 'Haune and Fulda',
  description: 'Two rivers split the land in three. The middle ground between them is where the battle is won — and every way onto it is a bridge.',
  size: 1000,
  segments: 600,
  bounds: { x: 300, z: 310 },
  seed: 1909,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1909, cell: 60 }),

  theme: {
    // a hazy September afternoon: stubble fields, the trees still green
    fogColor: 0xb4b8ae,
    fogDensity: 0.0022,
    skyTop: 0x6f8296,
    skyHorizon: 0xc8ccc2,
    skyBottom: 0x7a7c72,
    sunColor: 0xf2e6cc,
    sunIntensity: 1.8,
    sunDisk: 0.5,
    clouds: 0.45,
    cloudLight: 0xdcdcd4,
    cloudDark: 0x8a8e90,
    sunDir: [-0.5, 0.6, -0.6],
    hemiSky: 0xc4ced6,
    hemiGround: 0x4c4a38,
    hemiIntensity: 1.25,
    rimColor: 0xc0c8d0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5b6a38',
      grassAlt: '#506034',
      dryGrass: '#8c7c50',
      dirt: '#5a4a3a',
      rock: '#6c6a62',
      strip: '#4d4032',
      pasture: '#5c6c3c',
      ploughed: '#4e3e2e',
      stubble: '#94825a',
      meadow: '#66753f',
      farmX: [310, 400],
      farmZ: [340, 430],
      roads: [-ROAD_X, 0, ROAD_X],  // every road meets a crossing on both rivers
      roadZ: 300,
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-ROAD_X, 0, ROAD_X] }, pact: { x: 0, z: -BASE_Z, entries: [-ROAD_X, 0, ROAD_X] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 190 }, pact: { x: 0, z: -190 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => away(x, z) < river.halfWidth + r;

    // villages: the mirrored pairs share a seed; the centre village stands alone
    for (const p of points) {
      if (p.z < 0) continue;
      const seed = 9300 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      if (p.z > 0) buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }
    // cover on our half (outer bank and our side of the middle ground), mirrored
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'wrecks', 'hay', 'fieldwall', 'roadblock'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 6 + rand() * (bounds.z - 26);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 22 * 22)) continue;
      if (Math.hypot(x, z - BASE_Z) < 34 || nearPoint(x, z, 28) || nearWater(x, z, 9)) continue;
      if (river.crossings.some((c) => Math.abs(x - c.x) < 16 && Math.abs(z - c.z) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 1.5) }];
    // alders along both rivers, woods on the knolls and the heights
    const forest = (x, z) => {
      const d = away(x, z);
      if (d < river.halfWidth + 1) return -1; // not in the water
      const bank = d < river.halfWidth + 12 ? 0.55 : 0;
      let woods = 0;
      for (const [cx, cz, r] of [...KNOLLS, [-120, 205, 30], [150, 230, 24]]) woods = Math.max(woods, hill(x, z, cx, cz, r, 1), hill(x, z, -cx, -cz, r, 1));
      return Math.max(bank, woods > 0.45 ? 0.8 : 0);
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1500, forest });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 6000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 4.2, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
