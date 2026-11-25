// The Mozhaisk line, October 1941 (1945 epoch; Eastern Front; the big field, 1.0 × 1.12 km): the defence of Moscow.
// On 13–18 October Polosukhin’s 32nd Rifle Division, brought from the Far East, held the old battlefield of Borodino
// against the 10th Panzer Division and the SS division Das Reich coming up the Minsk–Moscow highway — in the anti-tank
// ditches and concrete pillboxes of the Mozhaisk line, among the monuments of 1812. Here the map runs from Moscow
// (+z, the Red Army’s side, the Mozhaisk road behind it) to the west (−z, the Gzhatsk road the Germans come by). Across
// the middle winds the Kolocha in its meadow valley, Borodino on both banks at the highway bridge, with a ford out on
// each flank; along the eastern edge the Moskva, which the Kolocha runs into. On the Red Army’s side the Mozhaisk
// line’s main ditch and pillboxes, the Raevsky redoubt on its hill with the 1812 monument, Semyonovskoye where
// Bagration’s flèches stood and Kutuzov’s Gorki; the Spaso-Borodinsky monastery on the south bank. On the German
// side the line’s forward belt they overran — its ditch and pillboxes, now facing east — the Shevardino redoubt with
// the French monument, Doronino and Valuevo; Novoe Selo on the north bank. Birch and fir woods, autumn mud in the
// meadows, the first snow not yet lying.
// Not a mirror but fair: each side has one redoubt hill in its centre of about the same height, two villages on its
// flanks as far from its base as the other side’s, a ditch with gaps only at its three roads and a pillbox line
// behind it, and one point on its own bank near the middle (the monastery on the south bank in the west, Novoe Selo
// on the north bank in the east); Borodino lies on both banks at the one bridge, and the two fords sit one at each
// side’s flank point. The Kolocha’s meanders, the woods and the Moskva bend are each side’s own, as in the real ground.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { commandPost, shellField, trenchLine } from './common.js';
import { segDist, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1941_1013);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---- the rivers: the Kolocha across the middle (the highway bridge at Borodino, a ford on each flank), the Moskva
// along the eastern edge, the Kolocha running into it
const HB = 30; // the highway bridge’s x
const kol = (x: number) => 14 * Math.sin((x - HB) * 0.006) + 7 * Math.sin((x - HB) * 0.017);
const FORD_W = -300, FORD_E = 310;
const MOSKVA = [[452, -720], [468, -380], [446, -120], [462, 60], [478, 320], [458, 720]];
const river = createRiver({
  path: kol,
  paths: [kol, MOSKVA],
  halfWidth: 9,
  level: 0,
  depth: 2.4,
  valley: 44,
  crossings: [
    { name: 'Borodino bridge', x: HB, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Maslovo ford', x: FORD_W, kind: 'ford', width: 14, channel: 0 },
    { name: 'Novoe Selo ford', x: FORD_E, kind: 'ford', width: 14, channel: 0 },
  ],
});

// ---- the points
const points: ControlPointDef[] = [
  { id: 'A', name: 'Mozhaisk road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Semyonovskoye', x: -330, z: 255, owner: null, sector: 'west' },
  { id: 'C', name: 'Raevsky redoubt', x: -35, z: 238, owner: null, sector: 'centre' },
  { id: 'D', name: 'Gorki', x: 330, z: 250, owner: null, sector: 'east' },
  { id: 'E', name: 'Spaso-Borodinsky monastery', x: -335, z: Math.round(kol(-335)) + 62, owner: null, sector: 'west' },
  { id: 'F', name: 'Borodino', x: HB, z: Math.round(kol(HB)), owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Novoe Selo', x: 300, z: Math.round(kol(300)) - 62, owner: null, sector: 'east' },
  { id: 'H', name: 'Doronino', x: -315, z: -245, owner: null, sector: 'west' },
  { id: 'I', name: 'Shevardino redoubt', x: -30, z: -248, owner: null, sector: 'centre' },
  { id: 'J', name: 'Valuevo', x: 315, z: -250, owner: null, sector: 'east' },
  { id: 'K', name: 'Gzhatsk road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, [p.x, p.z]]));

// ---- the roads: the Minsk–Moscow highway over the bridge, a road down each flank over the fords, a lateral behind
// each side’s line and a lane along each bank to Borodino
const HWY = [[0, -580], [0, -BASE_Z], [40, -300], [45, -150], [HB, -40], [HB, 40], [45, 150], [40, 300], [0, BASE_Z], [0, 580]];
const ROADS = [HWY,
  [[-130, -580], [-190, -430], P.H, [-305, -120], [FORD_W, kol(FORD_W)], P.E, [-345, 150], P.B, [-200, 420], [-130, 580]],
  [[130, -580], [200, -430], P.J, P.G, [FORD_E, kol(FORD_E)], [325, 120], P.D, [200, 420], [130, 580]],
  [P.B, [-190, 245], P.C, [45, 260], [180, 255], P.D],
  [P.H, [-180, -255], P.I, [40, -262], [180, -250], P.J],
  [P.E, [-200, kol(-200) + 48], [-60, kol(-60) + 42], [HB, 40]],
  [[HB, -40], [120, kol(120) - 44], [220, kol(220) - 50], P.G],
];
const roadDistRaw = (x: number, z: number) => { let d = Infinity; for (const p of ROADS) d = Math.min(d, segDist(p, x, z)); return d; };
const roadDist = gridCacheSmooth(roadDistRaw, BOUNDS, 2);
const onHwy = (x: number, z: number) => segDist(HWY, x, z) < 4.5;

// ---- the Mozhaisk line: the main ditch on the Red Army’s side, the forward ditch on the German side; gaps only at roads
const ditchS = (x: number) => 150 + 10 * Math.sin(x * 0.011 + 0.4);
const ditchN = (x: number) => -146 - 12 * Math.sin(x * 0.009 + 2.0);
const ditchD = (x: number, z: number) => (Math.abs(x) > 440 ? Infinity : z > 0 ? Math.abs(z - ditchS(x)) : Math.abs(z - ditchN(x)));

// ---- the redoubts and the low ridges
const hill = (x: number, z: number, cx: number, cz: number, h: number, r: number) => { const d = Math.hypot(x - cx, z - cz) / r; return d >= 1 ? 0 : h * (1 - d * d) ** 2; };
function ground(x: number, z: number) {
  let h = 7 + fbm(noise, x * 0.0038 + 3, z * 0.0038 - 8, 3) * 4.5 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.3;
  h += hill(x, z, P.C[0], P.C[1], 9, 95) + hill(x, z, P.I[0], P.I[1], 9, 95);               // the Raevsky and Shevardino heights
  h += hill(x, z, -360, 300, 4, 140) + hill(x, z, 360, -300, 4, 140);                         // the Semyonovskoye and Valuevo rises
  h += smoothstep(500, 620, Math.abs(x)) * 12 + smoothstep(560, 680, Math.abs(z)) * 10;
  for (const bz of [BASE_Z, -BASE_Z]) h += (lerp(7, h, 0.3) - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}
const groundC = gridCacheSmooth(ground, BOUNDS, 2);

function height(x: number, z: number) {
  let h = groundC(x, z);
  const dd = ditchD(x, z);
  if (dd < 4 && roadDist(x, z) > 12) h -= 2.6 * (1 - smoothstep(2, 3.5, dd)); // the anti-tank ditches, square-sided
  return h;
}

// ---- the woods: birch and fir, each half its own shapes, the same area on each
const woodsN = (x: number, z: number) => fbm(noise, x * 0.0045 + 71, z * 0.0045 - 33, 3);
const W_NATO = 0.12;
const W_PACT = evenThreshold(woodsN, W_NATO, (x, z) => z > 0);
const woodsK = gridCache((x: number, z: number) => smoothstep(0, 0.1, woodsN(x, z) - (z > 0 ? W_NATO : W_PACT)), BOUNDS, 4);

/** The Kolocha’s meadows in the autumn rains: men slog, vehicles churn; the roads and the high fields are firm. */
const soft = gridCache((x: number, z: number) => {
  if (roadDistRaw(x, z) < 5) return 1;
  const d = Math.abs(z - kol(x));
  if (d < 40) return lerp(0.6, 0.85, smoothstep(14, 40, d));
  return 0.92;
}, BOUNDS, 4);

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'mozhaisk',
  name: 'Mozhaisk Line',
  description: 'October 1941, the road to Moscow: the old battlefield of Borodino on the Kolocha, its 1812 monuments and monastery, cut by the anti-tank ditches and pillboxes of the Mozhaisk line, birch and fir woods turning, autumn mud in the meadows and the Minsk–Moscow highway over the bridge.',
  epochs: ['1945'],
  region: 'east', // (the menu’s Eastern Front: maps/index.js REGIONS)
  sides: { nato: 'Soviet Union', pact: 'Germany' },
  armies: { nato: ['sov'], pact: ['wh'] },
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1941,
  height,
  soft: (x: number, z: number, foot: boolean) => { const s = soft(x, z); return foot ? lerp(1, s, 0.6) : s; },
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => woodsK(x, z) * 0.85,
  fields: createFields({ seed: 1941, cell: 70 }),

  theme: {
    // a grey October day, low cloud, the woods yellow and the fields gone brown
    fogColor: 0xa8aca8, fogDensity: 0.0018,
    skyTop: 0x6c7880, skyHorizon: 0xbcc0bc, skyBottom: 0x7c7e74,
    sunColor: 0xf2ead8, sunIntensity: 1.6, sunDisk: 0.15,
    clouds: 0.8, cloudLight: 0xdcdcd6, cloudDark: 0x808488,
    sunDir: [0.5, 0.5, 0.6],
    hemiSky: 0xbcc4cc, hemiGround: 0x4c4632, hemiIntensity: 1.25,
    rimColor: 0xc4c8cc, rimIntensity: 0.2,
    terrain: {
      grass: '#66683a', grassAlt: '#5c6034', dryGrass: '#8a7c4c', dirt: '#55452f', rock: '#6c675c',
      pasture: '#6a6c3c', ploughed: '#4e3e2c', stubble: '#9a8854', meadow: '#6e6e3e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0, // (no default tracks: the roads are painted below)
      surface(x: number, z: number, y: number) {
        const rd = roadDist(x, z);
        if (rd < 4) return [onHwy(x, z) ? 0x5c5a56 : 0x6a5c48, 0.88];   // the highway’s tarmac, the mud roads
        if (rd < 6.5) return [0x4e4232, 0.5];
        if (y < 0.6) return [0x302c1e, 0.85];                            // mud at the water’s edge
        if (ditchD(x, z) < 5 && rd > 12) return [0x5a4630, 0.9];          // the ditches’ raw clay
        const d = Math.abs(z - kol(x));
        if (d < 40) return [0x4a4630, 0.5 * (1 - smoothstep(14, 40, d))];  // the sodden meadows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  /** Each side’s trench line behind its ditch (broken at the roads), wire in front; a scatter of craters along the middle. */
  battlefield() {
    const works: any[] = [];
    for (const [f, zf, off] of [['nato', ditchS, 30], ['pact', ditchN, -30]] as [string, (x: number) => number, number][]) {
      let run: number[][] = [];
      const flush = () => { if (run.length > 2) works.push(...trenchLine(f === 'nato' ? run : run.reverse(), f, { zig: 1.2, wireAt: 20, belts: 1, gapEvery: 70 })); run = []; };
      for (let x = -430; x <= 430; x += 10) {
        const z = zf(x) + off;
        if (roadDistRaw(x, z) < 16 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 40)) flush();
        else run.push([x, z]); // (trenchLine’s front is to the right of the way along: nato’s run goes +x, pact’s reversed)
      }
      flush();
    }
    const blasts = shellField(1941_10, { x: 460, z: 520 }, (x: number, z: number) => 0.25 * smoothstep(200, 60, z) * (roadDistRaw(x, z) < 8 || Math.abs(z - kol(x)) < 14 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 30) ? 0 : 1));
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number) => Math.abs(z - kol(x)) < 15 || river.project(x, z).d < 16;

    /** A Russian log house (izba): dark log walls, white-framed windows, a plank or iron roof. Occupiable. */
    const izba = (x: number, z: number, yaw: number, w: number, d: number, name = 'log house') => {
      const r = props.rand;
      const b = props.beginBuilding(name, x, z, yaw, w, d);
      const logs = new THREE.Color().setHSL(0.07, 0.3 + r() * 0.1, 0.2 + r() * 0.06).getHex();
      b.plaster = logs;
      props.shell(b, { height: 2.8, key: 'plain', color: logs, front: [(r() - 0.5) * w * 0.4], t: 0.36, bay: 2.3, frame: 0xd8dcd4, shutters: 0.5 });
      props.piece('stone', b, 0, 0.1, 0, w + 0.3, 0.45, d + 0.3, 0x5e5850);
      props.gableRoof(b, { eave: 2.8, pitch: 0.75, color: r() < 0.5 ? 0x6e6a5a : 0x4e6a5e, overhang: 0.6, t: 0.36 });
      props.endBuilding();
    };
    /** A concrete pillbox of the Mozhaisk line, its embrasure toward the enemy. */
    const pillbox = (x: number, z: number, toward: number) => {
      const g = terrain.heightAt(x, z), yaw = toward < 0 ? 0 : Math.PI;
      props.box('stone', x, g + 0.8, z, 6.5, 2.0, 5, yaw, 0x8a877e);
      props.box('stone', x, g + 1.9, z, 7.2, 0.35, 5.6, yaw, 0x7e7b72);
      props.box('plain', x, g + 1.25, z + toward * 2.52, 3.2, 0.35, 0.1, yaw, 0x1c1c1a);
      cover.addBox({ x, z, yaw, length: 6.5, thickness: 5, height: 2.0 });
    };
    /** An 1812 monument: a stepped base and a column or obelisk. */
    const monument = (x: number, z: number, height: number, top = 0) => {
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + 0.3, z, 5, 0.6, 5, 0, 0x9a968c);
      props.box('stone', x, g + 0.9, z, 3.4, 0.6, 3.4, 0, 0x8e8a80);
      props.column({ x, z, radius: 0.7, height });
      if (top) props.box('metal', x, g + 1.2 + height + 0.6, z, 1.4, 1.2, 0.6, 0, top);
      cover.addBox({ x, z, yaw: 0, length: 5, thickness: 5, height: 1.2 });
    };

    // ---- Borodino on both banks at the bridge: izbas along the highway and the bank lanes, the church on the north bank
    props.rand = mulberry32(1941_01);
    {
      const r = props.rand, placed: number[][] = [];
      for (let i = 0; i < 160 && placed.length < 24; i++) {
        const x = HB + (r() * 2 - 1) * 120, z = kol(x) + (r() < 0.5 ? -1 : 1) * (22 + r() * 70);
        if (roadDist(x, z) < 8 || roadDist(x, z) > 30 || wet(x, z) || Math.hypot(x - 0, z + 52) < 16 || placed.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 12)) continue;
        placed.push([x, z]);
        const w = 7 + r() * 2.5, d = 6 + r() * 1.5;
        if (r() < 0.2) props.townHouse({ x, z, yaw: z > kol(x) ? Math.PI : 0, width: w + 1, depth: d + 2, storeys: 2, name: 'brick house', damaged: 0.3 });
        else izba(x, z, z > kol(x) ? Math.PI : 0, w, d);
      }
    }
    props.church({ x: 0, z: kol(0) - 52, yaw: 0 }); // the Church of the Nativity
    props.sandbagRing({ x: HB + 16, z: kol(HB + 16) + 22, radius: 4.5, toward: -1 });
    props.sandbagRing({ x: HB - 16, z: kol(HB - 16) - 22, radius: 4.5, toward: 1 });

    // ---- the villages round the other points: izbas facing the middle of the village, fences, woodpiles
    for (const p of points) {
      if (p.id === 'F' || p.id === 'C' || p.id === 'I') continue;
      props.rand = mulberry32(4100 + Math.round(p.x * 3 + p.z));
      const r = props.rand, n = p.owner ? 4 : p.id === 'E' ? 4 : 8, placed: number[][] = [];
      for (let i = 0; i < 40 && placed.length < n; i++) {
        const a = (i / 13) * Math.PI * 2 + r() * 0.4, dist = 18 + r() * 22;
        const x = p.x + Math.cos(a) * dist, z = p.z + Math.sin(a) * dist;
        const w = 6.5 + r() * 2.5, d = 5.5 + r() * 1.5, yaw = Math.atan2(-Math.cos(a), -Math.sin(a)), extra = r();
        if (roadDist(x, z) < 10 || wet(x, z) || ditchD(x, z) < 12 || Math.hypot(x, Math.abs(z) - BASE_Z) < 36 || placed.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 12)) continue;
        placed.push([x, z]);
        izba(x, z, yaw, w, d, placed.length % 3 === 0 ? 'barn' : 'log house');
        const [fx, fz] = PropBuilder.local(x, z, yaw, 0, -d / 2 - 5);
        if (roadDist(fx, fz) < 8 || ditchD(fx, fz) < 6) continue;
        if (extra < 0.4) props.lowWall({ x: fx, z: fz, yaw, length: w + 3, height: 1.0, color: 0x5a4632 });
        else if (extra < 0.7) props.logPile({ x: fx, z: fz, yaw, length: 6 });
        else props.hayBales({ x: fx, z: fz, yaw, count: 2 });
      }
    }

    // ---- the monastery on the south bank: its church inside a white wall with a gap toward Borodino
    {
      const [mx, mz] = P.E;
      props.church({ x: mx - 4, z: mz + 22, yaw: Math.PI });
      for (const [dx, dz, yaw, len] of [[-24, 0, Math.PI / 2, 44], [24, 0, Math.PI / 2, 44], [-12, 22, 0, 22], [12, -22, 0, 22]] as number[][]) {
        props.lowWall({ x: mx + dx, z: mz + dz + 10, yaw, length: len, height: 2.2, color: 0xd8d4c8 });
      }
      monument(mx + 14, mz - 18, 4); // Tuchkov’s
    }

    // ---- the redoubts: earthwork rings on the hills, the 1812 monuments on top
    props.rand = mulberry32(1941_02);
    for (const [id, toward] of [['C', -1], ['I', 1]] as [string, number][]) {
      const [x, z] = P[id];
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2 + 0.3, px = x + Math.cos(ang) * 26, pz = z + Math.sin(ang) * 26;
        if (roadDist(px, pz) > 8) props.lowWall({ x: px, z: pz, yaw: ang + Math.PI / 2, length: 12, height: 1.2, color: 0x5a4a34 });
      }
      props.sandbagRing({ x: x + 12, z: z + toward * 14, radius: 4.5, toward });
      props.sandbagRing({ x: x - 14, z: z + toward * 10, radius: 4.5, toward });
    }
    monument(P.C[0] + 6, P.C[1] + 6, 8);             // the Raevsky battery’s column
    monument(P.I[0] - 6, P.I[1] - 6, 6, 0x3a3a34);   // the monument to the Grande Armée’s dead, its eagle
    monument(P.B[0] + 26, P.B[1] - 28, 5);           // Bagration’s flèches
    monument(P.D[0] - 24, P.D[1] + 26, 5);           // Kutuzov’s command post

    // ---- the pillboxes behind each ditch, facing the enemy (the line’s own at the Red Army; the overrun ones at the Germans)
    for (const x of [-410, -250, -160, -60, 120, 220, 380]) {
      const z = ditchS(x) + 16;
      if (roadDist(x, z) > 12 && !nearPoint(x, z, 30)) pillbox(x, z, -1);
    }
    for (const x of [-380, -230, -120, 80, 170, 260, 410]) {
      const z = ditchN(x) - 16;
      if (roadDist(x, z) > 12 && !nearPoint(x, z, 30)) pillbox(x, z, 1);
    }

    // ---- wrecks on the roads, haystacks and field barns
    props.rand = mulberry32(1941_03);
    {
      const r = props.rand;
      for (let i = 0; i < 36; i++) {
        const p = ROADS[i % 3], k = Math.floor(r() * (p.length - 1)), t = r();
        const x0 = p[k][0] + (p[k + 1][0] - p[k][0]) * t, z0 = p[k][1] + (p[k + 1][1] - p[k][1]) * t, side = r() < 0.5 ? -1 : 1;
        const len = Math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) || 1;
        const x = x0 + side * 8 * (p[k + 1][1] - p[k][1]) / len, z = z0 - side * 8 * (p[k + 1][0] - p[k][0]) / len;
        if (nearPoint(x, z, 32) || Math.abs(z) > 440 || wet(x, z) || roadDist(x, z) < 6.5 || ditchD(x, z) < 6) continue;
        props.wreckCar({ x, z, yaw: r() * 6.28 });
      }
      for (let i = 0; i < 70; i++) {
        const x = (r() * 2 - 1) * 440, z = (r() * 2 - 1) * 520;
        if (nearPoint(x, z, 40) || wet(x, z) || woodsK(x, z) > 0.3 || roadDist(x, z) < 10 || ditchD(x, z) < 8 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50) continue;
        const k = r();
        if (k < 0.5) props.hayBales({ x, z, yaw: r() * 3, count: 2 + Math.floor(r() * 3) });
        else if (k < 0.7) izba(x, z, r() * 3, 7, 5, 'barn');
        else if (k < 0.85) props.sandbagRing({ x, z, radius: 4, toward: z > 0 ? -1 : 1 });
        else props.logPile({ x, z, yaw: r() * 3, length: 6 });
      }
    }
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5236);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z) || roadDist(x, z) < 8 || ditchD(x, z) < 6 }];
    // birch and fir: the woods, alders along the Kolocha, a few trees in the villages
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 8000, broadleaf: 0.55, autumn: 0.8, maxY: 40,
      forest: (x: number, z: number) => {
        if (wet(x, z) || roadDist(x, z) < 9 || ditchD(x, z) < 8 || nearPoint(x, z, 28)) return -1;
        if (woodsK(x, z) > 0.5) return 1;
        const d = Math.abs(z - kol(x));
        if (d > 16 && d < 26) return 0.15;   // (alders along the banks)
        return nearPoint(x, z, 70) ? 0.08 : -0.04;
      },
    });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        grass.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
