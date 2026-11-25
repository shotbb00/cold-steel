// Scheveningen, 1985 (coastal: the Warsaw Pact lands, NATO holds; 1.0 × 1.8 km). The nightmare behind NATO’s Rhine
// front: a Soviet and East German landing on the Dutch North Sea coast at The Hague — the seat of the Dutch government
// and the road to Rotterdam and Europoort, where REFORGER’s men from America draw their stored tanks.
// The real coast, turned so that the sea is the -z side: the shore runs slantwise across the map, south-west to
// north-east as it does, the North Sea to the north-west. In the middle Scheveningen’s fishing harbour: the two
// basins dug into the dunes and the outer harbour between two curved stone moles, the fish auction and the net sheds
// on the quays, Duindorp on its dune south-west of it. North-east of the harbour Scheveningen-Bad: the Boulevard on
// its sea wall, the Kurhaus with its dome, the hotels, the pier out over the sea, the lighthouse, and the town
// behind; beyond it the high wooded dunes of the Oostduinen. South-west the Westduinpark — bare dunes rising to the
// Kijkduin, the highest on this coast, with its bunkers of the old Atlantikwall — and Kijkduin’s beach under it.
// Inland the Scheveningseweg runs straight through the Scheveningse Bosjes to Den Haag: the Statenkwartier, the
// city’s brick and the glasshouses toward Loosduinen.
// Two places to land, unlike each other: the wide sand under the Boulevard’s sea wall, and the narrow beach under
// the Kijkduin. The Boulevard opens the town and the Kurhaus, the Kurhaus the Statenkwartier; Kijkduin opens
// Duindorp and the harbour. (Compressed: Kijkduin to the Oostduinen is 5 km; here 1.1.)
// Flipped (wcampaign/battle.js flipLanding) NATO lands and the Pact holds the town.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 1000, z: 1000 };
const noise = createNoise2D(1985_11);
const sea = createSea({ level: 0, size: SIZE, color: 0x3e5458 }); // (the North Sea off Holland: grey-green, silty)
const bump = (x: number, z: number, cx: number, cz: number, r: number) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** The waterline (world z at x): slantwise, south-west (-x, the sea far up the map) to north-east. */
const SLOPE = 0.4, COS = 1 / Math.hypot(1, SLOPE), SIN = SLOPE * COS;
const zN = (x: number) => -120 + SLOPE * x;
const shoreZ = (x: number) => zN(x) + fbm(noise, x * 0.003, 2.1, 2) * 8;
/** m inland of the waterline, square to the shore (- out at sea). */
const backOf = (x: number, z: number) => (z - shoreZ(x)) * COS;
/** A place `back` m inland of the waterline at x (world). */
const S = (x: number, back: number) => ({ x, z: shoreZ(x) + back / COS });

/** Scheveningen harbour in its own frame: u along the shore (north-east +), v inland from the mouth. */
const HO = { x: -40, z: zN(-40) };
const hu = (x: number, z: number) => (x - HO.x) * COS + (z - HO.z) * SIN;
const hv = (x: number, z: number) => -(x - HO.x) * SIN + (z - HO.z) * COS;
const hx = (u: number, v: number) => ({ x: HO.x + u * COS - v * SIN, z: HO.z + u * SIN + v * COS });
/** The outer harbour, the first and the second basin (u0, u1, v0, v1). */
const BASINS = [[-100, 50, -20, 70], [-20, 40, 60, 260], [-113, -57, 60, 210]];
const inBasin = (u: number, v: number, pad = 0) => BASINS.some(([u0, u1, v0, v1]) => u > u0 - pad && u < u1 + pad && v > v0 - pad && v < v1 + pad);
/** The two curved stone moles out to the harbour mouth (u, v). */
const MOLES = [[[-112, 0], [-100, -90], [-55, -160]], [[60, 0], [52, -90], [12, -160]]];
const moleD = (u: number, v: number) => Math.min(...MOLES.map((m) => segDist(m, u, v)));
const basinD = (u: number, v: number) => Math.min(...BASINS.map(([u0, u1, v0, v1]) => Math.hypot(Math.max(u0 - u, 0, u - u1), Math.max(v0 - v, 0, v - v1))));
/** The quays round the basins (0..1). */
const harbourK = (u: number, v: number) => smoothstep(55, 30, basinD(u, v)) * smoothstep(-30, -5, v);

/** The roads (world): the Boulevard, the Scheveningseweg through the Bosjes to Den Haag, round the harbour to Duindorp,
 *  Kijkduin to Loosduinen, the Sportlaan across, the Badhuisweg, the slipways off the beach. */
const ROADS = [
  [[30, zN(30) + 69], [310, zN(310) + 69]],
  [[140, zN(140) + 85], [150, 640], [150, 950]],
  [[30, zN(30) + 69], [10, 125], [-140, 180], [-285, 60], [-270, -95], [-385, zN(-385) + 70]],
  [[-270, -95], [-285, 60], [-300, 300], [-200, 640], [-200, 950]],
  [[-520, 290], [-300, 300], [-20, 360], [150, 390], [520, 430]],
  [[310, zN(310) + 69], [340, 300], [150, 390]],
  [[150, 640], [0, 830]],
  [[175, zN(175) + 10], [175, zN(175) + 75]],
  [[-385, zN(-385) + 12], [-385, zN(-385) + 70]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const roadS = gridCacheSmooth((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), { x: 520, z: 920 }, 4);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;

/** The dunes’ hummocks and blowouts (0 ± 1): sampled once onto a grid, read between the samples. */
const duneN = gridCacheSmooth((x: number, z: number) => fbm(noise, x * 0.011 + 3, z * 0.011, 3), EXT, 4);
/** Scheveningen-Bad: the Boulevard and the town instead of the dunes. */
const townK = (x: number) => smoothstep(25, 70, x) * smoothstep(335, 295, x);
const DUINDORP = { x: -265, z: -95 };

function height(x: number, z: number) {
  const b = backOf(x, z), u = hu(x, z), v = hv(x, z);
  let h: number;
  if (b < 0) { // the bottom: a long shallow shelf with sandbars, shelving away
    const d = -b;
    h = Math.max(0.6 - d * 0.014 - Math.max(0, d - 140) * 0.045 + Math.sin(d * 0.06 + x * 0.003) * 0.3 * smoothstep(20, 60, d) * smoothstep(140, 100, d), -18);
  } else {
    const n = duneN(x, z), rd = roadS(x, z);
    // the beach (60 m of flat sand), the dune belt (narrow by the town, wide in the Westduinpark and the Oostduinen), then Den Haag a metre or two up
    const beach = 0.6 + Math.min(b, 60) * 0.035;
    const base = b < 60 ? beach : Math.max(1.2 + n * 0.3 + smoothstep(300, 600, b) * 0.8, beach - (b - 60) * 0.012);
    const belt = 210 + 170 * smoothstep(260, 420, x) + 80 * smoothstep(-200, -380, x);
    const env = smoothstep(50, 85, b) * smoothstep(belt + 40, belt - 40, b);
    const amp = 8 + 5 * smoothstep(280, 450, x) + 14 * bump(x, b, -410, 130, 110); // (the Kijkduin, 25 m and more)
    const gap = 1 - 0.88 * smoothstep(24, 7, rd);
    h = base + env * (amp + n * 7) * gap;
    // the Scheveningse Bosjes: old low dunes under the trees
    h += smoothstep(0.1, 0.6, n) * 3 * smoothstep(belt, belt + 60, b) * smoothstep(620, 520, b);
    // Scheveningen-Bad: the Boulevard on its sea wall 7 m up, the town on the old dunes behind, falling to the city
    const tk = townK(x);
    let town = b < 45 ? beach : 2.2 + smoothstep(45, 68, b) * 4.6 - smoothstep(380, 520, b) * 5;
    if (rd < 10 && b < 90) town = Math.min(town, beach + Math.max(0, b - 30) * 0.15); // (the slipway up from the sand)
    h += (town - h) * tk;
    // Duindorp in its dune hollow
    h += (4 - h) * 0.8 * bump(x, z, DUINDORP.x, DUINDORP.z, 75) * smoothstep(40, 70, b);
  }
  // the harbour: quays 3 m up, the basins and the outer harbour straight down, the moles out to the mouth
  const hk = harbourK(u, v);
  if (hk > 0) h += (3 - h) * hk;
  if (inBasin(u, v)) h = -5;
  else if (v < 0 && u > -112 && u < 60 && b < 0) h = Math.min(h, -4); // (the harbour mouth, dredged)
  if (moleD(u, v) < 4.5 && v > -165) h = Math.max(h, 3.4);
  return h;
}

/** The landing places (x) and the place each opens. */
export const SECTORS = [
  { x: 175, name: 'Scheveningen beach', inland: { name: 'Kurhaus', x: 110, z: 110 } },
  { x: -385, name: 'Kijkduin beach', inland: { name: 'Duindorp', ...DUINDORP } },
];

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Landing area', x: 100, z: -720, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Scheveningen beach', ...S(175, 36), owner: null, sector: 'east', radius: 50, opens: 'E' },
  { id: 'C', name: 'Kijkduin beach', ...S(-385, 34), owner: null, sector: 'west', radius: 45, opens: 'F' },
  // the Kurhaus and the town round it: once held, the Scheveningseweg into the Statenkwartier is open
  { id: 'E', name: 'Kurhaus', ...SECTORS[0].inland, owner: null, sector: 'east', opens: 'G' },
  { id: 'F', name: 'Duindorp', ...SECTORS[1].inland, owner: null, sector: 'west' },
  { id: 'G', name: 'Statenkwartier', x: -20, z: 365, owner: null, sector: 'centre' },
  { id: 'K', name: 'Den Haag', x: 150, z: 660, owner: 'nato', sector: 'centre' },
];

export default {
  id: 'scheveningen',
  name: 'Scheveningen Landing',
  description: 'The Dutch North Sea coast at The Hague, 1985: Scheveningen’s harbour between its curved moles, the Boulevard and the Kurhaus on the sea wall, the Kijkduin and the Westduinpark’s dunes, the Scheveningse Bosjes and Den Haag behind. Soviet and East German naval infantry land; NATO holds the coast.',
  epochs: ['1985'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Warsaw Pact' },
  armies: { nato: ['bw', 'us'], pact: ['sov', 'nva'] }, // (the Bundeswehr’s and REFORGER’s men hold; Soviet and NVA naval infantry land)
  conditions: { time: 'dawn', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the dune faces are no way up, the quays and moles neither)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  river: sea,
  airfields: [], // (no strip: dunes, the harbour, the town and the city — Airfields off)
  fields: createFields({ seed: 1985_11, cell: 60, weights: [0.55, 0.1, 0.2, 0.15] }),

  theme: {
    fogColor: 0xa8b2b6, fogDensity: 0.0006,
    skyTop: 0x6a7c90, skyHorizon: 0xcacfd0, skyBottom: 0x848c90,
    sunColor: 0xf4e6d2, sunIntensity: 1.6, sunDisk: 0.2,
    clouds: 0.75, cloudLight: 0xdcdedc, cloudDark: 0x868e94,
    sunDir: [0.45, 0.45, 0.75],
    hemiSky: 0xc8d2d8, hemiGround: 0x4e5638, hemiIntensity: 1.3,
    rimColor: 0xd0d8dc, rimIntensity: 0.2,
    terrain: {
      grass: '#5e7040', grassAlt: '#526638', dryGrass: '#8e8a58', dirt: '#5a4c3a', rock: '#7a7266',
      pasture: '#60723e', ploughed: '#4e4232', stubble: '#90865a', meadow: '#6a7a40',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const b = backOf(x, z), u = hu(x, z), v = hv(x, z);
        if (onRoad(x, z) && b > 8) return [0x55555a, 0.9];                                     // asphalt
        if (moleD(u, v) < 4.5 && y > 2) return [0x6e6c66, 1];                                  // the moles’ basalt blocks
        if (harbourK(u, v) > 0.5 && y > 2) return [0x6a6862, 0.95];                             // the quays
        if (b < -4) return [y > 0.3 ? 0xd6caa8 : 0xaea284, 1];                                  // the sand under the water
        if (b < 60) return [0xe0d4b2, 1];                                                       // the beach
        if (townK(x) > 0.5 && b < 95) return [0xa29a8c, 0.95];                                  // the Boulevard’s paving
        if (townK(x) > 0.5 && b < 420) return [0x7c776c, 0.6];                                  // the town: streets and squares
        if (bump(x, z, DUINDORP.x, DUINDORP.z, 70) > 0.5) return [0x7c776c, 0.5];               // Duindorp
        if (b > 460 && Math.abs(x) < 480) return [0x70706a, 0.35];                              // Den Haag’s streets
        if (b < 400) return noise(x * 0.04, z * 0.04) > 0.25 ? [0x6e7448, 0.8] : [0xc0b88a, 0.7]; // the dunes: marram, sea buckthorn in patches
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-200, 0, 150] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Pact lands: its roads are the landing places)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 200 }, pact: { x: -60, z: -400 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Pact’s land troops come in (systems/Landing.js): the naval infantry by Aist hovercraft or Polnocny, vehicles by Frosch or Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['frosch', 'polnocny'] },
    // what the landing may call in at sea: the escorts (the Tarantul in the ptBoat slot) and the Natya sweepers
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Dutch navy’s mine barrier off the coast, a lane left off each landing place for the sweepers to widen
    seaMines: { z: [540, 600], count: 55, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_11 },
    // the coastal missile battery behind the city: two launcher trucks that fire on the ships, then move
    forts: [{ unit: 'coastMissile', x: -150, z: 470, facing: Math.PI }, { unit: 'coastMissile', x: 300, z: 520, facing: Math.PI }],
    // prepared positions: wire along the back of each beach, minefields and trenches in the dune foot and on the Boulevard
    works: [
      ...Array.from({ length: 22 }, (_, i) => 60 + i * 11).map((x) => ({ kind: 'wire', ...S(x, 30), yaw: Math.atan(SLOPE) })),
      ...Array.from({ length: 14 }, (_, i) => -460 + i * 11).map((x) => ({ kind: 'wire', ...S(x, 28), yaw: Math.atan(SLOPE) })),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...S(s.x + dx, 62) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...S(s.x + dx, 52), yaw: Math.atan(SLOPE) }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...S(s.x + dx, 47), yaw: Math.PI + Math.atan(SLOPE) }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...S(s.x + dx, 38) }))),
      { kind: 'mgNest', ...hx(-125, 20), yaw: Math.PI }, { kind: 'mgNest', ...hx(72, 20), yaw: Math.PI }, // (at the moles’ roots)
    ],
    // the defence at dawn: the rear-area security troops over each beach, in the town and in Duindorp, TOW and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => S(s.x + dx, Math.abs(dx) < 30 ? 47 : 56))), ...SECTORS.map((s) => s.inland), { x: -20, z: 365 }, hx(-125, 30)],
    // the armoured counter-attack: tanks and IFVs drawn from the stores at the Rotterdam docks, up through Den Haag
    counter: { t: 330, units: ['heavyTank', 'ifv', 'heavyTank', 'ifv'], say: 'The reserve drawn from the Rotterdam stores is coming up through Den Haag: tanks and IFVs, straight for the beachhead', sayOther: 'Enemy armour coming up through Den Haag from Rotterdam' },
    // the landing’s AI (ai/LandingDirector.js): the naval infantry’s buying order, a Parchim inshore off the focus sector
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2000, perSector: 550, beachIncome: 0.75, defenceCp: 975, defenceIncome: 1.9 },
    // the amphibious vehicles swim in on their own, put in off the beach: BMPs, BTRs and BRDMs, the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    // the first wave at dawn: the main body onto the Boulevard’s wide sand, a smaller one under the Kijkduin
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'pt76', sector: 0 }, { unit: 'tank', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 }, { unit: 'ifv', sector: 1 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_11);
    sea.build(scene, terrain);
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < m);
    const clear = (x: number, z: number, m = 16) => roadD(x, z) > 9 && !nearPoint(x, z, m) && !inBasin(hu(x, z), hv(x, z), 8) && backOf(x, z) > 70;
    const cyl = (x: number, z: number, y: number, r0: number, r1: number, h: number, color: number, key = 'metal') =>
      props.push(key, new THREE.CylinderGeometry(r0, r1, h, 16), new THREE.Matrix4().makeTranslation(x, y + h / 2, z), color);
    const yawS = -Math.atan(SLOPE); // (square to the shore)

    // ---- Scheveningen-Bad: the Kurhaus with its dome, the hotels along the Boulevard, the town behind, the lighthouse, the pier
    const K0 = S(150, 105);
    props.flatHouse({ ...K0, yaw: yawS, width: 56, depth: 18, storeys: 4, name: 'Kurhaus' });
    { const y = terrain.heightAt(K0.x, K0.z); props.push('plaster', new THREE.SphereGeometry(9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.Matrix4().makeTranslation(K0.x, y + 12.2, K0.z), 0x4a524e); }
    for (let x = 60; x < 320; x += 24) {
      if (Math.abs(x - 150) < 42 || Math.abs(x - 140) < 16) continue;
      const p = S(x, 100);
      if (roadD(p.x, p.z) < 10) continue;
      props.flatHouse({ ...p, yaw: yawS, width: 18, depth: 14, storeys: 4 + Math.floor(r() * 3), name: 'hotel' });
    }
    for (let i = 0; i < 110; i++) {
      const x = 45 + r() * 270, p = S(x, 135 + r() * 270);
      if (!clear(p.x, p.z, 22)) continue;
      if (r() < 0.3) props.flatHouse({ ...p, yaw: yawS, width: 14 + r() * 6, depth: 10, storeys: 3 + Math.floor(r() * 2), name: 'apartment block' });
      else props.townHouse({ ...p, yaw: yawS + (r() < 0.5 ? 0 : Math.PI / 2), width: 7 + r() * 3, depth: 9, storeys: 3, name: 'town house', damaged: 0 });
    }
    props.church({ ...S(230, 230), yaw: yawS });
    { const p = S(40, 150), y = terrain.heightAt(p.x, p.z); cyl(p.x, p.z, y, 1.6, 2.2, 30, 0x8a4a36, 'stone'); cyl(p.x, p.z, y + 30, 2.4, 2.4, 3, 0x2e3436); cover.addCylinder({ ...p, radius: 2.2, height: 6 }); } // the lighthouse
    for (let d = -2; d < 170; d += 12) { // the pier: a deck on stilts out over the sea, its island at the end
      const p = S(280, -d);
      for (const o of [-4, 4]) props.box('metal', p.x + o * COS, 2.5, p.z + o * SIN, 0.6, 9, 0.6, 0, 0x5a5e5e);
      props.box('stone', p.x, 7.2, p.z, 12.4, 0.6, 11, yawS, 0xc8c4b8);
    }
    { const p = S(280, -184); props.push('stone', new THREE.CylinderGeometry(13, 13, 1, 16), new THREE.Matrix4().makeTranslation(p.x, 7.2, p.z), 0xc8c4b8); props.push('plaster', new THREE.CylinderGeometry(9, 10, 6, 16), new THREE.Matrix4().makeTranslation(p.x, 10.6, p.z), 0xe0dcd0); }

    // ---- the harbour: the fish auction and the sheds on the quays, trawlers in the basins
    { const p = hx(10, 285); props.hall({ ...p, yaw: yawS + Math.PI / 2, width: 50, depth: 16, height: 7, color: 0xa8a092, roof: 0x5a3a2e, door: 12, name: 'fish auction' }); }
    { const p = hx(-30, 150); props.hall({ ...p, yaw: yawS, width: 30, depth: 12, height: 6, color: 0x8a8a84, roof: 0x3a4a54, door: 8, name: 'net shed' }); }
    { const p = hx(-135, 120); props.hall({ ...p, yaw: yawS, width: 26, depth: 12, height: 6, color: 0x8a8a84, roof: 0x5a3a2e, door: 8, name: 'net shed' }); }
    for (let i = 0; i < 8; i++) {
      const p = i < 4 ? hx(-4 + (i % 2) * 28, 100 + Math.floor(i / 2) * 60) : hx(-98 + (i % 2) * 26, 90 + Math.floor((i - 4) / 2) * 55);
      props.box('metal', p.x, 0.8, p.z, 6, 2.6, 24, yawS + Math.PI / 2, i % 3 ? 0x2a3a5a : 0x7a2a22);   // a trawler’s hull
      props.box('plain', p.x, 3.4, p.z, 4, 2.6, 6, yawS + Math.PI / 2, 0xe8e4dc);                        // her wheelhouse
    }
    // ---- Duindorp: the fishermen’s terraces in the dune hollow, its church
    for (let i = 0; i < 60; i++) {
      const x = DUINDORP.x + (r() * 2 - 1) * 70, z = DUINDORP.z + (r() * 2 - 1) * 60;
      if (!clear(x, z) || bump(x, z, DUINDORP.x, DUINDORP.z, 75) < 0.4) continue;
      props.townHouse({ x, z, yaw: yawS, width: 12 + r() * 6, depth: 8, storeys: 2, name: 'terrace', damaged: 0 });
    }
    props.church({ x: DUINDORP.x + 40, z: DUINDORP.z + 50, yaw: yawS });
    // ---- the Westduinpark and the Kijkduin: Atlantikwall casemates in the dunes, Kijkduin’s pavilion on the beach road
    for (const [x, b] of [[-440, 130], [-330, 110], [-200, 140], [-470, 220]]) { const p = S(x, b); props.box('stone', p.x, terrain.heightAt(p.x, p.z) + 0.8, p.z, 7, 2.6, 6, 0.3, 0x8a8880); cover.addBox({ ...p, yaw: 0.3, length: 7, thickness: 6, height: 2.4 }); }
    { const p = S(-350, 85); props.hall({ ...p, yaw: yawS, width: 24, depth: 12, height: 6, color: 0xd0ccc0, roof: 0x3a5a7a, door: 6, name: 'beach pavilion' }); }

    // ---- Den Haag: the Statenkwartier’s brick terraces and the post-war blocks of flats toward the city, Loosduinen’s glasshouses
    for (let i = 0; i < 160; i++) {
      const x = (r() * 2 - 1) * 480, z = 300 + r() * 520;
      if (!clear(x, z, 20) || backOf(x, z) < 330 || (x > 120 && z < 560 && x < 470) || Math.hypot(x, z - 830) < 60) continue;
      if (r() < 0.35) props.flatHouse({ x, z, yaw: 0, width: 30, depth: 11, storeys: 4 + Math.floor(r() * 3), name: 'block of flats' });
      else props.townHouse({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 16 + r() * 8, depth: 9, storeys: 3, name: 'terrace', damaged: 0 });
    }
    props.church({ x: -60, z: 420, yaw: 0 });
    const glass: { x: number; z: number }[] = [];
    for (let i = 0; i < 300 && glass.length < 10; i++) {
      const x = -480 + r() * 160, z = 380 + r() * 400;
      if (!clear(x, z, 40) || glass.some((g) => Math.abs(g.x - x) < 36 && Math.abs(g.z - z) < 28)) continue;
      glass.push({ x, z });
      const y = terrain.heightAt(x, z); // (glass on a steel frame: the walls, the ridged roof in bays)
      props.box('plain', x, y + 1.8, z, 30, 3.6, 22, 0, 0xb8cccc);
      for (let k = -6; k <= 6; k++) props.box('plain', x + k * 2.3, y + 4, z, 2, 0.8, 22.2, 0, 0xd4e2e2, 0, 0);
      cover.addBox({ x, z, yaw: 0, length: 30, thickness: 22, height: 3.6, spots: false });
    }
    { const x = -420, z = 330, y = terrain.heightAt(x, z); // Loosduinen’s windmill
      cyl(x, z, y, 2.6, 4.2, 13, 0x5a3a2e, 'stone'); cyl(x, z, y + 13, 0.4, 2.8, 2.6, 0x2e3a30, 'plain');
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3; props.box('plain', x + Math.cos(a) * 6, y + 14 + Math.sin(a) * 6, z - 3.2, 1.6, 12, 0.2, 0, 0xd8d0c0, 0, -a + Math.PI / 2); }
      cover.addCylinder({ x, z, radius: 4, height: 10 }); }
    for (let i = 0; i < 4; i++) { const x = 380 + (r() - 0.5) * 120, z = 650 + r() * 150; if (clear(x, z, 30)) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, 0); }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    // ---- trees: the Scheveningse Bosjes and the Oostduinen woods, sea buckthorn and stunted pines in the dunes, street trees in the city
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => roadD(x, z) < 6 || inBasin(hu(x, z), hv(x, z), 6) }];
    const treeK = (x: number, z: number) => {
      const b = backOf(x, z);
      if (b < 80 || Math.abs(x) > 495 || townK(x) > 0.3 && b < 420 || bump(x, z, DUINDORP.x, DUINDORP.z, 80) > 0.3 || harbourK(hu(x, z), hv(x, z)) > 0.2) return 0;
      if (x > 120 && x < 470 && z > 330 && z < 600) return 0.9;                                                     // the Scheveningse Bosjes
      if (x > 330 && b < 420) return 0.5 + smoothstep(200, 350, b) * 0.4;                                          // the Oostduinen’s pines
      if (b < 330) return smoothstep(0.0, 0.4, fbm(noise, x * 0.01 + 7, z * 0.01, 2)) * 0.5;                      // dune scrub
      return 0.05;                                                                                                    // street trees
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 2600, broadleaf: 0.55, autumn: 0.2, maxY: 40,
      avoid: [...avoid, { test: (x: number, z: number) => treeK(x, z) <= 0 }], forest: treeK });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => { const b = backOf(x, z); return b < 60 || harbourK(hu(x, z), hv(x, z)) > 0.3 || (townK(x) > 0.5 && b < 420) || b > 460; } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
