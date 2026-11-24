// Elchingen, 14 October 1805: the Ulm encirclement. Mack's Austrians were shut up in Ulm; Riesch's corps held the
// north bank of the Danube downstream at Elchingen to keep the road east open. The Austrians had pulled the planks
// off the Elchingen bridge; in the October rain Ney's sappers laid them again under fire, Loison's men stormed over
// the half-broken bridge, through Unterelchingen on the floodplain and up the steep slope to the abbey village of
// Oberelchingen on the heights, and Riesch was thrown back on Albeck and Ulm. The French come from the south bank
// (+z here), the Austrians hold the north bank (−z); the Danube runs across the middle of the field, west (Ulm) to
// east (Leipheim). Fair, not mirrored: the river lies as far from each base, and its three crossings are everyone’s —
// the half-broken Elchingen bridge in the middle, the Leipheim bridge downstream (its points on the south
// bridgehead), the Thalfingen ford upstream (the village on the north bank). The abbey’s heights over the north bank
// are traded for the Straß heights and the long rise by the Leibi on the south bank; Göttingen’s wood for the
// Nersingen wood; the Austrians’ Riedheim for the French Leibi mill. No `climate`: autumn rain, not snow.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const noise = createNoise2D(1805_10);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// the Danube across the middle, west to east
const danubeZ = (x) => 14 * Math.sin(x * 0.004 + 0.6) + 6 * Math.sin(x * 0.013 + 2) - 8;

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Günzburg road', x: 0, z: 420, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Straß', x: -370, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Nersingen', x: -120, z: 225, owner: null, sector: 'centre' },
  { id: 'D', name: 'Leibi mill', x: 240, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Thalfingen', x: -320, z: -50, owner: null, sector: 'west' },
  { id: 'F', name: 'Elchingen bridge', x: 0, z: danubeZ(0), owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Leipheim bridge', x: 340, z: danubeZ(340) + 70, owner: null, sector: 'east' },
  { id: 'H', name: 'Göttingen', x: -300, z: -280, owner: null, sector: 'west' },
  { id: 'I', name: 'Elchingen abbey', x: 90, z: -235, owner: null, sector: 'centre', radius: 28 },
  { id: 'J', name: 'Riedheim', x: 360, z: -330, owner: null, sector: 'east' },
  { id: 'K', name: 'Albeck road', x: 0, z: -420, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

const river = createRiver({
  path: danubeZ,
  halfWidth: 17,
  level: 0,
  depth: 3,
  valley: 80,
  crossings: [
    { name: 'Thalfingen ford', x: -320, kind: 'ford', width: 14 },
    { name: 'Elchingen bridge', x: 0, kind: 'bridge', width: 5 },   // (half-broken: the planks laid again under fire)
    { name: 'Leipheim bridge', x: 340, kind: 'bridge', width: 7 },
  ],
});
const nearWater = (x, z, r) => Math.abs(z - danubeZ(x)) < river.halfWidth + r;
const ABBEY = { x: P.I.x + 6, z: P.I.z - 8 };

/** The woods (0..1): Göttingen’s wood and the Nersingen wood, copses, the willows and alders of the Danube meadows. */
const woods = (x, z) => {
  let k = smoothstep(0.52, 0.66, fbm(noise, x * 0.006 + 13, z * 0.006 - 9, 3)) * 0.8;
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.H.x + 60) / 120, (z - P.H.z + 20) / 80)));   // (the wood behind Göttingen)
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.C.x + 110) / 100, (z - P.C.z + 10) / 75)));  // (the Nersingen wood, west of the village)
  const d = Math.abs(z - danubeZ(x));
  if (d > river.halfWidth + 6 && d < 62 && fbm(noise, x * 0.02, z * 0.02 + 40, 2) > 0.45) k = Math.max(k, 0.6); // (the Au: willow scrub on the meadows)
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 56, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(26, 50, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, smoothstep(60, 95, Math.hypot(x - ABBEY.x, z - ABBEY.z)));
};

function height(x, z) {
  let h = fbm(noise, x * 0.0025, z * 0.0025, 3) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 6;
  // the north bank: the Alb’s edge stepping up from the meadows, highest at the abbey
  h += smoothstep(-90, -190, z) * 4 + smoothstep(100, 200, z) * 2; // (both banks step up off the meadows)
  h += hill(x, z, ABBEY.x, ABBEY.z, 95, 8) + hill(x, z, ABBEY.x - 150, ABBEY.z - 40, 90, 6);
  // the south bank: the Straß heights, the long rise along the Leibi
  h += hill(x, z, P.B.x + 20, P.B.z - 20, 115, 12) + hill(x, z, P.B.x + 140, P.B.z + 30, 90, 4);
  h += hill(x, z, P.D.x + 40, P.D.z - 70, 110, 7);
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 22 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'FI'.includes(p.id)) h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'elchingen',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Ney’s VI Corps against Riesch’s Austrians — Austria has no units yet: Russia fights for her)
  name: 'Elchingen',
  description: 'Swabia, October 1805: the Danube below Ulm across the middle, the half-broken Elchingen bridge and the abbey village of Oberelchingen on the heights over the north bank, in the autumn rain.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'rain' }, // (the October rain of the Ulm campaign)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180510,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_14, cell: 76, weights: [0.2, 0.4, 0.3, 0.1] }), // October: stubble and fresh ploughland, wet meadows

  theme: {
    // rain over the Danube: low cloud, the far bank grey, the light flat
    fogColor: 0xa8aeae,
    fogDensity: 0.002,
    skyTop: 0x737c86,
    skyHorizon: 0xb2b8b8,
    skyBottom: 0x80847c,
    sunColor: 0xd8dcd8,
    sunIntensity: 1.1,
    sunDisk: 0,
    clouds: 1,
    cloudLight: 0xb4b8bc,
    cloudDark: 0x666c72,
    sunDir: [0.4, 0.45, 0.6],
    hemiSky: 0xbcc4c8,
    hemiGround: 0x54523e,
    hemiIntensity: 1.4,
    rimColor: 0xb8c0c6,
    rimIntensity: 0.15,
    terrain: {
      grass: '#56663a',
      grassAlt: '#4e5e36',
      dryGrass: '#7e7a4e',
      dirt: '#5a4a38',
      rock: '#7a786e',
      strip: '#4e4232',
      pasture: '#5a6a3a',
      ploughed: '#4e3f2e',
      stubble: '#8a8254',
      meadow: '#5c6c3e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const d = Math.abs(z - danubeZ(x)) - river.halfWidth;
        if (d > 0 && d < 50) return [0x4c5a3a, smoothstep(50, 10, d) * 0.5];                  // the wet meadows along the river
        const m = smoothstep(0.52, 0.64, fbm(noise, x * 0.012 + 30, z * 0.012, 2));
        return m > 0 ? [0x4a3e30, m * 0.5] : null;                                                // puddles and mud
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];

    // ---- Oberelchingen: the abbey church on the heights, the convent range and its wall, the village round it
    props.rand = mulberry32(1805_1014);
    props.church({ x: ABBEY.x, z: ABBEY.z, yaw: Math.PI / 2 });
    props.hall({ x: ABBEY.x - 30, z: ABBEY.z - 4, yaw: Math.PI / 2, width: 30, depth: 10, height: 8, color: 0xe0d8c4, roof: 0x7a3a2a, door: 3, name: 'abbey' }); // (the convent range)
    for (const [dx, dz, yaw, length] of [[-12, -30, 0, 50], [-12, 26, 0, 50], [-44, -2, Math.PI / 2, 40]] as const) props.wall({ x: ABBEY.x + dx, z: ABBEY.z + dz, yaw, length, height: 2 });
    taken.push([ABBEY.x, ABBEY.z], [ABBEY.x - 30, ABBEY.z - 4]);
    const rr = mulberry32(1805_14);
    for (let i = 0; i < 26; i++) {
      const a = rr() * Math.PI * 2, d = 46 + rr() * 40;
      const x = ABBEY.x + Math.cos(a) * d, z = ABBEY.z + Math.sin(a) * d * 0.8;
      if (Math.hypot(x - P.I.x, z - P.I.z) < 20 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 15)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.house({ x, z, yaw: a + Math.PI / 2, width: 7 + rr() * 2, depth: 6 });
    }
    // ---- Unterelchingen on the meadows at the bridge’s north end; the toll house and the planks piled by the south end
    props.rand = mulberry32(1805_141);
    for (const [x, z, yaw] of [[-40, -70, 0.1], [-58, -88, 1.6], [38, -74, -0.1], [56, -92, 1.5], [-20, -98, 0.05], [24, -104, 0]] as const) {
      props.house({ x, z: z + danubeZ(x), yaw, width: 8, depth: 6 });
      taken.push([x, z + danubeZ(x)]);
    }
    props.house({ x: 22, z: danubeZ(22) + 52, yaw: 0, width: 6, depth: 5 });
    for (const dx of [-14, -8]) props.logPile({ x: dx, z: danubeZ(dx) + 48, yaw: Math.PI / 2, length: 7 });
    taken.push([22, danubeZ(22) + 52], [-11, danubeZ(-11) + 48]);
    // ---- the Leibi mill on its brook, Thalfingen by the ford
    props.hall({ x: P.D.x + 24, z: P.D.z - 18, yaw: 0.3, width: 12, depth: 8, height: 5, color: 0xd0c4a8, roof: 0x6a3a2a, door: 3, name: 'mill' });
    taken.push([P.D.x + 24, P.D.z - 18]);
    for (const p of POINTS) if (!p.owner && 'BCDEGHJ'.includes(p.id)) buildVillage(props, p, 18051 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1805_9);
    props.church({ x: P.C.x + 30, z: P.C.z + 22, yaw: 0 });
    props.church({ x: P.H.x - 26, z: P.H.z - 24, yaw: Math.PI / 2 });
    taken.push([P.C.x + 30, P.C.z + 22], [P.H.x - 26, P.H.z - 24]);

    // ---- farms, field walls and hay
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 100);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || nearWater(x, z, 45) || Math.hypot(x - ABBEY.x, z - ABBEY.z) < 100 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 1.5) || Math.hypot(x - ABBEY.x + 14, z - ABBEY.z) < 46 }];
    // oaks, beeches and willows turning, spruce on the heights
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0.7, autumn: 0.9, forest: (x, z) => (nearWater(x, z, 10) ? 0.5 : woods(x, z) * 0.95) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1800, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.8, fields: this.fields });

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
