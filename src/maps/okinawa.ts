// Okinawa, May 1945: the Shuri Line (1945 only; the big field, 1.0 × 1.12 km; the Pacific: the Marines and the US Army
// against the Imperial Japanese Army's 32nd Army). Across the south of the island General Ushijima's men held a line of
// coral limestone ridges from Naha on the west coast through Shuri Castle to Yonabaru on the east, every ridge honeycombed
// with caves and tunnels, every hill's reverse slope sheltering the mortars that covered the next. Here each side holds
// its ridge — a sheer escarpment toward the valley, a long back slope behind, two saddles where the tracks cross — over a
// valley of flooded rice paddies (map.soft: men wade, tanks bog down) and the ruined towns at its ends: Naha in the west,
// Yonabaru in the east, joined by the Naha–Yonabaru road. The Japanese ridge carries Sugar Loaf Hill, Shuri Castle and
// Conical Hill; the American one Kochi Ridge, the Maeda Escarpment and Kakazu Ridge. Not mirrored, but fair: the two
// ridges are as high and as long on the whole but not twins (Kakazu tall in the west against the Japanese Conical Hill
// in the east, Shuri's broad height against the Maeda Escarpment, Sugar Loaf small and steep), each side's saddles are
// its own, and Naha and Yonabaru differ in size and layout. The rains came in late May and turned it all to mud.
// The US come from the north-facing side (+z), the Japanese from -z.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, shellField } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1945_05);
const BOUNDS = { x: 500, z: 560 };

// (shapes in each side's own frame: X, U = x, z on the US half (s = 1), -x, -z on the Japanese one (s = -1): X runs
// left to right as that side faces the valley, U is the distance back from the middle)
const frame = (x: number, z: number): [number, number, number] => (z >= 0 ? [x, z, 1] : [-x, -z, -1]);
/** The crest line of a side's ridge (U at X). */
export const crestU = (X: number, s = 1) => s > 0
  ? 272 + Math.sin(X * 0.011) * 14 + fbm(noise, X * 0.006 + 40, 3.3, 2) * 10
  : 266 + Math.sin(X * 0.008 + 1.3) * 18 + fbm(noise, X * 0.006 + 90, 7.1, 2) * 10;
/** The ridge's height along the crest: Kakazu Ridge, the Maeda Escarpment, Kochi Ridge; Sugar Loaf (small and steep), Shuri (broad, highest), Conical Hill. */
const crestH = (X: number, s = 1) => s > 0
  ? 16 + 18 * Math.exp(-(((X + 320) / 70) ** 2)) + 16 * Math.exp(-(((X - 60) / 80) ** 2)) + 14 * Math.exp(-(((X - 330) / 70) ** 2))
  : 15 + 12 * Math.exp(-(((X - 270) / 45) ** 2)) + 17 * Math.exp(-(((X - 20) / 95) ** 2)) + 17 * Math.exp(-(((X + 360) / 60) ** 2));
/** The saddles the tracks cross each ridge by (0 in one), in that side's X. */
const PASSES = { 1: [-140, 200], [-1]: [-170, 150] };
const pass = (X: number, s = 1) => PASSES[s].reduce((k, p) => k * (1 - 0.88 * Math.exp(-(((X - p) / 34) ** 2))), 1);
/** The Naha–Yonabaru road along the valley. */
export const roadZ = (x: number) => -0.16 * x + 18 * Math.sin(x * 0.012 + 0.6) - 18 * Math.sin(0.6);
/** The tracks: from each base over its saddles down to the valley road. */
const TRACKS: [number, number][][] = [
  [[0, 500], [0, 420], [-140, 340], [-140, 210], [-90, roadZ(-90)]],
  [[0, 420], [200, 340], [200, 210], [250, roadZ(250)]],
  [[0, -500], [0, -420], [170, -340], [170, -205], [120, roadZ(120)]],
  [[0, -420], [-150, -345], [-150, -205], [-230, roadZ(-230)]],
];
function segDist(px: number, pz: number, [ax, az]: [number, number], [bx, bz]: [number, number]) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
/** Metres to the nearest road or track. */
function roadDist(x: number, z: number) {
  let d = Math.abs(x) < 490 ? Math.abs(z - roadZ(x)) : Infinity;
  for (const t of TRACKS) for (let i = 0; i + 1 < t.length; i++) d = Math.min(d, segDist(x, z, t[i], t[i + 1]));
  return d;
}

// the towns at the valley's ends: Naha (west, on the US side of the road), wide and low; Yonabaru (east, on the Japanese
// side), smaller and tighter round its crossroads
const TOWNS = [{ x: -330, z: roadZ(-330) + 22, r: 70 }, { x: 345, z: roadZ(345) - 26, r: 62 }];
const inTown = (x: number, z: number, pad = 0) => TOWNS.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + pad);

/** The rice paddies: the valley floor's flooded fields, each its own dyked plot on a grid, whole plots in or out by
 *  noise; none on the roads or in the towns. */
const PW = 26, PD = 22;
const paddyN = (x: number, z: number) => fbm(noise, x * 0.006 + 5, z * 0.006 - 9, 3);
const hash = (i: number, j: number) => { const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return v - Math.floor(v); };
const plots = new Map<string, number>(); // (plot -> its water level, or -1: dry)
function plot(x: number, z: number) {
  const i = Math.round(x / PW), j = Math.round(z / PD), key = i + ',' + j;
  let level = plots.get(key);
  if (level === undefined) {
    const cx = i * PW, cz = j * PD, [X, U, s] = frame(cx, cz);
    const ok = U < crestU(X, s) - 110 && Math.abs(cx) < 440 && paddyN(cx, cz) > -0.12
      && roadDist(cx, cz) > 21 && !inTown(cx, cz, 16) && Math.hypot(cx, cz) > 40;
    level = ok ? 1.3 + hash(i, j) * 0.6 : -1; // (the terraces: each plot a hand or two above or below its neighbours)
    plots.set(key, level);
  }
  return { level, edge: Math.min(PW / 2 - Math.abs(x - i * PW), PD / 2 - Math.abs(z - j * PD)) };
}
/** 1 inside a flooded plot, falling to 0 over its dyke; 0 off the paddies. */
function paddy(x: number, z: number) {
  const p = plot(x, z);
  return p.level < 0 ? 0 : smoothstep(1.2, 3, p.edge);
}

function height(x: number, z: number) {
  const [X, U, s] = frame(x, z);
  let h = 2.6 + fbm(noise, x * 0.006, z * 0.006, 3) * 1.8 + fbm(noise, x * 0.04, z * 0.04, 2) * 0.4; // the valley: low rolling ground
  // the ridge: a sheer coral escarpment toward the valley, a long back slope behind, broken crest, the saddles
  const c = crestU(X, s);
  const face = smoothstep(c - 30, c - 4, U);
  const back = 1 - 0.75 * smoothstep(c + 15, c + 190, U);
  const rough = 1 + ridged(noise, x * 0.035 + 7, z * 0.035, 3) * 0.16;
  h += crestH(X, s) * pass(X, s) * Math.min(face, back) * rough;
  h += smoothstep(430, 560, Math.abs(x)) * 30 + smoothstep(560, 680, Math.abs(z)) * 12; // the hills beyond the edges
  // the paddies: flat, sunk a little, terraced by their dykes (painted)
  const pl = plot(x, z);
  if (pl.level >= 0) h += (pl.level - h) * smoothstep(0.4, 3.5, pl.edge) + 0.35 * smoothstep(1.4, 0.4, pl.edge); // (the dyke round it a little proud)
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  for (const t of TOWNS) h += (3.2 - h) * smoothstep(t.r, t.r - 25, Math.hypot(x - t.x, z - t.z)); // the towns: level
  return h;
}

/** The paddies are knee-deep mud: men wade, vehicles crawl and stick; the dykes and roads are firm. */
function soft(x: number, z: number, foot: boolean) {
  const p = paddy(x, z);
  return p <= 0.2 ? 1 : 1 - p * (foot ? 0.3 : 0.6);
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];
const hill = (X: number) => ({ x: X, z: crestU(X) });
const theirHill = (X: number) => ({ x: -X, z: -crestU(X, -1) }); // (X in the Japanese frame)
const points: ControlPointDef[] = [
  { id: 'A', name: 'Machinato', x: 25, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Kakazu Ridge', ...hill(-320), owner: null, sector: 'west' },
  { id: 'C', name: 'Maeda Escarpment', ...hill(60), owner: null, sector: 'centre' },
  { id: 'D', name: 'Kochi Ridge', ...hill(330), owner: null, sector: 'east' },
  { id: 'E', name: 'Naha', x: TOWNS[0].x, z: TOWNS[0].z, owner: null, sector: 'west' },
  { id: 'F', name: 'Wana Draw', x: 0, z: 0, owner: null, sector: 'centre' },
  { id: 'G', name: 'Yonabaru', x: TOWNS[1].x, z: TOWNS[1].z, owner: null, sector: 'east' },
  { id: 'H', name: 'Sugar Loaf Hill', ...theirHill(270), owner: null, sector: 'west' },
  { id: 'I', name: 'Shuri Castle', ...theirHill(20), owner: null, sector: 'centre' },
  { id: 'J', name: 'Conical Hill', ...theirHill(-360), owner: null, sector: 'east' },
  { id: 'K', name: 'Haebaru', x: 25, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'okinawa',
  name: 'Okinawa',
  description: 'May 1945, the Shuri Line: coral ridges riddled with caves — Sugar Loaf Hill, Shuri Castle, Conical Hill — over a valley of flooded paddies between ruined Naha and Yonabaru. The rains turn it all to mud.',
  epochs: ['1945'],
  region: 'pacific',                                   // (the menu's Asia & Pacific scenarios: maps/index.js REGIONS)
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific's armies)
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['usmc', 'us'], pact: ['jp'] },
  conditions: { weather: 'rain' },                     // (the May rains)
  airfields: [],                                       // (systems/Airfields.js: none on the field — the US aircraft come off the carriers and from Yontan, the kamikazes from Kyushu)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles: the escarpments are for men only — the saddles and the back slopes for the rest)
  seed: 1945,
  height,
  soft,

  theme: {
    // a grey, wet May day: low cloud, rain haze over the paddies, the ridges green-brown and shell-torn
    fogColor: 0x9ea4a0, fogDensity: 0.0008,
    skyTop: 0x6e7680, skyHorizon: 0xaab0b0, skyBottom: 0x7c827e,
    sunColor: 0xe6e8e4, sunIntensity: 1.3, sunDisk: 0.05,
    clouds: 0.9, cloudLight: 0xbcc0c0, cloudDark: 0x6c7276,
    sunDir: [0.4, 0.5, 0.6],
    hemiSky: 0xc4ccd0, hemiGround: 0x4a4a3c, hemiIntensity: 1.35,
    rimColor: 0xbcc4c8, rimIntensity: 0.2,
    terrain: {
      grass: '#55613a', grassAlt: '#4c5634', dryGrass: '#6c6a46', dirt: '#5a4c38', rock: '#9a9482',
      pasture: '#5a6640', ploughed: '#56483a', stubble: '#6e6a48', meadow: '#5e6a40',
      farmX: [0, 1], farmZ: [0, 1], // (no farmland patchwork: the paddies are painted below)
      roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const rd = roadDist(x, z);
        if (rd < 4) return [0x6a5a44, smoothstep(4, 2, rd) * 0.9];                            // the roads: churned mud
        if (plot(x, z).level >= 0 && paddy(x, z) < 0.3) return [0x6a5c40, 0.8];               // the dykes: trodden mud
        const p = paddy(x, z);
        if (p > 0.3) {
          const t = hash(Math.round(x / PW), Math.round(z / PD));
          return [t < 0.5 ? 0x74827a : 0x66745a, 0.85 * p];                                  // the flooded fields, grey with the sky (some planted green)
        }
        if (inTown(x, z, -8)) return [0x7a7466, 0.6];                                          // the towns: rubble and coral dust
        const [X, U, s] = frame(x, z), c = crestU(X, s);
        const cliff = smoothstep(c - 40, c - 15, U) * smoothstep(c + 5, c - 8, U) * pass(X, s);
        if (cliff > 0.3) return [0xb0a890, cliff * 0.7];                                      // the escarpment: bare coral limestone
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-140, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [-150, 0, 170] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Company' })),
  },


  // weeks of shelling: craters thick on the ridges, scattered over the valley
  battlefield() {
    const density = (x, z) => {
      const [X, U, s] = frame(x, z);
      return 0.12 + 0.9 * smoothstep(70, 10, Math.abs(U - crestU(X, s) + 20)) + (paddy(x, z) > 0.3 ? -0.08 : 0);
    };
    // (shellField scatters one half and mirrors it: keep its first half each time, the second from another seed turned round)
    const half = (seed, f) => shellField(seed, BOUNDS, f).filter((_, i) => i % 2 === 0);
    const blasts = [...half(1945_0511, density), ...half(1945_0512, (x, z) => density(-x, -z)).map(([x, z, r, d]) => [-x, -z, r, d])];
    return { blasts, ruins: [], works: [] };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1945);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const slope = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const CORAL = 0xb4ac98;
    /** A burnt-out tank: hull, turret, gun (scorched), a track thrown. */
    const hulk = (x: number, z: number, yaw: number, color: number) => {
      const g = terrain.heightAt(x, z), fx = Math.sin(yaw), fz = Math.cos(yaw);
      props.box('metal', x, g + 0.9, z, 2.9, 1.5, 5.9, yaw, color);
      props.box('metal', x - fz * 0.2, g + 2, z + fx * 0.2, 2, 0.9, 2.5, yaw + 0.4, color);
      props.box('metal', x + fx * 2.3, g + 2, z + fz * 2.3, 0.16, 0.16, 2.8, yaw + 0.4, 0x2a2826);
      props.box('metal', x + fz * 2, g + 0.2, z - fx * 2, 0.5, 0.35, 5, yaw + 0.3, 0x2a2826);
      cover.addBox({ x, z, yaw, length: 6, thickness: 3, height: 1.8 });
    };
    /** An Okinawan turtleback tomb cut into a slope: the vault, its low wall round the forecourt — the Japanese fought from them. */
    const tomb = (x: number, z: number, yaw: number) => {
      const g = terrain.heightAt(x, z), fx = Math.sin(yaw), fz = Math.cos(yaw);
      props.box('stone', x - fx * 1.5, g + 1.1, z - fz * 1.5, 4.2, 2.6, 3.2, yaw, CORAL);
      props.box('stone', x - fx * 1.5, g + 2.5, z - fz * 1.5, 3.6, 0.6, 2.6, yaw, 0xa49c88);
      props.box('plain', x + fx * 0.12, g + 0.8, z + fz * 0.12, 0.8, 0.9, 0.1, yaw, 0x141210);
      cover.addBox({ x: x - fx * 1.5, z: z - fz * 1.5, yaw, length: 4.2, thickness: 3.2, height: 2.4 });
      props.lowWall({ x: x + fx * 3.2, z: z + fz * 3.2, yaw: yaw + Math.PI / 2, length: 5, height: 1.0, color: CORAL });
    };

    // ---- the towns: Naha and Yonabaru — tile-roofed houses behind coral walls, nearly all ruined, the road through
    TOWNS.forEach((t, k) => {
      const R = mulberry32(4501 + k), cx = t.x, cz = t.z, n = k ? 30 : 26, grid = k ? 0.4 : 0; // (Yonabaru: tighter, its streets turned)
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, d = 10 + R() * (t.r - 16);
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, w = 8 + R() * 6, dp = 7 + R() * 3;
        const yaw = Math.round(R() * 4) * (Math.PI / 2) + grid;
        if (roadDist(x, z) < 9 || Math.hypot(x - cx, z - cz) < 14) continue;
        if (R() < 0.3) props.house({ x, z, yaw, width: w, depth: dp });
        else props.ruinBlock({ x, z, yaw, width: w, depth: dp, storeys: R() < 0.25 ? 2 : 1, ruin: 0.4 + R() * 0.4, name: 'house' });
        if (R() < 0.6) props.lowWall({ x: x + 6, z: z + 6, yaw: yaw + Math.PI / 2, length: 6 + R() * 6, height: 1.4, color: CORAL });
      }
      for (let i = 0; i < 18; i++) props.rubble(cx + (R() - 0.5) * t.r * 1.4, cz + (R() - 0.5) * t.r * 1.4, 0.4 + R() * 0.6, true);
    });

    // ---- Shuri Castle on its ridge: the curving coral walls of the old Ryukyu kings' castle, battered to rubble
    {
      const p = points.find((q) => q.id === 'I')!;
      for (let a = 0; a < Math.PI * 2; a += 0.23) {
        if (Math.abs(Math.sin(a * 1.5)) > 0.94 || Math.abs(a - 4.0) < 0.3) continue; // (the breaches: the gate toward the valley and the shell holes)
        const rad = 27 + Math.sin(a * 3) * 3, x = p.x + Math.cos(a) * rad, z = p.z + Math.sin(a) * rad * 0.75;
        props.wall({ x, z, yaw: Math.PI / 2 - a, length: 6, height: 2.6 + Math.sin(a * 5) * 0.8, thickness: 1.4 });
      }
      for (let i = 0; i < 4; i++) props.ruinBlock({ x: p.x + (i - 1.5) * 13 + 5, z: p.z - 14 - (i % 2) * 6, yaw: 0, width: 10, depth: 8, storeys: 1, ruin: 0.75, name: 'castle hall' });
    }
    // ---- the Maeda Escarpment's crest: coral pinnacles in a ring, cover like Shuri's walls
    {
      const p = points.find((q) => q.id === 'C')!;
      const R = mulberry32(4502);
      for (let a = 0; a < Math.PI * 2; a += 0.35) props.boulder({ x: p.x + Math.cos(a) * (30 + R() * 8), z: p.z + Math.sin(a) * (24 + R() * 6), radius: 1.6 + R() * 1.6 });
    }

    // ---- both ridges: coral outcrops on the faces, tombs on the back slopes, gun pits behind the crest
    // (each side in its own frame: X, U → x = X·m, z = U·m)
    for (const [m, seed, tombs, guns] of [[1, 4503, [-380, -250, -60, 130, 280, 400], [-300, 60, 320]], [-1, 4504, [-410, -230, -40, 90, 210, 380], [-360, 20, 270]]] as const) {
      const R = mulberry32(seed), flip = m > 0 ? 0 : Math.PI;
      for (let i = 0; i < 170; i++) {
        const X = (R() * 2 - 1) * 450, U = crestU(X, m) - 50 + R() * 80, rad = 0.8 + R() * 2.4;
        if (pass(X, m) < 0.5 || near(X * m, U * m, 18)) continue;
        props.boulder({ x: X * m, z: U * m, radius: rad });
      }
      for (const X of tombs) {
        const U = crestU(X, m) + 40 + R() * 40;
        if (roadDist(X * m, U * m) > 12) tomb(X * m, U * m, (m > 0 ? Math.PI : 0) + (R() - 0.5) * 0.6);
      }
      for (const X of guns) {
        for (let k = 0; k < 3; k++) props.sandbagRing({ x: (X + (k - 1) * 16) * m, z: (crestU(X, m) + 60 + (k % 2) * 6) * m, radius: 4, toward: m });
        props.crates({ x: (X + 28) * m, z: (crestU(X, m) + 80) * m, yaw: R() + flip });
      }
    }

    // ---- the valley: burnt-out tanks, broken walls and tombs between the paddies
    for (let i = 0; i < 120; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = (r() * 2 - 1) * 200;
      if (near(x, z, 30) || roadDist(x, z) < 8 || inTown(x, z, 8) || paddy(x, z) > 0.1 || Math.hypot(x, z) < 20) continue;
      const kind = r();
      if (kind < 0.25) hulk(x, z, r() * 6.28, r() < 0.6 ? 0x4b4e34 : 0x6a6440);
      else if (kind < 0.5) tomb(x, z, r() * 6.28);
      else if (kind < 0.75) props.lowWall({ x, z, yaw: r() * 3, length: 5 + r() * 6, height: 1.3, color: CORAL });
      else for (let k = 0; k < 3; k++) props.boulder({ x: x + (r() - 0.5) * 8, z: z + (r() - 0.5) * 8, radius: 0.7 + r() * 1.2 });
    }
    // ---- telegraph poles along the road, most of them shot down
    for (let x = -470; x <= 470; x += 36) {
      const z = roadZ(x) + 8;
      if (inTown(x, z, 4) || r() < 0.4) continue;
      const g = terrain.heightAt(x, z), lean = (r() - 0.5) * 0.5;
      props.box('plain', x, g + 3.2, z, 0.22, 6.4, 0.22, 0, 0x4a3a2a, lean, 0);
    }
    commandPost(props, this.bases.nato, -1, 0x5a5e44);
    commandPost(props, this.bases.pact, 1, 0x6f6a44);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => paddy(x, z) > 0.15 || roadDist(x, z) < 7 }];
    // Ryukyu pines and broadleaf scrub on the back slopes and the hills beyond, shell-thinned on the crests; a few in the towns
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, broadleaf: 0.6, autumn: 0, maxY: 80,
      forest: (x: number, z: number) => {
        if (inTown(x, z)) return 0.04;
        const [X, U, s] = frame(x, z), c = crestU(X, s);
        if (slope(x, z) > 0.8) return -1;
        const edge = Math.max(smoothstep(420, 480, Math.abs(x)), smoothstep(520, 560, Math.abs(z)));
        return Math.max(edge, U > c + 30 ? 0.35 * smoothstep(0.0, 0.3, fbm(noise, x * 0.01 + 3, z * 0.01, 2) + 0.15) : U > c - 40 ? 0.05 : 0.1);
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.6 });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
