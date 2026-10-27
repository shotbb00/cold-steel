// Monte Kali, autumn 1985: the potash country of the Werra, where the mines have piled their
// salt into a white mountain. The great spoil heap stands in the middle of the map, 45 m over
// the plain — whoever holds the top sees the whole battlefield (`overwatch`: spotters looking
// down see up to half again as far, systems/VisibilitySystem.js). Around its foot: the two
// mines with their headframes and conveyor bridges climbing to the heap, the potash railway
// yards with their open wagons, the miners' towns of Heringen and Widdershausen, the bare
// salt slopes. NATO from the south (+z), the Pact from the north. Point-mirrored.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 285;
const HEAP_R = 125;     // the heap's foot
const HEAP_H = 45;      // its height
const RAIL_Z = 148;     // the potash railway along the mine works
const noise = createNoise2D(1990);

/** The spoil heap: 0..1 share of its full height at (x, z) — a terraced dome, a flat top. */
function heap(x, z) {
  const r = Math.hypot(x * 1.15, z * 0.9);            // a little longer east–west
  const t = smoothstep(HEAP_R, 22, r);
  const terraces = Math.sin(t * Math.PI * 4) * 0.02;   // the benches the spreaders left
  return Math.min(1, t * (1 + terraces));
}

function height(x, z) {
  let h = fbm(noise, x * 0.006, z * 0.006, 5) * 6 + fbm(noise, x * 0.04 + 9, z * 0.04, 3) * 0.5;
  h += smoothstep(300, 410, Math.abs(x)) * (12 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 20);
  h += smoothstep(330, 440, Math.abs(z)) * 16;
  // the heap, with gullies washed down its flanks (symmetric noise so both sides match)
  const k = heap(x, z);
  const gully = (ridged(noise, x * 0.05, z * 0.05, 3) + ridged(noise, -x * 0.05, -z * 0.05, 3)) / 2;
  h += k * HEAP_H - (k > 0.05 && k < 0.95 ? gully * 2.4 : 0);
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  // the mine works sit on level yards
  for (const s of [1, -1]) h += (2 - h) * smoothstep(48, 34, Math.hypot(x, z - s * 168)) * (1 - k);
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Lengers', x: 0, z: 240, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Heringen', x: -215, z: 112, owner: null, sector: 'west' },
  { id: 'C', name: 'Werk Wintershall', x: 0, z: 168, owner: null, sector: 'centre' },
  { id: 'D', name: 'Kalibahnhof', x: 205, z: 140, owner: null, sector: 'east' },
  { id: 'E', name: 'Haldenfuß West', x: -150, z: 10, owner: null, sector: 'west' },
  { id: 'F', name: 'Monte Kali', x: 0, z: 0, owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Haldenfuß Ost', x: 150, z: -10, owner: null, sector: 'east' },
  { id: 'H', name: 'Bahnhof Herfa', x: -205, z: -140, owner: null, sector: 'west' },
  { id: 'I', name: 'Schacht Herfa', x: 0, z: -168, owner: null, sector: 'centre' },
  { id: 'J', name: 'Widdershausen', x: 215, z: -112, owner: null, sector: 'east' },
  { id: 'K', name: 'Kleinensee', x: 0, z: -240, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'monte-kali',
  name: 'Monte Kali',
  description: 'The potash mines and their white mountain: a 45 m spoil heap in the middle sees the whole map. Headframes, conveyors, rail yards and miners\' towns around its foot.',
  size: 1000,
  segments: 600,
  bounds: { x: 300, z: 310 },
  seed: 1990,
  height,
  overwatch: true,
  fields: createFields({ seed: 1990, cell: 64 }),

  theme: {
    // a hazy, bright overcast — the heap glares
    fogColor: 0xaeb2b0,
    fogDensity: 0.0022,
    skyTop: 0x687480,
    skyHorizon: 0xc2c4be,
    skyBottom: 0x747672,
    sunColor: 0xeee6d2,
    sunIntensity: 1.7,
    sunDisk: 0.15,
    clouds: 0.75,
    cloudLight: 0xd0d2cc,
    cloudDark: 0x7e8286,
    sunDir: [0.45, 0.55, 0.7],
    hemiSky: 0xc6ccd2,
    hemiGround: 0x4c483c,
    hemiIntensity: 1.3,
    rimColor: 0xb8c0c8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#56623a',
      grassAlt: '#4c5834',
      dryGrass: '#857650',
      dirt: '#55473a',
      rock: '#a8a49a',
      pasture: '#57633a',
      ploughed: '#4b3c2e',
      stubble: '#8a7a4e',
      meadow: '#64703e',
      farmX: [320, 400],
      farmZ: [350, 430],
      roads: [-215, 215],
      roadZ: 300,
      surface(x, z) {
        const k = heap(x, z);
        if (k > 0.02) return [k > 0.9 ? 0xffffff : 0xf4f1ea, Math.min(1, k * 4)];  // the salt: white, a little dusty
        const r = Math.hypot(x * 1.15, z * 0.9);
        if (r < HEAP_R + 30) return [0x8a8676, smoothstep(HEAP_R + 30, HEAP_R, r) * 0.7]; // salt dust around the foot
        if (Math.abs(Math.abs(z) - RAIL_Z) < 5 && Math.abs(x) > 40 && Math.abs(x) < 300) return [0x4e4a44, 0.9];
        for (const s of [1, -1]) {
          const d = Math.hypot(x, z - s * 168);
          if (d < 42) return [0x5e5a52, smoothstep(42, 30, d) * 0.85];             // the works yards
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-215, 0, 215] }, pact: { x: 0, z: -BASE_Z, entries: [-215, 0, 215] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 200 }, pact: { x: 0, z: -200 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });

    mirrored(props, 4401, (m, flip) => {
      // the mine works: the headframe over the shaft, winding house, processing halls, the
      // conveyor bridge climbing to the heap
      props.headframe({ x: -16 * m, z: 176 * m, yaw: flip, height: 34 });
      props.hall({ x: -16 * m, z: 192 * m, yaw: flip, width: 16, depth: 11, height: 9, color: 0x7a5a48, name: 'winding house' });
      props.hall({ x: 22 * m, z: 170 * m, yaw: Math.PI / 2 + flip, width: 34, depth: 18, height: 10, color: 0x8a8478, roof: 0x5a5c5e, door: 12, name: 'processing plant' });
      props.hall({ x: 18 * m, z: 198 * m, yaw: flip, width: 18, depth: 10, height: 6, color: 0x7a6a58, name: 'workshop' });
      props.conveyor({ x0: 4 * m, z0: 152 * m, y0: 8, x1: 0, z1: 70 * m, y1: 3 });
      props.tanks({ x: -44 * m, z: 168 * m, yaw: Math.PI / 2 + flip, count: 2, radius: 3, height: 9, color: 0x8a8a84 });
      props.chimney({ x: 40 * m, z: 190 * m, height: 28 });
      // the potash railway: tracks along the works, open wagons in the yards
      props.rails({ x0: -300 * m, z0: RAIL_Z * m, x1: -40 * m, z1: RAIL_Z * m });
      props.rails({ x0: 40 * m, z0: RAIL_Z * m, x1: 300 * m, z1: RAIL_Z * m });
      props.rails({ x0: 150 * m, z0: (RAIL_Z - 7) * m, x1: 260 * m, z1: (RAIL_Z - 7) * m });
      for (const x of [168, 181, 194, 207, 228, 241]) props.wagon({ x: x * m, z: (RAIL_Z - 7) * m, yaw: Math.PI / 2, kind: 'open', color: 0x4a4038 });
      for (const x of [-120, -107]) props.wagon({ x: x * m, z: RAIL_Z * m, yaw: Math.PI / 2, kind: 'box' });
      props.hall({ x: 205 * m, z: 126 * m, yaw: Math.PI + flip, width: 22, depth: 10, height: 6, color: 0x6e5444, name: 'loading shed' });
      props.townHouse({ x: 236 * m, z: 128 * m, yaw: Math.PI + flip, width: 12, depth: 8, storeys: 2, name: 'station' });
      // the heap's foot: fallen salt blocks, an abandoned spreader, the dust road
      for (let k = 0; k < 8; k++) {
        const a = -0.5 + props.rand() * 1.0;
        const r = HEAP_R + 4 + props.rand() * 14;
        props.boulder({ x: (-Math.cos(a) * r / 1.15) * m, z: (Math.sin(a) * r / 0.9 * 0.4 + 10) * m, radius: 1.4 + props.rand() * 1.6 });
      }
      props.wreckCar({ x: -150 * m, z: 24 * m, yaw: 1.4 + flip });
      props.hall({ x: -168 * m, z: -6 * m, yaw: Math.PI / 2 + flip, width: 14, depth: 8, height: 5, color: 0x8a8070, name: 'pump station' });
      // the summit: a surveyor's hut and the end of the conveyor
      props.lowWall({ x: 10 * m, z: 8 * m, yaw: 0.3, length: 8, height: 1.3, color: 0xc8c4b8 });
      props.crates({ x: -6 * m, z: 12 * m, yaw: flip });
    });
    // the miners' towns: rows of houses either side of a main street
    const town = (cx, cz, seed) => {
      const r = mulberry32(seed);
      for (let row = -1; row <= 1; row += 2) {
        for (let i = 0; i < 6; i++) {
          if (r() < 0.25) continue;
          const x = cx - 40 + i * 14 + (r() - 0.5) * 2;
          const z = cz + row * 12;
          const s = Math.floor(r() * 1e9);
          mirrored(props, s, (m, flip) => props.townHouse({ x: x * m, z: z * m, yaw: (row > 0 ? 0 : Math.PI) + flip, width: 9, depth: 8, storeys: 2, name: "miners' house" }));
        }
      }
      mirrored(props, seed + 1, (m, flip) => props.church({ x: (cx + 48) * m, z: cz * m, yaw: Math.PI / 2 + flip }));
    };
    town(-215, 112, 5501);
    buildVillage(props, points[0], 9600, 1);
    buildVillage(props, { x: 0, z: -240 }, 9600, -1);
    // farm cover on the plain
    const kinds = ['farm', 'fieldwall', 'hay', 'rocks', 'hay', 'wrecks', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 36 && tries < 5000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 20 + rand() * (bounds.z - 30);
      if (Math.hypot(x * 1.15, z * 0.9) < HEAP_R + 20 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 50)) continue;
      if (Math.abs(z - RAIL_Z) < 10 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 24 * 24) || Math.hypot(x, z - BASE_Z) < 34) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 24 }, { x: 0, z: -BASE_Z, r: 24 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => Math.hypot(x * 1.15, z * 0.9) < HEAP_R + 12 || Math.abs(Math.abs(z) - RAIL_Z) < 6 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1300, forest: (x, z) => (Math.abs(x) > 260 ? 0.7 : 0.04) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 5000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3.6, fields: this.fields });

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
