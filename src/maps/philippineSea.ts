// The Philippine Sea, 19–20 June 1944 (fought here as 1945): Ozawa's Mobile Fleet comes in from the west to break up
// the landings on Saipan; Spruance holds Task Force 58 close west of the Marianas to cover them. The Japanese
// carriers launched first, from beyond the American range, meaning to land on Guam, rearm and strike again — the
// strikes were met by the Hellcats over the sea between the fleets and over Orote Field ("the Great Marianas Turkey
// Shoot"), and Mitscher's late strike found the Mobile Fleet the next evening. Laid out from the real waters (north at
// z < 0): the Marianas chain down the east side — Saipan and Tinian in the north-east with Aguijan off Tinian, Rota,
// and Guam, the biggest, in the south with the Orote peninsula reaching west from it; the open Philippine Sea, deep and
// empty, west of them. Task Force 58 lies west of Tinian, the Mobile Fleet far out to the west. Between them, by the
// sailing routes as near one as the other (seapath): the northern search sector, the sea where the air battle was
// fought, Ozawa's van, and the water off Orote where the strikes tried to land. A carrier battle: the scout that finds
// the enemy first, and the strike that gets through his fighters. Ships only (data/units45/ships.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, island, jungle, jungleTint } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 6000;
const HALF = 2500;
const noise = createNoise2D(1944_06);
const sea = createSea({ level: 0, size: SIZE, color: 0x15476a });

// the Marianas: [x, z, radius across, radius along, turn, height] — Saipan, Tinian, Aguijan, Rota, Guam
const ISLES = [[4250, -3500, 520, 950, 0.25, 300], [3950, -2250, 430, 620, 0.2, 110], [3620, -1650, 130, 170, 0, 90], [3350, 700, 440, 700, 1.1, 260], [2300, 3700, 750, 1450, 0.55, 280]];
const OROTE = { x0: 1950, z0: 3450, x1: 1150, z1: 3200, w: 140 };   // the Orote peninsula, Orote Field on it

function height(x: number, z: number) {
  let h = -60 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 10;
  if (x < 800) return h;
  const nn = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  for (const [cx, cz, ra, rb, turn, top] of ISLES) {
    const c = Math.cos(turn), s = Math.sin(turn), u = (x - cx) * c - (z - cz) * s, v = (x - cx) * s + (z - cz) * c;
    const r = Math.hypot(u / ra, v / rb);
    if (r > 1.7) continue;
    const d = (1 - r) * Math.min(ra, rb) + fbm(noise, x * 0.005, z * 0.005, 2) * 60;
    h = Math.max(h, island(d, Math.min(ra, rb), top, nn, 12));
    if (d > -200 && d < -40) h = Math.max(h, -2.2 + fbm(noise, x * 0.03, z * 0.03, 2) * 1.4);   // the fringing reef
  }
  const dx = OROTE.x1 - OROTE.x0, dz = OROTE.z1 - OROTE.z0, t = Math.max(0, Math.min(1, ((x - OROTE.x0) * dx + (z - OROTE.z0) * dz) / (dx * dx + dz * dz)));
  const od = Math.hypot(x - OROTE.x0 - dx * t, z - OROTE.z0 - dz * t);
  if (od < 400) h = Math.max(h, island(OROTE.w - od, OROTE.w, 50, 0.85, 6));
  return h;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Task Force 58', x: 1100, z: -1200, owner: 'nato', sector: 'east', radius: 140 },
  { id: 'B', name: 'The northern search', x: -1850, z: -3900, owner: null, sector: 'west', radius: 180 },
  { id: 'C', name: 'The Turkey Shoot', x: -950, z: -1400, owner: null, sector: 'centre', radius: 180 },
  { id: 'D', name: 'Ozawa’s van', x: -30, z: 1150, owner: null, sector: 'centre', radius: 180 },
  { id: 'E', name: 'Off Orote', x: 600, z: 2900, owner: null, sector: 'east', radius: 170 },
  { id: 'K', name: 'Mobile Fleet', x: -2050, z: -100, owner: 'pact', sector: 'west', radius: 140 },
];

export default {
  id: 'philippineSea',
  name: 'Philippine Sea',
  description: 'June 1944, west of the Marianas: Task Force 58 off Saipan and Tinian, the Mobile Fleet coming in from the open sea to the west, Guam and Orote Field to the south. A carrier battle: find the enemy fleet before he finds yours, and get the strike through his fighters.',
  epochs: ['1945'],
  region: 'pacific', // (the menu's Asia & Pacific scenarios: maps/index.js REGIONS)
  theatre: 'sea',
  armies: { nato: ['us'], pact: ['jp'] }, // (the US Navy and the Imperial Navy: the Wehrmacht's Kriegsmarine sails in the Atlantic)
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'day', weather: 'clear' },
  fow: 0.5,
  sides: { nato: 'United States', pact: 'Japan' },
  size: SIZE,
  segments: 400,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2400, near: 2, far: 9000 },
  seed: 194406,
  height,
  river: sea,

  theme: {
    fogColor: 0xb6cee0,
    fogDensity: 0.0002,
    skyTop: 0x3c78ba,
    skyHorizon: 0xc6deee,
    skyBottom: 0x78a6c4,
    sunColor: 0xfff4e0,
    sunIntensity: 2.3,
    sunDisk: 0.8,
    clouds: 0.3,
    cloudLight: 0xffffff,
    cloudDark: 0xb8c6d4,
    sunDir: [0.3, 0.8, 0.45],
    hemiSky: 0xd0e4f4,
    hemiGround: 0x5a7c8e,
    hemiIntensity: 1.3,
    rimColor: 0xe0eef8,
    rimIntensity: 0.3,
    terrain: {
      grass: '#5a7a40', grassAlt: '#668448', dryGrass: '#a8a070', dirt: '#cdbf90', rock: '#9a9488',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y >= 1.6) return jungleTint(height, x, z, y);
        return y > -0.6 ? [0xe6dcb4, 1] : [0xc4b88e, 1]; // coral sand, above and under the water
      },
    },
  },

  bases: { nato: { x: 1300, z: -1400, entries: [-700, -300, 100] }, pact: { x: -2250, z: -100, entries: [-300, 0, 300] } },
  maxStacks: 12,
  cameraStart: { nato: { x: 900, z: -1000 }, pact: { x: -1850, z: -100 } },
  points,

  spawns: {
    nato: [{ unit: 'escortCarrier', x: 1200, z: -1300, facing: -1.42 }, { unit: 'destroyer', x: 950, z: -1500, facing: -1.42 }, { unit: 'destroyer', x: 950, z: -1000, facing: -1.42 }, { unit: 'cruiser', x: 800, z: -1250, facing: -1.42 }],
    pact: [{ unit: 'escortCarrier', x: -2150, z: -100, facing: 1.42 }, { unit: 'destroyer', x: -1900, z: 150, facing: 1.42 }, { unit: 'destroyer', x: -1900, z: -350, facing: 1.42 }, { unit: 'cruiser', x: -1750, z: -100, facing: 1.42 }],
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    const at = (cx: number, cz: number, sx: number, sz: number, n: number, lo: number, hi: number, put: (x: number, z: number) => void) => {
      for (let i = 0, k = 0; i < n * 25 && k < n; i++) { const x = cx + (rand() - 0.5) * sx, z = cz + (rand() - 0.5) * sz, y = height(x, z); if (y > lo && y < hi) { k++; put(x, z); } }
    };
    // palms on every beach; Garapan on Saipan's west shore, Agana on Guam's, the Rota village
    at(3600, 0, 2400, 9000, 400, 1, 14, (x, z) => props.palm({ x, z, height: 7 + rand() * 5 }));
    at(3900, -3450, 300, 700, 16, 2, 30, (x, z) => props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 6 + rand() * 3, depth: 5 + rand() * 2 }));
    at(2350, 2700, 500, 400, 16, 2, 30, (x, z) => props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 6 + rand() * 3, depth: 5 + rand() * 2 }));
    at(3100, 750, 300, 300, 8, 2, 30, (x, z) => props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 6, depth: 5 }));
    props.finish();
    const trees = jungle({ scene, terrain, cover, rand, half: HALF * 2, count: 3000 });
    cover.finalize({ x: HALF, z: HALF });
    return { buildings: props.buildings, update(dt: number, t: number) { trees.update(dt, t); } };
  },
} satisfies MapDef;
