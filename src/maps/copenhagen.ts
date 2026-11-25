// Copenhagen, 2 April 1801 (the 1806 sea battles; the city's waters again in 1807): the Danish line of blockships,
// old hulks and floating batteries moored in the King's Deep along the city front and the north tip of Amager, the
// Trekroner fort on its island at the line's north end, the long sandbank of the Middle Ground outside them; east of
// the shoal the Holland Deep, and beyond it the low grazing island of Saltholm in its wide flats, the Drogden between
// it and Amager the south way in. Laid out from the real waters (north at z < 0): Zealand and the city on the west
// with Kastellet's ramparts at the harbour mouth, the harbour channel running in between the city and Amager, Amager's
// low east shore down the south-west. Nelson took his squadron down the Holland Deep in the night, round the shoal's
// south end, and came up the King's Deep with the wind in the south-east, anchored by the stern abreast of the Danish
// line and fought it gun to gun for four hours — three of his ships went aground on the Middle Ground. The Danes (the
// `nato` side: the Royal Danish Navy, army `dk` — the French hulls' stats under the Danish flag, data/units1806/ships.js)
// start moored (spawn `anchored`), their home north of the fort; the British come up from the south. The fort is only
// scenery (sea maps are pure sea battles). Fair by the sailing routes (seapath): the line in the King's Deep as near the
// Danes as its south entrance is to the British, the Holland Deep halfway round the shoal. Laid out at its full size
// (`widened`: maps/index.js widenSea would move the moored line with the Danish base).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
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
      ptBoat: ['Kanonbåd 1', 'Kanonbåd 2', 'Kanonbåd 3', 'Kanonbåd 4', 'Kanonbåd 5', 'Kanonbåd 6'],
    },
    pact: {
      battleship: ['London', 'St George'],
      cruiser: ['Elephant', 'Edgar', 'Ganges', 'Monarch', 'Bellona', 'Defiance', 'Russell', 'Agamemnon', 'Polyphemus', 'Ardent', 'Isis', 'Glatton'],
      frigate: ['Amazon', 'Desirée', 'Blanche', 'Alcmene'],
    },
  },
});

const HARBOUR = { n: -330, s: -130 };                    // the harbour channel between the city (north) and Amager (south)
/** The Zealand shore (x) at z: the city front, the coast falling back west to the north past Kastellet, Amager's east shore to the south. */
const coastX = (z: number) => z < HARBOUR.s
  ? -2250 + fbm(noise, z * 0.001, 0.3, 3) * 90 - Math.max(0, -1700 - z) * 0.35
  : -1950 + fbm(noise, z * 0.0012, 2.3, 3) * 110 - Math.max(0, z - 1500) * 0.12;
const TREKRONER = [-1560, -1450, 70, 6];
/** The Middle Ground: the long sandbank between the King's Deep and the Holland Deep (0..1 across it). */
const middleGround = (x: number, z: number) => {
  const along = Math.max(0, Math.abs(z + 50) - 1250);
  return Math.max(0, 1 - Math.hypot((x + 720 - (z + 50) * 0.06) / 170, along / 240) + fbm(noise, x * 0.006, z * 0.006, 2) * 0.25);
};
/** Saltholm: the flat grazing island east of the Holland Deep, in its wide shallow flats (> 0 inside the flats). */
const SALT = { x: 2050, z: 950 };
const saltholm = (x: number, z: number) => {
  const u = (x - SALT.x) * 0.94 + (z - SALT.z) * 0.34, v = -(x - SALT.x) * 0.34 + (z - SALT.z) * 0.94;
  return 1 - Math.hypot(u / 820, v / 1350) + fbm(noise, x * 0.002, z * 0.002, 3) * 0.12;
};

function height(x: number, z: number) {
  // the Sound: twelve to twenty metres, the King's Deep and the Holland Deep a little deeper than the rest
  let h = -16 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 5;
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  // Zealand and the city: the old town a few metres above the harbour, the land rising gently west; Amager lower
  let d = coastX(z) - x;
  if (z > HARBOUR.n && z < HARBOUR.s && x > -2800) d = Math.min(d, -Math.min(z - HARBOUR.n, HARBOUR.s - z) * 0.5);  // the harbour channel
  h = Math.max(h, shore(d, z < HARBOUR.s ? 22 : 8, n, 30));
  const [ix, iz, r, top] = TREKRONER;
  h = Math.max(h, island(r - Math.hypot(x - ix, z - iz), r, top, 0.4, 10));
  // the Middle Ground: shallow sand a ship of the line runs aground on
  const m = middleGround(x, z);
  if (m > 0) h = Math.max(h, h + (-2.2 + Math.min(1.4, m * 2) - h) * Math.min(1, m * 3));
  // Saltholm and its flats: two metres of salt meadow at most, the flats awash for half a kilometre round it
  const s = saltholm(x, z);
  if (s > -0.45) {
    const flat = Math.min(1, (s + 0.45) / 0.25);
    h = Math.max(h, h + (-2 - h) * flat);
    if (s > 0) h = Math.max(h, shore(s * 900, 3, n, 80));
  }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Trekroner', x: -1250, z: -1750, owner: 'nato', sector: 'west', radius: 170 },
  { id: 'B', name: 'The Danish line', x: -1372, z: 701, owner: null, sector: 'west', radius: 220 },
  { id: 'C', name: 'Off the Saltholm flats', x: 1296, z: -514, owner: null, sector: 'east', radius: 200 },
  { id: 'D', name: 'Holland Deep', x: 154, z: -286, owner: null, sector: 'centre', radius: 220 },
  { id: 'K', name: 'Nelson\'s squadron', x: -350, z: 2450, owner: 'pact', sector: 'centre', radius: 170 },
];

// the Danish line, moored head to the north in the King's Deep: broadsides to the east
const LINE_X = -1460;
const moored = (unit: string, z: number) => ({ unit, x: LINE_X - (z < -500 ? 20 : 0), z, facing: Math.PI, anchored: true });

export default {
  id: 'copenhagen',
  name: 'Copenhagen',
  description: 'April 1801: the Danish line of hulks and floating batteries moored in the King\'s Deep before the city, the Trekroner fort at its head, the Middle Ground shoal outside and low Saltholm beyond the Holland Deep. Nelson comes up the channel from the south.',
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
    sunDir: [0.5, 0.45, 0.6],
    hemiSky: 0xc8d4e0, hemiGround: 0x56604e, hemiIntensity: 1.25,
    rimColor: 0xe6ecf2, rimIntensity: 0.25,
    terrain: {
      grass: '#5c6a40', grassAlt: '#566238', dryGrass: '#8a8458', dirt: '#6a5c46', rock: '#7a786e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (saltholm(x, z) > 0.05 && y > 0.5) return y > 1.6 ? [0x7a8456, 1] : [0x98946a, 1]; // Saltholm's salt meadow
        if (y > 3) return [0x5e6a42, 1];                          // the Zealand and Amager meadows
        return y > -1 ? [0xb8ac86, 1] : [0xb0a07a, 1];            // the beach, the Middle Ground's sand
      },
    },
  },

  bases: { nato: { x: -1500, z: -2550, entries: [-500, 0, 500] }, pact: { x: -350, z: 2750, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -1300, z: -1300 }, pact: { x: -400, z: 2100 } },
  points,

  spawns: {
    nato: [moored('cruiser', -900), moored('battleship', -450), moored('cruiser', 0), moored('frigate', 400)],
    pact: [{ unit: 'cruiser', x: -650, z: 2150, facing: Math.PI }, { unit: 'cruiser', x: -450, z: 2300, facing: Math.PI },
      { unit: 'cruiser', x: -250, z: 2450, facing: Math.PI }, { unit: 'frigate', x: -50, z: 2300, facing: Math.PI }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the city along the front north of the harbour: warehouses on the quays, houses behind, the spires; Kastellet to the north
    for (let i = 0; i < 100; i++) {
      const z = -1600 + rand() * 1250, x = coastX(z) - 50 - rand() * 420;
      if (height(x, z) < 2.5) continue;
      if (rand() < 0.3) props.hall({ x, z, yaw: Math.PI / 2, width: 20, depth: 10, height: 8, color: 0x8a5a44, roof: 0x5a3a2e, door: 4, name: 'warehouse' });
      else props.townHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.2, width: 8 + rand() * 4, depth: 9, storeys: 3, damaged: 0 });
    }
    for (const z of [-1150, -800, -500]) props.church({ x: coastX(z) - 300, z, yaw: Math.PI / 2 });
    const kz = -1850;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; props.lowWall({ x: coastX(kz) - 170 + Math.cos(a) * 90, z: kz + Math.sin(a) * 90, yaw: a + Math.PI / 2, length: 70, height: 3, color: 0x6a7058 }); }
    // Christianshavn and Amager's market-garden villages across the harbour
    for (let i = 0; i < 40; i++) {
      const z = HARBOUR.s + 60 + rand() * (i < 25 ? 400 : 2400), x = coastX(z) - 60 - rand() * 500;
      if (height(x, z) > 2.5) props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.4, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    // the Trekroner: a round stone fort on its island
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; props.lowWall({ x: TREKRONER[0] + Math.cos(a) * 42, z: TREKRONER[1] + Math.sin(a) * 42, yaw: a + Math.PI / 2, length: 27, height: 3.2, color: 0x8a8478 }); }
    // the herdsmen's farm on Saltholm
    for (let i = 0; i < 5; i++) { const x = SALT.x - 200 + rand() * 300, z = SALT.z - 300 + rand() * 300; if (height(x, z) > 1) props.house({ x, z, yaw: rand() * Math.PI, width: 7, depth: 5 }); }
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 260, broadleaf: 0.9, autumn: 0, maxY: 40, size: 1,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 4 || x > coastX(z) - 500 || saltholm(x, z) > -0.5 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
