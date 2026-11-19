// Caporetto, 24 October 1917: the Twelfth Battle of the Isonzo. At two in the morning the gas shells, at eight the
// assault in rain and fog: Austro-Hungarian and German divisions — the Alpenkorps, Rommel's Württemberg mountain
// battalion among them — came down the valley from Tolmein and Flitsch and up the ridges behind the Italian lines,
// and by evening were in Caporetto (Kobarid). The Italian Second Army broke; the retreat ran to the Piave.
// The Isonzo here runs green and fast over gravel along the bottom of a narrow valley, Kobarid on its banks round
// the stone bridge, villages on the terraces; on either side the mountains go straight up — beech woods turning
// in October, then pasture, then rock: Kolovrat's ridge over the Italian side, Krn and Mrzli vrh over the other.
// Not mirrored but fair: each side holds one wall of the valley — a saddle with its base, a pass village and two
// summits over the valley at the same reach and height, its own zigzag road down its central spur and mule tracks
// up to its pass and summit; the high crags on the west flank of both walls. Both fight for the floor and the town.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { segDist, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(1917_10);
const iso = (x: number) => 18 * Math.sin(x * 0.006) + 6 * Math.sin(x * 0.02) + 30 * (Math.cos(x * 0.012) - Math.cos(x * 0.005)); // (its own bends: not a mirror)
const river = createRiver({
  path: iso, halfWidth: 13, level: 0, depth: 2.6, valley: 40,
  crossings: [
    { name: 'Idrsko ford', x: -SIDE_X, kind: 'ford', width: 16, depth: 0.7 },
    { name: 'Kobarid bridge', x: 0, kind: 'bridge', width: 7 },
    { name: 'Ladra ford', x: SIDE_X, kind: 'ford', width: 16, depth: 0.7 },
  ],
});
const away = (x: number, z: number) => Math.abs(z - iso(x));
/** The zigzag road up each side's central spur to its saddle (each its own bends), and the valley roads. */
const SPURS = [[[0, 60], [34, 130], [-34, 200], [36, 270], [-30, 340], [22, 410], [0, BASE_Z]],
  [[0, -55], [-40, -120], [28, -185], [-42, -255], [30, -330], [-18, -405], [0, -BASE_Z]]];
// the mule tracks in zigzags up to the pass and the summit: graded (height), so the guns' teams and the lorries get up them
const TRACKS = [[[-SIDE_X, 60], [-SIDE_X + 50, 130], [-SIDE_X - 50, 190], [-SIDE_X + 40, 250], [-SIDE_X, 300]], [[SIDE_X, 70], [SIDE_X - 50, 130], [SIDE_X + 50, 190], [SIDE_X - 30, 250], [SIDE_X, 290]],
  [[-300, -80], [-250, -140], [-340, -200], [-290, -260], [-345, -340]], [[360, -60], [410, -130], [320, -190], [400, -240], [360, -280]]];
const north = (x: number, z: number) => z > iso(x);
/** The valley road along each bank (m off the river's middle). */
const bankRoad = (x: number, n: boolean) => (n ? iso(x) + 62 : iso(x) - 58 - 6 * Math.sin(x * 0.011 + 1));
const onRoad = (x: number, z: number) => {
  const n = north(x, z), v = Math.abs(z - bankRoad(x, n));
  if (v < 3.5) return 3.5 - v;                                                    // the valley road along the bank
  const d = Math.min(segDist(SPURS[n ? 0 : 1], x, z), ...TRACKS.filter((t) => (t[0][1] > 0) === n).map((t) => segDist(t, x, z) + 1));
  return d < 3.5 ? 3.5 - d : 0;
};

/** Side ridges (+) and ravines (−) down each wall [x, z, r, h] (z squeezed: they run up and down the slope): the Kolovrat's
 *  shoulder west of the spur and the gully under Monte Kuk; the Krn side's ravine below Mrzli vrh and its shoulder east of Vodil, the knoll over the Tolmein road. */
const SIDES = [[-170, 260, 100, 45], [200, 230, 80, -40], [-130, -250, 90, -42], [170, -280, 100, 45], [-170, -440, 60, 22]];
/** The mountainside (no shelves): rises from the valley floor; gentler on the central spur, highest on the flanks. */
function slope(x: number, z: number) {
  const a = away(x, z), n = north(x, z);
  // each wall its own: its spur (the Krn side's under Vodil, east of the Kolovrat's), its crests and gullies, and its
  // side ridges and ravines (SIDES) — the same rise from the floor to the crest on both, so neither looks down on the other
  const spur = 0.32 + 0.68 * smoothstep(50, 190, Math.abs(x - (n ? 0 : 60)));
  const k = smoothstep(110, 470, a);
  let h = 1.4 + smoothstep(16, 70, a) * 2.4;                                     // the gravel terraces
  h += 150 * k ** 1.25 * spur;
  h += ridged(noise, x * (n ? 0.008 : 0.011) + 5, z * (n ? 0.008 : 0.011), 4) * (n ? 38 : 41) * k * spur; // crests and gullies
  for (const [sx, sz, r, sh] of SIDES) h += sh * k * smoothstep(r, 0, Math.hypot(x - sx, (z - sz) * 0.5)) ** 1.5;
  h += smoothstep(380, 560, Math.abs(x)) * (x < 0 ? 85 : 55) * k;                 // the high summits on the flanks: the crags to the west on both walls
  h += fbm(noise, x * 0.03, z * 0.03, 2) * 1.5;
  return h;
}
// the shelves each point and base stands on: the saddle, the pass, the near summit, the far summit (each wall its own)
const SHELVES = [[0, BASE_Z, 34], [-SIDE_X, 320, 40], [0, 250, 26], [SIDE_X, 310, 34],
  [0, -BASE_Z, 34], [-355, -370, 36], [60, -240, 26], [360, -300, 38]];
const SHELF_H = SHELVES.map(([x, z]) => slope(x, z));
/** Nearest point on a polyline: its distance and how far along (m), and the polyline's length. */
function along(poly: number[][], x: number, z: number) {
  let best = { d: Infinity, s: 0 }, run = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[i + 1], l = Math.hypot(bx - ax, bz - az);
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (l * l)));
    const d = Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t);
    if (d < best.d) best = { d, s: run + t * l };
    run += l;
  }
  return { ...best, L: run };
}
const nearestShelf = ([x, z]: number[]) => SHELVES.reduce((b, s, i) => (Math.hypot(s[0] - x, s[1] - z) < Math.hypot(SHELVES[b][0] - x, SHELVES[b][1] - z) ? i : b), 0);
const TRACK_H = TRACKS.map((t) => [slope(t[0][0], t[0][1]), SHELF_H[nearestShelf(t[t.length - 1])]]);
function height(x: number, z: number) {
  let h = slope(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { h += (SHELF_H[i] - h) * smoothstep(r + 26, r, Math.hypot(x - sx, z - sz)); });
  TRACKS.forEach((t, i) => { const a = along(t, x, z); if (a.d < 12) h += (TRACK_H[i][0] + (TRACK_H[i][1] - TRACK_H[i][0]) * (a.s / a.L) - h) * smoothstep(12, 4, a.d); });
  return river.carve(x, z, h);
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Kolovrat saddle', 0, 470, 'centre'),
  P('B', 'Luico pass', -SIDE_X, 320, 'west'),
  P('C', 'Hill 1114', 0, 250, 'centre', { radius: 22 }),
  P('D', 'Monte Kuk', SIDE_X, 310, 'east', { radius: 24 }),
  P('E', 'Idrsko', -SIDE_X + 10, Math.round(iso(-SIDE_X + 10) + 115), 'west'),
  P('F', 'Kobarid', 0, Math.round(iso(0)), 'centre', { radius: 32 }),
  P('G', 'Ladra', 290, Math.round(iso(290) - 75), 'east'),
  P('H', 'Mrzli vrh', -355, -370, 'west', { radius: 24 }),
  P('I', 'Vodil', 60, -240, 'centre', { radius: 22 }),
  P('J', 'Krn', 360, -300, 'east'),
  P('K', 'Tolmein road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'caporetto',
  name: 'Caporetto',
  description: '24 October 1917, in rain and fog: the Isonzo valley under steep mountains, Kobarid round its bridge on the valley floor. Hold your wall of the valley — the pass, the summits, the road down the spur — and fight for the town.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (no flat ground clear of Kobarid and the lines in the Isonzo valley: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['it'], pact: ['ah', 'de'] }, // (the Italian Second Army against the Austro-German Fourteenth Army: maps/index.js armiesOn)
  sides: { nato: 'Italy', pact: 'Central Powers' },
  conditions: { time: 'dawn', weather: 'rain' },
  size: 1700,
  segments: 720,
  bounds: { x: 500, z: 560 },
  steep: 0.55, // (wheels and horses keep to the roads and the gentler spurs; men climb anywhere)
  overwatch: true,
  camera: { maxHeight: 620, far: 3200 },
  seed: 1917,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191710, cell: 60, weights: [0.45, 0.2, 0.05, 0.3] as any }),

  theme: {
    // low cloud on the mountains, rain
    fogColor: 0x9ca2a2, fogDensity: 0.0019, skyTop: 0x5c6670, skyHorizon: 0xa8aeac, skyBottom: 0x646862,
    sunColor: 0xdcd8cc, sunIntensity: 1.3, sunDisk: 0.05, clouds: 0.95, cloudLight: 0xb8bcbc, cloudDark: 0x5e6468,
    sunDir: [-0.3, 0.6, 0.5], hemiSky: 0xb4bcc0, hemiGround: 0x4c4838, hemiIntensity: 1.35, rimColor: 0xb8c0c6, rimIntensity: 0.2,
    terrain: {
      grass: '#56643a', grassAlt: '#4c5a34', dryGrass: '#8a7c50', dirt: '#5e5040', rock: '#8e8c84', strip: '#4a4032',
      pasture: '#5a6a3a', ploughed: '#6a5c48', stubble: '#9a8c58', meadow: '#62703e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z) > 0) return [0x8a8070, 0.9];                                       // the graded roads (limestone grit)
        const a = away(x, z);
        if (a < 30 && y < 2.2) return [0xc4c0b0, 0.95];                                    // the Isonzo's pale gravel
        if (y > 40) {
          const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
          if (g > 0.7) return [0x9a978c, Math.min(1, (g - 0.7) * 3)];                        // limestone crags
          if (y > 130) return [0x7e7a58, 0.6];                                               // the high pastures, browned
        }
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

  /** The forward line on each side's lower slope over the valley (wire below it), the summits' posts. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -470; x <= 470; x += 30) { const X = x * s; pts.push([X, s > 0 ? iso(X) + 150 + 12 * Math.sin(X * 0.02) : iso(X) - 150 - 14 * Math.sin(X * 0.017 + 1)]); } // (left to right as its owner looks)
      const trackX = TRACKS.filter((t) => (t[0][1] > 0) === (s > 0)).map((t) => t[0][0]);
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 50 })) if (onRoad(w.x, w.z) === 0 && trackX.every((tx) => Math.abs(w.x - tx) > 30)) works.push(w);
      for (const id of s > 0 ? ['B', 'C', 'D'] : ['H', 'I', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-10, 10]) works.push({ kind: 'mgNest', x: p.x + dx, z: p.z - 14 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f }); }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const skip = (x: number, z: number) => away(x, z) < 26 || onRoad(x, z) > 0 || onRoad(x + 6, z) > 0 || onRoad(x - 6, z) > 0 || steepAt(x, z) > 0.3;

    // Kobarid: stone houses on both banks round the bridge and the square, the church; the bridge's guard posts
    for (const m of [1, -1]) {
      const r = (props.rand = mulberry32(1710 + m));
      for (let i = 0; i < 40; i++) {
        const x = (r() - 0.5) * (m > 0 ? 230 : 200) + (m > 0 ? 0 : 20), z = iso(x) + m * (30 + r() * 80);
        if (skip(x, z) || Math.hypot(x, z - iso(0)) < 26) continue;
        props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + r() * 0.2, width: 7 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.4 ? 3 : 2, damaged: 0.05 });
      }
      const cx = m > 0 ? -48 : 62;
      props.church({ x: cx, z: iso(cx) + m * (m > 0 ? 78 : 70), yaw: m > 0 ? 0 : Math.PI });
      props.sandbagRing({ x: 9 * m, z: iso(9 * m) + 24 * m, radius: 4, toward: -m });
    }
    // the villages on the terraces and the pass villages up on their saddles
    for (const p of points) {
      if (!['E', 'B', 'G', 'J'].includes(p.id)) continue;
      farmVillage(props, p.x, p.z, 6, 17100 + Math.round(p.x * 3 + p.z * 7), skip, 0.9);
    }
    // stone huts and stalls of the summer pastures on the summits, a cableway station on each saddle
    props.rand = mulberry32(1720);
    for (const [x, z] of [[SIDE_X + 26, 296], [SIDE_X - 30, 330], [20, 262], [-18, 470], [26, 486], [-327, -386], [-381, -348], [84, -226], [30, -474], [-20, -488], [384, -284]]) props.house({ x, z, yaw: props.rand() * 3, width: 7, depth: 5, height: 2.6 });
    // rocks and old sangars over the slopes, cover sites on the valley floor
    const r = mulberry32(1717);
    for (let i = 0; i < 520; i++) {                                                 // (each wall its own)
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (40 + r() * 500);
      const big = r();
      if (nearPoint(x, z, 30) || onRoad(x, z) > 0 || away(x, z) < 30 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      if (big < 0.7) props.boulder({ x, z, radius: 1 + r() * 2 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 5 + r() * 5, height: 1.2, color: 0x9a968c });
    }
    for (let i = 0, n = 0; i < 4000 && n < 48; i++) {
      const s = n % 2 ? -1 : 1, x = (r() * 2 - 1) * 460, z = iso(x) + s * (30 + r() * 90);
      if (skip(x, z) || nearPoint(x, z, 40) || Math.abs(x) < 130) continue;
      n++;
      buildSite(props, { kind: ['hay', 'fieldwall', 'farm', 'fieldwall'][Math.floor(n / 2) % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => away(x, z) < 22 || onRoad(x, z) > 0 }];
    // beech woods up the slopes in their October colours, pine higher; the valley floor open
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.006 + 40, z * 0.006, 3);
    const tP = evenThreshold(wood0, -0.15, north) + 0.15;   // (each wall its own woods, as much on each)
    const wood = (x: number, z: number) => wood0(x, z) - (north(x, z) ? 0 : tP);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 5200, broadleaf: 0.7, autumn: 0.75, maxY: 260,
      forest: (x: number, z: number) => { const a = away(x, z); if (a < 120) return a > 60 && wood(x, z) > 0.2 ? 0.4 : 0; return wood(x, z) > -0.15 ? 0.85 : 0.2; },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
