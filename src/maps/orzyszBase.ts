// Orzysz, 2027 (a hypothetical war): the Bemowo Piskie training area in Masuria, home of NATO's
// battlegroup in Poland — the base in the middle of the map (barracks blocks, the long vehicle sheds of
// the motor pool, the fuel depot, headquarters, the parade ground and the helipad, all inside the
// fence), the sandy tank ranges scarred with tracks and target berms round it, pine woods, and Lake
// Orzysz and its neighbours on the flanks. The base straddles the middle: NATO holds the southern
// half, Russia storms in from the north. Not a mirror: the camp's two halves are laid out differently
// (barracks and motor pool in the south; fuel depot, workshops and the helipad in the north), the north
// road comes in through its own gate further west, the lakes and ranges lie where they lie; but each
// half has the same weight of solid buildings, a gate on its road, and points at the same distances.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, modernVillage, flats, coverSites, vegetation } from './common2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const CAMP = { x: 170, z: 150 };      // the base: |x| < 170, |z| < 150
const noise = createNoise2D(2033);
const inCamp = (x, z) => Math.abs(x) < CAMP.x && Math.abs(z) < CAMP.z;
const range = (x, z) => !inCamp(x, z) && Math.abs(x) < 430 && Math.abs(z) < 420 && fbm(noise, x * 0.004 + 50.3, z * 0.004 - 30.1, 3) > 0.06; // (as much range on each half)
/** The road's centre: straight up through the south gate and the parade ground, out of the north gate further west. */
const GATE_N = -66;
const roadX = (z) => (z >= -40 ? 0 : z > -CAMP.z ? GATE_N * smoothstep(-40, -CAMP.z, z) : GATE_N * smoothstep(-470, -CAMP.z, z));
const LAKES = [
  { x: -455, z: 170, rx: 42, rz: 130, rot: 0.1, depth: 6, seed: 1 },      // Lake Orzysz's shore
  { x: 300, z: 420, rx: 34, rz: 26, rot: 0.6, depth: 3, seed: 2 },
  { x: -430, z: -290, rx: 62, rz: 88, rot: -0.35, depth: 5, seed: 3 },    // the lakes by Ublik
  { x: 215, z: -440, rx: 30, rz: 36, rot: 0.2, depth: 3, seed: 4 },
];
const lakes = createLakes({ lakes: LAKES });

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = 4 + fbm(noise, x * 0.004, z * 0.004, 5) * 7 + Math.max(0, ridged(noise, x * 0.012, z * 0.012, 3) - 0.5) * 5;
  h += 6 * Math.exp(-((x - 240) ** 2 + (z + 255) ** 2) / 6400) + 4 * Math.exp(-((x + 190) ** 2 + (z + 400) ** 2) / 3600); // the moraine knolls north of the camp
  h += (5 - h) * (1 - smoothstep(0, 30, Math.max(ax - CAMP.x, az - CAMP.z))) * 0.9;        // the base on level ground
  h += smoothstep(500, 620, ax) * 14 + smoothstep(560, 680, az) * 14;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return lakes.carve(x, z, Math.max(1.4, h));
}

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  pt('A', 'Orzysz', 0, 470, 'centre'),
  pt('B', 'Tank range', -345, 290, 'west'),
  pt('C', 'South gate', 0, 175, 'centre'),
  pt('D', 'Drygały road', 315, 300, 'east'),
  pt('E', 'Motor pool', -95, 90, 'centre', { radius: 22 }),
  pt('F', 'Parade ground', 0, 0, 'centre', { radius: 24 }),
  pt('G', 'Fuel depot', 90, -95, 'centre', { radius: 22 }),
  pt('H', 'Artillery range', -330, -245, 'west'),
  pt('I', 'North gate', GATE_N, -178, 'centre'),
  pt('J', 'Ublik', 300, -330, 'east'),
  pt('K', 'Biała Piska road', 0, -470, 'centre'),
];

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
        if (Math.abs(x - roadX(z)) < 6 && Math.abs(z) < 620) return [0x3c3d3f, 1];                // the road through both gates
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
    const skip = (x, z, r) => wet(x, z, 1.4) || Math.abs(x - roadX(z)) < 8 + r || inCamp(x, z);

    // the southern half of the camp: barracks blocks east of the road, the motor pool's long sheds west of it
    for (const [x, z] of [[60, 70], [110, 70], [60, 120], [110, 120]]) flats(props, { x, z, yaw: 0, storeys: 3, width: 34, depth: 11, name: 'barracks' });
    for (const [x, z] of [[-130, 60], [-130, 115]]) props.hall({ x, z, yaw: 0, width: 40, depth: 16, height: 7, color: 0x8a8a7a, roof: 0x4a5040, door: 12, name: 'vehicle shed' });
    props.townHouse({ x: 35, z: 30, yaw: 0, width: 22, depth: 12, storeys: 2, name: 'battlegroup headquarters', damaged: 0 });
    props.tanks({ x: -60, z: 120, yaw: 0, count: 3, radius: 4, height: 7, color: 0xa8aaa4 });
    props.wall({ x: -60, z: 105, yaw: 0, length: 34, height: 1.6 });
    props.mast({ x: 150, z: 20, height: 30 });
    props.crates({ x: -100, z: 30, yaw: 0.3 });
    props.crates({ x: -110, z: 36, yaw: 1.2 });
    // the northern half: the big fuel depot behind its berms, the workshops, barracks set end-on, the helipad
    props.tanks({ x: 95, z: -128, yaw: 0, count: 4, radius: 4.5, height: 8, color: 0xa8aaa4 });
    for (const [x, z, yaw, len] of [[95, -110, 0, 44], [66, -128, Math.PI / 2, 26]]) props.wall({ x, z, yaw, length: len, height: 1.6 });
    for (const [x, z] of [[-120, -50], [-120, -115]]) flats(props, { x, z, yaw: Math.PI / 2, storeys: 3, width: 34, depth: 11, name: 'barracks' });
    props.hall({ x: 120, z: -40, yaw: Math.PI / 2, width: 46, depth: 18, height: 8, color: 0x8a8a7a, roof: 0x4a5040, door: 12, name: 'workshop' });
    props.hall({ x: 40, z: -60, yaw: 0, width: 30, depth: 14, height: 6, color: 0x9a9a8a, roof: 0x4a5040, door: 8, name: 'vehicle shed' });
    props.townHouse({ x: -40, z: -128, yaw: Math.PI, width: 18, depth: 11, storeys: 2, name: 'range control', damaged: 0 });
    props.box('plaster', -150, terrain.heightAt(-150, -20) + 0.05, -20, 20, 0.1, 20, 0, 0x5a5c58); // the helipad
    props.mast({ x: -150, z: -50, height: 26 });
    props.crates({ x: 30, z: -110, yaw: 0.8 });
    // the gates: barriers and a guard post on each road
    for (const [gx, gz, s] of [[0, CAMP.z, 1], [GATE_N, -CAMP.z, -1]]) {
      for (const x of [-7, 7]) props.jersey({ x: gx + x, z: gz + s * 4, yaw: s > 0 ? 0 : Math.PI, length: 4 });
      props.box('plaster', gx + 12 * s, terrain.heightAt(gx + 12 * s, gz - s * 4) + 1.3, gz - s * 4, 3, 2.6, 3, 0, 0xc8c4b8);
    }
    // the ranges: target berms of earth and old hulks, firing points
    props.rand = mulberry32(3301);
    for (let i = 0; i < 32; i++) {
      const r = props.rand, x = (r() * 2 - 1) * 400, z = (r() < 0.5 ? 1 : -1) * (180 + r() * 220);
      if (nearPoint(x, z, 35) || wet(x, z, 1.5) || Math.abs(x - roadX(z)) < 15) continue;
      props.wall({ x, z, yaw: r() * 3, length: 10 + r() * 8, height: 1.6 });
      if (r() < 0.5) props.wreckCar({ x: x + 6, z: z + 4, yaw: r() * 3 });
    }
    // the camp fence (gaps at the gates)
    for (const [z, gx] of [[CAMP.z, 0], [-CAMP.z, GATE_N]]) {
      props.fence({ x0: -CAMP.x, x1: gx - 12, z, breaches: [] });
      props.fence({ x0: gx + 12, x1: CAMP.x, z, breaches: [] });
    }
    for (const p of points) { // each village its own
      if (!'ADJK'.includes(p.id)) continue;
      props.rand = mulberry32(3350 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, n: 6, church: p.id === 'A' || p.id === 'K' });
    }
    coverSites(props, rand, bounds, (x, z) => !inCamp(x, z) && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPoint(x, z, 40) && !skip(x, z, 6), 180, undefined, buildSite, false);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    lakes.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => wet(x, z, 1.02) || Math.abs(x - roadX(z)) < 7 || inCamp(x, z) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 6000, hedges: 3000, broadleaf: 0.25, noHedge: (x, z) => range(x, z),
      forest: (x, z) => (wet(x, z, 1.02) ? -1 : range(x, z) ? 0.02 : 0.85),
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
