// Trieste and the Karst, November 1805 (hypothetical): after Caldiero Archduke Charles drew the Army of Italy back
// through Friuli to defend Vienna, and Masséna’s advance guard took Trieste without a fight on 13 November. Here it
// is fought for: an Austrian rearguard holds the port and the Karst above it against the French coming over the
// plateau from the Isonzo. The ground, compressed: the Gulf of Trieste along the west edge (−x), the town on its
// narrow shore strip under the Karst edge — the port with its moles, the old town under the hill of San Giusto,
// castle and cathedral on top; the coast road along the water from Barcola to Servola. Behind the town the edge rises
// steeply onto the limestone plateau, where the villages stand among dry-stone walls, dolines (the round sinkholes),
// scrub oak, black pine and the sumac turned red. The French come from the north-west (+z: the plateau road from
// Prosecco), the Austrians from the south-east (−z: the road to Fiume). Two roads climb the edge from the town in
// hairpins — the Strada Nuova to Opicina and the road to Basovizza — and a serpentine from each shore village.
// Fair, not mirrored: the gulf, the shore strip and the edge run the whole length; the port and San Giusto’s castle
// over it are in the middle, as is Banne on the plateau. Each side has a shore village with its own serpentine
// (Barcola, Servola), a plateau village at the head of a road up from the town (Opicina, Basovizza) and a hill on the
// east flank (Monrupino with its walled church, Lipizza under Monte Cocusso), each as far from its own base, as high.
// The dolines and walls are each half’s own dice, the same number on each.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createSea } from '../world/Sea.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import { graded } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 470;
const EDGE = 100;                                                                // the Karst edge’s height over the shore
const noise = createNoise2D(1805_1113);
/** The gulf’s waterline down the west edge, bowed inland at the town; inland distance from it. */
const shoreX = (z) => -400 + 160 * Math.exp(-(((z + 10) / 230) ** 2)) + 6 * Math.sin(z * 0.013 + 0.7);
const inland = (x, z) => x - shoreX(z);
/** 0..1 up the edge: the shore strip (0) to the plateau (1). */
const edgeK = (x, z) => smoothstep(90, 230, inland(x, z));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Prosecco road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Barcola', x: -335, z: 280, owner: null, sector: 'west' },
  { id: 'C', name: 'Opicina', x: -55, z: 250, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Monrupino', x: 320, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Trieste harbour', x: -205, z: 10, owner: null, sector: 'west', radius: 30 },
  { id: 'F', name: 'San Giusto', x: -140, z: -25, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Banne', x: 300, z: -10, owner: null, sector: 'east' },
  { id: 'H', name: 'Servola', x: -325, z: -270, owner: null, sector: 'west' },
  { id: 'I', name: 'Basovizza', x: -30, z: -255, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Lipizza', x: 335, z: -280, owner: null, sector: 'east' },
  { id: 'K', name: 'Fiume road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const at = (id) => [P[id].x, P[id].z];

/** The hills [x, z, r, h]: San Giusto’s over the town, Monrupino’s, Monte Cocusso’s over Lipizza. */
const HILLS = [[P.F.x - 10, P.F.z, 85, 22], [P.D.x + 20, P.D.z + 10, 95, 22], [P.J.x + 25, P.J.z - 15, 95, 22]];
/** The dolines [x, z, r]: the same number on each half, each half from its own seed, clear of the points and the roads’ lines. */
const DOLINES: number[][] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 1805_71 : 1805_79);
  for (let i = 0, n = 0; i < 4000 && n < 12; i++) {
    const x = -120 + r() * 600, z = s * (60 + r() * 440), rad = 16 + r() * 14;
    if (inland(x, z) < 260 || POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 60) || DOLINES.some(([dx, dz, dr]) => Math.hypot(dx - x, dz - z) < dr + rad + 30) || Math.abs(x) < 50 && Math.abs(Math.abs(z) - BASE_Z) < 60) continue;
    DOLINES.push([x, z, rad]); n++;
  }
}

/** The ground (no roads): the gulf’s shelving floor, the shore strip, the edge, the plateau with its ribs and hollows. */
function ground(x, z) {
  const inl = inland(x, z);
  if (inl < 0) return Math.max(-9, -0.8 + inl * 0.1);                                             // the gulf
  const ek = edgeK(x, z);
  let h = 1.2 + Math.min(inl, 80) * 0.03 + EDGE * ek;                                             // the strip, the edge, the plateau
  let calm = 1;
  if (ek > 0) for (const p of POINTS) { if (Math.abs(x - p.x) > 70 || Math.abs(z - p.z) > 70) continue; const d = Math.hypot(x - p.x, z - p.z); if (d < 70) calm = Math.min(calm, smoothstep(22, 70, d)); }
  if (ek > 0) h += (ridged(noise, x * 0.011 + 3, z * 0.011, 3) * 7 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.8) * ek * (0.3 + 0.7 * calm); // limestone ribs
  if (ek > 0 && ek < 1) h += fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 3 * ek * (1 - ek) * 4;                              // gullies down the edge
  if (inl < 14) h += (0.4 + inl * 0.05 - h) * (1 - smoothstep(6, 14, inl));                       // the quays and the shingle
  for (const [hx, hz, hr, hh] of HILLS) { const d = Math.hypot(x - hx, z - hz); if (d < hr) h += hh * smoothstep(hr, 0, d) ** 1.3; }
  for (const [dx, dz, dr] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const d = Math.hypot(x - dx, z - dz); if (d < dr) h -= 6 * smoothstep(dr, 0, d) ** 1.4; }
  for (const bz of [BASE_Z, -BASE_Z]) { const b = Math.hypot(x, z - bz); if (b < 40) h += (EDGE + 4 - h) * smoothstep(40, 22, b); }
  return h;
}

/** A serpentine: legs along z at the given x’s, between z0 and z1, turning at each end. */
const serp = (from, xs, z0, z1, to) => [from, ...xs.flatMap((x, i) => (i % 2 ? [[x, z1], [x, z0]] : [[x, z0], [x, z1]])), to];
const COAST = Array.from({ length: 49 }, (_, i) => -600 + i * 25).map((z) => [shoreX(z) + 22, z]);
/** The roads: [polyline, serpentine?] (each graded below). */
const ROAD_DEFS: [number[][], boolean][] = [
  [COAST, false],
  [serp(at('E'), [-178, -143, -108, -73], 55, 175, at('C')), true],                                  // the Strada Nuova to Opicina
  [serp(at('E'), [-172, -137, -102, -67], -60, -180, at('I')), true],                                // the road to Basovizza
  [serp(at('B'), [-300, -262, -224, -186, -148], 300, 410, [-110, 330]), true],                      // Barcola’s serpentine
  [serp(at('H'), [-290, -252, -214, -176, -138], -290, -400, [-100, -320]), true],                   // Servola’s
  [[at('E'), [-196, -40], [-168, -62], [-150, -45], at('F')], false],                                                          // up to San Giusto
  [[[0, 600], [0, BASE_Z], [-20, 380], at('C'), [-110, 330]], false],
  [[[0, -600], [0, -BASE_Z], [-10, -380], at('I'), [-100, -320]], false],
  [[at('C'), [130, 270], at('D'), [600, 300]], false],
  [[at('I'), [150, -270], at('J'), [600, -285]], false],
  [[at('C'), [120, 140], at('G'), [130, -140], at('I')], false],
  [[at('G'), [600, -15]], false],
];
/** Each road resampled every 4 m, its height the ground’s as closely as a grade of 0.24 allows, smoothed (as cattaro.ts). */
const STARTS: number[][] = [];                                                 // (where each corner falls in its resampled road)
const ROADS = ROAD_DEFS.map(([r]) => {
  const out = [r[0]], st = [0];
  STARTS.push(st);
  for (let i = 1; i < r.length; i++) {
    const [ax, az] = r[i - 1], [bx, bz] = r[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 4));
    for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    st.push(out.length - 1);
  }
  return out;
});
const HS = ROADS.map((r) => {
  const nat = r.map(([x, z]) => Math.max(1, ground(x, z))), p = nat.slice(), n = p.length - 1;
  const d = (k) => 0.24 * Math.hypot(r[k][0] - r[k - 1][0], r[k][1] - r[k - 1][1]);
  for (let round = 0; round < 3; round++) {
    for (let k = 1; k <= n; k++) p[k] = Math.max(p[k - 1] - d(k), Math.min(p[k - 1] + d(k), round ? p[k] : nat[k]));
    for (let k = n - 1; k >= 0; k--) p[k] = Math.max(p[k + 1] - d(k + 1), Math.min(p[k + 1] + d(k + 1), p[k]));
  }
  for (let round = 0; round < 3; round++) { const q = p.slice(); for (let k = 2; k < n - 1; k++) p[k] = (q[k - 2] + q[k - 1] + q[k] + q[k + 1] + q[k + 2]) / 5; }
  return p;
});
const ROAD0 = ROAD_DEFS.map(([r]) => r);
const segD = (r, x, z) => { let b = 99; for (let i = 0; i < r.length - 1; i++) { const [ax, az] = r[i], [bx, bz] = r[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); b = Math.min(b, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return b; };
const roadExact = (x, z) => Math.min(...ROAD0.map((r) => segD(r, x, z)));
const roadNear = gridCache(roadExact, EXT, 8);
const roadD = gridCache((x, z) => (roadNear(x, z) > 20 ? 99 : roadExact(x, z)), EXT, 2);

/** The land with the roads benched in, sampled once every 2 m. */
const land = gridCacheSmooth((x, z) => {
  let h = ground(x, z);
  if (roadNear(x, z) > 20) return h;
  let best = { d: 13, h: 0 };
  ROAD0.forEach((r0, i) => {
    for (let j = 0; j < r0.length - 1; j++) { // (only the corners' stretches within reach: the resampled road there)
      const [ax, az] = r0[j], [bx, bz] = r0[j + 1];
      if (x < Math.min(ax, bx) - 14 || x > Math.max(ax, bx) + 14 || z < Math.min(az, bz) - 14 || z > Math.max(az, bz) + 14) continue;
      const a = STARTS[i][j], b = STARTS[i][j + 1] + 1;
      const g = graded(ROADS[i].slice(a, b), HS[i].slice(a, b), x, z);
      if (g.d < best.d) best = g;
    }
  });
  if (best.d < 13) h += (best.h - h) * smoothstep(13, 5, best.d);
  return h;
}, EXT, 2);
function height(x, z) {
  const inl = inland(x, z);
  if (inl < 0) return Math.max(-9, -0.8 + inl * 0.1);
  return land(x, z);
}

/** One water sheet at the sea’s level (the gulf). */
const water = {
  ...createSea({ level: 0, size: 1600 }),
  sea: false,
  build(scene) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a6470, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.88 });
    mat.userData.waterSurface = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
  },
};

/** The woods (0..1): scrub oak and hornbeam down the edge, black pine and scrub in patches on the plateau. */
const woods = gridCache((x, z) => {
  const ek = edgeK(x, z), inl = inland(x, z);
  if (inl < 20) return 0;
  let k = ek * (1 - ek) * 4 * 0.7 * smoothstep(-0.3, 0.1, fbm(noise, x * 0.01 + 4, z * 0.01 - 9, 2));
  k = Math.max(k, smoothstep(0.5, 0.68, fbm(noise, x * 0.007 - 20, z * 0.007 + 3, 3)) * 0.75 * ek);
  for (const p of POINTS) k = Math.min(k, smoothstep(34, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadD(x, z)));
}, EXT, 4);
const inTown = (x, z) => inland(x, z) > 14 && inland(x, z) < 95 && Math.abs(z) < 120;

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'trieste-1805',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Masséna’s advance guard against an Austrian rearguard; the Austrians have no units yet: the Russians stand in)
  name: 'Trieste',
  description: 'Trieste and the Karst, November 1805 (hypothetical — the town fell without a fight): the port under the Karst edge, San Giusto’s castle on its hill, the Strada Nuova climbing to Opicina, and the stone-walled plateau with its dolines above.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [], // (a port under a cliff and pitted karst: no strip; 1806 has no aircraft)
  conditions: { time: 'day', weather: 'clear' }, // (a clear November day, the bora dropped)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180511,
  steep: 0.5, // (wheels keep to the serpentines up the edge; men climb anywhere)
  overwatch: true,
  height,
  river: water,
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_13, cell: 56, weights: [0.3, 0.1, 0.2, 0.4] }), // (the karst’s little walled fields and stony pasture)

  theme: {
    // a clear November day over the gulf: low sun, a cold blue sea, the karst grey and rust-red with sumac
    fogColor: 0xc4ccd4,
    fogDensity: 0.0011,
    skyTop: 0x4e7ab4,
    skyHorizon: 0xd6dee6,
    skyBottom: 0x84887c,
    sunColor: 0xfff0dc,
    sunIntensity: 1.7,
    sunDisk: 0.35,
    clouds: 0.25,
    cloudLight: 0xf4f4f2,
    cloudDark: 0x9ca4ae,
    sunDir: [-0.5, 0.45, 0.3],
    hemiSky: 0xc8d4e2,
    hemiGround: 0x6a6656,
    hemiIntensity: 1.3,
    rimColor: 0xe2e6ec,
    rimIntensity: 0.25,
    terrain: {
      grass: '#6a6a44',
      grassAlt: '#62643e',
      dryGrass: '#8e8458',
      dirt: '#6e6250',
      rock: '#9a978c',
      strip: '#54483a',
      pasture: '#6e6e46',
      ploughed: '#7a5a42',
      stubble: '#9a8c60',
      meadow: '#70744a',
      farmX: [0, 1],
      farmZ: [0, 1],
      roads: [], // (the roads are this map’s own: ROADS)
      roadZ: 0,
      surface(x, z, y) {
        if (y < 0.2) return [0x5e5c50, 0.95];                                                      // under the water
        const inl = inland(x, z);
        if (inl < 14 && y < 1.4) return [0xb4ae9e, 0.95];                                         // the quays and the shingle
        if (roadD(x, z) < 3.4) return [0xbab2a0, 0.9];                                             // the white limestone roads
        if (inTown(x, z)) return [0x9e978a, 0.8];                                                  // the town’s paving
        const ek = edgeK(x, z), n = fbm(noise, x * 0.035 + 7, z * 0.035, 2);
        if (ek > 0.12 && ek < 0.88) return [0x8e8a80, 0.6];                                       // the bare edge
        if (ek > 0.9 && n > 0.2) return [n > 0.4 ? 0xb4b0a4 : 0x9c988c, Math.min(0.7, (n - 0.1) * 2)]; // bare limestone
        if (ek > 0.9 && n < -0.35) return [0x8a4a32, 0.45];                                        // the sumac turned red
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: -60, z: 360 }, pact: { x: -60, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x, z) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const taken: number[][] = [];
    const free = (x, z, r = 14) => roadD(x, z) > 8 && inland(x, z) > 12 && steepAt(x, z) < 0.35 && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < r);
    const STONE = 0xc4bca8;

    // ---- San Giusto: the castle’s walls round its court on the hilltop, the round bastion, the cathedral beside it
    props.rand = mulberry32(1805_1101);
    const C = { x: P.F.x - 14, z: P.F.z - 6 }, g0 = terrain.heightAt(C.x, C.z);
    for (const [dx, dz, yaw] of [[0, -13, 0], [0, 13, 0], [-13, 0, Math.PI / 2], [13, 0, Math.PI / 2]] as const) {
      props.box('stone', C.x + dx, g0 + 2.5, C.z + dz, 28, 6.5, 3.5, yaw, STONE);
      props.cover.addBox({ x: C.x + dx, z: C.z + dz, yaw, length: 28, thickness: 3.5, height: 5.5 });
    }
    props.box('stone', C.x - 13, g0 + 4, C.z + 13, 10, 9, 10, 0, 0xb8b09c);                       // (the round bastion, squared off)
    props.cover.addBox({ x: C.x - 13, z: C.z + 13, yaw: 0, length: 10, thickness: 10, height: 8 });
    props.church({ x: P.F.x + 22, z: P.F.z + 22, yaw: 0 });                                         // the cathedral of San Giusto
    taken.push([C.x, C.z], [P.F.x + 22, P.F.z + 22]);

    // ---- the town on the strip: the old town under the hill, the Theresian quarter by the port; the moles into the gulf
    const rr = mulberry32(1805_1102);
    for (let i = 0, n = 0; i < 1400 && n < 80; i++) {
      const z = (rr() * 2 - 1) * 125, x = shoreX(z) + 22 + rr() * 85;
      if (!inTown(x, z) || !free(x, z, 13) || Math.hypot(x - P.E.x, z - P.E.z) < 16 || steepAt(x, z) > 0.3) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: (rr() < 0.6 ? Math.PI / 2 : 0) + (rr() - 0.5) * 0.1, width: 7 + rr() * 3, depth: 8 + rr() * 2, storeys: rr() < 0.5 ? 3 : 2, damaged: 0 });
    }
    props.rand = mulberry32(1805_1103);
    props.church({ x: P.E.x + 34, z: P.E.z + 42, yaw: Math.PI / 2 });                             // (Sant’Antonio)
    taken.push([P.E.x + 34, P.E.z + 42]);
    for (const mz of [-60, 40, 95]) {                                                              // the moles: stone piers out into the gulf
      const x0 = shoreX(mz) + 4;
      props.box('stone', x0 - 30, 0.2, mz, 64, 1.8, 9, 0, 0xa8a294);
      props.box('stone', x0 - 62, 1.6, mz, 3, 1.2, 3, 0, 0x8a8478);                               // (a bollard at its head)
    }
    for (const [mz, len] of [[-20, 16], [70, 14]] as const) {                                       // two trabaccoli moored by the quay
      const x0 = shoreX(mz) - 10;
      props.box('wood', x0, 0.4, mz, 4.2, 1.6, len, 0, 0x5a4432);
      props.box('wood', x0, 6, mz, 0.4, 10, 0.4, 0, 0x4a3a2a);
    }

    // ---- Monrupino: the Tabor, the church inside its fortified wall on the hilltop
    props.rand = mulberry32(1805_1104);
    const T = { x: P.D.x + 18, z: P.D.z + 10 };
    props.church({ x: T.x, z: T.z, yaw: 0 });
    for (const [dx, dz, yaw, length] of [[0, -20, 0, 36], [0, 20, 0, 36], [-18, 0, Math.PI / 2, 40], [18, 0, Math.PI / 2, 40]] as const) props.wall({ x: T.x + dx, z: T.z + dz, yaw, length, height: 3.2, thickness: 1.2 });
    taken.push([T.x, T.z]);
    // ---- Lipizza: the stud’s long stables round the yard; the plateau villages with their churches
    props.rand = mulberry32(1805_1105);
    for (const [dx, dz, yaw] of [[-20, 14, 0], [20, -16, 0], [30, 14, Math.PI / 2]] as const) {
      props.townHouse({ x: P.J.x + dx, z: P.J.z + dz, yaw, width: 22, depth: 8, storeys: 1, name: 'the stud’s stables', damaged: 0 });
      taken.push([P.J.x + dx, P.J.z + dz]);
    }
    for (const [q, seed] of [[P.C, 1805_1106], [P.I, 1805_1107], [P.G, 1805_1108]] as const) {
      props.rand = mulberry32(seed);
      const cx = q.x + 32, cz = q.z + 14 * Math.sign(q.z || 1);
      if (free(cx, cz, 10)) { props.church({ x: cx, z: cz, yaw: Math.PI / 2 }); taken.push([cx, cz]); }
      const r = mulberry32(seed + 7);
      for (let i = 0, n = 0; i < 80 && n < 10; i++) {
        const a = r() * Math.PI * 2, d = 30 + r() * 40, x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
        if (!free(x, z, 14)) continue;
        taken.push([x, z]); n++;
        props.rand = mulberry32(Math.floor(r() * 1e9));
        props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r() * 3, depth: 6 + r() * 2, height: 3.4 });
      }
    }
    for (const p of POINTS) if ('BH'.includes(p.id)) buildVillage(props, p, 18051 + Math.round(p.x * 3 + p.z * 7));

    // ---- the dry-stone walls round the plateau’s little fields (the same number on each half), stone huts in the dolines’ gardens
    for (const s of [1, -1]) {
      const r = mulberry32(s > 0 ? 1805_1191 : 1805_1197);
      for (let i = 0, n = 0; i < 3000 && n < 50; i++) {
        const x = -140 + r() * 620, z = s * (40 + r() * 500), yaw = Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.3, len = 14 + r() * 16;
        if (edgeK(x, z) < 0.95 || !free(x, z, 6) || nearPoint(x, z, 26) || roadD(x, z) < 10 || Math.abs(x) < 50 && Math.abs(Math.abs(z) - BASE_Z) < 50) continue;
        n++;
        props.wall({ x, z, yaw, length: len, height: 1.1, thickness: 0.8 });
      }
    }
    for (const [dx, dz, dr] of DOLINES) if (free(dx + dr * 0.4, dz, 8)) props.lowWall({ x: dx, z: dz + dr * 0.5, yaw: 0.3, length: dr * 0.9, height: 0.9 });
    // ---- hay and huts on the plateau, boulders on the bare edge
    const r = mulberry32(1805_1109);
    for (let i = 0, n = 0; i < 5000 && n < 34; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 520;
      if (!free(x, z, 45) || nearPoint(x, z, 50) || Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || inTown(x, z)) continue;
      taken.push([x, z]); n++;
      buildSite(props, { kind: ['hay', 'fieldwall', 'farm', 'hay'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    for (let i = 0; i < 400; i++) {
      const x = (r() * 2 - 1) * 490, z = (r() * 2 - 1) * 550, ek = edgeK(x, z);
      if (ek < 0.1 || ek > 0.9 || nearPoint(x, z, 30) || roadD(x, z) < 8) continue;
      props.boulder({ x, z, radius: 1 + r() * 1.8 });
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    water.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      { test: (x, z) => inland(x, z) < 16 || roadD(x, z) < 5 || inTown(x, z) }];
    // scrub oak and hornbeam, black pine; the sumac’s and the oaks’ November colours
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, broadleaf: 0.6, autumn: 0.8, maxY: 160, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
