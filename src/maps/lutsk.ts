// Lutsk, 4–7 June 1916: the opening of the Brusilov Offensive. Kaledin's Eighth Army attacks the Austro-Hungarian
// Fourth Army east of Lutsk — not on one narrow front but everywhere at once, after a short, exactly registered
// bombardment, the assault trenches dug forward to within a hundred metres of the enemy wire. The Austro-Hungarian
// lines were deep — three belts of trenches with dugouts nine metres down — and that was their undoing: the garrisons
// were still below ground when the Russians came over the parapet. By the 7th the Russians were in Lutsk and over the Styr.
// The ground: the Volhynian loess plateau, wheat and rye on its flat top, cut by steep wooded ravines (the balky) that
// run down to the Styr; the river in its sunk valley swings round the old town in a great horseshoe, the town on the
// promontory inside it and Lubart's castle at the promontory's tip, the cathedral behind it.
// On the map (1.0 × 1.12 km) the Russians come from the Olyka road (+z, east of the town), the Austro-Hungarians hold
// the Volodymyr road (−z): the Styr comes in from the west edge, runs east under the Russian front, bends south round
// the castle and runs back west under the Austrian front — a horseshoe in the western two-thirds with the town and the
// castle inside it, reached by a bridge and a pontoon bridge on each arm and the castle bridge at the tip. East of the
// bend the plateau is open from one side's lines to the other's: the ravines there are the only cover.
// Not mirrored but fair: the horseshoe opens to the west edge, so each side has one arm before it with the same two
// crossings, and the open plateau east is shared; the points are at matching reaches (tools/map_fairness.py), each
// half has its own ravines (one long one running north-east in the Russian half, one south-east in the Austrian, and
// a short one behind each side's west flank), its own woods of the same area, two trench lines at the same depth.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { pontoons, farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 480;
const HW = 18;                                              // the Styr: broad and slow
const noise = createNoise2D(1916_06);

// ---- the Styr's horseshoe: in from the west edge under the Russian front, round the castle, out under the Austrian
const STYR = [[-640, 150], [-460, 168], [-330, 148], [-190, 170], [-60, 160], [40, 150], [118, 112], [166, 46], [176, -26], [140, -104], [62, -156],
  [-50, -164], [-180, -150], [-320, -172], [-470, -152], [-640, -160]];
const river = createRiver({
  paths: [STYR], halfWidth: HW, level: 0, depth: 3, valley: 46,
  crossings: [
    { name: 'Krasne pontoon bridge', x: -330, z: 148, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Lutsk bridge', x: -20, z: 156, kind: 'bridge', width: 7 },
    { name: 'Castle bridge', x: 173, z: 8, kind: 'bridge', width: 6 },
    { name: 'Dubno bridge', x: -60, z: -163, kind: 'bridge', width: 7 },
    { name: 'Kolky pontoon bridge', x: -320, z: -172, kind: 'bridge', width: 6, pontoon: true },
  ],
});
const EXT = { x: 640, z: 700 };
const riverD = gridCacheSmooth((x: number, z: number) => segDist(STYR, x, z), EXT, 4);
/** Inside the horseshoe (the promontory): between the arms, west of the bend. */
const inLoop = (x: number, z: number) => Math.abs(z) < 150 && x < 150 && riverD(x, z) > HW;

// ---- the ravines: [course, depth]; the first point is at the valley, the last its head on the plateau
const RAVINES: [number[][], number][] = [
  [[[150, 120], [250, 175], [340, 190], [430, 250], [520, 280]], 11],        // the Krupa balka, north-east into the Russian half
  [[[150, -120], [220, -200], [330, -250], [400, -340], [470, -420]], 11],   // the Hnidava balka, south-east into the Austrian
  [[[-400, 190], [-430, 280], [-480, 360]], 8],                             // short ones behind each west flank
  [[[-240, -200], [-200, -300], [-230, -380]], 8],
];
const ravD = RAVINES.map(([c]) => gridCacheSmooth((x: number, z: number) => segDist(c, x, z), EXT, 4));

// ---- roads: the bases' roads to the bridges, the town street across the promontory, the lateral roads, the Rivne–Dubno road up the plateau
const ROADS = [
  [[0, 640], [0, 440], [-12, 300], [-20, 156], [-40, 60], [-60, -60], [-60, -163], [-30, -300], [0, -440], [0, -640]],
  [[-640, 300], [-340, 290], [-12, 300], [110, 305], [360, 270], [640, 280]],
  [[-640, -300], [-300, -310], [-30, -300], [-60, -285], [380, -240], [640, -250]],
  [[-340, 290], [-330, 148], [-325, 0], [-320, -172], [-300, -310]],                    // the pontoon road across the island
  [[-325, 0], [-170, 15], [-50, 0], [75, -5], [173, 8], [340, 10], [640, 15]],          // through the old town to the castle and over its bridge
  [[360, 270], [345, 140], [340, 10], [350, -120], [380, -240]],                        // the Rivne–Dubno road along the plateau
];
const roadD = gridCacheSmooth((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Olyka road', 0, 440, 'centre'),
  P('B', 'Kivertsi', -340, 290, 'west'),
  P('C', 'Podhaitsi', 110, 305, 'centre'),
  P('D', 'Zhydychyn Monastery', 365, 255, 'east'),
  P('E', 'Lutsk old town', -170, 15, 'west', { radius: 32 }),
  P('F', 'Lubart\'s Castle', 75, -5, 'centre', { radius: 28 }),
  P('G', 'Ozerdiv', 340, 10, 'east', { radius: 26 }),
  P('H', 'Boratyn', -300, -310, 'west'),
  P('I', 'Torchyn', -60, -285, 'centre'),
  P('J', 'Lypyny', 380, -240, 'east'),
  P('K', 'Volodymyr road', 0, -440, 'centre'),
] as any[];
const CASTLE = { x: 75, z: -5 };
// each side's airfield on the plateau behind its flank (strip along x, the tower 55 m off it), graded flat
const AIR = [{ faction: 'nato', x: -230, z: 430, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 230, z: -430, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

const ground = gridCacheSmooth((x: number, z: number) => {
  const d = riverD(x, z);
  // the loess plateau: flat-topped, a long gentle swell, the wheat's small undulations
  let h = 12.5 + fbm(noise, x * 0.0028 + (z > 0 ? 0 : 31), z * 0.0028, 4) * 3.2 + fbm(noise, x * 0.014 + 9, z * 0.014, 3) * 0.7;
  h += 2.5 * smoothstep(300, 520, x);                                                         // (the plateau rising east toward Rivne)
  // the Styr's sunk valley: a flat floodplain, then steep loess sides
  h = 1.4 + (h - 1.4) * smoothstep(38, 112, d) ** 1.3;
  // the promontory: the town on its hill, the castle mound at the tip
  if (inLoop(x, z)) h += 2.2 * smoothstep(110, 40, Math.hypot(x + 170, z - 15)) + 2.5 * smoothstep(42, 14, Math.hypot(x - CASTLE.x, z - CASTLE.z));
  // the ravines: steep, wooded, their floors running down to the valley
  RAVINES.forEach(([c, dep], i) => {
    const r = ravD[i](x, z);
    if (r < 60) h -= dep * (1 - smoothstep(5, 42, r)) * smoothstep(0, 1, h / 10);
  });
  for (const p of points) if (p.id !== 'F') h += (h * 0.6 + 4.5 - h) * smoothstep(40, 18, Math.hypot(x - p.x, z - p.z)) * 0.4;
  for (const bz of [BASE_Z, -BASE_Z]) h += (12 - h) * smoothstep(34, 16, Math.hypot(x, z - bz));
  h += (12.5 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, EXT, 3);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

/** The two trench lines of each side across the whole field: the first line and the support line, each its own wander. */
const trenchZ = (x: number, north: boolean, line: number) => (north
  ? (line ? 372 : 228) + 9 * Math.sin(x * 0.017 + line) + 14 * smoothstep(100, 300, x)
  : -(line ? 368 : 226) - 10 * Math.sin(x * 0.013 + 2 + line) - 14 * smoothstep(100, 300, x));
const inRavine = (x: number, z: number, m = 0) => ravD.some((f) => f(x, z) < 12 + m);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'lutsk',
  name: 'Lutsk',
  description: 'June 1916, the Brusilov Offensive: the Russian Eighth Army storms the deep Austro-Hungarian dugout lines on the Volhynian plateau and drives for Lutsk. The Styr loops round the old town and Lubart\'s castle in a sunk valley; east of the bend the open loess plateau, cut by wooded ravines.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['ah'] }, // (Kaledin's Eighth Army against Archduke Joseph Ferdinand's Fourth: maps/index.js armiesOn)
  sides: { nato: 'Russia', pact: 'Austria-Hungary' },
  conditions: { time: 'dawn', weather: 'clear' }, // (the guns opened at dawn on 4 June, a fine early-summer day)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1916,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: 1916, cell: 90, weights: [0.15, 0.5, 0.1, 0.25] as any }),

  theme: {
    // a bright early-summer day on the plateau
    fogColor: 0xb4b8ae, fogDensity: 0.0011, skyTop: 0x5e86b0, skyHorizon: 0xccd2ca, skyBottom: 0x84867c,
    sunColor: 0xfff2d8, sunIntensity: 2.0, sunDisk: 0.3, clouds: 0.3, cloudLight: 0xf0f0ea, cloudDark: 0x9aa0a6,
    sunDir: [0.5, 0.65, 0.45], hemiSky: 0xc6ced8, hemiGround: 0x5e5838, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#5c6c38', grassAlt: '#50622f', dryGrass: '#9a9058', dirt: '#5e4e3a', rock: '#86827a', strip: '#4a3e2e',
      pasture: '#5a6c38', ploughed: '#5a4a38', stubble: '#a49a5a', meadow: '#66743e',   // (the black earth of Volhynia)
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-340, 0, 360], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x6a5a46, 0.85];                                     // dirt roads
        if (y < 1.7 && riverD(x, z) < HW + 14) return [0x8a8462, 0.85];                 // the reedy banks
        if (y < 2.2 && riverD(x, z) < 50) return [0x62743e, 0.5];                       // the wet meadow on the floodplain
        if (inRavine(x, z, -4)) return [0x6a5a40, 0.45];                               // (the loess showing in the ravine sides)
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-340, 0, 360] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 380] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 370 }, pact: { x: 0, z: -370 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side's two lines (three belts of wire before the first, one before the support line), MG posts at the roads, the registered shell holes. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      for (const line of [0, 1]) {
        const pts: number[][] = [];
        for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato', line)]);   // (left to right as its owner looks)
        for (const w of trenchLine(pts, f, { wireAt: line ? 18 : 22, belts: line ? 1 : 3, gapEvery: line ? 50 : 70 })) {
          if (roadD(w.x, w.z) < 8 || riverD(w.x, w.z) < HW + 10 || inRavine(w.x, w.z, -3) || airD(w.x, w.z) < 10) continue;
          works.push(w);
        }
        for (const bx of [-340, 0, 360]) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato', line) - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      }
    }
    const dens = (x: number, z: number) => { const dz = Math.abs(z) - 190; return 0.8 * Math.exp(-((dz / 40) ** 2)) + 0.03; };
    const blasts = [...shellField(1916, BOUNDS, dens).filter((b: number[]) => b[1] >= 0), ...shellField(1917, BOUNDS, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => riverD(b[0], b[1]) > HW + 12 && !onRoad(b[0], b[1]) && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 35));
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => riverD(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => [0, 1].some((l) => Math.abs(z - trenchZ(x, z > 0, l)) < (l ? 22 : 34));
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z) || inRavine(x, z, 4) || airD(x, z) < 25;

    // Lutsk on its promontory: town houses round the old town's market, the cathedral, Lubart's castle at the tip
    const cathedral = { x: -110, z: 50 };
    props.rand = mulberry32(1916_1);
    for (let i = 0, n = 0; n < 34 && i < 700; i++) {
      const a = props.rand() * Math.PI * 2, d = 24 + props.rand() * 90, x = -150 + Math.cos(a) * d * 1.5, z = 10 + Math.sin(a) * d * 0.9;
      if (!inLoop(x, z) || wet(x, z, 18) || roadD(x, z) < 7 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 40 || Math.hypot(x - cathedral.x, z - cathedral.z) < 16 || Math.hypot(x + 170, z - 15) < 16) continue;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.6 ? 1 : 0), damaged: 0.1 });
      n++;
    }
    props.church({ x: cathedral.x, z: cathedral.z, yaw: 0.1 });
    // Lubart's castle: brick curtain walls round a square on its mound, a tower at each corner, the gate toward the town
    const cw = 0x8a5a44, cx = CASTLE.x + 4, cz = CASTLE.z;
    for (const [dx, dz, yaw, len] of [[22, 0, Math.PI / 2, 40], [0, -22, 0, 40], [0, 22, 0, 40], [-22, -13, Math.PI / 2, 18], [-22, 13, Math.PI / 2, 18]]) {
      props.lowWall({ x: cx + dx, z: cz + dz, yaw, length: len, height: 5, color: cw });
    }
    for (const [dx, dz] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) props.column({ x: cx + dx, z: cz + dz, radius: 3.4, height: 11 });
    props.townHouse({ x: cx + 9, z: cz + 10, yaw: Math.PI / 2, width: 14, depth: 9, storeys: 2, name: 'castle palace', damaged: 0 });
    // the villages on the plateau, the monastery at Zhydychyn, the village in the ravine head at Ozerdiv
    for (const p of points) {
      if ('AKEF'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, p.id === 'D' ? 4 : 7, 1916 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.15);
    }
    props.rand = mulberry32(1933);
    props.church({ x: 392, z: 274, yaw: 0.4 });                  // Zhydychyn's monastery church
    props.lowWall({ x: 392, z: 296, yaw: 0.4, length: 30, height: 2, color: 0xb0aa98 });
    props.church({ x: 140, z: 322, yaw: 0.1 });                   // Podhaitsi
    props.church({ x: -84, z: -304, yaw: Math.PI + 0.2 });        // Torchyn
    props.church({ x: 362, z: -14, yaw: Math.PI / 2 });           // Ozerdiv
    // the pioneers' stores by each pontoon bridge
    for (const c of river.crossings.filter((c: any) => c.pontoon)) {
      const s = Math.sign(c.z);
      props.rand = mulberry32(1949 + Math.round(c.x));
      const z = c.z + (HW + 18) * s;
      props.logPile({ x: c.x + 14, z, yaw: props.rand() * 0.6, length: 7 });
      props.crates({ x: c.x - 14, z: z + 6 * s, yaw: props.rand() * 3 });
    }
    // farmsteads, field walls and hay over the plateau
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 120 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (riverD(x, z) < 110 || inLoop(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...river.crossings.map((c: any) => ({ x: c.x, z: c.z, r: HW + 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || airD(x, z) < 12 || (inLoop(x, z) && Math.hypot((x + 60) * 0.6, z) < 120) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const tN = 0.24, tP = evenThreshold(wood, tN, (_x, z) => z > 0);   // (small woods only: the plateau is open)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3000, hedges: 1200, autumn: 0, broadleaf: 0.75,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (inRavine(x, z, 8)) return 0.8;                                    // oak, hornbeam and thorn down the ravines
        if (trenchBand(x, z)) return 0.03;
        if (riverD(x, z) < 60) return 0.25;                                   // willows and alders along the Styr
        if (riverD(x, z) < 110) return 0.12;                                  // (scrub on the valley's steep sides)
        return wood(x, z) > (z > 0 ? tN : tP) ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
