// The Normandy bocage, July 1944 (1945 only): the hedgerow country south of the beaches round Villers-
// Bocage, where the Allied advance stalled for two months. Small fields, each boxed in by a hedgerow on an
// earth bank higher than a man — hawthorn, bramble and oaks rooted in it — with a gateway or two to each
// field; the lanes run sunken between the banks. You see one field at a time: the banks block the view
// and the hedges cut it further (map `woods`), and vehicles crossing a bank crawl (map `soft`: the routes
// keep to the gateways and the lanes — no Rhino tusks yet). In the middle Villers-Bocage, its stone
// houses wrecked by the bombing of 30 June; round it stone farms with their orchards and the villages on
// the roads: Tracy-Bocage on its rise, Point 213 on the Caen road. The Allies come from the south (+z),
// the Germans hold the north. Point-mirrored to keep it fair: fields, gaps and hedges have their twin.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields, FIELD } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const TOWN = 90;      // Villers-Bocage's radius
const BANK = 1.5;     // the hedge bank's height, m: higher than a crouching man, about a standing man's eyes
const noise = createNoise2D(1944_07);
const gapNoise = createNoise2D(4407);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Caumont-l’Éventé', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Cahagnes', x: -420, z: 230, owner: null, sector: 'west' },
  { id: 'C', name: 'Livry', x: -60, z: 340, owner: null, sector: 'centre' },
  { id: 'D', name: 'Briquessard', x: 270, z: 390, owner: null, sector: 'east' },
  { id: 'E', name: 'Tracy-Bocage', x: -190, z: 95, owner: null, sector: 'west' },
  { id: 'F', name: 'Villers-Bocage', x: 0, z: 0, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Point 213', x: 190, z: -95, owner: null, sector: 'east' },
  { id: 'H', name: 'Amayé-sur-Seulles', x: -270, z: -390, owner: null, sector: 'west' },
  { id: 'I', name: 'Montbrocq', x: 60, z: -340, owner: null, sector: 'centre' },
  { id: 'J', name: 'Tilly-sur-Seulles', x: 420, z: -230, owner: null, sector: 'east' },
  { id: 'K', name: 'Noyers-Bocage', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));

// ---- the lanes: out of the town to the villages and on to the edges (our half; each has its mirror)
const HALF: [number, number, number, number, number][] = [ // x0, z0, x1, z1, bend (m sideways at the middle)
  [0, 0, P.E.x, P.E.z, -12], [0, 0, P.C.x, P.C.z, 16], [0, 0, P.D.x, P.D.z, -20],
  [P.C.x, P.C.z, 0, 560, -8], [P.E.x, P.E.z, P.B.x, P.B.z, 18], [P.B.x, P.B.z, -560, 320, -10],
  [P.D.x, P.D.z, 560, 450, 12], [P.C.x, P.C.z, P.D.x, P.D.z, 20], [P.B.x, P.B.z, -320, 560, 10],
];
const PIECES: number[][] = [];
for (const [x0, z0, x1, z1, bend] of HALF) {
  for (const m of [1, -1]) {
    const len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
    const at = (t) => [(x0 + (x1 - x0) * t + nx * bend * Math.sin(Math.PI * t)) * m, (z0 + (z1 - z0) * t + nz * bend * Math.sin(Math.PI * t)) * m];
    for (let k = 0; k < 10; k++) PIECES.push([...at(k / 10), ...at((k + 1) / 10)]);
  }
}
/** Distance to the nearest lane, up to NEAR m (beyond: NEAR). The terrain asks it for every sample, so the pieces
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
const town = (x, z) => smoothstep(TOWN + 12, TOWN - 12, Math.hypot(x, z));

// ---- the fields: small, every boundary hedged but for the gateways; point-mirrored (the line z = 0 a hedge too)
const base = createFields({ seed: 1944, cell: 58, weights: [0.5, 0.15, 0.15, 0.2] });
const fields = {
  cell: base.cell,
  at(x: number, z: number) {
    const flip = z < 0 || (z === 0 && x < 0);
    const ax = flip ? -x : x, az = flip ? -z : z;
    const f = base.at(ax, az);
    f.edge = Math.min(f.edge, az + 0.4);
    f.hedge = gapNoise(ax * 0.045, az * 0.045) > -0.42 && town(x, z) < 0.3 && roadDist(x, z) > 5
      && Math.hypot(x, Math.abs(z) - BASE_Z) > 40;
    return f;
  },
};
/** 1 on a hedge bank, 0 off it. */
const bank = (x, z) => {
  const f = fields.at(x, z);
  return f.hedge ? smoothstep(3.6, 1.2, f.edge) : 0;
};
/** Orchards: the meadows by the farms (and wherever the noise puts them), apple trees in the grass. */
const orchard = (x, z) => {
  const f = fields.at(x, z);
  return f.type === FIELD.MEADOW && f.tint > 0 && f.edge > 4 && town(x, z) < 0.2 ? 1 : 0;
};
/** The line of the hedge itself, on top of the bank: where its oaks and ash stand. */
const inHedge = (x, z) => { const f = fields.at(x, z); return f.hedge && f.edge < 1.4; };

function raw(x, z) {
  return fbm(noise, x * 0.004, z * 0.004, 4) * 9 + fbm(noise, x * 0.03 + 9, z * 0.03, 3) * 0.6
    + hill(x, z, P.G.x + 30, P.G.z - 20, 110, 9);         // Point 213 on the Caen road (and its twin, the rise of Tracy-Bocage)
}
function height(x, z) {
  let h = (raw(x, z) + raw(-x, -z)) / 2 + 6;
  const t = town(x, z);
  h += (6 + fbm(noise, x * 0.004, z * 0.004, 2) - h) * t * 0.85;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += bank(x, z) * BANK;                                              // the hedge banks
  h -= smoothstep(6, 3, roadDist(x, z)) * 1.4 * (1 - t);               // the sunken lanes between them
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 110, Math.abs(x)) * 10 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 10;
  return h;
}

/** Sight: the hedges block it, the fields between them half-hidden too (orchards, standing crops, the next bank). */
function woods(x, z) {
  if (roadDist(x, z) < 4 || town(x, z) > 0.5) return 0;
  const f = fields.at(x, z);
  if (f.hedge && f.edge < 4) return 1;
  return f.type === FIELD.MEADOW ? 0.5 : 0.28;
}

/** Going: across a hedge bank vehicles crawl, men climb it; the lanes and the gateways are firm. */
function soft(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 5) return 1;
  const f = fields.at(x, z);
  return f.hedge && f.edge < 3 ? (foot ? 0.5 : 0.15) : 1;
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'bocage',
  armies: { nato: ['us', 'brit21'], pact: ['wh', 'fj'] }, // (the US First Army and the British Second Army against the Panzer-Lehr, the SS and the Fallschirmjäger of II Parachute Corps)
  name: 'Normandy Bocage',
  description: 'Normandy, July 1944: small fields boxed in by hedgerows on high earth banks, sunken lanes, orchards, stone farms, and Villers-Bocage in ruins in the middle. You see one field at a time. Mirrored to keep it fair.',
  epochs: ['1945'],
  region: 'europe',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1944,
  height,
  woods,
  soft,
  fields,

  theme: {
    // a hazy July day, cloud building
    fogColor: 0xb4bcb8,
    fogDensity: 0.0019,
    skyTop: 0x6e88a4,
    skyHorizon: 0xc4ccca,
    skyBottom: 0x7a8078,
    sunColor: 0xfff0d6,
    sunIntensity: 1.8,
    sunDisk: 0.25,
    clouds: 0.6,
    cloudLight: 0xe2e4e2,
    cloudDark: 0x8a9096,
    sunDir: [0.45, 0.7, 0.5],
    hemiSky: 0xc4d0dc,
    hemiGround: 0x4a4a32,
    hemiIntensity: 1.25,
    rimColor: 0xc0c8c0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#4e6630',
      grassAlt: '#45592a',
      dryGrass: '#8a7e4a',
      dirt: '#5e4c36',
      rock: '#6e685c',
      pasture: '#506a2e',
      ploughed: '#5a4630',
      stubble: '#a49458',
      meadow: '#5c7434',
      farmX: [560, 640],
      farmZ: [620, 700],
      roads: [],
      surface(x, z) {
        const r = smoothstep(4.5, 2.5, roadDist(x, z));
        if (r > 0) return [0x6e5e48, r * 0.9];                         // the lanes: packed earth, ruts
        const t = town(x, z);
        if (t > 0) return [0x5e5a4c, t * 0.5];                         // yards, rubble dust
        const b = bank(x, z);
        return b > 0 ? [0x34401e, b * 0.7] : null;                     // the bank under the hedge: shade, nettles
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
    const taken: number[][] = [];

    // ---- Villers-Bocage: the church, the market hall on the square, stone houses down each road — wrecked
    mirrored(props, 4407, (m, flip) => {
      props.church({ x: -24 * m, z: 32 * m, yaw: flip - 0.64 });   // (between the roads, its nave along the gap)
      props.hall({ x: 40 * m, z: 6 * m, yaw: flip + 0.3, width: 20, depth: 12, height: 6.5, color: 0x8c8474, roof: 0x4a4c50, door: 8, name: 'market hall' });
      for (const [x, z] of [[-6, 9], [9, -3]]) props.wreckCar({ x: x * m, z: z * m, yaw: x + flip });
      for (let k = 0; k < 8; k++) props.rubble((props.rand() - 0.5) * 30 * m, (14 + props.rand() * 10) * m, 0.5 + props.rand() * 0.6);
    });
    taken.push([-24, 32, 14], [24, -32, 14], [40, 6, 13], [-40, -6, 13], [0, 0, 22]);
    const free = (x, z, r) => !taken.some(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) < r + tr) && roadDist(x, z) > r + 2.5;
    const rr = mulberry32(1307);
    for (const r0 of [0, 20, 40]) { // (PIECES: the first three roads out of the square, ten pieces each, ours before the mirror's)
      for (let d = 26; d < TOWN + 8; d += 9 + rr() * 3) {
        const L = Math.hypot(PIECES[r0 + 9][2], PIECES[r0 + 9][3]), k = Math.min(9, Math.floor(d / L * 10));
        const [ax, az, bx, bz] = PIECES[r0 + k];
        const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
        const px = ax + ux * (d - k * L / 10), pz = az + uz * (d - k * L / 10); // the road's point d m out from the square
        for (const side of [-1, 1]) {
          if (rr() < 0.2) continue;
          const w = 7 + rr() * 3, dep = 8 + rr() * 2, off = 6 + dep / 2;
          const x = px - uz * side * off, z = pz + ux * side * off;
          if (!free(x, z, Math.max(w, dep) / 2 - 1)) continue;
          taken.push([x, z, Math.max(w, dep) / 2], [-x, -z, Math.max(w, dep) / 2]);
          const yaw = Math.atan2(uz * side, -ux * side); // the front (local +z) toward the road
          const seed = Math.floor(rr() * 1e9), storeys = rr() < 0.3 ? 3 : 2, ruined = rr() < 0.35;
          mirrored(props, seed, (m, flip) => {
            if (ruined) props.ruinBlock({ x: x * m, z: z * m, yaw: yaw + flip, width: w + 2, depth: dep, storeys, ruin: 0.5, name: 'bombed house' });
            else props.townHouse({ x: x * m, z: z * m, yaw: yaw + flip, width: w, depth: dep, storeys, damaged: 0.7 });
          });
        }
      }
    }
    for (let i = 0; i < 30; i++) {
      const a = rr() * Math.PI, d = 20 + rr() * (TOWN - 20), x = Math.cos(a) * d, z = Math.sin(a) * d + 2;
      if (!free(x, z, 3)) continue;
      const seed = Math.floor(rr() * 1e9);
      mirrored(props, seed, (m) => { for (let k = 0; k < 5; k++) props.rubble(x * m + (props.rand() - 0.5) * 5, z * m + (props.rand() - 0.5) * 5, 0.4 + props.rand() * 0.6); });
    }

    // ---- the villages on the roads, a church in the bigger ones; Point 213: a farm and the dug-in line on the crest
    for (const [p, seed, church] of [[P.A, 7401, true], [P.B, 7402, true], [P.C, 7403, false], [P.D, 7404, false]] as const) {
      buildVillage(props, p, seed, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
      if (church) mirrored(props, seed + 1, (m, flip) => props.church({ x: (p.x + 24) * m, z: (p.z - 10) * m, yaw: flip + 0.3 }));
    }
    mirrored(props, 7410, (m, flip) => {
      const q = { x: P.G.x * m, z: P.G.z * m };
      props.house({ x: q.x + 20 * m, z: q.z + 16 * m, yaw: flip + 0.5, width: 11, depth: 7 });
      props.house({ x: q.x - 22 * m, z: q.z + 10 * m, yaw: flip - 0.3, width: 9, depth: 6 });
      for (let k = 0; k < 3; k++) props.sandbagRing({ x: q.x + (-12 + k * 12) * m, z: q.z - 16 * m, radius: 2.4, toward: -m });
    });

    // ---- the stone farms out in the fields: each set in its field, away from the hedges
    const kinds = ['farm', 'farm', 'hay', 'fieldwall', 'farm', 'wrecks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 70 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = 15 + rand() * (bounds.z - 30);
      if (town(x, z) > 0 || roadDist(x, z) < 10 || fields.at(x, z).edge < 10 || sites.some((s) => Math.hypot(s.x - x, s.z - z) < 34)) continue;
      if (Math.hypot(x, z - BASE_Z) < 45 || points.some((p) => Math.hypot(x - p.x, z - p.z) < 36)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
      { test: (x, z) => roadDist(x, z) < 4.5 || town(x, z) > 0.6 }];
    // oaks and ash standing in the hedgerows, apple trees in the orchards
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, count: 12000, broadleaf: 0.97, autumn: 0,
      avoid: [...avoid, { test: (x, z) => !inHedge(x, z) && !orchard(x, z) }], // (nowhere else: the open fields stay open)
      forest: (x, z) => (inHedge(x, z) ? 1 : 0.04),
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields, area: bounds, avoid, count: 22000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.4, fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
