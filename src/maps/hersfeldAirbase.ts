// Hersfeld airbase, autumn 1985: a NATO forward airfield on the flat plain of the Fulda valley,
// caught on the first morning of the war. The runway runs east–west through the middle with a
// taxiway along each side; hardened aircraft shelters, the hangars, the control tower, the fire
// station, the fuel depot and the bomb dump are the points, wrecked jets litter the aprons.
// Flat and open: sight lines of hundreds of metres, tank and missile country — cover is the
// concrete itself. Barracks at each end of the base are the home points. NATO holds the south
// (+z), the Pact the north. The big field (1.0 × 1.12 km) shows the whole runway; the barracks
// stand outside the airfield.
// Not a mirror: the runway lies off-centre (its long western overrun), the south side has the
// shelter row, the old hangars, the tower and the fuel depot; the north side its shelters in a
// staggered dispersal loop to the east, the maintenance hangars, the fire station and the bomb
// dump behind its earth banks out west; each taxiway has its own links. Fair by value: both
// halves are equally flat, each has a shelter group, a pair of halls and a works at the same
// distances from its base, and the runway is as far from both barracks.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BARRACKS_Z = 330;
const FENCE_Z = BARRACKS_Z + 40;        // the perimeter fence behind each barracks
const RUNWAY = { x0: -400, x1: 320, z: 16 }; // the runway: its ends and half-width
const RUNWAY_X = (RUNWAY.x0 + RUNWAY.x1) / 2;
const TAXI_Z = 62;                      // taxiways at ±TAXI_Z
const TAXI = 8;                         // taxiway half-width
// each taxiway: its ends and the links to the runway
const TAXIWAYS = [
  { s: 1, x0: -380, x1: 300, links: [-330, -190, -40, 100, 240] },
  { s: -1, x0: -310, x1: 290, links: [-260, -100, 60, 200] },
];
const FIELD = { x0: -430, x1: 380, z: 175 }; // the airfield's flattened, mown area
const noise = createNoise2D(1989);

/** 1 on the airfield proper (level, mown), fading out beyond. */
const airfield = (x, z) => smoothstep(FIELD.x1 + 30, FIELD.x1, x) * smoothstep(FIELD.x0 - 30, FIELD.x0, x) * smoothstep(FIELD.z + 30, FIELD.z, Math.abs(z));

/** Aprons: the hard standing in front of the shelters, halls and buildings, each side its own. */
const APRONS = [
  { x: -150, z: 104, w: 70, d: 28 },  // NATO: the shelter row
  { x: -330, z: 96, w: 50, d: 30 },   // the hangars
  { x: 0, z: 88, w: 30, d: 16 },      // the tower
  { x: 330, z: 98, w: 40, d: 26 },    // the fuel depot
  { x: 175, z: -108, w: 86, d: 36 },  // the Pact's side: the dispersal loop
  { x: 312, z: -100, w: 58, d: 30 },  // the maintenance hangars
  { x: -60, z: -86, w: 34, d: 16 },   // the fire station
  { x: -345, z: -94, w: 40, d: 24 },  // the bomb dump
];
function paved(x, z) {
  if (x > RUNWAY.x0 && x < RUNWAY.x1 && Math.abs(z) < RUNWAY.z) return 1;
  for (const t of TAXIWAYS) {
    if (x > t.x0 && x < t.x1 && Math.abs(z - t.s * TAXI_Z) < TAXI) return 0.95;
    for (const lx of t.links) if (Math.abs(x - lx) < 7 && z * t.s > 0 && z * t.s < TAXI_Z) return 0.95; // links to the runway
  }
  for (const a of APRONS) if (Math.abs(x - a.x) < a.w / 2 && Math.abs(z - a.z) < a.d / 2) return 0.9;
  return 0;
}

/** The dirt roads from each fence's gates back to the base. */
const GATES = { nato: [-140, 0, 140], pact: [-188, 0, 102] };
function track(x, z) {
  let d = 1e9;
  for (const gx of z > 0 ? GATES.nato : GATES.pact) d = Math.min(d, Math.abs(x - gx * smoothstep(BASE_Z, FENCE_Z, Math.abs(z)) + Math.sin(z * 0.04 + gx) * 3));
  return smoothstep(5, 2.5, d) * smoothstep(FENCE_Z - 30, FENCE_Z, Math.abs(z)) * smoothstep(540, 512, Math.abs(z));
}

function height(x, z) {
  let h = fbm(noise, x * 0.005, z * 0.005, 5) * 6 + fbm(noise, x * 0.04 + 9, z * 0.04, 3) * 0.5;
  h += smoothstep(500, 610, Math.abs(x)) * (10 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 18);
  h += smoothstep(560, 670, Math.abs(z)) * 16;
  h += (1.8 - h) * smoothstep(60, 40, Math.abs(Math.abs(z) - BARRACKS_Z)) * smoothstep(80, 55, Math.abs(x)); // the barracks' level ground
  h += (1.8 - h) * airfield(x, z);                     // the airfield is dead level
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.8 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

// each at its own building, at matching distances from the two bases (tools/map_fairness.py)
const points: ControlPointDef[] = [
  { id: 'A', name: 'South barracks', x: 0, z: BARRACKS_Z + 10, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Hangars', x: -330, z: 110, owner: null, sector: 'west' },
  { id: 'C', name: 'Control tower', x: 0, z: 96, owner: null, sector: 'centre' },
  { id: 'D', name: 'Fuel depot', x: 330, z: 110, owner: null, sector: 'east' },
  { id: 'E', name: 'Shelters west', x: -150, z: 120, owner: null, sector: 'west' },
  { id: 'F', name: 'Runway', x: RUNWAY_X, z: 0, owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Shelters east', x: 172, z: -126, owner: null, sector: 'east' },
  { id: 'H', name: 'Bomb dump', x: -345, z: -100, owner: null, sector: 'west' },
  { id: 'I', name: 'Fire station', x: -60, z: -92, owner: null, sector: 'centre' },
  { id: 'J', name: 'Maintenance hangars', x: 312, z: -116, owner: null, sector: 'east' },
  { id: 'K', name: 'North barracks', x: 0, z: -(BARRACKS_Z + 10), owner: 'pact', sector: 'centre' },
];

export default {
  id: 'hersfeld-airbase',
  armies: { 1945: { nato: ['us'], pact: ['wh', 'fj'] } }, // (spring 1945 in Hesse and Thuringia: the US Army against the Wehrmacht and the last Fallschirmjäger — maps/index.js armiesOn)
  name: 'Hersfeld Airbase',
  description: 'A forward airfield on the open plain: the runway, aircraft shelters, hangars and the tower. Long sight lines — tank and missile country, the concrete is the only cover.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1989,
  height,
  fields: createFields({ seed: 1989, cell: 80 }),

  theme: {
    // clear, cold, a low sun — the long view
    fogColor: 0xb0b6b8,
    fogDensity: 0.0018,
    skyTop: 0x5a7088,
    skyHorizon: 0xc0c6c4,
    skyBottom: 0x747a78,
    sunColor: 0xf2e4c6,
    sunIntensity: 2,
    sunDisk: 0.4,
    clouds: 0.45,
    cloudLight: 0xd8dad6,
    cloudDark: 0x8a9096,
    sunDir: [-0.55, 0.42, 0.7],
    hemiSky: 0xc6d0d8,
    hemiGround: 0x4c483a,
    hemiIntensity: 1.2,
    rimColor: 0xc0c8d0,
    rimIntensity: 0.3,
    terrain: {
      grass: '#5a663c',
      grassAlt: '#52603a',
      dryGrass: '#8a7c52',
      dirt: '#564838',
      rock: '#6a6862',
      pasture: '#5a663c',
      ploughed: '#4b3c2e',
      stubble: '#8c7c4e',
      meadow: '#62703e',
      farmX: [520, 600],
      farmZ: [580, 660],
      roads: [],             // (the map's own: track() below)
      surface(x, z) {
        const p = paved(x, z);
        if (p > 0) return [Math.abs(z) < RUNWAY.z ? 0x4a4a48 : 0x58585a, p];   // runway asphalt, concrete
        const a = airfield(x, z);
        if (a > 0) return [0x5e6a3e, a * 0.6];                                  // mown grass
        const r = track(x, z);
        return r > 0 ? [0x564838, r * 0.6] : null;                              // dirt roads
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: GATES.nato }, pact: { x: 0, z: -BASE_Z, entries: GATES.pact } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const g = (x, z) => terrain.heightAt(x, z);
    props.rand = mulberry32(3301);

    // runway markings: the centre line, threshold bars at both ends, the edge lines (thin paint)
    for (let x = RUNWAY.x0 + 30; x < RUNWAY.x1 - 30; x += 24) props.box('stone', x, g(x, 0) + 0.03, 0, 12, 0.06, 0.6, 0, 0xd8d8d0);
    for (const ex of [RUNWAY.x0 + 10, RUNWAY.x1 - 10]) {
      for (let k = -5; k <= 5; k++) props.box('stone', ex, g(ex, k * 2.6) + 0.03, k * 2.6, 14, 0.06, 1.4, 0, 0xd8d8d0);
    }
    for (const z of [-RUNWAY.z + 1.2, RUNWAY.z - 1.2]) props.box('stone', RUNWAY_X, g(RUNWAY_X, z) + 0.03, z, RUNWAY.x1 - RUNWAY.x0 - 10, 0.05, 0.4, 0, 0xc8c8c0);

    // ---- the south side (NATO's)
    // the shelter row facing the taxiway, wrecked jets on the apron, blast walls
    for (const x of [-190, -150, -110]) props.aircraftShelter({ x, z: 132, yaw: Math.PI });
    props.aircraftWreck({ x: -162, z: 98, yaw: 1.2 });
    props.aircraftWreck({ x: -120, z: 94, yaw: -0.6, scale: 0.9 });
    for (const x of [-178, -138]) props.jersey({ x, z: 112, yaw: 0, length: 9 });
    // the old hangars
    props.hall({ x: -347, z: 116, yaw: Math.PI, width: 34, depth: 26, height: 11, color: 0x6e726e, roof: 0x55585a, door: 26, name: 'hangar' });
    props.hall({ x: -307, z: 120, yaw: Math.PI, width: 26, depth: 20, height: 9, color: 0x6a6e6a, roof: 0x55585a, door: 18, name: 'hangar' });
    props.aircraftWreck({ x: -330, z: 88, yaw: 2.6 });
    // the control tower and the operations building beside it
    props.controlTower({ x: 0, z: 106, yaw: Math.PI });
    props.townHouse({ x: 30, z: 110, yaw: Math.PI, width: 16, depth: 9, storeys: 2, name: 'operations building', damaged: 0.1 });
    props.wreckCar({ x: -18, z: 92, yaw: 0.3 });
    // the fuel depot: tanks behind an earth bank, the pump house
    props.tanks({ x: 337, z: 116, yaw: 0, count: 3, radius: 4.2, height: 7 });
    props.tanks({ x: 337, z: 132, yaw: 0, count: 2, radius: 3, height: 5, color: 0x7a8070 });
    for (const x of [-25, 39]) props.lowWall({ x: 330 + x, z: 112, yaw: Math.PI / 2, length: 30, height: 1.6 });
    props.hall({ x: 311, z: 92, yaw: 0, width: 12, depth: 8, height: 4.5, color: 0x8a8070, name: 'pump house' });

    // ---- the north side (the Pact's)
    // the dispersal loop: three shelters staggered round the apron, each its own way to the taxiway
    for (const [x, z, yaw] of [[136, -124, 0.35], [178, -140, 0], [218, -122, -0.4]]) props.aircraftShelter({ x, z, yaw });
    props.aircraftWreck({ x: 160, z: -100, yaw: 4.1 });
    props.aircraftWreck({ x: 205, z: -96, yaw: 2.2, scale: 0.85 });
    props.jersey({ x: 156, z: -112, yaw: 0.5, length: 9 });
    props.jersey({ x: 198, z: -114, yaw: -0.3, length: 9 });
    // the maintenance hangars: one big, one small, a jet half out of the big one
    props.hall({ x: 298, z: -128, yaw: 0, width: 38, depth: 24, height: 11, color: 0x6a6e6c, roof: 0x55585a, door: 28, name: 'maintenance hangar' });
    props.hall({ x: 344, z: -122, yaw: 0, width: 20, depth: 16, height: 8, color: 0x72746e, roof: 0x55585a, door: 14, name: 'maintenance hangar' });
    props.aircraftWreck({ x: 300, z: -102, yaw: 0.1 });
    // the fire station: the engine hall, the hose tower, a crash tender burnt out on the apron
    props.hall({ x: -60, z: -108, yaw: 0, width: 24, depth: 12, height: 6, color: 0x8a7a70, door: 16, name: 'fire station' });
    props.tower({ x: -80, z: -116, concrete: true });
    props.wreckCar({ x: -46, z: -86, yaw: 2.4 });
    props.wreckCar({ x: -70, z: -84, yaw: 0.2 });
    // the bomb dump: storage bays behind high earth banks, crates of ordnance, the fuzing shed
    for (const x of [-366, -345, -324]) {
      props.lowWall({ x: x - 8, z: -110, yaw: Math.PI / 2, length: 14, height: 2.2, color: 0x6a6450 });
      props.crates({ x, z: -112, yaw: 0.3 });
    }
    props.lowWall({ x: -337, z: -120, yaw: 0, length: 44, height: 2.2, color: 0x6a6450 });
    props.hall({ x: -372, z: -86, yaw: Math.PI / 2, width: 12, depth: 8, height: 4.5, color: 0x8a8070, name: 'fuzing shed' });
    props.hall({ x: -322, z: -134, yaw: 0, width: 22, depth: 10, height: 4.5, color: 0x6e6a5a, roof: 0x4e5a44, name: 'bomb store' });

    // runway debris: wrecks and the odd barrier dragged out
    props.aircraftWreck({ x: 0, z: 6, yaw: 1.62 });
    props.aircraftWreck({ x: -122, z: -7, yaw: 4.3, scale: 0.9 });
    props.wreckCar({ x: -64, z: 10, yaw: 0.7 });
    props.wreckCar({ x: 62, z: -9, yaw: 3.6 });
    props.jersey({ x: -26, z: 22, yaw: 0.1, length: 9 });
    props.jersey({ x: 96, z: -21, yaw: 3.0, length: 9 });

    // the barracks at each home end: NATO's three blocks in a row, the Pact's round a parade ground
    for (const x of [-34, 0, 34]) props.townHouse({ x, z: BARRACKS_Z, yaw: 0, width: 24, depth: 10, storeys: 2, name: 'barracks' });
    props.tower({ x: 60, z: BARRACKS_Z + 44, concrete: true });
    props.fence({ x0: FIELD.x0 + 40, x1: FIELD.x1, z: FENCE_Z, breaches: GATES.nato.map((x) => [x - 12, x + 12]) });
    for (const x of [-30, 30]) props.townHouse({ x, z: -BARRACKS_Z + 4, yaw: Math.PI / 2 * Math.sign(x), width: 24, depth: 10, storeys: 2, name: 'barracks' });
    props.townHouse({ x: 0, z: -BARRACKS_Z - 22, yaw: Math.PI, width: 26, depth: 10, storeys: 2, name: 'barracks' });
    props.tower({ x: -62, z: -FENCE_Z - 4, concrete: true });
    props.fence({ x0: FIELD.x0, x1: FIELD.x1 - 40, z: -FENCE_Z, breaches: GATES.pact.map((x) => [x - 12, x + 12]) });

    // farm cover beyond the fences, as much on each side, each laid out on its own
    const kinds = ['farm', 'fieldwall', 'hay', 'rocks', 'hay', 'wrecks'];
    const sites: any[] = [];
    for (const s of [1, -1]) {
      let n = 0;
      for (let tries = 0; n < 80 && tries < 8000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20);
        const z = s * (30 + rand() * (bounds.z - 40));
        if (airfield(x, z) > 0.2 || sites.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < 26 * 26) || (Math.abs(Math.abs(z) - BARRACKS_Z) < 40 && Math.abs(x) < 70) || Math.abs(Math.abs(z) - FENCE_Z) < 6 || Math.hypot(x, z - s * BASE_Z) < 40 || track(x, z) > 0) continue;
        sites.push({ x, z, kind: kinds[n++ % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
      }
    }
    for (const q of sites) buildSite(props, q, q.x, q.z, q.yaw);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 24 }, { x: 0, z: -BASE_Z, r: 24 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => paved(x, z) > 0 || track(x, z) > 0.2 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1400, forest: (x, z) => (airfield(x, z) > 0.1 ? -1 : Math.abs(x) > 460 ? 0.6 : 0.03) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => airfield(x, z) > 0.05 }], count: 6000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3.2, fields: this.fields });

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
