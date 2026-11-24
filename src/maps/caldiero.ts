// Caldiero, 30–31 October 1805: Archduke Charles held an entrenched line across the Verona–Vicenza post road east of
// Verona, from the Adige plain on his left up to the heights of Colognola on his right, the village of Caldiero and
// its redoubts in the middle. Masséna came out of Verona and attacked for two days — on the plain along the river,
// up the post road at the village, and into the vineyards under Colognola — and could not break the line; Charles
// drew off east in the night of the 31st to march to Vienna. The French come from the west (+z here: Vago, the road
// from Verona), the Austrians hold the east (−z: Villanova, the road to Vicenza). The foothills of the Lessini rise
// along the north (−x) the whole length of the field, cut by the Illasi valley; the Adige runs down the south (+x)
// edge in its willows; the post road runs down the middle through Caldiero.
// Fair, not mirrored: the Austrian redoubts on the Colognola heights and on Monte Rocca by the village are traded for
// Masséna’s battery in its epaulement on the San Pietro heights and the walled churchyard at Mambrotta, each as far
// from its own base; the Colognola heights for the San Pietro heights, as high; Lavagno under the hills for the
// Illasi valley’s mouth, Strà on the plain for Gombion by the river. The foothills and the Adige run the length of
// the field — the same slope and the same river for both. Caldiero itself, in the middle, is no one’s.
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
const noise = createNoise2D(1805_1030);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Vago', x: 0, z: 425, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Lavagno', x: -355, z: 320, owner: null, sector: 'west' },
  { id: 'C', name: 'San Pietro heights', x: -135, z: 225, owner: null, sector: 'centre' },
  { id: 'D', name: 'Mambrotta', x: 225, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Illasi valley', x: -330, z: 30, owner: null, sector: 'west' },
  { id: 'F', name: 'Caldiero', x: 25, z: -25, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Strà', x: 315, z: 10, owner: null, sector: 'east' },
  { id: 'H', name: 'Colognola heights', x: -195, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Monte Rocca', x: 150, z: -225, owner: null, sector: 'centre' },
  { id: 'J', name: 'Gombion', x: 370, z: -345, owner: null, sector: 'east' },
  { id: 'K', name: 'Villanova', x: 0, z: -425, owner: 'pact', sector: 'centre', radius: 26 },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Adige down the south edge, broad and grey in its willows (no one crosses it here)
const river = createRiver({
  paths: [[[478, 700], [462, 380], [470, 120], [455, -160], [468, -420], [460, -700]]],
  halfWidth: 20,
  level: 0,
  depth: 2.8,
  valley: 45,
});
// the post road, Verona to Vicenza, down the middle through Caldiero
const roadX = (z) => 18 * Math.sin(z * 0.004 + 0.3) + 8 * Math.sin(z * 0.011) + 12 * Math.exp(-(((z - P.F.z) / 90) ** 2));
const onRoad = (x, z, w = 4) => Math.abs(x - roadX(z)) < w;

// the vineyards on the slopes under the hills: the same number on each half, each from its own seed
const VINES: { x: number; z: number; yaw: number }[] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 1805_71 : 1805_93);
  for (let i = 0, n = 0; i < 4000 && n < 6; i++) {
    const x = -200 - r() * 250, z = s * (90 + r() * 340), yaw = (r() - 0.5) * 0.4;
    if (POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 62) || VINES.some((v) => Math.hypot(v.x - x, v.z - z) < 75)) continue;
    VINES.push({ x, z, yaw }); n++;
  }
}
const vineAt = (x, z, m = 0) => VINES.some((v) => {
  const dx = x - v.x, dz = z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
  return Math.abs(dx * c - dz * s) < 22 + m && Math.abs(dx * s + dz * c) < 16 + m;
});

/** The woods (0..1): chestnut on the upper slopes, copses and mulberry rows on the plain, willows by the Adige. */
const woods = (x, z) => {
  let k = smoothstep(0.54, 0.68, fbm(noise, x * 0.006 + 9, z * 0.006 - 17, 3)) * 0.7;
  k = Math.max(k, smoothstep(-400, -470, x) * smoothstep(-0.2, 0.25, fbm(noise, x * 0.01, z * 0.01 + 30, 2))); // (the chestnut woods up the hills)
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - 300) / 70, (z - 170) / 55)), smoothstep(1.05, 0.8, Math.hypot((x - 270) / 75, (z + 170) / 55))); // (a copse on each half of the plain)
  for (const p of POINTS) k = Math.min(k, smoothstep(32, 56, Math.hypot(x - p.x, z - p.z)));
  if (onRoad(x, z, 10) || vineAt(x, z, 4)) return 0;
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.0026, z * 0.0026, 3) * 4 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.4 + 6;
  const hills = smoothstep(-170, -490, x) * (17 + fbm(noise, x * 0.004 - 3, z * 0.004, 3) * 9); // the Lessini foothills, the whole length
  h += hills * (1 - 0.6 * Math.exp(-(((z - P.E.z) / 75) ** 2)));                                // cut by the Illasi valley
  h += hill(x, z, P.C.x, P.C.z, 95, 11) + hill(x, z, P.C.x - 60, P.C.z + 40, 75, 6);              // the San Pietro heights
  h += hill(x, z, P.H.x, P.H.z, 95, 9) + hill(x, z, P.H.x - 70, P.H.z - 30, 70, 4);               // the Colognola heights
  h += hill(x, z, P.I.x, P.I.z, 60, 5) + hill(x, z, P.D.x + 20, P.D.z - 15, 75, 4);               // Monte Rocca's knoll; the rise at Mambrotta
  h += smoothstep(470, 640, -x) * 40 + smoothstep(520, 660, x) * 10 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 20;
  for (const p of POINTS) if (!'CHI'.includes(p.id)) h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'caldiero',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Masséna’s Army of Italy against Archduke Charles; the Austrians have no units yet: the Russians stand in)
  name: 'Caldiero',
  description: 'Venetia, 30–31 October 1805: Archduke Charles’s entrenched line east of Verona — the redoubts on the Colognola heights and Monte Rocca, the village of Caldiero on the post road, the Adige plain — and Masséna’s attacks out of Verona.',
  epochs: ['1806'],
  region: 'italy',
  conditions: { time: 'day', weather: 'overcast' }, // (late October in the Veneto: grey, the vines turned)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180530,
  height,
  river,
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_31, cell: 66, weights: [0.22, 0.38, 0.25, 0.15] }), // (autumn: ploughland, maize stubble, meadows)

  theme: {
    // a grey autumn day on the Veneto plain, the Alps behind in haze
    fogColor: 0xbcbab0,
    fogDensity: 0.0013,
    skyTop: 0x6e8098,
    skyHorizon: 0xcfd0c8,
    skyBottom: 0x80806c,
    sunColor: 0xffe8c8,
    sunIntensity: 1.6,
    sunDisk: 0.3,
    clouds: 0.65,
    cloudLight: 0xe6e4de,
    cloudDark: 0x8a9098,
    sunDir: [0.4, 0.45, -0.6],
    hemiSky: 0xc8ccd0,
    hemiGround: 0x54503a,
    hemiIntensity: 1.3,
    rimColor: 0xd8d4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5c6a38',
      grassAlt: '#566236',
      dryGrass: '#8e8452',
      dirt: '#5e4e3a',
      rock: '#77736a',
      strip: '#50432f',
      pasture: '#5e6c3a',
      ploughed: '#5a4630',
      stubble: '#a08e56',
      meadow: '#64723e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (onRoad(x, z)) return [0x9a8a68, 0.75];                                               // the post road
        if (vineAt(x, z)) return [0x7a6444, 0.5];                                                 // the vineyards’ worked soil
        for (const q of [P.H, P.I, P.C]) if (Math.hypot(x - q.x, z - q.z) < 36) return [0x6a5a40, 0.5]; // (the works’ dug earth)
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearWater = (x, z, r) => river.project(x, z).d < river.halfWidth + r;
    const taken: number[][] = [];

    // ---- Caldiero: houses along the post road, the church, the baths’ hall; Villanova and Vago at the two ends of the road
    const street = (c, n, spread, seed, d0 = 14) => {
      const rr = mulberry32(seed);
      for (let i = 0; i < n * 4 && n > 0; i++) {
        const z = c.z + (rr() * 2 - 1) * spread, side = rr() < 0.5 ? -1 : 1, x = roadX(z) + side * (d0 + rr() * 26);
        if (onRoad(x, z, 9) || Math.hypot(x, z - BASE_Z) < 38 || Math.hypot(x, z + BASE_Z) < 38 || nearPoint(x, z, 12) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14)) continue;
        taken.push([x, z]); n--;
        props.rand = mulberry32(Math.floor(rr() * 1e9));
        props.townHouse({ x, z, yaw: Math.PI / 2, width: 7 + rr() * 3, depth: 8, storeys: rr() < 0.5 ? 2 : 1, damaged: 0 });
      }
    };
    street(P.F, 14, 70, 1805_301);
    street(P.K, 12, 60, 1805_302, 40);
    street(P.A, 8, 55, 1805_303, 40);
    props.rand = mulberry32(30101805);
    props.church({ x: roadX(P.F.z + 30) - 24, z: P.F.z + 30, yaw: Math.PI / 2 });
    props.church({ x: roadX(P.K.z - 30) + 28, z: P.K.z - 30, yaw: Math.PI / 2 });
    props.hall({ x: P.F.x + 55, z: P.F.z - 40, yaw: 0.2, width: 16, depth: 9, height: 5, color: 0xc8b898, roof: 0x8a4a32, door: 4, name: 'the baths' }); // (the Roman baths of Caldiero)
    taken.push([roadX(P.F.z + 30) - 24, P.F.z + 30], [roadX(P.K.z - 30) + 28, P.K.z - 30], [P.F.x + 55, P.F.z - 40]);

    // ---- the Austrian redoubts on the Colognola heights and Monte Rocca, open at the back; Masséna’s battery on the San Pietro heights; Mambrotta’s churchyard
    props.rand = mulberry32(1805_61);
    for (const q of [P.H, P.I]) {
      for (const [dx, dz, yaw, length] of [[0, 20, 0, 34], [-17, 4, Math.PI / 2, 26], [17, 4, Math.PI / 2, 26]] as const) props.wall({ x: q.x + dx, z: q.z + dz, yaw, length, height: 1.6 });
      for (const s of [-1, 1]) props.wall({ x: q.x + s * 34, z: q.z + 26, yaw: s * 0.25, length: 16, height: 1.2 }); // (the flèches at the sides)
    }
    for (const [dx, dz, yaw, length] of [[0, -20, 0, 34], [-17, -4, Math.PI / 2, 26], [17, -4, Math.PI / 2, 26]] as const) props.wall({ x: P.C.x + dx, z: P.C.z + dz, yaw, length, height: 1.6 });
    for (const s of [-1, 1]) props.wall({ x: P.C.x + s * 34, z: P.C.z - 26, yaw: -s * 0.25, length: 16, height: 1.2 });
    props.church({ x: P.D.x + 4, z: P.D.z - 30, yaw: Math.PI / 2 });
    for (const [dx, dz, yaw, length] of [[4, -50, 0, 34], [-16, -30, Math.PI / 2, 36], [24, -30, Math.PI / 2, 36]] as const) props.wall({ x: P.D.x + dx, z: P.D.z + dz, yaw, length, height: 1.6 });
    taken.push([P.D.x + 4, P.D.z - 30]);
    for (const p of POINTS) if ('BDEGJ'.includes(p.id)) buildVillage(props, p, 18053 + Math.round(p.x * 5 + p.z * 3));

    // ---- the vineyards: low rows of vines on their stakes
    for (const v of VINES) {
      for (let lz = -14; lz <= 14; lz += 3.5) for (let lx = -16; lx <= 16; lx += 10.6) {
        const x = v.x + lx * Math.cos(v.yaw) + lz * Math.sin(v.yaw), z = v.z - lx * Math.sin(v.yaw) + lz * Math.cos(v.yaw);
        props.box('plain', x, terrain.heightAt(x, z) + 0.6, z, 10, 1.2, 0.7, v.yaw, 0x5e5a2a);
      }
    }

    // ---- farms, walls and hay
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 84 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 100);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 70 || Math.hypot(x, z + BASE_Z) < 70 || nearPoint(x, z, 60) || woods(x, z) > 0.25 || nearWater(x, z, 40) || onRoad(x, z, 26) || vineAt(x, z, 14) || x < -420
        || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd0ccbc]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      { test: (x, z) => nearWater(x, z, 1.5) || onRoad(x, z, 5) || vineAt(x, z, 2) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0.85, autumn: 0.6, maxY: 60,
      forest: (x, z) => (nearWater(x, z, 14) ? 0.55 : onRoad(x, z, 8) ? 0.25 : woods(x, z) * 0.95) }); // (willows by the river, the poplars along the road)
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2400, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.4, fields: this.fields });

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
