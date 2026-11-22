// Imphal, March–July 1944 (1945 only; the big field, 1.0 × 1.12 km; Burma: the 14th Army's IV Corps against the
// Imperial Japanese Army's 15th Army). Mutaguchi's "March on Delhi" was to take the 14th Army's base on the Imphal
// plain — its depots, its airstrips, the road north to Kohima and Dimapur. The 15th Division came at the plain's
// north-east edge out of the hills, cut the Kohima road at Kanglatongbi and overran the depot there, and on 6 April
// took Nunshigum, the steep hill that looks straight down on the Main airstrip; on 13 April the 1st Dogras and the
// Carabiniers' Lees (the tanks winched and driven up the knife-edge) took it back. In the south-west the 33rd Division
// pushed up beside Loktak lake's marshes on Bishenpur — Potsangbam, Ningthoukhong. Here the plain runs the length of
// the field: the British come from Imphal and its airstrips (+z), the Japanese from the Kohima road and the hills (-z).
// The road winds down the middle through Sengmai; Loktak's open water and floating-weed marsh lie along the west flank
// with the Manipuri villages on their rises at its edge; the jungled hills rise steep along the east, and out of them
// stand two ridges into the plain — Nunshigum on the British half, the Mapao spur on the Japanese.
// Not mirrored, but fair: the two ridges are as high and as long, each with a track up its gentle end; the lake gives
// each half its own bay (Loktak's main water on the Japanese half, the Bishenpur bay on the British) and each side two
// lake-edge villages a track apart; the road's depot (Kanglatongbi, Japanese end) answers the Koirengei airstrip
// (British end); Sengmai in the middle sits on the road with the cross track to Potsangbam and Kameng either side; the
// east hills run the whole length. Each point is about as far from one base as its counterpart is from the other.
// April before the monsoon: dry paddy stubble, hazy heat, cloud building over the hills.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createLakes } from '../world/Lakes.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import { commandPost, shellField, trenchLine } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const noise = createNoise2D(1944_03);

/** The Imphal–Kohima road (x at z), down the middle of the plain. */
export const roadX = (z: number) => 25 * Math.sin(z * 0.005) + 12 * Math.sin(z * 0.013 + 1);

// ---- Loktak lake along the west flank: its main water off the Japanese half, the Bishenpur bay off the British
const lakes = createLakes({ lakes: [
  { x: -610, z: -130, rx: 270, rz: 290, rot: 0.2, depth: 3, seed: 2 },
  { x: -560, z: 370, rx: 175, rz: 150, rot: -0.3, depth: 2.5, seed: 5 },
] });
const nearLake = (x: number) => x < -250;
const wetQ = (x: number, z: number) => (nearLake(x) ? lakes.q(x, z) : Infinity);

// the hills: ridges [ax, az, bx, bz, width, height] and knolls [x, z, r, h]
const RIDGES: number[][] = [
  [240, 120, 385, 365, 50, 22],     // Nunshigum: a long ridge out of the hills, its knife-edge top over the airstrips
  [250, -125, 405, -385, 54, 20],   // the Mapao spur over Kanglatongbi
];
const KNOLLS: number[][] = [
  [304, 232, 52, 12],               // Nunshigum's top (the "Pimple")
  [338, -278, 58, 13],              // Mapao's top
  [-292, 300, 45, 1.6],             // the village rises at the lake's edge: Bishenpur,
  [-312, 22, 45, 1.6],              // Potsangbam,
  [-272, -302, 45, 1.6],            // Ningthoukhong
];
const seg = (x: number, z: number, [ax, az, bx, bz, w, h]: number[]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return h * Math.exp(-((Math.hypot(x - ax - dx * t, z - az - dz * t) / w) ** 2));
};
const knoll = (x: number, z: number, [kx, kz, r, h]: number[]) => h * Math.exp(-((Math.hypot(x - kx, z - kz) / r) ** 2));
const hills = (x: number, z: number) => RIDGES.reduce((s, r) => s + seg(x, z, r), 0) + KNOLLS.reduce((s, k) => s + knoll(x, z, k), 0)
  + smoothstep(390, 520, x) * (34 + fbm(noise, x * 0.006 + 3, z * 0.006, 2) * 10);  // the jungled hills along the east

/** The Koirengei airstrip (along x) beside the road at the British end: graded earth with Bharat matting. */
const STRIP = { x: -130, z: 255, len: 220, w: 30, h: 2.8 };
const offStrip = (x: number, z: number) => Math.max(Math.abs(x - STRIP.x) - STRIP.len / 2, Math.abs(z - STRIP.z) - STRIP.w / 2, 0);

// ---- the tracks along the bunds: the lake-edge track, the cross track through Sengmai, the tracks up both ridges
const TRACKS: [number, number][][] = [
  [[0, 500], [-150, 420], [-292, 300], [-312, 22], [-272, -302], [-150, -420], [0, -500]],   // the lake-edge track
  [[-292, 300], [-240, 268]],                                                              // Bishenpur to the strip
  [[-312, 22], [roadX(15), 15], [300, -38]],                                               // Potsangbam – Sengmai – Kameng
  [[roadX(420), 420], [230, 405], [372, 352], [304, 232]],                                 // up Nunshigum from its north end
  [[304, 232], [248, 110], [300, -38], [262, -120]],                                       // Nunshigum – Kameng – the Mapao spur's foot
  [[262, -120], [338, -278]],                                                              // up the Mapao spur
  [[338, -278], [200, -420], [roadX(-460), -460]],                                         // Mapao back to the road
  [[roadX(-250), -250], [-272, -302]],                                                     // Kanglatongbi to Ningthoukhong
];
function segDist(px: number, pz: number, [ax, az]: [number, number], [bx, bz]: [number, number]) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
const mainRoad = (x: number, z: number) => Math.abs(x - roadX(z)) / Math.hypot(1, 0.125 * Math.cos(z * 0.005) + 0.156 * Math.cos(z * 0.013 + 1));
/** Metres from the nearest road or track (cached: asked for every height and every tree). */
const roadDist = gridCacheSmooth((x: number, z: number) => {
  let d = mainRoad(x, z);
  for (const t of TRACKS) for (let i = 0; i + 1 < t.length; i++) d = Math.min(d, segDist(x, z, t[i], t[i + 1]));
  return d;
}, EXT, 2);

/** The plain, the hills and the lake: everything but the grading (cached, read bilinear). */
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 2.6 + fbm(noise, x * 0.004, z * 0.004, 2) * 0.7;                                     // the paddy plain
  h += hills(x, z);
  h += fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 2.2 * smoothstep(7, 18, h);                     // broken ground on the hills
  h += smoothstep(600, 680, Math.abs(z)) * 14;                                                   // the hills beyond the ends
  return nearLake(x) ? lakes.carve(x, z, h) : h;
}, EXT, 2);

function height(x: number, z: number) {
  let h = ground(x, z);
  const rd = roadDist(x, z);
  if (rd < 7 && h < 3.2 && wetQ(x, z) > 1.15) h += (3.2 - h) * smoothstep(7, 3, rd);           // and a raised bund on the plain
  if (Math.abs(z - STRIP.z) < 60) h += (STRIP.h - h) * smoothstep(36, 6, offStrip(x, z));
  for (const bz of [BASE_Z, -BASE_Z]) h += (3 - h) * smoothstep(36, 20, Math.hypot(x, z - bz));
  return h;
}

/** The marsh round the lake (phumdi and reed): men wade, vehicles bog; the tracks' bunds are firm. */
function soft(x: number, z: number, foot: boolean) {
  const q = wetQ(x, z);
  if (q > 1.5 || roadDist(x, z) < 5) return 1;
  const b = smoothstep(1.5, 1.1, q);
  return 1 - b * (foot ? 0.35 : 0.6);
}

/** The jungle on the hills; on the plain only the villages' groves of bamboo and fruit trees. */
const VILLAGES: number[][] = [[-292, 300], [-312, 22], [-272, -302], [16, 32], [300, -38], [-28, -250], [150, 330], [-150, -40], [170, -330]];
const jungle = gridCache((x: number, z: number) => {
  const hill = smoothstep(5, 11, hills(x, z));
  const patch = smoothstep(-0.3, 0.1, fbm(noise, x * 0.007 - 4, z * 0.007 + 3, 2));
  let grove = 0;
  for (const [vx, vz] of VILLAGES) grove = Math.max(grove, smoothstep(60, 35, Math.hypot(x - vx, z - vz)));
  return Math.max(hill * (0.6 + 0.4 * patch), grove * 0.45);
}, EXT, 4);

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: 'B Company, 1st Dogras' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Imphal', x: 22, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bishenpur', x: -292, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Koirengei airstrip', x: -70, z: 255, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Nunshigum', x: 304, z: 232, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Potsangbam', x: -312, z: 22, owner: null, sector: 'west' },
  { id: 'F', name: 'Sengmai', x: 16, z: 32, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Kameng', x: 300, z: -38, owner: null, sector: 'east' },
  { id: 'H', name: 'Ningthoukhong', x: -272, z: -302, owner: null, sector: 'west' },
  { id: 'I', name: 'Kanglatongbi', x: -28, z: -250, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Mapao', x: 338, z: -278, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Kohima road', x: -18, z: -470, owner: 'pact', sector: 'centre' },
];
const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

export default {
  id: 'imphal',
  name: 'Imphal Plain',
  description: 'March–July 1944: the Japanese 15th Army comes out of the hills at the 14th Army’s base — dry paddy, Manipuri villages, Loktak lake’s marshes, the Kohima road, and Nunshigum’s jungled ridge over the airstrips.',
  epochs: ['1945'],
  region: 'pacific',                                   // (the menu's Asia & Pacific: maps/index.js REGIONS)
  pacific: true,                                       // (data/factions.js armiesFrom: the Imperial Army fights here)
  sides: { nato: 'Britain', pact: 'Japan' },
  armies: { nato: ['brit14'], pact: ['jp'] },
  airfields: [],                                       // (the Koirengei strip is a point to hold, nobody's base: the RAF flies from Imphal Main beyond the map)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.55, // (vehicles: the plain, the tracks and the ridges' gentle ends; the hills' faces are for men — as the Carabiniers found)
  seed: 1944,
  height,
  soft,
  river: lakes,
  woods: (x: number, z: number) => jungle(x, z) * 0.9,

  theme: {
    // April on the plain before the monsoon: hazy heat, cloud piling over the hills
    fogColor: 0xb8bcae, fogDensity: 0.0012,
    skyTop: 0x6e8aa4, skyHorizon: 0xc8cabc, skyBottom: 0x8e9480,
    sunColor: 0xfff0d4, sunIntensity: 1.8, sunDisk: 0.2,
    clouds: 0.6, cloudLight: 0xeeeee6, cloudDark: 0x868c88,
    sunDir: [0.4, 0.7, 0.45],
    hemiSky: 0xc8d0cc, hemiGround: 0x4a4a32, hemiIntensity: 1.3,
    rimColor: 0xd0d4cc, rimIntensity: 0.2,
    terrain: {
      grass: '#55692f', grassAlt: '#4c602c', dryGrass: '#8a8448', dirt: '#6a4a30', rock: '#6a6656',
      pasture: '#5c7034', ploughed: '#6a5034', stubble: '#9a8a52', meadow: '#5e7432',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,   // (no default farmland: the paddies are painted below)
      surface(x: number, z: number, y: number) {
        const rd = roadDist(x, z);
        if (mainRoad(x, z) < 4.5) return [0x7e5c3c, smoothstep(4.5, 2.5, mainRoad(x, z)) * 0.9];   // the road: red laterite
        if (rd < 3.2) return [0x7a6448, smoothstep(3.2, 1.8, rd) * 0.8];                            // the tracks on the bunds
        if (offStrip(x, z) < 0.5) return [0x6a6656, 0.85];                                         // the strip: Bharat matting on earth
        if (offStrip(x, z) < 22) return [0x8a6a48, 0.45 * smoothstep(22, 4, offStrip(x, z))];       // its graded margin
        if (y < 1.2 && nearLake(x)) return [0x3a3e26, 0.85];                                       // the lake's mud and phumdi
        const q = wetQ(x, z);
        if (q < 1.5) return [noise(x * 0.04, z * 0.04) > 0 ? 0x6c7038 : 0x4a5a2c, smoothstep(1.5, 1.1, q) * 0.8]; // reed and sedge
        if (y > 7) return null;                                                                     // the hills: the jungle's floor
        // the paddies: dry stubble in fields of 30 × 22 m, a few still green, the bunds between them
        const fx = (x + 7) / 30, fz = (z + 3) / 22, ex = Math.abs(fx - Math.round(fx)) * 30, ez = Math.abs(fz - Math.round(fz)) * 22;
        if (Math.min(ex, ez) < 0.7) return [0x6a5a3c, 0.55];
        const cell = Math.floor(fx) * 7919 + Math.floor(fz) * 104729, k = ((cell % 13) + 13) % 13;
        return [k < 3 ? 0x6a7a36 : k < 8 ? 0x9a8a52 : 0x8a7444, 0.5];
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-160, 0, 160] }, pact: { x: 0, z: -BASE_Z, entries: [-160, 0, 160] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '51st Regiment' })),
  },

  /** Shelling on the ridges and round the depot and the strip; each side dug in on its ridge and its box. */
  battlefield() {
    const density = (x, z) => 0.04 + 0.6 * smoothstep(10, 26, hills(x, z)) * smoothstep(400, 360, x) + 0.5 * smoothstep(60, 0, Math.hypot(x - 20, z - 15));
    const half = (seed, f) => shellField(seed, BOUNDS, f).filter((_, i) => i % 2 === 0);
    const blasts = [...half(1944_0406, density), ...half(1944_0413, (x, z) => density(-x, -z)).map(([x, z, r, d]) => [-x, -z, r, d])];
    const works: any[] = [];
    const lines: [string, [number, number][]][] = [
      ['nato', [[274, 205], [298, 198], [322, 202]]],                    // Nunshigum's top, facing south
      ['nato', [[-110, 228], [-80, 224], [-50, 228]]],                   // the strip's box
      ['nato', [[-318, 274], [-292, 268], [-266, 274]]],                 // Bishenpur
      ['pact', [[365, -252], [340, -245], [312, -250]]],                 // Mapao's top (left to right as their owner faces north)
      ['pact', [[2, -224], [-28, -218], [-58, -224]]],                   // the depot
      ['pact', [[-246, -276], [-272, -270], [-298, -276]]],              // Ningthoukhong
    ];
    for (const [f, l] of lines) works.push(...trenchLine(l, f, { zig: 1, belts: 0 }));
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const R = mulberry32(1944);
    const THATCH = 0x8a7a50, BAMBOO = 0x9a8a5a, TIN = 0x6a6a62;
    /** A Manipuri house: woven-bamboo walls on a mud plinth under a deep thatch roof. */
    const basha = (x: number, z: number, yaw: number, w: number, d: number) => {
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 0.2, z, w + 0.6, 0.4, d + 0.6, yaw, 0x7a5a3c);
      props.box('plain', x, g + 1.3, z, w, 1.9, d, yaw, BAMBOO);
      props.box('plain', x, g + 2.7, z, w + 1.4, 1.0, d + 1.6, yaw, THATCH);
      cover.addBox({ x, z, yaw, length: d, thickness: w, height: 2.3 });
    };
    const clear = (x: number, z: number, r: number) => roadDist(x, z) < r || offStrip(x, z) < 12 || wetQ(x, z) < 1.25 || terrain.heightAt(x, z) > 6;

    // ---- the villages: houses round each (a ring, the point's own ground left open), bamboo clumps in the gardens
    for (const [cx, cz] of VILLAGES) {
      const n = 10 + Math.floor(R() * 5);
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, d = 16 + R() * 36, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (near(x, z, 14) || clear(x, z, 9)) continue;
        basha(x, z, a, 4.5 + R() * 2, 6.5 + R() * 3);
      }
      for (let i = 0; i < 6; i++) { // bamboo: a sheaf of tall thin canes, leaning out
        const a = R() * Math.PI * 2, d = 20 + R() * 40, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (near(x, z, 14) || clear(x, z, 8)) continue;
        const g = terrain.heightAt(x, z);
        for (let k = 0; k < 9; k++) {
          const h = 6 + R() * 5;
          props.box('plain', x + (R() - 0.5) * 1.6, g + h / 2 - 0.2, z + (R() - 0.5) * 1.6, 0.14, h, 0.14, 0, R() < 0.5 ? 0x7a8a42 : 0x6a7a3a, (R() - 0.5) * 0.35, (R() - 0.5) * 0.35);
        }
      }
    }
    // ---- Koirengei airstrip: matting, revetments of earth along its north side, a wrecked Hurricane and a Dakota
    {
      const s = STRIP;
      for (let x = s.x - s.len / 2 + 6; x < s.x + s.len / 2; x += 12) props.box('stone', x, terrain.heightAt(x, s.z) + 0.04, s.z, 12.2, 0.1, s.w - 4, 0, 0x6c6a5e);
      for (let i = 0; i < 4; i++) {
        const x = s.x - 80 + i * 50, z = s.z + 38, g = terrain.heightAt(x, z);
        if (near(x, z, 14) || roadDist(x, z) < 12) continue;
        props.box('plain', x, g + 1, z + 7, 16, 2, 2.6, 0, 0x7a5e40);
        props.box('plain', x - 8, g + 1, z, 2.6, 2, 14, 0, 0x7a5e40);
        props.box('plain', x + 8, g + 1, z, 2.6, 2, 14, 0, 0x7a5e40);
      }
      props.aircraftWreck({ x: s.x - 55, z: s.z + 36, yaw: 0.4, scale: 0.6 });
      props.aircraftWreck({ x: s.x + 40, z: s.z - 34, yaw: 2.6, scale: 0.9 });
      for (let i = 0; i < 6; i++) props.box('metal', s.x - 20 + i * 2.2, terrain.heightAt(s.x - 20 + i * 2.2, s.z - 30) + 0.6, s.z - 30, 0.9, 1.2, 0.9, 0, 0x5a5a3c);
    }
    // ---- the depots: Imphal's huts behind the British line, Kanglatongbi's overrun sheds by the road
    for (const [x, z, yaw] of [[-80, 430, 0.1], [-110, 405, 0.1], [80, 420, -0.1], [110, 440, -0.1],
      [-70, -270, 0.2], [-75, -230, 0.2], [30, -275, -0.1], [35, -232, -0.1]]) {
      if (near(x, z, 12) || clear(x, z, 12)) continue;
      props.hall({ x, z, yaw, width: 18, depth: 7, height: 3.2, color: 0x6a6450, roof: TIN, door: 3, name: 'hut' });
    }
    for (let i = 0; i < 5; i++) props.crates({ x: -60 + i * 28, z: 395 + R() * 20, yaw: R() * 3 });
    for (let i = 0; i < 5; i++) props.crates({ x: -70 + i * 28, z: -395 - R() * 20, yaw: R() * 3 });
    // ---- the telegraph line along the road
    for (let z = -540; z < 540; z += 40) {
      const x = roadX(z) + 9;
      if (near(x, z, 16) || roadDist(x, z) < 3) continue;
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 3.5, z, 0.22, 7, 0.22, 0, 0x4a3a2a);
      props.box('plain', x, g + 6.6, z, 1.6, 0.12, 0.12, 0, 0x4a3a2a);
    }
    // ---- the hilltop positions and their stripped trees
    for (const [x, z] of [[285, 245], [322, 225], [304, 255]]) props.sandbagRing({ x, z, radius: 4, toward: -1 });
    for (const [x, z] of [[320, -290], [356, -268], [338, -300]]) props.sandbagRing({ x, z, radius: 4, toward: 1 });
    for (const [cx, cz] of [[304, 232], [338, -278]]) {
      for (let i = 0; i < 20; i++) {
        const x = cx + (R() - 0.5) * 80, z = cz + (R() - 0.5) * 70, g = terrain.heightAt(x, z), h = 2 + R() * 4;
        if (near(x, z, 10) || roadDist(x, z) < 5) continue;
        props.box('plain', x, g + h / 2, z, 0.35, h, 0.35, R() * 3, 0x3a3228, (R() - 0.5) * 0.3);
      }
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x6a6444);
    props.finish();
    lakes.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 7 || offStrip(x, z) < 20 || wetQ(x, z) < 1.1 }];
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 8000, broadleaf: 1, autumn: 0, maxY: 90, size: 1.15,
      forest: (x: number, z: number) => {
        if (roadDist(x, z) < 8 || near(x, z, 30) || wetQ(x, z) < 1.15) return -1;
        const j = jungle(x, z);
        return j > 0.55 ? 1 : j > 0.25 ? 0.12 : -1;           // (the paddies open: trees only in the groves)
      },
    });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: null });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); grass.update(dt, t); },
    };
  },
} satisfies MapDef;
