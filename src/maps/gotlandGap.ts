// The Gotland Gap, 2027: the open Baltic between Gotland and the Courland coast of Latvia — the sea the
// Baltic Fleet must cross to reach the Baltic states, and the sea NATO must hold to reinforce them. Gotland
// along the west, lying south-south-west to north-north-east: a limestone plateau with low cliffs, Visby's
// walls and churches on the west shore, Slite on the east, Fårö across its narrow sound to the north and
// Gotska Sandön out beyond; the Hoburgs Bank shoal off Hoburgen, the island's southern tip. The low,
// pine-dark Latvian shore along the east: Ventspils, and Liepāja with its old naval port. Deep water in
// between (the Gotland Deep). NATO (US Navy, Polish Navy) comes down from the north, the Baltic Fleet up
// from Kaliningrad in the south. Fair: off Slite and off Ventspils as near NATO as the Hoburgs Bank and off
// Liepāja the Baltic Fleet, the Gotland Deep halfway; no point under the other side's shore.
// Laid out at full size (`widened`). Ships only.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(2027_21);
const sea = createSea({ level: 0, size: SIZE, color: 0x284a56 });

/** Gotland's spine: x of its middle at z (it lies south-south-west to north-north-east). */
const gotX = (z: number) => -2500 - z * 0.22 + fbm(noise, z * 0.001, 1.3, 3) * 150;
/** How far Gotland reaches each side of its spine at z: out to Fårösund in the north, to a point at Hoburgen in the south. */
const gotW = (z: number) => Math.max(-400, 720 * Math.min(1, (z + 2800) / 400, (1150 - z) / 1100));
const faroW = (z: number) => Math.max(-400, 480 * Math.min(1, (z + 3750) / 350, (-2930 - z) / 250));
/** The Latvian shore (x) at z: Ventspils in the north, Liepāja in the south. */
const xL = (z: number) => 3950 - z * 0.09 + fbm(noise, z * 0.0012, 4.4, 3) * 180;
const VISBY = -700, SLITE = -1700, VENTSPILS = -1200, LIEPAJA = 2600;

function height(x: number, z: number) {
  let h = -65 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 14;
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  const wob = fbm(noise, x * 0.004, z * 0.004, 2) * 90;
  h = Math.max(h, shore(gotW(z) - Math.abs(x - gotX(z)) + wob, 50, n, 30));        // Gotland: the klint, then the plateau
  h = Math.max(h, shore(faroW(z) - Math.abs(x - gotX(z) - 250) + wob, 30, n, 40)); // Fårö
  h = Math.max(h, island(300 - Math.hypot(x + 3300, (z + 4400) * 1.4) + wob * 0.6, 300, 14, 0.3, 60)); // Gotska Sandön: dunes and pines
  h = Math.max(h, shore(x - xL(z), 28, n, 50));                                     // Courland: beach, dunes, pine
  // the Hoburgs Bank: a wide shoal, six metres at its crest — a frigate crosses it, nothing hides under it
  const bank = 520 - Math.hypot(x + 2400, (z - 1900) * 0.8) + wob;
  h = Math.max(h, -6 - Math.max(0, 300 - bank) * 0.12);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Task group', x: 300, z: -3950, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Off Slite', x: -1100, z: -1700, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'Off Ventspils', x: 2900, z: -1000, owner: null, sector: 'east', radius: 170 },
  { id: 'D', name: 'Gotland Deep', x: 500, z: 40, owner: null, sector: 'centre', radius: 190 },
  { id: 'E', name: 'Hoburgs Bank', x: -1700, z: 1500, owner: null, sector: 'west', radius: 170 },
  { id: 'F', name: 'Off Liepāja', x: 2650, z: 1400, owner: null, sector: 'east', radius: 170 },
  { id: 'K', name: 'Baltic Fleet', x: -300, z: 3950, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'gotlandGap',
  name: 'Gotland Gap',
  description: 'The open Baltic between Gotland and the Latvian coast: the Baltic Fleet comes north from Kaliningrad, NATO comes south to keep the sea lane to the Baltic states. Deep water, one shoal, two shores.',
  epochs: ['2027'],
  region: 'europe',
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Russia' },
  armies: { nato: ['us', 'pl'], pact: ['ru'] },
  size: SIZE,
  segments: 640,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 4200, near: 2, far: 16000 },
  seed: 202721,
  height,
  river: sea,

  theme: {
    fogColor: 0xa4b0b6, fogDensity: 0.00016,
    skyTop: 0x587088, skyHorizon: 0xbcc6ca, skyBottom: 0x84949c,
    sunColor: 0xf6eee0, sunIntensity: 1.8, sunDisk: 0.4,
    clouds: 0.65, cloudLight: 0xeef0f2, cloudDark: 0x949ea4,
    sunDir: [0.3, 0.55, 0.6],
    hemiSky: 0xc8d2d8, hemiGround: 0x56644e, hemiIntensity: 1.25,
    rimColor: 0xe0e6ea, rimIntensity: 0.25,
    terrain: {
      grass: '#66784a', grassAlt: '#72824f', dryGrass: '#a49e70', dirt: '#8a7c5e', rock: '#c4beae',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (x < 0 && y > 6 && y < 22 && fbm(noise, x * 0.02, z * 0.02, 2) > 0.15) return [0xc8c2b0, 1]; // bare limestone (alvar) on Gotland's edge
        if (y > 2.5) return [fbm(noise, x * 0.004, z * 0.004, 2) > 0.05 ? 0x7a8452 : 0x627846, 1]; // fields, juniper heath
        return y > -0.8 ? [0xdcd2ae, 1] : [0xb6aa8a, 1];                                         // the beaches, the sand under the water
      },
    },
  },

  bases: { nato: { x: 300, z: -4300, entries: [-800, 0, 800] }, pact: { x: -300, z: 4300, entries: [-800, 0, 800] } },
  maxStacks: 14,
  cameraStart: { nato: { x: 300, z: -3900 }, pact: { x: -300, z: 3900 } },
  points,

  spawns: {
    nato: [{ unit: 'destroyer', x: 300, z: -4150, facing: 0 }, { unit: 'frigate', x: 0, z: -3950, facing: 0 }, { unit: 'ptBoat', x: 550, z: -3850, facing: 0 }, { unit: 'ptBoat', x: 800, z: -3950, facing: 0 }],
    pact: [{ unit: 'destroyer', x: -300, z: 4150, facing: Math.PI }, { unit: 'frigate', x: 0, z: 3950, facing: Math.PI }, { unit: 'ptBoat', x: -550, z: 3850, facing: Math.PI }, { unit: 'ptBoat', x: -800, z: 3950, facing: Math.PI }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const town = (cx: number, cz: number, n: number, rx: number, rz: number, face: number) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * rx, z = cz + (rand() - 0.5) * rz;
        const y = height(x, z);
        if (y > 2 && y < 40) props.townHouse({ x, z, yaw: face + (rand() - 0.5) * 0.3, width: 7 + rand() * 3, depth: 8 + rand() * 2, storeys: 2, damaged: 0 });
      }
      props.church({ x: cx, z: cz, yaw: face });
    };
    const west = (z: number) => gotX(z) - gotW(z), east = (z: number) => gotX(z) + gotW(z);
    town(west(VISBY) + 220, VISBY, 30, 260, 460, Math.PI / 2);        // Visby inside its ring wall
    props.church({ x: west(VISBY) + 300, z: VISBY - 150, yaw: Math.PI / 2 });
    for (let k = 0; k < 9; k++) props.lowWall({ x: west(VISBY) + 380, z: VISBY - 240 + k * 55, yaw: Math.PI / 2, length: 50, height: 6, color: 0x9a948a });
    town(east(SLITE) - 170, SLITE, 14, 220, 300, -Math.PI / 2);        // Slite and its cement works
    props.chimney({ x: east(SLITE) - 120, z: SLITE + 200 });
    town(xL(VENTSPILS) + 260, VENTSPILS, 24, 300, 480, -Math.PI / 2);  // Ventspils
    town(xL(LIEPAJA) + 260, LIEPAJA, 26, 300, 520, -Math.PI / 2);      // Liepāja
    town(xL(800) + 200, 800, 8, 200, 260, -Math.PI / 2);               // Pāvilosta
    props.tower({ x: gotX(1100), z: 1080, concrete: true });           // the Hoburgen light
    props.tower({ x: gotX(-3700) + 250, z: -3700, concrete: true });   // Fårö light
    props.tower({ x: -3300, z: -4600, concrete: true });               // Gotska Sandön
    props.tower({ x: xL(VENTSPILS - 400) + 40, z: VENTSPILS - 400, concrete: true });
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 2600, broadleaf: 0.25, autumn: 0.3, maxY: 70, size: 1.2,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 3 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
