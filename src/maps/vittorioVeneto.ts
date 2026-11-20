// Vittorio Veneto, 24 October – 4 November 1918: the last Italian offensive. While the Fourth Army bled on Monte Grappa,
// the Tenth (the British XIV Corps in it) waded the Piave at night onto the Grave di Papadopoli, the great gravel
// island in the middle of the braided bed, and on the 27th the Eighth and Tenth crossed the rest of the river on
// pontoon bridges under fire, the Piave running high and fast; the Austro-Hungarian line broke, and in a week the
// armies were in Vittorio Veneto and Trento and Austria-Hungary asked for an armistice.
// On the map: the Piave's wide bed of white gravel between its dykes, two fast arms round the Papadopoli island (fords
// across both at the island, pontoon bridges up and down stream), the villages of the Venetian plain behind each
// dyke, and in the west the edge of the Grappa massif where the river leaves the mountains: Monfenera over the right
// bank, the slopes of Monte Cesen over the left, each with a road up. Not mirrored but fair: both sides have the same
// mountain flank to the west (its spur, a road up it, the same height), the same three crossings over both arms,
// a dyke each, villages at the same reach, and the plain's roads to the east; the river's bends its own.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { plantTrees, plantHedgerows, growGround } from '../world/Vegetation.js';
import { pontoons, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 320;
const HW = 18;
const DYKE = 150;                                                // the dykes' crests, m off the bed's middle
const noise = createNoise2D(1918_1024);
const mid = (x: number) => 18 * Math.sin(x * 0.005 + 0.4) + 8 * Math.sin(x * 0.013) - 12 * Math.cos(x * 0.007) + 8; // (its own bends)
const armN = (x: number) => mid(x) + 58 + 6 * Math.sin(x * 0.017 + 0.3);
const armS = (x: number) => mid(x) - 58 - 7 * Math.sin(x * 0.014 + 1.9);
const CROSS = [-SIDE_X, 0, SIDE_X];
const NAMES = ['Vidor pontoon bridge', 'Papadopoli ford', 'Salettuol pontoon bridge'];
const crossings = CROSS.flatMap((x, i) => [0, 1].map((channel) => (i === 1
  ? { name: NAMES[i], x, kind: 'ford', width: 18, depth: 0.7, channel }
  : { name: NAMES[i], x, kind: 'bridge', width: 6, channel, pontoon: true })));
const river = createRiver({ path: armN, paths: [armN, armS], halfWidth: HW, level: 0, depth: 2.8, valley: 34, crossings });
const away = (x: number, z: number) => Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x)));
const bed = (x: number, z: number) => Math.abs(z - mid(x));
/** The Grappa massif's edge in the west: rises beyond the dykes, the same on both banks. */
const mtnK = (x: number, z: number) => smoothstep(-190, -490, x) ** 1.2 * smoothstep(DYKE - 10, DYKE + 120, bed(x, z));
/** The spurs [x, z, r, h]: Monfenera over the right bank, Monte Cesen's shoulder over the left. */
const SPURS = [[-380, 330, 110, 14], [-375, -345, 110, 14]];

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Montebelluna road', 0, 470, 'centre'),
  P('B', 'Monfenera', -380, 330, 'west', { radius: 24 }),
  P('C', 'Maserada', 40, 280, 'centre'),
  P('D', 'Candelù', SIDE_X + 20, 300, 'east'),
  P('E', 'Pederobba', -SIDE_X + 30, Math.round(mid(-SIDE_X + 30) + DYKE + 30), 'west', { radius: 24 }),
  P('F', 'Grave di Papadopoli', 0, Math.round(mid(0)), 'centre', { radius: 28 }),
  P('G', 'Cimadolmo', SIDE_X - 20, Math.round(mid(SIDE_X - 20) - DYKE - 30), 'east', { radius: 24 }),
  P('H', 'Monte Cesen', -375, -345, 'west', { radius: 24 }),
  P('I', 'Tezze', -40, -270, 'centre'),
  P('J', 'San Polo di Piave', 300, -320, 'east'),
  P('K', 'Vittorio Veneto road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The roads: behind each dyke, from each crossing back to it, the main road on to each base, a rear road through each
 *  side's villages, and the road up each side's spur (graded). */
const dykeRoad = (x: number, s: number) => mid(x) + (DYKE + 22) * s;
const ROADS = [
  [[0, dykeRoad(0, 1)], at('C'), [0, BASE_Z]], [[0, dykeRoad(0, -1)], at('I'), [0, -BASE_Z]],
  [[-500, 270], [-420, 300], at('B'), [-200, 300], at('C'), [200, 290], at('D'), [500, 300]],
  [[-500, -320], at('H'), [-190, -290], at('I'), [140, -300], at('J'), [500, -300]],
  [[-SIDE_X, dykeRoad(-SIDE_X, 1)], [-SIDE_X + 30, dykeRoad(-SIDE_X, 1) + 30], [-370, 260], at('B')],
  [[-SIDE_X, dykeRoad(-SIDE_X, -1)], [-SIDE_X - 10, dykeRoad(-SIDE_X, -1) - 40], [-350, -270], at('H')],
  [[SIDE_X, dykeRoad(SIDE_X, 1)], at('D')], [[SIDE_X, dykeRoad(SIDE_X, -1)], [SIDE_X - 20, dykeRoad(SIDE_X - 20, -1) - 30], at('J')],
];
/** The roads' segments with their boxes: the distance to the nearest, up to `cap` m (the far ones skipped: it's asked for every vertex). */
const SEGS = ROADS.flatMap((r) => r.slice(1).map((b, i) => { const a = r[i]; return [a[0], a[1], b[0], b[1], Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; }));
function roadD(x: number, z: number, cap = 30) {
  let best = cap;
  for (const [ax, az, bx, bz, x0, x1, z0, z1] of SEGS) {
    if (x < x0 - best || x > x1 + best || z < z0 - best || z > z1 + best) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
const onRoad = (x: number, z: number) => {
  const s = z > mid(x) ? 1 : -1, o = (z - mid(x)) * s;
  if (Math.abs(o - DYKE - 22) < 3.2) return true;                                          // behind the dyke
  for (const bx of CROSS) if (Math.abs(x - bx) < 3 && away(x, z) > HW + 6 && o < DYKE + 24) return true; // over the bed to the crossing
  return roadD(x, z, 3.2) < 3.2;
};

function height(x: number, z: number) {
  const b = bed(x, z);
  let h = 3 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.2;                                   // the plain
  const m = mtnK(x, z);
  h += 52 * m + fbm(noise, x * 0.015 + 7, z * 0.015, 3) * 7 * m;                           // the mountain's flank, wooded
  for (const [sx, sz, r, sh] of SPURS) h += sh * smoothstep(r, 0, Math.hypot(x - sx, z - sz)) ** 1.4 * smoothstep(0.1, 0.4, m);
  h += (1.1 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.5 - h) * (1 - smoothstep(DYKE - 22, DYKE - 10, b)); // the gravel bed between the dykes
  const gap = CROSS.some((bx) => Math.abs(x - bx) < 12) ? 0.35 : 1;                         // (cut down where the roads go over the dyke)
  h += 4.6 * (1 - smoothstep(4, 13, Math.abs(b - DYKE))) * gap * (1 - m);                  // the argine
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, h);
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'vittorio-veneto',
  name: 'Vittorio Veneto',
  description: 'October 1918, the last offensive: the Italians and British wade the Piave in flood onto the Grave di Papadopoli and bridge the rest under fire — white gravel, two fast arms, the dykes, the plain’s villages, and the edge of the Grappa massif in the west.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (no strip long and flat enough clear of the villages, hedgerows and the dykes on either bank: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['it', 'uk'], pact: ['ah'] }, // (the Italian Eighth and Tenth Armies, the British XIV Corps in the Tenth, against the Austro-Hungarian Sixth and Isonzo Armies: maps/index.js armiesOn)
  sides: { nato: 'Italy and Britain', pact: 'Austria-Hungary' },
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 19181024,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191810, cell: 64, weights: [0.35, 0.3, 0.1, 0.25] as any }),

  theme: {
    // a grey late-October day, the river high after the rains, the mountains in cloud
    fogColor: 0xa8aca6, fogDensity: 0.0014, skyTop: 0x66788a, skyHorizon: 0xbcc0ba, skyBottom: 0x747870,
    sunColor: 0xf0e4cc, sunIntensity: 1.5, sunDisk: 0.1, clouds: 0.8, cloudLight: 0xd6d8d4, cloudDark: 0x707880,
    sunDir: [0.3, 0.6, 0.45], hemiSky: 0xbcc6cc, hemiGround: 0x5e5a40, hemiIntensity: 1.3, rimColor: 0xc4ccd2, rimIntensity: 0.22,
    terrain: {
      grass: '#5a6634', grassAlt: '#505c2e', dryGrass: '#9c8c56', dirt: '#6e5e46', rock: '#a8a49a', strip: '#544634',
      pasture: '#5a6834', ploughed: '#6e5c44', stubble: '#a8945a', meadow: '#626e38',
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x9c9078, 0.85];                                             // white roads
        const b = bed(x, z);
        if (b < DYKE - 12) return [fbm(noise, x * 0.012 + 8, z * 0.03, 3) > 0.05 ? 0xd2ccbc : 0xa29c88, y < 1.3 ? 1 : 0.85]; // the grave
        if (Math.abs(b - DYKE) < 12 && mtnK(x, z) < 0.3) return [0x767c46, 0.6];                // the dyke's turf
        if (y > 30) {
          const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
          if (g > 0.45) return [0x9a978c, Math.min(1, (g - 0.45) * 3)];                        // limestone outcrops on the flank
        }
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each army's line dug into its dyke, wire toward the river (gaps at the crossings), MG posts on the crest. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, mid(x * s) + (DYKE + 3) * s]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 60 })) if (CROSS.every((bx) => Math.abs(w.x - bx) > 10) && mtnK(w.x, w.z) < 0.25 && !onRoad(w.x, w.z)) works.push(w);
      for (const bx of CROSS) for (const dx of [-18, 18]) works.push({ kind: 'mgNest', x: bx + dx * s, z: mid(bx + dx * s) + DYKE * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const skip = (x: number, z: number) => bed(x, z) < DYKE + 16 || onRoad(x, z) || onRoad(x + 6, z) || onRoad(x - 6, z) || steepAt(x, z) > 0.3;

    // the villages with their campaniles; Pederobba and the hamlets on the mountain spurs
    for (const p of points) {
      if (!['B', 'C', 'D', 'E', 'G', 'H', 'I', 'J'].includes(p.id)) continue;
      const big = p.id === 'C' || p.id === 'I' || p.id === 'J';
      farmVillage(props, p.x, p.z, big ? 9 : 6, 19181 + Math.round(p.x * 3 + p.z * 7), skip, big ? 1.3 : 1);
    }
    props.rand = mulberry32(1024);
    for (const [x, z, yaw] of [[78, 300, 0], [SIDE_X - 10, 330, Math.PI / 2], [-80, -300, Math.PI + 0.3], [270, -350, -Math.PI / 2], [-SIDE_X + 70, mid(-SIDE_X + 70) + DYKE + 55, 0.2]]) if (!onRoad(x, z)) props.church({ x, z, yaw });
    // boats drawn up on the gravel by the crossings, the bridging train's timber (each bank its own); the island's willow scrub is planted below
    for (const s of [1, -1]) for (const bx of CROSS) {
      const z = (s > 0 ? armN(bx) : armS(bx)) + (HW + 12 + props.rand() * 6) * s, dx = 12 + props.rand() * 10;
      props.logPile({ x: bx + dx, z, yaw: props.rand() * 0.6, length: 7 });
      props.crates({ x: bx - dx, z: z + 4 * s, yaw: props.rand() * 3 });
    }
    // farmsteads and hay over each bank's plain (each its own)
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 150 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (bed(x, z) < DYKE + 40 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 45) || skip(x, z) || mtnK(x, z) > 0.3) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    // limestone boulders on the mountain flank
    for (let i = 0, n = 0; i < 3000 && n < 120; i++) {
      const x = -200 - rand() * 300, z = (rand() * 2 - 1) * 540;
      if (mtnK(x, z) < 0.3 || onRoad(x, z) || nearPoint(x, z, 25)) continue;
      n++;
      props.boulder({ x, z, radius: 0.8 + rand() * 1.8 });
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => away(x, z) < HW + 3 || onRoad(x, z) || onRoad(x + 4, z) || onRoad(x - 4, z) || (bed(x, z) < DYKE + 30 && CROSS.some((bx) => Math.abs(x - bx) < 9)) }];
    const north = (x: number, z: number) => z > mid(x);
    const tP = evenThreshold((x, z) => (bed(x, z) > DYKE + 16 && mtnK(x, z) <= 0.2 ? fbm(noise, x * 0.008 + 50, z * 0.008, 3) : -9), 0.38, north);
    // (common2027.js vegetation() with the trees let up the mountain: maxY)
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 3200, autumn: 0.6, broadleaf: 0.85, maxY: 120,
      forest: (x: number, z: number) => {
        const b = bed(x, z);
        if (away(x, z) < HW + 2) return -1;
        if (mtnK(x, z) > 0.2) return fbm(noise, x * 0.01 + 20, z * 0.01, 3) > -0.2 ? 0.8 : 0.1;   // chestnut and beech on the mountain's flank
        if (b < DYKE - 14) return fbm(noise, x * 0.03, z * 0.03, 2) > 0.25 ? 0.5 : 0;          // willow scrub on the grave
        if (Math.abs(b - DYKE) < 16) return 0.03;
        return fbm(noise, x * 0.008 + 50, z * 0.008, 3) > (north(x, z) ? 0.38 : tP) ? 0.6 : 0;  // poplar rows and copses on the plain
      },
    });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 6000, lane: 0,
      avoid: [...avoid, { test: (x: number, z: number) => bed(x, z) < DYKE + 20 || mtnK(x, z) > 0.2 }] });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3, fields: this.fields });
    return { buildings: props.buildings, update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); hedges.update(dt, t); } };
  },
} satisfies MapDef;
