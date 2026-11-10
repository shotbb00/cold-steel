// Trafalgar, 1805 (the 1806 sea battles): the Atlantic off Cape Trafalgar. The Combined Fleet — the French
// here — in the south, heading up the coast; the Royal Navy comes down from the north with the wind behind
// it, the weather gauge (the wind from the west-north-west, world/Wind.js: the map's own). The cape and its
// shoals on the east edge, the long Atlantic swell. Sailing ships only (data/units1806/ships.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 5600;
const HALF = 2000;
const noise = createNoise2D(1805_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x1d4a66 });

/** The Spanish coast's line (x) at z, the cape pushing out toward the middle. */
const coastX = (z: number) => 1850 + fbm(noise, z * 0.0011, 0.6, 3) * 160 - Math.max(0, 420 - Math.abs(z - 200)) * 0.9;

function height(x: number, z: number) {
  let h = -60 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 10;
  h = Math.max(h, shore(x - coastX(z), 260 + fbm(noise, x * 0.002, z * 0.002, 3) * 90, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 24));
  // the shoals off the cape: shallow sand a ship of the line can't cross (they wrecked prizes after the battle)
  const sh = Math.hypot((x - 1350) * 0.8, (z - 250) * 1.6);
  if (sh < 380) h = Math.max(h, -2.5 + (380 - sh) / 380 * 2 + fbm(noise, x * 0.01, z * 0.01, 2) * 1.2);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Combined Fleet', x: -300, z: 1750, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Open Atlantic', x: -1300, z: 0, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'The line of battle', x: 0, z: 0, owner: null, sector: 'centre', radius: 170 },
  { id: 'D', name: 'Off the cape', x: 1000, z: -300, owner: null, sector: 'east', radius: 160 },
  { id: 'K', name: 'Weather column', x: -300, z: -1750, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'trafalgar',
  name: 'Trafalgar',
  description: 'Off Cape Trafalgar, October 1805: the British come down with the wind behind them; the French line waits to leeward. The cape and its shoals to the east.',
  epochs: ['1806'],
  theatre: 'sea',
  wip: true,               // (not offered in the menus yet: the 1806 sea battles are being built — ?map=trafalgar&epoch=1806)
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 295, speed: 6.5, veer: 0.3 },   // west-north-west, a moderate breeze (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  size: SIZE,
  segments: 360,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2200, near: 1, far: 8000 },
  seed: 180510,
  height,
  river: sea,

  theme: {
    fogColor: 0xa8bccc, fogDensity: 0.0002,
    skyTop: 0x4f7aa6, skyHorizon: 0xc6d4de, skyBottom: 0x8aa2b4,
    sunColor: 0xfff2dc, sunIntensity: 2.0, sunDisk: 0.6,
    clouds: 0.35, cloudLight: 0xf4f6f8, cloudDark: 0xa6b2bc,
    sunDir: [0.3, 0.6, 0.5],
    hemiSky: 0xcad8e4, hemiGround: 0x5a6a5a, hemiIntensity: 1.25,
    rimColor: 0xeef2f6, rimIntensity: 0.25,
    terrain: {
      grass: '#7a7a4a', grassAlt: '#86844f', dryGrass: '#a89a62', dirt: '#9a8a66', rock: '#a69a82',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 3) return [0x8c8a58, 1];                         // the dry scrub of Andalusia
        return y > -1 ? [0xcbb98e, 1] : [0xb8a47a, 1];           // the beach, the sand of the shoals
      },
    },
  },

  bases: { nato: { x: -300, z: 1950, entries: [-700, 0, 700] }, pact: { x: -300, z: -1950, entries: [-700, 0, 700] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -300, z: 1700 }, pact: { x: -300, z: -1700 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: -700, z: 1300, facing: Math.PI }, { unit: 'cruiser', x: -300, z: 1300, facing: Math.PI }, { unit: 'cruiser', x: 100, z: 1300, facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: -500, z: -1300, facing: 0 }, { unit: 'cruiser', x: -500, z: -1450, facing: 0 }, { unit: 'cruiser', x: -100, z: -1300, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the lighthouse on the cape, a few white houses of Los Caños above the beach
    props.tower({ x: coastX(200) + 40, z: 200, concrete: true });
    for (let i = 0; i < 10; i++) {
      const z = -700 + rand() * 400, x = coastX(z) + 60 + rand() * 120;
      if (height(x, z) > 3 && height(x, z) < 30) props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.5, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 500, broadleaf: 0.6, autumn: 0, maxY: 60, size: 1.1,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 5 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
