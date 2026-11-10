// The Norwegian Sea, 1985 (WW3 at sea) — a first, plain version to try the missile war on (the WW3 plan's
// step 5 builds it properly): grey North Atlantic, the Norwegian coast's skerries and high rocky islands
// along the east side, where a ship can hide from radar behind the rock. Not offered in the menu yet
// (`wip`): ?mode=frontline&map=norwegianSea&epoch=1985.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1985_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a4656 });

// high rocky islands off the coast: [x, z, radius, height]
const ISLANDS = [[1500, -900, 260, 140], [1150, 350, 200, 110], [1700, 1150, 240, 130], [600, -1700, 160, 90], [-1100, 300, 170, 80]];

function height(x: number, z: number) {
  let h = -60 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 10;
  // the mainland coast along the east edge, cut by sounds
  const coast = 2050 + fbm(noise, z * 0.0012, 3.1, 3) * 260;
  if (x > coast - 200) h = Math.max(h, island(x - coast + 60, 300, 160, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5));
  for (const [ix, iz, r, top] of ISLANDS) h = Math.max(h, island(r - Math.hypot(x - ix, z - iz) + fbm(noise, x * 0.006, z * 0.006, 2) * 70, r, top, fbm(noise, x * 0.012, z * 0.012, 2) * 0.5 + 0.5));
  // skerries: low bare rocks scattered near the coast
  if (x > 900 && fbm(noise, x * 0.004, z * 0.004, 3) > 0.62) h = Math.max(h, 3 + fbm(noise, x * 0.02, z * 0.02, 2) * 6);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Carrier group', x: -600, z: 2150, owner: 'nato', sector: 'centre', radius: 140 },
  { id: 'B', name: 'Open sea', x: -1500, z: 0, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'The skerries', x: 700, z: -200, owner: null, sector: 'centre', radius: 170 },
  { id: 'D', name: 'Vestfjord mouth', x: 1300, z: 1700, owner: null, sector: 'east', radius: 160 },
  { id: 'K', name: 'Northern Fleet', x: -600, z: -2150, owner: 'pact', sector: 'centre', radius: 140 },
];

export default {
  id: 'norwegianSea',
  name: 'Norwegian Sea',
  description: 'The Northern Fleet comes down past the North Cape to break into the Atlantic; a NATO battle group waits off the Norwegian coast. Radar on and you see — and are heard.',
  epochs: ['1985'],
  wip: true,
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2600, near: 2, far: 9000 },
  seed: 198509,
  height,
  river: sea,

  theme: {
    fogColor: 0x9aa8b2,
    fogDensity: 0.00026,
    skyTop: 0x5d7286,
    skyHorizon: 0xb4bec6,
    skyBottom: 0x7c8c98,
    sunColor: 0xf0eee8,
    sunIntensity: 1.6,
    sunDisk: 0.3,
    clouds: 0.75,
    cloudLight: 0xe8ecef,
    cloudDark: 0x8a96a0,
    sunDir: [-0.4, 0.55, 0.6],
    hemiSky: 0xc4ccd4,
    hemiGround: 0x4c5a62,
    hemiIntensity: 1.2,
    rimColor: 0xdde4ea,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a6648', grassAlt: '#66704f', dryGrass: '#8a8a6a', dirt: '#6f6a5c', rock: '#77736c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 25) return [y > 90 ? 0xd8dcde : 0x6d6a62, 1]; // bare rock, snow on the tops
        return y > 2 ? [0x5c6650, 1] : [0x4e4a42, 1];       // heather and moss, dark wet rock at the waterline
      },
    },
  },

  bases: { nato: { x: -600, z: 2350, entries: [-800, 0, 800] }, pact: { x: -600, z: -2350, entries: [-800, 0, 800] } },
  maxStacks: 12,
  cameraStart: { nato: { x: -600, z: 2100 }, pact: { x: -600, z: -2100 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: -600, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: -950, z: 2200, facing: Math.PI }, { unit: 'frigate', x: -250, z: 2200, facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: -600, z: -2050, facing: 0 }, { unit: 'destroyer', x: -250, z: -2200, facing: 0 }, { unit: 'frigate', x: -950, z: -2200, facing: 0 }],
  },

  decorate({ scene, terrain, cover }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
