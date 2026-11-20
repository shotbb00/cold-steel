// Kuusamo, winter 2027 (a hypothetical war): the lake-and-hill country of north-eastern Finland, an hour from the
// Russian border at Suoperä. Kuusamo town (wooden houses, a few blocks of flats, the church), its airport on the
// road north-east with a real 2.5 km runway, the frozen lakes all round (Kuusamojärvi, Toranki) and the forested
// fells — Ruka, Iivaara, Valtavaara, Kuntivaara. On the map: the road from the border (Suoperä, Paanajärvi and the
// Kalevala road on the Russian side, north, -z) down the middle past the airport into Kuusamo town and on south to
// the Oulu road; winter tracks up each flank. The airport is the prize in the middle: whoever holds it can fly from it.
// Not a mirror: each half has its own lakes and fells where the real ones lie (Kuusamojärvi east of the town, the
// long ice of Paanajärvi on the Russian east flank; Ruka over Naruska’s side, Valtavaara and Kuntivaara across), the
// road its own bends; but each side has a fell on each flank (one high, one lower), as much ice on its half, and its
// villages at the same reach of road from its base (tools/map_fairness.py).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache } from './gridCache.js';
import { segDist, iceLakes, arcticTheme, snowSurface, snowSoft, woodenVillage, roadside, taiga } from './arctic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE = 330;
const noise = createNoise2D(2027_42);

const roadX = (z: number) => 22 * Math.sin(z * 0.0047 + 0.8) + 14 * Math.sin(z * 0.013) - 12;
const trackX = (rx: number, z: number) => rx + 18 * Math.sin(z * 0.008 + rx * 0.02) + 12 * Math.cos(z * 0.012 + 1);
const SEGS: [number, number][][] = [[[-SIDE, 300], [0, 250]], [[0, 250], [SIDE, 320]], [[-250, 45], [0, -10]],
  [[SIDE, -320], [0, -230]], [[0, -230], [-SIDE, -260]], [[250, -70], [30, -40]], [[30, -40], [0, -40]], [[0, 32], [250, 32]]]; // (the last: the airport road)
const mainDist = (x: number, z: number) => Math.abs(x - roadX(z));
function roadDist(x: number, z: number) {
  let d = mainDist(x, z);
  for (const rx of [-SIDE, SIDE]) d = Math.min(d, Math.abs(x - trackX(rx, z)));
  for (const [a, b] of SEGS) d = Math.min(d, segDist(x, z, a, b));
  return d;
}
// the airport: its runway east–west beside the road in the middle, the terminal road along its south side
const RW = { x: 160, z: 0, len: 125, w: 14 };
const onRunway = (x: number, z: number, m = 0) => Math.abs(x - RW.x) < RW.len + m && Math.abs(z - RW.z) < RW.w + m;

const points: ControlPointDef[] = [
  { id: 'A', name: 'Oulu road', x: roadX(470), z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Toranki', x: trackX(-SIDE, 290), z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Kuusamo', x: roadX(240), z: 240, owner: null, sector: 'centre', radius: 32 },
  { id: 'D', name: 'Iivaara', x: trackX(SIDE, 320), z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Ruka', x: -250, z: 45, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Kuusamo airport', x: RW.x, z: RW.z, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Kuntivaara', x: 250, z: -70, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Juuma', x: trackX(-SIDE, -260), z: -260, owner: null, sector: 'west' },
  { id: 'I', name: 'Suoperä', x: roadX(-230), z: -230, owner: null, sector: 'centre' },
  { id: 'J', name: 'Paanajärvi', x: trackX(SIDE, -320), z: -320, owner: null, sector: 'east' },
  { id: 'K', name: 'Kalevala road', x: roadX(-470), z: -470, owner: 'pact', sector: 'centre' },
];
const DRY = [...points.map((p) => [p.x, p.z, 55]), [0, BASE_Z, 70], [0, -BASE_Z, 70]];
const keepClear = (x: number, z: number) => {
  let k = smoothstep(10, 26, roadDist(x, z));
  for (const [px, pz, r] of DRY) k = Math.min(k, smoothstep(r - 15, r + 15, Math.hypot(x - px, z - pz)));
  return Math.min(k, onRunway(x, z, 30) ? 0 : 1);
};
const ice = iceLakes([
  { x: 330, z: 170, rx: 110, rz: 50, rot: 0.3, seed: 1 }, { x: -170, z: 360, rx: 45, rz: 28, rot: -0.4, seed: 2 }, { x: -130, z: 150, rx: 50, rz: 30, rot: 0.6, seed: 3 },
  { x: 250, z: -420, rx: 130, rz: 30, rot: -0.2, seed: 4 }, { x: -150, z: -150, rx: 60, rz: 38, rot: 0.2, seed: 5 }, { x: -440, z: -100, rx: 36, rz: 46, rot: 0.1, seed: 6 },
], keepClear);
const iceC = gridCache(ice, BOUNDS);
const bogK = (x: number, z: number) => smoothstep(0.1, 0.22, fbm(noise, x * 0.006 + 423.3, z * 0.006 - 261.1, 3)) * keepClear(x, z) * (1 - iceC(x, z));
const bogC = gridCache(bogK, BOUNDS);
const woodsK = (x: number, z: number) => (onRunway(x, z, 26) ? 0 : 1) * (fbm(noise, x * 0.008 + 908.2, z * 0.008 - 561.4, 3) > -0.1 ? 0.9 : 0.03) * smoothstep(6, 16, roadDist(x, z)) * (1 - iceC(x, z)) * (1 - 0.6 * bogC(x, z))
  * Math.min(1, ...DRY.map(([px, pz, r]) => smoothstep(r * 0.55, r + 10, Math.hypot(x - px, z - pz))));
const woodsC = gridCache(woodsK, BOUNDS);

// the fells: Ruka and Iivaara on the Finnish side, Valtavaara and Kuntivaara across
const RISES: [number, number, number, number][] = [[-310, 120, 70, 24], [440, 380, 80, 26], [60, 330, 50, 7],
  [-410, -330, 80, 26], [340, -150, 70, 23], [-80, -330, 50, 7]];
function height(x: number, z: number) {
  let h = 12 + fbm(noise, x * 0.004, z * 0.004, 4) * 9 + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.8;
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  h -= smoothstep(18, 5, roadDist(x, z)) * (h - 11) * 0.5;
  const rw = smoothstep(RW.w + 30, RW.w + 4, Math.abs(z - RW.z)) * smoothstep(RW.len + 40, RW.len + 4, Math.abs(x - RW.x));
  h += (11 - h) * rw;                                                             // the airport graded flat
  const lk = ice(x, z);
  if (lk > 0) h += (8 - h) * lk;
  h -= bogK(x, z) * 1.2;
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * 20 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14;
  for (const bz of [BASE_Z, -BASE_Z]) h += (12 - h) * smoothstep(32, 16, Math.hypot(x - roadX(bz), z - bz));
  return h;
}

const softV = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, false), BOUNDS);
const softF = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, true), BOUNDS);

export default {
  id: 'kuusamo',
  name: 'Kuusamo',
  description: 'North-eastern Finland in winter, 2027: Kuusamo town and its airport on the road from the Suoperä border crossing, frozen lakes and forested fells all round. Hold the runway, or take it from them.',
  epochs: ['2027'],
  region: 'north',
  armies: { nato: ['us'], pact: ['ru'] },
  conditions: { time: 'day', weather: 'clear' },
  climate: 'winter', // whitewash and snow smocks (render/paint.js CLIMATE; aircraft keep their paint)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 2027_42,
  height,
  soft: (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z),
  woods: (x: number, z: number) => woodsC(x, z) * 0.8,

  theme: arcticTheme({
    clouds: 0.25, sunIntensity: 1.7, skyTop: 0x5a7aa8, sunDir: [-0.4, 0.25, 0.85],
    terrain: {
      surface(x: number, z: number) {
        if (onRunway(x, z)) return [Math.abs(z - RW.z) < 0.4 && Math.floor(x / 12) % 2 === 0 ? 0xe8e8e4 : 0x6e6e6c, 0.95]; // the runway, cleared, its centre line
        return snowSurface(x, z, { road: roadDist(x, z), main: mainDist(x, z) < 4.5, ice: iceC, bog: bogC, noise });
      },
    },
  }),

  bases: { nato: { x: roadX(BASE_Z), z: BASE_Z, entries: [-SIDE, 0, SIDE] }, pact: { x: roadX(-BASE_Z), z: -BASE_Z, entries: [-SIDE, 0, SIDE] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: roadX(BASE_Z) + 10, z: BASE_Z - 18, facing: Math.PI, name: '1st Platoon' }],
    pact: [{ unit: 'rifles', x: roadX(-BASE_Z) - 10, z: -BASE_Z + 18, facing: 0, name: '1-ya Rota' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const skip = (x: number, z: number, r: number) => roadDist(x, z) < 9 + r || iceC(x, z) > 0.05 || onRunway(x, z, r + 10);

    // Kuusamo town: wooden houses on a grid either side of the road, three blocks of flats, the church
    props.rand = mulberry32(4201);
    const r0 = props.rand, c = points[2];
    const taken: number[][] = [[roadX(c.z) - 40, c.z - 8, 26]];
    props.church({ x: taken[0][0], z: taken[0][1], yaw: Math.PI / 2 });
    for (const [dx, dz] of [[52, -100], [-58, 100], [86, 96]]) {
      const x = roadX(c.z + dz) + dx, z = c.z + dz;
      if (skip(x, z, 14)) continue;
      flats(props, { x, z, yaw: 0, storeys: 3, width: 26, depth: 11 });
      taken.push([x, z, 24]);
    }
    for (let gx = -130; gx <= 130; gx += 22) for (const gz of [-70, -44, -18, 18, 44, 70]) {
      const x = roadX(c.z + gz) + gx + (r0() - 0.5) * 4, z = c.z + gz + (r0() - 0.5) * 4;
      if (Math.abs(gx) < 22 || skip(x, z, 6) || r0() < 0.25 || Math.hypot(x - c.x, z - c.z) < 20 || taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < tr)) continue;
      props.townHouse({ x, z, yaw: gx < 0 ? Math.PI / 2 : -Math.PI / 2, width: 8 + r0() * 3, depth: 7 + r0() * 2, storeys: r0() < 0.6 ? 1 : 2, name: 'house', damaged: 0 });
    }
    // the airport: terminal, tower and hangar beside the runway, the apron in front
    props.controlTower({ x: RW.x + 30, z: RW.z + 50, yaw: Math.PI });
    props.hall({ x: RW.x + 80, z: RW.z + 54, yaw: 0, width: 36, depth: 14, height: 6, color: 0xc8c4bc, roof: 0x4a4c4e, door: 8, name: 'terminal' });
    props.hall({ x: RW.x - 70, z: RW.z + 56, yaw: 0, width: 26, depth: 18, height: 8, color: 0x8a8e90, roof: 0x5a5e60, door: 14, name: 'hangar' });
    // the villages
    for (const p of points) {
      if (p.owner || 'CF'.includes(p.id)) continue;
      props.rand = mulberry32(4200 + Math.round(p.x * 3 + p.z));
      woodenVillage(props, p, { street: p.id === 'I' ? Math.atan2(roadX(p.z + 5) - roadX(p.z - 5), 10) : undefined, n: 5, skip });
    }
    // Suoperä: the border post
    const ix = roadX(-230);
    props.hall({ x: ix + 26, z: -200, yaw: 0, width: 18, depth: 9, height: 5, color: 0xc8c4b8, roof: 0x3e4044, door: 4, name: 'border station' });
    props.rand = mulberry32(4277);
    for (const [dx, dz] of [[-6, -210], [6, -214]]) props.jersey({ x: ix + dx, z: dz, yaw: 0.1, length: 5 });
    props.hall({ x: points[4].x + 30, z: points[4].z + 36, yaw: 0.3, width: 22, depth: 12, height: 8, color: 0x6e5a44, roof: 0x3a3a3a, door: 4, name: 'ski lodge' });

    roadside(props, 4290, { along: (i: number, z: number) => [[trackX(-SIDE, z), roadX(z), trackX(SIDE, z)][i % 3]], points, road: (x: number, z: number) => Math.min(roadDist(x, z), onRunway(x, z, 20) ? 0 : 99), ice: iceC, bases: [this.bases.nato, this.bases.pact] });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: this.bases.nato.x, z: BASE_Z, r: 30 }, { x: this.bases.pact.x, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || iceC(x, z) > 0.2 || onRunway(x, z, 24) }];
    const update = taiga({ scene, terrain, cover, rand, bounds, palette: this.theme.terrain, avoid, forest: woodsK, maxY: 34 });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
