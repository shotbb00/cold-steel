// Scheveningen and Hoek van Holland, 1985 (coastal: the Warsaw Pact lands, NATO holds; 1.0 × 1.8 km). The
// nightmare behind NATO’s Rhine front: a Soviet and East German landing on the Dutch North Sea coast, to cut the
// ports — Rotterdam and Europoort, where REFORGER’s men from America draw their stored tanks — before the
// reinforcements reach the front. Out at sea the Pact’s landing ships and the mine barrier the Dutch navy laid off
// the coast; then the wide, flat sand beach of Holland, sixty metres of it, and the dune belt behind — marram and
// sea buckthorn, ridges 10–15 m high. In the west Hoek van Holland: the village and the ferry terminal on the
// Nieuwe Waterweg, the river mouth between its long stone moles, and across the water the Maasvlakte with the
// Europoort tanks and flare stacks on the skyline. In the middle Ter Heijde’s beach and, behind the dunes, the
// Westland: flat polders cut by ditches, glasshouses in rows, windmills, Monster with its church. In the east
// Scheveningen: the fishing harbour between its two moles, then the Boulevard on its sea wall, the Kurhaus with its
// dome, the pier out over the sea, the lighthouse and the town. Behind it all the polder dyke, and inland, at the
// end of the roads, the edge of Den Haag — NATO’s ground.
// (Compressed: Hoek van Holland to Scheveningen is 15 km; here 900 m. The real coast runs south-west to north-east,
// here straight across the map.)
// Laid out like Hohwacht (maps/hohwacht.ts) in a frame with the sea toward +z (`L`), then turned round: the Pact’s
// side is -z, so the sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_11);
const sea = createSea({ level: 0, size: SIZE, color: 0x3e5458 }); // (the North Sea off Holland: grey-green, silty)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The waterline (local z): the Dutch coast, nearly straight, a little over a hundred and fifty metres from the middle. */
const shoreZ = (x: number) => 170 + fbm(noise, x * 0.003, 2.1, 2) * 10;
/** Scheveningen (east): the Boulevard and the town instead of the dunes. */
const townK = (x: number) => smoothstep(310, 350, x);
/** Scheveningen’s fishing harbour: the basin between the moles (x), how far it reaches inland. */
const HARBOUR = { x0: 222, x1: 284, back: 150 };
/** The Nieuwe Waterweg (west): the river mouth, running inland at the map’s edge; the Maasvlakte beyond it. */
const CHANNEL = { x: -505, half: 45 };
const chanK = (x: number) => smoothstep(CHANNEL.half + 12, CHANNEL.half, Math.abs(x - CHANNEL.x));
/** The stone moles (x, how far out past the waterline): the Nieuwe Waterweg’s pair, Scheveningen harbour’s pair. */
const MOLES = [{ x: -446, out: 330 }, { x: -564, out: 300 }, { x: 216, out: 150 }, { x: 290, out: 150 }];
const onMole = (x: number, d: number) => MOLES.some((m) => Math.abs(x - m.x) < 4.5 && d > -20 && d < m.out);
/** The polder dyke behind the dunes (local z). */
const dykeZ = (x: number) => -330 + Math.sin(x * 0.006) * 20;
/** The roads up from the beaches (x at local z): Hoek van Holland, Ter Heijde to Monster, Scheveningen. */
const hoekX = (z: number) => -320 + Math.sin(z * 0.012) * 12;
const monsterX = (z: number) => 20 + Math.sin(z * 0.009) * 20;
const schevX = (z: number) => 400 + Math.sin(z * 0.01) * 10;

/** The dunes’ hummocks and blowouts (0 ± 1): sampled once onto a grid, read between the samples. */
const duneN = gridCacheSmooth((x: number, z: number) => fbm(noise, x * 0.011 + 3, z * 0.011, 3), { x: 1000, z: 1000 }, 4);

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  let h: number;
  if (d > 0) { // the bottom: a long shallow shelf with sandbars, shelving away (the landing ships’ water a couple of hundred metres out)
    h = Math.max(0.6 - d * 0.014 - Math.max(0, d - 140) * 0.045 + Math.sin(d * 0.06 + x * 0.003) * 0.3 * smoothstep(20, 60, d) * smoothstep(140, 100, d), -18);
  } else {
    const back = -d; // m inland of the waterline
    const n = duneN(x, z);
    // the beach (60 m of flat sand), then the dune belt (50–250 m back), then the polder at a metre above the sea
    const beach = 0.6 + Math.min(back, 60) * 0.035;
    const base = back < 60 ? beach : Math.max(0.9 + n * 0.2, beach - (back - 60) * 0.012);
    const env = smoothstep(50, 85, back) * smoothstep(250, 190, back);
    // cut down where the roads go through (the beach accesses), lower at Hoek van Holland
    const gap = 1 - 0.85 * Math.max(Math.exp(-(((x - hoekX(z)) / 16) ** 2)), Math.exp(-(((x - monsterX(z)) / 16) ** 2)));
    const dunes = base + env * (8 + n * 7) * (x < -380 ? 0.6 : 1) * gap;
    // Scheveningen: the Boulevard on its sea wall 7 m up, the town on the old dunes behind, falling to the polder
    const tk = townK(x);
    const town = back < 45 ? beach : 2.2 + smoothstep(45, 68, back) * 4.6 - smoothstep(420, 560, back) * 5.2;
    h = dunes + (town - dunes) * tk;
    // the polder dyke: a grass bank 3 m high, the road along its crest
    const dk = Math.abs(z - dykeZ(x));
    if (dk < 16) h = Math.max(h, 0.9 + 3 * smoothstep(16, 4, dk) * (1 - tk));
  }
  // Scheveningen harbour: the basin and its mouth, quays straight down
  if (x > HARBOUR.x0 && x < HARBOUR.x1 && d > -HARBOUR.back && d < 150) h = -5;
  // the Nieuwe Waterweg: deep water, the ships’ channel
  const ck = chanK(x);
  if (ck > 0) h = h * (1 - ck) - 10 * ck;
  // the moles: stone, 3.4 m over the water
  if (onMole(x, d)) h = Math.max(h, 3.4);
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The roads (local frame): the coast road behind the dunes, up from each beach, along the dyke, into Den Haag. */
function onRoadL(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (Math.abs(back - 262 - Math.sin(x * 0.01) * 5) < 3.5 && x > -440 && x < 420) return true;   // the coast road behind the dunes
  if (Math.abs(x - hoekX(z)) < 3.5 && back > 40 && z > -650) return true;                      // up from the beach at Hoek van Holland
  if (Math.abs(x - monsterX(z)) < 3.5 && back > 40 && z > -650) return true;                   // from Ter Heijde through Monster
  if (Math.abs(x - schevX(z)) < 3.5 && back > 70 && z > -650) return true;                     // Scheveningen’s Gevers Deynootweg, inland
  if (Math.abs(z - dykeZ(x)) < 3 && x > -440 && x < 330) return true;                          // along the dyke’s crest
  if (Math.abs(z - (-600 + Math.sin(x * 0.006) * 25)) < 3.5 && x > -440) return true;          // into Den Haag
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);
const inHarbour = (x: number, z: number) => x > HARBOUR.x0 - 6 && x < HARBOUR.x1 + 6 && shoreZ(x) - z < HARBOUR.back + 6;

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -320, name: 'Hoek van Holland', inland: { name: 'Hoek van Holland', x: -330, z: -70 } },
  { x: 20, name: 'Ter Heijde', inland: { name: 'Monster', x: 30, z: -240 } },
  { x: 390, name: 'Scheveningen', inland: { name: 'Scheveningen', x: 380, z: -80 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (open from the start; `opens` the place behind once taken), out to the dune foot or the sea wall
  { id: 'B', name: 'Hoek van Holland beach', ...W(-320, shoreZ(-320) - 44), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Ter Heijde beach', ...W(20, shoreZ(20) - 44), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Scheveningen Boulevard', ...W(390, shoreZ(390) - 44), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Hoek van Holland', ...W(-330, -70), owner: null, sector: 'west' },
  { id: 'F', name: 'Monster', ...W(30, -240), owner: null, sector: 'centre' },
  { id: 'G', name: 'Scheveningen', ...W(380, -80), owner: null, sector: 'east' },
  { id: 'K', name: 'Den Haag', ...W(60, -640), owner: 'nato', sector: 'centre' },
];

export default {
  id: 'scheveningen',
  name: 'Scheveningen Landing',
  description: 'The Dutch North Sea coast, 1985: the wide sand beach and the dune belt from Hoek van Holland to Scheveningen, the harbour moles, the Kurhaus on the Boulevard, the Westland’s polders and glasshouses behind the dyke, Europoort’s tanks across the Nieuwe Waterweg. Soviet and East German naval infantry land to cut the reinforcement ports; NATO holds the coast.',
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
  steep: 0.45, // (vehicles: the dune ridges are slow going, the moles and quays no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  river: sea,
  airfields: [], // (no strip: dunes, ditched polders, glasshouses and towns — Airfields off)
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
        const lz = F * z, sz = shoreZ(x), back = sz - lz;
        if (onRoadL(x, lz)) return [0x55555a, 0.9];                                          // asphalt
        if (onMole(x, -back) && y > 2) return [0x6e6c66, 1];                                   // the moles’ basalt blocks
        if (inHarbour(x, lz) && y > -4.5) return [0x6a6862, 1];                                 // the harbour’s quay walls
        if (back < -4) return [y > 0.3 ? 0xd6caa8 : 0xaea284, 1];                              // the sand under the water
        if (back < 60) return [0xe0d4b2, 1];                                                   // the beach
        if (townK(x) > 0.5 && back < 95) return [0xa29a8c, 0.95];                              // the Boulevard’s paving
        if (townK(x) > 0.5 && back < 430) return [0x7c776c, 0.6];                              // the town: streets and squares
        if (back < 250 && townK(x) < 0.5) return noise(x * 0.04, lz * 0.04) > 0.25 ? [0x6e7448, 0.8] : [0xc0b88a, 0.7]; // the dunes: marram, sea buckthorn in patches
        const dx = ((x % 45) + 45) % 45;
        if (dx < 1.2 && Math.abs(lz - dykeZ(x)) > 18 && back > 270) return [0x3a4a46, 0.9];   // the polder ditches
        return null;                                                                          // the polder fields
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-320, 30, 380] }, pact: { x: 0, z: -830, entries: [-320, 20, 390] } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Pact’s land troops come in (systems/Landing.js): the naval infantry by Aist hovercraft or Polnocny, vehicles by Frosch or Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['frosch', 'polnocny'] },
    // what the landing may call in at sea: the escorts (the Tarantul in the ptBoat slot) and the Natya sweepers
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Dutch navy’s mine barrier off the coast, a lane left off each sector for the sweepers to widen
    seaMines: { z: [520, 580], count: 60, lanes: [-320, 20, 390], lane: 80, seed: 1985_11 },
    // the coastal missile battery in the polders: two launcher trucks that fire on the ships, then move
    forts: [{ unit: 'coastMissile', ...W(-150, -420), facing: Math.PI }, { unit: 'coastMissile', ...W(250, -480), facing: Math.PI }],
    // prepared positions: wire along the back of the beach, minefields and trenches in the dune foot and on the Boulevard
    works: [
      ...Array.from({ length: 85 }, (_, i) => { const x = -435 + i * 11; return x > HARBOUR.x0 - 14 && x < HARBOUR.x1 + 14 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 52), yaw: 0 }))),
      // MG nests over each beach, in the sector’s zone; a strip of mines on the sand in front of them, behind the wire
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 47), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    // the defence at dawn: the rear-area security troops over each beach and in the villages, TOW and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 47 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the armoured counter-attack: tanks and IFVs drawn from the stores at the Rotterdam docks, after five and a half minutes (the polders slow it)
    counter: { t: 330, units: ['heavyTank', 'ifv', 'heavyTank', 'ifv'], say: 'The reserve drawn from the Rotterdam stores is coming up through the Westland: tanks and IFVs, straight for the beachhead', sayOther: 'Enemy armour coming up through the polders from Rotterdam' },
    // the landing’s AI (ai/LandingDirector.js): the naval infantry’s buying order, a Parchim inshore off the focus sector
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2000, perSector: 550, beachIncome: 0.75, defenceCp: 975, defenceIncome: 1.9 }, // (richer than Hohwacht’s, the counter-attack later and smaller: the dune belt and the Westland hold the landing up — AI vs AI 2026-11-22)
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
    const r = mulberry32(1985_11);
    sea.build(scene, terrain);
    const at = (x: number, z: number) => { const w = W(x, z); return { ...w, y: terrain.heightAt(w.x, w.z) }; };
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < m);
    const cyl = (x: number, z: number, y: number, r0: number, r1: number, h: number, color: number, key = 'metal') => {
      const w = W(x, z);
      props.push(key, new THREE.CylinderGeometry(r0, r1, h, 16), new THREE.Matrix4().makeTranslation(w.x, y + h / 2, w.z), color);
    };

    // ---- Scheveningen: the Kurhaus with its dome, the hotels along the Boulevard, the town behind, the lighthouse, the pier
    const kx = 405, kz = shoreZ(405) - 110;
    props.flatHouse({ ...W(kx, kz), yaw: 0, width: 56, depth: 18, storeys: 4, name: 'Kurhaus' });
    { const p = at(kx, kz); props.push('plaster', new THREE.SphereGeometry(9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.Matrix4().makeTranslation(p.x, p.y + 12.2, p.z), 0x4a524e); }
    for (let x = 336; x < 492; x += 24) {
      if (Math.abs(x - kx) < 42 || Math.abs(x - schevX(shoreZ(x) - 104)) < 14) continue;
      props.flatHouse({ ...W(x, shoreZ(x) - 104), yaw: 0, width: 18, depth: 14, storeys: 4 + Math.floor(r() * 3), name: 'hotel' });
    }
    for (let i = 0; i < 70; i++) {
      const x = 330 + r() * 165, z = shoreZ(x) - 140 - r() * 280;
      if (onRoadL(x, z) || Math.abs(x - schevX(z)) < 9 || nearPoint(x, z, 22)) continue;
      if (r() < 0.3) props.flatHouse({ ...W(x, z), yaw: 0, width: 14 + r() * 6, depth: 10, storeys: 3 + Math.floor(r() * 2), name: 'apartment block' });
      else props.townHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 7 + r() * 3, depth: 9, storeys: 3, name: 'town house', damaged: 0 });
    }
    props.church(W(450, -150));
    { const p = at(335, shoreZ(335) - 150); cyl(335, shoreZ(335) - 150, p.y, 1.6, 2.2, 30, 0x8a4a36, 'stone'); cyl(335, shoreZ(335) - 150, p.y + 30, 2.4, 2.4, 3, 0x2e3436); cover.addCylinder({ ...W(335, shoreZ(335) - 150), radius: 2.2, height: 6 }); } // the lighthouse
    for (let d = -2; d < 170; d += 12) { // the pier: a deck on stilts out over the sea, its island at the end
      const p = W(478, shoreZ(478) + d);
      for (const o of [-4, 4]) props.box('metal', p.x + o, 2.5, p.z, 0.6, 9, 0.6, 0, 0x5a5e5e);
      props.box('stone', p.x, 7.2, p.z, 11, 0.6, 12.4, 0, 0xc8c4b8);
    }
    { const p = W(478, shoreZ(478) + 182); props.push('stone', new THREE.CylinderGeometry(13, 13, 1, 16), new THREE.Matrix4().makeTranslation(p.x, 7.2, p.z), 0xc8c4b8); props.push('plaster', new THREE.CylinderGeometry(9, 10, 6, 16), new THREE.Matrix4().makeTranslation(p.x, 10.6, p.z), 0xe0dcd0); }

    // ---- Scheveningen harbour: the fish auction and the sheds on the quays, trawlers in the basin
    props.hall({ ...W(253, shoreZ(253) - 178), yaw: 0, width: 50, depth: 16, height: 7, color: 0xa8a092, roof: 0x5a3a2e, door: 12, name: 'fish auction' });
    props.hall({ ...W(200, shoreZ(200) - 120), yaw: Math.PI / 2, width: 30, depth: 14, height: 6, color: 0x8a8a84, roof: 0x3a4a54, door: 8, name: 'net shed' });
    for (let i = 0; i < 6; i++) {
      const w = W(232 + (i % 2) * 40, shoreZ(250) - 30 - Math.floor(i / 2) * 38);
      props.box('metal', w.x, 0.8, w.z, 6, 2.6, 24, 0, i % 3 ? 0x2a3a5a : 0x7a2a22);   // a trawler’s hull
      props.box('plain', w.x, 3.4, w.z - 4, 4, 2.6, 6, 0, 0xe8e4dc);                     // her wheelhouse
    }

    // ---- Hoek van Holland: the village on the Nieuwe Waterweg, the ferry terminal (the night boat to Harwich), the bunkers in the dunes
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, dd = 25 + r() * 85, x = -330 + Math.cos(a) * dd, z = -70 + Math.sin(a) * dd * 0.8;
      if (x < -436 || onRoadL(x, z) || nearPoint(x, z, 16)) continue;
      props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0 });
    }
    props.church(W(-290, -130));
    props.hall({ ...W(-412, -200), yaw: Math.PI / 2, width: 46, depth: 18, height: 9, color: 0xc8c4b8, roof: 0x3a5a7a, door: 10, name: 'ferry terminal' });
    { const w = W(-505, -230); props.box('metal', w.x, 2, w.z, 22, 7, 130, 0, 0x2a3e5e); props.box('plain', w.x, 9, w.z - 10, 20, 8, 70, 0, 0xe8e6e0); props.box('metal', w.x, 15, w.z - 30, 4, 4, 6, 0, 0xc83a2a); } // a ferry at the quay
    for (const x of [-380, -230]) { const w = W(x, shoreZ(x) - 120); props.box('stone', w.x, terrain.heightAt(w.x, w.z) + 0.8, w.z, 7, 2.6, 6, 0.3, 0x8a8880); cover.addBox({ ...w, yaw: 0.3, length: 7, thickness: 6, height: 2.4 }); } // Atlantikwall casemates

    // ---- the Westland: Monster, the glasshouses in rows, the windmills, farms along the dyke
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + r() * 0.4, dd = 28 + r() * 50, x = 30 + Math.cos(a) * dd, z = -240 + Math.sin(a) * dd * 0.8;
      if (onRoadL(x, z) || nearPoint(x, z, 18)) continue;
      props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0 });
    }
    props.church(W(60, -280));
    const glass: { x: number; z: number }[] = [];
    for (let i = 0; i < 400 && glass.length < 32; i++) {
      const x = -280 + r() * 560, z = shoreZ(x) - 290 - r() * 300;
      if (inHarbour(x, z) || townK(x) > 0.1 || Math.abs(z - dykeZ(x)) < 30 || Math.hypot(x - 30, z + 240) < 100 || Math.hypot(x + 330, z + 70) < 120) continue;
      if (Math.abs(x - hoekX(z)) < 24 || Math.abs(x - monsterX(z)) < 24 || Math.abs(shoreZ(x) - z - 262) < 24 || Math.abs(z + 600) < 40 || nearPoint(x, z, 60)) continue;
      if (glass.some((g) => Math.abs(g.x - x) < 36 && Math.abs(g.z - z) < 28)) continue;
      glass.push({ x, z });
      const p = at(x, z); // (glass on a steel frame: the walls, the ridged roof in bays)
      props.box('plain', p.x, p.y + 1.8, p.z, 30, 3.6, 22, 0, 0xb8cccc);
      for (let k = -6; k <= 6; k++) props.box('plain', p.x + k * 2.3, p.y + 4, p.z, 2, 0.8, 22.2, 0, 0xd4e2e2, 0, 0);
      cover.addBox({ x: p.x, z: p.z, yaw: 0, length: 30, thickness: 22, height: 3.6, spots: false });
    }
    for (const [x, z] of [[-170, -390], [170, -400]]) { // the windmills: a brick tower, the cap, four sails to the wind
      const p = at(x, z);
      cyl(x, z, p.y, 2.6, 4.2, 13, 0x5a3a2e, 'stone');
      cyl(x, z, p.y + 13, 0.4, 2.8, 2.6, 0x2e3a30, 'plain');
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + 0.3, s = Math.sin(a), c = Math.cos(a);
        props.box('plain', p.x + c * 6, p.y + 14 + s * 6, p.z + F * 3.2, 1.6, 12, 0.2, 0, 0xd8d0c0, 0, -a + Math.PI / 2);
      }
      cover.addCylinder({ x: p.x, z: p.z, radius: 4, height: 10 });
    }
    for (let i = 0; i < 8; i++) {
      const x = -400 + i * 105 + (r() - 0.5) * 30, z = dykeZ(x) - 30 - r() * 20;
      if (x > 300 || onRoadL(x, z) || glass.some((g) => Math.abs(g.x - x) < 30 && Math.abs(g.z - z) < 26)) continue;
      buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, 0);
    }

    // ---- Den Haag: the post-war blocks of flats and the brick terraces at the city’s edge, a church
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, dd = 34 + r() * 120, x = 60 + Math.cos(a) * dd * 1.4, z = -640 + Math.sin(a) * dd * 0.6;
      if (Math.abs(x) > 480 || onRoadL(x, z) || nearPoint(x, z, 20)) continue;
      if (i % 3 === 0) props.flatHouse({ ...W(x, z), yaw: 0, width: 30, depth: 11, storeys: 4 + Math.floor(r() * 3), name: 'block of flats' });
      else props.townHouse({ ...W(x, z), yaw: 0, width: 16 + r() * 8, depth: 9, storeys: 3, name: 'terrace', damaged: 0 });
    }
    props.church(W(-20, -690));
    commandPost(props, this.bases.nato, -1, 0x6a6e52);

    // ---- across the Nieuwe Waterweg: Europoort on the Maasvlakte — the oil tanks and the flare stacks on the skyline
    for (let i = 0; i < 26; i++) {
      const x = -640 - (i % 5) * 70 - r() * 20, z = -180 - Math.floor(i / 5) * 90 - r() * 20;
      const p = at(x, z), rad = 12 + r() * 6;
      cyl(x, z, p.y, rad, rad, 14 + r() * 6, i % 4 ? 0xd8d6ce : 0x9a9c96);
    }
    for (const [x, z, h] of [[-700, -700, 70], [-860, -560, 60], [-760, -120, 55]] as [number, number, number][]) { const p = at(x, z); cyl(x, z, p.y, 1.2, 2, h, 0x8a8c88); }
    props.finish();

    // ---- trees: sea buckthorn and stunted pines in the dunes, the woods at Den Haag’s edge, none in the polders
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) }];
    const treeK = (x: number, z: number) => {
      const lz = F * z, back = shoreZ(x) - lz;
      if (back < 80 || inHarbour(x, lz) || chanK(x) > 0 || Math.abs(x) > 495) return 0;
      if (townK(x) < 0.3 && back < 240) return smoothstep(0.0, 0.4, fbm(noise, x * 0.01 + 7, lz * 0.01, 2)) * 0.6;               // dune scrub
      if (lz < -540 && lz > -720 && x < -200) return 0.8;                                                                       // the woods west of Den Haag (Ockenburgh)
      return 0;
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 900, broadleaf: 0.4, autumn: 0.2, maxY: 40,
      avoid: [...avoid, { test: (x: number, z: number) => treeK(x, z) <= 0 }], forest: treeK });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => { const lz = F * z; return shoreZ(x) - lz < 60 || inHarbour(x, lz) || chanK(x) > 0 || (townK(x) > 0.5 && shoreZ(x) - lz < 430); } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
