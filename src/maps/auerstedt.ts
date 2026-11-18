// Auerstedt, 14 October 1806: the same morning as Jena, fifteen kilometres north. Davout's corps,
// one against two, came up from the Kösen bridge into the fog and met the Prussian main army at
// Hassenhausen. The village sits on a broad low ridge across the middle of the field; the Lissbach
// hollow runs diagonally through it, the one stretch of dead ground. Hedged lanes and walled
// gardens round the villages, open fields between. The mist is thicker than at Jena but the
// field is as wide (1.0 × 1.12 km). Not mirrored but fair: the Lissbach winds through both halves alike,
// the ridge runs slantwise through Hassenhausen with the village owned by neither, the round Spielberg
// knoll before the French left is traded for the long Sonnenberg spur before the Prussian right, the
// steep Kösen edge for the broad Eckartsberga slope, and each village is as far from the nearer base
// as its counterpart. 1806 only (maps/index.js mapsFor).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(14101806);
const HOLLOW = [Math.cos(0.9), Math.sin(0.9)];   // the Lissbach: NE to SW through the field, winding
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** Copses along the hollow and a few on the flanks (0..1). */
const copse = (x, z) => {
  let k = smoothstep(0.34, 0.54, fbm(noise, x * 0.007 - 21, z * 0.007 + 5, 3) + smoothstep(40, 0, hollowDist(x, z)) * 0.15);
  for (const p of POINTS) k = Math.min(k, smoothstep(28, 50, Math.hypot(x - p.x, z - p.z)));
  return k;
};

/** Distance from the Lissbach's winding bed. */
function hollowDist(x, z) {
  const t = x * HOLLOW[0] + z * HOLLOW[1];
  return Math.abs(x * HOLLOW[1] - z * HOLLOW[0] - 20 - 34 * Math.sin(t * 0.009) - 12 * Math.sin(t * 0.023 + 1));
}
/** The ridge's crest: slantwise through Hassenhausen, a little wavy. */
const ridgeZ = (x) => x * 0.16 + 18 * Math.sin(x * 0.005 + 0.6) - 10;

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 4 + fbm(noise, x * 0.02 + 3, z * 0.02, 3) * 0.5;
  h += 5 * Math.exp(-(((z - ridgeZ(x)) / 210) ** 2));                             // the Hassenhausen ridge
  h -= 4 * Math.exp(-((hollowDist(x, z) / 38) ** 2)) * smoothstep(60, 140, Math.hypot(x, z)); // the Lissbach hollow (shallow at the village ford)
  h += hill(x, z, -230, 110, 65, 4.5);                                            // the Spielberg knoll before the French left
  const su = ((x - 285) * 0.8 + (z + 105) * 0.6) / 40, sv = ((z + 105) * 0.8 - (x - 285) * 0.6) / 120;
  h += 4.5 * Math.exp(-su * su - sv * sv);                                        // the Sonnenberg spur before the Prussian right
  h += smoothstep(420, 545, z) * 11 * (0.8 + 0.2 * Math.tanh((x + 80) / 200));    // the steep edge above Kösen
  h += smoothstep(380, 600, -z) * 11;                                             // the broad slope up to Eckartsberga
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 30;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 26;
  for (const p of POINTS) h += (h * 0.5 + 1.5 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6; // villages on level ground
  return h;
}

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Kösen', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Punschrau', x: -400, z: 200, owner: null, sector: 'west' },
  { id: 'C', name: 'Taugwitz', x: -90, z: 300, owner: null, sector: 'centre' },
  { id: 'D', name: 'Poppel', x: 300, z: 265, owner: null, sector: 'east' },
  { id: 'E', name: 'Spielberg', x: -190, z: 60, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Hassenhausen', x: 0, z: 0, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Sonnendorf', x: 230, z: -60, owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Benndorf', x: -260, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Rehehausen', x: 60, z: -280, owner: null, sector: 'centre' },
  { id: 'J', name: 'Gernstedt', x: 430, z: -185, owner: null, sector: 'east' },
  { id: 'K', name: 'Auerstedt', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Company' }];

export default {
  id: 'auerstedt',
  armies: { nato: ['fr'], pact: ['pr'] }, // (Davout's corps against the Prussian main army)
  name: 'Auerstedt',
  description: 'Hassenhausen, October 1806: a broad ridge across the field, the Lissbach hollow running through it, hedged villages and open fields between, the morning mist still lifting. As wide as Jena; one fold of dead ground to use.',
  epochs: ['1806'],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1410,
  height,
  woods: (x, z) => copse(x, z) * 0.8,
  fields: createFields({ seed: 1410, cell: 76, weights: [0.38, 0.14, 0.32, 0.16] }),

  theme: {
    // the Auerstedt fog, thinning
    fogColor: 0xb2b5b2,
    fogDensity: 0.0019,
    skyTop: 0x868e94,
    skyHorizon: 0xcacac2,
    skyBottom: 0x7c7e76,
    sunColor: 0xf0e6cc,
    sunIntensity: 1.6,
    sunDisk: 0.1,
    clouds: 0.75,
    cloudLight: 0xd6d6d0,
    cloudDark: 0x8a8e92,
    sunDir: [0.5, 0.42, -0.75],
    hemiSky: 0xccd2d6,
    hemiGround: 0x4e4838,
    hemiIntensity: 1.3,
    rimColor: 0xc4ccd2,
    rimIntensity: 0.22,
    terrain: {
      grass: '#5c643e',
      grassAlt: '#505a38',
      dryGrass: '#8c7c54',
      dirt: '#58483a',
      rock: '#6e6c64',
      strip: '#4e4132',
      pasture: '#5a653e',
      ploughed: '#524232',
      stubble: '#928251',
      meadow: '#6e7442',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-330, 0, 330],
      roadZ: BOUNDS.z - 20,
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-330, 0, 330] }, pact: { x: 0, z: -BASE_Z, entries: [-330, 0, 330] } },
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

    for (const p of POINTS) if (!p.owner) buildVillage(props, p, 14100 + Math.round(p.x * 3 + p.z * 7)); // each its own
    buildVillage(props, { x: -34, z: 16 }, 1410_6);                                 // (Hassenhausen: the big village)
    props.rand = mulberry32(1806);
    props.church({ x: -10, z: 32, yaw: Math.PI });

    // walled gardens and farms round the villages, hay in the fields
    const kinds = ['fieldwall', 'farm', 'hay', 'fieldwall', 'hay', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 104 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30);
      const z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 45) || copse(x, z) > 0.3 || hollowDist(x, z) < 20) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 9, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 }))];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1900, forest: (x, z) => copse(x, z) * 0.9 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 4200, lane: 0 }); // more hedged than Jena
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.8, fields: this.fields });

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
