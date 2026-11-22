// The Motovsky Gulf, winter 1985 (coastal: the US Marines and Norway land, the Soviets hold; 1.0 × 1.8 km). The
// Kola Peninsula’s Arctic coast west of Murmansk, where the German–Soviet front of 1941–44 stood frozen on the Litsa
// for three years: NATO’s counterstroke would not walk into that valley again but come round it from the sea — the 4th
// Marine Amphibious Brigade and Brigade Nord’s battalions landing in the Motovsky Gulf, at the mouth of the Zapadnaya
// Litsa bay, behind the Soviet front and on the doorstep of the Northern Fleet’s submarine base. Out at sea the
// transport area and the Northern Fleet’s mine barrier; then a shore of bare granite with three ways in between two
// rock headlands, a 130 mm coastal battery on each and submarine pens cut into their sea faces: in the west the sand
// and shingle bars of the Litsa mouth, the river’s gorge beside them; in the middle the edge of the Bolshaya Lopatka
// naval base — a foreshore under the quay wall, two piers with boats alongside, one slipway the only way up for
// vehicles; in the east the shingle cove at Malaya Lopatka. Behind them the snowed-over tundra and its granite knolls
// (bog under the snow: vehicles keep to the roads), birch scrub in the hollows, the bare fells, Andreyeva Guba’s
// storage sheds, the closed town of Zapadnaya Litsa with its five-storey blocks, the Nerpichya barracks, and the road
// over the tundra to Murmansk.
// (Compressed and turned: the real bay runs south from the gulf; here the sea is +z and the gulf’s shore runs across.)
// Not point-mirrored: one side lands, the other holds (modes/landing). NATO lands from its base out at sea (+z).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import { arcticTheme, snowSurface, snowSoft, woodenVillage, taiga } from './arctic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_61);
const sea = createSea({ level: 0, size: SIZE, color: 0x1c3440 }); // (the Barents Sea in the gulf: cold, near black-green)

/** The two granite headlands between the ways in: x, how far out to sea, half-width, height. */
const HEADS = [{ x: -165, reach: 75, w: 45, top: 30 }, { x: 185, reach: 85, w: 44, top: 34 }];
const headK = (x: number) => Math.max(Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)), Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2)));
/** The waterline (z). */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 12
  + HEADS[0].reach * Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)) + HEADS[1].reach * Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2));
/** The naval base’s quay (0..1 across x): between the headlands. */
const portK = (x: number) => smoothstep(-125, -100, x) * smoothstep(125, 102, x);
const RAMP = 20; // x of the slipway up the quay wall
/** The Litsa mouth’s bars in the west (0..1): the beach wider and lower. */
const deltaK = (x: number) => smoothstep(-235, -285, x);
/** The Zapadnaya Litsa: its gorge down to the sea by the west edge. */
const riverX = (z: number) => -445 + Math.sin(z * 0.009) * 14;

/** The tundra fells inland: [x, z, radius, height]. */
const HILLS = [[-150, -390, 90, 30], [210, -330, 85, 26], [-390, -430, 100, 34], [420, -480, 90, 30], [110, -500, 70, 16], [-280, -690, 90, 22], [330, -720, 90, 24]];
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) { const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (d2 < 9) h += a * Math.exp(-d2); }
  return h;
}

/** The roads: the coast road behind the headlands, up from each way in, across by the Murmansk road. */
function roadDist(x: number, z: number) {
  const sz = shoreZ(x);
  let d = Infinity;
  if (z < sz - 34 && z > -860) {
    d = Math.min(d, Math.abs(x - (-320 + Math.sin(z * 0.012) * 14)));                               // up from the Litsa mouth
    d = Math.min(d, Math.abs(x - (RAMP + Math.sin(z * 0.009) * 18 * smoothstep(60, -40, z))));      // up the slipway through the town
  }
  if (z < sz - 40 && z > -860) d = Math.min(d, Math.abs(x - (340 + Math.sin(z * 0.01) * 12)));      // up from the cove to Nerpichya
  if (x > -425) d = Math.min(d, Math.abs(z - (-30 + Math.sin(x * 0.008) * 12)));                     // the coast road
  if (x > -425) d = Math.min(d, Math.abs(z - (-600 + Math.sin(x * 0.006) * 25)));                    // the Murmansk road
  return d;
}
const onRoad = (x: number, z: number) => roadDist(x, z) < 3.5;

export const SECTORS = [
  { x: -320, name: 'Litsa mouth', inland: { name: 'Andreyeva Guba', x: -320, z: -120 } },
  { x: RAMP, name: 'Bolshaya Lopatka', inland: { name: 'Zapadnaya Litsa', x: 30, z: -230 } },
  { x: 340, name: 'Malaya Lopatka', inland: { name: 'Nerpichya', x: 360, z: -110 } },
];
const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Motovsky Gulf', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Litsa mouth', x: -320, z: shoreZ(-320) - 46, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Bolshaya Lopatka', x: RAMP, z: shoreZ(RAMP) - 46, owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Malaya Lopatka', x: 340, z: shoreZ(340) - 44, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Andreyeva Guba', x: -320, z: -120, owner: null, sector: 'west' },
  { id: 'F', name: 'Zapadnaya Litsa', x: 30, z: -230, owner: null, sector: 'centre' },
  { id: 'G', name: 'Nerpichya', x: 360, z: -110, owner: null, sector: 'east' },
  { id: 'K', name: 'Murmansk road', x: 40, z: -640, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
const pointClear = (x: number, z: number) => { let k = 1; for (const p of points) k = Math.min(k, smoothstep(30, 55, Math.hypot(p.x - x, p.z - z))); return k; };
const BASE = { x: 0, z: -830 };

/** The granite knolls through the snow (0..1). */
const knollK = (x: number, z: number) => smoothstep(0.2, 0.42, fbm(noise, x * 0.011 + 40, z * 0.011 - 17, 2));

/** The smooth ground: shore, tundra, fells, knolls, headlands, the river’s gorge (sampled once: gridCacheSmooth). */
function natural(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, hk = headK(x), dk = deltaK(x);
  let h: number;
  if (d > 0) { // the bottom: shelving off, the bars gently, rocks off the headlands
    h = 0.5 - d * (0.02 - 0.008 * dk) - Math.max(0, d - 120 - 50 * dk) * 0.05 + hk * Math.max(0, 4 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    h = Math.max(h, -20);
  } else {
    const back = -d;
    const beach = 0.5 + Math.min(back, 40 + 15 * dk) * (0.04 - 0.01 * dk);
    const n = fbm(noise, x * 0.005, z * 0.005, 3);
    const clear = smoothstep(8, 22, roadDist(x, z)) * pointClear(x, z) * smoothstep(60, 110, back) * smoothstep(70, 110, Math.hypot(x - BASE.x, z - BASE.z));
    const land = 5 + smoothstep(30, 110, back) * 4 + Math.max(0, back - 250) * 0.012 + n * 3 + hillH(x, z) + knollK(x, z) * 5 * clear;
    h = Math.max(beach, Math.min(land, beach + back * 0.2));
    if (hk > 0.05) { // the headlands: bare granite, a cliff to the sea
      const hd = x < 0 ? HEADS[0] : HEADS[1];
      const top = hd.top + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
      h += (Math.max(h, 0.5 + top * smoothstep(4, 26, back) * smoothstep(200, 110, back)) - h) * smoothstep(0.25, 0.7, hk);
    }
  }
  // the Zapadnaya Litsa: a gorge three metres deep down to the sea
  const rd = Math.abs(x - riverX(z));
  if (rd < 40) h = Math.min(h, -3 + Math.max(0, rd - 8) * 0.8);
  return h;
}
const naturalC = gridCacheSmooth(natural, BOUNDS, 2);
const BASE_H = natural(BASE.x, BASE.z);

function height(x: number, z: number) {
  let h = naturalC(x, z);
  const pt = portK(x);
  if (pt > 0) { // the naval base: a foreshore under a 3 m quay wall, one slipway up it
    const back = shoreZ(x) - z;
    if (back > 0) {
      let q = back < 30 ? 0.4 + back * 0.025 : back < 32 ? 1.15 + (back - 30) * 1.7 : 4.5 + Math.max(0, back - 150) * 0.03;
      q += (Math.min(q, 0.4 + back * 0.09) - q) * smoothstep(22, 14, Math.abs(x - RAMP)); // (the slipway: 1 in 11)
      h += (q - h) * pt * smoothstep(240, 180, back);
    }
  }
  const bd = Math.hypot(x - BASE.x, z - BASE.z);
  if (bd < 60) h += (BASE_H - h) * smoothstep(60, 25, bd); // (level with the land round it: no pit for the vehicles)
  return h;
}

/** The bogs under the snow, off the roads, the points and the shore. */
const bogC = gridCache((x: number, z: number) => smoothstep(0.1, 0.24, fbm(noise, x * 0.006 + 323.3, z * 0.006 - 161.1, 3))
  * smoothstep(10, 26, roadDist(x, z)) * pointClear(x, z) * smoothstep(shoreZ(x) - 90, shoreZ(x) - 140, z) * smoothstep(50, 80, Math.hypot(x - BASE.x, z - BASE.z)), BOUNDS);
const softV = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, false), BOUNDS);
const softF = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, true), BOUNDS);
/** Birch scrub in the hollows, bare tundra on the tops (taiga’s maxY). */
const woodsK = (x: number, z: number) => (fbm(noise, x * 0.008 + 708.2, z * 0.008 - 461.4, 3) > 0.05 ? 0.7 : 0.02)
  * smoothstep(6, 16, roadDist(x, z)) * (1 - 0.7 * bogC(x, z)) * pointClear(x, z) * smoothstep(shoreZ(x) - 60, shoreZ(x) - 110, z)
  * (Math.abs(x - riverX(z)) < 16 ? 0 : 1) * (headK(x) > 0.35 ? 0.1 : 1);
const woodsC = gridCache((x: number, z: number) => Math.max(0, woodsK(x, z)), BOUNDS);
/** The closed town of Zapadnaya Litsa. */
const townK = (x: number, z: number) => smoothstep(140, 100, Math.hypot((x - 40) * 0.8, z + 215)) * (headK(x) < 0.4 ? 1 : 0);

export default {
  id: 'motovsky',
  name: 'Motovsky Gulf Landing',
  description: 'The Kola coast at the mouth of the Zapadnaya Litsa, winter 1985: bare granite shores, the Litsa’s bars, the Bolshaya Lopatka submarine base under its headland batteries and a shingle cove, the snowed-over tundra and the base town behind. The US Marines and Norway land behind the Litsa front; the Soviets hold.',
  epochs: ['1985'],
  region: 'north',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  armies: { nato: ['usmc', 'no'], pact: ['sov'] }, // (the 4th MAB and Brigade Nord land; the Northern Fleet’s naval infantry and the Army hold Kola)
  conditions: { time: 'dawn', weather: 'overcast' },
  climate: 'winter',
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  airfields: [], // (no runway fits: granite knolls, bog and fells)
  steep: 0.5, // (vehicles: the quay wall, the headlands and the gorge are no way up — the slipway and the beaches are)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft: (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z),
  river: sea,
  woods: (x: number, z: number) => woodsC(x, z) * 0.6,

  theme: arcticTheme({
    fogColor: 0xaab4bc, fogDensity: 0.0007, skyTop: 0x5a6c82, skyHorizon: 0xc8c6c0, skyBottom: 0x7a848c,
    sunIntensity: 1.3, sunDisk: 0.15, clouds: 0.75, sunDir: [0.4, 0.18, 0.9],
    terrain: {
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x), back = sz - z;
        if (back < -3 || Math.abs(x - riverX(z)) < 10) return [y > -2 ? (deltaK(x) > 0.5 ? 0xa8a290 : 0x6e6e66) : 0x44484a, 1]; // stones under the water (the bars: sand)
        const rd = roadDist(x, z);
        if (rd < (townK(x, z) > 0.5 ? 5 : 3.5) && back > 30) return [0xa8a49c, 0.85];              // the ploughed road
        if (headK(x) > 0.3 && y > 3 && back < 200) return [noise(x * 0.06, z * 0.06) > 0.2 ? 0xd8dcdc : 0x55585c, 0.9]; // the headlands’ granite
        const pt = portK(x);
        if (pt > 0.5 && back < 31) return [0x6e6c66, 1];                                          // the foreshore
        if (pt > 0.5 && back < 160) return [0x8e8e8a, 0.9];                                       // the quay’s concrete, swept
        if (back < 38 + 15 * deltaK(x)) return [deltaK(x) > 0.5 ? 0xc8c2b0 : 0x8a8a86, 1];        // the bars’ sand, the cove’s shingle
        if (Math.abs(x - riverX(z)) < 24) return [0x5e6064, 0.9];                                 // the gorge’s rock
        if (knollK(x, z) > 0.5 && y > 6) return [noise(x * 0.08, z * 0.08) > 0 ? 0x6a6c70 : 0xc8ccd0, 0.85]; // granite knolls
        return snowSurface(x, z, { road: rd, main: false, ice: () => 0, bog: bogC, noise });
      },
    },
  }),

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: BASE.x, z: BASE.z, entries: [-320, 20, 340] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what comes in (systems/Landing.js): the Marines and the Norwegians by LCVP or Type 520 (standing in for the LCUs), vehicles by Type 520
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: a Perry frigate or a Spruance inshore, Norway’s Hauk fast attack craft
    navy: ['frigate', 'destroyer', 'ptBoat'],
    // the Northern Fleet’s mines across the gulf, a lane left off each way in
    seaMines: { z: [520, 580], count: 60, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_61 },
    // the coastal artillery: a 130 mm battery on each headland, laid on the beaches; the Rubezh launchers inland that fire on the ships
    forts: [
      { unit: 'artillery', x: HEADS[0].x, z: shoreZ(HEADS[0].x) - 75, facing: 0, name: 'West headland battery' },
      { unit: 'artillery', x: HEADS[1].x, z: shoreZ(HEADS[1].x) - 80, facing: 0, name: 'East headland battery' },
      { unit: 'coastMissile', x: -150, z: -300, facing: 0, name: 'Rubezh battery' }, { unit: 'coastMissile', x: 230, z: -440, facing: 0, name: 'Rubezh battery' },
    ],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests over it; tank traps on the slipway
    works: [
      ...Array.from({ length: 84 }, (_, i) => { const x = -420 + i * 11; return headK(x) > 0.3 || Math.abs(x - RAMP) < 18 ? null : { kind: 'wire', x, z: shoreZ(x) - (portK(x) > 0.5 ? 26 : 30), yaw: 0 }; }).filter((w) => !!w),
      ...[8, 16, 24, 32].map((x) => ({ kind: 'tankTraps', x, z: shoreZ(x) - 24, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 64 }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - 54, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - 48, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 38 }))),
    ],
    // the defence at dawn: the 61st Naval Infantry Brigade over each way in, the base’s companies in the town, Fagots and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Naval infantry squad', coastMissile: 'Rubezh battery' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56) }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    // the counter-attack: the motor rifle division’s reserve, pulled back off the Litsa front down the Murmansk road
    counter: { t: 360, units: ['tank', 'ifv', 'heavyTank', 'ifv', 'tank'], say: 'The division’s reserve is coming off the Litsa front down the Murmansk road: T-80s and BMPs, straight for the beachhead', sayOther: 'Enemy armour coming down the Murmansk road: T-80s and BMPs' },
    // the landing’s AI (ai/LandingDirector.js): its buying order, a frigate inshore off the focus beach
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'tank', 'rifles', 'mgTeam', 'ifv', 'rifles', 'tank', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 380 },
    economy: { reserves: 3000, perSector: 700, beachIncome: 1.0, defenceCp: 800, defenceIncome: 1.2 }, // (Wismar’s, richer for the landing: on Wismar’s own the defence kept two villages of three in three runs; with this, 2026-11-22: 0, 2 and 1 villages of 3 taken, one landing won at 13:30)
    // the AAV7s and the scout vehicles swim in on their own, put in off the beach
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon' },
    // the first wave at dawn, in to all three ways at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_61);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 6 + rr && !nearPoint(x, z, 18 + rr) && headK(x) < 0.3 && z < shoreZ(x) - 40 - rr
      && Math.hypot(x - BASE.x, z - BASE.z) > 45 && Math.abs(x - riverX(z)) > 26 + rr;
    const skip = (x: number, z: number, rr: number) => !free(x, z, rr);

    // ---- Bolshaya Lopatka: two piers out from the foreshore, a boat alongside each, a crane; sheds behind the quay
    for (const [x, sub] of [[-70, true], [80, false]] as [number, boolean][]) {
      const sz = shoreZ(x);
      props.box('stone', x, 0.4, sz + 22, 10, 2.6, 52, 0, 0x6c6a64);
      const hx = x + 12, hz = sz + 30;
      props.box('metal', hx, 0.5, hz, 7, 3, sub ? 46 : 50, 0, sub ? 0x1e2226 : 0x6a7078);
      props.box('metal', hx, sub ? 3.6 : 4.2, hz + (sub ? -6 : 4), sub ? 2.4 : 5, sub ? 4 : 4.2, sub ? 7 : 14, 0, sub ? 0x1e2226 : 0x6a7078);
      if (!sub) props.mast({ x: hx, z: hz + 2, height: 10 });
      for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) props.box('metal', x + lx, 7, sz + 30 + lz, 0.6, 10, 0.6, 0, 0x9a7a32);
      props.box('metal', x, 13, sz + 30, 7, 3, 6, 0, 0x9a7a32);
      props.box('metal', x + 9, 14.5, sz + 30, 20, 1, 1.2, 0, 0x9a7a32);
    }
    for (const [x, w] of [[-70, 40], [80, 36]] as [number, number][]) props.hall({ x, z: shoreZ(x) - 90, yaw: 0, width: w, depth: 18, height: 9, color: 0x7e7a70, roof: 0x3e4044, door: 10, name: 'base workshop' });
    props.tanks({ x: -40, z: shoreZ(-40) - 135, yaw: 0, count: 3, radius: 6, height: 9, color: 0x8e9290 });
    for (let i = 0; i < 4; i++) props.crates({ x: 50 + i * 7, z: shoreZ(50) - 55, yaw: 0 });
    // ---- the submarine pens: concrete portals cut into each headland’s sea face, a boat’s sail showing in one
    for (const h of HEADS) {
      const x = h.x + (h.x < 0 ? 22 : -22), sz = shoreZ(x);
      props.box('stone', x, 4, sz - 3, 24, 10, 8, 0, 0x8a8a84);
      props.box('plain', x, 2.6, sz + 1.1, 15, 6.4, 0.4, 0, 0x101214);
      if (h.x < 0) { props.box('metal', x, 0.4, sz + 12, 6, 2.4, 26, 0, 0x1e2226); props.box('metal', x, 3.2, sz + 8, 2.2, 3.6, 6, 0, 0x1e2226); }
    }
    // ---- the batteries on the headlands: sandbags round the guns, a light on the east one
    for (const h of HEADS) for (const s of [-1, 1]) props.sandbagRing({ x: h.x + s * 18, z: shoreZ(h.x) - 68, radius: 4.5, toward: 1 });
    { const x = HEADS[1].x + 20, z = shoreZ(HEADS[1].x) - 34, y = g(x, z); props.box('stone', x, y + 5, z, 2.6, 10, 2.6, 0, 0xe8e4dc); props.box('plain', x, y + 10.8, z, 3.2, 1.6, 3.2, 0, 0xa83a2a); }

    // ---- Zapadnaya Litsa: five-storey blocks round the centre, the officers’ house, the boiler house’s chimney
    for (let gx = -80; gx <= 160; gx += 36) for (let gz = -120; gz >= -320; gz -= 30) {
      const x = gx + (r() - 0.5) * 6, z = gz + (r() - 0.5) * 5;
      if (townK(x, z) < 0.5 || r() < 0.3 || !free(x, z, 14)) continue;
      flats(props, { x, z, yaw: r() < 0.75 ? 0 : Math.PI / 2, storeys: 5, width: 28, depth: 11, name: 'Khrushchyovka' });
    }
    props.flatHouse({ x: -15, z: -280, yaw: 0, width: 24, depth: 12, storeys: 3, name: 'officers’ house' });
    props.hall({ x: 140, z: -300, yaw: 0, width: 24, depth: 14, height: 9, color: 0x7a5a4a, roof: 0x3e4044, door: 6, name: 'boiler house' });
    props.chimney({ x: 156, z: -312, height: 40 });
    // ---- Andreyeva Guba: the store sheds behind the wire; Nerpichya: the barracks and a few blocks
    for (const [dx, dz] of [[-60, 40], [60, 35], [-55, -45], [65, -40]]) if (free(-320 + dx, -120 + dz, 14)) props.hall({ x: -320 + dx, z: -120 + dz, yaw: 0, width: 30, depth: 14, height: 7, color: 0x7a7a6e, roof: 0x3a3c3e, door: 6, name: 'store shed' });
    for (const [dx, dz] of [[-55, 35], [60, 40], [60, -40]]) if (free(360 + dx, -110 + dz, 14)) props.hall({ x: 360 + dx, z: -110 + dz, yaw: 0, width: 30, depth: 10, height: 6, color: 0x8a7a62, roof: 0x3a3a3a, door: 4, name: 'barracks' });
    if (free(300, -170, 14)) flats(props, { x: 300, z: -170, yaw: 0, storeys: 4, width: 28, depth: 11, name: 'Khrushchyovka' });
    // ---- a fishermen’s hamlet by the Litsa mouth, the wooden houses at the Murmansk road
    props.rand = mulberry32(1985_62);
    woodenVillage(props, { x: -380, z: -40 }, { n: 4, skip });
    woodenVillage(props, { x: 180, z: -650 }, { n: 5, skip });
    // ---- granite boulders and snowed-in wrecks out on the tundra
    props.rand = r;
    for (let i = 0; i < 90; i++) {
      const x = (r() * 2 - 1) * 470, z = -60 - r() * 800;
      if (!free(x, z, 3)) continue;
      if (r() < 0.12) props.wreckCar({ x, z, yaw: r() * 6 }); else props.boulder({ x, z, radius: 1.2 + r() * 2 });
    }
    props.rand = mulberry32(405);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: BASE.x, z: BASE.z, r: 34 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || z > shoreZ(x) - 45 || townK(x, z) > 0.3 || Math.abs(x - riverX(z)) < 16 || (portK(x) > 0.3 && z > shoreZ(x) - 170) }];
    const update = taiga({ scene, terrain, cover, rand, bounds, palette: this.theme.terrain, avoid, forest: woodsK, maxY: 24, trees: 3000, birch: 0.8, size: 0.55 });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
