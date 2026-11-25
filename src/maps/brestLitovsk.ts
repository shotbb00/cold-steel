// Brest-Litovsk and the Bug (hypothetical, spring 1807): had the war in Poland swung south-east, the road from
// Warsaw to Volhynia ran through Brest-Litovsk, where the Mukhavets runs into the Bug. Before the Russians razed it in
// the 1830s for their fortress, the old town stood on the island-like ground between the arms of the Mukhavets at
// the confluence: the market with St Nicholas, the Jesuit college, the Bernardine and Brigittine houses, the old
// castle mound where the two rivers meet; the Volhynian and Kobryń suburbs across the arms; all round, the marshes,
// alder carr and pine woods of Polesie.
// On the map (1.0 × 1.12 km, a raw spring day): the French come from the Biała road (+z), the Russians from the
// Kobryń road (−z). The Bug runs down the west edge behind both flanks; the Mukhavets comes in from the east, splits
// round the old town and falls into the Bug — the island in the middle, a bridge to it from each side, a ford over
// each arm, a ford on the single river east of the island. Low sand rises and marsh pools on both banks.
// Not mirrored but fair: the island — castle, market and monastery, the decisive ground — lies across the middle,
// owned by neither, each side with its own arm before it, a bridge near its road and a ford out on a flank, as far from
// its base as the other side’s. The Volhynian suburb before the French against the Kobryń suburb before the Russians,
// the Tryszyn sand rise against the Pugaczewo one, marsh against marsh; each point as far from the nearer base as its
// counterpart (tools/map_fairness.py). The castle’s earthwork has a gate on each side.
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
const noise = createNoise2D(1807_0415);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Biała road', x: 0, z: 430, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Tryszyn', x: -330, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Volhynian suburb', x: -40, z: 200, owner: null, sector: 'centre' },
  { id: 'D', name: 'Kozłowicze', x: 290, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Castle mound', x: -250, z: 0, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'St Nicholas market', x: 30, z: 5, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Bernardine monastery', x: 290, z: -5, owner: null, sector: 'east' },
  { id: 'H', name: 'Czernawczyce', x: -290, z: -330, owner: null, sector: 'west' },
  { id: 'I', name: 'Kobryń suburb', x: 80, z: -220, owner: null, sector: 'centre' },
  { id: 'J', name: 'Pugaczewo', x: 340, z: -250, owner: null, sector: 'east' },
  { id: 'K', name: 'Kobryń road', x: 0, z: -430, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Bug down the west edge, flowing north (−z); the Mukhavets from the east, split round the old town into it
const BUG = [[-455, 720], [-462, 300], [-455, 0], [-450, -300], [-458, -720]];
const NARM = [[430, 0], [360, -40], [250, -62], [100, -75], [-50, -75], [-200, -65], [-330, -48], [-455, -28]];
const SARM = [[430, 0], [350, 45], [230, 68], [80, 78], [-80, 72], [-220, 62], [-340, 45], [-455, 26]];
const MUKH = [[720, 22], [560, 14], [430, 0]];
const river = createRiver({
  paths: [BUG, NARM, SARM, MUKH],
  halfWidth: 13, level: 0, depth: 2.6, valley: 30,
  crossings: [
    { name: 'Kobryń bridge', x: -10, z: -75, kind: 'bridge', width: 8, channel: 1 },
    { name: 'Volhynian bridge', x: 20, z: 78, kind: 'bridge', width: 8, channel: 2 },
    { name: 'Bernardine ford', x: 300, z: -55, kind: 'ford', width: 12, channel: 1 },
    { name: 'Castle ford', x: -260, z: 57, kind: 'ford', width: 12, channel: 2 },
    { name: 'Mukhavets ford', x: 480, z: 9, kind: 'ford', width: 12, channel: 3 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };   // (props only: never in the height)
/** On the island between the arms (a plain box: its extent). */
const isle = (x, z) => smoothstep(-430, -380, x) * smoothstep(400, 340, x) * smoothstep(48, 30, Math.abs(z - 2));

/** 1 inside an ellipse, fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz) => smoothstep(1.1, 0.75, Math.hypot((x - cx) / rx, (z - cz) / rz) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
// the marshes of the Polesie, two on each bank
const MARSH = [[-170, 330, 95, 50], [200, 175, 80, 40], [170, -340, 95, 50], [-190, -175, 80, 42]];
const marsh = (x, z) => {
  let q = 9;
  for (const [cx, cz, rx, rz] of MARSH) q = Math.min(q, Math.hypot((x - cx) / rx, (z - cz) / rz));
  return q > 1.6 ? 0 : smoothstep(1.1, 0.75, q + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);   // (one noise lookup, only near a marsh)
};
// the pine woods out on the flanks, the alder carr by the marshes
const WOODS = [[-410, 170, 70, 90], [430, -150, 65, 100], [430, 190, 60, 80], [-400, -180, 75, 85]];
const woods = (x, z) => {
  let k = smoothstep(0.5, 0.66, fbm(noise, x * 0.006 + 31, z * 0.006 - 13, 3)) * 0.75;
  for (const [cx, cz, rx, rz] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz));
  k = Math.max(k, marsh(x, z) * 0.45);
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 55, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(14, 30, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, 1 - isle(x, z));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0025, z * 0.0025, 3) * 2.4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.35 + 3.4;
  h += hill(x, z, -330, 330, 95, 4.5) + hill(x, z, 340, -280, 95, 4.5);              // the Tryszyn and Pugaczewo sand rises
  h += hill(x, z, 300, 330, 80, 3.5) + hill(x, z, -300, -350, 80, 3.5);              // (the Kozłowicze and Czernawczyce rises)
  h += hill(x, z, P.E.x, P.E.z, 30, 3);                                               // the castle mound
  h += (1.9 - h) * marsh(x, z) * 0.85;                                                // the marshes, barely above the water
  h += (3.6 - h) * isle(x, z) * 0.6;                                                  // the old town on its island
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, x) * 20 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 16;
  h += smoothstep(BOUNDS.x + 30, BOUNDS.x + 160, -x) * 8;                            // (the Bug’s far bank)
  for (const p of POINTS) if (!'EF'.includes(p.id)) h += (h * 0.7 + 1.5 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'brest-litovsk',
  armies: { nato: ['fr'], pact: ['ru'] }, // (a French corps marching on Volhynia against the Russian army of the south)
  name: 'Brest-Litovsk',
  description: 'Lithuania’s Volhynian border, a hypothetical spring 1807: the old town of Brest-Litovsk on its island between the arms of the Mukhavets where they fall into the Bug — the market, the monasteries, the castle mound — among the marshes and pine woods of Polesie.',
  epochs: ['1806'],
  region: 'east',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180741,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  airfields: [],
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1807_41, cell: 78, weights: [0.3, 0.2, 0.32, 0.18] }), // spring: young green, fresh ploughland

  theme: {
    // a raw spring day over the Polesie: low grey cloud, haze off the wet ground
    fogColor: 0xb0b8b8,
    fogDensity: 0.0016,
    skyTop: 0x70849a,
    skyHorizon: 0xc2cacc,
    skyBottom: 0x7a8076,
    sunColor: 0xf0eadc,
    sunIntensity: 1.5,
    sunDisk: 0.2,
    clouds: 0.75,
    cloudLight: 0xdadee0,
    cloudDark: 0x80888e,
    sunDir: [-0.45, 0.5, 0.7],
    hemiSky: 0xc0cad4,
    hemiGround: 0x4a4e38,
    hemiIntensity: 1.35,
    rimColor: 0xc8d2dc,
    rimIntensity: 0.22,
    terrain: {
      grass: '#5c6e40',
      grassAlt: '#506236',
      dryGrass: '#8a8458',
      dirt: '#54463a',
      rock: '#6e6a62',
      strip: '#4a3e30',
      pasture: '#5e7040',
      ploughed: '#4c3e30',
      stubble: '#867a54',
      meadow: '#66783e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const m = marsh(x, z);
        if (m > 0.2) return [0x4a5434, m * 0.6];                                   // the marsh: sedge and black water
        const i = isle(x, z);
        if (i > 0.3) return [0x6a6050, i * 0.4];                                    // the town’s streets and yards
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
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
    const nearCrossing = (x, z, r) => river.crossings.some((c) => Math.hypot(c.x - x, c.z - z) < r);
    /** A wall from (x0, z0) to (x1, z1). */
    const seg = (x0, z0, x1, z1, height, thickness = 1.2) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });

    // ---- the old town on the island: the market with St Nicholas and the town hall, streets from the two bridges
    props.rand = mulberry32(1807_411);
    props.church({ x: P.F.x + 30, z: P.F.z - 10, yaw: Math.PI / 2 });                                                // (St Nicholas)
    props.hall({ x: P.F.x - 6, z: P.F.z + 28, yaw: 0, width: 14, depth: 8, height: 6, color: 0xb0a48c, roof: 0x4a3a2e, door: 3, name: 'town hall' });
    props.hall({ x: P.F.x - 80, z: P.F.z - 26, yaw: 0, width: 30, depth: 10, height: 8, color: 0xc4b8a0, roof: 0x5a3a2a, door: 4, name: 'Jesuit college' });
    props.church({ x: P.F.x - 120, z: P.F.z + 20, yaw: 0 });                                                         // (the Brigittines)
    const street = (x, z) => Math.abs(z - P.F.z) < 7 || Math.abs(x - 5) < 8 || Math.abs(x - 150) < 6;
    const taken: number[][] = [[P.F.x, P.F.z, 22], [P.F.x + 30, P.F.z - 10, 16], [P.F.x - 6, P.F.z + 28, 10], [P.F.x - 80, P.F.z - 26, 18], [P.F.x - 120, P.F.z + 20, 14], [P.G.x, P.G.z, 34], [P.E.x, P.E.z, 50]];
    const rr = mulberry32(1807_412);
    for (let i = 0; i < 360 && taken.length < 48; i++) {
      const x = -220 + rr() * 470, z = -60 + rr() * 120;
      if (isle(x, z) < 0.5 || street(x, z) || wet(x, z, 10) || nearCrossing(x, z, 26) || taken.some(([tx, tz, r]) => Math.hypot(x - tx, z - tz) < r + 7)) continue;
      taken.push([x, z, 6]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      if (rr() < 0.4) props.townHouse({ x, z, yaw: rr() < 0.7 ? 0 : Math.PI / 2, width: 7 + rr() * 2, depth: 8, storeys: rr() < 0.3 ? 2 : 1, damaged: 0 });
      else props.house({ x, z, yaw: rr() < 0.7 ? 0 : Math.PI / 2, width: 7 + rr() * 2, depth: 6 });     // (the wooden houses of a Lithuanian town)
    }
    // the Bernardine monastery at the island’s east end: church, cloister range, garden wall
    props.rand = mulberry32(1807_413);
    props.church({ x: P.G.x - 4, z: P.G.z - 26, yaw: Math.PI / 2 });
    props.hall({ x: P.G.x + 28, z: P.G.z + 2, yaw: Math.PI / 2, width: 20, depth: 9, height: 6, color: 0xb8ac94, roof: 0x5a3a2a, door: 3, name: 'Bernardine cloister' });
    for (const [x0, z0, x1, z1] of [[P.G.x - 40, P.G.z + 22, P.G.x - 8, P.G.z + 22], [P.G.x + 8, P.G.z + 22, P.G.x + 40, P.G.z + 22]] as const) seg(x0, z0, x1, z1, 1.8);
    // the castle mound: an earthwork ring with a gate on each side, the old castle church on top
    const N = 32, R = 30;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, am = (a0 + a1) / 2;
      if ([0, Math.PI / 2, Math.PI, Math.PI * 1.5].some((g) => Math.abs(Math.atan2(Math.sin(am - g), Math.cos(am - g))) < 0.25)) continue;
      seg(P.E.x + Math.cos(a0) * R, P.E.z + Math.sin(a0) * R * 0.8, P.E.x + Math.cos(a1) * R, P.E.z + Math.sin(a1) * R * 0.8, 2, 2);
    }
    props.church({ x: P.E.x - 16, z: P.E.z - 2, yaw: 0 });                                                         // (off the point’s centre)

    // ---- the suburbs across the arms and the villages, wooden and low
    for (const p of POINTS) if (!p.owner && !'EFG'.includes(p.id)) buildVillage(props, p, 18074 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1807_414);
    for (const [p, s] of [[P.C, 1], [P.I, -1]] as const) {
      props.church({ x: p.x + 34, z: p.z + s * 10, yaw: 0 });                                                         // (the suburbs’ wooden churches)
      for (let k = 0; k < 5; k++) props.house({ x: p.x - 50 + k * 16, z: p.z - s * 30, yaw: 0, width: 7, depth: 6 });
    }

    // ---- farms, hay, field walls on the dry ground; log piles by the woods
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 70 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 60) || woods(x, z) > 0.3 || marsh(x, z) > 0.1 || isle(x, z) > 0 || wet(x, z, 30)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [x, z, yaw] of [[-380, 120, 0.4], [400, -100, 1.9], [390, 130, 2.6], [-370, -130, 0.9]] as const) props.logPile({ x, z, yaw, length: 7 });
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x - 20, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })),
      { test: (x, z) => wet(x, z, 1.5) || isle(x, z) > 0.3 || Math.hypot(x - P.E.x, z - P.E.z) < 40 || Math.hypot(x - P.G.x, z - P.G.z) < 45 }];
    // pine and birch, alder and willow in the wet
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3400, broadleaf: 0.45, autumn: 0, forest: (x, z) => (wet(x, z, 10) ? 0.45 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
