// Port Said (coastal, the 1918 epoch: the Ottoman Empire and Germany land, the British Empire holds; 1.2 × 1.8 km).
// HYPOTHETICAL: this landing never happened. To cut the Suez Canal was the Central Powers’ great aim in the East —
// Djemal Pasha’s columns crossed the Sinai to the canal in February 1915 and again to Romani in August 1916, and
// were thrown back each time. From the sea it was never tried: the Goeben (Yavuz) and the Breslau (Midilli) were
// shut up in the Dardanelles, broke out only once, in January 1918, and were caught at Imbros; the U-boats sank
// shipping off the Egyptian coast and laid mines off Port Said but carried no troops. This map plays the raid as it
// might have gone had the Goeben’s sortie gone south instead: an Ottoman-German landing force put ashore at dawn on
// the beaches either side of the canal’s Mediterranean mouth, to blow the canal and the coal wharves that fed every
// ship east of Suez. The British garrison — Territorials, ANZAC depots, the guns on the coast — stands to.
// On the map (laid out in a frame with the sea toward +z, then turned round: the lander, pact, is on −z, so the sea
// is there — systems/Landing.js lands()): the canal running inland in the middle-east of the map between its stone
// quays, the long western breakwater out to sea with the de Lesseps statue at its root and the shorter eastern one;
// the Suez Canal Company’s white building with its three green domes on the quay, the lighthouse; the European town
// in a grid of arcaded streets behind the sea front and the Casino beach, the Arab quarter west of it with its
// mosque, and beyond, the sand spit toward Gamil with Lake Manzala’s lagoon and reed marsh behind it. Along the
// canal’s west bank the quay road, the Ismailia railway and the coal wharves with their heaps, sheds and cranes;
// across the canal a pontoon bridge to the east bank — the RNAS seaplane base with its hangars and slipway, and
// the sand dunes and beaches running away toward Sinai. British coastal guns on the spit and in the east dunes,
// trenches and wire along the beaches. The garrison’s camp at Raswa, inland where the canal meets the lake.
// A scenario, not a fair battle (MAP_BRIEF_SEA_COAST.md): balanced with AI-vs-AI runs so the landing wins late or
// the defence just holds.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2200;
const BOUNDS = { x: 600, z: 900 };
const EXT = { x: 620, z: 920 };
const SEED = 1918_02;
const noise = createNoise2D(SEED);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a7a86 }); // (the Mediterranean off the Delta: green-blue, milky with Nile silt)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

/** The waterline (local z): a nearly straight sand coast. */
const shore0 = (x: number) => 230 + fbm(noise, x * 0.005, 2.7, 2) * 6 + 8 * bell(x, -420, 80);
const SHORE_T = Float32Array.from({ length: 1601 }, (_, i) => shore0(i - 800)); // (sampled every metre: asked for at every height)
const shoreZ = (x: number) => { const f = Math.min(1599.999, Math.max(0, x + 800)), i = Math.floor(f); return SHORE_T[i] + (SHORE_T[i + 1] - SHORE_T[i]) * (f - i); };
/** The canal (x between its quays), from the harbour mouth inland past the map’s end. */
const CL = 130, CR = 215;
/** The breakwaters (x span) and how far out to sea they run from the waterline. */
const MOLE_W = { x0: 56, x1: 64, out: 500 }, MOLE_E = { x0: 262, x1: 270, out: 300 }, MOLE_DECK = 2.6;
/** The pontoon bridge across the canal (local z). */
const BRIDGE_Z = -600;
/** Lake Manzala: its edge (x) at `back` m inland — behind the spit, then reaching east south of the town. */
const lakeEX = (back: number, z: number) => -260 + 100 * smoothstep(500, 660, back) + fbm(noise, 4.1, z * 0.006, 2) * 40;
/** How far inside Lake Manzala (+) or out of it (−) a place is. */
const lakeIn = (x: number, z: number, sz = shoreZ(x)) => { const back = sz - z; const a = back - 300 - fbm(noise, x * 0.006, 6.3, 2) * 40, b = lakeEX(back, z) - x; return (a + b - Math.sqrt((a - b) ** 2 + 70 ** 2)) / 2; }; // (a smooth min: the shore rounds the corner)
const inCanal = (x: number, z: number) => x > CL && x < CR && z < shoreZ(x) + 2;
const onMole = (x: number, z: number, s = shoreZ(x)) => { return (x > MOLE_W.x0 && x < MOLE_W.x1 && z > s - 4 && z < s + MOLE_W.out) || (x > MOLE_E.x0 && x < MOLE_E.x1 && z > s - 4 && z < s + MOLE_E.out); };
/** The east bank’s dunes (0–1) at `back` m inland of the waterline: a saddle where the beach track goes through. */
const duneE = (x: number, back: number) => smoothstep(CR + 40, CR + 110, x + fbm(noise, 3.3, back * 0.01, 2) * 50) * smoothstep(30, 70, back) * smoothstep(240, 170, back + fbm(noise, x * 0.008, 8.8, 2) * 70) * (1 - 0.85 * bell(x, 430, 22));
/** The spit’s low dunes toward Gamil. */
const duneW = (x: number, back: number) => smoothstep(-230, -290, x) * smoothstep(30, 60, back) * smoothstep(170, 120, back) * (1 - 0.85 * bell(x, -420, 20));

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz; // + out to sea
  if (x > MOLE_W.x0 && x < MOLE_E.x1 && onMole(x, z, sz)) return MOLE_DECK;                                                                  // the breakwaters’ concrete blocks
  if (d > 0) { // the sandy bottom shelving off (the boats ground a few metres out), dredged deep in the harbour
    const harbour = x > MOLE_W.x1 && x < MOLE_E.x0 && d < MOLE_W.out ? 1 : 0;
    return Math.max(-0.5 - d * 0.06 - Math.max(0, d - 50) * 0.05 - harbour * 5, -14) + (d < 90 ? fbm(noise, x * 0.01, z * 0.01, 2) * 0.3 : 0);
  }
  const back = -d;
  if (inCanal(x, z)) return Math.abs(z - BRIDGE_Z) < 4.5 ? 1.0 : -8;                                  // the canal, dredged; the pontoon bridge’s deck
  let h = Math.min(0.4 + back * 0.06, 2.0) + fbm(noise, x * 0.004, z * 0.004, 3) * 0.5 * smoothstep(40, 120, back); // the beach, then the flat sand the town stands on
  const de = duneE(x, back), dw = duneW(x, back);
  if (de > 0) h += de * (4 + ridged(noise, x * 0.012 + 3, z * 0.015, 3) * 10);                        // the east bank’s dunes
  if (dw > 0) h += dw * (1.5 + ridged(noise, x * 0.015 + 7, z * 0.02, 2) * 3);                        // the spit’s low dunes
  if (x > CR) h += smoothstep(200, 600, back) * fbm(noise, x * 0.006 + 2, z * 0.006, 2) * 2;          // the east bank’s sand hummocks inland
  const qd = Math.min(Math.abs(x - CL), Math.abs(x - CR));
  if (qd < 4 && Math.abs(z - BRIDGE_Z) > 6) h = -8 + (h + 8) * smoothstep(0, 4, qd);                  // the stone quays: straight down to the water
  const li = x < -110 ? lakeIn(x, z, sz) : -99;
  if (li > -35) { // Lake Manzala: the reed marsh at its edge, then the shallow lagoon (a few marsh islets)
    const islet = fbm(noise, x * 0.02 + 9, z * 0.02, 2) > 0.38 ? 1 : 0;
    const marsh = 0.6 - 0.25 * smoothstep(-35, 0, li);
    h = li < 0 ? Math.min(h, marsh + (h - marsh) * smoothstep(-20, -35, li)) : islet ? 0.25 : -1.4 * smoothstep(0, 25, li) + 0.3 * (1 - smoothstep(0, 25, li));
  }
  return h;
}
const height = gridCacheSmooth((x: number, z: number) => heightL(x, F * z), EXT, 2);

const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
const P = (x: number, back: number) => [x, shoreZ(x) - back];   // a local point `back` m inland
const L = (x: number, back: number) => W(x, shoreZ(x) - back);  // the same, in the world

/** The town’s streets (x) and cross streets (`back`): the grid of the European town and the Arab quarter. */
const ST_X = [-250, -190, -130, -60, 10];
const ST_B = [45, 120, 200, 280, 360, 440];
const TOWN = { x0: -255, x1: 50, b0: 45, b1: 460 };
const ARAB_X = -160; // (west of this street: the Arab quarter)
/** The roads (local): the sea front, the grid, the quay road down the canal to Raswa, the bridge road, the east bank, the spit road to Gamil. */
const ROADS: number[][][] = [
  [P(-600, 45), P(50, 45)],                                                         // the sea front (Rue de la Plage)
  ...ST_B.slice(1).map((b) => [P(-255, b), P(50, b)]),
  ...ST_X.map((x) => [P(x, 45), P(x, 460)]),
  [P(-600, 200), P(-255, 200)],                                                     // the Rue du Commerce on along the spit toward Gamil
  [P(-420, 200), P(-420, 25)],                                                      // the track down to Gamil beach
  [P(50, 45), P(112, 50), [112, -900]],                                             // the quay road (Quai François-Joseph) down the canal to Raswa
  [P(-60, 460), [-60, -700], [0, -790], [0, -900]],                                  // the road out of the town to Raswa camp
  [[-60, -700], [-110, -790], [-110, -900]],
  [[112, BRIDGE_Z], [235, BRIDGE_Z]],                                               // the pontoon bridge
  [[235, BRIDGE_Z], [300, -540], P(300, 200), P(300, 60), P(340, 45)],             // the east bank road up to the seaplane base
  [P(300, 200), P(430, 200), P(430, 25)],                                           // the track through the dunes to the east beach
  [[235, BRIDGE_Z], [330, -680], [330, -900]],                                      // the east bank road inland (Sinai)
];
/** The Ismailia railway along the canal’s west bank. */
const RAIL = [P(96, 330), [96, -900]];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, F * z))), EXT, 2);
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, F * z), EXT, 2);
/** World-frame helpers for the props. */
const onRoad = (x: number, z: number) => roadD(x, z) < 3.4;

/** The beach sectors (local x) and what each opens inland (local back). */
export const SECTORS = [
  { x: -420, name: 'Gamil beach', inland: { name: 'Arab quarter', x: -205, back: 330 } },
  { x: -90, name: 'Casino beach', inland: { name: 'Canal Company', x: 40, back: 165 } },
  { x: 430, name: 'East beach', inland: { name: 'Seaplane base', x: 320, back: 270 } },
];
const RASWA = { x: 0, z: -790 }; // the garrison’s camp, where the canal meets the lake

const points: ControlPointDef[] = [
  { id: 'A', name: 'The raiding squadron', ...W(0, 760), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, ...L(-420, 30), owner: null, sector: 'west', radius: 48, opens: 'E' } as any,
  { id: 'C', name: SECTORS[1].name, ...L(-90, 22), owner: null, sector: 'centre', radius: 45, opens: 'F' } as any,
  { id: 'D', name: SECTORS[2].name, ...L(430, 30), owner: null, sector: 'east', radius: 48, opens: 'G' } as any,
  ...SECTORS.map((s, i) => ({ id: 'EFG'[i], name: s.inland.name, ...L(s.inland.x, s.inland.back), owner: null, sector: ['west', 'centre', 'east'][i] }) as any),
  { id: 'K', name: 'Raswa', ...W(RASWA.x, RASWA.z), owner: 'nato', sector: 'centre' },
];
/** The British coastal guns: on the spit toward Gamil and in the east dunes. */
const GUNS = [{ name: 'Gamil battery', x: -540, back: 95 }, { name: 'East battery', x: 540, back: 120 }];

export default {
  id: 'port-said',
  name: 'Port Said',
  description: 'Hypothetical, 1918: an Ottoman-German raid lands at dawn at Port Said, the Mediterranean mouth of the Suez Canal — sand beaches either side of the long breakwaters and the de Lesseps statue, the Canal Company’s green domes, the arcaded streets and the Arab quarter, Lake Manzala’s marsh on one side, the RNAS seaplane base and the dunes across the canal on the other.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'British Empire', pact: 'Ottoman Empire and Germany' },
  armies: { nato: ['uk', 'anzac'], pact: ['ot', 'de'] }, // (the canal garrison and the ANZAC depots; Ottoman assault troops and German naval landing parties)
  conditions: { time: 'dawn', weather: 'clear' },
  wind: { from: 330, speed: 4, veer: 0.1 }, // (the north-westerly off the sea)
  airfields: [], // (a town, a canal and a lagoon: the seaplanes fly off the water, no strip)
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.5, // (vehicles: not up the dunes’ faces nor the quays — by the tracks and the bridge)
  camera: { maxHeight: 900, near: 1, far: 7000 },
  seed: SEED,
  height,
  river: sea,
  fields: createFields({ seed: SEED, cell: 70 }),

  theme: {
    // a clear dawn on the Delta coast: the sun coming up over Sinai, the lake silver, the town pale
    fogColor: 0xd6d0c0, fogDensity: 0.0005, skyTop: 0x6e94bc, skyHorizon: 0xeedcc0, skyBottom: 0xaaa48c,
    sunColor: 0xffe4bc, sunIntensity: 1.9, sunDisk: 0.7, clouds: 0.1, cloudLight: 0xf6eee2, cloudDark: 0xc0b8aa,
    sunDir: [0.85, 0.3, 0.3], hemiSky: 0xd6dce4, hemiGround: 0x9c8a66, hemiIntensity: 1.25, rimColor: 0xf0e0c4, rimIntensity: 0.3,
    terrain: {
      grass: '#a8966c', grassAlt: '#9c8c62', dryGrass: '#c4b07e', dirt: '#9c7a56', rock: '#b4a68a',
      pasture: '#a8966a', ploughed: '#96744f', stubble: '#c8b282', meadow: '#a8986c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, back = shoreZ(x) - lz;
        if (onMole(x, lz) && y > 2) return [0xb8b2a4, 1];                                         // the breakwaters’ concrete blocks
        if (back < -2) return [y > -1.5 ? 0xd4c8a0 : 0x4e8a90, 1];                                // the sand under the water
        if (inCanal(x, lz)) return y > 0.5 ? [0x6a5a44, 1] : [0x8a9a84, 1];                         // the pontoons’ planking; the canal’s sandy bed
        const li = lakeIn(x, lz);
        if (li > 0) return [y > 0 ? 0x6e7a4a : 0x6a7466, 1];                                        // the lake: mud and the marsh islets’ reeds
        if (li > -35) return [0x7a8450, 0.85];                                                     // the reed marsh
        if (railD(x, z) < 2.4) return [0x6a5e4e, 0.9];                                             // the railway’s ballast
        if (onRoad(x, z) && back > 20) return [x > TOWN.x0 && x < TOWN.x1 && back < TOWN.b1 ? 0x9e9480 : 0xc8b48c, 0.85]; // the town’s paved streets, the sand tracks
        if (x > CR - 6 && x < CR + 14 || x > CL - 30 && x < CL + 2 && back > 30) return [0xa8a090, 0.85]; // the quays
        if (back < 30) return [0xe2d4aa, 1];                                                       // the beach
        if (duneE(x, back) > 0.25 || duneW(x, back) > 0.3) return [0xe6d6a8, 1];                  // the dunes’ pale loose sand
        if (x > TOWN.x0 && x < TOWN.x1 && back > TOWN.b0 && back < TOWN.b1) return [0xc4b494, 0.6]; // the town’s yards
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.24 ? [0x8c8458, Math.min(0.4, (scrub - 0.24) * 2)] : null;
      },
    },
  },

  bases: { nato: { x: 0, z: F * -840, entries: [-100, 20, 330] }, pact: { x: 0, z: F * 840, entries: SECTORS.map((s) => s.x) } }, // (the raid lands: its ways in are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: -60, z: F * 0 }, pact: { x: 0, z: F * 450 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the raiders’ boats: neither the Ottoman army nor the German has landing craft of its own yet (data/units1918/ships.js),
    // so the side’s motor launches and ferries stand in for the ships’ cutters and the requisitioned lighters
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    launchZ: 700,
    signal: { t: 15, say: 'The cutters are away from the ships — pull for the beaches either side of the breakwaters', sayOther: 'Boats off Port Said! The Turks are landing — stand to!' },
    // what the raid could call in: the torpedo boats inshore, the Breslau, the Goeben’s 28 cm guns (the German army’s ships: the Ottoman list has none)
    navy: ['destroyer', 'lightCruiser', 'cruiser'],
    // the guns: the heavy coastal batteries on the spit and in the east dunes (ships only), field guns either side of the canal
    forts: [
      ...GUNS.map((g) => ({ unit: 'coastBattery', name: g.name, ...L(g.x, g.back), facing: Math.PI })),
      { unit: 'artillery', ...L(-150, 560), facing: Math.PI },
      { unit: 'artillery', ...L(330, 520), facing: Math.PI },
    ],
    // wire along the beaches (gaps at the tracks and the sea front’s streets), trenches and Lewis-gun posts over each sector
    works: [
      ...Array.from({ length: 100 }, (_, i) => -580 + i * 11.6)
        .filter((x) => (x < MOLE_W.x0 - 6 || x > MOLE_E.x1 + 6) && Math.abs(x + 420) > 14 && Math.abs(x - 430) > 14 && ST_X.every((s) => Math.abs(s - x) > 10))
        .map((x) => ({ kind: 'wire', ...L(x, 26), yaw: 0 })),
      ...SECTORS.flatMap((s, i) => [-50, 0, 50].map((dx) => ({ kind: 'trench', ...L(s.x + dx + (i === 1 && dx === 0 ? 30 : 0), i === 2 ? 70 : 58), yaw: 0 }))),
      ...SECTORS.flatMap((s, i) => [-28, 28].map((dx) => ({ kind: 'mgNest', ...L(s.x + dx, i === 2 ? 64 : 52), yaw: Math.PI }))),
      ...GUNS.flatMap((g) => [-26, 26].map((dx) => ({ kind: 'trench', ...L(g.x + dx, g.back + 30), yaw: 0 }))),
    ],
    // the canal’s garrison at dawn: a Territorial battalion along the sea front and in the dunes, Lewis guns, ANZAC depot details
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar', 'rifles', 'mgTeam'],
    hold: [...SECTORS.flatMap((s, i) => [-50, 0, 50].map((dx) => L(s.x + dx + (i === 1 && dx === 0 ? 30 : 0), (i === 2 ? 70 : 58) + 6))), ...SECTORS.map((s) => L(s.inland.x, s.inland.back))],
    // the reserve from Raswa: infantry, the armoured cars of the Light Car Patrol, over the bridge and up the quay road
    counter: { t: 220, units: ['rifles', 'reconVehicle', 'mgTeam', 'rifles', 'reconVehicle', 'rifles', 'mgTeam', 'rifles'], say: 'The reserve is coming up from Raswa — infantry and armoured cars, up the quay road and over the bridge', sayOther: 'British armoured cars and infantry coming up from Raswa!' },
    ai: { order: ['rifles', 'stormTroops', 'mgTeam', 'rifles', 'mineClear', 'mortar', 'rifles', 'stormTroops', 'mgTeam', 'engineers', 'rifles', 'artillery'], gunship: 'destroyer', gunships: 1, heavy: 'cruiser', inshore: 420 },
    economy: { reserves: 1700, perSector: 500, beachIncome: 0.55, defenceCp: 1000, defenceIncome: 2.0 }, // (AI vs AI 2026-11-23: at Gaza’s 2000/600/0.7/800/1.4 the raid took every village by 7–8 min)
    waves: [
      // first light: the assault battalion in the cutters, onto the Casino beach under the breakwater, a company each on the flanks
      { t: 0, units: [
        { unit: 'stormTroops', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'engineers', sector: 1 },
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2 }, { unit: 'stormTroops', sector: 2 },
      ] },
      { t: 150, say: 'The second wave is coming in — and the German demolition parties for the canal', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'mineClear', sector: 2 }, { unit: 'mortar', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(SEED);
    sea.build(scene, terrain);
    const gy = (x: number, z: number) => terrain.heightAt(x, z);
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < m);
    const M = (x: number, y: number, z: number, yaw = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
    const dome = (x: number, y: number, z: number, rad: number, color: number) => props.push('metal', new THREE.SphereGeometry(rad, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(x, y, z), color);
    const taken: number[][] = [];
    const free = (x: number, z: number, rad: number) => taken.every(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) > tr + rad);
    const take = (x: number, z: number, rad: number) => taken.push([x, z, rad]);
    /** A building plot (world) clear of streets, rail, water, points and what is already there. */
    const clear = (x: number, z: number, rad: number) => free(x, z, rad) && roadD(x, z) > rad + 3 && railD(x, z) > rad + 3 && !nearPoint(x, z, rad + 8)
      && lakeIn(x, F * z) < -40 - rad && !(x > CL - 12 - rad && x < CR + 12 + rad) && shoreZ(x) - F * z > 40 + rad;
    const WHITE = 0xece6d8, GREEN = 0x4e8a6a, TIMBER = 0x6a5440;

    // ---- the Suez Canal Company’s building on the quay: the long white front, the three green domes, the arcade below
    {
      const c = L(92, 95);
      props.hall({ x: c.x, z: c.z, yaw: Math.PI / 2, width: 56, depth: 18, height: 12, color: WHITE, roof: 0x8a8678, door: 6, name: 'Suez Canal Company' });
      for (const dz of [-22, 0, 22]) {
        const y = gy(c.x, c.z + dz) + 12.5, rad = dz ? 4.2 : 6;
        props.push('stone', new THREE.CylinderGeometry(rad, rad, 3, 16), M(c.x, y + 1.5, c.z + dz), WHITE);
        dome(c.x, y + 3, c.z + dz, rad + 0.3, GREEN);
      }
      for (let t = -26; t <= 26; t += 4) props.box('stone', c.x - 10.5, gy(c.x - 10.5, c.z + t) + 2.2, c.z + t, 0.7, 4.4, 0.7, 0, WHITE); // (the arcade toward the square)
      props.box('stone', c.x - 10.5, gy(c.x, c.z) + 4.6, c.z, 2.6, 0.5, 56, 0, WHITE);
      take(c.x, c.z, 32);
    }
    // ---- the de Lesseps statue at the root of the western breakwater: the pedestal, the bronze figure pointing to the canal
    {
      const s = L(60, -24), y = MOLE_DECK;
      props.box('stone', s.x, y + 3, s.z, 5, 6, 5, 0, 0xc8c0b0);
      props.box('stone', s.x, y + 6.4, s.z, 3.6, 0.8, 3.6, 0, 0xa8a090);
      props.push('metal', new THREE.CylinderGeometry(0.75, 0.9, 4.6, 10), M(s.x, y + 9.1, s.z), 0x4a5a4a);
      props.push('metal', new THREE.SphereGeometry(0.55, 10, 8), M(s.x, y + 11.9, s.z), 0x4a5a4a);
      props.box('metal', s.x + 0.9, y + 10.6, s.z - 0.6, 2.2, 0.35, 0.35, -0.5, 0x4a5a4a); // (the outstretched arm)
      cover.addBox({ x: s.x, z: s.z, yaw: 0, length: 5, thickness: 5, height: 6 });
    }
    // the breakwaters: the light at the end of each, blocks tumbled along their sea faces
    for (const m of [MOLE_W, MOLE_E]) {
      const cx = (m.x0 + m.x1) / 2, e = L(cx, -(m.out - 8));
      props.box('stone', e.x, MOLE_DECK + 4, e.z, 3.4, 8, 3.4, 0, 0xe8e2d4);
      props.box('plain', e.x, MOLE_DECK + 8.6, e.z, 2.4, 1.4, 2.4, 0, m === MOLE_W ? 0x2a8a3a : 0xb83a2a);
      for (let t = 10; t < m.out - 10; t += 4 + r() * 4) for (const sx of [m.x0 - 0.4, m.x1 + 0.4]) {
        const p = L(sx, -t);
        props.box('stone', p.x, 0.4, p.z, 3 + r(), 3 + r() * 1.5, 3 + r(), r() * 3, 0xa8a294);
      }
    }
    // ---- the lighthouse: the tall octagonal concrete tower by the sea front
    {
      const p = L(-20, 62), g = gy(p.x, p.z);
      props.push('stone', new THREE.CylinderGeometry(2.6, 3.4, 48, 8), M(p.x, g + 24, p.z), 0xe0dccf);
      props.push('metal', new THREE.CylinderGeometry(2.4, 2.4, 4, 8), M(p.x, g + 50, p.z), 0x2a2c2e);
      props.push('metal', new THREE.ConeGeometry(2.8, 2.6, 8), M(p.x, g + 53.3, p.z), 0x7a3428);
      cover.addCylinder({ x: p.x, z: p.z, radius: 3.4, height: 10 });
      take(p.x, p.z, 8);
    }
    // ---- the Casino Palace hotel on the sea front, its pier out over the beach
    {
      const p = L(-95, 82);
      props.hall({ x: p.x, z: p.z, yaw: 0, width: 46, depth: 16, height: 11, color: 0xe6d6b8, roof: 0x8a5a3a, door: 6, name: 'Casino Palace Hotel' });
      take(p.x, p.z, 26);
      for (let t = 0; t < 70; t += 6) { const w = L(-95, 10 - t); props.box('plain', w.x, 1.2, w.z, 3.4, 0.3, 6.2, 0, 0x8a7458); for (const s of [-1.5, 1.5]) props.box('plain', w.x + s, -0.6, w.z, 0.3, 3.6, 0.3, 0, TIMBER); }
    }

    // ---- the European town: two- and three-storey houses with arcades and timber balconies on the street fronts
    props.rand = mulberry32(SEED + 1);
    const arcade = (x: number, z: number, len: number, dir: number, h: number) => { // (dir: the street’s side in world z)
      const fz = z + dir * 2.4, g = gy(x, fz);
      for (let t = -len / 2 + 1; t <= len / 2 - 1; t += 3.2) props.box('plain', x + t, g + h / 2, fz, 0.35, h, 0.35, 0, TIMBER);
      props.box('plain', x, g + h + 0.12, fz, len, 0.24, 2.4, 0, 0x7a6a54);                // the balcony floor over the pavement
      props.box('plain', x, g + h + 0.7, fz + dir * 1.1, len, 0.9, 0.1, 0, 0x5a4a3a);       // its rail
    };
    for (let i = 0; i < ST_X.length - 1; i++) for (let j = 0; j < ST_B.length - 1; j++) {
      const x0 = ST_X[i] + 9, x1 = ST_X[i + 1] - 9;
      for (const [b, dir] of [[ST_B[j] + 15, -1], [ST_B[j + 1] - 15, 1]] as [number, number][]) { // (each block’s two street fronts)
        if (b < 70) continue; // (the sea front: an open esplanade, dug in)
        for (let x = x0 + 6; x < x1 - 4; x += 13) {
          const p = L(x, b);
          if (!clear(p.x, p.z, 5)) continue;
          take(p.x, p.z, 6.5);
          if (x < ARAB_X) { props.flatHouse({ x: p.x, z: p.z, yaw: 0, width: 8 + props.rand() * 3, depth: 8, storeys: props.rand() < 0.4 ? 2 : 1 }); continue; }
          const storeys = props.rand() < 0.45 ? 3 : 2, wd = 11 + props.rand() * 1.5;
          props.flatHouse({ x: p.x, z: p.z, yaw: 0, width: wd, depth: 10, storeys, name: 'arcaded house' });
          arcade(p.x, p.z + dir * 5, wd, dir, 3);
        }
      }
    }
    // ---- the Arab quarter: the mosque and its minaret, close-packed flat roofs
    {
      const m = L(-160, 320);
      if (free(m.x, m.z, 9)) {
        props.flatHouse({ x: m.x, z: m.z, yaw: 0, width: 14, depth: 12, name: 'mosque', dome: true });
        const t = { x: m.x + 9, z: m.z - 6 }, g = gy(t.x, t.z);
        props.push('stone', new THREE.CylinderGeometry(0.9, 1.1, 20, 10), M(t.x, g + 10, t.z), 0xe6dccc);
        props.push('stone', new THREE.CylinderGeometry(1.5, 1.2, 0.6, 10), M(t.x, g + 16, t.z), 0xe6dccc);
        props.push('metal', new THREE.ConeGeometry(1, 3.4, 10), M(t.x, g + 21.7, t.z), 0x8a8a80);
        cover.addCylinder({ x: t.x, z: t.z, radius: 1.1, height: 20 });
        take(m.x, m.z, 12);
      }
    }
    props.rand = mulberry32(SEED + 2);
    for (let i = 0, n = 0; i < 1600 && n < 60; i++) {
      const x = -255 + props.rand() * (ARAB_X + 255 - 6), b = 210 + props.rand() * 250, p = L(x, b);
      if (!clear(p.x, p.z, 4)) continue;
      take(p.x, p.z, 5); n++;
      props.flatHouse({ x: p.x, z: p.z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 6 + props.rand() * 3, depth: 5 + props.rand() * 3, storeys: props.rand() < 0.3 ? 2 : 1 });
    }
    // the churches of the town (St Eugénie’s, the Greek church)
    for (const [x, b] of [[-95, 320], [-25, 400]] as number[][]) { const p = L(x, b); if (free(p.x, p.z, 12)) { props.church({ x: p.x, z: p.z, yaw: 0 }); take(p.x, p.z, 14); } }
    // palms along the sea front and the quay
    props.rand = mulberry32(SEED + 3);
    for (let x = -560; x < 40; x += 16) { const p = L(x + props.rand() * 4, 52); if (!onRoad(p.x, p.z) && !nearPoint(p.x, p.z, 10) && free(p.x, p.z, 3)) props.palm({ x: p.x, z: p.z, height: 8 + props.rand() * 4 }); }
    for (let b = 150; b < 460; b += 18) { const p = L(122, b); if (!nearPoint(p.x, p.z, 10) && free(p.x, p.z, 3)) props.palm({ x: p.x, z: p.z, height: 8 + props.rand() * 4 }); }

    // ---- the railway: rails down the canal bank, the station, wagons; the coal wharves by the bridge
    for (let b = 330; b < 1130; b += 30) { const a = P(96, b), c = P(96, Math.min(1130, b + 30)); props.rails({ x0: a[0], z0: F * a[1], x1: c[0], z1: F * c[1] }); }
    { const p = L(78, 400); props.hall({ x: p.x, z: p.z, yaw: Math.PI / 2, width: 30, depth: 9, height: 6, color: 0xd0c0a0, roof: 0x8a5a3a, door: 3, name: 'Port Said station' }); take(p.x, p.z, 18); }
    for (const b of [520, 535, 550]) { const p = L(96, b); props.wagon({ x: p.x, z: p.z, yaw: 0, kind: b === 550 ? 'open' : 'box', color: 0x5a4030 }); }
    for (let k = 0; k < 7; k++) { // coal heaps on the wharf, a crane over each berth, the sheds behind
      const w = W(74 - (k % 2) * 22, BRIDGE_Z + 70 + k * 26);
      if (!free(w.x, w.z, 8)) continue;
      props.push('plain', new THREE.ConeGeometry(7 + r() * 3, 4 + r() * 2, 10), M(w.x, gy(w.x, w.z) + 2, w.z), 0x26241f);
      cover.addCylinder({ x: w.x, z: w.z, radius: 5, height: 3 });
      take(w.x, w.z, 9);
    }
    for (let k = 0; k < 3; k++) {
      const z = F * (BRIDGE_Z + 90 + k * 60), x = CL - 6, g = gy(x, z);
      props.box('metal', x, g + 6, z, 1.2, 12, 1.2, 0, 0x4a4a46);
      props.box('metal', x + 6, g + 12, z, 14, 0.8, 0.8, 0, 0x4a4a46);
    }
    for (const dz of [0, 50]) { const w = W(10, BRIDGE_Z + 110 + dz); if (free(w.x, w.z, 14)) { props.hall({ x: w.x, z: w.z, yaw: Math.PI / 2, width: 34, depth: 14, height: 7, color: 0x7a5e4a, name: 'coal shed' }); take(w.x, w.z, 20); } }
    // the pontoon bridge: the boats under the deck, the hand rails
    for (let x = CL + 4; x < CR - 2; x += 6.5) { const w = W(x, BRIDGE_Z); props.box('plain', w.x, 0.25, w.z, 5.2, 1.1, 8.6, 0, 0x3a3630); }
    for (const s of [-4.2, 4.2]) { const w = W((CL + CR) / 2, BRIDGE_Z + s); props.box('plain', w.x, 1.9, w.z, CR - CL + 4, 0.12, 0.12, 0, TIMBER); }

    // ---- the RNAS seaplane base on the east bank: the canvas and timber hangars, the slipway, seaplanes on the apron
    {
      for (const b of [200, 250, 300]) { const p = L(CR + 22, b); props.timberHangar({ x: p.x, z: p.z, yaw: -Math.PI / 2 }); take(p.x, p.z, 16); }
      const s = L(CR + 2, 230); props.box('plain', s.x - 2, 0.2, s.z, 14, 0.4, 10, 0, 0x8a7a62); // the slipway into the canal
      for (const [dx, b] of [[50, 215], [52, 260], [48, 305]] as number[][]) {
        const p = L(CR + dx, b), g = gy(p.x, p.z), yaw = -Math.PI / 2;
        props.box('plain', p.x, g + 1.8, p.z, 1.1, 1.1, 9, yaw, 0xc8c0a8);      // the fuselage
        props.box('plain', p.x, g + 2.6, p.z + 0.6, 15, 0.18, 1.8, yaw, 0xd0c8b0); // the wings
        for (const s2 of [-1.4, 1.4]) props.box('plain', p.x + s2, g + 0.4, p.z, 0.7, 0.6, 5, 0, 0x8a8a84); // the floats
        take(p.x, p.z, 9);
      }
      for (let i = 0; i < 4; i++) { const p = L(CR + 130 + (i % 2) * 14, 330 + Math.floor(i / 2) * 12); props.tent({ x: p.x, z: p.z, yaw: 0, color: 0xc8bc9a }); }
    }
    // ---- the coastal batteries: sandbagged emplacements, the gunners’ tents; Raswa camp
    for (const gun of GUNS) {
      const p = L(gun.x, gun.back);
      props.sandbagRing({ x: p.x + 18, z: p.z + 10, radius: 4.5, toward: -1 });
      props.sandbagRing({ x: p.x - 18, z: p.z + 12, radius: 4.5, toward: -1 });
      for (let i = 0; i < 3; i++) props.tent({ x: p.x - 20 + i * 12, z: p.z + 40, yaw: 0.1, color: 0xc0b48e });
      take(p.x, p.z, 34);
    }
    for (let i = 0; i < 9; i++) { const w = W(40 + (i % 3) * 11, RASWA.z + 50 - Math.floor(i / 3) * 11); props.tent({ x: w.x, z: w.z, yaw: 0, color: 0xc4b48e }); }
    commandPost(props, this.bases.nato, -1, 0xb0a07a);
    // ---- the spit toward Gamil: fishermen’s huts on the lake shore, boats drawn up
    for (let i = 0, n = 0; i < 300 && n < 10; i++) {
      const x = -590 + r() * 320, b = 250 + r() * 40, p = L(x, b);
      if (!clear(p.x, p.z, 3) || lakeIn(x, F * p.z) > -12) continue;
      props.flatHouse({ x: p.x, z: p.z, yaw: r() * 0.4, width: 5, depth: 4, storeys: 1, name: 'fisherman’s hut' }); take(p.x, p.z, 5); n++;
    }
    for (let i = 0; i < 10; i++) { const x = -580 + r() * 300, lz = shoreZ(x) - 300 - 18 - r() * 30, g = gy(x, F * lz); if (g > -0.6 && g < 0.4) props.box('plain', x, 0.2, F * lz, 1.8, 0.7, 7, r() * 3, 0x4a3a2a); }
    props.finish();

    // ---- trees: palms and tamarisk in the town’s yards and at Raswa, scrub on the spit and the east bank; reeds round the lake
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: RASWA.x, z: F * RASWA.z, r: 40 },
      { test: (x: number, z: number) => roadD(x, z) < 5 || railD(x, z) < 5 || !free(x, z, 2) || shoreZ(x) - F * z < 32 || lakeIn(x, F * z) > -6 || (x > CL - 8 && x < CR + 8) || duneE(x, shoreZ(x) - F * z) > 0.5 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 900, broadleaf: 1, autumn: 0.05, size: 0.45, maxY: 40, avoid,
      forest: (x: number, z: number) => { const back = shoreZ(x) - F * z; const town = x > TOWN.x0 && x < TOWN.x1 && back > TOWN.b0 && back < TOWN.b1; return town ? 0.12 : back > 460 ? 0.08 + Math.max(0, fbm(noise, x * 0.01 + 20, z * 0.01, 2)) * 0.6 : 0.05; } });
    const reeds = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 700, broadleaf: 1, autumn: 0.2, size: 0.25, maxY: 3,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => roadD(x, z) < 4 || !free(x, z, 1) }],
      forest: (x: number, z: number) => { const li = lakeIn(x, F * z); return li > -35 && li < -4 ? 0.7 : -1; } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.7, fields: this.fields,
      avoid: [{ test: (x: number, z: number) => onRoad(x, z) || shoreZ(x) - F * z < 30 || lakeIn(x, F * z) > 0 || (x > CL - 30 && x < CR + 14) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); reeds.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
