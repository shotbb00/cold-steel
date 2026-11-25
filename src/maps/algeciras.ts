// Algeciras, July 1801 — the Strait of Gibraltar (the 1806 sea battles, the campaign's `alboran` zone): Linois'
// three French ships of the line, beaten back into Algeciras roads by Saumarez on 6 July (Hannibal aground and
// taken), are joined by the Spanish squadron from Cádiz — the first-rates Real Carlos and San Hermenegildo, San
// Fernando, Argonauta, San Agustín — and on 12 July the combined squadron sails for Cádiz; Saumarez, refitted at
// Gibraltar in four days, comes after them through the Strait. In the night action Superb runs between the two
// Spanish three-deckers, they fire into each other and both blow up; Formidable fights off Venerable. Here the
// Franco-Spanish squadron stands out of the bay and Saumarez's ships come up the Strait to meet it. The Spanish
// shore along the north edge: Algeciras and the Isla Verde on the west side of the bay, Punta Carnero, the Rock of
// Gibraltar (426 m) on the east side with the town under it and Europa Point at its foot; the African shore along
// the south edge — Jebel Musa in the west, Ceuta on its peninsula under Monte Hacho in the east. Laid out at full
// size (`widened`). Fair: the homes mirrored north and south — the French off the bay's mouth, the British out
// toward the African side — the three open zones across the middle of the Strait, equally far by sail from both
// (seapath); no zone in the bay, none near either shore. The levanter blows down the Strait from the east,
// across the fleets' line: both have it abeam. Spain's ships sail as the French (data/units1806/ships.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1801_07);
const sea = createSea({ level: 0, size: SIZE, color: 0x1e4f74 });
// the ships' names (entities/UnitStack.js shipName): Saumarez's British (the French and the Spanish name their own: data/units1806/ships.js, westNavies.js)
Object.assign(sea, {
  names: {
    pact: {
      battleship: ['Caesar'],
      cruiser: ['Pompee', 'Spencer', 'Venerable', 'Superb', 'Audacious', 'Hannibal', 'Powerful', 'Gibraltar'],
      frigate: ['Thames', 'Carysfort', 'Phoebe', 'Emerald', 'Medusa', 'Niger'],
      destroyer: ['Calpe', 'Louisa', 'Speedy', 'Kangaroo', 'Peterel', 'Bonne Citoyenne'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4', 'Gun-boat 5', 'Gun-boat 6'],
      fireship: ['Prometheus', 'Comet', 'Etna'],
    },
  },
});

// the Spanish shore (north): Punta Carnero and the Rock jut south, the bay cut deep in between
const CARNERO = -800, ROCK = 900;
const coastN = (x: number) => -2050 + fbm(noise, x * 0.0012, 3.1, 3) * 90
  + 450 * Math.max(0, 1 - ((x - CARNERO) / 380) ** 2)            // Punta Carnero
  + 520 * Math.max(0, 1 - ((x - ROCK) / 280) ** 2) ** 0.7         // the Rock's peninsula, Europa Point at its foot
  - 950 * Math.max(0, 1 - (x / 560) ** 2) ** 0.8;                 // the Bay of Gibraltar
// the African shore (south): Jebel Musa's spur in the west, Ceuta's peninsula and Monte Hacho in the east
const coastS = (x: number) => 2150 + fbm(noise, x * 0.0012, 7.3, 3) * 90
  - 380 * Math.max(0, 1 - ((x + 900) / 450) ** 2)
  - 430 * Math.max(0, 1 - ((x - 1000) / 300) ** 2);

// (fixed shore points, worked out once)
const ROCK_Z = coastN(ROCK) - 380, ISLA_Z = coastN(-380) + 120;
const PEAKS = [[-1000, 520, 520], [1000, 200, 230]].map(([mx, top, r]) => [mx, coastS(mx) + r * 0.8, top, r]);

function height(x: number, z: number) {
  let h = -110 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 16;
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  h = Math.max(h, shore(z < 0 ? coastN(x) - z : z - coastS(x), 150 + fbm(noise, x * 0.0015, z * 0.0015, 3) * 90, n, 14));
  // the Rock: a limestone ridge running north from Europa Point, sheer on its east face
  const rx = x - ROCK, rz = z - ROCK_Z;
  const along = Math.max(0, 1 - Math.abs(rz) / 720), across = Math.max(0, 1 - Math.abs(rx) * (rx > 0 ? 3.4 : 1.5) / 420);
  if (along > 0 && across > 0) h = Math.max(h, 426 * Math.min(1, along * 2.2) ** 1.5 * across ** 1.3 * (0.9 + fbm(noise, x * 0.008, z * 0.008, 2) * 0.12));
  // Jebel Musa over the African shore, Monte Hacho over Ceuta
  for (const [mx, mz, top, r] of PEAKS) {
    const m = Math.max(0, 1 - Math.hypot(x - mx, z - mz) / r);
    if (m > 0) h = Math.max(h, top * m ** 1.1);
  }
  // the Isla Verde off Algeciras, inside the bay
  const iv = Math.hypot(x + 380, z - ISLA_Z);
  if (iv < 50) h = Math.max(h, -1 + (50 - iv) / 50 * 9);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Off Algeciras', x: 0, z: -1350, owner: 'nato', sector: 'centre', radius: 170 },
  { id: 'B', name: 'Towards Tarifa', x: -1300, z: 0, owner: null, sector: 'west', radius: 200 },
  { id: 'C', name: 'Mid-Strait', x: 0, z: 0, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'Off Europa Point', x: 1300, z: 0, owner: null, sector: 'east', radius: 200 },
  { id: 'K', name: 'Saumarez’s squadron', x: 0, z: 1350, owner: 'pact', sector: 'centre', radius: 170 },
];

// a squadron in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});

export default {
  id: 'algeciras',
  name: 'Algeciras',
  description: 'The Strait of Gibraltar, July 1801: the Franco-Spanish squadron stands out of Algeciras for Cádiz and Saumarez comes up the Strait after it, in a hard levanter. The Bay of Gibraltar and the Rock to the north, Jebel Musa and Ceuta on the African shore to the south.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 90, speed: 11, veer: 0.15 },   // the levanter: east, hard and steady down the Strait (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'France and Spain', pact: 'Britain' },
  armies: { nato: ['fr', 'es'], pact: ['gb'] }, // (Linois' French and Moreno's Spaniards in the Armada Española's own ships: data/units1806/westNavies.js)
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180107,
  height,
  river: sea,

  theme: {
    // a levanter day in July: a humid haze in the Strait, the sea dark blue and whipped white
    fogColor: 0xc2cad2, fogDensity: 0.00018,
    skyTop: 0x4a78a8, skyHorizon: 0xd0d8de, skyBottom: 0x8ea8be,
    sunColor: 0xfff2dc, sunIntensity: 2.0, sunDisk: 0.5,
    clouds: 0.35, cloudLight: 0xffffff, cloudDark: 0xb2bcc6,
    sunDir: [0.2, 0.7, 0.5],
    hemiSky: 0xc8d6e4, hemiGround: 0x6e6648, hemiIntensity: 1.25,
    rimColor: 0xf2f4f6, rimIntensity: 0.25,
    terrain: {
      grass: '#76763e', grassAlt: '#7e7c44', dryGrass: '#b0a066', dirt: '#9c7e58', rock: '#c8c0ae',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 140) return [0xc6beac, 1];                       // the Rock's and Jebel Musa's bare limestone
        if (y > 25) return [0x6c6c3a, 1];                        // the scrub and cork oak on the hills
        if (y > 4) return [0xb8a274, 1];                         // summer-dry fields
        return y > 0.5 ? [0xd2c29c, 1] : [0xa49270, 1];          // the sand, wet at the water
      },
    },
  },

  bases: { nato: { x: 0, z: -1650, entries: [-500, 0, 500] }, pact: { x: 0, z: 1650, entries: [-500, 0, 500] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 0, z: -1100 }, pact: { x: 0, z: 1100 } },
  points,

  spawns: {
    nato: line(['frigate', 'cruiser', 'cruiser', 'frigate'], 0, -1250, 0),
    pact: line(['frigate', 'cruiser', 'cruiser', 'frigate'], 0, 1250, Math.PI),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const inN = (x: number, k: number) => coastN(x) - k;
    // Algeciras: the white town on the bay's west shore, its church; the San García tower on Punta Carnero
    for (let i = 0; i < 60; i++) {
      const x = -620 + rand() * 260, z = inN(x, 40 + rand() * 300);
      if (height(x, z) > 3 && height(x, z) < 60) props.townHouse({ x, z, yaw: (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8, storeys: 2, damaged: 0 });
    }
    props.church({ x: -480, z: inN(-480, 200), yaw: Math.PI / 2 });
    props.tower({ x: CARNERO, z: inN(CARNERO, 60) });
    // Gibraltar: the town on the Rock's west side, the Moorish castle, the King's Bastion, the signal station on the top
    for (let i = 0; i < 60; i++) {
      const z = inN(ROCK, 200 + rand() * 500), x = ROCK - 240 + rand() * 120;
      if (height(x, z) > 3 && height(x, z) < 90) props.townHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8, storeys: 2 + Math.floor(rand() * 2), damaged: 0 });
    }
    props.tower({ x: ROCK - 200, z: inN(ROCK, 650) });
    props.tower({ x: ROCK, z: inN(ROCK, 30) });              // Europa Point
    props.church({ x: ROCK - 180, z: inN(ROCK, 420), yaw: Math.PI / 2 });
    // Ceuta on its neck of land, the fortress on Monte Hacho
    for (let i = 0; i < 40; i++) {
      const x = 600 + rand() * 300, z = coastS(x) + 40 + rand() * 200;
      if (height(x, z) > 3 && height(x, z) < 60) props.townHouse({ x, z, yaw: (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8, storeys: 2, damaged: 0 });
    }
    props.tower({ x: 1000, z: coastS(1000) + 180 });
    props.church({ x: 750, z: coastS(750) + 150, yaw: 0 });
    props.finish();
    // cork oak, wild olive and pine on the hills
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 700, broadleaf: 0.5, autumn: 0, maxY: 300, size: 0.85,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 || (x > -650 && x < -350 && z < 0) || (x > ROCK - 300 && x < ROCK + 300 && z < 0) || (x > 550 && x < 950 && z > 0) }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
