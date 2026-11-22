// Haleiwa, 1942 — the invasion of Oahu that was never carried out (1945 only; coastal: the Imperial Japanese Army lands,
// the US Army's Hawaiian Department holds; 1.0 × 1.8 km). In the first months of 1942 the Combined Fleet's staff and
// the Army studied taking Hawaii: after a decisive battle round Midway, a landing force of two or three divisions would
// come ashore on Oahu's north shore — the only coast with beaches wide enough, far from Pearl Harbor's guns — at
// Haleiwa and Waialua Bay, take the fighter strip, and drive south up the Kamehameha Highway over the Schofield
// plateau to Pearl Harbor. Midway ended it in June 1942. Here it goes in: Shōhatsu and Daihatsu barges off the
// transports, run in over the reef to the bay's sand under the destroyers' guns.
// On the map, from the sea looking inland (south): on the left (east) Haleiwa Beach, Puaena Point, and Haleiwa town —
// wooden stores along the highway, the Liliuokalani church, the old Haleiwa Hotel on the west bank of the Anahulu,
// whose tidal mouth comes out in the bay's east corner (too deep to wade at the mouth; upstream a shallow stream, the
// highway over it on the Haleiwa bridge); the Koolau's green foothills behind. In the middle Waialua Bay's sand, the
// cane fields behind it, the Waialua sugar mill with its stacks and the plantation railway's cane cars, the camps.
// On the right (west), past Kaiaka Point, Mokuleia beach under the Waianae range that runs out to Kaena Point, and
// Haleiwa airfield — a small fighter strip on the coastal plain (the strip Welch and Taylor took off from on
// 7 December). Behind it all the Kaukonahua Road and the highway climb south to Thompson Corner and the Schofield road,
// where the Hawaiian Department's reserve comes from: the 25th Division's infantry, light tanks out of Schofield
// Barracks. The defence: pillboxes on the beaches and the points, wire along the sand, the Coast Artillery's 155 mm
// guns inland laid on the transports.
// How it plays: three beach sectors (Haleiwa, Waialua Bay, Mokuleia), each opening what is behind it (Haleiwa town, the
// mill, the airfield). The Anahulu splits the east sector from the bay: the bridge or the ford upstream. The cane hides
// men; the plain is open. The armour from Schofield comes down the two roads in the seventh minute.
// Laid out in a frame with the sea toward +z (local), then turned round (180°: world = -local) so that the lander,
// `pact`, has the sea on its side (-z) and the land keeps its true handedness (west on the right seen from the sea).
// Not point-mirrored: one side lands, the other holds (modes/landing).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1942_05);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6a78 }); // (the Pacific over the reef: blue-green)
const W = (x: number, z: number) => ({ x: -x, z: -z }); // local → world (turned round)
const TURN = Math.PI; // local yaw → world yaw

// ---------------------------------------------------------------- the local frame: sea +z, east -x, west +x
const PUAENA = -265, KAIAKA = 230;
const pointK = (x: number) => Math.max(Math.exp(-(((x - PUAENA) / 45) ** 2)), Math.exp(-(((x - KAIAKA) / 50) ** 2)));
/** The waterline (local z): Waialua Bay recessed between Puaena Point (east) and Kaiaka Point (west). */
export const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.7, 2) * 8 - 45 * Math.exp(-(((x - 10) / 190) ** 2))
  + 32 * Math.exp(-(((x - PUAENA) / 45) ** 2)) + 34 * Math.exp(-(((x - KAIAKA) / 50) ** 2));

/** The Anahulu: its mouth in the bay's east corner, running inland toward the Koolau. */
const MOUTH = -160;
const S0 = shoreZ(MOUTH);
const HEAD = 520;
const riverX = (b: number) => MOUTH - b * 0.3 + 14 * Math.sin(b * 0.012);
/** How far outside the stream (m; < 0 in it). */
function river(x: number, z: number) {
  const b = S0 - z;
  if (b < -60 || b > HEAD) return Infinity;
  const hw = 5 + 13 * smoothstep(150, 80, b);
  return Math.abs(x - riverX(b)) - hw + smoothstep(HEAD - 90, HEAD, b) * 12;
}
const BRIDGE = { x: riverX(175), z: S0 - 175 };

/** The fighter strip on the Mokuleia plain: along the coast. */
const STRIP = { x: 280, z: -45, len: 280, w: 20, h: 4.6 };
const stripDist = (x: number, z: number) => Math.max(Math.abs(x - STRIP.x) - STRIP.len / 2, Math.abs(z - STRIP.z) - STRIP.w, 0);

/** The ranges: the Waianae west (high, out to Kaena), the Koolau's foothills east. */
function mountains(x: number, back: number) {
  const n = 0.7 + 0.6 * fbm(noise, x * 0.006 + 31, back * 0.006, 3); // (ridges and valleys, not a slab)
  return (smoothstep(380, 720, x) * 95 * smoothstep(250, 460, back) + smoothstep(480, 820, x) * 55 * smoothstep(30, 160, back)
    + smoothstep(-400, -720, x) * 60 * smoothstep(300, 520, back)) * n;
}

function segDist(px: number, pz: number, [ax, az]: number[], [bx, bz]: number[]) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
const polyDist = (x: number, z: number, L: number[][]) => { let d = Infinity; for (let i = 0; i + 1 < L.length; i++) d = Math.min(d, segDist(x, z, L[i], L[i + 1])); return d; };

/** The beach sectors (local x) and what is behind each. */
export const SECTORS = [
  { x: -390, name: 'Haleiwa Beach', inland: { name: 'Haleiwa', x: -300, z: -40 } },
  { x: 40, name: 'Waialua Bay', inland: { name: 'Waialua Mill', x: 90, z: -250 } },
  { x: 380, name: 'Mokuleia Beach', inland: { name: 'Haleiwa Field', x: STRIP.x, z: STRIP.z } },
];
const TOWN = { x: -290, z: -50, r: 80 };
const MILL = SECTORS[1].inland;
const inTown = (x: number, z: number, pad = 0) => Math.hypot(x - TOWN.x, (z - TOWN.z) * 1.2) < TOWN.r + pad;

/** The roads (local): the Kamehameha Highway over the Haleiwa bridge and up to Thompson Corner, Haleiwa Road to the
 * mill and the Farrington Highway on to Mokuleia, the Kaukonahua Road up from the mill, a lane up from each beach. */
const HWY = [[-560, 40], [-470, 28], [-380, 8], [-300, -22], [-240, -34], [BRIDGE.x, BRIDGE.z], [-130, -62], [-70, -130], [-45, -300], [-55, -480], [-60, -640], [-20, -770], [0, -900]];
const ROADS: number[][][] = [
  HWY,
  [[-130, -62], [-30, -105], [50, -175], [MILL.x, MILL.z + 20], [180, -170], [300, -108], [420, -104], [560, -96]], // Haleiwa Road to Waialua, the Farrington Highway on
  [[MILL.x, MILL.z + 20], [100, -400], [40, -560], [-60, -640]],                                                     // the Kaukonahua Road
  [[-390, shoreZ(-390) - 30], [-375, 40], [-380, 8]],                                                                // up from Haleiwa Beach
  [[40, shoreZ(40) - 30], [25, -40], [-30, -105]],                                                                  // up from the bay
  [[380, shoreZ(380) - 30], [455, 40], [458, -102]],                                                                // up from Mokuleia, round the strip's end
];
const roadDist = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) d = Math.min(d, polyDist(x, z, r)); return d; };
const roadC = gridCache((x: number, z: number) => roadDist(-x, -z), BOUNDS, 2); // (world)
const roadL = (x: number, z: number) => roadC(-x, -z);
/** The plantation railway: from the mill east toward Haleiwa and west toward Mokuleia, through the cane. */
const RAIL = [[-235, -150], [-120, -230], [20, -290], [MILL.x + 10, MILL.z - 45], [200, -270], [330, -250], [470, -232]];

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz;
  let h: number;
  if (d > 0) { // the reef and the bay's bottom: shelving gently, beachrock off the points
    h = 0.4 - d * 0.016 - Math.max(0, d - 140) * 0.05 + pointK(x) * Math.max(0, 2.2 - d * 0.04) * (0.6 + noise(x * 0.05, z * 0.05));
    h = Math.max(h, -18);
  } else {
    const back = -d;
    const beach = 0.4 + Math.min(back, 36) * 0.05;
    const n = fbm(noise, x * 0.004, z * 0.004, 3);
    const land = 2.4 + smoothstep(30, 120, back) * 2.2 + Math.max(0, back - 300) * 0.018 + smoothstep(620, 1000, back) * 22 + n * 2.2 + mountains(x, back);
    h = Math.max(beach, Math.min(land, beach + back * 0.12));
    const off = stripDist(x, z); // the strip: graded flat
    if (off < 45) h += (STRIP.h - h) * smoothstep(45, 0, off);
  }
  // the Anahulu: a deep tidal mouth across the beach, upstream a shallow stream; the highway on a causeway and bridge over it
  const rv = river(x, z);
  if (rv < 30) {
    const b = S0 - z;
    const bed = -0.7 - 1.7 * smoothstep(150, 95, b); // (0.7 m: a ford anywhere above the bridge — world/Sea.js deep 0.95)
    const cw = smoothstep(7, 4, polyDist(x, z, HWY)) * smoothstep(34, 26, Math.hypot(x - BRIDGE.x, z - BRIDGE.z));
    h += (Math.min(h, bed) - h) * smoothstep(b < 150 ? 9 : 14, 0, rv) * (1 - cw);
  }
  // the defence's base: flat
  h += (land0(x, z) - h) * smoothstep(60, 25, Math.hypot(x, z + 830));
  return h;
}
const land0 = (x: number, z: number) => 2.4 + 2.2 + Math.max(0, (shoreZ(x) - z) - 300) * 0.018 + smoothstep(620, 1000, shoreZ(x) - z) * 22;
const height = (x: number, z: number) => heightL(-x, -z);

/** Soft going (local): the beach sand, the stream's mud. */
function softL(x: number, z: number, foot: boolean) {
  const back = shoreZ(x) - z;
  if (back >= 0 && back < 34) return foot ? 0.85 : 0.6;
  if (river(x, z) < 5) return foot ? 0.7 : 0.45;
  return 1;
}

/** Cane plots: long strips on a skewed grid, each its crop (0..1). */
const plot = (x: number, z: number) => {
  const u = x * 0.97 + z * 0.24, v = z * 0.97 - x * 0.24, j = Math.floor(v / 46), i = Math.floor(u / 85 + j * 0.41), h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const millYard = (x: number, z: number) => Math.hypot(x - MILL.x, z - MILL.z) < 95;
/** Standing cane (tall enough to hide a man), local. */
function caneL(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 75 || inTown(x, z, 10) || millYard(x, z) || stripDist(x, z) < 35 || river(x, z) < 14 || mountains(x, back) > 6 || Math.hypot(x, z + 830) < 70) return 0;
  if (roadDist(x, z) < 7 || polyDist(x, z, RAIL) < 4) return 0;
  return plot(x, z) < 0.55 ? 1 : 0;
}
/** Woods (local): forest on the ranges, hau and kiawe along the stream, ironwood behind the beach. */
function woodsL(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 0) return 0;
  const m = smoothstep(5, 18, mountains(x, back));
  const rv = river(x, z), bank = rv > 2 && rv < 18 && S0 - z > 120 ? 0.7 : 0;
  const strand = back > 38 && back < 62 && !inTown(x, z) && stripDist(x, z) > 30 ? 0.4 : 0;
  return Math.max(m * 0.9, bank, strand) * smoothstep(5, 9, roadDist(x, z));
}
const woodsC = gridCache((x: number, z: number) => Math.max(woodsL(-x, -z) * 0.85, caneL(-x, -z) * 0.35), BOUNDS);
const caneC = gridCache((x: number, z: number) => caneL(-x, -z), BOUNDS);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport anchorage', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what is behind each once taken)
  { id: 'B', name: 'Haleiwa Beach', ...W(SECTORS[0].x, shoreZ(SECTORS[0].x) - 22), owner: null, sector: 'east', radius: 42, opens: 'E' },
  { id: 'C', name: 'Waialua Bay', ...W(SECTORS[1].x, shoreZ(SECTORS[1].x) - 22), owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: 'Mokuleia Beach', ...W(SECTORS[2].x, shoreZ(SECTORS[2].x) - 22), owner: null, sector: 'west', radius: 42, opens: 'G' },
  { id: 'E', name: 'Haleiwa', ...W(SECTORS[0].inland.x, SECTORS[0].inland.z), owner: null, sector: 'east' },
  { id: 'F', name: 'Waialua Mill', ...W(MILL.x, MILL.z), owner: null, sector: 'centre' },
  { id: 'G', name: 'Haleiwa Field', ...W(STRIP.x, STRIP.z), owner: null, sector: 'west' },
  { id: 'K', name: 'Thompson Corner', ...W(-60, -640), owner: 'nato', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r); // (world)

/** The forts (local): a pillbox over each beach and on each point, the 155 mm batteries inland. */
const FORTS_L = [
  ...SECTORS.map((s) => ({ unit: 'wn', x: s.x + 55, z: shoreZ(s.x + 55) - 66 })),
  { unit: 'wn', x: PUAENA, z: shoreZ(PUAENA) - 42 },
  { unit: 'wn', x: KAIAKA, z: shoreZ(KAIAKA) - 46 },
  { unit: 'battery', x: -150, z: -440 },
  { unit: 'battery', x: 250, z: -470 },
];

export default {
  id: 'haleiwa',
  name: 'Haleiwa',
  description: 'Oahu’s north shore, 1942 — the Japanese landing that Midway called off: Waialua Bay and Haleiwa Beach either side of the Anahulu’s mouth, Mokuleia under the Waianae, Haleiwa town, the sugar mill and its cane, the fighter strip, and the road climbing south to Schofield.',
  epochs: ['1945'],
  region: 'pacific',                                   // (the menu's Asia & Pacific: maps/index.js REGIONS)
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific's armies)
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['us', 'usmc'], pact: ['jp'] },     // (the Hawaiian Department — the 24th and 25th Divisions, the Coast Artillery, Marines at the air stations — against the landing force)
  airfields: [],                                       // (Haleiwa Field is scenery here: a strip too short and too near the beach to fly from in the battle)
  conditions: { time: 'dawn', weather: 'clear' },      // (in at first light, on the trade wind)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles: the ranges' slopes are for men)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1942,
  height,
  soft: (x: number, z: number, foot: boolean) => softL(-x, -z, foot),
  river: sea,
  woods: (x: number, z: number) => woodsC(x, z),

  theme: {
    // a trade-wind dawn: cloud piled on the Koolau and the Waianae, the sea bright over the reef, red earth between the cane
    fogColor: 0xc0ccd0, fogDensity: 0.0006,
    skyTop: 0x4a78b0, skyHorizon: 0xd6dcd8, skyBottom: 0x8a9890,
    sunColor: 0xffe8cc, sunIntensity: 1.8, sunDisk: 0.35,
    clouds: 0.5, cloudLight: 0xf6f2ec, cloudDark: 0x8e9aa4,
    sunDir: [-0.55, 0.45, 0.6],
    hemiSky: 0xc8d6e0, hemiGround: 0x5a3e2c, hemiIntensity: 1.25,
    rimColor: 0xe0dcd4, rimIntensity: 0.22,
    terrain: {
      grass: '#5c7234', grassAlt: '#52682e', dryGrass: '#8e8650', dirt: '#8a4a2c', rock: '#5a524a',
      pasture: '#667a50', ploughed: '#7a4a32', stubble: '#948654', meadow: '#5a7c38',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0, // (no default tracks: the roads are painted below)
      surface(wx: number, wz: number, y: number) {
        const x = -wx, z = -wz, back = shoreZ(x) - z;
        if (back < -3) return [y > -1.5 ? 0xc8c2a4 : 0x7a8a7a, 1];                                    // the reef flat's pale sand, deeper the coral
        if (pointK(x) > 0.45 && back < 40) return [0x3e3a36, 0.95];                                    // the points' black lava and beachrock
        if (river(x, z) < 3 && back > 20) return [0x5a4a36, 0.9];                                      // the stream's mud banks
        if (back < 34) return [0xe0d4b0, 1];                                                           // the north shore's sand
        const hw = polyDist(x, z, HWY);
        if (hw < 4) return [0x4c4a46, 0.9];                                                            // the highway: tarmac
        const rd = roadL(x, z);
        if (rd < 3.6) return [0x9a5434, smoothstep(3.6, 1.8, rd) * 0.85];                             // the plantation roads: red dirt
        if (stripDist(x, z) < 0.5) return [0x8a8678, 0.95];                                            // the strip: rolled coral
        if (stripDist(x, z) < 30) return [0x7a8a48, 0.6];                                              // its mown grass
        if (inTown(x, z)) return [0x6a6a40, 0.55];                                                     // yards and gardens
        if (millYard(x, z) && Math.hypot(x - MILL.x, z - MILL.z) < 70) return [0x7a5a40, 0.45];       // the mill yard
        if (mountains(x, back) > 8) return null;                                                       // the ranges' forest
        if (caneC(wx, wz) > 0.5) return [noise(x * 0.03, z * 0.03) > 0.2 ? 0x7a9a40 : 0x6a8e3a, 0.85]; // standing cane
        const p = plot(x, z);
        if (back > 75 && p < 0.66) return [0x8a4a2c, 0.5];                                            // cut and ploughed: red earth
        if (back > 75 && p < 0.8) return [0x948654, 0.45];                                            // ratoon stubble
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-50, 0, 50] }, // (the Hawaiian Department: down the highway and the Kaukonahua Road from Schofield)
           pact: { x: 0, z: -830, entries: SECTORS.map((s) => -s.x) } }, // (the side that lands: its roads are the beach sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    // (one Kagerō already off the bay, between the boat lanes: the bombardment group's)
    pact: [{ unit: 'destroyer', ...W(-180, 700), facing: Math.PI / 2 }],
    nato: [],
  },

  landing: {
    attacker: 'pact', // (wcampaign/battle.js landerOf)
    // what comes in (systems/Landing.js): the men by Shōhatsu, the light tanks by Daihatsu
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    // what the landing may call in at sea: the destroyers inshore, a light cruiser to lead them, a minesweeper
    navy: ['destroyer', 'lightCruiser', 'minesweeper'],
    // the Hawaiian Department's beach defences: pillboxes over each beach and on the points, the Coast Artillery's 155s inland
    forts: FORTS_L.map((f) => ({ unit: f.unit, ...W(f.x, f.z), facing: Math.PI })),
    names: { wn: 'Beach pillbox', battery: '155 mm battery' },
    // wire along the sand, mines and trenches over each beach, MG nests
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -490 + i * 11, z = shoreZ(x) - 32; return river(x, z) < 6 ? null : { kind: 'wire', ...W(x, z), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 62) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 52), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 47), yaw: 0 }))),
    ],
    obstacles: [],
    // the 25th Division's men over the beaches and in Haleiwa, the mill and round the strip
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'atTeam', 'mortar', 'rifles', 'atTeam', 'mortar', 'scouts', 'rifles'],
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 47 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the counter-attack: light tanks and the 27th Infantry down the highway and the Kaukonahua Road from Schofield
    counter: { t: 400, units: ['tank', 'reconVehicle', 'rifles', 'tank', 'reconVehicle', 'rifles'], say: 'The tanks from Schofield Barracks are coming down the highway and the Kaukonahua Road, straight for the beachhead', sayOther: 'Enemy tanks coming down from Schofield: the American reserve' },
    // the landing's AI (ai/LandingDirector.js): riflemen first, engineers for the wire, the light tanks by Daihatsu
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'engineers', 'rifles', 'tank', 'rifles', 'atTeam', 'mortar', 'rifles', 'reconVehicle', 'engineers', 'rifles', 'tank'], gunship: 'destroyer', gunships: 2, heavy: null, inshore: 380 },
    economy: { reserves: 3400, perSector: 900, beachIncome: 1.3, defenceCp: 500, defenceIncome: 1.0 },
    // the first wave at dawn, in to all three beaches at once
    waves: [{ t: 0, say: 'The first wave is going in: the barges are over the reef', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 }, { unit: 'tank', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1942_05);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(-x, -z); // (local)
    const flat = (x: number, z: number, s = 5) => Math.abs(g(x + s, z) - g(x - s, z)) + Math.abs(g(x, z + s) - g(x, z - s)) < s * 0.35;
    const fortNear = (x: number, z: number, d: number) => FORTS_L.some((f) => Math.hypot(f.x - x, f.z - z) < d);
    const free = (x: number, z: number, rr: number) => roadL(x, z) > 5 + rr && !nearPoint(-x, -z, 14 + rr) && river(x, z) > 6 + rr && shoreZ(x) - z > 40 + rr
      && !fortNear(x, z, 22 + rr) && stripDist(x, z) > 24 + rr && polyDist(x, z, RAIL) > 4 + rr && flat(x, z);
    const box = (key: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw: number, c: number) => { const w = W(x, z); props.box(key, w.x, y, w.z, sx, sy, sz, yaw + TURN, c); };

    // ---- Haleiwa: wooden stores along the highway, cottages behind, the church, the hotel on the west bank
    for (let i = 0; i < 120; i++) {
      const x = TOWN.x + (r() - 0.5) * TOWN.r * 2, z = TOWN.z + (r() - 0.5) * TOWN.r * 1.7;
      if (!inTown(x, z, -4) || !free(x, z, 3)) continue;
      const store = polyDist(x, z, HWY) < 20;
      props.townHouse({ ...W(x, z), yaw: (store ? Math.PI / 2 : Math.round(r() * 2) * (Math.PI / 2)) + TURN, width: store ? 9 : 7, depth: store ? 10 : 7.5, storeys: store && r() < 0.4 ? 2 : 1, name: store ? 'store' : 'cottage', damaged: 0.05 });
    }
    { const x = TOWN.x - 30, z = TOWN.z - 55; if (free(x, z, 6)) props.church({ ...W(x, z), yaw: Math.PI / 2 + TURN }); }
    { // the Haleiwa Hotel: two storeys of verandahs among the palms, by the river mouth
      const x = riverX(110) + 52, z = S0 - 112;
      props.townHouse({ ...W(x, z), yaw: TURN, width: 30, depth: 12, storeys: 2, name: 'Haleiwa Hotel', damaged: 0 });
      for (let i = 0; i < 9; i++) { const px = x - 30 + r() * 60, pz = z + 12 + r() * 16; if (river(px, pz) > 4 && shoreZ(px) - pz > 32) props.palm({ ...W(px, pz), height: 9 + r() * 5 }); }
    }
    // the Haleiwa bridge: a concrete deck and parapets on the causeway over the Anahulu
    {
      const a = HWY.findIndex((p) => p[0] === BRIDGE.x), [ax, az] = HWY[a - 1], [bx, bz] = HWY[a + 1];
      const yaw = Math.atan2(bx - ax, bz - az), fx = Math.sin(yaw), fz = Math.cos(yaw);
      const y = g(BRIDGE.x, BRIDGE.z);
      box('stone', BRIDGE.x, y + 0.1, BRIDGE.z, 8, 0.3, 40, yaw, 0x9a968c);
      for (const s of [-1, 1]) box('stone', BRIDGE.x + fz * s * 4.2, y + 0.75, BRIDGE.z - fx * s * 4.2, 0.4, 1.0, 40, yaw, 0xb0aca2);
    }
    // palms along the beach in front of the town and the bay
    for (let i = 0; i < 60; i++) {
      const x = -480 + r() * 960, z = shoreZ(x) - 36 - r() * 18;
      if (river(x, z) < 8 || pointK(x) > 0.4 || roadL(x, z) < 5 || nearPoint(-x, -z, 16) || fortNear(x, z, 16)) continue;
      props.palm({ ...W(x, z), height: 8 + r() * 6 });
    }
    // fishing sampans drawn up by the river mouth
    for (let i = 0; i < 6; i++) { const b = 30 + i * 9, x = riverX(b) + (i % 2 ? 1 : -1) * 22, z = S0 - b; if (river(x, z) > 1) box('plain', x, g(x, z) + 0.4, z, 1.8, 0.8, 7, 0.4 + r() * 0.3, 0x6a4a34); }

    // ---- the Waialua sugar mill: the mill house, the boiling house, two stacks, the water tanks, the cane carrier
    const M = MILL;
    props.hall({ ...W(M.x + 45, M.z - 10), yaw: Math.PI / 2 + TURN, width: 48, depth: 24, height: 14, color: 0x9a8a72, roof: 0x5a5a56, door: 8, name: 'Waialua sugar mill' });
    props.hall({ ...W(M.x + 40, M.z - 52), yaw: TURN, width: 30, depth: 16, height: 10, color: 0x8e7e68, roof: 0x5a5a56, door: 6, name: 'boiling house' });
    props.chimney({ ...W(M.x + 72, M.z - 35), height: 42 });
    props.chimney({ ...W(M.x + 72, M.z - 15), height: 36 });
    props.tanks({ ...W(M.x - 45, M.z - 50), yaw: TURN, count: 2, radius: 5, height: 8, color: 0x8a8a82 });
    { const a = W(M.x + 10, M.z - 45), b = W(M.x + 30, M.z - 20); props.conveyor({ x0: a.x, z0: a.z, x1: b.x, z1: b.z, y0: 1, y1: 10 }); }
    props.hall({ ...W(M.x - 50, M.z + 30), yaw: TURN, width: 22, depth: 10, height: 5, color: 0x8a7a64, roof: 0x6a3a2a, door: 5, name: 'plantation store' });
    // the plantation railway: the track through the cane, cane cars waiting at the mill
    for (let i = 0; i + 1 < RAIL.length; i++) {
      const a = W(RAIL[i][0], RAIL[i][1]), b = W(RAIL[i + 1][0], RAIL[i + 1][1]);
      props.rails({ x0: a.x, z0: a.z, x1: b.x, z1: b.z });
    }
    {
      const [ax, az] = RAIL[3], [bx, bz] = RAIL[4], yaw = Math.atan2(bx - ax, bz - az);
      for (let k = 0; k < 4; k++) { const t = 0.15 + k * 0.17, x = ax + (bx - ax) * t, z = az + (bz - az) * t; props.wagon({ ...W(x, z), yaw: yaw + TURN, color: 0x5a3426, kind: 'open' }); }
    }
    // the plantation camps: rows of cottages in the cane
    const camp = (cx: number, cz: number, n: number, yaw: number) => {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const x = cx + (r() - 0.5) * 80, z = cz + (r() - 0.5) * 50;
        if (!free(x, z, 3)) continue;
        n--;
        props.townHouse({ ...W(x, z), yaw: yaw + TURN, width: 6, depth: 8, storeys: 1, name: 'camp cottage', damaged: 0.05 });
      }
    };
    camp(M.x - 90, M.z - 60, 12, 0.1);
    camp(-120, -330, 8, -0.2);
    camp(250, -200, 6, 0.15);

    // ---- Haleiwa Field: the strip, the revetments, a hangar, the tower, tents
    for (let t = -STRIP.len / 2; t < STRIP.len / 2; t += 12) box('stone', STRIP.x + t + 6, g(STRIP.x + t + 6, STRIP.z) + 0.05, STRIP.z, 12.4, 0.2, 34, Math.PI / 2, 0x8a8678);
    for (let i = 0; i < 5; i++) { // the earth revetments for the P-40s, behind the strip
      const x = STRIP.x - 110 + i * 55, z = STRIP.z - 45, y = g(x, z);
      box('plain', x, y + 1.1, z - 6, 16, 2.2, 3, 0, 0x7a5a3e);
      box('plain', x - 7, y + 1.1, z, 3, 2.2, 12, 0, 0x7a5a3e);
      box('plain', x + 7, y + 1.1, z, 3, 2.2, 12, 0, 0x7a5a3e);
    }
    props.timberHangar({ ...W(STRIP.x - 150, STRIP.z - 50), yaw: TURN });
    props.controlTower({ ...W(STRIP.x + 20, STRIP.z + 40), yaw: TURN });
    for (let i = 0; i < 4; i++) props.tent({ ...W(STRIP.x + 70 + i * 9, STRIP.z + 38), yaw: TURN, color: 0x5a5c3a });

    // ---- Mokuleia: beach houses behind the sand, a ranch house under the range
    for (let i = 0; i < 12; i++) {
      const x = 300 + r() * 190, z = shoreZ(x) - 50 - r() * 30;
      if (!free(x, z, 3)) continue;
      props.house({ ...W(x, z), yaw: TURN + (r() - 0.5) * 0.2, width: 8, depth: 7, height: 3 });
    }
    // ---- the gun positions and sandbags round the pillboxes, the battery's ammunition bunkers
    for (const f of FORTS_L) if (f.unit === 'battery') for (const s of [-1, 1]) props.sandbagRing({ ...W(f.x + s * 30, f.z + 20), radius: 4, toward: -1 });
    for (let i = 0; i < 4; i++) props.crates({ ...W(-80 + i * 40, -760 - r() * 20), yaw: r() * 3 });
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    props.finish();

    const L = (f: (x: number, z: number) => boolean) => (wx: number, wz: number) => f(-wx, -wz);
    const avoid = [{ x: 0, z: 830, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: L((x, z) => roadL(x, z) < 6 || river(x, z) < 2 || shoreZ(x) - z < 36 || stripDist(x, z) < 28 || inTown(x, z, -20) || millYard(x, z) && Math.hypot(x - MILL.x, z - MILL.z) < 75 || polyDist(x, z, RAIL) < 4 || fortNear(x, z, 14)) }];
    // koa and ohia on the ranges, hau and kiawe along the Anahulu, ironwood behind the beach, monkeypods in the town
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 4200, broadleaf: 0.8, autumn: 0, maxY: 140, size: 1.1, avoid,
      forest: L((x, z) => { if (caneL(x, z) > 0) return -1; const w = woodsL(x, z); if (w > 0.3) return w; return inTown(x, z) ? 0.1 : 0.003; }) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: L((x, z) => shoreZ(x) - z < 36 || stripDist(x, z) < 2 || roadL(x, z) < 4) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
