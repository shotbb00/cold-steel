// Saipan, June–July 1944 (1945 only; the big field, 1.0 × 1.12 km; the Pacific: the 2nd and 4th Marine Divisions
// against the Imperial Japanese Army's 43rd Division). The Marines landed at Charan Kanoa on 15 June, under the
// sugar mill's chimney, and fought north up an island of sugar-cane fields cut by the narrow-gauge cane railway, past
// the marsh round Lake Susupe and Hill 500, into the wreck of Garapan on the west coast and up the slopes of Mount
// Tapochau in the middle — limestone cliffs and caves where General Saito's men held every gully: Death Valley under
// Purple Heart Ridge in the east, Hell's Pocket, Paradise Valley where Saito's last command post was. On 7 July the
// last three thousand came down the Tanapag plain in the war's biggest banzai charge. The Marines come from Charan
// Kanoa in the south (+z), the Japanese from Marpi in the north (-z). Mount Tapochau stands in the middle, neutral,
// with a road up its south shoulder and one up its north: no side starts on it. Not mirrored, but fair: the cane
// plain runs down the west on both halves (Lake Susupe's marsh on the Marines' half, the open Tanapag plain on the
// Japanese — the banzai ground), Garapan sits on the west coast level with the mountain; Hill 500 and the mountain's
// south spur for the Marines answer the two spurs round Paradise Valley for the Japanese; Hell's Pocket's cliff rim in
// the south-east answers the Kagman plateau in the north-east; Death Valley lies between Tapochau's east cliffs and
// Purple Heart Ridge across the middle. The cave mouths (systems/Caves.js) are the Japanese defence's: in Tapochau's
// cliffs, Death Valley's wall, Hell's Pocket, Paradise Valley and Purple Heart Ridge.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, shellField, trenchLine } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1944_06);

const TAPOCHAU = { x: 30, z: 0 };
const POCKET = { x: 330, z: 262 };   // Hell's Pocket: a basin in a ring of cliffs
const KAGMAN = { x: 330, z: -270 };  // the Kagman plateau
const SUSUPE = { x: -385, z: 330 };  // the marsh round Lake Susupe
const TOWNS = [{ x: -330, z: 20, r: 75 }, { x: -340, z: -290, r: 48 }]; // Garapan, Tanapag
const inTown = (x: number, z: number, pad = 0) => TOWNS.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + pad);

/** The roads: the west coast road through the towns, the roads up Tapochau from the south and the north, the east road down Death Valley. */
const TRACKS: [number, number][][] = [
  [[-430, 560], [-400, 330], [-400, 20], [-410, -290], [-420, -560]],                 // the coast road
  [[0, 500], [0, 440]],
  [[0, 440], [-220, 400], [-400, 330]],
  [[0, 440], [-70, 320], [-100, 228], [-40, 120], [0, 60], [TAPOCHAU.x, TAPOCHAU.z]], // up Tapochau's south shoulder
  [[0, 440], [200, 380], [330, 330], [POCKET.x, POCKET.z]],                          // into Hell's Pocket through its gap
  [[330, 330], [420, 200], [300, 100], [300, -20], [330, -160], [KAGMAN.x, KAGMAN.z]], // down Death Valley to Kagman
  [[0, -500], [0, -430]],
  [[0, -430], [60, -330], [65, -235], [50, -120], [TAPOCHAU.x, TAPOCHAU.z]],         // up from Paradise Valley
  [[0, -430], [-200, -400], [-410, -290]],
  [[0, -430], [180, -380], [KAGMAN.x, KAGMAN.z]],
  [[-400, 20], [-150, 12], [TAPOCHAU.x, TAPOCHAU.z], [180, 40], [300, -20]],          // the cross-island road over the mountain
];
function segDist(px: number, pz: number, [ax, az]: [number, number], [bx, bz]: [number, number]) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
const roadDist = (x: number, z: number) => {
  let d = Infinity;
  for (const t of TRACKS) for (let i = 0; i + 1 < t.length; i++) d = Math.min(d, segDist(x, z, t[i], t[i + 1]));
  return d;
};
/** The cane railway (narrow gauge): up the west plain from Charan Kanoa to Tanapag, a branch east across the southern cane. */
const RAILS: [number, number][][] = [
  [[-360, 560], [-352, 300], [-372, 120], [-380, -120], [-386, -400], [-400, -560]],
  [[-352, 300], [-200, 360], [-40, 380], [140, 340]],
];

const seg = (x: number, z: number, [ax, az, bx, bz, w, h]: number[]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return h * Math.exp(-((Math.hypot(x - ax - dx * t, z - az - dz * t) / w) ** 2));
};
const knoll = (x: number, z: number, cx: number, cz: number, r: number, h: number) => h * Math.exp(-((Math.hypot(x - cx, z - cz) / r) ** 2));
const RIDGES: number[][] = [
  [-20, -110, -30, -335, 45, 14],   // Paradise Valley's west spur
  [150, -110, 160, -335, 45, 14],   // and its east spur
  [40, 110, 120, 330, 50, 11],      // Tapochau's south spur
  [430, -230, 410, 120, 42, 18],    // Purple Heart Ridge, along the east of Death Valley
];

/** 1 in the marsh round Lake Susupe. */
const marsh = (x: number, z: number) => smoothstep(1, 0.7, Math.hypot((x - SUSUPE.x) / 85, (z - SUSUPE.z) / 65));
/** The cane fields (0..1): the lowlands, both halves; not the towns, the marsh, the slopes. */
const cane = (x: number, z: number, h: number) =>
  smoothstep(-0.15, 0.1, fbm(noise, x * 0.008 + 3, z * 0.008 - 5, 2)) * smoothstep(13, 9, h) * (1 - marsh(x, z)) * (inTown(x, z, 10) ? 0 : 1);

/** The mountain block: Tapochau's limestone rising out of the plain, its east edge a cliff (gentle where the road comes down). */
function massif(x: number, z: number) {
  const road = smoothstep(40, 12, Math.min(segDist(x, z, [TAPOCHAU.x, TAPOCHAU.z], [180, 40]), segDist(x, z, [180, 40], [300, -20])));
  const edge = 195 + fbm(noise, z * 0.01, 4.4, 2) * 18, w = 8 + road * 60;
  // (an irregular outline: the north and south ends and the west foot wander with the noise)
  const wob = fbm(noise, x * 0.008 - 6, z * 0.008 + 2, 2) * 45;
  const zMask = smoothstep(-290 - wob, -210 - wob, z) * smoothstep(240 + wob, 160 + wob, z);
  return 13 * smoothstep(-300 + wob, -110 + wob, x) * smoothstep(edge + w, edge - w, x) * zMask;
}

function height(x: number, z: number) {
  let h = 3.5 + fbm(noise, x * 0.004, z * 0.004, 3) * 2 + fbm(noise, x * 0.03 + 5, z * 0.03, 2) * 0.35;  // the cane plain
  h += massif(x, z);
  h += knoll(x, z, TAPOCHAU.x, TAPOCHAU.z, 150, 36);                                                     // Mount Tapochau
  h += RIDGES.reduce((s, r) => s + seg(x, z, r), 0);
  h += knoll(x, z, -100, 228, 62, 20);                                                                    // Hill 500
  // Hell's Pocket: a ring of cliffs round a sunken floor
  const pr = Math.hypot(x - POCKET.x, z - POCKET.z);
  const gap = smoothstep(0.75, 0.95, (z - POCKET.z) / Math.max(pr, 1)) * smoothstep(30, 60, pr); // (the gap to the south, where the road comes in)
  h += 15 * Math.exp(-(((pr - 62) / 20) ** 2)) * (1 - gap * 0.85) - 2 * smoothstep(55, 30, pr);
  h += 13 * smoothstep(95, 55, Math.hypot(x - KAGMAN.x, z - KAGMAN.z));                                  // the Kagman plateau
  h += fbm(noise, x * 0.025 + 9, z * 0.025, 3) * 1.8 * smoothstep(7, 15, h);                             // broken limestone
  h += smoothstep(440, 540, x) * 16 + smoothstep(560, 680, Math.abs(z)) * 14;                            // the east coast's cliffs, the island beyond the ends
  h -= smoothstep(-430, -520, x) * 2.5;                                                                  // the west shore, low
  h += (2.2 - h) * marsh(x, z) * 0.8;                                                                    // the marsh: low and wet
  for (const t of TOWNS) h += (4 - h) * smoothstep(t.r, t.r - 25, Math.hypot(x - t.x, z - t.z));
  for (const bz of [BASE_Z, -BASE_Z]) h += (5 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return h;
}

/** The marsh: men wade, vehicles crawl; the cane slows vehicles a little; roads firm. */
function soft(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 6) return 1;
  const m = marsh(x, z);
  return 1 - m * (foot ? 0.35 : 0.6);
}

/** The cave mouths (systems/Caves.js): where the Japanese defence dug into the limestone. */
const CAVES = [
  { name: 'Tapochau, east cliffs', x: 175, z: -40 },
  { name: 'Tapochau, north face', x: -10, z: -110 },
  { name: 'Paradise Valley, Saito’s command post', x: 30, z: -255 },
  { name: 'Paradise Valley, east wall', x: 115, z: -290 },
  { name: 'Death Valley', x: 210, z: 110 },
  { name: 'Purple Heart Ridge', x: 395, z: -120 },
  { name: 'Hell’s Pocket', x: 290, z: 225 },
];

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '2nd Battalion, 6th Marines' }];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Charan Kanoa', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Lake Susupe', x: -320, z: 312, owner: null, sector: 'west' },
  { id: 'C', name: 'Hill 500', x: -100, z: 228, owner: null, sector: 'centre' },
  { id: 'D', name: 'Hell’s Pocket', x: POCKET.x, z: POCKET.z, owner: null, sector: 'east' },
  { id: 'E', name: 'Garapan', x: TOWNS[0].x, z: TOWNS[0].z, owner: null, sector: 'west', radius: 28 },
  { id: 'F', name: 'Mount Tapochau', x: TAPOCHAU.x, z: TAPOCHAU.z, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Death Valley', x: 300, z: -20, owner: null, sector: 'east' },
  { id: 'H', name: 'Tanapag', x: TOWNS[1].x, z: TOWNS[1].z, owner: null, sector: 'west' },
  { id: 'I', name: 'Paradise Valley', x: 65, z: -235, owner: null, sector: 'centre' },
  { id: 'J', name: 'Kagman', x: KAGMAN.x, z: KAGMAN.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Marpi', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

export default {
  id: 'saipan',
  name: 'Saipan',
  description: 'June–July 1944: sugar-cane fields and the cane railway under Mount Tapochau, the wreck of Garapan, cliffs and caves in Death Valley, Hell’s Pocket and Paradise Valley — and the Tanapag plain, where the banzai charge came.',
  epochs: ['1945'],
  region: 'pacific',                                   // (the menu's Asia & Pacific: maps/index.js REGIONS)
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific's armies)
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['usmc', 'us'], pact: ['jp'] },            // (the 2nd and 4th Marine Divisions; the Army's 27th Division fought here too, but the US Army does not fight on the Pacific maps: data/factions.js armiesFrom)
  conditions: { time: 'day', weather: 'clear' },
  airfields: [],                                       // (Aslito airfield lies south of the field, behind the Marines: their aircraft and the carriers' come in from the map edge)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.55, // (vehicles: the cliffs are for men — the roads, the spurs and the gaps for the rest)
  seed: 1944,
  height,
  soft,
  woods: (x: number, z: number) => Math.max(cane(x, z, height(x, z)) * 0.35, smoothstep(14, 24, height(x, z)) * 0.6),
  caves: { owner: 'pact', list: CAVES },

  theme: {
    // a Marianas summer: high sun, a bright hazy sky, the cane green and the limestone pale
    fogColor: 0xbcc4bc, fogDensity: 0.0007,
    skyTop: 0x4f80b0, skyHorizon: 0xc8d4d4, skyBottom: 0x8c9a94,
    sunColor: 0xfff2dc, sunIntensity: 2.0, sunDisk: 0.3,
    clouds: 0.45, cloudLight: 0xf2f2ee, cloudDark: 0x92a0a6,
    sunDir: [0.4, 0.75, 0.5],
    hemiSky: 0xc8d4dc, hemiGround: 0x46502e, hemiIntensity: 1.25,
    rimColor: 0xd8dcdc, rimIntensity: 0.22,
    terrain: {
      grass: '#58702e', grassAlt: '#4e662a', dryGrass: '#8a8a4c', dirt: '#7a6040', rock: '#8c8a6c',
      pasture: '#5e7434', ploughed: '#6a5034', stubble: '#8a8648', meadow: '#5c7630',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0, // (no farmland patchwork: the cane is painted below)
      surface(x: number, z: number, y: number) {
        const rd = roadDist(x, z);
        if (rd < 4) return [0xb4a888, smoothstep(4, 2, rd) * 0.85];                                    // the roads: white coral
        if (inTown(x, z, -10)) return [0x8a8274, 0.6];                                                 // the towns: rubble and dust
        if (marsh(x, z) > 0.3) return [0x4a5236, 0.8 * marsh(x, z)];                                   // the marsh: reeds and black water
        const c = cane(x, z, y);
        if (c > 0.3) return [Math.sin((x * 0.6 + z * 0.8) * 0.9) > 0 ? 0x6a8a34 : 0x5c7a2e, 0.75 * c]; // the cane in its rows
        const slope = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (slope > 0.6) return [0xc0b8a0, 0.8];                                                       // the cliffs: bare limestone
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-200, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [-200, 0, 180] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '136th Infantry Regiment' })),
  },

  /** The naval shelling: thick on the mountain and the towns; each side dug in on its own heights. */
  battlefield() {
    const density = (x, z) => 0.08 + 0.6 * smoothstep(12, 30, height(x, z)) + (inTown(x, z) ? 0.6 : 0);
    // (shellField scatters one half and mirrors it: keep its first half each time, the second from another seed turned round)
    const half = (seed, f) => shellField(seed, BOUNDS, f).filter((_, i) => i % 2 === 0);
    const blasts = [...half(1944_0615, density), ...half(1944_0707, (x, z) => density(-x, -z)).map(([x, z, r, d]) => [-x, -z, r, d])];
    const works: any[] = [];
    const lines: [string, [number, number][]][] = [
      ['nato', [[-140, 203], [-115, 194], [-85, 194], [-60, 203]]],        // Hill 500, facing the mountain
      ['nato', [[290, 300], [315, 312], [345, 312], [370, 300]]],        // Hell's Pocket's south rim
      ['pact', [[100, -200], [80, -192], [50, -192], [30, -200]]],       // Paradise Valley's mouth (left to right as they face south)
      ['pact', [[370, -235], [345, -228], [315, -228], [290, -235]]],    // Kagman's edge
    ];
    for (const [f, l] of lines) works.push(...trenchLine(l, f, { zig: 1, belts: 0 }));
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const R = mulberry32(1944);
    const slope = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    // ---- Garapan and Tanapag: the Japanese colonial towns, timber and concrete, shelled to wreckage
    TOWNS.forEach((t, k) => {
      const T = mulberry32(4406 + k), n = k ? 16 : 34;
      for (let i = 0; i < n; i++) {
        const gx = Math.round((T() - 0.5) * t.r * 1.6 / 18) * 18, gz = Math.round((T() - 0.5) * t.r * 1.6 / 16) * 16; // (a street grid)
        const x = t.x + gx + (T() - 0.5) * 3, z = t.z + gz + (T() - 0.5) * 3;
        if (roadDist(x, z) < 9 || Math.hypot(x - t.x, z - t.z) > t.r - 8 || near(x, z, 10)) continue;
        if (T() < 0.3) props.house({ x, z, yaw: 0, width: 8 + T() * 3, depth: 7 + T() * 2 });
        else props.ruinBlock({ x, z, yaw: 0, width: 9 + T() * 4, depth: 7 + T() * 3, storeys: T() < 0.3 ? 2 : 1, ruin: 0.45 + T() * 0.4, name: 'house' });
      }
      for (let i = 0; i < 14; i++) props.rubble(t.x + (T() - 0.5) * t.r * 1.4, t.z + (T() - 0.5) * t.r * 1.4, 0.4 + T() * 0.6, true);
    });
    // ---- the Charan Kanoa sugar mill's chimney behind the Marines' beach, Tanapag's little mill by the Japanese
    props.chimney({ x: -90, z: 525, height: 28 });
    props.hall({ x: -90, z: 505, yaw: 0, width: 26, depth: 14, height: 7, color: 0x8a7a68, roof: 0x5a5a56, door: 6, name: 'sugar mill' });
    props.chimney({ x: -400, z: -340, height: 18 });
    // ---- the cane railway: the track, a few cane cars standing on it
    for (const line of RAILS) for (let i = 0; i + 1 < line.length; i++) {
      const [x0, z0] = line[i], [x1, z1] = line[i + 1];
      props.rails({ x0, z0, x1, z1 });
    }
    for (const [i, t] of [[0, 0.3], [0, 0.55], [0, 0.8], [1, 0.4]] as const) {
      const L = RAILS[i], k = Math.floor(t * (L.length - 1)), f = t * (L.length - 1) - k, [x0, z0] = L[k], [x1, z1] = L[k + 1];
      const x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
      if (!near(x, z, 16)) props.wagon({ x, z, yaw: Math.atan2(x1 - x0, z1 - z0), color: 0x5a4632, kind: 'open' });
    }
    // ---- the limestone: boulders under the cliffs and on the heights
    for (let i = 0; i < 360; i++) {
      const x = (R() * 2 - 1) * 480, z = (R() * 2 - 1) * 540;
      if (near(x, z, 16) || roadDist(x, z) < 7 || inTown(x, z, 6) || terrain.heightAt(x, z) < 12) continue;
      props.boulder({ x, z, radius: 0.8 + R() * 2.2 });
    }
    // ---- the banzai ground at Tanapag and the cane: burnt-out tanks, a wrecked plane
    for (const [x, z, yaw, c] of [[-260, -200, 0.6, 0x4b4e34], [-300, -380, 2.2, 0x6a6440], [-250, 380, 1.2, 0x4b4e34], [-180, 120, 2.8, 0x6a6440], [220, 180, 0.3, 0x4b4e34], [210, -200, 1.9, 0x6a6440]]) {
      const g = terrain.heightAt(x, z), fx = Math.sin(yaw), fz = Math.cos(yaw);
      props.box('metal', x, g + 0.8, z, 2.6, 1.3, 5.2, yaw, c);
      props.box('metal', x, g + 1.8, z, 1.8, 0.8, 2.2, yaw + 0.3, c);
      props.box('metal', x + fx * 2, g + 1.8, z + fz * 2, 0.14, 0.14, 2.4, yaw + 0.3, 0x2a2826);
      cover.addBox({ x, z, yaw, length: 5.4, thickness: 2.8, height: 1.6 });
    }
    props.aircraftWreck({ x: -150, z: -330, yaw: 1.1, scale: 0.7 });
    // ---- gun pits and dumps behind each side's heights; the radio masts on Tapochau's top
    for (const [x, z] of [[-60, 270], [-110, 270], [90, 300]]) props.sandbagRing({ x, z, radius: 4, toward: 1 });
    for (const [x, z] of [[20, -290], [130, -280], [330, -310]]) props.sandbagRing({ x, z, radius: 4, toward: -1 });
    props.mast({ x: TAPOCHAU.x + 22, z: TAPOCHAU.z - 18, height: 12 });
    for (let i = 0; i < 4; i++) props.crates({ x: -90 + i * 55, z: 410 + R() * 20, yaw: R() * 3 });
    for (let i = 0; i < 4; i++) props.crates({ x: -80 + i * 50, z: -405 - R() * 20, yaw: R() * 3 });
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x6a6444);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      ...CAVES.map((c) => ({ x: c.x, z: c.z, r: 8 })),
      { test: (x: number, z: number) => roadDist(x, z) < 8 || inTown(x, z, -12) || RAILS.some((l) => l.some((p, i) => i + 1 < l.length && segDist(x, z, p, l[i + 1]) < 4)) }];
    // scrub forest and tangantangan on the heights and in the gullies, breadfruit and flame trees round the towns; the cane open
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 1, autumn: 0, maxY: 90, size: 0.95,
      forest: (x: number, z: number) => {
        if (near(x, z, 28) || slope(x, z) > 0.9) return -1;
        const h = terrain.heightAt(x, z);
        if (cane(x, z, h) > 0.3 || marsh(x, z) > 0.5) return 0.01;
        return Math.max(0.6 * smoothstep(11, 20, h), 0.12 + 0.5 * smoothstep(0.1, 0.4, fbm(noise, x * 0.01 + 7, z * 0.01, 2)));
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.8, fields: null });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
