// Valga–Valka, 2027 (a hypothetical war): one town split by the Estonian–Latvian border — Valka on the
// Latvian side (south), Valga on the Estonian side (north), the line running between their houses down
// the middle of streets, marked only by its border stones and an old checkpoint booth since Schengen.
// Valga station, where the lines from Riga, Tartu and Pskov meet, sits in the middle with its yard of
// wagons; wooden and plastered houses, churches and a few Soviet blocks round it. Hummocky ground at
// the foot of the Karula hills, forest and lakes all round. NATO holds Valka and the Riga road, Russia
// comes down the Pskov road through Valga. Not a mirror: the border wanders its own way through the
// town, the rail line and the road run their own courses, the lakes and woods lie where they lie; but
// each half has the same weight of town, the same number and sizes of lakes, its points at the same
// distances from its base, and the station sits on the line between them.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, modernVillage, flats, coverSites, vegetation, powerLine } from './common2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(2043);
/** The border between the two towns (and countries): z at x. */
const borderZ = (x) => 16 * Math.sin(x * 0.008 + 0.5) + 7 * Math.sin(x * 0.021);
/** The Riga–Tartu line through the station, and the Pskov branch off to the east. */
const railX = (z) => -40 + 18 * Math.sin(z * 0.004 + 0.3);
const branchZ = (x) => -14 + 22 * Math.sin(x * 0.004 + 0.2);
const roadX = (z) => 28 + 12 * Math.sin(z * 0.005 - 0.6);
const onRail = (x, z, r = 0) => Math.abs(x - railX(z)) < 4 + r || (x > railX(0) && Math.abs(z - branchZ(x)) < 4 + r);
const onRoad = (x, z, r = 0) => Math.abs(x - roadX(z)) < 7 + r;
const inTown = (x, z) => Math.abs(x) < 250 && Math.abs(z) < 280;

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  pt('A', 'Riga road', 0, 470, 'centre'),
  pt('B', 'Lugaži', -345, 305, 'west'),
  pt('C', 'Valka', 60, 215, 'centre'),
  pt('D', 'Ērģeme', 325, 290, 'east'),
  pt('E', 'Zāģezers', -305, 100, 'west', { radius: 22 }),
  pt('F', 'Valga station', railX(0) + 42, 0, 'centre', { radius: 24 }),
  pt('G', 'Tagula', 345, -90, 'east', { radius: 22 }),
  pt('H', 'Sooru', -365, -265, 'west'),
  pt('I', 'Valga', -95, -205, 'centre'),
  pt('J', 'Kaagjärve', 300, -330, 'east'),
  pt('K', 'Pskov road', 0, -470, 'centre'),
];
const nearPt = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// the lakes, three each half of the same sizes, each where it lies
const lakes = createLakes({ lakes: [
  { x: -205, z: 125, rx: 42, rz: 26, rot: 0.3, depth: 3.5, seed: 1 },
  { x: -440, z: 250, rx: 46, rz: 80, rot: 0.15, depth: 5, seed: 2 },
  { x: 225, z: 420, rx: 36, rz: 52, rot: -0.4, depth: 4, seed: 3 },
  { x: 175, z: -150, rx: 42, rz: 26, rot: -0.5, depth: 3.5, seed: 4 },
  { x: 430, z: -250, rx: 46, rz: 80, rot: -0.25, depth: 5, seed: 5 },
  { x: -250, z: -430, rx: 36, rz: 52, rot: 0.6, depth: 4, seed: 6 },
] });

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = 4 + fbm(noise, x * 0.004, z * 0.004, 5) * 6;                                             // the swells
  h += Math.max(0, ridged(noise, x * 0.012 + 40, z * 0.012, 4) - 0.4) * 9 * smoothstep(200, 320, Math.max(ax, az * 0.9)); // hummocks out of town
  h += fbm(noise, x * 0.04 + 100, z * 0.04, 3) * 0.5;
  h += smoothstep(500, 620, ax) * (14 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 18);
  h += smoothstep(560, 680, az) * 16;
  h += (h * 0.4 + 3 - h) * (1 - smoothstep(4, 12, Math.abs(x - railX(z)))) * 0.85;               // the line runs on the level
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return lakes.carve(x, z, Math.max(1.4, h));
}

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];

export default {
  id: 'valga-valka',
  name: 'Valga–Valka',
  epochs: ['2027'],
  region: 'baltic',
  armies: { nato: ['us', 'pl'], pact: ['ru'] }, // (NATO's forward battlegroups on the Estonian–Latvian border against the Russian Army from Pskov)
  description: 'The twin town on the Estonian–Latvian border, 2027: Valka and Valga split down their streets by the line, the rail junction’s station between them, forest and lakes round about.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2043,
  height,
  river: lakes,
  fields: createFields({ seed: 2043, cell: 70 }),

  theme: theme2027({
    clouds: 0.5, sunIntensity: 2.2,
    terrain: {
      roads: [-SIDE_X, SIDE_X], roadZ: 560,
      surface(x, z, y) {
        if (onRoad(x, z) && Math.abs(z) < 620) return [0x3c3d3f, 1];                                       // the Riga–Pskov road through both towns
        if (Math.abs(x - railX(z)) < 3.5 || (x > railX(0) && Math.abs(z - branchZ(x)) < 3.5)) return [0x6a6258, 0.9];
        if (Math.abs(x - railX(0) - 30) < 40 && Math.abs(z) < 30) return [0x5a5a58, 0.8];                    // the station square
        if (y < 1.1 && lakes.q(x, z) < 1.3) return [0x5c5a3c, smoothstep(1.1, 0.7, y)];
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
    const wet = (x, z, m = 1.25) => lakes.q(x, z) < m;
    const skip = (x, z, r) => wet(x, z, 1.35) || onRail(x, z, r + 2) || onRoad(x, z, r);

    // the railway: the main line, the Pskov branch, the yard's loops with wagons, the station
    for (let z = -600; z < 600; z += 20) props.rails({ x0: railX(z), z0: z, x1: railX(z + 20), z1: z + 20 });
    for (let x = railX(0); x < 600; x += 20) props.rails({ x0: x, z0: branchZ(x), x1: x + 20, z1: branchZ(x + 20) });
    for (const o of [-6, -12]) for (let z = -100; z < 100; z += 20) props.rails({ x0: railX(z) + o, z0: z, x1: railX(z + 20) + o, z1: z + 20 });
    props.rand = mulberry32(4311);
    for (const [o, z0, n] of [[-6, -80, 4], [-12, 30, 4], [-6, 40, 2]]) for (let i = 0; i < n; i++) {
      const z = z0 + i * 14; props.wagon({ x: railX(z) + o, z, yaw: Math.atan2(railX(z + 1) - railX(z), 1), kind: ['tank', 'box', 'open'][i % 3], color: [0x3a4a3a, 0x5a3426, 0x6a5a4a][i % 3] });
    }
    props.townHouse({ x: railX(0) + 16, z: -4, yaw: Math.PI / 2, width: 38, depth: 12, storeys: 2, name: 'Valga station', damaged: 0 });
    // the border through the town: stones every 25 m, the old checkpoint booth on the road, the barrier left up
    for (let x = -480; x <= 480; x += 25) if (!skip(x, borderZ(x), 1)) props.box('stone', x, terrain.heightAt(x, borderZ(x)) + 0.5, borderZ(x), 0.5, 1, 0.5, 0, 0xd8d4c8);
    { const x = roadX(borderZ(roadX(0))) + 12, z = borderZ(x); props.box('plaster', x, terrain.heightAt(x, z) + 1.3, z, 3, 2.6, 2.4, 0, 0xc8ccb8); }
    // the two towns (each its own streets): blocks of flats, houses, a church in each
    for (const [s, seed] of [[1, 4321], [-1, 4322]]) {
      props.rand = mulberry32(seed);
      const r = props.rand;
      for (let n = 0, i = 0; n < 7 && i < 300; i++) {
        const x = (r() - 0.5) * 420, z = s * (40 + r() * 220);
        if (skip(x, z, 18) || nearPt(x, z, 36) || z * s < borderZ(x) * s + 20) continue;
        flats(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, storeys: 3 + Math.floor(r() * 3), width: 30 + r() * 12, depth: 11 });
        n++;
      }
      for (let n = 0, i = 0; n < 34 && i < 800; i++) {
        const x = (r() - 0.5) * 460, z = s * (12 + r() * 250);
        if (skip(x, z, 7) || nearPt(x, z, 24) || z * s < borderZ(x) * s + 8) continue;
        props.townHouse({ x, z, yaw: Math.round(r() * 4) * Math.PI / 2 + (r() - 0.5) * 0.2, width: 8 + r() * 3, depth: 8 + r() * 3, storeys: r() < 0.4 ? 1 : 2, damaged: 0 });
        n++;
      }
    }
    props.church({ x: 110, z: 175, yaw: 0.1 });         // Valka’s Lutheran church
    props.church({ x: -110, z: -170, yaw: Math.PI });   // St John’s, Valga
    // villages on the other points, each its own
    for (const p of points) {
      if (!'BDEGHJ'.includes(p.id)) continue;
      props.rand = mulberry32(4350 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, n: p.radius ? 4 : 6, church: !p.radius });
    }
    coverSites(props, rand, bounds, (x, z) => !wet(x, z, 1.5) && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPt(x, z, 42) && !skip(x, z, 8) && !(Math.abs(x) < 240 && Math.abs(z) < 270), 190, undefined, buildSite, false);
    powerLine(props, 4388, (x) => 395 + x * 0.05, (x, z) => z < 0 || nearPt(x, z, 25) || skip(x, z, 6));
    powerLine(props, 4389, (x) => 410 - x * 0.06 + 18 * Math.sin(x * 0.009), (x, z) => z > 0 || nearPt(x, z, 25) || skip(x, z, 6));
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    lakes.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x, z) => wet(x, z, 1.02) || onRail(x, z, 3) || onRoad(x, z, 1) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 6000, hedges: 4000, broadleaf: 0.4,
      forest: (x, z) => {
        const v = lakes.q(x, z);
        if (v < 1.02) return -1;
        if (v < 1.3) return 0.45;                                                                      // alders on the shores
        if (inTown(x, z)) return 0.04;                                                                 // garden trees
        if (Math.abs(x) > 450) return 0.85;
        return noise(x * 0.006 + 512.9, z * 0.006 - 87.3) > 0.12 ? 0.85 : 0;                          // the forest (as much on each half)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
