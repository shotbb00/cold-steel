// Stecken (Štoky) near Iglau, 5 December 1805: three days after Austerlitz, Archduke Ferdinand came south from
// Deutschbrod over the Bohemian-Moravian highlands with some 9,000 Austrians against Wrede’s Bavarians, who held
// Iglau for Napoleon. Wrede met him at Stecken on the imperial road, fought him in the snow among the spruce woods
// and the fishponds of the highland, and fell back on Iglau in good order; the armistice ended it. The Bavarians come
// from Iglau (+z here), the Austrians from Deutschbrod (−z); the imperial road runs from base to base through
// Stecken in the middle, rolling snowy ground either side, spruce woods on the rises and the fishponds in the
// hollows, each with its dam and the lane over it. Fair, not mirrored: Stecken lies halfway; the Dobronín pond south
// of Dobronín on the east is traded for the Studénky pond north of Studénky on the west, the Hybrálec pond on the
// Bavarian west for the Věžnice pond on the Austrian east; the Pávov rise before Iglau for the Smilov rise before
// Deutschbrod; each half the same area of wood. No `climate`: the snow is the theme’s, as Eylau’s.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import { evenThreshold } from './greatWarHelpers.ts';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 470;
const noise = createNoise2D(1805_125);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** The imperial road Iglau–Deutschbrod: x along it at z. */
const roadX = (z) => 22 * Math.sin(z * 0.004 + 0.3) + 8 * Math.sin(z * 0.015);

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Iglau road', x: Math.round(roadX(450)), z: 450, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Hybrálec', x: -380, z: 320, owner: null, sector: 'west' },
  { id: 'C', name: 'Pávov', x: Math.round(roadX(240)) + 20, z: 240, owner: null, sector: 'centre' },
  { id: 'D', name: 'Kosov', x: 300, z: 280, owner: null, sector: 'east' },
  { id: 'E', name: 'Studénky', x: -300, z: -30, owner: null, sector: 'west' },
  { id: 'F', name: 'Stecken', x: Math.round(roadX(10)), z: 10, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Dobronín', x: 350, z: 30, owner: null, sector: 'east' },
  { id: 'H', name: 'Šlapanov', x: -370, z: -330, owner: null, sector: 'west' },
  { id: 'I', name: 'Smilov', x: Math.round(roadX(-260)) - 20, z: -260, owner: null, sector: 'centre' },
  { id: 'J', name: 'Věžnice', x: 360, z: -270, owner: null, sector: 'east' },
  { id: 'K', name: 'Deutschbrod road', x: Math.round(roadX(-450)), z: -450, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the fishponds in the hollows (each its own shape), with a dam and the lane over it
const PONDS = [
  [[250, 70, 14], [300, 92, 30], [360, 88, 34], [410, 70, 18]],          // the Dobronín pond, south of the village
  [[-420, -96, 16], [-360, -84, 34], [-300, -100, 28], [-250, -88, 14]], // the Studénky pond, north of the village
  [[-330, 200, 12], [-280, 186, 24], [-220, 196, 18]],                   // the Hybrálec pond
  [[230, -170, 14], [290, -188, 24], [340, -180, 12]],                   // the Věžnice pond
];
const river = createRiver({
  paths: PONDS,
  halfWidth: 20,
  level: 0,
  depth: 1.8,
  valley: 44, // (more than halfWidth + 6: world/River.js carve’s floodplain ramp)
  crossings: [
    { name: 'Dobronín dam', x: 300, z: 92, kind: 'bridge', width: 6, channel: 0 },
    { name: 'Studénky dam', x: -330, z: -92, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Hybrálec dam', x: -280, z: 186, kind: 'bridge', width: 5, channel: 2 },
    { name: 'Věžnice dam', x: 290, z: -188, kind: 'bridge', width: 5, channel: 3 },
  ],
});
const nearWater = (x, z, r) => { const I = river.project(x, z); return I.d < I.hw + r; };

function height(x, z) {
  let h = fbm(noise, x * 0.003, z * 0.003, 3) * 7 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.5 + 12;
  h += hill(x, z, P.C.x - 120, P.C.z + 10, 130, 8) + hill(x, z, P.I.x + 140, P.I.z - 20, 140, 10); // the Pávov and Smilov rises
  h += hill(x, z, -170, 120, 110, 7) + hill(x, z, 180, -110, 110, 7);                                 // a wooded knoll each side of the road
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 22 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) h += (h * 0.7 + 3.5 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (12 - h) * smoothstep(30, 16, Math.hypot(x - roadX(bz), z - bz));
  const r = smoothstep(8, 4, Math.abs(x - roadX(z)));
  h += (h * 0.94 + 0.6 - h) * r;                                                                     // (the road on a low embankment, smoothed)
  return river.carve(x, z, Math.max(2, h));
}

/** The spruce woods (0..1), each half the same area, out of the villages, the road and the ponds. */
const wood0 = (x, z) => fbm(noise, x * 0.0065 - 17, z * 0.0065 + 4, 3);
const isNato = (x, z) => z > 0;
const T_NATO = 0.08;
const T_PACT = evenThreshold(wood0, T_NATO, isNato);
const woods = gridCache((x, z) => {
  let k = smoothstep(0, 0.12, wood0(x, z) - (isNato(x, z) ? T_NATO : T_PACT));
  for (const p of POINTS) k = Math.min(k, smoothstep(32, 60, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(20, 40, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, smoothstep(9, 16, Math.abs(x - roadX(z))));
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1. Kompanie' }];

export default {
  id: 'stecken',
  armies: { nato: ['by', 'fr'], pact: ['au', 'ru'] }, // (Wrede’s Bavarians against Archduke Ferdinand — Austria has no units yet: Russia fights for her)
  name: 'Stecken',
  description: 'The Bohemian-Moravian highlands, 5 December 1805: the imperial road from Deutschbrod to Iglau through Stecken, snow on the rolling fields, spruce woods on the rises and fishponds in the hollows.',
  epochs: ['1806'],
  region: 'europe',
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180512,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_125, cell: 72, weights: [0.3, 0.3, 0.2, 0.2] }),

  theme: {
    // a grey December day on the highland: snow on the fields, low cloud, the spruce black against it
    fogColor: 0xc8ccd0,
    fogDensity: 0.0021,
    skyTop: 0x8c949e,
    skyHorizon: 0xcdd1d4,
    skyBottom: 0x9a9ea2,
    sunColor: 0xe2e6ea,
    sunIntensity: 1.1,
    sunDisk: 0,
    clouds: 1,
    cloudLight: 0xcdd0d4,
    cloudDark: 0x848a90,
    sunDir: [0.35, 0.45, 0.7],
    hemiSky: 0xd0d6dc,
    hemiGround: 0x94989c,
    hemiIntensity: 1.5,
    rimColor: 0xc6ced6,
    rimIntensity: 0.2,
    terrain: {
      grass: '#e8ecee',
      grassAlt: '#dfe3e5',
      dryGrass: '#d4d2cc',
      dirt: '#9a948a',
      rock: '#b4b6b4',
      pasture: '#e6e9ea',
      ploughed: '#cecbc2',
      stubble: '#dad6cc',
      meadow: '#eef0f1',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [], // (the imperial road is this map’s own)
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const r = smoothstep(6, 3.5, Math.abs(x - roadX(z)));
        if (r > 0.05) return [0x8c867c, r * 0.75];                                               // the imperial road, trodden to slush
        const I = river.project(x, z);
        if (I.d < I.hw + 10) return [0xb8bcb8, smoothstep(I.hw + 10, I.hw, I.d) * 0.6];          // reeds and frozen mud round the ponds
        const f = woods(x, z);
        return f > 0.5 ? [0xc4c8c4, (f - 0.5) * 0.9] : null;                                       // less snow under the spruce
      },
    },
  },

  bases: { nato: { x: P.A.x, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: P.K.x, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, x: P.A.x, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: P.K.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];

    // ---- Stecken: the church and the post house on the road, houses along it
    props.rand = mulberry32(1805_1205);
    props.church({ x: P.F.x + 34, z: P.F.z + 16, yaw: 0 });
    props.hall({ x: roadX(-36) - 20, z: -36, yaw: 0, width: 18, depth: 9, height: 6, color: 0xd8d0bc, roof: 0x6a4030, door: 4, name: 'post house' });
    taken.push([P.F.x + 34, P.F.z + 16], [roadX(-36) - 20, -36]);
    const rr = mulberry32(1805_12);
    for (const [q, n] of [[P.F, 12], [P.C, 5], [P.I, 5]] as const) {
      for (let i = 0, k = 0; i < n * 3 && k < n; i++) {
        const z = q.z + (rr() - 0.5) * 140, side = rr() < 0.5 ? -1 : 1, x = roadX(z) + side * (16 + rr() * 26);
        if (Math.hypot(x - q.x, z - q.z) < 20 || nearWater(x, z, 8) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14)) continue;
        taken.push([x, z]);
        props.rand = mulberry32(Math.floor(rr() * 1e9));
        props.house({ x, z, yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2, width: 8 + rr() * 2, depth: 6 });
        k++;
      }
    }
    // ---- the villages by their ponds; a fish-keeper’s house on each dam’s end
    for (const p of POINTS) if (!p.owner && 'BDEGHJ'.includes(p.id)) buildVillage(props, p, 18052 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1805_1206);
    for (const c of river.crossings) {
      const e = river.at(c, 0, (river.halfWidth + 14) * (c.z > 0 ? 1 : -1)), q = river.at(c, 12, (river.halfWidth + 18) * (c.z > 0 ? 1 : -1));
      props.house({ x: q.x, z: q.z, yaw: 0, width: 7, depth: 5 });
      taken.push([q.x, q.z], [e.x, e.z]);
    }
    props.church({ x: P.G.x - 24, z: P.G.z - 22, yaw: Math.PI / 2 });
    props.church({ x: P.E.x + 26, z: P.E.z + 22, yaw: -Math.PI / 2 });
    taken.push([P.G.x - 24, P.G.z - 22], [P.E.x + 26, P.E.z + 22]);

    // ---- farms, field walls and hay out on the snowy fields; wood stacks at the woods’ edges
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'farm', 'hay'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 64 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 80);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x - P.A.x, z - BASE_Z) < 60 || Math.hypot(x - P.K.x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.2 || nearWater(x, z, 20) || Math.abs(x - roadX(z)) < 20 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (let i = 0, n = 0; i < 4000 && n < 24; i++) {
      const x = (rand() * 2 - 1) * 470, z = (rand() * 2 - 1) * 520, w = woods(x, z);
      if (w < 0.05 || w > 0.4 || nearPoint(x, z, 40) || nearWater(x, z, 10) || Math.abs(x - roadX(z)) < 14) continue;
      props.logPile({ x, z, yaw: rand() * 3, length: 6 + rand() * 3 });
      taken.push([x, z]);
      n++;
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: P.A.x, z: BASE_Z, r: 30 }, { x: P.K.x, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 16 })), { test: (x, z) => nearWater(x, z, 2) || Math.abs(x - roadX(z)) < 7 }];
    // the highland’s spruce and fir, a few bare birches; a lane of trees along the imperial road
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 6000, broadleaf: 0.15, autumn: 1, forest: (x, z) => Math.max(woods(x, z) * 0.97, smoothstep(14, 11, Math.abs(x - roadX(z))) * smoothstep(8, 10, Math.abs(x - roadX(z))) * 0.35) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.6, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
