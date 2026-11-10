// The Norwegian Sea, 1985: the Northern Fleet comes south past Lofoten to break into the Atlantic; a NATO
// group waits off the Norwegian coast. Open grey ocean to the west; to the east the mainland — snow-capped
// mountains three hundred metres high, cut by the mouth of a fjord with a fishing village in it — and off
// it a chain of steep Lofoten peaks and the skerries round them. The peaks hide a ship from radar: a group
// can wait silent behind them, or come round them close. Ships only (data/units/ships85.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1985_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x23404f });

// the Lofoten peaks: [x, z, radius, height] — steep, bare rock
const PEAKS = [[900, -1300, 230, 260], [1150, -700, 170, 210], [700, 50, 260, 280], [1050, 650, 150, 190], [850, 1400, 210, 240], [-1400, 600, 140, 120]];
/** The mainland coast's line (x) at z: the fjord mouth cuts in near z = 1100. */
const coastX = (z: number) => 1850 + fbm(noise, z * 0.0012, 3.1, 3) * 220 + (Math.abs(z - 1100) < 380 ? (380 - Math.abs(z - 1100)) * 1.4 : 0);

function height(x: number, z: number) {
  let h = -70 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 12;
  const c = coastX(z);
  h = Math.max(h, shore(x - c, 300 + fbm(noise, x * 0.002, z * 0.002, 3) * 80, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 30)); // the mainland
  for (const [px, pz, r, top] of PEAKS) h = Math.max(h, island(r - Math.hypot(x - px, z - pz) + fbm(noise, x * 0.006, z * 0.006, 2) * 60, r, top, fbm(noise, x * 0.014, z * 0.014, 2) * 0.5 + 0.5, 8));
  // skerries: low bare rocks round the peaks and off the coast
  if (x > 300 && fbm(noise, x * 0.0045, z * 0.0045, 3) > 0.6) h = Math.max(h, 2 + fbm(noise, x * 0.02, z * 0.02, 2) * 6);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Carrier group', x: -700, z: 2150, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Open Atlantic', x: -1600, z: -100, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'Lofoten passage', x: 300, z: -300, owner: null, sector: 'centre', radius: 170 },
  { id: 'D', name: 'Vestfjord mouth', x: 1550, z: 1100, owner: null, sector: 'east', radius: 160 },
  { id: 'K', name: 'Northern Fleet', x: -700, z: -2150, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'norwegianSea',
  name: 'Norwegian Sea',
  description: 'The Northern Fleet comes south past Lofoten to break into the Atlantic; a NATO group waits off the Norwegian coast. Open ocean to the west, the peaks and the fjord to the east — hide behind the rock, or be seen.',
  epochs: ['1985'],
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
    fogColor: 0x9aa8b2, fogDensity: 0.00026,
    skyTop: 0x5d7286, skyHorizon: 0xb4bec6, skyBottom: 0x7c8c98,
    sunColor: 0xf0eee8, sunIntensity: 1.6, sunDisk: 0.3,
    clouds: 0.75, cloudLight: 0xe8ecef, cloudDark: 0x8a96a0,
    sunDir: [-0.4, 0.55, 0.6],
    hemiSky: 0xc4ccd4, hemiGround: 0x4c5a62, hemiIntensity: 1.2,
    rimColor: 0xdde4ea, rimIntensity: 0.25,
    terrain: {
      grass: '#5a6648', grassAlt: '#66704f', dryGrass: '#8a8a6a', dirt: '#6f6a5c', rock: '#77736c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 170) return [0xe4e8ea, 1];                       // snow on the tops
        if (y > 60) return [0x6d6a62, 1];                        // bare grey rock
        return y > 2 ? [0x56603f, 1] : [0x47433c, 1];            // heather and moss above the dark wet rock of the shore
      },
    },
  },

  bases: { nato: { x: -700, z: 2350, entries: [-800, 0, 800] }, pact: { x: -700, z: -2350, entries: [-800, 0, 800] } },
  maxStacks: 12,
  cameraStart: { nato: { x: -700, z: 2100 }, pact: { x: -700, z: -2100 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: -700, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: -1050, z: 2200, facing: Math.PI }, { unit: 'frigate', x: -350, z: 2200, facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: -700, z: -2050, facing: 0 }, { unit: 'destroyer', x: -350, z: -2200, facing: 0 }, { unit: 'frigate', x: -1050, z: -2200, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the fishing village at the head of the fjord mouth, and its lighthouse on the point
    for (let i = 0; i < 14; i++) {
      const z = 900 + rand() * 400, x = coastX(z) + 40 + rand() * 120;
      if (height(x, z) > 3 && height(x, z) < 40) props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.4, width: 7 + rand() * 3, depth: 6 + rand() * 2 });
    }
    props.tower({ x: coastX(700) + 30, z: 700, concrete: true });
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 1600, broadleaf: 0, autumn: 0, maxY: 110, size: 1.4,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
