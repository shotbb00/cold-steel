// Lissa, 13 March 1811 (the 1806 sea battles, the campaign's `adriatic` zone): Dubourdieu's Franco-Venetian frigate
// squadron (Favorite, Flore, Danaé, the Venetian Corona and Bellona, Carolina, brigs and small craft) comes over
// from Ancona to throw the British out of Lissa; Hoste's four frigates (Amphion, Active, Cerberus, Volage) form a
// close line off Port St George and wait. Dubourdieu runs down before the wind in two columns, Nelson-fashion — and
// Hoste hoists "Remember Nelson", steers his line along the island's reefs and rakes the columns as they come;
// Favorite runs ashore and burns, Dubourdieu dies, Corona and Bellona strike. The Adriatic in early spring: the island
// of Vis (Lissa) in the south-east with the Hum over it, Port St George's bay on its north shore and Komiža on the
// west; open water everywhere else. Laid out at full size (`widened`). Fair: the homes mirrored west and east, the
// three open zones on the line between them, equally far by sail from both (seapath); the island lies off to one
// side, no zone near its shore or in its lee. The wind from the north-north-west across the fleets' line: both
// reach — the French run down on the quarter as they did, the British have it abeam.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1811_03);
const sea = createSea({ level: 0, size: SIZE, color: 0x1e5470 });
// the ships' names (entities/UnitStack.js shipName): Dubourdieu's French and Venetian (Kingdom of Italy) squadron, Hoste's British
Object.assign(sea, {
  names: {
    nato: {
      cruiser: ['Rivoli', 'Rigeneratore', 'Castiglione'],
      frigate: ['Favorite', 'Flore', 'Danaé', 'Corona', 'Bellona', 'Carolina', 'Uranie', 'Pomone'],
      destroyer: ['Mercure', 'Principessa Augusta', 'Eugenio', 'Iena', 'Lodola', 'Mamelucco'],
      ptBoat: ['Cannoniera 1', 'Cannoniera 2', 'Cannoniera 3', 'Cannoniera 4', 'Cannoniera 5', 'Cannoniera 6'],
      fireship: ['Brûlot 1', 'Brûlot 2', 'Brûlot 3'],
    },
    pact: {
      cruiser: ['Eagle', 'Victorious', 'Montagu', 'Achille'],
      frigate: ['Amphion', 'Active', 'Cerberus', 'Volage', 'Unité', 'Bacchante', 'Alceste', 'Thames'],
      destroyer: ['Weazle', 'Acorn', 'Kingfisher', 'Imogen', 'Saracen', 'Wizard'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4'],
      fireship: ['Prometheus', 'Comet', 'Etna'],
    },
  },
});

/** Vis: its centre and radius (x stretched: the island lies east-west), the bay of Port St George cut into its north shore. */
const VIS = { x: 2150, z: 1900, r: 900 };
const BAY = { x: 2350, z: 1050 };
const visD = (x: number, z: number) => VIS.r * (1 + fbm(noise, x * 0.0016, z * 0.0016, 3) * 0.18) - Math.hypot((x - VIS.x) * 0.72, z - VIS.z);

function height(x: number, z: number) {
  let h = -110 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 16;
  // Vis: limestone cliffs, the Hum (587 m) to the west of the middle
  let d = visD(x, z);
  const bay = Math.hypot((x - BAY.x) * 1.4, z - BAY.z);
  if (bay < 320) d -= (320 - bay) * 1.1;
  h = Math.max(h, island(d, VIS.r, 280 + fbm(noise, x * 0.003, z * 0.003, 2) * 60, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 12));
  // Host and the reefs off the bay's mouth that Hoste's line ran along
  const r = Math.hypot(x - BAY.x - 60, z - BAY.z + 240);
  if (r < 45) h = Math.max(h, -2 + (45 - r) / 45 * 12);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Dubourdieu’s squadron', x: -1650, z: -500, owner: 'nato', sector: 'west', radius: 170 },
  { id: 'B', name: 'Towards Ancona', x: 0, z: -1650, owner: null, sector: 'centre', radius: 200 },
  { id: 'C', name: 'The two columns', x: 0, z: -500, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'The line of battle', x: 0, z: 650, owner: null, sector: 'centre', radius: 200 },
  { id: 'K', name: 'Off Port St George', x: 1650, z: -500, owner: 'pact', sector: 'east', radius: 170 },
];

// a squadron in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});

export default {
  id: 'lissa',
  name: 'Lissa',
  description: 'Off Lissa, 13 March 1811: Dubourdieu’s French and Venetian frigates run down in two columns on Hoste’s four, formed in line off the island — “Remember Nelson”. The Adriatic in early spring, the island of Vis with Port St George to the south-east.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'italy',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 340, speed: 7, veer: 0.25 },   // north-north-west, a fresh spring breeze (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 181103,
  height,
  river: sea,

  theme: {
    // a March morning in the Adriatic: clear, a cool light, the sea deep blue
    fogColor: 0xbcccda, fogDensity: 0.00015,
    skyTop: 0x3c70a8, skyHorizon: 0xc6d6e4, skyBottom: 0x84a2bc,
    sunColor: 0xfff0d8, sunIntensity: 1.9, sunDisk: 0.55,
    clouds: 0.3, cloudLight: 0xfafbfc, cloudDark: 0xa8b4c0,
    sunDir: [0.5, 0.45, 0.55],
    hemiSky: 0xc8d8e8, hemiGround: 0x5e6046, hemiIntensity: 1.2,
    rimColor: 0xeef2f6, rimIntensity: 0.25,
    terrain: {
      grass: '#5e6a3c', grassAlt: '#687240', dryGrass: '#9a9064', dirt: '#8a6e50', rock: '#c2baa8',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 200) return [0xb4ac98, 1];                       // the Hum's bare limestone
        if (y > 25) return [0x5a6438, 1];                        // the maquis, the vineyards in the valleys
        if (y > 4) return [0xbcb4a0, 1];                         // the white limestone shore
        return y > 0.5 ? [0xccc2aa, 1] : [0x9a9280, 1];          // the shingle, wet at the water
      },
    },
  },

  bases: { nato: { x: -1950, z: -500, entries: [-600, 0, 600] }, pact: { x: 1950, z: -500, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -1300, z: -500 }, pact: { x: 1300, z: -500 } },
  points,

  spawns: {
    nato: line(['frigate', 'frigate', 'frigate', 'frigate'], -1500, -530, Math.PI / 2),
    pact: line(['frigate', 'frigate', 'frigate', 'frigate'], 1500, -530, -Math.PI / 2),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // Port St George: the stone town round the head of its bay, the church on the point; Komiža on the west shore
    for (let i = 0; i < 50; i++) {
      const a = Math.PI * (0.15 + rand() * 0.7), x = BAY.x + Math.cos(a) * (250 + rand() * 120), z = BAY.z + Math.sin(a) * (200 + rand() * 120);
      if (height(x, z) > 3 && height(x, z) < 120) props.townHouse({ x, z, yaw: a + Math.PI / 2, width: 7 + rand() * 3, depth: 8, storeys: 2, damaged: 0 });
    }
    props.church({ x: BAY.x - 250, z: BAY.z + 60, yaw: 0 });
    props.tower({ x: BAY.x + 280, z: BAY.z + 10 });              // the Venetian watch tower on the bay's east point
    for (let i = 0; i < 24; i++) {
      const x = VIS.x - 1150 + rand() * 200, z = VIS.z - 250 + rand() * 500;
      if (height(x, z) > 3 && height(x, z) < 45) props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.4, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.church({ x: VIS.x - 980, z: VIS.z + 40, yaw: Math.PI / 2 });
    props.finish();
    // the maquis: holm oak and Aleppo pine, low on the slopes
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 700, broadleaf: 0.5, autumn: 0, maxY: 260, size: 0.8,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 || Math.hypot(x - BAY.x, z - BAY.z) < 420 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
