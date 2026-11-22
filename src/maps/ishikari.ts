// Ishikari Bay, Hokkaido, September 1985 (coastal: the Soviets land, the US holds; 1.0 × 1.8 km). The landing that
// Tokyo’s and Washington’s planners feared most: the Far East Military District’s naval infantry and a motor rifle
// division put ashore on Hokkaido itself, on the long sand beaches of Ishikari Bay twenty kilometres north of Sapporo
// — the land battle that follows is maps/hokkaido.ts. Out at sea the Pacific Fleet’s landing ships and the mine
// barrier off the bay; then the wide grey-gold beach of the Sea of Japan, the low dune belt behind it and the black
// pines planted on the old dunes against the winter wind. In the west Otaru at the bay’s end: its harbour between the
// long breakwaters, the stone warehouses on the canal, the Maizuru ferry at the quay, the town climbing its wooded
// hills; under them Zenibako, a fishing village with its herring mansion. In the middle Tarukawa: the beach, the
// pines, and behind the coast road the rice paddies of the Ishikari plain, gold and still wet before the harvest, a
// farm village with its shrine. In the east the mouth of the Ishikari itself, Hokkaido’s great river, deep and wide
// at the sea, and Ishikari town on its west bank with the red-and-white lighthouse on the spit and the salmon sheds
// along the water. Inland, at the end of the roads, Hanakawa — the US ground, the way to Sapporo.
// (Compressed: Otaru to the Ishikari’s mouth is 20 km; here 900 m. The real bay curves from south-west to north-east,
// here straight across the map.)
// Laid out like Scheveningen (maps/scheveningen.ts) in a frame with the sea toward +z (`L`), then turned round: the
// Soviets’ side is -z, so the sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
// The Ishikari is the sea’s own water in a carved channel (like Scheveningen’s Nieuwe Waterweg), too deep to wade
// anywhere: no crossing on the map.
// Balance (a scenario, not a mirror): the Otaru hills give the west sector’s defenders high ground and the paddies
// slow the counter-attack’s tanks, so the landing is a little richer than Hohwacht’s and the counter-attack, as at
// Scheveningen, later and smaller (AI against AI, 2026-11-22).
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_95);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5866 }); // (the Sea of Japan off Hokkaido: cold grey-blue)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The waterline (local z): the bay’s shore, a gentle curve a little over a hundred and fifty metres from the middle. */
const shoreZ = (x: number) => 165 + fbm(noise, x * 0.003, 4.7, 2) * 10 - (x / 500) ** 2 * 12;
/** The Otaru hills (west): 0 east of Zenibako, 1 under Otaru. */
const hillK = (x: number) => smoothstep(-330, -480, x);
/** Otaru harbour: the basin between the breakwaters (x), how far it reaches inland. */
const HARBOUR = { x0: -488, x1: -428, back: 70 };
/** The Ishikari’s mouth (east): the channel running inland at the map’s edge. */
const CHANNEL = { x: 478, half: 40 };
const chanK = (x: number) => smoothstep(CHANNEL.half + 14, CHANNEL.half, Math.abs(x - CHANNEL.x));
/** The breakwaters (x, how far out past the waterline): Otaru’s north breakwater and its partner, the Ishikari’s training wall. */
const MOLES = [{ x: -494, out: 280 }, { x: -422, out: 190 }, { x: CHANNEL.x - CHANNEL.half - 3, out: 120 }];
const onMole = (x: number, d: number) => MOLES.some((m) => Math.abs(x - m.x) < 4.5 && d > -20 && d < m.out);
/** The roads up from the beaches (x at local z): Zenibako, Tarukawa, Ishikari along the river. */
const zeniX = (z: number) => -300 + Math.sin(z * 0.012) * 10;
const taruX = (z: number) => 20 + Math.sin(z * 0.009) * 18;
const ishiX = (z: number) => 335 + Math.sin(z * 0.01) * 10;
/** The coast road (Route 231) behind the pines (how far back of the waterline). */
const COAST = 285;
/** The paddies begin this far back of the waterline. */
const PADDY = 310;

/** The dunes’ hummocks and the hills’ folds (0 ± 1): sampled once onto a grid, read between the samples. */
const duneN = gridCacheSmooth((x: number, z: number) => fbm(noise, x * 0.011 + 3, z * 0.011, 3), { x: 1000, z: 1000 }, 4);
const hillN = gridCacheSmooth((x: number, z: number) => ridged(noise, x * 0.006 + 11, z * 0.006, 3), { x: 1000, z: 1000 }, 6);

/** The places: Zenibako, Tarukawa, Ishikari, Hanakawa (local frame), Otaru on its hills. */
const TOWNS = [{ x: -310, z: -80, r: 95 }, { x: 30, z: -260, r: 70 }, { x: 360, z: -80, r: 95 }, { x: 40, z: -640, r: 130 }, { x: -440, z: -40, r: 120 }];
const inTown = (x: number, z: number) => TOWNS.some((t) => Math.hypot(x - t.x, (z - t.z) * 1.2) < t.r);

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  let h: number;
  if (d > 0) { // the bottom: a long shelf with sandbars, shelving away (the landing ships’ water a couple of hundred metres out)
    h = Math.max(0.6 - d * 0.014 - Math.max(0, d - 140) * 0.045 + Math.sin(d * 0.06 + x * 0.003) * 0.3 * smoothstep(20, 60, d) * smoothstep(140, 100, d), -18);
  } else {
    const back = -d; // m inland of the waterline
    const n = duneN(x, z);
    // the beach (55 m of sand), the dune belt and the pines on the old dunes (50–260 m back), the paddies at two metres
    const beach = 0.6 + Math.min(back, 55) * 0.035;
    const base = back < 55 ? beach : Math.max(1.8 + n * 0.25, beach - (back - 55) * 0.01);
    const env = smoothstep(45, 80, back) * smoothstep(260, 180, back);
    const gap = 1 - 0.85 * Math.max(Math.exp(-(((x - zeniX(z)) / 16) ** 2)), Math.exp(-(((x - taruX(z)) / 16) ** 2)), Math.exp(-(((x - ishiX(z)) / 18) ** 2)));
    h = base + env * (5 + n * 4.5) * gap * (1 - 0.5 * smoothstep(300, 400, x)); // (lower on Ishikari’s spit)
    // the paddies: levelled in terraces a hand high, out of the hills and the towns
    const pk = smoothstep(PADDY - 20, PADDY + 10, back) * (1 - hillK(x)) * (inTown(x, z) ? 0.6 : 1);
    if (pk > 0) h += (1.9 + Math.round(n * 4) * 0.15 - h) * pk;
    // the Otaru hills: rising behind the harbour quays, wooded, the town on their lower slopes
    const hk = hillK(x) + smoothstep(-500, -700, x) * 1.5;
    if (hk > 0) h += hk * smoothstep(50, 190, back) * (16 + hillN(x, z) * 22 + Math.min(back, 600) * 0.03);
    // the low Hanakawa rise at the inland edge, the plain beyond
    h += smoothstep(-760, -900, z) * 10;
  }
  // Otaru harbour: the basin and its mouth, quays straight down
  if (x > HARBOUR.x0 && x < HARBOUR.x1 && d > -HARBOUR.back && d < 200) h = -5;
  // the Ishikari: deep water, a big river’s mouth
  const ck = chanK(x);
  if (ck > 0) h = h * (1 - ck) - 9 * ck;
  // the breakwaters: concrete, 3.4 m over the water
  if (onMole(x, d)) h = Math.max(h, 3.4);
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The roads (local frame): the coast road behind the pines, up from each beach, into Hanakawa, Otaru’s waterfront. */
function onRoadL(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (Math.abs(back - COAST - Math.sin(x * 0.01) * 5) < 3.5 && x > -470 && x < 420) return true;   // Route 231 behind the pines
  if (Math.abs(x - zeniX(z)) < 3.5 && back > 40 && z > -660) return true;                           // up from Zenibako’s beach
  if (Math.abs(x - taruX(z)) < 3.5 && back > 40 && z > -660) return true;                           // from Tarukawa’s beach through the paddies
  if (Math.abs(x - ishiX(z)) < 3.5 && back > 60 && z > -660) return true;                           // Ishikari’s street along the river, inland
  if (Math.abs(z - (-600 + Math.sin(x * 0.006) * 25)) < 3.5 && x > -420 && x < 420) return true;    // into Hanakawa
  if (Math.abs(back - 82) < 3.5 && x > -500 && x < -340) return true;                               // Otaru’s waterfront, along the canal
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);
const inHarbour = (x: number, z: number) => x > HARBOUR.x0 - 6 && x < HARBOUR.x1 + 6 && shoreZ(x) - z < HARBOUR.back + 6;
/** The rice: the paddies (out of the towns, the hills and off the roads). */
const paddyL = (x: number, z: number) => shoreZ(x) - z > PADDY + 5 && hillK(x) < 0.2 && chanK(x) <= 0 && !inTown(x, z);
const bund = (x: number, z: number) => {
  const u = x + z * 0.05, v = z - x * 0.06;
  return Math.min(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11)) > 13.6;
};
/** September: the paddies still wet, slow going (vehicles worse). */
const soft = (x: number, z: number, foot: boolean) => (paddyL(x, F * z) && !onRoad(x, z) ? (foot ? 0.75 : 0.5) : 1);

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -300, name: 'Zenibako', inland: { name: 'Zenibako', x: -310, z: -80 } },
  { x: 20, name: 'Tarukawa', inland: { name: 'Tarukawa', x: 30, z: -260 } },
  { x: 330, name: 'Ishikari', inland: { name: 'Ishikari', x: 360, z: -80 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (open from the start; `opens` the place behind once taken), out to the dune foot
  { id: 'B', name: 'Zenibako beach', ...W(-300, shoreZ(-300) - 44), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Tarukawa beach', ...W(20, shoreZ(20) - 44), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Ishikari beach', ...W(330, shoreZ(330) - 44), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Zenibako', ...W(-310, -80), owner: null, sector: 'west' },
  { id: 'F', name: 'Tarukawa', ...W(30, -260), owner: null, sector: 'centre' },
  { id: 'G', name: 'Ishikari', ...W(360, -80), owner: null, sector: 'east' },
  { id: 'K', name: 'Hanakawa', ...W(40, -640), owner: 'nato', sector: 'centre' },
];

/** A Hokkaido house (as maps/hokkaido.ts): one or two storeys of pale siding under a low tin roof, painted red, blue or green. */
const ROOFS = [0x9a3a2e, 0x3e5a7e, 0x4a6e52, 0x7a4a2e, 0x8a2e34];
function jpHouse(props: any, { x, z, yaw, w, d, storeys = 2, name = 'house' }: any) {
  const r = props.rand;
  const b = props.beginBuilding(name, x, z, yaw, w, d);
  const siding = [0xc8c2b4, 0xb8b4a8, 0xd2c8b0, 0xa8aca6][Math.floor(r() * 4)];
  b.plaster = siding;
  const h = storeys * 2.8;
  props.shell(b, { height: h, storeys, t: 0.35, color: siding, bay: 2.4, sill: 0.9, head: 2.2, frame: 0x6a6a64, front: [(r() - 0.5) * w * 0.4] });
  props.piece('stone', b, 0, 0.1, 0, w + 0.2, 0.4, d + 0.2, 0x7a766e);
  props.gableRoof(b, { eave: h, pitch: 0.38, t: 0.35, overhang: 0.6, color: ROOFS[Math.floor(r() * ROOFS.length)] });
  props.endBuilding();
}
/** A Shinto shrine (as maps/hokkaido.ts): the hall under its green copper roof, the red torii before it. */
function shrine(props: any, terrain: any, x: number, z: number, yaw: number, name: string) {
  const w = 8, d = 6;
  const b = props.beginBuilding(name, x, z, yaw, w, d);
  b.plaster = 0x6a4a32;
  props.shell(b, { height: 2.8, t: 0.35, color: 0x6a4a32, bay: 2.2, sill: 1.0, head: 2.4, frame: 0x3a2a1e, front: [0] });
  props.piece('stone', b, 0, 0.3, 0, w + 1.6, 0.8, d + 1.6, 0x8a8678);
  props.gableRoof(b, { eave: 2.8, pitch: 0.6, t: 0.35, overhang: 0.9, color: 0x4e7a6a });
  props.endBuilding();
  const s = Math.sin(yaw), c = Math.cos(yaw), k = d / 2 + 9;
  const tx = x + s * k, tz = z + c * k, y = terrain.heightAt(tx, tz), hw = 1.8, ht = 4;
  for (const sd of [-1, 1]) props.box('plain', tx + c * hw * sd, y + ht / 2, tz - s * hw * sd, 0.55, ht, 0.55, yaw, 0xc0402a);
  props.box('plain', tx, y + ht + 0.2, tz, hw * 2 + 2.2, 0.38, 0.6, yaw, 0x2a2420);
  props.box('plain', tx, y + ht - 0.15, tz, hw * 2 + 1.6, 0.3, 0.5, yaw, 0xc0402a);
  props.box('plain', tx, y + ht - 1.1, tz, hw * 2 + 0.9, 0.26, 0.32, yaw, 0xc0402a);
}

export default {
  id: 'ishikari',
  name: 'Ishikari Bay Landing',
  description: 'Ishikari Bay north of Sapporo, September 1985: the long sand beaches of Hokkaido’s Sea of Japan coast, the dune belt and the black pines, the paddies of the Ishikari plain behind, fishing villages, Otaru’s harbour and hills at the bay’s west end, the Ishikari’s mouth and Ishikari town in the east. The Soviet Pacific Fleet’s naval infantry land; the US holds the way to Sapporo.',
  epochs: ['1985'],
  region: 'korea',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Soviet Union' },
  armies: { nato: ['us'], pact: ['sov'] }, // (the US forces flown north to hold Hokkaido; the Far East Military District’s naval infantry land)
  conditions: { time: 'dawn', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the dune ridges and Otaru’s hills are slow going, the breakwaters and quays no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft,
  river: sea,
  airfields: [], // (no strip: dunes, pines, wet paddies, the towns and Otaru’s hills — Airfields off)

  theme: {
    // a grey September dawn over the bay, the rice gold, the pines dark, the birches on the hills just turning
    fogColor: 0xb0b8ba, fogDensity: 0.0007,
    skyTop: 0x66788c, skyHorizon: 0xc8cecc, skyBottom: 0x76786c,
    sunColor: 0xf4e4cc, sunIntensity: 1.7, sunDisk: 0.25,
    clouds: 0.65, cloudLight: 0xe4e6e4, cloudDark: 0x8a9096,
    sunDir: [0.4, 0.45, 0.7],
    hemiSky: 0xc4ccd4, hemiGround: 0x545a3a, hemiIntensity: 1.3,
    rimColor: 0xc8ced2, rimIntensity: 0.2,
    terrain: {
      grass: '#5a7034', grassAlt: '#52662e', dryGrass: '#8e8650', dirt: '#5e4e3a', rock: '#74706a',
      pasture: '#5c7636', ploughed: '#5a4834', stubble: '#9a8a52', meadow: '#668040',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x), back = sz - lz;
        if (onRoadL(x, lz)) return [0x6e6c68, 0.88];                                            // asphalt
        if (onMole(x, -back) && y > 2) return [0x8a8880, 1];                                     // the breakwaters’ concrete
        if (inHarbour(x, lz) && y > -4.5) return [0x7a7872, 1];                                   // Otaru’s quay walls
        if (back < -4) return [y > 0.3 ? 0xb8ae94 : 0x988e78, 1];                                // the sand under the water
        if (back < 55) return [0xc6b896, 1];                                                     // the beach: grey-gold Sea of Japan sand
        if (chanK(x) > 0 && y < 2) return [0xa49c84, 0.9];                                       // the Ishikari’s sandy banks
        if (inTown(x, lz) && back > 60) return [0x8a8478, 0.55];                                 // lanes and yards
        if (back < 200 && hillK(x) < 0.5) return noise(x * 0.04, lz * 0.04) > 0.2 ? [0x6e7448, 0.8] : [0xb8ae84, 0.7]; // the dunes: lyme grass, rugosa rose in patches
        if (paddyL(x, lz)) {
          if (bund(x, lz)) return [0x5e6a36, 0.8];                                               // the bunds
          const k = noise(x * 0.04, lz * 0.04);
          return [k > 0.3 ? 0xa89a48 : k > -0.3 ? 0xb8a650 : 0x8a8a44, 0.85];                    // ripe rice
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 30, 350] }, pact: { x: 0, z: -830, entries: [-300, 20, 330] } }, // (the Soviets land: their roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Soviet land troops come in (systems/Landing.js): the naval infantry by Aist hovercraft or Polnocny, vehicles by Frosch or Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['frosch', 'polnocny'] },
    // what the landing may call in at sea: the escorts (the Tarantul in the ptBoat slot) and the Natya sweepers
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the mine barrier laid off the bay, a lane left off each sector for the sweepers to widen
    seaMines: { z: [520, 580], count: 60, lanes: [-300, 20, 330], lane: 80, seed: 1985_95 },
    // the coastal missile battery in the paddies: two launcher trucks that fire on the ships, then move
    forts: [{ unit: 'coastMissile', ...W(-150, -430), facing: Math.PI }, { unit: 'coastMissile', ...W(230, -470), facing: Math.PI }],
    // prepared positions: wire along the back of the beach, minefields and trenches in the dune foot
    works: [
      ...Array.from({ length: 80 }, (_, i) => { const x = -415 + i * 11; return x > CHANNEL.x - CHANNEL.half - 14 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 52), yaw: 0 }))),
      // MG nests over each beach, in the sector’s zone; a strip of mines on the sand in front of them, behind the wire
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 47), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    // the defence at dawn: the infantry over each beach and in the villages, TOW and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 47 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the armoured counter-attack: the brigade’s tanks and Bradleys up from Sapporo, late and small (the paddies slow it)
    counter: { t: 330, units: ['heavyTank', 'ifv', 'heavyTank', 'ifv'], say: 'The armour from Sapporo is coming up through the paddies: Abrams and Bradleys, straight for the beachhead', sayOther: 'Enemy armour coming up through the paddies from Sapporo' },
    // the landing’s AI (ai/LandingDirector.js): the naval infantry’s buying order, a Parchim inshore off the focus sector
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2100, perSector: 550, beachIncome: 0.85, defenceCp: 950, defenceIncome: 1.9 }, // (a shade richer than Scheveningen’s: Otaru’s hills and the paddies favour the defence — AI vs AI 2026-11-22)
    // the amphibious vehicles swim in on their own, put in off the beach: BMPs, BTRs and BRDMs, the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    // the first wave at dawn, in to all three sectors at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'pt76', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    props.rand = mulberry32(1985_96);
    const r = props.rand;
    sea.build(scene, terrain);
    const at = (x: number, z: number) => { const w = W(x, z); return { ...w, y: terrain.heightAt(w.x, w.z) }; };
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < m);
    const free = (x: number, z: number, m: number) => !onRoadL(x, z) && [zeniX, taruX, ishiX].every((f) => Math.abs(x - f(z)) > 6 + m)
      && Math.abs(shoreZ(x) - z - COAST) > 6 + m && !nearPoint(x, z, 16 + m) && chanK(x) <= 0 && !inHarbour(x, z) && Math.abs(x - CHANNEL.x) > CHANNEL.half + 14 + m;
    const cyl = (x: number, z: number, y: number, r0: number, r1: number, h: number, color: number, key = 'metal') => {
      const w = W(x, z);
      props.push(key, new THREE.CylinderGeometry(r0, r1, h, 16), new THREE.Matrix4().makeTranslation(w.x, y + h / 2, w.z), color);
    };
    const village = (cx: number, cz: number, rad: number, n: number, opts: { flats?: number; storeys?: number } = {}) => {
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, dd = 18 + r() * rad, x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!free(x, z, 3) || Math.abs(x) > 492 || shoreZ(x) - z < 70) continue;
        const yaw = r() < 0.5 ? 0 : Math.PI / 2;
        if (r() < (opts.flats ?? 0)) props.flatHouse({ ...W(x, z), yaw, width: 10 + r() * 4, depth: 8, storeys: 2 + Math.floor(r() * 2), name: 'shop' });
        else jpHouse(props, { ...W(x, z), yaw, w: 8 + r() * 2, d: 6.5 + r() * 1.5, storeys: r() < (opts.storeys ?? 0.6) ? 2 : 1 });
      }
    };

    // ---- Otaru: the harbour quays, the stone warehouses on the canal, the Maizuru ferry, the town up its hills
    for (let i = 0; i < 6; i++) {
      const x = -480 + i * 24;
      if (x > -360) break;
      props.hall({ ...W(x, shoreZ(x) - 96), yaw: 0, width: 20, depth: 12, height: 6.5, color: 0x8a8274, roof: 0x5a4a3e, door: 6, name: 'canal warehouse' });
    }
    { const w = W(-458, shoreZ(-458) + 60); props.box('metal', w.x, 2, w.z, 14, 6, 90, 0, 0x2a3a5e); props.box('plain', w.x, 8, w.z + 6, 12, 6, 50, 0, 0xe8e6e0); props.box('metal', w.x, 12.5, w.z + 20, 3, 3, 5, 0, 0x3a6aa8); } // the ferry to Maizuru at the quay
    for (let i = 0; i < 4; i++) { const w = W(-475 + (i % 2) * 28, shoreZ(-460) + 10 + Math.floor(i / 2) * 120); props.box('metal', w.x, 0.8, w.z, 5, 2.4, 18, 0, i % 2 ? 0x2a3a5a : 0x7a2a22); props.box('plain', w.x, 3.2, w.z - 3, 3.6, 2.4, 5, 0, 0xe8e4dc); } // trawlers in the basin
    for (let i = 0; i < 70; i++) { // the town on the hills (beyond the map’s west edge too)
      const x = -560 + r() * 230, z = shoreZ(x) - 110 - r() * 230;
      if (!free(x, z, 3) || nearPoint(x, z, 30) || Math.hypot(x + 310, z + 80) < 90) continue;
      if (r() < 0.2) props.flatHouse({ ...W(x, z), yaw: 0, width: 14, depth: 9, storeys: 3, name: 'apartment block' });
      else jpHouse(props, { ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 8 + r() * 2, d: 7, storeys: 2 });
    }
    shrine(props, terrain, -420, 170, Math.PI, 'Sumiyoshi shrine');

    // ---- Zenibako: the fishing village under the hills, the herring mansion, net sheds by the beach
    village(-310, -80, 75, 34);
    props.hall({ ...W(-250, shoreZ(-250) - 100), yaw: 0, width: 22, depth: 12, height: 7, color: 0x6a4a32, roof: 0x3a3a3a, door: 6, name: 'herring mansion' });
    for (const x of [-355, -225]) props.hall({ ...W(x, shoreZ(x) - 75), yaw: Math.PI / 2, width: 16, depth: 9, height: 4.5, color: 0x8a8a84, roof: 0x3a4a54, door: 5, name: 'net shed' });

    // ---- Tarukawa: the farm village out in the paddies, its shrine, the rice-drying racks and a dairy barn
    village(30, -260, 60, 22, { storeys: 0.4 });
    shrine(props, terrain, 75, 295, Math.PI, 'Tarukawa shrine');
    { const p = W(-60, -330); props.hall({ ...p, yaw: 0, width: 20, depth: 10, height: 5, color: 0x8a3428, roof: 0x4e6a5a, door: 6, name: 'dairy barn' }); props.tanks({ x: p.x + 14, z: p.z, yaw: 0, count: 1, radius: 2.3, height: 12, color: 0xb4b0a4 }); }
    for (let i = 0; i < 60; i++) { // farmhouses and haystacks scattered over the paddies
      const x = -330 + r() * 780, z = shoreZ(x) - PADDY - 20 - r() * 260;
      if (!paddyL(x, z) || !free(x, z, 10)) continue;
      if (r() < 0.3) jpHouse(props, { ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 9, d: 7, storeys: 1, name: 'farmhouse' });
      else props.hayBales({ ...W(x, z), yaw: r(), count: 2 + Math.floor(r() * 3) });
    }

    // ---- Ishikari: the town on the river bank, the lighthouse on the spit, the Benten shrine, the salmon sheds by the water
    village(360, -80, 70, 40, { flats: 0.15 });
    { const lx = 410, lz = shoreZ(410) - 70, p = at(lx, lz); // the lighthouse: red and white bands
      for (let k = 0; k < 5; k++) cyl(lx, lz, p.y + k * 3.6, 1.7 - k * 0.08, 1.8 - k * 0.08, 3.6, k % 2 ? 0xe8e6e0 : 0xb83a2e, 'plain');
      cyl(lx, lz, p.y + 18, 1.4, 1.4, 2.4, 0x2e3436); cover.addCylinder({ ...W(lx, lz), radius: 1.8, height: 6 }); }
    shrine(props, terrain, 300, 150, Math.PI / 2, 'Ishikari Benten shrine');
    for (let i = 0; i < 4; i++) { const z = shoreZ(420) - 110 - i * 40; props.hall({ ...W(418, z), yaw: Math.PI / 2, width: 24, depth: 10, height: 5, color: 0x8a8a84, roof: 0x3a4a54, door: 6, name: 'salmon shed' }); }

    // ---- Hanakawa: the houses and the danchi blocks at the end of the roads
    village(40, -640, 150, 60, { flats: 0.1 });
    props.ruinBlock({ ...W(-60, -690), yaw: 0, width: 28, depth: 11, storeys: 5, ruin: 0, name: 'danchi apartment block' });
    props.ruinBlock({ ...W(150, -700), yaw: 0, width: 26, depth: 11, storeys: 4, ruin: 0, name: 'danchi apartment block' });
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    props.finish();

    // ---- trees: the black pines planted on the old dunes, birch and conifer on the Otaru hills, shelter rows in the paddies
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) }];
    const treeK = (x: number, z: number) => {
      const lz = F * z, back = shoreZ(x) - lz;
      if (back < 85 || inHarbour(x, lz) || chanK(x) > 0 || Math.abs(x - CHANNEL.x) < CHANNEL.half + 18 || Math.abs(x) > 495) return 0;
      if (inTown(x, lz)) return hillK(x) > 0.6 ? 0.15 : 0;
      if (hillK(x) > 0.3 && back > 150) return 0.85;                                                                            // the Otaru hills
      if (back < 270) return smoothstep(110, 160, back) * (0.55 + 0.35 * smoothstep(-0.2, 0.3, fbm(noise, x * 0.01 + 7, lz * 0.01, 2)));  // the pine belt
      return 0;
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 5000, broadleaf: 0.15, autumn: 0.2, maxY: 90,
      avoid: [...avoid, { test: (x: number, z: number) => treeK(x, z) <= 0 }], forest: treeK });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2,
      avoid: [...avoid, { test: (x: number, z: number) => { const lz = F * z; return shoreZ(x) - lz < 55 || inHarbour(x, lz) || chanK(x) > 0 || paddyL(x, lz); } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
