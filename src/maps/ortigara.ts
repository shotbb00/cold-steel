// Monte Ortigara, 10–25 June 1917: the Italian Sixth Army’s attack on the northern edge of the Asiago plateau. The
// Alpini battalions went up out of the Valle dell’Agnella and the Caldiera basin against the Austro-Hungarian
// positions on the bare limestone of Ortigara (2,105 m) and Monte Campigoletti, took the summit on the 19th, and lost
// it again to the Kaiserschützen’s counter-attack on the 25th: 25,000 Italians fell for a hill they could not keep.
// The ground, as it lies: one summit ridge running the length of the field — Cima Caldiera at the Italian end,
// Ortigara’s summit in the middle, Campigoletti at the Austrian end, low saddles between — high alpine terrain above
// the tree line, grey rock, scree and the last snow in the hollows. West of the crest the long bare limestone slope
// the Alpini climbed falls to the rocky Caldiera basin (the Valle dell’Agnella’s head, dwarf pine on its floor, Monte
// Lozze’s knoll in it) and rises again to the Malga Galmarara’s grazing on the far west rim; east of the crest the
// mountain breaks off toward the Valsugana — a steep face down to a ledge where the cableway from the valley lands
// and Cima Undici stands, then the drop over the edge. Trenches and sangars blasted into the rock, cableways carrying
// everything up, and the mule paths in long graded traverses; nowhere else will wheels go.
// Fair by distance, not by a mirror: each side holds one end of the ridge and its points pair up at the same reach
// from its own base — Cima Caldiera against Campigoletti on the crest, Monte Lozze against the Agnella pass on the
// west slope, the Malga Galmarara on the west rim against Cima Undici on the east ledge; the summit, the basin floor and
// the cableway’s landing lie between the bases.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine } from './common.js';
import { evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const EXT = { x: 520, z: 580 };
const noise = createNoise2D(1917_0610);
/** The crest line (x at z): the ridge runs the length of the field, a little skewed. */
const crestX = (z: number) => 215 - 0.03 * z + 12 * Math.sin(z * 0.01);
/** Signed distance across the ridge from its crest (− west, the Caldiera side; + east, the Valsugana side). */
const across = (x: number, z: number) => x - crestX(z);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Bivio Italia', 0, 470, 'centre'),
  P('B', 'Malga Galmarara', -380, 250, 'west'),
  P('C', 'Cima Caldiera', Math.round(crestX(290)), 290, 'east', { radius: 24 }),
  P('D', 'Monte Lozze', -60, 215, 'west', { radius: 24 }),
  P('E', 'Valle dell’Agnella', -190, 0, 'west', { radius: 30 }),
  P('F', 'Passo dell’Agnella', 70, -225, 'centre', { radius: 26 }),
  P('G', 'Valsugana cableway', 390, 0, 'east', { radius: 26 }),
  P('H', 'Monte Campigoletti', Math.round(crestX(-300)), -300, 'east', { radius: 24 }),
  P('I', 'Monte Ortigara', Math.round(crestX(0)), 0, 'centre', { radius: 26 }),
  P('J', 'Cima Undici', 400, -260, 'east', { radius: 24 }),
  P('K', 'Porta Manazzo', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The mountain before the paths: the ridge, its east face, ledge and drop, the basin, the west rim, the rock’s ribs. */
function mountain(x: number, z: number) {
  const u = across(x, z);
  let h: number;
  if (u < 0) h = 75 * Math.exp(-((u / 175) ** 2));                                           // the long west slope
  else h = 20 + 55 * (1 - smoothstep(0, 150, u)) - 60 * smoothstep(205, 310, u);             // the east face, the ledge, the drop
  for (const [cz, dh, r] of [[290, 12, 95], [0, 24, 100], [-300, 12, 95], [150, -9, 80], [-150, -9, 80]]) {
    const d = Math.hypot(x - crestX(cz), (z - cz) * 0.8); if (d < r * 2) h += dh * Math.exp(-((d / r) ** 2));   // the summits’ domes, the saddles
  }
  h -= 24 * Math.exp(-(((x + 190) / 230) ** 2 + (z / 290) ** 2));                            // the Caldiera basin
  h += 24 * Math.exp(-(((x + 60) / 75) ** 2 + ((z - 215) / 75) ** 2));                         // Monte Lozze’s knoll in it
  h += 26 * smoothstep(-300, -500, x) + 6 * Math.sin(z * 0.007 + 1) * smoothstep(-280, -480, x); // the west rim
  const rock = smoothstep(-260, -120, u) * (1 - smoothstep(170, 200, u)) + smoothstep(220, 260, u);
  h += ridged(noise, x * 0.011 + 5, z * 0.011, 4) * 14 * rock;                               // ribs and gullies in the rock
  h += fbm(noise, x * 0.03, z * 0.03, 2) * 1.4;
  return h;
}
/** The shelves each point and base stands on (flattened, so a gun can unlimber there). */
const SHELVES = [[0, BASE_Z, 36], [0, -BASE_Z, 36], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'E' || p.id === 'I' ? 30 : 24])];
const SHELF_H = SHELVES.map(([x, z]) => mountain(x, z));
function ground(x: number, z: number) {
  let h = mountain(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { const d = Math.hypot(x - sx, z - sz); if (d < r + 26) h += (SHELF_H[i] - h) * smoothstep(r + 26, r, d); });
  return h;
}

/** The mule paths, each from shelf to shelf: each base to its three; along the crest; down the west slope to the
 *  basin; the hairpins down the east face to the cableway’s ledge and along it. */
const ROADS = [
  [[0, BASE_Z], [60, 430], [140, 380], at('C')],
  [[0, BASE_Z], [-60, 380], at('D')],
  [[0, BASE_Z], [-200, 480], [-320, 380], at('B')],
  [at('C'), [crestX(150) - 14, 150], at('I')],
  [at('I'), [crestX(-150) - 14, -150], at('H')],
  [at('D'), [-140, 110], at('E')],
  [at('B'), [-320, 120], at('E')],
  [at('E'), [-60, -120], at('F')],
  [[0, -BASE_Z], [40, -380], at('F')],
  [[0, -BASE_Z], [110, -470], [190, -400], at('H')],
  [[0, -BASE_Z], [230, -510], [340, -420], at('J')],
  [at('E'), [20, 30], [120, -15], at('I')],
  [at('I'), [272, 92], [334, 58], at('G')],
  [at('G'), [395, -130], at('J')],
  [at('G'), [382, 150], [300, 300], at('C')],
  [at('H'), [300, -365], at('J')],
  [at('F'), [130, -120], at('I')],
];
/** Every path segment [ax, az, bx, bz, x0, x1, z0, z1, road, s0, len], bucketed on a 40 m grid with every segment within 30 m of the cell. */
const SEGS: number[][] = [];
ROADS.forEach((r, ri) => { let s = 0; for (let i = 0; i < r.length - 1; i++) { const [ax, az] = r[i], [bx, bz] = r[i + 1], l = Math.hypot(bx - ax, bz - az); SEGS.push([ax, az, bx, bz, Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz), ri, s, l]); s += l; } });
const RC = 40, RN = 34, R0 = -680;
const RBUCKETS: number[][][] = Array.from({ length: RN * RN }, () => []);
for (const sg of SEGS) {
  const [, , , , x0, x1, z0, z1] = sg;
  for (let j = Math.max(0, Math.floor((z0 - 30 - R0) / RC)); j <= Math.min(RN - 1, Math.floor((z1 + 30 - R0) / RC)); j++)
    for (let i = Math.max(0, Math.floor((x0 - 30 - R0) / RC)); i <= Math.min(RN - 1, Math.floor((x1 + 30 - R0) / RC)); i++) RBUCKETS[j * RN + i].push(sg);
}
const bucket = (x: number, z: number) => { const i = Math.floor((x - R0) / RC), j = Math.floor((z - R0) / RC); return i < 0 || j < 0 || i >= RN || j >= RN ? [] : RBUCKETS[j * RN + i]; };
/** The nearest point of each path within `cap` m: [road, distance, how far along]. */
function nearRoads(x: number, z: number, cap: number) {
  const best: number[][] = [];
  for (const [ax, az, bx, bz, x0, x1, z0, z1, ri, s0, l] of bucket(x, z)) {
    if (x < x0 - cap || x > x1 + cap || z < z0 - cap || z > z1 + cap) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (l * l || 1)));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d >= cap) continue;
    const b = best.find((q) => q[0] === ri);
    if (!b) best.push([ri, d, s0 + t * l]); else if (d < b[1]) { b[1] = d; b[2] = s0 + t * l; }
  }
  return best;
}
const roadDc = gridCache((x: number, z: number) => { let b = 30; for (const q of nearRoads(x, z, 30)) b = Math.min(b, q[1]); return b; }, EXT, 2);
const trackD = (x: number, z: number) => roadDc(x, z);
const onRoad = (x: number, z: number) => trackD(x, z) < 3.2;
/** Each path’s height every STEP m: the ground as closely as a grade of GRADE allows, its two ends held at their
 *  shelves (so paths meet level), smoothed. Worked out on first use. */
const GRADE = 0.3, STEP = 4;
let PROFILES: number[][] | null = null;
function profiles() {
  return (PROFILES ??= ROADS.map((t) => {
    const pts: number[][] = [];
    let carry = 0;
    for (let j = 0; j < t.length - 1; j++) {
      const [ax, az] = t[j], [bx, bz] = t[j + 1], l = Math.hypot(bx - ax, bz - az);
      for (let u = carry; u < l; u += STEP) pts.push([ax + ((bx - ax) * u) / l, az + ((bz - az) * u) / l]);
      carry = (carry - l) % STEP; if (carry < 0) carry += STEP;
    }
    pts.push(t[t.length - 1]);
    const n = pts.length - 1, d = GRADE * STEP, nat = pts.map(([x, z]) => ground(x, z)), h0 = nat[0], h1 = nat[n];
    const p = nat.map((v, k) => Math.max(Math.max(h0 - d * k, h1 - d * (n - k)), Math.min(Math.min(h0 + d * k, h1 + d * (n - k)), v)));
    for (let round = 0; round < 3; round++) {
      for (let k = 1; k < n; k++) p[k] = Math.max(p[k - 1] - d, Math.min(p[k - 1] + d, p[k]));
      for (let k = n - 1; k > 0; k--) p[k] = Math.max(p[k + 1] - d, Math.min(p[k + 1] + d, p[k]));
    }
    for (let round = 0; round < 3; round++) { const q = p.slice(); for (let k = 2; k < n - 1; k++) p[k] = (q[k - 2] + q[k - 1] + q[k] + q[k + 1] + q[k + 2]) / 5; }
    return p;
  }));
}
/** The mountain with its paths cut in, sampled once every 2 m (the noise and the paths are too dear for every vertex). */
const land = gridCacheSmooth((x: number, z: number) => {
  let h = ground(x, z);
  const PR = profiles();
  for (const [ri, d, s] of nearRoads(x, z, 13)) {
    const P = PR[ri], f = Math.min(P.length - 1.001, s / STEP), k = Math.floor(f);
    h += (P[k] + (P[k + 1] - P[k]) * (f - k) - h) * smoothstep(13, 5, d);
  }
  return h;
}, EXT, 2);
const height = (x: number, z: number) => land(x, z);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'ortigara',
  name: 'Ortigara',
  description: 'June 1917, above the tree line at the northern edge of the Asiago plateau: one bare limestone ridge the length of the field — Cima Caldiera, the summit of Ortigara, Campigoletti — the Alpini’s long slope up out of the Caldiera basin on one side, the face down to the Valsugana cableway’s ledge on the other. Rock, scree and snow; wheels keep to the mule paths.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (no flat ground on a mountain above 2,000 m: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['it'], pact: ['ah'] }, // (the Italian Sixth Army’s Alpini against the Austro-Hungarian 6th Division and the Kaiserschützen)
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1700,
  segments: 720,
  bounds: { x: 500, z: 560 },
  steep: 0.6, // (wheels and horses keep to the mule paths, the shelves and the gentler slopes; men climb anywhere)
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
        const g = Math.hypot(mountain(x + 2, z) - mountain(x - 2, z), mountain(x, z + 2) - mountain(x, z - 2)) / 4;
        if (y > 70 && fbm(noise, x * 0.02 + 9, z * 0.02, 2) > 0.3 && g < 0.4) return [0xeceeee, 0.92]; // the last snow in the hollows
        if (g > 0.5) return [0xa8a69c, Math.min(1, 0.6 + (g - 0.5) * 2)];                  // the bare limestone faces
        if (g > 0.28) return [0xbab6aa, 0.75];                                               // scree
        if (y > 45) return [0x9a9886, 0.7];                                                  // stony high pasture
        return null;                                                                         // the basin’s and the rim’s alpine turf
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 60, z: 330 }, pact: { x: 60, z: -330 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each side’s forward line blasted across the slope below its end of the ridge (wire before it, gaps where the paths go), MG posts on its heights. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -470; x <= 470; x += 30) { const X = x * s; if (across(X, 0) < 190) pts.push([X, s * (140 + (s > 0 ? 14 * Math.sin(X * 0.02) : 12 * Math.sin(X * 0.017 + 1)) + 30 * smoothstep(-100, 160, X))]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 50 })) if (trackD(w.x, w.z) > 10 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 30)) works.push(w);
      for (const id of s > 0 ? ['B', 'C', 'D'] : ['F', 'H', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-16, -8, 8, 16]) { const x = p.x + dx, z = p.z - 14 * s; if (trackD(x, z) > 9 && works.filter((w) => w.kind === 'mgNest' && Math.hypot(w.x - p.x, w.z - p.z) < 30).length < 2) works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f }); } }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const clear = (x: number, z: number, r = 8) => trackD(x, z) > r && steepAt(x, z) < 0.25;

    // the malghe and the shelters: stone huts on the shelves of the heights, the basin, the ledge and the bases
    props.rand = mulberry32(1706);
    for (const [x, z] of [[-356, 266], [-404, 232], [-34, 232], [-82, 200], [-214, 24], [-166, -26], [366, 22], [414, -18], [94, -240], [376, -276],
      [180, 300], [240, -316], [-30, 480], [-34, -482]]) if (clear(x, z, 7) && !nearPoint(x, z, 14)) props.house({ x, z, yaw: props.rand() * 3, width: 7, depth: 5, height: 2.6 });
    // the cableways that carried everything up: timber posts and the cable — from each base to its end of the crest, and up the east face from the Valsugana to the ledge
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
    cableway(30, 470, 190, 312); cableway(-30, -470, 196, -322); cableway(498, 30, 410, 14); cableway(498, -240, 420, -250);
    // sangars and rock everywhere: the limestone broken by the shelling, the old dry-stone walls of the sangars (each wall its own)
    const r = mulberry32(1717);
    for (let i = 0; i < 760; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (10 + r() * 530), big = r();
      if (nearPoint(x, z, 28) || trackD(x, z) < 7 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      if (big < 0.8) props.boulder({ x, z, radius: 0.8 + r() * 2.2 });
      else if (steepAt(x, z) < 0.35) props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 4, height: 1.2, color: 0xa29e94 });
    }
    // rock sangars round the summits, sandbag screens at the cavern mouths on Ortigara
    for (const id of ['B', 'C', 'D', 'F', 'H', 'J']) {
      const [px, pz] = at(id), s = pz > 0 ? -1 : 1;
      for (const dx of [-22, 22]) if (trackD(px + dx, pz + 18 * s) > 9) props.lowWall({ x: px + dx, z: pz + 18 * s, yaw: 0.2 * dx / 22, length: 7, height: 1.3, color: 0xa8a49a });
    }
    { const [ix, iz] = at('I'); for (const [dx, dz, t] of [[-26, 18, 1], [-24, -20, -1], [24, 26, 1]]) if (trackD(ix + dx, iz + dz) > 8) props.sandbagRing({ x: ix + dx, z: iz + dz, radius: 4, toward: t }); }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => trackD(x, z) < 5 }];
    // dwarf pine (mugo) in the basin, on the west rim and down below the ledge, as much on each half; nothing grows on the ridge
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.012 + 40, z * 0.012, 3);
    const low = (x: number, z: number) => across(x, z) < -170 || across(x, z) > 240;
    const north = (x: number, z: number) => z > 0;
    const tP = evenThreshold((x, z) => (low(x, z) ? wood0(x, z) : -9), 0, north);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, avoid, count: 3000, broadleaf: 0, autumn: 0, maxY: 60, size: 0.45,
      forest: (x: number, z: number) => (!low(x, z) ? 0 : wood0(x, z) > (north(x, z) ? 0 : tP) ? 0.75 : 0.06),
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.4, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
