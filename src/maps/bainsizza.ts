// The Bainsizza, August–September 1917: the Eleventh Battle of the Isonzo. In the night of 18 to 19 August the
// pioneers of Capello’s Second Army threw pontoon bridges over the Isonzo at Plava, Anhovo and below Canale under the
// guns, and the infantry climbed the gorge’s walls onto the Bainsizza plateau; Monte Santo and its shattered monastery
// fell on the 24th, the Austro-Hungarians went back across the karst — and then held Monte San Gabriele, the bare
// stone summit honeycombed with caverns and gun galleries, through a month of the worst fighting of the Isonzo.
// The ground: the Isonzo deep in its gorge, a narrow ribbon of emerald water over pale gravel, its few bridges — the
// Plava pontoons, Canale’s old stone bridge in the town, the pontoons at Anhovo — and a road along each bank at the
// bottom; above the walls, cut with caverns and the galleries of the guns, the rough limestone of the plateaux:
// sinkholes (dolines) with red earth in their bottoms, scrub oak and hornbeam, dry-stone walls, few roads, the mule
// tracks cut in long traverses down the walls and the cableways (teleferiche) hauling up shells; the stony summits of Monte
// Santo with the ruin of its monastery and Monte San Gabriele with its sangars and gallery mouths.
// Not mirrored but fair: each side holds one rim of the gorge — the same height and depth of wall, its own three
// roads cut down the wall to its bank road, one near each bridge — and has its summit (Monte Santo on the Italian side,
// San Gabriele on the Austrian) at the same height and reach from its base, both standing back from the rim, a knoll
// at each flank of its plateau. To take the other summit both must go down into the gorge, over a bridge and up the far
// wall. The gorge’s bends, the walls’ crags, the karst and the summits’ places along the rim are each side’s own.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { pontoons, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const BX = 330;                                          // the flank bridges’ x (Plava west, Anhovo east)
const W0 = 55, W1 = 170;                                  // the gorge’s walls: from the floor (m off the river’s middle) to the rim
const PLAT = 62;                                          // the plateaux, m over the river
const EXT = { x: 520, z: 580 };                          // (the grids the dear parts are sampled onto)
const BANK = 34;                                          // the road along each bank at the bottom, m off the river’s middle
const noise = createNoise2D(1917_08_19);
const iso = (x: number) => 22 * Math.sin(x * 0.0055 + 0.4) + 8 * Math.sin(x * 0.017) + 16 * (Math.cos(x * 0.011) - Math.cos(x * 0.004)) - 6; // (its own bends: not a mirror)
const river = createRiver({
  path: iso, halfWidth: 12, level: 0, depth: 3.2, valley: 46,
  crossings: [
    { name: 'Plava pontoon bridge', x: -BX, kind: 'bridge', width: 8, pontoon: true },
    { name: 'Canale bridge', x: 0, kind: 'bridge', width: 8 },
    { name: 'Anhovo pontoon bridge', x: BX, kind: 'bridge', width: 8, pontoon: true },
  ],
});
const away = (x: number, z: number) => Math.abs(z - iso(x));
const north = (x: number, z: number) => z > iso(x);
/** A point `a` m off the river’s middle on the north (+) or south (−) bank. */
const N = (x: number, a: number) => [x, Math.round(iso(x) + a)];
const S = (x: number, a: number) => [x, Math.round(iso(x) - a)];

/** The heights [x, z, r, h]: Monte Santo, Vodice, Monte Kuk and a shoulder on the Italian plateau; San Gabriele, Banjšice’s knoll, Kobilek and a shoulder on the Austrian. */
const HILLS = [[-70, 315, 200, 47], [-340, 310, 120, 14], [320, 305, 120, 15], [150, 440, 120, 7],
  [100, -300, 200, 47], [-300, -320, 120, 15], [380, -275, 120, 14], [-170, -430, 120, 7]];
const C0 = HILLS[0], I0 = HILLS[4];

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Korada road', 0, 470, 'centre'),
  P('B', 'Vodice', -340, 310, 'west', { radius: 24 }),
  P('C', 'Monte Santo', C0[0], C0[1], 'centre', { radius: 24 }),
  P('D', 'Monte Kuk', 320, 305, 'east', { radius: 24 }),
  P('E', 'Plava', ...(N(-BX + 30, 30) as [number, number]), 'west', { radius: 22 }),
  P('F', 'Canale', 0, Math.round(iso(0)), 'centre', { radius: 30 }),
  P('G', 'Anhovo', ...(S(BX - 30, 30) as [number, number]), 'east', { radius: 22 }),
  P('H', 'Banjšice', -300, -320, 'west', { radius: 24 }),
  P('I', 'Monte San Gabriele', I0[0], I0[1], 'centre', { radius: 24 }),
  P('J', 'Kobilek', 380, -275, 'east', { radius: 24 }),
  P('K', 'Chiapovano road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The roads cut down the gorge’s walls, each a long traverse with its own line: [x, a] from the bank road up to the rim. */
const ZIG_N = [[[-200, BANK], [-250, 48], [-330, 106], [-455, 186]], [[120, BANK], [70, 48], [-5, 106], [-130, 186]], [[210, BANK], [260, 48], [335, 106], [460, 186]]].map((z) => z.map(([x, a]) => N(x, a)));
const ZIG_S = [[[-460, BANK], [-410, 48], [-335, 106], [-205, 186]], [[-110, BANK], [-60, 48], [10, 106], [140, 186]], [[190, BANK], [240, 48], [320, 110], [445, 190]]].map((z) => z.map(([x, a]) => S(x, a)));
const top = (z: number[][]) => z[z.length - 1];
/** All the roads: the traverses down the walls, and on each plateau the trunk from the base over the summit to the middle traverse, the road along behind the rim through the flank knolls, the tracks out to the edges. */
const ROADS = [
  ...ZIG_N, ...ZIG_S,
  [[0, BASE_Z], at('C'), top(ZIG_N[1])],
  [[0, -BASE_Z], at('I'), top(ZIG_S[1])],
  [[-500, 300], at('B'), top(ZIG_N[0])], [at('B'), [-200, 265], top(ZIG_N[1]), [180, 260], at('D'), top(ZIG_N[2])], [at('D'), [500, 330]],
  [[-500, -335], at('H'), top(ZIG_S[0])], [at('H'), [-180, -255], top(ZIG_S[1]), [210, -250], at('J'), top(ZIG_S[2])], [at('J'), [500, -260]],
  [at('B'), [-250, 420], [0, BASE_Z]], [at('J'), [250, -420], [0, -BASE_Z]],
];

/** The karst before the roads: the gorge, its walls, the plateaux with their heights, crags and dolines. */
const DOLINES: number[][] = [];
const BASE_H: number[][] = [];
function karst(x: number, z: number) {
  const a = away(x, z), n = north(x, z);
  let h = 1.6 + 1.3 * smoothstep(20, W0, a);                                              // the gravel terraces at the bottom
  const w1 = W1 + (n ? 8 * Math.sin(x * 0.012) : 9 * Math.sin(x * 0.009 + 2));            // (each rim its own line)
  const k = smoothstep(W0, w1, a);
  h += (PLAT + (n ? 3 * Math.sin(x * 0.008) - 3 : 3 * Math.cos(x * 0.01 + 1)) - 0.03 * x) * k; // the walls (both plateaux climb westward, toward the Kolovrat and the Trnovo forest)
  if (n) h += 7 * smoothstep(80, 0, Math.abs(a - 105)) * k * (1 - k) * 4;                // the north wall’s ledge halfway up (the south wall one sheer face)
  h += ridged(noise, x * 0.022 + (n ? 0 : 7), z * 0.022, 3) * 9 * 4 * k * (1 - k);         // crags and gullies down the walls
  const p = smoothstep(w1 - 20, w1 + 60, a);
  h += (fbm(noise, x * 0.007 + 11, z * 0.007, 3) * 6 + ridged(noise, x * 0.03, z * 0.03 + 5, 2) * 2) * p; // the plateau’s rolling stone
  for (const [hx, hz, hr, hh] of HILLS) { const d = Math.hypot(x - hx, z - hz); if (d < hr) h += hh * (0.5 + 0.5 * Math.cos(Math.PI * d / hr)); }
  for (const [dx, dz, dr, dd] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const d = Math.hypot(x - dx, z - dz); if (d < dr) h -= dd * smoothstep(dr, 0, d) ** 1.5; }
  for (const [bz, bh] of BASE_H) { const b = Math.hypot(x, z - bz); if (b < 40) h += (bh - h) * smoothstep(40, 22, b); } // (the bases’ level ground)
  return h;
}
BASE_H.push([BASE_Z, karst(0, BASE_Z)], [-BASE_Z, karst(0, -BASE_Z)]);
/** The roads’ segments graded straight between the karst’s heights at their corners, with their boxes. */
/** The road along each bank at the bottom (in the roads’ segments too, so the roads cut down the walls meet it level). */
const BANKS = [1, -1].map((s) => Array.from({ length: 51 }, (_, i) => { const x = -500 + i * 20; return s > 0 ? N(x, BANK) : S(x, BANK); }));
const SEGS = [...ROADS, ...BANKS].flatMap((r) => {
  const hs = r.map(([x, z]) => karst(x, z));
  return r.slice(1).map((b, i) => { const a = r[i]; return [a[0], a[1], b[0], b[1], hs[i], hs[i + 1], Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; });
});
function road(x: number, z: number, cap = 14) {
  let d = cap;
  for (const [ax, az, bx, bz, , , x0, x1, z0, z1] of SEGS) {
    if (x < x0 - d || x > x1 + d || z < z0 - d || z > z1 + d) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}
/** The roads’ bed at (x, z): how much it takes the ground (k) and its height there (the nearest leg’s; legs meet at corners at the same height). */
function bed(x: number, z: number, cap = 18) {
  let d = cap, h = 0;
  for (const [ax, az, bx, bz, ha, hb, x0, x1, z0, z1] of SEGS) {
    if (x < x0 - d || x > x1 + d || z < z0 - d || z > z1 + d) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const e = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (e < d) { d = e; h = ha + (hb - ha) * t; }
  }
  return { k: smoothstep(18, 7.5, d), h };
}
const roadDC = gridCache((x: number, z: number) => road(x, z, 30), EXT, 2);
const onBank = (x: number, z: number) => Math.abs(away(x, z) - BANK) < 3.4;
const bridgeRoad = (x: number, z: number) => [-BX, 0, BX].some((bx) => Math.abs(x - bx) < 4 && away(x, z) < BANK);
const onRoad = (x: number, z: number) => roadDC(x, z) < 4.2 || onBank(x, z) || bridgeRoad(x, z);
const roadNear = (x: number, z: number, r: number) => roadDC(x, z) < r || Math.abs(away(x, z) - BANK) < r;
{
  const r = mulberry32(191708);
  for (let i = 0; i < 600 && DOLINES.length < 80; i++) {
    const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 540, rad = 7 + r() * 10;
    if (away(x, z) < W1 + 40 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 45) || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || road(x, z, 30) < rad + 14) continue;
    DOLINES.push([x, z, rad, 2 + r() * 3]);
  }
}

// the dear parts sampled once onto grids, the gorge’s river carved after (as theLys): the karst, and the roads’ bed —
// its height read out to 26 m so the samples round a road’s edge all carry the road’s height, not 0
const karstC = gridCacheSmooth(karst, EXT, 3);
const bedK = gridCacheSmooth((x: number, z: number) => bed(x, z).k, EXT, 3);
const bedH = gridCacheSmooth((x: number, z: number) => bed(x, z, 26).h, EXT, 3);
function height(x: number, z: number) {
  let h = karstC(x, z);
  const k = bedK(x, z);
  if (k > 0) h += (bedH(x, z) - h) * k;
  return river.carve(x, z, h);
}

/** The caverns and gun galleries: in the upper walls facing across the gorge, and in the summits’ faces [x, z, yaw (0: the mouth looks south)]. */
const MOUTHS = [[-180, iso(-180) + 150, 0], [150, iso(150) + 146, 0], [420, iso(420) + 150, 0], [-120, 210, 0], [-20, 200, 0],
  [-230, iso(-230) - 150, Math.PI], [200, iso(200) - 150, Math.PI], [-440, iso(-440) - 146, Math.PI], [60, -205, Math.PI], [160, -210, Math.PI]];
/** The cableways: from the gorge’s floor by Canale up over the wall, and on up the summit (each side its own line). */
const CABLES = [[N(60, 40), N(70, 100), N(80, 160), [10, 255], [-48, 300]], [S(-60, 40), S(-70, 100), S(-80, 160), [10, -250], [80, -292]]];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'bainsizza',
  name: 'Bainsizza',
  description: 'August–September 1917, the Eleventh Battle of the Isonzo: the emerald river deep in its gorge with three bridges — Plava, Canale, Anhovo — and above its cavern-cut walls the stony karst of dolines, scrub and dry-stone walls, Monte Santo with its ruined monastery on one rim and Monte San Gabriele on the other.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (no runway on the karst: dolines, walls and the gorge — the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['it'], pact: ['ah'] }, // (the Italian Second Army against the Austro-Hungarian Isonzo Army: maps/index.js armiesOn)
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1700,
  segments: 720,
  bounds: { x: 500, z: 560 },
  steep: 0.55, // (wheels and horses keep to the roads cut down the gorge; men climb anywhere)
  overwatch: true,
  camera: { maxHeight: 600, far: 3200 },
  seed: 1917_0819,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191708, cell: 60, weights: [0.55, 0.1, 0.05, 0.3] as any }),

  theme: {
    // a hot, hazy August morning over the karst, the gorge in shadow
    fogColor: 0xbcbcb0, fogDensity: 0.0013, skyTop: 0x6a8cb0, skyHorizon: 0xd2d2c6, skyBottom: 0x8a8a7c,
    sunColor: 0xffe8c8, sunIntensity: 1.9, sunDisk: 0.3, clouds: 0.3, cloudLight: 0xf0eee8, cloudDark: 0x9aa0a4,
    sunDir: [0.45, 0.55, 0.35], hemiSky: 0xc4d0d8, hemiGround: 0x6a6046, hemiIntensity: 1.25, rimColor: 0xd8dade, rimIntensity: 0.25,
    terrain: {
      grass: '#68703e', grassAlt: '#5e6838', dryGrass: '#9c9058', dirt: '#7a5a3e', rock: '#b4b0a4', strip: '#5a4a36',
      pasture: '#6a7240', ploughed: '#7a5a40', stubble: '#ac9c60', meadow: '#6e7a40',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0xa49a84, 0.9];                                              // the white limestone roads and mule tracks
        const a = away(x, z);
        if (a < 24 && y < 2.4) return [0xccc6b4, 0.95];                                        // the Isonzo’s pale gravel
        if (a > W0 - 10 && a < W1 + 10) {
          const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
          if (g > 0.6) return [0xb2aea2, Math.min(1, (g - 0.6) * 3)];                         // the limestone walls
        }
        if (y > PLAT - 10) {
          for (const [dx, dz, dr] of DOLINES) if (Math.abs(x - dx) < dr && Math.abs(z - dz) < dr && Math.hypot(x - dx, z - dz) < dr * 0.55) return [0x8a4a2e, 0.6]; // terra rossa in the dolines
          const s = ridged(noise, x * 0.05 + 3, z * 0.05, 2);
          if (s > 0.55) return [0xb8b4a8, Math.min(0.85, (s - 0.55) * 4)];                    // bare limestone pavement
          const top = Math.max(0, ...[C0, I0].map(([hx, hz, hr]) => 1 - Math.hypot(x - hx, z - hz) / (hr * 0.45)));
          if (top > 0) return [0xaaa698, Math.min(0.8, top * 1.6)];                              // the summits shelled to bare stone
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

  /** Each side’s line along its rim over the gorge (wire down the lip, gaps where the roads come up), MG posts on the heights. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) { const X = x * s; pts.push([X, iso(X) + s * (W1 + 26 + (s > 0 ? 8 * Math.sin(X * 0.021) : 9 * Math.sin(X * 0.017 + 1)))]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 55 })) if (!roadNear(w.x, w.z, 10) && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 30)) works.push(w);
      for (const id of s > 0 ? ['B', 'C', 'D'] : ['H', 'I', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-12, 12]) if (!roadNear(p.x + dx, p.z - 16 * s, 8)) works.push({ kind: 'mgNest', x: p.x + dx, z: p.z - 16 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f }); }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const inDoline = (x: number, z: number) => DOLINES.some(([dx, dz, dr]) => Math.hypot(x - dx, z - dz) < dr + 3);
    const skip = (x: number, z: number) => away(x, z) < 20 || roadNear(x, z, 12) || bridgeRoad(x, z) || steepAt(x, z) > 0.3 || inDoline(x, z);

    // Canale: stone houses on both banks round the old bridge, the church on the north bank; sandbags at the bridge’s ends
    for (const m of [1, -1]) {
      const r = (props.rand = mulberry32(1917 + m));
      const placed: number[][] = [];
      for (let i = 0; i < 90 && placed.length < 16; i++) {
        const x = (r() - 0.5) * 220 + (m > 0 ? -10 : 15), z = iso(x) + m * (19 + r() * 32);
        if (skip(x, z) || roadNear(x, z, 13) || Math.abs(x) < 9 || Math.abs(x + 78) < 16 || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 12)) continue;
        placed.push([x, z]);
        props.townHouse({ x, z, yaw: r() * 0.2, width: 7 + r() * 2, depth: 7 + r() * 2, storeys: r() < 0.4 ? 3 : 2, damaged: 0.3 });
      }
      props.sandbagRing({ x: 10 * m, z: iso(10 * m) + 24 * m, radius: 4, toward: -m });
    }
    props.church({ x: -78, z: iso(-78) + 47, yaw: Math.PI / 2 });
    // Plava and Anhovo on their banks, Banjšice and the hamlets on the plateaux
    for (const id of ['E', 'G']) { const [x, z] = at(id); farmVillage(props, x, z, 5, 19171 + Math.round(x * 3 + z * 7), skip, 0.7); }
    for (const id of ['B', 'H', 'D', 'J']) { const [x, z] = at(id); farmVillage(props, x, z, id === 'H' ? 7 : 4, 19172 + Math.round(x * 3 + z * 7), skip, 1.1); }
    // the monastery on Monte Santo shot to a ruin, its bell tower a stump; a sangar ring and a chapel’s walls on San Gabriele
    props.rand = mulberry32(1917_24);
    props.ruinBlock({ x: C0[0] + 26, z: C0[1] + 10, yaw: 0.15, width: 24, depth: 13, storeys: 2, ruin: 0.6, name: 'monastery' });
    props.ruinBlock({ x: C0[0] + 8, z: C0[1] + 26, yaw: 0.15, width: 6, depth: 6, storeys: 4, ruin: 0.5, name: 'bell tower' });
    props.ruinBlock({ x: I0[0] - 24, z: I0[1] - 14, yaw: -0.3, width: 9, depth: 7, storeys: 1, ruin: 0.7, name: 'chapel' });
    for (const [cx, cz, s] of [[C0[0], C0[1], 1], [I0[0], I0[1], -1]]) {
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + s; props.lowWall({ x: cx + Math.cos(a) * 34, z: cz + Math.sin(a) * 34, yaw: -a + Math.PI / 2, length: 7, height: 1.2, color: 0xa8a498 }); }
    }
    // the caverns and the guns’ galleries: a timbered portal in the rock, the dark mouth, a lintel of stone, boulders round it
    for (const [x, z, yaw] of MOUTHS) {
      if (roadNear(x, z, 12)) continue;
      const y = terrain.heightAt(x, z), s = yaw ? 1 : -1;
      props.box('stone', x, y + 1.3, z, 5.4, 3.0, 1.4, yaw, 0x9e9a8e);
      props.box('plain', x, y + 1.0, z + 0.45 * s, 2.4, 2.1, 0.6, yaw, 0x0c0b0a);
      props.box('stone', x, y + 3.0, z - 1.4 * s, 7.0, 0.8, 4.0, yaw, 0x8e8a80);
      for (const dx of [-4.5, 4.5]) props.boulder({ x: x + dx, z: z + 1.5 * s, radius: 1.2 + props.rand() });
    }
    // the cableways: stations at the ends, timber pylons, the hauling ropes slung between
    for (const line of CABLES) {
      const tops = line.map(([x, z], i) => [x, terrain.heightAt(x, z) + (i === 0 || i === line.length - 1 ? 4 : 10), z]);
      line.forEach(([x, z], i) => {
        const g = terrain.heightAt(x, z), yaw = Math.atan2(line[Math.min(i + 1, line.length - 1)][0] - line[Math.max(i - 1, 0)][0], line[Math.min(i + 1, line.length - 1)][1] - line[Math.max(i - 1, 0)][1]);
        if (i === 0 || i === line.length - 1) { props.box('plain', x, g + 2, z, 5, 4, 6, yaw, 0x6a5840); props.box('plain', x, g + 4.2, z, 6, 0.4, 7, yaw, 0x4a3e30); return; }
        for (const sx of [-1.3, 1.3]) props.box('plain', x + Math.cos(yaw) * sx, g + 5, z - Math.sin(yaw) * sx, 0.4, 10, 0.4, yaw, 0x5a4a36);
        props.box('plain', x, g + 9.8, z, 3.4, 0.3, 0.4, yaw, 0x5a4a36);
      });
      for (let i = 0; i < tops.length - 1; i++) {
        const [ax, ay, az] = tops[i], [bx, by, bz] = tops[i + 1], hx = bx - ax, hz = bz - az, L = Math.hypot(hx, hz), yaw = Math.atan2(hx, hz), pitch = -Math.atan2(by - ay, L);
        for (const sx of [-1.2, 1.2]) props.box('metal', (ax + bx) / 2 + Math.cos(yaw) * sx, (ay + by) / 2 - 0.6, (az + bz) / 2 - Math.sin(yaw) * sx, 0.06, 0.06, Math.hypot(L, by - ay), yaw, 0x2a2826, pitch);
      }
    }
    // boats drawn up by the pontoons; supply dumps by the bridges
    props.rand = mulberry32(19173);
    for (const s of [1, -1]) for (const bx of [-BX, BX]) { props.logPile({ x: bx + 24, z: iso(bx + 24) + 23 * s, yaw: 0.1, length: 7 }); props.crates({ x: bx - 24, z: iso(bx - 24) + 24 * s, yaw: props.rand() * 3 }); }
    // dry-stone walls over the karst, limestone boulders, old sangars on the walls’ ledges (each half its own)
    const r = mulberry32(19174);
    for (let i = 0; i < 900; i++) {
      const x = (r() * 2 - 1) * 480, z = (i % 2 ? -1 : 1) * (W0 + r() * 500), big = r();
      if (nearPoint(x, z, 28) || roadNear(x, z, 9) || inDoline(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 42) continue;
      const a = away(x, z);
      if (a < W1 && steepAt(x, z) > 0.8) continue;
      if (big < 0.55 || a < W1) props.boulder({ x, z, radius: 0.8 + r() * 1.8 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 6 + r() * 8, height: 1.1, color: 0xaaa69a });
    }
    for (let i = 0, n = 0; i < 5000 && n < 40; i++) {
      const s = n % 2 ? -1 : 1, x = (r() * 2 - 1) * 470, z = iso(x) + s * (W1 + 40 + r() * 300);
      if (skip(x, z) || nearPoint(x, z, 45) || Math.hypot(x, Math.abs(z) - BASE_Z) < 50) continue;
      n++;
      buildSite(props, { kind: ['fieldwall', 'rocks', 'hay', 'fieldwall', 'farm'][n % 5], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);
    river.waterMesh?.material?.color?.setHex(0x1f7a6c);                               // the Isonzo’s emerald
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      ...MOUTHS.map(([x, z]) => ({ x, z, r: 8 })), { test: (x: number, z: number) => away(x, z) < 20 || roadNear(x, z, 8) || bridgeRoad(x, z) }];
    // scrub oak and hornbeam over the karst in patches, thicker on the walls’ ledges; the summits shot bare
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.008 + 40, z * 0.008, 3);
    const plateau = (x: number, z: number) => away(x, z) > W1 + 10 && Math.min(Math.hypot(x - C0[0], z - C0[1]), Math.hypot(x - I0[0], z - I0[1])) > 70;
    const tP = evenThreshold((x, z) => (plateau(x, z) ? wood0(x, z) : -9), 0.05, north);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 4200, broadleaf: 0.85, autumn: 0.1, maxY: 200,
      forest: (x: number, z: number) => {
        const a = away(x, z);
        if (a < 26) return 0;
        if (a < W1 + 10) return wood0(x, z) > 0 ? 0.35 : 0.1;                                      // scrub clinging to the walls
        if (!plateau(x, z)) return 0.02;
        return wood0(x, z) > (north(x, z) ? 0.05 : tP) ? 0.7 : 0.08;                                // the copses on the plateau
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.0, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
