// The Motovsky Gulf, winter 1985 (coastal: the US Marines and Norway land, the Soviets hold; 1.0 × 1.8 km). The
// Kola Peninsula’s Arctic coast west of Murmansk, where the German–Soviet front of 1941–44 stood frozen on the Litsa
// for three years: NATO’s counterstroke would not walk into that valley again but come round it from the sea — the 4th
// Marine Amphibious Brigade and Brigade Nord’s battalions landing in the Motovsky Gulf, behind the Soviet front and on
// the doorstep of the Northern Fleet’s submarine base. Out at sea the transport area and the Northern Fleet’s mine
// barrier; then a coast of bare granite cliffs, twenty metres sheer, with only two ways in. In the west the bay of
// Zapadnaya Litsa runs south out of the gulf like a fjord, half a kilometre long and under two hundred metres wide,
// granite walls either side, the Bolshaya Lopatka submarine piers along its east wall, a 130 mm battery on each cape
// at its mouth — and at its head the sand and shingle bars of the Litsa’s mouth, the river’s valley the one way up
// through the rock to the closed town of Zapadnaya Litsa. In the east the shingle cove at Malaya Lopatka, a narrow
// notch in the cliffs with a track up to the Nerpichya barracks. Behind the cliffs the snowed-over tundra plateau and
// its granite knolls (bog under the snow: vehicles keep to the roads), birch scrub in the hollows, the bare fells,
// Andreyeva Guba’s storage sheds on the west cape, and the road over the tundra to Murmansk.
// (Compressed: the real bay is fifteen kilometres long; here the gulf is +z and the bay runs south from it.)
// Not point-mirrored: one side lands, the other holds (modes/landing). NATO lands from its base out at sea (+z).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import { arcticTheme, snowSurface, snowSoft, woodenVillage, taiga, segDist } from './arctic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_61);
const sea = createSea({ level: 0, size: SIZE, color: 0x1c3440 }); // (the Barents Sea in the gulf: cold, near black-green)

/** The Zapadnaya Litsa bay: its axis (x), half-width, the centre of its rounded head (z). */
const BAY = { x: -170, hw: 85, head: -60 };
const bayHW = (z: number) => BAY.hw + fbm(noise, 3.3, z * 0.01, 2) * 9;
/** The Malaya Lopatka cove: a notch in the gulf’s cliffs. */
const COVE = { x: 290, w: 72, depth: 125 };
/** The gulf’s open shore (z) across x: granite cliffs, the cove cut into them. */
const gulfZ = (x: number) => 380 + fbm(noise, x * 0.004, 2.1, 2) * 18 - COVE.depth * Math.exp(-(((x - COVE.x) / COVE.w) ** 2));
/** How far into the water (m, + in the water, − back from it on land): the gulf and the bay. */
function seaD(x: number, z: number) {
  const ax = x - BAY.x, hw = bayHW(z);
  return Math.max(z - gulfZ(x), z > BAY.head ? hw - Math.abs(ax) : hw - Math.hypot(ax, z - BAY.head));
}
/** The waterline met coming in from the gulf along x (the bay’s head across its width, else the gulf’s shore). */
const shoreZ = (x: number) => { const ax = Math.abs(x - BAY.x), hw = bayHW(BAY.head); return ax < hw ? BAY.head - Math.sqrt(hw * hw - ax * ax) : gulfZ(x); };
const HEAD_Z = shoreZ(BAY.x), COVE_Z = gulfZ(COVE.x);
/** The two ways in (0..1): the Litsa’s bars at the bay’s head and its valley up through the rock; the cove and its gully. */
const beachK = (x: number, z: number) => Math.max(smoothstep(150, 95, Math.hypot(x - BAY.x, (z - BAY.head) * 0.42)), smoothstep(105, 62, Math.hypot(x - COVE.x, (z - COVE_Z) * 0.5)));

/** The tundra fells: [x, z, radius, height]. */
const HILLS = [[-400, -300, 110, 26], [70, -170, 90, 18], [350, -430, 100, 28], [-280, -640, 90, 20], [230, -720, 80, 14], [-420, 160, 80, 12], [90, 180, 70, 10]];
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) { const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (d2 < 9) h += a * Math.exp(-d2); }
  return h;
}

/** The roads, as polylines: up the Litsa valley to the town and on to Murmansk; up the cove’s gully to Nerpichya; across. */
const ROADS: [number, number][][] = [
  [[BAY.x, HEAD_Z - 25], [-150, -260], [-60, -380], [20, -560], [40, -830]],         // the Litsa valley road, through the town
  [[COVE.x, COVE_Z - 22], [300, 120], [300, -10], [230, -250], [160, -660], [40, -830]], // up the cove’s gully, by Nerpichya to the Murmansk road
  [[-60, -380], [110, -330], [230, -250]],                                           // the town to Nerpichya
  [[20, -560], [160, -660]],                                                         // the Murmansk road
  [[-150, -260], [-330, -180], [-380, 120]],                                         // out to Andreyeva Guba on the west cape
];
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const r of ROADS) for (let i = 1; i < r.length; i++) d = Math.min(d, segDist(x, z, r[i - 1], r[i]));
  return d;
}

export const SECTORS = [
  { x: BAY.x, name: 'Litsa mouth', inland: { name: 'Zapadnaya Litsa', x: -60, z: -380 } },
  { x: COVE.x, name: 'Malaya Lopatka', inland: { name: 'Nerpichya', x: 300, z: -10 } },
];
const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Motovsky Gulf', x: 80, z: 760, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Litsa mouth', x: BAY.x, z: HEAD_Z - 48, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Malaya Lopatka', x: COVE.x, z: COVE_Z - 44, owner: null, sector: 'east', radius: 45, opens: 'F' },
  { id: 'E', name: 'Zapadnaya Litsa', x: -60, z: -380, owner: null, sector: 'west' },
  { id: 'F', name: 'Nerpichya', x: 300, z: -10, owner: null, sector: 'east' },
  { id: 'K', name: 'Murmansk road', x: 160, z: -660, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
const pointClear = (x: number, z: number) => { let k = 1; for (const p of points) k = Math.min(k, smoothstep(30, 55, Math.hypot(p.x - x, p.z - z))); return k; };
const BASE = { x: 40, z: -830 };

/** The granite knolls through the snow (0..1). */
const knollK = (x: number, z: number) => smoothstep(0.2, 0.42, fbm(noise, x * 0.011 + 40, z * 0.011 - 17, 2));

/** The smooth ground: cliffs, the bay, the plateau, fells, knolls, the two ways up (sampled once: gridCacheSmooth). */
function natural(x: number, z: number) {
  const bk = beachK(x, z);
  const g = z - gulfZ(x), ax = x - BAY.x, hw = bayHW(z), b = z > BAY.head ? hw - Math.abs(ax) : hw - Math.hypot(ax, z - BAY.head);
  if (g > 0 || b > 0) { // the bottom: sheer off the cliffs, shelving gently off the bars and the cove’s shingle
    const shelf = (d: number, k: number) => d * (0.5 - 0.47 * k) + Math.max(0, d - 90) * 0.05;
    const inBay = b > 0 ? Math.min(b * 0.5, shelf(z - (BAY.head - hw), bk)) : 0;
    const inGulf = g > 0 ? shelf(g, bk) : 0;
    const rocks = Math.max(0, 2.5 - Math.max(g, b) * 0.08) * (1 - bk) * (0.5 + noise(x * 0.05, z * 0.05));
    return Math.max(0.5 - Math.max(inBay, inGulf) + rocks, -20);
  }
  const back = -Math.max(g, b);
  const clear = smoothstep(8, 22, roadDist(x, z)) * pointClear(x, z) * smoothstep(70, 110, Math.hypot(x - BASE.x, z - BASE.z));
  const plateau = 15 + fbm(noise, x * 0.005, z * 0.005, 3) * 4 + Math.max(0, -z - 200) * 0.008 + hillH(x, z) + knollK(x, z) * 5 * clear;
  const cliff = 0.5 + (plateau - 0.5) * smoothstep(1, 20, back);
  const beach = 0.5 + Math.min(back, 40) * 0.035 + Math.max(0, back - 40) * 0.075;
  return bk > 0 ? cliff + (Math.min(cliff, beach) - cliff) * bk : cliff;
}
const naturalC = gridCacheSmooth(natural, BOUNDS, 2);
const BASE_H = natural(BASE.x, BASE.z);

function height(x: number, z: number) {
  let h = naturalC(x, z);
  const bd = Math.hypot(x - BASE.x, z - BASE.z);
  if (bd < 60) h += (BASE_H - h) * smoothstep(60, 25, bd); // (level with the land round it: no pit for the vehicles)
  return h;
}

/** The bogs under the snow, on the plateau, off the roads, the points and the cliffs. */
const bogC = gridCache((x: number, z: number) => smoothstep(0.1, 0.24, fbm(noise, x * 0.006 + 323.3, z * 0.006 - 161.1, 3))
  * smoothstep(10, 26, roadDist(x, z)) * pointClear(x, z) * smoothstep(-90, -140, seaD(x, z)) * smoothstep(50, 80, Math.hypot(x - BASE.x, z - BASE.z)), BOUNDS);
const softV = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, false), BOUNDS);
const softF = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, true), BOUNDS);
/** Birch scrub in the hollows and down the Litsa valley, bare tundra on the tops (taiga’s maxY). */
const woodsK = (x: number, z: number) => (fbm(noise, x * 0.008 + 708.2, z * 0.008 - 461.4, 3) > 0.05 ? 0.7 : 0.02)
  * smoothstep(6, 16, roadDist(x, z)) * (1 - 0.7 * bogC(x, z)) * pointClear(x, z) * smoothstep(-50, -100, seaD(x, z));
const woodsC = gridCache((x: number, z: number) => Math.max(0, woodsK(x, z)), BOUNDS);
/** The closed town of Zapadnaya Litsa, round its point. */
const townK = (x: number, z: number) => smoothstep(140, 100, Math.hypot((x + 40) * 0.8, z + 400));

export default {
  id: 'motovsky',
  name: 'Motovsky Gulf Landing',
  description: 'The Kola coast at Zapadnaya Litsa, winter 1985: granite cliffs with two ways in — the fjord-like bay with the submarine piers along its wall and the Litsa’s bars at its head, and the shingle cove at Malaya Lopatka — the snowed-over tundra, the base town and the Nerpichya barracks behind. The US Marines and Norway land behind the Litsa front; the Soviets hold.',
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
  steep: 0.5, // (vehicles: the cliffs are no way up — the Litsa valley and the cove’s gully are)
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
        const d = seaD(x, z), bk = beachK(x, z);
        if (d > -3) return [y > -2 ? (bk > 0.5 ? 0xa8a290 : 0x6e6e66) : 0x44484a, 1];                 // stones under the water (the bars: sand)
        const rd = roadDist(x, z);
        if (rd < (townK(x, z) > 0.5 ? 5 : 3.5)) return [0xa8a49c, 0.85];                              // the ploughed road
        if (bk > 0.5 && d > -36) return [x < 0 ? 0xc8c2b0 : 0x8a8a86, 1];                              // the bars’ sand, the cove’s shingle
        if (d > -24 && y > 3) return [noise(x * 0.06, z * 0.06) > 0.2 ? 0xd8dcdc : 0x55585c, 0.9];   // the cliffs’ granite
        if (knollK(x, z) > 0.5 && y > 14) return [noise(x * 0.08, z * 0.08) > 0 ? 0x6a6c70 : 0xc8ccd0, 0.85]; // granite knolls
        return snowSurface(x, z, { road: rd, main: false, ice: () => 0, bog: bogC, noise });
      },
    },
  }),

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the two ways in)
           pact: { x: BASE.x, z: BASE.z, entries: [20, 60] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -250 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what comes in (systems/Landing.js): the Marines and the Norwegians by LCVP or Type 520 (standing in for the LCUs), vehicles by Type 520
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: a Perry frigate or a Spruance inshore, Norway’s Hauk fast attack craft
    navy: ['frigate', 'destroyer', 'ptBoat'],
    // the Northern Fleet’s mines across the gulf, a lane left off each way in
    seaMines: { z: [540, 600], count: 60, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_61 },
    // the coastal artillery: a 130 mm battery on each cape at the bay’s mouth; the Rubezh launchers inland that fire on the ships
    forts: [
      { unit: 'artillery', x: -320, z: 300, facing: 0, name: 'Andreyeva cape battery' },
      { unit: 'artillery', x: -10, z: 310, facing: 0, name: 'Lopatka cape battery' },
      { unit: 'coastMissile', x: -330, z: -470, facing: 0, name: 'Rubezh battery' }, { unit: 'coastMissile', x: 360, z: -560, facing: 0, name: 'Rubezh battery' },
    ],
    // prepared positions: wire round the bars and across the cove, minefields, trenches and MG nests over them; tank traps in the gully
    works: [
      ...Array.from({ length: 22 }, (_, i) => { const a = Math.PI * (1.1 + i * 0.8 / 21), r = bayHW(BAY.head) + 28; return { kind: 'wire', x: BAY.x + Math.cos(a) * r, z: BAY.head + Math.sin(a) * r, yaw: a + Math.PI / 2 }; }),
      ...Array.from({ length: 12 }, (_, i) => { const x = COVE.x - 55 + i * 10; return { kind: 'wire', x, z: Math.min(gulfZ(x), COVE_Z + 30) - 26, yaw: 0 }; }),
      ...[-12, -4, 4, 12].map((dx) => ({ kind: 'tankTraps', x: COVE.x + dx, z: COVE_Z - 70, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x) - 66 }))),
      ...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x) - 58, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x) - 50, yaw: 0 }))),
      ...[-12, 12].map((dx) => ({ kind: 'mines', x: BAY.x + dx, z: HEAD_Z - 36 })),
    ],
    // the defence at dawn: the 61st Naval Infantry Brigade over the bars and on the bay’s walls, a company in the cove’s gully, the town and the barracks; Fagots and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Naval infantry squad', coastMissile: 'Rubezh battery' },
    hold: [
      { x: BAY.x - 45, z: HEAD_Z - 52 }, { x: BAY.x + 45, z: HEAD_Z - 52 }, { x: BAY.x - 22, z: HEAD_Z - 46 }, { x: BAY.x + 22, z: HEAD_Z - 46 },
      { x: BAY.x - 125, z: 60 }, { x: BAY.x + 125, z: 40 },                                   // (on the bay’s walls, over the boats coming in)
      { x: COVE.x - 22, z: COVE_Z - 50 }, { x: COVE.x + 22, z: COVE_Z - 50 }, { x: COVE.x, z: COVE_Z - 80 },
      ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z })),
    ],
    // the counter-attack: the motor rifle division’s reserve, pulled back off the Litsa front down the Murmansk road
    counter: { t: 360, units: ['tank', 'ifv', 'heavyTank', 'ifv', 'tank'], say: 'The division’s reserve is coming off the Litsa front down the Murmansk road: T-80s and BMPs, straight for the beachhead', sayOther: 'Enemy armour coming down the Murmansk road: T-80s and BMPs' },
    // the landing’s AI (ai/LandingDirector.js): its buying order, a frigate inshore off the focus way in
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'tank', 'rifles', 'mgTeam', 'ifv', 'rifles', 'tank', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 470 },
    economy: { reserves: 3000, perSector: 900, beachIncome: 1.3, defenceCp: 800, defenceIncome: 1.2 }, // (AI vs AI 2026-11-25: the landing won at 17:14 and 28:12)
    // the AAV7s and the scout vehicles swim in on their own, put in off the beach
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon' },
    // the first wave at dawn, in to both ways at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 }, { unit: 'tank', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'ifv', sector: 1 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_61);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 6 + rr && !nearPoint(x, z, 18 + rr) && seaD(x, z) < -30 - rr
      && Math.hypot(x - BASE.x, z - BASE.z) > 45;
    const skip = (x: number, z: number, rr: number) => !free(x, z, rr);

    // ---- Bolshaya Lopatka: two piers out from the bay’s east wall, a boat alongside each, a crane; the workshops above
    const wall = (z: number) => BAY.x + bayHW(z);
    for (const [z, sub] of [[90, true], [210, false]] as [number, boolean][]) {
      const wx = wall(z);
      props.box('stone', wx - 18, 0.4, z, 44, 2.6, 9, 0, 0x6c6a64);
      const hz = z + 9;
      props.box('metal', wx - 22, 0.5, hz, sub ? 40 : 44, 3, 7, 0, sub ? 0x1e2226 : 0x6a7078);
      props.box('metal', wx - 22 + (sub ? 5 : -4), sub ? 3.6 : 4.2, hz, sub ? 7 : 14, sub ? 4 : 4.2, sub ? 2.4 : 5, 0, sub ? 0x1e2226 : 0x6a7078);
      if (!sub) props.mast({ x: wx - 26, z: hz, height: 10 });
      for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) props.box('metal', wx - 30 + lx, 7, z + lz, 0.6, 10, 0.6, 0, 0x9a7a32);
      props.box('metal', wx - 30, 13, z, 6, 3, 7, 0, 0x9a7a32);
    }
    for (const [z, w] of [[130, 40], [250, 34]] as [number, number][]) if (free(wall(z) + 50, z, 14)) props.hall({ x: wall(z) + 50, z, yaw: Math.PI / 2, width: w, depth: 18, height: 9, color: 0x7e7a70, roof: 0x3e4044, door: 10, name: 'base workshop' });
    props.tanks({ x: 40, z: 60, yaw: 0, count: 3, radius: 6, height: 9, color: 0x8e9290 });
    // ---- the submarine pens: concrete portals cut into the west wall, a boat’s sail showing in one
    for (const z of [20, 150]) {
      const wx = BAY.x - bayHW(z);
      props.box('stone', wx - 3, 4, z, 8, 10, 24, 0, 0x8a8a84);
      props.box('plain', wx + 1.1, 2.6, z, 0.4, 6.4, 15, 0, 0x101214);
    }
    props.box('metal', BAY.x - bayHW(20) + 12, 0.4, 20, 26, 2.4, 6, 0, 0x1e2226); props.box('metal', BAY.x - bayHW(20) + 9, 3.2, 20, 6, 3.6, 2.2, 0, 0x1e2226);
    // ---- the batteries on the capes: sandbags round the guns, a light on the Lopatka cape
    for (const [x, z] of [[-320, 300], [-10, 310]]) for (const s of [-1, 1]) props.sandbagRing({ x: x + s * 18, z, radius: 4.5, toward: 1 });
    { const x = -60, z = gulfZ(-60) - 18, y = g(x, z); props.box('stone', x, y + 5, z, 2.6, 10, 2.6, 0, 0xe8e4dc); props.box('plain', x, y + 10.8, z, 3.2, 1.6, 3.2, 0, 0xa83a2a); }

    // ---- Zapadnaya Litsa: five-storey blocks round the centre, the officers’ house, the boiler house’s chimney
    for (let gx = -170; gx <= 90; gx += 36) for (let gz = -280; gz >= -520; gz -= 30) {
      const x = gx + (r() - 0.5) * 6, z = gz + (r() - 0.5) * 5;
      if (townK(x, z) < 0.5 || r() < 0.3 || !free(x, z, 14)) continue;
      flats(props, { x, z, yaw: r() < 0.75 ? 0 : Math.PI / 2, storeys: 5, width: 28, depth: 11, name: 'Khrushchyovka' });
    }
    if (free(-110, -450, 12)) props.flatHouse({ x: -110, z: -450, yaw: 0, width: 24, depth: 12, storeys: 3, name: 'officers’ house' });
    props.hall({ x: 60, z: -470, yaw: 0, width: 24, depth: 14, height: 9, color: 0x7a5a4a, roof: 0x3e4044, door: 6, name: 'boiler house' });
    props.chimney({ x: 76, z: -482, height: 40 });
    // ---- Andreyeva Guba: the store sheds on the west cape; Nerpichya: the barracks and a few blocks
    for (const [x, z] of [[-430, 40], [-330, 60], [-420, -40], [-320, -20]]) if (free(x, z, 14)) props.hall({ x, z, yaw: 0, width: 30, depth: 14, height: 7, color: 0x7a7a6e, roof: 0x3a3c3e, door: 6, name: 'store shed' });
    for (const [dx, dz] of [[-60, 30], [65, 35], [60, -45], [-55, -50]]) if (free(300 + dx, -10 + dz, 14)) props.hall({ x: 300 + dx, z: -10 + dz, yaw: 0, width: 30, depth: 10, height: 6, color: 0x8a7a62, roof: 0x3a3a3a, door: 4, name: 'barracks' });
    if (free(400, -110, 14)) flats(props, { x: 400, z: -110, yaw: Math.PI / 2, storeys: 4, width: 28, depth: 11, name: 'Khrushchyovka' });
    // ---- a fishermen’s hamlet up the Litsa valley, the wooden houses at the Murmansk road
    props.rand = mulberry32(1985_62);
    woodenVillage(props, { x: -250, z: -230 }, { n: 4, skip });
    woodenVillage(props, { x: 260, z: -560 }, { n: 5, skip });
    // ---- granite boulders and snowed-in wrecks out on the tundra
    props.rand = r;
    for (let i = 0; i < 90; i++) {
      const x = (r() * 2 - 1) * 470, z = 330 - r() * 1150;
      if (!free(x, z, 3)) continue;
      if (r() < 0.12) props.wreckCar({ x, z, yaw: r() * 6 }); else props.boulder({ x, z, radius: 1.2 + r() * 2 });
    }
    props.rand = mulberry32(405);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: BASE.x, z: BASE.z, r: 34 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || seaD(x, z) > -40 || townK(x, z) > 0.3 }];
    const update = taiga({ scene, terrain, cover, rand, bounds, palette: this.theme.terrain, avoid, forest: woodsK, maxY: 30, trees: 3000, birch: 0.8, size: 0.55 });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
