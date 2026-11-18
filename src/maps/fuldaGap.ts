// Fulda Gap, autumn 1985: rolling Hessian farmland on both sides of the inner-German border,
// three sectors side by side — west (Rasdorf / Geisa), centre (Point Alpha) and east
// (Grüsselbach / Buttlar) — split by wooded ridges with passable saddles, so a battle can run on
// several axes at once and flanking means real distance. Each control point is a village with
// houses to fight from. The border runs east–west through the middle (z = 0): a ploughed control
// strip, a fence blown open at each sector's crossing, a US observation post and an East German
// watchtower. NATO holds the south (+z), the Warsaw Pact attacks from the north. Not a mirror:
// the Hessian side has the broad Rasdorfer Berg over its west sector, the Thuringian side the
// steeper Rockenstuhl cone by Geisa and a long rise behind Borsch; the ridges wander and their
// saddles lie at other depths on each side. Fair by value instead: each side has an overwatch
// hill per sector, a saddle through each ridge, and its villages at the same few hundred metres.
//
// A map is plain data plus hooks:
//   id, name, description, size (terrain edge, m), segments, bounds {x, z} (playable half-extents),
//   theme (Environment + terrain palette), height(x, z), fields, bases {faction: {x, z}},
//   cameraStart {faction: {x, z}}, spawns {faction: [{unit, x, z, facing, name}]},
//   points [{id, name, x, z, radius, owner, sector}] (control points for Frontline mode),
//   decorate({ scene, terrain, cover, rand, bounds }) → { update(dt, t), buildings } | null
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

// The big field (2026-11: 1.0 × 1.12 km playable, like Jena): the old layout spread outward, the
// villages ~300 m apart instead of ~150.
const BASE_Z = 500;
const SECTOR_X = 330;   // west / east sector axes at x = ∓330
const noise = createNoise2D(1985);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// the wooded ridges between the sectors: each wanders on its own line, its saddles at its own depths
const RIDGES = [
  { x: (z) => -168 + 22 * Math.sin(z * 0.0055 + 0.9), saddles: [300, 0, -235] },
  { x: (z) => 176 + 24 * Math.sin(z * 0.0048 - 0.4) + 9 * Math.sin(z * 0.013), saddles: [245, 0, -325] },
];
const RIDGE_X = RIDGES.map((r) => r.x(0)); // where they cross the border

/** Ridge strength 0..1 at (x, z): the wooded spines between sectors, with saddles to cross. */
function ridge(x, z) {
  let k = 0;
  for (const r of RIDGES) {
    const spine = Math.exp(-((x - r.x(z)) ** 2) / (20 * 20));
    const saddle = 1 - 0.8 * r.saddles.reduce((a, sz) => a + Math.exp(-((z - sz) ** 2) / (sz === 0 ? 1200 : 1600)), 0);
    k = Math.max(k, spine * Math.max(0, saddle));
  }
  return k * smoothstep(520, 460, Math.abs(z));
}

// overwatch for each sector on each side, each side its own: the Hessian half has the broad
// Rasdorfer Berg in the west, a low rise by Mackenzell and the hill over Grüsselbach; the
// Thuringian half the steep Rockenstuhl cone by Geisa, the long rise behind Borsch and the knoll
// over Wenigentaft. Paired by value (height × spread), not by shape.
const HILLS = [
  [-290, 150, 52, 5.6], [45, 150, 30, 4.6], [360, 95, 40, 5.4], [-225, 395, 32, 4], [265, 365, 26, 4.2],
  [-372, -100, 28, 7], [-40, -128, 44, 4], [300, -150, 36, 5.6], [-285, -395, 36, 3.8], [205, -380, 26, 4.4],
];

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.0045, z * 0.0045, 5) * 6;           // rolling farmland (broad swells: long views across a sector)
  h += fbm(noise, x * 0.045 + 100, z * 0.045, 3) * 0.7;        // furrows and bumps
  h += Math.exp(-(z * z) / 1200) * (2.5 + 1.5 * noise(x * 0.02, 9.1)); // the border rise
  h += ridge(x, z) * (11 + 4 * noise(x * 0.03 + 7, z * 0.03));        // sector ridges
  for (const [cx, cz, r, a] of HILLS) h += hill(x, z, cx, cz, r, a);
  h += smoothstep(500, 620, ax) * (16 + ridged(noise, x * 0.012 + 31, z * 0.012, 4) * 26); // wooded hills at the edges
  h += smoothstep(560, 680, az) * 20;
  for (const bz of [BASE_Z, -BASE_Z]) {
    const k = smoothstep(28, 15, Math.hypot(x, z - bz)); // flatten the base areas
    h += (1.2 - h) * k;
  }
  return h;
}

// Each side opens with a single rifle squad at its home village: the battle starts as a land
// grab (development phase) and the armies are bought from command points.
const natoLayout = [
  { unit: 'rifles', x: 0, z: 454, name: '1st Platoon' },
];
// The full combined-arms deployment across the three sectors (kept for a later mode).
export const natoFullLayout = [
  { unit: 'rifles', x: -338, z: 389, name: '1st Platoon' },
  { unit: 'mgTeam', x: -297, z: 400, name: 'Weapons West' },
  { unit: 'atTeam', x: -371, z: 414, name: 'AT West' },
  { unit: 'scouts', x: -330, z: 331, name: 'Scouts West' },
  { unit: 'rifles', x: -30, z: 389, name: '2nd Platoon' },
  { unit: 'rifles', x: 36, z: 397, name: '3rd Platoon' },
  { unit: 'tank', x: 0, z: 430, name: 'Tank Platoon' },
  { unit: 'mortar', x: -16, z: 463, name: 'Mortars' },
  { unit: 'aa', x: 33, z: 483, name: 'Flak' },
  { unit: 'rifles', x: 338, z: 389, name: '4th Platoon' },
  { unit: 'ifv', x: 314, z: 422, name: 'Bradleys' },
  { unit: 'atTeam', x: 371, z: 410, name: 'AT East' },
];
const pactName = {
  '1st Platoon': '1-ya Rota', 'Weapons West': 'PK Team West', 'AT West': 'RPG Group West', 'Scouts West': 'Razvedka',
  '2nd Platoon': '2-ya Rota', '3rd Platoon': '3-ya Rota', 'Tank Platoon': 'Tank Vzvod', Mortars: 'Minomety', Flak: 'Shilki',
  '4th Platoon': '4-ya Rota', Bradleys: 'BMP Vzvod', 'AT East': 'RPG Group East',
};

// Villages: A/K home, B–D and H–J each side's forward villages, E–G on the border. Each where it
// fits its own ground, at matching distances from the two bases (tools/map_fairness.py).
const points: ControlPointDef[] = [
  { id: 'A', name: 'Hünfeld', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Rasdorf', x: -330, z: 355, owner: null, sector: 'west' },
  { id: 'C', name: 'Mackenzell', x: 25, z: 220, owner: null, sector: 'centre' },
  { id: 'D', name: 'Grüsselbach', x: 345, z: 265, owner: null, sector: 'east' },
  { id: 'E', name: 'Setzelbach', x: -305, z: 62, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Point Alpha', x: -25, z: 0, owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Wenigentaft', x: 360, z: -60, owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Geisa', x: -325, z: -262, owner: null, sector: 'west' },
  { id: 'I', name: 'Borsch', x: -45, z: -205, owner: null, sector: 'centre' },
  { id: 'J', name: 'Buttlar', x: 300, z: -340, owner: null, sector: 'east' },
  { id: 'K', name: 'Vacha', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'fulda-gap',
  armies: { 1945: { nato: ['us'], pact: ['wh', 'fj'] } }, // (spring 1945 in Hesse and Thuringia: the US Army against the Wehrmacht and the last Fallschirmjäger — maps/index.js armiesOn)
  name: 'Fulda Gap',
  description: 'Three sectors of autumn farmland either side of the inner-German border, split by wooded ridges: villages to hold, Point Alpha in the middle.',
  ww2: { description: 'Three sectors of farmland in the hills between Hesse and Thuringia, split by wooded ridges: villages to hold, the Rasdorfer Berg in the middle.', points: { F: 'Rasdorfer Berg' } }, // (no border or Point Alpha yet: maps/index.js forEpoch)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1985,
  height,
  fields: createFields({ seed: 1985, cell: 72 }), // farmland patchwork (terrain + vegetation)

  theme: {
    // overcast autumn afternoon
    fogColor: 0x9a9e9c,
    fogDensity: 0.0021,
    skyTop: 0x6c7378,
    skyHorizon: 0xb4b5ae,
    skyBottom: 0x6f706a,
    sunColor: 0xe8e0cc,
    sunIntensity: 1.7,
    sunDisk: 0.12,
    clouds: 0.8,
    cloudLight: 0xc9cac4,
    cloudDark: 0x7a7f83,
    sunDir: [-0.45, 0.55, -0.7],
    hemiSky: 0xc4ccd2,
    hemiGround: 0x4a4434,
    hemiIntensity: 1.25,
    rimColor: 0xb8c0c8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#56603a',
      grassAlt: '#4a5634',
      dryGrass: '#857650',
      dirt: '#54443a',
      rock: '#6a6862',
      strip: '#4a3d30',
      pasture: '#55613a',
      ploughed: '#4b3c2e',
      stubble: '#8c7c4e',
      meadow: '#6a703e',
      farmX: [520, 600],   // farmland gives way to the wooded edge hills
      farmZ: [580, 660],
      roads: [-SECTOR_X, 0, SECTOR_X], // a dirt track up each sector
      roadZ: 540,
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SECTOR_X, 0, SECTOR_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SECTOR_X, 0, SECTOR_X] } },
  maxStacks: 26,          // per side: enough for a battle in every sector
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })), // face north (-z)
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: pactName[s.name] ?? s.name })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    // Villages at the control points, each its own layout.
    for (const p of points) buildVillage(props, p, 7000 + Math.round(p.x * 3 + p.z * 7), 1);

    // Battlefield cover sites: as many on each half, each half laid out on its own.
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'roadblock', 'rocks', 'wrecks', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (const side of [1, -1]) {
      let n = 0;
      for (let tries = 0; n < 150 && tries < 9000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 20);
        const z = side * (14 + rand() * (bounds.z - 60));
        if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 28 * 28)) continue;
        if (Math.hypot(x, z - side * BASE_Z) < 40 || nearPoint(x, z, 30) || ridge(x, z) > 0.4) continue;
        if (Math.abs(z) < 20 && [-25, -SECTOR_X, SECTOR_X].some((cx) => Math.abs(x - cx) < 14)) continue; // keep the crossings open
        sites.push({ x, z, kind: kinds[n++ % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
      }
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    // The border: fence breached at each sector's crossing, the US OP and the East German
    // tower at Point Alpha, roadblocks and tank obstacles at the crossings.
    props.rand = mulberry32(303);
    const gaps = [[-37, -13], [-SECTOR_X - 12, -SECTOR_X + 12], [SECTOR_X - 12, SECTOR_X + 12], ...RIDGE_X.map((rx) => [rx - 6, rx + 6])];
    props.fence({ x0: -bounds.x - 30, x1: bounds.x + 30, z: -1.5, breaches: gaps });
    props.tower({ x: 2, z: 11, concrete: false });   // the US observation post, on the knoll
    props.tower({ x: -58, z: -12, concrete: true });  // the East German tower, back from the strip
    for (const cx of [-25, -SECTOR_X, SECTOR_X]) {
      props.jersey({ x: cx - 14 + props.rand() * 4, z: 6, yaw: 0.1, length: 6 });                // the Western barrier
      for (const [hx, hz] of [[-7, -6], [0, -8], [7, -6], [-3, -11]]) props.hedgehog({ x: cx + hx + props.rand() * 2, z: hz }); // the Eastern tank obstacles
    }

    // Command posts.
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 }))];
    // woods on the ridges between sectors, open farmland elsewhere
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2800, forest: (x, z) => (ridge(x, z) > 0.35 ? 0.85 : 0) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 13000, lane: 0 }); // (hedge country: thinner than before over three times the ground)
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3, fields: this.fields });

    return {
      buildings: props.buildings, // systems/Buildings.js: garrison and collapse
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
