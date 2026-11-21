// The GIUK gap, 1985: the sea between Greenland, Iceland and the Faroes, the door the Soviet Northern Fleet's
// submarines and bombers had to pass to reach the Atlantic convoy routes, and where NATO meant to shut it. On
// the map: Iceland's south-east coast across the north-west corner (black sand under the moss, the ice cap of
// Vatnajökull above it, Höfn by its lagoon, the Ingólfshöfði headland); the Faroes as a knot of steep, treeless
// islands on the east edge (Tórshavn on Streymoy, lights on the capes); the Iceland–Faroe Ridge running between
// them, the shallower water the SOSUS lines lay along; the Faroe Bank, a wide shoal south-west of the islands.
// Open Atlantic to the south. A US Navy group (carrier escorts, ASW frigates) comes up from the convoy routes in
// the south, the Northern Fleet's surface action group and its submarines down from the Norwegian Sea in the north.
// Fair by sailing distance (scratchpad seapath): the land is all on the Soviet half, so the zones sit on the ridge
// and south of it, where both fleets reach them in the same time; Ingólfshöfði lies as near one as the other,
// the ridge halfway, the Faroe Bank a little nearer the Northern Fleet as Ingólfshöfði is a little nearer NATO.
// Laid out at full size (`widened`). Ships only (data/units/ships85.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(1985_31);
const sea = createSea({ level: 0, size: SIZE, color: 0x203a48 });

/** Iceland's south-east coast (x) at z: north-east to south-west across the corner, land to the west of it. */
const iceX = (z: number) => -4900 + (300 - z) * 0.6 + fbm(noise, z * 0.0011, 2.7, 3) * 200;
const HOFN = -2900, INGOLF = -900;
/** The Faroes: [x, z, radius, height] — steep, cliffed, bare. */
const FAROES = [[3650, -1350, 380, 300], [4250, -1000, 300, 280], [3700, -800, 240, 230], [4350, -450, 220, 220], [3250, -1050, 190, 190], [4450, -1550, 230, 250], [3950, 50, 170, 170]];
const TORSHAVN = { x: 3950, z: -1080 };

function height(x: number, z: number) {
  let h = -70 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 12;
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  const wob = fbm(noise, x * 0.004, z * 0.004, 2) * 90;
  // the Iceland–Faroe Ridge: shallower water along z ≈ 0, still deep enough for any hull
  h = Math.max(h, -26 - Math.abs(z + fbm(noise, x * 0.0008, 5.1, 2) * 250) * 0.02);
  // the Faroe Bank: a wide shoal, six metres at its crest
  const bank = 430 - Math.hypot(x - 2750, (z - 450) * 0.8) + wob;
  h = Math.max(h, -6 - Math.max(0, 300 - bank) * 0.12);
  // Iceland: black sand, moss, then the ice cap rising inland; the Ingólfshöfði headland stands out from it
  const d = iceX(z) - x + wob;
  h = Math.max(h, shore(d, 120, n, 45) + Math.max(0, Math.min(230, (d - 450) * 0.11)));
  h = Math.max(h, island(140 - Math.hypot(x - iceX(INGOLF) - 120, z - INGOLF) + wob * 0.3, 140, 70, 0.7, 10));
  for (const [fx, fz, r, top] of FAROES) h = Math.max(h, island(r - Math.hypot(x - fx, z - fz) + fbm(noise, x * 0.006, z * 0.006, 2) * 60, r, top, fbm(noise, x * 0.014, z * 0.014, 2) * 0.5 + 0.5, 8));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Carrier group', x: -300, z: 3950, owner: 'nato', sector: 'centre', radius: 150 },
  { id: 'B', name: 'Off Ingólfshöfði', x: -3330, z: -110, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'Iceland–Faroe Ridge', x: 0, z: 0, owner: null, sector: 'centre', radius: 190 },
  { id: 'D', name: 'Faroe Bank', x: 2310, z: 60, owner: null, sector: 'east', radius: 170 },
  { id: 'K', name: 'Northern Fleet', x: 300, z: -3950, owner: 'pact', sector: 'centre', radius: 150 },
];

export default {
  id: 'giukGap',
  name: 'The GIUK Gap',
  description: 'The sea between Iceland and the Faroes, 1985: the Northern Fleet comes south to break out to the Atlantic convoy routes, a US Navy group comes north to shut the gap. Iceland’s ice cap to the west, the Faroe cliffs to the east, the ridge between.',
  epochs: ['1985'],
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'overcast' },
  fow: 0.5,
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  size: SIZE,
  segments: 640,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 4160, near: 2, far: 16200 },
  seed: 198531,
  height,
  river: sea,

  theme: {
    fogColor: 0x96a4ae, fogDensity: 0.00016,
    skyTop: 0x566c80, skyHorizon: 0xb0bac2, skyBottom: 0x788894,
    sunColor: 0xeeece6, sunIntensity: 1.5, sunDisk: 0.25,
    clouds: 0.8, cloudLight: 0xe4e8ec, cloudDark: 0x86929c,
    sunDir: [0.3, 0.45, 0.7],
    hemiSky: 0xc0cad2, hemiGround: 0x4a565e, hemiIntensity: 1.2,
    rimColor: 0xdae2e8, rimIntensity: 0.25,
    terrain: {
      grass: '#56643f', grassAlt: '#606c46', dryGrass: '#868664', dirt: '#5e5a50', rock: '#6e6a64',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (x < 0 && y > 110) return [0xe8eef2, 1];                  // Vatnajökull's ice
        if (y > 150) return [0xdfe4e6, 1];                           // snow on the Faroe tops
        if (y > 55) return [0x6a675f, 1];                            // bare basalt
        if (y > 4) return [fbm(noise, x * 0.006, z * 0.006, 2) > 0.1 ? 0x5e6c3e : 0x55613a, 1]; // moss and grass
        return y > -0.8 ? [0x2f2d2b, 1] : [0x3a3834, 1];             // black sand, and under the water
      },
    },
  },

  bases: { nato: { x: -300, z: 4300, entries: [-800, 0, 800] }, pact: { x: 300, z: -4300, entries: [-800, 0, 800] } },
  maxStacks: 12,
  cameraStart: { nato: { x: -300, z: 3900 }, pact: { x: 300, z: -3900 } },
  points,

  spawns: {
    nato: [{ unit: 'cruiser', x: -300, z: 4050, facing: Math.PI }, { unit: 'destroyer', x: -650, z: 4200, facing: Math.PI }, { unit: 'frigate', x: 50, z: 4200, facing: Math.PI }],
    pact: [{ unit: 'cruiser', x: 300, z: -4050, facing: 0 }, { unit: 'destroyer', x: 650, z: -4200, facing: 0 }, { unit: 'frigate', x: -50, z: -4200, facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const village = (cx: number, cz: number, n: number, rx: number, rz: number, face: number, church: boolean) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * rx, z = cz + (rand() - 0.5) * rz, y = height(x, z);
        if (y > 3 && y < 45) props.house({ x, z, yaw: face + (rand() - 0.5) * 0.4, width: 7 + rand() * 3, depth: 6 + rand() * 2 });
      }
      if (church && height(cx, cz) > 3) props.church({ x: cx, z: cz, yaw: face });
    };
    village(iceX(HOFN) - 160, HOFN, 18, 220, 360, -Math.PI / 4, true);            // Höfn, by its lagoon
    village(TORSHAVN.x + 240, TORSHAVN.z + 120, 22, 140, 260, -Math.PI / 2, true); // Tórshavn, on Streymoy's east side
    village(3650 - 280, -1350 + 120, 6, 90, 160, Math.PI / 2, false);             // a fishing village on the west side
    props.tower({ x: iceX(INGOLF) + 160, z: INGOLF, concrete: true });            // the Ingólfshöfði light
    props.tower({ x: iceX(HOFN - 300) - 80, z: HOFN - 300, concrete: true });      // Stokksnes, and the radar station by it
    props.mast({ x: iceX(HOFN - 300) - 150, z: HOFN - 340, height: 30 });
    props.tower({ x: 3950, z: 50 + 150, concrete: true });                         // Suðuroy, the southern light
    props.tower({ x: 3250 - 170, z: -1050, concrete: true });                      // Mykines, the western light
    props.finish();
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
