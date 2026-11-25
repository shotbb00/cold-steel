// Cattaro, January 1916: the Bocche di Cattaro (the Bay of Kotor), the k.u.k. Kriegsmarine’s southern base, and the
// storming of Mount Lovćen. Montenegro’s batteries on Lovćen had looked straight down into the bay and the fleet
// anchorage since 1914; on 8–11 January 1916 General Kövess’s XIX Corps, with the guns of the Austrian forts and the
// battleships in the bay behind it, went up the bare karst wall above the town against the Montenegrin positions and
// took the mountain; Cetinje fell two days later and Montenegro asked for terms.
// The ground, as it lies: the inner arm of the bay comes in like a fjord from the north-west corner and ends at the
// walled old town of Cattaro (Kotor) on its quay in the middle of the field; Dobrota’s stone houses line the arm’s
// north-east shore under the mountain. Across the arm the long ridge of the Vrmac drops straight into the water, Fort
// Gorazda on its eastern end over the Trojica saddle and Škaljari at its foot behind the town. East of the town the
// karst wall climbs at once — the town walls in two long ramparts up to St John’s fortress (Sveti Ivan) on its spur,
// the serpentine road in its hairpins — to the bare grey shoulders of Lovćen: the Montenegrin battery on the north
// shoulder over Njeguši’s little polje, Fort Kosmač on the south shoulder, the Krstac saddle between them. Dry-stone
// walls, sinkhole-pitted limestone, scrub, black pine and cypresses; January: snow on the high karst.
// (Coordinates: +z is the Montenegrin side; the bay comes in from −x, +z.)
// Fair by distance, not by a mirror: each side’s points pair up at the same reach from its own base — Dobrota on the
// shore against Fort Gorazda on the Vrmac, the Lovćen battery against Škaljari under the wall, Njeguši in its polje
// against Fort Kosmač; neither holds the town at the arm’s head, St John’s over it or the Krstac saddle. Montenegro
// has the arm’s shore and Lovćen’s heights; Austria the Vrmac across the water and the saddle road.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createSea } from '../world/Sea.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const SEED = 1916_0108;
const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 500;
const noise = createNoise2D(SEED);
/** The arm of the bay: its middle line from the north-west corner to the town’s quay, [x, z, half-width]. */
const ARM = [[-660, 580, 150], [-480, 400, 130], [-340, 250, 105], [-240, 110, 75], [-190, 30, 40]];
/** How far (x, z) lies from the arm’s water (m; − in the water). */
function shoreD(x: number, z: number) {
  let b = Infinity;
  for (let i = 0; i < ARM.length - 1; i++) {
    const [ax, az, aw] = ARM[i], [bx, bz, bw] = ARM[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    b = Math.min(b, Math.hypot(x - ax - dx * t, z - az - dz * t) - (aw + (bw - aw) * t) + 5 * Math.sin(x * 0.04 + z * 0.03));
  }
  return b;
}
const inland = gridCache(shoreD, EXT, 2);
/** The Vrmac’s crest line across the arm, and how far (x, z) lies from it. */
const VRMAC = [[-640, 140], [-460, -20], [-330, -170], [-255, -295]];
const vrmacD = (x: number, z: number) => {
  let b = Infinity;
  for (let i = 0; i < VRMAC.length - 1; i++) {
    const [ax, az] = VRMAC[i], [bx, bz] = VRMAC[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    b = Math.min(b, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return b;
};

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Cetinje road', 0, 470, 'centre'),
  P('B', 'Dobrota', -230, 330, 'west', { radius: 24 }),
  P('C', 'Lovćen battery', 150, 220, 'centre', { radius: 24 }),
  P('D', 'Njeguši', 300, 240, 'east', { radius: 28 }),
  P('E', 'Cattaro', -135, 0, 'west', { radius: 30 }),
  P('F', 'St John’s fortress', -30, 0, 'centre', { radius: 24 }),
  P('G', 'Krstac', 330, 0, 'east', { radius: 26 }),
  P('H', 'Škaljari', -120, -230, 'west', { radius: 24 }),
  P('I', 'Fort Gorazda', -260, -300, 'west', { radius: 24 }),
  P('J', 'Fort Kosmač', 300, -250, 'east', { radius: 26 }),
  P('K', 'Budva road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** A polyline with each corner rounded into an arc of radius `R` (tarvis.ts): the hairpins of a mountain road. */
function fillet(poly: number[][], R: number) {
  const out = [poly[0]];
  for (let i = 1; i < poly.length - 1; i++) {
    const [ax, az] = poly[i - 1], [bx, bz] = poly[i], [cx, cz] = poly[i + 1];
    const l1 = Math.hypot(ax - bx, az - bz), l2 = Math.hypot(cx - bx, cz - bz);
    const u1 = [(ax - bx) / l1, (az - bz) / l1], u2 = [(cx - bx) / l2, (cz - bz) / l2];
    const half = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))) / 2;
    if (half > 1.55) { out.push(poly[i]); continue; }                                           // (straight on)
    const t = Math.min(R / Math.tan(half), 0.45 * Math.min(l1, l2)), r = t * Math.tan(half);
    const p1 = [bx + u1[0] * t, bz + u1[1] * t], p2 = [bx + u2[0] * t, bz + u2[1] * t];
    const bis = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(bis[0], bis[1]) || 1, cd = r / Math.sin(half);
    const o = [bx + (bis[0] / bl) * cd, bz + (bis[1] / bl) * cd];
    const a0 = Math.atan2(p1[1] - o[1], p1[0] - o[0]), a1 = Math.atan2(p2[1] - o[1], p2[0] - o[0]);
    let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const n = Math.max(2, Math.ceil((Math.abs(da) * r) / 4));
    for (let k = 0; k <= n; k++) { const a = a0 + (da * k) / n; out.push([o[0] + Math.cos(a) * r, o[1] + Math.sin(a) * r]); }
  }
  out.push(poly[poly.length - 1]);
  return out;
}
/** The roads, every one graded (below): the shore road along the arm to the town; the serpentine from the town up to
 *  St John’s; each base’s roads to its points; the roads over the Lovćen shoulders and the Krstac saddle. */
const ROAD_LINES = [
  [[-330, 600], [-300, 450], at('B'), [-170, 180], [-130, 80], at('E')],
  [at('E'), [-108, -36], [-108, 44], [-82, 44], [-82, -36], [-56, -36], [-56, 30], at('F')],
  [[0, BASE_Z], [60, 390], at('C'), [70, 110], at('F')],
  [[0, BASE_Z], [-120, 430], at('B')],
  [[0, BASE_Z], [180, 400], at('D'), [600, 260]],
  [at('C'), [240, 230], at('D')],
  [at('D'), [340, 120], at('G')],
  [at('F'), [150, 20], at('G'), [600, 10]],
  [[0, -BASE_Z], [-90, -420], [-200, -390], at('I')],
  [[0, -BASE_Z], [-40, -360], at('H')],
  [at('H'), [-170, -150], [-110, -90], [-150, -40], at('E')],
  [at('H'), [-50, -120], at('F')],
  [at('I'), [-190, -260], at('H')],
  [[0, -BASE_Z], [160, -430], at('J'), [600, -260]],
  [at('J'), [340, -120], at('G')],
];
const ROADS = ROAD_LINES.map((r) => fillet(r, 12));
/** Every road segment [ax, az, bx, bz, x0, x1, z0, z1, road, s0, len], bucketed on a 40 m grid with every segment within 30 m of the cell. */
const SEGS: number[][] = [];
ROADS.forEach((r, ri) => { let s = 0; for (let i = 0; i < r.length - 1; i++) { const [ax, az] = r[i], [bx, bz] = r[i + 1], l = Math.hypot(bx - ax, bz - az); SEGS.push([ax, az, bx, bz, Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz), ri, s, l]); s += l; } });
const RC = 40, RN = 34, R0 = -680;
const RBUCKETS: number[][][] = Array.from({ length: RN * RN }, () => []);
for (const sg of SEGS) {
  const [, , , , x0, x1, z0, z1] = sg;
  for (let j = Math.max(0, Math.floor((z0 - 30 - R0) / RC)); j <= Math.min(RN - 1, Math.floor((z1 + 30 - R0) / RC)); j++)
    for (let i = Math.max(0, Math.floor((x0 - 30 - R0) / RC)); i <= Math.min(RN - 1, Math.floor((x1 + 30 - R0) / RC)); i++) RBUCKETS[j * RN + i].push(sg);
}
const bucket = (x: number, z: number) => { const i = Math.floor((x - R0) / RC), j = Math.floor((z - R0) / RC); return i < 0 || j < 0 || i >= RN || j >= RN ? [] : RBUCKETS[j * RN + i]; };
/** The nearest point of each road within `cap` m: [road, distance, how far along]. */
function nearRoads(x: number, z: number, cap: number) {
  const best: number[][] = [];
  for (const [ax, az, bx, bz, x0, x1, z0, z1, ri, s0, l] of bucket(x, z)) {
    if (x < x0 - cap || x > x1 + cap || z < z0 - cap || z > z1 + cap) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (l * l || 1)));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d >= cap) continue;
    const b = best.find((q) => q[0] === ri);
    if (!b) best.push([ri, d, s0 + t * l]); else if (d < b[1]) { b[1] = d; b[2] = s0 + t * l; }
  }
  return best;
}
const roadD0 = (x: number, z: number) => { let b = 30; for (const q of nearRoads(x, z, 30)) b = Math.min(b, q[1]); return b; };
const roadDc = gridCache(roadD0, EXT, 2); // (asked for every vertex’s colour, every prop and tree)
const roadD = (x: number, z: number, cap = 30) => Math.min(cap, roadDc(x, z));

/** The karst plateau of Lovćen’s shoulders: 0..1. */
const plateauK = (x: number, z: number) => smoothstep(-60, 120, x) * smoothstep(60, 240, inland(x, z));
/** The ground (no roads): the shore, the wall out of the water, the Vrmac, Lovćen’s mass, the shoulders and saddles. */
function mountain(x: number, z: number) {
  const inl = inland(x, z);
  let h = 1.4 + Math.min(Math.max(inl, 0), 30) * 0.05;                                         // the shore strip and the quays
  h += 52 * smoothstep(25, 230, inl);                                                          // the wall out of the water
  h += 50 * smoothstep(-160, 280, x) * smoothstep(-40, 160, inl);                              // Lovćen’s mass to the east
  h += 58 * Math.exp(-((vrmacD(x, z) / 120) ** 2)) * smoothstep(10, 90, inl);                  // the Vrmac across the arm
  for (const [hx, hz, hr, hh] of [[150, 220, 120, 36], [300, -250, 120, 22], [330, 0, 110, -14], [300, 240, 90, -10], [-30, 0, 55, 8]]) {
    const d = Math.hypot(x - hx, (z - hz) * 1.1); if (d < hr * 1.8) h += hh * Math.exp(-((d / hr) ** 2) * 1.4);   // the shoulders, Krstac, Njeguši’s polje, St John’s spur
  }
  { const t = Math.max(0, Math.min(1, ((x + 140) * 80 + (z + 20) * -400) / (80 * 80 + 400 * 400))), d = Math.hypot(x + 140 - 80 * t, z + 20 + 400 * t);
    h -= 34 * Math.exp(-((d / 95) ** 2)) * smoothstep(0, 0.25, t); }                         // the Škurda’s valley up from the town to the Trojica saddle
  let calm = 1;
  for (const p of points) { const d = Math.hypot(x - p.x, z - p.z); if (d < 70) calm = Math.min(calm, smoothstep(22, 70, d)); }
  h += (ridged(noise, x * 0.012 + 3, z * 0.012, 3) * 7 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.8) * smoothstep(40, 160, inl) * (0.35 + 0.65 * calm); // limestone ribs and hollows
  h += fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 4 * smoothstep(20, 80, inl) * (1 - smoothstep(120, 220, inl)); // gullies down the walls
  if (inl < 16) h += (0.3 + Math.max(inl, 0) * 0.08 - h) * (1 - smoothstep(6, 16, inl));      // the quays and shingle
  return h;
}
/** The shelves each point and base stands on (eased level, so the roads meet there level and a gun can unlimber). */
const SHELVES = [[0, BASE_Z, 36], [0, -BASE_Z, 36], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, 22])];
const SHELF_H = SHELVES.map(([x, z]) => mountain(x, z));
function ground(x: number, z: number) {
  let h = mountain(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { const d = Math.hypot(x - sx, z - sz); if (d < r + 24) h += (SHELF_H[i] - h) * smoothstep(r + 24, r, d); });
  return h;
}
/** Each road’s height every STEP m: the ground as closely as a grade of GRADE allows, its ends held at their shelves, smoothed (tarvis.ts). Worked out on first use. */
const GRADE = 0.24, STEP = 4;
let PROFILES: number[][] | null = null;
function profiles() {
  return (PROFILES ??= ROADS.map((t) => {
    const pts: number[][] = [];
    let carry = 0;
    for (let j = 0; j < t.length - 1; j++) {
      const [ax, az] = t[j], [bx, bz] = t[j + 1], l = Math.hypot(bx - ax, bz - az);
      for (let u = carry; u < l; u += STEP) pts.push([ax + ((bx - ax) * u) / l, az + ((bz - az) * u) / l]);
      carry = (carry - l) % STEP; if (carry < 0) carry += STEP;
    }
    pts.push(t[t.length - 1]);
    const n = pts.length - 1, d = GRADE * STEP, nat = pts.map(([x, z]) => ground(x, z)), h0 = nat[0], h1 = nat[n];
    const p = nat.map((v, k) => Math.max(Math.max(h0 - d * k, h1 - d * (n - k)), Math.min(Math.min(h0 + d * k, h1 + d * (n - k)), v)));
    for (let round = 0; round < 3; round++) {
      for (let k = 1; k < n; k++) p[k] = Math.max(p[k - 1] - d, Math.min(p[k - 1] + d, p[k]));
      for (let k = n - 1; k > 0; k--) p[k] = Math.max(p[k + 1] - d, Math.min(p[k + 1] + d, p[k]));
    }
    for (let round = 0; round < 3; round++) { const q = p.slice(); for (let k = 2; k < n - 1; k++) p[k] = (q[k - 2] + q[k - 1] + q[k] + q[k + 1] + q[k + 2]) / 5; }
    return p;
  }));
}
/** The land with its roads cut in, sampled once every 2 m (the noise and the roads are too dear for every vertex). */
const land = gridCacheSmooth((x: number, z: number) => {
  let h = ground(x, z);
  const PR = profiles();
  for (const [ri, d, s] of nearRoads(x, z, 12)) {
    const P = PR[ri], f = Math.min(P.length - 1.001, s / STEP), k = Math.floor(f);
    h += (P[k] + (P[k + 1] - P[k]) * (f - k) - h) * smoothstep(12, 5, d);
  }
  return h;
}, EXT, 2);
function height(x: number, z: number) {
  const inl = shoreD(x, z);
  if (inl < 0) return Math.max(-9, -0.8 + inl * 0.1);                                           // the bay
  return land(x, z);
}

/** One water sheet at the sea’s level (the bay). */
const water = {
  ...createSea({ level: 0, size: 1600 }),
  sea: false,
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2e5a66, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.88 });
    mat.userData.waterSurface = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
  },
};

/** The old town’s walls round the quay at the arm’s head (the water side left open to the quays) and the two ramparts up to St John’s. */
const TOWN_WALL = [[-168, 52], [-104, 56], [-98, 0], [-104, -54], [-170, -50]];
const RAMPARTS = [[[-104, 56], [-80, 60], [-58, 44], [-44, 24]], [[-104, -54], [-80, -56], [-56, -40], [-42, -22]]];
const inTown = (x: number, z: number) => x > -175 && x < -104 && Math.abs(z) < 50 && inland(x, z) > 10;

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1. četa' }];

export default {
  id: 'cattaro',
  name: 'Cattaro',
  description: 'January 1916, the Bocche di Cattaro: the Austro-Hungarian XIX Corps storms the Montenegrin batteries on Mount Lovćen above the navy’s anchorage — the fjord-like arm of the bay ending at the walled old town of Kotor on its quay, the Vrmac ridge dropping into the water opposite Dobrota, the ramparts and the serpentine climbing to St John’s fortress, Fort Gorazda and Fort Kosmač, the Krstac saddle and Njeguši.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (systems/Airfields.js: a quay under a mountain wall and pitted karst — no runway fits)
  armies: { nato: ['serb', 'it'], pact: ['ah'] }, // (the Montenegrins fight as the Serbian army, the Italians until it has units)
  sides: { nato: 'Montenegro', pact: 'Austria-Hungary' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  steep: 0.5, // (wheels keep to the roads where the wall is steep; men climb anywhere)
  overwatch: true,
  height,
  river: water,
  fields: createFields({ seed: SEED, cell: 60, weights: [0.6, 0.05, 0.1, 0.25] as any }),

  theme: {
    // a clear January day over the Bocche: low sun, cold blue water, snow lying in the karst’s hollows up top
    fogColor: 0xbcc4cc, fogDensity: 0.0012, skyTop: 0x5a7eaa, skyHorizon: 0xd0d8e0, skyBottom: 0x80847e,
    sunColor: 0xfff2e2, sunIntensity: 1.6, sunDisk: 0.3, clouds: 0.3, cloudLight: 0xf2f4f6, cloudDark: 0x9aa2ac,
    sunDir: [0.45, 0.5, 0.35], hemiSky: 0xc4d2e2, hemiGround: 0x6e6e62, hemiIntensity: 1.3, rimColor: 0xe0e6ec, rimIntensity: 0.25,
    terrain: {
      grass: '#646a46', grassAlt: '#5c6440', dryGrass: '#857e5a', dirt: '#6e6250', rock: '#8a887c',
      pasture: '#6c7248', ploughed: '#76644e', stubble: '#9e9264', meadow: '#727a4c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (y < 0.2) return [0x4e4c44, 0.95];                                                       // under the water
        const inl = inland(x, z);
        if (inl < 12 && y < 1.6) return [0xb4ae9e, 0.95];                                          // the quays and the shingle
        if (roadD(x, z, 4) < 3.4) return [0xbab2a0, 0.9];                                           // the white limestone roads
        if (inTown(x, z)) return [0x9c968a, 0.85];                                                  // the town’s paving
        const pk = plateauK(x, z), n = fbm(noise, x * 0.035 + 7, z * 0.035, 2);
        if (y > 95 && n < -0.15) return [0xe8ecee, Math.min(0.9, (y - 95) * 0.08)];                 // snow in the hollows
        if (inl > 40 && inl < 200 && y > 20 && pk < 0.3) return [0x8e8a80, 0.7];                   // the bare wall
        if (pk > 0.2 && n > 0.05) return [n > 0.3 ? 0xb2aea2 : 0x9a968a, Math.min(0.8, pk * (n + 0.1) * 2)]; // bare limestone
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: -40, z: 340 }, pact: { x: -40, z: -340 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  /** Each side’s line across its karst (stone-and-sandbag fire trench, wire in front, gaps at the roads), MG posts at its heights. */
  battlefield() {
    const steepAt = (x: number, z: number) => Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, n = s > 0;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 24) { const X = x * s; pts.push([X, s * (125 + 12 * Math.sin(X * (n ? 0.019 : 0.023) + (n ? 0 : 1.3)))]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { zig: 2.5, wireAt: 18, belts: 1, gapEvery: 50 })) if (roadD(w.x, w.z) > 10 && inland(w.x, w.z) > 60 && steepAt(w.x, w.z) < 0.3 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 30)) works.push(w);
      for (const id of n ? ['B', 'C', 'D'] : ['H', 'I', 'J']) {
        const [px, pz] = at(id);
        [[-12, -15], [12, -15], [-17, -4], [17, -4], [0, -18]].map(([dx, dz]) => [px + dx, pz + dz * s]).filter(([x, z]) => roadD(x, z) > 7 && inland(x, z) > 8).slice(0, 2)
          .forEach(([x, z]) => works.push({ kind: 'mgNest', x, z, yaw: n ? Math.PI : 0, faction: f }));
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + r);
    const skip = (x: number, z: number) => roadD(x, z, 12) < 9 || inland(x, z) < 10 || steepAt(x, z) > 0.3;
    const stone = 0xb0aa9c;
    /** A wall along a polyline in short pieces (each on its own ground), left open where a road crosses. */
    const wallAlong = (poly: number[][], h: number, t: number) => {
      for (let i = 0; i < poly.length - 1; i++) {
        const [ax, az] = poly[i], [bx, bz] = poly[i + 1], l = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bz - az, bx - ax) * -1;
        for (let u = 3; u < l; u += 6) {
          const x = ax + ((bx - ax) * u) / l, z = az + ((bz - az) * u) / l;
          if (roadD(x, z) < 10 || nearPoint(x, z, 12) || inland(x, z) < 4) continue;
          props.wall({ x, z, yaw, length: 6, height: h, thickness: t });
        }
      }
    };

    // Cattaro: the old town packed inside its walls on the quay — tall stone houses, St Tryphon’s cathedral, the sea gate
    {
      const r = (props.rand = mulberry32(SEED + 11));
      const [ex, ez] = at('E');
      placed.push([-160, 32, 14]);
      props.church({ x: -160, z: 32, yaw: 0 });
      for (let i = 0; i < 300 && placed.length < 40; i++) {
        const x = -172 + r() * 68, z = (r() * 2 - 1) * 48;
        if (!inTown(x, z) || roadD(x, z, 16) < 14 || Math.hypot(x - ex, z - ez) < 26 || !free(x, z, 6)) continue;
        placed.push([x, z, 6]);
        props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + r() * 0.15, width: 7 + r() * 2, depth: 8 + r() * 2, storeys: r() < 0.5 ? 3 : 2, damaged: 0.05 });
      }
      wallAlong(TOWN_WALL, 3.2, 1.4);
      for (const rp of RAMPARTS) wallAlong(rp, 2.4, 1.1);
    }
    // the stone villages along the shore and up top: Dobrota along the arm, Škaljari, Njeguši; Krstac’s border post
    for (const [id, n, sp] of [['B', 10, 1.0], ['H', 9, 1.0], ['D', 8, 1.1], ['G', 4, 1.0]] as [string, number, number][]) {
      const [x, z] = at(id);
      farmVillage(props, x, z, n, SEED + Math.round(x * 3 + z * 7), (a, b) => skip(a, b) || !free(a, b, 6) || nearPoint(a, b, 12), sp);
    }
    // Dobrota’s captains’ houses strung along the shore road
    {
      const r = (props.rand = mulberry32(SEED + 15));
      for (let i = 0, n = 0; i < 200 && n < 12; i++) {
        const z = 180 + r() * 360, x = -300 + (z - 450) * -0.55 + (r() - 0.5) * 30;
        if (skip(x, z) || inland(x, z) > 60 || !free(x, z, 7) || nearPoint(x, z, 14)) continue;
        n++; placed.push([x, z, 7]);
        props.townHouse({ x, z, yaw: -0.8 + r() * 0.2, width: 8 + r() * 3, depth: 8, storeys: r() < 0.5 ? 3 : 2, damaged: 0.02 });
      }
    }
    props.rand = mulberry32(SEED + 21);
    for (const [x, z, yaw] of [[-206, 372, 0.8], [-96, -258, Math.PI], [326, 270, 0]]) if (!skip(x, z) && free(x, z, 10)) { props.church({ x, z, yaw }); placed.push([x, z, 10]); }
    for (const [x, z] of [[300, 22], [352, -26]]) if (!skip(x, z) && free(x, z, 6)) { props.house({ x, z, yaw: 0.1, width: 9, depth: 6, height: 3.4 }); placed.push([x, z, 7]); }

    // the forts: casemated stone batteries, a blockhouse, a glacis wall in front
    const fort = (x: number, z: number, yaw: number, name: string, seed: number, w = 24) => {
      props.rand = mulberry32(seed);
      props.hall({ x, z, yaw, width: w, depth: 10, height: 4.6, color: 0x8e8a7e, roof: 0x5c5e56, door: 4, name });
      const g = terrain.heightAt(x, z);
      for (const side of [-1, 1]) for (let i = -2; i <= 2; i++) { const [ex, ez] = PropBuilder.local(x, z, yaw, i * (w / 5.2), side * 5.2); props.box('metal', ex, g + 2.6, ez, 1.5, 0.8, 0.3, yaw, 0x18191a); }
      const [tx, tz] = PropBuilder.local(x, z, yaw, w / 2 + 3, -2);
      props.box('stone', tx, terrain.heightAt(tx, tz) + 4, tz, 7, 8, 7, yaw, 0x8a867c);
      props.box('stone', tx, terrain.heightAt(tx, tz) + 8.2, tz, 7.6, 0.5, 7.6, yaw, 0x6a6862);
      cover.addBox({ x: tx, z: tz, yaw, length: 7, thickness: 7, height: 8 });
      const [wx, wz] = PropBuilder.local(x, z, yaw, -2, 13);
      props.wall({ x: wx, z: wz, yaw, length: w + 6, height: 1.6, thickness: 0.9 });
      placed.push([x, z, w / 2 + 6], [tx, tz, 8]);
    };
    fort(124, 262, 0, 'Lovćen battery', SEED + 31);
    fort(-296, -330, Math.PI, 'Fort Gorazda', SEED + 32, 20);
    fort(336, -290, Math.PI, 'Fort Kosmač', SEED + 33, 18);
    fort(-4, 34, Math.PI / 2, 'St John’s fortress', SEED + 34, 18);
    // the Montenegrin gun pits on Lovćen and the Austrian ones on the Vrmac: sandbagged, facing each other over the town
    for (const [x, z, s] of [[110, 190, -1], [176, 196, -1], [-228, -272, 1], [-284, -262, 1]]) if (roadD(x, z) > 8 && free(x, z, 5)) props.sandbagRing({ x, z, radius: 4, toward: s });
    // the fleet’s moorings: boats and quayside crates at the town and along Dobrota’s shore
    for (const [x, z] of [[-176, 20], [-178, -22], [-250, 250], [-300, 340]]) if (free(x, z, 4) && inland(x, z) > 2 && inland(x, z) < 12) { props.crates({ x, z, yaw: 0.7 }); placed.push([x, z, 4]); }

    // dry-stone walls round the patches of soil, loose limestone, sangars (each half its own dice)
    for (const s of [1, -1]) {
      const r = mulberry32(SEED + (s > 0 ? 41 : 57));
      for (let i = 0; i < 460; i++) {
        const x = (r() * 2 - 1) * 480, z = s * (15 + r() * 520), big = r();
        if (nearPoint(x, z, 30) || skip(x, z) || inTown(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || !free(x, z, 3)) continue;
        if (big < 0.45) props.boulder({ x, z, radius: 0.6 + r() * 1.4 });
        else props.lowWall({ x, z, yaw: r() * 3, length: 6 + r() * 8, height: 1.0, color: stone });
      }
      for (let i = 0, n = 0; i < 2000 && n < 12; i++) {
        const x = (r() * 2 - 1) * 460, z = s * (150 + r() * 300);
        if (skip(x, z) || inland(x, z) < 120 || nearPoint(x, z, 45) || !free(x, z, 10)) continue;
        n++;
        placed.push([x, z, 10]);
        buildSite(props, { kind: ['fieldwall', 'rocks', 'farm', 'fieldwall'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
      }
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a56);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    water.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      ...placed.map(([x, z, pr]) => ({ x, z, r: pr + 3 })),
      { test: (x: number, z: number) => roadD(x, z, 8) < 6 || inland(x, z) < 8 || inTown(x, z) }];
    // the karst scrub (hornbeam, oak, juniper — bare or brown in January) and black pines, thick on the Vrmac and the
    // walls over the water; cypresses round the villages and the town
    const scrub0 = (x: number, z: number) => fbm(noise, x * 0.008 + 40, z * 0.008, 3);
    const tP = evenThreshold(scrub0, 0.1, (x: number, z: number) => z > 0);
    const forest = (x: number, z: number) => {
      const front = 1 - smoothstep(80, 190, Math.abs(z)), w = scrub0(x, z) - (z > 0 ? 0 : tP - 0.1), inl = inland(x, z);
      return (w > 0.1 ? 0.5 : 0.08) * (1 - 0.8 * front) + (inl > 30 && inl < 200 ? 0.3 : 0) + (vrmacD(x, z) < 150 ? 0.2 : 0);
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, avoid, count: 3200, broadleaf: 0.75, autumn: 0.6, maxY: 160, size: 0.55, forest });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, avoid, count: 500, broadleaf: 0, autumn: 0, maxY: 160, size: 0.85, forest: (x: number, z: number) => forest(x, z) * 0.6 });
    const villages = ['B', 'H', 'D', 'G', 'E'].map(at);
    const cypresses = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, avoid, count: 260, broadleaf: 0, autumn: 0, maxY: 160, size: 0.75,
      forest: (x: number, z: number) => (villages.some(([vx, vz]) => Math.hypot(vx - x, vz - z) < 75) || (inland(x, z) < 50 && z > 150) ? 1 : -1) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [{ test: (x: number, z: number) => roadD(x, z) < 4 || inland(x, z) < 10 || inTown(x, z) }], density: 1.4, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); pines.update(dt, t); cypresses.update(dt, t); },
    };
  },
} satisfies MapDef;
