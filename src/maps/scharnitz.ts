// Scharnitz and Leutasch, 4–5 November 1805: Ney into the Tyrol. The road from Mittenwald to Innsbruck runs up the
// Isar gorge, and at Scharnitz the Austrians had shut the valley with the Porta Claudia — a wall with a gate and
// bastions from the foot of the Arnspitze to the Karwendel. Ney’s frontal attacks broke on it; Loison took a column up
// the Leutasch, the parallel high valley west of the Arnspitze, stormed the Leutasch redoubt and came down by Seefeld
// behind the fort, and the Porta Claudia fell. An Alpine valley in November: the Isar floor at about 950 m, the
// walls of the Wetterstein and the Karwendel rising 600–800 m over it, snow on the heights, larch and spruce.
// The French come from Mittenwald (+z here), the Austrians from Seefeld and the Innsbruck road (−z). Three lanes run
// between the basins at the two ends: the Isar valley in the east (the Porta Claudia and Scharnitz across it in
// the middle), the Leutasch shelf in the west, 30 m higher (the Leutasch redoubt in its middle), and the saddle over
// the Arnspitze massif between them. Fair, not mirrored: the forts and the saddle lie in the middle, as far from both
// bases; each side has a basin village (Mittenwald, Seefeld), a Leutasch village (Leutaschklamm, Weidach) and an Isar
// village (Seinsbach, Gießenbach) at the same reach; the massif’s two summits, the Karwendel’s and the Wetterstein’s
// walls run the whole length of the field, as high on each half. No `climate`: early snow on the heights, not winter.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 470;
const LEUT = 30; // (the Leutasch shelf over the Isar meadows)
const noise = createNoise2D(1805_11);

/** The Isar down the east of the field (it flows north, +z), and the Leutasch valley down the west. */
const isarX = (z) => 160 + 22 * Math.cos(z * 0.0045) + 8 * Math.sin(z * 0.013);
const leutX = (z) => -300 + 24 * Math.sin(z * 0.005 - 0.8);
const isarW = (z) => 70 - 28 * Math.exp(-((z / 90) ** 2)); // (the floor’s half-width: the narrows at the Porta Claudia)
const LEUT_W = 55;
/** 0..1 across the ground between the two floors: 0 on the Leutasch shelf’s east edge, 1 at the Isar meadows’ west edge. */
const across = (x, z) => Math.max(0, Math.min(1, (x - (leutX(z) + LEUT_W)) / (isarX(z) - isarW(z) - (leutX(z) + LEUT_W))));
/** The Arnspitze massif’s crest between the valleys (from Mittenwald’s basin to Seefeld’s), the saddle over its middle. */
const crestH = (z) => 46 + 160 * smoothstep(30, 150, Math.abs(z));
const CREST_T = 0.5;

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Partenkirchen road', x: -40, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Leutaschklamm', x: Math.round(leutX(310)), z: 310, owner: null, sector: 'west' },
  { id: 'C', name: 'Mittenwald', x: 30, z: 330, owner: null, sector: 'centre', radius: 28 },
  { id: 'D', name: 'Seinsbach', x: Math.round(isarX(290) - 30), z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Leutasch redoubt', x: Math.round(leutX(4)), z: 4, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Arnspitze saddle', x: 0, z: 0, owner: null, sector: 'centre' },
  { id: 'G', name: 'Porta Claudia', x: Math.round(isarX(0) - 18), z: -4, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Weidach', x: Math.round(leutX(-300)), z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Seefeld', x: -10, z: -320, owner: null, sector: 'centre', radius: 28 },
  { id: 'J', name: 'Gießenbach', x: Math.round(isarX(-300) - 30), z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Innsbruck road', x: -20, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
// (the saddle point on the crest line of the massif)
P.F.x = Math.round(leutX(0) + LEUT_W + CREST_T * (isarX(0) - isarW(0) - leutX(0) - LEUT_W));

const isarCourse: number[][] = [];
for (let z = -840; z <= 840; z += 30) isarCourse.push([isarX(z), z]);
const river = createRiver({
  path: isarCourse,
  halfWidth: 9,
  level: 0,
  depth: 2.2,
  valley: 34,
  crossings: [
    { name: 'Gießenbach ford', x: isarX(-250), z: -250, kind: 'ford', width: 14 },
    { name: 'Scharnitz bridge', x: isarX(-60), z: -60, kind: 'bridge', width: 6 },
    { name: 'Mittenwald bridge', x: isarX(250), z: 250, kind: 'bridge', width: 6 },
  ],
});
const nearWater = (x, z, r) => Math.abs(x - isarX(z)) < river.halfWidth + r;

/** The roads: the Isar road on the west bank, the Leutasch road, the track over the saddle, the basins’ roads. */
const ROADS: number[][][] = [
  [[P.A.x, P.A.z], [P.C.x, P.C.z], [isarX(250) - 30, 250], ...[200, 120, 40, -40, -120, -200].map((z) => [isarX(z) - (z > -30 && z < 30 ? 22 : 30), z]), [P.J.x, P.J.z], [P.I.x, P.I.z], [P.K.x, P.K.z]],
  [[P.C.x, P.C.z], [P.B.x + 30, 360], ...[300, 200, 100, 10, -100, -200, -300].map((z) => [leutX(z) + 8, z]), [P.H.x + 40, -360], [P.I.x, P.I.z]],
  [[leutX(14) + 8, 14], [leutX(14) + 70, 6], [P.F.x - 40, 14], [P.F.x, P.F.z], [P.F.x + 50, 2], [isarX(0) - 50, 0]],
];
const roadExact = (x, z) => Math.min(...ROADS.map((r) => segDist(r, x, z)));
const roadNear = gridCache(roadExact, { x: 520, z: 580 }, 8);
const roadD = (x, z) => (roadNear(x, z) > 18 ? 99 : roadExact(x, z)); // (far from every road: the coarse grid says so)

/** The mountainside alone (no shelves, no river). */
function mountain(x, z) {
  const t = across(x, z), az = Math.abs(z);
  let h = LEUT + (4 - LEUT) * smoothstep(0, 1, t);                                   // the Leutasch shelf down to the Isar meadows
  if (t > 0 && t < 1 && az < 400) {                                                  // the Arnspitze massif, the saddle in its middle
    const mz = smoothstep(300, 180, az + 70 * (1 - Math.sin(Math.PI * t)) + 50 * fbm(noise, x * 0.008, z * 0.008 + 11, 2)); // (its ends rounded)
    const peaks = az > 40 ? 1 + (0.8 * ridged(noise, 3.1 + x * 0.003, z * 0.011, 2) - 0.4) * smoothstep(40, 120, az) : 1; // (its summits and notches along the crest)
    h += crestH(z) * peaks * mz * (1 - Math.abs(2 * t - 1) ** 1.5);
  }
  const dw = leutX(z) - LEUT_W - x, de = x - (isarX(z) + isarW(z));
  if (dw > 0) h += 720 * smoothstep(0, 500, dw) ** 1.5;                              // the Wetterstein and the Hohe Munde
  if (de > 0) h += 780 * smoothstep(0, 560, de) ** 1.6;                              // the Karwendel
  const rise = Math.max(h - LEUT, 0);
  if (rise > 0) {
    h += ridged(noise, x * 0.005 + 5, z * 0.005, 3) * Math.min(110, rise * 0.3);    // spurs and crests
    h -= ridged(noise, x * 0.004 - 9, z * 0.016, 2) * Math.min(60, rise * 0.25);     // gullies down the walls
    h += ridged(noise, x * 0.016 + 2, z * 0.016 - 4, 2) * Math.min(24, rise * 0.14); // crags
  }
  h += fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.8 + fbm(noise, x * 0.004, z * 0.004, 2) * 2;
  return h;
}
// the shelves the points and bases stand on (their own height, levelled round them)
const SHELVES = [...POINTS.map((p) => [p.x, p.z, p.id === 'F' ? 26 : 30]), [-290, 540, 26], [-290, -540, 26]];
const SHELF_H = SHELVES.map(([x, z]) => mountain(x, z));

function height(x, z) {
  let h = mountain(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { h += (SHELF_H[i] - h) * smoothstep(r + 24, r, Math.hypot(x - sx, z - sz)); });
  // the roads benched into the slope: smoothed toward the ground’s own lower level
  const d = roadD(x, z);
  if (d < 10) h += (Math.min(h, mountain(x, z) * 0.98 + 0.4) - h) * smoothstep(10, 4, d) * 0.6;
  return river.carve(x, z, h);
}

/** The woods (0..1): spruce and larch up the slopes to the tree line, copses on the floors. */
const woods = gridCache((x, z) => {
  const y = mountain(x, z);
  let k = smoothstep(0.42, 0.6, fbm(noise, x * 0.007 - 20, z * 0.007 + 3, 3)) * 0.7;
  k = Math.max(k, smoothstep(LEUT + 10, LEUT + 40, y) * smoothstep(240, 180, y) * (0.6 + 0.4 * smoothstep(0.3, 0.5, fbm(noise, x * 0.012, z * 0.012 - 8, 2))));
  for (const p of POINTS) k = Math.min(k, smoothstep(34, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadD(x, z)));
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'scharnitz',
  armies: { nato: ['fr', 'by'], pact: ['au', 'ru'] }, // (Ney’s VI Corps with Bavarians against the Tyrol’s Austrians — Austria has no units yet: Russia fights for her)
  name: 'Scharnitz',
  description: 'The Tyrol, November 1805: the Isar valley shut by the Porta Claudia at Scharnitz, the Leutasch valley and its redoubt behind the Arnspitze, Mittenwald and Seefeld at either end, snow on the Karwendel.',
  epochs: ['1806'],
  region: 'europe',
  airfields: [], // (an Alpine valley: no aircraft in 1806 and nowhere to put a strip)
  conditions: { time: 'day', weather: 'overcast' },
  size: 1700,
  segments: 720,
  bounds: BOUNDS,
  steep: 0.55, // (guns and wagons keep to the floors and the saddle; men climb anywhere)
  overwatch: true,
  camera: { maxHeight: 700, far: 3600 },
  seed: 180511,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_4, cell: 70, weights: [0.55, 0.1, 0.05, 0.3] }), // mountain hay meadows and pasture, little tilled

  theme: {
    // a grey November day in the mountains: cloud on the summits, snow on the heights
    fogColor: 0xb4bcc2,
    fogDensity: 0.0012,
    skyTop: 0x6e7c8c,
    skyHorizon: 0xbcc4ca,
    skyBottom: 0x868a84,
    sunColor: 0xe4e2da,
    sunIntensity: 1.25,
    sunDisk: 0.05,
    clouds: 0.85,
    cloudLight: 0xc4c8cc,
    cloudDark: 0x6c727a,
    sunDir: [-0.35, 0.55, 0.55],
    hemiSky: 0xbcc6cc,
    hemiGround: 0x5a5444,
    hemiIntensity: 1.4,
    rimColor: 0xc0c8d0,
    rimIntensity: 0.2,
    terrain: {
      grass: '#66683e',
      grassAlt: '#5c6038',
      dryGrass: '#8c8458',
      dirt: '#5e5040',
      rock: '#9a988e',
      strip: '#4e4232',
      pasture: '#666a40',
      ploughed: '#5a4a38',
      stubble: '#8e8458',
      meadow: '#6a6c42',
      farmX: [0, 1],
      farmZ: [0, 1],
      roads: [], // (the roads are this map’s own: ROADS)
      roadZ: 0,
      surface(x, z, y) {
        if (roadD(x, z) < 3.5) return [0x8e8676, 0.85];                                    // the roads: limestone grit
        if (Math.abs(x - isarX(z)) < 26 && y < 2.4) return [0xc8c4b6, 0.9];                // the Isar’s pale gravel
        if (y > LEUT + 30) {
          const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
          if (y > 150) return [0xeef0f2, smoothstep(150, 200, y) * (g > 1.1 ? 0.5 : 0.95)]; // snow on the heights
          if (g > 0.9) return [0x9c9a92, Math.min(1, (g - 0.9) * 3)];                       // limestone crags
          if (g < 0.5) return [0x6c6a42, 0.8 * smoothstep(0.5, 0.3, g)];                    // the high pastures, browned
        } else if (y > 12) {
          const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
          if (g < 0.45) return [0x62683e, 0.85 * smoothstep(0.45, 0.25, g)];               // the Leutasch’s hay meadows
        }
        return null;
      },
    },
  },

  bases: { nato: { x: P.A.x, z: BASE_Z, entries: [-290, -40, 150] }, pact: { x: P.K.x, z: -BASE_Z, entries: [-290, -20, 150] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, x: P.A.x, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: P.K.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x, z) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const taken: number[][] = [];
    const free = (x, z, r = 14) => roadD(x, z) > 9 && !nearWater(x, z, 12) && steepAt(x, z) < 0.3 && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < r);

    // ---- the Porta Claudia: the wall across the narrows north of Scharnitz, its gate on the road, a bastion each end
    props.rand = mulberry32(1805_114);
    const WZ = 28, gate = isarX(WZ) - 22;
    const x0 = isarX(WZ) - isarW(WZ) - 14, x1 = isarX(WZ) + isarW(WZ) + 10;
    for (const [a, b] of [[x0, gate - 6], [gate + 6, isarX(WZ) - river.halfWidth - 3], [isarX(WZ) + river.halfWidth + 3, x1]]) {
      props.wall({ x: (a + b) / 2, z: WZ, yaw: 0, length: b - a, height: 3.4, thickness: 1.6 });
    }
    for (const bx of [gate - 8, gate + 8]) props.column({ x: bx, z: WZ, radius: 2.2, height: 5.5 }); // (the gate towers)
    for (const [bx, s] of [[x0, -1], [x1, 1]]) {
      props.wall({ x: bx + s * 6, z: WZ + 7, yaw: Math.PI / 2, length: 14, height: 3.4, thickness: 1.6 });
      props.wall({ x: bx, z: WZ + 14, yaw: 0, length: 12, height: 3.4, thickness: 1.6 });
    }
    props.hall({ x: gate - 2, z: WZ - 18, yaw: 0, width: 18, depth: 9, height: 6, color: 0xd8d0be, roof: 0x5c4434, door: 3, name: 'fort barracks' });
    taken.push([gate, WZ], [gate - 2, WZ - 18], [x0, WZ], [x1, WZ]);
    // ---- Scharnitz behind the fort, its church; the toll house by the bridge
    const rr = mulberry32(1805_1104);
    props.church({ x: isarX(-70) - 48, z: -70, yaw: Math.PI / 2 });
    taken.push([isarX(-70) - 48, -70]);
    for (let i = 0; i < 40; i++) {
      const z = -20 - rr() * 110, x = isarX(z) + (rr() < 0.75 ? -(20 + rr() * 45) : 18 + rr() * 22);
      if (!free(x, z, 15) || Math.hypot(x - P.G.x, z - P.G.z) < 16) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.house({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 8 + rr() * 2, depth: 7, height: 3.6 });
    }
    // ---- the Leutasch redoubt: an earthwork across the shelf, a blockhouse behind it
    props.rand = mulberry32(1805_1105);
    const RZ = 34, rx = leutX(RZ);
    for (const [dx, len] of [[-38, 36], [38, 36]]) props.wall({ x: rx + dx, z: RZ, yaw: 0, length: len, height: 2.2, thickness: 2.4 });
    props.wall({ x: rx - 58, z: RZ - 10, yaw: Math.PI / 2, length: 20, height: 2.2, thickness: 2.4 });
    props.wall({ x: rx + 58, z: RZ - 10, yaw: Math.PI / 2, length: 20, height: 2.2, thickness: 2.4 });
    props.hall({ x: rx + 22, z: RZ - 30, yaw: 0, width: 12, depth: 8, height: 5, color: 0x8a7458, roof: 0x4e3e30, door: 2, name: 'blockhouse' });
    taken.push([rx, RZ], [rx + 22, RZ - 30], [rx - 38, RZ], [rx + 38, RZ]);
    // ---- Mittenwald and Seefeld: churches, houses round the square
    for (const [q, seed, yaw] of [[P.C, 1805_1101, 0], [P.I, 1805_1102, Math.PI]] as const) {
      props.rand = mulberry32(seed);
      props.church({ x: q.x + 30, z: q.z + 18 * Math.sign(q.z), yaw });
      taken.push([q.x + 30, q.z + 18 * Math.sign(q.z)]);
      const r = mulberry32(seed + 7);
      for (let i = 0; i < 40; i++) {
        const a = r() * Math.PI * 2, d = 34 + r() * 46;
        const x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d * 0.8;
        if (!free(x, z, 15)) continue;
        taken.push([x, z]);
        props.rand = mulberry32(Math.floor(r() * 1e9));
        props.house({ x, z, yaw: a + Math.PI / 2, width: 8 + r() * 3, depth: 7, height: 3.6 });
      }
    }
    for (const p of POINTS) if ('BDHJ'.includes(p.id)) buildVillage(props, p, 18051 + Math.round(p.x * 3 + p.z * 7));
    // ---- the saddle: a herdsman’s hut and a wayside shrine; hay barns on the meadows, boulders under the walls
    props.rand = mulberry32(1805_1106);
    props.house({ x: P.F.x + 18, z: P.F.z - 20, yaw: 0.3, width: 7, depth: 5, height: 2.8 });
    props.column({ x: P.F.x - 12, z: P.F.z + 14, radius: 0.5, height: 2.4 });
    taken.push([P.F.x + 18, P.F.z - 20]);
    const r = mulberry32(1805_1107);
    for (let i = 0, n = 0; i < 6000 && n < 56; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 520;
      if (!free(x, z, 45) || nearPoint(x, z, 50) || Math.hypot(x - P.A.x, z - BASE_Z) < 60 || Math.hypot(x - P.K.x, z + BASE_Z) < 60 || mountain(x, z) > LEUT + 12) continue;
      taken.push([x, z]);
      n++;
      buildSite(props, { kind: ['hay', 'fieldwall', 'farm', 'hay'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    for (let i = 0; i < 700; i++) {
      const x = (r() * 2 - 1) * 490, z = (r() * 2 - 1) * 550, y = mountain(x, z);
      if (y < LEUT + 20 || y > 260 || nearPoint(x, z, 30) || roadD(x, z) < 8) continue;
      props.boulder({ x, z, radius: 1 + r() * 2.2 });
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: P.A.x, z: BASE_Z, r: 30 }, { x: P.K.x, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 22 })), { test: (x, z) => nearWater(x, z, 2) || roadD(x, z) < 5 }];
    // spruce, larch turned gold and mountain pine up to the tree line; a few beech and maple on the floors
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 5600, broadleaf: 0.15, autumn: 1, maxY: 230, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.4, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
