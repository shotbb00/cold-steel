// Tobruk, the night of 13–14 September 1942 — Operation Agreement (1945 only; coastal: the sea and the land in one battle,
// 1.0 × 1.8 km). The raid that was to wreck Rommel’s supply port: Haselden’s Force B, in captured lorries, was to seize
// the little inlet of Mersa Umm es-Sciausc (Marsa Sciausc) east of the harbour; the Argylls and Northumberland
// Fusiliers were to come in to it by MTB, the Royal Marines of the 11th Battalion from the destroyers Sikh and Zulu onto
// the beaches north of the harbour; together they were to take the coastal guns, burn the bulk fuel tanks and the
// shipping, and get off again before dawn. It went wrong everywhere: the MTBs missed the inlet in the dark, the Marines’
// boats broke up in the swell, the Italian San Marco marines and the German flak gunners — firing their 88s and 2 cm at
// the ground — held the guns, Sikh and Zulu were sunk by the shore batteries and the Stukas, and hardly anyone came back.
// Played as the full landing it was meant to be: the commandos and the Marines come in from the sea (+z) in LCAs and
// LCTs, the Axis garrison holds the land (-z). Compressed and turned so the sea is +z: in the west the town of Tobruk on
// its low peninsula, the white Italian houses, the church and the mosque, the lighthouse on the point; east of it the
// harbour, a deep inlet full of wrecks, the quays and warehouses at its head; then the narrow Marsa Sciausc inlet
// between rocky banks; then the open shore below Wadi Zeitun, the coast battery on the bluff above it. Behind them the
// coastal flat, stony and bare, the bulk fuel tanks on the rise south of the harbour, and across the back the first
// escarpment, cut by three wadis (the roads up it); on top, the old perimeter of 1941 — the concrete posts, the broken
// wire — where the Afrika Korps’ reserve comes from.
// No ships to call: the 8th Army has no warships on its list (and Sikh and Zulu went down off this coast); the boats run
// in under the batteries, which only the men ashore can silence. Not point-mirrored: one side lands, the other holds
// (modes/landing). NATO (the British) lands from its base out at sea (+z); the Wehrmacht stands in for the Italians too.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1942_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a5e7a }); // (the Mediterranean at night: deep blue-black)

/** The open coast (z): the peninsula of the town standing out to sea in the west. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 1.7, 2) * 10 + 120 * Math.exp(-(((x + 390) / 95) ** 2));
/** A rounded box’s signed distance (negative inside). */
type Box = { x: number; z: number; hx: number; hz: number; r: number };
const sdBox = (x: number, z: number, b: Box) => {
  const qx = Math.abs(x - b.x) - b.hx + b.r, qz = Math.abs(z - b.z) - b.hz + b.r;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - b.r;
};
/** The harbour: a deep inlet, its mouth to the sea, the quays at its head. */
const HARB: Box = { x: -150, z: 45, hx: 95, hz: 170, r: 45 };
/** Marsa Sciausc: the narrow inlet east of the harbour. */
const COVE: Box = { x: 140, z: 110, hx: 30, hz: 75, r: 22 };
/** How far into the water (m, > 0) or inland (< 0) a spot is. */
const edge = (x: number, z: number) => fbm(noise, x * 0.02 + 40, z * 0.02, 2) * 7; // (ragged rock, not a dock basin)
const wetD = (x: number, z: number) => Math.max(z - shoreZ(x), -sdBox(x, z, HARB) + edge(x, z), -sdBox(x, z, COVE) + edge(x, z) * 0.6);

const TOWN = { x: -390, z: 30 };    // Tobruk, on its peninsula (E)
const FUEL = { x: 90, z: -180 };     // the bulk fuel tanks (F) (forward of where the wadi road comes down: further back the perimeter’s reserve fed it and no landing ever took it — AI vs AI 2026-11-22)
const GUNS = { x: 370, z: -200 };    // the coast guns on the bluff over Wadi Zeitun (G)
const PERIM = { x: 0, z: -640 };     // the old perimeter, on the El Adem road (K)

/** The roads: the town’s street and the Via Balbia round the harbour head, up from each landing, up the wadis, the perimeter track. */
const ROADS: [number, number][][] = [
  [[-390, 200], [TOWN.x, TOWN.z], [-330, -180], [-150, -190], [FUEL.x, FUEL.z], [200, -175], [GUNS.x, GUNS.z], [500, -235]], // the Via Balbia
  [[-150, -128], [-150, -190]],                                         // up from the quays
  [[140, 30], [120, -100], [FUEL.x, FUEL.z]],                           // up from Marsa Sciausc
  [[360, 112], [365, -40], [GUNS.x, GUNS.z]],                           // up from the Wadi Zeitun shore
  [[FUEL.x, FUEL.z], [30, -420], [PERIM.x, PERIM.z], [0, -900]],        // the fuel tanks – the perimeter, up the middle wadi
  [[GUNS.x, GUNS.z], [330, -430], [240, -610]],                         // up Wadi Zeitun
  [[-330, -180], [-320, -420], [-200, -630]],                           // the El Adem road out of the town, up the west wadi
  [[-500, -665], [-200, -630], [PERIM.x, PERIM.z], [240, -610], [500, -650]], // the perimeter track
];
const WADIS = [ROADS[4], ROADS[5], ROADS[6]];
const segD = (x: number, z: number, [ax, az]: number[], [bx, bz]: number[]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const lineD = (x: number, z: number, ls: [number, number][][]) => { let d = Infinity; for (const r of ls) for (let i = 1; i < r.length; i++) d = Math.min(d, segD(x, z, r[i - 1], r[i])); return d; };
const roadD = (x: number, z: number) => lineD(x, z, ROADS);
const onRoad = (x: number, z: number) => wetD(x, z) < -12 && roadD(x, z) < 3.5;

/** The peninsula’s plateau under the town (0..1). */
const penK = (x: number, z: number) => smoothstep(-220, -340, x) * smoothstep(-260, -140, z);
/** The escarpment’s height at (x, z): a step of 26 m across the back, gentle where a wadi cuts it. */
function esc(x: number, z: number) {
  const zz = z + fbm(noise, x * 0.006, 3.3, 2) * 25;
  const wk = smoothstep(34, 12, lineD(x, z, WADIS));
  return 26 * (smoothstep(-340, -400, zz) * (1 - wk) + smoothstep(-250, -510, zz) * wk);
}

function height(x: number, z: number) {
  const d = wetD(x, z);
  if (d > 0) return Math.max(-16, 0.5 - d * 0.12 - Math.max(0, d - 40) * 0.08); // (the bottom: rock and sand shelving off fast, deep in the harbour)
  const back = -d;
  const beach = 0.5 + Math.min(back, 30) * 0.05;
  const land = 2.5 + smoothstep(20, 140, back) * 4 + fbm(noise, x * 0.005, z * 0.005, 3) * 2.2 + 16 * penK(x, z) + esc(x, z)
    + Math.max(0, -z - 420) * 0.008;
  return beach + (land - beach) * smoothstep(6, 45, back);
}

/** The beach sectors, west to east. */
const SECTORS = [{ x: HARB.x, name: 'Tobruk harbour' }, { x: COVE.x, name: 'Marsa Sciausc' }, { x: 360, name: 'Wadi Zeitun shore' }];
const harbHead = HARB.z - HARB.hz; // (z of the quays)
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (open from the start; `opens` the objective inland once taken)
  { id: 'B', name: 'Tobruk harbour', x: HARB.x, z: harbHead - 26, owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Marsa Sciausc', x: COVE.x, z: COVE.z - COVE.hz - 24, owner: null, sector: 'centre', radius: 42, opens: 'F' },
  { id: 'D', name: 'Wadi Zeitun shore', x: 360, z: shoreZ(360) - 34, owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: 'Tobruk', ...TOWN, owner: null, sector: 'west' },
  { id: 'F', name: 'Fuel tanks', ...FUEL, owner: null, sector: 'centre' },
  { id: 'G', name: 'Coast guns', ...GUNS, owner: null, sector: 'east' },
  { id: 'K', name: 'Old perimeter', ...PERIM, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** The garrison’s concrete: a strongpoint over each landing place, the battery on the bluff over Wadi Zeitun. */
const FORTS = [
  { unit: 'wn', x: -45, z: harbHead + 10, facing: 0 },                // (on the harbour’s east shore, firing across the quays)
  { unit: 'wn', x: 205, z: 55, facing: 0 },                            // (on the bank east of Marsa Sciausc)
  { unit: 'wn', x: 290, z: shoreZ(290) - 55, facing: 0 },              // (over the Wadi Zeitun shore)
  { unit: 'battery', x: 440, z: -40, facing: 0 },                      // (the battery on the bluff, close over the shore: the commandos who land below it can get at it — AI vs AI 2026-11-22)
];

export default {
  id: 'tobruk',
  name: 'Tobruk',
  description: 'Tobruk, the night of 13–14 September 1942, Operation Agreement: the town on its peninsula, the harbour full of wrecks, the Marsa Sciausc inlet and the shore below Wadi Zeitun, the fuel tanks and coast guns, the escarpment and the old perimeter behind. British commandos and Royal Marines land from the sea; the Axis garrison holds.',
  epochs: ['1945'],
  region: 'africa',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['brit'], pact: ['wh'] }, // (the commandos, the Argylls and the 11th Royal Marines on the 8th Army’s roster; the Wehrmacht for the Axis garrison)
  climate: 'desert', // (sand paint and khaki drill, as at Gazala and Alamein)
  airfields: [], // (no room for a runway between the harbour, the town and the escarpment)
  conditions: { time: 'night', weather: 'clear' }, // (in after midnight)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the escarpment is no way up — the wadis are)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1942,
  height,
  river: sea,

  theme: {
    // a clear, warm September night on the desert coast (Conditions.js makes it the night): pale stone, dark sea
    fogColor: 0xd2c6aa, fogDensity: 0.0006,
    skyTop: 0x5e86b4, skyHorizon: 0xe2d8c0, skyBottom: 0xb0a080,
    sunColor: 0xfff0d6, sunIntensity: 2.2, sunDisk: 0.8,
    clouds: 0.1, cloudLight: 0xf4efe4, cloudDark: 0xc8bfae,
    sunDir: [0.4, 0.7, 0.55],
    hemiSky: 0xd6dce4, hemiGround: 0xa08860, hemiIntensity: 1.2,
    rimColor: 0xf0e0c0, rimIntensity: 0.28,
    terrain: {
      grass: '#cdb07a', grassAlt: '#c2a46c', dryGrass: '#dcc08a', dirt: '#ae8a5c', rock: '#a8946e',
      pasture: '#c8aa74', ploughed: '#bc9c68', stubble: '#d4b882', meadow: '#c4a872',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const back = -wetD(x, z);
        if (onRoad(x, z)) return [0x8a7a62, 0.9];                                           // the tarmac and the tracks
        if (back < -3) return [y > -2 ? 0xc8b892 : 0x8a8270, 1];                            // the bottom
        if (back < 10 && sdBox(x, z, HARB) < 12 && z < harbHead + 30) return [0x9a948a, 1]; // the quays’ concrete
        if (back < 26) return [0xe0d2a8, 1];                                                // the beaches
        if (back < 60 && y > 4) return [0xb0a080, 0.85];                                    // the rocky banks
        if (penK(x, z) > 0.7 && Math.hypot(x - TOWN.x, (z - TOWN.z) * 0.7) < 150) return [0xc4b494, 0.7]; // the town’s dust
        if (esc(x, z) > 3 && esc(x, z) < 23) return [0xa08a66, 0.8];                        // the escarpment’s face: bare limestone
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -830, entries: [-300, 0, 300] } },
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'nato',
    // the boats (systems/Landing.js; data/units45/ships.js gives them their Royal Navy names: LCA, LCT Mk 4)
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    navy: [], // (the 8th Army has no warships to buy)
    forts: FORTS,
    names: { wn: 'Caposaldo', battery: 'Batteria costiera' }, // (the San Marco marines’ strongpoints and the Italian coast guns: Italian names, the Germans standing in for their crews)
    // wire along each landing place, mines and trenches above it, tank traps on each exit (no MG nests: the strongpoints’ MG 42s and the
    // trenches hold the beaches — with nests as well most AI-vs-AI landings never got off the sand, 2026-11-22)
    works: [
      ...Array.from({ length: 30 }, (_, i) => { const x = -230 + i * 6.4; return { kind: 'wire', x, z: harbHead - 12, yaw: 0 }; }),
      ...Array.from({ length: 12 }, (_, i) => { const x = COVE.x - 33 + i * 6; return { kind: 'wire', x, z: COVE.z - COVE.hz - 12, yaw: 0 }; }),
      ...Array.from({ length: 24 }, (_, i) => { const x = 260 + i * 9.5; return { kind: 'wire', x, z: shoreZ(x) - 18, yaw: 0 }; }),
      ...SECTORS.flatMap((s, i) => { const z0 = points[i + 1].z; return [-36, 36].map((dx) => ({ kind: 'mines', x: s.x + dx, z: z0 - 20 })); }),
      ...SECTORS.flatMap((s, i) => { const z0 = points[i + 1].z; return [-42, 0, 42].map((dx) => ({ kind: 'trench', x: s.x + dx, z: z0 - 32, yaw: 0 })); }),
      ...SECTORS.map((s, i) => ({ kind: 'tankTraps', x: s.x, z: points[i + 1].z - 50, yaw: 0 })),
    ],
    // the garrison at midnight: San Marco marines over the landing places, the German flak gunners with their 88s and 2 cm
    // turned on the ground, mortars and Panzerschrecks behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'sam', 'atTeam', 'mortar', 'rifles', 'scouts'],
    hold: [
      ...SECTORS.flatMap((s, i) => [-45, 45].map((dx) => ({ x: s.x + dx, z: points[i + 1].z - 45 }))),
      TOWN, FUEL, GUNS,
    ],
    // the Afrika Korps’ reserve, out of the old perimeter and down the wadis
    counter: { t: 540, units: ['tank', 'tankDestroyer', 'rifles', 'ifv', 'tank'], say: 'The reserve is coming out of the perimeter: Panzers and grenadiers down the wadis, straight for the harbour', sayOther: 'Enemy armour coming down the wadis from the perimeter' },
    // the landing’s AI (ai/LandingDirector.js): no ships of its own — men first, the Crusaders and Grants once a way off the beach is open
    ai: { order: ['rifles', 'rifles', 'engineers', 'mgTeam', 'rifles', 'atTeam', 'rifles', 'mortar', 'rifles', 'tank', 'engineers', 'rifles', 'mgTeam', 'heavyTank'], gunship: null, gunships: 0, heavy: null },
    economy: { reserves: 3800, perSector: 1000, beachIncome: 1.8, defenceCp: 500, defenceIncome: 0.95 }, // (AI vs AI 2026-11-22: at 2800/850/1.1 with six forts the landing spent itself by 7 min; with one battery and three strongpoints at 3400/1000/1.5–1.8 the defence held 9 runs in 9, the fuel tanks never falling; with the tanks moved forward, no 2 cm Flak or MG nests and these numbers: 1 landing win at 10½ min, 3 holds, one of them 16 stacks to 14)
    // midnight: the Marines into the harbour, the Argylls into Marsa Sciausc, the commandos onto the Wadi Zeitun shore
    waves: [{ t: 0, say: 'The Marines and the commandos are going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1942);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const nearFort = (x: number, z: number, d = 30) => FORTS.some((f) => Math.hypot(f.x - x, f.z - z) < d);
    const free = (x: number, z: number, rr: number) => roadD(x, z) > 5 + rr && !nearPoint(x, z, 14 + rr) && !nearFort(x, z, 22 + rr) && wetD(x, z) < -8 - rr;

    // ---- Tobruk on its peninsula: white flat-roofed houses on a grid, the church, the mosque, the Italian offices
    props.church({ x: TOWN.x + 34, z: TOWN.z + 30, yaw: Math.PI / 2 });
    props.flatHouse({ x: TOWN.x - 40, z: TOWN.z - 40, yaw: 0, width: 9, depth: 9, storeys: 1, name: 'mosque', dome: true });
    props.flatHouse({ x: TOWN.x + 30, z: TOWN.z - 34, yaw: 0, width: 22, depth: 12, storeys: 2, name: 'Italian command' });
    for (let gx = -480; gx <= -290; gx += 19) for (let gz = 230; gz >= -130; gz -= 17) {
      const x = gx + (r() - 0.5) * 4, z = gz + (r() - 0.5) * 4;
      if (r() < 0.3 || !free(x, z, 6) || wetD(x, z) > -30 || Math.hypot(x - TOWN.x, z - TOWN.z) < 24) continue;
      if (Math.hypot(x - TOWN.x - 34, z - TOWN.z - 30) < 20 || Math.hypot(x - TOWN.x + 40, z - TOWN.z + 40) < 12 || Math.hypot(x - TOWN.x - 30, z - TOWN.z + 34) < 18) continue;
      if (r() < 0.8) props.flatHouse({ x, z, yaw: 0, width: 8 + r() * 4, depth: 7 + r() * 3, storeys: r() < 0.3 ? 2 : 1, name: 'house' });
      else props.flatHouse({ x, z, yaw: 0, width: 10, depth: 10, storeys: 2, name: 'Italian villa' });
    }
    for (let i = 0; i < 7; i++) { const x = TOWN.x - 70 + i * 20, z = TOWN.z + 70 + r() * 6; if (free(x, z, 2)) props.palm({ x, z, height: 7 + r() * 3 }); }

    // ---- the harbour: the quays at its head, warehouses, cranes; wrecks everywhere in the water (kept off the boats’ way in)
    for (let x = HARB.x - 85; x <= HARB.x + 85; x += 10) props.column({ x, z: harbHead - 3, radius: 0.35, height: 0.8 }); // (bollards)
    for (const [x, w] of [[-215, 30], [-85, 34]] as [number, number][]) props.hall({ x, z: harbHead - 58, yaw: 0, width: w, depth: 14, height: 7, color: 0xc0b49a, roof: 0x6a645a, door: 7, name: 'warehouse' });
    for (const x of [-205, -95]) { const z = harbHead - 20, y = g(x, z); props.box('metal', x, y + 5, z, 2, 10, 2, 0, 0x5a5048); props.box('metal', x, y + 10, z + 6, 1, 1, 14, 0, 0x5a5048, -0.4); }
    for (const [x, z, yaw, len] of [[-222, 40, 0.3, 46], [-78, -30, -0.2, 52], [-215, 150, 1.2, 40], [-90, 120, 2.6, 34], [-205, -70, 0.1, 30]] as number[][]) {
      props.box('metal', x, -0.6, z, 7, 3.2, len, yaw, 0x3e3a36, 0.08, 0.12); // (a sunk freighter: the hull awash, listing)
      props.box('metal', x, 2.4, z, 3, 3, 6, yaw, 0x4a443e);                   // (her bridge)
    }
    for (const x of [-232, -68]) for (let s = 4; s < 40; s += 5) props.box('plain', x, 1.4, harbHead + s, 4, 0.4, 5, 0, 0x7a6a56); // (two jetties)

    // ---- the fuel tanks on the rise south of the harbour, the pump house, blast walls
    for (const [dx, dz] of [[-40, 30], [40, 30], [-40, -35], [40, -35]]) props.tanks({ x: FUEL.x + dx, z: FUEL.z + dz, yaw: 0, count: 2, radius: 7, height: 9, color: 0xa8a49a });
    props.flatHouse({ x: FUEL.x + 80, z: FUEL.z, yaw: 0, width: 8, depth: 6, storeys: 1, name: 'pump house' });
    props.lowWall({ x: FUEL.x, z: FUEL.z - 68, yaw: 0, length: 60, height: 2, color: 0xa89a7a }); // (a blast wall behind the tanks only: walled in on three sides they were a fortress no attack got into — AI vs AI 2026-11-22)

    // ---- the gun positions: sandbags round the batteries and the coast guns’ point, a lighthouse on the town’s point
    for (const f of FORTS.filter((q) => q.unit === 'battery')) for (const s of [-1, 1]) props.sandbagRing({ x: f.x + s * 34, z: f.z - 12, radius: 5, toward: 1 });
    for (const s of [-1, 1]) props.sandbagRing({ x: GUNS.x + s * 26, z: GUNS.z - 22, radius: 5, toward: 1 });
    { const x = -440, z = shoreZ(-440) - 18, y = g(x, z); props.box('stone', x, y + 6, z, 3, 12, 3, 0, 0xe8e4dc); props.box('plain', x, y + 13, z, 3.6, 2, 3.6, 0, 0x2a2a2a); }

    // ---- the old perimeter of 1941: concrete posts along the top of the escarpment, the wire broken, the dugouts
    for (let x = -470; x <= 470; x += 70) {
      const z = -600 - fbm(noise, x * 0.01, 9, 1) * 20 + (x > 0 ? x * 0.04 : 0);
      if (!free(x, z, 8)) continue;
      props.box('stone', x, g(x, z) + 0.6, z, 6, 1.2, 6, 0, 0x9a9282);
      props.sandbagRing({ x, z: z + 10, radius: 4, toward: 1 });
    }
    for (let i = 0; i < 40; i++) { const x = -480 + i * 24 + r() * 6, z = -585 + r() * 6; if (free(x, z, 1)) props.column({ x, z, radius: 0.12, height: 1.2 }); } // (the wire’s pickets)
    // ---- the wrecks of two years of fighting on the flat: burnt lorries and tanks, dumps, Bedouin stone huts
    for (let i = 0; i < 26; i++) {
      const x = (r() * 2 - 1) * 470, z = -40 - r() * 700;
      if (!free(x, z, 6) || penK(x, z) > 0.3) continue;
      const k = r();
      if (k < 0.45) props.wreckCar({ x, z, yaw: r() * 6 });
      else if (k < 0.7) props.crates({ x, z, yaw: r() * 3 });
      else props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 7, depth: 5, height: 2.6 });
    }
    commandPost(props, this.bases.pact, 1, 0x9a8a62);
    props.finish();

    // camel thorn and saltbush: low scrub, thin, more of it in the wadis
    const avoid = [{ x: 0, z: -830, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadD(x, z) < 6 || wetD(x, z) > -25 || nearFort(x, z) || (penK(x, z) > 0.5 && Math.hypot(x - TOWN.x, z - TOWN.z) < 260) || Math.hypot(x - FUEL.x, z - FUEL.z) < 90 }];
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 700, broadleaf: 1, autumn: 0.3, size: 0.3, maxY: 80, avoid,
      forest: (x: number, z: number) => 0.12 + smoothstep(40, 12, lineD(x, z, WADIS)) * 0.5 * smoothstep(-300, -380, z) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => wetD(x, z) > -28 || roadD(x, z) < 5 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { scrub.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
