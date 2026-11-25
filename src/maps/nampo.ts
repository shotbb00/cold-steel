// Nampo, September 1985 (coastal: the US and the ROK land, the KPA holds; 1.0 × 1.8 km). The second Korean War of
// 1985 that never came: with the KPA’s armies spent on the DMZ, a US and ROK amphibious force comes in from the West
// Sea at Nampo — Pyongyang’s port on the Taedong estuary, forty kilometres down the river from the capital — to strike
// the North’s capital from behind, as MacArthur struck Seoul from Inchon in 1950. Out at sea the transport area and the
// mine barrier the KPA navy laid across the estuary; then the estuary’s north shore, running away on the slant from
// the open sea in the west up the river to the east, with four ways in along it and no headland between them: the sea
// wall of the Kwangryang Bay salt works in the west, the flat grey pans behind it; the port of Nampo — a foreshore
// under the quay wall, the portal cranes along it, the warehouses and oil tanks, one slipway the only way up for
// vehicles; the estuary’s mudflats at Waudo, soft, wide and slow; and up the river the shingle bank at Taean, under the
// heavy machine works. A coastal gun dug into a knoll on the shore between the port and the salt works, another between
// the mudflats and Taean. Behind the shore the paddies, ripe and still wet (soft: vehicles wallow), the villages, the
// town of Nampo with its apartment blocks and the smelter’s chimney — and a wooded ridge running behind it all,
// parallel to the shore, crossed by the roads in three cuttings, with the road to Kangso and Pyongyang beyond.
// (Compressed and turned: the real port faces south onto the estuary with the sea to the west; here the sea is +z and
// the shore runs from the west-north-west to the east-south-east as the estuary narrows.)
// Not point-mirrored: one side lands, the other holds (modes/landing). NATO lands from its base out at sea (+z).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_49);
const sea = createSea({ level: 0, size: SIZE, color: 0x5e6650 }); // (the West Sea off the Taedong: silty, yellow-green)

/** The estuary’s north shore on the slant (z of the waterline): far out in the west, up the river in the east. */
const SLANT = 0.42;
const line = (x: number) => 110 - SLANT * x;
const shoreZ = (x: number) => line(x) + fbm(noise, x * 0.004, 2.1, 2) * 14;
/** The port (0..1 across x): the quay wall. */
const portK = (x: number) => smoothstep(-215, -195, x) * smoothstep(-5, -25, x);
const RAMP = -110; // x of the slipway up the quay wall (the docks’ beach sector)
/** The estuary’s mudflats at Waudo (0..1 across x). */
const mudK = (x: number) => smoothstep(40, 90, x) * smoothstep(265, 215, x);
/** The salt works in the west: the pans behind the sea wall (0..1). */
const saltK = (x: number, back: number) => smoothstep(-255, -285, x) * smoothstep(40, 50, back) * smoothstep(250, 220, back);
/** The ridge behind it all, parallel to the shore (m back from the line), and its height. */
const RIDGE = { back: 420, w: 75, top: 34 };

/** The knolls on the shore (the gun batteries) and the hills inland: [x, z, radius, height]. */
const HILLS = [[-245, line(-245) - 70, 48, 15], [275, line(275) - 75, 48, 13], [-420, -620, 90, 18], [330, -720, 90, 16], [60, -820, 70, 10]];
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) { const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (d2 < 9) h += a * Math.exp(-d2); }
  return h;
}

/** Distance from (x, z) to the segment a–b. */
function seg(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const BASE = { x: -100, z: -830 };
/** The roads, as polylines: the coast road behind the shore; up from each way in, over the ridge, to the Kangso road. */
const ROADS: number[][][] = [
  [-500, -250, 0, 250, 500].map((x) => [x, line(x) - 105]),                                        // the coast road
  [[-370, line(-370) - 32], [-360, 40], [-300, -170], [-200, -420], [-150, -680], [BASE.x, BASE.z]], // up from the salt works through Ryonggang
  [[RAMP, line(RAMP) - 20], [-90, -50], [-100, -280], [-150, -680]],                                // up the slipway through Nampo
  [[150, line(150) - 40], [200, -130], [300, -250]],                                                 // off the mudflats to Taean
  [[390, line(390) - 30], [300, -250], [240, -500], [-150, -680]],                                   // up from the bank through Taean, over the ridge
  [[-480, -700], [-150, -680], [330, -620]],                                                         // the Kangso road
];
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const r of ROADS) for (let i = 1; i < r.length; i++) d = Math.min(d, seg(x, z, r[i - 1], r[i]));
  return d;
}
const roadC = gridCache(roadDist, BOUNDS, 2);
const onRoad = (x: number, z: number) => roadC(x, z) < 3.5;

/** The beach sectors and the places up behind them (Waudo’s mudflats and Taean’s bank both lead to Taean). */
export const SECTORS = [
  { x: -370, name: 'Kwangryang salt works', inland: { name: 'Ryonggang', x: -360, z: 40 } },
  { x: RAMP, name: 'Nampo docks', inland: { name: 'Nampo', x: -90, z: -50 } },
  { x: 150, name: 'Waudo mudflats', inland: { name: 'Taean', x: 300, z: -250 } },
  { x: 390, name: 'Taean bank', inland: { name: 'Taean', x: 300, z: -250 } },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: -150, z: 720, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Kwangryang salt works', x: -370, z: shoreZ(-370) - 44, owner: null, sector: 'west', radius: 50, opens: 'F' },
  { id: 'C', name: 'Nampo docks', x: RAMP, z: shoreZ(RAMP) - 46, owner: null, sector: 'centre', radius: 50, opens: 'G' },
  { id: 'D', name: 'Waudo mudflats', x: 150, z: shoreZ(150) - 55, owner: null, sector: 'centre', radius: 50, opens: 'H' },
  { id: 'E', name: 'Taean bank', x: 390, z: shoreZ(390) - 42, owner: null, sector: 'east', radius: 45, opens: 'H' },
  { id: 'F', name: 'Ryonggang', x: -360, z: 40, owner: null, sector: 'west' },
  { id: 'G', name: 'Nampo', x: -90, z: -50, owner: null, sector: 'centre' },
  { id: 'H', name: 'Taean', x: 300, z: -250, owner: null, sector: 'east' },
  { id: 'K', name: 'Kangso road', x: -150, z: -680, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** The ridge (0..1 of its height), cut down where the roads cross it. */
const ridgeK = (x: number, z: number) => Math.exp(-(((line(x) - z - RIDGE.back - fbm(noise, x * 0.006, 9.1, 2) * 30) / RIDGE.w) ** 2));

/** The paddies: the low ground between the shore and the ridge, off the knolls, the roads, the towns and the points. */
function paddyK(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 110 || z < -780) return 0;
  const k = smoothstep(-0.15, 0.1, fbm(noise, x * 0.006 + 11, z * 0.006, 2)) * smoothstep(110, 160, back) * smoothstep(3, 1, hillH(x, z)) * smoothstep(0.35, 0.1, ridgeK(x, z));
  if (k <= 0) return 0;
  return k * smoothstep(6, 12, roadC(x, z)) * (nearPoint(x, z, 45) ? 0 : 1) * smoothstep(55, 80, Math.hypot(x + 90, z + 70));
}
const paddyC = gridCache(paddyK, BOUNDS);

/** The smooth ground: the estuary’s bottom, the shore, the paddies, the knolls, the ridge and its cuttings (gridCacheSmooth). */
function natural(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, mk = mudK(x);
  if (d > 0) { // the bottom: shelving off, the mudflats very gently, a steeper bank up the river
    const ek = smoothstep(320, 380, x);
    const h = 0.5 - d * (0.018 - 0.01 * mk + 0.02 * ek) - Math.max(0, d - 130 - 80 * mk) * 0.05;
    return Math.max(h, -18);
  }
  const back = -d;
  // the shore (35–40 m of sand and mud, the mudflats wider and lower), then the land: 3–5 m, rising slowly inland
  const beach = mk > 0 ? 0.5 + Math.min(back, 40) * 0.04 - mk * (0.3 + Math.min(back, 70) * 0.01) * smoothstep(90, 50, back) : 0.5 + Math.min(back, 40) * 0.04;
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  const cut = smoothstep(6, 30, roadC(x, z));
  const land = 3 + smoothstep(30, 110, back) * 2 + n * 2.5 + hillH(x, z) + RIDGE.top * ridgeK(x, z) * (0.25 + 0.75 * cut) + Math.max(0, back - RIDGE.back) * 0.012;
  let h = Math.max(beach, Math.min(land, beach + back * 0.2));
  const pk = paddyK(x, z);
  if (pk > 0) h += (3.4 + Math.round(n * 5) * 0.25 - h) * pk; // the paddies: terraced flat
  return h;
}
const naturalC = gridCacheSmooth(natural, BOUNDS, 2);
const BASE_H = natural(BASE.x, BASE.z);

function height(x: number, z: number) {
  let h = naturalC(x, z);
  const back = shoreZ(x) - z;
  // the salt works: a sea wall along the back of the beach, the flat pans behind it
  const sk = saltK(x, back);
  if (sk > 0) h += (1.6 - h) * sk;
  h += smoothstep(-255, -285, x) * Math.exp(-(((back - 38) / 3) ** 2)) * 1.4;
  // the port: a foreshore under a 3 m quay wall, one slipway up it
  const pt = portK(x);
  if (pt > 0 && back > 0) {
    let q = back < 30 ? 0.4 + back * 0.025 : back < 32 ? 1.15 + (back - 30) * 1.45 : 4 + Math.max(0, back - 160) * 0.015;
    q += (Math.min(q, 0.4 + back * 0.09) - q) * smoothstep(22, 14, Math.abs(x - RAMP)); // (the slipway: 1 in 11)
    h += (q - h) * pt * smoothstep(240, 180, back);
  }
  // Taean’s bank: a low bluff over the shingle, a cut up it for the ferry road
  const ek = smoothstep(330, 360, x);
  if (ek > 0 && back > 0 && back < 120) h += ek * 3.5 * smoothstep(28, 44, back) * smoothstep(5, 18, Math.abs(x - 390));
  const bd = Math.hypot(x - BASE.x, z - BASE.z);
  if (bd < 60) h += (BASE_H - h) * smoothstep(60, 25, bd); // (level with the land round it: no pit for the vehicles)
  return h;
}

const mudSoft = (x: number, z: number) => mudK(x) * smoothstep(shoreZ(x) - 75, shoreZ(x) - 40, z);
/** The mudflats and the wet paddies: slow going, vehicles all but stuck. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = Math.max(paddyC(x, z), mudSoft(x, z));
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.35 : 0.65);
}
/** Pine and oak on the ridge and the knolls. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(6, 12, hillH(x, z)), smoothstep(0.3, 0.6, ridgeK(x, z)))
  * smoothstep(4, 12, roadC(x, z)) * (nearPoint(x, z, 30) ? 0 : 1) * smoothstep(shoreZ(x) - 40, shoreZ(x) - 70, z);
const woodsC = gridCache(woodsK, BOUNDS);
/** Nampo: the town between the docks and the ridge. */
const townK = (x: number, z: number) => smoothstep(140, 100, Math.hypot((x + 80) * 0.8, z + 40));
const bund = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return Math.min(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11)) > 13.6;
};
const panLine = (x: number, z: number) => Math.min(Math.abs(((x % 26) + 26) % 26 - 13), Math.abs(((z % 18) + 18) % 18 - 9)) > 12.2;

export default {
  id: 'nampo',
  name: 'Nampo Landing',
  description: 'The Taedong estuary, September 1985: a slanting shore with four ways in — the salt works’ sea wall, the port of Nampo under its cranes, the mudflats at Waudo and the bank at Taean — the paddies behind, and a wooded ridge parallel to the shore. The US and the ROK land from the sea; the KPA holds the road to Pyongyang.',
  epochs: ['1985'],
  region: 'korea',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'South Korea', pact: 'North Korea' },
  armies: { nato: ['us', 'rok'], pact: ['kpa'] }, // (the US and the ROK land; the Korean People’s Army holds the coast)
  conditions: { time: 'dawn', weather: 'clear' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  airfields: [], // (no runway fits: the port, the salt pans, the paddies and the ridge)
  steep: 0.5, // (vehicles: the quay wall is no way up — the slipway is)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // an early-autumn dawn over the estuary, haze on the water, the rice gold
    fogColor: 0xc4c2b4, fogDensity: 0.0007,
    skyTop: 0x5a7aa0, skyHorizon: 0xdcd4c0, skyBottom: 0x847c68,
    sunColor: 0xffe2c0, sunIntensity: 1.6, sunDisk: 0.35,
    clouds: 0.35, cloudLight: 0xf4ece0, cloudDark: 0x9a9ca4,
    sunDir: [-0.5, 0.35, 0.75],
    hemiSky: 0xccd2dc, hemiGround: 0x5e5a40, hemiIntensity: 1.3,
    rimColor: 0xe0d8cc, rimIntensity: 0.22,
    terrain: {
      grass: '#68703c', grassAlt: '#5e6836', dryGrass: '#9a8a54', dirt: '#6e5a40', rock: '#787468',
      pasture: '#68703c', ploughed: '#5e4a34', stubble: '#a08e56', meadow: '#727a42',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x), back = sz - z;
        if (roadC(x, z) < (townK(x, z) > 0.5 ? 5 : 3.5) && back > 30) return [0x76736c, 0.86];     // asphalt
        if (back < -3) return [y > -1.5 ? 0x8a7e62 : 0x6e6450, 1];                                  // the silt under the water
        const pt = portK(x);
        if (pt > 0.5 && back < 31) return [0x7e7668, 1];                                            // the foreshore: gravel and silt
        if (pt > 0.5 && back < 170) return [0x8a8880, 0.95];                                        // the quay’s concrete
        if (mudSoft(x, z) > 0.3 || (mudK(x) > 0.3 && back < 40)) return [0x6e604a, 0.95];           // the mudflats
        if (back < 36) return [x > 330 ? 0x8e887a : 0xb8aa88, 1];                                   // sand and silt (Taean’s shingle)
        if (saltK(x, back) > 0.5) return [panLine(x, z) ? 0x8a8268 : noise(x * 0.05, z * 0.05) > 0 ? 0xdedcd2 : 0xbcc0bc, 1]; // the salt pans, their dykes
        if (townK(x, z) > 0.6) return [0x8c867a, 0.6];                                              // yards between the blocks
        const pk = paddyC(x, z);
        if (pk > 0.3) {
          if (bund(x, z)) return [0x6a6a3a, 0.8];                                                    // the bunds
          const k = noise(x * 0.04, z * 0.04);
          return [k > 0.3 ? 0xa89a48 : k > -0.3 ? 0xb8a650 : 0x8a8a44, pk * 0.85];                    // ripe rice, a few fields still green
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: BASE.x, z: BASE.z, entries: [-150, -100, -50] } },
  maxStacks: 26,
  cameraStart: { nato: { x: -100, z: 330 }, pact: { x: -50, z: -250 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what comes in (systems/Landing.js): the men by LCVP or LCU, the vehicles by LCU (NATO’s 1985 craft: data/units/baltic85.js)
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: a Perry frigate or a Spruance inshore, a sweeper, the battleship New Jersey offshore
    // (the sweeper is the generic NATO minesweeper on the Natya hull: 1985 has no NATO one of its own yet)
    navy: ['frigate', 'destroyer', 'natya', 'battleship'],
    // the KPA navy’s mines across the estuary, a lane left off each way in for the sweepers
    seaMines: { z: [500, 560], count: 70, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_49 },
    // the coastal artillery: a Koksan gun dug into each shore knoll, laid on the beaches; the Silkworm battery behind the ridge that fires on the ships
    forts: [
      { unit: 'artillery', x: -245, z: line(-245) - 70, facing: 0, name: 'Okdo knoll battery' },
      { unit: 'artillery', x: 275, z: line(275) - 75, facing: 0, name: 'Waudo knoll battery' },
      { unit: 'coastMissile', x: -330, z: -560, facing: 0, name: 'Silkworm battery' }, { unit: 'coastMissile', x: 120, z: -640, facing: 0, name: 'Silkworm battery' },
    ],
    // prepared positions: wire along the back of each way in, minefields, trenches and MG nests over it; tank traps on the slipway
    works: [
      ...SECTORS.flatMap((s) => Array.from({ length: 13 }, (_, i) => { const x = s.x - 66 + i * 11; return Math.abs(x - RAMP) < 18 ? null : { kind: 'wire', x, z: shoreZ(x) - (portK(x) > 0.5 ? 26 : 30), yaw: -Math.atan(SLANT) }; }).filter((w) => !!w)),
      ...[RAMP - 12, RAMP - 4, RAMP + 4, RAMP + 12].map((x) => ({ kind: 'tankTraps', x, z: shoreZ(x) - 24, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 64 }))),
      ...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - 54, yaw: -Math.atan(SLANT) }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - 48, yaw: -Math.atan(SLANT) }))),
      ...SECTORS.slice(1).flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 38 }))), // (none on the salt works’ sand: the sea wall and the open pans behind it hold that beach)
    ],
    // the defence at dawn: the coast defence brigade over each way in, the Red Guards in the villages, Malyutkas and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'kampfgruppe', 'tankDestroyer', 'mortar', 'kampfgruppe', 'scouts'],
    names: { rifles: 'Coast defence squad' },
    hold: [...SECTORS.flatMap((s) => [-30, 0, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (dx ? 52 : 60) }))), { x: -360, z: 40 }, { x: -90, z: -50 }, { x: 300, z: -250 }],
    // the counter-attack: the corps’ armour over the ridge from the Kangso road
    counter: { t: 420, units: ['heavyTank', 'ifv', 'tank', 'ifv', 'heavyTank'], say: 'The corps’ armour is coming over the ridge from the Kangso road: Chonma-hos and VTT-323s, straight for the beachhead', sayOther: 'Enemy armour coming over the ridge from Kangso: Chonma-hos and T-55s' },
    // the landing’s AI (ai/LandingDirector.js): its buying order, a frigate inshore off the focus beach, a sweeper for the lane
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'tank', 'rifles', 'mgTeam', 'ifv', 'rifles', 'tank', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, sweeper: 'natya', heavy: null, inshore: 420 },
    economy: { reserves: 2400, perSector: 600, beachIncome: 0.75, defenceCp: 800, defenceIncome: 1.5 }, // (AI vs AI 2026-11-25: at 0.7 / 1.6 the KPA held Nampo and Taean to the end; at 0.8 / 1.4 the landing won at 11:22)
    // the KIFVs, M113s and Bradleys swim in on their own, put in off the beach
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon' },
    // the first wave at dawn: the port and the mudflats; the salt works and Taean wait for the second
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
      { unit: 'rifles', sector: 3 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_49);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadC(x, z) > 6 + rr && !nearPoint(x, z, 18 + rr) && z < shoreZ(x) - 40 - rr && Math.hypot(x - BASE.x, z - BASE.z) > 45;
    const along = -Math.atan(SLANT); // (the shore’s line: what faces it is turned this way)

    // ---- the port: portal cranes along the quay (jibs out over the foreshore), warehouses behind, the oil tanks
    const crane = (x: number, z: number) => {
      const y = g(x, z), red = 0x8a3a2a;
      for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) props.box('metal', x + lx, y + 4, z + lz, 0.6, 8, 0.6, 0, red);
      props.box('metal', x, y + 8.4, z, 7.4, 0.8, 7.4, 0, red);           // the portal
      props.box('metal', x, y + 12.8, z, 2.2, 8, 2.2, 0, red);            // the tower
      props.box('metal', x, y + 17.8, z - 0.5, 4, 3, 5.5, 0, 0xc8b040);   // the machinery house
      props.box('metal', x, y + 19.5 + 9 * Math.sin(0.35), z + 9.5, 0.9, 0.9, 20, 0, red, -0.35); // the jib, luffed up over the water
      cover.addCylinder({ x, z, radius: 1.4, height: 12 });
    };
    for (const x of [-185, -160, -135, -75, -45]) crane(x, shoreZ(x) - 38);
    for (const [x, w] of [[-170, 40], [-60, 34]] as [number, number][]) props.hall({ x, z: shoreZ(x) - 95, yaw: along, width: w, depth: 18, height: 9, color: 0x8c8678, roof: 0x4a4c4e, door: 10, name: 'warehouse' });
    props.tanks({ x: -30, z: shoreZ(-30) - 140, yaw: 0, count: 3, radius: 6, height: 9, color: 0x9a9a92 });
    for (let i = 0; i < 4; i++) props.crates({ x: -150 + i * 7, z: shoreZ(-150 + i * 7) - 58, yaw: along });
    // ---- the salt works: heaps of salt, the sheds, a pump house on the sea wall
    for (let i = 0; i < 7; i++) { const x = -480 + i * 30 + (r() - 0.5) * 8, z = shoreZ(x) - 150 - r() * 50; if (!free(x, z, 5)) continue; props.box('plain', x, g(x, z) + 1.2, z, 6, 2.4, 4, r(), 0xe8e6de); }
    for (const x of [-460, -300]) if (free(x, shoreZ(x) - 230, 10)) props.hall({ x, z: shoreZ(x) - 230, yaw: along, width: 16, depth: 8, height: 4, color: 0x8a8070, roof: 0x5a5a56, door: 4, name: 'salt shed' });
    props.flatHouse({ x: -440, z: shoreZ(-440) - 44, yaw: along, width: 6, depth: 5, storeys: 1, name: 'pump house' });
    // ---- the gun positions on the knolls: sandbags round them, a lighthouse on the Okdo knoll
    for (const [x, z] of [[-245, line(-245) - 70], [275, line(275) - 75]]) for (const s of [-1, 1]) props.sandbagRing({ x: x + s * 16, z: z + s * 7, radius: 4.5, toward: 1 });
    { const x = -230, z = line(-230) - 45, y = g(x, z); props.box('stone', x, y + 7, z, 3, 14, 3, 0, 0xe8e4dc); props.box('plain', x, y + 15, z, 3.6, 2, 3.6, 0, 0x2a2a2a); }
    // ---- Taean: the heavy machine works’ sheds behind the bank, a gantry over its slipway
    for (const [x, z] of [[430, -160], [360, -330], [420, -260]]) if (free(x, z, 22)) props.hall({ x, z, yaw: along, width: 50, depth: 24, height: 15, color: 0x6e6a60, roof: 0x3e3e3c, door: 12, name: 'machine works' });
    { const x = 440, z = shoreZ(440) - 20, y = g(x, z); for (const s of [-1, 1]) props.box('metal', x + s * 9, y + 8, z, 1.2, 16, 1.2, 0, 0x8a3a2a); props.box('metal', x, y + 16.5, z, 20, 1.4, 1.6, 0, 0x8a3a2a); }

    // ---- Nampo: apartment blocks round the centre, shop houses on the streets; the smelter’s chimney toward the ridge
    for (let gx = -200; gx <= 60; gx += 34) for (let gz = 40; gz >= -170; gz -= 28) {
      const x = gx + (r() - 0.5) * 6, z = gz + (r() - 0.5) * 5;
      if (townK(x, z) < 0.5 || r() < 0.25 || !free(x, z, 12)) continue;
      const yaw = r() < 0.75 ? along : along + Math.PI / 2;
      if (r() < 0.6) props.ruinBlock({ x, z, yaw, width: 20 + r() * 6, depth: 10, storeys: 4 + Math.floor(r() * 3), ruin: 0, name: 'apartment block' });
      else props.flatHouse({ x, z, yaw, width: 9 + r() * 3, depth: 8 + r() * 2, storeys: 2, name: 'shop house' });
    }
    if (free(40, -190, 26)) props.hall({ x: 40, z: -190, yaw: along, width: 44, depth: 22, height: 14, color: 0x6a5a4c, roof: 0x3e3a38, door: 10, name: 'smelter' });
    props.chimney({ x: 70, z: -215, height: 55 });
    if (free(-150, -110, 14)) props.flatHouse({ x: -150, z: -110, yaw: along, width: 24, depth: 12, storeys: 3, name: 'party committee' });
    // ---- the villages: Ryonggang behind the salt works, Waudo on the mudflats, Taean’s workers’ houses, farmsteads in the paddies
    for (let [cx, cz, n] of [[-360, 40, 12], [180, -60, 8], [300, -250, 10], [-250, -380, 5], [100, -420, 5]] as [number, number, number][]) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 22 + r() * 45;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!free(x, z, 5) || paddyC(x, z) > 0.3) continue;
        n--;
        if (i % 5 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, a + Math.PI / 2);
        else props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 9, depth: 6, height: 2.8 });
      }
      props.rand = r;
    }
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * 470, z = 300 - r() * 900;
      if (paddyC(x, z) < 0.5 || !free(x, z, 4)) continue;
      if (r() < 0.25) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 6, height: 2.8 });
      else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 3) });
    }
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: BASE.x, z: BASE.z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadC(x, z) < 6 || paddyC(x, z) > 0.2 || townK(x, z) > 0.3 || z > shoreZ(x) - 40 || saltK(x, shoreZ(x) - z) > 0.2 || (portK(x) > 0.3 && z > shoreZ(x) - 180) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 5000, broadleaf: 0.4, autumn: 0.35, maxY: 80, avoid,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => z > shoreZ(x) - 36 || saltK(x, shoreZ(x) - z) > 0.3 || (portK(x) > 0.3 && z > shoreZ(x) - 170) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
