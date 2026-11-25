// Copenhagen, 2 April 1801 (the 1806 sea battles): the Danish line of blockships, old hulks and floating
// batteries moored in the King's Deep in front of the city, the Trekroner fort on its island at the north
// end of it, the long sandbank of the Middle Ground outside them. Nelson took his squadron round the shoal
// to the south and came up the King's Deep with the wind from the south-east, anchored by the stern
// abreast of the Danish line and fought it gun to gun for four hours — three of his ships went aground on
// the Middle Ground. The Danes (the `nato` side: the Royal Danish Navy, army `dk` — the French hulls' stats under the
// Danish flag, data/units1806/ships.js) start moored (spawn `anchored`) with
// the fort's guns behind them; the British come up from the south. Fair: the Danish line holds one point,
// the King's Deep's southern entrance is as near the British, the Holland Deep east of the shoal lies
// halfway between; the fort is matched by one more British ship. Laid out at its full size (`widened`:
// maps/index.js widenSea would move the moored line with the Danish base).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1801_04);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a4a58 });
// the Danish ships' names (entities/UnitStack.js shipName), Nelson's for the British
Object.assign(sea, {
  names: {
    nato: {
      battleship: ['Dannebrog'],
      cruiser: ['Prøvesteenen', 'Wagrien', 'Jylland', 'Sjælland', 'Holsteen', 'Indfødsretten', 'Charlotte Amalia', 'Søehesten'],
      frigate: ['Hjælperen', 'Elven', 'Rendsborg', 'Nyborg', 'Kronborg', 'Hajen'],
      shoreBattery: ['Trekroner'],
      ptBoat: ['Kanonbåd 1', 'Kanonbåd 2', 'Kanonbåd 3', 'Kanonbåd 4', 'Kanonbåd 5', 'Kanonbåd 6'],
    },
    pact: {
      battleship: ['London', 'St George'],
      cruiser: ['Elephant', 'Edgar', 'Ganges', 'Monarch', 'Bellona', 'Defiance', 'Russell', 'Agamemnon', 'Polyphemus', 'Ardent', 'Isis', 'Glatton'],
      frigate: ['Amazon', 'Desirée', 'Blanche', 'Alcmene'],
    },
  },
});

/** The Zealand shore (x) at z: the city and its harbour along the west. */
const coastX = (z: number) => -2350 + fbm(noise, z * 0.001, 0.3, 3) * 120 + Math.max(0, z - 1500) * 0.25;
const TREKRONER = [-1500, 1550, 70, 6];
/** The Middle Ground: the sandbank between the King's Deep and the Holland Deep (0..1 across it). */
const middleGround = (x: number, z: number) => {
  const along = Math.max(0, Math.abs(z - 100) - 1150);
  return Math.max(0, 1 - Math.hypot((x + 750 + z * 0.05) / 190, along / 220) + fbm(noise, x * 0.006, z * 0.006, 2) * 0.25);
};

function height(x: number, z: number) {
  let h = -24 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 6;
  h = Math.max(h, shore(coastX(z) - x, 20, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 30));
  const [ix, iz, r, top] = TREKRONER;
  h = Math.max(h, island(r - Math.hypot(x - ix, z - iz), r, top, 0.4, 10));
  const m = middleGround(x, z);
  if (m > 0) h = Math.max(h, h + (-2.2 + Math.min(1.4, m * 2) - h) * Math.min(1, m * 3)); // (shallow sand: a ship of the line runs aground)
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Trekroner', x: -1250, z: 1800, owner: 'nato', sector: 'centre', radius: 170 },
  { id: 'B', name: 'The Danish line', x: -1650, z: 250, owner: null, sector: 'west', radius: 220 },
  { id: 'C', name: 'King\'s Deep', x: -1450, z: -1150, owner: null, sector: 'west', radius: 200 },
  { id: 'D', name: 'Holland Deep', x: 100, z: 200, owner: null, sector: 'east', radius: 220 },
  { id: 'K', name: 'Nelson\'s squadron', x: 500, z: -2450, owner: 'pact', sector: 'centre', radius: 170 },
];

// the Danish line, moored head to the north in the King's Deep: broadsides to the east
const LINE_X = -1650;
const moored = (unit: string, z: number) => ({ unit, x: LINE_X + (z > 0 ? 30 : 0), z, facing: 0, anchored: true });

export default {
  id: 'copenhagen',
  name: 'Copenhagen',
  description: 'April 1801: the Danish line of hulks and floating batteries moored in the King\'s Deep before the city, the Trekroner fort, the Middle Ground shoal outside. Nelson comes up the channel from the south.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 150, speed: 5.5, veer: 0.2 },   // south-south-east: fair up the King's Deep for the British, foul for the Danes to come out
  fow: 0.5,
  sides: { nato: 'Denmark', pact: 'Britain' },
  armies: { nato: ['dk'], pact: ['gb'] }, // (the Royal Danish Navy: maps/index.js armiesOn)
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180104,
  height,
  river: sea,

  theme: {
    // a cold clear spring morning on the Sound
    fogColor: 0xb4c2cc, fogDensity: 0.00018,
    skyTop: 0x5a7ea2, skyHorizon: 0xcad6de, skyBottom: 0x8a9eae,
    sunColor: 0xfff0dc, sunIntensity: 1.9, sunDisk: 0.5,
    clouds: 0.45, cloudLight: 0xf0f2f4, cloudDark: 0x9aa6b2,
    sunDir: [0.5, 0.45, -0.6],
    hemiSky: 0xc8d4e0, hemiGround: 0x56604e, hemiIntensity: 1.25,
    rimColor: 0xe6ecf2, rimIntensity: 0.25,
    terrain: {
      grass: '#5c6a40', grassAlt: '#566238', dryGrass: '#8a8458', dirt: '#6a5c46', rock: '#7a786e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 3) return [0x5e6a42, 1];                          // the Zealand meadows
        return y > -1 ? [0xb8ac86, 1] : [0xb0a07a, 1];            // the beach, the Middle Ground's sand
      },
    },
  },

  bases: { nato: { x: -1700, z: 2650, entries: [-500, 0, 500] }, pact: { x: 500, z: -2750, entries: [-700, 0, 700] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -1500, z: 1200 }, pact: { x: 0, z: -2200 } },
  points,

  spawns: {
    nato: [moored('cruiser', -600), moored('battleship', -150), moored('cruiser', 300), moored('frigate', 700),
      { unit: 'shoreBattery', x: TREKRONER[0], z: TREKRONER[1], facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: -300, z: -2100, facing: 0 }, { unit: 'cruiser', x: -100, z: -2250, facing: 0 }, { unit: 'cruiser', x: 100, z: -2400, facing: 0 },
      { unit: 'cruiser', x: 300, z: -2550, facing: 0 }, { unit: 'frigate', x: 600, z: -2300, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the city along the shore: warehouses on the quays, houses behind, the spires; the Kastellet's ramparts to the north
    for (let i = 0; i < 90; i++) {
      const z = -900 + rand() * 2500, x = coastX(z) - 40 - rand() * 380;
      if (height(x, z) < 2.5) continue;
      if (rand() < 0.3) props.hall({ x, z, yaw: Math.PI / 2, width: 20, depth: 10, height: 8, color: 0x8a5a44, roof: 0x5a3a2e, door: 4, name: 'warehouse' });
      else props.townHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.2, width: 8 + rand() * 4, depth: 9, storeys: 3, damaged: 0 });
    }
    for (const z of [-300, 400, 1000]) props.church({ x: coastX(z) - 260, z, yaw: Math.PI / 2 });
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; props.lowWall({ x: coastX(1900) - 160 + Math.cos(a) * 90, z: 1900 + Math.sin(a) * 90, yaw: a + Math.PI / 2, length: 70, height: 3, color: 0x6a7058 }); }
    // the Trekroner: a round stone fort on its island
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; props.lowWall({ x: TREKRONER[0] + Math.cos(a) * 42, z: TREKRONER[1] + Math.sin(a) * 42, yaw: a + Math.PI / 2, length: 27, height: 3.2, color: 0x8a8478 }); }
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
