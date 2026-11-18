// Riga, 1 September 1917: Hutier's Eighth Army crosses the Düna (Daugava) at Üxküll, thirty kilometres upstream of
// the city — the first great attack of the new way of war: a five-hour hurricane bombardment of gas and high
// explosive planned by Bruchmüller, then the storm troops over in boats under fog and smoke, and the pioneers
// throwing three pontoon bridges across behind them by noon. The Russian Twelfth Army, worn out by the revolution,
// fell back from its trenches on the far bank. The broad slow river with low sandy bluffs, Martinsholm in the middle
// with the ruin of Bishop Meinhard's church — the oldest stone church in Livonia — birch and pine woods, wet meadows
// and marsh in the bends, farmsteads and manors. Point-mirrored: each side holds one bank behind its trench line, the
// river between them crossed by a pontoon bridge on each flank and two over the island in the middle.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { pointsFrom, both, coverSites, vegetation } from './common2027.js';
import { pontoons, farmVillage } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 30;                                            // the Düna: two of the game's river widths side by side
const noise = createNoise2D(1917_09);
const mid = (x: number) => 22 * Math.sin(x * 0.005) + 8 * Math.sin(x * 0.013); // (odd: the river is point-mirrored)
const split = (x: number) => 55 * Math.exp(-((x / 120) ** 2));                   // the two arms round Martinsholm
const armN = (x: number) => mid(x) + split(x), armS = (x: number) => mid(x) - split(x);
const river = createRiver({
  path: armN, paths: [armN, armS], halfWidth: HW, level: 0, depth: 3.4, valley: 90,
  crossings: [
    { name: 'Kirchholm pontoon bridge', x: -SIDE_X, kind: 'bridge', width: 6, pontoon: true },
    { name: 'Martinsholm bridge (north arm)', x: 0, kind: 'bridge', width: 6, channel: 0, pontoon: true },
    { name: 'Martinsholm bridge (south arm)', x: 0, kind: 'bridge', width: 6, channel: 1, pontoon: true },
    { name: 'Jungfernhof pontoon bridge', x: SIDE_X, kind: 'bridge', width: 6, pontoon: true },
  ],
});
/** m from the water's edge zone: the nearer arm's middle. */
const away = (x: number, z: number) => Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x)));
/** The bank road along each side (north: the Riga–Dünaburg road), the roads up from the bridges to it and on to the base. */
const bankZ = (x: number) => mid(x) + 150 + 10 * Math.sin(x * 0.009);
const onRoad = (x: number, z: number) => {
  const [ax, az] = z > mid(x) ? [x, z] : [-x, -z];
  if (Math.abs(az - bankZ(ax)) < 3.5) return true;
  for (const bx of [-SIDE_X, 0, SIDE_X]) if (Math.abs(ax - bx) < 3 && away(ax, az) > HW + 8 && az < bankZ(ax) + (bx ? 0 : 400)) return true;
  return false;
};
/** The trench lines along each bank (z off the river's middle): the Russian on the north, the German jumping-off line on the south. */
const TRENCH = 85;
const trenchZ = (x: number) => mid(x) + split(x) + TRENCH + 8 * Math.sin(x * 0.03);

function height(x: number, z: number) {
  const d = away(x, z);
  const n = (a: number, b: number) => fbm(noise, a * 0.004, b * 0.004, 4);
  let h = 0.9 + smoothstep(40, 150, d) * (7 + (n(x, z) + n(-x, -z)) * 2);                // the low sandy bluffs over the river
  h += (fbm(noise, x * 0.015 + 9, z * 0.015, 3) + fbm(noise, -x * 0.015 + 9, -z * 0.015, 3)) * 0.8 * smoothstep(60, 160, d);
  h += smoothstep(BASE_Z - 40, 640, Math.abs(z)) * 10 + smoothstep(470, 600, Math.abs(x)) * 14;
  // the wet meadows in the bends: down nearly to the water
  const marsh = smoothstep(0.25, 0.45, fbm(noise, Math.abs(x) * 0.006 + 30, Math.abs(z) * 0.006, 3)) * (1 - smoothstep(110, 220, d));
  h += (1.3 - h) * marsh * 0.8;
  // the ramps down to each bridge, the bases' ground
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 1.2 + d * 0.08) - h) * (1 - smoothstep(5, 16, Math.abs(x - bx))) * (1 - smoothstep(120, 170, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 9 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}
const marshAt = (x: number, z: number) => smoothstep(0.25, 0.45, fbm(noise, Math.abs(x) * 0.006 + 30, Math.abs(z) * 0.006, 3)) * (1 - smoothstep(110, 220, away(x, z)));

const points = pointsFrom([
  ['A', 'Riga road', 0, 470],
  ['B', 'Kirchholm', -SIDE_X, 300],
  ['C', 'Üxküll', 0, 230],
  ['D', 'Jungfernhof', SIDE_X, 290],
  ['E', 'Kirchholm landing', -SIDE_X, Math.round(mid(-SIDE_X) + 75), { radius: 22 }],
  ['F', 'Martinsholm', 0, 0, { radius: 24 }],
], ['Jungfernhof landing', 'Kekkau', 'Linden', 'Katlakaln', 'Mitau road']);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'riga',
  name: 'Riga',
  description: '1 September 1917: the German Eighth Army crosses the broad Düna at Üxküll behind a hurricane of gas shells, the storm troops in boats, the pioneers bridging behind them. Pontoon bridges on the flanks, two over Martinsholm island in the middle, a trench line on each bank. Mirrored to keep it fair.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de', 'st'] }, // (the Russian Twelfth Army against Hutier's Eighth: maps/index.js armiesOn)
  sides: { nato: 'Russia', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'fog' }, // (the crossing went in at nine under a ground mist and smoke)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1917,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1917, cell: 80, weights: [0.25, 0.35, 0.15, 0.25] as any }),

  theme: {
    // a grey early-autumn morning on the Baltic plain
    fogColor: 0xa8aca6, fogDensity: 0.0014, skyTop: 0x6c7884, skyHorizon: 0xbcc0b8, skyBottom: 0x707268,
    sunColor: 0xeee4cc, sunIntensity: 1.6, sunDisk: 0.15, clouds: 0.7, cloudLight: 0xd0d2cc, cloudDark: 0x767c80,
    sunDir: [0.5, 0.4, 0.6], hemiSky: 0xc0c8cc, hemiGround: 0x4e4a38, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#5c6a3c', grassAlt: '#526036', dryGrass: '#8c8458', dirt: '#6a5a44', rock: '#8a8474', strip: '#4e4232',
      pasture: '#5a6a3a', ploughed: '#6e604c', stubble: '#a49a62', meadow: '#66703e',
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x7a6c56, 0.85];                                     // sand roads
        if (y < 1.6 && away(x, z) < HW + 14) return [0xc2b48c, 0.9];                    // the sandy shore
        const m = marshAt(x, z);
        if (m > 0.3) return [0x4e5832, Math.min(0.85, m)];                               // wet meadow and reed
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

  /** The trench lines along both banks, wire toward the river (gaps at the bridge roads); a few craters of the bombardment. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 40) pts.push([x * s, trenchZ(x) * s]);
      for (const w of trenchLine(pts, f, { wireAt: 22, belts: 1, gapEvery: 60 })) {
        if ([-SIDE_X, 0, SIDE_X].some((bx) => Math.abs(w.x - bx) < 9)) continue; // (the roads down to the bridges)
        works.push(w);
      }
      for (const bx of [-SIDE_X, 0, SIDE_X]) works.push({ kind: 'mgNest', x: (bx + 14) * s, z: (trenchZ(bx) - 4) * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => { const [ax, az] = z > mid(x) ? [x, z] : [-x, -z]; return Math.abs(az - trenchZ(ax)) < 30; };
    const skip = (x: number, z: number) => wet(x, z, 8) || onRoad(x, z) || onRoad(x + 5, z) || onRoad(x - 5, z) || trenchBand(x, z);

    // the villages and manors on each bank (the mirror on the far bank), Üxküll's church
    for (const p of points) {
      if (p.z <= 0 || p.id === 'A') continue;
      const seed = 1917 * 10 + Math.round(p.x + p.z);
      farmVillage(props, p.x, p.z, p.id === 'C' ? 9 : 6, seed, skip, p.id === 'C' ? 1.4 : 1);
      farmVillage(props, -p.x, -p.z, p.id === 'C' ? 9 : 6, seed, (x, z) => skip(x, z));
    }
    both(props, 1931, (m, flip) => props.church({ x: 34 * m, z: 262 * m, yaw: flip }));
    // Martinsholm: the old church's ruin on the island, its graveyard wall
    props.church({ x: 40, z: mid(40), yaw: Math.PI / 2 });
    props.lowWall({ x: 40, z: mid(40) + 15, yaw: 0, length: 26, height: 1.1, color: 0x8a867c });
    props.lowWall({ x: -40, z: mid(-40) - 15, yaw: 0, length: 26, height: 1.1, color: 0x8a867c });
    // the pioneers' boats drawn up on the bank by each bridge, a log pile for the bridging
    both(props, 1947, (m, flip) => {
      for (const bx of [-SIDE_X, 0, SIDE_X]) {
        const z = (bx === 0 ? armN(0) : mid(bx)) + HW + 14;
        props.logPile({ x: (bx + 16) * m, z: z * m, yaw: flip, length: 7 });
        props.crates({ x: (bx - 14) * m, z: (z + 6) * m, yaw: flip + 0.3 });
      }
    });
    coverSites(props, rand, bounds, (x, z) => z > mid(x) + 60 && !trenchBand(x, z) && Math.hypot(x, z - BASE_Z) > 45 && !nearPoint(x, z, 45) && !skip(x, z), 70,
      ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'hay'], buildSite);
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3600, hedges: 2500, autumn: 0.15, broadleaf: 0.5,
      forest: (x: number, z: number) => {
        if (wet(x, z, 4)) return -1;
        if (trenchBand(x, z)) return 0.05;
        if (marshAt(x, z) > 0.5) return 0.25;                                  // alder and willow scrub in the wet meadows
        return Math.abs(x) > 470 || wood(x, z) > 0.12 || wood(-x, -z) > 0.12 ? 0.85 : 0;  // birch and pine woods
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
