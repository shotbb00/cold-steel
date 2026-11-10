// North Cape and the Kola coast, 1985: the Soviet bastion. The Northern Fleet's home waters — Kola Bay with
// the naval base at Severomorsk cut deep into the bare tundra cliffs along the north edge, Kildin Island off
// it to the east, the North Cape headland to the west. A NATO strike group comes up from the Norwegian Sea
// to hit the fleet before it sails. Low, flat islands and the cliffed coast; no trees this far north. Night by
// default (the polar winter). Ships only (data/units/ships85.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1985_11);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f3644 });

/** The Kola coast's line (z) at x: along the north edge, Kola Bay cutting deep in at x ≈ -300. */
const coastZ = (x: number) => -2050 + fbm(noise, x * 0.0011, 7.3, 3) * 180 - (Math.abs(x + 300) < 260 ? (260 - Math.abs(x + 300)) * 2.4 : 0);

function height(x: number, z: number) {
  let h = -55 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 10;
  h = Math.max(h, shore(coastZ(x) - z, 90 + fbm(noise, x * 0.003, z * 0.003, 3) * 40, fbm(noise, x * 0.012, z * 0.012, 2) * 0.5 + 0.5, 12)); // the Kola coast: cliffs, then flat tundra
  // the North Cape headland: a high bluff out from the west edge
  h = Math.max(h, island(700 - Math.hypot((x + 2400) * 0.7, (z - 300) * 1.1) + fbm(noise, x * 0.005, z * 0.005, 2) * 80, 500, 160, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 6));
  // Kildin Island: long and flat-topped, cliffs all round
  h = Math.max(h, island(260 - Math.hypot((x - 1300) * 0.55, z + 1200) + fbm(noise, x * 0.008, z * 0.008, 2) * 40, 260, 70, 0.6, 5));
  // a scatter of low rocky islets in the approaches
  for (const [ix, iz, r] of [[300, -300, 90], [-1100, -600, 70], [1700, 200, 80], [-500, 700, 60]]) h = Math.max(h, island(r - Math.hypot(x - ix, z - iz) + fbm(noise, x * 0.02, z * 0.02, 2) * 25, r, 18, 0.4, 6));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Strike group', x: 0, z: 2150, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'North Cape', x: -1050, z: 500, owner: null, sector: 'west', radius: 170 },
  { id: 'C', name: 'The approaches', x: 0, z: -400, owner: null, sector: 'centre', radius: 180 },
  { id: 'D', name: 'Kildin Island', x: 1450, z: -800, owner: null, sector: 'east', radius: 160 },
  { id: 'K', name: 'Kola Bay', x: -300, z: -1850, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'northCape',
  name: 'North Cape',
  description: 'The Soviet bastion: Kola Bay and the Northern Fleet\'s base under the tundra cliffs, Kildin Island off it. A NATO strike group comes north to catch the fleet before it sails.',
  epochs: ['1985'],
  theatre: 'sea',
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'night', weather: 'clear' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2600, near: 2, far: 9000 },
  seed: 198511,
  height,
  river: sea,

  theme: {
    fogColor: 0x8c99a4, fogDensity: 0.00028,
    skyTop: 0x51667c, skyHorizon: 0xaab4bc, skyBottom: 0x73828e,
    sunColor: 0xf4e6d4, sunIntensity: 1.3, sunDisk: 0.5,
    clouds: 0.6, cloudLight: 0xe2e6ea, cloudDark: 0x86929c,
    sunDir: [0.6, 0.25, -0.5],
    hemiSky: 0xbcc6d0, hemiGround: 0x4a545c, hemiIntensity: 1.15,
    rimColor: 0xd8e0e8, rimIntensity: 0.25,
    terrain: {
      grass: '#6a6a50', grassAlt: '#74705a', dryGrass: '#8a8468', dirt: '#6a6458', rock: '#7a766e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 2 && fbm(noise, x * 0.01, z * 0.01, 2) > 0.15) return [0xdfe3e6, 1];   // snow lying in the hollows
        if (y > 30) return [0x726d64, 1];                                                // bare cliff
        return y > 2 ? [0x6b6650, 1] : [0x46423b, 1];                                    // tundra above the dark wet rock
      },
    },
  },

  bases: { nato: { x: 0, z: 2350, entries: [-800, 0, 800] }, pact: { x: -300, z: -1750, entries: [-500, 0, 500] } },
  maxStacks: 12,
  cameraStart: { nato: { x: 0, z: 2100 }, pact: { x: -300, z: -1600 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: 0, z: 2050, facing: Math.PI }, { unit: 'destroyer', x: -350, z: 2200, facing: Math.PI }, { unit: 'frigate', x: 350, z: 2200, facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: -300, z: -1650, facing: 0 }, { unit: 'destroyer', x: -450, z: -1500, facing: 0 }, { unit: 'frigate', x: -150, z: -1500, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the naval base: piers into Kola Bay, sheds and halls behind them, cranes, a radar mast
    const bayZ = coastZ(-300);
    for (const x of [-480, -380, -220, -120]) props.box('stone', x, 1.2, bayZ + 50, 14, 2.4, 120, 0, 0x6c6a64); // (the bay is south of the coast line: the water side)
    for (let i = 0; i < 6; i++) props.hall({ x: -560 + i * 90, z: bayZ - 190 - (i % 2) * 40, yaw: 0, width: 40, depth: 22, height: 10, color: 0x7a7468, roof: 0x5a5e60, name: 'naval base hall' });
    for (const x of [-430, -170]) props.mast({ x, z: bayZ - 130, height: 22 });
    props.mast({ x: 1300, z: -1250, height: 30 });   // the radar station on Kildin
    props.tower({ x: -1700, z: 350, concrete: true }); // the North Cape light
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
