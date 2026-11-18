// The Ardennes, December 1944: Bastogne in the snow (1945 only). The market town in the middle of the
// field, where six roads meet — the reason both sides wanted it — and round it the ring of villages the
// 101st Airborne held through the siege: Foy and Noville up the road to the north, Champs, Hemroulle and
// Senonchamps to the west, Marvie and the Mardasson hill to the east, Assenois in the south where
// Patton's tanks broke in on the 26th. Between the villages the snowed-over Ardennes plateau, open fields
// and dark fir woods (the Bois Jacques where Easy Company dug in), a low overcast and the fog that kept
// the aircraft on the ground until the 23rd. In the woods sight is a few dozen metres (map `woods`).
// The Americans hold the south (+z), the Germans come from the north. Point-mirrored to keep it fair:
// the town, the roads and the hills have their twin across the square; only the names differ.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const TOWN = 115;   // Bastogne's radius
const noise = createNoise2D(1944_12);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Clochimont', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Senonchamps', x: -420, z: 230, owner: null, sector: 'west' },
  { id: 'C', name: 'Assenois', x: -60, z: 340, owner: null, sector: 'centre' },
  { id: 'D', name: 'Marvie', x: 270, z: 390, owner: null, sector: 'east' },
  { id: 'E', name: 'Hemroulle', x: -190, z: 95, owner: null, sector: 'west' },
  { id: 'F', name: 'Bastogne', x: 0, z: 0, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Mardasson', x: 190, z: -95, owner: null, sector: 'east' },
  { id: 'H', name: 'Champs', x: -270, z: -390, owner: null, sector: 'west' },
  { id: 'I', name: 'Foy', x: 60, z: -340, owner: null, sector: 'centre' },
  { id: 'J', name: 'Bois Jacques', x: 420, z: -230, owner: null, sector: 'east', radius: 22 },
  { id: 'K', name: 'Noville', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const CLEARING = 40;

// ---- the roads: out of the town to the villages and on to the edges (our half; each has its mirror)
const HALF: [number, number, number, number, number][] = [ // x0, z0, x1, z1, bend (m sideways at the middle)
  [0, 0, P.E.x, P.E.z, 14], [0, 0, P.C.x, P.C.z, -18], [0, 0, P.D.x, P.D.z, 22],
  [P.C.x, P.C.z, 0, 560, 10], [P.E.x, P.E.z, P.B.x, P.B.z, -16], [P.B.x, P.B.z, -560, 330, 12],
  [P.D.x, P.D.z, 560, 470, -10], [P.D.x, P.D.z, P.A.x + 30, P.A.z + 20, 16], [P.B.x, P.B.z, -330, 560, 8],
];
/** Each road as a run of short straight pieces [x0, z0, x1, z1]. */
const PIECES: number[][] = [];
for (const [x0, z0, x1, z1, bend] of HALF) {
  for (const m of [1, -1]) {
    const len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
    const at = (t) => [(x0 + (x1 - x0) * t + nx * bend * Math.sin(Math.PI * t)) * m, (z0 + (z1 - z0) * t + nz * bend * Math.sin(Math.PI * t)) * m];
    for (let k = 0; k < 10; k++) PIECES.push([...at(k / 10), ...at((k + 1) / 10)]);
  }
}
/** Distance to the nearest road, up to NEAR m (beyond: NEAR). The terrain asks it for every sample, so the pieces
 *  are sorted into CELL-m squares first: each question looks only at the few pieces near it. */
const CELL = 50, NEAR = 40;
const buckets = new Map<string, number[][]>();
for (const pc of PIECES) {
  const [ax, az, bx, bz] = pc;
  for (let i = Math.floor((Math.min(ax, bx) - NEAR) / CELL); i <= Math.floor((Math.max(ax, bx) + NEAR) / CELL); i++)
    for (let j = Math.floor((Math.min(az, bz) - NEAR) / CELL); j <= Math.floor((Math.max(az, bz) + NEAR) / CELL); j++) {
      const k = i + ',' + j;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(pc);
    }
}
function roadDist(x, z) {
  let d = NEAR;
  for (const [ax, az, bx, bz] of buckets.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)) ?? []) {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}

/** 1 in the town, 0 outside it. */
const town = (x, z) => smoothstep(TOWN + 15, TOWN - 15, Math.hypot(x, z));

function raw(x, z) {
  return fbm(noise, x * 0.0035, z * 0.0035, 4) * 14 + fbm(noise, x * 0.03 + 9, z * 0.03, 3) * 0.7
    + hill(x, z, P.G.x + 20, P.G.z - 10, 90, 9);           // the Mardasson (and its twin under Hemroulle)
}
function height(x, z) {
  let h = (raw(x, z) + raw(-x, -z)) / 2 + 8;
  const t = town(x, z);
  h += (8 + fbm(noise, x * 0.004, z * 0.004, 2) * 1.5 - h) * t * 0.85; // the town on its level shoulder
  h -= smoothstep(14, 4, roadDist(x, z)) * 0.5;                       // the roads' beds
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 110, Math.abs(x)) * 12 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 10;
  return h;
}

/** The fir woods (0..1), point-symmetric: blocks of spruce plantation between the open fields. */
const wood = (x, z) => {
  const [ax, az] = z < 0 || (z === 0 && x < 0) ? [-x, -z] : [x, z];
  return smoothstep(0.08, 0.2, fbm(noise, ax * 0.006 - 31, az * 0.006 + 17, 3));
};
function woods(x, z) {
  let k = Math.max(wood(x, z), smoothstep(130, 50, Math.hypot(x - P.J.x, z - P.J.z)), smoothstep(130, 50, Math.hypot(x + P.J.x, z + P.J.z)));
  k = Math.min(k, smoothstep(5, 14, roadDist(x, z)), 1 - town(x, z));
  k = Math.min(k, 0.35 + 0.65 * smoothstep(14, 26, Math.min(Math.hypot(x - P.J.x, z - P.J.z), Math.hypot(x + P.J.x, z + P.J.z)))); // the clearing
  for (const p of points) if (p.id !== 'J' && p.id !== 'B') k = Math.min(k, smoothstep(CLEARING * 0.8, CLEARING * 1.3, Math.hypot(x - p.x, z - p.z)));
  for (const bz of [BASE_Z, -BASE_Z]) k = Math.min(k, smoothstep(30, 46, Math.hypot(x, z - bz)));
  return k;
}
/** The Bois Jacques clearing (and its twin by Senonchamps): the foxholes, trees all round. */
const inJacques = (x, z) => Math.min(Math.hypot(x - P.J.x, z - P.J.z), Math.hypot(x + P.J.x, z + P.J.z)) < 18;

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'ardennes',
  armies: { nato: ['us'], pact: ['wh', 'fj'] }, // (the 101st Airborne and Patton's Third Army against the Wehrmacht and the 5th Fallschirmjäger Division)
  name: 'Bastogne',
  description: 'The Ardennes, December 1944: Bastogne in the snow, six roads meeting in the town, the ring of villages round it and the dark fir woods between, under fog and low cloud. Mirrored to keep it fair.',
  epochs: ['1945'],
  region: 'europe',
  climate: 'winter',   // whitewash and snow smocks (render/paint.js CLIMATE)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1944,
  height,
  woods,
  fields: createFields({ seed: 1912, cell: 80 }),

  theme: {
    // low overcast and freezing fog: the aircraft stay on the ground
    fogColor: 0xc2c6ca,
    fogDensity: 0.0032,
    skyTop: 0x868c94,
    skyHorizon: 0xc6cacc,
    skyBottom: 0x8a8e92,
    sunColor: 0xdfe4ea,
    sunIntensity: 1.15,
    sunDisk: 0.02,
    clouds: 1,
    cloudLight: 0xc8ccd0,
    cloudDark: 0x80868c,
    sunDir: [0.35, 0.4, 0.75],
    hemiSky: 0xd2d8e0,
    hemiGround: 0x8c9096,
    hemiIntensity: 1.45,
    rimColor: 0xc0c8d2,
    rimIntensity: 0.2,
    terrain: {
      grass: '#eef0f0',
      grassAlt: '#e2e6e8',
      dryGrass: '#d8d6ce',
      dirt: '#9c968c',
      rock: '#b8bab8',
      pasture: '#eaeded',
      ploughed: '#d2d0c8',
      stubble: '#dedad0',
      meadow: '#f2f4f4',
      farmX: [520, 600],
      farmZ: [580, 660],
      roads: [],
      surface(x, z) {
        const r = smoothstep(5.5, 3, roadDist(x, z));
        if (r > 0) return [0x8e8a82, r * 0.85];                        // the roads: snow churned to slush by the columns
        const t = town(x, z);
        if (t > 0) return [0xb8b4ac, t * 0.4];                         // trodden yards and gardens
        const w = woods(x, z);
        return w > 0.3 ? [0xc8ccc8, (w - 0.3) * 0.5] : null;          // thin snow under the firs
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-200, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [-200, 0, 200] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const taken: number[][] = []; // footprints [x, z, r] the houses keep clear of

    // ---- Bastogne: the square with Saint-Pierre's church, the seminary / the barracks, houses down each road
    mirrored(props, 4401, (m, flip) => {
      props.church({ x: 22 * m, z: -26 * m, yaw: Math.PI / 2 + flip });
      props.hall({ x: -70 * m, z: -62 * m, yaw: 0.6 + flip, width: 30, depth: 14, height: 9, color: 0x8a8274, roof: 0x3e4044, door: 6, name: m > 0 ? 'seminary' : 'Heintz Barracks' });
      props.townHouse({ x: 0, z: 30 * m, yaw: flip, width: 18, depth: 10, storeys: 3, name: 'hôtel de ville', damaged: 0.4 });
      for (const [x, z] of [[-8, 10], [12, 4]]) props.wreckCar({ x: x * m, z: z * m, yaw: x + flip });
      props.logBarricade({ x: 0, z: (TOWN - 4) * m, yaw: 0.2, length: 7 });
    });
    taken.push([22, -26, 16], [-22, 26, 16], [-70, -62, 22], [70, 62, 22], [0, 30, 13], [0, -30, 13], [0, 0, 24]);
    const free = (x, z, r) => !taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < r + tr) && roadDist(x, z) > r + 3;
    const rr = mulberry32(1226);
    // rows of houses along the six roads out of the square (our three; mirrored)
    for (const r0 of [0, 20, 40]) { // (PIECES: the first three roads out of the square, ten pieces each, ours before the mirror's)
      for (let d = 30; d < TOWN + 10; d += 9 + rr() * 4) {
        const L = Math.hypot(PIECES[r0 + 9][2], PIECES[r0 + 9][3]), k = Math.min(9, Math.floor(d / L * 10));
        const [ax, az, bx, bz] = PIECES[r0 + k];
        const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
        const px = ax + ux * (d - k * L / 10), pz = az + uz * (d - k * L / 10); // the road's point d m out from the square
        for (const side of [-1, 1]) {
          if (rr() < 0.25) continue;
          const w = 7 + rr() * 3, dep = 8 + rr() * 2, off = 6.5 + dep / 2;
          const x = px - uz * side * off, z = pz + ux * side * off;
          if (!free(x, z, Math.max(w, dep) / 2 - 1)) continue;
          taken.push([x, z, Math.max(w, dep) / 2], [-x, -z, Math.max(w, dep) / 2]);
          const yaw = Math.atan2(uz * side, -ux * side); // the front (local +z) toward the road
          const seed = Math.floor(rr() * 1e9), storeys = rr() < 0.3 ? 3 : 2;
          mirrored(props, seed, (m, flip) => props.townHouse({ x: x * m, z: z * m, yaw: yaw + flip, width: w, depth: dep, storeys, damaged: 0.45 }));
        }
      }
    }
    // backyard walls, rubble and a wreck or two in the gaps
    for (let i = 0; i < 40; i++) {
      const a = rr() * Math.PI * 2, d = 25 + rr() * (TOWN - 25), x = Math.cos(a) * d, z = Math.abs(Math.sin(a) * d) + 4;
      if (!free(x, z, 3)) continue;
      const seed = Math.floor(rr() * 1e9), kind = rr();
      mirrored(props, seed, (m, flip) => {
        if (kind < 0.3) props.lowWall({ x: x * m, z: z * m, yaw: props.rand() * 3 + flip, length: 5 + props.rand() * 5, height: 1.2 });
        else if (kind < 0.7) props.wreckCar({ x: x * m, z: z * m, yaw: props.rand() * 3 + flip });
        else for (let k = 0; k < 4; k++) props.rubble(x * m + (props.rand() - 0.5) * 4, z * m + (props.rand() - 0.5) * 4, 0.4 + props.rand() * 0.5);
      });
    }

    // ---- the villages of the ring: stone farms round the crossroads, a chapel in the bigger ones
    for (const [p, seed, chapel] of [[P.C, 7301, true], [P.D, 7302, true], [P.E, 7303, false]] as const) {
      buildVillage(props, p, seed, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
      mirrored(props, seed + 1, (m, flip) => {
        const q = { x: p.x * m, z: p.z * m };
        if (chapel) props.church({ x: q.x + 26 * m, z: q.z - 4 * m, yaw: flip });
        props.townHouse({ x: q.x - 22 * m, z: q.z + 18 * m, yaw: flip + 0.3, width: 9, depth: 8, storeys: 2, damaged: 0.5 });
        props.hayBales({ x: q.x + 4 * m, z: q.z + 26 * m, yaw: 0.5 + flip, count: 3 });
      });
    }
    // the Mardasson: a farm on the hilltop, a dug-in line along its crest (and the twin by Hemroulle)
    mirrored(props, 7310, (m, flip) => {
      const q = { x: P.G.x * m, z: P.G.z * m };
      props.house({ x: q.x - 18 * m, z: q.z - 14 * m, yaw: flip + 0.4, width: 11, depth: 7 });
      for (let k = 0; k < 3; k++) props.sandbagRing({ x: q.x + (-14 + k * 14) * m, z: q.z + 20 * m, radius: 2.4, toward: m });
    });
    // the Bois Jacques: foxholes in a clearing of the firs, log piles from the felled trees (and its twin in the woods by Senonchamps)
    mirrored(props, 7320, (m, flip) => {
      const q = { x: P.J.x * m, z: P.J.z * m };
      for (let k = 0; k < 5; k++) {
        const a = k * 1.25 + 0.3;
        props.sandbagRing({ x: q.x + Math.cos(a) * 11 * m, z: q.z + Math.sin(a) * 11 * m, radius: 1.8, toward: m });
      }
      props.logPile({ x: q.x - 4 * m, z: q.z + 2 * m, yaw: flip + 0.7, length: 7 });
      props.logPile({ x: q.x + 6 * m, z: q.z - 5 * m, yaw: flip + 2.1, length: 6 });
      props.house({ x: q.x + 2 * m, z: q.z + 26 * m, yaw: flip + 0.2, width: 8, depth: 6 }); // the forester's house by the track
    });

    // ---- out in the fields: farms, stone walls, hay, the wrecks of the first days by the roads
    const kinds = ['farm', 'fieldwall', 'hay', 'wrecks', 'fieldwall', 'farm', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 8000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = 20 + rand() * (bounds.z - 40);
      if (town(x, z) > 0 || woods(x, z) > 0.2 || roadDist(x, z) < 12 || sites.some((s) => Math.hypot(s.x - x, s.z - z) < 30)) continue;
      if (Math.hypot(x, z - BASE_Z) < 45 || points.some((p) => Math.hypot(x - p.x, z - p.z) < 42)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6c5a);
    commandPost(props, this.bases.pact, 1, 0x6a6a5a);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, { test: (x, z) => roadDist(x, z) < 6 || town(x, z) > 0.5 || inJacques(x, z) }];
    // the firs: spruce plantations, a little beech at their edges, bare
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 18000, broadleaf: 0.04, autumn: 1, forest: (x, z) => woods(x, z) * 0.97 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.7, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
