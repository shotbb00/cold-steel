// Cape Ortegal, 4 November 1805 (the 1806 sea battles, the campaign's `biscay` zone): two weeks after Trafalgar
// Dumanoir's four ships that got away (Formidable, Duguay-Trouin, Mont-Blanc, Scipion) try for Rochefort round
// the north-west corner of Spain; Strachan's squadron, four of the line and four frigates, runs them down off
// Cape Ortegal — the frigates catch them and hang on their sterns until the line comes up — and takes all four.
// The Bay of Biscay in November: a grey sky, a south-westerly autumn breeze off the land, the long swell. The
// Galician north coast along the south edge, Cape Ortegal and its rocks (the Aguillóns) pushing out in the
// middle, Estaca de Bares further east. Laid out at full size (`widened`). Fair: the homes mirrored west and east,
// the three open zones on the line between them, equally far by sail from both (seapath); the one off the cape is
// out in front of it, not in its lee. The wind across the fleets' line: the French run east on the quarter, the
// British reach west.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1805_11);
const sea = createSea({ level: 0, size: SIZE, color: 0x243e4c });
// the ships' names (entities/UnitStack.js shipName): Dumanoir's and Allemand's French, Strachan's British
Object.assign(sea, {
  names: {
    nato: {
      battleship: ['Majestueux'],
      cruiser: ['Formidable', 'Duguay-Trouin', 'Mont-Blanc', 'Scipion', 'Magnanime', 'Jemmapes', 'Lion', 'Suffren', 'Patriote'],
      frigate: ['Armide', 'Gloire', 'Thétis', 'Infatigable', 'Minerve'],
      destroyer: ['Sylphe', 'Palinure', 'Lynx', 'Faune'],
    },
    pact: {
      battleship: ['Ville de Paris', 'Hibernia'],
      cruiser: ['Caesar', 'Hero', 'Courageux', 'Namur', 'Bellona', 'Montagu', 'Illustrious'],
      frigate: ['Santa Margarita', 'Phoenix', 'Aeolus', 'Révolutionnaire'],
      destroyer: ['Nimble', 'Fly', 'Kangaroo', 'Hazard'],
    },
  },
});

/** The north Galician coast's line (z) at x: Cape Ortegal pushing out north in the middle, Estaca de Bares to the east. */
const coastZ = (x: number) => 2350 + fbm(noise, x * 0.0011, 1.7, 3) * 150 - 715 * Math.max(0, 1 - ((x + 50) / 640) ** 2) ** 1.5 - 380 * Math.max(0, 1 - ((x - 1750) / 330) ** 2) ** 1.5;
const CAPE = { x: -50, z: 1640 };

function height(x: number, z: number) {
  let h = -65 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 10;
  h = Math.max(h, shore(z - coastZ(x), 260 + fbm(noise, x * 0.002, z * 0.002, 3) * 110, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 12));
  // the Aguillóns: the stacks off the cape's point
  const r = Math.hypot(x - CAPE.x, (z - (CAPE.z - 160)) * 1.3);
  if (r < 120) h = Math.max(h, -2 + (120 - r) / 120 * 14 + fbm(noise, x * 0.04, z * 0.04, 2) * 4);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Dumanoir’s four', x: -1650, z: -300, owner: 'nato', sector: 'west', radius: 170 },
  { id: 'B', name: 'Out in the Bay', x: 0, z: -1450, owner: null, sector: 'centre', radius: 200 },
  { id: 'C', name: 'The chase', x: 0, z: -350, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'Off Cape Ortegal', x: 0, z: 750, owner: null, sector: 'centre', radius: 190 },
  { id: 'K', name: 'Strachan’s squadron', x: 1650, z: -300, owner: 'pact', sector: 'east', radius: 170 },
];

// a squadron in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});

export default {
  id: 'cape-ortegal',
  name: 'Cape Ortegal',
  description: 'Off Cape Ortegal, 4 November 1805: Strachan’s squadron runs down Dumanoir’s four ships that escaped Trafalgar. The Bay of Biscay under a grey autumn sky, the Galician cliffs and the cape’s rocks to the south.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'europe',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  wind: { from: 205, speed: 8, veer: 0.3 },     // south-south-west, an autumn breeze off the land (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180511,
  height,
  river: sea,

  theme: {
    // November in the Bay: low grey cloud, a cold light
    fogColor: 0x96a2aa, fogDensity: 0.00024,
    skyTop: 0x5c6872, skyHorizon: 0xaab4ba, skyBottom: 0x76828a,
    sunColor: 0xeae6dc, sunIntensity: 1.35, sunDisk: 0.2,
    clouds: 0.8, cloudLight: 0xd6dbde, cloudDark: 0x6a747a,
    sunDir: [-0.3, 0.4, 0.6],
    hemiSky: 0xb4bec4, hemiGround: 0x4c5446, hemiIntensity: 1.2,
    rimColor: 0xd0d8dc, rimIntensity: 0.2,
    terrain: {
      grass: '#58683e', grassAlt: '#5e6c42', dryGrass: '#8a7e56', dirt: '#6a5e4a', rock: '#7c7a72',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 60) return [0x7a6a4c, 1];                       // bracken gone brown on the heights (the Serra da Capelada)
        if (y > 10) return [0x56663c, 1];                       // the green coastal pasture
        return y > 0.5 ? [0x6e6c66, 1] : [0x5c5a54, 1];         // dark slate cliffs, wet at the water
      },
    },
  },

  bases: { nato: { x: -1950, z: -300, entries: [-600, 0, 600] }, pact: { x: 1950, z: -300, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -1300, z: -300 }, pact: { x: 1300, z: -300 } },
  points,

  spawns: {
    nato: line(['cruiser', 'cruiser', 'cruiser', 'cruiser'], -1500, -350, Math.PI / 2),
    pact: line(['cruiser', 'cruiser', 'frigate', 'cruiser', 'frigate'], 1500, -350, -Math.PI / 2),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // a watch post on the cape, the chapel of San Andrés de Teixido on the cliffs west of it, Cariño's houses in the ría to the west
    props.tower({ x: CAPE.x, z: coastZ(CAPE.x) + 110 });
    props.church({ x: -900, z: coastZ(-900) + 260, yaw: 0 });
    for (let i = 0; i < 14; i++) {
      const x = -1700 + rand() * 500, z = coastZ(x) + 60 + rand() * 180;
      if (height(x, z) > 3 && height(x, z) < 45) props.house({ x, z, yaw: (rand() - 0.5) * 0.6, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.tower({ x: 1750, z: coastZ(1750) + 90 });               // the watch post on Estaca de Bares
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 600, broadleaf: 0.6, autumn: 0.6, maxY: 200, size: 1.1,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 8 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
