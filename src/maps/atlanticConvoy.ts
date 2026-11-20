// The North Atlantic by Rockall, October 1940: the slow convoy SC 7 from Sydney, Cape Breton, and the fast HX 79
// behind it ran into the U-boats here in the Western Approaches — Kretschmer's U 99, Prien's U 47, Schepke's U 100
// among them — and lost thirty-two ships in three nights. Open, deep ocean, a long grey swell; in the west the
// Rockall Bank, with Rockall itself, a lone granite stump in the sea, and Helen's Reef awash beside it, no keel
// crosses; the George Bligh Bank to the south-west and the Anton Dohrn Seamount in the Rockall Trough to the east,
// both deep enough to sail over. The convoy (the Royal Navy's escorts, its merchantmen: they bring in command points
// while they lie in a zone the convoy holds — data/units45/ships.js transport) comes up from the south, the U-boats
// and a destroyer group (the Kriegsmarine) wait in the north. Ships only.
// Fair, not mirrored: the two banks point for point, one nearer each fleet (George Bligh the convoy's, Anton Dohrn
// the U-boats'); Rockall and the Trough the two middle zones, each as near one fleet as the other by the sailing
// routes (scratchpad seapath), Rockall's reef in nobody's way. Laid out at full size (`widened`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, island } from '../world/Sea.js';
import { smoothstep } from '../core/math.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(1940_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x23404c });
const ROCKALL = [-1750, 950];

function height(x: number, z: number) {
  let h = -150 + fbm(noise, x * 0.0004, z * 0.0004, 4) * 25;                         // the open Atlantic
  const wob = fbm(noise, x * 0.003, z * 0.003, 2) * 120;
  const bank = (cx: number, cz: number, rx: number, rz: number, top: number) => { // a bank's plateau, `top` deep at its crest
    const d = Math.hypot((x - cx) / rx, (z - cz) / rz) - wob / Math.max(rx, rz);
    h = Math.max(h, top - Math.max(0, d - 0.55) * 160);
  };
  bank(ROCKALL[0] + 150, ROCKALL[1] - 100, 1300, 900, -55);                              // the Rockall Bank
  bank(-3000, -1950, 650, 520, -48);                                                      // the George Bligh Bank
  bank(3000, 1950, 650, 520, -48);                                                        // the Anton Dohrn Seamount
  h = Math.max(h, -2.5 - Math.max(0, Math.hypot(x - ROCKALL[0] + 230, z - ROCKALL[1] + 160) - 140) * 0.35); // Helen's Reef, just awash: no keel crosses it
  h = Math.max(h, island(40 - Math.hypot(x - ROCKALL[0], (z - ROCKALL[1]) * 1.25), 40, 19, 0.9, 4)); // Rockall: the stump, 17 m of granite
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Convoy SC 7', x: 0, z: -3950, owner: 'nato', sector: 'centre', radius: 160 },
  { id: 'B', name: 'George Bligh Bank', x: -2750, z: -1335, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'Rockall', x: -1250, z: 5, owner: null, sector: 'west', radius: 180 },
  { id: 'D', name: 'Rockall Trough', x: 1250, z: -5, owner: null, sector: 'east', radius: 180 },
  { id: 'E', name: 'Anton Dohrn Seamount', x: 2750, z: 1440, owner: null, sector: 'east', radius: 180 },
  { id: 'K', name: 'U-boat patrol line', x: 0, z: 3950, owner: 'pact', sector: 'centre', radius: 160 },
];

export default {
  id: 'atlanticConvoy',
  name: 'North Atlantic Convoy',
  description: 'October 1940, the Western Approaches by Rockall: a British convoy and its escorts against the U-boat packs and a German destroyer group. Open, deep ocean, the lone rock of Rockall on its bank.',
  epochs: ['1945'],
  region: 'europe', // (the menu's Western Europe — at sea named the North Atlantic: data/epoch.js)
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['brit21'], pact: ['wh'] }, // (the Royal Navy and the Kriegsmarine: data/units45/ships.js)
  size: SIZE,
  segments: 640,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 4200, near: 2, far: 16000 },
  seed: 194010,
  height,
  river: sea,

  theme: {
    fogColor: 0x9aa6ac, fogDensity: 0.0002,
    skyTop: 0x5a6a78, skyHorizon: 0xb4bec2, skyBottom: 0x7e8c94,
    sunColor: 0xeeeae0, sunIntensity: 1.6, sunDisk: 0.3,
    clouds: 0.75, cloudLight: 0xe6eaec, cloudDark: 0x86929a,
    sunDir: [0.25, 0.5, 0.6],
    hemiSky: 0xc0cad0, hemiGround: 0x4a5a5e, hemiIntensity: 1.2,
    rimColor: 0xd8e0e4, rimIntensity: 0.25,
    terrain: {
      grass: '#6a7068', grassAlt: '#72786e', dryGrass: '#8a8a80', dirt: '#6e6a62', rock: '#7e7c76',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 0.5) return [smoothstep(0.5, 6, y) > 0.5 ? 0xd8d6cc : 0x6e6c66, 1]; // Rockall's granite, white with the birds' guano on top
        return [y > -60 ? 0x8a8470 : 0x5e6460, 1];                                   // the banks' shell sand, the deep's grey ooze
      },
    },
  },

  bases: { nato: { x: 0, z: -4300, entries: [-800, 0, 800] }, pact: { x: 0, z: 4300, entries: [-800, 0, 800] } },
  maxStacks: 14,
  cameraStart: { nato: { x: 0, z: -3900 }, pact: { x: 0, z: 3900 } },
  points,

  spawns: {
    nato: [{ unit: 'transport', x: -300, z: -4250, facing: 0 }, { unit: 'transport', x: 0, z: -4150, facing: 0 }, { unit: 'transport', x: 300, z: -4250, facing: 0 },
      { unit: 'destroyer', x: 0, z: -3800, facing: 0 }, { unit: 'frigate', x: -600, z: -3950, facing: 0 }, { unit: 'frigate', x: 600, z: -3950, facing: 0 }],
    pact: [{ unit: 'submarine', x: -700, z: 3600, facing: Math.PI }, { unit: 'submarine', x: 700, z: 3600, facing: Math.PI },
      { unit: 'destroyer', x: -250, z: 4100, facing: Math.PI }, { unit: 'destroyer', x: 250, z: 4100, facing: Math.PI }],
  },

  decorate({ scene, terrain, cover }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);   // (the water's depth, colour and surf from the sea floor: world/Sea.js)
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
