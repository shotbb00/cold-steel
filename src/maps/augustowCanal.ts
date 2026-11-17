// The Augustów Canal, 2027 (a hypothetical war): the old canal through the Augustów Primeval Forest,
// twenty kilometres of pine and spruce on the road from Belarus to the Suwałki Gap. Dense forest
// everywhere, cut by sandy tracks; the canal runs across the middle with its locks — the only ways
// over — and the forest villages sit in their clearings. Short sight lines, ambushes on the tracks,
// drones that can't see under the canopy. NATO holds the south bank, Russia comes through the forest
// from the north. Point-mirrored.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, pointsFrom, both, modernVillage, coverSites, vegetation } from './common2027.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(2030);
const canalZ = (x) => 16 * Math.sin(x * 0.006) + 5 * Math.sin(x * 0.019);
const canal = createRiver({
  path: canalZ, halfWidth: 8, level: 0, depth: 2.4, valley: 30,
  crossings: [
    { name: 'Swoboda lock', x: -SIDE_X, kind: 'bridge', width: 6 },
    { name: 'Przewięź lock', x: 0, kind: 'bridge', width: 7 },
    { name: 'Gorczyca lock', x: SIDE_X, kind: 'bridge', width: 6 },
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

const points = pointsFrom([
  ['A', 'Płaska', 0, 470],
  ['B', 'Mikaszówka', -SIDE_X, 320],
  ['C', 'Rudawka', 0, 230],
  ['D', 'Gruszki', SIDE_X, 270],
  ['E', 'Swoboda lock', -SIDE_X, canalZ(-SIDE_X), { radius: 22 }],
  ['F', 'Przewięź lock', 0, 0, { radius: 22 }],
], ['Gorczyca lock', 'Studzieniczna', 'Kurianka', 'Sucha Rzeczka', 'Lipsk road']);

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];
const track = (x, z) => [-SIDE_X, 0, SIDE_X].some((tx) => Math.abs(x - tx - Math.sin(z * 0.02 + tx) * 8) < 5) && Math.abs(z) < 540;
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
      farmX: [0, 1], farmZ: [0, 1], roads: [-SIDE_X, 0, SIDE_X], roadZ: 540,
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

    for (const p of points) {
      if (p.z <= 0 || p.radius) continue;
      both(props, 3050 + Math.round(p.x + p.z), (m, flip) => modernVillage(props, p, m, flip, { skip, n: 5, church: p.id === 'A' || p.id === 'C', street: 0 }));
    }
    // the locks: stone walls along the chamber, the lock-keeper's house, a barrier on the track
    both(props, 3071, (m, flip) => {
      for (const c of canal.crossings) {
        if (c.x * m < 0) continue;
        for (const s of [-1, 1]) props.wall({ x: (c.x + s * 9) * m, z: c.z * m, yaw: Math.PI / 2 + flip, length: 24, height: 1.3 });
        props.townHouse({ x: (c.x + 22) * m, z: (c.z + 30) * m, yaw: flip, width: 9, depth: 8, storeys: 2, name: 'lock-keeper’s house', damaged: 0 });
        props.logBarricade({ x: (c.x - 4) * m, z: (c.z + 40) * m, yaw: 0.2 + flip, length: 6 });
      }
      // timber stacks and a forester's lodge along the tracks
      for (let i = 0; i < 10; i++) {
        const tx = [-SIDE_X, 0, SIDE_X][i % 3] + (props.rand() < 0.5 ? -9 : 9), z = 80 + props.rand() * 380;
        if (!nearPoint(tx * m, z * m, 30)) props.logPile({ x: tx * m, z: z * m, yaw: flip, length: 8 });
      }
      props.highSeat({ x: -200 * m, z: 150 * m, yaw: flip });
      props.highSeat({ x: 210 * m, z: 360 * m, yaw: flip });
    });
    coverSites(props, rand, bounds, (x, z) => z > canalZ(x) + 30 && Math.hypot(x, z - BASE_Z) > 40 && !nearPoint(x, z, 45) && !skip(x, z, 6), 70, ['rocks', 'wrecks', 'fieldwall', 'rocks', 'roadblock'], buildSite);
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
