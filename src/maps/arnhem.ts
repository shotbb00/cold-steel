// Arnhem, September 1944 — Operation Market Garden (1945 only; the big field, 1.0 × 1.12 km). The 1st Airborne Division
// came down on the heaths west of the town and marched east for the road bridge — the steel arch that Frost's 2nd
// Parachute Battalion held from the houses round its north end for three days and four nights — along three routes: the
// lower road by the river, the Utrechtseweg through Oosterbeek, the Amsterdamseweg in the north. The Germans came in
// from the east and the north and blocked the rest of the division at the town's edge; it fell back into the Oosterbeek
// perimeter by the river, and the Poles came down at Driel across it.
// The real ground: the Lower Rhine runs along the south, the floodplain and the winter dyke on its far bank, the flat
// Betuwe polder beyond; north of it the ground rises toward the Veluwe — Arnhem's old town on the slope above the quay
// round the Eusebiuskerk, the station higher up, Den Brink and the Sonsbeek park's wooded hills over the town, the woods
// and villas of Oosterbeek to the west where the moraine comes right down to the river at the Westerbouwing bluff, the
// heaths of the drop zones beyond in the north-west. The railway from Utrecht runs behind Oosterbeek to the station; the
// Nijmegen line branches off along the river and over the Oosterbeek railway bridge to Driel.
// On the map the British come from the drop zones in the west (+z, Wolfheze), the Germans from the east (−z, Velp); real
// north is +x, so the Rhine runs down the south flank (−x) with its three crossings, the polder strip beyond it.
// Not mirrored but fair (by distance): the British have the moraine's heights and woods, Oosterbeek and the heath, and
// Driel over the railway bridge; the Germans have the town and the bridge nearer them, the Sonsbeek hills, and Malburgen
// over the pontoon bridge. Den Brink and the station lie between.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, commandPost } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import { steelBridges } from './remagen.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const HW = 24;        // the Lower Rhine's half-width
const DYKE = 64;      // the winter dyke on the south bank, from the river's middle
const noise = createNoise2D(1944_09);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---- the Lower Rhine down the south flank (x = rx(z)), flowing west (+z)
const rx = (z: number) => -330 + 18 * Math.sin(z * 0.006 + 0.5) + 8 * Math.sin(z * 0.017);
const away = (x: number, z: number) => x - rx(z);          // + north of the river (the town's bank), − south (the polder)
const RAILBR = 250, ROADBR = -120, PONTOON = -330;           // the crossings' z
const COURSE: number[][] = [];
for (let z = 780; z >= -780; z -= 30) COURSE.push([rx(z), z]);
const river = steelBridges(createRiver({
  path: COURSE, halfWidth: HW, level: 0, depth: 2.6, valley: 40,
  crossings: [
    { name: 'Oosterbeek railway bridge', x: rx(RAILBR), z: RAILBR, kind: 'bridge', width: 7, arch: { rise: 6, panels: 10, rails: true } },
    { name: 'Arnhem road bridge', x: rx(ROADBR), z: ROADBR, kind: 'bridge', width: 10, arch: { rise: 15, panels: 12 } },
    { name: 'Pontoon bridge', x: rx(PONTOON), z: PONTOON, kind: 'bridge', width: 8, pontoon: true },
  ],
}));
{ // (the pontoon bridge turned square across the flow like the others)
  const mesh = river.bridgeMesh;
  river.bridgeMesh = (c: any, ...a: any[]) => { const g = mesh.call(river, c, ...a); if (c.pontoon) g.rotation.y = river.yawOf(c); return g; };
}

// ---- the points
const P = { B: [330, 320], C: [-250, -70], D: [150, -300], E: [-200, 285], G: [-440, -320], H: [-440, 240], I: [110, 30], J: [-60, -30] };
const points: ControlPointDef[] = [
  { id: 'A', name: 'Wolfheze', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Renkum Heath', x: P.B[0], z: P.B[1], owner: null, sector: 'east' },
  { id: 'C', name: 'Eusebiuskerk', x: P.C[0], z: P.C[1], owner: null, sector: 'west' },
  { id: 'D', name: 'Sonsbeek', x: P.D[0], z: P.D[1], owner: null, sector: 'east' },
  { id: 'E', name: 'Oosterbeek', x: P.E[0], z: P.E[1], owner: null, sector: 'west' },
  { id: 'F', name: 'Arnhem road bridge', x: rx(ROADBR), z: ROADBR, owner: null, sector: 'west', radius: 34 }, // (reaches both ramps)
  { id: 'G', name: 'Malburgen', x: P.G[0], z: P.G[1], owner: null, sector: 'west' },
  { id: 'H', name: 'Driel', x: P.H[0], z: P.H[1], owner: null, sector: 'west' },
  { id: 'I', name: 'Den Brink', x: P.I[0], z: P.I[1], owner: null, sector: 'centre', radius: 24 },
  { id: 'J', name: 'Arnhem station', x: P.J[0], z: P.J[1], owner: null, sector: 'centre' },
  { id: 'K', name: 'Velp', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- Arnhem: the old town on the slope from the quay up to the station, a street grid (a: from the river; z along it)
const TOWN = { z0: -300, z1: 40, a0: 46, a1: 300 };
const T_AS = [60, 120, 180, 240], T_ZS = [-250, -190, ROADBR, -60, -5];
const inTown = (x: number, z: number, m = 0) => { const a = away(x, z); return z > TOWN.z0 - m && z < TOWN.z1 + m && a > TOWN.a0 - m && a < TOWN.a1 + m; };
/** Oosterbeek's villas round its middle, the Hartenstein's park. */
const OOST = { x: -170, z: 300, r: 115 };

// ---- the roads: the lower road along the river (the Benedendorpsweg and the quay), the Utrechtseweg through Oosterbeek
// into the town, the Amsterdamseweg in the north, the bridge road north up through the town, the Velp road, the dyke road
// on the south bank and the lanes to Driel and Malburgen
const lower = (): number[][] => { const o: number[][] = []; for (let z = 620; z >= -620; z -= 40) o.push([rx(z) + (inTown(rx(z) + 60, z) ? 60 : 56 + 8 * Math.sin(z * 0.01)), z]); return o; };
const dyke = (): number[][] => { const o: number[][] = []; for (let z = 620; z >= -620; z -= 40) o.push([rx(z) - DYKE - 14, z]); return o; };
const ROADS: number[][][] = [
  lower(), dyke(),
  [[-60, 620], [-110, 420], [-150, 330], P.E, [-190, 160], [-180, 60], [rx(-60) + 180, -60], [rx(-250) + 180, -250], [-150, -420], [0, -500]],   // the Utrechtseweg, out the far side as the Velp road
  [[270, 620], [255, 420], [262, 200], [250, 0], [262, -200], [250, -620]],                                // the Amsterdamseweg
  [[rx(ROADBR) + 30, ROADBR], [80, ROADBR - 20], [260, ROADBR - 10], [520, ROADBR]],                         // the bridge road north through the town
  [[0, 500], [-110, 420]], [[0, 500], [255, 440]], [[0, -500], [250, -470]],
  [[rx(RAILBR) - 30, RAILBR], [P.H[0], P.H[1]], [-470, 120], [rx(0) - DYKE - 14, 0]],                       // Driel, off the railway bridge
  [[rx(ROADBR) - 30, ROADBR], [rx(ROADBR) - DYKE - 14, ROADBR]],
  [[rx(PONTOON) - 30, PONTOON], [P.G[0], P.G[1]], [rx(-200) - DYKE - 14, -200]],                           // Malburgen, off the pontoon bridge
  [[rx(PONTOON) + 30, PONTOON], [-200, PONTOON - 20], [P.D[0], P.D[1]], [262, -280]],                       // the pontoon road up past Sonsbeek
  [P.B, [262, 300]], [P.I, [250, 40]], [P.I, [-60, 40]],
];
const RAIL_MAIN: number[][] = [[-40, 620], [-30, 420], [-45, 200], [-70, 40], [-80, -100], [-70, -300], [-50, -620]];   // Utrecht – Arnhem – Velp
const RAIL_NIJ: number[][] = [[-80, -20], [-170, 60], [-230, 160], [rx(RAILBR) + 60, RAILBR], [rx(RAILBR) - 60, RAILBR], [-500, 330]];   // the Nijmegen line, over the railway bridge
/** Distance to the nearest of `lines`, each cut into short pieces with their boxes: far pieces are skipped (the caches fill fast). */
function nearest(lines: number[][][]) {
  const parts: [number[][], number, number, number, number][] = [];
  for (const l of lines) for (let i = 0; i < l.length - 1; i += 4) {
    const p = l.slice(i, i + 5), xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
    parts.push([p, Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]);
  }
  return (x: number, z: number) => {
    let d = Infinity;
    for (const [p, x0, x1, z0, z1] of parts) {
      const bx = Math.max(x0 - x, 0, x - x1), bz = Math.max(z0 - z, 0, z - z1);
      if (bx * bx + bz * bz < d * d) d = Math.min(d, segDist(p, x, z));
    }
    return d;
  };
}
const roadNear = nearest(ROADS), railNear = nearest([RAIL_MAIN, RAIL_NIJ]);
const roadDist = gridCacheSmooth((x: number, z: number) => {
  let d = roadNear(x, z);
  if (inTown(x, z)) { const a = away(x, z); for (const s of T_AS) d = Math.min(d, Math.abs(a - s)); for (const s of T_ZS) d = Math.min(d, Math.abs(z - s)); }
  return d;
}, { x: 800, z: 800 }, 2.5);
const railDist = gridCacheSmooth(railNear, { x: 800, z: 800 }, 2.5);

const HEATH = { x: P.B[0], z: P.B[1], r: 125 }; // the drop zone's open heath
const heathK = (x: number, z: number) => smoothstep(HEATH.r + 30, HEATH.r - 10, Math.hypot(x - HEATH.x, z - HEATH.z));
/** The Betuwe's orchards round Driel and Malburgen (sparse cover, the ground open under them). */
const ORCHARDS = [[P.H[0] - 10, P.H[1] + 60, 50], [P.G[0] - 5, P.G[1] - 60, 50]];
const orchardK = (x: number, z: number) => Math.max(...ORCHARDS.map(([ox, oz, r]) => smoothstep(r + 20, r - 10, Math.hypot(x - ox, z - oz))));

// ---- the ground: the polder, the river, the slope up to the Veluwe; the moraine's hills (the Westerbouwing bluff over
// the river at Oosterbeek, Den Brink, Sonsbeek), the dyke, the town's level streets
// [x, z, r, h]: the Westerbouwing, Den Brink, the Sonsbeek hills, the Veluwezoom's high woods behind Velp, the Wolfheze rise
const HILLS = [[-245, 410, 95, 20], [P.I[0], P.I[1], 90, 9], [P.D[0] + 20, P.D[1] - 10, 110, 13], [390, -350, 250, 40], [260, 470, 150, 5]];
/** The dry valleys down the slope into the town (the Sonsbeek brook's) and into Oosterbeek. */
const DALES: number[][][] = [[[520, -230], [300, -200], [120, -190], [-120, -180]], [[420, 200], [200, 250], [40, 290], [-110, 300]]];
const ground = gridCacheSmooth((x: number, z: number) => {
  const a = away(x, z);
  let h = 1.6 + fbm(noise, x * 0.004, z * 0.004, 3) * 0.8;
  if (a < 0) {
    h += 4 * Math.exp(-(((-a - DYKE) / 7) ** 2));                                      // the winter dyke
  } else {
    const west = smoothstep(-100, 300, z);                                              // (the moraine wilder to the west)
    h += (6 + 14 * smoothstep(-60, 320, z)) * smoothstep(40, 220, a) - 7 * smoothstep(260, 560, a) * smoothstep(-200, 100, z) +   // (up to the moraine's crest over the river, down to the heaths beyond)
       (fbm(noise, x * 0.006 + 7, z * 0.006, 3) * 5 + ridged(noise, x * 0.008, z * 0.008, 3) * 8 * west) * smoothstep(60, 260, a);
    for (const d of DALES) h -= 7 * Math.exp(-((segDist(d, x, z) / 34) ** 2)) * smoothstep(60, 180, a);
    for (const [hx, hz, r, hh] of HILLS) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.3;
    if (inTown(x, z, 20)) { const dep = Math.min(a - TOWN.a0, TOWN.a1 - a, z - TOWN.z0, TOWN.z1 - z); h = lerp(h, 3 + Math.max(0, a - 40) * 0.05, smoothstep(-20, 0, dep)); }
  }
  h += smoothstep(560, 700, Math.abs(z)) * 6 + smoothstep(500, 640, x) * 8;
  for (const bz of [BASE_Z, -BASE_Z]) h += (lerp(h, 12, 0.5) - h) * smoothstep(34, 16, Math.hypot(x, z - bz));
  return h;
}, { x: 700, z: 800 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.3, ground(x, z)));

const woodsN = (x: number, z: number) => fbm(noise, x * 0.0045 + 21, z * 0.0045 - 3, 3);
/** The woods: the Veluwe's, thickest west and north; Oosterbeek's villas among them; Den Brink and Sonsbeek wooded; never the
 *  heath, the town, the polder or the water meadows. */
const woodsK = gridCache((x: number, z: number) => {
  const a = away(x, z);
  if (a < 60 || inTown(x, z, 15)) return 0;
  let k = smoothstep(0.02 - 0.18 * smoothstep(-200, 300, z), 0.16, woodsN(x, z)) * smoothstep(60, 140, a);
  k = Math.max(k, smoothstep(110, 70, Math.hypot(x - P.I[0], z - P.I[1])), smoothstep(120, 80, Math.hypot(x - P.D[0], z - P.D[1])), smoothstep(OOST.r + 40, OOST.r, Math.hypot(x - OOST.x, z - OOST.z)) * 0.8);
  k = Math.max(k, smoothstep(100, 60, Math.hypot(x + 245, z - 410)));   // (the Westerbouwing's beeches)
  return k * (1 - heathK(x, z)) * (Math.hypot(x, Math.abs(z) - BASE_Z) < 50 ? 0 : 1);
}, { x: 800, z: 800 }, 4);

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'arnhem',
  name: 'Arnhem',
  description: 'September 1944, Market Garden: the Lower Rhine along the south and its three crossings — the road bridge, the Oosterbeek railway bridge, the pontoon bridge — Arnhem’s brick streets on the slope above the quay, Oosterbeek’s woods and villas and the heath of the drop zones on the wooded Veluwe heights, Driel and the polder across the river.',
  epochs: ['1945'],
  region: 'europe',
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['brit21'], pact: ['wh'] }, // (the 1st Airborne Division against II SS-Panzerkorps and the Kampfgruppen sent to the bridge)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1944_09,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => Math.max(woodsK(x, z) * 0.8, orchardK(x, z) * 0.4), // (the orchards: half-hidden under the fruit trees)
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
      surface(x: number, z: number) {
        const a = away(x, z);
        if (Math.abs(a) < HW + 4) return null;
        if (railDist(x, z) < 2.4) return [0x4a4640, 0.9];                                         // ballast
        const rd = roadDist(x, z);
        if (rd < 4) return inTown(x, z) ? [0x5e5a56, 0.95] : [0x6e665a, 0.85];                    // cobbles in town, the roads
        if (inTown(x, z)) return [0x55573c, 0.7];                                                 // yards and gardens
        const hk = heathK(x, z);
        if (hk > 0.05) return [noise(x * 0.04, z * 0.04) > 0.1 ? 0x6a4e5a : 0x7a6c48, hk * 0.8]; // heather and dead bracken
        if (a > -DYKE + 6 && a < 46) return [0x5c6e38, 0.5];                                      // the water meadows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-150, 0, 250] }, pact: { x: 0, z: -BASE_Z, entries: [-150, 0, 250] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const blocked = (x: number, z: number, r: number) => roadDist(x, z) < r + 4 || railDist(x, z) < r + 5 || Math.abs(away(x, z)) < HW + 12 || Math.abs(-away(x, z) - DYKE) < 10 + r || nearPoint(x, z, r + 9);

    /** A Dutch brick house: two or three storeys, steep tiled gable roof. Occupiable, upstairs windows to fight from. */
    const brickHouse = (x: number, z: number, yaw: number, w: number, d: number, storeys: number, name = 'house') => {
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
    const horsa = (x: number, z: number, yaw: number) => {
      const g = terrain.heightAt(x, z), r = props.rand;
      const Q = (lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, c: number, ry = 0, rxx = 0, rz = 0) => { const [wx, wz] = PropBuilder.local(x, z, yaw, lx, lz); props.box('plain', wx, g + ly, wz, sx, sy, sz, yaw + ry, c, rxx, rz); };
      const ply = 0x4c4e38;
      Q(0, 1.5, 0, 2.6, 2.7, 15, ply, 0, 0.04);                     // the fuselage
      Q(0, 1.3, 9, 2.3, 2.2, 3, 0x3a3a30, 0, 0.2);                  // the nose, smashed in
      Q(0, 3.1, -1, 26 * (0.5 + r() * 0.5), 0.3, 3, ply, 0, 0, (r() - 0.5) * 0.25); // the wing (one side torn off)
      Q(2.5, 0.7, -12, 1.6, 1.3, 7, ply, 0.5, 0, 0.6);              // the tail, off and lying beside it
      Q(3, 2.4, -14.5, 0.25, 3.4, 2.4, ply, 0.5);
      cover.addBox({ x, z, yaw, length: 2.6, thickness: 15, height: 2.8 });
    };

    // ---- Arnhem: blocks of brick houses round its street grid, facing the streets, the yards open behind
    {
      const r = props.rand = mulberry32(1944_0917);
      const as = [TOWN.a0 + 14, ...T_AS, TOWN.a1], zs = [TOWN.z0, ...[...T_ZS].sort((p, q) => p - q), TOWN.z1];
      for (let i = 0; i < as.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
        const z0 = zs[j] + 8, z1 = zs[j + 1] - 8;
        for (const [aRow, yaw] of [[as[i] + 11, -Math.PI / 2], [as[i + 1] - 11, Math.PI / 2]] as [number, number][]) {
          if (aRow > as[i + 1] - 8 || aRow < as[i] + 8) continue;
          for (let z = z0 + 4; z < z1 - 3; z += 7.5 + r() * 2.5) {
            const x = rx(z) + aRow;
            if (r() < 0.1 || blocked(x, z, 4) || Math.hypot(x - (P.C[0] + 14), z - P.C[1]) < 18) continue;
            brickHouse(x, z, yaw, 9, 7 + r() * 1.5, r() < 0.5 ? 2 : 3, 'house in Arnhem');
          }
        }
      }
      // the bridge ramp: sandbags and a barricade at its north foot; the Eusebiuskerk on its square, the station
      for (const s of [-1, 1]) props.sandbagRing({ x: rx(ROADBR) + HW + 22, z: ROADBR + s * 16, radius: 4, toward: -1 });
      props.logBarricade({ x: rx(ROADBR) + HW + 40, z: ROADBR, yaw: Math.PI / 2, length: 6 });
      props.church({ x: P.C[0] + 14, z: P.C[1], yaw: 0 });
      brickHouse(P.J[0] - 4, P.J[1] + 24, 0, 10, 26, 2, 'station');
      // the quay's low wall along the river
      for (let z = TOWN.z0 + 6; z < TOWN.z1; z += 12) if (Math.abs(z - ROADBR) > 14) props.lowWall({ x: rx(z) + TOWN.a0 + 1, z, yaw: Math.PI / 2, length: 9, height: 0.9, color: 0x7a746a });
    }

    // ---- Oosterbeek — villas among the trees, the old church down by the river, the Hartenstein in its park
    {
      const r = props.rand = mulberry32(1944_0918);
      props.church({ x: rx(300) + 62, z: 300, yaw: Math.PI / 2 });
      for (let i = 0; i < 30; i++) {
        const ang = r() * Math.PI * 2, d = 20 + r() * OOST.r;
        const x = OOST.x + Math.cos(ang) * d, z = OOST.z + Math.sin(ang) * d;
        if (blocked(x, z, 6) || away(x, z) < 70) continue;
        brickHouse(x, z, Math.round(ang / (Math.PI / 2)) * (Math.PI / 2), 9 + r() * 3, 9 + r() * 2, 2, 'villa');
      }
      const hx = -120, hz = 340;
      const b = props.beginBuilding('Hotel Hartenstein', hx, hz, Math.PI / 2, 22, 13);
      b.plaster = 0xd8d4c8;
      props.shell(b, { height: 9.3, storeys: 3, key: 'plaster', color: 0xd8d4c8, t: 0.45, bay: 2.6, frame: 0x5a6a5a, shutters: 0.6, upper: true, front: [0, -6, 6] });
      for (let s = 1; s < 3; s++) props.piece('plain', b, 0, s * 3.1, 0, 21.5, 0.2, 12.5, 0x5a4a3c);
      props.gableRoof(b, { eave: 9.3, pitch: 0.7, color: 0x3a3c40, t: 0.45, chimney: true });
      props.endBuilding();
    }
    // ---- Malburgen on the south bank: workers' houses behind the dyke and the brickworks on the foreland, their kiln stacks
    {
      const r = props.rand = mulberry32(1944_0921);
      for (let i = 0; i < 14; i++) {
        const ang = r() * Math.PI * 2, d = 16 + r() * 40;
        const x = P.G[0] + Math.cos(ang) * d * 0.6, z = P.G[1] + 20 + Math.sin(ang) * d;
        if (blocked(x, z, 5) || away(x, z) > -DYKE - 10) continue;
        brickHouse(x, z, Math.round(ang / (Math.PI / 2)) * (Math.PI / 2) + 0.2, 8 + r() * 2, 8, 2, 'house');
      }
      for (const [z, yaw] of [[-250, 0.05], [-200, -0.05]]) {
        const x = rx(z) - HW - 18;
        props.hall({ x, z, yaw: Math.PI / 2 + yaw, width: 30, depth: 11, height: 5, color: 0x6a3a2c, roof: 0x3a3c40, door: 5, name: 'brickworks' });
        props.chimney({ x: x - 4, z: z + 12, height: 24 });
      }
    }

    // ---- Driel, the hamlet by Wolfheze, Velp's edge, the farms on Den Brink and by Sonsbeek
    for (const [px, pz, n, seed] of [[P.H[0], P.H[1], 9, 3], [40, 440, 4, 2], [60, -430, 5, 6], [P.D[0] - 60, P.D[1] + 40, 5, 4], [P.I[0] + 50, P.I[1] - 50, 3, 5]] as [number, number, number, number][]) {
      const r = props.rand = mulberry32(1944_0919 * 10 + seed);
      for (let i = 0; i < n * 3; i++) {
        const ang = (i / n) * Math.PI + r() * 0.4, d = 16 + r() * 22;
        const x = px + Math.cos(ang) * d, z = pz + Math.sin(ang) * d;
        if (blocked(x, z, 5) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40 || Math.hypot(x - px, z - pz) < 11 || woodsK(x, z) > 0.5) continue;
        brickHouse(x, z, ang + Math.PI / 2 + seed, 8 + r() * 2, 8, 2, 'house');
      }
    }
    props.rand = mulberry32(1944_0922);
    props.church({ x: P.H[0] + 6, z: P.H[1] - 34, yaw: 0.2 });   // (Driel's church)

    // ---- the drop zone: Horsas down on the heath; hay out on the polder
    for (let i = 0; i < 10; i++) {
      const ang = props.rand() * Math.PI * 2, d = 20 + props.rand() * 90, yaw = props.rand() * Math.PI * 2;
      const x = HEATH.x + Math.cos(ang) * d, z = HEATH.z + Math.sin(ang) * d;
      if (nearPoint(x, z, 18) || roadDist(x, z) < 12) continue;
      horsa(x, z, yaw);
    }
    for (let i = 0; i < 14; i++) {
      const z = (props.rand() * 2 - 1) * 520, x = rx(z) - DYKE - 30 - props.rand() * 80, yaw = props.rand() * 3;
      if (blocked(x, z, 8) || orchardK(x, z) > 0.2 || x < -495) continue;
      props.hayBales({ x, z, yaw, count: 4 });
    }

    // ---- the railways
    for (const line of [RAIL_MAIN, RAIL_NIJ]) for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 8);
      for (let k = 0; k < n; k++) {
        const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n;
        if (Math.abs(away(x0, z0)) < HW + 8) continue;   // (over the water: the bridge carries its own)
        props.rails({ x0, z0, x1: ax + (bx - ax) * (k + 1) / n, z1: az + (bz - az) * (k + 1) / n });
      }
    }
    // ---- cover out in the fields and the polder, the command posts
    const kinds = ['farm', 'fieldwall', 'hay', 'hay', 'farm', 'fieldwall', 'wrecks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 110 && tries < 18000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (inTown(x, z, 20) || Math.hypot(x - OOST.x, z - OOST.z) < OOST.r || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 32 * 32)) continue;
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || blocked(x, z, 8) || nearPoint(x, z, 34) || woodsK(x, z) > 0.4 || heathK(x, z) > 0.5 || (away(x, z) > 0 && away(x, z) < 50)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5236);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => Math.abs(away(x, z)) < HW + 3 || roadDist(x, z) < 6 || railDist(x, z) < 5 }];
    // oak, beech and pine on the Veluwe and round Oosterbeek, birches on the heath, willows by the river, trees in the town's gardens
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 6000, broadleaf: 0.65, autumn: 0.25, maxY: 60,
      forest: (x: number, z: number) => {
        const a = away(x, z);
        if (Math.abs(a) < HW + 3 || roadDist(x, z) < 7 || railDist(x, z) < 6 || nearPoint(x, z, 24)) return -1;
        if (inTown(x, z)) return 0.015;
        if (orchardK(x, z) > 0.4) return 0.3;                // the orchards: fruit trees in rows, grass under them
        if (a < 46 && a > -DYKE + 8) return 0.12;            // willows on the water meadows
        const w = woodsK(x, z);
        if (w > 0.5) return 0.9;
        return heathK(x, z) > 0.3 ? 0.03 : -0.02;
      },
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x: number, z: number) => inTown(x, z, 10) || heathK(x, z) > 0.2 || orchardK(x, z) > 0.3 || woodsK(x, z) > 0.4 }], count: 3000, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.5, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
