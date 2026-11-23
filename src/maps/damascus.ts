// Damascus, 30 September – 1 October 1918: the end of the pursuit after Megiddo. The Ottoman Fourth Army and the
// German Asia Corps fell back through the city towards Beirut and Homs; the Australian Light Horse came round over the
// Mezze heights and on the afternoon of the 30th the 5th Light Horse Brigade stood on the cliffs above the Barada gorge
// and fired down into the columns jammed on the road and the railway to Beirut — the gorge was choked with dead men,
// horses and carts. Before dawn on 1 October the 10th Light Horse rode through the city past the Serai, the Arab
// Northern Army came in from the south, and Damascus was taken.
// On the map, compressed: the Barada coming out of its gorge on the west flank — cliffs on both sides, the Beirut road
// on the north bank and the railway on the south, Dummar and its bridge in the bottom — then parting round the walled
// Old City (the Umayyad Mosque, its domes and three minarets, its courtyard; the Citadel; Straight Street from Bab
// al-Jabiya to Bab Sharqi; the gates and their bridges) and running out east into the Ghouta, the oasis of walled
// orchards and irrigation channels round Babila, Jobar and Harasta. Above the city to the north the bare slopes of
// Mount Qasioun and the Salihiye quarter at its foot; to the south the Mezze heights, the Midan quarter and the Hejaz
// railway station with its trains.
// Fair, not mirrored: the river crosses every route once — a bridge and a ford in the gorge, two bridges into the Old
// City on each arm, a bridge and a ford in the Ghouta — and the three middle points (Dummar, the Umayyad Mosque, Jobar)
// lie on the water, as far from each base. Qasioun’s answer is the Mezze heights: as high, as far from the gorge and
// from its own base, each on its own side of the gorge; one is a peaked bare ridge with a steep face, the other a broad
// flat-topped table with a scarp. The gorge on the west flank (cliffs, one road each side, open fire down into it) is
// answered on the east flank by the Ghouta (orchards and mud walls, channels across every route), and both straddle the
// middle, as much of each on each half. The Hejaz station answers Salihiye, Babila answers Harasta.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, buildSite } from './common.js';
import { arabVillage, evenThreshold, segDist, graded } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(1918_30);

// ---- the Barada: out of the gorge (west), round the Old City in two arms, out east into the Ghouta
const WEST = [[-580, 16], [-500, 6], [-430, 18], [-350, 10], [-280, -4], [-210, 6], [-160, 0]];
const EAST = [[160, 0], [230, -12], [300, -18], [370, -6], [440, -28], [510, -18], [580, -26]];
/** An arm round the Old City (s = -1 north, the Barada itself; +1 south, its branch), from (-160, 0) to (160, 0). */
const arm = (s: number) => Array.from({ length: 13 }, (_, i) => { const a = Math.PI * i / 12; return [-160 * Math.cos(a), s * (118 + 8 * Math.sin(3 * a + s)) * Math.sin(a)]; });
const ARM_N = arm(-1), ARM_S = arm(1);
const MAIN = [...WEST, ...ARM_N.slice(1, -1), ...EAST];
const HW = 8;
const river = createRiver({
  path: MAIN, paths: [MAIN, ARM_S], halfWidth: HW, level: 0, depth: 2.4, valley: 30,
  crossings: [
    { name: 'Rabwe ford', x: -480, z: 9, kind: 'ford', width: 14, depth: 0.7, channel: 0 },
    { name: 'Dummar bridge', x: -350, z: 10, kind: 'bridge', width: 10, channel: 0 },
    { name: 'Bab al-Faraj bridge', x: ARM_N[4][0], z: ARM_N[4][1], kind: 'bridge', width: 10, channel: 0 },
    { name: 'Bab Tuma bridge', x: ARM_N[9][0], z: ARM_N[9][1], kind: 'bridge', width: 10, channel: 0 },
    { name: 'Bab al-Jabiya bridge', x: ARM_S[3][0], z: ARM_S[3][1], kind: 'bridge', width: 10, channel: 1 },
    { name: 'Bab al-Saghir bridge', x: ARM_S[7][0], z: ARM_S[7][1], kind: 'bridge', width: 10, channel: 1 },
    { name: 'Jobar bridge', x: 300, z: -18, kind: 'bridge', width: 10, channel: 0 },
    { name: 'Zamalka ford', x: 450, z: -27, kind: 'ford', width: 14, depth: 0.7, channel: 0 },
  ],
});
/** The gorge: how much of it there is at x (all of it west of the city), and the distance to its water. */
const gorgeK = (x: number) => smoothstep(-170, -280, x);
const gorgeD = (x: number, z: number) => segDist(WEST, x, z);

// ---- the roads, the railway, the Ghouta’s channels
const shift = (poly: number[][], dz: number) => poly.filter(([x]) => x <= -210).map(([x, z]) => [x, z + dz]);
const ROADS = [
  [[0, 600], [0, 470], [30, 360], [80, 240], [70, 175], ARM_S[7], [34, 80], [30, 50], [42, 28], [36, 4], [0, 0]],                 // the Kiswe road to Bab al-Saghir
  [[0, -600], [0, -470], [-50, -370], [-100, -265], [-105, -175], ARM_N[4], [-55, -60], [-30, -20], [0, 0]], // the Homs road through Salihiye to Bab al-Faraj
  [[-96, 50], [96, 50]],                                                                                 // Straight Street
  [[0, 0], [50, -40], ARM_N[9], [200, -60], [300, -18]],                                                 // out by Bab Tuma to Jobar
  [[-96, 50], ARM_S[3], [-170, 130], [-215, 165], [-270, 215], [-350, 290]],                                          // out by Bab al-Jabiya up the Mezze heights
  [[300, 290], [300, 150], [300, -18], [330, -130], [380, -270]],                                        // the Ghouta road: Babila – Jobar – Harasta
  [[-520, 400], [-350, 290], [-150, 350], [30, 360], [300, 290], [520, 320]],                            // the lateral road behind the nato line
  [[-520, -390], [-330, -280], [-260, -285], [-190, -262], [-100, -265], [150, -330], [380, -270], [520, -280]],                     // and behind the pact line
  [...shift(WEST, -19), [-190, -22], [-200, -80], [-150, -150], [-105, -175]],                            // the Beirut road on the gorge’s north bank
];
const roadRaw = (x: number, z: number) => { let d = Infinity; for (const p of ROADS) d = Math.min(d, segDist(p, x, z)); for (let i = 2; i < GRADES.length; i++) d = Math.min(d, segDist(GRADES[i][0], x, z)); return d; };
const roadD = gridCache(roadRaw, EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
/** The railway: the Beirut line on the gorge’s south bank, round the city to the Hejaz station and on south to Deraa. */
const RAIL = [...shift(WEST, 19), [-190, 25], [-205, 120], [-120, 205], [80, 240], [100, 400], [110, 600]];
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), EXT, 1);
const onRail = (x: number, z: number) => railD(x, z) < 2.4;
/** The Ghouta’s irrigation channels: two along and one across on each half, each its own course. */
const DITCHES = [
  [[230, -14], [250, -120], [230, -240], [270, -380], [250, -580]], [[385, -10], [400, -150], [380, -300], [420, -480]],
  [[205, 2], [215, 130], [190, 260], [220, 420], [200, 580]], [[445, -22], [460, 120], [430, 260], [470, 430]],
  [[175, -200], [520, -230]], [[175, 190], [520, 170]],
];
const ditchD = gridCache((x: number, z: number) => (x < 150 ? 99 : Math.min(...DITCHES.map((p) => segDist(p, x, z)))), EXT, 2);
/** The Ghouta: east of the city, on both halves (its west edge each half’s own). */
const ghoutaEdge = (z: number) => Math.max(165, 185 + 170 * fbm(noise, 11.3, z * 0.008, 3));
const inGhouta = (x: number, z: number, pad = 0) => x > ghoutaEdge(z) + pad;
/** The Old City inside its walls (an oval). */
const WALL = { x: 118, z: 86 };
const inOld = (x: number, z: number, k = 1) => (x / (WALL.x * k)) ** 2 + (z / (WALL.z * k)) ** 2 < 1;

// ---- the heights: Qasioun (a peaked ridge, its steep face to the city) and the Mezze heights (a flat-topped table)
const QC = [[-620, -205], [-450, -250], [-290, -300], [-220, -335]];
const MZ = [[-620, 230], [-420, 265], [-230, 330]];
const lineZ = (poly: number[][], x: number) => {
  for (let i = 0; i < poly.length - 1; i++) if (x <= poly[i + 1][0]) { const t = (x - poly[i][0]) / (poly[i + 1][0] - poly[i][0]); return poly[i][1] + (poly[i + 1][1] - poly[i][1]) * Math.max(0, t); }
  return poly[poly.length - 1][1];
};
const SHELF = 47;   // B and H stand on the same height
/** The two roads up the heights from the city, graded so the guns’ teams and the lorries get up: to Mezze by Bab al-Jabiya, to Qasioun from Salihiye. */
const GRADES: [number[][], number[]][] = [
  [[[-170, 130], [-215, 165], [-270, 215], [-350, 290]], [3.5, 10, 42, SHELF]],
  [[[-100, -265], [-190, -262], [-260, -285], [-330, -280]], [3.2, 22, 42, SHELF]],
  // and a cart track each out of the gorge by Dummar, cut slanting up the cliff: to Qasioun from the north bank, to Mezze from the south
  [[[-300, -14], [-385, -58], [-360, -160], [-330, -280]], [1.6, 22, 26, SHELF]],
  [[[-400, 34], [-318, 74], [-330, 150], [-350, 290]], [1.6, 22, 29, SHELF]],
];

function groundRaw(x: number, z: number) {
  let h = 3.2 + fbm(noise, x * 0.004, z * 0.004, 4) * 2 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.6;
  // Qasioun: steep on its city face, gentler at the back
  const dq = segDist(QC, x, z), south = z > lineZ(QC, x);
  const kq = Math.max(0, 1 - dq / (south ? 150 : 175)), tq = smoothstep(-110, -250, x);
  const qas = (46 * smoothstep(0, 0.65, kq) + ridged(noise, x * 0.012 + 3, z * 0.012, 3) * 6 * kq) * tq;
  // the Mezze heights: a flat top, a scarp all round
  const dm = segDist(MZ, x, z) + fbm(noise, x * 0.01 + 5, z * 0.01, 2) * 22;
  const km = smoothstep(195, 95, dm) * smoothstep(-110, -250, x);
  const mez = 44 * km + fbm(noise, x * 0.03, z * 0.03, 2) * 1.5 * km;
  // the gorge: shoulders either side (the heights’ lower slopes), then the cliffs straight down to a narrow floor
  const g = gorgeK(x);
  const gd = g > 0 ? gorgeD(x, z) + fbm(noise, x * 0.04 + 9, z * 0.04, 2) * 5 : 999;
  h += Math.max(qas, mez, 22 * g * smoothstep(30, 50, gd) * smoothstep(280, 160, gd));
  if (g > 0) {
    const s = smoothstep(32, 48, gd);
    h += (1.6 - h) * g * (1 - s);
    h += ridged(noise, x * 0.05, z * 0.05, 2) * 2.5 * g * s * smoothstep(70, 50, gd);  // the broken cliff faces
  }
  for (const [poly, hs] of GRADES) {
    if (x < -420 || x > -80) continue;
    const r = graded(poly, hs, x, z); if (r.d < 14) h += (r.h - h) * smoothstep(14, 6, r.d);
  }
  // the Ghouta’s channels (bridged where the roads cross)
  if (x > 160) { const dd = ditchD(x, z); if (dd < 2.8) h -= 1.0 * smoothstep(2.8, 1.0, dd) * smoothstep(4, 8, roadRaw(x, z)); }
  // the shelves: B and H at the same height, the rest of the points (not those on the water) on the plain
  for (const p of points) {
    if (p.id === 'E' || p.id === 'G') continue;
    const d = Math.hypot(x - p.x, z - p.z);
    h += ((p.id === 'B' || p.id === 'H' ? SHELF : 3.2) - h) * smoothstep(48, 26, d);
  }
  for (const bz of [BASE_Z, -BASE_Z]) h += (3.5 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return h;
}
const ground = gridCacheSmooth(groundRaw, EXT, 2);
const height = (x: number, z: number) => river.carve(x, z, ground(x, z));

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Kiswe road', 0, 470, 'centre'),
  P('B', 'Mezze heights', -350, 290, 'west', { radius: 30 }),
  P('C', 'Hejaz station', 80, 240, 'centre'),
  P('D', 'Babila', 300, 300, 'east'),
  P('E', 'Dummar', -350, 10, 'west', { radius: 30 }),
  P('F', 'Umayyad Mosque', 0, 0, 'centre', { radius: 32 }),
  P('G', 'Jobar', 300, -18, 'east', { radius: 30 }),
  P('H', 'Qasioun', -330, -280, 'west', { radius: 30 }),
  P('I', 'Salihiye', -100, -265, 'centre'),
  P('J', 'Harasta', 380, -270, 'east'),
  P('K', 'Homs road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Section' }];

export default {
  id: 'damascus',
  name: 'Damascus',
  description: '30 September – 1 October 1918: the Barada coming out of its gorge under the cliffs where the Light Horse fired down on the road to Beirut, the walled Old City and the Umayyad Mosque between the river’s arms, the orchards and channels of the Ghouta, the bare slopes of Mount Qasioun and the Mezze heights.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  armies: { nato: ['anzac', 'uk'], pact: ['ot', 'de'] }, // (the Desert Mounted Corps, the Arab Northern Army riding with it, against the Ottoman Fourth Army and the German Asia Corps)
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.6, // (the gorge’s cliffs stop wheels and hooves; men climb)
  seed: 1918,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191830, cell: 80 }),

  theme: {
    // first light on 1 October, the sun coming up over the Ghouta, haze over the orchards
    fogColor: 0xd8c8b0, fogDensity: 0.001, skyTop: 0x6a88b4, skyHorizon: 0xf0d2a8, skyBottom: 0xb49c7c,
    sunColor: 0xffd8a8, sunIntensity: 1.9, sunDisk: 0.9, clouds: 0.1, cloudLight: 0xfae6cc, cloudDark: 0xbca490,
    sunDir: [0.75, 0.25, -0.2], hemiSky: 0xd6d2d0, hemiGround: 0x9a8060, hemiIntensity: 1.1, rimColor: 0xf6d0a0, rimIntensity: 0.4,
    terrain: {
      grass: '#a8966c', grassAlt: '#9e8c62', dryGrass: '#c2ac7c', dirt: '#9a7a56', rock: '#aa9a82',
      pasture: '#a4946a', ploughed: '#94724e', stubble: '#c4ac7c', meadow: '#a0966a',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRail(x, z)) return [0x6a5e50, 0.9];
        if (onRoad(x, z)) return [0xc4b08a, 0.85];
        if (x > 160 && ditchD(x, z) < 2.2) return [0x58706a, 0.8];                          // the channels’ water and weed
        if (inOld(x, z)) return [0xb8aa90, 0.6];                                              // the Old City’s paving and beaten earth
        const g = gorgeK(x);
        if (g > 0.3) { const gd = gorgeD(x, z); if (gd > 30 && gd < 60) return [0xb0a088, 0.85]; } // the gorge’s limestone cliffs
        if (inGhouta(x, z)) return [0x6e6a42, 0.55];                                          // the orchards’ watered earth
        if (y > 14) return [0xb8a688, 0.6];                                                   // bare stony slopes
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.22 ? [0x8a8256, Math.min(0.4, (scrub - 0.22) * 2)] : null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Takım' })),
  },

  /** No lines here: a war of movement. Machine guns on each side’s gorge rim, at its bridgehead and in its Ghouta village. */
  battlefield() {
    const works: any[] = [];
    for (const [x, z] of [[-290, 66], [44, 146], [296, 64]]) works.push({ kind: 'mgNest', x, z, yaw: Math.PI, faction: 'nato' });
    for (const [x, z] of [[-430, -58], [-60, -142], [334, -84]]) works.push({ kind: 'mgNest', x, z, yaw: 0, faction: 'pact' });
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const wetD = (x: number, z: number) => river.project(x, z).d;
    const skip = (x: number, z: number) => roadD(x, z) < 7 || railD(x, z) < 7 || wetD(x, z) < 16 || (x > 160 && ditchD(x, z) < 5) || steepAt(x, z) > 0.3;
    const m = new THREE.Matrix4();
    const minaret = (x: number, z: number, h: number) => {
      const g = terrain.heightAt(x, z);
      props.push('stone', new THREE.CylinderGeometry(1.2, 1.6, h, 8), m.makeTranslation(x, g + h / 2, z), 0xdcd0b4);
      props.push('stone', new THREE.CylinderGeometry(2.1, 1.8, 0.8, 8), m.makeTranslation(x, g + h * 0.78, z), 0xc8bca0); // the gallery
      props.push('stone', new THREE.ConeGeometry(1.3, 3.4, 8), m.makeTranslation(x, g + h + 1.7, z), 0x6e8070);
      cover.addCylinder({ x, z, radius: 1.7, height: h });
    };
    const dome = (x: number, z: number, r: number, base: number, color = 0x7a8a86) => {
      const g = terrain.heightAt(x, z);
      props.push('stone', new THREE.CylinderGeometry(r, r, 2.4, 16), m.makeTranslation(x, g + base + 1.2, z), 0xd0c4a8);
      props.push('stone', new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.makeTranslation(x, g + base + 2.4, z), color);
    };

    // ---- the Umayyad Mosque: the prayer hall and its Dome of the Eagle, the courtyard and its walls, the Treasury, three minarets
    props.rand = mulberry32(1918_01);
    props.hall({ x: 0, z: 28, yaw: 0, width: 58, depth: 16, height: 10, color: 0xcabc9c, roof: 0x6a706a, door: 6, name: 'Umayyad Mosque' });
    dome(0, 28, 7, 10.4);
    for (const [x, z, yaw, length] of [[-18, -22, 0, 22], [18, -22, 0, 22], [-29, -12, Math.PI / 2, 18], [-29, 12, Math.PI / 2, 10], [29, -12, Math.PI / 2, 18], [29, 12, Math.PI / 2, 10]]) {
      const n = Math.round(length / 5.5), dx = Math.cos(yaw), dz = -Math.sin(yaw);
      for (let k = 0; k < n; k++) {
        const o = (k + 0.5) * length / n - length / 2, wx = x + dx * o, wz = z + dz * o;
        if (roadD(wx, wz) > 5) props.lowWall({ x: wx, z: wz, yaw, length: length / n + 0.2, height: 5, color: 0xcfc2a2 });   // (an arch where a lane comes in)
      }
    }
    props.column({ x: -14, z: -10, radius: 2.2, height: 5 });                               // the Dome of the Treasury on its columns
    dome(-14, -10, 2.6, 5, 0x8a7a5a);
    minaret(0, -24, 26);                                                                     // the Minaret of the Bride
    minaret(27, 37, 30);                                                                     // the Minaret of Jesus
    minaret(-27, 37, 28);                                                                    // the Minaret of Qaitbay
    // ---- the Citadel in the north-west corner: its keep and corner towers
    props.flatHouse({ x: -86, z: -28, yaw: 0, width: 30, depth: 22, storeys: 3, name: 'Citadel' });
    for (const [dx, dz] of [[-16, -12], [16, -12], [-16, 12], [16, 12]]) props.column({ x: -86 + dx, z: -28 + dz, radius: 3, height: 12 });
    // ---- the walls: an oval of masonry, towers along it, a gate wherever a street goes through
    for (let i = 0; i < 64; i++) {
      const a = (i + 0.5) / 64 * Math.PI * 2, x = Math.cos(a) * WALL.x, z = Math.sin(a) * WALL.z;
      if (roadD(x, z) < 6 || Math.hypot(x + 86, z + 28) < 24) continue;
      const tx = -Math.sin(a) * WALL.x, tz = Math.cos(a) * WALL.z;
      props.lowWall({ x, z, yaw: Math.atan2(-tz, tx), length: Math.hypot(tx, tz) * Math.PI * 2 / 64 + 0.6, height: 5.5, color: 0xb8a684 });
      if (i % 5 === 0) props.column({ x, z, radius: 3, height: 7.5 });
    }
    // ---- the Old City’s houses packed in the lanes, and two quarter mosques
    const placed: number[][] = [];
    const taken = (x: number, z: number, r: number) => placed.some(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) < qr + r);
    for (const [x, z] of [[60, 10], [-50, 66]]) { props.flatHouse({ x, z, yaw: 0, width: 10, depth: 9, name: 'mosque', dome: true }); minaret(x + 7, z - 6, 18); placed.push([x, z, 8]); }
    const r0 = (props.rand = mulberry32(1918_02));
    for (let i = 0; i < 900 && placed.length < 80; i++) {
      const x = (r0() * 2 - 1) * WALL.x, z = (r0() * 2 - 1) * WALL.z;
      if (!inOld(x, z, 0.9) || roadD(x, z) < 6 || (Math.abs(x) < 36 && z > -30 && z < 42) || Math.hypot(x + 86, z + 28) < 26 || taken(x, z, 6)) continue;
      placed.push([x, z, 5]);
      props.flatHouse({ x, z, yaw: (r0() < 0.5 ? 0 : Math.PI / 2) + (r0() - 0.5) * 0.15, width: 6 + r0() * 4, depth: 5 + r0() * 3, storeys: r0() < 0.45 ? 2 : 1 });
    }
    // ---- the quarters outside the walls: Salihiye under Qasioun, the Midan and Marjeh to the south and west
    const r1 = (props.rand = mulberry32(1918_03));
    const outer: number[][] = [];
    for (let i = 0; i < 4000 && outer.length < 130; i++) {
      const a = r1() * Math.PI * 2, d = 140 + r1() * 150, x = Math.cos(a) * d * 1.1, z = Math.sin(a) * d;
      if (x > ghoutaEdge(z) - 20 || inOld(x, z, 1.55) || skip(x, z) || gorgeK(x) > 0.2 || nearPoint(x, z, 22) || Math.hypot(x - 60, z - 236) < 50
        || Math.hypot(x, Math.abs(z) - BASE_Z) < 120 || outer.some(([qx, qz]) => Math.hypot(qx - x, qz - z) < 13)) continue;
      outer.push([x, z]);
      props.flatHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (r1() - 0.5) * 0.2, width: 7 + r1() * 4, depth: 6 + r1() * 3, storeys: r1() < 0.3 ? 2 : 1 });
      if (r1() < 0.35) props.lowWall({ x: x + 6, z: z + 5, yaw: r1() < 0.5 ? 0 : Math.PI / 2, length: 7, height: 2, color: 0xb8a07a });
    }
    props.flatHouse({ x: -112, z: -228, yaw: 0, width: 12, depth: 10, name: 'mosque', dome: true });   // Salihiye’s mosque of Ibn Arabi
    minaret(-104, -236, 20);
    // ---- the Hejaz station: the station, the goods shed, the water tower, the abandoned trains
    props.rand = mulberry32(1918_04);
    props.flatHouse({ x: 40, z: 252, yaw: 0.17, width: 28, depth: 10, storeys: 2, name: 'Hejaz station' });
    props.hall({ x: 116, z: 204, yaw: Math.PI / 2, width: 18, depth: 10, height: 5, color: 0xa89878, roof: 0x6a6660, door: 6, name: 'goods shed' });
    props.tanks({ x: 104, z: 276, yaw: 0, count: 1, radius: 2.2, height: 8, color: 0x5a5048 });
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 30);
      for (let k = 0; k < n; k++) props.rails({ x0: ax + (bx - ax) * k / n, z0: az + (bz - az) * k / n, x1: ax + (bx - ax) * (k + 1) / n, z1: az + (bz - az) * (k + 1) / n });
    }
    for (const [t, kind, c] of [[0.5, 'box', 0x6a4a34], [0.58, 'box', 0x5a3e2c], [0.66, 'open', 0x6a5a44], [0.74, 'box', 0x5a3e2c]] as [number, string, number][]) {
      props.wagon({ x: -120 + 200 * t, z: 205 + 35 * t, yaw: Math.atan2(200, 35), kind, color: c });
    }
    // ---- the gorge: Dummar’s houses on the shoulders above its bridge; the shot-up columns along the Beirut road; fallen rock under the cliffs
    const r2 = (props.rand = mulberry32(1918_05));
    for (const [x, z] of [[-384, -58], [-366, -64], [-336, -62], [-392, 72], [-360, 66], [-326, 74]]) if (steepAt(x, z) < 0.3) props.flatHouse({ x, z, yaw: 0, width: 7, depth: 5.5, storeys: 1 });
    const gr = ROADS[ROADS.length - 1];
    for (let i = 0, n = 0; i < 400 && n < 18; i++) {
      const s = Math.floor(r2() * 5), [ax, az] = gr[s], [bx, bz] = gr[s + 1], t = r2();
      const x = ax + (bx - ax) * t + (r2() - 0.5) * 8, z = az + (bz - az) * t + 6;   // (pushed off the road towards the water: the way stays open)
      if (nearPoint(x, z, 26) || x > -220 || wetD(x, z) < 11) continue;
      n++;
      buildSite(props, { kind: 'wrecks', seed: Math.floor(r2() * 1e9) }, x, z, Math.atan2(bz - az, bx - ax));
    }
    for (let i = 0; i < 90; i++) {
      const x = -560 + r2() * 360, s = r2() < 0.5 ? -1 : 1, z = lineZ(WEST, x) + s * (30 + r2() * 26);
      if (onRoad(x, z) || onRail(x, z) || wetD(x, z) < 11) continue;
      props.boulder({ x, z, radius: 0.8 + r2() * 1.6 });
    }
    // ---- the heights: Qubbat al-Nasr on Qasioun’s crest, sangars on both, stones everywhere
    props.flatHouse({ x: -300, z: -300, yaw: 0.3, width: 6, depth: 6, name: 'Qubbat al-Nasr', dome: true });
    for (const p of points.filter((q) => q.id === 'B' || q.id === 'H')) {
      const t = p.z > 0 ? -1 : 1;
      props.sandbagRing({ x: p.x + 12, z: p.z + 10 * t, radius: 5, toward: t });
      props.sandbagRing({ x: p.x - 14, z: p.z + 6 * t, radius: 4.5, toward: t });
    }
    for (let i = 0; i < 260; i++) {
      const x = -560 + r2() * 480, z = (i % 2 ? -1 : 1) * (70 + r2() * 420);
      if (terrain.heightAt(x, z) < 10 || nearPoint(x, z, 30) || onRoad(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      if (r2() < 0.8) props.boulder({ x, z, radius: 0.8 + r2() * 1.8 });
      else props.lowWall({ x, z, yaw: r2() * 3, length: 5 + r2() * 4, height: 1.2, color: 0xa89a80 });
    }
    // ---- the Ghouta: Babila, Jobar, Harasta; the mud walls round the orchard plots
    arabVillage(props, 300, 300, 9, 1918_06, skip);
    arabVillage(props, 380, -270, 9, 1918_07, skip);
    arabVillage(props, 318, -50, 6, 1918_08, skip, false);
    arabVillage(props, 286, 24, 5, 1918_09, skip, false);
    const r3 = (props.rand = mulberry32(1918_10));
    const wallOk = (x: number, z: number) => inGhouta(x, z, 8) && !skip(x, z) && !nearPoint(x, z, 40) && Math.abs(x) < 495 && Math.abs(z) < 550;
    for (let gx = 200; gx <= 500; gx += 46) for (let gz = -540; gz <= 540; gz += 42) {
      if (r3() < 0.5 && wallOk(gx, gz + 21)) props.lowWall({ x: gx, z: gz + 21, yaw: Math.PI / 2, length: 30, height: 2.2, color: 0xa88e6a });
      if (r3() < 0.5 && wallOk(gx + 23, gz)) props.lowWall({ x: gx + 23, z: gz, yaw: 0, length: 34, height: 2.2, color: 0xa08868 });
    }
    // ---- cover over the open ground between the lines and the city
    const r = mulberry32(1918);
    for (let i = 0, n = 0; i < 4000 && n < 40; i++) {
      const x = -150 + r() * 320, z = (n % 2 ? -1 : 1) * (150 + r() * 330);
      if (skip(x, z) || inGhouta(x, z, -20) || nearPoint(x, z, 40) || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || outer.some(([qx, qz]) => Math.hypot(qx - x, qz - z) < 18)) continue;
      n++;
      buildSite(props, { kind: ['rocks', 'fieldwall', 'wrecks', 'fieldwall'][Math.floor(n / 2) % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    // ---- palms and cypresses in the city gardens, along the river’s banks
    for (let i = 0; i < 120; i++) {
      const a = r() * Math.PI * 2, d = 20 + r() * 230, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8;
      if (inGhouta(x, z) || roadD(x, z) < 8 || railD(x, z) < 6 || wetD(x, z) < 11 || taken(x, z, 4) || outer.some(([qx, qz]) => Math.hypot(qx - x, qz - z) < 8)
        || (Math.abs(x) < 36 && z > -30 && z < 42) || Math.hypot(x + 86, z + 28) < 26 || nearPoint(x, z, 14) || gorgeK(x) > 0.2) continue;
      props.rand = mulberry32(i + 7);
      props.palm({ x, z, height: 7 + r() * 5 });
    }
    commandPost(props, this.bases.nato, -1, 0xb0a07a);
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadD(x, z) < 7 || railD(x, z) < 4 || wetD(x, z) < 10 || inOld(x, z, 1.05) || (x > 160 && ditchD(x, z) < 3) }];
    // the Ghouta’s orchards (apricots, walnuts, olives), poplars along the river; a thin scatter elsewhere, none on the bare heights
    const og = (x: number, z: number) => fbm(noise, x * 0.012 + 30, z * 0.012, 2);
    const tP = evenThreshold((x, z) => (inGhouta(x, z) ? og(x, z) : -9), -0.35, (x, z) => z > 0);
    const orchards = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 5000, broadleaf: 1, autumn: 0.2, size: 0.6, maxY: 30,
      avoid: [...avoid, { test: (x: number, z: number) => !inGhouta(x, z) || outer.some(([qx, qz]) => Math.hypot(qx - x, qz - z) < 8) }],
      forest: (x: number, z: number) => (og(x, z) > (z > 0 ? -0.35 : tP) ? 1 : 0.2) });
    const poplars = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 260, broadleaf: 1, autumn: 0.3, size: 0.6, maxY: 12,
      avoid: [...avoid, { test: (x: number, z: number) => gorgeK(x) > 0.5 || inOld(x, z, 1.1) }],
      forest: (x: number, z: number) => { const d = wetD(x, z); return d > 10 && d < 22 ? 0.5 : -1; } });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.5, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grass.update(dt, t); orchards.update(dt, t); poplars.update(dt, t); },
    };
  },
} satisfies MapDef;
