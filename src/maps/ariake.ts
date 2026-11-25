// Ariake Bay, November 1945: Operation Olympic’s eastern landing (1945 only; coastal: the US land, the Imperial Japanese
// Army holds; 1.0 × 1.8 km, the Pacific). The invasion of Japan that never came: on X-Day, 1 November 1945, the Sixth
// Army’s XI Corps — the Americal, the 1st Cavalry and the 43rd Infantry Divisions — was to come ashore at the head of
// Ariake Bay on Kyushu’s south coast, in Higgins boats and LCTs, and take the bay as a harbour for the drive inland.
// The 86th Division waited for them dug into the heights over the bay, every gun registered on the sand, with the
// 57th Army’s reserve and its tanks behind on the Kasanohara plateau.
// The real coast: the bay’s north-east corner at Shibushi. The long grey beach of the bay head runs in from the west
// (Kashiwabaru, the Hishida’s mouth) to Shibushi town and its little harbour in the corner; there the coast turns and
// runs away south, rocky and steep, along the Shibushi hills toward Cape Toi — the bay’s east shore. Off it lies the
// bare rock of Biro-jima. Behind the beach the dunes and the black-pine shelter belts, the harvested paddies, the
// villages; the Ariake heights stand over the middle, cave galleries in their faces; and the shirasu scarp of the
// Kasanohara plateau slants across the back from the west, cut by the valleys that are the only ways up for vehicles.
// On the map (from the sea, +z): the bay head’s beach across the north, the east shore coming down the right side to
// the map’s sea edge, so the landing comes in with the Shibushi hills on its right flank all the way. Kashiwabaru beach
// in the west opens Ōsaki under the scarp; the Hishida mouth opens the Ariake heights; Shibushi beach in the corner
// opens the castle hill on the east shore — south of the town, over the water the boats come in on. In the east
// shore’s cliffs, at the waterline, the Navy’s shinyo suicide boats wait in their pens.
// How it plays: the landing comes in under the guns on the heights, the scarp and the east shore, gets over the wire
// and the mines in the dunes and through the pines, then fights for Ōsaki, the Ariake heights and the castle hill
// while the reserve’s Chi-Has and Chi-Nus come down the valleys. Not point-mirrored: one side lands, the other holds.
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
const EXT = { x: 1000, z: 1000 };
const CACHE = { x: 560, z: 960 };
const LAND = 4.5;           // the coastal plain’s level
const PLAT = 46;            // the Kasanohara plateau’s
const noise = createNoise2D(1945_1111);
const sea = createSea({ level: 0, size: SIZE, color: 0x36606c }); // (the bay: grey-blue in November)

/** The land's outline (x, z), rounded off (Chaikin): the signed distance to it, m (+ ashore, − at sea). */
function landField(rings: number[][][]) {
  const R = rings.map((p0) => {
    let p = p0;
    for (let k = 0; k < 3; k++) {
      const q: number[][] = [];
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); }
      p = q;
    }
    return p;
  });
  return (x: number, z: number) => {
    let d = Infinity, inside = false;
    for (const p of R) {
      let c = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const ax = p[j][0], az = p[j][1], dx = p[i][0] - ax, dz = p[i][1] - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
        d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
        if ((az > z) !== (p[i][1] > z) && x < (dx * (z - az)) / dz + ax) c = !c;
      }
      inside ||= c;
    }
    return inside ? d : -d;
  };
}
/** The bay head’s beach from the west into the Shibushi corner, then the east shore running away south. */
const landRaw = landField([[[-1500, -1500], [-1500, 30], [-560, 35], [-400, 52], [-250, 62], [-100, 66], [20, 64], [110, 62], [170, 66], [215, 92],
  [250, 150], [280, 240], [305, 330], [325, 430], [345, 560], [362, 720], [385, 900], [410, 1500], [1500, 1500], [1500, -1500]]]);
/** How far ashore (m; < 0: out in the bay). */
const inl = gridCacheSmooth((x: number, z: number) => landRaw(x, z) + fbm(noise, x * 0.004, z * 0.004 + 3.3, 2) * 7, EXT, 5);
/** The first land coming in from the sea down lane x. */
const shoreAt = (x: number) => { for (let z = 900; z > -900; z -= 3) if (inl(x, z) > 0) return z; return -900; };
/** Shibushi point: the east shore’s rock, 30 m cliffs from the corner south (0..1). */
const headK = (x: number, z: number) => smoothstep(140, 230, z) * smoothstep(200, 260, x);
/** Biro-jima: the bare rock off the east shore. */
const BIRO = { x: 262, z: 560, r: 38, h: 20 };

// ---- the Hishida: a tidal mouth across the beach, a shallow stream on the plain, its head at the scarp’s foot
const MOUTH = -60;
const S0 = 64;
const hishX = (z: number) => MOUTH + 22 * Math.sin((S0 - z) * 0.008) - Math.max(0, S0 - z) * 0.12;
const HISH_HEAD = -380; // (its head at the scarp's foot: the valley above it is dry, the vehicles' way down)
const hish = (x: number, z: number) => (z < HISH_HEAD ? Infinity
  : Math.abs(x - hishX(z)) - (z > S0 - 120 ? 15 : 8) + smoothstep(HISH_HEAD + 80, HISH_HEAD, z) * 10); // < 0 in the river

// ---- the shirasu scarp of the Kasanohara plateau, slanting across the back from the west, and the valleys up it
const scarpZ = (x: number) => -470 - 0.42 * x + 20 * Math.sin(x * 0.006 + 1) + fbm(noise, x * 0.008, 9.1, 2) * 16;
const GAPS = [
  { x: (z: number) => -400 + 12 * Math.sin(z * 0.01), w: 18 },  // the west road
  { x: (z: number) => hishX(z), w: 24 },                       // the Hishida’s valley
  { x: (z: number) => 170 + 10 * Math.sin(z * 0.012), w: 22 },  // the Shibushi line and the Matsuyama road
];
function platExact(x: number, z: number) {
  const sz = scarpZ(x), top = PLAT - LAND + fbm(noise, x * 0.004, z * 0.004, 3) * 6 + Math.max(0, sz - z - 150) * 0.01;
  let g = top * smoothstep(sz + 22, sz - 26, z);
  for (const v of GAPS) {
    const dx = Math.abs(x - v.x(z));
    if (dx > v.w + 110) continue;
    g = Math.min(g, top * smoothstep(sz + 40, sz - 230, z) + Math.max(0, dx - v.w) ** 1.25 * 0.55);
  }
  return g;
}
const plat = gridCacheSmooth(platExact, CACHE, 4);

/** The hills: the Ariake heights, the west hill, a knoll; the Shibushi hills along the east shore with the castle hill. [x, z, radius, height] */
const HILLS = [[-80, -300, 80, 28], [-470, -110, 60, 18], [80, -190, 45, 12], [400, 150, 60, 14], [455, -60, 80, 26], [440, 380, 90, 28], [470, 700, 90, 24]];
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
  { x: -60, name: 'Hishida mouth' },
  { x: 140, name: 'Shibushi beach' },
];
const CASTLE = { x: 385, z: 140 };
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: -220, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreAt(SECTORS[0].x) - 42, owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x + 30, z: shoreAt(SECTORS[1].x + 30) - 42, owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreAt(SECTORS[2].x) - 42, owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: 'Ōsaki', x: -360, z: -215, owner: null, sector: 'west' },
  { id: 'F', name: 'Ariake heights', x: -80, z: -300, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Shibushi castle hill', x: CASTLE.x, z: CASTLE.z, owner: null, sector: 'east', radius: 30 },
  { id: 'K', name: 'Kasanohara plateau', x: -170, z: -690, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- roads and the railways
const coastZ = (x: number) => -40 + 0.00004 * x * x;  // the coast road, behind the pines
const COAST: number[][] = [];
for (let x = -580; x <= 200; x += 40) COAST.push([x, coastZ(x)]);
COAST.push([300, -30], [430, 10], [450, 200], [445, 420], [470, 640], [480, 960]); // (round the corner and away down the east shore toward Cape Toi)
const STATION = [235, -110];
const ROADS: number[][][] = [
  COAST,
  [[SECTORS[0].x, shoreAt(SECTORS[0].x) - 40], [-330, coastZ(-330)], at('E'), [GAPS[0].x(-280), -280], [GAPS[0].x(-420), -420], [-330, -560], at('K')], // west: Ōsaki and the west road up the scarp
  [[SECTORS[1].x + 20, S0 - 40], [-25, coastZ(-25)], [-10, -150], [-20, -240], [hishX(-350) + 30, -350], [hishX(-450) + 6, -450], [hishX(-560), -560], at('K')], // the middle: past the heights, up the Hishida
  [[SECTORS[2].x, shoreAt(SECTORS[2].x) - 40], [150, coastZ(150)], [200, -100], [GAPS[2].x(-300), -300], [GAPS[2].x(-450), -450], [GAPS[2].x(-600), -600], [80, -700], [0, -830]], // east: through Shibushi, up the valley
  [at('K'), [0, -830]],
  [at('E'), [-220, -200], [-140, -250], [-80, -260]], // the lateral by Ariake hamlet, over the Hishida ford
  [[300, -30], [340, 60], at('G')],                   // up to the castle
  [[200, -40], [330, -60]], [[180, -110], [300, -120]], [[250, -10], [255, -170]], // Shibushi’s streets
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
const roadDist = gridCacheSmooth((x: number, z: number) => lineDist(ROADS, x, z), CACHE, 4);
// the Ōsumi line along the coast into Shibushi station, the Shibushi line inland up the east valley
const OSUMI: number[][] = [];
for (let x = -580; x <= 200; x += 40) OSUMI.push([x, coastZ(x) - 25]);
OSUMI.push(STATION);
const RAILS = [OSUMI, [STATION, [GAPS[2].x(-250) + 9, -250], [GAPS[2].x(-400) + 9, -400], [GAPS[2].x(-560) + 9, -560], [200, -720], [230, -960]]];
const railDist = gridCacheSmooth((x: number, z: number) => lineDist(RAILS, x, z), CACHE, 4);

/** Shibushi town in the corner round its station and harbour, and the villages: Ōsaki, Kashiwabaru, Ariake. */
const townK = (x: number, z: number) => smoothstep(1.0, 0.85, Math.hypot((x - 255) / 95, (z + 60) / 85));
const VILLAGES = [{ x: -360, z: -215, r: 48 }, { x: -455, z: -20, r: 32 }, { x: -170, z: -210, r: 30 }];
const villK = (x: number, z: number) => Math.max(0, ...VILLAGES.map((v) => smoothstep(v.r + 8, v.r - 8, Math.hypot(x - v.x, z - v.z))));

/** The paddies: the plain between the pines and the scarp, off the hills, roads, town and villages. */
function fieldKExact(x: number, z: number) {
  const a = inl(x, z);
  if (a < 205 || roadDist(x, z) < 8 || railDist(x, z) < 7 || nearPoint(x, z, 40) || hish(x, z) < 14 || x > 330) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(1.5, 0.3, plat(x, z)) * (1 - townK(x, z)) * (1 - villK(x, z))
    * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x)) * smoothstep(205, 222, a) * smoothstep(55, 70, Math.hypot(x, z + 830));
}
const fieldK = gridCacheSmooth(fieldKExact, CACHE, 4);
const bundK = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return smoothstep(12.2, 13.2, Math.max(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11) + 4));
};
let baseLevel = 0;

function height(x: number, z: number) {
  const a = inl(x, z);
  if (a < 0) { // the bay’s floor: shelving gently, rocks under the east shore, Biro-jima
    let h = Math.max(-18, 0.3 + a * 0.025 - Math.max(0, -a - 150) * 0.05);
    h += headK(x, z) * Math.max(0, 3 + a * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    const bi = (Math.hypot(x - BIRO.x, z - BIRO.z) / BIRO.r) * (1 + 0.15 * noise(x * 0.04, z * 0.04));
    if (bi < 1.3) h = Math.max(h, -1.5 + BIRO.h * Math.max(0, 1 - bi * bi) ** 0.7);
    return h;
  }
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  // the sand (0.5 → 2.1 m over 40 m), the dune ridge behind it, then the plain
  const beach = 0.5 + Math.min(a, 40) * 0.04;
  const dune = smoothstep(38, 62, a) * smoothstep(110, 82, a) * (2.6 + fbm(noise, x * 0.03, z * 0.03, 2) * 1.6) * (1 - smoothstep(180, 240, x));
  let h = (a < 40 ? beach : Math.max(beach, Math.min(LAND + n * 1.2, beach + (a - 40) * 0.1))) + dune;
  const hk = hillH(x, z) * smoothstep(10, 60, a), pg = plat(x, z);
  h += Math.max(hk, pg);
  // the hills’ lower slopes stepped into terraces, a riser every 2.2 m (blended: vehicles still climb)
  const tk = smoothstep(LAND + 1.5, LAND + 4, h) * smoothstep(LAND + 26, LAND + 18, h) * smoothstep(1, 4, hk - pg);
  if (tk > 0) { const t = h / 2.2, f = Math.floor(t); h += ((f + smoothstep(0.55, 1, t - f)) * 2.2 - h) * tk * 0.6; }
  const fk = fieldK(x, z);
  if (fk > 0) h += (LAND + Math.round(n * 5) * 0.25 + 0.35 * bundK(x, z) - h) * fk; // the paddies, each level behind its bund
  // Shibushi point: the east shore’s rock, a cliff 30 m high straight up from the water
  const hd = headK(x, z);
  if (hd > 0.05) {
    const top = 30 + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
    h += (Math.max(h, 0.5 + top * smoothstep(3, 30, a)) - h) * smoothstep(0.2, 0.8, hd);
  }
  // the Hishida: too deep to wade across the beach, a ford for anyone on the plain
  const b = hish(x, z);
  if (b < 30) {
    const bed = -0.3 - 2.2 * smoothstep(140, 80, a);
    h += (Math.min(h, bed) - h) * smoothstep(a < 140 ? 10 : 26, 0, b);
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
  const a = inl(x, z);
  if (a >= 0 && a < 40 && headK(x, z) < 0.3) return foot ? 0.85 : 0.6;
  if (hish(x, z) < 6) return foot ? 0.7 : 0.45;
  const fk = fieldC(x, z);
  return fk <= 0.05 ? 1 : 1 - fk * (foot ? 0.25 : 0.5);
}

/** Black pine in the shelter belts behind the dunes, cedar and broadleaf on the hills, the scarp and the east shore. */
function woodsK(x: number, z: number) {
  const a = inl(x, z), pg = plat(x, z);
  const belt = smoothstep(92, 104, a) * smoothstep(182, 170, a) * (x < 200 ? 1 : 0);
  const hill = smoothstep(5, 12, hillH(x, z));
  const scarp = smoothstep(3, 8, pg) * smoothstep(PLAT - LAND - 4, PLAT - LAND - 10, pg);
  const plateau = smoothstep(PLAT - LAND - 6, PLAT - LAND - 2, pg) * smoothstep(0.1, 0.4, fbm(noise, x * 0.008 + 5, z * 0.008, 2)) * 0.8;
  const point = headK(x, z) * smoothstep(30, 60, a);
  return Math.max(belt, hill, scarp, plateau, point) * smoothstep(4, 12, roadDist(x, z)) * smoothstep(3, 8, railDist(x, z))
    * (nearPoint(x, z, 30) ? 0 : 1) * (1 - townK(x, z)) * (1 - villK(x, z)) * (hish(x, z) < 8 ? 0 : 1) * (Math.hypot(x, z + 830) < 50 ? 0 : 1);
}
const woodsC = gridCache(woodsK, BOUNDS);

/** The cave galleries (systems/Caves.js): dug into the heights for the decisive battle. */
const CAVES = [
  { name: 'Ariake heights, south face', x: -70, z: -245 },
  { name: 'Ariake heights, west face', x: -145, z: -295 },
  { name: 'Shibushi castle hill', x: 345, z: 120 },
  { name: 'the west hill', x: -440, z: -70 },
  { name: 'the scarp over the Hishida', x: hishX(-430) + 70, z: scarpZ(hishX(-430) + 70) + 24 },
  { name: 'the scarp over Ōsaki', x: -300, z: scarpZ(-300) + 24 },
  { name: 'the east shore', x: 330, z: 300 },
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
    const x = (r() * 2 - 1) * 480, z = 300 - r() * 1000, a = inl(x, z);
    if (a < 42 || hish(x, z) < 8 || townK(x, z) > 0.4 || villK(x, z) > 0.3 || roadDist(x, z) < 5 || Math.hypot(x, z + 830) < 60) continue;
    const near = Math.max(smoothstep(160, 60, a), smoothstep(6, 16, hillH(x, z)));
    if (r() > 0.15 + near * 0.6) continue;
    const big = r();
    out.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, 3 + big * 5, 0.4 + big * big * 1.3]);
  }
  return out;
}

/** The beach obstacles in the shallows of the bay head: ramped stakes, hedgehogs further out, some with a mine lashed on. */
const OBSTACLES = (() => {
  const r = mulberry32(1945_1105), out: { x: number, z: number, kind: string, mine: boolean }[] = [];
  ([['stake', 52, 0.3, 9], ['hedgehog', 68, 0.15, 11]] as [string, number, number, number][]).forEach(([kind, d, mined, step]) => {
    for (let x = -485; x < 185; x += step + r() * 5) {
      if (r() < 0.18 || Math.abs(x - MOUTH) < 30) continue;
      out.push({ x: x + (r() - 0.5) * 2, z: shoreAt(x) + d + (r() - 0.5) * 8, kind, mine: r() < mined });
    }
  });
  return out;
})();

export default {
  id: 'ariake',
  name: 'Ariake Bay',
  description: 'Kyushu, November 1945 — Operation Olympic, never carried out: XI Corps lands in the north-east corner of Ariake Bay, on the long beach of the bay head from Kashiwabaru to Shibushi, with the rocky east shore and its shinyo pens on the flank, against terraced heights full of caves, the castle hill over Shibushi and the slanting scarp of the Kasanohara plateau.',
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
  steep: 0.6, // (vehicles: the terraces yes, the shirasu scarp and the east shore’s rock no — the valleys are the ways up)
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
        const a = inl(x, z);
        if (a < -3) return [y > -1.2 ? 0x9a927c : 0x7a7666, 1];                                       // the sand under the water
        if (headK(x, z) > 0.3 && y > 3 && a < 80) return [0x8a8270, 0.85];                            // the east shore’s rock
        if (a < 42) return [0xb8ae94, 1];                                                             // the grey sand of the bay
        if (a < 95 && x < 200) return [0xbcb08a, 0.55 + Math.max(0, fbm(noise, x * 0.05, z * 0.05, 2)) * 0.4]; // the dunes: sand, coarse grass
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

  bases: { nato: { x: -120, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -830, entries: [-120, 0, 90] } },
  maxStacks: 26,
  cameraStart: { nato: { x: -60, z: 330 }, pact: { x: 0, z: -200 } },
  points,

  battlefield() { return { blasts: craters(), ruins: [], works: [] }; },

  landing: {
    attacker: 'nato',
    // what comes in (systems/Landing.js): the men in Higgins boats, the vehicles in LCT Mk 6s
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    // what the landing may call in at sea: the destroyers and the LSM(R)s inshore, the sweepers, an old battleship offshore
    navy: ['destroyer', 'lsmr', 'minesweeper', 'oldBattleship'],
    // the Navy’s mines across the bay, a swept lane off each sector
    seaMines: { z: [520, 580], count: 44, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1945_1101 },
    obstacles: OBSTACLES,
    // the defence (data/units45/atlanticWall.js, the Japanese variants): a pillbox complex in the pines over each of the
    // west beaches, one in the east shore’s rock enfilading the whole bay head; the guns on the scarp and the Shibushi hills
    forts: [
      { unit: 'wn', x: -265, z: shoreAt(-265) - 118, facing: 0 },
      { unit: 'wn', x: 40, z: shoreAt(40) - 118, facing: 0 },
      { unit: 'wn', x: 300, z: 235, facing: -2.3 },
      { unit: 'battery', x: -330, z: scarpZ(-330) - 45, facing: 0 },
      { unit: 'battery', x: 440, z: -170, facing: -0.6 },
    ],
    // wire along the top of the sand (open at the river), mines and trenches in the dunes, tank traps on the exits
    works: [
      ...Array.from({ length: 62 }, (_, i) => { const x = -480 + i * 11; return Math.abs(x - hishX(S0)) < 24 ? null : { kind: 'wire', x, z: shoreAt(x) - 36, yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-36, 36].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreAt(s.x + dx) - 64 }))),
      ...SECTORS.flatMap((s) => [-48, 0, 48].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreAt(s.x + dx) - 86, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-24, 24].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreAt(s.x + dx) - 80, yaw: 0 }))),
      ...SECTORS.map((s) => ({ kind: 'tankTraps', x: s.x, z: shoreAt(s.x) - 100, yaw: 0 })),
    ],
    // the defence at H-hour: in the dunes, at the cave mouths (back into the rock from there), in the villages and the town
    hold: [
      ...SECTORS.flatMap((s) => [-40, 40].map((dx) => ({ x: s.x + dx, z: shoreAt(s.x + dx) - 90 }))),
      ...CAVES.map((c) => ({ x: c.x, z: c.z - 12 })),
      { x: -360, z: -205 }, { x: 250, z: -60 },
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mortar', 'atTeam', 'rifles', 'mgTeam', 'sniper', 'mortar', 'rifles', 'atTeam', 'observers'],
    // the counter-attack: the 57th Army’s reserve down the valleys from the plateau
    counter: { t: 420, units: ['tank', 'heavyTank', 'rifles', 'tank', 'rifles'], say: 'The reserve is coming down from Kasanohara: Chi-Has and Chi-Nus with the infantry, straight for the beachhead', sayOther: 'Enemy armour coming down the valleys from the plateau: Chi-Has and infantry' },
    // the landing’s AI (ai/LandingDirector.js)
    ai: { order: ['rifles', 'rifles', 'engineers', 'tank', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'tank', 'mortar', 'rifles', 'tank'], gunship: 'destroyer', gunships: 2, sweeper: 'minesweeper', heavy: null },
    economy: { reserves: 2600, perSector: 750, beachIncome: 1.25, defenceCp: 750, defenceIncome: 1.15 },
    // X-Day: the first wave in to all three sectors at once
    waves: [{ t: 0, say: 'X-Day: the first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'tank', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'tank', sector: 2 },
    ] }],
  },

  spawns: {
    nato: [{ unit: 'destroyer', x: -200, z: 850, facing: Math.PI / 2 }, { unit: 'destroyer', x: 40, z: 860, facing: -Math.PI / 2 }], // (between the lanes)
    pact: [{ unit: 'rifles', x: -80, z: -280, facing: 0, name: '86th Division' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene, terrain);
    props.rand = mulberry32(1945_1102);
    const r = props.rand;
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 6 + rr && railDist(x, z) > 5 + rr && hish(x, z) > 10 + rr && !nearPoint(x, z, 16 + rr) && Math.hypot(x, z + 830) > 45 && inl(x, z) > 45;

    // ---- the railways, Shibushi station, a few wagons in the yard
    for (const l of RAILS) for (let i = 0; i < l.length - 1; i++) props.rails({ x0: l[i][0], z0: l[i][1], x1: l[i + 1][0], z1: l[i + 1][1] });
    props.townHouse({ x: STATION[0], z: STATION[1] - 12, yaw: Math.PI / 2, width: 22, depth: 9, storeys: 1, name: 'Shibushi station', damaged: 0.2 });
    props.wagon({ x: 120, z: coastZ(120) - 25, yaw: Math.PI / 2, kind: 'box', color: 0x4a3a2e });
    props.wagon({ x: 80, z: coastZ(80) - 25, yaw: Math.PI / 2, kind: 'open', color: 0x4a3a2e });
    // ---- Shibushi: tile-roofed houses in their lanes, shops on the main road, some burnt out by the raids; the harbour wall
    for (let gx = 165; gx <= 350; gx += 13) for (let gz = 20; gz >= -150; gz -= 12) {
      const x = gx + (r() - 0.5) * 4, z = gz + (r() - 0.5) * 4;
      if (townK(x, z) < 0.5 || !free(x, z, 3) || r() < 0.2 || Math.hypot(x - STATION[0], z - STATION[1] + 12) < 18) continue;
      if (r() < 0.1) { props.rubble(x, z, 0.5, true); continue; }
      jpHouse(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 7.5 + r() * 2.5, d: 6 + r() * 2, storeys: roadDist(x, z) < 18 && r() < 0.5 ? 2 : 1, name: roadDist(x, z) < 18 ? 'shop' : 'house' });
    }
    for (let s = 0; s < 70; s += 6) { const x = 222 + s * 0.3, z = 96 + s * 0.95; props.box('stone', x, 0.9, z, 6, 3, 6.4, 0.3, 0x8a8478); } // the harbour wall under the corner
    shrine(props, terrain, 420, -110, Math.PI, 'Shibushi shrine');
    // ---- the villages: Ōsaki, Kashiwabaru, Ariake hamlet; farmhouses and rice racks out on the paddies
    for (const v of VILLAGES) for (let i = 0; i < v.r * 0.6; i++) {
      const a = r() * Math.PI * 2, d = 10 + r() * (v.r - 8), x = v.x + Math.cos(a) * d, z = v.z + Math.sin(a) * d;
      if (!free(x, z, 4)) continue;
      jpHouse(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 8 + r() * 2, d: 6 + r() * 2, storeys: 1, name: i === 0 ? 'village office' : 'farmhouse' });
    }
    shrine(props, terrain, -330, -265, 0, 'Ōsaki shrine');
    for (let i = 0; i < 160; i++) {
      const x = (r() * 2 - 1) * 470, z = 20 - r() * 520;
      if (fieldC(x, z) < 0.5 || !free(x, z, 8)) continue;
      if (r() < 0.25) { jpHouse(props, { x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, w: 10, d: 7, name: 'farmhouse' }); continue; }
      const yaw = r() < 0.5 ? 0 : Math.PI / 2, s = Math.sin(yaw), c = Math.cos(yaw), y = g(x, z); // hazagake: the cut rice on its rail
      for (const k of [-3, 0, 3]) props.box('plain', x + s * k, y + 1.0, z + c * k, 0.12, 2.0, 0.12, yaw, 0x5a4a36);
      props.box('plain', x, y + 1.25, z, 0.5, 1.1, 6.6, yaw, 0xb09a5a);
      cover.addBox({ x, z, yaw, length: 6.6, thickness: 0.6, height: 1.6 });
    }
    // ---- the shinyo pens: tunnels dug into the east shore’s rock at the waterline, a plywood suicide boat on its slip before each
    for (const zc0 of [300, 330, 360]) {
      let xc = 420; while (xc > 200 && inl(xc - 2, zc0) > 9) xc -= 2;  // (back from the water’s edge into the cliff foot)
      const zc = zc0, y = g(xc, zc), yaw = -Math.PI / 2 - 0.25; // (facing out over the bay)
      const sx = Math.sin(yaw), cz = Math.cos(yaw);
      props.box('plain', xc + sx * 1.5, y + 1.3, zc + cz * 1.5, 0.4, 2.6, 4.2, yaw + Math.PI / 2, 0x14120e);                 // the tunnel’s mouth
      const xb = xc + sx * 7, zb = zc + cz * 7, yb = g(xb, zb);
      props.box('plain', xb, yb + 0.12, zb, 1.6, 0.24, 9, yaw, 0x5a4a36, 0.08, 0);              // the slip
      props.box('plain', xb, yb + 0.6, zb, 1.7, 0.7, 5.2, yaw, 0x4a5240);                      // the boat
      props.box('plain', xb - sx, yb + 1.05, zb - cz, 1.1, 0.4, 1.2, yaw, 0x3a3e34);            // her cockpit
    }
    // ---- range stakes on the dunes, white-topped, the guns on the scarp registered on them
    for (let x = -470; x < 180; x += 55) { const z = shoreAt(x) - 48, y = g(x, z); if (Math.abs(x - hishX(z)) < 20) continue; props.box('plain', x, y + 0.9, z, 0.2, 1.8, 0.2, 0, 0xe8e4dc); }
    // ---- spider holes on the hills’ approaches, observation masts on the heights
    for (const [hx, hz] of HILLS) for (let k = 0; k < 7; k++) {
      const a = r() * Math.PI * 2, x = hx + Math.cos(a) * (45 + r() * 20), z = hz + Math.sin(a) * (45 + r() * 20);
      if (!free(x, z, 2) || Math.abs(x) > 480) continue;
      const y = g(x, z);
      props.box('plain', x, y + 0.03, z, 1.0, 0.08, 1.0, a, 0x14120e);
      props.box('plain', x + 0.5, y + 0.25, z, 1.1, 0.12, 1.1, a, 0x9a8a58, 0, 0.5);
    }
    props.mast({ x: -80, z: -320, height: 9 });
    props.mast({ x: CASTLE.x + 10, z: CASTLE.z - 25, height: 9 });
    commandPost(props, this.bases.pact, 1, 0x6a6640);
    props.finish();

    const avoid = [{ x: 0, z: -830, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => inl(x, z) < 44 || roadDist(x, z) < 6 || railDist(x, z) < 5 || fieldC(x, z) > 0.2 || townK(x, z) > 0.3 || villK(x, z) > 0.4 || hish(x, z) < 8 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, count: 6000, broadleaf: 0.25, autumn: 0.25, maxY: 120, avoid,
      forest: (x: number, z: number) => woodsC(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => inl(x, z) < 40 || roadDist(x, z) < 4 || townK(x, z) > 0.5 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
