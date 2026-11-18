// Vimeiro, 21 August 1808: Wellesley's first battle in the Peninsula. His British and Portuguese stood on
// the hills round the village of Vimeiro, in the valley of the Maceira a few miles from the Atlantic; Junot
// came at them in columns over the ridges from the east. The columns climbed Vimeiro Hill into the volleys
// of the two-deep line and the 95th's rifles in the vineyards, and broke. The French come from the north
// (+z), the British hold the south. A fair fight on mirrored ground: Vimeiro Hill with the village at its
// foot in the middle, owned by neither; the Maceira in front of the British, its twin the Toledo brook in
// front of the French, each with a bridge and two fords at the same places; the Ventosa ridge has its
// twin in the western ridge. Vineyards on the slopes (vine rows, low walls), maritime pines on the heights.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1808_08);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
const mirror = (x, z): [number, number] => (z < 0 || (z === 0 && x < 0) ? [-x, -z] : [x, z]);

// the Toledo brook in front of the French, the Maceira in front of the British (point-mirrored)
const toledoZ = (x) => 225 + 14 * Math.sin(x * 0.006) + 6 * Math.sin(x * 0.017 + 1);
const maceiraZ = (x) => -toledoZ(-x);
const away = (x, z) => Math.min(Math.abs(z - toledoZ(x)), Math.abs(z - maceiraZ(x)));
const river = createRiver({
  paths: [toledoZ, maceiraZ],
  halfWidth: 7,
  level: 0,
  depth: 1.8,
  valley: 40,
  crossings: [
    { name: 'Toledo ford', x: -300, kind: 'ford', width: 14, channel: 0 },
    { name: 'Toledo bridge', x: 0, kind: 'bridge', width: 6, channel: 0 },
    { name: 'Ventosa ford', x: 300, kind: 'ford', width: 14, channel: 0 },
    { name: 'Maceira ford', x: 300, kind: 'ford', width: 14, channel: 1 },
    { name: 'Vimeiro bridge', x: 0, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Mill ford', x: -300, kind: 'ford', width: 14, channel: 1 },
  ],
});

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Lourinhã road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Toledo', x: -380, z: 330, owner: null, sector: 'west' },
  { id: 'C', name: 'Ventosa ridge', x: -120, z: 330, owner: null, sector: 'centre' },
  { id: 'D', name: 'Fontanel', x: 250, z: 340, owner: null, sector: 'east' },
  { id: 'E', name: 'Vimeiro', x: -190, z: 85, owner: null, sector: 'west' },
  { id: 'F', name: 'Vimeiro Hill', x: 0, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'The vineyards', x: 190, z: -85, owner: null, sector: 'east' },
  { id: 'H', name: 'Maceira mill', x: -250, z: -340, owner: null, sector: 'west' },
  { id: 'I', name: 'Western ridge', x: 120, z: -330, owner: null, sector: 'centre' },
  { id: 'J', name: 'Porto Novo road', x: 380, z: -330, owner: null, sector: 'east' },
  { id: 'K', name: 'Maceira', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

/** Maritime pines on the ridge tops (0..1), the same on both halves. */
const pines = (x, z) => {
  const [ax, az] = mirror(x, z);
  let k = smoothstep(0.48, 0.62, fbm(noise, ax * 0.007 - 9, az * 0.007 + 30, 3));
  k = Math.max(k, smoothstep(80, 45, Math.hypot(ax - P.C.x + 60, az - P.C.z - 40)) * 0.8);
  if (away(x, z) < 26 && away(x, z) > 9) k = Math.max(k, 0.45);  // (reeds and poplars along the water)
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return k;
};
/** The vineyards (0..1): the slopes round the village and the hill. */
const vines = (x, z) => {
  const [ax, az] = mirror(x, z);
  return smoothstep(180, 120, Math.hypot(ax, az)) * smoothstep(0.35, 0.5, fbm(noise, ax * 0.01 + 3, az * 0.01, 2) + 0.4);
};

function height(x, z) {
  const [ax, az] = mirror(x, z);
  let h = fbm(noise, ax * 0.003, az * 0.003, 4) * 7 + fbm(noise, ax * 0.03 + 9, az * 0.03, 2) * 0.5 + 3;
  h += hill(ax, az, 0, 0, 105, 16);                                                   // Vimeiro Hill
  h += hill(ax, az, P.C.x, P.C.z, 120, 15) + ridged(noise, ax * 0.006, az * 0.006, 3) * 3 * smoothstep(240, 120, Math.hypot(ax - P.C.x, az - P.C.z)); // the Ventosa ridge (its twin the western ridge)
  h += hill(ax, az, 330, 180, 90, 8);                                                 // the spur by Fontanel
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 36 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, az) * 26; // the coast hills
  h += (h * 0.4 + 2 - h) * smoothstep(40, 18, Math.hypot(ax - P.E.x, az - P.E.z)) * 0.6; // the village on the hill's foot
  for (const bz of [BASE_Z, -BASE_Z]) h += (8 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'vimeiro',
  armies: { nato: ['fr'], pact: ['gb'] }, // (Junot's Armée de Portugal against Wellesley)
  name: 'Vimeiro',
  description: 'Portugal, August 1808: Vimeiro Hill and its village between two brooks, vineyards on the slopes, pine ridges either side. Wellesley\'s line against Junot\'s columns. Mirrored to keep it fair.',
  epochs: ['1806'],
  region: 'iberia',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180808,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => pines(x, z) * 0.7,
  fields: createFields({ seed: 1808, cell: 64, weights: [0.2, 0.15, 0.45, 0.2] }), // August: stubble and dry pasture

  theme: {
    // a hot, clear August morning near the Atlantic: a sea haze, the light hard
    fogColor: 0xd2d4cc,
    fogDensity: 0.0011,
    skyTop: 0x4f86c0,
    skyHorizon: 0xd8e0e0,
    skyBottom: 0x9a9a86,
    sunColor: 0xfff4dc,
    sunIntensity: 2.2,
    sunDisk: 0.7,
    clouds: 0.15,
    cloudLight: 0xf6f6f2,
    cloudDark: 0xb0b6ba,
    sunDir: [0.4, 0.7, -0.4],
    hemiSky: 0xd0dce6,
    hemiGround: 0x6a5e40,
    hemiIntensity: 1.2,
    rimColor: 0xe0e6ea,
    rimIntensity: 0.25,
    terrain: {
      grass: '#7a7a44',
      grassAlt: '#6e7040',
      dryGrass: '#b0995e',
      dirt: '#8a6e4a',
      rock: '#9a8e78',
      strip: '#7a5e3e',
      pasture: '#8a8450',
      ploughed: '#8a6a46',
      stubble: '#b8a266',
      meadow: '#7c7c46',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const v = vines(x, z);
        if (v > 0.2) return [0x7a6440, (v - 0.2) * 0.6];             // the vineyards' tilled red-brown earth
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Company' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => away(x, z) < river.halfWidth + r;

    // ---- Vimeiro (and its twin under the hill's other flank): white houses round the church, flat-roofed barns
    const rr = mulberry32(1808_21);
    const taken: number[][] = [];
    for (let i = 0; i < 18; i++) {
      const a = rr() * Math.PI * 2, d = 16 + rr() * 34;
      const x = P.E.x + Math.cos(a) * d, z = P.E.z + Math.sin(a) * d;
      if (taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11)) continue;
      taken.push([x, z]);
      const seed = Math.floor(rr() * 1e9), w = 7 + rr() * 3, yaw = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
      mirrored(props, seed, (m, flip) => (i % 3 ? props.house({ x: x * m, z: z * m, yaw: yaw + flip, width: w, depth: 6 }) : props.flatHouse({ x: x * m, z: z * m, yaw: yaw + flip, width: w, depth: 7 })));
    }
    props.rand = mulberry32(21081808);
    props.church({ x: P.E.x + 4, z: P.E.z - 8, yaw: Math.PI / 2 });
    props.church({ x: -P.E.x - 4, z: -P.E.z + 8, yaw: -Math.PI / 2 });
    // the vineyards: rows of low stone terrace walls on the slopes
    for (let i = 0; i < 120; i++) {
      const x = (rr() * 2 - 1) * 200, z = rr() * 200;
      if (vines(x, z) < 0.5 || nearPoint(x, z, 26) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 10) || nearWater(x, z, 6)) continue;
      const seed = Math.floor(rr() * 1e9);
      mirrored(props, seed, (m, flip) => props.wall({ x: x * m, z: z * m, yaw: flip + 0.1, length: 8 + props.rand() * 6, height: 0.8, color: 0x9a8a6c }));
    }

    // ---- the villages; farms (quintas), walls and hay
    for (const p of POINTS) {
      if (p.z <= 0 || p.id === 'C' || p.id === 'E') continue;
      const seed = 18088 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 44 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = 20 + rand() * (bounds.z - 80);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || nearPoint(x, z, 50) || pines(x, z) > 0.3 || nearWater(x, z, 10) || nearWater(-x, -z, 10) || vines(x, z) > 0.3) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd8d2c0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 1.5) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2400, broadleaf: 0.25, autumn: 0, maxY: 60, forest: (x, z) => pines(x, z) * 0.9 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2600, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: this.fields });

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
