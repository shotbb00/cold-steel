// Off Corfu, 1807–09 (the 1806 sea battles, the campaign's `ionian` zone): Seniavin's Russian squadron held Corfu and
// the Ionian Islands from 1806; at Tilsit (July 1807) the Tsar gives them to Napoleon, César Berthier's French garrison
// moves in, and Collingwood's cruisers close the Corfu channel — Ganteaume's fleet runs the blockade with stores in
// February 1808, the frigates and store ships slip in and out (Belle Poule takes the Var off Valona in 1809), and in
// the autumn of 1809 the British take Zante and Cephalonia. Here a French division out of Corfu meets the British
// cruisers in the channel. Corfu's east coast along the west edge — the town and the Old Fortress on its rock, Vido
// island off the harbour, Mount Pantokrator over the north — and the Albanian shore along the east edge, the
// mountains of Epirus behind it and Butrint's castle in the south; the channel open to the north (closing towards
// Kassiopi beyond the edge) and the south. Laid out at full size (`widened`). Fair: the homes mirrored west and east,
// the three open zones down the middle of the channel on the line between them, equally far by sail from both
// (seapath); the channel kept over five kilometres wide so that no zone lies in a narrow or behind Vido. The wind the
// winter scirocco, south-south-east up the channel across the fleets' line: both reach. (Seniavin's Russians sail here in the
// world campaign, under their own names: data/units1806/eastNavies.js; the map's own battle is the British against the French after Tilsit.)
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1807_12);
const sea = createSea({ level: 0, size: SIZE, color: 0x1a4c68 });
// the ships' names (entities/UnitStack.js shipName): the French at Corfu and Ganteaume's relief, Collingwood's Ionian cruisers
Object.assign(sea, {
  names: {
    nato: {
      battleship: ['Majestueux'],
      cruiser: ['Suffren', 'Ulm', 'Danube', 'Dix-Août', 'Ajax', 'Breslaw'],
      frigate: ['Pauline', 'Pomone', 'Danaé', 'Flore', 'Caroline', 'Médée', 'Hortense', 'Calypso'],
      destroyer: ['Var', 'Nisus', 'Requin', 'Diligente', 'Lynx', 'Sylphe'],
      ptBoat: ['Canonnière 1', 'Canonnière 2', 'Canonnière 3', 'Canonnière 4', 'Canonnière 5', 'Canonnière 6'],
      fireship: ['Brûlot 1', 'Brûlot 2', 'Brûlot 3'],
    },
    pact: {
      battleship: ['Royal Sovereign'],
      cruiser: ['Magnificent', 'Standard', 'Montagu', 'Glory', 'Malta', 'Ajax'],
      frigate: ['Belle Poule', 'Seahorse', 'Porcupine', 'Leonidas', 'Topaze', 'Apollo', 'Amphion', 'Spartan'],
      destroyer: ['Philomel', 'Redwing', 'Parthian', 'Cephalus', 'Hind', 'Orestes'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4'],
      fireship: ['Devastation', 'Thunder', 'Aetna'],
    },
  },
});

/** Corfu's east coast (x) at z: the Old Fortress's rock pushing out by the town, Garitsa bay south of it, the north
 *  coast turning east towards Kassiopi beyond the edge. */
const corfuX = (z: number) => -2650 + fbm(noise, 2.2, z * 0.0012, 3) * 110
  + 300 * Math.max(0, 1 - ((z - 350) / 260) ** 2) ** 1.3       // the Old Fortress
  - 220 * Math.max(0, 1 - ((z - 800) / 300) ** 2)              // Garitsa bay
  + Math.max(0, -3000 - z) * 0.9;                              // the north coast towards Kassiopi
/** The Albanian shore (x) at z, closing a little towards the north narrows. */
const epirusX = (z: number) => 2700 + fbm(noise, 7.9, z * 0.0011, 3) * 130 - Math.max(0, -1800 - z) * 0.3;
const TOWN = { x: corfuX(350), z: 350 };
const VIDO = { x: -2180, z: -420, r: 140 };
const PANTOKRATOR = { x: -3400, z: -2600 };
const BUTRINT = { x: 2850, z: 2300 };

function height(x: number, z: number) {
  let h = -120 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 16;
  // Corfu: olive-grown hills behind the shore, Pantokrator's bare mass in the north
  const pk = Math.max(0, 1 - Math.hypot(x - PANTOKRATOR.x, z - PANTOKRATOR.z) / 1500);
  h = Math.max(h, shore(corfuX(z) - x, 110 + 520 * pk + fbm(noise, x * 0.0015, z * 0.0015, 3) * 60, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 14));
  // the Albanian shore: a narrow strand and the mountains of Epirus straight behind
  h = Math.max(h, shore(x - epirusX(z), 520 + fbm(noise, x * 0.0012, z * 0.0012, 3) * 180, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 20));
  // Vido, low and wooded, off the harbour
  h = Math.max(h, island(VIDO.r * (1 + fbm(noise, x * 0.01, z * 0.01, 2) * 0.15) - Math.hypot(x - VIDO.x, z - VIDO.z), VIDO.r, 30, 0.4, 10));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Off Corfu town', x: -1650, z: 0, owner: 'nato', sector: 'west', radius: 170 },
  { id: 'B', name: 'Towards Kassiopi', x: 0, z: -1650, owner: null, sector: 'centre', radius: 200 },
  { id: 'C', name: 'Mid-channel', x: 0, z: 0, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'Off Butrint', x: 0, z: 1650, owner: null, sector: 'centre', radius: 200 },
  { id: 'K', name: 'Under the Albanian shore', x: 1650, z: 0, owner: 'pact', sector: 'east', radius: 170 },
];

// a division in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});

export default {
  id: 'corfu-1807',
  name: 'Off Corfu',
  description: 'The Corfu channel, 1807–09: after Tilsit the French hold Corfu and the British cruisers close the channel. Corfu town, the Old Fortress and Pantokrator to the west, the Albanian shore and the mountains of Epirus to the east.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'italy',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 160, speed: 8, veer: 0.2 },   // the scirocco, south-south-east up the channel, warm and damp in winter (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180712,
  height,
  river: sea,

  theme: {
    // a scirocco day in winter: a milky haze, the light soft and yellowish, the sea grey-blue
    fogColor: 0xc8c8bc, fogDensity: 0.00018,
    skyTop: 0x5a7898, skyHorizon: 0xd0ccc0, skyBottom: 0x8e9aa4,
    sunColor: 0xfae4c0, sunIntensity: 1.6, sunDisk: 0.4,
    clouds: 0.55, cloudLight: 0xf0ece4, cloudDark: 0x9a9c9c,
    sunDir: [0.3, 0.35, 0.7],
    hemiSky: 0xcfd2d0, hemiGround: 0x5a5a40, hemiIntensity: 1.15,
    rimColor: 0xf4ecdc, rimIntensity: 0.22,
    terrain: {
      grass: '#56643a', grassAlt: '#606c3e', dryGrass: '#8e8a60', dirt: '#7e6a50', rock: '#aaa494',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 380) return [0xa8a294, 1];                       // the bare limestone of Pantokrator and the Epirus ranges
        if (y > 25) return x < 0 ? [0x4e5e34, 1] : [0x66683e, 1]; // Corfu's olive groves, the Albanian scrub
        if (y > 4) return [0xb4ac94, 1];                         // the pale rock above the water
        return y > 0.5 ? [0xbcb094, 1] : [0x8e8470, 1];          // the shingle, wet at the water
      },
    },
  },

  bases: { nato: { x: -1900, z: -100, entries: [-500, 0, 500] }, pact: { x: 1900, z: -100, entries: [-500, 0, 500] } },
  maxStacks: 10,
  cameraStart: { nato: { x: -1300, z: 0 }, pact: { x: 1300, z: 0 } },
  points,

  spawns: {
    nato: line(['frigate', 'cruiser', 'cruiser', 'frigate'], -1500, -30, Math.PI / 2),
    pact: line(['frigate', 'cruiser', 'cruiser', 'frigate'], 1500, -30, -Math.PI / 2),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const cx = (z: number, k: number) => corfuX(z) - k;
    // Corfu town: the tall Venetian houses packed behind the Old Fortress, the Spianada, churches with bell towers
    for (let i = 0; i < 120; i++) {
      const z = 450 + rand() * 650, x = cx(z, 60 + rand() * 380);
      if (height(x, z) < 3 || height(x, z) > 80) continue;
      props.townHouse({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.3, width: 8 + rand() * 3, depth: 9, storeys: 3 + Math.floor(rand() * 2), damaged: 0 });
    }
    for (const z of [520, 760, 980]) props.church({ x: cx(z, 260), z, yaw: Math.PI / 2 });
    props.tower({ x: TOWN.x - 80, z: TOWN.z });                   // the Old Fortress's keep on its rock
    props.tower({ x: cx(-150, 120), z: -150 });                  // the New Fortress over the harbour
    props.tower({ x: VIDO.x, z: VIDO.z });                       // Vido's battery
    // villages in the olive groves up the coast; Kassiopi's castle at the north edge
    for (let i = 0; i < 50; i++) {
      const z = -2600 + rand() * 2400, x = cx(z, 60 + rand() * 300);
      if (height(x, z) > 4 && height(x, z) < 120) props.house({ x, z, yaw: Math.PI / 2 + (rand() - 0.5) * 0.5, width: 6 + rand() * 3, depth: 5 + rand() * 2 });
    }
    props.tower({ x: cx(-2900, 80), z: -2900 });
    // the Albanian shore: Butrint's Venetian castle, a few hamlets and a watch tower
    props.tower({ x: BUTRINT.x + 120, z: BUTRINT.z });
    props.church({ x: BUTRINT.x + 260, z: BUTRINT.z + 80, yaw: -Math.PI / 2 });
    for (let i = 0; i < 18; i++) {
      const z = -1500 + rand() * 3500, x = epirusX(z) + 60 + rand() * 200;
      if (height(x, z) > 4 && height(x, z) < 120) props.flatHouse({ x, z, yaw: -Math.PI / 2 + (rand() - 0.5) * 0.5, width: 6 + rand() * 2, depth: 6 });
    }
    props.tower({ x: epirusX(-600) + 120, z: -600 });
    props.finish();
    // olives and cypress on Corfu, macchia on the Albanian slopes, none on the high bare rock
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 1000, broadleaf: 0.6, autumn: 0, maxY: 380, size: 0.85,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 || (z > 300 && z < 1200 && x < corfuX(z) && x > corfuX(z) - 500) }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
