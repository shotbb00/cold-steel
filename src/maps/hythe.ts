// Hythe, September 1940 (1945 epoch; coastal: the Germans land, the British hold; 1.0 × 1.8 km). Operation Sea Lion,
// the invasion that was planned and never made: the 16th Army’s first wave, the 17th Infantry Division, was to come
// ashore at dawn on the beaches between Folkestone, Hythe and Dymchurch (Landing Area B) from Rhine barges towed across
// the Channel, Pionierlandungsboote and the navy’s new Marinefährprähme, the old battleship Schleswig-Holstein and the
// destroyers covering them, while the 7th Flieger-Division’s Fallschirmjäger dropped on the high ground behind Hythe
// round Lympne and Postling to seize the canal crossings and the road to Folkestone. Against them the Home Forces of
// that summer: pillboxes along the shingle and the canal, the Admiralty scaffolding in the shallows, anti-tank cubes
// and mines on the beaches, emergency coast batteries on the hills, and the armoured reserve behind the Downs.
// On the map, from the sea looking inland: on the right (-x) Sandgate squeezed onto a strip under the escarpment, its
// Tudor castle on the shingle and Sandgate Hill climbing to Shorncliffe Camp’s barracks on the plateau; in the middle
// Hythe — the shingle and the Martello towers, the seafront villas and the Imperial hotel, the Royal Military Canal
// (Napoleon’s invasion ditch of 1806) with its bridges, the High Street at the foot of the old cliff and the road up
// it to Saltwood and its castle; on the left (+x) the Hythe Ranges on the shingle, the Dymchurch Redoubt, then the
// concrete Dymchurch Wall with one slipway through it, the village behind it on Romney Marsh, the canal swinging
// inland along the foot of the escarpment to West Hythe, and Lympne’s castle and aerodrome up on the edge.
// (Compressed: the escarpment, the canal and the coast are a few kilometres long, here a kilometre.)
// How it plays: three beaches, each with its own way inland. Sandgate is narrow, under guns, and the only way up to
// Shorncliffe is the hill road; Hythe’s beach is open but the canal stops everything except at its two bridges; at
// Dymchurch the wall holds the vehicles on the sand until the engineers blow the slipway’s cubes, then the marsh is
// flat and open to the village. The Fallschirmjäger start dropped on the plateau by Lympne aerodrome, behind the
// defence; the British armoured reserve comes down the hill roads after eight minutes.
// Laid out like Omaha in a frame with the sea toward +z (local), then turned round (`F`): the Germans are the Pact
// and their side is -z, so the sea is there (systems/Landing.js: the side whose base is out at sea lands).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1940_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x3c5650 }); // (the Channel off Hythe: grey-green)
const F = -1; // local z (sea +) → world z (sea −)
const W = (x: number, z: number) => ({ x, z: F * z });

/** The waterline (local z): Hythe Bay, curving a little seaward toward Dymchurch. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 10 + 12 * smoothstep(100, 480, x);
/** How far back from the shore the foot of the old cliff (the escarpment) lies: tight under Sandgate, far inland past West Hythe. */
const FOOT = [[-560, 62], [-380, 66], [-260, 92], [-120, 150], [0, 195], [120, 225], [250, 300], [380, 410], [560, 560]];
function footBack(x: number) {
  for (let i = 1; i < FOOT.length; i++) {
    const [x0, b0] = FOOT[i - 1], [x1, b1] = FOOT[i];
    if (x <= x1 || i === FOOT.length - 1) return b0 + (b1 - b0) * smoothstep(0, 1, (x - x0) / (x1 - x0));
  }
  return FOOT[0][1];
}
const footZ = (x: number) => shoreZ(x) - footBack(x) - fbm(noise, x * 0.006, 4.4, 2) * 6;
const RISE = 60;         // m the face takes to climb
const PLATEAU = 42;
/** The Royal Military Canal: from its sluice at Seabrook, behind Hythe, then inland along the escarpment’s foot. */
const CANAL_X0 = -255;
const canalBack = (x: number) => Math.min(footBack(x) - 28, 60 + (x + 300) * 0.17 + Math.max(0, x - 80) * 0.6);
const canalZ = (x: number) => shoreZ(x) - canalBack(x);
/** The Dymchurch Wall (0..1 across x) and the slipway through it. */
const wallK = (x: number) => smoothstep(215, 250, x);
const SLIP = 330;
/** Romney Marsh (0..1). */
const marshK = (x: number, back: number) => smoothstep(90, 200, x) * smoothstep(45, 80, back);

/** The plateau’s height: the Downs’ edge, rolling, rising a little inland. */
const plateau = (x: number, z: number) => PLATEAU + fbm(noise, x * 0.003 + 5, z * 0.003, 3) * 6 + Math.max(0, footZ(x) - RISE - z) * 0.008;

/** The roads up the escarpment (local x along z): Sandgate Hill, Hythe to Saltwood, Dymchurch to Lympne. */
const UP = [
  (z: number) => -330 + Math.sin(z * 0.02) * 10,
  (z: number) => -20 + Math.sin(z * 0.012) * 16,
  (z: number) => SLIP + Math.sin((z - shoreZ(SLIP)) * 0.01) * 14,
];
const PLATEAU_ROAD = (x: number) => -560 + Math.sin(x * 0.006) * 25;

function roadDist(x: number, z: number) {
  const back = shoreZ(x) - z;
  let d = Math.abs(back - 42 - Math.sin(x * 0.01) * 2);                                       // the coast road, Sandgate–Hythe–Dymchurch
  if (back > 42 && z > PLATEAU_ROAD(x)) d = Math.min(d, Math.abs(x - UP[0](z)));                // Sandgate Hill
  if (back > 42 && z > -870) d = Math.min(d, Math.abs(x - UP[1](z)));                          // Hythe, up to Saltwood and on
  if (back > 34 && z > PLATEAU_ROAD(x)) d = Math.min(d, Math.abs(x - UP[2](z)));                // off the slipway, through Dymchurch, up to Lympne
  const hs = footBack(x) - 12;
  if (x > -200 && x < 160) {
    d = Math.min(d, Math.abs(back - hs));                                                      // the High Street, at the foot of the hill
    if (back > 42 && back < hs) d = Math.min(d, Math.abs(x - 75 - Math.sin(z * 0.03) * 3));     // Twiss Road, over the canal
  }
  d = Math.min(d, Math.abs(z - PLATEAU_ROAD(x)));                                               // along the top, by Saltwood
  return d;
}
const onRoad = (x: number, z: number) => roadDist(x, z) < 3.5;
const BASE_H = plateau(0, -830);

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz;
  if (d > 0) return Math.max(0.25 - d * 0.035 - Math.max(0, d - 60) * 0.05, -18); // the shingle shelving steeply, then the bottom
  const back = -d;
  // the shingle bank, then the strip behind it (the marsh lower)
  const mk = marshK(x, back);
  const low = (2.5 + fbm(noise, x * 0.01, z * 0.01, 2) * 0.35) * (1 - mk) + (1.9 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.12) * mk;
  const shingle = Math.min(0.25 + back * 0.15, 3.25 - Math.max(0, back - 20) * 0.08);
  let h = back < 20 ? shingle : Math.max(low, shingle);
  // the Dymchurch Wall: a stepped concrete face, 5.8 m, one slipway through it
  const wk = wallK(x);
  if (wk > 0 && back > 10 && back < 40) {
    let w = back < 16 ? 1.5 + (back - 10) * 0.72 : back < 24 ? 5.8 : 5.8 - (back - 24) * 0.38;
    if (Math.abs(x - SLIP) < 9) w = Math.min(w, 0.25 + back * 0.35);
    h += (Math.max(h, w) - h) * wk;
  }
  if (wk > 0 && back <= 10 && Math.abs(x - SLIP) < 9) h = Math.max(h, (0.25 + back * 0.35) * wk + h * (1 - wk));
  // the escarpment: the old cliff, wooded, no way up for vehicles but the three roads
  const fz = footZ(x), k = smoothstep(fz, fz - RISE, z);
  if (k > 0) h += (plateau(x, z) - h) * k;
  if (z < fz + 12 && z > fz - 185) {
    const s = smoothstep(fz + 10, fz - 170, z);
    for (const R of UP) {
      const rx = R(z), dx = Math.abs(x - rx);
      if (dx > 70) continue;
      const floor = 2.6 + (plateau(rx, z) - 2.6) * s;
      if (floor < h) h = Math.min(h, floor + Math.max(0, dx - 7) ** 1.25 * 0.55);
    }
  }
  // the canal: 2 m of water between grassy banks, crossed only where the roads are
  const cf = smoothstep(CANAL_X0, CANAL_X0 + 15, x);
  if (cf > 0) {
    const cd = Math.abs(z - canalZ(x));
    if (cd < 9 && roadDist(x, z) >= 6) {
      const bed = cd < 5 ? -1.7 : -1.7 + ((cd - 5) / 4) * (h + 1.7);
      h += (Math.min(h, bed) - h) * cf;
    }
  }
  // the defence’s base inland: flat
  h += (BASE_H - h) * smoothstep(60, 25, Math.hypot(x, z + 830));
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The beach sectors and the places behind them. */
export const SECTORS = [{ x: -330, name: 'Sandgate' }, { x: 20, name: 'Hythe seafront' }, { x: SLIP, name: 'Dymchurch Wall' }];
const PL = { // the points, local
  A: [0, 770], B: [-330, shoreZ(-330) - 34], C: [20, shoreZ(20) - 38], D: [SLIP, shoreZ(SLIP) - 36],
  E: [-370, shoreZ(-370) - 200], F: [30, footZ(30) + 12], G: [355, shoreZ(355) - 110], K: [-80, -560],
} as Record<string, number[]>;
const points: ControlPointDef[] = [
  { id: 'A', name: 'Barge anchorage', ...W(PL.A[0], PL.A[1]), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Sandgate', ...W(PL.B[0], PL.B[1]), owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Hythe seafront', ...W(PL.C[0], PL.C[1]), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Dymchurch Wall', ...W(PL.D[0], PL.D[1]), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Shorncliffe Camp', ...W(PL.E[0], PL.E[1]), owner: null, sector: 'west' },
  { id: 'F', name: 'Hythe', ...W(PL.F[0], PL.F[1]), owner: null, sector: 'centre' },
  { id: 'G', name: 'Dymchurch', ...W(PL.G[0], PL.G[1]), owner: null, sector: 'east' },
  { id: 'K', name: 'Saltwood', ...W(PL.K[0], PL.K[1]), owner: 'nato', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => Object.values(PL).some(([px, pz]) => Math.hypot(px - x, pz - z) < r);

/** The coast defences (local): a pillbox nest over each beach (the Redoubt’s at the ranges), two emergency batteries on the hills. */
const FORTS_L = [
  { unit: 'wn', x: -250, z: footZ(-250) + 14, name: 'Sandgate pillboxes' },
  { unit: 'wn', x: -95, z: shoreZ(-95) - 58, name: 'Hythe front pillboxes' },
  { unit: 'wn', x: 205, z: shoreZ(205) - 60, name: 'Dymchurch Redoubt' },
  { unit: 'wn', x: 440, z: shoreZ(440) - 46, name: 'Dymchurch pillboxes' },
  { unit: 'battery', x: -430, z: -250, name: 'Shorncliffe emergency battery' },
  { unit: 'battery', x: 230, z: -500, name: 'Lympne emergency battery' },
];
/** The Admiralty scaffolding in the shallows: two rows of steel tubing, some with a mine lashed on. */
export const OBSTACLES = (() => {
  const r = mulberry32(1940_2), out: { x: number, z: number, kind: string, mine: boolean }[] = [];
  for (const dd of [14, 24]) for (let x = -485; x < 485; x += 8 + r() * 4) {
    if (r() < 0.12) continue;
    out.push({ ...W(x + (r() - 0.5) * 2, shoreZ(x) + dd + (r() - 0.5) * 4), kind: 'gate', mine: r() < 0.3 });
  }
  return out;
})();
const BACK = (x: number, b: number) => W(x, shoreZ(x) - b);

export default {
  id: 'hythe',
  name: 'Hythe',
  description: 'Kent, September 1940, Operation Sea Lion as planned: the shingle between Folkestone, Hythe and Dymchurch, Martello towers and pillboxes, the Royal Military Canal behind the beach, the Dymchurch Wall and Romney Marsh, the wooded escarpment with Shorncliffe, Saltwood and Lympne on top. The Germans land from the sea and from the air; the Home Forces hold the coast.',
  epochs: ['1945'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['brit21'], pact: ['wh', 'fj'] }, // (the Home Forces against the 16th Army and the 7th Flieger-Division)
  conditions: { time: 'dawn', weather: 'clear' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  airfields: [], // (no runway on the ground: the shingle, the marsh, the escarpment — the Luftwaffe flies from France)
  steep: 0.45,   // (vehicles: the escarpment and the wall are no way up — the roads and the slipway are)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1940,
  height,
  river: sea,
  fields: createFields({ seed: 1940, cell: 64, weights: [0.5, 0.12, 0.23, 0.15] }), // (September: pasture, stubble, the hops in)

  theme: {
    // a clear September dawn over the Channel, mist on the marsh
    fogColor: 0xc2c4bc, fogDensity: 0.0006,
    skyTop: 0x5e7c9e, skyHorizon: 0xe2d6c0, skyBottom: 0x8a8672,
    sunColor: 0xffe0bc, sunIntensity: 1.6, sunDisk: 0.35,
    clouds: 0.3, cloudLight: 0xf4ece0, cloudDark: 0x9a9ca4,
    sunDir: [0.6, 0.3, -0.7],
    hemiSky: 0xccd4dc, hemiGround: 0x52563a, hemiIntensity: 1.3,
    rimColor: 0xe0d8cc, rimIntensity: 0.22,
    terrain: {
      grass: '#5c6c3a', grassAlt: '#506236', dryGrass: '#8e8856', dirt: '#5e5040', rock: '#6e6a52',
      pasture: '#5e703c', ploughed: '#5a4834', stubble: '#9a8c58', meadow: '#66763e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, back = shoreZ(x) - lz;
        if (onRoad(x, lz)) return [0x5e5a52, 0.88];                                                       // tarmac
        if (back < -2) return [y > -1 ? 0x8a8474 : 0x6e6a5c, 1];                                          // shingle and sand under the water
        if (wallK(x) > 0.5 && back > 8 && back < 34) return [0xa8a498, 1];                                // the Dymchurch Wall’s concrete
        if (back < 24) return [0x908a7c, 1];                                                              // the shingle
        if (x > 90 && x < 215 && back < 150) return [0x9a9478, 0.7];                                      // the Ranges: shingle and thin grass
        if (x > CANAL_X0 && Math.abs(lz - canalZ(x)) < 11) return [0x5a6a38, 0.75];                       // the canal’s banks, reeds
        if (Math.hypot(x - PL.E[0], lz - PL.E[1] + 60) < 34) return [0x948c7c, 0.9];                     // Shorncliffe’s parade ground
        if (marshK(x, back) > 0.5) {
          const u = ((x * 0.9 + lz * 0.35) % 64 + 64) % 64, v = ((lz * 0.9 - x * 0.3) % 90 + 90) % 90;
          if (u < 1.2 || v < 1.2) return [0x3e5a4c, 0.9];                                                 // the marsh dykes
          return [0x5e7a3a, 0.6];                                                                          // sheep pasture
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-330, -20, 330] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Germans land: their roads are the beach sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 60 }, pact: { x: 0, z: -330 } },
  points,
  // the Fallschirmjäger, down at dawn on the plateau by Lympne aerodrome, behind the defence
  spawns: {
    nato: [],
    pact: [
      { unit: 'rifles', ...W(180, -290), facing: Math.PI },
      { unit: 'rifles', ...W(235, -310), facing: Math.PI },
      { unit: 'mgTeam', ...W(205, -270), facing: Math.PI },
    ],
  },

  landing: {
    // the barges’ landing craft: Pionierlandungsboote for the men, Marinefährprähme for the vehicles (data/units45/ships.js lcvp, lct)
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    // what the landing may call in at sea: the destroyers, the minesweepers, the S-boats, the old Schleswig-Holstein offshore
    navy: ['destroyer', 'minesweeper', 'ptBoat', 'oldBattleship'],
    // the British minefield across the bay, lanes the sweepers cleared ahead of the tows
    seaMines: { z: [520, 580], count: 50, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1940 },
    forts: FORTS_L.map((f) => ({ unit: f.unit, ...W(f.x, f.z), facing: Math.PI, name: f.name })),
    obstacles: OBSTACLES,
    // anti-tank cubes along the shingle, wire behind them, mines, trenches and MG posts over each beach, cubes in the slipway;
    // on the canal’s inland bank the stop line’s trenches at each bridge
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -490 + i * 11; return Math.abs(x + 440) < 14 ? null : { kind: 'wire', ...BACK(x, x > 238 ? 21 : 32), yaw: 0 }; }).filter(Boolean),
      ...Array.from({ length: 91 }, (_, i) => { const x = -496 + i * 8; return Math.abs(x + 440) < 12 ? null : { kind: 'tankTraps', ...BACK(x, 24), yaw: 0 }; }).filter(Boolean),
      ...[-8, 0, 8].map((dx) => ({ kind: 'tankTraps', ...BACK(SLIP + dx, 17), yaw: 0 })),
      ...SECTORS.flatMap((s, i) => [-38, 38].map((dx) => ({ kind: 'mines', ...BACK(s.x + dx, i === 2 ? 40 : 46) }))),
      ...SECTORS.flatMap((s, i) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...BACK(s.x + dx, i === 2 ? 52 : i === 0 ? 56 : 60), yaw: 0 }))),
      ...SECTORS.flatMap((s, i) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...BACK(s.x + dx, i === 2 ? 46 : 50), yaw: 0 }))),
      ...[UP[1](canalZ(-20)), 75, UP[2](canalZ(SLIP))].flatMap((bx) => [-16, 16].map((dx) => ({ kind: 'trench', ...W(bx + dx, canalZ(bx + dx) - 16), yaw: 0 }))),
    ],
    // the defence at dawn: the 1st London Division’s men over each beach, at the bridges, in the villages
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'atTeam', 'mortar', 'rifles', 'atTeam', 'mgTeam', 'rifles', 'mortar', 'scouts', 'tankDestroyer'],
    hold: [
      ...SECTORS.flatMap((s, i) => [-45, -22, 22, 45].map((dx) => BACK(s.x + dx, (i === 2 ? 44 : 50) + (Math.abs(dx) < 30 ? 0 : 8)))),
      W(UP[1](canalZ(-20)), canalZ(-20) - 18), W(75, canalZ(75) - 18),
      W(PL.E[0], PL.E[1]), W(PL.F[0], PL.F[1]), W(PL.G[0], PL.G[1]),
    ],
    // the counter-attack: the armoured reserve from behind the Downs, down the hill roads
    counter: { t: 480, units: ['tank', 'ifv', 'heavyTank', 'ifv', 'tank'], say: 'The armoured reserve is coming down off the Downs: infantry tanks and Bren carriers, straight for the beaches', sayOther: 'British tanks coming down the hill roads off the Downs' },
    // the landing’s AI (ai/LandingDirector.js): two destroyers inshore, a sweeper for the lane, the old battleship later
    ai: { order: ['rifles', 'rifles', 'engineers', 'rifles', 'mgTeam', 'tank', 'rifles', 'atTeam', 'mortar', 'rifles', 'tank', 'engineers'], gunship: 'destroyer', gunships: 2, sweeper: null, heavy: 'oldBattleship' }, // (no AI sweeper: one working beside a lane holds the boats, and a boat let go again beaches out in the mines — systems/Landing.js step, AI vs AI 2026-11-22)
    economy: { reserves: 3200, perSector: 900, beachIncome: 1.2, defenceCp: 700, defenceIncome: 1.0 }, // (AI vs AI 2026-11-22: at 2500/800/1.0 vs 1.2 the landing never got inland; at 3200/1000/1.4 vs 1.0 one held with 2 of 3 inland, one won in 10 min; at 3200/900/1.2 vs 1.0 won at 18 and 19 min; at 1.15 held with the beaches only)
    // the first wave at dawn, the 17th Infantry Division onto all three beaches at once
    waves: [{ t: 0, say: 'Dawn: the first wave of the 17th Division is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1940);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, F * z);  // (local)
    const placed: number[][] = [];
    const flat = (x: number, z: number, rr: number) => {
      const hs = [heightL(x - rr, z), heightL(x + rr, z), heightL(x, z - rr), heightL(x, z + rr), heightL(x, z)];
      return Math.max(...hs) - Math.min(...hs) < rr * 0.3;
    };
    const free = (x: number, z: number, rr: number, minBack = 36) =>
      roadDist(x, z) > rr + 4 && (x < CANAL_X0 - 10 || Math.abs(z - canalZ(x)) > rr + 11) && !nearPoint(x, z, rr + 14)
      && FORTS_L.every((f) => Math.hypot(f.x - x, f.z - z) > rr + 24) && shoreZ(x) - z > minBack && heightL(x, z) > 1
      && flat(x, z, rr) && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + rr) && Math.hypot(x, z + 830) > 50;
    const take = (x: number, z: number, rr: number) => { placed.push([x, z, rr]); };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
    const drum = (x: number, z: number, rad: number, h: number, color: number, sides = 16) => {
      const y = g(x, z) - 0.6, p = W(x, z);
      _q.identity();
      props.push('stone', new THREE.CylinderGeometry(rad, rad * 1.06, h, sides), _m.compose(new THREE.Vector3(p.x, y + h / 2, p.z), _q, _s), color);
      cover.addBox({ x: p.x, z: p.z, yaw: 0, length: rad * 1.6, thickness: rad * 1.6, height: h });
      return y + h;
    };
    const cone = (x: number, z: number, y: number, rad: number, h: number, color: number, sides = 14) => {
      const p = W(x, z);
      _q.identity();
      props.push('plain', new THREE.ConeGeometry(rad, h, sides), _m.compose(new THREE.Vector3(p.x, y + h / 2, p.z), _q, _s), color);
    };
    /** A Martello tower: the squat brick drum, the gun platform on top. */
    const martello = (x: number, z: number) => {
      const top = drum(x, z, 6, 10, 0xb0a084, 20);
      const p = W(x, z);
      props.box('stone', p.x, top + 0.5, p.z, 9, 1, 9, Math.PI / 8, 0x8e8270);
      take(x, z, 8);
    };
    /** A Type 24 pillbox: six concrete sides, a dark loophole band, the slab roof. */
    const pillbox = (x: number, z: number) => {
      const y = g(x, z) - 0.4, p = W(x, z);
      _q.identity();
      props.push('stone', new THREE.CylinderGeometry(2.7, 2.8, 2.3, 6), _m.compose(new THREE.Vector3(p.x, y + 1.15, p.z), _q, _s), 0x9c988c);
      props.push('metal', new THREE.CylinderGeometry(2.72, 2.72, 0.32, 6), _m.compose(new THREE.Vector3(p.x, y + 1.55, p.z), _q, _s), 0x1e1e1c);
      props.push('stone', new THREE.CylinderGeometry(3.0, 3.0, 0.35, 6), _m.compose(new THREE.Vector3(p.x, y + 2.45, p.z), _q, _s), 0x8e8a80);
      cover.addBox({ x: p.x, z: p.z, yaw: 0, length: 4.6, thickness: 4.6, height: 2.5 });
      take(x, z, 5);
    };
    const house = (x: number, z: number, yaw: number, w: number, d: number, storeys: number, name: string) => {
      props.townHouse({ ...W(x, z), yaw, width: w, depth: d, storeys, name, damaged: 0.05 });
      take(x, z, Math.max(w, d) / 2 + 1.5);
    };
    /** Houses on a grid over an area where the ground allows. */
    const quarter = (x0: number, x1: number, zf: (x: number) => number[], keep: number, name: string, storeys = 2, minBack = 36) => {
      for (let x = x0; x <= x1; x += 15) {
        const [za, zb] = zf(x);
        for (let z = za; z >= zb; z -= 14) {
          const hx = x + (r() - 0.5) * 3, hz = z + (r() - 0.5) * 3;
          if (r() > keep || !free(hx, hz, 6, minBack)) continue;
          house(hx, hz, r() < 0.8 ? 0 : Math.PI / 2, 8 + r() * 3, 8, storeys, name);
        }
      }
    };

    // ---- the fixed works first (they claim their ground): Martello towers on the front, pillboxes on the canal line
    for (const x of [-170, 110, 160, 290, 395]) { const z = shoreZ(x) - (wallK(x) > 0.5 ? 44 : 46); if (free(x, z, 7, 30)) martello(x, z); }
    for (let x = CANAL_X0 + 40; x < 490; x += 110) { const z = canalZ(x) - 15; if (free(x, z, 4, 30)) pillbox(x, z); }
    for (const x of [-210, 60, 250]) { const z = shoreZ(x) - 30; if (free(x, z, 4, 26)) pillbox(x, z); }
    // the canal’s bridges: brick parapets either side of the road
    for (const bx of [UP[1](canalZ(-20)), 75 + Math.sin(canalZ(75) * 0.03) * 3, UP[2](canalZ(SLIP))]) {
      const cz = canalZ(bx);
      for (const s of [-1, 1]) props.lowWall({ ...W(bx + s * 4.5, cz), yaw: Math.PI / 2, length: 18, height: 1.0, color: 0x8a5a44 });
    }

    // ---- Sandgate: the castle on the shingle, the terraces along the road under the cliff
    { const x = -440, z = shoreZ(-440) - 34, top = drum(x, z, 7, 9, 0x9a9282, 18); for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; drum(x + Math.cos(a) * 9, z + Math.sin(a) * 9, 4, 5.5, 0x948c7c, 14); } const p = W(x, z); props.box('stone', p.x, top + 0.4, p.z, 6, 0.8, 6, 0.3, 0x7e7668); take(x, z, 14); }
    quarter(-500, -240, (x) => [shoreZ(x) - 52, footZ(x) + 2], 0.85, 'terrace house', 3, 48);
    // ---- Shorncliffe Camp: barrack blocks round the parade ground, the garrison church
    for (let i = 0; i < 8; i++) {
      const x = PL.E[0] - 75 + (i % 4) * 50, z = PL.E[1] - 60 + (i < 4 ? 50 : -50);
      if (free(x, z, 13)) { props.hall({ ...W(x, z), yaw: 0, width: 30, depth: 11, height: 7, color: 0x8a5844, roof: 0x4a4440, door: 3, name: 'barrack block' }); take(x, z, 16); }
    }
    if (free(PL.E[0] + 90, PL.E[1] - 20, 12)) { props.church({ ...W(PL.E[0] + 90, PL.E[1] - 20), yaw: 0 }); take(PL.E[0] + 90, PL.E[1] - 20, 13); }

    // ---- Hythe: the Imperial and the villas on the front, the town between the canal and the hill, St Leonard’s
    if (free(-215, shoreZ(-215) - 62, 13, 30)) { props.townHouse({ ...BACK(-215, 62), yaw: 0, width: 34, depth: 12, storeys: 4, name: 'the Imperial hotel', damaged: 0 }); take(-215, shoreZ(-215) - 62, 18); }
    quarter(-200, 140, (x) => [shoreZ(x) - 56, canalZ(x) + 12], 0.7, 'seafront villa', 2, 52);
    quarter(-210, 170, (x) => [canalZ(x) - 13, footZ(x) - 20], 0.85, 'town house', 2);
    for (const [x, dz] of [[-90, 6], [-60, 0], [110, 4]]) { const z = footZ(x) + dz; if (free(x, z, 11)) { props.church({ ...W(x, z), yaw: 0 }); take(x, z, 12); break; } }
    // ---- the Hythe Ranges: the butts on the shingle, the red flag
    for (let i = 0; i < 3; i++) { const x = 120 + i * 30, z = shoreZ(x) - 110 - i * 8, p = W(x, z); if (!free(x, z, 10, 30)) continue; props.box('plain', p.x, g(x, z) + 1.6, p.z, 26, 3.6, 4, 0, 0x8a8058); cover.addBox({ x: p.x, z: p.z, yaw: 0, length: 26, thickness: 4, height: 3.2 }); take(x, z, 14); }
    { const p = BACK(150, 70); props.box('metal', p.x, terrain.heightAt(p.x, p.z) + 4, p.z, 0.15, 8, 0.15, 0, 0x2a2a28); props.box('plain', p.x + 0.9, terrain.heightAt(p.x, p.z) + 7.4, p.z, 1.6, 1, 0.05, 0, 0xb02a20); }
    // ---- Dymchurch behind its wall, farms and lookers’ huts out on the marsh
    quarter(270, 460, (x) => [shoreZ(x) - 58, shoreZ(x) - 170], 0.7, 'cottage', 2);
    { const x = 400, z = shoreZ(400) - 150; if (free(x, z, 11)) { props.church({ ...W(x, z), yaw: 0 }); take(x, z, 12); } }
    for (let i = 0; i < 40; i++) {
      const x = 120 + r() * 380, z = shoreZ(x) - 120 - r() * 380;
      if (z < footZ(x) + 15 || !free(x, z, 6)) continue;
      if (r() < 0.3) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, r() * 3);
      else props.house({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 6, depth: 5, height: 2.6 });
      take(x, z, 9);
    }

    // ---- up top: Saltwood and its castle, Lympne’s castle on the edge and the aerodrome, oast houses and farms
    { const x = PL.K[0] - 70, z = PL.K[1] + 70; if (free(x, z, 16)) { props.hall({ ...W(x, z), yaw: 0, width: 26, depth: 14, height: 10, color: 0x9a9080, roof: 0x4a4440, door: 4, name: 'Saltwood Castle' }); for (const [dx, dz] of [[-15, -9], [15, -9], [-15, 9], [15, 9]]) drum(x + dx, z + dz, 3.6, 13, 0x948a7a, 12); take(x, z, 22); } }
    quarter(PL.K[0] - 90, PL.K[0] + 110, () => [PL.K[1] + 45, PL.K[1] - 80], 0.55, 'cottage');
    { const x = 410, z = footZ(410) - RISE - 22; if (free(x, z, 15)) { props.hall({ ...W(x, z), yaw: 0, width: 22, depth: 12, height: 9, color: 0x9a9080, roof: 0x4a4440, door: 3, name: 'Lympne Castle' }); drum(x - 13, z, 4, 15, 0x948a7a, 12); take(x, z, 18); } }
    { const x = 445, z = footZ(445) - RISE - 50; if (free(x, z, 11)) { props.church({ ...W(x, z), yaw: 0 }); take(x, z, 12); } }
    for (const [x, z] of [[150, -410], [182, -410]]) if (free(x, z, 15)) { props.timberHangar({ ...W(x, z), yaw: Math.PI }); take(x, z, 18); }
    const oast = (x: number, z: number) => {
      if (!free(x, z, 10)) return;
      const top = drum(x - 5, z, 3.2, 7.5, 0x8e4e38);
      cone(x - 5, z, top - 0.1, 3.6, 5, 0x5e3a2c);
      cone(x - 5, z, top + 4.6, 0.9, 1.8, 0xe8e4da, 6);
      props.townHouse({ ...W(x + 5, z), yaw: Math.PI / 2, width: 7, depth: 12, storeys: 2, name: 'oast barn', damaged: 0 });
      take(x, z, 12);
    };
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * 470, z = footZ(x) - RISE - 40 - r() * 600;
      if (z < -860) continue;
      if (i % 5 === 0) oast(x, z);
      else if (free(x, z, 9)) { buildSite(props, { kind: r() < 0.7 ? 'farm' : 'fieldwall', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, r() * 3); take(x, z, 12); }
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    props.finish();

    // ---- trees: beech and oak hangers on the escarpment, woods on the plateau, a few willows on the marsh
    const faceK = (x: number, z: number) => { const fz = footZ(x); return smoothstep(fz, fz - RISE, z); };
    const inPlaced = (x: number, z: number, m: number) => placed.some(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) < qr + m);
    const blocked = (x: number, z: number) => roadDist(x, z) < 7 || nearPoint(x, z, 18) || inPlaced(x, z, 3)
      || FORTS_L.some((f) => Math.hypot(f.x - x, f.z - z) < 30) || (x > CANAL_X0 - 5 && Math.abs(z - canalZ(x)) < 12) || Math.hypot(x, z + 830) < 40;
    const aerodrome = (x: number, z: number) => x > 110 && x < 300 && z < -250 && z > -460;
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 4000, broadleaf: 0.9, autumn: 0.2, maxY: 90,
      avoid: [{ test: (wx: number, wz: number) => { const z = F * wz; const back = shoreZ(wx) - z; return blocked(wx, z) || back < 60 || aerodrome(wx, z) || (faceK(wx, z) < 0.05 && marshK(wx, back) < 0.5); } }],
      forest: (wx: number, wz: number) => {
        const z = F * wz, k = faceK(wx, z);
        if (k > 0.05 && k < 0.97) return 0.9;
        if (k >= 0.97) return smoothstep(0.2, 0.5, fbm(noise, wx * 0.007 + 3, z * 0.007, 2)) * 0.8;
        return 0.05;
      } });
    cover.finalize(bounds);
    const top = (wx: number, wz: number) => { const z = F * wz; return faceK(wx, z) > 0.98 && !blocked(wx, z) && !aerodrome(wx, z) && Math.hypot(wx - PL.E[0], z - PL.E[1]) > 120; };
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 12000, lane: 0,
      avoid: [{ test: (wx: number, wz: number) => !top(wx, wz) }] });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [{ test: (wx: number, wz: number) => { const z = F * wz, back = shoreZ(wx) - z; return back < 34 || (wallK(wx) > 0.3 && back < 40) || (wx > CANAL_X0 - 5 && Math.abs(z - canalZ(wx)) < 7) || onRoad(wx, z); } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); hedges.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
