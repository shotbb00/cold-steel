// Abu Qir Bay, summer 1942 — the landing that never came (1945 only; coastal: the Wehrmacht lands, the 8th Army’s
// rear holds; 1.0 × 1.8 km). In July 1942, with Panzerarmee Afrika stopped at El Alamein sixty miles short of
// Alexandria, Rommel pressed for what Comando Supremo had planned and never mounted: a landing behind the British
// line, on the open beaches of Abu Qir Bay east of the city, to cut the coast road and the railway and take the
// Royal Navy’s base from the landward side. Here it goes in at first light, Grenadiers and engineers in
// Pionierlandungsboote from the barges offshore, Panzer IIIs in the Marinefährprähme, a Narvik-class destroyer and
// the S-boats covering them, through the British minefield off the bay.
// On the map, from the sea looking inland (south): in the west (-x) the Abu Qir peninsula pushing out to sea, the old
// fort on its limestone point and Nelson’s Island off it, Abu Qir village on the neck; behind it the Fleet Air Arm’s
// air station, HMS Grebe — the runway, the hangars, the tower. In the middle the long sand of the bay before El
// Ma’adiya, where Lake Idku drains to the sea; in the east the dunes before Idku, the lake’s reeds behind them, and at
// the map’s edge the Rosetta branch of the Nile running out to the sea between palm-lined banks. Inland the Delta’s
// edge: date palms, fig gardens and fields, mud-brick villages, the Alexandria–Rosetta railway and the coast road
// west to Alexandria, the way the counter-attack comes.
// How it plays: three beaches, each with its exit through the dunes and a place behind it (the air station, Ma’adiya,
// Idku). Fort Abu Qir’s guns and two beach posts sweep the sand, two 6-inch coast batteries inland fire on the craft
// and the ships; the lake splits Ma’adiya from Idku, so the landing has to win each beach on its own. The base troops
// hold the dunes and the villages; at the counter-attack’s hour the Alexandria garrison’s tanks come down the road.
// Laid out like Andøya in a frame with the sea toward +z (local), then turned round: the lander (`pact`) is at -z.
// Not point-mirrored: one side lands, the other holds (modes/landing).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { segDist, arabVillage } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1942_08);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a7684 }); // (the Mediterranean off the Delta: green-blue over the sand)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

/** The Abu Qir peninsula (west): how far out its point pushes the shore. */
const POINT = { x: -430, r: 130 };
const pointK = (x: number) => Math.max(0, 1 - Math.abs(x - POINT.x) / POINT.r);
/** The waterline (local z) round the bay, the peninsula out past it in the west. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 1.3, 2) * 12 + pointK(x) ** 1.5 * 170;
/** Lake Idku behind the eastern dunes (local). */
const LAKE = { x: 185, z: -245, rx: 95, rz: 75 };
const lakeD = (x: number, z: number) => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
/** The Rosetta branch of the Nile along the eastern edge (0 west of it, 1 in the channel). */
const nileK = (x: number) => smoothstep(445, 468, x) * smoothstep(560, 535, x); // (the east bank beyond the map edge)
/** Nelson’s Island, off the point. */
const ISLE = { x: -470, z: 480, r: 30 };

/** The beach sectors (x) and the places behind them (local). */
export const SECTORS = [
  { x: -260, name: 'Abu Qir beach', inland: { name: 'HMS Grebe', x: -300, z: -215 } },
  { x: 40, name: 'Ma’adiya beach', inland: { name: 'El Ma’adiya', x: 0, z: -190 } },
  { x: 350, name: 'Idku dunes', inland: { name: 'Idku', x: 385, z: -235 } },
];
const exitK = (x: number) => Math.min(...SECTORS.map((s) => smoothstep(6, 16, Math.abs(x - s.x)))); // (the beach exits: cut through the dunes)

/** The Delta behind the dunes: flat, 3–6 m, rising a little inland. */
const plain = (x: number, z: number) => 3 + fbm(noise, x * 0.004, z * 0.004, 3) * 1.4 + Math.max(0, -z - 300) * 0.004;

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, pk = pointK(x);
  let h: number;
  if (d > 0) { // the bottom: shelving off, rock off the point; Nelson’s Island
    h = 0.5 - d * 0.03 - Math.max(0, d - 150) * 0.08 + pk * Math.max(0, 2.5 - d * 0.04) * (0.6 + noise(x * 0.05, z * 0.05));
    h = Math.max(h, -16);
    const id = Math.hypot(x - ISLE.x, z - ISLE.z);
    if (id < ISLE.r * 1.6) h = Math.max(h, 4.5 * smoothstep(ISLE.r * 1.6, ISLE.r * 0.6, id) - 1.5);
  } else {
    const back = -d;
    const beach = 0.5 + Math.min(back, 50) * 0.05;
    const dune = (1.2 + ridged(noise, x * 0.02 + 7, z * 0.03, 2) * 2.4) * smoothstep(30, 50, back) * smoothstep(110, 75, back) * exitK(x) * (1 - smoothstep(0.1, 0.4, pk));
    const t = smoothstep(50, 130, back);
    h = (beach + dune) * (1 - t) + plain(x, z) * t;
    if (pk > 0.05) h += Math.pow(pk, 0.8) * 6.5 * smoothstep(4, 22, back) * (0.85 + 0.3 * fbm(noise, x * 0.03, z * 0.03, 2)); // (the point’s low limestone)
  }
  const ld = lakeD(x, z); // Lake Idku: shallow, reedy edges
  if (ld < 1.4) h += (-2.6 - h) * smoothstep(1.4, 0.95, ld);
  const nk = nileK(x); // the Nile: a deep channel to the sea
  if (nk > 0) h += (-3.5 - h) * nk;
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The roads (local polylines): the coast road, the beach exits, the air station’s perimeter road, the Alexandria road. */
const ROADS: number[][][] = [
  [[-500, -95], [-380, -80], [-250, -100], [-100, -95], [40, -100], [200, -90], [350, -105], [440, -110]],   // the coast road (Alexandria – Abu Qir – Rosetta)
  [[-260, 115], [-250, -100], [-240, -185]],                                                                  // Abu Qir beach – the air station gate
  [[-240, -185], [-110, -200], [-110, -330], [-130, -620], [-130, -900]],                                    // the perimeter road, down to the Alexandria road
  [[40, 110], [40, -100], [5, -185], [-20, -400], [30, -620], [30, -900]],                                   // Ma’adiya beach – El Ma’adiya – inland
  [[350, 110], [350, -105], [385, -230], [360, -400], [360, -900]],                                          // Idku dunes – Idku – inland
  [[-500, -640], [-130, -620], [30, -620], [360, -610], [440, -600]],                                        // the Alexandria road
  [[-440, 230], [-405, 60], [-380, -80]],                                                                    // up the point to the fort
];
const roadD = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) d = Math.min(d, segDist(r, x, z)); return d; };
const onRoadL = (x: number, z: number) => z < shoreZ(x) - 28 && roadD(x, z) < 3.5;
const onRoad = (x: number, z: number) => onRoadL(x, F * z);
/** The railway (local z at x): the Alexandria – Rosetta line, south of the lake. */
const railZ = (x: number) => -420 + Math.sin(x * 0.004) * 15;
const onRail = (x: number, z: number) => Math.abs(z - railZ(x)) < 2.5 && x < 440;
/** HMS Grebe’s runway (local): east–west behind the village. */
const RUNWAY = { x0: -470, x1: -150, z: -275, w: 15 };
const onRunway = (x: number, z: number) => Math.abs(z - RUNWAY.z) < RUNWAY.w && x > RUNWAY.x0 && x < RUNWAY.x1;

/** The reed beds round the lake: slow going. */
function soft(x: number, z: number, foot: boolean) {
  const lz = F * z;
  if (onRoadL(x, lz)) return 1;
  const k = smoothstep(1.6, 1.15, lakeD(x, lz)) + smoothstep(425, 445, x);
  return k <= 0.02 ? 1 : 1 - Math.min(1, k) * (foot ? 0.35 : 0.7);
}

const beachLine = (x: number) => shoreZ(x) - 40;
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Abu Qir beach', ...W(-260, beachLine(-260)), owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Ma’adiya beach', ...W(40, beachLine(40)), owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: 'Idku dunes', ...W(350, beachLine(350)), owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: 'HMS Grebe', ...W(-300, -215), owner: null, sector: 'west' },
  { id: 'F', name: 'El Ma’adiya', ...W(0, -190), owner: null, sector: 'centre' },
  { id: 'G', name: 'Idku', ...W(385, -235), owner: null, sector: 'east' },
  { id: 'K', name: 'Alexandria road', ...W(-120, -650), owner: 'nato', sector: 'centre' },
];

/** Fort Abu Qir on the point (the old fort: drawn in decorate), its guns just east of it over the beach. */
const FORT = { x: -445, z: shoreZ(-445) - 28 };
const FORTS = [
  { unit: 'wn', ...W(-385, shoreZ(-385) - 30), facing: Math.PI, name: 'Fort Abu Qir' },
  { unit: 'wn', ...W(-110, shoreZ(-110) - 58), facing: Math.PI, name: 'Beach post Montaza' },
  { unit: 'wn', ...W(200, shoreZ(200) - 58), facing: Math.PI, name: 'Beach post Idku' },
  { unit: 'battery', ...W(-400, -510), facing: Math.PI, name: 'Abu Qir coast battery' },
  { unit: 'battery', ...W(240, -500), facing: Math.PI, name: 'Idku coast battery' },
];

export default {
  id: 'abu-qir',
  name: 'Abu Qir Bay',
  description: 'Egypt, summer 1942 — the landing Rommel hoped for: the beaches of Abu Qir Bay east of Alexandria, the old fort on its point and the Fleet Air Arm’s air station behind it, the dunes before El Ma’adiya and Lake Idku, the Nile’s Rosetta mouth, palm groves and the coast road to Alexandria. The Wehrmacht lands; the 8th Army’s rear holds.',
  epochs: ['1945'],
  region: 'africa', // (the menu's North Africa: maps/index.js REGIONS)
  climate: 'desert', // (khaki drill on both sides: render/paint.js CLIMATE)
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Allies', pact: 'Germany' },
  armies: { nato: ['brit'], pact: ['wh'] }, // (the 8th Army’s base and rear troops round Alexandria; the Wehrmacht lands)
  airfields: [], // (HMS Grebe is drawn, not flown from: the aircraft come in from the map edge)
  conditions: { time: 'dawn', weather: 'clear' }, // (in at first light)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1942,
  height,
  soft,
  river: sea,
  fields: createFields({ seed: 1942_08, cell: 55 }),

  theme: {
    // a hot, humid summer dawn on the Delta coast: a milky haze, the light low from the east
    fogColor: 0xdcd2bc, fogDensity: 0.0006,
    skyTop: 0x7ea6cc, skyHorizon: 0xeadcc4, skyBottom: 0xb4a88c,
    sunColor: 0xffe6c4, sunIntensity: 2.0, sunDisk: 0.6,
    clouds: 0.12, cloudLight: 0xf6efe4, cloudDark: 0xc8bfae,
    sunDir: [0.75, 0.35, 0.2],
    hemiSky: 0xd8dde4, hemiGround: 0x9a8a62, hemiIntensity: 1.2,
    rimColor: 0xf0e0c0, rimIntensity: 0.3,
    terrain: {
      grass: '#cdb27e', grassAlt: '#c2a672', dryGrass: '#dcc28c', dirt: '#a8865c', rock: '#c0aa82',
      pasture: '#7f9450', ploughed: '#7a5e40', stubble: '#b8a464', meadow: '#8c9e56', // (the Delta’s fields: clover, cotton, maize, dark Nile mud)
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoadL(x, lz)) return [0x9c8060, 0.85];                                            // dust roads
        if (onRail(x, lz)) return [0x6a5a48, 0.9];                                              // ballast
        if (onRunway(x, lz)) return [0x5e5a52, 0.95];                                           // HMS Grebe’s tarmac
        if (lz > sz + 3 || y < -0.5) return [y > -1.5 ? 0xd6c8a0 : 0x9a9080, 1];                // the sand under the water, the lake and river mud
        const ld = lakeD(x, lz);
        if (ld < 1.45 || nileK(x) > 0.02 || x > 430) return [0x7a8448, 0.85];                   // reeds round the lake and along the Nile
        if (pointK(x) > 0.3 && y > 2.5 && lz > sz - 70) return [0xc8b48c, 0.9];                 // the point’s limestone
        if (lz > sz - 42) return [0xe6d8b0, 1];                                                 // the beach
        if (lz > sz - 112) return [0xdccb98, 0.65 + Math.max(0, fbm(noise, x * 0.05, z * 0.05, 2)) * 0.35]; // the dunes: sand and a little scrub
        if (Math.abs(lz - RUNWAY.z) < 60 && x > RUNWAY.x0 - 20 && x < RUNWAY.x1 + 20) return [0xbca870, 0.7]; // the airfield’s burnt grass
        return null;                                                                            // the fields and gardens
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-130, 30, 360] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Wehrmacht lands: its roads are the beach sectors)
  maxStacks: 30, // (room for the boats' loads waiting offshore: AI vs AI, at 26 a third of the landing sat in the craft)
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    nato: [],
    pact: [{ unit: 'destroyer', ...W(-150, 850), facing: Math.PI / 2 }], // (Z 23 off the bay, between the lanes)
  },

  landing: {
    // what comes in (systems/Landing.js): the Grenadiers in Pionierlandungsboote, the Panzers and guns in Marinefährprähme
    craft: { infantry: ['lcvp', 'lcvp', 'lct'], vehicle: 'lct' },
    // the Royal Navy’s minefield off Alexandria, lanes swept off each beach
    seaMines: { z: [520, 580], count: 50, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1942_08 },
    // what the landing may call in at sea: the Kriegsmarine’s destroyers and S-boats, a sweeper for the lanes
    navy: ['destroyer', 'ptBoat', 'minesweeper'],
    // Fort Abu Qir’s guns on the point, two beach posts in the dunes, the two coast batteries inland that fire on the ships
    forts: FORTS,
    // wire along the top of the sand, mines in the dunes before each exit, tank traps across each exit, MG pits over it
    works: [
      ...Array.from({ length: 84 }, (_, i) => { const x = -470 + i * 11; return pointK(x) > 0.3 || nileK(x) > 0 || x > 430 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 36), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [{ kind: 'mines', ...W(s.x - 32, shoreZ(s.x - 32) - 64) }, { kind: 'mines', ...W(s.x + 32, shoreZ(s.x + 32) - 64) }, { kind: 'tankTraps', ...W(s.x, shoreZ(s.x) - 82), yaw: 0 }]),
      ...SECTORS.flatMap((s) => [-24, 24].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 100), yaw: 0 }))),
    ],
    // the base troops at dawn: in the dunes over each beach, at the air station, in Ma’adiya and Idku
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mortar', 'atTeam', 'rifles', 'scouts'], // (rear-area troops: thinner than Omaha's line — AI vs AI 2026-11-22)
    names: { rifles: 'Base defence section' },
    hold: [...SECTORS.flatMap((s) => [-50, 50].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - 110))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z + 15))],
    // the counter-attack: the Alexandria garrison’s tanks and carriers down the coast road
    counter: { t: 480, units: ['tank', 'ifv', 'tank', 'rifles'], say: 'The Alexandria garrison is coming down the road: tanks and carriers, straight for the beachhead', sayOther: 'British tanks coming down the Alexandria road' },
    // the landing’s AI (ai/LandingDirector.js): men and engineers first, the Panzers once a beach is held; the destroyer inshore
    ai: { order: ['rifles', 'rifles', 'engineers', 'rifles', 'mgTeam', 'tank', 'rifles', 'atTeam', 'mortar', 'rifles', 'tank', 'atTeam'], gunship: 'destroyer', gunships: 1, sweeper: 'minesweeper', heavy: null },
    economy: { reserves: 3000, perSector: 900, beachIncome: 1.5, defenceCp: 500, defenceIncome: 0.6 }, // (AI vs AI 2026-11-22: at Gela’s numbers the landing took the beaches and stalled; here the last runs ended 2 of 3 and 1 of 3 inland at the whistle, the places falling at 25–28 min)
    // first light: the Grenadiers into all three beaches, a Panzer with the middle wave
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1942_08);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, F * z); // (local)
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < d) || FORTS.some((f) => Math.hypot(f.x - x, f.z - F * z) < d + 10);
    const clear = (x: number, z: number, m = 6) => roadD(x, z) > m && Math.abs(z - railZ(x)) > m && lakeD(x, z) > 1.5 && x < 425 && z < shoreZ(x) - 60 && !near(x, z, 18 + m)
      && !(Math.abs(z - RUNWAY.z) < RUNWAY.w + m + 8 && x > RUNWAY.x0 - m - 10 && x < RUNWAY.x1 + m + 10);

    // ---- Fort Abu Qir on its point: a square of walls, bastions at the corners, barracks inside
    const STONE = 0xd8ccb0, PLINTH = 0x9a8c70, g0 = g(FORT.x, FORT.z);
    for (const [dx, dz, yaw] of [[0, -18, 0], [0, 18, 0], [-18, 0, Math.PI / 2], [18, 0, Math.PI / 2]] as [number, number, number][]) {
      for (const k of [-1, 0, 1]) {
        const lx = FORT.x + dx + (yaw ? 0 : k * 12), lz = FORT.z + dz + (yaw ? k * 12 : 0), w = W(lx, lz);
        const foot = Math.min(...[-6, 0, 6].map((m) => g(lx + (yaw ? 0 : m), lz + (yaw ? m : 0)))) - 1.5;
        props.box('stone', w.x, (foot + g0 + 5) / 2, w.z, 12.2, g0 + 5 - foot, 2, yaw, STONE);
        props.box('stone', w.x, (foot + g0 + 1.2) / 2, w.z, 12.3, g0 + 1.2 - foot, 2.2, yaw, PLINTH);
        props.cover.addBox({ x: w.x, z: w.z, yaw, length: 12, thickness: 2, height: 5 });
      }
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const w = W(FORT.x + sx * 18, FORT.z + sz * 18), foot = terrain.heightAt(w.x, w.z) - 1.5;
      props.box('stone', w.x, (foot + g0 + 6) / 2, w.z, 6, g0 + 6 - foot, 6, Math.PI / 4, STONE);
    }
    props.flatHouse({ ...W(FORT.x, FORT.z - 4), yaw: 0, width: 14, depth: 7, storeys: 1, name: 'barracks' });
    { const w = W(FORT.x + 8, FORT.z + 8); props.box('plain', w.x, g0 + 7, w.z, 0.15, 14, 0.15, 0, 0x4a3a28); } // (the flagstaff)
    // the beacon on the tip, Nelson’s Island’s ruined battery (1798’s) off it
    { const w = W(-430, shoreZ(-430) - 6), y = terrain.heightAt(w.x, w.z); props.box('stone', w.x, y + 5, w.z, 2.6, 10, 2.6, 0, 0xe8e4dc); props.box('plain', w.x, y + 10.6, w.z, 3, 1.4, 3, 0, 0x3a3a3a); }
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; props.boulder({ ...W(ISLE.x + Math.cos(a) * 14, ISLE.z + Math.sin(a) * 10), radius: 2 + r() * 1.5 }); }
    props.lowWall({ ...W(ISLE.x, ISLE.z), yaw: 0.4, length: 12, height: 1.6, color: 0xb4a07c });

    // ---- Abu Qir village on the neck of the peninsula; fishermen’s boats drawn up on the sand
    arabVillage(props, -410, F * 120, 14, 1942_81, (x, z) => !clear(x, F * z, 5), true);
    for (let i = 0; i < 12; i++) {
      const x = -360 + r() * 260; if (Math.abs(x + 260) < 35) continue;
      const lz = shoreZ(x) - 6 - r() * 8, w = W(x, lz);
      props.box('plain', w.x, terrain.heightAt(w.x, w.z) + 0.4, w.z, 1.8, 0.8, 6, r() * 0.6 - 0.3 + Math.PI / 2, r() < 0.5 ? 0x3e6a8a : 0x8a5a3a);
    }

    // ---- HMS Grebe: the hangars and the tower along the runway, the fuel dump, tents, a wrecked Swordfish, sandbagged guns
    for (const x of [-450, -400]) props.hall({ ...W(x, -205), yaw: 0, width: 38, depth: 26, height: 10, color: 0xb0a080, roof: 0x6a6658, door: 24, name: 'hangar' });
    props.timberHangar({ ...W(-200, -210), yaw: 0 });
    props.controlTower({ ...W(-160, -235), yaw: 0 });
    props.tanks({ ...W(-170, -320), yaw: 0, count: 3, radius: 3, height: 5, color: 0xb4a888 });
    for (const [x, z] of [[-430, -320], [-370, -325], [-310, -320]]) props.tent({ ...W(x, z), yaw: 0.1, color: 0xb8a078 });
    props.aircraftWreck({ ...W(-250, -315), yaw: 1.1, scale: 0.7 });
    for (const [x, z] of [[-470, -235], [-140, -300], [-460, -330]]) props.sandbagRing({ ...W(x, z), radius: 5, toward: 1 });

    // ---- El Ma’adiya and Idku: mud-brick villages, mosques; fishing boats on the lake
    arabVillage(props, 40, F * -215, 14, 1942_82, (x, z) => !clear(x, F * z, 5), true);
    arabVillage(props, 400, F * -275, 12, 1942_83, (x, z) => !clear(x, F * z, 5), true);
    props.rand = r;
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2, x = LAKE.x + Math.cos(a) * LAKE.rx * 0.6, lz = LAKE.z + Math.sin(a) * LAKE.rz * 0.6, w = W(x, lz);
      props.box('plain', w.x, 0.25, w.z, 1.6, 0.6, 5.5, r() * 3, 0x5a4a38);
    }

    // ---- the railway: rails, the halts at Ma’adiya and Idku, a few goods wagons
    for (let x = -500; x < 440; x += 20) { const a = W(x, railZ(x)), b = W(x + 20, railZ(x + 20)); props.rails({ x0: a.x, z0: a.z, x1: b.x, z1: b.z }); }
    const railYaw = (x: number) => Math.atan2(1, F * (railZ(x + 1) - railZ(x - 1)) / 2);
    props.flatHouse({ ...W(70, railZ(70) - 14), yaw: railYaw(70) - Math.PI / 2, width: 14, depth: 8, storeys: 1, name: 'Ma’adiya halt' });
    props.flatHouse({ ...W(300, railZ(300) - 14), yaw: railYaw(300) - Math.PI / 2, width: 16, depth: 8, storeys: 2, name: 'Idku station' });
    for (const [x, kind, c] of [[-300, 'box', 0x5a3426], [-284, 'box', 0x5a3426], [-268, 'tank', 0x3a3a3a]] as [number, string, number][]) props.wagon({ ...W(x, railZ(x)), yaw: railYaw(x), kind, color: c });

    // ---- the Nile: palms along its west bank, feluccas on the water
    for (let lz = -880; lz < shoreZ(440) - 30; lz += 14 + r() * 10) { const x = 432 + r() * 8; if (roadD(x, lz) > 6 && Math.abs(lz - railZ(x)) > 6) props.palm({ ...W(x, lz), height: 8 + r() * 5 }); }
    for (const lz of [-600, -330, -40]) { const w = W(480, lz); props.box('plain', w.x, 0.3, w.z, 2.4, 0.9, 10, 0.05, 0x6a4a2a); props.column({ x: w.x, z: w.z + 1, radius: 0.15, height: 9 }); }

    // ---- date palms in groves, fig gardens walled in mud brick
    props.rand = mulberry32(1942_84);
    for (let i = 0, n = 0; n < 420 && i < 4000; i++) {
      const x = (r() * 2 - 1) * 470, lz = 120 - r() * 960;
      if (!clear(x, lz, 6) || fbm(noise, x * 0.006 + 20, lz * 0.006, 2) < 0.05) continue;
      const k = 2 + Math.floor(r() * 4);
      for (let j = 0; j < k; j++) { const px = x + (r() - 0.5) * 16, pz = lz + (r() - 0.5) * 16; if (clear(px, pz, 5)) { props.palm({ ...W(px, pz), height: 7 + props.rand() * 5 }); n++; } }
    }
    for (let i = 0; i < 40; i++) {
      const x = (r() * 2 - 1) * 440, lz = -150 - r() * 650;
      if (!clear(x, lz, 10)) continue;
      props.lowWall({ ...W(x, lz), yaw: r() < 0.5 ? 0 : Math.PI / 2, length: 10 + r() * 14, height: 1.5, color: 0xb8a07a });
    }
    commandPost(props, this.bases.nato, -1, 0xb8a078);
    props.finish();

    const land = (x: number, z: number) => { const lz = F * z; return lz < shoreZ(x) - 110 && lakeD(x, lz) > 1.5 && x < 425; };
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) || onRunway(x, F * z) || onRail(x, F * z) || !land(x, z) }];
    // tamarisk and fig: thin, in the gardens
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 500, broadleaf: 1, autumn: 0.1, maxY: 30, avoid,
      forest: (x: number, z: number) => smoothstep(0.3, 0.55, fbm(noise, x * 0.008 + 9, z * 0.008, 2)) * 0.5 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.6, fields: this.fields,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => F * z > shoreZ(x) - 40 || lakeD(x, F * z) < 1.2 || x > 440 || onRunway(x, F * z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
