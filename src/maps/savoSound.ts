// Savo Sound ("Ironbottom Sound"), Guadalcanal, a night in late 1942 (fought here as 1945): the deep water
// between Guadalcanal's north coast (the south edge of the map), Florida Island and Tulagi (the north-east)
// and the volcanic cone of Savo Island (the north-west). The US Navy guards the transports' anchorage off
// Lunga Point in the east; the Imperial Navy comes down "the Slot" from the north-west, round either side
// of Savo, at night. Ships only (data/units45/ships.js). Night and clear by default (map.conditions).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, shore, island, jungle, jungleTint } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1942_08);
const sea = createSea({ level: 0, size: SIZE, color: 0x173f55 });

/** Land rising inland from its coast (d: metres inside the coast, negative out at sea): a beach, cliffs, jungle hills. */
function coast(d: number, x: number, z: number, top = 50) {
  return shore(d, top, fbm(noise, x * 0.004, z * 0.004, 3) * 0.5 + 0.5, 20 + 60 * (fbm(noise, x * 0.003 + 4, z * 0.003, 2) * 0.5 + 0.5));
}

function height(x: number, z: number) {
  let h = -44 + fbm(noise, x * 0.0007, z * 0.0007, 4) * 8;
  // Guadalcanal: the whole south edge
  const gz = 1650 + 120 * Math.sin(x * 0.0013) + fbm(noise, x * 0.002, 9.1, 2) * 90;
  h = Math.max(h, coast(z - gz, x, z, 140));
  // Florida Island and Tulagi: the north-east
  const fx = (x - 1500) / 1400, fz = (z + 2350) / 650;
  const fd = (1 - Math.hypot(fx, fz)) * 650 + fbm(noise, x * 0.003, z * 0.003, 2) * 90;
  h = Math.max(h, coast(fd, x, z, 110));
  // Savo Island: a volcanic cone
  const sd = 420 - Math.hypot(x + 1250, z + 900) + fbm(noise, x * 0.005, z * 0.005, 2) * 40;
  h = Math.max(h, island(sd, 420, 150, fbm(noise, x * 0.006, z * 0.006, 2) * 0.5 + 0.5));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Lunga Point', x: 1900, z: 1250, owner: 'nato', sector: 'east', radius: 130 },
  { id: 'B', name: 'Savo channel', x: -1500, z: 200, owner: null, sector: 'west', radius: 160 },
  { id: 'C', name: 'Ironbottom Sound', x: 200, z: 100, owner: null, sector: 'centre', radius: 170 },
  { id: 'D', name: 'Tulagi roads', x: 900, z: -1150, owner: null, sector: 'east', radius: 150 },
  { id: 'K', name: 'The Slot', x: -2050, z: -1900, owner: 'pact', sector: 'west', radius: 130 },
];

export default {
  id: 'savoSound',
  name: 'Savo Sound',
  description: 'A night action in the narrow water between Guadalcanal, Florida Island and Savo: the Imperial Navy comes down the Slot, the US Navy guards the anchorage off Lunga Point.',
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
  seed: 194208,
  height,
  river: sea,

  theme: {
    fogColor: 0xa8bccb,
    fogDensity: 0.00024,
    skyTop: 0x36689e,
    skyHorizon: 0xbcd2e2,
    skyBottom: 0x6a92ae,
    sunColor: 0xfff0d8,
    sunIntensity: 2.1,
    sunDisk: 0.8,
    clouds: 0.45,
    cloudLight: 0xffffff,
    cloudDark: 0xaebccb,
    sunDir: [-0.35, 0.7, 0.55],
    hemiSky: 0xc8dcee,
    hemiGround: 0x4e6e5a,
    hemiIntensity: 1.25,
    rimColor: 0xe0eef8,
    rimIntensity: 0.3,
    terrain: {
      grass: '#4f6b39', grassAlt: '#5a7442', dryGrass: '#8c8a5a', dirt: '#8a7a56', rock: '#6e6a60',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y >= 3) return jungleTint(height, x, z, y);
        return y > -0.6 ? [0xd9cfa6, Math.min(1, (3 - y) / 2.4)] : [0x7a7660, 1]; // the black-sand beaches, volcanic grey under the water
      },
    },
  },

  bases: { nato: { x: 2150, z: 1100, entries: [-250, 0, 250] }, pact: { x: -2150, z: -1950, entries: [-250, 0, 250] } },
  maxStacks: 12,
  cameraStart: { nato: { x: 1950, z: 1000 }, pact: { x: -1950, z: -1800 } },
  points,

  spawns: {
    nato: [{ unit: 'destroyer', x: 1850, z: 950, facing: -Math.PI / 2 }, { unit: 'destroyer', x: 1900, z: 1250, facing: -Math.PI / 2 }, { unit: 'lightCruiser', x: 2150, z: 1100, facing: -Math.PI / 2 }, { unit: 'transport', x: 2250, z: 1350, facing: -Math.PI / 2 }],
    pact: [{ unit: 'destroyer', x: -1950, z: -1750, facing: Math.PI / 4 }, { unit: 'destroyer', x: -2150, z: -1700, facing: Math.PI / 4 }, { unit: 'cruiser', x: -2150, z: -1950, facing: Math.PI / 4 }, { unit: 'ptBoat', x: -1900, z: -2000, facing: Math.PI / 4 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // palms along Guadalcanal's coast and on Savo's shore
    for (let i = 0; i < 260; i++) {
      const x = (rand() * 2 - 1) * HALF;
      const z = rand() < 0.75 ? 1600 + rand() * 600 : -900 + (rand() * 2 - 1) * 450;
      const y = height(x, z);
      if (y > 1.8 && y < 3.5) props.palm({ x, z, height: 8 + rand() * 6 });
    }
    props.finish();
    const trees = jungle({ scene, terrain, cover, rand, half: HALF });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update(dt, t); } };
  },
} satisfies MapDef;
