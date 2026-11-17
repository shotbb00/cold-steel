// Suwałki, 2027 (a hypothetical war): the town on the Via Baltica that gives the gap its name. The old
// centre of two- and three-storey houses round the market square, the blocks of flats of the estates
// beyond it, a shopping centre, the railway through the middle with its station, parks, and farmland
// and woods round the edge. NATO holds the southern half of the town, Russia comes in from the north;
// the square in the middle is the prize. Streets every 70 m (the main avenue up x = 0), point-mirrored.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, pointsFrom, both, flats, coverSites, vegetation, turbines } from './common2027.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const TOWN = 390;                 // half-size of the built-up square
const GRID = 70;                  // street spacing (streets on x, z = 70k)
const RAIL_Z = 175;               // each side's branch line: z = ±RAIL_Z, from the map edge to its station
const noise = createNoise2D(2028);
const inTown = (x, z) => Math.abs(x) < TOWN && Math.abs(z) < TOWN;
const toStreet = (v) => Math.abs(v - Math.round(v / GRID) * GRID);
const onStreet = (x, z) => inTown(x, z) && Math.min(toStreet(x), toStreet(z)) < 4.5;
const railD = (x, z) => (x < -130 && z > 0 ? Math.abs(z - RAIL_Z) : x > 130 && z < 0 ? Math.abs(z + RAIL_Z) : Infinity); // (point-mirrored: ours from the west, theirs from the east)
const square = (x, z) => Math.abs(x) < 40 && Math.abs(z) < 40;

function height(x, z) {
  const town = smoothstep(TOWN + 120, TOWN, Math.max(Math.abs(x), Math.abs(z)));
  let h = 3 + fbm(noise, x * 0.004, z * 0.004, 5) * 7 * (1 - town * 0.8);
  h += fbm(noise, x * 0.04 + 9, z * 0.04, 3) * 0.5 * (1 - town);
  h += smoothstep(500, 620, Math.abs(x)) * 18 + smoothstep(560, 680, Math.abs(z)) * 18;
  for (const bz of [BASE_Z, -BASE_Z]) h += (3 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return Math.max(1.4, h);
}

const points = pointsFrom([
  ['A', 'Zastawie', 0, 470],
  ['B', 'Osiedle Hańcza', -350, 315],
  ['C', 'Kościuszki', 0, 230],
  ['D', 'Osiedle Kamena', 350, 245],
  ['E', 'Park Konstytucji', -350, 105, { radius: 22 }],
  ['F', 'Rynek', 0, 0, { radius: 24 }],
], ['Dworzec', 'Osiedle Północ', 'Noniewicza', 'Osiedle Polna', 'Szwajcaria']);

const layout = [{ unit: 'rifles', x: -10, z: 454, name: '1st Platoon' }];

export default {
  id: 'suwalki-town',
  name: 'Suwałki',
  epochs: ['2027'],
  description: 'The town that gives the gap its name: the old centre round the market square, the estates of flats, the station on the railway through the middle. House to house for the square.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2028,
  height,
  fields: createFields({ seed: 2028, cell: 80 }),

  theme: theme2027({
    terrain: {
      roads: [0], roadZ: 560,
      surface(x, z) {
        if (railD(x, z) < 2.6) return [0x55504a, 0.95];                         // ballast
        if (square(x, z)) return [0x8a8680, 0.95];                                 // the paved square
        if (onStreet(x, z)) return [0x3c3d3f, 1];                                  // asphalt
        if (inTown(x, z) && Math.min(toStreet(x), toStreet(z)) < 7) return [0x7a7872, 0.8]; // pavements
        if (Math.abs(x) < 8 && Math.abs(z) < 620) return [0x3c3d3f, 1];           // the avenue out of town
        return inTown(x, z) ? [0x56603c, 0.9] : null;                              // yards and lawns
      },
    },
  }),

  bases: { nato: { x: 0, z: BASE_Z, entries: [-280, 0, 280] }, pact: { x: 0, z: -BASE_Z, entries: [-280, 0, 280] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const parks = new Set();

    // the blocks: cells centred between the streets, our half built, each mirrored
    const half = GRID / 2;
    for (let cx = -TOWN + half; cx < TOWN; cx += GRID) {
      for (let cz = half; cz < TOWN; cz += GRID) {
        if (square(cx, cz) || railD(cx, cz) < 30) continue;
        const r = mulberry32(Math.round(cx * 7 + cz * 13 + 5000));
        const ring = Math.max(Math.abs(cx), Math.abs(cz));
        if (r() < 0.14 || nearPoint(cx, cz, 26)) { parks.add(`${cx},${cz}`); parks.add(`${-cx},${-cz}`); continue; }
        both(props, Math.floor(r() * 1e9), (m, flip) => {
          const X = cx * m, Z = cz * m, rr = props.rand;
          if (ring < 180) { // the old town: houses round the block, facing the streets
            for (const [lx, lz, yaw] of [[-20, 18, 0], [0, 18, 0], [20, 18, 0], [-20, -18, Math.PI], [0, -18, Math.PI], [20, -18, Math.PI]]) {
              const [hx, hz] = PropBuilder.local(X, Z, flip, lx, lz);
              props.townHouse({ x: hx, z: hz, yaw: yaw + flip, width: 11, depth: 10, storeys: 2 + Math.floor(rr() * 2), name: ['town house', 'shop', 'bank', 'café'][Math.floor(rr() * 4)], damaged: 0 });
            }
          } else if (ring > 300 && rr() < 0.3) { // a shopping hall at the edge of town
            props.hall({ x: X, z: Z, yaw: flip, width: 44, depth: 30, height: 7, color: 0xa8a49a, roof: 0x5a5c60, door: 10, name: 'shopping centre' });
          } else { // the estates: a block of flats
            const turn = rr() < 0.5 ? 0 : Math.PI / 2, storeys = 4 + Math.floor(rr() * 2);
            for (const o of [-14, 14]) { const [fx, fz] = PropBuilder.local(X, Z, turn + flip, 0, o); flats(props, { x: fx, z: fz, yaw: turn + flip, storeys, width: 42, depth: 11 }); }
          }
        });
      }
    }
    // the market square: the church at its head, low walls round the flower beds; the station by the line
    both(props, 31, (m, flip) => {
      props.church({ x: 0, z: 50 * m, yaw: flip });
      for (const [x, z] of [[-30, 20], [30, 20]]) props.lowWall({ x: x * m, z: z * m, yaw: flip, length: 14, height: 0.6, color: 0x8a867c });
      props.hall({ x: -150 * m, z: (RAIL_Z + 20) * m, yaw: Math.PI / 2 + flip, width: 34, depth: 12, height: 6, color: 0xb0a088, roof: 0x6a3024, door: 6, name: 'railway station' });
      props.rails({ x0: -620 * m, z0: RAIL_Z * m, x1: -132 * m, z1: RAIL_Z * m });
      props.wagon({ x: -200 * m, z: RAIL_Z * m, yaw: Math.PI / 2 + flip, kind: 'box' });
      props.wagon({ x: -214 * m, z: RAIL_Z * m, yaw: Math.PI / 2 + flip, kind: 'tank' });
    });
    // parked cars and roadblocks in the streets
    both(props, 47, (m, flip) => {
      const r = props.rand;
      for (let i = 0; i < 26; i++) {
        const along = (r() - 0.5) * 2 * (TOWN - 20), line = Math.round((r() - 0.5) * 10) * GRID;
        const [x, z] = r() < 0.5 ? [line + 6, along] : [along, line + 6];
        if (z * m < 0 || square(x, z) || railD(x, z) < 6 || nearPoint(x, z, 14)) continue;
        if (r() < 0.75) props.wreckCar({ x: x * m, z: z * m, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + flip });
        else props.jersey({ x: x * m, z: z * m, yaw: r() * 3 + flip, length: 6 });
      }
    });
    coverSites(props, rand, bounds, (x, z) => !inTown(x - 10, z) && !inTown(x + 10, z) && Math.hypot(x, z - BASE_Z) > 40 && !nearPoint(x, z, 40) && Math.abs(x) > 12, 60, undefined, buildSite);
    const rotors = turbines(props, [[-380, 480, 0.4], [380, 470, 0.4]]);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();

    const cellOf = (v) => Math.floor(v / GRID) * GRID + GRID / 2;
    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
      { test: (x, z) => onStreet(x, z) || railD(x, z) < 4 || square(x, z) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 2600, hedges: 5000, noHedge: (x, z) => inTown(x, z),
      forest: (x, z) => {
        if (inTown(x, z)) return parks.has(`${cellOf(x)},${cellOf(z)}`) && Math.min(toStreet(x), toStreet(z)) > 9 ? 0.6 : -1;
        return Math.abs(x) > 450 || noise(x * 0.006 + 40, z * 0.006) > 0.45 || noise(-x * 0.006 + 40, -z * 0.006) > 0.45 ? 0.75 : 0;
      },
    });
    return {
      buildings: props.buildings,
      update(dt, t) { update(dt, t); for (const r of rotors) r.userData.spin.rotation.z -= dt * 0.9; },
    };
  },
} satisfies MapDef;
