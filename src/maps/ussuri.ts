// Ussuri Bay, September 1985 (coastal: the US Marines land, the Soviets hold; 1.0 × 1.8 km). The war of 1985 that
// never came, in the Far East: rather than storm Vladivostok’s harbour head on, past the guns of Russky Island, a US
// amphibious force comes in from the Sea of Japan into the Ussuri Bay, on the Muravyov-Amursky peninsula’s eastern
// shore, to take the home of the Soviet Pacific Fleet from behind. Out at sea the transport area and the mine barrier
// the Pacific Fleet laid across the bay; then the shore: three landing beaches between two rocky headlands, on each
// the earth-and-concrete casemates of one of the old tsarist Vladivostok fortress coastal batteries, re-armed with
// 130 mm guns. In the west the wide fine sand of Shamora (the Lazurnaya bay) with its dunes, sanatoria and dacha plots
// behind; in the middle the seaplane apron of the naval air station — a narrow foreshore under its sea wall, the
// Be-12 hangars, one seaplane ramp the only way up for vehicles — and behind it the edge of the station’s runway;
// in the east the shingle cove at Emar, boulders in the surf, the garrison’s Khrushchyovka blocks behind. Then the
// taiga hills of oak, birch and Korean pine, as on the land side (maps/vladivostok.ts), and the road over them to
// Vladivostok. (Compressed and turned: the real shore faces east; here the sea is +z.)
// Not point-mirrored: one side lands, the other holds (modes/landing). NATO lands from its base out at sea (+z).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 620, z: 1000 }; // (the cached grids: the field and a margin)
const LAND = 5;
const noise = createNoise2D(1985_211);
const sea = createSea({ level: 0, size: SIZE, color: 0x3e5a62 }); // (the Sea of Japan: clear, grey-blue)

/** The two headlands between the beaches, a tsarist battery on each: x, how far out to sea, half-width, height. */
const HEADS = [{ x: -165, reach: 70, w: 45, top: 26 }, { x: 185, reach: 80, w: 44, top: 28 }];
const headK = (x: number) => Math.max(Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)), Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2)));
/** The waterline (z): the beaches a little over a hundred metres from the middle, the headlands out past them. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 12
  + HEADS[0].reach * Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)) + HEADS[1].reach * Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2));
/** The seaplane apron (0..1 across x): its sea wall from the west headland to the east one. */
const apronK = (x: number) => smoothstep(-135, -110, x) * smoothstep(135, 112, x);
const RAMP = 20; // x of the seaplane ramp up the sea wall (the centre beach sector)
/** Emar’s shingle cove in the east (0..1 across x). */
const coveK = (x: number) => smoothstep(225, 285, x);
/** Shamora’s wide sand in the west (0..1 across x). */
const shamK = (x: number) => smoothstep(-215, -245, x);
/** The naval air station’s runway: its last few hundred metres, along x behind the apron. */
const RUNWAY = { z: -300, x0: -150, x1: 190, w: 16 };
const runK = (x: number, z: number) => smoothstep(RUNWAY.w + 22, RUNWAY.w + 6, Math.abs(z - RUNWAY.z)) * smoothstep(RUNWAY.x0 - 30, RUNWAY.x0, x) * smoothstep(RUNWAY.x1 + 30, RUNWAY.x1, x);
const onRunway = (x: number, z: number) => Math.abs(z - RUNWAY.z) < RUNWAY.w && x > RUNWAY.x0 && x < RUNWAY.x1;

/** The taiga hills inland: [x, z, radius, height]. */
const HILLS = [[-150, -450, 90, 26], [235, -420, 80, 22], [-410, -400, 100, 30], [430, -470, 90, 28], [60, -540, 70, 16], [-300, -690, 100, 24], [330, -710, 100, 26], [-460, -150, 60, 14]];
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillHExact(x: number, z: number) {
  let h = 0, w = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d0 = Math.hypot(x - hx, z - hz) / r;
    if (d0 > 3.2) continue;
    if (!w) w = warp(x, z);
    const d = d0 * w;
    h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  return h;
}
const hillH = gridCacheSmooth(hillHExact, EXT, 4);

/** The roads: the coast road behind the headlands, up from each beach, across under the hills to Vladivostok. */
function roadDist(x: number, z: number) {
  const sz = shoreZ(x);
  let d = Infinity;
  if (z < sz - 40 && z > -860) {
    d = Math.min(d, Math.abs(x - (-320 + Math.sin(z * 0.012) * 14)));      // up from Shamora through the dachas
    d = Math.min(d, Math.abs(x - (RAMP + Math.sin(z * 0.009) * 18 * smoothstep(60, -40, z))));  // up the ramp past the station
  }
  if (z < sz - 40 && z > -860) d = Math.min(d, Math.abs(x - (340 + Math.sin(z * 0.01) * 12))); // up from the cove through Emar
  d = Math.min(d, Math.abs(z - (-30 + Math.sin(x * 0.008) * 12)));          // the coast road, behind the headlands
  d = Math.min(d, Math.abs(z - (-620 + Math.sin(x * 0.006) * 25)));         // across, toward Vladivostok
  return d;
}
const onRoad = (x: number, z: number) => roadDist(x, z) < 3.5;

/** The beach sectors and the places up behind them. */
export const SECTORS = [
  { x: -320, name: 'Shamora beach', inland: { name: 'Shamora dachas', x: -320, z: -130 } },
  { x: RAMP, name: 'Seaplane ramp', inland: { name: 'Naval air station', x: 30, z: -220 } },
  { x: 335, name: 'Emar cove', inland: { name: 'Emar', x: 360, z: -110 } },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Shamora beach', x: -320, z: shoreZ(-320) - 46, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Seaplane ramp', x: RAMP, z: shoreZ(RAMP) - 46, owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Emar cove', x: 335, z: shoreZ(335) - 46, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Shamora dachas', x: -320, z: -130, owner: null, sector: 'west' },
  { id: 'F', name: 'Naval air station', x: 30, z: -220, owner: null, sector: 'centre' },
  { id: 'G', name: 'Emar', x: 360, z: -110, owner: null, sector: 'east' },
  { id: 'K', name: 'Vladivostok road', x: 40, z: -660, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** The dacha plots: the flat land inland, off the hills, the roads, the station and the points. */
function plotK(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 110 || z < -800 || roadDist(x, z) < 8 || nearPoint(x, z, 40) || runK(x, z) > 0) return 0;
  return smoothstep(-0.1, 0.12, fbm(noise, x * 0.007 + 40, z * 0.007 - 90, 2)) * smoothstep(110, 150, back) * smoothstep(3, 1, hillH(x, z))
    * (apronK(x) > 0.5 && back < 200 ? 0 : 1) * smoothstep(55, 75, Math.hypot(x, z + 830));
}
const plotC = gridCacheSmooth(plotK, EXT, 4);

function height(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, hk = headK(x);
  if (d > 0) { // the bottom: shelving off, rocks off the headlands and in Emar cove
    const h = 0.5 - d * 0.018 - Math.max(0, d - 130) * 0.05 + (hk + coveK(x) * 0.5) * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    return Math.max(h, -18);
  }
  const back = -d;
  // the shore (35 m of sand, Shamora’s 55 m), then the land: 4–7 m, rising inland
  const sw = 35 + shamK(x) * 20;
  const beach = 0.5 + Math.min(back, sw) * (1.4 / sw);
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  const land = 3 + smoothstep(30, 110, back) * 2 + Math.max(0, back - 250) * 0.01 + n * 2.5 + hillH(x, z)
    + smoothstep(BOUNDS.x - 30, BOUNDS.x + 100, Math.abs(x)) * (12 + ridged(noise, x * 0.01, z * 0.01, 2) * 14);
  let h = Math.max(beach, Math.min(land, beach + back * 0.2));
  // Shamora’s dunes: a low ridge behind the sand, grass on it
  h += shamK(x) * smoothstep(-500, -470, x) * Math.exp(-(((back - sw - 6) / 6) ** 2)) * 1.8;
  // the dacha plots: terraced level
  const pk = plotC(x, z);
  if (pk > 0) h += (LAND - 0.6 + Math.round(n * 4) * 0.3 - h) * pk * 0.8;
  // the seaplane apron: a foreshore under a 3 m sea wall, the ramp up it
  const pt = apronK(x);
  if (pt > 0) {
    let q = back < 30 ? 0.4 + back * 0.025 : back < 32 ? 1.15 + (back - 30) * 1.45 : 4 + Math.max(0, back - 160) * 0.015;
    q += (Math.min(q, 0.4 + back * 0.09) - q) * smoothstep(22, 14, Math.abs(x - RAMP)); // (the ramp: 1 in 11)
    h += (q - h) * pt * smoothstep(260, 190, back);
  }
  // the runway: graded flat
  const rk = runK(x, z);
  if (rk > 0) h += (LAND - h) * rk;
  // the headlands: rock 26–28 m high, a cliff to the sea, falling back to the land inland
  if (hk > 0.05) {
    const hd = x < 0 ? HEADS[0] : HEADS[1];
    const top = hd.top + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
    h = h + (Math.max(h, 0.5 + top * smoothstep(4, 26, back) * smoothstep(190, 100, back)) - h) * smoothstep(0.25, 0.7, hk);
  }
  // the base: flat, at the land’s own level (no pit for the vehicles to stick in)
  h += (LAND + 5.2 - h) * smoothstep(60, 25, Math.hypot(x, z + 830));
  return h;
}

/** The dacha plots’ fences and beds: a little slow off the paths. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = plotC(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.15 : 0.35);
}
/** Oak, birch and Korean pine on the hills and the headlands, patches of taiga between. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(5, 12, hillH(x, z)),
  smoothstep(0.4, 0.8, headK(x)) * smoothstep(shoreZ(x) - 30, shoreZ(x) - 60, z) * smoothstep(shoreZ(x) - 200, shoreZ(x) - 140, z),
  smoothstep(0.15, 0.3, fbm(noise, x * 0.006 + 300, z * 0.006 - 120, 2)) * 0.8 * smoothstep(shoreZ(x) - 120, shoreZ(x) - 180, z),
  smoothstep(BOUNDS.x - 40, BOUNDS.x + 20, Math.abs(x)))
  * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 30) ? 0 : 1) * (runK(x, z) > 0 ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
/** Emar’s Khrushchyovka blocks and the station’s garrison blocks. */
const townK = (x: number, z: number) => Math.max(smoothstep(110, 80, Math.hypot(x - 370, z + 130)), smoothstep(70, 50, Math.hypot(x + 120, z + 210)));

export default {
  id: 'ussuri',
  name: 'Ussuri Bay Landing',
  description: 'The Ussuri Bay shore east of Vladivostok, September 1985: the sand of Shamora, the naval air station’s seaplane apron and the shingle cove at Emar between two headlands with the old tsarist coastal batteries, dachas, Khrushchyovka blocks and taiga hills behind. The US Marines land from the sea; the Soviets hold the road to Vladivostok.',
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
  airfields: [], // (no strip of its own fits: the station’s runway edge is too short, the rest dacha plots and hills)
  steep: 0.5, // (vehicles: the sea wall and the headlands are no way up — the ramp is)
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
        if (onRunway(x, z)) return [Math.abs(z - RUNWAY.z) < 0.6 && ((x % 30) + 30) % 30 < 15 ? 0xd8d8d0 : 0x7a7a76, 0.95]; // the runway, its centre line
        if (runK(x, z) > 0.5) return [0x6e6e5a, 0.6];                                                // the runway’s shoulders
        if (roadDist(x, z) < (townK(x, z) > 0.5 ? 5 : 3.5) && back > 30) return [0x74716a, 0.86];  // asphalt
        if (back < -3) return [y > -1.5 ? 0x9a9078 : 0x6e6a5a, 1];                                  // the sand under the water
        if (headK(x) > 0.3 && y > 3 && back < 120) return [0x6a6658, 0.85];                         // the headlands’ rock
        const pt = apronK(x);
        if (pt > 0.5 && back < 31) return [0x7e7668, 1];                                            // the foreshore: gravel
        if (pt > 0.5 && back < 170) return [0x8a8880, 0.95];                                        // the apron’s concrete
        if (coveK(x) > 0.5 && back < 36) return [noise(x * 0.2, z * 0.2) > 0.2 ? 0x6a665c : 0x8a8478, 1]; // Emar’s shingle
        if (back < 35 + shamK(x) * 20) return [shamK(x) > 0.5 ? 0xd2c49a : 0xb0a488, 1];              // sand (Shamora’s fine and pale)
        if (shamK(x) > 0.5 && back < 80) return [0x9a9258, 0.7];                                     // dune grass
        if (townK(x, z) > 0.6) return [0x8c867a, 0.6];                                              // yards between the blocks
        const pk = plotC(x, z);
        if (pk > 0.3) {
          const u = x + z * 0.05, v = z - x * 0.06, k = noise(x * 0.05, z * 0.05);
          if (Math.min(Math.abs(((u % 24) + 24) % 24 - 12), Math.abs(((v % 18) + 18) % 18 - 9)) > 11) return [0x6a6040, 0.7]; // plot fences and paths
          return [k > 0.3 ? 0x5a4a34 : k > -0.2 ? 0x6e7a3e : 0x8a8a4a, pk * 0.8];                  // dug beds, potatoes, cabbages
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -830, entries: [-320, 20, 340] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what comes in (systems/Landing.js): the men by LCVP or LCU, the vehicles by LCU
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: a Perry frigate or a Spruance inshore, a sweeper, the battleship New Jersey offshore
    navy: ['frigate', 'destroyer', 'natya', 'battleship'],
    // the Pacific Fleet’s mines across the bay, a lane left off each beach for the sweepers
    seaMines: { z: [520, 580], count: 60, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_211 },
    // the coastal artillery: 130 mm guns in each old tsarist battery, laid on the beaches; the Rubezh missile batteries inland that fire on the ships
    forts: [
      { unit: 'artillery', x: HEADS[0].x, z: shoreZ(HEADS[0].x) - 70, facing: 0, name: 'Shamora headland battery' },
      { unit: 'artillery', x: HEADS[1].x, z: shoreZ(HEADS[1].x) - 75, facing: 0, name: 'Emar headland battery' },
      { unit: 'coastMissile', x: -170, z: -380, facing: 0, name: 'Rubezh battery' }, { unit: 'coastMissile', x: 230, z: -500, facing: 0, name: 'Rubezh battery' },
    ],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests over it; tank traps on the ramp
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -480 + i * 11; return headK(x) > 0.3 || Math.abs(x - RAMP) < 18 ? null : { kind: 'wire', x, z: shoreZ(x) - (apronK(x) > 0.5 ? 26 : 30 + shamK(x) * 12), yaw: 0 }; }).filter(Boolean),
      ...[8, 16, 24, 32].map((x) => ({ kind: 'tankTraps', x, z: shoreZ(x) - 24, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 64 }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - 56, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - 50, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 40 }))),
    ],
    // the defence at dawn: the 55th Naval Infantry Division over each beach, the garrison in Emar and the station, Fagots and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Naval infantry squad' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 50 : 58) }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    // the counter-attack: the naval infantry’s tanks and the motor riflemen over the hills from Vladivostok
    counter: { t: 330,units: ['heavyTank', 'ifv', 'tank', 'ifv'], say: 'The 55th Division’s armour is coming over the hills from Vladivostok: T-72s and BMPs, straight for the beachhead', sayOther: 'Enemy armour coming over the hills on the Vladivostok road: T-72s and BMPs' },
    // the landing’s AI (ai/LandingDirector.js): its buying order, a frigate inshore off the focus beach, a sweeper for the lane
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'tank', 'rifles', 'mgTeam', 'ifv', 'rifles', 'tank', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2200, perSector: 600, beachIncome: 0.9, defenceCp: 950, defenceIncome: 1.8 }, // (richer than Nampo’s, the counter-attack later and one tank smaller: the defence held every early AI-vs-AI run, 2026-11-22)
    // the M113s and the scouts’ vehicles swim in on their own, put in off the beach
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon' },
    // the first wave at dawn, in to all three beaches at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_212);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 6 + rr && !nearPoint(x, z, 18 + rr) && headK(x) < 0.3 && z < shoreZ(x) - 40 - rr
      && Math.hypot(x, z + 830) > 45 && runK(x, z + 0) === 0 && hillH(x, z) < 7;

    // ---- the seaplane station: Be-12 hangars on the apron, a slip crane, the runway’s end with its tower and shelters
    for (const [x, w] of [[-80, 40], [80, 44]] as [number, number][]) props.hall({ x, z: shoreZ(x) - 100, yaw: 0, width: w, depth: 26, height: 12, color: 0x8a8a80, roof: 0x5a5e5a, door: 18, name: 'seaplane hangar' });
    props.hall({ x: -20, z: shoreZ(-20) - 130, yaw: 0, width: 22, depth: 12, height: 6, color: 0x9a9284, roof: 0x4a4c4e, door: 5, name: 'workshops' });
    for (let i = 0; i < 4; i++) props.crates({ x: -50 + i * 7, z: shoreZ(-50) - 60, yaw: 0 });
    props.tanks({ x: 110, z: shoreZ(110) - 150, yaw: 0, count: 2, radius: 5, height: 7, color: 0x8a9488 });
    props.controlTower({ x: 120, z: RUNWAY.z + 45, yaw: Math.PI });
    for (const x of [-60, 200]) props.aircraftShelter({ x, z: RUNWAY.z - 55, yaw: 0 });
    props.mast({ x: 150, z: RUNWAY.z + 50, height: 18 });

    // ---- the tsarist batteries on the headlands: casemates under earth, the gun pits ringed with sandbags; a lighthouse on the east one
    for (const h of HEADS) {
      const cz = shoreZ(h.x) - 90;
      props.hall({ x: h.x, z: cz, yaw: 0, width: 22, depth: 8, height: 3.5, color: 0x8a8a80, roof: 0x5a6a3e, door: 3, name: 'tsarist battery' });
      for (const s of [-1, 1]) props.sandbagRing({ x: h.x + s * 18, z: shoreZ(h.x) - 62, radius: 4.5, toward: 1 });
      props.lowWall({ x: h.x, z: shoreZ(h.x) - 50, yaw: 0, length: 40, height: 1.4, color: 0x7e7a70 });
    }
    { const x = HEADS[1].x + 20, z = shoreZ(HEADS[1].x) - 30, y = g(x, z); props.box('stone', x, y + 7, z, 3, 14, 3, 0, 0xe8e4dc); props.box('plain', x, y + 15, z, 3.6, 2, 3.6, 0, 0x8a2a22); }

    // ---- Emar: boulders in the cove, the Khrushchyovka blocks behind, the garrison blocks by the station
    for (let i = 0; i < 26; i++) { const x = 250 + r() * 240, z = shoreZ(x) - 6 + r() * 30; if (Math.abs(x - 335) < 40) continue; props.boulder({ x, z, radius: 1 + r() * 2 }); }
    for (const [x, z, yaw] of [[300, -150, 0], [430, -150, Math.PI / 2], [330, -195, 0], [410, -60, 0], [290, -80, Math.PI / 2], [440, -220, 0]] as [number, number, number][])
      if (free(x, z, 10)) flats(props, { x, z, yaw, storeys: 5, width: 28, depth: 11, name: 'Khrushchyovka' });
    for (const [x, z, yaw] of [[-120, -190, 0], [-150, -240, Math.PI / 2], [-80, -250, 0]] as [number, number, number][])
      if (free(x, z, 10)) flats(props, { x, z, yaw, storeys: 4, width: 28, depth: 11, name: 'garrison block' });
    props.flatHouse({ x: 80, z: -200, yaw: 0, width: 24, depth: 12, storeys: 2, name: 'station headquarters' });

    // ---- Shamora: the sanatoria behind the dunes, beach huts; the dachas in their plots everywhere off the hills
    for (const [x, z] of [[-430, -40], [-250, -60], [-400, -210]] as [number, number][]) if (free(x, z, 10)) props.townHouse({ x, z, yaw: 0, width: 26, depth: 10, storeys: 3, name: 'sanatorium', damaged: 0 });
    for (let i = 0; i < 8; i++) { const x = -470 + i * 30, z = shoreZ(x) - 66; if (free(x, z, 1) && !nearPoint(x, z, 30)) props.house({ x, z, yaw: 0, width: 4, depth: 3, height: 2.4 }); }
    for (let i = 0; i < 60; i++) { // (the Shamora dachas round the point: huts and the odd bigger dacha)
      const a = r() * Math.PI * 2, dd = 28 + r() * 55, x = -320 + Math.cos(a) * dd, z = -130 + Math.sin(a) * dd * 0.8;
      if (!free(x, z, 3) || nearPoint(x, z, 26)) continue;
      props.house({ x, z, yaw: r() < 0.5 ? 0.05 : Math.PI / 2 + 0.05, width: 5 + r() * 4, depth: 4 + r() * 2, height: 2.6 + r() * 0.8 });
    }
    for (let i = 0; i < 260; i++) {
      const x = (r() * 2 - 1) * 470, z = -40 - r() * 740;
      if (plotC(x, z) < 0.5 || !free(x, z, 3) || nearPoint(x, z, 30) || townK(x, z) > 0.3) continue;
      if (r() < 0.6) props.house({ x, z, yaw: r() < 0.5 ? 0.05 : Math.PI / 2 + 0.05, width: 5 + r() * 2, depth: 4 + r() * 1.5, height: 2.6 });
      else props.hayBales({ x, z, yaw: r(), count: 2 });
    }
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: -830, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || plotC(x, z) > 0.2 || townK(x, z) > 0.3 || z > shoreZ(x) - 40 || runK(x, z) > 0 || (apronK(x) > 0.3 && z > shoreZ(x) - 180) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 9000, broadleaf: 0.6, autumn: 0.35, maxY: 90, avoid,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => z > shoreZ(x) - 36 || runK(x, z) > 0.3 || (apronK(x) > 0.3 && z > shoreZ(x) - 170) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
