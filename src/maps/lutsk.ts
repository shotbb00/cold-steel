// Lutsk, 4–7 June 1916: the opening of the Brusilov Offensive. Kaledin's Eighth Army attacks the Austro-Hungarian
// Fourth Army on the Volhynian plain east of Lutsk — not on one narrow front but everywhere at once, after a short,
// exactly registered bombardment, the assault trenches dug forward to within a hundred metres of the enemy wire.
// The Austro-Hungarian lines were deep — three belts of trenches with dugouts nine metres down — and that was their
// undoing: the garrisons were still below ground when the Russians came over the parapet. By the 7th the Russians
// were in Lutsk and over the Styr. The ground: the flat, open Volhynian plain of wheat and rye, small woods, the
// Styr winding through it in broad loops, the old town of Lutsk on its banks with Lubart's castle and the cathedral.
// Not mirrored but fair: the Styr runs between the two sides in an S — each side's bank reaching into the other's
// in one loop with a point in it (Hnidava in the western loop on the north bank, Ozerdiv in the eastern on the south),
// a bridge on each flank and the town bridge in Lutsk, which stands astride the river; each side two trench lines
// at the same depth from the water (the deep lines of 1916, three belts of wire in front of the first), each half
// its own woods of the same area and one low rise of the same height at the same reach.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { pontoons, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 20;                                              // the Styr: broad and slow
const noise = createNoise2D(1916_06);
const mid = (x: number) => 62 * Math.sin(x * 0.0085) + 7 * Math.sin(x * 0.021 + 1);   // (the S through Lutsk)
const river = createRiver({
  path: mid, halfWidth: HW, level: 0, depth: 3, valley: 80,
  crossings: [
    { name: 'Krasne pontoon bridge', x: -SIDE_X, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Lutsk bridge', x: 0, kind: 'bridge', width: 7 },
    { name: 'Kolky pontoon bridge', x: SIDE_X, kind: 'bridge', width: 6, pontoon: true },
  ],
});
const away = (x: number, z: number) => Math.abs(z - mid(x));
/** Each side's road along the plain behind its front line (north: the Rivne road), the roads from the bridges to the bases. */
const bankZ = (x: number, north: boolean) => (north ? mid(x) * 0.4 + 165 + 8 * Math.sin(x * 0.01) : mid(x) * 0.4 - 170 + 10 * Math.sin(x * 0.007 + 2));
const roadD = (x: number, z: number) => {
  let d = Math.abs(z - bankZ(x, z > mid(x)));
  for (const bx of [-SIDE_X, 0, SIDE_X]) d = Math.min(d, Math.abs(x - bx));
  return d;
};
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The two trench lines of each side, at `depth` from the water's middle: the first line and the support line, each its own wander. */
const trenchZ = (x: number, north: boolean, line: number) => {
  const m = mid(x) * (line ? 0.55 : 0.8);                  // (the lines straighten the river's loops away from it)
  return north ? m + (line ? 235 : 105) + 9 * Math.sin(x * 0.017 + line) : m - (line ? 232 : 108) - 10 * Math.sin(x * 0.013 + 2 + line);
};

/** One low rise a side [x, z, r, h]: the Podhaitsi rise on the north, the Torchyn rise on the south; and a gentler swell each. */
const RISES = [[90, 260, 170, 6], [-330, 330, 140, 3], [-40, -280, 170, 6], [370, -300, 140, 3]];
function height(x: number, z: number) {
  const d = away(x, z);
  let h = 1.2 + smoothstep(30, 140, d) * (3.2 + fbm(noise, x * 0.004 + (z > mid(x) ? 0 : 40), z * 0.004, 4) * 3.5);
  h += fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 0.8 * smoothstep(40, 140, d);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 8 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 12;
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 1.2 + d * 0.05) - h) * (1 - smoothstep(5, 16, Math.abs(x - bx))) * (1 - smoothstep(90, 140, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Olyka road', 0, 470, 'centre'),
  P('B', 'Kivertsi', -350, 320, 'west'),
  P('C', 'Podhaitsi', 90, 260, 'centre'),
  P('D', 'Zhydychyn Monastery', 330, 335, 'east'),
  P('E', 'Hnidava', -190, Math.round(mid(-190) + 72), 'west', { radius: 24 }),
  P('F', 'Lutsk', 0, Math.round(mid(0)), 'centre', { radius: 32 }),
  P('G', 'Ozerdiv', 200, Math.round(mid(200) - 66), 'east', { radius: 24 }),
  P('H', 'Boratyn', -240, -330, 'west'),
  P('I', 'Torchyn', -40, -280, 'centre'),
  P('J', 'Lypyny', 370, -300, 'east'),
  P('K', 'Volodymyr road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'lutsk',
  name: 'Lutsk',
  description: 'June 1916, the Brusilov Offensive: the Russian Eighth Army storms the deep Austro-Hungarian dugout lines on the open Volhynian plain and drives for Lutsk and the Styr. Wheat and small woods, the river in broad loops, two trench lines on each side.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['ah'] }, // (Kaledin's Eighth Army against Archduke Joseph Ferdinand's Fourth: maps/index.js armiesOn)
  sides: { nato: 'Russia', pact: 'Austria-Hungary' },
  conditions: { time: 'dawn', weather: 'clear' }, // (the guns opened at dawn on 4 June, a fine early-summer day)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1916,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1916, cell: 90, weights: [0.15, 0.5, 0.1, 0.25] as any }),

  theme: {
    // a bright early-summer day on the plain
    fogColor: 0xb4b8ae, fogDensity: 0.0011, skyTop: 0x5e86b0, skyHorizon: 0xccd2ca, skyBottom: 0x84867c,
    sunColor: 0xfff2d8, sunIntensity: 2.0, sunDisk: 0.3, clouds: 0.3, cloudLight: 0xf0f0ea, cloudDark: 0x9aa0a6,
    sunDir: [0.5, 0.65, 0.45], hemiSky: 0xc6ced8, hemiGround: 0x5e5838, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#5c6c38', grassAlt: '#50622f', dryGrass: '#9a9058', dirt: '#5e4e3a', rock: '#86827a', strip: '#4a3e2e',
      pasture: '#5a6c38', ploughed: '#5a4a38', stubble: '#a49a5a', meadow: '#66743e',   // (the black earth of Volhynia)
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x6a5a46, 0.85];                                     // dirt roads
        if (y < 1.6 && away(x, z) < HW + 14) return [0x8a8462, 0.85];                   // the reedy banks
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

  /** Each side's two lines (three belts of wire before the first, one before the support line), MG posts at the roads, the registered shell holes. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      for (const line of [0, 1]) {
        const pts: number[][] = [];
        for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato', line)]);   // (left to right as its owner looks)
        for (const w of trenchLine(pts, f, { wireAt: line ? 18 : 22, belts: line ? 1 : 3, gapEvery: line ? 50 : 70 })) {
          if (roadD(w.x, w.z) < 8 || away(w.x, w.z) < HW + 10) continue;
          works.push(w);
        }
        for (const bx of [-SIDE_X, 0, SIDE_X]) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato', line) - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      }
    }
    const dens = (x: number, z: number) => { const dz = Math.abs(z) - 110; return 0.8 * Math.exp(-((dz / 40) ** 2)) + 0.03; };
    const blasts = [...shellField(1916, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] >= 0), ...shellField(1917, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => away(b[0], b[1]) > HW + 12 && !onRoad(b[0], b[1]) && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 35));
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => [0, 1].some((l) => Math.abs(z - trenchZ(x, z > mid(x), l)) < (l ? 22 : 34));
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z);

    // Lutsk astride the Styr: town houses on both banks, the cathedral on the north bank, Lubart's castle on the south
    const castle = { x: -44, z: mid(-44) - 58 }, cathedral = { x: 40, z: mid(40) + 50 };
    props.rand = mulberry32(1916_1);
    for (let i = 0, n = 0; n < 30 && i < 500; i++) {
      const a = props.rand() * Math.PI * 2, d = 22 + props.rand() * 68, x = Math.cos(a) * d * 1.3, z = mid(x) + Math.sin(a) * d;
      if (wet(x, z, 10) || roadD(x, z) < 7 || trenchBand(x, z) || Math.hypot(x - castle.x, z - castle.z) < 34 || Math.hypot(x - cathedral.x, z - cathedral.z) < 16) continue;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.6 ? 1 : 0), damaged: 0.1 });
      n++;
    }
    props.church({ x: cathedral.x, z: cathedral.z, yaw: 0.1 });
    // Lubart's castle: brick curtain walls round a square, a tower at three corners, the gate tower toward the town
    const cw = 0x8a5a44;
    for (const [dx, dz, yaw, len] of [[0, -22, 0, 40], [-22, 0, Math.PI / 2, 40], [22, 0, Math.PI / 2, 40], [-13, 22, 0, 18], [13, 22, 0, 18]]) {
      props.lowWall({ x: castle.x + dx, z: castle.z + dz, yaw, length: len, height: 5, color: cw });
    }
    for (const [dx, dz] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) props.column({ x: castle.x + dx, z: castle.z + dz, radius: 3.4, height: 11 });
    props.townHouse({ x: castle.x + 6, z: castle.z - 8, yaw: 0, width: 14, depth: 9, storeys: 2, name: 'castle palace', damaged: 0 });
    // the villages on the plain, the monastery at Zhydychyn
    for (const p of points) {
      if ('AKF'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, p.id === 'D' ? 4 : 7, 1916 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.15);
    }
    props.rand = mulberry32(1933);
    props.church({ x: 352, z: 352, yaw: 0.4 });                  // Zhydychyn's monastery church
    props.lowWall({ x: 352, z: 372, yaw: 0.4, length: 30, height: 2, color: 0xb0aa98 });
    props.church({ x: 120, z: 276, yaw: 0.1 });                   // Podhaitsi
    props.church({ x: -64, z: -298, yaw: Math.PI + 0.2 });       // Torchyn
    // the pioneers' stores by each pontoon bridge
    for (const s of [1, -1]) for (const bx of [-SIDE_X, SIDE_X]) {
      props.rand = mulberry32(1949 + s + bx);
      const z = mid(bx) + (HW + 16) * s;
      props.logPile({ x: bx + 14 * s, z, yaw: props.rand() * 0.6, length: 7 });
      props.crates({ x: bx - 14 * s, z: z + 6 * s, yaw: props.rand() * 3 });
    }
    // farmsteads, field walls and hay over each half's fields
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 120 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 140 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || Math.hypot(x * 0.77, z - mid(x)) < 100 }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const tN = 0.22, tP = evenThreshold(wood, tN, (x, z) => z > mid(x));   // (small woods only: the plain is open)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 2600, hedges: 1200, autumn: 0, broadleaf: 0.75,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z)) return 0.03;
        if (away(x, z) < 50) return 0.25;                                     // willows and alders along the Styr
        return Math.abs(x) > 470 || wood(x, z) > (z > mid(x) ? tN : tP) ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
