// Surigao Strait, the night of 24–25 October 1944 (fought here as 1945): a strait a kilometre and a half
// wide, winding north between Leyte and Dinagat into Leyte Gulf, with Hibuson Island in it. The US Navy
// lies across its northern mouth — battleline, cruisers, destroyers ready to go down the sides, PT boats
// out ahead; the Imperial Navy comes up from the Mindanao Sea in the south, in line ahead, at night.
// Ships only (data/units45/ships.js). Night by default (map.conditions).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, shore, island, jungle, jungleTint } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1944_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x163c50 });

/** Land rising inland from its coast (d: metres inside the coast, negative out at sea), and the shelf off it. */
function coast(d: number, x: number, z: number, top = 130) {
  return shore(d, top, fbm(noise, x * 0.004, z * 0.004, 3) * 0.5 + 0.5, 20 + 60 * (fbm(noise, x * 0.003 + 4, z * 0.003, 2) * 0.5 + 0.5));
}

/** Half the strait's width at z: narrow in the middle, opening out into Leyte Gulf (north) and the Mindanao Sea (south). */
function halfWidth(z: number) {
  let w = 680 + 220 * Math.sin(z * 0.0011 + 0.6);
  if (z < -1100) w += (-1100 - z) * 1.5;
  if (z > 1600) w += (z - 1600) * 1.3;
  return w;
}

function height(x: number, z: number) {
  let h = -40 + fbm(noise, x * 0.0008, z * 0.0008, 4) * 7;
  const bend = 160 * Math.sin(z * 0.0009); // the strait winds
  const w = halfWidth(z) + fbm(noise, x * 0.002, z * 0.002, 2) * 90;
  h = Math.max(h, coast((x - bend) - w, x, z), coast(-(x - bend) - w, x, z)); // Dinagat to the east, Leyte to the west
  const hd = 150 - Math.hypot(x + 320, (z - 650) * 1.4) + fbm(noise, x * 0.01, z * 0.01, 2) * 25; // Hibuson Island
  h = Math.max(h, island(hd, 150, 55, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 12));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Leyte Gulf', x: 0, z: -2050, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'The mouth', x: -100, z: -1000, owner: null, sector: 'centre', radius: 160 },
  { id: 'C', name: 'Mid-strait', x: 60, z: -50, owner: null, sector: 'centre', radius: 160 },
  { id: 'D', name: 'Hibuson passage', x: 200, z: 800, owner: null, sector: 'centre', radius: 150 },
  { id: 'K', name: 'Mindanao Sea', x: 0, z: 2100, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'surigaoStrait',
  name: 'Surigao Strait',
  description: 'A narrow strait at night: the US Navy lies across its mouth into Leyte Gulf, the Imperial Navy comes up it from the south. Torpedo boats and destroyers down the sides, the big guns at the end.',
  epochs: ['1945'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'night', weather: 'clear' },
  fow: 0.5,
  sides: { nato: 'United States', pact: 'Japan' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2400, near: 2, far: 9000 },
  seed: 194410,
  height,
  river: sea,

  theme: {
    fogColor: 0xa4b8c6,
    fogDensity: 0.00026,
    skyTop: 0x34649a,
    skyHorizon: 0xb8cede,
    skyBottom: 0x6890ac,
    sunColor: 0xfff0d8,
    sunIntensity: 2.1,
    sunDisk: 0.8,
    clouds: 0.5,
    cloudLight: 0xffffff,
    cloudDark: 0xaab8c6,
    sunDir: [0.5, 0.7, -0.4],
    hemiSky: 0xc6daec,
    hemiGround: 0x4a6a56,
    hemiIntensity: 1.25,
    rimColor: 0xe0eef8,
    rimIntensity: 0.3,
    terrain: {
      grass: '#46633a', grassAlt: '#526e40', dryGrass: '#868458', dirt: '#857652', rock: '#6a665c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y >= 3) return jungleTint(height, x, z, y);
        return y > -0.6 ? [0xd6caa0, Math.min(1, (3 - y) / 2.4)] : [0x8a8264, 1];
      },
    },
  },

  bases: { nato: { x: 0, z: -2300, entries: [-500, 0, 500] }, pact: { x: 0, z: 2300, entries: [-500, 0, 500] } },
  maxStacks: 12,
  cameraStart: { nato: { x: 0, z: -2050 }, pact: { x: 0, z: 2050 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: 0, z: -2250, facing: 0 }, { unit: 'destroyer', x: -400, z: -2000, facing: 0 }, { unit: 'destroyer', x: 400, z: -2000, facing: 0 }, { unit: 'ptBoat', x: -200, z: -1500, facing: 0 }, { unit: 'ptBoat', x: 200, z: -1500, facing: 0 }],
    pact: [{ unit: 'cruiser', x: 0, z: 2300, facing: Math.PI }, { unit: 'destroyer', x: -300, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: 300, z: 2050, facing: Math.PI }, { unit: 'lightCruiser', x: 0, z: 2150, facing: Math.PI }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    for (let i = 0; i < 300; i++) { // palms along both shores
      const x = (rand() * 2 - 1) * HALF;
      const z = (rand() * 2 - 1) * HALF;
      const y = height(x, z);
      if (y > 1.8 && y < 3.5) props.palm({ x, z, height: 8 + rand() * 6 });
    }
    props.finish();
    const trees = jungle({ scene, terrain, cover, rand, half: HALF });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update(dt, t); } };
  },
} satisfies MapDef;
