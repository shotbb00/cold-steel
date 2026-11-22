// Tartus, summer 1985 (the big field, 1.0 × 1.12 km; a war that did not happen): the Soviet Navy's only base in the
// Mediterranean — the 5th Eskadra's material-technical supply point in the north of Tartus harbour, its quays, its fuel
// tanks and its stores. The war has come to the Levant and a US Marine and airborne raid has come ashore south of the
// town at Al-Hamidiyah to strike inland at the base; the Soviet garrison and its reinforcements come down the coast
// road from Baniyas. On the map, compressed: the sea along the whole west edge (Arwad island offshore), the coastal
// plain with its citrus groves inside their windbreaks and the olive groves on the slopes, the town in the middle — the
// walled Crusader citadel quarter of Tortosa on the shore with its keep, the cathedral of Our Lady of Tortosa at the
// east edge of the town, flat-roofed houses and the new concrete blocks — the port and its tank farm in the north-west,
// the coast road, the main road and the railway north–south, two dry wadis across the plain (the Wadi al-Abrash in the
// south under its bridge), and in the east terraced limestone hills climbing to the Alawite mountains: Yahmur with the
// Crusader tower of Chastel Rouge, the Safita road over its spur, the villages on the Dreikish road.
// The US Marines and airborne hold the south (+z, Al-Hamidiyah), the Soviet Army the north (-z, the Baniyas road).
// Fairness: not a mirror — the sea is on one flank and the mountains on the other, the town, citadel, cathedral, port
// and groves stand where they stand — but the sea and the hills run the whole length of the field so both halves have
// the same of each; the town straddles the middle (the citadel a little nearer the US, the cathedral a little nearer
// the Soviets); each half has a shore point (Amrit's temple / the port), a wadi crossing on its centre road (the
// Abrash bridge / the station by the northern wadi), a terraced hill village (Yahmur / the Dreikish road) of the same
// height, groves of the same area, and the Safita road spur in the hills on the centre line; points at matching
// distances from the bases (measured: tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { arabVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const EXT = { x: 640, z: 820 };   // the grid caches' reach (the field and a margin)
const noise = createNoise2D(1985_33);

// ---- the shore down the west edge: x of the waterline at z; the port's basin and its mole in the north
const coastX = (z: number) => -440 + 16 * Math.sin(z * 0.009 + 0.5) + 8 * Math.sin(z * 0.023 + 2);
const PORT = { x: -450, z: -330, w: 70, d: 150 };   // the basin, dredged into the shore (x: its middle)
const inBasin = (x: number, z: number) => Math.abs(x - PORT.x) < PORT.w / 2 && Math.abs(z - PORT.z) < PORT.d / 2;
/** The mole: out from the shore north of the basin, then south along its sea side. */
const MOLE = [[-420, -415], [-505, -415], [-505, -250]];
const ARWAD = { x: -700, z: -70, r: 42 };

function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const polyDist = (l: number[][], x: number, z: number) => { let d = Infinity; for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1])); return d; };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Al-Hamidiyah', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Amrit', x: -330, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Abrash bridge', x: 20, z: 262, owner: null, sector: 'centre' },
  { id: 'D', name: 'Yahmur', x: 320, z: 290, owner: null, sector: 'east', radius: 24 },
  { id: 'E', name: 'Citadel of Tortosa', x: -315, z: 40, owner: null, sector: 'west', radius: 28 },
  { id: 'F', name: 'Our Lady of Tortosa', x: -40, z: -20, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Safita road', x: 285, z: -30, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Tartus port', x: -310, z: -340, owner: null, sector: 'west', radius: 28 },
  { id: 'I', name: 'Tartus station', x: -50, z: -275, owner: null, sector: 'centre' },
  { id: 'J', name: 'Dreikish road', x: 360, z: -245, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Baniyas road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, [p.x, p.z]]));
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the roads: the coast road (west), the main road (centre), the hill road (east), the laterals, the town's streets
const ROADS: number[][][] = [
  [[-150, 640], [-175, 480], P.B, [-290, 170], P.E, [-280, -110], [-300, -230], P.H, [-210, -470], [-170, -640]],   // the coast road
  [[0, 640], P.A, [15, 380], P.C, [-5, 130], P.F, [-25, -150], P.I, [-15, -380], P.K, [0, -640]],                         // the main road
  [P.A, [170, 420], P.D, [305, 140], P.G, [330, -120], P.J, [200, -400], P.K],                                            // the hill road
  [P.B, [-150, 270], P.C], [[-5, 130], [160, 150], [305, 140]],                                                            // the laterals, the south's own…
  [P.H, [-170, -300], P.I], [[-25, -150], [150, -135], [330, -120]],                                                      // …and the north's
  [P.E, [-180, 25], P.F], [P.F, [120, -40], P.G],                                                                          // through the town to the Safita road
  [[-360, -75], [-60, -95]], [[-370, 105], [-50, 100]], [[-180, -110], [-180, 120]], [[-110, -100], [-110, 110]],          // the town's streets
  [[-440, 40], P.E], [[-300, -230], [-420, -260]],                                                                         // to the corniche and the quays
];
const roadDistExact = (x: number, z: number) => { let d = Infinity; for (const l of ROADS) d = Math.min(d, polyDist(l, x, z)); return d; };
/** The road distance, sampled once onto a 4 m grid (every height sample asks it; read bilinear, a distance stays smooth). */
const roadDist = gridCacheSmooth(roadDistExact, EXT, 4);

// ---- the railway: the coast line north–south past the station, a siding into the port
const RAIL = [[-95, 640], [-85, 300], [-130, 120], [-150, -60], [-110, -200], [-85, -290], [-110, -450], [-120, -640]];
const SIDING = [[-110, -200], [-230, -250], [-400, -270]];
const railDist = (x: number, z: number) => Math.min(polyDist(RAIL, x, z), polyDist(SIDING, x, z));

// ---- the dry wadis: the Wadi al-Abrash across the south (under the Abrash bridge), its northern twin across the north
const wadiZ = (x: number, n: number) => (n > 0 ? 250 + 22 * Math.sin(x * 0.008 + 0.4) + 8 * Math.sin(x * 0.03) : -232 - 26 * Math.sin(x * 0.007 + 2.1) - 7 * Math.sin(x * 0.027 + 1));
const wadiD = (x: number, z: number) => Math.min(Math.abs(z - wadiZ(x, 1)), Math.abs(z - wadiZ(x, -1)));

// ---- the town: the walled citadel quarter on the shore, the new town east to the cathedral
const TOWN = { x: -190, z: 5, rx: 170, rz: 125 };
const townE = (x: number, z: number) => Math.hypot((x - TOWN.x) / TOWN.rx, (z - TOWN.z) / TOWN.rz);
const OLD = { x: -330, z: 40, w: 76, d: 86 };      // the citadel's walls (a rectangle)
const inOld = (x: number, z: number, m = 0) => Math.abs(x - OLD.x) < OLD.w / 2 + m && Math.abs(z - OLD.z) < OLD.d / 2 + m;

// ---- the citrus groves on the plain, inside their cypress windbreaks [x, z, w, d]: the same area on each half
const GROVES = [[-210, 385, 110, 70], [125, 365, 90, 60], [-170, 190, 70, 56], [140, 235, 80, 60],
  [-215, -400, 100, 70], [120, -345, 90, 70], [-235, -165, 80, 50], [150, -230, 70, 70]];
const inGrove = (x: number, z: number, pad = 0) => GROVES.some(([gx, gz, w, d]) => Math.abs(x - gx) < w / 2 + pad && Math.abs(z - gz) < d / 2 + pad);

// ---- the hills: limestone rising east to the Alawite mountains, spurs and re-entrants; the knolls of the hill points
const KNOLLS = [[320, 290, 55, 9], [360, -245, 55, 4], [285, -30, 60, 5]];
function hillsExact(x: number, z: number) {
  const k = smoothstep(70, 480, x + 30 * fbm(noise, z * 0.006, x * 0.004, 2));
  let h = k ** 1.25 * (36 + 16 * ridged(noise, x * 0.006 + 11, z * 0.009, 3));
  for (const [cx, cz, r, a] of KNOLLS) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return h;
}
const hillsH = gridCacheSmooth(hillsExact, EXT, 4);
/** Terraces: the hillside cut into 3 m steps (risers a third of each step), smooth again on the roads and the points. */
function terrace(h: number) {
  const t = h / 3, f = t - Math.floor(t);
  return (Math.floor(t) + smoothstep(0.62, 1, f)) * 3;
}
/** How flat the ground is made here: 1 on the roads, the points' squares, the bases. */
function flatK(x: number, z: number) {
  let k = smoothstep(14, 5, roadDist(x, z));
  for (const p of points) k = Math.max(k, smoothstep(48, 30, Math.hypot(x - p.x, z - p.z)));
  return k;
}

function ground(x: number, z: number) {
  // Arwad, offshore
  const ad = Math.hypot(x - ARWAD.x, z - ARWAD.z);
  const d = x - coastX(z);                                                       // + inland
  if (d < 0 || ad < ARWAD.r + 20) {
    let s = Math.max(-14, 0.3 + d * 0.11);
    if (inBasin(x, z)) s = Math.min(s, -6);
    s = Math.max(s, 2.2 - ad * 0.12 + (ad < ARWAD.r ? 1.2 : 0));                  // the island's low rock
    if (polyDist(MOLE, x, z) < 7) s = Math.max(s, 2.6 * smoothstep(7, 5, polyDist(MOLE, x, z)) + s * smoothstep(5, 7, polyDist(MOLE, x, z)));
    return s;
  }
  let h = 0.3 + Math.min(d, 30) * 0.08 + d * 0.004 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.4;   // the beach, the plain
  h = Math.max(h, 0.3 + Math.min(d, 30) * 0.03);                                // (no hollow below the sea behind the beach)
  if (inBasin(x, z)) h = -6;
  const hh = hillsH(x, z);
  const fk = flatK(x, z);
  h += hh > 2 ? hh + (terrace(hh) - hh) * smoothstep(2, 6, hh) * (1 - fk) : hh;
  h = Math.max(h - 3.2 * smoothstep(11, 4, wadiD(x, z)) * (1 - smoothstep(9, 4, roadDist(x, z))), Math.min(h, 0.8)); // the wadis' beds (dry to the shore; filled under the roads: culverts)
  h += smoothstep(470, 640, x) * 70 * (1 + 0.4 * fbm(noise, x * 0.004 + 77, z * 0.006, 2)); // the Alawite mountains behind the east edge
  return h;
}
function height(x: number, z: number) {
  let h = ground(x, z);
  if (x - coastX(z) > 0 && !inBasin(x, z)) {
    if (townE(x, z) < 1.05) h += (2.6 + Math.min(1.5, (x - coastX(z)) * 0.01) - h) * smoothstep(1.05, 0.9, townE(x, z)); // the town on its level ground
    for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  }
  return h;
}

/** The olive groves on the terraces (sight half-blocked) and the citrus groves on the plain. */
const oliveN = (x: number, z: number) => fbm(noise, x * 0.011 + 40, z * 0.011 - 9, 2);
const terraced = (x: number, z: number) => smoothstep(3, 8, hillsH(x, z)) * smoothstep(38, 28, hillsH(x, z));
const woods = gridCache((x: number, z: number) => Math.max(inGrove(x, z) ? 0.45 : 0, terraced(x, z) * smoothstep(0.05, 0.2, oliveN(x, z)) * 0.35)
  * smoothstep(5, 10, roadDist(x, z)), BOUNDS);

const sea = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false, // (water that stops, as a river's does: a land battle — world/Sea.js answers the rest)
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a6278, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.9 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200, 1, 1), mat);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    water.userData.noAO = true;
    scene.add(water);
    this.waterMesh = water;
  },
};

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 20, name: '1st Platoon' }];

export default {
  id: 'tartus',
  name: 'Tartus',
  description: 'The Syrian coast, summer 1985: a US Marine and airborne raid strikes inland at the Soviet Navy’s Mediterranean supply point in Tartus — the port and its fuel tanks, the Crusader citadel and cathedral, citrus and olive groves on the coastal plain, dry wadis, and terraced limestone hills rising to the Alawite mountains.',
  epochs: ['1985'],
  region: 'europe',
  armies: { nato: ['us'], pact: ['sov'] }, // (the US Marines and the 82nd Airborne’s raid against the Soviet garrison of the supply point)
  sides: { nato: 'United States', pact: 'Soviet Union' },
  conditions: { time: 'day', weather: 'clear' },
  climate: 'desert',   // sand paint and khaki drill (render/paint.js CLIMATE), as on the 1945 North Africa maps
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985_33,
  height,
  river: sea,
  woods,
  // each side's strip on the coastal plain behind its own flank (the Marines' expeditionary field / the base's)
  airfields: [{ faction: 'nato', x: -230, z: 470, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -230, z: -470, yaw: -Math.PI / 2, large: false }],

  theme: {
    // a hot, hazy July day on the Levantine coast
    fogColor: 0xd6d0bc, fogDensity: 0.0009, skyTop: 0x6c98c8, skyHorizon: 0xe2dccb, skyBottom: 0xa89c80,
    sunColor: 0xfff0d2, sunIntensity: 2.25, sunDisk: 0.85, clouds: 0.1, cloudLight: 0xf6f2ea, cloudDark: 0xccc4b4,
    sunDir: [-0.45, 0.75, 0.4], hemiSky: 0xd6dce4, hemiGround: 0x96845e, hemiIntensity: 1.2, rimColor: 0xf0e2c4, rimIntensity: 0.3,
    terrain: {
      grass: '#a09062', grassAlt: '#928658', dryGrass: '#bea874', dirt: '#986a4a', rock: '#c2b8a2',
      pasture: '#9c8e5e', ploughed: '#8e6446', stubble: '#c0aa76', meadow: '#98905c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = x - coastX(z);
        if (d < 0) return y > -1.5 ? [0xd8c8a0, 0.9] : null;                                // the sand under the shallows
        if (d < 16 && !inOld(x, z, 10) && townE(x, z) > 1) return [0xdccca2, 0.85];          // the beach
        if (inBasin(x, z) || (Math.abs(z - PORT.z) < PORT.d / 2 + 30 && d < 90)) return [0x8e8a80, 0.85]; // the quays' concrete
        if (roadDist(x, z) < 4.5) return [0x6a6864, 0.9];                                   // asphalt
        if (railDist(x, z) < 3) return [0x5e5448, 0.9];                                     // ballast
        if (inOld(x, z)) return [0xb8ac90, 0.75];                                           // the citadel's stone lanes
        if (townE(x, z) < 0.95) return [0xa89c84, 0.6];                                     // the town's dust and pavements
        if (wadiD(x, z) < 7) return [0xd8ceb6, 0.85];                                       // the wadi's white stones
        if (inGrove(x, z, 2)) return [0x7a5236, 0.7];                                       // terra rossa, irrigated
        const hh = hillsH(x, z);
        if (hh > 3) {
          const f = hh / 3 - Math.floor(hh / 3);
          if (f > 0.66 && f < 0.98) return [0xc8bea8, 0.55];                                // the terraces' limestone risers
          return [0x8a6446, 0.45];                                                          // their red earth
        }
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.22 ? [0x80784c, Math.min(0.4, (scrub - 0.22) * 2)] : null;          // thorn scrub
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1-ya Rota' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene);
    const placed: number[][] = [];
    const clear = (x: number, z: number, r: number) => roadDist(x, z) > 6 + r && railDist(x, z) > 5 + r && x - coastX(z) > 12 + r && wadiD(x, z) > 9 + r
      && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 + r && placed.every(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) > qr + r);
    const put = (x: number, z: number, r: number) => { placed.push([x, z, r]); return true; };
    const sq = (x: number, z: number) => nearPoint(x, z, 14);   // (the points' squares stay open)

    // ---- the citadel of Tortosa: its wall and towers round the old quarter, the Templar keep on the shore side, its chapel
    props.rand = mulberry32(1985_34);
    const wallSeg = (x0: number, z0: number, x1: number, z1: number) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 8), yaw = Math.atan2(-(z1 - z0), x1 - x0);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        if (roadDist(x, z) < 7) continue;                                                      // (the gates)
        props.lowWall({ x, z, yaw, length: L / n + 0.2, height: 4.2, color: 0xb0a286 });
      }
    };
    const ox = [OLD.x - OLD.w / 2, OLD.x + OLD.w / 2], oz = [OLD.z - OLD.d / 2, OLD.z + OLD.d / 2];
    wallSeg(ox[0], oz[0], ox[1], oz[0]); wallSeg(ox[1], oz[0], ox[1], oz[1]); wallSeg(ox[1], oz[1], ox[0], oz[1]); wallSeg(ox[0], oz[1], ox[0], oz[0]);
    for (const x of ox) for (const z of oz) props.box('stone', x, terrain.heightAt(x, z) + 3, z, 6, 7.5, 6, 0, 0xa89a7e);
    props.hall({ x: OLD.x - 22, z: OLD.z - 26, yaw: 0, width: 16, depth: 14, height: 12, color: 0xa89a7e, roof: 0x9a8e74, door: 3, name: 'Templar keep' });
    props.hall({ x: OLD.x + 18, z: OLD.z + 26, yaw: Math.PI / 2, width: 18, depth: 9, height: 7, color: 0xb0a286, roof: 0x9a8e74, door: 3, name: 'Templar chapel' });
    put(OLD.x - 22, OLD.z - 26, 12); put(OLD.x + 18, OLD.z + 26, 11);
    for (let gx = ox[0] + 8; gx < ox[1] - 6; gx += 11) for (let gz = oz[0] + 8; gz < oz[1] - 6; gz += 10) {
      const x = gx + (props.rand() - 0.5) * 2, z = gz + (props.rand() - 0.5) * 2;
      if (sq(x, z) || !clear(x, z, 3) || props.rand() < 0.25) continue;
      put(x, z, 4.5);
      props.flatHouse({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 7 + props.rand() * 2, depth: 6 + props.rand() * 2, storeys: 1 + Math.floor(props.rand() * 2) });
    }
    // ---- the cathedral of Our Lady of Tortosa: the fortress-church at the town's east edge, its square before it
    props.hall({ x: -40, z: -52, yaw: 0, width: 18, depth: 34, height: 13, color: 0xd2c6a8, roof: 0xc0b498, door: 5, name: 'cathedral of Our Lady of Tortosa' });
    for (const s of [-1, 1]) props.box('stone', -40 + s * 10, terrain.heightAt(-40 + s * 10, -36) + 8, -36, 4, 16, 4, 0, 0xa89a7e);
    put(-40, -52, 20);
    // ---- the town: flat-roofed houses, shops of two and three storeys, the new concrete blocks toward the cathedral
    props.rand = mulberry32(1985_35);
    for (let gx = TOWN.x - TOWN.rx; gx <= TOWN.x + TOWN.rx; gx += 15) for (let gz = TOWN.z - TOWN.rz; gz <= TOWN.z + TOWN.rz; gz += 14) {
      const x = gx + (props.rand() - 0.5) * 4, z = gz + (props.rand() - 0.5) * 4;
      if (townE(x, z) > 0.95 || inOld(x, z, 8) || sq(x, z) || props.rand() < 0.2) continue;
      if (x > -150 && props.rand() < 0.3) {
        if (!clear(x, z, 13)) continue;
        put(x, z, 13);
        props.ruinBlock({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 24, depth: 11, storeys: 4 + Math.floor(props.rand() * 2), ruin: 0, name: 'apartment block' });
      } else {
        if (!clear(x, z, 5)) continue;
        put(x, z, 5);
        props.flatHouse({ x, z, yaw: props.rand() < 0.5 ? 0 : Math.PI / 2, width: 7 + props.rand() * 3, depth: 7 + props.rand() * 2, storeys: 1 + Math.floor(props.rand() * 3), name: props.rand() < 0.3 ? 'shop house' : 'house' });
      }
    }
    props.flatHouse({ x: -230, z: -40, yaw: 0, width: 11, depth: 10, name: 'mosque', dome: true }); put(-230, -40, 9);
    // ---- the port: the quays, the supply point's stores, its cranes, a supply ship alongside, the mole
    props.rand = mulberry32(1985_36);
    const qx = PORT.x + PORT.w / 2;                                                             // the quay's edge
    for (let z = PORT.z - PORT.d / 2; z < PORT.z + PORT.d / 2; z += 10) props.box('stone', qx + 1, 0.4, z + 5, 2, 3.2, 10, 0, 0x8a867e);
    for (const [x, z, w, d, name] of [[-380, -390, 24, 14, 'stores shed'], [-385, -330, 26, 14, 'stores shed'], [-380, -275, 22, 12, 'workshop']] as [number, number, number, number, string][]) {
      if (!clear(x, z, 12)) continue;
      put(x, z, 13);
      props.hall({ x, z, yaw: Math.PI / 2, width: w, depth: d, height: 7, color: 0x9a948a, roof: 0x6a6c6e, door: 6, name });
    }
    for (const z of [-360, -300]) {                                                             // the cranes on the quay
      const x = qx - 6, y = terrain.heightAt(x, z);
      for (const s of [-1, 1]) props.box('metal', x, y + 8, z + s * 2.5, 0.8, 16, 0.8, 0, 0xb87a2a);
      props.box('metal', x - 6, y + 16.5, z, 20, 1.2, 1.4, 0, 0xb87a2a);
      props.box('metal', x + 1, y + 13, z, 3, 3, 4, 0, 0x8a5a2a);
    }
    {                                                                                           // the supply ship alongside (a Boris Chilikin oiler’s shape, much shortened)
      const x = qx - 14, z = PORT.z;
      props.box('metal', x, 1.2, z, 11, 5, 70, 0, 0x4a5258);
      props.box('metal', x, 5.5, z + 28, 9, 4, 10, 0, 0xd8d8d0);
      props.box('metal', x, 9, z + 30, 3, 4, 3, 0, 0x2a2a2a);
      for (const k of [-15, 0]) props.box('metal', x, 6, z + k, 1, 6, 1, 0, 0x6a6a6a);
    }
    for (let i = 0; i < MOLE.length - 1; i++) {                                                 // the mole's breakwater blocks
      const [x0, z0] = MOLE[i], [x1, z1] = MOLE[i + 1], L = Math.hypot(x1 - x0, z1 - z0);
      for (let t = 4; t < L; t += 9) {
        const x = x0 + (x1 - x0) * t / L, z = z0 + (z1 - z0) * t / L;
        props.boulder({ x: x + (props.rand() - 0.5) * 6, z: z + (props.rand() - 0.5) * 6, radius: 1.4 + props.rand() });
      }
    }
    // the tank farm south of the port: the fuel tanks in their bund
    for (const [x, z] of [[-390, -202], [-390, -168]]) {
      props.tanks({ x, z, yaw: 0, count: 3, radius: 7, height: 10, color: 0xd4d2c8 });
      put(x, z, 26);
    }
    for (const [x, z, yaw, len] of [[-390, -222, 0, 64], [-390, -148, 0, 64], [-422, -185, Math.PI / 2, 74], [-358, -185, Math.PI / 2, 74]] as number[][]) props.lowWall({ x, z, yaw, length: len, height: 1.6, color: 0xb0a690 });
    for (const [x, z] of [[-290, -330], [-330, -360], [-300, -385]]) props.sandbagRing({ x, z, radius: 5, toward: 1 });
    for (let k = 0; k < 6; k++) props.crates({ x: -350 + (k % 3) * 5, z: -310 + Math.floor(k / 3) * 5, yaw: k * 0.4 });
    // ---- Amrit: the Phoenician temple in its rock-cut pool, its columns, the village by the Nahr Amrit
    props.rand = mulberry32(1985_37);
    props.box('stone', -360, terrain.heightAt(-360, 330) + 2.5, 330, 6, 5, 6, 0.1, 0xc4b896);   // the cella on its rock
    for (let a = 0; a < 10; a++) {
      const x = -360 + Math.cos(a * 0.63) * 18, z = 330 + Math.sin(a * 0.63) * 14;
      if (props.rand() < 0.75) props.column({ x, z, radius: 0.6, height: 2 + props.rand() * 2 });
    }
    put(-360, 330, 20);
    arabVillage(props, -300, 300, 7, 1985_38, (x, z) => !clear(x, z, 4) || sq(x, z), false);
    // ---- the station by the northern wadi, the rails, wagons in the siding
    for (const l of [RAIL, SIDING]) for (let i = 0; i < l.length - 1; i++) props.rails({ x0: l[i][0], z0: l[i][1], x1: l[i + 1][0], z1: l[i + 1][1] });
    props.flatHouse({ x: -70, z: -300, yaw: Math.PI / 2, width: 16, depth: 8, storeys: 2, name: 'Tartus station' }); put(-70, -300, 10);
    props.hall({ x: -125, z: -320, yaw: Math.PI / 2, width: 20, depth: 10, height: 6, color: 0xa89878, roof: 0x6a6660, door: 6, name: 'goods shed' }); put(-125, -320, 12);
    for (const [t, kind, c] of [[0.15, 'tank', 0x2a2a28], [0.25, 'tank', 0x2a2a28], [0.45, 'box', 0x6a4a34], [0.6, 'open', 0x5e5040]] as [number, string, number][]) {
      const [x0, z0] = SIDING[1], [x1, z1] = SIDING[2];
      props.wagon({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, yaw: Math.atan2(x1 - x0, z1 - z0), kind, color: c });
    }
    // ---- the Abrash bridge: its parapets over the dry wadi; a culvert's parapets where the other roads cross
    for (const n of [1, -1]) for (const l of ROADS.slice(0, 3)) for (let i = 0; i < l.length - 1; i++) {
      const [x0, z0] = l[i], [x1, z1] = l[i + 1];
      for (let t = 0; t <= 1; t += 0.01) {
        const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        if (Math.abs(z - wadiZ(x, n)) > 0.8) continue;
        const yaw = Math.atan2(-(z1 - z0), x1 - x0) + Math.PI / 2, s = Math.hypot(x1 - x0, z1 - z0);
        for (const side of [-1, 1]) props.lowWall({ x: x + (z1 - z0) / s * 6 * side, z: z - (x1 - x0) / s * 6 * side, yaw: yaw + Math.PI / 2, length: 10, height: 0.9, color: 0xb0a690 });
        break;
      }
    }
    // ---- the hill villages: Yahmur under Chastel Rouge, the Safita road, the Dreikish road
    arabVillage(props, P.D[0], P.D[1], 8, 1985_39, (x, z) => !clear(x, z, 4) || sq(x, z));
    arabVillage(props, P.G[0], P.G[1], 6, 1985_40, (x, z) => !clear(x, z, 4) || sq(x, z), false);
    arabVillage(props, P.J[0], P.J[1], 8, 1985_41, (x, z) => !clear(x, z, 4) || sq(x, z));
    props.hall({ x: 352, z: 312, yaw: 0.3, width: 13, depth: 13, height: 11, color: 0xa8967a, roof: 0x8e826c, door: 3, name: 'Chastel Rouge' }); put(352, 312, 12);
    // ---- the groves' cypress-hedged edges (windbreaks) and a pump house in each
    props.rand = mulberry32(1985_42);
    for (const [gx, gz, w, d] of GROVES) {
      for (const [lx, lz, len, alongX] of [[0, d / 2, w, 1], [0, -d / 2, w, 1], [w / 2, 0, d, 0], [-w / 2, 0, d, 0]] as number[][]) {
        for (let t = -len / 2 + 6; t < len / 2 - 4; t += 12) {
          if (Math.abs(t) < 5) continue;                                                       // (the gate)
          const x = gx + lx + (alongX ? t : 0), z = gz + lz + (alongX ? 0 : t);
          if (roadDist(x, z) > 7 && railDist(x, z) > 5 && wadiD(x, z) > 8 && !sq(x, z)) props.lowWall({ x, z, yaw: alongX ? 0 : Math.PI / 2, length: 10, height: 1.5, color: 0x9a8e70 });
        }
      }
      const px = gx + w / 4, pz = gz - d / 4;
      if (clear(px, pz, 4)) { put(px, pz, 4); props.flatHouse({ x: px, z: pz, yaw: 0, width: 5, depth: 4, name: 'pump house' }); }
    }
    // ---- cover on the plain and the terraces: farms, walls, rocks, wrecks, each half its own dice, as many on each
    const kinds = ['farm', 'fieldwall', 'rocks', 'fieldwall', 'wrecks', 'farm', 'rocks'];
    for (const side of [1, -1]) {
      const r = mulberry32(1985_43 + side);
      for (let tries = 0, n = 0; n < 70 && tries < 6000; tries++) {
        const x = (r() * 2 - 1) * 470, z = side * (30 + r() * 480);
        if (nearPoint(x, z, 40) || townE(x, z) < 1.15 || inGrove(x, z, 6) || !clear(x, z, 12) || x < -380) continue;
        put(x, z, 12);
        const kind = kinds[n++ % kinds.length], yaw = r() * Math.PI, seed = Math.floor(r() * 1e9);
        if (kind !== 'farm') { buildSite(props, { kind, seed }, x, z, yaw); continue; }
        props.rand = mulberry32(seed);                                                         // a flat-roofed farmstead and its yard wall
        props.flatHouse({ x, z, yaw: Math.round(yaw * 2 / Math.PI) * Math.PI / 2, width: 8 + props.rand() * 3, depth: 6 + props.rand() * 2, storeys: props.rand() < 0.3 ? 2 : 1 });
        props.lowWall({ x: x + 7, z: z + 6, yaw: Math.round(yaw * 2 / Math.PI) * Math.PI / 2, length: 10, height: 1.6, color: 0xb8a07a });
      }
    }
    // palms along the corniche and in the town
    props.rand = mulberry32(1985_44);
    for (let z = -220; z < 230; z += 18) {
      const x = coastX(z) + 22;
      if (clear(x, z, 1) && !inOld(x, z, 4) && !sq(x, z)) props.palm({ x, z, height: 8 + props.rand() * 4 });
    }
    // Arwad, offshore: its houses and the old fort
    props.rand = mulberry32(1985_45);
    for (let i = 0; i < 16; i++) {
      const a = props.rand() * Math.PI * 2, d = props.rand() * (ARWAD.r - 12);
      props.flatHouse({ x: ARWAD.x + Math.cos(a) * d, z: ARWAD.z + Math.sin(a) * d, yaw: Math.round(a * 2 / Math.PI) * Math.PI / 2, width: 7, depth: 6, storeys: 1 + Math.floor(props.rand() * 2) });
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xb0a07a);
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5.5 || railDist(x, z) < 4.5 || wadiD(x, z) < 6 || x - coastX(z) < 10 || inOld(x, z, 4) || inBasin(x, z) }];
    // the orange and lemon trees in rows in the groves (small, dark, glossy); olives on the terraces; cypresses, carobs and pines scattered
    const oranges = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1700, broadleaf: 1, autumn: 0, size: 0.5, maxY: 80,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3) }], forest: (x: number, z: number) => (inGrove(x, z) ? 1 : -1) });
    const tN = 0.12, tP = evenThreshold(oliveN, tN, (x, z) => z > 0);   // (the olive groves as thick on each half)
    const olives = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 2400, broadleaf: 1, autumn: 0.08, size: 0.6, maxY: 90,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 4) || townE(x, z) < 1.05 }],
      forest: (x: number, z: number) => (terraced(x, z) > 0.3 && oliveN(x, z) > (z > 0 ? tN : tP) ? 0.75 : 0.015) });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 500, broadleaf: 0.3, autumn: 0, size: 0.85, maxY: 140,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 4) || townE(x, z) < 1.0 }],
      forest: (x: number, z: number) => (hillsH(x, z) > 30 ? 0.35 : 0.01) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.5 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); oranges.update(dt, t); olives.update(dt, t); pines.update(dt, t); },
    };
  },
} satisfies MapDef;
