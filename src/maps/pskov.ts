// Pskov, 24 February 1918: Operation Faustschlag. The Brest-Litovsk talks broke down, the armistice ran out on the 18th,
// and the German Eighth Army walked into a Russia whose old army had gone home: Pskov fell almost without a shot, its
// garrison and the commissars gone up the Petrograd line in the night. North of the town the Germans met the first
// Red Guard detachments and Latvian riflemen sent down from Petrograd — the skirmishes later kept as the birthday of the
// Red Army, 23 February. Late winter: snow on the fields, the rivers frozen hard enough for men on the marked ice
// roads, the Pskov Krom — the Kremlin's white walls and towers on its rock where the Pskova runs into the Velikaya, the
// Trinity Cathedral's gold dome over it — wooden suburbs with onion-domed churches, the Snetogorsky and Mirozhsky
// monasteries downriver and across it, the railway station and the Riga line's bridge, birch woods, and only the
// scrapes and rifle pits a few days' war allows: no deep trench system, the war was mobile again.
// On the map (1.0 × 1.12 km, flat as Pskov is) the Reds come down the Petrograd road (+z), the Germans up the Ostrov
// road (−z). The Velikaya runs north down the west of the field in its low limestone banks, bending past the town,
// and opens into the frozen shore of Lake Pskov in the north-west corner; the little Pskova comes in from the east
// across the middle and joins it under the Krom, which stands on the rock tongue between the two. Across the Velikaya
// the Zavelichye bank with the Mirozhsky monastery; north of the Pskova the Zapskovye quarter; south of the Krom the
// Okolny Gorod; the Riga line crosses the Velikaya in the south and runs up the east of the field to Petrograd.
// Not mirrored but fair: the points are at matching reaches from the two bases (tools/map_fairness.py); the Pskova
// splits the east half between the sides, so each has its own bank of it, and the Velikaya's far bank is as far from
// either; the Krom, reached by land from the Okolny Gorod, is answered by Zapskovye, reached by land from the north,
// with the Krom bridge between them. The lake shore and its monastery behind the Reds are traded for the Mirozhsky
// monastery across the river and the town before the Germans; woods of the same area on each half.
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
const HW = 22;                                              // the Velikaya, frozen
const noise = createNoise2D(1918_02);
const EXT = { x: 640, z: 700 };

// ---- the Velikaya north down the west side into the lake; the Pskova in from the east to the Krom
const VELIKAYA = [[-90, -700], [-140, -470], [-225, -330], [-205, -180], [-160, -60], [-172, 40], [-232, 170], [-236, 280], [-290, 360, 50], [-370, 430, 115], [-470, 520, 175], [-640, 680, 250]];
const PSKOVA = [[700, 30, 9], [470, 10, 9], [330, -20, 9], [190, 20, 9], [70, 45, 10], [-60, 42, 11], [-160, 30, 14]];
const river = createRiver({
  paths: [VELIKAYA, PSKOVA], halfWidth: HW, level: 0, depth: 2.2, valley: 52,
  crossings: [
    // (the ice roads: marked tracks over the frozen river, the bed shallow under them)
    { name: 'Snetogorsk ice road', x: -232, z: 230, kind: 'ford', width: 24, channel: 0 },
    { name: 'Olginsky bridge', x: -166, z: -15, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Mirozh ice road', x: -190, z: -140, kind: 'ford', width: 24, channel: 0 },
    { name: 'Riga railway bridge', x: -215, z: -300, kind: 'bridge', width: 13, channel: 0 },
    { name: 'Krom bridge', x: -60, z: 42, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Pskova ice road', x: 130, z: 32, kind: 'ford', width: 20, channel: 1 },
    { name: 'Petrograd railway bridge', x: 300, z: -14, kind: 'bridge', width: 13, channel: 1 },
    { name: 'Lopatino ice road', x: 470, z: 10, kind: 'ford', width: 20, channel: 1 },
  ],
});
/** m from a channel's bank (negative on the ice): the course, its half-width carried along. */
const edgeD = (poly: number[][], x: number, z: number) => {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az, aw = HW] = poly[i], [bx, bz, bw = HW] = poly[i + 1];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t) - (aw + (bw - aw) * t));
  }
  return best;
};
const velD = gridCacheSmooth((x: number, z: number) => edgeD(VELIKAYA, x, z), EXT, 4);
const pskD = gridCacheSmooth((x: number, z: number) => edgeD(PSKOVA, x, z), EXT, 4);
/** m from the nearer bank. */
const bankD = (x: number, z: number) => Math.min(velD(x, z), pskD(x, z));
/** The lake: the Velikaya's mouth in the north-west corner. */
const lakeK = (x: number, z: number) => smoothstep(400, 270, Math.hypot(x + 500, z - 560));

// ---- the Krom on its rock tongue between the rivers, its wall a blunt triangle with the point (the Persi) at the confluence
// each side's airfield on the flat fields east of its road (strip along x, the tower 55 m off it), graded flat
const AIR = [{ faction: 'nato', x: 170, z: 430, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 170, z: -430, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));
const KROM = { x: -112, z: -10 };
const WALL = [[-150, 18], [-82, 24], [-58, -12], [-78, -46], [-140, -50]].map(([x, z]) => [x, z]);
const inKrom = (x: number, z: number, r = 0) => x > -150 - r && x < -58 + r && z > -50 - r && z < 24 + r;

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Petrograd road', 0, 440, 'centre'),
  P('B', 'Snetogorsky Monastery', -140, 235, 'west'),
  P('C', 'Zapskovye', -40, 112, 'centre', { radius: 28 }),
  P('D', 'Lopatino halt', 320, 205, 'east'),
  P('E', 'Zavelichye', -300, 5, 'west', { radius: 26 }),
  P('F', 'Pskov Krom', KROM.x, KROM.z, 'centre', { radius: 30 }),
  P('G', 'Pskova mill', 390, 42, 'east'),
  P('H', 'Mirozhsky Monastery', -300, -195, 'west'),
  P('I', 'Okolny Gorod', 60, -140, 'centre', { radius: 28 }),
  P('J', 'Pskov station', 300, -255, 'east'),
  P('K', 'Ostrov road', 0, -440, 'centre'),
] as any[];

const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 6.5 + fbm(noise, x * 0.0035 + (z > 0 ? 0 : 40), z * 0.0035, 4) * 2.2 + fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 0.6;
  h += 4 * smoothstep(-100, 500, x);                                                          // (the land rising gently east)
  // the low limestone banks: a short steep step down to the ice
  const v = velD(x, z), p = pskD(x, z);
  h = 1.2 + (h - 1.2) * smoothstep(6, 34, v) * smoothstep(4, 26, p);
  // the lake shore: flat, sedge and sand under the snow
  h += (1.3 - h) * lakeK(x, z) * (1 - smoothstep(20, 90, v));
  // the Krom's rock, falling sheer to both rivers
  h += 4.5 * smoothstep(70, 30, Math.hypot((x - KROM.x) * 0.8, z - KROM.z)) * smoothstep(2, 14, Math.min(v, p));
  for (const pt of points) if (pt.id !== 'F') h += (h * 0.6 + 3.2 - h) * smoothstep(40, 18, Math.hypot(x - pt.x, z - pt.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(32, 16, Math.hypot(x, z - bz));
  h += (8 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, EXT, 4);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// ---- roads and the railway
const ROADS = [
  [[0, 640], [0, 440], [-20, 300], [-40, 112], [-60, 42], [-100, 0], [-30, -90], [60, -140], [20, -300], [0, -440], [0, -640]],    // Petrograd road – Krom – Ostrov road
  [[-140, 235], [-232, 230], [-310, 160], [-300, 5], [-300, -195], [-215, -300]],                                                // the Zavelichye bank road
  [[-640, 5], [-300, 5], [-166, -15], [-112, -10]],                                                                              // over the Olginsky bridge
  [[-20, 300], [-140, 235]], [[-30, 300], [320, 205], [640, 220]], [[20, -300], [300, -255], [640, -270]],                     // the lateral roads
  [[-40, 112], [130, 32], [190, -60], [60, -140]], [[320, 205], [390, 42], [470, 10], [500, -100]],                              // over the Pskova
  [[-300, -195], [-190, -140], [-80, -110], [60, -140]],                                                                         // the Mirozh ice road
];
const roadD = gridCacheSmooth((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
const RAIL = [[-640, -380], [-215, -300], [80, -270], [300, -230], [305, -100], [300, -14], [305, 200], [330, 400], [360, 640]];
const railD = gridCacheSmooth((x: number, z: number) => segDist(RAIL, x, z), { x: 520, z: 580 }, 2);
/** The hasty positions: a line of scrapes and rifle pits each side, dug into the snow a few days before. */
const trenchZ = (x: number, north: boolean) => (north ? 205 + 9 * Math.sin(x * 0.017) - 30 * smoothstep(0, 300, x) : -205 - 10 * Math.sin(x * 0.013 + 2) + 20 * smoothstep(0, 300, x));

/** The monasteries: walled, each with its onion-domed church. */
const MONASTERIES = [{ x: points[1].x + 40, z: points[1].z + 26 }, { x: points[7].x - 42, z: points[7].z - 20 }];
const CHURCHES = [{ x: points[2].x + 34, z: points[2].z + 28 }, { x: points[8].x + 40, z: points[8].z - 26 },
  { x: points[4].x - 30, z: points[4].z + 34 }, { x: points[6].x - 34, z: points[6].z + 30 }];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'pskov',
  name: 'Pskov',
  description: 'February 1918, Operation Faustschlag: the German Eighth Army takes Pskov almost unopposed and meets the first Red Guard detachments north of the town. Snow on the flat fields, the Velikaya frozen in its low limestone banks and opening into the lake shore, the Pskova joining it under the white Krom and the Trinity Cathedral, wooden suburbs, monasteries and the railway, scrapes dug in the snow.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de'] }, // (the Red Guards and Latvian riflemen fight as the Russian army; the German Eighth Army)
  sides: { nato: 'Russia', pact: 'Germany' },
  climate: 'winter',   // whitewash and snow smocks (render/paint.js CLIMATE)
  conditions: { time: 'day', weather: 'overcast' }, // (grey late-February days, the snow still lying)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1918_02,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: 191802, cell: 80, weights: [0.3, 0.35, 0.1, 0.25] as any }),

  theme: {
    // low grey cloud over the snow
    fogColor: 0xc0c4c8, fogDensity: 0.0018, skyTop: 0x868c94, skyHorizon: 0xc8ccd0, skyBottom: 0x8a8e92,
    sunColor: 0xe2e6ec, sunIntensity: 1.25, sunDisk: 0.04, clouds: 0.95, cloudLight: 0xcaced2, cloudDark: 0x82888e,
    sunDir: [0.4, 0.4, 0.7], hemiSky: 0xd2d8e0, hemiGround: 0x8c9096, hemiIntensity: 1.45, rimColor: 0xc0c8d2, rimIntensity: 0.2,
    terrain: {
      grass: '#eceeee', grassAlt: '#e0e4e6', dryGrass: '#d6d4cc', dirt: '#9a948a', rock: '#b6b8b6', strip: '#8a847a',
      pasture: '#e8ebeb', ploughed: '#d0cec6', stubble: '#dcd8ce', meadow: '#f0f2f2',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-140, 0, 320], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x8e8a82, 0.85];                                     // the roads: snow trodden to slush
        if (railD(x, z) < 2.5) return [0x6e6a64, 0.7];                                   // the railway's cinder bed
        if (y < 1.6 && bankD(x, z) < 10) return [0xd6dde2, 0.8];                        // snow drifted on the frozen banks
        if (bankD(x, z) < 34 && bankD(x, z) > 4 && y > 2.5) return [0xb4b4ae, 0.35];     // (the grey limestone of the banks)
        if (inKrom(x, z, -2)) return [0xc8c4bc, 0.5];                                   // the Krom's trodden yard
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-140, 0, 320] }, pact: { x: 0, z: -BASE_Z, entries: [-200, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 370 }, pact: { x: 0, z: -370 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side's hasty line: stretches of scrapes and rifle pits with gaps between, a little wire, an MG at each road. No shelling to speak of. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 30 })) {
        if (roadD(w.x, w.z) < 8 || railD(w.x, w.z) < 6 || bankD(w.x, w.z) < 12 || airD(w.x, w.z) < 10) continue;
        const stretch = Math.sin(w.x * s * 0.045) > -0.1;                              // (dug in stretches, the same share each side)
        if (!stretch || (w.kind === 'wire' && Math.sin(w.x * s * 0.11) < 0.3)) continue; // (a little wire, not belts)
        works.push(w);
      }
      for (const bx of [-20, 300]) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => bankD(x, z) < 6 + r;
    const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > 0)) < 26;
    const holy = [...MONASTERIES.map((m) => ({ ...m, r: 34 })), ...CHURCHES.map((c) => ({ ...c, r: 20 }))];
    const skip = (x: number, z: number) => airD(x, z) < 25 || wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z) || railD(x, z) < 9 || inKrom(x, z, 10)
      || holy.some((c) => Math.hypot(c.x - x, c.z - z) < c.r);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const WHITE = 0xe6e2d8, GOLD = 0xc8a850, SHINGLE = 0x4e4034;
    /** An onion dome on a drum at (x, y, z): `r` its radius. */
    const onion = (x: number, y: number, z: number, r: number, color: number) => {
      m4.compose(v.set(x, y, z), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r * 0.75, r * 0.75, r * 1.6, 12), m4, WHITE);
      m4.compose(v.set(x, y + r * 1.6, z), q.identity(), v.clone().set(r, r * 1.2, r)); props.push('plain', new THREE.SphereGeometry(1, 12, 8), m4, color);
      m4.compose(v.set(x, y + r * 3, z), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r * 0.38, r * 1.2, 8), m4, color);
      props.box('metal', x, y + r * 3.9, z, 0.15, 1.6, 0.15, 0, GOLD);
      props.box('metal', x, y + r * 4.1, z, 0.9, 0.12, 0.12, 0, GOLD);
    };
    /** A whitewashed Orthodox church: the town church's nave and belfry, an onion dome over the nave. */
    const orthodox = (x: number, z: number, yaw: number, dome: number) => {
      props.church({ x, z, yaw });
      onion(x, terrain.heightAt(x, z) + 10, z, 2.2, dome);
    };

    // ---- the Pskov Krom: the white wall on its rock, round towers with shingle roofs, gates to the Krom bridge and the town
    props.rand = mulberry32(1510);
    for (let i = 0; i < WALL.length; i++) {
      const [x0, z0] = WALL[i], [x1, z1] = WALL[(i + 1) % WALL.length];
      const L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(z0 - z1, x1 - x0);
      for (let t = 0; t < L; t += 4) {
        const x = x0 + (x1 - x0) * (t + 2) / L, z = z0 + (z1 - z0) * (t + 2) / L;
        if (Math.hypot(x + 72, z - 10) < 7 || Math.hypot(x + 68, z + 30) < 7) continue;   // (the gates: to the Krom bridge, to the town)
        const g = terrain.heightAt(x, z), hh = 6.5;
        props.box('plaster', x, g + hh / 2 - 0.4, z, 4.1, hh + 0.8, 1.8, yaw, WHITE);
        props.box('plaster', x, g + hh + 0.5, z, 4.1, 0.9, 0.6, yaw, 0xdcd8ce);           // the parapet
        cover.addBox({ x, z, yaw, length: 4.1, thickness: 1.8, height: hh });
      }
    }
    for (const [tx, tz, r, hh] of WALL.map(([x, z]) => [x, z, 4.2, 11])) {
      const g = terrain.heightAt(tx, tz);
      m4.compose(v.set(tx, g + hh / 2 - 0.5, tz), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r, r * 1.08, hh + 1, 14), m4, WHITE);
      m4.compose(v.set(tx, g + hh + 1.9, tz), q.identity(), one); props.push('plain', new THREE.ConeGeometry(r * 1.2, 5, 14), m4, SHINGLE);
      cover.addCylinder({ x: tx, z: tz, radius: r, height: hh, spots: false });
    }
    // the Trinity Cathedral: a white cube of a church, its gold dome on a tall drum, the belfry beside it
    {
      const x = KROM.x - 12, z = KROM.z - 18, yaw = 0;
      const b = props.beginBuilding('Trinity Cathedral', x, z, yaw, 18, 14);
      b.plaster = WHITE;
      props.shell(b, { height: 11, key: 'plaster', color: WHITE, front: [0], left: [3], t: 0.8, bay: 3.4, sill: 2.2, head: 7.5, frame: 0xb8b0a0 });
      props.gableRoof(b, { eave: 11, pitch: 0.5, color: 0x5a6a64, t: 0.8 });
      props.endBuilding();
      const g = b.ground;
      onion(x, g + 15, z, 3.6, GOLD);
      for (const [dx, dz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) onion(x + dx, g + 13, z + dz, 1.5, GOLD);
      const bx = KROM.x - 26, bz = KROM.z + 12, bg = terrain.heightAt(bx, bz);
      props.box('plaster', bx, bg + 9, bz, 5, 18, 5, 0, WHITE);
      props.box('metal', bx, bg + 14.5, bz, 5.1, 1.6, 1, 0, 0x2a2622);
      onion(bx, bg + 18, bz, 1.6, GOLD);
      cover.addBox({ x: bx, z: bz, yaw: 0, length: 5, thickness: 5, height: 18 });
    }
    // the Krom's yard: the old prikaz chambers, a log store, sledges' firewood
    props.rand = mulberry32(1918);
    props.townHouse({ x: KROM.x + 22, z: KROM.z + 18, yaw: 0, width: 12, depth: 8, storeys: 2, damaged: 0 });
    props.logPile({ x: KROM.x + 26, z: KROM.z - 22, yaw: 0.4, length: 7 });
    props.crates({ x: KROM.x - 4, z: KROM.z + 20, yaw: 0.2 });

    // ---- the monasteries: Snetogorsky on the lake shore downriver, Mirozhsky across the Velikaya, each walled in white
    MONASTERIES.forEach((m, i) => {
      props.rand = mulberry32(1300 + i);
      orthodox(m.x, m.z, i ? 0 : Math.PI, i ? GOLD : 0x3e6a8a);
      for (const [dx, dz, yaw, L] of [[0, 26, 0, 52], [0, -26, 0, 52], [26, 0, Math.PI / 2, 52], [-26, 0, Math.PI / 2, 52]]) {
        for (let t = -L / 2 + 2; t < L / 2; t += 4) {
          const x = m.x + dx + (yaw ? 0 : t), z = m.z + dz + (yaw ? t : 0);
          if (Math.abs(t) < 4 && Math.abs(dz) > 0) continue;                         // (the holy gates)
          if (wet(x, z, 2)) continue;
          props.lowWall({ x, z, yaw, length: 4.1, height: 2.6, color: WHITE });
        }
      }
      props.house({ x: m.x + 14, z: m.z + (i ? -15 : 15), yaw: 0, width: 9, depth: 6 });
    });

    // ---- the parish churches with their onion domes, the suburbs of log houses round them; the Okolny Gorod's stone houses
    CHURCHES.forEach((c, i) => orthodox(c.x, c.z, i % 2 ? 0 : Math.PI, [0x3e6a8a, 0x4a7a5c, 0x4a7a5c, 0x3e6a8a][i]));
    for (const [p, n, seed] of [[points[2], 22, 1], [points[8], 26, 2], [points[4], 14, 3], [points[6], 8, 4]] as const) {
      props.rand = mulberry32(1918_0 + seed);
      for (let i = 0, k = 0; k < n && i < 500; i++) {
        const a = props.rand() * Math.PI * 2, d = 20 + props.rand() * 62, x = p.x + Math.cos(a) * d * 1.3, z = p.z + Math.sin(a) * d * 0.9;
        if (skip(x, z) || Math.hypot(x - p.x, z - p.z) < 14) continue;
        if (p === points[8] && props.rand() < 0.5) props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 8 + props.rand() * 2, depth: 8, storeys: 2, damaged: 0 });
        else props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 2, depth: 6 });
        k++;
      }
    }
    // the farms round the halts and the monasteries
    for (const p of points) {
      if (!'BHDJG'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, 5, 1918 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.15);
    }
    // Pskov station in the south-east, Lopatino halt on the Petrograd line in the north-east: the station building, goods wagons
    for (const s of [points[9], points[3]]) {
      const south = s.z < 0;
      props.hall({ x: s.x - 26, z: s.z + 6, yaw: Math.PI / 2, width: south ? 30 : 20, depth: 9, height: 6, color: south ? 0x8a6a50 : 0x7a6a58, name: 'railway station' });
      props.wagon({ x: 304, z: s.z + (south ? 60 : -40), yaw: 0, kind: 'box' });
      props.wagon({ x: 304, z: s.z + (south ? 72 : -52), yaw: 0, kind: 'box', color: 0x4e3a2a });
    }
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let t = 0; t < L; t += 20) {
        const t1 = Math.min(L, t + 20), x0 = ax + (bx - ax) * t / L, z0 = az + (bz - az) * t / L, x1 = ax + (bx - ax) * t1 / L, z1 = az + (bz - az) * t1 / L;
        if (Math.abs(x0) > 520 || Math.abs(z0) > 580 || (bankD(x0, z0) < 2 && !river.bridgeAt(x0, z0)) || (bankD(x1, z1) < 2 && !river.bridgeAt(x1, z1))) continue;
        props.rails({ x0, z0, x1, z1 });
      }
    }
    // sledges' firewood, hay ricks and fences over each side's fields
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 100 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x - KROM.x, z - KROM.z) < 150 || lakeK(x, z) > 0.5 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    for (const s of [1, -1]) for (const bx of [-60, 140, 420]) {
      props.rand = mulberry32(1949 + s * 7 + bx);
      const x = bx * s, z = trenchZ(x, s > 0) + 26 * s;
      if (!skip(x, z)) props.logPile({ x, z, yaw: props.rand() * 0.6, length: 6 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    // the rivers and the lake frozen over: the water sheet becomes ice under snow
    for (const o of scene.children) {
      const mat = (o as any).material;
      if (mat?.userData?.waterSurface && !mat.userData.ice) {
        Object.assign(mat, { transparent: false, opacity: 1, roughness: 0.55, metalness: 0.05 });
        mat.color.set(0xcfd9df);
        mat.userData.ice = true;
      }
    }

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      ...river.crossings.map((c: any) => ({ x: c.x, z: c.z, r: 30 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || airD(x, z) < 12 || railD(x, z) < 5 || inKrom(x, z, 6) || holy.some((c) => Math.hypot(c.x - x, c.z - z) < c.r * 0.8) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const tN = 0.15, tP = evenThreshold(wood, tN, (_x, z) => z > 0);   // (birch woods, the same area each side)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3000, hedges: 900, autumn: 1, broadleaf: 0.55,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z)) return 0.03;
        if (lakeK(x, z) > 0.6) return 0.3;                                    // reeds and willow scrub on the lake shore
        if (bankD(x, z) < 30) return 0.2;                                     // willows along the banks
        if ([points[2], points[8], points[4]].some((p) => Math.hypot(x - p.x, z - p.z) < 90) || Math.hypot(x - KROM.x, z - KROM.z) < 90) return 0.05; // (the town)
        return wood(x, z) > (z > 0 ? tN : tP) ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
