// Skopje (Üsküb), 29 September 1918: the end of the Macedonian front. A fortnight after the breakthrough at Dobro Pole,
// General Jouinot-Gambetta’s cavalry brigade — the 1st and 4th Chasseurs d’Afrique and the 1st Moroccan Spahis — rode
// for six days over the passes of the Šar range, 1,800 m up on goat tracks, and fell on Üsküb from the north-west at
// dawn. The Bulgarian and German rearguards in the town and on the Kale were turned out street by street, the bridges
// over the Vardar taken, the retreat of the Bulgarian Eleventh Army cut — and Bulgaria signed the armistice at Salonika
// the same day, the first of the Central Powers out of the war.
// On the map: the Vardar across the middle with the Ottoman Stone Bridge in the town, the railway bridge downstream and
// the Zlokućani ford upstream; on the north bank the Kale fortress on its hill (walls and towers round the summit) and
// the Old Bazaar (Čaršija) east of it, its mosques and minarets, the bezisten and the hammam; on the south bank the
// railway station on the Salonika–Mitrovica line, the Burmali mosque and the new quarter, and Vodno’s spur over them;
// Bardovci in the north-west, Kisela Voda in the south-east; Gazi Baba’s hill behind the north bank, the long back of
// Vodno behind the south, the Šar foothills closing the west on both banks. Orchards and poplars all down the valley.
// Mobile fighting, no trench system: machine-gun posts and sandbagged scrapes at the bridges and on the heights.
// Not mirrored but fair: each side holds one bank with the same three crossings between them (the bridges and the ford
// serve both banks alike, each a few metres off the middle). The Kale is answered by Vodno’s spur: the same height and
// nearly the same area (a round hill against a long spur at a slant), each with its point on a flat summit about as
// far from its own base; the Čaršija by the station quarter, Bardovci by Kisela Voda, Gazi Baba by Vodno’s back (same
// height and area, other shapes and corners). Each bank its own orchards, cut to the same wooded share; the points’
// leads sum to a few metres.
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

const SEED = 1918_0929;
const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const noise = createNoise2D(SEED);

// ---- the Vardar across the middle, west to east; its three crossings
const vall = (x: number) => 18 * Math.sin(x * 0.0052 + 0.5) + 7 * Math.sin(x * 0.013 + 2.0);
const away = (x: number, z: number) => Math.abs(z - vall(x));
const north = (x: number, z: number) => z > vall(x);
const XF = -330, XS = 0, XR = 360;   // the ford, the Stone Bridge, the railway bridge
const river = createRiver({
  path: vall, halfWidth: 15, level: 0, depth: 3, valley: 50,
  crossings: [
    { name: 'Zlokućani ford', x: XF, kind: 'ford', width: 14, depth: 0.6, channel: 0 },
    { name: 'Stone Bridge', x: XS, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Railway bridge', x: XR, kind: 'bridge', width: 9, channel: 0 },
  ],
});
const wet = (x: number, z: number, m = 0) => away(x, z) < 15 + m;

// ---- the points
const points: ControlPointDef[] = [
  { id: 'A', name: 'Saraj road', x: 30, z: 465, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Bardovci', x: -320, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Kale', x: -80, z: 170, owner: null, sector: 'centre', radius: 24 },
  { id: 'D', name: 'Čaršija', x: 150, z: 95, owner: null, sector: 'east', radius: 30 },
  { id: 'E', name: 'Zlokućani ford', x: XF, z: Math.round(vall(XF)), owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Stone Bridge', x: XS, z: Math.round(vall(XS)), owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Railway bridge', x: XR, z: Math.round(vall(XR)), owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Üsküb station', x: -185, z: -100, owner: null, sector: 'west', radius: 30 },
  { id: 'I', name: 'Vodno spur', x: 110, z: -185, owner: null, sector: 'centre', radius: 24 },
  { id: 'J', name: 'Kisela Voda', x: 300, z: -290, owner: null, sector: 'east' },
  { id: 'K', name: 'Veles road', x: -25, z: -465, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the heights: the Kale a round hill, Vodno’s spur a long one at a slant (same summit, nearly the same area, both flat-topped);
// Gazi Baba behind the north bank, Vodno’s back behind the south (the same again, larger)
const ell = (x: number, z: number, cx: number, cz: number, rx: number, rz: number, rot = 0) => {
  const dx = x - cx, dz = z - cz, c = Math.cos(rot), s = Math.sin(rot);
  return Math.hypot((dx * c - dz * s) / rx, (dx * s + dz * c) / rz);
};
const KALE = (x: number, z: number) => Math.hypot(x + 80, z - 170) / 160;
const SPUR = (x: number, z: number) => ell(x, z, 110, -185, 200, 125, 0.45);
const GAZI = (x: number, z: number) => ell(x, z, 340, 370, 210, 110, -0.25);
const VODNO = (x: number, z: number) => ell(x, z, -330, -385, 230, 100, 0.35);

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
  line(-525, 525, 46), line(-525, 525, -46), over(XF), over(XS), over(XR),
  [[30, 580], at('A'), [0, 380], [-60, 270], at('C')], [at('C'), [-30, 110], [XS, vall(XS) + 46]],    // the Saraj road up the Kale, down to the bridge
  [[-25, -580], at('K'), [20, -380], [80, -280], at('I')], [at('I'), [40, -100], [XS, vall(XS) - 46]], // the Veles road over the spur
  [at('A'), [-160, 410], at('B'), [-345, 150], [XF, vall(XF) + 46]],                                    // Bardovci and the ford
  [at('K'), [-130, -390], [-200, -240], at('H'), [-280, -70], [XF, vall(XF) - 46]],                     // the station and the ford
  [at('A'), [130, 360], [190, 220], at('D'), [150, vall(150) + 46]],                                    // the Čaršija
  [at('K'), [150, -430], at('J'), [345, -150], [XR, vall(XR) - 46]],                                    // Kisela Voda and the railway bridge
  [at('A'), [230, 320], [320, 170], [XR, vall(XR) + 46]],
  [at('C'), [40, 135], at('D')], [at('H'), [-40, -150], at('I')], [at('H'), [-150, vall(-150) - 46]],   // the lanes in town
];
const roadD = gridCache(segField(ROADS, 60), EXT, 2);
/** The railway: the Salonika–Mitrovica line along the south bank past the station, the Kumanovo branch over the railway bridge. */
const RAILS = [line(-525, 525, -80), [[XR, vall(XR) - 80], [XR, vall(XR) + 30], [410, 190], [470, 340], [525, 450]]];
const railD = gridCache(segField(RAILS, 40), EXT, 2);

// ---- the ground: the valley floor rising gently to each base, the four heights, the Šar foothills closing the west
const ground = gridCacheSmooth((x: number, z: number) => {
  const a = away(x, z);
  let h = 1.6 + 9 * smoothstep(40, 420, a) + fbm(noise, x * 0.006, z * 0.006, 3) * 3 * smoothstep(30, 120, a) + fbm(noise, x * 0.03 + 7, z * 0.03, 2) * 0.4;
  h += 30 * smoothstep(1, 0.25, KALE(x, z)) ** 1.2;
  h += 30 * smoothstep(1, 0.25, SPUR(x, z)) ** 1.2;
  h += 36 * smoothstep(1, 0.2, GAZI(x, z)) ** 1.3;
  h += 36 * smoothstep(1, 0.2, VODNO(x, z)) ** 1.3;
  h += 26 * smoothstep(-370, -520, x) * smoothstep(70, 220, a);                                     // the Šar foothills, west on both banks
  h += smoothstep(480, 620, Math.abs(x)) * 10 + smoothstep(545, 680, Math.abs(z)) * 10;             // (the rims beyond the edges)
  for (const p of points) if (p.id !== 'C' && p.id !== 'I') h += (h * 0.4 + 2 - h) * 0.4 * smoothstep(40, 20, Math.hypot(x - p.x, z - p.z)); // (the towns’ flats)
  for (const bz of [BASE_Z, -BASE_Z]) h += (9 - h) * smoothstep(40, 20, Math.hypot(x, z - bz));
  return h;
}, EXT, 2);
const height = (x: number, z: number) => river.carve(x, z, ground(x, z));

// ---- the town quarters: the Čaršija under the Kale and round D on the north bank, the station quarter round H and the bridge on the south
const QUARTERS = [{ x: 90, z: 90, rx: 150, rz: 70 }, { x: -110, z: -80, rx: 150, rz: 70 }];
const inTown = (x: number, z: number) => QUARTERS.some((q) => ell(x, z, q.x, q.z, q.rx, q.rz) < 1);

// ---- the orchards: each bank its own, cut to the same share
const on = (x: number, z: number) => fbm(noise, x * 0.012 + 40, z * 0.012 - 9, 3);
const orchardOk = (x: number, z: number) => away(x, z) > 30 && !inTown(x, z) && KALE(x, z) > 0.5 && SPUR(x, z) > 0.5 && Math.abs(Math.abs(z) - BASE_Z) > 50;
const T_N = 0.12, T_P = evenThreshold((x, z) => (orchardOk(x, z) ? on(x, z) : -9), T_N, north);
const orchard = gridCache((x: number, z: number) => orchardOk(x, z) && on(x, z) > (north(x, z) ? T_N : T_P) && roadD(x, z) > 6 && railD(x, z) > 7 ? 1 : 0, EXT, 4);

// ---- the forward edges: each side’s rearguard posts along its own bank
const edgeZ = (x: number, f: 'nato' | 'pact') => vall(x) + (f === 'nato' ? 62 + 6 * Math.sin(x * 0.02) : -64 - 6 * Math.sin(x * 0.017 + 1));

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1er peloton, 1er Chasseurs d’Afrique' }];

export default {
  id: 'skopje',
  name: 'Skopje',
  description: '29 September 1918: Jouinot-Gambetta’s French cavalry, over the passes of the Šar range, falls on Üsküb (Skopje) from the north-west and cuts the Bulgarian and German retreat. The Vardar through the town with the Ottoman Stone Bridge, the Kale fortress, the Old Bazaar’s mosques and minarets, the railway station under Vodno’s spur; orchards and poplars down the valley.',
  epochs: ['1918'],
  region: 'italy', // (no Balkans region in 1918: the mountain front’s, like Dobro Pole — serb/bg have no roster yet and fall back to fr/de, which every region keeps)
  airfields: [], // (no strip fits between the town, the river, the orchards and the hills: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['fr', 'serb'], pact: ['bg', 'de'] }, // (the French cavalry with the Serbian First Army behind it against the Bulgarian Eleventh Army and its German rearguards)
  sides: { nato: 'France and Serbia', pact: 'Bulgaria' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: SEED, cell: 64, weights: [0.3, 0.2, 0.25, 0.25] as any }),   // (late September: stubble, plough, dry pasture)
  woods: (x: number, z: number) => orchard(x, z) * 0.6,

  theme: {
    // a clear late-September dawn over the Vardar, the sun coming up the valley from the east; dust and smoke over the town
    fogColor: 0xc8bea8, fogDensity: 0.0011, skyTop: 0x5a7c9e, skyHorizon: 0xdccfb4, skyBottom: 0x86806c,
    sunColor: 0xffd6a0, sunIntensity: 1.6, sunDisk: 0.25, clouds: 0.2, cloudLight: 0xf2ece0, cloudDark: 0x9a9282,
    sunDir: [0.85, 0.3, 0.1], hemiSky: 0xcccac4, hemiGround: 0x625a44, hemiIntensity: 1.3, rimColor: 0xe0d4c0, rimIntensity: 0.25,
    terrain: {
      grass: '#6e7040', grassAlt: '#64683a', dryGrass: '#a6965c', dirt: '#7a6648', rock: '#a8a08c', strip: '#544632',
      pasture: '#78743e', ploughed: '#7a6446', stubble: '#b09c62', meadow: '#7c7a44',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [inTown(x, z) ? 0x8e8676 : 0xa8987a, 0.9];                  // the cobbles in town, dust tracks outside
        if (railD(x, z) < 2.4) return [0x5a5248, 0.85];                                    // ballast
        if (inTown(x, z)) return [0x9a8c72, 0.55];                                         // the trodden ground between the houses
        if (y < 1.6 && wet(x, z, 12)) return [0x7a7056, 0.6];                              // the gravel banks
        if (KALE(x, z) < 0.3 || SPUR(x, z) < 0.3) return [0xa29884, 0.45];                 // the bare summits
        if (y > 30) return [0x9e9058, 0.55];                                               // the dry grass of the heights
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Rota, 1. Sofiyski polk' })),
  },

  /** Rearguards, not trenches: sandbagged scrapes and machine-gun posts along each bank, the most at the crossings. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const r = mulberry32(f === 'nato' ? 2901 : 2977), yaw = f === 'nato' ? Math.PI : 0, s = f === 'nato' ? 1 : -1;
      for (let x = -460 + r() * 30; x < 470; x += 55 + r() * 35) {
        const z = edgeZ(x, f) + (r() - 0.5) * 10;
        if (roadD(x, z) < 8 || railD(x, z) < 8 || inTown(x, z) || orchard(x, z) || nearPt(x, z, 28) || wet(x, z, 20)) continue;
        works.push({ kind: 'trench', x, z, yaw, faction: f });
        if (r() < 0.3) works.push({ kind: 'mgNest', x: x + 5, z: z + 6 * s, yaw, faction: f });
      }
      for (const cx of [XF, XS, XR]) for (const dx of [-22, 22]) {
        const x = cx + dx + (s > 0 ? 3 : -3), z = vall(x) + s * 58;
        if (roadD(x, z) > 7 && railD(x, z) > 7) works.push({ kind: 'mgNest', x, z, yaw, faction: f });
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
    const minaret = (x: number, z: number, h: number) => {
      const g = terrain.heightAt(x, z), m = new THREE.Matrix4();
      props.push('stone', new THREE.CylinderGeometry(0.9, 1.2, h, 8), m.makeTranslation(x, g + h / 2, z), 0xe2dccc);
      props.push('stone', new THREE.CylinderGeometry(1.7, 1.4, 0.6, 8), m.makeTranslation(x, g + h * 0.82, z), 0xcfc6b2); // the gallery
      props.push('plain', new THREE.ConeGeometry(1.0, 4, 8), m.makeTranslation(x, g + h + 2, z), 0x5a5e66);           // the lead cap
      cover.addCylinder({ x, z, radius: 1.3, height: h });
      mark(x, z, 2);
    };
    const mosque = (x: number, z: number, w: number, name: string, mh: number) => {
      if (!free(x, z, w * 0.7)) return;
      props.flatHouse({ x, z, yaw: 0, width: w, depth: w, name, dome: true }); mark(x, z, w * 0.75);
      minaret(x + w / 2 + 2.5, z - w / 2 + 1.5, mh);
    };

    // ---- the Kale: a ring of curtain wall and square towers round its flat summit, gates where the roads come up
    {
      const [kx, kz] = at('C'), R = 36, n = 22;
      props.rand = mulberry32(1391);
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
        const x = kx + Math.cos(am) * R, z = kz + Math.sin(am) * R;
        if (roadD(x, z) < 8) continue;                                                   // the gates
        props.wall({ x, z, yaw: -am + Math.PI / 2, length: 2 * R * Math.sin(Math.PI / n) + 0.6, height: 3.2, thickness: 1.4 });
        if (i % 4 === 0) {
          const tx = kx + Math.cos(a0) * R, tz = kz + Math.sin(a0) * R, g = terrain.heightAt(tx, tz);
          props.box('stone', tx, g + 2.5, tz, 5, 7, 5, -a0, 0x9c907a);
          props.box('stone', tx, g + 6.3, tz, 5.6, 0.6, 5.6, -a0, 0x8c8270);
          cover.addBox({ x: tx, z: tz, yaw: -a0, length: 5, thickness: 5, height: 6 });
        }
      }
      props.flatHouse({ x: kx + 12, z: kz + 10, yaw: 0.2, width: 9, depth: 7, name: 'Kale barracks' }); mark(kx + 12, kz + 10, 8);
      mark(kx, kz, R + 4);
    }

    // ---- the Čaršija: the bazaar’s low shops in rows, the bezisten, the Daut Pasha hammam, the Mustafa Pasha and Sultan Murad mosques
    props.rand = mulberry32(1918_29);
    mosque(-15, 140, 13, 'Mustafa Pasha mosque', 26);
    mosque(55, 160, 11, 'Sultan Murad mosque', 22);
    mosque(205, 70, 10, 'Yahya Pasha mosque', 20);
    if (free(110, 115, 12)) { props.hall({ x: 110, z: 115, yaw: 0.05, width: 26, depth: 11, height: 6, color: 0x9a8a70, roof: 0x6a5a4a, door: 4, name: 'bezisten' }); mark(110, 115, 14); }
    if (free(40, vall(40) + 64, 8)) { props.flatHouse({ x: 40, z: vall(40) + 64, yaw: 0, width: 14, depth: 9, name: 'Daut Pasha hammam', dome: true }); mark(40, vall(40) + 64, 9); }
    // ---- the south bank: the station on the line, its goods shed and sidings, the Burmali mosque, the Orthodox church
    const [hx, hz] = at('H'), sz = vall(hx) - 80;
    props.townHouse({ x: hx + 10, z: sz + 12, yaw: Math.PI, width: 18, depth: 9, storeys: 2, name: 'Üsküb station', damaged: 0 }); mark(hx + 10, sz + 12, 11);
    props.hall({ x: hx - 40, z: sz + 13, yaw: Math.PI, width: 22, depth: 10, height: 6, color: 0x7a6250, door: 6, name: 'goods shed' }); mark(hx - 40, sz + 13, 13);
    for (const [x, kind] of [[hx - 70, 'box'], [hx - 56, 'open'], [hx + 50, 'box'], [hx + 64, 'box']] as [number, string][]) props.wagon({ x, z: vall(x) - 80, yaw: Math.atan2(1, (vall(x + 1) - vall(x - 1)) / 2), kind });
    mosque(-50, -75, 11, 'Burmali mosque', 24);
    if (free(-130, -150, 12)) { props.church({ x: -130, z: -150, yaw: Math.PI / 2 }); mark(-130, -150, 13); }
    // ---- the houses of both quarters: tiled town houses and plastered Ottoman houses, as many on each bank
    for (const [qi, q] of QUARTERS.entries()) {
      const r = mulberry32(qi ? 3311 : 3377);
      props.rand = r;
      for (let i = 0, n = 0; i < 900 && n < 44; i++) {
        const x = q.x + (r() * 2 - 1) * q.rx, z = q.z + (r() * 2 - 1) * q.rz;
        if (ell(x, z, q.x, q.z, q.rx, q.rz) > 1 || !free(x, z, 5) || nearPt(x, z, 14) || KALE(x, z) < 0.3) continue;
        const yaw = Math.atan2(vall(x + 1) - vall(x - 1), 2) + (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2;
        if (r() < 0.55) props.townHouse({ x, z, yaw, width: 7 + r() * 3, depth: 7 + r() * 2, storeys: r() < 0.4 ? 2 : 1, damaged: 0.05 });
        else props.flatHouse({ x, z, yaw, width: 6 + r() * 3, depth: 6 + r() * 2, storeys: r() < 0.3 ? 2 : 1 });
        mark(x, z, 5); n++;
      }
    }
    // ---- the villages: Bardovci and Kisela Voda, farmsteads round their points
    for (const [id, sd] of [['B', 41], ['J', 47]] as [string, number][]) {
      const [px, pz] = at(id), r = mulberry32(sd);
      props.rand = r;
      for (let i = 0, n = 0; i < 300 && n < 9; i++) {
        const a = r() * Math.PI * 2, d = 18 + r() * 40, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
        if (!free(x, z, 5) || orchard(x, z)) continue;
        props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (r() - 0.5) * 0.3, width: 7 + r() * 3, depth: 6 + r() * 2 });
        if (r() < 0.5) props.lowWall({ x: x + 6, z: z + 5, yaw: r() < 0.5 ? 0 : Math.PI / 2, length: 6 + r() * 5, height: 1.4, color: 0xa29a88 });
        mark(x, z, 6); n++;
      }
    }
    // shepherds’ walls and boulders on the four hills; sandbags on the two summits
    const r = mulberry32(2929);
    props.rand = r;
    for (let i = 0; i < 260; i++) {
      const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 540;
      if (Math.min(GAZI(x, z), VODNO(x, z), KALE(x, z) * 1.3, SPUR(x, z) * 1.3) > 0.9 || !free(x, z, 3) || nearPt(x, z, 30) || inTown(x, z)) continue;
      if (r() < 0.75) props.boulder({ x, z, radius: 0.7 + r() * 1.8 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 4, height: 1.2, color: 0xa29a88 });
    }
    { const [ix, iz] = at('I'); for (const [dx, dz] of [[-20, 16], [22, 10], [0, -24]]) props.sandbagRing({ x: ix + dx, z: iz + dz, radius: 3.5, toward: 1 }); }
    // the railway
    for (const poly of RAILS) for (let i = 0; i < poly.length - 1; i++) props.rails({ x0: poly[i][0], z0: poly[i][1], x1: poly[i + 1][0], z1: poly[i + 1][1] });
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 4.5 || railD(x, z) < 5 || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 2) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 900, autumn: 0.2, broadleaf: 0.9,
      noHedge: (x: number, z: number) => inTown(x, z) || away(x, z) < 30,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (orchard(x, z)) return 0.75;                                                    // the orchards: plum, apple, mulberry
        const a = away(x, z);
        if (a > 20 && a < 32) return 0.35;                                                 // the poplars along both banks
        if (inTown(x, z)) return 0.04;                                                     // the courtyard trees
        if (Math.min(GAZI(x, z), VODNO(x, z)) < 0.8) return 0.1;                           // scrub on the hills
        return 0.02;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
