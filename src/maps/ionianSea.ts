// The Ionian Sea, 1985: the Sixth Fleet against the Soviet Mediterranean squadron (the 5th Eskadra) off
// western Greece. A high limestone island to the west, a smaller one in the middle with a narrow channel
// between them, the Peloponnese coast along the east with a white harbour town; olive and maquis on the
// slopes. The Eskadra lies at its anchorage behind the island in the north; the carrier group comes up
// from the south. Bright, clear, the sea deep blue. Ships only (data/units/ships85.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1985_06);
const sea = createSea({ level: 0, size: SIZE, color: 0x0e4c7a });

/** The Peloponnese coast's line (x) at z, along the east edge, a bay where the town is (z ≈ 300). */
const coastX = (z: number) => 1900 + fbm(noise, z * 0.001, 1.7, 3) * 200 + (Math.abs(z - 300) < 300 ? (300 - Math.abs(z - 300)) * 0.9 : 0);
const BIG = [-1500, -200, 620, 380];   // the big island: [x, z, radius, height]
const SMALL = [-150, 300, 330, 190];   // the middle island
const NORTH = [-1150, -1650, 220, 110]; // the islet the Eskadra anchors behind (off to the west of its anchorage: the way south out of it open — ships grazed it leaving)

function height(x: number, z: number) {
  let h = -80 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 14;
  h = Math.max(h, shore(x - coastX(z), 260 + fbm(noise, x * 0.002, z * 0.002, 3) * 90, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 18));
  for (const [ix, iz, r, top] of [BIG, SMALL, NORTH]) {
    const d = r - Math.hypot((x - ix) * (ix === BIG[0] ? 0.8 : 1), z - iz) + fbm(noise, x * 0.004, z * 0.004, 3) * r * 0.25;
    h = Math.max(h, island(d, r, top, fbm(noise, x * 0.012, z * 0.012, 2) * 0.5 + 0.5, 10));
  }
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Sixth Fleet', x: 300, z: 2150, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'West of the island', x: -2150, z: 900, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'The channel', x: -600, z: 200, owner: null, sector: 'centre', radius: 160 },
  { id: 'D', name: 'Harbour roads', x: 1450, z: 300, owner: null, sector: 'east', radius: 160 },
  { id: 'K', name: 'Eskadra anchorage', x: -400, z: -2150, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'ionianSea',
  name: 'Ionian Sea',
  description: 'The Sixth Fleet against the Soviet Mediterranean squadron off western Greece: high islands, a narrow channel between them, the harbour town on the Peloponnese coast. Bright and clear — nowhere to hide but behind the land.',
  epochs: ['1985'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2600, near: 2, far: 9000 },
  seed: 198506,
  height,
  river: sea,

  theme: {
    fogColor: 0xc4d4e2, fogDensity: 0.00016,
    skyTop: 0x3b72b4, skyHorizon: 0xcadcea, skyBottom: 0x7aa4c6,
    sunColor: 0xfff2dc, sunIntensity: 2.5, sunDisk: 0.9,
    clouds: 0.15, cloudLight: 0xffffff, cloudDark: 0xc4ccd6,
    sunDir: [0.4, 0.8, 0.35],
    hemiSky: 0xd6e6f4, hemiGround: 0x8a7a60, hemiIntensity: 1.35,
    rimColor: 0xf0f4f8, rimIntensity: 0.3,
    terrain: {
      grass: '#7a7a48', grassAlt: '#86804e', dryGrass: '#b0a070', dirt: '#b8a580', rock: '#bcb4a2',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 120) return [0xc4bcaa, 1];                        // pale limestone on the heights
        if (y > 3) return [fbm(noise, x * 0.02, z * 0.02, 2) > 0 ? 0x7a7a4a : 0xa89c74, 1]; // maquis and dry grass
        return y > -0.6 ? [0xd8ccaa, 1] : [0xb8ad8c, 1];          // the beaches
      },
    },
  },

  bases: { nato: { x: 300, z: 2350, entries: [-800, 0, 800] }, pact: { x: -400, z: -2350, entries: [-700, 0, 700] } },
  maxStacks: 12,
  cameraStart: { nato: { x: 300, z: 2100 }, pact: { x: -400, z: -2100 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: 300, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: -50, z: 2200, facing: Math.PI }, { unit: 'frigate', x: 650, z: 2200, facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: -400, z: -2050, facing: 0 }, { unit: 'destroyer', x: -50, z: -2200, facing: 0 }, { unit: 'frigate', x: -750, z: -2200, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the harbour town: white flat-roofed houses climbing the slope round the bay, a domed church, the mole
    for (let i = 0; i < 40; i++) {
      const z = 300 + (rand() - 0.5) * 560, x = coastX(z) + 30 + rand() * 260;
      const y = height(x, z);
      if (y > 2 && y < 90) props.flatHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.3, width: 7 + rand() * 4, depth: 6 + rand() * 3, storeys: 1 + Math.floor(rand() * 2), dome: rand() < 0.08 });
    }
    props.church({ x: coastX(300) + 160, z: 340, yaw: Math.PI / 2 });
    props.box('stone', coastX(300) - 60, 1, 300, 10, 2, 220, 0.2, 0xb8b0a0); // the mole
    // a village and a chapel on the middle island, a lighthouse on the big one
    for (let i = 0; i < 10; i++) {
      const a = rand() * Math.PI * 2, x = SMALL[0] + Math.cos(a) * 200, z = SMALL[1] + Math.sin(a) * 200;
      if (height(x, z) > 3) props.flatHouse({ x, z, yaw: a, width: 7, depth: 6, storeys: 1 });
    }
    props.tower({ x: BIG[0] + 520, z: BIG[1] + 260, concrete: true });
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 2200, broadleaf: 1, autumn: 0, maxY: 260, size: 0.9,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 4 }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
