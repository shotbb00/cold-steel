// The North Atlantic by Rockall, 18–19 October 1940: the slow convoy SC 7 from Sydney, Cape Breton — thirty-five
// tramps in nine columns, five knots, the sloops Scarborough and Fowey and the corvettes Bluebell, Heartsease and Leith
// round it — steams east for the North Channel and runs into the pack: Kretschmer's U 99, Schepke's U 100, Frauenheim,
// Endrass and the rest, sent in from the patrol line to the south-east on the night of the 18th. They attacked on the
// surface in the moonlight, inside the columns, and sank twenty ships in two nights; the stragglers astern were
// picked off one by one. Laid out as that convoy battle: the convoy comes in from the west, the pack closes from the
// south; between them the convoy's track — the stragglers astern, the columns, the head of the convoy where the
// escorts' rendezvous was — running out north-east to the Rockall Bank, with Rockall itself, a lone granite stump,
// and Helen's Reef awash beside it that no keel crosses. The Anton Dohrn Seamount to the east is deep enough to sail
// over. A clear night under the moon. Ships only (the convoy's merchantmen bring in command points while they lie in a
// zone the convoy holds — data/units45/ships.js transport). Fair by the sailing routes (seapath): every zone on the
// convoy's track as near the escorts as the pack. Laid out at full size (`widened`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, island } from '../world/Sea.js';
import { smoothstep } from '../core/math.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(1940_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x23404c });
const ROCKALL = [2450, -2400];

function height(x: number, z: number) {
  let h = -150 + fbm(noise, x * 0.0004, z * 0.0004, 4) * 25;                         // the open Atlantic
  const wob = fbm(noise, x * 0.003, z * 0.003, 2) * 120;
  const bank = (cx: number, cz: number, rx: number, rz: number, top: number) => { // a bank's plateau, `top` deep at its crest
    const d = Math.hypot((x - cx) / rx, (z - cz) / rz) - wob / Math.max(rx, rz);
    h = Math.max(h, top - Math.max(0, d - 0.55) * 160);
  };
  bank(ROCKALL[0] + 400, ROCKALL[1] - 300, 1700, 1100, -55);                             // the Rockall Bank, running off to the north-east
  bank(3300, 1700, 700, 560, -48);                                                        // the Anton Dohrn Seamount
  h = Math.max(h, -2.5 - Math.max(0, Math.hypot(x - ROCKALL[0] + 260, z - ROCKALL[1] - 180) - 150) * 0.35); // Helen's Reef, just awash: no keel crosses it
  h = Math.max(h, island(40 - Math.hypot(x - ROCKALL[0], (z - ROCKALL[1]) * 1.25), 40, 19, 0.9, 4)); // Rockall: the stump, 17 m of granite
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Convoy SC 7', x: -4300, z: -1500, owner: 'nato', sector: 'west', radius: 160 },
  { id: 'B', name: 'The stragglers', x: -2840, z: 1720, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'The columns', x: -1210, z: 400, owner: null, sector: 'centre', radius: 180 },
  { id: 'D', name: 'The head of the convoy', x: 320, z: -860, owner: null, sector: 'centre', radius: 180 },
  { id: 'E', name: 'Rockall', x: 1840, z: -2100, owner: null, sector: 'east', radius: 180 },
  { id: 'K', name: 'The pack', x: 1000, z: 4400, owner: 'pact', sector: 'east', radius: 160 },
];

export default {
  id: 'atlanticConvoy',
  name: 'North Atlantic Convoy',
  description: 'October 1940, a moonlit night by Rockall: slow convoy SC 7 steams east in its columns with a handful of escorts, and the U-boat pack closes from the south on the surface. The stragglers astern, the columns, the head of the convoy, the lone rock of Rockall on its bank.',
  epochs: ['1945'],
  region: 'europe', // (the menu's Western Europe — at sea named the North Atlantic: data/epoch.js)
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'night', weather: 'clear' },   // (the moonlit nights of 18 and 19 October)
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

  bases: { nato: { x: -4600, z: -1500, entries: [-600, 0, 600] }, pact: { x: 1000, z: 4650, entries: [-800, 0, 800] } },
  maxStacks: 14,
  cameraStart: { nato: { x: -4000, z: -1300 }, pact: { x: 900, z: 4100 } },
  points,

  spawns: {
    // the convoy in columns heading east, the escorts on its bow and beam; the pack spread on the surface to the south
    nato: [{ unit: 'transport', x: -4450, z: -1800, facing: 1.75 }, { unit: 'transport', x: -4450, z: -1500, facing: 1.75 }, { unit: 'transport', x: -4450, z: -1200, facing: 1.75 },
      { unit: 'destroyer', x: -3950, z: -1500, facing: 1.75 }, { unit: 'frigate', x: -4200, z: -2050, facing: 1.75 }, { unit: 'frigate', x: -4200, z: -950, facing: 1.75 }],
    pact: [{ unit: 'submarine', x: 300, z: 4000, facing: Math.PI }, { unit: 'submarine', x: 1700, z: 4000, facing: Math.PI },
      { unit: 'destroyer', x: 800, z: 4350, facing: Math.PI }, { unit: 'destroyer', x: 1200, z: 4350, facing: Math.PI }],
  },

  decorate({ scene, terrain, cover }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);   // (the water's depth, colour and surf from the sea floor: world/Sea.js)
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
