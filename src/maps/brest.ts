// Off Brest (the 1806 sea battles): the French fleet breaks out of its port past the rocks of the Breton coast;
// the British blockading squadron waits offshore to the west. Granite islets and reefs off the headlands
// (Ouessant's kind), a narrow passage between them, a hard westerly under a grey sky — a gale when it rains:
// the lower deck ports shut. The French come from the east, the British from the west.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 5600;
const HALF = 2000;
const noise = createNoise2D(1806_03);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a4450 });

/** The Breton coast's line (z) at x along the north, a headland at x ≈ 600. */
const coastZ = (x: number) => -1800 + Math.max(0, 500 - Math.abs(x - 600)) * 1.1 + fbm(noise, x * 0.0012, 2.2, 3) * 160;
// the islets off the coast: [x, z, radius, height] — granite, with reefs round them
const ISLETS = [[-300, -700, 170, 40], [350, -300, 120, 30], [-1100, -200, 140, 35], [1150, 100, 110, 25], [-600, 450, 90, 20]];

function height(x: number, z: number) {
  let h = -55 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 12;
  h = Math.max(h, shore(coastZ(x) - z, 260 + fbm(noise, x * 0.002, z * 0.002, 3) * 90, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 40));
  for (const [ix, iz, r, top] of ISLETS) h = Math.max(h, island(r - Math.hypot(x - ix, z - iz) + fbm(noise, x * 0.008, z * 0.008, 2) * 50, r, top, fbm(noise, x * 0.02, z * 0.02, 2) * 0.5 + 0.5, 5));
  // the reefs: scattered rocks just awash round the islets
  if (fbm(noise, x * 0.006, z * 0.006, 3) > 0.62 && z < 700) h = Math.max(h, -2 + fbm(noise, x * 0.03, z * 0.03, 2) * 4);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Out of Brest', x: 1650, z: -200, owner: 'nato', sector: 'east', radius: 160 },
  { id: 'B', name: 'The passage', x: 0, z: -350, owner: null, sector: 'centre', radius: 150 },
  { id: 'C', name: 'Iroise sound', x: 100, z: 650, owner: null, sector: 'centre', radius: 180 },
  { id: 'D', name: 'Off the islets', x: -900, z: 1100, owner: null, sector: 'west', radius: 170 },
  { id: 'K', name: 'The inshore squadron', x: -1650, z: 300, owner: 'pact', sector: 'west', radius: 160 },
];

export default {
  id: 'brest',
  name: 'Off Brest',
  description: 'The French break out of Brest past the rocks of the Breton coast; the British squadron waits offshore. Islets, reefs, a narrow passage — and a hard westerly.',
  epochs: ['1806'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  wind: { from: 265, speed: 9, veer: 0.3 },     // a hard westerly — in the rain, a gale
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  size: SIZE,
  segments: 360,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2200, near: 1, far: 8000 },
  seed: 180603,
  height,
  river: sea,

  theme: {
    fogColor: 0x8c9aa2, fogDensity: 0.0003,
    skyTop: 0x56626c, skyHorizon: 0xa4aeb4, skyBottom: 0x707c84,
    sunColor: 0xe8ecee, sunIntensity: 1.3, sunDisk: 0.15,
    clouds: 0.85, cloudLight: 0xd8dde0, cloudDark: 0x6c767c,
    sunDir: [0.2, 0.5, 0.6],
    hemiSky: 0xb8c2c8, hemiGround: 0x4a5450, hemiIntensity: 1.2,
    rimColor: 0xd4dce0, rimIntensity: 0.2,
    terrain: {
      grass: '#5e6a48', grassAlt: '#687250', dryGrass: '#8a8868', dirt: '#6c665a', rock: '#7a7872',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 14) return [0x5c6846, 1];                       // the gorse and grass on the tops
        return y > 1 ? [0x7a7670, 1] : [0x5e5a52, 1];           // grey granite, the wet rock at the water
      },
    },
  },

  bases: { nato: { x: 1900, z: -300, entries: [-500, 0, 500] }, pact: { x: -1900, z: 300, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 1600, z: -300 }, pact: { x: -1600, z: 300 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: 1600, z: -450, facing: -Math.PI / 2 }, { unit: 'cruiser', x: 1700, z: -250, facing: -Math.PI / 2 }, { unit: 'cruiser', x: 1800, z: -50, facing: -Math.PI / 2 }, { unit: 'frigate', x: 1550, z: 100, facing: -Math.PI / 2 }],
    pact: [{ unit: 'cruiser', x: -1600, z: 150, facing: Math.PI / 2 }, { unit: 'cruiser', x: -1700, z: 350, facing: Math.PI / 2 }, { unit: 'cruiser', x: -1800, z: 550, facing: Math.PI / 2 }, { unit: 'frigate', x: -1500, z: 700, facing: Math.PI / 2 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    props.tower({ x: 600, z: coastZ(600) - 120 });                // the signal tower on the headland
    for (let i = 0; i < 12; i++) {
      const x = 200 + rand() * 900, z = coastZ(x) - 120 - rand() * 160;
      if (height(x, z) > 4 && height(x, z) < 40) props.house({ x, z, yaw: rand() * Math.PI, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 400, broadleaf: 0.3, autumn: 0.2, maxY: 60, size: 0.9,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 8 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
