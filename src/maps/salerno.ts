// The Gulf of Salerno, 1985 (coastal: the Soviet naval infantry lands, NATO holds; 1.0 × 1.8 km). South of Naples
// and AFSOUTH, NATO’s southern headquarters, on the beaches the Allies came ashore on in September 1943 (Avalanche):
// a Soviet landing from the Black Sea Fleet’s Mediterranean squadron to turn Naples from the south.
// Laid out on the real ground, as it was in 1943: the gulf’s shore runs north-west to south-east, so here it crosses
// the map on the slant — far out in the north (-x), where the Monti Picentini come down behind Battipaglia, far in
// in the south (+x), where the plain narrows under Capaccio and Monte Soprano. The Sele comes out of the plain in
// the middle between sandbars and reed marsh, and it splits the battle in two as it split Avalanche: north of it the
// British beach at Magazzeno — wide flat sand — and up the Battipaglia road the tobacco factory the Guards fought
// for; south of it the Americans’ beach at Paestum — a narrow strip under the pines — and behind it the Greek
// city inside its walls, the temples of Neptune, Hera and Athena. Two beaches, two ways up, the river between:
// NATO’s reserve comes down the SS18 from Battipaglia (its base, in the north-east corner under the hills) and has
// to cross the Sele by one of its two bridges to reach Paestum. Out at sea the landing ships and the mine barrier the
// Italian navy laid across the gulf, a lane off each beach.
// (Compressed: Magazzeno to Paestum is 25 km, here 800 m; the Picentini and Capaccio are pulled in to the plain’s edge.)
// Laid out in a frame with the sea toward +z (`L`), then turned round: the Pact’s side is -z, so the sea is there
// (the landing comes from its base out at sea: systems/Landing.js lands()).
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

/** The waterline (local z): the gulf’s shore on the slant, far out in the north (-x), far in in the south (+x). */
const SLOPE = 0.4;
const shoreZ = (x: number) => 95 - SLOPE * x + fbm(noise, x * 0.003, 4.3, 2) * 8;
/** The beach’s width: Magazzeno’s wide flat sand in the north, a narrow strip under the pines at Paestum. */
const beachW = (x: number) => 32 + 34 * smoothstep(120, -180, x);

/** The Sele (local polyline: out from the mouth, inland past the SS18 to the map’s edge). */
const RIVER = [[-20, 300], [-20, 110], [0, -20], [45, -150], [85, -290], [110, -430], [135, -580], [155, -720], [170, -920]];
function segD(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const riverD = (x: number, z: number) => { let d = Infinity; for (let i = 0; i < RIVER.length - 1; i++) d = Math.min(d, segD(x, z, RIVER[i], RIVER[i + 1])); return d; };
/** The river’s half-width: wide at the mouth between its sandbars, narrower inland. */
const riverW = (z: number) => 10 + 8 * smoothstep(-80, 110, z);
/** The Foce Sele: the reed marsh and lagoons either side of the mouth (0…1). */
const marshK = (x: number, z: number) => Math.exp(-(((x + 20) / 90) ** 2) - (((z - shoreZ(x) + 110) / 70) ** 2));

/** The roads (local): the coast road behind the pines, the Battipaglia road, Via Magna Graecia, the SS18 under the hills. */
const coastZ = (x: number) => shoreZ(x) - 200;
const battX = (z: number) => -300 + Math.sin(z * 0.011) * 12;// Magazzeno – the tobacco factory – Battipaglia
const paestX = (z: number) => 365 + Math.sin(z * 0.01) * 10;                                     // Paestum beach – Paestum – Capaccio Scalo
const ssZ = (x: number) => -600 + Math.sin(x * 0.006) * 18 + 0.12 * x;                           // the SS18, along the hills’ foot
function roadL(x: number, z: number, m = 0) {
  const back = shoreZ(x) - z;
  if (Math.abs(z - coastZ(x)) < 3.5 + m && Math.abs(x) < 490) return true;
  if (Math.abs(x - battX(z)) < 3.5 + m && back > 45 && z > -900) return true;
  if (Math.abs(x - paestX(z)) < 3.5 + m && back > 45 && z > ssZ(x)) return true;
  if (Math.abs(z - ssZ(x)) < 3.5 + m && Math.abs(x) < 490) return true;
  return false;
}
/** Where the coast road and the SS18 cross the Sele: the bridges’ causeways. */
const bridgeD = (x: number, z: number) => Math.min(Math.abs(z - coastZ(x)), Math.abs(z - ssZ(x)));

/** The hills (local): the Monti Picentini over Battipaglia in the north-east corner, Capaccio and Monte Soprano in the south-east. */
const hills = (x: number, z: number) =>
  smoothstep(-470, -760, z - 0.45 * (x + 120)) * smoothstep(-40, -260, x) * (58 + 14 * fbm(noise, x * 0.005 + 2, z * 0.005, 3)) +
  smoothstep(-470, -700, z + 0.25 * (x - 300)) * smoothstep(200, 330, x) * (52 + 12 * fbm(noise, x * 0.006 + 9, z * 0.006, 3));

/** The dunes’ hummocks, the plain’s lie and the hills behind (local), sampled once onto a 4 m grid. */
const landC = gridCacheSmooth((x: number, z: number) => {
  const back = shoreZ(x) - z, bw = beachW(x);
  const n = fbm(noise, x * 0.012 + 3, z * 0.012, 3);
  const beach = 0.6 + Math.min(back, bw) * 0.03;
  let h = back < bw ? beach : beach + (back - bw) * 0.003 + fbm(noise, x * 0.004, z * 0.004, 2) * 0.7;
  // the low dune belt under the pines, cut down where the roads come through
  const env = smoothstep(bw - 10, bw + 15, back) * smoothstep(bw + 140, bw + 90, back);
  const gap = 1 - 0.85 * Math.max(Math.exp(-(((x - battX(z)) / 14) ** 2)), Math.exp(-(((x - paestX(z)) / 14) ** 2)));
  h += env * (3 + n * 2.5) * gap;
  return h + hills(x, z);
}, { x: 1000, z: 1000 }, 4);

const BASE_L = { x: -250, z: -830 };
let baseY: number | null = null;

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const d = z - shoreZ(x); // + out to sea
  let h: number;
  if (d > 0) h = Math.max(0.6 - d * 0.02 - Math.max(0, d - 120) * 0.05 + Math.sin(d * 0.07 + x * 0.004) * 0.25 * smoothstep(15, 40, d) * smoothstep(100, 70, d), -20);
  else h = landC(x, z);
  // the Foce Sele: reed marsh and shallow lagoons round the mouth (wet: knee-deep pools among the reeds)
  const mk = marshK(x, z);
  if (mk > 0.05 && d < 0) h = Math.min(h, h * (1 - mk) + (0.4 - 1.6 * smoothstep(0.55, 0.95, mk)) * mk);
  // the Sele: a channel 3 m deep, the banks falling into it; its sandbar mouth out into the sea
  const rd = riverD(x, z), w = riverW(z);
  if (rd < w + 9) {
    const k = smoothstep(w + 9, w, rd);
    h = Math.min(h, h * (1 - k) - 3.2 * k);
    if (d < 0) h = Math.max(h, 2.4 - Math.max(0, bridgeD(x, z) - 6) * 0.8); // the bridges’ causeways (12 m across the top)
  }
  // NATO’s base under the hills: graded
  const bd = Math.hypot(x - BASE_L.x, z - BASE_L.z);
  if (bd < 45) { baseY ??= landC(BASE_L.x, BASE_L.z); h += (baseY - h) * smoothstep(45, 25, bd); }
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -300, name: 'Magazzeno', inland: { name: 'Tobacco factory', x: -255, z: -300 } },
  { x: 300, name: 'Paestum', inland: { name: 'Paestum', x: 380, z: -330 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
/** A trench or a nest along the shore (yaw: parallel to the slanting waterline, in the world frame). */
const SHORE_YAW = -Math.atan2(-F * SLOPE, 1);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(150, 720), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Magazzeno beach', ...W(-300, shoreZ(-300) - 76), owner: null, sector: 'west', radius: 55, opens: 'E' },
  { id: 'C', name: 'Paestum beach', ...W(300, shoreZ(300) - 44), owner: null, sector: 'east', radius: 45, opens: 'F' },
  { id: 'E', name: 'Tobacco factory', ...W(SECTORS[0].inland.x, SECTORS[0].inland.z), owner: null, sector: 'west' },
  { id: 'F', name: 'Paestum', ...W(SECTORS[1].inland.x, SECTORS[1].inland.z), owner: null, sector: 'east' },
  { id: 'K', name: 'Battipaglia', ...W(-230, -700), owner: 'nato', sector: 'west' },
];

/** Paestum: the Greek city’s walls (local rect) and its three temples [x, z, width, length, columns across, along, column height]. */
const WALLS = { x0: 250, x1: 445, z0: -440, z1: -205 };
const TEMPLES: { name: string; x: number; z: number; w: number; l: number; nx: number; nz: number; h: number }[] = [
  { name: 'Temple of Neptune', x: 300, z: -330, w: 17, l: 40, nx: 6, nz: 14, h: 8 },
  { name: 'Basilica (Temple of Hera)', x: 298, z: -395, w: 17, l: 38, nx: 9, nz: 18, h: 6.5 },
  { name: 'Temple of Athena', x: 305, z: -245, w: 13, l: 28, nx: 6, nz: 13, h: 6.5 },
];
const inTemple = (x: number, z: number, m: number) => TEMPLES.some((t) => Math.abs(x - t.x) < t.w / 2 + m && Math.abs(z - t.z) < t.l / 2 + m);

export default {
  id: 'salerno',
  name: 'Salerno Landing',
  description: 'The Gulf of Salerno, 1985: the shore of 1943 on the slant, the British beach at Magazzeno and the American one at Paestum with the Sele’s marshy mouth between, the tobacco factory up the Battipaglia road, the Greek temples of Paestum, the Picentini and Capaccio’s hills closing in. Soviet naval infantry lands south of Naples; the US Army holds.',
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
  airfields: [], // (no strip: pinewoods, the marsh, ditched tobacco fields and farms, the hills — Airfields off)
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
        const lz = F * z, back = shoreZ(x) - lz, bw = beachW(x);
        if (roadL(x, lz)) return [0x5e5c58, 0.9];                                                   // asphalt
        const rd = riverD(x, lz);
        if (rd < riverW(lz) + 2) return [y > -1 ? 0xb8a880 : 0x6a6450, 1];                          // the river’s sand and mud
        if (back > -4 && marshK(x, lz) > 0.3) return [y < 0.2 ? 0x5a6248 : 0x7a7a4a, 0.85];         // the Foce Sele’s reeds and pools
        if (rd < riverW(lz) + 12 && back > 40) return [0x7a7a4a, 0.85];                             // reeds on the banks
        if (back < -4) return [y > 0.3 ? 0xd8c8a0 : 0xae9e7e, 1];                                   // the sand under the water
        if (back < bw) return [0xe2cf9e, 1];                                                        // the beach: golden sand
        if (back < bw + 140) return noise(x * 0.05, lz * 0.05) > 0.1 ? [0x6e6a40, 0.8] : [0x8e7650, 0.75]; // the Pineta: needles, macchia in patches
        if (lz < WALLS.z1 && lz > WALLS.z0 && x > WALLS.x0 && x < WALLS.x1 && x < paestX(lz) - 6) return [0xa89c78, 0.6]; // the excavated city: grass and stone
        if (hills(x, lz) > 25 && y > 30) return [0x8a8266, 0.8];                                    // limestone on the hills
        return null;                                                                                // the plain’s fields
      },
    },
  },

  bases: { nato: { x: -250, z: 830, entries: [-110, 0, 120] }, pact: { x: 150, z: -830, entries: [-300, 300] } }, // (the Pact lands: its roads are the two beaches)
  maxStacks: 18,
  cameraStart: { nato: { x: -100, z: 200 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Italian navy’s mine barrier across the gulf, a lane left off each beach for the sweepers to widen
    seaMines: { z: [520, 580], count: 55, lanes: [-300, 300], lane: 80, seed: 1985_43 },
    // the coastal missile battery on the plain: two launcher trucks that fire on the ships, then move
    forts: [{ unit: 'coastMissile', ...W(-120, -470), facing: Math.PI }, { unit: 'coastMissile', ...W(240, -520), facing: Math.PI }],
    works: [
      ...Array.from({ length: 88 }, (_, i) => { const x = -480 + i * 11; return riverD(x, shoreZ(x) - 30) < 40 || marshK(x, shoreZ(x) - 30) > 0.25 ? null : { kind: 'wire', ...W(x, shoreZ(x) - beachW(x) + 6), yaw: SHORE_YAW }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-40, 40].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - beachW(s.x) - 30) }))),
      ...SECTORS.flatMap((s) => [-48, 0, 48].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - beachW(s.x) - 20), yaw: SHORE_YAW }))),
      ...SECTORS.flatMap((s) => [-24, 24].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - beachW(s.x) - 14), yaw: SHORE_YAW }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - beachW(s.x) + 2) }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    hold: [...SECTORS.flatMap((s) => [-50, -24, 24, 50].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - beachW(s.x) - (Math.abs(dx) < 30 ? 14 : 24)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z)), W(60, -560)],
    counter: { t: 420, units: ['heavyTank', 'ifv', 'heavyTank', 'ifv'], say: 'The reserve from Naples is coming down the SS18 past Battipaglia: Abrams and Bradleys, straight for the beachhead', sayOther: 'Enemy armour coming down the SS18 from Battipaglia' },
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2200, perSector: 550, beachIncome: 0.85, defenceCp: 1300, defenceIncome: 2.8 }, // (two beaches only: the landing masses on each in turn — fewer stacks ashore, a richer defence; AI vs AI 2026-11-25: at 1.7 won at 13 min twice, at 2.8 held twice with Paestum the last, at 2.5 won at 7 min)
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 }, { unit: 'tank', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'pt76', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'ifv', sector: 1 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_43);
    props.rand = mulberry32(1985_44);
    sea.build(scene, terrain);
    const at = (x: number, z: number) => { const w = W(x, z); return { ...w, y: terrain.heightAt(w.x, w.z) }; };
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < m);
    const free = (x: number, z: number, m: number) => !roadL(x, z, m + 3) && riverD(x, z) > riverW(z) + 10 + m && !nearPoint(x, z, 18 + m) && shoreZ(x) - z > beachW(x) + 150 + m && marshK(x, z) < 0.2 && Math.abs(x) < 490 - m;
    const geo = (g: THREE.BufferGeometry, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, key = 'stone', rx = 0) => {
      const w = W(x, z);
      props.push(key, g, new THREE.Matrix4().compose(new THREE.Vector3(w.x, y, w.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz)), color);
    };

    // ---- the Monti Lattari and the Amalfi coast on the skyline beyond Salerno (haze-blue, past the fog)
    { const mr = mulberry32(1985_46), mat = new THREE.MeshBasicMaterial({ color: 0xa6b0bc, fog: false });
      for (const [cx, cz, n] of [[-1500, -300, 7], [300, 1600, 5]] as [number, number, number][]) for (let i = 0; i < n; i++) { // (world x, z: the Lattari ridge north-west, the Alburni behind Capaccio)
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
    for (let i = 0; i < 24; i++) { // the modern village along Via Magna Graecia, east of the road
      const x = 390 + r() * 90, z = -215 - r() * 220;
      if (roadL(x, z, 6) || nearPoint(x, z, 20) || x > 488) continue;
      props.flatHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 8 + r() * 2, storeys: 1 + Math.floor(r() * 2), name: 'house' });
    }
    props.hall({ ...W(415, -470), yaw: 0, width: 30, depth: 12, height: 6, color: 0xd0c4a8, roof: 0x9a5a40, door: 6, name: 'museum' });

    // ---- the tobacco factory up the Battipaglia road: long brick warehouses round a yard, a chimney; Bellizzi round it
    const tobacco = (x: number, z: number, yaw: number, w: number, name = 'tobacco warehouse') =>
      props.hall({ ...W(x, z), yaw, width: w, depth: 13, height: 9, color: 0xb87a5a, roof: 0x9a5a40, door: 6, name });
    tobacco(-205, -285, Math.PI / 2, 56, 'Tabacchificio');
    tobacco(-255, -360, 0, 48, 'Tabacchificio');
    tobacco(-345, -270, Math.PI / 2, 44, 'Tabacchificio');
    props.chimney({ ...W(-215, -345), height: 24 });
    for (let i = 0; i < 40; i++) { // Bellizzi: houses either side of the road above the factory
      const x = -300 + (r() - 0.5) * 200, z = -420 - r() * 160;
      if (!free(x, z, 4) || Math.hypot(x - BASE_L.x, z - BASE_L.z) < 80) continue;
      if (r() < 0.7) props.flatHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 8, storeys: 2 + Math.floor(r() * 2), name: 'house' });
      else props.townHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 7 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0 });
    }
    props.church(W(-370, -480));
    for (let i = 0, n = 0; i < 300 && n < 6; i++) { // more warehouses out on the plain, both sides of the Sele
      const x = -420 + r() * 760, z = -60 - r() * 460;
      if (!free(x, z, 28) || inTemple(x, z, 40) || (x > WALLS.x0 - 30 && z > WALLS.z0 - 30 && z < WALLS.z1 + 30) || hills(x, z) > 6) continue;
      tobacco(x, z, r() < 0.5 ? 0 : Math.PI / 2, 34 + r() * 16); n++;
    }

    // ---- Battipaglia under the Picentini: the town’s edge by NATO’s base, its church
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2, dd = 60 + r() * 110, x = BASE_L.x + 30 + Math.cos(a) * dd * 1.2, z = -720 + Math.sin(a) * dd * 0.6;
      if (!free(x, z, 4) || Math.hypot(x - BASE_L.x, z - BASE_L.z) < 60 || x < -488) continue;
      props.flatHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 8, storeys: 2 + Math.floor(r() * 2), name: 'house' });
    }
    props.church(W(-140, -760));
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    props.rand = mulberry32(1985_47);
    // Capaccio Scalo at the hills’ foot by the SS18
    for (let i = 0; i < 18; i++) {
      const x = 300 + r() * 180, z = ssZ(300) - 15 - r() * 60;
      if (!free(x, z, 4)) continue;
      props.flatHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 3, depth: 8, storeys: 2, name: 'house' });
    }

    // ---- the Saracen watchtowers on the shore: Torre del Sele by the mouth, Torre di Paestum
    for (const x of [-140, 180]) {
      const p = at(x, shoreZ(x) - beachW(x) - 50);
      props.box('stone', p.x, p.y + 6, p.z, 7, 12, 7, 0, 0xa49274); props.box('stone', p.x, p.y + 12.5, p.z, 8, 1, 8, 0, 0x948468);
      cover.addBox({ x: p.x, z: p.z, yaw: 0, length: 7, thickness: 7, height: 12 });
    }

    // ---- the Sele bridges: a deck and parapets over the water, piers in it
    for (const road of [coastZ, ssZ]) {
      let best = { d: Infinity, x: 0, z: 0 };
      for (let x = -200; x < 300; x += 1) { const z = road(x), d = riverD(x, z); if (d < best.d) best = { d, x, z }; }
      const len = 2 * riverW(best.z) + 22, p = at(best.x, best.z), w = W(best.x, best.z);
      const yaw = Math.atan2(-F * (road(best.x + 1) - road(best.x)), 1);
      props.box('stone', w.x, p.y + 0.25, w.z, len, 0.5, 11, -yaw, 0x8a8478);
      for (const o of [-5.3, 5.3]) props.box('stone', w.x - Math.sin(yaw) * o, p.y + 1, w.z + Math.cos(yaw) * o, len, 1, 0.4, -yaw, 0x9a9488);
    }

    // ---- buffalo farms (masserie) out on the plain, the eucalyptus round them
    for (let i = 0, n = 0; i < 260 && n < 12; i++) {
      const x = -460 + r() * 920, z = -40 - r() * 560;
      if (!free(x, z, 14) || inTemple(x, z, 30) || hills(x, z) > 8 || (x > WALLS.x0 - 20 && z < WALLS.z1 + 20 && z > WALLS.z0 - 20)) continue;
      buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, r() * Math.PI); n++;
    }

    // ---- the Pineta: umbrella pines over the dunes — tall bare trunks, flat dark crowns
    const trunk = new THREE.CylinderGeometry(0.22, 0.34, 1, 6), crown = new THREE.SphereGeometry(1, 10, 6);
    for (let i = 0, n = 0; i < 4000 && n < 340; i++) {
      const x = -495 + r() * 990, back = beachW(x) + 20 + r() * 115, z = shoreZ(x) - back;
      if (fbm(noise, x * 0.008 + 11, z * 0.008, 2) < -0.15 || roadL(x, z, 4) || riverD(x, z) < riverW(z) + 12 || marshK(x, z) > 0.2 || nearPoint(x, z, 20) || [-140, 180].some((tx) => Math.abs(x - tx) < 10)) continue;
      const p = at(x, z), hh = 9 + r() * 5, cr = 3.5 + r() * 2;
      geo(trunk, x, p.y + hh / 2, z, 1, hh, 1, 0x5a4636, 'plain');
      geo(crown, x, p.y + hh + 0.6, z, cr, cr * 0.32, cr, r() < 0.5 ? 0x3a4a26 : 0x44522c, 'plain');
      cover.addCylinder({ ...W(x, z), radius: 0.4, height: 4 }); n++;
    }
    props.finish();

    // ---- trees: macchia in the dunes, poplars on the Sele, eucalyptus windbreaks, olives and holm oak on the hills
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => roadL(x, F * z, 2) || height(x, z) < 0.8 }];
    const treeK = (x: number, z: number) => {
      const lz = F * z, back = shoreZ(x) - lz, bw = beachW(x);
      if (back < bw + 20 || riverD(x, lz) < riverW(lz) + 6 || Math.abs(x) > 495 || inTemple(x, lz, 12) || marshK(x, lz) > 0.25) return 0;
      if (back < bw + 140) return 0.25 * smoothstep(0, 0.4, fbm(noise, x * 0.01 + 7, lz * 0.01, 2));                 // macchia under the pines
      const hk = hills(x, lz);
      if (hk > 6) return 0.25 + 0.5 * smoothstep(6, 30, hk) * smoothstep(-0.3, 0.3, fbm(noise, x * 0.006 + 21, lz * 0.006, 2)); // olives, holm oak
      return riverD(x, lz) < riverW(lz) + 30 ? 0.5 : 0.04;                                                        // poplars along the Sele, a few windbreaks
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1500, broadleaf: 0.95, autumn: 0, maxY: 90,
      avoid: [...avoid, { test: (x: number, z: number) => treeK(x, z) <= 0 }], forest: treeK });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => { const lz = F * z; return shoreZ(x) - lz < beachW(x) || riverD(x, lz) < riverW(lz) + 3 || marshK(x, lz) > 0.3; } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
