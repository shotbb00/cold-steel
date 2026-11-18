// The Neman at Alytus, 2027 (a hypothetical war): the great river of Lithuania winds across the
// map in its deep, wooded valley — steep banks thirty metres down from the farmland on the plateaus
// — and only three bridges cross it: the road bridge at Alytus in the middle, a bridge on each
// flank. Alytus spreads along both banks of the centre crossing (blocks of flats, the old town),
// villages up on the plateaus. NATO holds the south bank, Russia attacks from the north: whoever
// holds the bridges holds the river. Not a mirror: the river swings in its own bends, each bank is
// steep where the water cuts its outside and gentle on the inside, the rises and woods on the two
// plateaus are their own; but each side has a bridge in each sector, the same climb out of the valley
// (steep bank against gentle bank, each side one of each on the flanks), and its villages at the same
// distances.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, modernVillage, flats, coverSites, vegetation, powerLine } from './common2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(2029);
const riverZ = (x) => 28 * Math.sin(x * 0.006) + 12 * Math.sin(x * 0.016) + 22 * Math.cos(x * 0.0045 + 0.5) - 19;
const BRIDGES = [-350, 0, 300];
const river = createRiver({
  path: riverZ, halfWidth: 22, level: 0, depth: 3.2, valley: 60,
  crossings: [
    { name: 'Nemunaitis bridge', x: BRIDGES[0], kind: 'bridge', width: 8 },
    { name: 'Alytus bridge', x: BRIDGES[1], kind: 'bridge', width: 12 },
    { name: 'Punia bridge', x: BRIDGES[2], kind: 'bridge', width: 8 },
  ],
});
const away = (x, z) => Math.abs(z - riverZ(x));
/** How wide the climb out of the valley is here (< 1: a steep bank): the south bank steep in the west, the north bank in the east. */
const bankW = (x, z) => 1 + 0.4 * Math.tanh((z > riverZ(x) ? x + 60 : -x + 40) * 0.008) + 0.12 * Math.sin(x * 0.011 + (z > riverZ(x) ? 0 : 2));
// rises on each plateau (and none mirrored): [x, z, radius, height]
const RISES = [[-210, 300, 70, 7], [240, 380, 60, 6], [430, 190, 50, 5], [-390, -330, 65, 7], [110, -300, 75, 6], [-140, -430, 48, 5]];

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z), w = bankW(x, z), d = away(x, z) / w;
  let h = 4 + smoothstep(50, 150, d) * (16 + fbm(noise, x * 0.004, z * 0.004, 4) * 5);       // the plateau over the valley
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  h += x * 0.009 * smoothstep(60, 220, d);                                                  // both plateaus climbing to the east (the Dzūkija hills)
  h += fbm(noise, x * 0.012 + 20, z * 0.012, 4) * 2.5 * smoothstep(40, 120, d);            // gullies and swells
  h += smoothstep(150, 400, d) * fbm(noise, x * 0.004 + 7, z * 0.004, 5) * 6;
  h += smoothstep(500, 620, ax) * (12 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 18);
  h += smoothstep(560, 680, az) * 14;
  // the roads down to each bridge: a ramp cut into the bank
  for (const bx of BRIDGES) h += (Math.min(h, 2 + d * 0.12) - h) * (1 - smoothstep(6, 16, Math.abs(x - bx))) * (1 - smoothstep(130, 170, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.3 + 15 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  pt('A', 'Simnas road', 0, 470, 'centre'),
  pt('B', 'Miroslavas', -350, 310, 'west'),
  pt('C', 'Alytus (south)', 40, riverZ(40) + 200, 'centre'),
  pt('D', 'Daugai', 320, 300, 'east'),
  pt('E', 'Nemunaitis bridge', BRIDGES[0], riverZ(BRIDGES[0]), 'west', { radius: 22 }),
  pt('F', 'Alytus bridge', 0, riverZ(0), 'centre', { radius: 24 }),
  pt('G', 'Punia bridge', BRIDGES[2], riverZ(BRIDGES[2]), 'east', { radius: 22 }),
  pt('H', 'Butrimonys', -370, -260, 'west'),
  pt('I', 'Alytus (north)', -90, riverZ(-90) - 190, 'centre'),
  pt('J', 'Punia', 300, -320, 'east'),
  pt('K', 'Prienai road', 0, -470, 'centre'),
];

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

    // Alytus on both banks of the middle bridge: flats up the slope, houses by the water (each bank its own
    // streets: s = 1 the south bank, -1 the north)
    props.rand = mulberry32(2901);
    const r = props.rand;
    for (const [x, z, s] of [[-90, 120, 1], [-60, 170, 1], [70, 110, 1], [100, 165, 1], [-130, 210, 1], [130, 220, 1], [-40, 250, 1], [50, 260, 1],
      [-110, 105, -1], [-35, 150, -1], [60, 135, -1], [135, 180, -1], [-150, 190, -1], [-80, 235, -1], [20, 250, -1], [110, 255, -1]]) {
      const zz = riverZ(x) + s * z;
      if (!skip(x, zz, 14) && !nearPoint(x, zz, 30)) flats(props, { x, z: zz, yaw: r() < 0.5 ? 0 : Math.PI / 2, storeys: 4 + Math.floor(r() * 2), width: 36, depth: 11 });
    }
    for (let i = 0; i < 24; i++) {
      const s = i % 2 ? 1 : -1, x = (r() - 0.5) * 220, z = riverZ(x) + s * (45 + r() * 40);
      if (!skip(x, z, 6) && !nearPoint(x, z, 10)) props.townHouse({ x, z, yaw: r() * 3, width: 9, depth: 9, storeys: 2, damaged: 0 });
    }
    props.church({ x: 25, z: riverZ(25) + 80, yaw: 0 });
    props.church({ x: -40, z: riverZ(-40) - 92, yaw: Math.PI });
    // villages up on the plateaus, each its own
    for (const p of points) {
      if ('ACIK'.includes(p.id)) continue;
      props.rand = mulberry32(2950 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, church: !p.radius });
    }
    // the bridgeheads: barricades and hedgehogs either end
    props.rand = mulberry32(2977);
    for (const c of river.crossings) for (const end of [1, -1]) {
      const z = c.z + end * (river.halfWidth + 26), flip = end > 0 ? 0 : Math.PI;
      props.jersey({ x: c.x - 7 * end, z, yaw: 0.2 + flip, length: 5 });
      props.jersey({ x: c.x + 8 * end, z: z + 4 * end, yaw: -0.15 + flip, length: 4 });
      for (const dx of [-14, 14]) props.hedgehog({ x: c.x + dx, z: z + 8 * end });
    }
    coverSites(props, rand, bounds, (x, z) => away(x, z) > river.halfWidth + 30 && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPoint(x, z, 40) && !skip(x, z, 8), 240, undefined, buildSite, false);
    const rotors = [[-400, 450], [260, 480], [-230, -485], [410, -430]].map(([x, z]) => props.windTurbine({ x, z, yaw: 0.5 }));
    // a power line behind each front (each its own course; the other half of each call is skipped)
    powerLine(props, 2988, (x) => 420 + x * 0.05, (x, z) => z < 0 || nearPoint(x, z, 25) || skip(x, z, 6));
    powerLine(props, 2989, (x) => 400 + x * 0.08 + 18 * Math.sin(x * 0.01), (x, z) => z > 0 || nearPoint(x, z, 25) || skip(x, z, 6));
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
        if (d < 150 * bankW(x, z) && Math.abs(x) > 160 && !river.crossings.some((c) => Math.abs(x - c.x) < 40)) return 0.85; // the wooded valley sides
        return Math.abs(x) > 470 ? 0.75 : noise(x * 0.007 + 1057.4, z * 0.007 - 653.8) > 0.25 ? 0.75 : 0; // (as much wood on each plateau)
      },
    });
    return {
      buildings: props.buildings,
      update(dt, t) { update(dt, t); for (const r of rotors) r.userData.spin.rotation.z -= dt * 0.9; },
    };
  },
} satisfies MapDef;
