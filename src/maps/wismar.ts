// Wismar Bay, Mecklenburg, 1985 (coastal: NATO lands, the GDR holds; 1.0 × 1.8 km). Hohwacht the other way round:
// the landing NATO's planners kept for the day the Pact's tanks were past the Elbe — the Bundeswehr's and the US
// Marines' battalions put ashore behind the front from the Bundesmarine's Type 520 landing craft and the
// amphibious ships' LCVPs, with the German and Danish Baltic navies to cover them.
// Laid out on the real bay, north up (the sea, +z): Wismar Bay is no straight shore but a funnel. In the west the
// Hohen Wieschendorf Huk, a clay headland, juts out into the bay with a cove behind it; from there the west shore
// runs on the slant down past Zierow's beach and the manor, past Wendorf's bathing beach, to the head of the bay —
// and there, a kilometre in from the open sea, lies Wismar: the harbour basin with its quays, cranes and the
// Mathias-Thesen shipyard, and up behind it the Hanseatic old town round the Markt, St Marien's tower and St
// Nikolai's tall nave. The east side of the bay is Poel island, low and bare, with the beach at Timmendorf on its
// northern tip facing the open sea and Kirchdorf's church inland; the Breitling cuts it off from the mainland in
// the south, crossed only by the dam at Fährdorf. Four ways in, each its own: the open beach under the Huk, the
// bathing beach deep in the bay, the quays at its head (the longest run in, under every gun on both shores), and
// Poel's beach — which leads only onto an island the Pact reaches over one dam. Behind it all the collective farms'
// big fields (no hedges here: the LPGs took them out), beech woods, and Dorf Mecklenburg on the road to Schwerin.
// Along the shores the Grenzbrigade Küste's concrete watchtowers and trenches, the NVA's Rubezh coastal missile
// battery inland. (Compressed: the bay is 10 km long; here the Huk, Zierow, Wendorf and the harbour are 700 m apart.)
// The lander is NATO, so the sea is toward +z and NATO's base is out in it (systems/Landing.js lands()).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

// NATO's landing craft (lcu520, lcvp85) are 1985 roster types: data/units/baltic85.js.

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a62 }); // (the western Baltic: grey-green, brackish)

type P2 = [number, number];
/** The mainland's waterline, west to east (z of the shore at x: the water is on the +z side): the Huk, the slanting west shore, the harbour at the bay's head, the Breitling's south bank. */
const MAIN: P2[] = [[-1010, 300], [-470, 318], [-418, 336], [-398, 300], [-382, 232], [-330, 168], [-250, 70], [-150, -58], [-62, -165], [-34, -214], [60, -230], [150, -212], [178, -165], [232, -150], [380, -140], [1010, -128]];
/** Poel (an island: its outline): the west shore along the bay, the northern tip at Timmendorf, the south shore on the Breitling. */
const POEL: P2[] = [[196, -72], [188, 40], [200, 190], [238, 318], [300, 366], [420, 372], [1010, 360], [1010, -72], [380, -78]];
const mainZ = (x: number) => { for (let i = 0; i < MAIN.length - 1; i++) { const [ax, az] = MAIN[i], [bx, bz] = MAIN[i + 1]; if (x <= bx) return az + (bz - az) * (x - ax) / (bx - ax); } return MAIN[MAIN.length - 1][1]; };
function segD(x: number, z: number, a: P2, b: P2) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const lineD = (x: number, z: number, L: P2[], closed = false) => { let d = Infinity; for (let i = 0; i < L.length - (closed ? 0 : 1); i++) d = Math.min(d, segD(x, z, L[i], L[(i + 1) % L.length])); return d; };
function inPoly(x: number, z: number, L: P2[]) {
  let c = false;
  for (let i = 0, j = L.length - 1; i < L.length; j = i++) if ((L[i][1] > z) !== (L[j][1] > z) && x < (L[j][0] - L[i][0]) * (z - L[i][1]) / (L[j][1] - L[i][1]) + L[i][0]) c = !c;
  return c;
}
const onPoel = (x: number, z: number) => inPoly(x, z, POEL);
/** Signed distance to the water's edge: + on land (m inland), − in the water (m out). */
function shoreD(x: number, z: number) {
  const dm = lineD(x, z, MAIN), dp = lineD(x, z, POEL, true);
  if (z < mainZ(x)) return dm;            // the mainland
  if (onPoel(x, z)) return dp;            // Poel
  return -Math.min(dm, dp);               // the bay, the Breitling, the open sea
}

/** The Huk (far west): the clay cliff. */
const cliffK = (x: number, z: number) => smoothstep(-370, -410, x) * smoothstep(150, 230, z);
/** Wismar's harbour basin at the bay's head: quay walls instead of a beach. */
const harbourK = (x: number, z: number) => smoothstep(-48, -26, x) * smoothstep(176, 154, x) * smoothstep(-140, -175, z);
const DAM_X = 395; // (the Fährdorf dam: the Poel road over the Breitling)
/** The old town: inside the line of the old walls, up behind the harbour. */
const inTown = (x: number, z: number) => x > -110 && x < 230 && z < -300 && z > -540;

/** The beaches' widths: the open beach under the Huk, Wendorf's narrow bathing beach, Poel's wide sand. */
const beachW = (x: number, z: number) => (onPoel(x, z) ? 42 : x < -280 ? 34 : 24);

const heightC = gridCacheSmooth((x: number, z: number) => {
  const sd = shoreD(x, z), hk = harbourK(x, z);
  if (sd < 0) { // the bottom: the bay shallow, shelving fast off the beaches; dredged deep along the quays and in the fairway
    const d = -sd;
    let h = 0.5 - d * 0.075 - Math.max(0, d - 60) * 0.02;
    h = Math.max(h, -11 - smoothstep(380, 700, z) * 7);
    if (hk > 0) h += (Math.min(h, -6) - h) * hk;
    return h;
  }
  const back = sd, poel = onPoel(x, z), bw = beachW(x, z);
  const beach = 0.5 + back * 0.045;
  const dune = 2.4 * Math.exp(-(((back - bw - 10) / 11) ** 2)) * (0.8 + 0.4 * fbm(noise, x * 0.02, 3.3, 2));
  // the land behind: rolling, rising toward Dorf Mecklenburg; the old town on its low hill; Poel low and flat
  const rise = poel ? 1.4 + smoothstep(20, 160, back) * 2.6 + fbm(noise, x * 0.006, z * 0.006, 2) * 1.5
    : 3.5 + smoothstep(30, 150, back) * 4 + Math.max(0, -z - 250) * 0.016 + fbm(noise, x * 0.004, z * 0.004, 3) * 6
      + 5 * Math.exp(-(((x - 60) / 140) ** 2) - (((z + 430) / 110) ** 2));
  let h = Math.max(beach + dune * smoothstep(bw - 10, bw, back), Math.min(rise, beach + back * 0.25));
  // the Huk: the land 16 m up straight behind a narrow strip of shingle
  const ck = cliffK(x, z);
  if (ck > 0) { const top = 16 + fbm(noise, x * 0.01, 7.1, 2) * 3; h += (Math.max(h, beach + (top - beach) * smoothstep(12, 30, back)) - h) * ck; }
  // the quays: a flat apron 1.8 m up, straight out of deep water, a ramp up into the town behind
  if (hk > 0) h += ((back < 75 ? 1.8 : 1.8 + (h - 1.8) * smoothstep(75, 130, back)) - h) * hk;
  return h;
}, { x: 1000, z: 1000 }, 3);

function height(x: number, z: number) {
  let h = heightC(x, z);
  // the Fährdorf dam over the Breitling: level with the banks
  if (Math.abs(x - DAM_X) < 6 && z > -160 && z < -60) h = Math.max(h, 1.6);
  return h;
}

/** Roads (polylines): the Zierow road, the Lübsche Straße from Wendorf to the Markt, the quays, the Schwerin road, the Poel road over the dam, Timmendorf's lane, the F 105. */
const ROADS: P2[][] = [
  [[-320, 130], [-372, 20], [-380, -70], [-330, -260], [-200, -420], [-60, -470]],           // Zierow beach – Zierow – the Wismar road
  [[-160, -98], [-90, -230], [-20, -330], [55, -405]],                                         // Wendorf – the Lübsche Straße – the Markt
  [[-24, -252], [150, -250]],                                                                  // along the quays
  [[60, -262], [55, -405], [20, -560], [-40, -700], [-60, -900]],                              // the harbour – the Markt – the Schwerin road (F 106)
  [[330, 322], [345, 220], [370, 130], [392, 0], [DAM_X, -60], [DAM_X, -170], [380, -330], [260, -500], [20, -560]], // Timmendorf – Kirchdorf – the dam – into town
  [[-510, -640], [-200, -610], [20, -560], [300, -620], [510, -660]],                          // the F 105, south of the town
];
const roadD = (x: number, z: number) => { let d = Infinity; for (const L of ROADS) d = Math.min(d, lineD(x, z, L)); return d; };
const onRoad = (x: number, z: number, m = 0) => roadD(x, z) < 3.5 + m;

/** The beach sectors (x) and the places up behind them. */
export const SECTORS = [
  { x: -330, name: 'Zierow beach', inland: { name: 'Zierow', x: -385, z: -60 } },
  { x: -150, name: 'Wendorf beach', inland: { name: 'Wismar old town', x: 55, z: -430 } },
  { x: 60, name: 'Wismar harbour', inland: { name: 'Wismar old town', x: 55, z: -430 } },
  { x: 330, name: 'Timmendorf Strand', inland: { name: 'Kirchdorf', x: 372, z: 110 } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', x: -120, z: 740, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken), out to the trenches over each
  { id: 'B', name: 'Zierow beach', x: -330, z: mainZ(-330) - 60, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Wendorf beach', x: -150, z: mainZ(-150) - 46, owner: null, sector: 'west', radius: 45, opens: 'F' },
  { id: 'D', name: 'Wismar harbour', x: 60, z: -268, owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'H', name: 'Timmendorf Strand', x: 330, z: 312, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Zierow', x: -385, z: -60, owner: null, sector: 'west' },
  { id: 'F', name: 'Wismar old town', x: 55, z: -430, owner: null, sector: 'centre' },
  { id: 'G', name: 'Kirchdorf', x: 372, z: 110, owner: null, sector: 'east' },
  { id: 'K', name: 'Dorf Mecklenburg', x: -60, z: -730, owner: 'pact', sector: 'centre' },
];

/** The shore's line at x (where a work goes): the mainland's, or Poel's northern tip. */
const POEL_N: P2[] = [[200, 190], [238, 318], [300, 366], [420, 372], [1010, 360]];
const poelN = (x: number) => { for (let i = 0; i < POEL_N.length - 1; i++) { const [ax, az] = POEL_N[i], [bx, bz] = POEL_N[i + 1]; if (x <= bx) return az + (bz - az) * (x - ax) / (bx - ax); } return 360; };
const shoreAt = (x: number) => (x > 230 ? poelN(x) : mainZ(x));
/** A work `back` m in from the shore off beach x, along the line the craft come in on. */
const behind = (x: number, back: number) => ({ x, z: shoreAt(x) - back });
/** Yaw along the shore at x (Construction yaw: parallel to the waterline). */
const shoreYaw = (x: number) => -Math.atan2(shoreAt(x + 5) - shoreAt(x - 5), 10);

export default {
  id: 'wismar',
  name: 'Wismar Bay Landing',
  description: 'Mecklenburg, 1985: Wismar Bay as a funnel — the beach under the Huk, Wendorf’s beach on the slanting west shore, the quays and the Hanseatic old town at the bay’s head, Poel island across the water with Timmendorf’s beach and one dam to the mainland. NATO lands from the sea; the NVA and the Soviet Army hold the GDR’s coast.',
  epochs: ['1985'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Warsaw Pact' },
  armies: { nato: ['bw', 'us'], pact: ['nva', 'sov'] }, // (the Bundeswehr and the US Marines’ battalions land; the NVA and the Soviet Army hold)
  conditions: { time: 'dawn', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the Huk and the quay walls are no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  river: sea,
  fields: createFields({ seed: 1985_10, cell: 110, weights: [0.3, 0.1, 0.4, 0.2] }), // (the LPGs’ big fields)

  theme: {
    fogColor: 0xa6b0b4, fogDensity: 0.0006,
    skyTop: 0x6f8094, skyHorizon: 0xc8cccc, skyBottom: 0x828a8e,
    sunColor: 0xf2e8d6, sunIntensity: 1.6, sunDisk: 0.2,
    clouds: 0.7, cloudLight: 0xdadcd8, cloudDark: 0x8a9298,
    sunDir: [0.75, 0.45, 0.4],
    hemiSky: 0xc8d2d8, hemiGround: 0x4e5638, hemiIntensity: 1.3,
    rimColor: 0xd0d8dc, rimIntensity: 0.2,
    terrain: {
      grass: '#5a6c3c', grassAlt: '#4e6036', dryGrass: '#8e8a58', dirt: '#5c4e3c', rock: '#7a6a52',
      pasture: '#5c6c3c', ploughed: '#5a4834', stubble: '#90865a', meadow: '#68763e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x55555a, 0.9];                                            // asphalt, cobbles in the town
        if (y < -0.3) return [0xb0a486, 1];                                                  // the sand under the water
        const sd = shoreD(x, z);
        if (harbourK(x, z) > 0.5 && sd < 80) return [0x7a7a74, 0.95];                        // the quays' concrete
        if (z < mainZ(x) && z > -175 && x > 175) return [0x6a7448, 0.8];                     // the Breitling's reeds (south bank)
        if (onPoel(x, z) && z < -30) return [0x6a7448, 0.8];                                 // (north bank)
        if (cliffK(x, z) > 0.3 && sd < 34 && y > 3) return [0x8a7458, 0.85];                 // the Huk's clay face
        if (sd < beachW(x, z)) return [0xddd0ae, 1];                                         // the beach
        if (sd < beachW(x, z) + 22 && cliffK(x, z) < 0.5) return [0xc2b78c, 0.7];           // the dunes, marram grass
        if (inTown(x, z)) return [0x6e6862, 0.8];                                            // the old town's streets and yards
        return null;                                                                        // the fields
      },
    },
  },

  bases: { nato: { x: -120, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: -60, z: -830, entries: [-260, 0, 440] } },
  maxStacks: 22,
  cameraStart: { nato: { x: -60, z: 300 }, pact: { x: 0, z: -300 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what NATO's land troops come in (systems/Landing.js; the craft above): squads by LCVP or Type 520, vehicles by Type 520
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: the Bundesmarine's Bremen frigates, its destroyers, the Schnellboote (frames: data/units/ships85.js)
    navy: ['frigate', 'destroyer', 'ptBoat', 'natya'], // (natya: the Bundesmarine's Lindau sweeper, data/units/baltic85.js)
    // the Volksmarine's mine barrier across the bay's mouth, a lane left off each sector (dan buoys)
    seaMines: { z: [520, 580], count: 60, lanes: SECTORS.map((s) => s.x), lane: 70, seed: 1985_10 },
    // Küstenraketenregiment 18's Rubezh launchers inland: they fire on the ships, then move (systems/Landing.js batteries)
    forts: [{ unit: 'coastMissile', x: -250, z: -420, facing: 0 }, { unit: 'coastMissile', x: 220, z: -560, facing: 0 }],
    // the Grenzbrigade Küste's positions: wire along the back of each beach and the quay edge, minefields, trenches and MG nests over each sector
    works: [
      ...Array.from({ length: 70 }, (_, i) => { const x = -440 + i * 9; return x > -40 && x < 170 ? null : { kind: 'wire', ...behind(x, cliffK(x, mainZ(x) - 10) > 0.3 ? 14 : 22), yaw: shoreYaw(x) }; }).filter((w) => !!w && shoreD(w.x, w.z) > 4),
      ...Array.from({ length: 22 }, (_, i) => { const x = 250 + i * 11; return { kind: 'wire', ...behind(x, 30), yaw: 0 }; }),
      ...Array.from({ length: 16 }, (_, i) => ({ kind: 'wire', x: -20 + i * 11, z: -244, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-36, 36].map((dx) => ({ kind: 'mines', ...behind(s.x + dx, s.x === 60 ? 50 : 56) }))),
      ...SECTORS.flatMap((s) => [-42, 0, 42].map((dx) => ({ kind: 'trench', ...behind(s.x + dx, s.x === 60 ? 60 : 64), yaw: shoreYaw(s.x) }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...behind(s.x + dx, s.x === 60 ? 56 : 58), yaw: shoreYaw(s.x) }))),
      { kind: 'tankTraps', x: 60, z: -300, yaw: 0 }, { kind: 'tankTraps', x: DAM_X, z: -175, yaw: 0 },
    ],
    // the defence at dawn: the border brigade's companies in the trenches and the villages, the motor riflemen's anti-tank guns behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'GBK-Zug', coastMissile: 'Küstenraketenbatterie' },
    hold: [...SECTORS.flatMap((s) => [-40, 40].map((dx) => behind(s.x + dx, s.x === 60 ? 62 : 68))), { x: -385, z: -60 }, { x: 55, z: -430 }, { x: 372, z: 110 }, { x: 20, z: -330 }],
    // the armoured counter-attack: the 8th Motor Rifle Division's reserve, up the Schwerin road and over the Poel dam
    counter: { t: 360, units: ['heavyTank', 'ifv', 'tank', 'ifv', 'heavyTank'], say: 'The 8th Motor Rifle Division is coming up from Schwerin: T-72s and BMPs, straight for the beachhead', sayOther: 'Enemy armour coming up the Schwerin road: T-72s and BMPs' },
    // the landing's AI (ai/LandingDirector.js): the battalions' buying order, a frigate off the bay's mouth (Poel's shoals close in)
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'reconVehicle', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, sweeper: 'natya', heavy: null, inshore: 450 },
    economy: { reserves: 3000, perSector: 500, beachIncome: 0.65, defenceCp: 820, defenceIncome: 1.6 }, // (four ways in, each income-poor: AI vs AI 2026-11-25 — at 800/1.5 won at 19 and 15 min, at 850/1.8 stuck on one beach)
    // the scout vehicles swim in on their own, put in off the beach: the Luchs, the M3 on its screen
    swim: { reconVehicle: 'swimRecon' },
    // the first wave at dawn: in under the Huk, to Wendorf and onto Poel; the harbour only once the bay's shores are quieter
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 }, { unit: 'tank', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'reconVehicle', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 3 }, { unit: 'ifv', sector: 3 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_10);
    sea.build(scene, terrain);
    const y0 = (x: number, z: number) => terrain.heightAt(x, z);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const free = (x: number, z: number) => !onRoad(x, z, 2) && shoreD(x, z) > 60 && !near(x, z, 18) && Math.abs(x) < 488;
    const BRICK = 0x7e3a2c, BRICK2 = 0x6a3428, ROOF = 0x4a3c38;

    // ---- the old town: gabled brick and plaster houses in the blocks between the streets
    for (let gx = -100; gx < 225; gx += 21) for (let gz = -300; gz > -540; gz -= 19) {
      const x = gx + (r() - 0.5) * 4, z = gz + (r() - 0.5) * 4;
      if (r() < 0.25 || !free(x, z) || onRoad(x, z, 6)) continue;
      if (Math.hypot(x + 10, z + 380) < 30 || Math.hypot(x - 130, z + 450) < 34 || Math.hypot(x - 55, z + 430) < 26) continue; // (St Marien, St Nikolai, the Markt)
      props.townHouse({ x, z, yaw: Math.abs(x) % 2 < 1 ? 0 : Math.PI, width: 8 + r() * 3, depth: 10 + r() * 3, storeys: 3 + (r() < 0.3 ? 1 : 0), name: 'gabled house', damaged: 0 });
    }
    // St Marien's tower (80 m: the sea-mark), its nave gone; St Nikolai's tall brick nave and tower
    { const x = -10, z = -380, g = y0(x, z);
      props.box('stone', x, g + 30, z, 13, 60, 13, 0, BRICK);
      props.box('stone', x, g + 62, z, 9, 4, 9, 0, BRICK2);
      cover.addBox({ x, z, yaw: 0, length: 13, thickness: 13, height: 60 }); }
    props.hall({ x: 130, z: -455, yaw: 0, width: 18, depth: 50, height: 24, color: BRICK, roof: ROOF, door: 4, name: 'St Nikolai' });
    { const x = 130, z = -423, g = y0(x, z);
      props.box('stone', x, g + 24, z, 10, 48, 10, 0, BRICK2);
      cover.addBox({ x, z, yaw: 0, length: 10, thickness: 10, height: 48 }); }
    // ---- the harbour: warehouses behind the quays, cranes on the edge, a freighter tied up, the shipyard by the Breitling
    for (const x of [-5, 105, 135]) props.hall({ x, z: -285, yaw: 0, width: 24, depth: 14, height: 9, color: BRICK2, roof: ROOF, door: 6, name: 'warehouse' });
    for (const x of [-10, 30, 100, 140]) { const z = mainZ(x) - 6, g = y0(x, z);
      for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) props.box('metal', x + dx, g + 6, z + dz, 0.5, 12, 0.5, 0, 0x6a6e6a);
      props.box('metal', x, g + 13, z, 4, 3, 5, 0, 0x8a4a2a);
      props.box('metal', x, g + 15, z + 8, 1.2, 1.2, 20, 0, 0x8a4a2a); } // (the jib out over the water)
    { const x = 120, z = mainZ(120) + 12; // (a Deutsche Seereederei freighter at the quay)
      props.box('plain', x, 1.6, z, 62, 6.5, 11, 0, 0x2e3438);
      props.box('plain', x + 20, 7.5, z, 12, 6, 10, 0, 0xe8e4dc);
      props.box('plain', x + 20, 12, z, 3, 4, 3, 0, 0xb83a2a); }
    props.hall({ x: 215, z: -235, yaw: Math.PI / 2, width: 56, depth: 30, height: 20, color: 0x7a7e7a, roof: 0x5a5e62, door: 14, name: 'Mathias-Thesen-Werft' });
    for (const [x0, z0, len] of [[-30, -205, 40], [170, -160, 30]] as [number, number, number][]) for (let k = 0; k < len; k += 4.5) props.boulder({ x: x0 + (x0 < 0 ? -k * 0.3 : k * 0.2), z: z0 + k, radius: 2.3 }); // (the moles at the basin's mouth)
    // ---- Zierow: the manor, farms and houses; the Huk's summer houses; Wendorf's villas; Dorf Mecklenburg; Kirchdorf
    props.hall({ x: -430, z: -20, yaw: 0, width: 26, depth: 13, height: 9, color: 0xd8ccb4, roof: 0x5a4038, door: 3, name: 'Zierow manor' });
    for (let [cx, cz, n] of [[-385, -80, 12], [-450, 230, 6], [-180, -190, 10], [-60, -740, 16], [372, 120, 12]] as [number, number, number][]) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 26 + r() * (n > 12 ? 70 : 46);
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!free(x, z) || Math.hypot(x + 430, z + 20) < 24) continue;
        n--;
        if (i % 3 === 0 && cz < 0 && cx > -300) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, a + Math.PI / 2);
        else props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.3 ? 1 : 2, name: 'house', damaged: 0 });
      }
    }
    props.church({ x: 340, z: 150, yaw: 0 });   // Kirchdorf's church
    props.church({ x: -110, z: -760, yaw: 0 }); // Dorf Mecklenburg's
    // Timmendorf: the pilots' harbour and its little lighthouse on Poel's tip
    { const x = 255, z = 300, g = y0(x, z);
      props.box('stone', x, g + 6, z, 3, 12, 3, 0, 0xe8e4dc);
      props.box('metal', x, g + 13, z, 3.4, 2, 3.4, 0, 0x2a2a2a); }
    // ---- the Grenzbrigade Küste's concrete watchtowers along the shores, the LPG's halls out in the fields
    for (const [x, z] of [[-440, 210], [-260, 0], [-90, -175], [200, -100], [290, 250], [450, 300]]) if (shoreD(x, z) > 20) props.tower({ x, z, concrete: true });
    for (const [x, z] of [[-300, -560], [260, -700], [-400, -780], [400, -400]]) props.hall({ x, z, yaw: 0.3, width: 40, depth: 14, height: 6, color: 0x9a9488, roof: 0x5a5c5e, door: 8, name: 'LPG barn' });
    commandPost(props, this.bases.pact, 1, 0x6a6e52);
    props.finish();

    const land = (x: number, z: number) => shoreD(x, z) > 60;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: -60, z: -830, r: 26 }, { test: (x: number, z: number) => onRoad(x, z, 1) || inTown(x, z) || !land(x, z) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1300, broadleaf: 0.85, autumn: 0.25, maxY: 80, avoid,
      forest: (x: number, z: number) => smoothstep(0.2, 0.5, fbm(noise, x * 0.006 + 4, z * 0.006, 2)) * 0.85 * (onPoel(x, z) ? 0.3 : 1) }); // (the beech woods; Poel nearly bare)
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => shoreD(x, z) < 30 || inTown(x, z) || onRoad(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
