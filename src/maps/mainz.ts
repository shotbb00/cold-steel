// Mainz and the Rhine crossing: in 1793 the Prussians and Austrians besieged the French garrison in Mainz from April
// to July, digging their parallels on the heights south of the city and fighting for the Kastel bridgehead and the
// islands, until Mainz surrendered; by 1805 it was French again, Mont-Tonnerre’s chief town and the Grande Armée’s
// door over the Rhine. Here a hypothetical summer battle of the Third Coalition: Austrians and Prussians come down
// out of the Taunus on the right bank to force the crossing, the French come up from the left-bank plateau to hold it.
// On the map (1.0 × 1.12 km): the French from the Alzey road (+z), the coalition from the Wiesbaden road (−z); the
// Rhine across the middle, flowing from upstream (+x, Weisenau) to downstream (−x, Mombach and Biebrich). The city
// of Mainz on its bank with the Dom and its bastioned wall, the citadel’s four bastions on the Jakobsberg above it;
// the bridge of boats over to Kastel and its crown-work on the right bank. The Main comes in from the right bank on
// the upstream wing past Kostheim; the Mainspitze, the tongue of land between the Main and the Rhine, carries the
// Weisenau flying bridge. Downstream the Ingelheimer Aue lies by the Mainz bank behind its side arm, the Mombach
// flying bridge landing on it from the right bank.
// Fair, not mirrored: each bank has its fortress by the bridge — the citadel on the left, Kastel on the right — at
// the same reach from the bridge and its base. Each side has one middle point behind a lesser water of its own and
// the full Rhine from the other: the Ingelheimer Aue behind the side arm (the French) and the Mainspitze behind the
// Main (the coalition), each with its flying bridge to the far bank; the bridge of boats in the middle. Gonsenheim
// answers Biebrich, Weisenau Kostheim; the left-bank plateau rises to the French as the Taunus foothills to the
// coalition (tools/map_fairness.py). 1806 only (`epochs`); summer, no `climate`.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, buildVillage } from './common.js';
import { pontoons } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 470;
const noise = createNoise2D(1793_722);
const hill = (x, z, cx, cz, r, amp) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// the Rhine across the middle, upstream (+x) to downstream (−x)
const rhineZ = (x) => 11 * Math.sin(x * 0.004 + 0.6) + 5 * Math.sin(x * 0.013 + 1.1) - 2;
// the side arm behind the Ingelheimer Aue on the Mainz bank; the Main in from the right bank past Kostheim
const AUE = [[-520, 20, 7], [-440, 52, 10], [-330, 70, 12], [-220, 62, 10], [-140, 34, 6]].map(([x, dz, w]) => [x, rhineZ(x) + dz, w]);
const MAIN = [[600, -460, 12], [500, -300, 12], [430, -170, 12], [370, -70, 13], [320, rhineZ(320) - 10, 14]];
const river = createRiver({
  path: rhineZ,
  paths: [rhineZ, AUE, MAIN],
  halfWidth: 26,
  level: 0,
  depth: 3.4,
  valley: 70,
  crossings: [
    { name: 'Mombach flying bridge', x: -290, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Bridge of boats', x: 0, kind: 'bridge', width: 8, pontoon: true },
    { name: 'Weisenau flying bridge', x: 440, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Aue bridge', x: -170, z: rhineZ(-170) + 50, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Aue ford', x: -420, z: rhineZ(-420) + 56, kind: 'ford', width: 12, channel: 1 },
    { name: 'Kostheim bridge', x: 455, z: -220, kind: 'bridge', width: 7, channel: 2 },
    { name: 'Main ford', x: 395, z: -110, kind: 'ford', width: 12, channel: 2 },
  ],
});
const nearWater = (x, z, r) => { const I = river.project(x, z); return I.d < I.hw + r; };

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Alzey road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Gonsenheim', x: -350, z: 310, owner: null, sector: 'west' },
  { id: 'C', name: 'Citadel', x: 110, z: 250, owner: null, sector: 'centre', radius: 30 },
  { id: 'D', name: 'Weisenau', x: 340, z: 270, owner: null, sector: 'east' },
  { id: 'E', name: 'Ingelheimer Aue', x: -290, z: Math.round(rhineZ(-290) + 34), owner: null, sector: 'west' },
  { id: 'F', name: 'Bridge of boats', x: 0, z: Math.round(rhineZ(0)), owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Mainspitze', x: 445, z: Math.round(rhineZ(445) - 62), owner: null, sector: 'east' },
  { id: 'H', name: 'Biebrich', x: -330, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Kastel', x: -40, z: -220, owner: null, sector: 'centre', radius: 30 },
  { id: 'J', name: 'Kostheim', x: 300, z: -310, owner: null, sector: 'east' },
  { id: 'K', name: 'Wiesbaden road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(POINTS.map((p) => [p.id, p]));
const CITADEL = { x: P.C.x, z: P.C.z, R: 50, yaw: Math.PI / 4 };
/** The city of Mainz along its bank, under the citadel. */
const CITY = { x: -110, z: 140, rx: 170, rz: 80 };
const cityQ = (x, z) => Math.hypot((x - CITY.x) / CITY.rx, (z - CITY.z) / CITY.rz);
const CROWN = { x: P.I.x, z: P.I.z + 70 };                                              // Kastel’s crown-work round the bridge’s far end

function height(x, z) {
  let h = fbm(noise, x * 0.0028, z * 0.0028, 3) * 3.4 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.4 + 4.5;
  const dr = Math.abs(z - rhineZ(x));
  h += z > 0 ? smoothstep(70, 240, dr) * 12 : smoothstep(150, 480, dr) * (12 + 4 * smoothstep(-200, 400, x)); // the bluff and plateau behind Mainz; the long Taunus slope, higher upstream toward Hochheim
  h += hill(x, z, CITADEL.x + 10, CITADEL.z + 10, 85, 5);                             // the Jakobsberg under the citadel
  h += hill(x, z, -360, -420, 120, 7);                                               // the Biebrich heights
  h += hill(x, z, 340, 420, 110, 10);                                                 // the Hechtsheim heights
  h += (5 - h) * smoothstep(1.15, 0.85, cityQ(x, z)) * 0.6;                          // the city on its low terrace
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * (x < 0 ? 22 : 12) + smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * (z > 0 ? 32 : 14);
  for (const p of POINTS) if ('ABDHIJK'.includes(p.id)) h += (h * 0.6 + 2 - h) * smoothstep(44, 22, Math.hypot(x - p.x, z - p.z)) * 0.5;
  return river.carve(x, z, Math.max(1.6, h));
}

/** The woods (0..1): willows and poplars on the islands and along the water, copses on the plateaus, vines none. */
const woods = (x, z) => {
  let k = smoothstep(0.56, 0.69, fbm(noise, x * 0.006 + 21, z * 0.006 - 5, 3)) * 0.7;
  const I = river.project(x, z);
  if (I.d > I.hw + 4 && I.d < 60 && fbm(noise, x * 0.018, z * 0.018 + 40, 2) > -0.05) k = Math.max(k, 0.7);
  k = Math.max(k, smoothstep(1.05, 0.8, Math.hypot((x + 420) / 70, (z - 430) / 50)), smoothstep(1.05, 0.8, Math.hypot((x - 400) / 80, (z + 440) / 50))); // (the Gonsenheim wood, the Taunus wood’s edge)
  for (const p of POINTS) k = Math.min(k, smoothstep(p.id === 'C' || p.id === 'I' ? 66 : 30, p.id === 'C' || p.id === 'I' ? 90 : 54, Math.hypot(x - p.x, z - p.z)));
  for (const c of river.crossings) k = Math.min(k, smoothstep(22, 44, Math.hypot(x - c.x, z - c.z)));
  return Math.min(k, smoothstep(1.05, 1.3, cityQ(x, z)));
};

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1re Compagnie' }];

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

export default {
  id: 'mainz',
  armies: { nato: ['fr'], pact: ['au', 'pr'] }, // (the French in Mainz against the Austrians and Prussians of 1793 — Austria has no units yet: Prussia fights)
  name: 'Mainz',
  description: 'Mainz on the Rhine, besieged in 1793 and here fought for in a hypothetical 1805: the fortress city with its citadel on the Jakobsberg, the bridge of boats to the Kastel bridgehead on the far bank, the Main coming in past Kostheim, and the willow islands downstream.',
  epochs: ['1806'],
  region: 'europe',
  airfields: [],
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1793722,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1793_723, cell: 72, weights: [0.2, 0.2, 0.15, 0.45] }), // July: the corn high and ripening

  theme: {
    // a hot, hazy July on the Rhine
    fogColor: 0xc4c8c4,
    fogDensity: 0.0011,
    skyTop: 0x4c78aa,
    skyHorizon: 0xccd4d6,
    skyBottom: 0x82806e,
    sunColor: 0xfff0d0,
    sunIntensity: 2.3,
    sunDisk: 0.8,
    clouds: 0.3,
    cloudLight: 0xf0f0ec,
    cloudDark: 0x9aa0a6,
    sunDir: [0.4, 0.62, 0.5],
    hemiSky: 0xc8d6e2,
    hemiGround: 0x5a5236,
    hemiIntensity: 1.2,
    rimColor: 0xdad8d0,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5e7038',
      grassAlt: '#566834',
      dryGrass: '#a08e58',
      dirt: '#6a5438',
      rock: '#8a8270',
      strip: '#5a4832',
      pasture: '#62743a',
      ploughed: '#6a5636',
      stubble: '#b09a5a',
      meadow: '#6a7a3e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
      surface(x, z) {
        if (cityQ(x, z) < 0.98) return [0x76684e, 0.45];                                       // the streets and yards of the city
        if (Math.hypot(x - CITADEL.x, z - CITADEL.z) < 80 || Math.hypot(x - CROWN.x, z - CROWN.z + 20) < 100) return [0x7a7a54, 0.35]; // the glacis, cropped grass
        const I = river.project(x, z), d = I.d - I.hw;
        if (d > 0 && d < 30) return [0x9a8c64, smoothstep(30, 6, d) * 0.4];                    // the gravel and sand of the banks
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
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

    // ---- the city: houses along the bank, the Dom and the market open, the Rheinstrasse to the bridge kept clear
    const street = (x, z) => Math.abs(x - P.F.x) < 8 || Math.abs(z - CITY.z) < 6 || Math.abs(x - CITY.x) < 6;
    const DOM = { x: CITY.x + 20, z: CITY.z + 22 };
    const rr = mulberry32(1793_1);
    for (let i = 0; i < 500 && taken.length < 64; i++) {
      const x = CITY.x - CITY.rx + rr() * CITY.rx * 2, z = CITY.z - CITY.rz + rr() * CITY.rz * 2;
      if (cityQ(x, z) > 0.88 || street(x, z) || nearWater(x, z, 10) || Math.hypot(x - DOM.x, z - DOM.z) < 30 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2.5, depth: 8, storeys: rr() < 0.5 ? 2 : 3, damaged: 0 });
    }
    props.rand = mulberry32(1793_2);
    props.church({ x: DOM.x - 8, z: DOM.z, yaw: Math.PI / 2 });                       // (the Dom St Martin)
    props.church({ x: DOM.x + 12, z: DOM.z, yaw: Math.PI / 2 });                      // (its east choir and towers)
    props.hall({ x: CITY.x - 110, z: CITY.z - 30, yaw: 0.05, width: 34, depth: 12, height: 10, color: 0xb87a5a, roof: 0x5a4a44, door: 4, name: 'Kurfürstliches Schloss' });
    taken.push([DOM.x, DOM.z], [CITY.x - 110, CITY.z - 30]);
    for (let k = 0; k < 64; k++) {                                                     // (the city wall on the land side, gates on the streets)
      const a0 = (k / 64) * Math.PI * 2, a1 = ((k + 1) / 64) * Math.PI * 2;
      const x0 = CITY.x + Math.cos(a0) * CITY.rx, z0 = CITY.z + Math.sin(a0) * CITY.rz, x1 = CITY.x + Math.cos(a1) * CITY.rx, z1 = CITY.z + Math.sin(a1) * CITY.rz;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (street(mx, mz) || Math.abs(mx - P.F.x) < 14 || Math.abs(mx - CITY.x) < 12 || nearWater(mx, mz, 14) || mz < CITY.z - 20) continue;
      seg(x0, z0, x1, z1, 3.2, 1.2);
    }

    // ---- the citadel on the Jakobsberg: four bastions, the commandant’s house and the barracks; the Drusus stone
    props.rand = mulberry32(1793_3);
    bastions(props, CITADEL, 4, [-Math.PI / 2, Math.PI]);                            // (gates toward the river and toward the city)
    props.hall({ x: CITADEL.x - 12, z: CITADEL.z + 12, yaw: 0, width: 24, depth: 9, height: 7, color: 0xc4a888, roof: 0x5a4a40, door: 3, name: 'barracks' });
    props.hall({ x: CITADEL.x + 16, z: CITADEL.z - 14, yaw: 0, width: 14, depth: 9, height: 7, color: 0xb8a08a, roof: 0x5a4a40, door: 3, name: 'Kommandantenbau' });
    props.box('stone', CITADEL.x + 20, terrain.heightAt(CITADEL.x + 20, CITADEL.z + 18) + 5, CITADEL.z + 18, 5, 10, 5, 0, 0x9a9282); // (the Drususstein)
    taken.push([CITADEL.x, CITADEL.z]);

    // ---- Kastel: the crown-work round the bridge’s far end — a bastion and two half-bastions facing the Taunus, wings to the bank
    props.rand = mulberry32(1793_4);
    const trace = (pts: number[][]) => { for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
      props.wall({ x: CROWN.x + (ax + bx) / 2, z: CROWN.z + (az + bz) / 2, yaw: Math.atan2(-(bz - az), bx - ax), length: Math.hypot(bx - ax, bz - az) + 1.5, height: 3.2, thickness: 2.2 }); } };
    for (const s of [-1, 1]) trace([[100 * s, 50], [100 * s, -20], [120 * s, -60], [70 * s, -52], [40 * s, -70], [14 * s, -100]]);
    props.hall({ x: CROWN.x + 30, z: CROWN.z - 10, yaw: 0, width: 20, depth: 9, height: 6, color: 0xc4b49c, roof: 0x5a4a40, door: 3, name: 'barracks' });
    props.church({ x: P.I.x - 30, z: P.I.z - 24, yaw: Math.PI / 2 });
    taken.push([CROWN.x + 30, CROWN.z - 10], [P.I.x - 30, P.I.z - 24]);
    // houses of Kastel behind the crown-work
    const rk = mulberry32(1793_5);
    for (let i = 0, k = 0; i < 300 && k < 22; i++) {
      const a = rk() * Math.PI * 2, d = 30 + rk() * 70, x = P.I.x + Math.cos(a) * d * 1.3, z = P.I.z + Math.sin(a) * d * 0.7;
      if (nearWater(x, z, 12) || nearPoint(x, z, 22) || (Math.abs(x - CROWN.x) < 125 && z > CROWN.z - 105) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14)) continue;
      taken.push([x, z]); k++;
      props.rand = mulberry32(Math.floor(rk() * 1e9));
      props.house({ x, z, yaw: a + Math.PI / 2, width: 8 + rk() * 3, depth: 7, height: 4 });
    }

    // ---- the villages; toll houses at the flying bridges, boats drawn up
    for (const p of POINTS) if ('BDHJ'.includes(p.id)) buildVillage(props, p, 17931 + Math.round(p.x * 3 + p.z * 7));
    props.rand = mulberry32(1793_6);
    props.church({ x: P.B.x + 28, z: P.B.z + 22, yaw: 0 });
    props.church({ x: P.J.x - 26, z: P.J.z - 24, yaw: Math.PI });
    taken.push([P.B.x + 28, P.B.z + 22], [P.J.x - 26, P.J.z - 24]);
    for (const c of river.crossings.filter((c) => c.channel === 0)) for (const s of [1, -1]) {
      const q = river.at(c, 14, s * (river.halfWidth + 16));
      if (nearWater(q.x, q.z, 4) || nearPoint(q.x, q.z, 20)) continue;
      props.house({ x: q.x, z: q.z, yaw: 0, width: 6, depth: 5 });
      taken.push([q.x, q.z]);
    }

    // ---- farms, field walls and hay
    const kinds = ['farm', 'fieldwall', 'hay', 'farm', 'hay', 'fieldwall'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 66 && tries < 12000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 80);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 55 * 55)) continue;
      if (Math.hypot(x, z - BASE_Z) < 60 || Math.hypot(x, z + BASE_Z) < 60 || nearPoint(x, z, 55) || woods(x, z) > 0.25 || nearWater(x, z, 40) || cityQ(x, z) < 1.3
        || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 40) || Math.hypot(x - CITADEL.x, z - CITADEL.z) < 90 || (Math.abs(x - CROWN.x) < 140 && z > CROWN.z - 120 && z < 0)) continue;
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
    pontoons(river, scene);

    const fort = (x, z) => Math.hypot(x - CITADEL.x, z - CITADEL.z) < CITADEL.R + 14 || (Math.abs(x - CROWN.x) < 130 && z > CROWN.z - 110 && z < CROWN.z + 60);
    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })), ...taken.map(([x, z]) => ({ x, z, r: 9 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: 30 })), { test: (x, z) => nearWater(x, z, 1.5) || fort(x, z) || cityQ(x, z) < 1.08 }];
    // willows and poplars on the islands and banks, walnuts and fruit trees on the plateaus
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 3800, broadleaf: 0.9, autumn: 0, maxY: 60, forest: (x, z) => woods(x, z) * 0.95 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1400, lane: 0 });
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
