// Lambach, 31 October 1805: after Ulm the Grande Armée marched down the Danube valley after Kutuzov. At the Traun
// Kutuzov left a rearguard — Russian battalions with Merveldt’s Austrians — at Lambach, the Benedictine abbey town on
// the terrace above the river, to hold the crossing while his army got away toward Wels and the Enns. Davout’s leading
// division and Murat’s cavalry came down the road from Ried and Schwanenstadt, pushed the rearguard back through the
// village fields and over the terrace, and the allies fell back across and along the Traun after a sharp afternoon.
// On the map (1.0 × 1.12 km): the French come from the west along the Schwanenstadt road (+z), the Russians and
// Austrians hold the road to Wels (−z). The Traun runs the length of the east flank (+x) in its broad gravel valley;
// Lambach sits on the edge of the terrace above it, its abbey looking down on the wooden bridge over to Stadl-Paura
// and the Trinity church on the far bank. Fords at the Stadl and Fischlham gravel bars, the foothills of the Hausruck
// wooded along the west flank, Aichkirchen, Neukirchen, Bachmanning, Offenhausen and Edt on the terrace fields.
// Fair, not mirrored: the river runs along the flank, not between the sides, and its two fords lie as far from either
// base; Lambach and its bridge are in the middle, owned by neither, with Paura only to be had over the bridge or a
// ford. The terrace edge runs the whole length, so both sides have the same step down to the river; the Hausruck woods
// over Bachmanning are answered by those over Offenhausen, the Neukirchen rise by the Edt rise, and each village lies
// as far from the nearer base as its counterpart. 1806 only (`epochs`: maps/index.js mapsFor).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 490;
const noise = createNoise2D(1805_1031);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Schwanenstadt road', x: 0, z: 465, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bachmanning', x: -350, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Neukirchen', x: -40, z: 285, owner: null, sector: 'centre' },
  { id: 'D', name: 'Stadl ford', x: 235, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Aichkirchen', x: -270, z: 2, owner: null, sector: 'west' },
  { id: 'F', name: 'Lambach', x: 130, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Stadl-Paura', x: 420, z: 0, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Offenhausen', x: -330, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Edt', x: 20, z: -285, owner: null, sector: 'centre' },
  { id: 'J', name: 'Fischlham ford', x: 240, z: -300, owner: null, sector: 'east' },
  { id: 'K', name: 'Wels road', x: 0, z: -465, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

// the Traun down the east flank in its gravel valley; the wooden bridge at Lambach, the fords on the gravel bars
const river = createRiver({
  path: [[318, -720], [328, -460], [312, -300], [326, -120], [322, 0], [330, 160], [314, 300], [326, 470], [316, 720]],
  halfWidth: 15, level: 0, depth: 2.8, valley: 62,
  crossings: [
    { name: 'Lambach bridge', x: 322, z: 0, kind: 'bridge', width: 8 },
    { name: 'Stadl ford', x: 314, z: 300, kind: 'ford', width: 12 },
    { name: 'Fischlham ford', x: 312, z: -300, kind: 'ford', width: 12 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };
/** The terrace edge: where the ground steps up from the Traun’s valley floor (x at z). */
const edgeX = (z) => 222 + 14 * Math.sin(z * 0.006 + 0.7);
/** 1 up on the terrace (west of the edge), 0 down on the valley floor. */
const terrace = (x, z) => smoothstep(edgeX(z) + 22, edgeX(z) - 38, x);
// the Schwanenstadt–Wels chaussée, bending through Lambach’s market; the lane down to the bridge and on to Paura
const roadX = (z) => 120 * Math.exp(-((z / 230) ** 2)) + 10 * Math.sin(z * 0.005);
const roadD = (x, z) => Math.min(Math.abs(x - roadX(z)), x > 120 && x < 480 ? Math.abs(z - 2 * Math.sin(x * 0.02)) : 1e9);
/** 1 in Lambach’s streets, 0 outside. */
const town = (x, z) => smoothstep(1.1, 0.85, Math.hypot((x - 150) / 70, (z - 5) / 80));
const paura = (x, z) => smoothstep(1.1, 0.8, Math.hypot((x - 425) / 50, (z - 5) / 55));

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the woods over Bachmanning and Offenhausen, copses on the Neukirchen and Edt rises, the Traun’s riverside alders
const WOODS = [[-420, 200, 70, 110, 0.2], [-410, -190, 70, 110, -0.25], [-170, 210, 50, 32, 0.7], [-130, -215, 50, 32, -0.5]];
/** The woods (0..1): the Hausruck foothills on the west, the named woods, a few copses; the river’s scrub. */
const woods = (x, z) => {
  let k = smoothstep(0.55, 0.7, fbm(noise, x * 0.006 + 13, z * 0.006 - 21, 3)) * 0.7;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  k = Math.max(k, smoothstep(-400, -470, x + fbm(noise, z * 0.01, 5, 2) * 30));
  k = Math.min(k, 1 - town(x, z), 1 - paura(x, z), smoothstep(7, 18, roadD(x, z)));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 52, Math.hypot(x - p.x, z - p.z)));
  return k;
};

function height(x, z) {
  let h = fbm(noise, x * 0.0024, z * 0.0024, 3) * 3.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.45 + 2;
  h += terrace(x, z) * 10;                                                         // the Traun terrace, Lambach on its lip
  h += smoothstep(-150, -500, x) * 14;                                             // the Hausruck foothills on the west
  h += hill(x, z, -150, 200, 80, 5) + hill(x, z, -110, -205, 80, 5);              // the Neukirchen rise, the Edt rise
  h += smoothstep(380, 520, x) * 9;                                                // the far bank’s terrace behind Paura
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 20;
  for (const p of POINTS) if (p.id !== 'F') h += (h * 0.5 + 2.5 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.4; // villages on level ground
  h += ((h + 13) * 0.5 - h) * town(x, z) * 0.5;                                     // Lambach’s square, levelled
  // the lane down the terrace to the bridge: a cut through the edge
  const lane = smoothstep(9, 4, Math.abs(z)) * smoothstep(160, 200, x) * smoothstep(300, 270, x);
  h += (2 + 10 * smoothstep(275, 175, x) - h) * lane * 0.85;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'lambach',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (Davout and Murat against Kutuzov’s Russian rearguard and Merveldt’s Austrians; no Austrian roster yet: the Russians fight)
  name: 'Lambach',
  description: 'The Traun at Lambach, 31 October 1805: the abbey town on its terrace above the river and the bridge to Stadl-Paura, held by Kutuzov’s rearguard and Merveldt’s Austrians against Davout and Murat coming down the road from Schwanenstadt.',
  epochs: ['1806'],
  region: 'europe',
  conditions: { time: 'day', weather: 'overcast' }, // (a raw grey day at the end of October)
  airfields: [],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 18051031,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_1031, cell: 72, weights: [0.32, 0.2, 0.3, 0.18] }), // late October: stubble, ploughland, pasture

  theme: {
    // a grey late-October afternoon over the Traun, the beeches turned
    fogColor: 0xadb2b0,
    fogDensity: 0.0017,
    skyTop: 0x74808c,
    skyHorizon: 0xc2c4bc,
    skyBottom: 0x72756e,
    sunColor: 0xeadcc0,
    sunIntensity: 1.6,
    sunDisk: 0.1,
    clouds: 0.8,
    cloudLight: 0xcccdc8,
    cloudDark: 0x7c8286,
    sunDir: [0.5, 0.42, 0.72],
    hemiSky: 0xc4cbd2,
    hemiGround: 0x4c4636,
    hemiIntensity: 1.25,
    rimColor: 0xbcc4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a643c',
      grassAlt: '#4e5836',
      dryGrass: '#887850',
      dirt: '#56473a',
      rock: '#6c6a62',
      strip: '#4a3e30',
      pasture: '#58643a',
      ploughed: '#4e3e2e',
      stubble: '#8c7c4e',
      meadow: '#667040',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        const rd = roadD(x, z);
        if (rd < 5) return [0x857a68, smoothstep(5, 3, rd) * 0.75];                           // the chaussée and the bridge lane
        const t = Math.max(town(x, z), paura(x, z));
        if (t > 0) return [0x8a8274, t * 0.4];                                                // the streets
        if (wet(x, z, 10) && !wet(x, z, 1)) return [0x8a8676, 0.5];                           // the gravel banks
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 200] } },
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

    // ---- Lambach: houses round the market and along the chaussée, the abbey on the terrace lip over the river
    const rr = mulberry32(1805_10311);
    const taken: number[][] = [[200, 30]];
    for (let i = 0; i < 90 && taken.length < 32; i++) {
      const x = 150 + (rr() * 2 - 1) * 68, z = 5 + (rr() * 2 - 1) * 76;
      if (town(x, z) < 0.55 || roadD(x, z) < 8 || Math.hypot(x - P.F.x, z - P.F.z) < 18 || x > 205 && z > -10 && z < 70 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(x - roadX(z)) < 30 ? Math.PI / 2 : 0, width: 7 + rr() * 3, depth: 8, storeys: rr() < 0.65 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(1805_10312);
    // the abbey: the church, the long convent wings round the court, the abbey wall
    props.church({ x: 205, z: 52, yaw: 0 });
    props.hall({ x: 226, z: 30, yaw: Math.PI / 2, width: 36, depth: 10, height: 9, color: 0xd8d0bc, roof: 0x6a4a3a, door: 0, name: 'Lambach abbey' });
    props.hall({ x: 205, z: 14, yaw: 0, width: 30, depth: 9, height: 9, color: 0xd8d0bc, roof: 0x6a4a3a, door: 4, name: 'abbey wing' });
    for (const [x, z, yaw, length] of [[186, 40, Math.PI / 2, 34], [212, 68, 0, 40]] as const) props.wall({ x, z, yaw, length, height: 2.6 });
    // Stadl-Paura over the bridge: the Trinity church, the boatmen’s and salt carters’ houses
    props.church({ x: 450, z: 40, yaw: Math.PI / 2 });
    for (const [x, z, yaw] of [[400, -24, 0], [440, -26, 0.1], [395, 30, Math.PI / 2], [455, -2, Math.PI / 2], [410, 52, 0.2]] as const) {
      props.house({ x, z, yaw, width: 8 + rr() * 2, depth: 6 + rr() * 2 });
    }
    // ---- the villages; farms, field walls and hay over the terrace fields
    for (const p of POINTS) if (!p.owner && !'FG'.includes(p.id)) buildVillage(props, p, 18051 + Math.round(p.x * 3 + p.z * 7));
    props.church({ x: P.E.x - 30, z: P.E.z + 20, yaw: 0 });
    props.church({ x: P.C.x + 30, z: P.C.z + 24, yaw: Math.PI / 2 });
    props.church({ x: P.I.x - 30, z: P.I.z - 24, yaw: Math.PI / 2 });
    props.hall({ x: P.D.x - 30, z: P.D.z + 30, yaw: 0.2, width: 14, depth: 8, height: 5, color: 0x9a8a70, roof: 0x5a3a2a, door: 4, name: 'Stadl mill' });
    props.hall({ x: P.J.x - 30, z: P.J.z - 30, yaw: -0.2, width: 14, depth: 8, height: 5, color: 0x9a8a70, roof: 0x5a3a2a, door: 4, name: 'Fischlham mill' });
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 80 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 58 * 58)) continue;
      if (Math.hypot(x, z - BASE_Z) < 55 || Math.hypot(x, z + BASE_Z) < 55 || nearPoint(x, z, 50) || woods(x, z) > 0.3 || wet(x, z, 40) || town(x, z) > 0 || paura(x, z) > 0 || roadD(x, z) < 14) continue;
      if (Math.abs(x - edgeX(z)) < 30) continue; // (not on the terrace edge)
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);

    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xcfc8b0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 34, z: base.z - toward * 12, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 16, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })),
      { test: (x, z) => wet(x, z, 1.5) || town(x, z) > 0.3 || paura(x, z) > 0.4 || roadD(x, z) < 5 }];
    // beech and oak on the Hausruck slopes, a few spruce, alders and willows along the Traun
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4800, broadleaf: 0.75, autumn: 1, forest: (x, z) => (wet(x, z, 12) ? 0.5 : woods(x, z) * 0.92) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 2400, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.4, fields: this.fields });

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
