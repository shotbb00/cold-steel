// Thuringian Forest, November 1985: steep spruce-covered hills on the Rennsteig, cut by three
// forest roads in the valleys and a ridge track across the middle. The trees are the map: inside
// them sight is a few dozen metres (the map's `woods` density cuts every spotter's range —
// systems/VisibilitySystem.js), so armour is tied to the roads and clearings, and infantry,
// scouts and AT teams decide it. The points are the clearings: a forester's lodge, the sawmill,
// hamlets, a quarry, hunting lodges and the Rennsteig crossroads with its inn. NATO holds the
// south (+z), the Pact comes from the north. The hills are point-symmetric by construction.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 280;
const ROADS_X = [-210, 0, 210];
const noise = createNoise2D(1988);

/** A forest road's line: x of road k at depth z (wiggling along the valley floor). */
const roadX = (rx, z) => rx + Math.sin(z * 0.012 + rx * 0.01) * 14 + Math.sin(z * 0.031) * 5;
/** Distance to the nearest road (the three valley roads and the ridge track across z ≈ 0). */
function roadDist(x, z) {
  let d = Math.abs(z - Math.sin(x * 0.01) * 10);                 // the Rennsteig track
  for (const rx of ROADS_X) d = Math.min(d, Math.abs(x - roadX(rx, z)));
  return d;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Forsthaus Schmücke', x: 0, z: 236, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Oberhof', x: -210, z: 120, owner: null, sector: 'west' },
  { id: 'C', name: 'Sägewerk', x: 0, z: 112, owner: null, sector: 'centre' },
  { id: 'D', name: 'Steinbruch', x: 210, z: 110, owner: null, sector: 'east' },
  { id: 'E', name: 'Jagdhütte', x: -110, z: 28, owner: null, sector: 'west' },
  { id: 'F', name: 'Rennsteig', x: 0, z: 0, owner: null, sector: 'centre', radius: 18 },
  { id: 'G', name: 'Kickelhahn', x: 110, z: -28, owner: null, sector: 'east' },
  { id: 'H', name: 'Schleusingen Bruch', x: -210, z: -110, owner: null, sector: 'west' },
  { id: 'I', name: 'Holzplatz', x: 0, z: -112, owner: null, sector: 'centre' },
  { id: 'J', name: 'Frauenwald', x: 210, z: -120, owner: null, sector: 'east' },
  { id: 'K', name: 'Allzunah', x: 0, z: -236, owner: 'pact', sector: 'centre' },
];
const CLEARING = 42; // metres of open ground around a point

function raw(x, z) {
  let h = ridged(noise, x * 0.008 + 3, z * 0.008, 4) * 16 + fbm(noise, x * 0.004, z * 0.004, 3) * 8;
  h += fbm(noise, x * 0.05 + 40, z * 0.05, 3) * 0.8;
  return h;
}

function height(x, z) {
  let h = (raw(x, z) + raw(-x, -z)) / 2 + 6;          // point-symmetric hills
  h -= smoothstep(30, 6, roadDist(x, z)) * h * 0.45;  // the roads run in the valleys / cuttings
  for (const p of points) {                            // clearings are level-ish
    const k = smoothstep(CLEARING, CLEARING * 0.4, Math.hypot(x - p.x, z - p.z));
    h += (h * 0.6 + 2 - h) * k * 0.7;
  }
  h += smoothstep(320, 430, Math.abs(x)) * 8 + smoothstep(330, 440, Math.abs(z)) * 8;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return Math.min(30, h);                              // trees grow up to 32 m above zero
}

/** Forest density 0..1: everywhere but the roads, the clearings and the bases. */
function woods(x, z) {
  let k = smoothstep(4, 12, roadDist(x, z));
  for (const p of points) k = Math.min(k, smoothstep(CLEARING * 0.75, CLEARING * 1.25, Math.hypot(x - p.x, z - p.z)));
  for (const bz of [BASE_Z, -BASE_Z]) k = Math.min(k, smoothstep(26, 40, Math.hypot(x, z - bz)));
  return k;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

export default {
  id: 'thuringian-forest',
  name: 'Thuringian Forest',
  description: 'Spruce hills cut by three valley roads. Inside the woods you see a few dozen metres: armour keeps to the roads and clearings, infantry rules the trees.',
  size: 1000,
  segments: 600,
  bounds: { x: 300, z: 310 },
  seed: 1988,
  height,
  woods,

  theme: {
    // cold mist hanging in the spruce
    fogColor: 0x8e9894,
    fogDensity: 0.0036,
    skyTop: 0x5e686e,
    skyHorizon: 0xa8aeaa,
    skyBottom: 0x5e625e,
    sunColor: 0xdcdacc,
    sunIntensity: 1.35,
    sunDisk: 0.06,
    clouds: 0.9,
    cloudLight: 0xbcc0bc,
    cloudDark: 0x6c7276,
    sunDir: [0.35, 0.5, -0.8],
    hemiSky: 0xb6c2c4,
    hemiGround: 0x3e3e30,
    hemiIntensity: 1.3,
    rimColor: 0xb0bac0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#465232',
      grassAlt: '#3e4a2c',
      dryGrass: '#6e5e40',
      dirt: '#4e4034',
      rock: '#625e58',
      roads: [],
      surface(x, z) {
        const r = smoothstep(5, 2.5, roadDist(x, z));
        if (r > 0) return [0x5a4c3c, r * 0.85];                           // gravel forest road
        const w = woods(x, z);
        return w > 0 ? [0x3e3624, w * 0.55] : null;                         // needles under the spruce
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-210, 0, 210] }, pact: { x: 0, z: -BASE_Z, entries: [-210, 0, 210] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 190 }, pact: { x: 0, z: -190 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });

    mirrored(props, 2201, (m, flip) => {
      // the forester's lodge at each home clearing
      props.townHouse({ x: 14 * m, z: 236 * m, yaw: flip, width: 12, depth: 9, storeys: 2, name: "forester's lodge" });
      props.hall({ x: -16 * m, z: 244 * m, yaw: Math.PI / 2 + flip, width: 12, depth: 7, height: 4, color: 0x5a4632, name: 'barn' });
      // sawmill: the mill hall, timber yard, log piles
      props.hall({ x: -12 * m, z: 114 * m, yaw: Math.PI / 2 + flip, width: 26, depth: 12, height: 6.5, color: 0x5e4a36, roof: 0x3e3a34, door: 10, name: 'sawmill' });
      for (let k = 0; k < 5; k++) props.logPile({ x: (12 + (k % 2) * 6) * m, z: (98 + k * 7) * m, yaw: 0.1 * k + flip, length: 9 });
      props.townHouse({ x: 20 * m, z: 132 * m, yaw: flip, width: 9, depth: 8, storeys: 2, name: 'mill house' });
      // the quarry: a face of rock, boulders, the crusher shed
      for (let k = 0; k < 9; k++) props.boulder({ x: (196 + (props.rand() - 0.5) * 40) * m, z: (124 + (props.rand() - 0.5) * 22) * m, radius: 1.4 + props.rand() * 1.8 });
      props.hall({ x: 226 * m, z: 104 * m, yaw: flip, width: 14, depth: 9, height: 6, color: 0x707068, name: 'crusher shed' });
      props.wreckCar({ x: 208 * m, z: 96 * m, yaw: 0.6 + flip });
      // the hunting lodge on its hill, a high seat at the clearing's edge
      props.townHouse({ x: -110 * m, z: 30 * m, yaw: 0.3 + flip, width: 9, depth: 7, storeys: 1, name: 'hunting lodge' });
      props.highSeat({ x: -136 * m, z: 44 * m, yaw: flip });
      props.logPile({ x: -98 * m, z: 14 * m, yaw: 1.2 + flip, length: 7 });
      // the inn at the Rennsteig crossroads (one each side of the track)
      props.townHouse({ x: 12 * m, z: 12 * m, yaw: flip, width: 14, depth: 9, storeys: 2, name: 'Rennsteig inn' });
      props.lowWall({ x: -12 * m, z: 10 * m, yaw: 0, length: 10 });
    });
    // hamlets at Oberhof / Frauenwald and Schleusingen / Allzunah's neighbours
    for (const p of [points[1]]) {
      buildVillage(props, p, 9300, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, 9300, -1);
    }
    for (const p of [points[7]]) {
      buildVillage(props, p, 9400, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, 9400, -1);
    }
    // log piles and woodcutters' wrecks along the roads (cover by the roadside)
    const sites: any[] = [];
    for (let tries = 0; sites.length < 30 && tries < 4000; tries++) {
      const rx = ROADS_X[Math.floor(rand() * 3)];
      const z = 20 + rand() * 250;
      const x = roadX(rx, z) + (rand() < 0.5 ? -1 : 1) * (8 + rand() * 4);
      if (points.some((p) => Math.hypot(p.x - x, p.z - z) < CLEARING + 6) || sites.some((s) => Math.hypot(s.x - x, s.z - z) < 30)) continue;
      sites.push({ x, z, seed: Math.floor(rand() * 1e9), kind: rand() < 0.6 ? 'logs' : 'wrecks' });
    }
    for (const s of sites) {
      mirrored(props, s.seed, (m, flip) => {
        if (s.kind === 'logs') props.logPile({ x: s.x * m, z: s.z * m, yaw: flip + props.rand() * 0.3, length: 7 + props.rand() * 4 });
        else buildSite(props, { kind: 'wrecks', seed: s.seed }, s.x * m, s.z * m, flip);
      });
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, { test: (x, z) => roadDist(x, z) < 5 }];
    // the forest itself: spruce, a little beech and birch
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 7000, broadleaf: 0.15, autumn: 0.5, forest: (x, z) => woods(x, z) * 0.98 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3 });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
