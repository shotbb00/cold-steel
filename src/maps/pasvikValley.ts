// The Pasvik valley and Kirkenes, winter 2027 (a hypothetical war): the far north-east corner of Norway, where NATO
// meets Russia on a 200 km border. The Pasvik river, frozen into a chain of long lakes, runs down the border valley
// past Svanvik on the Norwegian bank and the nickel town of Nikel on the Russian; the E105 runs from Kirkenes through
// Hesseng to the Storskog crossing and on to Borisoglebsky and Zapolyarny; Kirkenes with its iron-ore harbour (the
// Sydvaranger pellet plant, the loading pier) sits on Bøkfjorden, Pechenga on its own fjord across the border.
// On the map: NATO holds the south (Bjørnevatn and its mine, +z), Russia comes from the north (the Zapolyarny road);
// the frozen Pasvik down the west flank, the E105 through the middle, the fjords’ open water along the east edge
// (Bøkfjorden by Kirkenes, Jarfjord’s neck of land at the border, Pechenga Bay beyond), birch scrub and pine on
// the rises. Not a mirror: the Pasvik winds its own way, each fjord its own shore (Bøkfjorden broad and short,
// Pechenga Bay long and narrow), Kirkenes and Nikel are different towns; but each side has a valley village on the
// west track, a road town in the middle, a fjord-side town on the east, a fell on one flank and a low rise on the
// other, and the same reach of road to its points (tools/map_fairness.py).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createLakes } from '../world/Lakes.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache } from './gridCache.js';
import { segDist, iceLakes, arcticTheme, snowSurface, snowSoft, woodenVillage, roadside, taiga } from './arctic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SIDE = 320;
const noise = createNoise2D(2027_44);

// the fjords' open water along the east edge (salt water: it does not freeze)
const fjords = createLakes({ lakes: [
  { x: 560, z: 250, rx: 140, rz: 150, rot: 0.2, depth: 8, seed: 1 },     // Bøkfjorden
  { x: 560, z: -330, rx: 120, rz: 170, rot: -0.15, depth: 8, seed: 2 },  // Pechenga Bay
] });
const wet = (x: number, z: number, m = 1.15) => fjords.q(x, z) < m;

const roadX = (z: number) => 24 * Math.sin(z * 0.0051 + 0.3) + 12 * Math.sin(z * 0.016) - 14;
const westX = (z: number) => -SIDE + 18 * Math.sin(z * 0.008 + 0.5) + 10 * Math.cos(z * 0.014);
const eastX = (z: number) => SIDE - 10 + 22 * Math.sin(z * 0.007 + 1.4) - 14 * Math.cos(z * 0.011); // (along the fjord shore)
const SEGS: [number, number][][] = [[[-SIDE, 340], [0, 280]], [[0, 280], [SIDE, 310]], [[-250, 50], [0, -10]],
  [[SIDE, -280], [0, -240]], [[0, -240], [-SIDE, -290]], [[230, -40], [0, -10]]];
const mainDist = (x: number, z: number) => Math.abs(x - roadX(z));
function roadDist(x: number, z: number) {
  let d = Math.min(mainDist(x, z), Math.abs(x - westX(z)), Math.abs(x - eastX(z)));
  for (const [a, b] of SEGS) d = Math.min(d, segDist(x, z, a, b));
  return d;
}
// the Pasvik: frozen, a chain of long lakes down the west flank, each half its own
// each side's airfield (systems/Airfields.js): a strip graded flat behind its line, kept clear — the runway 55 m behind the tower
const AIR = [{ faction: 'nato', x: 200, z: 345, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -170, z: -375, yaw: -Math.PI / 2, large: false }];
const STRIPS = AIR.map((a) => ({ x: a.x, z: a.z + (a.faction === 'nato' ? 55 : -55) }));
/** 0…1: on an airfield's strip, tower and hangars (and `m` m round them). */
const onAir = (x: number, z: number, m = 0) => AIR.some((a, i) => Math.abs(x - a.x) < 125 + m && Math.abs(z - (a.z + STRIPS[i].z) / 2) < 50 + m);
const PASVIK = (z: number) => -420 + 26 * Math.sin(z * 0.006 + 1) + 14 * Math.sin(z * 0.017);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Bjørnevatn', x: roadX(470), z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Svanvik', x: westX(320), z: 320, owner: null, sector: 'west' },
  { id: 'C', name: 'Hesseng', x: roadX(250), z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Kirkenes', x: eastX(280), z: 280, owner: null, sector: 'east', radius: 30 },
  { id: 'E', name: 'Elvenes', x: -240, z: 50, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Storskog', x: roadX(-10), z: -10, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Jarfjord', x: 230, z: -40, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Nikel', x: westX(-290), z: -290, owner: null, sector: 'west', radius: 30 },
  { id: 'I', name: 'Borisoglebsky', x: roadX(-240), z: -240, owner: null, sector: 'centre' },
  { id: 'J', name: 'Pechenga', x: eastX(-300), z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Zapolyarny road', x: roadX(-470), z: -470, owner: 'pact', sector: 'centre' },
];
const DRY = [...points.map((p) => [p.x, p.z, 55]), [0, BASE_Z, 70], [0, -BASE_Z, 70]];
const keepClear = (x: number, z: number) => {
  let k = smoothstep(10, 26, roadDist(x, z));
  for (const [px, pz, r] of DRY) k = Math.min(k, smoothstep(r - 15, r + 15, Math.hypot(x - px, z - pz)));
  return Math.min(k, onAir(x, z, 30) ? 0 : 1);
};
const ice = iceLakes([
  { x: PASVIK(420), z: 420, rx: 34, rz: 110, rot: 0.1, seed: 1 }, { x: PASVIK(170), z: 170, rx: 42, rz: 95, rot: -0.15, seed: 2 }, { x: -60, z: 380, rx: 45, rz: 26, rot: 0.4, seed: 3 },
  { x: PASVIK(-150), z: -150, rx: 38, rz: 120, rot: 0.12, seed: 4 }, { x: PASVIK(-430), z: -430, rx: 44, rz: 85, rot: -0.1, seed: 5 }, { x: 150, z: -330, rx: 40, rz: 26, rot: -0.3, seed: 6 },
], keepClear);
const iceC = gridCache(ice, BOUNDS);
const bogK = (x: number, z: number) => smoothstep(0.1, 0.22, fbm(noise, x * 0.006 + 423.3, z * 0.006 - 261.1, 3)) * keepClear(x, z) * (1 - iceC(x, z)) * (wet(x, z, 1.5) ? 0 : 1);
const bogC = gridCache(bogK, BOUNDS);
// birch scrub and pine on the rises: thinner than Lapland’s forest, the tree line is near
const woodsK = (x: number, z: number) => (wet(x, z, 1.25) ? -1 : 1) * (fbm(noise, x * 0.008 + 908.2, z * 0.008 - 561.4, 3) > 0 ? 0.8 : 0.03)
  * smoothstep(6, 16, roadDist(x, z)) * (1 - iceC(x, z)) * (1 - 0.7 * bogC(x, z)) * Math.min(1, ...DRY.map(([px, pz, r]) => smoothstep(r * 0.55, r + 10, Math.hypot(x - px, z - pz))));
const woodsC = gridCache((x: number, z: number) => Math.max(0, woodsK(x, z)), BOUNDS);

// the fells: south-west of Kirkenes on the Norwegian side, over Pechenga on the Russian; a low rise each
const RISES: [number, number, number, number][] = [[-170, 420, 85, 27], [190, 140, 55, 9], [160, -430, 85, 26], [-170, -110, 55, 9]];
function height(x: number, z: number) {
  let h = 14 + fbm(noise, x * 0.004, z * 0.004, 4) * 9 + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.8;
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  h -= 6 * Math.exp(-(((x - PASVIK(z)) / 90) ** 2));                                // the Pasvik valley
  h -= smoothstep(18, 5, roadDist(x, z)) * (h - 12) * 0.5;
  const lk = ice(x, z);
  if (lk > 0) h += (7 - h) * lk;
  h -= bogK(x, z) * 1.2;
  for (const s of STRIPS) h += (12 - h) * smoothstep(60, 20, Math.abs(z - s.z)) * smoothstep(170, 130, Math.abs(x - s.x)); // the airfields graded flat
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14 + smoothstep(-BOUNDS.x + 20, -BOUNDS.x - 120, x) * 20;
  for (const bz of [BASE_Z, -BASE_Z]) h += (12 - h) * smoothstep(32, 16, Math.hypot(x - roadX(bz), z - bz));
  return fjords.carve(x, z, Math.max(1.4, h));
}

const softV = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, false), BOUNDS);
const softF = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, true), BOUNDS);

export default {
  id: 'pasvik-valley',
  name: 'Pasvik Valley',
  description: 'The Norwegian Arctic on the Russian border, winter 2027: the frozen Pasvik down the border valley, the E105 from Kirkenes to the Storskog crossing, Kirkenes and its iron-ore harbour on the fjord. Birch scrub and pine, snow and ice.',
  epochs: ['2027'],
  region: 'north',
  armies: { nato: ['us'], pact: ['ru'] },
  conditions: { time: 'day', weather: 'overcast' },
  climate: 'winter', // whitewash and snow smocks (render/paint.js CLIMATE; aircraft keep their paint)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 2027_44,
  height,
  river: fjords,
  airfields: AIR,
  soft: (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z),
  woods: (x: number, z: number) => woodsC(x, z) * 0.65, // (scrub: you see a little further through it)

  theme: arcticTheme({
    clouds: 0.75, sunIntensity: 1.2, fogDensity: 0.0013, skyTop: 0x62788e,
    terrain: {
      surface(x: number, z: number, y: number) {
        if (y < 1.2 && wet(x, z, 1.4)) return [0x6e6c66, 0.8];                          // the dark tide-washed shore
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
    const skip = (x: number, z: number, r: number) => roadDist(x, z) < 9 + r || iceC(x, z) > 0.05 || wet(x, z, 1.2 + r * 0.004) || onAir(x, z, r);

    // Kirkenes: wooden houses on the slope above the harbour, a few flats, the church; the ore harbour on the shore —
    // the pellet plant, the silos, the conveyor out to the loading pier
    const d = points[3];
    props.rand = mulberry32(4401);
    const r0 = props.rand;
    for (let i = 0; i < 26; i++) {
      const x = d.x - 150 + r0() * 170, z = d.z - 90 + r0() * 130;
      if (skip(x, z, 6) || Math.hypot(x - d.x, z - d.z) < 24) continue;
      props.townHouse({ x, z, yaw: r0() < 0.5 ? 0 : Math.PI / 2, width: 8 + r0() * 3, depth: 7 + r0() * 2, storeys: r0() < 0.5 ? 1 : 2, name: 'house', damaged: 0 });
    }
    for (const [dx, dz] of [[-70, -60], [-110, 40]]) if (!skip(d.x + dx, d.z + dz, 14)) flats(props, { x: d.x + dx, z: d.z + dz, yaw: Math.PI / 2, storeys: 3, width: 24, depth: 11 });
    props.church({ x: d.x - 100, z: d.z + 10, yaw: Math.PI / 2 });
    const hx = d.x + 50, hz = d.z - 70;
    props.hall({ x: hx, z: hz, yaw: Math.PI / 2, width: 36, depth: 16, height: 12, color: 0x6e6a64, roof: 0x3e4044, door: 10, name: 'Sydvaranger pellet plant' });
    props.tanks({ x: hx - 26, z: hz + 30, yaw: 0, count: 3, radius: 4, height: 16, color: 0x8e8e88 });
    props.chimney({ x: hx - 10, z: hz - 26, height: 40 });
    props.conveyor({ x0: hx + 10, z0: hz - 6, y0: 10, x1: hx + 70, z1: hz - 20, y1: 12 });
    // Nikel: the smelter’s stacks and Soviet blocks of flats by the Pasvik
    const h = points[7];
    props.rand = mulberry32(4402);
    for (const [dx, dz] of [[60, -40], [70, 0], [60, 40], [-20, -70], [30, -80]]) if (!skip(h.x + dx, h.z + dz, 14)) flats(props, { x: h.x + dx, z: h.z + dz, yaw: Math.PI / 2, storeys: 5, width: 30, depth: 11 });
    props.hall({ x: h.x + 100, z: h.z + 70, yaw: 0.3, width: 40, depth: 18, height: 14, color: 0x5e5a54, roof: 0x3a3a3a, door: 10, name: 'nickel smelter' });
    for (const dx of [0, 24]) props.chimney({ x: h.x + 90 + dx, z: h.z + 100, height: 50 });
    // Storskog: the border station; Borisoglebsky’s checkpoint; the villages
    const fx = roadX(-10);
    props.hall({ x: fx + 26, z: 12, yaw: 0, width: 22, depth: 10, height: 5, color: 0xc8c4b8, roof: 0x3e4044, door: 4, name: 'border station' });
    props.rand = mulberry32(4477);
    for (const [dx, dz] of [[-6, 8], [6, 12], [-5, -22], [6, -26]]) props.jersey({ x: fx + dx, z: dz, yaw: 0.1, length: 5 });
    const gaps: [number, number][] = [[fx - 12, fx + 12], [westX(0) - 12, westX(0) + 12], [eastX(0) - 12, eastX(0) + 12], [-252, -228], [218, 242], [PASVIK(0) - 50, PASVIK(0) + 50]];
    props.fence({ x0: -bounds.x - 30, x1: 400, z: 0, breaches: gaps });
    for (const p of points) {
      if (p.owner || 'DH'.includes(p.id)) continue;
      props.rand = mulberry32(4400 + Math.round(p.x * 3 + p.z));
      woodenVillage(props, p, { street: 'CFI'.includes(p.id) ? Math.atan2(roadX(p.z + 5) - roadX(p.z - 5), 10) : undefined, n: p.id === 'J' ? 6 : 5, skip });
    }

    roadside(props, 4490, { along: (i: number, z: number) => [[westX(z), roadX(z), eastX(z)][i % 3]], points, road: (x: number, z: number) => (wet(x, z, 1.3) || onAir(x, z, 20) ? 0 : roadDist(x, z)), ice: iceC, bases: [this.bases.nato, this.bases.pact] });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();
    fjords.build(scene);

    const avoid = [{ x: this.bases.nato.x, z: BASE_Z, r: 30 }, { x: this.bases.pact.x, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || iceC(x, z) > 0.2 || wet(x, z, 1.05) || onAir(x, z, 10) }];
    const update = taiga({ scene, terrain, cover, rand, bounds, palette: this.theme.terrain, avoid, forest: woodsK, maxY: 34, trees: 7000, size: 0.65 });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
