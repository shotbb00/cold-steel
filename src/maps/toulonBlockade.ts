// Off Toulon, the blockade 1805–07 (the 1806 sea battles, the campaign's `lion` zone, the Gulf of Lion): Nelson and
// then Collingwood keep the Toulon fleet in. The main body cruises out of sight off Cap Sicié; the inshore squadron,
// a couple of 74s and the frigates, stands off the harbour mouth in all weathers and counts the yards crossed in the
// roads. When the mistral blows out of the Rhône valley the British are driven off station — and the French slip
// out under the coast (Villeneuve, January 1805; Ganteaume, February 1808). Here a French division comes out of the
// roads and the inshore squadron turns to meet it. The Provençal coast along the north edge: Toulon and the Grande
// Rade under Mont Faron, the Saint-Mandrier peninsula closing the roads to the south, the cliffs of Cap Sicié pushing
// out to the south-west with the Deux Frères rocks, and far to the east the Hyères islands (Porquerolles, Port-Cros)
// — no zone behind them. Laid out at full size (`widened`). Fair: the homes point-mirrored through the middle zone —
// the French off the roads, the British out to sea — and the two open zones either side of the line between them,
// equally far by sail from both (seapath); none in a cape's lee. The mistral from the north-west: the French run out
// before it on the quarter, the British reach up across it — neither has it in his teeth.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1806_02);
const sea = createSea({ level: 0, size: SIZE, color: 0x1c4a72 });
// the ships' names (entities/UnitStack.js shipName): the Toulon fleet, Collingwood's Mediterranean fleet
Object.assign(sea, {
  names: {
    nato: {
      battleship: ['Commerce de Paris'],
      cruiser: ['Robuste', 'Borée', 'Génois', 'Annibal', 'Lion', 'Ajax', 'Donawerth', 'Breslaw', 'Magnanime'],
      frigate: ['Pomone', 'Pénélope', 'Pauline', 'Incorruptible', 'Thémis', 'Hortense'],
      destroyer: ['Lodi', 'Abeille', 'Cyclope', 'Requin', 'Ligurienne'],
      ptBoat: ['Canonnière 1', 'Canonnière 2', 'Canonnière 3', 'Canonnière 4', 'Canonnière 5', 'Canonnière 6'],
      fireship: ['Brûlot 1', 'Brûlot 2', 'Brûlot 3'],
    },
    pact: {
      battleship: ['Ocean'],
      cruiser: ['Canopus', 'Donegal', 'Spencer', 'Tigre', 'Leviathan', 'Kent', 'Renown', 'Excellent', 'Repulse'],
      frigate: ['Active', 'Seahorse', 'Amphion', 'Juno', 'Niger', 'Spartan'],
      destroyer: ['Weazle', 'Halcyon', 'Redwing', 'Kingfisher', 'Morgiana', 'Bustard'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4'],
      fireship: ['Prometheus', 'Thais', 'Etna'],
    },
  },
});

const ROADS = 350;                                        // x of the Grande Rade's entrance
/** The Provençal coast's line (z) at x: Cap Sicié pushing south in the west, the roads cut in north behind Saint-Mandrier. */
const coastZ = (x: number) => -2250 + fbm(noise, x * 0.0012, 2.3, 3) * 120
  + 620 * Math.max(0, 1 - ((x + 1250) / 520) ** 2) ** 1.5      // Cap Sicié
  + 240 * Math.max(0, 1 - ((x - ROADS + 330) / 300) ** 2)      // Saint-Mandrier, closing the roads from the south-west
  - 380 * Math.max(0, 1 - ((x - ROADS - 260) / 380) ** 2) ** 1.2 // the Grande Rade
  + Math.max(0, x - 1600) * 0.18;                              // the coast falling away south-east toward Hyères
const SICIE = { x: -1250, z: coastZ(-1250) };
const ISLANDS = [[2550, -1250, 330, 120], [2950, -1050, 200, 90]] as const; // Porquerolles, Port-Cros: [x, z, radius, height]

function height(x: number, z: number) {
  let h = -90 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 14;
  // limestone and red cliffs, Mont Faron and the Gros Cerveau behind
  const top = 160 + fbm(noise, x * 0.0015, z * 0.0015, 3) * 110;
  h = Math.max(h, shore(coastZ(x) - z, top, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 14));
  // the Deux Frères: two stacks off Sicié's point
  for (const [dx, dz] of [[-40, 170], [40, 200]]) {
    const r = Math.hypot(x - SICIE.x - dx, z - SICIE.z - dz);
    if (r < 32) h = Math.max(h, -2 + (32 - r) / 32 * 16);
  }
  for (const [ix, iz, r, t] of ISLANDS) h = Math.max(h, island(r - Math.hypot((x - ix) * 0.7, z - iz), r, t, 0.5, 12));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Toulon roads', x: 250, z: -1350, owner: 'nato', sector: 'east', radius: 170 },
  { id: 'B', name: 'Off Cap Sicié', x: -1300, z: 350, owner: null, sector: 'west', radius: 200 },
  { id: 'C', name: 'The inshore station', x: 0, z: 550, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'Towards Hyères', x: 1300, z: 750, owner: null, sector: 'east', radius: 200 },
  { id: 'K', name: 'The inshore squadron', x: -250, z: 2450, owner: 'pact', sector: 'west', radius: 170 },
];

// a division in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});
const SOUTH = Math.atan2(3800, -500), NORTH = SOUTH + Math.PI; // (the line between the homes)

export default {
  id: 'toulon-blockade',
  name: 'Off Toulon',
  description: 'Off Toulon, 1805–07: the mistral drives the British inshore squadron off its station and a French division slips out of the roads under the Provençal coast. Cap Sicié’s cliffs, Mont Faron over the harbour, the Hyères islands far to the east.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'italy',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 318, speed: 11, veer: 0.15 },   // the mistral: north-west, hard and steady out of the Rhône valley under a clear sky (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180602,
  height,
  river: sea,

  theme: {
    // the mistral's sky: hard blue, swept clean, the light sharp, the sea dark blue flecked white
    fogColor: 0xb8cce0, fogDensity: 0.00012,
    skyTop: 0x2f68b0, skyHorizon: 0xbcd4ea, skyBottom: 0x7ea2c4,
    sunColor: 0xfff4e0, sunIntensity: 2.1, sunDisk: 0.65,
    clouds: 0.15, cloudLight: 0xffffff, cloudDark: 0xb4c0cc,
    sunDir: [0.2, 0.6, 0.6],
    hemiSky: 0xc6daf0, hemiGround: 0x6a6448, hemiIntensity: 1.25,
    rimColor: 0xf2f6fa, rimIntensity: 0.25,
    terrain: {
      grass: '#6a7040', grassAlt: '#747a46', dryGrass: '#a89a64', dirt: '#9a7a56', rock: '#c4bcaa',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 120) return [0xbab2a0, 1];                       // the bare limestone of Faron and the Gros Cerveau
        if (y > 30) return [0x5c6a3a, 1];                        // the garrigue and the Aleppo pines
        if (y > 4) return x < -900 ? [0x9a5a44, 1] : [0xa8987a, 1]; // Sicié's red sandstone cliffs, the pale rock elsewhere
        return y > 0.5 ? [0xc8b48c, 1] : [0x9a8a6a, 1];          // the shingle, wet at the water
      },
    },
  },

  bases: { nato: { x: 300, z: -1650, entries: [-500, 0, 500] }, pact: { x: -300, z: 2750, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 200, z: -1100 }, pact: { x: -200, z: 2200 } },
  points,

  spawns: {
    nato: line(['frigate', 'cruiser', 'cruiser', 'frigate'], 200, -1200, SOUTH),
    pact: line(['frigate', 'cruiser', 'cruiser', 'frigate'], -200, 2300, NORTH),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const cz = (x: number, k: number) => coastZ(x) - k;
    // Toulon: the old town and the arsenal's sheds on the north shore of the roads, the cathedral's tower
    for (let i = 0; i < 80; i++) {
      const x = ROADS + 60 + rand() * 520, z = cz(x, 60 + rand() * 300);
      if (height(x, z) < 3 || height(x, z) > 60) continue;
      props.townHouse({ x, z, yaw: (rand() - 0.5) * 0.3, width: 8 + rand() * 4, depth: 9, storeys: 2 + Math.floor(rand() * 3), damaged: 0 });
    }
    props.church({ x: ROADS + 330, z: cz(ROADS + 330, 200), yaw: 0 });
    for (let i = 0; i < 6; i++) props.flatHouse({ x: ROADS - 20 + i * 40, z: cz(ROADS - 20 + i * 40, 50), yaw: 0, width: 30, depth: 14 });   // the arsenal's sheds
    // the forts on the roads: the Grosse Tour, Balaguier and l'Éguillette, Fort Faron on the height
    for (const x of [ROADS + 640, ROADS - 160, ROADS - 260]) props.tower({ x, z: cz(x, 40) });
    props.tower({ x: ROADS + 450, z: cz(ROADS + 450, 650) });
    // the signal post and the chapel of Notre-Dame-du-Mai on Cap Sicié; La Seyne and Six-Fours' houses
    props.tower({ x: SICIE.x, z: cz(SICIE.x, 120) });
    props.church({ x: SICIE.x + 200, z: cz(SICIE.x + 200, 260), yaw: 0 });
    for (let i = 0; i < 30; i++) {
      const x = -700 + rand() * 600, z = cz(x, 80 + rand() * 260);
      if (height(x, z) > 3 && height(x, z) < 60) props.house({ x, z, yaw: (rand() - 0.5) * 0.6, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    // Porquerolles' fort and its handful of houses
    props.tower({ x: ISLANDS[0][0] - 120, z: ISLANDS[0][1] - 180 });
    props.finish();
    // Aleppo pines and holm oak on the hills, bent by the mistral
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 800, broadleaf: 0.35, autumn: 0, maxY: 260, size: 0.9,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 || (x > ROADS - 100 && x < ROADS + 700 && z > coastZ(x) - 420) }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
