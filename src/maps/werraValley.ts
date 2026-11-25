// Werra Valley, November 1985: the Werra between Vacha and Heringen, where the inner-German border crossed the river
// again and again. The valley is the real one, turned so the bases sit on the approach roads: it runs north-west to
// south-east right across the field, corner to corner (the river flows north-west), narrow and winding, its sides
// steep and wooded, the villages down on the floor beside the water. Hesse is the south-western bank (NATO, +z: the
// road from Friedewald comes down over the Seulingswald), Thuringia the north-eastern one (the Pact, -z: the road from
// Dorndorf), and the GDR's fence and control strip run along the north-eastern heights with their watchtowers, the
// border itself down the Werra. On the floor: Philippsthal and Vacha face each other across the Vacha bridge (the
// border bridge), Heimboldshausen and Heringen downstream on the Hessian bank with Heringen's potash spoil heap
// (Monte Kali, white salt), Unterbreizbach and Dippach upstream on the Thuringian bank with Unterbreizbach's own heap.
// Up on the heights: the broad wooded back of the Seulingswald over Hesse, the basalt cone of the Öchsen over Thuringia.
// Three bridges (Heringen, Vacha, Dippach) and no fords; the roads come down the valley sides in cuttings.
// Fairness by distance, not by mirror: each base looks down the valley at one end of it, so each side's floor points at
// its own end lie on the other side's bank (Heimboldshausen and Heringen nearer the Pact, Unterbreizbach and Dippach
// nearer NATO — each to be taken over a bridge), the bridge in the middle is shared, and each side has its height
// (the Seulingswald, the Öchsen) a little nearer it than the enemy. The ground is not a mirror: the valley bends its own
// way, the Hessian heights are a broad back, the Thuringian ones a plateau with one cone; the heaps stand on
// different bends.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import { year } from '../data/epoch.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const CACHE = { x: 580, z: 640 };
const BASE_Z = 500;
const HW = 12;
const noise = createNoise2D(1986);

// ---- the valley's frame: u along it (north-west → south-east, corner to corner), v across it (+v the Hessian bank)
const LEN = Math.hypot(BOUNDS.x, BOUNDS.z), EU = [BOUNDS.x / LEN, BOUNDS.z / LEN];
const U = (x: number, z: number) => x * EU[0] + z * EU[1];
const V = (x: number, z: number) => -x * EU[1] + z * EU[0];
const XZ = (u: number, v: number): [number, number] => [u * EU[0] - v * EU[1], u * EU[1] + v * EU[0]];
/** the valley's own bends: its centre line across */
const vc = (u: number) => 58 * Math.sin(u * 0.0071 + 0.6) + 21 * Math.sin(u * 0.019 - 1.1);
/** the floor's half-width: a gorge in places, a broad meadow in others */
const fw = (u: number) => 78 + 26 * Math.sin(u * 0.0061 + 1.3);
/** the Werra's loops on the floor */
const rv = (u: number) => vc(u) + (fw(u) - 50) * 0.8 * Math.sin(u * 0.0165 + 0.3);
const rvd = (u: number) => (rv(u + 1) - rv(u - 1)) / 2;
const COURSE: number[][] = [];
for (let u = -900; u <= 900; u += 12) COURSE.push(XZ(u, rv(u)));
const BRIDGE_U = [-385, 0, 380];
const river = createRiver({
  paths: [COURSE], halfWidth: HW, level: 0, depth: 2.4, valley: 30,
  crossings: [
    { name: 'Heringen bridge', x: XZ(BRIDGE_U[0], rv(BRIDGE_U[0]))[0], z: XZ(BRIDGE_U[0], rv(BRIDGE_U[0]))[1], kind: 'bridge', width: 14 },
    { name: 'Vacha bridge', x: XZ(0, rv(0))[0], z: XZ(0, rv(0))[1], kind: 'bridge', width: 15 },
    { name: 'Dippach bridge', x: XZ(BRIDGE_U[2], rv(BRIDGE_U[2]))[0], z: XZ(BRIDGE_U[2], rv(BRIDGE_U[2]))[1], kind: 'bridge', width: 14 },
  ],
});
/** distance to the water's centre line (across the course, close enough: the loops are gentle) */
const riverD = (x: number, z: number) => { const u = U(x, z); return Math.abs(V(x, z) - rv(u)) / Math.hypot(1, rvd(u)); };

// ---- the points (u, v) — the floor's villages, the bridge, the two heights
const P = (u: number, v: number) => XZ(u, v);
const floorV = (u: number, s: number, inset: number) => vc(u) + s * (fw(u) - inset);
const pts: [string, string, number, number, string, number?][] = [
  ['A', 'Friedewald', ...XZ(373, 333), 'centre'],
  ['B', 'Philippsthal', ...P(30, floorV(30, 1, 30)), 'centre'],
  ['C', 'Heimboldshausen', ...P(-225, floorV(-225, 1, 32)), 'west'],
  ['D', 'Heringen', ...P(-455, floorV(-455, 1, 34)), 'west'],
  ['E', 'Seulingswald', ...P(-150, 250), 'west'],
  ['F', 'Vacha bridge', ...P(0, rv(0)), 'centre', 30],
  ['G', 'Öchsen', ...P(150, -235), 'east'],
  ['H', 'Dippach', ...P(440, floorV(440, -1, 34)), 'east'],
  ['I', 'Vacha', ...P(-45, floorV(-45, -1, 30)), 'centre'],
  ['J', 'Unterbreizbach', ...P(205, floorV(205, -1, 32)), 'east'],
  ['K', 'Dorndorf', ...XZ(-373, -333), 'centre'],
];
const points: ControlPointDef[] = pts.map(([id, name, x, z, sector, radius]) => ({
  id, name, x: Math.round(x), z: Math.round(z), owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector: sector as any, ...(radius ? { radius } : {}),
}));
points[0].x = 0; points[0].z = BASE_Z - 34; points[10].x = 0; points[10].z = -(BASE_Z - 34);
const at = (id: string) => { const p = points.find((q) => q.id === id)!; return [p.x, p.z]; };
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

// ---- roads: along the floor on each bank, down the sides in cuttings to each bridge, out to the bases
const alongFloor = (s: number, u0: number, u1: number) => { const l: number[][] = []; for (let u = u0; u <= u1; u += 30) l.push(XZ(u, floorV(u, s, 15))); return l; };
const crossRoad = (ub: number, dn: number, dp: number) => [
  XZ(ub - dn, vc(ub - dn) + fw(ub - dn) + 120), XZ(ub - 18, floorV(ub - 18, 1, 15)), XZ(ub, rv(ub)),
  XZ(ub + 18, floorV(ub + 18, -1, 15)), XZ(ub + dp, vc(ub + dp) - fw(ub + dp) - 120)];
const CROSS_ROADS = [crossRoad(BRIDGE_U[0], 120, 110), crossRoad(BRIDGE_U[1], 120, 120), crossRoad(BRIDGE_U[2], 110, 120)];
const ROADS: number[][][] = [
  alongFloor(1, -820, 820), alongFloor(-1, -820, 820), ...CROSS_ROADS,
  [[0, 640], [0, BASE_Z], CROSS_ROADS[1][0]], [[0, BASE_Z], at('E'), CROSS_ROADS[0][0]], [[0, BASE_Z], CROSS_ROADS[2][0]],          // Friedewald's roads
  [[0, -640], [0, -BASE_Z], CROSS_ROADS[1][4]], [[0, -BASE_Z], CROSS_ROADS[0][4]], [[0, -BASE_Z], at('G'), CROSS_ROADS[2][4]],   // Dorndorf's
  [CROSS_ROADS[0][0], [-560, CROSS_ROADS[0][0][1] + 40]], [CROSS_ROADS[2][4], [560, CROSS_ROADS[2][4][1] - 40]],
];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const roadDist = gridCacheSmooth((x: number, z: number) => {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}, CACHE, 4);

// ---- the heights
/** the potash spoil heaps: Monte Kali over Heringen (Hesse), Unterbreizbach's (Thuringia) — [u, v, radius, height] */
const HEAPS = [[-395, 0, 62, 24], [250, 0, 50, 20]].map(([u, s, r, a], i) => [u, i ? floorV(u, -1, -30) - 50 : floorV(u, 1, -30) + 55, r, a]);
const HEAP_XZ = HEAPS.map(([u, v, r, a]) => [...XZ(u, v), r, a]);
const heapK = (x: number, z: number) => { let k = 0; for (const [hx, hz, r] of HEAP_XZ) k = Math.max(k, smoothstep(r, r * 0.55, Math.hypot(x - hx, z - hz))); return k; };
const SEUL = XZ(-200, 300), OECH = XZ(150, -235), DIETR = XZ(-150, -330);
/** the Hessian heights: a broad back rising to the Seulingswald and on to the south-west corner */
const hesse = (x: number, z: number, u: number, v: number) => 14.5 + 3.5 * fbm(noise, x * 0.006, z * 0.006, 3)
  + 8 * Math.exp(-(((u + 230) / 230) ** 2 + ((v - 310) / 150) ** 2)) + 3 * smoothstep(380, 700, v);
/** the Thuringian heights: a plateau, the Öchsen's basalt cone near the rim, a lower knoll (Dietrichsberg) up the valley */
const thur = (x: number, z: number) => {
  const c = Math.max(0, 1 - Math.hypot(x - OECH[0], z - OECH[1]) / 85), k = Math.max(0, 1 - Math.hypot(x - DIETR[0], z - DIETR[1]) / 95);
  return 16 + 3.5 * fbm(noise, x * 0.006 + 40, z * 0.006, 3) + 17 * c ** 1.6 + 9 * k ** 1.5;
};
/** how wide the climb from the floor to the heights is: steep on the outside of a bend, a cutting where a road comes down */
const sideW = (u: number, s: number) => 46 + 22 * Math.sin(u * 0.0071 + 0.6 + (s > 0 ? Math.PI : 0)) + 8 * Math.sin(u * 0.03 + s);
function groundExact(x: number, z: number) {
  const u = U(x, z), v = V(x, z), d = v - vc(u), s = d > 0 ? 1 : -1, a = Math.abs(d), w = fw(u);
  const sw = sideW(u, s) + 110 * smoothstep(36, 10, roadDist(x, z));
  const k = smoothstep(w, w + sw, a);
  const floor = 1.8 + u * 0.0025 + 0.4 * fbm(noise, x * 0.02, z * 0.02, 2);       // (the valley falls to the north-west)
  const top = s > 0 ? hesse(x, z, u, v) : thur(x, z);
  let h = floor + (top - floor) * k;
  h += k * (1 - k) * 4 * ridged(noise, x * 0.03 + 7, z * 0.03, 2) * 2.5;             // gullies down the sides
  // the heaps: white salt, flat-topped
  for (const [hx, hz, r, ha] of HEAP_XZ) {
    const q = smoothstep(r, r * 0.45, Math.hypot(x - hx, z - hz) * (1 + 0.08 * noise(x * 0.05, z * 0.05)));
    if (q > 0) h = Math.max(h, floor + ha * q);
  }
  h += smoothstep(BOUNDS.x - 10, BOUNDS.x + 110, Math.abs(x)) * 10 + smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 8;
  return h;
}
/** Each side's strip up on its heights behind its base (the Hessian and the Thuringian plateau). Tower 55 m off the strip. */
const AIRFIELDS = [
  { faction: 'nato', x: -250, z: 470, yaw: Math.PI / 2, large: false, name: 'Hersfeld strip' },
  { faction: 'pact', x: 250, z: -470, yaw: -Math.PI / 2, large: false, name: 'Merkers strip' },
];
/** How far outside the air strips' ground: < 0 inside. */
const airD = (x: number, z: number) => Math.max(Math.abs(x + Math.sign(z) * 250) - 150, Math.abs(Math.abs(z) - 497) - 58);
const AIR_H = [groundExact(-250, 497), groundExact(250, -497)];
const ground = gridCacheSmooth((x: number, z: number) => { const h = groundExact(x, z); return h + ((z > 0 ? AIR_H[0] : AIR_H[1]) - h) * smoothstep(24, 0, airD(x, z)); }, CACHE, 2);
const BASE_H = [groundExact(0, BASE_Z), groundExact(0, -BASE_Z)];
function height(x: number, z: number) {
  let h = ground(x, z);
  h += (BASE_H[0] - h) * smoothstep(30, 16, Math.hypot(x, z - BASE_Z));
  h += (BASE_H[1] - h) * smoothstep(30, 16, Math.hypot(x, z + BASE_Z));
  return river.carve(x, z, Math.max(1.4, h));
}
/** 0 on the floor and the heights, 1 on the valley sides */
const sideK = gridCache((x: number, z: number) => {
  const u = U(x, z), a = Math.abs(V(x, z) - vc(u)), w = fw(u), s = V(x, z) > vc(u) ? 1 : -1;
  const k = smoothstep(w, w + sideW(u, s), a);
  return smoothstep(0.02, 0.15, k) * smoothstep(0.98, 0.85, k);
}, CACHE, 4);
/** the GDR's fence on the north-eastern heights: its line across the valley (v) for each u */
const fenceV = (u: number) => vc(u) - fw(u) - sideW(u, -1) - 55 - 10 * Math.sin(u * 0.012);

export default {
  id: 'werra-valley',
  armies: { 1945: { nato: ['us'], pact: ['wh', 'fj'] } }, // (spring 1945 in Hesse and Thuringia: the US Army against the Wehrmacht and the last Fallschirmjäger — maps/index.js armiesOn)
  name: 'Werra Valley',
  description: 'The Werra winds corner to corner through its narrow wooded valley on the border, villages and potash heaps on the floor and only three bridges. Hold them, blow them, or lay your own.',
  ww2: { description: 'The Werra winds through its narrow wooded valley, villages on the floor and only three bridges over it. Hold them, blow them, or lay your own.' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1986,
  height,
  airfields: AIRFIELDS,
  steep: 0.62, // (the valley sides: vehicles come down the cuttings)
  river,
  bridgeAt: (x, z) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1986, cell: 64 }),

  theme: {
    // a damp, misty November morning in the valley
    fogColor: 0x9ea6a8,
    fogDensity: 0.0021,
    skyTop: 0x6a7378,
    skyHorizon: 0xb6bab6,
    skyBottom: 0x6c706c,
    sunColor: 0xe6e2d4,
    sunIntensity: 1.5,
    sunDisk: 0.08,
    clouds: 0.85,
    cloudLight: 0xc6c9c6,
    cloudDark: 0x767c80,
    sunDir: [0.4, 0.5, -0.75],
    hemiSky: 0xc0cad0,
    hemiGround: 0x46463a,
    hemiIntensity: 1.3,
    rimColor: 0xb8c0c8,
    rimIntensity: 0.25,
    terrain: {
      grass: '#556236',
      grassAlt: '#4a5832',
      dryGrass: '#80744e',
      dirt: '#524438',
      rock: '#686660',
      pasture: '#56653a',
      ploughed: '#4a3b2d',
      stubble: '#857650',
      meadow: '#62703e',
      farmX: [520, 600],
      farmZ: [580, 660],
      roads: [],
      roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < 3.6) return [0x5e5c58, 0.9];                                           // the roads
        const hk = heapK(x, z);
        if (hk > 0) return [0xdcd8d0, Math.min(1, hk * 1.3)];                                       // the salt heaps
        const u = U(x, z), fv = Math.abs(V(x, z) - fenceV(u));
        if (fv < 6 && year() >= 1985) return [0x5a4636, smoothstep(6, 3, fv) * 0.85];                     // the control strip
        if (riverD(x, z) < HW + 30 && y < 2.4) return [0x58603c, 0.5];                              // the water meadows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1-ya Rota', facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const free = (x: number, z: number, r: number) => roadDist(x, z) > 6 + r && riverD(x, z) > HW + 10 + r && !nearPoint(x, z, 13 + r)
      && sideK(x, z) < 0.05 && heapK(x, z) === 0 && airD(x, z) > 10 + r && Math.hypot(x, Math.abs(z) - BASE_Z) > 40 + r;

    // ---- the villages on the floor: houses along the valley road, a church in the bigger ones (each its own dice)
    props.rand = mulberry32(9101);
    const r0 = props.rand;
    for (const p of points) {
      if (!'BCDHIJ'.includes(p.id)) continue;
      const big = 'BDI'.includes(p.id), yaw = Math.atan2(EU[0], EU[1]);
      let church = !big;
      for (let i = 0; i < (big ? 26 : 14); i++) {
        const a = r0() * Math.PI * 2, d = 16 + r0() * (big ? 70 : 48), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (!free(x, z, 5)) continue;
        if (!church && d > 30) { props.church({ x, z, yaw: yaw + (r0() < 0.5 ? 0 : Math.PI) }); church = true; continue; }
        props.townHouse({ x, z, yaw: yaw + (r0() < 0.5 ? 0 : Math.PI / 2) + (r0() - 0.5) * 0.3, width: 8 + r0() * 3, depth: 8 + r0() * 2, storeys: r0() < 0.6 ? 2 : 1, damaged: 0 });
      }
    }
    // ---- the potash works below each heap: the shaft head and its halls
    for (const [hx, hz, r] of HEAP_XZ) {
      const u = U(hx, hz), s = V(hx, hz) > vc(u) ? 1 : -1, [wx, wz] = XZ(u + 70, floorV(u + 70, s, 32));
      if (free(wx, wz, 14)) props.hall({ x: wx, z: wz, yaw: Math.atan2(EU[0], EU[1]), width: 26, depth: 14, height: 8, color: 0x8a7a68, roof: 0x4a4c4e, door: 6, name: 'potash works' });
      const [tx, tz] = XZ(u + 40, floorV(u + 40, s, 26));
      if (free(tx, tz, 4)) { const g = terrain.heightAt(tx, tz); props.box('metal', tx, g + 11, tz, 4, 22, 4, 0.3, 0x4a4e52); props.box('metal', tx, g + 21, tz, 7, 2, 2, 0.3, 0x3a3e42); }
    }
    // ---- farms and field cover up on the heights and down the floor, each bank its own dice
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks', 'hay', 'fieldwall', 'roadblock'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 260 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 20);
      if (!free(x, z, 8) || nearPoint(x, z, 34) || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 30 * 30)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    // ---- the GDR fence along the north-eastern heights: posts and wire, open where the roads go through, the towers
    if (year() >= 1985) {
      props.rand = mulberry32(303);
      for (let u = -820; u <= 820; u += 3.2) {
        const [x, z] = XZ(u, fenceV(u)), [x2, z2] = XZ(u + 3.2, fenceV(u + 3.2));
        if (Math.abs(x) > bounds.x + 30 || Math.abs(z) > bounds.z + 30 || roadDist(x, z) < 9 || nearPoint(x, z, 20)) continue;
        const g = terrain.heightAt(x, z), yaw = Math.atan2(-(z2 - z), x2 - x);
        props.box('stone', x, g + 1.2, z, 0.14, 2.4, 0.14, 0, 0x7d7a72);
        for (const hh of [0.6, 1.3, 2.0]) props.box('metal', (x + x2) / 2, g + hh, (z + z2) / 2, 3.2, 0.03, 0.03, yaw, 0x55575a);
      }
      for (const u of [-520, -200, 110, 430]) { const [x, z] = XZ(u, fenceV(u) - 22); if (!nearPoint(x, z, 25) && roadDist(x, z) > 8) props.tower({ x, z, concrete: true }); }
      const [ox, oz] = XZ(-160, vc(-160) + fw(-160) + sideW(-160, 1) + 40); props.tower({ x: ox, z: oz, concrete: false }); // the US observation post over Philippsthal
    }
    // ---- the Vacha bridge's checkpoints: the West's barrier at the Hessian end, the GDR's walls at the Thuringian
    props.rand = mulberry32(606);
    const vb = river.crossings[1];
    for (const [s, k] of [[1, 'jersey'], [-1, 'wall']] as const) {
      const q = river.at(vb, 0, 0), side = Math.sign(V(q.x + vb.nx * 30, q.z + vb.nz * 30) - vc(U(q.x, q.z))) === s ? 1 : -1;
      const e = river.at(vb, -9, side * (HW + 18)), f2 = river.at(vb, 10, side * (HW + 22));
      if (k === 'jersey') { props.jersey({ x: e.x, z: e.z, yaw: river.yawOf(vb) + Math.PI / 2 + 0.2, length: 5 }); props.jersey({ x: f2.x, z: f2.z, yaw: river.yawOf(vb) + Math.PI / 2 - 0.15, length: 4 }); }
      else { props.wall({ x: e.x, z: e.z, yaw: river.yawOf(vb) + Math.PI / 2 + 0.1, length: 7, height: 1.2 }); for (const dx of [-13, 13]) { const hq = river.at(vb, dx, side * (HW + 28)); props.hedgehog({ x: hq.x, z: hq.z }); } }
    }
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x5a5a3c);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: HW + 14 })),
      { test: (x: number, z: number) => riverD(x, z) < HW + 1.5 || roadDist(x, z) < 6 || heapK(x, z) > 0 || airD(x, z) < 12 }];
    // beech and spruce down the valley sides and over the Seulingswald, alders along the water, fields on the heights
    const forest = (x: number, z: number) => {
      const rd = riverD(x, z);
      if (rd < HW + 1) return -1;
      const sk = sideK(x, z);
      const seul = Math.hypot(x - SEUL[0], z - SEUL[1]) < 170 + 30 * noise(x * 0.01, z * 0.01) ? 0.8 : 0;
      const och = Math.hypot(x - OECH[0], z - OECH[1]) < 55 ? 0.45 : 0;
      return Math.max(sk > 0.3 ? 0.9 : 0, rd < HW + 12 ? 0.5 : 0, seul, och, noise(x * 0.008 + 300, z * 0.008) > 0.5 ? 0.7 : 0);
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 5600, forest, broadleaf: 0.55, autumn: 0.6, maxY: 60 });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x: number, z: number) => sideK(x, z) > 0.1 }], count: 6000, lane: 0 });
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 3, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt, t) {
        grass.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
