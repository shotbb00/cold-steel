// Open sea: no coast in sight — the drop-in sea map for the world campaign's quiet sea zones (the North Sea, the
// western Atlantic, the Yellow Sea, the Channel, the Bay of Bengal …) where a battle has no map of its own. Deep
// water with a gentle swell of the sea floor and nothing else: no islands, no shoals, nothing to hide behind —
// the fleets meet on the open sea. Fair as a mirror: the zones are point-symmetric about the centre. The wars
// with ships at sea (1918, 1945, 1985) use it with their own fleets and side names (1918: a battlecruiser, a destroyer and an
// escort a side — the same slots). Laid out at full size (`widened`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { createSea } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(4242);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f3846 });

/** The sea floor: deep everywhere, a slow swell of ridges and troughs (never within reach of a keel). */
const height = (x: number, z: number) => -80 + fbm(noise, x * 0.0004, z * 0.0004, 4) * 20;

const points: ControlPointDef[] = [
  { id: 'A', name: 'Home fleet', x: -300, z: 3950, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'West', x: -2600, z: 500, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'Midway point', x: 0, z: 0, owner: null, sector: 'centre', radius: 190 },
  { id: 'D', name: 'East', x: 2600, z: -500, owner: null, sector: 'east', radius: 180 },
  { id: 'K', name: 'Enemy fleet', x: 300, z: -3950, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'openSea',
  name: 'Open Sea',
  description: 'Open water out of sight of land: two fleets meet with nothing between them but the swell. The campaign’s quiet sea zones are fought here.',
  epochs: ['1918', '1945', '1985'],
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  size: SIZE,
  segments: 320,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 4160, near: 2, far: 16200 },
  seed: 4242,
  height,
  river: sea,

  theme: {
    fogColor: 0x9aa8b2, fogDensity: 0.00015,
    skyTop: 0x587088, skyHorizon: 0xb4bec6, skyBottom: 0x7a8a96,
    sunColor: 0xf0eee8, sunIntensity: 1.6, sunDisk: 0.3,
    clouds: 0.65, cloudLight: 0xe6eaee, cloudDark: 0x8a96a0,
    sunDir: [0.35, 0.5, 0.6],
    hemiSky: 0xc2ccd4, hemiGround: 0x46525a, hemiIntensity: 1.2,
    rimColor: 0xdae2e8, rimIntensity: 0.25,
    terrain: {
      grass: '#3a3834', grassAlt: '#3a3834', dryGrass: '#3a3834', dirt: '#3a3834', rock: '#3a3834',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface: () => [0x3a3834, 1], // (the sea floor: never seen through deep water)
    },
  },

  bases: { nato: { x: -300, z: 4300, entries: [-800, 0, 800] }, pact: { x: 300, z: -4300, entries: [-800, 0, 800] } },
  maxStacks: 12,
  cameraStart: { nato: { x: -300, z: 3900 }, pact: { x: 300, z: -3900 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: -300, z: 4050, facing: Math.PI }, { unit: 'destroyer', x: -650, z: 4200, facing: Math.PI }, { unit: 'frigate', x: 50, z: 4200, facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: 300, z: -4050, facing: 0 }, { unit: 'destroyer', x: 650, z: -4200, facing: 0 }, { unit: 'frigate', x: -50, z: -4200, facing: 0 }],
  },

  decorate({ scene, terrain, cover }) {
    sea.build(scene, terrain);
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: [], update() {} };
  },
} satisfies MapDef;
