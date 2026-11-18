// The Ardennes, December 1944: Bastogne in the snow (1945 only). The market town in the middle of the
// field, where six roads meet — the reason both sides wanted it — and round it the ring of villages the
// 101st Airborne held through the siege: Foy and Noville up the road to the north, Champs, Hemroulle and
// Senonchamps to the west, Marvie and the Mardasson hill to the east, Assenois in the south where
// Patton's tanks broke in on the 26th. Between the villages the snowed-over Ardennes plateau, open fields
// and dark fir woods (the Bois Jacques where Easy Company dug in), a low overcast and the fog that kept
// the aircraft on the ground until the 23rd. In the woods sight is a few dozen metres (map `woods`).
// The Americans hold the south (+z), the Germans come from the north. Not mirrored, but fair: the six roads leave
// the square where they really do, each half has its own woods and villages; the Mardasson's bare hill answers the
// wooded rise by Hemroulle, the Bois Jacques the woods and gun line at Senonchamps, and each point is about as far
// from one base as its counterpart is from the other.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const TOWN = 115;   // Bastogne's radius
const noise = createNoise2D(1944_12);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Clochimont', x: -20, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Senonchamps', x: -400, z: 270, owner: null, sector: 'west' },
  { id: 'C', name: 'Assenois', x: -40, z: 330, owner: null, sector: 'centre' },
  { id: 'D', name: 'Marvie', x: 300, z: 355, owner: null, sector: 'east' },
  { id: 'E', name: 'Hemroulle', x: -190, z: 85, owner: null, sector: 'west' },
  { id: 'F', name: 'Bastogne', x: 0, z: 0, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Mardasson', x: 185, z: -120, owner: null, sector: 'east' },
  { id: 'H', name: 'Champs', x: -284, z: -297, owner: null, sector: 'west' },
  { id: 'I', name: 'Foy', x: -4, z: -314, owner: null, sector: 'centre' },
  { id: 'J', name: 'Bois Jacques', x: 431, z: -333, owner: null, sector: 'east', radius: 22 },
  { id: 'K', name: 'Noville', x: -20, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const CLEARING = 40;

// ---- the roads: out of the town to the villages and on to the edges. The first six leave the square: the Marche road
// west by Hemroulle, the Arlon road south to Assenois, the Wiltz road by Marvie; the Houffalize road north to Foy, the
// Longvilly road east under the Mardasson, the road to Champs north-west.
const ROADS: [number, number, number, number, number][] = [ // x0, z0, x1, z1, bend (m sideways at the middle)
  [0, 0, P.E.x, P.E.z, 14], [0, 0, P.C.x, P.C.z, -18], [0, 0, P.D.x, P.D.z, 22],
  [0, 0, P.I.x, P.I.z, -12], [0, 0, P.G.x, P.G.z, 16], [0, 0, P.H.x, P.H.z, -24],
  [P.C.x, P.C.z, 0, 560, 10], [P.E.x, P.E.z, P.B.x, P.B.z, -16], [P.B.x, P.B.z, -560, 330, 12],
  [P.D.x, P.D.z, 560, 470, -10], [P.D.x, P.D.z, P.A.x + 30, P.A.z + 20, 16], [P.B.x, P.B.z, -330, 560, 8],
  [P.I.x, P.I.z, P.K.x - 20, P.K.z - 40, 14], [P.I.x, P.I.z, P.J.x, P.J.z, -20], [P.G.x, P.G.z, 560, -170, 10],
  [P.H.x, P.H.z, -560, -420, -12], [P.H.x, P.H.z, -240, -560, 10], [P.J.x, P.J.z, 470, -560, -8],
];
const TOWN_ROADS = 6;
/** Each road as a run of short straight pieces [x0, z0, x1, z1]. */
const PIECES: number[][] = [];
for (const [x0, z0, x1, z1, bend] of ROADS) {
  const len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
  const at = (t) => [x0 + (x1 - x0) * t + nx * bend * Math.sin(Math.PI * t), z0 + (z1 - z0) * t + nz * bend * Math.sin(Math.PI * t)];
  for (let k = 0; k < 10; k++) PIECES.push([...at(k / 10), ...at((k + 1) / 10)]);
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
  return fbm(noise, x * 0.0035 + 7.3, z * 0.0035 + 29.1, 4) * 14 + fbm(noise, x * 0.03 + 9, z * 0.03, 3) * 0.7
    + hill(x, z, P.G.x + 20, P.G.z - 10, 90, 9)            // the Mardasson: bare, the town under its guns
    + hill(x, z, P.E.x - 30, P.E.z + 20, 110, 10);         // the rise west of Hemroulle: broader, wooded
}
function height(x, z) {
  let h = raw(x, z) + 8;
  const t = town(x, z);
  h += (8 + fbm(noise, x * 0.004, z * 0.004, 2) * 1.5 - h) * t * 0.85; // the town on its level shoulder
  h -= smoothstep(14, 4, roadDist(x, z)) * 0.5;                       // the roads' beds
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 110, Math.abs(x)) * 12 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 10;
  return h;
}

/** 1 inside an ellipse (radii rx along `a`, rz across), fading over its last 40 m. */
const ell = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1 + 40 / rx, 1, Math.hypot(u, v));
};
/** The fir woods (0..1): blocks of spruce plantation between the open fields; the Bois Jacques round its clearing,
 *  the long wood behind Senonchamps' gun line, the firs on the rise by Hemroulle. */
const wood = (x, z) => Math.max(smoothstep(0.08, 0.2, fbm(noise, x * 0.006 - 31, z * 0.006 + 17, 3)),
  smoothstep(130, 50, Math.hypot(x - P.J.x, z - P.J.z)), ell(x, z, P.B.x - 30, P.B.z - 75, 150, 55, 0.5), ell(x, z, P.E.x - 45, P.E.z + 35, 70, 40, -0.8),
  ell(x, z, -110, -280, 140, 60, 0.3));                // (the last: the Bois de Fazone, between Foy and Champs)
function woods(x, z) {
  let k = Math.min(wood(x, z), smoothstep(5, 14, roadDist(x, z)), 1 - town(x, z));
  k = Math.min(k, 0.35 + 0.65 * smoothstep(14, 26, Math.hypot(x - P.J.x, z - P.J.z))); // the clearing
  for (const p of points) if (p.id !== 'J') k = Math.min(k, smoothstep(CLEARING * 0.8, CLEARING * 1.3, Math.hypot(x - p.x, z - p.z)));
  for (const bz of [BASE_Z, -BASE_Z]) k = Math.min(k, smoothstep(30, 46, Math.hypot(x, z - bz)));
  return k;
}
/** The Bois Jacques clearing: the foxholes, trees all round. */
const inJacques = (x, z) => Math.hypot(x - P.J.x, z - P.J.z) < 18;

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'ardennes',
  armies: { nato: ['us'], pact: ['wh', 'fj'] }, // (the 101st Airborne and Patton's Third Army against the Wehrmacht and the 5th Fallschirmjäger Division)
  name: 'Bastogne',
  description: 'The Ardennes, December 1944: Bastogne in the snow, six roads meeting in the town, the ring of villages round it and the dark fir woods between, under fog and low cloud.',
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

    // ---- Bastogne: the square with Saint-Pierre's church, the town hall, the seminary and the Heintz Barracks, houses down each road
    props.rand = mulberry32(4401);
    props.church({ x: 22, z: -28, yaw: Math.PI / 2 - 0.3 });
    props.townHouse({ x: -26, z: 30, yaw: 0.7, width: 18, depth: 10, storeys: 3, name: 'hôtel de ville', damaged: 0.4 });
    props.hall({ x: -55, z: 62, yaw: -0.6, width: 30, depth: 14, height: 9, color: 0x8a8274, roof: 0x3e4044, door: 6, name: 'seminary' });
    props.hall({ x: -36, z: -92, yaw: 0.75, width: 34, depth: 12, height: 8, color: 0x7e786c, roof: 0x3a3c40, door: 6, name: 'Heintz Barracks' });
    for (const [x, z] of [[-8, 10], [12, 4], [-4, -14]]) props.wreckCar({ x, z, yaw: x });
    props.logBarricade({ x: -6, z: TOWN - 4, yaw: 0.2, length: 7 });
    props.logBarricade({ x: 16, z: -(TOWN - 6), yaw: -0.1, length: 7 });
    taken.push([22, -28, 16], [-26, 30, 13], [-55, 62, 22], [-36, -92, 24], [0, 0, 24]);
    const free = (x, z, r) => !taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < r + tr) && roadDist(x, z) > r + 3;
    const rr = mulberry32(1226);
    // rows of houses along the six roads out of the square
    for (let r0 = 0; r0 < TOWN_ROADS * 10; r0 += 10) { // (PIECES: the roads out of the square, ten pieces each)
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
          taken.push([x, z, Math.max(w, dep) / 2]);
          const yaw = Math.atan2(uz * side, -ux * side); // the front (local +z) toward the road
          props.townHouse({ x, z, yaw, width: w, depth: dep, storeys: rr() < 0.3 ? 3 : 2, damaged: 0.45 });
        }
      }
    }
    // backyard walls, rubble and a wreck or two in the gaps
    for (let i = 0; i < 80; i++) {
      const a = rr() * Math.PI * 2, d = 25 + rr() * (TOWN - 25), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!free(x, z, 3)) continue;
      const kind = rr();
      if (kind < 0.3) props.lowWall({ x, z, yaw: rr() * 3, length: 5 + rr() * 5, height: 1.2 });
      else if (kind < 0.7) props.wreckCar({ x, z, yaw: rr() * 3 });
      else for (let k = 0; k < 4; k++) props.rubble(x + (rr() - 0.5) * 4, z + (rr() - 0.5) * 4, 0.4 + rr() * 0.5);
    }

    // ---- the villages of the ring: stone farms round the crossroads, a chapel in the bigger ones (each its own layout)
    for (const [p, seed, chapel, turn] of [[P.C, 7301, true, 0], [P.D, 7302, true, 2.2], [P.E, 7303, false, 0.9], [P.H, 7304, true, 4.0], [P.I, 7305, true, 1.4], [P.B, 7306, false, 3.3]] as const) {
      buildVillage(props, p, seed, 1);
      const L = (lx, lz) => PropBuilder.local(p.x, p.z, turn, lx, lz);
      if (chapel) { const [x, z] = L(26, -4); props.church({ x, z, yaw: turn }); }
      const [hx, hz] = L(-22, 18), [bx, bz] = L(4, 26);
      props.townHouse({ x: hx, z: hz, yaw: turn + 0.3, width: 9, depth: 8, storeys: 2, damaged: 0.5 });
      props.hayBales({ x: bx, z: bz, yaw: 0.5 + turn, count: 3 });
    }
    // the Mardasson: a farm on the bare hilltop, a dug-in line along its crest facing the town
    props.house({ x: P.G.x - 18, z: P.G.z - 14, yaw: 0.4, width: 11, depth: 7 });
    for (let k = 0; k < 3; k++) props.sandbagRing({ x: P.G.x - 14 + k * 14, z: P.G.z + 20, radius: 2.4, toward: 1 });
    // Senonchamps: the field artillery's gun pits in the open east of the village, the wood at their back (the 420th Armored Field Artillery held here, guns facing every way)
    for (let k = 0; k < 4; k++) props.sandbagRing({ x: P.B.x + 34 + k * 15, z: P.B.z + 22 - k * 8, radius: 3.6, toward: -1 });
    props.crates({ x: P.B.x + 22, z: P.B.z + 30, yaw: 0.5 });
    // the Bois Jacques: foxholes in a clearing of the firs, log piles from the felled trees, the forester's house
    {
      const q = P.J;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.25 + 0.3;
        props.sandbagRing({ x: q.x + Math.cos(a) * 11, z: q.z + Math.sin(a) * 11, radius: 1.8, toward: 1 });
      }
      props.logPile({ x: q.x - 4, z: q.z + 2, yaw: 0.7, length: 7 });
      props.logPile({ x: q.x + 6, z: q.z - 5, yaw: 2.1, length: 6 });
      props.house({ x: q.x + 2, z: q.z + 26, yaw: 0.2, width: 8, depth: 6 }); // the forester's house by the track
    }

    // ---- out in the fields: farms, stone walls, hay, the wrecks of the first days by the roads
    const kinds = ['farm', 'fieldwall', 'hay', 'wrecks', 'fieldwall', 'farm', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 120 && tries < 16000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 20);
      if (town(x, z) > 0 || woods(x, z) > 0.2 || roadDist(x, z) < 12 || sites.some((s) => Math.hypot(s.x - x, s.z - z) < 30)) continue;
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || points.some((p) => Math.hypot(x - p.x, z - p.z) < 42)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
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
