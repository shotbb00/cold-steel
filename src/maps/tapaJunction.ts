// Tapa, 2027 (a hypothetical war): the rail junction town in the middle of Estonia and the army base
// beside it, home of NATO's battlegroup — flat open tank country between Tallinn and Narva. The main
// line from Tallinn to Narva runs straight through the map with the Tartu branch turning off at Tapa
// station, the town's blocks of flats round the station yard; the Tapa camp (barracks, the long vehicle
// sheds, the parade ground, a rail ramp) on the Tallinn side, Kadrina's blocks and grain elevator on the
// Rakvere side. The central training area's sandy ranges, scarred with tracks and its old hulks for
// targets, open the west flank; the Kõrvemaa bogs with their pools and stunted pines slow the east;
// long eskers rise out of the plain; spruce forest round it all. NATO holds the Tallinn side (south),
// Russia comes from Rakvere (north). Not a mirror: the rail line and the road wander their own ways, the
// eskers lie aslant differently, the camp and Kadrina are laid out differently and the pools fall where
// they fall; but the ranges and the bog straddle the middle with as much of each on each half, each side
// has one esker of the same height, a solid built-up point (the camp, Kadrina) at the same distance
// and its villages at the same distances.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost } from './common.js';
import { theme2027, modernVillage, flats, coverSites, vegetation, powerLine } from './common2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(2042);
/** The Tallinn–Narva main line's x at z, the highway's beside it. */
const railX = (z) => -60 + 22 * Math.sin(z * 0.0035 + 0.4);
const roadX = (z) => 26 + 14 * Math.sin(z * 0.004 + 1.3);
/** The Tartu branch: from the junction off to the east edge, along the middle. */
const branchZ = (x) => 30 * Math.sin(x * 0.005) + 6;
const onRail = (x, z, r = 0) => Math.abs(x - railX(z)) < 4 + r || (x > railX(0) && Math.abs(z - branchZ(x)) < 4 + r);
const onRoad = (x, z, r = 0) => Math.abs(x - roadX(z)) < 7 + r;
/** The training area's ranges (west) and the bog (east), each straddling the middle. */
const range = (x, z) => x < -170 && x > -470 && Math.abs(z) < 330 && fbm(noise, x * 0.005 + 50.3, z * 0.005 - 30.1, 3) > -0.15;
const bog = (x, z) => x > 170 && x < 480 && Math.abs(z) < 340 && fbm(noise, x * 0.005 - 91.7, z * 0.005 + 12.9, 3) > -0.2;
// the eskers, one each side: [x0, z0, x1, z1, height]
const ESKERS = [[-250, 170, -80, 380, 7], [80, -150, 165, -400, 7]];
const eskerD = (x, z, [x0, z0, x1, z1]) => { const dx = x1 - x0, dz = z1 - z0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - x0 - dx * t, z - z0 - dz * t); };

const pt = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: { radius?: number } = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const CAMP = { x: 70, z: 235 };
const points = [
  pt('A', 'Tallinn road', 0, 470, 'centre'),
  pt('B', 'Jäneda', -350, 300, 'west'),
  pt('C', 'Tapa camp', CAMP.x, CAMP.z, 'centre', { radius: 26 }),
  pt('D', 'Lehtse', 320, 290, 'east'),
  pt('E', 'Tapa ranges', -320, 105, 'west', { radius: 22 }),
  pt('F', 'Tapa station', railX(0) + 22, 0, 'centre', { radius: 24 }),
  pt('G', 'Kõrvemaa bog', 330, -105, 'east', { radius: 22 }),
  pt('H', 'Moe', -330, -285, 'west'),
  pt('I', 'Kadrina', -30, -230, 'centre'),
  pt('J', 'Vohnja', 300, -305, 'east'),
  pt('K', 'Rakvere road', 0, -470, 'centre'),
];
const nearPt = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
// each side's airfield behind its own lines (the open ranges would draw both strips into the middle): the tower, the strip 55 m behind it
const AIRS = [{ faction: 'nato', x: -260, z: 390, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 250, z: -390, yaw: -Math.PI / 2, large: false }];
const nearAir = (x, z) => AIRS.some((a) => Math.abs(x - a.x) < 140 && Math.abs(z - a.z - (a.faction === 'nato' ? 27 : -27)) < 66);

// the bog's pools (shallow: men and vehicles wade them slowly) and one deep bog lake each half; the same count and sizes each side
const POOLS: any[] = [
  { x: 260, z: 190, rx: 40, rz: 26, rot: 0.4, depth: 3.2, seed: 1 },
  { x: 420, z: -230, rx: 44, rz: 24, rot: -0.3, depth: 3.2, seed: 2 },
];
for (const [s, seed] of [[1, 4201], [-1, 4202]]) {
  const rr = mulberry32(seed);
  for (let i = 0, n = 0; n < 10 && i < 800; i++) {
    const x = 190 + rr() * 280, z = s * (10 + rr() * 320), rx = 12 + rr() * 18, rz = 9 + rr() * 12;
    if (!bog(x, z) || nearPt(x, z, rx + 34) || onRail(x, z, rx + 14) || POOLS.some((l) => Math.hypot(l.x - x, l.z - z) < l.rx + rx + 22) || Math.abs(x - SIDE_X) < rx + 14) continue;
    POOLS.push({ x, z, rx, rz, rot: rr() * 3, depth: 0.7, seed: POOLS.length + 1 });
    n++;
  }
}
const water = createLakes({ lakes: POOLS });

function height(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = 4 + fbm(noise, x * 0.003, z * 0.003, 4) * 3 + fbm(noise, x * 0.012 + 20, z * 0.012, 3) * 1 - z * 0.0005;   // the flat plain
  for (const e of ESKERS) h += e[4] * Math.exp(-((eskerD(x, z, e) / 20) ** 2));                            // the eskers: long gravel ridges
  if (bog(x, z)) h -= 1.2 * smoothstep(-0.2, 0.1, fbm(noise, x * 0.005 - 91.7, z * 0.005 + 12.9, 3));     // the bog sits low
  h += smoothstep(500, 620, ax) * 12 + smoothstep(560, 680, az) * 12;
  h += (4.5 - h) * (1 - smoothstep(4, 12, Math.abs(x - railX(z)))) * 0.85;                                 // the line runs level
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  return water.carve(x, z, Math.max(1.4, h));
}

const layout = [{ unit: 'rifles', x: 12, z: 454, name: '1st Platoon' }];

export default {
  id: 'tapa-junction',
  name: 'Tapa',
  epochs: ['2027'],
  region: 'baltic',
  armies: { nato: ['us', 'pl'], pact: ['ru'] }, // (NATO's forward battlegroup at Tapa against the Russian Army driving on Tallinn)
  description: 'Central Estonia, 2027: the rail junction town of Tapa and the army base beside it, the sandy ranges of the training area, the Kõrvemaa bogs and open tank country between the spruce woods.',
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 2042,
  height,
  river: water,
  airfields: AIRS,
  fields: createFields({ seed: 2042, cell: 90 }),

  theme: theme2027({
    clouds: 0.55, sunIntensity: 2.1,
    terrain: {
      roads: [-SIDE_X, SIDE_X], roadZ: 560,
      surface(x, z, y) {
        if (onRoad(x, z) && Math.abs(z) < 620) return [0x3c3d3f, 1];                                          // the highway
        if (Math.abs(x - railX(z)) < 3.5 || (x > railX(0) && Math.abs(z - branchZ(x)) < 3.5)) return [0x6a6258, 0.9]; // the ballast
        if (Math.abs(x - CAMP.x) < 34 && Math.abs(z - CAMP.z) < 22) return [0x55575a, 0.9];                      // the parade ground
        if (range(x, z)) return [0xa89670, 0.75];                                                            // the churned sand of the ranges
        if (bog(x, z)) return [0x7a6a44, 0.55];                                                              // the bog's sphagnum
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
    const wet = (x, z, m = 1.2) => water.q(x, z) < m;
    const skip = (x, z, r) => wet(x, z, 1.3) || onRail(x, z, r + 2) || onRoad(x, z, r);

    // the railway: the main line, the Tartu branch, the station's passing loops and wagons standing in the yard
    for (let z = -600; z < 600; z += 20) props.rails({ x0: railX(z), z0: z, x1: railX(z + 20), z1: z + 20 });
    for (let x = railX(0); x < 600; x += 20) props.rails({ x0: x, z0: branchZ(x), x1: x + 20, z1: branchZ(x + 20) });
    for (const o of [-6, 6]) for (let z = -90; z < 90; z += 20) props.rails({ x0: railX(z) + o, z0: z, x1: railX(z + 20) + o, z1: z + 20 });
    props.rand = mulberry32(4211);
    for (const [o, z0, n] of [[-6, -70, 5], [6, 20, 4], [6, -80, 3]]) for (let i = 0; i < n; i++) {
      const z = z0 + i * 14; props.wagon({ x: railX(z) + o, z, yaw: Math.atan2(railX(z + 1) - railX(z), 1), kind: ['box', 'tank', 'open'][i % 3], color: [0x5a3426, 0x3a4a3a, 0x6a5a4a][i % 3] });
    }
    props.townHouse({ x: railX(0) + 16, z: 4, yaw: Math.PI / 2, width: 34, depth: 11, storeys: 2, name: 'Tapa station', damaged: 0 });
    props.tanks({ x: railX(0) - 16, z: 40, yaw: 0, count: 1, radius: 3, height: 14, color: 0x8a5a48 }); // the old water tower
    // Tapa town round the station, both sides of the line: blocks of flats and houses (each half its own streets)
    for (const [s, seed] of [[1, 4221], [-1, 4222]]) {
      props.rand = mulberry32(seed);
      const r = props.rand;
      for (let n = 0, i = 0; n < 7 && i < 300; i++) {
        const x = railX(0) + (r() - 0.5) * 300, z = s * (40 + r() * 110);
        if (skip(x, z, 18) || nearPt(x, z, 34)) continue;
        flats(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, storeys: 3 + Math.floor(r() * 3), width: 30 + r() * 14, depth: 11 });
        n++;
      }
      for (let n = 0, i = 0; n < 12 && i < 300; i++) {
        const x = railX(0) + (r() - 0.5) * 320, z = s * (30 + r() * 130);
        if (skip(x, z, 7) || nearPt(x, z, 26)) continue;
        props.townHouse({ x, z, yaw: r() * 3, width: 9, depth: 9, storeys: r() < 0.5 ? 1 : 2, damaged: 0 });
        n++;
      }
    }
    // the Tapa camp: barracks blocks, the vehicle sheds, headquarters round the parade ground, the fence with its gates
    props.rand = mulberry32(4231);
    for (const [x, z] of [[-14, 48], [40, 48]]) flats(props, { x: CAMP.x + x, z: CAMP.z + z, yaw: 0, storeys: 3, width: 34, depth: 11, name: 'barracks' });
    for (const z of [-10, 14]) flats(props, { x: CAMP.x + 62, z: CAMP.z + z, yaw: Math.PI / 2, storeys: 3, width: 30, depth: 11, name: 'barracks' });
    for (const x of [-30, 10, 50]) props.hall({ x: CAMP.x + x, z: CAMP.z - 44, yaw: Math.PI, width: 34, depth: 16, height: 7, color: 0x8a8a7a, roof: 0x4e5a4a, door: 10, name: 'vehicle shed' });
    props.townHouse({ x: CAMP.x - 58, z: CAMP.z + 8, yaw: -Math.PI / 2, width: 22, depth: 11, storeys: 2, name: 'headquarters', damaged: 0 });
    props.fence({ x0: CAMP.x - 90, x1: CAMP.x + 90, z: CAMP.z + 72, breaches: [[CAMP.x - 14, CAMP.x + 14]] });
    props.fence({ x0: CAMP.x - 90, x1: CAMP.x + 90, z: CAMP.z - 70, breaches: [[CAMP.x - 14, CAMP.x + 14]] });
    for (const x of [-12, 12]) props.jersey({ x: CAMP.x + x, z: CAMP.z - 78, yaw: 0, length: 5 });
    // Kadrina: Soviet blocks, the grain elevator and its sheds, the school, the church
    props.rand = mulberry32(4241);
    for (const [x, z, yaw] of [[-60, 40, 0], [-20, 52, 0.1], [40, 30, Math.PI / 2], [-78, -6, Math.PI / 2]]) flats(props, { x: -30 + x, z: -240 - z, yaw, storeys: 4, width: 34, depth: 11 });
    props.hall({ x: 40, z: -205, yaw: 0.3, width: 30, depth: 14, height: 9, color: 0x9a9a92, roof: 0x5a5c60, door: 8, name: 'grain store' });
    props.tanks({ x: 62, z: -228, yaw: 0.3, count: 4, radius: 3.2, height: 18, color: 0xb8bab4 });
    props.flatHouse({ x: -30, z: -192, yaw: 0, width: 30, depth: 14, storeys: 2, name: 'Kadrina school' });
    props.church({ x: 22, z: -272, yaw: Math.PI });
    // villages on the other points, each its own; the manor at Jäneda, the distillery at Moe
    for (const p of points) {
      if (!'BDHJ'.includes(p.id)) continue;
      props.rand = mulberry32(4250 + Math.round(p.x * 3 + p.z));
      modernVillage(props, p, 1, 0, { skip, church: 'BH'.includes(p.id) });
    }
    props.townHouse({ x: -300, z: 340, yaw: 0.3, width: 26, depth: 13, storeys: 2, name: 'Jäneda manor', damaged: 0 });
    props.hall({ x: -290, z: -320, yaw: 2.8, width: 28, depth: 14, height: 8, color: 0x8a6a52, roof: 0x4a4c4e, door: 6, name: 'Moe distillery' });
    // the ranges: earth target berms, old hulks, the range towers
    props.rand = mulberry32(4261);
    for (let i = 0, n = 0; n < 26 && i < 600; i++) {
      const x = -470 + props.rand() * 300, z = (props.rand() * 2 - 1) * 320;
      if (!range(x, z) || nearPt(x, z, 30) || Math.abs(x + SIDE_X) < 14) continue;
      if (n % 2) props.wreckCar({ x, z, yaw: props.rand() * 3 });
      else props.wall({ x, z, yaw: props.rand() * 3, length: 10 + props.rand() * 6, height: 1.6, thickness: 2 });
      n++;
    }
    for (const [x, z] of [[-230, 260], [-400, -180]]) props.tower({ x, z, concrete: true });
    for (const [x, z] of [[230, -250], [400, 160], [250, 20]]) if (!wet(x, z, 1.5)) props.highSeat({ x, z, yaw: z < 0 ? Math.PI : 0 });
    coverSites(props, rand, bounds, (x, z) => !range(x, z) && !bog(x, z) && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 && !nearPt(x, z, 42) && !skip(x, z, 8) && !nearAir(x, z), 200, undefined, buildSite, false);
    powerLine(props, 4288, (x) => 335 + x * 0.06, (x, z) => z < 0 || nearPt(x, z, 25) || skip(x, z, 6));
    powerLine(props, 4289, (x) => 345 - x * 0.05 + 14 * Math.sin(x * 0.01), (x, z) => z > 0 || nearPt(x, z, 25) || skip(x, z, 6));
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5a3a);
    props.finish();
    water.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { x: CAMP.x, z: CAMP.z, r: 95 }, { test: (x, z) => wet(x, z, 1.02) || onRail(x, z, 3) || onRoad(x, z, 1) || nearAir(x, z) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 5000, hedges: 2500, broadleaf: 0.25,
      noHedge: (x, z) => range(x, z) || bog(x, z),
      forest: (x, z) => {
        if (wet(x, z, 1.02)) return -1;
        if (range(x, z)) return 0.02;
        if (bog(x, z)) return 0.22;                                                          // stunted bog pines
        if (Math.abs(x) > 460) return 0.85;
        return noise(x * 0.006 + 333.1, z * 0.006 - 151.7) > 0.28 ? 0.85 : 0;               // spruce woods (as much on each half)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
