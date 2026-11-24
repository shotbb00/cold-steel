// Strasbourg and the Kehl bridgehead, the siege of Kehl, November 1796 – January 1797: after Moreau’s retreat from
// Bavaria the French held Kehl, the fortress on the east bank of the Rhine opposite Strasbourg, as their door into
// Germany; Archduke Charles’s Austrians dug their parallels against its hornwork through a wet winter while the
// French fed the garrison over the bridge of boats from Strasbourg by way of the Ehrlen island. The Rhine here
// runs north in a main stream and side arms round wooded islands, its banks low and lined with willow and alder
// carr. The French come from Strasbourg on the west bank (+z here), the Austrians from the Offenburg road on the east
// bank (−z); the Rhine flows across the middle of the field, south (−x, Neudorf and Sundheim) to north (+x, the
// Robertsau and Auenheim). Fair, not mirrored: each bank has its fortress by the bridge — Strasbourg’s citadel on
// the west, Kehl’s hornwork on the east — at the same reach from the water and its base; each has an island in
// front of it behind a side arm — the Ehrlen island before Kehl (the bridge of boats lands on it), the Île des Épis
// downstream before the Robertsau (the pontoon bridge lands on it) — and the flying bridge upstream crosses bank to
// bank; Neudorf answers Sundheim, the Robertsau Auenheim. No `climate`: a wet, raw winter without snow.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import { pontoons } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 470;
const noise = createNoise2D(1796_11);

// the Rhine’s main stream across the middle, south (−x) to north (+x)
const rhineZ = (x) => 12 * Math.sin(x * 0.0042 + 0.9) + 5 * Math.sin(x * 0.012 + 2.4) - 4;
// the side arms round the islands: the Ehrlen arm on the Kehl side, the arm round the Île des Épis on the Strasbourg side
const ERLEN = [[-310, -14, 6], [-250, -52, 10], [-150, -78, 12], [-40, -72, 11], [40, -50, 9], [90, -16, 6]].map(([x, dz, w]) => [x, rhineZ(x) + dz, w]);
const EPIS = [[90, 14, 6], [150, 56, 10], [260, 80, 12], [360, 66, 11], [430, 40, 9], [480, 12, 6]].map(([x, dz, w]) => [x, rhineZ(x) + dz, w]);
const river = createRiver({
  path: rhineZ,
  paths: [rhineZ, ERLEN, EPIS],
  halfWidth: 24,
  level: 0,
  depth: 3.2,
  valley: 70,
  crossings: [
    { name: 'Flying bridge', x: -390, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Bridge of boats', x: 0, kind: 'bridge', width: 7, pontoon: true },
    { name: 'Pontoon bridge', x: 330, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Ehrlen bridge', x: 10, z: rhineZ(10) - 66, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Ehrlen ford', x: -220, z: rhineZ(-220) - 60, kind: 'ford', width: 12, channel: 1 },
    { name: 'Épis bridge', x: 230, z: rhineZ(230) + 78, kind: 'bridge', width: 6, channel: 2 },
    { name: 'Épis ford', x: 420, z: rhineZ(420) + 44, kind: 'ford', width: 12, channel: 2 },
  ],
});
const nearWater = (x, z, r) => { const I = river.project(x, z); return I.d < I.hw + r; };

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Strasbourg road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Neudorf', x: -340, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Citadel', x: 60, z: 230, owner: null, sector: 'centre', radius: 30 },
  { id: 'D', name: 'Robertsau', x: 360, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Ehrlen island', x: -140, z: Math.round(rhineZ(-140) - 42), owner: null, sector: 'west' },
  { id: 'F', name: 'Bridge of boats', x: 0, z: Math.round(rhineZ(0)), owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Île des Épis', x: 270, z: Math.round(rhineZ(270) + 44), owner: null, sector: 'east' },
  { id: 'H', name: 'Sundheim', x: -330, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Kehl', x: -30, z: -230, owner: null, sector: 'centre', radius: 30 },
  { id: 'J', name: 'Auenheim', x: 350, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Offenburg road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
// the two fortresses (a star of bastions round each place)
const CITADEL = { x: P.C.x, z: P.C.z, R: 52, yaw: 0.2 };
const HORN = { x: P.I.x, z: P.I.z - 6 };

function height(x, z) {
  let h = fbm(noise, x * 0.003, z * 0.003, 3) * 3.6 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.35 + 5;
  h += smoothstep(90, 220, Math.abs(z - rhineZ(x))) * 1.0;                                   // the low terrace off the flood plain
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 14 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 12;
  for (const p of POINTS) if (p.id !== 'F') h += (5.6 - h) * smoothstep(44, 20, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return river.carve(x, z, Math.max(1.6, h));
}

/** The flood-plain woods (0..1): willow and alder carr along the water and on the islands, copses on the plain. */
const woods = (x, z) => {
  const I = river.project(x, z);
  let k = smoothstep(0.55, 0.68, fbm(noise, x * 0.006 + 21, z * 0.006 - 5, 3)) * 0.7;
  if (I.d > I.hw + 4 && I.d < 75 && fbm(noise, x * 0.018, z * 0.018 + 40, 2) > -0.1) k = Math.max(k, 0.75);
  for (const p of POINTS) k = Math.min(k, smoothstep(p.id === 'C' || p.id === 'I' ? 70 : 30, p.id === 'C' || p.id === 'I' ? 95 : 56, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(22, 44, Math.hypot(x - c.x, z - c.z)));
  return k;
};

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

/** A fortress trace: bastioned polygon walls round (x, z), a gap in the faces toward `gaps` (angles). */
function bastions(props, { x, z, R, yaw }, n, gaps: number[]) {
  const pts: number[][] = [];
  for (let i = 0; i < n * 2; i++) { const a = yaw + (i * Math.PI) / n, r = i % 2 ? R * 0.72 : R; pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); }
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length], mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const facing = Math.atan2(mz - z, mx - x);
    if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(facing - g), Math.cos(facing - g))) < Math.PI / n / 1.5)) continue;
    props.wall({ x: mx, z: mz, yaw: Math.atan2(-(bz - az), bx - ax), length: Math.hypot(bx - ax, bz - az) + 1, height: 3.2, thickness: 2.2 });
  }
}

export default {
  id: 'kehl',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Desaix’s and Moreau’s French against Archduke Charles’s besiegers — Austria has no units yet: Russia fights for her)
  name: 'Kehl',
  description: 'Alsace and Baden, winter 1796–97: the Rhine between Strasbourg and Kehl in its main stream and side arms round wooded islands, the bridge of boats, Strasbourg’s citadel on the west bank and Kehl’s hornwork on the east.',
  epochs: ['1806'],
  region: 'europe',
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 179611,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1796_12, cell: 70, weights: [0.25, 0.45, 0.2, 0.1] }), // winter: ploughland, stubble, wet meadows

  theme: {
    // a raw Rhine winter: low grey cloud, mist over the water, the light flat
    fogColor: 0xa9b0b2,
    fogDensity: 0.0022,
    skyTop: 0x76808a,
    skyHorizon: 0xb4babc,
    skyBottom: 0x84887e,
    sunColor: 0xd8dcd8,
    sunIntensity: 1.1,
    sunDisk: 0,
    clouds: 1,
    cloudLight: 0xb6babe,
    cloudDark: 0x686e74,
    sunDir: [0.4, 0.4, 0.6],
    hemiSky: 0xbcc4c8,
    hemiGround: 0x545240,
    hemiIntensity: 1.4,
    rimColor: 0xb8c0c6,
    rimIntensity: 0.15,
    terrain: {
      grass: '#5a6440',
      grassAlt: '#525c3a',
      dryGrass: '#7c7650',
      dirt: '#5a4a38',
      rock: '#7a786e',
      strip: '#4e4232',
      pasture: '#5a663e',
      ploughed: '#4e3f2e',
      stubble: '#857c52',
      meadow: '#5a6840',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const I = river.project(x, z), d = I.d - I.hw;
        if (d > 0 && d < 40) return [0x4a5438, smoothstep(40, 8, d) * 0.55];                       // the wet carr along the water
        for (const f of [CITADEL, HORN]) if (Math.hypot(x - f.x, z - f.z) < 75) return [0x6a6a4c, 0.35]; // the glacis, cropped grass
        const m = smoothstep(0.5, 0.64, fbm(noise, x * 0.012 + 30, z * 0.012, 2));
        return m > 0 ? [0x4a3e30, m * 0.5] : null;                                                  // puddles and mud
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];

    // ---- Strasbourg’s citadel: Vauban’s pentagon of bastions, the barracks and the arsenal inside; gates toward the city and the bridge
    props.rand = mulberry32(1796_1101);
    bastions(props, CITADEL, 5, [Math.PI / 2, -Math.PI / 2]);
    props.hall({ x: CITADEL.x - 14, z: CITADEL.z + 14, yaw: 0.2, width: 26, depth: 9, height: 7, color: 0xc8b8a0, roof: 0x5a4a40, door: 3, name: 'barracks' });
    props.hall({ x: CITADEL.x + 16, z: CITADEL.z - 16, yaw: 0.2, width: 18, depth: 9, height: 6, color: 0xb8a890, roof: 0x5a4a40, door: 3, name: 'arsenal' });
    taken.push([CITADEL.x, CITADEL.z]);
    // ---- Kehl: the hornwork before the town on the east bank — a curtain between two half-bastions facing the Austrians, wings back to the arm
    props.rand = mulberry32(1796_1102);
    // (each half: the wing from the gorge, the half-bastion’s flank, face and shoulder, the curtain to the gate)
    const trace = (pts: number[][]) => { for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
      props.wall({ x: HORN.x + (ax + bx) / 2, z: HORN.z + (az + bz) / 2, yaw: Math.atan2(-(bz - az), bx - ax), length: Math.hypot(bx - ax, bz - az) + 1.5, height: 3.2, thickness: 2.2 }); } };
    for (const s of [-1, 1]) trace([[78 * s, 24], [78 * s, -50], [98 * s, -86], [48 * s, -64], [9 * s, -60]]);
    props.hall({ x: HORN.x + 20, z: HORN.z + 14, yaw: 0, width: 22, depth: 9, height: 6, color: 0xc4b49c, roof: 0x5a4a40, door: 3, name: 'barracks' });
    props.church({ x: HORN.x - 30, z: HORN.z + 18, yaw: Math.PI / 2 });
    taken.push([HORN.x, HORN.z], [HORN.x - 30, HORN.z + 18]);
    // houses of Kehl round the hornwork’s gorge, and Strasbourg’s outskirts behind the citadel
    for (const [cx, cz, n, seed, s] of [[HORN.x, HORN.z - 6, 16, 1796_1103, -1], [CITADEL.x - 40, CITADEL.z + 90, 18, 1796_1104, 1]] as const) {
      const r = mulberry32(seed);
      for (let i = 0, k = 0; i < n * 4 && k < n; i++) {
        const a = r() * Math.PI * 2, d = 90 + r() * 60, x = cx + Math.cos(a) * d * 1.2, z = cz + Math.sin(a) * d * 0.6;
        if (nearWater(x, z, 12) || nearPoint(x, z, 22) || (Math.abs(x - HORN.x) < 112 && z > HORN.z - 100 && z < HORN.z + 34) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 15) || Math.sign(z - rhineZ(x)) !== s) continue;
        taken.push([x, z]);
        props.rand = mulberry32(Math.floor(r() * 1e9));
        props.house({ x, z, yaw: a + Math.PI / 2, width: 8 + r() * 3, depth: 7, height: 4 });
        k++;
      }
    }
    // ---- the villages; a toll house at each bridge end, boats drawn up on the banks
    for (const p of POINTS) if ('BDHJ'.includes(p.id)) buildVillage(props, p, 17961 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1796_1105);
    props.church({ x: P.B.x + 28, z: P.B.z + 20, yaw: 0 });
    props.church({ x: P.J.x - 26, z: P.J.z - 22, yaw: Math.PI });
    taken.push([P.B.x + 28, P.B.z + 20], [P.J.x - 26, P.J.z - 22]);
    for (const c of river.crossings.filter((c) => c.channel === 0)) {
      for (const s of [1, -1]) {
        const q = river.at(c, 12, s * (river.halfWidth + 16));
        if (nearWater(q.x, q.z, 4)) continue;
        props.house({ x: q.x, z: q.z, yaw: 0, width: 6, depth: 5 });
        props.logPile({ x: q.x - 22, z: q.z, yaw: 0, length: 7 });
        taken.push([q.x, q.z], [q.x - 22, q.z]);
      }
    }

    // ---- farms, field walls and hay on the plain
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 70 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 80);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || nearWater(x, z, 40) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)
        || Math.hypot(x - CITADEL.x, z - CITADEL.z) < 90 || Math.hypot(x - HORN.x, z - HORN.z) < 100) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const fort = (x, z) => Math.hypot(x - CITADEL.x, z - CITADEL.z) < CITADEL.R + 14 || (Math.abs(x - HORN.x) < 90 && z > HORN.z - 70 && z < HORN.z + 50);
    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 30 })), { test: (x, z) => nearWater(x, z, 1.5) || fort(x, z) }];
    // willows, alders and poplars, bare in the winter; oaks on the plain
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 4400, broadleaf: 0.92, autumn: 1, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1400, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6, fields: this.fields });

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
