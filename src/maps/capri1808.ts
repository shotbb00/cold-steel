// The Bay of Naples, Capri 1806–08 (the 1806 sea battles, the campaign's `tyrrhenian` zone): Sidney Smith takes
// Capri in May 1806 and Hudson Lowe holds it as the Royal Navy's station off Naples — "the little Gibraltar" — with a
// frigate or two and the brig-sloops anchored off Marina Grande; from Naples Joseph's and then Murat's navy, a few
// French and Neapolitan frigates and corvettes (Cerere, Fama) and the gunboat flotilla, comes out to cut the island
// off. In October 1808 Lamarque retakes Capri while the flotilla holds the bay. Here the two meet in the open bay.
// The Neapolitan shore along the north edge — Naples' quays and domes, Castel dell’Ovo on its rock, Sant’Elmo over
// the city, the Posillipo hill to the west — and Vesuvius on the skyline to the north-east over Portici and Torre
// del Greco; the Sorrento peninsula running in from the east edge out to Punta Campanella, and Capri off its tip on
// the south edge with Monte Solaro, Marina Grande and the Faraglioni. Laid out at full size (`widened`). Fair: the
// homes point-mirrored through the middle zone — the French off Naples, the British off Capri's north shore — and the
// three open zones across the bay on the line between them, equally far by sail from both (seapath); none in the
// Bocca Piccola between Capri and Campanella, none in the peninsula's lee. The wind the libeccio, west-south-west
// out of the Tyrrhenian across the fleets' line: both reach.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees } from '../world/Vegetation.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 8000;
const HALF = 3000;
const noise = createNoise2D(1808_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f5a7c });
// the ships' names (entities/UnitStack.js shipName): Murat's Neapolitan navy and the French at Naples, the British off Capri
Object.assign(sea, {
  names: {
    nato: {
      battleship: ['Gioacchino'],
      cruiser: ['Capri', 'Monarca', 'Partenope', 'Archimede'],
      frigate: ['Cerere', 'Carolina', 'Letizia', 'Fama', 'Minerva', 'Sirena', 'Pomone', 'Pauline'],
      destroyer: ['Sparviero', 'Achille', 'Nettuno', 'Leggiero', 'Rondine', 'Furet'],
      ptBoat: ['Cannoniera 1', 'Cannoniera 2', 'Cannoniera 3', 'Cannoniera 4', 'Cannoniera 5', 'Cannoniera 6', 'Cannoniera 7', 'Cannoniera 8'],
      fireship: ['Brulotto 1', 'Brulotto 2', 'Brulotto 3'],
    },
    pact: {
      battleship: ['Ville de Paris'],
      cruiser: ['Warrior', 'Canopus', 'Montagu', 'Eagle', 'Repulse', 'Spencer'],
      frigate: ['Spartan', 'Success', 'Ambuscade', 'Mercury', 'Thames', 'Cyane', 'Alceste', 'Unité'],
      destroyer: ['Espoir', 'Pilot', 'Halcyon', 'Electra', 'Philomel', 'Delight'],
      ptBoat: ['Gun-boat 1', 'Gun-boat 2', 'Gun-boat 3', 'Gun-boat 4', 'Gun-boat 5', 'Gun-boat 6'],
      fireship: ['Lucifer', 'Tartarus', 'Infernal'],
    },
  },
});

/** The Neapolitan shore's line (z) at x: Posillipo pushing out in the west, the coast falling away south-east past Vesuvius. */
const coastZ = (x: number) => -2800 + fbm(noise, x * 0.0012, 3.7, 3) * 110
  + 420 * Math.max(0, 1 - ((x + 2650) / 520) ** 2) ** 1.4      // the Posillipo hill
  + Math.max(0, x - 1300) * 0.28;                              // Portici, Torre del Greco
/** The east shore (x) at z: Torre Annunziata and Castellammare under Monte Faito. */
const coastX = (z: number) => 3000 + fbm(noise, 5.1, z * 0.0012, 3) * 90;
/** The Sorrento peninsula: from Castellammare out west-south-west to Punta Campanella. */
const P0 = { x: 3800, z: 500 }, P1 = { x: 1700, z: 2350 };
const peninsulaD = (x: number, z: number) => {
  const dx = P1.x - P0.x, dz = P1.z - P0.z;
  const t = Math.max(0, Math.min(1, ((x - P0.x) * dx + (z - P0.z) * dz) / (dx * dx + dz * dz)));
  return (420 - 170 * t) * (1 + fbm(noise, x * 0.002, z * 0.002, 3) * 0.2) - Math.hypot(x - P0.x - dx * t, z - P0.z - dz * t);
};
/** Capri: lying east-west off the peninsula's tip, Marina Grande on its north shore. */
const CAPRI = { x: 350, z: 3000, r: 520 };
const capriD = (x: number, z: number) => CAPRI.r * (1 + fbm(noise, x * 0.002, z * 0.002, 3) * 0.15) - Math.hypot((x - CAPRI.x) * 0.72, z - CAPRI.z);
const VESUVIUS = { x: 2350, z: -3550 };
const OVO = { x: -1300, z: coastZ(-1300) + 120 };             // Castel dell’Ovo's rock

function height(x: number, z: number) {
  let h = -100 + fbm(noise, x * 0.0005, z * 0.0005, 4) * 14;
  // the Neapolitan shore: tuff hills behind the city, Capodimonte and the Vomero
  h = Math.max(h, shore(coastZ(x) - z, 120 + fbm(noise, x * 0.0015, z * 0.0015, 3) * 70, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 18));
  if (z < 900) h = Math.max(h, shore(x - coastX(z), 200, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 14));
  // the Lattari ridge down the peninsula, cliffs on both shores
  h = Math.max(h, island(peninsulaD(x, z), 300, 380 + fbm(noise, x * 0.003, z * 0.003, 2) * 90, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 10));
  // Capri: Monte Solaro in the west, the saddle with the town, Tiberio in the east; the Faraglioni off the south-east
  h = Math.max(h, island(capriD(x, z), CAPRI.r, 340 + fbm(noise, x * 0.003, z * 0.003, 2) * 80, fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5, 8));
  for (const [dx, dz] of [[420, 470], [470, 500], [520, 520]]) {
    const r = Math.hypot(x - CAPRI.x - dx, z - CAPRI.z - dz);
    if (r < 30) h = Math.max(h, -2 + (30 - r) / 30 * 60);
  }
  // Vesuvius and the Somma's broken rim behind it, the crater smoking
  const v = Math.hypot(x - VESUVIUS.x, z - VESUVIUS.z);
  if (v < 1900) {
    const cone = 820 * (1 - v / 1900) ** 1.15 - Math.max(0, 140 - v) * 0.9;
    const somma = Math.hypot(x - VESUVIUS.x + 200, z - VESUVIUS.z + 350);
    h = Math.max(h, cone, 560 * Math.max(0, 1 - Math.abs(somma - 900) / 300) * (z < VESUVIUS.z - 150 ? 1 : 0));
  }
  // Castel dell’Ovo's rock off the quays
  const o = Math.hypot(x - OVO.x, z - OVO.z);
  if (o < 70) h = Math.max(h, -2 + (70 - o) / 70 * 18);
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Off Naples', x: 300, z: -1900, owner: 'nato', sector: 'centre', radius: 170 },
  { id: 'B', name: 'Towards Posillipo', x: -1480, z: -235, owner: null, sector: 'west', radius: 200 },
  { id: 'C', name: 'The middle of the bay', x: 0, z: 0, owner: null, sector: 'centre', radius: 200 },
  { id: 'D', name: 'Under Vesuvius', x: 1480, z: 235, owner: null, sector: 'east', radius: 200 },
  { id: 'K', name: 'Off Marina Grande', x: -300, z: 1900, owner: 'pact', sector: 'centre', radius: 170 },
];

// a squadron in line abreast across its line of advance, 160 m apart
const line = (units: string[], cx: number, cz: number, facing: number) => units.map((unit, i) => {
  const k = (i - (units.length - 1) / 2) * 160;
  return { unit, x: Math.round(cx + Math.cos(facing) * k), z: Math.round(cz - Math.sin(facing) * k), facing };
});
const SOUTH = Math.atan2(-600, 3800), NORTH = SOUTH + Math.PI; // (the line between the homes)

export default {
  id: 'capri-1808',
  name: 'Capri',
  description: 'The Bay of Naples, 1806–08: Murat’s frigates and gunboat flotilla come out of Naples against the British squadron holding Capri. Naples and Vesuvius along the north, the Sorrento peninsula and Capri’s cliffs to the south-east.',
  epochs: ['1806'],
  theatre: 'sea',
  region: 'italy',
  widened: true,
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 250, speed: 6, veer: 0.3 },   // the libeccio, west-south-west out of the Tyrrhenian, a moderate autumn breeze (world/Wind.js)
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] },
  size: SIZE,
  segments: 520,
  bounds: { x: HALF, z: HALF },
  navCell: 12,
  camera: { maxHeight: 3500, near: 1, far: 14000 },
  seed: 180810,
  height,
  river: sea,

  theme: {
    // an October afternoon on the bay: warm haze, the light golden, the water deep blue
    fogColor: 0xd2d4d0, fogDensity: 0.00014,
    skyTop: 0x4474aa, skyHorizon: 0xd6d8d4, skyBottom: 0x8ca4b8,
    sunColor: 0xffe8c4, sunIntensity: 1.9, sunDisk: 0.6,
    clouds: 0.25, cloudLight: 0xfcfaf6, cloudDark: 0xb0b4b8,
    sunDir: [-0.55, 0.42, 0.5],
    hemiSky: 0xd0dae6, hemiGround: 0x645e44, hemiIntensity: 1.2,
    rimColor: 0xfff2e0, rimIntensity: 0.3,
    terrain: {
      grass: '#5e6a3a', grassAlt: '#68723e', dryGrass: '#a09464', dirt: '#7a6450', rock: '#b4aa98',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (Math.hypot(x - VESUVIUS.x, z - VESUVIUS.z) < 1100 && y > 120) return y > 420 ? [0x4a4440, 1] : [0x6a5e50, 1]; // the ash and lava of the cone
        if (y > 260) return [0xb8b0a0, 1];                       // the bare limestone of Solaro and the Lattari
        if (y > 25) return [0x58663a, 1];                        // vines, lemon groves, the maquis
        if (y > 4) return z > 1000 ? [0xc4bca8, 1] : [0xa89272, 1]; // Capri's pale cliffs, the yellow tuff of Naples
        return y > 0.5 ? [0x8a8070, 1] : [0x6e665a, 1];          // the dark volcanic sand, wet at the water
      },
    },
  },

  bases: { nato: { x: 350, z: -2250, entries: [-500, 0, 500] }, pact: { x: -400, z: 2250, entries: [-500, 0, 500] } },
  maxStacks: 10,
  cameraStart: { nato: { x: 250, z: -1400 }, pact: { x: -250, z: 1400 } },
  points,

  spawns: {
    nato: line(['destroyer', 'frigate', 'frigate', 'destroyer'], 280, -1750, SOUTH),
    pact: line(['destroyer', 'frigate', 'frigate', 'destroyer'], -280, 1750, NORTH),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const cz = (x: number, k: number) => coastZ(x) - k;
    // Naples: the city packed along the quays from Chiaia to the Mercato, domes and the royal palace; Portici beyond
    for (let i = 0; i < 160; i++) {
      const x = -2300 + rand() * 3300, z = cz(x, 50 + rand() * 380);
      if (height(x, z) < 3 || height(x, z) > 110) continue;
      props.townHouse({ x, z, yaw: (rand() - 0.5) * 0.3, width: 8 + rand() * 4, depth: 10, storeys: 3 + Math.floor(rand() * 3), damaged: 0 });
    }
    for (const x of [-1700, -900, -300, 400]) props.church({ x, z: cz(x, 260), yaw: 0 });
    props.tower({ x: OVO.x, z: OVO.z });                          // Castel dell’Ovo
    props.tower({ x: -400, z: cz(-400, 40) });                    // the Castel Nuovo on the harbour
    props.tower({ x: -1000, z: cz(-1000, 520) });                 // Sant’Elmo on the hill
    for (let i = 0; i < 40; i++) {
      const x = 1500 + rand() * 1300, z = cz(x, 40 + rand() * 260);
      if (height(x, z) > 3 && height(x, z) < 90) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.6, width: 7 + rand() * 3, depth: 7, storeys: 2 });
    }
    // Sorrento on its cliff, Massa’s houses towards the cape, the tower on Punta Campanella
    for (let i = 0; i < 40; i++) {
      const t = 0.3 + rand() * 0.35, x = P0.x + (P1.x - P0.x) * t - 180 - rand() * 120, z = P0.z + (P1.z - P0.z) * t - 160 - rand() * 100;
      if (height(x, z) > 8 && height(x, z) < 160) props.flatHouse({ x, z, yaw: 0.7 + (rand() - 0.5) * 0.5, width: 7 + rand() * 3, depth: 7, storeys: 2, dome: rand() < 0.1 });
    }
    props.tower({ x: P1.x + 90, z: P1.z - 40 });
    // Capri: Marina Grande on the north shore, the town on the saddle, Anacapri up to the west; the British batteries' towers
    for (let i = 0; i < 50; i++) {
      const x = CAPRI.x - 100 + rand() * 450, z = CAPRI.z - 470 + rand() * 300;
      if (height(x, z) > 3 && height(x, z) < 150) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.5, width: 6 + rand() * 3, depth: 6, storeys: 2, dome: rand() < 0.08 });
    }
    props.church({ x: CAPRI.x + 120, z: CAPRI.z - 200, yaw: 0 });
    for (let i = 0; i < 20; i++) {
      const x = CAPRI.x - 500 + rand() * 250, z = CAPRI.z - 200 + rand() * 300;
      if (height(x, z) > 40 && height(x, z) < 330) props.flatHouse({ x, z, yaw: (rand() - 0.5) * 0.5, width: 6 + rand() * 3, depth: 6 });
    }
    props.tower({ x: CAPRI.x + 620, z: CAPRI.z - 140 });          // Tiberio's height
    props.tower({ x: CAPRI.x - 230, z: CAPRI.z - 420 });          // above Marina Grande
    props.finish();
    // umbrella pines, holm oak and olives on the hills, none on the lava
    const trees = plantTrees({ scene, terrain, cover, rand, area: { x: HALF, z: HALF }, lane: 0, count: 900, broadleaf: 0.5, autumn: 0.1, maxY: 380, size: 0.85,
      avoid: [{ test: (x: number, z: number) => terrain.heightAt(x, z) < 6 || Math.hypot(x - VESUVIUS.x, z - VESUVIUS.z) < 1100 || (x > -2300 && x < 1000 && z > coastZ(x) - 450) }] });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update?.(dt, t); } };
  },
} satisfies MapDef;
