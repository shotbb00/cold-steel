// Operation Pedestal, August 1942: the convoy to Malta through the Sicilian narrows. Fourteen merchant ships
// under the Royal Navy's escort came in from Gibraltar past Cape Bon; U-boats, E-boats out of Porto Empedocle
// and the bombers from Sicily sank nine of them and the carrier Eagle, and five — the tanker Ohio last, lashed
// between two destroyers — reached Grand Harbour and kept the island in the war. Compressed onto the map: the
// Skerki Bank's shoals in the west between Cape Bon (Tunisia, south-west) and the Egadi islands off Sicily's
// western tip; Sicily's south coast along the north edge — Marsala, Mazara del Vallo, Sciacca, Porto Empedocle;
// Pantelleria's volcano in the middle of the narrows; Malta, Gozo and Comino in the south-east, Valletta on
// Grand Harbour. The convoy (the Royal Navy) comes from the west, the Kriegsmarine's group from the east, off
// Porto Empedocle. Ships only (the Luftwaffe's bombers are left out: a sea battle). x north, z east.
// Fair, not mirrored: Skerki is as near the convoy as Grand Harbour is near the Germans, Pantelleria and the zone
// off Mazara the two middle ones, each about as near one fleet as the other by the sailing routes; the convoy has
// Cape Bon's coast to hide by, the Germans Malta's. Laid out at full size (`widened`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 12000;
const HALF = 5000;
const noise = createNoise2D(1942_08);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f5a7a });

/** Sicily's south coast (x) at z, and its western end (Capo Lilibeo, by Marsala). */
const xS = (z: number) => 3300 - (z + 3100) * 0.06 + fbm(noise, z * 0.0012, 2.2, 3) * 140;
const SICILY_W = -3100;
/** The Tunisian coast (x) at z: Cape Bon's tip, the coast running back south-west from it. */
const xT = (z: number) => (z < -2300 ? -3700 - 0.6 * (z + 2300) : -3700 - 1.6 * (z + 2300)) + fbm(noise, z * 0.0015, 7.1, 3) * 110;
const PANTELLERIA = [-1500, -300];
const MALTA = [-3400, 3100];
const along = (x: number, z: number) => ({ u: (-(x - MALTA[0]) + (z - MALTA[1])) * 0.7071, v: ((x - MALTA[0]) + (z - MALTA[1])) * 0.7071 }); // (Malta lies north-west to south-east: u along it, v to the north-east)

function height(x: number, z: number) {
  let h = -110 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 22;
  const n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  const wob = fbm(noise, x * 0.004, z * 0.004, 2) * 80;
  h = Math.max(h, shore(Math.min(x - xS(z), (z - SICILY_W) + Math.max(0, x - 3600) * 0.6) + wob, 70, n, 30));   // Sicily
  h = Math.max(h, shore(xT(z) - x + wob, 45, n, 35));                                                              // Cape Bon
  h = Math.max(h, island(260 - Math.hypot(x - 3750, z + 3850) + wob * 0.5, 260, 40, n, 15));                     // Favignana
  h = Math.max(h, island(200 - Math.hypot(x - 4500, z + 4600) + wob * 0.5, 200, 70, n, 10));                     // Marettimo
  h = Math.max(h, island(480 - Math.hypot(x - PANTELLERIA[0], (z - PANTELLERIA[1]) * 0.85) + wob * 0.6, 480, 140, n, 12)); // Pantelleria, the volcano
  const m = along(x, z);
  h = Math.max(h, island(420 - Math.hypot(m.u * 0.47, m.v) + wob * 0.5, 420, 60, 0.4, 14));                      // Malta
  h = Math.max(h, island(260 - Math.hypot(x + 2550, z - 2350) + wob * 0.4, 260, 50, 0.4, 12));                   // Gozo
  h = Math.max(h, island(70 - Math.hypot(x + 2920, z - 2720), 70, 18, 0.4, 8));                                   // Comino
  // the Skerki Bank: a wide bank and its shoals (Keith Reef) just under the surface — the convoy's channel runs south of them
  h = Math.max(h, -22 - Math.max(0, Math.hypot(x - 1300, z + 2750) - 520 + wob) * 0.12);
  h = Math.max(h, -2.5 - Math.max(0, Math.hypot(x - 1400, z + 2850) - 230 + wob * 0.5) * 0.3);
  h = Math.max(h, -35 - Math.max(0, Math.hypot(x + 400, z + 200) - 600 + wob) * 0.1);                             // the Adventure Bank, north of Pantelleria: deep enough
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Pedestal convoy', x: 0, z: -3950, owner: 'nato', sector: 'centre', radius: 160 },
  { id: 'B', name: 'Skerki Channel', x: 590, z: -1780, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'Pantelleria', x: -1055, z: 40, owner: null, sector: 'centre', radius: 180 },
  { id: 'D', name: 'Off Mazara', x: 2030, z: -450, owner: null, sector: 'centre', radius: 180 },
  { id: 'E', name: 'Grand Harbour', x: -2380, z: 3060, owner: null, sector: 'east', radius: 180 },
  { id: 'K', name: 'Porto Empedocle', x: 1000, z: 3950, owner: 'pact', sector: 'centre', radius: 160 },
];

export default {
  id: 'maltaConvoy',
  name: 'Malta Convoy',
  description: 'August 1942, Operation Pedestal: the convoy to Malta through the Sicilian narrows, past Cape Bon, the Skerki Bank and Pantelleria, against U-boats, E-boats and German destroyers. Sicily along the north, Malta in the south-east.',
  epochs: ['1945'],
  region: 'med',
  theatre: 'sea',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  fow: 0.5,
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['brit'], pact: ['wh'] }, // (the Royal Navy and the Kriegsmarine: data/units45/ships.js)
  size: SIZE,
  segments: 640,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 4200, near: 2, far: 16000 },
  seed: 194208,
  height,
  river: sea,

  theme: {
    fogColor: 0xc4d4de, fogDensity: 0.00012,
    skyTop: 0x3a78b8, skyHorizon: 0xcadcea, skyBottom: 0x86aac4,
    sunColor: 0xfff2dc, sunIntensity: 2.3, sunDisk: 0.9,
    clouds: 0.2, cloudLight: 0xffffff, cloudDark: 0xc4ccd4,
    sunDir: [0.45, 0.8, 0.35],
    hemiSky: 0xd2e2ee, hemiGround: 0x8a7a5a, hemiIntensity: 1.3,
    rimColor: 0xf0ece0, rimIntensity: 0.3,
    terrain: {
      grass: '#9a9058', grassAlt: '#a89c62', dryGrass: '#cdbb84', dirt: '#b89a6a', rock: '#c8baa0',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 2.5) {
          if (Math.hypot(x - PANTELLERIA[0], (z - PANTELLERIA[1]) * 0.85) < 560) return [y > 40 ? 0x4e4640 : 0x6a5e4e, 1];   // Pantelleria's black lava and its terraces
          if (x < -1800 && z > 1800) return [fbm(noise, x * 0.01, z * 0.01, 2) > 0 ? 0xd8c8a0 : 0xb8a878, 1];                  // Malta's honey limestone and its walled fields
          return [fbm(noise, x * 0.004, z * 0.004, 2) > 0.05 ? 0xc4ae74 : 0x8e8a52, 1];                                       // stubble and olive groves
        }
        return y > -0.8 ? [0xe2d6b0, 1] : [0xc8b88e, 1];                                                                        // the beaches, the sand under the clear water
      },
    },
  },

  bases: { nato: { x: 0, z: -4300, entries: [-800, 0, 800] }, pact: { x: 1000, z: 4300, entries: [-800, 0, 800] } },
  // the airfields round the narrows (systems/Airfields.js): Luqa on Malta for the British, a Sicilian field for the Luftwaffe — the
  // Germans' carriers were their airfields; no torpedo bombers there (no German model yet: never a Japanese one in their slot)
  airfields: [
    { faction: 'nato', x: -3000, z: 2840, yaw: 0, name: 'Luqa airfield', group: { torpBomb: 0 } },
    { faction: 'pact', x: 3060, z: 4080, yaw: 0, name: 'Castelvetrano airfield', group: { torpBomb: 0 } },
  ],
  maxStacks: 14,
  cameraStart: { nato: { x: 0, z: -3900 }, pact: { x: 1000, z: 3900 } },
  points,

  spawns: {
    nato: [{ unit: 'transport', x: -300, z: -4250, facing: 0 }, { unit: 'transport', x: 0, z: -4150, facing: 0 }, { unit: 'transport', x: 300, z: -4250, facing: 0 },
      { unit: 'destroyer', x: 0, z: -3800, facing: 0 }, { unit: 'destroyer', x: -600, z: -3950, facing: 0 }, { unit: 'frigate', x: 600, z: -3950, facing: 0 }],
    pact: [{ unit: 'submarine', x: 300, z: 3600, facing: Math.PI }, { unit: 'submarine', x: 1700, z: 3600, facing: Math.PI },
      { unit: 'ptBoat', x: 700, z: 3800, facing: Math.PI }, { unit: 'destroyer', x: 1300, z: 3800, facing: Math.PI }, { unit: 'destroyer', x: 1000, z: 4100, facing: Math.PI }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const town = (cx: number, cz: number, n: number, rx: number, rz: number, yaw: number, church = true) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rand() - 0.5) * rx, z = cz + (rand() - 0.5) * rz;
        const y = height(x, z);
        if (y > 2.5 && y < 60) props.flatHouse({ x, z, yaw: yaw + (rand() - 0.5) * 0.3, width: 7 + rand() * 4, depth: 7 + rand() * 3, storeys: 1 + Math.floor(rand() * 2) });
      }
      if (church) props.church({ x: cx, z: cz, yaw });
    };
    // Sicily's south coast, the towns on it looking out to sea (south: -x)
    for (const [z, n] of [[-2950, 26], [-1450, 30], [650, 22], [3050, 26]] as [number, number][]) town(xS(z) + 220, z, n, 260, 520, Math.PI / 2);
    town(3550, -3150, 10, 260, 200, Math.PI / 2, false);                               // Marsala's salt pans and wine stores
    props.tower({ x: xS(-2300) + 40, z: -2300, concrete: false });                     // the light on Capo Granitola
    // Cape Bon: Kelibia and the lighthouse on the tip
    town(xT(-3200) - 220, -3200, 14, 260, 360, -Math.PI / 2);
    props.tower({ x: xT(-2350) - 60, z: -2350, concrete: false });
    // Pantelleria: the harbour town on its north-west shore, the dammusi among the terraces
    town(PANTELLERIA[0] + 360, PANTELLERIA[1] - 300, 16, 200, 220, Math.PI / 4);
    // Malta: Valletta on its peninsula over Grand Harbour, the bastions, Mdina inland, Victoria on Gozo
    const val = { x: MALTA[0] + 0.7071 * 380, z: MALTA[1] + 0.7071 * 380 };
    town(val.x, val.z, 40, 260, 260, Math.PI / 4);
    props.church({ x: val.x - 60, z: val.z + 40, yaw: Math.PI / 4 });
    for (let k = 0; k < 7; k++) props.lowWall({ x: val.x + 120 - k * 30, z: val.z + 80 + k * 30, yaw: -Math.PI / 4, length: 44, height: 7, color: 0xc8b88a }); // the bastions over the harbour mouth
    props.tower({ x: val.x + 150, z: val.z + 150, concrete: false });                 // Fort St Elmo's light
    town(MALTA[0] - 60, MALTA[1] - 160, 14, 160, 160, Math.PI / 4);                  // Mdina
    town(-2550, 2350, 12, 160, 160, Math.PI / 4);                                    // Victoria
    props.finish();
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 1800, broadleaf: 0.9, autumn: 0, maxY: 200, size: 0.8,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 4 || (x < -1800 && z > 1800) }] }); // (olives and carob on Sicily, Cape Bon and Pantelleria; Malta all but treeless)
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
