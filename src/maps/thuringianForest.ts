// Thuringian Forest, November 1985: a spruce-covered ridge on the Rennsteig down the middle of the
// field, cut by the forest road in its valley and the ridge track across it, with open upland
// pastures on both flanks (1.0 × 1.12 km). Inside the trees sight is a few dozen metres (the map's
// `woods` density cuts every spotter's range — systems/VisibilitySystem.js), so armour is tied to
// the roads and the flanks, and infantry, scouts and AT teams decide the forest. The points: the
// forester's lodges at home, the sawmill and the Rennsteig inn in the forest, hamlets, a quarry and
// hunting lodges out on the flanks. NATO holds the south (+z), the Pact comes from the north. The
// hills are point-symmetric by construction.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const FOREST_X = 235;              // the spruce band: |x| below this
const ROADS_X = [-340, 0, 340];    // the forest road in the middle, a lane up each flank
const noise = createNoise2D(1988);

/** A road's line: x of road k at depth z (wiggling along the valley floor). */
const roadX = (rx, z) => rx + Math.sin(z * 0.009 + rx * 0.01) * 16 + Math.sin(z * 0.027) * 5;
/** Distance to the nearest road (the three roads and the Rennsteig track across z ≈ 0). */
function roadDist(x, z) {
  let d = Math.abs(z - Math.sin(x * 0.008) * 12);                // the Rennsteig track
  for (const rx of ROADS_X) d = Math.min(d, Math.abs(x - roadX(rx, z)));
  return d;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Forsthaus Schmücke', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Oberhof', x: -340, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Sägewerk', x: 0, z: 270, owner: null, sector: 'centre' },
  { id: 'D', name: 'Steinbruch', x: 340, z: 280, owner: null, sector: 'east' },
  { id: 'E', name: 'Jagdhütte', x: -330, z: 30, owner: null, sector: 'west' },
  { id: 'F', name: 'Rennsteig', x: 0, z: 0, owner: null, sector: 'centre', radius: 20 },
  { id: 'G', name: 'Kickelhahn', x: 330, z: -30, owner: null, sector: 'east' },
  { id: 'H', name: 'Schleusingen Bruch', x: -340, z: -280, owner: null, sector: 'west' },
  { id: 'I', name: 'Holzplatz', x: 0, z: -270, owner: null, sector: 'centre' },
  { id: 'J', name: 'Frauenwald', x: 340, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Allzunah', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const CLEARING = 42; // metres of open ground around a point

/** 0 in the spruce band, 1 out on the open flanks. */
const flank = (x) => smoothstep(FOREST_X - 25, FOREST_X + 45, Math.abs(x));

function raw(x, z) {
  let h = ridged(noise, x * 0.008 + 3, z * 0.008, 4) * 16 * (1 - flank(x) * 0.8) + fbm(noise, x * 0.004, z * 0.004, 3) * 8;
  h += fbm(noise, x * 0.05 + 40, z * 0.05, 3) * 0.8;
  return h;
}

function height(x, z) {
  let h = (raw(x, z) + raw(-x, -z)) / 2 + 6;          // point-symmetric hills; the flanks roll gently
  h -= smoothstep(30, 6, roadDist(x, z)) * h * 0.45;  // the roads run in the valleys / cuttings
  for (const p of points) {                            // clearings are level-ish
    const k = smoothstep(CLEARING, CLEARING * 0.4, Math.hypot(x - p.x, z - p.z));
    h += (h * 0.6 + 2 - h) * k * 0.7;
  }
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 110, Math.abs(x)) * 10 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 10;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return Math.min(30, h);                              // trees grow up to 32 m above zero
}

/** Copses on the open flanks (0..1), point-symmetric. */
const copse = (x, z) => {
  const [ax, az] = z < 0 || (z === 0 && x < 0) ? [-x, -z] : [x, z];
  return smoothstep(0.5, 0.66, fbm(noise, ax * 0.008 - 17, az * 0.008 + 9, 3));
};

/** Forest density 0..1: the spruce band and the flank copses, but not the roads, the clearings or the bases. */
function woods(x, z) {
  let k = Math.max(1 - flank(x), copse(x, z) * flank(x));
  k = Math.min(k, smoothstep(4, 12, roadDist(x, z)));
  for (const p of points) k = Math.min(k, smoothstep(CLEARING * 0.75, CLEARING * 1.25, Math.hypot(x - p.x, z - p.z)));
  for (const bz of [BASE_Z, -BASE_Z]) k = Math.min(k, smoothstep(26, 40, Math.hypot(x, z - bz)));
  return k;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

export default {
  id: 'thuringian-forest',
  name: 'Thuringian Forest',
  description: 'A spruce ridge down the middle, cut by the forest road and the Rennsteig track, with open upland on both flanks. Inside the woods you see a few dozen metres: armour takes the flanks and the roads, infantry rules the trees.',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1988,
  height,
  woods,

  theme: {
    // cold mist hanging in the spruce
    fogColor: 0x8e9894,
    fogDensity: 0.0024,
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

  bases: { nato: { x: 0, z: BASE_Z, entries: ROADS_X }, pact: { x: 0, z: -BASE_Z, entries: ROADS_X } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });

    mirrored(props, 2201, (m, flip) => {
      const at = (p, dx, dz) => ({ x: (p.x + dx) * m, z: (p.z + dz) * m }); // a spot near point p (mirrored)
      const { A, C, D, E, F } = P;
      // the forester's lodge at each home clearing
      props.townHouse({ ...at(A, 14, 0), yaw: flip, width: 12, depth: 9, storeys: 2, name: "forester's lodge" });
      props.hall({ ...at(A, -16, 8), yaw: Math.PI / 2 + flip, width: 12, depth: 7, height: 4, color: 0x5a4632, name: 'barn' });
      // sawmill: the mill hall, timber yard, log piles
      props.hall({ ...at(C, -12, 2), yaw: Math.PI / 2 + flip, width: 26, depth: 12, height: 6.5, color: 0x5e4a36, roof: 0x3e3a34, door: 10, name: 'sawmill' });
      for (let k = 0; k < 5; k++) props.logPile({ ...at(C, 12 + (k % 2) * 6, -14 + k * 7), yaw: 0.1 * k + flip, length: 9 });
      props.townHouse({ ...at(C, 20, 20), yaw: flip, width: 9, depth: 8, storeys: 2, name: 'mill house' });
      // the quarry: a face of rock, boulders, the crusher shed
      for (let k = 0; k < 9; k++) props.boulder({ ...at(D, -14 + (props.rand() - 0.5) * 40, 14 + (props.rand() - 0.5) * 22), radius: 1.4 + props.rand() * 1.8 });
      props.hall({ ...at(D, 16, -6), yaw: flip, width: 14, depth: 9, height: 6, color: 0x707068, name: 'crusher shed' });
      props.wreckCar({ ...at(D, -2, -14), yaw: 0.6 + flip });
      // the hunting lodge in its copse, a high seat at the clearing's edge
      props.townHouse({ ...at(E, 0, 2), yaw: 0.3 + flip, width: 9, depth: 7, storeys: 1, name: 'hunting lodge' });
      props.highSeat({ ...at(E, -26, 16), yaw: flip });
      props.logPile({ ...at(E, 12, -14), yaw: 1.2 + flip, length: 7 });
      // the inn at the Rennsteig crossroads (one each side of the track)
      props.townHouse({ ...at(F, 12, 12), yaw: flip, width: 14, depth: 9, storeys: 2, name: 'Rennsteig inn' });
      props.lowWall({ ...at(F, -12, 10), yaw: 0, length: 10 });
    });
    // hamlets out on the flanks: Oberhof / Frauenwald and Schleusingen Bruch / Steinbruch's neighbour
    for (const [p, seed] of [[P.B, 9300], [P.H, 9400]] as const) {
      buildVillage(props, p, seed, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }
    // log piles and woodcutters' wrecks along the roads (cover by the roadside)
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 6000; tries++) {
      const rx = ROADS_X[Math.floor(rand() * 3)];
      const z = 20 + rand() * (bounds.z - 60);
      const x = roadX(rx, z) + (rand() < 0.5 ? -1 : 1) * (8 + rand() * 4);
      if (points.some((p) => Math.hypot(p.x - x, p.z - z) < CLEARING + 6) || sites.some((s) => Math.hypot(s.x - x, s.z - z) < 30) || Math.hypot(x, z - BASE_Z) < 40) continue;
      sites.push({ x, z, seed: Math.floor(rand() * 1e9), kind: rx === 0 ? (rand() < 0.6 ? 'logs' : 'wrecks') : ['farm', 'fieldwall', 'hay', 'logs'][Math.floor(rand() * 4)] });
    }
    for (const s of sites) {
      mirrored(props, s.seed, (m, flip) => {
        if (s.kind === 'logs') props.logPile({ x: s.x * m, z: s.z * m, yaw: flip + props.rand() * 0.3, length: 7 + props.rand() * 4 });
        else buildSite(props, { kind: s.kind, seed: s.seed }, s.x * m, s.z * m, flip);
      });
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, { test: (x, z) => roadDist(x, z) < 5 }];
    // the forest itself: spruce, a little beech and birch — dense in the band, copses on the flanks
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 10000, broadleaf: 0.15, autumn: 0.5, forest: (x, z) => woods(x, z) * 0.98 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.4 });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
