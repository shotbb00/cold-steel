// Riga, 1 September 1917: Hutier's Eighth Army crosses the Düna (Daugava) at Üxküll, thirty kilometres upstream of
// the city — the first great attack of the new way of war: a five-hour hurricane bombardment of gas and high
// explosive planned by Bruchmüller, then the storm troops over in boats under fog and smoke, and the pioneers
// throwing three pontoon bridges across behind them by noon. The Russian Twelfth Army, worn out by the revolution,
// fell back from its trenches on the far bank. The broad slow river with low sandy bluffs, Martinsholm in the middle
// with the ruin of Bishop Meinhard's church — the oldest stone church in Livonia — birch and pine woods, wet meadows
// and marsh in the bends, farmsteads and manors. The real lie of it: at Üxküll the Düna runs from south-east to
// north-west, so on the map it crosses the field diagonally — the Russian bank's bluff steep and close to the water, the
// German bank a long low slope of meadow and wood. Not mirrored but fair: each side holds one bank behind its trench line,
// the river between them crossed by a pontoon bridge on each flank and two over the island in the middle — the north
// bank's bluff higher and barer round Üxküll, the south bank's lower but more wooded; each bank a landing point by a bridge.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { pontoons, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 30;                                            // the Düna: two of the game's river widths side by side
const noise = createNoise2D(1917_09);
const mid = (x: number) => -0.45 * x + 22 * Math.sin(x * 0.005) + 8 * Math.sin(x * 0.013) - 26 * Math.cos(x * 0.009); // (south-east to north-west across the field, its own bends)
const ISLE = 30;                                                                  // Martinsholm's middle (x)
const split = (x: number) => 55 * Math.exp(-(((x - ISLE) / 120) ** 2));          // the two arms round Martinsholm
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
const bankZ = (x: number, north: boolean) => (north ? mid(x) + 150 + 10 * Math.sin(x * 0.009) : mid(x) - 165 + 16 * Math.sin(x * 0.006 + 2));
const onRoad = (x: number, z: number) => {
  const north = z > mid(x), bz = bankZ(x, north);
  if (Math.abs(z - bz) < 3.5) return true;
  for (const bx of [-SIDE_X, 0, SIDE_X]) if (Math.abs(x - bx) < 3 && away(x, z) > HW + 8 && (north ? z < bz + (bx ? 0 : 400) : z > bz - (bx ? 0 : 400))) return true;
  return false;
};
/** The trench lines along each bank: the Russian on the north, the German jumping-off line on the south, each its own wander. */
const TRENCH = 85;
const trenchZ = (x: number, north = true) => (north ? mid(x) + split(x) + TRENCH + 8 * Math.sin(x * 0.03) : mid(x) - split(x) - TRENCH - 10 * Math.sin(x * 0.023 + 1));

/** Each bank's own rises [x, z, r, h]: the Üxküll heights and the Kirchholm ridge on the north, the dunes by Linden and the wooded rise over the Jungfernhof landing on the south. */
const RISES = [[90, 260, 160, 9], [-330, 380, 150, 6], [250, 140, 170, 5], [-120, -270, 150, 7], [-420, -60, 140, 5], [330, -380, 170, 6]];
function height(x: number, z: number) {
  const d = away(x, z);
  const n = fbm(noise, x * 0.004, z * 0.004, 4), north = z > mid(x);
  // the low sandy bluffs over the river: steeper and higher on the north bank round Üxküll, lower and rolling on the south
  let h = 0.9 + (north ? smoothstep(40, 110, d) * (8 + 3 * Math.exp(-(((x - 40) / 220) ** 2)) + n * 6) : smoothstep(40, 220, d) * (8.5 + n * 6));
  h += fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 1.6 * smoothstep(60, 160, d);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5 * smoothstep(60, 140, d);
  // the wet meadows in the bends: down nearly to the water
  const marsh = marshAt(x, z);
  h += (1.3 - h) * marsh * 0.8;
  // the ramps down to each bridge, the bases' ground
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 1.2 + d * 0.08) - h) * (1 - smoothstep(5, 16, Math.abs(x - bx))) * (1 - smoothstep(120, 170, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 9 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}
function marshAt(x: number, z: number) { return smoothstep(0.25, 0.45, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * (1 - smoothstep(110, 220, away(x, z))); }

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Riga road', 0, 470, 'centre'),
  P('B', 'Kirchholm', -380, 320, 'west'),
  P('C', 'Üxküll', 40, 240, 'centre'),
  P('D', 'Jungfernhof', 300, 320, 'east'),
  P('E', 'Kirchholm landing', -SIDE_X, Math.round(mid(-SIDE_X) + 75), 'west', { radius: 22 }),
  P('F', 'Martinsholm', ISLE, Math.round(mid(ISLE)), 'centre', { radius: 24 }),
  P('G', 'Jungfernhof landing', SIDE_X - 30, Math.round(mid(SIDE_X - 30) - 98), 'east', { radius: 22 }),
  P('H', 'Kekkau', -240, -300, 'west'),
  P('I', 'Linden', -90, -260, 'centre'),
  P('J', 'Katlakaln', 340, -270, 'east'),
  P('K', 'Mitau road', 0, -470, 'centre'),
] as any[];

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'riga',
  name: 'Riga',
  description: '1 September 1917: the German Eighth Army crosses the broad Düna at Üxküll behind a hurricane of gas shells, the storm troops in boats, the pioneers bridging behind them. Pontoon bridges on the flanks, two over Martinsholm island in the middle, a trench line on each bank.',
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
      for (let x = -480; x <= 480; x += 40) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 22, belts: 1, gapEvery: 60 })) {
        if ([-SIDE_X, 0, SIDE_X].some((bx) => Math.abs(w.x - bx) < 9)) continue; // (the roads down to the bridges)
        works.push(w);
      }
      for (const bx of [-SIDE_X, 0, SIDE_X]) works.push({ kind: 'mgNest', x: bx + 14 * s, z: trenchZ(bx + 14 * s, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > mid(x))) < 30;
    const skip = (x: number, z: number) => wet(x, z, 8) || onRoad(x, z) || onRoad(x + 5, z) || onRoad(x - 5, z) || trenchBand(x, z);

    // the villages and manors on each bank, Üxküll's church on its bluff and Linden's
    for (const p of points) {
      if (['A', 'K', 'F'].includes(p.id)) continue;
      const big = p.id === 'C' || p.id === 'I';
      farmVillage(props, p.x, p.z, big ? 9 : 6, 1917 * 10 + Math.round(p.x * 3 + p.z * 7), skip, big ? 1.4 : 1);
    }
    props.rand = mulberry32(1931);
    props.church({ x: 74, z: 262, yaw: 0.2 });
    props.church({ x: -120, z: -232, yaw: Math.PI - 0.4 });
    // Martinsholm: the old church's ruin on the island, its graveyard wall
    props.church({ x: ISLE + 40, z: mid(ISLE + 40), yaw: Math.PI / 2 });
    props.lowWall({ x: ISLE + 40, z: mid(ISLE + 40) + 15, yaw: 0, length: 26, height: 1.1, color: 0x8a867c });
    props.lowWall({ x: ISLE - 30, z: mid(ISLE - 30) - 14, yaw: 0.1, length: 20, height: 1.1, color: 0x8a867c });
    // the pioneers' boats drawn up on the bank by each bridge, a log pile for the bridging (each bank its own)
    for (const s of [1, -1]) {
      props.rand = mulberry32(1947 + s);
      for (const bx of [-SIDE_X, 0, SIDE_X]) {
        const z = (bx === 0 ? (s > 0 ? armN(0) : armS(0)) : mid(bx)) + (HW + 14) * s, dx = 10 + props.rand() * 10;
        props.logPile({ x: bx + dx * s, z, yaw: props.rand() * 0.6, length: 7 });
        props.crates({ x: bx - dx * s, z: z + 6 * s, yaw: props.rand() * 3 });
      }
    }
    // farmsteads, field walls and hay over each bank's fields (each its own)
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'hay'];
    for (let tries = 0, n = 0; n < 140 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.abs(z - mid(x)) < 60 + split(x) || trenchBand(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 45) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const tN = 0.03, tP = evenThreshold(wood, tN, (x, z) => z > mid(x)) - 0.03;   // (each bank its own woods; the south's a little the more)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3600, hedges: 2500, autumn: 0.15, broadleaf: 0.5,
      forest: (x: number, z: number) => {
        if (wet(x, z, 4)) return -1;
        if (trenchBand(x, z)) return 0.05;
        if (marshAt(x, z) > 0.5) return 0.25;                                  // alder and willow scrub in the wet meadows
        return Math.abs(x) > 470 || wood(x, z) > (z > mid(x) ? tN : tP) ? 0.85 : 0;  // birch and pine woods
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
