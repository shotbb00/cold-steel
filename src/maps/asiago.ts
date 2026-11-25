// The Asiago plateau, 15 June 1918: the mountain wing of the Battle of the Solstice. At three in the morning the
// Austro-Hungarian guns opened on the Sette Comuni with gas and high explosive, and the Eleventh Army came down out of
// the woods north of the ruined town of Asiago against the British XIV Corps (the 48th and 23rd Divisions, round
// Cesuna and Monte Kaberlaba) and the Italian divisions on Monte Valbella and Col del Rosso. The British line bent at
// Cesuna and was retaken by noon; by the evening the offensive on the plateau had failed.
// The ground: a high karst plateau a thousand metres up, and in the middle of it one wide, shallow basin of meadows —
// the shelled town of Asiago in it, Gallio and Canove at its edges, dolines (karst hollows) pocking the grass and the
// dry Ghelpach gully winding across it — ringed all round by the dark pine and fir forest on the heights: Kaberlaba
// and Lemerle over the British side, Monte Zebio over the Austrian, Valbella and Col del Rosso high on the east. On
// the west the Val d’Assa: a gorge sawn deep and sheer into the plateau, cutting off the corner where Cesuna stands
// in its woods; two causeway bridges carry the roads over it, and nothing else on wheels gets across.
// Fair by distance, not by a mirror: the basin is the plateau’s own (not centred on either side) and each side’s points
// pair up at the same reach from its own base — Kaberlaba against Zebio on the rim, Lemerle against Gallio, Cesuna
// beyond the gorge against Col del Rosso on the high east rim; Canove, Asiago and Valbella lie between the bases.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const EXT = { x: 520, z: 580 };
const noise = createNoise2D(1918_0615);
/** The basin: its middle and how far out (m, the x squeezed) a place lies from it. */
const BX = 70;
const basinR = (x: number, z: number) => Math.hypot((x - BX) / 1.3, z * (z > 0 ? 1 : 0.95));
/** The Val d’Assa across the north-west corner: signed distance from its line (− beyond it, toward the corner). */
const assa = (x: number, z: number) => (x - 0.9 * z + 650 + 26 * Math.sin(z * 0.009 + 1) + 9 * Math.sin(z * 0.031)) / 1.345;
/** The gorge's half-width at the rim (m): it narrows and opens out along its course. */
const assaW = (z: number) => 30 + 9 * Math.sin(z * 0.013 + 0.4) + 4 * Math.sin(z * 0.047);
/** The Ghelpach’s dry gully, winding across the basin. */
const GHEL = [[330, -300], [250, -200], [190, -90], [120, -60], [20, -20], [-80, 40], [-170, 90], [-260, 110]];
/** The heights round the basin [x, z, r, h]: Valbella and Col del Rosso high on the east, Zebio, Kaberlaba, Lemerle; the wooded crest beyond the gorge. */
const HILLS = [[380, 0, 150, 24], [410, -380, 130, 20], [140, -300, 130, 14], [-80, 300, 120, 12], [-300, 150, 110, 8], [-380, 440, 140, 14]];

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Granezza', 0, 470, 'centre'),
  P('B', 'Cesuna', -360, 400, 'west'),
  P('C', 'Monte Kaberlaba', -80, 290, 'centre', { radius: 24 }),
  P('D', 'Monte Valbella', 370, 0, 'east', { radius: 26 }),
  P('E', 'Canove', -230, 0, 'west', { radius: 26 }),
  P('F', 'Asiago', BX, 0, 'centre', { radius: 32 }),
  P('G', 'Gallio', 240, -150, 'east', { radius: 26 }),
  P('H', 'Monte Lemerle', -280, 130, 'west', { radius: 24 }),
  P('I', 'Monte Zebio', 130, -290, 'centre', { radius: 24 }),
  P('J', 'Col del Rosso', 400, -380, 'east', { radius: 24 }),
  P('K', 'Val Frenzela road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The roads: each base's trunk to the town; the ring road round the basin through its villages; the roads up to
 *  the heights; the two roads over the Val d'Assa to Cesuna (the only crossings). */
const ROADS = [
  [[0, BASE_Z], [-20, 380], at('C'), [10, 140], at('F')],
  [[0, -BASE_Z], [60, -400], at('I'), [110, -130], at('F')],
  [at('E'), [-90, -10], at('F'), [200, 20], at('D')],
  [at('E'), at('H'), [-180, 250], at('C')],
  [at('E'), [-120, -170], [40, -230], at('I')],
  [at('F'), [160, -80], at('G'), [330, -100], at('D')],
  [at('G'), [330, -260], at('J')],
  [[0, -BASE_Z], [220, -470], at('J'), [500, -400]],
  [at('D'), [500, 30]],
  [[0, BASE_Z], [200, 360], [330, 180], at('D')],
  [[0, BASE_Z], [-140, 480], [-250, 470], at('B')],                       // over the Val d'Assa’s upper bridge
  [at('H'), [-345, 260], at('B'), [-500, 330]],                           // over the lower bridge
  [at('E'), [-500, -40]],
];
const SEGS = ROADS.flatMap((r) => r.slice(1).map((b, i) => { const a = r[i]; return [a[0], a[1], b[0], b[1], Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; }));
function roadD0(x: number, z: number, cap = 30) {
  let best = cap;
  for (const [ax, az, bx, bz, x0, x1, z0, z1] of SEGS) {
    if (x < x0 - best || x > x1 + best || z < z0 - best || z > z1 + best) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
const roadDc = gridCache((x: number, z: number) => roadD0(x, z, 30), EXT, 2);
const roadD = (x: number, z: number) => roadDc(x, z);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.4;
const ghelD = (x: number, z: number) => (x < -280 || z < -320 ? 99 : segDist(GHEL, x, z));
const ghelDc = gridCache((x: number, z: number) => Math.min(30, ghelD(x, z)), EXT, 2);

/** Dolines: karst hollows over the meadows and in the woods (kept off the points, roads, the gorge and the bases). */
const DOLINES: number[][] = [];
{
  const r = mulberry32(19186);
  for (let i = 0; i < 600 && DOLINES.length < 80; i++) {
    const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 520, rad = 7 + r() * 9;
    if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 45) || roadD0(x, z) < rad + 8 || ghelD(x, z) < rad + 10 || Math.abs(assa(x, z)) < 60 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50) continue;
    DOLINES.push([x, z, rad, 1.6 + r() * 2.4]);
  }
}

/** The plateau before the gorge is sawn into it: the basin, the forest's heights, the dolines and the gully. */
function plateau(x: number, z: number) {
  const r = basinR(x, z);
  let h = 2 + fbm(noise, x * 0.006, z * 0.006, 3) * 2.2;                                     // the basin's meadows
  h += 30 * smoothstep(170, 420, r);                                                         // the wooded heights all round
  h += ridged(noise, x * 0.012 + 3, z * 0.012, 3) * 5 * smoothstep(220, 380, r);             // knolls and ribs in the forest
  for (const [hx, hz, hr, hh] of HILLS) { const d = Math.hypot(x - hx, (z - hz) * 1.1); if (d < hr * 1.6) h += hh * Math.exp(-((d / hr) ** 2) * 1.6); }
  h -= 3.8 * smoothstep(13, 3, ghelDc(x, z));                                                // the Ghelpach's gully
  for (const [dx, dz, dr, dd] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const d = Math.hypot(x - dx, z - dz); if (d < dr) h -= dd * smoothstep(dr, 0, d) ** 1.5; }
  for (const bz of [BASE_Z, -BASE_Z]) { const b = Math.hypot(x, z - bz); if (b < 36) h += (30 - h) * smoothstep(36, 18, b); }
  return h;
}
const plateauC = gridCacheSmooth(plateau, EXT, 2);
/** The gorge: 0 on the plateau, 1 at its floor (sheer below, a talus slope at the lip) — except under the two causeway
 *  bridges (the roads carry over level, a long way either side so the bridges' ends are firm). */
const gorgeK = gridCacheSmooth((x: number, z: number) => {
  const a = Math.abs(assa(x, z)), w = assaW(z);
  if (a > w + 16) return 0;
  const k = 0.75 * smoothstep(w * 0.75, w * 0.3, a) + 0.25 * smoothstep(w + 14, w * 0.6, a);
  return k * (1 - smoothstep(13, 8, roadD0(x, z, 16)));
}, EXT, 2);
function height(x: number, z: number) {
  const h = plateauC(x, z), k = gorgeK(x, z);
  return k > 0 ? h - k * (46 + ridged(noise, x * 0.05 + 2, z * 0.05, 2) * 7 * (1 - k)) : h;
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'asiago',
  name: 'Asiago',
  description: '15 June 1918: the Austro-Hungarian attack on the Asiago plateau, a thousand metres up — the ruined town in its wide basin of meadows and dolines, the dry Ghelpach gully, the pine forest on the heights all round where the British and Italians held Kaberlaba, Lemerle and Valbella against Zebio, and the sheer Val d’Assa gorge cutting off Cesuna.',
  epochs: ['1918'],
  region: 'italy',
  armies: { nato: ['it', 'uk'], pact: ['ah'] }, // (the Italian Sixth Army with the British XIV Corps against the Austro-Hungarian Eleventh Army: maps/index.js armiesOn)
  sides: { nato: 'Italy and Britain', pact: 'Austria-Hungary' },
  conditions: { time: 'dawn', weather: 'fog' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  steep: 0.6, // (wheels cross the Val d'Assa on its two bridges only; the rest of the plateau rolls gently)
  seed: 19180615,
  height,
  fields: createFields({ seed: 191861, cell: 60, weights: [0.6, 0.1, 0.05, 0.25] as any }),

  theme: {
    // a June dawn on the high plateau: mist in the forest, the gas lying in the hollows
    fogColor: 0xa8b0ac, fogDensity: 0.0016, skyTop: 0x6a849c, skyHorizon: 0xc4cac4, skyBottom: 0x707a70,
    sunColor: 0xffe2c0, sunIntensity: 1.6, sunDisk: 0.2, clouds: 0.5, cloudLight: 0xe4e6e2, cloudDark: 0x8a9298,
    sunDir: [0.5, 0.45, 0.4], hemiSky: 0xbccad4, hemiGround: 0x4e5a3a, hemiIntensity: 1.3, rimColor: 0xd0d8dc, rimIntensity: 0.25,
    terrain: {
      grass: '#55703a', grassAlt: '#4c6634', dryGrass: '#8c8a56', dirt: '#6a5c44', rock: '#a6a49a', strip: '#4e4434',
      pasture: '#5a7640', ploughed: '#6a5c48', stubble: '#a49a5c', meadow: '#64803e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x9a907c, 0.9];                                              // the white limestone roads
        const g = gorgeK(x, z);
        if (g > 0.08) return g > 0.85 ? [0x8a8676, 0.8] : [0xa8a498, Math.min(0.95, 0.5 + g)]; // the gorge's grey walls, its stony floor
        if (ghelDc(x, z) < 4.5) return [0xb8b4a6, 0.8];                                        // the Ghelpach's dry stony bed
        for (const [dx, dz, dr] of DOLINES) if (Math.abs(x - dx) < dr && Math.abs(z - dz) < dr && Math.hypot(x - dx, z - dz) < dr * 0.45) return [0x6a5a42, 0.45]; // the hollows' bottoms
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 60, z: -360 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each side's line along the forest's edge over the basin (wire in front, gaps where the roads go), MG posts on the heights. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let k = 0; k <= 40; k++) {                                                         // the basin's edge on its own half, left to right as its owner looks
        const a = s > 0 ? Math.PI * (0.94 - 0.88 * k / 40) : -Math.PI * (0.06 + 0.88 * k / 40);
        const R = 225 + (s > 0 ? 10 * Math.sin(k * 0.7) : 12 * Math.sin(k * 0.55 + 1));
        pts.push([BX + Math.cos(a) * R * 1.3, Math.sin(a) * R]);
      }
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 55 })) if (roadD(w.x, w.z) > 9 && gorgeK(w.x, w.z) < 0.02 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 30)) works.push(w);
      for (const id of s > 0 ? ['B', 'C', 'H'] : ['G', 'I', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-12, 12]) if (roadD(p.x + dx, p.z - 16 * s) > 7) works.push({ kind: 'mgNest', x: p.x + dx, z: p.z - 16 * s, yaw: s > 0 ? Math.PI : 0, faction: f }); }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => roadD(x, z) < 9 || ghelDc(x, z) < 12 || gorgeK(x, z) > 0.01 || Math.abs(assa(x, z)) < 40 || DOLINES.some(([dx, dz, dr]) => Math.hypot(x - dx, z - dz) < dr + 4);

    // Asiago: shelled stone houses round the square and the great church of San Matteo, its tower broken
    {
      const r = (props.rand = mulberry32(19180));
      const [fx, fz] = at('F');
      const placed: number[][] = [];
      for (let i = 0; i < 120 && placed.length < 46; i++) {
        const a = r() * Math.PI * 2, d = 22 + r() * 80, x = fx + Math.cos(a) * d * 1.3, z = fz + Math.sin(a) * d * 0.8;
        if (skip(x, z) || roadD(x, z) < 13 || Math.hypot(x - fx + 30, z - fz + 34) < 18 || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 13)) continue;
        placed.push([x, z]);
        props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + r() * 0.2, width: 7 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.3 ? 3 : 2, damaged: 0.55 });
      }
      props.church({ x: fx - 30, z: fz - 34, yaw: 0.1 });
      props.sandbagRing({ x: fx + 22, z: fz + 26, radius: 4, toward: 1 });
      props.sandbagRing({ x: fx - 14, z: fz - 30, radius: 4, toward: -1 });
    }
    // the villages: Canove and Gallio at the basin's edge, Cesuna in its woods beyond the gorge; malghe (the summer dairies) on the heights
    for (const id of ['E', 'G', 'B']) { const [x, z] = at(id); farmVillage(props, x, z, id === 'B' ? 7 : 9, 19181 + Math.round(x * 3 + z * 7), skip, 1.1); }
    props.rand = mulberry32(19182);
    for (const [x, z] of [[-60, 318], [-300, 154], [395, 22], [160, -318], [380, -400], [-410, 300]]) if (!skip(x, z)) props.house({ x, z, yaw: props.rand() * 3, width: 8, depth: 6, height: 3 });
    // the forest's sawmills and log piles by the roads (each side its own); shell-broken limestone and old sangars
    for (const [x, z] of [[-160, 360], [220, 330], [-60, -250], [300, -300], [-420, 360]]) if (!skip(x, z)) { props.logPile({ x, z: z + 12, yaw: 0.2, length: 8 }); props.logPile({ x: x + 10, z: z + 14, yaw: -0.1, length: 7 }); }
    // the Val d'Assa's causeway bridges: stone parapets along both edges
    for (const [ax, az, bx, bz] of [[-140, 480, -250, 470], [-345, 260, -360, 400]]) {
      const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, yaw = Math.atan2(-uz, ux);
      for (let u = 0; u < L; u += 8) { const x = ax + ux * u, z = az + uz * u; if (Math.abs(assa(x, z)) > 30) continue; for (const s of [-1, 1]) props.lowWall({ x: x + uz * 6.5 * s, z: z - ux * 6.5 * s, yaw, length: 8.4, height: 1.0, color: 0xa29e92 }); }
    }
    const r = mulberry32(19183);
    for (let i = 0; i < 420; i++) {
      const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 520, big = r();
      if (nearPoint(x, z, 30) || skip(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      if (big < 0.75) props.boulder({ x, z, radius: 0.8 + r() * 1.6 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 5, height: 1.1, color: 0xa29e92 });
    }
    // hay and stone field walls over the basin's meadows
    for (let i = 0, n = 0; i < 4000 && n < 44; i++) {
      const x = BX + (r() * 2 - 1) * 300, z = (r() * 2 - 1) * 220;
      if (basinR(x, z) > 200 || skip(x, z) || nearPoint(x, z, 45)) continue;
      n++;
      buildSite(props, { kind: ['hay', 'fieldwall', 'farm', 'rocks'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => roadD(x, z) < 6 || ghelDc(x, z) < 5 || gorgeK(x, z) > 0.3 }];
    // the pine and fir forest on the heights all round (as much on each half), clearings round the malghe; the basin open but for copses
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.007 + 40, z * 0.007, 3);
    const north = (x: number, z: number) => z > 0;
    const forestK = (x: number, z: number) => smoothstep(200, 260, basinR(x, z));
    const tP = evenThreshold((x, z) => (forestK(x, z) > 0.5 ? wood0(x, z) : -9), -0.3, north);
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, avoid, count: 6000, broadleaf: 0.08, autumn: 0, maxY: 200,
      forest: (x: number, z: number) => {
        const k = forestK(x, z), w = wood0(x, z);
        if (k < 0.5) return w > 0.35 ? 0.35 : 0;                                              // copses in the basin
        return w > (z > 0 ? -0.3 : tP) ? 0.9 : 0.15;                                          // the forest
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.4, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
