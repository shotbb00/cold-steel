// The Imjin River and the Munsan corridor, spring 1985 (the big field, 1.0 × 1.12 km): the western invasion route to
// Seoul, the shortest — the KPA comes down from Kaesong past Panmunjom, the war of 1985 that never came. The Imjin
// winds across the middle in its wide sandy bends, three ways over it: Freedom Bridge (west, beside the stumps of the
// railway bridge), Libby Bridge (centre) and the Jeokseong ford (east, where the Glosters crossed in 1951). South of
// it the low hills and wet spring rice fields of Paju, Munsan with its station on the Gyeongui line, Seonyu-ri and
// Gloster Hill; north of it Dorasan with its observation post, Daeseong-dong under its flagpole and the blue huts of
// Panmunjom. Flat paddies everywhere between the hills (soft: vehicles wallow, map.soft), the hills low enough to drive
// up, every point on a road. South Korea and the US 2nd Infantry Division hold the south (+z), the KPA comes from the
// north. Fairness: not a mirror — the Imjin swings its own way (a loop south in the middle, north on the flanks), the
// crossings are not opposite one another and the hills, roads and villages are each half's own — but each side has a
// town and a big hill on its flanks, a road to each crossing, two crossings within the same reach and its points at
// about the same distances (measured: tools/map_fairness.py).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildVillage, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const LAND = 4;         // the paddies' level
const HW = 18;          // the Imjin's half-width
const noise = createNoise2D(1985_51);

// ---- the Imjin: wide bends, a sandy floodplain each side
const chan = (x: number) => 10 + 50 * Math.sin(x * 0.0075 + 0.9) + 14 * Math.sin(x * 0.021 + 1);
const CROSS = [
  { name: 'Freedom Bridge', x: -200, kind: 'bridge', width: 14 },
  { name: 'Libby Bridge', x: 150, kind: 'bridge', width: 14 },
  { name: 'Jeokseong ford', x: 380, kind: 'ford', width: 16 },
];
const river = createRiver({ paths: [chan], halfWidth: HW, level: 0, depth: 2.8, valley: 48, crossings: CROSS.map((c) => ({ ...c, channel: 0 })) });
const cz = (x: number) => Math.round(chan(x));

// ---- roads (each straight over its crossing)
const ROADS: number[][][] = [
  [[0, 530], [20, 400], [40, 260], [-80, 150], [-170, 70], [-200, 30], [-200, -65], [-120, -150], [-20, -270], [-10, -400], [0, -530]], // Route 1, over Freedom Bridge
  [[0, 470], [-180, 410], [-330, 290], [-280, 150], [-200, 30]],                                 // Munsan to the bridge
  [[-200, -65], [-280, -180], [-300, -320], [-180, -430], [0, -470]],                            // north: Dorasan
  [[0, 470], [180, 420], [330, 310], [250, 180], [150, 100], [150, -15], [230, -120], [320, -320], [180, -430], [0, -470]], // Route 37, over Libby Bridge
  [[330, 310], [380, 150], [380, -80], [370, -200], [320, -320]],                                // the Jeokseong ford
  [[-330, 290], [40, 260]], [[40, 260], [330, 310]], [[-80, 150], [150, 100]],                   // south laterals
  [[-300, -320], [-20, -270]], [[-20, -270], [320, -320]], [[-120, -150], [230, -120]],         // north laterals
];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
// the Gyeongui line: Munsan station, on to the stumps of the old railway bridge beside Freedom Bridge (decoration)
const RAIL = [[[-60, 560], [-250, 330], [-240, 140], [-222, 50]], [[-222, -80], [-300, -230], [-200, -400], [-120, -560]]];
const railDist = (x: number, z: number) => Math.min(...RAIL.flatMap((l) => l.slice(1).map((b, i) => segDist(x, z, l[i], b))));
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Paju', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Munsan', x: -330, z: 290, owner: null, sector: 'west', radius: 28 },
  { id: 'C', name: 'Seonyu-ri', x: 40, z: 260, owner: null, sector: 'centre' },
  { id: 'D', name: 'Gloster Hill', x: 330, z: 310, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Freedom Bridge', x: -186, z: cz(-200) - 45, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Libby Bridge', x: 164, z: cz(150) + 45, owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Jeokseong ford', x: 394, z: cz(380) + 45, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Dorasan', x: -300, z: -320, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Daeseong-dong', x: -20, z: -270, owner: null, sector: 'centre' },
  { id: 'J', name: 'Panmunjom', x: 320, z: -320, owner: null, sector: 'east', radius: 26 },
  { id: 'K', name: 'Kaesong road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
// the low hills, each half its own: [x, z, radius, height] (Gloster Hill and Dorasan first)
const HILLS = [[330, 310, 75, 28], [-420, 430, 90, 22], [170, 430, 70, 16], [-150, 330, 60, 14], [230, 200, 50, 10], [-400, 130, 70, 16], [470, 470, 70, 20],
  [-300, -320, 78, 28], [-60, -440, 80, 20], [440, -430, 80, 22], [130, -230, 60, 14], [-130, -170, 50, 10], [440, -170, 70, 16], [-470, -480, 70, 18]];
const BIG_HILLS = { nato: [[330, 310]], pact: [[-300, -320]] };
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d = (Math.hypot(x - hx, z - hz) / r) * warp(x, z);
    h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  return h;
}
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
/** The rice fields: the flat land away from the hills, roads, villages and the river's sands. */
function paddyK(x: number, z: number) {
  if (roadDist(x, z) < 8 || nearPoint(x, z, 40) || Math.abs(z - chan(x)) < 55) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x));
}

function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = LAND + n * 1.5 + hillH(x, z);
  const pk = paddyK(x, z);
  if (pk > 0) h += (LAND + Math.round(n * 5) * 0.25 - h) * pk;                     // the paddies: terraced flats
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * (14 + ridged(noise, x * 0.01, z * 0.01, 3) * 16);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14;
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const paddyC = gridCache((x: number, z: number) => paddyK(x, z), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => { const pk = paddyC(x, z); return pk <= 0.05 ? 1 : 1 - pk * (foot ? 0.3 : 0.55); }; // (spring: the fields wet for planting)
/** Pine and oak on the hills. */
const woodsK = (x: number, z: number) => smoothstep(5, 12, hillH(x, z)) * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
const bund = (x: number, z: number) => {
  const u = x + z * 0.08, v = z - x * 0.1;
  return Math.min(Math.abs(((u % 32) + 32) % 32 - 16), Math.abs(((v % 20) + 20) % 20 - 10)) > 14.6;
};

export default {
  id: 'imjin-river',
  name: 'Imjin River',
  description: 'The western corridor to Seoul, spring 1985: the KPA comes down from Kaesong past Panmunjom to the Imjin’s bends — Freedom Bridge, Libby Bridge and the Gloster ford — and the low hills and wet rice fields of Munsan and Paju beyond.',
  epochs: ['1985'],
  region: 'korea',
  armies: { nato: ['rok', 'us'], pact: ['kpa'] }, // (the ROK 1st Division and the US 2nd Infantry Division's forward brigade against the Korean People's Army)
  sides: { nato: 'South Korea', pact: 'North Korea' },
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  steep: 0.6,
  soft,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => woodsC(x, z) * 0.8,

  theme: {
    // a grey April day, the hills just greening, haze over the river
    fogColor: 0xb2b8b8, fogDensity: 0.0013,
    skyTop: 0x6a7c90, skyHorizon: 0xc4c8c4, skyBottom: 0x80847a,
    sunColor: 0xfff0dc, sunIntensity: 1.5, sunDisk: 0.15,
    clouds: 0.7, cloudLight: 0xe0e2e0, cloudDark: 0x8a9096,
    sunDir: [-0.35, 0.5, 0.75],
    hemiSky: 0xc4ccd4, hemiGround: 0x5a5440, hemiIntensity: 1.35,
    rimColor: 0xccd2d6, rimIntensity: 0.2,
    terrain: {
      grass: '#6e7040', grassAlt: '#62683a', dryGrass: '#9a8a5c', dirt: '#6e5a40', rock: '#6a665e',
      pasture: '#6e7040', ploughed: '#5e4a34', stubble: '#8e7e52', meadow: '#7a8048',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < 4) return [0x7a7872, 0.85];                                     // asphalt
        const dz = Math.abs(z - chan(x));
        if (dz < 48 && y < 2.2) return [0xb0a68a, 0.8];                                        // the river's sands
        const pk = paddyC(x, z);
        if (pk > 0.3) {
          if (bund(x, z)) return [0x6a6a3e, 0.8];                                            // the bunds
          const k = noise(x * 0.04, z * 0.04);
          return [k > 0.35 ? 0x56605a : k > -0.2 ? 0x6e5a40 : 0x8a7a54, pk * 0.85];           // flooded for planting, ploughed, last year's stubble
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

  // trenches and MG nests on each side's big hill, a dug-in post above each of its bridgeheads
  battlefield() {
    const works: any[] = [];
    for (const [f, m] of [['nato', 1], ['pact', -1]] as const) {
      for (const [hx, hz] of BIG_HILLS[f]) {
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + (m > 0 ? 0.2 : 0.7), x = hx + Math.cos(ang) * 30, z = hz + Math.sin(ang) * 30;
          if (roadDist(x, z) < 6) continue;
          works.push({ kind: a % 2 ? 'mgNest' : 'trench', x, z, yaw: Math.atan2(Math.cos(ang), Math.sin(ang)), faction: f });
        }
      }
      for (const c of CROSS) {
        const x = c.x + (m > 0 ? 22 : -22), z = chan(c.x) + m * 70;
        if (roadDist(x, z) > 8) works.push({ kind: 'trench', x, z, yaw: m > 0 ? Math.PI : 0, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);
    props.rand = mulberry32(1985_52);
    const r0 = props.rand;

    // ---- the Gyeongui line: Munsan station, on to the stumps of the old railway bridge beside Freedom Bridge
    for (const l of RAIL) for (let i = 0; i < l.length - 1; i++) props.rails({ x0: l[i][0], z0: l[i][1], x1: l[i + 1][0], z1: l[i + 1][1] });
    for (const z of [chan(-222) - 26, chan(-222) - 6, chan(-222) + 14]) props.box('stone', -222, 0, z, 3, 4, 4, 0, 0x7a766e); // (the piers the war left)
    props.townHouse({ x: -270, z: 300, yaw: Math.PI / 2, width: 18, depth: 8, storeys: 1, name: 'Munsan station', damaged: 0 });
    props.wagon({ x: -246, z: 320, yaw: 0.7, kind: 'box', color: 0x4a5a6a });
    // ---- the towns: Munsan and Paju, low houses and shops either side of the road
    for (const [px, pz, n, w] of [[-330, 290, 26, 150], [0, 440, 14, 160]] as const) {
      for (let i = 0; i < n; i++) {
        const x = px + (r0() - 0.5) * w, z = pz + (r0() - 0.5) * 90;
        if (roadDist(x, z) < 10 || Math.hypot(x - px, z - pz) < 16 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || hillH(x, z) > 6 || railDist(x, z) < 9) continue;
        props.flatHouse({ x, z, yaw: r0() < 0.5 ? 0 : Math.PI / 2, width: 8 + r0() * 4, depth: 7 + r0() * 2, storeys: r0() < 0.4 ? 2 : 1, name: 'house' });
      }
    }
    // ---- Panmunjom: the blue conference huts astride the line, the pavilions either side
    for (let i = 0; i < 4; i++) props.hall({ x: 290 + i * 14, z: -300, yaw: 0, width: 8, depth: 14, height: 3.2, color: 0x4a7ab8, roof: 0x3a5a8a, door: 2, name: 'conference hut' });
    props.townHouse({ x: 310, z: -340, yaw: 0, width: 22, depth: 10, storeys: 2, name: 'Panmungak', damaged: 0 });
    // ---- Daeseong-dong under its flagpole; the Dorasan observation post
    props.mast({ x: 15, z: -250, height: 45 });
    props.townHouse({ x: -295, z: -335, yaw: 0.3, width: 14, depth: 8, storeys: 1, name: 'observation post', damaged: 0 });
    // ---- the villages, farmsteads and straw stacks in the fields, guard posts at the bridgeheads (each half its own dice)
    for (const p of points) if ('CDHI'.includes(p.id)) buildVillage(props, p, 9800 + Math.round(p.x * 3 + p.z), 1);
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_53 + m);
      const r = props.rand;
      for (let i = 0; i < 70; i++) {
        const x = (r() * 2 - 1) * 460, z = (60 + r() * 440) * m;
        if (paddyC(x, z) < 0.5 || railDist(x, z) < 8 || nearPoint(x, z, 40) || Math.hypot(x, Math.abs(z) - BASE_Z) < 60) continue;
        if (r() < 0.25) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 6, height: 2.8 });
        else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 3) });
      }
      for (const c of river.crossings) props.sandbagRing({ x: c.x + (r() < 0.5 ? -16 : 16), z: c.z + m * (HW + 34 + r() * 10), radius: 4.5, toward: -m });
      for (const [hx, hz] of BIG_HILLS[m > 0 ? 'nato' : 'pact']) props.mast({ x: hx + 9 * m, z: hz - 7 * m, height: 10 });
    }
    // the south bank's fence along the river (the ROK's anti-infiltration line), open at the crossings
    props.rand = mulberry32(1985_54);
    for (let x = -490; x <= 490; x += 8) {
      const z = chan(x) + 50;
      if (roadDist(x, z) < 10 || CROSS.some((c) => Math.abs(x - c.x) < 22)) continue;
      props.box('metal', x, terrain.heightAt(x, z) + 1.2, z, 8, 2.4, 0.05, -Math.atan2(chan(x + 4) - chan(x - 4), 8), 0x6a6e6a);
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || railDist(x, z) < 4 || paddyC(x, z) > 0.2 || Math.abs(z - chan(x)) < 56 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4500, broadleaf: 0.45, autumn: 0.2, maxY: 80,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
