// Andøya, March 1985 (coastal: the Soviet naval infantry lands, Norway holds; 1.0 × 1.8 km). The northern tip of
// Andøya in Vesterålen, and on it Andøya air station — the Royal Norwegian Air Force's P-3 Orion base that watched the
// Soviet Northern Fleet's submarines going out into the Norwegian Sea: an obvious first objective for a landing in
// the north. Out at sea the Pact's landing ships and the Norwegian minefield; then the island's tip, three ways in
// and nothing alike:
//   • in the west Bleik: the long white crescent of Bleiksanden curving deep into the island, Bleiksøya — the steep
//     bird-cliff islet — standing off the bay's eastern horn, and the Måtind massif rising straight behind the
//     village, filling the whole south-west of the field;
//   • in the middle the low skerry coast of the tip, rock shelves and boulders, broken only by one short cove of sand
//     (Nordstranda) under the edge of Andenes;
//   • in the east Andenes harbour between its two breakwaters, the fish plant on the quay, the red cast-iron
//     lighthouse (1859) behind.
// Inland the snow-covered moor (bog: vehicles keep to the roads), and in the south-east the air station, its runway
// laid on the slant across the moor. (The real island runs north–south; here the sea is local +z and the tip faces it.)
// Laid out in a frame with the sea toward +z (`L`), then turned round: the Pact's side is -z, so the sea is there
// (the landing comes from its base out at sea: systems/Landing.js lands()).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 560, z: 960 };
const noise = createNoise2D(1985_03);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f3a46 }); // (the Norwegian Sea: cold, dark blue-green)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** Bleik's crescent (west), Nordstranda (middle) and the harbour (east), as shares across x. */
const bleikK = (x: number) => Math.sqrt(Math.max(0, 1 - ((x + 345) / 175) ** 2));
const nordK = (x: number) => Math.exp(-(((x - 60) / 45) ** 2));
const harbK = (x: number) => Math.exp(-(((x - 330) / 85) ** 4));
/** The waterline (local z): the skerry coast out at 210, Bleik's crescent biting deep in, the cove and the harbour shallow bights. */
const shoreZ = (x: number) => 210 - 175 * bleikK(x) - 40 * nordK(x) - 55 * harbK(x) + fbm(noise, x * 0.006, 2.1, 2) * 8;
/** The skerry coast: low rock along the shore wherever there is no beach (0..1). */
const rockK = (x: number) => smoothstep(-180, -140, x) * (1 - nordK(x) * 1.2) * smoothstep(250, 215, x);
/** The breakwaters: x of each, how far out they reach. */
const MOLES = [{ x: 235, reach: 120 }, { x: 430, reach: 95 }];
/** Bleiksøya: the islet off the bay's eastern horn. */
const ISLET = { x: -150, z: 330, r: 48, top: 38 };
/** Måtind: the massif behind Bleik. */
const MTN = { x: -440, z: -190, r: 240, top: 80 };

/** Distance from (x, z) to the segment a–b. */
function seg(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
/** The runway (local): on the slant across the moor. */
const RUNWAY = [[-40, -720], [470, -560]];
const runD = (x: number, z: number) => seg(x, z, RUNWAY[0], RUNWAY[1]);

/** The roads (local frame), as polylines. */
const ROADS: number[][][] = [
  [[-360, 20], [-290, -60], [-255, -95], [-200, -250], [0, -390], [170, -570]],                  // from Bleik under Måtind, across the moor to the air station
  [[60, 150], [80, -110], [190, -300], [170, -570]],                                  // up from Nordstranda through Andenes
  [[330, 130], [370, -30], [310, -300], [190, -300]],                                 // off the harbour, past the lighthouse
  [[-255, -95], [-150, -60], [80, -110], [250, 40], [370, -30]],                     // the coast road, Bleik to the harbour
  [[170, -570], [260, -830]], [[-480, -820], [170, -570]],                            // to the base; on south along the island
];
const roadD = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) for (let i = 1; i < r.length; i++) d = Math.min(d, seg(x, z, r[i - 1], r[i])); return d; };

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  // Bleiksøya: a steep cone out of the sea
  const id = Math.hypot(x - ISLET.x, z - ISLET.z) / ISLET.r;
  const islet = id < 1.6 ? ISLET.top * Math.max(0, 1 - id) ** 0.7 - 6 * smoothstep(0.9, 1.6, id) : -99;
  if (d > 0) { // the bottom: shelving off, rocks off the skerries; the breakwaters
    let h = 0.4 - d * 0.02 - Math.max(0, d - 120) * 0.05 + rockK(x) * Math.max(0, 3 - d * 0.04) * (0.5 + noise(x * 0.05, z * 0.05));
    for (const m of MOLES) { const mk = smoothstep(7, 4, Math.abs(x - m.x)) * smoothstep(m.reach + 6, m.reach, d); if (mk > 0) h += (2.6 - h) * mk; }
    return Math.max(h, islet, -20);
  }
  const back = -d;
  // the beach (Bleiksanden 50 m of pale sand, the others 25–30), then the moor: 5–8 m, rising slowly inland
  const sw = 28 + 24 * bleikK(x);
  const beach = 0.5 + Math.min(back, sw) * (1.6 / sw);
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  const land = 4.5 + smoothstep(sw, sw + 80, back) * 2.5 + Math.max(0, back - 250) * 0.004 + n * 2.5;
  let h = Math.max(beach, Math.min(land, beach + back * 0.2));
  // the skerry coast: rock shelves 6–9 m straight up from the water
  const rk = rockK(x);
  if (rk > 0) h += (Math.max(h, 0.5 + (7 + n * 3) * smoothstep(2, 14, back)) - h) * rk;
  // Måtind: the massif rising straight behind Bleik, its spurs down the west
  const md = Math.hypot((x - MTN.x) * 1.15, z - MTN.z) / MTN.r;
  if (md < 1.3) h += MTN.top * Math.max(0, 1 - md) ** 1.3 * (0.85 + 0.3 * fbm(noise, x * 0.012, z * 0.012, 3)) + 10 * smoothstep(1.3, 0.8, md);
  // the moor's bog hollows; the runway graded flat
  h -= 0.8 * smoothstep(0.02, 0.2, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * smoothstep(80, 160, back) * smoothstep(0.9, 1.2, md);
  const rw = smoothstep(40, 20, runD(x, z));
  if (rw > 0) h += (6.5 - h) * rw;
  return h;
}
const heightC = gridCacheSmooth((x: number, z: number) => heightL(x, F * z), EXT, 2);
const height = (x: number, z: number) => heightC(x, z);

const roadC = gridCache((x: number, z: number) => roadD(x, F * z), BOUNDS, 2);
const onRoad = (x: number, z: number) => roadC(x, z) < 3.5;
const onRoadL = (x: number, z: number) => onRoad(x, F * z);
const onRunway = (x: number, z: number) => runD(x, z) < 16; // (local)

/** The moor inland (0..1): bog between the villages and the roads, none on Måtind or the air station. */
const moorK = (x: number, z: number) => smoothstep(0.02, 0.2, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * smoothstep(100, 170, shoreZ(x) - z)
  * smoothstep(0.95, 1.25, Math.hypot((x - MTN.x) * 1.15, z - MTN.z) / MTN.r) * smoothstep(30, 60, runD(x, z));
const moorC = gridCache((x: number, z: number) => moorK(x, F * z), BOUNDS);
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = moorC(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.45 : 0.85);
}

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -365, name: 'Bleiksanden', back: 60, inland: { name: 'Bleik', x: -255, z: -95 } },
  { x: 60, name: 'Nordstranda', back: 34, inland: { name: 'Andenes', x: 115, z: -150 } },
  { x: 330, name: 'Andenes harbour', back: 38, inland: { name: 'Andenes lighthouse', x: 400, z: -25 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(-90, 760), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Bleiksanden', ...W(-365, shoreZ(-365) - 40), owner: null, sector: 'west', radius: 55, opens: 'E' },
  { id: 'C', name: 'Nordstranda', ...W(60, shoreZ(60) - 28), owner: null, sector: 'centre', radius: 42, opens: 'F' },
  { id: 'D', name: 'Andenes harbour', ...W(330, shoreZ(330) - 32), owner: null, sector: 'east', radius: 48, opens: 'G' },
  { id: 'E', name: 'Bleik', ...W(-255, -95), owner: null, sector: 'west' },
  { id: 'F', name: 'Andenes', ...W(115, -150), owner: null, sector: 'centre' },
  { id: 'G', name: 'Andenes lighthouse', ...W(400, -25), owner: null, sector: 'east' },
  { id: 'K', name: 'Andøya air station', ...W(160, -500), owner: 'nato', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < r); // (local x, z)

export default {
  id: 'andoya',
  name: 'Andøya Landing',
  description: 'Vesterålen, March 1985: Bleik\'s white crescent under Måtind with Bleiksøya offshore, the skerry coast and the cove at Nordstranda, Andenes harbour between its breakwaters, the moor and the P-3 base inland. The Soviet naval infantry lands; Norway and the US Marines hold.',
  epochs: ['1985'],
  region: 'north',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (the Home Guard and Brigade Nord with the Marines' reinforcement; the Northern Fleet's naval infantry lands)
  conditions: { time: 'dawn', weather: 'overcast' },
  climate: 'winter',
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  airfields: [], // (the air station's runway is scenery: no strip of the game's own)
  steep: 0.5, // (vehicles: the skerries and Måtind are no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft,
  river: sea,

  theme: {
    fogColor: 0xa8b4bc, fogDensity: 0.0006,
    skyTop: 0x5c6e84, skyHorizon: 0xc4c8cc, skyBottom: 0x7a848c,
    sunColor: 0xffe4cc, sunIntensity: 1.45, sunDisk: 0.15,
    clouds: 0.75, cloudLight: 0xd8dadc, cloudDark: 0x7a848e,
    sunDir: [0.4, 0.3, -0.85],
    hemiSky: 0xccd6e2, hemiGround: 0x8a9098, hemiIntensity: 1.4,
    rimColor: 0xc8d2dc, rimIntensity: 0.25,
    terrain: {
      grass: '#eef2f4', grassAlt: '#e2e8ec', dryGrass: '#d8d8d0', dirt: '#8a8478', rock: '#5a5c60',
      pasture: '#eceff0', ploughed: '#d0ccc4', stubble: '#dcd8ce', meadow: '#f2f4f4',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoad(x, z)) return [0x9a968e, 0.9];                                         // the ploughed road
        if (onRunway(x, lz)) return [0x6a6a6a, 0.95];                                      // the runway, swept
        if (lz > sz + 3) return [y > 1.5 ? 0x4e5054 : y > -2 ? 0xd8d4c4 : 0x9a9888, 1];      // the moles and the islet's rock; the sand under the water
        if (rockK(x) > 0.4 && y > 2 && lz > sz - 30) return [0x4e5054, 0.9];               // the skerries' bare rock
        if (lz > sz - (28 + 24 * bleikK(x))) return [0xe2dccc, 1];                          // the beach: pale shell sand
        if (y > 30) return [0x8a8c90, smoothstep(30, 60, y) * 0.35];                         // Måtind's crags through the snow
        const m = moorK(x, lz);
        if (m > 0.1) return [noise(x * 0.04, z * 0.04) > 0.1 ? 0x9a9884 : 0xcdd0c8, m * 0.7]; // sedge and heather through the snow
        return null;
      },
    },
  },

  bases: { nato: { x: 250, z: 840, entries: [-250, 120, 330] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Soviet landing comes in: the naval infantry by Aist hovercraft or Polnocny, vehicles by Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    // what the landing may call in at sea: the Northern Fleet's escorts (the corvette slot, the Osas, the Natya sweepers, the Tarantul)
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Royal Norwegian Navy's controlled minefield off the beaches, a lane left off each for the sweepers
    seaMines: { z: [520, 580], count: 60, lanes: SECTORS.map((s) => s.x), lane: 70, seed: 1985_03 },
    // the coastal artillery: a gun battery on the skerries and one on the harbour's point, laid on the beaches and the water
    forts: [{ unit: 'artillery', ...W(-110, shoreZ(-110) - 40), facing: Math.PI }, { unit: 'artillery', ...W(470, shoreZ(470) - 30), facing: Math.PI }],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests over it
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -490 + i * 11; return rockK(x) > 0.4 ? null : { kind: 'wire', ...W(x, shoreZ(x) - (bleikK(x) > 0.2 ? 40 : 24)), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - s.back - 14) }))),
      ...SECTORS.flatMap((s) => [-42, 0, 42].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - s.back - 6), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - s.back), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - s.back + 10) }))),
    ],
    // the defence at dawn: the Home Guard (Heimevernet) over each beach and in the villages, the brigade's anti-tank teams
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Heimevern section' },
    hold: [...SECTORS.flatMap((s) => [-42, -22, 22, 42].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - s.back - (Math.abs(dx) < 30 ? 0 : 6)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the counter-attack: Brigade Nord's armour up the road from the air station, and the Marines with it
    counter: { t: 210, units: ['tank', 'ifv', 'tank', 'ifv', 'tank'], say: 'Brigade Nord is coming up from the air station: Leopards and M113s, straight for the beachhead', sayOther: 'Enemy armour coming up the road from the air station' },
    // the landing's AI (ai/LandingDirector.js): the naval infantry's buying order, a corvette inshore off the focus beach
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, heavy: null, inshore: 360 },
    economy: { reserves: 1600, perSector: 450, beachIncome: 0.6, defenceCp: 1600, defenceIncome: 3 }, // (no concrete, a poor landing: three quick beaches, then a long fight for Andenes)
    // the amphibious vehicles swim in on their own: BTRs, BRDMs and the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 }, { unit: 'pt76', sector: 0 }, { unit: 'tank', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_03);
    sea.build(scene, terrain);
    const dry = (x: number, z: number) => z < shoreZ(x) - 55 && roadD(x, z) > 8 && !nearPoint(x, z, 18) && moorK(x, z) < 0.3 && runD(x, z) > 45;

    // ---- the villages: painted wooden houses, fish-drying racks, a church; Andenes the biggest
    for (let [cx, cz, n, spread] of [[-255, -95, 12, 45], [115, -150, 26, 90], [380, -20, 10, 45]] as [number, number, number, number][]) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 22 + r() * spread;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!dry(x, z) || Math.abs(x) > 485) continue;
        n--;
        if (i % 4 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
        else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house', damaged: 0 });
      }
      for (let k = 0; k < 3; k++) { // the fish-drying racks (hjeller): rows of poles and rails, low cover
        const x = cx - 60 + k * 10, z = cz - 50, w = W(x, z), y = terrain.heightAt(w.x, w.z);
        if (!dry(x, z)) continue;
        props.box('plain', w.x, y + 2.2, w.z, 14, 0.15, 0.15, 0, 0x5a4a38);
        for (const s of [-6.5, 0, 6.5]) props.box('plain', w.x + s, y + 1.1, w.z, 0.2, 2.2, 0.2, 0, 0x4a3a2a);
      }
    }
    props.church({ ...W(40, -210), yaw: 0 });
    props.church({ ...W(-300, -190), yaw: 0 });
    // the skerries: boulders along the rock coast and off it
    for (let i = 0; i < 40; i++) { const x = -170 + r() * 420, z = shoreZ(x) + r() * 40 - 8; if (rockK(x) < 0.5 || Math.abs(x - 60) < 50) continue; props.boulder({ ...W(x, z), radius: 1.2 + r() * 2.4 }); }
    // Andenes harbour: the fish plant on the quay, and the lighthouse (red cast iron, 1859)
    props.hall({ ...W(285, shoreZ(285) - 70), yaw: 0, width: 30, depth: 14, height: 7, color: 0x8a2e22, roof: 0x3a3a3c, door: 8, name: 'fish plant' });
    props.hall({ ...W(390, shoreZ(390) - 66), yaw: 0, width: 22, depth: 12, height: 6, color: 0xd8d0b8, roof: 0x3a3a3c, door: 6, name: 'boat sheds' });
    const lh = W(440, -60), ly = terrain.heightAt(lh.x, lh.z);
    props.column({ ...lh, radius: 2.4, height: 3 });
    props.box('plain', lh.x, ly + 20, lh.z, 3.6, 34, 3.6, 0.4, 0x9a2a22);
    props.box('plain', lh.x, ly + 38.5, lh.z, 4.4, 3, 4.4, 0.4, 0x2a2a2a);

    // ---- Andøya air station: the hangars and the tower along the runway, aircraft shelters off the taxiway
    for (const x of [-20, 50, 120]) { const z = -720 + (x + 40) * (160 / 510) + 60; props.hall({ ...W(x, z), yaw: 0, width: 44, depth: 32, height: 13, color: 0x6a6e6a, roof: 0x4a4e52, door: 30, name: 'hangar' }); }
    props.controlTower({ ...W(260, -560), yaw: 0 });
    for (const x of [330, 390]) props.aircraftShelter({ ...W(x, -540), yaw: 0 });
    props.aircraftWreck({ ...W(200, -650), yaw: 0.3, scale: 1.4 }); // (a P-3 caught on the ground by the first strike)
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 60;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) || runD(x, F * z) < 30 || !land(x, z) }];
    // a few stands of downy birch in the shelter of the villages and on Måtind's lower slopes; the rest is open moor
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 900, broadleaf: 0, autumn: 1, size: 0.6, maxY: 40, avoid,
      forest: (x: number, z: number) => smoothstep(0.3, 0.5, fbm(noise, x * 0.008 + 4, z * 0.008, 2)) * 0.6 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => F * z > shoreZ(x) - 30 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
