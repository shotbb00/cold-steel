// Amiriya, summer 1942 — the battle that never came (1945 only; North Africa; the big field, 1.0 × 1.12 km). Had
// Panzerarmee Afrika broken through at Alamein, its next fight was here, at Alexandria’s back door, where the Western
// Desert gives way to the Nile Delta. The Nubariya canal runs across the middle of the field from Amiriya towards the
// city: an irrigated green belt of fields and palm groves on both its banks, three bridges over it (Ikingi in the west,
// the Amiriya bridge on the desert road in the centre, the Mariout bridge in the east), the Mariout railway along its
// north bank and the coast road along its south bank. In the east the salt marsh of Lake Mariout’s western arm, the
// salt works and the mud-brick village of Hagar en Nawatiya at its edge. South, on the Alexandria side, the 8th Army’s
// rear: RAF Dekheila’s landing ground, the limestone Dekheila ridge with its quarries; north, in the desert the
// Germans come out of, the Abu Sir ridge with the old tower of Taposiris and the village of El Hammam. The British
// come in from the Alexandria suburbs (south, +z), the Afrika Korps from Burg el Arab (north).
// Not a mirror but fair: the canal splits the field in two and neither side starts on it; each side has one limestone
// ridge across its front (Dekheila in the west-centre, Abu Sir in the centre-east), one village with a palm grove on a
// flank (Hagar en Nawatiya; El Hammam), one walled spot on the other flank (the landing ground; the salt works), one
// canal-side point on its own bank (Ikingi on the south bank, Mariout station on the north) and the Amiriya bridge
// between them both; the marsh flanks both halves alike, and the points lie about as far from each base as the other
// side’s do from theirs.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { segDist, arabVillage } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1942_07);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// the Nubariya canal, across the middle, bending a little
const canalZ = (x: number) => 12 * Math.sin(x * 0.006 + 0.4) + 6 * Math.sin(x * 0.017);
const HW = 8;
const BRIDGES = { west: -330, centre: 0, east: 300 };
const river = createRiver({
  path: canalZ,
  halfWidth: HW,
  level: 0,
  depth: 2.4,
  valley: 40,
  crossings: [
    { name: 'Ikingi bridge', x: BRIDGES.west, kind: 'bridge', width: 8 },
    { name: 'Amiriya bridge', x: BRIDGES.centre, kind: 'bridge', width: 10 },
    { name: 'Mariout bridge', x: BRIDGES.east, kind: 'bridge', width: 9 },
  ],
});
const railZ = (x: number) => canalZ(x) - 62;   // the Mariout railway, along the north bank
const coastZ = (x: number) => canalZ(x) + 56;  // the coast road, along the south bank

const DEKHEILA = { x: -300, z: 230 };   // RAF Dekheila’s landing ground (B)
const HAGAR = { x: 330, z: 170 };       // Hagar en Nawatiya (D)
const IKINGI = { x: -360, z: canalZ(-360) + 48 };  // Ikingi Maryut (E), south bank
const AMIRIYA = { x: 0, z: canalZ(0) };            // Amiriya (F), on both banks round the bridge
const MARIOUT = { x: 262, z: canalZ(262) - 40 };   // Mariout station (G), north bank
const HAMMAM = { x: -250, z: -190 };    // El Hammam (H)
const SALT = { x: 360, z: -240 };       // the salt works (J)
// the limestone ridges: Dekheila (Allied, west-centre) and Abu Sir (German, centre-east, slantwise)
const dekheilaZ = (x: number) => 262 + 12 * Math.sin(x * 0.01 + 0.6);
const abusirZ = (x: number) => -250 - 0.1 * (x - 130);
const ridge = (x: number, z: number, crest: (x: number) => number, x0: number, x1: number, w: number, h: number) =>
  h * smoothstep(x0 - 90, x0, x) * smoothstep(x1 + 90, x1, x) * Math.exp(-(((z - crest(x)) / w) ** 2));

// the roads: the desert road over the Amiriya bridge, a road over each of the other two, and the entries
const ROADS = [
  [[0, 560], [0, BASE_Z], [25, 380], [10, 220], [0, 90], [0, -90], [-15, -220], [-30, -380], [0, -BASE_Z], [0, -560]],
  [[-130, 560], [-130, BASE_Z], [-220, 380], [DEKHEILA.x + 20, DEKHEILA.z], [BRIDGES.west, 90], [BRIDGES.west, -90], [HAMMAM.x + 30, HAMMAM.z], [-150, -380], [-130, -BASE_Z], [-130, -560]],
  [[130, 560], [130, BASE_Z], [240, 380], [HAGAR.x - 30, HAGAR.z], [BRIDGES.east, 90], [BRIDGES.east, -90], [330, -160], [SALT.x - 30, SALT.z], [230, -380], [130, -BASE_Z], [130, -560]],
];
const roadD = (x: number, z: number) => Math.min(segDist(ROADS[0], x, z), segDist(ROADS[1], x, z), segDist(ROADS[2], x, z), Math.abs(z - coastZ(x)));
const onRail = (x: number, z: number) => Math.abs(z - railZ(x)) < 4;

// Lake Mariout’s western arm, out on the east flank: salt marsh, shallow pools, the open lake past the edge
const marshE = (x: number, z: number) => ((x - 570) / 175) ** 2 + (z / 370) ** 2 + fbm(noise, x * 0.008 + 70, z * 0.008, 2) * 0.22;
const marshK = (x: number, z: number) => (x < 330 ? 0 : smoothstep(1.05, 0.82, marshE(x, z)));
// the built-up spots, levelled: [x, z, r, height]
const FLAT = [[DEKHEILA.x, DEKHEILA.z, 70, 3], [HAGAR.x, HAGAR.z, 56, 2.2], [HAMMAM.x, HAMMAM.z, 60, 2.6], [SALT.x, SALT.z, 50, 1.8], [MARIOUT.x, MARIOUT.z, 40, 1.6], [IKINGI.x, IKINGI.z, 40, 1.6]];

function height(x: number, z: number) {
  const ax = Math.abs(x), az = Math.abs(z), dc = Math.abs(z - canalZ(x));
  const desert = smoothstep(70, 230, dc);                                              // the Delta’s flat green belt, the desert beyond it
  let h = 2.6 + fbm(noise, x * 0.004, z * 0.004, 4) * (0.8 + 3.4 * desert);
  if (desert > 0) h += ridged(noise, x * 0.02 + 11, z * 0.03, 3) * 1.4 * desert;     // dune ripples
  h += ridge(x, z, dekheilaZ, -240, 90, 34, 9.5) * (0.8 + 0.2 * Math.sin(x * 0.015));  // the Dekheila ridge
  h += ridge(x, z, abusirZ, -20, 300, 32, 9.5) * (0.8 + 0.2 * Math.sin(x * 0.013 + 2)); // the Abu Sir ridge
  h += 5 * Math.max(0, 1 - Math.hypot(x - 190, z - 330) / 60) ** 1.3;                 // Kom el Nugus, a low tell behind Hagar
  h += 5 * Math.max(0, 1 - Math.hypot(x + 170, z + 340) / 60) ** 1.3;                 // Kom Bahig, one behind El Hammam
  const m = marshK(x, z);
  h += (smoothstep(500, 620, ax) * 18 + smoothstep(560, 680, az) * 12) * (1 - m);    // the desert’s rim beyond the edges
  for (const bz of [BASE_Z, -BASE_Z]) h += (3 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  for (const [fx, fz, fr, fh] of FLAT) h += (fh - h) * smoothstep(fr, fr - 22, Math.hypot(x - fx, z - fz));
  h = river.carve(x, z, Math.max(1.4, h));
  if (m > 0) { // the marsh: mud a hand above the water, pools half a metre deep, the open lake out past the edge (the canal runs out into it)
    const pool = smoothstep(0.12, 0.4, fbm(noise, x * 0.022 + 30, z * 0.022 - 9, 2));
    const lake = smoothstep(0.5, 0.3, marshE(x, z));
    h = lerp(h, Math.min(h, lerp(0.35 - 0.9 * pool, -2, lake)), m);
    const cw = Math.min(Math.abs(z - railZ(x)), Math.abs(z - coastZ(x)));
    if (cw < 9) h = Math.max(h, lerp(h, 1.3, smoothstep(9, 4, cw)));    // the railway and the coast road on their causeways over it
  }
  return h;
}

/** The marsh: men wade slowly, vehicles crawl; the canal’s banks and the roads stay firm. */
function soft(x: number, z: number, foot: boolean) {
  const m = marshK(x, z);
  if (m <= 0 || roadD(x, z) < 6 || Math.abs(z - canalZ(x)) < 30) return 1;
  return 1 - m * (foot ? 0.4 : 0.65);
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Wardian', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'RAF Dekheila', x: DEKHEILA.x, z: DEKHEILA.z, owner: null, sector: 'west' },
  { id: 'C', name: 'Dekheila ridge', x: -60, z: dekheilaZ(-60), owner: null, sector: 'centre' },
  { id: 'D', name: 'Hagar en Nawatiya', x: HAGAR.x, z: HAGAR.z, owner: null, sector: 'east' },
  { id: 'E', name: 'Ikingi Maryut', x: IKINGI.x, z: IKINGI.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Amiriya', x: AMIRIYA.x, z: AMIRIYA.z, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Mariout station', x: MARIOUT.x, z: MARIOUT.z, owner: null, sector: 'east' },
  { id: 'H', name: 'El Hammam', x: HAMMAM.x, z: HAMMAM.z, owner: null, sector: 'west' },
  { id: 'I', name: 'Abu Sir ridge', x: 130, z: abusirZ(130), owner: null, sector: 'centre' },
  { id: 'J', name: 'Mariout salt works', x: SALT.x, z: SALT.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Burg el Arab', x: 30, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'amiriya',
  armies: { nato: ['brit'], pact: ['wh'] }, // (the British 8th Army against Panzerarmee Afrika)
  sides: { nato: 'Britain', pact: 'Germany' },
  name: 'Amiriya',
  description: 'Egypt, summer 1942 — the battle that never came: Rommel at Alexandria’s gates, where the desert meets the Delta. The Nubariya canal and its three bridges across the middle, irrigated fields and palm groves along it, Lake Mariout’s salt marsh on the flank, limestone ridges and RAF Dekheila behind. Take the bridges.',
  epochs: ['1945'],
  region: 'africa', // (the menu’s North Africa: maps/index.js REGIONS)
  climate: 'desert',   // sand paint and khaki drill (render/paint.js CLIMATE)
  conditions: { time: 'day', weather: 'clear' }, // (a hazy July afternoon by the sea)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1942,
  height,
  soft,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1942_07, cell: 55 }),

  theme: {
    // a hot, humid afternoon near the sea: a milky haze, hard light
    fogColor: 0xd8d0b8,
    fogDensity: 0.00075,
    skyTop: 0x7ea6cc,
    skyHorizon: 0xe2dccc,
    skyBottom: 0xb4a88c,
    sunColor: 0xfff0d4,
    sunIntensity: 2.2,
    sunDisk: 0.85,
    clouds: 0.2,
    cloudLight: 0xf4efe4,
    cloudDark: 0xc8bfae,
    sunDir: [0.3, 0.8, -0.45],
    hemiSky: 0xd8dde4,
    hemiGround: 0x9a8a62,
    hemiIntensity: 1.2,
    rimColor: 0xf0e0c0,
    rimIntensity: 0.3,
    terrain: {
      grass: '#d6b882',
      grassAlt: '#caa872',
      dryGrass: '#e0c690',
      dirt: '#a8865c',
      rock: '#b4a07c',
      pasture: '#7f9450',   // the irrigated fields along the canal: clover, cotton, maize, the dark Nile mud
      ploughed: '#7a5e40',
      stubble: '#b8a464',
      meadow: '#8c9e56',
      farmX: [430, 490],
      farmZ: [120, 175],
      roads: [],            // (the roads are painted below)
      roadZ: 0,
      surface(x: number, z: number) {
        if (onRail(x, z)) return [0x6a5a48, 0.9];                               // ballast
        const rd = roadD(x, z);
        if (rd < 3.5) return [0x9c8060, 0.8];
        if (rd < 6) return [0xa88a62, 0.35];
        const m = marshK(x, z);
        if (m > 0.05) {
          const crust = fbm(noise, x * 0.05 + 3, z * 0.05, 2);
          return crust > 0 ? [0xe0dccc, m * Math.min(0.85, 0.4 + crust * 2)] : [0x6a6448, m * 0.7]; // salt crust and black mud
        }
        if (Math.abs(z - canalZ(x)) < HW + 9) return [0x6a7840, 0.55];          // reeds on the canal banks
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.3 ? [0xb89a6a, Math.min(0.4, (scrub - 0.3) * 2)] : null; // gravel patches
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1942);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const dc = (x: number, z: number) => Math.abs(z - canalZ(x));
    const clear = (x: number, z: number, m = 8) => roadD(x, z) > m && Math.abs(z - railZ(x)) > m && dc(x, z) > HW + m && marshK(x, z) < 0.1;
    const STONE = 0xc0a882;
    const yawAt = (x: number) => Math.atan2(1, (canalZ(x + 1) - canalZ(x - 1)) / 2); // (along the canal)

    // ---- Amiriya: flat-roofed houses on both banks round the bridge, a mosque on each side, the lock-keeper’s house
    props.rand = mulberry32(81);
    for (const s of [1, -1]) {
      for (const a of [26, 42, 82, 98]) {
        for (let x = -110; x <= 110; x += 17) {
          const hx = x + (props.rand() - 0.5) * 5, hz = canalZ(hx) + s * (a + (props.rand() - 0.5) * 4);
          if (!clear(hx, hz, 8) || Math.abs(hx) < 12) { props.rand(); continue; }
          props.flatHouse({ x: hx, z: hz, yaw: yawAt(hx) - Math.PI / 2 + (s > 0 ? Math.PI : 0), width: 8 + props.rand() * 4, depth: 7 + props.rand() * 2, storeys: props.rand() < 0.3 ? 2 : 1 });
        }
      }
    }
    props.flatHouse({ x: 40, z: canalZ(40) + 62, yaw: Math.PI, width: 12, depth: 10, name: 'mosque', dome: true });
    props.flatHouse({ x: -44, z: canalZ(-44) - 70, yaw: 0, width: 11, depth: 9, name: 'mosque', dome: true });
    props.lowWall({ x: 0, z: canalZ(0) + 21, yaw: Math.PI / 2, length: 4, height: 1.2, color: 0x8a8070 }); // (a sandbag stop at each bridgehead)
    props.lowWall({ x: 0, z: canalZ(0) - 21, yaw: Math.PI / 2, length: 4, height: 1.2, color: 0x8a8070 });

    // ---- Ikingi Maryut (south bank, west): the village by the bridge and the old base camp’s huts
    arabVillage(props, IKINGI.x, IKINGI.z + 6, 7, 82, (x, z) => !clear(x, z, 7), false);
    for (const [lx, lz] of [[40, 30], [58, 18], [52, 44]]) props.tent({ x: IKINGI.x + lx, z: IKINGI.z + lz, yaw: 0.2, color: 0xb8a078 });
    // ---- Mariout station (north bank, east): the station, the goods shed, wagons on the line
    const sy = yawAt(MARIOUT.x) - Math.PI / 2;
    props.flatHouse({ x: MARIOUT.x, z: railZ(MARIOUT.x) + 14, yaw: sy, width: 18, depth: 9, storeys: 2, name: 'railway station' });
    props.flatHouse({ x: MARIOUT.x - 34, z: railZ(MARIOUT.x - 34) + 13, yaw: sy, width: 10, depth: 7, name: 'goods office' });
    props.hall({ x: MARIOUT.x + 36, z: railZ(MARIOUT.x + 36) + 16, yaw: yawAt(MARIOUT.x + 36), width: 22, depth: 10, height: 5, color: 0xb09a74, roof: 0x7a6a50, name: 'goods shed' });
    for (let x = -500; x < 500; x += 20) props.rails({ x0: x, z0: railZ(x), x1: x + 20, z1: railZ(x + 20) });
    for (const [x, kind, c] of [[200, 'box', 0x8a6a48], [214, 'box', 0x7a5a40], [228, 'tank', 0x3a3a34], [-160, 'open', 0x6a5440], [-400, 'box', 0x7a5a40]] as [number, string, number][]) {
      props.wagon({ x, z: railZ(x), yaw: yawAt(x), kind, color: c });
    }

    // ---- RAF Dekheila’s landing ground (Allied west): blister hangars, the watch office, dispersal pens, a wreck
    props.timberHangar({ x: DEKHEILA.x - 40, z: DEKHEILA.z - 30, yaw: 0.1 });
    props.timberHangar({ x: DEKHEILA.x - 44, z: DEKHEILA.z + 14, yaw: 0.1 });
    props.controlTower({ x: DEKHEILA.x + 38, z: DEKHEILA.z - 28, yaw: Math.PI / 2 });
    for (const [lx, lz] of [[40, 30], [10, 46], [-14, -50]]) props.sandbagRing({ x: DEKHEILA.x + lx, z: DEKHEILA.z + lz, radius: 6, toward: -1 });
    props.rand = mulberry32(83);
    props.aircraftWreck({ x: DEKHEILA.x + 6, z: DEKHEILA.z + 20, yaw: 1.2, scale: 0.7 });
    props.tanks({ x: DEKHEILA.x + 46, z: DEKHEILA.z + 2, yaw: 0, count: 2, radius: 2.6, height: 4, color: 0xb4a888 });
    for (const [lx, lz, y] of [[-60, -60, 0], [60, 56, 0.1]]) props.lowWall({ x: DEKHEILA.x + lx, z: DEKHEILA.z + lz, yaw: y, length: 40, height: 1.6, color: STONE });

    // ---- the Mariout salt works (German east): sheds, the pans’ low walls, heaps of salt
    props.hall({ x: SALT.x - 24, z: SALT.z - 18, yaw: 0.25, width: 24, depth: 11, height: 5, color: 0xc8c0aa, roof: 0x8a8070, name: 'salt store' });
    props.flatHouse({ x: SALT.x + 18, z: SALT.z - 30, yaw: 0.25, width: 9, depth: 7, name: 'works office' });
    for (let k = 0; k < 5; k++) props.lowWall({ x: SALT.x - 10 + k * 13, z: SALT.z + 22, yaw: Math.PI / 2 + 0.25, length: 26, height: 1.2, color: 0xd0c8b4 });
    for (const [lx, lz] of [[20, 4], [32, 12], [-34, 22]]) props.boulder({ x: SALT.x + lx, z: SALT.z + lz, radius: 2.4 });

    // ---- the mud-brick villages with their palm groves: Hagar en Nawatiya (Allied east), El Hammam (German west)
    const skipV = (x: number, z: number) => !clear(x, z, 7);
    arabVillage(props, HAGAR.x, HAGAR.z, 9, 84, skipV, false);
    arabVillage(props, HAMMAM.x, HAMMAM.z, 8, 85, skipV, true);
    props.rand = mulberry32(86);
    for (const c of [HAGAR, HAMMAM]) {
      for (let i = 0, n = 0; n < 26 && i < 200; i++) {
        const a = r() * Math.PI * 2, d = 50 + r() * 34, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d * 0.8;
        if (!clear(x, z, 6)) continue;
        props.palm({ x, z, height: 7 + props.rand() * 4 }); n++;
      }
    }

    // ---- the ridges: quarry cuts and sangars on Dekheila; the tower of Taposiris and the temple’s walls on Abu Sir
    for (let x = -230; x < 90; x += 48) props.lowWall({ x: x + r() * 12, z: dekheilaZ(x) - 6, yaw: (r() - 0.5) * 0.4, length: 7 + r() * 5, height: 1.0, color: STONE });
    for (const [lx, lz] of [[-40, 18], [30, 20]]) for (let k = 0; k < 3; k++) props.boulder({ x: -60 + lx + k * 4, z: dekheilaZ(-60) + lz + k * 2, radius: 1.6 + k * 0.4 });
    for (let x = -10; x < 300; x += 48) props.lowWall({ x: x + r() * 12, z: abusirZ(x) + 6, yaw: -0.1 + (r() - 0.5) * 0.4, length: 7 + r() * 5, height: 1.0, color: STONE });
    props.column({ x: 160, z: abusirZ(160) - 8, radius: 3.2, height: 12 });   // the Abusir tower (the old lighthouse of Taposiris)
    for (const [lx, lz, y, L] of [[-40, -12, -0.1, 30], [-40, 12, -0.1, 30], [-56, 0, Math.PI / 2 - 0.1, 22]] as number[][]) {
      props.lowWall({ x: 130 + lx, z: abusirZ(130 + lx) + lz, yaw: y, length: L, height: 3, color: 0xc8b48c }); // the temple’s walls
    }

    // ---- the green belt: palm groves along both banks of the canal
    props.rand = mulberry32(87);
    for (let i = 0, n = 0; n < 240 && i < 3000; i++) {
      const x = (r() * 2 - 1) * 480, s = r() < 0.5 ? 1 : -1, z = canalZ(x) + s * (HW + 14 + r() * 100);
      if (!clear(x, z, 7) || near(x, z, 22) || Math.abs(x) < 125 && dc(x, z) < 110 || Math.abs(z - coastZ(x)) < 8) continue;
      const k = 1 + Math.floor(r() * 4); // (in clumps)
      for (let j = 0; j < k; j++) {
        const px = x + (r() - 0.5) * 14, pz = z + (r() - 0.5) * 14;
        if (clear(px, pz, 6) && Math.abs(pz - coastZ(px)) > 7) { props.palm({ x: px, z: pz, height: 7 + props.rand() * 5 }); n++; }
      }
    }

    // ---- the desert: burnt-out vehicles, old positions, boulders, out beyond the green belt
    const town = (x: number, z: number) => [DEKHEILA, HAGAR, HAMMAM, SALT, MARIOUT, IKINGI].some((t) => Math.hypot(x - t.x, z - t.z) < 80);
    for (let i = 0; i < 160; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 30), z = (r() * 2 - 1) * (BASE_Z - 70);
      if (near(x, z, 45) || !clear(x, z, 9) || town(x, z) || dc(x, z) < 120) continue;
      const kind = r();
      props.rand = mulberry32(Math.floor(r() * 1e9));
      if (kind < 0.25) props.wreckCar({ x, z, yaw: props.rand() * 6.28 });
      else if (kind < 0.35) props.aircraftWreck({ x, z, yaw: props.rand() * 6, scale: 0.6 });
      else if (kind < 0.6) props.sandbagRing({ x, z, radius: 4 + props.rand() * 2, toward: z > 0 ? -1 : 1 });
      else if (kind < 0.75) props.lowWall({ x, z, yaw: props.rand() * 3, length: 6 + props.rand() * 8, height: 1.1, color: STONE });
      else for (let k = 0; k < 3; k++) props.boulder({ x: x + (props.rand() - 0.5) * 8, z: z + (props.rand() - 0.5) * 8, radius: 0.8 + props.rand() * 1.4 });
    }
    const sites: any[] = [];
    for (let tries = 0; sites.length < 45 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 30);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 40 * 40) || near(x, z, 50) || town(x, z) || !clear(x, z, 12) || dc(x, z) < 130 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      sites.push({ x, z, kind: r() < 0.5 ? 'rocks' : 'wrecks', yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    commandPost(props, this.bases.nato, -1, 0xb8a078);
    commandPost(props, this.bases.pact, 1, 0xa89870);
    props.finish();
    cover.finalize(bounds);
    river.build(scene, terrain);

    // Lake Mariout’s water: a sheet at the canal’s level over the east flank (the ground covers it wherever it is dry),
    // north and south of the canal’s own sheet
    const zs: number[] = [];
    for (let x = -820; x <= 820; x += 20) zs.push(canalZ(x));
    const c0 = Math.min(...zs) - HW - 20, c1 = Math.max(...zs) + HW + 20;
    const waterMat = (river as any).waterMesh?.material;
    for (const [x0, z0, z1] of [[325, -640, c0], [325, c1, 640], [550, c0, c1]]) { // (the canal’s sheet ends at x 550)
      const w = new THREE.Mesh(new THREE.PlaneGeometry(820 - x0, z1 - z0, 1, 1), waterMat);
      w.rotation.x = -Math.PI / 2;
      w.position.set((820 + x0) / 2, 0, (z0 + z1) / 2);
      w.receiveShadow = true;
      w.userData.noAO = true;
      scene.add(w);
    }

    // scrub and camel-thorn, thin; none on the roads, in the water or the marsh
    const avoid = [{ x: 0, z: BASE_Z, r: 22 }, { x: 0, z: -BASE_Z, r: 22 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => roadD(x, z) < 5 || onRail(x, z) || dc(x, z) < HW + 3 || marshK(x, z) > 0.4 }];
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.4, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); },
    };
  },
} satisfies MapDef;
