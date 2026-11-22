// Doiran, April–May 1917 and 18–19 September 1918: the British Salonika Army against the Bulgarian Ninth Division on
// the hills west of Lake Doiran, the strongest position on the Macedonian front. Twice the British went up out of the
// ravines under the Grand Couronné and Pip Ridge — in 1917 for 12,000 casualties, in September 1918 with the Greeks
// beside them for 7,000 more — and twice Colonel Nerezov’s men held, behind deep trenches cut into the rock, concrete
// machine-gun posts and wire, until the breakthrough at Dobro Pole turned the whole front.
// The ground: dry scrub-covered hills falling to the lake on the east edge (open water, reeds along the shore), rocky
// outcrops, steep ravines. On the Bulgarian side Pip Ridge, the Grand Couronné and Teton Hill; on the British side
// Horseshoe Hill, Kidney Hill and the Doldzeli knoll. In the hollow between them the Petit Couronné, the Jumeaux
// ravine on the west, the ruins of Doiran town on the lake shore — and along the shore the Salonika–Constantinople
// railway and the lake road, each running the whole length of the field.
// Not mirrored but fair: each side holds one wall of the hollow — a summit over the Petit Couronné at the same reach
// and height (Kidney Hill answers the Grand Couronné), a height on the west flank and a knoll by the lake at the same
// reach, each with its own graded track from its base to every one of them and from each down to the hollow; a ravine
// cut into each wall down to the Jumeaux ravine, the lake shore and its road and railway reaching both halves alike.
// The walls are their own shapes (the hollow bends, the ribs and gullies fall differently); both fight for the knoll,
// the ravine mouth and the town between them.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine } from './common.js';
import { segDist, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1918_0918);
/** The floor of the hollow across the middle (its own bends), and its height: highest under the hills in the west, falling to the lake. */
const vall = (x: number) => 24 * Math.sin(x * 0.0048 + 0.7) + 8 * Math.sin(x * 0.016 + 2.1) - 6;
const floorH = (x: number) => 4 + 14 * smoothstep(380, 0, Math.abs(x + 80));
const away = (x: number, z: number) => Math.abs(z - vall(x));
const north = (x: number, z: number) => z > vall(x);

// ---- Lake Doiran along the east edge: one long shore down the whole field, as much of it on each half
const lakes = createLakes({ lakes: [{ x: 760, z: 0, rx: 340, rz: 1400, depth: 5, seed: 0 }] });
const nearLake = (x: number) => x > 300;
const wetQ = (x: number, z: number) => (nearLake(x) ? lakes.q(x, z) : Infinity);
/** How much of the hills is left (1 inland, 0 on the shore flat): the ground falls to the lake. */
const relief = (x: number) => smoothstep(430, 250, x);

/** Side ribs (+) and gullies (−) down each wall [x, z, r, h] (z squeezed: they run up and down the slope), and the summits’ domes. */
const SIDES = [[-180, 170, 85, 20], [150, 180, 80, -22], [-140, -175, 85, -22], [190, -170, 90, 20],
  [-20, 255, 90, 27], [-10, -260, 90, 27],                                  // Kidney Hill, the Grand Couronné
  [-350, 290, 75, 18], [-360, -300, 75, 18], [270, 290, 70, 10], [280, -290, 70, 10]]; // Horseshoe Hill, Pip Ridge; Doldzeli, Teton Hill
/** The ravines cut into each wall down to the Jumeaux ravine’s mouth: Jackson’s on the British wall, the Jumeaux on the Bulgarian. */
const RAVINES = [[[-285, -5], [-262, 90], [-248, 185]], [[-312, -60], [-322, -140], [-318, -225]]];
function hills(x: number, z: number) {
  const a = away(x, z), n = north(x, z);
  const crest = n ? 265 + 20 * Math.sin(x * 0.009 + 1.4) : 270 + 22 * Math.sin(x * 0.007 + 2.6);
  const k = smoothstep(60, 300, a);
  let h = floorH(x) + 2 * smoothstep(20, 60, a);
  h += 80 * smoothstep(55, crest, a);                                                       // the wall up to the crest
  h -= 28 * smoothstep(crest + 20, crest + 240, a);                                          // and down its back to the base
  h += ridged(noise, x * (n ? 0.012 : 0.01) + 7, z * (n ? 0.012 : 0.01), 4) * 20 * k;       // ribs, gullies and outcrops
  for (const [sx, sz, r, sh] of SIDES) h += sh * smoothstep(r, 0, Math.hypot(x - sx, (z - sz) * 0.7)) ** 1.4;
  h += 16 * smoothstep(75, 0, Math.hypot(x + 10, z - vall(-10))) ** 1.3;                    // the Petit Couronné, a knoll in the hollow
  for (const rv of RAVINES) h -= 20 * smoothstep(30, 4, segDist(rv, x, z)) * k;              // the ravines, steep-sided
  h += smoothstep(-380, -540, x) * 40 * k;                                                   // the high ground toward the Belasica, west on both walls
  return h;
}
const slope = gridCacheSmooth((x: number, z: number) => {
  return 3 + fbm(noise, x * 0.03, z * 0.03, 2) * 1.0 + (hills(x, z) - 3) * relief(x);
}, { x: 520, z: 580 }, 4); // (the noise and the domes sampled once, every 4 m)

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Kalinova', 30, 465, 'centre'),
  P('B', 'Horseshoe Hill', -350, 290, 'west', { radius: 24 }),
  P('C', 'Kidney Hill', -20, 255, 'centre', { radius: 24 }),
  P('D', 'Doldzeli', 270, 290, 'east', { radius: 24 }),
  P('E', 'Jumeaux Ravine', -300, Math.round(vall(-300) - 18), 'west', { radius: 26 }),
  P('F', 'Petit Couronné', -10, Math.round(vall(-10)), 'centre', { radius: 28 }),
  P('G', 'Doiran', 320, Math.round(vall(320)), 'east', { radius: 30 }),
  P('H', 'Pip Ridge', -360, -300, 'west', { radius: 24 }),
  P('I', 'Grand Couronné', -10, -260, 'centre', { radius: 24 }),
  P('J', 'Teton Hill', 280, -290, 'east', { radius: 24 }),
  P('K', 'Furka', -25, -465, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

// the shelves each point and base stands on (flattened, so a gun can unlimber there)
const SHELVES = [[0, BASE_Z, 36], [0, -BASE_Z, 36], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'G' ? 34 : 22])];
const SHELF_H = SHELVES.map(([x, z]) => slope(x, z));
/** The tracks, each from shelf to shelf, graded straight between their heights: from each base to its three heights, and from each height down its own traverse to the hollow. */
const TRACKS = [
  [[0, BASE_Z], [45, 440], [-45, 385], [30, 320], at('C')],
  [[0, BASE_Z], [-130, 475], [-255, 410], at('B')],
  [[0, BASE_Z], [125, 470], [220, 410], at('D')],
  [at('C'), [-120, 140], at('F')],
  [at('B'), [-440, 150], at('E')],
  [at('D'), [200, 150], at('G')],
  [[0, -BASE_Z], [-50, -445], [45, -380], [-35, -320], at('I')],
  [[0, -BASE_Z], [-125, -470], [-250, -415], at('H')],
  [[0, -BASE_Z], [120, -480], [225, -400], at('J')],
  [at('I'), [100, -150], at('F')],
  [at('H'), [-210, -160], at('E')],
  [at('J'), [400, -150], at('G')],
];
/** The track along the hollow, E – the Petit Couronné – Doiran (gentle: not graded), and the lake road down the shore through the town. */
const FLOOR = [at('E'), ...Array.from({ length: 19 }, (_, i) => [-270 + i * 30, vall(-270 + i * 30)]), at('G')];
const SHORE = [[372, 560], [366, 380], [352, 200], [338, 70], at('G'), [340, -60], [356, -200], [368, -380], [374, -560]];
/** The Salonika–Constantinople railway between the lake road and the water; Doiran station by the town. */
const railX = (z: number) => 395 + 15 * (z / 560) ** 2;
const RAIL = Array.from({ length: 29 }, (_, i) => [railX(-560 + i * 40), -560 + i * 40]);
/** How far along each track (m) its corners are. */
const TRACK_S = TRACKS.map((t) => t.reduce((s: number[], p, i) => (i ? [...s, s[i - 1] + Math.hypot(p[0] - t[i - 1][0], p[1] - t[i - 1][1])] : [0]), []));
const nearestShelf = ([x, z]: number[]) => SHELVES.reduce((b, s, i) => (Math.hypot(s[0] - x, s[1] - z) < Math.hypot(SHELVES[b][0] - x, SHELVES[b][1] - z) ? i : b), 0);
const TRACK_H = TRACKS.map((t) => [SHELF_H[nearestShelf(t[0])], SHELF_H[nearestShelf(t[t.length - 1])]]);
/** The tracks’ boxes (padded), so a point far from a track skips it. */
const TRACK_BOX = TRACKS.map((t) => [Math.min(...t.map((p) => p[0])) - 32, Math.max(...t.map((p) => p[0])) + 32, Math.min(...t.map((p) => p[1])) - 32, Math.max(...t.map((p) => p[1])) + 32]);
const EXT = { x: 520, z: 580 };
const trackD = gridCache((x: number, z: number) => {
  let d = Math.min(segDist(FLOOR, x, z), segDist(SHORE, x, z));
  TRACKS.forEach((t, i) => { const b = TRACK_BOX[i]; if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) d = Math.min(d, segDist(t, x, z)); });
  return d;
}, EXT, 2);
const railD = (x: number, z: number) => Math.abs(x - railX(z));
const onRoad = (x: number, z: number) => trackD(x, z) < 3.2;

/** The ground before the lake: the hills, the shelves, the graded tracks (sampled once: it is dear). */
const ground = gridCacheSmooth((x: number, z: number) => {
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
    const M = smoothstep(30, 6, dmin) ** 0.7;                                               // (wide, sloping banks: no walls along the cuts)
    if (W > 0) h += (H / W - h) * M;
  });
  const rd = railD(x, z);                                                                    // the railway’s bed: a low bank along the shore
  if (rd < 9) h += (Math.max(h, 2.2) - h) * smoothstep(9, 4, rd);
  return h;
}, EXT, 2);
/** The lake carved after the cache: the shore falls to the water, the bed under it. */
const height = (x: number, z: number) => (nearLake(x) ? lakes.carve(x, z, ground(x, z)) : ground(x, z));

/** The reeds along the shore: men wade, vehicles bog; the road and the railway bank are firm. */
function soft(x: number, z: number, foot: boolean) {
  const q = wetQ(x, z);
  if (q > 1.06 || trackD(x, z) < 5 || railD(x, z) < 4) return 1;
  return 1 - smoothstep(1.06, 1.0, q) * (foot ? 0.35 : 0.6);
}

/** The concrete machine-gun posts: as many on each wall, before the summits and the flank heights. */
const MGPOSTS = [[-45, 225], [20, 222], [-375, 262], [255, 258], [-30, -228], [40, -232], [-338, -268], [300, -258]];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Platoon, 12th Cheshires' }];

export default {
  id: 'doiran',
  name: 'Doiran',
  description: 'September 1918 on the hills west of Lake Doiran, Macedonia: the British Salonika Army goes up the ravines against the Bulgarian trenches, wire and concrete machine-gun posts on Pip Ridge and the Grand Couronné, across the Petit Couronné and the ruins of Doiran town from Kidney Hill. Dry scrub and rock above; the railway and the lake road along the reedy shore.',
  epochs: ['1918'],
  region: 'italy', // (no Balkans region in 1918: the mountain front’s, like Dobro Pole — bg has no roster yet and falls back to de; uk and de fit every region)
  airfields: [], // (no flat ground in the hills, the shore strip too narrow: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['uk'], pact: ['bg', 'de'] }, // (the British XII Corps against the Bulgarian Ninth Pleven Division; until the Bulgarians have their roster: the Germans)
  sides: { nato: 'Britain', pact: 'Bulgaria' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1700,
  segments: 720,
  bounds: { x: 500, z: 560 },
  steep: 0.6, // (wheels keep to the tracks, the shelves, the hollow and the shore; men climb anywhere)
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 19180918,
  height,
  soft,
  river: lakes,
  fields: createFields({ seed: 191809, cell: 60, weights: [0.2, 0.1, 0.05, 0.65] as any }),

  theme: {
    // a clear September dawn after the bombardment, the sun coming up over the lake: dust and smoke in the hollow
    fogColor: 0xc4bcaa, fogDensity: 0.0012, skyTop: 0x5a7a9c, skyHorizon: 0xd8ccb6, skyBottom: 0x86806e,
    sunColor: 0xffd8a8, sunIntensity: 1.65, sunDisk: 0.25, clouds: 0.2, cloudLight: 0xf2ece2, cloudDark: 0x9a9284,
    sunDir: [0.75, 0.32, -0.1], hemiSky: 0xccccc8, hemiGround: 0x625a44, hemiIntensity: 1.3, rimColor: 0xe0d4c0, rimIntensity: 0.25,
    terrain: {
      grass: '#6e6e40', grassAlt: '#64663a', dryGrass: '#a4945a', dirt: '#7a6648', rock: '#aaa290', strip: '#544632',
      pasture: '#76723e', ploughed: '#7a6446', stubble: '#ac9a62', meadow: '#7c7a44',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0xa8987a, 0.9];                                          // the tracks and the lake road
        if (railD(x, z) < 3.5) return [0x6a604e, 0.9];                                       // the railway’s ballast
        const q = wetQ(x, z);
        if (q < 1.08) return [noise(x * 0.05, z * 0.05) > 0 ? 0x7a7a44 : 0x5e6a34, smoothstep(1.08, 1.0, q) * 0.85]; // reeds
        const g = Math.hypot(ground(x + 2, z) - ground(x - 2, z), ground(x, z + 2) - ground(x, z - 2)) / 4;
        if (g > 0.55) return [0xaaa290, Math.min(1, 0.6 + (g - 0.55) * 2)];                // the rock faces and outcrops
        if (g > 0.32) return [0xb4a890, 0.7];                                                // scree
        if (y > 50) return [0x9e9058, 0.6];                                                  // the dry grass of the heights
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -330 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Rota, 34. Troyanski polk' })),
  },

  /** Each wall’s fire trench cut into its face over the hollow, stepped with traverses, two belts of wire below (gaps where the tracks go); MG nests on the flank heights. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -470; x <= 380; x += 25) { const X = s > 0 ? x : -90 - x; pts.push([X, s > 0 ? vall(X) + 150 + 14 * Math.sin(X * 0.018) : vall(X) - 150 - 12 * Math.sin(X * 0.021 + 2)]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { zig: 1.5, wireAt: 18, belts: 2, gapEvery: 50 })) if (trackD(w.x, w.z) > 10 && wetQ(w.x, w.z) > 1.15) works.push(w);
      for (const id of s > 0 ? ['B', 'D'] : ['H', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-14, 14]) { const x = p.x + dx, z = p.z - 16 * s; if (trackD(x, z) > 9) works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f }); } }
    }
    const [gx, gz] = at('G');                                                       // Doiran town: shelled to ruins since 1916
    const ruins = game.buildings.list.filter((b: any) => b.name !== 'pillbox' && Math.hypot(b.x - gx, b.z - gz) < 90).map((b: any) => b.index);
    return { blasts: [], ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const dry = (x: number, z: number, m = 1.25) => wetQ(x, z) > m && railD(x, z) > 8;
    const clear = (x: number, z: number, r = 8) => trackD(x, z) > r && steepAt(x, z) < 0.25 && dry(x, z);

    // the concrete machine-gun posts: a low box, firing slits all round, earth over the roof slab, the door at the back
    const concrete = 0x8e8a7e;
    for (const [x, z] of MGPOSTS) {
      props.rand = mulberry32(Math.round(x * 13 + z));
      const b = props.beginBuilding('pillbox', x, z, z > 0 ? Math.PI : 0, 6, 5);
      b.plaster = concrete;
      props.shell(b, { height: 2.0, key: 'stone', color: concrete, t: 0.9, bay: 2.2, sill: 1.1, head: 1.4, frame: 0x6e6b62, front: [], back: [1.4] });
      props.piece('stone', b, 0, 2.35, 0, 6.4, 0.7, 5.4, 0x827e72);
      props.piece('plain', b, 0, 2.75, 0.3, 5.4, 0.25, 4.0, 0x6a5a40);
      props.endBuilding();
    }

    // Doiran: the town on the shore shot to ruins — stone houses round the market, the church a shell
    const [gx, gz] = at('G');
    props.rand = mulberry32(1918);
    const placed: number[][] = [];
    for (let i = 0; i < 80 && placed.length < 14; i++) {
      const a = props.rand() * Math.PI * 2, d = 18 + props.rand() * 44, x = gx + Math.cos(a) * d, z = gz + Math.sin(a) * d * 1.3;
      if (!clear(x, z, 9) || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 13)) continue;
      placed.push([x, z]);
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (props.rand() - 0.5) * 0.2, width: 7 + props.rand() * 3, depth: 7 + props.rand() * 2, storeys: props.rand() < 0.3 ? 2 : 1, damaged: 0.6 });
    }
    if (clear(gx - 40, gz + 6, 12)) props.church({ x: gx - 40, z: gz + 6, yaw: Math.PI / 2 });
    // Doiran station on the railway by the town, a goods shed; wagons left in the siding
    const sz = gz + 70;
    props.house({ x: railX(sz) - 11, z: sz, yaw: 0, width: 12, depth: 6, height: 3.4 });
    props.wagon({ x: railX(gz - 60), z: gz - 60, yaw: 0 });
    props.wagon({ x: railX(gz - 75), z: gz - 75, yaw: 0, kind: 'open' });
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    // shepherds’ huts on the shelves; the hamlet of Doldzeli by its knoll and Krastali behind Teton Hill
    for (const [x, z] of [[-326, 306], [-372, 276], [6, 240], [292, 304], [-384, -286], [16, -276], [302, -306], [-30, 482], [34, -482], [-270, 6]]) if (clear(x, z, 7)) props.house({ x, z, yaw: props.rand() * 3, width: 7, depth: 5, height: 2.6 });
    // rock everywhere, broken by the shelling; dry-stone sangars (each wall its own)
    const r = mulberry32(1918_19);
    for (let i = 0; i < 700; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (20 + r() * 520), big = r();
      if (nearPoint(x, z, 28) || trackD(x, z) < 7 || !dry(x, z, 1.4) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || away(x, z) < 50 || x > 360) continue;
      if (big < 0.8) props.boulder({ x, z, radius: 0.8 + r() * 2.2 });
      else if (steepAt(x, z) < 0.35) props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 4, height: 1.2, color: 0xa29a88 });
    }
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J']) {
      const [px, pz] = at(id), s = pz > 0 ? -1 : 1;
      for (const dx of [-24, 24]) if (trackD(px + dx, pz + 20 * s) > 9) props.lowWall({ x: px + dx, z: pz + 20 * s, yaw: 0.2 * dx / 24, length: 7, height: 1.3, color: 0xa8a090 });
    }
    { const [fx, fz] = at('F'); props.sandbagRing({ x: fx - 22, z: fz + 14, radius: 4, toward: 1 }); props.sandbagRing({ x: fx + 22, z: fz - 14, radius: 4, toward: -1 }); }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => trackD(x, z) < 5 || railD(x, z) < 6 || wetQ(x, z) < 1.12 || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 9) }];
    // the scrub (oak, juniper, Christ’s thorn) over the hills, as much on each wall; the rock faces and the heights bare
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.011 + 40, z * 0.011, 3);
    const tP = evenThreshold((x, z) => (away(x, z) > 40 ? wood0(x, z) : -9), -0.05, north);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 5000, broadleaf: 0.85, autumn: 0.25, maxY: 85, size: 0.5,
      forest: (x: number, z: number) => (away(x, z) < 40 ? 0.04 : wood0(x, z) > (north(x, z) ? -0.05 : tP) ? 0.65 : 0.06),
    });
    // the willows along the shore and in the town’s gardens
    const willows = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 160, broadleaf: 1, autumn: 0.1, size: 0.9,
      forest: (x: number, z: number) => { const q = wetQ(x, z); return q > 1.12 && q < 1.3 ? 0.6 : 0; },
    });
    cover.finalize(bounds);
    const grow = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.4, fields: this.fields });
    lakes.build(scene);
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grow.update(dt, t); trees.update(dt, t); willows.update(dt, t); },
    };
  },
} satisfies MapDef;
