// Kaliwerk Hattorf, autumn 1985: the potash country of the Werra, fought over as an industrial
// battlefield. In the middle the great works — the processing plants either side of the central
// yard, headframes over the shafts, conveyor bridges between the plants and the potash
// stockpiles, storage tanks, chimneys and the works railway — a maze of brick, steel and open
// yards. The white stockpiles are a few metres high: enough to see over the yards from
// (`overwatch`: spotters looking down see further, systems/VisibilitySystem.js), not a mountain.
// Further out on both sides: the shaft works with their headframes, the potash railway yards with
// their wagons, the miners' towns of Heringen and Widdershausen. NATO from the south (+z), the
// Pact from the north (the map id stays 'monte-kali'). The big field (1.0 × 1.12 km).
// Not a mirror: the south half of the works has the old processing hall, the flotation plant and
// the works railway, with the big tip (the young Monte Kali) to the west; the north half the
// dissolving plant, the drying plant and the power station, with its tips spread east and west;
// Wintershall's single shaft faces Herfa's twin headframes, the Kalibahnhof's open wagons the
// Herfa store's box wagons, the terraced rows of Heringen the long street of Widdershausen.
// Fair by value: as much stockpile height and as many big halls on each half, each shaft works,
// rail yard and miners' town at matching distances from its base (tools/map_fairness.py).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SHAFTS = [[0, 300], [-40, -298]];   // the shaft works: Wintershall (south), Herfa (north)
const RAIL_S = 272;     // the potash railway along the south shaft works…
const RAIL_N = -252;    // …and along the north
const SPUR_Z = 62;      // the works railway through the south half of the central works
const WORKS = { hx: 95, hz: 75 }; // the central works' yard, a rounded rectangle
const noise = createNoise2D(1990);

// the potash stockpiles: [x, z, radius, height] — the big tip in the south-west, three spread on the north
const PILES = [[-80, 46, 18, 8], [36, 104, 11, 5], [120, -52, 16, 7.5], [-150, -30, 12, 6], [-20, -112, 9, 4.5]];
const pileAt = (x, z) => {
  let k = 0;
  for (const [px, pz, r] of PILES) k = Math.max(k, smoothstep(r, r * 0.25, Math.hypot(x - px, (z - pz) * 1.15)));
  return k;
};
const pileHeight = (x, z) => {
  let h = 0;
  for (const [px, pz, r, ht] of PILES) h = Math.max(h, smoothstep(r, r * 0.25, Math.hypot(x - px, (z - pz) * 1.15)) * ht);
  return h;
};
/** 0..1: inside the central works yard (flat, paved). */
const yard = (x, z) => smoothstep(1.15, 0.95, Math.hypot(x / WORKS.hx, z / WORKS.hz));
const shaftDist = (x, z) => Math.min(...SHAFTS.map(([sx, sz]) => Math.hypot(x - sx, z - sz)));
const onRail = (x, z) => Math.abs(x) > 40 && Math.abs(x) < 500 && (Math.abs(z - RAIL_S) < 5 || Math.abs(z - RAIL_N) < 5);

function height(x, z) {
  let h = fbm(noise, x * 0.006, z * 0.006, 5) * 5 + fbm(noise, x * 0.04 + 9, z * 0.04, 3) * 0.4;
  h += smoothstep(500, 610, Math.abs(x)) * (12 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 20);
  h += smoothstep(560, 670, Math.abs(z)) * 16;
  h += (2 - h) * yard(x, z);                                    // the works stand on level yards…
  h += (2 - h) * smoothstep(48, 34, shaftDist(x, z));           // …the shaft works too
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return h + pileHeight(x, z);
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Lengers', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Heringen', x: -340, z: 160, owner: null, sector: 'west' },
  { id: 'C', name: 'Schacht Wintershall', x: SHAFTS[0][0], z: SHAFTS[0][1], owner: null, sector: 'centre' },
  { id: 'D', name: 'Kalibahnhof', x: 340, z: RAIL_S - 10, owner: null, sector: 'east' },
  { id: 'E', name: 'Kalilager West', x: -100, z: 30, owner: null, sector: 'west' },
  { id: 'F', name: 'Werk Hattorf', x: 0, z: 0, owner: null, sector: 'centre', radius: 20 },
  { id: 'G', name: 'Kalilager Ost', x: 140, z: -36, owner: null, sector: 'east' },
  { id: 'H', name: 'Bahnhof Herfa', x: -320, z: RAIL_N + 12, owner: null, sector: 'west' },
  { id: 'I', name: 'Schacht Herfa', x: SHAFTS[1][0], z: SHAFTS[1][1], owner: null, sector: 'centre' },
  { id: 'J', name: 'Widdershausen', x: 368, z: -150, owner: null, sector: 'east' },
  { id: 'K', name: 'Kleinensee', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'monte-kali',
  armies: { 1945: { nato: ['us'], pact: ['wh', 'fj'] } }, // (spring 1945 in Hesse and Thuringia: the US Army against the Wehrmacht and the last Fallschirmjäger — maps/index.js armiesOn)
  name: 'Kaliwerk Hattorf',
  description: 'A potash works as a battlefield: processing halls, headframes, conveyor bridges, rail yards and white stockpiles in the middle, the shaft works and miners\' towns around them.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1990,
  height,
  overwatch: true,
  fields: createFields({ seed: 1990, cell: 64 }),

  theme: {
    // a hazy, bright overcast over the works
    fogColor: 0xaeb2b0,
    fogDensity: 0.0018,
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
      farmX: [520, 600],
      farmZ: [580, 660],
      roads: [-340, 0, 340],
      roadZ: 540,
      surface(x, z) {
        const p = pileAt(x, z);
        if (p > 0.05) return [p > 0.7 ? 0xffffff : 0xf0ede4, Math.min(1, p * 2.5)];               // the potash: white
        const y = yard(x, z);
        if (y > 0.05) return [0x6a665e, y * 0.9];                                                  // the works yard: concrete and dust
        if (onRail(x, z)) return [0x4e4a44, 0.9];
        const d = shaftDist(x, z);
        if (d < 42) return [0x5e5a52, smoothstep(42, 30, d) * 0.85];                               // the shaft works' yards
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-340, 0, 340] }, pact: { x: 0, z: -BASE_Z, entries: [-340, 0, 340] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    props.rand = mulberry32(4401);

    // ---- the central works, south half: the old processing hall, the flotation plant, the loading
    // hall and its headframe, the works railway with wagons, a conveyor to the big tip
    props.hall({ x: -34, z: 24, yaw: 0, width: 40, depth: 18, height: 12, color: 0x8a7462, roof: 0x5a5c5e, door: 10, name: 'processing hall' });
    props.hall({ x: 38, z: 30, yaw: Math.PI / 2, width: 22, depth: 14, height: 8, color: 0x7a6a58, name: 'flotation plant' });
    props.hall({ x: 8, z: 52, yaw: 0, width: 26, depth: 10, height: 6, color: 0x7a5a48, name: 'loading hall' });
    props.headframe({ x: 62, z: 52, yaw: 0, height: 32 });
    props.hall({ x: 62, z: 68, yaw: 0, width: 14, depth: 10, height: 8, color: 0x7a5a48, name: 'winding house' });
    props.tanks({ x: -12, z: 30, yaw: 0, count: 3, radius: 3, height: 10, color: 0x8a8a84 });
    props.chimney({ x: -58, z: 30, height: 34 });
    props.tower({ x: 20, z: 12 });
    props.conveyor({ x0: -34, z0: 34, y0: 11, x1: -72, z1: 42, y1: 9 });
    props.conveyor({ x0: 38, z0: 42, y0: 7, x1: 10, z1: 50, y1: 6 });
    props.conveyor({ x0: 62, z0: 56, y0: 14, x1: 40, z1: 40, y1: 7 });
    props.rails({ x0: -110, z0: SPUR_Z, x1: 110, z1: SPUR_Z });
    for (const x of [-14, -1, 12, 25]) props.wagon({ x, z: SPUR_Z, yaw: Math.PI / 2, kind: 'open', color: 0x4a4038 });
    props.lowWall({ x: 8, z: 12, yaw: 0.2, length: 10, height: 1.2, color: 0x9a968c });
    props.crates({ x: 16, z: 4, yaw: 0 });
    props.crates({ x: -48, z: 8, yaw: 0.6 });
    props.wreckCar({ x: -18, z: 6, yaw: 1.2 });
    for (let k = 0; k < 4; k++) props.boulder({ x: -88 + k * 5, z: 66 + props.rand() * 4, radius: 1.4 + props.rand() }); // salt blocks
    props.hall({ x: -122, z: 6, yaw: Math.PI / 2, width: 14, depth: 8, height: 5, color: 0x8a8070, name: 'pump station' });
    props.wreckCar({ x: -112, z: 52, yaw: 1.4 });

    // ---- the central works, north half: the dissolving plant, the drying plant, the power station
    // with the tallest chimney, a headframe of its own, conveyors out to the tips, a truck bay
    props.hall({ x: 22, z: -30, yaw: Math.PI, width: 46, depth: 16, height: 11, color: 0x84705e, roof: 0x5a5c5e, door: 12, name: 'dissolving plant' });
    props.hall({ x: -46, z: -34, yaw: Math.PI / 2, width: 24, depth: 14, height: 9, color: 0x7a6a58, name: 'drying plant' });
    props.hall({ x: -10, z: -62, yaw: Math.PI, width: 22, depth: 12, height: 10, color: 0x6e5a4a, name: 'power station' });
    props.chimney({ x: 30, z: -60, height: 38 });
    props.headframe({ x: -72, z: -60, yaw: Math.PI / 2, height: 30 });
    props.hall({ x: -72, z: -76, yaw: Math.PI, width: 12, depth: 10, height: 7, color: 0x7a5a48, name: 'winding house' });
    props.tanks({ x: 62, z: -18, yaw: Math.PI / 2, count: 4, radius: 2.6, height: 9, color: 0x8a8a84 });
    props.conveyor({ x0: 42, z0: -34, y0: 10, x1: 108, z1: -48, y1: 7 });
    props.conveyor({ x0: -52, z0: -26, y0: 8, x1: -138, z1: -30, y1: 6 });
    props.conveyor({ x0: -10, z0: -68, y0: 9, x1: -18, z1: -104, y1: 4 });
    for (const [x, yaw] of [[28, 1.5], [42, 1.7], [56, 1.4]]) props.wreckCar({ x, z: -84, yaw });   // trucks at the loading bay
    props.lowWall({ x: 42, z: -92, yaw: 0, length: 36, height: 1.3, color: 0x9a968c });
    props.lowWall({ x: -24, z: -6, yaw: Math.PI / 2, length: 8, height: 1.2, color: 0x9a968c });
    props.lowWall({ x: 74, z: -46, yaw: 0.3, length: 9, height: 1.2, color: 0x9a968c });
    props.crates({ x: -28, z: -14, yaw: 0.3 });
    props.crates({ x: 6, z: -8, yaw: 1.1 });
    props.wreckCar({ x: 90, z: -10, yaw: 2.6 });
    props.hall({ x: 150, z: -8, yaw: 0, width: 12, depth: 8, height: 5, color: 0x8a8070, name: 'weighbridge house' });

    // ---- the shaft works: Wintershall's single shaft (south), Herfa's twin headframes (north)
    const [W, Hf] = SHAFTS.map(([x, z]) => (dx, dz) => ({ x: x + dx, z: z + dz }));
    props.headframe({ ...W(-16, 8), yaw: 0, height: 34 });
    props.hall({ ...W(-16, 24), yaw: 0, width: 16, depth: 11, height: 9, color: 0x7a5a48, name: 'winding house' });
    props.hall({ ...W(22, 2), yaw: Math.PI / 2, width: 34, depth: 18, height: 10, color: 0x8a8478, roof: 0x5a5c5e, door: 12, name: 'processing plant' });
    props.hall({ ...W(18, 30), yaw: 0, width: 18, depth: 10, height: 6, color: 0x7a6a58, name: 'workshop' });
    props.tanks({ ...W(-44, 0), yaw: Math.PI / 2, count: 2, radius: 3, height: 9, color: 0x8a8a84 });
    props.chimney({ ...W(40, 22), height: 28 });
    for (const dx of [-14, 14]) {
      props.headframe({ ...Hf(dx, -6), yaw: Math.PI / 2, height: 28 });
      props.hall({ ...Hf(dx, -22), yaw: Math.PI, width: 12, depth: 9, height: 8, color: 0x7a5a48, name: 'winding house' });
    }
    props.hall({ ...Hf(-6, 20), yaw: 0, width: 36, depth: 14, height: 9, color: 0x868070, roof: 0x5a5c5e, door: 12, name: 'processing plant' });
    props.hall({ ...Hf(34, 4), yaw: Math.PI / 2, width: 16, depth: 10, height: 6, color: 0x7a6a58, name: 'workshop' });
    props.tanks({ ...Hf(-38, -4), yaw: 0, count: 2, radius: 3, height: 8, color: 0x8a8a84 });

    // ---- the potash railway: the main line past both shaft works; the Kalibahnhof's open wagons
    // in the south-east, the Herfa store's box wagons and its shed in the north-west
    for (const rz of [RAIL_S, RAIL_N]) {
      props.rails({ x0: -510, z0: rz, x1: -60, z1: rz });
      props.rails({ x0: 60, z0: rz, x1: 510, z1: rz });
    }
    props.rails({ x0: 285, z0: RAIL_S - 7, x1: 395, z1: RAIL_S - 7 });
    for (const x of [303, 316, 329, 342, 363, 376]) props.wagon({ x, z: RAIL_S - 7, yaw: Math.PI / 2, kind: 'open', color: 0x4a4038 });
    for (const x of [-250, -237]) props.wagon({ x, z: RAIL_S, yaw: Math.PI / 2, kind: 'box' });
    props.hall({ x: 340, z: RAIL_S - 22, yaw: Math.PI, width: 22, depth: 10, height: 6, color: 0x6e5444, name: 'loading shed' });
    props.townHouse({ x: 371, z: RAIL_S - 20, yaw: Math.PI, width: 12, depth: 8, storeys: 2, name: 'station' });
    props.rails({ x0: -400, z0: RAIL_N + 7, x1: -250, z1: RAIL_N + 7 });
    for (const x of [-388, -375, -362, -296, -283]) props.wagon({ x, z: RAIL_N + 7, yaw: Math.PI / 2, kind: 'box', color: 0x5a3426 });
    for (const x of [220, 233, 246]) props.wagon({ x, z: RAIL_N, yaw: Math.PI / 2, kind: 'open', color: 0x4a4038 });
    props.hall({ x: -330, z: RAIL_N + 24, yaw: 0, width: 30, depth: 12, height: 7, color: 0x6a5242, name: 'potash store' });
    props.townHouse({ x: -290, z: RAIL_N + 22, yaw: 0, width: 9, depth: 7, storeys: 2, name: 'signal box' });

    // ---- the miners' towns: Heringen's terraced rows either side of a main street (east–west), the
    // long street of Widdershausen running north–south, each with its church
    const town = (cx, cz, seed, alongZ) => {
      const r = mulberry32(seed);
      for (let row = -1; row <= 1; row += 2) {
        for (let i = 0; i < 6; i++) {
          if (r() < 0.25) continue;
          const a = -40 + i * 14 + (r() - 0.5) * 2;
          const [x, z] = alongZ ? [cx + row * 12, cz + a] : [cx + a, cz + row * 12];
          props.rand = mulberry32(Math.floor(r() * 1e9));
          props.townHouse({ x, z, yaw: alongZ ? (row > 0 ? Math.PI / 2 : -Math.PI / 2) : (row > 0 ? 0 : Math.PI), width: 9, depth: 8, storeys: 2, name: "miners' house" });
        }
      }
      props.church(alongZ ? { x: cx, z: cz - 52, yaw: Math.PI } : { x: cx + 48, z: cz, yaw: Math.PI / 2 });
    };
    town(-340, 160, 5501, false);
    town(368, -150, 5602, true);
    buildVillage(props, points[0], 9600, 1);
    buildVillage(props, points[10], 9711, 1);
    // farm cover on the plain outside the works, as much on each half
    const kinds = ['farm', 'fieldwall', 'hay', 'rocks', 'hay', 'wrecks', 'fieldwall'];
    const sites: any[] = [];
    for (const s of [1, -1]) {
      let n = 0;
      for (let tries = 0; n < 100 && tries < 8000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20);
        const z = s * (20 + rand() * (bounds.z - 30));
        if (yard(x, z) > 0.01 || pileAt(x, z) > 0.01 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 50)) continue;
        if (Math.abs(z - RAIL_S) < 10 || Math.abs(z - RAIL_N) < 10 || sites.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < 28 * 28) || Math.hypot(x, z - s * BASE_Z) < 40 || shaftDist(x, z) < 50) continue;
        sites.push({ x, z, kind: kinds[n++ % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
      }
    }
    for (const q of sites) buildSite(props, q, q.x, q.z, q.yaw);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 24 }, { x: 0, z: -BASE_Z, r: 24 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => yard(x, z) > 0.2 || pileAt(x, z) > 0.05 || Math.abs(z - RAIL_S) < 6 || Math.abs(z - RAIL_N) < 6 || Math.abs(z - SPUR_Z) < 5 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1800, forest: (x, z) => (Math.abs(x) > 460 ? 0.7 : 0.04) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 9000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.6, fields: this.fields });

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
