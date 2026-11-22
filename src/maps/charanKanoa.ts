// Charan Kanoa, Saipan, 15 June 1944 (1945 only; coastal landing, the Pacific: the 2nd and 4th Marine Divisions
// against the Imperial Japanese Army's 43rd Division and the 9th Tank Regiment; 1.0 × 1.8 km). Saipan's west coast
// seen from the sea (+z): north is to the left (-x). Out at sea the transport area and the old battleships' water;
// then the barrier reef, a coral crest awash a hundred and fifty metres out, and the shallow lagoon inside it. The
// Higgins boats and the LCTs ground on the reef's outer edge and drop their ramps there: the Marines wade the lagoon
// waist-deep and the tanks crawl across it, and every Japanese gun and mortar on the island had registered the reef
// and the lagoon with marker flags long before (forts, defence: mortars, field guns and observers on the high ground).
// Only off Charan Kanoa's pier does a boat channel cut the reef. The four beaches, north to south: Red and Green
// (the 2nd Marine Division) north of Afetna Point, the coral knuckle with its anti-tank guns that enfiladed both
// divisions' beaches; Blue and Yellow (the 4th) in front of Charan Kanoa, the sugar company's town — the mill and its
// chimney, the pier, a grid of houses — and Agingan Point at the south end. Behind: the narrow-gauge cane railway
// along the coast and out to the fields, cane everywhere, Lake Susupe and its swamp behind Green Beach, the ground
// rising east to the Fina Sisu ridge and on toward Mount Tapochau (the Japanese base, -z), Aslito airfield off to
// the south-east. The night of 16–17 June the 9th Tank Regiment's Chi-Has and Ha-Gos and the 136th Infantry came
// down from the ridge at the beachhead — the biggest Japanese tank attack of the Pacific war, broken by bazookas,
// half-tracks and the battleships' star shells (landing.counter).
// How it plays: the run in is quick, the reef is not — craft unload on its edge, a hundred-odd metres short of the
// sand, and the men wade under registered fire; the channel off the pier lets a lucky boat run up to the beach.
// Afetna Point and the town are the strongpoints; the counter-attack comes down the roads from the ridge.
// Not point-mirrored: one side lands, the other holds (modes/landing).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1944_0615);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f6a86 }); // (the Philippine Sea off the reef: deep blue)

/** Afetna Point, between Green and Blue: x, how far it reaches out, half-width. Agingan Point at the south end. */
const AFETNA = { x: -20, reach: 42, w: 34 };
const AGINGAN = { x: 520, reach: 60, w: 50 };
const pointK = (x: number) => Math.max(Math.exp(-(((x - AFETNA.x) / AFETNA.w) ** 2)), Math.exp(-(((x - AGINGAN.x) / AGINGAN.w) ** 2)));
/** z of the waterline. */
export const shoreZ = (x: number) => 130 + fbm(noise, x * 0.005, 1.9, 2) * 9
  + AFETNA.reach * Math.exp(-(((x - AFETNA.x) / AFETNA.w) ** 2)) + AGINGAN.reach * Math.exp(-(((x - AGINGAN.x) / AGINGAN.w) ** 2));
/** m inland from the waterline (< 0 at sea). */
const inland = (x: number, z: number) => shoreZ(x) - z;
const LAGOON = 140;                   // m from the sand to the reef crest
const reefZ = (x: number) => shoreZ(x) + LAGOON + fbm(noise, x * 0.01, 5.3, 2) * 10 - pointK(x) * 30; // (the reef closer in off the points)
const CHANNEL = 230;                  // x of the boat channel through the reef, off the pier
const channel = (x: number) => Math.abs(x - CHANNEL) - 13; // < 0 in it

/** The beaches, north to south: Red and Green (2nd Marine Division), Blue and Yellow (4th). */
export const BEACHES = [
  { id: 'Red', x: -360 },
  { id: 'Green', x: -160 },
  { id: 'Blue', x: 110 },
  { id: 'Yellow', x: 340 },
];
const TOWN = { x: 175, z: -40 };     // Charan Kanoa
const MILL = { x: 215, z: -95 };      // the sugar mill
const SUSUPE = { x: -230, z: -230, rx: 75, rz: 50 }; // the lake (its swamp round it)
const ASLITO = { x: 380, z: -560, len: 380, yaw: -0.18, h: 18 };
const HILL500 = { x: 20, z: -440, r: 60, h: 14 };
const FINA = { x: -60, z: -760 };    // the Fina Sisu ridge, the Japanese base on it

const lakeR = (x: number, z: number) => Math.hypot((x - SUSUPE.x) / SUSUPE.rx, (z - SUSUPE.z) / SUSUPE.rz) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.15;
/** 1 in the swamp round Lake Susupe (and the lake). */
const swamp = (x: number, z: number) => smoothstep(1.9, 1.3, lakeR(x, z));

/** The roads: the coast road behind the beaches, up from the town to Aslito, up to the ridge from Red, Green and the town. */
const ROADS: [number, number][][] = [
  [[-520, 80], [-360, 82], [-160, 86], [-60, 90], [60, 92], [TOWN.x, 90], [340, 92], [520, 110]], // the coast road
  [[TOWN.x, 90], [TOWN.x, -40], [MILL.x, -95], [300, -300], [ASLITO.x - 40, ASLITO.z + 50]],       // Charan Kanoa – Aslito
  [[-360, 82], [-390, -200], [-300, -480], [-140, -680], [FINA.x, FINA.z]],                        // up from Red, north of the lake
  [[-60, 90], [-90, -110], [-60, -330], [-60, -560], [FINA.x, FINA.z]],                            // past Afetna, east of the lake
  [[TOWN.x, -40], [90, -280], [-60, -330]],                                                         // from the town to the lake road
  [[300, -300], [160, -520], [-60, -560]],                                                          // Aslito road – ridge
];
const segD = (x: number, z: number, [ax, az]: number[], [bx, bz]: number[]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const roadD = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) for (let i = 1; i < r.length; i++) d = Math.min(d, segD(x, z, r[i - 1], r[i])); return d; };
/** The narrow-gauge cane railway: from the mill north along the coast behind the beaches, and east out to the fields. */
const RAILS: [number, number][][] = [
  [[MILL.x, -95], [120, 60], [0, 66], [-160, 62], [-360, 58], [-520, 54]],
  [[MILL.x, -95], [300, -180], [440, -330]],
];
const railD = (x: number, z: number) => { let d = Infinity; for (const r of RAILS) for (let i = 1; i < r.length; i++) d = Math.min(d, segD(x, z, r[i - 1], r[i])); return d; };
const roadC = gridCache(roadD, BOUNDS);
const railC = gridCache(railD, BOUNDS);
const onRoad = (x: number, z: number) => inland(x, z) > 30 && roadC(x, z) < 3.5;

/** Along Aslito's runway (0 on it, growing off it). */
function onRunway(x: number, z: number) {
  const a = ASLITO, fx = Math.cos(a.yaw), fz = Math.sin(a.yaw), dx = x - a.x, dz = z - a.z;
  return Math.max(Math.abs(dx * fx + dz * fz) - a.len / 2, Math.abs(-dx * fz + dz * fx) - 24, 0);
}
const inTown = (x: number, z: number) => Math.hypot((x - TOWN.x) / 125, (z - TOWN.z) / 95) < 1 && inland(x, z) > 40;

function rawHeight(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the lagoon, the reef crest awash, the reef's face dropping to the deep
    const off = -d, rz = reefZ(x) - shoreZ(x);
    let h: number;
    if (off < rz) h = -0.42 + fbm(noise, x * 0.04, z * 0.04, 2) * 0.05 + 0.6 * smoothstep(10, 0, off); // (waist-deep: men and tanks wade it)
    else if (off < rz + 16) h = -0.28 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.06;                     // the crest: the craft ground on its edge
    else h = Math.max(-18, -0.28 - (off - rz - 16) * 0.4);
    const c = channel(x); // the boat channel off the pier: a craft in it runs up to the sand
    if (c < 6 && off > 6) h = Math.min(h, h + (-1.9 - h) * smoothstep(6, 0, c));
    return h;
  }
  // the sand (20 m), then the coastal flat rising gently east, the ridge behind it climbing toward Tapochau (-x)
  const beach = 0.18 + 1.8 * smoothstep(0, 20, d);
  let h = 2 + smoothstep(20, 80, d) * 0.6 + d * 0.004 + fbm(noise, x * 0.004, z * 0.004, 3) * 1.4 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.3;
  h += smoothstep(-380, -720, z) * (18 + Math.max(0, -x) * 0.02 + fbm(noise, x * 0.008 + 4, z * 0.008, 3) * 6); // the Fina Sisu ridge
  h += HILL500.h * Math.exp(-((Math.hypot(x - HILL500.x, z - HILL500.z) / HILL500.r) ** 2));
  h = Math.min(h, beach + d * 0.25);
  // the points: low coral knuckles, a 3 m step up from the sand
  const pk = pointK(x);
  if (pk > 0.2) h = Math.max(h, 0.3 + 3.5 * smoothstep(0.2, 0.7, pk) * smoothstep(3, 14, d));
  // Lake Susupe: open water in the middle, swamp round it barely above the sea
  const lr = lakeR(x, z);
  if (lr < 1.9) h += (lr < 1 ? -2.2 + lr * 2.0 : 0.45) * smoothstep(1.9, 1.2, lr) - h * smoothstep(1.9, 1.2, lr);
  // the town and the airfield: graded flat
  h += (2.6 - h) * smoothstep(1.05, 0.85, Math.hypot((x - TOWN.x) / 125, (z - TOWN.z) / 95)) * (d > 30 ? 1 : 0);
  const off = onRunway(x, z);
  if (off < 50) h += (ASLITO.h - h) * smoothstep(50, 0, off);
  // the base on the ridge: flat
  h += (24 - h) * smoothstep(60, 25, Math.hypot(x - FINA.x, z - (FINA.z - 70)));
  return h;
}
const height = gridCacheSmooth(rawHeight, { x: BOUNDS.x + 4, z: BOUNDS.z + 4 }, 2);

/** The lagoon (wading), the swamp and the sand: men and vehicles slow. */
const softRaw = (x: number, z: number, foot: boolean) => {
  const d = inland(x, z);
  if (d < 0) return foot ? 0.55 : 0.5;
  if (d < 20) return foot ? 0.85 : 0.65;
  if (roadC(x, z) < 5) return 1;
  const m = swamp(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.4 : 0.65);
};
const softFoot = gridCache((x: number, z: number) => softRaw(x, z, true), BOUNDS);
const softVeh = gridCache((x: number, z: number) => softRaw(x, z, false), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => (foot ? softFoot(x, z) : softVeh(x, z));

/** The cane: plots on a skewed grid over the flat, each its own crop (most of it cane). */
const plot = (x: number, z: number) => {
  const u = x * 0.96 + z * 0.28, v = z * 0.96 - x * 0.28, j = Math.floor(v / 42), i = Math.floor(u / 64 + j * 0.41), h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const caneRaw = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 70 || inTown(x, z) || swamp(x, z) > 0.2 || onRunway(x, z) < 40 || roadD(x, z) < 6 || railD(x, z) < 4) return 0;
  return plot(x, z) < 0.62 ? 1 : 0;
};
const cane = gridCache(caneRaw, BOUNDS);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 760, owner: 'nato', sector: 'centre', radius: 90 },
  // the beaches (Landing: open from the start; `opens` what lies behind each once taken)
  { id: 'B', name: 'Red Beach', x: BEACHES[0].x, z: shoreZ(BEACHES[0].x) - 24, owner: null, sector: 'west', radius: 40, opens: 'E' },
  { id: 'C', name: 'Green Beach', x: BEACHES[1].x, z: shoreZ(BEACHES[1].x) - 24, owner: null, sector: 'centre', radius: 40, opens: 'F' },
  { id: 'D', name: 'Blue Beach', x: BEACHES[2].x, z: shoreZ(BEACHES[2].x) - 24, owner: null, sector: 'centre', radius: 40, opens: 'G' },
  { id: 'H', name: 'Yellow Beach', x: BEACHES[3].x, z: shoreZ(BEACHES[3].x) - 24, owner: null, sector: 'east', radius: 40, opens: 'I' },
  { id: 'E', name: 'Lake Susupe', x: -330, z: -250, owner: null, sector: 'west' },
  { id: 'F', name: 'Afetna Point', x: AFETNA.x, z: shoreZ(AFETNA.x) - 30, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Charan Kanoa', x: TOWN.x, z: TOWN.z, owner: null, sector: 'centre' },
  { id: 'I', name: 'Aslito road', x: 300, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Fina Sisu', x: FINA.x, z: FINA.z, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

/** The forts: Afetna Point's guns, the pillboxes at the ends of the beaches and by the pier, the guns on the ridge. */
const FORTS = [
  { unit: 'wn', x: AFETNA.x, z: shoreZ(AFETNA.x) - 16, facing: 0, name: 'Afetna Point' },
  { unit: 'wn', x: -470, z: shoreZ(-470) - 40, facing: 0 },
  { unit: 'wn', x: 255, z: shoreZ(255) - 42, facing: 0 },
  { unit: 'wn', x: 460, z: shoreZ(460) - 34, facing: 0, name: 'Agingan Point' },
  { unit: 'battery', x: -250, z: -560, facing: 0, name: 'Guns on the ridge' },
  { unit: 'battery', x: 170, z: -600, facing: 0, name: 'Guns above Aslito' },
];
const nearFort = (x: number, z: number, d: number) => FORTS.some((f) => Math.hypot(f.x - x, f.z - z) < d);

/** Two days of naval bombardment: thick on the beaches' back and round the town and the airfield. */
function craters() {
  const r = mulberry32(1944_0613), out: number[][] = [];
  for (let i = 0; i < 900; i++) {
    const x = (r() * 2 - 1) * 490, z = (r() * 2 - 1) * 880, d = inland(x, z);
    if (d < 24 || swamp(x, z) > 0.3 || nearPoint(x, z, 20)) continue;
    const near = Math.max(smoothstep(160, 40, d), smoothstep(160, 40, onRunway(x, z)), inTown(x, z) ? 0.6 : 0);
    if (r() > 0.12 + near * 0.6) continue;
    const big = r();
    out.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, 3 + big * 5, 0.4 + big * big * 1.3]);
  }
  return out;
}

export default {
  id: 'charan-kanoa',
  name: 'Charan Kanoa',
  description: '15 June 1944: the 2nd and 4th Marine Divisions land on Saipan’s west coast — over the barrier reef and across the lagoon onto Red, Green, Blue and Yellow beaches, under Afetna Point and the sugar mill of Charan Kanoa, with Lake Susupe’s swamp and the cane behind.',
  epochs: ['1945'],
  theatre: 'coastal',
  region: 'pacific',
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific's armies)
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['usmc', 'us'], pact: ['jp'] },     // (the 2nd and 4th Marine Divisions; the Army's 27th came in behind them)
  airfields: [],                                       // (Aslito lies off the south-east corner: the aircraft come off the carriers, from the map edge)
  airLimit: { pact: 0 },                               // (the Japanese carriers' strikes went for the fleet four days later: the Philippine Sea)
  conditions: { time: 'day', weather: 'clear' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.55,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1944,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => cane(x, z) * 0.35,  // (the cane: cover to hide in, none to stop a bullet)

  theme: {
    // a Marianas June morning: high sun, a bright haze, the smoke of the bombardment drifting off the cane
    fogColor: 0xbcc4bc, fogDensity: 0.0006,
    skyTop: 0x4f80b0, skyHorizon: 0xc8d4d4, skyBottom: 0x8c9a94,
    sunColor: 0xfff2dc, sunIntensity: 2.0, sunDisk: 0.3,
    clouds: 0.45, cloudLight: 0xf2f2ee, cloudDark: 0x92a0a6,
    sunDir: [0.4, 0.75, 0.5],
    hemiSky: 0xc8d4dc, hemiGround: 0x46502e, hemiIntensity: 1.25,
    rimColor: 0xd8dcdc, rimIntensity: 0.22,
    terrain: {
      grass: '#58702e', grassAlt: '#4e662a', dryGrass: '#8a8a4c', dirt: '#7a6040', rock: '#8c8a6c',
      pasture: '#5e7434', ploughed: '#6a5034', stubble: '#8a8648', meadow: '#5c7630',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) {
          if (channel(x) < 0 && -d > 6) return [0x6a8a8a, 1];                                   // the channel: dark sand
          return [-d > reefZ(x) - shoreZ(x) && -d < reefZ(x) - shoreZ(x) + 18 ? 0xb8b49a : y > -0.6 ? 0xd8d0b0 : 0x9a9a84, 1]; // the coral crest, the lagoon's white sand
        }
        if (d < 20) return [0xe0d6b4, 1];                                                       // the coral sand
        if (pointK(x) > 0.4 && d < 60) return [0xb4ae98, 0.8];                                  // the points' coral rock
        if (onRoad(x, z)) return [0xc4b894, 0.9];                                               // white coral roads
        if (railC(x, z) < 2.2) return [0x5a4c3c, 0.85];                                         // the railway's ballast
        if (inTown(x, z)) return [0x9a907c, 0.55];                                              // the town's yards and lanes
        if (onRunway(x, z) < 0.5) return [0xb8b29e, 0.95];                                      // Aslito's coral runway
        const m = swamp(x, z);
        if (m > 0.3) return [0x4a5236, 0.8 * m];                                                // the swamp: reeds and black water
        if (cane(x, z) > 0.5) return [Math.sin((x * 0.6 + z * 0.8) * 0.9) > 0 ? 0x6a8a34 : 0x5c7a2e, 0.75]; // the cane in its rows
        if (plot(x, z) > 0.85) return [0x6a5034, 0.6];                                          // a field ploughed for planting
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: BEACHES.map((b) => b.x) }, // (the side that lands: its roads are the four beaches)
           pact: { x: FINA.x, z: FINA.z - 70, entries: [-300, -60, 160] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -250 } },
  points,

  battlefield() { return { blasts: craters(), ruins: [], works: [] }; },

  landing: {
    // what comes in (systems/Landing.js): a squad in a Higgins boat, a vehicle in an LCT — onto the reef's edge
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    // what the landing may call in at sea: the destroyers inshore, the LSM(R)s' rockets, the old battleships offshore
    navy: ['destroyer', 'lsmr', 'oldBattleship'],
    // the 43rd Division's forts (data/units45/atlanticWall.js, the Japanese variants)
    forts: FORTS,
    // trenches and MG nests along the coast road, wire at the top of the sand, mines at the beach exits; tank traps on the town's streets
    works: [
      ...Array.from({ length: 84 }, (_, i) => { const x = -480 + i * 11.5; return pointK(x) > 0.4 || Math.abs(x - CHANNEL) < 20 ? null : { kind: 'wire', x, z: shoreZ(x) - 22, yaw: 0 }; }).filter(Boolean),
      ...BEACHES.flatMap((b) => [-40, 0, 40].map((dx) => ({ kind: 'trench', x: b.x + dx, z: shoreZ(b.x + dx) - 58, yaw: 0 }))),
      ...BEACHES.flatMap((b) => [-24, 24].map((dx) => ({ kind: 'mgNest', x: b.x + dx, z: shoreZ(b.x + dx) - 52, yaw: 0 }))),
      ...BEACHES.flatMap((b) => [-34, 34].map((dx) => ({ kind: 'mines', x: b.x + dx, z: shoreZ(b.x + dx) - 36 }))),
      ...[TOWN.x - 20, TOWN.x + 20].map((x) => ({ kind: 'tankTraps', x, z: TOWN.z + 70, yaw: 0 })),
    ],
    obstacles: [],
    // the defence at H-hour: in the trenches over each beach, on Afetna Point, in the town, by the lake; the mortars and
    // field guns back on the high ground, every one registered on the reef and the lagoon
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'atTeam', 'rifles', 'mortar', 'observers', 'artillery', 'mortar', 'artillery'],
    names: { rifles: '136th Regiment squad' },
    hold: [
      ...BEACHES.map((b) => ({ x: b.x - 30, z: shoreZ(b.x - 30) - 60 })),
      ...BEACHES.map((b) => ({ x: b.x + 30, z: shoreZ(b.x + 30) - 60 })),
      { x: AFETNA.x, z: shoreZ(AFETNA.x) - 40 }, { x: TOWN.x, z: TOWN.z - 10 }, { x: -330, z: -280 }, { x: 300, z: -320 },
      { x: HILL500.x, z: HILL500.z + 30 }, { x: -380, z: -420 }, { x: 240, z: -480 }, { x: -120, z: -520 },
      { x: HILL500.x + 40, z: HILL500.z }, { x: 120, z: -560 },
    ],
    // the night of 16–17 June: the 9th Tank Regiment and the 136th Infantry down from the ridge, at the beachhead
    counter: { t: 480, units: ['tank', 'reconVehicle', 'tank', 'rifles', 'tank', 'reconVehicle', 'rifles'], say: 'The 9th Tank Regiment is going in: Chi-Has and Ha-Gos with the 136th Regiment, down from the ridge at the beachhead', sayOther: 'Japanese tanks coming down from the ridge — bazookas up!' },
    // the landing's AI (ai/LandingDirector.js): no DD tanks in the Pacific, no mines to sweep
    ai: { order: ['rifles', 'rifles', 'engineers', 'ifv', 'rifles', 'mgTeam', 'tank', 'rifles', 'mortar', 'atTeam', 'rifles', 'tank', 'heavyTank', 'rifles'], gunship: 'destroyer', gunships: 2, heavy: 'oldBattleship' },
    economy: { reserves: 2400, perSector: 700, beachIncome: 0.9, defenceCp: 750, defenceIncome: 1.3 },
    // H-hour, 08:40: the first waves onto all four beaches at once
    waves: [{ t: 0, say: 'H-hour: the first waves are going in — the reef is ahead', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'engineers', sector: 2 },
      { unit: 'rifles', sector: 3 }, { unit: 'rifles', sector: 3 }, { unit: 'ifv', sector: 3 },
    ] }],
  },

  spawns: {
    // (between the boat lanes, bows to the shore)
    nato: [{ unit: 'destroyer', x: -10, z: 760, facing: Math.PI / 2 }, { unit: 'lsmr', x: -260, z: 560, facing: Math.PI }, { unit: 'lsmr', x: 225, z: 560, facing: Math.PI }],
    pact: [{ unit: 'rifles', x: TOWN.x - 30, z: TOWN.z - 30, facing: 0, name: '1st Battalion, 136th Regiment' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1944_0615);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadC(x, z) > 6 + rr && railC(x, z) > 4 + rr && !nearPoint(x, z, 16 + rr) && !nearFort(x, z, 22 + rr) && inland(x, z) > 30 + rr && swamp(x, z) < 0.1;

    // ---- Charan Kanoa's pier: out over the lagoon along the channel to the reef
    for (let s = 4; s < LAGOON + 10; s += 6) {
      const x = CHANNEL - 18, z = shoreZ(x) + s;
      props.box('plain', x, 1.4, z, 4.5, 0.45, 6.2, 0, 0x7a6a56);
      for (const k of [-1, 1]) props.box('plain', x + k * 1.9, -0.6, z, 0.4, 3.6, 0.4, 0, 0x5a5048);
    }
    // ---- the sugar mill: its halls, the chimney, the cane yard with the railway's cars
    props.hall({ x: MILL.x, z: MILL.z, yaw: 0.3, width: 40, depth: 20, height: 12, color: 0x9a8a74, roof: 0x5a5a56, door: 8, name: 'sugar mill' });
    props.hall({ x: MILL.x + 30, z: MILL.z + 30, yaw: 0.3, width: 22, depth: 14, height: 8, color: 0x8a7a68, roof: 0x5a5a56, door: 6, name: 'cane store' });
    props.chimney({ x: MILL.x - 24, z: MILL.z - 18, height: 34 });
    props.tanks({ x: MILL.x + 8, z: MILL.z - 34, yaw: 0.3, count: 2, radius: 4, height: 6, color: 0x8a8a82 });
    // ---- the town: the sugar company's grid of timber houses, a few in concrete, the office on the main street
    for (let gx = TOWN.x - 110; gx <= TOWN.x + 110; gx += 22) for (let gz = TOWN.z + 80; gz >= TOWN.z - 90; gz -= 20) {
      const x = gx + (r() - 0.5) * 4, z = gz + (r() - 0.5) * 4;
      if (!inTown(x, z) || r() < 0.2 || roadC(x, z) < 9 || railC(x, z) < 7 || nearPoint(x, z, 18) || nearFort(x, z, 26) || Math.hypot(x - MILL.x, z - MILL.z) < 45) continue;
      if (r() < 0.75) props.house({ x, z, yaw: 0, width: 8 + r() * 3, depth: 7 + r() * 2 });
      else props.flatHouse({ x, z, yaw: 0, width: 10 + r() * 3, depth: 8, storeys: r() < 0.3 ? 2 : 1, name: r() < 0.5 ? 'company store' : 'house' });
    }
    props.flatHouse({ x: TOWN.x + 30, z: TOWN.z + 55, yaw: 0, width: 18, depth: 10, storeys: 2, name: 'Nan’yō Kōhatsu office' });
    // a Shintō shrine's torii by the town
    { const x = TOWN.x - 90, z = TOWN.z - 60, y = g(x, z); for (const k of [-1, 1]) props.box('plain', x + k * 2, y + 2.2, z, 0.4, 4.4, 0.4, 0, 0xa83a2a); props.box('plain', x, y + 4.5, z, 6, 0.4, 0.5, 0, 0xa83a2a); props.box('plain', x, y + 3.7, z, 4.6, 0.3, 0.3, 0, 0xa83a2a); }
    // ---- the cane railway: the track, cane cars standing on it
    for (const line of RAILS) for (let i = 0; i + 1 < line.length; i++) props.rails({ x0: line[i][0], z0: line[i][1], x1: line[i + 1][0], z1: line[i + 1][1] });
    for (const [i, t] of [[0, 0.22], [0, 0.5], [0, 0.78], [1, 0.45]] as const) {
      const L = RAILS[i], k = Math.floor(t * (L.length - 1)), f = t * (L.length - 1) - k, [x0, z0] = L[k], [x1, z1] = L[k + 1];
      const x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
      if (!nearPoint(x, z, 20) && !nearFort(x, z, 20)) props.wagon({ x, z, yaw: Math.atan2(x1 - x0, z1 - z0), color: 0x5a4632, kind: 'open' });
    }
    // ---- Aslito: the runway's near end, the hangar, wrecked aircraft
    { const a = ASLITO, fx = Math.cos(a.yaw), fz = Math.sin(a.yaw), yaw = Math.atan2(fx, fz);
      for (let t = -a.len / 2; t < a.len / 2; t += 12) { const x = a.x + fx * (t + 6), z = a.z + fz * (t + 6); props.box('stone', x, g(x, z) + 0.05, z, 34, 0.2, 12.4, yaw, 0xb4ae9a); }
      props.timberHangar({ x: a.x - 60 - fz * 70, z: a.z + fx * 70 + 10, yaw: yaw + Math.PI / 2 });
      for (let i = 0; i < 4; i++) props.aircraftWreck({ x: a.x - 120 + i * 60, z: a.z + 45 + r() * 15, yaw: r() * 6.28, scale: 0.8 }); }
    // ---- farmsteads out in the cane, the Japanese and Chamorro farmers' houses
    for (let i = 0; i < 40; i++) {
      const x = (r() * 2 - 1) * 470, z = 40 - r() * 760;
      if (!free(x, z, 6) || inTown(x, z) || onRunway(x, z) < 40 || cane(x, z) > 0.5) continue;
      props.house({ x, z, yaw: Math.round(r() * 3) * (Math.PI / 2), width: 7 + r() * 2, depth: 6, height: 2.8 });
    }
    // ---- palms along the back of the beach, gun pits on the ridge
    for (let i = 0; i < 70; i++) {
      const x = -490 + r() * 980, z = shoreZ(x) - 26 - r() * 18;
      if (roadC(x, z) < 5 || railC(x, z) < 4 || nearFort(x, z, 18) || nearPoint(x, z, 12) || Math.abs(x - CHANNEL + 18) < 8) continue;
      props.palm({ x, z, height: 8 + r() * 4 });
    }
    for (const f of FORTS.filter((q) => q.unit === 'battery')) for (const k of [-1, 1]) props.sandbagRing({ x: f.x + k * 30, z: f.z - 12, radius: 4.5, toward: 1 });
    commandPost(props, this.bases.pact, 1, 0x6a6444);
    props.finish();

    const avoid = [
      { x: this.bases.pact.x, z: this.bases.pact.z, r: 30 },
      ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      ...FORTS.map((f) => ({ x: f.x, z: f.z, r: 18 })),
      { test: (x: number, z: number) => inland(x, z) < 45 || roadC(x, z) < 6 || railC(x, z) < 4 || inTown(x, z) || onRunway(x, z) < 20 || cane(x, z) > 0.5 || lakeR(x, z) < 1.05 },
    ];
    // tangantangan scrub and breadfruit on the ridge, the hill and round the swamp; flame trees along the lanes; the cane open
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 3200, broadleaf: 1, autumn: 0, maxY: 90, size: 0.9, avoid,
      forest: (x: number, z: number) => Math.max(smoothstep(-380, -620, z) * 0.6, smoothstep(1.9, 1.2, lakeR(x, z)) * 0.5, smoothstep(HILL500.r * 1.2, HILL500.r * 0.5, Math.hypot(x - HILL500.x, z - HILL500.z)) * 0.6, 0.06) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.6,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => inland(x, z) < 22 || roadC(x, z) < 4 || inTown(x, z) || onRunway(x, z) < 4 || lakeR(x, z) < 1 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
