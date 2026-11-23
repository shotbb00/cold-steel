// Cracow, November–December 1914: the approaches to Fortress Cracow (Festung Krakau). After the Battle of the Vistula
// the Russian Third and Ninth Armies roll west through Galicia and by mid-November stand before the ring of Austro-
// Hungarian forts on the hills round the city — north of the Vistula from Zielonki to Mogiła, south of it from
// Swoszowice to Wieliczka. The forts are low casemated works under earth, each behind its ditch, with armoured turrets and
// barracks dug into the hill; the Russian shells reach the outer works, but the ring holds, and in the first days of
// December the Austro-Hungarian and German counterstroke at Limanowa, up the Raba valley to the south-east, throws the
// Russians back. The ground: rolling Lesser Poland farmland in early winter, the first snow lying in patches, villages
// and their churches; the Vistula across the middle in its broad valley with the Dłubnia brook coming down to it from the
// north and the Raba from the south; Fort 48 Batowice on its hill north of the river, Fort Kościuszko round the
// Kościuszko Mound south of it; Wieliczka’s salt-mine shaft; and beyond the Austro-Hungarian edge Cracow’s skyline —
// Wawel castle and cathedral on their hill, St Mary’s two towers and the Cloth Hall.
// Russians (nato, army 'ru') north, +z; Austro-Hungarians and Germans (pact, 'ah', 'de') south.
// Not mirrored but fair: the Vistula runs between the sides with three bridges (Bielany’s pontoon bridge, Przewóz in
// the middle, Niepołomice), each at the same x; each half has one fort on one named hill of the same height at the same
// reach from its base (Batowice north-west of the middle, Kościuszko south-east — the northern outer forts, which the
// Russian advance reached, stand here in Russian hands so each side has its bastion), the same ditch, turrets and wire;
// each half has a brook down to the Vistula on the opposite flank (the Dłubnia west on the Russian half, the Raba east
// on the Austrian) with two fords and a bridge at the same places, a lesser rise on the other flank, three villages at
// the same depths, one trench line and its wire at the same distance from the water, and its own woods cut to the same
// area. The Kościuszko Mound’s cone stands at the back of its fort, off the point’s centre; Batowice’s hill is a little
// higher to answer it. Cracow itself lies beyond the playable edge.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const SEED = 1914_11;
const BASE_Z = 500;
const SIDE_X = 330;
const HW = 18;                                              // the Vistula: broad and slow in its valley
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(SEED);
const mid = (x: number) => 14 * Math.sin(x * 0.005 + 0.9) + 8 * Math.sin(x * 0.016 - 0.7) - 4;
// the brooks: the Dłubnia from the north down the Russian west flank, the Raba from the south up the Austrian east flank
const DLUBNIA = [[-240, 650, 5], [-250, 470, 5], [-262, 390, 5], [-250, 302, 5], [-238, 200, 6], [-250, 110, 6], [-250, mid(-250), 7]];
const RABA = [[235, -650, 5], [250, -470, 5], [275, -390, 5], [250, -302, 5], [226, -220, 6], [242, -110, 6], [250, mid(250), 7]];
const bankN = (x: number) => mid(x) + 52 + 6 * Math.sin(x * 0.011);
const bankS = (x: number) => mid(x) - 55 + 8 * Math.sin(x * 0.008 + 2);
const river = createRiver({
  path: mid, paths: [mid, DLUBNIA, RABA], halfWidth: HW, level: 0, depth: 2.8, valley: 80,
  crossings: [
    { name: 'Bielany pontoon bridge', x: -SIDE_X, kind: 'bridge', width: 6, channel: 0 },
    { name: 'Przewóz bridge', x: 0, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Niepołomice bridge', x: SIDE_X, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Bieńczyce ford', x: -250, z: bankN(-250), kind: 'ford', width: 12, channel: 1 },
    { name: 'Dłubnia mill bridge', x: -250, z: 302, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Batowice ford', x: -250, z: 470, kind: 'ford', width: 12, channel: 1 },
    { name: 'Raba ford', x: 250, z: bankS(250), kind: 'ford', width: 12, channel: 2 },
    { name: 'Raba bridge', x: 250, z: -302, kind: 'bridge', width: 6, channel: 2 },
    { name: 'Kłaj ford', x: 250, z: -470, kind: 'ford', width: 12, channel: 2 },
  ],
});
const wetD = (x: number, z: number) => { const I = river.project(x, z); return I.d - I.hw; };
const away = (x: number, z: number) => Math.abs(z - mid(x));

// ---- the points
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Proszowice road', 0, 470, 'centre'),
  P('B', 'Zielonki', -385, 320, 'west'),
  P('C', 'Fort 48 Batowice', -150, 265, 'centre', { radius: 28 }),
  P('D', 'Mogiła', 290, 300, 'east'),
  P('E', 'Bielany', -280, Math.round(mid(-280) + 82), 'west', { radius: 24 }),
  P('F', 'Przewóz', 0, Math.round(mid(0)), 'centre', { radius: 32 }),
  P('G', 'Niepołomice', SIDE_X, Math.round(mid(SIDE_X) - 84), 'east', { radius: 24 }),
  P('H', 'Swoszowice', -310, -310, 'west'),
  P('I', 'Fort Kościuszko', 100, -245, 'centre', { radius: 28 }),
  P('J', 'Wieliczka', 380, -290, 'east'),
  P('K', 'Cracow', 0, -470, 'centre'),
] as any[];
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the roads: the three bridge roads up to each base, a valley road along each bank, the lane through each side's
// villages and fort (over its brook by the mill bridge), the lane behind each base (over its brook by the back ford)
const along = (f: (x: number) => number, x0: number, x1: number) => { const o: number[][] = []; for (let x = x0; x <= x1; x += 25) o.push([x, f(x)]); return o; };
const ROADS: number[][][] = [
  [[0, 600], [0, 470], [18, 360], [-8, 200], [0, 90], [0, mid(0)]],
  [[0, -600], [0, -470], [-18, -360], [8, -200], [0, -90], [0, mid(0)]],
  ...[-SIDE_X, SIDE_X].flatMap((x) => [[[x, 600], [x, mid(x)]], [[x, -600], [x, mid(x)]]]),
  along(bankN, -525, 525), along(bankS, -525, 525),
  [[-385, 320], [-SIDE_X, 312], [-250, 302], [-150, 340], [0, 300], [150, 310], [290, 300], [SIDE_X, 305]],
  [[-SIDE_X, -306], [-310, -310], [-150, -310], [0, -295], [100, -320], [250, -302], [380, -290]],
  [[-150, 340], [-150, 265]], [[100, -320], [100, -245]],                                     // the fort roads in by the gorge gate
  [[-SIDE_X, 480], [-250, 470], [-120, 466], [0, 470], [140, 466], [SIDE_X, 478]],
  [[-SIDE_X, -478], [-140, -466], [0, -470], [120, -466], [250, -470], [SIDE_X, -480]],
  [[-280, mid(-280) + 82], [-SIDE_X, mid(-280) + 82]],
];
function segDistAll(x: number, z: number) {
  let best = 80;
  for (const poly of ROADS) for (let k = 0; k < poly.length - 1; k++) {
    const [ax, az] = poly[k], [bx, bz] = poly[k + 1];
    if (Math.min(ax, bx) - best > x || Math.max(ax, bx) + best < x || Math.min(az, bz) - best > z || Math.max(az, bz) + best < z) continue;
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
const roadD = gridCache(segDistAll, { x: 520, z: 580 }, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
// the railways behind each base: the Cracow–Lwów line behind the Austrians, the line to Kielce behind the Russians
const RAIL_Z = 535;
const railD = (x: number, z: number) => Math.abs(Math.abs(z) - RAIL_Z);
// each side's airfield behind its open flank (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: 160, z: 380, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -160, z: -380, yaw: -Math.PI / 2, large: false }];
const airD1 = (a: any, x: number, z: number) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52));
const airD = (x: number, z: number) => Math.min(airD1(AIR[0], x, z), airD1(AIR[1], x, z));

// ---- the forts: a ring ditch with the gorge gate at the back, the top graded flat; Kościuszko’s mound at the back of its fort
const FORTS = [
  { c: { x: -150, z: 265 }, r: 40, gates: [[-150, 400]], f: 'nato' as const, name: 'Fort 48 Batowice', mound: false },
  { c: { x: 100, z: -245 }, r: 40, gates: [[100, -400]], f: 'pact' as const, name: 'Fort Kościuszko', mound: true },
].map((o) => ({ ...o, ga: o.gates.map(([gx, gz]) => Math.atan2(gz - o.c.z, gx - o.c.x)) }));
const MOUND = { x: 80, z: -259, r: 13, h: 9 };
const angGap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const ditch = (x: number, z: number) => {
  let k = 0;
  for (const F of FORTS) {
    const d = Math.hypot(x - F.c.x, z - F.c.z);
    if (Math.abs(d - F.r) > 6) continue;
    const a = Math.atan2(z - F.c.z, x - F.c.x);
    if (F.ga.some((g) => angGap(a, g) * d < 8)) continue;
    k = Math.max(k, smoothstep(6, 2, Math.abs(d - F.r)));
  }
  return k;
};
const fortD = (x: number, z: number) => Math.min(...FORTS.map((F) => Math.hypot(x - F.c.x, z - F.c.z) - F.r));

// ---- the ground
/** [x, z, r, h]: Batowice’s hill and the Mogiła rise on the north; Kościuszko’s (Sowiniec) hill and the Swoszowice rise on the south. */
const RISES = [[-150, 265, 150, 14], [300, 340, 150, 6], [100, -245, 150, 13], [-340, -290, 160, 7]];
function open(x: number, z: number) {
  const d = away(x, z), north = z > mid(x);
  const n = fbm(noise, x * 0.004 + (north ? 0 : 40), z * 0.004, 4);
  // the Vistula's valley floor, the long slopes up to each side's crest and a little down behind it
  const crest = north ? 180 + 30 * Math.sin(x * 0.007 + 1) : 195 + 30 * Math.sin(x * 0.006 + 3.4);
  let h = 1.4 + smoothstep(40, crest, d) * (11 + n * 9) - smoothstep(crest + 60, crest + 220, d) * 3;
  h += fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 1.3 * smoothstep(40, 140, d);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 6 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 14;
  h += 10 * smoothstep(80, 15, Math.hypot(x + 170, z + 650));          // the Wawel hill beyond the edge
  return h;
}
const FTOP = FORTS.map((F) => open(F.c.x, F.c.z)), ATOP = AIR.map((a) => open(a.x, a.z + 27 * Math.sign(a.z)));
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = open(x, z);
  const d = away(x, z);
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 1.3 + d * 0.06) - h) * (1 - smoothstep(5, 18, Math.abs(x - bx))) * (1 - smoothstep(90, 150, d));   // the ramps to the bridges
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 8 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  AIR.forEach((a, i) => { h += (ATOP[i] - h) * smoothstep(40, 4, airD1(a, x, z)); });
  FORTS.forEach((F, i) => { h += (FTOP[i] - h) * smoothstep(F.r + 30, F.r + 6, Math.hypot(x - F.c.x, z - F.c.z)); });   // the fort tops graded
  return h;
}, { x: 700, z: 760 }, 4);
function height(x: number, z: number) {
  let h = ground(x, z);
  if (fortD(x, z) < 8) {
    h -= 3 * ditch(x, z);
    const m = Math.hypot(x - MOUND.x, z - MOUND.z);
    if (m < MOUND.r) h += MOUND.h * (1 - m / MOUND.r) ** 1.3;
  }
  return river.carve(x, z, Math.max(1.4, h));
}

// ---- woods: copses over each half, cut to the same area
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
const T_N = 0.2, T_P = evenThreshold(wn, T_N, (x: number, z: number) => z > mid(x));
/** Each side's fire trench on the forward slope, its own wander. */
const trenchZ = (x: number, north: boolean) => (north ? mid(x) + 128 + 10 * Math.sin(x * 0.013 + 0.4) : mid(x) - 124 - 12 * Math.sin(x * 0.01 + 2.2));
const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > mid(x))) < 28;
const woodField = gridCache((x: number, z: number) => {
  if (wetD(x, z) < 8 || fortD(x, z) < 45 || airD(x, z) < 25 || Math.hypot(x, Math.abs(z) - BASE_Z) < 60 || railD(x, z) < 8) return 0;
  return Math.abs(x) > 470 || wn(x, z) > (z > mid(x) ? T_N : T_P) ? 1 : 0;
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'cracow',
  name: 'Cracow',
  description: 'November–December 1914: the Russian advance reaches the outer forts of Fortress Cracow and is stopped. The Vistula in its broad valley with the Dłubnia and Raba brooks, Fort 48 Batowice and Fort Kościuszko round its mound — low casemated forts under earth behind their ditches, with armoured turrets — rolling farmland and villages under the first snow, Wieliczka’s salt mine, and Wawel and St Mary’s on the skyline.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['ah', 'de'] }, // (the Russian Third and Ninth Armies against the Cracow garrison, the k.u.k. Fourth Army and the German corps beside it)
  sides: { nato: 'Russia', pact: 'Central Powers' },
  conditions: { time: 'day', weather: 'overcast' }, // (grey early-winter days, the first snow down)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 80, weights: [0.3, 0.35, 0.1, 0.25] as any }),

  theme: {
    // a low grey December sky over Lesser Poland
    fogColor: 0xb2b6b8, fogDensity: 0.0016, skyTop: 0x78828c, skyHorizon: 0xc2c6c8, skyBottom: 0x84888a,
    sunColor: 0xe4e2dc, sunIntensity: 1.3, sunDisk: 0.05, clouds: 0.9, cloudLight: 0xc8cccc, cloudDark: 0x7a8086,
    sunDir: [0.35, 0.4, -0.7], hemiSky: 0xccd2d8, hemiGround: 0x7a786c, hemiIntensity: 1.4, rimColor: 0xc0c6cc, rimIntensity: 0.2,
    terrain: {
      grass: '#76775a', grassAlt: '#7e7e5e', dryGrass: '#948a6c', dirt: '#5e5040', rock: '#8a867c', strip: '#665a48',
      pasture: '#7a7a5a', ploughed: '#56493a', stubble: '#8e866a', meadow: '#76785a',
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x5c5042, 0.9];                                       // frozen ruts
        if (railD(x, z) < 2.4 && Math.abs(x) < 500) return [0x4e4a44, 0.8];               // ballast
        if (ditch(x, z) > 0.3) return [0x5a5244, 0.8];                                  // the fort ditches
        if (fortD(x, z) < 0) return [0x6e6e5c, 0.45];                                   // the forts' earth cover
        const s = fbm(noise, x * 0.018 + 31, z * 0.018, 3) + (y - 8) * 0.012;               // the first snow in patches, more on the heights
        if (s > 0.28) return [0xe6eaec, Math.min(0.85, (s - 0.28) * 6)];
        if (y < 1.7 && wetD(x, z) < 12) return [0x6a6252, 0.7];                          // the muddy banks
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each side's fire trench with two belts of wire, the fort wire, machine guns on the ramparts, the shelling of the outer works. */
  battlefield(game: any) {
    const works: any[] = [];
    const ok = (w: any) => wetD(w.x, w.z) > 10 && airD(w.x, w.z) > 15 && roadD(w.x, w.z) > 7 && fortD(w.x, w.z) > 14 && !nearPt(w.x, w.z, 30);
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 20, belts: 2, gapEvery: 60 })) if (ok(w)) works.push(w);
      for (const bx of [-SIDE_X, 0, SIDE_X]) works.push({ kind: 'mgNest', x: bx + 16 * s, z: trenchZ(bx + 16 * s, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    for (const F of FORTS) {
      for (const off of [10, 16]) {
        const R = F.r + off, n = Math.round((2 * Math.PI * R) / 10.2);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          if (F.ga.some((g) => angGap(a, g) * R < 11)) continue;
          const x = F.c.x + Math.cos(a) * R, z = F.c.z + Math.sin(a) * R;
          if (wetD(x, z) > 10 && roadD(x, z) > 5) works.push({ kind: 'wire', x, z, yaw: -a + Math.PI / 2, faction: F.f });
        }
      }
      const toward = F.f === 'nato' ? -1 : 1;
      for (const da of [-0.9, 0.9]) {
        const a = Math.atan2(toward, 0) + da, R = F.r - 9;
        works.push({ kind: 'mgNest', x: F.c.x + Math.cos(a) * R, z: F.c.z + Math.sin(a) * R, yaw: F.f === 'nato' ? Math.PI : 0, faction: F.f });
      }
    }
    const dens = (x: number, z: number) => { const dz = Math.abs(z) - 125; return 0.6 * Math.exp(-((dz / 50) ** 2)) + (fortD(x, z) < 50 && fortD(x, z) > 0 ? 0.4 : 0) + 0.03; };
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b: number[]) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => wetD(b[0], b[1]) > 10 && airD(b[0], b[1]) > 15 && !onRoad(b[0], b[1]) && ditch(b[0], b[1]) < 0.1 && !nearPt(b[0], b[1], 30));
    const r = mulberry32(SEED);
    const ruins = game.buildings.list.filter((b: any) => Math.abs(b.z) < 140 && r() < 0.25).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const skip = (x: number, z: number) => wetD(x, z) < 12 || roadD(x, z) < 8 || trenchBand(x, z) || fortD(x, z) < 14 || railD(x, z) < 9 || airD(x, z) < 25;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V1 = new THREE.Vector3(1, 1, 1);
    const drum = (x: number, z: number, r: number, h: number, color: number, y0: number, key = 'stone', solid = true) => {
      M.compose(new THREE.Vector3(x, y0 + h / 2, z), Q, V1);
      props.push(key, new THREE.CylinderGeometry(r, r, h, 14), M, color);
      if (solid) cover.addCylinder({ x, z, radius: r, height: h });
    };
    const cone = (x: number, z: number, r: number, h: number, color: number, y0: number, sides = 4, rot = Math.PI / 4) => {
      M.compose(new THREE.Vector3(x, y0 + h / 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), V1);
      props.push('plain', new THREE.ConeGeometry(r, h, sides), M, color);
    };

    // Przewóz astride the Vistula: houses on both banks round the bridge, its church on the north bank, the inn on the south
    props.rand = mulberry32(SEED + 1);
    for (let i = 0, n = 0; n < 22 && i < 500; i++) {
      const a = props.rand() * Math.PI * 2, d = 30 + props.rand() * 60, x = Math.cos(a) * d * 1.3, z = mid(x) + Math.sin(a) * d;
      if (skip(x, z) || Math.hypot(x - 40, z - mid(40) - 58) < 18 || Math.hypot(x + 36, z - mid(-36) + 58) < 14) continue;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.35 ? 1 : 0), damaged: 0.1 });
      n++;
    }
    props.church({ x: 40, z: mid(40) + 58, yaw: 0.05 });
    props.townHouse({ x: -36, z: mid(-36) - 58, yaw: Math.PI, width: 12, depth: 9, storeys: 2, name: 'inn', damaged: 0.1 });
    // the villages, a church in each of the four flank ones
    for (const p of points) {
      if ('AKF'.includes(p.id)) continue;
      const fort = p.id === 'C' || p.id === 'I';
      if (!fort) farmVillage(props, p.x, p.z, 8, SEED * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.2);
    }
    props.rand = mulberry32(SEED + 2);
    for (const [x, z, yaw] of [[-405, 352, 0.2], [272, 352, -0.3], [-322, mid(-322) + 108, 0.1], [372, mid(372) - 112, Math.PI], [-340, -282, Math.PI + 0.3], [405, -262, Math.PI - 0.2]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }
    // Mogiła's Cistercian abbey: the cloister range beside the church
    if (!skip(298, 354)) props.hall({ x: 298, z: 354, yaw: 0, width: 26, depth: 9, height: 6, color: 0xa49a88, roof: 0x7a3c2c, door: 3, name: 'abbey cloister' });
    // Wieliczka's salt mine: the shaft house and its winding tower, the salt store
    props.headframe({ x: 350, z: -330, yaw: 0.3, height: 20 });
    props.hall({ x: 366, z: -352, yaw: 0.3, width: 18, depth: 9, height: 5, color: 0x8a7a64, roof: 0x4a4440, door: 4, name: 'salt store' });

    // the forts: a casemated block of two armoured turrets across the front, the barracks dug in behind under earth, an
    // observation cupola, the brick gorge wall at the back (Kościuszko: its mound)
    for (const F of FORTS) {
      const toward = F.f === 'nato' ? -1 : 1, cx = F.c.x, cz = F.c.z, y = terrain.heightAt(cx, cz + toward * 18);
      const conc = 0x8e8a7c, steel = 0x3a3e40, brick = 0x8a5040;
      props.box('plain', cx, y + 0.7, cz + toward * 18, 26, 1.8, 9, 0, conc);
      props.box('plain', cx, y + 1.75, cz + toward * 18, 28, 0.4, 11, 0, 0x6a6a56);                     // (earth over it)
      for (const tx of [-7, 7]) {
        drum(cx + tx, cz + toward * 18, 2.2, 1.1, steel, y + 1.6, 'metal');
        props.box('metal', cx + tx, y + 2.25, cz + toward * 21.6, 0.45, 0.45, 5, 0, 0x1c1e20);         // (the howitzer, laid toward the front)
      }
      const bx = cx + 18, bz = cz - toward * 16, by = terrain.heightAt(bx, bz);
      props.hall({ x: bx, z: bz, yaw: F.f === 'nato' ? Math.PI : 0, width: 20, depth: 8, height: 4.2, color: conc, roof: 0x5c5a50, door: 3, name: 'barracks' });
      props.box('plain', bx, by + 5, bz, 21, 1, 9, 0, 0x6a6a56);
      drum(cx - 24, cz + toward * 6, 1.4, 1.6, steel, terrain.heightAt(cx - 24, cz + toward * 6) + 0.1, 'metal');   // the observation cupola
      for (const [dx, len] of [[-24, 18], [24, 18]]) props.lowWall({ x: cx + dx, z: cz - toward * 33, yaw: 0, length: len, height: 2.4, color: brick });
      if (F.mound) {
        const g = terrain.heightAt(MOUND.x, MOUND.z);
        props.boulder({ x: MOUND.x, z: MOUND.z, radius: 0.9 });
        props.box('plain', MOUND.x, g + 0.6, MOUND.z, 0.2, 1.2, 0.2, 0, 0x4a4a46);
      }
    }

    // farmsteads, hay and field walls over each half
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 110 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 130 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPt(x, z, 50) || skip(x, z) || woodField(x, z) > 0.5 || fortD(x, z) < 40) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    // the railways: wagons on the sidings, a halt each side
    for (const s of [1, -1]) {
      props.rails({ x0: -500, z0: s * RAIL_Z, x1: 500, z1: s * RAIL_Z });
      for (const x of s > 0 ? [-140, -124, 110] : [-110, -94, 140, 156]) props.wagon({ x, z: s * RAIL_Z, yaw: Math.PI / 2, kind: 'box', color: s > 0 ? 0x4e3a2a : 0x4a4a3e });
      props.flatHouse({ x: 60 * s, z: s * (RAIL_Z - 12), yaw: s > 0 ? Math.PI : 0, width: 10, depth: 6, name: 'railway halt' });
    }

    // Cracow beyond the Austrian edge: the old town's roofs, Wawel castle and cathedral on their hill, St Mary's two towers, the Cloth Hall
    const WAW = { x: -170, z: -650 }, MAR = { x: 70, z: -625 };
    const r = mulberry32(1257);
    for (let z = -575; z >= -720; z -= 14) for (let x = -320; x <= 300; x += 13) {
      const px = x + (r() - 0.5) * 4, pz = z + (r() - 0.5) * 4;
      if (Math.hypot(px - WAW.x, pz - WAW.z) < 75 || Math.hypot(px - MAR.x, pz - MAR.z) < 34 || Math.abs(px) < 10 || r() < 0.15) continue;
      const g = terrain.heightAt(px, pz), h = 6 + r() * 6, w = 9 + r() * 3;
      props.box('plain', px, g + h / 2 - 0.5, pz, w, h + 1, 10, 0, [0xb4a68e, 0xa89a84, 0xc0b49c, 0x9c8e7a][Math.floor(r() * 4)]);
      props.box('plain', px, g + h + 1.1, pz, w + 0.6, 2.2, 7, 0, r() < 0.7 ? 0x8a4434 : 0x4e5054);
    }
    {
      const g = terrain.heightAt(WAW.x, WAW.z), stone = 0xb8ae96;
      for (const [dx, dz, w, d] of [[0, -24, 52, 10], [0, 24, 52, 10], [-24, 0, 10, 38], [24, 0, 10, 38]]) {   // the castle's four ranges round the arcaded court
        props.box('plain', WAW.x + dx, g + 7, WAW.z + dz, w, 14, d, 0, stone);
        props.box('plain', WAW.x + dx, g + 15, WAW.z + dz, w + 0.6, 2.4, d + 0.6, 0, 0x8a4434);
      }
      const cX = WAW.x + 44, cZ = WAW.z + 10;                                         // the cathedral east of the court
      props.box('plain', cX, g + 9, cZ, 14, 18, 40, 0, 0xa69c86);
      props.box('plain', cX, g + 19, cZ, 14.5, 3, 40.5, 0, 0x4a5a50);
      for (const [dx, dz, h] of [[-8, -20, 34], [8, -20, 28], [0, 22, 26]]) { props.box('plain', cX + dx, g + h / 2, cZ + dz, 6, h, 6, 0, 0xa69c86); cone(cX + dx, cZ + dz, 4.4, 8, 0x4a5a50, g + h); }
      drum(cX + 10, cZ, 4, 6, 0xa69c86, g + 18, 'plain', false);
      M.compose(new THREE.Vector3(cX + 10, g + 25, cZ), Q, V1);
      props.push('metal', new THREE.SphereGeometry(4.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M, 0xc8a040);   // the Sigismund chapel's gilded dome
      drum(WAW.x - 34, WAW.z - 18, 6, 22, stone, g, 'plain', false); cone(WAW.x - 34, WAW.z - 18, 7, 9, 0x8a4434, g + 22, 10, 0);   // the Senators' and Thieves' towers
    }
    {
      const g = terrain.heightAt(MAR.x, MAR.z), brick = 0x8e4a38;
      props.box('plain', MAR.x, g + 11, MAR.z + 16, 16, 22, 34, 0, brick);
      props.box('plain', MAR.x, g + 23.5, MAR.z + 16, 16.5, 3, 34.5, 0, 0x4a5a50);
      props.box('plain', MAR.x - 6, g + 22, MAR.z, 7, 44, 7, 0, brick);                // the Hejnał tower, its gothic helm with the crown
      cone(MAR.x - 6, MAR.z, 4.6, 16, 0x3e5a4c, g + 44, 8, 0);
      for (const [ox, oz] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) cone(MAR.x - 6 + ox, MAR.z + oz, 1, 6, 0x3e5a4c, g + 44, 8, 0);
      props.box('plain', MAR.x + 6, g + 17, MAR.z, 7, 34, 7, 0, brick);                // the bell tower
      cone(MAR.x + 6, MAR.z, 4.8, 7, 0x3e5a4c, g + 34, 8, 0);
      const sg = terrain.heightAt(MAR.x - 70, MAR.z - 10);                             // the Cloth Hall across the market square
      props.box('plain', MAR.x - 70, sg + 6, MAR.z - 10, 16, 12, 64, 0, 0xc8bca0);
      props.box('plain', MAR.x - 70, sg + 13.5, MAR.z - 10, 17, 3, 65, 0, 0x8a4434);
    }

    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 3 || roadD(x, z) < 4.5 || railD(x, z) < 5 || airD(x, z) < 12 || fortD(x, z) < 30 || Math.hypot(x * 0.77, z - mid(x)) < 95 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3800, hedges: 1200, autumn: 1, broadleaf: 0.65,
      forest: (x: number, z: number) => {
        if (wetD(x, z) < 3) return -1;
        if (trenchBand(x, z)) return 0.03;
        if (wetD(x, z) < 40) return 0.25;                                     // willows and alders along the water
        return woodField(x, z) > 0.5 ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
