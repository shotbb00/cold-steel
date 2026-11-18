// Kohima, April–May 1944 (1945 only; the big field, 1.0 × 1.12 km; Burma: the 14th Army against the Imperial Japanese
// Army's 31st Division). Kohima ridge stands across the road from Dimapur to Imphal, the only way the Japanese "March on
// Delhi" could go: a narrow spine of steep, terraced, jungled hills — Garrison Hill, Kuki Piquet, the Field Supply Depot,
// Jail Hill — with the road winding round it and over the saddle by the Deputy Commissioner's bungalow. For a fortnight
// the garrison held on Garrison Hill with the Japanese in the bungalow's garden, the DC's tennis court between them as
// no-man's-land, grenades thrown across it at a few yards. Here the spine runs the length of the field (z), the tennis
// court on the saddle in its middle, and each side holds its end of the ridge with the spurs that run off it — Hospital
// Spur and the Naga village for the British (from Zubza, +z), GPT Ridge and Treasury Hill for the Japanese (from the
// Aradura Spur, -z). Not mirrored, but fair: the British get Garrison Hill, the long Hospital Spur and the Naga
// village's broad hilltop; the Japanese Jail Hill (as high), the wider, lower GPT Ridge and Treasury Hill's steep knoll;
// the road winds its own way and each point is about as far from one base as its counterpart is from the other.
// Monsoon green, mist in the valleys.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, shellField, trenchLine } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1944_04);

/** The Dimapur–Imphal road (x at z): round the ridge's east flank in the north, over the saddle at the bungalow, round the west in the south. */
export const roadX = (z: number) => 150 * Math.sin(z * 0.0058) + 30 * (1 - Math.cos(z * 0.009));
const roadDist = (x: number, z: number) => Math.abs(x - roadX(z)) / Math.hypot(1, 150 * 0.0058 * Math.cos(z * 0.0058) + 30 * 0.009 * Math.sin(z * 0.009));

// the hills: [ax, az, bx, bz, width, height] — a ridge from a to b, gaussian across (`width` m), plus knolls [x, z, r, h]
const SPINE: number[][] = [                                               // Kohima ridge itself, kinking north of the saddle
  [0, 0, 0, 440, 60, 24], [0, 0, 45, -255, 60, 24], [45, -255, 5, -440, 64, 23],
];
const SPURS: number[][] = [
  [0, 240, -330, 275, 42, 19],     // Hospital Spur, west off Garrison Hill
  [10, 300, 330, 270, 46, 14],     // the spur out to the Naga village
  [0, 95, -150, 115, 32, 12],      // Kuki Piquet's spur
  [40, -240, -259, -192, 58, 16],  // GPT Ridge: wider and lower, running west off Jail Hill
  [50, -270, 352, -311, 38, 14],   // the spur to Treasury Hill
  [25, -140, 239, -163, 34, 12],   // FSD Hill's spur
];
const KNOLLS: number[][] = [
  [0, 255, 65, 22],                // Garrison Hill: the ridge's top
  [-330, 275, 50, 8],
  [330, 270, 70, 9],               // the Naga village's broad hilltop
  [-150, 115, 30, 5],
  [0, 60, 40, -6],                 // the saddle dips toward the bungalow…
  [45, -255, 55, 18],              // Jail Hill
  [-259, -192, 80, 7],             // GPT Ridge's long back
  [352, -311, 42, 12],             // Treasury Hill: a steep knoll
  [239, -163, 34, 5],
  [6, -55, 46, -6],                // …and toward the DC's garden on the other side
];
const both = (list: number[][], f: (x: number, z: number, p: number[]) => number, x: number, z: number) =>
  list.reduce((s, p) => s + f(x, z, p), 0);
const seg = (x: number, z: number, [ax, az, bx, bz, w, h]: number[]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return h * Math.exp(-((Math.hypot(x - ax - dx * t, z - az - dz * t) / w) ** 2));
};
const knoll = (x: number, z: number, [kx, kz, r, h]: number[]) => h * Math.exp(-((Math.hypot(x - kx, z - kz) / r) ** 2));

const COURT = { x: 0, z: 0, level: 0 }; // the tennis court: levelled on the saddle (its height below)
/** The valley floor and the spine only: the grade the road keeps where it cuts through a spur. */
const lowGround = (x: number, z: number) => 6 + fbm(noise, x * 0.004, z * 0.004, 3) * 3 + Math.max(...SPINE.map((p) => seg(x, z, p))) + smoothstep(420, 520, Math.abs(x)) * 30;

function height(x: number, z: number) {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = lowGround(x, z) + both(SPURS, seg, x, z) + both(KNOLLS, knoll, x, z);
  h += fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 2.2 * smoothstep(8, 20, h);                     // broken ground on the hills
  // the terraces the Nagas cut into every slope: steps of about 2 m, softened
  const step = 2.2, k = h / step, fr = k - Math.floor(k);
  const terr = (Math.floor(k) + smoothstep(0.55, 1, fr)) * step;
  h += (terr - h) * 0.55 * smoothstep(10, 16, h) * smoothstep(48, 40, h);
  h += smoothstep(600, 680, az) * 14;                                                              // the hills beyond the ends
  // the road: cut into the spurs, a bench along the hillside
  const rd = roadDist(x, z);
  if (rd < 16) h += (Math.min(h, lowGround(x, z) + 1.5) - h) * smoothstep(16, 6, rd);
  // levelled: the bases, the tennis court
  for (const bz of [BASE_Z, -BASE_Z]) h += (10 - h) * smoothstep(36, 20, Math.hypot(x, z - bz));
  if (ax < 40 && az < 40) h += (COURT.level - h) * smoothstep(26, 14, Math.hypot(x, z));
  return h;
}
COURT.level = lowGround(0, 0) + both(SPURS, seg, 0, 0) + both(KNOLLS, knoll, 0, 0);

/** The jungle: thick on the slopes, thinner on the shelled hilltops and the terraces round the villages. */
const jungle = (x: number, z: number) => smoothstep(-0.25, 0.1, fbm(noise, x * 0.006 - 4, z * 0.006 + 3, 3) * 1.4);

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: 'B Company, 4th Royal West Kents' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Zubza', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Hospital Spur', x: -330, z: 275, owner: null, sector: 'west' },
  { id: 'C', name: 'Garrison Hill', x: 0, z: 255, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Naga Village', x: 330, z: 270, owner: null, sector: 'east' },
  { id: 'E', name: 'Kuki Piquet', x: -150, z: 115, owner: null, sector: 'west' },
  { id: 'F', name: 'The tennis court', x: 0, z: 0, owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'FSD Hill', x: 239, z: -163, owner: null, sector: 'east' },
  { id: 'H', name: 'GPT Ridge', x: -259, z: -192, owner: null, sector: 'west' },
  { id: 'I', name: 'Jail Hill', x: 45, z: -255, owner: null, sector: 'centre', radius: 26 },
  { id: 'J', name: 'Treasury Hill', x: 352, z: -311, owner: null, sector: 'east' },
  { id: 'K', name: 'Aradura Spur', x: -40, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'kohima',
  name: 'Kohima',
  description: 'April 1944: the 14th Army holds the jungled ridge across the Imphal road — Garrison Hill, Kuki Piquet, Jail Hill — and the DC’s tennis court between the lines. Monsoon mist on the terraced slopes.',
  epochs: ['1945'],
  region: 'pacific',                                   // (the menu's Asia & Pacific: maps/index.js REGIONS)
  pacific: true,                                       // (data/factions.js armiesFrom: the Imperial Army fights here)
  sides: { nato: 'Britain', pact: 'Japan' },
  armies: { nato: ['brit14'], pact: ['jp'] },
  airfields: [],                                       // (no strip on the ridge: the RAF's Hurricanes and Dakotas come from Dimapur and Imphal)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.55, // (vehicles: the road, the saddle and the gentler spurs; the steep terraced faces are for men)
  seed: 1944,
  height,
  woods: (x: number, z: number) => jungle(x, z) * 0.9,

  theme: {
    // the monsoon breaking: low grey cloud on the hills, mist in the valleys, everything wet and green
    fogColor: 0xa4aca4, fogDensity: 0.0016,
    skyTop: 0x7c8a90, skyHorizon: 0xb4bcb6, skyBottom: 0x8a948c,
    sunColor: 0xeef0e4, sunIntensity: 1.3, sunDisk: 0.05,
    clouds: 0.85, cloudLight: 0xc8ccc8, cloudDark: 0x7a807e,
    sunDir: [0.35, 0.6, 0.5],
    hemiSky: 0xc0c8c4, hemiGround: 0x3e4632, hemiIntensity: 1.35,
    rimColor: 0xc4ccc8, rimIntensity: 0.2,
    terrain: {
      grass: '#4e6a30', grassAlt: '#46602c', dryGrass: '#6a7440', dirt: '#6a4a30', rock: '#6a6656',
      pasture: '#567234', ploughed: '#5e4430', stubble: '#6e7444', meadow: '#58742f',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,   // (no farmland patchwork, no straight tracks: the road is painted below)
      surface(x: number, z: number) {
        const rd = roadDist(x, z);
        if (rd < 4.5) return [0x7a5a3a, smoothstep(4.5, 2.5, rd) * 0.9];                           // the road: red laterite mud
        if (Math.abs(x - 6) < 9 && Math.abs(z + 4) < 16) return [0x8a5a3a, 0.85];                     // the tennis court: red clay
        const bare = smoothstep(0.5, 0.15, jungle(x, z));
        return bare > 0.3 ? [0x5a4a32, bare * 0.35] : null;                                          // shell-churned earth where the jungle is gone
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-160, 0, 160] }, pact: { x: 0, z: -BASE_Z, entries: [-160, 0, 160] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '58th Regiment' })),
  },

  /** A fortnight of mortaring on the hilltops; each side dug in on its end of the ridge and on its spurs. */
  battlefield() {
    const density = (x, z) => 0.05 + 0.6 * smoothstep(14, 30, height(x, z)) + 0.8 * smoothstep(60, 0, Math.hypot(x, z));
    // (shellField scatters one half and mirrors it: keep its first half each time, the second from another seed turned round)
    const half = (seed, f) => shellField(seed, BOUNDS, f).filter((_, i) => i % 2 === 0);
    const blasts = [...half(1944_0405, density), ...half(1944_0406, (x, z) => density(-x, -z)).map(([x, z, r, d]) => [-x, -z, r, d])];
    const works: any[] = [];
    const lines: [string, [number, number][]][] = [
      ['nato', [[-40, 215], [-15, 205], [15, 205], [40, 215]]],        // Garrison Hill, its face toward the court
      ['nato', [[-170, 95], [-150, 88], [-130, 95]]],                    // Kuki Piquet
      ['nato', [[-360, 250], [-330, 244], [-300, 250]]],                 // Hospital Spur
      ['nato', [[300, 240], [330, 234], [360, 240]]],                    // the Naga village
      ['pact', [[81, -221], [56, -212], [26, -214], [1, -226]]],         // Jail Hill (lines run left to right as their owner faces south)
      ['pact', [[259, -141], [239, -135], [217, -143]]],                 // FSD Hill
      ['pact', [[-219, -160], [-249, -168], [-284, -164], [-309, -174]]], // GPT Ridge, longer
      ['pact', [[375, -292], [352, -286], [329, -292]]],                 // Treasury Hill
    ];
    for (const [f, l] of lines) works.push(...trenchLine(l, f, { zig: 1, belts: 0 }));
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const TIN = 0x6a6a62, THATCH = 0x8a7a50;
    /** A basha: a bamboo hut on stilts under a thatch roof (the Naga houses, the depots' stores). */
    const basha = (x: number, z: number, yaw: number, w: number, d: number) => {
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 1.2, z, w, 1.6, d, yaw, 0x7a6a48);
      props.box('plain', x, g + 2.4, z, w + 1, 0.9, d + 1.2, yaw, THATCH);
      cover.addBox({ x, z, yaw, length: d, thickness: w, height: 2 });
    };

    // ---- the tennis court on the saddle: the court's wire, the DC's bungalow below it, the club on the other side
    {
      const g = terrain.heightAt(6, -4);
      for (const [lx, lz, sx, sz] of [[6, -20, 18, 0.08], [6, 12, 18, 0.08], [-3, -4, 0.08, 32], [15, -4, 0.08, 32], [6, -4, 18, 0.06]]) props.box('plain', lx, g + 0.03, lz, sx, 0.02, sz, 0, 0xd8d4c4); // (the lines, then the net)
      props.box('plain', 6, g + 0.5, -4, 18, 0.9, 0.05, 0, 0x2a2a26);
      for (let i = 0; i < 7; i++) props.box('plain', -5, g + 1.6, -20 + i * 5.5, 0.1, 3.2, 0.1, 0, 0x3a3a36); // the stop-netting's posts
      props.house({ x: 34, z: -26, yaw: 0.2, width: 12, depth: 9 });             // the Deputy Commissioner's bungalow (the Japanese side of the court)
      props.house({ x: -30, z: 28, yaw: 0.2 + Math.PI, width: 10, depth: 8 });   // the Kohima Club
    }

    const R = mulberry32(1944);
    // ---- the Naga village: bashas on its broad hilltop, the terraced fields round it; on Treasury Hill a few, steeper
    for (const [cx, cz, n, spread] of [[330, 270, 16, 40], [352, -311, 9, 26]]) {
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, d = 12 + R() * spread;
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (near(x, z, 10) || roadDist(x, z) < 10) continue;
        basha(x, z, a, 5 + R() * 2, 7 + R() * 3);
      }
    }
    // ---- long tin-roofed huts: the hospital on its spur, the stores of the supply depot on Kuki Piquet's; the GPT
    // (General Purpose Transport) lines on their ridge, the Field Supply Depot's sheds
    for (const [x, z, yaw] of [[-300, 290, 0.1], [-355, 262, 0.15], [-325, 300, 0.1], [-130, 128, 0.4], [-168, 100, 0.4],
      [-229, -177, 0.35], [-269, -207, 0.3], [-299, -182, 0.3], [-203, -160, 0.4], [221, -173, -0.2], [257, -181, -0.2]]) {
      if (near(x, z, 9)) continue;
      props.hall({ x, z, yaw, width: 16, depth: 7, height: 3.2, color: 0x6a6450, roof: TIN, door: 3, name: 'hut' });
    }
    // ---- Kohima's houses along the road below Garrison Hill, and the bazaar's north of the saddle: tin roofs, timber walls
    for (let i = 0; i < 22; i++) {
      const z = i < 10 ? 150 + i * 24 + R() * 8 : -80 - (i - 10) * 19 - R() * 8, side = R() < 0.5 ? -1 : 1, x = roadX(z) + side * (11 + R() * 6);
      if (near(x, z, 14)) continue;
      props.house({ x, z, yaw: Math.atan2(150 * 0.0058 * Math.cos(z * 0.0058), 1) + Math.PI / 2, width: 7 + R() * 2, depth: 6 + R() });
    }
    // ---- the telegraph line along the road
    for (let z = -520; z < 520; z += 40) {
      if (Math.abs(z) < 30) continue;
      const x = roadX(z) + 9, g = terrain.heightAt(x, z);
      props.box('plain', x, g + 3.5, z, 0.22, 7, 0.22, 0, 0x4a3a2a);
      props.box('plain', x, g + 6.6, z, 1.6, 0.12, 0.12, 0, 0x4a3a2a);
    }
    // ---- the positions on the hilltops: sandbagged pits; the stripped trees of Garrison Hill and Jail Hill
    for (const [x, z] of [[-20, 240], [22, 248], [0, 275], [-150, 120], [-330, 262], [330, 252]]) props.sandbagRing({ x, z, radius: 4, toward: 1 });
    for (const [x, z] of [[23, -237], [65, -247], [45, -277], [239, -151], [-239, -177], [-279, -182], [352, -298]]) props.sandbagRing({ x, z, radius: 4, toward: -1 });
    for (const [cx, cz] of [[0, 255], [45, -255]]) {
      for (let i = 0; i < 26; i++) {
        const x = cx + (R() - 0.5) * 90, z = cz + (R() - 0.5) * 70, g = terrain.heightAt(x, z), h = 2 + R() * 5;
        if (near(x, z, 8)) continue;
        props.box('plain', x, g + h / 2, z, 0.35, h, 0.35, R() * 3, 0x3a3228, (R() - 0.5) * 0.3); // shattered trunks
      }
    }
    // ---- each side's supply drops on its back slopes: the parachutes' crates
    for (let i = 0; i < 5; i++) props.crates({ x: -60 + i * 30, z: 400 + R() * 30, yaw: R() * 3 });
    for (let i = 0; i < 5; i++) props.crates({ x: -90 + i * 34, z: -390 - R() * 40, yaw: R() * 3 });

    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x6a6444);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 8 || Math.hypot(x, z) < 45 }];
    // the jungle: broadleaf, dense on the slopes, cleared on the shelled hilltops and round the villages
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 9000, broadleaf: 1, autumn: 0, maxY: 90, size: 1.15,
      forest: (x: number, z: number) => {
        if (roadDist(x, z) < 9 || near(x, z, 34)) return -1;
        return jungle(x, z) > 0.5 ? 1 : jungle(x, z) * 0.2;
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: null });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
