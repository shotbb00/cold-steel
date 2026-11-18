// Arnhem, September 1944 — Operation Market Garden (1945 only; the big field, 1.0 × 1.12 km). The Lower Rhine across the
// middle of the map and three ways over it: in the middle the road bridge, the steel arch that Frost's 2nd Parachute
// Battalion held from the houses round its north end for three days and four nights; out west the railway bridge at
// Oosterbeek (blown in the faces of C Company on the first afternoon) and out east the pontoon bridge. North of the river
// Arnhem's streets of brick houses round the Eusebiuskerk, the villas and woods of Oosterbeek with the old church by the
// river and the Hartenstein hotel, and beyond them the woods and the open heath of the drop zones, wrecked Horsa gliders
// on it. Along the banks the winter dykes. The British come from the drop zones (+z), the Germans hold the far bank (-z):
// the Betuwe, the polder between the Rhine and the Waal. Not mirrored, but fair: Arnhem's streets and the villas of
// Oosterbeek on the north bank against the built-up south end of the bridge, the Malburgen brickworks and the villages
// of the polder (Elden, Driel, Huissen) with their orchards on the south; the dyke runs unbroken along the south bank,
// the heath of the drop zones is open, the orchards are cover; each point about as far from one base as its
// counterpart is from the other.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, commandPost } from './common.js';
import { steelBridges } from './remagen.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const SIDE = 330;     // the railway bridge (west) and the pontoon bridge (east)
const HW = 26;        // the Lower Rhine's half-width
const DYKE = 64;      // the winter dyke, from the river's middle
const TOWN = { x: 190, a0: 44, a1: 205 }; // Arnhem: |x| < 190, from the quay back to the railway
const RAIL_A = 236;   // the railway behind the town (Oosterbeek – Arnhem station – Velp)
const noise = createNoise2D(1944_09);
const lerp = (a, b, k) => a + (b - a) * k;

// the river: swinging north toward Oosterbeek and Velp, south under the bridge
const riverZ = (x) => 12 * Math.sin(x * 0.005) + 5 * Math.sin(x * 0.013) + 14 * (1 - Math.cos(x * 0.006));
const away = (x, z) => Math.abs(z - riverZ(x));
const zAt = (x, a) => riverZ(x) + a;

const river = steelBridges(createRiver({
  path: riverZ,
  halfWidth: HW,
  level: 0,
  depth: 2.6,
  valley: 40,
  crossings: [
    { name: 'Oosterbeek railway bridge', x: -SIDE, kind: 'bridge', width: 7, arch: { rise: 6, panels: 10, rails: true } },
    { name: 'Arnhem road bridge', x: 0, kind: 'bridge', width: 10, arch: { rise: 15, panels: 12 } },
    { name: 'Pontoon bridge', x: SIDE, kind: 'bridge', width: 8, pontoon: true },
  ],
}));

// ---- the roads: the three from the bridges back to the bases, the riverside roads (the Utrechtseweg through Oosterbeek),
// the town's streets; the railway behind the town
const NS = [-SIDE, 0, SIDE];
const nsX = (rx, z) => rx + (rx ? 10 : 0) * Math.sin(z * 0.011 + (z < 0 ? 1.7 : 0)) * smoothstep(TOWN.a1, TOWN.a1 + 60, away(rx, z));
/** The built-up ground on each bank: Arnhem on the north; on the south the houses round the bridge's south end, out
 *  toward Elden. Its streets: `xs` across, `as` along the river (the first of `as`: the riverside road through it). */
const TOWNS = {
  1: { x0: -TOWN.x, x1: TOWN.x, a0: TOWN.a0, a1: TOWN.a1, xs: [-150, -100, -50, 50, 100, 150], as: [110, 160], road: 110 },
  [-1]: { x0: -75, x1: 135, a0: DYKE + 14, a1: 150, xs: [-35, 45, 90], as: [96], road: 96 },
};
const bank = (x, z) => (z > riverZ(x) ? 1 : -1);
/** The town on (x, z)'s bank, if (x, z) is in it (`da`: as if that much farther from the river). */
const townAt = (x, z, da = 0) => { const T = TOWNS[bank(x, z)], a = away(x, z) + da; return x > T.x0 && x < T.x1 && a > T.a0 && a < T.a1 ? T : null; };
function roadDist(x, z) {
  const a = away(x, z), T = TOWNS[bank(x, z)];
  if (a < HW + 6) return Infinity;
  let d = Math.abs(a - T.road - 14 * Math.sin(x * 0.009 + (z < riverZ(x) ? 2 : 0)));   // the riverside road
  if (x > T.x0 && x < T.x1) d = Math.abs(a - T.road);         // (straight through the town)
  for (const rx of NS) d = Math.min(d, Math.abs(x - nsX(rx, z)));
  if (townAt(x, z)) {
    d = Math.min(d, Math.abs(a - T.a0 - 6));                  // the quay (Rijnkade); on the south, the street behind the dyke
    for (const sx of T.xs) d = Math.min(d, Math.abs(x - sx));
    for (const sa of T.as) d = Math.min(d, Math.abs(a - sa));
  }
  return d;
}
/** The railway behind the town on the north bank (Oosterbeek – Arnhem – Velp); on the south the line to Nijmegen's
 *  embankment, nearer the river. */
const railA = (x, z) => (z > riverZ(x) ? RAIL_A + 18 * Math.sin(x * 0.006) * smoothstep(TOWN.x, TOWN.x + 80, Math.abs(x)) : 205 - 22 * Math.sin(x * 0.005 + 0.8));
const railDist = (x, z) => Math.abs(away(x, z) - railA(x, z));

// ---- the control points
const points: ControlPointDef[] = [
  { id: 'A', name: 'Wolfheze', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Renkum Heath', x: -SIDE, z: 330, owner: null, sector: 'west' },
  { id: 'C', name: 'Eusebiuskerk', x: 75, z: zAt(75, 128), owner: null, sector: 'centre' },
  { id: 'D', name: 'Velp', x: SIDE, z: 300, owner: null, sector: 'east' },
  { id: 'E', name: 'Oosterbeek', x: -SIDE + 45, z: zAt(-SIDE + 45, 92), owner: null, sector: 'west' },
  { id: 'F', name: 'Arnhem road bridge', x: 0, z: 0, owner: null, sector: 'centre', radius: 34 }, // (reaches both ramps)
  { id: 'G', name: 'Malburgen', x: -200, z: zAt(-200, -55), owner: null, sector: 'west' },
  { id: 'H', name: 'Driel', x: -290, z: -260, owner: null, sector: 'west' },
  { id: 'I', name: 'Elden', x: 120, z: -150, owner: null, sector: 'centre' },
  { id: 'J', name: 'Huissen', x: 350, z: -360, owner: null, sector: 'east' },
  { id: 'K', name: 'Elst', x: -40, z: -470, owner: 'pact', sector: 'centre' },
];
const PT = Object.fromEntries(points.map((p) => [p.id, p]));
const HEATH = { x: -SIDE, z: 330, r: 120 }; // the drop zone's open heath
const heathK = (x, z) => smoothstep(HEATH.r + 30, HEATH.r - 10, Math.hypot(x - HEATH.x, z - HEATH.z));
/** The Betuwe's orchards: rows of apple and pear trees round Huissen and Driel (sparse cover, the ground open under them). */
const ORCHARDS = [[PT.J.x - 40, PT.J.z + 30, 95], [PT.H.x - 60, PT.H.z - 40, 80], [PT.I.x + 70, PT.I.z - 70, 60]];
const orchardK = (x, z) => Math.max(...ORCHARDS.map(([ox, oz, r]) => smoothstep(r + 20, r - 10, Math.hypot(x - ox, z - oz))));
const woodsN = (x, z) => fbm(noise, x * 0.0045 + 21, z * 0.0045 - 3, 3);
/** The woods: west of the town and round Oosterbeek, never on the heath, the town, the orchards or the polder by the river. */
const woodsK = (x, z) => {
  const a = away(x, z);
  if (a < DYKE + 25 || townAt(x, z, 15) || townAt(x, z, -20)) return 0;
  const edge = Math.max(smoothstep(440, 500, Math.abs(x)), smoothstep(530, 570, Math.abs(z)));
  return Math.max(edge, smoothstep(0.08, 0.2, woodsN(x, z)) * (1 - heathK(x, z)) * (1 - orchardK(x, z)));
};

const lowN = (x, z) => fbm(noise, x * 0.004, z * 0.004, 4);
const riseN = (x, z) => fbm(noise, x * 0.006 + 7, z * 0.006, 3);
function height(x, z) {
  const a = away(x, z), T = townAt(x, z);
  let h = 1.6 + lowN(x, z) * 1.4;                                            // the polder and the low rise behind it
  if (z > riverZ(x)) h += smoothstep(90, 420, a) * (7 + riseN(x, z) * 5);  // the edge of the Veluwe
  else h += smoothstep(110, 440, a) * (7 + riseN(x, z) * 5)                 // the Betuwe: rising later…
    + 5 * Math.exp(-(((a - 245 - 30 * Math.sin(x * 0.007)) / 55) ** 2)) * smoothstep(-260, -120, x) * smoothstep(420, 300, x); // …and its old river dune (the donk under Elden)
  const town = TOWNS[bank(x, z)];
  if (!T) h += 3.2 * smoothstep(9, 2.5, Math.abs(a - DYKE)) * Math.max(smoothstep(town.x1, town.x1 + 30, x), smoothstep(town.x0, town.x0 - 30, x)); // the winter dyke
  if (T) h = lerp(h, 3 + a * 0.012, smoothstep(T.a0, T.a0 + 10, a));         // the town: level streets
  h += smoothstep(470, 600, Math.abs(x)) * 8 + smoothstep(560, 680, Math.abs(z)) * 8;
  for (const bz of [BASE_Z, -BASE_Z]) h += (9 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.3, h));
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'arnhem',
  name: 'Arnhem',
  description: 'September 1944, Market Garden: the Lower Rhine and its three bridges — the road bridge in the middle, the railway bridge at Oosterbeek, the pontoon bridge — the brick streets of Arnhem, Oosterbeek’s woods and the heath of the drop zones, the orchards of the Betuwe across the river.',
  epochs: ['1945'],
  region: 'europe',
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['brit21'], pact: ['wh'] }, // (the 1st Airborne Division against II SS-Panzerkorps and the Kampfgruppen sent to the bridge)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1944_09,
  height,
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  woods: (x, z) => Math.max(woodsK(x, z) * 0.8, orchardK(x, z) * 0.4), // (the orchards: half-hidden under the fruit trees)
  fields: createFields({ seed: 1944_09, cell: 62 }),

  theme: {
    // a fine, hazy September afternoon over the river
    fogColor: 0xb8bfbe, fogDensity: 0.0016,
    skyTop: 0x5f84a8, skyHorizon: 0xc8d0d0, skyBottom: 0x7c8074,
    sunColor: 0xfff0d8, sunIntensity: 2.0, sunDisk: 0.4,
    clouds: 0.5, cloudLight: 0xeeeeea, cloudDark: 0x9aa0a6,
    sunDir: [-0.5, 0.58, -0.62],
    hemiSky: 0xc4d0dc, hemiGround: 0x4a4834, hemiIntensity: 1.25,
    rimColor: 0xc4ccd4, rimIntensity: 0.22,
    terrain: {
      grass: '#58692f', grassAlt: '#4c5e2c', dryGrass: '#8c8048', dirt: '#56462f', rock: '#6a665c',
      pasture: '#5c6c34', ploughed: '#5a4630', stubble: '#a08e56', meadow: '#66763a',
      farmX: [440, 500], farmZ: [540, 600], roads: [], roadZ: 0, // (no default tracks: the roads are painted below)
      surface(x, z) {
        const a = away(x, z);
        if (railDist(x, z) < 2.4 && a > HW + 20) return [0x4a4640, 0.9];                          // ballast
        const rd = roadDist(x, z);
        if (rd < 4) return townAt(x, z) ? [0x5e5a56, 0.95] : [0x6e665a, 0.85];                     // cobbles in town, the roads
        if (townAt(x, z)) return [0x55573c, 0.7];                                                 // yards and gardens
        const hk = heathK(x, z);
        if (hk > 0.05) return [noise(x * 0.04, z * 0.04) > 0.1 ? 0x6a4e5a : 0x7a6c48, hk * 0.8]; // heather and dead bracken
        if (a < DYKE - 6 && a > HW + 3) return [0x5c6e38, 0.5];                                    // the water meadows between dyke and river
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: NS }, pact: { x: 0, z: -BASE_Z, entries: NS } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

    /** A Dutch brick house: two or three storeys, steep tiled gable roof. Occupiable, upstairs windows to fight from. */
    const brickHouse = (x, z, yaw, w, d, storeys, name = 'house') => {
      const r = props.rand;
      const b = props.beginBuilding(name, x, z, yaw, w, d);
      const brick = new THREE.Color().setHSL(0.03 + r() * 0.03, 0.35 + r() * 0.15, 0.3 + r() * 0.08).getHex();
      b.plaster = brick;
      const h = storeys * 3.1;
      props.shell(b, { height: h, storeys, key: 'stone', color: brick, t: 0.4, bay: 2.4, frame: 0xe0dcd0, upper: true, front: [(r() - 0.5) * w * 0.4], back: [(r() - 0.5) * w * 0.4] });
      for (let s = 1; s < storeys; s++) props.piece('plain', b, 0, s * 3.1, 0, w - 0.4, 0.2, d - 0.4, 0x5a4a3c);
      props.piece('stone', b, 0, 0.1, 0, w + 0.24, 0.5, d + 0.24, 0x4e4844);
      props.gableRoof(b, { eave: h, pitch: 0.85, color: r() < 0.7 ? 0x6a3226 : 0x3a3c40, t: 0.4, chimney: r() < 0.6 });
      props.endBuilding();
    };
    /** A Horsa glider come down hard on the heath: the fuselage, a wing, the tail broken off (cover). */
    const horsa = (x, z, yaw) => {
      const g = terrain.heightAt(x, z), r = props.rand;
      const P = (lx, ly, lz, sx, sy, sz, c, ry = 0, rx = 0, rz = 0) => { const [wx, wz] = PropBuilder.local(x, z, yaw, lx, lz); props.box('plain', wx, g + ly, wz, sx, sy, sz, yaw + ry, c, rx, rz); };
      const ply = 0x4c4e38;
      P(0, 1.5, 0, 2.6, 2.7, 15, ply, 0, 0.04);                     // the fuselage
      P(0, 1.3, 9, 2.3, 2.2, 3, 0x3a3a30, 0, 0.2);                  // the nose, smashed in
      P(0, 3.1, -1, 26 * (0.5 + r() * 0.5), 0.3, 3, ply, 0, 0, (r() - 0.5) * 0.25); // the wing, high on the fuselage (one side torn off)
      P(2.5, 0.7, -12, 1.6, 1.3, 7, ply, 0.5, 0, 0.6);              // the tail, off and lying beside it
      P(3, 2.4, -14.5, 0.25, 3.4, 2.4, ply, 0.5);
      cover.addBox({ x, z, yaw, length: 2.6, thickness: 15, height: 2.8 });
    };

    // ---- Arnhem, and the south end of the bridge: blocks of brick houses on each bank's street grid
    for (const m of [1, -1]) {
      const T = TOWNS[m], r = props.rand = mulberry32(1944_0917 + m);
      const xs = [T.x0, ...T.xs, T.x1], as = [T.a0 + 6, ...T.as, T.a1];
      for (let i = 0; i < xs.length - 1; i++) {
        for (let j = 0; j < as.length - 1; j++) {
          const x0 = xs[i] + 6, x1 = xs[i + 1] - 6, a0 = as[j] + 6, a1 = as[j + 1] - 6;
          // houses round the block's edge, facing the streets; the block's yard open in the middle (the bridge's road straight up the middle)
          for (const [aRow, yaw] of [[a0 + 5, Math.PI], [a1 - 5, 0]] as [number, number][]) {
            for (let x = x0 + 4; x < x1 - 3; x += 7.5 + r() * 2.5) {
              if (Math.abs(x) < 10) continue;
              const w = 7 + r() * 1.5, d = 9, z = riverZ(x) + m * aRow;
              if (r() < 0.1 || nearPoint(x, z, 14) || m > 0 && Math.abs(x - 75) < 16 && Math.abs(aRow - 128) < 16) continue;
              brickHouse(x, z, m > 0 ? yaw : yaw + Math.PI, w, d, r() < 0.5 ? 2 : 3, m > 0 ? 'house in Arnhem' : 'house');
            }
          }
        }
      }
      // the bridge ramp: sandbags and a barricade at its foot
      for (const sx of [-1, 1]) props.sandbagRing({ x: sx * 18, z: riverZ(sx * 18) + m * (T.a0 + 16), radius: 4, toward: -m });
      props.logBarricade({ x: 0, z: riverZ(0) + m * (T.a0 + 30), yaw: m > 0 ? 0 : Math.PI, length: 6 });
    }
    // the Grote of Eusebiuskerk on its square, the station behind the town, the quay's low wall along the river
    props.church({ x: 75, z: zAt(75, 140), yaw: Math.PI / 2 });
    brickHouse(-30, zAt(-30, RAIL_A - 12), 0, 24, 10, 2, 'station');
    for (let x = -TOWN.x + 6; x < TOWN.x - 6; x += 12) if (Math.abs(x) > 12) props.lowWall({ x, z: zAt(x, TOWN.a0 + 1), yaw: 0, length: 9, height: 0.9, color: 0x7a746a });

    // ---- Oosterbeek — villas among the trees, the old church by the river; the Hartenstein
    {
      const r = props.rand = mulberry32(1944_0918);
      const ox = -SIDE + 45;
      props.church({ x: ox + 30, z: zAt(ox + 30, 80), yaw: Math.PI / 2 });
      for (let i = 0; i < 14; i++) {
        const ang = r() * Math.PI * 2, d = 22 + r() * 60;
        const x = ox + Math.cos(ang) * d, z = zAt(ox, 120) + Math.sin(ang) * d * 0.9;
        if (away(x, z) < DYKE + 10 || roadDist(x, z) < 9 || railDist(x, z) < 12 || nearPoint(x, z, 14) || Math.abs(x - (ox + 30)) < 16 && away(x, z) < 100) continue;
        brickHouse(x, z, Math.round(ang / (Math.PI / 2)) * (Math.PI / 2), 9 + r() * 3, 9 + r() * 2, 2, 'villa');
      }
      const hx = ox + 70, hz = zAt(ox + 70, 205);
      const b = props.beginBuilding('Hotel Hartenstein', hx, hz, 0, 22, 13);
      b.plaster = 0xd8d4c8;
      props.shell(b, { height: 9.3, storeys: 3, key: 'plaster', color: 0xd8d4c8, t: 0.45, bay: 2.6, frame: 0x5a6a5a, shutters: 0.6, upper: true, front: [0, -6, 6] });
      for (let s = 1; s < 3; s++) props.piece('plain', b, 0, s * 3.1, 0, 21.5, 0.2, 12.5, 0x5a4a3c);
      props.gableRoof(b, { eave: 9.3, pitch: 0.7, color: 0x3a3c40, t: 0.45, chimney: true });
      props.endBuilding();
    }
    // ---- Malburgen on the south bank: workers' houses behind the dyke and the brickworks on the foreland, their kiln stacks
    {
      const r = props.rand = mulberry32(1944_0921), p = PT.G;
      for (let i = 0; i < 12; i++) {
        const ang = r() * Math.PI * 2, d = 18 + r() * 45;
        const x = p.x + Math.cos(ang) * d, z = p.z - 30 + Math.sin(ang) * d * 0.8;
        if (away(x, z) < DYKE + 10 || roadDist(x, z) < 9 || railDist(x, z) < 12 || nearPoint(x, z, 14)) continue;
        brickHouse(x, z, Math.round(ang / (Math.PI / 2)) * (Math.PI / 2) + 0.2, 8 + r() * 2, 8, 2, 'house');
      }
      for (const [dx, yaw] of [[-55, 0.1], [40, -0.05]]) {
        const x = p.x + dx, z = zAt(x, -(HW + 18));
        props.hall({ x, z, yaw: yaw + Math.PI, width: 30, depth: 11, height: 5, color: 0x6a3a2c, roof: 0x3a3c40, door: 5, name: 'brickworks' });
        props.chimney({ x: x + 10, z: z - 10, height: 24 });
      }
    }

    // ---- Velp and the hamlet by Wolfheze; on the south the polder villages: Driel, Huissen, Elden and the houses at Elst
    for (const [px, pz, n, seed] of [[SIDE, 300, 8, 1], [0, 440, 4, 2], [PT.H.x, PT.H.z, 7, 3], [PT.J.x, PT.J.z, 8, 4], [PT.I.x, PT.I.z, 6, 5], [PT.K.x, PT.K.z + 30, 4, 6]] as [number, number, number, number][]) {
      const r = props.rand = mulberry32(1944_0919 * 10 + seed);
      for (let i = 0; i < n * 2 && i < 20; i++) {
        const ang = (i / n) * Math.PI + r() * 0.4, d = 16 + r() * 18;
        const x = px + Math.cos(ang) * d, z = pz + Math.sin(ang) * d;
        if (roadDist(x, z) < 8 || railDist(x, z) < 12 || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || Math.hypot(x - px, z - pz) < 11) continue;
        brickHouse(x, z, ang + Math.PI / 2 + seed, 8 + r() * 2, 8, 2, 'house');
      }
    }
    props.church({ x: PT.I.x - 26, z: PT.I.z + 8, yaw: 0.3 });   // (Elden's church)
    props.church({ x: PT.J.x + 24, z: PT.J.z - 6, yaw: -0.2 });  // (Huissen's)

    // ---- the drop zone: Horsas down on the heath; hay out on the polder
    props.rand = mulberry32(1944_0920);
    for (let i = 0; i < 9; i++) {
      const ang = props.rand() * Math.PI * 2, d = 20 + props.rand() * 85, yaw = props.rand() * Math.PI * 2;
      const x = HEATH.x + Math.cos(ang) * d, z = HEATH.z + Math.sin(ang) * d;
      if (nearPoint(x, z, 18) || roadDist(x, z) < 12) continue;
      horsa(x, z, yaw);
    }
    for (let i = 0; i < 12; i++) {
      const x = (props.rand() * 2 - 1) * 420, z = -120 - props.rand() * 330, yaw = props.rand() * 3;
      if (nearPoint(x, z, 24) || roadDist(x, z) < 10 || townAt(x, z, 10) || orchardK(x, z) > 0.2) continue;
      props.hayBales({ x, z, yaw, count: 4 });
      props.hayBales({ x: x + 5, z: z + 6, yaw: yaw + 1, count: 3 });
    }

    // ---- the railways, and cover out in the fields, the command posts
    for (const m of [1, -1]) {
      for (let x = -560; x < 560; x += 8) {
        const step = (xx) => { // the line's z at xx on bank m
          const zz = riverZ(xx) + m * 1;
          return riverZ(xx) + m * railA(xx, zz);
        };
        props.rails({ x0: x, z0: step(x), x1: x + 8, z1: step(x + 8) });
      }
    }
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'farm', 'fieldwall', 'wrecks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 140 && tries < 18000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 40), a = away(x, z);
      if (townAt(x, z, 20) || townAt(x, z, -20) || a < HW + 12 || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 32 * 32)) continue;
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 34) || roadDist(x, z) < 10 || railDist(x, z) < 10 || woodsK(x, z) > 0.4 || Math.abs(a - DYKE) < 10) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5236);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x, z) => away(x, z) < HW + 3 || roadDist(x, z) < 6 || railDist(x, z) < 5 }];
    // oak, beech and pine round Oosterbeek and the drop zones, birches on the heath, willows by the river, trees in the town's gardens
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 9000, broadleaf: 0.65, autumn: 0.25,
      forest: (x, z) => {
        const a = away(x, z);
        if (a < HW + 3 || roadDist(x, z) < 7 || railDist(x, z) < 6 || nearPoint(x, z, 24)) return -1;
        if (townAt(x, z)) return 0.015;
        if (orchardK(x, z) > 0.4) return 0.3;                // the orchards: fruit trees in rows, grass under them
        if (a < DYKE - 8) return 0.12;                       // willows on the water meadows
        const w = woodsK(x, z);
        if (w > 0.5) return 0.9;
        return heathK(x, z) > 0.3 ? 0.03 : -0.02;
      },
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x, z) => townAt(x, z, 10) || townAt(x, z, -10) || heathK(x, z) > 0.2 || orchardK(x, z) > 0.3 || woodsK(x, z) > 0.4 }], count: 3500, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.5, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
