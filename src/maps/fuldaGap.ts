// Fulda Gap, autumn 1985: rolling Hessian farmland on both sides of the inner-German border,
// three sectors side by side — west (Rasdorf / Geisa), centre (Point Alpha) and east
// (Grüsselbach / Buttlar) — split by broken wooded ridges, spurs and Kuppen with open ground
// between them, so a battle can run on several axes at once and flanking means real distance. Each control point is a village with
// houses to fight from. The border runs east–west through the middle (z = 0): a ploughed control
// strip, a fence blown open at each sector's crossing, a US observation post and an East German
// watchtower. NATO holds the south (+z), the Warsaw Pact attacks from the north. Not a mirror:
// the Hessian side has the broad Rasdorfer Berg over its west sector, the Thuringian side the
// steeper Rockenstuhl cone by Geisa and a long rise behind Borsch; no ridge runs the map's length,
// each bends and ends where its own ground says (RISES below). Fair by value instead: each side
// has a wooded ridge between each pair of sectors, an overwatch hill per sector, the same height
// in front of its base, and its villages at the same few hundred metres.
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
// The Rhön foreland is no row of walls: short ridges that bend, break and end, spurs at an angle,
// lone basalt Kuppen and brook valleys that wander. Each rise is a path (one point: a lone hill),
// its half-width, height and whether it carries wood. Each half its own ground, paired by value:
// the Hessian half has the long west ridge, the spur toward the broad open Rasdorfer Berg and the
// hooked ridge over Grüsselbach's brook; the Thuringian half the curving ridge east of Geisa, the
// wooded Rockenstuhl cone, the diagonal ridge toward Wenigentaft above the Ulster and the long
// rise behind Borsch.
type Rise = { p: number[][]; w: number; a: number; wood?: boolean };
const RISES: Rise[] = [
  // Hessian side (+z)
  { p: [[-222, 545], [-176, 452], [-196, 368], [-150, 296]], w: 24, a: 12, wood: true },   // west ridge, ends above Mackenzell's saddle
  { p: [[-55, 268], [-118, 226], [-168, 140]], w: 18, a: 8, wood: true },                   // spur off it, running down toward the border
  { p: [[-292, 150]], w: 56, a: 7 },                                                         // the Rasdorfer Berg: broad, open top
  { p: [[118, 515], [150, 450], [176, 408]], w: 20, a: 10, wood: true },                    // stub north-east of Hünfeld
  { p: [[232, 350], [204, 262], [146, 190], [158, 112]], w: 22, a: 11, wood: true },         // hooked ridge over Grüsselbach
  { p: [[52, 140]], w: 30, a: 4.6 },                                                         // low rise by Mackenzell
  { p: [[392, 118]], w: 38, a: 5.4 },                                                        // the hill over Grüsselbach
  { p: [[-410, 300]], w: 22, a: 6, wood: true },                                             // a Kuppe west of Rasdorf
  { p: [[300, 470]], w: 26, a: 5, wood: true },                                              // a Kuppe behind Grüsselbach
  { p: [[-64, 392]], w: 18, a: 5, wood: true },                                              // and one west of Hünfeld
  { p: [[6, 10]], w: 24, a: 2 },                                                             // the knoll at Point Alpha
  // Thuringian side (-z)
  { p: [[-104, -58], [-170, -128], [-150, -232], [-196, -318]], w: 22, a: 11, wood: true }, // the ridge east of Geisa, curving
  { p: [[-218, -405], [-282, -470], [-246, -548]], w: 20, a: 9, wood: true },               // its broken-off end, bent north-west
  { p: [[-372, -100]], w: 28, a: 10, wood: true },                                           // the Rockenstuhl: steep wooded cone
  { p: [[96, -306], [168, -222], [232, -138], [246, -46]], w: 22, a: 11, wood: true },      // diagonal ridge toward Wenigentaft
  { p: [[172, -540], [140, -446]], w: 18, a: 9, wood: true },                                // stub by Vacha
  { p: [[-90, -142], [10, -112]], w: 30, a: 4.4 },                                           // the long open rise behind Borsch
  { p: [[318, -168]], w: 34, a: 5.6 },                                                       // the knoll over Wenigentaft
  { p: [[-330, -420]], w: 34, a: 4 },                                                        // a low hill behind Geisa
  { p: [[420, -300]], w: 22, a: 6, wood: true },                                             // a Kuppe east of Buttlar
  { p: [[-112, -418]], w: 18, a: 5, wood: true },                                            // and one west of Vacha
];
// brook valleys, wandering: Hünfeld's brook on the Hessian side, the Ulster past Buttlar on the other
const VALLEYS = [
  [[92, 570], [74, 440], [108, 340], [62, 262], [86, 150]],
  [[228, -570], [276, -456], [246, -330], [292, -228], [270, -118]],
];

/** Distance from (x, z) to a path, and how far along it the nearest point lies (0..1). */
function along(x, z, p) {
  if (p.length === 1) return [Math.hypot(x - p[0][0], z - p[0][1]), 0.5];
  let best = Infinity, at = 0, run = 0, total = 0;
  for (let i = 1; i < p.length; i++) total += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  for (let i = 1; i < p.length; i++) {
    const [ax, az] = p[i - 1], dx = p[i][0] - ax, dz = p[i][1] - az, L = Math.hypot(dx, dz);
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L * L)));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; at = (run + t * L) / total; }
    run += L;
  }
  return [best, at];
}

/** How much of rise `r` stands at (x, z), 0..1: tapering to its ends, the crest dipping here and there. */
function rise(x, z, r) {
  const [d, t] = along(x, z, r.p);
  if (d > r.w * 3) return 0;
  const ends = r.p.length === 1 ? 1 : smoothstep(0, 0.2, t) * smoothstep(1, 0.8, t);
  return Math.exp(-(d * d) / (r.w * r.w)) * ends * (0.82 + 0.3 * noise(x * 0.011 + 3, z * 0.011));
}

/** Wood strength 0..1 at (x, z): the wooded ridges and Kuppen. */
function ridge(x, z) {
  let k = 0;
  for (const r of RISES) if (r.wood) k = Math.max(k, rise(x, z, r));
  return k * smoothstep(560, 500, Math.abs(z));
}

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.0045, z * 0.0045, 5) * 6;           // rolling farmland (broad swells: long views across a sector)
  h += fbm(noise, x * 0.045 + 100, z * 0.045, 3) * 0.7;        // furrows and bumps
  h += Math.exp(-(z * z) / 1200) * Math.max(0.4, 1.8 + 2.4 * noise(x * 0.011, 9.1)); // the border rise, coming and going
  for (const r of RISES) h += rise(x, z, r) * r.a;
  for (const v of VALLEYS) { const [d] = along(x, z, v); h -= 3.5 * Math.exp(-(d * d) / (30 * 30)); }
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
      strip: '#4a3d30', border: true, // (the control strip along z = 0, 1985 only: world/Terrain.js)
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
    const gaps = [[-37, -13], [-SECTOR_X - 12, -SECTOR_X + 12], [SECTOR_X - 12, SECTOR_X + 12], [-171, -159], [179, 191]]; // (and between the sectors)
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
