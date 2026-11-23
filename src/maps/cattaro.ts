// Cattaro, January 1916: the Bocche di Cattaro (the Bay of Kotor), the k.u.k. Kriegsmarine’s southern base, and the
// storming of Mount Lovćen. Montenegro’s batteries on Lovćen had looked straight down into the bay and the fleet
// anchorage since 1914; on 8–11 January 1916 General Kövess’s XIX Corps, with the guns of the Austrian forts and the
// battleships in the bay behind it, went up the bare karst wall above the town against the Montenegrin positions and
// took the mountain; Cetinje fell two days later and Montenegro asked for terms.
// The ground: the bay’s inner basin along the west edge — the fjord-like water under the mountain wall, its shore a
// narrow strip of stone villages and quays: Dobrota along the north shore, Škaljari to the south, and between them
// the walled old town of Cattaro (Kotor) on its quay, the town walls climbing the mountainside in two long ramparts to
// St John’s fortress (Sveti Ivan) on its spur above the town. Behind the wall the bare grey karst of Lovćen’s
// shoulders: the famous serpentine road up from the shore in its hairpins, the Montenegrin batteries on Lovćen over
// the north half, the Austrian Fort Gorazda over the south and Fort Kosmač on the Budva side, the border saddle at
// Krstac, Njeguši in its little polje, dry-stone walls, sinkhole-pitted limestone, scrub, black pine and cypresses.
// January: patches of snow on the high karst.
// (Coordinates: +z is the Montenegrin side, the north; the bay is at −x.)
// Not mirrored but fair: the bay’s basin is centred on the town, so the shore and the wall above it run alike through
// both halves. Each side has a height of the same size and height at the same reach from its base with a stone fort
// on it (the Lovćen battery against Fort Gorazda), a shore village under the wall reached by its own serpentine of the
// same number of hairpins (Dobrota, Škaljari), and a point on its east flank with the same roads (Njeguši’s houses in
// its polje, Fort Kosmač’s works). Neither side holds the town on the quay, St John’s fortress over it (each base the
// same trunk road to it, and a third serpentine from the town up to it) or the Krstac saddle in the east, between a
// shoulder in each half. The karst’s ribs, sinkholes, scrub and walls are each half’s own dice, evened out.
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
/** The bay’s waterline down the west edge, bowed inland round the Kotor basin; inland distance from it. */
const shoreX = (z: number) => -440 + 190 * Math.exp(-((z / 230) ** 2)) + 6 * Math.sin(z * 0.013 + 0.7);
const inland = (x: number, z: number) => x - shoreX(z);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Cetinje road', 0, 470, 'centre'),
  P('B', 'Dobrota', -350, 272, 'west', { radius: 24 }),
  P('C', 'Lovćen battery', -30, 255, 'centre', { radius: 24 }),
  P('D', 'Njeguši', 330, 290, 'east', { radius: 26 }),
  P('E', 'Cattaro', -210, 0, 'west', { radius: 30 }),
  P('F', 'St John’s fortress', 0, 0, 'centre', { radius: 26 }),
  P('G', 'Krstac', 300, -10, 'east', { radius: 26 }),
  P('H', 'Škaljari', -352, -270, 'west', { radius: 24 }),
  P('I', 'Fort Gorazda', 20, -255, 'centre', { radius: 24 }),
  P('J', 'Fort Kosmač', 340, -290, 'east', { radius: 26 }),
  P('K', 'Budva road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The heights [x, z, r, h]: the Lovćen battery’s hill, Fort Gorazda’s, St John’s spur, the two shoulders over Krstac. */
const HILLS = [[-30, 255, 150, 38], [20, -255, 150, 38], [0, 0, 70, 9], [400, 140, 95, 18], [250, -150, 95, 18]];

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
/** The roads, every one graded (below): the shore road; the three serpentines up the wall (Dobrota’s, Škaljari’s, the
 *  town’s to St John’s); each base’s trunk road through its height to St John’s; the laterals to the east flank; the
 *  Krstac road; the flank roads to Krstac. */
const ROAD_LINES = [
  [[-402, 600], [-398, 430], [-372, 340], at('B'), [-292, 170], [-240, 85], at('E'), [-238, -85], [-294, -170], at('H'), [-376, -345], [-400, -440], [-405, -600]],
  [at('B'), [-318, 282], [-318, 400], [-282, 400], [-282, 290], [-246, 290], [-246, 400], [-210, 400], [-210, 300], [-150, 292], [-90, 276], at('C')],
  [at('H'), [-322, -284], [-322, -412], [-286, -412], [-286, -298], [-250, -298], [-250, -412], [-214, -412], [-214, -306], [-150, -296], [-70, -272], at('I')],
  [at('E'), [-170, -50], [-170, 55], [-134, 55], [-134, -50], [-98, -50], [-98, 55], [-62, 55], [-62, -30], [-25, -14], at('F')],
  [[0, 600], [0, BASE_Z], [10, 400], at('C'), [-20, 130], at('F')],
  [[0, -600], [0, -BASE_Z], [-10, -400], at('I'), [25, -130], at('F')],
  [at('C'), [150, 270], at('D'), [600, 300]],
  [at('I'), [170, -270], at('J'), [600, -280]],
  [at('F'), [150, -5], at('G'), [600, -20]],
  [at('D'), [320, 140], at('G')], [at('J'), [330, -150], at('G')],
];
const ROADS = ROAD_LINES.map((r) => fillet(r, 17));
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
  return best.sort((a, b) => a[0] - b[0]);
}
const roadD0 = (x: number, z: number) => { let b = 30; for (const q of nearRoads(x, z, 30)) b = Math.min(b, q[1]); return b; };
const roadDc = gridCache(roadD0, EXT, 2); // (asked for every vertex’s colour, every prop and tree)
const roadD = (x: number, z: number, cap = 30) => Math.min(cap, roadDc(x, z));

/** The karst plateau above the wall: 0..1. */
const plateauK = (x: number, z: number) => smoothstep(150, 260, inland(x, z));
/** The ground (no roads): the shore strip, the mountain wall, the karst with its ribs and the heights, the bases levelled. */
function ground(x: number, z: number) {
  const inl = inland(x, z);
  const wk = smoothstep(80, 210, inl), pk = plateauK(x, z);
  let h = 1.4 + Math.min(Math.max(inl, 0), 80) * 0.03;                                         // the shore strip
  h += 58 * wk + 10 * smoothstep(120, 480, x) * wk;                                             // the wall, and Lovćen’s mass behind to the east
  let calm = 1;
  for (const p of points) { const d = Math.hypot(x - p.x, z - p.z); if (d < 70) calm = Math.min(calm, smoothstep(22, 70, d)); }
  h += (ridged(noise, x * 0.012 + 3, z * 0.012, 3) * 6 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.8) * pk * (0.35 + 0.65 * calm); // limestone ribs and hollows
  h += fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 3 * wk * (1 - wk) * 4;                            // gullies down the wall
  if (inl < 20) h += (0.3 + Math.max(inl, 0) * 0.06 - h) * (1 - smoothstep(5, 20, inl));      // the quays and shingle
  for (const [hx, hz, hr, hh] of HILLS) { const d = Math.hypot(x - hx, (z - hz) * 1.1); if (d < hr) h += hh * smoothstep(hr, 0, d) ** 1.4; }
  for (const bz of [BASE_Z, -BASE_Z]) { const b = Math.hypot(x, z - bz); if (b < 40) h += (66 - h) * smoothstep(40, 22, b); }
  return h;
}
/** Each road’s height every STEP m: the ground as closely as a grade of GRADE allows, smoothed (tarvis.ts). Worked out on first use. */
const GRADE = 0.22, STEP = 4;
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
    const n = pts.length - 1, d = GRADE * STEP, nat = pts.map(([x, z]) => ground(x, z)), p = nat.slice();
    for (let round = 0; round < 3; round++) {
      for (let k = 1; k <= n; k++) p[k] = Math.max(p[k - 1] - d, Math.min(p[k - 1] + d, round ? p[k] : nat[k]));
      for (let k = n - 1; k >= 0; k--) p[k] = Math.max(p[k + 1] - d, Math.min(p[k + 1] + d, p[k]));
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
  const inl = inland(x, z);
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

/** The old town’s walls round the quay (the bay side left open to the quays) and the two ramparts up to St John’s. */
const TOWN_WALL = [[-236, 64], [-176, 66], [-170, 0], [-178, -64], [-236, -62]];
const RAMPARTS = [[[-176, 66], [-130, 72], [-80, 70], [-50, 56], [-32, 46]], [[-178, -64], [-130, -66], [-84, -64]]];
const inTown = (x: number, z: number) => x > shoreX(z) + 12 && x < -176 && Math.abs(z) < 60;

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1. četa' }];

export default {
  id: 'cattaro',
  name: 'Cattaro',
  description: 'January 1916, the Bocche di Cattaro: the Austro-Hungarian XIX Corps storms the Montenegrin batteries on Mount Lovćen above the navy’s anchorage — the walled old town of Kotor on its quay, its ramparts climbing to St John’s fortress, the serpentine road up the bare karst wall, Fort Gorazda and Fort Kosmač, the Krstac saddle and Njeguši.',
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
  steep: 0.5, // (wheels keep to the serpentines up the wall; men climb anywhere)
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
        if (y > 64 && n < -0.15) return [0xe8ecee, Math.min(0.9, (y - 64) * 0.08)];                 // snow in the hollows
        if (inl > 90 && inl < 220) return [0x8e8a80, 0.75];                                        // the bare wall
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

  /** Each side’s line across its karst (stone-and-sandbag fire trench, wire in front, gaps at the roads), MG posts at its height and flank. */
  battlefield() {
    const steepAt = (x: number, z: number) => Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, n = s > 0;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 24) { const X = x * s; pts.push([X, s * (130 + 10 * Math.sin(X * (n ? 0.019 : 0.023) + (n ? 0 : 1.3)))]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { zig: 2.5, wireAt: 18, belts: 1, gapEvery: 50 })) if (roadD(w.x, w.z) > 10 && inland(w.x, w.z) > 230 && steepAt(w.x, w.z) < 0.3 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 30)) works.push(w);
      for (const id of n ? ['C', 'D'] : ['I', 'J']) {
        const [px, pz] = at(id);
        [[-12, -15], [12, -15], [-17, -4], [17, -4], [0, -18]].map(([dx, dz]) => [px + dx, pz + dz * s]).filter(([x, z]) => roadD(x, z) > 7).slice(0, 2)
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
          if (roadD(x, z) < 10 || nearPoint(x, z, 12)) continue;
          props.wall({ x, z, yaw, length: 6, height: h, thickness: t });
        }
      }
    };

    // Cattaro: the old town packed inside its walls on the quay — tall stone houses, St Tryphon’s cathedral, the sea gate
    {
      const r = (props.rand = mulberry32(SEED + 11));
      const [ex, ez] = at('E');
      placed.push([-195, 38, 14]);
      props.church({ x: -195, z: 38, yaw: 0 });
      for (let i = 0; i < 300 && placed.length < 40; i++) {
        const x = ex - 30 + r() * 62, z = ez + (r() * 2 - 1) * 56;
        if (!inTown(x, z) || roadD(x, z, 12) < 10.5 || Math.hypot(x - ex, z - ez) < 22 || !free(x, z, 6)) continue;
        placed.push([x, z, 6]);
        props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + r() * 0.15, width: 7 + r() * 2, depth: 8 + r() * 2, storeys: r() < 0.5 ? 3 : 2, damaged: 0.05 });
      }
      wallAlong(TOWN_WALL, 3.2, 1.4);
      for (const rp of RAMPARTS) wallAlong(rp, 2.4, 1.1);
    }
    // the stone villages along the shore and up top: Dobrota, Škaljari, Njeguši; Krstac’s border post
    for (const [id, n, sp] of [['B', 9, 1.0], ['H', 9, 1.0], ['D', 8, 1.1], ['G', 4, 1.0]] as [string, number, number][]) {
      const [x, z] = at(id);
      farmVillage(props, x, z, n, SEED + Math.round(x * 3 + z * 7), (a, b) => skip(a, b) || !free(a, b, 6) || nearPoint(a, b, 12), sp);
    }
    props.rand = mulberry32(SEED + 21);
    for (const [x, z, yaw] of [[-338, 320, 0], [-342, -320, Math.PI], [356, 320, 0]]) if (!skip(x, z) && free(x, z, 10)) { props.church({ x, z, yaw }); placed.push([x, z, 10]); }
    for (const [x, z] of [[300, 18], [276, -36]]) if (!skip(x, z) && free(x, z, 6)) { props.house({ x, z, yaw: 0.1, width: 9, depth: 6, height: 3.4 }); placed.push([x, z, 7]); }

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
    fort(-62, 302, 0, 'Lovćen battery', SEED + 31);
    fort(58, -302, Math.PI, 'Fort Gorazda', SEED + 32);
    fort(372, -332, Math.PI, 'Fort Kosmač', SEED + 33, 18);
    fort(-34, 26, Math.PI / 2, 'St John’s fortress', SEED + 34, 18);
    // the Montenegrin gun pits on Lovćen and the Austrian ones on Gorazda: sandbagged, facing each other
    for (const [x, z, s] of [[-70, 236, -1], [12, 228, -1], [62, -232, 1], [-20, -226, 1]]) if (roadD(x, z) > 8) props.sandbagRing({ x, z, radius: 4, toward: s });

    // dry-stone walls round the patches of soil, loose limestone, sangars (each half its own dice)
    for (const s of [1, -1]) {
      const r = mulberry32(SEED + (s > 0 ? 41 : 57));
      for (let i = 0; i < 420; i++) {
        const x = (r() * 2 - 1) * 480, z = s * (15 + r() * 520), big = r();
        if (nearPoint(x, z, 30) || skip(x, z) || inTown(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || !free(x, z, 3)) continue;
        if (big < 0.45) props.boulder({ x, z, radius: 0.6 + r() * 1.4 });
        else props.lowWall({ x, z, yaw: r() * 3, length: 6 + r() * 8, height: 1.0, color: stone });
      }
      for (let i = 0, n = 0; i < 2000 && n < 12; i++) {
        const x = (r() * 2 - 1) * 460, z = s * (150 + r() * 300);
        if (skip(x, z) || inland(x, z) < 230 || nearPoint(x, z, 45) || !free(x, z, 10)) continue;
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
    // the karst scrub (hornbeam, oak, juniper — bare or brown in January) and black pines, thicker on the wall; cypresses round the villages and the town
    const scrub0 = (x: number, z: number) => fbm(noise, x * 0.008 + 40, z * 0.008, 3);
    const tP = evenThreshold(scrub0, 0.1, (x: number, z: number) => z > 0);
    const forest = (x: number, z: number) => {
      const front = 1 - smoothstep(80, 190, Math.abs(z)), w = scrub0(x, z) - (z > 0 ? 0 : tP - 0.1), inl = inland(x, z);
      return (w > 0.1 ? 0.5 : 0.08) * (1 - 0.8 * front) + (inl > 70 && inl < 230 ? 0.3 : 0);
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 3000, broadleaf: 0.75, autumn: 0.6, maxY: 140, size: 0.55, forest });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 400, broadleaf: 0, autumn: 0, maxY: 140, size: 0.85, forest: (x: number, z: number) => forest(x, z) * 0.6 });
    const villages = ['B', 'H', 'D', 'G', 'E'].map(at);
    const cypresses = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, avoid, count: 260, broadleaf: 0, autumn: 0, maxY: 140, size: 0.75,
      forest: (x: number, z: number) => (villages.some(([vx, vz]) => Math.hypot(vx - x, vz - z) < 75) ? 1 : -1) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [{ test: (x: number, z: number) => roadD(x, z) < 4 || inland(x, z) < 10 || inTown(x, z) }], density: 1.4, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); pines.update(dt, t); cypresses.update(dt, t); },
    };
  },
} satisfies MapDef;
