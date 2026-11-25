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
import { buildSite, commandPost } from './common.js';
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

/** Ground height in the local frame (sea toward +z), the smooth part (sampled once). */
function naturalL(x: number, z: number) {
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
    economy: { reserves: 1800, perSector: 500, beachIncome: 0.6, defenceCp: 1400, defenceIncome: 2.8 }, // (AI vs AI 2026-11-25, Kirkenes down by the neck: the landing won at 6:05 on 1000 / 2 CP, at 16:31 and 13:11 on 1400 / 2.6–2.8, at 13:39 and 11:26 on 1500 / 3.2 — the harbour fell in under two minutes every time; Kirkenes moved up onto the point, a battery over the harbour)
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

    // ---- the villages: painted wooden houses (all rebuilt after 1944), Kirkenes the biggest with blocks of flats
    for (let [cx, cz, n, spread] of [[-290, -330, 10, 45], [20, 205, 20, 75], [350, -260, 8, 36]] as [number, number, number, number][]) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 22 + r() * spread;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!dry(x, z)) continue;
        n--;
        if (i % 4 === 0 && cx !== 20) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
        else if (cx === 20 && i % 3 === 0) flats(props, { ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), storeys: 3, width: 22, depth: 10 });
        else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house', damaged: 0 });
      }
    }
    if (dry(70, 120)) props.church({ ...W(70, 120), yaw: 0 }); // Kirkenes kirke

    // ---- A/S Sydvaranger: the ore quay (bollards and the shiploader on the mole), the pellet plant behind it with its
    // stacks, the conveyor down to the loader; the harbour’s fish plant
    const qs = shoreZ(QUAY.x);
    for (let k = 8; k < QUAY.out; k += 12) for (const s of [-1, 1]) { const w = W(QUAY.x + s * (QUAY.w - 1), qs + k); props.box('plain', w.x, QUAY.deck + 0.35, w.z, 0.6, 0.7, 0.6, 0, 0x2a2a2a); }
    const ld = W(QUAY.x, qs + QUAY.out - 14);
    props.box('plain', ld.x, QUAY.deck + 7, ld.z, 3, 14, 3, 0, 0x8a3a24);                  // the shiploader’s tower
    props.box('plain', ld.x, QUAY.deck + 13.5, ld.z - 6, 2, 1.5, 20, 0, 0x8a3a24);         // its boom, out over the berth
    const pp = W(QUAY.x - 25, qs - 85);
    props.hall({ ...pp, yaw: 0, width: 46, depth: 22, height: 16, color: 0x6a5e54, roof: 0x3a3a3a, door: 10, name: 'pellet plant' });
    for (const dx of [-14, 12]) props.chimney({ ...W(QUAY.x - 25 + dx, qs - 112), height: 48 });
    props.tanks({ ...W(QUAY.x - 70, qs - 60), yaw: 0, count: 3, radius: 5, height: 16, color: 0x8e8a82 }); // the ore silos
    const c0 = W(QUAY.x, qs - 60), c1 = W(QUAY.x, qs + 6);
    props.conveyor({ x0: c0.x, z0: c0.z, y0: 12, x1: c1.x, z1: c1.z, y1: 6 });
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
      { test: (x: number, z: number) => roadC(x, z) < 4.5 || onRunway(x, F * z) || runK(x, F * z) > 0.2 || !land(x, z) || heapK(x, F * z) > 0 || townK(x, F * z) > 0.5 }];
    // birch scrub: thick in the hollows, thin on the bare rock
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1800, broadleaf: 0.4, autumn: 1, size: 0.6, maxY: 30, avoid,
      forest: (x: number, z: number) => smoothstep(0.05, 0.3, fbm(noise, x * 0.008 + 4, z * 0.008, 2)) * 0.8 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => F * z > shoreZ(x) - 30 || roadC(x, z) < 3.5 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
