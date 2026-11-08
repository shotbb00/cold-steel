// El Alamein, the Western Desert (1945 only; the big field, 1.0 × 1.12 km): a tank battle. Open,
// rolling desert with long sight lines; two low ridges across the field (the Ruweisat and the
// Miteiriya: hull-down for whoever holds the crest), Tel el Eisa in the middle, the railway with
// the little station, a palm oasis with its village and the white mosque of Sidi Abd el Rahman.
// Wadis cut the ground, burnt-out vehicles and old fighting positions dot it. The Allies come in
// from the south (+z), the Afrika Korps from the north; point-mirrored like the other maps.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const EDGE_X = 300;
const RIDGE_Z = 205;    // the two ridges across the field, at z = ±RIDGE_Z
const RAIL_Z = 84;
const noise = createNoise2D(1942);
// the built-up spots, levelled: the oasis / the depot, Sidi Abd el Rahman / the station (point-mirrored pairs)
const FLAT = [[-300, 120, 66], [300, -122, 46], [-300, -70, 66], [300, 62, 46]];

const onRail = (x, z) => (x > -490 && x < 490 && Math.abs(Math.abs(z) - RAIL_Z) < 4 && Math.sign(z) === Math.sign(x || 1));

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.004, z * 0.004, 4) * 5;                                       // the long swell of the desert
  h += ridged(noise, x * 0.018 + 11, z * 0.03, 3) * 1.6;                                // dune ripples, across the wind
  h += 9 * Math.exp(-(((az - RIDGE_Z) / 38) ** 2)) * (0.75 + 0.25 * Math.sin(x * 0.012)); // the ridges, gently up and down along their crests
  h += 11 * Math.max(0, 1 - Math.hypot(x, z * 1.3) / 70) ** 1.6;                       // Tel el Eisa
  h -= 3.5 * smoothstep(14, 0, Math.abs(z - Math.sin(x * 0.008) * 60 - 300)) * smoothstep(80, 200, ax); // a wadi each side, mirrored below
  h -= 3.5 * smoothstep(14, 0, Math.abs(z + Math.sin(-x * 0.008) * 60 + 300)) * smoothstep(80, 200, ax);
  h += smoothstep(500, 620, ax) * 18 + smoothstep(560, 680, az) * 12;                   // the escarpment beyond the edges
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  for (const [fx, fz, fr] of FLAT) h += (2 - h) * smoothstep(fr, fr - 22, Math.hypot(x - fx, z - fz)); // level ground under the buildings
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Alam Halfa', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Oasis', x: -EDGE_X, z: 120, owner: null, sector: 'west' },
  { id: 'C', name: 'Ruweisat Ridge', x: 0, z: RIDGE_Z, owner: null, sector: 'centre' },
  { id: 'D', name: 'El Alamein station', x: EDGE_X, z: 70, owner: null, sector: 'east' },
  { id: 'E', name: 'Deir el Shein', x: -150, z: 30, owner: null, sector: 'west' },
  { id: 'F', name: 'Tel el Eisa', x: 0, z: 0, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Point 29', x: 150, z: -30, owner: null, sector: 'east' },
  { id: 'H', name: 'Sidi Abd el Rahman', x: -EDGE_X, z: -70, owner: null, sector: 'west' },
  { id: 'I', name: 'Miteiriya Ridge', x: 0, z: -RIDGE_Z, owner: null, sector: 'centre' },
  { id: 'J', name: 'Kidney Ridge', x: EDGE_X, z: -120, owner: null, sector: 'east' },
  { id: 'K', name: 'Tel el Aqqaqir', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'el-alamein',
  name: 'El Alamein',
  description: 'The Western Desert: open ground and long sight lines, two ridges for hull-down tanks, an oasis village, the station and the mosque. A tank battle.',
  epochs: ['1945'],
  climate: 'desert',   // sand paint and khaki drill (render/paint.js CLIMATE)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1943,
  height,
  fields: createFields({ seed: 1943, cell: 80 }),

  theme: {
    // a hot, hazy afternoon: a white sky low down, hard light
    fogColor: 0xdccbaa,
    fogDensity: 0.0007,
    skyTop: 0x7da2c8,
    skyHorizon: 0xe6dcc4,
    skyBottom: 0xb8a888,
    sunColor: 0xfff0d4,
    sunIntensity: 2.3,
    sunDisk: 0.9,
    clouds: 0.15,
    cloudLight: 0xf4efe4,
    cloudDark: 0xc8bfae,
    sunDir: [0.35, 0.8, 0.45],
    hemiSky: 0xd8dde4,
    hemiGround: 0xa08860,
    hemiIntensity: 1.2,
    rimColor: 0xf0e0c0,
    rimIntensity: 0.3,
    terrain: {
      grass: '#d8b880',
      grassAlt: '#ccaa70',
      dryGrass: '#e2c690',
      dirt: '#b08a5c',
      rock: '#9a7e5a',
      pasture: '#d4b47c',
      ploughed: '#c8a46c',
      stubble: '#dcbe86',
      meadow: '#d0b078',
      farmX: [0, 1],     // no farmland
      farmZ: [0, 1],
      roads: [-130, 0, 130],
      roadZ: 540,
      surface(x, z) {
        if (onRail(x, z)) return [0x6a5a48, 0.9];                                 // ballast
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.25 ? [0xb89a6a, Math.min(0.45, (scrub - 0.25) * 2)] : null; // gravel patches between the dunes
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0 })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1943);
    const near = (x, z, d) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

    // ---- the oasis (south-west) / Sidi Abd el Rahman with its mosque (north-west): villages of flat-roofed houses
    const village = (cx, cz, n, seed, mosque) => {
      const vr = mulberry32(seed);
      if (mosque) props.flatHouse({ x: cx, z: cz - 12, yaw: 0, width: 12, depth: 10, name: 'mosque', dome: true });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + vr() * 0.5;
        const d = 18 + vr() * 16;
        const x = cx + Math.cos(a) * d;
        const z = cz + Math.sin(a) * d;
        props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + vr() * 4, depth: 6 + vr() * 3, storeys: vr() < 0.25 ? 2 : 1 });
        if (vr() < 0.6) props.lowWall({ x: x + 5, z: z + 4, yaw: vr() < 0.5 ? 0 : Math.PI / 2, length: 6 + vr() * 6, height: 1.6, color: 0xc4a87a });
      }
    };
    village(-EDGE_X, 120, 8, 31, false);
    village(-EDGE_X, -70, 8, 32, true);
    for (let i = 0; i < 26; i++) { // the oasis palms and the well
      const a = r() * Math.PI * 2;
      const d = 30 + r() * 26;
      props.palm({ x: -EDGE_X + Math.cos(a) * d, z: 120 + Math.sin(a) * d, height: 7 + r() * 4 });
    }
    props.column({ x: -EDGE_X + 4, z: 124, radius: 1.4, height: 0.9 });
    // the station (east) and its twin across the field: Kidney Ridge's dugouts (a hall: a supply depot)
    props.flatHouse({ x: EDGE_X, z: 58, yaw: Math.PI, width: 18, depth: 9, storeys: 2, name: 'railway station' });
    props.flatHouse({ x: EDGE_X + 24, z: 60, yaw: Math.PI, width: 9, depth: 7, name: 'goods office' });
    props.rails({ x0: 0, z0: RAIL_Z, x1: 500, z1: RAIL_Z });
    props.rails({ x0: -500, z0: -RAIL_Z, x1: 0, z1: -RAIL_Z });
    for (const [x, kind, c] of [[250, 'box', 0x8a6a48], [262, 'tank', 0x3a3a34], [360, 'open', 0x7a6248]] as [number, string, number][]) {
      props.wagon({ x, z: RAIL_Z, yaw: Math.PI / 2, kind, color: c });
      props.wagon({ x: -x, z: -RAIL_Z, yaw: Math.PI / 2, kind, color: c });
    }
    props.hall({ x: EDGE_X, z: -132, yaw: 0, width: 24, depth: 12, height: 5, color: 0xb09a74, roof: 0x8a7a5a, name: 'supply depot' });
    props.tanks({ x: EDGE_X + 30, z: -110, yaw: Math.PI / 2, count: 2, radius: 3, height: 5, color: 0xb4a888 });
    for (let k = 0; k < 6; k++) props.crates({ x: EDGE_X - 20 + k * 4, z: -116, yaw: k });
    // Deir el Shein / Point 29: old fighting positions on the low ground
    mirrored(props, 290, (m) => {
      for (let k = 0; k < 3; k++) props.sandbagRing({ x: (-150 + (k - 1) * 22) * m, z: (30 + (k % 2) * 14) * m, radius: 5, toward: m });
      props.tent({ x: -170 * m, z: 50 * m, yaw: 0.3, color: 0xb8a078 });
    });
    // Tel el Eisa: positions on the crest
    mirrored(props, 291, (m) => {
      props.sandbagRing({ x: -24 * m, z: 14 * m, radius: 6, toward: m });
      props.sandbagRing({ x: 26 * m, z: 16 * m, radius: 6, toward: m });
    });

    // ---- the desert: burnt-out vehicles, old positions, boulders and scrub on the ridges, mirrored
    for (let i = 0; i < 90; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 30);
      const z = 20 + r() * (BASE_Z - 70);
      if (near(x, z, 45) || onRail(x, z) || Math.hypot(x - -EDGE_X, z - 120) < 70 || Math.abs(x) < 20) continue;
      const seed = Math.floor(r() * 1e9);
      const kind = r();
      mirrored(props, seed, (m, flip) => {
        if (kind < 0.25) props.wreckCar({ x: x * m, z: z * m, yaw: props.rand() * 3 + flip });
        else if (kind < 0.4) props.aircraftWreck({ x: x * m, z: z * m, yaw: props.rand() * 6, scale: 0.6 });
        else if (kind < 0.6) props.sandbagRing({ x: x * m, z: z * m, radius: 4 + props.rand() * 2, toward: m });
        else if (kind < 0.75) props.lowWall({ x: x * m, z: z * m, yaw: props.rand() * 3, length: 6 + props.rand() * 8, height: 1.1, color: 0xb49a70 }); // a stone sangar
        else for (let k = 0; k < 3; k++) props.boulder({ x: x * m + (props.rand() - 0.5) * 8, z: z * m + (props.rand() - 0.5) * 8, radius: 0.8 + props.rand() * 1.4 });
      });
    }
    const sites: any[] = [];
    for (let tries = 0; sites.length < 30 && tries < 4000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 30 + rand() * (bounds.z - 40);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 40 * 40) || near(x, z, 50) || Math.hypot(x, z - BASE_Z) < 40) continue;
      sites.push({ x, z, kind: r() < 0.5 ? 'rocks' : 'wrecks', yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0xb8a078);
    commandPost(props, this.bases.pact, 1, 0xa89870);
    props.finish();
    cover.finalize(bounds);
    // camel-thorn scrub, thin
    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })), { test: (x, z) => onRail(x, z) }];
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.35, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) { ground.update(dt, t); },
    };
  },
} satisfies MapDef;
