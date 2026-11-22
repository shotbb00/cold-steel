// Kajmakčalan and the Crna bend, September–November 1916 (the front then held there through 1917): on 12–30 September
// the Serbian Drina Division went up the bare slopes of Kajmakčalan (2,521 m), the highest point of the Macedonian front,
// against the Bulgarian 8th Division and its German stiffening, took the summit, lost it to the counter-attack and took it
// again for good; in October and November the French, Serbs and Russians pushed down into the loop of the Crna river,
// stormed Hill 1050 — the “Piton des Mitrailleuses” — and the Iven heights, and on 19 November rode into Monastir (Bitola).
// The ground: the great bald summit in the west — rock, snow patches already in October, the little chapel of St Elijah
// the Serbs later built on top (and where the Drina Division’s fallen lie); the walls of the Crna valley on either side
// (Starkov Grob, Dobroveni, Iven over the Serbian side; Hill 1378, Hill 1212 and Čuke over the Bulgarian), beech woods low
// on them, alpine meadow above; down in the gorge the Crna itself in its loop round Hill 1050 with the bridge at the loop’s
// head, and east of it the edge of the Pelagonian plain round the village of Brod on its own bend and bridge. Mule tracks in
// long graded traverses (the only ground wheels will climb), the French Decauville and the German Feldbahn on the valley floor.
// Not mirrored but fair: each side holds one wall of the valley with a height west, centre and east (Starkov Grob against
// Hill 1378, Dobroveni against Hill 1212, Iven against Čuke) at the same reach, each its own graded track to them, from them
// down to the floor, and from its west height up to the summit of Kajmakčalan, which stands on the line between the bases.
// In the gorge each side has one river point on its own bank — Hill 1050 in the loop is reached dry from the Serbian bank and
// over the Crna bridge from the Bulgarian, Brod on its bend dry from the Bulgarian bank and over the Brod bridge from the
// Serbian — and the floor runs round the river’s head under the summit. The two walls are their own shapes.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine } from './common.js';
import { segDist, evenThreshold, farmVillage } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1916_0930);
/** The floor of the Crna valley across the middle (its own bends): flat, the river’s floodplain. */
const vall = (x: number) => 25 * Math.sin(1 - x * 0.006) + 6 * Math.sin(x * 0.02);
const FLOOR_H = 2.4, FLOOR_W = 105;
const away = (x: number, z: number) => Math.abs(z - vall(x));
const north = (x: number, z: number) => z > vall(x);
const V = (x: number, off: number) => [x, Math.round(vall(x) + off)];

/** The Crna, west to east as it is drawn (offsets from the valley’s line): out of its gorge under the summit, the loop round Hill 1050, the bend round Brod. */
const CRNA = [[-145, 12], [-125, 22], [-75, 38], [-30, 32], [-15, 5], [-22, -25], [-8, -58], [25, -75], [60, -72], [88, -50], [100, -15], [115, 15], [150, 15],
  [190, -10], [230, -28], [262, -15], [282, 20], [300, 50], [330, 58], [360, 35], [385, -5], [415, -28], [460, -25], [520, -10]].map(([x, o]) => V(x, o));
const river = createRiver({
  path: CRNA, halfWidth: 9, level: 0, depth: 2.6, valley: 24,
  crossings: [
    { name: 'Crna bridge', x: 42, z: Math.round(vall(42) - 74), kind: 'bridge', width: 7 },
    { name: 'Brod bridge', x: 330, z: Math.round(vall(330) + 58), kind: 'bridge', width: 7 },
  ],
});
const wet = (x: number, z: number, m = 0) => { const p = river.project(x, z); return p.d < p.hw + m; };

/** Kajmakčalan: the great dome in the west, on the line between the bases (squeezed east–west: it falls steeply into the Crna gorge). */
const KX = -350;
const dome = (x: number, z: number) => 170 * smoothstep(320, 0, Math.hypot((x - KX) * 1.4, z * 0.9));
/** Side ribs (+) and gullies (−) down each wall [x, z, r, h] (z squeezed: they run up and down the slope), and the heights’ domes. */
const SIDES = [[-190, 200, 80, -20], [170, 190, 90, 22], [-160, -190, 85, 20], [210, -200, 90, -24], [-60, -215, 70, -14],
  [10, 265, 90, 44], [-30, -272, 90, 18],                                   // Dobroveni, Hill 1212
  [-330, 300, 70, 14], [-395, -275, 70, 14], [350, 305, 70, 20], [290, -330, 70, 14]]; // Starkov Grob, Hill 1378; Iven, Čuke
function slope(x: number, z: number) {
  const a = away(x, z), n = north(x, z);
  const crest = n ? 290 + 20 * Math.sin(x * 0.008 + 1.5) : 285 + 24 * Math.sin(x * 0.0075 + 0.2);
  const k = smoothstep(FLOOR_W, 320, a);
  let h = FLOOR_H;
  h += 95 * smoothstep(FLOOR_W, crest, a);                                                 // the wall up to the crest
  h -= 30 * smoothstep(crest + 20, crest + 240, a);                                          // and down its back to the base
  h += ridged(noise, x * (n ? 0.010 : 0.012) + 3, z * (n ? 0.010 : 0.012), 4) * 24 * k;     // ribs and gullies in the rock
  for (const [sx, sz, r, sh] of SIDES) h += sh * smoothstep(r, 0, Math.hypot(x - sx, (z - sz) * 0.7)) ** 1.4;
  h += -0.04 * x * k;                                                                        // (the walls fall east, toward Pelagonia)
  h = Math.max(h, FLOOR_H + 0.4);                                                            // (no gully below the floor: no ponds off the river)
  // the summit: the higher of the wall and the dome, smoothly, with its own rock
  const d = dome(x, z);
  if (d > 0) { const j = d - h, s = 20 * smoothstep(0, 40, d); h = (h + d + Math.sqrt(j * j + s * s)) / 2 + ridged(noise, x * 0.014 + 11, z * 0.014, 3) * 10 * smoothstep(0, 60, d); }
  h += fbm(noise, x * 0.03, z * 0.03, 2) * 1.2;
  return h;
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Ostrovo road', 30, 465, 'centre'),
  P('B', 'Starkov Grob', -330, 300, 'west', { radius: 24 }),
  P('C', 'Dobroveni', 10, 265, 'centre', { radius: 24 }),
  P('D', 'Iven', 350, 305, 'east', { radius: 24 }),
  P('E', 'Kajmakčalan', KX, 0, 'west', { radius: 26 }),
  P('F', 'Hill 1050', 45, Math.round(vall(45) - 22), 'centre', { radius: 24 }),
  P('G', 'Brod', 330, Math.round(vall(330) + 14), 'east', { radius: 28 }),
  P('H', 'Hill 1378', -395, -275, 'west', { radius: 24 }),
  P('I', 'Hill 1212', -30, -272, 'centre', { radius: 24 }),
  P('J', 'Čuke', 290, -330, 'east', { radius: 24 }),
  P('K', 'Monastir road', 25, -465, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };
/** Where the tracks come down to the floor: by each bridge, and either side of the river’s head. */
const FOOT = { brodS: V(330, 86), crnaN: V(42, -98), westS: V(-115, 66), westN: V(-118, -26) };

// the shelves each point, base and track foot stands on (flattened, so a gun can unlimber there)
const SHELVES = [[0, BASE_Z, 36], [0, -BASE_Z, 36], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'G' ? 28 : p.id === 'F' ? 6 : 22]),
  ...Object.values(FOOT).map(([x, z]) => [x, z, 12])];
/** Hill 1050’s knoll in the loop. */
const knoll = (x: number, z: number) => {
  const r = Math.hypot(x - 45, z - vall(45) + 22); // (Hill 1050)
  return r > 50 ? 0 : 10 * smoothstep(50, 0, r) * smoothstep(18, 62, river.project(x, z).d); // (it falls gently to the water: the Crna bridge lands at its foot)
};
const ground0 = (x: number, z: number) => slope(x, z) + knoll(x, z);
const SHELF_H = SHELVES.map(([x, z]) => ground0(x, z));
/** The mule tracks, each from shelf to shelf, graded straight between their heights: from each base to its three heights, from them down to the floor, from the west height up the summit. */
const TRACKS = [
  [[0, BASE_Z], [-45, 440], [45, 390], [-30, 330], at('C')],
  [[0, BASE_Z], [-130, 475], [-250, 415], at('B')],
  [[0, BASE_Z], [130, 470], [250, 425], at('D')],
  [at('C'), [110, 175], V(40, 70), at('F')],
  [at('D'), [200, 205], FOOT.brodS],
  [at('B'), [-220, 225], FOOT.westS],
  [at('B'), [-445, 195], [-300, 120], at('E')],
  [[0, -BASE_Z], [50, -445], [-45, -385], [35, -330], at('I')],
  [[0, -BASE_Z], [-125, -470], [-245, -420], at('H')],
  [[0, -BASE_Z], [125, -480], [245, -405], at('J')],
  [at('I'), [120, -180], FOOT.crnaN],
  [at('J'), [455, -160], at('G')],
  [at('H'), [-235, -180], FOOT.westN],
  [at('H'), [-285, -175], [-425, -95], at('E')],
];
/** The tracks along the floor, either bank (the floor is flat: not graded), and round the river’s head. */
const FLOOR = [
  [FOOT.westS, V(-30, 70), V(40, 45), at('F')],
  [V(40, 45), V(110, 48), V(200, 62), V(280, 82), FOOT.brodS],
  [FOOT.westS, V(-160, 30), V(-160, -8), FOOT.westN],
  [FOOT.westN, V(-45, -72), FOOT.crnaN, V(120, -82), V(200, -58), V(320, -55), at('G')],
];
/** How far along each track (m) its corners are. */
const TRACK_S = TRACKS.map((t) => t.reduce((s: number[], p, i) => (i ? [...s, s[i - 1] + Math.hypot(p[0] - t[i - 1][0], p[1] - t[i - 1][1])] : [0]), []));
const nearestShelf = ([x, z]: number[]) => SHELVES.reduce((b, s, i) => (Math.hypot(s[0] - x, s[1] - z) < Math.hypot(SHELVES[b][0] - x, SHELVES[b][1] - z) ? i : b), 0);
const TRACK_H = TRACKS.map((t) => [SHELF_H[nearestShelf(t[0])], SHELF_H[nearestShelf(t[t.length - 1])]]);
/** The tracks’ boxes (padded), so a vertex far from a track skips it. */
const box = (t: number[][]) => [Math.min(...t.map((p) => p[0])) - 32, Math.max(...t.map((p) => p[0])) + 32, Math.min(...t.map((p) => p[1])) - 32, Math.max(...t.map((p) => p[1])) + 32];
const TRACK_BOX = TRACKS.map(box), FLOOR_BOX = FLOOR.map(box);
function trackD(x: number, z: number) {
  let d = Infinity;
  FLOOR.forEach((t, i) => { const b = FLOOR_BOX[i]; if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) d = Math.min(d, segDist(t, x, z)); });
  TRACKS.forEach((t, i) => { const b = TRACK_BOX[i]; if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) d = Math.min(d, segDist(t, x, z)); });
  return d;
}
const onRoad = (x: number, z: number) => trackD(x, z) < 3.2 && !wet(x, z, 1);

function height(x: number, z: number) {
  let h = ground0(x, z);
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
    const M = smoothstep(30, 6, dmin) ** 0.7;                                             // (wide, sloping banks: no walls along the cuts)
    if (W > 0) h += (H / W - h) * M;
  });
  return river.carve(x, z, h);
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1. četa' }];

export default {
  id: 'kajmakcalan',
  name: 'Kajmakčalan',
  description: 'September–November 1916 on the Salonika front: the Serbian Drina Division storms the bare 2,521 m summit of Kajmakčalan against the Bulgarians and Germans, while French and Serbs push into the loop of the Crna round Hill 1050 and the village of Brod at the edge of the Pelagonian plain. Rock and snow on top, beech woods below, the river deep in its gorge; wheels keep to the graded mule tracks and the two bridges.',
  epochs: ['1918'],
  region: 'italy', // (no Balkans region in 1918: the mountain front’s, as Dobro Pole — serb/bg have no roster yet and fall back to fr/de, which every region keeps)
  airfields: [], // (no flat ground in the mountains: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['serb', 'fr'], pact: ['bg', 'de'] }, // (the Drina Division and the French Armée d’Orient against the Bulgarian 8th Division with German troops; until Serbs and Bulgarians have their rosters: the French and the Germans)
  sides: { nato: 'Serbia and France', pact: 'Bulgaria and Germany' },
  conditions: { time: 'day', weather: 'overcast' },
  size: 1700,
  segments: 720,
  bounds: { x: 500, z: 560 },
  steep: 0.6, // (wheels and horses keep to the mule tracks, the shelves and the valley floor; men climb anywhere)
  overwatch: true,
  camera: { maxHeight: 640, far: 3200 },
  seed: 19160930,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191609, cell: 60, weights: [0.35, 0.15, 0.05, 0.45] as any }),

  theme: {
    // a grey autumn day high in the Macedonian mountains: cloud on the summit, the light flat
    fogColor: 0xaeb0ae, fogDensity: 0.0012, skyTop: 0x6c7c8c, skyHorizon: 0xc8c8c2, skyBottom: 0x7a7a74,
    sunColor: 0xf2e6d2, sunIntensity: 1.2, sunDisk: 0.1, clouds: 0.65, cloudLight: 0xe4e4e0, cloudDark: 0x86868a,
    sunDir: [0.5, 0.45, -0.35], hemiSky: 0xc4c8cc, hemiGround: 0x585446, hemiIntensity: 1.35, rimColor: 0xd4d0c8, rimIntensity: 0.2,
    terrain: {
      grass: '#5c6640', grassAlt: '#545e3a', dryGrass: '#8e8450', dirt: '#6a5c48', rock: '#9e9a90', strip: '#504432',
      pasture: '#646c40', ploughed: '#6a5a44', stubble: '#9a8e5c', meadow: '#70743e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x9a8e7a, 0.9];                                          // the mule tracks
        const a = away(x, z), d = dome(x, z);
        if (a < FLOOR_W - 10 && d < 20) return null;                                          // the floor’s fields and meadows
        const g = Math.hypot(slope(x + 2, z) - slope(x - 2, z), slope(x, z + 2) - slope(x, z - 2)) / 4;
        if (y > 130 && fbm(noise, x * 0.02 + 9, z * 0.02, 2) > 0.12 && g < 0.45) return [0xeceeee, 0.92]; // the first snow in the hollows of the summit
        if (g > 0.55) return [0x9e9a90, Math.min(1, 0.6 + (g - 0.55) * 2)];                // the bare rock faces
        if (g > 0.32 || d > 90) return [0xaca698, 0.7];                                       // scree, the bald summit
        if (a > 200 || d > 40) return [0x8a8658, 0.65];                                       // the alpine meadow, brown in autumn
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Rota' })),
  },

  /** The forward line cut into each wall’s face over the valley and across the summit’s flanks (wire below it, gaps where the tracks go), the heights’ MG posts. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -470; x <= 470; x += 30) { const X = x * s; pts.push([X, s > 0 ? vall(X) + 172 + 14 * Math.sin(X * 0.018) : vall(X) - 168 - 12 * Math.sin(X * 0.021 + 2)]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 50 })) if (trackD(w.x, w.z) > 10 && Math.hypot(w.x - KX, w.z) > 60) works.push(w);
      for (const id of s > 0 ? ['B', 'C', 'D'] : ['H', 'I', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-16, -8, 8, 16]) { const x = p.x + dx, z = p.z - 14 * s; if (trackD(x, z) > 9 && works.filter((w) => w.kind === 'mgNest' && Math.hypot(w.x - p.x, w.z - p.z) < 30).length < 2) works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f }); } }
      // the Piton des Mitrailleuses: MG nests dug into Hill 1050 facing both ways
      if (trackD(45 + 10 * s, vall(45) - 22 + 12 * s) > 8) works.push({ kind: 'mgNest', x: 45 + 10 * s, z: vall(45) - 22 + 12 * s, yaw: f === 'nato' ? 0 : Math.PI, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const clear = (x: number, z: number, r = 8) => trackD(x, z) > r && steepAt(x, z) < 0.25 && !wet(x, z, 12);

    // Brod: farmsteads on its bend of the river at the edge of the plain; a hamlet under Dobroveni and one under Hill 1212 on the floor
    const [gx, gz] = at('G');
    farmVillage(props, gx, gz, 12, 191611, (x, z) => !clear(x, z, 7) || Math.hypot(x - gx, z - gz) < 12, 0.75);
    farmVillage(props, ...(V(395, 72) as [number, number]), 4, 191614, (x, z) => !clear(x, z, 7), 0.6); // (and over the bridge)
    farmVillage(props, ...(V(-60, 80) as [number, number]), 3, 191612, (x, z) => !clear(x, z, 8), 0.7);
    farmVillage(props, ...(V(160, -75) as [number, number]), 3, 191613, (x, z) => !clear(x, z, 8), 0.7);
    // shepherds’ huts on the shelves of the heights and the bases
    props.rand = mulberry32(1916);
    for (const [x, z] of [[-306, 316], [-352, 286], [36, 250], [326, 320], [-418, -262], [-4, -290], [312, -344], [-30, 482], [34, -482]]) if (clear(x, z, 7)) props.house({ x, z, yaw: props.rand() * 3, width: 7, depth: 5, height: 2.6 });
    // the chapel of St Elijah on the summit: a small stone nave with its bell gable
    {
      const cx = KX + 13, cz = -6, g = terrain.heightAt(cx, cz), yaw = 0.3;
      props.box('stone', cx, g + 2, cz, 4.4, 4, 6.5, yaw, 0x9a9488);
      for (const sd of [-1, 1]) props.box('stone', cx + Math.cos(yaw) * 1.15 * sd, g + 4.75, cz - Math.sin(yaw) * 1.15 * sd, 2.9, 0.3, 7, yaw, 0x6a6058, 0, -0.62 * sd); // (the stone-slab roof)
      props.box('stone', cx + Math.sin(yaw) * 3.4, g + 5.6, cz + Math.cos(yaw) * 3.4, 1.4, 2.4, 0.6, yaw, 0x9a9488);
      cover.addBox({ x: cx, z: cz, yaw, length: 4.4, thickness: 6.5, height: 4 });
    }
    // the cableways that carried the guns and shells up to the heights
    const cableway = (ax: number, az: number, bx: number, bz: number) => {
      const n = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 45));
      let prev: any = null;
      for (let i = 0; i <= n; i++) {
        let x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n;
        if (trackD(x, z) < 5) { x += 7; z += 4; }
        const g = terrain.heightAt(x, z), top = { x, y: g + 7, z };
        props.beam('plain', { x, y: g - 0.5, z }, top, 0.32, 0x5a4a38);
        props.beam('plain', { x: x - 1.2, y: g + 6.6, z }, { x: x + 1.2, y: g + 6.6, z }, 0.2, 0x5a4a38);
        if (prev) props.wires([prev], [top]);
        prev = top;
      }
    };
    cableway(-60, 470, -315, 312); cableway(60, -470, -380, -290);
    // the light railways on the floor: the French Decauville up the Serbian bank to the Brod bridge, the German Feldbahn down the Bulgarian bank to Brod
    const rails = (line: number[][]) => { for (let i = 0; i < line.length - 1; i++) props.rails({ x0: line[i][0], z0: line[i][1], x1: line[i + 1][0], z1: line[i + 1][1] }); };
    const dec = [V(110, 54), V(200, 68), V(275, 88)], feld = [V(130, -88), V(200, -64), V(300, -62)];
    rails(dec); rails(feld);
    for (const [x, z] of [dec[0], feld[2]]) { props.crates({ x: x + 6, z: z + 8, yaw: 0.4 }); props.crates({ x: x - 8, z: z - 6, yaw: 1.2 }); }
    // rock everywhere, smashed by the shelling; dry-stone sangars
    const r = mulberry32(1609);
    for (let i = 0; i < 800; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (r() * 540), big = r();
      if (nearPoint(x, z, 28) || trackD(x, z) < 7 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || (away(x, z) < FLOOR_W && dome(x, z) < 30) || Math.hypot(x - KX - 13, z + 6) < 10) continue;
      if (big < 0.8) props.boulder({ x, z, radius: 0.8 + r() * 2.2 });
      else if (steepAt(x, z) < 0.35) props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 4, height: 1.2, color: 0x9e988c });
    }
    // rock sangars round the heights and the summit
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J', 'E']) {
      const [px, pz] = at(id);
      for (const s of id === 'E' ? [-1, 1] : [pz > 0 ? -1 : 1]) {
        for (const dx of [-22, 22]) if (trackD(px + dx, pz + 18 * s) > 9) props.lowWall({ x: px + dx, z: pz + 18 * s, yaw: 0.2 * dx / 22, length: 7, height: 1.3, color: 0xa29c90 });
        if (trackD(px - 30, pz + 26 * s) > 9) props.sandbagRing({ x: px - 30, z: pz + 26 * s, radius: 3.5, toward: s });
      }
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => trackD(x, z) < 5 || wet(x, z, 4) }];
    // beech forest on the lower slopes (not on the floor, not on the summit), as much on each wall; the meadow and rock above open
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.009 + 40, z * 0.009, 3);
    const lower = (x: number, z: number) => { const a = away(x, z); return a > FLOOR_W - 5 && a < 200 && dome(x, z) < 30; };
    const tP = evenThreshold((x, z) => (lower(x, z) ? wood0(x, z) : -9), -0.1, north);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid: [...avoid, { test: (x: number, z: number) => away(x, z) > 200 || dome(x, z) > 30 }], count: 4200, broadleaf: 0.9, autumn: 0.55, maxY: 400,
      forest: (x: number, z: number) => (!lower(x, z) ? (away(x, z) < FLOOR_W - 5 ? 0.03 : 0) : wood0(x, z) > (north(x, z) ? -0.1 : tP) ? 0.8 : 0.08),
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
