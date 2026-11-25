// Varangerfjord, winter 1985 (coastal: the Soviet naval infantry lands, Norway holds; 1.0 × 1.8 km). The Sør-Varanger
// coast of Finnmark, a few kilometres from the Soviet border: the Northern Fleet’s naval infantry (the 63rd Kirkenes
// Brigade, named for the town it took in 1944) comes in from the Varangerfjord to land behind the Norwegian border
// defence on the Pasvik and the E6 and turn it. Out at sea the Pact’s landing ships and the Royal Norwegian Navy’s
// controlled minefield; then the coast as it is at Kirkenes: the town on its rocky peninsula thrust out into the
// fjord, the Bøkfjord cutting deep inland west of it, and east of it the harbour bay with Prestøya off the point and
// A/S Sydvaranger’s ore quay — the long mole the ore carriers berth at, the pellet plant and its stacks behind. Two ways
// in: the sand at the Bøkfjord’s head, a long run up the fjord under the peninsula’s rock, with the road up to Hesseng;
// and the small beach at the head of the harbour bay beside the ore quay, with the road over the neck of the peninsula
// into Kirkenes. The rest is bare grey rock, low and smooth-scoured, straight up from the water. Behind the shore: snow
// over rolling rock and bog, birch scrub in the hollows, Bjørnevatn’s black spoil tips in the east, the E6 across, and
// inland the edge of Høybuktmoen, Kirkenes airport, with its runway. The Garrison in Sør-Varanger and the Home Guard hold
// the shore; Brigade Nord’s armour counter-attacks from the airfield.
// (Compressed: Høybuktmoen is 10 km west of Kirkenes and Bjørnevatn 10 km south; here all lie within a kilometre.)
// Laid out in a frame with the sea toward +z (`L`), then turned round: the Pact’s side is -z, so the sea is there (the
// landing comes from its base out at sea: systems/Landing.js lands()).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_19);
const sea = createSea({ level: 0, size: SIZE, color: 0x1d3640 }); // (the Varangerfjord in winter: dark, ice-cold, never frozen)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -330, name: 'Bøkfjord head', inland: { name: 'Hesseng', x: -290, z: -330 } },
  { x: 345, name: 'Harbour beach', inland: { name: 'Kirkenes', x: 20, z: 215 } },
];
/** 1 on a beach, 0 on the bare rock of the shore elsewhere. */
const beachK = (x: number) => Math.max(Math.exp(-(((x + 330) / 80) ** 2)), Math.exp(-(((x - 345) / 55) ** 2)));
/** The peninsula (0..1 across x) between the Bøkfjord and the harbour bay. */
const penK = (x: number) => smoothstep(-185, -95, x) * smoothstep(235, 175, x);
/** The waterline (local z): deep in at the Bøkfjord’s head, far out at the peninsula’s point, the harbour bay between. */
const shoreZ = (x: number) => -70 + fbm(noise, x * 0.004, 2.1, 2) * 14 + (1 - beachK(x)) * fbm(noise, x * 0.03, 7.7, 2) * 9
  + penK(x) * (360 - 50 * ((x - 30) / 130) ** 2) + smoothstep(175, 235, x) * 170;
/** Prestøya: the islet off the point in the harbour bay. */
const ISLE = { x: 455, z: 270, r: 42, top: 11 };
/** The ore quay (local x): Sydvaranger’s mole, 70 m out into the harbour bay off the peninsula’s east side. */
const QUAY = { x: 245, w: 8, out: 72, deck: 2.6 };
/** The bog inland (0..1). */
const moorK = (x: number, z: number) => smoothstep(0.05, 0.22, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * smoothstep(-130, -210, z - shoreZ(x));
/** Bjørnevatn’s spoil tips (the open-pit mine’s waste rock), east. */
const HEAPS: [number, number, number, number][] = [[440, -330, 34, 10], [380, -400, 26, 7]];
const heapK = (x: number, z: number) => HEAPS.reduce((k, [cx, cz, r]) => Math.max(k, smoothstep(r, r * 0.4, Math.hypot(x - cx, z - cz))), 0);
/** Høybuktmoen: the runway (local), east–west, inland; the ground round it graded. */
const onRunway = (x: number, z: number) => Math.abs(z + 720) < 22 && x > -90 && x < 400;
const runK = (x: number, z: number) => smoothstep(95, 55, Math.abs(z + 715)) * smoothstep(330, 280, Math.abs(x - 155));
/** The hills: the peninsula’s rock over the town, the fells south of the Bøkfjord: [x, z, radius, height]. */
const HILLS = [[-20, 250, 70, 14], [130, 60, 60, 9], [-430, -260, 90, 18], [-150, -380, 80, 12], [250, -230, 90, 14]];
const hillH = (x: number, z: number) => { let h = 0; for (const [hx, hz, r, a] of HILLS) { const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (d2 < 9) h += a * Math.exp(-d2); } return h; };

/** Distance from (x, z) to the segment a–b. */
function seg(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
/** The roads (local): up from the Bøkfjord through Hesseng; from the harbour over the neck into Kirkenes and south to Bjørnevatn; Kirkenes–Hesseng; the E6. */
const ROADS: number[][][] = [
  [[-330, shoreZ(-330) - 25], [-300, -200], [-290, -330], [-220, -600]],
  [[345, shoreZ(345) - 25], [300, 0], [160, 60], [60, 130], [20, 215], [10, 260]],
  [[300, 0], [330, -250], [330, -600]],
  [[60, 130], [0, -60], [-120, -260], [-290, -330]],
  [[-480, -610], [-220, -600], [0, -590], [330, -600], [480, -585]],
  [[0, -590], [0, -830]],
];
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const r of ROADS) for (let i = 1; i < r.length; i++) d = Math.min(d, seg(x, z, r[i - 1], r[i]));
  return d;
}
const roadC = gridCache((x: number, z: number) => roadDist(x, F * z), BOUNDS, 2); // (world)
const onRoadL = (x: number, z: number) => roadC(x, F * z) < 3.5;

/** Ground height in the local frame (sea toward +z), before Kirkenes’ plots are graded. */
function naturalL0(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  const bk = beachK(x);
  if (d > 0) { // the bottom: shelving off, skerries off the bare rock, Prestøya
    let h = 0.4 - d * (0.02 + 0.03 * (1 - bk)) - Math.max(0, d - 120) * 0.05 + (1 - bk) * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    h = Math.max(h, -20);
    const id = Math.hypot(x - ISLE.x, z - ISLE.z);
    if (id < ISLE.r + 30) h = Math.max(h, (ISLE.top + fbm(noise, x * 0.05, z * 0.05, 2) * 3) * smoothstep(ISLE.r + 5, ISLE.r - 15, id) + 0.5 - 6.5 * smoothstep(ISLE.r - 5, ISLE.r + 30, id));
    return h;
  }
  const back = -d;
  // the beach (35 m of grey sand and shingle), or bare smooth rock rising straight from the water
  const sand = 0.5 + Math.min(back, 40) * 0.04;
  const rock = 0.5 + (4.5 + fbm(noise, x * 0.04, z * 0.04, 2) * 2.5) * smoothstep(1, 12, back);
  const shore = sand * bk + Math.max(sand, rock) * (1 - bk);
  // the land: 6–12 m of rolling rock and snow, rising slowly inland
  const land = 5 + smoothstep(30, 110, back) * 4 + Math.min(Math.max(0, -z - 100) * 0.01, 7) + fbm(noise, x * 0.005, z * 0.005, 3) * 5 + hillH(x, z);
  let h = Math.max(shore, Math.min(land, shore + back * 0.2));
  h -= moorK(x, z) * 0.9; // (the bog hollows)
  for (const [cx, cz, r, a] of HEAPS) h += a * smoothstep(r, r * 0.3, Math.hypot(x - cx, z - cz));
  const rk = runK(x, z);
  if (rk > 0) h += (14 - h) * rk; // Høybuktmoen graded
  return h;
}

// ---- Kirkenes laid out (local): Kongens gate, the main street, is the road through the square (point F); a street
// either side of it, two cross streets, the harbour street down to the town quay on the peninsula’s east shore. Each
// building gets a plot graded flat into the slope (a terrace, 4 m of bank round it): `naturalL` below.
const STREETS: number[][][] = [
  [[-15, 120], [-50, 195], [-55, 250]],
  [[110, 125], [80, 190], [70, 250]],
  [[-75, 170], [140, 170]],
  [[-60, 245], [100, 245]],
  [[80, 205], [175, 205]],
];
const MAIN = ROADS[1].slice(3); // (60,130) → the square → (10,260)
const streetDist = (x: number, z: number) => { let d = Infinity; for (const r of [...STREETS, MAIN]) for (let i = 1; i < r.length; i++) d = Math.min(d, seg(x, z, r[i - 1], r[i])); return d; };
const TOWN_SQ = SECTORS[1].inland;
const KEEP_CLEAR = [[TOWN_SQ.x, TOWN_SQ.z, 32], [165, 150, 16], [180, 140, 14], [275, -15, 14]]; // the square (F), the Haganes battery, two of the defence’s posts
type Plot = { x: number, z: number, fx: number, fz: number, w: number, d: number, kind: string, level: number, hw: number, hd: number, r: number, h?: number, color?: number, name?: string };
const plot = (x: number, z: number, fx: number, fz: number, w: number, d: number, kind: string, o: Partial<Plot> = {}, bank = 2): Plot =>
  ({ x, z, fx, fz, w, d, kind, level: naturalL0(x, z), hw: w / 2 + bank, hd: d / 2 + bank, r: Math.hypot(w / 2, d / 2) + bank + 4, ...o });
/** Where the plot’s footprint (plus `m`) covers (x, z). */
const inPlot = (p: Plot, x: number, z: number, m = 0) => {
  const dx = x - p.x, dz = z - p.z;
  return Math.abs(dx * p.fz - dz * p.fx) < p.w / 2 + m && Math.abs(dx * p.fx + dz * p.fz) < p.d / 2 + m;
};
const PLOTS: Plot[] = (() => {
  const r = mulberry32(1985_191);
  const out: Plot[] = [
    plot(-17, 195, 1, 0, 10, 24, 'church'),                                                     // Kirkenes kirke, its tower to the square
    // A/S Sydvaranger: the pellet plant, the concentrator, the ore store, the office
    plot(QUAY.x - 25, shoreZ(QUAY.x) - 85, 0, -1, 46, 22, 'hall', { h: 16, color: 0x6a5e54, name: 'pellet plant' }),
    plot(165, -20, 0, -1, 34, 18, 'hall', { h: 13, color: 0x5e5852, name: 'concentrator' }),
    plot(255, -58, 0, 1, 50, 16, 'hall', { h: 9, color: 0x7a6e60, name: 'ore store' }),
    plot(128, 12, 1, 0, 18, 10, 'flats', { name: 'Sydvaranger office' }),
  ];
  const clear = (x: number, z: number, rr: number) => KEEP_CLEAR.every(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) > cr + rr)
    && out.every((p) => Math.hypot(x - p.x, z - p.z) > p.r - 4 + rr);
  const slopeOk = (x: number, z: number, rr: number) => {
    const hs = [[0, 0], [rr, 0], [-rr, 0], [0, rr], [0, -rr]].map(([a, b]) => naturalL0(x + a, z + b));
    return Math.min(...hs) > 2.5 && Math.max(...hs) - Math.min(...hs) < 3.5 && z < shoreZ(x) - 14 && moorK(x, z) < 0.3;
  };
  for (const [si, st] of [...STREETS, MAIN].entries()) {
    const main = si === STREETS.length, harbour = si === 4;
    for (let i = 1; i < st.length; i++) {
      const [ax, az] = st[i - 1], [bx, bz] = st[i], len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len;
      for (let s = 9; s < len - 6; s += 15) for (const side of [-1, 1]) {
        const big = (main && r() < 0.5) || (si === 2 && r() < 0.2); // blocks of flats along Kongens gate and the long cross street
        const store = harbour && ax + tx * s > 125;                 // the warehouses down at the quay
        const w = store ? 22 : big ? 20 : 7 + r() * 3, d = store ? 12 : big ? 10 : 8 + r() * 1.5, back = d / 2 + 6.5;
        const x = ax + tx * s - side * tz * back, z = az + tz * s + side * tx * back, rr = Math.hypot(w, d) / 2;
        if (streetDist(x, z) < back - 0.5 || roadDist(x, z) < back - 0.5 || !clear(x, z, rr) || !slopeOk(x, z, rr)) continue;
        out.push(plot(x, z, side * tz, -side * tx, w, d, store ? 'store' : big ? 'flats' : 'house', { name: store ? 'warehouse' : big ? 'block of flats' : 'house' }));
      }
    }
  }
  return out;
})();
const PLOT_BOX = [Math.min(...PLOTS.map((p) => p.x - p.r)), Math.max(...PLOTS.map((p) => p.x + p.r)), Math.min(...PLOTS.map((p) => p.z - p.r)), Math.max(...PLOTS.map((p) => p.z + p.r))];
/** Ground height in the local frame, the smooth part (sampled once): Kirkenes’ plots graded flat into the slope. */
function naturalL(x: number, z: number) {
  let h = naturalL0(x, z);
  if (x < PLOT_BOX[0] || x > PLOT_BOX[1] || z < PLOT_BOX[2] || z > PLOT_BOX[3]) return h;
  for (const p of PLOTS) {
    const dx = x - p.x, dz = z - p.z;
    if (Math.abs(dx) > p.r || Math.abs(dz) > p.r) continue;
    const k = Math.min(smoothstep(p.hw + 4, p.hw, Math.abs(dx * p.fz - dz * p.fx)), smoothstep(p.hd + 4, p.hd, Math.abs(dx * p.fx + dz * p.fz)));
    if (k > 0) h += (p.level - h) * k;
  }
  return h;
}
const naturalC = gridCacheSmooth((x: number, z: number) => naturalL(x, F * z), BOUNDS, 2); // (world)
function height(x: number, z: number) {
  const h = naturalC(x, z), lz = F * z, d = lz - shoreZ(QUAY.x);
  const qk = smoothstep(QUAY.w + 3, QUAY.w, Math.abs(x - QUAY.x)) * smoothstep(QUAY.out + 6, QUAY.out, d) * smoothstep(-20, -5, d);
  return qk > 0 ? h + (Math.max(h, QUAY.deck) - h) * qk : h; // the ore quay
}

/** The bogs (and the snow over the rock): vehicles all but stuck off the roads. */
const moorC = gridCache((x: number, z: number) => moorK(x, F * z), BOUNDS);
function soft(x: number, z: number, foot: boolean) {
  if (roadC(x, z) < 3.5) return 1;
  const m = moorC(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.45 : 0.85);
}

const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
const beachLine = (x: number) => shoreZ(x) - 42;

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Landing area', ...W(-120, 760), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Bøkfjord head', ...W(-330, beachLine(-330)), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Harbour beach', ...W(345, beachLine(345)), owner: null, sector: 'east', radius: 45, opens: 'F' },
  { id: 'E', name: 'Hesseng', ...W(-290, -330), owner: null, sector: 'west' },
  { id: 'F', name: 'Kirkenes', ...W(20, 215), owner: null, sector: 'centre' }, // (up on the peninsula’s rock, near its point: a long way up from the harbour)
  { id: 'K', name: 'Høybuktmoen', ...W(-200, -640), owner: 'nato', sector: 'centre' },
];
/** Høybuktmoen’s airfield (world): the tower 55 m in front of the runway’s middle (systems/Airfields.js strip). */
const AIRFIELD = { faction: 'nato', ...W(150, -665), yaw: Math.PI / 2, large: false, name: 'Høybuktmoen' };
/** Kirkenes, on the peninsula (local). */
const townK = (x: number, z: number) => smoothstep(130, 90, Math.hypot(x - 30, (z - 200) * 0.9));

/** A Finnmark wooden house (occupiable): painted board walls (falu red, ochre, white, pale blue or green), white window
 * frames and corner boards on a concrete footing, a pitched roof under snow or swept dark. */
function woodHouse(props: PropBuilder, { x, z, yaw, width, depth, storeys }: { x: number, z: number, yaw: number, width: number, depth: number, storeys: number }) {
  const r = props.rand, h = storeys * 2.9, t = 0.3, trim = 0xeeece6;
  const color = [0x8a2e22, 0x8a2e22, 0xc8962e, 0xe2ded2, 0x7896a8, 0x5c7656, 0xd8c69a, 0x6e2424][Math.floor(r() * 8)];
  const b = props.beginBuilding('house', x, z, yaw, width, depth);
  b.plaster = color;
  props.shell(b, { height: h, storeys, t, key: 'plain', color, frame: trim, bay: 2.4, front: [(r() - 0.5) * width * 0.4] });
  for (let s = 1; s < storeys; s++) props.piece('plain', b, 0, s * 2.9, 0, width - t, 0.2, depth - t, 0x5a4a3c); // floors
  props.piece('stone', b, 0, 0.05, 0, width + 0.2, 0.7, depth + 0.2, 0x5a5a58);                                // the footing
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) props.piece('plain', b, sx * (width / 2 + 0.02), h / 2, sz * (depth / 2 + 0.02), 0.24, h, 0.24, trim);
  props.gableRoof(b, { eave: h, t, pitch: 0.6, color: r() < 0.65 ? 0xe6eaec : 0x2e3134, chimney: true });
  props.endBuilding();
  return b;
}

export default {
  id: 'varanger',
  name: 'Varangerfjord Landing',
  description: 'Sør-Varanger, Finnmark, winter 1985: Kirkenes on its rocky peninsula, the Bøkfjord cutting deep inland west of it, the harbour bay with Prestøya and the iron-ore quay east of it — two small beaches in bare rock — birch scrub and bog under the snow, Høybuktmoen airfield inland. The Soviet naval infantry lands to turn the border defence; Norway holds.',
  epochs: ['1985'],
  region: 'north',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  armies: { nato: ['no'], pact: ['sov'] }, // (the Garrison in Sør-Varanger, the Home Guard and Brigade Nord; the Northern Fleet’s naval infantry lands)
  conditions: { time: 'dawn', weather: 'overcast' },
  climate: 'winter',
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles: the bare rock of the shore is no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft,
  river: sea,
  airfields: [AIRFIELD],

  theme: {
    fogColor: 0xa6b2bc, fogDensity: 0.0007,
    skyTop: 0x586a80, skyHorizon: 0xc0c6cc, skyBottom: 0x78828c,
    sunColor: 0xffdcc0, sunIntensity: 1.35, sunDisk: 0.15,
    clouds: 0.8, cloudLight: 0xd6d8dc, cloudDark: 0x78828c,
    sunDir: [0.5, 0.22, -0.84],
    hemiSky: 0xccd6e2, hemiGround: 0x8a9098, hemiIntensity: 1.4,
    rimColor: 0xc8d2dc, rimIntensity: 0.25,
    terrain: {
      grass: '#eef2f4', grassAlt: '#e2e8ec', dryGrass: '#d8d8d0', dirt: '#8a8478', rock: '#5a5c60',
      pasture: '#eceff0', ploughed: '#d0ccc4', stubble: '#dcd8ce', meadow: '#f2f4f4',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoadL(x, lz) && lz < sz - 20) return [0x9a968e, 0.9];                          // the ploughed road
        if (onRunway(x, lz)) return [0x6a6a6a, 0.95];                                      // the runway, swept
        if (x > -80 && x < 185 && lz > 115 && lz < 265 && lz < sz - 10 && streetDist(x, lz) < 3.2) return [0x9a968e, 0.9]; // Kirkenes’ streets
        if (Math.abs(x - QUAY.x) < QUAY.w + 1 && lz > sz - 10 && lz < sz + QUAY.out) return [0x7a7874, 0.95]; // the quay’s concrete
        if (y < 0.3) return [y > -2 ? 0x8a8a84 : 0x5a5a56, 1];                              // grey stones under the water
        if (Math.hypot(x - ISLE.x, lz - ISLE.z) < ISLE.r + 25) return [noise(x * 0.06, z * 0.06) > 0 ? 0x55575a : 0xd8dcdc, 0.9]; // Prestøya’s rock
        if (lz > sz - 30 && beachK(x) < 0.5 && y > 1.2) return [0x55575a, 0.9];              // the bare rock of the shore, washed clear of snow
        if (lz > sz - 36) return [0xb4b0a6, 1];                                             // the beach: grey sand and shingle
        if (heapK(x, lz) > 0.05) return [0x3e3c3a, Math.min(1, heapK(x, lz) * 1.5)];       // the spoil, black
        const m = moorK(x, lz);
        if (m > 0.1) return [noise(x * 0.04, z * 0.04) > 0.1 ? 0x9a9884 : 0xcdd0c8, m * 0.7]; // sedge and dwarf birch through the snow
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-30, 0, 30] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 250 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Soviet landing comes in: the naval infantry by Aist hovercraft or Polnocny, vehicles by Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    // what the landing may call in at sea: the Northern Fleet’s escorts (the corvette slot, the Osas, the Natya sweepers, the Tarantul)
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Royal Norwegian Navy’s controlled minefield across the fjord, a lane left off each beach for the sweepers
    seaMines: { z: [520, 580], count: 60, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_19 },
    // the coastal artillery: a gun on the peninsula’s point over both ways in, one on the Bøkfjord’s west shore
    forts: [{ unit: 'artillery', ...W(-95, shoreZ(-95) - 45), facing: Math.PI, name: 'Kirkenes point battery' }, { unit: 'artillery', ...W(165, 150), facing: Math.PI, name: 'Haganes battery' }, { unit: 'artillery', ...W(-460, shoreZ(-460) - 50), facing: Math.PI, name: 'Bøkfjord battery' }],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests in the rock over it
    works: [
      ...SECTORS.flatMap((s) => Array.from({ length: 13 }, (_, i) => { const x = s.x - 66 + i * 11; return beachK(x) < 0.35 || Math.abs(x - QUAY.x) < 14 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter((w) => !!w)),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 54), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 48), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    // the defence at dawn: the Garrison in Sør-Varanger and the Home Guard over each beach, on the fjord’s rock and in the villages
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts', 'rifles', 'atTeam', 'rifles', 'mgTeam'],
    names: { rifles: 'GSV section' },
    hold: [...SECTORS.flatMap((s) => [-40, -18, 18, 40].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56)))),
      W(-120, 40), W(180, 140), W(275, -15), W(415, -20), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))], // (on the peninsula’s flanks, over the boats coming up the fjord and the bay)
    // the counter-attack: Brigade Nord’s armour along the E6 from Høybuktmoen
    counter: { t: 210, units: ['tank', 'ifv', 'tank', 'ifv', 'reconVehicle'], say: 'Brigade Nord is coming along the E6 from Høybuktmoen: Leopards and M113s, straight for the beachhead', sayOther: 'Enemy armour coming down the road from the airfield' },
    // the landing’s AI (ai/LandingDirector.js): the naval infantry’s buying order, a corvette inshore off the focus beach
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 390 },
    economy: { reserves: 1800, perSector: 500, beachIncome: 0.6, defenceCp: 1400, defenceIncome: 2.8 }, // (AI vs AI 2026-11-25, Kirkenes down by the neck: the landing won at 6:05 on 1000 / 2 CP, at 16:31 and 13:11 on 1400 / 2.6–2.8, at 13:39 and 11:26 on 1500 / 3.2 — the harbour fell in under two minutes every time; Kirkenes moved up onto the point, a battery over the harbour: then the defence held Hesseng to the end once, and the landing won at 17:01 once)
    // the amphibious vehicles swim in on their own: BTRs, BRDMs and the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 }, { unit: 'pt76', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 }, { unit: 'ifv', sector: 1 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_19);
    sea.build(scene, terrain);
    const dry = (x: number, z: number) => z < shoreZ(x) - 60 && roadDist(x, z) > 9 && moorK(x, z) < 0.3 && heapK(x, z) === 0 && !points.some((p) => Math.hypot(p.x - x, p.z - F * z) < 22);

    // ---- Hesseng and Bjørnevatn: painted wooden houses (all rebuilt after 1944)
    for (let [cx, cz, n, spread] of [[-290, -330, 10, 45], [350, -260, 8, 36]] as [number, number, number, number][]) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 22 + r() * spread;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!dry(x, z)) continue;
        n--;
        woodHouse(props, { ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1 });
      }
    }

    // ---- Kirkenes (PLOTS): painted wooden houses behind their picket fences, blocks of flats along Kongens gate, the
    // church on the square, warehouses at the town quay; street lamps
    for (const p of PLOTS) {
      const w = W(p.x, p.z), yaw = Math.atan2(p.fx, F * p.fz);
      if (p.kind === 'house') {
        woodHouse(props, { ...w, yaw, width: p.w, depth: p.d, storeys: r() < 0.65 ? 2 : 1 });
        // the picket fence round the front garden, a gate on the path
        const L = (u: number, v: number) => W(p.x - u * p.fz + v * p.fx, p.z + u * p.fx + v * p.fz); // (u across the front, v toward the street)
        const fv = p.d / 2 + 2.6, fu = p.w / 2 + 1.5;
        const run = (u0: number, v0: number, u1: number, v1: number) => {
          const n = Math.max(1, Math.round(Math.hypot(u1 - u0, v1 - v0) / 1.6));
          for (let k = 0; k <= n; k++) { const a = L(u0 + (u1 - u0) * k / n, v0 + (v1 - v0) * k / n); props.box('plain', a.x, terrain.heightAt(a.x, a.z) + 0.5, a.z, 0.12, 1, 0.12, 0, 0xe8e6e0); }
          const a = L(u0, v0), b = L(u1, v1), g = (terrain.heightAt(a.x, a.z) + terrain.heightAt(b.x, b.z)) / 2, len = Math.hypot(b.x - a.x, b.z - a.z), ry = Math.atan2(b.x - a.x, b.z - a.z);
          for (const y of [0.35, 0.8]) props.box('plain', (a.x + b.x) / 2, g + y, (a.z + b.z) / 2, 0.06, 0.09, len, ry, 0xe8e6e0);
        };
        run(-fu, fv, -1.2, fv); run(1.2, fv, fu, fv); run(-fu, fv, -fu, 0); run(fu, fv, fu, 0);
      } else if (p.kind === 'flats') flats(props, { ...w, yaw, storeys: p.name === 'block of flats' ? 3 + Math.floor(r() * 2) : 3, width: p.w, depth: p.d, name: p.name });
      else if (p.kind === 'store') props.hall({ ...w, yaw, width: p.w, depth: p.d, height: 7, color: [0x8a2e22, 0xb88a3a, 0x6e7a80][Math.floor(r() * 3)], roof: 0xe4e8ea, door: 6, name: 'warehouse' });
      else if (p.kind === 'church') { const c = W(p.x - p.fx * 2.5, p.z - p.fz * 2.5); props.church({ ...c, yaw }); } // (the nave behind, the tower 11.6 m out in front of it)
      else if (p.kind === 'hall') props.hall({ ...w, yaw, width: p.w, depth: p.d, height: p.h!, color: p.color!, roof: 0x3a3a3a, door: 10, name: p.name! });
    }
    const lamp = (x: number, z: number, fx: number, fz: number) => { // a street lamp: a pole, an arm out over the street, the lamp
      const w = W(x, z), g = terrain.heightAt(w.x, w.z), a = W(x + fx * 0.9, z + fz * 0.9), l = W(x + fx * 1.7, z + fz * 1.7), ry = Math.atan2(fx, -fz);
      props.box('metal', w.x, g + 3.5, w.z, 0.14, 7, 0.14, 0, 0x4a4c4e);
      props.box('metal', a.x, g + 6.9, a.z, 0.08, 0.08, 1.9, ry, 0x4a4c4e);
      props.box('plain', l.x, g + 6.75, l.z, 0.35, 0.18, 0.6, ry, 0xfff0c8);
    };
    for (const st of [MAIN, ...STREETS]) for (let i = 1; i < st.length; i++) {
      const [ax, az] = st[i - 1], [bx, bz] = st[i], len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len;
      for (let s = 6, k = 0; s < len - 3; s += 24, k++) {
        const side = k % 2 ? 1 : -1, x = ax + tx * s - side * tz * 4.6, z = az + tz * s + side * tx * 4.6;
        if (!PLOTS.some((p) => inPlot(p, x, z, 1.5)) && z < shoreZ(x) - 8) lamp(x, z, side * tz, -side * tx);
      }
    }
    // the town quay along the east shore below the warehouses: a timber wharf on piles, bollards along its edge
    for (let z = 150; z <= 214; z += 4) {
      let xs = 150; while (xs < 260 && naturalL0(xs, z) > 0.4) xs += 1;
      const a = W(xs - 1, z);
      props.box('plain', a.x, 2.1, a.z, 9, 0.45, 4.1, 0, 0x8a7e70);
      props.box('plain', a.x + 4.2, 0.6, a.z, 0.45, 3.4, 0.45, 0, 0x3a3028);
      if (z % 12 === 2) props.box('metal', a.x + 3.6, 2.65, a.z, 0.45, 0.6, 0.45, 0, 0x2a2a2a);
    }

    // ---- A/S Sydvaranger: the ore quay (bollards and the shiploader on the mole), the pellet plant, the concentrator and
    // the ore store behind it (PLOTS) with the stacks, the silos and the conveyors; the ore railway in from Bjørnevatn with
    // its wagons; the plant fence; the harbour’s fish plant
    const qs = shoreZ(QUAY.x);
    for (let k = 8; k < QUAY.out; k += 12) for (const s of [-1, 1]) { const w = W(QUAY.x + s * (QUAY.w - 1), qs + k); props.box('plain', w.x, QUAY.deck + 0.35, w.z, 0.6, 0.7, 0.6, 0, 0x2a2a2a); }
    const ld = W(QUAY.x, qs + QUAY.out - 14);
    props.box('plain', ld.x, QUAY.deck + 7, ld.z, 3, 14, 3, 0, 0x8a3a24);                  // the shiploader’s tower
    props.box('plain', ld.x, QUAY.deck + 13.5, ld.z - 6, 2, 1.5, 20, 0, 0x8a3a24);         // its boom, out over the berth
    for (const dx of [-14, 12]) props.chimney({ ...W(QUAY.x - 25 + dx, qs - 112), height: 48 });
    props.tanks({ ...W(QUAY.x - 70, qs - 60), yaw: 0, count: 3, radius: 5, height: 16, color: 0x8e8a82 }); // the ore silos
    const conv = (a: number[], b: number[], y0: number, y1: number) => { const c0 = W(a[0], a[1]), c1 = W(b[0], b[1]); props.conveyor({ x0: c0.x, z0: c0.z, y0, x1: c1.x, z1: c1.z, y1 }); };
    conv([QUAY.x, qs - 60], [QUAY.x, qs + 6], 12, 6);  // the pellets down to the loader
    conv([255, -50], [236, 4], 9, 14);                 // the ore store up into the pellet plant
    conv([182, -20], [205, 8], 11, 14);                // the concentrate across from the concentrator
    { const a = W(110, -82), b = W(340, -82); props.rails({ x0: a.x, z0: a.z, x1: b.x, z1: b.z }); }
    for (let k = 0; k < 6; k++) {
      const w = W(150 + k * 12, -82);
      props.wagon({ ...w, yaw: Math.PI / 2, color: 0x5a3426, kind: 'open' });
      props.box('rock', w.x, terrain.heightAt(w.x, w.z) + 2.2, w.z, 10.2, 0.4, 2.55, 0, 0x2e2a28); // (heaped with ore)
    }
    { const a = W(120, -96), b = W(300, -96); props.fence({ x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z: a.z, breaches: [[155, 175]] }); }
    props.hall({ ...W(400, shoreZ(400) - 70), yaw: 0, width: 28, depth: 14, height: 7, color: 0x8a2e22, roof: 0x3a3a3c, door: 8, name: 'fish plant' });
    // Prestøya: the light on the islet
    { const w = W(ISLE.x, ISLE.z), y = terrain.heightAt(w.x, w.z); props.box('stone', w.x, y + 4, w.z, 2.4, 8, 2.4, 0, 0xe8e4dc); props.box('plain', w.x, y + 8.6, w.z, 3, 1.4, 3, 0, 0xa83a2a); }
    // Bjørnevatn: the mine’s headframe and crusher hall beside the spoil
    props.headframe({ ...W(400, -270), yaw: 0, height: 26 });
    props.hall({ ...W(390, -210), yaw: Math.PI / 2, width: 30, depth: 14, height: 11, color: 0x6e6a64, roof: 0x3e4044, door: 8, name: 'crusher' });

    // ---- the rocky shore: boulders scattered over the bare rock (cover for the men coming up it)
    for (let i = 0, n = 0; i < 3000 && n < 160; i++) {
      const x = (r() * 2 - 1) * 470, back = 6 + r() * 34, z = shoreZ(x) - back;
      if (beachK(x) > 0.4 || Math.abs(x - QUAY.x) < 20 || roadDist(x, z) < 5) continue;
      props.boulder({ ...W(x, z), radius: 0.8 + r() * 1.6 });
      n++;
    }

    // ---- Høybuktmoen (beside the runway’s own tower and hangar — systems/Airfields.js lays those): the military
    // hangars, the Garrison’s barracks, a hardened shelter
    for (const x of [-330, -260]) props.hall({ ...W(x, -715), yaw: 0, width: 46, depth: 34, height: 13, color: 0x6a6e6a, roof: 0x4a4e52, door: 30, name: 'hangar' });
    for (let i = 0; i < 4; i++) props.hall({ ...W(-100 + (i % 2) * 40, -520 - Math.floor(i / 2) * 24), yaw: 0, width: 30, depth: 10, height: 6, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'barracks' });
    props.aircraftShelter({ ...W(440, -790), yaw: Math.PI / 2 });
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 45;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadC(x, z) < 4.5 || onRunway(x, F * z) || runK(x, F * z) > 0.2 || !land(x, z) || heapK(x, F * z) > 0 || townK(x, F * z) > 0.5 || streetDist(x, F * z) < 4.5 || PLOTS.some((p) => inPlot(p, x, F * z, 3)) }];
    // birch scrub: thick in the hollows, thin on the bare rock
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1800, broadleaf: 0.4, autumn: 1, size: 0.6, maxY: 30, avoid,
      forest: (x: number, z: number) => smoothstep(0.05, 0.3, fbm(noise, x * 0.008 + 4, z * 0.008, 2)) * 0.8 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => F * z > shoreZ(x) - 30 || roadC(x, z) < 3.5 || streetDist(x, F * z) < 3.5 || PLOTS.some((p) => inPlot(p, x, F * z, 1)) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
