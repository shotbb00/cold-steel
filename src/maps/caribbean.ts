// The Caribbean (the 1806 sea battles): the Windward Islands — a high green island with a coral reef round it,
// smaller cays to the south, the trade wind steady from the east, the sea turquoise over the reefs. The trades
// fall away now and then to a flat calm (the map's wind has `lulls`): the sails hang, and the oared gunboats
// get their chance. The French from the south, the British from the north.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 5600;
const HALF = 2000;
const noise = createNoise2D(1806_02);
const sea = createSea({ level: 0, size: SIZE, color: 0x0e5a86 });

// [x, z, radius, height]: the big island and its cays; each with a fringing reef just under the water
const ISLES = [[-200, -200, 560, 260], [1200, 900, 160, 20], [-1300, 950, 130, 16], [900, -1100, 110, 14]];

function height(x: number, z: number) {
  let h = -55 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 10;
  for (const [ix, iz, r, top] of ISLES) {
    const d = r - Math.hypot(x - ix, z - iz) + fbm(noise, x * 0.004, z * 0.004, 3) * r * 0.25;
    h = Math.max(h, island(d, r, top, fbm(noise, x * 0.012, z * 0.012, 2) * 0.5 + 0.5, 8));
    if (d > -160 && d < -40) h = Math.max(h, -2.2 + fbm(noise, x * 0.03, z * 0.03, 2) * 1.5); // the fringing reef: a ring of coral just awash
  }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'French squadron', x: 0, z: 1750, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Leeward side', x: -1350, z: -150, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'Between the cays', x: 0, z: 900, owner: null, sector: 'centre', radius: 170 },
  { id: 'D', name: 'Windward passage', x: 1300, z: -250, owner: null, sector: 'east', radius: 170 },
  { id: 'K', name: 'British squadron', x: 0, z: -1750, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'caribbean',
  name: 'The Caribbean',
  description: 'A green island and its cays, reefs all round, the trade wind from the east — and now and then a dead calm, when the gunboats row out.',
  epochs: ['1806'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 85, speed: 7, veer: 0.15, lulls: true },   // the trades, easterly — with calms
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  size: SIZE,
  segments: 360,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2200, near: 1, far: 8000 },
  seed: 180602,
  height,
  river: sea,

  theme: {
    fogColor: 0xb8d8e8, fogDensity: 0.00015,
    skyTop: 0x2f7ac0, skyHorizon: 0xc0e2f2, skyBottom: 0x86b8d0,
    sunColor: 0xfff6e0, sunIntensity: 2.2, sunDisk: 0.7,
    clouds: 0.3, cloudLight: 0xffffff, cloudDark: 0xb0c4d0,
    sunDir: [0.2, 0.75, 0.3],
    hemiSky: 0xd2e8f4, hemiGround: 0x4a6a48, hemiIntensity: 1.3,
    rimColor: 0xf2f8fc, rimIntensity: 0.25,
    terrain: {
      grass: '#3e7a3a', grassAlt: '#4a8842', dryGrass: '#8aa060', dirt: '#8a7454', rock: '#7a7060',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 6) return [0x3a7836, 1];                         // the rainforest green
        return y > 0.5 ? [0xe8dcb4, 1] : [0xd8caa0, 1];          // white coral sand
      },
    },
  },

  bases: { nato: { x: 0, z: 1950, entries: [-700, 0, 700] }, pact: { x: 0, z: -1950, entries: [-700, 0, 700] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 0, z: 1650 }, pact: { x: 0, z: -1650 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: -400, z: 1500, facing: Math.PI }, { unit: 'frigate', x: 0, z: 1450, facing: Math.PI }, { unit: 'cruiser', x: 400, z: 1500, facing: Math.PI }, { unit: 'ptBoat', x: 200, z: 1650, facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: -400, z: -1500, facing: 0 }, { unit: 'frigate', x: 0, z: -1450, facing: 0 }, { unit: 'cruiser', x: 400, z: -1500, facing: 0 }, { unit: 'destroyer', x: -200, z: -1650, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // a small harbour town on the big island's lee shore, palms along every beach
    for (let i = 0; i < 14; i++) {
      const x = -720 + rand() * 160, z = -350 + rand() * 300;
      if (height(x, z) > 2 && height(x, z) < 30) props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    for (let i = 0; i < 260; i++) {
      const x = (rand() * 2 - 1) * HALF, z = (rand() * 2 - 1) * HALF, y = height(x, z);
      if (y > 1 && y < 40) props.palm({ x, z, height: 7 + rand() * 6 });
    }
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
