// Cape Finisterre, 22 July 1805 (the 1806 sea battles, the campaign's `finisterre` zone): Calder's action. Villeneuve's
// Franco-Spanish fleet, home from the West Indies, comes up from the south-west for Ferrol; Calder's squadron,
// cruising off the cape to stop it, comes down from the north. They fought in haze and drifting fog in the long
// Atlantic swell, the lines half lost to each other; two Spanish ships (San Rafael, Firme) struck, and both fleets
// drew off. The Galician coast and Cape Finisterre with its rocks (Os Bois) on the east edge, open ocean everywhere
// else. Laid out at full size (`widened`). Fair: the homes point-mirrored through the middle, the three open zones
// tuned to the same sailing distance from both fleets (seapath/seatune), none in the cape's lee; the wind from the
// west-north-west reaches both lines on a broad reach — the French have it on the quarter coming up, the British
// abeam coming down. Gravina's Spaniards sail their own ships (army es: data/units1806/westNavies.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1805_07);
const sea = createSea({ level: 0, size: SIZE, color: 0x23485a });
// the ships' names (entities/UnitStack.js shipName): Calder's British (the French and the Spanish name their own: data/units1806/ships.js, westNavies.js)
Object.assign(sea, {
  names: {
    pact: {
      battleship: ['Prince of Wales', 'Glory', 'Barfleur', 'Windsor Castle'],
      cruiser: ['Hero', 'Ajax', 'Triumph', 'Malta', 'Defiance', 'Agamemnon', 'Repulse', 'Raisonnable', 'Dragon', 'Warrior', 'Thunderer'],
      frigate: ['Egyptienne', 'Sirius'],
      destroyer: ['Frisk', 'Nile'],
    },
  },
});

/** The Galician coast's line (x) at z: Cape Finisterre pushing out west at z ≈ 1300, the shore falling back north toward Corunna. */
const coastX = (z: number) => 2550 + fbm(noise, z * 0.0011, 0.4, 3) * 140 - Math.max(0, 520 - Math.abs(z - 1300)) * 0.95 + Math.max(0, -1200 - z) * 0.12;
const CAPE = { x: 2050, z: 1300 };

function height(x: number, z: number) {
  let h = -70 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 10;
  h = Math.max(h, shore(x - coastX(z), 220 + fbm(noise, x * 0.002, z * 0.002, 3) * 90, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 18));
  // Os Bois: the rocks off the cape's point, awash (west of it, clear of the zones)
  const r = Math.hypot(x - (CAPE.x - 230), (z - CAPE.z) * 1.4);
  if (r < 170) h = Math.max(h, -2 + (170 - r) / 170 * 4 + fbm(noise, x * 0.03, z * 0.03, 2) * 2);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'The Combined Fleet', x: -950, z: 1450, owner: 'nato', sector: 'centre', radius: 170 },
  { id: 'B', name: 'The open Atlantic', x: -1010, z: -660, owner: null, sector: 'west', radius: 200 },
  { id: 'C', name: 'In the fog bank', x: 0, z: 0, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'Off Cape Finisterre', x: 1010, z: 660, owner: null, sector: 'east', radius: 190 },
  { id: 'K', name: 'Calder’s squadron', x: 950, z: -1450, owner: 'pact', sector: 'centre', radius: 170 },
];

// a fleet in line abreast across its line of advance, `n` ships 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});
const UP = Math.atan2(0.546, -0.838);   // nato's heading to the north-east, toward the British (atan2(x, z))
const DOWN = UP + Math.PI;

export default {
  id: 'finisterre-1805',
  name: 'Cape Finisterre',
  description: 'Off Cape Finisterre, 22 July 1805: Calder’s squadron meets Villeneuve’s Franco-Spanish fleet home from the West Indies, in haze and fog banks on the Atlantic swell. The Galician coast and the cape’s rocks to the east.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'fog' },
  wind: { from: 290, speed: 10, veer: 0.25 },   // west-north-west — in the fog it falls to a light breeze (world/Wind.js)
  fow: 0.55,
  sides: { nato: 'France and Spain', pact: 'Britain' },
  armies: { nato: ['fr', 'es'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180507,
  height,
  river: sea,

  theme: {
    // a grey-white summer haze over the swell
    fogColor: 0xb8c2c8, fogDensity: 0.00028,
    skyTop: 0x7c8e9c, skyHorizon: 0xcfd6da, skyBottom: 0x9aa6ae,
    sunColor: 0xf6f0e2, sunIntensity: 1.6, sunDisk: 0.25,
    clouds: 0.7, cloudLight: 0xeef0f2, cloudDark: 0xa2acb4,
    sunDir: [0.3, 0.6, 0.45],
    hemiSky: 0xc8d0d6, hemiGround: 0x56604e, hemiIntensity: 1.25,
    rimColor: 0xe8ecee, rimIntensity: 0.2,
    terrain: {
      grass: '#5e6c44', grassAlt: '#66744a', dryGrass: '#8c8a60', dirt: '#6e6450', rock: '#86827a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 30) return [0x6a6a52, 1];                       // gorse and heather on the Galician hills
        if (y > 8) return [0x5a6a40, 1];                        // the green coastal fields
        return y > 0.5 ? [0x8a8478, 1] : [0x7a746a, 1];         // grey granite at the water
      },
    },
  },

  bases: { nato: { x: -1150, z: 1750, entries: [-600, 0, 600] }, pact: { x: 1150, z: -1750, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -800, z: 1250 }, pact: { x: 800, z: -1250 } },
  points,

  spawns: {
    nato: line(['frigate', 'cruiser', 'cruiser', 'cruiser'], -850, 1300, UP),
    pact: line(['frigate', 'cruiser', 'cruiser', 'cruiser'], 850, -1300, DOWN),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the cape: its hermitage and signal post on the head, a fishing village (Fisterra) in the bay south of it
    props.tower({ x: coastX(CAPE.z) + 90, z: CAPE.z });
    props.church({ x: coastX(CAPE.z + 120) + 160, z: CAPE.z + 120, yaw: Math.PI / 2 });
    for (let i = 0; i < 16; i++) {
      const z = 1900 + rand() * 450, x = coastX(z) + 50 + rand() * 160;
      if (height(x, z) > 3 && height(x, z) < 35) props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.6, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 700, broadleaf: 0.5, autumn: 0, maxY: 160, size: 1.1,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
