// The Asiago plateau, 15 June 1918: the mountain wing of the Battle of the Solstice. At three in the morning the
// Austro-Hungarian guns opened on the Sette Comuni with gas and high explosive, and the Eleventh Army came down out of
// the woods north of the ruined town of Asiago against the British XIV Corps (the 48th and 23rd Divisions, round
// Cesuna and Monte Kaberlaba) and the Italian divisions on Monte Valbella and Col del Rosso. The British line bent at
// Cesuna and was retaken by noon; by the evening the offensive on the plateau had failed.
// The ground: a high karst plateau a thousand metres up — the open meadows of the Asiago basin with the shelled town in
// the middle and the shallow, mostly dry gully of the Ghelpach across it, dolines (karst hollows) pocking the grass,
// and all round the dark pine and fir forest climbing the wooded rims: Kaberlaba, Cesuna, Valbella over the Allied
// side, Monte Zebio, Monte Interrotto and Col del Rosso over the Austrian. Roads climb out of the basin on both sides.
// Not mirrored but fair: each side has a wooded rim at the same reach from its base with three heights of the same
// height on it (in other places along it), a lateral road along the rim, a trunk road down through its central height
// to the town, and a road from each flank down into the basin; the basin's two villages are each a flank away; the
// Ghelpach's bends and the dolines are the plateau's own.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1918_0615);
/** The Ghelpach's gully across the basin (its own bends). */
const ghel = (x: number) => 38 * Math.cos(x * 0.0062) + 10 * Math.sin(x * 0.017) - 6;
/** Where each side's wooded rim starts climbing out of the basin (m off z = 0). */
const rim = (x: number, n: boolean) => (n ? 150 + 25 * Math.sin(x * 0.007 + 0.5) : 155 + 20 * Math.sin(x * 0.009 + 2));
/** The heights on the rims [x, z, r, h]: Cesuna, Kaberlaba, Valbella; Monte Interrotto, Zebio, Col del Rosso — and the shoulders between. */
const HILLS = [[-340, 300, 110, 16], [-40, 260, 120, 18], [330, 280, 110, 16], [170, 380, 120, 8],
  [-300, -330, 110, 16], [60, -230, 120, 18], [380, -260, 110, 16], [-160, -400, 120, 8]];

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Granezza', 0, 470, 'centre'),
  P('B', 'Cesuna', -340, 300, 'west'),
  P('C', 'Monte Kaberlaba', -40, 260, 'centre', { radius: 24 }),
  P('D', 'Monte Valbella', 330, 280, 'east', { radius: 24 }),
  P('E', 'Canove', -310, 60, 'west', { radius: 24 }),
  P('F', 'Asiago', 15, 5, 'centre', { radius: 32 }),
  P('G', 'Gallio', 340, -90, 'east', { radius: 24 }),
  P('H', 'Monte Interrotto', -300, -330, 'west', { radius: 24 }),
  P('I', 'Monte Zebio', 60, -230, 'centre', { radius: 24 }),
  P('J', 'Col del Rosso', 380, -260, 'east', { radius: 24 }),
  P('K', 'Val d’Assa road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The roads: the trunk from each base through its central height to the town, the lateral along each rim, the basin road, a road from each flank down. */
const ROADS = [
  [[0, BASE_Z], [12, 390], at('C'), [-10, 150], at('F')],
  [[0, -BASE_Z], [-14, -380], at('I'), [30, -120], at('F')],
  [[-500, 330], at('B'), [-190, 290], at('C'), [150, 300], at('D'), [500, 300]],
  [[-500, -300], at('H'), [-120, -260], at('I'), [220, -280], at('J'), [500, -270]],
  [[-500, 60], at('E'), [-150, 30], at('F'), [180, -20], at('G'), [500, -40]],
  [at('B'), [-345, 180], at('E')], [at('J'), [370, -150], at('G')],
  [at('D'), [420, 120], [450, -42]], [at('H'), [-410, -120], [-440, 66]],
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
const onRoad = (x: number, z: number) => roadD(x, z) < 3.4;

/** Dolines: karst hollows over the meadows and in the woods (kept off the points, roads and bases). */
const DOLINES: number[][] = [];
{
  const r = mulberry32(19186);
  for (let i = 0; i < 400 && DOLINES.length < 70; i++) {
    const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 520, rad = 7 + r() * 9;
    if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 45) || roadD(x, z) < rad + 8 || Math.abs(z - ghel(x)) < rad + 10) continue;
    DOLINES.push([x, z, rad, 1.6 + r() * 2.4]);
  }
}

function height(x: number, z: number) {
  const n = z > 0;
  const a = Math.abs(z), r0 = rim(x, n);
  let h = 2 + fbm(noise, x * 0.006, z * 0.006, 3) * 2.2;                                    // the basin's meadows
  h -= 0.022 * x;                                                                           // (the plateau climbs westward, toward the Sette Comuni's high peaks)
  h += 20 * smoothstep(r0 - 40, r0 + 170, a);                                               // the wooded rims
  h += ridged(noise, x * 0.012 + 3, z * 0.012, 3) * 4 * smoothstep(r0, r0 + 120, a);        // knolls and ribs in the forest
  for (const [hx, hz, hr, hh] of HILLS) h += hh * smoothstep(hr, 0, Math.hypot(x - hx, (z - hz) * 1.2)) ** 1.4;
  h -= 4.2 * smoothstep(15, 3, Math.abs(z - ghel(x)));                                       // the Ghelpach's gully
  for (const [dx, dz, dr, dd] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const d = Math.hypot(x - dx, z - dz); if (d < dr) h -= dd * smoothstep(dr, 0, d) ** 1.5; }
  for (const bz of [BASE_Z, -BASE_Z]) { const b = Math.hypot(x, z - bz); if (b < 34) h += (22 - h) * smoothstep(34, 18, b); }
  return h;
}

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'asiago',
  name: 'Asiago',
  description: '15 June 1918: the Austro-Hungarian attack on the Asiago plateau, a thousand metres up — the ruined town in its basin of meadows and dolines, the dry Ghelpach gully, and the pine forest on the rims where the British and Italians held Cesuna, Kaberlaba and Valbella against Zebio and Monte Interrotto.',
  epochs: ['1918'],
  region: 'italy',
  armies: { nato: ['it', 'uk'], pact: ['ah'] }, // (the Italian Sixth Army with the British XIV Corps against the Austro-Hungarian Eleventh Army: maps/index.js armiesOn)
  sides: { nato: 'Italy and Britain', pact: 'Austria-Hungary' },
  conditions: { time: 'dawn', weather: 'fog' },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
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
        if (onRoad(x, z)) return [0x9a907c, 0.9];                                               // the white limestone roads
        if (Math.abs(z - ghel(x)) < 5) return [0xb8b4a6, 0.8];                        // the Ghelpach's dry stony bed
        for (const [dx, dz, dr] of DOLINES) if (Math.abs(x - dx) < dr && Math.abs(z - dz) < dr && Math.hypot(x - dx, z - dz) < dr * 0.45) return [0x6a5a42, 0.45]; // the hollows' bottoms
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 0, z: -360 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each side's line along the foot of its rim over the basin (wire in front, gaps where the roads go), MG posts on the heights. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1, n = s > 0;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) { const X = x * s; pts.push([X, s * (rim(X, n) - 15 + 8 * Math.sin(X * (n ? 0.021 : 0.017)))]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 55 })) if (roadD(w.x, w.z) > 9 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 30)) works.push(w);
      for (const id of n ? ['B', 'C', 'D'] : ['H', 'I', 'J']) { const p = points.find((q) => q.id === id); for (const dx of [-12, 12]) works.push({ kind: 'mgNest', x: p.x + dx, z: p.z - 16 * s, yaw: n ? Math.PI : 0, faction: f }); }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => roadD(x, z) < 9 || Math.abs(z - ghel(x)) < 12 || DOLINES.some(([dx, dz, dr]) => Math.hypot(x - dx, z - dz) < dr + 4);

    // Asiago: shelled stone houses round the square and the great church of San Matteo, its tower broken
    {
      const r = (props.rand = mulberry32(19180));
      const [fx, fz] = at('F');
      const placed: number[][] = [];
      for (let i = 0; i < 90 && placed.length < 42; i++) {
        const a = r() * Math.PI * 2, d = 22 + r() * 75, x = fx + Math.cos(a) * d * 1.3, z = fz + Math.sin(a) * d * 0.8;
        if (skip(x, z) || roadD(x, z) < 13 || Math.hypot(x - fx + 30, z - fz + 34) < 18 || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 13)) continue;
        placed.push([x, z]);
        props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + r() * 0.2, width: 7 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.3 ? 3 : 2, damaged: 0.55 });
      }
      props.church({ x: fx - 30, z: fz - 34, yaw: 0.1 });
      props.sandbagRing({ x: fx + 22, z: fz + 26, radius: 4, toward: 1 });
      props.sandbagRing({ x: fx - 14, z: fz - 30, radius: 4, toward: -1 });
    }
    // the villages: Canove and Gallio in the basin, Cesuna on its rim; malghe (the summer dairies) on the heights
    for (const id of ['E', 'G', 'B']) { const [x, z] = at(id); farmVillage(props, x, z, id === 'B' ? 6 : 8, 19181 + Math.round(x * 3 + z * 7), skip, 1.1); }
    props.rand = mulberry32(19182);
    for (const [x, z] of [[-10, 280], [-310, 320], [355, 300], [85, -250], [-272, -350], [352, -280]]) if (!skip(x, z)) props.house({ x, z, yaw: props.rand() * 3, width: 8, depth: 6, height: 3 });
    // the forest's sawmills and log piles by the rim roads (each side its own); shell-broken limestone and old sangars
    for (const [x, z] of [[-200, 300], [200, 310], [-130, -270], [240, -300]]) { props.logPile({ x, z: z + 12, yaw: 0.2, length: 8 }); props.logPile({ x: x + 10, z: z + 14, yaw: -0.1, length: 7 }); }
    const r = mulberry32(19183);
    for (let i = 0; i < 360; i++) {
      const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 520, big = r();
      if (nearPoint(x, z, 30) || skip(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
      if (big < 0.75) props.boulder({ x, z, radius: 0.8 + r() * 1.6 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 5, height: 1.1, color: 0xa29e92 });
    }
    // hay and stone field walls over the basin's meadows (each half its own)
    for (let i = 0, n = 0; i < 4000 && n < 40; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 140;
      if (skip(x, z) || nearPoint(x, z, 45)) continue;
      n++;
      buildSite(props, { kind: ['hay', 'fieldwall', 'farm', 'rocks'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => roadD(x, z) < 6 || Math.abs(z - ghel(x)) < 5 }];
    // the pine and fir forest on the rims (as much on each), clearings round the malghe; the basin open but for copses
    const wood0 = (x: number, z: number) => fbm(noise, x * 0.007 + 40, z * 0.007, 3);
    const north = (x: number, z: number) => z > 0;
    const forestK = (x: number, z: number) => smoothstep(rim(x, z > 0) - 30, rim(x, z > 0) + 40, Math.abs(z));
    const tP = evenThreshold((x, z) => (forestK(x, z) > 0.5 ? wood0(x, z) : -9), -0.3, north) ;
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, lane: bounds.x - 10, avoid, count: 8500, broadleaf: 0.08, autumn: 0, maxY: 200,
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
