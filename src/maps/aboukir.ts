// Aboukir Bay, 1798 (the 1806 sea battles): the Battle of the Nile. The French line lies at anchor across the
// bay, close in to the shoals, Aboukir island at its head; at dusk the British come down from the north
// with the wind behind them (from the north-north-west) — and some go round inside the anchored line, between
// it and the shoals, where the French guns weren't even run out. The Egyptian shore along the south, the
// fort on the point. The French start at anchor (spawn `anchored`: they hold until the enemy is close).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 5600;
const HALF = 2000;
const noise = createNoise2D(1798_08);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f5a6a });

/** The Egyptian shore's line (z) at x: the bay curving in, the point with the fort to the west. */
const coastZ = (x: number) => 1750 - Math.max(0, 600 - Math.abs(x + 1200)) * 0.9 + fbm(noise, x * 0.001, 0.4, 3) * 120;
const ISLAND = [-1450, 250, 160, 18]; // Aboukir island

function height(x: number, z: number) {
  let h = -40 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 8;
  h = Math.max(h, shore(z - coastZ(x), 320 + fbm(noise, x * 0.002, z * 0.002, 3) * 80, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 12));
  const [ix, iz, r, top] = ISLAND;
  h = Math.max(h, island(r - Math.hypot(x - ix, z - iz) + fbm(noise, x * 0.01, z * 0.01, 2) * 40, r, top, 0.5, 6));
  // the shoals: a wide shallow shelf from the island along the inner side of the bay (the French line lies just outside it)
  const shelf = 900 - z - (x + 1450) * 0.35 + fbm(noise, x * 0.004, z * 0.004, 2) * 120;
  if (shelf < 0 && x < 600) h = Math.max(h, -3 + Math.min(1.5, -shelf / 300) + fbm(noise, x * 0.02, z * 0.02, 2));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'The French line', x: -300, z: 500, owner: 'nato', sector: 'centre', radius: 170 },
  { id: 'B', name: 'Inside the line', x: -800, z: 900, owner: null, sector: 'west', radius: 160 },
  { id: 'C', name: 'The bay', x: 300, z: 0, owner: null, sector: 'centre', radius: 180 },
  { id: 'D', name: 'Rosetta mouth', x: 1300, z: 600, owner: null, sector: 'east', radius: 160 },
  { id: 'K', name: 'The British squadron', x: 0, z: -1700, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'aboukir',
  name: 'Aboukir Bay',
  description: 'The Nile, 1798: the French line at anchor across the bay, the shoals behind it; at dusk the British come down with the wind — and round inside the line.',
  epochs: ['1806'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'dusk', weather: 'clear' },
  wind: { from: 335, speed: 6, veer: 0.2 },
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  size: SIZE,
  segments: 360,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2200, near: 1, far: 8000 },
  seed: 179808,
  height,
  river: sea,

  theme: {
    fogColor: 0xc8a888, fogDensity: 0.00022,
    skyTop: 0x4a5a86, skyHorizon: 0xe8b882, skyBottom: 0xa08470,
    sunColor: 0xffc08a, sunIntensity: 1.5, sunDisk: 0.9,
    clouds: 0.2, cloudLight: 0xf6d4b0, cloudDark: 0x8a7a80,
    sunDir: [-0.8, 0.16, 0.2],
    hemiSky: 0xd8c0a8, hemiGround: 0x6a5a48, hemiIntensity: 1.1,
    rimColor: 0xffd0a0, rimIntensity: 0.35,
    terrain: {
      grass: '#b8a070', grassAlt: '#c4ac7a', dryGrass: '#d2b886', dirt: '#c0a274', rock: '#b09a7c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 2) return [0xcdb486, 1];                          // the sand of the Egyptian shore
        return y > -1 ? [0xdcc89a, 1] : [0xc8b488, 1];
      },
    },
  },

  bases: { nato: { x: -200, z: 1450, entries: [-500, 0, 500] }, pact: { x: 0, z: -1950, entries: [-700, 0, 700] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -200, z: 900 }, pact: { x: 0, z: -1600 } },
  points,

  spawns: {
    // the French line at anchor, head to wind off the shoals (Orient, the flagship, in the middle)
    nato: [{ unit: 'cruiser', x: -900, z: 380, facing: -2.6, anchored: true }, { unit: 'cruiser', x: -580, z: 470, facing: -2.6, anchored: true }, { unit: 'battleship', x: -260, z: 560, facing: -2.6, anchored: true }, { unit: 'cruiser', x: 60, z: 650, facing: -2.6, anchored: true }],
    pact: [{ unit: 'cruiser', x: -400, z: -1450, facing: 0.3 }, { unit: 'cruiser', x: -250, z: -1600, facing: 0.3 }, { unit: 'cruiser', x: -100, z: -1750, facing: 0.3 }, { unit: 'cruiser', x: 50, z: -1900, facing: 0.3 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    props.tower({ x: -1800, z: coastZ(-1800) + 60 }); // the fort on Aboukir point
    for (let i = 0; i < 12; i++) {
      const x = -1700 + rand() * 500, z = coastZ(x) + 80 + rand() * 140;
      if (height(x, z) > 2) props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 6 + rand() * 3, depth: 5 + rand() * 3 });
    }
    for (let i = 0; i < 70; i++) { // date palms along the shore
      const x = (rand() * 2 - 1) * HALF, z = coastZ(x) + 40 + rand() * 200;
      if (height(x, z) > 2 && height(x, z) < 12) props.palm({ x, z, height: 7 + rand() * 5 });
    }
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
