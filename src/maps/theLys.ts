// The Lys, April 1918 (1918 only; the Western Front; the big field, 1.0 × 1.12 km). Operation Georgette: on 9 April,
// out of thick fog, the German Sixth Army breaks the thin line between Armentières and the La Bassée canal (the
// Portuguese sector at Laventie and Fleurbaix goes in hours), crosses the Lys at Estaires, Bac St Maur and Sailly, takes
// Merville on the 11th and drives across the flat, wet plain for the railway junction at Hazebrouck — beyond it the
// Channel ports. Haig’s “backs to the wall” order of the 11th; the line holds in front of the Forest of Nieppe, the
// Germans take Messines ridge on the 10th–11th and Mont Kemmel on the 25th, and the drive dies at the end of April.
// Mobile fighting again: breastworks and shallow scrapes (the water stands a spade’s depth down), outposts, machine-gun
// posts in the moated farms, drainage ditches and pollard willows everywhere, hop gardens with their bare poles.
// On the map: the canalised Lys winding across the middle with five bridges — Merville, Pont Riqueult, Estaires, Sailly,
// Bac St Maur — and the towns astride the three big ones; the La Bassée canal down the west flank (St-Venant bridge on the
// British half, Hinges bridge on the German) meeting the Lys at its junction basin; Hazebrouck’s railway behind the British
// base, the light railway behind the German; the Forest of Nieppe, Vieux-Berquin and Bailleul on the British side
// (south, +z), the Bois du Biez, Lestrem and Laventie on the German (north); Mont Kemmel at the east end.
// Not mirrored but fair: the Lys runs between the sides with its bridges at the same x on a course that passes through
// the same z at each, so every bridge town lies as far from both bases. Kemmel — the one real height — is answered on the
// German half by the Messines ridge (theirs from 10 April in the real battle): the same summit height and nearly the same
// area, a steep round cone against a long ridge lying at a slant, each with a wood on it (Kemmel’s summit wood;
// Wytschaete wood) and its point as far from its own base. Each side has one big named wood on its west (Nieppe; the Bois
// du Biez, the same area in another shape), its own bridge over the La Bassée canal at the same distance, its own
// airfield, a village off its roads (Vieux-Berquin; Lestrem), the same number of moated farms and hop gardens, and its own
// drainage ditches drawn from its own seed.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SEED = 1918_04;
const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(SEED);

// ---- the Lys across the middle (channel 0) and the La Bassée canal down the west flank (channel 1, straight and narrow)
const CANAL_X = -425;
const river = createRiver({
  paths: [
    [[-600, 34], [CANAL_X, 22], [-280, 0], [-140, -24], [0, 0], [140, 22], [280, 0], [420, -18], [600, -8]],
    [[CANAL_X, -640, 8], [CANAL_X, 640, 8]],
  ],
  halfWidth: 12, level: 0, depth: 3, valley: 42,
  crossings: [
    { name: 'Merville bridge', x: -280, z: 0, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Pont Riqueult', x: -140, z: -24, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Estaires bridge', x: 0, z: 0, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Sailly bridge', x: 140, z: 22, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Bac St Maur bridge', x: 280, z: 0, kind: 'bridge', width: 9, channel: 0 },
    { name: 'St-Venant bridge', x: CANAL_X, z: 250, kind: 'bridge', width: 8, channel: 1 },
    { name: 'Hinges bridge', x: CANAL_X, z: -250, kind: 'bridge', width: 8, channel: 1 },
  ],
});
const wet = (x: number, z: number, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

// ---- the points
const P = { B: [-290, 300], C: [-20, 290], D: [335, 325], E: [-280, 0], F: [0, 0], G: [280, 0], H: [-290, -300], I: [-95, -310], J: [335, -325] };
const points: ControlPointDef[] = [
  { id: 'A', name: 'Hazebrouck', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Forest of Nieppe', x: P.B[0], z: P.B[1], owner: null, sector: 'west' },
  { id: 'C', name: 'Bailleul', x: P.C[0], z: P.C[1], owner: null, sector: 'centre' },
  { id: 'D', name: 'Mont Kemmel', x: P.D[0], z: P.D[1], owner: null, sector: 'east', radius: 28 },
  { id: 'E', name: 'Merville', x: P.E[0], z: P.E[1], owner: null, sector: 'west', radius: 28 },
  { id: 'F', name: 'Estaires', x: P.F[0], z: P.F[1], owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Bac St Maur', x: P.G[0], z: P.G[1], owner: null, sector: 'east', radius: 28 },
  { id: 'H', name: 'Bois du Biez', x: P.H[0], z: P.H[1], owner: null, sector: 'west' },
  { id: 'I', name: 'Laventie', x: P.I[0], z: P.I[1], owner: null, sector: 'centre' },
  { id: 'J', name: 'Messines Ridge', x: P.J[0], z: P.J[1], owner: null, sector: 'east', radius: 28 },
  { id: 'K', name: 'Fleurbaix', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the heights: Kemmel a steep round cone, Messines a long ridge at a slant (same summit, nearly the same area)
const KEM = { x: 345, z: 335, r: 122, h: 21 };
const MES = { x: 340, z: -335, rx: 175, rz: 86, rot: 0.55, h: 21 };
const mesQ = (x: number, z: number) => {
  const dx = x - MES.x, dz = z - MES.z, c = Math.cos(MES.rot), s = Math.sin(MES.rot);
  return Math.hypot((dx * c - dz * s) / MES.rx, (dx * s + dz * c) / MES.rz);
};

// ---- each side's airfield behind its west flank (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat and kept clear
const AIR = [{ faction: 'nato', x: -180, z: 415, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -180, z: -415, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => {
  let d = Infinity;
  for (const a of AIR) d = Math.min(d, Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52)));
  return d;
};

/** Distance to the nearest segment of `polys` ([[x, z], …] each), capped at `cap`: segments bucketed on a 32 m grid, so a far one costs nothing. */
function segField(polys: number[][][], cap: number) {
  const C = 32, grid = new Map<number, number[][]>(), key = (i: number, j: number) => i * 4096 + j;
  for (const poly of polys) for (let k = 0; k < poly.length - 1; k++) {
    const [ax, az] = poly[k], [bx, bz] = poly[k + 1], seg = [ax, az, bx, bz];
    for (let i = Math.floor((Math.min(ax, bx) - cap) / C); i <= Math.floor((Math.max(ax, bx) + cap) / C); i++)
      for (let j = Math.floor((Math.min(az, bz) - cap) / C); j <= Math.floor((Math.max(az, bz) + cap) / C); j++) {
        const g = grid.get(key(i, j)); if (g) g.push(seg); else grid.set(key(i, j), [seg]);
      }
  }
  return (x: number, z: number) => {
    const segs = grid.get(key(Math.floor(x / C), Math.floor(z / C)));
    let best = cap * cap;
    if (segs) for (const [ax, az, bx, bz] of segs) {
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), ex = x - ax - dx * t, ez = z - az - dz * t;
      best = Math.min(best, ex * ex + ez * ez);
    }
    return Math.sqrt(best);
  };
}

// ---- the roads: Hazebrouck – Vieux-Berquin – Estaires – Laventie – Fleurbaix down the middle, the Merville road on the west,
// the Bailleul road to Bac St Maur on the east, a road along each bank of the Lys, the lanes between the villages (pavé)
const VB = [-115, 225], LE = [-150, -215];   // Vieux-Berquin, Lestrem (villages without a point)
const ROADS = [
  [[0, 580], [0, 470], [-30, 380], [-90, 260], [-40, 110], [0, 36]],                          // Hazebrouck – Estaires
  [[0, -36], [30, -120], [-20, -230], P.I, [-30, -380], [0, -470], [0, -580]],                 // Estaires – Laventie – Fleurbaix
  [[-30, 380], [-180, 362], P.B, [-300, 150], [-280, 36]],                                     // the Merville road
  [[-30, -380], [-180, -362], P.H, [-290, -150], [-280, -36]],
  [[0, 470], [40, 390], P.C, [170, 160], [280, 36]],                                           // the Bailleul road to Bac St Maur
  [[280, -36], [300, -150], P.J, [160, -420], [0, -470]],
  [P.C, [200, 330], P.D], [P.D, [335, 170], [280, 36]],                                         // Kemmel lanes
  [P.I, [140, -160], [140, -12]],
  [P.B, [-110, 320], P.C], [P.H, [-170, -290], P.I], [P.I, [140, -320], P.J],                   // the lanes behind each line
  [[-500, 48], [-280, 36], [-140, 14], [0, 36], [140, 52], [280, 36], [500, 32]],               // the British bank road
  [[-500, -36], [-280, -36], [-140, -54], [0, -36], [140, -12], [280, -36], [500, -42]],         // the German bank road
  [[-140, 14], [-140, -54]], [[140, 52], [140, -12]], [[-280, 36], [-280, -36]], [[0, 36], [0, -36]], [[280, 36], [280, -36]], // over the bridges
  [[-300, 580], [-335, 450], P.B], [[300, 580], [295, 440], P.D],                               // in from the base entries
  [[-300, -580], [-335, -450], P.H], [[300, -580], [295, -440], P.J],
  [[CANAL_X - 70, 250], [CANAL_X, 250], [-330, 268], P.B], [[CANAL_X - 70, -250], [CANAL_X, -250], [-330, -268], P.H], // over the canal
];
const roadD = gridCache(segField(ROADS, 60), { x: 520, z: 580 }, 2);

// ---- the railways: Hazebrouck’s main line behind the British base, the German light railway behind theirs
const RAIL_Z = 530;
const railD = (x: number, z: number) => Math.abs(Math.abs(z) - RAIL_Z);

// ---- the named woods: the Forest of Nieppe and the Bois du Biez (same area, other shapes); Kemmel’s summit wood and Wytschaete wood
const ell = (x: number, z: number, cx: number, cz: number, rx: number, rz: number) => Math.hypot((x - cx) / rx, (z - cz) / rz);
const NIEPPE = (x: number, z: number) => ell(x, z, -300, 285, 108, 68);
const BIEZ = (x: number, z: number) => ell(x, z, -300, -282, 80, 92);
const KWOOD = (x: number, z: number) => ell(x, z, 372, 360, 62, 58);
const WWOOD = (x: number, z: number) => ell(x, z, 270, -380, 74, 49);
const namedWood = (x: number, z: number) => {
  const j = fbm(noise, x * 0.02 + 9, z * 0.02 - 4, 2) * 0.12;
  return smoothstep(1.02, 0.85, Math.min(NIEPPE(x, z), BIEZ(x, z), KWOOD(x, z), WWOOD(x, z)) + j);
};

// ---- the drainage ditches: straight cuts along the field edges, each half from its own seed
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
const DITCHES: number[][][] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 4101 : 4177);
  for (let i = 0, n = 0; i < 600 && n < 46; i++) {
    const x = (r() * 2 - 1) * 470, z = s * (45 + r() * 470);
    const a = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.4 + (s > 0 ? 0.12 : -0.2), L = 50 + r() * 110;
    const seg = [[x, z], [x + Math.cos(a) * L, z + Math.sin(a) * L]];
    const ok = [0, 0.25, 0.5, 0.75, 1].every((t) => {
      const px = seg[0][0] + (seg[1][0] - seg[0][0]) * t, pz = seg[0][1] + (seg[1][1] - seg[0][1]) * t;
      return Math.abs(px) < 485 && Math.abs(pz) < 520 && Math.sign(pz) === s && !nearPt(px, pz, 40) && airD(px, pz) > 15
        && Math.hypot(px, Math.abs(pz) - BASE_Z) > 60 && namedWood(px, pz) < 0.2 && railD(px, pz) > 12;
    });
    if (ok) { DITCHES.push(seg); n++; }
  }
}
const ditchD = gridCacheSmooth(segField(DITCHES, 30), { x: 520, z: 580 }, 2);

// ---- the moated farms and the hop gardens: the same number on each half, each half from its own seed
const MOAT_S = 15;
const clearSpot = (x: number, z: number, r: number) => !nearPt(x, z, 60 + r) && roadD(x, z) > 14 + r && !wet(x, z, 40 + r) && namedWood(x, z) < 0.05
  && airD(x, z) > 20 + r && Math.hypot(x, Math.abs(z) - BASE_Z) > 60 + r && Math.hypot(x - KEM.x, z - KEM.z) > 160 && mesQ(x, z) > 1.2
  && railD(x, z) > 20 + r && Math.abs(x) < 450 && Math.abs(x - CANAL_X) > 40 + r && Math.abs(z) < 500;
const MOATS: { x: number; z: number; yaw: number }[] = [], HOPS: { x: number; z: number; yaw: number }[] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 5011 : 5077);
  for (let i = 0, n = 0, h = 0; i < 4000 && (n < 7 || h < 4); i++) {
    const x = (r() * 2 - 1) * 440, z = s * (60 + r() * 420), yaw = (r() - 0.5) * 0.6, hop = n >= 7;
    if (!clearSpot(x, z, hop ? 26 : 20) || [...MOATS, ...HOPS].some((m) => Math.hypot(m.x - x, m.z - z) < 90)) continue;
    if (hop) { HOPS.push({ x, z, yaw }); h++; } else { MOATS.push({ x, z, yaw }); n++; }
  }
}
const local = (o: { x: number; z: number; yaw: number }, x: number, z: number) => {
  const dx = x - o.x, dz = z - o.z, c = Math.cos(o.yaw), s = Math.sin(o.yaw);
  return [dx * c - dz * s, dx * s + dz * c];
};
/** How deep the moat ring is at (x, z) (0..1), the causeway gap on the farm's front. */
const moatK = (x: number, z: number) => {
  let k = 0;
  for (const m of MOATS) {
    if (Math.abs(x - m.x) > 26 || Math.abs(z - m.z) > 26) continue;
    const [lx, lz] = local(m, x, z);
    if (lz > 0 && Math.abs(lx) < 3.5) continue;
    k = Math.max(k, smoothstep(2.4, 1.2, Math.abs(Math.max(Math.abs(lx), Math.abs(lz)) - MOAT_S)));
  }
  return k;
};
const hopAt = (x: number, z: number) => HOPS.some((h) => { const [lx, lz] = local(h, x, z); return Math.abs(lx) < 23 && Math.abs(lz) < 17; });

// ---- the ground: the flat, wet Lys plain, a metre or two of rise and fall, Kemmel and the Messines ridge at the east end
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 2.4 + fbm(noise, x * 0.003, z * 0.003, 4) * 1.6 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.3;
  h += KEM.h * Math.max(0, 1 - Math.hypot(x - KEM.x, z - KEM.z) / KEM.r) ** 1.5;
  h += MES.h * Math.max(0, 1 - mesQ(x, z)) ** 1.5;
  h += smoothstep(480, 620, Math.abs(x)) * 12 + smoothstep(545, 680, Math.abs(z)) * 10;   // (the rims beyond the edges)
  for (const p of points) h += (h * 0.5 + 1.6 - h) * smoothstep(40, 22, Math.hypot(x - p.x, z - p.z)) * (p.id === 'D' || p.id === 'J' ? 0.12 : 0.5);
  for (const bz of [BASE_Z, -BASE_Z]) h += (3 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (3 - h) * smoothstep(30, 6, airD(x, z));
  h -= 0.85 * Math.exp(-((ditchD(x, z) / 1.7) ** 2)) * smoothstep(4, 9, roadD(x, z));    // the ditches (culverts under the roads)
  h -= 1.5 * moatK(x, z);
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.3, ground(x, z)));

// ---- copses over the plain: each half its own, cut to the same wooded area
const wn = (x: number, z: number) => fbm(noise, x * 0.008 + 70, z * 0.008, 3);
const T_N = 0.46, T_P = evenThreshold(wn, T_N, (x: number, z: number) => z > 0);
const woodField = gridCache((x: number, z: number) => {
  if (wet(x, z, 5)) return 0;
  let k = namedWood(x, z);
  if (wn(x, z) > (z > 0 ? T_N : T_P) && Math.abs(Math.abs(z) - BASE_Z) > 60 && Math.abs(z) > 70) k = Math.max(k, 0.7);
  if (airD(x, z) < 20 || moatK(x, z) > 0 || hopAt(x, z) || railD(x, z) < 8) k = 0;
  return k;
}, { x: 520, z: 580 }, 4);

// ---- the breastworks: each side's line of sandbagged scrapes across its front (the water stands too high to dig deep)
const pitZ = (x: number, f: 'nato' | 'pact') => (f === 'nato' ? 150 + 20 * Math.sin(x * 0.012 + 1) : -152 - 18 * Math.sin(x * 0.011 + 4));

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon, 2nd Royal Scots Fusiliers' }];

export default {
  id: 'the-lys',
  name: 'The Lys',
  description: 'April 1918, Operation Georgette: the German drive across the flat, wet Lys plain for Hazebrouck’s railway junction and the Channel ports — the Lys and its bridge towns Merville and Estaires, the La Bassée canal, the Forest of Nieppe, Bailleul and Mont Kemmel against the Messines ridge. Moated farms, hop gardens and drainage ditches everywhere; breastworks and machine-gun posts, not deep trenches.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['uk'], pact: ['de', 'st'] }, // (the British First and Second Armies against the German Sixth and Fourth Armies and their storm battalions)
  sides: { nato: 'Britain', pact: 'Germany' },
  conditions: { time: 'day', weather: 'overcast' },  // (a grey, damp April; the morning fog of 9 April left to the weather setting)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 72, weights: [0.32, 0.34, 0.08, 0.26] as any }),   // (April: pasture and fresh plough)
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a grey, damp April over Flanders
    fogColor: 0xa2a6a4, fogDensity: 0.0015, skyTop: 0x6c747c, skyHorizon: 0xb6b8b2, skyBottom: 0x686a64,
    sunColor: 0xe2dccc, sunIntensity: 1.45, sunDisk: 0.08, clouds: 0.85, cloudLight: 0xc4c6c2, cloudDark: 0x6c727a,
    sunDir: [-0.4, 0.5, -0.75], hemiSky: 0xc0c6cc, hemiGround: 0x4a4636, hemiIntensity: 1.25, rimColor: 0xbcc4cc, rimIntensity: 0.25,
    terrain: {
      grass: '#56643a', grassAlt: '#4c5a34', dryGrass: '#7a7650', dirt: '#56483a', rock: '#7e7a6e', strip: '#4a3e30',
      pasture: '#56653a', ploughed: '#6a5c4a', stubble: '#867a54', meadow: '#5e6a3e',
      farmX: [460, 600], farmZ: [520, 640], roads: [-300, 0, 300], roadZ: 560,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.2) return [0x7c776a, 0.85];                                          // pavé
        if (rd < 5) return [0x6e6656, 0.3];
        if (railD(x, z) < 2.2 && Math.abs(x) < 500) return [0x4a443c, 0.8];             // ballast
        if (y < 1.5 && wet(x, z, 10)) return [0x5e5646, 0.7];                            // the muddy banks
        if (moatK(x, z) > 0.3) return [0x3a4034, 0.85];
        if (ditchD(x, z) < 1.8) return [0x3e4434, 0.6];
        if (hopAt(x, z)) return [0x5a4a38, 0.6];                                         // the hop gardens’ bare soil
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Reserve-Infanterie-Regiment 92' })),
  },

  /** Breastworks in pairs along each front, machine-gun posts in the forward moated farms, a little wire; light shelling. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const r = mulberry32(f === 'nato' ? 71 : 79), yaw = f === 'nato' ? Math.PI : 0, s = f === 'nato' ? 1 : -1;
      for (let x = -400 + r() * 20; x < 470; x += 36 + r() * 24) {
        const z = pitZ(x, f) + (r() - 0.5) * 14;
        if (woodField(x, z) > 0.3 || roadD(x, z) < 8 || nearPt(x, z, 30) || wet(x, z, 18) || moatK(x, z) > 0 || ditchD(x, z) < 4 || hopAt(x, z)) continue;
        const n = 1 + Math.floor(r() * 2.5);
        for (let k = 0; k < n; k++) works.push({ kind: 'trench', x: x + k * 8.6, z: z + (r() - 0.5) * 2, yaw, faction: f });
        if (r() < 0.2) works.push({ kind: 'mgNest', x: x + 4, z: z - 8 * s, yaw, faction: f });
        else if (r() < 0.35) works.push({ kind: 'wire', x: x + 4, z: z - 18 * s, yaw, faction: f });
      }
      for (const m of MOATS) if (Math.sign(m.z) === s && Math.abs(m.z) < 320) works.push({ kind: 'mgNest', x: m.x, z: m.z - 9 * s, yaw, faction: f });
    }
    const dens = (x: number, z: number) => 0.05 + (Math.abs(z) < 200 ? 0.3 : 0) + (nearPt(x, z, 60) ? 0.2 : 0);
    const blasts = [...shellField(1941, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(1942, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter((b) => !wet(b[0], b[1], 10) && roadD(b[0], b[1]) > 5 && moatK(b[0], b[1]) === 0 && airD(b[0], b[1]) > 10);
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + 1918)() < (Math.abs(b.z) < 120 ? 0.45 : Math.abs(b.z) < 340 ? 0.2 : 0.08)).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const pitBand = (x: number, z: number) => Math.abs(z - pitZ(x, z > 0 ? 'nato' : 'pact')) < 20;
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || pitBand(x, z) || airD(x, z) < 25 || moatK(x, z) > 0 || ditchD(x, z) < 4 || hopAt(x, z) || railD(x, z) < 10;

    // the villages: Bailleul and Laventie big with their churches, Kemmel and Messines on their heights, Vieux-Berquin and Lestrem
    for (const [x, z, n, sp, sd] of [[P.C[0], P.C[1], 11, 1.45, 1], [P.I[0], P.I[1], 11, 1.45, 2], [P.D[0] - 30, P.D[1] - 20, 6, 1.1, 3], [P.J[0] - 25, P.J[1] + 25, 6, 1.1, 4],
      [VB[0], VB[1], 8, 1.2, 5], [LE[0], LE[1], 8, 1.2, 6]]) {
      farmVillage(props, x, z, n, SEED * 10 + sd, skip, sp);
    }
    props.rand = mulberry32(1951);
    for (const [x, z, yaw] of [[P.C[0] + 30, P.C[1] + 26, 0.2], [P.I[0] - 28, P.I[1] - 28, Math.PI + 0.3], [P.D[0] - 48, P.D[1] - 2, 0.4], [P.J[0] - 4, P.J[1] + 46, Math.PI - 0.5], [VB[0] + 24, VB[1] - 22, 0.1], [LE[0] - 22, LE[1] + 20, Math.PI]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }
    // the foresters’ lodges in the two woods
    props.house({ x: P.B[0] + 20, z: P.B[1] - 16, yaw: 0.3, width: 9, depth: 7 });
    props.house({ x: P.H[0] - 20, z: P.H[1] + 16, yaw: Math.PI + 0.5, width: 9, depth: 7 });

    // the bridge towns astride the Lys: brick houses along the bank roads and the bridge streets, a church on each
    props.rand = mulberry32(1952);
    for (const [cx, n] of [[P.E[0], 1], [P.F[0], 2], [P.G[0], 3]]) {
      for (let z = -92; z <= 92; z += 12) for (let x = cx - 72; x <= cx + 72; x += 13) {
        const hx = x + (props.rand() - 0.5) * 4, hz = z + (props.rand() - 0.5) * 4;
        if (wet(hx, hz, 7) || roadD(hx, hz) < 6.5 || Math.hypot(hx - cx, hz) < 16 || Math.hypot(hx - cx, hz) > 95 || props.rand() < 0.3 || ditchD(hx, hz) < 4) continue;
        props.townHouse({ x: hx, z: hz, yaw: Math.PI / 2 * (props.rand() < 0.5 ? 1 : -1), width: 7 + props.rand() * 3, depth: 8, storeys: props.rand() < 0.5 ? 2 : 1, name: 'house', damaged: 0.15 });
      }
      for (const [x, z, yaw] of [[cx + 44 * (n === 2 ? -1 : 1), 66, 0], [cx - 44 * (n === 2 ? -1 : 1), -66, Math.PI]]) if (!skip(x, z)) props.church({ x, z, yaw });
    }

    // the moated farms: house and barn on their island, the yard wall, the moat’s still water, the causeway at the front
    for (const m of MOATS) {
      const L = (lx: number, lz: number) => [m.x + lx * Math.cos(m.yaw) + lz * Math.sin(m.yaw), m.z - lx * Math.sin(m.yaw) + lz * Math.cos(m.yaw)];
      const [hx, hz] = L(-3, -4), [bx, bz] = L(6, 5), [wx, wz] = L(-8, 7);
      props.house({ x: hx, z: hz, yaw: m.yaw, width: 10, depth: 7 });
      props.house({ x: bx, z: bz, yaw: m.yaw + Math.PI / 2, width: 9, depth: 6 });
      props.lowWall({ x: wx, z: wz, yaw: m.yaw, length: 8, height: 1.4 });
      const g = terrain.heightAt(m.x, m.z), lvl = g - 0.75;
      for (const [lx, lz, sx, sz] of [[0, -MOAT_S, 31, 2.6], [-MOAT_S, 0, 2.6, 31], [MOAT_S, 0, 2.6, 31], [-9.8, MOAT_S, 11, 2.6], [9.8, MOAT_S, 11, 2.6]]) {
        const [x, z] = L(lx, lz);
        props.box('plain', x, lvl, z, sx, 0.08, sz, m.yaw, 0x3c4a46);
      }
    }
    // the hop gardens: rows of tall bare poles, the wires along their tops (April: the bines not yet up)
    for (const h of HOPS) {
      const L = (lx: number, lz: number) => [h.x + lx * Math.cos(h.yaw) + lz * Math.sin(h.yaw), h.z - lx * Math.sin(h.yaw) + lz * Math.cos(h.yaw)];
      for (let lz = -15; lz <= 15; lz += 5) {
        for (let lx = -20; lx <= 20; lx += 5) { const [x, z] = L(lx, lz); props.box('plain', x, terrain.heightAt(x, z) + 2.8, z, 0.14, 5.6, 0.14, h.yaw, 0x5a4c3a); }
        const [x, z] = L(0, lz);
        props.box('plain', x, terrain.heightAt(x, z) + 5.5, z, 40, 0.03, 0.03, h.yaw, 0x4a4a46);
      }
    }
    // the railways: the main line through Hazebrouck (a station, wagons on the sidings), the German light railway
    for (const s of [1, -1]) {
      props.rails({ x0: -500, z0: s * RAIL_Z, x1: 500, z1: s * RAIL_Z });
      for (const x of s > 0 ? [-120, -104, 90, 106] : [-80, -66, 120]) props.wagon({ x, z: s * RAIL_Z, yaw: Math.PI / 2, color: s > 0 ? 0x5a3426 : 0x4a4a3e });
    }
    props.townHouse({ x: 40, z: RAIL_Z - 14, yaw: Math.PI, width: 14, depth: 8, storeys: 2, name: 'Hazebrouck station' });
    props.house({ x: -40, z: -RAIL_Z + 12, yaw: 0, width: 8, depth: 6 });

    // field walls, hay and farmsteads over the plain (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay'];
    for (let tries = 0, n = 0; n < 110 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (woodField(x, z) > 0.3 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPt(x, z, 50) || skip(x, z) || x < CANAL_X + 20) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 4.5 || airD(x, z) < 12 || moatK(x, z) > 0 || hopAt(x, z) || railD(x, z) < 5 || ditchD(x, z) < 1.6 }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 5200, hedges: 1500, autumn: 0.0, broadleaf: 0.85,
      noHedge: (x: number, z: number) => ditchD(x, z) < 3 || x < CANAL_X + 12,
      forest: (x: number, z: number) => {
        if (wet(x, z, 4)) return -1;
        const k = woodField(x, z);
        if (k > 0.5) return pitBand(x, z) ? 0.2 : 0.85;
        if (ditchD(x, z) < 4 && roadD(x, z) > 8) return 0.12;   // the pollard willows along the ditches
        return 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
