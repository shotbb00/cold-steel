// Jena, 14 October 1806: the plateau above the Saale where Napoleon's army climbed the Landgrafenberg
// in the night and fought the Prussians across open fields round Vierzehnheiligen. The battles of
// 1806 were fought like this: long sight lines over stubble and pasture, a few copses and sunken
// lanes, villages of stone farms and walled gardens as strongpoints. Three times the playable
// ground of the other maps (1.0 × 1.12 km: what a phone's pathfinding grid can hold), on a gently
// rolling plateau with heights at both ends — the Landgrafenberg behind the French (+z) and the
// rise at Kapellendorf behind the Prussians (−z). Not mirrored but fair, ground traded like for like:
// the steep Landgrafenberg against the broad Kapellendorf rise, the bare Dornberg before the Prussians
// against the wooded rise of the Isserstedt forest before the French, the Closewitz wood on the French
// right against the Romstedt woods on the Prussian left, the Mühltal hollow by Cospeda against the
// hollow below Großromstedt; every village the same walk from the nearer base as its counterpart.
// 1806 only (`epochs`: maps/index.js mapsFor).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1806);

const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the named woods: the Closewitz wood (French right), the Isserstedt forest (on its rise before the French
// left), the Romstedt woods behind Kleinromstedt and the copse by Krippendorf (the Prussian flanks)
const WOODS = [[310, 420, 95, 50, 0.5], [-215, 25, 105, 55, -0.3], [-300, -440, 85, 60, 0.2], [-120, -360, 45, 30, 1.1], [400, -70, 55, 40, 1.2]];

/** Copses: the named woods and a few small ones scattered over the plateau (0..1). */
const copse = (x, z) => {
  let k = smoothstep(0.5, 0.66, fbm(noise, x * 0.006 + 40, z * 0.006 - 12, 3)) * 0.8;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z))); // (the villages in clearings)
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.0022, z * 0.0022, 3) * 4.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.5; // gentle swells: a few folds of dead ground, most of the field in view
  h += smoothstep(410, 540, z) * 16 * (0.75 + 0.25 * Math.tanh((x - 60) / 220)); // the Landgrafenberg: steep, narrow, over the French camp
  h += smoothstep(400, 600, -z) * 16 * (0.8 + 0.2 * Math.tanh((-x - 120) / 260)); // the Kapellendorf rise: broad and gentle
  h += hill(x, z, 160, -70, 70, 5.5);                                             // the Dornberg, bare, before the Prussian centre
  h += hill(x, z, -215, 45, 95, 5);                                               // the Isserstedt forest's rise before the French left
  h -= 2.6 * Math.exp(-(((x + 330 + (z - 330) * 0.35) / 34) ** 2)) * smoothstep(160, 260, z) * smoothstep(520, 420, z); // the Mühltal hollow by Cospeda
  h -= 2.6 * Math.exp(-(((z + 250 - (x - 330) * 0.3) / 32) ** 2)) * smoothstep(220, 300, x) * smoothstep(490, 400, x); // the hollow below Großromstedt
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 34;               // wooded hills framing the field
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 30;
  for (const p of POINTS) h += (h * 0.5 + 1 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6; // villages on level ground
  return h;
}

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Landgrafenberg', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Cospeda', x: -360, z: 345, owner: null, sector: 'west' },
  { id: 'C', name: 'Lützeroda', x: -70, z: 265, owner: null, sector: 'centre' },
  { id: 'D', name: 'Closewitz', x: 230, z: 350, owner: null, sector: 'east' },
  { id: 'E', name: 'Isserstedt', x: -300, z: 90, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Vierzehnheiligen', x: 25, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Krippendorf', x: 290, z: -110, owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Kleinromstedt', x: -190, z: -360, owner: null, sector: 'west' },
  { id: 'I', name: 'Hohlstedt', x: 40, z: -245, owner: null, sector: 'centre' },
  { id: 'J', name: 'Großromstedt', x: 400, z: -330, owner: null, sector: 'east' },
  { id: 'K', name: 'Kapellendorf', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Company' }];

export default {
  id: 'jena',
  armies: { nato: ['fr'], pact: ['pr', 'sx'] }, // (Napoleon against Hohenlohe's Prussians and Saxons)
  name: 'Jena',
  description: 'The plateau above Jena, October 1806: open fields round Vierzehnheiligen, a few copses, villages of stone farms. Three times the room of the other maps, and long sight lines — lines, columns and cavalry have space to move.',
  epochs: ['1806'],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1806,
  height,
  woods: (x, z) => copse(x, z) * 0.8,
  fields: createFields({ seed: 1806, cell: 84, weights: [0.36, 0.12, 0.36, 0.16] }), // October: stubble and pasture, little ploughed yet

  theme: {
    // an October morning, the fog lifting (lighter fog than the other maps: the long view)
    fogColor: 0xa8aca8,
    fogDensity: 0.0014,
    skyTop: 0x76808a,
    skyHorizon: 0xc2c2b8,
    skyBottom: 0x72746c,
    sunColor: 0xeee4cc,
    sunIntensity: 1.75,
    sunDisk: 0.14,
    clouds: 0.65,
    cloudLight: 0xcfd0ca,
    cloudDark: 0x7e8388,
    sunDir: [-0.4, 0.5, -0.75],
    hemiSky: 0xc8cfd4,
    hemiGround: 0x4c4636,
    hemiIntensity: 1.25,
    rimColor: 0xbcc4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a623c',
      grassAlt: '#4e5836',
      dryGrass: '#8a7a52',
      dirt: '#56463a',
      rock: '#6c6a62',
      strip: '#4c3f30',
      pasture: '#58633c',
      ploughed: '#4e3e2f',
      stubble: '#90804f',
      meadow: '#6c7240',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],   // the lanes from village to village
      roadZ: BOUNDS.z - 20,
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    // the villages at the points; Vierzehnheiligen with its church
    for (const p of POINTS) if (!p.owner) buildVillage(props, p, 18060 + Math.round(p.x * 3 + p.z * 7)); // each its own
    buildVillage(props, { x: P.F.x + 30, z: P.F.z + 28 }, 1806_9);                 // (Vierzehnheiligen is a bigger village)
    props.rand = mulberry32(14101806);
    props.church({ x: P.F.x + 6, z: P.F.z - 26, yaw: 0 });
    // Kapellendorf's moated castle behind the Prussian base: its curtain wall
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; props.wall({ x: -70 + Math.cos(a) * 16, z: -520 + Math.sin(a) * 16, yaw: a + Math.PI / 2, length: 15, height: 2.2 }); }

    // farms, field walls and haystacks over the plateau — no wrecks, no roadblocks in 1806
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 92 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30);
      const z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;  // far apart: open ground between
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 50) || copse(x, z) > 0.3) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    // each army's camp behind its base: tents and stores
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 9, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 }))];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, forest: (x, z) => copse(x, z) * 0.9 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2600, lane: 0 }); // few hedges: open fields
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
