// Gaeta, February–July 1806: the last Bourbon fortress on the mainland. The Prince of Hesse-Philippsthal held the town
// on its rocky promontory with the Neapolitan garrison, supplied and supported from the sea by Sir Sidney Smith's
// ships, while Masséna's French dug their parallels and batteries across the narrow isthmus and up the hills behind
// it; the walls of the land front were breached under a storm of fire and the garrison capitulated on 18 July.
// The ground: the mainland (+z, where the French come from) narrowing to the sandy isthmus, the beach of Serapo on its
// west side and the harbour and the Borgo on its east, the low hill of Montesecco in the middle; then the promontory
// (−z): the land front's bastioned walls across its neck with the Porta di Terra, the town on the harbour shore, and
// Monte Orlando above it all with the Trinità's chapel. The Neapolitans have no army in the game: the British (who
// landed men and guns into the fortress) stand in, the Russians behind them.
// Fair, not mirrored: the sea runs down both sides of the whole map and pinches into the isthmus in the middle; each
// half has a high hill on its west side as far from its base (Monte Tortano on the mainland against Monte Orlando),
// a village on its east shore road (Castellone against the town of Gaeta), the same three roads in; the land front's
// walls before the coalition's half are matched by the French siege parallels, the batteries' earth banks, before
// theirs, each as far out from its own base. Montesecco and the isthmus between the two beaches belong to no one.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createSea } from '../world/Sea.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 450;
const noise = createNoise2D(1806_02);
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** The sea: water that stops, as a river's does (a land battle — naples.ts). */
const bay = { ...createSea({ level: 0, size: 1600, color: 0x2c6a80 }), sea: false };

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Mola road', x: 0, z: 420, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Monte Tortano', x: -300, z: 310, owner: null, sector: 'west' },
  { id: 'C', name: 'Atratina', x: -60, z: 220, owner: null, sector: 'centre' },
  { id: 'D', name: 'Castellone', x: 230, z: 345, owner: null, sector: 'east' },
  { id: 'E', name: 'Serapo beach', x: -240, z: 60, owner: null, sector: 'west' },
  { id: 'F', name: 'Montesecco', x: 20, z: 0, owner: null, sector: 'centre' },
  { id: 'G', name: 'Borgo di Gaeta', x: 255, z: -95, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Monte Orlando', x: -270, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Porta di Terra', x: 90, z: -230, owner: null, sector: 'centre', radius: 24 },
  { id: 'J', name: 'Gaeta', x: 330, z: -320, owner: null, sector: 'east', radius: 28 },
  { id: 'K', name: 'La Trinità', x: 0, z: -420, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));

/** The shores: the west coast (Serapo bay biting into the isthmus) and the east (the harbour). */
const westX = (z: number) => -470 + 140 * Math.exp(-(((z - 50) / 120) ** 2)) + fbm(noise, 3.1, z * 0.006, 2) * 14;
const eastX = (z: number) => 470 - 125 * Math.exp(-(((z + 20) / 130) ** 2)) + fbm(noise, 7.3, z * 0.006, 2) * 14;
/** How far from the sea (m; < 0 in it). */
const inland = (x: number, z: number) => Math.min(x - westX(z), eastX(z) - x);

/** The land front: the bastioned wall across the promontory's neck (the coalition's), and the French parallel before the isthmus. */
const FRONT_Z = -165, PARALLEL_Z = 165;
const frontLine = (x: number) => FRONT_Z + x * 0.08;
const parallelLine = (x: number) => PARALLEL_Z - x * 0.06;

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
/** The roads: the Via Appia's branch down the middle through the Porta di Terra, the shore road along the harbour, the track along the west side. */
const ROADS: number[][] = [
  [0, 560, P.A.x, P.A.z], [P.A.x, P.A.z, P.C.x, P.C.z], [P.C.x, P.C.z, P.F.x, P.F.z], [P.F.x, P.F.z, P.I.x, P.I.z], [P.I.x, P.I.z, P.K.x, P.K.z], [P.K.x, P.K.z, 0, -560],
  [P.A.x, P.A.z, P.D.x, P.D.z], [P.D.x, P.D.z, P.G.x, P.G.z], [P.G.x, P.G.z, P.J.x, P.J.z], [P.J.x, P.J.z, P.K.x, P.K.z], [P.I.x, P.I.z, P.J.x, P.J.z],
  [P.A.x, P.A.z, P.B.x, P.B.z], [P.B.x, P.B.z, P.E.x, P.E.z], [P.E.x, P.E.z, P.H.x, P.H.z], [P.H.x, P.H.z, P.K.x, P.K.z],
  [P.E.x, P.E.z, P.F.x, P.F.z], [P.F.x, P.F.z, P.G.x, P.G.z],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) return Math.max(-12, -0.6 + d * 0.08);                                            // the sea, shelving off
  let h = 3 + fbm(noise, x * 0.003, z * 0.003, 3) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.4;
  h += hill(x, z, -230, -330, 150, 40) + hill(x, z, -300, -200, 90, 10);                     // Monte Orlando, its cliffs over the sea
  h += hill(x, z, -270, 340, 150, 40) + hill(x, z, -330, 200, 90, 10);                       // Monte Tortano and its shoulder
  h += hill(x, z, P.F.x, P.F.z, 85, 11);                                                     // Montesecco
  h += hill(x, z, P.C.x, P.C.z, 70, 5) + hill(x, z, P.I.x - 30, P.I.z - 30, 80, 5);          // Atratina's rise; the rise the land front stands on
  for (const p of POINTS) if ('DGJ'.includes(p.id)) h += (Math.max(2.5, h * 0.6) - h) * smoothstep(p.radius ?? 40 + 20, 18, Math.hypot(x - p.x, z - p.z)) * 0.6; // (the shore villages on level ground)
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  // the shore: a beach (Serapo, the harbour's strand) or a rocky edge where the hills come down
  return Math.min(h, 0.6 + d * (h > 14 ? 0.8 : 0.12));
}

/** Olive terraces, holm oak and maquis on the hills (0..1). */
const woods = (x: number, z: number) => {
  if (inland(x, z) < 25) return 0;
  let k = smoothstep(0.45, 0.62, fbm(noise, x * 0.007 + 17, z * 0.007 - 5, 3)) * 0.8;
  k = Math.max(k, smoothstep(130, 70, Math.hypot(x + 240, z + 330)) * 0.8, smoothstep(130, 70, Math.hypot(x + 280, z - 340)) * 0.8); // (the hillsides)
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 58, Math.hypot(x - p.x, z - p.z)));
  k = Math.min(k, smoothstep(18, 40, Math.abs(z - frontLine(x))), smoothstep(18, 40, Math.abs(z - parallelLine(x)))); // (the glacis and the siege works cleared)
  return Math.min(k, smoothstep(4, 10, roadDist(x, z)));
};

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'gaeta',
  armies: { nato: ['fr'], pact: ['gb', 'ru'] }, // (Masséna's siege corps against Hesse-Philippsthal's garrison: no Neapolitan army yet — the British stand in; the map names them, so they field in Italy)
  name: 'Gaeta',
  description: 'The siege of Gaeta, February–July 1806: the fortress town on its promontory with Monte Orlando above it, the bastions of the land front, and the French parallels and batteries on the isthmus between the beach of Serapo and the harbour.',
  epochs: ['1806'],
  region: 'italy',
  airfields: [],
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180602,
  height,
  steep: 0.55,
  river: bay,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_2, cell: 60, weights: [0.3, 0.3, 0.2, 0.2] }),

  theme: {
    // a clear spring day on the Tyrrhenian coast
    fogColor: 0xc6ced2, fogDensity: 0.0009,
    skyTop: 0x5c8cc0, skyHorizon: 0xd2dce0, skyBottom: 0x8a9488,
    sunColor: 0xfff0d6, sunIntensity: 2.0, sunDisk: 0.5,
    clouds: 0.25, cloudLight: 0xf2f2ee, cloudDark: 0xa8b0b6,
    sunDir: [0.4, 0.6, -0.65],
    hemiSky: 0xccd8e2, hemiGround: 0x5e5a3c, hemiIntensity: 1.25,
    rimColor: 0xdce2e6, rimIntensity: 0.25,
    terrain: {
      grass: '#66763e', grassAlt: '#5c6c38', dryGrass: '#9a9058', dirt: '#806446', rock: '#a29a88',
      pasture: '#6c7c40', ploughed: '#7a5c40', stubble: '#a89a60', meadow: '#6a7a3e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) return [y > -1.5 ? 0xc8bc9a : 0x7e8478, 1];                                     // the sand under the water
        if (d < 22 && y < 2.5) return [0xddd0aa, 1];                                               // the beaches
        if (d < 30) return [0xa49c8a, 0.8];                                                        // the rocks along the shore
        if (roadDist(x, z) < 3) return [0xb4a07e, 0.8];                                            // the roads
        const siege = Math.max(smoothstep(30, 10, Math.abs(z - frontLine(x)) - 10) * smoothstep(-120, -80, x), smoothstep(26, 8, Math.abs(z - parallelLine(x)) - 8) * smoothstep(300, 260, Math.abs(x - 20)));
        return siege > 0.05 ? [0x8a7458, siege * 0.7] : null;                                       // the glacis and the siege works' turned earth
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-250, 0, 250] }, pact: { x: 0, z: -BASE_Z, entries: [-250, 0, 250] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Company' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    bay.build(scene, terrain);
    const nearPoint = (x: number, z: number, r: number) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];
    const STONE = 0xc8bca2, PLINTH = 0x9a8e76;

    // ---- the land front: curtain walls of dressed stone across the neck, bastions at the angles, the Porta di Terra open on the road
    const wallAt = (x: number) => ({ x, z: frontLine(x) });
    for (let x = -110; x <= eastX(FRONT_Z) - 20; x += 16) {
      const a = wallAt(x);
      if (Math.abs(x - P.I.x) < 14 || roadDist(a.x, a.z) < 6 || inland(a.x, a.z) < 8) continue; // (the gate, and where the shore road runs in)
      const g = terrain.heightAt(a.x, a.z), yaw = -Math.atan(0.08);
      props.box('stone', a.x, g + 1.6, a.z, 16.2, 5.2, 3, yaw, STONE);
      props.box('stone', a.x, g - 0.2, a.z + 0.4, 16.4, 2, 3.6, yaw, PLINTH);
      props.cover.addBox({ x: a.x, z: a.z, yaw, length: 16, thickness: 3, height: 4 });
    }
    for (const x of [-110, 30, 170, 300]) { // the bastions, their points toward the isthmus
      const a = wallAt(x), z = a.z + 9, g = terrain.heightAt(a.x, z);
      props.box('stone', a.x, g + 1.8, z, 11, 5.6, 11, Math.PI / 4, STONE);
      props.box('stone', a.x, g - 0.2, z, 11.6, 2, 11.6, Math.PI / 4, PLINTH);
      props.cover.addBox({ x: a.x, z, yaw: Math.PI / 4, length: 11, thickness: 11, height: 4.5 });
    }
    // ---- the French siege works: the parallel's earth banks, the batteries' epaulements (a gap at each road)
    for (let x = -230; x <= 270; x += 14) {
      const z = parallelLine(x);
      if (roadDist(x, z) < 8 || inland(x, z) < 20) continue;
      props.wall({ x, z, yaw: Math.atan(0.06), length: 12, height: 1.1 });
    }
    for (const x of [-120, 60, 190]) for (let k = -1; k <= 1; k++) props.wall({ x: x + k * 9, z: parallelLine(x) - 14, yaw: 0.05, length: 7, height: 1.4 }); // (the breaching batteries, ahead of the parallel)

    // ---- Gaeta: the town packed along the harbour shore, its cathedral's campanile; the Borgo and Castellone up the shore road
    props.rand = mulberry32(1806_0718);
    props.church({ x: P.J.x - 20, z: P.J.z + 10, yaw: Math.PI / 2 });
    taken.push([P.J.x - 20, P.J.z + 10]);
    const rr = mulberry32(18062);
    for (let i = 0; i < 40; i++) {
      const a = rr() * Math.PI * 2, d = 24 + rr() * 50;
      const x = P.J.x + Math.cos(a) * d, z = P.J.z + Math.sin(a) * d * 0.9;
      if (inland(x, z) < 14 || roadDist(x, z) < 6 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + rr() * 2, depth: 8, storeys: rr() < 0.6 ? 2 : 1, damaged: 0.25 });
    }
    for (const p of [P.G, P.D, P.B, P.E]) buildVillage(props, p, 18065 + Math.round(p.x * 3 + p.z * 7));
    // ---- the Trinità's chapel on Monte Orlando, the Torre d'Orlando (the Roman tomb) on the summit; a chapel on Monte Tortano
    props.church({ x: P.K.x - 30, z: P.K.z - 6, yaw: 0 });
    const T = { x: -230, z: -330 };
    props.cover.addCylinder({ x: T.x, z: T.z, radius: 10, height: 9, spots: false });
    props.column({ x: T.x, z: T.z, radius: 10, height: 9 });
    props.church({ x: P.B.x + 30, z: P.B.z + 20, yaw: Math.PI / 2 });
    taken.push([P.K.x - 30, P.K.z - 6], [T.x, T.z], [P.B.x + 30, P.B.z + 20]);
    // the fishermen's boats drawn up on Serapo beach
    for (let i = 0; i < 5; i++) { const z = 10 + i * 14, x = westX(z) + 10; props.box('plain', x, terrain.heightAt(x, z) + 0.4, z, 5, 0.6, 1.6, 0.2, 0x5a4434); }

    // ---- olive terraces, field walls and farms
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 50 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (inland(x, z) < 40 || Math.hypot(x, z - BASE_Z) < 50 || Math.hypot(x, z + BASE_Z) < 50 || nearPoint(x, z, 55) || roadDist(x, z) < 12 || woods(x, z) > 0.3
        || Math.abs(z - frontLine(x)) < 40 || Math.abs(z - parallelLine(x)) < 40 || Math.hypot(x - P.J.x, z - P.J.z) < 90) continue;
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
      ...taken.map(([x, z]) => ({ x, z, r: 9 })), { test: (x: number, z: number) => roadDist(x, z) < 5 || inland(x, z) < 20 || Math.abs(z - frontLine(x)) < 14 }];
    // olives, holm oaks, umbrella pines and cypresses
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, broadleaf: 0.6, autumn: 0, maxY: 80, forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 24 }] });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        ground.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
