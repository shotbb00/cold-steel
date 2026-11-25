// Ussuri Bay, September 1985 (coastal: the US Marines land, the Soviets hold; 1.0 × 1.8 km). The war of 1985 that
// never came, in the Far East: rather than storm Vladivostok’s harbour head on, past the guns of Russky Island, a US
// amphibious force comes in from the Sea of Japan into the Ussuri Bay, on the Muravyov-Amursky peninsula’s eastern
// shore, to take the home of the Soviet Pacific Fleet from behind. The peninsula’s shore is no straight beach: it is
// steep taiga hills broken by deep round coves. Here two of them, either side of a high rocky cape:
//   • in the west the Lazurnaya bay at Shamora, a cove half a kilometre across that bites far into the hills, the
//     wide fine sand at its head, the sanatoria and dacha plots behind, and the Shamora valley running on inland
//     between wooded slopes — the long way in for the boats, past the hills on both sides;
//   • in the middle the cape, a wooded spine thirty-odd metres high that falls to the sea in cliffs, one of the old
//     tsarist Vladivostok fortress batteries dug into its point (re-armed with 130 mm guns), its spine running on
//     inland between the two valleys;
//   • in the east the shingle cove at Emar, boulders in the surf, the garrison’s Khrushchyovka blocks on the terrace
//     behind and the Emar valley inland.
// The two valleys meet beyond the spine’s saddle, where the road to Vladivostok runs. A road over the spine joins them
// lower down. (Compressed and turned: the real shore faces east; here the sea is +z.)
// Not point-mirrored: one side lands, the other holds (modes/landing). NATO lands from its base out at sea (+z).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 560, z: 960 }; // (the cached grids: the field and a margin)
const noise = createNoise2D(1985_211);
const sea = createSea({ level: 0, size: SIZE, color: 0x3e5a62 }); // (the Sea of Japan: clear, grey-blue)

/** The Lazurnaya bay (west), the cape (middle) and Emar cove (east), as shares across x. */
const BAY = { x: -250, w: 215, depth: 340 };
const bayK = (x: number) => Math.sqrt(Math.max(0, 1 - ((x - BAY.x) / BAY.w) ** 2));
const capeK = (x: number) => Math.exp(-(((x - 110) / 105) ** 4));
const coveK = (x: number) => Math.exp(-(((x - 385) / 85) ** 2));
/** The waterline (z): the hills’ line out at 210, the bay biting in, the cape out past it, Emar a shallow bight. */
const shoreZ = (x: number) => 210 + 120 * capeK(x) - BAY.depth * bayK(x) - 55 * coveK(x) + fbm(noise, x * 0.006, 2.1, 2) * 10;

/** Distance from (x, z) to the segment a–b. */
function seg(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const polyD = (x: number, z: number, p: number[][]) => { let d = Infinity; for (let i = 1; i < p.length; i++) d = Math.min(d, seg(x, z, p[i - 1], p[i])); return d; };
/** The cape’s spine, from its point inland to the saddle. */
const SPINE = [[110, 300], [90, -40], [30, -380], [-60, -600]];
const BASE = { x: 0, z: -830 };

/** The roads: up each valley, over the spine between them, the Vladivostok road across the saddle. */
const ROADS: number[][][] = [
  [[-250, -150], [-260, -300], [-230, -470], [-200, -660], [-60, -735], [BASE.x, BASE.z]],    // up the Shamora valley
  [[385, 120], [380, -60], [350, -300], [300, -520], [170, -660], [-60, -735]],                 // up from Emar cove, the Emar valley
  [[-230, -230], [-60, -255], [60, -300], [220, -220], [380, -60]],                              // over the spine, valley to valley
  [[-500, -700], [-200, -660]], [[170, -660], [500, -700]],                                     // the Vladivostok road, on out
];
const roadDist = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) d = Math.min(d, polyD(x, z, r)); return d; };
const roadC = gridCache(roadDist, EXT, 2);
const onRoad = (x: number, z: number) => roadC(x, z) < 3.5;

/** The beach sectors and the places up behind them. */
export const SECTORS = [
  { x: BAY.x, name: 'Shamora beach', inland: { name: 'Lazurnaya sanatoria', x: -230, z: -440 } },
  { x: 385, name: 'Emar cove', inland: { name: 'Emar', x: 385, z: -60 } },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 170, z: 740, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Shamora beach', x: BAY.x, z: shoreZ(BAY.x) - 50, owner: null, sector: 'west', radius: 55, opens: 'E' },
  { id: 'C', name: 'Emar cove', x: 385, z: shoreZ(385) - 40, owner: null, sector: 'east', radius: 45, opens: 'F' },
  { id: 'E', name: 'Lazurnaya sanatoria', x: -230, z: -440, owner: null, sector: 'west' },
  { id: 'F', name: 'Emar', x: 385, z: -60, owner: null, sector: 'east' },
  { id: 'K', name: 'Vladivostok road', x: -60, z: -735, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** The hills: the spine, the slopes round the bay and along the edges, taiga knolls between (the smooth part, cached). */
function hills(x: number, z: number) {
  const cut = 0.3 + 0.7 * smoothstep(5, 32, roadDist(x, z));
  const sd = polyD(x, z, SPINE);
  let h = 34 * Math.exp(-((sd / 95) ** 2)) * smoothstep(-700, -560, z) * cut;
  h += 32 * smoothstep(-390, -490, x) * smoothstep(-680, -420, z);                                                                    // the bay's west wall, Cape Lazurny's hills
  h += 26 * smoothstep(440, 500, x) + 18 * smoothstep(-200, -480, x) * smoothstep(-500, -700, z);                                       // the east edge; the hills west of the saddle
  h += 10 * ridged(noise, x * 0.008 + 7, z * 0.008, 3) * smoothstep(40, 120, Math.min(Math.abs(x - BAY.x), Math.abs(x - 385))) * cut;   // taiga knolls, off the valley floors
  return h;
}
const hillC = gridCacheSmooth(hills, EXT, 4);

function natural(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, ck = capeK(x);
  if (d > 0) { // the bottom: shelving off, deeper at once under the cape, rocks in Emar cove
    const h = 0.5 - d * (0.02 + ck * 0.08) - Math.max(0, d - 120) * 0.05 + coveK(x) * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    return Math.max(h, -20);
  }
  const back = -d;
  // the shore: Shamora’s 60 m of fine sand, Emar’s 30 m of shingle, nothing under the cape
  const sw = 30 + 30 * bayK(x);
  const beach = 0.5 + Math.min(back, sw) * (1.5 / sw);
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  const land = 3.5 + smoothstep(sw, sw + 80, back) * 2 + Math.max(0, back - 200) * 0.008 + n * 2 + hillC(x, z);
  let h = Math.max(beach, Math.min(land, beach + back * (0.2 + ck * 1.4)));
  // Shamora’s dunes: a low ridge behind the sand
  h += bayK(x) * Math.exp(-(((back - sw - 8) / 7) ** 2)) * 1.8;
  // the base: flat, at the land’s own level
  return h;
}
const heightC = gridCacheSmooth(natural, EXT, 2);
const BASE_H = natural(BASE.x, BASE.z);
const height = (x: number, z: number) => { const h = heightC(x, z), k = smoothstep(60, 25, Math.hypot(x - BASE.x, z - BASE.z)); return k > 0 ? h + (BASE_H - h) * k : h; };

/** The dacha plots: the Shamora valley floor and the Emar terrace, off the roads and the points. */
function plotK(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 110 || z < -780 || roadDist(x, z) < 8 || nearPoint(x, z, 40)) return 0;
  return smoothstep(-0.1, 0.12, fbm(noise, x * 0.007 + 40, z * 0.007 - 90, 2)) * smoothstep(110, 150, back) * smoothstep(6, 2, hills(x, z));
}
const plotC = gridCache(plotK, BOUNDS, 4);
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = plotC(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.15 : 0.35);
}
/** Oak, birch and Korean pine on the hills and the cape, patches of taiga down the valleys. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(7, 16, hillC(x, z)),
  smoothstep(0.15, 0.35, fbm(noise, x * 0.006 + 300, z * 0.006 - 120, 2)) * 0.7)
  * smoothstep(shoreZ(x) - 25, shoreZ(x) - 60 + capeK(x) * 30, z) * smoothstep(4, 12, roadC(x, z)) * (nearPoint(x, z, 30) ? 0 : 1) * (plotC(x, z) > 0.3 ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
/** Emar’s blocks on the terrace. */
const townK = (x: number, z: number) => smoothstep(100, 70, Math.hypot(x - 385, z + 70));

export default {
  id: 'ussuri',
  name: 'Ussuri Bay Landing',
  description: 'The Ussuri Bay shore east of Vladivostok, September 1985: the deep round Lazurnaya bay at Shamora and the shingle cove at Emar either side of a high wooded cape with an old tsarist battery, two valleys running inland to the Vladivostok road. The US Marines land from the sea; the Soviets hold.',
  epochs: ['1985'],
  region: 'korea',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Soviet Union' },
  armies: { nato: ['us'], pact: ['sov'] }, // (the Marines and the Army land; the Pacific Fleet’s naval infantry and the Far East garrison hold)
  conditions: { time: 'dawn', weather: 'clear' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  airfields: [], // (no strip fits between the hills)
  steep: 0.5, // (vehicles: the cape and the valley walls are no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985_211,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a clear September dawn on the Sea of Japan, the oaks turning
    fogColor: 0xbcc4c8, fogDensity: 0.0008,
    skyTop: 0x4a76aa, skyHorizon: 0xdcd6c8, skyBottom: 0x6e7468,
    sunColor: 0xffe6c8, sunIntensity: 1.7, sunDisk: 0.4,
    clouds: 0.3, cloudLight: 0xf4f0e8, cloudDark: 0x9aa0a6,
    sunDir: [0.2, 0.35, 0.8],
    hemiSky: 0xc8d2de, hemiGround: 0x5a5a3a, hemiIntensity: 1.3,
    rimColor: 0xd4d6d8, rimIntensity: 0.2,
    terrain: {
      grass: '#5e6a36', grassAlt: '#566432', dryGrass: '#8e8450', dirt: '#6a5840', rock: '#77736a',
      pasture: '#5e6a36', ploughed: '#5a4a34', stubble: '#9a8a56', meadow: '#6a7440',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x), back = sz - z;
        if (roadC(x, z) < (townK(x, z) > 0.5 ? 5 : 3.5) && back > 20) return [0x74716a, 0.86];   // asphalt
        if (back < -3) return [y > -1.5 ? 0x9a9078 : 0x6e6a5a, 1];                                 // the sand under the water
        if (capeK(x) > 0.4 && y > 3 && back < 90) return [0x6a6658, 0.85];                          // the cape’s rock
        if (coveK(x) > 0.5 && back < 32) return [noise(x * 0.2, z * 0.2) > 0.2 ? 0x6a665c : 0x8a8478, 1]; // Emar’s shingle
        if (back < 30 + 30 * bayK(x)) return [bayK(x) > 0.3 ? 0xd2c49a : 0xb0a488, 1];                // sand (Shamora’s fine and pale)
        if (bayK(x) > 0.3 && back < 100) return [0x9a9258, 0.7];                                   // dune grass
        if (townK(x, z) > 0.6) return [0x8c867a, 0.6];                                             // yards between the blocks
        const pk = plotC(x, z);
        if (pk > 0.3) {
          const u = x + z * 0.05, v = z - x * 0.06, k = noise(x * 0.05, z * 0.05);
          if (Math.min(Math.abs(((u % 24) + 24) % 24 - 12), Math.abs(((v % 18) + 18) % 18 - 9)) > 11) return [0x6a6040, 0.7]; // plot fences and paths
          return [k > 0.3 ? 0x5a4a34 : k > -0.2 ? 0x6e7a3e : 0x8a8a4a, pk * 0.8];                 // dug beds, potatoes, cabbages
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: BASE.x, z: BASE.z, entries: [-200, 300] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -300 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what comes in (systems/Landing.js): the men by LCVP or LCU, the vehicles by LCU
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: a Perry frigate or a Spruance inshore, a sweeper, the battleship New Jersey offshore
    navy: ['frigate', 'destroyer', 'natya', 'battleship'],
    // the Pacific Fleet’s mines across the bay mouths, a lane left off each beach for the sweepers
    seaMines: { z: [500, 560], count: 60, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_211 },
    // the coastal artillery: 130 mm guns in the tsarist battery on the cape and on Cape Lazurny; the Rubezh missile batteries inland
    forts: [
      { unit: 'artillery', x: 110, z: shoreZ(110) - 60, facing: 0, name: 'Cape battery' },
      { unit: 'artillery', x: -470, z: 120, facing: 0, name: 'Lazurny battery' },
      { unit: 'coastMissile', x: -60, z: -470, facing: 0, name: 'Rubezh battery' }, { unit: 'coastMissile', x: 240, z: -540, facing: 0, name: 'Rubezh battery' },
    ],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests over it
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -490 + i * 11; return (bayK(x) > 0.25 || coveK(x) > 0.35) ? { kind: 'wire', x, z: shoreZ(x) - (bayK(x) > 0.25 ? 52 : 30), yaw: 0 } : null; }).filter(Boolean),
      ...SECTORS.flatMap((s, i) => [-40, 40].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - (i ? 58 : 82) }))),
      ...SECTORS.flatMap((s, i) => [-50, 0, 50].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - (i ? 52 : 74), yaw: 0 }))),
      ...SECTORS.flatMap((s, i) => [-24, 24].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - (i ? 46 : 68), yaw: 0 }))),
      ...SECTORS.flatMap((s, i) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - (i ? 38 : 60) }))),
    ],
    // the defence at dawn: the 55th Naval Infantry Division over each beach, the garrison in Emar and the sanatoria, Fagots and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Naval infantry squad' },
    hold: [...SECTORS.flatMap((s, i) => [-50, -24, 24, 50].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (i ? 48 : 70) }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z })), { x: 40, z: -260 }],
    // the counter-attack: the naval infantry’s tanks and the motor riflemen down the valleys from Vladivostok
    counter: { t: 330, units: ['heavyTank', 'ifv', 'tank', 'ifv'], say: 'The 55th Division’s armour is coming down the valleys from Vladivostok: T-72s and BMPs, straight for the beachhead', sayOther: 'Enemy armour coming down the valleys on the Vladivostok road: T-72s and BMPs' },
    // the landing’s AI (ai/LandingDirector.js): its buying order, a frigate inshore off the focus beach, a sweeper for the lane
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'tank', 'rifles', 'mgTeam', 'ifv', 'rifles', 'tank', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2200, perSector: 600, beachIncome: 1, defenceCp: 1000, defenceIncome: 2 }, // (two beaches, two villages: a richer defence than the three-beach maps')
    // the M113s and the scouts’ vehicles swim in on their own, put in off the beach
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon' },
    // the first wave at dawn, in to both beaches at once (the bigger share up the bay to Shamora)
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 }, { unit: 'tank', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'ifv', sector: 1 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_212);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadC(x, z) > 6 + rr && !nearPoint(x, z, 18 + rr) && z < shoreZ(x) - 40 - rr
      && Math.hypot(x - BASE.x, z - BASE.z) > 45 && hillC(x, z) < 8;
    const flats = (x: number, z: number, yaw: number, storeys: number, name: string) => props.flatHouse({ x, z, yaw, width: 28, depth: 11, storeys, name });

    // ---- the tsarist battery on the cape: casemates under earth, the gun pits ringed with sandbags, the lighthouse on the point
    { const cz = shoreZ(110) - 85;
      props.hall({ x: 110, z: cz, yaw: 0, width: 24, depth: 8, height: 3.5, color: 0x8a8a80, roof: 0x5a6a3e, door: 3, name: 'tsarist battery' });
      for (const s of [-1, 1]) props.sandbagRing({ x: 110 + s * 20, z: shoreZ(110) - 58, radius: 4.5, toward: 1 });
      props.lowWall({ x: 110, z: shoreZ(110) - 45, yaw: 0, length: 44, height: 1.4, color: 0x7e7a70 }); }
    { const x = 150, z = shoreZ(150) - 22, y = g(x, z); props.box('stone', x, y + 7, z, 3, 14, 3, 0, 0xe8e4dc); props.box('plain', x, y + 15, z, 3.6, 2, 3.6, 0, 0x8a2a22); }

    // ---- Emar: boulders in the cove, the Khrushchyovka blocks on the terrace
    for (let i = 0; i < 26; i++) { const x = 300 + r() * 190, z = shoreZ(x) - 4 + r() * 26; if (Math.abs(x - 385) < 35) continue; props.boulder({ x, z, radius: 1 + r() * 2 }); }
    for (const [x, z, yaw] of [[320, -100, 0], [450, -100, Math.PI / 2], [330, -150, 0], [440, -30, 0], [320, -30, Math.PI / 2], [450, -170, 0]] as [number, number, number][])
      if (free(x, z, 10)) flats(x, z, yaw, 5, 'Khrushchyovka');
    props.flatHouse({ x: 300, z: -230, yaw: 0, width: 24, depth: 12, storeys: 2, name: 'garrison headquarters' });

    // ---- Shamora: the sanatoria behind the dunes, beach huts; the sanatoria up the valley; dachas on the valley floor
    for (const [x, z] of [[-330, -260], [-170, -250], [-310, -380], [-150, -400], [-290, -490]] as [number, number][]) if (free(x, z, 12)) props.townHouse({ x, z, yaw: 0, width: 26, depth: 10, storeys: 3, name: 'sanatorium', damaged: 0 });
    for (let i = 0; i < 9; i++) { const x = -390 + i * 30, z = shoreZ(x) - 75; if (free(x, z, 1)) props.house({ x, z, yaw: 0, width: 4, depth: 3, height: 2.4 }); }
    for (let i = 0; i < 320; i++) {
      const x = (r() * 2 - 1) * 470, z = 100 - r() * 880;
      if (plotC(x, z) < 0.5 || !free(x, z, 3) || nearPoint(x, z, 30) || townK(x, z) > 0.3) continue;
      if (r() < 0.6) props.house({ x, z, yaw: r() < 0.5 ? 0.05 : Math.PI / 2 + 0.05, width: 5 + r() * 2, depth: 4 + r() * 1.5, height: 2.6 });
      else props.hayBales({ x, z, yaw: r(), count: 2 });
    }
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: BASE.x, z: BASE.z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadC(x, z) < 6 || plotC(x, z) > 0.2 || townK(x, z) > 0.3 || z > shoreZ(x) - 30 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 6000, broadleaf: 0.6, autumn: 0.35, maxY: 90, avoid,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => z > shoreZ(x) - 36 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
