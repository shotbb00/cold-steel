// Ariake Bay, November 1945: Operation Olympic’s eastern landing (1945 only; coastal: the US land, the Imperial Japanese
// Army holds; 1.0 × 1.8 km, the Pacific). The invasion of Japan that never came: on X-Day, 1 November 1945, the Sixth
// Army’s XI Corps — the Americal, the 1st Cavalry and the 43rd Infantry Divisions — was to come ashore at the head of
// Ariake Bay, on the long curving beach between Shibushi and Kashiwabaru on Kyushu’s south coast, in Higgins boats and
// LCTs, and take the bay as a harbour for the drive inland. The 86th Division waited for them dug into the heights over
// the bay, every gun registered on the sand, with the 57th Army’s reserve and its tanks behind on the Kasanohara plateau.
// On the map (seen from the sea, +z; north-east is to the right, +x): out at sea the transport area and the mine field
// across the bay, the rock of Biro-jima off Shibushi point; then the beach, a gentle arc of grey sand with a belt of stakes
// and hedgehogs in the shallows, the dunes behind it and the black-pine shelter belts planted against the wind. Three
// beach sectors: Kashiwabaru in the west, the Hishida mouth in the middle (the river a tidal channel across the sand, a
// shallow stream inland), Shibushi in the east under the rocky point, where the Navy’s shinyo suicide boats wait in
// pens dug into the cliff at the waterline. Behind the pines the coast road and the Ōsumi line, harvested paddies, the
// villages, Shibushi town round its station and the castle hill; the terraced hills — Ariake heights over the middle,
// cave galleries in their faces — and, across the back, the shirasu scarp of the Kasanohara plateau, cut by three
// valleys (the Hishida’s, the west road’s, the Shibushi line’s), the only ways up for vehicles.
// How it plays: the landing comes in under the guns on the heights and the battery on the scarp, gets over the wire and
// mines in the dunes and through the pines, then fights for Ōsaki, the Ariake heights and Shibushi station while the
// reserve’s Chi-Has and Chi-Nus come down the valleys. Not point-mirrored: one side lands, the other holds (modes/landing).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const CACHE = { x: 560, z: 960 };
const LAND = 4.5;           // the coastal plain’s level
const PLAT = 46;            // the Kasanohara plateau’s
const noise = createNoise2D(1945_1111);
const sea = createSea({ level: 0, size: SIZE, color: 0x36606c }); // (the bay: grey-blue in November)

/** Shibushi point, the rock at the east end of the beach: x, half-width, how far out, height. */
const HEAD = { x: 452, w: 55, reach: 95, top: 30 };
const headK = (x: number) => Math.exp(-(((x - HEAD.x) / HEAD.w) ** 2));
/** The waterline (z): the long arc of the bay, the point out past its east end. */
export const shoreZ = (x: number) => 118 + 0.00016 * x * x + fbm(noise, x * 0.004, 3.3, 2) * 8 + HEAD.reach * headK(x);
/** Biro-jima: the bare rock off Shibushi. */
const BIRO = { x: 455, z: 470, r: 42, h: 20 };

// ---- the Hishida: a tidal mouth across the beach, a shallow stream on the plain, its head at the scarp’s foot
const MOUTH = -110;
const hishX = (z: number) => MOUTH + 22 * Math.sin((shoreZ(MOUTH) - z) * 0.008) - Math.max(0, shoreZ(MOUTH) - z) * 0.07;
const HISH_HEAD = -330;
const hish = (x: number, z: number) => (z < HISH_HEAD ? Infinity
  : Math.abs(x - hishX(z)) - (z > shoreZ(MOUTH) - 120 ? 15 : 8) + smoothstep(HISH_HEAD + 80, HISH_HEAD, z) * 10); // < 0 in the river

// ---- the shirasu scarp of the Kasanohara plateau across the back, and the three valleys up it
const scarpZ = (x: number) => -410 + 25 * Math.sin(x * 0.006 + 1) + fbm(noise, x * 0.008, 9.1, 2) * 16;
const GAPS = [
  { x: (z: number) => -392 + 12 * Math.sin(z * 0.01), w: 18 },  // the west road
  { x: (z: number) => hishX(z), w: 24 },                       // the Hishida’s valley
  { x: (z: number) => 298 + 10 * Math.sin(z * 0.012), w: 22 },  // the Shibushi line and the Matsuyama road
];
function platExact(x: number, z: number) {
  const sz = scarpZ(x), top = PLAT - LAND + fbm(noise, x * 0.004, z * 0.004, 3) * 6 + Math.max(0, -z - 500) * 0.012;
  let g = top * smoothstep(sz + 22, sz - 26, z);
  for (const v of GAPS) {
    const dx = Math.abs(x - v.x(z));
    if (dx > v.w + 110) continue;
    g = Math.min(g, top * smoothstep(sz + 40, sz - 230, z) + Math.max(0, dx - v.w) ** 1.25 * 0.55);
  }
  return g;
}
const plat = gridCacheSmooth(platExact, CACHE, 3);

/** The terraced hills: Shibushi castle hill, the Ariake heights, the west hill, a knoll. [x, z, radius, height] */
const HILLS = [[392, -175, 70, 24], [-40, -255, 80, 28], [-440, -250, 65, 20], [140, -195, 45, 12]];
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillExact(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d = (Math.hypot(x - hx, z - hz) / r) * warp(x, z);
    if (d < 3) h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  return h;
}
const hillH = gridCacheSmooth(hillExact, CACHE, 4);

// ---- the points
export const SECTORS = [
  { x: -330, name: 'Kashiwabaru beach' },
  { x: -20, name: 'Hishida mouth' },
  { x: 255, name: 'Shibushi beach' },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) - 45, owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) - 45, owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) - 45, owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: 'Ōsaki', x: -330, z: -150, owner: null, sector: 'west' },
  { id: 'F', name: 'Ariake heights', x: -40, z: -255, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Shibushi station', x: 300, z: -118, owner: null, sector: 'east', radius: 26 },
  { id: 'K', name: 'Kasanohara plateau', x: 20, z: -640, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- roads and the railways
const coastZ = (x: number) => -72 + 0.00016 * x * x;  // the coast road, behind the pines
const COAST: number[][] = [];
for (let x = -580; x <= 580; x += 40) COAST.push([x, coastZ(x)]);
const ROADS: number[][][] = [
  COAST,
  [[SECTORS[0].x, shoreZ(SECTORS[0].x) - 40], [-330, coastZ(-330)], at('E'), [-372, -262], [GAPS[0].x(-400), -400], [GAPS[0].x(-520), -520], [-300, -630], at('K')], // west: Ōsaki and the west road
  [[SECTORS[1].x, shoreZ(SECTORS[1].x) - 40], [-25, coastZ(-25)], [10, -150], [45, -215], [55, -290], [-60, -330], [hishX(-430), -430], [hishX(-540), -540], at('K')], // the middle: past the heights, up the Hishida
  [[SECTORS[2].x, shoreZ(SECTORS[2].x) - 40], [262, coastZ(262)], at('G'), [312, -220], [GAPS[2].x(-400), -400], [GAPS[2].x(-530), -530], [160, -630], at('K')], // east: through Shibushi, up the valley
  [at('K'), [0, -830]],
  [at('E'), [-200, -170], [-90, -190], [-40, -205]], // the lateral by Ariake hamlet, over the Hishida ford
  [[45, -215], [200, -160], at('G')],
  [[225, -30], [430, -40]], [[230, -150], [380, -110]], [[340, -10], [345, -140]], // Shibushi’s streets
];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const lineDist = (lines: number[][][], x: number, z: number) => {
  let d = Infinity;
  for (const l of lines) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
};
const roadDist = gridCacheSmooth((x: number, z: number) => lineDist(ROADS, x, z), CACHE, 3);
// the Ōsumi line along the coast into Shibushi station, the Shibushi line inland up the east valley
const OSUMI: number[][] = [];
for (let x = -580; x <= 300; x += 40) OSUMI.push([x, coastZ(x) - 25]);
const RAILS = [OSUMI, [[300, coastZ(300) - 25], [338, -200], [GAPS[2].x(-330) + 9, -330], [GAPS[2].x(-450) + 9, -450], [GAPS[2].x(-560) + 9, -560], [330, -720]]];
const railDist = gridCacheSmooth((x: number, z: number) => lineDist(RAILS, x, z), CACHE, 4);

/** Shibushi town round its station, and the villages: Ōsaki, Kashiwabaru, Ariake. */
const townK = (x: number, z: number) => smoothstep(1.0, 0.85, Math.hypot((x - 330) / 110, (z + 72) / 72));
const VILLAGES = [{ x: -330, z: -150, r: 48 }, { x: -455, z: -55, r: 32 }, { x: -150, z: -215, r: 30 }];
const villK = (x: number, z: number) => Math.max(0, ...VILLAGES.map((v) => smoothstep(v.r + 8, v.r - 8, Math.hypot(x - v.x, z - v.z))));
const STATION = [300, -98];

/** The paddies: the plain between the pines and the scarp, off the hills, roads, town and villages. */
function fieldKExact(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 205 || roadDist(x, z) < 8 || railDist(x, z) < 7 || nearPoint(x, z, 40) || hish(x, z) < 14) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(1.5, 0.3, plat(x, z)) * (1 - townK(x, z)) * (1 - villK(x, z))
    * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x)) * smoothstep(205, 222, back) * smoothstep(55, 70, Math.hypot(x, z + 830));
}
const fieldK = gridCacheSmooth(fieldKExact, CACHE, 4);
const bundK = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return smoothstep(12.2, 13.2, Math.max(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11) + 4));
};
let baseLevel = 0;

function height(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 0) { // the bay’s floor: shelving gently, rocks off the point, Biro-jima
    let h = Math.max(-18, 0.3 + back * 0.025 - Math.max(0, -back - 150) * 0.05);
    h += headK(x) * Math.max(0, 3 + back * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    const bi = (Math.hypot(x - BIRO.x, z - BIRO.z) / BIRO.r) * (1 + 0.15 * noise(x * 0.04, z * 0.04));
    if (bi < 1.3) h = Math.max(h, -1.5 + BIRO.h * Math.max(0, 1 - bi * bi) ** 0.7);
    return h;
  }
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  // the sand (0.5 → 2.1 m over 40 m), the dune ridge behind it, then the plain
  const beach = 0.5 + Math.min(back, 40) * 0.04;
  const dune = smoothstep(38, 62, back) * smoothstep(110, 82, back) * (2.6 + fbm(noise, x * 0.03, z * 0.03, 2) * 1.6);
  let h = (back < 40 ? beach : Math.max(beach, Math.min(LAND + n * 1.2, beach + (back - 40) * 0.1))) + dune;
  const hk = hillH(x, z), pg = plat(x, z);
  h += Math.max(hk, pg);
  // the hills’ lower slopes stepped into terraces, a riser every 2.2 m (blended: vehicles still climb)
  const tk = smoothstep(LAND + 1.5, LAND + 4, h) * smoothstep(LAND + 26, LAND + 18, h) * smoothstep(1, 4, hk - pg);
  if (tk > 0) { const t = h / 2.2, f = Math.floor(t); h += ((f + smoothstep(0.55, 1, t - f)) * 2.2 - h) * tk * 0.6; }
  const fk = fieldK(x, z);
  if (fk > 0) h += (LAND + Math.round(n * 5) * 0.25 + 0.35 * bundK(x, z) - h) * fk; // the paddies, each level behind its bund
  // Shibushi point: rock 30 m high, a cliff to the sea, falling back to the town
  const hd = headK(x);
  if (hd > 0.05) {
    const top = HEAD.top + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
    h += (Math.max(h, 0.5 + top * smoothstep(4, 26, back) * smoothstep(200, 110, back)) - h) * smoothstep(0.25, 0.7, hd);
  }
  // the Hishida: too deep to wade across the beach, a ford for anyone on the plain
  const b = hish(x, z);
  if (b < 30) {
    const bed = -0.3 - 2.2 * smoothstep(140, 80, back);
    h += (Math.min(h, bed) - h) * smoothstep(back < 140 ? 10 : 26, 0, b);
  }
  // the defence’s base on the plateau: flat
  const bd = Math.hypot(x, z + 830);
  if (bd < 60) { if (!baseLevel) baseLevel = LAND + plat(0, -830); h += (baseLevel - h) * smoothstep(60, 25, bd); }
  return h;
}

const fieldC = gridCache((x: number, z: number) => fieldK(x, z), BOUNDS);
/** Soft sand on the beach, the river’s mud, the wet paddies. */
function soft(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 3.5) return 1;
  const back = shoreZ(x) - z;
  if (back >= 0 && back < 40 && headK(x) < 0.3) return foot ? 0.85 : 0.6;
  if (hish(x, z) < 6) return foot ? 0.7 : 0.45;
  const fk = fieldC(x, z);
  return fk <= 0.05 ? 1 : 1 - fk * (foot ? 0.25 : 0.5);
}

/** Black pine in the shelter belts behind the dunes, cedar and broadleaf on the hills, the scarp and the point. */
function woodsK(x: number, z: number) {
  const back = shoreZ(x) - z, pg = plat(x, z);
  const belt = smoothstep(92, 104, back) * smoothstep(182, 170, back) * (headK(x) < 0.3 ? 1 : 0);
  const hill = smoothstep(5, 12, hillH(x, z));
  const scarp = smoothstep(3, 8, pg) * smoothstep(PLAT - LAND - 4, PLAT - LAND - 10, pg);
  const plateau = smoothstep(PLAT - LAND - 6, PLAT - LAND - 2, pg) * smoothstep(0.1, 0.4, fbm(noise, x * 0.008 + 5, z * 0.008, 2)) * 0.8;
  const point = smoothstep(0.4, 0.8, headK(x)) * smoothstep(40, 70, back) * smoothstep(200, 150, back);
  return Math.max(belt, hill, scarp, plateau, point) * smoothstep(4, 12, roadDist(x, z)) * smoothstep(3, 8, railDist(x, z))
    * (nearPoint(x, z, 30) ? 0 : 1) * (1 - townK(x, z)) * (1 - villK(x, z)) * (hish(x, z) < 8 ? 0 : 1) * (Math.hypot(x, z + 830) < 50 ? 0 : 1);
}
const woodsC = gridCache(woodsK, BOUNDS);

/** The cave galleries (systems/Caves.js): dug into the heights for the decisive battle. */
const CAVES = [
  { name: 'Ariake heights, south face', x: -30, z: -200 },
  { name: 'Ariake heights, west face', x: -105, z: -250 },
  { name: 'Shibushi castle hill', x: 368, z: -128 },
  { name: 'the west hill', x: -420, z: -205 },
  { name: 'the scarp over the Hishida', x: -40, z: scarpZ(-40) + 24 },
  { name: 'the scarp over Shibushi', x: 190, z: scarpZ(190) + 24 },
  { name: 'Shibushi point', x: 445, z: shoreZ(445) - 80 },
];

/** A Kyushu house of 1945: dark cedar boards or white plaster, one or two storeys under grey kawara tiles. */
const ROOFS = [0x4a4c50, 0x3e4044, 0x55575a, 0x5a5048];
function jpHouse(props: any, { x, z, yaw, w, d, storeys = 1, name = 'house' }: any) {
  const r = props.rand;
  const b = props.beginBuilding(name, x, z, yaw, w, d);
  const wall = [0x5a4632, 0x4e3e2e, 0xd8d0be, 0x6a5440][Math.floor(r() * 4)];
  b.plaster = wall;
  const h = storeys * 2.7;
  props.shell(b, { height: h, storeys, t: 0.3, color: wall, bay: 1.8, sill: 0.8, head: 2.1, frame: 0x3a2e24, front: [(r() - 0.5) * w * 0.4] });
  props.piece('stone', b, 0, 0.15, 0, w + 0.2, 0.5, d + 0.2, 0x7a766e);
  props.gableRoof(b, { eave: h, pitch: 0.55, t: 0.35, overhang: 0.8, color: ROOFS[Math.floor(r() * ROOFS.length)] });
  props.endBuilding();
}
/** A Shinto shrine: the hall, the red torii before it. */
function shrine(props: any, terrain: any, x: number, z: number, yaw: number, name: string) {
  const b = props.beginBuilding(name, x, z, yaw, 8, 6);
  b.plaster = 0x6a4a32;
  props.shell(b, { height: 2.8, t: 0.35, color: 0x6a4a32, bay: 2.2, sill: 1.0, head: 2.4, frame: 0x3a2a1e, front: [0] });
  props.piece('stone', b, 0, 0.3, 0, 9.6, 0.8, 7.6, 0x8a8678);
  props.gableRoof(b, { eave: 2.8, pitch: 0.6, t: 0.35, overhang: 0.9, color: 0x4e5a52 });
  props.endBuilding();
  const s = Math.sin(yaw), c = Math.cos(yaw), tx = x + s * 12, tz = z + c * 12, y = terrain.heightAt(tx, tz);
  for (const sd of [-1, 1]) props.box('plain', tx + c * 1.8 * sd, y + 2, tz - s * 1.8 * sd, 0.5, 4, 0.5, yaw, 0xc0402a);
  props.box('plain', tx, y + 4.2, tz, 5.8, 0.36, 0.6, yaw, 0x2a2420);
  props.box('plain', tx, y + 3.2, tz, 4.6, 0.26, 0.32, yaw, 0xc0402a);
}

/** The bombardment before X-Day: thick on the dunes and the heights, a scatter everywhere. */
function craters() {
  const r = mulberry32(1945_1101), out: number[][] = [];
  for (let i = 0; i < 1000; i++) {
    const x = (r() * 2 - 1) * 480, z = 120 - r() * 820, back = shoreZ(x) - z;
    if (back < 42 || hish(x, z) < 8 || townK(x, z) > 0.4 || villK(x, z) > 0.3 || roadDist(x, z) < 5 || Math.hypot(x, z + 830) < 60) continue;
    const near = Math.max(smoothstep(160, 60, back), smoothstep(6, 16, hillH(x, z)));
    if (r() > 0.15 + near * 0.6) continue;
    const big = r();
    out.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, 3 + big * 5, 0.4 + big * big * 1.3]);
  }
  return out;
}

/** The beach obstacles in the shallows: ramped stakes, hedgehogs further out, some with a mine lashed on. */
const OBSTACLES = (() => {
  const r = mulberry32(1945_1105), out: { x: number, z: number, kind: string, mine: boolean }[] = [];
  ([['stake', 52, 0.3, 9], ['hedgehog', 68, 0.15, 11]] as [string, number, number, number][]).forEach(([kind, d, mined, step]) => {
    for (let x = -485; x < 385; x += step + r() * 5) {
      if (r() < 0.18 || Math.abs(x - MOUTH) < 30) continue;
      out.push({ x: x + (r() - 0.5) * 2, z: shoreZ(x) + d + (r() - 0.5) * 8, kind, mine: r() < mined });
    }
  });
  return out;
})();

export default {
  id: 'ariake',
  name: 'Ariake Bay',
  description: 'Kyushu, November 1945 — Operation Olympic, never carried out: XI Corps lands on the long curving beach of Ariake Bay between Kashiwabaru and Shibushi, through the dunes and pine belts and over the Hishida, against terraced heights full of caves and the scarp of the Kasanohara plateau.',
  epochs: ['1945'],
  theatre: 'coastal',
  region: 'pacific',
  pacific: true,
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['us', 'usmc'], pact: ['jp'] }, // (XI Corps against the 86th Division and the 57th Army’s reserve)
  airfields: [],                                  // (no runway on the paddies and the hills: the aircraft come off the carriers)
  airLimit: { pact: 0 },                          // (the kamikazes go for the ships in the bay)
  conditions: { time: 'day', weather: 'clear' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.6, // (vehicles: the terraces yes, the shirasu scarp and the point no — the valleys are the ways up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1945,
  height,
  soft,
  river: sea,
  caves: { owner: 'pact', list: CAVES },
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a clear November morning in the south: low sun, haze off the bay, the stubble gold, the pines black-green
    fogColor: 0xc4c8c4, fogDensity: 0.0007,
    skyTop: 0x5a80aa, skyHorizon: 0xd0d4cc, skyBottom: 0x80806c,
    sunColor: 0xfff0d4, sunIntensity: 1.9, sunDisk: 0.3,
    clouds: 0.35, cloudLight: 0xf0f0ec, cloudDark: 0x8e949a,
    sunDir: [0.5, 0.45, 0.6],
    hemiSky: 0xc8d0d8, hemiGround: 0x5a5638, hemiIntensity: 1.3,
    rimColor: 0xd0d4d6, rimIntensity: 0.2,
    terrain: {
      grass: '#5e6a34', grassAlt: '#56602e', dryGrass: '#988a50', dirt: '#5e4c36', rock: '#8a8270',
      pasture: '#64703a', ploughed: '#5a4632', stubble: '#a08c52', meadow: '#6a7440',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const back = shoreZ(x) - z;
        if (back < -3) return [y > -1.2 ? 0x9a927c : 0x7a7666, 1];                                   // the sand under the water
        if (headK(x) > 0.3 && y > 3 && back < 160) return [0x8a8270, 0.85];                         // the point’s rock
        if (back >= -3 && back < 42) return [0xb8ae94, 1];                                           // the grey sand of the bay
        if (back < 95) return [0xbcb08a, 0.55 + Math.max(0, fbm(noise, x * 0.05, z * 0.05, 2)) * 0.4]; // the dunes: sand, coarse grass
        if (roadDist(x, z) < (townK(x, z) > 0.5 ? 4.5 : 3.5)) return [0x8a7e66, 0.88];              // gravel and packed earth
        if (railDist(x, z) < 3) return [0x4e4a44, 0.9];                                              // ballast
        if (hish(x, z) < 4) return [0x5a4a36, 0.9];                                                  // the river’s mud
        if (townK(x, z) > 0.6 || villK(x, z) > 0.6) return [0x8a8070, 0.6];                          // lanes and yards
        const pg = plat(x, z);
        if (pg > 6 && pg < PLAT - LAND - 6) return [0xc8bc9c, 0.6];                                  // the scarp’s white shirasu
        const fk = fieldC(x, z);
        if (fk > 0.3) {
          if (bundK(x, z) > 0.5) return [0x5e6a34, 0.85];                                            // the bunds
          const k = noise(x * 0.04, z * 0.04);
          return [k > 0.35 ? 0x6a6046 : k > -0.3 ? 0xa08e54 : 0x8a7a4a, fk * 0.85];                // stubble, wet mud in the low plots
        }
        if (y > LAND + 1.5 && y < LAND + 22 && hillH(x, z) > 2) { const t = (y / 2.2) % 1; return t < 0.5 ? [0x9a8a52, 0.7] : [0x56622e, 0.6]; } // the terraces
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -830, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -200 } },
  points,

  battlefield() { return { blasts: craters(), ruins: [], works: [] }; },

  landing: {
    attacker: 'nato',
    // what comes in (systems/Landing.js): the men in Higgins boats, the vehicles in LCT Mk 6s
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    // what the landing may call in at sea: the destroyers and the LSM(R)s inshore, the sweepers, an old battleship offshore
    navy: ['destroyer', 'lsmr', 'minesweeper', 'oldBattleship'],
    // the Navy’s mines across the bay, a swept lane off each sector
    seaMines: { z: [520, 580], count: 50, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1945_1101 },
    obstacles: OBSTACLES,
    // the defence (data/units45/atlanticWall.js, the Japanese variants): a pillbox complex in the pines over each beach,
    // one on Shibushi point enfilading the sand (the heights hold with their caves); the guns on the scarp, registered on the beach
    forts: [
      { unit: 'wn', x: -265, z: shoreZ(-265) - 118, facing: 0 },
      { unit: 'wn', x: 55, z: shoreZ(55) - 118, facing: 0 },
      { unit: 'wn', x: 185, z: shoreZ(185) - 112, facing: 0 },
      { unit: 'wn', x: 430, z: shoreZ(430) - 60, facing: 0 },
      { unit: 'battery', x: -210, z: scarpZ(-210) - 45, facing: 0 },
      { unit: 'battery', x: 170, z: scarpZ(170) - 45, facing: 0 },
    ],
    // wire along the top of the sand (open at the river), mines and trenches in the dunes, tank traps on the exits
    works: [
      ...Array.from({ length: 80 }, (_, i) => { const x = -480 + i * 11; return headK(x) > 0.25 || Math.abs(x - hishX(shoreZ(x))) < 24 ? null : { kind: 'wire', x, z: shoreZ(x) - 36, yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-36, 36].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 64 }))),
      ...SECTORS.flatMap((s) => [-48, 0, 48].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - 86, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-24, 24].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - 80, yaw: 0 }))),
      ...SECTORS.map((s) => ({ kind: 'tankTraps', x: s.x, z: shoreZ(s.x) - 100, yaw: 0 })),
    ],
    // the defence at H-hour: in the dunes, at the cave mouths (back into the rock from there), in the villages and the town
    hold: [
      ...SECTORS.flatMap((s) => [-40, 40].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - 90 }))),
      ...CAVES.map((c) => ({ x: c.x, z: c.z + 12 })),
      { x: -330, z: -140 }, { x: 300, z: -100 },
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mortar', 'atTeam', 'rifles', 'mgTeam', 'sniper', 'mortar', 'rifles', 'atTeam', 'observers'],
    // the counter-attack: the 57th Army’s reserve down the valleys from the plateau
    counter: { t: 420, units: ['tank', 'heavyTank', 'rifles', 'tank', 'rifles'], say: 'The reserve is coming down from Kasanohara: Chi-Has and Chi-Nus with the infantry, straight for the beachhead', sayOther: 'Enemy armour coming down the valleys from the plateau: Chi-Has and infantry' },
    // the landing’s AI (ai/LandingDirector.js)
    ai: { order: ['rifles', 'rifles', 'engineers', 'tank', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'tank', 'mortar', 'rifles', 'tank'], gunship: 'destroyer', gunships: 2, sweeper: 'minesweeper', heavy: null },
    economy: { reserves: 2600, perSector: 750, beachIncome: 1.25, defenceCp: 750, defenceIncome: 1.15 }, // (AI vs AI 2026-11-22: at 1.1/1.3 with a pillbox on the heights the landing never got past Ōsaki in three runs; now one win at 20:01, two held — one on the beaches, one with Shibushi station lost at 23:55)
    // X-Day: the first wave in to all three sectors at once
    waves: [{ t: 0, say: 'X-Day: the first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'tank', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'tank', sector: 2 },
    ] }],
  },

  spawns: {
    nato: [{ unit: 'destroyer', x: -175, z: 850, facing: Math.PI / 2 }, { unit: 'destroyer', x: 118, z: 860, facing: -Math.PI / 2 }], // (between the lanes)
    pact: [{ unit: 'rifles', x: -40, z: -235, facing: 0, name: '86th Division' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    props.rand = mulberry32(1945_1102);
    const r = props.rand;
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 6 + rr && railDist(x, z) > 5 + rr && hish(x, z) > 10 + rr && !nearPoint(x, z, 16 + rr) && Math.hypot(x, z + 830) > 45;

    // ---- the railways, Shibushi station, a few wagons in the yard
    for (const l of RAILS) for (let i = 0; i < l.length - 1; i++) props.rails({ x0: l[i][0], z0: l[i][1], x1: l[i + 1][0], z1: l[i + 1][1] });
    props.townHouse({ x: STATION[0], z: STATION[1], yaw: Math.PI / 2, width: 22, depth: 9, storeys: 1, name: 'Shibushi station', damaged: 0.2 });
    props.wagon({ x: 200, z: coastZ(200) - 25, yaw: Math.PI / 2, kind: 'box', color: 0x4a3a2e });
    props.wagon({ x: 160, z: coastZ(160) - 25, yaw: Math.PI / 2, kind: 'open', color: 0x4a3a2e });
    // ---- Shibushi: tile-roofed houses in their lanes, shops on the main road, some burnt out by the raids
    for (let gx = 215; gx <= 445; gx += 13) for (let gz = 5; gz >= -150; gz -= 12) {
      const x = gx + (r() - 0.5) * 4, z = gz + (r() - 0.5) * 4;
      if (townK(x, z) < 0.5 || !free(x, z, 3) || r() < 0.2 || Math.hypot(x - STATION[0], z - STATION[1]) < 18 || headK(x) > 0.3 && shoreZ(x) - z < 200) continue;
      if (r() < 0.1) { props.rubble(x, z, 0.5, true); continue; }
      jpHouse(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 7.5 + r() * 2.5, d: 6 + r() * 2, storeys: roadDist(x, z) < 18 && r() < 0.5 ? 2 : 1, name: roadDist(x, z) < 18 ? 'shop' : 'house' });
    }
    shrine(props, terrain, 410, -140, Math.PI, 'Shibushi shrine');
    // ---- the villages: Ōsaki, Kashiwabaru, Ariake hamlet; farmhouses and rice racks out on the paddies
    for (const v of VILLAGES) for (let i = 0; i < v.r * 0.6; i++) {
      const a = r() * Math.PI * 2, d = 10 + r() * (v.r - 8), x = v.x + Math.cos(a) * d, z = v.z + Math.sin(a) * d;
      if (!free(x, z, 4)) continue;
      jpHouse(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 8 + r() * 2, d: 6 + r() * 2, storeys: 1, name: i === 0 ? 'village office' : 'farmhouse' });
    }
    shrine(props, terrain, -300, -185, 0, 'Ōsaki shrine');
    for (let i = 0; i < 160; i++) {
      const x = (r() * 2 - 1) * 470, z = 20 - r() * 440;
      if (fieldC(x, z) < 0.5 || !free(x, z, 8)) continue;
      if (r() < 0.25) { jpHouse(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 10, d: 7, name: 'farmhouse' }); continue; }
      const yaw = r() < 0.5 ? 0 : Math.PI / 2, s = Math.sin(yaw), c = Math.cos(yaw), y = g(x, z); // hazagake: the cut rice on its rail
      for (const k of [-3, 0, 3]) props.box('plain', x + s * k, y + 1.0, z + c * k, 0.12, 2.0, 0.12, yaw, 0x5a4a36);
      props.box('plain', x, y + 1.25, z, 0.5, 1.1, 6.6, yaw, 0xb09a5a);
      cover.addBox({ x, z, yaw, length: 6.6, thickness: 0.6, height: 1.6 });
    }
    // ---- the shinyo pens: tunnels dug into Shibushi point at the waterline, a plywood suicide boat on its slip before each
    for (const x of [400, 414, 428]) {
      const zc = shoreZ(x) - 9, y = g(x, zc);
      props.box('plain', x, y + 1.3, zc - 1.5, 4.2, 2.6, 0.4, 0, 0x14120e);                 // the tunnel’s mouth
      props.box('stone', x - 2.4, y + 1.6, zc - 1.2, 0.6, 3.2, 1.2, 0, 0x6a6458);            // its timbered sides
      props.box('stone', x + 2.4, y + 1.6, zc - 1.2, 0.6, 3.2, 1.2, 0, 0x6a6458);
      const zb = zc + 5, yb = g(x, zb);
      props.box('plain', x, yb + 0.12, zb, 1.6, 0.24, 9, 0, 0x5a4a36, 0.08, 0);              // the slip
      props.box('plain', x, yb + 0.6, zb, 1.7, 0.7, 5.2, 0, 0x4a5240);                      // the boat
      props.box('plain', x, yb + 1.05, zb - 1, 1.1, 0.4, 1.2, 0, 0x3a3e34);                 // her cockpit
    }
    // ---- range stakes on the dunes, white-topped, the guns on the scarp registered on them
    for (let x = -470; x < 380; x += 55) { const z = shoreZ(x) - 48, y = g(x, z); if (Math.abs(x - hishX(z)) < 20) continue; props.box('plain', x, y + 0.9, z, 0.2, 1.8, 0.2, 0, 0xe8e4dc); }
    // ---- spider holes on the hills’ approaches, observation masts on the heights
    for (const [hx, hz] of HILLS) for (let k = 0; k < 7; k++) {
      const a = r() * Math.PI * 2, x = hx + Math.cos(a) * (45 + r() * 20), z = hz + Math.sin(a) * (45 + r() * 20);
      if (!free(x, z, 2)) continue;
      const y = g(x, z);
      props.box('plain', x, y + 0.03, z, 1.0, 0.08, 1.0, a, 0x14120e);
      props.box('plain', x + 0.5, y + 0.25, z, 1.1, 0.12, 1.1, a, 0x9a8a58, 0, 0.5);
    }
    props.mast({ x: -40, z: -275, height: 9 });
    props.mast({ x: 392, z: -190, height: 9 });
    commandPost(props, this.bases.pact, 1, 0x6a6640);
    props.finish();

    const avoid = [{ x: 0, z: -830, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => shoreZ(x) - z < 44 || roadDist(x, z) < 6 || railDist(x, z) < 5 || fieldC(x, z) > 0.2 || townK(x, z) > 0.3 || villK(x, z) > 0.4 || hish(x, z) < 8 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 9000, broadleaf: 0.25, autumn: 0.25, maxY: 120, avoid,
      forest: (x: number, z: number) => woodsC(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => shoreZ(x) - z < 40 || roadDist(x, z) < 4 || townK(x, z) > 0.5 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
