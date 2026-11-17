// The Neman at Alytus, 2027 (a hypothetical war): the great river of Lithuania winds across the
// map in its deep, wooded valley — steep banks thirty metres down from the farmland on the plateaus
// — and only three bridges cross it: the road bridge at Alytus in the middle, a bridge on each
// flank. Alytus spreads along both banks of the centre crossing (blocks of flats, the old town),
// villages up on the plateaus. NATO holds the south bank, Russia attacks from the north: whoever
// holds the bridges holds the river. Point-mirrored.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, pointsFrom, both, modernVillage, flats, coverSites, vegetation, turbines, powerLine } from './common2027.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(2029);
const riverZ = (x) => 28 * Math.sin(x * 0.006) + 12 * Math.sin(x * 0.016); // (odd: the river is point-mirrored)
const river = createRiver({
  path: riverZ, halfWidth: 22, level: 0, depth: 3.2, valley: 60,
  crossings: [
    { name: 'Nemunaitis bridge', x: -SIDE_X, kind: 'bridge', width: 8 },
    { name: 'Alytus bridge', x: 0, kind: 'bridge', width: 12 },
    { name: 'Punia bridge', x: SIDE_X, kind: 'bridge', width: 8 },
  ],
});
const away = (x, z) => Math.abs(z - riverZ(x));

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z), d = away(x, z);
  let h = 4 + smoothstep(50, 150, d) * (16 + fbm(noise, x * 0.004, z * 0.004, 4) * 5);       // the plateau over the valley
  h += fbm(noise, x * 0.012 + 20, z * 0.012, 4) * 2.5 * smoothstep(40, 120, d);            // gullies and swells
  h += smoothstep(150, 400, d) * fbm(noise, x * 0.004 + 7, z * 0.004, 5) * 6;
  h += smoothstep(500, 620, ax) * (12 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 18);
  h += smoothstep(560, 680, az) * 14;
  // the roads down to each bridge: a ramp cut into the bank
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 2 + d * 0.12) - h) * (1 - smoothstep(6, 16, Math.abs(x - bx))) * (1 - smoothstep(130, 170, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.3 + 15 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const points = pointsFrom([
  ['A', 'Simnas road', 0, 470],
  ['B', 'Miroslavas', -SIDE_X, 330],
  ['C', 'Alytus (south)', 0, 200],
  ['D', 'Daugai', SIDE_X, 280],
  ['E', 'Nemunaitis bridge', -SIDE_X, riverZ(-SIDE_X), { radius: 22 }],
  ['F', 'Alytus bridge', 0, 0, { radius: 24 }],
], ['Punia bridge', 'Butrimonys', 'Alytus (north)', 'Punia', 'Prienai road']);

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];

export default {
  id: 'neman-crossing',
  name: 'Neman Crossing',
  epochs: ['2027'],
  description: 'The Neman in its deep wooded valley at Alytus: three bridges, Alytus on both banks of the middle one. Hold them, blow them, or lay your own.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2029,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  fields: createFields({ seed: 2029, cell: 76 }),

  theme: theme2027({
    fogDensity: 0.0017, clouds: 0.6, sunIntensity: 2.0,
    terrain: {
      roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x, z, y) {
        if (Math.abs(x) < 6 && Math.abs(z) < 620 && away(x, z) > 20) return [0x3c3d3f, 1];          // the main road through Alytus
        if (y < 1.4 && away(x, z) < 40) return [0x5e5a40, 0.7];                                     // the river meadows
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
    const wet = (x, z, r = 0) => away(x, z) < river.halfWidth + 6 + r;
    const skip = (x, z, r) => wet(x, z, r) || (Math.abs(x) < 9 + r && away(x, z) > 20);

    // Alytus on both banks of the middle bridge: flats up the slope, houses by the water
    both(props, 2901, (m, flip) => {
      const r = props.rand;
      for (const [x, z] of [[-90, 120], [-60, 170], [70, 110], [100, 165], [-130, 210], [130, 220], [-40, 250], [50, 260]]) {
        const zz = riverZ(x) + z;
        if (!skip(x * m, zz * m, 14)) flats(props, { x: x * m, z: zz * m, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + flip, storeys: 4 + Math.floor(r() * 2), width: 36, depth: 11 });
      }
      for (let i = 0; i < 12; i++) {
        const x = (r() - 0.5) * 220, z = riverZ(x) + 45 + r() * 40;
        if (!skip(x * m, z * m, 6) && !nearPoint(x * m, z * m, 10)) props.townHouse({ x: x * m, z: z * m, yaw: r() * 3 + flip, width: 9, depth: 9, storeys: 2, damaged: 0 });
      }
      props.church({ x: 25 * m, z: (riverZ(25) + 80) * m, yaw: flip });
    });
    // villages up on the plateaus
    for (const p of points) {
      if (p.z <= 0 || p.id === 'C' || p.id === 'A') continue;
      both(props, 2950 + Math.round(p.x + p.z), (m, flip) => modernVillage(props, p, m, flip, { skip, church: p.id !== 'E' }));
    }
    // the bridgeheads: barricades and hedgehogs either end
    both(props, 2977, (m, flip) => {
      for (const c of river.crossings) {
        if (c.x < 0 && m > 0 || c.x > 0 && m < 0) continue;
        for (const end of [1]) {
          const z = c.z + end * (river.halfWidth + 26);
          props.jersey({ x: c.x * m - 7 * m, z: z * m, yaw: 0.2 + flip, length: 5 });
          props.jersey({ x: c.x * m + 8 * m, z: (z + 4) * m, yaw: -0.15 + flip, length: 4 });
          for (const dx of [-14, 14]) props.hedgehog({ x: (c.x + dx) * m, z: (z + 8) * m });
        }
      }
    });
    coverSites(props, rand, bounds, (x, z) => z > riverZ(x) + river.halfWidth + 30 && Math.hypot(x, z - BASE_Z) > 40 && !nearPoint(x, z, 40) && !skip(x, z, 8), 120, undefined, buildSite);
    const rotors = turbines(props, [[-400, 450, 0.5], [260, 480, 0.5]]);
    powerLine(props, 2988, (x) => 420 + x * 0.05, (x, z) => nearPoint(x, z, 25) || skip(x, z, 6));
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => wet(x, z, -4) || Math.abs(x) < 7 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid,
      forest: (x, z) => {
        const d = away(x, z);
        if (d < river.halfWidth + 2) return -1;
        if (d < 150 && Math.abs(x) > 160 && !river.crossings.some((c) => Math.abs(x - c.x) < 40)) return 0.85; // the wooded valley sides
        return Math.abs(x) > 470 ? 0.75 : noise(x * 0.007 + 70, z * 0.007) > 0.42 || noise(-x * 0.007 + 70, -z * 0.007) > 0.42 ? 0.75 : 0;
      },
    });
    return {
      buildings: props.buildings,
      update(dt, t) { update(dt, t); for (const r of rotors) r.userData.spin.rotation.z -= dt * 0.9; },
    };
  },
} satisfies MapDef;
