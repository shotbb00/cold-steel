// Salonika, 1916–1917: the “Birdcage”, the entrenched camp the Armée d’Orient and the British Salonika Army dug round the
// city after the retreat from Serbia — a ring of wired trenches and redoubts on the bare hills north of Salonika, from the
// Vardar marshes past the Langaza and Beşik lakes to the Gulf of Orfano, so much wire that the Germans mocked it as the
// greatest internment camp in Europe. The Bulgarians and the Germans never came; this is the attack that might have come.
// The ground: the Langaza basin across the middle — malarial marsh round Lake Langaza in the west and Lake Beşik on the
// east edge, Langaza town between them with its minaret and its baths. South of it the Birdcage hills (the Lembet heights,
// the redoubt over the Dervent pass where the Seres road climbs out of the basin, Hortiach), wired trenches and concrete
// posts along their face; behind them the Allied tent camps, hospitals and dumps, and at the south edge the city itself:
// the railway yards, the houses and minarets, the White Tower on the shore of the gulf. North of the basin the answer:
// the Ajvatli, Kara Tepe and Sochos heights the Bulgarians would have come over, their own trenches, camps and dumps, and
// Guvezne behind. In the west the Vardar plain, the Monastir road and the railway to Uskub along the whole edge.
// Not mirrored but fair: each side holds one wall of the basin — a summit over Langaza at the same reach and height (Kara
// Tepe answers the Dervent redoubt, Sochos answers Hortiach, Ajvatli answers Lembet), each with its own graded track from
// its base to every one and from each down to the basin; Lake Langaza and Lake Beşik both lie across the middle, as much
// marsh on each half; the Vardar plain and the railway run the whole length of the west edge for both. The walls are their
// own shapes (the basin bends, the ribs and gullies fall differently); both fight for the Monastir road, Langaza and Beşik.
import * as THREE from 'three';
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
const EXT = { x: 520, z: 580 };
const noise = createNoise2D(1916_1917);
/** The floor of the Langaza basin across the middle (its own bends). */
const vall = (x: number) => 20 * Math.sin(x * 0.005 + 0.4) + 7 * Math.sin(x * 0.015 + 1.3);
const away = (x: number, z: number) => Math.abs(z - vall(x));
const north = (x: number, z: number) => z > vall(x);

// ---- Lake Langaza in the west of the basin, Lake Beşik on the east edge, both across the middle; the gulf behind the city
const lakes = createLakes({ lakes: [
  { x: -230, z: vall(-230), rx: 150, rz: 62, depth: 3, seed: 1 },
  { x: 540, z: vall(540), rx: 220, rz: 140, depth: 5, seed: 2 },
  { x: 430, z: 820, rx: 400, rz: 290, depth: 8, seed: 3 },
] });
const wetQ = (x: number, z: number) => lakes.q(x, z);
/** How much of the hills is left (1 inland, 0 on the shores and the Vardar plain). */
const relief = (x: number, z: number) => smoothstep(1.0, 1.9, wetQ(x, z)) * smoothstep(-485, -380, x);

/** Side ribs (+) and gullies (−) down each wall [x, z, r, h] (z squeezed), and the summits’ domes. */
const SIDES = [[-170, 175, 85, -20], [140, 170, 85, 21], [-150, -170, 85, 21], [170, -175, 90, -21],
  [-20, 255, 90, 32], [-10, -260, 90, 27],                                   // the Dervent redoubt, Kara Tepe
  [-350, 290, 75, 22], [-360, -300, 75, 18], [270, 290, 80, 28], [280, -290, 80, 24]]; // (the south wall’s noise runs lower: its domes a little higher) // Lembet, Ajvatli; Hortiach, Sochos
function hills(x: number, z: number) {
  const a = away(x, z), n = north(x, z);
  const crest = n ? 265 + 20 * Math.sin(x * 0.009 + 1.1) : 270 + 22 * Math.sin(x * 0.007 + 2.9);
  const k = smoothstep(80, 300, a);
  let h = 3 + 2 * smoothstep(40, 90, a);
  h += (n ? 85 : 80) * smoothstep(80, crest, a);                                                        // the wall up to the crest
  h -= 28 * smoothstep(crest + 20, crest + 240, a);                                            // and down its back to the base
  h += ridged(noise, x * (n ? 0.011 : 0.0125) + 3, z * (n ? 0.011 : 0.0125), 4) * 18 * k;     // ribs, gullies and outcrops
  for (const [sx, sz, r, sh] of SIDES) h += sh * smoothstep(r, 0, Math.hypot(x - sx, (z - sz) * 0.7)) ** 1.4;
  return h;
}
const slope = gridCacheSmooth((x: number, z: number) => {
  return 3 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.8 + (hills(x, z) - 3) * relief(x, z);
}, EXT, 4);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Salonika', 30, 465, 'centre'),
  P('B', 'Lembet Heights', -350, 290, 'west', { radius: 24 }),
  P('C', 'Dervent Redoubt', -20, 255, 'centre', { radius: 24 }),
  P('D', 'Hortiach', 270, 290, 'east', { radius: 24 }),
  P('E', 'Monastir Road', -450, Math.round(vall(-450)), 'west', { radius: 26 }),
  P('F', 'Langaza', 60, Math.round(vall(60)), 'centre', { radius: 30 }),
  P('G', 'Beşik', 260, Math.round(vall(260)), 'east', { radius: 28 }),
  P('H', 'Ajvatli', -360, -300, 'west', { radius: 24 }),
  P('I', 'Kara Tepe', -10, -260, 'centre', { radius: 24 }),
  P('J', 'Sochos Heights', 280, -290, 'east', { radius: 24 }),
  P('K', 'Guvezne', -25, -465, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

// the shelves each point and base stands on (flattened, so a gun can unlimber there)
const SHELVES = [[0, BASE_Z, 36], [0, -BASE_Z, 36], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'F' ? 34 : 22])];
// (worked out on first use, not at import: every map is imported at start, and this samples a cached grid)
let SHELF_H_: number[] | undefined;
const shelfH = () => (SHELF_H_ ??= SHELVES.map(([x, z]) => slope(x, z)));
/** The tracks, shelf to shelf, graded between their heights: the Seres road over the Dervent pass, the Monastir road by Lembet, the Hortiach track; the Bulgarian side’s three. */
const TRACKS = [
  [[0, BASE_Z], [45, 440], [-45, 385], [30, 320], at('C')],
  [[0, BASE_Z], [-130, 475], [-255, 410], at('B')],
  [[0, BASE_Z], [125, 470], [220, 410], at('D')],
  [at('C'), [-55, 140], at('F')],
  [at('B'), [-440, 150], at('E')],
  [at('D'), [200, 150], at('G')],
  [[0, -BASE_Z], [-50, -445], [45, -380], [-35, -320], at('I')],
  [[0, -BASE_Z], [-125, -470], [-250, -415], at('H')],
  [[0, -BASE_Z], [120, -480], [225, -400], at('J')],
  [at('I'), [100, -150], at('F')],
  [at('H'), [-468, -150], at('E')],
  [at('J'), [380, -175], at('G')],
];
/** The road along the basin, Langaza – Beşik (gentle: not graded). */
const FLOOR = [at('F'), ...Array.from({ length: 7 }, (_, i) => [85 + i * 25, vall(85 + i * 25)]), at('G')];
/** The Vardar railway: out of the yards at the city’s west end, up the Vardar plain along the west edge toward Uskub. */
const RAIL = [[-130, 560], [-250, 528], [-370, 510], [-445, 478], [-476, 410], ...Array.from({ length: 25 }, (_, i) => [-478 + 3 * Math.sin(i * 0.7), 380 - i * 39])];
const TRACK_S = TRACKS.map((t) => t.reduce((s: number[], p, i) => (i ? [...s, s[i - 1] + Math.hypot(p[0] - t[i - 1][0], p[1] - t[i - 1][1])] : [0]), []));
const nearestShelf = ([x, z]: number[]) => SHELVES.reduce((b, s, i) => (Math.hypot(s[0] - x, s[1] - z) < Math.hypot(SHELVES[b][0] - x, SHELVES[b][1] - z) ? i : b), 0);
// (worked out on first use, not at import: every map is imported at start, and this samples a cached grid)
let TRACK_H_: number[][] | undefined;
const trackH = () => (TRACK_H_ ??= TRACKS.map((t) => [shelfH()[nearestShelf(t[0])], shelfH()[nearestShelf(t[t.length - 1])]]));
const TRACK_BOX = TRACKS.map((t) => [Math.min(...t.map((p) => p[0])) - 32, Math.max(...t.map((p) => p[0])) + 32, Math.min(...t.map((p) => p[1])) - 32, Math.max(...t.map((p) => p[1])) + 32]);
const trackD = gridCache((x: number, z: number) => {
  let d = segDist(FLOOR, x, z);
  TRACKS.forEach((t, i) => { const b = TRACK_BOX[i]; if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) d = Math.min(d, segDist(t, x, z)); });
  return d;
}, EXT, 2);
const railD = gridCache((x: number, z: number) => (x < -100 && (x < -420 || z > 460) ? segDist(RAIL, x, z) : 999), EXT, 2);
const onRoad = (x: number, z: number) => trackD(x, z) < 3.2;

/** The ground before the water: the hills, the shelves, the graded tracks, the railway bank (sampled once: it is dear). */
function ground(x: number, z: number) {
  let h = slope(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { h += (shelfH()[i] - h) * smoothstep(r + 26, r, Math.hypot(x - sx, z - sz)); });
  TRACKS.forEach((t, i) => {
    const b = TRACK_BOX[i]; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return;
    const [h0, h1] = trackH()[i], S = TRACK_S[i], L = S[S.length - 1], D: number[] = [], G: number[] = [];
    let W = 0, H = 0, dmin = Infinity;
    for (let j = 0; j < t.length - 1; j++) {
      const [ax, az] = t[j], [bx, bz] = t[j + 1], l = S[j + 1] - S[j];
      const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (l * l)));
      D[j] = (j === 0 && u === 0) || (j === t.length - 2 && u === 1) ? Infinity : Math.hypot(x - ax - (bx - ax) * u, z - az - (bz - az) * u); G[j] = h0 + (h1 - h0) * (S[j] + u * l) / L;
      dmin = Math.min(dmin, D[j]);
    }
    if (dmin >= 30) return;
    for (let j = 0; j < D.length; j++) { const w = smoothstep(dmin + 6, dmin, D[j]) + 1e-6; W += w; H += w * G[j]; }
    const M = smoothstep(30, 6, dmin) ** 0.7;
    if (W > 0) h += (H / W - h) * M;
  });
  const rd = railD(x, z);
  if (rd < 9) h += (Math.max(h, 2.2) - h) * smoothstep(9, 4, rd);
  return h;
}
/** The ground with the lakes and the gulf carved in, sampled once (one grid, every 2 m): the shores are 60 m slopes and the bed meets them without a step, so the samples read true (no river banks here to keep sharp). */
const height = gridCacheSmooth((x: number, z: number) => (away(x, z) < 230 || z > 440 ? lakes.carve(x, z, ground(x, z)) : ground(x, z)), EXT, 2);

/** The malaria marsh: reeds round both lakes, the wet bottoms of the basin and the Vardar plain. Men wade, vehicles bog; roads and the railway bank are firm. */
const marsh = gridCache((x: number, z: number) => {
  const q = wetQ(x, z);
  if (z > 500) return 0;                                                                     // (the city’s waterfront is quays)
  let m = smoothstep(1.35, 1.0, q);
  m = Math.max(m, smoothstep(60, 25, away(x, z)) * smoothstep(0.1, 0.4, fbm(noise, x * 0.012 + 9, z * 0.012, 2))); // the basin’s wet bottoms
  m = Math.max(m, smoothstep(-440, -480, x) * smoothstep(150, 60, away(x, z)));              // the Vardar marshes by the Monastir road
  return m;
}, EXT, 4);
function soft(x: number, z: number, foot: boolean) {
  const m = marsh(x, z);
  if (m < 0.05 || trackD(x, z) < 5 || railD(x, z) < 4) return 1;
  return 1 - m * (foot ? 0.3 : 0.6);
}

/** The concrete redoubts: as many on each wall, before the summits and the flank heights. */
const MGPOSTS = [[-45, 225], [20, 222], [-375, 262], [255, 258], [-30, -228], [40, -232], [-338, -268], [300, -258]];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1re section, 176e RI' }];

export default {
  id: 'salonika',
  name: 'Salonika',
  description: 'The Birdcage, the Allied entrenched camp round Salonika, 1916–17 — the Bulgarian and German attack that never came: wired trenches and redoubts on the bare hills north of the city against the heights across the Langaza basin, with Lake Langaza, Lake Beşik and their malarial marshes between. Behind the Allied line the tent camps, hospitals and dumps, the railway yards, the minarets and the White Tower on the gulf.',
  epochs: ['1918'],
  region: 'balkans', // (the Salonika front)
  airfields: [], // (hills, lakes and marsh: no flat dry strip long enough — the aircraft come in from the map edge)
  armies: { nato: ['fr', 'uk', 'serb'], pact: ['bg', 'de'] }, // (the Armée d’Orient, the British Salonika Army and the Serbian army in exile against the Bulgarians and the German Eleventh Army)
  sides: { nato: 'France, Britain and Serbia', pact: 'Bulgaria and Germany' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1700,
  segments: 720,
  bounds: { x: 500, z: 560 },
  steep: 0.6,
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 19161917,
  height,
  soft,
  river: lakes,
  fields: createFields({ seed: 191617, cell: 60, weights: [0.25, 0.15, 0.1, 0.5] as any }),

  theme: {
    // a Macedonian summer noon: heat haze over the marsh, dust on the hills, the gulf glittering behind the city
    fogColor: 0xcfc6b0, fogDensity: 0.0011, skyTop: 0x4e78a6, skyHorizon: 0xdcd2bc, skyBottom: 0x8a8470,
    sunColor: 0xfff0d4, sunIntensity: 1.8, sunDisk: 0.2, clouds: 0.12, cloudLight: 0xf6f2ea, cloudDark: 0xa49c8c,
    sunDir: [0.3, 0.85, 0.2], hemiSky: 0xd4d4cc, hemiGround: 0x6a6048, hemiIntensity: 1.3, rimColor: 0xe4d8c4, rimIntensity: 0.2,
    terrain: {
      grass: '#76723e', grassAlt: '#6a6a3a', dryGrass: '#ae9c5e', dirt: '#82694a', rock: '#aca490', strip: '#5a4a34',
      pasture: '#7a7640', ploughed: '#80684a', stubble: '#b29e64', meadow: '#7e7c46',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0xb0a080, 0.9];
        if (railD(x, z) < 3.5) return [0x6a604e, 0.9];
        const m = marsh(x, z);
        if (m > 0.2) return [noise(x * 0.05, z * 0.05) > 0 ? 0x6e7840 : 0x56663a, Math.min(0.85, m)]; // reeds and marsh grass
        const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (g > 0.55) return [0xaca490, Math.min(1, 0.6 + (g - 0.55) * 2)];
        if (g > 0.32) return [0xb8ac92, 0.7];
        if (y > 40) return [0xa89a60, 0.65];                                                  // the bare, dry heights
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Rota, 1. Sofiyski polk' })),
  },

  /** Each wall’s fire trench along its face over the basin, stepped with traverses, belts of wire below (the Birdcage’s, and the answer to it); MG nests on the flank heights. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -440; x <= 340; x += 25) { const X = s > 0 ? x : -100 - x; pts.push([X, s > 0 ? vall(X) + 150 + 14 * Math.sin(X * 0.018) : vall(X) - 150 - 12 * Math.sin(X * 0.021 + 2)]); }
      for (const w of trenchLine(pts, f, { zig: 1.5, wireAt: 18, belts: 3, gapEvery: 50 })) if (trackD(w.x, w.z) > 10 && railD(w.x, w.z) > 10 && wetQ(w.x, w.z) > 1.15) works.push(w);
      for (const id of s > 0 ? ['B', 'D'] : ['H', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-14, 14]) { const x = p.x + dx, z = p.z - 16 * s; if (trackD(x, z) > 9) works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f }); } }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const dry = (x: number, z: number, m = 1.25) => wetQ(x, z) > m && railD(x, z) > 8;
    const clear = (x: number, z: number, r = 8) => trackD(x, z) > r && steepAt(x, z) < 0.25 && dry(x, z);
    const m4 = new THREE.Matrix4();
    const cyl = (x: number, y: number, z: number, r0: number, r1: number, h: number, c: number, seg = 12) => props.push('plain', new THREE.CylinderGeometry(r0, r1, h, seg), m4.makeTranslation(x, y + h / 2, z), c);
    const minaret = (x: number, z: number, h = 17) => {
      const g = terrain.heightAt(x, z);
      cyl(x, g, z, 1.0, 1.25, h, 0xe8e2d2, 10); cyl(x, g + h * 0.78, z, 1.7, 1.7, 0.5, 0xd8d0bc, 10);
      props.push('plain', new THREE.ConeGeometry(1.15, 3, 10), m4.makeTranslation(x, g + h + 1.5, z), 0x6a6e72);
    };
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => !placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < r);

    // the concrete redoubts: a low box, firing slits all round, earth over the roof slab, the door at the back
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

    // ---- Salonika along the south edge: houses and minarets, the railway yards at its west end, the White Tower on the shore
    props.rand = mulberry32(1916);
    // the yards: sidings off the main line, a goods shed, wagons standing
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    for (const dz of [10, 20]) props.rails({ x0: -360, z0: 512 + dz, x1: -230, z1: 531 + dz * 0.6 });
    props.hall({ x: -300, z: 552, yaw: Math.PI, width: 30, depth: 12, height: 6, color: 0x8a6a52, name: 'goods shed' });
    placed.push([-300, 552], [-280, 552], [-320, 552]);
    for (const [x, z, k] of [[-340, 523, 'box'], [-322, 526, 'box'], [-290, 537, 'open'], [-270, 540, 'box'], [-252, 543, 'open']] as any[]) { props.wagon({ x, z, yaw: Math.atan2(130, 19), kind: k }); placed.push([x, z]); }
    for (let x = -215; x <= 300; x += 19) for (const z of [527, 547]) {
      const X = x + (props.rand() - 0.5) * 6, Z = z + (props.rand() - 0.5) * 4;
      if (props.rand() < 0.2 || Math.abs(X) < 55 || !clear(X, Z, 7) || wetQ(X, Z) < 1.12 || !free(X, Z, 15)) continue;
      placed.push([X, Z]);
      if (props.rand() < 0.5) props.flatHouse({ x: X, z: Z, yaw: Math.PI, width: 8 + props.rand() * 3, depth: 7 + props.rand() * 2, storeys: props.rand() < 0.4 ? 2 : 1 });
      else props.townHouse({ x: X, z: Z, yaw: Math.PI, width: 7 + props.rand() * 3, depth: 8, storeys: 2, damaged: 0 });
    }
    for (const [x, z] of [[-150, 538], [95, 537], [178, 552], [-62, 556]]) if (dry(x, z, 1.1)) minaret(x, z);
    { // the White Tower: the round Ottoman keep on the waterfront, the turret on its top
      let x = 330; const z = 548;
      for (let tx = 160; tx < 480; tx += 4) if (wetQ(tx, z) < 1.2) { x = tx - 14; break; }
      const g = terrain.heightAt(x, z);
      cyl(x, g - 0.5, z, 7.2, 7.6, 19, 0xece6d6, 20); cyl(x, g + 18.5, z, 7.8, 7.8, 1.2, 0xdcd4c2, 20); cyl(x, g + 19.5, z, 3.6, 3.8, 5, 0xece6d6, 14);
      props.push('plain', new THREE.ConeGeometry(4.2, 2.4, 14), m4.makeTranslation(x, g + 25.7, z), 0x7a6a5a);
      placed.push([x, z]);
    }
    // the small station at the north end of the line, by the Bulgarian side
    props.house({ x: -462, z: -470, yaw: Math.PI / 2, width: 12, depth: 6, height: 3.4 });
    props.wagon({ x: -478, z: -420, yaw: 0 }); props.wagon({ x: -478, z: -436, yaw: 0, kind: 'open' });

    // ---- Langaza in the basin: flat-roofed houses round the mosque and the old Turkish baths; Beşik village by its lake
    for (const [cx, cz, n, rr] of [[...at('F'), 12, 50], [...at('G'), 7, 40]] as any[]) {
      let got = 0;
      for (let i = 0; i < 80 && got < n; i++) {
        const a = props.rand() * Math.PI * 2, d = 20 + props.rand() * rr, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * 0.8;
        if (!clear(x, z, 8) || !dry(x, z, 1.3) || !free(x, z, 13)) continue;
        placed.push([x, z]); got++;
        props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + props.rand() * 3, depth: 6 + props.rand() * 2 });
      }
    }
    { const [fx, fz] = at('F'); for (const [mx, mz] of [[fx + 30, fz + 34], [fx - 34, fz - 30], [fx + 36, fz - 36]]) if (trackD(mx, mz) > 10 && dry(mx, mz, 1.3) && free(mx, mz, 12)) { props.flatHouse({ x: mx, z: mz, yaw: 0, width: 12, depth: 10, name: 'mosque', dome: true }); minaret(mx + 9, mz + 7); placed.push([mx, mz]); break; } }

    // ---- the camps behind each wall: tent lines, a hospital, the dumps — the Allies’ round Lembet and Zeitenlik, the Bulgarians’ before Guvezne
    for (const s of [1, -1]) {
      const canvas = s > 0 ? 0xd2cab0 : 0x8a8466;
      for (const [cx, cz] of [[-220, 455], [170, 455], [-330, 400], [330, 400]]) {
        const X = s > 0 ? cx : -cx - 20, Z = cz * s;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
          const x = X + (i - 1.5) * 9, z = Z + (j - 1) * 8;
          if (clear(x, z, 6) && free(x, z, 6)) props.tent({ x, z, yaw: 0, color: canvas });
        }
      }
      { const x = s > 0 ? -150 : 130, z = 520 * s; if (clear(x, z, 8) && free(x, z, 14)) { props.flatHouse({ x, z, yaw: s > 0 ? Math.PI : 0, width: 16, depth: 8, name: 'hospital' }); placed.push([x, z]); } }
      for (const [dx, dz] of [[80, 420], [100, 430], [-90, 425], [-110, 415], [250, 470], [-260, 470]]) {
        const x = s > 0 ? dx : -dx, z = dz * s;
        if (clear(x, z, 6) && free(x, z, 6)) props.crates({ x, z, yaw: props.rand() * 3 });
      }
    }
    // shepherds’ huts on the shelves and in the folds
    for (const [x, z] of [[-326, 306], [-372, 276], [6, 240], [292, 304], [-384, -286], [16, -276], [302, -306], [-30, -482]]) if (clear(x, z, 7) && free(x, z, 10)) props.house({ x, z, yaw: props.rand() * 3, width: 7, depth: 5, height: 2.6 });
    // rock on the bare hills; dry-stone sangars (each wall its own)
    const r = mulberry32(1916_19);
    for (let i = 0; i < 600; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (20 + r() * 520), big = r();
      if (nearPoint(x, z, 28) || trackD(x, z) < 7 || !dry(x, z, 1.4) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || away(x, z) < 80 || Math.abs(z) > 505 || !free(x, z, 9)) continue;
      if (big < 0.8) props.boulder({ x, z, radius: 0.8 + r() * 2 });
      else if (steepAt(x, z) < 0.35) props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 4, height: 1.2, color: 0xa29a88 });
    }
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J']) {
      const [px, pz] = at(id), s = pz > 0 ? -1 : 1;
      for (const dx of [-24, 24]) if (trackD(px + dx, pz + 20 * s) > 9) props.lowWall({ x: px + dx, z: pz + 20 * s, yaw: 0.2 * dx / 24, length: 7, height: 1.3, color: 0xa8a090 });
    }
    { const [ex, ez] = at('E'); props.sandbagRing({ x: ex + 20, z: ez + 18, radius: 4, toward: 1 }); props.sandbagRing({ x: ex + 22, z: ez - 18, radius: 4, toward: -1 }); }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => trackD(x, z) < 5 || railD(x, z) < 6 || wetQ(x, z) < 1.12 || !free(x, z, 9) }];
    // thin scrub (oak, juniper, Christ’s thorn) in the folds of the hills, as much on each wall; the crests bare
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.011 + 40, z * 0.011, 3);
    const tP = evenThreshold((x, z) => (away(x, z) > 60 ? wood0(x, z) : -9), 0.05, north);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 3200, broadleaf: 0.85, autumn: 0.3, maxY: 70, size: 0.5,
      forest: (x: number, z: number) => (away(x, z) < 60 || x < -420 ? 0.02 : wood0(x, z) > (north(x, z) ? 0.05 : tP) ? 0.55 : 0.04),
    });
    // willows round the lakes and plane trees in the villages and the city
    const willows = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 220, broadleaf: 1, autumn: 0.05, size: 0.9,
      forest: (x: number, z: number) => { const q = wetQ(x, z); return (q > 1.12 && q < 1.35 && z < 500) || Math.hypot(x - at('F')[0], z - at('F')[1]) < 70 ? 0.5 : z > 515 ? 0.15 : 0; },
    });
    cover.finalize(bounds);
    const grow = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.3, fields: this.fields });
    lakes.build(scene);
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grow.update(dt, t); trees.update(dt, t); willows.update(dt, t); },
    };
  },
} satisfies MapDef;
