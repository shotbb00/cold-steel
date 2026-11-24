// Taranto, a summer dawn in 1918 (coastal, the 1918 epoch: Austria-Hungary and Germany land, Italy and Britain hold;
// 1.0 × 1.8 km). A raid that was never made. Taranto was the Regia Marina’s main southern base, where the battle fleet
// lay out of reach of the k.u.k. Flotte at Pola and Cattaro; the drifters, destroyers and motor launches of the
// Otranto Barrage (Italian, British, French) worked from here and from Brindisi, and the British Adriatic Squadron
// kept its depot ships in the Mar Piccolo. Horthy’s raid on the Barrage (May 1917) and the U-boats coming out of
// Cattaro were as close as the Central Powers came. Here they come all the way: a k.u.k. landing force with a German
// naval storm detachment, brought in by destroyers and launches under the guns of the light cruisers, to wreck the
// arsenal and the swing bridge and shut the harbour — the Otranto Barrage’s home — for the rest of the war.
// On the map, from the sea looking inland (the sea toward −z): the outer roadstead with San Pietro and San Paolo, the
// Cheradi islands, across the approach (a coastal battery on San Paolo); the Mar Grande, the outer harbour, between
// Punta Rondinella (west, a battery on the headland, a beach under it) and Capo San Vito (east, a lighthouse, a
// battery, a beach). At the head of the Mar Grande the Città Vecchia on its island: the Aragonese castle at the
// harbour end of the navigable channel, the Duomo of San Cataldo, the lanes and a little marina where boats can
// beach. The channel joins the Mar Grande to the Mar Piccolo, the inner harbour; the Ponte Girevole (1887) swings
// across it to the Borgo, the new town on its low cliff, with the Arsenale and its docks on the Mar Piccolo shore.
// At the other end of the island the Ponte di Pietra to Porta Napoli and the station. The Mar Piccolo fills the
// middle of the map; the roads run round it west and east; north of it the seaplane station (Idroscalo) on the shore
// and, inland, the Murge’s first terrace: olive groves, dry stone walls, white masserie and trulli.
// How it plays: three sectors — Rondinella beach (opens Porta Napoli), the old town’s marina (opens the Ponte
// Girevole, across the channel), Capo San Vito (opens the Arsenale). The island has only its two bridges; the Borgo’s
// cliff over the Mar Grande is too steep for wheels. The Italian reserve (and a British naval party from the depot
// ships) comes round the Mar Piccolo from the north.
// Written in world coordinates with the sea on the lander’s side (−z), as `pact` lands (wcampaign/battle.js landerOf;
// a campaign landing by the Entente is the map turned round, flipLanding).
// A scenario, not a fair battle (MAP_BRIEF_SEA_COAST.md): balanced with AI-vs-AI runs so the landing wins late or the
// defence just holds.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 520, z: 920 };
const SEED = 1918_0612;
const noise = createNoise2D(SEED);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e6a86 }); // (the Ionian at dawn: deep blue, green over the shoals)

/** The outer coast and the Mar Grande (land is +z of it): the coast at −230, the Mar Grande cut 260 m in between the headlands. */
const shoreZ = (x: number) => {
  const head = smoothstep(285, 195, Math.abs(x));
  return -230 + 260 * head + fbm(noise, x * 0.006, 3.3, 2) * (7 - 5 * head);
};
/** The Mar Piccolo, the inner harbour: a rounded box (signed distance, < 0 in the water). */
const MP = { x: 20, z: 290, hx: 310, hz: 120, r: 70 };
const mpD = (x: number, z: number) => {
  const qx = Math.abs(x - MP.x) - MP.hx + MP.r, qz = Math.abs(z - MP.z) - MP.hz + MP.r;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - MP.r;
};
/** The navigable channel (Canale Navigabile) and the shallow one at Porta Napoli, between the Città Vecchia and the mainland. */
const NAV = { x0: 25, x1: 65 };
const PN = { x0: -185, x1: -165 };
const BRIDGE = { z0: 93, z1: 107 }; // (both bridges: the Ponte Girevole over NAV, the Ponte di Pietra over PN)
const inChannel = (c: { x0: number; x1: number }, x: number, z: number) => x > c.x0 && x < c.x1 && z > 0 && z < 185;
const onBridge = (x: number, z: number) => z >= BRIDGE.z0 && z <= BRIDGE.z1 && (inChannel(NAV, x, z) || inChannel(PN, x, z));
/** The Città Vecchia’s island and the Borgo (the new town). */
const inOld = (x: number, z: number) => x > PN.x1 && x < NAV.x0 && z > shoreZ(x) && mpD(x, z) > 0;
const inBorgo = (x: number, z: number) => x > NAV.x1 + 4 && x < 340 && z > shoreZ(x) + 14 && z < 175 && mpD(x, z) > 10;
/** The Cheradi islands: San Pietro (big, low) and San Paolo (small, the battery). */
const ISLANDS = [{ x: -240, z: -450, rx: 70, rz: 38, top: 6 }, { x: 150, z: -330, rx: 30, rz: 20, top: 5 }];

/** The roads: round the Mar Piccolo from the north (west and east), through Porta Napoli, over the island, the Borgo’s Corso to San Vito. */
const MAIN = [[-330, 200], [-280, 110], [-200, 100], [-100, 100], [45, 100], [100, 100], [200, 92], [330, 60], [375, -60], [370, -175]];
const ROADS = [
  MAIN,
  [[-30, 840], [-200, 680], [-400, 520], [-430, 330], [-330, 200]],          // the road from Statte and Massafra, west round the Mar Piccolo
  [[30, 840], [220, 660], [410, 500], [420, 300], [360, 150], [330, 60]],     // the road from San Giorgio, east round it
  [[360, 150], [240, 130], [150, 120]],                                       // into the Arsenale
  [[-330, 200], [-370, 40], [-395, -160]],                                    // down to the beach under Rondinella
  [[-70, 100], [-70, 30]],                                                    // the old town’s steps down to its marina
  [[-30, 840], [-60, 560], [-120, 440]],                                      // the lane to the Idroscalo on the north shore
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.4;

/** How high the land stands back from the sea: the Murge’s first terrace inland, the Borgo on its cliff, the island’s rock. */
function plain(x: number, z: number) {
  let h = 6 + 30 * smoothstep(470, 900, z) + fbm(noise, x * 0.004, z * 0.004, 3) * 2;
  h += (12 - h) * smoothstep(52, 66, x) * smoothstep(360, 320, x) * smoothstep(240, 200, z); // the Borgo’s plateau
  if (inOld(x, z)) h = 10 + 2 * Math.exp(-(((x + 60) / 60) ** 2) - (((z - 125) / 30) ** 2)); // the island’s rock, the Duomo on its crown
  return h;
}
/** How far the land takes to climb from the water: long and gentle on the beaches, short at the old town’s marina, a cliff under the Borgo. */
const ramp = (x: number) => 26 + 54 * smoothstep(255, 310, Math.abs(x)) - 10 * smoothstep(60, 80, x) * smoothstep(205, 185, x) + 14 * smoothstep(-175, -160, x) * smoothstep(30, 15, x);

function groundRaw(x: number, z: number) {
  const back = z - shoreZ(x);
  let h: number;
  if (back < 0) { // the sea: the sand shelving off the beaches, the Mar Grande deep (the battle fleet’s anchorage)
    const d = -back;
    h = Math.max(-0.4 - d * 0.05 - Math.max(0, d - 40) * 0.07, -18) + fbm(noise, x * 0.01, z * 0.01, 2) * 0.4;
    for (const i of ISLANDS) {
      const e = Math.hypot((x - i.x) / i.rx, (z - i.z) / i.rz);
      h = Math.max(h, -4 + (i.top + 4) * smoothstep(1.2, 0.55, e) + fbm(noise, x * 0.03, z * 0.03, 2) * 0.6 * smoothstep(1, 0.6, e));
    }
    return h;
  }
  const p = plain(x, z);
  h = 0.4 + (p - 0.4) * smoothstep(0, ramp(x), back);
  const mp = mpD(x, z);
  if (mp < 0) return Math.max(-1 + mp * 0.25, -13);                           // the Mar Piccolo (its first basin 13 m deep: the depot ships’ moorings)
  h = Math.min(h, 1.6 + mp * (inBorgo(x, z) || inOld(x, z) ? 0.6 : 0.25)); // its shores: quays in the town, reeds and mud outside
  if (onBridge(x, z)) { const t = smoothstep(NAV.x0 - 2, NAV.x1 + 6, x); return inChannel(NAV, x, z) ? 9.6 + 2.4 * t : 8.6; }
  if (inChannel(NAV, x, z)) return -9;                                          // the channel: dredged for the battleships
  if (inChannel(PN, x, z)) return -3;
  return h;
}
const height = gridCacheSmooth(groundRaw, EXT, 2);

/** The landing sectors (x) and what each opens inland. */
export const SECTORS = [
  { x: -390, name: 'Rondinella', inland: { x: -280, z: 112 } },
  { x: -70, name: 'Città Vecchia', inland: { x: 100, z: 100 } },
  { x: 370, name: 'Capo San Vito', inland: { x: 240, z: 132 } },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'The k.u.k. squadron', x: 0, z: -780, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Rondinella beach', x: -390, z: shoreZ(-390) + 26, owner: null, sector: 'west', radius: 45, opens: 'E' } as any,
  { id: 'C', name: 'Città Vecchia', x: -70, z: shoreZ(-70) + 26, owner: null, sector: 'centre', radius: 30, opens: 'F' } as any,
  { id: 'D', name: 'Capo San Vito', x: 370, z: shoreZ(370) + 30, owner: null, sector: 'east', radius: 45, opens: 'G' } as any,
  { id: 'E', name: 'Porta Napoli', ...SECTORS[0].inland, owner: null, sector: 'west' },
  { id: 'F', name: 'Ponte Girevole', ...SECTORS[1].inland, owner: null, sector: 'centre', radius: 32 },
  { id: 'G', name: 'Arsenale', ...SECTORS[2].inland, owner: null, sector: 'east' },
  { id: 'K', name: 'Statte road', x: 0, z: 690, owner: 'nato', sector: 'centre' },
];
const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < m);
const S = (x: number, back: number) => ({ x, z: shoreZ(x) + back }); // (a spot `back` m inland of the shore)
const CASTLE = { x: 2, z: 62 };
const SAN_VITO = { x: 455, z: shoreZ(455) + 40 };

export default {
  id: 'taranto',
  name: 'Taranto',
  description: 'Taranto, 1918, as it might have been: an Austro-Hungarian and German raid on the Regia Marina’s southern base and the home of the Otranto Barrage — the Mar Grande behind the Cheradi islands, the Città Vecchia on its island with the Aragonese castle, the Ponte Girevole over the channel to the Mar Piccolo, the Borgo and its arsenal, olive groves, masserie and trulli inland.',
  epochs: ['1918'],
  region: 'italy',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  armies: { nato: ['it', 'uk'], pact: ['ah', 'de'] }, // (the Taranto garrison and the British naval parties of the Adriatic Squadron; a k.u.k. landing force with a German naval storm detachment)
  airfields: [], // (systems/Airfields.js: the Idroscalo’s seaplanes fly off the Mar Piccolo — no runway on this ground)
  conditions: { time: 'dawn', weather: 'clear' },
  wind: { from: 200, speed: 3, veer: 0.1 }, // (a light southerly off the gulf)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.5, // (the Borgo’s cliff over the Mar Grande: men only)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: SEED,
  height,
  river: sea,
  fields: createFields({ seed: SEED, cell: 70, weights: [0.45, 0.1, 0.2, 0.25] as any }),

  theme: {
    // a clear June dawn over the Ionian: the sun coming up behind the Murge, pale limestone and red earth
    fogColor: 0xd8d0c0, fogDensity: 0.0005, skyTop: 0x5a86b8, skyHorizon: 0xeedcc0, skyBottom: 0xb0a890,
    sunColor: 0xffe2bc, sunIntensity: 1.9, sunDisk: 0.7, clouds: 0.12, cloudLight: 0xfaf0e4, cloudDark: 0xc4bcb0,
    sunDir: [0.78, 0.35, -0.42], // (the sun up over Capo San Vito: the lander’s right, the town’s seaward faces lit)
    hemiSky: 0xd0dae6, hemiGround: 0x8e7a5a, hemiIntensity: 1.2, rimColor: 0xf2e0c4, rimIntensity: 0.3,
    terrain: {
      grass: '#8c8a58', grassAlt: '#7e8050', dryGrass: '#b4a470', dirt: '#9a6a46', rock: '#b4aa92',
      pasture: '#8a8a58', ploughed: '#8e5a3c', stubble: '#c0aa76', meadow: '#86884e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const back = z - shoreZ(x);
        if (y < 0.2 || inChannel(NAV, x, z) && !onBridge(x, z)) return [y > -1.5 ? 0xc8bc98 : 0x3e6a78, 1];           // under the water
        if (onBridge(x, z)) return [inChannel(NAV, x, z) ? 0x5a5550 : 0xb0a890, 1];                                      // the swing bridge’s iron deck, the stone bridge
        if (onRoad(x, z)) return [inOld(x, z) || inBorgo(x, z) ? 0xb4ac98 : 0xc0a47a, 0.9];                             // the streets’ paving, the white dust roads
        if (inOld(x, z)) return [0xb8ae98, 0.85];                                                                         // the old town’s lanes and courtyards
        if (inBorgo(x, z)) return [0xb0a892, 0.75];                                                                       // the Borgo’s streets
        if (back < 24 && Math.abs(x) > 280) return [0xdccca0, 1];                                                         // the beaches’ sand
        if (back < 30) return [0xb4aa92, 0.95];                                                                           // the rocks along the harbour
        if (mpD(x, z) < 12) return [0x7a7450, 0.8];                                                                      // the Mar Piccolo’s mud and reeds
        const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (g > 0.4) return [0xc2b89e, Math.min(0.9, (g - 0.4) * 3)];                                                    // bare limestone where it is steep
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 840, entries: [-400, 0, 400] }, pact: { x: 0, z: -880, entries: SECTORS.map((s) => s.x) } }, // (the Central Powers land: their ways in are the sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 140 }, pact: { x: 0, z: -560 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact', // (wcampaign/battle.js landerOf)
    // the k.u.k. army has no landing boats of its own (data/units1918/ships.js): the side’s motor launches and ferries stand in
    // for the destroyers’ boats and the requisitioned Lloyd steamers that would have brought the landing force
    craft: { infantry: ['ml', 'ml', 'ferry'], vehicle: 'ferry' },
    launchZ: 820,
    signal: { t: 15, say: 'The boats are away — in past San Paolo before the batteries wake up', sayOther: 'Boats in the Mar Grande! Austrians landing — stand to!' },
    // what the landing may call in at sea: the Tátra destroyers inshore, the Novara-class scouts (both armies field them: armyHas)
    navy: ['destroyer', 'lightCruiser'],
    // the harbour’s guns: the batteries on San Paolo, Punta Rondinella and Capo San Vito (ships only), field guns round the Mar Piccolo
    forts: [
      { unit: 'coastBattery', name: 'Batteria San Paolo', x: ISLANDS[1].x, z: ISLANDS[1].z + 4, facing: Math.PI },
      { unit: 'coastBattery', name: 'Batteria Rondinella', x: -335, z: -150, facing: Math.PI },
      { unit: 'coastBattery', name: 'Batteria San Vito', x: SAN_VITO.x - 10, z: SAN_VITO.z + 30, facing: Math.PI },
      { unit: 'artillery', x: -420, z: 260, facing: Math.PI },
      { unit: 'artillery', x: 430, z: 240, facing: Math.PI },
    ],
    names: { coastBattery: 'Batteria costiera' },
    // wire along the beaches (gaps at the roads), trenches and Maxims over them, the old town’s marina barred, MGs in the castle
    works: [
      ...Array.from({ length: 22 }, (_, i) => -490 + i * 10).filter((x) => Math.abs(x + 393) > 14).map((x) => ({ kind: 'wire', ...S(x, 30), yaw: 0 })),
      ...Array.from({ length: 22 }, (_, i) => 280 + i * 10).filter((x) => Math.abs(x - 370) > 14).map((x) => ({ kind: 'wire', ...S(x, 30), yaw: 0 })),
      ...[-130, -110, -90, -50, -30].map((x) => ({ kind: 'wire', ...S(x, 12), yaw: 0 })),
      ...[-440, -390, -340].map((x) => ({ kind: 'trench', ...S(x, 70), yaw: 0 })),
      ...[320, 370, 420].map((x) => ({ kind: 'trench', ...S(x, 75), yaw: 0 })),
      ...[-415, -365, 345, 395].map((x) => ({ kind: 'mgNest', ...S(x, 62), yaw: 0 })),
      { kind: 'mgNest', x: -120, z: shoreZ(-120) + 40, yaw: 0 }, { kind: 'mgNest', x: -15, z: shoreZ(-15) + 42, yaw: 0 },
      { kind: 'mgNest', x: 85, z: 112, yaw: 0 }, { kind: 'mgNest', x: -265, z: 128, yaw: 0 }, { kind: 'mgNest', x: 255, z: 115, yaw: 0 },
    ],
    // the garrison at dawn: the depot battalions, the Regia Marina’s sailors on the quays, MG sections, a mountain battery
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar', 'rifles', 'artillery'],
    hold: [...[-415, -365, 345, 395].map((x) => S(x, 68)), S(-120, 46), S(-15, 46), { x: 85, z: 108 }, ...SECTORS.map((s) => s.inland)],
    // the reserve round the Mar Piccolo: the Bersaglieri from the barracks, the Royal Navy’s parties off the depot ships, armoured cars
    counter: { t: 420, units: ['rifles', 'mgTeam', 'reconVehicle', 'rifles', 'stormTroops', 'rifles'], say: 'The reserve is coming round the Mar Piccolo — Bersaglieri, Arditi and the armoured cars, to throw them back into the sea', sayOther: 'Italian reserves coming round the Mar Piccolo from the north!' },
    ai: { order: ['rifles', 'stormTroops', 'mgTeam', 'rifles', 'engineers', 'mortar', 'rifles', 'stormTroops', 'mgTeam', 'rifles', 'mountainGun', 'rifles'], gunship: 'destroyer', gunships: 1, heavy: 'lightCruiser', inshore: 400 },
    economy: { reserves: 3000, perSector: 800, beachIncome: 1.6, defenceCp: 700, defenceIncome: 1.0 }, // (AI vs AI 2026-11-24, with the counter at 7 min and the third wave: the landing won at 28:38 once, the garrison just held once with two villages of three lost for minutes; at 2600/1.4 and the counter at 5 min it held easily)
    waves: [
      // dawn: storm troops into the old town’s marina under the castle, a company onto each beach
      { t: 0, units: [
        { unit: 'stormTroops', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 },
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 },
      ] },
      { t: 150, say: 'The steamers are in the Mar Grande: the second wave and the German storm detachment', units: [{ unit: 'rifles', sector: 0 }, { unit: 'stormTroops', sector: 1 }, { unit: 'rifles', sector: 2 }] },
      { t: 330, say: 'A mountain battery is coming ashore, and the storm troops for the Arsenale', units: [{ unit: 'mountainGun', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'stormTroops', sector: 2 }, { unit: 'rifles', sector: 2 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(SEED);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const STONE = 0xd2c6a8, TUFO = 0xc8b48c, ROOF = 0x9a5a3a, SLATE = 0x5a5856, IRON = 0x4e4a46;
    const taken: number[][] = [];
    const free = (x: number, z: number, rad: number) => taken.every(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) > tr + rad);
    const take = (x: number, z: number, rad: number) => taken.push([x, z, rad]);
    const water = (x: number, z: number, pad: number) => z < shoreZ(x) + pad || mpD(x, z) < pad || inChannel(NAV, x, z) || inChannel(PN, x, z) || [NAV, PN].some((c) => x > c.x0 - pad && x < c.x1 + pad && z < 185);
    const clear = (x: number, z: number, rad: number) => free(x, z, rad) && !nearPoint(x, z, rad + 22) && roadD(x, z) > rad + 4 && !water(x, z, rad + 3);

    // ---- the Castello Aragonese at the harbour end of the channel: curtain walls and the four great round towers
    {
      const { x: cx, z: cz } = CASTLE;
      for (const [dx, dz, len, yaw] of [[0, -18, 36, 0], [0, 18, 36, 0], [-11, 0, 36, Math.PI / 2]] as number[][]) {
        props.box('stone', cx + dx, g(cx + dx, cz + dz) + 5, cz + dz, len, 10, 3, yaw, TUFO);
        cover.addBox({ x: cx + dx, z: cz + dz, yaw, length: len, thickness: 3, height: 10 });
      }
      for (const [dx, dz] of [[-12, -18], [12, -18], [-12, 18], [12, 18]]) props.column({ x: cx + dx, z: cz + dz, radius: 5.5, height: 13 });
      take(cx, cz, 26);
    }
    // ---- the Ponte Girevole: the iron swing bridge’s girders, its pivot pier; the stone Ponte di Pietra’s parapets
    for (const z of [BRIDGE.z0 + 0.3, BRIDGE.z1 - 0.3]) {
      const x = (NAV.x0 + NAV.x1) / 2;
      props.box('metal', x, g(x, z) + 1.6, z, NAV.x1 - NAV.x0 + 4, 3, 0.4, 0, IRON);
      props.box('stone', (PN.x0 + PN.x1) / 2, g((PN.x0 + PN.x1) / 2, z) + 0.5, z, PN.x1 - PN.x0 + 4, 1, 0.5, 0, STONE);
    }
    props.box('metal', (NAV.x0 + NAV.x1) / 2, g(45, 100) + 4, 100, 3, 3, BRIDGE.z1 - BRIDGE.z0, 0, IRON); // (the machinery house over the pivot)
    // the channel’s quay lamps and bollards
    for (let z = 30; z < 175; z += 22) if (z < BRIDGE.z0 - 6 || z > BRIDGE.z1 + 6) for (const x of [NAV.x0 - 2, NAV.x1 + 2]) props.column({ x, z, radius: 0.35, height: 0.8 });

    // ---- the Città Vecchia: San Cataldo’s Duomo on the crown of the island, tall houses packed along the lanes
    props.church({ x: -60, z: 128, yaw: 0 });
    take(-60, 128, 18);
    for (let i = 0, n = 0; i < 4000 && n < 120; i++) {
      const x = PN.x1 + 6 + r() * (NAV.x0 - PN.x1 - 12), z = shoreZ(x) + 30 + r() * 130;
      if (!inOld(x, z) || !clear(x, z, 5) || Math.abs(z - 100) < 9 || Math.abs(x + 70) < 6) continue;
      props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2, width: 7 + r() * 3, depth: 8 + r() * 3, storeys: 2 + Math.floor(r() * 3), damaged: 0 });
      take(x, z, 6); n++;
    }
    // the marina: fishing boats drawn up on the shingle, the nets’ posts
    for (const x of [-150, -138, -20, -8]) props.box('plain', x, g(x, shoreZ(x) + 4) + 0.4, shoreZ(x) + 4, 1.6, 0.8, 6, 0.1, 0x5a4a3a);

    // ---- the Borgo: the grid of the new town on its cliff, the Lungomare along the top, the Arsenale on the Mar Piccolo shore
    for (let x = 90; x <= 320; x += 34) for (let z = 50; z <= 160; z += 30) {
      if (!inBorgo(x, z) || !clear(x, z, 12) || (x > 170 && z > 110)) continue;
      for (const [dx, dz] of [[-7, -6], [7, -6], [-7, 6], [7, 6]]) props.townHouse({ x: x + dx, z: z + dz, yaw: 0, width: 12, depth: 10, storeys: 3 + (r() < 0.3 ? 1 : 0), damaged: 0 });
      take(x, z, 15);
    }
    for (const [x, z, w] of [[195, 158, 40], [290, 158, 46]] as number[][]) {
      props.hall({ x, z, yaw: 0, width: w, depth: 20, height: 12, color: 0xb8a684, roof: SLATE, door: 8, name: 'Arsenale' });
      take(x, z, w / 2 + 2);
    }
    props.hall({ x: 300, z: 108, yaw: 0, width: 36, depth: 18, height: 9, color: 0xc0ae8c, roof: ROOF, door: 6, name: 'Officine' });
    take(300, 108, 20);
    { const x = 175, z = 128, y = g(x, z); props.box('stone', x, y + 11, z, 3, 22, 3, 0, 0x8a5a44); cover.addCylinder({ x, z, radius: 2, height: 22 }); take(x, z, 4); } // (the foundry’s chimney)
    const crane = (x: number, z: number) => {
      const y = g(x, z);
      for (const [ax, az] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) props.box('metal', x + ax, y + 4, z + az, 0.5, 8, 0.5, 0, IRON);
      props.box('metal', x, y + 8.3, z, 5, 0.6, 5, 0, IRON);
      props.box('metal', x, y + 13.5, z + 6, 0.7, 0.7, 14, 0, IRON); // (the jib out over the Mar Piccolo)
      cover.addCylinder({ x, z, radius: 1.2, height: 10 });
      take(x, z, 5);
    };
    for (const x of [160, 240, 330]) crane(x, 172);

    // ---- Porta Napoli: the station, its sidings, the line away west
    props.hall({ x: -300, z: 150, yaw: 0.2, width: 56, depth: 16, height: 9, color: 0xd2bc98, roof: SLATE, door: 8, name: 'Stazione di Taranto' });
    take(-300, 150, 30);
    props.rails({ x0: -250, z0: 165, x1: -360, z1: 190 });
    props.rails({ x0: -360, z0: 190, x1: -500, z1: 260 });
    props.wagon({ x: -330, z: 177, yaw: Math.atan2(-110, 25), kind: 'box' });
    for (let i = 0, n = 0; i < 600 && n < 26; i++) {
      const x = -330 + r() * 140, z = 40 + r() * 120;
      if (!clear(x, z, 6) || inOld(x, z)) continue;
      props.townHouse({ x, z, yaw: (r() - 0.5) * 0.3, width: 8 + r() * 3, depth: 8 + r() * 3, storeys: 2 + Math.floor(r() * 2), damaged: 0 }); take(x, z, 7); n++;
    }

    // ---- the batteries: sandbags round the guns on the headlands; Capo San Vito’s lighthouse
    for (const [x, z] of [[-335, -150], [SAN_VITO.x - 10, SAN_VITO.z + 30]]) {
      props.sandbagRing({ x: x + 14, z: z + 6, radius: 4.5, toward: -1 });
      props.sandbagRing({ x: x - 14, z: z + 6, radius: 4.5, toward: -1 });
      take(x, z, 18);
    }
    props.column({ x: SAN_VITO.x + 10, z: SAN_VITO.z - 12, radius: 2.4, height: 18 });
    props.box('stone', SAN_VITO.x + 10, g(SAN_VITO.x + 10, SAN_VITO.z - 12) + 19, SAN_VITO.z - 12, 3.6, 2.4, 3.6, 0, 0x6a6a64);
    props.flatHouse({ x: SAN_VITO.x + 22, z: SAN_VITO.z - 4, yaw: 0, width: 8, depth: 6, name: 'lighthouse keeper’s house' });
    take(SAN_VITO.x + 14, SAN_VITO.z - 10, 14);
    // San Paolo’s battery and San Pietro’s fishermen’s huts
    props.sandbagRing({ x: ISLANDS[1].x - 10, z: ISLANDS[1].z + 2, radius: 4, toward: -1 });
    for (const dx of [-30, 0, 25]) props.flatHouse({ x: ISLANDS[0].x + dx, z: ISLANDS[0].z + 6, yaw: 0.1, width: 6, depth: 5, name: 'hut' });

    // ---- the Idroscalo on the Mar Piccolo’s north shore: the seaplane hangars and their slipway
    for (const x of [-150, -110]) { props.timberHangar({ x, z: 448, yaw: Math.PI }); take(x, 448, 18); }
    props.box('stone', -130, 0.4, 418, 14, 0.6, 22, 0, 0xa8a090);

    // ---- the country: white masserie with their trulli, the dry stone walls round the olive groves
    const MASSERIE = [[-380, 620], [260, 560], [-200, 500], [120, 760], [-420, 780], [380, 760], [-330, -40], [430, 40]];
    for (const [mx, mz] of MASSERIE) {
      if (!clear(mx, mz, 14)) continue;
      props.flatHouse({ x: mx, z: mz, yaw: r() * 0.3, width: 14, depth: 9, storeys: 2, name: 'masseria' });
      for (let k = 0; k < 4; k++) {
        const x = mx + (r() - 0.5) * 50, z = mz + (r() - 0.5) * 40;
        if (clear(x, z, 4) && Math.hypot(x - mx, z - mz) > 12) { props.flatHouse({ x, z, yaw: 0, width: 4.5, depth: 4.5, name: 'trullo', dome: true }); take(x, z, 4); }
      }
      take(mx, mz, 14);
    }
    for (let i = 0; i < 420; i++) {
      const x = (r() * 2 - 1) * 490, z = -150 + r() * 1030;
      if (!clear(x, z, 4) || inBorgo(x, z) || inOld(x, z) || (x > -340 && x < -230 && z < 170) || Math.hypot(x, z - 840) < 40) continue;
      props.lowWall({ x, z, yaw: r() < 0.5 ? 0.05 : Math.PI / 2 + 0.05, length: 8 + r() * 12, height: 1.0, color: 0xc8bea6 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6c4e);
    props.finish();

    // trees: olives in their groves inland, Aleppo pines along the coast and on the islands
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { x: 0, z: 840, r: 36 },
      { test: (x: number, z: number) => onRoad(x, z) || inOld(x, z) || inBorgo(x, z) || water(x, z, 6) || !free(x, z, 2) || (x > -340 && x < -230 && z > 30 && z < 170) }];
    const olives = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, avoid, count: 1600, broadleaf: 1, autumn: 0.05, maxY: 80, size: 0.45,
      forest: (x: number, z: number) => (z > 200 ? 0.5 + Math.max(0, fbm(noise, x * 0.006 + 4, z * 0.006, 2)) * 0.5 : 0.15) });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, avoid, count: 500, broadleaf: 0.1, autumn: 0, maxY: 80, size: 0.7,
      forest: (x: number, z: number) => (z - shoreZ(x) < 140 || z < -300 ? 0.45 : 0.04) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [{ test: (x: number, z: number) => onRoad(x, z) || inOld(x, z) || inBorgo(x, z) || water(x, z, 4) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { olives.update(dt, t); pines.update(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
