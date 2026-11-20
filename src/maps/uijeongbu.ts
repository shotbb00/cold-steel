// Uijeongbu, summer 1985 (the big field, 1.0 × 1.12 km): the corridor town north of Seoul, the gate the KPA must force
// in the war of 1985 that never came, as it did on the third day of the war in 1950. The town fills the valley floor —
// the station on the Gyeongwon line, the market streets, the new apartment blocks — with the US camps round it (Camp
// Red Cloud, the 2nd Infantry Division's headquarters camp, west of the town; Camp Stanley east), green rice paddies up
// and down the valley (soft: vehicles wallow, map.soft), and either side the steep granite ridges: Dobongsan in the
// west, Suraksan in the east, too steep for vehicles (map.steep) — Mangwolsa temple, Jangam, the Songchu valley and
// the Chuksuk pass are reached by the side roads up their valleys. Route 3 and the railway run down the middle.
// South Korea and the US 2nd Infantry Division hold the south (+z, Seoul), the KPA comes down from Dongducheon.
// Fairness: not a mirror — the valley bends its own way, the ridges' spurs and side valleys, the camps and villages
// are each half's own — but each side has a ridge on each flank with a side valley up to a point in it, Route 3 and a
// road up each ridge's foot to the town, a US camp on each side of the town, and its points at about the same
// distances (measured: tools/map_fairness.py). No room for a runway (airfields: []).
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildVillage, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const PLAIN = 6;
const noise = createNoise2D(1985_61);

/** The valley's middle line. */
const axis = (z: number) => -15 + 30 * Math.sin(z * 0.004 + 0.5) + 25 * Math.cos(z * 0.006);
/** How high each ridge stands along its length: Dobongsan highest over the south of the town, Suraksan in the north. */
const ridgeAmp = (x: number, z: number) => (x < axis(z) ? 1 + 0.4 * Math.sin(z * 0.005 + 0.9) : 1 + 0.4 * Math.sin(z * 0.005 - 2.2));

// ---- roads: Route 3 down the middle, a road along each ridge's foot through each side valley, the town's streets
const ROADS: number[][][] = [
  [[0, 530], [10, 400], [30, 260], [10, 150], [30, 0], [0, -130], [-50, -270], [-20, -400], [0, -530]],                   // Route 3
  [[0, 470], [-170, 420], [-300, 300], [-260, 170], [-210, 50], [-240, -100], [-320, -300], [-180, -430], [0, -470]],     // west: under Dobongsan
  [[0, 470], [170, 420], [300, 320], [260, 170], [230, -60], [280, -200], [330, -330], [180, -430], [0, -470]],          // east: under Suraksan
  [[-210, 50], [30, 0]], [[30, 0], [230, -60]],                                                                         // the town's cross street
  [[-150, 110], [170, 100]], [[-170, -110], [150, -130]],                                                               // its other streets
  [[-300, 300], [30, 260]], [[30, 260], [300, 320]],                                                                    // south laterals
  [[-320, -300], [-50, -270]], [[-50, -270], [330, -330]],                                                              // north laterals
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
const railX = (z: number) => axis(z) + 75 + 8 * Math.sin(z * 0.01);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Dobong-dong', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Mangwolsa', x: -300, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Hoeryong', x: 30, z: 260, owner: null, sector: 'centre' },
  { id: 'D', name: 'Jangam', x: 300, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Camp Red Cloud', x: -210, z: 50, owner: null, sector: 'west', radius: 30 },
  { id: 'F', name: 'Uijeongbu station', x: 30, z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Camp Stanley', x: 230, z: -60, owner: null, sector: 'east', radius: 30 },
  { id: 'H', name: 'Songchu', x: -320, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Nogyang', x: -50, z: -270, owner: null, sector: 'centre' },
  { id: 'J', name: 'Chuksuk pass', x: 330, z: -330, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Dongducheon road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** Low ground (0): along the roads, round the points and bases. */
function lowD(x: number, z: number) {
  let d = roadDist(x, z) - 14;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 55);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x, z - bz) - 70);
  return d;
}
/** Dobongsan west, Suraksan east (each its own line), their spurs out into the valley. */
function mass(x: number, z: number) {
  const a = x - axis(z);
  const west = smoothstep(160, 290, -a + 30 * Math.sin(z * 0.009 + 2) + 18 * Math.sin(z * 0.023));
  const east = smoothstep(165, 295, a + 26 * Math.sin(z * 0.008 + 0.7) + 20 * Math.cos(z * 0.019));
  const spurs = smoothstep(0.2, 0.42, fbm(noise, x * 0.005 + 17.3, z * 0.005 - 81.2, 3)) * smoothstep(60, 140, Math.abs(a));
  return Math.max(west, east, spurs);
}
const mountK = (x: number, z: number) => mass(x, z) * smoothstep(8, 80, lowD(x, z));
const townK = (x: number, z: number) => smoothstep(170, 130, Math.abs(x - axis(z))) * smoothstep(150, 120, Math.abs(z + 5));
/** The paddies: the valley floor up and down from the town. */
function paddyK(x: number, z: number) {
  if (roadDist(x, z) < 8 || nearPoint(x, z, 40) || Math.abs(x - railX(z)) < 8) return 0;
  return smoothstep(0.06, 0.01, mountK(x, z)) * (1 - townK(x, z)) * smoothstep(55, 70, Math.hypot(x, Math.abs(z) - BASE_Z));
}

function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = PLAIN + n * 1.6 + smoothstep(100, 200, Math.abs(x - axis(z))) * 4;                   // the valley floor, rising to the ridges' feet
  const mk = mountK(x, z);
  if (mk > 0) h += mk * (32 + ridged(noise, x * 0.007 + 9, z * 0.007, 4) * 66) * ridgeAmp(x, z);
  const pk = paddyK(x, z);
  if (pk > 0) h += (PLAIN + Math.round(n * 5) * 0.3 - h) * pk;                                  // terraced paddies
  // Hoeryong spur: a granite knob before the ROK's base, as high as the spur of Suraksan before the KPA's (fair high ground, off the roads; after the paddies, which would flatten it)
  h += 25 * Math.exp(-(((x - 130) ** 2 + (z - 370) ** 2) / (42 * 42))) * smoothstep(8, 60, lowD(x, z));
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * (30 + ridged(noise, x * 0.01, z * 0.01, 3) * 30);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 16;
  for (const bz of [BASE_Z, -BASE_Z]) h += (PLAIN - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return h;
}

const paddyC = gridCache((x: number, z: number) => paddyK(x, z), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => { const pk = paddyC(x, z); return pk <= 0.05 ? 1 : 1 - pk * (foot ? 0.3 : 0.6); }; // (summer: the paddies flooded)
/** Pine and oak up the ridges, thinning to bare granite on the crests. */
const woodsK = (x: number, z: number) => smoothstep(0.06, 0.25, mountK(x, z)) * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
const bund = (x: number, z: number) => {
  const u = x + z * 0.06, v = z - x * 0.09;
  return Math.min(Math.abs(((u % 28) + 28) % 28 - 14), Math.abs(((v % 20) + 20) % 20 - 10)) > 12.8;
};

export default {
  id: 'uijeongbu',
  name: 'Uijeongbu',
  description: 'The corridor town north of Seoul, summer 1985: the KPA comes down the valley at Uijeongbu — the town, the station, Camp Red Cloud and Camp Stanley, green paddies, and the steep granite ridges of Dobongsan and Suraksan either side.',
  epochs: ['1985'],
  region: 'korea',
  airfields: [], // (the town and the paddies fill the valley between the ridges: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['rok', 'us'], pact: ['kpa'] }, // (the US 2nd Infantry Division's camps and the ROK Army against the Korean People's Army)
  sides: { nato: 'South Korea', pact: 'North Korea' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  steep: 0.6, // (the granite ridges: vehicles keep to the valley and the side roads)
  soft,
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a hot hazy July day
    fogColor: 0xb8c0c4, fogDensity: 0.0012,
    skyTop: 0x5a80b0, skyHorizon: 0xd0d6d8, skyBottom: 0x7a8070,
    sunColor: 0xfff4e0, sunIntensity: 2.1, sunDisk: 0.45,
    clouds: 0.4, cloudLight: 0xf4f4f0, cloudDark: 0x9aa0a6,
    sunDir: [0.3, 0.75, 0.55],
    hemiSky: 0xc8d4e0, hemiGround: 0x4e5a36, hemiIntensity: 1.3,
    rimColor: 0xd0d6dc, rimIntensity: 0.2,
    terrain: {
      grass: '#55702e', grassAlt: '#4c6628', dryGrass: '#7a8040', dirt: '#6a5a40', rock: '#767666',
      pasture: '#5a7430', ploughed: '#5e4c36', stubble: '#7a8040', meadow: '#64803a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < (townK(x, z) > 0.5 ? 5 : 4)) return [0x6e6c68, 0.88];                 // asphalt
        if (Math.abs(x - railX(z)) < 3) return [0x4e4a44, 0.9];                                   // ballast
        if (townK(x, z) > 0.6) return [0x8a8478, 0.6];                                            // yards and lanes
        const pk = paddyC(x, z);
        if (pk > 0.3) {
          if (bund(x, z)) return [0x5a6a32, 0.8];                                                 // the bunds
          return [noise(x * 0.04, z * 0.04) > 0.3 ? 0x5a7a5a : 0x6a9a3e, pk * 0.85];              // young rice in the water
        }
        if (y > PLAIN + 40) return [0xa8a49a, smoothstep(0.0, 0.5, noise(x * 0.025, z * 0.025)) * smoothstep(PLAIN + 40, PLAIN + 70, y) * 0.9]; // bare granite on the crests
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

  // each side's dug-in posts covering the side valleys up its ridges
  battlefield() {
    const works: any[] = [];
    for (const [f, ids] of [['nato', 'BD'], ['pact', 'HJ']] as const) {
      for (const p of points.filter((q) => ids.includes(q.id))) {
        for (let a = 0; a < 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + (f === 'nato' ? 0.3 : 0.8), x = p.x + Math.cos(ang) * 32, z = p.z + Math.sin(ang) * 32;
          if (roadDist(x, z) < 6) continue;
          works.push({ kind: a % 2 ? 'mgNest' : 'trench', x, z, yaw: Math.atan2(Math.cos(ang), Math.sin(ang)), faction: f });
        }
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    props.rand = mulberry32(1985_62);
    const r0 = props.rand;
    const camps = [{ x: -210, z: 50, w: 120, d: 90 }, { x: 230, z: -60, w: 110, d: 90 }];
    const inCamp = (x: number, z: number, m = 0) => camps.some((c) => Math.abs(x - c.x) < c.w / 2 + m && Math.abs(z - c.z) < c.d / 2 + m);
    const free = (x: number, z: number, r: number) => roadDist(x, z) > 7 + r && Math.abs(x - railX(z)) > 6 + r && !nearPoint(x, z, 16 + r) && !inCamp(x, z, 6) && mountK(x, z) < 0.05;

    // ---- the Gyeongwon line down the valley, the station by the cross street
    for (let z = -560; z < 560; z += 40) props.rails({ x0: railX(z), z0: z, x1: railX(z + 40), z1: z + 40 });
    props.townHouse({ x: railX(-14) - 14, z: -14, yaw: Math.PI / 2, width: 24, depth: 10, storeys: 2, name: 'Uijeongbu station', damaged: 0 });
    // ---- the town: two- and three-storey shops and houses along the streets, apartment blocks on its edges
    for (let gx = -170; gx <= 170; gx += 17) for (let gz = -150; gz <= 140; gz += 16) {
      const x = axis(gz) + gx + (r0() - 0.5) * 4, z = gz + (r0() - 0.5) * 4;
      if (townK(x, z) < 0.5 || !free(x, z, 3) || r0() < 0.25) continue;
      if (Math.abs(gx) > 110 && r0() < 0.3) props.ruinBlock({ x, z, yaw: 0, width: 22, depth: 10, storeys: 5, ruin: 0, name: 'apartment block' });
      else props.flatHouse({ x, z, yaw: r0() < 0.5 ? 0 : Math.PI / 2, width: 8 + r0() * 3, depth: 8 + r0() * 2, storeys: 2 + Math.floor(r0() * 2), name: 'shop house' });
    }
    // ---- the US camps: a fence round each, quonset huts and headquarters, a motor pool, the gate on the road
    for (const c of camps) {
      for (const [dx, dz, len, yaw] of [[0, -c.d / 2, c.w, 0], [0, c.d / 2, c.w, 0], [-c.w / 2, 0, c.d, Math.PI / 2], [c.w / 2, 0, c.d, Math.PI / 2]] as const) {
        const n = Math.round(len / 6);
        for (let i = 0; i < n; i++) {
          const t = -len / 2 + (i + 0.5) * (len / n), x = c.x + dx + (yaw ? 0 : t), z = c.z + dz + (yaw ? t : 0);
          if (roadDist(x, z) < 10 || mountK(x, z) > 0.1) continue;
          props.box('metal', x, terrain.heightAt(x, z) + 1.2, z, len / n, 2.4, 0.05, yaw, 0x6a6e6a);
        }
      }
      for (let i = 0; i < 6; i++) {
        const x = c.x - c.w / 2 + 16 + (i % 3) * 30, z = c.z + (i < 3 ? -24 : 24);
        if (roadDist(x, z) < 12 || Math.hypot(x - c.x, z - c.z) < 20) continue;
        props.hall({ x, z, yaw: 0, width: 10, depth: 18, height: 4, color: 0x6a6e52, roof: 0x5a5e48, door: 3, name: i === 0 ? 'headquarters' : 'quonset hut' });
      }
      props.mast({ x: c.x + c.w / 2 - 10, z: c.z - c.d / 2 + 10, height: 18 });
      props.tower({ x: c.x - c.w / 2 + 4, z: c.z + c.d / 2 - 4, concrete: false });
    }
    // ---- Mangwolsa: the temple hall on its terrace; the villages round the other points
    props.hall({ x: -322, z: 290, yaw: 0.3, width: 14, depth: 10, height: 5, color: 0x8a3a2a, roof: 0x3e4a44, door: 4, name: 'Mangwolsa' });
    for (const p of points) if ('CDHIJ'.includes(p.id)) buildVillage(props, p, 9900 + Math.round(p.x * 3 + p.z), 1);
    // ---- farmsteads in the paddies, each half its own dice; the pylons over the ridges
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_63 + m);
      const r = props.rand;
      for (let i = 0; i < 50; i++) {
        const x = axis(m * 300) + (r() * 2 - 1) * 200, z = (150 + r() * 360) * m;
        if (paddyC(x, z) < 0.5 || !free(x, z, 4) || Math.hypot(x, Math.abs(z) - BASE_Z) < 60) continue;
        if (r() < 0.3) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 6, height: 2.8 });
        else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 2) });
      }
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || paddyC(x, z) > 0.2 || townK(x, z) > 0.3 || inCamp(x, z, 4) || Math.abs(x - railX(z)) < 5 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 11000, broadleaf: 0.5, autumn: 0.05, maxY: PLAIN + 110,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
