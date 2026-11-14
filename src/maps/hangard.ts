// Hangard, Picardy, spring 1918: the rolling chalk downs east of Amiens, where the German spring
// offensive was stopped short of the city — Hangard wood and village changed hands again and again in
// April, and in August the Allied tanks broke through here at the start of the Hundred Days. Open
// fields of young wheat over pale chalk, a few woods, villages of brick farms. 1918 only (`epochs`).
// (Step 1 of 1918: the open ground. Trenches, wire and craters come with step 2.)
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1918);

/** Copses: a few woods scattered over the plateau (0..1), the same on both halves. */
const copse = (x, z) => {
  const [ax, az] = z < 0 || (z === 0 && x < 0) ? [-x, -z] : [x, z]; // (point-mirrored)
  return smoothstep(0.42, 0.62, fbm(noise, ax * 0.006 + 40, az * 0.006 - 12, 3));
};

function height(x, z) {
  const [ax, az] = z < 0 ? [-x, -z] : [x, z];                                     // point-mirrored ground
  let h = fbm(noise, ax * 0.0022, az * 0.0022, 3) * 3.5 + fbm(noise, ax * 0.02 + 7, az * 0.02, 3) * 0.4; // gentle swells: a few folds of dead ground, most of the field in view
  h += smoothstep(390, 560, Math.abs(z)) * 9;                                     // the downs rising toward Amiens / toward the Luce
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 34;               // wooded hills framing the field
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 30;
  for (const p of POINTS) h += (2 + fbm(noise, p.x * 0.01, p.z * 0.01, 2) * 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6; // villages on level ground
  return h;
}

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Cachy', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Gentelles', x: -300, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Hangard Wood', x: 0, z: 310, owner: null, sector: 'centre' },
  { id: 'D', name: 'Villers-Bretonneux', x: 300, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Domart', x: -320, z: 20, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Hangard', x: 0, z: 0, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Marcelcave', x: 320, z: -20, owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Démuin', x: -300, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Aubercourt', x: 0, z: -310, owner: null, sector: 'centre' },
  { id: 'J', name: 'Ignaucourt', x: 300, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Cayeux', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'hangard',
  name: 'Hangard',
  description: 'The chalk downs east of Amiens, spring 1918: open wheat fields round Hangard, a few woods, villages of brick farms. Long sight lines — machine guns rule the open ground.',
  epochs: ['1918'],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1918,
  height,
  fields: createFields({ seed: 1918, cell: 84, weights: [0.3, 0.3, 0.1, 0.3] }), // spring: young wheat, pasture, ploughland on chalk

  theme: {
    // a grey spring morning over Picardy
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
      ploughed: '#7a7262',  // (the chalk shows through the furrows)
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    // the villages at the points; Hangard with its church
    for (const p of POINTS) {
      if (p.z < 0 || (p.z === 0 && p.x > 0)) continue;   // the mirror builds the other half
      const seed = 19180 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      if (p.x !== 0 || p.z !== 0) buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }
    props.rand = mulberry32(24041918);
    props.church({ x: 6, z: -26, yaw: 0 });

    // farms, field walls and haystacks over the downs
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 46 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30);
      const z = 20 + rand() * (bounds.z - 80);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;  // far apart: open ground between
      if (Math.hypot(x, z - BASE_Z) < 50 || nearPoint(x, z, 50) || copse(x, z) > 0.3) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }

    // each army's rear behind its base: tents and stores
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 9, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 }))];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1100, forest: (x, z) => copse(x, z) * 0.9 });
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
