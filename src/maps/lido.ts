// The Lido of Venice, 1918 (coastal, the 1918 epoch: Austria-Hungary lands, Italy and Britain hold; 1.2 × 1.5 km).
// HYPOTHETICAL: this landing never happened. After Caporetto (October–November 1917) the Italian line fell back to
// the Piave, and Venice lay within reach of the Austro-Hungarian heavy guns at its mouth; the k.u.k. Kriegsmarine
// bombarded the coast from the sea and its torpedo boats raided as far as the lagoon. The Italians feared the next
// step — troops put ashore on the Lido behind the Piave line — and fortified the barrier island: batteries in the
// dunes, wire and trenches along the bathing beach, the Regia Marina’s Brigata Marina (the San Marco regiment) in
// the line and in Venice, British units in reserve. Here the k.u.k. army’s storm troops come in at dawn in launches
// towed down from Trieste, under the guns of the scout cruisers and the Tátra-class destroyers.
// On the map: the long, thin Lido barrier island with its Adriatic sand beach, bathing huts and small wooden piers;
// the Grand Hotel des Bains behind the Lungomare and the Moorish Excelsior on the sand; the Gran Viale across the
// island to Santa Maria Elisabetta on the lagoon, where the vaporetti run to San Marco; at the northern tip the San
// Nicolò fort, church and the Porto di Lido channel; in the south Malamocco village on the lagoon, the pine woods
// and wild dunes of the Alberoni and the Malamocco channel between their stone jetties. Behind it all the shallow
// lagoon, its mooring posts, and across it the skyline of Venice: the Campanile, the domes of San Marco, the
// Doge’s Palace, the Salute, San Giorgio Maggiore on its island.
// Laid out like Gotland (maps/gotlandLanding.ts) in a frame with the sea toward +z (`L`), then turned round: the
// lander (pact) is on -z, so the sea is there (systems/Landing.js lands()).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2200;
const BOUNDS = { x: 600, z: 750 };
const noise = createNoise2D(1918_11);
const sea = createSea({ level: 0, size: SIZE, color: 0x3e6a6e }); // (the milky green upper Adriatic)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The Adriatic waterline (local z): the Lido’s beach runs nearly dead straight. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.3, 2) * 6;
/** The lagoon shore (local z): the island about 850 m across at Santa Maria Elisabetta, narrowing toward Malamocco and the Alberoni. */
const lagoonZ = (x: number) => -700 + 260 * smoothstep(150, 450, x) + fbm(noise, x * 0.006, 5.7, 2) * 10;
/** The two channels through the barrier island past the bounds: the Porto di Lido (north, -x) and the Malamocco channel (south). */
const CHANNEL = [612, 760];
const JETTY = { x: 606, half: 4, out: 420, deck: 3.2 }; // (the dighe: stone jetties along the channels’ sides, far out to sea)
/** How much wild dune there is at x: the San Nicolò and Alberoni ends; low along the hotels’ bathing beach. */
const duneK = (x: number) => 0.35 + 0.65 * smoothstep(220, 420, Math.abs(x - 20));
/** Venice across the lagoon, and San Giorgio Maggiore on its island in front (local frame, outside the bounds: scenery). */
const VENICE = { x: -150, z: -1070, rx: 520, rz: 90 };
const SAN_GIORGIO = { x: 240, z: -930, r: 45 };

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const ax = Math.abs(x);
  if (ax > JETTY.x - JETTY.half && ax < JETTY.x + JETTY.half && z > lagoonZ(x) && z < shoreZ(x) + JETTY.out) return JETTY.deck; // the jetties
  const d = z - shoreZ(x); // + out to sea
  if (d > 0) return Math.max(-0.8 - d * 0.12 - Math.max(0, d - 40) * 0.03, -14) + fbm(noise, x * 0.01, z * 0.01, 2) * 0.4; // a short shelf, then deeper: the launches ground close in
  const dl = z - lagoonZ(x); // + on the island
  if (dl < 0) { // the lagoon: shallow everywhere, Venice and San Giorgio standing out of it
    const v = Math.hypot((x - VENICE.x) / VENICE.rx, (z - VENICE.z) / VENICE.rz), g = Math.hypot(x - SAN_GIORGIO.x, z - SAN_GIORGIO.z) / SAN_GIORGIO.r;
    if (v < 1 || g < 1) return 2.6;
    return -1.7 + fbm(noise, x * 0.008, z * 0.008, 2) * 0.4;
  }
  const back = -d; // m inland of the waterline
  const beach = 0.4 + Math.min(back, 40) * 0.1;
  const dunes = (5 + fbm(noise, x * 0.012, 3.1, 2) * 3) * Math.exp(-(((back - 72) / 26) ** 2)) * duneK(x);
  const land = 3.8 + fbm(noise, x * 0.004, z * 0.004, 3) * 0.6; // (flat: the Lido is a sand bar — kept clear of the water sheet, as Zeebrugge’s polder)
  let h = back < 140 ? Math.max(beach + dunes * smoothstep(20, 45, back), Math.min(land, beach + back * 0.2)) : land + dunes * 0.3;
  h = -1.7 + (h + 1.7) * smoothstep(0, 7, dl);                                // the lagoon’s quays and mud banks: a short drop to the water
  if (ax > CHANNEL[0] && ax < CHANNEL[1]) h = Math.min(h, -7 + 10 * smoothstep(CHANNEL[0] + 12, CHANNEL[0], ax) + 10 * smoothstep(CHANNEL[1] - 12, CHANNEL[1], ax)); // the channels
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The lengthwise road (local z): Via Sandro Gallo, then Via Malamocco down the island to the Alberoni. */
const longZ = (x: number) => lagoonZ(x) + 220;
/** Roads (local frame). */
function onRoadL(x: number, z: number) {
  const sz = shoreZ(x), ax = Math.abs(x);
  if (ax > 600) return false;
  if (Math.abs(z - (sz - 115)) < 4 && ax < 560) return true;                                          // the Lungomare
  if (Math.abs(x + 170) < 5.5 && z < sz - 115 && z > lagoonZ(x) + 8) return true;                       // the Gran Viale
  if (Math.abs(z - longZ(x)) < 3.5 && x > -560 && x < 560) return true;                                 // Via Sandro Gallo / Via Malamocco
  if (Math.abs(z - (lagoonZ(x) + 16)) < 3.5 && x > -560 && x < 120) return true;                        // the Riviera along the lagoon
  if (Math.abs(x + 420) < 3.5 && z < sz - 115 && z > lagoonZ(x) + 16) return true;                      // up past the San Nicolò fort
  if (Math.abs(x - (420 + Math.sin(z * 0.01) * 12)) < 3.5 && z < sz - 115 && z > longZ(x)) return true; // to the Alberoni beach
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);

const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
/** The beach sectors (x) and what each opens inland (local). */
export const SECTORS = [
  { x: -400, name: 'San Nicolò beach', inland: { name: 'Forte San Nicolò', x: -470, z: -190 } },
  { x: 60, name: 'Excelsior beach', inland: { name: 'Gran Viale', x: -150, z: -95 } },
  { x: 420, name: 'Alberoni beach', inland: { name: 'Malamocco', x: 380, z: -290 } },
];
const DES_BAINS = { x: -60, z: shoreZ(-60) - 160 };
const EXCELSIOR = { x: 120, z: shoreZ(120) - 78 };
const SME = { x: -150, z: -625 }; // Santa Maria Elisabetta, on the lagoon

const points: ControlPointDef[] = [
  { id: 'A', name: 'The k.u.k. flotilla', ...W(0, 640), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, ...W(-400, shoreZ(-400) - 42), owner: null, sector: 'west', radius: 48, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, ...W(40, shoreZ(40) - 42), owner: null, sector: 'centre', radius: 48, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, ...W(420, shoreZ(420) - 42), owner: null, sector: 'east', radius: 48, opens: 'G' },
  { id: 'E', name: 'Forte San Nicolò', ...W(SECTORS[0].inland.x, SECTORS[0].inland.z), owner: null, sector: 'west' },
  { id: 'F', name: 'Gran Viale', ...W(SECTORS[1].inland.x, SECTORS[1].inland.z), owner: null, sector: 'centre' },
  { id: 'G', name: 'Malamocco', ...W(SECTORS[2].inland.x, SECTORS[2].inland.z), owner: null, sector: 'east' },
  { id: 'K', name: 'Santa Maria Elisabetta', ...W(SME.x, SME.z + 10), owner: 'nato', sector: 'centre' },
];

export default {
  id: 'lido',
  name: 'Lido',
  description: 'Venice, 1918 — the landing the Italians feared after Caporetto: Austro-Hungarian storm troops come ashore on the Lido at dawn, past the bathing huts, the Excelsior and the Grand Hotel des Bains, into the dunes of San Nicolò and the Alberoni, with the domes and campanili of Venice across the lagoon behind.',
  epochs: ['1918'],
  region: 'italy',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  armies: { nato: ['it', 'uk'], pact: ['ah'] },
  conditions: { time: 'dawn', weather: 'clear' },
  wind: { from: 60, speed: 3, veer: 0.1 }, // (the bora’s tail off the Adriatic: a light north-easterly)
  airfields: [], // (a sand bar of villas and gardens: no strip on the island’s width; San Nicolò’s field is past the map’s end)
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 7000 },
  seed: 1918,
  height,
  river: sea,
  fields: createFields({ seed: 1918, cell: 70 }),

  theme: {
    // a hazy Venetian dawn: the sun up out of the Adriatic, the lagoon pearl-grey, the city pink across it
    fogColor: 0xd2c8bc, fogDensity: 0.00034,
    skyTop: 0x6e8aac, skyHorizon: 0xf0d8bc, skyBottom: 0x9a9890,
    sunColor: 0xffe0b8, sunIntensity: 2.0, sunDisk: 0.6,
    clouds: 0.2, cloudLight: 0xf8e8d8, cloudDark: 0xa8a4a0,
    sunDir: [0.3, 0.3, -0.9], // (out over the sea: the Adriatic is east of the Lido)
    hemiSky: 0xd4dce4, hemiGround: 0x8a8060, hemiIntensity: 1.3,
    rimColor: 0xf4dcc0, rimIntensity: 0.3,
    terrain: {
      grass: '#76804c', grassAlt: '#6c7848', dryGrass: '#aaa070', dirt: '#8a7a5a', rock: '#b0a892',
      pasture: '#74804a', ploughed: '#8a7656', stubble: '#a89c68', meadow: '#7a864e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x), ax = Math.abs(x);
        if (ax > JETTY.x - JETTY.half && ax < JETTY.x + JETTY.half && y > 2) return [0xa8a49a, 1];        // the jetties’ Istrian stone
        if (y > 1.5 && lz < lagoonZ(x) - 20) return [0xb4a48c, 1];                                      // Venice’s fondamenta and campi
        if (onRoadL(x, lz)) return [0x8a8070, 0.85];                                                     // the roads: white dust
        if (lz > sz + 2) return [y > -1.5 ? 0xd4c8a4 : 0x8a8a74, 1];                                     // the sand under the water
        if (lz > sz - 48) return [0xe2d4b0, 1];                                                          // the beach: fine pale sand
        if (lz > sz - 120) return [0xcabd94, 0.55 + duneK(x) * 0.35];                                   // the dunes’ sand through the marram grass
        if (lz < lagoonZ(x) + 8) return [y < 0 ? 0x6a6a56 : 0x8a826a, 1];                               // the lagoon’s mud banks and quays
        return null;                                                                                     // gardens and vegetable plots
      },
    },
  },

  bases: { nato: { x: SME.x, z: F * (SME.z - 45), entries: [-420, -150, 100] }, pact: { x: 0, z: F * 700, entries: SECTORS.map((s) => s.x) } }, // (Austria-Hungary lands: its roads are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: -100, z: 120 }, pact: { x: 0, z: -300 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the storm troops’ boats: the k.u.k. army has no landing craft of its own (data/units1918/ships.js: none written for `ah`),
    // so the side’s launches and ferries bring them in (systems/Landing.js craft)
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    launchZ: 640,
    signal: { t: 15, say: 'The Tátras are casting off the tows — the launches run in for the Lido', sayOther: 'Boats off the Lido! The Austrians are landing — stand to!' },
    // what the k.u.k. Kriegsmarine sends in: the destroyers inshore over the beach, a Novara out in the offing against the batteries
    navy: ['destroyer', 'lightCruiser'],
    // the guns: the heavy batteries of the San Nicolò fort and in the dunes (ships only: the cruisers and destroyers must find them), a field battery inland
    forts: [
      { unit: 'coastBattery', name: 'Forte San Nicolò', ...W(-540, 72), facing: Math.PI },
      { unit: 'coastBattery', name: 'Batteria Alberoni', ...W(500, 74), facing: Math.PI },
      { unit: 'coastBattery', name: 'Batteria Lido', ...W(-280, 76), facing: Math.PI },
      { unit: 'artillery', ...W(-20, -420), facing: Math.PI },
    ],
    // the works dug since Caporetto: wire along the whole beach, trenches and machine-gun posts in the dunes over each sector, a line before the hotels
    works: [
      ...Array.from({ length: 100 }, (_, i) => { const x = -560 + i * 11.3; return { kind: 'wire', ...W(x, shoreZ(x) - 26), yaw: 0 }; }),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 62), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-24, 24].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 55), yaw: Math.PI }))),
      ...[-180, -140, 200, 240].map((x) => ({ kind: 'trench', ...W(x, shoreZ(x) - 62), yaw: 0 })),
    ],
    // the Brigata Marina’s sailors in the dunes and at the fort, the Bersaglieri’s machine guns, gunners, a few marksmen in the hotels
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar'],
    names: { rifles: 'Fanteria di Marina', mgTeam: 'Mitraglieri' },
    hold: [...SECTORS.flatMap((s) => [-45, -24, 24, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 55 : 62)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the reserve from Venice: the San Marco regiment across the lagoon in the vaporetti, a section of armoured cars from the Riviera
    counter: { t: 420, units: ['rifles', 'mgTeam', 'reconVehicle', 'rifles'], say: 'The San Marco regiment is landing at Santa Maria Elisabetta — the vaporetti have brought it across from Venice', sayOther: 'Italian marines landing from the lagoon — and armoured cars on the Gran Viale!' },
    ai: { order: ['rifles', 'stormTroops', 'mgTeam', 'rifles', 'mineClear', 'mortar', 'rifles', 'stormTroops', 'mgTeam', 'engineers', 'rifles', 'reconVehicle'], gunship: 'destroyer', gunships: 1, heavy: 'lightCruiser', inshore: 380 },
    economy: { reserves: 2400, perSector: 750, beachIncome: 1.2, defenceCp: 750, defenceIncome: 1.1 }, // (AI vs AI 2026-11-23: at 2000/600/0.7/1.4 the Italians held every village easily)
    waves: [
      // first light: the Sturmbataillon in the launches, into all three beaches at once
      { t: 0, units: [
        { unit: 'stormTroops', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'engineers', sector: 1 },
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 2 }, { unit: 'stormTroops', sector: 2 },
      ] },
      { t: 150, say: 'The second wave is coming in — Bosnian infantry and the mortars', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'mortar', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1918);
    sea.build(scene, terrain);
    const at = (x: number, z: number) => { const w = W(x, z); return { ...w, y: terrain.heightAt(w.x, w.z) }; };
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < m);
    const clear = (x: number, z: number, m = 12) => !onRoadL(x, z) && !onRoadL(x + 7, z) && !onRoadL(x - 7, z) && !onRoadL(x, z + 7) && !onRoadL(x, z - 7) && !nearPoint(x, z, m);
    const geo = (key: string, g: THREE.BufferGeometry, x: number, y: number, z: number, color: number, yaw = 0) => {
      const w = W(x, z);
      props.push(key, g, new THREE.Matrix4().compose(new THREE.Vector3(w.x, y, w.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1)), color);
    };
    const dome = (x: number, y: number, z: number, rad: number, color: number) => geo('plaster', new THREE.SphereGeometry(rad, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, y, z, color);
    const BRICK = 0xa45a40, ISTRIAN = 0xe6e0d0, CREAM = 0xeadcc0, TIMBER = 0x6a5440, TILE = 0x9a4a32;

    // ---- the Grand Hotel des Bains behind the Lungomare: the long cream façade, the higher centre block, the garden in front
    props.hall({ ...W(DES_BAINS.x, DES_BAINS.z), yaw: 0, width: 96, depth: 18, height: 15, color: CREAM, roof: TILE, door: 6, name: 'Grand Hotel des Bains' });
    { const p = at(DES_BAINS.x, DES_BAINS.z); props.box('plaster', p.x, p.y + 17, p.z, 24, 4.5, 19, 0, CREAM); props.box('plain', p.x, p.y + 19.6, p.z, 25, 0.8, 20, 0, TILE); }
    // ---- the Excelsior on the sand: the Moorish front with its striped arches, the domed corner towers, its pier
    props.hall({ ...W(EXCELSIOR.x, EXCELSIOR.z), yaw: 0, width: 72, depth: 22, height: 13, color: 0xd8b48c, roof: 0x8a5a3a, door: 8, name: 'Hotel Excelsior' });
    { const p = at(EXCELSIOR.x, EXCELSIOR.z);
      for (const dx of [-36, 36]) { props.box('plaster', p.x + dx, p.y + 9, p.z, 8, 18, 8, 0, 0xd8b48c); dome(EXCELSIOR.x + dx, p.y + 18, EXCELSIOR.z, 4.6, 0x5a8a7a); } // (the green copper domes)
      props.box('plaster', p.x, p.y + 11, p.z - 10.5, 30, 3, 1.4, 0, 0xb05a40);                       // the red band of the loggia
      dome(EXCELSIOR.x, p.y + 13, EXCELSIOR.z, 7, 0x5a8a7a);
      cover.addBox({ x: p.x - 36, z: p.z, yaw: 0, length: 8, thickness: 8, height: 18 }); cover.addBox({ x: p.x + 36, z: p.z, yaw: 0, length: 8, thickness: 8, height: 18 }); }
    // ---- the piers: the Excelsior’s and the bathing establishments’, timber decks on piles out over the water
    for (const px of [120, -60, -330, 300]) {
      const z0 = shoreZ(px) - 10, len = px === 120 ? 110 : 70;
      for (let t = 0; t < len; t += 6) { const w = W(px, z0 + t); props.box('plain', w.x, 0.6, w.z, 3.4, 0.3, 6.2, 0, 0x8a7458); for (const s of [-1.5, 1.5]) props.box('plain', w.x + s, -1.5, w.z, 0.3, 4.4, 0.3, 0, TIMBER); }
      if (px === 120) { const w = W(px, z0 + len); props.box('plain', w.x, 2.2, w.z, 9, 3, 7, 0, 0xe8e0d0); props.box('plain', w.x, 3.9, w.z, 10, 0.4, 8, 0, 0x5a8a7a); } // (its pavilion at the end)
    }
    // ---- the bathing huts (capanne): striped timber rows on the sand before the hotels
    for (let row = 0; row < 2; row++) for (let x = -300; x < 300; x += 4.2) {
      if (SECTORS.some((s) => Math.abs(s.x - x) < 12) || Math.abs(x - 120) < 40 || r() < 0.12) continue;
      const p = at(x, shoreZ(x) - 34 - row * 9);
      props.box('plain', p.x, p.y + 1.1, p.z, 3.4, 2.2, 3, 0, row ? 0xd8d0c0 : 0xe8e4dc);
      props.box('plain', p.x, p.y + 2.35, p.z, 3.8, 0.3, 3.4, 0, (Math.round(x / 4.2) & 1) ? 0x3a5a8a : 0xa84a3a);
    }
    // ---- the Liberty villas and pensioni of Lido town, along the Gran Viale and behind the Lungomare
    for (let i = 0; i < 120; i++) {
      const x = -540 + r() * 620, z = shoreZ(x) - 135 - r() * 560;
      if (z < lagoonZ(x) + 30 || !clear(x, z, 26) || Math.hypot(x - DES_BAINS.x, z - DES_BAINS.z) < 70 || Math.hypot(x + 470, z + 190) < 60 || Math.hypot(x - SME.x - 20, z - SME.z) < 70 || Math.hypot(x + 520, z + 570) < 70) continue;
      if (r() < 0.5) props.townHouse({ ...W(x, z), yaw: (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.08, width: 8 + r() * 4, depth: 9 + r() * 2, storeys: 2 + (r() < 0.3 ? 1 : 0), damaged: 0 });
      else props.flatHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9 + r() * 4, depth: 8 + r() * 3, storeys: 2, name: 'villa' });
    }
    // ---- Santa Maria Elisabetta: the church, the vaporetto landing stage, the boats at the quay
    props.church({ ...W(SME.x + 40, SME.z + 30), yaw: 0 });
    { const w = W(SME.x - 20, lagoonZ(SME.x - 20) - 12); props.box('plain', w.x, 0.5, w.z, 24, 1, 8, 0, 0x6a5a48); props.box('plain', w.x, 3.2, w.z, 24, 0.3, 8, 0, 0x3a5a4a); for (const s of [-10, 10]) props.box('plain', w.x + s, 1.9, w.z, 0.3, 2.6, 0.3, 0, TIMBER); }
    for (let i = 0; i < 5; i++) { const w = W(SME.x + 30 + i * 14, lagoonZ(SME.x + 30 + i * 14) - 8); props.box('plain', w.x, 0.2, w.z, 2.2, 0.8, 9, 0.2, 0x2a2420); } // (gondolas and sandoli at the quay)
    // ---- San Nicolò: the fort’s brick walls, the church and monastery on the channel, the old cemetery
    { const c = SECTORS[0].inland;
      for (const [dx, dz, yaw, len] of [[0, 40, 0, 70], [0, -40, 0, 70], [-35, 0, Math.PI / 2, 80], [35, 20, Math.PI / 2, 38]] as [number, number, number, number][]) props.wall({ ...W(c.x + dx, c.z + dz), yaw, length: len, height: 2.4, thickness: 1.2 });
      props.hall({ ...W(c.x - 15, c.z - 15), yaw: 0, width: 30, depth: 10, height: 5, color: BRICK, roof: 0x6a4a3a, door: 4, name: 'casemate' }); }
    props.church({ ...W(-470, -600), yaw: Math.PI / 2 });
    for (let i = 0; i < 4; i++) props.hall({ ...W(-560 + (i % 2) * 34, -540 - Math.floor(i / 2) * 28), yaw: 0, width: 22, depth: 10, height: 7, color: 0xb88a6a, roof: TILE, door: 3, name: 'monastery' });
    // ---- the batteries in the dunes: concrete magazines behind the guns, a range-finding tower
    for (const [bx, bz] of [[500, 74], [-280, 76], [-540, 72]] as [number, number][]) {
      for (const dx of [-18, 18]) { const p = at(bx + dx, bz - 20); props.box('stone', p.x, p.y + 1.3, p.z, 9, 2.6, 6, 0, 0x9a968a); }
      props.tower({ ...W(bx + (bx > 0 ? -40 : 40), bz - 62), concrete: true });
    }
    // ---- Malamocco: the old fishing village on the lagoon, its church and campanile
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, dd = 30 + r() * 80, x = 380 + Math.cos(a) * dd, z = -300 + Math.sin(a) * dd * 0.7;
      if (z < lagoonZ(x) + 25 || !clear(x, z, 22)) continue;
      props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 6 + r() * 3, depth: 8, storeys: 2 + (r() < 0.3 ? 1 : 0), damaged: 0, name: 'house' });
    }
    props.church({ ...W(440, -390), yaw: Math.PI / 2 });
    // ---- the lagoon: the bricole (mooring posts) marking the channel to Venice, fishing boats, a few fishermen’s huts on piles
    for (let i = 0; i < 30; i++) {
      const t = i / 29, x = SME.x - 30 + t * -40 + Math.sin(i) * 3, z = lagoonZ(SME.x) - 40 - t * 300;
      for (const s of [-8, 8]) { const w = W(x + s, z); props.box('plain', w.x, 0.2, w.z, 0.5, 4.5, 0.5, 0, TIMBER); }
    }
    for (let i = 0; i < 8; i++) { const x = -500 + r() * 900, z = lagoonZ(x) - 60 - r() * 160, w = W(x, z); props.box('plain', w.x, 0.2, w.z, 2.6, 0.9, 10, r() * 3, 0x3a3028); }
    // ---- the jetties: their lights at the far ends
    for (const s of [-1, 1]) { const w = W(s * JETTY.x, shoreZ(s * JETTY.x) + JETTY.out - 6); props.box('stone', w.x, JETTY.deck + 3, w.z, 3, 6, 3, 0, 0xc8c0b0); props.box('plain', w.x, JETTY.deck + 6.6, w.z, 2.2, 1.2, 2.2, 0, 0xb83a2a); }

    // ---- Venice across the lagoon (scenery): the Riva’s palaces, the Doge’s Palace, San Marco’s domes and the Campanile, the Salute, San Giorgio
    const vy = 2.6;
    for (let x = VENICE.x - 480; x < VENICE.x + 460; x += 14 + r() * 8) { // the palaces along the waterfront
      if (Math.abs(x - 20) < 70) continue;
      const h = 12 + r() * 10, w = W(x, VENICE.z + 55 + r() * 10);
      props.box('plaster', w.x, vy + h / 2, w.z, 12 + r() * 6, h, 16, 0, [0xd8b49a, 0xe0c8a8, 0xc89a80, 0xe8d8c0, 0xb87a64][Math.floor(r() * 5)]);
      props.box('plain', w.x, vy + h + 0.4, w.z, 14, 0.8, 17, 0, TILE);
    }
    { const ducale = W(20, VENICE.z + 52); props.box('plaster', ducale.x, vy + 12, ducale.z, 72, 24, 26, 0, 0xe8c8b8); props.box('stone', ducale.x, vy + 4, ducale.z - 13.6, 72, 8, 1.2, 0, ISTRIAN); } // (the Doge’s Palace: pink and white above its arcades)
    { const bx = 0, bz = VENICE.z + 10; // the Basilica: five domes on their drums, the lantern atop each
      props.box('stone', W(bx, bz).x, vy + 12, W(bx, bz).z, 50, 24, 60, 0, 0xd8c8b0);
      for (const [dx, dz] of [[0, 0], [0, 22], [0, -22], [20, 0], [-20, 0]]) { geo('stone', new THREE.CylinderGeometry(7, 7, 6, 16), bx + dx, vy + 27, bz + dz, 0xd8c8b0); dome(bx + dx, vy + 30, bz + dz, 8, 0x8a9a92); geo('plain', new THREE.ConeGeometry(1.2, 6, 8), bx + dx, vy + 41, bz + dz, 0xc8a050); } }
    { const c = W(-50, VENICE.z + 40); // the Campanile of San Marco: the brick shaft, the belfry, the green pyramid and the angel, 98 m
      props.box('stone', c.x, vy + 25, c.z, 12, 50, 12, 0, BRICK); props.box('stone', c.x, vy + 56, c.z, 13, 12, 13, 0, ISTRIAN); props.box('stone', c.x, vy + 66, c.z, 12, 8, 12, 0, BRICK);
      geo('plain', new THREE.ConeGeometry(8.5, 24, 4), -50, vy + 82, VENICE.z + 40, 0x6a8a7a, Math.PI / 4); geo('plain', new THREE.ConeGeometry(0.8, 4, 6), -50, vy + 96, VENICE.z + 40, 0xd8b050); }
    { const sx = -420, sz = VENICE.z + 40; // Santa Maria della Salute at the mouth of the Grand Canal: the octagon, the great dome, the lantern
      geo('stone', new THREE.CylinderGeometry(26, 26, 26, 8), sx, vy + 13, sz, ISTRIAN); geo('stone', new THREE.CylinderGeometry(19, 19, 10, 16), sx, vy + 31, sz, ISTRIAN);
      dome(sx, vy + 36, sz, 19, 0xb8b8b0); geo('stone', new THREE.CylinderGeometry(3.5, 3.5, 8, 12), sx, vy + 58, sz, ISTRIAN); dome(sx, vy + 62, sz, 3.5, 0xb8b8b0);
      geo('stone', new THREE.CylinderGeometry(10, 10, 8, 16), sx + 30, vy + 18, sz - 10, ISTRIAN); dome(sx + 30, vy + 22, sz - 10, 10, 0xb8b8b0); }
    for (const [x, h] of [[-260, 50], [180, 60], [330, 45]] as [number, number][]) { const c = W(x, VENICE.z + 20); props.box('stone', c.x, vy + h / 2, c.z, 7, h, 7, 0, BRICK); geo('plain', new THREE.ConeGeometry(5, 12, 4), x, vy + h + 6, VENICE.z + 20, 0x7a5a4a, Math.PI / 4); } // (more campanili over the roofs)
    { const g = SAN_GIORGIO, c = W(g.x, g.z); // San Giorgio Maggiore: Palladio’s white front and dome, its campanile
      props.box('stone', c.x, vy + 12, c.z, 30, 24, 50, 0, ISTRIAN); dome(g.x, vy + 26, g.z - 8, 10, 0xb8b8b0);
      const t = W(g.x + 24, g.z - 20); props.box('stone', t.x, vy + 30, t.z, 8, 60, 8, 0, BRICK); geo('plain', new THREE.ConeGeometry(5.5, 14, 8), g.x + 24, vy + 67, g.z - 20, 0x6a8a7a); }

    commandPost(props, this.bases.nato, -1, 0x7a7a5a);
    props.finish();

    const island = (x: number, z: number) => { const lz = F * z; return Math.abs(x) < 600 && lz < shoreZ(x) - 40 && lz > lagoonZ(x) + 10; };
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { test: (x: number, z: number) => onRoad(x, z) || onRoad(x + 4, z) || onRoad(x - 4, z) }];
    // the Alberoni and San Nicolò pine woods; the plane trees along the Gran Viale; gardens and tamarisks round the villas
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 900, broadleaf: 0, autumn: 0, maxY: 30,
      avoid: [...avoid, { test: (x: number, z: number) => !island(x, z) || F * z > shoreZ(x) - 100 }],
      forest: (x: number, z: number) => smoothstep(260, 420, Math.abs(x - 20)) * (0.4 + 0.4 * fbm(noise, x * 0.008 + 3, z * 0.008, 2)) });
    const gardens = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 700, broadleaf: 0.9, autumn: 0, maxY: 30,
      avoid: [...avoid, { test: (x: number, z: number) => !island(x, z) || F * z > shoreZ(x) - 125 }],
      forest: (x: number, z: number) => (Math.abs(x + 170) < 11 ? 0.9 : smoothstep(0.1, 0.5, fbm(noise, x * 0.01 + 7, z * 0.01, 2)) * 0.5) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => !island(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { pines.update?.(dt, t); gardens.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
