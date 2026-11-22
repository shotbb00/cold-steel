// Sedan, 5–11 November 1918 (1918 only; the Western Front; the big field, 1.0 × 1.12 km): the race to Sedan, the
// last days of the war. The German army is falling back to its last line, the Meuse, blowing every bridge behind it;
// the French Fourth Army and the AEF — the 42nd “Rainbow” Division and then the 1st, cutting across its front by
// night in the scramble to be first — push north through Chéhéry, Bulson and Noyers to the wooded heights of the
// Marfée over the river, Frénois and Wadelincourt below them, and look across at Sedan’s old town and its château
// fort. It is mobile, late-war fighting: rearguard machine-gun nests in the villages and woods, no trench system.
// On the map: the Meuse runs diagonally across the field in its loops, from Bazeilles upstream (east, in the American
// half) past Sedan and Wadelincourt in the middle to Donchery downstream (west, in the German half); its stone bridges
// are blown — the wreck of each lies in the water by the ford it left — and the pioneers’ pontoon bridges carry the
// rest. Sedan’s old town and the château fort on its spur on the right bank, the Bois de la Garenne behind it; on the
// left bank Frénois and the Château de Bellevue under the Marfée heights and their wood, Wadelincourt at the bridges,
// Bulson, Noyers and Chéhéry behind; Illy and Givonne in the Ardennes hills on the German side; the railway along
// the right bank through Sedan station.
// Not mirrored but fair: the river is diagonal, so each side holds one bank behind it and one stretch of the far
// bank in its own half — Bazeilles for the Americans to cross to (the Germans reach it along their own bank), Donchery
// for the Germans. Each side has a height of the same size and reach from its base (the Marfée for the Americans, the
// château spur for the Germans) with a walled château on it (Bellevue / the fort), a wood of the same size behind it
// (Marfée / Garenne), a town quarter of the same houses by the river (Torcy, Sedan’s left-bank suburb / the old town), two crossings in its half
// (a pontoon bridge and a ford at a blown bridge, at the same places along the river), the same rearguard nests,
// and an airfield at the same spot; the pontoon bridge at Wadelincourt in the middle is shared.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, shellField, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, segDist, evenThreshold, pontoons } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SEED = 1918_11;
const noise = createNoise2D(SEED);
const HW = 16;

// ---- the Meuse, upstream (east, the American half) to downstream (west, the German half), in its loops
const MEUSE = [[660, 410], [520, 446], [430, 420], [362, 352], [330, 262], [292, 178], [212, 112], [112, 70], [20, 15],
  [-72, -42], [-162, -96], [-252, -150], [-302, -228], [-334, -318], [-392, -402], [-470, -440], [-660, -420]];
const near = (x: number, z: number) => ({ x, z });
const river = createRiver({
  paths: [MEUSE], halfWidth: HW, level: 0, depth: 2.8, valley: 76,
  crossings: [
    { name: 'Balan pontoon bridge', ...near(352, 312), kind: 'bridge', width: 8, channel: 0, pontoon: true },
    { name: 'Torcy ford (the Pont de Meuse blown)', ...near(206, 110), kind: 'ford', width: 9, channel: 0 },
    { name: 'Wadelincourt pontoon bridge', ...near(0, 3), kind: 'bridge', width: 8, channel: 0, pontoon: true },
    { name: 'Glaire ford (the bridge blown)', ...near(-206, -122), kind: 'ford', width: 9, channel: 0 },
    { name: 'Donchery pontoon bridge', ...near(-318, -276), kind: 'bridge', width: 8, channel: 0, pontoon: true },
  ],
});
const wetD = gridCache((x: number, z: number) => segDist(MEUSE, x, z), { x: 560, z: 620 }, 2);
const NATO_BANK = river.side(0, BASE_Z);
const bankOf = (x: number, z: number): 'nato' | 'pact' => (river.side(x, z) === NATO_BANK ? 'nato' : 'pact');

// ---- the points
const FRENOIS = { x: -270, z: 90 }, CHATEAU = { x: 190, z: -110 };
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points: ControlPointDef[] = [
  P('A', 'Chéhéry', 0, 470, 'centre'),
  P('B', 'Noyers', -360, 300, 'west'),
  P('C', 'Bulson', -130, 360, 'centre'),
  P('D', 'Bazeilles', 440, 190, 'east', { radius: 26 }),
  P('E', 'Frénois', FRENOIS.x, FRENOIS.z, 'west', { radius: 28 }),
  P('F', 'Wadelincourt', 0, 3, 'centre', { radius: 30 }),
  P('G', 'Château de Sedan', CHATEAU.x, CHATEAU.z, 'east', { radius: 28 }),
  P('H', 'Donchery', -460, -170, 'west', { radius: 26 }),
  P('I', 'Illy', 170, -375, 'centre'),
  P('J', 'Givonne', 350, -300, 'east'),
  P('K', 'Bouillon road', 0, -470, 'centre'),
];
const pt = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };

// ---- the heights [x, z, rx, rz, angle, h]: the Marfée, a long ridge over the left bank along the river, and the château
// spur over the right bank with the Garenne hill behind it (the same height at E and G, the same reach from the bases);
// the hills by Noyers and Illy, the Bulson rise
const HILLS = [[-210, 150, 240, 120, 0.51, 24], [225, -140, 150, 110, -0.4, 20], [90, -262, 160, 140, 0, 12], [-330, 360, 150, 130, 0.6, 14],
  [-60, 330, 170, 110, 0.2, 6], [200, -400, 150, 150, 0, 7]];
const hillAt = ([hx, hz, rx, rz, a]: number[], x: number, z: number) => {
  const dx = x - hx, dz = z - hz, c = Math.cos(a), s = Math.sin(a);
  return Math.max(0, 1 - Math.hypot((dx * c + dz * s) / rx, (-dx * s + dz * c) / rz));
};
const heightK = (x: number, z: number) => Math.max(hillAt(HILLS[0], x, z), hillAt(HILLS[1], x, z));

// each side's airfield behind its east/west flank (systems/Airfields.js: the tower 55 m off the 240 × 32 m strip), graded flat
const AIR = [{ faction: 'nato', x: 190, z: 425, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -190, z: -425, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

// ---- the roads: along each bank, over each crossing, from the bases to the points
const bankPt = (c: any, s: number) => { const p = river.at(c, 0, s * (HW + 34)); return [p.x, p.z]; };
const offsetRoad = (off: number) => {
  const out: number[][] = [];
  for (let i = 0; i < MEUSE.length; i++) {
    const a = MEUSE[Math.max(0, i - 1)], b = MEUSE[Math.min(MEUSE.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    out.push([MEUSE[i][0] - ((b[1] - a[1]) / L) * off, MEUSE[i][1] + ((b[0] - a[0]) / L) * off]);
  }
  return out;
};
const bankRoad = (f: 'nato' | 'pact') => { const r = offsetRoad(78); return bankOf(r[8][0], r[8][1]) === f ? r : offsetRoad(-78); };
const RAIL = (() => { const r = offsetRoad(44); return bankOf(r[8][0], r[8][1]) === 'pact' ? r : offsetRoad(-44); })();
const X = river.crossings;
const ROADS: number[][][] = [
  bankRoad('nato'), bankRoad('pact'),
  ...X.map((c: any) => [bankPt(c, 1), [c.x, c.z], bankPt(c, -1)]),
  [[0, 600], [0, BASE_Z], pt('C'), [-70, 250], [-40, 110], [0, 40]],          // the Bulson road down to Wadelincourt
  [[0, -600], [0, -BASE_Z], pt('I'), [70, -250], [40, -110], [0, -34]],        // the Illy road down to Sedan’s bridges
  [[-300, 600], [-320, 460], pt('B'), [-300, 200], pt('E')], [pt('C'), pt('B')],
  [[300, -600], [320, -460], pt('J'), [300, -200], pt('G')], [pt('I'), pt('J')],
  [pt('E'), [-130, 60], [-40, 110]], [pt('G'), [130, -60], [40, -110]],
  [[0, BASE_Z], [70, 370], [230, 350]], [[0, -BASE_Z], [-70, -370], [-230, -350]],
  [pt('D'), [420, 330], [470, 420], [520, 450]], [pt('H'), [-420, -330], [-470, -420], [-520, -450]],
];
// (the roads to the outer pontoon bridges run on to their bank points)
ROADS.push([[230, 350], bankPt(X[0], river.side(230, 350))], [[-230, -350], bankPt(X[4], river.side(-230, -350))]);
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 6 + fbm(noise, x * 0.003, z * 0.003, 4) * 4 + fbm(noise, x * 0.018 + 7, z * 0.018, 2) * 0.6;
  for (const H of HILLS) h += H[5] * hillAt(H, x, z) ** 1.4;
  // (the rims beyond the edges, each its own: the Ardennes rising to the north and east)
  h += z > 0 ? smoothstep(430 + 40 * Math.sin(x * 0.008), 640, z) * 11 : smoothstep(400 + 50 * Math.sin(x * 0.013 + 2), 640, -z) * 13;
  h += x > 0 ? smoothstep(460, 640, x) * (12 + 5 * Math.sin(z * 0.01)) : smoothstep(480, 640, -x) * 13;
  for (const bz of [BASE_Z, -BASE_Z]) h += (9 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  h += (8 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// ---- the woods: the Marfée and the Bois de la Garenne (same size), the Ardennes woods at each back corner, copses
const WOODS = [[-130, 205, 115], [90, -262, 115], [-400, 470, 95], [385, -478, 100]];
const wn = (x: number, z: number) => fbm(noise, x * 0.008 + 70, z * 0.008, 3);
const copseF = (x: number, z: number) => (wetD(x, z) > 60 && Math.abs(Math.abs(z) - BASE_Z) > 50 ? wn(x, z) : -9);
const T_N = 0.42, T_P = evenThreshold(copseF, T_N, (_x, z) => z > 0);
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
const woodField = gridCache((x: number, z: number) => {
  if (wetD(x, z) < HW + 10 || airD(x, z) < 18 || nearPt(x, z, 34)) return 0;
  let k = 0;
  for (const [wx, wz, r] of WOODS) k = Math.max(k, smoothstep(1.0, 0.8, Math.hypot(x - wx, z - wz) / r + fbm(noise, x * 0.015 + 3, z * 0.015, 2) * 0.25));
  if (k > 0.3) return k;
  return copseF(x, z) > (z > 0 ? T_N : T_P) ? 0.8 : 0;
}, { x: 520, z: 580 }, 4);

// ---- the rearguards: machine-gun nests at the river villages and the woods' edges (the Americans' own outposts the
// same, point-mirrored: each on its own bank)
const NESTS_PACT = [[200, -20], [-60, -72], [-170, -170], [330, -250], [120, -150]];
const NESTS = [...NESTS_PACT.map(([x, z]) => [-x, -z, 0]), ...NESTS_PACT.map(([x, z]) => [x, z, 1])];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Platoon, 165th Infantry' }];

export default {
  id: 'sedan-1918',
  name: 'Sedan 1918',
  description: 'November 1918, the race to Sedan in the last days of the war: the Meuse in its loops with every bridge blown, Sedan’s old town and château fort on the far bank, the wooded Marfée heights, Frénois and Wadelincourt on the near bank, German rearguard machine guns in the villages and woods.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['aef', 'fr'], pact: ['de'] }, // (the 42nd and 1st Divisions and the French Fourth Army against the retreating German Third Army; aef has no units yet: fr fights for it)
  sides: { nato: 'United States', pact: 'Germany' },
  conditions: { time: 'day', weather: 'overcast' }, // (cold, wet November days, the cloud low over the Ardennes)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 76, weights: [0.35, 0.3, 0.1, 0.25] as any }),
  woods: (x: number, z: number) => woodField(x, z) * 0.85,

  theme: {
    // a raw grey November day, the mist hanging in the Meuse valley
    fogColor: 0x9c9e9a, fogDensity: 0.0016, skyTop: 0x66707a, skyHorizon: 0xb0b2aa, skyBottom: 0x686862,
    sunColor: 0xe4dac6, sunIntensity: 1.4, sunDisk: 0.08, clouds: 0.85, cloudLight: 0xc2c4c0, cloudDark: 0x6a7076,
    sunDir: [0.4, 0.4, -0.6], hemiSky: 0xbcc2c6, hemiGround: 0x4c4636, hemiIntensity: 1.3, rimColor: 0xbcc4cc, rimIntensity: 0.25,
    terrain: {
      grass: '#56603a', grassAlt: '#4c5634', dryGrass: '#857a50', dirt: '#5e5040', rock: '#8c887a', strip: '#4c3f30',
      pasture: '#56603a', ploughed: '#6c5e4c', stubble: '#968656', meadow: '#5e683c',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-300, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        const w = wetD(x, z);
        if (w > HW + 2) {
          const rd = roadD(x, z);
          if (rd < 3.2) return [0x8a8068, 0.85];                                    // the muddy roads
          if (rd < 5) return [0x7a7058, 0.3];
        }
        if (y < 1.8 && w < HW + 40) return [0x4e5a34, 0.7];                          // wet meadow along the river
        if (woodField(x, z) > 0.5) return [0x4a4430, 0.55];                          // leaf litter under the woods
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug, Infanterie-Regiment 47' })),
  },

  /** The rearguard nests, a scatter of shell holes on the heights and at the river, a few houses knocked about. */
  battlefield(game: any) {
    const dens = (x: number, z: number) => (wetD(x, z) < HW + 12 || roadD(x, z) < 6 ? 0 : 0.1 + heightK(x, z) * 0.5 + (1 - smoothstep(0, 140, Math.abs(z))) * 0.35);
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)];
    const ruins = game.buildings.list.filter((b: any) => mulberry32(b.index * 7 + SEED)() < (Math.abs(b.z) < 200 ? 0.25 : 0.08)).map((b: any) => b.index);
    const works = NESTS.map(([x, z, p]) => ({ kind: 'mgNest', x, z, yaw: p ? 0 : Math.PI, faction: p ? 'pact' : 'nato' }));
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => nearPt(x, z, r);
    const nearNest = (x: number, z: number, r: number) => NESTS.some(([nx, nz]) => Math.hypot(nx - x, nz - z) < r);
    const nearRail = (x: number, z: number, r: number) => segDist(RAIL, x, z) < r;
    const skip = (x: number, z: number) => wetD(x, z) < HW + 22 || roadD(x, z) < 8 || airD(x, z) < 25 || nearNest(x, z, 10) || nearRail(x, z, 7);
    const stone = 0x9a927e;

    // the villages (Frénois and Sedan have their quarters below)
    for (const id of ['A', 'B', 'C', 'D', 'F', 'H', 'I', 'J']) {
      const p = points.find((q) => q.id === id)!, big = id === 'D' || id === 'H' || id === 'F';
      farmVillage(props, p.x, p.z, big ? 9 : 7, SEED * 10 + Math.round(p.x * 3 + p.z * 7), skip, big ? 1.3 : 1.1);
    }
    props.rand = mulberry32(SEED + 1);
    for (const [x, z, yaw] of [[-80, 410, 0.2], [170, -410, Math.PI + 0.2], [-390, 315, 0.4], [330, -370, Math.PI + 0.4], [470, 160, 1.2], [-430, -300, 1.2 + Math.PI]]) {
      if (!skip(x, z)) props.church({ x, z, yaw });
    }

    // the town quarters by the river, house for house the same: Sedan’s old town under the château, Frénois under the
    // Marfée (point-mirrored, each on its own bank)
    for (const m of [1, -1]) {
      props.rand = mulberry32(SEED + 2);
      for (let lz = -60; lz <= 110; lz += 13) for (let lx = 60; lx <= 340; lx += 14) {
        const r1 = props.rand(), r2 = props.rand(), r3 = props.rand(), r4 = props.rand(), r5 = props.rand();
        const x = (lx + (r1 - 0.5) * 4) * m, z = (lz + (r2 - 0.5) * 4) * m;
        if (Math.hypot(x - 170 * m, z - 20 * m) > 125 || r3 < 0.18) continue;
        if (skip(x, z) || nearPoint(x, z, 42) || bankOf(x, z) !== (m > 0 ? 'pact' : 'nato')) continue;
        props.townHouse({ x, z, yaw: Math.PI / 2 * (r4 < 0.5 ? 1 : -1) + (m < 0 ? Math.PI : 0), width: 7 + r5 * 3, depth: 8, storeys: r5 < 0.6 ? 2 : 1, name: 'house', damaged: 0.15 });
      }
    }
    props.rand = mulberry32(SEED + 3);
    props.church({ x: 150, z: 60, yaw: 0.4 });            // Saint-Charles in Sedan
    props.church({ x: -150, z: -60, yaw: 0.4 + Math.PI }); // Frénois’ church

    // the walled châteaux on the two heights: Sedan’s fort (the great bastioned castle, here its curtain walls round the
    // spur) and the Château de Bellevue’s house and park walls under the Marfée — the same walls, a gate in each side
    for (const [c, m] of [[CHATEAU, 1], [FRENOIS, -1]] as const) {
      const R = 36;
      for (let s = 0; s < 4; s++) {
        const a = (s * Math.PI) / 2 + 0.3;
        for (const off of [-1, 1]) {
          const lx = Math.cos(a) * R - Math.sin(a) * off * 13, lz = Math.sin(a) * R + Math.cos(a) * off * 13;
          props.lowWall({ x: c.x + lx * m, z: c.z + lz * m, yaw: -a + Math.PI / 2, length: 18, height: m > 0 ? 3.2 : 2.4, color: stone });
        }
        const [cx, cz] = [Math.cos(a + Math.PI / 4) * R * 1.41, Math.sin(a + Math.PI / 4) * R * 1.41];
        props.column({ x: c.x + cx * m, z: c.z + cz * m, radius: 2.6, height: m > 0 ? 5 : 3.5 });   // corner towers / park pavilions
      }
      props.hall({ x: c.x + 14 * m, z: c.z + 14 * m, yaw: 0.3, width: 16, depth: 10, height: 8, color: 0x8a8272, roof: 0x3e4044, door: 3, name: m > 0 ? 'castle keep' : 'château' });
    }

    // the blown stone bridges: the abutments on both banks, a pier stump and the fallen arches in the water beside each ford
    props.rand = mulberry32(SEED + 4);
    for (const c of X.filter((q: any) => q.kind === 'ford')) {
      const yaw = river.yawOf(c), u = 17;
      for (const v of [-(HW + 3), HW + 3]) {
        const p = river.at(c, u, v);
        props.box('stone', p.x, terrain.heightAt(p.x, p.z) + 1.2, p.z, 7.5, 3.4, 4, yaw, 0x8a857a);
      }
      const pier = river.at(c, u, 1.5);
      props.box('stone', pier.x, -0.6, pier.z, 6.5, 2.6, 3, yaw, 0x7e796e);
      for (let i = 0; i < 3; i++) {
        const p = river.at(c, u + (props.rand() - 0.5) * 2, (i - 1) * 9);
        props.box('stone', p.x, -0.35 + props.rand() * 0.4, p.z, 6.5, 0.8, 8, yaw + (props.rand() - 0.5) * 0.4, 0x8a857a, (props.rand() - 0.5) * 0.7, (props.rand() - 0.5) * 0.5);
      }
    }

    // the railway along the right bank: rails, Sedan station, goods wagons left behind (Sedan’s and Bazeilles’ sidings)
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let t = 0; t < L; t += 20) {
        const t1 = Math.min(L, t + 20), x0 = ax + (bx - ax) * t / L, z0 = az + (bz - az) * t / L, x1 = ax + (bx - ax) * t1 / L, z1 = az + (bz - az) * t1 / L;
        if (Math.abs(x0) > 520 || Math.abs(z0) > 580) continue;
        if (X.some((c: any) => Math.hypot(c.x - x0, c.z - z0) < 40 && roadD(x0, z0) < 4)) continue;
        props.rails({ x0, z0, x1, z1 });
      }
    }
    const railAt = (k: number, f: number) => { const [ax, az] = RAIL[k], [bx, bz] = RAIL[k + 1]; return { x: ax + (bx - ax) * f, z: az + (bz - az) * f, yaw: Math.atan2(bx - ax, bz - az) }; };
    { const s = railAt(6, 0.5), n = { x: Math.cos(s.yaw), z: -Math.sin(s.yaw) }, side = bankOf(s.x + n.x * 14, s.z + n.z * 14) === 'pact' ? 1 : -1;
      props.hall({ x: s.x + n.x * 14 * side, z: s.z + n.z * 14 * side, yaw: s.yaw + Math.PI / 2, width: 22, depth: 9, height: 7, color: 0x9a8a72, roof: 0x3e4044, door: 4, name: 'Sedan station' }); }
    for (const [k, f, kind] of [[6, 0.15, 'box'], [6, 0.85, 'box'], [3, 0.3, 'box'], [3, 0.7, 'open']] as [number, number, string][]) {
      const w = railAt(k, f);
      props.wagon({ x: w.x, z: w.z, yaw: w.yaw, kind, color: 0x5a3426 });
    }

    // farmsteads, field walls and hay over the open country (each half its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
    for (let tries = 0, n = 0; n < 90 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 25), z = (n % 2 ? -1 : 1) * (40 + rand() * (bounds.z - 80));
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || skip(x, z) || woodField(x, z) > 0.3) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    // the pioneers' bridging timber and boats drawn up by each pontoon bridge
    props.rand = mulberry32(SEED + 5);
    for (const c of X.filter((q: any) => q.pontoon)) for (const s of [-1, 1]) {
      const p = river.at(c, 16, s * (HW + 12));
      props.logPile({ x: p.x, z: p.z, yaw: river.yawOf(c) + Math.PI / 2, length: 6 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);
    for (const c of X) if (c.pontoon && c.mesh) c.mesh.rotation.y = river.yawOf(c);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...NESTS.map(([x, z]) => ({ x, z, r: 6 })), { test: (x: number, z: number) => wetD(x, z) < HW + 6 || roadD(x, z) < 4.5 || airD(x, z) < 12 || nearRail(x, z, 4) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 6500, hedges: 2400, autumn: 0.6, broadleaf: 0.85,
      noHedge: (x: number, z: number) => wetD(x, z) < 40 || woodField(x, z) > 0.3,
      forest: (x: number, z: number) => {
        if (wetD(x, z) < HW + 4) return -1;
        const k = woodField(x, z);
        if (k > 0.2) return k;
        return wetD(x, z) < 34 ? 0.12 : 0;                                         // (willows and poplars along the bank)
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
