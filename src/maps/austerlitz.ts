// Austerlitz, 2 December 1805: the Battle of the Three Emperors, east of Brünn in Moravia. Napoleon held the
// line of the Goldbach brook and its villages — Telnitz, Sokolnitz, Kobelnitz, Girzikowitz — with his left on
// the fortified Santon hill by the Olmütz road; the Russians and Austrians stood on the Pratzen heights and came
// down off them in the morning fog to turn the French right at Telnitz. When the fog lifted under "the sun of
// Austerlitz" Soult's columns climbed the Pratzen behind them and split the Allied army; its left fell back over
// the frozen Satschan ponds. The French come from the west (+z: the Zuran hill, Napoleon's post), the Allies
// from the east (−z: Krzenowitz, Kutuzov's headquarters); north is −x (the Olmütz road and the Santon), south +x
// (Telnitz and the ponds). Fair, not mirrored, ground traded like for like: the Goldbach and its villages run
// through the middle, each village about as far from both camps; the broad Pratzen plateau before the Allies is
// answered by the steep Santon on the French left and the Turas heights on their right; the frozen Satschan pond
// by Telnitz on the Allied left against the Kobelnitz pond on the French bank; the walled pheasantry at
// Sokolnitz against the Bellowitz copse. Morning fog on frozen, snowless fields. 1806 only (`epochs`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const noise = createNoise2D(1805_12);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
/** 1 inside a tilted ellipse, fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a, wob = 0.12) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.05, 0.85, Math.hypot(u, v) + fbm(noise, x * 0.03, z * 0.03, 2) * wob);
};
/** Distance from (x, z) to a polyline [[x, z], …]. */
const lineDist = (L, x, z) => {
  let d = Infinity;
  for (let i = 0; i < L.length - 1; i++) {
    const [ax, az] = L[i], [bx, bz] = L[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
};

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Zuran hill', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'The Santon', x: -370, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Schlapanitz', x: -90, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Turas heights', x: 320, z: 270, owner: null, sector: 'east' },
  { id: 'E', name: 'Girzikowitz', x: -300, z: 30, owner: null, sector: 'west', radius: 22 },
  { id: 'F', name: 'Kobelnitz', x: -20, z: 10, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Sokolnitz castle', x: 250, z: -50, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Stare Vinohrady', x: -270, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Pratzen', x: 30, z: -250, owner: null, sector: 'centre' },
  { id: 'J', name: 'Telnitz', x: 350, z: -240, owner: null, sector: 'east', radius: 22 },
  { id: 'K', name: 'Krzenowitz', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Goldbach, north (−x) to south, through its villages and on into the Satschan pond
const BROOK = [[-560, 60], [-300, 30], [-150, 38], [-20, 10], [120, -10], [250, -50], [330, -140], [350, -240], [372, -318]];
const CROSS = [[-300, 30], [-20, 10], [250, -50], [350, -240], [-450, 48], [120, -10], [-150, 38], [318, -122]]; // (the four villages' bridges, three fords and a mill dam)
const brook = (x, z) => {
  const d = lineDist(BROOK, x, z);
  if (d > 30) return 0;
  const ford = Math.max(...CROSS.map(([cx, cz]) => smoothstep(22, 9, Math.hypot(x - cx, z - cz))));
  return smoothstep(22, 6, d) * (1 - ford * 0.85);
};
// the frozen ponds: Satschan (the big one, by Telnitz on the Allied left), the little Augezd pond, the Kobelnitz pond on the French bank
const PONDS = [[410, -370, 95, 40, 0.8], [465, -215, 34, 22, 0.3], [-150, 96, 82, 30, 0.08]];
const ice = (x, z) => Math.max(...PONDS.map(([cx, cz, rx, rz, a]) => (Math.abs(x - cx) > rx + 25 || Math.abs(z - cz) > rx + 25 ? 0 : blob(x, z, cx, cz, rx, rz, a))));
// the Olmütz chaussée along the north edge, past the Santon to the Posoritz post
const roadX = (z) => -452 + 12 * Math.sin(z * 0.004);
const onRoad = (x, z) => Math.abs(x - roadX(z)) < 4;

/** Woods (0..1): the walled pheasantry by Sokolnitz, the Bellowitz copse, willows along the brook, a few spinneys. */
const woods = (x, z) => {
  let k = smoothstep(0.52, 0.68, fbm(noise, x * 0.006 + 31, z * 0.006 - 9, 3)) * 0.8;
  k = Math.max(k, blob(x, z, 300, -105, 62, 34, 0.5, 0.2), blob(x, z, -225, 185, 58, 30, -0.2, 0.2));
  const d = lineDist(BROOK, x, z);
  if (d > 9 && d < 18) k = Math.max(k, 0.45);
  k = Math.min(k, 1 - ice(x, z));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 54, Math.hypot(x - p.x, z - p.z)));
  for (const [cx, cz] of CROSS) k = Math.min(k, smoothstep(12, 26, Math.hypot(x - cx, z - cz)));
  return k;
};
const pheasantry = (x, z) => blob(x, z, 300, -105, 62, 34, 0.5, 0);

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4;
  // the Pratzen: a broad plateau running north–south before the Allies, its top by Pratzen village, Stare Vinohrady its north end
  h += 9 * Math.exp(-(((x + 40) / 290) ** 2) - (((z + 240) / 125) ** 2));
  h += hill(x, z, 40, -260, 70, 1.5) + hill(x, z, -260, -280, 80, 2);
  // the French ground: the steep Santon, the Turas heights, the Bellowitz rise behind Schlapanitz
  h += hill(x, z, P.B.x, P.B.z, 48, 11) + hill(x, z, P.B.x + 40, P.B.z + 50, 70, 3);
  h += 8 * Math.exp(-(((x - 330) / 150) ** 2) - (((z - 290) / 110) ** 2));
  h += hill(x, z, -130, 310, 120, 8);
  h += smoothstep(380, 560, z) * 8 + smoothstep(380, 600, -z) * 8;                     // the Zuran hill's rise behind the French, the Krzenowitz slope behind the Allies
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 24 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  h -= brook(x, z) * 3.8;                                                                // the Goldbach's banks
  const k = ice(x, z);
  if (k > 0) h += (-0.6 - h) * k;                                                        // the ponds: flat ice in their hollows
  for (const p of POINTS) if (!'BI'.includes(p.id)) h += (h * 0.5 + 0.6 - h) * smoothstep(40, 20, Math.hypot(x - p.x, z - p.z)) * 0.5; // villages on level ground
  return h;
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'austerlitz',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Napoleon against Kutuzov's Russians and the Austrians; no Austrian roster yet: the Russians fight)
  name: 'Austerlitz',
  description: 'Moravia, 2 December 1805: the Goldbach brook and its villages, the Pratzen heights above them, the Santon hill by the Olmütz road and the frozen Satschan ponds, in the morning fog.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'dawn', weather: 'fog' }, // (the Allies came down off the Pratzen in thick fog; the sun broke through at nine)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180512,
  height,
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805, cell: 80, weights: [0.3, 0.35, 0.25, 0.1] }), // December: winter fields, ploughed and stubble, frozen hard

  theme: {
    // a frosty December dawn: the fog lying in the Goldbach valley, a pale sun over the Pratzen
    fogColor: 0xc4c6c4,
    fogDensity: 0.0019,
    skyTop: 0x8a96a4,
    skyHorizon: 0xd2d0c8,
    skyBottom: 0x92928a,
    sunColor: 0xf2e2c4,
    sunIntensity: 1.6,
    sunDisk: 0.3,
    clouds: 0.6,
    cloudLight: 0xd6d6d0,
    cloudDark: 0x868a90,
    sunDir: [0.2, 0.35, -0.9],
    hemiSky: 0xccd2d8,
    hemiGround: 0x5a564a,
    hemiIntensity: 1.3,
    rimColor: 0xc8ccd4,
    rimIntensity: 0.25,
    terrain: {
      grass: '#7a7c62',
      grassAlt: '#6e7258',
      dryGrass: '#9a9070',
      dirt: '#5e5244',
      rock: '#7a7870',
      strip: '#54483a',
      pasture: '#7c8064',
      ploughed: '#5a4c3e',
      stubble: '#a09474',
      meadow: '#848a6c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const k = ice(x, z);
        if (k > 0.05) return [0xc6d2da, Math.min(1, k * 1.6) * 0.85];             // grey ice, a skin of hoar frost
        const r = brook(x, z);
        if (r > 0.5) return [0x5a6050, (r - 0.5) * 1.6];                          // the brook's frozen, reedy bed
        const rd = Math.abs(x - roadX(z));
        if (rd < 5) return [0x8a8070, smoothstep(5, 3, rd) * 0.8];                // the chaussée
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const nearBrook = (x, z, r) => lineDist(BROOK, x, z) < r;

    // ---- the Goldbach villages and the others; Pratzen, Telnitz and Schlapanitz with their churches
    for (const p of POINTS) if (!p.owner && !'BD'.includes(p.id)) buildVillage(props, p, 18051 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1805_21);
    props.church({ x: P.I.x + 26, z: P.I.z - 20, yaw: 0 });
    props.church({ x: P.J.x - 30, z: P.J.z - 14, yaw: 0.6 });
    props.church({ x: P.C.x - 28, z: P.C.z + 18, yaw: Math.PI / 2 });
    buildVillage(props, { x: P.C.x + 45, z: P.C.z + 30 }, 1805_22);                       // (Schlapanitz is a market town)
    // Sokolnitz: the castle and its yard wall, the pheasantry's wall round its wood
    props.hall({ x: P.G.x - 4, z: P.G.z + 30, yaw: 0.2, width: 22, depth: 11, height: 7, color: 0xc8bca0, roof: 0x6a4a3a, door: 4, name: 'Sokolnitz castle' });
    for (const [dx, dz, yaw, length] of [[-18, 48, 0.2, 20], [16, 42, 0.2, 14], [-26, 30, 1.77, 14]] as const) props.wall({ x: P.G.x + dx, z: P.G.z + dz, yaw, length, height: 1.8 });
    for (let a = 0; a < Math.PI * 2; a += 0.26) {
      const x = 300 + Math.cos(a) * 66 * Math.cos(0.5) - Math.sin(a) * 38 * Math.sin(0.5), z = -105 + Math.cos(a) * 66 * Math.sin(0.5) + Math.sin(a) * 38 * Math.cos(0.5);
      if (nearBrook(x, z, 14) || nearPoint(x, z, 26) || Math.abs(a - 2.4) < 0.2) continue;  // (its gate toward the brook)
      props.lowWall({ x, z, yaw: a + Math.PI / 2 + 0.5, length: 9, height: 1.5, color: 0x9a9284 });
    }
    // Kobelnitz's mill by the dam, Girzikowitz's on the brook
    props.house({ x: P.F.x + 22, z: P.F.z - 22, yaw: 0.2, width: 9, depth: 7 });
    props.house({ x: P.E.x - 20, z: P.E.z - 22, yaw: -0.1, width: 8, depth: 6 });
    // the Santon: the chapel on its top and the gun pits the French dug round it
    props.rand = mulberry32(1805_23);
    props.house({ x: P.B.x - 6, z: P.B.z - 4, yaw: 0.3, width: 6, depth: 8, height: 4 });
    for (let a = 0.4; a < Math.PI * 2; a += Math.PI / 4) props.wall({ x: P.B.x + Math.cos(a) * 24, z: P.B.z + Math.sin(a) * 24, yaw: a + Math.PI / 2, length: 9, height: 1, color: 0x7a6e5c });
    // the Turas heights: a farm and its walled orchard
    buildVillage(props, { x: P.D.x + 10, z: P.D.z + 40 }, 1805_24);
    props.wall({ x: P.D.x - 30, z: P.D.z - 22, yaw: 0.4, length: 18, height: 1.2 });
    // the Posoritz post house on the chaussée; Krzenowitz behind the Allied camp; Napoleon's bivouac on the Zuran
    props.house({ x: roadX(-380) + 14, z: -380, yaw: Math.PI / 2, width: 12, depth: 7 });
    props.house({ x: roadX(380) + 14, z: 380, yaw: Math.PI / 2, width: 9, depth: 7 });
    buildVillage(props, { x: 80, z: -505 }, 1805_25);
    buildVillage(props, { x: -85, z: -515 }, 1805_26);

    // ---- farms, field walls, hay and wood stacks over the frozen fields
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'farm'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 84 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 90 || nearPoint(x, z, 55) || woods(x, z) > 0.3 || pheasantry(x, z) > 0 || nearBrook(x, z, 30) || ice(x, z) > 0 || ice(x + 25, z) > 0 || ice(x - 25, z) > 0 || ice(x, z + 25) > 0 || Math.abs(x - roadX(z)) < 22) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xc8c4b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...CROSS.map(([x, z]) => ({ x, z, r: 16 })), { test: (x, z) => ice(x, z) > 0 || brook(x, z) > 0.5 || Math.abs(x - roadX(z)) < 5 }];
    // bare December trees: the avenue of the chaussée, the pheasantry, willows on the brook
    const avenue = (x, z) => { const d = Math.abs(x - roadX(z)); return d > 6 && d < 9 && ((z + 1000) % 14) < 3 ? 1 : 0; };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0.85, autumn: 1, forest: (x, z) => Math.max(woods(x, z) * 0.95, pheasantry(x, z) * 0.9, avenue(x, z)) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1600, lane: 0 }); // few hedges: open Moravian fields
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6, fields: this.fields });

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
