// The Neckar before Stuttgart, a hypothetical autumn 1805: had Mack’s Austrians come west out of Ulm instead of
// sitting there, the road to the Rhine ran down the Fils and the Neckar past Esslingen to Cannstatt and Stuttgart,
// the Württemberg capital, with the dark fir heights of the Black Forest’s outliers behind it — and the French corps
// marching east from the Rhine would have met them in the Neckar valley under the vineyards.
// On the map (1.0 × 1.12 km): the French come over the heights from Feuerbach in the north (+z), the Austrians over
// the Filder from Esslingen in the south (−z). The Neckar runs down the east flank, Untertürkheim’s
// ford, the old stone bridge at Cannstatt and Berg’s ford over it, walled Cannstatt on the far bank under the
// Kappelberg and the Rotenberg with the old Wirtemberg castle over Untertürkheim, its vines down to the water. West of
// the river Stuttgart lies in its Kessel: the basin ringed by vine and fir slopes — the Kriegsberg’s vineyards north,
// the Hasenberg and Birkenkopf west, the Bopser and the Filder edge south — open only to the north-east, where the
// Nesenbach runs out past the Rosenstein to the Neckar at Berg; the Stiftskirche and the Residenz in the town.
// Fair, not mirrored, by distance: the bases stand on their own roads, both up on the plateau beyond the ring; Stuttgart in its basin and Cannstatt with its bridge are as far from both; each side has a height on
// the ring (the Hasenberg, the Bopser), a vine hill (the Kriegsberg, the Rotenberg) and a river village with its ford
// (Berg, Untertürkheim), each as far from its own base as its counterpart (tools/map_fairness.py); the ring’s top
// heights are shared between the halves.
// 1806 only (`epochs`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 470;
const NATO = { x: -100, z: BASE_Z }, PACT = { x: 20, z: -BASE_Z };
const noise = createNoise2D(1805_1010);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
/** A hill stretched along `a` (a ridge): radii rx along, rz across. */
const ridge = (x, z, cx, cz, rx, rz, a, amp) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return amp * Math.exp(-(u * u + v * v));
};

// the Neckar down the east flank, from Esslingen (−z, upstream) past Untertürkheim, Cannstatt and Berg (+z)
const NECKAR = [[300, -720], [318, -420], [345, -200], [338, 0], [322, 180], [340, 400], [318, 720]];
/** The Neckar’s line x(z) (plain interpolation of the course: cheap enough for the height). */
const neckarX = (z) => {
  for (let i = 1; i < NECKAR.length; i++) {
    const [x0, z0] = NECKAR[i - 1], [x1, z1] = NECKAR[i];
    if (z <= z1) return x0 + ((x1 - x0) * (z - z0)) / (z1 - z0);
  }
  return NECKAR[NECKAR.length - 1][0];
};
const river = createRiver({
  paths: [NECKAR],
  halfWidth: 17,
  level: 0,
  depth: 3,
  valley: 60,
  crossings: [
    { name: 'Berg ford', x: neckarX(330), z: 330, kind: 'ford', width: 12 },
    { name: 'Cannstatt bridge', x: neckarX(120), z: 120, kind: 'bridge', width: 8 },
    { name: 'Untertürkheim ford', x: neckarX(-170), z: -170, kind: 'ford', width: 12 },
  ],
});
const nearWater = (x, z, r) => { const I = river.project(x, z); return I.d < I.hw + r; };   // (props only: never in the height)

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Stuttgart road', x: NATO.x, z: NATO.z, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bopser', x: -175, z: -230, owner: null, sector: 'west' },
  { id: 'C', name: 'Stuttgart', x: -150, z: -20, owner: null, sector: 'centre', radius: 30 },
  { id: 'D', name: 'Kriegsberg', x: 20, z: 190, owner: null, sector: 'centre' },
  { id: 'E', name: 'Berg', x: 262, z: 330, owner: null, sector: 'east' },
  { id: 'F', name: 'Cannstatt bridge', x: Math.round(neckarX(120)) - 34, z: 120, owner: null, sector: 'east', radius: 24 },
  { id: 'G', name: 'Untertürkheim', x: 272, z: -160, owner: null, sector: 'east' },
  { id: 'H', name: 'Hasenberg', x: -400, z: 170, owner: null, sector: 'west' },
  { id: 'I', name: 'Cannstatt', x: 430, z: 60, owner: null, sector: 'east', radius: 30 },
  { id: 'J', name: 'Rotenberg', x: 440, z: -330, owner: null, sector: 'east' },
  { id: 'K', name: 'Esslingen road', x: PACT.x, z: PACT.z, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const TOWNS = [{ ...P.C, rx: 105, rz: 90 }, { ...P.I, rx: 58, rz: 80 }];
const [T0, T1] = TOWNS;
const townQ = (x, z) => Math.min(Math.hypot((x - T0.x) / T0.rx, (z - T0.z) / T0.rz), Math.hypot((x - T1.x) / T1.rx, (z - T1.z) / T1.rz));

/** The Stuttgarter Kessel: the basin round the town, ringed by its heights and open north-east down the Nesenbach to the Neckar. */
const KES = { x: -150, z: -40, rx: 250, rz: 270 };
const OPEN = Math.atan2(150, 420);                                                 // (the opening’s bearing: toward Cannstatt and Berg)
/** The ring’s height above the floor by bearing: the Bopser and the Filder edge high in the south, the Hasenberg and
 *  Birkenkopf west, the Kriegsberg lower in the north, nothing where the basin opens. */
const rimH = (a) => {
  const d = Math.atan2(Math.sin(a - OPEN), Math.cos(a - OPEN));
  return (54 - 2 * Math.sin(a) + 6 * Math.sin(3 * a)) * (1 - 0.9 * Math.exp(-((d / 0.55) ** 2)));
};
const kesQ = (x, z) => Math.hypot((x - KES.x) / KES.rx, (z - KES.z) / KES.rz);

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the dark fir woods on the Bopser and the Hasenberg and out on the heights west, a copse on the Kappelberg over Cannstatt
const WOODS = [[-200, -400, 160, 90, 0.2], [-420, 120, 80, 150, 0.3], [-450, -200, 70, 160, 0], [460, 330, 50, 80, 0]];

/** The ground before the towns, vines and woods (sampled once: `ground`). */
function groundExact(x, z) {
  let h = fbm(noise, x * 0.0028, z * 0.0028, 3) * 3 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.45 + 10;
  const q = kesQ(x, z), a = Math.atan2(z - KES.z, x - KES.x), rh = rimH(a);
  h += rh * smoothstep(0.5, 1.0, q) * (1 - 0.5 * smoothstep(1.05, 1.7, q));          // the basin, its ring of heights and the plateau beyond
  h += fbm(noise, x * 0.009 - 3, z * 0.009 + 17, 3) * 6 * smoothstep(0.7, 1.1, q);   // (spurs and Klingen down the ring)
  const nx = neckarX(z);
  h -= (h - 6) * smoothstep(nx - 250, nx - 70, x);                                   // down into the Neckar valley
  h += smoothstep(nx + 40, nx + 160, x) * 24;                                         // the east bank rising
  h += hill(x, z, P.J.x + 20, P.J.z - 20, 95, 26);                                   // the Rotenberg, its vines down to the river
  h += ridge(x, z, 470, 320, 60, 120, 1.3, 22);                                      // the Kappelberg over Cannstatt
  h += ridge(x, z, P.D.x, P.D.z + 10, 110, 60, 0.35, 8);                             // the Kriegsberg’s shoulder, its vines down into the town
  h += hill(x, z, P.B.x, P.B.z, 70, 3) + hill(x, z, P.H.x - 20, P.H.z - 30, 90, 26);  // the Bopser’s top, the Hasenberg and Birkenkopf
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 20 + smoothstep(BOUNDS.x - 20, BOUNDS.x + 160, -x) * 10;
  return h;
}
const land = gridCacheSmooth(groundExact, { x: 520, z: 580 }, 4);

function height(x, z) {
  let h = land(x, z);
  const town = smoothstep(1.2, 0.85, townQ(x, z));
  if (town > 0) h += (Math.min(h, x > 300 ? 6 : 13) - h) * town * 0.7;               // the two towns on their level ground
  for (const p of POINTS) if ('AKCIEFG'.includes(p.id)) h += (h * 0.6 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.5;
  return river.carve(x, z, Math.max(1.6, h));
}

// the vineyards: on the Kriegsberg and the ring’s sunny slopes on the French half, on the Rotenberg and the slopes over
// Untertürkheim on the Austrian — the same number on each half, each from its own seed
const VINES: { x: number; z: number; yaw: number }[] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 1805_31 : 1805_57), hx = s > 0 ? P.D.x : P.J.x - 40, hz = s > 0 ? P.D.z : P.J.z + 40;
  for (let i = 0, n = 0; i < 8000 && n < 9; i++) {
    const nearHill = n < 5, x = nearHill ? hx + (r() - 0.5) * 260 : (r() * 2 - 1) * 450, z = nearHill ? hz + (r() - 0.5) * 220 : s * (60 + r() * 380);
    const yaw = (r() - 0.5) * 0.3;
    if (Math.abs(x) > 460 || Math.abs(z) > 500 || (s > 0 ? z < 20 : z > -20) || POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 60) || VINES.some((v) => Math.hypot(v.x - x, v.z - z) < 70) || townQ(x, z) < 1.4
      || Math.abs(x - neckarX(z)) < 70 || WOODS.some(([cx, cz, rx, rz]) => Math.hypot((x - cx) / rx, (z - cz) / rz) < 1.3) || kesQ(x, z) < 0.6) continue;
    VINES.push({ x, z, yaw }); n++;
  }
}
const vineAt = (x, z, m = 0) => VINES.some((v) => {
  const dx = x - v.x, dz = z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
  return Math.abs(dx * c - dz * s) < 22 + m && Math.abs(dx * s + dz * c) < 16 + m;
});

const woods = gridCache((x, z) => {
  let k = smoothstep(0.56, 0.7, fbm(noise, x * 0.006 + 13, z * 0.006 - 7, 3)) * 0.7;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  const I = river.project(x, z);
  if (I.d > I.hw + 4 && I.d < 40 && fbm(noise, x * 0.02, z * 0.02 + 40, 2) > 0.05) k = Math.max(k, 0.6); // willows along the Neckar
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 54, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(20, 40, Math.hypot(x - c.x, z - c.z)));
  if (vineAt(x, z, 4)) return 0;
  return Math.min(k, smoothstep(1.05, 1.3, townQ(x, z)));
}, { x: 520, z: 580 }, 4);

const layout = [{ unit: 'rifles', x: NATO.x, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'black-forest',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (the French against an Austrian army come west from Ulm — Austria has no units yet: Russia stands in)
  name: 'Neckar before Stuttgart',
  description: 'The Neckar before Stuttgart, a hypothetical autumn 1805: an Austrian advance from Ulm meets the French at Stuttgart — the town in its basin ringed by vine and fir slopes, the Neckar down the flank with the stone bridge to walled Cannstatt, the Rotenberg and its castle over the river.',
  epochs: ['1806'],
  region: 'europe',
  airfields: [],
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 180510,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1805_1011, cell: 70, weights: [0.3, 0.3, 0.25, 0.15] }), // October: stubble, ploughland, meadows

  theme: {
    // a clear October day in Swabia, the fir woods black against the turning vines
    fogColor: 0xb4bcc0,
    fogDensity: 0.0012,
    skyTop: 0x5a7ca4,
    skyHorizon: 0xc4ccd0,
    skyBottom: 0x7a7a6c,
    sunColor: 0xf2e2c0,
    sunIntensity: 2.0,
    sunDisk: 0.5,
    clouds: 0.4,
    cloudLight: 0xe4e6e6,
    cloudDark: 0x8a9098,
    sunDir: [-0.45, 0.5, 0.55],
    hemiSky: 0xc4d0dc,
    hemiGround: 0x4e4632,
    hemiIntensity: 1.2,
    rimColor: 0xd0d4d8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5c6a3a',
      grassAlt: '#536034',
      dryGrass: '#8a7c4c',
      dirt: '#5e4a36',
      rock: '#80786a',
      strip: '#4e4030',
      pasture: '#5a6a3a',
      ploughed: '#4e3e2c',
      stubble: '#968450',
      meadow: '#62703e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-250, -100, 50, -130, 20, 170],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (townQ(x, z) < 0.98) return [0x6c6250, 0.45];                         // the streets and yards of the towns
        if (vineAt(x, z)) return [0x7c6440, 0.5];                                // the vineyards’ worked soil
        return null;
      },
    },
  },

  bases: { nato: { x: NATO.x, z: BASE_Z, entries: [-150, 0, 150] }, pact: { x: PACT.x, z: -BASE_Z, entries: [-150, 0, 150] } },
  maxStacks: 26,
  cameraStart: { nato: { x: NATO.x + 40, z: 380 }, pact: { x: PACT.x - 40, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: PACT.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const taken: number[][] = [];
    const seg = (x0, z0, x1, z1, height, thickness) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });

    // ---- the two towns: houses along a cross of streets, the market place open; Cannstatt’s wall round it
    for (const [t, seed, n] of [[TOWNS[0], 1805_101, 52], [TOWNS[1], 1805_102, 46]] as const) {
      const rr = mulberry32(seed), street = (x, z) => Math.abs(z - t.z) < 7 || Math.abs(x - t.x) < 7;
      for (let i = 0, k = 0; i < 400 && k < n; i++) {
        const x = t.x - t.rx + rr() * t.rx * 2, z = t.z - t.rz + rr() * t.rz * 2;
        if (Math.hypot((x - t.x) / t.rx, (z - t.z) / t.rz) > 0.88 || street(x, z) || Math.hypot(x - t.x, z - t.z) < 26 || nearWater(x, z, 10)
          || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
        taken.push([x, z]); k++;
        props.rand = mulberry32(Math.floor(rr() * 1e9));
        props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.6 ? 2 : 3, damaged: 0 });
      }
    }
    props.rand = mulberry32(1805_103);
    props.church({ x: P.C.x + 22, z: P.C.z + 24, yaw: 0 });                        // (the Stiftskirche)
    props.hall({ x: P.C.x - 26, z: P.C.z + 28, yaw: 0, width: 30, depth: 12, height: 10, color: 0xd8ccb4, roof: 0x5a4a40, door: 4, name: 'Residenzschloss' });
    props.church({ x: P.I.x - 22, z: P.I.z - 24, yaw: Math.PI });                  // (Cannstatt’s Stadtkirche)
    props.hall({ x: P.I.x + 24, z: P.I.z - 26, yaw: 0, width: 16, depth: 11, height: 8, color: 0xa08c74, roof: 0x5a3a2a, door: 4, name: 'Rathaus' });
    taken.push([P.C.x + 22, P.C.z + 24], [P.C.x - 26, P.C.z + 28], [P.I.x - 22, P.I.z - 24], [P.I.x + 24, P.I.z - 26]);
    for (const t of TOWNS) for (let k = 0; k < 56; k++) {                            // (the old town walls, gates on the streets)
      const a0 = (k / 56) * Math.PI * 2, a1 = ((k + 1) / 56) * Math.PI * 2;
      const x0 = t.x + Math.cos(a0) * t.rx, z0 = t.z + Math.sin(a0) * t.rz, x1 = t.x + Math.cos(a1) * t.rx, z1 = t.z + Math.sin(a1) * t.rz;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (Math.abs(mz - t.z) < 12 || Math.abs(mx - t.x) < 12 || nearWater(mx, mz, 8)) continue;
      seg(x0, z0, x1, z1, 2.8, 0.9);
    }

    // ---- the Wirtemberg on the Rotenberg: the old castle’s ring wall, keep and hall; a vineyard house on the Kriegsberg
    props.rand = mulberry32(1805_104);
    const W = { x: P.J.x + 22, z: P.J.z - 26 };
    for (let k = 0; k < 10; k++) {
      const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2;
      if (k === 2) continue;                                                       // (the gate, toward the point)
      seg(W.x + Math.cos(a0) * 22, W.z + Math.sin(a0) * 22, W.x + Math.cos(a1) * 22, W.z + Math.sin(a1) * 22, 3.6, 1.2);
    }
    props.hall({ x: W.x - 4, z: W.z - 6, yaw: 0.3, width: 16, depth: 9, height: 9, color: 0xb0a48c, roof: 0x4e3e34, door: 3, name: 'Wirtemberg castle' });
    props.box('stone', W.x + 9, terrain.heightAt(W.x + 9, W.z + 6) + 7, W.z + 6, 5, 14, 5, 0.3, 0x9c9482);
    props.house({ x: P.D.x + 30, z: P.D.z + 26, yaw: 0.2, width: 8, depth: 6, height: 3.6 });
    props.lowWall({ x: P.D.x + 30, z: P.D.z + 40, yaw: 0.2, length: 26 });
    taken.push([W.x, W.z], [P.D.x + 30, P.D.z + 26]);

    // ---- the vineyards: low rows of vines on their stakes, a dry-stone terrace wall below each
    for (const v of VINES) {
      for (let lz = -14; lz <= 14; lz += 3.5) for (let lx = -16; lx <= 16; lx += 10.6) {
        const x = v.x + lx * Math.cos(v.yaw) + lz * Math.sin(v.yaw), z = v.z - lx * Math.sin(v.yaw) + lz * Math.cos(v.yaw);
        props.box('plain', x, terrain.heightAt(x, z) + 0.6, z, 10, 1.2, 0.7, v.yaw, 0x6a5e2a);
      }
      const s = land(v.x, v.z - 18) < land(v.x, v.z + 18) ? 1 : -1;            // (the terrace wall on the downhill side)
      props.lowWall({ x: v.x - s * 18 * Math.sin(v.yaw), z: v.z - s * 18 * Math.cos(v.yaw), yaw: v.yaw, length: 40, height: 1 });
    }

    // ---- the river villages at the fords: a mill and the ferryman’s house on each bank; Berg’s and Untertürkheim’s churches
    for (const c of river.crossings) for (const s of [1, -1]) {
      const q = river.at(c, 16, s * (river.halfWidth + 18));
      if (nearWater(q.x, q.z, 4)) continue;
      props.house({ x: q.x, z: q.z, yaw: 0, width: 8, depth: 6 });
      taken.push([q.x, q.z]);
    }
    props.church({ x: P.E.x - 40, z: P.E.z + 44, yaw: 0 });
    props.church({ x: P.G.x - 40, z: P.G.z - 44, yaw: Math.PI });
    taken.push([P.E.x - 40, P.E.z + 44], [P.G.x - 40, P.G.z - 44]);
    for (const p of POINTS) if ('EG'.includes(p.id)) for (const s of [1, -1]) buildVillage(props, { x: p.x - 70 - (s + 1) * 25, z: p.z + s * 55 }, 18051 + Math.round(p.x * 3 + s * 17));

    // ---- farms, field walls and hay
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 64 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 80);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x - NATO.x, z - BASE_Z) < 60 || Math.hypot(x - PACT.x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || nearWater(x, z, 40) || vineAt(x, z, 12)
        || townQ(x, z) < 1.3 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xd8d0b8], [this.bases.pact, 1, 0xd4d0c0]] as const) {
      props.tent({ x: base.x - 26, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 26, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.crates({ x: base.x + 14, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: NATO.x, z: BASE_Z, r: 30 }, { x: PACT.x, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 30 })), { x: W.x, z: W.z, r: 28 }, { test: (x, z) => nearWater(x, z, 1.5) || townQ(x, z) < 1.08 || vineAt(x, z, 2) }];
    // firs dark on the heights, oaks, walnuts and willows below; the leaves turning
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 5000, broadleaf: 0.35, autumn: 0.8, maxY: 130, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1600, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
