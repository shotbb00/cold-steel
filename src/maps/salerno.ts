// The Gulf of Salerno, 1985 (coastal: the Soviet naval infantry lands, NATO holds; 1.0 × 1.8 km). South of Naples
// and AFSOUTH, NATO’s southern headquarters, on the beaches the Allies came ashore on in September 1943 (Avalanche):
// a Soviet landing from the Black Sea Fleet’s Mediterranean squadron to turn Naples from the south. Out at sea the
// landing ships and the mine barrier the Italian navy laid across the gulf; then thirty kilometres of straight sand,
// compressed here to nine hundred metres: in the west the beach at Magazzeno below Pontecagnano, where the British
// landed; in the middle the Sele’s mouth, the river running out between sandbars and its banks of reeds, and the
// beach south of it before the Tabacchificio — the tobacco factory of 1943, its long brick warehouses on the plain;
// in the east Paestum’s beach, where the Americans landed, and behind it the Greek city inside its walls with the
// temples of Neptune and Hera and the Temple of Athena. Behind the beach a low dune belt under umbrella pines (the
// Pineta), the coast road, the flat plain of the Sele with its buffalo farms, tobacco fields and warehouses, the
// SS18 along the foot of the hills, and up on the hills Capaccio, NATO’s ground, with Monte Soprano behind. The
// Monti Lattari and the Amalfi coast stand on the skyline to the north-west.
// (Compressed: Magazzeno to Paestum is 25 km; here 700 m. The real coast runs north-west to south-east, here
// straight across the map. The Sele’s course is shortened: it leaves the map to the west instead of running east.)
// Laid out like Scheveningen (maps/scheveningen.ts) in a frame with the sea toward +z (`L`), then turned round: the
// Pact’s side is -z, so the sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
// The Sele is no river of its own: a channel cut below the sea’s level (as Scheveningen’s Nieuwe Waterweg), too deep
// to wade, crossed by the coast road’s bridge and the Pontecagnano road’s bridge (causeways with a deck on them).
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
const noise = createNoise2D(1985_43);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f5470 }); // (the Tyrrhenian: clear, deep blue)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The waterline (local z): the gulf’s long straight beach, a little over a hundred and fifty metres from the middle. */
const shoreZ = (x: number) => 170 + fbm(noise, x * 0.003, 4.3, 2) * 8;

/** The Sele (local polyline, out from the mouth to where it leaves the map in the west). */
const RIVER = [[-150, 300], [-150, 175], [-165, 80], [-195, -30], [-250, -150], [-330, -260], [-420, -330], [-580, -390]];
function segD(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const riverD = (x: number, z: number) => { let d = Infinity; for (let i = 0; i < RIVER.length - 1; i++) d = Math.min(d, segD(x, z, RIVER[i], RIVER[i + 1])); return d; };
/** The river’s half-width: wide at the mouth between its sandbars, narrower inland. */
const riverW = (z: number) => 10 + 6 * smoothstep(-50, 150, z);

/** The roads (local): the coast road behind the pines, up from each beach, the farm road, the SS18 under the hills. */
const coastZ = (x: number) => shoreZ(x) - 205 - Math.sin(x * 0.01) * 5;
const westX = (z: number) => -330 + Math.sin(z * 0.012) * 10;   // Magazzeno – Pontecagnano – over the Sele
const centreX = (z: number) => 25 + Math.sin(z * 0.009) * 18;   // Sele beach – the Tabacchificio – Capaccio
const eastX = (z: number) => 370 + Math.sin(z * 0.01) * 10;     // Paestum beach – Via Magna Graecia
const farmZ = (x: number) => -300 + Math.sin(x * 0.008) * 15;
const ssZ = (x: number) => -560 + Math.sin(x * 0.006) * 20;
function roadL(x: number, z: number, m = 0) {
  const back = shoreZ(x) - z;
  if (Math.abs(z - coastZ(x)) < 3.5 + m && Math.abs(x) < 490) return true;
  if (Math.abs(x - westX(z)) < 3.5 + m && back > 40 && z > -560) return true;
  if (Math.abs(x - centreX(z)) < 3.5 + m && back > 40 && z > -660) return true;
  if (Math.abs(x - eastX(z)) < 3.5 + m && back > 40 && z > -560) return true;
  if (Math.abs(z - farmZ(x)) < 3 + m && x > -335 && x < 490) return true;
  if (Math.abs(z - ssZ(x)) < 3.5 + m && Math.abs(x) < 490) return true;
  return false;
}
/** The two bridges over the Sele: where the coast road and the Pontecagnano road cross it. */
const onBridgeRoad = (x: number, z: number) => Math.abs(z - coastZ(x)) < 4.5 || (Math.abs(x - westX(z)) < 4.5 && z < -150);

/** The dunes’ hummocks (0 ± 1) and the plain’s lie and the hills behind (local), sampled once onto a 4 m grid. */
const landC = gridCacheSmooth((x: number, z: number) => {
  const back = shoreZ(x) - z;
  const n = fbm(noise, x * 0.012 + 3, z * 0.012, 3);
  const beach = 0.6 + Math.min(back, 50) * 0.03;
  let h = back < 50 ? beach : beach + (back - 50) * 0.0035 + fbm(noise, x * 0.004, z * 0.004, 2) * 0.6;
  // the low dune belt under the pines (40–180 m back), cut down where the roads come through
  const env = smoothstep(40, 65, back) * smoothstep(180, 130, back);
  const gap = 1 - 0.85 * Math.max(Math.exp(-(((x - westX(z)) / 14) ** 2)), Math.exp(-(((x - centreX(z)) / 14) ** 2)), Math.exp(-(((x - eastX(z)) / 14) ** 2)));
  h += env * (3 + n * 2.5) * gap;
  // the hills: the foot under the SS18, rising to Capaccio and Monte Soprano (sooner in the east, behind Paestum)
  const foot = -470 + 70 * smoothstep(120, 450, x);
  h += smoothstep(foot, foot - 330, z) * (26 + 10 * fbm(noise, x * 0.006 + 9, z * 0.006, 3)) + smoothstep(foot + 40, foot - 60, z) * 2;
  return h;
}, { x: 1000, z: 1000 }, 4);

const BASE_L = { x: 0, z: -830 };
let baseY: number | null = null;

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const d = z - shoreZ(x); // + out to sea
  let h: number;
  if (d > 0) h = Math.max(0.6 - d * 0.02 - Math.max(0, d - 120) * 0.05 + Math.sin(d * 0.07 + x * 0.004) * 0.25 * smoothstep(15, 40, d) * smoothstep(100, 70, d), -20);
  else h = landC(x, z);
  // the Sele: a channel 3 m deep, the banks falling into it; its sandbar mouth out into the sea
  const rd = riverD(x, z), w = riverW(z);
  if (rd < w + 9) {
    const k = smoothstep(w + 9, w, rd);
    h = Math.min(h, h * (1 - k) - 3.2 * k);
    if (onBridgeRoad(x, z) && d < 0) h = Math.max(h, 2.4); // the bridges’ causeways
  }
  // NATO’s base on the hill: graded
  const bd = Math.hypot(x - BASE_L.x, z - BASE_L.z);
  if (bd < 45) { baseY ??= landC(BASE_L.x, BASE_L.z); h += (baseY - h) * smoothstep(45, 25, bd); }
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -330, name: 'Magazzeno', inland: { name: 'Pontecagnano', x: -340, z: -80 } },
  { x: 30, name: 'Sele', inland: { name: 'Tobacco factory', x: 40, z: -250 } },
  { x: 370, name: 'Paestum', inland: { name: 'Paestum', x: 385, z: -130 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Magazzeno beach', ...W(-330, shoreZ(-330) - 44), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Sele beach', ...W(30, shoreZ(30) - 44), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Paestum beach', ...W(370, shoreZ(370) - 44), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Pontecagnano', ...W(-340, -80), owner: null, sector: 'west' },
  { id: 'F', name: 'Tobacco factory', ...W(40, -250), owner: null, sector: 'centre' },
  { id: 'G', name: 'Paestum', ...W(385, -130), owner: null, sector: 'east' },
  { id: 'K', name: 'Capaccio', ...W(40, -650), owner: 'nato', sector: 'centre' },
];

/** Paestum: the Greek city’s walls (local rect) and its three temples [x, z, width, length, columns across, along, column height]. */
const WALLS = { x0: 290, x1: 465, z0: -280, z1: -30 };
const TEMPLES: { name: string; x: number; z: number; w: number; l: number; nx: number; nz: number; h: number }[] = [
  { name: 'Temple of Neptune', x: 325, z: -175, w: 17, l: 40, nx: 6, nz: 14, h: 8 },
  { name: 'Basilica (Temple of Hera)', x: 322, z: -240, w: 17, l: 38, nx: 9, nz: 18, h: 6.5 },
  { name: 'Temple of Athena', x: 330, z: -60, w: 13, l: 28, nx: 6, nz: 13, h: 6.5 },
];
const inTemple = (x: number, z: number, m: number) => TEMPLES.some((t) => Math.abs(x - t.x) < t.w / 2 + m && Math.abs(z - t.z) < t.l / 2 + m);

export default {
  id: 'salerno',
  name: 'Salerno Landing',
  description: 'The Gulf of Salerno, 1985: the long sand beaches of 1943 from Magazzeno to Paestum, the dunes under the umbrella pines, the Sele’s mouth, the tobacco warehouses and buffalo farms on the plain, the Greek temples of Paestum, Capaccio on the hills behind. Soviet naval infantry lands south of Naples; the US Army holds.',
  epochs: ['1985'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  armies: { nato: ['us'], pact: ['sov'] }, // (AFSOUTH’s US troops from Naples hold; the Soviet naval infantry lands)
  conditions: { time: 'dawn', weather: 'clear' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985_43,
  height,
  river: sea,
  airfields: [], // (no strip: pinewoods, ditched tobacco fields and farms, the hills — Airfields off)
  fields: createFields({ seed: 1985_43, cell: 55, weights: [0.45, 0.2, 0.2, 0.15] }),

  theme: {
    // a clear September dawn over the gulf, haze over the plain
    fogColor: 0xd2ccc0, fogDensity: 0.0007,
    skyTop: 0x5a80b8, skyHorizon: 0xe6d8c2, skyBottom: 0x8a8678,
    sunColor: 0xffe2bc, sunIntensity: 2.0, sunDisk: 0.4,
    clouds: 0.15, cloudLight: 0xf8eee0, cloudDark: 0xa8a6a4,
    sunDir: [0.35, 0.5, 0.6],
    hemiSky: 0xd0d8e2, hemiGround: 0x6a6040, hemiIntensity: 1.3,
    rimColor: 0xe0d8cc, rimIntensity: 0.22,
    terrain: {
      grass: '#7a7c40', grassAlt: '#6c7238', dryGrass: '#a89a62', dirt: '#7a6446', rock: '#9a8e74',
      pasture: '#76783c', ploughed: '#6a5238', stubble: '#a49660', meadow: '#7e8240',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, back = shoreZ(x) - lz;
        if (roadL(x, lz)) return [0x5e5c58, 0.9];                                                   // asphalt
        const rd = riverD(x, lz);
        if (rd < riverW(lz) + 2) return [y > -1 ? 0xb8a880 : 0x6a6450, 1];                          // the river’s sand and mud
        if (rd < riverW(lz) + 12 && back > 40) return [0x7a7a4a, 0.85];                             // reeds on the banks
        if (back < -4) return [y > 0.3 ? 0xd8c8a0 : 0xae9e7e, 1];                                   // the sand under the water
        if (back < 50) return [0xe2cf9e, 1];                                                        // the beach: golden sand
        if (back < 185) return noise(x * 0.05, lz * 0.05) > 0.1 ? [0x6e6a40, 0.8] : [0x8e7650, 0.75]; // the Pineta: needles, macchia in patches
        if (lz < WALLS.z1 && lz > WALLS.z0 && x > WALLS.x0 && x < WALLS.x1 && x < eastX(lz) - 6) return [0xa89c78, 0.6]; // the excavated city: grass and stone
        return null;                                                                                // the plain’s fields
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-330, 30, 370] }, pact: { x: 0, z: -830, entries: [-330, 30, 370] } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Italian navy’s mine barrier across the gulf, a lane left off each sector for the sweepers to widen
    seaMines: { z: [520, 580], count: 60, lanes: [-330, 30, 370], lane: 80, seed: 1985_43 },
    // the coastal missile battery on the plain: two launcher trucks that fire on the ships, then move
    forts: [{ unit: 'coastMissile', ...W(-160, -430), facing: Math.PI }, { unit: 'coastMissile', ...W(230, -440), facing: Math.PI }],
    works: [
      ...Array.from({ length: 85 }, (_, i) => { const x = -465 + i * 11; return Math.abs(x + 150) < 32 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 52), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 47), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 47 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    counter: { t: 360, units: ['heavyTank', 'ifv', 'ifv'], say: 'The reserve from Naples is coming down the SS18 past Battipaglia: Abrams and Bradleys, straight for the beachhead', sayOther: 'Enemy armour coming down the SS18 from Battipaglia' },
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2200, perSector: 550, beachIncome: 0.85, defenceCp: 975, defenceIncome: 1.9 }, // (richer than Scheveningen’s: the plain is open, the warehouses and Paestum’s houses hold the landing up — AI vs AI 2026-11-22)
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'pt76', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_43);
    props.rand = mulberry32(1985_44);
    sea.build(scene, terrain);
    const at = (x: number, z: number) => { const w = W(x, z); return { ...w, y: terrain.heightAt(w.x, w.z) }; };
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < m);
    const free = (x: number, z: number, m: number) => !roadL(x, z, m + 3) && riverD(x, z) > riverW(z) + 10 + m && !nearPoint(x, z, 18 + m) && shoreZ(x) - z > 200 + m;
    const geo = (g: THREE.BufferGeometry, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, key = 'stone', rx = 0) => {
      const w = W(x, z);
      props.push(key, g, new THREE.Matrix4().compose(new THREE.Vector3(w.x, y, w.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz)), color);
    };

    // ---- the Monti Lattari and the Amalfi coast on the skyline beyond Salerno (haze-blue, past the fog)
    { const mr = mulberry32(1985_46), mat = new THREE.MeshBasicMaterial({ color: 0xa6b0bc, fog: false });
      for (const [cx, cz, n] of [[-1500, -300, 7], [300, 1600, 5]] as [number, number, number][]) for (let i = 0; i < n; i++) { // (world x, z: the Lattari ridge north-west, Monte Soprano and the Alburni behind Capaccio)
        const rr = 350 + mr() * 300, hh = 110 + mr() * 150, m = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 32, 1, true), mat);
        m.position.set(cx + (cz > 0 ? (i - n / 2) * 380 : (mr() - 0.5) * 300), hh / 2 - 15, cz + (cz > 0 ? (mr() - 0.5) * 300 : (i - n / 2) * 380)); scene.add(m);
      } }

    // ---- Paestum: the walls, the three Doric temples (stylobate, columns, entablature, pediments), the village by the road
    for (const t of TEMPLES) {
      const p = at(t.x, t.z), y0 = p.y;
      props.box('stone', p.x, y0 + 0.6, p.z, t.w + 3, 1.6, t.l + 3, 0, 0xb8a888);
      const cyl = new THREE.CylinderGeometry(0.75, 0.95, t.h, 12);
      for (let i = 0; i < t.nx; i++) for (let j = 0; j < t.nz; j++) {
        if (i > 0 && i < t.nx - 1 && j > 0 && j < t.nz - 1) continue;
        const x = t.x - t.w / 2 + 1 + (i / (t.nx - 1)) * (t.w - 2), z = t.z - t.l / 2 + 1 + (j / (t.nz - 1)) * (t.l - 2);
        geo(cyl, x, y0 + 1.4 + t.h / 2, z, 1, 1, 1, 0xc4ae84);
        cover.addCylinder({ ...W(x, z), radius: 0.9, height: t.h });
      }
      const top = y0 + 1.4 + t.h;
      props.box('stone', p.x, top + 0.9, p.z, t.w + 0.6, 1.8, t.l + 0.6, 0, 0xbca47c);           // the entablature
      geo(new THREE.CylinderGeometry(1, 1, 1, 3), t.x, top + 1.8 + 0.5 * (t.w * 0.18 / 1.5) * 1.5, t.z, (t.w / 2 + 0.3) / 0.866, t.l + 0.6, t.w * 0.18 / 1.5, 0xb49c74, 'stone', -Math.PI / 2); // the pediments and roof line
    }
    props.rand = mulberry32(1985_45);
    const wallRun = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 8), yaw = Math.atan2(-(z1 - z0) * F, x1 - x0);
      for (let i = 0; i < n; i++) {
        const x = x0 + (x1 - x0) * (i + 0.5) / n, z = z0 + (z1 - z0) * (i + 0.5) / n;
        if (roadL(x, z, 4) || r() < 0.12) continue; // (the gates where the roads come in, and the breaches of time)
        props.lowWall({ ...W(x, z), yaw: -yaw, length: len / n + 0.2, height: 2.6, color: 0xa8987a });
      }
    };
    wallRun(WALLS.x0, WALLS.z0, WALLS.x1, WALLS.z0); wallRun(WALLS.x1, WALLS.z0, WALLS.x1, WALLS.z1);
    wallRun(WALLS.x1, WALLS.z1, WALLS.x0, WALLS.z1); wallRun(WALLS.x0, WALLS.z1, WALLS.x0, WALLS.z0);
    for (let i = 0; i < 26; i++) { // the modern village along Via Magna Graecia, east of the road
      const x = 395 + r() * 70, z = -40 - r() * 230;
      if (roadL(x, z, 6) || nearPoint(x, z, 18)) continue;
      props.flatHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 8 + r() * 2, storeys: 1 + Math.floor(r() * 2), name: 'house' });
    }
    props.hall({ ...W(420, -300), yaw: 0, width: 30, depth: 12, height: 6, color: 0xd0c4a8, roof: 0x9a5a40, door: 6, name: 'museum' });

    // ---- the Tabacchificio: long brick warehouses round a yard, the drying lofts’ rows of windows, a chimney
    const tobacco = (x: number, z: number, yaw: number, w: number, name = 'tobacco warehouse') =>
      props.hall({ ...W(x, z), yaw, width: w, depth: 13, height: 9, color: 0xb87a5a, roof: 0x9a5a40, door: 6, name });
    tobacco(95, -230, Math.PI / 2, 60, 'Tabacchificio');
    tobacco(-30, -235, Math.PI / 2, 50, 'Tabacchificio');
    tobacco(40, -195, 0, 44, 'Tabacchificio');
    props.chimney({ ...W(70, -285), height: 24 });
    for (let i = 0, n = 0; i < 300 && n < 8; i++) { // more warehouses out on the plain
      const x = -280 + r() * 760, z = -120 - r() * 360;
      if (!free(x, z, 28) || inTemple(x, z, 40) || (x > WALLS.x0 - 30 && z > WALLS.z0 - 30)) continue;
      tobacco(x, z, r() < 0.5 ? 0 : Math.PI / 2, 34 + r() * 16); n++;
    }

    // ---- Pontecagnano: the village round its square, a church
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, dd = 22 + r() * 80, x = -340 + Math.cos(a) * dd, z = -80 + Math.sin(a) * dd * 0.8;
      if (roadL(x, z, 4) || riverD(x, z) < riverW(z) + 12 || nearPoint(x, z, 16) || x < -490 || shoreZ(x) - z < 195) continue;
      if (r() < 0.7) props.flatHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r() * 4, depth: 8, storeys: 2 + Math.floor(r() * 2), name: 'house' });
      else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0 });
    }
    props.church(W(-395, -120));

    // ---- the Saracen watchtowers on the shore: Torre del Sele by the mouth, Torre di Paestum
    for (const x of [-110, 250]) {
      const p = at(x, shoreZ(x) - 120);
      props.box('stone', p.x, p.y + 6, p.z, 7, 12, 7, 0, 0xa49274); props.box('stone', p.x, p.y + 12.5, p.z, 8, 1, 8, 0, 0x948468);
      cover.addBox({ x: p.x, z: p.z, yaw: 0, length: 7, thickness: 7, height: 12 });
    }

    // ---- the Sele bridges: a deck and parapets over the water, piers in it
    for (const road of ['coast', 'west']) {
      let best = { d: Infinity, x: 0, z: 0 };
      for (let s = -500; s < 200; s += 1) {
        const x = road === 'coast' ? s : westX(s), z = road === 'coast' ? coastZ(s) : s;
        if (road === 'west' && s > -150) continue;
        const d = riverD(x, z); if (d < best.d) best = { d, x, z };
      }
      const len = 2 * riverW(best.z) + 20, p = at(best.x, best.z), w = W(best.x, best.z);
      const yaw = road === 'coast' ? 0 : Math.PI / 2;
      props.box('stone', w.x, p.y + 0.25, w.z, road === 'coast' ? len : 8, 0.5, road === 'coast' ? 8 : len, 0, 0x8a8478);
      for (const o of [-3.8, 3.8]) props.box('stone', w.x + (yaw ? o : 0), p.y + 1, w.z + (yaw ? 0 : o), yaw ? 0.4 : len, 1, yaw ? len : 0.4, 0, 0x9a9488);
    }

    // ---- buffalo farms (masserie) out on the plain, the eucalyptus round them
    for (let i = 0, n = 0; i < 200 && n < 12; i++) {
      const x = -460 + r() * 920, z = -110 - r() * 420;
      if (!free(x, z, 14) || inTemple(x, z, 30) || Math.hypot(x + 340, z + 80) < 110) continue;
      buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, r() * Math.PI); n++;
    }

    // ---- Capaccio on the hill: the village, its church; NATO’s command post
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, dd = 22 + r() * 90, x = 40 + Math.cos(a) * dd * 1.3, z = -650 + Math.sin(a) * dd * 0.7;
      if (roadL(x, z, 4) || nearPoint(x, z, 16) || Math.hypot(x - BASE_L.x, z - BASE_L.z) < 60) continue;
      props.flatHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 8, storeys: 2 + Math.floor(r() * 2), name: 'house' });
    }
    props.church(W(-30, -700));
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);

    // ---- the Pineta: umbrella pines over the dunes — tall bare trunks, flat dark crowns
    const trunk = new THREE.CylinderGeometry(0.22, 0.34, 1, 6), crown = new THREE.SphereGeometry(1, 10, 6);
    for (let i = 0, n = 0; i < 4000 && n < 340; i++) {
      const x = -495 + r() * 990, back = 70 + r() * 115, z = shoreZ(x) - back;
      if (fbm(noise, x * 0.008 + 11, z * 0.008, 2) < -0.15 || roadL(x, z, 4) || riverD(x, z) < riverW(z) + 12 || nearPoint(x, z, 20) || Math.abs(x + 110) < 10 && back > 110) continue;
      const p = at(x, z), hh = 9 + r() * 5, cr = 3.5 + r() * 2;
      geo(trunk, x, p.y + hh / 2, z, 1, hh, 1, 0x5a4636, 'plain');
      geo(crown, x, p.y + hh + 0.6, z, cr, cr * 0.32, cr, r() < 0.5 ? 0x3a4a26 : 0x44522c, 'plain');
      cover.addCylinder({ ...W(x, z), radius: 0.4, height: 4 }); n++;
    }
    props.finish();

    // ---- trees: macchia in the dunes, eucalyptus windbreaks on the plain, olives and holm oak on the hills
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => roadL(x, F * z, 2) || height(x, z) < 0.8 }];
    const treeK = (x: number, z: number) => {
      const lz = F * z, back = shoreZ(x) - lz;
      if (back < 70 || riverD(x, lz) < riverW(lz) + 6 || Math.abs(x) > 495 || inTemple(x, lz, 12)) return 0;
      if (back < 185) return 0.25 * smoothstep(0, 0.4, fbm(noise, x * 0.01 + 7, lz * 0.01, 2));                    // macchia under the pines
      if (lz < -470) return 0.25 + 0.5 * smoothstep(-470, -620, lz) * smoothstep(-0.3, 0.3, fbm(noise, x * 0.006 + 21, lz * 0.006, 2)); // olives, holm oak
      return riverD(x, lz) < riverW(lz) + 30 ? 0.5 : 0.04;                                                        // poplars along the Sele, a few windbreaks
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1400, broadleaf: 0.95, autumn: 0, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => treeK(x, z) <= 0 }], forest: treeK });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => { const lz = F * z; return shoreZ(x) - lz < 50 || riverD(x, lz) < riverW(lz) + 3; } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
