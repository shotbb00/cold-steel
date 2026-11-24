// Saalfeld, 10 October 1806: the first real fight of the Jena campaign. Lannes’s V Corps came down the Gräfenthal
// road out of the Thuringian Forest onto the heights above Saalfeld and found Prince Louis Ferdinand’s Prussians and
// Saxons drawn up below in the Saale valley, the walled town on their left and the river at their back. Suchet’s
// division worked round through the woods onto their flank, the Prussian line went back past Crösten and Wöhlsdorf
// towards the Saale, and the prince, leading a last charge of his hussars, was cut down by a sergeant of the 10th
// Hussars by Wöhlsdorf.
// On the map (the big field, 1.0 × 1.12 km): the French come down from the wooded forest edge (south, +z), the
// Prussians and Saxons hold the valley floor and the rise towards Rudolstadt and the Schwarza (north, −z). The Saale
// runs down the east flank past Saalfeld’s walls and its stone bridge; Graba upstream and Wöhlsdorf downstream each
// have a ford. Garnsdorf and Beulwitz under the heights, Crösten in the middle, Aue am Berg on its rise, Schwarza on
// the west.
// Not mirrored but fair: the Saale runs along the flank, not between the sides, and its two fords are as far from
// either base; Saalfeld, the walled town, lies in the middle of the east flank, owned by neither. The steep wooded forest
// edge behind the French is traded for the broad rise towards Rudolstadt behind the Prussians, the bare Garnsdorf knoll
// before the French left for the Aue rise before the Prussian centre, the Beulwitz wood for the Schwarza copses, and each
// village is as far from the nearer base as its counterpart. 1806 only (`epochs`: maps/index.js mapsFor).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1010_1806);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Gräfenthal road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Unterwirbach', x: -380, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Garnsdorf', x: -60, z: 280, owner: null, sector: 'centre' },
  { id: 'D', name: 'Graba', x: 300, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Beulwitz', x: -290, z: 40, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Crösten', x: 20, z: -35, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Saalfeld', x: 350, z: 10, owner: null, sector: 'east', radius: 28 },
  { id: 'H', name: 'Schwarza', x: -240, z: -320, owner: null, sector: 'west' },
  { id: 'I', name: 'Aue am Berg', x: 60, z: -260, owner: null, sector: 'centre' },
  { id: 'J', name: 'Wöhlsdorf', x: 370, z: -275, owner: null, sector: 'east' },
  { id: 'K', name: 'Rudolstadt road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Saale down the east flank, past the town; the stone bridge at Saalfeld, the fords at Graba and Wöhlsdorf
const river = createRiver({
  path: [[452, -720], [446, -460], [432, -250], [440, -60], [436, 20], [446, 200], [432, 330], [444, 520], [438, 720]],
  halfWidth: 12, level: 0, depth: 2.6, valley: 52,
  crossings: [
    { name: 'Saalfeld bridge', x: 436, z: 10, kind: 'bridge', width: 8 },
    { name: 'Graba ford', x: 434, z: 330, kind: 'ford', width: 10 },
    { name: 'Wöhlsdorf ford', x: 432, z: -275, kind: 'ford', width: 10 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Beulwitz wood (French left), the copse on the Aue rise’s flank, the Schwarza copses (Prussian left), a wood above Graba
const WOODS = [[-400, 150, 80, 45, 0.4], [210, -150, 55, 35, -0.6], [-360, -170, 85, 50, -0.2], [180, 200, 50, 35, 0.9]];
/** The woods (0..1): the forest edge over the French, the named woods, a few copses. */
const woods = (x, z) => {
  let k = smoothstep(0.52, 0.68, fbm(noise, x * 0.006 + 31, z * 0.006 - 7, 3)) * 0.8;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  k = Math.max(k, smoothstep(500, 545, z + fbm(noise, x * 0.01, 3, 2) * 40) * smoothstep(60, 110, Math.abs(x)));  // the Thuringian Forest’s edge (the road down kept open)
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.0022, z * 0.0022, 3) * 4.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.5 + 2;
  h += smoothstep(420, 545, z) * 17 * (0.75 + 0.25 * Math.tanh((-x - 40) / 220));  // the forest edge: steep, over the French
  h += smoothstep(390, 600, -z) * 20 * (0.8 + 0.2 * Math.tanh((x - 80) / 260));   // the broad rise towards Rudolstadt
  h += hill(x, z, -170, 170, 75, 5.5);                                            // the bare Garnsdorf knoll before the French left
  h += hill(x, z, 150, -150, 85, 5);                                              // the Aue rise before the Prussian centre
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, -x) * 34;                        // wooded hills on the west
  h += smoothstep(BOUNDS.x + 10, BOUNDS.x + 120, x) * 26;                         // the steep far bank of the Saale
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 26;
  for (const p of POINTS) h += (h * 0.5 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6; // villages on level ground
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'saalfeld',
  armies: { nato: ['fr'], pact: ['pr', 'sx'] }, // (Lannes against Prince Louis Ferdinand’s Prussians and Saxons)
  name: 'Saalfeld',
  description: 'The Saale valley before Saalfeld, 10 October 1806: the French come down from the wooded edge of the Thuringian Forest onto the Prussians and Saxons on the valley floor; the walled town and the river on the east flank, Crösten and Wöhlsdorf on open fields.',
  epochs: ['1806'],
  region: 'europe',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1010,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1010, cell: 80, weights: [0.36, 0.14, 0.34, 0.16] }), // October: stubble and pasture

  theme: {
    // an October morning, the valley mist thinning off the Saale
    fogColor: 0xaeb2b0,
    fogDensity: 0.0016,
    skyTop: 0x7a848e,
    skyHorizon: 0xc6c6bc,
    skyBottom: 0x74766e,
    sunColor: 0xeee2c8,
    sunIntensity: 1.7,
    sunDisk: 0.12,
    clouds: 0.7,
    cloudLight: 0xd0d2cc,
    cloudDark: 0x80868a,
    sunDir: [0.45, 0.48, 0.7],
    hemiSky: 0xc8cfd4,
    hemiGround: 0x4c4636,
    hemiIntensity: 1.25,
    rimColor: 0xbcc4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#58623a',
      grassAlt: '#4c5634',
      dryGrass: '#887850',
      dirt: '#55463a',
      rock: '#6a6860',
      strip: '#4a3e30',
      pasture: '#56623a',
      ploughed: '#4c3d2e',
      stubble: '#8e7e4e',
      meadow: '#6a7240',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 260],
      roadZ: BOUNDS.z - 20,
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 260] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 260] } },
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
    const bridge = river.crossings[0];

    // ---- Saalfeld: houses inside its walls, the Johanniskirche, the street down to the bridge, the wall with its gates
    const rr = mulberry32(1010_1);
    const taken: number[][] = [];
    for (let i = 0; i < 60 && taken.length < 30; i++) {
      const x = P.G.x - 55 + rr() * 85, z = P.G.z - 60 + rr() * 120;
      if (Math.abs(z - bridge.z) < 7 || Math.abs(x - P.G.x) < 6 || wet(x, z, 14) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue; // (the two streets kept open)
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.6 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(1010_2);
    props.church({ x: P.G.x - 24, z: P.G.z + 30, yaw: Math.PI / 2 });
    for (const [x, z, yaw, length] of [[P.G.x - 68, P.G.z - 40, Math.PI / 2, 34], [P.G.x - 68, P.G.z + 40, Math.PI / 2, 34], [P.G.x - 30, P.G.z - 72, 0, 60], [P.G.x - 30, P.G.z + 72, 0, 60]] as const) {
      props.wall({ x, z, yaw, length, height: 3 });                              // (the town wall; the gates where the streets go through)
    }

    // ---- the villages; farms, field walls and hay over the valley
    for (const p of POINTS) if (!p.owner && p.id !== 'G') buildVillage(props, p, 10106 + Math.round(p.x * 3 + p.z * 7));
    buildVillage(props, { x: P.F.x - 32, z: P.F.z + 24 }, 1010_6);                  // (Crösten: the bigger village)
    props.rand = mulberry32(1010_3);
    props.church({ x: P.F.x + 8, z: P.F.z + 28, yaw: 0 });
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 86 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 50) || woods(x, z) > 0.3 || wet(x, z, 40) || Math.hypot(x - P.G.x, z - P.G.z) < 95) continue;
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
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), { x: P.G.x - 15, z: P.G.z, r: 75 },
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })), { test: (x, z) => wet(x, z, 1.5) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3000, forest: (x, z) => (wet(x, z, 10) ? 0.45 : woods(x, z) * 0.9) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2800, lane: 0 });
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
