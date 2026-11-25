// Kiev, early March 1918: after Brest-Litovsk the German and Austro-Hungarian armies march into Ukraine for the Central
// Rada and retake Kiev from the Red Guards — the city Muravyov’s men had shelled and stormed in January, the Arsenal
// workers’ rising crushed in the same weeks. No front to speak of: Red detachments falling back street by street behind
// barricades toward the bridges and the left bank, the railways the only lines that mattered. Late-winter snow lying in
// patches on the mud, the Dnieper's ice breaking up into floes. Scrapes and barricades, no deep trench system.
// The ground: the Dnieper, wide and grey, with Trukhaniv Island splitting it; on its right bank the city on the high
// loess bluffs — thirty metres of wooded slope straight up from the water, cut by ravines (the Kyianka, the
// Khreshchatyk valley, the Klov, the Zvirynets ravine the railway comes down to the Struve bridge) — the Pechersk Lavra
// on the bluff's edge with the Arsenal behind it, St Andrew’s Church over Podil, the old merchants' quarter on the low
// ground in a bay of the bluffs; on the left bank flat meadow and sand, pine woods, Nikolskaya and Predmostnaya
// Slobodka and the Darnitsa yards.
// On the map (1.0 × 1.12 km) the Germans come in from the Zhitomir road (−z) across the plateau, the Reds hold the
// Brovary road (+z) on the left bank: the Dnieper runs diagonally through the middle from the north-west corner to the
// south-east, the high right bank to its south-west, the low left bank to its north-east. Podil's bridge in the north-
// west, the two Trukhaniv bridges in the middle, the Nicholas chain bridge and the Struve railway bridge in the
// south-east, each at a ravine's mouth (the only ways up the bluff for a vehicle).
// Not mirrored but fair: the river runs through the centre of the field at forty-five degrees, so each base is as far
// from it, each side has four points on its own bank and the island between (tools/map_fairness.py); the Germans' high
// plateau is traded for the Reds' left-bank pine woods and for Podil — the right bank's low corner, nearer the Reds —
// and the bluffs are highest over Podil in the Reds' half, so the high ground is shared.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 480;
const HW = 22;                                              // the Dnieper (each arm round Trukhaniv Island)
const noise = createNoise2D(1918_03);
const EXT = { x: 640, z: 700 };
const TERR = 0.02;
// ---- the river's own frame: u along the flow (north-west to south-east), v across it (+ toward the left bank, north-east)
const S2 = Math.SQRT1_2;
const U = (x: number, z: number) => (x - z) * S2, V = (x: number, z: number) => (x + z) * S2;
/** World [x, z] of the point u along the river, v across it. */
const W = (u: number, v: number) => [(u + v) * S2, (v - u) * S2];
const mid = (u: number) => 22 * Math.sin(u * 0.0045 + 0.6) + 10 * Math.sin(u * 0.013);
const split = (u: number) => 62 * Math.exp(-(((u - 20) / 110) ** 4));              // the two arms round Trukhaniv Island
/** A point `dv` across from the river's middle at u. */
const Wm = (u: number, dv: number) => W(u, mid(u) + dv);
const arm = (k: number) => { const out: number[][] = []; for (let u = -940; u <= 940; u += 20) out.push(W(u, mid(u) + k * split(u))); return out; };
const ARM_L = arm(1), ARM_R = arm(-1);
const TB = (k: number) => W(-60, mid(-60) + k * split(-60));
const river = createRiver({
  paths: [ARM_L, ARM_R], halfWidth: HW, level: 0, depth: 2.4, valley: 60,
  crossings: [
    { name: 'Podil pontoon bridge', x: Wm(-470, 0)[0], z: Wm(-470, 0)[1], kind: 'bridge', width: 6, channel: 0, pontoon: true },
    { name: 'Trukhaniv bridge', x: TB(1)[0], z: TB(1)[1], kind: 'bridge', width: 6, channel: 0 },
    { name: 'Trukhaniv bridge', x: TB(-1)[0], z: TB(-1)[1], kind: 'bridge', width: 6, channel: 1 },
    { name: 'Nicholas chain bridge', x: Wm(205, 0)[0], z: Wm(205, 0)[1], kind: 'bridge', width: 8, channel: 0 },
    { name: 'Struve railway bridge', x: Wm(430, 0)[0], z: Wm(430, 0)[1], kind: 'bridge', width: 13, channel: 0 },
  ],
});
/** m from the nearer arm's middle. */
const away = (x: number, z: number) => { const u = U(x, z), dv = V(x, z) - mid(u), sp = split(u); return Math.min(Math.abs(dv - sp), Math.abs(dv + sp)); };   // (the bends are gentle: across the flow is near enough)
const rightBank = (x: number, z: number) => V(x, z) - mid(U(x, z)) < 0 && away(x, z) > HW;
/** How far back from the water the bluff's foot stands: Podil's bay of low ground in the north-west, elsewhere hard by the river. */
const footAt = (u: number) => 26 + 70 * smoothstep(-130, -230, u) * smoothstep(-640, -540, u);
// ---- the ravines down the bluff, each a floor rising from the river's edge into the plateau: [u, length]
const RAVINES = [[-330, 300], [-60, 360], [200, 250], [430, 330]];   // the Kyianka, the Khreshchatyk valley, the Klov, the Zvirynets
const ravLine = RAVINES.map(([u, L]) => [0, 0.25, 0.5, 0.75, 1].map((t) => Wm(u + 24 * t * Math.sin(t * 5 + u), -30 - t * L)));
const ravD = gridCacheSmooth((x: number, z: number) => Math.min(...ravLine.map((l) => segDist(l, x, z))), EXT, 4);

/** Each side's airfield: the Reds' on the left-bank meadows, the Germans' on the plateau behind the station (graded to their own ground). */
const AIR = [{ faction: 'nato', x: 190, z: 400, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -190, z: -400, yaw: -Math.PI / 2, large: false }];
const padK = (x: number, z: number) => Math.max(...AIR.map((a) => smoothstep(150, 128, Math.abs(x - a.x)) * smoothstep(62, 44, Math.abs(z - a.z - 27 * Math.sign(a.z)))));

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Brovary road', 0, 440, 'centre'),
  P('B', 'Podil', -440, 290, 'west', { radius: 30 }),
  P('C', 'Nikolskaya Slobodka', 40, 250, 'centre', { radius: 28 }),
  P('D', 'Rusanivka', 330, 300, 'east'),
  P('E', 'St Andrew’s Church', -300, 40, 'west'),
  P('F', 'Trukhaniv Island', Math.round(W(20, mid(20))[0]), Math.round(W(20, mid(20))[1]), 'centre', { radius: 30 }),
  P('G', 'Predmostnaya Slobodka', 300, -40, 'east', { radius: 26 }),
  P('H', 'Kiev station', -330, -300, 'west'),
  P('I', 'Pechersk Lavra', 110, -250, 'centre', { radius: 30 }),
  P('J', 'Darnitsa yards', 430, -290, 'east'),
  P('K', 'Zhitomir road', 0, -440, 'centre'),
] as any[];
const PT: Record<string, any> = Object.fromEntries(points.map((p) => [p.id, p]));

const ground = gridCacheSmooth((x: number, z: number) => {
  const u = U(x, z), a = away(x, z), dv = V(x, z) - mid(u);
  let h: number;
  if (dv > 0 || a < HW + 4) {
    // the left bank: flat meadow and sand, low dunes under the pines
    let L = 3.4 + fbm(noise, x * 0.006 + 13, z * 0.006, 3) * 1.6 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5;
    const dt = dv + 30 * fbm(noise, x * 0.005 + 77, z * 0.005, 2);
    L += 16 * smoothstep(230, 330, dt) + TERR * Math.max(0, dt - 330);   // the second terrace: pine-grown sand rising toward Brovary
    h = 1.4 + (L - 1.4) * smoothstep(28, 90, a);
    h += 0.9 * smoothstep(0.75, 0.35, Math.hypot((u - 20) / 120, dv / 40)) * (1 - smoothstep(0, 1, dv / 60));   // (Trukhaniv Island's sand)
  } else {
    // the right bank: the loess plateau, highest over Podil, and the bluff straight up from the water
    const top = 24 + fbm(noise, x * 0.004 + 5, z * 0.004, 4) * 4 + 12 * smoothstep(-80, 220, z);
    const f = footAt(u);
    h = 2.2 + (top - 2.2) * smoothstep(f, f + 72, a) ** 1.1;
    // the ravines: a flat floor rising from the river's edge, steep wooded sides
    const r = ravD(x, z);
    if (r < 80) {
      const floor = 2.4 + 0.062 * Math.max(0, a - 40);
      h = Math.min(h, floor + Math.max(0, r - 9) * 0.32);
    }
  }
  for (const p of points) if (!'FEI'.includes(p.id)) h += (h * 0.7 + 1 - h) * smoothstep(40, 18, Math.hypot(x - p.x, z - p.z)) * 0.3;
  for (const [bz, t] of [[BASE_Z, 20], [-BASE_Z, 25]]) h += (t - h) * smoothstep(34, 16, Math.hypot(x, z - bz));
  h += ((x > 0 ? 22 : 25) - h) * padK(x, z);                                                  // (the airfields levelled)
  return h;
}, EXT, 4);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// ---- roads: the bases' roads to the bridges, the lanes up the ravines, each bank's road along the river
const ROADS = [
  [[0, 640], [0, 440], [20, 300], Wm(-60, 120), Wm(-60, 0), Wm(-60, -60), Wm(-60, -200), Wm(-60, -330), [-200, -370], [0, -440], [0, -640]],   // Brovary road – Trukhaniv – Khreshchatyk – Zhitomir road
  [[-440, 290], Wm(-470, -40), Wm(-470, 60), Wm(-400, 170), [20, 300], [330, 300], [640, 300]],                                                // Podil over its bridge, the left-bank road
  [[330, 300], Wm(150, 170), [300, -40], Wm(205, 70), Wm(205, -60), Wm(205, -200), [110, -250], [0, -440]],                                     // the chain bridge and up the Klov to the Lavra
  [[300, -40], [430, -290], Wm(430, 60), Wm(430, -100), Wm(430, -260), [-90, -390], [-330, -300], [-640, -280]],                              // the Struve bridge, up the Zvirynets, the plateau road to the station
  [[-440, 290], Wm(-330, -60), [-300, 40], Wm(-60, -200), [110, -250]],                                                                       // the plateau's edge road: Podil – St Andrew's – Khreshchatyk – Pechersk
  [[-300, 40], [-420, -100], [-330, -300]],                                                                                                    // St Andrew's to the station
];
const roadD = gridCacheSmooth((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The railway: from Kiev station across the plateau, down the Zvirynets ravine, over the Struve bridge to Darnitsa. */
const RAIL = [[-640, -330], [-330, -318], [-90, -405], Wm(430, -270), Wm(430, -100), Wm(430, 0), Wm(430, 80), [470, -230], [640, -190]];
const railD = gridCacheSmooth((x: number, z: number) => segDist(RAIL, x, z), { x: 520, z: 580 }, 2);
/** The hasty positions along the river: the Reds' on the left bank, the Germans' on the bluff's edge, each facing the water. */
const TRENCH = { nato: [] as number[][], pact: [] as number[][] };
for (let u = -760; u <= 760; u += 24) TRENCH.nato.push(Wm(u, 118 + 8 * Math.sin(u * 0.02)));
for (let u = 760; u >= -760; u -= 24) TRENCH.pact.push(Wm(u, -footAt(u) - 92 - 8 * Math.sin(u * 0.017 + 1)));
const trenchD = gridCacheSmooth((x: number, z: number) => Math.min(segDist(TRENCH.nato, x, z), segDist(TRENCH.pact, x, z)), { x: 520, z: 580 }, 4);
/** The Lavra's walled precinct on the bluff's edge; St Andrew's terrace over Podil. */
const LAVRA = { x: PT.I.x + 34, z: PT.I.z - 18, w: 64, d: 52 };
const ANDREW = { x: PT.E.x - 26, z: PT.E.z + 26 };
const inLavra = (x: number, z: number, r = 0) => Math.abs(x - LAVRA.x) < LAVRA.w / 2 + r && Math.abs(z - LAVRA.z) < LAVRA.d / 2 + r;
const KHRESHCHATYK = Wm(-60, -265);
const TOWNS = [{ x: PT.B.x, z: PT.B.z, r: 70 }, { x: KHRESHCHATYK[0], z: KHRESHCHATYK[1], r: 70 }, { x: PT.C.x, z: PT.C.z, r: 60 }, { x: PT.G.x, z: PT.G.z, r: 60 }];
const bluffFace = (x: number, z: number) => rightBank(x, z) && away(x, z) > footAt(U(x, z)) - 4 && away(x, z) < footAt(U(x, z)) + 76 && ravD(x, z) > 24;

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'kiev-1918',
  name: 'Kiev 1918',
  description: 'March 1918: after Brest-Litovsk the Germans and Austro-Hungarians retake Kiev from the Red Guards. The city on the high, ravine-cut bluffs of the Dnieper’s right bank — the golden domes of the Pechersk Lavra, St Andrew’s Church over Podil, Khreshchatyk in its valley — the river breaking up its ice round Trukhaniv Island, the bridges at the ravine mouths, the flat left bank with its pine woods and the Darnitsa yards; snow patches on the mud and barricades in the streets.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de', 'ah'] }, // (the Red Guards fight as the Russian army; the German and Austro-Hungarian columns)
  sides: { nato: 'Russia', pact: 'Central Powers' },
  conditions: { time: 'day', weather: 'overcast' }, // (raw early-March days, the thaw begun)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1918_03,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191803, cell: 80, weights: [0.3, 0.35, 0.1, 0.25] as any }),

  theme: {
    // low grey thaw sky
    fogColor: 0xb4b8b8, fogDensity: 0.0017, skyTop: 0x7c848c, skyHorizon: 0xc0c4c4, skyBottom: 0x868a88,
    sunColor: 0xe6e6e0, sunIntensity: 1.3, sunDisk: 0.05, clouds: 0.9, cloudLight: 0xc6caca, cloudDark: 0x7a8084,
    sunDir: [0.4, 0.45, 0.7], hemiSky: 0xccd2d6, hemiGround: 0x7e7c70, hemiIntensity: 1.4, rimColor: 0xc0c6cc, rimIntensity: 0.2,
    terrain: {
      grass: '#7c7a5c', grassAlt: '#86825e', dryGrass: '#9a9070', dirt: '#6a5a46', rock: '#8a8478', strip: '#6a5c4a',
      pasture: '#807e5e', ploughed: '#5e5040', stubble: '#948a6a', meadow: '#7a7c5a',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-200, 0, 330], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x5e5042, 0.9];                                       // the roads: churned mud
        if (railD(x, z) < 2.5) return [0x4e4a44, 0.7];                                   // the railway's cinder bed
        if (inLavra(x, z, -2)) return [0xa8a294, 0.5];                                   // the Lavra's yard
        const s = fbm(noise, x * 0.018 + 31, z * 0.018, 3) + (y - 4) * 0.012;               // late snow lying in patches, more on the heights
        if (s > 0.3) return [0xe4e8ea, Math.min(0.85, (s - 0.3) * 6)];
        if (y < 1.7 && away(x, z) < HW + 10) return [0x6a6050, 0.7];                    // the muddy banks
        if (!rightBank(x, z) && y < 5.5 && fbm(noise, x * 0.006 + 13, z * 0.006, 3) > 0.25) return [0xb0a27c, 0.45]; // (the left bank's sand showing)
        if (bluffFace(x, z)) return [0x8a7a5c, 0.35];                                    // (loess on the bluff face)
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-200, 0, 330] }, pact: { x: 0, z: -BASE_Z, entries: [-330, 0, 300] } },
  airfields: AIR,
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 370 }, pact: { x: 0, z: -370 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side's hasty line along the river: stretches of scrapes and rifle pits with gaps, a little wire, an MG at each road. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      for (const w of trenchLine(TRENCH[f], f, { wireAt: 16, belts: 1, gapEvery: 30 })) {
        if (Math.abs(w.x) > BOUNDS.x - 8 || Math.abs(w.z) > BOUNDS.z - 8) continue;
        if (roadD(w.x, w.z) < 8 || railD(w.x, w.z) < 6 || away(w.x, w.z) < HW + 10 || ravD(w.x, w.z) < 14 || padK(w.x, w.z) > 0) continue;
        const k = w.x - w.z;
        const stretch = Math.sin(k * 0.032) > -0.1;
        if (!stretch || (w.kind === 'wire' && Math.sin(k * 0.08) < 0.3)) continue;
        works.push(w);
      }
      for (const u of [-60, 205, 430]) {
        const [x, z] = Wm(u + 14, f === 'nato' ? 114 : -footAt(u) - 96);
        works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI * 1.25 : Math.PI * 0.25, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => trenchD(x, z) < 22;
    const holy = [{ x: LAVRA.x, z: LAVRA.z, r: 44 }, { x: ANDREW.x, z: ANDREW.z, r: 30 }];
    const skip = (x: number, z: number) => padK(x, z) > 0 || wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z) || railD(x, z) < 9 || inLavra(x, z, 8)
      || holy.some((c) => Math.hypot(c.x - x, c.z - z) < c.r) || bluffFace(x, z);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const WHITE = 0xe6e2d8, GOLD = 0xd0b050, GREEN = 0x4a8a76, BRICK = 0x8a4a36;
    const ALONG = -Math.PI / 4;   // (a yaw square to the river)
    /** An onion dome on a drum at (x, y, z): `r` its radius. */
    const onion = (x: number, y: number, z: number, r: number, color: number, drum = WHITE) => {
      m4.compose(v.set(x, y, z), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r * 0.75, r * 0.75, r * 1.6, 12), m4, drum);
      m4.compose(v.set(x, y + r * 1.6, z), q.identity(), v.clone().set(r, r * 1.2, r)); props.push('plain', new THREE.SphereGeometry(1, 12, 8), m4, color);
      m4.compose(v.set(x, y + r * 3, z), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r * 0.38, r * 1.2, 8), m4, GOLD);
      props.box('metal', x, y + r * 3.9, z, 0.15, 1.6, 0.15, 0, GOLD);
      props.box('metal', x, y + r * 4.1, z, 0.9, 0.12, 0.12, 0, GOLD);
    };

    // ---- the Kiev Pechersk Lavra: the white precinct wall, the Dormition Cathedral's gold domes, the Great Bell Tower
    props.rand = mulberry32(1051);
    for (const [dx, dz, yaw, L] of [[0, LAVRA.d / 2, 0, LAVRA.w], [0, -LAVRA.d / 2, 0, LAVRA.w], [LAVRA.w / 2, 0, Math.PI / 2, LAVRA.d], [-LAVRA.w / 2, 0, Math.PI / 2, LAVRA.d]]) {
      for (let t = -L / 2 + 2; t < L / 2; t += 4) {
        const x = LAVRA.x + dx + (yaw ? 0 : t), z = LAVRA.z + dz + (yaw ? t : 0);
        if (Math.abs(t) < 5) continue;                                                 // (the Holy Gates, one in each wall)
        props.lowWall({ x, z, yaw, length: 4.1, height: 2.8, color: WHITE });
      }
    }
    {
      const x = LAVRA.x - 8, z = LAVRA.z - 4;
      const b = props.beginBuilding('Dormition Cathedral', x, z, 0, 18, 14);
      b.plaster = WHITE;
      props.shell(b, { height: 11, key: 'plaster', color: WHITE, front: [0], left: [3], t: 0.8, bay: 3.4, sill: 2.2, head: 7.5, frame: 0xb8b0a0 });
      props.gableRoof(b, { eave: 11, pitch: 0.4, color: 0x5a7a6a, t: 0.8 });
      props.endBuilding();
      const g = b.ground;
      onion(x, g + 15, z, 3.6, GOLD);
      for (const [dx, dz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) onion(x + dx, g + 13, z + dz, 1.5, GOLD);
      // the Great Bell Tower: four tiers, white and green, a gold dome on top
      const bx = LAVRA.x + 18, bz = LAVRA.z + 12, bg = terrain.heightAt(bx, bz);
      let y = bg - 0.5;
      for (const [w, hh, c] of [[9, 10, WHITE], [7.4, 8, 0xd8d4c4], [6, 7, WHITE], [4.6, 6, 0xd8d4c4]] as const) {
        props.box('plaster', bx, y + hh / 2, bz, w, hh, w, 0, c);
        props.box('plain', bx, y + hh - 0.3, bz, w + 0.6, 0.5, w + 0.6, 0, GREEN);
        props.box('metal', bx, y + hh * 0.6, bz, w + 0.05, hh * 0.3, 1.2, 0, 0x2a2622);
        y += hh;
      }
      onion(bx, y, bz, 2.2, GOLD);
      cover.addBox({ x: bx, z: bz, yaw: 0, length: 9, thickness: 9, height: 12 });
      props.townHouse({ x: LAVRA.x - 14, z: LAVRA.z + 16, yaw: 0, width: 14, depth: 7, storeys: 2, name: 'monks’ cells', damaged: 0 });
      props.crates({ x: LAVRA.x + 20, z: LAVRA.z - 14, yaw: 0.3 });
    }

    // ---- St Andrew's Church on its terrace over Podil: turquoise and white, green domes, gold crosses
    {
      props.rand = mulberry32(1754);
      const { x, z } = ANDREW;
      for (const [dx, dz, yaw, L] of [[0, 20, 0, 40], [0, -20, 0, 40], [20, 0, Math.PI / 2, 40], [-20, 0, Math.PI / 2, 40]]) {
        for (let t = -L / 2 + 2; t < L / 2; t += 4) {
          if (Math.abs(t) < 5 && dz) continue;                                             // (the stairs up, front and back)
          props.lowWall({ x: x + dx + (yaw ? 0 : t), z: z + dz + (yaw ? t : 0), yaw, length: 4.1, height: 2.4, color: 0xc8c0b0 });
        }
      }
      const TURQ = 0x7ab4c0;
      const b = props.beginBuilding('St Andrew’s Church', x, z, 0, 14, 14);
      b.plaster = TURQ;
      props.shell(b, { height: 10, key: 'plaster', color: TURQ, front: [0], back: [0], left: [0], t: 0.8, bay: 3.4, sill: 2.4, head: 7.6, frame: 0xf0ece4 });
      props.gableRoof(b, { eave: 10, pitch: 0.35, color: GREEN, t: 0.8 });
      props.endBuilding();
      const g = b.ground;
      onion(x, g + 13, z, 3.4, GREEN, TURQ);
      for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
        props.box('plaster', x + dx, g + 6.5, z + dz, 2.4, 13, 2.4, 0, TURQ);
        onion(x + dx, g + 13, z + dz, 1.3, GREEN, TURQ);
      }
      for (const [hx, hz, yaw] of [[34, -10, 0], [30, 14, Math.PI / 2], [-6, -34, 0], [14, -32, 0]]) {
        if (!skip(x + hx, z + hz)) props.townHouse({ x: x + hx, z: z + hz, yaw, width: 9, depth: 8, storeys: 2, damaged: 0.05 });
      }
    }

    // ---- the Arsenal behind the Lavra: brick halls, its chimney
    {
      props.rand = mulberry32(1764);
      const [ax, az] = Wm(150, -230);
      for (const [dx, dz, yaw, w] of [[-30, 20, ALONG, 30], [24, 26, ALONG, 26], [-26, -26, ALONG + Math.PI / 2, 22], [28, -24, ALONG + Math.PI / 2, 22]]) {
        if (!skip(ax + dx, az + dz)) props.hall({ x: ax + dx, z: az + dz, yaw, width: w, depth: 14, height: 8, color: BRICK, name: 'Arsenal workshop' });
      }
      props.chimney({ x: ax + 2, z: az - 2, height: 28 });
    }
    // ---- Khreshchatyk in its valley: three-storey blocks along both sides of the street up the valley floor
    {
      props.rand = mulberry32(1797);
      const l = ravLine[1];
      for (let i = 0; i < l.length - 1; i++) {
        const [ax, az] = l[i], [bx, bz] = l[i + 1], L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L;
        for (let t = 6; t < L; t += 13) for (const side of [1, -1]) {
          const x = ax + tx * t + tz * 18 * side, z = az + tz * t - tx * 18 * side;
          if (Math.hypot(x - KHRESHCHATYK[0], z - KHRESHCHATYK[1]) > 130 || skip(x, z)) continue;
          props.townHouse({ x, z, yaw: Math.atan2(tx, tz) + (side > 0 ? Math.PI / 2 : -Math.PI / 2), width: 11, depth: 9, storeys: 3, damaged: 0.1 });
        }
      }
    }
    // ---- Podil's stone merchants' houses, the left-bank Slobodkas of timber; the riverside warehouses
    for (const [p, n, seed, stone] of [[PT.B, 20, 1, true], [PT.C, 14, 2, false], [PT.G, 12, 3, false], [PT.D, 8, 4, false]] as const) {
      props.rand = mulberry32(1918_30 + seed);
      for (let i = 0, k = 0; k < n && i < 600; i++) {
        const a = props.rand() * Math.PI * 2, d = 20 + props.rand() * 56, x = p.x + Math.cos(a) * d * 1.2, z = p.z + Math.sin(a) * d;
        if (skip(x, z) || Math.hypot(x - p.x, z - p.z) < 14 || Math.abs(x) > 490 || Math.abs(z) > 550) continue;
        const yaw = Math.round((a - ALONG) / (Math.PI / 2)) * (Math.PI / 2) + ALONG;
        if (stone) props.townHouse({ x, z, yaw, width: 9, depth: 8, storeys: 2, damaged: 0.05 });
        else props.house({ x, z, yaw, width: 8 + props.rand() * 2, depth: 6 });
        k++;
      }
    }
    for (const [u, dv] of [[-470, -70], [-430, -72], [205, 62], [240, 64]]) {
      const [x, z] = Wm(u, dv);
      if (!skip(x, z)) props.hall({ x, z, yaw: ALONG, width: 18, depth: 9, height: 5, color: dv < 0 ? 0x8a7a64 : 0x6a5a48, name: 'riverside warehouse' });
    }
    // ---- the railway: Kiev station on the plateau, the Darnitsa yards on the left bank, sidings and wagons at both
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let t = 0; t < L; t += 20) {
        const t1 = Math.min(L, t + 20), x0 = ax + (bx - ax) * t / L, z0 = az + (bz - az) * t / L, x1 = ax + (bx - ax) * t1 / L, z1 = az + (bz - az) * t1 / L;
        if (Math.abs(x0) > 520 || Math.abs(z0) > 580 || (wet(x0, z0, -6) && !river.bridgeAt(x0, z0)) || (wet(x1, z1, -6) && !river.bridgeAt(x1, z1))) continue;
        props.rails({ x0, z0, x1, z1 });
      }
    }
    for (const [s, yaw, k] of [[PT.H, -0.04, 1], [PT.J, 0.32, -1]] as const) {
      const station = k > 0;
      for (const off of [7, 14]) {
        const c = Math.cos(yaw), sn = Math.sin(yaw);
        for (let t = -70; t < 70; t += 20) props.rails({ x0: s.x + c * t - sn * off * k, z0: s.z - 18 * k - sn * t - c * off * k, x1: s.x + c * (t + 20) - sn * off * k, z1: s.z - 18 * k - sn * (t + 20) - c * off * k });
      }
      props.hall({ x: s.x - 10, z: s.z + 22 * k, yaw, width: station ? 30 : 26, depth: 10, height: station ? 6.5 : 7, color: station ? 0xc8b480 : 0x7a5a46, name: station ? 'railway station' : 'engine shed' });
      props.hall({ x: s.x + 44, z: s.z + 20 * k, yaw, width: 20, depth: 9, height: 5, color: 0x6e5a48, name: 'goods shed' });
      props.rand = mulberry32(1918 + k);
      for (const [dx, kind] of [[-40, 'box'], [-26, 'tank'], [24, 'box'], [38, 'open'], [52, 'box']] as const) {
        props.wagon({ x: s.x + dx, z: s.z - (18 + 7) * k - Math.sin(yaw) * dx, yaw: Math.PI / 2 - yaw, kind, color: [0x5a3426, 0x4e3a2a, 0x3e3a34][Math.floor(props.rand() * 3)] });
      }
    }
    // ---- Trukhaniv Island: boat sheds, a landing stage's timber
    props.rand = mulberry32(1918_4);
    for (const du of [-40, 30, 80]) { const [x, z] = Wm(du, du === 30 ? 10 : -8); props.house({ x, z, yaw: ALONG, width: 8, depth: 5 }); }
    { const [x, z] = Wm(60, 12); props.logPile({ x, z, yaw: ALONG, length: 7 }); }
    { const [x, z] = Wm(-10, -12); props.crates({ x, z, yaw: 0.5 }); }

    // ---- barricades: carts, doors and logs across the streets round the town quarters
    for (const t of TOWNS) {
      props.rand = mulberry32(1918_5 + Math.round(t.z));
      for (let i = 0, k = 0; k < 7 && i < 300; i++) {
        const a = props.rand() * Math.PI * 2, d = 26 + props.rand() * 40, x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
        if (skip(x, z) || roadD(x, z) < 10) continue;
        props.logBarricade({ x, z, yaw: a + Math.PI / 2, length: 5 + props.rand() * 3 });
        k++;
      }
    }
    // the farms on the far fields
    for (const p of [PT.D, PT.H]) farmVillage(props, p.x + 60, p.z + 10, 4, 1918 * 10 + Math.round(p.z * 7), skip, 1.1);
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 90 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (away(x, z) < 110 || TOWNS.some((t) => Math.hypot(x - t.x, z - t.z) < t.r) || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z) || ravD(x, z) < 30) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    // ---- the ice breaking up: floes drifting down both arms (none at the bridges)
    props.rand = mulberry32(1918_6);
    for (let i = 0, n = 0; n < 140 && i < 2000; i++) {
      const u = (props.rand() * 2 - 1) * 760, k = props.rand() < 0.5 ? 1 : -1;
      const [x, z] = W(u, mid(u) + k * split(u) + (props.rand() * 2 - 1) * (HW - 5));
      if (Math.abs(x) > 520 || Math.abs(z) > 580 || river.crossings.some((c: any) => Math.hypot(c.x - x, c.z - z) < 22) || terrain.heightAt(x, z) > -0.4) continue;
      const s = 1.5 + props.rand() * 4.5;
      props.box('plain', x, 0.04, z, s, 0.16, s * (0.5 + props.rand() * 0.6), props.rand() * Math.PI, 0xdfe6ea);
      n++;
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    // the Dnieper in thaw: grey, cold water
    for (const o of scene.children) {
      const mat = (o as any).material;
      if (mat?.userData?.waterSurface && !mat.userData.thaw) { mat.color?.lerp(new THREE.Color(0x8a9496), 0.5); mat.userData.thaw = true; }
    }

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...river.crossings.map((c: any) => ({ x: c.x, z: c.z, r: HW + 16 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || railD(x, z) < 5 || inLavra(x, z, 6) || holy.some((c) => Math.hypot(c.x - x, c.z - z) < c.r * 0.8) }];
    // the left bank's pine woods (the Reds' cover, more of it), the wooded bluffs and ravines, the plateau's orchards and copses
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 900, autumn: 1, broadleaf: 0.55,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z) || padK(x, z) > 0) return 0.03;
        if (TOWNS.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + 20)) return 0.04;
        if (bluffFace(x, z) || (rightBank(x, z) && ravD(x, z) < 40 && ravD(x, z) > 12)) return 0.8;   // the wooded bluffs and ravine sides
        if (away(x, z) < 45) return 0.2;                                                     // willows along the banks and on the island
        return wood(x, z) > (rightBank(x, z) ? 0.3 : 0.08) ? 0.85 : 0;                      // (pine woods on the left bank's sand)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
