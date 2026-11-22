// Monte Ortigara, 10–25 June 1917: the Italian Sixth Army’s attack on the northern edge of the Asiago plateau. The
// Alpini battalions went up out of the Valle dell’Agnella under Cima Caldiera and Monte Lozze against the
// Austro-Hungarian positions on the bare limestone of Ortigara (2,105 m) and Monte Campigoletti, took the summit on the
// 19th, and lost it again to the Kaiserschützen’s counter-attack on the 25th: 25,000 Italians fell for a hill they
// could not keep.
// The ground: high alpine terrain above the tree line — grey rock, scree on the faces and the last snow in the
// hollows; dwarf pine only down on the floor of the Valle dell’Agnella, the saddle of the Agnella pass in the middle of
// it. Over the Italian side Cima Caldiera, Monte Lozze and the Malga Galmarara on its knoll; over the Austrian
// Ortigara, Campigoletti and Cima Undici. Trenches and sangars blasted into the rock, cableways carrying everything up,
// and the mule paths in long traverses — graded, so the guns’ teams and the lorries get up them; nowhere else will wheels go.
// Not mirrored but fair: each side holds one wall of the valley — a summit over the pass at the same reach and height
// (Caldiera against Ortigara), a knoll on the west flank and a height on the east at the same reach, each its own
// mule path from its base to every one of them and from each down to the valley floor; the high crags on the
// east flank of both walls. Both fight for the floor and the pass between the summits.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine } from './common.js';
import { segDist, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1917_0610);
/** The floor of the Valle dell’Agnella across the middle (its own bends), and its height: the pass in the middle, falling away west and east. */
const vall = (x: number) => 22 * Math.sin(x * 0.005 + 0.4) + 9 * Math.sin(x * 0.019);
const floorH = (x: number) => 4 + 22 * smoothstep(400, 40, Math.abs(x - 10));
const away = (x: number, z: number) => Math.abs(z - vall(x));
const north = (x: number, z: number) => z > vall(x);

/** Side ridges (+) and gullies (−) down each wall [x, z, r, h] (z squeezed: they run up and down the slope), and the summits’ domes. */
const SIDES = [[-180, 170, 90, 22], [190, 160, 80, -24], [-150, -180, 90, -24], [170, -170, 90, 22],
  [-20, 250, 90, 25], [60, -265, 90, 25],                                   // Cima Caldiera, Monte Ortigara
  [-330, 300, 70, 12], [-370, -330, 70, 12], [330, 290, 70, 15], [380, -280, 70, 15]]; // Galmarara’s knoll, Campigoletti; Lozze, Cima Undici
function slope(x: number, z: number) {
  const a = away(x, z), n = north(x, z);
  const crest = n ? 270 + 25 * Math.sin(x * 0.008) : 280 + 20 * Math.sin(x * 0.011 + 1);
  const k = smoothstep(60, 300, a);
  let h = floorH(x) + 1.5 * smoothstep(10, 40, a);
  h += 85 * smoothstep(40, crest, a);                                                      // the wall up to the crest
  h -= 30 * smoothstep(crest + 20, crest + 240, a);                                          // and down its back to the base
  h += ridged(noise, x * (n ? 0.009 : 0.012) + 5, z * (n ? 0.009 : 0.012), 4) * 25 * k;     // ribs and gullies in the rock
  for (const [sx, sz, r, sh] of SIDES) h += sh * smoothstep(r, 0, Math.hypot(x - sx, (z - sz) * 0.7)) ** 1.4;
  h += smoothstep(400, 540, x) * 50 * k;                                                     // the crags toward Cima Dodici, east on both walls
  h += 0.06 * x;                                                                             // (the whole ground falls west, down the Agnella toward Galmarara)
  h += fbm(noise, x * 0.03, z * 0.03, 2) * 1.2;
  return h;
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Bivio Italia', -35, 465, 'centre'),
  P('B', 'Malga Galmarara', -330, 300, 'west'),
  P('C', 'Cima Caldiera', -20, 250, 'centre', { radius: 24 }),
  P('D', 'Monte Lozze', 330, 290, 'east', { radius: 24 }),
  P('E', 'Valle dell’Agnella', -320, Math.round(vall(-320) + 25), 'west', { radius: 26 }),
  P('F', 'Passo dell’Agnella', 10, Math.round(vall(10)), 'centre', { radius: 30 }),
  P('G', 'Agnella cableway', 270, Math.round(vall(270) - 25), 'east', { radius: 26 }),
  P('H', 'Monte Campigoletti', -370, -330, 'west', { radius: 24 }),
  P('I', 'Monte Ortigara', 60, -265, 'centre', { radius: 24 }),
  P('J', 'Cima Undici', 380, -280, 'east', { radius: 24 }),
  P('K', 'Porta Manazzo', -30, -465, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

// the shelves each point and base stands on (flattened, so a gun can unlimber there)
const SHELVES = [[0, BASE_Z, 36], [0, -BASE_Z, 36], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'F' ? 30 : 22])];
const SHELF_H = SHELVES.map(([x, z]) => slope(x, z));
/** The mule paths, each from shelf to shelf, graded straight between their heights: from each base to its three heights, and from each height down its own traverse and one bend to the floor. */
const TRACKS = [
  [[0, BASE_Z], [40, 430], [-40, 380], [30, 320], at('C')],
  [[0, BASE_Z], [-120, 470], [-230, 420], at('B')],
  [[0, BASE_Z], [120, 480], [240, 410], at('D')],
  [at('C'), [110, 160], at('F')],
  [at('B'), [-230, 160], at('E')],
  [at('D'), [440, 160], at('G')],
  [[0, -BASE_Z], [-40, -440], [50, -385], [-20, -325], at('I')],
  [[0, -BASE_Z], [-130, -480], [-260, -420], at('H')],
  [[0, -BASE_Z], [130, -470], [260, -390], at('J')],
  [at('I'), [-70, -150], at('F')],
  [at('H'), [-440, -160], at('E')],
  [at('J'), [220, -170], at('G')],
];
/** The track along the valley floor, E – the pass – G (the floor is gentle: not graded). */
const FLOOR = [at('E'), ...Array.from({ length: 19 }, (_, i) => [-290 + i * 30, vall(-290 + i * 30)]), at('G')];
/** How far along each track (m) its corners are. */
const TRACK_S = TRACKS.map((t) => t.reduce((s: number[], p, i) => (i ? [...s, s[i - 1] + Math.hypot(p[0] - t[i - 1][0], p[1] - t[i - 1][1])] : [0]), []));
const nearestShelf = ([x, z]: number[]) => SHELVES.reduce((b, s, i) => (Math.hypot(s[0] - x, s[1] - z) < Math.hypot(SHELVES[b][0] - x, SHELVES[b][1] - z) ? i : b), 0);
const TRACK_H = TRACKS.map((t) => [SHELF_H[nearestShelf(t[0])], SHELF_H[nearestShelf(t[t.length - 1])]]);
/** The tracks’ boxes (padded), so a vertex far from a track skips it. */
const TRACK_BOX = TRACKS.map((t) => [Math.min(...t.map((p) => p[0])) - 32, Math.max(...t.map((p) => p[0])) + 32, Math.min(...t.map((p) => p[1])) - 32, Math.max(...t.map((p) => p[1])) + 32]);
function trackD(x: number, z: number) {
  let d = segDist(FLOOR, x, z);
  TRACKS.forEach((t, i) => { const b = TRACK_BOX[i]; if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) d = Math.min(d, segDist(t, x, z)); });
  return d;
}
const onRoad = (x: number, z: number) => trackD(x, z) < 3.2;

function height(x: number, z: number) {
  let h = slope(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { h += (SHELF_H[i] - h) * smoothstep(r + 26, r, Math.hypot(x - sx, z - sz)); });
  TRACKS.forEach((t, i) => {
    const b = TRACK_BOX[i]; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return;
    // the legs as near as the nearest vote their own grade (shared on a hairpin’s bisector): no step where two legs meet; past its ends a track is the shelf’s
    const [h0, h1] = TRACK_H[i], S = TRACK_S[i], L = S[S.length - 1], D: number[] = [], G: number[] = [];
    let W = 0, H = 0, M = 0, dmin = Infinity;
    for (let j = 0; j < t.length - 1; j++) {
      const [ax, az] = t[j], [bx, bz] = t[j + 1], l = S[j + 1] - S[j];
      const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (l * l)));
      D[j] = (j === 0 && u === 0) || (j === t.length - 2 && u === 1) ? Infinity : Math.hypot(x - ax - (bx - ax) * u, z - az - (bz - az) * u); G[j] = h0 + (h1 - h0) * (S[j] + u * l) / L;
      dmin = Math.min(dmin, D[j]);
    }
    if (dmin >= 30) return;
    for (let j = 0; j < D.length; j++) { const w = smoothstep(dmin + 6, dmin, D[j]) + 1e-6; W += w; H += w * G[j]; }
    M = smoothstep(30, 6, dmin) ** 0.7;                                                   // (wide, sloping banks: no walls along the cuts)
    if (W > 0) h += (H / W - h) * M;
  });
  return h;
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'ortigara',
  name: 'Ortigara',
  description: 'June 1917, above the tree line at the northern edge of the Asiago plateau: the Alpini against the Austro-Hungarian positions on the bare limestone of Monte Ortigara and Campigoletti, across the Agnella pass from Cima Caldiera. Rock, scree and snow; wheels keep to the mule paths.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (no flat ground on a mountain above 2,000 m: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['it'], pact: ['ah'] }, // (the Italian Sixth Army’s Alpini against the Austro-Hungarian 6th Division and the Kaiserschützen)
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1700,
  segments: 720,
  bounds: { x: 500, z: 560 },
  steep: 0.6, // (wheels and horses keep to the mule paths, the shelves and the valley floor; men climb anywhere)
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 19170610,
  height,
  fields: createFields({ seed: 191706, cell: 60, weights: [0.3, 0.1, 0.0, 0.6] as any }),

  theme: {
    // a clear June dawn at 2,000 m: thin cold air, the sun low over the Valsugana side
    fogColor: 0xb4bcc4, fogDensity: 0.0011, skyTop: 0x5a7c9e, skyHorizon: 0xc8d0d6, skyBottom: 0x7a828a,
    sunColor: 0xffe6c8, sunIntensity: 1.7, sunDisk: 0.25, clouds: 0.35, cloudLight: 0xeef0f2, cloudDark: 0x8e969e,
    sunDir: [0.55, 0.42, 0.35], hemiSky: 0xc4d0dc, hemiGround: 0x5a5a4c, hemiIntensity: 1.3, rimColor: 0xd4dce2, rimIntensity: 0.25,
    terrain: {
      grass: '#66704a', grassAlt: '#5c6644', dryGrass: '#8c8a64', dirt: '#6a6252', rock: '#a8a69e', strip: '#4e4838',
      pasture: '#6a7450', ploughed: '#6a6050', stubble: '#9a9470', meadow: '#6e7a4c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x9a9282, 0.9];                                          // the mule paths (limestone grit)
        const a = away(x, z);
        if (a < 40) return null;                                                             // the floor’s alpine turf
        const g = Math.hypot(slope(x + 2, z) - slope(x - 2, z), slope(x, z + 2) - slope(x, z - 2)) / 4;
        if (y > 110 && fbm(noise, x * 0.02 + 9, z * 0.02, 2) > 0.32 && g < 0.45) return [0xeceeee, 0.92]; // the last snow in the hollows
        if (g > 0.55) return [0xa8a69c, Math.min(1, 0.6 + (g - 0.55) * 2)];                // the bare limestone faces
        if (g > 0.3) return [0xbab6aa, 0.75];                                                // scree
        if (y > 70) return [0x9a9886, 0.7];                                                  // stony high pasture
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** The forward line blasted into each wall’s face over the valley (wire below it, gaps where the mule paths go), the summits’ MG posts. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -470; x <= 470; x += 30) { const X = x * s; pts.push([X, s > 0 ? vall(X) + 150 + 12 * Math.sin(X * 0.02) : vall(X) - 150 - 14 * Math.sin(X * 0.017 + 1)]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 50 })) if (trackD(w.x, w.z) > 10) works.push(w);
      for (const id of s > 0 ? ['B', 'C', 'D'] : ['H', 'I', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-16, -8, 8, 16]) { const x = p.x + dx, z = p.z - 14 * s; if (trackD(x, z) > 9 && works.filter((w) => w.kind === 'mgNest' && Math.hypot(w.x - p.x, w.z - p.z) < 30).length < 2) works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f }); } }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const clear = (x: number, z: number, r = 8) => trackD(x, z) > r && steepAt(x, z) < 0.25;

    // the malghe and the shelters: stone huts on the shelves of the heights, the pass and the bases
    props.rand = mulberry32(1706);
    for (const [x, z] of [[-306, 316], [-352, 288], [-44, 236], [306, 306], [-344, 26], [-296, 22], [34, -6], [-18, 26], [246, -26], [292, -32],
      [-394, -316], [84, -280], [404, -266], [-30, 480], [-34, -482]]) if (clear(x, z, 7)) props.house({ x, z, yaw: props.rand() * 3, width: 7, depth: 5, height: 2.6 });
    // the cableways that carried everything up: timber posts and the cable from the rear to each summit, the valley stations to the flank heights
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
    cableway(26, 470, 4, 268); cableway(-24, -470, 44, -282); cableway(-300, 30, -320, 280); cableway(250, -30, 364, -262);
    // sangars and rock everywhere: the limestone broken by the shelling, the old dry-stone walls of the sangars (each wall its own)
    const r = mulberry32(1717);
    for (let i = 0; i < 700; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (20 + r() * 520), big = r();
      if (nearPoint(x, z, 28) || trackD(x, z) < 7 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      if (big < 0.8) props.boulder({ x, z, radius: 0.8 + r() * 2.2 });
      else if (steepAt(x, z) < 0.35) props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 4, height: 1.2, color: 0xa29e94 });
    }
    // rock sangars round the summits, the cavern mouths’ sandbag screens on the pass
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J']) {
      const [px, pz] = at(id), s = pz > 0 ? -1 : 1;
      for (const dx of [-22, 22]) if (trackD(px + dx, pz + 18 * s) > 9) props.lowWall({ x: px + dx, z: pz + 18 * s, yaw: 0.2 * dx / 22, length: 7, height: 1.3, color: 0xa8a49a });
    }
    { const [fx, fz] = at('F'); props.sandbagRing({ x: fx - 22, z: fz + 14, radius: 4, toward: 1 }); props.sandbagRing({ x: fx + 24, z: fz - 14, radius: 4, toward: -1 }); }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => trackD(x, z) < 5 }];
    // dwarf pine (mugo) on the valley floor and the lower slopes only, as much on each side; nothing grows on the rock above
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.012 + 40, z * 0.012, 3);
    const tP = evenThreshold((x, z) => (away(x, z) < 130 ? wood0(x, z) : -9), 0, north);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 2600, broadleaf: 0, autumn: 0, maxY: 75, size: 0.45,
      forest: (x: number, z: number) => (away(x, z) > 130 ? 0 : wood0(x, z) > (north(x, z) ? 0 : tP) ? 0.75 : 0.06),
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.4, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
