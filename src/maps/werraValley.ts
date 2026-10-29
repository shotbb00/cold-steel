// Werra Valley, November 1985: the river Werra winds east–west through the middle of the map
// along the inner-German border, between wooded bluffs. Three ways across, and nothing else —
// the battle is about the bridges: west and east road bridges (Philippsthal, Heringen) and the
// big centre bridge at Vacha. Engineers can blow them; bridge layers can add a crossing.
// Villages sit at each bridgehead on both banks; Vacha bridge itself is the centre point; a
// wooded hill on each side overlooks the valley. NATO holds the south bank (+z), the Pact the
// north. Point-mirrored, so neither side gets the better ground.
// Same shape as fuldaGap.js, plus `river` (world/River.js: routing, water, bridges).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 280;
const SIDE_X = 190;
const noise = createNoise2D(1986);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// an odd function: the river is point-mirrored too
const riverZ = (x) => 13 * Math.sin(x * 0.0085) + 6 * Math.sin(x * 0.021);

const river = createRiver({
  path: riverZ,
  halfWidth: 12,
  level: 0,
  depth: 2.4,
  valley: 80,
  crossings: [
    { name: 'Philippsthal bridge', x: -SIDE_X, kind: 'bridge', width: 7 },
    { name: 'Vacha bridge', x: 0, kind: 'bridge', width: 9 },
    { name: 'Heringen bridge', x: SIDE_X, kind: 'bridge', width: 7 },
  ],
});

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const away = Math.abs(z - riverZ(x));
  let h = fbm(noise, x * 0.006, z * 0.006, 5) * 7;                  // rolling ground
  h += fbm(noise, x * 0.05 + 50, z * 0.05, 3) * 0.6;
  h += smoothstep(70, 200, away) * (9 + ridged(noise, x * 0.01 + 3, z * 0.01, 4) * 9); // the bluffs above the valley
  // point-mirrored hills: the wooded heights over each bank
  for (const [cx, cz, r, a] of [[-100, 165, 34, 13], [SIDE_X + 30, 200, 26, 6], [-SIDE_X - 40, 215, 24, 5]]) {
    h += hill(x, z, cx, cz, r, a) + hill(x, z, -cx, -cz, r, a);
  }
  h += smoothstep(300, 420, ax) * (14 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 22); // wooded edges
  h += smoothstep(320, 440, az) * 18;
  for (const bz of [BASE_Z, -BASE_Z]) {
    const k = smoothstep(28, 15, Math.hypot(x, z - bz));
    h += (h * 0.4 + 6 - h) * k; // a level base area up on the heights
  }
  return river.carve(x, z, Math.max(1.4, h)); // dry land never dips below the water away from the river
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Friedewald', x: 0, z: BASE_Z - 40, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Philippsthal', x: -SIDE_X, z: riverZ(-SIDE_X) + 52, owner: null, sector: 'west' },
  { id: 'C', name: 'Heimboldshausen', x: 0, z: 58, owner: null, sector: 'centre' },
  { id: 'D', name: 'Heringen', x: SIDE_X, z: riverZ(SIDE_X) + 52, owner: null, sector: 'east' },
  { id: 'E', name: 'Seulingswald', x: -100, z: 165, owner: null, sector: 'west' },
  { id: 'F', name: 'Vacha bridge', x: 0, z: 0, owner: null, sector: 'centre', radius: 18 },
  { id: 'G', name: 'Öchsen', x: 100, z: -165, owner: null, sector: 'east' },
  { id: 'H', name: 'Dippach', x: -SIDE_X, z: riverZ(-SIDE_X) - 52, owner: null, sector: 'west' },
  { id: 'I', name: 'Vacha', x: 0, z: -58, owner: null, sector: 'centre' },
  { id: 'J', name: 'Unterbreizbach', x: SIDE_X, z: riverZ(SIDE_X) - 52, owner: null, sector: 'east' },
  { id: 'K', name: 'Dorndorf', x: 0, z: -(BASE_Z - 40), owner: 'pact', sector: 'centre' },
];

export default {
  id: 'werra-valley',
  name: 'Werra Valley',
  description: 'A river across the border and only three bridges over it. Hold them, blow them, or lay your own.',
  size: 1000,
  segments: 600,
  bounds: { x: 300, z: 310 },
  seed: 1986,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1986, cell: 64 }),

  theme: {
    // a damp, misty November morning in the valley
    fogColor: 0x9ea6a8,
    fogDensity: 0.0029,
    skyTop: 0x6a7378,
    skyHorizon: 0xb6bab6,
    skyBottom: 0x6c706c,
    sunColor: 0xe6e2d4,
    sunIntensity: 1.5,
    sunDisk: 0.08,
    clouds: 0.85,
    cloudLight: 0xc6c9c6,
    cloudDark: 0x767c80,
    sunDir: [0.4, 0.5, -0.75],
    hemiSky: 0xc0cad0,
    hemiGround: 0x46463a,
    hemiIntensity: 1.3,
    rimColor: 0xb8c0c8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#556236',
      grassAlt: '#4a5832',
      dryGrass: '#80744e',
      dirt: '#524438',
      rock: '#686660',
      strip: '#4a3d30',
      pasture: '#56653a',
      ploughed: '#4a3b2d',
      stubble: '#857650',
      meadow: '#62703e',
      farmX: [310, 400],
      farmZ: [340, 430],
      roads: [-SIDE_X, 0, SIDE_X],  // a road to each bridge
      roadZ: 300,
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 170 }, pact: { x: 0, z: -170 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => Math.abs(z - riverZ(x)) < river.halfWidth + r;

    // villages (mirrored pairs share a seed); none on the bridge point itself
    for (const p of points) {
      if (p.z < 0 || p.id === 'F') continue;
      const seed = 9100 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }
    // cover on our half, mirrored; keep the banks by the crossings open
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'wrecks', 'hay', 'fieldwall', 'roadblock'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = riverZ(x) + 26 + rand() * (bounds.z - 60);
      if (z > bounds.z - 20 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 22 * 22)) continue;
      if (Math.hypot(x, z - BASE_Z) < 34 || nearPoint(x, z, 28) || nearWater(x, z, 10)) continue;
      if (river.crossings.some((c) => Math.abs(x - c.x) < 16 && Math.abs(z - c.z) < 45)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    // the centre bridge's checkpoint, both ends: barriers and an old customs hut's walls
    props.rand = mulberry32(606);
    for (const end of [1, -1]) {
      props.jersey({ x: -8 * end, z: (river.halfWidth + 16) * end, yaw: 0.2, length: 5 });
      props.jersey({ x: 9 * end, z: (river.halfWidth + 19) * end, yaw: -0.15, length: 4 });
      props.wall({ x: 14 * end, z: (river.halfWidth + 26) * end, yaw: 0, length: 6, height: 1.2 });
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 1.5) }];
    // alders and willows along the banks, woods on the hills, open fields between
    const forest = (x, z) => {
      const d = Math.abs(z - riverZ(x));
      if (d < river.halfWidth + 1) return -1; // not in the water
      const bank = d < river.halfWidth + 14 ? 0.55 : 0;
      const hills = hill(x, z, -100, 165, 34, 1) + hill(x, z, 100, -165, 34, 1) > 0.45 ? 0.8 : 0;
      return Math.max(bank, hills);
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
