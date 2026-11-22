// The Ofotfjord, winter 1985 (coastal: the Soviet naval infantry lands, Norway holds; 1.0 × 1.8 km). Narvik from the
// sea, the way the Kriegsmarine's destroyers came in on 9 April 1940: up the Ofotfjord between snow mountains that
// stand straight out of the water, to the ice-free ore port at its head — Sweden's iron ore for the Atlantic, and the
// key to the whole northern flank. Out at sea the Pact's landing ships and the Norwegian controlled minefield across
// the fjord; then three landing places along the shore: Framnes, the tip of the Narvik peninsula, in the north with
// the Herjangsfjord arm reaching away inland behind its ridge toward Bjerkvik; the LKAB ore harbour in the middle —
// the shore under the town, the ore piers, the crushing plant and the silos, the yard of the ore railway (Ofotbanen)
// running off east for Kiruna; and Ankenes across the mouth of the Beisfjord in the south, under Ankenesfjellet.
// The E6 runs along the shore and round the Beisfjord's head; Narvik climbs its hillside behind the quays; inland,
// up the valley, Fagernes on the E6 where Brigade Nord comes from. Mountains wall in both sides: the infantry may
// climb them, vehicles keep to the shore and the valley (`steep`).
// (Compressed: the Beisfjord is a short arm here, Framnes and Ankenes 700 m apart, the Herjangsfjord beside the map.)
// Laid out like Andøya (maps/andoya.ts) in a frame with the sea toward +z (`L`), then turned round: the Pact's side
// is -z, so the sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 560, z: 960 }; // (the battlefield and a margin: the height is sampled once onto a grid there)
const noise = createNoise2D(1985_40);
const sea = createSea({ level: 0, size: SIZE, color: 0x1e3640 }); // (the Ofotfjord: deep, still and dark)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The rocky points between the landing places (x): the Framnes ridge's foot, and Ankenes point by the Beisfjord. */
const HEADS = [{ x: -160, reach: 65, w: 42 }, { x: 262, reach: 50, w: 30 }];
const headK = (x: number) => Math.max(...HEADS.map((h) => Math.exp(-(((x - h.x) / h.w) ** 2))));
/** The waterline (local z): the shore a little over a hundred metres from the middle, the points out past it. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 12 + Math.max(...HEADS.map((h) => h.reach * Math.exp(-(((x - h.x) / h.w) ** 2))));

/** The Beisfjord: a narrow arm in between the ore harbour and Ankenes, its head 340 m in. Metres outside it (− on it). */
const INLET_HEAD = -190;
const inletX = (z: number) => 175 + 10 * Math.sin(z * 0.01);
function inletD(x: number, z: number) {
  if (z < INLET_HEAD) return Math.hypot(x - inletX(INLET_HEAD), z - INLET_HEAD) - 8;
  return Math.abs(x - inletX(z)) - (8 + 34 * smoothstep(INLET_HEAD, INLET_HEAD + 200, z));
}

/** A mountainside out of the water: `e` m in from its foot, up to a ridged crest. */
function mountain(e: number, x: number, z: number, top: number) {
  if (e < -40) return -99;
  const h = 2 + e * 1.3;
  if (h < 20) return h;
  const crest = top + ridged(noise, x * 0.006 + 9, z * 0.006, 3) * 90;
  return Math.min(h, crest) - Math.max(0, Math.min(h, crest) - crest * 0.8) * 0.3;
}
/** The fjord's walls: Ankenesfjellet on the south (+x), widening off out to sea; the Herjangsfjord's far side (−x). */
const wallR = (z: number) => 445 + fbm(noise, z * 0.004, 7.3, 2) * 22 + 80 * smoothstep(160, 460, z);
const wallL = (z: number) => -575 - fbm(noise, z * 0.004, 3.1, 2) * 22;
/** The Herjangsfjord arm (inland, along the −x edge) and the Framnes ridge between it and the peninsula. */
const armK = (x: number, z: number) => smoothstep(-430, -455, x) * smoothstep(shoreZ(x) - 20, shoreZ(x) - 80, z);
const ridgeK = (x: number, z: number) => Math.exp(-(((x + 400) / 26) ** 2)) * smoothstep(shoreZ(x) - 10, shoreZ(x) - 110, z);

/** The fells between the valleys inland: Fagernesfjellet behind Framnes, the mountain at the Beisfjord's head. [x, z, r, m] */
const MASSIFS = [[-140, -400, 75, 75], [245, -345, 55, 60]];
function massif(x: number, z: number) {
  let k = 0;
  for (const [cx, cz, r, m] of MASSIFS) k += m * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return k < 0.3 ? k : k * (1 + 0.25 * fbm(noise, x * 0.02, z * 0.02, 2));
}

/** Ground height in the local frame (sea toward +z). */
function heightLRaw(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  const hk = headK(x);
  let h: number;
  if (d > 0) { // the fjord bottom: shelving off fast, rocks off the points
    h = Math.max(0.4 - d * 0.025 - Math.max(0, d - 100) * 0.08 + hk * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05)), -24);
  } else {
    const back = -d;
    // the shore (30 m of shingle and snow), a bank, then the slope up through the town and up the valley inland (~25 m at Fagernes)
    const beach = 0.5 + Math.min(back, 40) * 0.04;
    const land = 4 + smoothstep(30, 110, back) * 4 + Math.min(Math.max(0, back - 220) * 0.028, 18) + fbm(noise, x * 0.005, z * 0.005, 3) * 3;
    h = Math.max(beach, Math.min(land, beach + back * 0.2));
    if (hk > 0.05) { // the points: bare rock 12–18 m high, a cliff to the water
      const top = 13 + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
      h = h + (Math.max(h, 0.5 + top * smoothstep(4, 22, back)) - h) * smoothstep(0.25, 0.7, hk);
    }
    h += massif(x, z);
    const rk = ridgeK(x, z);
    if (rk > 0.01) h += rk * (70 + fbm(noise, x * 0.01, z * 0.01, 2) * 25) * smoothstep(0, 140, back);
    const ak = armK(x, z);
    if (ak > 0) h += (Math.max(-14, -0.5 - (-430 - x) * 0.35) - h) * ak; // the Herjangsfjord's water
  }
  // the Beisfjord: steep rocky banks, deep water
  const id = inletD(x, z);
  if (id < 30) h = Math.min(h, id < 0 ? Math.max(-14, 0.4 + id * 0.4) : 0.4 + id * 0.55);
  // the walls of the fjord
  h = Math.max(h, mountain(x - wallR(z), x, z, 170), mountain(wallL(z) - x, x, z, 190));
  return h;
}
const heightC = gridCacheSmooth((x: number, z: number) => heightLRaw(x, F * z), EXT, 2);
const height = (x: number, z: number) => heightC(x, z);

// ---- the roads (local frame): the E6 along the shore and round the Beisfjord's head, a road up from each landing
// place, the valley road to Fagernes, the road across behind
const ROADS: number[][][] = [
  [[-430, -20], [-320, 45], [-160, -15], [10, 45], [110, 40], [125, -60], [132, -225], [218, -232], [236, -60], [262, 32], [380, 40], [430, 10]], // the E6
  [[-320, 45], [-300, -110], [-250, -400], [-150, -600]],     // up from Framnes
  [[10, 45], [25, -230], [65, -430], [150, -640]],             // up through Narvik, the valley road
  [[380, 40], [370, -120], [340, -300], [250, -480], [150, -640]], // up from Ankenes
  [[-440, -560], [-150, -600], [150, -640], [430, -600]],      // the road across behind
  [[150, -640], [40, -760], [0, -830]], [[-150, -600], [-60, -760], [0, -830]], // to Brigade Nord's base
];
/** The ore railway: from the piers through the yard, then off east up the valley for Sweden. */
const RAIL: number[][] = [[95, 20], [92, -120], [90, -300], [200, -540], [470, -700]];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const lineDist = (l: number[][], x: number, z: number) => { let d = Infinity; for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1])); return d; };
const roadDistL = gridCacheSmooth((x: number, z: number) => Math.min(...ROADS.map((l) => lineDist(l, x, z))), BOUNDS, 2);
const railDistL = gridCacheSmooth((x: number, z: number) => lineDist(RAIL, x, z), BOUNDS, 2);
const onRoadL = (x: number, z: number) => roadDistL(x, z) < 3.5;
const onRoad = (x: number, z: number) => onRoadL(x, F * z);

/** Deep snow on the mountainsides: everyone wades (vehicles can't get up there anyway: `steep`). */
const snowC = gridCache((x: number, z: number) => smoothstep(22, 50, height(x, z)), BOUNDS);
function soft(x: number, z: number) {
  if (onRoad(x, z)) return 1;
  return 1 - snowC(x, z) * 0.5;
}

/** The landing places (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -320, name: 'Framnes', inland: { name: 'Framnes', x: -300, z: -110 } },
  { x: 10, name: 'Ore harbour', inland: { name: 'Narvik', x: 25, z: -230 } },
  { x: 345, name: 'Ankenes shore', inland: { name: 'Ankenes', x: 370, z: -120 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
const beachLine = (x: number) => shoreZ(x) - 40;

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Framnes point', ...W(-320, beachLine(-320)), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'LKAB ore harbour', ...W(10, beachLine(10)), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Ankenes shore', ...W(345, beachLine(345)), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Framnes', ...W(-300, -110), owner: null, sector: 'west' },
  { id: 'F', name: 'Narvik', ...W(25, -230), owner: null, sector: 'centre' },
  { id: 'G', name: 'Ankenes', ...W(370, -120), owner: null, sector: 'east' },
  { id: 'K', name: 'Fagernes', ...W(150, -640), owner: 'nato', sector: 'centre' },
];

export default {
  id: 'ofotfjord',
  name: 'Ofotfjord Landing',
  description: 'Narvik from the sea, winter 1985: snow mountains straight out of the Ofotfjord, the LKAB ore harbour and its railway under the town, Framnes and the Herjangsfjord to the north, Ankenes across the Beisfjord. The Soviet naval infantry lands as the Germans did in 1940; Norway and the US Marines hold.',
  epochs: ['1985'],
  region: 'north',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (Brigade Nord, the Home Guard and the Marines' reinforcement; the Northern Fleet's naval infantry lands)
  conditions: { time: 'dawn', weather: 'overcast' },
  climate: 'winter',
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles: the mountainsides, the ridge and the points are no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft,
  river: sea,
  airfields: [], // (no strip between the fjord and the fells: the aircraft come in from the map edge — systems/Airfields.js)

  theme: {
    // a short grey Arctic day, cloud on the tops
    fogColor: 0xaab4be, fogDensity: 0.0007,
    skyTop: 0x5c6e86, skyHorizon: 0xc4c8cc, skyBottom: 0x7a828c,
    sunColor: 0xffe0c4, sunIntensity: 1.4, sunDisk: 0.15,
    clouds: 0.75, cloudLight: 0xdadcdc, cloudDark: 0x7a828e,
    sunDir: [0.45, 0.25, -0.85],
    hemiSky: 0xccd6e2, hemiGround: 0x8a9098, hemiIntensity: 1.45,
    rimColor: 0xc4d0dc, rimIntensity: 0.28,
    terrain: {
      grass: '#eef2f4', grassAlt: '#e2e8ec', dryGrass: '#d8d8d0', dirt: '#8a8478', rock: '#5e6064',
      pasture: '#eceff0', ploughed: '#d0ccc4', stubble: '#dcd8ce', meadow: '#f2f4f4',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoadL(x, lz)) return [0xa4a098, 0.85];                                       // the ploughed E6
        if (railDistL(x, lz) < 2.5 && y > 0.8) return [0x4e4a44, 0.9];                      // ballast
        if (y < 0.3) return [y > -3 ? 0x6a6860 : 0x3e3c38, 1];                              // the stony bottom
        if (y < 1.4) return [0x5a5a54, 0.85];                                               // the dark tide line, below the snow
        if (headK(x) > 0.3 && y > 2.5 && lz > sz - 40) return [0x4e5054, 0.9];             // the points' bare rock
        if (y > 9) return [0xe4e8ec, smoothstep(-0.35, 0.25, noise(x * 0.025, z * 0.025)) * smoothstep(9, 20, y) * 0.8]; // snow on the mountainsides, the steepest rock bare
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 25, 370] }, pact: { x: 0, z: -830, entries: [-320, 10, 345] } }, // (the Pact lands: its roads are the landing places)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Soviet landing comes in: the naval infantry by Aist hovercraft or Polnocny, vehicles by Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    // what the landing may call in at sea: the Northern Fleet's escorts (the corvette slot, the Osas, the Natya sweepers, the Tarantul)
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Royal Norwegian Navy's controlled minefield across the fjord, a lane left off each landing place for the sweepers
    seaMines: { z: [500, 560], count: 60, lanes: [-320, 10, 345], lane: 80, seed: 1985_40 },
    // the coast artillery: a gun dug into each point, laid on the shore and the water before it
    forts: [{ unit: 'artillery', ...W(-160, shoreZ(-160) - 55), facing: Math.PI }, { unit: 'artillery', ...W(262, shoreZ(262) - 45), facing: Math.PI }],
    // prepared positions: wire along the back of each shore, minefields, trenches and MG nests on the bank over it
    works: [
      ...Array.from({ length: 80 }, (_, i) => { const x = -440 + i * 11; return headK(x) > 0.3 || inletD(x, shoreZ(x) - 30) < 12 || x > 430 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 54), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 48), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    // the defence at dawn: the Home Guard (Heimevernet) over each landing place and in the town, the brigade's anti-tank teams
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Heimevern section' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the counter-attack: Brigade Nord's armour down the valley road from Fagernes, the Marines with it
    counter: { t: 270, units: ['tank', 'ifv', 'tank', 'ifv', 'tank'], say: 'Brigade Nord is coming down the valley from Fagernes: Leopards and M113s, straight for the harbour', sayOther: 'Enemy armour coming down the valley road from Fagernes' },
    // the landing's AI (ai/LandingDirector.js): the naval infantry's buying order, a corvette inshore off the focus landing place
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 360 },
    economy: { reserves: 2000, perSector: 500, beachIncome: 0.8, defenceCp: 1000, defenceIncome: 2 },
    // the amphibious vehicles swim in on their own: BTRs, BRDMs and the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'pt76', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_40);
    sea.build(scene, terrain);
    const hL = (x: number, z: number) => terrain.heightAt(x, F * z);
    const dry = (x: number, z: number, rr = 7) => z < shoreZ(x) - 60 && headK(x) < 0.4 && inletD(x, z) > 14 && roadDistL(x, z) > rr && railDistL(x, z) > rr && hL(x, z) > 2 && hL(x, z) < 26 && ridgeK(x, z) < 0.2 && armK(x, z) < 0.05;

    // ---- Narvik on its hillside behind the harbour: wooden houses, concrete blocks, the church; Framnes and Ankenes smaller
    for (let [cx, cz, n, spread] of [[-300, -110, 12, 50], [10, -230, 30, 95], [370, -120, 12, 45]] as [number, number, number, number][]) {
      for (let i = 0; i < n * 4 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 24 + r() * spread;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!dry(x, z)) continue;
        n--;
        const yaw = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
        if (i % 6 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
        else if (cx === 10 && i % 3 === 0) props.flatHouse({ ...W(x, z), yaw, width: 12 + r() * 4, depth: 9, storeys: r() < 0.5 ? 3 : 4, name: 'apartment block' });
        else props.townHouse({ ...W(x, z), yaw, width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house', damaged: 0 });
      }
    }
    props.church({ ...W(-40, -290), yaw: 0 });          // Narvik kirke
    props.church({ ...W(400, -165), yaw: Math.PI / 2 }); // Ankenes kirke

    // ---- the LKAB ore harbour on the Beisfjord's near bank: the piers out into the arm, the loaders over them, the
    // crushing plant and the ore silos behind, ore trains in the yard
    for (const z of [80, 20, -40]) {
      const bank = inletX(z) - (8 + 34 * smoothstep(INLET_HEAD, INLET_HEAD + 200, z)), w = W(bank + 10, z);
      props.box('stone', w.x, -1, w.z, 26, 8, 9, 0, 0x6a6864); // the pier, out into the water
      props.conveyor({ x0: W(bank - 50, z).x, z0: w.z, y0: 12, x1: w.x + 8, z1: w.z, y1: 16 });
    }
    props.tanks({ ...W(60, -40), yaw: 0, count: 4, radius: 6, height: 22, color: 0x7a6a5e });
    props.hall({ ...W(55, 30), yaw: Math.PI / 2, width: 40, depth: 16, height: 12, color: 0x5e5450, roof: 0x3a3a3c, door: 10, name: 'ore crushing plant' });
    props.headframe({ ...W(70, -95), yaw: 0, height: 26 }); // (the loading tower over the sidings)
    for (let i = 0; i < 9; i++) { const z = 10 - i * 12; props.wagon({ ...W(lineAt(RAIL, z), z), yaw: 0, kind: 'open', color: 0x4a2e22 }); }
    // the ore railway off up the valley: the rails on their ballast
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [a, b] = [RAIL[i], RAIL[i + 1]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 24);
      for (let k = 0; k < n; k++) {
        const p = W(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n), q = W(a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n);
        if (Math.abs(p.x) < bounds.x + 40) props.rails({ x0: p.x, z0: p.z, x1: q.x, z1: q.z });
      }
    }
    // Ankenes: the ferry quay and a boathouse or two on the Beisfjord's far bank; Framnes: the boathouses on the shore
    for (const [x, z] of [[300, 150], [222, 40], [-380, 110], [-250, 95], [-60, 102]] as [number, number][]) {
      if (inletD(x, z) < 4 || hL(x, z) < 0.8 || hL(x, z) > 9) continue;
      props.hall({ ...W(x, z), yaw: 0, width: 10, depth: 6, height: 4, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'boathouse' });
    }
    // Fagernes: the E6 junction, the army's sheds
    for (const [x, z] of [[190, -690], [100, -700]]) props.hall({ ...W(x, z), yaw: 0, width: 30, depth: 14, height: 7, color: 0x5a6250, roof: 0x3a3a3c, door: 10, name: 'army shed' });
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { test: (x: number, z: number) => { const lz = F * z; return roadDistL(x, lz) < 7 || railDistL(x, lz) < 6 || lz > shoreZ(x) - 40 || inletD(x, lz) < 6 || armK(x, lz) > 0.02; } }];
    // birch and pine on the lower slopes, none above the tree line (maxY), little in the town
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 2600, broadleaf: 0, autumn: 1, size: 0.7, maxY: 42, avoid,
      forest: (x: number, z: number) => smoothstep(0.05, 0.25, fbm(noise, x * 0.008 + 4, z * 0.008, 2)) * 0.7 * (1 - smoothstep(130, 70, Math.hypot(x - 10, F * z + 230))) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.7,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => terrain.heightAt(x, z) < 1.5 || onRoad(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;

/** The x of a north–south polyline at local z (the ore railway through the yard). */
function lineAt(l: number[][], z: number) {
  for (let i = 0; i < l.length - 1; i++) {
    const [a, b] = [l[i], l[i + 1]];
    if ((z - a[1]) * (z - b[1]) <= 0) return a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1] || 1);
  }
  return l[0][0];
}
