// Anzio, 22 January 1944 — Operation Shingle (1945 only; coastal: the sea and the land in one battle, 1.0 × 1.8 km).
// The Allies come in from the sea (+z), the Germans hold the land (-z). US VI Corps landed at two in the morning
// behind the Gustav Line, thirty miles south of Rome, and found almost no one there: a few coast-watch companies and
// engineers. The British 1st Division came ashore on Peter Beach north-west of Anzio, Darby’s Rangers straight into
// Anzio harbour (Yellow), the US 3rd Division on X-Ray east of Nettuno. Lucas dug in instead of driving for the
// Alban Hills, and within days Kesselring had his reserves on the beachhead — the Hermann Göring Division, the 4th
// Fallschirmjäger, the 26th Panzer, Tigers — and in February they came down the Albano road from Aprilia, “the
// Factory”, to the Flyover, to drive the landing back into the sea. Compressed onto the map, west to east: Peter
// Beach under the low tuff bluffs and the rolling ground north-west of Anzio; Anzio on Capo d’Anzio, its harbour and
// mole, Yellow Beach on the harbour front; Nettuno with the Sangallo fort on the shore; X-Ray Beach and the pine woods
// behind it; the Mussolini Canal on the east flank, between its levees, out to the sea. Inland the reclaimed Pontine
// flats, ruled into fields with the regime’s farmhouses (the podere) along the roads, soft with January rain; the
// Padiglione woods; the lateral road and the Flyover where it bridges the Albano road; the Albano road up to the new
// town of Aprilia; and on the skyline the Alban Hills, where the German observers sat and saw everything.
// How it plays: the landing walks ashore against a thin coast watch — a strongpoint on the cape, one on the bluffs,
// a battery in the woods — and has a few minutes to take the beach sectors and push inland. Then Kesselring’s
// reserves come down the roads from Aprilia and Cisterna, Panzers and grenadiers, at whatever the landing holds.
// The canal is only crossed on the two bridges; the woods and the soft flats slow the vehicles off the roads.
// Not point-mirrored: one side lands, the other holds (modes/landing).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1944_01);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a6276 }); // (the Tyrrhenian in January: grey-blue)

/** Capo d’Anzio: the cape the town and the harbour sit on. */
const CAPE = { x: -130, reach: 50, w: 70 };
/** The waterline (z): a straight sandy coast, the cape out past it. */
export const shoreZ = (x: number) => 140 + fbm(noise, x * 0.004, 1.7, 2) * 10 + CAPE.reach * Math.exp(-(((x - CAPE.x) / CAPE.w) ** 2));
/** The Mussolini Canal (x at z), on the east flank, between its levees. */
const canalX = (z: number) => 432 + Math.sin(z * 0.005) * 12;

const ANZIO = { x: -150, z: 70 };    // the town on the cape
const NETTUNO = { x: 160, z: 70 };   // the town east of it
const FLYOVER = { x: -200, z: -360 }; // the lateral road over the Albano road (E)
const PADIGLIONE = { x: 60, z: -300 }; // the hamlet on the Nettuno road, the woods north-east of it (F)
const CANAL_PT = { x: 385, z: -250 }; // the bridge over the canal on the lateral road (G)
const APRILIA = { x: -60, z: -690 };  // the new town, “the Factory” (K)
/** The canal bridges: the coast road and the lateral road. */
const BRIDGES = [70, -250];

/** The roads, as polylines. */
const ROADS: [number, number][][] = [
  [[-520, 60], [-370, 45], [-250, 40], [ANZIO.x, 20], [-10, 40], [NETTUNO.x, 30], [330, 50], [canalX(BRIDGES[0]), BRIDGES[0]], [520, 75]], // the coast road
  [[ANZIO.x, 20], [-170, -200], [FLYOVER.x, FLYOVER.z], [-130, -560], [APRILIA.x, APRILIA.z], [-40, -920]],            // the Albano road (Via Anziate)
  [[-520, -390], [FLYOVER.x, FLYOVER.z], [PADIGLIONE.x, PADIGLIONE.z], [250, -320], [CANAL_PT.x, CANAL_PT.z], [canalX(BRIDGES[1]), BRIDGES[1]], [520, -245]], // the lateral road
  [[NETTUNO.x, 30], [90, -150], [PADIGLIONE.x, PADIGLIONE.z], [120, -560], [180, -920]],                                // Nettuno – Cisterna
  [[-370, 45], [-330, -150], [FLYOVER.x, FLYOVER.z]],                                                                  // up from Peter Beach
  [[-10, 40], [20, -60], [90, -150]],                                                                                  // up from Yellow Beach
  [[330, 50], [350, -100], [CANAL_PT.x, CANAL_PT.z]],                                                                  // up from X-Ray
  [[APRILIA.x, APRILIA.z], [120, -700], [300, -760], [520, -790]],                                                     // Aprilia – Cisterna
];
const segD = (x: number, z: number, [ax, az]: number[], [bx, bz]: number[]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const roadRaw = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) for (let i = 1; i < r.length; i++) d = Math.min(d, segD(x, z, r[i - 1], r[i])); return d; };
const roadD = gridCache(roadRaw, BOUNDS, 2);
const onRoad = (x: number, z: number) => z < shoreZ(x) - 25 && roadD(x, z) < 3.5;

// level ground under the built-up spots: [x, z, r]
const FLAT = [[FLYOVER.x, FLYOVER.z, 50], [PADIGLIONE.x, PADIGLIONE.z, 50], [CANAL_PT.x, CANAL_PT.z, 40], [APRILIA.x, APRILIA.z, 90], [0, -830, 60]];

/** The land behind the beach: the flats rising gently inland, rolling to the west, the Alban Hills on the skyline. */
function plain(x: number, z: number) {
  let h = 4.5 + Math.max(0, -z) * 0.018 + fbm(noise, x * 0.004, z * 0.004, 3) * 1.6;
  h += (fbm(noise, x * 0.012 + 5, z * 0.012, 2) + 0.3) * 4 * smoothstep(-120, -320, x);   // the rolling ground north-west of Anzio
  h += 9 * smoothstep(1, 0.4, Math.hypot((x - ANZIO.x) / 150, (z - ANZIO.z) / 110));      // the cape’s low plateau
  h += (34 + fbm(noise, x * 0.003, 9.1, 3) * 16) * smoothstep(-880, -1000, z) ** 0.7;              // the Alban Hills, out past the edge
  return h;
}

function height(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz;
  if (d > 0) { // the sea floor: shelving off gently (the sandbars that held up the LSTs off Peter Beach), then deeper
    let h = 0.5 - d * 0.035 + 0.4 * Math.exp(-(((d - 110) / 18) ** 2)) * smoothstep(-200, -320, x);
    h -= Math.max(0, d - 170) * 0.09;
    return Math.max(h, -16);
  }
  const back = -d;
  // the beach (30 m of sand), low dunes and the pinewood behind — on Peter Beach low tuff bluffs — then the flats
  const beach = 0.5 + back * 0.06;
  const dune = (0.8 + fbm(noise, x * 0.03 + 3, z * 0.03, 2) * 1.2) * smoothstep(25, 45, back) * smoothstep(110, 70, back);
  const bluff = 6 * smoothstep(-250, -320, x) * smoothstep(28, 45, back);
  const t = smoothstep(40, 130, back);
  let h = (beach + dune + bluff) * (1 - t) + Math.max(plain(x, z), bluff * 0.8) * t;
  for (const [fx, fz, fr] of FLAT) { const k = smoothstep(fr, fr * 0.6, Math.hypot(x - fx, z - fz)); if (k > 0) h += (plain(fx, fz) - h) * k; }
  // the Mussolini Canal: levees either side, the water between (two bridges)
  const cd = Math.abs(x - canalX(z));
  if (cd < 20 && back > 4) {
    const br = BRIDGES.reduce((m, b) => Math.min(m, Math.abs(z - b)), Infinity);
    const open = smoothstep(5, 9, br); // (0 on a bridge’s causeway)
    h += 1.6 * Math.exp(-(((cd - 11) / 3) ** 2)) * open * smoothstep(10, 30, back);
    h += (-1.8 - h) * smoothstep(8.5, 6, cd) * open;
  }
  return h;
}

/** The January mud: off the roads the flats are soft, the vehicles slow. */
const softK = (x: number, z: number) => (roadRaw(x, z) < 4 || z > shoreZ(x) - 40 ? 0 : smoothstep(-200, 0, x) * smoothstep(shoreZ(x) - 80, shoreZ(x) - 160, z));
const softC = gridCache(softK, BOUNDS);
const soft = (x: number, z: number, foot: boolean) => { const k = softC(x, z); return k <= 0.05 ? 1 : 1 - k * (foot ? 0.12 : 0.35); };

/** The beach sectors, west to east: the British on Peter, the Rangers in the harbour, the 3rd Division on X-Ray. */
export const SECTORS = [{ x: -370, name: 'Peter Beach' }, { x: -10, name: 'Yellow Beach' }, { x: 330, name: 'X-Ray Beach' }];
const beachPt = (x: number) => shoreZ(x) - 32;

const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Peter Beach', x: -370, z: beachPt(-370), owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Yellow Beach', x: -10, z: beachPt(-10), owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: 'X-Ray Beach', x: 330, z: beachPt(330), owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: 'The Flyover', x: FLYOVER.x, z: FLYOVER.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Padiglione', x: PADIGLIONE.x, z: PADIGLIONE.z, owner: null, sector: 'centre' },
  { id: 'G', name: 'Mussolini Canal', x: CANAL_PT.x, z: CANAL_PT.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Aprilia (the Factory)', x: APRILIA.x, z: APRILIA.z, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

/** The coast watch: a strongpoint on the cape over the harbour, one on the bluffs over Peter Beach; a battery in the woods. */
const FORTS = [
  { unit: 'wn', x: -95, z: shoreZ(-95) - 45, facing: 0 },
  { unit: 'wn', x: -290, z: shoreZ(-290) - 55, facing: 0 },
  { unit: 'battery', x: 230, z: -470, facing: 0 },
];
const nearFort = (x: number, z: number) => FORTS.some((f) => Math.hypot(f.x - x, f.z - z) < 40);
/** The Padiglione woods and the pinewood behind X-Ray. */
const woodsK = (x: number, z: number) => Math.max(
  smoothstep(1, 0.6, Math.hypot((x - 200) / 190, (z + 450) / 150)) * smoothstep(-0.3, 0.1, fbm(noise, x * 0.01, z * 0.01 + 4, 2)),
  smoothstep(200, 240, x) * smoothstep(410, 380, x) * smoothstep(shoreZ(x) - 50, shoreZ(x) - 80, z) * smoothstep(-160, -110, z));
/** Anzio and Nettuno: (0..1) built-up. */
const townK = (x: number, z: number) => Math.max(smoothstep(1, 0.8, Math.hypot((x - ANZIO.x) / 120, (z - ANZIO.z + 20) / 90)), smoothstep(1, 0.8, Math.hypot((x - NETTUNO.x) / 85, (z - NETTUNO.z + 10) / 60)));

export default {
  id: 'anzio',
  name: 'Anzio',
  description: 'The Anzio beachhead, 22 January 1944, Operation Shingle: Peter, Yellow and X-Ray beaches round Anzio and Nettuno, the reclaimed Pontine flats with their farmhouses, the Padiglione woods, the Mussolini Canal and the Albano road up past the Flyover to Aprilia, the Alban Hills on the skyline. VI Corps lands almost unopposed; Kesselring’s reserves counter-attack from inland.',
  epochs: ['1945'],
  region: 'europe', // (the 21st Army Group’s British are only on the Western Europe maps: data/factions.js armiesFrom)
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Allies', pact: 'Germany' },
  armies: { nato: ['us', 'brit21'], pact: ['wh', 'fj'] }, // (US VI Corps — the 3rd Division, the Rangers — and the British 1st Division against the coast watch, then the Hermann Göring Division and the 4th Fallschirmjäger)
  conditions: { time: 'dawn', weather: 'clear' }, // (a calm, clear January night: they were ashore by first light)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  airfields: [], // (no runway on the beachhead’s flats: Nettuno’s strip was a fighter field under the German guns — the aircraft come from the map edge)
  steep: 0.45,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1944,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woodsK(x, z) * 0.85,
  fields: createFields({ seed: 1944, cell: 60, weights: [0.38, 0.38, 0.04, 0.2] }), // (January: winter wheat up green, the rest ploughed or grazed)

  theme: {
    // a clear January dawn: low cold light, haze over the flats, the hills blue in the distance
    fogColor: 0xc6ccd0, fogDensity: 0.0006,
    skyTop: 0x5a7ea6, skyHorizon: 0xe0d8c8, skyBottom: 0x8a8a7e,
    sunColor: 0xffe0bc, sunIntensity: 1.7, sunDisk: 0.4,
    clouds: 0.25, cloudLight: 0xf2ece4, cloudDark: 0xa4a6ac,
    sunDir: [0.55, 0.32, 0.7],
    hemiSky: 0xccd4de, hemiGround: 0x5e6044, hemiIntensity: 1.25,
    rimColor: 0xe6dccc, rimIntensity: 0.24,
    terrain: {
      grass: '#66743e', grassAlt: '#5c6a38', dryGrass: '#94884e', dirt: '#6a5840', rock: '#8a8270',
      pasture: '#6a7840', ploughed: '#5e4c36', stubble: '#9a8a58', meadow: '#727e46',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x), back = sz - z;
        if (onRoad(x, z)) return [townK(x, z) > 0.5 ? 0x7a766e : 0x9a8a6a, 0.9];               // the streets, the gravel roads
        if (back < -3) return [y > -0.8 ? 0xc8ba96 : 0x948a74, 1];                              // the sand under the water
        if (back < 30) return [0xd8caa2, 1];                                                    // the beach
        if (Math.abs(x - canalX(z)) < 20 && back > 4) return [0x6e7448, 0.9];                   // the canal’s grassed levees
        if (townK(x, z) > 0.6) return [0x8a8274, 0.7];                                          // the towns’ yards and squares
        if (x < -250 && back < 60) return [0xa89a76, 0.8];                                      // the tuff bluffs
        if (back < 80) return [0xc4b48a, 0.5 + Math.max(0, fbm(noise, x * 0.05, z * 0.05, 2)) * 0.4]; // the dunes: sand under the pines
        return null;                                                                            // the fields
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -830, entries: [-200, 0, 260] } },          // (the Albano road, the Cisterna roads)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,

  landing: {
    attacker: 'nato',
    // the US Navy’s craft (data/units45/ships.js): Higgins boats for the men, LCT Mk 6s for the vehicles (the British: LCA, LCT Mk 4)
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    forts: FORTS,
    names: { wn: 'Stützpunkt' },
    // hardly any works: a little wire on the harbour front and the bluffs, mines off the cape, a tank trap on the harbour exit
    works: [
      ...Array.from({ length: 16 }, (_, i) => { const x = -80 + i * 10; return { kind: 'wire', x, z: shoreZ(x) - 36, yaw: 0 }; }),
      ...Array.from({ length: 12 }, (_, i) => { const x = -340 + i * 10; return Math.abs(x - SECTORS[0].x) < 15 ? null : { kind: 'wire', x, z: shoreZ(x) - 40, yaw: 0 }; }).filter(Boolean),
      { kind: 'mines', x: -60, z: shoreZ(-60) - 50 }, { kind: 'mines', x: 40, z: shoreZ(40) - 55 },
      { kind: 'tankTraps', x: 10, z: shoreZ(10) - 70 },
    ],
    // a thin mine barrier off the coast, swept lanes off the three beaches
    seaMines: { z: [520, 580], count: 36, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1944_01 },
    // what the landing may call in at sea: the destroyers inshore, the minesweepers, the light cruisers (Brooklyn, Spartan)
    navy: ['destroyer', 'minesweeper', 'lightCruiser'],
    // the coast watch at H-hour: a few companies and engineers, in the towns, at the bridges and crossroads
    defence: ['rifles', 'mgTeam', 'rifles', 'atTeam', 'mgTeam', 'rifles', 'mortar', 'scouts', 'engineers', 'mgTeam', 'rifles'],
    hold: [
      { x: ANZIO.x + 30, z: ANZIO.z - 40 }, { x: NETTUNO.x, z: NETTUNO.z - 40 }, { x: -300, z: shoreZ(-300) - 90 }, { x: 300, z: shoreZ(300) - 110 },
      { x: FLYOVER.x, z: FLYOVER.z + 20 }, { x: PADIGLIONE.x, z: PADIGLIONE.z + 20 }, { x: CANAL_PT.x, z: CANAL_PT.z + 20 },
    ],
    // Kesselring’s reserves: the Hermann Göring Division’s Panzers, Tigers and the paratroopers, down from Aprilia and Cisterna
    counter: { t: 320, units: ['heavyTank', 'tank', 'ifv', 'rifles', 'tank', 'tankDestroyer', 'rifles', 'heavyTank', 'ifv', 'rifles'],
      say: 'Kesselring’s reserves are here: the Hermann Göring Division and the paratroopers are coming down from Aprilia and Cisterna',
      sayOther: 'Enemy armour coming down the Albano road and from Cisterna: Panzers and Tigers, straight for the beachhead' },
    // the landing’s AI (ai/LandingDirector.js): two destroyers inshore, a sweeper for the lanes, a cruiser offshore
    ai: { order: ['rifles', 'rifles', 'tank', 'rifles', 'engineers', 'mgTeam', 'tank', 'rifles', 'atTeam', 'mortar', 'rifles', 'tank', 'atTeam', 'rifles'], gunship: 'destroyer', gunships: 2, sweeper: 'minesweeper', heavy: 'lightCruiser' },
    economy: { reserves: 2400, perSector: 700, beachIncome: 1.0, defenceCp: 600, defenceIncome: 1.5 },
    // H-hour, 02:00: the British onto Peter, the Rangers into the harbour, the 3rd Division onto X-Ray
    waves: [{ t: 0, say: 'H-hour: VI Corps is going in — and no one is shooting yet', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'tank', sector: 2 },
    ] }],
  },

  spawns: {
    nato: [{ unit: 'destroyer', x: -190, z: 850, facing: Math.PI / 2 }, { unit: 'destroyer', x: 170, z: 860, facing: -Math.PI / 2 }], // (between the lanes)
    pact: [],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1944_01);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const canalD = (x: number, z: number) => Math.abs(x - canalX(z));
    const clear = (x: number, z: number, w = 9) => roadD(x, z) > w && !nearFort(x, z) && canalD(x, z) > 24 + w && z < shoreZ(x) - 30 - w;

    // ---- Anzio on the cape: tall houses packed along the streets, the church on the square; palms on the front
    props.church({ x: ANZIO.x + 20, z: ANZIO.z - 40, yaw: Math.PI / 2 });
    for (let i = 0; i < 150; i++) {
      const x = ANZIO.x + (r() * 2 - 1) * 120, z = ANZIO.z - 20 + (r() * 2 - 1) * 85;
      if (townK(x, z) < 0.5 || !clear(x, z, 6) || nearPoint(x, z, 50) || Math.hypot(x - ANZIO.x - 20, z - ANZIO.z + 40) < 16) continue;
      const yaw = r() < 0.5 ? 0 : Math.PI / 2;
      if (r() < 0.55) props.townHouse({ x, z, yaw, width: 8 + r() * 3, depth: 9, storeys: 2 + (r() < 0.3 ? 1 : 0), name: 'town house', damaged: 0.15 });
      else props.flatHouse({ x, z, yaw, width: 8 + r() * 4, depth: 8, storeys: 2, name: 'house' });
    }
    for (let i = 0; i < 6; i++) { const x = -60 + i * 9, z = shoreZ(x) - 30 - r() * 4; if (clear(x, z, 3)) props.palm({ x, z, height: 8 + r() * 3 }); }
    // the harbour mole, out from the cape’s tip to the east, a light at its head
    for (let s = 0; s < 110; s += 6) {
      const x = -110 + s * 0.55, z = shoreZ(-110) + 4 + s * 0.85;
      props.box('stone', x, 0.9, z, 7, 3.2, 6.4, -0.57, 0x8a8478);
    }
    { const x = -110 + 110 * 0.55, z = shoreZ(-110) + 4 + 110 * 0.85; props.box('stone', x, 4, z, 2.4, 6, 2.4, 0, 0xd8d0c0); props.box('plain', x, 7.5, z, 2.8, 1.2, 2.8, 0, 0xa83a2a); }
    // ---- Nettuno: the old town on the shore, the Sangallo fort beside it
    for (let i = 0; i < 90; i++) {
      const x = NETTUNO.x + (r() * 2 - 1) * 85, z = NETTUNO.z - 10 + (r() * 2 - 1) * 60;
      if (townK(x, z) < 0.5 || !clear(x, z, 6) || nearPoint(x, z, 50)) continue;
      const yaw = r() < 0.5 ? 0 : Math.PI / 2;
      if (r() < 0.5) props.townHouse({ x, z, yaw, width: 8 + r() * 2, depth: 9, storeys: 2, name: 'town house', damaged: 0.15 });
      else props.flatHouse({ x, z, yaw, width: 7 + r() * 3, depth: 7, storeys: r() < 0.5 ? 2 : 1, name: 'house' });
    }
    { const x = 70, z = shoreZ(70) - 36, y = g(x, z); // (Forte Sangallo: a square bastioned fort of brick)
      props.box('stone', x, y + 4, z, 20, 8, 20, 0.1, 0x9a7a5a);
      for (const [dx, dz] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) props.box('stone', x + dx, y + 4.5, z + dz, 6, 9, 6, 0.9, 0x8e7052);
      cover.addBox({ x, z, yaw: 0.1, length: 22, thickness: 22, height: 8 }); }

    // ---- the Flyover: the lateral road carried over the Albano road on its bridge
    { const x = FLYOVER.x, z = FLYOVER.z, y = g(x, z), yaw = Math.atan2(PADIGLIONE.x - x, PADIGLIONE.z - z);
      props.box('stone', x, y + 6.2, z, 7, 0.8, 22, yaw, 0x9a948a);
      for (const s of [-8, 8]) for (const k of [-2.5, 2.5]) { const [px, pz] = PropBuilder.local(x, z, yaw, k, s); props.box('stone', px, y + 3, pz, 0.9, 6, 0.9, 0, 0x8a847a); }
      for (const k of [-3.3, 3.3]) { const [px, pz] = PropBuilder.local(x, z, yaw, k, 0); props.box('stone', px, y + 7, pz, 0.3, 0.8, 22, yaw, 0x8a847a); } }
    // ---- Padiglione: the hamlet on the Nettuno road
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, dd = 25 + r() * 35, x = PADIGLIONE.x + Math.cos(a) * dd, z = PADIGLIONE.z + Math.sin(a) * dd;
      if (!clear(x, z, 6) || nearPoint(x, z, 22)) continue;
      props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8, depth: 7, storeys: 2, name: 'house' });
    }
    // ---- the canal bridges: a concrete deck and rails over the water
    for (const bz of BRIDGES) {
      const x = canalX(bz);
      props.box('stone', x, Math.max(g(x - 12, bz), g(x + 12, bz)) + 0.2, bz, 22, 0.5, 8, 0, 0x9a968c);
      for (const s of [-4, 4]) props.box('stone', x, Math.max(g(x - 12, bz), g(x + 12, bz)) + 0.9, bz + s, 22, 0.8, 0.3, 0, 0x8a867c);
    }
    // ---- Aprilia, “the Factory”: the regime’s new town — the church and its tower, the town hall, the long brick blocks
    props.church({ x: APRILIA.x + 30, z: APRILIA.z + 40, yaw: 0 });
    { const x = APRILIA.x + 42, z = APRILIA.z + 26, y = g(x, z); props.box('stone', x, y + 11, z, 4, 22, 4, 0, 0xb09070); }
    for (const [dx, dz, w, d, yaw] of [[-50, 40, 30, 12, 0], [-50, -40, 30, 12, 0], [40, -45, 34, 14, 0], [-80, 0, 12, 34, 0], [85, 10, 14, 30, 0]] as number[][]) {
      const x = APRILIA.x + dx, z = APRILIA.z + dz;
      if (roadD(x, z) < 10) continue;
      props.hall({ x, z, yaw, width: w, depth: d, height: 8, color: 0x9a6a50, roof: 0x5a4a44, door: 6, name: 'brick block' });
    }
    for (let i = 0; i < 20; i++) {
      const a = r() * Math.PI * 2, dd = 60 + r() * 50, x = APRILIA.x + Math.cos(a) * dd, z = APRILIA.z + Math.sin(a) * dd;
      if (!clear(x, z, 6) || nearPoint(x, z, 25) || Math.hypot(x - APRILIA.x - 34, z - APRILIA.z - 36) < 26) continue; // (clear of the church and its tower)
      props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 9, depth: 8, storeys: 2, name: 'house' });
    }
    commandPost(props, this.bases.pact, 1, 0x7a7a5a);

    // ---- the podere: the reclaimed flats’ farmhouses, one every few hundred metres along the roads, a barn beside each
    for (let i = 0; i < 90; i++) {
      const x = (r() * 2 - 1) * 470, z = shoreZ(x) - 140 - r() * 820;
      if (z < -860 || !clear(x, z, 14) || roadD(x, z) > 40 || nearPoint(x, z, 60) || woodsK(x, z) > 0.2 || townK(x, z) > 0.1 || Math.hypot(x - APRILIA.x, z - APRILIA.z) < 120 || Math.hypot(x, z + 830) < 70) continue;
      const yaw = r() < 0.5 ? 0 : Math.PI / 2;
      if (r() < 0.7) {
        props.flatHouse({ x, z, yaw, width: 10, depth: 8, storeys: 2, name: 'podere' });
        const [bx, bz] = PropBuilder.local(x, z, yaw, 13, 2);
        if (clear(bx, bz, 6)) props.house({ x: bx, z: bz, yaw, width: 8, depth: 6, height: 3 });
      } else buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, yaw);
    }
    // haystacks and the odd fishing boat drawn up on the sand
    for (let i = 0; i < 40; i++) { const x = (r() * 2 - 1) * 450, z = -150 - r() * 650; if (clear(x, z, 6) && !nearPoint(x, z, 30) && woodsK(x, z) < 0.1) props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 2) }); }
    for (let i = 0; i < 10; i++) {
      const x = -480 + r() * 960, z = shoreZ(x) - 8 - r() * 12;
      if (SECTORS.some((s) => Math.abs(s.x - x) < 60) || Math.abs(x - CAPE.x) < 90 || canalD(x, z) < 30) continue;
      props.box('plain', x, g(x, z) + 0.35, z, 1.6, 0.7, 5, 0.3 + r(), 0x3a5a7a);
    }
    props.finish();

    const avoid = [
      { x: this.bases.pact.x, z: this.bases.pact.z, r: 35 },
      ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadD(x, z) < 6 || nearFort(x, z) || townK(x, z) > 0.3 || canalD(x, z) < 22 || z > shoreZ(x) - 40 || Math.hypot(x - APRILIA.x, z - APRILIA.z) < 110 },
    ];
    // the Padiglione woods (oak and cork oak), the pines behind the beaches, poplars along the roads and ditches
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 3800, broadleaf: 0.6, autumn: 0.3, maxY: 80, avoid,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 + 0.03 });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 500, broadleaf: 0, autumn: 0, size: 0.8, maxY: 40,
      avoid: [...avoid, { test: (x: number, z: number) => { const b = shoreZ(x) - z; return b < 45 || b > 110 || x < -250 || SECTORS.some((s) => Math.abs(s.x - x) < 45); } }],
      forest: (x: number, z: number) => 0.35 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.4 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.8, fields: this.fields,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => z > shoreZ(x) - 35 || townK(x, z) > 0.5 || canalD(x, z) < 9 || Math.hypot(x - 70, z - shoreZ(70) + 36) < 18 }] }); // (nothing growing on the fort)
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); pines.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
