// The Tagliamento, 16 March 1797 (and again in November 1805, when Masséna followed Archduke Charles over it): the
// river comes down out of the Alps into the Friulian plain as a bed of white gravel a mile wide, braided into
// shallow fast arms round banks and willow islands. Bonaparte drew up his divisions before Valvasone on the right
// bank, let the Austrians on the far side stand to arms all morning, then sent them over at noon in line and column,
// wading the arms to the waist under the Archduke’s guns, the cavalry splashing through on the flanks, and drove them
// off the left bank towards Codroipo. The French hold the right bank (+z: the road to Casarsa), the Austrians the
// left (−z: the road to Codroipo); the bed runs across the middle, open gravel with two arms to wade (shallow: anyone
// may cross anywhere, slowly) and the island between them; a low terrace bank on each side.
// Fair, not mirrored: the castle and walled village of Valvasone on its rise over the right bank is traded for
// Dignano on its rise over the left, each as far from its base; San Martino and Arzene for Rivis and Turrida; a
// gravel bank at the water’s edge for each side, at opposite ends of the bed; the island in the middle is no one’s.
// The plain rises gently to the north (−x) on both banks, toward the Alps; the low rise by San Martino answers
// Dignano’s place higher up that slope. The river’s bends are its own.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const BED = 118;                                                     // m from the bed's middle to the terrace bank
const noise = createNoise2D(1797_0316);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
const mid = (x) => 20 * Math.sin(x * 0.004 + 1) + 10 * Math.sin(x * 0.011) - 5;
const armN = (x) => mid(x) + 50 + 8 * Math.sin(x * 0.017 + 0.4);
const armS = (x) => mid(x) - 52 - 7 * Math.sin(x * 0.014 + 2.1);
const bed = (x, z) => Math.abs(z - mid(x));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Casarsa road', x: 0, z: 425, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'San Martino', x: -350, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Arzene', x: -75, z: 255, owner: null, sector: 'centre' },
  { id: 'D', name: 'Valvasone', x: 255, z: 285, owner: null, sector: 'east', radius: 26 },
  { id: 'E', name: 'San Martino gravel', x: -280, z: Math.round(mid(-280) + BED - 30), owner: null, sector: 'west' },
  { id: 'F', name: 'The island', x: 0, z: Math.round(mid(0)), owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Rivis gravel', x: 360, z: Math.round(mid(360) - BED + 30), owner: null, sector: 'east' },
  { id: 'H', name: 'Dignano', x: -230, z: -300, owner: null, sector: 'west', radius: 26 },
  { id: 'I', name: 'Turrida', x: 150, z: -215, owner: null, sector: 'centre' },
  { id: 'J', name: 'Rivis', x: 340, z: -345, owner: null, sector: 'east' },
  { id: 'K', name: 'Codroipo road', x: 0, z: -425, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the two arms, shallow and fast over the gravel: waded anywhere (depth under the water’s `deep`), no bridge for miles
const river = createRiver({ path: armN, paths: [armN, armS], halfWidth: 11, level: 0, depth: 0.75, valley: 26 });
const away = (x, z) => Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x)));

/** The woods (0..1): willow scrub on the gravel banks and the island, a few copses and the mulberry rows on the plain. */
const woods = (x, z) => {
  const b = bed(x, z);
  let k = smoothstep(0.56, 0.7, fbm(noise, x * 0.006 + 13, z * 0.006 - 2, 3)) * 0.6 * smoothstep(BED, BED + 20, b);
  k = Math.max(k, smoothstep(0.05, 0.35, fbm(noise, x * 0.015 - 7, z * 0.015 + 3, 2)) * 0.4 * smoothstep(BED - 6, BED - 30, b) * smoothstep(16, 26, away(x, z))); // (willows on the gravel)
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  const b = bed(x, z);
  let h = fbm(noise, x * 0.003, z * 0.003, 3) * 2.2 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.3 + 5.5;   // the plain
  h += 4.5 * (0.5 - x / 1000);                                                                               // the plain rising gently north to the Alps (−x)
  h += hill(x, z, P.D.x + 20, P.D.z - 30, 90, 5) + hill(x, z, P.H.x - 15, P.H.z + 35, 90, 4) + hill(x, z, P.B.x + 10, P.B.z - 40, 90, 2); // Valvasone’s rise; Dignano’s; the rise by San Martino (the plain is higher on the west)
  h += hill(x, z, -150, 330, 110, 2.5) + hill(x, z, 170, -330, 110, 2.5);                                     // (a swell behind each)
  const gravel = 1.15 + fbm(noise, x * 0.025, z * 0.025, 2) * 0.35 + 0.5 * smoothstep(30, 0, Math.hypot(x - P.F.x, (z - P.F.z) * 1.6)); // the bed: banks and bars, the island’s hump
  h += (gravel - h) * (1 - smoothstep(BED - 14, BED + 2, b));                                               // the terrace bank
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 14 * smoothstep(BED, BED + 40, b) + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 18;
  for (const p of POINTS) if (!'EFG'.includes(p.id)) h += (h * 0.6 + 2.4 - h) * smoothstep(42, 20, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (5.5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'tagliamento',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Bonaparte, then Masséna, against Archduke Charles; the Austrians have no units yet: the Russians stand in)
  name: 'Tagliamento',
  description: 'Friuli, 16 March 1797 and November 1805: the Tagliamento’s white gravel bed a mile wide, shallow arms waded under fire round the willow island, Valvasone’s castle over the right bank and Dignano on its rise over the left.',
  epochs: ['1806'],
  region: 'italy',
  conditions: { time: 'day', weather: 'clear' }, // (a bright cold March noon; the crossing went in at midday)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 179703,
  height,
  river,
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1797_16, cell: 70, weights: [0.3, 0.4, 0.1, 0.2] }), // (March: ploughland, the magredi’s thin pasture)

  theme: {
    // a clear March day in Friuli, the snow on the Carnic Alps far off, the light hard and cold
    fogColor: 0xc4ccd4,
    fogDensity: 0.001,
    skyTop: 0x4e7eb8,
    skyHorizon: 0xd2dce4,
    skyBottom: 0x8a8c80,
    sunColor: 0xfff4e2,
    sunIntensity: 2.0,
    sunDisk: 0.5,
    clouds: 0.25,
    cloudLight: 0xf4f4f2,
    cloudDark: 0xa4aab2,
    sunDir: [0.3, 0.5, 0.7],
    hemiSky: 0xccd8e4,
    hemiGround: 0x5a5640,
    hemiIntensity: 1.25,
    rimColor: 0xdce4ec,
    rimIntensity: 0.25,
    terrain: {
      grass: '#66703e',
      grassAlt: '#5c683a',
      dryGrass: '#96905c',
      dirt: '#6a5c44',
      rock: '#a8a294',
      strip: '#54483a',
      pasture: '#6a7240',
      ploughed: '#5e4a34',
      stubble: '#a09660',
      meadow: '#6e7842',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const b = bed(x, z);
        if (b < BED - 4) return [0xbcb6a8, 0.85 * smoothstep(BED - 4, BED - 14, b)];               // the white gravel
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];

    // ---- Valvasone: the castle of the counts, its walled village and church; Dignano: the church on its rise and the houses round it
    const C = { x: P.D.x + 40, z: P.D.z + 10 }, g0 = terrain.heightAt(C.x, C.z), STONE = 0xb4a68a;
    for (const [dx, dz, yaw] of [[0, -12, 0], [0, 12, 0], [-12, 0, Math.PI / 2], [12, 0, Math.PI / 2]] as const) {
      props.box('stone', C.x + dx, g0 + 2.5, C.z + dz, 26, 6, 3.5, yaw, STONE);
      props.cover.addBox({ x: C.x + dx, z: C.z + dz, yaw, length: 26, thickness: 3.5, height: 5.5 });
    }
    props.box('stone', C.x + 12, g0 + 6.5, C.z - 12, 6.5, 15, 6.5, 0, STONE);
    props.cover.addBox({ x: C.x + 12, z: C.z - 12, yaw: 0, length: 6.5, thickness: 6.5, height: 13 });
    taken.push([C.x, C.z]);
    for (const [q, seed, wall] of [[P.D, 1797_41, true], [P.H, 1797_42, false]] as const) {
      const rr = mulberry32(seed);
      for (let i = 0; i < 26; i++) {
        const a = rr() * Math.PI * 2, d = 24 + rr() * 34, x = q.x + Math.cos(a) * d, z = q.z + Math.sin(a) * d * 0.8;
        if (taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < (tx === C.x ? 28 : 13)) || bed(x, z) < BED + 15) continue;
        taken.push([x, z]);
        props.rand = mulberry32(Math.floor(rr() * 1e9));
        props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + rr() * 2, depth: 8, storeys: rr() < 0.4 ? 2 : 1, damaged: 0 });
      }
      props.rand = mulberry32(seed + 7);
      props.church({ x: q.x - 6, z: q.z + (q.z > 0 ? 34 : -34), yaw: 0 });
      taken.push([q.x - 6, q.z + (q.z > 0 ? 34 : -34)]);
      if (wall) for (const [dx, dz, yaw, length] of [[0, -64, 0, 60], [-66, 0, Math.PI / 2, 60], [0, 64, 0, 60]] as const) props.wall({ x: q.x + dx, z: q.z + dz, yaw, length, height: 2.2, thickness: 1 }); // (Valvasone’s walls, gates open)
    }
    for (const p of POINTS) if ('BCIJ'.includes(p.id)) buildVillage(props, p, 17973 + Math.round(p.x * 3 + p.z * 7));

    // ---- farms, walls and hay on the plain
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 100);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 70 || Math.hypot(x, z + BASE_Z) < 70 || nearPoint(x, z, 60) || woods(x, z) > 0.25 || bed(x, z) < BED + 25 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    // ---- the gravel: boulders and driftwood on the bars
    const rg = mulberry32(1797_99);
    for (let i = 0; i < 90; i++) {
      const x = (rg() * 2 - 1) * 480, z = mid(x) + (rg() * 2 - 1) * (BED - 18);
      if (away(x, z) < 15 || nearPoint(x, z, 20)) continue;
      if (rg() < 0.6) props.boulder({ x, z, radius: 0.5 + rg() * 0.9 });
      else props.logPile({ x, z, yaw: rg() * Math.PI, length: 4 + rg() * 4 });
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd0ccbc]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      { test: (x, z) => away(x, z) < 13 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3400, broadleaf: 0.85, autumn: 0.35, maxY: 40,
      forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => bed(x, z) < BED + 6 }], count: 2600, lane: 0 }); // (the mulberry rows)
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
