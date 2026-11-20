// Tannenberg, 26–30 August 1914: Samsonov's Second Army marches north into East Prussia and is caught among the
// Masurian lakes and forests round Hohenstein and Usdau. François's guns break the Russian left at Usdau, Mackensen
// and Below close from the north, and the long finger lakes, the swamps and the pine forests split the Russian corps
// so that none can help the next; by the 30th the centre is surrounded in the woods south of Hohenstein. The ground:
// rolling moraine, long glacial lakes running north–south, sandy roads between them, two railways (the Allenstein–
// Hohenstein–Soldau line and the line through Gilgenburg), villages of brick farmsteads, pine and birch forest.
// Not mirrored but fair: each half its own lakes and woods — a long finger lake reaching into the middle from each
// side (the Mühlener See from the north, the Maranser See from the south), three smaller lakes and three marsh pools
// apiece of the same sizes, each side's woods the same in area; three sandy roads through each sector, each half a
// moraine rise of the same height and a railway behind its shallow 1914 trench line; Tannenberg itself in the middle.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const noise = createNoise2D(1914_08);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Neidenburg road', 0, 470, 'centre'),
  P('B', 'Orlau', -360, 310, 'west'),
  P('C', 'Hohenstein', 40, 250, 'centre'),
  P('D', 'Frankenau', 320, 300, 'east'),
  P('E', 'Usdau', -290, 60, 'west', { radius: 24 }),
  P('F', 'Tannenberg', 10, -10, 'centre', { radius: 26 }),
  P('G', 'Waplitz', 300, -60, 'east', { radius: 24 }),
  P('H', 'Gilgenburg', -260, -290, 'west'),
  P('I', 'Frögenau', -80, -250, 'centre'),
  P('J', 'Mühlen', 330, -280, 'east'),
  P('K', 'Osterode road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };
/** The sandy roads, one through each sector's villages from base edge to base edge. */
const ROADS = [
  [[-SIDE_X, 640], [-SIDE_X, 520], at('B'), at('E'), at('H'), [-SIDE_X, -520], [-SIDE_X, -640]],
  [[0, 640], at('A'), at('C'), at('F'), at('I'), at('K'), [0, -640]],
  [[SIDE_X, 640], [SIDE_X, 520], at('D'), at('G'), at('J'), [SIDE_X, -520], [SIDE_X, -640]],
];
const roadD = (x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z)));
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The railways behind each side's line: the Soldau–Hohenstein–Allenstein line on the north, the Gilgenburg line on the south. */
const RAILS = [
  [[-520, 205], [-160, 216], [40, 222], [520, 196]],
  [[-520, -212], [-80, -228], [150, -216], [520, -238]],
];
const railD = (x: number, z: number) => Math.min(...RAILS.map((r) => segDist(r, x, z)));

// the lakes, each half its own (the same number and sizes): a long finger lake from each side into the middle,
// three smaller lakes on each half, and the marsh pools
const WATER: any[] = [
  { x: -160, z: 50, rx: 24, rz: 105, rot: 0.15, depth: 4, seed: 1 },    // the Mühlener See, reaching south from the Russian side
  { x: 150, z: -20, rx: 26, rz: 98, rot: -0.3, depth: 4, seed: 2 },     // the Maranser See, reaching north from the German
  { x: -260, z: 380, rx: 45, rz: 28, rot: 0.4, depth: 3.5, seed: 3 },    // (north: the Lansker, Plautziger, Kownatken lakes)
  { x: 170, z: 360, rx: 40, rz: 30, rot: -0.6, depth: 3.5, seed: 4 },
  { x: 430, z: 90, rx: 32, rz: 48, rot: 0.3, depth: 3.5, seed: 5 },
  { x: -120, z: -400, rx: 50, rz: 26, rot: 0.2, depth: 3.5, seed: 6 },   // (south: the Gilgenburger, Damerau, Grosser Lauben lakes)
  { x: -420, z: -90, rx: 34, rz: 46, rot: -0.4, depth: 3.5, seed: 7 },
  { x: 230, z: -390, rx: 42, rz: 30, rot: 0.7, depth: 3.5, seed: 8 },
];
for (const [s, seed] of [[1, 1914], [-1, 1916]]) { // the swamp pools, three a side, wherever they fall clear of roads, lakes and villages
  const rr = mulberry32(seed);
  for (let i = 0, n = 0; n < 3 && i < 800; i++) {
    const x = (rr() * 2 - 1) * 450, z = s * (90 + rr() * 330), rx = 26 + n * 6, rz = 18 + n * 4;
    if (roadD(x, z) < rx + 25 || railD(x, z) < rx + 20 || Math.hypot(x, z - s * BASE_Z) < 100 || points.some((p) => Math.hypot(p.x - x, p.z - z) < rx + 45)
      || WATER.some((l) => Math.hypot(l.x - x, l.z - z) < Math.max(l.rx, l.rz) + rx + 30)) continue;
    WATER.push({ x, z, rx, rz, rot: rr() * 3, depth: 0.7, seed: WATER.length + 1 });
    n++;
  }
}
const water = createLakes({ lakes: WATER });
const wet = (x: number, z: number, m = 1.15) => water.q(x, z) < m;

/** The shallow 1914 trench lines: dug where each side's advance stopped, their own wander. */
const trenchZ = (x: number, north: boolean) => (north ? 135 + 14 * Math.sin(x * 0.011 + 1) + 6 * Math.sin(x * 0.031) : -128 - 12 * Math.sin(x * 0.009 + 4) - 7 * Math.sin(x * 0.027 + 2));

/** Each half's moraine rises [x, z, r, h]: the heights round Hohenstein and by Frankenau; the Frögenau heights and the ridge west of Gilgenburg. */
const RISES = [[-60, 330, 160, 9], [300, 160, 130, 7], [-300, -170, 150, 9], [110, -330, 130, 7]];
function marshAt(x: number, z: number) { return smoothstep(0.3, 0.5, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * (1 - smoothstep(4, 30, roadD(x, z))); }
function height(x: number, z: number) {
  let h = 4 + fbm(noise, x * 0.0035, z * 0.0035, 4) * 5 + fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 1.2;
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(BASE_Z - 90 + 50 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 10 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 12;
  h += (2.2 - h) * marshAt(x, z) * 0.75;                                       // the swamp hollows
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return water.carve(x, z, Math.max(1.4, h));
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'tannenberg',
  name: 'Tannenberg',
  description: 'August 1914 in East Prussia: the Russian Second Army caught among the Masurian lakes and forests round Hohenstein and Usdau. Long finger lakes and swamps split the attacks, sandy roads and two railways between them, shallow trenches dug where the advance stopped.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de'] }, // (Samsonov's Second Army against the German Eighth: maps/index.js armiesOn)
  sides: { nato: 'Russia', pact: 'Germany' },
  conditions: { time: 'day', weather: 'clear' }, // (the hot dry end of August)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1914,
  height,
  river: water,
  fields: createFields({ seed: 1914, cell: 80, weights: [0.2, 0.25, 0.35, 0.2] as any }),

  theme: {
    // a hot, hazy late-summer day over Masuria
    fogColor: 0xb6b8ac, fogDensity: 0.0012, skyTop: 0x6688aa, skyHorizon: 0xc8cec4, skyBottom: 0x80827a,
    sunColor: 0xfff0d4, sunIntensity: 1.9, sunDisk: 0.3, clouds: 0.35, cloudLight: 0xeeeee8, cloudDark: 0x9aa0a4,
    sunDir: [0.4, 0.7, 0.5], hemiSky: 0xc4ccd4, hemiGround: 0x5a5438, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#5e6a38', grassAlt: '#52602f', dryGrass: '#a49660', dirt: '#6e5e46', rock: '#8a8474', strip: '#4e4232',
      pasture: '#5c6a38', ploughed: '#7a6a50', stubble: '#c0aa66', meadow: '#66703e',
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x8a7a5c, 0.85];                                       // sand roads
        if (railD(x, z) < 3) return [0x5a5248, 0.9];                                     // the railway ballast
        if (y < 1.4 && wet(x, z, 1.4)) return [0x8a8460, 0.7];                           // the reedy shore
        const m = marshAt(x, z);
        if (m > 0.3) return [0x4e5832, Math.min(0.85, m)];                               // swamp meadow
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

  /** A shallow trench line each side (1914: one belt of wire, wide gaps), none in the lakes or on the roads. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 40 })) {
        if (wet(w.x, w.z, 1.25) || roadD(w.x, w.z) < 8 || railD(w.x, w.z) < 5) continue;
        works.push(w);
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > 0)) < 26;
    const skip = (x: number, z: number) => wet(x, z, 1.35) || roadD(x, z) < 9 || railD(x, z) < 8 || trenchBand(x, z);

    for (const p of points) {
      if (p.id === 'A' || p.id === 'K') continue;
      const big = 'CFH'.includes(p.id);
      farmVillage(props, p.x, p.z, big ? 9 : 6, 1914 * 10 + Math.round(p.x * 3 + p.z * 7), skip, big ? 1.35 : 1);
    }
    props.rand = mulberry32(1915);
    props.church({ x: 78, z: 262, yaw: 0.1 });            // Hohenstein
    props.church({ x: -228, z: -296, yaw: Math.PI - 0.2 }); // Gilgenburg
    props.church({ x: -16, z: 22, yaw: 0.5 });              // Tannenberg's village church
    // the railways: track, a station shed and a few wagons by Hohenstein and Frögenau
    for (const line of RAILS) for (let i = 0; i < line.length - 1; i++) {
      const [x0, z0] = line[i], [x1, z1] = line[i + 1];
      props.rails({ x0: Math.max(-500, Math.min(500, x0)), z0, x1: Math.max(-500, Math.min(500, x1)), z1 });
    }
    for (const [sx, s] of [[40, 1], [-80, -1]]) {
      const line = RAILS[s > 0 ? 0 : 1], z = line[s > 0 ? 2 : 1][1];
      props.hall({ x: sx - 60, z: z + 16 * s, yaw: 0, width: 16, depth: 8, height: 5, color: 0x8a4a38, name: 'railway station' });
      for (const k of [0, 1, 2]) props.wagon({ x: sx + 24 + k * 13, z: z + 0.4 * s, yaw: Math.PI / 2, color: k === 1 ? 0x4a4a40 : 0x5a3426 });
    }
    // farmsteads, field walls and hay over each half's fields
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'hay', 'rocks'];
    for (let tries = 0, n = 0; n < 130 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z) || wet(x, z, 1.7) || marshAt(x, z) > 0.3) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    water.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 1.05) || roadD(x, z) < 5 || railD(x, z) < 4 }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.006 + 70, z * 0.006, 3);
    const tN = -0.02, tP = evenThreshold(wood, tN, (x, z) => z > 0);   // (each half its own forests, the same in area)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 1500, autumn: 0.05, broadleaf: 0.3,
      forest: (x: number, z: number) => {
        if (wet(x, z, 1.05)) return -1;
        if (trenchBand(x, z)) return 0.05;
        if (marshAt(x, z) > 0.5) return 0.3;                                    // alder and birch in the swamps
        return Math.abs(x) > 470 || wood(x, z) > (z > 0 ? tN : tP) ? 0.9 : 0;  // the pine forests
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
