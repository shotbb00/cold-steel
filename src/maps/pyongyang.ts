// Pyongyang, autumn 1985 (the big field, 1.0 × 1.12 km): the southern approaches to the North’s capital in the war of
// 1985 that never came — the ROK and the US 2nd Infantry Division, having broken the KPA on the DMZ, come up the
// Chunghwa road to the Taedong and the city across it. The Taedong runs across the middle of the map, 40 m of deep water
// behind stone embankments; Yanggak island lies in it downstream (west), Rungra island upstream (east), each between two
// arms. Over it: the Yanggak bridge across both arms onto Yanggak island, the old Taedong bridge in the middle, the
// Okryu bridge upstream, and the gravel bars by Rungra where the new bridge is still only planned (fords). South of the
// river the new districts the ROK come through — Sonkyo’s apartment blocks round the Juche tower (1982), the Rakrang
// tomb mounds on their knoll (west), the ridge at the end of Mirim airfield with its shelters (east); north of it the
// centre — Kim Il Sung Square and the Grand People’s Study House, the Taedong gate on the bank, Mansu hill with the
// Grand Monument (west), Moranbong with the Chollima statue and the Ulmil pavilion (east). Rice paddies, still wet at
// the harvest, round the outskirts at both ends (soft). The ROK and US hold the south (+z: the Chunghwa road), the KPA
// the north (the Sunan road).
// Fairness: not a mirror — the Taedong wanders, the two islands lie at different places and sizes, the city blocks are
// each half’s own dice, the knolls sit at their own spots — but the river lies across the middle so both sides reach it
// alike, each island and the Taedong bridge sit on the river (equal from both bases), the Okryu bridge links the two
// central points (Juche tower and the Square) at the same length, each side has a west knoll of 20 m and an east knoll
// of 22 m with a monument on top at about the same distance from its base, and the points lie at about the same
// distances (measured: tools/map_fairness.py).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const LAND = 4;         // the city’s level
const HW = 20;          // the Taedong’s half-width
const noise = createNoise2D(1985_81);

// ---- the Taedong: across the middle, splitting round Yanggak (west) and Rungra (east)
const zR = (x: number) => 12 * Math.sin(x * 0.006 + 0.5) + 7 * Math.sin(x * 0.015);
const YANGGAK = -250, RUNGRA = 330;
const split = (x: number) => 62 * smoothstep(150, 80, Math.abs(x - YANGGAK)) + 58 * smoothstep(160, 90, Math.abs(x - RUNGRA));
const chanN = (x: number) => zR(x) - split(x);
const chanS = (x: number) => zR(x) + split(x);
const OKRYU = 150;
const river = createRiver({
  path: chanN, paths: [chanN, chanS], halfWidth: HW, level: 0, depth: 3, valley: 34,
  crossings: [
    { name: 'Yanggak bridge (north arm)', x: YANGGAK, kind: 'bridge', width: 14, channel: 0 },
    { name: 'Yanggak bridge (south arm)', x: YANGGAK, kind: 'bridge', width: 14, channel: 1 },
    { name: 'Taedong bridge', x: 0, kind: 'bridge', width: 14, channel: 0 },
    { name: 'Okryu bridge', x: OKRYU, kind: 'bridge', width: 14, channel: 0 },
    { name: 'Rungra bars (north arm)', x: RUNGRA, kind: 'ford', width: 18, channel: 0 },
    { name: 'Rungra bars (south arm)', x: RUNGRA, kind: 'ford', width: 18, channel: 1 },
  ],
});
const riverD = (x: number, z: number) => river.project(x, z).d;
/** On an island: metres inside it from the nearer arm’s middle (> 0). */
const islandD = (x: number, z: number) => split(x) - Math.abs(z - zR(x));

// ---- roads: the Chunghwa road – Sunan road over the Taedong bridge, the west road over Yanggak, the east road over the Rungra bars
const ROADS: number[][][] = [
  [[0, 530], [0, 470], [25, 360], [60, 200], [60, 130], [10, 60], [0, 30], [0, -30], [-25, -100], [-30, -150], [-60, -260], [-20, -380], [0, -470], [0, -530]],
  [[0, 470], [-200, 420], [-360, 260], [-300, 150], [YANGGAK, 95], [YANGGAK, -110], [YANGGAK, -270], [-180, -400], [0, -470]],
  [[0, 470], [200, 420], [300, 320], [RUNGRA, 150], [RUNGRA, -120], [RUNGRA, -280], [200, -410], [0, -470]],
  [[60, 130], [OKRYU, 80], [OKRYU, -80], [-30, -150]],                                                // over the Okryu bridge
  [[-360, 260], [60, 130]], [[60, 130], [300, 320]],                                                  // the south’s laterals
  [[YANGGAK, -270], [-30, -150]], [[-30, -150], [RUNGRA, -280]],                                       // the north’s laterals
  [[-300, 150], [-120, 120], [10, 60]], [[YANGGAK, -150], [-120, -110], [-25, -100]],                  // riverside streets
  [[-200, 200], [-180, 360]], [[170, 230], [200, 420]], [[-150, -230], [-190, -340]], [[180, -210], [140, -370]], // the districts’ own streets
];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Chunghwa road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Rakrang', x: -360, z: 260, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Juche tower', x: 60, z: 130, owner: null, sector: 'centre', radius: 26 },
  { id: 'D', name: 'Mirim', x: 300, z: 320, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Yanggak island', x: YANGGAK, z: Math.round(zR(YANGGAK)), owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Taedong bridge', x: 0, z: Math.round(zR(0)), owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Rungra island', x: RUNGRA, z: Math.round(zR(RUNGRA)), owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Mansu hill', x: YANGGAK, z: -270, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Kim Il Sung Square', x: -30, z: -150, owner: null, sector: 'centre', radius: 30 },
  { id: 'J', name: 'Moranbong', x: RUNGRA, z: -280, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Sunan road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// the knolls and rolls, each half its own: [x, z, radius, height] (the four flank knolls first: 20 m west, 22 m east a side)
const HILLS = [[-360, 260, 70, 20], [300, 320, 66, 22], [YANGGAK, -270, 68, 20], [RUNGRA, -280, 64, 22],
  [-150, 420, 50, 9], [-440, 460, 70, 14], [440, 470, 70, 16], [160, -410, 55, 10], [-450, -450, 70, 15], [450, -460, 66, 15]];
const BIG_HILLS = { nato: [[-360, 260], [300, 320]], pact: [[YANGGAK, -270], [RUNGRA, -280]] };
const MOUNDS = [[-410, 300, 9, 3], [-395, 322, 8, 2.6], [-320, 305, 9, 3], [-405, 220, 7, 2.4]]; // the Rakrang (Lelang) tombs
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d = (Math.hypot(x - hx, z - hz) / r) * warp(x, z);
    h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  return h;
}

/** The city: both banks between the outskirts, off the river’s embankments. */
const townK = (x: number, z: number) => smoothstep(450, 410, Math.abs(x) + 30 * fbm(noise, x * 0.01 + 7, z * 0.01, 2)) * smoothstep(300, 260, Math.abs(z) + 30 * fbm(noise, x * 0.01, z * 0.01 - 7, 2)) * smoothstep(HW + 26, HW + 40, riverD(x, z)) * (islandD(x, z) > -HW ? 0 : 1);
/** Kim Il Sung Square and the Juche tower’s plaza: paved. */
const plazaK = (x: number, z: number) => Math.max(smoothstep(55, 45, Math.hypot(x + 30, (z + 150) * 1.3)), smoothstep(40, 32, Math.hypot(x - 75, z - 118)));
/** The rice paddies: the flat outskirts beyond the city, away from the knolls, roads and points. */
function paddyK(x: number, z: number) {
  if (roadDist(x, z) < 8 || nearPoint(x, z, 40)) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(250, 320, Math.abs(z))
    * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x)) * smoothstep(55, 70, Math.hypot(x, Math.abs(z) - BASE_Z));
}

function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = LAND + n * 1.5 * (1 - 0.6 * townK(x, z)) + hillH(x, z);
  for (const [mx, mz, r, a] of MOUNDS) h += a * smoothstep(r, r * 0.3, Math.hypot(x - mx, z - mz));
  const pk = paddyK(x, z);
  if (pk > 0) h += (LAND + Math.round(n * 5) * 0.25 - h) * pk;                     // terraced paddies
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * (20 + ridged(noise, x * 0.01, z * 0.01, 3) * 24);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14;
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const paddyC = gridCache((x: number, z: number) => paddyK(x, z), BOUNDS);
const townC = gridCache(townK, BOUNDS);
const soft = (x: number, z: number, foot: boolean) => { const pk = paddyC(x, z); return pk <= 0.05 ? 1 : 1 - pk * (foot ? 0.3 : 0.55); }; // (October: the rice ripe, the fields still wet)
/** Pine and oak on the knolls, willows on the islands. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(5, 12, hillH(x, z)), smoothstep(HW + 2, HW + 16, islandD(x, z)) * 0.7)
  * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
const bund = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return Math.min(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11)) > 13.6;
};

export default {
  id: 'pyongyang',
  name: 'Pyongyang',
  description: 'The southern approaches to Pyongyang, autumn 1985: the ROK and US reach the Taedong — its bridges and the Yanggak and Rungra islands, the apartment blocks and monuments of both banks, Mansu hill and Moranbong, the ridge over Mirim airfield and the wet rice paddies of the outskirts.',
  epochs: ['1985'],
  region: 'korea',
  armies: { nato: ['rok', 'us'], pact: ['kpa'] }, // (the ROK and the US 2nd Infantry Division against the Korean People’s Army)
  sides: { nato: 'South Korea', pact: 'North Korea' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  soft,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a hazy late-October day over the city, the willows turning, the rice gold
    fogColor: 0xc0c2c0, fogDensity: 0.0012,
    skyTop: 0x5478a6, skyHorizon: 0xd4d6d4, skyBottom: 0x807c6c,
    sunColor: 0xfff0dc, sunIntensity: 1.9, sunDisk: 0.4,
    clouds: 0.4, cloudLight: 0xf2f0ec, cloudDark: 0x9a9ea4,
    sunDir: [0.35, 0.6, 0.6],
    hemiSky: 0xc8d0dc, hemiGround: 0x5e5a40, hemiIntensity: 1.3,
    rimColor: 0xd4d6d8, rimIntensity: 0.2,
    terrain: {
      grass: '#68703c', grassAlt: '#5e6836', dryGrass: '#9a8a54', dirt: '#6e5a40', rock: '#787468',
      pasture: '#68703c', ploughed: '#5e4a34', stubble: '#a08e56', meadow: '#727a42',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < (townC(x, z) > 0.5 ? 6 : 4)) return [0x76736c, 0.86];                // asphalt
        if (plazaK(x, z) > 0.5) return [0xb4ae9e, 0.85];                                         // the squares’ paving
        if (townC(x, z) > 0.6) return [0x8c867a, 0.6];                                           // yards and courts between the blocks
        if (riverD(x, z) < HW + 8 && y < 2.2) return [0x8a8676, 0.7];                            // the embankments’ stone
        if (riverD(x, z) < HW + 22 && y < 2.2) return [0xa89e82, 0.75];                          // sand and gravel
        const pk = paddyC(x, z);
        if (pk > 0.3) {
          if (bund(x, z)) return [0x6a6a3a, 0.8];                                                 // the bunds
          const k = noise(x * 0.04, z * 0.04);
          return [k > 0.3 ? 0xa89a48 : k > -0.3 ? 0xb8a650 : 0x8a8a44, pk * 0.85];                 // ripe rice, a few fields still green
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1st Platoon', facing: 0 }],
  },

  // trenches and MG nests on each side’s two flank knolls, a dug-in post at its own end of the Okryu bridge
  battlefield() {
    const works: any[] = [];
    for (const [f, m] of [['nato', 1], ['pact', -1]] as const) {
      for (const [hx, hz] of BIG_HILLS[f]) {
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + (m > 0 ? 0.2 : 0.7), x = hx + Math.cos(ang) * 32, z = hz + Math.sin(ang) * 32;
          if (roadDist(x, z) < 6) continue;
          works.push({ kind: a % 2 ? 'mgNest' : 'trench', x, z, yaw: Math.atan2(Math.cos(ang), Math.sin(ang)), faction: f });
        }
      }
      works.push({ kind: 'trench', x: OKRYU + 30 * m, z: zR(OKRYU) + m * 62, yaw: m > 0 ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);
    const free = (x: number, z: number, r: number) => roadDist(x, z) > 7 + r && riverD(x, z) > HW + 12 + r && islandD(x, z) < -HW - r
      && !nearPoint(x, z, 26 + r) && plazaK(x, z) < 0.05 && hillH(x, z) < 5 && Math.hypot(x, Math.abs(z) - BASE_Z) > 45;
    const ground = (x: number, z: number) => terrain.heightAt(x, z);

    // ---- the city: rows of five- to eight-storey apartment blocks, shop houses along the streets (each half its own dice)
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_82 + m);
      const r = props.rand, sx = m > 0 ? 38 : 42, sz = m > 0 ? 30 : 27;
      for (let gx = -430; gx <= 430; gx += sx) for (let gz = 50; gz <= 290; gz += sz) {
        const x = gx + (r() - 0.5) * 6, z = m * gz + (r() - 0.5) * 5;
        if (townC(x, z) < 0.6 || r() < 0.25) continue;
        const yaw = r() < 0.75 ? 0 : Math.PI / 2;
        if (r() < 0.65) { if (free(x, z, 13)) props.ruinBlock({ x, z, yaw, width: 22 + r() * 6, depth: 11, storeys: 5 + Math.floor(r() * 4), ruin: 0, name: 'apartment block' }); }
        else if (free(x, z, 6)) props.flatHouse({ x, z, yaw, width: 9 + r() * 3, depth: 8 + r() * 2, storeys: 2, name: 'shop house' });
      }
    }
    props.rand = mulberry32(1985_84);
    // ---- the Juche tower: the tapering granite shaft and its red flame, by the plaza
    {
      const x = 80, z = 116, g = ground(x, z);
      props.box('stone', x, g + 1, z, 14, 2, 14, 0.2, 0x9a968c);
      for (let i = 0; i < 12; i++) props.box('stone', x, g + 2 + 2.25 + i * 4.5, z, 6.6 - i * 0.28, 4.5, 6.6 - i * 0.28, 0.2, 0xc8c2b4);
      props.box('stone', x, g + 2 + 54 + 1, z, 4.2, 2, 4.2, 0.2, 0x7a7670);
      props.box('stone', x, g + 2 + 56 + 2.5, z, 2.6, 5, 2.6, 0.2, 0xd0402a);
      cover.addCylinder({ x, z, radius: 4, height: 56 });
    }
    // ---- Kim Il Sung Square: the Grand People’s Study House over its north-east corner
    props.hall({ x: 40, z: -212, yaw: 0, width: 56, depth: 24, height: 12, color: 0xd6d0be, roof: 0x3e6a54, door: 10, name: 'Grand People’s Study House' });
    // ---- the Taedong gate on the north bank by the old bridge
    { const x = -48, z = zR(-48) - 52; props.box('stone', x, ground(x, z) + 2.5, z, 16, 5, 9, 0, 0x8a867c);
      props.hall({ x, z, yaw: 0, width: 14, depth: 8, height: 3, color: 0x8a3a2a, roof: 0x3e4644, door: 0, name: 'Taedong gate' }); }
    // ---- the Okryu restaurant on the north bank by its bridge
    props.hall({ x: OKRYU + 44, z: zR(OKRYU) - 62, yaw: 0, width: 26, depth: 14, height: 5, color: 0xd8d2c0, roof: 0x3e6a54, door: 6, name: 'Okryu restaurant' });
    // ---- Mansu hill: the Grand Monument, the bronze figure before its mural
    { const x = YANGGAK + 14, z = -270 + 12, g = ground(x, z);
      props.box('stone', x, g + 1, z, 12, 2, 7, 0, 0x9a968c);
      props.box('metal', x, g + 2 + 4.5, z, 2.4, 9, 1.6, 0, 0x8a6a34);
      props.box('stone', x, g + 4, z - 9, 34, 8, 1.4, 0, 0xc8bea8);
      cover.addBox({ x, z: z - 9, yaw: 0, length: 34, thickness: 1.4, height: 8 }); cover.addCylinder({ x, z, radius: 2, height: 11 }); }
    // ---- Moranbong: the Chollima statue on its pedestal, the Ulmil pavilion
    { const x = RUNGRA - 14, z = -280 - 10, g = ground(x, z);
      props.box('stone', x, g + 5, z, 5, 10, 5, 0, 0x9a968c);
      props.box('metal', x, g + 11.4, z, 6, 2.2, 1.8, 0.3, 0x7a5a30);
      props.box('metal', x - 1, g + 13.4, z, 3.6, 0.4, 4.6, 0.3, 0x7a5a30, 0.3);
      cover.addCylinder({ x, z, radius: 3, height: 13 });
      props.hall({ x: RUNGRA + 20, z: -280 + 14, yaw: -0.4, width: 9, depth: 7, height: 3.5, color: 0x8a3a2a, roof: 0x3e5a4a, door: 3, name: 'Ulmil pavilion' }); }
    // ---- Rakrang: a shrine by the tomb mounds
    props.hall({ x: -380, z: 280, yaw: 0.25, width: 10, depth: 7, height: 4, color: 0x8a3a2a, roof: 0x3e4a44, door: 3, name: 'Rakrang tomb shrine' });
    // ---- Mirim: the airfield’s end below the ridge, its shelters and tower
    props.aircraftShelter({ x: 440, z: 240, yaw: -Math.PI / 2 });
    props.aircraftShelter({ x: 440, z: 300, yaw: -Math.PI / 2 });
    props.controlTower({ x: 420, z: 380, yaw: -Math.PI / 2 });
    // ---- the islands: Yanggak’s pavilion, Rungra’s park hall
    props.hall({ x: YANGGAK + 40, z: zR(YANGGAK + 40) + 4, yaw: 0, width: 10, depth: 7, height: 3.5, color: 0x8a3a2a, roof: 0x3e5a4a, door: 3, name: 'Yanggak pavilion' });
    props.hall({ x: RUNGRA + 50, z: zR(RUNGRA + 50) - 6, yaw: 0, width: 14, depth: 8, height: 4, color: 0xd0caba, roof: 0x3e6a54, door: 4, name: 'Rungra park hall' });
    // ---- the outskirts: farmsteads and straw stacks in the paddies (each half its own dice), masts on the knolls
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_85 + m);
      const r = props.rand;
      for (let i = 0; i < 60; i++) {
        const x = (r() * 2 - 1) * 460, z = (280 + r() * 240) * m;
        if (paddyC(x, z) < 0.5 || !free(x, z, 4)) continue;
        if (r() < 0.3) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 6, height: 2.8 });
        else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 3) });
      }
      for (const [hx, hz] of BIG_HILLS[m > 0 ? 'nato' : 'pact']) props.mast({ x: hx - 12 * m, z: hz + 9 * m, height: 10 });
    }
    props.rand = mulberry32(1985_86);
    for (const c of river.crossings) if (c.kind === 'bridge' && c.channel === 0 && c.x !== YANGGAK) for (const s of [1, -1]) props.sandbagRing({ x: c.x + 16 * s, z: c.z + s * 44, radius: 4.5, toward: -s });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || paddyC(x, z) > 0.2 || townC(x, z) > 0.3 || plazaK(x, z) > 0.05 || riverD(x, z) < HW + 14 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 9000, broadleaf: 0.6, autumn: 0.5, maxY: LAND + 120,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grass.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
