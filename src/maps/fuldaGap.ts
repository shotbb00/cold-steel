// Fulda Gap, autumn 1985: rolling Hessian farmland on both sides of the inner-German border,
// three sectors side by side — west (Rasdorf / Geisa), centre (Point Alpha) and east
// (Grüsselbach / Buttlar) — split by wooded ridges with passable saddles, so a battle can run on
// several axes at once and flanking means real distance. Each control point is a village with
// houses to fight from. The border runs east–west through the middle (z = 0): a ploughed control
// strip, a fence blown open at each sector's crossing, a US observation post and an East German
// watchtower. NATO holds the south (+z), the Warsaw Pact attacks from the north. Cover is
// point-mirrored so neither side gets the better ground.
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
const ROW_Z = 290;      // the forward villages' row on each side
const SECTOR_X = 330;   // west / east sector axes at x = ∓330
const RIDGE_X = 170;    // wooded ridges between the sectors
const noise = createNoise2D(1985);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** Ridge strength 0..1 at (x, z): the wooded spines between sectors, with saddles to cross. */
function ridge(x, z) {
  const ax = Math.abs(x);
  const spine = Math.exp(-((ax - RIDGE_X) ** 2) / (20 * 20));
  const saddle = 1 - 0.8 * (Math.exp(-((z - ROW_Z) ** 2) / 1600) + Math.exp(-((z + ROW_Z) ** 2) / 1600) + Math.exp(-(z * z) / 1200));
  return spine * Math.max(0, saddle) * smoothstep(520, 460, Math.abs(z));
}

function height(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  let h = fbm(noise, x * 0.0045, z * 0.0045, 5) * 6;           // rolling farmland (broad swells: long views across a sector)
  h += fbm(noise, x * 0.045 + 100, z * 0.045, 3) * 0.7;        // furrows and bumps
  h += Math.exp(-(z * z) / 1200) * (2.5 + 1.5 * noise(x * 0.02, 9.1)); // the border rise
  h += ridge(x, z) * (11 + 4 * noise(x * 0.03 + 7, z * 0.03));        // sector ridges
  // point-mirrored hills: overwatch for each sector on each side
  for (const [cx, cz, r, a] of [[-SECTOR_X, 120, 40, 6], [0, 135, 34, 4.5], [SECTOR_X, 100, 38, 5.5], [-SECTOR_X + 80, 380, 30, 4], [SECTOR_X - 70, 370, 28, 4]]) {
    h += hill(x, z, cx, cz, r, a) + hill(x, z, -cx, -cz, r, a);
  }
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

// Point-mirrored villages: A/K home, B–D and H–J each side's forward villages, E–G on the border.
const points: ControlPointDef[] = [
  { id: 'A', name: 'Hünfeld', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Rasdorf', x: -SECTOR_X, z: ROW_Z, owner: null, sector: 'west' },
  { id: 'C', name: 'Mackenzell', x: 0, z: ROW_Z, owner: null, sector: 'centre' },
  { id: 'D', name: 'Grüsselbach', x: SECTOR_X, z: ROW_Z, owner: null, sector: 'east' },
  { id: 'E', name: 'Setzelbach', x: -SECTOR_X, z: 20, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Point Alpha', x: 0, z: 0, owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Wenigentaft', x: SECTOR_X, z: -20, owner: null, sector: 'east', radius: 22 },
  { id: 'H', name: 'Geisa', x: -SECTOR_X, z: -ROW_Z, owner: null, sector: 'west' },
  { id: 'I', name: 'Borsch', x: 0, z: -ROW_Z, owner: null, sector: 'centre' },
  { id: 'J', name: 'Buttlar', x: SECTOR_X, z: -ROW_Z, owner: null, sector: 'east' },
  { id: 'K', name: 'Vacha', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'fulda-gap',
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

    // Villages at the control points (mirrored pairs share a seed so both sides match).
    for (const p of points) {
      if (p.z < 0 || (p.z === 0 && p.x > 0)) continue; // the mirror builds the northern half
      const seed = 7000 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      if (p.x !== 0 || p.z !== 0) buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }

    // Battlefield cover sites on our half, each mirrored through the centre.
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'roadblock', 'rocks', 'wrecks', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 150 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20);
      const z = 14 + rand() * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 28 * 28)) continue;
      if (Math.hypot(x, z - BASE_Z) < 40 || nearPoint(x, z, 30) || ridge(x, z) > 0.4) continue;
      if (Math.abs(z) < 20 && [0, -SECTOR_X, SECTOR_X].some((cx) => Math.abs(x - cx) < 14)) continue; // keep the crossings open
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }

    // The border: fence breached at each sector's crossing, the US OP and the East German
    // tower at Point Alpha, roadblocks and tank obstacles at the crossings.
    props.rand = mulberry32(303);
    const gaps = [[-12, 12], [-SECTOR_X - 12, -SECTOR_X + 12], [SECTOR_X - 12, SECTOR_X + 12], [-RIDGE_X - 6, -RIDGE_X + 6], [RIDGE_X - 6, RIDGE_X + 6]];
    props.fence({ x0: -bounds.x - 30, x1: bounds.x + 30, z: -1.5, breaches: gaps });
    props.tower({ x: 22, z: 9, concrete: false });
    props.tower({ x: -22, z: -9, concrete: true });
    for (const cx of [0, -SECTOR_X, SECTOR_X]) {
      props.jersey({ x: cx - 14, z: 6, yaw: 0.1, length: 6 });
      props.jersey({ x: -cx + 14, z: -6, yaw: 0.1 + Math.PI, length: 6 });
      for (const [hx, hz] of [[-6, -6], [0, -7], [6, -6]]) {
        props.hedgehog({ x: cx + hx, z: hz });
        props.hedgehog({ x: -cx - hx, z: -hz });
      }
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
