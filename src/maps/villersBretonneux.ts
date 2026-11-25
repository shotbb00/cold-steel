// Villers-Bretonneux, Picardy, April 1918: the last height before Amiens (1918 only; the Western Front; the big field,
// 1.0 × 1.12 km). The German spring offensive ran out of breath here; on 24 April they took the town with tanks — the
// first tank-against-tank fight in history, A7Vs against British Mark IVs at Cachy — and that night the Australians
// took it back, round both sides of the town in the dark.
// The real ground: the town on the open chalk plateau astride the Roman road (the Chaussée Brunehaut, dead straight from
// Amiens to St Quentin) with the railway beside it; the plateau's edge drops steeply into the Somme valley along the
// north, its floor a strip of marsh, meres and willows round the river, Fouilloy and the Corbie road at the foot, Hill 104
// on the shoulder above them; on the south the plateau sinks gently toward the Luce and Hangard. On the map the British
// come from the west (+z, Bois l'Abbé, the Amiens side), the Germans from the east (−z, Lamotte-Warfusée); real north is
// +x: the Somme down the north flank, the Luce slope on the south. The Roman road runs straight through from base to base.
// Not mirrored but fair (by distance): the plateau runs lengthwise, so each side has as much of it. The British have the
// big woods (Bois l'Abbé, Bois d'Aquenne) and Fouilloy down in the valley under Hill 104; the Germans have the copses of
// Marcelcave, Vaire Wood on the slope over the Somme and Warfusée on the plateau's shoulder. Hangard Wood, Monument
// Wood and the town lie between. Hasty lines (dug in the weeks since the offensive stalled) with wire on each side.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, trenchLine, shellField } from './common.js';
import { segDist, farmVillage } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SEED = 1918;
const noise = createNoise2D(SEED);
const MUD = new THREE.Color(0x4f4234);   // churned chalk and clay

// ---- the Somme down the north flank, its meres beside it in the marsh
const somX = (z: number) => 462 + 18 * Math.sin(z * 0.0075 + 0.6) + 8 * Math.sin(z * 0.021);
const COURSE: number[][] = [];
for (let z = 760; z >= -760; z -= 40) COURSE.push([somX(z), z]);
const river = createRiver({
  paths: [COURSE, [[408, 205, 10], [418, 160, 16], [414, 110, 12]], [[402, -70, 9], [412, -125, 15], [404, -175, 10]]],
  halfWidth: 12, level: 0, depth: 2.2, valley: 26, crossings: [],
});
const wet = (x: number, z: number, m = 0) => { if (x < 360) return false; const I = river.project(x, z); return I.d < I.hw + m; };
/** The plateau's edge over the Somme (its top), and the ground's share of the valley side at (x, z): 0 on top, 1 on the floor. */
const edgeX = (z: number) => 300 + 24 * Math.sin(z * 0.0068 + 1) + 12 * Math.sin(z * 0.019 + 2);
const valleyK = (x: number, z: number) => smoothstep(-10, 95, x - edgeX(z));

// ---- the points
const P = { B: [-300, 280], C: [-40, 300], D: [385, 330], E: [-250, -40], F: [30, 20], G: [-85, -40], H: [-410, -120], I: [-165, -380], J: [225, -330] };
const points: ControlPointDef[] = [
  { id: 'A', name: "Bois l'Abbé", x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Cachy', x: P.B[0], z: P.B[1], owner: null, sector: 'west' },
  { id: 'C', name: "Bois d'Aquenne", x: P.C[0], z: P.C[1], owner: null, sector: 'centre' },
  { id: 'D', name: 'Fouilloy', x: P.D[0], z: P.D[1], owner: null, sector: 'east' },
  { id: 'E', name: 'Hangard Wood', x: P.E[0], z: P.E[1], owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Villers-Bretonneux', x: P.F[0], z: P.F[1], owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Monument Wood', x: P.G[0], z: P.G[1], owner: null, sector: 'centre', radius: 24 },
  { id: 'H', name: 'Hangard', x: P.H[0], z: P.H[1], owner: null, sector: 'west' },
  { id: 'I', name: 'Marcelcave', x: P.I[0], z: P.I[1], owner: null, sector: 'centre' },
  { id: 'J', name: 'Warfusée', x: P.J[0], z: P.J[1], owner: null, sector: 'east' },
  { id: 'K', name: 'Lamotte', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the roads: the Roman road straight through, the Corbie road down to Fouilloy, the lanes between the villages, the
// valley road along the foot of the slope; the railway beside the Roman road, bending off to Marcelcave
const RX = 40;
const ROADS: number[][][] = [
  [[RX, 620], [RX, -620]],                                                            // the Chaussée Brunehaut
  [[0, 500], [RX, 470]], [[0, -500], [RX, -470]],
  [P.F, [150, 95], [235, 165], [300, 250], [345, 300], P.D],                          // the Corbie road off the plateau
  [[395, 620], [P.D[0] + 5, 420], P.D, [398, 150], [392, 0], [388, -200], [380, -300], [392, -620]], // the valley road along the foot
  [[RX, 380], [-150, 330], P.B, [-380, 420], [-430, 600]],                            // Cachy
  [P.B, [-260, 140], P.E, [-320, -60], P.H],                                          // Cachy – Hangard Wood – Hangard
  [P.F, [-50, -10], P.G, P.E],                                                        // the town to the woods
  [P.H, [-300, -280], P.I, [-60, -440], [RX, -470]],                                  // Hangard – Marcelcave
  [P.J, [120, -380], [RX, -420]], [P.J, [300, -300], [380, -300]],                   // Warfusée, down to the valley
  [P.C, [RX, 300]],
];
const RAIL: number[][] = [[-70, 620], [-70, 120], [-80, -20], [-120, -200], [-165, -340], [-215, -520], [-240, -620]];
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
const roadD = gridCacheSmooth(nearest(ROADS), { x: 800, z: 800 }, 2.5);
const railD = gridCacheSmooth(nearest([RAIL]), { x: 800, z: 800 }, 2.5);

// ---- the dry combes cut into the plateau's edge (the Corbie road's down to Fouilloy, one below Warfusée to Vaire)
const COMBES: [number[][], number, number][] = [[[[190, 230], [290, 290], [420, 320]], 8, 30], [[[170, -230], [280, -270], [420, -290]], 7, 26]];
// the rises: [x, z, r, h] — Hill 104 on the shoulder over Fouilloy, the town's crest, the Marcelcave rise
const RISES = [[215, 175, 120, 5], [20, 10, 230, 2.5], [-160, -330, 160, 3.5], [-140, 320, 140, 2]];
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 20 + fbm(noise, x * 0.0025, z * 0.0025, 3) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.4;   // the open chalk
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  for (const [line, depth, width] of COMBES) h -= depth * Math.exp(-((segDist(line, x, z) / width) ** 2)) * smoothstep(80, 200, x);
  h -= 15 * smoothstep(-180, -560, x + 40 * Math.sin(z * 0.006 + 2));                     // the long slope down to the Luce
  for (const p of points) h += (h * 0.6 + 8 - h) * smoothstep(42, 22, Math.hypot(x - p.x, z - p.z)) * 0.25;
  const k = valleyK(x, z);
  h += (1.6 + fbm(noise, x * 0.01, z * 0.01, 2) * 0.4 - h) * k;                            // down the chalk slope to the marsh
  h += smoothstep(500, 650, x) * 22;                                                       // (the far side of the Somme off the map)
  h += smoothstep(545, 680, Math.abs(z)) * 6;
  for (const bz of [BASE_Z, -BASE_Z]) h += (21 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.1, ground(x, z)));

// ---- the woods: Bois l'Abbé and Aquenne behind the British; Hangard and Monument Woods between; Vaire Wood and the
// Marcelcave copses behind the Germans; willows in the marsh; a few small copses on the open plateau
const NAMED: number[][] = [[120, 430, 85], [-40, 300, 90], [-250, -40, 75], [-85, -40, 42], [300, -190, 75], [-150, -400, 55], [-60, -300, 40], [330, 60, 45]];
const wn = (x: number, z: number) => fbm(noise, x * 0.007 + 40, z * 0.007 - 12, 3);
const woodK = gridCache((x: number, z: number) => {
  if (wet(x, z, 4)) return 0;
  let k = wn(x, z) > 0.5 ? 0.7 : 0;
  for (const [wx, wz, r] of NAMED) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz) + fbm(noise, x * 0.03, z * 0.03, 2) * 14));
  if (Math.hypot(x, Math.abs(z) - BASE_Z) < 60 || roadD(x, z) < 6) k = 0;
  return k;
}, { x: 800, z: 800 }, 4);
const marsh = (x: number, z: number) => x > edgeX(z) + 85;

// ---- the lines: each side's front line (two belts of wire) and support line, their own wander, ending at the marsh
const LINES = [{ z: 150, wireAt: 26, belts: 2, seed: 11 }, { z: 255, wireAt: 18, belts: 1, gapEvery: 60, seed: 23 }];
const FRONT = 150;
const line = (z: number, faction: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(faction === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
  for (let x = -480; x <= 360; x += 60) pts.push([x, z + (r() - 0.5) * 24 + 14 * Math.sin(x * 0.009 + ph)]);
  return faction === 'nato' ? pts : pts.map(([x, zz]) => [x, -zz]).reverse();   // (walked the other way: facing +z)
};
const trenchBand = (z: number) => LINES.some((l) => Math.abs(Math.abs(z) - l.z) < (l.z <= FRONT ? 45 : 30));
const churn = (z: number) => { const a = Math.abs(z); let k = 1 - smoothstep(FRONT + 10, FRONT + 60, a); k = Math.max(k, 0.45 * (1 - smoothstep(20, 60, Math.abs(a - 255)))); return k; };

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'villers-bretonneux',
  name: 'Villers-Bretonneux',
  description: 'April 1918, the last height before Amiens: the town on its open chalk plateau astride the Roman road, the slope dropping into the Somme marshes on one side, Hangard and Aquenne woods shot to stumps — and the first tank-against-tank fight in history.',
  epochs: ['1918'],
  armies: { nato: ['uk'], pact: ['de', 'st'] }, // (the British and Australians against the German assault — storm troops and the A7Vs)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: SEED, cell: 84, weights: [0.3, 0.3, 0.1, 0.3] as any }),
  woods: (x: number, z: number) => woodK(x, z) * 0.85,

  theme: {
    // a grey spring morning over Picardy
    fogColor: 0x9ea2a0, fogDensity: 0.0016, skyTop: 0x6e767e, skyHorizon: 0xb8b8b0, skyBottom: 0x6a6a64,
    sunColor: 0xe4dccc, sunIntensity: 1.5, sunDisk: 0.1, clouds: 0.8, cloudLight: 0xc4c6c2, cloudDark: 0x70767c,
    sunDir: [-0.4, 0.5, -0.75], hemiSky: 0xc0c6cc, hemiGround: 0x4c4636, hemiIntensity: 1.25, rimColor: 0xbcc4cc, rimIntensity: 0.25,
    terrain: {
      grass: '#5a623c', grassAlt: '#4e5836', dryGrass: '#7e7650', dirt: '#5a4c3e', rock: '#8a8678', strip: '#4c3f30',
      pasture: '#58633c', ploughed: '#7a7262', stubble: '#8a7e56', meadow: '#646c40',   // (the chalk shows through the furrows)
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (railD(x, z) < 2.6) return [0x4a4640, 0.9];                                     // ballast
        const rd = roadD(x, z);
        if (rd < 3.4) return [0x9a9282, 0.85];                                             // chalky roads
        if (rd < 5.5) return [0x8a8270, 0.3];
        if (marsh(x, z) && y < 2.4) {                                                       // the Somme marsh: reeds and black peat
          const n = noise(x * 0.05, z * 0.05);
          return [n > 0.1 ? 0x6a6a3a : 0x3e3a2c, 0.7];
        }
        const k = valleyK(x, z);
        if (k > 0.1 && k < 0.85) return [0xa8a28e, 0.35 * Math.sin(k * Math.PI)];         // chalk showing on the valley slope
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 200] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** The fought-over field (core/GameEngine.js): craters, ruins, trenches and wire, the mud. */
  battlefield(game: any) {
    const F = FRONT;
    const nml = (z: number) => 1 - smoothstep(F - 20, F + 30, Math.abs(z));
    const dens = (x: number, z: number) => (wet(x, z, 8) ? 0 : nml(z) * 3.2 + (Math.abs(z - P.F[1]) < 160 && Math.abs(x - P.F[0]) < 160 ? 0.8 : 0) + 0.08);
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b: number[]) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b: number[]) => b[1] < 0)];
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + SEED)() < (Math.hypot(b.x - P.F[0], b.z - P.F[1]) < 140 ? 0.85 : Math.abs(b.z) < F ? 0.7 : 0.35)).map((b: any) => b.index);
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) for (const l of LINES) works.push(...trenchLine(line(l.z, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: l.gapEvery ?? 90 }));
    const paint = (terrain: any) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= 380; x += 16) {
        const k = churn(z) * (0.75 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5);
        if (k > 0.05) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.9, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => wet(x, z, 12) || marsh(x, z) && x > 420 || roadD(x, z) < 8 || railD(x, z) < 9 || trenchBand(z) || nearPoint(x, z, 9);

    // ---- Villers-Bretonneux: brick and chalk-stone houses along the Roman road and its side streets, the church, the
    // château and the brickworks' stack; the station on the railway
    props.rand = mulberry32(SEED * 13);
    {
      const r = props.rand;
      const STREETS: number[][][] = [[[RX, 150], [RX, -120]], [[-60, 60], [140, 60]], [[-40, -40], [150, -40]], [[100, 120], [100, -90]], [[-20, 110], [-20, -80]]];
      for (const st of STREETS) {
        const [[ax, az], [bx, bz]] = st, L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
        for (let s = 6; s < L - 6; s += 9 + r() * 3) for (const side of [-1, 1]) {
          const x = ax + tx * s - tz * side * 11, z = az + tz * s + tx * side * 11;
          if (r() < 0.15 || roadD(x, z) < 6 || railD(x, z) < 9 || nearPoint(x, z, 12)) continue;
          props.townHouse({ x, z, yaw: Math.atan2(tx, tz) + (side > 0 ? 0 : Math.PI) + Math.PI / 2, width: 7 + r() * 2, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house in Villers-Bretonneux', damaged: 0.4 });
        }
      }
      props.church({ x: P.F[0] - 30, z: P.F[1] + 32, yaw: Math.PI / 2 });
      props.hall({ x: 125, z: -95, yaw: 0.1, width: 24, depth: 12, height: 6, color: 0x7a4a38, roof: 0x4a4c48, door: 5, name: 'brickworks' });
      props.chimney({ x: 140, z: -110, height: 22 });
      props.hall({ x: -92, z: 40, yaw: 0, width: 18, depth: 8, height: 5, color: 0x8a7a64, roof: 0x4a4c48, door: 4, name: 'station' });
    }
    // ---- the villages: Cachy, Fouilloy at the foot of the slope, Hangard, Marcelcave, Warfusée; their churches
    for (const id of ['B', 'D', 'H', 'I', 'J']) {
      const p = points.find((q) => q.id === id)!;
      farmVillage(props, p.x, p.z, id === 'D' || id === 'I' ? 9 : 7, SEED * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.2);
    }
    props.rand = mulberry32(SEED * 17);
    for (const [x, z, yaw] of [[P.B[0] + 30, P.B[1] - 26, 0.3], [P.D[0] - 28, P.D[1] + 24, 0.5], [P.I[0] + 30, P.I[1] + 26, Math.PI], [P.J[0] - 26, P.J[1] - 28, Math.PI + 0.3]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }
    // the Adelaide cemetery's wall by the Roman road, the mill on Hill 104
    props.lowWall({ x: RX - 14, z: 260, yaw: 0, length: 30, height: 1.2, color: 0xa8a294 });
    props.lowWall({ x: RX - 29, z: 245, yaw: Math.PI / 2, length: 30, height: 1.2, color: 0xa8a294 });
    props.house({ x: 225, z: 185, yaw: 0.3, width: 7, depth: 7 });

    // ---- the railway: the rails, a few wagons left at the station
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 8);
      for (let k = 0; k < n; k++) props.rails({ x0: ax + (bx - ax) * k / n, z0: az + (bz - az) * k / n, x1: ax + (bx - ax) * (k + 1) / n, z1: az + (bz - az) * (k + 1) / n });
    }
    for (const z of [70, 85]) props.wagon({ x: -70, z, yaw: 0 });

    // ---- farmsteads, field walls and hay over the plateau (each half its own); hay and willows' stumps down in the marsh
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
    for (let tries = 0, n = 0; n < 70 && tries < 8000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30), z = (n % 2 ? -1 : 1) * (FRONT + 40 + rand() * (bounds.z - FRONT - 100));
      if (x > edgeX(z) - 10 && x < edgeX(z) + 80) continue;                    // (not on the valley slope)
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || woodK(x, z) > 0.3 || skip(x, z) || Math.hypot(x - P.F[0], z - P.F[1]) < 170) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xcfc8b0], [this.bases.pact, 1, 0xb8b4a0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 9, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 5 || railD(x, z) < 4 }];
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 5200, broadleaf: 0.85, autumn: 0.1,
      forest: (x: number, z: number) => {
        if (marsh(x, z)) return wet(x, z, 3) ? -1 : 0.22;                       // willows and poplars along the marsh
        const k = woodK(x, z);
        if (k < 0.3) return -0.02;
        const shot = Math.abs(z) < FRONT + 40 || Math.hypot(x - P.F[0], z - P.F[1]) < 280;   // (the woods in the fighting shot to stumps)
        return k * (trenchBand(z) ? 0.2 : shot ? 0.6 : 0.9);
      },
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x: number, z: number) => marsh(x, z) || trenchBand(z) }], count: 1400, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [...avoid, { test: (x: number, z: number) => Math.random() < churn(z) * 0.9 }], density: 2.6, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); hedges.update(dt, t); },
    };
  },
} satisfies MapDef;
