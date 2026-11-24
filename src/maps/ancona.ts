// Ancona, May–November 1799: when the Second Coalition drove the French out of Italy, General Monnier held the port
// of Ancona — the Papal States’ harbour on the Adriatic — with a few thousand men for half a year: the Russo-Turkish
// squadron blockaded it from the sea, the Italian insurgents and then Fröhlich’s Austrians closed in by land from the
// hills to the south and west, sapped up to the outworks and bombarded the town, and Monnier gave up only on
// 13 November, with the honours of war.
// The ground, compressed: the Adriatic along the west edge (−x). In the middle the harbour bay with the old mole and
// Trajan’s arch at its root, the town climbing from the quays up Monte Guasco, with the cathedral of San Ciriaco on
// its top looking over the sea. To the north (+z) Monte Cardeto with the Capuchins’ convent and the lantern on its
// cliff; to the south (−z) Monte Astagno with the papal citadel, Sangallo’s bastioned pentagon, and the Lazzaretto on
// the bay below. Inland the Marche’s rolling clay hills: Pietralacroce, Montedago, Posatora, the roads to Falconara
// and Osimo. The French come from the north (+z), the Austrians and Russians from the south (−z).
// Fair, not mirrored: the harbour, San Ciriaco on Guasco over it and Montedago inland are in the middle. Each side has
// a fortified sea hill as high, with its own road up in hairpins (Cardeto, the citadel), a village on a rise in the
// middle of its half (Pietralacroce, Posatora) and a farm village on the inland flank (Varano, Tavernelle), each as
// far from its own base. The bay is not centred (it opens toward the south), Guasco stands north of it; the clay
// hills inland are each half’s own noise.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createSea } from '../world/Sea.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import { graded } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 470;
const noise = createNoise2D(1799_1113);
/** The waterline down the west edge, the harbour bay cut in south of Guasco. */
const shoreX = (z) => -395 + 85 * Math.exp(-(((z + 45) / 65) ** 2)) + 8 * Math.sin(z * 0.011 + 1.3);
const inland = (x, z) => x - shoreX(z);
/** The old mole: from the bay’s north shore out into the sea and round to the south, closing the harbour. */
const MOLE = [[-322, 8], [-372, 14], [-420, 2], [-440, -40]];
const segD = (r, x, z) => { let b = 1e9; for (let i = 0; i < r.length - 1; i++) { const [ax, az] = r[i], [bx, bz] = r[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); b = Math.min(b, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return b; };
const moleD = (x, z) => (x > -460 && x < -300 && z > -60 && z < 30 ? segD(MOLE, x, z) : 99);

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Falconara road', x: 140, z: BASE_Z, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Monte Cardeto', x: -285, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Pietralacroce', x: -20, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Varano', x: 320, z: 285, owner: null, sector: 'east' },
  { id: 'E', name: 'Trajan’s arch', x: -305, z: -10, owner: null, sector: 'west', radius: 30 },
  { id: 'F', name: 'San Ciriaco', x: -240, z: 65, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Montedago', x: 290, z: -30, owner: null, sector: 'east' },
  { id: 'H', name: 'Cittadella', x: -275, z: -285, owner: null, sector: 'west', radius: 26 },
  { id: 'I', name: 'Posatora', x: -40, z: -245, owner: null, sector: 'centre' },
  { id: 'J', name: 'Tavernelle', x: 300, z: -290, owner: null, sector: 'east' },
  { id: 'K', name: 'Osimo road', x: 120, z: -BASE_Z, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const at = (id) => [P[id].x, P[id].z];

/** The hills [x, z, r, h]: Cardeto, Guasco, Astagno on the sea; the rises inland. */
const HILLS = [[P.B.x - 15, P.B.z + 10, 140, 58], [P.F.x - 25, P.F.z + 10, 115, 60], [P.H.x - 15, P.H.z - 10, 140, 58]];
/** The benches the points stand on [x, z, r, height] (each pair as high). */
const SHELVES = [[P.B.x, P.B.z, 30, 70], [P.H.x, P.H.z, 30, 70], [P.F.x, P.F.z, 24, 74], [P.C.x, P.C.z, 34, 34], [P.I.x, P.I.z, 34, 34],
  [P.D.x, P.D.z, 34, 30], [P.J.x, P.J.z, 34, 30], [P.G.x, P.G.z, 34, 36], [P.E.x, P.E.z, 30, 2.6], [P.A.x, BASE_Z, 34, 30], [P.K.x, -BASE_Z, 34, 30]];

/** The ground (no roads): the sea floor, the quays, the sea hills with their cliffs, the clay hills inland. */
function ground(x, z) {
  const inl = inland(x, z), md = moleD(x, z);
  if (inl < 0) return md < 7 ? 2.4 : md < 11 ? 2.4 - (md - 7) * 1.5 : Math.max(-9, -0.8 + inl * 0.12); // the sea, the mole
  let h = 2 + Math.min(inl, 30) * 0.06;
  h += (16 + fbm(noise, x * 0.004 + 3, z * 0.004, 3) * 14 + fbm(noise, x * 0.015, z * 0.015 - 7, 2) * 3) * smoothstep(40, 230, inl); // the clay hills inland
  for (const [hx, hz, hr, hh] of HILLS) { const d = Math.hypot(x - hx, z - hz); if (d < hr) h += hh * smoothstep(hr, 0, d) ** 1.2; }
  if (inl < 12) h += (0.5 + inl * 0.12 - h) * (1 - smoothstep(3, 12, inl));                       // the cliffs come down to the rocks, the quays to the water
  for (const [sx, sz, sr, sh] of SHELVES) { const d = Math.hypot(x - sx, z - sz); if (d < sr + 26) h += (sh - h) * smoothstep(sr + 26, sr, d); }
  return h;
}

/** A serpentine: legs along z at the given x’s, between z0 and z1, turning at each end. */
const serp = (from, xs, z0, z1, to) => [from, ...xs.flatMap((x, i) => (i % 2 ? [[x, z1], [x, z0]] : [[x, z0], [x, z1]])), to];
const TOWN = [-175, -20];                                                          // (the town’s middle: Piazza del Plebiscito)
/** The roads (each graded below). */
const ROAD_DEFS: number[][][] = [
  [[P.A.x, 600], [P.A.x, BASE_Z], [60, 330], at('C'), [-60, 140], [-70, 40], [-95, -25], TOWN],                     // the Falconara road into the town
  [[P.K.x, -600], [P.K.x, -BASE_Z], [50, -340], at('I'), [-80, -150], TOWN],                             // the Osimo road
  [TOWN, [-250, -25], at('E'), [-330, 8]],                                                                // down to the quays and the mole
  serp(TOWN, [P.F.x + 130, P.F.x + 90, P.F.x + 50], P.F.z - 70, P.F.z + 20, at('F')),                    // up Guasco to the cathedral
  serp([-100, 250], [P.B.x + 160, P.B.x + 120, P.B.x + 80, P.B.x + 40], P.B.z - 55, P.B.z + 45, at('B')), // up Cardeto
  serp([-100, -250], [P.H.x + 160, P.H.x + 120, P.H.x + 80, P.H.x + 40], P.H.z + 55, P.H.z - 45, at('H')), // up Astagno to the citadel
  [at('C'), [-100, 250]],
  [at('I'), [-100, -250]],
  [[-100, 250], [-100, 140], [-70, 40]],
  [[-100, -250], [-130, -140], TOWN],
  [[P.A.x, BASE_Z], at('D'), [600, 300]],
  [[P.K.x, -BASE_Z], at('J'), [600, -300]],
  [at('C'), [150, 270], at('D'), [310, 130], at('G'), [310, -160], at('J'), [150, -280], at('I')],
  [TOWN, [-40, -20], [120, -30], at('G'), [600, -20]],
];
const STARTS: number[][] = [];
const ROADS = ROAD_DEFS.map((r) => {
  const out = [r[0]], st = [0];
  STARTS.push(st);
  for (let i = 1; i < r.length; i++) {
    const [ax, az] = r[i - 1], [bx, bz] = r[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 4));
    for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    st.push(out.length - 1);
  }
  return out;
});
/** Each road’s height: the ground’s as closely as a grade of 0.2 allows, smoothed (as trieste1805.ts). */
const HS = ROADS.map((r) => {
  const nat = r.map(([x, z]) => Math.max(1.5, ground(x, z))), p = nat.slice(), n = p.length - 1;
  const d = (k) => 0.2 * Math.hypot(r[k][0] - r[k - 1][0], r[k][1] - r[k - 1][1]);
  for (let round = 0; round < 3; round++) {
    for (let k = 1; k <= n; k++) p[k] = Math.max(p[k - 1] - d(k), Math.min(p[k - 1] + d(k), round ? p[k] : nat[k]));
    if (round === 2) p[n] = nat[n];                                              // (the end on its point’s ground, the ramp before it built up to it)
    for (let k = n - 1; k >= 0; k--) p[k] = Math.max(p[k + 1] - d(k + 1), Math.min(p[k + 1] + d(k + 1), p[k]));
  }
  for (let round = 0; round < 3; round++) { const q = p.slice(); for (let k = 2; k < n - 1; k++) p[k] = (q[k - 2] + q[k - 1] + q[k] + q[k + 1] + q[k + 2]) / 5; }
  return p;
});
/** Every road’s corner segments with their boxes (20 m out) and their stretch of the graded road. */
const SEGS = ROAD_DEFS.flatMap((r, i) => r.slice(1).map(([bx, bz], j) => { const [ax, az] = r[j], a = STARTS[i][j], b = STARTS[i][j + 1] + 1; return [ax, az, bx, bz, Math.min(ax, bx) - 20, Math.max(ax, bx) + 20, Math.min(az, bz) - 20, Math.max(az, bz) + 20, ROADS[i].slice(a, b), HS[i].slice(a, b)]; }));
const roadExact = (x, z) => {
  let best = 99;
  for (const [ax, az, bx, bz, x0, x1, z0, z1] of SEGS) {
    if (x < x0 || x > x1 || z < z0 || z > z1) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
};
const roadD = gridCache(roadExact, EXT, 2);

/** The land with the roads benched in, sampled once every 2 m. */
const land = gridCacheSmooth((x, z) => {
  let h = ground(x, z);
  if (inland(x, z) < 0) return h;
  let best = { d: 16, h: 0 };
  for (const [, , , , x0, x1, z0, z1, poly, hs] of SEGS) {
    if (x < x0 + 3 || x > x1 - 6 || z < z0 + 6 || z > z1 - 6) continue;
    const g = graded(poly, hs, x, z);
    if (g.d < best.d) best = g;
  }
  if (best.d < 16) h += (best.h - h) * smoothstep(16, 8, best.d);                  // (a level bed 16 m wide: wheels need the shoulders flat too)
  return h;
}, EXT, 2);
const height = (x, z) => (inland(x, z) < 0 ? ground(x, z) : land(x, z));

/** One water sheet at the sea’s level. */
const water = {
  ...createSea({ level: 0, size: 1600 }),
  sea: false,
  build(scene) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a6a78, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.88 });
    mat.userData.waterSurface = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
  },
};

const inTown = (x, z) => inland(x, z) > 12 && Math.hypot((x + 200) / 1.1, z + 10) < 115;
/** The woods (0..1): oak copses and poplars in the clay valleys, the gardens on the hills; none in the town. */
const woods = gridCache((x, z) => {
  if (inland(x, z) < 14 || inTown(x, z)) return 0;
  let k = smoothstep(0.52, 0.68, fbm(noise, x * 0.008 - 20, z * 0.008 + 3, 3)) * 0.6;
  for (const p of POINTS) k = Math.min(k, smoothstep(34, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadD(x, z)));
}, EXT, 4);

const layout = [{ unit: 'rifles', x: P.A.x, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'ancona',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Monnier’s garrison against Fröhlich’s Austrians and the Russians; the Austrians have no units yet: the Russians stand in)
  name: 'Ancona',
  description: 'The siege of Ancona, 1799: the port on its promontory — the harbour with Trajan’s arch on the mole, San Ciriaco on Monte Guasco over the sea, the citadel on Monte Astagno, the Capuchins on Monte Cardeto — and the Marche’s clay hills inland.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [], // (1806 has no aircraft)
  conditions: { time: 'day', weather: 'clear' }, // (a clear late-summer day)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 179911,
  steep: 0.55, // (wheels keep to the hairpins up the sea hills; men climb anywhere)
  overwatch: true,
  height,
  river: water,
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1799_13, cell: 62, weights: [0.15, 0.4, 0.3, 0.15] }), // (late summer: stubble, ploughland, vines and olives)

  theme: {
    // a clear late-summer day on the Adriatic: pale sea, ochre clay hills, the town’s brick and white Istrian stone
    fogColor: 0xd2d4cc,
    fogDensity: 0.001,
    skyTop: 0x4878bc,
    skyHorizon: 0xdcdcd4,
    skyBottom: 0x8a8670,
    sunColor: 0xfff0d4,
    sunIntensity: 2,
    sunDisk: 0.5,
    clouds: 0.25,
    cloudLight: 0xf6f4ee,
    cloudDark: 0xa6aab0,
    sunDir: [-0.3, 0.6, -0.4],
    hemiSky: 0xcad6e4,
    hemiGround: 0x6a5e42,
    hemiIntensity: 1.25,
    rimColor: 0xe6e2d8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#6e7240',
      grassAlt: '#666a3a',
      dryGrass: '#a49456',
      dirt: '#7a6446',
      rock: '#b0a690',
      strip: '#5e4c36',
      pasture: '#72763e',
      ploughed: '#7a5c3e',
      stubble: '#b8a464',
      meadow: '#70783e',
      farmX: [0, 1],
      farmZ: [0, 1],
      roads: [], // (the roads are this map’s own: ROADS)
      roadZ: 0,
      surface(x, z, y) {
        if (y < 0.2) return [0x5e5a4c, 0.95];                                                      // under the water
        if (moleD(x, z) < 9 || inland(x, z) < 10 && y < 3) return [0xc0b8a4, 0.95];               // the mole, the quays, the rocks
        if (roadD(x, z) < 3.4) return [0xb0a080, 0.85];                                            // the dusty roads
        if (inTown(x, z)) return [0xa08a70, 0.75];                                                 // the town’s brick paving
        const sl = inland(x, z) < 60 && y > 12;                                                    // the cliffs over the sea
        if (sl) return [0xc4b494, 0.7];
        return null;
      },
    },
  },

  bases: { nato: { x: P.A.x, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: P.K.x, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: P.K.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x, z) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const taken: number[][] = [];
    const free = (x, z, r = 14) => roadD(x, z) > 8 && inland(x, z) > 12 && steepAt(x, z) < 0.35 && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < r);
    const STONE = 0xd8d0bc, BRICK = 0xb07a58;
    const solid = (x, z, len, thick, hgt, yaw, col) => {
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + hgt / 2 - 1.5, z, len, hgt + 3, thick, yaw, col);
      props.cover.addBox({ x, z, yaw, length: len, thickness: thick, height: hgt });
    };

    // ---- San Ciriaco on Guasco: the cathedral, its dome and its porch; the bishop’s palace beside it
    props.rand = mulberry32(1799_1101);
    props.church({ x: P.F.x - 18, z: P.F.z + 6, yaw: Math.PI / 2 });
    { const g = terrain.heightAt(P.F.x - 18, P.F.z + 6); props.box('stone', P.F.x - 18, g + 13, P.F.z + 6, 7, 5, 7, Math.PI / 4, 0x9aa4a0); } // (the dome, green copper)
    props.townHouse({ x: P.F.x + 6, z: P.F.z + 26, yaw: 0, width: 16, depth: 9, storeys: 2, name: 'the bishop’s palace', damaged: 0 });
    taken.push([P.F.x - 18, P.F.z + 6], [P.F.x + 6, P.F.z + 26]);
    // ---- the harbour: Trajan’s arch at the mole’s root, the quays, ships in the basin, the Lazzaretto on the south shore
    const [ax, az] = MOLE[0];
    const ag = terrain.heightAt(ax - 6, az);
    for (const s of [-1, 1]) { props.box('stone', ax - 6, ag + 4, az + s * 4.2, 3.2, 8, 2.6, 0, 0xe4dccc); props.cover.addBox({ x: ax - 6, z: az + s * 4.2, yaw: 0, length: 3.2, thickness: 2.6, height: 7 }); }
    props.box('stone', ax - 6, ag + 10, az, 3.6, 4, 11.4, 0, 0xe4dccc);                             // (the attic over the archway)
    props.box('stone', ax - 6, ag + 14, az, 2, 2, 3, 0, 0x8a7a5a);                                   // (where the bronze group stood)
    for (const [dz, len] of [[-30, 22], [-60, 18], [-85, 16]] as const) {                           // merchantmen and gunboats at anchor in the basin
      const x0 = shoreX(dz) - 24;
      props.box('wood', x0, 0.5, dz, 5, 2, len, 0.1, 0x5a4432);
      props.box('wood', x0, 8, dz, 0.45, 14, 0.45, 0, 0x4a3a2a);
    }
    const lz = { x: shoreX(-120) + 34, z: -120 };                                                     // the Lazzaretto: a pentagon of long store-houses
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 2 / 5, x = lz.x + Math.cos(a) * 18, z = lz.z + Math.sin(a) * 18;
      props.townHouse({ x, z, yaw: -a, width: 20, depth: 6, storeys: 1, name: 'the Lazzaretto', damaged: 0 });
    }
    taken.push([lz.x, lz.z]);
    // ---- the town: houses up the slopes round the harbour, the churches, the Loggia dei Mercanti on the quay
    props.rand = mulberry32(1799_1102);
    props.church({ x: TOWN[0] + 26, z: TOWN[1] - 30, yaw: 0 });                                       // (San Domenico)
    props.church({ x: P.E.x + 40, z: P.E.z - 40, yaw: Math.PI / 2 });                                  // (Santa Maria della Piazza)
    props.townHouse({ x: P.E.x + 34, z: P.E.z + 22, yaw: Math.PI / 2, width: 18, depth: 9, storeys: 2, name: 'the Loggia dei Mercanti', damaged: 0 });
    taken.push([TOWN[0] + 26, TOWN[1] - 30], [P.E.x + 40, P.E.z - 40], [P.E.x + 34, P.E.z + 22]);
    const rr = mulberry32(1799_1103);
    for (let i = 0, n = 0; i < 2500 && n < 70; i++) {
      const x = -330 + rr() * 260, z = -130 + rr() * 230;
      if (!inTown(x, z) || !free(x, z, 13) || roadD(x, z) < 11 || nearPoint(x, z, 20)) continue; // (the streets wide enough for wheels)
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: (rr() < 0.5 ? Math.PI / 2 : 0) + (rr() - 0.5) * 0.12, width: 7 + rr() * 3, depth: 8 + rr() * 2, storeys: rr() < 0.6 ? 3 : 2, damaged: 0 });
    }
    // ---- the citadel on Astagno: Sangallo’s bastioned pentagon (two gates on its hairpin road); Cardeto: the Capuchins, the lantern, the battery
    props.rand = mulberry32(1799_1104);
    const gate = (x, z) => roadD(x, z) < 20;                                         // (gaps for the hairpin road in and out)
    for (let k = 0; k < 5; k++) {
      const a0 = k * Math.PI * 2 / 5 + 0.3, a1 = a0 + Math.PI * 2 / 5, R = 44;
      for (let t = 0.1; t < 1; t += 0.2) {
        const a = a0 + (a1 - a0) * t, x = P.H.x + Math.cos(a0) * R * (1 - t) + Math.cos(a1) * R * t, z = P.H.z + Math.sin(a0) * R * (1 - t) + Math.sin(a1) * R * t;
        if (gate(x, z)) continue;
        solid(x, z, 11, 3.5, 6, -Math.atan2(Math.sin(a1) - Math.sin(a0), Math.cos(a1) - Math.cos(a0)), BRICK);
      }
      if (!gate(P.H.x + Math.cos(a0) * R, P.H.z + Math.sin(a0) * R)) solid(P.H.x + Math.cos(a0) * R, P.H.z + Math.sin(a0) * R, 8, 8, 7, a0, BRICK); // (a bastion at each corner)
    }
    props.townHouse({ x: P.H.x - 24, z: P.H.z - 14, yaw: 0.3, width: 18, depth: 9, storeys: 2, name: 'the citadel’s barracks', damaged: 0 });
    taken.push([P.H.x, P.H.z]);
    props.townHouse({ x: P.B.x - 20, z: P.B.z + 14, yaw: 0, width: 22, depth: 10, storeys: 2, name: 'the Capuchins’ convent', damaged: 0 });
    props.church({ x: P.B.x + 8, z: P.B.z + 30, yaw: 0 });
    { const lx = P.B.x - 44, lzz = P.B.z - 8; const g = terrain.heightAt(lx, lzz); props.box('stone', lx, g + 7, lzz, 4.5, 14, 4.5, 0, 0xe0d8c4); props.box('plain', lx, g + 15, lzz, 3.4, 2.4, 3.4, 0, 0xf4e8b0); props.cover.addBox({ x: lx, z: lzz, yaw: 0, length: 4.5, thickness: 4.5, height: 14 }); }
    for (let a = -0.9; a <= 0.91; a += 0.45) props.wall({ x: P.B.x + 30 * Math.cos(a + Math.PI), z: P.B.z - 30 * Math.sin(a), yaw: a + Math.PI / 2, length: 10, height: 1.5, thickness: 1.6 }); // (the battery’s parapet)
    taken.push([P.B.x - 20, P.B.z + 14], [P.B.x + 8, P.B.z + 30], [P.B.x - 44, P.B.z - 8]);
    // ---- the villages on the clay hills
    for (const [q, seed] of [[P.C, 1799_1105], [P.I, 1799_1106], [P.G, 1799_1107]] as const) {
      props.rand = mulberry32(seed);
      const cx = q.x + 30, cz = q.z + 16 * Math.sign(q.z || 1);
      if (free(cx, cz, 10)) { props.church({ x: cx, z: cz, yaw: Math.PI / 2 }); taken.push([cx, cz]); }
      const r = mulberry32(seed + 7);
      for (let i = 0, n = 0; i < 90 && n < 8; i++) {
        const a = r() * Math.PI * 2, d = 28 + r() * 40, x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
        if (!free(x, z, 14)) continue;
        taken.push([x, z]); n++;
        props.rand = mulberry32(Math.floor(r() * 1e9));
        props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r() * 3, depth: 6 + r() * 2, height: 3.6 });
      }
    }
    for (const p of POINTS) if ('DJ'.includes(p.id)) buildVillage(props, p, 17991 + Math.round(p.x * 3 + p.z * 7));
    // ---- farms, hay and field walls across the clay hills
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm'];
    let n = 0;
    for (let tries = 0; n < 60 && tries < 10000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (!free(x, z, 50) || nearPoint(x, z, 60) || inland(x, z) < 120 || Math.hypot(x - P.A.x, z - BASE_Z) < 70 || Math.hypot(x - P.K.x, z + BASE_Z) < 70 || woods(x, z) > 0.25) continue;
      taken.push([x, z]); n++;
      buildSite(props, { kind: kinds[n % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd0ccbc]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    water.build(scene);

    const avoid = [{ x: P.A.x, z: BASE_Z, r: 30 }, { x: P.K.x, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      { x: P.H.x, z: P.H.z, r: 50 }, { test: (x, z) => inland(x, z) < 12 || roadD(x, z) < 5 || inTown(x, z) }];
    // oak, poplar and olive in the clay valleys; umbrella pines on the sea hills
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2600, broadleaf: 0.8, autumn: 0.15, maxY: 120, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 900, lane: 0 }); // (the field rows of mulberry and maple)
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
