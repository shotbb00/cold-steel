// Ostrołęka, 16 February 1807: after Eylau the French right wing — Savary’s V Corps, Lannes being sick — stood on the
// Narew round the little town of Ostrołęka, the Bernardine church and its monastery over the market, the wooden bridge
// across to the right bank. Essen’s Russians came down both banks of the river in the thaw and the frost; their
// columns broke into the town streets on the left bank and were thrown out by Gazan’s men, Suchet fought them on the
// right bank in the snow-dusted sand and pines, and Oudinot’s grenadiers came up and turned the day. The Narew ran
// half-frozen between its sand banks, the ice too weak for guns but the shallows passable.
// On the map (1.0 × 1.12 km, late winter, patchy snow on sand): the French come from the Różan road (+z,
// downstream), the Russians from the Łomża road (−z, upstream). The Narew bows down the middle of the field from the
// Russian end to the French one, the town on its left (west) bank in the middle, the bridge out of the market, a ford
// in the frozen shallows above the town and one below it. Sandy pine country all round: the Kurpie pinewoods,
// low dunes, birch scrub.
// Not mirrored but fair: the river runs down the field, not across it, so each side has the same two banks before it;
// the town and its bridge — the decisive ground — stand in the middle, owned by neither, and the two fords lie as far
// from either base. The Białobrzeg dunes before the French against the Lelis dunes before the Russians, Wojciechowice
// on the right bank against Rzekuń, the Kurpie pines on the Russians’ west against the Łęg pines on the French west;
// each village as far from the nearer base as its counterpart (tools/map_fairness.py).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 460;
const noise = createNoise2D(1807_0216);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Różan road', x: 0, z: 430, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Łęg', x: -370, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Białobrzeg dunes', x: -130, z: 220, owner: null, sector: 'centre' },
  { id: 'D', name: 'Wojciechowice', x: 310, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Kamianka', x: -310, z: 60, owner: null, sector: 'west' },
  { id: 'F', name: 'Bernardine church', x: -30, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Grabowo', x: 300, z: -60, owner: null, sector: 'east' },
  { id: 'H', name: 'Kurpie pines', x: -320, z: -275, owner: null, sector: 'west' },
  { id: 'I', name: 'Lelis dunes', x: -100, z: -220, owner: null, sector: 'centre' },
  { id: 'J', name: 'Rzekuń', x: 345, z: -295, owner: null, sector: 'east' },
  { id: 'K', name: 'Łomża road', x: 0, z: -430, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Narew, flowing from the Russian end (−z) to the French (+z), bowed east round the town
const NAREW = [[270, -700], [205, -500], [140, -300], [98, -130], [86, 0], [100, 130], [145, 300], [210, 500], [280, 700]];
const river = createRiver({
  paths: [NAREW],
  halfWidth: 15,
  level: 0,
  depth: 2.8,
  valley: 50,
  crossings: [
    { name: 'Ostrołęka bridge', x: 86, z: 0, kind: 'bridge', width: 7 },
    { name: 'Ford above the town', x: 140, z: -300, kind: 'ford', width: 14 },
    { name: 'Ford below the town', x: 145, z: 300, kind: 'ford', width: 14 },
  ],
});
/** The river’s line x(z) (for props: plain interpolation of the course). */
const riverX = (z) => {
  for (let i = 0; i < NAREW.length - 1; i++) {
    const [x0, z0] = NAREW[i], [x1, z1] = NAREW[i + 1];
    if (z <= z1) return x0 + ((x1 - x0) * (z - z0)) / (z1 - z0);
  }
  return NAREW[NAREW.length - 1][0];
};
const wet = (x, z, m = 0) => Math.abs(x - riverX(z)) < river.halfWidth + m;
const TOWN = { x: -20, z: 0, rx: 85, rz: 80 };
/** 1 in the town, 0 outside it. */
const town = (x, z) => smoothstep(1.1, 0.85, Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz));
/** The bare sand: dunes and drifts showing through the old snow (0..1). */
const sand = (x, z) => smoothstep(0.1, 0.35, fbm(noise, x * 0.01 - 5, z * 0.01 + 9, 3));
/** The pinewoods (0..1): the Kurpie pines, the Łęg pines, the pines behind the right bank, birch scrub. */
const woods = (x, z) => {
  let k = smoothstep(0.38, 0.52, fbm(noise, x * 0.006 + 17, z * 0.006 - 23, 3)) * 0.85;
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.H.x + 40) / 150, (z - P.H.z + 20) / 110)));   // (the Kurpie pines)
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.B.x - 30) / 120, (z - P.B.z + 70) / 85)));    // (the Łęg pines)
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - 420) / 70, (z - 100) / 150)) * 0.9);           // (the right bank’s pines)
  k = Math.min(k, smoothstep(14, 28, Math.hypot(x - P.H.x, z - P.H.z)));
  for (const p of POINTS) if (p.id !== 'H') k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, 1 - town(x, z));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0025, z * 0.0025, 3) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.5 + 5;
  h += hill(x, z, P.C.x - 20, P.C.z, 80, 6) + hill(x, z, P.C.x + 60, P.C.z + 30, 55, 3);           // the Białobrzeg dunes
  const lz = z - P.I.z - (x - P.I.x) * 0.3, lx = x - P.I.x + 30;                                  // the Lelis dunes: a long sand ridge
  h += 7 * Math.exp(-((lz / 55) ** 2) - ((lx / 150) ** 2));
  h += Math.max(0, fbm(noise, x * 0.012 + 40, z * 0.012, 2)) * 3 * smoothstep(250, 380, Math.abs(x - 80)); // (drifted sand hummocks out on the wings)
  h += smoothstep(420, 600, Math.abs(z)) * (z < 0 ? 10 : 9);
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 22 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  h += (4 - h) * town(x, z) * 0.6;                                                                  // the town on the river terrace
  for (const p of POINTS) if (!'CFI'.includes(p.id)) h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'ostroleka',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Savary’s V Corps and Oudinot’s grenadiers against Essen)
  name: 'Ostrołęka',
  description: 'Poland, 16 February 1807: Savary against Essen at the little town of Ostrołęka on the half-frozen Narew — the Bernardine church over the market, the wooden bridge, sand dunes and pinewoods under old snow.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180716,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  airfields: [],
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1807_16, cell: 76, weights: [0.35, 0.3, 0.2, 0.15] }),

  theme: {
    // February on the Narew: a grey thaw-and-frost day, old snow lying thin on the sand
    fogColor: 0xc2c6c6,
    fogDensity: 0.0017,
    skyTop: 0x88929c,
    skyHorizon: 0xcacecc,
    skyBottom: 0x96988e,
    sunColor: 0xe8e6dc,
    sunIntensity: 1.25,
    sunDisk: 0.1,
    clouds: 0.85,
    cloudLight: 0xd2d4d4,
    cloudDark: 0x80868c,
    sunDir: [0.45, 0.4, 0.7],
    hemiSky: 0xd0d6dc,
    hemiGround: 0x8a8678,
    hemiIntensity: 1.4,
    rimColor: 0xc8d0d8,
    rimIntensity: 0.22,
    terrain: {
      grass: '#d8dad6',
      grassAlt: '#c8ccc4',
      dryGrass: '#b8ae94',
      dirt: '#8a7c64',
      rock: '#aaa69a',
      pasture: '#cfd2cc',
      ploughed: '#a89a80',
      stubble: '#c4b898',
      meadow: '#dee0dc',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const t = town(x, z);
        if (t > 0) return [0xa09684, t * 0.5];                     // trodden streets and yards
        const s = sand(x, z);
        if (s > 0) return [0xc8b48a, s * 0.55];                    // the sand showing through the snow
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 370 }, pact: { x: 0, z: -370 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    // ---- Ostrołęka: the market with the Bernardine church and monastery, the street down to the bridge, wooden houses
    props.rand = mulberry32(1807_0216);
    props.church({ x: P.F.x - 6, z: P.F.z - 34, yaw: 0 });                                                        // (the Bernardine church)
    props.hall({ x: P.F.x - 40, z: P.F.z - 36, yaw: Math.PI / 2, width: 24, depth: 9, height: 6, color: 0xb0a490, roof: 0x5a3a2a, door: 3, name: 'Bernardine monastery' });
    props.hall({ x: P.F.x + 6, z: P.F.z + 30, yaw: 0, width: 14, depth: 8, height: 5, color: 0xa89c86, roof: 0x4a3a2c, door: 3, name: 'town hall' });
    const street = (x, z) => Math.abs(z) < 7 || Math.abs(x - P.F.x) < 7;
    const taken: number[][] = [[P.F.x - 6, P.F.z - 34, 18], [P.F.x - 40, P.F.z - 36, 14], [P.F.x + 6, P.F.z + 30, 10], [P.F.x, P.F.z, 22]];
    const rr = mulberry32(1807_161);
    for (let i = 0; i < 260 && taken.length < 44; i++) {
      const x = TOWN.x - TOWN.rx + rr() * TOWN.rx * 2, z = TOWN.z - TOWN.rz + rr() * TOWN.rz * 2;
      if (town(x, z) < 0.6 || street(x, z) || wet(x, z, 12) || taken.some(([tx, tz, r]) => Math.hypot(x - tx, z - tz) < r + 7)) continue;
      taken.push([x, z, 6]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      if (rr() < 0.45) props.townHouse({ x, z, yaw: Math.abs(z) < 30 ? 0 : Math.PI / 2, width: 7 + rr() * 2, depth: 8, storeys: rr() < 0.3 ? 2 : 1, damaged: 0 });
      else props.house({ x, z, yaw: Math.abs(z) < 30 ? 0 : Math.PI / 2, width: 7 + rr() * 2, depth: 6 });   // (the wooden houses of the outskirts)
    }
    // the Grabowo bridgehead on the right bank: a little earthwork the French threw up
    for (const [dx, dz, yaw] of [[-40, -22, 0.5], [-40, 22, -0.5], [-20, -36, 1.2], [-20, 36, -1.2]] as const) props.wall({ x: 86 + 55 + dx, z: dz, yaw, length: 14, height: 1.5, thickness: 1.4, color: 0x8a7c66 });

    // ---- the villages, wooden and low; the foresters’ lodge in the Kurpie pines; the dunes’ sand pits
    for (const p of POINTS) if (!p.owner && !'CFHI'.includes(p.id)) buildVillage(props, p, 18071 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1807_3);
    props.house({ x: P.H.x + 10, z: P.H.z + 8, yaw: 0.3, width: 7, depth: 6 });
    props.logPile({ x: P.H.x - 8, z: P.H.z - 6, yaw: 1.1, length: 7 });
    for (const [p, s] of [[P.C, -1], [P.I, 1]] as const) for (let k = -2; k <= 2; k++) props.wall({ x: p.x + k * 13, z: p.z + s * 20, yaw: 0, length: 8, height: 0.9, color: 0x9a8a6a }); // (the gun lines’ breastworks)
    props.logPile({ x: P.C.x + 30, z: P.C.z - 20, yaw: 0.4, length: 6 });
    props.logPile({ x: P.I.x - 28, z: P.I.z + 18, yaw: 2.0, length: 6 });

    // ---- farms, fences, hay in the thin snow
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'farm', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 76 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 55) || woods(x, z) > 0.3 || wet(x, z, 40) || town(x, z) > 0 || Math.hypot(x - 141, z) < 60) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x - 20, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => wet(x, z, 1.5) || town(x, z) > 0.3 }];
    // Scots pine and birch
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0.15, autumn: 1, forest: (x, z) => (wet(x, z, 10) ? 0.4 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.9, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
