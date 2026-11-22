// Tartus, summer 1985 (coastal: the US Marines land, the Soviet garrison holds; 1.0 × 1.8 km). The war that did not
// happen has come to the Levant: Tartus is the Soviet Navy’s only base in the Mediterranean — the 5th Eskadra’s
// material-technical supply point, its quay on the north mole, its oilers and floating workshops alongside, the fuel
// tanks behind — and a US Marine Amphibious Unit comes in from the Sixth Fleet to raid it, with the New Jersey
// offshore as off Beirut in 1983. Out at sea the transport area and the mine barrier the Eskadra laid; Arwad island
// off the town. Then three landing places between two low rocky points, each with a coastal gun dug into it: in the
// west the sands of Amrit (dunes behind: soft going for vehicles), in the middle the rocky shore under the corniche
// and the old town, in the east the port itself — two moles, a foreshore under the quay wall, one slipway the only
// way up for vehicles. Behind them the coast road, the citrus groves in their cypress windbreaks, Amrit and its
// Phoenician temple, the walled Crusader citadel quarter of Tortosa (the land battle there is maps/tartus.ts: the
// same dry ground), the town east of it to the port, the tank farm, and terraced limestone hills climbing inland to
// the Safita road, down which the garrison’s armour comes.
// (Compressed and turned: the real coast runs north–south with the sea to the west; here the sea is +z, the port
// in the east of the map is the real north, Amrit in the west the real south.)
// Not point-mirrored: one side lands, the other holds (modes/landing). NATO lands from its base out at sea (+z).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { arabVillage } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 620, z: 1020 }; // (the grid caches’ reach: the field and a margin)
const noise = createNoise2D(1985_61);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e6a80 }); // (the Levantine sea: clear, deep blue-green)

/** The two rocky points between the beaches, a gun on each: x, how far out to sea, half-width, height. */
const HEADS = [{ x: -175, reach: 60, w: 42, top: 14 }, { x: 160, reach: 50, w: 36, top: 16 }];
const headK = (x: number) => Math.max(Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)), Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2)));
/** The port (0..1 across x): the quay from behind the south mole to the east edge. */
const portK = (x: number) => smoothstep(212, 238, x);
const RAMP = 335; // x of the slipway up the quay wall (the port’s beach sector)
/** The waterline (z): the beaches 150 m from the middle, the points out past them, the quay straight. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 10 * (1 - portK(x))
  + HEADS[0].reach * Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)) + HEADS[1].reach * Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2));
/** The moles: the south one off the east point, the north one (the supply point’s quay) out from the east edge. */
const MOLES = [[[200, 170], [212, 300], [245, 312]], [[472, 150], [472, 322], [425, 334]]];
const ARWAD = { x: 150, z: 410, r: 36 };
/** Amrit’s dunes behind the west beach (0..1 across x). */
const duneK = (x: number) => smoothstep(-225, -255, x);

function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const polyDist = (l: number[][], x: number, z: number) => { let d = Infinity; for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1])); return d; };
const moleDist = (x: number, z: number) => (x < 185 || z < 140 || z > 345 ? Infinity : Math.min(polyDist(MOLES[0], x, z), polyDist(MOLES[1], x, z)));

/** The roads: the coast road behind the points, up from each beach, the town’s main street, across by the hills. */
function roadDist(x: number, z: number) {
  const sz = shoreZ(x);
  let d = Infinity;
  if (z < sz - 36 && z > -860) {
    d = Math.min(d, Math.abs(x - (-330 + Math.sin(z * 0.011) * 12)));                          // up from Amrit beach
    d = Math.min(d, Math.abs(x - (-20 + Math.sin(z * 0.009) * 10 * smoothstep(-300, -360, z)))); // up from the corniche through the citadel
  }
  if (z < sz - 30 && z > -600) d = Math.min(d, Math.abs(x - (RAMP + Math.sin(z * 0.01) * 14 * smoothstep(60, -40, z)))); // up the slipway past the tank farm
  d = Math.min(d, Math.abs(z - (-30 + Math.sin(x * 0.008) * 10)));                               // the coast road (the corniche)
  if (x > -130) d = Math.min(d, Math.abs(z - (-232 + Math.sin(x * 0.01) * 4)));                  // the town’s main street, through the citadel
  d = Math.min(d, Math.abs(z - (-580 + Math.sin(x * 0.006) * 22)));                              // across, under the hills
  return d;
}
const onRoad = (x: number, z: number) => roadDist(x, z) < 3.5;

/** The beach sectors and the places up behind them. */
export const SECTORS = [
  { x: -330, name: 'Amrit beach', inland: { name: 'Amrit', x: -330, z: -120 } },
  { x: -20, name: 'Tortosa corniche', inland: { name: 'Citadel of Tortosa', x: -20, z: -232 } },
  { x: RAMP, name: 'Supply point quay', inland: { name: 'Tartus tank farm', x: 365, z: -140 } },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Amrit beach', x: -330, z: shoreZ(-330) - 44, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Tortosa corniche', x: -20, z: shoreZ(-20) - 46, owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Supply point quay', x: RAMP, z: shoreZ(RAMP) - 48, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Amrit', x: -330, z: -120, owner: null, sector: 'west' },
  { id: 'F', name: 'Citadel of Tortosa', x: -20, z: -232, owner: null, sector: 'centre' },
  { id: 'G', name: 'Tartus tank farm', x: 365, z: -140, owner: null, sector: 'east' },
  { id: 'K', name: 'Safita road', x: 20, z: -640, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** The town: the citadel quarter (walled) and the town east of it to the port. */
const OLD = { x: -20, z: -232, w: 80, d: 84 };
const inOld = (x: number, z: number, m = 0) => Math.abs(x - OLD.x) < OLD.w / 2 + m && Math.abs(z - OLD.z) < OLD.d / 2 + m;
const townE = (x: number, z: number) => Math.hypot((x - 150) / 200, (z + 240) / 105);

/** The citrus groves on the plain, inside their cypress windbreaks [x, z, w, d]. */
const GROVES = [[-200, -100, 90, 60], [-430, -255, 80, 70], [-320, -330, 90, 60], [-170, -390, 100, 70], [-440, -40, 60, 50], [210, -420, 90, 60], [-130, -170, 60, 50]];
const inGrove = (x: number, z: number, pad = 0) => GROVES.some(([gx, gz, w, d]) => Math.abs(x - gx) < w / 2 + pad && Math.abs(z - gz) < d / 2 + pad);

/** The land behind the shore: the plain’s swell, the terraced limestone hills inland, the knolls (sampled once: noise). */
const KNOLLS = [[-300, -470, 80, 8], [300, -500, 80, 9], [-160, -720, 90, 10], [260, -740, 90, 12]];
function hillsExact(x: number, z: number) {
  const k = smoothstep(-420, -780, z + 40 * fbm(noise, x * 0.004, z * 0.004 + 9, 2));
  let h = k ** 1.2 * (22 + 12 * ridged(noise, x * 0.006 + 11, z * 0.009, 3));
  for (const [cx, cz, r, a] of KNOLLS) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return h;
}
const hillsH = gridCacheSmooth(hillsExact, EXT, 4);
const plainN = gridCacheSmooth((x: number, z: number) => fbm(noise, x * 0.005, z * 0.005, 3), EXT, 4);
/** Terraces: the hillside cut into 3 m steps, smooth on the roads and the points. */
function terrace(h: number) {
  const t = h / 3, f = t - Math.floor(t);
  return (Math.floor(t) + smoothstep(0.62, 1, f)) * 3;
}

function height(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, hk = headK(x);
  if (d > 0) { // the bottom: shelving off, rocks off the points and the corniche; Arwad and the moles above it
    let h = 0.5 - d * 0.02 - Math.max(0, d - 120) * 0.05 + hk * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    h = Math.max(h, -18);
    const ad = Math.hypot(x - ARWAD.x, z - ARWAD.z);
    if (ad < ARWAD.r + 140) h = Math.max(h, ad < ARWAD.r ? 2.4 + 1.6 * smoothstep(ARWAD.r, 8, ad) : 2.4 - (ad - ARWAD.r) * 0.16);
    const md = moleDist(x, z);
    if (md < 8) h = Math.max(h, 2.6 * smoothstep(8, 5, md) + h * smoothstep(5, 8, md));
    return h;
  }
  const back = -d;
  // the shore (40 m of sand, narrower and rockier under the corniche), then the plain: 3–6 m, the hills inland
  const rocky = smoothstep(120, 60, Math.abs(x + 20));
  const beach = 0.5 + Math.min(back, 40 - rocky * 14) * (0.04 + rocky * 0.04);
  const n = plainN(x, z), hh = hillsH(x, z);
  let land = 3 + smoothstep(30, 110, back) * 1.6 + n * 1.6;
  land += hh > 2 ? hh + (terrace(hh) - hh) * smoothstep(2, 6, hh) * smoothstep(6, 14, roadDist(x, z)) : hh;
  let h = Math.max(beach, Math.min(land, beach + back * 0.2));
  // Amrit’s dunes: low sandy humps behind the west beach
  const dk = duneK(x) * smoothstep(36, 50, back) * smoothstep(110, 80, back);
  if (dk > 0) h += dk * (1.2 + 1.1 * noise(x * 0.04, z * 0.06));
  // the town on its level ground
  const te = townE(x, z);
  if (te < 1.1) h += (3.6 + Math.max(0, back - 250) * 0.004 - h) * smoothstep(1.1, 0.9, te);
  // the port: a foreshore under a 3 m quay wall, one slipway up it
  const pt = portK(x);
  if (pt > 0) {
    let q = back < 30 ? 0.4 + back * 0.025 : back < 32 ? 1.15 + (back - 30) * 1.45 : 4 + Math.max(0, back - 160) * 0.004;
    q += (Math.min(q, 0.4 + back * 0.09) - q) * smoothstep(22, 14, Math.abs(x - RAMP)); // (the slipway: 1 in 11)
    h += (q - h) * pt * smoothstep(260, 200, back);
  }
  // the rocky points: limestone 14–16 m high, a cliff to the sea, falling back to the plain inland
  if (hk > 0.05) {
    const hd = x < 0 ? HEADS[0] : HEADS[1];
    const top = hd.top + fbm(noise, x * 0.03, z * 0.03, 2) * 3;
    h = h + (Math.max(h, 0.5 + top * smoothstep(4, 22, back) * smoothstep(170, 95, back)) - h) * smoothstep(0.25, 0.7, hk);
  }
  // the defence’s base: flat, at the land’s own level there
  h += (hillsH(0, -830) + 4.6 - h) * smoothstep(60, 25, Math.hypot(x, z + 830));
  return h;
}

/** Amrit’s dunes: soft sand, vehicles slow (the road over them is firm). */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const back = shoreZ(x) - z, m = duneK(x) * smoothstep(30, 45, back) * smoothstep(120, 95, back);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.15 : 0.5);
}
/** The olive groves on the terraces and the citrus groves on the plain (sight half-blocked). */
const oliveN = (x: number, z: number) => fbm(noise, x * 0.011 + 40, z * 0.011 - 9, 2);
const terraced = (x: number, z: number) => smoothstep(3, 8, hillsH(x, z));
const woodsK = (x: number, z: number) => Math.max(inGrove(x, z) ? 0.45 : 0, terraced(x, z) * smoothstep(0.05, 0.2, oliveN(x, z)) * 0.35)
  * smoothstep(5, 10, roadDist(x, z)) * (nearPoint(x, z, 30) ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);

export default {
  id: 'tartus-landing',
  name: 'Tartus Landing',
  description: 'The Syrian coast, summer 1985: the US Marines raid the Soviet Navy’s Mediterranean supply point at Tartus from the sea — the dunes of Amrit, the rocky corniche under the Crusader citadel and the port’s moles, fuel tanks and Soviet quay between two rocky points with coastal guns, Arwad island offshore, citrus groves and terraced hills behind.',
  epochs: ['1985'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Soviet Union' },
  armies: { nato: ['us'], pact: ['sov'] }, // (a US Marine Amphibious Unit of the Sixth Fleet lands; the supply point’s Soviet garrison holds)
  conditions: { time: 'dawn', weather: 'clear' },
  climate: 'desert', // (sand paint and khaki drill, as on the land battle at Tartus)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  airfields: [], // (no runway fits: the dunes, the groves, the town and the terraces)
  steep: 0.5, // (vehicles: the quay wall and the points are no way up — the slipway is)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985_61,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woodsC(x, z),

  theme: {
    // a hot, hazy summer dawn on the Levantine coast (the land battle’s colours: maps/tartus.ts)
    fogColor: 0xd6ccb8, fogDensity: 0.0007, skyTop: 0x6c92c0, skyHorizon: 0xe8d8c0, skyBottom: 0xa89c80,
    sunColor: 0xffe4c4, sunIntensity: 1.9, sunDisk: 0.6, clouds: 0.1, cloudLight: 0xf6eee2, cloudDark: 0xc8bca8,
    sunDir: [-0.35, 0.4, -0.8], hemiSky: 0xd6dce4, hemiGround: 0x96845e, hemiIntensity: 1.2, rimColor: 0xf0e2c4, rimIntensity: 0.3,
    terrain: {
      grass: '#a09062', grassAlt: '#928658', dryGrass: '#bea874', dirt: '#986a4a', rock: '#c2b8a2',
      pasture: '#9c8e5e', ploughed: '#8e6446', stubble: '#c0aa76', meadow: '#98905c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const back = shoreZ(x) - z;
        if (back < -3) {
          if (moleDist(x, z) < 8 && y > 0.5) return [0x9a968c, 1];                                  // the moles’ concrete
          if (Math.hypot(x - ARWAD.x, z - ARWAD.z) < ARWAD.r + 4 && y > 0.2) return [0xc8bca0, 0.9]; // Arwad’s rock
          return y > -1.5 ? [0xd8c8a0, 0.9] : null;                                                  // the sand under the shallows
        }
        if (roadDist(x, z) < (townE(x, z) < 1 ? 5 : 3.5) && back > 30) return [0x6a6864, 0.9];      // asphalt
        if (headK(x) > 0.3 && y > 3 && back < 120) return [0xc2b8a2, 0.85];                         // the points’ limestone
        const pt = portK(x);
        if (pt > 0.5 && back < 31) return [0x9c9278, 1];                                             // the foreshore: gravel
        if (pt > 0.5 && back < 200) return [0x8e8a80, 0.9];                                          // the quays’ concrete
        const rocky = smoothstep(120, 60, Math.abs(x + 20));
        if (back < 40 - rocky * 14) return rocky > 0.5 && noise(x * 0.08, z * 0.08) > -0.1 ? [0xb0a68e, 1] : [0xdccca2, 1]; // sand; the corniche’s rock shelf
        if (inOld(x, z)) return [0xb8ac90, 0.75];                                                    // the citadel’s stone lanes
        if (townE(x, z) < 0.95) return [0xa89c84, 0.6];                                              // the town’s dust and pavements
        if (duneK(x) > 0.5 && back < 115) return [0xd4c49a, 0.9];                                    // Amrit’s dunes
        if (inGrove(x, z, 2)) return [0x7a5236, 0.7];                                                // terra rossa, irrigated
        const hh = hillsH(x, z);
        if (hh > 3) {
          const f = hh / 3 - Math.floor(hh / 3);
          if (f > 0.66 && f < 0.98) return [0xc8bea8, 0.55];                                         // the terraces’ limestone risers
          return [0x8a6446, 0.45];                                                                   // their red earth
        }
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.22 ? [0x80784c, Math.min(0.4, (scrub - 0.22) * 2)] : null;                   // thorn scrub
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -830, entries: [-330, -20, RAMP] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what comes in (systems/Landing.js): the Marines’ squads by LCVP or LCU, the vehicles by LCU (data/units/baltic85.js)
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: a Perry frigate or a Spruance inshore, the battleship New Jersey offshore (as off Beirut, 1983)
    navy: ['frigate', 'destroyer', 'battleship'],
    // the Eskadra’s mine barrier off the port, a lane left off each beach
    seaMines: { z: [520, 580], count: 60, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_61 },
    // the coastal artillery: a gun dug into each rocky point, laid on the beaches; the Rubezh launchers inland that fire on the ships
    forts: [
      { unit: 'artillery', x: HEADS[0].x, z: shoreZ(HEADS[0].x) - 62, facing: 0, name: 'Ras al-Shaq battery' },
      { unit: 'artillery', x: HEADS[1].x, z: shoreZ(HEADS[1].x) - 60, facing: 0, name: 'Port battery' },
      { unit: 'coastMissile', x: -170, z: -470, facing: 0 }, { unit: 'coastMissile', x: 200, z: -520, facing: 0 },
    ],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests over it; tank traps on the slipway
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -480 + i * 11; return headK(x) > 0.3 || Math.abs(x - RAMP) < 18 ? null : { kind: 'wire', x, z: shoreZ(x) - (portK(x) > 0.5 ? 26 : 30), yaw: 0 }; }).filter((w) => !!w),
      ...[RAMP - 12, RAMP - 4, RAMP + 4, RAMP + 12].map((x) => ({ kind: 'tankTraps', x, z: shoreZ(x) - 24, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 64 }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - 54, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - 48, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 38 }))),
    ],
    // the defence at dawn: the supply point’s naval infantry company over each beach, the garrison’s motor riflemen in the town, anti-tank guns behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Naval infantry section', coastMissile: 'Rubezh battery' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56) }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    // the counter-attack: the garrison’s armoured battalion down the Safita road
    counter: { t: 300, units: ['heavyTank', 'ifv', 'tank', 'ifv', 'heavyTank'], say: 'The garrison’s armour is coming down the Safita road: T-72s and BMPs, straight for the beachhead', sayOther: 'Enemy armour coming down the Safita road: T-72s and BMPs' },
    // the landing’s AI (ai/LandingDirector.js): its buying order, a frigate inshore off the focus beach
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'reconVehicle', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 380 },
    economy: { reserves: 3000, perSector: 700, beachIncome: 1.0, defenceCp: 800, defenceIncome: 1.3 }, // (AI against AI, 2026-11-22: at 600/0.8/1.5 and 22 stacks the landing stalled on the beaches; now it wins at 25 and 27 min or falls one village short)
    // the Marines’ AAVs and the scout vehicles swim in on their own, put in off the beach
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon' },
    // the first wave at dawn, in to all three beaches at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'reconVehicle', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_61);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const placed: number[][] = [];
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 6 + rr && !nearPoint(x, z, 16 + rr) && headK(x) < 0.3 && z < shoreZ(x) - 40 - rr && Math.hypot(x, z + 830) > 45
      && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + rr);
    const put = (x: number, z: number, rr: number) => placed.push([x, z, rr]);

    // ---- the citadel of Tortosa: its wall and corner towers round the old quarter (gates on the roads), the Templar keep, its chapel
    const wallSeg = (x0: number, z0: number, x1: number, z1: number) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 8), yaw = Math.atan2(-(z1 - z0), x1 - x0);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        if (roadDist(x, z) < 7) continue;
        props.lowWall({ x, z, yaw, length: L / n + 0.2, height: 4.2, color: 0xb0a286 });
      }
    };
    const ox = [OLD.x - OLD.w / 2, OLD.x + OLD.w / 2], oz = [OLD.z - OLD.d / 2, OLD.z + OLD.d / 2];
    wallSeg(ox[0], oz[0], ox[1], oz[0]); wallSeg(ox[1], oz[0], ox[1], oz[1]); wallSeg(ox[1], oz[1], ox[0], oz[1]); wallSeg(ox[0], oz[1], ox[0], oz[0]);
    for (const x of ox) for (const z of oz) props.box('stone', x, g(x, z) + 3, z, 6, 7.5, 6, 0, 0xa89a7e);
    props.hall({ x: OLD.x - 22, z: OLD.z + 24, yaw: 0, width: 16, depth: 14, height: 12, color: 0xa89a7e, roof: 0x9a8e74, door: 3, name: 'Templar keep' });
    props.hall({ x: OLD.x + 22, z: OLD.z - 24, yaw: Math.PI / 2, width: 16, depth: 9, height: 7, color: 0xb0a286, roof: 0x9a8e74, door: 3, name: 'Templar chapel' });
    put(OLD.x - 22, OLD.z + 24, 12); put(OLD.x + 22, OLD.z - 24, 10);
    for (let gx = ox[0] + 8; gx < ox[1] - 6; gx += 11) for (let gz = oz[0] + 8; gz < oz[1] - 6; gz += 10) {
      const x = gx + (r() - 0.5) * 2, z = gz + (r() - 0.5) * 2;
      if (!free(x, z, 3) || r() < 0.25) continue;
      put(x, z, 4.5);
      props.flatHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 7 + r() * 2, depth: 6 + r() * 2, storeys: 1 + Math.floor(r() * 2) });
    }
    // ---- the cathedral of Our Lady of Tortosa at the town’s edge, the town east to the port: flat-roofed houses, the new blocks
    props.hall({ x: 70, z: -300, yaw: 0, width: 18, depth: 34, height: 13, color: 0xd2c6a8, roof: 0xc0b498, door: 5, name: 'cathedral of Our Lady of Tortosa' });
    for (const s of [-1, 1]) props.box('stone', 70 + s * 10, g(70 + s * 10, -284) + 8, -284, 4, 16, 4, 0, 0xa89a7e);
    put(70, -300, 20);
    props.flatHouse({ x: 140, z: -205, yaw: 0, width: 11, depth: 10, name: 'mosque', dome: true }); put(140, -205, 9);
    for (let gx = -50; gx <= 350; gx += 15) for (let gz = -345; gz <= -135; gz += 14) {
      const x = gx + (r() - 0.5) * 4, z = gz + (r() - 0.5) * 4;
      if (townE(x, z) > 0.95 || inOld(x, z, 8) || r() < 0.2) continue;
      if (x > 120 && r() < 0.3) {
        if (!free(x, z, 13)) continue;
        put(x, z, 13);
        props.ruinBlock({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 24, depth: 11, storeys: 4 + Math.floor(r() * 2), ruin: 0, name: 'apartment block' });
      } else {
        if (!free(x, z, 5)) continue;
        put(x, z, 5);
        props.flatHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 7 + r() * 3, depth: 7 + r() * 2, storeys: 1 + Math.floor(r() * 3), name: r() < 0.3 ? 'shop house' : 'house' });
      }
    }

    // ---- the port: portal cranes along the quay, the supply point’s stores, the tank farm in its bund
    const crane = (x: number, z: number) => {
      const y = g(x, z), c = 0xb87a2a;
      for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) props.box('metal', x + lx, y + 4, z + lz, 0.6, 8, 0.6, 0, c);
      props.box('metal', x, y + 8.4, z, 7.4, 0.8, 7.4, 0, c);
      props.box('metal', x, y + 12.8, z, 2.2, 8, 2.2, 0, c);
      props.box('metal', x, y + 17.8, z - 0.5, 4, 3, 5.5, 0, 0x8a5a2a);
      props.box('metal', x, y + 19.5 + 9 * Math.sin(0.35), z + 9.5, 0.9, 0.9, 20, 0, c, -0.35);
      cover.addCylinder({ x, z, radius: 1.4, height: 12 });
    };
    for (const x of [262, 292, 380, 412, 450]) crane(x, shoreZ(x) - 38);
    for (const [x, w, name] of [[275, 34, 'stores shed'], [420, 40, 'stores shed'], [470, 22, 'workshop']] as [number, number, string][]) { props.hall({ x, z: shoreZ(x) - 92, yaw: 0, width: w, depth: 16, height: 8, color: 0x9a948a, roof: 0x6a6c6e, door: 8, name }); put(x, shoreZ(x) - 92, w / 2 + 2); }
    for (let k = 0; k < 6; k++) props.crates({ x: 395 + (k % 3) * 6, z: shoreZ(400) - 58 + Math.floor(k / 3) * 6, yaw: k * 0.4 });
    for (const [x, z] of [[270, -150], [450, -150]]) { props.tanks({ x, z, yaw: Math.PI / 2, count: 3, radius: 7, height: 10, color: 0xd4d2c8 }); put(x, z, 30); }
    for (const cx of [270, 450]) for (const [dx, dz, yaw, len] of [[-16, 0, Math.PI / 2, 60], [16, 0, Math.PI / 2, 60], [0, -30, 0, 32], [0, 30, 0, 32]] as number[][]) props.lowWall({ x: cx + dx, z: -150 + dz, yaw, length: len, height: 1.6, color: 0xb0a690 });
    // the Soviet support ships alongside the north mole: an oiler (a Boris Chilikin, shortened) and a floating workshop
    for (const [z, len, deck] of [[225, 70, 0x4a5258], [292, 44, 0x5a6268]] as number[][]) {
      const x = 458;
      props.box('metal', x, 1.2, z, 11, 5, len, 0, deck);
      props.box('metal', x, 5.5, z - len / 2 + 6, 9, 4, 9, 0, 0xd8d8d0);
      props.box('metal', x, 9, z - len / 2 + 5, 3, 4, 3, 0, 0x2a2a2a);
      for (const k of [0, len / 4]) props.box('metal', x, 6, z + k, 1, 6, 1, 0, 0x6a6a6a);
    }
    for (const m of MOLES) for (let i = 0; i < m.length - 1; i++) {             // the moles’ breakwater blocks, seaward side
      const [x0, z0] = m[i], [x1, z1] = m[i + 1], L = Math.hypot(x1 - x0, z1 - z0);
      for (let t = 4; t < L; t += 9) props.boulder({ x: x0 + (x1 - x0) * t / L + (r() - 0.5) * 4, z: z0 + (z1 - z0) * t / L + (r() - 0.5) * 4, radius: 1.3 + r() });
    }
    // ---- the gun positions on the points: sandbags round them, a lighthouse on the port’s
    for (const h of HEADS) for (const s of [-1, 1]) props.sandbagRing({ x: h.x + s * 16, z: shoreZ(h.x) - 56, radius: 4.5, toward: 1 });
    { const x = HEADS[1].x + 14, z = shoreZ(HEADS[1].x) - 28, y = g(x, z); props.box('stone', x, y + 7, z, 3, 14, 3, 0, 0xe8e4dc); props.box('plain', x, y + 15, z, 3.6, 2, 3.6, 0, 0x2a2a2a); }
    // ---- Amrit: the Phoenician temple in its rock-cut pool, its columns, the village by the Nahr Amrit
    props.box('stone', -385, g(-385, -150) + 2.5, -150, 6, 5, 6, 0.1, 0xc4b896);
    for (let a = 0; a < 10; a++) if (r() < 0.75) props.column({ x: -385 + Math.cos(a * 0.63) * 16, z: -150 + Math.sin(a * 0.63) * 12, radius: 0.6, height: 2 + r() * 2 });
    put(-385, -150, 20);
    arabVillage(props, -300, -95, 9, 1985_62, (x, z) => !free(x, z, 4) || inGrove(x, z, 4));
    props.rand = r;
    arabVillage(props, 20, -560, 7, 1985_63, (x, z) => !free(x, z, 4), false);
    props.rand = r;
    // ---- the groves’ cypress-hedged edges and a pump house in each
    for (const [gx, gz, w, d] of GROVES) {
      for (const [lx, lz, len, alongX] of [[0, d / 2, w, 1], [0, -d / 2, w, 1], [w / 2, 0, d, 0], [-w / 2, 0, d, 0]] as number[][]) {
        for (let t = -len / 2 + 6; t < len / 2 - 4; t += 12) {
          if (Math.abs(t) < 5) continue;
          const x = gx + lx + (alongX ? t : 0), z = gz + lz + (alongX ? 0 : t);
          if (roadDist(x, z) > 7 && !nearPoint(x, z, 20)) props.lowWall({ x, z, yaw: alongX ? 0 : Math.PI / 2, length: 10, height: 1.5, color: 0x9a8e70 });
        }
      }
      const px = gx + w / 4, pz = gz - d / 4;
      if (free(px, pz, 4)) { put(px, pz, 4); props.flatHouse({ x: px, z: pz, yaw: 0, width: 5, depth: 4, name: 'pump house' }); }
    }
    // ---- farmsteads on the plain and the terraces
    for (let tries = 0, n = 0; n < 40 && tries < 3000; tries++) {
      const x = (r() * 2 - 1) * 470, z = -60 - r() * 720;
      if (townE(x, z) < 1.15 || inGrove(x, z, 6) || !free(x, z, 10)) continue;
      put(x, z, 10); n++;
      const yaw = Math.round(r() * 2) * Math.PI / 2;
      props.flatHouse({ x, z, yaw, width: 8 + r() * 3, depth: 6 + r() * 2, storeys: r() < 0.3 ? 2 : 1 });
      props.lowWall({ x: x + 7, z: z + 6, yaw, length: 10, height: 1.6, color: 0xb8a07a });
    }
    // palms along the corniche
    for (let x = -460; x < 220; x += 17) {
      const z = -30 + Math.sin(x * 0.008) * 10 + 9;
      if (free(x, z, 1) && headK(x) < 0.3) props.palm({ x, z, height: 8 + r() * 4 });
    }
    // Arwad, offshore: its houses and the old fort
    for (let i = 0; i < 18; i++) {
      const a = r() * Math.PI * 2, d = r() * (ARWAD.r - 12);
      props.flatHouse({ x: ARWAD.x + Math.cos(a) * d, z: ARWAD.z + Math.sin(a) * d, yaw: Math.round(a * 2 / Math.PI) * Math.PI / 2, width: 7, depth: 6, storeys: 1 + Math.floor(r() * 2) });
    }
    props.hall({ x: ARWAD.x - 6, z: ARWAD.z - 14, yaw: 0, width: 14, depth: 12, height: 8, color: 0xb0a286, roof: 0x9a8e74, door: 3, name: 'Arwad castle' });
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [{ x: 0, z: -830, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || townE(x, z) < 1.0 || inOld(x, z, 4) || z > shoreZ(x) - 40 || (portK(x) > 0.3 && z > shoreZ(x) - 210) || (duneK(x) > 0.3 && z > shoreZ(x) - 115) }];
    const oranges = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1700, broadleaf: 1, autumn: 0, size: 0.5, maxY: 80,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3) }], forest: (x: number, z: number) => (inGrove(x, z) ? 1 : -1) });
    const olives = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 2400, broadleaf: 1, autumn: 0.08, size: 0.6, maxY: 90,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 4) }],
      forest: (x: number, z: number) => (terraced(x, z) > 0.3 && oliveN(x, z) > 0.12 ? 0.75 : 0.012) });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 400, broadleaf: 0.3, autumn: 0, size: 0.85, maxY: 140,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 4) }],
      forest: (x: number, z: number) => (hillsH(x, z) > 18 || headK(x) > 0.5 ? 0.3 : 0.01) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.6,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => z > shoreZ(x) - 36 || townE(x, z) < 0.95 || (portK(x) > 0.3 && z > shoreZ(x) - 200) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); oranges.update(dt, t); olives.update(dt, t); pines.update(dt, t); },
    };
  },
} satisfies MapDef;
