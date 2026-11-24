// Pressburg, June 1809: after Aspern the Archduke’s army lay north of the Danube, and the Austrians held the bridgehead
// at Engerau on the right bank opposite Pressburg — earthworks round the village and the landing of the bridge — as a
// door into the French flank. Davout’s corps closed up from Kittsee and attacked it through the first days of June; the
// French gunners on the right bank shelled the town, the castle on its rock looked down on it all, and the Austrians
// clung on until the armistice after Wagram.
// On the map (1.0 × 1.12 km): the French come up the Kittsee road (south, +z), the Austrians hold the road to Tyrnau
// (north, −z). The Danube runs east across the middle, broad and fast, in its main stream and side arms round wooded
// islands. On the left bank Pressburg: the castle — the square block with its four corner towers — on its rock above the
// town, St Martin’s under it, the old town inside its walls round the Hauptplatz, the vineyards of the Little Carpathians
// climbing behind toward the north-west corner. On the right bank the flat floodplain: Engerau and its bridgehead
// earthworks by the landing, the Au’s willow and poplar woods, the Hundsheim hills rising behind Wolfsthal in the
// south-west. The bridge of boats in the middle, the flying bridge upstream onto the Au island, the Pötschen ferry
// downstream onto the Sandinsel; a bridge and a ford over each side arm.
// Fair, not mirrored: the Danube runs between the sides and every crossing has its twin as far from the other base —
// the flying bridge and the ferry, each landing on an island behind a side arm (the Au on the French side, the Sandinsel
// on the Austrian), the bridge of boats in the middle owned by neither. The castle rock is traded for the bridgehead’s
// redoubts and the Hundsheim heights, the old town for Engerau and its earthworks, Karlsdorf for Wolfsthal, the
// Blumenthal suburb for Kittsee’s Karlburg, each as far from the nearer base as its counterpart (tools/map_fairness.py).
// The left bank climbs to the Carpathian foothills in the north-west, the right bank to its hills in the south-west, so
// the ground is not a mirror. 1806 only (`epochs`).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import { pontoons } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 480;
const noise = createNoise2D(1809_0603);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// the Danube’s main stream, flowing east (+x)
const danZ = (x) => 10 * Math.sin(x * 0.004 + 0.6) + 6 * Math.sin(x * 0.011 + 1.9) - 4;
// the side arms: round the Au island on the right bank (west), round the Sandinsel on the left bank (east)
const AU = [[-500, 18, 6], [-430, 60, 10], [-330, 84, 12], [-220, 80, 11], [-150, 56, 9], [-110, 18, 6]].map(([x, dz, w]) => [x, danZ(x) + dz, w]);
const SAND = [[110, -18, 6], [170, -60, 10], [270, -86, 12], [370, -78, 11], [440, -54, 9], [500, -16, 6]].map(([x, dz, w]) => [x, danZ(x) + dz, w]);
const river = createRiver({
  path: danZ,
  paths: [danZ, AU, SAND],
  halfWidth: 24, level: 0, depth: 3.2, valley: 64,
  crossings: [
    { name: 'Bridge of boats', x: 0, kind: 'bridge', width: 7, pontoon: true },
    { name: 'Flying bridge', x: -300, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Pötschen ferry', x: 320, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Au bridge', x: -260, z: danZ(-260) + 84, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Au ford', x: -430, z: danZ(-430) + 60, kind: 'ford', width: 12, channel: 1 },
    { name: 'Sandinsel bridge', x: 250, z: danZ(250) - 84, kind: 'bridge', width: 6, channel: 2 },
    { name: 'Sandinsel ford', x: 420, z: danZ(420) - 60, kind: 'ford', width: 12, channel: 2 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Kittsee road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Wolfsthal', x: -350, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Engerau bridgehead', x: 30, z: 175, owner: null, sector: 'centre', radius: 30 },
  { id: 'D', name: 'Karlburg', x: 330, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Au island', x: -270, z: Math.round(danZ(-270) + 42), owner: null, sector: 'west' },
  { id: 'F', name: 'Bridge of boats', x: 0, z: Math.round(danZ(0)), owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Sandinsel', x: 290, z: Math.round(danZ(290) - 44), owner: null, sector: 'east' },
  { id: 'H', name: 'Karlsdorf', x: -320, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Pressburg castle', x: -80, z: -200, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Hauptplatz', x: 170, z: -215, owner: null, sector: 'east', radius: 28 },
  { id: 'K', name: 'Tyrnau road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const CASTLE = { x: P.I.x, z: P.I.z };
/** The old town inside its walls, east of the castle rock. */
const TOWN = { x: 150, z: -205, rx: 120, rz: 72 };
const townQ = (x, z) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);
/** The bridgehead: a ring of redoubts round Engerau and the landing. */
const HEAD = { x: P.C.x - 10, z: P.C.z - 30, R: 95 };
const ENGERAU = { x: 120, z: 190 };

// the roads: Kittsee road to the landing, the Tyrnau road down to the Hauptplatz and the bridge; the Hainburg and the
// Theben roads along either bank, the Wieselburg road east
const ROADS = [
  [[0, 560], [0, 380], [30, 175], [0, 30]], [[0, -30], [60, -110], [170, -215], [80, -330], [0, -470], [0, -560]],
  [[30, 175], [-350, 300], [-500, 330]], [[30, 175], [120, 190], [330, 290], [500, 330]],
  [[60, -110], [-150, -150], [-320, -290], [-500, -330]], [[170, -215], [420, -260], [500, -280]],
];
const roadD = (x, z) => {
  let best = 1e9;
  for (const R of ROADS) for (let i = 0; i < R.length - 1; i++) {
    const [ax, az] = R[i], [bx, bz] = R[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
};

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Au’s floodplain woods on both banks, the Hundsheim hills’ oaks, the Carpathian beechwood above the vineyards
const WOODS = [[-420, 420, 90, 110, 0.2], [380, -440, 110, 80, -0.2], [-430, -440, 80, 100, 0.3], [300, 420, 90, 50, 0]];
const woods = (x, z) => {
  const dz = Math.abs(z - danZ(x));
  let k = smoothstep(0.6, 0.74, fbm(noise, x * 0.006 + 5, z * 0.006 - 9, 3)) * 0.7;
  if (dz < 150 && fbm(noise, x * 0.016, z * 0.016 + 40, 2) > -0.15) k = Math.max(k, 0.8);  // the Au: willow, poplar and alder on the islands and the banks
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(p.id === 'C' || p.id === 'I' ? 60 : 30, p.id === 'C' || p.id === 'I' ? 85 : 54, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(1.1, 1.35, townQ(x, z)), smoothstep(6, 14, roadD(x, z)), smoothstep(40, 70, Math.hypot(x - ENGERAU.x, z - ENGERAU.z)));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0026, z * 0.0026, 3) * 2.2 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.3 + 3;
  // the left bank: the castle rock, the town below it, the Little Carpathians’ vineyard slopes rising north-west
  h += smoothstep(-120, -420, z) * (4 + 10 * smoothstep(250, -350, x));
  const rock = Math.hypot((x - CASTLE.x) / 70, (z - CASTLE.z) / 56);
  h += 12 * smoothstep(1.75, 0.6, rock);                                                        // (a flat top for the castle, slopes a column can climb)
  // the right bank: the flat floodplain, the Hundsheim hills behind Wolfsthal in the south-west
  h += smoothstep(200, 480, z) * 4 + hill(x, z, -420, 380, 200, 14.5) + hill(x, z, -200, 470, 120, 4);
  h += (4 - h) * smoothstep(1.15, 0.9, townQ(x, z)) * 0.8;                                      // the old town, level
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 14;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'EFGIJ'.includes(p.id)) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.5;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];
const STONE = 0xd8d0bc, ROOF = 0x7a4a36;

export default {
  id: 'pressburg-1809',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Davout against the Austrian bridgehead garrison; no Austrian roster yet: Russia fights for her)
  name: 'Pressburg 1809',
  description: 'The Danube at Pressburg, June 1809: Davout’s French against the Austrian bridgehead at Engerau on the right bank, the castle on its rock above the town on the left, the bridge of boats, the flying bridge and the wooded Danube islands.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'clear' }, // (early June: hot, bright, the river high with the snowmelt)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 18090603,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1809_0603, cell: 70, weights: [0.38, 0.12, 0.3, 0.2] }), // June: green wheat, meadows, vines

  theme: {
    // a hot June day on the Danube, haze over the floodplain
    fogColor: 0xbcc4c0,
    fogDensity: 0.0013,
    skyTop: 0x5a86b8,
    skyHorizon: 0xccd6da,
    skyBottom: 0x7c8676,
    sunColor: 0xfff0d0,
    sunIntensity: 2.1,
    sunDisk: 0.6,
    clouds: 0.3,
    cloudLight: 0xf2f2f0,
    cloudDark: 0x9aa4ae,
    sunDir: [0.35, 0.65, 0.6],
    hemiSky: 0xc8d6e2,
    hemiGround: 0x4e5434,
    hemiIntensity: 1.25,
    rimColor: 0xd4dce2,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a7034',
      grassAlt: '#4e6430',
      dryGrass: '#8c8650',
      dirt: '#5c4c38',
      rock: '#7a7468',
      strip: '#4c4030',
      pasture: '#5e7238',
      ploughed: '#56462f',
      stubble: '#9a9458',
      meadow: '#687c3c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const t = townQ(x, z);
        if (t < 0.97) return [0x8c8272, 0.45];                                                    // the old town’s streets
        const rk = Math.hypot((x - CASTLE.x) / 70, (z - CASTLE.z) / 56);
        if (rk < 1.1) return [0x8a8070, smoothstep(1.1, 0.8, rk) * 0.5];                          // the castle rock’s bare top
        const rd = roadD(x, z);
        if (rd < 5) return [0x857a66, smoothstep(5, 3, rd) * 0.7];                                // the roads
        if (Math.abs(Math.hypot(x - HEAD.x, z - HEAD.z) - HEAD.R) < 10) return [0x6a5c40, 0.35];   // the bridgehead’s dug earth
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), qq = new THREE.Quaternion();
    const solid = (key, geo, x, y, z, sx, sy, sz, color) => { m4.compose(v.set(x, y, z), qq.identity(), new THREE.Vector3(sx, sy, sz)); props.push(key, geo, m4, color); };
    const seg = (a, b, height = 3, thickness = 2) => props.wall({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, yaw: -Math.atan2(b[1] - a[1], b[0] - a[0]), length: Math.hypot(b[0] - a[0], b[1] - a[1]) + 1, height, thickness });
    const taken: number[][] = [];

    // ---- the castle: the square block round its court, the four corner towers with their caps, the curtain round the rock top
    {
      const { x, z } = CASTLE, g = terrain.heightAt(x, z) - 0.5, W = 34;
      // (the four ranges; the gate passages through the east and the south range, toward the town and the river)
      for (const [dx, dz, yaw, len] of [[0, -W / 2, 0, W], [-W / 2, 0, Math.PI / 2, W], [-11, W / 2, 0, 12], [11, W / 2, 0, 12], [W / 2, -11, Math.PI / 2, 12], [W / 2, 11, Math.PI / 2, 12]] as const) {
        props.box('stone', x + dx, g + 7.5, z + dz, len, 15, 6, yaw, STONE);
        props.box('stone', x + dx, g + 16, z + dz, len + 0.4, 2, 4, yaw, ROOF);
        cover.addBox({ x: x + dx, z: z + dz, yaw, length: len, thickness: 6, height: 15 });
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        props.box('stone', x + sx * W / 2, g + 10, z + sz * W / 2, 8, 20, 8, 0, STONE);
        props.box('stone', x + sx * W / 2, g + 21, z + sz * W / 2, 8.4, 2, 8.4, 0, ROOF);
        solid('plain', new THREE.ConeGeometry(1, 1, 4), x + sx * W / 2, g + 24, z + sz * W / 2, 5.6, 4.5, 5.6, ROOF);
        cover.addBox({ x: x + sx * W / 2, z: z + sz * W / 2, yaw: 0, length: 8, thickness: 8, height: 20 });
      }
      // the outer curtain round the rock’s top, gates toward the town and the Theben road
      const N = 18;
      for (let i = 0; i < N; i++) {
        if (i % 6 === 0 || i % 6 === 3) continue;
        const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2;
        seg([x + Math.cos(a) * 58, z + Math.sin(a) * 44], [x + Math.cos(b) * 58, z + Math.sin(b) * 44], 3.2, 2.2);
      }
      taken.push([x, z]);
    }
    // ---- St Martin’s under the rock; the old town inside its walls round the Hauptplatz; the Michael gate tower
    props.rand = mulberry32(1809_06031);
    props.church({ x: 30, z: -170, yaw: Math.PI / 2 });
    { const g = terrain.heightAt(14, -170); props.box('stone', 14, g + 15, -170, 7, 30, 7, 0, STONE); solid('plain', new THREE.ConeGeometry(1, 1, 8), 14, g + 33, -170, 4, 7, 4, 0x6a7a5a); }
    { const g = terrain.heightAt(180, -282); props.box('stone', 180, g + 12, -282, 6, 24, 6, 0, STONE); solid('plain', new THREE.ConeGeometry(1, 1, 8), 180, g + 26, -282, 3.6, 5, 3.6, 0x5e8a72); }
    taken.push([30, -170], [14, -170], [180, -282]);
    {
      const N = 30, at = (a) => [TOWN.x + Math.cos(a) * TOWN.rx * 1.02, TOWN.z + Math.sin(a) * TOWN.rz * 1.02];
      const gate = (x, z) => roadD(x, z) < 14;
      for (let i = 0; i < N; i++) {
        if (i % 5 === 2) continue;
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, A = at(a0), B = at(a1);
        if (gate((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)) continue;
        seg(A, B, 3.4, 1.8);
      }
    }
    const rr = mulberry32(1809_06032);
    for (let i = 0, k = 0; i < 1200 && k < 70; i++) {
      const x = TOWN.x + (rr() * 2 - 1) * TOWN.rx, z = TOWN.z + (rr() * 2 - 1) * TOWN.rz;
      if (townQ(x, z) > 0.86 || roadD(x, z) < 8 || nearPoint(x, z, 32) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
      taken.push([x, z]); k++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 3 : 2, damaged: 0 });
    }
    // the suburbs along the river below the town and the castle: the Fischer- and the Zuckermandl quarters
    for (let i = 0, k = 0; i < 400 && k < 18; i++) {
      const x = -200 + rr() * 460, z = danZ(x) - 48 - rr() * 40;
      if (wet(x, z, 8) || roadD(x, z) < 8 || nearPoint(x, z, 34) || townQ(x, z) < 1.15 || Math.hypot((x - CASTLE.x) / 70, (z - CASTLE.z) / 56) < 1.3 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
      taken.push([x, z]); k++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.house({ x, z, yaw: 0, width: 8 + rr() * 2, depth: 6 });
    }
    // ---- the bridgehead: redoubts on a ring round Engerau and the landing, joined by a broken line of earthworks
    props.rand = mulberry32(1809_06033);
    {
      const ring = (a, k = 1) => [HEAD.x + Math.cos(a) * HEAD.R * k, HEAD.z + Math.sin(a) * HEAD.R * k];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (0.02 + 0.96 * i / 10);                                           // (the half-ring on the landward side)
        const [rx, rz] = ring(a);
        if (i % 2 === 0) {                                                                    // a redoubt: a lunette open to the rear
          const L = ring(a - 0.09, 0.96), R = ring(a + 0.09, 0.96), T = ring(a, 1.1);
          seg(L, T, 2.2, 2.6); seg(T, R, 2.2, 2.6);
          if (i % 4 === 0) props.sandbagRing({ x: rx, z: rz, radius: 5, toward: 1 });
        } else if (roadD(rx, rz) > 12) seg(ring(a - 0.11), ring(a + 0.11), 1.8, 2.4);          // the line between, open at the roads
      }
    }
    // Engerau: the church and the village by the landing
    props.church({ x: ENGERAU.x + 20, z: ENGERAU.z + 24, yaw: 0 });
    buildVillage(props, { x: ENGERAU.x, z: ENGERAU.z }, 1809_0604);
    taken.push([ENGERAU.x + 20, ENGERAU.z + 24]);
    // ---- the villages; Wolfsthal’s and Karlsdorf’s churches; the Karlburg manor; the boatmen’s huts on the islands
    for (const p of POINTS) if ('BDH'.includes(p.id)) buildVillage(props, p, 18096 + Math.round(p.x * 3 + p.z * 7));
    props.church({ x: P.B.x + 30, z: P.B.z + 22, yaw: 0 });
    props.church({ x: P.H.x - 26, z: P.H.z - 24, yaw: Math.PI });
    props.hall({ x: P.D.x + 40, z: P.D.z + 26, yaw: 0, width: 26, depth: 12, height: 8, color: 0xd8ccb0, roof: ROOF, door: 4, name: 'Karlburg manor' });
    for (const p of [P.E, P.G]) for (const s of [-1, 1]) props.house({ x: p.x + s * 26, z: p.z + s * 6, yaw: 0, width: 6, depth: 5 });
    // the vineyard terraces on the Carpathian slopes: low walls along the contour
    for (let i = 0; i < 26; i++) {
      const x = -460 + (i % 6) * 60 + rr() * 20, z = -330 - Math.floor(i / 6) * 38;
      if (nearPoint(x, z, 40) || roadD(x, z) < 12 || woods(x, z) > 0.3) continue;
      props.lowWall({ x, z, yaw: 0, length: 34 });
    }
    // the French batteries on the right bank, the Austrian batteries along the left
    for (const [x, z] of [[-150, 260], [200, 300], [-200, -110], [250, -150]] as const) props.sandbagRing({ x, z, radius: 6, toward: -Math.sign(z) });

    // ---- farms, field walls and hay
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 64 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 56 * 56)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || Math.abs(z - danZ(x)) < 110 || townQ(x, z) < 1.3
        || roadD(x, z) < 14 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 90 || Math.abs(Math.hypot(x - HEAD.x, z - HEAD.z) - HEAD.R) < 30 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 30)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd8d4c4]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z ?? danZ(c.x), r: 30 })),
      { test: (x, z) => wet(x, z, 1.5) || townQ(x, z) < 1.12 || roadD(x, z) < 5 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 62 || Math.abs(Math.hypot(x - HEAD.x, z - HEAD.z) - HEAD.R) < 12 }];
    // willow, poplar and alder in the Au, oak on the hills, beech on the Carpathian slopes
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 5200, broadleaf: 0.9, autumn: 0, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1200, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.8, fields: this.fields });

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
