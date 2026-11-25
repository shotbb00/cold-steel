// Ratzeburg Lakes, autumn 1985 (a hypothetical war; the big field, 1.0 × 1.12 km): the Warsaw Pact’s thrust over
// the inner-German border in Schleswig-Holstein, at the narrow waist between the GDR and Lübeck / Hamburg, held by the
// Bundeswehr’s 6. Panzergrenadierdivision. West is +z on the map (NATO’s side, toward Mölln and Hamburg), east is -z
// (the GDR). Across the middle lie the Ratzeburg lakes — the long Ratzeburger See, the Küchensee bulging toward Mölln
// and the Domsee toward the border — with the old town of Ratzeburg on its island in the middle, its cathedral and
// cobbled streets, reached only over two causeways (the Königsdamm from the west, the Domsee causeway from the east).
// North and south of the lakes the land corridors through the Lauenburg forests (Groß Sarau at the lake’s north end,
// Seedorf by the Schaalsee). Behind NATO’s line runs the Elbe–Lübeck Canal past Mölln (three bridges: Berkenthin,
// Mölln, Güster); behind the Pact’s the Schaale out of the Schaalsee (three bridges: Schlagsdorf, Lassahn, Zarrentin).
// The border itself crosses the Pact’s half east of the lakes: the ploughed control strip, the Kolonnenweg, the fence
// blown open on the roads, the GDR’s concrete towers and a West German observation post.
// Fair, not mirrored: the lakes run off-centre (further north than south), the canal is straight where the Schaale
// winds, its bridges stand in other places, the hills and woods lie where they lie; but each side has one causeway onto
// the island the same distance from its base, a lake bulge on its half of the same size, a corridor round each end of
// the lakes, three bridges behind its line with a village beyond each, a wooded knoll on each half of the middle ground
// and a height over each outer bank, a flat field for its airstrip, and its points at matching distances (measured:
// tools/map_fairness.py).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { createLakes } from '../world/Lakes.js';
import { buildSite, buildVillage, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const CX = [-390, 100, 300];   // the canal bridges (Berkenthin, Mölln, Güster)
const SX = [-350, -60, 360];   // the Schaale bridges (Schlagsdorf, Lassahn, Zarrentin)
const ISLAND = 62;             // Ratzeburg’s island, round (0, 0)
const noise = createNoise2D(1985_31);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// the Elbe–Lübeck Canal (dug straight) on NATO’s side, the Schaale (winding) on the Pact’s
const canalZ = (x) => 262 + x * 0.03 + 5 * Math.sin(x * 0.003 + 0.5);
const schaaleZ = (x) => -255 + 18 * Math.sin(x * 0.005 + 1.3) + 7 * Math.sin(x * 0.017 - 0.4);
const away = (x, z) => Math.min(Math.abs(z - canalZ(x)), Math.abs(z - schaaleZ(x)));
const river = createRiver({
  paths: [canalZ, schaaleZ],
  halfWidth: 9,
  level: 0,
  depth: 2.4,
  valley: 30,
  crossings: [
    { name: 'Berkenthin bridge', x: CX[0], kind: 'bridge', width: 7, channel: 0 },
    { name: 'Mölln bridge', x: CX[1], kind: 'bridge', width: 8, channel: 0 },
    { name: 'Güster bridge', x: CX[2], kind: 'bridge', width: 7, channel: 0 },
    { name: 'Schlagsdorf bridge', x: SX[0], kind: 'bridge', width: 7, channel: 1 },
    { name: 'Lassahn bridge', x: SX[1], kind: 'bridge', width: 8, channel: 1 },
    { name: 'Zarrentin bridge', x: SX[2], kind: 'bridge', width: 7, channel: 1 },
  ],
});

// the lakes: the long Ratzeburger See across the middle (Ratzeburg’s island in it), the Küchensee bulging west (NATO’s
// half) and the Domsee east (the Pact’s), the Lankauer See by Berkenthin and the tip of the Schaalsee on the flanks
const lakes = createLakes({ lakes: [
  { x: -15, z: 0, rx: 260, rz: 100, rot: 0.03, depth: 4.5, seed: 1 },
  { x: -130, z: 95, rx: 70, rz: 38, rot: 0.3, depth: 3, seed: 2 },
  { x: 110, z: -95, rx: 66, rz: 40, rot: -0.25, depth: 3, seed: 3 },
  { x: -470, z: 160, rx: 45, rz: 58, rot: 0.2, depth: 3, seed: 4 },
  { x: 450, z: -140, rx: 48, rz: 55, rot: -0.3, depth: 3.5, seed: 5 },
] });
const wetQ = (x, z) => lakes.q(x, z);

/** The roads: the flank roads on the slant from Schaale bridge to canal bridge, the centre road over both causeways. */
function roadX(k, z) {
  if (k !== 1) return SX[k] + (CX[k] - SX[k]) * smoothstep(-220, 220, z) + 6 * Math.sin(z * 0.02 + k);
  const off = z >= 0 ? CX[1] * smoothstep(120, 240, z) : SX[1] * smoothstep(-125, -225, z);
  return off + 4 * Math.sin(z * 0.03) * smoothstep(130, 170, Math.abs(z));
}
const roadDist = (x, z) => Math.min(Math.abs(x - roadX(0, z)), Math.abs(x - roadX(1, z)), Math.abs(x - roadX(2, z)));
const causeway = (x, z) => (Math.abs(z) < 150 ? smoothstep(8, 5, Math.abs(x - roadX(1, z))) : 0);

// the border east of the lakes: the control strip and the Kolonnenweg beside it
const borderZ = (x) => -170 + 8 * Math.sin(x * 0.005 + 0.7);

// the airstrips’ fields (systems/Airfields.js finds them: flat, open, clear of the points)
const FIELDS = [{ x: -230, z0: 365, z1: 475 }, { x: 230, z0: -475, z1: -365 }];
const fieldK = (x, z) => {
  const f = FIELDS[z > 0 ? 0 : 1];
  return smoothstep(180, 150, Math.abs(x - f.x)) * smoothstep(f.z0 - 30, f.z0, z) * smoothstep(f.z1 + 30, f.z1, z);
};

// the wooded knolls of the middle ground (two each half) and the heights over the outer banks (two each side)
const KNOLLS = [[-200, 178, 40, 6], [230, 165, 34, 5], [130, -198, 44, 6], [-250, -160, 34, 5]];
const HEIGHTS = [[140, 445, 45, 9], [430, 300, 40, 7], [-130, -440, 45, 8.5], [-430, -260, 40, 7.5]];
const HILLS = [...KNOLLS, ...HEIGHTS];
// (lakes.carve only near a lake: the shore basin reaches 60 m past it)
const LAKE_BOX = lakes.lakes.map((L) => { const r = Math.max(L.rx, L.rz) * 1.25 + 62; return [L.x - r, L.x + r, L.z - r, L.z + r]; });
const nearLake = (x, z) => LAKE_BOX.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.004, z * 0.004, 5) * 5;                                 // the rolling moraine
  h += fbm(noise, x * 0.05 + 50, z * 0.05, 3) * 0.5;
  h += smoothstep(60, 200, away(x, z)) * (6 + ridged(noise, x * 0.008 + 3, z * 0.008, 4) * 6);
  h += x * 0.006;                                                                   // falling gently north, toward Lübeck (alike for both)
  for (const [cx, cz, r, a] of HILLS) h += hill(x, z, cx, cz, r, a);
  h += smoothstep(500, 620, ax) * (14 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 22);
  h += smoothstep(560, 680, az) * 18;
  h += (5.5 - h) * fieldK(x, z);                                                    // the airstrip fields
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(28, 15, Math.hypot(x, z - bz));
  h = river.carve(x, z, Math.max(1.4, h));
  if (nearLake(x, z)) h = lakes.carve(x, z, h);
  const r = Math.hypot(x, z);
  if (r < ISLAND + 6) h += (2.6 + 2.2 * smoothstep(ISLAND, 0, r) - h) * smoothstep(ISLAND + 5, ISLAND - 6, r); // the island, rising to the cathedral
  const c = causeway(x, z);
  if (c > 0 && h < 1.5) h += (1.5 - h) * c;                                         // the two causeways
  return h;
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1. Zug' }];
const pactName = { '1. Zug': '1. Kompanie' };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Breitenfelde', x: 0, z: 466, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Berkenthin', x: -390, z: 335, owner: null, sector: 'west' },
  { id: 'C', name: 'Mölln', x: 110, z: 320, owner: null, sector: 'centre', radius: 24 },
  { id: 'D', name: 'Güster', x: 300, z: 365, owner: null, sector: 'east' },
  { id: 'E', name: 'Groß Sarau', x: -420, z: 45, owner: null, sector: 'west' },
  { id: 'F', name: 'Ratzeburg', x: 0, z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Seedorf', x: 360, z: -50, owner: null, sector: 'east' },
  { id: 'H', name: 'Schlagsdorf', x: -350, z: -330, owner: null, sector: 'west' },
  { id: 'I', name: 'Lassahn', x: -60, z: -340, owner: null, sector: 'centre' },
  { id: 'J', name: 'Zarrentin', x: 366, z: -320, owner: null, sector: 'east' },
  { id: 'K', name: 'Gadebusch', x: 0, z: -466, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'ratzeburg-lakes',
  name: 'Ratzeburg Lakes',
  description: 'Schleswig-Holstein, autumn 1985: the Pact strikes over the border toward Lübeck and Hamburg. Ratzeburg on its island in the long lakes, two causeways onto it, the Elbe–Lübeck Canal at Mölln, the Lauenburg forests round the lakes’ ends.',
  epochs: ['1985'],
  region: 'europe',
  armies: { nato: ['bw'], pact: ['nva', 'sov'] }, // (the Bundeswehr’s 6. Panzergrenadierdivision against the NVA and the Soviet Army out of Mecklenburg)
  sides: { nato: 'West Germany', pact: 'Warsaw Pact' },
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1985_31,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1985_31, cell: 64 }),

  theme: {
    // a grey October day over the lakes
    fogColor: 0xa6acae,
    fogDensity: 0.0019,
    skyTop: 0x66727e,
    skyHorizon: 0xbcc0bc,
    skyBottom: 0x70746e,
    sunColor: 0xeae2cc,
    sunIntensity: 1.6,
    sunDisk: 0.15,
    clouds: 0.75,
    cloudLight: 0xcccdc8,
    cloudDark: 0x7a7f84,
    sunDir: [0.45, 0.55, 0.65],
    hemiSky: 0xc4ccd2,
    hemiGround: 0x4a4636,
    hemiIntensity: 1.3,
    rimColor: 0xb8c0c8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#56633a',
      grassAlt: '#4c5834',
      dryGrass: '#867850',
      dirt: '#54463a',
      rock: '#6a6862',
      strip: '#4d4032',
      pasture: '#58653a',
      ploughed: '#4c3d2e',
      stubble: '#8c7c50',
      meadow: '#66723e',
      farmX: [520, 600],
      farmZ: [580, 660],
      roads: [],                    // (the roads are the map’s own: surface below)
      surface(x, z) {
        const r = Math.hypot(x, z);
        if (r < ISLAND - 4) {                                                        // Ratzeburg: cobbled streets, the market
          const st = Math.max(smoothstep(5, 3, Math.abs(x - roadX(1, z))), smoothstep(4, 2.5, Math.abs(z)), smoothstep(16, 13, Math.max(Math.abs(x), Math.abs(z))));
          return st > 0 ? [0x6e6a62, st * 0.9] : [0x4c5236, 0.4];
        }
        const bd = Math.abs(z - borderZ(x));
        if (bd < 4) return [0x8a7a5c, 0.85];                                         // the ploughed control strip
        if (bd > 6 && bd < 9 && z < borderZ(x)) return [0x77756e, 0.8];               // the Kolonnenweg’s concrete slabs
        const rd = smoothstep(5, 2.5, roadDist(x, z)) * smoothstep(540, 512, Math.abs(z));
        if (rd > 0) return [Math.abs(x - roadX(1, z)) < 5 ? 0x4e4c48 : 0x5a4a3a, rd * 0.7]; // the B208 tarmac / the dirt roads
        const q = wetQ(x, z);
        if (q < 1.15) return [0x6a6a44, smoothstep(1.15, 1.0, q) * 0.6];              // reeds round the lakes
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: CX }, pact: { x: 0, z: -BASE_Z, entries: SX } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x, z, r = 0) => away(x, z) < river.halfWidth + 6 + r || wetQ(x, z) < 1.12 + r * 0.01;
    const onField = (x, z) => fieldK(x, z) > 0.01;

    // ---- Ratzeburg on its island: the cathedral at the north end, houses along the main street and the cross street
    props.rand = mulberry32(1985_32);
    props.church({ x: -36, z: -4, yaw: Math.PI / 2 });                       // the Dom
    props.lowWall({ x: -36, z: 18, yaw: Math.PI / 2, length: 22 });
    props.townHouse({ x: 22, z: 0, yaw: -Math.PI / 2, width: 16, depth: 10, storeys: 3, name: 'town hall', damaged: 0 });
    const r0 = props.rand;
    for (let z = -50; z <= 50; z += 12) for (const side of [-1, 1]) for (const lane of [11, 27]) {
      const x = roadX(1, z) + side * (lane + (r0() - 0.5) * 2), zz = z + (r0() - 0.5) * 3;
      if (Math.hypot(x, zz) > ISLAND - 10 || Math.abs(zz) < 8 || (Math.abs(x) < 17 && Math.abs(zz) < 17) || r0() < 0.15) continue;
      if (Math.hypot(x + 36, zz + 4) < 20 || Math.hypot(x - 22, zz) < 13) continue; // the Dom, the town hall
      props.townHouse({ x, z: zz, yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2, width: 8 + r0() * 2, depth: 8, storeys: r0() < 0.3 ? 3 : 2 });
    }
    for (const [x, z, yaw] of [[-6, -9, 0.5], [7, 10, 2.3]]) props.wreckCar({ x, z, yaw });
    for (const s of [1, -1]) {                                               // barricades at both causeway heads
      const z = s * (ISLAND - 4);
      props.jersey({ x: roadX(1, z) - 7, z, yaw: 0.15, length: 5 });
      props.jersey({ x: roadX(1, z) + 7, z, yaw: -0.15, length: 5 });
    }

    // ---- Mölln on the canal: St. Nicolai on its hill, the old town round it
    props.rand = mulberry32(1985_33);
    props.church({ x: 140, z: 335, yaw: Math.PI });
    const r1 = props.rand;
    for (let i = 0, n = 0; n < 14 && i < 200; i++) {
      const x = 110 + (r1() - 0.5) * 120, z = 300 + r1() * 70;
      if (wet(x, z, 6) || roadDist(x, z) < 8 || Math.hypot(x - 140, z - 335) < 18 || Math.hypot(x - 110, z - 320) < 10) continue;
      props.townHouse({ x, z, yaw: x < roadX(1, z) ? Math.PI / 2 : -Math.PI / 2, width: 8 + r1() * 2, depth: 8, storeys: 2 });
      n++;
    }

    // ---- villages at the other points, each its own
    for (const p of points) if (!'CF'.includes(p.id)) buildVillage(props, p, 9300 + Math.round(p.x * 3 + p.z * 7), 1);

    // ---- cover: as many sites on each half, each half its own dice
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'wrecks', 'hay', 'fieldwall', 'roadblock'];
    const sites: any[] = [];
    for (const side of [1, -1]) {
      let n = 0;
      for (let tries = 0; n < 130 && tries < 9000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20);
        const z = side * (10 + rand() * (bounds.z - 30));
        if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 28 * 28)) continue;
        if (Math.hypot(x, z - side * BASE_Z) < 40 || nearPoint(x, z, 36) || wet(x, z, 10) || roadDist(x, z) < 7 || onField(x, z)) continue;
        if (Math.abs(z - borderZ(x)) < 14 || Math.hypot(x, z) < ISLAND + 40) continue;
        if (river.crossings.some((c) => Math.abs(x - c.x) < 16 && Math.abs(z - c.z) < 40)) continue;
        sites.push({ x, z, kind: kinds[n++ % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
      }
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    // ---- the border: the fence blown open on the three roads (and in two other places), the GDR towers, the West’s OP
    props.rand = mulberry32(1985_34);
    const gaps = [0, 1, 2].map((k) => { const x = roadX(k, borderZ(roadX(k, -170))); return [x - 12, x + 12]; });
    gaps.push([-150, -138], [196, 208]);
    for (let x0 = -bounds.x - 30; x0 < bounds.x + 30; x0 += 40) {            // in runs, none through the lakes
      const x1 = x0 + 37, zm = borderZ(x0 + 18);
      if (wetQ(x0 + 18, zm) < 1.15 || wetQ(x0, zm) < 1.15 || wetQ(x1, zm) < 1.15) continue;
      props.fence({ x0, x1, z: zm - 1.5, breaches: gaps });
    }
    for (const x of [-270, 60, 280]) props.tower({ x, z: borderZ(x) - 22, concrete: true });
    props.tower({ x: -40, z: borderZ(-40) + 30, concrete: false });
    for (const k of [0, 1, 2]) {
      const x = roadX(k, -170);
      props.jersey({ x: x - 12 + props.rand() * 3, z: borderZ(x) + 9, yaw: 0.1, length: 6 });
      for (const [hx, hz] of [[-7, -6], [0, -8], [7, -6]]) props.hedgehog({ x: x + hx + props.rand() * 2, z: borderZ(x) + hz - 3 });
    }

    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    river.build(scene, terrain);
    lakes.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 24 }, { x: 0, z: -BASE_Z, r: 24 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })),
      { test: (x, z) => wet(x, z, -5) || roadDist(x, z) < 5 || Math.hypot(x, z) < ISLAND || causeway(x, z) > 0 || onField(x, z) || Math.abs(z - borderZ(x)) < 10 }];
    // alders on the banks and the lake shores, beech and pine on the knolls and heights, the Lauenburg forests on the flanks
    const forest = (x, z) => {
      if (away(x, z) < river.halfWidth + 2 || wetQ(x, z) < 1.04) return -1;
      const shore = wetQ(x, z) < 1.25 || away(x, z) < river.halfWidth + 12 ? 0.5 : 0;
      let woods = 0;
      for (const [cx, cz, r] of [...KNOLLS, ...HEIGHTS]) woods = Math.max(woods, hill(x, z, cx, cz, r, 1));
      const flank = smoothstep(450, 490, Math.abs(x)) * 0.85;
      return Math.max(shore, woods > 0.45 ? 0.8 : 0, flank);
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3000, forest });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 8000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3, fields: this.fields });

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
