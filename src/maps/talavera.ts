// Talavera, 27–28 July 1809: Wellesley's British and Cuesta's Spaniards in a line three miles long from the
// town of Talavera on the Tagus to the Cerro de Medellín, the bare hill at its northern end; the Portiña, a
// summer-dry brook in its gully, ran along the front. Victor took the Medellín in a night attack and lost it
// again; on the 28th the French came on against the hill and the centre all day, from the Cerro de Cascajal
// across the brook, while the hot dry grass burned under the wounded. Olive groves and walled vineyards in
// front of the town. The French come from the east (+z), the allies hold the west (−z). Fair but not mirrored:
// the long bare Medellín against the round bare Cascajal with the high ground behind it, equally high;
// the walled town against the walled farms of Casa de Salinas and its second hamlet and the olive
// groves before the French; the Spanish earthworks against the groves' walls; the Portiña's gully
// winds across the middle, owned by no one, with the Pajar de Vergara redoubt at its centre. (The Tagus runs past the town just south of the field.)
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1809_07);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Alberche road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Casa de Salinas', x: -345, z: 360, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'The olive groves', x: -120, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Cerro de Cascajal', x: 250, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Portiña valley', x: -280, z: 80, owner: null, sector: 'west' },
  { id: 'F', name: 'Pajar de Vergara', x: 0, z: 0, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Portiña crossing', x: 250, z: -115, owner: null, sector: 'east' },
  { id: 'H', name: 'Cerro de Medellín', x: -230, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'The Spanish works', x: 160, z: -255, owner: null, sector: 'centre' },
  { id: 'J', name: 'Talavera', x: 400, z: -340, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'The allied camp', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Portiña: a dry stony gully winding across the middle, shallow enough to cross anywhere, slowly
const brookZ = (x) => 22 * Math.sin(x * 0.006 + 1) + 6 * Math.sin(x * 0.019) - 12;
const gully = (x, z) => smoothstep(16, 5, Math.abs(z - brookZ(x)));
/** 0 on the Cerros' bare tops, 1 off them. */
const bare = (x, z) => smoothstep(50, 90, Math.hypot(x - P.D.x, z - P.D.z)) * smoothstep(0.6, 1, Math.hypot((x - P.H.x + 20) / 70, (z - P.H.z - 20) / 160));
/** The olive groves (0..1): before Casa de Salinas, round the town, and scattered over the plain. */
const olives = (x, z) => {
  let k = smoothstep(0.42, 0.56, fbm(noise, x * 0.006 + 11, z * 0.006 - 7, 3)) * 0.6;
  k = Math.max(k, smoothstep(150, 90, Math.hypot(x - P.C.x, z - P.C.z)) * 0.75, smoothstep(160, 110, Math.hypot(x - P.B.x - 60, z - P.B.z + 60)) * 0.6);
  k = Math.max(k, smoothstep(140, 90, Math.hypot(x - P.J.x + 90, z - P.J.z - 40)) * 0.75, smoothstep(150, 90, Math.hypot(x - 20, z + 330)) * 0.75); // (the groves before the town and behind the Spanish works)
  k *= bare(x, z);                                                        // (the Cerros bare)
  for (const p of POINTS) k = Math.min(k, smoothstep(26, 46, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, 1 - gully(x, z));
};

function height(x, z) {
  let h = fbm(noise, x * 0.003, z * 0.003, 3) * 4 + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.4 + 3;
  h += hill(x, z, P.D.x, P.D.z, 85, 20) + hill(x, z, P.D.x + 70, P.D.z + 60, 90, 8);    // the Cerro de Cascajal, round, the high ground behind it
  const mu = (x - P.H.x + 20) / 75, mv = (z - P.H.z - 20) / 170;
  h += 24 * Math.exp(-mu * mu - mv * mv);                                               // the Cerro de Medellín: a long whaleback, north to south
  h += smoothstep(380, 560, z) * 8 + smoothstep(400, 580, -z) * 7;
  h -= gully(x, z) * 2.6;
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 28 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  for (const p of POINTS) if (p.id !== 'D' && p.id !== 'H' && p.id !== 'F') h += (h * 0.6 + 1.6 - h) * smoothstep(40, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return h;
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'talavera',
  armies: { nato: ['fr'], pact: ['gb'] }, // (Joseph and Victor against Wellesley — Cuesta's Spaniards held the town)
  name: 'Talavera',
  description: 'Spain, July 1809: the bare Cerro de Medellín, the dry Portiña gully along the front, olive groves and walled vineyards before the town of Talavera, in the summer heat.',
  epochs: ['1806'],
  region: 'iberia',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180907,
  height,
  woods: (x, z) => olives(x, z) * 0.5,
  fields: createFields({ seed: 1809, cell: 70, weights: [0.15, 0.1, 0.55, 0.2] }), // July: harvested, burnt dry

  theme: {
    // high summer in New Castile: a white sky at the horizon, heat haze, the ground baked
    fogColor: 0xd8d0bc,
    fogDensity: 0.0011,
    skyTop: 0x5a8cc4,
    skyHorizon: 0xe2dccc,
    skyBottom: 0xa89a7c,
    sunColor: 0xfff0d0,
    sunIntensity: 2.4,
    sunDisk: 0.8,
    clouds: 0.05,
    cloudLight: 0xf8f6f0,
    cloudDark: 0xc0bcb2,
    sunDir: [0.2, 0.85, 0.3],
    hemiSky: 0xd8e0e8,
    hemiGround: 0x7a6844,
    hemiIntensity: 1.2,
    rimColor: 0xeae6dc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#9a8a52',
      grassAlt: '#8c7e4a',
      dryGrass: '#c4ac6c',
      dirt: '#a07e52',
      rock: '#a8987a',
      strip: '#8a6c46',
      pasture: '#a49456',
      ploughed: '#9a7650',
      stubble: '#ccb474',
      meadow: '#948a50',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const g = gully(x, z);
        if (g > 0.3) return [0xb0a080, (g - 0.3) * 1.2];               // the dry bed: stones and pale sand
        const c = 1 - bare(x, z);
        return c > 0 ? [0xb8a070, c * 0.5] : null;                      // the Cerros' bare, burnt tops
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Company' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    // ---- Talavera: flat-roofed houses inside a wall, the church
    const rr = mulberry32(1809_28);
    const taken: number[][] = [];
    for (let i = 0; i < 30; i++) {
      const a = rr() * Math.PI * 2, d = 10 + rr() * 44;
      const x = P.J.x + Math.cos(a) * d, z = P.J.z + Math.sin(a) * d;
      if (Math.abs(x) > BOUNDS.x - 20 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11) || Math.hypot(x - P.J.x, z - P.J.z) < 9) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      const w = 7 + rr() * 3, yaw = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
      if (i % 3) props.flatHouse({ x, z, yaw, width: w, depth: 7 }); else props.house({ x, z, yaw, width: w, depth: 6 });
    }
    props.rand = mulberry32(28071809);
    props.church({ x: P.J.x - 16, z: P.J.z + 18, yaw: Math.PI / 2 });
    // Casa de Salinas and the hamlet beside it: walled farms (a cortijo each), a chapel
    const hamlet2 = { x: P.B.x + 95, z: P.B.z - 70 };
    for (const [q, seed] of [[P.B, 1809_31], [hamlet2, 1809_32]] as const) {
      buildVillage(props, q, seed);
      props.rand = mulberry32(seed + 1);
      [[0, 30, 0, 34], [0, -30, 0, 34], [30, 0, Math.PI / 2, 30], [-30, 0, Math.PI / 2, 30]].forEach(([dx, dz, yaw, length], i) => i !== seed % 4 && props.wall({ x: q.x + dx, z: q.z + dz, yaw, length, height: 1.8, color: 0xa08c6a })); // (the yard wall, open on one side)
      taken.push([q.x, q.z]);
    }
    props.church({ x: P.B.x - 14, z: P.B.z - 12, yaw: 0 });
    // the Spanish works: an earthwork line before the town, cut by the road
    for (let k = -3; k <= 3; k++) if (k) props.wall({ x: P.I.x + k * 13, z: P.I.z + 18 + Math.abs(k) * 2, yaw: 0, length: 11, height: 1.2, color: 0x9a8460 });
    // the Pajar de Vergara: the earthwork redoubt on the brook
    for (const [x, z, yaw] of [[-10, 14, 0], [12, 14, 0], [-22, 4, Math.PI / 2], [22, -4, Math.PI / 2], [10, -14, 0], [-12, -14, 0]] as const) props.wall({ x, z, yaw, length: 12, height: 1.2, color: 0x9a8460 });
    // walled vineyards and olive yards round the town and round Casa de Salinas
    for (const [cx, cz, n] of [[P.J.x - 50, P.J.z + 50, 70], [P.B.x + 50, P.B.z - 40, 80]]) for (let i = 0; i < n; i++) {
      const x = cx - 110 + rr() * 220, z = cz - 110 + rr() * 220;
      if (Math.abs(x) > BOUNDS.x - 20 || nearPoint(x, z, 30) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14) || gully(x, z) > 0) continue;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.wall({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, length: 10 + props.rand() * 8, height: 1.1, color: 0xa08c6a });
    }

    // ---- villages, farms and walls on the plain
    for (const p of POINTS) if (!p.owner && !'BDHJI'.includes(p.id)) buildVillage(props, p, 18097 + Math.round(p.x * 3 + p.z * 7));
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 50) || olives(x, z) > 0.3 || gully(x, z) > 0 || Math.hypot(x - P.J.x, z - P.J.z) < 90 || Math.hypot(x - hamlet2.x, z - hamlet2.z) < 50) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd8d2c0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x, z) => gully(x, z) > 0.4 }];
    // the olives: small, round, grey-green
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2200, broadleaf: 1, autumn: 0.15, size: 0.6, maxY: 60, forest: (x, z) => olives(x, z) * 0.8 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
