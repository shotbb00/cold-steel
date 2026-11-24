// The Neckar before Stuttgart, a hypothetical autumn 1805: had Mack’s Austrians come west out of Ulm instead of
// sitting there, the road to the Rhine ran down the Fils and the Neckar past Esslingen to Cannstatt and Stuttgart,
// the Württemberg capital, with the dark fir heights of the Black Forest’s outliers behind it — and the French corps
// marching east from the Rhine would have met them in the Neckar valley under the vineyards.
// On the map (1.0 × 1.12 km): the French come down from Stuttgart (+z), the Austrians from the Esslingen road (−z);
// the Neckar crosses the middle of the field, upstream (east, +x) by Untertürkheim, downstream (west, −x) by Berg.
// The old stone bridge at Cannstatt carries the high road over it; the Berg and Untertürkheim fords are the other ways.
// Stuttgart in its basin behind the French centre, its Stiftskirche and the Residenz; Cannstatt, walled, on the far
// bank behind the Austrian centre. The valley sides are vineyard terraces: the Kriegsberg above Stuttgart, the
// Rotenberg with the old Wirtemberg castle upstream on the far bank; the dark fir woods on the western heights, the
// Bopser on the French side and the Kappelberg on the Austrian, and the valley sides climb higher to the west.
// Fair, not mirrored: the river crosses between the bases with all three crossings at the same reach from both; each
// side has a town in its centre at the same distance from the bridge, a vineyard hill on one wing (the Kriegsberg,
// the Rotenberg, both east) and a wooded height on the other (the Bopser, the Kappelberg, both west) — of the same
// height but not the same shape — and the valley sides climb the same way to both bases; the points of each half sit
// as far from their base as their counterparts, not on their mirror image (tools/map_fairness.py). 1806 only (`epochs`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 470;
const noise = createNoise2D(1805_1010);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
/** A hill stretched along `a` (a ridge): radii rx along, rz across. */
const ridge = (x, z, cx, cz, rx, rz, a, amp) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return amp * Math.exp(-(u * u + v * v));
};

// the Neckar across the middle, upstream at +x (Untertürkheim) to downstream at −x (Berg)
const neckarZ = (x) => 16 * Math.sin(x * 0.0045 + 0.5) + 6 * Math.sin(x * 0.012 + 1.9) - 3;
const river = createRiver({
  path: neckarZ,
  halfWidth: 17,
  level: 0,
  depth: 3,
  valley: 60,
  crossings: [
    { name: 'Berg ford', x: -300, kind: 'ford', width: 12 },
    { name: 'Cannstatt bridge', x: 0, kind: 'bridge', width: 8 },
    { name: 'Untertürkheim ford', x: 300, kind: 'ford', width: 12 },
  ],
});
const nearWater = (x, z, r) => { const I = river.project(x, z); return I.d < I.hw + r; };

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Stuttgart road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bopser', x: -360, z: 310, owner: null, sector: 'west' },
  { id: 'C', name: 'Stuttgart', x: 10, z: 250, owner: null, sector: 'centre', radius: 30 },
  { id: 'D', name: 'Kriegsberg', x: 310, z: 280, owner: null, sector: 'east' },
  { id: 'E', name: 'Berg', x: -300, z: Math.round(neckarZ(-300)), owner: null, sector: 'west' },
  { id: 'F', name: 'Cannstatt bridge', x: 0, z: Math.round(neckarZ(0)), owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Untertürkheim', x: 300, z: Math.round(neckarZ(300)), owner: null, sector: 'east' },
  { id: 'H', name: 'Kappelberg', x: -370, z: -320, owner: null, sector: 'west' },
  { id: 'I', name: 'Cannstatt', x: -70, z: -250, owner: null, sector: 'centre', radius: 30 },
  { id: 'J', name: 'Rotenberg', x: 310, z: -290, owner: null, sector: 'east' },
  { id: 'K', name: 'Esslingen road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const TOWNS = [{ ...P.C, rx: 120, rz: 78 }, { ...P.I, rx: 105, rz: 80 }];
const [T0, T1] = TOWNS;
const townQ = (x, z) => Math.min(Math.hypot((x - T0.x) / T0.rx, (z - T0.z) / T0.rz), Math.hypot((x - T1.x) / T1.rx, (z - T1.z) / T1.rz));

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the dark fir woods on the Bopser and on the Kappelberg, a copse on each of the other wings
const WOODS = [[-390, 380, 150, 85, 0.35], [-400, -400, 120, 105, -0.1], [420, 140, 55, 35, 0.4], [420, -160, 50, 40, -0.3]];

// the vineyards on the valley sides: the same number on each half, each from its own seed, most on its vineyard hill
const VINES: { x: number; z: number; yaw: number }[] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 1805_31 : 1805_57), hx = s > 0 ? P.D.x : P.J.x, hz = s > 0 ? P.D.z : P.J.z;
  for (let i = 0, n = 0; i < 6000 && n < 9; i++) {
    const nearHill = n < 5, x = nearHill ? hx + (r() - 0.5) * 260 : (r() * 2 - 1) * 420, z = nearHill ? hz + (r() - 0.5) * 220 : s * (90 + r() * 250);
    const yaw = (r() - 0.5) * 0.3;
    if (Math.abs(x) > 450 || POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 60) || VINES.some((v) => Math.hypot(v.x - x, v.z - z) < 70) || townQ(x, z) < 1.4
      || Math.abs(z - neckarZ(x)) < 70 || WOODS.some(([cx, cz, rx, rz]) => Math.hypot((x - cx) / rx, (z - cz) / rz) < 1.3)) continue;
    VINES.push({ x, z, yaw }); n++;
  }
}
const vineAt = (x, z, m = 0) => VINES.some((v) => {
  const dx = x - v.x, dz = z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
  return Math.abs(dx * c - dz * s) < 22 + m && Math.abs(dx * s + dz * c) < 16 + m;
});

const woods = (x, z) => {
  let k = smoothstep(0.56, 0.7, fbm(noise, x * 0.006 + 13, z * 0.006 - 7, 3)) * 0.7;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  const I = river.project(x, z);
  if (I.d > I.hw + 4 && I.d < 40 && fbm(noise, x * 0.02, z * 0.02 + 40, 2) > 0.05) k = Math.max(k, 0.6); // willows along the Neckar
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 54, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(20, 40, Math.hypot(x - c.x, z - c.z)));
  if (vineAt(x, z, 4)) return 0;
  return Math.min(k, smoothstep(1.05, 1.3, townQ(x, z)));
};

function height(x, z) {
  const dr = Math.abs(z - neckarZ(x));
  let h = fbm(noise, x * 0.0028, z * 0.0028, 3) * 3.5 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.45 + 3;
  h += smoothstep(70, 420, dr) * 14 * (1 + 0.35 * Math.tanh(-x / 250));           // the valley sides up to both bases, higher to the west
  h += ridge(x, z, -380, 360, 150, 80, 0.35, 12);                                  // the Bopser, a long wooded ridge
  h += hill(x, z, -400, -370, 110, 12);                                            // the Kappelberg, a round wooded top
  h += ridge(x, z, 330, 290, 130, 90, -0.2, 8);                                    // the Kriegsberg, its vines down to the town
  h += hill(x, z, 330, -290, 85, 9);                                               // the Rotenberg, a steep cone under the castle
  const town = smoothstep(1.2, 0.85, townQ(x, z));
  h += (Math.min(h, 13) - h) * town * 0.7;                                         // the two towns on their level ground
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * (x < 0 ? 34 : 14) + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 20;
  for (const p of POINTS) if ('AKCI'.includes(p.id)) h += (h * 0.6 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.5;
  return river.carve(x, z, Math.max(1.6, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

export default {
  id: 'black-forest',
  armies: { nato: ['fr'], pact: ['au', 'ru'] }, // (the French against an Austrian army come west from Ulm — Austria has no units yet: Russia stands in)
  name: 'Neckar before Stuttgart',
  description: 'The Neckar before Stuttgart, a hypothetical autumn 1805: an Austrian advance from Ulm meets the French in the valley under the vineyards — the stone bridge at Cannstatt, walled Cannstatt and Stuttgart in its basin, the vine-terraced Kriegsberg and Rotenberg, and the dark fir woods on the heights.',
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
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (townQ(x, z) < 0.98) return [0x6c6250, 0.45];                         // the streets and yards of the towns
        if (vineAt(x, z)) return [0x7c6440, 0.5];                                // the vineyards’ worked soil
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
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
    const W = { x: P.J.x + 36, z: P.J.z - 30 };
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
      const s = Math.sign(v.z - neckarZ(v.x));
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
    props.church({ x: P.G.x + 40, z: P.G.z - 44, yaw: Math.PI });
    taken.push([P.E.x - 40, P.E.z + 44], [P.G.x + 40, P.G.z - 44]);
    for (const p of POINTS) if ('EG'.includes(p.id)) for (const s of [1, -1]) buildVillage(props, { x: p.x + s * 70, z: p.z + s * (p.id === 'E' ? 48 : -48) }, 18051 + Math.round(p.x * 3 + s * 17));

    // ---- farms, field walls and hay
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 64 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 80);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || nearWater(x, z, 40) || vineAt(x, z, 12)
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

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 30 })), { x: W.x, z: W.z, r: 28 }, { test: (x, z) => nearWater(x, z, 1.5) || townQ(x, z) < 1.08 || vineAt(x, z, 2) }];
    // firs dark on the heights, oaks, walnuts and willows below; the leaves turning
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 5000, broadleaf: 0.35, autumn: 0.8, maxY: 80, forest: (x, z) => woods(x, z) * 0.95 });
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
