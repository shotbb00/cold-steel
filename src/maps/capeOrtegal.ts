// Cape Ortegal, 4 November 1805 (the 1806 sea battles, the campaign's `biscay` zone): two weeks after Trafalgar
// Dumanoir's four ships that got away (Formidable, Duguay-Trouin, Mont-Blanc, Scipion) try for Rochefort round
// the north-west corner of Spain; Strachan's squadron, four of the line and four frigates, runs them down off
// Cape Ortegal — the frigates catch them and hang on their sterns until the line comes up — and takes all four.
// The Bay of Biscay in November: a grey sky, a south-westerly autumn breeze off the land, the long swell. Laid out
// from the real coast (north at z < 0): the corner of Galicia, where the coast from Ferrol and Cedeira runs up from
// the south-west to Cape Ortegal — the Serra da Capelada, the highest sea cliffs in Europe, falling into the sea
// along the cape, its narrow ridge running out north-north-east to the stacks of the Aguillóns; the Ría de Cedeira cut
// deep into the land west of the massif; east of the cape the wide mouth of the Ría de Ortigueira with Cariño under
// the cape's lee; beyond it Estaca de Bares, Spain's northernmost point, a narrow headland with its watch post, and
// the coast falling back east of it toward the Ría do Barqueiro. Laid out at full size (`widened`). Fair by the
// sailing routes (seapath): the French come down from the north-east, the British up from the south-west along the
// coast; every zone — off the Aguillóns, the chase out in the Bay, the mouth of the Ortigueira bay between the capes — as far by sail from both.
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

/** The coast north-east of Cedeira (z) at x, running up from the south-west to the cape's root. */
const westZ = (x: number) => 620 + (-650 - x) * 0.62 + fbm(noise, x * 0.0014, 1.7, 3) * 90;
/** The Ortigueira bay's west shore (x) at z, under the cape's lee. */
const bayX = (z: number) => -650 + Math.max(0, z - 620) * 0.35 + fbm(noise, z * 0.0014, 2.9, 3) * 60;
/** The Ortigueira bay's head and the coast east of Bares (z) at x. */
const bayZ = (x: number) => 2350 - Math.max(0, x - 1900) * 0.2 + fbm(noise, x * 0.0014, 4.1, 3) * 90;
/** A headland: metres inside a tapering ridge from its root to its point. */
const headland = (x: number, z: number, r0: { x: number; z: number }, t0: { x: number; z: number }, w0: number, w1: number) => {
  const dx = t0.x - r0.x, dz = t0.z - r0.z, t = Math.max(0, Math.min(1, ((x - r0.x) * dx + (z - r0.z) * dz) / (dx * dx + dz * dz)));
  return w0 + (w1 - w0) * t - Math.hypot(x - r0.x - dx * t, z - r0.z - dz * t);
};
const CAPE = { x: -470, z: -260 }, CAPE_ROOT = { x: -850, z: 950 };
const BARES = { x: 1700, z: 160 }, BARES_ROOT = { x: 1780, z: 2300 };
const CEDEIRA = -2250;                                      // x of the Ría de Cedeira's mouth
/** Metres inland (negative: out at sea). */
const landD = (x: number, z: number) => Math.max(
  Math.min((z - westZ(x)) / 1.18, bayX(z) - x),
  z - bayZ(x),
  headland(x, z, CAPE_ROOT, CAPE, 430, 150),
  headland(x, z, BARES_ROOT, BARES, 430, 170),
);

function height(x: number, z: number) {
  let h = -70 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 10 + Math.max(0, z + 800) * 0.01;
  const wob = fbm(noise, x * 0.002, z * 0.002, 3), n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  let d = landD(x, z) + wob * 60;
  // the Ría de Cedeira: a narrow drowned valley running in south-east from its mouth
  const c0 = westZ(CEDEIRA), along = z - c0;
  if (along > -150 && along < 950) d = Math.min(d, Math.abs(x - CEDEIRA - along * 0.35) - 90 - Math.max(0, 450 - along) * 0.3);
  // the heights: the Serra da Capelada over the cape, lower hills behind Bares, the coast's plateau elsewhere
  const top = 70 + 330 * Math.max(0, 1 - Math.hypot((x + 1050) / 850, (z - 1050) / 1100)) + 90 * Math.max(0, 1 - Math.hypot((x - 1750) / 300, (z - 900) / 800)) + wob * 30;
  h = Math.max(h, shore(d, top, n, 10));
  // the Aguillóns: the stacks off the cape's point
  for (const [sx, sz, sr] of [[-520, -440, 55], [-450, -520, 40], [-590, -400, 30]]) {
    const r = Math.hypot(x - sx, z - sz);
    if (r < sr) h = Math.max(h, -2 + (sr - r) / sr * 22 + fbm(noise, x * 0.04, z * 0.04, 2) * 4);
  }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Dumanoir’s four', x: 1950, z: -2050, owner: 'nato', sector: 'east', radius: 170 },
  { id: 'B', name: 'Off the Aguillóns', x: -174, z: -1014, owner: null, sector: 'centre', radius: 190 },
  { id: 'C', name: 'The chase', x: -832, z: -2229, owner: null, sector: 'west', radius: 200 },
  { id: 'D', name: 'The Ortigueira mouth', x: 54, z: 617, owner: null, sector: 'east', radius: 190 },
  { id: 'K', name: 'Strachan’s squadron', x: -2250, z: -250, owner: 'pact', sector: 'west', radius: 170 },
];

// a squadron in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});

export default {
  id: 'cape-ortegal',
  name: 'Cape Ortegal',
  description: 'Off Cape Ortegal, 4 November 1805: Strachan’s squadron runs down Dumanoir’s four ships that escaped Trafalgar. The Bay of Biscay under a grey autumn sky; the corner of Galicia, the Capelada’s sea cliffs and the cape’s stacks, the Ortigueira bay and Estaca de Bares to the south.',
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

  bases: { nato: { x: 2300, z: -2350, entries: [-500, 0, 500] }, pact: { x: -2550, z: -450, entries: [-400, 0, 400] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 1500, z: -1600 }, pact: { x: -1700, z: -300 } },
  points,

  spawns: {
    nato: line(['cruiser', 'cruiser', 'cruiser', 'cruiser'], 1850, -1850, -Math.PI / 4),
    pact: line(['cruiser', 'cruiser', 'frigate', 'cruiser', 'frigate'], -2050, -350, Math.PI / 2),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the watch post on the cape's ridge, San Andrés de Teixido's chapel on the Capelada's cliffs, Cariño under the cape's lee
    props.tower({ x: CAPE.x - 60, z: CAPE.z + 260 });
    const placed = (x0: number, z0: number, w: number, dz: number, n: number, put: (x: number, z: number) => void) => {
      for (let i = 0, k = 0; i < n * 30 && k < n; i++) { const x = x0 + (rand() - 0.5) * w, z = z0 + (rand() - 0.5) * dz, y = height(x, z); if (y > 3 && y < 70) { k++; put(x, z); } }
    };
    const house = (x: number, z: number) => props.house({ x, z, yaw: (rand() - 0.5) * 0.6, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    placed(-1400, 700, 400, 300, 1, (x, z) => props.church({ x, z, yaw: 0.6 }));
    placed(bayX(1500) + 150, 1500, 260, 500, 16, house);                     // Cariño
    placed(600, bayZ(600) + 160, 800, 200, 10, house);                        // the head of the Ría de Ortigueira
    placed(CEDEIRA + 520, westZ(CEDEIRA) + 900, 300, 260, 14, house);          // Cedeira at the head of its ría
    placed(CEDEIRA + 560, westZ(CEDEIRA) + 950, 200, 200, 1, (x, z) => props.church({ x, z, yaw: 0.5 }));
    props.tower({ x: BARES.x + 30, z: BARES.z + 160 });                     // the watch post on Estaca de Bares
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 600, broadleaf: 0.6, autumn: 0.6, maxY: 200, size: 1.1,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 8 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
