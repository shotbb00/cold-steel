// The Philippine Sea, June 1944 (fought here as 1945): open ocean, the fleets out of sight of each other
// beyond the horizon, a few coral atolls the only things that aren't water. A carrier battle: the scout
// that finds the enemy first, and the strike that gets through his fighters. Each side opens with an
// escort carrier and its screen. Ships only (data/units45/ships.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, island, jungle, jungleTint } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1944_06);
const sea = createSea({ level: 0, size: SIZE, color: 0x15476a });

// the atolls: [x, z, radius] — a reef ring awash round a shallow lagoon, a few palms on its islets
const ATOLLS = [[-1300, -700, 230], [1350, 800, 200], [250, -1550, 150], [-250, 1450, 150]];
// two volcanic islands either side of the open sea, cliffs and jungle up to a cone: [x, z, radius]
const VOLCANOES = [[-700, 450, 320], [700, -450, 320]];

function height(x: number, z: number) {
  let h = -46 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 8;
  for (const [ax, az, r] of ATOLLS) {
    const d = Math.hypot(x - ax, z - az);
    const ring = Math.exp(-(((d - r) / 40) ** 2));                                  // the reef, awash
    const islet = ring > 0.85 && fbm(noise, x * 0.02, z * 0.02, 2) > 0.6 ? 1.6 : 0;  // here and there an islet on it
    const lagoon = d < r ? -2.6 : -Infinity;                                        // the shallow lagoon inside
    const slope = d >= r ? -1.2 - (d - r) * 0.17 : -Infinity;                       // the outer slope down to the deep
    h = Math.max(h, lagoon, slope, ring > 0.03 ? 0.5 * ring - 0.1 + islet : -Infinity); // (the reef only near the ring)
  }
  for (const [vx, vz, r] of VOLCANOES) h = Math.max(h, island(r - Math.hypot(x - vx, z - vz) + fbm(noise, x * 0.005, z * 0.005, 2) * 60, r, 160, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Task Force 58', x: 0, z: 2150, owner: 'nato', sector: 'centre', radius: 140 },
  { id: 'B', name: 'West atolls', x: -1650, z: 250, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'Open sea', x: 0, z: 0, owner: null, sector: 'centre', radius: 180 },
  { id: 'D', name: 'East atolls', x: 1650, z: -250, owner: null, sector: 'east', radius: 170 },
  { id: 'K', name: 'Mobile Fleet', x: 0, z: -2150, owner: 'pact', sector: 'centre', radius: 140 },
];

export default {
  id: 'philippineSea',
  name: 'Philippine Sea',
  description: 'Open ocean and a few coral atolls: a carrier battle. Find the enemy fleet before he finds yours, and get the strike through his fighters.',
  epochs: ['1945'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  fow: 0.5,
  sides: { nato: 'United States', pact: 'Japan' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2400, near: 2, far: 9000 },
  seed: 194406,
  height,
  river: sea,

  theme: {
    fogColor: 0xb6cee0,
    fogDensity: 0.0002,
    skyTop: 0x3c78ba,
    skyHorizon: 0xc6deee,
    skyBottom: 0x78a6c4,
    sunColor: 0xfff4e0,
    sunIntensity: 2.3,
    sunDisk: 0.8,
    clouds: 0.3,
    cloudLight: 0xffffff,
    cloudDark: 0xb8c6d4,
    sunDir: [0.3, 0.8, 0.45],
    hemiSky: 0xd0e4f4,
    hemiGround: 0x5a7c8e,
    hemiIntensity: 1.3,
    rimColor: 0xe0eef8,
    rimIntensity: 0.3,
    terrain: {
      grass: '#5a7a40', grassAlt: '#668448', dryGrass: '#a8a070', dirt: '#cdbf90', rock: '#9a9488',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y >= 1.6) return jungleTint(height, x, z, y);
        return y > -0.6 ? [0xe6dcb4, 1] : [0xc4b88e, 1]; // coral sand, above and under the water
      },
    },
  },

  bases: { nato: { x: 0, z: 2350, entries: [-800, 0, 800] }, pact: { x: 0, z: -2350, entries: [-800, 0, 800] } },
  maxStacks: 12,
  cameraStart: { nato: { x: 0, z: 2100 }, pact: { x: 0, z: -2100 } },
  points,

  spawns: {
    nato: [{ unit: 'escortCarrier', x: 0, z: 2350, facing: Math.PI }, { unit: 'destroyer', x: -350, z: 2100, facing: Math.PI }, { unit: 'destroyer', x: 350, z: 2100, facing: Math.PI }, { unit: 'cruiser', x: 0, z: 1950, facing: Math.PI }],
    pact: [{ unit: 'escortCarrier', x: 0, z: -2350, facing: 0 }, { unit: 'destroyer', x: 350, z: -2100, facing: 0 }, { unit: 'destroyer', x: -350, z: -2100, facing: 0 }, { unit: 'cruiser', x: 0, z: -1950, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    for (const [ax, az, r] of ATOLLS) {
      for (let i = 0; i < 40; i++) {
        const a = rand() * Math.PI * 2;
        const x = ax + Math.cos(a) * r, z = az + Math.sin(a) * r;
        if (height(x, z) > 1) props.palm({ x, z, height: 7 + rand() * 5 });
      }
    }
    props.finish();
    const trees = jungle({ scene, terrain, cover, rand, half: HALF, count: 2500 });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update(dt, t); } };
  },
} satisfies MapDef;
