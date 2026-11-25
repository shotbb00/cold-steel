// Oahu, 1942: the Schofield plateau (1945 only; the big field, 1.0 × 1.12 km; the Pacific: the US Army's Hawaiian
// Division against an Imperial Japanese Army landing force). The invasion that Pearl Harbor might have opened the way
// for: Yamamoto's staff did plan it — land on the north shore at Haleiwa and Waialua and drive south across the
// central plateau to Pearl Harbor. Every road south runs over the Leilehua (Schofield) plateau between the Waianae
// range (west) and the Koolau (east): pineapple and sugar cane in red earth, eucalyptus windbreaks, Schofield
// Barracks' concrete quadrangles and Wheeler Field, and in the middle Wahiawa on its tongue of land between the two
// forks of Kaukonahua Stream, whose gulches meet in Lake Wilson west of the town. The Americans come from Wheeler Field
// (+z), the Japanese down the Kamehameha Highway from the Haleiwa road (-z). On the map: the two forks' wooded gulches
// across the middle (the South Fork faces the Americans, the North Fork the Japanese), Lake Wilson filling them where
// they meet and Wahiawa Dam at its west end; the highway over a bridge on each fork into Wahiawa; Kaukonahua Stream
// on west under the Waianae foothills to a ford; the Wahiawa arboretum in the gulch-country east of the town; Schofield
// Barracks and the Kolekole road (to the pass in the Waianae) on the Americans' half, Helemano and the Kaukonahua Road
// on the Japanese, the dry gulches of Waikakalaua and Poamoho in the east.
// Fair, not mirrored: the gulch system lies across the middle — each side has one fork between it and Wahiawa, with a
// highway bridge and a ford upstream on each (the American ford a little nearer the town, the Japanese bridge a little
// further east); the dam and the west ford are shared. The Waianae rise higher than the Koolau, but both flanks run
// the full length of the map, so neither half owns the high ground. Schofield's barracks for the Americans answer
// Helemano's plantation camp for the Japanese, Kolekole road the Kaukonahua Road, Waikakalaua Gulch Poamoho Gulch;
// pineapple, cane and windbreaks on both halves. No side starts on the decisive ground: Wahiawa and the arboretum
// sit between the forks.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields, FIELD } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { commandPost, shellField, trenchLine } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1942_03);
const LEVEL = 2;                      // the streams and Lake Wilson
const FLOOR = LEVEL + 0.9;            // the gulch floor (River.js BANK)

// the streams [x, z, half-width]: Kaukonahua Stream out west from Lake Wilson, the South and North Forks east from it
// (Lake Wilson fills the gulches round the confluence, then the forks narrow to streams)
const MAIN = [[-150, 8, 30], [-215, 4, 30], [-245, 2, 8], [-330, 14, 8], [-430, 6, 8], [-560, 20, 8]];
const SOUTH = [[-150, 8, 30], [-90, 45, 30], [-20, 80, 26], [20, 92, 10], [100, 105, 8], [200, 130, 8], [320, 160, 8], [420, 185, 8], [560, 212, 8]];
const NORTH = [[-150, 8, 30], [-90, -35, 30], [-10, -75, 26], [30, -88, 10], [110, -100, 8], [210, -125, 8], [300, -150, 8], [420, -170, 8], [560, -197, 8]];
const CHANNELS = [MAIN, SOUTH, NORTH];
const CROSSINGS = [
  { name: 'Wahiawa Dam', x: -255, z: 3, kind: 'bridge', width: 9, channel: 0 },
  { name: 'Kaukonahua ford', x: -430, z: 6, kind: 'ford', width: 14, channel: 0 },
  { name: 'South Fork bridge', x: 60, z: 99, kind: 'bridge', width: 9, channel: 1 },
  { name: 'South Fork ford', x: 300, z: 155, kind: 'ford', width: 14, channel: 1 },
  { name: 'North Fork bridge', x: 85, z: -96, kind: 'bridge', width: 9, channel: 2 },
  { name: 'North Fork ford', x: 360, z: -160, kind: 'ford', width: 14, channel: 2 },
];
const river = createRiver({ paths: CHANNELS, halfWidth: 8, level: LEVEL, depth: 2.6, valley: 16, crossings: CROSSINGS });

/** How far (x, z) is from the water's edge of the nearest stream (m; negative in the water). */
function edgeDist(x: number, z: number) {
  let e = Infinity;
  for (const C of CHANNELS) for (let i = 0; i + 1 < C.length; i++) {
    const [ax, az, aw] = C[i], [bx, bz, bw] = C[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    e = Math.min(e, Math.hypot(x - ax - dx * t, z - az - dz * t) - (aw + (bw - aw) * t));
  }
  return e;
}
const crossingDist = (x: number, z: number) => CROSSINGS.reduce((m, c) => Math.min(m, Math.hypot(x - c.x, z - c.z)), Infinity);

// the dry gulches in the east: Waikakalaua (the Americans' half) and Poamoho (the Japanese)
const DRY: number[][][] = [
  [[560, 350], [420, 322], [330, 345], [210, 395]],
  [[560, -320], [440, -352], [340, -395], [240, -380]],
];
function segDist(px: number, pz: number, [ax, az]: number[], [bx, bz]: number[]) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
const polyDist = (x: number, z: number, L: number[][]) => { let d = Infinity; for (let i = 0; i + 1 < L.length; i++) d = Math.min(d, segDist(x, z, L[i], L[i + 1])); return d; };

const TOWN = { x: 85, z: 0, r: 62 };      // Wahiawa
const SCHOFIELD = { x: -150, z: 250 };
const ARBORETUM = { x: 330, z: 10, r: 85 };
const inTown = (x: number, z: number, pad = 0) => Math.hypot(x - TOWN.x, (z - TOWN.z) * 1.15) < TOWN.r + pad;

/** The plateau before the gulches: red earth rolling gently, the Waianae foothills (high) west, the Koolau's (lower) east. */
function plateau(x: number, z: number) {
  let h = 16 + fbm(noise, x * 0.003, z * 0.003, 3) * 2.6 + fbm(noise, x * 0.02 + 5, z * 0.02, 2) * 0.4;
  h += smoothstep(-330, -540, x) * 34 + smoothstep(390, 560, x) * 15;
  for (const L of DRY) h -= 5 * Math.exp(-((polyDist(x, z, L) / 16) ** 2));
  return h;
}

function height(x: number, z: number) {
  let h = plateau(x, z);
  // the gulches: steep wooded walls down to a flat floor, eased into ramps where the roads go down to a crossing
  const e = edgeDist(x, z);
  if (e < 110) {
    const wall = 24 + 56 * smoothstep(120, 30, crossingDist(x, z));
    h = FLOOR + (h - FLOOR) * smoothstep(7, 7 + wall, e);
  }
  for (const bz of [BASE_Z, -BASE_Z]) h += (16 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

/** The roads: the Kamehameha Highway through Wahiawa, the Schofield roads, Wilikina over the dam, the east tracks. */
const HIGHWAY: number[][] = [[0, 560], [0, 440], [30, 300], [55, 170], [60, 99], [80, 30], [80, -30], [85, -96], [110, -170], [120, -250], [60, -380], [0, -440], [0, -560]];
const TRACKS: number[][][] = [
  HIGHWAY,
  [[0, 440], [-80, 330], [SCHOFIELD.x, SCHOFIELD.z], [-260, 280], [-380, 300], [-560, 322]],     // to Schofield and the Kolekole road
  [[SCHOFIELD.x, SCHOFIELD.z], [-200, 140], [-250, 50], [-255, 3], [-270, -80], [-310, -190], [-400, -270]], // Wilikina Drive over the dam
  [[-400, -270], [-220, -400], [0, -440]],                                                         // the Kaukonahua Road
  [[-400, -270], [-560, -250]],
  [[-380, 300], [-420, 150], [-430, 6], [-440, -120], [-400, -270]],                               // the cane track by the west ford
  [[0, 440], [180, 380], [310, 300], [305, 220], [300, 155], [320, 80], [330, 10], [350, -80], [360, -160], [330, -240], [290, -320], [150, -420], [0, -440]], // the east tracks over the fords
  [[80, 0], [200, 4], [330, 10]],                                                                  // Wahiawa to the arboretum
];
const roadDist = (x: number, z: number) => { let d = Infinity; for (const t of TRACKS) d = Math.min(d, polyDist(x, z, t)); return d; };

/** The eucalyptus windbreaks along the field blocks (lines of tall trees; gaps where the roads cross). */
const WINDBREAKS: number[][][] = [
  [[-470, 400], [-120, 410]], [[100, 450], [460, 430]], [[-330, 170], [-60, 190]], [[150, 250], [440, 245]], [[-470, 220], [-400, 60]],
  [[-470, -380], [-150, -350]], [[200, -470], [470, -450]], [[-380, -160], [-60, -150]], [[150, -300], [430, -230]], [[200, -60], [260, 60]],
];
const windbreak = (x: number, z: number) => WINDBREAKS.reduce((m, L) => Math.min(m, polyDist(x, z, L)), Infinity);

const fields = createFields({ seed: 1942_03, cell: 58, weights: [0.38, 0.26, 0.1, 0.26] });
/** The cane: tall enough to hide a man. (Fields MEADOW = cane, PASTURE = pineapple, PLOUGHED = red earth, STUBBLE = cut cane.) */
const isCane = (x: number, z: number) => fields.at(x, z).type === FIELD.MEADOW;
/** The gulch woods and the arboretum (0..1). */
const woodK = (x: number, z: number) => Math.max(smoothstep(40, 18, edgeDist(x, z)), smoothstep(ARBORETUM.r, ARBORETUM.r - 30, Math.hypot(x - ARBORETUM.x, z - ARBORETUM.z)), smoothstep(450, 500, Math.abs(x)) * 0.8);

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Battalion, 27th Infantry' }];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Wheeler Field', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Kolekole road', x: -380, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Schofield Barracks', x: SCHOFIELD.x, z: SCHOFIELD.z, owner: null, sector: 'centre', radius: 28 },
  { id: 'D', name: 'Waikakalaua Gulch', x: 310, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Wahiawa Dam', x: -255, z: 3, owner: null, sector: 'west' },
  { id: 'F', name: 'Wahiawa', x: TOWN.x, z: TOWN.z, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Wahiawa arboretum', x: ARBORETUM.x, z: ARBORETUM.z, owner: null, sector: 'east' },
  { id: 'H', name: 'Kaukonahua Road', x: -400, z: -270, owner: null, sector: 'west' },
  { id: 'I', name: 'Helemano', x: 120, z: -250, owner: null, sector: 'centre' },
  { id: 'J', name: 'Poamoho Gulch', x: 290, z: -320, owner: null, sector: 'east' },
  { id: 'K', name: 'Haleiwa road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

export default {
  id: 'oahu',
  name: 'Schofield Plateau',
  description: 'Oahu, 1942 — the Japanese invasion that never came: pineapple and cane in red earth on the plateau between the Waianae and the Koolau, Schofield Barracks, Wahiawa on its tongue between the gulches of Kaukonahua Stream, Lake Wilson and the Kamehameha Highway.',
  epochs: ['1945'],
  region: 'pacific',                                   // (the menu's Asia & Pacific: maps/index.js REGIONS)
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific's armies)
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['us'], pact: ['jp'] },              // (the Hawaiian Division — the 24th and 25th from October 1941 — against the landing force)
  conditions: { time: 'day', weather: 'clear' },
  airfields: [],                                       // (Wheeler Field lies behind the Americans' base: aircraft come in from the map edge)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.55, // (vehicles: the gulch walls are for men — the roads go down to the crossings)
  seed: 1942,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: gridCache((x: number, z: number) => Math.max(woodK(x, z) * 0.85, smoothstep(6, 2, windbreak(x, z)) * 0.6, isCane(x, z) && !inTown(x, z) ? 0.35 : 0), { x: 560, z: 620 }, 4),
  fields,

  theme: {
    // a clear trade-wind day: high sun, cloud piled on the Koolau, the red earth bright between the crops
    fogColor: 0xbac6c8, fogDensity: 0.0007,
    skyTop: 0x4a7cb4, skyHorizon: 0xc6d4dc, skyBottom: 0x8a9890,
    sunColor: 0xfff4e0, sunIntensity: 2.0, sunDisk: 0.3,
    clouds: 0.5, cloudLight: 0xf4f4f0, cloudDark: 0x8e9aa4,
    sunDir: [0.4, 0.78, 0.45],
    hemiSky: 0xc8d6e0, hemiGround: 0x5a3e2c, hemiIntensity: 1.25,
    rimColor: 0xd8dcdc, rimIntensity: 0.22,
    terrain: {
      grass: '#5c7234', grassAlt: '#52682e', dryGrass: '#8e8650', dirt: '#8a4a2c', rock: '#7a4634',
      pasture: '#667a62', ploughed: '#7a4a32', stubble: '#948654', meadow: '#5a7c38',
      farmX: [440, 520], farmZ: [570, 640], roads: [], roadZ: 0, // (no default tracks: the roads are painted below)
      surface(x: number, z: number) {
        if (polyDist(x, z, HIGHWAY) < 4) return [0x4c4a46, 0.9];                                       // the Kamehameha Highway: tarmac
        const rd = roadDist(x, z);
        if (rd < 4) return [0x9a5434, smoothstep(4, 2, rd) * 0.85];                                   // the plantation roads: red dirt
        if (inTown(x, z)) return [0x6a6a40, 0.6];                                                     // yards and gardens
        if (Math.hypot(x - SCHOFIELD.x, z - SCHOFIELD.z) < 55) return [0x6e8036, 0.6];                // the parade ground's lawn
        const e = edgeDist(x, z);
        if (e < 34) return [0x3e4a24, 0.6 * smoothstep(34, 14, e)];                                   // the gulch woods' floor
        if (fields.at(x, z).type === FIELD.PASTURE && Math.sin((x * 0.7 + z * 0.4) * 1.6) > 0.2) return [0x8c4428, 0.35]; // red earth between the pineapple rows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-200, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [-200, 0, 180] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '230th Infantry Regiment' })),
  },

  /** The landing's bombing and the guns: thickest on Wahiawa and the bridges; each side dug in before its fork. */
  battlefield() {
    const density = (x, z) => 0.05 + (inTown(x, z) ? 0.5 : 0) + 0.4 * smoothstep(60, 10, crossingDist(x, z));
    const half = (seed, f) => shellField(seed, BOUNDS, f).filter((_, i) => i % 2 === 0);
    const blasts = [...half(1942_0601, density), ...half(1942_0607, (x, z) => density(-x, -z)).map(([x, z, r, d]) => [-x, -z, r, d])];
    const works: any[] = [];
    const lines: [string, [number, number][]][] = [
      ['nato', [[-10, 175], [20, 168], [50, 170], [80, 178]]],          // before the South Fork bridge
      ['nato', [[-200, 200], [-170, 196], [-140, 200]]],                // Schofield's north edge
      ['pact', [[170, -185], [140, -178], [110, -178], [80, -186]]],    // before the North Fork bridge (left to right as they face south)
      ['pact', [[-330, -150], [-300, -142], [-270, -148]]],             // above the dam road
    ];
    for (const [f, l] of lines) works.push(...trenchLine(l, f, { zig: 1, belts: 0 }));
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const R = mulberry32(1942);
    const flat = (x: number, z: number, r = 4) => Math.abs(terrain.heightAt(x + r, z) - terrain.heightAt(x - r, z)) + Math.abs(terrain.heightAt(x, z + r) - terrain.heightAt(x, z - r)) < r * 0.35;
    const clear = (x: number, z: number, pad: number) => !near(x, z, 12) && roadDist(x, z) > pad && edgeDist(x, z) > 24 && flat(x, z, 6);

    // ---- Wahiawa: plantation-town cottages and stores on a street grid round the highway
    for (let i = 0; i < 90; i++) {
      const gx = Math.round((R() - 0.5) * TOWN.r * 1.9 / 16) * 16, gz = Math.round((R() - 0.5) * TOWN.r * 1.7 / 14) * 14;
      const x = TOWN.x + gx + (R() - 0.5) * 2, z = TOWN.z + gz + (R() - 0.5) * 2;
      if (!inTown(x, z, -6) || !clear(x, z, 8)) continue;
      const store = polyDist(x, z, HIGHWAY) < 22;
      props.townHouse({ x, z, yaw: store ? Math.PI / 2 : 0, width: store ? 9 : 7, depth: store ? 10 : 7.5, storeys: store && R() < 0.5 ? 2 : 1, name: store ? 'store' : 'house', damaged: 0.2 });
    }
    props.mast({ x: TOWN.x + 30, z: TOWN.z - 30, height: 12 });

    // ---- Schofield Barracks: the three-storey concrete quadrangles round the parade ground
    const barracks = (x: number, z: number, yaw: number, w: number, d: number) => {
      const b = props.beginBuilding('barracks', x, z, yaw, w, d);
      props.shell(b, { height: 9.3, storeys: 3, t: 0.45, color: 0xd6cdb8, key: 'plaster', bay: 3.3, upper: true, front: [0, -w * 0.3], back: [w * 0.25], frame: 0x6a5e4c });
      for (let s = 1; s < 3; s++) props.piece('plain', b, 0, s * 3.1, 0, w - 0.5, 0.2, d - 0.5, 0x5a4a3c);
      props.piece('stone', b, 0, 0.1, 0, w + 0.24, 0.5, d + 0.24, 0x8a8478);
      props.piece('plain', b, 0, 9.4, 0, w + 0.6, 0.3, d + 0.6, 0x7a3a2a);                     // the roof
      props.endBuilding();
    };
    for (const [dx, dz, yaw] of [[0, -58, 0], [0, 58, 0], [-62, 0, Math.PI / 2], [62, 0, Math.PI / 2]] as const) {
      const x = SCHOFIELD.x + dx + 14, z = SCHOFIELD.z + dz;
      if (roadDist(x, z) > 9) barracks(x, z, yaw, 38, 11);
    }
    for (const [x, z] of [[-250, 330], [-90, 330], [-260, 210]]) if (clear(x, z, 10)) props.hall({ x, z, yaw: 0.1, width: 24, depth: 12, height: 5, color: 0xcfc4ac, roof: 0x7a3a2a, door: 5, name: 'quartermaster store' });
    props.tanks({ x: -40, z: 300, count: 2, radius: 3, height: 7, color: 0xb0aca0 });

    // ---- Wheeler Field's edge behind the Americans' base: hangars, the tower, a P-40 caught on the ground
    for (const x of [-250, -170, 150, 230]) props.timberHangar({ x, z: 540, yaw: Math.PI });
    props.controlTower({ x: 90, z: 535, yaw: Math.PI });
    props.aircraftWreck({ x: -110, z: 520, yaw: 0.6, scale: 0.7 });

    // ---- plantation camps: Helemano's and Poamoho's rows of cottages, the Kolekole road's and Kaukonahua's
    const camp = (cx: number, cz: number, n: number, yaw: number, seed: number) => {
      const T = mulberry32(seed);
      for (let i = 0; i < n; i++) {
        const x = cx + (T() - 0.5) * 70, z = cz + (T() - 0.5) * 50;
        if (!clear(x, z, 8)) continue;
        props.townHouse({ x, z, yaw, width: 6, depth: 8, storeys: 1, name: 'cottage', damaged: 0.15 });
      }
    };
    camp(150, -275, 14, 0.15, 11);
    camp(260, -290, 6, -0.2, 12);
    camp(-345, 270, 8, 0.1, 13);
    camp(-370, -245, 8, -0.1, 14);
    camp(280, 300, 6, 0.2, 15);
    props.chimney({ x: 175, z: -300, height: 16 });                    // Helemano's pineapple shed
    props.hall({ x: 205, z: -300, yaw: 0, width: 26, depth: 14, height: 6, color: 0x8a7a64, roof: 0x5a5a56, door: 6, name: 'pineapple shed' });

    // ---- the wrecks of the first day, gun pits behind each side, the dumps
    for (const [x, z, yaw, c] of [[-60, 120, 0.4, 0x4b4e34], [200, 220, 2.1, 0x4b4e34], [-180, -110, 1.3, 0x6a6440], [230, -210, 2.7, 0x6a6440]]) {
      if (!clear(x, z, 6)) continue;
      const g = terrain.heightAt(x, z);
      props.box('metal', x, g + 0.8, z, 2.4, 1.2, 4.8, yaw, c);
      props.box('metal', x, g + 1.7, z, 1.6, 0.7, 2, yaw + 0.3, c);
      cover.addBox({ x, z, yaw, length: 5, thickness: 2.6, height: 1.6 });
    }
    for (const [x, z] of [[-60, 270], [60, 260], [200, 340]]) props.sandbagRing({ x, z, radius: 4, toward: 1 });
    for (const [x, z] of [[40, -300], [-120, -300], [230, -390]]) props.sandbagRing({ x, z, radius: 4, toward: -1 });
    for (let i = 0; i < 4; i++) props.crates({ x: -90 + i * 55, z: 410 + R() * 20, yaw: R() * 3 });
    for (let i = 0; i < 4; i++) props.crates({ x: -80 + i * 50, z: -405 - R() * 20, yaw: R() * 3 });
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x6a6444);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 7 || edgeDist(x, z) < 2 || inTown(x, z, -14) }];
    // the gulch woods (kukui, guava, eucalyptus), the arboretum, the foothills beyond the flanks; yard trees in town
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0.85, autumn: 0, maxY: 70, size: 1.2,
      forest: (x: number, z: number) => {
        if (near(x, z, 26)) return -1;
        const w = woodK(x, z);
        if (w > 0.4) return w;
        return inTown(x, z) ? 0.08 : -1;
      },
    });
    // the windbreaks: tall blue-gum eucalyptus in single lines
    const breaks = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, count: 1100, broadleaf: 1, autumn: 0, maxY: 70, size: 1.7,
      avoid: [...avoid, { test: (x: number, z: number) => windbreak(x, z) > 2.5 || Math.abs(z) > bounds.z - 6 }],
      forest: () => 1,
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); breaks.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
