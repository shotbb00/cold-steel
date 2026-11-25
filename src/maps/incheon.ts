// Incheon, autumn 1985 (coastal: the KPA lands, the ROK Army and the Americans hold; 1.0 × 1.8 km). Incheon in
// reverse: in September 1950 MacArthur’s Marines came in here over the mudflats to cut the North’s armies off from
// behind Seoul; in the second Korean war of 1985 that never came, the KPA’s naval infantry and its sea-landing special
// forces (the light infantry brigades trained for exactly this) come in the same way to strike Seoul from behind while
// the front holds on the DMZ. Out at sea the KPA’s landing ships and hovercraft and the mine barrier the ROK Navy laid
// across the approach; then the great tidal mudflats of the Yellow Sea, grey and glistening, with the dredged Flying
// Fish Channel winding in through them. Three beaches, as in 1950: Red Beach under the sea wall of the old town in the
// west (a slipway through the wall, the only way up it for a vehicle), Wolmido in the middle — the island on its
// causeway, a wooded hill with Green Beach on its seaward face and the channel’s deep water close under it — and Blue
// Beach on the mudflats before Juan in the east. Between Wolmido and Blue Beach the harbour’s tidal basin behind its
// lock (the dock of 1974), freighters in it; along the waterfront the quays and the warehouses. Behind them the city
// on its hills: Observatory Hill over Red Beach, Eungbongsan with Jayu Park and MacArthur’s statue over the harbour,
// Cemetery Hill on the flank; then the rice paddies (vehicles keep to the roads), and inland the edge of Kimpo
// airfield with the Gyeongin road running off east to Seoul. The tide comes in over the battle (Incheon’s is one of
// the biggest in the world): at the start the craft ground far out and the men wade the flats, later they come in
// to the wall.
// (Compressed: Kimpo lies 20 km north-east of the harbour; here 600 m behind it.)
// Laid out like Keflavík (maps/keflavik.ts) in a frame with the sea toward +z (`L`), then turned round: the Pact’s side
// is -z, so the sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_50);
const sea = createSea({ level: 0, size: SIZE, color: 0x4a5a52 }); // (the Yellow Sea over the flats: muddy grey-green)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)
const ext = { x: 640, z: 1000 }; // (the caches: the field and a margin)

/** The waterline (local z): the sea wall, the quays and Blue Beach a little over a hundred metres from the middle. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 6;
/** How much of a wall the shore is (1: Red Beach’s sea wall and the quays; 0: Blue Beach’s sloping mud and sand). */
const wallK = (x: number) => smoothstep(290, 250, x);
/** The slipway through the sea wall at Red Beach (vehicles: the only way up). */
const slipK = (x: number) => smoothstep(18, 10, Math.abs(x + 320));
/** Wolmido: the island off the harbour (local), and the elliptic distance from its middle. */
const ISLE = { x: 0, z: 275, rx: 100, rz: 70 };
const isleE = (x: number, z: number) => Math.hypot((x - ISLE.x) / ISLE.rx, (z - ISLE.z) / ISLE.rz);
/** Wolmido’s seaward shore (local z) at x: Green Beach. */
const isleFront = (x: number) => ISLE.z + ISLE.rz * 0.97 * Math.sqrt(Math.max(0, 1 - (x / ISLE.rx) ** 2));
const CAUSE_X = 37; // the causeway from the waterfront out to the island
/** The tidal basin (local rect) behind its dam, the lock through the dam. */
const BASIN = { x0: 150, x1: 250, z0: 25 };
const LOCK = { x0: 193, x1: 207 };

function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const lineDist = (x: number, z: number, l: number[][]) => { let d = Infinity; for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1])); return d; };
/** The Flying Fish Channel (local): in from the sea, close under Wolmido’s front, round its east end to the lock. */
const CHANNEL = [[30, 1000], [0, 660], [40, 420], [140, 310], [200, 168]];

/** The hills (local): [x, z, radius, height] — Observatory Hill, Eungbongsan (Jayu Park), Cemetery Hill, the eastern hills. */
const HILLS = [[-290, -110, 75, 20], [70, -170, 85, 26], [-200, 40, 45, 10], [400, -300, 90, 16], [-430, -330, 80, 14], [-120, -330, 55, 9]];
function hillsExact(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) { const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (d2 < 6) h += a * Math.exp(-d2); }
  return h * (0.9 + 0.2 * noise(x * 0.02, z * 0.02));
}
const hillsL = gridCacheSmooth(hillsExact, ext, 2);
/** Kimpo’s edge on the plain (local z -540 … -840): graded, no hills, no paddies. */
const baseK = (z: number) => smoothstep(-500, -560, z);
/** The towns (local): the old town behind Red Beach, the harbour quarter under Eungbongsan, Juan behind Blue Beach. */
const TOWNS = [{ x: -300, z: -20, r: 140 }, { x: 40, z: -40, r: 120 }, { x: 370, z: -90, r: 95 }];
const townK = (x: number, z: number) => Math.max(...TOWNS.map((t) => smoothstep(t.r, t.r * 0.7, Math.hypot(x - t.x, z - t.z))));

/** The roads (local): the waterfront road behind the wall and round the basin, up from each beach, the Gyeongin road. */
const ROADS: number[][][] = [
  [[-500, 108], [-320, 106], [-170, 100], [-60, 96], [CAUSE_X, 98], [138, 92], [134, 6], [266, 6], [272, 96], [500, 100]],     // the waterfront
  [[CAUSE_X, 98], [CAUSE_X, 212], [12, 268]],                                                                                  // the causeway, up onto Wolmido
  [[-320, 160], [-320, 106], [-300, -110], [-300, -600]],                                                                      // up the slipway, over Observatory Hill, inland
  [[CAUSE_X, 98], [55, -40], [70, -170], [40, -400], [30, -600]],                                                              // up from the harbour through Jayu Park
  [[340, 140], [345, 100], [360, -110], [340, -600]],                                                                          // up from Blue Beach through Juan
  [[-300, -110], [70, -170], [360, -110]],                                                                                     // across the town
  [[-500, -600], [-200, -592], [150, -606], [500, -596]],                                                                      // the Gyeongin road, off east to Seoul
];
const roadDistL = gridCacheSmooth((x: number, z: number) => { let d = Infinity; for (const l of ROADS) d = Math.min(d, lineDist(x, z, l)); return d; }, ext, 2);
const onRoadL = (x: number, z: number) => roadDistL(x, z) < 3.5;
const onRoad = (x: number, z: number) => onRoadL(x, F * z);
/** Kimpo’s runway (local), east–west on the plain: the airfield (systems/Airfields.js) lays its strip on it. */
const onRunway = (x: number, z: number) => Math.abs(z + 720) < 22 && x > -90 && x < 400;

/** The rice paddies (0..1) between the town and Kimpo: low terraces, the harvest standing. */
function paddyRaw(x: number, z: number) {
  return smoothstep(-200, -260, z) * (1 - baseK(z)) * smoothstep(5, 2, hillsL(x, z)) * (1 - townK(x, z)) * smoothstep(7, 14, roadDistL(x, z))
    * smoothstep(-0.25, 0.05, fbm(noise, x * 0.006 + 7, z * 0.006 - 2, 2));
}

/** The land’s level (local, inland of the waterline): the city at 5 m, its hills, the paddies a metre lower, Kimpo graded. */
function landH(x: number, z: number) {
  let h = 5 + fbm(noise, x * 0.004, z * 0.004, 2) * 1.5 + hillsL(x, z);
  const bk = baseK(z);
  if (bk > 0) h += (7 - h) * bk;
  if (z < -200 && z > -560) h -= paddyRaw(x, z) * 1.2;
  return h;
}

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  let h: number;
  if (d > 0) {
    // the mudflats: 170 m of them, dry at the first light for the first sixty metres or so, creeks wandering over them,
    // then off the edge into the deep
    h = d < 170 ? 0.5 - d * 0.0085 + noise(x * 0.03, z * 0.03) * 0.25 * smoothstep(0, 20, d) : Math.max(-1 - (d - 170) * 0.06, -14);
    // the dredged channel
    const cd = lineDist(x, z, CHANNEL);
    if (cd < 60) h += (Math.min(h, -9) - h) * smoothstep(60, 28, cd) * smoothstep(1.05, 1.25, isleE(x, z)) * smoothstep(8, 30, d);
  } else {
    const back = -d, land = landH(x, z);
    // the face: Red Beach’s sea wall and the quays straight up (5 m over 5), the slipway a ramp, Blue Beach a long slope
    const wk = wallK(x), sk = slipK(x);
    const face = (wk * smoothstep(0, 5, back) + (1 - wk) * smoothstep(0, 40, back)) * (1 - sk) + smoothstep(0, 32, back) * sk;
    h = 0.5 + (land - 0.5) * face;
    // the tidal basin behind its dam, the lock through the dam (vertical quay walls)
    const inB = Math.min(x - BASIN.x0, BASIN.x1 - x, z - BASIN.z0, sz - 26 - z);
    const inL = Math.min(x - LOCK.x0, LOCK.x1 - x, z - (sz - 30), sz + 2 - z);
    const cut = Math.max(inB, inL);
    if (cut > -3) h += (-5 - h) * smoothstep(-3, 1, cut);
  }
  // Wolmido: a wooded hill on the flats, a narrow beach round it
  const e = isleE(x, z);
  if (e < 1.35) {
    const top = 0.4 + 3 * smoothstep(1, 0.86, e) + 19 * smoothstep(0.72, 0.06, e) * (0.85 + 0.3 * noise(x * 0.03, z * 0.03));
    h = Math.max(h, e < 1 ? top : 0.4 - (e - 1) * 9);
  }
  // the causeway: a raised road over the flats to the island
  const cx = Math.abs(x - CAUSE_X);
  if (cx < 11 && z > sz - 6 && z < ISLE.z - ISLE.rz * 0.8) h = Math.max(h, h + (3.4 - h) * smoothstep(11, 6, cx));
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The mud (local, 0..1): the flats out to where they drop off, the beach at Blue Beach — men slow, vehicles worse. */
function mudRaw(x: number, z: number) {
  const d = z - shoreZ(x);
  if (Math.abs(x - CAUSE_X) < 6 && d > -6 && z < ISLE.z) return 0;
  if (isleE(x, z) < 0.95) return 0;
  return smoothstep(-35, -5, d) * (1 - wallK(x) * smoothstep(-6, 2, -d)) * smoothstep(185, 160, d);
}
const mudC = gridCache((x: number, z: number) => mudRaw(x, F * z), BOUNDS);
const paddyC = gridCache((x: number, z: number) => paddyRaw(x, F * z), BOUNDS);
/** The mud of the flats and the flooded paddies: men slog through, vehicles bog down off the roads. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = Math.max(mudC(x, z), paddyC(x, z) * 0.8);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.4 : 0.8);
}

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -320, name: 'Red Beach', inland: { name: 'Observatory Hill', x: -290, z: -110 } },
  { x: 10, name: 'Wolmido', inland: { name: 'Jayu Park', x: 70, z: -170 } },
  { x: 340, name: 'Blue Beach', inland: { name: 'Juan', x: 360, z: -110 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
/** Each sector’s waterline (local z) at x: the wall or the beach, Wolmido’s front in the middle. */
const frontZ = (s: number, x: number) => (s === 1 ? isleFront(x) : shoreZ(x));
/** How far behind its waterline a sector’s positions go (the wall’s top is close behind it; the island’s slope short). */
const SET = [{ wire: 8, mines: 30, trench: 40, mg: 34, mines2: 18 }, { wire: 10, mines: 34, trench: 44, mg: 38, mines2: 22 }, { wire: 30, mines: 64, trench: 54, mg: 48, mines2: 38 }];

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Red Beach', ...W(-320, shoreZ(-320) - 36), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Wolmido', ...W(10, isleFront(10) - 42), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Blue Beach', ...W(340, shoreZ(340) - 40), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Observatory Hill', ...W(-290, -110), owner: null, sector: 'west' },
  { id: 'F', name: 'Jayu Park', ...W(70, -170), owner: null, sector: 'centre' },
  { id: 'G', name: 'Juan', ...W(360, -110), owner: null, sector: 'east' },
  { id: 'K', name: 'Kimpo airfield', ...W(-200, -620), owner: 'nato', sector: 'centre' },
];
/** Kimpo’s airfield (world): the tower 55 m in front of the runway’s middle (systems/Airfields.js strip). */
const AIRFIELD = { faction: 'nato', ...W(150, -665), yaw: Math.PI / 2, large: true, name: 'Kimpo' };

const woodsK = (x: number, z: number) => Math.max(smoothstep(6, 13, hillsL(x, z)), isleE(x, z) < 0.8 ? smoothstep(0.8, 0.6, isleE(x, z)) : 0)
  * (1 - townK(x, z) * 0.85) * smoothstep(5, 12, roadDistL(x, z));

export default {
  id: 'incheon',
  name: 'Incheon Landing',
  description: 'Incheon, autumn 1985: the tidal mudflats and the Flying Fish Channel, Wolmido on its causeway, the sea wall at Red Beach, the harbour’s tidal basin and lock, the city on its hills and the edge of Kimpo airfield inland. Incheon in reverse: the KPA’s naval infantry and special forces land to strike Seoul from behind; the ROK Army and the Americans hold.',
  epochs: ['1985'],
  region: 'korea',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'South Korea', pact: 'North Korea' },
  armies: { nato: ['rok', 'us'], pact: ['kpa'] }, // (the ROK Army’s coast defence and the Americans from Kimpo; the KPA’s naval infantry and sea-landing light infantry)
  conditions: { time: 'dawn', weather: 'clear' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles: the sea wall and the quays are no way up — the slipway, the causeway and Blue Beach are)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft,
  river: sea,
  airfields: [AIRFIELD],
  woods: (x: number, z: number) => woodsK(x, F * z) * 0.8,

  theme: {
    // an early autumn dawn on the Yellow Sea: low sun out of the east over the land, haze over the flats
    fogColor: 0xc4c2b8, fogDensity: 0.0007,
    skyTop: 0x5a7aa4, skyHorizon: 0xe2d4bc, skyBottom: 0x8a8678,
    sunColor: 0xffe0b8, sunIntensity: 1.7, sunDisk: 0.35,
    clouds: 0.3, cloudLight: 0xf4ece0, cloudDark: 0x9a9aa0,
    sunDir: [0.3, 0.32, 0.9],
    hemiSky: 0xc8d2de, hemiGround: 0x5a5a40, hemiIntensity: 1.3,
    rimColor: 0xe0d8cc, rimIntensity: 0.22,
    terrain: {
      grass: '#5e7234', grassAlt: '#566a2e', dryGrass: '#8e8a4c', dirt: '#6a5a42', rock: '#787468',
      pasture: '#607434', ploughed: '#5e4c36', stubble: '#9a9050', meadow: '#68803a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoadL(x, lz)) return [0x66645e, 0.9];                                                  // asphalt
        if (onRunway(x, lz)) return [0x6a6a68, 0.95];                                                 // Kimpo’s runway and its shoulders
        const e = isleE(x, lz);
        if (y < 0.9 && (lz > sz - 2 || e < 1.3)) return [y > -2.5 ? (noise(x * 0.04, z * 0.04) > 0.2 ? 0x5e584c : 0x6a6456) : 0x4a4a44, 1]; // the grey mud of the flats
        if (e < 1 && y < 3.5) return [0xa89a7c, 0.9];                                                 // Green Beach’s sand round Wolmido
        if (wallK(x) > 0.5 && lz > sz - 6 && y > 0.5) return [0x8a8680, 0.95];                        // the sea wall’s and the quays’ concrete
        if (wallK(x) < 0.5 && lz > sz - 38) return [0x8a7e64, 0.95];                                  // Blue Beach: mud and sand
        if (lz > BASIN.z0 - 8 && lz < sz && x > BASIN.x0 - 10 && x < BASIN.x1 + 10) return [0x84807a, 0.9]; // the basin’s quays
        const p = paddyRaw(x, lz);
        if (p > 0.2) return [((Math.floor(x / 26) + Math.floor(lz / 18)) & 1) ? 0xa09a4a : 0x8a9440, p * 0.9]; // the paddies, ripe
        if (townK(x, lz) > 0.5) return [0x8a8274, townK(x, lz) * 0.55];                             // lanes and yards
        if (baseK(lz) > 0.5) return [0x8c8c62, 0.5];                                                  // the airfield’s grass, cut
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 30, 340] }, pact: { x: 0, z: -830, entries: [-320, 10, 340] } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the KPA comes in (systems/Landing.js picks these without asking the army): its naval infantry by hovercraft
    // (the Aist stands in for the North’s own Kong Bang) or landing ship (the Polnocny for its Hantae), vehicles by landing ship
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    // what the landing may call in at sea: the Korean People’s Navy’s Osa boats and Yukto sweepers (their kpa variants: data/units/baltic85.js)
    navy: ['osa', 'natya'],
    // the ROK Navy’s mines across the approach, a lane left off each beach (the channel off Wolmido)
    seaMines: { z: [500, 560], count: 60, lanes: [-320, 10, 340], lane: 80, seed: 1985_50 },
    // the tide: half-tide at dawn and flooding — the flats go under, the craft get in closer to the wall
    tide: { rise: 2, over: 1500, band: [-360, -100] },
    // the ROK’s M109s dug in on Cemetery Hill and beside the lock, laid on the beaches and the flats before them
    forts: [{ unit: 'artillery', ...W(-200, 40), facing: Math.PI }, { unit: 'artillery', ...W(210, -15), facing: Math.PI }],
    // prepared positions: wire along the top of the wall and the back of each beach, minefields, trenches and MG nests over them
    works: [
      ...Array.from({ length: 30 }, (_, i) => { const x = -490 + i * 11; return slipK(x) > 0.3 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 8), yaw: 0 }; }).filter(Boolean),
      ...Array.from({ length: 21 }, (_, i) => { const x = 275 + i * 11; return { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }),
      ...Array.from({ length: 15 }, (_, i) => { const x = -77 + i * 11; return Math.abs(x - CAUSE_X) < 14 ? null : { kind: 'wire', ...W(x, isleFront(x) - 10), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s, k) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, frontZ(k, s.x + dx) - SET[k].mines) }))),
      ...SECTORS.flatMap((s, k) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, frontZ(k, s.x + dx) - SET[k].trench), yaw: 0 }))),
      ...SECTORS.flatMap((s, k) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, frontZ(k, s.x + dx) - SET[k].mg), yaw: 0 }))),
      ...SECTORS.flatMap((s, k) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, frontZ(k, s.x + dx) - SET[k].mines2) }))),
    ],
    // the defence at dawn: the ROK’s coast-defence infantry over each beach and in the town, the 106 mm jeeps and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Coast-defence squad' },
    hold: [...SECTORS.flatMap((s, k) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, frontZ(k, s.x + dx) - (Math.abs(dx) < 30 ? SET[k].mg : SET[k].trench + 4)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the counter-attack: the Capital Corps’ armour down the Gyeongin road from Kimpo
    counter: { t: 270, units: ['tank', 'ifv', 'tank', 'ifv', 'heavyTank'], say: 'The armour from Kimpo is coming down: M48s and KIFVs, straight for the beachhead', sayOther: 'Enemy armour coming down the road from Kimpo' },
    // the landing’s AI (ai/LandingDirector.js): the naval infantry’s buying order (an Osa inshore off the focus beach, a Yukto widening its lane)
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'scouts', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'heavyTank'], gunship: 'osa', gunships: 1, sweeper: 'natya', heavy: null, inshore: 360 },
    economy: { reserves: 1800, perSector: 500, beachIncome: 0.6, defenceCp: 1000, defenceIncome: 2 },
    // the amphibious vehicles swim in on their own: the VTT-323s and the BRDMs
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon' },
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'scouts', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_50);
    sea.build(scene, terrain);
    const near = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < m);
    /** Room for a building (local): dry, off the roads and the steep, clear of the points and the airfield. */
    const free = (x: number, z: number, rr: number) => z < shoreZ(x) - 14 - rr && roadDistL(x, z) > 6 + rr && !near(x, z, 16 + rr) && isleE(x, z) > 1.3
      && !(x > BASIN.x0 - 14 - rr && x < BASIN.x1 + 14 + rr && z > BASIN.z0 - 14 - rr) && hillsL(x, z) < 14 && z > -500;

    // ---- the town: tiled houses in the lanes, two-storey shop houses, rows of apartment blocks facing south
    for (let i = 0; i < 4000; i++) {
      const x = (r() * 2 - 1) * 480, z = -480 + r() * 600;
      const tk = townK(x, z);
      if (tk < 0.4 || r() > tk) continue;
      const yaw = r() < 0.5 ? 0 : Math.PI / 2;
      if (r() < 0.12) { if (free(x, z, 15)) props.ruinBlock({ ...W(x, z), yaw: 0, width: 28, depth: 11, storeys: r() < 0.3 ? 9 : 5, ruin: 0, name: 'apartment block' }); }
      else if (!free(x, z, 5)) continue;
      else if (r() < 0.65) props.house({ ...W(x, z), yaw, width: 9 + r() * 2, depth: 6 + r() * 2, height: 2.8 });
      else props.flatHouse({ ...W(x, z), yaw, width: 8 + r() * 3, depth: 8 + r() * 2, storeys: 2 + Math.floor(r() * 2), name: 'shop house' });
    }
    // ---- the waterfront: warehouses along the quays, the gantry cranes, oil tanks behind the basin
    for (let x = -150; x < 125; x += 44) {
      if (Math.abs(x - CAUSE_X) < 30) continue;
      props.hall({ ...W(x, shoreZ(x) - 26), yaw: 0, width: 32, depth: 14, height: 8, color: 0x9a968c, roof: 0x4a5a6a, door: 8, name: 'warehouse' });
    }
    for (const x of [-100, 95]) { // (a gantry crane: two legs and the boom, over the quay)
      const w = W(x, shoreZ(x) - 9), y = terrain.heightAt(w.x, w.z);
      for (const s of [-4, 4]) props.box('metal', w.x + s, y + 9, w.z, 0.8, 18, 0.8, 0, 0xc8742a);
      props.box('metal', w.x, y + 18, w.z + F * 6, 10, 1.4, 26, 0, 0xc8742a);
    }
    props.tanks({ ...W(310, -20), yaw: 0, count: 3, radius: 7, height: 9, color: 0xb8b6ae });
    // ---- the lock: its gates across each end of the chamber, the control house on the dam
    for (const dz of [-24, 0]) { const w = W(200, shoreZ(200) + dz); props.box('metal', w.x, -1, w.z, LOCK.x1 - LOCK.x0 + 2, 8, 1.6, 0, 0x5a5e5a); }
    props.flatHouse({ ...W(230, shoreZ(230) - 14), yaw: 0, width: 9, depth: 7, storeys: 2, name: 'lock house' });
    // freighters lying in the basin (hull and bridge), fishing boats stranded on the flats
    for (const [x, z, len] of [[175, 70, 60], [228, 95, 48]] as [number, number, number][]) {
      const w = W(x, z);
      props.box('metal', w.x, 0.5, w.z, 9, 5, len, 0, 0x3a3e44);
      props.box('plain', w.x, 4.5, w.z + F * (len * 0.32), 8, 4, 9, 0, 0xd8d6cc);
    }
    for (let i = 0; i < 40; i++) {
      const x = (r() * 2 - 1) * 460, z = shoreZ(x) + 15 + r() * 60;
      if (isleE(x, z) < 1.4 || lineDist(x, z, CHANNEL) < 60 || Math.abs(x - CAUSE_X) < 20 || heightL(x, z) < 0.15) continue;
      const w = W(x, z);
      props.box('plain', w.x, terrain.heightAt(w.x, w.z) + 0.6, w.z, 2.6, 1.4, 9, r() * 3, r() < 0.5 ? 0x3a5a7a : 0x8a3a2a);
    }
    // ---- Wolmido: a few houses and restaurants by the causeway, the radio mast on the top
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, x = ISLE.x + Math.cos(a) * ISLE.rx * 0.78, z = ISLE.z + Math.sin(a) * ISLE.rz * 0.78;
      if (z > ISLE.z + 10 || roadDistL(x, z) < 7 || near(x, z, 20)) continue;
      props.house({ ...W(x, z), yaw: a, width: 8, depth: 6, height: 2.8 });
    }
    props.mast({ ...W(-15, 275), height: 18 });
    // ---- Jayu Park on Eungbongsan: MacArthur’s statue on its plinth, the pavilion; Dapdong cathedral below
    const st = W(78, -182), sy = terrain.heightAt(st.x, st.z);
    props.box('stone', st.x, sy + 1.5, st.z, 3, 3, 3, 0, 0x9a968c);
    props.box('metal', st.x, sy + 4.2, st.z, 1, 2.6, 1, 0, 0x4a5a4a);
    props.hall({ ...W(40, -190), yaw: 0.3, width: 10, depth: 7, height: 4, color: 0x8a3a2a, roof: 0x3e4a44, door: 3, name: 'pavilion' });
    props.church({ ...W(-60, -80), yaw: 0 }); // Dapdong cathedral
    // ---- Kimpo (west of the runway’s own hangars and tower — systems/Airfields.js lays those): hangars, the base housing, shelters
    for (const x of [-360, -290]) props.hall({ ...W(x, -715), yaw: 0, width: 50, depth: 38, height: 15, color: 0x7a7e7a, roof: 0x4a4e52, door: 34, name: 'hangar' });
    for (let i = 0; i < 8; i++) props.flatHouse({ ...W(-150 + (i % 4) * 26, -540 - Math.floor(i / 4) * 24), yaw: 0, width: 18, depth: 10, storeys: 3, name: 'base housing' });
    props.aircraftShelter({ ...W(430, -790), yaw: Math.PI / 2 });
    props.aircraftWreck({ ...W(-200, -780), yaw: 0.4, scale: 1.2 }); // (an F-5 caught on the apron by the first strike)
    props.mast({ ...W(-410, -440), height: 24 });
    // farm hamlets among the paddies
    for (let i = 0, n = 0; i < 400 && n < 30; i++) {
      const x = (r() * 2 - 1) * 470, z = -260 - r() * 260;
      if (paddyRaw(x, z) > 0.1 || !free(x, z, 5)) continue;
      props.house({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 6, height: 2.8 });
      n++;
    }
    commandPost(props, this.bases.nato, -1, 0x5a5e40);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) || onRunway(x, F * z) || terrain.heightAt(x, z) < 1.5
      || (F * z > BASIN.z0 - 10 && F * z < shoreZ(x) + 5 && x > BASIN.x0 - 10 && x < BASIN.x1 + 10) }];
    // pine and oak on the hills and on Wolmido; the paddies and the town open
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 3500, broadleaf: 0.35, autumn: 0.15, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => townK(x, F * z) > 0.35 || paddyRaw(x, F * z) > 0.1 || baseK(F * z) > 0.3 }],
      forest: (x: number, z: number) => woodsK(x, F * z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.6,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => terrain.heightAt(x, z) < 1.2 || onRoad(x, z) || onRunway(x, F * z) || townK(x, F * z) > 0.6 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
