// Ivalo, winter 2027 (a hypothetical war): the village on the Ivalojoki in northern Lapland, where the E75 — the
// Arctic road north to Inari and the Norwegian border — crosses the river, with Lapland’s busiest airport south-west
// of it. Russia comes down from the north (from Inari, -z); NATO holds the south (Saariselkä and its fells). On the
// map: the Ivalojoki across the middle, black and fast between snowy banks (the rapids keep it open), its three
// crossings — Ivalo’s road bridge, the bridge at Saarenkylä downstream, the ford at Törmänen upstream — Ivalo village
// on both banks of the main one, the airport out west, Akujärvi and Koppelo on the E75, Lake Inari’s ice in the
// north-east, the fells (Otsamo by Inari, Kaunispää’s shoulder by Saariselkä) and pine forest over everything.
// Not a mirror: the river swings in its own bends, the lakes and fells lie where each half has them (the long ice of
// Lake Inari on the Russian east flank against Akujärvi and two smaller lakes on the Finnish side; the high fell on
// the Finnish east flank against Otsamo on the Russian west); but each side has a crossing in each sector, the same
// reach of road to it, as much ice and as much high ground on its half (tools/map_fairness.py).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import { segDist, iceLakes, arcticTheme, snowSurface, snowSoft, woodenVillage, roadside, taiga } from './arctic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE = 330;
const noise = createNoise2D(2027_43);

const riverZ = (x: number) => 26 * Math.sin(x * 0.0055 + 0.4) + 14 * Math.sin(x * 0.015) - 16 * Math.cos(x * 0.004) - 10;
const roadX = (z: number) => 18 * Math.sin(z * 0.006) + 10 * Math.sin(z * 0.015 + 1.2) - 10;
const trackX = (rx: number, z: number) => rx + 16 * Math.sin(z * 0.009 + rx * 0.01) + 10 * Math.cos(z * 0.012);
const CROSS = [trackX(-SIDE, riverZ(-SIDE)) - 30, roadX(riverZ(0)), trackX(SIDE, riverZ(SIDE))];
const river = createRiver({
  path: riverZ, halfWidth: 18, level: 0, depth: 3, valley: 50,
  crossings: [
    { name: 'Törmänen ford', x: CROSS[0], kind: 'ford', width: 16 },
    { name: 'Ivalo bridge', x: CROSS[1], kind: 'bridge', width: 10 },
    { name: 'Saarenkylä bridge', x: CROSS[2], kind: 'bridge', width: 8 },
  ],
});
const away = (x: number, z: number) => Math.abs(z - riverZ(x));
// the roads: each runs straight over its crossing (no bend on the bridge)
const straight = (fx: (z: number) => number, cx: number) => (z: number) => { const z0 = riverZ(cx), k = smoothstep(25, 60, Math.abs(z - z0)); return cx + (fx(z) - cx) * k; };
const mainX = straight(roadX, CROSS[1]);
const westX = straight((z) => trackX(-SIDE, z), CROSS[0]);
const eastX = straight((z) => trackX(SIDE, z), CROSS[2]);
const SEGS: [number, number][][] = [[[-SIDE, 320], [0, 270]], [[0, 270], [SIDE, 300]], [[SIDE, -280], [0, -250]], [[0, -250], [-SIDE, -300]]];
const mainDist = (x: number, z: number) => Math.abs(x - mainX(z));
function roadDist(x: number, z: number) {
  let d = Math.min(mainDist(x, z), Math.abs(x - westX(z)), Math.abs(x - eastX(z)));
  for (const [a, b] of SEGS) d = Math.min(d, segDist(x, z, a, b));
  return d;
}
// the airport west of Akujärvi: a runway east–west
const RW = { x: -200, z: 360, len: 120, w: 13 };
const onRunway = (x: number, z: number, m = 0) => Math.abs(x - RW.x) < RW.len + m && Math.abs(z - RW.z) < RW.w + m;

const points: ControlPointDef[] = [
  { id: 'A', name: 'Saariselkä road', x: mainX(470), z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Ivalo airport', x: westX(300), z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Akujärvi', x: mainX(250), z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Nellim road', x: eastX(310), z: 310, owner: null, sector: 'east' },
  { id: 'E', name: 'Törmänen', x: CROSS[0], z: riverZ(CROSS[0]), owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Ivalo', x: CROSS[1], z: riverZ(CROSS[1]), owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Saarenkylä', x: CROSS[2], z: riverZ(CROSS[2]), owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Riutula', x: westX(-265), z: -265, owner: null, sector: 'west' },
  { id: 'I', name: 'Koppelo', x: mainX(-235), z: -235, owner: null, sector: 'centre' },
  { id: 'J', name: 'Ukonjärvi', x: eastX(-300), z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Inari road', x: mainX(-470), z: -470, owner: 'pact', sector: 'centre' },
];
const DRY = [...points.map((p) => [p.x, p.z, 55]), [0, BASE_Z, 70], [0, -BASE_Z, 70]];
const keepClear = (x: number, z: number) => {
  let k = smoothstep(10, 26, roadDist(x, z)) * smoothstep(60, 90, away(x, z));
  for (const [px, pz, r] of DRY) k = Math.min(k, smoothstep(r - 15, r + 15, Math.hypot(x - px, z - pz)));
  return Math.min(k, onRunway(x, z, 30) ? 0 : 1);
};
// Lake Inari’s southern arm on the Russian east flank; Akujärvi and two small lakes on the Finnish side; a pond each
const ice = iceLakes([
  { x: -110, z: 250, rx: 58, rz: 34, rot: 0.3, seed: 1 }, { x: 420, z: 200, rx: 48, rz: 42, rot: -0.2, seed: 2 }, { x: -440, z: 430, rx: 48, rz: 60, rot: 0.1, seed: 3 },
  { x: 440, z: -360, rx: 66, rz: 112, rot: 0.25, seed: 4 }, { x: -160, z: -330, rx: 40, rz: 30, rot: -0.4, seed: 5 },
], keepClear);
const iceC = gridCache(ice, BOUNDS);
const bogK = (x: number, z: number) => smoothstep(0.1, 0.22, fbm(noise, x * 0.006 + 423.3, z * 0.006 - 261.1, 3)) * keepClear(x, z) * (1 - iceC(x, z));
const bogC = gridCache(bogK, BOUNDS);
const woodsK = (x: number, z: number) => (away(x, z) < river.halfWidth + 5 || onRunway(x, z, 26) ? -1 : 1) * (fbm(noise, x * 0.008 + 908.2, z * 0.008 - 561.4, 3) > -0.1 ? 0.9 : 0.03)
  * smoothstep(6, 16, roadDist(x, z)) * (1 - iceC(x, z)) * (1 - 0.6 * bogC(x, z)) * Math.min(1, ...DRY.map(([px, pz, r]) => smoothstep(r * 0.55, r + 10, Math.hypot(x - px, z - pz))));
const woodsC = gridCache((x: number, z: number) => Math.max(0, woodsK(x, z)), BOUNDS);

// the fells: Kaunispää’s shoulder east on the Finnish side, Otsamo west on the Russian; a low rise each
const RISES: [number, number, number, number][] = [[430, 420, 90, 28], [-300, 170, 55, 9], [-430, -400, 90, 27], [250, -150, 55, 9]];
function height(x: number, z: number) {
  let h = 10 + fbm(noise, x * 0.004, z * 0.004, 4) * 7 * smoothstep(40, 140, away(x, z)) + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.8;
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  h -= smoothstep(18, 5, roadDist(x, z)) * (h - 9) * 0.5;
  h += (10 - h) * smoothstep(RW.w + 30, RW.w + 4, Math.abs(z - RW.z)) * smoothstep(RW.len + 40, RW.len + 4, Math.abs(x - RW.x)); // the airport graded flat
  const lk = ice(x, z);
  if (lk > 0) h += (6 - h) * lk;
  h -= bogK(x, z) * 1.2;
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * 20 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14;
  for (const bz of [BASE_Z, -BASE_Z]) h += (10 - h) * smoothstep(32, 16, Math.hypot(x - mainX(bz), z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const softV = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, false), BOUNDS);
const softF = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, true), BOUNDS);

export default {
  id: 'ivalo',
  name: 'Ivalo',
  description: 'Northern Lapland in the polar twilight, 2027: Ivalo on the Ivalojoki, where the Arctic road north to Inari crosses the river, its airport out west, fells and pine forest all round. Three crossings, and the river runs open and fast.',
  epochs: ['2027'],
  region: 'north',
  armies: { nato: ['us'], pact: ['ru'] },
  conditions: { time: 'dawn', weather: 'clear' }, // (the low sun of the short winter day)
  climate: 'winter', // whitewash and snow smocks (render/paint.js CLIMATE; aircraft keep their paint)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 2027_43,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  soft: (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z),
  woods: (x: number, z: number) => woodsC(x, z) * 0.8,

  theme: arcticTheme({
    sunIntensity: 1.3, sunDir: [-0.6, 0.14, 0.75], skyHorizon: 0xe2c8b0, sunColor: 0xffc898, clouds: 0.35,
    terrain: {
      surface(x: number, z: number, y: number) {
        if (onRunway(x, z)) return [Math.abs(z - RW.z) < 0.4 && Math.floor(x / 12) % 2 === 0 ? 0xe8e8e4 : 0x6e6e6c, 0.95];
        if (y < 1.6 && away(x, z) < 34) return [0x8a8c84, 0.6];                         // the bare stony banks
        return snowSurface(x, z, { road: roadDist(x, z), main: mainDist(x, z) < 4.5, ice: iceC, bog: bogC, noise });
      },
    },
  }),

  bases: { nato: { x: mainX(BASE_Z), z: BASE_Z, entries: [-SIDE, 0, SIDE] }, pact: { x: mainX(-BASE_Z), z: -BASE_Z, entries: [-SIDE, 0, SIDE] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: mainX(BASE_Z) + 10, z: BASE_Z - 18, facing: Math.PI, name: '1st Platoon' }],
    pact: [{ unit: 'rifles', x: mainX(-BASE_Z) - 10, z: -BASE_Z + 18, facing: 0, name: '1-ya Rota' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const wet = (x: number, z: number, r = 0) => away(x, z) < river.halfWidth + 8 + r;
    const skip = (x: number, z: number, r: number) => roadDist(x, z) < 9 + r || iceC(x, z) > 0.05 || wet(x, z, r) || onRunway(x, z, r + 10);

    // Ivalo on both banks of the bridge: wooden houses along the E75 and the river, the church, the shop, two small blocks
    props.rand = mulberry32(4301);
    const r0 = props.rand, f = points[5];
    for (let i = 0; i < 30; i++) {
      const s = i % 2 ? 1 : -1, x = f.x + (r0() - 0.5) * 260, z = riverZ(x) + s * (40 + r0() * 70);
      if (skip(x, z, 6) || Math.hypot(x - f.x, z - f.z) < 22) continue;
      props.townHouse({ x, z, yaw: Math.atan2(1, (riverZ(x + 1) - riverZ(x))) + (r0() < 0.5 ? 0 : Math.PI / 2), width: 8 + r0() * 3, depth: 7 + r0() * 2, storeys: r0() < 0.6 ? 1 : 2, name: 'house', damaged: 0 });
    }
    props.church({ x: f.x - 50, z: riverZ(f.x - 50) + 66, yaw: 0 });
    props.hall({ x: f.x + 40, z: riverZ(f.x + 40) - 70, yaw: 0, width: 26, depth: 14, height: 5, color: 0xc8c4bc, roof: 0x4a4c4e, door: 6, name: 'supermarket' });
    // the airport: tower, terminal and hangar on the runway’s north side
    props.controlTower({ x: RW.x + 30, z: RW.z - 40, yaw: 0 });
    props.hall({ x: RW.x + 80, z: RW.z - 42, yaw: 0, width: 32, depth: 13, height: 6, color: 0xc8c4bc, roof: 0x4a4c4e, door: 8, name: 'terminal' });
    props.hall({ x: RW.x - 70, z: RW.z - 44, yaw: 0, width: 24, depth: 18, height: 8, color: 0x8a8e90, roof: 0x5a5e60, door: 14, name: 'hangar' });
    // the villages, each its own
    for (const p of points) {
      if (p.owner || 'BF'.includes(p.id)) continue;
      props.rand = mulberry32(4300 + Math.round(p.x * 3 + p.z));
      const street = p.id === 'C' || p.id === 'I' ? Math.atan2(mainX(p.z + 5) - mainX(p.z - 5), 10) : p.radius ? Math.atan2(1, riverZ(p.x + 1) - riverZ(p.x)) : undefined;
      woodenVillage(props, p, { street, n: 5, skip });
    }
    // the bridgeheads: barricades at each end
    props.rand = mulberry32(4377);
    for (const c of river.crossings) for (const end of [1, -1]) {
      const z = c.z + end * (river.halfWidth + 24);
      props.jersey({ x: c.x - 8 * end, z, yaw: 0.2, length: 5 });
      for (const dx of [-14, 14]) props.hedgehog({ x: c.x + dx, z: z + 6 * end });
    }

    roadside(props, 4390, { along: (i: number, z: number) => [[westX(z), mainX(z), eastX(z)][i % 3]], points, road: (x: number, z: number) => (wet(x, z, 10) || onRunway(x, z, 20) ? 0 : roadDist(x, z)), ice: iceC, bases: [this.bases.nato, this.bases.pact] });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: this.bases.nato.x, z: BASE_Z, r: 30 }, { x: this.bases.pact.x, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || iceC(x, z) > 0.2 || wet(x, z, -6) || onRunway(x, z, 24) }];
    const update = taiga({ scene, terrain, cover, rand, bounds, palette: this.theme.terrain, avoid, forest: woodsK, maxY: 32 });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
