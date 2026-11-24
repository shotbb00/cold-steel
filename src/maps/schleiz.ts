// Schleiz, 9 October 1806: the opening clash of the Jena campaign. The Grande Armée came north out of Franconia in
// three columns through the wooded hills of the Frankenwald; Bernadotte’s corps with Murat’s light cavalry, in the
// centre, met Tauentzien’s Prussian–Saxon rearguard at Schleiz. Drouet’s infantry pushed through the Oschitz wood
// and the Prussians fell back out of the little town across the Wisenta, while Murat’s chasseurs and hussars rode
// down their cavalry in the open ground towards Oettersdorf and Pörmitz on the road to Auma.
// On the map (the big field, 1.0 × 1.12 km): the French come over the wooded Frankenwald heights from the Saalburg
// road (south, +z), the Prussians and Saxons hold the rise towards Auma (north, −z). Wooded hills and clearings with
// farm villages, the Wisenta brook winding across the middle through Schleiz in its shallow valley, crossed at the
// town’s bridge and at a few fords.
// Not mirrored but fair: the brook runs between the sides with its crossings at like distances from both bases, and
// Schleiz itself sits astride it, owned by neither. The steep wooded Frankenwald edge behind the French is traded for
// the long Pörmitz heights behind the Prussians, the Oschitz wood before the French centre for the Pörmitz wood before
// the Prussian centre, the Heinrichsruh park on the brook’s near bank for the open slope by Möschlitz on the far one,
// and each village is as far from the nearer base as its counterpart. 1806 only (`epochs`: maps/index.js mapsFor).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(910_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Saalburg road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Gräfenwarth', x: -370, z: 310, owner: null, sector: 'west' },
  { id: 'C', name: 'Oschitz', x: -40, z: 290, owner: null, sector: 'centre' },
  { id: 'D', name: 'Crispendorf', x: 320, z: 270, owner: null, sector: 'east' },
  { id: 'E', name: 'Heinrichsruh', x: -310, z: 90, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Schleiz', x: 30, z: -10, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Möschlitz', x: 290, z: -70, owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Oettersdorf', x: -250, z: -310, owner: null, sector: 'west' },
  { id: 'I', name: 'Pörmitz', x: 60, z: -275, owner: null, sector: 'centre' },
  { id: 'J', name: 'Plothen', x: 360, z: -295, owner: null, sector: 'east' },
  { id: 'K', name: 'Auma road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Wisenta, winding west to east across the middle; its crossings: the town bridge and the fords and mill lanes
const brookZ = (x) => 22 * Math.sin(x * 0.0065 + 1.1) + 9 * Math.sin(x * 0.019) - 4;
const CROSS = [P.F.x, -170, 180, -380, 400];
const brook = (x, z) => {
  const d = Math.abs(z - brookZ(x));
  const ford = Math.max(...CROSS.map((c) => smoothstep(20, 8, Math.abs(x - c))));
  return smoothstep(22, 6, d) * (1 - ford * 0.85);
};

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Oschitz wood (before the French centre), the Pörmitz wood (before the Prussian centre), the Heinrichsruh park,
// the wood above Crispendorf, the Oettersdorf wood
const WOODS = [[-150, 230, 95, 55, 0.3], [220, -180, 100, 55, 0.6], [-345, 135, 55, 35, 0.2], [430, 180, 70, 50, 1.1], [-410, -200, 75, 50, -0.4]];
/** The Frankenwald: many woods, clearings round the villages (0..1). */
const woods = (x, z) => {
  let k = smoothstep(0.42, 0.6, fbm(noise, x * 0.006 + 13, z * 0.006 - 29, 3)) * 0.85;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  k = Math.max(k, smoothstep(490, 540, z + fbm(noise, x * 0.01, 7, 2) * 40) * smoothstep(50, 100, Math.abs(x))); // the Frankenwald edge (the road kept open)
  const d = Math.abs(z - brookZ(x));
  if (d > 8 && d < 18) k = Math.max(k, 0.4);                                         // alders along the brook
  for (const p of POINTS) k = Math.min(k, smoothstep(34, 58, Math.hypot(x - p.x, z - p.z)));
  for (const c of CROSS) k = Math.min(k, smoothstep(12, 26, Math.hypot(x - c, z - brookZ(c))));
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.003, z * 0.003, 3) * 7 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.6 + 3;  // the hills: rounder and higher than Jena’s plateau
  h += smoothstep(400, 545, z) * 18 * (0.75 + 0.25 * Math.tanh((-x - 60) / 220));  // the Frankenwald edge, steep, over the French
  h += smoothstep(370, 600, -z) * 19 * (0.8 + 0.2 * Math.tanh((-x - 60) / 260));  // the long Pörmitz heights towards Auma
  h += hill(x, z, -150, 230, 85, 5);                                              // the Oschitz wood’s hill
  h += hill(x, z, 230, -170, 115, 4.5);                                           // the Pörmitz wood’s hill, broad
  const su = ((x - 330) * 0.93 + (z - 250) * 0.37) / 45, sv = ((z - 250) * 0.93 - (x - 330) * 0.37) / 150;
  h += 4 * Math.exp(-su * su - sv * sv);                                          // the Crispendorf spur, long and narrow, off the Frankenwald
  h += hill(x, z, -330, -130, 120, 3.5);                                          // the low Oettersdorf plateau
  h -= brook(x, z) * 3.5 + 2.5 * Math.exp(-(((z - brookZ(x)) / 70) ** 2));        // the Wisenta’s shallow valley and its bed
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 34;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 30;
  for (const p of POINTS) if (p.id !== 'F') h += (h * 0.6 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.5; // villages on level ground
  return Math.max(0.6, h);
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'schleiz',
  armies: { nato: ['fr'], pact: ['pr', 'sx'] }, // (Murat and Bernadotte against Tauentzien’s Prussians and Saxons)
  name: 'Schleiz',
  description: 'Schleiz, 9 October 1806: the French come through the wooded Frankenwald hills onto Tauentzien’s Prussian–Saxon rearguard; woods and clearings, farm villages, the Wisenta brook winding through the little town.',
  epochs: ['1806'],
  region: 'europe',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 910,
  height,
  woods: (x, z) => woods(x, z) * 0.85,
  fields: createFields({ seed: 910, cell: 70, weights: [0.4, 0.12, 0.3, 0.18] }), // upland pasture, stubble

  theme: {
    // a grey October afternoon in the hills
    fogColor: 0xa4aaa6,
    fogDensity: 0.0017,
    skyTop: 0x727e88,
    skyHorizon: 0xbebfb6,
    skyBottom: 0x6e726a,
    sunColor: 0xeadcc0,
    sunIntensity: 1.6,
    sunDisk: 0.1,
    clouds: 0.8,
    cloudLight: 0xcacdc8,
    cloudDark: 0x7a8086,
    sunDir: [-0.55, 0.4, 0.7],
    hemiSky: 0xc4ccd2,
    hemiGround: 0x4a4434,
    hemiIntensity: 1.25,
    rimColor: 0xb8c0c8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#56603a',
      grassAlt: '#4a5534',
      dryGrass: '#84764e',
      dirt: '#53453a',
      rock: '#68665e',
      strip: '#4a3e30',
      pasture: '#55613a',
      ploughed: '#4c3c2e',
      stubble: '#8a7a4c',
      meadow: '#66703e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const r = brook(x, z);
        if (r > 0.55) return [0x485a3a, (r - 0.55) * 1.6];              // the brook’s wet, reedy bed
        return null;
      },
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

    // ---- Schleiz: houses on both banks along the street over the bridge, the church on the south bank, the castle hall
    const rr = mulberry32(910_1);
    const taken: number[][] = [];
    for (let i = 0; i < 70 && taken.length < 26; i++) {
      const x = P.F.x - 60 + rr() * 120, z = P.F.z - 55 + rr() * 110;
      if (Math.abs(x - P.F.x) < 7 || Math.abs(z - brookZ(x)) < 16 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue; // (the street and the brook kept open)
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(x - P.F.x) < 28 ? Math.PI / 2 : 0, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(910_2);
    props.church({ x: P.F.x + 34, z: P.F.z + 44, yaw: 0 });
    props.hall({ x: P.F.x - 40, z: P.F.z - 48, yaw: 0.1, width: 20, depth: 10, height: 7, color: 0xb0a48c, roof: 0x5a3a2a, door: 4, name: 'castle' }); // (the Reuss castle)

    // ---- the villages; farms, field walls and hay in the clearings
    for (const p of POINTS) if (!p.owner && p.id !== 'F') buildVillage(props, p, 9106 + Math.round(p.x * 3 + p.z * 7));
    for (const [x, z, yaw, length] of [[P.E.x - 20, P.E.z + 30, 0, 40], [P.E.x + 26, P.E.z + 30, 0.05, 30]] as const) props.wall({ x, z, yaw, length, height: 2 }); // (the Heinrichsruh park wall)
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 70 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || Math.abs(z - brookZ(x)) < 30) continue;
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

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), { x: P.F.x, z: P.F.z, r: 65 },
      { test: (x, z) => brook(x, z) > 0.6 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 5500, broadleaf: 0.45, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2400, lane: 0 });
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
