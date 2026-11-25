// The Motoyama plateau, Iwo Jima, late February – March 1945 (1945 only; the big field, 1.0 × 1.12 km; the Pacific: the
// 3rd, 4th and 5th Marine Divisions against General Kuribayashi’s 109th Division). After the landing (maps/iwoJima.ts)
// the Marines turned north across the island’s high middle: the black volcanic ash and blasted scrub of the Motoyama
// plateau, its sulphur vents steaming, every rise a pillbox and every gully a cave mouth joined to the next by tunnels.
// The 4th Division fed itself into the Meat Grinder in the east — Hill 382 with its wrecked radar, the bowl of the
// Amphitheater, the blockhouse on Turkey Knob; the 3rd went straight up the middle over the crossed runways of Airfield
// No. 2 into the ruins of Motoyama village; the 5th worked up the west past Hill Peter, Hill 362A and Nishi Ridge. The
// Marines come from Airfield No. 1 in the south (+z, its strip their airfield), the Japanese from the unfinished Airfield
// No. 3 in the north (-z, theirs).
// Not mirrored, but fair: the two big hills stand across the middle, both neutral — Hill 382 in the east a little on the
// Japanese half, Hill 362A in the west a little on the Marines’, about as high and as broad; Airfield No. 2 is the open,
// flat middle. Each side’s near points answer the other’s: Hill Peter (a round knoll) against Nishi Ridge (a long ridge)
// in the west, Charlie-Dog Ridge against Motoyama’s rise and ruins in the centre, the Amphitheater’s cliff-ringed bowl
// against Turkey Knob’s blockhouse in the east; the sulphur vents, the scrub and the craters are spread over both halves.
// The cave mouths (systems/Caves.js) are the Japanese defence’s, as on Saipan: in every hill on both halves.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, shellField, trenchLine } from './common.js';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1945_0303);

const HILL382 = { x: 300, z: -40 };
const AMPHI = { x: 300, z: 280 };   // the Amphitheater: a bowl in a ring of cliffs, its mouth to the south
const TURKEY = { x: 330, z: -300 };
const PETER = { x: -250, z: 300 };
const MOTOYAMA = { x: -50, z: -260 };
/** Airfield No. 2: the two crossed runways in the middle (decor — the side’s own strips are by the bases). */
const RUNWAYS = [
  { x: 0, z: -10, len: 440, yaw: 0.45 },
  { x: 0, z: -10, len: 380, yaw: -0.75 },
];
const FIELD2_H = 10;
/** The graded ground of Airfield No. 1 (behind the Marines) and the unfinished No. 3 (behind the Japanese): systems/Airfields.js lays each side’s strip there. */
const FIELDS = [{ x: -270, z: 435, hx: 175, hz: 55, h: 8 }, { x: 250, z: -430, hx: 175, hz: 55, h: 8.5 }];
/** The sulphur vents: yellow crust, soft hot ground. */
const VENTS = [[-150, 120, 34], [170, -150, 30], [-210, -120, 28], [150, 90, 26], [420, 110, 30], [-430, -40, 32], [60, -370, 22], [-60, 370, 22]];

function onRunway(a: typeof RUNWAYS[number], x: number, z: number) {
  const fx = Math.cos(a.yaw), fz = Math.sin(a.yaw), dx = x - a.x, dz = z - a.z;
  return Math.max(Math.abs(dx * fx + dz * fz) - a.len / 2, Math.abs(-dx * fz + dz * fx) - 22, 0);
}
const runwayOff = (x: number, z: number) => Math.min(onRunway(RUNWAYS[0], x, z), onRunway(RUNWAYS[1], x, z));
/** Outside graded field f by this many m (0 inside). */
const fieldOff = (f: typeof FIELDS[number], x: number, z: number) => Math.hypot(Math.max(0, Math.abs(x - f.x) - f.hx), Math.max(0, Math.abs(z - f.z) - f.hz));
const inField = (x: number, z: number, pad = 0) => FIELDS.some((f) => fieldOff(f, x, z) < pad + 0.01);
const vent = (x: number, z: number) => VENTS.reduce((m, [vx, vz, r]) => Math.max(m, smoothstep(r, r * 0.5, Math.hypot(x - vx, z - vz))), 0);

/** The tracks: up the middle over Airfield No. 2, the west road by the hills, the east road through the Meat Grinder, across the middle. */
const TRACKS: [number, number][][] = [
  [[0, 500], [0, 430], [60, 330], [80, 230], [40, 110], [0, -10]],
  [[0, -10], [-30, -130], [MOTOYAMA.x, MOTOYAMA.z], [-10, -400], [0, -500]],
  [[0, 430], [-80, 360], [PETER.x, PETER.z], [-300, 160], [-340, 30], [-330, -120], [-330, -270], [-200, -400], [-10, -400]],
  [[60, 330], [220, 350], [300, 352], [AMPHI.x, AMPHI.z]],
  [[300, 352], [420, 250], [430, 60], [HILL382.x, HILL382.z], [390, -140], [TURKEY.x, TURKEY.z], [150, -340], [-10, -400]],
  [[-340, 30], [-180, 10], [0, -10], [150, -30], [HILL382.x, HILL382.z]],
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

const seg = (x: number, z: number, [ax, az, bx, bz, w, h]: number[]) => h * Math.exp(-((segDist(x, z, [ax, az], [bx, bz]) / w) ** 2));
const knoll = (x: number, z: number, cx: number, cz: number, r: number, h: number) => h * Math.exp(-((Math.hypot(x - cx, z - cz) / r) ** 2));
const RIDGES: number[][] = [
  [-360, 95, -320, -35, 52, 26],     // Hill 362A: a long hogback north–south
  [-400, -225, -260, -320, 40, 15],  // Nishi Ridge
  [-20, 240, 180, 215, 34, 11],      // Charlie-Dog Ridge, south of Airfield No. 2
];

/** The ground before the airfields are graded (the noise in it is cached: it is asked for every step). */
const rough = gridCacheSmooth((x: number, z: number) =>
  fbm(noise, x * 0.004, z * 0.004, 3) * 3 + fbm(noise, x * 0.03 + 5, z * 0.03, 2) * 0.5, BOUNDS, 2);
const brokenK = gridCacheSmooth((x: number, z: number) => fbm(noise, x * 0.022 + 9, z * 0.022, 3) * 2.4, BOUNDS, 2);

function height(x: number, z: number) {
  const r = rough(x, z), broken = brokenK(x, z);
  let h = 8 + r;                                                         // the plateau: rolling ash
  h += knoll(x, z, HILL382.x, HILL382.z, 88, 27);                                    // Hill 382
  h += RIDGES.reduce((s, q) => s + seg(x, z, q), 0);
  h += knoll(x, z, PETER.x, PETER.z, 58, 15);                                        // Hill Peter
  h += knoll(x, z, TURKEY.x, TURKEY.z, 52, 17);                                      // Turkey Knob
  h += knoll(x, z, MOTOYAMA.x, MOTOYAMA.z, 115, 9);                                  // Motoyama’s rise
  // the Amphitheater: a ring of cliffs round a sunken floor, open to the south
  const pr = Math.hypot(x - AMPHI.x, z - AMPHI.z);
  const gap = smoothstep(0.75, 0.95, (z - AMPHI.z) / Math.max(pr, 1)) * smoothstep(30, 60, pr);
  h += 15 * Math.exp(-(((pr - 62) / 20) ** 2)) * (1 - gap * 0.85) - 2 * smoothstep(55, 30, pr);
  h += broken * smoothstep(12, 20, h);                                              // the high ground broken and gullied
  h -= smoothstep(400, 500, Math.abs(x)) * 5;                                        // the plateau’s shoulders toward the coasts
  // Airfield No. 2: graded flat
  const off = runwayOff(x, z);
  if (off < 40) h += (FIELD2_H - h) * smoothstep(40, 0, off);
  for (const f of FIELDS) { const o = fieldOff(f, x, z); if (o < 45) h += (f.h - h) * smoothstep(45, 0, o); }
  for (const bz of [BASE_Z, -BASE_Z]) h += (8 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return h;
}

/** The vents’ hot crust and the loose ash: tracks firm, the rest a little slow for vehicles. */
function soft(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 6) return 1;
  const v = vent(x, z);
  return 1 - v * (foot ? 0.2 : 0.45) - (foot ? 0 : 0.08);
}

/** The cave mouths (systems/Caves.js): Kuribayashi’s tunnels join them all. */
const CAVES = [
  { name: 'Hill 382, south face', x: HILL382.x - 20, z: HILL382.z + 62 },
  { name: 'Hill 382, west face', x: HILL382.x - 70, z: HILL382.z - 10 },
  { name: 'the Amphitheater', x: AMPHI.x + 18, z: AMPHI.z - 42 },
  { name: 'Turkey Knob', x: TURKEY.x - 34, z: TURKEY.z + 22 },
  { name: 'Hill 362A', x: -300, z: 50 },
  { name: 'Nishi Ridge', x: -320, z: -250 },
  { name: 'Hill Peter', x: PETER.x + 40, z: PETER.z - 25 },
  { name: 'Charlie-Dog Ridge', x: 120, z: 210 },
  { name: 'Motoyama, the sulphur works', x: MOTOYAMA.x - 70, z: MOTOYAMA.z - 30 },
];

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Battalion, 23rd Marines' }];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Airfield No. 1', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Hill Peter', x: PETER.x, z: PETER.z, owner: null, sector: 'west' },
  { id: 'C', name: 'Charlie-Dog Ridge', x: 80, z: 230, owner: null, sector: 'centre' },
  { id: 'D', name: 'The Amphitheater', x: AMPHI.x, z: AMPHI.z, owner: null, sector: 'east' },
  { id: 'E', name: 'Hill 362A', x: -340, z: 30, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Airfield No. 2', x: 0, z: -10, owner: null, sector: 'centre' },
  { id: 'G', name: 'Hill 382', x: HILL382.x, z: HILL382.z, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Nishi Ridge', x: -330, z: -270, owner: null, sector: 'west' },
  { id: 'I', name: 'Motoyama', x: MOTOYAMA.x, z: MOTOYAMA.z, owner: null, sector: 'centre', radius: 28 },
  { id: 'J', name: 'Turkey Knob', x: TURKEY.x, z: TURKEY.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Airfield No. 3', x: 40, z: -470, owner: 'pact', sector: 'centre' },
];
const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

export default {
  id: 'motoyama',
  name: 'Motoyama Plateau',
  description: 'Iwo Jima, late February – March 1945: black ash, sulphur vents and blasted scrub on the island’s high middle — the crossed runways of Airfield No. 2, the ruins of Motoyama, and the Meat Grinder: Hill 382, the Amphitheater and Turkey Knob, riddled with pillboxes and caves.',
  epochs: ['1945'],
  region: 'pacific',                                   // (the menu's Asia & Pacific: maps/index.js REGIONS)
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific's armies)
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['usmc'], pact: ['jp'] },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.55, // (vehicles: the Amphitheater’s cliffs and the hills’ broken tops are for men)
  seed: 1945,
  height,
  soft,
  caves: { owner: 'pact', list: CAVES },

  theme: {
    // the Bonins in March: hard light, the haze of the shelling and the vents’ steam
    fogColor: 0xb9b6ae, fogDensity: 0.0007,
    skyTop: 0x5d82a8, skyHorizon: 0xc6cfd4, skyBottom: 0x8a9298,
    sunColor: 0xfff2dc, sunIntensity: 2.0, sunDisk: 0.3,
    clouds: 0.4, cloudLight: 0xeeeeea, cloudDark: 0x9aa0a4,
    sunDir: [0.4, 0.7, 0.55],
    hemiSky: 0xc8d4dc, hemiGround: 0x3a3632, hemiIntensity: 1.2,
    rimColor: 0xd8dce0, rimIntensity: 0.25,
    terrain: {
      // as on maps/iwoJima.ts: dark volcanic ash and rock, grey-green scrub, sulphur yellow
      grass: '#5c5e46', grassAlt: '#4e5040', dryGrass: '#7a7458', dirt: '#3a3530', rock: '#4a4642',
      pasture: '#5a5c44', ploughed: '#3c3630', stubble: '#6e6850', meadow: '#5e6046',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const rd = roadDist(x, z);
        if (rd < 4) return [0x5e5850, smoothstep(4, 2, rd) * 0.8];                       // the tracks: pale trodden ash
        if (runwayOff(x, z) < 0.5) return [0x6a6458, 0.95];                               // Airfield No. 2: graded, pale
        if (inField(x, z)) return [0x3c3732, 0.7];                                        // Nos. 1 and 3: graded ash
        const v = vent(x, z);
        if (v > 0.2) return [0x8c7c40, 0.75 * v];                                         // the vents: sulphur
        const slope = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (slope > 0.55) return [0x4a4642, 0.85];                                        // the cliffs: bare rock
        const ash = fbm(noise, x * 0.012 + 11, z * 0.012, 2);
        if (ash > -0.12) return [0x2f2b28, Math.min(0.85, (ash + 0.12) * 2.5)];             // blasted bare: black ash
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-200, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [-180, 0, 200] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '145th Infantry Regiment' })),
  },

  /** Weeks of shelling: thick on the hills and the runways; each side dug in on its own ground. */
  battlefield() {
    const density = (x: number, z: number) => 0.1 + 0.5 * smoothstep(13, 26, height(x, z)) + 0.5 * smoothstep(60, 0, runwayOff(x, z)) - (inField(x, z, 20) ? 0.1 : 0);
    const half = (seed: number, f: (x: number, z: number) => number) => shellField(seed, BOUNDS, f).filter((_, i) => i % 2 === 0);
    const blasts = [...half(1945_0224, density), ...half(1945_0310, (x, z) => density(-x, -z)).map(([x, z, r, d]) => [-x, -z, r, d])]
      .filter(([x, z]) => !inField(x, z, 16) && Math.hypot(x, Math.abs(z) - BASE_Z) > 40);
    const works: any[] = [];
    const lines: [string, [number, number][]][] = [
      ['nato', [[-290, 270], [-265, 262], [-235, 262], [-210, 270]]],     // Hill Peter’s crest, facing north
      ['nato', [[30, 212], [60, 205], [95, 205], [125, 198]]],            // Charlie-Dog Ridge
      ['pact', [[-10, -225], [-35, -218], [-65, -218], [-90, -225]]],     // Motoyama’s south edge (left to right as they face south)
      ['pact', [[365, -275], [340, -268], [310, -268], [285, -275]]],     // Turkey Knob
    ];
    for (const [f, l] of lines) works.push(...trenchLine(l, f, { zig: 1, belts: 0 }));
    for (const [x, z, f] of [[-320, 0, 'pact'], [270, -10, 'pact'], [330, 240, 'pact'], [-300, -240, 'pact'], [40, 30, 'nato'], [-60, -40, 'pact']] as const)
      works.push({ kind: 'mgNest', x, z, yaw: f === 'pact' ? 0 : Math.PI, faction: f });
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const R = mulberry32(1945_03);
    const slope = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const clear = (x: number, z: number, d = 10) => !near(x, z, d) && roadDist(x, z) > 7 && !inField(x, z, 12);
    // a dug-in concrete pillbox or blockhouse: low, half sunk in the ash, a firing slit toward `yaw`
    const pillbox = (x: number, z: number, yaw: number, s = 1) => {
      const g = Math.min(terrain.heightAt(x, z), terrain.heightAt(x + 3 * s, z), terrain.heightAt(x - 3 * s, z), terrain.heightAt(x, z + 3 * s), terrain.heightAt(x, z - 3 * s));
      props.box('stone', x, g + 0.7 * s, z, 5.5 * s, 2.2 * s, 4.6 * s, yaw, 0x6e6a60);
      props.box('stone', x, g + 1.9 * s, z, 6.2 * s, 0.35 * s, 5.2 * s, yaw, 0x5c5850);
      props.box('stone', x + Math.sin(yaw) * 2.35 * s, g + 1.25 * s, z + Math.cos(yaw) * 2.35 * s, 3.2 * s, 0.35 * s, 0.1, yaw, 0x1a1816);
      cover.addBox({ x, z, yaw, length: 5.5 * s, thickness: 4.6 * s, height: 1.9 * s });
    };
    // ---- Airfield No. 2: the crossed runways, cratered; the wrecked aircraft beside them
    for (const a of RUNWAYS) {
      const fx = Math.cos(a.yaw), fz = Math.sin(a.yaw), yaw = Math.atan2(fx, fz);
      for (let t = -a.len / 2; t < a.len / 2; t += 12) {
        const x = a.x + fx * (t + 6), z = a.z + fz * (t + 6);
        if (Math.abs(t + 6) < 40 && a !== RUNWAYS[0]) continue; // (the crossing: laid once)
        props.box('stone', x, terrain.heightAt(x, z) + 0.05, z, 30, 0.2, 12.4, yaw, 0x77705f);
      }
      for (let i = 0; i < 6; i++) {
        const t = (i / 5 - 0.5) * a.len * 0.8, side = i % 2 ? 1 : -1, x = a.x + fx * t - fz * 45 * side, z = a.z + fz * t + fx * 45 * side;
        if (near(x, z, 30) || roadDist(x, z) < 14 || runwayOff(x, z) < 12) continue;
        if (R() < 0.7) props.aircraftWreck({ x: x + fz * 6 * side, z: z - fx * 6 * side, yaw: R() * 6.28, scale: 0.8 });
      }
    }
    // ---- Motoyama village: burnt-out houses round the crossroads, the sulphur works’ chimney
    for (let i = 0; i < 34; i++) {
      const gx = Math.round((R() - 0.5) * 150 / 16) * 16, gz = Math.round((R() - 0.5) * 120 / 15) * 15;
      const x = MOTOYAMA.x + gx + (R() - 0.5) * 3, z = MOTOYAMA.z + gz + (R() - 0.5) * 3;
      if (roadDist(x, z) < 9 || near(x, z, 12)) continue;
      if (R() < 0.25) props.house({ x, z, yaw: 0.1, width: 7 + R() * 2, depth: 6 + R() * 2 });
      else props.ruinBlock({ x, z, yaw: 0.1, width: 8 + R() * 3, depth: 6 + R() * 3, storeys: 1, ruin: 0.55 + R() * 0.35, name: 'house' });
    }
    for (let i = 0; i < 10; i++) { const x = MOTOYAMA.x + (R() - 0.5) * 140, z = MOTOYAMA.z + (R() - 0.5) * 110; if (roadDist(x, z) > 6) props.rubble(x, z, 0.4 + R() * 0.6, true); }
    props.chimney({ x: MOTOYAMA.x - 110, z: MOTOYAMA.z - 50, height: 16 });
    props.hall({ x: MOTOYAMA.x - 110, z: MOTOYAMA.z - 70, yaw: 0, width: 18, depth: 10, height: 5, color: 0x6a6258, roof: 0x4a4846, door: 5, name: 'sulphur works' });
    // ---- the pillboxes and blockhouses: on every hill, the radar’s wreck on Hill 382
    const boxes: [number, number, number, number][] = [
      [TURKEY.x, TURKEY.z - 22, 0, 1.5],                                                        // Turkey Knob’s blockhouse
      [HILL382.x + 26, HILL382.z - 30, 0, 1], [HILL382.x - 40, HILL382.z + 30, 0, 1],
      [AMPHI.x - 50, AMPHI.z - 40, Math.PI, 1], [AMPHI.x + 52, AMPHI.z - 34, Math.PI, 1],
      [-360, 50, 0.3, 1], [-330, -30, 0.2, 1], [-300, -300, 0, 1], [-370, -240, 0.3, 1],
      [PETER.x - 30, PETER.z - 40, Math.PI, 1], [150, 205, Math.PI, 1], [-20, 245, Math.PI, 1],
      [MOTOYAMA.x + 70, MOTOYAMA.z + 55, 0, 1], [MOTOYAMA.x - 60, MOTOYAMA.z + 60, 0, 1],
      [120, -80, 0.4, 1], [-120, 60, Math.PI, 1],
    ];
    for (const [x, z, yaw, s] of boxes) if (clear(x, z, 12)) pillbox(x, z, yaw, s);
    props.mast({ x: HILL382.x + 16, z: HILL382.z + 12, height: 9 });
    props.box('metal', HILL382.x + 12, terrain.heightAt(HILL382.x + 12, HILL382.z + 18) + 1.2, HILL382.z + 18, 4, 2.4, 3, 0.7, 0x55524a);
    // ---- the volcanic rock: boulders on the heights and round the vents, a few everywhere
    for (let i = 0; i < 520; i++) {
      const x = (R() * 2 - 1) * 480, z = (R() * 2 - 1) * 540;
      if (!clear(x, z, 16) || runwayOff(x, z) < 10 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      const h = terrain.heightAt(x, z);
      if (h < 14 && vent(x, z) < 0.2 && R() < 0.75) continue;
      props.boulder({ x, z, radius: 0.8 + R() * 2.4 });
    }
    // ---- burnt-out Shermans and Japanese tanks dug in to the turret
    for (const [x, z, yaw, c] of [[220, 120, 0.4, 0x4b4e34], [130, -200, 2.4, 0x6a6440], [-190, 180, 1.1, 0x4b4e34], [-220, -190, 2.8, 0x6a6440], [400, 180, 0.2, 0x4b4e34], [410, -200, 2.0, 0x6a6440]]) {
      if (!clear(x, z, 14)) continue;
      const g = terrain.heightAt(x, z), fx = Math.sin(yaw), fz = Math.cos(yaw);
      props.box('metal', x, g + 0.8, z, 2.6, 1.3, 5.2, yaw, c);
      props.box('metal', x, g + 1.8, z, 1.8, 0.8, 2.2, yaw + 0.3, c);
      props.box('metal', x + fx * 2, g + 1.8, z + fz * 2, 0.14, 0.14, 2.4, yaw + 0.3, 0x2a2826);
      cover.addBox({ x, z, yaw, length: 5.4, thickness: 2.8, height: 1.6 });
    }
    // ---- dumps and gun pits behind each side’s lines
    for (const [x, z] of [[-120, 380], [110, 370], [220, 400]]) props.sandbagRing({ x, z, radius: 4, toward: 1 });
    for (const [x, z] of [[-150, -360], [90, -340], [-260, -380]]) props.sandbagRing({ x, z, radius: 4, toward: -1 });
    for (let i = 0; i < 4; i++) props.crates({ x: 60 + i * 30, z: 470 + R() * 15, yaw: R() * 3 });
    for (let i = 0; i < 4; i++) props.crates({ x: -150 + i * 30, z: -470 - R() * 15, yaw: R() * 3 });
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x6f6a44);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      ...CAVES.map((c) => ({ x: c.x, z: c.z, r: 8 })),
      { test: (x: number, z: number) => roadDist(x, z) < 7 || runwayOff(x, z) < 12 || inField(x, z, 14) || vent(x, z) > 0.3 }];
    // the scrub: stunted trees and bushes in the hollows, blasted bare on the hills and round the points
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1400, broadleaf: 0.9, autumn: 0, maxY: 60, size: 0.6,
      forest: (x: number, z: number) => {
        if (near(x, z, 26) || slope(x, z) > 0.6) return -1;
        return 0.04 + 0.45 * smoothstep(0.05, 0.45, fbm(noise, x * 0.009 + 3, z * 0.009, 2)) * smoothstep(20, 12, terrain.heightAt(x, z));
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.4, fields: null });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
