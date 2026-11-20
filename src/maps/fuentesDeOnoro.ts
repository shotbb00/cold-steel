// Fuentes de Oñoro, 3–5 May 1811: Masséna came to relieve Almeida and found Wellington across his road behind the
// Dos Casas, a brook in a steep rocky ravine with the village of Fuentes de Oñoro on both its banks. On the 3rd
// and again on the 5th the French and the British and Highland light companies fought through its lanes and
// walled gardens, house by house, down to the stream and up to the church on the western slope; on the 5th
// Masséna turned the open plain to the south, by Poço Velho and Nave de Haver, and the Light Division and the
// cavalry fell back across it in squares to the new line. The French come from the east (+z), the allies hold
// the west (−z). Fair, not mirrored: the village sits astride the ravine, half on each bank, with its lanes and
// garden walls; the low ridge behind the British is traded for the rise the French guns stood on, Villar
// Formoso for Alameda, the cork-oak wood on the British side of the plain for the oak copses round Nave de
// Haver; the ravine fades out into the open plain in the east, where either side can cross anywhere and the
// cavalry has room. Its fords and the village street are as far from each base.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1811_05);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Espeja road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Alameda', x: -400, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Masséna’s guns', x: -90, z: 260, owner: null, sector: 'centre' },
  { id: 'D', name: 'Nave de Haver', x: 230, z: 330, owner: null, sector: 'east' },
  { id: 'E', name: 'Dos Casas ford', x: -280, z: 25, owner: null, sector: 'west' },
  { id: 'F', name: 'Fuentes de Oñoro', x: -20, z: 15, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Poço Velho', x: 290, z: -60, owner: null, sector: 'east' },
  { id: 'H', name: 'Villar Formoso', x: -260, z: -310, owner: null, sector: 'west' },
  { id: 'I', name: 'Fuentes ridge', x: 110, z: -240, owner: null, sector: 'centre' },
  { id: 'J', name: 'The cork wood', x: 390, z: -350, owner: null, sector: 'east' },
  { id: 'K', name: 'Côa road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Dos Casas: a steep rocky ravine in the west and through the village, fading into the open plain eastward
const brookZ = (x) => -3 + 24 * Math.sin(x * 0.005 + 2.2) + 7 * Math.sin(x * 0.016);
const deepness = (x) => smoothstep(260, 120, x);                    // 1 in the ravine, 0 out on the plain
const CROSS = [-20, -280, -440, 140];                               // the village street, the ford, Alameda's lane, the track to Poço Velho
const ravine = (x, z) => {
  const ford = Math.max(...CROSS.map((c) => smoothstep(18, 7, Math.abs(x - c))));
  return smoothstep(22, 6, Math.abs(z - brookZ(x))) * (1 - ford * 0.8);
};
/** Cork oaks and holm oaks (0..1): the cork wood on the plain, the copses round Nave de Haver, alders in the ravine. */
const oaks = (x, z) => {
  let k = smoothstep(0.48, 0.62, fbm(noise, x * 0.006 - 31, z * 0.006 + 8, 3)) * 0.7;
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x - P.J.x + 30) / 120, (z - P.J.z - 20) / 85)));         // (the cork wood)
  k = Math.max(k, smoothstep(65, 35, Math.hypot(x - P.D.x - 90, z - P.D.z + 70)) * 0.85, smoothstep(60, 32, Math.hypot(x - P.D.x + 110, z - P.D.z - 40)) * 0.85); // (the copses by Nave de Haver)
  const d = Math.abs(z - brookZ(x));
  if (d > 7 && d < 18 && deepness(x) > 0.5) k = Math.max(k, 0.4);
  k = Math.min(k, smoothstep(90, 120, Math.hypot(x - P.F.x, z - P.F.z)));                 // (none in the village)
  for (const p of POINTS) if (p.id !== 'J') k = Math.min(k, smoothstep(28, 50, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(14, 26, Math.hypot(x - P.J.x, z - P.J.z)));
};
/** 1 in the village, 0 outside it. */
const village = (x, z) => smoothstep(95, 70, Math.hypot(x - P.F.x, (z - P.F.z) * 1.15));

function height(x, z) {
  let h = fbm(noise, x * 0.0028, z * 0.0028, 3) * 4 + fbm(noise, x * 0.03 + 3, z * 0.03, 2) * 0.4 + 6;
  h += 9 * Math.exp(-(((z + 225 - x * 0.05) / 80) ** 2)) * smoothstep(320, 120, x);       // the low ridge behind the village, west of the plain
  h += 9 * Math.exp(-(((z - 255) / 85) ** 2)) * smoothstep(300, 80, x);                  // the rise the French guns stood on
  h += hill(x, z, P.D.x + 20, P.D.z + 40, 110, 6) + hill(x, z, P.J.x - 60, P.J.z - 50, 120, 6); // the swells of the plain, Nave de Haver and behind the cork wood
  h -= ravine(x, z) * (1.6 + deepness(x) * 5.4);                                          // the Dos Casas
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 24 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 20;
  for (const p of POINTS) if (p.id !== 'F' && p.id !== 'E') h += (h * 0.6 + 2.4 - h) * smoothstep(40, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return h;
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'fuentes-de-onoro',
  armies: { nato: ['fr'], pact: ['gb'] }, // (Masséna's Armée de Portugal against Wellington)
  name: 'Fuentes de Oñoro',
  description: 'Spain, May 1811: the village of Fuentes de Oñoro on both banks of the Dos Casas ravine, fought for lane by lane, and the open plain by Poço Velho where the Light Division fell back in squares.',
  epochs: ['1806'],
  region: 'iberia',
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 181105,
  height,
  woods: (x, z) => oaks(x, z) * 0.7,
  fields: createFields({ seed: 1811, cell: 76, weights: [0.35, 0.2, 0.2, 0.25] }), // May: green rye, pasture on the plain

  theme: {
    // a bright May day on the plateau by the Portuguese border: wide sky, a light haze, the grass still green
    fogColor: 0xccd2cc,
    fogDensity: 0.001,
    skyTop: 0x5a8ac2,
    skyHorizon: 0xdae2e2,
    skyBottom: 0x8e9478,
    sunColor: 0xfff2d8,
    sunIntensity: 2.1,
    sunDisk: 0.7,
    clouds: 0.3,
    cloudLight: 0xf6f6f4,
    cloudDark: 0xaab2b8,
    sunDir: [-0.3, 0.7, 0.5],
    hemiSky: 0xd0dce6,
    hemiGround: 0x5e6040,
    hemiIntensity: 1.2,
    rimColor: 0xdfe5ea,
    rimIntensity: 0.25,
    terrain: {
      grass: '#6c7a40',
      grassAlt: '#62703c',
      dryGrass: '#a49a5c',
      dirt: '#7e6648',
      rock: '#8e8a7e',
      strip: '#6c5a3e',
      pasture: '#728040',
      ploughed: '#7a6042',
      stubble: '#a8a066',
      meadow: '#6e8044',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const r = ravine(x, z);
        if (r > 0.4) return [0x8a8676, (r - 0.4) * 1.2 * (0.4 + deepness(x) * 0.6)];         // the granite sides and the stream bed
        const v = village(x, z);
        return v > 0 ? [0x9a8a6c, v * 0.4] : null;                                         // the lanes and yards
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

    // ---- Fuentes de Oñoro: granite houses down both banks to the stream, lanes between, the church up the western slope
    const rr = mulberry32(1811_0503);
    const taken: number[][] = [[P.F.x + 12, P.F.z - 62]];
    props.rand = mulberry32(5051811);
    props.church({ x: P.F.x + 12, z: P.F.z - 62, yaw: 0 });
    for (let i = 0; i < 90; i++) {
      const x = P.F.x + (rr() * 2 - 1) * 85, z = P.F.z + (rr() * 2 - 1) * 72;
      if (village(x, z) < 0.6 || Math.abs(x - P.F.x) < 7 || ravine(x, z) > 0.05 || Math.abs(z - brookZ(x)) < 18 || Math.hypot(x - P.F.x, z - P.F.z) < 16) continue; // (the street down the middle, the stream)
      if (taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      const yaw = rr() < 0.5 ? 0 : Math.PI / 2, w = 7 + rr() * 3;
      if (rr() < 0.25) props.townHouse({ x, z, yaw, width: w, depth: 7, storeys: 2, damaged: 0 }); else props.house({ x, z, yaw, width: w, depth: 6 });
    }
    // the walled gardens and yards between the houses
    for (let i = 0; i < 160; i++) {
      const x = P.F.x + (rr() * 2 - 1) * 100, z = P.F.z + (rr() * 2 - 1) * 90;
      if (village(x, z) < 0.3 || Math.abs(x - P.F.x) < 6 || ravine(x, z) > 0.1 || nearPoint(x, z, 14) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 10)) continue;
      taken.push([x, z, 4]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.wall({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, length: 7 + props.rand() * 7, height: 1.5 });
    }

    // ---- the villages; the mill at the ford; the guns' epaulements on both sides
    for (const p of POINTS) if (!p.owner && 'BDGH'.includes(p.id)) buildVillage(props, p, 18115 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1811_7);
    props.church({ x: P.H.x - 30, z: P.H.z - 18, yaw: Math.PI / 2 });
    props.church({ x: P.B.x + 30, z: P.B.z + 20, yaw: Math.PI / 2 });
    props.house({ x: P.E.x + 22, z: brookZ(P.E.x + 22) + 20, yaw: 0.1, width: 9, depth: 6 });
    taken.push([P.H.x - 30, P.H.z - 18], [P.B.x + 30, P.B.z + 20], [P.E.x + 22, brookZ(P.E.x + 22) + 20]);
    for (const [q, s] of [[P.C, -1], [P.I, 1]] as const) for (let k = -1; k <= 1; k++) props.wall({ x: q.x + k * 15, z: q.z + s * 22, yaw: 0, length: 10, height: 0.9 });

    // ---- farms, stone field walls and hay over the plateau
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 84 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 55) || oaks(x, z) > 0.3 || ravine(x, z) > 0.05 || village(x, z) > 0 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 30)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd8d2c0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...taken.map(([x, z, r]) => ({ x, z, r: r ?? 8 })), { test: (x, z) => village(x, z) > 0.5 || ravine(x, z) > 0.6 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, broadleaf: 0.95, autumn: 0, size: 0.75, forest: (x, z) => oaks(x, z) * 0.9 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1800, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: this.fields });

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
