// Seoul, spring 1985 (the big field, 1.0 × 1.12 km): the northern half of the capital in the war of 1985 that never
// came — the KPA has forced Uijeongbu and comes down the old invasion road through Dobong and the Mia-ri pass, as its
// tanks did on 28 June 1950, against the ROK Army and the US garrison of Yongsan. The old walled city fills the middle:
// Jongno and its hanok lanes, Gyeongbokgung palace with the domed Capitol in front of it, stretches of the Joseon city
// wall where the streets left it standing, Heunginjimun (the East Gate), Sungnyemun (the South Gate) and Hyehwamun.
// Seodaemun, its prison and the Independence Gate west of the walls; Seoul station south of them on the Gyeongbu line.
// Outside the walls the new Seoul: rows of five- and twelve-storey apartment blocks, all facing south, beside the old
// tiled hanok neighbourhoods. Bukhansan's granite stands steep and wooded on the west flank (too steep for vehicles,
// map.steep), the Bonghwasan–Achasan hills close the east. The Jungnangcheon runs down the east from Wolgye towards the
// Han, its banks market gardens; two bridges and the Jangan ford cross it. The Han itself, with the Hangang and Hannam
// bridges, runs past the south edge behind Yongsan. Namsan and N Seoul Tower over the south, Bugaksan over the north.
// The ROK and US hold the south (+z: Yongsan, the Han), the KPA the north (-z: Dobong, the road from Uijeongbu).
// Fairness: not a mirror — the Jungnangcheon wanders its own way, the walled city, palace, prison and station are each
// half's own, the apartment districts are each half's own dice — but Bukhansan and the eastern hills straddle the
// middle so neither side starts on them, each side has its own bridge over the Jungnangcheon at the same distance from
// its base (z ±422) and the one ford lies on the centre line, each side has a wooded hill on each flank of the same
// height (Namsan and Achasan against Bugaksan and Bonghwasan), the Mia-ri pass's two hills are answered by Namsan's
// spurs near Yongsan, Seodaemun (west, a little nearer the ROK) is answered by the Jangan ford (east, a little nearer
// the KPA), and the points lie at about the same distances (measured: tools/map_fairness.py). The city leaves no
// room for a runway (airfields: []).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildVillage, commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const LAND = 4;         // the city's level
const HW = 12;          // the Jungnangcheon's half-width
const noise = createNoise2D(1985_81);

// ---- the Jungnangcheon down the east, north to south, into the Han; the Han along the south edge (outside the field)
const JUNG = [[215, -600], [210, -480], [178, -380], [192, -250], [208, -140], [190, -30], [160, 70], [172, 190], [202, 310], [190, 430], [168, 560], [150, 690]];
const HAN = [[-820, 700, 58], [-300, 678, 58], [150, 700, 62], [820, 668, 58]];
const CROSS = [
  { name: 'Wolgye bridge', x: 185, z: -422, kind: 'bridge', width: 14, channel: 0 },
  { name: 'Jangan ford', x: 190, z: -30, kind: 'ford', width: 18, channel: 0 },
  { name: 'Junggok bridge', x: 190, z: 422, kind: 'bridge', width: 14, channel: 0 },
];
const river = createRiver({ paths: [JUNG, HAN], halfWidth: HW, level: 0, depth: 2.6, valley: 34, crossings: CROSS });
const riverD = (x: number, z: number) => river.project(x, z).d;

// ---- roads: the Uijeongbu road down the middle, a west road under Bukhansan, an east road over the Jungnangcheon
const ROADS: number[][][] = [
  [[0, 530], [0, 470], [30, 360], [45, 255], [15, 120], [30, -15], [-15, -130], [-85, -235], [-15, -400], [0, -470], [0, -530]], // Uijeongbu road: Yongsan – Mia-ri – Dobong
  [[0, 470], [-180, 420], [-320, 290], [-300, 160], [-225, 36], [-255, -100], [-295, -335], [-180, -430], [0, -470]],           // west: under Bukhansan
  [[0, 470], [260, 400], [275, 325], [270, 150], [252, -35], [280, -180], [355, -275], [260, -400], [0, -470]],                // east: over the two bridges
  [[-320, 290], [45, 255]], [[-295, -335], [-85, -235]],                                                                       // laterals, each half its own
  [[-225, 36], [30, -15]], [[30, -15], [252, -35]],                                                                             // Jongno, out through the East Gate to the ford
  [[-120, 82], [120, 55]], [[-20, -60], [120, -100]], [[-65, -62], [-62, 6]],                                                  // Euljiro, Yulgok-ro, Sejong-ro
  [[0, 530], [-60, 600], [-120, 660], [-120, 800]],                                                                            // to the Hangang bridge (beyond the field)
];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function roadDistExact(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
/** The road distance, sampled once onto a 2 m grid over the field and a margin (every height sample asked it twice). */
const roadDist = gridCacheSmooth(roadDistExact, { x: 640, z: 820 }, 2);
// the Gyeongbu line up from the Han through Seoul station, the Gyeongui line west out of it (decoration: level crossings)
const RAIL = [[-40, 580], [-35, 400], [-20, 262], [-60, 170], [-150, 140], [-250, 125], [-300, 122]];
const railDist = (x: number, z: number) => Math.min(...RAIL.slice(1).map((b, i) => segDist(x, z, RAIL[i], b)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Yongsan', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Namsan', x: -320, z: 290, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Seoul station', x: 45, z: 255, owner: null, sector: 'centre' },
  { id: 'D', name: 'Achasan', x: 275, z: 325, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Seodaemun', x: -225, z: 36, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Jongno', x: 30, z: -15, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Jangan ford', x: 252, z: -35, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Bugaksan', x: -295, z: -335, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Mia-ri pass', x: -85, z: -235, owner: null, sector: 'centre' },
  { id: 'J', name: 'Bonghwasan', x: 355, z: -275, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Dobong', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// the hills, each half its own: [x, z, radius, height] (the four flank hills first, the same height a side)
const HILLS = [[-320, 290, 70, 22], [275, 325, 66, 20], [-295, -335, 72, 22], [355, -275, 68, 20],
  [-150, 385, 50, 11], [95, 345, 38, 9], [-165, -250, 45, 12], [-5, -285, 40, 9],          // Namsan's spurs, the Mia-ri pass
  [-440, 460, 70, 14], [440, 470, 70, 16], [-450, -460, 70, 15], [450, -450, 66, 15]];
const BIG_HILLS = { nato: [[-320, 290], [275, 325]], pact: [[-295, -335], [355, -275]] };
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillHExact(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d = (Math.hypot(x - hx, z - hz) / r) * warp(x, z);
    h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  return h;
}
/** The hills' height, sampled once onto a 2 m grid (twelve noisy hills, asked twice a height sample). */
const hillH = gridCacheSmooth(hillHExact, { x: 640, z: 820 }, 2);

/** Low ground (0): along the roads, round the points and bases. */
function lowD(x: number, z: number) {
  let d = roadDist(x, z) - 14;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 55);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x, z - bz) - 70);
  return d;
}
/** Bukhansan over the west, the Bonghwasan–Achasan hills east of the Jungnangcheon: both astride the middle. */
function mass(x: number, z: number) {
  const bukhan = smoothstep(1.0, 0.62, Math.hypot((x + 430) / 160, (z + 15) / 225) + 0.12 * fbm(noise, x * 0.01 - 30, z * 0.01, 2));
  const east = smoothstep(1.0, 0.6, Math.hypot((x - 475) / 100, (z + 5) / 235) + 0.12 * fbm(noise, x * 0.01 + 70, z * 0.01, 2)) * 0.55;
  return Math.max(bukhan, east);
}
const mountK = (x: number, z: number) => mass(x, z) * smoothstep(8, 80, lowD(x, z));
/** The walled old city round Jongno (an ellipse; the wall runs just outside it). */
const CITY = { x: -5, z: -10, rx: 150, rz: 140 };
const cityE = (x: number, z: number) => Math.hypot((x - CITY.x) / CITY.rx, (z - CITY.z) / CITY.rz);
const townK = (x: number, z: number) => smoothstep(1.0, 0.85, cityE(x, z));
/** The open city ground: flat land away from the hills, roads, points, walled city and the river's banks. */
function openK(x: number, z: number) {
  if (roadDist(x, z) < 8 || nearPoint(x, z, 40) || railDist(x, z) < 7 || riverD(x, z) < HW + 26) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(0.06, 0.01, mountK(x, z)) * (1 - townK(x, z))
    * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x)) * smoothstep(55, 70, Math.hypot(x, Math.abs(z) - BASE_Z));
}
/** The new apartment districts (>0.15), the old hanok neighbourhoods between, market gardens along the Jungnangcheon. */
const blob = (x: number, z: number) => fbm(noise, x * 0.006 + 13, z * 0.006 - 7, 2) + 0.15;
const gardenK = (x: number, z: number) => smoothstep(HW + 95, HW + 60, riverD(x, z));

function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = LAND + n * 1.5 + hillH(x, z);
  const mk = mountK(x, z);
  if (mk > 0) h += mk * (32 + ridged(noise, x * 0.007 + 9, z * 0.007, 4) * 90);
  const ok = openK(x, z);
  if (ok > 0) h += (LAND + Math.round(n * 4) * 0.3 - h) * ok;                     // levelled building plots
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * (20 + ridged(noise, x * 0.01, z * 0.01, 3) * 24) * smoothstep(640, 580, z);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, -z) * 22;                         // Dobongsan behind the north edge (the Han's flats behind the south)
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const openC = gridCache((x: number, z: number) => openK(x, z), BOUNDS);
/** Pine and oak on Bukhansan, the eastern hills and the flank hills. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(5, 12, hillH(x, z)), smoothstep(0.06, 0.25, mountK(x, z)))
  * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
const rows = (x: number, z: number) => Math.abs((((x + z * 0.1) % 7) + 7) % 7 - 3.5) > 2.6;

export default {
  id: 'seoul',
  name: 'Seoul',
  description: 'Northern Seoul, spring 1985: the KPA comes down the Uijeongbu road through Dobong and the Mia-ri pass into the capital — the old walled city and its gates, Gyeongbokgung, apartment blocks beside hanok lanes, Bukhansan’s granite on the west, the Jungnangcheon on the east and the Han behind Yongsan.',
  epochs: ['1985'],
  region: 'korea',
  airfields: [], // (the city fills the ground between the mountains: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['rok', 'us'], pact: ['kpa'] }, // (the ROK Capital Defence Command and the US garrison of Yongsan against the Korean People's Army)
  sides: { nato: 'South Korea', pact: 'North Korea' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  steep: 0.6, // (Bukhansan's granite: vehicles keep to the streets)
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a clear May day, the hills fresh green, a little haze over the city
    fogColor: 0xbcc2c6, fogDensity: 0.0012,
    skyTop: 0x5078ac, skyHorizon: 0xd0d6da, skyBottom: 0x7a7c70,
    sunColor: 0xfff2dc, sunIntensity: 2.0, sunDisk: 0.4,
    clouds: 0.35, cloudLight: 0xf4f4f0, cloudDark: 0x9aa0a6,
    sunDir: [0.35, 0.7, 0.55],
    hemiSky: 0xc8d2de, hemiGround: 0x52583a, hemiIntensity: 1.3,
    rimColor: 0xd2d6da, rimIntensity: 0.2,
    terrain: {
      grass: '#5a7232', grassAlt: '#52682c', dryGrass: '#868446', dirt: '#6a5a42', rock: '#787468',
      pasture: '#5c7432', ploughed: '#5e4c36', stubble: '#868446', meadow: '#66803a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < (townK(x, z) > 0.5 ? 5 : 4.5)) return [0x6e6c68, 0.88];               // asphalt
        if (railDist(x, z) < 3) return [0x4e4a44, 0.9];                                            // ballast
        if (townK(x, z) > 0.6) return [0x8a8274, 0.6];                                             // lanes and yards
        if (riverD(x, z) < HW + 22 && y < 2.2) return [0x9e9884, 0.8];                             // the stream's gravel banks
        const ok = openC(x, z);
        if (ok > 0.3) {
          if (gardenK(x, z) > 0.5) return [rows(x, z) ? 0x5e4c36 : 0x5e8434, ok * 0.85];          // market gardens
          if (blob(x, z) > 0.15) return [0x8e8a80, ok * 0.7];                                     // the apartment yards
          return [noise(x * 0.05, z * 0.05) > 0 ? 0x847a68 : 0x6e7448, ok * 0.6];                 // the hanok lanes and their yards
        }
        if (y > LAND + 50) return [0xaaa69c, smoothstep(0.0, 0.5, noise(x * 0.025, z * 0.025)) * smoothstep(LAND + 50, LAND + 85, y) * 0.9]; // Bukhansan's bare granite
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1st Platoon', facing: 0 }],
  },

  // trenches and MG nests on each side's two flank hills, a dug-in post above its own bridge
  battlefield() {
    const works: any[] = [];
    for (const [f, m] of [['nato', 1], ['pact', -1]] as const) {
      for (const [hx, hz] of BIG_HILLS[f]) {
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + (m > 0 ? 0.2 : 0.7), x = hx + Math.cos(ang) * 32, z = hz + Math.sin(ang) * 32;
          if (roadDist(x, z) < 6) continue;
          works.push({ kind: a % 2 ? 'mgNest' : 'trench', x, z, yaw: Math.atan2(Math.cos(ang), Math.sin(ang)), faction: f });
        }
      }
      const c = river.crossings.find((q) => Math.sign(q.z) === m && Math.abs(q.z) > 300)!;
      const x = c.x - 40, z = c.z - m * 30;
      if (roadDist(x, z) > 8) works.push({ kind: 'trench', x, z, yaw: m > 0 ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);
    props.rand = mulberry32(1985_82);
    const r0 = props.rand;
    const PALACE = { x: -65, z: -95, w: 56, d: 50 };
    const PRISON = { x: -180, z: 75, w: 48, d: 34 };
    const inRect = (q: { x: number, z: number, w: number, d: number }, x: number, z: number, m: number) => Math.abs(x - q.x) < q.w / 2 + m && Math.abs(z - q.z) < q.d / 2 + m;
    const free = (x: number, z: number, r: number) => roadDist(x, z) > 7 + r && railDist(x, z) > 6 + r && riverD(x, z) > HW + 12 + r
      && !nearPoint(x, z, 16 + r) && mountK(x, z) < 0.05 && hillH(x, z) < 6 && Math.hypot(x, Math.abs(z) - BASE_Z) > 45
      && !inRect(PALACE, x, z, r + 4) && !inRect(PRISON, x, z, r + 4) && Math.abs(cityE(x, z) - 1.06) * 140 > r + 3;

    // ---- the Gyeongbu line, Seoul station by the road south of the walls
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    props.townHouse({ x: 0, z: 285, yaw: Math.PI / 2 - 0.1, width: 26, depth: 11, storeys: 2, name: 'Seoul station', damaged: 0 });
    props.wagon({ x: -28.5, z: 340, yaw: Math.PI / 2 - 0.03, kind: 'box', color: 0x3e5a4a });
    // ---- the old city: tiled hanok and two-storey shops in the lanes
    for (let gx = -150; gx <= 140; gx += 15) for (let gz = -150; gz <= 130; gz += 14) {
      const x = gx + (r0() - 0.5) * 4, z = gz + (r0() - 0.5) * 4;
      if (townK(x, z) < 0.5 || !free(x, z, 3) || r0() < 0.2) continue;
      const yaw = r0() < 0.5 ? 0 : Math.PI / 2;
      if (r0() < 0.65) props.house({ x, z, yaw, width: 9 + r0() * 2, depth: 6 + r0() * 2, height: 2.8 });
      else props.flatHouse({ x, z, yaw, width: 8 + r0() * 3, depth: 8 + r0() * 2, storeys: 2 + Math.floor(r0() * 2), name: 'shop house' });
    }
    // ---- the city wall: the stretches the streets left standing, a gap at every road
    const wallAt = (a: number) => [CITY.x + Math.cos(a) * CITY.rx * 1.06, CITY.z + Math.sin(a) * CITY.rz * 1.06];
    const SEG = 7, nSeg = Math.round((2 * Math.PI * 152) / SEG);
    for (let i = 0; i < nSeg; i++) {
      const a = (i / nSeg) * Math.PI * 2, [x, z] = wallAt(a), [x2, z2] = wallAt(a + 0.01);
      if (roadDist(x, z) < 12 || railDist(x, z) < 9 || nearPoint(x, z, 30) || noise(Math.cos(a) * 3, Math.sin(a) * 3) < -0.25) continue;
      props.lowWall({ x, z, yaw: Math.atan2(-(z2 - z), x2 - x), length: SEG + 0.3, height: 2.6, color: 0x9a948a });
    }
    // the gates: each beside the road where it leaves the walls (its pavilion roof on a stone base)
    const gate = (name: string, a0: number) => {
      let best = a0, bd = Infinity;
      for (let a = a0 - 0.5; a <= a0 + 0.5; a += 0.005) { const [x, z] = wallAt(a), d = roadDist(x, z); if (d < bd) { bd = d; best = a; } }
      let a = best; while (a < best + 0.6 && roadDist(...(wallAt(a) as [number, number])) < 15) a += 0.005;
      const [x, z] = wallAt(a), [x2, z2] = wallAt(a + 0.01), yaw = Math.atan2(-(z2 - z), x2 - x);
      props.box('stone', x, terrain.heightAt(x, z) + 2.5, z, 14, 5, 8, yaw, 0x8a867c);
      props.hall({ x, z, yaw, width: 13, depth: 7, height: 3, color: 0x8a3a2a, roof: 0x3e4644, door: 0, name });
    };
    gate('Heunginjimun', -0.1);
    gate('Sungnyemun', Math.PI / 2 - 0.05);
    gate('Hyehwamun', -Math.PI / 2 + 0.05);
    // ---- Gyeongbokgung: its wall, Gwanghwamun, the throne hall and pavilions; the domed Capitol before it
    for (const [dx, dz, len, yaw] of [[0, -PALACE.d / 2, PALACE.w, 0], [0, PALACE.d / 2, PALACE.w, 0], [-PALACE.w / 2, 0, PALACE.d, Math.PI / 2], [PALACE.w / 2, 0, PALACE.d, Math.PI / 2]] as const) {
      const n = Math.round(len / 8);
      for (let i = 0; i < n; i++) {
        const t = -len / 2 + (i + 0.5) * (len / n), x = PALACE.x + dx + (yaw ? 0 : t), z = PALACE.z + dz + (yaw ? t : 0);
        if (dz > 0 && Math.abs(t) < 8) continue; // (the gateway)
        props.lowWall({ x, z, yaw, length: len / n + 0.2, height: 2.4, color: 0x8a5a4a });
      }
    }
    props.hall({ x: PALACE.x, z: PALACE.z + PALACE.d / 2 - 1, yaw: 0, width: 16, depth: 6, height: 3, color: 0x8a3a2a, roof: 0x3e4644, door: 0, name: 'Gwanghwamun' });
    props.box('stone', PALACE.x, terrain.heightAt(PALACE.x, PALACE.z - 11) + 0.6, PALACE.z - 11, 30, 1.6, 18, 0, 0x9a968c);
    props.hall({ x: PALACE.x, z: PALACE.z - 11, yaw: 0, width: 22, depth: 13, height: 6, color: 0x8a3a2a, roof: 0x3e4a44, door: 4, name: 'Geunjeongjeon' });
    props.hall({ x: PALACE.x - 22, z: PALACE.z + 8, yaw: Math.PI / 2, width: 10, depth: 7, height: 4, color: 0x8a3a2a, roof: 0x3e4a44, door: 3, name: 'Gyeonghoeru' });
    props.townHouse({ x: PALACE.x + 4, z: PALACE.z + 9, yaw: 0, width: 34, depth: 10, storeys: 4, name: 'Capitol', damaged: 0 });
    props.box('stone', PALACE.x + 4, terrain.heightAt(PALACE.x + 4, PALACE.z + 9) + 14.5, PALACE.z + 9, 7, 4, 7, 0, 0x7a8a84);
    // ---- Jongno: Bosingak, the bell pavilion at the crossing
    props.hall({ x: 52, z: -42, yaw: 0, width: 9, depth: 7, height: 4, color: 0x8a3a2a, roof: 0x3e4644, door: 3, name: 'Bosingak' });
    // ---- Seodaemun: the brick prison inside its wall, the Independence Gate by the road
    for (const [dx, dz, len, yaw] of [[0, -PRISON.d / 2, PRISON.w, 0], [0, PRISON.d / 2, PRISON.w, 0], [-PRISON.w / 2, 0, PRISON.d, Math.PI / 2], [PRISON.w / 2, 0, PRISON.d, Math.PI / 2]] as const) {
      const n = Math.round(len / 8);
      for (let i = 0; i < n; i++) {
        const t = -len / 2 + (i + 0.5) * (len / n), x = PRISON.x + dx + (yaw ? 0 : t), z = PRISON.z + dz + (yaw ? t : 0);
        if (dz < 0 && Math.abs(t) < 5) continue;
        props.lowWall({ x, z, yaw, length: len / n + 0.2, height: 3.4, color: 0x7a3e30 });
      }
    }
    for (const dx of [-12, 12]) props.hall({ x: PRISON.x + dx, z: PRISON.z + 2, yaw: Math.PI / 2, width: 22, depth: 8, height: 5, color: 0x7a3e30, roof: 0x44403c, door: 2, name: 'Seodaemun prison' });
    for (const s of [-1, 1]) props.box('stone', -262 + s * 3.4, terrain.heightAt(-262, 62) + 3.5, 62, 2.4, 7, 3.4, -0.6, 0xb0aca2);
    props.box('stone', -262, terrain.heightAt(-262, 62) + 7.6, 62, 9.4, 1.4, 3.8, -0.6, 0xb0aca2);
    // ---- Namsan: N Seoul Tower on the summit; the temple on Bugaksan's knoll
    const tx = -300, tz = 268, ty = terrain.heightAt(tx, tz);
    props.box('plain', tx, ty + 24, tz, 5, 48, 5, 0, 0xd8d6d0);
    props.box('plain', tx, ty + 50, tz, 14, 6, 14, 0.4, 0xc8c6c0);
    props.box('metal', tx, ty + 66, tz, 1, 26, 1, 0, 0xb84a3a);
    props.hall({ x: -316, z: -318, yaw: -0.3, width: 12, depth: 8, height: 4, color: 0x8a3a2a, roof: 0x3e4a44, door: 3, name: 'temple hall' });
    // ---- the villages on the eastern hills
    for (const p of points) if ('DJ'.includes(p.id)) buildVillage(props, p, 9800 + Math.round(p.x * 3 + p.z), 1);
    // ---- outside the walls, each half its own dice: rows of apartment blocks facing south, hanok neighbourhoods between
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_83 + m);
      const r = props.rand;
      for (let gx = -470; gx <= 470; gx += 36) for (let gz = 150; gz <= 520; gz += 28) {
        const x = gx + (r() - 0.5) * 3, z = gz * m + (r() - 0.5) * 3;
        if (openC(x, z) < 0.5 || blob(x, z) < 0.15 || gardenK(x, z) > 0.3 || !free(x, z, 16) || r() < 0.2) continue;
        props.ruinBlock({ x, z, yaw: 0, width: 30, depth: 11, storeys: r() < 0.25 ? 12 : 5, ruin: 0, name: 'apartment block' });
      }
      for (let i = 0; i < 260; i++) {
        const x = (r() * 2 - 1) * 470, z = (110 + r() * 410) * m;
        if (openC(x, z) < 0.5 || blob(x, z) > 0.1 || gardenK(x, z) > 0.3 || !free(x, z, 5)) continue;
        if (r() < 0.75) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9 + r() * 2, depth: 6 + r(), height: 2.8 });
        else props.flatHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 2, depth: 8, storeys: 2, name: 'shop house' });
      }
      for (const [hx, hz] of BIG_HILLS[m > 0 ? 'nato' : 'pact']) props.mast({ x: hx + 9 * m, z: hz - 7 * m, height: 10 });
    }
    // ---- the Han's bridges beyond the south edge: deck on piers
    for (const bx of [-120, 210]) {
      for (let z = 605; z <= 765; z += 20) props.box('stone', bx, -1.5, z, 3, 7, 3, 0, 0x8a8880);
      props.box('plain', bx, 2.4, 685, 16, 0.8, 175, 0, 0x7a7872);
      for (const s of [-1, 1]) props.box('metal', bx + s * 7.6, 3.3, 685, 0.3, 1, 175, 0, 0x5a6a72);
    }
    props.rand = mulberry32(1985_84);
    for (const c of river.crossings) props.sandbagRing({ x: c.x - 34, z: c.z + (c.z > 0 ? -22 : c.z < -200 ? 22 : 24), radius: 4.5, toward: c.z > 0 ? -1 : 1 });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || railDist(x, z) < 5 || openC(x, z) > 0.2 || townK(x, z) > 0.3 || riverD(x, z) < HW + 24
        || inRect(PALACE, x, z, 6) || inRect(PRISON, x, z, 6) || z > BOUNDS.z + 20 },
    ];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 12000, broadleaf: 0.55, autumn: 0.03, maxY: LAND + 140,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
