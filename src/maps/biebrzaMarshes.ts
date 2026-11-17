// The Biebrza Marshes, 2027 (a hypothetical war): the great wetland on the western flank of the Suwałki
// Gap. Sedge and reed beds as far as you can see, shallow pools that men and vehicles wade only slowly,
// the deep oxbows of the river that nothing crosses, birch and alder carr, and the raised causeway roads
// — the only fast way through. In the middle the Tsar's old fortress of Osowiec, its brick ruins and
// earth ramparts guarding the causeway. Villages on the islands of dry ground. NATO holds the south,
// Russia comes from the north. Point-mirrored.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, pointsFrom, both, modernVillage, coverSites, vegetation } from './common2027.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const ROADS = [-SIDE_X, 0, SIDE_X];
const noise = createNoise2D(2032);
const causeway = (x) => ROADS.some((r) => Math.abs(x - r) < 7);

// our half's water: the river's deep oxbows near the middle, the shallow marsh pools everywhere
const rr = mulberry32(2032);
const HALF = [
  { x: -170, z: 20, rx: 70, rz: 18, rot: 0.15, depth: 3.5, seed: 1 },
  { x: -470, z: 40, rx: 50, rz: 20, rot: -0.2, depth: 3.2, seed: 2 },
  { x: 170, z: 30, rx: 60, rz: 16, rot: -0.1, depth: 3.4, seed: 3 },
];
for (let i = 0; HALF.length < 24 && i < 400; i++) { // shallow pools, away from the roads and the bases
  const x = (rr() * 2 - 1) * 470, z = 60 + rr() * 380, rx = 18 + rr() * 30, rz = 12 + rr() * 22;
  if (ROADS.some((r) => Math.abs(x - r) < rx + 22) || Math.hypot(x, z - BASE_Z) < 90 || HALF.some((l) => Math.hypot(l.x - x, l.z - z) < l.rx + rx + 25)) continue;
  HALF.push({ x, z, rx, rz, rot: rr() * 3, depth: 0.7, seed: HALF.length + 1 });
}
const water = createLakes({ lakes: [...HALF, ...HALF.map((l) => ({ ...l, x: -l.x, z: -l.z }))] });

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
  if (causeway(x) && az < 620) h = Math.max(h, 2.6); // the causeways stand above the water
  return h;
}

const points = pointsFrom([
  ['A', 'Mońki road', 0, 470],
  ['B', 'Dolistowo', -SIDE_X, 330],
  ['C', 'Goniądz', 0, 230],
  ['D', 'Mścichy', SIDE_X, 280],
  ['E', 'Brzostowo', -SIDE_X, 110, { radius: 22 }],
  ['F', 'Twierdza Osowiec', 0, 0, { radius: 26 }],
], ['Burzyn', 'Dobarz', 'Rutkowskie', 'Laskowiec', 'Grajewo road']);

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
        if (causeway(x) && Math.abs(z) < 620) return [0x5a5850, 0.95];   // gravel causeways
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
    const skip = (x, z, r) => wet(x, z, 1.3) || (causeway(x) && r > 0) || Math.abs(x) < 8 + r;

    // Osowiec: the brick ruins of the fort's barracks and casemates inside the ramparts
    both(props, 3201, (m, flip) => {
      const r = props.rand;
      for (const [x, z, w] of [[-30, 30, 30], [30, 40, 22], [-40, -5, 18], [45, 5, 16]]) {
        if (z * m < 0 && m > 0) continue;
        props.ruinBlock({ x: x * m, z: z * m, yaw: (x < 0 ? 0.3 : -0.3) + flip, width: w, depth: 10, storeys: 1 + Math.floor(r() * 2), ruin: 0.45, name: 'fort casemate' });
      }
      props.wall({ x: -55 * m, z: 52 * m, yaw: 0.8 + flip, length: 16, height: 2 });
      props.wall({ x: 58 * m, z: 48 * m, yaw: -0.8 + flip, length: 16, height: 2 });
      // the causeway bridges' barricades
      for (const x of ROADS) props.jersey({ x: (x - 3) * m, z: 85 * m, yaw: 0.1 + flip, length: 5 });
    });
    for (const p of points) {
      if (p.z <= 0 || p.id === 'A' || p.id === 'F') continue;
      both(props, 3250 + Math.round(p.x + p.z), (m, flip) => modernVillage(props, p, m, flip, { skip, n: 5, church: p.id === 'C' || p.id === 'B' }));
    }
    // birdwatching towers and boardwalks over the reeds — and the hay the farmers cut from them
    both(props, 3277, (m) => {
      for (const [x, z] of [[-240, 180], [240, 380], [-420, 300]]) if (!wet(x * m, z * m)) props.highSeat({ x: x * m, z: z * m, yaw: 0 });
    });
    coverSites(props, rand, bounds, (x, z) => !wet(x, z, 1.5) && Math.hypot(x, z - BASE_Z) > 40 && !nearPoint(x, z, 40) && !causeway(x), 90, ['hay', 'fieldwall', 'hay', 'rocks', 'wrecks', 'farm'], buildSite);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    water.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => wet(x, z, 1.02) || (causeway(x) && Math.abs(z) < 620) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4500, hedges: 0, broadleaf: 0.7, autumn: 0.1,
      forest: (x, z) => {
        if (wet(x, z, 1.02)) return -1;
        if (Math.abs(x) > 460) return 0.8;
        const carr = noise(x * 0.008 + 20, z * 0.008) > 0.3 || noise(-x * 0.008 + 20, -z * 0.008) > 0.3;   // birch and alder carr
        return carr ? 0.6 : 0.05;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
