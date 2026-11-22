// Nebi Samwil, 21–24 November 1917: the advance on Jerusalem. After Gaza fell, Allenby sent the 75th and 52nd
// (Lowland) Divisions up into the Judean Hills north-west of the city to cut the Nablus road behind it. On the evening
// of the 21st the 2/4th Hampshires and the 3rd Gurkhas went up the hill of Nebi Samwil — 885 m, the highest ground
// round Jerusalem, the mosque on its summit the traditional tomb of the prophet Samuel — and took it. For four days
// the Ottoman 19th and 53rd Divisions and the German Asienkorps counter-attacked out of El Jib and Bir Nabala, in the
// first winter rain, over terraced limestone and olive groves; the mosque was shot to pieces, the summit held, and the
// Scots of the 52nd were thrown back from El Jib. Jerusalem fell a fortnight later.
// The ground: steep terraced limestone hills with olive groves and dry-stone walls, the Arab stone villages on their
// spurs (Biddu, Beit Surik and Beit Iksa on the British side; El Jib, Ej Jira and Bir Nabala on the Ottoman), the rocky
// Wadi Selman and Wadi Beit Hanina cutting across the field, the Jerusalem–Jaffa road behind the British and the
// Ramallah–Nablus road behind the Ottomans; in the middle the hill of Nebi Samwil with its mosque and minaret.
// Not mirrored but fair: Nebi Samwil stands in the middle, neutral, with a graded track up to its summit from each
// side’s centre village at the same reach; each half has its three village spurs (as high, at the same depth, not in
// the same places), each with its own graded track from its base; both wadis run the whole length of the field, the
// same for both, each with its point on the floor reached by a track from a flank village of each side. The heights,
// spurs and gullies of each half are their own shapes; the summit’s own spurs fall one to the south-west, one to the
// north-east; the whole field rises east to the watershed, the same on both halves, so the east villages of each side
// stand higher than its west ones; a lane from each centre village out to a wadi’s track.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine } from './common.js';
import { segDist, evenThreshold, arabVillage } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const EXT = { x: 520, z: 580 };
const noise = createNoise2D(1917_1121);

/** The two wadis, each down the whole field: Wadi Selman on the west, Wadi Beit Hanina on the east (x of the bed at z). */
const wadiW = (z: number) => -250 + 18 * Math.sin(z * 0.006 + 0.3) + 10 * Math.sin(z * 0.017 + 1);
const wadiE = (z: number) => 215 + 20 * Math.sin(z * 0.0055 + 1.9) + 8 * Math.sin(z * 0.019 + 4);
const wadiD = (x: number, z: number) => Math.min(Math.abs(x - wadiW(z)), Math.abs(x - wadiE(z)));
/** How deep the wadis cut (full across the hills, gone out on the rolling ground by the roads). */
const wadiDepth = (z: number) => smoothstep(470, 330, Math.abs(z));
/** The whole field rises east, up to the watershed the Nablus road follows, and falls west toward the coastal plain (the same on both halves). */
const TILT = 0.045;
/** The bed's height: low in the middle, rising gently to the back of each half (and to the east). */
const bedH = (x: number, z: number) => 18 + 0.028 * Math.abs(z) + TILT * x;

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Kustul', 40, 460, 'centre'),
  P('B', 'Biddu', -385, 320, 'west', { radius: 24 }),
  P('C', 'Beit Surik', 45, 268, 'centre', { radius: 24 }),
  P('D', 'Beit Iksa', 345, 255, 'east', { radius: 24 }),
  P('E', 'Wadi Selman', Math.round(wadiW(20)), 20, 'west', { radius: 26 }),
  P('F', 'Nebi Samwil', 10, 22, 'centre', { radius: 28 }),
  P('G', 'Wadi Beit Hanina', Math.round(wadiE(-30)), -30, 'east', { radius: 26 }),
  P('H', 'El Jib', -345, -285, 'west', { radius: 24 }),
  P('I', 'Ej Jira', -25, -275, 'centre', { radius: 24 }),
  P('J', 'Bir Nabala', 360, -285, 'east', { radius: 24 }),
  P('K', 'Beitunia', -10, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The summit of Nebi Samwil: its ridge runs east–west, the crest a little to the south, both arms bending north. */
const SUMMIT = { x: 10, z: 22, h: 92 };
const crestZ = (x: number) => SUMMIT.z - 0.0016 * (x - SUMMIT.x) ** 2;
/** The village spurs of each half and its ribs (+) and gullies (−) [x, z, r, h]: each half its own. */
const DOMES = [
  [-385, 320, 95, 40], [45, 268, 85, 36], [345, 255, 90, 38],              // Biddu, Beit Surik, Beit Iksa
  [-345, -285, 95, 39], [-25, -275, 90, 37], [360, -285, 85, 38],          // El Jib, Ej Jira, Bir Nabala
  [-130, 60, 70, 28], [120, -95, 75, 30],                                   // the summit’s spurs: south-west, north-east
  [-170, 185, 80, -12], [190, 150, 75, 14], [-150, -160, 80, 13], [175, -200, 80, -12],
];
/** Limestone terraces: treads and risers stepped into every slope. */
const terrace = (h: number) => { const s = 3.2, f = h / s, i = Math.floor(f); return (i + smoothstep(0.62, 1, f - i)) * s; };

/** The hills before the shelves and the tracks: sampled once (the noise and the terraces are dear). */
const slope = gridCacheSmooth((x: number, z: number) => {
  const az = Math.abs(z), k = smoothstep(480, 300, az);                                   // (the hills; rolling ground behind them)
  let h = 20 + TILT * x + fbm(noise, x * 0.004, z * 0.004, 4) * 7 + fbm(noise, x * 0.03, z * 0.03, 2) * 1.2;
  h += ridged(noise, x * (z > 0 ? 0.011 : 0.013) + (z > 0 ? 7 : 31), z * 0.011, 4) * 18 * k;            // ribs, outcrops and gullies
  h += smoothstep(380, 545, x) * 30 + smoothstep(-420, -545, x) * 10;                       // the watershed’s hills off the east flank, low hills on the west
  const sd = Math.hypot((x - SUMMIT.x) / 1.6, z - crestZ(x)) + fbm(noise, x * 0.02, z * 0.02, 2) * 14;
  h += SUMMIT.h * smoothstep(190, 22, sd) ** 1.25;
  for (const [dx, dz, r, dh] of DOMES) h += dh * smoothstep(r, 0, Math.hypot(x - dx, z - dz)) ** 1.4;
  h += (terrace(h) - h) * 0.5 * smoothstep(20, 32, h);                                     // the terraces above the valley floors
  const wd = wadiD(x, z);                                                                  // the wadis’ rocky beds
  h += (bedH(x, z) - h) * smoothstep(44, 8, wd) * wadiDepth(z);
  return h;
}, EXT, 2);

// the shelves each point and base stands on (flattened, so a gun can unlimber there)
const SHELVES = [[0, BASE_Z, 36], [0, -BASE_Z, 36], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'F' ? 32 : p.id === 'E' || p.id === 'G' ? 22 : 34])];
const SHELF_H = SHELVES.map(([x, z]) => slope(x, z));
/** The tracks, graded straight between their shelves’ heights: from each base to its three villages, from the centre villages up Nebi Samwil, from the flank villages down to the wadis. */
const TRACKS = [
  [[0, BASE_Z], [60, 440], [-20, 380], [70, 320], at('C')],
  [[0, BASE_Z], [-140, 470], [-270, 420], [-360, 370], at('B')],
  [[0, BASE_Z], [130, 475], [250, 400], at('D')],
  [at('C'), [140, 190], [-60, 120], [70, 70], at('F')],
  [at('B'), [-335, 180], at('E')],
  [at('D'), [335, 120], at('G')],
  [[0, -BASE_Z], [-60, -445], [30, -385], [-50, -330], at('I')],
  [[0, -BASE_Z], [-120, -475], [-250, -410], at('H')],
  [[0, -BASE_Z], [130, -470], [270, -410], at('J')],
  [at('I'), [-150, -200], [60, -120], [-60, -70], at('F')],
  [at('H'), [-320, -140], at('E')],
  [at('J'), [355, -150], at('G')],
  [at('C'), [150, 290], [wadiE(300), 300]],                                // the lanes from each centre village out to a wadi’s track
  [at('I'), [-150, -305], [wadiW(-310), -310]],
];
/** The tracks down each wadi’s bed (on the bed: not graded), the Jerusalem–Jaffa road behind the British, the Ramallah–Nablus road behind the Ottomans. */
const WADIS = [Array.from({ length: 29 }, (_, i) => [wadiW(-560 + i * 40), -560 + i * 40]), Array.from({ length: 29 }, (_, i) => [wadiE(-560 + i * 40), -560 + i * 40])];
const jaffaZ = (x: number) => 405 + 12 * Math.sin(x * 0.009);
const nablusZ = (x: number) => -410 - 15 * Math.sin(x * 0.007 + 1);
const ROADS = [Array.from({ length: 29 }, (_, i) => [-560 + i * 40, jaffaZ(-560 + i * 40)]), Array.from({ length: 29 }, (_, i) => [-560 + i * 40, nablusZ(-560 + i * 40)])];
const TRACK_S = TRACKS.map((t) => t.reduce((s: number[], p, i) => (i ? [...s, s[i - 1] + Math.hypot(p[0] - t[i - 1][0], p[1] - t[i - 1][1])] : [0]), []));
const nearestShelf = ([x, z]: number[]) => SHELVES.reduce((b, s, i) => (Math.hypot(s[0] - x, s[1] - z) < Math.hypot(SHELVES[b][0] - x, SHELVES[b][1] - z) ? i : b), 0);
const endH = (p: number[]) => { const i = nearestShelf(p); return Math.hypot(SHELVES[i][0] - p[0], SHELVES[i][1] - p[1]) < 5 ? SHELF_H[i] : slope(p[0], p[1]); };
const TRACK_H = TRACKS.map((t) => [endH(t[0]), endH(t[t.length - 1])]);
const TRACK_BOX = TRACKS.map((t) => [Math.min(...t.map((p) => p[0])) - 32, Math.max(...t.map((p) => p[0])) + 32, Math.min(...t.map((p) => p[1])) - 32, Math.max(...t.map((p) => p[1])) + 32]);
const trackD = gridCache((x: number, z: number) => {
  let d = Math.min(segDist(WADIS[0], x, z), segDist(WADIS[1], x, z), segDist(ROADS[0], x, z), segDist(ROADS[1], x, z));
  TRACKS.forEach((t, i) => { const b = TRACK_BOX[i]; if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) d = Math.min(d, segDist(t, x, z)); });
  return d;
}, EXT, 2);
const onRoad = (x: number, z: number) => trackD(x, z) < 3.2;

/** The ground: the hills, the shelves, the graded tracks (sampled once). */
const height = gridCacheSmooth((x: number, z: number) => {
  let h = slope(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { h += (SHELF_H[i] - h) * smoothstep(r + 26, r, Math.hypot(x - sx, z - sz)); });
  TRACKS.forEach((t, i) => {
    const b = TRACK_BOX[i]; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return;
    // the legs as near as the nearest vote their own grade (shared on a hairpin’s bisector): no step where two legs meet; past its ends a track is the shelf’s
    const [h0, h1] = TRACK_H[i], S = TRACK_S[i], L = S[S.length - 1], D: number[] = [], G: number[] = [];
    let W = 0, H = 0, dmin = Infinity;
    for (let j = 0; j < t.length - 1; j++) {
      const [ax, az] = t[j], [bx, bz] = t[j + 1], l = S[j + 1] - S[j];
      const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (l * l)));
      D[j] = (j === 0 && u === 0) || (j === t.length - 2 && u === 1) ? Infinity : Math.hypot(x - ax - (bx - ax) * u, z - az - (bz - az) * u); G[j] = h0 + (h1 - h0) * (S[j] + u * l) / L;
      dmin = Math.min(dmin, D[j]);
    }
    if (dmin >= 30) return;
    for (let j = 0; j < D.length; j++) { const w = smoothstep(dmin + 6, dmin, D[j]) + 1e-6; W += w; H += w * G[j]; }
    const M = smoothstep(22, 5, dmin) ** 0.7;                                               // (wide, sloping banks: no walls along the cuts)
    if (W > 0) h += (H / W - h) * M;
  });
  return h;
}, EXT, 2);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Platoon, 2/4th Hampshires' }];

export default {
  id: 'nebi-samwil',
  name: 'Nebi Samwil',
  description: '21–24 November 1917 in the Judean Hills north-west of Jerusalem: the British 52nd and 75th Divisions and the Ottomans with the German Asienkorps fight in the first winter rain for the hill of Nebi Samwil and the mosque on its summit. Steep terraced limestone, olive groves and stone walls, the stone villages on their spurs, rocky wadis, the Jaffa road behind the British.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert', // (khaki drill and sand paint, as on the other Palestine maps)
  airfields: [], // (terraced hills: no flat ground for a strip — the aircraft come in from the map edge)
  armies: { nato: ['uk'], pact: ['ot', 'de'] }, // (the 52nd Lowland and 75th Divisions against the Ottoman Seventh Army and the Asienkorps)
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  conditions: { time: 'day', weather: 'rain' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  steep: 0.6, // (wheels keep to the tracks, the wadi beds and the roads; men climb the terraces)
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 19171121,
  height,
  fields: createFields({ seed: 191711, cell: 60, weights: [0.3, 0.1, 0.05, 0.55] as any }),

  theme: {
    // the first winter rain over the hills: low grey cloud, the limestone wet and pale
    fogColor: 0xa4a49c, fogDensity: 0.0016, skyTop: 0x5e6670, skyHorizon: 0xb0b0a8, skyBottom: 0x6c6a60,
    sunColor: 0xe0dccc, sunIntensity: 1.35, sunDisk: 0.05, clouds: 0.9, cloudLight: 0xc0c0bc, cloudDark: 0x62666a,
    sunDir: [0.4, 0.6, 0.45], hemiSky: 0xbcc0c2, hemiGround: 0x5a5040, hemiIntensity: 1.35, rimColor: 0xc0c4c6, rimIntensity: 0.2,
    terrain: {
      grass: '#6a6c44', grassAlt: '#62643e', dryGrass: '#94885c', dirt: '#8a5a3e', rock: '#b4aea0', strip: '#5a4632',
      pasture: '#6c7044', ploughed: '#7e5238', stubble: '#9a8a5a', meadow: '#707446',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0xa89a80, 0.9];                                          // the tracks and the roads, wet
        if (wadiD(x, z) < 9 && wadiDepth(z) > 0.3) return [0xc4beae, 0.85];                  // the wadis’ pale stones
        const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (g > 0.6) return [0xbcb6a6, Math.min(1, 0.65 + (g - 0.6) * 2)];                 // the limestone risers and outcrops
        if (g > 0.35) return [0xa8a294, 0.6];                                                // scree and rock
        const red = fbm(noise, x * 0.02 + 30, z * 0.02, 2);
        return red > 0.15 ? [0x8a5034, Math.min(0.55, (red - 0.15) * 2)] : null;             // the terra rossa between the terraces
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Takım' })),
  },

  /** Each side’s sangars and shallow trench cut into the rock before its centre village, a belt of wire; MG nests on the flank villages. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const [cx, cz] = at(s > 0 ? 'C' : 'I');
      const pts: number[][] = [];
      for (let t = -150; t <= 150; t += 25) { const x = cx + t * s; pts.push([x, cz - s * (60 - 0.0016 * t * t)]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { zig: 1.2, wireAt: 16, belts: 1, gapEvery: 40 })) if (trackD(w.x, w.z) > 9) works.push(w);
      for (const id of s > 0 ? ['B', 'D'] : ['H', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-16, 16]) { const x = p.x + dx, z = p.z - 18 * s; if (trackD(x, z) > 9) works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f }); } }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const skip = (x: number, z: number) => trackD(x, z) < 9 || steepAt(x, z) > 0.45 || wadiD(x, z) < 14;

    // the villages on their spurs: stone houses, a mosque, a well, garden walls
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J']) {
      const [px, pz] = at(id);
      arabVillage(props, px, pz, id === 'C' || id === 'I' ? 13 : 12, 1917 + Math.round(px * 3 + pz * 7), skip, !skip(px + 6, pz - 22));
    }
    // Nebi Samwil: the mosque over the tomb of Samuel on the summit, its minaret, the hamlet’s houses round it
    const [fx, fz] = at('F');
    props.rand = mulberry32(1917_11);
    props.flatHouse({ x: fx + 14, z: fz - 14, yaw: 0.25, width: 16, depth: 12, storeys: 2, name: 'mosque', dome: true });
    {
      const mx = fx + 26, mz = fz - 4, g = terrain.heightAt(mx, mz);
      props.box('stone', mx, g + 9, mz, 2.6, 18, 2.6, 0.25, 0xd8d0bc);
      props.box('stone', mx, g + 18.6, mz, 3.4, 1.2, 3.4, 0.25, 0xc8c0aa);                // (the gallery)
      cover.addCylinder({ x: mx, z: mz, radius: 1.6, height: 18 });
    }
    for (const [x, z, yaw] of [[fx - 22, fz - 18, 0.1], [fx - 30, fz + 8, 1.6], [fx + 4, fz + 26, 0.2], [fx + 30, fz + 20, 1.4]]) if (!skip(x, z)) props.flatHouse({ x, z, yaw, width: 7, depth: 6 });
    for (const [x, z, yaw] of [[fx - 8, fz - 30, 0], [fx + 36, fz - 18, 1.5], [fx - 36, fz - 6, 1.6]]) if (trackD(x, z) > 7) props.lowWall({ x, z, yaw, length: 10, height: 1.4, color: 0xc0b8a6 });

    // the terrace walls: dry-stone along the contours of every slope (each half its own)
    const r = mulberry32(1917_24);
    for (let i = 0, n = 0; i < 9000 && n < 1100; i++) {
      const x = (r() * 2 - 1) * 490, z = (i % 2 ? -1 : 1) * (10 + r() * 540);
      const gx = terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), gz = terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2), g = Math.hypot(gx, gz) / 4;
      if (g < 0.12 || g > 0.5 || trackD(x, z) < 7 || nearPoint(x, z, 26) || wadiD(x, z) < 10 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45) continue;
      n++;
      props.lowWall({ x, z, yaw: Math.atan2(-gx, -gz), length: 6 + r() * 6, height: 0.9 + r() * 0.4, color: r() < 0.5 ? 0xb8b0a0 : 0xaaa292 });
    }
    // limestone boulders and outcrops; the wadis full of them
    for (let i = 0; i < 700; i++) {
      const x = (r() * 2 - 1) * 490, z = (i % 2 ? -1 : 1) * (10 + r() * 540);
      if (trackD(x, z) < 6 || nearPoint(x, z, 24) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      if (wadiD(x, z) < 14 || steepAt(x, z) > 0.4 || r() < 0.35) props.boulder({ x, z, radius: 0.7 + r() * 1.8 });
    }
    commandPost(props, this.bases.nato, -1, 0xb0a07a);
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { x: fx + 14, z: fz - 10, r: 22 }, { test: (x: number, z: number) => trackD(x, z) < 5 || (wadiD(x, z) < 8 && wadiDepth(z) > 0.3) }];
    // the olive groves on the terraces, as many on each half; carobs and figs scattered over the rest
    const grove = (x: number, z: number) => fbm(noise, x * 0.012 + 40, z * 0.012, 3);
    const tP = evenThreshold(grove, 0.05, (x, z) => z > 0);
    const olives = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 6000, broadleaf: 1, autumn: 0, maxY: 200, size: 0.5,
      forest: (x: number, z: number) => (grove(x, z) > (z > 0 ? 0.05 : tP) ? 0.6 : 0.05),
    });
    cover.finalize(bounds);
    const grow = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.1, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grow.update(dt, t); olives.update(dt, t); },
    };
  },
} satisfies MapDef;
