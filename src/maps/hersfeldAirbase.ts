// Hersfeld airbase, autumn 1985: a NATO forward airfield on the flat plain of the Fulda valley,
// caught on the first morning of the war. The runway runs east–west through the middle with a
// taxiway along each side; hardened aircraft shelters, the hangars, the control tower, the fire
// station, the fuel depot and the bomb dump are the points, wrecked jets litter the aprons.
// Flat and open: sight lines of hundreds of metres, tank and missile country — cover is the
// concrete itself. Barracks at each end of the base are the home points. NATO holds the south
// (+z), the Pact the north. Point-mirrored.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { smoothstep } from '../core/math.js';
import { buildSite, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 285;
const RUNWAY = { x: 360, z: 16 };      // half-extents
const TAXI_Z = 62;                      // taxiways at ±TAXI_Z
const TAXI = 8;                         // taxiway half-width
const FIELD_X = 390;                    // the airfield's flattened, mown area
const FIELD_Z = 175;
const noise = createNoise2D(1989);

/** 1 on the airfield proper (level, mown), fading out beyond. */
const airfield = (x, z) => smoothstep(FIELD_X + 30, FIELD_X, Math.abs(x)) * smoothstep(FIELD_Z + 30, FIELD_Z, Math.abs(z));

/** Aprons: the hard standing in front of the shelters, hangars and tower (our half; mirrored). */
const APRONS = [
  { x: -100, z: 104, w: 60, d: 28 },    // shelters
  { x: -215, z: 96, w: 50, d: 30 },     // hangars
  { x: 0, z: 88, w: 30, d: 16 },        // tower
  { x: 215, z: 98, w: 40, d: 26 },      // fuel depot
];
function paved(x, z) {
  if (Math.abs(x) < RUNWAY.x && Math.abs(z) < RUNWAY.z) return 1;
  if (Math.abs(x) < RUNWAY.x - 20 && Math.abs(Math.abs(z) - TAXI_Z) < TAXI) return 0.95;
  // links from the runway to the taxiways
  for (const lx of [-280, -140, 0, 140, 280]) if (Math.abs(x - lx) < 7 && Math.abs(z) < TAXI_Z) return 0.95;
  for (const a of APRONS) {
    for (const s of [1, -1]) {
      if (Math.abs(x - a.x * s) < a.w / 2 && Math.abs(z - a.z * s) < a.d / 2) return 0.9;
    }
  }
  return 0;
}

function height(x, z) {
  let h = fbm(noise, x * 0.005, z * 0.005, 5) * 6 + fbm(noise, x * 0.04 + 9, z * 0.04, 3) * 0.5;
  h += smoothstep(320, 420, Math.abs(x)) * (10 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 18);
  h += smoothstep(330, 440, Math.abs(z)) * 16;
  h += (1.8 - h) * airfield(x, z);                     // the airfield is dead level
  for (const bz of [BASE_Z, -BASE_Z]) h += (1.8 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const pactName = { '1st Platoon': '1-ya Rota' };

const points: ControlPointDef[] = [
  { id: 'A', name: 'South barracks', x: 0, z: 232, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Hangars', x: -215, z: 110, owner: null, sector: 'west' },
  { id: 'C', name: 'Control tower', x: 0, z: 96, owner: null, sector: 'centre' },
  { id: 'D', name: 'Fuel depot', x: 215, z: 110, owner: null, sector: 'east' },
  { id: 'E', name: 'Shelters west', x: -100, z: 120, owner: null, sector: 'west' },
  { id: 'F', name: 'Runway', x: 0, z: 0, owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Shelters east', x: 100, z: -120, owner: null, sector: 'east' },
  { id: 'H', name: 'Bomb dump', x: -215, z: -110, owner: null, sector: 'west' },
  { id: 'I', name: 'Fire station', x: 0, z: -96, owner: null, sector: 'centre' },
  { id: 'J', name: 'Maintenance hangars', x: 215, z: -110, owner: null, sector: 'east' },
  { id: 'K', name: 'North barracks', x: 0, z: -232, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'hersfeld-airbase',
  name: 'Hersfeld Airbase',
  description: 'A forward airfield on the open plain: the runway, aircraft shelters, hangars and the tower. Long sight lines — tank and missile country, the concrete is the only cover.',
  size: 1000,
  segments: 600,
  bounds: { x: 300, z: 310 },
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
      farmX: [390, 420],
      farmZ: [200, 230],   // fields only beyond the airfield
      roads: [-140, 140],
      roadZ: 300,
      surface(x, z) {
        const p = paved(x, z);
        if (p > 0) return [Math.abs(z) < RUNWAY.z ? 0x4a4a48 : 0x58585a, p];   // runway asphalt, concrete
        const a = airfield(x, z);
        return a > 0 ? [0x5e6a3e, a * 0.6] : null;                              // mown grass
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-140, 0, 140] }, pact: { x: 0, z: -BASE_Z, entries: [-140, 0, 140] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 190 }, pact: { x: 0, z: -190 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const g = (x, z) => terrain.heightAt(x, z);

    // runway markings: the centre line, threshold bars and the numbers' blocks (thin paint)
    for (let x = -RUNWAY.x + 30; x < RUNWAY.x - 30; x += 24) props.box('stone', x, g(x, 0) + 0.03, 0, 12, 0.06, 0.6, 0, 0xd8d8d0);
    for (const s of [1, -1]) {
      for (let k = -5; k <= 5; k++) props.box('stone', s * (RUNWAY.x - 10), g(s * (RUNWAY.x - 10), k * 2.6) + 0.03, k * 2.6, 14, 0.06, 1.4, 0, 0xd8d8d0);
      for (const z of [-RUNWAY.z + 1.2, RUNWAY.z - 1.2]) props.box('stone', 0, g(0, z) + 0.03, z * s, RUNWAY.x * 2 - 10, 0.05, 0.4, 0, 0xc8c8c0);
    }

    mirrored(props, 3301, (m, flip) => {
      // hardened aircraft shelters facing the taxiway, wrecked jets on the apron
      for (const x of [-140, -100, -60]) props.aircraftShelter({ x: x * m, z: 132 * m, yaw: Math.PI + flip });
      props.aircraftWreck({ x: -112 * m, z: 98 * m, yaw: 1.2 + flip });
      props.aircraftWreck({ x: -70 * m, z: 94 * m, yaw: -0.6 + flip, scale: 0.9 });
      for (const x of [-128, -88]) props.jersey({ x: x * m, z: 112 * m, yaw: flip, length: 9 });   // blast walls
      // the hangars
      props.hall({ x: -232 * m, z: 116 * m, yaw: Math.PI + flip, width: 34, depth: 26, height: 11, color: 0x6e726e, roof: 0x55585a, door: 26, name: 'hangar' });
      props.hall({ x: -192 * m, z: 120 * m, yaw: Math.PI + flip, width: 26, depth: 20, height: 9, color: 0x6a6e6a, roof: 0x55585a, door: 18, name: 'hangar' });
      props.aircraftWreck({ x: -215 * m, z: 88 * m, yaw: 2.6 + flip });
      // the control tower and the fire station opposite
      props.controlTower({ x: 0, z: 106 * m, yaw: Math.PI + flip });
      props.hall({ x: 30 * m, z: 108 * m, yaw: Math.PI + flip, width: 16, depth: 10, height: 5, color: 0x8a8278, door: 10, name: 'crash tender garage' });
      props.wreckCar({ x: -18 * m, z: 92 * m, yaw: 0.3 + flip });
      // the fuel depot / bomb dump: tanks behind an earth bank
      props.tanks({ x: 222 * m, z: 116 * m, yaw: flip, count: 3, radius: 4.2, height: 7 });
      props.tanks({ x: 222 * m, z: 132 * m, yaw: flip, count: 2, radius: 3, height: 5, color: 0x7a8070 });
      for (const x of [190, 254]) props.lowWall({ x: x * m, z: 112 * m, yaw: Math.PI / 2, length: 30, height: 1.6 });
      props.hall({ x: 196 * m, z: 92 * m, yaw: flip, width: 12, depth: 8, height: 4.5, color: 0x8a8070, name: 'pump house' });
      // runway debris: wrecks and craters' worth of rubble around the centre
      props.aircraftWreck({ x: 40 * m, z: 6 * m, yaw: 1.62 + flip });
      props.wreckCar({ x: -24 * m, z: 10 * m, yaw: 0.7 + flip });
      props.jersey({ x: 14 * m, z: 22 * m, yaw: 0.1 + flip, length: 9 });
      // the barracks at the home end: three long blocks, a guard post, the perimeter fence
      for (const x of [-34, 0, 34]) props.townHouse({ x: x * m, z: 222 * m, yaw: flip, width: 24, depth: 10, storeys: 2, name: 'barracks' });
      props.tower({ x: 60 * m, z: 196 * m, concrete: true });
      props.fence({ x0: -FIELD_X, x1: FIELD_X, z: 190 * m, breaches: [[-150, -128], [-12, 12], [128, 150]] });
    });
    // farm cover beyond the fence
    const kinds = ['farm', 'fieldwall', 'hay', 'rocks', 'hay', 'wrecks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 26 && tries < 5000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 30 + rand() * (bounds.z - 40);
      if (airfield(x, z) > 0.2 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 26 * 26) || Math.abs(z - 222) < 22 || Math.hypot(x, z - BASE_Z) < 34) continue;
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
      { test: (x, z) => paved(x, z) > 0 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 900, forest: (x, z) => (airfield(x, z) > 0.1 ? -1 : Math.abs(x) > 270 ? 0.6 : 0.03) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => airfield(x, z) > 0.05 }], count: 3000, lane: 0 });
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
