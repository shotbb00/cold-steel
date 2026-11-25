// Ragusa (Dubrovnik), June–July 1806: when the Russians held the Bocche di Cattaro, General Lauriston marched into the
// neutral republic of Ragusa on 27 May and shut himself in the walled city; Admiral Senyavin’s Russians and Prince-
// Bishop Petar’s Montenegrins came up from Cavtat, drove the French outposts in, set batteries on Mount Srđ right
// over the walls and laid the city under siege — bombarding it and plundering the country round — until General
// Molitor’s relief came down from the north on 6 July, turned the heights and raised the siege.
// The ground, compressed: the Adriatic along the west edge (−x). The walled city on its rock promontory at the water in
// the middle — the ring of the walls with the round Minčeta tower on the landward corner, Fort Lovrijenac on its crag
// off the Pile gate, the Revelin before the Ploče gate, the old port inside its mole, the island of Lokrum off it.
// Behind the city Mount Srđ goes up steep and bare to the summit straight over the walls; beyond its edge the karst
// plateau with Bosanka and the villages on the roads inland. To the north (+z) Gruž bay cuts in, the harbour for the
// French relief from Ston; to the south (−z) the cove under Sveti Jakov and the road to Cavtat the Russians came up.
// The rest of the real coast: Lapad’s peninsula closes Gruž bay on the west, and from the head of the bay the Rijeka
// Dubrovačka (the Ombla’s drowned valley) cuts deep inland between the French and the plateau; Srđ’s crest is the
// highest ground and the karst sinks inland behind it; in the south-east the low Župa basin, the Russians’ road up from
// Cavtat, lies under Dubac.
// Fair by distance, not by shape: the city, Srđ over it and Bosanka on the plateau are in the middle. Each side has a
// harbour village at the water with its own serpentine up the edge (Gruž, Sveti Jakov), a bench on that serpentine
// (Kono, Žarkovica) and a village at the head of its road inland (Šumet over the Ombla valley, Dubac over Župa), each as
// far from its own base. The French must cross the Ombla’s valley, the Russians climb out of the Župa basin.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createSea } from '../world/Sea.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite } from './common.js';
import { graded, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 470;
const EDGE = 105;                                                                // the plateau’s height over the shore
const noise = createNoise2D(1806_0617);
/** The waterline down the west edge: the city’s promontory out into the sea, Gruž bay cutting in to the north, the cove at Sveti Jakov to the south. */
const shoreX = (z) => -340 - 40 * Math.exp(-(((z + 5) / 95) ** 2)) + 125 * Math.exp(-(((z - 290) / 70) ** 2)) + 55 * Math.exp(-(((z + 300) / 60) ** 2)) + 6 * Math.sin(z * 0.013 + 0.7);
const inland = (x, z) => x - shoreX(z);
/** 0..1 up the mountainside: the shore (0) to the plateau (1). */
const edgeK = (x, z) => smoothstep(55, 290, inland(x, z));
/** Lapad: the peninsula west of Gruž bay, the bay between it and the town’s shore, the Petka hill on its neck. */
const LAPAD = { x: -470, z: 340, rx: 135, rz: 120, px: -420, pz: 380 };
const lapadQ = (x, z) => Math.min(Math.hypot((x - LAPAD.x) / LAPAD.rx, (z - LAPAD.z) / LAPAD.rz), Math.hypot((x + 380) / 95, (z - 455) / 60)) + fbm(noise, x * 0.012 + 5, z * 0.012, 2) * 0.12; // (its neck to the shore at the head of the bay)
/** Lokrum: the island off the old port. */
const LOKRUM = { x: -470, z: -120, r: 50 };

const at0 = (z, inl) => [Math.round(shoreX(z) + inl), z];
const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Ston road', x: 150, z: BASE_Z, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Gruž', x: at0(300, 30)[0], z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Kono', x: at0(300, 150)[0], z: 240, owner: null, sector: 'centre' },
  { id: 'D', name: 'Šumet', x: 340, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Ragusa', x: at0(-5, 60)[0], z: -5, owner: null, sector: 'west', radius: 34 },
  { id: 'F', name: 'Mount Srđ', x: at0(10, 300)[0], z: 10, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Bosanka', x: 320, z: -25, owner: null, sector: 'east' },
  { id: 'H', name: 'Sveti Jakov', x: at0(-320, 30)[0], z: -320, owner: null, sector: 'west' },
  { id: 'I', name: 'Žarkovica', x: at0(-320, 150)[0], z: -250, owner: null, sector: 'centre' },
  { id: 'J', name: 'Dubac', x: 310, z: -285, owner: null, sector: 'east' },
  { id: 'K', name: 'Cavtat road', x: 150, z: -BASE_Z, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const at = (id) => [P[id].x, P[id].z];

/** The city: the walled rectangle on the promontory (centre, half-lengths along z and inland), Lovrijenac off it to the north. */
const CITY = { x: P.E.x + 5, z: P.E.z, hz: 92, hx: 62 };
const inCity = (x, z, m = 0) => Math.abs(z - CITY.z) < CITY.hz + m && Math.abs(x - CITY.x) < CITY.hx + m;
const LOVRIJENAC = { x: shoreX(CITY.z + CITY.hz + 40) + 6, z: CITY.z + CITY.hz + 40 };                // (on its rock at the water, clear of the coast road)

/** The hills [x, z, r, h]: Srđ’s summit over the city, Žarkovica’s knoll, the rise behind Kono. */
const HILLS = [[P.F.x + 20, P.F.z, 120, 34], [P.I.x + 10, P.I.z - 10, 60, 10], [P.C.x + 15, P.C.z + 10, 60, 10]];
/** The benches the points stand on [x, z, r, height] (each pair as high). */
const SHELVES = [[P.B.x, P.B.z, 26, 3.5], [P.H.x, P.H.z, 26, 3.5], [P.C.x, P.C.z, 28, 45], [P.I.x, P.I.z, 28, 45], [CITY.x, CITY.z, 0, 0]];
/** The dolines [x, z, r]: the same number on each half, each from its own seed. */
const DOLINES: number[][] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 1806_71 : 1806_79);
  for (let i = 0, n = 0; i < 4000 && n < 10; i++) {
    const x = -60 + r() * 540, z = s * (60 + r() * 440), rad = 16 + r() * 12;
    if (inland(x, z) < 330 || POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 60) || DOLINES.some(([dx, dz, dr]) => Math.hypot(dx - x, dz - z) < dr + rad + 30) || Math.abs(x - 145) < 50 && Math.abs(Math.abs(z) - BASE_Z) < 60) continue;
    DOLINES.push([x, z, rad]); n++;
  }
}

/** The Rijeka Dubrovačka (the Ombla’s drowned valley) inland from the head of Gruž bay; the Župa basin in the south-east under Dubac. */
const OMBLA = [[shoreX(360) + 10, 380], [0, 425], [250, 440], [620, 455]];
const ZUPA = { x: 480, z: -610, rx: 320, rz: 280 };
/** The ground (no roads): the sea floor, the shore, the mountainside, the plateau with its ribs and hollows. */
const PAD_H: number[] = [];
function ground(x, z, pad = true) {
  const inl = inland(x, z);
  const lk = Math.hypot(x - LOKRUM.x, (z - LOKRUM.z) * 1.4);
  if (inl < 0) { const q = lapadQ(x, z); if (q < 1) return Math.max(-9, -0.8 + (1 - q) * 60 * (0.55 + 0.45 * smoothstep(0.75, 0.1, Math.hypot((x - LAPAD.px) / 70, (z - LAPAD.pz) / 60))) + fbm(noise, x * 0.03, z * 0.03, 2) * 2); } // Lapad and the Petka
  if (inl < 0) return lk < LOKRUM.r ? Math.max(-9, 6 * smoothstep(LOKRUM.r, LOKRUM.r * 0.4, lk) - 1.5 + fbm(noise, x * 0.05, z * 0.05, 2)) : Math.max(-9, -0.8 + inl * 0.12);
  const ek = edgeK(x, z);
  let h = 1.2 + Math.min(inl, 50) * 0.05 + EDGE * ek ** 1.15;
  let calm = 1;
  for (const p of POINTS) { if (Math.abs(x - p.x) > 70 || Math.abs(z - p.z) > 70) continue; const d = Math.hypot(x - p.x, z - p.z); if (d < 70) calm = Math.min(calm, smoothstep(22, 70, d)); }
  if (ek > 0) h += (ridged(noise, x * 0.011 + 3, z * 0.011, 3) * 7 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.8) * ek * (0.3 + 0.7 * calm); // limestone ribs
  if (ek > 0 && ek < 1) h += fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 4 * ek * (1 - ek) * 4;                              // gullies down the mountain
  if (inl < 10) h += (0.4 + inl * 0.08 - h) * (1 - smoothstep(4, 10, inl));                       // the rocks at the water
  h -= smoothstep(280, 760, inl) * 58 + smoothstep(-300, -580, z) * ek * 26;   // (and the ridge falls away south-east toward Župa)                                             // (Srđ’s crest the highest: the plateau sinks inland behind it)
  { const v = smoothstep(170, 30, segDist(OMBLA, x, z)) * smoothstep(300, 440, z); if (v > 0) h += (3 + inl * 0.045 - h) * v * 0.5; }            // the Rijeka Dubrovačka’s valley
  { const k = smoothstep(1, 0.45, Math.hypot((x - ZUPA.x) / ZUPA.rx, (z - ZUPA.z) / ZUPA.rz)); if (k > 0) h += (12 + inl * 0.02 - h) * k * 0.9; } // the Župa basin
  for (const [hx, hz, hr, hh] of HILLS) { const d = Math.hypot(x - hx, z - hz); if (d < hr) h += hh * smoothstep(hr, 0, d) ** 1.3; }
  for (const [dx, dz, dr] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const d = Math.hypot(x - dx, z - dz); if (d < dr) h -= 6 * smoothstep(dr, 0, d) ** 1.4; }
  for (const [sx, sz, sr, sh] of SHELVES) { if (!sr) continue; const d = Math.hypot(x - sx, z - sz); if (d < sr + 22) h += (sh - h) * smoothstep(sr + 22, sr, d); }
  if (inCity(x, z, 24)) { const k = 1 - Math.max(smoothstep(CITY.hz, CITY.hz + 24, Math.abs(z - CITY.z)), smoothstep(CITY.hx, CITY.hx + 24, Math.abs(x - CITY.x))); h += (3 + Math.max(0, inl) * 0.07 - h) * k; } // the city’s floor
  { const d = Math.hypot(x - LOVRIJENAC.x, z - LOVRIJENAC.z); if (d < 18) h += 12 * smoothstep(18, 6, d); }                   // Lovrijenac’s crag
  if (pad) for (const bz of [BASE_Z, -BASE_Z]) { const bx = bz > 0 ? P.A.x : P.K.x, b = Math.hypot(x - bx, z - bz); if (b < 40) { const i = bz > 0 ? 0 : 1; PAD_H[i] ??= ground(bx, bz, false) + 1; h += (PAD_H[i] - h) * smoothstep(40, 22, b); } }
  return h;
}

/** A serpentine: legs along z at the given x’s, between z0 and z1, turning at each end. */
const serp = (from, xs, z0, z1, to) => [from, ...xs.flatMap((x, i) => (i % 2 ? [[x, z1], [x, z0]] : [[x, z0], [x, z1]])), to];
const COAST_AT = (z) => shoreX(z) + 20 + 45 * Math.exp(-((z / 110) ** 2));
const COAST = Array.from({ length: 49 }, (_, i) => -600 + i * 25).map((z) => [shoreX(z) + 20 + 45 * Math.exp(-((z / 110) ** 2)), z]); // (through the city by the Pile and Ploče gates)
/** The roads (each graded below). */
const ROAD_DEFS: number[][][] = [
  COAST,
  [[CITY.x + CITY.hx + 12, CITY.hz + 25], [CITY.x + CITY.hx + 12, CITY.z], [CITY.x + CITY.hx + 12, -CITY.hz - 58]], // (the lane under the landward wall, from the coast road at each end)
  [[CITY.x + CITY.hx + 12, CITY.hz + 25], [COAST_AT(CITY.hz + 25), CITY.hz + 25]],
  [[CITY.x + CITY.hx + 12, -CITY.hz - 58], [COAST_AT(-CITY.hz - 58), -CITY.hz - 58]],
  serp([CITY.x + CITY.hx + 12, CITY.z], [-195, -160, -125, -92], -55, 70, at('F')),                        // the Srđ serpentine from the lane under the landward wall
  serp(at('B'), [P.B.x + 40, P.B.x + 80, P.C.x, P.C.x + 40, P.C.x + 80, P.C.x + 120], P.B.z + 20, P.C.z, [P.C.x + 170, 300]),   // Gruž’s serpentine by Kono (on its third turn) to the plateau
  serp(at('H'), [P.H.x + 40, P.H.x + 80, P.I.x, P.I.x + 40, P.I.x + 80, P.I.x + 120], P.H.z - 20, P.I.z, [P.I.x + 170, -300]), // Sveti Jakov’s by Žarkovica
  [[P.A.x, 600], [P.A.x, BASE_Z], [P.C.x + 170, 300], at('D'), [600, 310]],
  [[P.K.x, -600], [P.K.x, -BASE_Z], [P.I.x + 170, -300], at('J'), [600, -290]],
  [at('F'), [130, 0], at('G'), [600, -20]],
  [at('F'), [40, 120], [P.C.x + 170, 300]],                                       // (the track along Srđ’s back to the head of the Gruž serpentine)
  [at('D'), [330, 140], at('G'), [320, -140], at('J')],
  [[P.A.x, BASE_Z], [110, 250], [120, 100], [130, 0]],
  [[P.K.x, -BASE_Z], [140, -250], [130, -100], [130, 0]],
];
/** Each road resampled every 4 m, its height the ground’s as closely as a grade of 0.22 allows, smoothed (as trieste1805.ts). */
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
const HS = ROADS.map((r) => {
  const nat = r.map(([x, z]) => Math.max(1, ground(x, z))), p = nat.slice(), n = p.length - 1;
  const d = (k) => 0.22 * Math.hypot(r[k][0] - r[k - 1][0], r[k][1] - r[k - 1][1]);
  for (let round = 0; round < 3; round++) {
    for (let k = 1; k <= n; k++) p[k] = Math.max(p[k - 1] - d(k), Math.min(p[k - 1] + d(k), round ? p[k] : nat[k]));
    if (round === 2) p[n] = nat[n];                                              // (the end on its point’s ground, the ramp before it built up to it)
    for (let k = n - 1; k >= 0; k--) p[k] = Math.max(p[k + 1] - d(k + 1), Math.min(p[k + 1] + d(k + 1), p[k]));
  }
  for (let round = 0; round < 3; round++) { const q = p.slice(); for (let k = 2; k < n - 1; k++) p[k] = (q[k - 2] + q[k - 1] + q[k] + q[k + 1] + q[k + 2]) / 5; }
  return p;
});
/** Every road’s corner segments with their boxes (20 m out): a far segment costs one comparison. */
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
  let best = { d: 16, h: 0 };
  for (const [, , , , x0, x1, z0, z1, poly, hs] of SEGS) {
    if (x < x0 + 3 || x > x1 - 3 || z < z0 + 3 || z > z1 - 3) continue;
    const g = graded(poly, hs, x, z);
    if (g.d < best.d) best = g;
  }
  if (best.d < 16) h += (best.h - h) * smoothstep(16, 8, best.d);                  // (a level bed 16 m wide: wheels need the shoulders flat too)
  return h;
}, EXT, 2);
function height(x, z) {
  const inl = inland(x, z);
  if (inl < 0) return ground(x, z);
  return land(x, z);
}

/** One water sheet at the sea’s level. */
const water = {
  ...createSea({ level: 0, size: 1600 }),
  sea: false,
  build(scene) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2e6478, roughness: 0.18, metalness: 0.2, transparent: true, opacity: 0.88 });
    mat.userData.waterSurface = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
  },
};

/** The woods (0..1): pine and cypress on Lokrum and round Gruž, holm oak and scrub in patches; the mountainside itself bare. */
const woods = gridCache((x, z) => {
  const ek = edgeK(x, z), inl = inland(x, z);
  if (inl < 0) return Math.hypot(x - LOKRUM.x, (z - LOKRUM.z) * 1.4) < LOKRUM.r * 0.8 ? 0.8 : lapadQ(x, z) < 0.85 ? 0.65 * smoothstep(-0.25, 0.1, fbm(noise, x * 0.015, z * 0.015 + 7, 2)) : 0; // (pines on Lokrum and over Lapad)
  if (inl < 14 || inCity(x, z, 14)) return 0;
  let k = (1 - ek) * 0.55 * smoothstep(-0.2, 0.2, fbm(noise, x * 0.012 + 4, z * 0.012 - 9, 2)) * smoothstep(60, 140, Math.abs(z - CITY.z));
  k = Math.max(k, smoothstep(0.25, 0.55, fbm(noise, x * 0.007 - 20, z * 0.007 + 3, 3)) * 0.7 * smoothstep(0.85, 1, ek)); // (holm oak and pine scrub in patches on the plateau)
  for (const p of POINTS) k = Math.min(k, smoothstep(34, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadD(x, z)));
}, EXT, 4);

const layout = [{ unit: 'rifles', x: P.A.x, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'ragusa',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Lauriston’s French in the city against Senyavin’s Russians and the Montenegrins)
  name: 'Ragusa',
  description: 'The siege of Ragusa (Dubrovnik), June–July 1806: the walled city on its rock at the sea with the Minčeta tower, Lovrijenac and the old port, Mount Srđ steep and bare over it, Gruž bay to the north and the karst plateau behind.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [], // (a walled city under a mountain wall and pitted karst: no strip; 1806 has no aircraft)
  conditions: { time: 'day', weather: 'clear' }, // (a hot clear June day on the Dalmatian coast)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180606,
  steep: 0.55, // (wheels keep to the serpentines up Srđ; men climb anywhere)
  overwatch: true,
  height,
  river: water,
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_17, cell: 52, weights: [0.3, 0.1, 0.2, 0.4] }), // (the karst’s little walled fields and stony pasture)

  theme: {
    // a hot clear June day on the coast: a deep blue sea, the limestone white in the sun, dark cypresses
    fogColor: 0xccd6de,
    fogDensity: 0.0009,
    skyTop: 0x3c74c4,
    skyHorizon: 0xd8e2ea,
    skyBottom: 0x86887a,
    sunColor: 0xfff2dc,
    sunIntensity: 2.1,
    sunDisk: 0.5,
    clouds: 0.15,
    cloudLight: 0xf6f6f2,
    cloudDark: 0xa4acb6,
    sunDir: [-0.4, 0.7, 0.3],
    hemiSky: 0xc8d6e8,
    hemiGround: 0x6e6a58,
    hemiIntensity: 1.3,
    rimColor: 0xe6e8ec,
    rimIntensity: 0.25,
    terrain: {
      grass: '#6c6c42',
      grassAlt: '#64663c',
      dryGrass: '#988c5a',
      dirt: '#74644c',
      rock: '#a8a498',
      strip: '#5a4c3a',
      pasture: '#70703e',
      ploughed: '#7e5c40',
      stubble: '#a49460',
      meadow: '#6e7444',
      farmX: [0, 1],
      farmZ: [0, 1],
      roads: [], // (the roads are this map’s own: ROADS)
      roadZ: 0,
      surface(x, z, y) {
        if (y < 0.2) return [0x5e5c50, 0.95];                                                      // under the water
        const inl = inland(x, z);
        if (inl < 10 && y < 2.5) return [0xb8b2a2, 0.95];                                         // the white rocks at the water
        if (inCity(x, z, -4)) return [0xc4bcaa, 0.9];                                              // the city’s polished limestone paving
        if (roadD(x, z) < 3.4) return [0xbab2a0, 0.9];                                             // the white limestone roads
        const ek = edgeK(x, z), n = fbm(noise, x * 0.035 + 7, z * 0.035, 2);
        if (ek > 0.12 && ek < 0.9) return [n > 0.1 ? 0xa8a498 : 0x8e8a78, 0.65];                  // Srđ’s bare stony face
        if (ek > 0.9 && n > 0.2) return [n > 0.4 ? 0xbcb8ac : 0xa4a094, Math.min(0.7, (n - 0.1) * 2)]; // bare limestone
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
    pact: layout.map((s) => ({ ...s, x: P.K.x, z: -s.z, facing: 0, name: '1-я рота' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x, z) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const taken: number[][] = [];
    const free = (x, z, r = 14) => roadD(x, z) > 8 && inland(x, z) > 10 && !inCity(x, z, 10) && steepAt(x, z) < 0.35 && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < r);
    const STONE = 0xd2c8b2;
    const block = (x, z, len, thick, hgt, yaw, col = STONE) => {                                   // a stretch of rampart: stone that stops men and shot
      const g = Math.min(terrain.heightAt(x, z), terrain.heightAt(x + Math.cos(yaw) * len * 0.45, z - Math.sin(yaw) * len * 0.45), terrain.heightAt(x - Math.cos(yaw) * len * 0.45, z + Math.sin(yaw) * len * 0.45));
      props.box('stone', x, g + hgt / 2 - 1, z, len, hgt + 2, thick, yaw, col);
      props.cover.addBox({ x, z, yaw, length: len, thickness: thick, height: hgt });
    };

    // ---- the walls: a ring round the city, gates on the coast road at each end (Pile, Ploče)
    props.rand = mulberry32(1806_0601);
    const { x: cx, z: cz, hz, hx } = CITY, W = 9;
    block(cx + hx, cz, hz * 2, 4, W, Math.PI / 2);                                                    // the landward wall (the Buža postern shut: the way in is by the Pile and Ploče gates)
    const pileX = shoreX(cz + hz) + 20 + 45 * Math.exp(-(((cz + hz) / 110) ** 2)), ploceX = shoreX(cz - hz) + 20 + 45 * Math.exp(-(((cz - hz) / 110) ** 2));
    for (const [zz, gx] of [[hz, pileX], [-hz, ploceX]] as const) {                                 // the north and south walls, a gate where the coast road comes in
      const xa = cx - hx, xb = cx + hx;
      if (gx - 8 > xa) block((xa + gx - 8) / 2, cz + zz, gx - 8 - xa, 4, W, 0);
      if (xb > gx + 8) block((gx + 8 + xb) / 2, cz + zz, xb - gx - 8, 4, W, 0);
    }
    block(cx - hx, cz, hz * 2, 3.5, W - 2, Math.PI / 2, 0xc8bea8);                                   // the sea wall
    const towerAt = (x, z, r, hgt) => { const g = terrain.heightAt(x, z); props.box('stone', x, g + hgt / 2 - 1, z, r, hgt + 2, r, 0.4, STONE); props.cover.addBox({ x, z, yaw: 0.4, length: r, thickness: r, height: hgt }); };
    towerAt(cx + hx, cz + hz, 15, 20);                                                                // Minčeta, the round tower on the landward corner (squared)
    towerAt(cx + hx, cz - hz, 10, 13);                                                                // (Sveti Luka’s, over the port)
    towerAt(cx - hx, cz + hz, 10, 12);                                                                // (Bokar’s, at the sea)
    { const g = terrain.heightAt(LOVRIJENAC.x, LOVRIJENAC.z); props.box('stone', LOVRIJENAC.x, g + 7, LOVRIJENAC.z, 20, 16, 18, 0.2, STONE); props.cover.addBox({ x: LOVRIJENAC.x, z: LOVRIJENAC.z, yaw: 0.2, length: 20, thickness: 18, height: 15 }); }
    const rev = { x: ploceX + 26, z: cz - hz - 30 };                                                  // the Revelin before the Ploče gate
    block(rev.x, rev.z, 24, 18, 8, 0.1);
    // ---- the old port: its mole from the south wall out into the water, the galleys and trabaccoli inside
    const px = shoreX(cz - hz + 30) - 2;
    props.box('stone', px - 26, 0.2, cz - hz - 10, 50, 2.4, 8, 0.35, 0xb8b0a0);
    for (const [dz, len] of [[-hz + 40, 18], [-hz + 62, 14]] as const) {
      const x0 = shoreX(cz + dz) - 10;
      props.box('wood', x0, 0.4, cz + dz, 4.6, 1.6, len, 0, 0x5a4432);
      props.box('wood', x0, 6.5, cz + dz, 0.4, 11, 0.4, 0, 0x4a3a2a);
    }
    // ---- inside: the Stradun down the middle, the houses in their blocks, the churches (the cathedral, St Blaise, the Franciscans)
    props.rand = mulberry32(1806_0602);
    props.church({ x: cx - 18, z: cz - 40, yaw: 0 });
    props.church({ x: cx + 26, z: cz + 52, yaw: Math.PI / 2 });
    taken.push([cx - 18, cz - 40], [cx + 26, cz + 52]);
    const rr = mulberry32(1806_0603);
    for (let i = 0, n = 0; i < 1500 && n < 46; i++) {
      const z = cz + (rr() * 2 - 1) * (hz - 12), x = cx + (rr() * 2 - 1) * (hx - 12);
      if (Math.abs(x - (cx + 5)) < 12 || roadD(x, z) < 12 || Math.hypot(x - P.E.x, z - P.E.z) < 20 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue; // (the Stradun, the streets and the square clear for wheels)
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.PI / 2 + (rr() - 0.5) * 0.06, width: 8 + rr() * 2, depth: 8 + rr() * 2, storeys: 3, damaged: 0 });
    }

    // ---- Srđ’s summit: the Russian battery’s earthwork round the cross; the chapel at Bosanka; the villages
    props.rand = mulberry32(1806_0604);
    for (let a = -1.2; a <= 1.21; a += 0.4) { const x = P.F.x - 26 * Math.cos(a), z = P.F.z + 26 * Math.sin(a); if (roadD(x, z) > 12) props.wall({ x, z, yaw: a + Math.PI / 2, length: 10, height: 1.5, thickness: 1.6 }); } // (open where the serpentine comes up)
    props.box('wood', P.F.x + 8, terrain.heightAt(P.F.x + 8, P.F.z) + 4, P.F.z, 0.5, 8, 0.5, 0, 0x5a4a3a);
    props.box('wood', P.F.x + 8, terrain.heightAt(P.F.x + 8, P.F.z) + 6, P.F.z, 0.4, 0.4, 3.6, 0, 0x5a4a3a);
    for (const [q, seed, n0] of [[P.B, 1806_0605, 12], [P.H, 1806_0606, 10], [P.G, 1806_0607, 9], [P.D, 1806_0608, 8], [P.J, 1806_0609, 8], [P.C, 1806_0610, 5], [P.I, 1806_0611, 5]] as const) {
      props.rand = mulberry32(seed);
      const ox = q.x + 30, oz = q.z + 14 * Math.sign(q.z || 1);
      if ('BHG'.includes(q.id) && free(ox, oz, 10)) { props.church({ x: ox, z: oz, yaw: Math.PI / 2 }); taken.push([ox, oz]); }
      const r = mulberry32(seed + 7);
      for (let i = 0, n = 0; i < 120 && n < n0; i++) {
        const a = r() * Math.PI * 2, d = 26 + r() * 44, x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
        if (!free(x, z, 14)) continue;
        taken.push([x, z]); n++;
        props.rand = mulberry32(Math.floor(r() * 1e9));
        if ('BH'.includes(q.id)) props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r() * 3, depth: 7 + r() * 2, storeys: 2, damaged: 0 });
        else props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r() * 3, depth: 6 + r() * 2, height: 3.4 });
      }
    }
    props.rand = mulberry32(1806_0612);
    for (const [q, s] of [[P.B, 1], [P.H, -1]] as const) {                                         // the quays and a moored boat at each harbour village
      const qx = shoreX(q.z) + 3;
      props.box('stone', qx - 8, 0.2, q.z, 20, 1.8, 7, 0, 0xa8a294);
      props.box('wood', qx - 14, 0.4, q.z + 16 * s, 3.6, 1.4, 12, 0, 0x5a4432);
    }
    props.church({ x: P.H.x + 26, z: P.H.z - 30, yaw: 0 });                                         // the Benedictines of Sveti Jakov
    taken.push([P.H.x + 26, P.H.z - 30]);
    // ---- the summer villas of the Ragusan nobles round Gruž bay; the dry-stone walls on the plateau (the same number each half)
    for (const [vx, vz, yaw] of [[shoreX(250) + 40, 250, 0.1], [shoreX(390) + 36, 390, -0.1]] as const) if (free(vx, vz, 12)) {
      props.townHouse({ x: vx, z: vz, yaw: Math.PI / 2 + yaw, width: 16, depth: 11, storeys: 2, name: 'a nobleman’s villa', damaged: 0 });
      props.wall({ x: vx + 14, z: vz, yaw: Math.PI / 2, length: 30, height: 2, thickness: 0.7 });
      taken.push([vx, vz]);
    }
    for (const s of [1, -1]) {
      const r = mulberry32(s > 0 ? 1806_0691 : 1806_0697);
      for (let i = 0, n = 0; i < 3000 && n < 46; i++) {
        const x = -60 + r() * 540, z = s * (40 + r() * 500), yaw = Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.3, len = 14 + r() * 16;
        if (edgeK(x, z) < 0.95 || !free(x, z, 6) || nearPoint(x, z, 26) || roadD(x, z) < 10 || Math.abs(x - 145) < 50 && Math.abs(Math.abs(z) - BASE_Z) < 50) continue;
        n++;
        props.wall({ x, z, yaw, length: len, height: 1.1, thickness: 0.8 });
      }
    }
    for (const [dx, dz, dr] of DOLINES) if (free(dx, dz + dr * 0.5, 4)) props.lowWall({ x: dx, z: dz + dr * 0.5, yaw: 0.3, length: dr * 0.9, height: 0.9 });
    const r = mulberry32(1806_0613);
    for (let i = 0, n = 0; i < 5000 && n < 30; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 520;
      if (!free(x, z, 45) || nearPoint(x, z, 50) || Math.hypot(x - P.A.x, z - BASE_Z) < 60 || Math.hypot(x - P.K.x, z + BASE_Z) < 60 || edgeK(x, z) < 0.9) continue;
      taken.push([x, z]); n++;
      buildSite(props, { kind: ['hay', 'fieldwall', 'farm', 'hay'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    for (let i = 0; i < 500; i++) {
      const x = (r() * 2 - 1) * 490, z = (r() * 2 - 1) * 550, ek = edgeK(x, z);
      if (ek < 0.08 || ek > 0.92 || nearPoint(x, z, 30) || roadD(x, z) < 8 || inCity(x, z, 10)) continue;
      props.boulder({ x, z, radius: 1 + r() * 1.8 });
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xccc8b4]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    water.build(scene);

    const avoid = [{ x: P.A.x, z: BASE_Z, r: 30 }, { x: P.K.x, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      { test: (x, z) => (inland(x, z) < 10 && Math.hypot(x - LOKRUM.x, (z - LOKRUM.z) * 1.4) > LOKRUM.r * 0.8 && lapadQ(x, z) > 0.88) || roadD(x, z) < 5 || inCity(x, z, 8) || Math.hypot(x - LOVRIJENAC.x, z - LOVRIJENAC.z) < 22 }];
    // Aleppo pine and cypress by the sea, holm oak and scrub up the karst
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 3200, broadleaf: 0.45, autumn: 0, maxY: 160, forest: (x, z) => woods(x, z) * 0.95 });
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
