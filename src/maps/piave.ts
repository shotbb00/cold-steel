// The Piave, 15 June 1918: the Battle of the Solstice, Austria-Hungary's last offensive. Before dawn the Austro-
// Hungarian divisions crossed the river in boats and on pontoon bridges between the Montello and the sea and dug in on
// the far bank; then the Piave rose in flood, the bridges were torn away one after another or bombed by the Italian
// and British aircraft, and a week later the survivors went back over what was left of them. The river here is a wide
// braided bed of white gravel — arms of fast grey-green water round the grave, the gravel islands (the Isola dei Morti
// among them, named for the dead it gave back) — between the high dykes (the argini) that each army held as its
// line; behind them the flat Venetian plain of maize, vines and mulberry rows, villages with their campaniles, and
// the wooded whale-back of the Montello over the Italian bank. Point-mirrored to keep it fair: each side has its dyke,
// its wooded hill (the Montello, and the Collalto hills over the left bank), its villages and both arms to cross.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { pointsFrom, both, coverSites, vegetation } from './common2027.js';
import { pontoons, farmVillage } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 20;
const DYKE = 138;                                            // the dykes' crests, m off the bed's middle
const HILL = { x: -290, z: 335, r: 190, h: 36 };             // the Montello (the Collalto hills are its mirror)
const noise = createNoise2D(1918_06);
const mid = (x: number) => 15 * Math.sin(x * 0.004) + 6 * Math.sin(x * 0.011);
const wob = (x: number) => 7 * Math.sin(x * 0.019 + 0.7);
const armN = (x: number) => mid(x) + 50 + wob(x);
const armS = (x: number) => mid(x) - 50 - wob(-x);           // (= −armN(−x): the pair is point-mirrored)
const bridges = [-SIDE_X, 0, SIDE_X].flatMap((x) => [0, 1].map((channel) => ({ name: `${['Priula', 'Isola dei Morti', 'Falzè'][[-SIDE_X, 0, SIDE_X].indexOf(x)]} pontoon bridge`, x, kind: 'bridge', width: 6, channel, pontoon: true })));
const river = createRiver({ path: armN, paths: [armN, armS], halfWidth: HW, level: 0, depth: 2.8, valley: 34, crossings: bridges });
const away = (x: number, z: number) => Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x)));
const bed = (x: number, z: number) => Math.abs(z - mid(x));
const half = (x: number, z: number) => (z > mid(x) ? [x, z] : [-x, -z]);
const hillK = (x: number, z: number) => { const [ax, az] = half(x, z); return Math.max(0, 1 - Math.hypot(ax - HILL.x, (az - HILL.z) * 1.25) / HILL.r); };
/** The roads: along behind each dyke, from each bridge up to it, the main road on to the base. */
const onRoad = (x: number, z: number) => {
  const [ax, az] = half(x, z);
  if (Math.abs(az - mid(ax) - DYKE - 22) < 3.2) return true;
  for (const bx of [-SIDE_X, 0, SIDE_X]) if (Math.abs(ax - bx) < 3 && away(ax, az) > HW + 6 && az > mid(ax) && az < mid(ax) + DYKE + (bx ? 24 : 600)) return true;
  return false;
};

function height(x: number, z: number) {
  const b = bed(x, z), [ax, az] = half(x, z);
  let h = 3 + fbm(noise, ax * 0.005, az * 0.005, 3) * 1.2;                             // the plain
  h += (1.1 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.5 - h) * (1 - smoothstep(DYKE - 22, DYKE - 10, b)); // the gravel bed between the dykes
  const crest = 4.6 * (1 - smoothstep(4, 13, Math.abs(b - DYKE)));                     // the argine
  const gap = [-SIDE_X, 0, SIDE_X].some((bx) => Math.abs(ax - bx) < 12) ? 0.35 : 1;     // (cut down where the bridge roads go over it)
  h += crest * gap;
  const k = hillK(x, z);
  h += HILL.h * k ** 1.3 + fbm(noise, ax * 0.02 + 3, az * 0.02, 3) * 4 * k;            // the Montello: a long wooded hump, dolines in its top
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const points = pointsFrom([
  ['A', 'Treviso road', 0, 470],
  ['B', 'Montello', HILL.x, HILL.z],
  ['C', 'Nervesa', 0, 250],
  ['D', 'Arcade', SIDE_X, 300],
  ['E', 'Ponte della Priula', -SIDE_X, Math.round(mid(-SIDE_X) + DYKE + 4), { radius: 24 }],
  ['F', 'Isola dei Morti', 0, 0, { radius: 26 }],
], ['Falzè', 'Sernaglia', 'Moriago', 'Collalto', 'Conegliano road']);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'piave',
  name: 'Piave',
  description: 'June 1918, the Battle of the Solstice: the braided Piave in flood between its dykes — arms of fast water round white gravel islands, pontoon bridges over each arm, the wooded Montello over one bank and the Collalto hills over the other. Mirrored to keep it fair.',
  epochs: ['1918'],
  region: 'italy',
  armies: { nato: ['it'], pact: ['ah'] }, // (the Italian Eighth Army against the Austro-Hungarian Isonzo Army: maps/index.js armiesOn)
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1918,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191806, cell: 64, weights: [0.3, 0.4, 0.05, 0.25] as any }),

  theme: {
    // a hot, hazy June day on the Venetian plain, the Alps a grey line behind
    fogColor: 0xbcc0b8, fogDensity: 0.0012, skyTop: 0x6c90b4, skyHorizon: 0xd4d6cc, skyBottom: 0x8a8c80,
    sunColor: 0xfff0d4, sunIntensity: 2.0, sunDisk: 0.35, clouds: 0.4, cloudLight: 0xf0f0ea, cloudDark: 0x9aa2a8,
    sunDir: [0.35, 0.75, 0.35], hemiSky: 0xc8d4de, hemiGround: 0x6a6440, hemiIntensity: 1.25, rimColor: 0xd8dce0, rimIntensity: 0.25,
    terrain: {
      grass: '#5c6c34', grassAlt: '#52642e', dryGrass: '#a49a5c', dirt: '#7a6a50', rock: '#b8b4a8', strip: '#5a4a36',
      pasture: '#5e6e36', ploughed: '#7c6a50', stubble: '#c4ae64', meadow: '#6a7a3c',
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0xa09478, 0.85];                                            // white roads
        const b = bed(x, z);
        if (b < DYKE - 12) return [fbm(noise, x * 0.012 + 8, z * 0.03, 3) > 0.05 ? 0xd4cebe : 0xa6a08c, y < 1.3 ? 1 : 0.85]; // the grave: white gravel, darker where it's wet and sanded
        if (Math.abs(b - DYKE) < 12) return [0x7a8048, 0.6];                                   // the dyke's turf
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each army's line dug into its dyke, wire down the face toward the river (gaps at the bridge roads), MG posts on the crest. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, (mid(x) + DYKE + 3) * s]);
      for (const w of trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 60 })) if ([-SIDE_X, 0, SIDE_X].every((bx) => Math.abs(w.x - bx) > 10)) works.push(w);
      for (const bx of [-SIDE_X, 0, SIDE_X]) for (const dx of [-18, 18]) works.push({ kind: 'mgNest', x: (bx + dx) * s, z: (mid(bx + dx) + DYKE) * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => bed(x, z) < DYKE + 16 || onRoad(x, z) || onRoad(x + 6, z) || onRoad(x - 6, z) || hillK(x, z) > 0.55;

    // the villages with their campaniles
    for (const p of points) {
      if (!['C', 'D', 'E', 'G', 'H', 'I'].includes(p.id)) continue;
      farmVillage(props, p.x, p.z, p.id === 'C' || p.id === 'I' ? 9 : 6, 19180 + Math.round(Math.abs(p.x) + Math.abs(p.z)), skip, p.id === 'C' || p.id === 'I' ? 1.3 : 1);
    }
    both(props, 1806, (m, flip) => { props.church({ x: 30 * m, z: 280 * m, yaw: flip }); props.church({ x: (SIDE_X - 34) * m, z: 320 * m, yaw: flip + Math.PI / 2 }); });
    // the Montello's farms on its slopes; boats drawn up on the gravel by the bridges; the stone abbey of Nervesa
    both(props, 1807, (m, flip) => {
      for (const [x, z] of [[HILL.x + 70, HILL.z - 60], [HILL.x - 90, HILL.z - 30], [HILL.x + 20, HILL.z + 60]]) props.house({ x: x * m, z: z * m, yaw: flip + props.rand(), width: 9, depth: 7 });
      for (const bx of [-SIDE_X, 0, SIDE_X]) {
        props.logPile({ x: (bx + 18) * m, z: (armN(bx) + HW + 12) * m, yaw: flip + 0.2, length: 7 });
        props.crates({ x: (bx - 16) * m, z: (armN(bx) + HW + 16) * m, yaw: flip });
      }
      props.hall({ x: -70 * m, z: 255 * m, yaw: flip, width: 18, depth: 12, height: 8, color: 0x9a8a72, roof: 0x7a3e2c, door: 4, name: 'abbey' });
    });
    coverSites(props, rand, bounds, (x, z) => z > mid(x) + DYKE + 40 && Math.hypot(x, z - BASE_Z) > 45 && !nearPoint(x, z, 45) && !skip(x, z), 80,
      ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'], buildSite);
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => away(x, z) < HW + 3 || onRoad(x, z) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 2600, hedges: 6000, autumn: 0, broadleaf: 0.92,
      noHedge: (x: number, z: number) => bed(x, z) < DYKE + 20,
      forest: (x: number, z: number) => {
        const b = bed(x, z), [ax, az] = half(x, z);
        if (away(x, z) < HW + 2) return -1;
        if (hillK(x, z) > 0.25) return 0.85;                                                     // the Montello's oak and chestnut woods
        if (b < DYKE - 14) return fbm(noise, ax * 0.03, az * 0.03, 2) > 0.25 ? 0.5 : 0;         // willow scrub on the gravel islands
        if (Math.abs(b - DYKE) < 16) return 0.03;
        return fbm(noise, ax * 0.008 + 50, az * 0.008, 3) > 0.38 ? 0.6 : 0;                      // poplar rows and copses on the plain
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
