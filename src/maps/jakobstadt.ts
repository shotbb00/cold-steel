// Jakobstadt, 21–22 September 1917: three weeks after Riga, Hutier's Eighth Army turns up the Düna (Daugava) to clear
// the last Russian foothold on its left bank — the old fortified bridgehead round Jakobstadt (Jēkabpils), held since
// 1915 by the Russian Twelfth Army with Latvian Riflemen in its line. After a short Bruchmüller bombardment the German
// infantry broke into the bridgehead; the Russians fell back over the river to Kreuzburg (Krustpils) on the right bank
// and the Daugava was the front again. The ground: the broad slow Daugava between the two towns facing each other
// across it — Jakobstadt's market and the old bridgehead redoubt on the south bank, Kreuzburg's castle and the station
// of the Riga–Dünaburg railway on the north — the road bridge blown in the middle of the river, a raft ferry beside it;
// sandy pine forest, bogs and small lakes, Latvian farmsteads with log barns, two trench lines with wire on each bank.
// Not mirrored but fair: the Daugava runs between the two sides in an S, each bank reaching into the other's in one
// loop with a point in it (Sala in the western loop on the north bank, Dignāja in the eastern on the south); the ferry
// between the towns in the middle and a pontoon bridge on each flank, the blown bridge crossing nothing; each side two
// trench lines at the same depth from the water, two lakes of the same sizes and its own bogs and pine woods of the
// same area, one low sandy rise of the same height at the same reach, and an old work by the ferry (Kreuzburg castle
// on the north bank, the bridgehead redoubt on the south). The railway is the north bank's look only, no terrain.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { createLakes } from '../world/Lakes.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { pontoons, farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 26;                                              // the Daugava: broad and slow
const BLOWN_X = 105;                                        // the blown road bridge (no crossing)
const noise = createNoise2D(1917_21);
const mid = (x: number) => 60 * Math.sin(x * 0.0085 + 0.05) + 8 * Math.sin(x * 0.019 + 2);   // (the S between the towns)
const river = createRiver({
  path: mid, halfWidth: HW, level: 0, depth: 3.4, valley: 85,
  crossings: [
    { name: 'Sala pontoon bridge', x: -SIDE_X, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Jakobstadt ferry', x: 0, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Dignāja pontoon bridge', x: SIDE_X, kind: 'bridge', width: 6, pontoon: true },
  ],
});
const away = (x: number, z: number) => Math.abs(z - mid(x));
/** Each side's road behind its front (north: the Kreuzburg–Kokenhusen road, south: the Jakobstadt–Friedrichstadt road), the roads from the crossings to the bases. */
const bankZ = (x: number, north: boolean) => (north ? mid(x) * 0.4 + 168 + 8 * Math.sin(x * 0.01) : mid(x) * 0.4 - 166 + 10 * Math.sin(x * 0.007 + 2));
const roadD = (x: number, z: number) => {
  let d = Math.abs(z - bankZ(x, z > mid(x)));
  for (const bx of [-SIDE_X, 0, SIDE_X]) d = Math.min(d, Math.abs(x - bx));
  return d;
};
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The Riga–Dünaburg railway behind Kreuzburg. */
const RAIL = [[-520, 318], [-150, 302], [100, 294], [520, 312]];
const railD = (x: number, z: number) => segDist(RAIL, x, z);
/** The two trench lines of each side: the first line and the support line, each its own wander. */
const trenchZ = (x: number, north: boolean, line: number) => {
  const m = mid(x) * (line ? 0.55 : 0.8);
  return north ? m + (line ? 232 : 108) + 9 * Math.sin(x * 0.017 + line) : m - (line ? 230 : 110) - 10 * Math.sin(x * 0.013 + 2 + line);
};

// two small lakes a side, the same sizes: the Kreuzburg lakes in the north woods, the forest lakes toward Zasa in the south
const lakes = createLakes({ lakes: [
  { x: -185, z: 415, rx: 40, rz: 26, rot: 0.3, depth: 3.5, seed: 1 },
  { x: 435, z: 245, rx: 26, rz: 40, rot: 0.2, depth: 3, seed: 2 },
  { x: 195, z: -415, rx: 40, rz: 26, rot: -0.4, depth: 3.5, seed: 3 },
  { x: -440, z: -215, rx: 26, rz: 40, rot: -0.3, depth: 3, seed: 4 },
] });
const lakeQ = (x: number, z: number) => lakes.q(x, z);

/** One sandy rise a side [x, z, r, h] (the Kūkas heights on the north, the Rubeņi rise on the south) and a gentler swell each. */
const RISES = [[90, 255, 160, 6], [-320, 300, 130, 3], [-150, -250, 160, 6], [290, -350, 130, 3]];
function marshAt(x: number, z: number) {
  return smoothstep(0.28, 0.48, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * smoothstep(60, 110, away(x, z)) * smoothstep(6, 26, roadD(x, z));
}
function height(x: number, z: number) {
  const d = away(x, z);
  let h = 1.2 + smoothstep(35, 150, d) * (3.6 + fbm(noise, x * 0.004 + (z > mid(x) ? 0 : 40), z * 0.004, 4) * 5);
  h += fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 1.6 * smoothstep(40, 140, d);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(BASE_Z - 80 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 9 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 12;
  h += (1.6 - h) * marshAt(x, z) * 0.75;                                       // the bogs
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 1.2 + d * 0.05) - h) * (1 - smoothstep(5, 16, Math.abs(x - bx))) * (1 - smoothstep(90, 140, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return lakes.carve(x, z, river.carve(x, z, Math.max(1.4, h)));
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Madona road', 0, 470, 'centre'),
  P('B', 'Zīlāni', -350, 320, 'west'),
  P('C', 'Kreuzburg station', 90, 262, 'centre'),
  P('D', 'Kūkas', 330, 340, 'east'),
  P('E', 'Sala', -190, Math.round(mid(-190) + 74), 'west', { radius: 24 }),
  P('F', 'Jakobstadt ferry', 0, Math.round(mid(0)), 'centre', { radius: 32 }),
  P('G', 'Dignāja', 200, Math.round(mid(200) - 70), 'east', { radius: 24 }),
  P('H', 'Ābeļi', -240, -330, 'west'),
  P('I', 'Jakobstadt', -60, -268, 'centre'),
  P('J', 'Rubeņi', 360, -305, 'east'),
  P('K', 'Zasa road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'jakobstadt',
  name: 'Jakobstadt',
  description: 'September 1917, just after Riga: the German Eighth Army clears the Russian bridgehead at Jakobstadt on the Daugava, Latvian Riflemen in the Russian line. Jakobstadt and Kreuzburg face each other over the broad river, the bridge blown, a ferry and pontoon bridges; pine forest, bogs and small lakes, two trench lines on each bank.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de', 'st'] }, // (the Russian Twelfth Army with its Latvian Rifle regiments against Hutier's Eighth)
  sides: { nato: 'Russia', pact: 'Germany' },
  conditions: { time: 'day', weather: 'overcast' }, // (grey late-September weather on the Daugava)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1917,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1921, cell: 80, weights: [0.3, 0.3, 0.2, 0.2] as any }),

  theme: {
    // a grey early-autumn day over the Daugava
    fogColor: 0xa8aca4, fogDensity: 0.0013, skyTop: 0x6a7682, skyHorizon: 0xbcc0b6, skyBottom: 0x6e7066,
    sunColor: 0xece2c8, sunIntensity: 1.6, sunDisk: 0.12, clouds: 0.75, cloudLight: 0xd0d2cc, cloudDark: 0x747a7e,
    sunDir: [0.45, 0.45, 0.6], hemiSky: 0xc0c8cc, hemiGround: 0x4e4a38, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#5a683a', grassAlt: '#506034', dryGrass: '#8e8658', dirt: '#6e5e46', rock: '#8a8474', strip: '#4e4232',
      pasture: '#5a6a3a', ploughed: '#76664e', stubble: '#a69c62', meadow: '#64703e',
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x8a7a5c, 0.85];                                       // sand roads
        if (railD(x, z) < 3) return [0x5a5248, 0.9];                                     // the railway ballast
        if (y < 1.6 && away(x, z) < HW + 14) return [0xc2b48c, 0.9];                      // the sandy shore
        if (y < 1.4 && lakeQ(x, z) < 1.4) return [0x8a8460, 0.7];                         // the reedy lake shore
        const m = marshAt(x, z);
        if (m > 0.3) return [0x4e5832, Math.min(0.85, m)];                               // bog and sedge
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side's two lines (two belts of wire before the first, one before the support line), MG posts at the roads, the shell holes of the bombardment. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      for (const line of [0, 1]) {
        const pts: number[][] = [];
        for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato', line)]);   // (left to right as its owner looks)
        for (const w of trenchLine(pts, f, { wireAt: line ? 18 : 22, belts: line ? 1 : 2, gapEvery: line ? 50 : 70 })) {
          if (roadD(w.x, w.z) < 8 || away(w.x, w.z) < HW + 10 || lakeQ(w.x, w.z) < 1.3 || railD(w.x, w.z) < 5) continue;
          works.push(w);
        }
        for (const bx of [-SIDE_X, 0, SIDE_X]) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato', line) - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      }
    }
    const dens = (x: number, z: number) => { const dz = Math.abs(z) - 110; return 0.6 * Math.exp(-((dz / 40) ** 2)) + 0.02; };
    const blasts = [...shellField(1917, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] >= 0), ...shellField(1918, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => away(b[0], b[1]) > HW + 12 && !onRoad(b[0], b[1]) && lakeQ(b[0], b[1]) > 1.3 && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 35));
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r || lakeQ(x, z) < 1.2 + r * 0.02;
    const trenchBand = (x: number, z: number) => [0, 1].some((l) => Math.abs(z - trenchZ(x, z > mid(x), l)) < (l ? 22 : 34));
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || railD(x, z) < 8 || trenchBand(x, z) || marshAt(x, z) > 0.4;

    // the two towns facing each other over the ferry: Kreuzburg's houses on the north bank, Jakobstadt's on the south
    const castle = { x: -56, z: mid(-56) + 60 }, redoubt = { x: 56, z: mid(56) - 62 };
    for (const [s, seed] of [[1, 1917_1], [-1, 1917_2]]) {
      props.rand = mulberry32(seed);
      const old = s > 0 ? castle : redoubt;
      for (let i = 0, n = 0; n < 16 && i < 500; i++) {
        const x = (props.rand() - 0.5) * 240, z = mid(x) + s * (45 + props.rand() * 70);
        if (skip(x, z) || Math.hypot(x - old.x, z - old.z) < 34 || Math.abs(x - BLOWN_X) < 10) continue;
        props.townHouse({ x, z, yaw: Math.round(props.rand() * 4) * (Math.PI / 2), width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.5 ? 1 : 0), damaged: 0.15 });
        n++;
      }
    }
    // Kreuzburg castle on the north bank: the manor house in its walled yard, a tower at the corners
    const cw = 0xa09a86;
    for (const [dx, dz, yaw, len] of [[0, 20, 0, 40], [-20, 0, Math.PI / 2, 40], [20, 0, Math.PI / 2, 40], [-13, -20, 0, 14], [13, -20, 0, 14]]) {
      props.lowWall({ x: castle.x + dx, z: castle.z + dz, yaw, length: len, height: 3.5, color: cw });
    }
    for (const [dx, dz] of [[-20, 20], [20, 20]]) props.column({ x: castle.x + dx, z: castle.z + dz, radius: 3, height: 10 });
    props.townHouse({ x: castle.x, z: castle.z + 6, yaw: 0, width: 16, depth: 9, storeys: 2, name: 'Kreuzburg castle', damaged: 0 });
    // the old bridgehead redoubt on the south bank: earth ramparts round a square, open toward the river
    for (const [dx, dz, yaw, len] of [[0, -22, 0, 44], [-22, 0, Math.PI / 2, 44], [22, 0, Math.PI / 2, 44], [-15, 22, 0, 14], [15, 22, 0, 14]]) {
      props.lowWall({ x: redoubt.x + dx, z: redoubt.z + dz, yaw, length: len, height: 1.8, color: 0x6e6248 });
    }
    props.hall({ x: redoubt.x, z: redoubt.z - 6, yaw: 0, width: 14, depth: 7, height: 4, color: 0x8a8070, door: 4, name: 'bridgehead barracks' });
    props.church({ x: 120, z: 286, yaw: 0.1 });                 // Kreuzburg's Lutheran church by the station
    props.church({ x: -88, z: -288, yaw: Math.PI + 0.2 });       // Jakobstadt's Orthodox church on the market
    // the blown road bridge: its stone piers standing in the river, the abutments on each bank
    props.rand = mulberry32(1917_3);
    for (const v of [-15, -5, 5, 15]) props.column({ x: BLOWN_X + (props.rand() - 0.5) * 1.5, z: mid(BLOWN_X) + v, radius: 2.2, height: v === 5 ? 3.6 : 5.5 });
    for (const s of [1, -1]) props.lowWall({ x: BLOWN_X, z: mid(BLOWN_X) + s * (HW + 6), yaw: Math.PI / 2, length: 10, height: 2.4, color: 0x8a857a });
    // the railway: track, Kreuzburg station and a train of wagons
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [x0, z0] = RAIL[i], [x1, z1] = RAIL[i + 1];
      props.rails({ x0: Math.max(-500, Math.min(500, x0)), z0, x1: Math.max(-500, Math.min(500, x1)), z1 });
    }
    props.hall({ x: 60, z: 312, yaw: 0, width: 18, depth: 8, height: 5, color: 0x8a4a38, name: 'Kreuzburg station' });
    for (const k of [0, 1, 2, 3]) props.wagon({ x: 170 + k * 13, z: 295.5, yaw: Math.PI / 2, color: k === 2 ? 0x4a4a40 : 0x5a3426 });
    // the Latvian farmsteads round the villages, each with its log barn
    for (const p of points) {
      if ('AKFCI'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, 6, 1917 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.1);
    }
    for (const [s, seed] of [[1, 1917_4], [-1, 1917_5]]) {
      props.rand = mulberry32(seed);
      for (let i = 0, n = 0; n < 10 && i < 600; i++) {
        const x = (props.rand() * 2 - 1) * 470, z = s * (120 + props.rand() * 330);
        if (skip(x, z) || wet(x, z, 20) || Math.hypot(x, z - s * BASE_Z) < 50 || nearPoint(x, z, 30) || away(x, z) < 110) continue;
        props.hall({ x, z, yaw: props.rand() * Math.PI, width: 9, depth: 6, height: 3.6, color: 0x5e4a36, roof: 0x6e6a5a, door: 3, name: 'log barn' });
        n++;
      }
    }
    // the pioneers' stores and boats by each pontoon bridge and the ferry
    for (const s of [1, -1]) for (const bx of [-SIDE_X, 0, SIDE_X]) {
      props.rand = mulberry32(1951 + s + bx);
      const z = mid(bx) + (HW + 16) * s;
      props.logPile({ x: bx + 14 * s, z, yaw: props.rand() * 0.6, length: 7 });
      props.crates({ x: bx - 14 * s, z: z + 6 * s, yaw: props.rand() * 3 });
    }
    // farmsteads, field walls and hay over each half's fields
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 110 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 140 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z) || wet(x, z, 15)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    lakes.build(scene);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || railD(x, z) < 4 || Math.hypot(x * 0.5, z - mid(x)) < 115 }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.006 + 70, z * 0.006, 3);
    const tN = 0.05, tP = evenThreshold(wood, tN, (x, z) => z > mid(x));   // (each bank its own pine woods, the same in area)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3800, hedges: 1600, autumn: 0.2, broadleaf: 0.25,
      forest: (x: number, z: number) => {
        if (wet(x, z, 2)) return -1;
        if (trenchBand(x, z)) return 0.04;
        if (marshAt(x, z) > 0.5) return 0.3;                                   // birch and alder scrub in the bogs
        if (away(x, z) < 50) return 0.2;                                       // willows along the Daugava
        return Math.abs(x) > 470 || wood(x, z) > (z > mid(x) ? tN : tP) ? 0.85 : 0;  // the sandy pine forest
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
