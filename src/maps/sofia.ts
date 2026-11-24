// Sofia, early October 1918 — a battle that was never fought. After the breakthrough at Dobro Pole on 15 September the
// Bulgarian army came apart: mutinous soldiers of the broken front marched on Sofia, proclaimed a republic at Radomir on
// the 27th and were stopped only at Vladaya, on the edge of the capital. On the 29th Bulgaria signed the armistice at
// Salonika and the war in the Balkans was over. Had it not — had the government held out a few days more — the Serbian
// and French columns coming up the Struma from Kyustendil would have had to fight their way through the Pernik basin
// and the passes between Vitosha and Lyulin into Sofia, against the loyal Bulgarian divisions and the German troops
// sent down to stiffen them, dug in hastily on the ridges in front of the capital. This map is that battle.
// On the map: the Struma headwaters across the middle, west to east, coming down off Vitosha — the railway bridge of the
// Radomir line in the west, the Pernik town bridge in the middle, the Bosnek ford upstream in the east; Pernik’s two
// quarters either side of the river, each with its coal pit — the Minyor pit on the south bank, Kalkas on the north —
// its steel headframe, winding house and chimney, and a black spoil tip; Orthodox churches with red-tiled roofs in
// the town and in Batanovtsi (south-west, on the Radomir side) and Vladaya (north-east, at the pass); the railway from
// Radomir over the river, through Pernik station and out through Vladaya toward Sofia; the bare shoulder of Vitosha
// (Selimitsa) in the south-east with beech forest on its flanks, the wooded back of Lyulin (Dupevitsa) in the north-west;
// Bulgarian trench lines dug on Lyulin’s face, Serbian ones on Vitosha’s; beyond the north edge the first roofs of Sofia
// and the gold domes of the Alexander Nevsky cathedral.
// (Coordinates: +z is the south bank, +x east — the map is seen from the Serbian side, so the Serbian base is at +z.)
// Not mirrored but fair: each side holds one bank with the same three crossings between them (each a few metres off the
// middle). Vitosha’s shoulder is answered by Lyulin: the same height and the same area (a long east–west shoulder
// against a round back), each with its point on a bare summit about as far from its own base, beech
// forest on both flanks; the Minyor pit by Kalkas (each its spoil tip of the same size beside it), Batanovtsi by
// Vladaya. Both rims beyond the east and west edges run across both banks alike. Each bank its own orchards, cut to the
// same wooded share; each side its own trench line on its own height.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine } from './common.js';
import { vegetation } from './common2027.js';
import { evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SEED = 1918_1003;
const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const noise = createNoise2D(SEED);

// ---- the Struma across the middle, flowing west off Vitosha; its three crossings
const vall = (x: number) => 12 * Math.sin(x * 0.0058 + 0.4) + 7 * Math.sin(x * 0.019 + 2.1);
const away = (x: number, z: number) => Math.abs(z - vall(x));
const south = (x: number, z: number) => z > vall(x);
const XR = -340, XS = -20, XF = 290;   // the railway bridge, the Pernik bridge, the Bosnek ford
const river = createRiver({
  path: vall, halfWidth: 9, level: 0, depth: 2.4, valley: 38,
  crossings: [
    { name: 'Railway bridge', x: XR, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Pernik bridge', x: XS, kind: 'bridge', width: 9, channel: 0 },
    { name: 'Bosnek ford', x: XF, kind: 'ford', width: 14, depth: 0.5, channel: 0 },
  ],
});
const wet = (x: number, z: number, m = 0) => away(x, z) < 9 + m;

// ---- the points
const points: ControlPointDef[] = [
  { id: 'A', name: 'Radomir road', x: 25, z: 465, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Batanovtsi', x: -355, z: 290, owner: null, sector: 'west' },
  { id: 'C', name: 'Selimitsa (Vitosha)', x: 300, z: 215, owner: null, sector: 'east', radius: 24 },
  { id: 'D', name: 'Minyor pit', x: -80, z: 120, owner: null, sector: 'centre', radius: 28 },
  { id: 'E', name: 'Railway bridge', x: XR, z: Math.round(vall(XR)), owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Pernik bridge', x: XS, z: Math.round(vall(XS)), owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Bosnek ford', x: XF, z: Math.round(vall(XF)), owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Kalkas pit', x: 95, z: -125, owner: null, sector: 'centre', radius: 28 },
  { id: 'I', name: 'Dupevitsa (Lyulin)', x: -290, z: -235, owner: null, sector: 'west', radius: 24 },
  { id: 'J', name: 'Vladaya', x: 362, z: -262, owner: null, sector: 'east' },
  { id: 'K', name: 'Knyazhevo', x: -25, z: -465, owner: 'pact', sector: 'centre' },
];
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPt = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- the heights: Vitosha’s shoulder south-east, Lyulin north-west (same height, same area, turned other ways)
const ell = (x: number, z: number, cx: number, cz: number, rx: number, rz: number, rot = 0) => {
  const dx = x - cx, dz = z - cz, c = Math.cos(rot), s = Math.sin(rot);
  return Math.hypot((dx * c - dz * s) / rx, (dx * s + dz * c) / rz);
};
const MTS = [[300, 215, 270, 106, -0.05], [-290, -235, 170, 168, 0]];   // [cx, cz, rx, rz, turn]: Vitosha’s long shoulder, Lyulin’s round back
const VIT = (x: number, z: number) => ell(x, z, ...(MTS[0] as [number, number, number, number, number]));
const LYU = (x: number, z: number) => ell(x, z, ...(MTS[1] as [number, number, number, number, number]));
const MOUNT = (x: number, z: number) => Math.min(VIT(x, z), LYU(x, z));
/** The spoil tips: one by each pit, the same size. */
const TIPS = [[-165, 185, 40, 13], [185, -190, 40, 13]];
const tipK = (x: number, z: number) => Math.max(...TIPS.map(([tx, tz, r]) => smoothstep(1, 0.3, Math.hypot(x - tx, z - tz) / r)));
/** The pits: headframe [x, z, yaw]. */
const PITS = [[-44, 112, 0.2], [59, -117, 0.2 + Math.PI]];

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
const over = (x: number) => [[x, vall(x) + 40], [x, vall(x) - 40]];

// ---- the roads: one along each bank, over the three crossings, out to each base and up to each height
const ROADS = [
  line(-525, 525, 40), line(-525, 525, -40), over(XR), over(XS), over(XF),
  [[25, 580], at('A'), [0, 380], [-60, 250], at('D'), [-40, 70], [XS, vall(XS) + 40]],                 // the Radomir road past the Minyor pit to the bridge
  [[40, -660], [-25, -580], at('K'), [0, -380], [80, -250], at('H'), [10, -70], [XS, vall(XS) - 40]],  // the Sofia road from Knyazhevo past Kalkas
  [at('A'), [-170, 420], at('B'), [-350, 150], [XR, vall(XR) + 40]],                                   // Batanovtsi and the railway bridge
  [at('K'), [170, -410], at('J'), [345, -150], [XF, vall(XF) - 40]],                                   // Vladaya and the ford
  [at('A'), [150, 400], [230, 320], at('C'), [330, 110], [XF, vall(XF) + 40]],                         // over Vitosha’s shoulder down to the ford
  [at('K'), [-150, -400], [-235, -320], at('I'), [-330, -110], [XR, vall(XR) - 40]],                   // over Lyulin down to the railway bridge
  [at('D'), [-235, 145], at('B')], [at('H'), [250, -140], at('J')],                                    // the lanes between the villages
];
const roadD = gridCache(segField(ROADS, 60), EXT, 2);
/** The railway: from Radomir over the railway bridge, along the north bank through Pernik station and Kalkas, out through Vladaya to Sofia. */
const RAILS = [[[-525, 330], [-430, 190], [XR, vall(XR) + 30], [XR, vall(XR) - 30], ...line(-300, 200, -70), [290, -180], [380, -250], [440, -380], [525, -470]]];
const railD = gridCache(segField(RAILS, 40), EXT, 2);

// ---- the ground: the basin floor rising gently to each base, the two mountains, the tips, Vitosha’s massif beyond the east edge, Golo Bardo beyond the west
const ground = gridCacheSmooth((x: number, z: number) => {
  const a = away(x, z);
  let h = 1.6 + 9 * smoothstep(36, 420, a) + fbm(noise, x * 0.006, z * 0.006, 3) * 3 * smoothstep(26, 120, a) + fbm(noise, x * 0.03 + 7, z * 0.03, 2) * 0.4;
  h += 26 * smoothstep(380, 540, x) * smoothstep(60, 220, a);                                         // Vitosha’s massif, east on both banks
  h += 18 * smoothstep(-420, -560, x) * smoothstep(60, 220, a);                                       // Golo Bardo, west on both banks
  h += 46 * smoothstep(1, 0.22, VIT(x, z)) ** 1.3;
  h += 46 * smoothstep(1, 0.22, LYU(x, z)) ** 1.3;
  h += 7 * fbm(noise, x * 0.014 + 30, z * 0.014, 3) * smoothstep(1, 0.5, MOUNT(x, z)) * smoothstep(0.25, 0.5, MOUNT(x, z)); // (the gullies down the flanks)
  for (const [tx, tz, r, th] of TIPS) h += th * smoothstep(1, 0.3, Math.hypot(x - tx, z - tz) / r);
  h += smoothstep(480, 620, Math.abs(x)) * 10 + smoothstep(545, 680, Math.abs(z)) * 10;              // (the rims beyond the edges)
  for (const p of points) if (p.id !== 'C' && p.id !== 'I') h += (h * 0.4 + 2 - h) * 0.4 * smoothstep(40, 20, Math.hypot(x - p.x, z - p.z)); // (the towns’ flats)
  for (const bz of [BASE_Z, -BASE_Z]) h += (9 - h) * smoothstep(40, 20, Math.hypot(x, z - bz));
  return h;
}, EXT, 2);
const height = (x: number, z: number) => river.carve(x, z, ground(x, z));

// ---- Pernik’s two quarters: round the Minyor pit on the south bank, round Kalkas and the station on the north
const QUARTERS = [{ x: -40, z: 78, rx: 130, rz: 46 }, { x: 75, z: -82, rx: 130, rz: 46 }];
const inTown = (x: number, z: number) => QUARTERS.some((q) => ell(x, z, q.x, q.z, q.rx, q.rz) < 1);

// ---- the orchards: each bank its own, cut to the same share; the beech woods on both mountains’ flanks
const on = (x: number, z: number) => fbm(noise, x * 0.012 + 40, z * 0.012 - 9, 3);
const orchardOk = (x: number, z: number) => away(x, z) > 26 && !inTown(x, z) && MOUNT(x, z) > 1.1 && tipK(x, z) < 0.05 && Math.abs(Math.abs(z) - BASE_Z) > 50;
const T_N = 0.16, T_P = evenThreshold((x, z) => (orchardOk(x, z) ? on(x, z) : -9), T_N, south);
const orchard = gridCache((x: number, z: number) => orchardOk(x, z) && on(x, z) > (south(x, z) ? T_N : T_P) && roadD(x, z) > 6 && railD(x, z) > 7 ? 1 : 0, EXT, 4);
const beech = gridCache((x: number, z: number) => { const m = MOUNT(x, z); return m > 0.4 && m < 1.02 && roadD(x, z) > 5 ? 1 : 0; }, EXT, 4);

// ---- the forward edges: each side’s scrapes along its own bank
const edgeZ = (x: number, f: 'nato' | 'pact') => vall(x) + (f === 'nato' ? 58 + 6 * Math.sin(x * 0.019) : -60 - 6 * Math.sin(x * 0.016 + 1));

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1. četa, 1. bataljon, 7. pešadijski puk' }];

export default {
  id: 'sofia',
  name: 'Sofia',
  description: 'October 1918, had Bulgaria not signed the armistice: Serbian and French columns fight up the Struma through the Pernik coal basin toward Sofia, between the bare shoulder of Vitosha and the wooded back of Lyulin. Headframes and spoil tips at the pits, red-roofed villages with their churches, the railway into the capital, hasty Bulgarian trenches on the ridges, and the gold domes of the Alexander Nevsky cathedral on the skyline.',
  epochs: ['1918'],
  region: 'balkans', // (the Salonika front)
  airfields: [], // (no strip fits between the town, the river, the pits and the mountains: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['serb', 'fr'], pact: ['bg', 'de'] }, // (the Serbian First Army and the Armée d’Orient against the loyal Bulgarian divisions and the Germans sent to stiffen them)
  sides: { nato: 'Serbia and France', pact: 'Bulgaria and Germany' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: SEED, cell: 64, weights: [0.25, 0.25, 0.3, 0.2] as any }),   // (early October: maize stubble, standing maize, plough, pasture)
  woods: (x: number, z: number) => Math.max(orchard(x, z) * 0.6, beech(x, z) * 0.8),

  theme: {
    // a clear early-October afternoon in the Pernik basin, the sun in the south-west; coal smoke over the town
    fogColor: 0xc2bcae, fogDensity: 0.0009, skyTop: 0x56789a, skyHorizon: 0xd4cebe, skyBottom: 0x827c6c,
    sunColor: 0xffdeb2, sunIntensity: 1.5, sunDisk: 0.22, clouds: 0.3, cloudLight: 0xf0eadc, cloudDark: 0x948c7e,
    sunDir: [-0.5, 0.42, 0.6], hemiSky: 0xc6c8c4, hemiGround: 0x5e5644, hemiIntensity: 1.3, rimColor: 0xded2be, rimIntensity: 0.25,
    terrain: {
      grass: '#66703e', grassAlt: '#5e6838', dryGrass: '#a0925c', dirt: '#746246', rock: '#9a968a', strip: '#524430',
      pasture: '#727240', ploughed: '#746044', stubble: '#b2a066', meadow: '#788042',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.4) return [inTown(x, z) ? 0x8a8274 : 0xa4967a, 0.9];                       // cobbles in town, dust tracks outside
        if (railD(x, z) < 2.4) return [0x4e4842, 0.85];                                       // ballast
        if (tipK(x, z) > 0.12) return [0x34302c, 0.85];                                       // the black spoil
        if (inTown(x, z)) return [0x8a806c, 0.55];                                            // coal-dusty ground between the houses
        if (y < 1.6 && wet(x, z, 10)) return [0x786e54, 0.6];                                 // the gravel banks
        if (MOUNT(x, z) < 0.42) return [0x9c9464, 0.55];                                      // the bare summits: dry mountain grass
        if (MOUNT(x, z) < 0.5) return [0x9a968a, 0.35];                                       // rock showing at the tree line
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
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. rota, 1. druzhina, 6. pehoten Bdinski polk' })),
  },

  /** Hasty lines: a trench and wire belt across the face of each side’s mountain, sandbagged scrapes along each bank, MG posts at the crossings. */
  battlefield() {
    const works: any[] = [];
    // the trench lines on the mountains’ faces (a polyline round each summit at the tree line, its front toward the river)
    // (the 0.6 contour of each mountain’s ellipse, the half facing the river)
    const arc = ([cx, cz, rx, rz, rot]: number[], s: number) => Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2, u = 0.6 * rx * Math.cos(a), w = 0.6 * rz * Math.sin(a), c = Math.cos(rot), sn = Math.sin(rot);
      return [cx + u * c + w * sn, cz - u * sn + w * c];
    }).filter(([, z]) => (z - cz) * s < -15);
    for (const [f, s, m] of [['nato', 1, MTS[0]], ['pact', -1, MTS[1]]] as ['nato' | 'pact', number, number[]][]) {
      const pts = arc(m, s).sort((p, q) => (s > 0 ? p[0] - q[0] : q[0] - p[0]));             // (nato walks east, pact west: the front to its right faces the river)
      for (const w of trenchLine(pts, f, { wireAt: 18, belts: 1, gapEvery: 50 })) if (roadD(w.x, w.z) > 8) works.push(w);
    }
    for (const f of ['nato', 'pact'] as const) {
      const r = mulberry32(f === 'nato' ? 1003 : 1007), yaw = f === 'nato' ? Math.PI : 0, s = f === 'nato' ? 1 : -1;
      for (let x = -460 + r() * 30; x < 470; x += 55 + r() * 35) {
        const z = edgeZ(x, f) + (r() - 0.5) * 10;
        if (roadD(x, z) < 8 || railD(x, z) < 8 || inTown(x, z) || orchard(x, z) || tipK(x, z) > 0 || nearPt(x, z, 28) || wet(x, z, 20)) continue;
        works.push({ kind: 'trench', x, z, yaw, faction: f });
        if (r() < 0.3) works.push({ kind: 'mgNest', x: x + 5, z: z + 6 * s, yaw, faction: f });
      }
      for (const cx of [XR, XS, XF]) for (const dx of [-22, 22]) {
        const x = cx + dx + (s > 0 ? 3 : -3), z = vall(x) + s * 54;
        if (roadD(x, z) > 7 && railD(x, z) > 7 && !inTown(x, z)) works.push({ kind: 'mgNest', x, z, yaw, faction: f });
      }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const placed: number[][] = [];
    const free = (x: number, z: number, r: number) => roadD(x, z) > r + 3 && railD(x, z) > r + 4 && !wet(x, z, r + 12) && steepAt(x, z) < 0.22 && tipK(x, z) === 0
      && !placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + r + 2);
    const mark = (x: number, z: number, r: number) => placed.push([x, z, r]);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const GOLD = 0xd4b04c, WHITE = 0xe2ddd0;
    /** A dome on its drum at (x, y, z): `r` its radius, a gold cross on top. */
    const dome = (x: number, y: number, z: number, r: number, color: number, drum = WHITE) => {
      m4.compose(v.set(x, y + r * 0.6, z), q.identity(), one); props.push('plaster', new THREE.CylinderGeometry(r * 0.85, r * 0.85, r * 1.2, 14), m4, drum);
      m4.compose(v.set(x, y + r * 1.2, z), q.identity(), v.clone().set(r, r * 1.05, r)); props.push('plain', new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m4, color);
      props.box('metal', x, y + r * 2.25 + 0.8, z, 0.18, 1.8, 0.18, 0, GOLD);
      props.box('metal', x, y + r * 2.25 + 1.2, z, 1.0, 0.14, 0.14, 0, GOLD);
    };
    /** A Bulgarian village church: a plastered nave under red tiles, a small tin dome over the crossing, a bell tower beside it. */
    const church = (x: number, z: number, yaw: number, name: string) => {
      const b = props.beginBuilding(name, x, z, yaw, 8, 15);
      b.plaster = 0xd6ccb4;
      props.shell(b, { height: 5.5, key: 'plaster', color: 0xd6ccb4, front: [0], left: [3], t: 0.6, bay: 3, sill: 1.8, head: 4.4, frame: 0xa89a80 });
      props.gableRoof(b, { eave: 5.5, pitch: 0.55, color: 0x9a4228, t: 0.6 });
      props.endBuilding();
      dome(x, b.ground + 7.4, z, 2.2, 0x7a8478, 0xd6ccb4);
      const [tx, tz] = PropBuilder.local(x, z, yaw, 7, 5), g = terrain.heightAt(tx, tz);
      props.box('stone', tx, g + 6, tz, 3.4, 12, 3.4, yaw, 0xc8bea8);
      props.box('metal', tx, g + 10, tz, 3.5, 1.2, 0.8, yaw, 0x2a2622);
      m4.compose(v.set(tx, g + 13.4, tz), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.PI / 4), one); props.push('plain', new THREE.ConeGeometry(2.7, 2.8, 4), m4, 0x9a4228);
      cover.addBox({ x: tx, z: tz, yaw, length: 3.4, thickness: 3.4, height: 12 });
      mark(x, z, 10); mark(tx, tz, 3);
    };

    // ---- the pits: headframe over the shaft, winding house and its chimney behind, the screening shed, coal wagons
    props.rand = mulberry32(1003);
    for (const [i, [px, pz, yaw]] of PITS.entries()) {
      const L = (lx: number, lz: number) => PropBuilder.local(px, pz, yaw, lx, lz);
      props.headframe({ x: px, z: pz, yaw, height: 26 });
      { const [x, z] = L(0, -16); props.hall({ x, z, yaw, width: 14, depth: 9, height: 6, color: 0x8a5a44, door: 3, name: i ? 'Kalkas winding house' : 'Minyor winding house' }); mark(x, z, 9); }
      { const [x, z] = L(10, -24); props.chimney({ x, z, height: 28 }); mark(x, z, 3); }
      { const [x, z] = L(-16, 2); props.hall({ x, z, yaw, width: 12, depth: 10, height: 8, color: 0x6a5446, door: 4, name: 'screening shed' }); mark(x, z, 8); }
      { const [x0, z0] = L(-10, 2), [x1, z1] = L(-38, 30); props.conveyor({ x0, z0, y0: 7, x1, z1, y1: 4 }); }
      mark(px, pz, 6);
    }
    // ---- Pernik station on the line, its goods shed, coal wagons on the sidings
    { const sx = -120, sz = vall(sx) - 70;
      props.townHouse({ x: sx, z: sz - 12, yaw: 0, width: 18, depth: 9, storeys: 2, name: 'Pernik station', damaged: 0 }); mark(sx, sz - 12, 11);
      props.hall({ x: sx - 40, z: sz - 13, yaw: 0, width: 20, depth: 10, height: 6, color: 0x7a6250, door: 6, name: 'goods shed' }); mark(sx - 40, sz - 13, 12);
      for (const [x, kind] of [[sx + 40, 'open'], [sx + 54, 'open'], [sx + 68, 'open'], [90, 'open'], [104, 'box'], [-210, 'box']] as [number, string][]) props.wagon({ x, z: vall(x) - 70, yaw: Math.atan2(1, (vall(x + 1) - vall(x - 1)) / 2), kind, color: 0x3a3430 }); }
    // the coal wagons by the Minyor pit (a siding off the bank road)
    for (const x of [-120, -106, -92]) props.wagon({ x, z: vall(x) + 26, yaw: Math.atan2(1, (vall(x + 1) - vall(x - 1)) / 2), kind: 'open', color: 0x3a3430 });

    // ---- the churches: one in each quarter of Pernik, one in Batanovtsi, one in Vladaya
    props.rand = mulberry32(1918_03);
    for (const [x, z, yaw, name] of [[-150, 60, 0.1, 'Sv. Ivan Rilski church'], [200, -60, Math.PI + 0.1, 'Sv. Georgi church'],
      [-325, 262, 0.3, 'Batanovtsi church'], [332, -238, Math.PI + 0.25, 'Vladaya church']] as [number, number, number, string][]) if (free(x, z, 9)) church(x, z, yaw, name);
    // ---- the houses of both quarters: tiled town houses and plastered houses, as many on each bank
    for (const [qi, qq] of QUARTERS.entries()) {
      const r = mulberry32(qi ? 5411 : 5477);
      props.rand = r;
      for (let i = 0, n = 0; i < 900 && n < 40; i++) {
        const x = qq.x + (r() * 2 - 1) * qq.rx, z = qq.z + (r() * 2 - 1) * qq.rz;
        if (ell(x, z, qq.x, qq.z, qq.rx, qq.rz) > 1 || !free(x, z, 5) || nearPt(x, z, 14)) continue;
        const yaw = Math.atan2(vall(x + 1) - vall(x - 1), 2) + (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2;
        if (r() < 0.6) props.townHouse({ x, z, yaw, width: 7 + r() * 3, depth: 7 + r() * 2, storeys: r() < 0.35 ? 2 : 1, damaged: 0 });
        else props.flatHouse({ x, z, yaw, width: 6 + r() * 3, depth: 6 + r() * 2, storeys: 1 });
        mark(x, z, 5); n++;
      }
    }
    // ---- the villages: Batanovtsi and Vladaya, red-roofed houses round their points behind stone yard walls
    for (const [id, sd] of [['B', 61], ['J', 67]] as [string, number][]) {
      const [px, pz] = at(id), r = mulberry32(sd);
      props.rand = r;
      for (let i = 0, n = 0; i < 400 && n < 12; i++) {
        const a = r() * Math.PI * 2, d = 18 + r() * 46, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d;
        if (!free(x, z, 5) || orchard(x, z)) continue;
        props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (r() - 0.5) * 0.3, width: 7 + r() * 3, depth: 6 + r() * 2, storeys: 1, damaged: 0, name: 'village house' });
        if (r() < 0.5) props.lowWall({ x: x + 6, z: z + 5, yaw: r() < 0.5 ? 0 : Math.PI / 2, length: 6 + r() * 5, height: 1.4, color: 0xa29a88 });
        mark(x, z, 6); n++;
      }
    }
    // ---- the barricades: carts and logs beside the bridgehead roads, as many on each bank
    for (const [f, s] of [['nato', 1], ['pact', -1]] as [string, number][]) {
      const r = mulberry32(f === 'nato' ? 871 : 879);
      props.rand = r;
      for (const cx of [XR, XS, XF]) for (let k = 0, n = 0; k < 40 && n < 3; k++) {
        const x = cx + (r() * 2 - 1) * 40, z = vall(x) + s * (40 + r() * 40), d = roadD(x, z);
        if (d < 4.5 || d > 9 || railD(x, z) < 6 || wet(x, z, 4) || tipK(x, z) > 0 || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 3)) continue;
        props.logBarricade({ x, z, yaw: r() * Math.PI, length: 5 + r() * 3 }); mark(x, z, 4); n++;
      }
    }
    // boulders and shepherds’ walls on the bare summits; sandbags round both summit points
    const r = mulberry32(1310);
    props.rand = r;
    for (let i = 0; i < 300; i++) {
      const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 540;
      if (MOUNT(x, z) > 0.55 || !free(x, z, 3) || nearPt(x, z, 28)) continue;
      if (r() < 0.8) props.boulder({ x, z, radius: 0.7 + r() * 1.8 });
      else props.lowWall({ x, z, yaw: r() * 3, length: 4 + r() * 4, height: 1.2, color: 0xa29a88 });
    }
    for (const [id, s] of [['C', -1], ['I', 1]] as [string, number][]) { const [cx, cz] = at(id); for (const [dx, dz] of [[-20, 16 * s], [22, 10 * s], [0, -24 * s]]) props.sandbagRing({ x: cx + dx, z: cz + dz, radius: 3.5, toward: s }); }
    // the railway
    for (const poly of RAILS) for (let i = 0; i < poly.length - 1; i++) props.rails({ x0: poly[i][0], z0: poly[i][1], x1: poly[i + 1][0], z1: poly[i + 1][1] });

    // ---- beyond the north edge: the first roofs of Sofia and the Alexander Nevsky cathedral (scenery, out of bounds)
    {
      const rs = mulberry32(1912);
      for (let i = 0; i < 70; i++) {
        const x = -420 + rs() * 840, z = -630 - rs() * 140;
        if (Math.hypot(x - 90, z + 700) < 48 || Math.abs(x - (40 + (z + 660) * -0.3)) < 10) continue;
        const g = terrain.heightAt(x, z), w = 8 + rs() * 8, d = 7 + rs() * 5, hh = 4 + rs() * 7, yaw = (rs() - 0.5) * 0.3;
        props.box('plaster', x, g + hh / 2, z, w, hh, d, yaw, rs() < 0.5 ? 0xd8cfba : 0xc6b89c);
        m4.compose(v.set(x, g + hh + 1.4, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.PI / 4), v.clone().set(w * 0.72, 1, d * 0.72)); props.push('plain', new THREE.ConeGeometry(1, 2.8, 4), m4, 0x9a4228);
      }
      const cx = 90, cz = -700, g = terrain.heightAt(cx, cz) - 0.5, LEAD = 0x6e8878;
      props.box('stone', cx, g + 8, cz, 30, 16, 52, 0, WHITE);          // the nave, west to east (here north–south, facing the battlefield)
      props.box('stone', cx, g + 8, cz - 4, 50, 16, 22, 0, WHITE);      // the transepts
      props.box('plain', cx, g + 16.6, cz, 31, 1.2, 53, 0, LEAD);
      props.box('plain', cx, g + 16.6, cz - 4, 51, 1.2, 23, 0, LEAD);
      props.box('stone', cx, g + 20, cz - 4, 16, 8, 16, Math.PI / 4, WHITE);    // the drum under the great dome
      dome(cx, g + 24, cz - 4, 9, GOLD);                                  // the great gold dome
      for (const [dx, dz] of [[-14, -14], [14, -14], [-14, 8], [14, 8]]) dome(cx + dx, g + 17, cz + dz, 3.6, GOLD);
      for (const [dx, dz] of [[-21, -4], [21, -4], [0, -26]]) dome(cx + dx, g + 15, cz + dz, 4.5, LEAD);
      props.box('stone', cx, g + 19, cz + 30, 10, 38, 10, 0, WHITE);    // the bell tower at the west door
      dome(cx, g + 38, cz + 30, 4.4, GOLD);
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 3) || roadD(x, z) < 4.5 || railD(x, z) < 5 || tipK(x, z) > 0 || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 2) }];
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 3800, hedges: 800, autumn: 0.35, broadleaf: 0.9,
      noHedge: (x: number, z: number) => inTown(x, z) || away(x, z) < 26 || MOUNT(x, z) < 1.05,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (beech(x, z)) return 1;                                                         // the beech woods on the mountains’ flanks
        if (MOUNT(x, z) < 0.4) return 0;                                                   // the bare shoulders
        if (orchard(x, z)) return 0.7;                                                     // plum and walnut orchards
        const a = away(x, z);
        if (a > 14 && a < 26) return 0.35;                                                 // willows and poplars along both banks
        if (inTown(x, z)) return 0.04;                                                     // courtyard trees
        return 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
