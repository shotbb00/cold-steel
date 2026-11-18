// The Augustów Canal, 2027 (a hypothetical war): the old canal through the Augustów Primeval Forest,
// twenty kilometres of pine and spruce on the road from Belarus to the Suwałki Gap. Dense forest
// everywhere, cut by sandy tracks; the canal runs across the middle with its locks — the only ways
// over — and the forest villages sit in their clearings. Short sight lines, ambushes on the tracks,
// drones that can't see under the canopy. NATO holds the south bank, Russia comes through the forest
// from the north. Not a mirror: the canal bends its own way, each side's sandy tracks wind through
// their own villages, the lock-keepers' houses stand on one bank or the other; but each side has a
// track to each of the three locks, villages in clearings at the same distances, and the same forest.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, modernVillage, coverSites, vegetation } from './common2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(2030);
const canalZ = (x) => 16 * Math.sin(x * 0.006) + 5 * Math.sin(x * 0.019) + 10 * Math.cos(x * 0.008 + 0.9) - 6;
const canal = createRiver({
  path: canalZ, halfWidth: 8, level: 0, depth: 2.4, valley: 30,
  crossings: [
    { name: 'Swoboda lock', x: -365, kind: 'bridge', width: 6 },
    { name: 'Przewięź lock', x: 35, kind: 'bridge', width: 7 },
    { name: 'Gorczyca lock', x: 300, kind: 'bridge', width: 6 },
  ],
});
const away = (x, z) => Math.abs(z - canalZ(x));

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = 3 + fbm(noise, x * 0.005, z * 0.005, 5) * 5;                                   // the sandy forest floor
  h += Math.max(0, ridged(noise, x * 0.014 + 5, z * 0.014, 3) - 0.5) * 6;                 // dunes and ridges under the pines
  h *= smoothstep(15, 70, away(x, z)) * 0.8 + 0.2;
  h += smoothstep(520, 640, ax) * 12 + smoothstep(560, 680, az) * 12;
  for (const bz of [BASE_Z, -BASE_Z]) h += (3 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return canal.carve(x, z, Math.max(1.4, h));
}

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  pt('A', 'Płaska', 0, 470, 'centre'),
  pt('B', 'Mikaszówka', -300, 300, 'west'),
  pt('C', 'Rudawka', 40, 245, 'centre'),
  pt('D', 'Gruszki', 355, 255, 'east'),
  pt('E', 'Swoboda lock', -365, canalZ(-365), 'west', { radius: 22 }),
  pt('F', 'Przewięź lock', 35, canalZ(35), 'centre', { radius: 22 }),
  pt('G', 'Gorczyca lock', 300, canalZ(300), 'east', { radius: 22 }),
  pt('H', 'Studzieniczna', -365, -255, 'west'),
  pt('I', 'Kurianka', -50, -230, 'centre'),
  pt('J', 'Sucha Rzeczka', 290, -320, 'east'),
  pt('K', 'Lipsk road', 0, -470, 'centre'),
];

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];
// the sandy tracks: one up each sector from each side, through its villages to its lock
const at = (id) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const TRACKS = [
  [[-SIDE_X, 560], at('B'), [-345, 150], at('E'), [-340, -120], at('H'), [-330, -560]],
  [[0, 560], at('A'), at('C'), [15, 120], at('F'), [-30, -110], at('I'), at('K'), [0, -560]],
  [[SIDE_X, 560], at('D'), [320, 130], at('G'), [305, -150], at('J'), [SIDE_X, -560]],
];
function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const trackD = (x, z) => { let d = Infinity; for (const l of TRACKS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1])); return d; };
const track = (x, z) => trackD(x, z) < 5;
const clearing = (x, z) => points.some((p) => Math.hypot(p.x - x, p.z - z) < (p.radius ? 40 : 75));

export default {
  id: 'augustow-canal',
  name: 'Augustów Canal',
  epochs: ['2027'],
  description: 'The old canal through the Augustów Forest: pine and spruce everywhere, sandy tracks, villages in their clearings — and three locks, the only ways over the water.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2030,
  height,
  river: canal,
  bridgeAt: (x, z) => canal.bridgeAt(x, z),
  fields: createFields({ seed: 2030, cell: 70 }),

  theme: theme2027({
    fogColor: 0x9aa8a8, fogDensity: 0.0019, clouds: 0.6, sunIntensity: 2.0,
    terrain: {
      grass: '#4e5c30', grassAlt: '#46542c', dryGrass: '#8a7a4a', dirt: '#6a5a40',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x, z) {
        if (track(x, z)) return [0x8a7a5a, 0.85];                     // sandy tracks
        if (!clearing(x, z) && away(x, z) > 12) return [0x3e4428, 0.55]; // needles and moss on the forest floor
        return null;
      },
    },
  }),

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
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
    const wet = (x, z, r = 0) => away(x, z) < canal.halfWidth + 4 + r;
    const skip = (x, z, r) => wet(x, z, r) || track(x, z);

    for (const p of points) { // each village its own street
      if (p.radius) continue;
      props.rand = mulberry32(3050 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, n: 5, church: 'ACIK'.includes(p.id), street: p.z > 0 ? 0.25 : -0.4 });
    }
    // the locks: stone walls along the chamber, a barrier on the track each side, the lock-keeper's
    // house on one bank (both at Przewięź)
    for (const c of canal.crossings) {
      for (const s of [-1, 1]) props.wall({ x: c.x + s * 9, z: c.z, yaw: Math.PI / 2, length: 24, height: 1.3 });
      props.logBarricade({ x: c.x - 4, z: c.z + 40, yaw: 0.2, length: 6 });
      props.logBarricade({ x: c.x + 6, z: c.z - 38, yaw: Math.PI - 0.3, length: 6 });
    }
    for (const [i, dx, dz, yaw] of [[1, 22, 30, 0], [1, -26, -28, Math.PI], [0, -24, -32, Math.PI + 0.3], [2, 20, 34, 0.2]]) {
      const c = canal.crossings[i];
      props.townHouse({ x: c.x + dx, z: c.z + dz, yaw, width: 9, depth: 8, storeys: 2, name: 'lock-keeper’s house', damaged: 0 });
    }
    // timber stacks along the tracks, foresters' high seats
    props.rand = mulberry32(3071);
    for (let i = 0; i < 40; i++) {
      const l = TRACKS[i % 3], k = Math.floor(props.rand() * (l.length - 1)), u = props.rand(), side = props.rand() < 0.5 ? -9 : 9;
      const x = l[k][0] + (l[k + 1][0] - l[k][0]) * u + side, z = l[k][1] + (l[k + 1][1] - l[k][1]) * u;
      if (!nearPoint(x, z, 30) && !wet(x, z, 4) && Math.abs(z) < 520) props.logPile({ x, z, yaw: Math.atan2(l[k + 1][0] - l[k][0], l[k + 1][1] - l[k][1]), length: 8 });
    }
    for (const [x, z, yaw] of [[-200, 150, 0], [210, 360, 0], [170, -170, Math.PI], [-230, -390, Math.PI]]) props.highSeat({ x, z, yaw });
    coverSites(props, rand, bounds, (x, z) => Math.abs(z - canalZ(x)) > 30 && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPoint(x, z, 45) && !skip(x, z, 6), 140, ['rocks', 'wrecks', 'fieldwall', 'rocks', 'roadblock'], buildSite, false);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    canal.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...canal.crossings.map((c) => ({ x: c.x, z: c.z, r: canal.halfWidth + 12 })), { test: (x, z) => wet(x, z, -2) || track(x, z) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 10000, hedges: 0, autumn: 0.05, broadleaf: 0.25,
      forest: (x, z) => (wet(x, z, -2) ? -1 : clearing(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 ? 0 : 0.95),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
