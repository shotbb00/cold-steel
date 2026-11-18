// Friedland, 14 June 1807: Bennigsen crossed the Alle into the town in its loop to catch Lannes alone,
// and fought all day with the river at his back — the town bridge and three pontoon bridges the only
// ways out. The millstream (the Mühlenfließ) runs down a ravine through the middle of the field into the
// Alle at the town and split the Russian army in two; the Sortlack wood stood south of the town. In the
// evening Ney came down past the wood into the loop, the French guns closed to canister range, the town
// burned and the bridges with it. The French hold the north (+z), the Russians the town and the river
// (−z). Fair as a battle, not a re-run of the trap: the ground is point-mirrored (the Sortlack wood has its
// twin in the Damerau wood, the town its twin in Posthenen, the ravine's three crossings lie at the same
// distance from both sides), and the Alle runs only behind the Russian base, where its bridges are the
// Russians' own way in — no one fights across it.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage, mirrored } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const noise = createNoise2D(1807_06);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
const mirror = (x, z): [number, number] => (z < 0 || (z === 0 && x < 0) ? [-x, -z] : [x, z]);

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Posthenen', x: 0, z: 420, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Heinrichsdorf', x: -390, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Damerau wood', x: -110, z: 225, owner: null, sector: 'centre' },
  { id: 'D', name: 'Georgenau', x: 210, z: 345, owner: null, sector: 'east' },
  { id: 'E', name: 'Domnau road', x: -265, z: 95, owner: null, sector: 'west' },
  { id: 'F', name: 'The mill', x: 0, z: 0, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Sortlack', x: 265, z: -95, owner: null, sector: 'east' },
  { id: 'H', name: 'Allenburg road', x: -210, z: -345, owner: null, sector: 'west' },
  { id: 'I', name: 'Sortlack wood', x: 110, z: -225, owner: null, sector: 'centre' },
  { id: 'J', name: 'The Alle bend', x: 390, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Friedland', x: 0, z: -420, owner: 'pact', sector: 'centre', radius: 26 },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Alle, behind the Russians; the town bridge and two of the pontoon bridges (on the roads in)
const alleZ = (x) => -538 + 12 * Math.sin(x * 0.006) + 5 * Math.sin(x * 0.019 + 1);
const river = createRiver({
  path: alleZ,
  halfWidth: 13,
  level: 0,
  depth: 2.6,
  valley: 55,
  crossings: [
    { name: 'Pontoon bridge', x: -300, kind: 'bridge', width: 6 },
    { name: 'Friedland bridge', x: 0, kind: 'bridge', width: 8 },
    { name: 'Pontoon bridge', x: 300, kind: 'bridge', width: 6 },
  ],
});

// the millstream's ravine, down the middle (point-symmetric), and its crossings: the mill, two fords, the town lanes
const streamX = (z) => 34 * Math.sin(z * 0.007);
const CROSS = [0, 230, -230, 400, -400];
const ravine = (x, z) => {
  const d = Math.abs(x - streamX(z));
  const ford = Math.max(...CROSS.map((c) => smoothstep(20, 8, Math.abs(z - c))));
  return smoothstep(24, 7, d) * (1 - ford * 0.85) * smoothstep(440, 350, Math.abs(z)); // (culverted under the two villages' streets)
};
/** The woods (0..1): the Sortlack wood and the Damerau wood, copses, the alders along the ravine. */
const woods = (x, z) => {
  const [ax, az] = mirror(x, z);
  let k = smoothstep(0.5, 0.66, fbm(noise, ax * 0.006 + 21, az * 0.006 - 4, 3));
  k = Math.max(k, smoothstep(95, 60, Math.hypot((ax - P.C.x - 30) * 0.8, az - P.C.z - 20)));
  const d = Math.abs(x - streamX(z));
  if (d > 9 && d < 20) k = Math.max(k, 0.5);
  for (const p of POINTS) if (p.id !== 'C' && p.id !== 'I') k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  for (const c of CROSS) k = Math.min(k, smoothstep(12, 26, Math.hypot(x - streamX(c), z - c)));
  return Math.min(k, smoothstep(14, 26, Math.hypot(x - P.C.x, z - P.C.z)), smoothstep(14, 26, Math.hypot(x - P.I.x, z - P.I.z))); // (a clearing at the points)
};

function height(x, z) {
  const [ax, az] = mirror(x, z);
  let h = fbm(noise, ax * 0.0024, az * 0.0024, 3) * 5 + fbm(noise, ax * 0.02 + 7, az * 0.02, 3) * 0.4 + 6;
  h += hill(ax, az, P.D.x + 40, P.D.z - 70, 90, 5);                                // the low rise by Georgenau (and its twin over the Alle bend)
  h -= ravine(x, z) * 5.5;                                                          // the millstream's ravine
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 24 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, z) * 20;
  for (const p of POINTS) if (p.id !== 'F') h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'friedland',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Lannes, Ney and the Emperor against Bennigsen)
  name: 'Friedland',
  description: 'East Prussia, June 1807: the town in the loop of the Alle and its bridges behind the Russians, the millstream\'s ravine down the middle, the Sortlack wood. Mirrored to keep it fair.',
  epochs: ['1806'],
  region: 'east',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180706,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_14, cell: 72, weights: [0.3, 0.3, 0.2, 0.2] }), // June: rye in the ear, meadows

  theme: {
    // a hot June day, the long evening light coming
    fogColor: 0xb8c0b8,
    fogDensity: 0.0012,
    skyTop: 0x5f86b0,
    skyHorizon: 0xcad6d8,
    skyBottom: 0x7c8678,
    sunColor: 0xfff0d2,
    sunIntensity: 2.0,
    sunDisk: 0.5,
    clouds: 0.35,
    cloudLight: 0xeef0f0,
    cloudDark: 0x9aa4ac,
    sunDir: [-0.5, 0.55, -0.6],
    hemiSky: 0xc8d4e0,
    hemiGround: 0x4c5034,
    hemiIntensity: 1.25,
    rimColor: 0xd0d8e0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a6c36',
      grassAlt: '#4e6232',
      dryGrass: '#8a8450',
      dirt: '#5a4a38',
      rock: '#6c6a62',
      strip: '#4c4030',
      pasture: '#5c7038',
      ploughed: '#54442f',
      stubble: '#9a9258',
      meadow: '#68783c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const r = ravine(x, z);
        if (r > 0.55) return [0x4a5a3c, (r - 0.55) * 1.6];             // the stream's bed, wet and reedy
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => Math.abs(z - alleZ(x)) < river.halfWidth + r;

    // ---- Friedland (and Posthenen, its twin): houses along the street to the bridge, the church in Friedland
    const rr = mulberry32(1806_14);
    const taken: number[][] = [];
    for (let i = 0; i < 26; i++) {
      const a = rr() * Math.PI * 2, d = 18 + rr() * 50;
      const x = Math.cos(a) * d, z = P.A.z + Math.sin(a) * d * 0.8;
      if (Math.abs(x) < 7 || Math.hypot(x, z - BASE_Z) < 38 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14)) continue; // (the street down the middle)
      taken.push([x, z]);
      const seed = Math.floor(rr() * 1e9), yaw = Math.abs(x) < 30 ? Math.PI / 2 : 0, w = 7 + rr() * 3;
      mirrored(props, seed, (m, flip) => props.townHouse({ x: x * m, z: z * m, yaw: yaw + flip, width: w, depth: 8, storeys: rr() < 0.5 ? 2 : 1, damaged: 0 }));
    }
    props.rand = mulberry32(14061807);
    props.church({ x: 22, z: P.K.z - 6, yaw: 0 });
    props.hall({ x: -22, z: P.A.z + 6, yaw: Math.PI, width: 18, depth: 9, height: 5, color: 0x8a7a62, roof: 0x5a3a2a, door: 5, name: 'barn' }); // (Posthenen's manor barn)
    // the mill on the stream, the bridge lane past it
    mirrored(props, 1807_5, (m, flip) => props.house({ x: 42 * m, z: 16 * m, yaw: flip + 0.2, width: 9, depth: 7 }));

    // ---- the villages; a few farms on the field; walls and hay
    for (const p of POINTS) {
      if (p.z <= 0 || p.id === 'A' || p.id === 'C') continue;
      const seed = 18076 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 44 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = 20 + rand() * (bounds.z - 120);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || ravine(x, z) > 0.05 || ravine(-x, -z) > 0.05 || nearWater(-x, -z, 50)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 1.5) || ravine(x, z) > 0.6 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4600, broadleaf: 0.7, autumn: 0, forest: (x, z) => (nearWater(x, z, 12) ? 0.5 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 3000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.6, fields: this.fields });

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
