// Vienna, November 1918: the battle that never came. After Vittorio Veneto the Austro-Hungarian army in Italy fell
// apart, and the Allies planned to march on: up through Austria toward Vienna and on into Bavaria, to take Germany from
// the south. The armistice of Villa Giusti (3 November 1918) made it unnecessary — Austria-Hungary was out, and the
// Empire broke up within days. On this map the advance goes on: the Italian armies, with the British and French
// divisions in Italy, come up the Südbahn from the Semmering and the Vienna basin toward the capital, and the last
// k.u.k. regiments, stiffened by a German corps sent down to hold the Danube line, stand on the city’s south-west edge.
// On the map (the city to the north, −z; the road from Baden and the Semmering to the south, +z): the Wienerwald’s
// beech-wooded hills along the whole west side, the abbey of Heiligenkreuz in a clearing; the Kahlenberg–Leopoldsberg
// ridge in the north-west corner, its church of St Joseph on the top and the Leopoldsberg’s church and castle walls on
// the cliff over the Danube, vineyards on its lower slopes down to the Heurigen village of Grinzing; the Danube cutting
// that corner; across from it the Anninger over Mödling in the south-east, its Husarentempel and lookout tower, its
// vineyards (Gumpoldskirchen’s) down its slopes, the Laxenburg Schlossteich in that corner; the Südbahn (the Semmering
// line) up its shallow valley base to base, through Mödling and Liesing to its terminus by the Vienna base; the
// Triester Straße up the middle through Perchtoldsdorf, the Heurigen town with its Wehrturm, to the Schönbrunn palace,
// its parterre, its bosquets and the Gloriette on its hill; the Wienerberg brickworks with their chimneys; the
// Austro-Hungarian last-ditch lines across the middle and the Italians’ lines opposite.
// Not mirrored but fair: each side has one big wooded height on its flank at the same reach from its base, the
// Kahlenberg (pact, west) and the Anninger (nato, east), point for point across the middle, each with a road up its
// gentle end and vineyards on its lower slopes, a water corner behind it (the Danube, the Laxenburg pond); each has an
// imperial or market town in its centre third with a little hill behind it (Schönbrunn and the Gloriette, Mödling and
// the Eichkogel), a third point on the other flank (Heiligenkreuz in the Wienerwald, the Wienerberg brickworks on its
// rise), two trench lines at the same depth, and the Südbahn and the Triester Straße run through both halves. The
// Wienerwald runs the length of the west side, so both halves share it alike.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, shellField, buildSite } from './common.js';
import { plantTrees, plantHedgerows, growGround } from '../world/Vegetation.js';
import { farmVillage, segDist, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SEED = 1918_1103;
const EXT = { x: 640, z: 700 };
const noise = createNoise2D(SEED);
const MUD = new THREE.Color(0x56483a);

// ---- the water: the Danube across the north-west corner, the Laxenburg Schlossteich in the south-east
const DANUBE = [[-740, -190, 58], [-560, -350, 58], [-430, -490, 58], [-360, -670, 58]];
const POND = [[600, 400, 36], [480, 480, 40], [420, 640, 40]];
const river = createRiver({ paths: [DANUBE, POND], halfWidth: 50, level: 0, depth: 3, valley: 40, crossings: [] });
const D2 = DANUBE.map(([x, z]) => [x, z]), P2 = POND.map(([x, z]) => [x, z]);
/** How far (x, z) is from the water’s edge. */
const wetD = (x: number, z: number) => Math.min(segDist(D2, x, z) - 58, segDist(P2, x, z) - 38);
const isNato = (_x: number, z: number) => z > 0;

// ---- the two heights: the Kahlenberg–Leopoldsberg ridge (pact, north-west), the Anninger (nato, south-east)
type Ell = { x: number; z: number; rx: number; rz: number; rot: number; h: number };
const KAHL: Ell = { x: -330, z: -320, rx: 210, rz: 95, rot: 0.75, h: 34 };
const ANN: Ell = { x: 330, z: 320, rx: 200, rz: 100, rot: 0.55, h: 43 };
const ellQ = (e: Ell, x: number, z: number) => {
  const dx = x - e.x, dz = z - e.z, c = Math.cos(e.rot), s = Math.sin(e.rot);
  return Math.hypot((dx * c + dz * s) / e.rx, (dz * c - dx * s) / e.rz);
};
const onAxis = (e: Ell, t: number) => [Math.round(e.x + t * Math.cos(e.rot)), Math.round(e.z + t * Math.sin(e.rot))];
const hillK = (x: number, z: number) => Math.max(0, 1 - Math.min(ellQ(KAHL, x, z), ellQ(ANN, x, z)));
const [HX, HZ] = onAxis(KAHL, 42), [DX, DZ] = onAxis(ANN, -42);          // the summits, each toward the middle
const KAHL_FOOT = onAxis(KAHL, 165), ANN_FOOT = onAxis(ANN, -160);       // each one’s gentle end, where its road starts up
const LEOP = onAxis(KAHL, -100);                                         // the Leopoldsberg over the Danube
/** The little hills behind the centre towns [x, z, r, h]: the Gloriette’s, the Eichkogel; the Wienerberg’s rise. */
const KNOLLS = [[-110, -420, 48, 9], [-110, 420, 48, 9], [345, -305, 110, 11]];

// ---- the points
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points: ControlPointDef[] = [
  P('A', 'Baden road', 0, 470, 'centre'),
  P('B', 'Heiligenkreuz', -295, 290, 'west'),
  P('C', 'Mödling', 90, 335, 'centre'),
  P('D', 'Anninger', DX, DZ, 'east', { radius: 28 }),
  P('E', 'Grinzing', -295, 10, 'west'),
  P('F', 'Perchtoldsdorf', 0, 0, 'centre', { radius: 28 }),
  P('G', 'Liesing', 365, -10, 'east'),
  P('H', 'Kahlenberg', HX, HZ, 'west', { radius: 28 }),
  P('I', 'Schönbrunn', -30, -335, 'centre'),
  P('J', 'Wienerberg', 355, -280, 'east'),
  P('K', 'Südbahnhof', 0, -470, 'centre'),
];
const pt = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the roads and the railway
const ROADS = [
  [[0, 580], [0, 470], [30, 400], pt('C'), [40, 200], [15, 90], [0, 0], [-15, -90], [-40, -200], pt('I'), [-30, -400], [0, -470], [0, -580]], // the Triester Straße
  [[0, 470], [-150, 440], [-260, 380], pt('B'), [-350, 160], pt('E')],                  // through the Wienerwald to Heiligenkreuz and Grinzing
  [[0, -470], [150, -440], [260, -380], pt('J'), [350, -160], pt('G')],                 // out past the Wienerberg to Liesing
  [[0, 470], [120, 420], [170, 330], ANN_FOOT, pt('D')], [ANN_FOOT, [260, 120], [340, 40], pt('G')],          // up the Anninger
  [[0, -470], [-120, -420], [-170, -330], KAHL_FOOT, pt('H')], [KAHL_FOOT, [-260, -120], [-340, -40], pt('E')], // up the Kahlenberg
  [pt('H'), LEOP],                                                                       // along the ridge to the Leopoldsberg
  [pt('B'), [-150, 320], pt('C')], [pt('C'), [150, 290], ANN_FOOT],
  [KAHL_FOOT, [-150, -300], pt('I')], [pt('I'), [200, -320], pt('J')],
  [pt('E'), [-160, 25], pt('F'), [160, -25], pt('G')],                                   // the middle: Grinzing, Perchtoldsdorf, Liesing
  [[-340, 580], [-340, 420], pt('B')], [[200, 580], [200, 440], [120, 420]],             // in from the flank entries
  [[340, -580], [340, -420], pt('J')], [[-200, -580], [-200, -430], [-120, -420]],
];
const RAIL = [[170, 580], [150, 450], [110, 360], [100, 250], [150, 120], [260, 40], [330, -10], [300, -140], [190, -290], [90, -400], [60, -462]];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), EXT, 2);
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), EXT, 2);

// ---- the ground: rolling Vienna basin, the Wienerwald’s hills along the west, the two heights, the Südbahn’s valley
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 4 + fbm(noise, x * 0.003, z * 0.003, 3) * 2.5 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.4;
  h += smoothstep(-60, -330, x) * (10 + 7 * fbm(noise, x * 0.006 + 5, z * 0.006, 3));                    // the Wienerwald
  h += KAHL.h * smoothstep(1.05, 0.12, ellQ(KAHL, x, z) + fbm(noise, x * 0.01 + 3, z * 0.01, 2) * 0.06);
  h += ANN.h * smoothstep(1.05, 0.12, ellQ(ANN, x, z) + fbm(noise, x * 0.01 - 9, z * 0.01, 2) * 0.06) ** 0.9;
  for (const [kx, kz, r, kh] of KNOLLS) h += kh * smoothstep(r, r * 0.25, Math.hypot(x - kx, z - kz));
  h -= 2.4 * (1 - smoothstep(8, 60, segDist(RAIL, x, z)));                                                   // the railway’s valley
  for (const p of points) if (p.id !== 'D' && p.id !== 'H') h += (5 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * 0.35;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4.5 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return h;
}, EXT, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// ---- the vineyards: the lower slopes of both heights (the side toward the middle), round Grinzing and Perchtoldsdorf, the Eichkogel
const vines = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 20 || roadD(x, z) < 5 || railD(x, z) < 8 || nearPt(x, z, 34)) return 0;
  let k = 0;
  for (const e of [KAHL, ANN]) {
    const q = ellQ(e, x, z), toMid = (x - e.x) * -e.x + (z - e.z) * -e.z;
    if (q > 0.72 && q < 1.08 && toMid > 0) k = 1;
  }
  if (Math.hypot(x + 295, z - 10) < 95 || Math.hypot(x, z) < 100 || Math.hypot(x + 110, z - 420) < 50) k = 1;
  return k && fbm(noise, x * 0.012 + 40, z * 0.012 - 9, 2) > -0.15 ? 1 : 0;
}, EXT, 4);

// ---- Schönbrunn: the palace, its parterre (the point stands on it), the bosquets either side, the Gloriette on its hill
const SCH = { x: -60, z: -372 };
const parterre = (x: number, z: number) => Math.abs(x - SCH.x) < 42 && z > SCH.z + 8 && z < SCH.z + 70;
const bosquet = (x: number, z: number) => Math.abs(x - SCH.x) < 120 && z > -440 && z < -305 && !parterre(x, z) && Math.abs(z - SCH.z) > 12;

// ---- the trench lines: the k.u.k. last-ditch lines and the Italian lines opposite, the same depths
const LINES = [{ z: 80, wireAt: 16, belts: 2, seed: 23 }, { z: 190, wireAt: 14, belts: 1, seed: 61 }];
const linePts = (z: number, f: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(f === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
  for (let x = -480; x <= 480; x += 40) pts.push([x, z + (r() - 0.5) * 12 + 8 * Math.sin(x * 0.011 + ph)]);
  return f === 'nato' ? pts : pts.map(([x, zz]) => [-x, -zz]);
};
const trenchBand = (_x: number, z: number) => LINES.some((l) => Math.abs(Math.abs(z) - l.z) < 24);
const nml = (_x: number, z: number) => 1 - smoothstep(40, 75, Math.abs(z));

// ---- the woods: the Wienerwald’s beech on the west side and both heights’ tops; willows by the water; the bosquets; copses on the plain
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const T_N = 0.42, T_P = evenThreshold((x, z) => (x > -150 && hillK(x, z) <= 0 ? wn(x, z) : -9), T_N, isNato);
const woodField = gridCache((x: number, z: number) => {
  const w = wetD(x, z);
  if (w < 4) return -1;
  if (w < 40) return 0.45;                                                                    // the Danube’s Au, the pond’s willows
  if (roadD(x, z) < 6 || railD(x, z) < 9 || vines(x, z) > 0.5 || parterre(x, z) || Math.abs(z) > 492) return 0;
  if (bosquet(x, z)) return 0.8;
  const hk = hillK(x, z);
  if (hk > 0.4) return fbm(noise, x * 0.02 + 30, z * 0.02, 2) > 0.35 ? 0 : 0.85;              // the heights’ beech woods, a meadow or two
  if (x < -150) return fbm(noise, x * 0.009 - 20, z * 0.009, 3) > -0.12 ? 0.85 : 0;            // the Wienerwald
  if (hk <= 0 && wn(x, z) > (isNato(x, z) ? T_N : T_P)) return 0.6;
  return 0;
}, EXT, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1º Plotone, Brigata Sassari' }];

export default {
  id: 'vienna',
  name: 'Vienna',
  description: 'November 1918, the march the armistice of Villa Giusti called off: the Italians and their allies on the south-west approaches to Vienna — the beech-wooded Wienerwald, the Kahlenberg and Leopoldsberg over the Danube, the Anninger over Mödling, Heurigen villages in their vineyards, the Südbahn up its valley, Schönbrunn’s palace and park and the last Austro-Hungarian lines.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (no strip long and flat enough clear of the Wienerwald, the vineyards, the railway and the trench lines: the aircraft come in from the map edge)
  armies: { nato: ['it', 'uk', 'fr'], pact: ['ah', 'de'] }, // (the Italian armies with the British and French divisions in Italy, against the last k.u.k. troops and a German corps sent to hold Vienna)
  sides: { nato: 'Italy, Britain and France', pact: 'Austria-Hungary and Germany' },
  conditions: { time: 'day', weather: 'overcast' },  // (mid-November: grey, the beeches gold)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: SEED, cell: 72, weights: [0.3, 0.32, 0.1, 0.28] as any }),
  woods: (x: number, z: number) => Math.max(0, woodField(x, z)) * 0.85,

  theme: {
    // a grey November day over the Vienna basin, the Wienerwald in its autumn gold
    fogColor: 0xa4a49c, fogDensity: 0.0014, skyTop: 0x5e6670, skyHorizon: 0xb6b4aa, skyBottom: 0x6a6860,
    sunColor: 0xeadcc4, sunIntensity: 1.7, sunDisk: 0.08, clouds: 0.8, cloudLight: 0xc0c0ba, cloudDark: 0x646a70,
    sunDir: [0.5, 0.55, 0.45], hemiSky: 0xc4c8cc, hemiGround: 0x504838, hemiIntensity: 1.35, rimColor: 0xb8bec4, rimIntensity: 0.25,
    terrain: {
      grass: '#57623a', grassAlt: '#4e5834', dryGrass: '#857a52', dirt: '#5e503e', rock: '#9c947e', strip: '#4c4032',
      pasture: '#58643a', ploughed: '#6e6050', stubble: '#8c7e56', meadow: '#606c3e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-340, 0, 200], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (roadD(x, z) < 3.4) return [0x8a8068, 0.8];                                       // the metalled roads
        if (railD(x, z) < 3) return [0x5a524a, 0.85];                                          // the Südbahn’s ballast
        if (y < 1.6 && wetD(x, z) < 24) return [0x4e5832, 0.7];                                 // the Au’s wet meadow
        if (parterre(x, z)) return (Math.abs(x - SCH.x) % 14) < 3 ? [0xc0b496, 0.85] : [0x5e7040, 0.7]; // the parterre’s gravel walks and lawns
        if (vines(x, z) > 0.5) return (x * 0.6 + z * 0.8) % 2.6 < 0.9 ? [0x4c3e2c, 0.75] : [0x8a7a44, 0.55]; // the vine rows, leaves turning
        const k = hillK(x, z);
        if (k > 0.4 && woodField(x, z) > 0.5) return [0x6a5430, 0.6];                         // beech-leaf litter
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-340, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [340, 0, -200] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, k.u.k. IR 4 Hoch- und Deutschmeister' })),
  },

  /** The two lines of each side across the middle, wire in front, MG posts; shell holes in no man’s land; a few houses knocked about. */
  battlefield(game: any) {
    const ok = (w: any) => wetD(w.x, w.z) > 20 && roadD(w.x, w.z) > 5 && railD(w.x, w.z) > 5 && !nearPt(w.x, w.z, 34) && hillK(w.x, w.z) < 0.5;
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, yaw = f === 'nato' ? Math.PI : 0;
      for (const l of LINES) for (const w of trenchLine(linePts(l.z, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: 70 })) if (ok(w)) works.push(w);
      for (const x of [-380, -150, 120, 360]) { const w = { kind: 'mgNest', x: x * s, z: s * (LINES[0].z - 6), yaw, faction: f }; if (ok(w)) works.push(w); }
    }
    const dens = (x: number, z: number) => (wetD(x, z) < 20 ? 0 : nml(x, z) * 1.2 + 0.04);
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter((b) => roadD(b[0], b[1]) > 5 && railD(b[0], b[1]) > 5);
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (Math.abs(b.z) < 120 ? 0.3 : 0.04)).map((b: any) => b.index);
    const paint = (terrain: any) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
        const k = nml(x, z) * (0.5 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5);
        if (k > 0.05 && wetD(x, z) > 20) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.5, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const skip = (x: number, z: number) => wetD(x, z) < 20 || roadD(x, z) < 8 || railD(x, z) < 9 || trenchBand(x, z) || parterre(x, z) || hillK(x, z) > 0.35;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V1 = new THREE.Vector3(1, 1, 1);
    const cone = (x: number, y: number, z: number, r: number, h: number, color: number, sides = 4) => {
      M.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)), V1);
      props.push('plain', new THREE.ConeGeometry(r, h, sides), M, color);
    };
    const tower = (x: number, z: number, w: number, h: number, color: number, roof = 0x3a3c42) => {
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + h / 2, z, w, h, w, 0, color);
      cone(x, g + h + w * 0.7, z, w * 0.75, w * 1.4, roof);
      cover.addBox({ x, z, yaw: 0, length: w, thickness: w, height: h });
    };

    // the villages and towns: Perchtoldsdorf the biggest, Grinzing among its vines, Mödling and Liesing on the railway
    for (const [id, n, sp] of [['F', 12, 1.4], ['E', 9, 1.2], ['C', 10, 1.3], ['G', 9, 1.25], ['B', 5, 1]] as [string, number, number][]) {
      const [x, z] = pt(id);
      farmVillage(props, x, z, n, 1918 * 13 + Math.round(x * 3 + z * 7), skip, sp);
    }
    props.rand = mulberry32(1918);
    for (const [x, z, yaw] of [[-26, 30, 0.2], [-265, 40, 0], [90, 360, Math.PI], [390, -40, Math.PI]]) if (!skip(x, z)) props.church({ x, z, yaw });
    tower(28, -30, 7, 24, 0xa89c84);                                                            // Perchtoldsdorf’s Wehrturm
    // the stations: Mödling, Liesing; the Südbahnhof at the line’s end by the Vienna base
    for (const [x, z, yaw, w, name] of [[125, 340, Math.PI / 2 + 0.3, 30, 'Bahnhof Mödling'], [300, 62, 0.6, 30, 'Bahnhof Liesing'], [95, -505, 0, 52, 'Südbahnhof']] as [number, number, number, number, string][])
      props.hall({ x, z, yaw, width: w, depth: 12, height: 8, color: 0xc8b48c, roof: 0x4a4c50, door: 6, name });
    props.hall({ x: 380, z: -60, yaw: 0.2, width: 26, depth: 16, height: 9, color: 0x8a5a44, roof: 0x4a4c4e, door: 5, name: 'Brauerei Liesing' });
    props.chimney({ x: 398, z: -78, height: 28 });
    for (const [x0, z0, x1, z1] of [[60, -470, 125, -350], [70, -462, 140, -360]]) props.rails({ x0, z0, x1, z1 });   // the terminus sidings
    for (let i = 0; i < RAIL.length - 1; i++) { const [x0, z0] = RAIL[i], [x1, z1] = RAIL[i + 1]; props.rails({ x0, z0, x1, z1 }); }
    for (const [x, z, yaw, kind] of [[130, -405, 0.8, 'box'], [118, -390, 0.8, 'tank'], [128, 400, -0.2, 'box']] as [number, number, number, string][]) props.wagon({ x, z, yaw, kind });

    // Heiligenkreuz: the abbey in its clearing in the Wienerwald
    props.hall({ x: -365, z: 320, yaw: 0, width: 38, depth: 14, height: 10, color: 0xd8ccb0, roof: 0x5a3a2e, door: 4, name: 'Stift Heiligenkreuz' });
    props.church({ x: -300, z: 330, yaw: Math.PI / 2 });
    props.lowWall({ x: -365, z: 340, yaw: 0, length: 44, height: 2.2, color: 0xc8bc9c });

    // the Kahlenberg: the church of St Joseph and the hotel on top; the Leopoldsberg’s church and castle walls over the Danube
    props.church({ x: HX - 30, z: HZ - 24, yaw: 0.75 });
    props.hall({ x: HX + 30, z: HZ - 30, yaw: 0.75, width: 22, depth: 12, height: 9, color: 0xe0d4b4, roof: 0x5a3a2e, door: 4, name: 'Hotel Kahlenberg' });
    props.church({ x: LEOP[0], z: LEOP[1], yaw: 0.75 + Math.PI / 2 });
    for (const [dx, dz, yaw, len] of [[-20, 14, 0.75, 30], [16, -20, 0.75 + Math.PI / 2, 24], [-26, -10, 0.75 + Math.PI / 2, 18]]) props.lowWall({ x: LEOP[0] + dx, z: LEOP[1] + dz, yaw, length: len, height: 3, color: 0x9a927e });
    // the Anninger: the Husarentempel (a little classical temple on its columns) and the Wilhelmswarte lookout tower
    {
      const tx = DX + 34, tz = DZ + 20, g = terrain.heightAt(tx, tz);
      props.box('stone', tx, g + 0.5, tz, 14, 1, 9, 0.55, 0xd4ccb8);
      for (const a of [-5.5, -1.8, 1.8, 5.5]) for (const b of [-3, 3]) { const [cx, cz] = PropBuilder.local(tx, tz, 0.55, a, b); props.column({ x: cx, z: cz, radius: 0.5, height: 5 }); }
      props.box('stone', tx, g + 6.4, tz, 14, 1.2, 9, 0.55, 0xd4ccb8);
      tower(DX - 30, DZ + 26, 4.5, 14, 0x8a8070, 0x6a4a34);
    }

    // Schönbrunn: the palace in its yellow, the Gloriette’s arcade on the hill behind, the Neptune fountain’s basin
    {
      const { x, z } = SCH;
      props.hall({ x, z, yaw: Math.PI, width: 76, depth: 16, height: 14, color: 0xe0b84c, roof: 0x5c646a, door: 6, name: 'Schloss Schönbrunn' });
      for (const s of [-1, 1]) props.hall({ x: x + s * 46, z: z + 16, yaw: Math.PI / 2, width: 18, depth: 10, height: 9, color: 0xe0b84c, roof: 0x5c646a, door: 4, name: 'Schönbrunn wing' });
      const gx = KNOLLS[0][0], gz = KNOLLS[0][1], g = terrain.heightAt(gx, gz);
      props.box('stone', gx, g + 1, gz, 46, 2, 7, 0, 0xd8d0bc);
      for (let a = -21; a <= 21; a += 3.5) props.column({ x: gx + a, z: gz, radius: 0.45, height: 7 });
      props.box('stone', gx, g + 10, gz, 46, 2, 7, 0, 0xd8d0bc);
      cover.addBox({ x: gx, z: gz, yaw: 0, length: 46, thickness: 4, height: 11 });
      props.box('plain', x, terrain.heightAt(x, z + 60) + 0.25, z + 60, 22, 0.5, 9, 0, 0x5a6c6a);
    }
    // the Wienerberg: the brickworks (Wienerberger), their kilns and chimneys, the clay pits; the Spinnerin am Kreuz
    for (const [x, z, yaw] of [[360, -320, 0.3], [300, -335, 0.3]]) props.hall({ x, z, yaw, width: 34, depth: 14, height: 7, color: 0x9a5a42, roof: 0x4a4440, door: 6, name: 'Ziegelofen' });
    for (const [x, z] of [[372, -350], [290, -362]]) props.chimney({ x, z, height: 34 });
    props.column({ x: 255, z: -255, radius: 1, height: 12 });
    // the Laxenburg Franzensburg on its pond, the Eichkogel’s press-houses
    props.hall({ x: 390, z: 430, yaw: 0.6, width: 18, depth: 14, height: 10, color: 0x9a8a72, roof: 0x7a3e2c, door: 4, name: 'Franzensburg' });
    tower(402, 412, 5, 18, 0x9a8a72);
    for (const [x, z] of [[-90, 450], [-140, 420], [-80, 395]]) if (!skip(x, z)) props.house({ x, z, yaw: 0.4, width: 8, depth: 6 });

    // the back edges: Vienna’s suburbs (Favoriten, Meidling) behind the pact base, Baden’s villas behind the nato base
    const town = (x0: number, x1: number, z0: number, z1: number, seed: number, villas: boolean) => {
      props.rand = mulberry32(seed);
      for (let z = z0; z <= z1; z += 15) for (let x = x0; x <= x1; x += 13) {
        const px = x + (props.rand() - 0.5) * 3, pz = z + (props.rand() - 0.5) * 3;
        if (wetD(px, pz) < 20 || roadD(px, pz) < 8 || railD(px, pz) < 10 || Math.hypot(px, Math.abs(pz) - BASE_Z) < 50 || bosquet(px, pz) || Math.abs(px - 95) < 34 && pz < -490 || hillK(px, pz) > 0.1) continue;
        if (villas && props.rand() < 0.4) continue;
        props.townHouse({ x: px, z: pz, yaw: Math.round(props.rand()) * Math.PI, width: 8, depth: 9, storeys: villas ? 2 : 3 + Math.round(props.rand()), damaged: 0 });
      }
    };
    town(55, 330, -552, -492, 57, false);
    town(-330, -55, -552, -492, 59, false);
    town(-330, -55, 492, 552, -57, true);
    town(55, 330, 492, 552, -59, true);

    // farmsteads, field walls and hay (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay'];
    for (let tries = 0, n = 0; n < 80 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 40), z = (rand() * 2 - 1) * (bounds.z - 60);
      if (woodField(x, z) > 0.3 || nml(x, z) > 0.3 || Math.abs(z) > 470 || nearPt(x, z, 50) || skip(x, z) || vines(x, z) > 0.5 || bosquet(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0xcfc8b0);
    commandPost(props, this.bases.pact, 1, 0xb8b4a0);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 4 || roadD(x, z) < 4.5 || railD(x, z) < 5 || parterre(x, z) || Math.abs(z - SCH.z) < 14 && Math.abs(x - SCH.x) < 46 }];
    // (common2027’s vegetation(), but with the trees let up to the heights’ tops: plantTrees stops at 32 m by default)
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4000, autumn: 0.75, broadleaf: 0.94, maxY: 70,
      forest: (x: number, z: number) => {
        const k = woodField(x, z);
        if (k < 0) return -1;
        if (nml(x, z) > 0.3) return k > 0.5 ? 0.3 : 0.005;
        return trenchBand(x, z) && k > 0.5 ? 0.3 : k;
      },
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 1500, lane: 0,
      avoid: [...avoid, { test: (x: number, z: number) => nml(x, z) > 0.2 || trenchBand(x, z) || vines(x, z) > 0.5 || hillK(x, z) > 0 || x < -150 || bosquet(x, z) }] });
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3, fields: this.fields });
    return { buildings: props.buildings, update(dt: number, t: number) { grass.update(dt, t); trees.update(dt, t); hedges.update(dt, t); } };
  },
} satisfies MapDef;
