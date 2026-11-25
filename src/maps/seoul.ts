// Seoul, spring 1985 (the big field, 1.0 × 1.12 km): the northern half of the capital in the war of 1985 that never
// came — the KPA has forced Uijeongbu and comes down the old invasion road through Dobong and the Mia-ri pass, as its
// tanks did on 28 June 1950, against the ROK Army and the US garrison of Yongsan. The ground is Seoul's own bowl: the
// old walled city fills a basin ringed by granite — Bukhansan's great massif over the north-west, Inwangsan's ridge
// down the west with Seodaemun and its prison at its foot, little Naksan on the east, Namsan standing over the south
// with N Seoul Tower on top — and the Han sweeps round the south-east in its wide bend, a quarter of a mile of water
// with Achasan over its north bank; the Jungnangcheon comes down from Wolgye on the east to meet it. In the basin:
// Jongno and its hanok lanes, Gyeongbokgung palace with the domed Capitol before it under Bugaksan, stretches of the
// Joseon city wall where the streets left it standing, Heunginjimun (the East Gate), Sungnyemun (the South Gate) and
// Hyehwamun; Seoul station west of Namsan on the Gyeongbu line; outside the walls the new Seoul's rows of apartment
// blocks, all facing south, beside the old tiled hanok neighbourhoods. Gwanaksan rises beyond the Han in the far
// south-west corner. The ROK and US hold the south (+z: Yongsan), the KPA the north (-z: Dobong, the road from Uijeongbu).
// Fairness by distance: each side has its own way into the bowl (the KPA through the Mia-ri pass, the ROK round
// Namsan), its own hill over the city (Bugaksan, Namsan), its own crossing of the Jungnangcheon to the hills on the far
// bank (Bonghwasan, Achasan) and the Jangan ford between them; Bukhansan's heights over the KPA are answered by
// Namsan, Gwanaksan and the Han over the ROK's flank, and the points' leads sum to about nil (tools/map_fairness.py).
// The city leaves no room for a runway (airfields: []).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const LAND = 4;         // the city's level
const HW = 12;          // the Jungnangcheon's half-width (the Han's is its own, per point)
const noise = createNoise2D(1985_81);

// ---- the Jungnangcheon down the east, north to south, into the Han; the Han's wide bend round the south-east
const JUNG = [[262, -640], [238, -480], [270, -330], [244, -190], [262, -40], [246, 70], [290, 170], [360, 235]];
const HAN = [[700, -40, 46], [560, 40, 46], [455, 150, 44], [380, 260, 42], [300, 390, 42], [258, 520, 44], [262, 640, 46], [300, 800, 46]];
const CROSS = [
  { name: 'Wolgye bridge', x: 270, z: -330, kind: 'bridge', width: 14, channel: 0 },
  { name: 'Jangan ford', x: 257, z: -5, kind: 'ford', width: 18, channel: 0 },
  { name: 'Junggok bridge', x: 250, z: 85, kind: 'bridge', width: 14, channel: 0 },
];
const river = createRiver({ paths: [JUNG, HAN], halfWidth: HW, level: 0, depth: 2.6, valley: 32, crossings: CROSS });
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
/** Distance to the water's centre line, the Han's counted from as far out as the stream's (its banks are its own width) */
const riverD = (x: number, z: number) => {
  let d = Infinity;
  for (let i = 0; i < JUNG.length - 1; i++) d = Math.min(d, segDist(x, z, JUNG[i], JUNG[i + 1]));
  for (let i = 0; i < HAN.length - 1; i++) d = Math.min(d, segDist(x, z, HAN[i], HAN[i + 1]) - (HAN[i][2] - HW));
  return d;
};

const points: ControlPointDef[] = [
  { id: 'A', name: 'Yongsan', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Namsan', x: 55, z: 255, owner: null, sector: 'centre', radius: 24 },
  { id: 'C', name: 'Seoul station', x: -150, z: 300, owner: null, sector: 'west' },
  { id: 'D', name: 'Achasan', x: 395, z: 70, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Seodaemun', x: -265, z: 35, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Jongno', x: 10, z: 5, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Jangan ford', x: 232, z: -5, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Bugaksan', x: -95, z: -255, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Mia-ri pass', x: 120, z: -240, owner: null, sector: 'centre' },
  { id: 'J', name: 'Bonghwasan', x: 380, z: -200, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Dobong', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- roads: the Uijeongbu road down through the Mia-ri pass into Jongno and round Namsan to Yongsan; a west road
// under Inwangsan past Seodaemun; the east road over the Jungnangcheon; the city's own streets
const ROADS: number[][][] = [
  [[0, -640], [0, -BASE_Z], at('K'), [60, -380], at('I'), [80, -140], at('F'), [-40, 120], [-60, 220], [-40, 380], at('A'), [0, BASE_Z], [0, 640]], // Uijeongbu road – Jongno – Yongsan
  [[0, BASE_Z], [-110, 420], at('C'), [-250, 200], at('E'), [-230, -150], at('H'), [-80, -380], [0, -BASE_Z]],                                     // west: under Inwangsan
  [[0, -BASE_Z], [160, -420], [230, -332], [300, -335], at('J'), [330, -120], [292, 0], at('G'), [213, 101], [150, 260], [110, 400], [0, BASE_Z]], // east: over the stream and back by the ford
  [[213, 101], [287, 69], at('D')],                                                                                                                      // up Achasan
  [at('F'), [140, -30], at('G')], [at('E'), [-120, 10], at('F')],                                                                                 // Jongno, out through the East Gate to the ford; Seodaemun's road
  [[-60, 220], at('B')], [[-40, 120], [150, 140], [230, 100]],                                                                                    // Namsan's road; Euljiro
  [at('H'), [-120, -150], [-120, -110]], [[-40, -78], [-40, 60]], [[-120, -110], [120, -120]], [[-80, 60], [140, 60]],                                                       // Sejong-ro, Yulgok-ro, Toegye-ro
];
function roadDistExact(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
const CACHE = { x: 580, z: 640 };
/** The road distance, sampled once onto a 2 m grid over the field and a margin (every height sample asked it twice). */
const roadDist = gridCacheSmooth(roadDistExact, CACHE, 3);
// the Gyeongbu line up from the Han through Seoul station, the Gyeongui line west out of it (decoration: level crossings)
const RAIL = [[-60, 640], [-90, 480], [-130, 360], [-175, 290], [-250, 250], [-360, 225], [-520, 215]];
const railDist = gridCacheSmooth((x: number, z: number) => { let d = Infinity; for (let i = 0; i < RAIL.length - 1; i++) d = Math.min(d, segDist(x, z, RAIL[i], RAIL[i + 1])); return d; }, CACHE, 4);

// the hills with points on them and the low rises, each half its own: [x, z, radius, height]
const HILLS = [[55, 255, 72, 27], [-95, -255, 70, 24], [395, 70, 62, 18], [380, -200, 66, 17],
  [175, -95, 45, 9], [-200, 395, 40, 8], [140, -380, 42, 10]];                                // Naksan, Yongsan's knoll, Mia-ri's shoulder
const BIG_HILLS = { nato: [[55, 255], [395, 70]], pact: [[-95, -255], [380, -200]] };
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillHExact(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d = (Math.hypot(x - hx, z - hz) / r) * warp(x, z);
    h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  return h;
}
const hillH = gridCacheSmooth(hillHExact, CACHE, 4);

/** Low ground (0): along the roads, round the points and bases. */
function lowD(x: number, z: number) {
  let d = roadDist(x, z) - 14;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 55);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x, z - bz) - 70);
  return d;
}
/** The granite round the bowl: Bukhansan (north-west), Inwangsan's ridge (west), Gwanaksan beyond the Han (south-west corner). */
const MASSES = [{ x: -340, z: -420, rx: 190, rz: 160, k: 0.82 }, { x: -420, z: -60, rx: 95, rz: 175, k: 0.6 }, { x: -440, z: 500, rx: 250, rz: 175, k: 1 }];
function massExact(x: number, z: number) {
  let m = 0;
  for (const q of MASSES) m = Math.max(m, q.k * smoothstep(1.0, 0.45, Math.hypot((x - q.x) / q.rx, (z - q.z) / q.rz) + 0.14 * fbm(noise, x * 0.01 - 30 + q.x, z * 0.01, 2)));
  return m * smoothstep(8, 70, lowD(x, z));
}
const mountK = gridCacheSmooth(massExact, CACHE, 3);
/** The walled old city round Jongno (an ellipse; the wall runs just outside it). */
const CITY = { x: 0, z: -10, rx: 150, rz: 135 };
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

const openS = gridCacheSmooth(openK, CACHE, 3);
function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = LAND + n * 1.5 + hillH(x, z);
  const mk = mountK(x, z);
  if (mk > 0) h += mk * (30 + ridged(noise, x * 0.007 + 9, z * 0.007, 4) * 85);
  const ok = openS(x, z);
  if (ok > 0) h += (LAND + Math.round(n * 4) * 0.3 - h) * ok;                     // levelled building plots
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, -z) * 22;                         // Dobongsan behind the north edge
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const openC = gridCache((x: number, z: number) => openK(x, z), BOUNDS);
/** Pine and oak on Bukhansan, the eastern hills and the flank hills. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(5, 12, hillH(x, z)), smoothstep(0.06, 0.25, mountK(x, z)))
  * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
const rows = (x: number, z: number) => Math.abs((((x + z * 0.1) % 7) + 7) % 7 - 3.5) > 2.6;

/** A hanok: one storey of white plaster between dark timbers under a heavy grey tile roof, its eaves deep. */
function hanok(props: any, { x, z, yaw, w, d }: any) {
  const r = props.rand;
  const b = props.beginBuilding('hanok', x, z, yaw, w, d);
  const wall = [0xd8d2c4, 0xccc4b2, 0xe0dacc][Math.floor(r() * 3)];
  b.plaster = wall;
  props.shell(b, { height: 3, storeys: 1, t: 0.35, color: wall, bay: 2.2, sill: 1.0, head: 2.3, frame: 0x4a3626, front: [(r() - 0.5) * w * 0.4] });
  props.piece('stone', b, 0, 0.2, 0, w + 0.4, 0.6, d + 0.4, 0x8a867c);
  props.gableRoof(b, { eave: 3, pitch: 0.55, t: 0.4, overhang: 1.0, color: r() < 0.8 ? 0x3e4446 : 0x4a4038 });
  props.endBuilding();
}

export default {
  id: 'seoul',
  name: 'Seoul',
  description: 'Northern Seoul, spring 1985: the KPA comes down the Uijeongbu road through Dobong and the Mia-ri pass into the capital’s granite bowl — the old walled city and its gates, Gyeongbokgung, apartment blocks beside hanok lanes, Bukhansan over the north-west, Namsan over the south and the Han’s wide bend round the south-east.',
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
      const c = river.crossings.find((q) => q.kind === 'bridge' && Math.sign(q.z) === m)!;
      const x = c.x - 40, z = c.z + m * 26;
      if (roadDist(x, z) > 8) works.push({ kind: 'trench', x, z, yaw: m > 0 ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);
    props.rand = mulberry32(1985_82);
    const r0 = props.rand;
    const PALACE = { x: -40, z: -105, w: 56, d: 50 };
    const PRISON = { x: -215, z: 70, w: 48, d: 34 };
    const inRect = (q: { x: number, z: number, w: number, d: number }, x: number, z: number, m: number) => Math.abs(x - q.x) < q.w / 2 + m && Math.abs(z - q.z) < q.d / 2 + m;
    const free = (x: number, z: number, r: number) => roadDist(x, z) > 7 + r && railDist(x, z) > 6 + r && riverD(x, z) > HW + 12 + r
      && !nearPoint(x, z, 16 + r) && mountK(x, z) < 0.05 && hillH(x, z) < 6 && Math.hypot(x, Math.abs(z) - BASE_Z) > 45
      && !inRect(PALACE, x, z, r + 4) && !inRect(PRISON, x, z, r + 4) && Math.abs(cityE(x, z) - 1.06) * 140 > r + 3;

    // ---- the Gyeongbu line, Seoul station by the road south of the walls
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    props.townHouse({ x: -125, z: 336, yaw: Math.PI / 2 + 0.57, width: 26, depth: 11, storeys: 2, name: 'Seoul station', damaged: 0 });
    props.wagon({ x: -116.7, z: 400, yaw: Math.PI / 2 + 0.32, kind: 'box', color: 0x3e5a4a });
    // ---- the old city: tiled hanok and two-storey shops in the lanes
    for (let gx = -150; gx <= 140; gx += 15) for (let gz = -150; gz <= 130; gz += 14) {
      const x = gx + (r0() - 0.5) * 4, z = gz + (r0() - 0.5) * 4;
      if (townK(x, z) < 0.5 || !free(x, z, 3) || r0() < 0.2) continue;
      const yaw = r0() < 0.5 ? 0 : Math.PI / 2;
      if (r0() < 0.65) hanok(props, { x, z, yaw, w: 9 + r0() * 2, d: 6 + r0() * 2 });
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
    gate('Hyehwamun', -1.0);
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
    for (const s of [-1, 1]) props.box('stone', -238 + s * 3.4, terrain.heightAt(-238, 110) + 3.5, 110, 2.4, 7, 3.4, 0, 0xb0aca2);
    props.box('stone', -238, terrain.heightAt(-238, 110) + 7.6, 110, 9.4, 1.4, 3.8, 0, 0xb0aca2);
    // ---- Namsan: N Seoul Tower on the summit; the temple on Bugaksan's knoll
    const tx = 80, tz = 275, ty = terrain.heightAt(tx, tz);
    props.box('plain', tx, ty + 24, tz, 5, 48, 5, 0, 0xd8d6d0);
    props.box('plain', tx, ty + 50, tz, 14, 6, 14, 0.4, 0xc8c6c0);
    props.box('metal', tx, ty + 66, tz, 1, 26, 1, 0, 0xb84a3a);
    props.hall({ x: -122, z: -236, yaw: -0.3, width: 12, depth: 8, height: 4, color: 0x8a3a2a, roof: 0x3e4a44, door: 3, name: 'temple hall' });
    // ---- the villages on the eastern hills
    for (const p of points) if ('DJ'.includes(p.id)) {
      props.rand = mulberry32(9800 + Math.round(p.x * 3 + p.z));
      for (let i = 0; i < 10; i++) { const a = props.rand() * 6.28, d = 20 + props.rand() * 36, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (roadDist(x, z) > 9 && riverD(x, z) > HW + 18 && Math.abs(x) < 490) hanok(props, { x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, w: 9, d: 6.5 }); }
    }
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
        if (r() < 0.75) hanok(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 9 + r() * 2, d: 6 + r() });
        else props.flatHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 2, depth: 8, storeys: 2, name: 'shop house' });
      }
      for (const [hx, hz] of BIG_HILLS[m > 0 ? 'nato' : 'pact']) props.mast({ x: hx + 9 * m, z: hz - 7 * m, height: 10 });
    }
    // ---- the Hannam bridge over the Han beyond the south edge: deck on piers
    for (let x = 180; x <= 345; x += 20) props.box('stone', x, -1.5, 610, 3, 7, 3, 0, 0x8a8880);
    props.box('plain', 262, 2.4, 610, 175, 0.8, 16, 0, 0x7a7872);
    for (const s of [-1, 1]) props.box('metal', 262, 3.3, 610 + s * 7.6, 175, 1, 0.3, 0, 0x5a6a72);
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
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 6000, broadleaf: 0.55, autumn: 0.03, maxY: LAND + 140,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
