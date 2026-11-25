// Würzburg on the Main: in September 1796 Archduke Charles beat Jourdan’s French on the heights east of the town,
// and in September 1805 the Elector of Bavaria fled here with his army out of Munich before the Austrian invasion,
// sheltering under the guns of the Marienberg until Napoleon came up. Here the hypothetical battle of autumn 1805:
// the Austrians (with Prussia, had she joined them) come down the Main from the north to take the refuge, the
// Bavarians and the French marching up from the south to hold it.
// On the map (1.0 × 1.12 km): the Bavarians and French come from the Ochsenfurt road (south, +z), the Austrians from
// the Schweinfurt road (north, −z). The Main runs the length of the field, south to north, west of the middle: the
// old town on its east bank, walled, with the Dom and the Residenz; the Alte Mainbrücke over to the west bank; the
// Marienberg fortress on its steep hill above the river, vineyards on its slopes. Fords by Heidingsfeld (south) and
// Zell (north). Heidingsfeld and Gerbrunn on the southern side, the Nikolausberg with the Käppele across the river;
// Zell across the river on the northern side, the Steinberg’s vineyards and Lengfeld. The Galgenberg east of the town.
// Fair, not mirrored: the river runs between the flanks, not between the sides, its two fords at the same reach from
// either base and the bridge in the middle; the town, the Marienberg and the Galgenberg — the decisive ground — stand
// in the middle row, owned by neither. Each side has one point across the river (the Nikolausberg, Zell), a vineyard
// hill (the Nikolausberg, the Steinberg — one across the water, one on the near bank, traded for the village on the
// other side) and two villages, each as far from its base as its counterpart (tools/map_fairness.py). 1806 only.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { createRiver } from '../world/River.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 480;
const noise = createNoise2D(1796_903);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// the Main through the field, south (+z) to north (−z); the old bridge in the middle, the fords outside the town
const MAIN = [[-140, 720], [-150, 470], [-125, 250], [-130, 60], [-120, -60], [-100, -250], [-125, -470], [-115, -720]];
const mainX = (z) => {                                                            // (the course’s x at z, for layout)
  for (let i = 0; i < MAIN.length - 1; i++) { const [ax, az] = MAIN[i], [bx, bz] = MAIN[i + 1]; if (z <= az && z >= bz) return ax + (bx - ax) * (z - az) / (bz - az); }
  return MAIN[0][0];
};
const river = createRiver({
  path: MAIN, halfWidth: 17, level: 0, depth: 3, valley: 50,
  crossings: [
    { name: 'Alte Mainbrücke', x: mainX(0), z: 0, kind: 'bridge', width: 8 },
    { name: 'Heidingsfeld ford', x: mainX(260), z: 260, kind: 'ford', width: 12 },
    { name: 'Zell ford', x: mainX(-260), z: -260, kind: 'ford', width: 12 },
  ],
});
const wet = (x, z, m = 0) => { const I = river.project(x, z); return I.d < I.hw + m; };

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Ochsenfurt road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Nikolausberg', x: -330, z: 320, owner: null, sector: 'west' },
  { id: 'C', name: 'Heidingsfeld', x: 30, z: 280, owner: null, sector: 'centre' },
  { id: 'D', name: 'Gerbrunn', x: 340, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Marienberg', x: -290, z: 10, owner: null, sector: 'west', radius: 30 },
  { id: 'F', name: 'Würzburg', x: 60, z: -10, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Galgenberg', x: 360, z: 10, owner: null, sector: 'east' },
  { id: 'H', name: 'Zell', x: -310, z: -310, owner: null, sector: 'west' },
  { id: 'I', name: 'Steinberg', x: 10, z: -280, owner: null, sector: 'centre' },
  { id: 'J', name: 'Lengfeld', x: 360, z: -290, owner: null, sector: 'east' },
  { id: 'K', name: 'Schweinfurt road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const FORT = { x: P.E.x, z: P.E.z, R: 56, yaw: 0.15 };
/** Inside the town wall (an ellipse on the east bank). */
const CITY = { x: 75, z: 0, rx: 160, rz: 130 };
const cityQ = (x, z) => Math.hypot((x - CITY.x) / CITY.rx, (z - CITY.z) / CITY.rz);

// the vineyards on the valley sides — round the Marienberg, on the Nikolausberg and on the Steinberg — the same
// number on each half, each from its own seed
const VINES: { x: number; z: number; yaw: number }[] = [];
for (const s of [1, -1]) {
  const r = mulberry32(s > 0 ? 1796_41 : 1796_77), hill0 = s > 0 ? P.B : P.I;
  for (let i = 0, n = 0; i < 6000 && n < 9; i++) {
    const k = n % 3, cx = k === 0 ? hill0.x : k === 1 ? P.E.x : 200, cz = k === 0 ? hill0.z : k === 1 ? s * 120 : s * 170;
    const x = cx + (r() - 0.5) * 220, z = cz + (r() - 0.5) * 160, yaw = (r() - 0.5) * 0.3;
    if (Math.abs(x) > 460 || Math.sign(z) !== s || Math.abs(z) < 50 || POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 62) || VINES.some((v) => Math.hypot(v.x - x, v.z - z) < 70)
      || cityQ(x, z) < 1.35 || Math.abs(x - mainX(z)) < 60 || Math.hypot(x - FORT.x, z - FORT.z) < FORT.R + 40) continue;
    VINES.push({ x, z, yaw }); n++;
  }
}
const vineAt = (x, z, m = 0) => VINES.some((v) => {
  const dx = x - v.x, dz = z - v.z, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
  return Math.abs(dx * c - dz * s) < 22 + m && Math.abs(dx * s + dz * c) < 16 + m;
});

/** 1 inside a tilted ellipse (a named wood), fading out over its rim. */
const blob = (x, z, cx, cz, rx, rz, a) => {
  const dx = x - cx, dz = z - cz, u = (dx * Math.cos(a) + dz * Math.sin(a)) / rx, v = (-dx * Math.sin(a) + dz * Math.cos(a)) / rz;
  return smoothstep(1.1, 0.75, Math.hypot(u, v) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.25);
};
// the Guttenberg forest (south-west, over the river), the Gramschatz wood’s edge (north-east), copses on the plateau
const WOODS = [[-410, 430, 120, 80, 0.3], [360, -450, 130, 70, -0.2], [420, 170, 55, 35, 0.4], [-430, -130, 50, 40, -0.4]];
const woods = (x, z) => {
  let k = smoothstep(0.56, 0.7, fbm(noise, x * 0.006 + 31, z * 0.006 - 3, 3)) * 0.7;
  for (const [cx, cz, rx, rz, a] of WOODS) k = Math.max(k, blob(x, z, cx, cz, rx, rz, a));
  for (const p of POINTS) k = Math.min(k, smoothstep(30, 54, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(16, 34, Math.hypot(x - c.x, z - c.z)));
  if (vineAt(x, z, 4)) return 0;
  return Math.min(k, smoothstep(1.05, 1.3, cityQ(x, z)), smoothstep(FORT.R + 10, FORT.R + 30, Math.hypot(x - FORT.x, z - FORT.z)));
};

function height(x, z) {
  const dr = Math.abs(x - mainX(z));
  let h = fbm(noise, x * 0.0026, z * 0.0026, 3) * 3.5 + fbm(noise, x * 0.02 + 5, z * 0.02, 3) * 0.45 + 3;
  h += smoothstep(80, 420, dr) * 12;                                               // the valley sides up to the plateau
  h += hill(x, z, P.E.x - 10, P.E.z, 75, 20);                                       // the Marienberg, steep over the river
  h += hill(x, z, -330, 340, 95, 14);                                               // the Nikolausberg (the Käppele on it)
  h += hill(x, z, 0, -300, 80, 11);                                                 // the Steinberg, all vines
  h += hill(x, z, 380, 10, 110, 7);                                                 // the Galgenberg, a long swell east of the town
  const town = smoothstep(1.15, 0.85, cityQ(x, z));
  h += (4 - h) * town * 0.7;                                                        // the old town on the valley floor
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * (x > 0 ? 26 : 34);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 22;
  for (const p of POINTS) if ('ACDFHJK'.includes(p.id)) h += (h * 0.6 + 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.5;
  return river.carve(x, z, Math.max(1.6, h));
}

/** A fortress trace: bastioned polygon walls round (x, z), a gap in the faces toward `gaps` (angles). */
function bastions(props, { x, z, R, yaw }, n, gaps: number[]) {
  const pts: number[][] = [];
  for (let i = 0; i < n * 2; i++) { const a = yaw + (i * Math.PI) / n, r = i % 2 ? R * 0.72 : R; pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); }
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length], mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const facing = Math.atan2(mz - z, mx - x);
    if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(facing - g), Math.cos(facing - g))) < Math.PI / n / 1.5)) continue;
    props.wall({ x: mx, z: mz, yaw: Math.atan2(-(bz - az), bx - ax), length: Math.hypot(bx - ax, bz - az) + 1, height: 3.4, thickness: 2.2 });
  }
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1. Kompanie' }];

export default {
  id: 'wurzburg',
  armies: { nato: ['by', 'fr'], pact: ['au', 'pr'] }, // (the Bavarian army in its refuge with the French — Austria has no units yet: Prussia stands in)
  name: 'Würzburg',
  description: 'Würzburg on the Main, a hypothetical autumn 1805 on the ground of Charles’s victory of 1796: the Bavarian refuge under the Marienberg fortress on its vine-covered hill, the old bridge over the Main to the walled town with its Dom and Residenz, the Galgenberg and the Steinberg’s vineyards.',
  epochs: ['1806'],
  region: 'europe',
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1796903,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1796_904, cell: 75, weights: [0.32, 0.22, 0.3, 0.16] }), // September: stubble and ploughland

  theme: {
    // a hazy grey September day over the Main
    fogColor: 0xb0b4b2,
    fogDensity: 0.0014,
    skyTop: 0x6e7e90,
    skyHorizon: 0xc4c6c0,
    skyBottom: 0x76766c,
    sunColor: 0xeee0c4,
    sunIntensity: 1.6,
    sunDisk: 0.2,
    clouds: 0.7,
    cloudLight: 0xd6d8d4,
    cloudDark: 0x80868c,
    sunDir: [0.5, 0.45, 0.55],
    hemiSky: 0xc4ccd2,
    hemiGround: 0x4e4836,
    hemiIntensity: 1.25,
    rimColor: 0xbcc4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a663c',
      grassAlt: '#505a36',
      dryGrass: '#8a7c4e',
      dirt: '#5a4836',
      rock: '#8a8070',
      strip: '#4c3e30',
      pasture: '#58663a',
      ploughed: '#4e3e2e',
      stubble: '#928250',
      meadow: '#66703e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (cityQ(x, z) < 0.98) return [0x6c6250, 0.45];                          // the streets and yards of the town
        if (Math.hypot(x - FORT.x, z - FORT.z) < FORT.R + 6) return [0x7a7462, 0.4]; // the fortress’s courts
        if (vineAt(x, z)) return [0x7c6440, 0.5];                                 // the vineyards’ worked soil
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 390 }, pact: { x: 0, z: -390 } },
  points: POINTS,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const seg = (x0, z0, x1, z1, height, thickness) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height, thickness });
    const taken: number[][] = [];
    // the streets kept open: the Domstrasse from the bridge to the Dom and on to the Residenz, the cross street through the market
    const street = (x, z) => Math.abs(z - P.F.z) < 7 || Math.abs(x - P.F.x) < 7;
    const gate = (x, z) => Math.abs(z - P.F.z) < 12 || Math.abs(x - P.F.x) < 12;

    // ---- the old town: houses inside the walls, the market by the Dom left open
    const rr = mulberry32(1796_905);
    for (let i = 0; i < 400 && taken.length < 62; i++) {
      const x = CITY.x - CITY.rx + rr() * CITY.rx * 2, z = CITY.z - CITY.rz + rr() * CITY.rz * 2;
      if (cityQ(x, z) > 0.88 || street(x, z) || wet(x, z, 12) || Math.hypot(x - P.F.x, z - P.F.z) < 28 || (x > CITY.x + 70 && Math.abs(z - 40) < 30)
        || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.55 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(1796_906);
    props.church({ x: P.F.x + 26, z: P.F.z - 24, yaw: Math.PI / 2 });            // (the Dom St Kilian)
    props.church({ x: P.F.x - 26, z: P.F.z - 26, yaw: 0 });                      // (the Neumünster)
    props.hall({ x: CITY.x + 110, z: 40, yaw: 0, width: 44, depth: 14, height: 11, color: 0xd8c8a8, roof: 0x5a4c44, door: 5, name: 'Residenz' });
    props.hall({ x: P.F.x - 26, z: P.F.z + 28, yaw: 0, width: 16, depth: 11, height: 8, color: 0xa08a70, roof: 0x5a3a2a, door: 4, name: 'Rathaus' });
    taken.push([P.F.x + 26, P.F.z - 24], [P.F.x - 26, P.F.z - 26], [CITY.x + 110, 40], [P.F.x - 26, P.F.z + 28]);
    for (let k = 0; k < 64; k++) {                                                // (the town wall, gates on the streets; the river side open to the quay)
      const a0 = (k / 64) * Math.PI * 2, a1 = ((k + 1) / 64) * Math.PI * 2;
      const x0 = CITY.x + Math.cos(a0) * CITY.rx, z0 = CITY.z + Math.sin(a0) * CITY.rz, x1 = CITY.x + Math.cos(a1) * CITY.rx, z1 = CITY.z + Math.sin(a1) * CITY.rz;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (gate(mx, mz) || wet(mx, mz, 10)) continue;
      seg(x0, z0, x1, z1, 3, 0.9);
    }

    // ---- the Marienberg: the bastioned fortress round the old castle — the Fürstenbau, the round keep, the Marienkirche
    props.rand = mulberry32(1796_907);
    bastions(props, FORT, 5, [0.1, -2.6]);                                        // (gates toward the bridge and to Höchberg)
    props.hall({ x: FORT.x - 6, z: FORT.z - 16, yaw: 0.15, width: 30, depth: 10, height: 11, color: 0xd2c6ae, roof: 0x5a4a40, door: 4, name: 'Fürstenbau' });
    props.hall({ x: FORT.x - 18, z: FORT.z + 18, yaw: 0.15, width: 18, depth: 9, height: 8, color: 0xc8baa0, roof: 0x5a4a40, door: 3, name: 'Zeughaus' });
    props.church({ x: FORT.x + 22, z: FORT.z + 20, yaw: 0.15 });                // (the Marienkirche)
    props.box('stone', FORT.x + 20, terrain.heightAt(FORT.x + 20, FORT.z - 22) + 9, FORT.z - 22, 7, 18, 7, 0, 0xb8ae98);  // (the Bergfried)
    // the Käppele on the Nikolausberg; the bridge gate on the west bank
    props.church({ x: P.B.x + 30, z: P.B.z - 30, yaw: -0.4 });
    taken.push([FORT.x, FORT.z], [P.B.x + 30, P.B.z - 30]);

    // ---- the vineyards: low rows of vines on their stakes, a dry-stone terrace wall below each
    for (const v of VINES) {
      for (let lz = -14; lz <= 14; lz += 3.5) for (let lx = -16; lx <= 16; lx += 10.6) {
        const x = v.x + lx * Math.cos(v.yaw) + lz * Math.sin(v.yaw), z = v.z - lx * Math.sin(v.yaw) + lz * Math.cos(v.yaw);
        props.box('plain', x, terrain.heightAt(x, z) + 0.6, z, 10, 1.2, 0.7, v.yaw, 0x6a5e2a);
      }
      props.lowWall({ x: v.x, z: v.z + 18 * Math.sign(v.z), yaw: v.yaw, length: 40, height: 1 });
    }

    // ---- the villages; a ferry house at each ford
    for (const p of POINTS) if ('CDHJ'.includes(p.id)) buildVillage(props, p, 17969 + Math.round(p.x * 3 + p.z * 7));
    props.church({ x: P.C.x - 30, z: P.C.z + 26, yaw: 0 });
    props.church({ x: P.J.x + 28, z: P.J.z - 26, yaw: Math.PI });
    taken.push([P.C.x - 30, P.C.z + 26], [P.J.x + 28, P.J.z - 26]);
    for (const c of river.crossings) if (c.kind === 'ford') for (const s of [1, -1]) {
      const q = river.at(c, 16, s * (river.halfWidth + 18));
      if (wet(q.x, q.z, 4)) continue;
      props.house({ x: q.x, z: q.z, yaw: 0, width: 7, depth: 6 });
      taken.push([q.x, q.z]);
    }

    // ---- farms, field walls and hay on the plateau
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 64 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 80);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || wet(x, z, 40) || vineAt(x, z, 12)
        || cityQ(x, z) < 1.3 || Math.hypot(x - FORT.x, z - FORT.z) < FORT.R + 40 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40)) continue;
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
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 28 })),
      { test: (x, z) => wet(x, z, 1.5) || cityQ(x, z) < 1.08 || vineAt(x, z, 2) || Math.hypot(x - FORT.x, z - FORT.z) < FORT.R + 8 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 4300, broadleaf: 0.7, autumn: 0.75, maxY: 80, forest: (x, z) => (wet(x, z, 12) ? 0.45 : woods(x, z) * 0.95) });
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
