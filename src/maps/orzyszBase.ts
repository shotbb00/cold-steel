// Orzysz, 2027 (a hypothetical war): the Bemowo Piskie training area in Masuria, home of NATO's
// battlegroup in Poland — the base in the middle of the map (barracks blocks, the long vehicle sheds of
// the motor pool, the fuel depot, headquarters, the parade ground and the helipad, all inside the
// fence), the sandy tank ranges scarred with tracks and target berms round it, pine woods, and Lake
// Orzysz and its neighbours on the flanks. The base straddles the middle: NATO holds the southern
// half, Russia storms in from the north. Point-mirrored.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, pointsFrom, both, modernVillage, flats, coverSites, vegetation } from './common2027.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const CAMP = { x: 170, z: 150 };      // the base: |x| < 170, |z| < 150
const noise = createNoise2D(2033);
const inCamp = (x, z) => Math.abs(x) < CAMP.x && Math.abs(z) < CAMP.z;
const range = (x, z) => !inCamp(x, z) && Math.abs(x) < 430 && Math.abs(z) < 420 && fbm(noise, x * 0.004 + 60, z * 0.004, 3) + fbm(noise, -x * 0.004 + 60, -z * 0.004, 3) > 0.05;
const HALF = [
  { x: -455, z: 170, rx: 42, rz: 130, rot: 0.1, depth: 6, seed: 1 },      // Lake Orzysz's shore
  { x: 300, z: 420, rx: 34, rz: 26, rot: 0.6, depth: 3, seed: 2 },
];
const lakes = createLakes({ lakes: [...HALF, ...HALF.map((l) => ({ ...l, x: -l.x, z: -l.z }))] });

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = 4 + fbm(noise, x * 0.004, z * 0.004, 5) * 7 + Math.max(0, ridged(noise, x * 0.012, z * 0.012, 3) - 0.5) * 5;
  h += (5 - h) * (1 - smoothstep(0, 30, Math.max(ax - CAMP.x, az - CAMP.z))) * 0.9;        // the base on level ground
  h += smoothstep(500, 620, ax) * 14 + smoothstep(560, 680, az) * 14;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return lakes.carve(x, z, Math.max(1.4, h));
}

const points = pointsFrom([
  ['A', 'Orzysz', 0, 470],
  ['B', 'Tank range', -SIDE_X, 310],
  ['C', 'South gate', 0, 175],
  ['D', 'Drygały road', SIDE_X, 270],
  ['E', 'Motor pool', -95, 90, { radius: 22 }],
  ['F', 'Parade ground', 0, 0, { radius: 24 }],
], ['Fuel depot', 'Artillery range', 'North gate', 'Ublik', 'Biała Piska road']);

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];

export default {
  id: 'orzysz-base',
  name: 'Orzysz',
  epochs: ['2027'],
  description: 'The NATO battlegroup’s base at Bemowo Piskie: barracks, motor pool and fuel depot behind the fence, sandy tank ranges and pine woods round it, Lake Orzysz on the flank.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2033,
  height,
  river: lakes,
  fields: createFields({ seed: 2033, cell: 80 }),

  theme: theme2027({
    terrain: {
      roads: [-SIDE_X, SIDE_X], roadZ: 540,
      surface(x, z, y) {
        if (Math.abs(x) < 6 && Math.abs(z) < 620) return [0x3c3d3f, 1];                           // the road through both gates
        if (inCamp(x, z)) {
          if (Math.abs(x) < 50 && Math.abs(z) < 40) return [0x6a6a66, 0.95];                     // the parade ground
          return Math.abs(x) % 60 < 6 || Math.abs(z) % 50 < 6 ? [0x45464a, 0.95] : [0x5e6440, 0.6]; // camp roads, lawns
        }
        if (range(x, z)) return [0xa89670, 0.8];                                                   // the churned sand of the ranges
        if (y < 1.2 && lakes.q(x, z) < 1.3) return [0x6a6040, 0.6];
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
    const wet = (x, z, m = 1.2) => lakes.q(x, z) < m;
    const skip = (x, z, r) => wet(x, z, 1.4) || Math.abs(x) < 8 + r || inCamp(x, z);

    both(props, 3301, (m, flip) => {
      // barracks blocks east of the road, the motor pool's long sheds west of it
      for (const [x, z] of [[60, 70], [110, 70], [60, 120], [110, 120]]) flats(props, { x: x * m, z: z * m, yaw: flip, storeys: 3, width: 34, depth: 11, name: 'barracks' });
      for (const [x, z] of [[-130, 60], [-130, 115]]) props.hall({ x: x * m, z: z * m, yaw: flip, width: 40, depth: 16, height: 7, color: 0x8a8a7a, roof: 0x4a5040, door: 12, name: 'vehicle shed' });
      // headquarters and the gate, the fence round the camp
      props.townHouse({ x: 35 * m, z: 30 * m, yaw: flip, width: 22, depth: 12, storeys: 2, name: 'battlegroup headquarters', damaged: 0 });
      for (const x of [-7, 7]) props.jersey({ x: x * m, z: (CAMP.z + 4) * m, yaw: flip, length: 4 });
      props.box('plaster', 12 * m, terrain.heightAt(12 * m, (CAMP.z - 4) * m) + 1.3, (CAMP.z - 4) * m, 3, 2.6, 3, 0, 0xc8c4b8); // the guard post
      // the fuel depot: tanks behind their berms; the helipad
      props.tanks({ x: -60 * m, z: 120 * m, yaw: flip, count: 3, radius: 4, height: 7, color: 0xa8aaa4 });
      props.wall({ x: -60 * m, z: 105 * m, yaw: flip, length: 34, height: 1.6 });
      props.mast({ x: 150 * m, z: 20 * m, height: 30 });
      props.crates({ x: -100 * m, z: 30 * m, yaw: 0.3 + flip });
      props.crates({ x: -110 * m, z: 36 * m, yaw: 1.2 + flip });
      // the ranges: target berms of earth and old hulks, firing points
      const r = props.rand;
      for (let i = 0; i < 16; i++) {
        const x = (r() * 2 - 1) * 400, z = 180 + r() * 220;
        if (nearPoint(x * m, z * m, 35) || wet(x * m, z * m, 1.5) || Math.abs(x) < 15) continue;
        props.wall({ x: x * m, z: z * m, yaw: r() * 3 + flip, length: 10 + r() * 8, height: 1.6 });
        if (r() < 0.5) props.wreckCar({ x: (x + 6) * m, z: (z + 4) * m, yaw: r() * 3 });
      }
    });
    // the camp fence (gaps at the gates)
    for (const s of [-1, 1]) {
      props.fence({ x0: -CAMP.x, x1: -12, z: s * CAMP.z, breaches: [] });
      props.fence({ x0: 12, x1: CAMP.x, z: s * CAMP.z, breaches: [] });
    }
    for (const p of points) {
      if (p.z <= 0 || inCamp(p.x, p.z) || p.id === 'C' || p.id === 'B') continue;
      both(props, 3350 + Math.round(p.x + p.z), (m, flip) => modernVillage(props, p, m, flip, { skip, n: 6, church: p.id === 'A' }));
    }
    coverSites(props, rand, bounds, (x, z) => !inCamp(x, z) && Math.hypot(x, z - BASE_Z) > 40 && !nearPoint(x, z, 40) && !skip(x, z, 6), 90, undefined, buildSite);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    lakes.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => wet(x, z, 1.02) || Math.abs(x) < 7 || inCamp(x, z) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 6000, hedges: 3000, broadleaf: 0.25, noHedge: (x, z) => range(x, z),
      forest: (x, z) => (wet(x, z, 1.02) ? -1 : range(x, z) ? 0.02 : 0.85),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
