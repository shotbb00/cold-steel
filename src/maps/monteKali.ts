// Kaliwerk Hattorf, autumn 1985: the potash country of the Werra, fought over as an industrial
// battlefield. In the middle the great works — two processing halls facing each other across the
// central yard, headframes over the shafts, conveyor bridges between the plants and the potash
// stockpiles, storage tanks, chimneys and the works railway — a maze of brick, steel and open
// yards. The white stockpiles are a few metres high: enough to see over the yards from
// (`overwatch`: spotters looking down see further, systems/VisibilitySystem.js), not a mountain.
// Further out on both sides: the shaft works with their own headframes, the potash railway
// yards with open wagons, the miners' towns of Heringen and Widdershausen. NATO from the south
// (+z), the Pact from the north. Point-mirrored (the map id stays 'monte-kali').
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 285;
const RAIL_Z = 148;     // the potash railway along the shaft works
const SPUR_Z = 62;      // the works railway through the central works
const WORKS = { hx: 95, hz: 75 }; // the central works' yard, a rounded rectangle
const noise = createNoise2D(1990);

// the potash stockpiles: [x, z, radius, height] on our half (the other half mirrored)
const PILES = [[-78, 44, 17, 8], [150, 36, 13, 6], [40, 104, 11, 5]];
const pileAt = (x, z) => {
  let k = 0;
  for (const [px, pz, r] of PILES) for (const m of [1, -1]) {
    const d = Math.hypot(x - px * m, (z - pz * m) * 1.15);
    k = Math.max(k, smoothstep(r, r * 0.25, d));
  }
  return k;
};
const pileHeight = (x, z) => {
  let h = 0;
  for (const [px, pz, r, ht] of PILES) for (const m of [1, -1]) {
    const d = Math.hypot(x - px * m, (z - pz * m) * 1.15);
    h = Math.max(h, smoothstep(r, r * 0.25, d) * ht);
  }
  return h;
};
/** 0..1: inside the central works yard (flat, paved). */
const yard = (x, z) => smoothstep(1.15, 0.95, Math.hypot(x / WORKS.hx, z / WORKS.hz));

function height(x, z) {
  let h = fbm(noise, x * 0.006, z * 0.006, 5) * 5 + fbm(noise, x * 0.04 + 9, z * 0.04, 3) * 0.4;
  h += smoothstep(300, 410, Math.abs(x)) * (12 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 20);
  h += smoothstep(330, 440, Math.abs(z)) * 16;
  h += (2 - h) * yard(x, z);                                                       // the works stand on level yards…
  for (const s of [1, -1]) h += (2 - h) * smoothstep(48, 34, Math.hypot(x, z - s * 168)); // …the shaft works too
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return h + pileHeight(x, z);
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Lengers', x: 0, z: 240, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Heringen', x: -215, z: 112, owner: null, sector: 'west' },
  { id: 'C', name: 'Schacht Wintershall', x: 0, z: 168, owner: null, sector: 'centre' },
  { id: 'D', name: 'Kalibahnhof', x: 205, z: 140, owner: null, sector: 'east' },
  { id: 'E', name: 'Kalilager West', x: -122, z: 22, owner: null, sector: 'west' },
  { id: 'F', name: 'Werk Hattorf', x: 0, z: 0, owner: null, sector: 'centre', radius: 20 },
  { id: 'G', name: 'Kalilager Ost', x: 122, z: -22, owner: null, sector: 'east' },
  { id: 'H', name: 'Bahnhof Herfa', x: -205, z: -140, owner: null, sector: 'west' },
  { id: 'I', name: 'Schacht Herfa', x: 0, z: -168, owner: null, sector: 'centre' },
  { id: 'J', name: 'Widdershausen', x: 215, z: -112, owner: null, sector: 'east' },
  { id: 'K', name: 'Kleinensee', x: 0, z: -240, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'monte-kali',
  name: 'Kaliwerk Hattorf',
  description: 'A potash works as a battlefield: processing halls, headframes, conveyor bridges, rail yards and white stockpiles in the middle, the shaft works and miners\' towns around them.',
  size: 1000,
  segments: 600,
  bounds: { x: 300, z: 310 },
  seed: 1990,
  height,
  overwatch: true,
  fields: createFields({ seed: 1990, cell: 64 }),

  theme: {
    // a hazy, bright overcast over the works
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
      roads: [-215, 0, 215],
      roadZ: 300,
      surface(x, z) {
        const p = pileAt(x, z);
        if (p > 0.05) return [p > 0.7 ? 0xffffff : 0xf0ede4, Math.min(1, p * 2.5)];               // the potash: white
        const y = yard(x, z);
        if (y > 0.05) return [0x6a665e, y * 0.9];                                                  // the works yard: concrete and dust
        if (Math.abs(Math.abs(z) - RAIL_Z) < 5 && Math.abs(x) > 40 && Math.abs(x) < 300) return [0x4e4a44, 0.9];
        for (const s of [1, -1]) {
          const d = Math.hypot(x, z - s * 168);
          if (d < 42) return [0x5e5a52, smoothstep(42, 30, d) * 0.85];                           // the shaft works' yards
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
      // the central works: a processing hall either side of the central yard (Werk Hattorf, F)
      props.hall({ x: -34 * m, z: 24 * m, yaw: flip, width: 40, depth: 18, height: 12, color: 0x8a7462, roof: 0x5a5c5e, door: 10, name: 'processing hall' });
      props.hall({ x: 38 * m, z: 30 * m, yaw: Math.PI / 2 + flip, width: 22, depth: 14, height: 8, color: 0x7a6a58, name: 'flotation plant' });
      props.hall({ x: -70 * m, z: -8 * m, yaw: Math.PI / 2 + flip, width: 18, depth: 12, height: 7, color: 0x6e5444, name: 'workshop' });
      props.hall({ x: 8 * m, z: 52 * m, yaw: flip, width: 26, depth: 10, height: 6, color: 0x7a5a48, name: 'loading hall' });
      props.headframe({ x: 62 * m, z: 52 * m, yaw: flip, height: 32 });
      props.hall({ x: 62 * m, z: 68 * m, yaw: flip, width: 14, depth: 10, height: 8, color: 0x7a5a48, name: 'winding house' });
      props.tanks({ x: -12 * m, z: 30 * m, yaw: flip, count: 3, radius: 3, height: 10, color: 0x8a8a84 });
      props.chimney({ x: -58 * m, z: 30 * m, height: 34 });
      props.tower({ x: 20 * m, z: 12 * m });
      // conveyor bridges: from the halls to the stockpiles and the loading hall
      props.conveyor({ x0: -34 * m, z0: 34 * m, y0: 11, x1: -72 * m, z1: 42 * m, y1: 9 });
      props.conveyor({ x0: 38 * m, z0: 42 * m, y0: 7, x1: 10 * m, z1: 50 * m, y1: 6 });
      props.conveyor({ x0: 62 * m, z0: 56 * m, y0: 14, x1: 40 * m, z1: 40 * m, y1: 7 });
      // the works railway through the yard, wagons at the loading hall
      props.rails({ x0: -110 * m, z0: SPUR_Z * m, x1: 110 * m, z1: SPUR_Z * m });
      for (const x of [-14, -1, 12, 25]) props.wagon({ x: x * m, z: SPUR_Z * m, yaw: Math.PI / 2, kind: 'open', color: 0x4a4038 });
      // yard clutter to fight through: low walls, crates, wrecks, a salt-block barricade
      props.lowWall({ x: 8 * m, z: -12 * m, yaw: 0.2 + flip, length: 10, height: 1.2, color: 0x9a968c });
      props.lowWall({ x: -22 * m, z: 4 * m, yaw: Math.PI / 2 + flip, length: 8, height: 1.2, color: 0x9a968c });
      props.crates({ x: 16 * m, z: 4 * m, yaw: flip });
      props.crates({ x: -48 * m, z: 8 * m, yaw: 0.6 + flip });
      props.wreckCar({ x: 26 * m, z: -4 * m, yaw: 1.2 + flip });
      for (let k = 0; k < 4; k++) props.boulder({ x: (-88 + k * 5) * m, z: (60 + props.rand() * 4) * m, radius: 1.4 + props.rand() });

      // the shaft works north and south: the headframe, winding house, processing plant
      props.headframe({ x: -16 * m, z: 176 * m, yaw: flip, height: 34 });
      props.hall({ x: -16 * m, z: 192 * m, yaw: flip, width: 16, depth: 11, height: 9, color: 0x7a5a48, name: 'winding house' });
      props.hall({ x: 22 * m, z: 170 * m, yaw: Math.PI / 2 + flip, width: 34, depth: 18, height: 10, color: 0x8a8478, roof: 0x5a5c5e, door: 12, name: 'processing plant' });
      props.hall({ x: 18 * m, z: 198 * m, yaw: flip, width: 18, depth: 10, height: 6, color: 0x7a6a58, name: 'workshop' });
      props.tanks({ x: -44 * m, z: 168 * m, yaw: Math.PI / 2 + flip, count: 2, radius: 3, height: 9, color: 0x8a8a84 });
      props.chimney({ x: 40 * m, z: 190 * m, height: 28 });
      // the potash railway: tracks along the shaft works, open wagons in the yards
      props.rails({ x0: -300 * m, z0: RAIL_Z * m, x1: -40 * m, z1: RAIL_Z * m });
      props.rails({ x0: 40 * m, z0: RAIL_Z * m, x1: 300 * m, z1: RAIL_Z * m });
      props.rails({ x0: 150 * m, z0: (RAIL_Z - 7) * m, x1: 260 * m, z1: (RAIL_Z - 7) * m });
      for (const x of [168, 181, 194, 207, 228, 241]) props.wagon({ x: x * m, z: (RAIL_Z - 7) * m, yaw: Math.PI / 2, kind: 'open', color: 0x4a4038 });
      for (const x of [-120, -107]) props.wagon({ x: x * m, z: RAIL_Z * m, yaw: Math.PI / 2, kind: 'box' });
      props.hall({ x: 205 * m, z: 126 * m, yaw: Math.PI + flip, width: 22, depth: 10, height: 6, color: 0x6e5444, name: 'loading shed' });
      props.townHouse({ x: 236 * m, z: 128 * m, yaw: Math.PI + flip, width: 12, depth: 8, storeys: 2, name: 'station' });
      // the stockpile stores: a pump house by the western piles
      props.hall({ x: -150 * m, z: 4 * m, yaw: Math.PI / 2 + flip, width: 14, depth: 8, height: 5, color: 0x8a8070, name: 'pump station' });
      props.wreckCar({ x: -140 * m, z: 30 * m, yaw: 1.4 + flip });
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
    // farm cover on the plain outside the works
    const kinds = ['farm', 'fieldwall', 'hay', 'rocks', 'hay', 'wrecks', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 36 && tries < 5000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 20 + rand() * (bounds.z - 30);
      if (yard(x, z) > 0.01 || pileAt(x, z) > 0.01 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 50)) continue;
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
      { test: (x, z) => yard(x, z) > 0.2 || pileAt(x, z) > 0.05 || Math.abs(Math.abs(z) - RAIL_Z) < 6 || Math.abs(Math.abs(z) - SPUR_Z) < 5 }];
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
