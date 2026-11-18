// Werra Valley, November 1985: the river Werra winds east–west through the middle of the map
// along the inner-German border, between wooded bluffs. Three ways across, and nothing else —
// the battle is about the bridges: west and east road bridges (Philippsthal, Heringen) and the
// big centre bridge at Vacha. Engineers can blow them; bridge layers can add a crossing.
// Villages sit at each bridgehead on both banks; Vacha bridge is the centre point, wide enough to be
// held from either bridgehead (soldiers on the deck are hard to command); a
// height on each side overlooks the valley. NATO holds the south bank (+z), the Pact the north.
// Not a mirror: the Werra swings in its own loops (north toward Heringen, south under
// Philippsthal), the bridges stand where the towns are, and the heights differ — the broad wooded
// back of the Seulingswald over the Hessian bank, the steep basalt cone of the Öchsen over the
// Thuringian one. Fair by value: three bridges shared, a bridgehead village ~90 m back on each
// bank at each one, a high wooded height and two lower hills each side, the whole valley tilted
// alike for both (it falls west).
// Same shape as fuldaGap.js, plus `river` (world/River.js: routing, water, bridges). The big field
// (1.0 × 1.12 km): the heights ~300 m back from the river.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BRIDGE_X = [-330, 25, 300];   // Philippsthal, Vacha, Heringen
const SEULINGSWALD = [-190, 300];   // NATO's height: a broad wooded back
const OECHSEN = [175, -285];        // the Pact's: a steep basalt cone
const noise = createNoise2D(1986);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
// [x, z, r, amp]: the two heights, then two lower hills on each bank in their own places
const HILLS = [[...SEULINGSWALD, 52, 12.5], [...OECHSEN, 40, 9.8], [380, 350, 36, 6], [-390, 370, 34, 5], [-300, -335, 40, 5.5], [335, -400, 30, 5.5]];

// the Werra's loops (its mean line on z = 0, so both banks are as deep)
const riverZ = (x) => 22 * Math.sin(x * 0.0052 + 0.7) + 9 * Math.sin(x * 0.015 - 1.2) - 2;

const river = createRiver({
  path: riverZ,
  halfWidth: 12,
  level: 0,
  depth: 2.4,
  valley: 80,
  crossings: [
    { name: 'Philippsthal bridge', x: BRIDGE_X[0], kind: 'bridge', width: 7 },
    { name: 'Vacha bridge', x: BRIDGE_X[1], kind: 'bridge', width: 9 },
    { name: 'Heringen bridge', x: BRIDGE_X[2], kind: 'bridge', width: 7 },
  ],
});

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const away = Math.abs(z - riverZ(x));
  let h = fbm(noise, x * 0.0042, z * 0.0042, 5) * 7;                 // rolling ground
  h += fbm(noise, x * 0.05 + 50, z * 0.05, 3) * 0.6;
  h += smoothstep(90, 300, away) * (9 + ridged(noise, x * 0.007 + 3, z * 0.007, 4) * 9); // the bluffs above the valley
  for (const [cx, cz, r, a] of HILLS) h += hill(x, z, cx, cz, r, a);
  h += x * 0.01;                                                      // the valley falls west, alike on both banks
  h += smoothstep(500, 620, ax) * (14 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 22); // wooded edges
  h += smoothstep(560, 680, az) * 18;
  for (const bz of [BASE_Z, -BASE_Z]) {
    const k = smoothstep(28, 15, Math.hypot(x, z - bz));
    h += (h * 0.4 + 6 - h) * k; // a level base area up on the heights
  }
  return river.carve(x, z, Math.max(1.4, h)); // dry land never dips below the water away from the river
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Friedewald', x: 0, z: BASE_Z - 34, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Philippsthal', x: BRIDGE_X[0], z: riverZ(BRIDGE_X[0]) + 90, owner: null, sector: 'west' },
  { id: 'C', name: 'Heimboldshausen', x: -10, z: riverZ(-10) + 95, owner: null, sector: 'centre' },
  { id: 'D', name: 'Heringen', x: BRIDGE_X[2], z: riverZ(BRIDGE_X[2]) + 90, owner: null, sector: 'east' },
  { id: 'E', name: 'Seulingswald', x: SEULINGSWALD[0], z: SEULINGSWALD[1], owner: null, sector: 'west' },
  { id: 'F', name: 'Vacha bridge', x: BRIDGE_X[1], z: riverZ(BRIDGE_X[1]), owner: null, sector: 'centre', radius: 32 }, // reaches both bridgeheads: held from a bank, not only from the deck
  { id: 'G', name: 'Öchsen', x: OECHSEN[0], z: OECHSEN[1], owner: null, sector: 'east' },
  { id: 'H', name: 'Dippach', x: BRIDGE_X[0], z: riverZ(BRIDGE_X[0]) - 90, owner: null, sector: 'west' },
  { id: 'I', name: 'Vacha', x: 45, z: riverZ(45) - 100, owner: null, sector: 'centre' },
  { id: 'J', name: 'Unterbreizbach', x: BRIDGE_X[2], z: riverZ(BRIDGE_X[2]) - 90, owner: null, sector: 'east' },
  { id: 'K', name: 'Dorndorf', x: 0, z: -(BASE_Z - 34), owner: 'pact', sector: 'centre' },
];

export default {
  id: 'werra-valley',
  armies: { 1945: { nato: ['us'], pact: ['wh', 'fj'] } }, // (spring 1945 in Hesse and Thuringia: the US Army against the Wehrmacht and the last Fallschirmjäger — maps/index.js armiesOn)
  name: 'Werra Valley',
  description: 'A river across the border and only three bridges over it. Hold them, blow them, or lay your own.',
  ww2: { description: 'The Werra across the valley and only three bridges over it. Hold them, blow them, or lay your own.' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1986,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1986, cell: 64 }),

  theme: {
    // a damp, misty November morning in the valley
    fogColor: 0x9ea6a8,
    fogDensity: 0.0021,
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
      farmX: [520, 600],
      farmZ: [580, 660],
      roads: BRIDGE_X,              // a road to each bridge
      roadZ: 540,
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: BRIDGE_X }, pact: { x: 0, z: -BASE_Z, entries: BRIDGE_X } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => Math.abs(z - riverZ(x)) < river.halfWidth + r;

    // villages, each its own layout; none on the bridge point itself
    for (const p of points) if (p.id !== 'F') buildVillage(props, p, 9100 + Math.round(p.x * 3 + p.z * 7), 1);
    // cover: as many sites on each bank, each laid out on its own; keep the banks by the crossings open
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'wrecks', 'hay', 'fieldwall', 'roadblock'];
    const sites: any[] = [];
    for (const side of [1, -1]) {
      let n = 0;
      for (let tries = 0; n < 140 && tries < 9000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20);
        const z = riverZ(x) + side * (26 + rand() * (bounds.z - 60));
        if (Math.abs(z) > bounds.z - 20 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 28 * 28)) continue;
        if (Math.hypot(x, z - side * BASE_Z) < 40 || nearPoint(x, z, 34) || nearWater(x, z, 10)) continue;
        if (river.crossings.some((c) => Math.abs(x - c.x) < 16 && Math.abs(z - c.z) < 45)) continue;
        sites.push({ x, z, kind: kinds[n++ % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
      }
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    // the centre bridge's checkpoints: the West's barrier on the south end, the old GDR customs post's walls on the north
    props.rand = mulberry32(606);
    const vb = river.crossings[1];
    props.jersey({ x: vb.x - 8, z: vb.z + river.halfWidth + 16, yaw: 0.2, length: 5 });
    props.jersey({ x: vb.x + 9, z: vb.z + river.halfWidth + 19, yaw: -0.15, length: 4 });
    props.wall({ x: vb.x - 15, z: vb.z - river.halfWidth - 24, yaw: 0.1, length: 7, height: 1.2 });
    props.wall({ x: vb.x - 19, z: vb.z - river.halfWidth - 28, yaw: Math.PI / 2, length: 6, height: 1.2 });
    props.jersey({ x: vb.x + 10, z: vb.z - river.halfWidth - 17, yaw: 2.9, length: 5 });
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
      const hills = hill(x, z, SEULINGSWALD[0], SEULINGSWALD[1], 52, 1) + hill(x, z, OECHSEN[0], OECHSEN[1], 40, 1) > 0.45 ? 0.8 : 0;
      return Math.max(bank, hills);
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, forest });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 8000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3, fields: this.fields });

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
