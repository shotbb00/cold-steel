// The Biebrza Marshes, 2027 (a hypothetical war): the great wetland on the western flank of the Suwałki
// Gap. Sedge and reed beds as far as you can see, shallow pools that men and vehicles wade only slowly,
// the deep oxbows of the river that nothing crosses, birch and alder carr, and the raised causeway roads
// — the only fast way through. In the middle the Tsar's old fortress of Osowiec, its brick ruins and
// earth ramparts guarding the causeway. Villages on the islands of dry ground. NATO holds the south,
// Russia comes from the north. Not a mirror: the oxbows, pools and carr lie where they fall in each
// half and the causeways wind their own ways through each side's villages; but each side gets three
// causeways, the same number and sizes of pools, its villages at the same distances, and the fort in
// the middle is round.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, modernVillage, coverSites, vegetation } from './common2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const ROADS = [-SIDE_X, 0, SIDE_X];
const noise = createNoise2D(2032);

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  pt('A', 'Mońki road', 0, 470, 'centre'),
  pt('B', 'Dolistowo', -350, 310, 'west'),
  pt('C', 'Goniądz', 45, 225, 'centre'),
  pt('D', 'Mścichy', 315, 300, 'east'),
  pt('E', 'Brzostowo', -295, 130, 'west', { radius: 22 }),
  pt('F', 'Twierdza Osowiec', 0, 0, 'centre', { radius: 26 }),
  pt('G', 'Burzyn', 345, -95, 'east', { radius: 22 }),
  pt('H', 'Dobarz', -320, -280, 'west'),
  pt('I', 'Rutkowskie', -45, -240, 'centre'),
  pt('J', 'Laskowiec', 295, -335, 'east'),
  pt('K', 'Grajewo road', 0, -470, 'centre'),
];
const at = (id) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
// the causeways, south to north, each bending through its sector's villages (straight through the fort's gate)
const LINES = [
  [[-SIDE_X, 640], [-SIDE_X, 520], at('B'), at('E'), [-335, -20], at('H'), [-SIDE_X, -520], [-SIDE_X, -640]],
  [[0, 640], at('A'), at('C'), [0, 90], [0, -90], at('I'), at('K'), [0, -640]],
  [[SIDE_X, 640], [SIDE_X, 520], at('D'), [350, 120], at('G'), at('J'), [SIDE_X, -520], [SIDE_X, -640]],
];
/** The causeway's x at z (the lines run monotonically south to north). */
const lineX = (l, z) => { for (let i = 0; i < l.length - 1; i++) if (z <= l[i][1] && z >= l[i + 1][1]) return l[i][0] + (l[i + 1][0] - l[i][0]) * (z - l[i][1]) / (l[i + 1][1] - l[i][1]); return l[0][0]; };
const causewayD = (x, z) => Math.min(...LINES.map((l) => Math.abs(x - lineX(l, z))));
const causeway = (x, z) => causewayD(x, z) < 7;

// the water, each half its own: the river's deep oxbows near the middle, the shallow marsh pools everywhere
// (the same number of pools of the same sizes each side, wherever they fall)
const WATER = [
  { x: -170, z: 20, rx: 70, rz: 18, rot: 0.15, depth: 3.5, seed: 1 },
  { x: -470, z: 40, rx: 50, rz: 20, rot: -0.2, depth: 3.2, seed: 2 },
  { x: 170, z: 30, rx: 60, rz: 16, rot: -0.1, depth: 3.4, seed: 3 },
  { x: -250, z: -38, rx: 62, rz: 17, rot: -0.25, depth: 3.5, seed: 4 },
  { x: 115, z: -28, rx: 74, rz: 18, rot: 0.2, depth: 3.4, seed: 5 },
  { x: 440, z: -50, rx: 46, rz: 19, rot: 0.35, depth: 3.2, seed: 6 },
];
for (const [s, seed] of [[1, 2032], [-1, 2034]]) {
  const rr = mulberry32(seed);
  for (let i = 0, n = 0; n < 21 && i < 600; i++) { // shallow pools, away from the causeways, the villages and the bases
    const x = (rr() * 2 - 1) * 470, z = s * (60 + rr() * 380), rx = 18 + rr() * 30, rz = 12 + rr() * 22;
    if (causewayD(x, z) < rx + 22 || Math.hypot(x, z - s * BASE_Z) < 90 || points.some((p) => Math.hypot(p.x - x, p.z - z) < rx + 30)
      || WATER.some((l) => Math.hypot(l.x - x, l.z - z) < l.rx + rx + 25)) continue;
    WATER.push({ x, z, rx, rz, rot: rr() * 3, depth: 0.7, seed: WATER.length + 1 });
    n++;
  }
}
const water = createLakes({ lakes: WATER });

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = 1.9 + fbm(noise, x * 0.006, z * 0.006, 4) * 1.4;                                          // the flat peat
  h += Math.max(0, fbm(noise, x * 0.003 + 40, z * 0.003, 3)) * 5;                                  // the dry islands
  h += smoothstep(520, 640, ax) * 10 + smoothstep(560, 680, az) * 10;
  // Osowiec: the ramparts round the fort
  const rf = Math.hypot(x, z);
  h += 3.2 * Math.exp(-((rf - 70) ** 2) / 90) * (Math.abs(x) < 10 ? 0 : 1);
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  h = water.carve(x, z, Math.max(1.4, h));
  if (az < 620 && causeway(x, z)) h = Math.max(h, 2.6); // the causeways stand above the water
  return h;
}

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];

export default {
  id: 'biebrza-marshes',
  name: 'Biebrza Marshes',
  epochs: ['2027'],
  description: 'The great wetland on the flank of the gap: reed beds, pools that slow anyone wading them, deep oxbows, and the raised causeways — the only fast way through, past the old fortress of Osowiec.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2032,
  height,
  river: water,
  fields: createFields({ seed: 2032, cell: 70 }),

  theme: theme2027({
    fogColor: 0xb0b8b4, fogDensity: 0.0019, clouds: 0.55, sunIntensity: 2.1,
    terrain: {
      grass: '#66703e', grassAlt: '#5a6a3a', dryGrass: '#9a8c58', dirt: '#5a4e3a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x, z, y) {
        if (Math.abs(z) < 620 && causeway(x, z)) return [0x5a5850, 0.95];   // gravel causeways
        if (y < 2.2) return [0x7a7a4a, 0.6];                                // sedge and reed beds
        return null;
      },
    },
  }),

  bases: { nato: { x: 0, z: BASE_Z, entries: ROADS }, pact: { x: 0, z: -BASE_Z, entries: ROADS } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x, z, m = 1.15) => water.q(x, z) < m;
    const skip = (x, z, r) => wet(x, z, 1.3) || causewayD(x, z) < 7 + r;

    // Osowiec: the brick ruins of the fort's barracks and casemates inside the ramparts (as the war of
    // 1915 left them: no two alike), the gate walls either side of the causeway
    props.rand = mulberry32(3201);
    for (const [x, z, w, yaw] of [[-30, 30, 30, 0.3], [30, 40, 22, -0.3], [-40, -5, 18, 0.3], [45, 5, 16, -0.3], [28, -34, 26, 0.5], [-34, -42, 14, -0.1], [-46, 14, 12, 1.2]]) {
      props.ruinBlock({ x, z, yaw, width: w, depth: 10, storeys: 1 + Math.floor(props.rand() * 2), ruin: 0.35 + props.rand() * 0.2, name: 'fort casemate' });
    }
    for (const [x, z, yaw] of [[-55, 52, 0.8], [58, 48, -0.8], [55, -50, 0.75], [-60, -44, -0.85]]) props.wall({ x, z, yaw, length: 16, height: 2 });
    // the causeway bridges' barricades
    for (const l of LINES) for (const z of [85, -85]) props.jersey({ x: lineX(l, z) - 3, z, yaw: 0.1 + (z < 0 ? Math.PI : 0), length: 5 });
    for (const p of points) { // each village its own
      if (p.id === 'A' || p.id === 'F' || p.id === 'K') continue;
      props.rand = mulberry32(3250 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, n: 5, church: 'BCHI'.includes(p.id) });
    }
    // birdwatching towers over the reeds
    for (const [x, z] of [[-240, 180], [240, 380], [-420, 300], [180, -200], [-150, -390], [430, -260]]) if (!wet(x, z)) props.highSeat({ x, z, yaw: z < 0 ? Math.PI : 0 });
    coverSites(props, rand, bounds, (x, z) => !wet(x, z, 1.5) && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPoint(x, z, 40) && causewayD(x, z) > 7, 180, ['hay', 'fieldwall', 'hay', 'rocks', 'wrecks', 'farm'], buildSite, false);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    water.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => wet(x, z, 1.02) || (Math.abs(z) < 620 && causeway(x, z)) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4500, hedges: 0, broadleaf: 0.7, autumn: 0.1,
      forest: (x, z) => {
        if (wet(x, z, 1.02)) return -1;
        if (Math.abs(x) > 460) return 0.8;
        const carr = noise(x * 0.008 + 20, z * 0.008) > 0.12;   // birch and alder carr
        return carr ? 0.6 : 0.05;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
