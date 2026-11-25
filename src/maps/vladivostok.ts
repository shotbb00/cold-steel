// Vladivostok, autumn 1985 (the big field, 1.0 × 1.12 km): the landward approaches to the home of the Soviet Pacific
// Fleet, in the war of 1985 that never came — the US Army has landed in Primorye, taken the edge of Knevichi airfield
// by Artyom, and comes down the Muravyov-Amursky peninsula on the road from Artyom toward the city. Real north is +z
// (Artyom, Knevichi: the US side), real south -z (the city: the Soviet side); the Amur Bay fills the west edge, and
// along its shore runs the last stretch of the Trans-Siberian railway through the dacha stations — Sadgorod,
// Okeanskaya, Zarya — to its end at Vladivostok. The Artyom road comes down the middle through Trudovoye, Sedanka and
// Vtoraya Rechka; Khrushchyovka blocks crowd the junctions, dachas and their plots the shore. The peninsula’s spine
// runs down the east, steep and wooded in Primorye’s mixed taiga of oak, birch and Korean pine (map.steep), and the
// Sedanka hills rise between the railway and the road; on the hilltops stand the forts of the old tsarist Vladivostok
// fortress — Fort No. 9 over Trudovoye, Fort No. 7 over Sedanka, Fort No. 4 over the city — concrete and earth.
// Fairness: not a mirror — the shore wanders its own way, the bay is the west edge for both, the US have Knevichi’s
// strip in the west behind their line and the Soviets a field strip in the east behind theirs, the towns and dacha
// plots are each half’s own dice — but the Sedanka hills and the peninsula’s spine straddle the middle so neither side
// starts on them, each side has its own fort on its own flank hill of the same height at about the same distance, a
// station on the bay and a road town, the neutral Fort No. 7 (east, a little nearer the Soviets) is answered by
// Okeanskaya (west, a little nearer the US), and the points lie at about the same distances (tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 640, z: 820 }; // (the cached grids: the field and a margin)
const BASE_Z = 500;
const LAND = 5;
const noise = createNoise2D(1985_131);

// ---- the Amur Bay: the west edge, its shore wandering north to south
const shoreX = (z: number) => -392 + 22 * Math.sin(z * 0.008 + 0.7) + 12 * Math.sin(z * 0.021 + 2);
/** Metres inland from the shore (negative: in the bay). */
const shoreD = (x: number, z: number) => x - shoreX(z);

function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const polyDist = (l: number[][], x: number, z: number) => { let d = Infinity; for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1])); return d; };

// ---- the roads: the Artyom road down the middle, the shore road along the railway, the east road under the spine
const ROADS: number[][][] = [
  [[0, 600], [0, 470], [30, 360], [40, 250], [15, 120], [30, -10], [-10, -130], [-80, -235], [-10, -400], [0, -470], [0, -600]], // the Artyom road
  [[30, 360], [-150, 345], [-300, 300], [-292, 150], [-280, 12], [-298, -150], [-305, -330], [-150, -335], [-80, -235]],         // the shore road
  [[30, 360], [270, 330], [270, 150], [255, -40], [280, -180], [355, -275], [160, -385], [-10, -400]],                           // the east road
  [[30, -10], [255, -40]],                                                                                                       // Sedanka out to Fort No. 7
  [[-292, 150], [-150, 175], [40, 250]],                                                                                         // Sadgorod lane
];
function roadDistExact(x: number, z: number) { let d = Infinity; for (const l of ROADS) d = Math.min(d, polyDist(l, x, z)); return d; }
const roadDist = gridCacheSmooth(roadDistExact, EXT, 2);
const mainDist = (x: number, z: number) => polyDist(ROADS[0], x, z);
// the Trans-Siberian along the shore, to its end at Vladivostok station (decoration: the track, the stations)
const RAIL: number[][] = []; for (let z = 620; z >= -470; z -= 30) RAIL.push([shoreX(z) + 38, z]);
RAIL.push([-200, -500], [-120, -515]);
const railDist = (x: number, z: number) => polyDist(RAIL, x, z);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Knevichi', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Sadgorod', x: -292, z: 300, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Trudovoye', x: 40, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Fort No. 9', x: 270, z: 330, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Okeanskaya', x: -278, z: 12, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Sedanka', x: 30, z: -10, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Fort No. 7', x: 255, z: -40, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Zarya', x: -300, z: -330, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Vtoraya Rechka', x: -80, z: -235, owner: null, sector: 'centre' },
  { id: 'J', name: 'Fort No. 4', x: 355, z: -275, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Vladivostok', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// each side's airfield (systems/Airfields.js): Knevichi's edge for the US (west), a field strip for the Soviets (east);
// the runway 55 m behind the tower, graded flat and kept clear
const AIR = [{ faction: 'nato', x: -170, z: 440, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 170, z: -440, yaw: -Math.PI / 2, large: false }];
const STRIPS = AIR.map((a) => ({ x: a.x, z: a.z + (a.faction === 'nato' ? 55 : -55) }));
const onAir = (x: number, z: number, m = 0) => AIR.some((a, i) => Math.abs(x - a.x) < 125 + m && Math.abs(z - (a.z + STRIPS[i].z) / 2) < 50 + m);

// the forts' hills and the rolls, each half its own: [x, z, radius, height] (the two flank forts first, the same height)
const HILLS = [[270, 330, 66, 20], [355, -275, 68, 20], [255, -40, 58, 15],
  [-190, 270, 55, 10], [-170, -300, 60, 11], [140, 420, 60, 9], [-60, -420, 55, 8], [440, 470, 70, 16], [450, -450, 66, 15]];
const FORTS = { nato: [270, 330], pact: [355, -275], mid: [255, -40] };
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillHExact(x: number, z: number) {
  let h = 0, w = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d0 = Math.hypot(x - hx, z - hz) / r;
    if (d0 > 3.2) continue; // (exp(-d²) is nothing out there: skip the noise)
    if (!w) w = warp(x, z);
    const d = d0 * w;
    h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  return h;
}
const hillH = gridCacheSmooth(hillHExact, EXT, 4);

/** Low ground (0): along the roads and railway, round the points and bases. */
function lowD(x: number, z: number) {
  let d = Math.min(roadDist(x, z) - 14, railDist(x, z) - 12);
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 55);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x, z - bz) - 70);
  return d;
}
/** The Sedanka hills between the railway and the road, the peninsula's spine down the east: both astride the middle. */
function mass(x: number, z: number) {
  const sedanka = smoothstep(1.0, 0.4, Math.hypot((x + 140) / 100, (z - 15) / 200) + 0.12 * fbm(noise, x * 0.01 - 30, z * 0.01, 2)) * 0.6;
  const spine = smoothstep(1.0, 0.45, Math.hypot((x - 490) / 140, (z + 5) / 260) + 0.12 * fbm(noise, x * 0.01 + 70, z * 0.01, 2));
  return Math.max(sedanka, spine);
}
const mountK = gridCacheSmooth((x: number, z: number) => mass(x, z) * smoothstep(8, 80, lowD(x, z)), EXT, 4);
/** The dacha plots: the flat land away from the hills, roads, towns and the strips (garden plots and their huts). */
function plotK(x: number, z: number) {
  if (roadDist(x, z) < 8 || nearPoint(x, z, 40) || railDist(x, z) < 8 || shoreD(x, z) < 30 || onAir(x, z, 25)) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(0.06, 0.01, mountK(x, z))
    * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x)) * smoothstep(55, 70, Math.hypot(x, Math.abs(z) - BASE_Z))
    * smoothstep(-0.05, 0.1, fbm(noise, x * 0.007 + 40, z * 0.007 - 90, 2));
}
const plotC = gridCacheSmooth(plotK, EXT, 4);

function groundExact(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = LAND + n * 1.5 + hillH(x, z);
  const mk = mountK(x, z);
  if (mk > 0) h += mk * (20 + ridged(noise, x * 0.007 + 9, z * 0.007, 4) * 42); // (steep, but wooded: not bare cliffs)
  const ek = smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, x);
  if (ek > 0) h += ek * (20 + ridged(noise, x * 0.01, z * 0.01, 3) * 24);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14;
  return h;
}
const ground = gridCacheSmooth(groundExact, EXT, 2);

function height(x: number, z: number) {
  const sd = shoreD(x, z);
  if (sd < 0) return Math.max(-6, 0.6 + sd * 0.12);                                  // the bay: shelving off the beach
  let h = ground(x, z);
  const pk = plotC(x, z);
  if (pk > 0) h += (LAND + Math.round(fbm(noise, x * 0.005, z * 0.005, 1) * 4) * 0.3 - h) * pk * 0.8; // the plots, terraced level
  for (const s of STRIPS) h += (LAND - h) * smoothstep(60, 20, Math.abs(z - s.z)) * smoothstep(170, 130, Math.abs(x - s.x)); // the strips graded flat
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return 1.4 + (h - 1.4) * smoothstep(0, 50, sd);                                    // the beach down to the water
}

/** Oak, birch and Korean pine on the hills, the spine and in patches of taiga. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(5, 12, hillH(x, z)), smoothstep(0.06, 0.25, mountK(x, z)),
  smoothstep(0.12, 0.25, fbm(noise, x * 0.006 + 300, z * 0.006 - 120, 2)) * 0.8)
  * smoothstep(4, 12, roadDist(x, z)) * smoothstep(4, 10, railDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1) * (onAir(x, z, 15) ? 0 : 1) * (shoreD(x, z) < 12 ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);

const water = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false, // (the bay: water that stops — world/Sea.js answers the rest)
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2e4a52, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
    this.waterMesh = m;
  },
};

export default {
  id: 'vladivostok',
  name: 'Vladivostok',
  description: 'The landward approaches to Vladivostok, home of the Soviet Pacific Fleet, autumn 1985: the road from Artyom and the edge of Knevichi airfield, the Trans-Siberian’s last miles along the Amur Bay through the dacha stations, Khrushchyovka blocks at the junctions, the tsarist fortress forts on the wooded hills of the Muravyov-Amursky peninsula.',
  epochs: ['1985'],
  region: 'korea',
  armies: { nato: ['us'], pact: ['sov'] }, // (the US Army landed in Primorye against the Soviet Far East garrison)
  sides: { nato: 'United States', pact: 'Soviet Union' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985_131,
  height,
  steep: 0.6, // (the spine's slopes: vehicles keep to the roads and the shore)
  river: water,
  airfields: AIR,
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a clear September day on the Sea of Japan, the oaks turning
    fogColor: 0xbcc4c8, fogDensity: 0.0011,
    skyTop: 0x4a76aa, skyHorizon: 0xd0d8dc, skyBottom: 0x6e7468,
    sunColor: 0xfff0dc, sunIntensity: 2.0, sunDisk: 0.4,
    clouds: 0.35, cloudLight: 0xf4f2ee, cloudDark: 0x9aa0a6,
    sunDir: [-0.3, 0.65, 0.6],
    hemiSky: 0xc8d2de, hemiGround: 0x5a5a3a, hemiIntensity: 1.3,
    rimColor: 0xd4d6d8, rimIntensity: 0.2,
    terrain: {
      grass: '#5e6a36', grassAlt: '#566432', dryGrass: '#8e8450', dirt: '#6a5840', rock: '#77736a',
      pasture: '#5e6a36', ploughed: '#5a4a34', stubble: '#9a8a56', meadow: '#6a7440',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onAir(x, z) && Math.abs(z - STRIPS[x < 0 ? 0 : 1].z) < 14 && Math.abs(x - STRIPS[x < 0 ? 0 : 1].x) < 120) return [0x7a7a76, 0.9]; // the runways
        if (roadDist(x, z) < (mainDist(x, z) < 6 ? 5 : 4)) return [0x74716a, 0.86];              // asphalt
        if (railDist(x, z) < 3) return [0x4e4a44, 0.9];                                            // ballast
        if (y < 2.4 && shoreD(x, z) < 26) return [0x9a907a, 0.85];                                 // the bay's grey sand and shingle
        const pk = plotC(x, z);
        if (pk > 0.3) {
          const u = x + z * 0.05, v = z - x * 0.06, k = noise(x * 0.05, z * 0.05);
          if (Math.min(Math.abs(((u % 24) + 24) % 24 - 12), Math.abs(((v % 18) + 18) % 18 - 9)) > 11) return [0x6a6040, 0.7]; // plot fences and paths
          return [k > 0.3 ? 0x5a4a34 : k > -0.2 ? 0x6e7a3e : 0x8a8a4a, pk * 0.8];                  // dug beds, potatoes, cabbages
        }
        if (y > LAND + 50) return [0x8a867a, smoothstep(0.0, 0.5, noise(x * 0.025, z * 0.025)) * smoothstep(LAND + 50, LAND + 85, y) * 0.8]; // the spine's rock
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1-ya Rota', facing: 0 }],
  },

  // trenches and MG nests round each side's own fort
  battlefield() {
    const works: any[] = [];
    for (const [f, m] of [['nato', 1], ['pact', -1]] as const) {
      const [hx, hz] = FORTS[f];
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2 + (m > 0 ? 0.2 : 0.7), x = hx + Math.cos(ang) * 34, z = hz + Math.sin(ang) * 34;
        if (roadDist(x, z) < 6) continue;
        works.push({ kind: a % 2 ? 'mgNest' : 'trench', x, z, yaw: Math.atan2(Math.cos(ang), Math.sin(ang)), faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    water.build(scene);
    props.rand = mulberry32(1985_132);
    const r0 = props.rand;
    const free = (x: number, z: number, r: number) => roadDist(x, z) > 7 + r && railDist(x, z) > 6 + r && shoreD(x, z) > 14 + r && !onAir(x, z, r + 4)
      && mountK(x, z) < 0.05 && hillH(x, z) < 7 && Math.hypot(x, Math.abs(z) - BASE_Z) > 45;
    const pt = (id: string) => points.find((p) => p.id === id)!;
    const blocks = (cx: number, cz: number, list: number[][], storeys = 5) => {
      for (const [dx, dz, yaw = 0] of list) if (free(cx + dx, cz + dz, 12) && !nearPoint(cx + dx, cz + dz, 22)) flats(props, { x: cx + dx, z: cz + dz, yaw, storeys, width: 28, depth: 11, name: 'Khrushchyovka' });
    };

    // ---- the Trans-Siberian: the track along the bay, the dacha stations, its end at Vladivostok station
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    for (const id of 'BEH') {
      const p = pt(id), rx = shoreX(p.z) + 38;
      props.townHouse({ x: rx + 12, z: p.z + 30, yaw: Math.PI / 2, width: 16, depth: 7, storeys: 1, name: p.name + ' station', damaged: 0 });
    }
    props.townHouse({ x: -150, z: -530, yaw: 0.2, width: 34, depth: 12, storeys: 2, name: 'Vladivostok station', damaged: 0 });
    props.box('stone', -118, terrain.heightAt(-118, -517) + 0.8, -517, 4, 1.6, 2, 0.2, 0x8a3a2a);      // the buffer stop: 9288 km from Moscow
    for (const [z, kind, c] of [[200, 'box', 0x5a3a2a], [185, 'box', 0x4a5a3a], [-120, 'tank', 0x3a3a3a], [-400, 'box', 0x5a3a2a]] as const) {
      const x = shoreX(z) + 38, x2 = shoreX(z + 10) + 38;
      props.wagon({ x, z, yaw: Math.atan2(x2 - x, 10), kind, color: c });
    }

    // ---- the towns: Khrushchyovka blocks round the junctions, more toward the city
    props.rand = mulberry32(1985_133);
    const i0 = pt('I'), f0 = pt('F'), c0 = pt('C'), k0 = pt('K'), h0 = pt('H');
    blocks(i0.x, i0.z, [[60, -30, Math.PI / 2], [60, 25, Math.PI / 2], [-60, 25], [-55, -30], [10, 62], [-30, -70], [100, -60, Math.PI / 2]]);
    blocks(f0.x, f0.z, [[-62, -25], [-60, 30], [65, 40, Math.PI / 2], [75, -40, Math.PI / 2], [0, 70]]);
    blocks(c0.x, c0.z, [[-60, 20], [70, -20, Math.PI / 2], [65, 35, Math.PI / 2]], 4);
    blocks(k0.x, k0.z, [[-80, 40], [80, 45, Math.PI / 2], [-90, -10, Math.PI / 2], [90, 0, Math.PI / 2], [-60, 90], [70, 95]], 9);
    blocks(h0.x, h0.z, [[60, -25, Math.PI / 2], [55, 30, Math.PI / 2]]);
    props.hall({ x: h0.x + 30, z: h0.z + 70, yaw: Math.PI / 2, width: 36, depth: 18, height: 10, color: 0x8a7a66, roof: 0x3e4044, door: 8, name: 'Zarya works' });
    props.hall({ x: i0.x + 90, z: i0.z + 70, yaw: 0, width: 30, depth: 14, height: 8, color: 0x7a7a70, roof: 0x3e4044, door: 6, name: 'bus depot' });

    // ---- the dachas: huts in their plots, the bigger old dachas by the shore stations
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_134 + m);
      const r = props.rand;
      for (let i = 0; i < 160; i++) {
        const x = (r() * 2 - 1) * 460, z = (60 + r() * 450) * m;
        if (plotC(x, z) < 0.5 || !free(x, z, 3) || nearPoint(x, z, 30)) continue;
        if (r() < 0.55) props.house({ x, z, yaw: r() < 0.5 ? 0.05 : Math.PI / 2 + 0.05, width: 5 + r() * 2, depth: 4 + r() * 1.5, height: 2.6 });
        else if (r() < 0.5) props.hayBales({ x, z, yaw: r(), count: 2 });
      }
    }
    props.rand = mulberry32(1985_135);
    for (const id of 'BE') {
      const p = pt(id);
      for (let i = 0; i < 9; i++) {
        const a = r0() * Math.PI * 2, d = 35 + r0() * 30, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (free(x, z, 5) && !nearPoint(x, z, 26)) props.house({ x, z, yaw: r0() * 0.3, width: 9 + r0() * 3, depth: 7 + r0() * 2, height: 3.2 });
      }
    }

    // ---- the forts: earth-covered concrete casemates, ramparts round the top, a gun position on each corner
    const fort = (fx: number, fz: number, yaw: number, name: string) => {
      const y = terrain.heightAt(fx, fz);
      props.hall({ x: fx, z: fz + 14, yaw, width: 26, depth: 9, height: 4, color: 0x8a8a80, roof: 0x5a6a3e, door: 3, name });
      for (const [dx, dz, w, ry] of [[0, -26, 52, 0], [0, 30, 52, 0], [-26, 2, 56, Math.PI / 2], [26, 2, 56, Math.PI / 2]] as const) {
        const x = fx + dx, z = fz + dz;
        if (roadDist(x, z) > 6) props.lowWall({ x, z, yaw: ry, length: w, height: 1.6, color: 0x7e7a70 });
      }
      for (const [dx, dz] of [[-24, -24], [24, -24], [-24, 28], [24, 28]]) props.box('stone', fx + dx, terrain.heightAt(fx + dx, fz + dz) + 0.6, fz + dz, 6, 1.8, 6, 0, 0x8a8a80);
      return y;
    };
    fort(FORTS.nato[0] + 34, FORTS.nato[1] + 10, 0, 'Fort No. 9');
    fort(FORTS.mid[0] + 36, FORTS.mid[1] - 12, 0, 'Fort No. 7');
    fort(FORTS.pact[0] + 30, FORTS.pact[1] - 14, 0, 'Fort No. 4');

    // ---- Knevichi's edge and the Soviet strip: a control tower, a pair of hangars; checkpoints on the Artyom road
    props.controlTower({ x: AIR[0].x + 90, z: AIR[0].z - 20, yaw: Math.PI });
    props.controlTower({ x: AIR[1].x - 90, z: AIR[1].z + 20, yaw: 0 });
    for (const [x, z, yaw] of [[AIR[0].x - 60, AIR[0].z - 28, Math.PI], [AIR[1].x + 60, AIR[1].z + 28, 0]]) props.aircraftShelter({ x, z, yaw });
    for (const [x, z] of [[-10, 410], [6, -420]]) if (roadDist(x + 10, z) > 6) props.jersey({ x: x + 10, z, yaw: Math.PI / 2, length: 5 });
    for (const [hx, hz] of [FORTS.nato, FORTS.pact]) props.mast({ x: hx - 12, z: hz + 8, height: 12 });
    props.church({ x: -110, z: -385, yaw: 0.1 }); // (the Pokrovsky church on the way into the city)

    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || railDist(x, z) < 6 || plotC(x, z) > 0.2 || shoreD(x, z) < 14 || onAir(x, z, 12) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 12000, broadleaf: 0.6, autumn: 0.35, maxY: LAND + 140,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grass.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
