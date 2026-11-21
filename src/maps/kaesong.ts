// Kaesong, autumn 1985 (the big field, 1.0 × 1.12 km): the old Koryo capital just north of the DMZ, in the war of 1985
// that never came — South Korea and the US 2nd Infantry Division counterattack north out of the DMZ up the Panmunjom
// road against the KPA, the ground the KPA took on the first morning of the war in 1950. The old city fills the middle
// of the basin round the Namdaemun gate, Kaesong station on the Gyeongui line south-west of it; Songak-san, the
// granite mountain over the city, stands steep and wooded on the west flank with the Manwoldae palace terraces at its
// foot (too steep for vehicles, map.steep); the low Kaepung hills close the east. The Sachon runs down the east of the
// basin from Kaepung towards Panmunjom, its valley floor and the land south of the city all rice paddies, ripe for the
// harvest and still wet (soft: vehicles wallow, map.soft); two bridges on the east road and the Sachon ford below the
// city cross it. Hyonnung (Wang Kon's tomb) and King Kongmin's tomb sit on their wooded knolls west, Songgyungwan up
// the Pakyon road north. The ROK and US hold the south (+z: Bongdong, the road to Panmunjom), the KPA the north.
// Fairness: not a mirror — the Sachon wanders its own way, the city lies off-centre, the knolls, rolls and villages are
// each half's own — but Songak-san and the Kaepung hills straddle the middle so neither side starts on them, each side
// has its own bridge over the Sachon at the same distance from its base (z ±422) and the one ford lies on the centre
// line, each side has a wooded knoll with a tomb or village on each flank of the same height, Manwoldae (west, a
// little nearer the ROK) is answered by the Sachon ford (east, a little nearer the KPA), and the points lie at about the
// same distances (measured: tools/map_fairness.py).
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
const HW = 13;          // the Sachon's half-width
const noise = createNoise2D(1985_71);

// ---- the Sachon: down the east of the basin, north to south
const SACHON = [[200, -600], [195, -480], [165, -380], [175, -260], [195, -150], [185, -40], [150, 60], [160, 180], [195, 300], [180, 420], [150, 600]];
const CROSS = [
  { name: 'Kaepung bridge', x: 178, z: -422, kind: 'bridge', width: 14 },
  { name: 'Sachon ford', x: 182, z: -31, kind: 'ford', width: 18 },
  { name: 'Panmun bridge', x: 180, z: 422, kind: 'bridge', width: 14 },
];
const river = createRiver({ paths: [SACHON], halfWidth: HW, level: 0, depth: 2.6, valley: 34, crossings: CROSS.map((c) => ({ ...c, channel: 0 })) });
const riverD = (x: number, z: number) => river.project(x, z).d;

// ---- roads: the Panmunjom road / Pakyon road down the middle, a west road under Songak-san, an east road over the Sachon
const ROADS: number[][][] = [
  [[0, 530], [0, 470], [30, 360], [40, 250], [10, 120], [35, -12], [-10, -130], [-85, -235], [-10, -400], [0, -530]],           // Panmunjom road – Pakyon road
  [[0, 470], [-180, 420], [-330, 280], [-300, 160], [-230, 40], [-260, -100], [-290, -340], [-180, -430], [0, -470]],          // west: under Songak-san
  [[0, 470], [260, 400], [270, 330], [270, 150], [255, -40], [280, -180], [355, -275], [260, -400], [0, -470]],                // east: over the two bridges
  [[-330, 280], [40, 250]], [[-290, -340], [-85, -235]],                                                                      // laterals, each half its own
  [[-230, 40], [35, -12]], [[35, -12], [255, -40]],                                                                               // the city's cross street, out over the ford
  [[-110, 90], [110, 60]], [[-120, -90], [100, -110]],                                                                        // the city's other streets
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
// the Gyeongui line west of the road, through Kaesong station (decoration: level crossings)
const RAIL = [[-50, 580], [-40, 380], [-30, 250], [-60, 120], [-90, 0], [-90, -120], [-150, -250], [-90, -400], [-60, -580]];
const railDist = (x: number, z: number) => Math.min(...RAIL.slice(1).map((b, i) => segDist(x, z, RAIL[i], b)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Bongdong', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Hyonnung', x: -330, z: 280, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Kaesong station', x: 40, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Panmun', x: 270, z: 330, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Manwoldae', x: -230, z: 40, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Namdaemun', x: 35, z: -12, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Sachon ford', x: 255, z: -40, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Kongmin tomb', x: -290, z: -340, owner: null, sector: 'west', radius: 24 },
  { id: 'I', name: 'Songgyungwan', x: -85, z: -235, owner: null, sector: 'centre' },
  { id: 'J', name: 'Kaepung', x: 355, z: -275, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Pakyon road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// the knolls and rolls, each half its own: [x, z, radius, height] (the four flank knolls first, the same height a side)
const HILLS = [[-330, 280, 70, 22], [270, 330, 66, 20], [-290, -340, 72, 22], [355, -275, 68, 20],
  [-160, 390, 50, 10], [-440, 460, 70, 14], [440, 470, 70, 16], [-150, -400, 55, 10], [-450, -460, 70, 15], [450, -450, 66, 15]];
const BIG_HILLS = { nato: [[-330, 280], [270, 330]], pact: [[-290, -340], [355, -275]] };
const warp = (x: number, z: number) => 1 + 0.3 * fbm(noise, x * 0.012 + 50, z * 0.012, 2);
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) {
    const d = (Math.hypot(x - hx, z - hz) / r) * warp(x, z);
    h += a * Math.exp(-d * d) * (0.88 + 0.24 * ridged(noise, x * 0.02 + hx, z * 0.02, 2));
  }
  return h;
}

/** Low ground (0): along the roads, round the points and bases. */
function lowD(x: number, z: number) {
  let d = roadDist(x, z) - 14;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 55);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x, z - bz) - 70);
  return d;
}
/** Songak-san over the west of the city, the Kaepung hills east of the Sachon: both astride the middle. */
function mass(x: number, z: number) {
  const songak = smoothstep(1.0, 0.62, Math.hypot((x + 420) / 165, z / 215) + 0.12 * fbm(noise, x * 0.01 - 30, z * 0.01, 2));
  const kaepung = smoothstep(1.0, 0.6, Math.hypot((x - 470) / 100, (z - 10) / 230) + 0.12 * fbm(noise, x * 0.01 + 70, z * 0.01, 2)) * 0.55;
  return Math.max(songak, kaepung);
}
const mountK = (x: number, z: number) => mass(x, z) * smoothstep(8, 80, lowD(x, z));
/** The old city round Namdaemun. */
const townK = (x: number, z: number) => smoothstep(135, 105, Math.abs(x + 10)) * smoothstep(125, 95, Math.abs(z + 5));
/** The rice paddies: the flat land away from the hills, roads, villages, city and the river's banks. */
function paddyK(x: number, z: number) {
  if (roadDist(x, z) < 8 || nearPoint(x, z, 40) || railDist(x, z) < 7 || riverD(x, z) < HW + 26) return 0;
  return smoothstep(2.5, 0.8, hillH(x, z)) * smoothstep(0.06, 0.01, mountK(x, z)) * (1 - townK(x, z))
    * smoothstep(BOUNDS.x + 5, BOUNDS.x - 30, Math.abs(x)) * smoothstep(55, 70, Math.hypot(x, Math.abs(z) - BASE_Z));
}

function height(x: number, z: number) {
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  let h = LAND + n * 1.5 + hillH(x, z);
  const mk = mountK(x, z);
  if (mk > 0) h += mk * (28 + ridged(noise, x * 0.007 + 9, z * 0.007, 4) * 80);
  const pk = paddyK(x, z);
  if (pk > 0) h += (LAND + Math.round(n * 5) * 0.25 - h) * pk;                     // terraced paddies
  h += smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, Math.abs(x)) * (20 + ridged(noise, x * 0.01, z * 0.01, 3) * 24);
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14;
  for (const bz of [BASE_Z, -BASE_Z]) h += (LAND - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const paddyC = gridCache((x: number, z: number) => paddyK(x, z), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => { const pk = paddyC(x, z); return pk <= 0.05 ? 1 : 1 - pk * (foot ? 0.3 : 0.55); }; // (October: the rice ripe, the fields still wet)
/** Pine and oak on Songak-san, the Kaepung hills and the knolls. */
const woodsK = (x: number, z: number) => Math.max(smoothstep(5, 12, hillH(x, z)), smoothstep(0.06, 0.25, mountK(x, z)))
  * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 26) ? 0 : 1);
const woodsC = gridCache(woodsK, BOUNDS);
const bund = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return Math.min(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11)) > 13.6;
};

export default {
  id: 'kaesong',
  name: 'Kaesong',
  description: 'The old Koryo capital just north of the DMZ, autumn 1985: the ROK and US counterattack up the Panmunjom road into Kaesong — the old city under Songak-san, the Sachon valley, ripe rice paddies and the wooded tomb knolls either side.',
  epochs: ['1985'],
  region: 'korea',
  armies: { nato: ['rok', 'us'], pact: ['kpa'] }, // (the ROK 1st Division and the US 2nd Infantry Division against the Korean People's Army)
  sides: { nato: 'South Korea', pact: 'North Korea' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  steep: 0.6, // (Songak-san's granite: vehicles keep to the basin)
  soft,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a clear October day, the hills turning, the rice gold
    fogColor: 0xbcc2c4, fogDensity: 0.0011,
    skyTop: 0x4e78ac, skyHorizon: 0xd2d8da, skyBottom: 0x7e7c6a,
    sunColor: 0xfff0d8, sunIntensity: 2.0, sunDisk: 0.4,
    clouds: 0.3, cloudLight: 0xf4f2ee, cloudDark: 0x9aa0a6,
    sunDir: [-0.3, 0.65, 0.6],
    hemiSky: 0xc8d2de, hemiGround: 0x5e5638, hemiIntensity: 1.3,
    rimColor: 0xd4d6d8, rimIntensity: 0.2,
    terrain: {
      grass: '#66703a', grassAlt: '#5c6834', dryGrass: '#9a8a52', dirt: '#6e5a40', rock: '#787468',
      pasture: '#66703a', ploughed: '#5e4a34', stubble: '#a08e56', meadow: '#727a40',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < (townK(x, z) > 0.5 ? 5 : 4)) return [0x76736c, 0.86];                 // asphalt
        if (railDist(x, z) < 3) return [0x4e4a44, 0.9];                                            // ballast
        if (townK(x, z) > 0.6) return [0x8a8274, 0.6];                                             // lanes and yards
        if (riverD(x, z) < HW + 22 && y < 2.2) return [0xa89e82, 0.8];                             // the Sachon's sands
        const pk = paddyC(x, z);
        if (pk > 0.3) {
          if (bund(x, z)) return [0x6a6a3a, 0.8];                                                 // the bunds
          const k = noise(x * 0.04, z * 0.04);
          return [k > 0.3 ? 0xa89a48 : k > -0.3 ? 0xb8a650 : 0x8a8a44, pk * 0.85];                 // ripe rice, a few fields still green
        }
        if (y > LAND + 45) return [0xa8a49a, smoothstep(0.0, 0.5, noise(x * 0.025, z * 0.025)) * smoothstep(LAND + 45, LAND + 80, y) * 0.9]; // Songak-san's bare granite
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

  // trenches and MG nests on each side's two flank knolls, a dug-in post above its own bridge
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
      const c = river.crossings.find((q) => Math.sign(q.z) === m && Math.abs(q.z) > 300)!;
      const x = c.x - 40, z = c.z - m * 30;
      if (roadDist(x, z) > 8) works.push({ kind: 'trench', x, z, yaw: m > 0 ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    river.build(scene, terrain);
    props.rand = mulberry32(1985_72);
    const r0 = props.rand;
    const free = (x: number, z: number, r: number) => roadDist(x, z) > 7 + r && railDist(x, z) > 6 + r && riverD(x, z) > HW + 12 + r
      && !nearPoint(x, z, 16 + r) && mountK(x, z) < 0.05 && hillH(x, z) < 6 && Math.hypot(x, Math.abs(z) - BASE_Z) > 45;

    // ---- the Gyeongui line, Kaesong station by the road south of the city
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    props.townHouse({ x: -10, z: 262, yaw: Math.PI / 2 - 0.08, width: 22, depth: 9, storeys: 2, name: 'Kaesong station', damaged: 0 });
    props.wagon({ x: -24, z: 330, yaw: Math.PI / 2 - 0.05, kind: 'box', color: 0x5a4a3a });
    // ---- the old city: tiled hanok and two-storey shops in the lanes, a few new blocks on its edges
    for (let gx = -135; gx <= 120; gx += 16) for (let gz = -125; gz <= 115; gz += 15) {
      const x = gx + (r0() - 0.5) * 4, z = gz + (r0() - 0.5) * 4;
      if (townK(x, z) < 0.5 || !free(x, z, 3) || r0() < 0.22) continue;
      const yaw = r0() < 0.5 ? 0 : Math.PI / 2;
      if (Math.abs(gx + 10) > 95 && r0() < 0.3) props.ruinBlock({ x, z, yaw, width: 20, depth: 10, storeys: 4, ruin: 0, name: 'apartment block' });
      else if (r0() < 0.6) props.house({ x, z, yaw, width: 9 + r0() * 2, depth: 6 + r0() * 2, height: 2.8 });
      else props.flatHouse({ x, z, yaw, width: 8 + r0() * 3, depth: 8 + r0() * 2, storeys: 2, name: 'shop house' });
    }
    // ---- Namdaemun: the stone gate with its pavilion roof, beside the road
    props.box('stone', 64, terrain.heightAt(64, 16) + 2.5, 16, 16, 5, 9, 0, 0x8a867c);
    props.hall({ x: 64, z: 16, yaw: 0, width: 14, depth: 8, height: 3, color: 0x8a3a2a, roof: 0x3e4644, door: 0, name: 'Namdaemun' });
    // ---- Manwoldae: the Koryo palace's stone terraces under Songak-san
    for (const [dx, dz, w] of [[-30, -16, 40], [-30, 4, 34], [-30, 22, 28]] as const) props.box('stone', -230 + dx, terrain.heightAt(-230 + dx, 40 + dz) + 0.5, 40 + dz, w, 1.4, 3, 0, 0x8c887e);
    // ---- the tombs and Songgyungwan: shrine halls on their knolls and terraces
    props.hall({ x: -352, z: 266, yaw: 0.2, width: 10, depth: 7, height: 4, color: 0x8a3a2a, roof: 0x3e4a44, door: 3, name: 'Hyonnung shrine' });
    props.hall({ x: -312, z: -326, yaw: -0.3, width: 10, depth: 7, height: 4, color: 0x8a3a2a, roof: 0x3e4a44, door: 3, name: 'Kongmin tomb shrine' });
    for (const [dx, dz] of [[-30, 14], [-30, -10], [28, 8]] as const) props.hall({ x: -85 + dx, z: -235 + dz, yaw: Math.PI / 2, width: 12, depth: 7, height: 4, color: 0x8a3a2a, roof: 0x3e4a44, door: 3, name: 'Songgyungwan' });
    // ---- the villages, farmsteads and straw stacks in the paddies, guard posts at the bridgeheads (each half its own dice)
    for (const p of points) if ('DJ'.includes(p.id)) buildVillage(props, p, 9700 + Math.round(p.x * 3 + p.z), 1);
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_73 + m);
      const r = props.rand;
      for (let i = 0; i < 70; i++) {
        const x = (r() * 2 - 1) * 460, z = (130 + r() * 380) * m;
        if (paddyC(x, z) < 0.5 || !free(x, z, 4)) continue;
        if (r() < 0.3) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 6, height: 2.8 });
        else props.hayBales({ x, z, yaw: r(), count: 2 + Math.floor(r() * 3) });
      }
      for (const [hx, hz] of BIG_HILLS[m > 0 ? 'nato' : 'pact']) props.mast({ x: hx + 9 * m, z: hz - 7 * m, height: 10 });
    }
    props.rand = mulberry32(1985_74);
    for (const c of river.crossings) props.sandbagRing({ x: c.x - 34, z: c.z + (c.z > 0 ? -22 : c.z < -200 ? 22 : 24), radius: 4.5, toward: c.z > 0 ? -1 : 1 });
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || railDist(x, z) < 5 || paddyC(x, z) > 0.2 || townK(x, z) > 0.3 || riverD(x, z) < HW + 24 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 12000, broadleaf: 0.5, autumn: 0.45, maxY: LAND + 130,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: avoid.slice(0, -1), density: 2 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
