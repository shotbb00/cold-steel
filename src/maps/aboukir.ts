// Aboukir Bay, 1798 (the 1806 sea battles): the Battle of the Nile. The French line lies at anchor across the bay
// from the shoals off Aboukir island south-south-east, close in to the shelf that runs out from the bay's west
// shore; at dusk the British come down from the north with the wind behind them (from the north-north-west), round
// the island's reef — and some go round inside the anchored line, between it and the shoals, where the French guns
// weren't even run out. Laid out from the real waters (north at z < 0): the Aboukir peninsula along the west, the
// fort and the village on its point in the north-west, the island to the north-east of the point with its reef
// running out between them and beyond; the bay's low sandy shore round the south with the mouth of Lake Maadiya
// (Lake Abukir) cut through it; the coast turning north-east toward the Rosetta mouth of the Nile at the east edge.
// The French start at anchor (spawn `anchored`: they hold until the enemy is close). Not `widened`: maps/index.js
// widenSea doubles the bounds and moves the homes, the owned points and the spawns under way out with them (the
// anchored line stays where it is laid) — the ground below is laid in the doubled frame (±4000).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createSea, shore, island } from '../world/Sea.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 5600;
const HALF = 2000;
const noise = createNoise2D(1798_08);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f5a6a });

const bump = (t: number, w: number) => Math.max(0, 1 - (t / w) ** 2);
/** The bay's west shore (x) at z: the peninsula's inner side, from the point in the north down to the bay's corner. */
const westX = (z: number) => -2650 + Math.max(0, z + 1300) * 0.12 + fbm(noise, z * 0.0011, 0.4, 3) * 90;
/** The peninsula's north shore (z) at x: the open sea toward Alexandria, the point with the fort at its east end. */
const northZ = (x: number) => -1250 - 300 * bump(x + 2350, 380) + fbm(noise, x * 0.0011, 3.1, 3) * 70;
/** The bay's south shore (z) at x: round the bight, then away north-east toward Rosetta. */
const southZ = (x: number) => 2450 - Math.max(0, x - 1200) * 0.5 + fbm(noise, x * 0.0011, 5.7, 3) * 100;
const ISLAND = [-1400, -2250, 170, 16];  // Aboukir (Nelson's) island
const LAKE = -650;                       // x of Lake Maadiya's mouth
const ROSETTA = 3450;                    // x of the Rosetta branch where it reaches the east edge
/** The edge of the shelf off the west shore, along which the French anchored: metres east of it (negative: on the shelf). */
const L0 = { x: -1350, z: -1850 }, L1 = { x: -250, z: 1150 };
const shelf = (x: number, z: number) => {
  const dx = L1.x - L0.x, dz = L1.z - L0.z, D = Math.hypot(dx, dz);
  return ((x - L0.x) * dz - (z - L0.z) * dx) / D;
};

function height(x: number, z: number) {
  let h = -20 + fbm(noise, x * 0.0006, z * 0.0006, 4) * 5;
  const wob = fbm(noise, x * 0.002, z * 0.002, 3), n = fbm(noise, x * 0.01, z * 0.01, 2) * 0.5 + 0.5;
  // the shelf: three to five metres over the sand from the line in to the west shore (a slope of 250 m, not a step)
  const sh = shelf(x, z) + 60 + fbm(noise, x * 0.0015, z * 0.0015, 3) * 150 + fbm(noise, x * 0.006, z * 0.006, 2) * 40;
  if (sh < 120 && z > northZ(x) - 200) { const k = Math.min(1, (120 - sh) / 250), e = k * k * (3 - 2 * k); h += (-3.5 + Math.min(1.5, (120 - sh) / 900) + wob - h) * e; }
  // the reef from the point out past the island to the north-east, awash in places
  const rx = x + 2300, rz = z + 1550, along = rx * 0.8 - rz * 0.6, across = Math.abs(rx * 0.6 + rz * 0.8);
  const rw = 220 + fbm(noise, along * 0.003, 9.1, 3) * 140;
  if (along > -100 && along < 2000 + wob * 300 && across < rw) h = Math.max(h, -2.2 - across / rw * 6 + wob * 1.2);
  // the land: the peninsula (west of its inner shore and south of its north shore), the bay's south shore, the delta
  const d = Math.max(Math.min(westX(z) - x, z - northZ(x)), z - southZ(x));
  let land = shore(d + wob * 60, 8 + wob * 4, n, 70);
  if (x < -1900 && z < -900) land += Math.max(0, 1 - Math.hypot(x + 2350, z + 1350) / 500) * 12;   // the point's knoll under the fort
  // Lake Maadiya behind the south shore, its mouth cut through the dunes; the Rosetta branch at the east edge
  const lake = Math.max(0, 1 - Math.hypot((x - LAKE - 300) / 1300, (z - southZ(LAKE) - 900) / 500));
  if (lake > 0) land = Math.min(land, 1.5 - lake * 6);
  if (Math.abs(x - LAKE) < 70 && z > southZ(x) - 300 && z < southZ(LAKE) + 600) land = Math.min(land, -1.5 - (70 - Math.abs(x - LAKE)) * 0.03);
  if (Math.abs(x - ROSETTA - (z - southZ(ROSETTA)) * 0.25) < 90 && z > southZ(x) - 250) land = Math.min(land, -2.5);
  h = Math.max(h, land);
  const [ix, iz, r, top] = ISLAND;
  h = Math.max(h, island(r - Math.hypot(x - ix, z - iz) + fbm(noise, x * 0.01, z * 0.01, 2) * 40, r, top, 0.5, 6));
  return h;
}

// (widenSea moves the homes, the owned points and the spawns under way out by the home's own offset: `at` gives a
// final position as the map must state it)
const NATO = { x: 300, z: 650 }, PACT = { x: -50, z: -1600 };
const at = (home: { x: number; z: number }, x: number, z: number) => ({ x: x - home.x, z: z - home.z });
const points: ControlPointDef[] = [
  { id: 'A', name: 'The French line', ...at(NATO, -500, -300), owner: 'nato', sector: 'centre', radius: 170 },
  { id: 'B', name: 'The van', x: -785, z: -2461, owner: null, sector: 'west', radius: 160 },
  { id: 'C', name: 'The bay mouth', x: 1171, z: -2124, owner: null, sector: 'centre', radius: 180 },
  { id: 'D', name: 'The Rosetta road', x: 2930, z: -1286, owner: null, sector: 'east', radius: 170 },
  { id: 'K', name: 'The British squadron', ...at(PACT, -250, -2900), owner: 'pact', sector: 'centre', radius: 150 },
];

// the French line at anchor along the shelf's edge, head to wind (Orient, the flagship, in the middle)
const LINE = (t: number) => ({ x: Math.round(L0.x + (L1.x - L0.x) * t + 230), z: Math.round(L0.z + (L1.z - L0.z) * t - 80) });

export default {
  id: 'aboukir',
  name: 'Aboukir Bay',
  description: 'The Nile, 1798: the French line at anchor across the bay from Aboukir island, the shoals behind it; at dusk the British come down round the island’s reef with the wind — and round inside the line.',
  epochs: ['1806'],
  theatre: 'sea',
  armies: { nato: ['fr'], pact: ['gb'] }, // (the Royal Navy, not the side's default Prussians)
  region: 'africa', // (1806: Egypt — data/epoch.js regions)
  modes: ['frontline', 'pitched', 'hill', 'skirmish'],
  conditions: { time: 'dusk', weather: 'clear' },
  wind: { from: 335, speed: 6, veer: 0.2 },
  fow: 0.5,
  sides: { nato: 'France', pact: 'Britain' },
  size: SIZE,
  segments: 360,
  bounds: { x: HALF, z: HALF },
  navCell: 8,
  camera: { maxHeight: 2200, near: 1, far: 8000 },
  seed: 179808,
  height,
  river: sea,

  theme: {
    fogColor: 0xc8a888, fogDensity: 0.00022,
    skyTop: 0x4a5a86, skyHorizon: 0xe8b882, skyBottom: 0xa08470,
    sunColor: 0xffc08a, sunIntensity: 1.5, sunDisk: 0.9,
    clouds: 0.2, cloudLight: 0xf6d4b0, cloudDark: 0x8a7a80,
    sunDir: [-0.8, 0.16, 0.2],
    hemiSky: 0xd8c0a8, hemiGround: 0x6a5a48, hemiIntensity: 1.1,
    rimColor: 0xffd0a0, rimIntensity: 0.35,
    terrain: {
      grass: '#b8a070', grassAlt: '#c4ac7a', dryGrass: '#d2b886', dirt: '#c0a274', rock: '#b09a7c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const y = height(x, z);
        if (y > 2) return [0xcdb486, 1];                          // the sand of the Egyptian shore
        return y > -1 ? [0xdcc89a, 1] : [0xc8b488, 1];
      },
    },
  },

  bases: { nato: { ...NATO, entries: [-500, 0, 500] }, pact: { ...PACT, entries: [-600, 0, 600] } },
  maxStacks: 10,
  cameraStart: { nato: at(NATO, -300, 300), pact: at(PACT, -200, -2600) },
  points,

  spawns: {
    nato: [0.08, 0.27, 0.46, 0.65].map((t, i) => ({ unit: i === 2 ? 'battleship' : 'cruiser', ...LINE(t), facing: -2.75, anchored: true })),
    pact: [0, 1, 2, 3].map((i) => ({ unit: 'cruiser', ...at(PACT, -850 + i * 160, -3100 + i * 120), facing: 0.35 })),
  },

  decorate({ scene, terrain, cover, rand }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    // the fort on Aboukir point, the village behind it; a watch tower on the island
    props.tower({ x: -2350, z: northZ(-2350) + 120 });
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; props.lowWall({ x: -2350 + Math.cos(a) * 50, z: northZ(-2350) + 120 + Math.sin(a) * 50, yaw: a + Math.PI / 2, length: 40, height: 3, color: 0xb09a74 }); }
    for (let i = 0; i < 26; i++) {
      const x = -3300 + rand() * 900, z = northZ(x) + 250 + rand() * 500;
      if (height(x, z) > 2) props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 6 + rand() * 3, depth: 5 + rand() * 3 });
    }
    props.tower({ x: ISLAND[0], z: ISLAND[1] });
    // the fishing village at the lake's mouth, El-Maadiya
    for (let i = 0; i < 12; i++) {
      const x = LAKE - 350 + rand() * 250, z = southZ(LAKE) + 60 + rand() * 250;
      if (height(x, z) > 2) props.flatHouse({ x, z, yaw: rand() * Math.PI, width: 6 + rand() * 3, depth: 5 + rand() * 3 });
    }
    for (let i = 0; i < 140; i++) { // date palms along the shores and the Nile
      const x = (rand() * 2 - 1) * 2 * HALF, z = (rand() * 2 - 1) * 2 * HALF, y = height(x, z);
      if (y > 2 && y < 12 && (z > southZ(x) || x < westX(z) - 100)) props.palm({ x, z, height: 7 + rand() * 5 });
    }
    props.finish();
    cover.finalize({ x: 2 * HALF, z: 2 * HALF });
    return { buildings: props.buildings, update() {} };
  },
} satisfies MapDef;
