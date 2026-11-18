// Bobruisk, June 1944 — Operation Bagration (1945 epoch; the big field, 1.0 × 1.12 km). The Pripet-marsh country of
// Belarus in summer: wide bogs and wet meadows where vehicles bog down and men wade (map.soft, shallow pools), dense
// pine and birch on the islands of dry ground, and only a few raised causeways through it all. In the middle the
// Berezina and its old arm close round the island Bobruisk stands on — wooden houses, two churches, the station and
// the rail line on its embankment — with a bridge over each arm and fords out on the flanks. Hamlets of log houses
// sit on the dry islands; a log-corduroy road the sappers laid crosses the swamp on each side. The Red Army comes
// from the south (+z), the Wehrmacht holds from the north; point-mirrored like the other land maps, so neither side
// gets the better ground — only the names differ.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE = 330;     // the flank causeways and fords
const CH = 78;        // the two arms of the river, ~78 m either side of the middle
const HW = 13;        // the arms' half-width
const RAIL_Z = 42;    // the rail embankment on the island (z = -42 west of the middle, +42 east)
const noise = createNoise2D(1944);
const lerp = (a, b, k) => a + (b - a) * k;

// ---- the river: the Berezina (north arm) and its old arm (south) — a point-mirrored pair, the town island between
const wob = (x) => 10 * Math.sin(x * 0.0065) + 5 * Math.sin(x * 0.017 + 1.3);
const chanN = (x) => -CH + wob(x);
const chanS = (x) => CH - wob(-x);
const river = createRiver({
  path: chanN,
  paths: [chanN, chanS],
  halfWidth: HW,
  level: 0,
  depth: 2.4,
  valley: 32,
  crossings: [
    { name: 'Berezina bridge', x: 0, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Old-arm bridge', x: 0, kind: 'bridge', width: 9, channel: 1 },
    { name: 'Shatkovo ford', x: -SIDE, kind: 'ford', width: 14, channel: 1 },
    { name: 'Ozatichi ford', x: -SIDE, kind: 'ford', width: 14, channel: 0 },
    { name: 'Kozulichi ford', x: SIDE, kind: 'ford', width: 14, channel: 0 },
    { name: 'Titovka ford', x: SIDE, kind: 'ford', width: 14, channel: 1 },
  ],
});
/** Between the two arms (> 0: metres inside the island from the nearer arm's middle). */
const island = (x, z) => Math.min(z - chanN(x), chanS(x) - z);

// ---- the causeways: three north–south (straight over the river, winding out in the swamp), the island road, and
// the laterals on each side (one of them the sappers' log-corduroy road)
const NS = [-SIDE, 0, SIDE];
const nsX = (rx, z) => rx + (rx ? 14 : 9) * Math.sin(z * 0.011) * smoothstep(120, 200, Math.abs(z));
const islZ = (x) => 10 * Math.sin(x * 0.012);
const LAT = [
  { a: [-SIDE, 330], b: [0, 250], logs: true },   // the corduroy road: Glusha – Titovka
  { a: [0, 250], b: [SIDE, 210], logs: false },   // gravel causeway: Titovka – Shatkovo
];
const SEGS = LAT.flatMap((s) => [s, { a: [-s.a[0], -s.a[1]], b: [-s.b[0], -s.b[1]], logs: s.logs }]);
function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
/** Metres from the nearest causeway's middle. */
function roadDist(x, z) {
  let d = Infinity;
  for (const rx of NS) d = Math.min(d, Math.abs(x - nsX(rx, z)));
  if (Math.abs(z) < 120) d = Math.min(d, Math.abs(z - islZ(x)));
  for (const s of SEGS) d = Math.min(d, segDist(x, z, s.a, s.b));
  return d;
}
const corduroy = (x, z) => SEGS.some((s) => s.logs && segDist(x, z, s.a, s.b) < 3.4);
/** Metres from the rail line's middle. */
const railDist = (x, z) => (x < -18 && x > -560 ? Math.abs(z + RAIL_Z) : x > 18 && x < 560 ? Math.abs(z - RAIL_Z) : Infinity);

// ---- the control points (our half, mirrored: G mirrors E … K mirrors A)
const HALF: [string, string, number, number, string][] = [
  ['A', 'Parichi road', 0, 470, 'centre'],
  ['B', 'Glusha', -SIDE, 330, 'west'],
  ['C', 'Titovka', 0, 250, 'centre'],
  ['D', 'Shatkovo', SIDE, 210, 'east'],
  ['E', 'Mikhalevo', -SIDE, -18, 'west'],
];
const MIRROR_NAMES = { E: ['G', 'Kozulichi'], D: ['H', 'Ozatichi'], C: ['I', 'Kartsevichi'], B: ['J', 'Sychkovo'], A: ['K', 'Osipovichi road'] };
const flipSector = (s) => (s === 'west' ? 'east' : s === 'east' ? 'west' : 'centre');
const points: ControlPointDef[] = [
  ...HALF.map(([id, name, x, z, sector]) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : null, sector } as ControlPointDef)),
  { id: 'F', name: 'Bobruisk', x: 0, z: 0, owner: null, sector: 'centre', radius: 30 },
  ...HALF.map(([id, , x, z, sector]) => ({ id: MIRROR_NAMES[id][0], name: MIRROR_NAMES[id][1], x: -x, z: -z, owner: id === 'A' ? 'pact' : null, sector: flipSector(sector) } as ControlPointDef)),
].sort((a, b) => a.id.localeCompare(b.id)) as ControlPointDef[];

// ---- dry ground: islands round the hamlets and the bases, the town island, the wooded rises (point-symmetric noise), the edges
const AIR = { x: -170, z: 452 }; // the Red Army's field airstrip (its tower; the runway 55 m north of it — systems/Airfields.js), mirrored for the Luftwaffe
const ISLANDS =[...points.map((p) => [p.x, p.z, 52]), [0, BASE_Z, 75], [0, -BASE_Z, 75]];
const woodsN = (x, z) => fbm(noise, x * 0.0042 + 11, z * 0.0042 - 7, 3);
const woodsK = (x, z) => smoothstep(0.17, 0.3, Math.max(woodsN(x, z), woodsN(-x, -z)));
const edgeK = (x, z) => Math.max(smoothstep(440, 500, Math.abs(x)), smoothstep(530, 580, Math.abs(z)));
function dryK(x, z) {
  let k = Math.max(woodsK(x, z), edgeK(x, z));
  for (const [ix, iz, r] of ISLANDS) {
    const d = Math.hypot(x - ix, z - iz);
    if (d < r + 30) k = Math.max(k, smoothstep(r + 30, r, d));
  }
  const i = island(x, z);
  if (i > 0) k = Math.max(k, smoothstep(HW, HW + 14, i));
  for (const m of [1, -1]) k = Math.max(k, smoothstep(170, 145, Math.abs(x * m - AIR.x)) * smoothstep(80, 60, Math.abs(z * m - AIR.z + 25))); // the airstrips' meadows
  return k;
}

// ---- the bog's pools: shallow open water among the reeds (wading depth), our half then mirrored
const POOLS: { x: number; z: number; rx: number; rz: number; rot: number; s: number }[] = [];
const poolQ1 = (L, x, z) => {
  const c = Math.cos(L.rot), s = Math.sin(L.rot), dx = x - L.x, dz = z - L.z;
  const lx = (dx * c - dz * s) / L.rx, lz = (dx * s + dz * c) / L.rz, a = Math.atan2(lz, lx);
  return Math.hypot(lx, lz) * (1 + 0.12 * Math.sin(2 * a + L.s) + 0.07 * Math.sin(4 * a + 2 * L.s)); // (even harmonics: the mirror is the same shape)
};
/** < 1 inside a pool, 1 at its edge. */
const poolQ = (x, z) => {
  let q = Infinity;
  for (const L of POOLS) if (Math.abs(x - L.x) < 70 && Math.abs(z - L.z) < 70) q = Math.min(q, poolQ1(L, x, z));
  return q;
};
{
  const r = mulberry32(1944_06);
  const half: typeof POOLS = [];
  for (let i = 0; half.length < 30 && i < 4000; i++) {
    const x = (r() * 2 - 1) * 450, z = 120 + r() * 410, rx = 12 + r() * 24, rz = 8 + r() * 14, rot = r() * 3, s = r() * 6;
    const R = Math.max(rx, rz) * 1.2;
    if (dryK(x, z) > 0.05 || dryK(x + rx, z) > 0.05 || dryK(x - rx, z) > 0.05 || dryK(x, z + rx) > 0.05 || dryK(x, z - rx) > 0.05) continue;
    if (roadDist(x, z) < R + 16 || z - chanS(x) < R + 40 || Math.hypot(x, z - BASE_Z) < 120) continue;
    if (half.some((p) => Math.hypot(p.x - x, p.z - z) < (Math.max(p.rx, p.rz) + Math.max(rx, rz)) * 1.25 + 14)) continue;
    half.push({ x, z, rx, rz, rot, s });
  }
  for (const p of half) POOLS.push(p, { ...p, x: -p.x, z: -p.z });
}

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  const d = dryK(x, z);
  let h = 1.25 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.12;                // the flat peat, a hand's breadth above the water table
  h += d * (1.3 + fbm(noise, x * 0.008 + 5, z * 0.008, 3) * 0.7);           // the dry islands and wooded rises
  h += smoothstep(470, 620, ax) * 14 + smoothstep(560, 680, az) * 12;       // the forest rising beyond the edges
  for (const bz of [BASE_Z, -BASE_Z]) h += (2.8 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  const rd = roadDist(x, z);
  if (rd < 9) h = lerp(h, Math.max(h, 3.0), smoothstep(9, 4.5, rd));     // the causeways stand above the bog
  const rl = railDist(x, z);
  if (rl < 7) h = lerp(h, Math.max(h, 3.4), smoothstep(7, 3, rl));        // the rail embankment
  h = river.carve(x, z, Math.max(1.0, h));
  const q = poolQ(x, z);
  if (q < 1.2) h = Math.min(h, lerp(1.25, -0.5, smoothstep(1.15, 0.7, q))); // pools: half a metre of black water
  return h;
}

/** The bog: men wade slowly, vehicles crawl and sink in; the causeways, the rail bank and the dry islands are firm. */
function soft(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 6 || railDist(x, z) < 4) return 1;
  const b = 1 - dryK(x, z);
  return b <= 0 ? 1 : 1 - b * (foot ? 0.4 : 0.65);
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'bobruisk',
  name: 'Bobruisk',
  description: 'June 1944, Operation Bagration: the Belarusian marshes in summer. Bogs that swallow tanks, pine and birch on the dry islands, a few raised causeways, and Bobruisk on its island in the Berezina. Whoever holds the roads holds the swamp.',
  epochs: ['1945'],
  region: 'east', // (the menu's Eastern Front: maps/index.js REGIONS)
  sides: { nato: 'Soviet Union', pact: 'Germany' },
  armies: { nato: ['sov'], pact: ['wh'] },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1944,
  height,
  soft,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  airfields: [
    { faction: 'nato', x: AIR.x, z: AIR.z, yaw: -Math.PI / 2, large: false },
    { faction: 'pact', x: -AIR.x, z: -AIR.z, yaw: Math.PI / 2, large: false },
  ],
  woods: (x, z) => Math.max(woodsK(x, z), edgeK(x, z)) * 0.85,
  fields: createFields({ seed: 1944, cell: 70 }),

  theme: {
    // a hot, hazy June day over the marshes
    fogColor: 0xb2bab4, fogDensity: 0.0017,
    skyTop: 0x5a80a8, skyHorizon: 0xc8d2d2, skyBottom: 0x7c8276,
    sunColor: 0xfff0d4, sunIntensity: 2.2, sunDisk: 0.45,
    clouds: 0.5, cloudLight: 0xf2f2ee, cloudDark: 0x9aa0a6,
    sunDir: [-0.45, 0.62, -0.6],
    hemiSky: 0xc4d2e0, hemiGround: 0x4a4632, hemiIntensity: 1.2,
    rimColor: 0xc8d0d8, rimIntensity: 0.22,
    terrain: {
      grass: '#56682f', grassAlt: '#4a5e2c', dryGrass: '#8a8248', dirt: '#54442f', rock: '#6a665c',
      pasture: '#5a6c34', ploughed: '#5a4632', stubble: '#a08e56', meadow: '#6a7a3a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0, // (no farmland patchwork, no default tracks: the causeways are painted below)
      surface(x, z, y) {
        if (railDist(x, z) < 3.2) return [0x4e4a44, 0.9];                          // ballast
        const rd = roadDist(x, z);
        if (rd < 4.5) return corduroy(x, z) ? [0x4a3a2a, 0.9] : [0x7a7060, 0.85];   // logs / gravel
        if (rd < 7) return [0x5a5040, 0.5];                                          // the embankment's shoulders
        if (y < 0.75) return [0x2e2c20, 0.85];                                       // black mud at the water's edge
        const b = 1 - dryK(x, z);
        if (b <= 0.05) return null;
        const n = noise(x * 0.03 + 40, z * 0.03);                                    // sedge and dark wet moss in patches
        return [n > -0.2 ? (n > 0.35 ? 0x807a46 : 0x6c6a3a) : 0x353c22, b * 0.8];
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: NS }, pact: { x: 0, z: -BASE_Z, entries: NS } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    /** A Belarusian log house (khata): dark log walls, white-framed windows, a thatched or plank roof. Occupiable. */
    const logHouse = (x, z, yaw, w, d, name = 'log house') => {
      const r = props.rand;
      const b = props.beginBuilding(name, x, z, yaw, w, d);
      const logs = new THREE.Color().setHSL(0.07, 0.3 + r() * 0.1, 0.22 + r() * 0.06).getHex();
      b.plaster = logs;
      props.shell(b, { height: 2.8, key: 'plain', color: logs, front: [(r() - 0.5) * w * 0.4], t: 0.36, bay: 2.3, frame: 0xd4dcdc, shutters: 0.5 });
      props.piece('stone', b, 0, 0.1, 0, w + 0.3, 0.45, d + 0.3, 0x5e5850);
      props.gableRoof(b, { eave: 2.8, pitch: 0.72, color: r() < 0.6 ? 0x7e6e48 : 0x5e5c56, overhang: 0.6, t: 0.36 });
      props.endBuilding();
    };
    /** A split-rail fence round a garden: low cover. */
    const fence = (x, z, yaw, length) => {
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 0.55, z, length, 0.1, 0.1, yaw, 0x5a4632);
      props.box('plain', x, g + 0.95, z, length, 0.1, 0.1, yaw, 0x5a4632);
      for (let t = -length / 2; t <= length / 2; t += 2) {
        const [px, pz] = PropBuilder.local(x, z, yaw, t, 0);
        props.box('plain', px, terrain.heightAt(px, pz) + 0.6, pz, 0.14, 1.2, 0.14, yaw, 0x4a3a2a);
      }
      cover.addBox({ x, z, yaw, length, thickness: 0.3, height: 1.1 });
    };

    // ---- Bobruisk on its island: wooden houses along the island road, a few brick ones by the square (west half, mirrored)
    const CLEAR = [[-50, 30, 9, 16], [-85, -55, 13, 8], [-115, -55, 5, 5]]; // church, station, water tower
    const clearOf = (x, z, hw) => !CLEAR.some(([cx, cz, w, d]) => Math.abs(x - cx) < w + hw + 2 && Math.abs(z - cz) < d + hw + 2);
    mirrored(props, 1944_01, (m, flip) => {
      const r = props.rand;
      for (const row of [-15, 15, 31]) {
        for (let x = -24 - r() * 4; x > -200; x -= 13 + r() * 6) {
          const z = islZ(x) + row + (r() - 0.5) * 2;
          const w = 7 + r() * 3, d = 6 + r() * 1.5;
          const brick = Math.abs(x) < 80 && row !== 31 && r() < 0.6;
          const skip = r() < 0.15;
          if (skip || !clearOf(x, z, w / 2) || railDist(x, z) < 11 || island(x, z) < HW + 16 || Math.abs(nsX(-SIDE, z) - x) < 14) continue;
          const yaw = (row < 0 ? 0 : Math.PI) + flip;
          if (brick) props.townHouse({ x: x * m, z: z * m, yaw, width: w + 1, depth: d + 2, storeys: 2, name: 'brick house', damaged: 0.3 });
          else logHouse(x * m, z * m, yaw, w, d);
          if (row !== -15 && r() < 0.5) fence((x + (r() - 0.5) * 4) * m, (z + (row < 0 ? -1 : 1) * (d / 2 + 4)) * m, flip, w + 2);
        }
      }
      props.church({ x: -50 * m, z: 30 * m, yaw: Math.PI + flip });
      props.townHouse({ x: -85 * m, z: -55 * m, yaw: flip, width: 20, depth: 9, storeys: 2, name: 'railway station', damaged: 0.4 });
      props.tanks({ x: -115 * m, z: -55 * m, yaw: 0, count: 1, radius: 2.4, height: 10, color: 0x7a5a44 });
      props.rails({ x0: -560 * m, z0: -RAIL_Z * m, x1: -18 * m, z1: -RAIL_Z * m });
      for (const [x, kind, c] of [[-150, 'box', 0x5a3426], [-162, 'open', 0x4a4038], [-174, 'box', 0x4e3a2a], [-420, 'tank', 0x2a2a2a], [-432, 'box', 0x5a3426]] as [number, string, number][]) {
        props.wagon({ x: x * m, z: -RAIL_Z * m, yaw: Math.PI / 2, kind, color: c });
      }
      // the bridgeheads: sandbagged posts on the island at each bridge, barricades beside the road
      props.sandbagRing({ x: 14 * m, z: (chanN(14) + HW + 16) * m, radius: 5, toward: -m });
      props.logBarricade({ x: -11 * m, z: (chanN(-11) + HW + 12) * m, yaw: 0.15 + flip, length: 6 });
      // the square: a low wall round the memorial
      props.lowWall({ x: -16 * m, z: 18 * m, yaw: flip, length: 10, height: 0.9 });
      props.column({ x: 12 * m, z: -14 * m, radius: 1.2, height: 2.4 });
    });

    // ---- hamlets of log houses on the dry islands (each mirrored pair from one seed)
    for (const p of points) {
      if (!'ABCDE'.includes(p.id)) continue; // (the mirror builds G–K)
      mirrored(props, 7000 + Math.round(p.x * 3 + p.z), (m, flip) => {
        const r = props.rand;
        const n = p.id === 'A' ? 4 : 7;
        const placed: number[][] = [];
        for (let i = 0; i < 26 && placed.length < n; i++) {
          const a = (i / 13) * Math.PI * 2 + r() * 0.4;
          const dist = 15 + r() * 16;
          const x = p.x + Math.cos(a) * dist, z = p.z + Math.sin(a) * dist;
          const w = 6.5 + r() * 2.5, d = 5.5 + r() * 1.5;
          const yaw = Math.atan2(-Math.cos(a), -Math.sin(a)); // facing the middle of the hamlet
          const extra = r();
          if (roadDist(x, z) < 11 || railDist(x, z) < 11 || dryK(x, z) < 0.7 || Math.hypot(x, z - BASE_Z) < 34 || Math.hypot(x, z + BASE_Z) < 34 || placed.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 12)) continue;
          placed.push([x, z]);
          logHouse(x * m, z * m, yaw + flip, w, d, placed.length % 3 === 0 ? 'barn' : 'log house');
          const [fx, fz] = PropBuilder.local(x, z, yaw, 0, -d / 2 - 5);
          if (extra < 0.4 && roadDist(fx, fz) > 8) fence(fx * m, fz * m, yaw + flip, w + 3);
          else if (extra < 0.7 && roadDist(fx, fz) > 8) props.logPile({ x: fx * m, z: fz * m, yaw: yaw + flip, length: 6 });
          else if (roadDist(fx, fz) > 8) props.hayBales({ x: fx * m, z: fz * m, yaw: yaw + flip, count: 2 });
        }
      });
    }

    // ---- the corduroy road's logs, and wrecks of the columns caught on the causeways
    props.rand = mulberry32(1944_02);
    for (const s of SEGS) {
      if (!s.logs) continue;
      const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), yaw = Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      for (let t = 0; t < len; t += 0.7) {
        const x = s.a[0] + ((s.b[0] - s.a[0]) * t) / len + (props.rand() - 0.5) * 0.3, z = s.a[1] + ((s.b[1] - s.a[1]) * t) / len;
        props.box('plain', x, terrain.heightAt(x, z) + 0.1, z, 5.6 + props.rand() * 0.6, 0.22, 0.3, yaw + (props.rand() - 0.5) * 0.06, new THREE.Color().setHSL(0.07, 0.2, 0.08 + props.rand() * 0.05).getHex());
      }
    }
    mirrored(props, 1944_03, (m, flip) => {
      const r = props.rand;
      for (let i = 0; i < 14; i++) {
        const rx = NS[i % 3], z = 140 + r() * 360, side = r() < 0.5 ? -1 : 1;
        const x = nsX(rx, z) + side * (7.5 + r() * 2);
        if (nearPoint(x, z, 30) || Math.hypot(x, z - BASE_Z) < 50) continue;
        props.wreckCar({ x: x * m, z: z * m, yaw: r() * 6.28 + flip });
      }
      // dug-in positions beside the causeways where they leave the islands
      for (const [x, z] of [[-SIDE + 12, 268], [14, 300], [SIDE - 13, 160], [-SIDE - 12, 70]]) props.sandbagRing({ x: x * m, z: z * m, radius: 4.5, toward: -m });
    });
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5236);

    // ---- reeds round the pools
    props.rand = mulberry32(1944_04);
    for (const L of POOLS) {
      const clumps = 5 + Math.floor(props.rand() * 5);
      for (let c = 0; c < clumps; c++) {
        const a = props.rand() * Math.PI * 2, k = 0.85 + props.rand() * 0.3;
        const cs = Math.cos(L.rot), sn = Math.sin(L.rot), lx = Math.cos(a) * L.rx * k, lz = Math.sin(a) * L.rz * k;
        const cx = L.x + lx * cs + lz * sn, cz = L.z - lx * sn + lz * cs;
        for (let i = 0; i < 12; i++) {
          const x = cx + (props.rand() - 0.5) * 4, z = cz + (props.rand() - 0.5) * 4, hgt = 1.3 + props.rand() * 0.9;
          props.box('plain', x, Math.max(0, terrain.heightAt(x, z)) + hgt / 2 - 0.1, z, 0.07, hgt, 0.07, props.rand() * 3, props.rand() < 0.5 ? 0x7a7a42 : 0x5e6a34, (props.rand() - 0.5) * 0.25, (props.rand() - 0.5) * 0.25);
        }
      }
    }
    props.finish();
    river.build(scene, terrain);
    // the pools' water (the river's sheet only runs along its arms)
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x343e30, roughness: 0.18, metalness: 0.3, transparent: true, opacity: 0.9 });
    for (const L of POOLS) {
      const r = Math.max(L.rx, L.rz) * 1.25 + 2;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), poolMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(L.x, river.level, L.z);
      mesh.receiveShadow = true;
      mesh.userData.noAO = true;
      scene.add(mesh);
    }

    const wet = (x, z) => poolQ(x, z) < 1.2 || Math.abs(island(x, z)) < HW + 3;
    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x, z) => wet(x, z) || roadDist(x, z) < 8 || railDist(x, z) < 7 }];
    // pine and birch: thick on the wooded rises and the edges, a scatter of birches out on the bog, a few in the gardens
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 10000, broadleaf: 0.4, autumn: 0, maxY: 40,
      forest: (x, z) => {
        if (wet(x, z) || roadDist(x, z) < 9 || railDist(x, z) < 8 || nearPoint(x, z, 30)) return -1;
        if (island(x, z) > 0 && Math.abs(x) < 200) return 0.02;   // the town
        const w = Math.max(woodsK(x, z), edgeK(x, z));
        if (w > 0.5) return 1;
        return dryK(x, z) > 0.5 ? 0.1 : -0.04;      // (bog: a birch here and there — the base 6 % less 4)
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.5, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
