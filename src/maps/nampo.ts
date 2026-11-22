// Nampo, September 1985 (coastal: the US and the ROK land, the KPA holds; 1.0 × 1.8 km). The second Korean War of
// 1985 that never came: with the KPA’s armies spent on the DMZ, a US and ROK amphibious force comes in from the West
// Sea at Nampo — Pyongyang’s port on the Taedong estuary, forty kilometres down the river from the capital — to strike
// the North’s capital from behind, as MacArthur struck Seoul from Inchon in 1950. Out at sea the transport area and the
// mine barrier the KPA navy laid across the estuary mouth; then the shore of the estuary, three landing beaches between
// two rocky headlands, each with a coastal gun battery dug into its top: in the west the dykes of the Kwangryang Bay
// salt works, a sea wall and the flat grey pans behind it; in the middle the port of Nampo — a narrow foreshore under
// the quay wall, the portal cranes along it, the warehouses and oil tanks, one slipway the only way up for vehicles;
// in the east the estuary’s mudflats at Waudo, soft, wide and slow. Behind them the paddies, ripe and still wet (soft:
// vehicles wallow), the villages, the town of Nampo with its apartment blocks and the smelter’s chimney, the wooded
// hills, and the road inland to Kangso and Pyongyang.
// (Compressed and turned: the real port faces south onto the estuary with the sea to the west; here the sea is +z.)
// Not point-mirrored: one side lands, the other holds (modes/landing). NATO lands from its base out at sea (+z).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_49);
const sea = createSea({ level: 0, size: SIZE, color: 0x5e6650 }); // (the West Sea off the Taedong: silty, yellow-green)

/** The two headlands between the beaches, a gun battery on each: x, how far out to sea, half-width, height. */
const HEADS = [{ x: -165, reach: 70, w: 45, top: 24 }, { x: 185, reach: 80, w: 44, top: 27 }];
const headK = (x: number) => Math.max(Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)), Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2)));
/** The waterline (z): the beaches a little over a hundred metres from the middle, the headlands out past them. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 12
  + HEADS[0].reach * Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)) + HEADS[1].reach * Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2));
/** The port (0..1 across x): the quay from the west headland to the east one. */
const portK = (x: number) => smoothstep(-135, -110, x) * smoothstep(135, 112, x);
const RAMP = 20; // x of the slipway up the quay wall (the docks’ beach sector)
/** The estuary’s mudflats in the east (0..1 across x). */
const mudK = (x: number) => smoothstep(225, 285, x);
/** The salt works in the west: the pans behind the sea wall (0..1). */
const saltK = (x: number, back: number) => smoothstep(-215, -245, x) * smoothstep(-500, -470, x) * smoothstep(40, 50, back) * smoothstep(240, 210, back);

/** The wooded hills inland: [x, z, radius, height]. */
const HILLS = [[-130, -360, 90, 22], [210, -310, 80, 18], [-410, -430, 100, 26], [420, -470, 90, 24], [90, -500, 70, 14], [-300, -660, 90, 16], [330, -700, 90, 18]];
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) { const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (d2 < 9) h += a * Math.exp(-d2); }
  return h;
}

/** The roads: the coast road behind the headlands, up from each beach, across by Kangso. */
function roadDist(x: number, z: number) {
  const sz = shoreZ(x);
  let d = Infinity;
  if (z < sz - 34 && z > -860) {
    d = Math.min(d, Math.abs(x - (-320 + Math.sin(z * 0.012) * 14)));      // up from the salt works through Ryonggang
    d = Math.min(d, Math.abs(x - (RAMP + Math.sin(z * 0.009) * 18 * smoothstep(60, -40, z))));  // up the slipway through Nampo
  }
  if (z < sz - 48 && z > -860) d = Math.min(d, Math.abs(x - (340 + Math.sin(z * 0.01) * 12))); // off the mudflats through Waudo
  d = Math.min(d, Math.abs(z - (-30 + Math.sin(x * 0.008) * 12)));          // the coast road, behind the headlands
  d = Math.min(d, Math.abs(z - (-600 + Math.sin(x * 0.006) * 25)));         // across, by Kangso
  return d;
}
const onRoad = (x: number, z: number) => roadDist(x, z) < 3.5;

/** The beach sectors and the places up behind them. */
export const SECTORS = [
  { x: -320, name: 'Kwangryang salt works', inland: { name: 'Ryonggang', x: -320, z: -120 } },
  { x: RAMP, name: 'Nampo docks', inland: { name: 'Nampo', x: 30, z: -230 } },
  { x: 335, name: 'Waudo mudflats', inland: { name: 'Waudo', x: 360, z: -100 } },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Kwangryang salt works', x: -320, z: shoreZ(-320) - 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Nampo docks', x: RAMP, z: shoreZ(RAMP) - 46, owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Waudo mudflats', x: 335, z: shoreZ(335) - 50, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Ryonggang', x: -320, z: -120, owner: null, sector: 'west' },
  { id: 'F', name: 'Nampo', x: 30, z: -230, owner: null, sector: 'centre' },
  { id: 'G', name: 'Waudo', x: 360, z: -100, owner: null, sector: 'east' },
  { id: 'K', name: 'Kangso road', x: 40, z: -640, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** The paddies: the low ground inland, off the hills, the roads, the towns and the points. */
function paddyK(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 120 || z < -780) return 0;
  const k = smoothstep(-0.15, 0.1, fbm(noise, x * 0.006 + 11, z * 0.006, 2)) * smoothstep(120, 170, back) * smoothstep(3, 1, hillH(x, z));
  if (k <= 0) return 0;
  return k * smoothstep(6, 12, roadDist(x, z)) * (nearPoint(x, z, 45) ? 0 : 1) * smoothstep(55, 80, Math.hypot(x - 30, z + 230));
}

function height(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, hk = headK(x), mk = mudK(x);
  if (d > 0) { // the bottom: shelving off, the mudflats in the east very gently, rocks off the headlands
    const h = 0.5 - d * (0.018 - 0.009 * mk) - Math.max(0, d - 130 - 70 * mk) * 0.05 + hk * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    return Math.max(h, -18);
  }
  const back = -d;
  // the shore (35–40 m of sand and mud, the mudflats wider and lower), then the land: 4–7 m, rising inland
  const beach = mk > 0 ? 0.5 + Math.min(back, 40) * 0.04 - mk * (0.3 + Math.min(back, 70) * 0.01) * smoothstep(90, 50, back) : 0.5 + Math.min(back, 40) * 0.04;
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let land = 3 + smoothstep(30, 110, back) * 2 + Math.max(0, back - 250) * 0.01 + n * 2.5 + hillH(x, z);
  let h = Math.max(beach, Math.min(land, beach + back * 0.2));
  // the paddies: terraced flat
  const pk = paddyK(x, z);
  if (pk > 0) h += (3.4 + Math.round(n * 5) * 0.25 - h) * pk;
  // the salt works: a sea wall along the back of the beach, the flat pans behind it
  const sk = saltK(x, back);
  if (sk > 0) h += (1.6 - h) * sk;
  const wall = smoothstep(-215, -245, x) * smoothstep(-500, -470, x) * Math.exp(-(((back - 38) / 3) ** 2));
  h += wall * 1.4;
  // the port: a foreshore under a 3 m quay wall, one slipway up it
  const pt = portK(x);
  if (pt > 0) {
    let q = back < 30 ? 0.4 + back * 0.025 : back < 32 ? 1.15 + (back - 30) * 1.45 : 4 + Math.max(0, back - 160) * 0.015;
    q += (Math.min(q, 0.4 + back * 0.09) - q) * smoothstep(22, 14, Math.abs(x - RAMP)); // (the slipway: 1 in 11)
    h += (q - h) * pt * smoothstep(260, 190, back);
  }
  // the headlands: rock 24–27 m high, a cliff to the sea, falling back to the land inland
  if (hk > 0.05) {
    const hd = x < 0 ? HEADS[0] : HEADS[1];
    const top = hd.top + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
    h = h + (Math.max(h, 0.5 + top * smoothstep(4, 26, back) * smoothstep(190, 100, back)) - h) * smoothstep(0.25, 0.7, hk);
  }
  // the bases: flat
  h += (5 + Math.max(0, shoreZ(0) + 830 - 250) * 0.01 - h) * smoothstep(60, 25, Math.hypot(x, z + 830)); // (to the land’s own level there: no pit for the vehicles to stick in)
  return h;
}

const paddyC = gridCache(paddyK, BOUNDS);
const mudSoft = (x: number, z: number) => mudK(x) * smoothstep(shoreZ(x) - 75, shoreZ(x) - 40, z);
/** The mudflats and the wet paddies: slow going, vehicles all but stuck. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = Math.max(paddyC(x, z), mudSoft(x, z));
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.35 : 0.65);
}
/** Pine and oak on the hills and the headlands. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(6, 13, hillH(x, z)), smoothstep(0.4, 0.8, headK(x)) * smoothstep(shoreZ(x) - 30, shoreZ(x) - 60, z) * smoothstep(shoreZ(x) - 200, shoreZ(x) - 140, z))
  * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 30) ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
/** Nampo: the town between the docks and the hills. */
const townK = (x: number, z: number) => smoothstep(150, 110, Math.hypot((x - 40) * 0.8, z + 200)) * (headK(x) < 0.4 ? 1 : 0);
const bund = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return Math.min(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11)) > 13.6;
};
const panLine = (x: number, z: number) => Math.min(Math.abs(((x % 26) + 26) % 26 - 13), Math.abs(((z % 18) + 18) % 18 - 9)) > 12.2;

export default {
  id: 'nampo',
  name: 'Nampo Landing',
  description: 'The Taedong estuary, September 1985: the salt works, the port of Nampo under its cranes and the mudflats at Waudo between two headlands with coastal guns, the paddies and hills behind. The US and the ROK land from the sea; the KPA holds the road to Pyongyang.',
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
  airfields: [], // (no runway fits: the port, the salt pans, the paddies and the hills)
  steep: 0.5, // (vehicles: the quay wall and the headlands are no way up — the slipway is)
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
        if (roadDist(x, z) < (townK(x, z) > 0.5 ? 5 : 3.5) && back > 30) return [0x76736c, 0.86];  // asphalt
        if (back < -3) return [y > -1.5 ? 0x8a7e62 : 0x6e6450, 1];                                  // the silt under the water
        if (headK(x) > 0.3 && y > 3 && back < 120) return [0x6a6658, 0.85];                         // the headlands’ rock
        const pt = portK(x);
        if (pt > 0.5 && back < 31) return [0x7e7668, 1];                                            // the foreshore: gravel and silt
        if (pt > 0.5 && back < 170) return [0x8a8880, 0.95];                                        // the quay’s concrete
        if (mudSoft(x, z) > 0.3 || (mudK(x) > 0.3 && back < 40)) return [0x6e604a, 0.95];           // the mudflats
        if (back < 36) return [0xb8aa88, 1];                                                        // sand and silt
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
           pact: { x: 0, z: -830, entries: [-320, 20, 340] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what comes in (systems/Landing.js): the men by LCVP or LCU, the vehicles by LCU (NATO’s 1985 craft: data/units/baltic85.js)
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: a Perry frigate or a Spruance inshore, a sweeper, the battleship New Jersey offshore
    // (the sweeper is the generic NATO minesweeper on the Natya hull: 1985 has no NATO one of its own yet)
    navy: ['frigate', 'destroyer', 'natya', 'battleship'],
    // the KPA navy’s mines across the estuary mouth, a lane left off each beach for the sweepers
    seaMines: { z: [520, 580], count: 60, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_49 },
    // the coastal artillery: a Koksan gun dug into each headland, laid on the beaches; the Silkworm battery inland that fires on the ships
    forts: [
      { unit: 'artillery', x: HEADS[0].x, z: shoreZ(HEADS[0].x) - 70, facing: 0, name: 'West headland battery' },
      { unit: 'artillery', x: HEADS[1].x, z: shoreZ(HEADS[1].x) - 75, facing: 0, name: 'East headland battery' },
      { unit: 'coastMissile', x: -150, z: -330, facing: 0, name: 'Silkworm battery' }, { unit: 'coastMissile', x: 230, z: -420, facing: 0, name: 'Silkworm battery' },
    ],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests over it; tank traps on the slipway
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -480 + i * 11; return headK(x) > 0.3 || Math.abs(x - RAMP) < 18 ? null : { kind: 'wire', x, z: shoreZ(x) - (portK(x) > 0.5 ? 26 : 30), yaw: 0 }; }).filter(Boolean),
      ...[8, 16, 24, 32].map((x) => ({ kind: 'tankTraps', x, z: shoreZ(x) - 24, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 64 }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - 54, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - 48, yaw: 0 }))),
      ...SECTORS.slice(1).flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 38 }))), // (none on the salt works’ sand: the sea wall and the open pans behind it hold that beach — AI vs AI 2026-11-22)
    ],
    // the defence at dawn: the coast defence brigade over each beach, the Red Guards in the villages, Malyutkas and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'kampfgruppe', 'tankDestroyer', 'mortar', 'kampfgruppe', 'scouts'],
    names: { rifles: 'Coast defence squad' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56) }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    // the counter-attack: the corps’ armour down the Kangso road from Pyongyang
    counter: { t: 420, units: ['heavyTank', 'ifv', 'tank', 'ifv', 'heavyTank'], say: 'The corps’ armour is coming down the Kangso road: Chonma-hos and VTT-323s, straight for the beachhead', sayOther: 'Enemy armour coming down the road from Kangso: Chonma-hos and T-55s' },
    // the landing’s AI (ai/LandingDirector.js): its buying order, a frigate inshore off the focus beach, a sweeper for the lane
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'tank', 'rifles', 'mgTeam', 'ifv', 'rifles', 'tank', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2400, perSector: 700, beachIncome: 0.9, defenceCp: 700, defenceIncome: 1.6 }, // (richer than Andøya’s, the counter later: the LCVPs are slow and the KPA held every AI-vs-AI run at Andøya’s numbers, 2026-11-22)
    // the KIFVs, M113s and Bradleys swim in on their own, put in off the beach
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
    const r = mulberry32(1985_49);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 6 + rr && !nearPoint(x, z, 18 + rr) && headK(x) < 0.3 && z < shoreZ(x) - 40 - rr && Math.hypot(x, z + 830) > 45;

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
    for (const x of [-95, -65, -35, 75, 105]) crane(x, shoreZ(x) - 38);
    for (const [x, w] of [[-80, 44], [-20, 30], [80, 40]] as [number, number][]) props.hall({ x, z: shoreZ(x) - 95, yaw: 0, width: w, depth: 18, height: 9, color: 0x8c8678, roof: 0x4a4c4e, door: 10, name: 'warehouse' });
    props.tanks({ x: 90, z: shoreZ(90) - 140, yaw: 0, count: 3, radius: 6, height: 9, color: 0x9a9a92 });
    for (let i = 0; i < 4; i++) props.crates({ x: -50 + i * 7, z: shoreZ(-50) - 55, yaw: 0 });
    // ---- the salt works: heaps of salt, the sheds, a pump house on the sea wall
    for (let i = 0; i < 7; i++) { const x = -440 + i * 30 + (r() - 0.5) * 8, z = shoreZ(x) - 150 - r() * 50; if (!free(x, z, 5)) continue; props.box('plain', x, g(x, z) + 1.2, z, 6, 2.4, 4, r(), 0xe8e6de); }
    for (const x of [-420, -260]) props.hall({ x, z: shoreZ(x) - 230, yaw: 0, width: 16, depth: 8, height: 4, color: 0x8a8070, roof: 0x5a5a56, door: 4, name: 'salt shed' });
    props.flatHouse({ x: -390, z: shoreZ(-390) - 44, yaw: 0, width: 6, depth: 5, storeys: 1, name: 'pump house' });

    // ---- the gun positions on the headlands: sandbags round them, a lighthouse on the east one
    for (const h of HEADS) for (const s of [-1, 1]) props.sandbagRing({ x: h.x + s * 18, z: shoreZ(h.x) - 62, radius: 4.5, toward: 1 });
    { const x = HEADS[1].x + 20, z = shoreZ(HEADS[1].x) - 30, y = g(x, z); props.box('stone', x, y + 7, z, 3, 14, 3, 0, 0xe8e4dc); props.box('plain', x, y + 15, z, 3.6, 2, 3.6, 0, 0x2a2a2a); }

    // ---- Nampo: apartment blocks round the centre, shop houses on the streets; the smelter’s chimney on the hill road
    for (let gx = -100; gx <= 180; gx += 34) for (let gz = -110; gz >= -320; gz -= 28) {
      const x = gx + (r() - 0.5) * 6, z = gz + (r() - 0.5) * 5;
      if (townK(x, z) < 0.5 || r() < 0.25 || !free(x, z, 12)) continue;
      const yaw = r() < 0.75 ? 0 : Math.PI / 2;
      if (r() < 0.6) props.ruinBlock({ x, z, yaw, width: 20 + r() * 6, depth: 10, storeys: 4 + Math.floor(r() * 3), ruin: 0, name: 'apartment block' });
      else props.flatHouse({ x, z, yaw, width: 9 + r() * 3, depth: 8 + r() * 2, storeys: 2, name: 'shop house' });
    }
    props.hall({ x: 150, z: -300, yaw: 0, width: 44, depth: 22, height: 14, color: 0x6a5a4c, roof: 0x3e3a38, door: 10, name: 'smelter' });
    props.chimney({ x: 175, z: -322, height: 55 });
    props.flatHouse({ x: -10, z: -270, yaw: 0, width: 24, depth: 12, storeys: 3, name: 'party committee' });
    // ---- the villages: Ryonggang behind the salt works, Waudo on the mudflats, farmsteads out in the paddies
    for (let [cx, cz, n] of [[-320, -120, 12], [360, -100, 10], [-150, -560, 6], [250, -580, 6]] as [number, number, number][]) {
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
      const x = (r() * 2 - 1) * 470, z = -60 - r() * 700;
      if (paddyC(x, z) < 0.5 || !free(x, z, 4)) continue;
      if (r() < 0.25) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 6, height: 2.8 });
      else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 3) });
    }
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: -830, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || paddyC(x, z) > 0.2 || townK(x, z) > 0.3 || z > shoreZ(x) - 40 || saltK(x, shoreZ(x) - z) > 0.2 || (portK(x) > 0.3 && z > shoreZ(x) - 180) }];
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
