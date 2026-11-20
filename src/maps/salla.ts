// Salla, winter 2027 (a hypothetical war): the Finnish border crossing in eastern Lapland. The road from Kandalaksha
// and the Russian garrison at Alakurtti comes west over the border at Kelloselkä, past Salla village and on to
// Kemijärvi — the way the Red Army came in 1939, and the one road through a hundred kilometres of pine and spruce.
// On the map: that road down the middle (Alakurtti north, -z; Joutsijärvi on the Kemijärvi road south), the border
// station at Kelloselkä and Finland’s new border fence across the middle, Salla village, the fell Sallatunturi with its
// bare top east of the road, and on the Russian side old Kuolajärvi (Salla until 1944), Vuorijärvi and Lake Tolvand.
// Winter tracks up each flank, frozen lakes, bogs under the snow, forest everywhere else. NATO holds the south.
// Not a mirror: the road winds its own way, the lakes, bogs and woods lie where each half has them, and the two fells
// stand on opposite flanks (Sallatunturi east on the Finnish side, a fell over Vuorijärvi west on the Russian); but each
// side has one big fell behind a flank and one low rise on the other, about as much ice and bog on its half, and its
// three forward villages and the three on the border at the same reach of road (tools/map_fairness.py).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import { segDist, iceLakes, arcticTheme, snowSurface, snowSoft, woodenVillage, roadside, taiga } from './arctic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE = 330;
const noise = createNoise2D(2027_41);

// ---- the road from Kandalaksha down the middle, the winter tracks up the flanks, the laterals (each half its own)
const roadX = (z: number) => 28 * Math.sin(z * 0.0052) + 11 * Math.sin(z * 0.017 + 1) - 9 * Math.cos(z * 0.004);
const trackX = (rx: number, z: number) => rx + 20 * Math.sin(z * 0.009 + rx * 0.01) + 10 * Math.cos(z * 0.013);
const SEGS: [number, number][][] = [[[-SIDE, 360], [0, 300]], [[0, 300], [SIDE, 250]], [[-225, 58], [0, -10]],
  [[SIDE, -270], [0, -320]], [[0, -320], [-SIDE, -250]], [[280, -60], [0, -10]]];
const mainDist = (x: number, z: number) => Math.abs(x - roadX(z));
function roadDist(x: number, z: number) {
  let d = mainDist(x, z);
  for (const rx of [-SIDE, SIDE]) d = Math.min(d, Math.abs(x - trackX(rx, z)));
  for (const [a, b] of SEGS) d = Math.min(d, segDist(x, z, a, b));
  return d;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Joutsijärvi', x: roadX(470), z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Hautajärvi', x: trackX(-SIDE, 285), z: 285, owner: null, sector: 'west' },
  { id: 'C', name: 'Salla', x: roadX(228), z: 228, owner: null, sector: 'centre', radius: 28 },
  { id: 'D', name: 'Sallatunturi', x: trackX(SIDE, 300), z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Naruska', x: -225, z: 58, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Kelloselkä', x: roadX(-10), z: -10, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Onkamo', x: 280, z: -60, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Vuorijärvi', x: trackX(-SIDE, -250), z: -250, owner: null, sector: 'west' },
  { id: 'I', name: 'Kuolajärvi', x: roadX(-235), z: -235, owner: null, sector: 'centre', radius: 28 },
  { id: 'J', name: 'Tolvand', x: trackX(SIDE, -280), z: -280, owner: null, sector: 'east' },
  { id: 'K', name: 'Alakurtti', x: roadX(-470), z: -470, owner: 'pact', sector: 'centre' },
];
const DRY = [...points.map((p) => [p.x, p.z, 55]), [0, BASE_Z, 70], [0, -BASE_Z, 70]];
const keepClear = (x: number, z: number) => {
  let k = smoothstep(10, 26, roadDist(x, z));
  for (const [px, pz, r] of DRY) k = Math.min(k, smoothstep(r - 15, r + 15, Math.hypot(x - px, z - pz)));
  return k;
};

// frozen lakes, each half its own: Joutsijärvi by the Finnish home, Tolvand's long arm on the Russian side
const ice = iceLakes([
  { x: -140, z: 440, rx: 75, rz: 38, rot: 0.2, seed: 1 }, { x: 170, z: 150, rx: 62, rz: 34, rot: 0.5, seed: 2 }, { x: -430, z: 210, rx: 40, rz: 85, rot: 0.1, seed: 3 },
  { x: 190, z: -420, rx: 85, rz: 36, rot: -0.3, seed: 4 }, { x: -150, z: -120, rx: 56, rz: 36, rot: -0.6, seed: 5 }, { x: 440, z: -170, rx: 38, rz: 80, rot: -0.2, seed: 6 },
], keepClear);
const iceC = gridCache(ice, BOUNDS);
const bogK = (x: number, z: number) => smoothstep(0.08, 0.2, fbm(noise, x * 0.006 + 423.3, z * 0.006 - 261.1, 3)) * keepClear(x, z) * (1 - iceC(x, z));
const bogC = gridCache(bogK, BOUNDS);
/** The forest: everywhere dry, thinner on the bogs, a clearing round each village and on the fell tops (maxY). */
const woodsK = (x: number, z: number) => (fbm(noise, x * 0.008 + 908.2, z * 0.008 - 561.4, 3) > -0.1 ? 0.9 : 0.03) * smoothstep(6, 16, roadDist(x, z)) * (1 - iceC(x, z)) * (1 - 0.6 * bogC(x, z))
  * Math.min(1, ...DRY.map(([px, pz, r]) => smoothstep(r * 0.55, r + 10, Math.hypot(x - px, z - pz))));
const woodsC = gridCache(woodsK, BOUNDS);

// the fells (Sallatunturi east on the Finnish side; the fell over Vuorijärvi west on the Russian) and the low rises
const RISES: [number, number, number, number][] = [[420, 410, 95, 30], [-200, 190, 60, 10], [-60, 80, 45, 6],
  [-420, -360, 90, 29], [200, -170, 58, 10], [80, -110, 44, 6]];
function height(x: number, z: number) {
  let h = 12 + fbm(noise, x * 0.004, z * 0.004, 4) * 8 + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.8;
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  h -= smoothstep(18, 5, roadDist(x, z)) * (h - 11) * 0.5;                       // the roads keep low and level
  const lk = ice(x, z);
  if (lk > 0) h += (8 - h) * lk;                                                  // the ice: dead flat
  h -= bogK(x, z) * 1.2;
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * 20 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14;
  for (const bz of [BASE_Z, -BASE_Z]) h += (12 - h) * smoothstep(32, 16, Math.hypot(x - roadX(bz), z - bz));
  return h;
}

const softV = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, false), BOUNDS);
const softF = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, true), BOUNDS);
const natoLayout = [{ unit: 'rifles', x: roadX(BASE_Z) + 10, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'salla',
  name: 'Salla',
  description: 'Eastern Lapland in deep winter, 2027: the road from Kandalaksha over the Finnish border at Kelloselkä, past Salla and its fell. Endless pine and spruce, frozen lakes and snowed-over bogs; the roads are the only fast way through.',
  epochs: ['2027'],
  region: 'north',
  armies: { nato: ['us'], pact: ['ru'] },
  conditions: { time: 'day', weather: 'overcast' },
  climate: 'winter', // whitewash and snow smocks (render/paint.js CLIMATE; aircraft keep their paint)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 2027_41,
  height,
  soft: (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z),
  woods: (x: number, z: number) => woodsC(x, z) * 0.8,

  theme: arcticTheme({
    clouds: 0.7, sunIntensity: 1.3, fogDensity: 0.0014,
    terrain: { surface: (x: number, z: number) => snowSurface(x, z, { road: roadDist(x, z), main: mainDist(x, z) < 4.5, ice: iceC, bog: bogC, noise }) },
  }),

  bases: { nato: { x: roadX(BASE_Z), z: BASE_Z, entries: [-SIDE, 0, SIDE] }, pact: { x: roadX(-BASE_Z), z: -BASE_Z, entries: [-SIDE, 0, SIDE] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: [{ unit: 'rifles', x: roadX(-BASE_Z) - 10, z: -BASE_Z + 18, facing: 0, name: '1-ya Rota' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const skip = (x: number, z: number, r: number) => roadDist(x, z) < 9 + r || iceC(x, z) > 0.05;

    // the villages, each its own: Salla and Kuolajärvi with a church, the rest a handful of houses
    for (const p of points) {
      if (p.owner) continue;
      props.rand = mulberry32(4100 + Math.round(p.x * 3 + p.z));
      const onRoad = 'CFI'.includes(p.id);
      woodenVillage(props, p, { street: onRoad ? Math.atan2(roadX(p.z + 5) - roadX(p.z - 5), 10) : undefined, n: p.radius === 28 ? 8 : 5, big: p.radius === 28, skip });
    }
    // Kelloselkä: the border station astride the road, the barrier and the new fence either side (cut at the roads)
    const fx = roadX(-10);
    props.hall({ x: fx + 26, z: 6, yaw: 0, width: 22, depth: 10, height: 5, color: 0xc8c4b8, roof: 0x3e4044, door: 4, name: 'border station' });
    props.hall({ x: fx - 24, z: -26, yaw: 0, width: 14, depth: 8, height: 4, color: 0x7a7a6a, roof: 0x3e4044, door: 4, name: 'Russian customs post' });
    props.rand = mulberry32(4177);
    for (const [dx, dz] of [[-6, 10], [6, 14], [-5, -18], [6, -22]]) props.jersey({ x: fx + dx, z: dz, yaw: 0.1, length: 5 });
    for (const dx of [-14, 14]) props.hedgehog({ x: fx + dx, z: 2 });
    const gaps: [number, number][] = [[fx - 12, fx + 12], [trackX(-SIDE, 0) - 12, trackX(-SIDE, 0) + 12], [trackX(SIDE, 0) - 12, trackX(SIDE, 0) + 12], [-262, -238], [228, 252]];
    props.fence({ x0: -bounds.x - 30, x1: bounds.x + 30, z: 0, breaches: gaps });
    // Sallatunturi’s ski lodge, Alakurtti’s barracks, Joutsijärvi’s roadhouse
    props.hall({ x: points[3].x + 30, z: points[3].z + 32, yaw: 0.6, width: 20, depth: 12, height: 7, color: 0x6e5a44, roof: 0x3a3a3a, door: 4, name: 'ski lodge' });
    props.hall({ x: roadX(-450) + 60, z: -450, yaw: 0.2, width: 34, depth: 11, height: 7, color: 0xb8b0a0, roof: 0x4a4c4e, door: 5, name: 'barracks' });
    props.hall({ x: roadX(-420) - 56, z: -420, yaw: -0.3, width: 30, depth: 11, height: 7, color: 0xb8b0a0, roof: 0x4a4c4e, door: 5, name: 'barracks' });
    props.townHouse({ x: roadX(450) + 26, z: 452, yaw: Math.PI / 2, width: 14, depth: 9, storeys: 1, name: 'roadhouse', damaged: 0 });

    roadside(props, 4190, { along: (i: number, z: number) => [[trackX(-SIDE, z), roadX(z), trackX(SIDE, z)][i % 3]], points, road: roadDist, ice: iceC, bases: [this.bases.nato, this.bases.pact] });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: this.bases.nato.x, z: BASE_Z, r: 30 }, { x: this.bases.pact.x, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || iceC(x, z) > 0.2 }];
    const update = taiga({ scene, terrain, cover, rand, bounds, palette: this.theme.terrain, avoid, forest: woodsK, maxY: 36 });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
