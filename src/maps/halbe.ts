// Halbe, 24–30 April 1945 (1945 only; Eastern Front; the big field, 1.0 × 1.12 km): the Halbe pocket south-east of
// Berlin. Busse’s Ninth Army, cut off in the Spree forest, broke west through the pines toward the Elbe and Wenck’s
// Twelfth Army, and the 1st Ukrainian and 1st Belorussian Fronts closed on it at Halbe: the village was fought through
// house by house, the sandy forest tracks jammed with burnt-out lorries, carts and half-tracks under the shelling. Here
// the map runs west (+z, the Red Army’s blocking line, toward Teupitz and the Baruth road) to east (−z, the pocket and
// the Spree forest, the Lübben road). Across the middle lie the Berlin–Dresden autobahn on its embankment (on the
// Soviet side of the village) and the Berlin–Görlitz railway with Halbe station (on the German side), both on the
// slant; Halbe between them with its church and main street; Teurow and Löpten on the flanks of the middle row. On the
// Soviet half Teupitz by the long Teupitzer See, Massow and Groß Köris; on the German half Märkisch Buchholz, Briesen
// and Prieros by the Wolziger See. Pine forest everywhere else, low sandy dunes, clearings round the villages.
// Not a mirror but fair: each side has one embankment in front of the middle row (the autobahn for the Red Army, the
// railway for the Wehrmacht, both a little over a metre high and 45 m off the middle line), one long lake on its outer
// flank with a village on its shore, two more villages in their clearings, a flank road and a forest track through
// the woods to each middle point; its points stand as far from its base as the other side’s, and the forest and dunes
// are noise, not the same shapes, so neither side starts with the high ground (measured: tools/map_fairness.py).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createLakes } from '../world/Lakes.js';
import { commandPost, shellField } from './common.js';
import { segDist, farmVillage } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1945_0424);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---- the autobahn (Soviet side) and the railway (German side): straight, on the slant, 45 m either side of the middle line
const SLANT = 0.1, NORM = Math.sqrt(1 + SLANT * SLANT), YAW = Math.atan2(1, SLANT); // (yaw along the line)
const autoZ = (x: number) => 45 + SLANT * x;
const railZ = (x: number) => -45 + SLANT * x;
const autoDist = (x: number, z: number) => Math.abs(z - autoZ(x)) / NORM;
const railDist = (x: number, z: number) => Math.abs(z - railZ(x)) / NORM;

// ---- the roads: the Baruth–Halbe–Lübben road down the middle, a road on each flank, the forest tracks across each half
const ROADS = [
  [[0, 560], [0, BASE_Z], [-30, 470], [-10, 240], [0, 0], [-30, -225], [-30, -470], [0, -BASE_Z], [0, -560]],
  [[-130, 560], [-180, 420], [-330, 230], [-280, -35], [-360, -185], [-200, -420], [-130, -560]],
  [[130, 560], [180, 420], [340, 215], [330, 10], [300, -255], [180, -420], [130, -560]],
  [[-330, 230], [-10, 240], [340, 215]],
  [[-360, -185], [-30, -225], [300, -255]],
];
const TRACKS = new Set([3, 4]); // (the sandy forest tracks)
const roadDist = (x: number, z: number) => { let d = Infinity; for (const p of ROADS) d = Math.min(d, segDist(p, x, z)); return d; };
const trackDist = (x: number, z: number) => Math.min(segDist(ROADS[3], x, z), segDist(ROADS[4], x, z));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Baruth road', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Teupitz', x: -330, z: 230, owner: null, sector: 'west' },
  { id: 'C', name: 'Massow', x: -10, z: 240, owner: null, sector: 'centre' },
  { id: 'D', name: 'Groß Köris', x: 340, z: 215, owner: null, sector: 'east' },
  { id: 'E', name: 'Teurow', x: -280, z: -35, owner: null, sector: 'west' },
  { id: 'F', name: 'Halbe', x: 0, z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Löpten', x: 330, z: 10, owner: null, sector: 'east' },
  { id: 'H', name: 'Märkisch Buchholz', x: -360, z: -185, owner: null, sector: 'west' },
  { id: 'I', name: 'Briesen', x: -30, z: -225, owner: null, sector: 'centre' },
  { id: 'J', name: 'Prieros', x: 300, z: -255, owner: null, sector: 'east' },
  { id: 'K', name: 'Lübben road', x: -30, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the lakes: the long Teupitzer See on the Soviet flank, the Wolziger See on the German one
const lakes = createLakes({ lakes: [
  { x: -460, z: 205, rx: 46, rz: 128, rot: 0.12, depth: 5, seed: 1 },
  { x: 458, z: -225, rx: 52, rz: 112, rot: -0.2, depth: 4.5, seed: 2 },
] });
const LAKE_BOX = lakes.lakes.map((L) => { const r = Math.max(L.rx, L.rz) * 1.25 + 62; return [L.x - r, L.x + r, L.z - r, L.z + r]; });
const nearLake = (x: number, z: number) => LAKE_BOX.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
const wetQ = (x: number, z: number) => (nearLake(x, z) ? lakes.q(x, z) : Infinity);

/** The broad lie of the sand (what the embankments are laid on), and the dunes on top of it. */
const lie = (x: number, z: number) => 4 + fbm(noise, x * 0.004 + 21, z * 0.004 - 8, 3) * 3.2;
const dunes = (x: number, z: number) => fbm(noise, x * 0.018 + 3, z * 0.018 + 41, 2) * 1.4;

function height(x: number, z: number) {
  const base = lie(x, z);
  let h = base + dunes(x, z);
  h += smoothstep(500, 620, Math.abs(x)) * 12 + smoothstep(560, 680, Math.abs(z)) * 10;
  h += (base - h) * smoothstep(70, 30, Math.hypot(x, z));                         // Halbe on level ground
  for (const bz of [BASE_Z, -BASE_Z]) h += (lerp(4, h, 0.3) - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  const rd = roadDist(x, z);
  if (rd < 8) h = lerp(h, base + 0.3, smoothstep(8, 4, rd) * 0.7);                // the roads smooth the dunes
  const ad = autoDist(x, z);
  if (ad < 22) h = lerp(h, base + 1.3, smoothstep(22, 12, ad));                   // the autobahn on its embankment
  const ld = railDist(x, z);
  if (ld < 10) h = lerp(h, base + 1.2, smoothstep(10, 4, ld));                    // the railway on its bank
  if (nearLake(x, z)) h = lakes.carve(x, z, h);
  return h;
}

const woodsK = (x: number, z: number) => smoothstep(-0.32, -0.12, fbm(noise, x * 0.005 + 57, z * 0.005 + 13, 3));
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
/** The clearings round the villages and the bases (fields, gardens). */
const clearing = (x: number, z: number) => nearPoint(x, z, 75) || Math.hypot(x, Math.abs(z) - BASE_Z) < 70;

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'halbe',
  name: 'Halbe',
  description: 'April 1945, the Halbe pocket south-east of Berlin: the Ninth Army breaks west through the pine forest and its sandy tracks while the Red Army closes the ring. Halbe between the autobahn and the railway, Teupitz on its lake, burnt-out columns in the woods.',
  epochs: ['1945'],
  region: 'east', // (the menu’s Eastern Front: maps/index.js REGIONS)
  sides: { nato: 'Soviet Union', pact: 'Germany' },
  armies: { nato: ['sov'], pact: ['wh', 'fj'] },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1945_0424,
  height,
  river: lakes,
  woods: (x: number, z: number) => (clearing(x, z) ? 0 : woodsK(x, z) * 0.85),
  fields: createFields({ seed: 1945_24, cell: 70 }),

  theme: {
    // a smoky April day over the pines
    fogColor: 0xa6aaa8, fogDensity: 0.0018,
    skyTop: 0x6684a2, skyHorizon: 0xc0c4c2, skyBottom: 0x7e8076,
    sunColor: 0xfff0d8, sunIntensity: 1.9, sunDisk: 0.4,
    clouds: 0.6, cloudLight: 0xeceae6, cloudDark: 0x92969c,
    sunDir: [0.35, 0.6, 0.6],
    hemiSky: 0xbcc8d4, hemiGround: 0x54503a, hemiIntensity: 1.2,
    rimColor: 0xc8d0d8, rimIntensity: 0.22,
    terrain: {
      grass: '#5a6a34', grassAlt: '#526232', dryGrass: '#8e8656', dirt: '#7a6a4a', rock: '#7a7464',
      pasture: '#62743a', ploughed: '#6a5a40', stubble: '#a09060', meadow: '#6a7c3e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0, // (no default tracks: the roads are painted below)
      surface(x: number, z: number, y: number) {
        const ad = autoDist(x, z);
        if (ad < 9) return ad < 1.6 ? [0x5e6a3a, 0.8] : [0x8a8882, 0.9];              // the autobahn’s concrete, the grass strip between
        if (ad < 13) return [0x6a6248, 0.5];
        if (railDist(x, z) < 3) return [0x4e4a44, 0.9];                                // ballast
        const rd = roadDist(x, z);
        if (rd < 4) return [trackDist(x, z) < 4 ? 0xa8966a : 0x7a7060, 0.85];         // the sandy tracks, the gravel roads
        if (rd < 6.5) return [0x8a7a58, 0.45];
        if (y < 0.75) return [0x3a3826, 0.8];                                          // the lake shores
        if (!clearing(x, z) && woodsK(x, z) > 0.5) return [0x5e5034, 0.35];           // pine needles on the sand
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  /** The shelling of the pocket: craters thick round Halbe and the middle, thinning toward both bases. */
  battlefield() {
    const blasts = shellField(1945_0425, { x: 480, z: 540 }, (x: number, z: number) => 0.7 * smoothstep(300, 30, z) * (roadDist(x, z) < 8 || autoDist(x, z) < 14 || railDist(x, z) < 6 || wetQ(x, z) < 1.3 || nearPoint(x, z, 30) ? 0 : 1));
    return { blasts, ruins: [], works: [] };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const wet = (x: number, z: number) => wetQ(x, z) < 1.25;
    const busy = (x: number, z: number, r = 10) => roadDist(x, z) < r || autoDist(x, z) < r + 6 || railDist(x, z) < r || wet(x, z);

    // ---- Halbe: brick houses along the main street (the middle road) and the cross street, the church, the station
    props.rand = mulberry32(1945_01);
    {
      const r = props.rand;
      const placed: number[][] = [];
      const house = (x: number, z: number, yaw: number) => {
        if (busy(x, z, 8) || placed.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 11) || Math.hypot(x + 34, z - 18) < 16 || Math.hypot(x - 70, z + 26) < 16) return;
        placed.push([x, z]);
        props.townHouse({ x, z, yaw, width: 8 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.5 ? 2 : 1, name: 'brick house', damaged: 0.45 });
      };
      for (let t = -34; t <= 34; t += 12) {                 // along the main street (z)
        if (Math.abs(t) < 10) continue;
        if (r() > 0.1) house(-13, t, Math.PI / 2);
        if (r() > 0.1) house(13, t, -Math.PI / 2);
      }
      for (let t = -150; t <= 150; t += 13) {               // along the cross street (on the slant)
        if (Math.abs(t) < 24) continue;
        const z = SLANT * t;
        if (r() > 0.15) house(t, z - 14, YAW - Math.PI / 2);
        if (r() > 0.15) house(t, z + 14, YAW + Math.PI / 2);
      }
    }
    props.church({ x: -34, z: 18, yaw: Math.PI / 2 });
    props.townHouse({ x: 70, z: railZ(70) + 13, yaw: YAW + Math.PI / 2, width: 18, depth: 8, storeys: 2, name: 'Halbe station', damaged: 0.5 });
    props.rails({ x0: -620, z0: railZ(-620), x1: 620, z1: railZ(620) });
    for (const [x, kind, c] of [[100, 'box', 0x5a3426], [113, 'open', 0x4a4038], [126, 'box', 0x4e3a2a], [-380, 'tank', 0x2a2a2a], [-393, 'box', 0x5a3426], [420, 'open', 0x4a4038]] as [number, string, number][]) {
      props.wagon({ x, z: railZ(x), yaw: YAW, kind, color: c });
    }
    // the fight for the village: barricades on the main street, sandbagged posts at the autobahn and the railway
    props.logBarricade({ x: -10, z: 30, yaw: 0, length: 5 });
    props.logBarricade({ x: 6, z: -28, yaw: 0.1, length: 5 });
    for (const x of [-200, -60, 90, 230]) props.sandbagRing({ x, z: autoZ(x) + 20, radius: 4.5, toward: -1 });
    for (const x of [-230, -90, 60, 200]) props.sandbagRing({ x, z: railZ(x) - 18, radius: 4.5, toward: 1 });

    // ---- the villages in their clearings
    const skip = (x: number, z: number) => busy(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40;
    for (const [id, seed] of [['B', 11], ['C', 12], ['D', 13], ['E', 14], ['G', 15], ['H', 16], ['I', 17], ['J', 18]] as [string, number][]) {
      const p = points.find((q) => q.id === id)!;
      farmVillage(props, p.x, p.z, 7, 1945_100 + seed, skip, 1.1);
    }

    // ---- the burnt-out columns: lorries, half-tracks and cars along the roads, the tracks and the autobahn
    props.rand = mulberry32(1945_03);
    {
      const r = props.rand;
      for (let i = 0; i < 90; i++) {
        const p = ROADS[i % ROADS.length], k = Math.floor(r() * (p.length - 1)), t = r();
        const x0 = p[k][0] + (p[k + 1][0] - p[k][0]) * t, z0 = p[k][1] + (p[k + 1][1] - p[k][1]) * t, side = r() < 0.5 ? -1 : 1;
        const len = Math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) || 1;
        const off = TRACKS.has(i % ROADS.length) ? 6.5 : 7.5;
        const x = x0 + side * off * (p[k + 1][1] - p[k][1]) / len, z = z0 - side * off * (p[k + 1][0] - p[k][0]) / len;
        if (nearPoint(x, z, 30) || Math.abs(z) > 450 || wet(x, z) || roadDist(x, z) < 6 || autoDist(x, z) < 14 || railDist(x, z) < 8) continue;
        props.wreckCar({ x, z, yaw: Math.atan2(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) + (r() - 0.5) * 1.2 });
      }
      for (let i = 0; i < 24; i++) {                          // on the autobahn’s shoulders
        const x = (r() * 2 - 1) * 460, side = r() < 0.5 ? -1 : 1, z = autoZ(x) + side * 11;
        if (nearPoint(x, z, 30) || roadDist(x, z) < 10) continue;
        props.wreckCar({ x, z, yaw: YAW + (r() - 0.5) * 0.8 });
      }
      for (let i = 0; i < 50; i++) {                          // what the columns left in the clearings: crates, tents, log piles
        const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 440;
        if (!clearing(x, z) || nearPoint(x, z, 34) || busy(x, z, 9) || Math.hypot(x, Math.abs(z) - BASE_Z) < 50) continue;
        const k = r();
        if (k < 0.35) props.crates({ x, z, yaw: r() * 3 });
        else if (k < 0.55) props.tent({ x, z, yaw: r() * 3, color: 0x55583c });
        else if (k < 0.8) props.logPile({ x, z, yaw: r() * 3, length: 6 });
        else props.sandbagRing({ x, z, radius: 4, toward: z > 0 ? -1 : 1 });
      }
    }
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5236);
    props.finish();
    lakes.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z) || roadDist(x, z) < 8 || autoDist(x, z) < 15 || railDist(x, z) < 7 }];
    // the pines of the Spree forest, birches at the edges, fruit trees in the villages
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 10000, broadleaf: 0.2, autumn: 0, maxY: 40,
      forest: (x: number, z: number) => {
        if (wet(x, z) || roadDist(x, z) < 9 || autoDist(x, z) < 16 || railDist(x, z) < 8 || nearPoint(x, z, 28) || Math.hypot(x, z) < 70) return -1;
        if (clearing(x, z)) return 0.06;
        return woodsK(x, z) > 0.5 ? 1 : -0.02;
      },
    });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        grass.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
