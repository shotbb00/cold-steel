// The Blue Line: Krymskaya, spring 1943 (1945 epoch; Eastern Front; the big field, 1.0 × 1.12 km). After Stalingrad the
// German 17th Army held on in the Kuban bridgehead behind the Gotenkopfstellung — the Blue Line — from the Sea of Azov to
// Novorossiysk. Its strongest knot was the stanitsa of Krymskaya, where the railway and the road from Krasnodar turn
// south-west into the foothills toward Novorossiysk: on its north the plavni, the Kuban’s flooded marsh and reed plain,
// on its south the wooded foothills of the Caucasus with their vineyards. The 56th Army stormed it from 29 April and
// took it on 4 May 1943; the line behind it, at Kievskoye and Moldavanskoye, held until September.
// On the map the Red Army comes from the east (+z, the Abinskaya road), the Germans hold from the west (−z, the Anapa
// road); north is −x. In the middle the Adagum, coming down out of the hills, runs across the field through Krymskaya —
// the road bridge in the stanitsa, the railway bridge beside it, a ford up in the hills and one at the khutor of Adagum
// where the river spreads into the plavni. The plavni (−x): reed beds, black pools and soft ground, one raised causeway
// through them. The foothills (+x): oak and hornbeam woods on the spurs, vineyards on the lower slopes. Each half has
// its anti-tank ditch across the plain (the Germans’ old Krymskaya line on the Soviet side, the Blue Line’s on theirs)
// with trenches and wire behind it and gaps only at the roads and the railway.
// The real lie of it: south of the town the foothills' edge runs south-west, closing in on the road and the railway as
// they turn toward Novorossiysk — so on the map the hills crowd in diagonally on the German side (+x, −z) and stand
// back on the Soviet side, where the plavni reach further in instead (−x, +z). The Soviet side's own high ground is
// the low loess ridge before Novoukrainskoye, running across the plain.
// Fair by distance, not mirrored: each side has a marsh village, a stanitsa on the main road and a foothill village,
// each about as far from its own base as the other side's; the middle points are the stanitsa on the river, Adagum at
// the plavni's edge and the vineyard heights; the Germans' hills are answered by the ridge and the wider plavni flank
// (cover for the Soviet infantry); each ditch lies as far out in front of its own base.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { commandPost } from './common.js';
import { segDist, farmVillage } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1943_0429);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---- the Adagum across the middle: the road bridge in Krymskaya, the railway bridge, a ford in the hills, one in the plavni
const chan = (x: number) => 6 + 9 * Math.sin(x * 0.007 + 0.5) + 5 * Math.sin(x * 0.019);
const BRIDGE_X = 0, RAIL_X = 40, FORD_HILL = 300, FORD_MARSH = -330;
const river = createRiver({
  path: chan, halfWidth: 9, level: 0, depth: 2.3, valley: 30,
  crossings: [
    { name: 'Krymskaya bridge', x: BRIDGE_X, kind: 'bridge', width: 9 },
    { name: 'Railway bridge', x: RAIL_X, kind: 'bridge', width: 6 },
    { name: 'Hill ford', x: FORD_HILL, kind: 'ford', width: 14 },
    { name: 'Adagum ford', x: FORD_MARSH, kind: 'ford', width: 14 },
  ],
});

// ---- the points
const points: ControlPointDef[] = [
  { id: 'A', name: 'Abinskaya road', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Troitskaya', x: -350, z: 235, owner: null, sector: 'west' },
  { id: 'C', name: 'Novoukrainskoye', x: 15, z: 225, owner: null, sector: 'centre' },
  { id: 'D', name: 'Neberdzhaevskaya', x: 345, z: 175, owner: null, sector: 'east' },
  { id: 'E', name: 'Adagum', x: -330, z: 40, owner: null, sector: 'west' },
  { id: 'F', name: 'Krymskaya', x: -10, z: 42, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Vineyard heights', x: 270, z: -55, owner: null, sector: 'east' },
  { id: 'H', name: 'Kievskoye', x: -290, z: -215, owner: null, sector: 'west' },
  { id: 'I', name: 'Moldavanskoye', x: -45, z: -235, owner: null, sector: 'centre' },
  { id: 'J', name: 'Nizhnebakanskaya', x: 300, z: -185, owner: null, sector: 'east' },
  { id: 'K', name: 'Anapa road', x: 30, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));

// ---- the roads: the Krasnodar–Novorossiysk road through the middle, the plavni causeway, the foothill road, a lateral
// behind each side’s ditch; the railway beside the main road, turning south-west into the hills
const R1 = [[0, 580], [0, BASE_Z], [5, 330], [P.C.x, P.C.z], [5, 70], [BRIDGE_X, chan(BRIDGE_X)], [-15, -80], [P.I.x, P.I.z], [-5, -380], [0, -BASE_Z], [0, -580]];
const ROADS = [R1,
  [[-130, 580], [-220, 420], [P.B.x, P.B.z], [FORD_MARSH, 80], [FORD_MARSH, chan(FORD_MARSH)], [FORD_MARSH, -40], [P.H.x, P.H.z], [-200, -420], [-130, -580]],
  [[130, 580], [250, 400], [P.D.x, P.D.z], [FORD_HILL, 50], [FORD_HILL, chan(FORD_HILL)], [FORD_HILL, -20], [P.G.x, P.G.z], [P.J.x, P.J.z], [200, -420], [130, -580]],
  [[P.B.x, P.B.z], [P.C.x, P.C.z], [P.D.x, P.D.z]],
  [[P.H.x, P.H.z], [P.I.x, P.I.z], [P.J.x, P.J.z]],
  [[P.E.x, P.E.z], [-200, 30], [-60, 30]],               // Adagum – Krymskaya along the north bank
];
const roadDist = (x: number, z: number) => { let d = Infinity; for (const p of ROADS) d = Math.min(d, segDist(p, x, z)); return d; };
const RAIL = [[60, 580], [45, 330], [RAIL_X, 120], [RAIL_X, -60], [150, -140], [290, -215], [420, -330], [560, -480]];
const railDist = (x: number, z: number) => segDist(RAIL, x, z);
/** The same two, sampled once for the ground (height() asks for every vertex; a 3 m grid read between the samples). */
const roadDistG = gridCacheSmooth(roadDist, { x: 560, z: 620 }, 3), railDistG = gridCacheSmooth(railDist, { x: 560, z: 620 }, 3);

// ---- the plavni (−x) and the foothills (+x), each the whole length of the field
const plavK = (x: number, z: number) => smoothstep(-175, -270, x - 0.3 * z + 22 * Math.sin(z * 0.011) + 14 * Math.sin(z * 0.027 + 1));
const hillK = (x: number, z: number) => Math.max(smoothstep(110, 430, x - 0.45 * z + 28 * Math.sin(z * 0.009 + 2)), 0.9 * smoothstep(190, 40, Math.hypot((x - 130) * 0.45, (z - 330) * 1.3))); // (the edge runs diagonally: near the stanitsa on the German side, the Neberdzhaevskaya heights an outlier on the Soviet side)
const TILT = 0.1;
/** The ground before roads, ditches and water (cached: the noise is dear). */
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 2.2 + fbm(noise, x * 0.004 + 7, z * 0.004, 3) * 1.4;
  const hk = hillK(x, z) * smoothstep(20, 150, Math.abs(z - chan(x))) * (1 + TILT * Math.tanh(z / 200)); // (the Adagum’s valley opens the hills; TILT evens the high ground)
  // spurs running down out of the mountains (along x), woods and vineyards on them
  h += hk * (24 + 16 * fbm(noise, x * 0.004 + 21, z * 0.006 - 5, 3) + 6 * Math.sin(z * 0.017 + 0.6));
  h += 0 * smoothstep(210, 30, Math.hypot((x - 130) * 0.45, (z - 330) * 1.3)) ** 1.3;                  // the Neberdzhaevskaya heights: the Soviet side's high ground
  h = lerp(h, 0.95 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.15, plavK(x, z));          // the plavni: a hand above the water
  h += smoothstep(480, 620, x) * 18 + smoothstep(560, 680, Math.abs(z)) * 10;           // the mountains beyond the south edge
  for (const bz of [BASE_Z, -BASE_Z]) h += (lerp(2.4, h, 0.3) - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return h;
}, { x: 560, z: 620 }, 4);

// ---- the anti-tank ditches: across the plain in front of each side’s stanitsa, gaps at the roads and the railway
const ditchZ = (x: number, s: number) => s * (s > 0 ? 145 : 135) + 8 * Math.sin(x * 0.013 + s);
function ditch(x: number, z: number) {
  if (x < -235 || x > 430) return Infinity; // (from the plavni’s edge into the first hills)
  const s = z > 0 ? 1 : -1, d = Math.abs(z - ditchZ(x, s));
  if (d > 6) return Infinity;
  if (roadDist(x, z) < 12 || railDist(x, z) < 10) return Infinity;
  return d;
}

// ---- the plavni’s pools: black water among the reeds, as many on each side
const POOLS: { x: number; z: number; rx: number; rz: number; rot: number; s: number }[] = [];
const poolQ1 = (L: (typeof POOLS)[0], x: number, z: number) => {
  const c = Math.cos(L.rot), s = Math.sin(L.rot), dx = x - L.x, dz = z - L.z;
  const lx = (dx * c - dz * s) / L.rx, lz = (dx * s + dz * c) / L.rz, a = Math.atan2(lz, lx);
  return Math.hypot(lx, lz) * (1 + 0.12 * Math.sin(2 * a + L.s) + 0.07 * Math.sin(3 * a + 2 * L.s));
};
const poolQ = (x: number, z: number) => {
  if (x > -200) return Infinity;
  let q = Infinity;
  for (const L of POOLS) if (Math.abs(x - L.x) < 60 && Math.abs(z - L.z) < 60) q = Math.min(q, poolQ1(L, x, z));
  return q;
};
{
  const r = mulberry32(1943_05);
  const count = [0, 0];
  for (let i = 0; count[0] + count[1] < 40 && i < 8000; i++) {
    const x = -500 + r() * 270, z = (r() * 2 - 1) * 540, rx = 12 + r() * 20, rz = 8 + r() * 12, rot = r() * 3, s = r() * 6;
    const R = Math.max(rx, rz) * 1.25, side = z > 0 ? 0 : 1;
    if (count[side] >= 20) continue;
    if (plavK(x, z) < 0.98 || plavK(x + R, z) < 0.98 || plavK(x, z + R) < 0.98 || plavK(x, z - R) < 0.98) continue;
    if (roadDist(x, z) < R + 16 || Math.abs(z - chan(x)) < R + 30 || points.some((p) => Math.hypot(p.x - x, p.z - z) < R + 40) || Math.hypot(x, Math.abs(z) - BASE_Z) < 140) continue;
    if (POOLS.some((p) => Math.hypot(p.x - x, p.z - z) < (Math.max(p.rx, p.rz) + Math.max(rx, rz)) * 1.25 + 14)) continue;
    POOLS.push({ x, z, rx, rz, rot, s });
    count[side]++;
  }
}

function height(x: number, z: number) {
  let h = ground(x, z);
  const rd = roadDistG(x, z);
  if (rd < 9 && plavK(x, z) > 0.05) h = lerp(h, Math.max(h, 2.0), smoothstep(9, 4.5, rd));   // the causeway over the plavni
  const rl = railDistG(x, z);
  if (rl < 7) h = lerp(h, Math.max(h, 3.2), smoothstep(7, 3, rl));                         // the rail embankment on the plain
  const dd = ditch(x, z);
  if (dd < 6) h -= 2.6 * smoothstep(6, 2.5, dd);                                                // the anti-tank ditch: steep, 2.6 m deep
  h = river.carve(x, z, Math.max(1.0, h));
  const q = poolQ(x, z);
  if (q < 1.2) h = Math.min(h, lerp(1.0, -0.55, smoothstep(1.15, 0.7, q)));                   // pools: half a metre of black water
  return h;
}

/** The plavni: men wade, vehicles crawl and sink in; the causeway is firm. */
function soft(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 5 || railDist(x, z) < 4) return 1;
  const b = plavK(x, z);
  if (b <= 0.05) return 1;
  return poolQ(x, z) < 1.05 ? (foot ? 0.55 : 0.35) : 1 - b * (foot ? 0.35 : 0.6);
}

const woodsN = (x: number, z: number) => fbm(noise, x * 0.005 + 41, z * 0.005 - 13, 3);
const woodsK = (x: number, z: number) => smoothstep(0.3, 0.6, hillK(x, z)) * smoothstep(-0.15, 0.1, woodsN(x, z));
const TOWN = { x: -5, z: 10 }; // (the stanitsa on both banks; its square, the point, on the east bank)
const inTown = (x: number, z: number) => Math.abs(x - TOWN.x) < 170 && Math.abs(z - TOWN.z) < 120;
const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'krymskaya',
  name: 'The Blue Line',
  description: 'Krymskaya, spring 1943: the 56th Army storms the knot of the Blue Line in the Kuban bridgehead — the stanitsa and its station on the Adagum, the reed-choked plavni on one flank, wooded foothills and vineyards on the other, anti-tank ditches and trenches across the plain.',
  epochs: ['1945'],
  region: 'east', // (the menu’s Eastern Front: maps/index.js REGIONS)
  sides: { nato: 'Soviet Union', pact: 'Germany' },
  armies: { nato: ['sov'], pact: ['wh'] }, // (the 56th Army against the 17th Army’s V Corps)
  conditions: { time: 'day', weather: 'clear' }, // (the attack went in by day on 29 April after the bombers and the guns)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1943,
  height,
  soft,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => woodsK(x, z) * 0.85,
  fields: createFields({ seed: 1943, cell: 70 }),

  theme: {
    // a bright late-April day in the Kuban, haze over the plavni
    fogColor: 0xb4bcb8, fogDensity: 0.0015,
    skyTop: 0x5c84ae, skyHorizon: 0xccd4d4, skyBottom: 0x7e8478,
    sunColor: 0xfff2d8, sunIntensity: 2.1, sunDisk: 0.42,
    clouds: 0.45, cloudLight: 0xf2f2ee, cloudDark: 0x9aa0a6,
    sunDir: [0.5, 0.6, -0.5],
    hemiSky: 0xc4d2e0, hemiGround: 0x4a4832, hemiIntensity: 1.2,
    rimColor: 0xc8d0d8, rimIntensity: 0.22,
    terrain: {
      grass: '#5a7232', grassAlt: '#506a2e', dryGrass: '#8a8a4c', dirt: '#5a4832', rock: '#6e6a5e',
      pasture: '#5e7636', ploughed: '#5a4630', stubble: '#8e8a52', meadow: '#6a8238',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0, // (no default tracks: the roads are painted below)
      surface(x: number, z: number, y: number) {
        if (railDist(x, z) < 3.2) return [0x4e4a44, 0.9];                                   // ballast
        const rd = roadDist(x, z);
        if (rd < 4) return [segDist(R1, x, z) < 4 ? 0x6a665e : 0x7a6c58, 0.85];              // the chaussée, the earth roads
        if (rd < 6.5) return [0x5a5040, 0.4];
        if (ditch(x, z) < 5) return [0x5a4630, 0.85];                                        // the ditch’s raw clay
        if (y < 0.8) return [0x2e2c20, 0.85];                                                // black mud at the water’s edge
        const b = plavK(x, z);
        if (b > 0.05) { const n = noise(x * 0.03 + 40, z * 0.03); return [n > -0.2 ? (n > 0.35 ? 0x8a8448 : 0x6e6c3a) : 0x3a4224, b * 0.85]; } // reed and sedge
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  /** Each side’s trenches and wire behind its ditch (the Soviets in the old German line), craters along the middle. */
  battlefield() {
    const works: any[] = [];
    for (const [f, s] of [['nato', 1], ['pact', -1]] as const) {
      for (let x = -225; x <= 420; x += 9) {
        const z = ditchZ(x, s) + s * 26;
        if (roadDist(x, z) < 12 || railDist(x, z) < 10 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 30)) continue;
        works.push({ kind: 'trench', x, z, yaw: s > 0 ? Math.PI : 0, faction: f });
        if (Math.round(x / 9) % 9 === 0) works.push({ kind: 'mgNest', x, z: z + s * 6, yaw: s > 0 ? Math.PI : 0, faction: f });
      }
      for (let x = -220; x <= 420; x += 10.2) {
        const z = ditchZ(x, s) - s * 14;
        if (roadDist(x, z) < 14 || railDist(x, z) < 10 || Math.round(x / 10.2) % 11 === 0) continue;
        works.push({ kind: 'wire', x, z, yaw: 0, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number) => poolQ(x, z) < 1.3 || Math.abs(z - chan(x)) < 16;
    const busy = (x: number, z: number, d: number) => roadDist(x, z) < d || railDist(x, z) < d || ditch(x, z) < 8 || wet(x, z);

    /** A cossack khata: whitewashed clay walls, a thatched or iron roof. Occupiable. */
    const khata = (x: number, z: number, yaw: number, w: number, d: number, name = 'khata') => {
      const r = props.rand;
      const b = props.beginBuilding(name, x, z, yaw, w, d);
      const wall = new THREE.Color().setHSL(0.11, 0.15, 0.78 + r() * 0.1).getHex();
      b.plaster = wall;
      props.shell(b, { height: 2.7, key: 'plain', color: wall, front: [(r() - 0.5) * w * 0.4], t: 0.4, bay: 2.4, frame: 0x4a6a8a, shutters: 0.6 });
      props.piece('stone', b, 0, 0.1, 0, w + 0.3, 0.4, d + 0.3, 0x6a6458);
      props.gableRoof(b, { eave: 2.7, pitch: 0.7, color: r() < 0.55 ? 0x8a7a4e : 0x6a6e70, overhang: 0.6, t: 0.36 });
      props.endBuilding();
    };
    /** A wattle fence round a garden: low cover. */
    const fence = (x: number, z: number, yaw: number, length: number) => {
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 0.55, z, length, 1.1, 0.18, yaw, 0x6a5638);
      cover.addBox({ x, z, yaw, length, thickness: 0.3, height: 1.1 });
    };

    // ---- Krymskaya: khatas in their gardens along a grid of streets on both banks, brick houses round the square,
    // the church, the station on the railway, the water tower and the grain store
    props.rand = mulberry32(1943_01);
    {
      const r = props.rand;
      const placed: number[][] = [];
      for (let gx = -160; gx <= 160; gx += 22) for (let gz = -110; gz <= 110; gz += 24) {
        const x = TOWN.x + gx + (r() - 0.5) * 4, z = TOWN.z + gz + (r() - 0.5) * 4;
        if (r() < 0.18 || busy(x, z, 11) || Math.abs(z - chan(x)) < 26 || Math.hypot(x - TOWN.x, z - TOWN.z) < 24) continue;
        if (Math.hypot(x - 30, z + 60) < 22 || Math.hypot(x - 64, z - 46) < 20 || placed.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 12)) continue;
        placed.push([x, z]);
        const yaw = Math.round(r() * 3) * (Math.PI / 2);
        if (Math.hypot(gx, gz) < 70 && r() < 0.5) props.townHouse({ x, z, yaw, width: 9 + r() * 3, depth: 8, storeys: r() < 0.4 ? 2 : 1, name: 'brick house', damaged: 0.35 });
        else khata(x, z, yaw, 7 + r() * 3, 5.5 + r() * 1.5);
        if (r() < 0.5) { const [fx, fz] = PropBuilder.local(x, z, yaw, 0, -8); if (!busy(fx, fz, 7)) fence(fx, fz, yaw, 9); }
      }
    }
    props.church({ x: -30, z: -60, yaw: 0 });
    props.townHouse({ x: 64, z: 46, yaw: Math.PI / 2, width: 20, depth: 9, storeys: 2, name: 'Krymskaya station', damaged: 0.5 });
    props.tanks({ x: 64, z: 72, yaw: 0, count: 1, radius: 2.4, height: 10, color: 0x7a5a44 });
    props.hall({ x: 75, z: 100, yaw: Math.PI / 2, width: 26, depth: 12, height: 8, color: 0x9a8e7a, roof: 0x5a5c5e, door: 5, name: 'grain store' });
    for (const [z, kind, c] of [[150, 'box', 0x5a3426], [162, 'open', 0x4a4038], [174, 'box', 0x4e3a2a], [-20, 'tank', 0x2a2a2a]] as [number, string, number][]) {
      props.wagon({ x: RAIL_X, z, yaw: 0, kind, color: c });
    }
    props.rails({ x0: RAIL[0][0], z0: RAIL[0][1], x1: RAIL[1][0], z1: RAIL[1][1] });
    for (let i = 1; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    // barricades at the bridgeheads, sandbagged posts on both banks
    props.sandbagRing({ x: 16, z: chan(16) + 26, radius: 5, toward: -1 });
    props.sandbagRing({ x: -20, z: chan(-20) - 26, radius: 5, toward: 1 });
    props.logBarricade({ x: -12, z: chan(-12) + 22, yaw: 0.15, length: 6 });
    props.logBarricade({ x: 12, z: chan(12) - 22, yaw: -0.2, length: 6 });

    // ---- the villages: stanitsas and khutors of khatas round each point
    const skip = (x: number, z: number) => busy(x, z, 10) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40;
    for (const [id, seed] of [['B', 11], ['C', 12], ['D', 13], ['E', 14], ['H', 15], ['I', 16], ['J', 17]] as [string, number][]) {
      const p = P[id];
      props.rand = mulberry32(1943_100 + seed);
      const r = props.rand, placed: number[][] = [];
      for (let i = 0; i < 30 && placed.length < 8; i++) {
        const a = (i / 15) * Math.PI * 2 + r() * 0.4, dist = 17 + r() * 22;
        const x = p.x + Math.cos(a) * dist, z = p.z + Math.sin(a) * dist;
        if (skip(x, z) || placed.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 12)) continue;
        placed.push([x, z]);
        const yaw = Math.atan2(-Math.cos(a), -Math.sin(a));
        khata(x, z, yaw, 7 + r() * 2.5, 5.5 + r() * 1.5, placed.length % 3 === 0 ? 'barn' : 'khata');
        const [fx, fz] = PropBuilder.local(x, z, yaw, 0, -8);
        if (r() < 0.5 && !skip(fx, fz)) fence(fx, fz, yaw, 9);
      }
      farmVillage(props, p.x, p.z, 3, 1943_200 + seed, (x, z) => skip(x, z) || placed.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 16), 1.6);
    }

    // ---- the vineyards on the foothills’ lower slopes: rows of young vines on their stakes, as many blocks on each side
    const VINES = [[300, 110, 110, 60], [380, 230, 80, 60], [230, -10, 90, 50], [330, -95, 90, 50], [250, -250, 110, 60], [380, -150, 80, 60]];
    for (const [vx, vz, w, dpt] of VINES) {
      for (let row = 0; row < dpt; row += 3.4) for (let s = 0; s < w; s += 3) {
        const x = vx - w / 2 + s + 1.5, z = vz - dpt / 2 + row;
        if (busy(x, z, 7) || nearPoint(x, z, 14)) continue;
        props.box('plain', x, terrain.heightAt(x, z) + 0.55, z, 2.4, 1.1, 0.4, 0, 0x4e6a2c);
      }
    }

    // ---- the bunker lines: concrete pillboxes behind each ditch, a dug-in gun at the road gaps
    const pillbox = (x: number, z: number) => {
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + 0.9, z, 5, 1.8, 4, 0, 0x8a887e);
      props.box('stone', x, g + 1.95, z, 5.6, 0.3, 4.6, 0, 0x7a786e);
      cover.addBox({ x, z, yaw: 0, length: 5, thickness: 4, height: 1.8 });
    };
    for (const [s, xs] of [[1, [-180, -60, 90, 200, 330]], [-1, [-200, -90, 60, 180, 350]]] as [number, number[]][]) {
      for (const x of xs) { const z = ditchZ(x, s) + s * 40; if (!busy(x, z, 8) && !nearPoint(x, z, 20)) pillbox(x, z); }
      for (const x of [R1[3][0], FORD_HILL, FORD_MARSH]) { const z = ditchZ(x, s) + s * 34; props.sandbagRing({ x: x + 18, z, radius: 4.5, toward: -s }); }
    }

    // ---- wrecks on the roads, haystacks and field barns on the plain
    props.rand = mulberry32(1943_03);
    {
      const r = props.rand;
      for (let i = 0; i < 26; i++) {
        const x = (r() * 2 - 1) * 440, z = (r() * 2 - 1) * 440;
        const ok = roadDist(x, z) > 6.5 && roadDist(x, z) < 10;
        if (!ok || nearPoint(x, z, 30) || busy(x, z, 6.5) || plavK(x, z) > 0.5) continue;
        props.wreckCar({ x, z, yaw: r() * 6.28 });
      }
      for (let i = 0; i < 60; i++) {
        const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 520;
        if (nearPoint(x, z, 40) || busy(x, z, 10) || inTown(x, z) || plavK(x, z) > 0.3 || hillK(x, z) > 0.5 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50) continue;
        const k = r();
        if (k < 0.5) props.hayBales({ x, z, yaw: r() * 3, count: 2 + Math.floor(r() * 3) });
        else if (k < 0.75) props.house({ x, z, yaw: r() * 3, width: 7, depth: 5, height: 2.8 });
        else props.logPile({ x, z, yaw: r() * 3, length: 6 });
      }
    }
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5236);

    // ---- reeds: round the pools and in beds along the plavni’s channels
    props.rand = mulberry32(1943_04);
    for (const L of POOLS) {
      const clumps = 6 + Math.floor(props.rand() * 5);
      for (let c = 0; c < clumps; c++) {
        const a = props.rand() * Math.PI * 2, k = 0.85 + props.rand() * 0.3;
        const cs = Math.cos(L.rot), sn = Math.sin(L.rot), lx = Math.cos(a) * L.rx * k, lz = Math.sin(a) * L.rz * k;
        const cx = L.x + lx * cs + lz * sn, cz = L.z - lx * sn + lz * cs;
        for (let i = 0; i < 12; i++) {
          const x = cx + (props.rand() - 0.5) * 4, z = cz + (props.rand() - 0.5) * 4, hgt = 1.6 + props.rand() * 1.0;
          if (roadDist(x, z) < 6) continue;
          props.box('plain', x, Math.max(0, terrain.heightAt(x, z)) + hgt / 2 - 0.1, z, 0.07, hgt, 0.07, props.rand() * 3, props.rand() < 0.5 ? 0x8a8a4a : 0x6a7a3a, (props.rand() - 0.5) * 0.25, (props.rand() - 0.5) * 0.25);
        }
      }
    }
    // reed beds out on the open plavni and along the Adagum where it spreads into them
    for (let i = 0, n = 0; i < 3000 && n < 170; i++) {
      const cx = -500 + props.rand() * 300, cz = (props.rand() * 2 - 1) * 540;
      if (plavK(cx, cz) < 0.8 || noise(cx * 0.012 + 9, cz * 0.012) < 0.1 || busy(cx, cz, 9) || nearPoint(cx, cz, 30) || Math.hypot(cx, Math.abs(cz) - BASE_Z) < 60) continue;
      n++;
      for (let k = 0; k < 14; k++) {
        const x = cx + (props.rand() - 0.5) * 7, z = cz + (props.rand() - 0.5) * 7, hgt = 1.6 + props.rand() * 1.1;
        props.box('plain', x, terrain.heightAt(x, z) + hgt / 2 - 0.1, z, 0.07, hgt, 0.07, props.rand() * 3, props.rand() < 0.5 ? 0x8a8a4a : 0x6a7a3a, (props.rand() - 0.5) * 0.25, (props.rand() - 0.5) * 0.25);
      }
    }
    props.finish();
    river.build(scene, terrain);
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x34402e, roughness: 0.18, metalness: 0.3, transparent: true, opacity: 0.9 });
    for (const L of POOLS) {
      const r = Math.max(L.rx, L.rz) * 1.25 + 2;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), poolMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(L.x, river.level, L.z);
      mesh.receiveShadow = true;
      mesh.userData.noAO = true;
      scene.add(mesh);
    }

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => busy(x, z, 8) }];
    // oak and hornbeam on the foothills’ spurs, willows along the Adagum and the plavni’s edge, fruit trees in the gardens
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 9000, broadleaf: 0.9, autumn: 0, maxY: 80,
      forest: (x: number, z: number) => {
        if (busy(x, z, 9) || nearPoint(x, z, 26) || VINES.some(([vx, vz, w, d]) => Math.abs(x - vx) < w / 2 + 4 && Math.abs(z - vz) < d / 2 + 4)) return -1;
        if (woodsK(x, z) > 0.5) return 1;
        if (plavK(x, z) > 0.6) return -0.05;                                  // (reed country: hardly a tree)
        const rv = Math.abs(z - chan(x));
        if (rv > 18 && rv < 26) return 0.18;                                  // (willows along the river)
        if (inTown(x, z)) return 0.06;
        return nearPoint(x, z, 70) ? 0.08 : -0.04;
      },
    });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        grass.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
