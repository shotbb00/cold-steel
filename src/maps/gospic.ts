// Gospić, 21–22 May 1809: Marmont’s Army of Dalmatia marched north out of Dalmatia to join Eugène on the Danube and
// found General Stojčević’s Grenzer — the Lika and Otočac regiments, men defending their own valley — drawn up
// behind the Lika and the Jadova round the little garrison town of Gospić, the seat of the Lika regiment. Two days of
// fighting across the rivers and up the karst knolls; the Grenzer fell back north and the road to Ljubljana was open.
// The ground, compressed: the Lika valley, a green flat floor between the Velebit’s limestone foothills on the west
// (−x) and the lower knolls of the Plješivica side on the east (+x). The Lika winds slantwise across the middle;
// Gospić sits on both its banks round the stone bridge, the church and the regiment’s house on the north bank. The
// Jadova comes down to it from the south through the French half, the Novčica from the north through the Austrian
// half. The French come from the south (+z: the road from Medak), the Grenzer from the north (−z: Lički Osik).
// Karst everywhere the ground rises: grey stone through thin grass, dolines, dry-stone walls, beech and pine.
// Fair, not mirrored: the rivers are laid point-for-point (each side has its own tributary to cross on its flank, and
// each flank village across the Lika lies on the far side of the other’s tributary), but the hills are not — the
// Velebit is a long ridge on the west, the eastern side broken knolls. Gospić on its bridge is in the middle; each
// side has a village on the main road (Barlete, Kaniža), a karst knoll on the outer flank as high (Divoselo, Ornice),
// a mill bridge on its tributary (the Jadova, the Novčica) and a flank village across the Lika on a knoll as high
// (Smiljan, Klanac), each as far from its own base. The dolines and walls are each half’s own dice, the same number.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 450;
const BASE_X = -20;                                                              // (both bases a little west: the Medak and Osik roads)
const noise = createNoise2D(1809_0521);
/** The Lika: slantwise across the middle (z along x). */
const likaZ = (x) => 0.12 * x + 16 * Math.sin(x * 0.011 + 0.4) + 6 * Math.sin(x * 0.029);
/** The Jadova (from the south, through the French half) and the Novčica (from the north, through the Austrian half). */
const JADOVA = [[260, likaZ(260), 4.5], [285, 130, 4.5], [305, 290, 4.5], [370, 420, 4.5], [420, 640, 4.5]];
const NOVCICA = [[-260, likaZ(-260), 4.5], [-272, -120, 4.5], [-325, -285, 4.5], [-350, -420, 4.5], [-380, -640, 4.5]];
const onCourse = (c, z) => { for (let i = 0; i < c.length - 1; i++) { const [ax, az] = c[i], [bx, bz] = c[i + 1]; if ((z - az) * (z - bz) <= 0) return ax + (bx - ax) * (z - az) / (bz - az || 1); } return c[0][0]; };

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Medak road', x: BASE_X, z: BASE_Z, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Divoselo', x: -350, z: 305, owner: null, sector: 'west' },
  { id: 'C', name: 'Barlete', x: -70, z: 245, owner: null, sector: 'centre' },
  { id: 'D', name: 'Jadova bridge', x: 305, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Smiljan', x: -395, z: 45, owner: null, sector: 'west' },
  { id: 'F', name: 'Gospić', x: 0, z: Math.round(likaZ(0)), owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Klanac', x: 385, z: -40, owner: null, sector: 'east' },
  { id: 'H', name: 'Novčica bridge', x: -325, z: -285, owner: null, sector: 'west' },
  { id: 'I', name: 'Kaniža', x: 45, z: -250, owner: null, sector: 'centre' },
  { id: 'J', name: 'Ornice', x: 310, z: -305, owner: null, sector: 'east' },
  { id: 'K', name: 'Lički Osik road', x: BASE_X, z: -BASE_Z, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

const river = createRiver({
  path: likaZ,
  paths: [likaZ, JADOVA, NOVCICA],
  halfWidth: 7,
  level: 0,
  depth: 1.8,
  valley: 30,                                                                     // (wide enough that the brooks’ banks slope, not cliffs)
  crossings: [
    { name: 'Gospić bridge', x: 0, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Budak ford', x: -160, kind: 'ford', width: 12, channel: 0 },
    { name: 'Kaniža ford', x: 160, kind: 'ford', width: 12, channel: 0 },
    { name: 'Smiljan bridge', x: -420, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Klanac bridge', x: 420, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Jadova bridge', x: P.D.x, z: P.D.z, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Bilaj ford', x: onCourse(JADOVA, 190), z: 190, kind: 'ford', width: 10, channel: 1 },
    { name: 'upper Jadova ford', x: onCourse(JADOVA, 380), z: 380, kind: 'ford', width: 10, channel: 1 },
    { name: 'Novčica bridge', x: P.H.x, z: P.H.z, kind: 'bridge', width: 7, channel: 2 },
    { name: 'Novčica ford', x: onCourse(NOVCICA, -190), z: -190, kind: 'ford', width: 10, channel: 2 },
    { name: 'upper Novčica ford', x: onCourse(NOVCICA, -380), z: -380, kind: 'ford', width: 10, channel: 2 },
  ],
});
const nearWater = (x, z, r) => { const p = river.project(x, z); return p.d < p.hw + r; };

/** The roads: the post road down the middle over Gospić bridge; the lanes out to the flanks and over the side bridges. */
const LZ = (x) => likaZ(x);
const ROADS: number[][][] = [
  [[BASE_X, 640], [BASE_X, BASE_Z], [-30, 330], [P.C.x, P.C.z], [-10, 120], [0, 60], [0, -50], [10, -120], [P.I.x, P.I.z], [10, -330], [BASE_X, -BASE_Z], [BASE_X, -640]],
  [[P.C.x, P.C.z], [-180, 270], [P.B.x, P.B.z], [-560, 300]],
  [[P.I.x, P.I.z], [180, -270], [P.J.x, P.J.z], [560, -300]],
  [[P.B.x, P.B.z], [-360, 150], [P.E.x, P.E.z], [-420, LZ(-420) + 30], [-420, LZ(-420) - 30], [-410, -150], [P.H.x - 30, P.H.z], [P.H.x + 30, P.H.z], [-150, -260], [P.I.x, P.I.z]],
  [[P.J.x, P.J.z], [360, -150], [P.G.x, P.G.z], [420, LZ(420) - 30], [420, LZ(420) + 30], [410, 150], [P.D.x + 30, P.D.z], [P.D.x - 30, P.D.z], [150, 260], [P.C.x, P.C.z]],
  [[0, 34], [-120, 34], [-260, 26], [P.E.x, P.E.z]],
  [[0, -22], [120, -30], [260, -10], [P.G.x, P.G.z]],
];
/** Every road's segments with their boxes (22 m out): a far segment costs one comparison. */
const SEGS = ROADS.flatMap((r) => r.slice(1).map(([bx, bz], i) => { const [ax, az] = r[i]; return [ax, az, bx, bz, Math.min(ax, bx) - 22, Math.max(ax, bx) + 22, Math.min(az, bz) - 22, Math.max(az, bz) + 22]; }));
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

/** The karst knolls [x, z, r, h] (not mirrored: the Velebit below is a ridge, the east side knolls). */
const KNOLLS = [[-300, 420, 90, 14], [-250, -380, 80, 12], [430, 200, 85, 16], [260, -150, 70, 9], [470, -420, 90, 18], [-120, 420, 60, 6], [140, -420, 60, 7]];
/** The dolines [x, z, r]: the same number on each half, each half from its own seed, on rising ground off the points and roads. */
const raw = (x, z) => 62 * smoothstep(-290, -540, x + 25 * Math.sin(z * 0.006)) ** 1.2 + 46 * smoothstep(330, 545, x + 22 * Math.sin(z * 0.007 + 1.2)) ** 1.1;
const DOLINES: number[][] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 1809_71 : 1809_79);
  for (let i = 0, n = 0; i < 4000 && n < 9; i++) {
    const x = (r() * 2 - 1) * 480, z = s * (80 + r() * 440), rad = 14 + r() * 10;
    if (raw(x, z) < 6 || POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 70) || roadExact(x, z) < rad + 12 || DOLINES.some(([dx, dz, dr]) => Math.hypot(dx - x, dz - z) < dr + rad + 30)) continue;
    DOLINES.push([x, z, rad]); n++;
  }
}
/** The benches the points stand on: [x, z, r, height] (each pair as high). */
const SHELVES = [[P.B.x, P.B.z, 34, 27], [P.J.x, P.J.z, 34, 27], [P.E.x, P.E.z, 34, 17], [P.G.x, P.G.z, 34, 17],
  [P.C.x, P.C.z, 40, 7], [P.I.x, P.I.z, 40, 7], [P.D.x, P.D.z, 30, 5.5], [P.H.x, P.H.z, 30, 5.5], [BASE_X, BASE_Z, 34, 7], [BASE_X, -BASE_Z, 34, 7]];

/** The ground (no rivers): the valley floor, the Velebit, the eastern knolls, karst ribs and hollows, the benches. */
function groundExact(x, z) {
  let h = 6 + fbm(noise, x * 0.004, z * 0.004, 3) * 1.6 + fbm(noise, x * 0.02 + 5, z * 0.02, 2) * 0.3;
  let rise = raw(x, z);
  for (const [kx, kz, kr, kh] of KNOLLS) { const d = Math.hypot(x - kx, z - kz); if (d < kr) rise += kh * smoothstep(kr, 0, d) ** 1.3; }
  for (const [sx, sz, sr, sh] of SHELVES) { const d = Math.hypot(x - sx, z - sz); if (d < sr * 3) rise += Math.max(0, sh - 6) * smoothstep(sr * 3, sr * 0.6, d) ** 1.2; }
  rise *= 0.15 + 0.85 * smoothstep(25, 120, Math.abs(z - likaZ(x)));                                // (the hills open out where the Lika runs through them)
  h += rise + ridged(noise, x * 0.012 + 3, z * 0.012, 3) * Math.min(9, rise * 0.25);                 // limestone ribs where the ground rises
  for (const [dx, dz, dr] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const d = Math.hypot(x - dx, z - dz); if (d < dr) h -= 5 * smoothstep(dr, 0, d) ** 1.4; }
  for (const [sx, sz, sr, sh] of SHELVES) { const d = Math.hypot(x - sx, z - sz); if (d < sr + 20) h += (sh - h) * smoothstep(sr + 20, sr, d); }
  const rd = roadExact(x, z);
  if (rd < 10) h += (Math.min(h, 6 + rise * 0.96) - h) * smoothstep(10, 4, rd) * 0.7;                // (the roads keep off the ribs)
  return h;
}
const ground = gridCacheSmooth(groundExact, EXT, 4);
const height = (x, z) => river.carve(x, z, Math.max(3, ground(x, z)));

/** The woods (0..1): beech and black pine up the Velebit and on the knolls, copses on the floor, willows by the water. */
const woods = gridCache((x, z) => {
  const rise = ground(x, z) - 7;
  let k = smoothstep(0.55, 0.7, fbm(noise, x * 0.007 - 20, z * 0.007 + 3, 3)) * 0.5;
  k = Math.max(k, smoothstep(10, 30, rise) * (0.45 + 0.4 * smoothstep(0.1, 0.4, fbm(noise, x * 0.012, z * 0.012 - 8, 2))));
  for (const p of POINTS) k = Math.min(k, smoothstep(34, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadD(x, z)));
}, EXT, 4);
const inTown = (x, z) => Math.hypot(x - P.F.x, (z - P.F.z) * 1.2) < 95;

const layout = [{ unit: 'rifles', x: BASE_X, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'gospic',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Marmont’s Army of Dalmatia against Stojčević’s Grenzer; the Austrians have no units yet: the Russians stand in)
  name: 'Gospić',
  description: 'The Lika valley, 21–22 May 1809: Marmont’s French force the Lika and the Jadova against Stojčević’s Grenzer round the little garrison town of Gospić, between the Velebit’s karst foothills and the knolls of the east.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [], // (1806 has no aircraft)
  conditions: { time: 'day', weather: 'clear' }, // (a bright May day in the Lika, the Velebit still white on top)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180905,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1809_21, cell: 60, weights: [0.3, 0.25, 0.25, 0.2] }), // (May: hay meadows and pasture, oats and potatoes sprouting)

  theme: {
    // a bright May day in the Lika valley: fresh green floor, grey karst, the Velebit’s snow high in the west
    fogColor: 0xc8d2d8,
    fogDensity: 0.001,
    skyTop: 0x4a7cc0,
    skyHorizon: 0xd8e2ea,
    skyBottom: 0x7e8a70,
    sunColor: 0xfff2dc,
    sunIntensity: 1.9,
    sunDisk: 0.45,
    clouds: 0.4,
    cloudLight: 0xf6f6f2,
    cloudDark: 0x9aa4b0,
    sunDir: [0.4, 0.6, 0.35],
    hemiSky: 0xc8d6e6,
    hemiGround: 0x5a6040,
    hemiIntensity: 1.3,
    rimColor: 0xe2e6ec,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5e7a3a',
      grassAlt: '#567034',
      dryGrass: '#8a8a52',
      dirt: '#6a5a44',
      rock: '#9a978c',
      strip: '#54483a',
      pasture: '#62803c',
      ploughed: '#6e5640',
      stubble: '#8a9050',
      meadow: '#68863e',
      farmX: [0, 1],
      farmZ: [0, 1],
      roads: [], // (the roads are this map’s own: ROADS)
      roadZ: 0,
      surface(x, z, y) {
        if (roadD(x, z) < 3.2) return [0xb2a88e, 0.85];                                              // the white karst roads
        if (inTown(x, z) && !nearWater(x, z, 3)) return [0x8e8676, 0.55];                            // the town’s yards and lanes
        const rise = y - 7, n = fbm(noise, x * 0.035 + 7, z * 0.035, 2);
        if (rise > 8 && n > 0.15) return [n > 0.35 ? 0xb0aca0 : 0x989488, Math.min(0.75, (n - 0.05) * 2)]; // bare limestone
        return null;
      },
    },
  },

  bases: { nato: { x: BASE_X, z: BASE_Z, entries: [-200, 0, 200] }, pact: { x: BASE_X, z: -BASE_Z, entries: [-200, 0, 200] } },
  maxStacks: 26,
  cameraStart: { nato: { x: BASE_X, z: 360 }, pact: { x: BASE_X, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x, z) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const taken: number[][] = [];
    const free = (x, z, r = 14) => roadD(x, z) > 8 && !nearWater(x, z, 8) && steepAt(x, z) < 0.3 && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < r);

    // ---- Gospić: the church and the regiment’s house on the north bank, the town’s houses along the road on both banks
    props.rand = mulberry32(1809_2101);
    props.church({ x: -34, z: 60, yaw: 0 });                                                       // (the church of the Annunciation)
    props.townHouse({ x: 36, z: 58, yaw: 0, width: 24, depth: 11, storeys: 2, name: 'the Lika regiment’s house', damaged: 0 });
    props.wall({ x: 36, z: 72, yaw: 0, length: 30, height: 2, thickness: 0.8 });
    taken.push([-34, 60], [36, 58]);
    const rr = mulberry32(1809_2102);
    for (let i = 0, n = 0; i < 1200 && n < 44; i++) {
      const x = (rr() * 2 - 1) * 100, z = P.F.z + (rr() * 2 - 1) * 90;
      if (!inTown(x, z) || !free(x, z, 13) || Math.abs(x) < 9) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      const across = Math.abs(x) < 30 ? Math.PI / 2 : 0;
      props.townHouse({ x, z, yaw: across + (rr() - 0.5) * 0.12, width: 7 + rr() * 3, depth: 8 + rr() * 2, storeys: rr() < 0.35 ? 2 : 1, damaged: 0 });
    }

    // ---- the mills at the tributary bridges; the chapels on the knolls inside their walls
    props.rand = mulberry32(1809_2103);
    for (const [q, s] of [[P.D, 1], [P.H, -1]] as const) {
      props.townHouse({ x: q.x + 20 * s, z: q.z - 16 * s, yaw: 0.1, width: 12, depth: 8, storeys: 2, name: 'the mill', damaged: 0 });
      props.house({ x: q.x - 26 * s, z: q.z + 18 * s, yaw: Math.PI / 2, width: 9, depth: 7 });
      taken.push([q.x + 20 * s, q.z - 16 * s], [q.x - 26 * s, q.z + 18 * s]);
    }
    for (const [q, s] of [[P.B, 1], [P.J, -1]] as const) {
      const cx = q.x + 22 * s, cz = q.z + 18 * s;
      props.church({ x: cx, z: cz, yaw: s > 0 ? 0 : Math.PI });
      for (const [dx, dz, yaw, length] of [[0, -18, 0, 30], [0, 18, 0, 30], [-15, 0, Math.PI / 2, 36], [15, 0, Math.PI / 2, 36]] as const) props.wall({ x: cx + dx, z: cz + dz, yaw, length, height: 1.6, thickness: 0.9 });
      taken.push([cx, cz]);
    }
    // ---- the villages: farmsteads round the lanes, a church at Barlete, Kaniža and Smiljan
    for (const [q, seed] of [[P.C, 1809_2104], [P.I, 1809_2105], [P.E, 1809_2106], [P.G, 1809_2107]] as const) {
      props.rand = mulberry32(seed);
      const cx = q.x - 30 * Math.sign(q.x || 1), cz = q.z + 12 * Math.sign(q.z);
      if ('CIE'.includes(q.id) && free(cx, cz, 10)) { props.church({ x: cx, z: cz, yaw: Math.PI / 2 }); taken.push([cx, cz]); }
      const r = mulberry32(seed + 7);
      for (let i = 0, n = 0; i < 90 && n < 8; i++) {
        const a = r() * Math.PI * 2, d = 26 + r() * 42, x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d;
        if (!free(x, z, 14)) continue;
        taken.push([x, z]); n++;
        props.rand = mulberry32(Math.floor(r() * 1e9));
        props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r() * 3, depth: 6 + r() * 2, height: 3.4 });
      }
    }
    for (const p of POINTS) if ('BJ'.includes(p.id)) buildVillage(props, p, 18091 + Math.round(p.x * 3 + p.z * 7));

    // ---- the dry-stone walls on the rising karst (the same number on each half), a little wall round each doline
    for (const s of [1, -1]) {
      const r = mulberry32(s > 0 ? 1809_2191 : 1809_2197);
      for (let i = 0, n = 0; i < 3000 && n < 40; i++) {
        const x = (r() * 2 - 1) * 480, z = s * (40 + r() * 500), yaw = Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.3;
        if (raw(x, z) < 4 || !free(x, z, 6) || nearPoint(x, z, 26) || Math.hypot(x - BASE_X, z - BASE_Z * s) < 60) continue;
        n++;
        props.wall({ x, z, yaw, length: 14 + r() * 14, height: 1.1, thickness: 0.8 });
      }
    }
    for (const [dx, dz, dr] of DOLINES) if (free(dx, dz + dr * 0.5, 4)) props.lowWall({ x: dx, z: dz + dr * 0.5, yaw: 0.3, length: dr * 0.9, height: 0.9 });
    // ---- farms and hay across the floor, boulders on the karst
    const r = mulberry32(1809_2109);
    const kinds = ['farm', 'hay', 'fieldwall', 'hay'];
    for (let i = 0, n = 0; i < 6000 && n < 48; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 520;
      if (!free(x, z, 48) || nearPoint(x, z, 55) || nearWater(x, z, 22) || Math.hypot(x - BASE_X, z - BASE_Z) < 70 || Math.hypot(x - BASE_X, z + BASE_Z) < 70 || inTown(x, z) || woods(x, z) > 0.3) continue;
      taken.push([x, z]); n++;
      buildSite(props, { kind: kinds[n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    for (let i = 0; i < 360; i++) {
      const x = (r() * 2 - 1) * 490, z = (r() * 2 - 1) * 550;
      if (raw(x, z) < 8 || nearPoint(x, z, 30) || roadD(x, z) < 8) continue;
      props.boulder({ x, z, radius: 0.9 + r() * 1.6 });
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: BASE_X, z: BASE_Z, r: 30 }, { x: BASE_X, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 14 })), { test: (x, z) => nearWater(x, z, 1.5) || roadD(x, z) < 5 || inTown(x, z) }];
    // beech, black pine and spruce up the karst; willows and alders by the water
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 4200, broadleaf: 0.6, autumn: 0.05, maxY: 120,
      forest: (x, z) => (nearWater(x, z, 8) ? 0.45 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
