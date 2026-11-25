// Wischau, 28 November 1805: four days before Austerlitz the Allied army moved off from Olmütz, and Bagration's
// advance guard — Russian hussars, Cossacks and Austrian horse — fell on Murat's cavalry in Wischau (Vyškov) on
// the Olmütz–Brünn chaussée, took the town and a squadron of dragoons in it, and drove the French back through
// Rausnitz. Napoleon let them come: the retreat drew the Allies on to the field he had chosen.
// The real ground: Wischau lies in the Vyškov Gate, the corridor between the Drahany upland (north-west) and the
// Litenčice hills (south-east), with the Hanna coming down out of the Drahany past the town and on across the gate.
// The French come from the west (+z: Rausnitz), the Allies from the east (−z: Pustomersch); north is −x. The Drahany
// upland fills the French side's north-west corner, wooded, with the Hanna's valley cut into it; the lower, rolling
// Litenčice hills fill the Allied side's south-east corner; the chaussée runs down the gate between them.
// Fair by distance, not by shape: each village is as far from its nearer base as its counterpart (tools/map_fairness.py);
// the high wooded corner before the French (Lultsch) is answered by the hills over Hoschtitz before the Allies.
// 1806 only (`epochs`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 480;
const noise = createNoise2D(1805_11_28);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Rausnitz', x: 0, z: 450, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Lultsch', x: -360, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Kutscherau', x: 120, z: 230, owner: null, sector: 'centre' },
  { id: 'D', name: 'Komorau', x: 350, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Drnowitz', x: -300, z: 40, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Wischau', x: 0, z: 10, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Topolan', x: 300, z: -25, owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Dieditz', x: -270, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Krzischanowitz', x: -50, z: -240, owner: null, sector: 'centre' },
  { id: 'J', name: 'Hoschtitz', x: 360, z: -250, owner: null, sector: 'east' },
  { id: 'K', name: 'Pustomersch', x: 0, z: -450, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Olmütz–Brünn chaussée, west to east down the middle, lined with trees
const roadX = (z) => 14 * Math.sin(z * 0.0042 + 0.6) - 8;
const roadD = (x, z) => Math.abs(x - roadX(z));
// the Hanna, out of the Drahan hills (north, −x) across the field to the south: east of the town, west of Drnowitz and Topolan
const HANA = [[-650, 380], [-440, 205], [-300, 120], [-190, 40], [-60, -40], [80, -52], [210, -30], [300, 12], [420, 5], [650, 25]];
const river = createRiver({
  paths: [HANA],
  halfWidth: 7,
  level: 0,
  depth: 1.8,
  valley: 40,
  crossings: [
    { name: 'Wischau bridge', x: roadX(-48), z: -48, kind: 'bridge', width: 9 },
    { name: 'Topolan bridge', x: 296, z: 10, kind: 'bridge', width: 6 },
    { name: 'Drnowitz ford', x: -310, z: 78, kind: 'ford', width: 14 },
    { name: 'Mill ford', x: -150, z: 22, kind: 'ford', width: 12 },
    { name: 'Ford', x: 160, z: -42, kind: 'ford', width: 12 },
    { name: 'Ford', x: 440, z: 6, kind: 'ford', width: 12 },
    { name: 'Ford', x: -470, z: 230, kind: 'ford', width: 12 },
  ],
});
/** 1 in the town, 0 outside it: Wischau's houses round the market on the chaussée. */
const town = (x, z) => smoothstep(1.1, 0.85, Math.hypot((x - P.F.x) / 70, (z - P.F.z - 10) / 60));
/** The Drahan upland's rise (0..1): a lobe filling the north-west corner (−x, +z), its edge running diagonally. */
const drahan = (x, z) => smoothstep(330, 560, -0.9 * x + 0.5 * z + fbm(noise, z * 0.004 + 3, x * 0.004, 2) * 70);
/** The Litenčice hills (0..1): lower, rolling, in the south-east corner (+x, −z) across the Vyškov Gate. */
const litencice = (x, z) => smoothstep(300, 520, 0.6 * x - 0.8 * z + fbm(noise, z * 0.004 - 11, x * 0.004 + 5, 2) * 70);
/** The Haná's own valley up into the Drahan upland (a cheap analytic line, not the river). */
const HANA_UP = [[-640, 330], [-440, 205], [-300, 120]];
/** Woods (0..1): the Drahan forest on the hills, a few spinneys, willows on the Hanna. */
const woods = (x, z) => {
  let k = smoothstep(0.55, 0.7, fbm(noise, x * 0.006 + 13, z * 0.006 - 21, 3)) * 0.7;
  k = Math.max(k, smoothstep(0.35, 0.7, drahan(x, z)) * (0.75 + 0.25 * fbm(noise, x * 0.01, z * 0.01, 2)), smoothstep(0.5, 0.85, litencice(x, z)) * smoothstep(-0.15, 0.2, fbm(noise, x * 0.008 + 3, z * 0.008, 2)));
  k = Math.min(k, 1 - town(x, z), smoothstep(10, 24, roadD(x, z)));
  for (const p of POINTS) k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4 + 5;
  const dk = drahan(x, z) * smoothstep(20, 110, segDist(HANA_UP, x, z));                          // (the Haná's valley cut into it)
  h += dk * (24 + ridgeN(x, z) * 10) + litencice(x, z) * (16 + fbm(noise, x * 0.011, z * 0.011 + 9, 2) * 14);
  h += hill(x, z, -260, 330, 80, 6) + hill(x, z, 330, -330, 90, 5);                               // the spurs over Lultsch and Hoschtitz
  h += (h * 0.5 + 2.6 - h) * town(x, z) * 0.7;                                                    // the town on its gentle slope to the river
  for (const p of POINTS) if (p.id !== 'F') h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (5 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}
const ridgeN = (x, z) => fbm(noise, x * 0.006 + 41, z * 0.006 - 3, 3);

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'wischau',
  armies: { nato: ['fr'], pact: ['ru'] }, // (Murat's cavalry against Bagration's advance guard)
  name: 'Wischau',
  description: 'Moravia, 28 November 1805: the little town of Wischau on the Olmütz chaussée, the Hanna river by it, in the gate between the wooded Drahany upland and the Litenčice hills — cavalry country.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'overcast' }, // (a raw late-November morning)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 18051128,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_28, cell: 90, weights: [0.3, 0.3, 0.3, 0.1] }), // late November: stubble, winter wheat sown, pasture

  theme: {
    // grey late-autumn light over the Hanna plain, the hills dark with forest
    fogColor: 0xb4b8b2,
    fogDensity: 0.0016,
    skyTop: 0x7a8694,
    skyHorizon: 0xc6c8c0,
    skyBottom: 0x7c7c72,
    sunColor: 0xeae0cc,
    sunIntensity: 1.6,
    sunDisk: 0.15,
    clouds: 0.8,
    cloudLight: 0xcfd0ca,
    cloudDark: 0x7e8388,
    sunDir: [-0.3, 0.45, -0.8],
    hemiSky: 0xc4ccd2,
    hemiGround: 0x4c4838,
    hemiIntensity: 1.25,
    rimColor: 0xbcc4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#626a42',
      grassAlt: '#56603c',
      dryGrass: '#8c7e56',
      dirt: '#584838',
      rock: '#6e6c64',
      strip: '#4e4232',
      pasture: '#5e683e',
      ploughed: '#524232',
      stubble: '#94845a',
      meadow: '#6a7244',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const rd = roadD(x, z);
        if (rd < 6) return [0x8a8070, smoothstep(6, 3.5, rd) * 0.8];                          // the chaussée
        const t = town(x, z);
        if (t > 0) return [0x8a8274, t * 0.4];                                                 // the market and the yards
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => river.project(x, z).d < river.halfWidth + r;

    // ---- Wischau: houses along the chaussée and round the market, the church, the bishops' château and its park wall
    const rr = mulberry32(1805_1128);
    const taken: number[][] = [];
    for (let i = 0; i < 40; i++) {
      const z = P.F.z + 10 + (rr() * 2 - 1) * 62, side = rr() < 0.5 ? -1 : 1, off = 13 + rr() * 50;
      const x = roadX(z) + side * off;
      if (town(x, z) < 0.5 || nearWater(x, z, 14) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13) || Math.hypot(x - P.F.x, z - P.F.z) < 16) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: off < 30 ? 0 : Math.PI / 2, width: 7 + rr() * 3, depth: 8, storeys: rr() < 0.55 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(1805_281);
    props.church({ x: roadX(40) - 30, z: 40, yaw: Math.PI / 2 });
    props.hall({ x: roadX(-10) + 52, z: -6, yaw: Math.PI / 2, width: 26, depth: 12, height: 8, color: 0xd0c4a8, roof: 0x5a4a40, door: 5, name: 'château' });
    for (const [dx, dz, yaw, length] of [[72, -6, Math.PI / 2, 30], [56, 14, 0, 26], [56, -26, 0, 22]] as const) props.wall({ x: roadX(-10) + dx, z: dz, yaw, length, height: 2 });
    // the mill by the ford above the town; the post house at Rausnitz, the Allied bivouac village at Pustomersch
    props.house({ x: -150, z: 46, yaw: 0.4, width: 9, depth: 7 });
    props.house({ x: roadX(BASE_Z - 50) + 16, z: BASE_Z - 50, yaw: 0, width: 12, depth: 7 });
    buildVillage(props, { x: P.A.x + 60, z: P.A.z + 20 }, 1805_282);
    buildVillage(props, { x: P.K.x - 60, z: P.K.z - 20 }, 1805_283);
    for (const p of POINTS) if (!p.owner && p.id !== 'F') buildVillage(props, p, 18052 + Math.round(p.x * 3 + p.z * 7));
    props.church({ x: P.I.x - 28, z: P.I.z - 22, yaw: 0 });

    // ---- farms, field walls and hay over the plain
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.3 || nearWater(x, z, 22) || town(x, z) > 0 || roadD(x, z) < 22) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => nearWater(x, z, 1.5) || town(x, z) > 0.3 || roadD(x, z) < 6 }];
    // the chaussée's avenue, the Drahan forest, willows and alders on the Hanna
    const avenue = (x, z) => { const d = roadD(x, z); return d > 7 && d < 10 && ((z + 1000) % 13) < 3 ? 1 : 0; };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 5200, broadleaf: 0.6, autumn: 1, forest: (x, z) => Math.max(nearWater(x, z, 10) ? 0.45 : woods(x, z) * 0.95, avenue(x, z)) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1400, lane: 0 }); // few hedges: open Hanna plain
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: this.fields });

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
