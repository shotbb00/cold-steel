// Niš, 12 October 1918: the liberation of Serbia’s wartime capital. Three weeks after the Salonika front broke at Dobro
// Pole, Vojvoda Bojović’s Serbian First Army had marched three hundred kilometres north up the Vardar and the Morava,
// with French cavalry and the Armée d’Orient behind it. At Niš the Germans of von Gallwitz’s new Eleventh Army group and
// the Austro-Hungarian divisions brought down from the Italian front tried to hold the line of the Nišava; the Morava
// and Timok divisions forced the crossings, cleared the town street by street and the fortress gate by gate, and on
// 12 October the Serbs were back in the city they had left in 1915. Belgrade fell to them on 1 November.
// On the map: the Nišava across the middle, west to east, with the town bridge under the Stambol gate, the railway bridge
// of the Belgrade–Salonika line downstream and the Brzi Brod ford upstream; on the north bank the Ottoman fortress (Niška
// tvrđava) on its low rise by the river — the stone curtain, the corner bastions, the Stambol gate facing the bridge, the
// Bali-beg mosque, the hammam and the arsenal inside — the railway station and its sidings west of it on the Belgrade
// line, Medoševac out on the Morava plain and Vinik’s hill behind; on the south bank the town round the Orthodox
// cathedral (Saborna crkva) under Gorica’s hill, Ćele Kula — the tower of skulls in its chapel — out on the Sofia road,
// Bubanj’s hill behind. The Morava valley opens flat to the west with orchards and maize; the hills of the Nišava gorge
// close the east on both banks. Mobile late-war fighting, no trench system: rearguard machine-gun posts, sandbagged
// scrapes and log barricades at the bridgeheads and in the streets.
// (Coordinates: +z is the south bank, +x east — the map is seen from the Serbian side, so the Serbian base is at +z.)
// Not mirrored but fair: each side holds one bank with the same three crossings between them (each a few metres off the
// middle). The fortress is answered by Gorica: the same height and nearly the same area (a squarish rise by the river
// against a round hill), each with its point on a flat summit the same distance from the river and its own base; the
// station quarter by the cathedral quarter, Medoševac by Ćele Kula, Vinik by Bubanj (same height and area, other turns
// and corners). The flat Morava plain in the west and the gorge hills in the east run across both banks alike. Each
// bank its own orchards, cut to the same wooded share; the points’ leads sum to a few metres.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost } from './common.js';
import { vegetation } from './common2027.js';
import { evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SEED = 1918_1012;
const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const noise = createNoise2D(SEED);

// ---- the Nišava across the middle, east to west; its three crossings
const vall = (x: number) => 14 * Math.sin(x * 0.0061 + 1.2) + 6 * Math.sin(x * 0.017 + 0.3);
const away = (x: number, z: number) => Math.abs(z - vall(x));
const south = (x: number, z: number) => z > vall(x);
const XR = -345, XS = -10, XF = 300;   // the railway bridge, the town bridge, the Brzi Brod ford
const river = createRiver({
  path: vall, halfWidth: 13, level: 0, depth: 3, valley: 46,
  crossings: [
    { name: 'Railway bridge', x: XR, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Town bridge', x: XS, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Brzi Brod ford', x: XF, kind: 'ford', width: 14, depth: 0.6, channel: 0 },
  ],
});
const wet = (x: number, z: number, m = 0) => away(x, z) < 13 + m;

// ---- the points
const points: ControlPointDef[] = [
  { id: 'A', name: 'Leskovac road', x: 25, z: 465, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Ćele Kula', x: 300, z: 280, owner: null, sector: 'east' },
  { id: 'C', name: 'Gorica', x: 60, z: 118, owner: null, sector: 'centre', radius: 24 },
  { id: 'D', name: 'Saborna crkva', x: 225, z: 100, owner: null, sector: 'east', radius: 30 },
  { id: 'E', name: 'Railway bridge', x: XR, z: Math.round(vall(XR)), owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Town bridge', x: XS, z: Math.round(vall(XS)), owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Brzi Brod ford', x: XF, z: Math.round(vall(XF)), owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Niš station', x: -265, z: -95, owner: null, sector: 'west', radius: 30 },
  { id: 'I', name: 'Niška tvrđava', x: -40, z: -112, owner: null, sector: 'centre', radius: 24 },
  { id: 'J', name: 'Medoševac', x: -345, z: -312, owner: null, sector: 'west' },
  { id: 'K', name: 'Belgrade road', x: -25, z: -465, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the heights: the fortress a squarish rise by the river, Gorica a round hill (same summit, nearly the same area, both
// flat-topped); Vinik behind the north bank, Bubanj behind the south (the same again, larger, turned other ways)
const ell = (x: number, z: number, cx: number, cz: number, rx: number, rz: number, rot = 0) => {
  const dx = x - cx, dz = z - cz, c = Math.cos(rot), s = Math.sin(rot);
  return Math.hypot((dx * c - dz * s) / rx, (dx * s + dz * c) / rz);
};
const FORT = (x: number, z: number) => Math.sqrt(Math.hypot(((x + 40) / 135) ** 2, ((z + 112) / 100) ** 2)); // (a superellipse, p = 4)
const GOR = (x: number, z: number) => Math.hypot(x - 60, z - 118) / 127;
const VINIK = (x: number, z: number) => ell(x, z, 360, -430, 200, 92, 0.3);
const BUBANJ = (x: number, z: number) => ell(x, z, -350, 415, 215, 86, -0.15);

/** Distance to the nearest segment of `polys` ([[x, z], …] each), capped at `cap`: segments bucketed on a 32 m grid. */
function segField(polys: number[][][], cap: number) {
  const C = 32, grid = new Map<number, number[][]>(), key = (i: number, j: number) => i * 4096 + j;
  for (const poly of polys) for (let k = 0; k < poly.length - 1; k++) {
    const [ax, az] = poly[k], [bx, bz] = poly[k + 1], seg = [ax, az, bx, bz];
    for (let i = Math.floor((Math.min(ax, bx) - cap) / C); i <= Math.floor((Math.max(ax, bx) + cap) / C); i++)
      for (let j = Math.floor((Math.min(az, bz) - cap) / C); j <= Math.floor((Math.max(az, bz) + cap) / C); j++) {
        const g = grid.get(key(i, j)); if (g) g.push(seg); else grid.set(key(i, j), [seg]);
      }
  }
  return (x: number, z: number) => {
    const segs = grid.get(key(Math.floor(x / C), Math.floor(z / C)));
    let best = cap * cap;
    if (segs) for (const [ax, az, bx, bz] of segs) {
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), ex = x - ax - dx * t, ez = z - az - dz * t;
      best = Math.min(best, ex * ex + ez * ez);
    }
    return Math.sqrt(best);
  };
}
const line = (x0: number, x1: number, off: number) => Array.from({ length: Math.round((x1 - x0) / 25) + 1 }, (_, i) => [x0 + i * 25, vall(x0 + i * 25) + off]);
const over = (x: number) => [[x, vall(x) + 46], [x, vall(x) - 46]];

// ---- the roads: one along each bank, over the three crossings, out to each base and up to each height
const ROADS = [
  line(-525, 525, 46), line(-525, 525, -46), over(XR), over(XS), over(XF),
  [[25, 580], at('A'), [10, 380], [40, 250], at('C')], [at('C'), [20, 70], [XS, vall(XS) + 46]],            // the Leskovac road over Gorica to the bridge
  [[-25, -580], at('K'), [-10, -380], [-30, -250], at('I')], [at('I'), [-20, -70], [XS, vall(XS) - 46]],   // the Belgrade road through the fortress and the Stambol gate
  [at('A'), [170, 410], at('B'), [320, 150], [XF, vall(XF) + 46]],                                         // the Sofia road past Ćele Kula to the ford
  [at('K'), [-170, -400], at('J'), [-345, -150], [XR, vall(XR) - 46]],                                     // Medoševac and the railway bridge
  [at('A'), [140, 360], [220, 220], at('D'), [240, vall(240) + 46]],                                       // the cathedral quarter
  [at('K'), [-140, -360], [-210, -230], at('H'), [-230, vall(-230) - 46]],                                 // the station
  [at('A'), [-200, 330], [-320, 170], [XR, vall(XR) + 46]],
  [at('K'), [200, -330], [290, -170], [XF, vall(XF) - 46]],
  [at('C'), [150, 100], at('D')], [at('I'), [-140, -100], at('H')],                                        // the lanes in town
];
const roadD = gridCache(segField(ROADS, 60), EXT, 2);
/** The railway: the Belgrade line along the north bank to the station, the Salonika line over the railway bridge and away down the Morava. */
const RAILS = [
  [[-525, -440], [-420, -200], ...line(-325, -100, -80)],
  [[-325, vall(-325) - 80], [XR, vall(XR) - 30], [XR, vall(XR) + 30], [-440, 150], [-525, 255]],
];
const railD = gridCache(segField(RAILS, 40), EXT, 2);

// ---- the ground: the valley floor rising gently to each base, the four heights, the Morava plain flat in the west, the gorge hills east
const ground = gridCacheSmooth((x: number, z: number) => {
  const a = away(x, z);
  let h = 1.6 + 9 * smoothstep(40, 420, a) + fbm(noise, x * 0.006, z * 0.006, 3) * 3 * smoothstep(30, 120, a) + fbm(noise, x * 0.03 + 7, z * 0.03, 2) * 0.4;
  h += (3 + 3 * smoothstep(40, 420, a) - h) * 0.6 * smoothstep(-300, -470, x);                       // the Morava plain, west on both banks
  h += 24 * smoothstep(370, 520, x) * smoothstep(70, 220, a);                                         // the Nišava gorge hills, east on both banks
  h += 13 * smoothstep(1, 0.45, FORT(x, z)) ** 1.2;
  h += 13 * smoothstep(1, 0.45, GOR(x, z)) ** 1.2;
  h += 36 * smoothstep(1, 0.2, VINIK(x, z)) ** 1.3;
  h += 36 * smoothstep(1, 0.2, BUBANJ(x, z)) ** 1.3;
  h += smoothstep(480, 620, Math.abs(x)) * 10 + smoothstep(545, 680, Math.abs(z)) * 10;              // (the rims beyond the edges)
  for (const p of points) if (p.id !== 'C' && p.id !== 'I') h += (h * 0.4 + 2 - h) * 0.4 * smoothstep(40, 20, Math.hypot(x - p.x, z - p.z)); // (the towns’ flats)
  for (const bz of [BASE_Z, -BASE_Z]) h += (9 - h) * smoothstep(40, 20, Math.hypot(x, z - bz));
  return h;
}, EXT, 2);
const height = (x: number, z: number) => river.carve(x, z, ground(x, z));

// ---- the town quarters: the cathedral quarter east of Gorica on the south bank, the station quarter west of the fortress on the north
const QUARTERS = [{ x: 160, z: 82, rx: 140, rz: 58 }, { x: -160, z: -82, rx: 140, rz: 58 }];
const inTown = (x: number, z: number) => QUARTERS.some((q) => ell(x, z, q.x, q.z, q.rx, q.rz) < 1);

// ---- the orchards: each bank its own, cut to the same share
const on = (x: number, z: number) => fbm(noise, x * 0.012 + 40, z * 0.012 - 9, 3);
const orchardOk = (x: number, z: number) => away(x, z) > 30 && !inTown(x, z) && FORT(x, z) > 0.6 && GOR(x, z) > 0.55 && Math.abs(Math.abs(z) - BASE_Z) > 50;
const T_N = 0.12, T_P = evenThreshold((x, z) => (orchardOk(x, z) ? on(x, z) : -9), T_N, south);
const orchard = gridCache((x: number, z: number) => orchardOk(x, z) && on(x, z) > (south(x, z) ? T_N : T_P) && roadD(x, z) > 6 && railD(x, z) > 7 ? 1 : 0, EXT, 4);

// ---- the forward edges: each side’s rearguard posts along its own bank
const edgeZ = (x: number, f: 'nato' | 'pact') => vall(x) + (f === 'nato' ? 62 + 6 * Math.sin(x * 0.019) : -64 - 6 * Math.sin(x * 0.016 + 1));

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1. četa, 1. bataljon, 13. pešadijski puk' }];

export default {
  id: 'nis',
  name: 'Niš',
  description: '12 October 1918: the Serbian First Army, three weeks up from the Salonika breakthrough, takes back its wartime capital from the Germans and Austro-Hungarians. The Nišava through the town with its bridges, the Ottoman fortress and its Stambol gate on the river bank, the cathedral under Gorica, Ćele Kula on the Sofia road, the station on the Belgrade–Salonika line; orchards and maize on the Morava plain.',
  epochs: ['1918'],
  region: 'balkans', // (the Salonika front)
  airfields: [], // (no strip fits between the town, the river, the orchards and the hills: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['serb', 'fr'], pact: ['de', 'ah'] }, // (the Serbian First Army with French troops behind it against von Gallwitz’s Germans and the Austro-Hungarian divisions)
  sides: { nato: 'Serbia and France', pact: 'Germany and Austria-Hungary' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: SEED, cell: 64, weights: [0.25, 0.25, 0.3, 0.2] as any }),   // (mid-October: maize stubble and standing maize, plough, pasture)
  woods: (x: number, z: number) => orchard(x, z) * 0.6,

  theme: {
    // a hazy mid-October morning in the Morava valley, the sun low in the south-east; smoke over the town
    fogColor: 0xc4bcaa, fogDensity: 0.0012, skyTop: 0x5f7e9c, skyHorizon: 0xd6ccb6, skyBottom: 0x847e6c,
    sunColor: 0xffdcae, sunIntensity: 1.5, sunDisk: 0.22, clouds: 0.35, cloudLight: 0xf0eadc, cloudDark: 0x948c7e,
    sunDir: [0.6, 0.38, 0.55], hemiSky: 0xc8c8c2, hemiGround: 0x605844, hemiIntensity: 1.3, rimColor: 0xded2be, rimIntensity: 0.25,
    terrain: {
      grass: '#6a6e3e', grassAlt: '#626638', dryGrass: '#a2925a', dirt: '#786446', rock: '#a49c88', strip: '#524430',
      pasture: '#747240', ploughed: '#786244', stubble: '#b4a064', meadow: '#7a7842',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [inTown(x, z) || FORT(x, z) < 0.45 ? 0x8c8474 : 0xa6967a, 0.9];   // the cobbles in town and the fortress, dust tracks outside
        if (railD(x, z) < 2.4) return [0x5a5248, 0.85];                                        // ballast
        if (inTown(x, z)) return [0x988a70, 0.55];                                             // the trodden ground between the houses
        if (FORT(x, z) < 0.45) return [0x8e8a6e, 0.5];                                         // the parade ground inside the walls
        if (y < 1.6 && wet(x, z, 12)) return [0x786e54, 0.6];                                  // the gravel banks
        if (GOR(x, z) < 0.3) return [0x8a8a5a, 0.45];                                          // Gorica’s grass top
        if (y > 30) return [0x9a8c56, 0.55];                                                   // the dry grass of the heights
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-200, 0, 200] }, pact: { x: 0, z: -BASE_Z, entries: [-200, 0, 200] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Kompanie, Reserve-Infanterie-Regiment 11' })),
  },

  /** Rearguards, not trenches: sandbagged scrapes and machine-gun posts along each bank, the most at the crossings. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const r = mulberry32(f === 'nato' ? 1012 : 1015), yaw = f === 'nato' ? Math.PI : 0, s = f === 'nato' ? 1 : -1;
      for (let x = -460 + r() * 30; x < 470; x += 55 + r() * 35) {
        const z = edgeZ(x, f) + (r() - 0.5) * 10;
        if (roadD(x, z) < 8 || railD(x, z) < 8 || inTown(x, z) || FORT(x, z) < 0.55 || orchard(x, z) || nearPt(x, z, 28) || wet(x, z, 20)) continue;
        works.push({ kind: 'trench', x, z, yaw, faction: f });
        if (r() < 0.3) works.push({ kind: 'mgNest', x: x + 5, z: z + 6 * s, yaw, faction: f });
      }
      for (const cx of [XR, XS, XF]) for (const dx of [-22, 22]) {
        const x = cx + dx + (s > 0 ? 3 : -3), z = vall(x) + s * 58;
        if (roadD(x, z) > 7 && railD(x, z) > 7 && FORT(x, z) > 0.5) works.push({ kind: 'mgNest', x, z, yaw, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => roadD(x, z) > r + 3 && railD(x, z) > r + 4 && !wet(x, z, r + 14) && steepAt(x, z) < 0.22
      && !placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + r + 2);
    const mark = (x: number, z: number, r: number) => placed.push([x, z, r]);

    // ---- the fortress: the stone curtain round the flat top, a bastion at each corner, the Stambol gate where the road comes up from the bridge
    const [fx, fz] = at('I'), HX = 58, HZ = 42;
    {
      props.rand = mulberry32(1012);
      const sides: [number, number, number, number][] = [[-HX, -HZ, HX, -HZ], [HX, -HZ, HX, HZ], [HX, HZ, -HX, HZ], [-HX, HZ, -HX, -HZ]];
      for (const [x0, z0, x1, z1] of sides) {
        const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 8), yaw = -Math.atan2(z1 - z0, x1 - x0);
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n, x = fx + x0 + (x1 - x0) * t, z = fz + z0 + (z1 - z0) * t;
          if (roadD(x, z) < 6) {                                                           // a gate: its two towers
            if (z1 === z0 && z0 > 0) for (const o of [-6, 6]) {
              const gx = x + o, g = terrain.heightAt(gx, z);
              props.box('stone', gx, g + 3, z, 4, 7.5, 5, 0, 0x9e9480);
              cover.addBox({ x: gx, z, yaw: 0, length: 4, thickness: 5, height: 7 });
            }
            continue;
          }
          props.wall({ x, z, yaw, length: len / n + 0.6, height: 4.2, thickness: 1.8 });
        }
      }
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {                       // the bastions
        const x = fx + sx * HX, z = fz + sz * HZ, g = terrain.heightAt(x, z);
        props.box('stone', x, g + 1.8, z, 10, 5, 10, Math.PI / 4, 0x968c78);
        cover.addBox({ x, z, yaw: Math.PI / 4, length: 10, thickness: 10, height: 4.5 });
      }
      // inside: the Bali-beg mosque, the hammam, the arsenal, the barracks
      const mx = fx + 26, mz = fz - 14;
      props.flatHouse({ x: mx, z: mz, yaw: 0, width: 11, depth: 11, name: 'Bali-beg mosque', dome: true });
      { const x = mx + 8, z = mz - 4, g = terrain.heightAt(x, z), m = new THREE.Matrix4();
        props.push('stone', new THREE.CylinderGeometry(0.85, 1.1, 20, 8), m.makeTranslation(x, g + 10, z), 0xe0dacb);
        props.push('stone', new THREE.CylinderGeometry(1.6, 1.3, 0.6, 8), m.makeTranslation(x, g + 16.5, z), 0xcdc4b0);
        props.push('plain', new THREE.ConeGeometry(0.95, 3.6, 8), m.makeTranslation(x, g + 21.8, z), 0x5a5e66);
        cover.addCylinder({ x, z, radius: 1.2, height: 20 }); }
      props.flatHouse({ x: fx - 30, z: fz - 18, yaw: 0, width: 10, depth: 8, name: 'fortress hammam', dome: true });
      props.hall({ x: fx - 22, z: fz + 20, yaw: 0, width: 22, depth: 9, height: 5.5, color: 0x9a8a72, roof: 0x6a5c4c, door: 4, name: 'arsenal' });
      props.townHouse({ x: fx + 30, z: fz + 20, yaw: 0, width: 16, depth: 8, storeys: 2, name: 'fortress barracks', damaged: 0.05 });
      mark(fx, fz, Math.hypot(HX, HZ) + 4);
    }

    // ---- the south bank: the cathedral, the town houses round it; Ćele Kula in its chapel on the Sofia road
    props.rand = mulberry32(1918_12);
    { const [dx, dz] = at('D'); if (free(dx + 34, dz + 10, 12)) { props.church({ x: dx + 34, z: dz + 10, yaw: Math.PI / 2 }); mark(dx + 34, dz + 10, 13); } }
    { const [bx, bz] = at('B');
      for (const [ox, oz] of [[26, 16], [-26, 18], [24, -20], [-24, -18]]) if (free(bx + ox, bz + oz, 5)) {
        props.flatHouse({ x: bx + ox, z: bz + oz, yaw: 0.1, width: 6, depth: 6, name: 'Ćele Kula', dome: true }); mark(bx + ox, bz + oz, 6); break;
      } }
    if (free(60, vall(60) + 68, 8)) { props.church({ x: 60, z: vall(60) + 68, yaw: 0 }); mark(60, vall(60) + 68, 12); }
    // ---- the north bank: the station on the line, its goods shed and sidings, the water tower
    const [hx] = at('H'), sz = vall(hx) - 80;
    props.townHouse({ x: hx + 10, z: sz - 12, yaw: 0, width: 18, depth: 9, storeys: 2, name: 'Niš station', damaged: 0 }); mark(hx + 10, sz - 12, 11);
    props.hall({ x: hx - 40, z: sz - 13, yaw: 0, width: 22, depth: 10, height: 6, color: 0x7a6250, door: 6, name: 'goods shed' }); mark(hx - 40, sz - 13, 13);
    for (const [x, kind] of [[hx - 70, 'box'], [hx - 56, 'open'], [hx + 50, 'box'], [hx + 64, 'box']] as [number, string][]) props.wagon({ x, z: vall(x) - 80, yaw: Math.atan2(1, (vall(x + 1) - vall(x - 1)) / 2), kind });
    // ---- the houses of both quarters: tiled town houses and plastered Ottoman houses, as many on each bank
    for (const [qi, q] of QUARTERS.entries()) {
      const r = mulberry32(qi ? 4411 : 4477);
      props.rand = r;
      for (let i = 0, n = 0; i < 900 && n < 44; i++) {
        const x = q.x + (r() * 2 - 1) * q.rx, z = q.z + (r() * 2 - 1) * q.rz;
        if (ell(x, z, q.x, q.z, q.rx, q.rz) > 1 || !free(x, z, 5) || nearPt(x, z, 14) || FORT(x, z) < 0.62 || GOR(x, z) < 0.4) continue;
        const yaw = Math.atan2(vall(x + 1) - vall(x - 1), 2) + (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2;
        if (r() < 0.55) props.townHouse({ x, z, yaw, width: 7 + r() * 3, depth: 7 + r() * 2, storeys: r() < 0.4 ? 2 : 1, damaged: 0.05 });
        else props.flatHouse({ x, z, yaw, width: 6 + r() * 3, depth: 6 + r() * 2, storeys: r() < 0.3 ? 2 : 1 });
        mark(x, z, 5); n++;
      }
    }
    // ---- the villages: Medoševac and the houses along the Sofia road, farmsteads round their points; a church in Medoševac
    for (const [id, sd] of [['B', 51], ['J', 57]] as [string, number][]) {
      const [px, pz] = at(id), r = mulberry32(sd);
      props.rand = r;
      if (id === 'J' && free(px - 30, pz + 24, 12)) { props.church({ x: px - 30, z: pz + 24, yaw: 0 }); mark(px - 30, pz + 24, 13); }
      for (let i = 0, n = 0; i < 300 && n < 9; i++) {
        const a = r() * Math.PI * 2, d = 18 + r() * 40, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
        if (!free(x, z, 5) || orchard(x, z)) continue;
        props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (r() - 0.5) * 0.3, width: 7 + r() * 3, depth: 6 + r() * 2 });
        if (r() < 0.5) props.lowWall({ x: x + 6, z: z + 5, yaw: r() < 0.5 ? 0 : Math.PI / 2, length: 6 + r() * 5, height: 1.4, color: 0xa29a88 });
        mark(x, z, 6); n++;
      }
    }
    // ---- the barricades: carts and logs beside the bridgehead roads and in the streets, as many on each bank
    for (const [f, s] of [['nato', 1], ['pact', -1]] as [string, number][]) {
      const r = mulberry32(f === 'nato' ? 771 : 779);
      props.rand = r;
      for (const cx of [XR, XS, XF, s > 0 ? 160 : -160]) for (let k = 0, n = 0; k < 40 && n < 3; k++) {
        const x = cx + (r() * 2 - 1) * 40, z = vall(x) + s * (40 + r() * 40), d = roadD(x, z);
        if (d < 4.5 || d > 9 || railD(x, z) < 6 || wet(x, z, 4) || FORT(x, z) < 0.62 || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 3)) continue;
        props.logBarricade({ x, z, yaw: r() * Math.PI, length: 5 + r() * 3 }); mark(x, z, 4); n++;
      }
    }
    // shepherds’ walls and boulders on the hills; sandbags on the two summits
    const r = mulberry32(1210);
    props.rand = r;
    for (let i = 0; i < 260; i++) {
      const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 540;
      if (Math.min(VINIK(x, z), BUBANJ(x, z), GOR(x, z) * 1.3) > 0.9 || !free(x, z, 3) || nearPt(x, z, 30) || inTown(x, z)) continue;
      if (r() < 0.75) props.boulder({ x, z, radius: 0.7 + r() * 1.8 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 4, height: 1.2, color: 0xa29a88 });
    }
    { const [cx, cz] = at('C'); for (const [dx, dz] of [[-20, -16], [22, -10], [0, 24]]) props.sandbagRing({ x: cx + dx, z: cz + dz, radius: 3.5, toward: -1 }); }
    // the railway
    for (const poly of RAILS) for (let i = 0; i < poly.length - 1; i++) props.rails({ x0: poly[i][0], z0: poly[i][1], x1: poly[i + 1][0], z1: poly[i + 1][1] });
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 4.5 || railD(x, z) < 5 || FORT(x, z) < 0.5 || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 2) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 900, autumn: 0.35, broadleaf: 0.9,
      noHedge: (x: number, z: number) => inTown(x, z) || away(x, z) < 30,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (orchard(x, z)) return 0.75;                                                    // the orchards: plum, apple, walnut
        const a = away(x, z);
        if (a > 18 && a < 30) return 0.35;                                                 // the willows and poplars along both banks
        if (inTown(x, z)) return 0.04;                                                     // the courtyard trees
        if (Math.min(VINIK(x, z), BUBANJ(x, z)) < 0.8) return 0.1;                         // scrub on the hills
        return 0.02;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
