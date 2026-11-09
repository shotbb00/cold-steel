// Midway, June: open Pacific around the atoll (1945 only; the open-sea scale: 5 × 5 km). The atoll
// in the middle — a ring of reef round a shallow lagoon no ship can cross, Sand Island and Eastern
// Island inside it with the airfield — and sandbanks and shoals out on the open water. The US Navy
// comes in from the south (+z), the Imperial Navy from the north. Ships only (data/units45/ships.js).
// Frontline only for now (`modes`): the five zones are held by warships on the surface (systems/ControlPoints.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, island, jungle, jungleTint } from '../world/Sea.js';
import { smoothstep } from '../core/math.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;      // the playing area: ±HALF
const BASE_Z = 2300;
const ATOLL = 950;      // the reef ring's radius
const noise = createNoise2D(1942);
const sea = createSea({ level: 0, size: SIZE, color: 0x1e5a78 });

// sandbanks and shoals: [x, z, radius] (point-mirrored pairs)
const SHOALS = [[-1500, 600, 160], [1500, -600, 160], [900, 1400, 120], [-900, -1400, 120]];
// two rocky pinnacles out by the flank zones, cliffs and jungle a ship can hide behind: [x, z, radius]
const PINNACLES = [[-1950, -350, 230], [1950, 350, 230]];

function height(x, z) {
  let h = -38 + fbm(noise, x * 0.0008, z * 0.0008, 4) * 10;                 // the open ocean floor (deep enough everywhere)
  const r = Math.hypot(x, z * 1.15);
  const ring = Math.exp(-(((r - ATOLL) / 70) ** 2)) * (1 + 0.15 * fbm(noise, x * 0.004, z * 0.004, 2)); // the reef
  const lagoon = smoothstep(ATOLL + 40, ATOLL - 60, r);
  h += (-2.2 - h) * lagoon;                                                  // the lagoon: wading depth, no keel gets in
  h += (0.4 - h) * Math.min(1, ring * 1.2);                                  // the reef, awash
  for (const [ix, iz, ir, ih] of [[-380, 260, 260, 4], [420, -220, 230, 3.5]]) { // Sand Island, Eastern Island
    const k = smoothstep(ir, ir * 0.55, Math.hypot(x - ix, (z - iz) * 1.3));
    h += (ih + fbm(noise, x * 0.01, z * 0.01, 2) * 1.5 - h) * k;
  }
  for (const [sx, sz, sr] of SHOALS) h += (-3 - h) * smoothstep(sr, sr * 0.4, Math.hypot(x - sx, z - sz)); // just under the surface: too shallow for any keel (world/Nav.js SHIP_DEPTH)
  for (const [px, pz, pr] of PINNACLES) h = Math.max(h, island(pr - Math.hypot(x - px, z - pz) + fbm(noise, x * 0.006, z * 0.006, 2) * 45, pr, 110, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 10));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Task Force 16', x: 0, z: 2050, owner: 'nato', sector: 'centre', radius: 120 },
  { id: 'B', name: 'West reef', x: -1400, z: 0, owner: null, sector: 'west', radius: 150 },
  { id: 'C', name: 'Midway lagoon mouth', x: 0, z: 1050, owner: null, sector: 'centre', radius: 150 },
  { id: 'D', name: 'East shoals', x: 1400, z: 0, owner: null, sector: 'east', radius: 150 },
  { id: 'E', name: 'Kure passage', x: 0, z: -1050, owner: null, sector: 'centre', radius: 150 },
  { id: 'K', name: 'Kidō Butai', x: 0, z: -2050, owner: 'pact', sector: 'centre', radius: 120 },
];

export default {
  id: 'midway',
  name: 'Midway',
  description: 'Open Pacific around the atoll: a reef ring no ship can cross, the islands with their airfield in the middle, shoals out on the water.',
  epochs: ['1945'],
  theatre: 'sea',          // the menu's Sea battles (maps/index.js THEATRES)
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],   // (no landing or recon modes at sea)
  fow: 0.5,
  sides: { nato: 'United States', pact: 'Japan' },          // unseen water only half as dark (render/FogOfWar.js)
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2400, near: 2, far: 9000 },
  seed: 1942,
  height,
  river: sea,

  theme: {
    fogColor: 0xb8cede,
    fogDensity: 0.00022,
    skyTop: 0x3f78b8,
    skyHorizon: 0xc4dcec,
    skyBottom: 0x7aa4c0,
    sunColor: 0xfff4e0,
    sunIntensity: 2.2,
    sunDisk: 0.8,
    clouds: 0.35,
    cloudLight: 0xffffff,
    cloudDark: 0xb8c4d0,
    sunDir: [0.4, 0.75, 0.5],
    hemiSky: 0xcfe2f2,
    hemiGround: 0x5a7a8a,
    hemiIntensity: 1.3,
    rimColor: 0xe0eef8,
    rimIntensity: 0.3,
    terrain: {
      grass: '#8ea05a', grassAlt: '#9aa864', dryGrass: '#d8cc9a', dirt: '#cdbf90', rock: '#9a9488',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x, z) {
        const y = height(x, z);
        if (y >= 1.6) return jungleTint(height, x, z, y);
        return y > -0.6 ? [0xe6dcb4, smoothstep(2.2, 0.6, y)] : [0xc4b88e, 1]; // the beaches and the reef: coral sand, and under the water a darker sand the sea tints by its depth (world/Sea.js)
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-900, 0, 900] }, pact: { x: 0, z: -BASE_Z, entries: [-900, 0, 900] } },
  maxStacks: 12,
  cameraStart: { nato: { x: 0, z: 2000 }, pact: { x: 0, z: -2000 } }, // (on the fleet as the battle opens)
  points,

  spawns: {
    nato: [{ unit: 'destroyer', x: -300, z: 2100, facing: Math.PI }, { unit: 'destroyer', x: 300, z: 2100, facing: Math.PI }, { unit: 'frigate', x: 0, z: 2150, facing: Math.PI }, { unit: 'cruiser', x: 0, z: 2300, facing: Math.PI }],
    pact: [{ unit: 'destroyer', x: 300, z: -2100, facing: 0 }, { unit: 'destroyer', x: -300, z: -2100, facing: 0 }, { unit: 'frigate', x: 0, z: -2150, facing: 0 }, { unit: 'cruiser', x: 0, z: -2300, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);   // (the water's depth, colour and surf from the sea floor: world/Sea.js)
    // palms on the islands, the airfield's tower and a hangar on Eastern Island
    for (let i = 0; i < 160; i++) {
      const x = (rand() * 2 - 1) * 650;
      const z = (rand() * 2 - 1) * 450;
      if (height(x, z) > 1.8) props.palm({ x, z, height: 7 + rand() * 5 });
    }
    props.controlTower({ x: 420, z: -200, yaw: 0.3 });
    props.timberHangar({ x: 470, z: -150, yaw: 0.3 });
    props.finish();
    const trees = jungle({ scene, terrain, cover, rand, half: HALF, count: 2000 });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update(dt, t); } };
  },
} satisfies MapDef;
