// Liinakhamari, winter 1985 (coastal: the US Marines and the Norwegians land, the Soviet Army holds; 1.0 × 1.8 km).
// The war of 1985 on the Northern Flank, turned round: with the Soviet divisions committed in Finnmark, NATO comes in
// from the Barents Sea behind their border positions at Pechenga — as the Northern Fleet's own torpedo boats and naval
// infantry did on the night of 12–13 October 1944, when they ran in past the German batteries on the headlands and
// landed on the quay at Liinakhamari. Out at sea the transport area and the Northern Fleet's mine barrier; then the
// high rocky Murman coast: the mouth of Pechenga Bay between two headlands, each with a coastal battery dug into its
// top (Cape Devkin in the west, Cape Numeroniemi in the east); inside the mouth Liinakhamari's little port — a shingle
// foreshore under the quay wall, its cranes, sheds and the naval base, one slipway the only way up for vehicles; the
// bay runs on inland from it, long and narrow between steep rock, up to Pechenga town at its head. Either side of the
// mouth a cove of grey shingle in the cliffs: Devkin cove in the west, Numeroniemi cove in the east, a fishing
// hamlet over each. Behind them tundra and birch scrub under the snow, bogs in the hollows, bare rocky knolls, the
// Liinakhamari road up the west shore of the bay to Pechenga, and the Rubezh coastal missile batteries inland.
// (Compressed: the real bay runs north–south into the Barents Sea; here the sea is +z, Pechenga at the -z end.)
// Not point-mirrored: one side lands, the other holds (modes/landing). NATO lands from its base out at sea (+z).
// The bay cuts the east cove off from the rest: its men reach Pechenga only round the head of the bay, as in 1944.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache } from './gridCache.js';
import { segDist, arcticTheme, snowSurface, snowSoft, woodenVillage, taiga } from './arctic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_44);
const sea = createSea({ level: 0, size: SIZE, color: 0x1e3640 }); // (the Barents Sea: cold, dark grey-green)

/** The two headlands either side of the bay mouth, a gun battery on each: x, how far out to sea, half-width, height. */
const HEADS = [{ x: -150, reach: 80, w: 40, top: 26, name: 'Cape Devkin battery' }, { x: 190, reach: 85, w: 42, top: 28, name: 'Cape Numeroniemi battery' }];
const headK = (x: number) => Math.max(Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)), Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2)));
/** The bay mouth: the shore pulled in 160 m between the headlands, to Liinakhamari's quay (0..1 across x). */
const notchK = (x: number) => smoothstep(130, 85, Math.abs(x - 20));
/** The mouth's rocky sides (0..1). */
const sideK = (x: number) => { const k = notchK(x); return smoothstep(0.03, 0.25, k) * smoothstep(0.97, 0.75, k); };
/** The waterline (z): the coves a little over a hundred metres from the middle, the headlands out past them, the mouth in. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 12 - notchK(x) * 160
  + HEADS[0].reach * Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)) + HEADS[1].reach * Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2));
/** Liinakhamari's quay (0..1 across x), along the back of the mouth. */
const portK = (x: number) => smoothstep(-70, -50, x) * smoothstep(75, 58, x);
const RAMP = 0; // x of the slipway up the quay wall (the harbour's beach sector)

/** Pechenga Bay inland of the port: long and narrow between steep rock, up to the town at its head. */
const CH: [number, number][] = [[85, -15], [110, -120], [150, -230], [170, -350], [165, -480]];
function chanD(x: number, z: number) { // metres from the bay's water (negative: on it)
  if (x < 40 || x > 230 || z > 30 || z < -540) return 99;
  let d = Infinity;
  for (let i = 0; i < CH.length - 1; i++) d = Math.min(d, segDist(x, z, CH[i], CH[i + 1]));
  return d - 27;
}

/** The bare rocky knolls of the tundra: [x, z, radius, height]. */
const HILLS = [[-80, -110, 70, 9], [-200, -300, 90, 14], [290, -250, 80, 13], [-390, -450, 100, 18], [-110, -470, 80, 12], [420, -420, 90, 16], [-260, -700, 90, 12], [320, -720, 80, 12]];
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) { const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (d2 < 9) h += a * Math.exp(-d2); }
  return h;
}

/** The roads: up from each cove and the slipway, the Liinakhamari road along the bay, across behind Pechenga. */
const ROADS: number[][][] = [
  [[-320, 112], [-322, -40], [-325, -140], [-300, -350], [-330, -600], [-320, -900]],             // up from Devkin cove through Devkin
  [[RAMP, -16], [RAMP, -70], [-10, -200], [20, -280], [55, -380], [75, -500], [100, -620]],         // up the slipway, the Liinakhamari road to Pechenga
  [[340, 92], [355, -130], [330, -300], [320, -500], [330, -600], [340, -900]],                     // up from Numeroniemi cove, round the head of the bay
  [[-470, -45], [-322, -40], [-150, -55], [-60, -70], [RAMP, -70]],                                  // the coast road behind Cape Devkin
  [[-330, -600], [-100, -620], [100, -620], [330, -600]],                                            // across, by Pechenga
  [[100, -620], [20, -720], [20, -900]],                                                             // to the garrison
];
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
const roadC = gridCache(roadDist, BOUNDS, 2);

/** The beach sectors and the places up behind them. */
export const SECTORS = [
  { x: -320, name: 'Devkin cove', inland: { name: 'Devkin', x: -320, z: -140 } },
  { x: RAMP, name: 'Liinakhamari harbour', inland: { name: 'Liinakhamari', x: -10, z: -200 } },
  { x: 340, name: 'Numeroniemi cove', inland: { name: 'Numeroniemi', x: 355, z: -130 } },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Devkin cove', x: -320, z: shoreZ(-320) - 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Liinakhamari harbour', x: RAMP, z: shoreZ(RAMP) - 46, owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Numeroniemi cove', x: 340, z: shoreZ(340) - 48, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Devkin', x: -320, z: -140, owner: null, sector: 'west' },
  { id: 'F', name: 'Liinakhamari', x: -10, z: -200, owner: null, sector: 'centre' },
  { id: 'G', name: 'Numeroniemi', x: 355, z: -130, owner: null, sector: 'east' },
  { id: 'K', name: 'Pechenga', x: 100, z: -620, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** Bogs in the tundra's hollows, under the snow: off the roads, the points, the shore and the bay. */
const bogC = gridCache((x: number, z: number) => {
  const back = shoreZ(x) - z;
  if (back < 80 || chanD(x, z) < 12 || nearPoint(x, z, 60) || Math.hypot(x, z + 830) < 70) return 0;
  return smoothstep(0.1, 0.22, fbm(noise, x * 0.006 + 423.3, z * 0.006 - 261.1, 3)) * smoothstep(10, 26, roadDist(x, z)) * smoothstep(80, 120, back);
}, BOUNDS);

function height(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, hk = headK(x);
  if (d > 0) { // the bottom: shelving off fast under the rocky coast, rocks off the headlands
    const h = 0.4 - d * 0.022 - Math.max(0, d - 110) * 0.05 + hk * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    return Math.max(h, -20);
  }
  const back = -d;
  // the cove (30–35 m of shingle), then the tundra: 6–10 m, rising inland
  const beach = 0.5 + Math.min(back, 40) * 0.04;
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  const land = 4 + smoothstep(30, 110, back) * 4 + Math.max(0, back - 220) * 0.012 + n * 3 + hillH(x, z);
  let h = Math.max(beach, Math.min(land, beach + back * 0.2));
  h -= bogC(x, z) * 1.0;
  // the port: a shingle foreshore under a 3 m quay wall, one slipway up it
  const pt = portK(x);
  if (pt > 0) {
    let q = back < 30 ? 0.4 + back * 0.025 : back < 32 ? 1.15 + (back - 30) * 1.6 : 4.4 + Math.max(0, back - 150) * 0.02;
    q += (Math.min(q, 0.4 + back * 0.09) - q) * smoothstep(22, 14, Math.abs(x - RAMP)); // (the slipway: 1 in 11)
    h += (q - h) * pt * smoothstep(240, 170, back);
  }
  // the headlands and the mouth's sides: rock, a cliff to the sea, falling back to the tundra inland
  const sk = sideK(x);
  if (hk > 0.05 || sk > 0) {
    const hd = x < 20 ? HEADS[0] : HEADS[1];
    const top = hd.top * Math.max(smoothstep(0.25, 0.7, hk), sk * 0.5) + fbm(noise, x * 0.03, z * 0.03, 2) * 4;
    const k = Math.max(smoothstep(0.25, 0.7, hk), sk);
    h = h + (Math.max(h, 0.5 + top * smoothstep(3, 22, back) * smoothstep(200, 110, back)) - h) * k;
  }
  // the bay inland: steep rock down to deep water
  const cd = chanD(x, z);
  if (cd < 0) return Math.max(-8, -0.8 + cd * 0.45);
  if (cd < 20) h = Math.min(h, 0.6 + cd * 1.1);
  // the garrison: flat
  h += (7 + Math.max(0, shoreZ(0) + 830 - 220) * 0.012 - h) * smoothstep(60, 25, Math.hypot(x, z + 830));
  return h;
}

const softV = gridCache((x: number, z: number) => snowSoft(roadC, bogC)(x, z, false), BOUNDS);
const softF = gridCache((x: number, z: number) => snowSoft(roadC, bogC)(x, z, true), BOUNDS);
/** Birch scrub in the hollows and the lee of the knolls; bare on the tops, the shore and the rock. */
const woodsK = (x: number, z: number) => {
  const back = shoreZ(x) - z;
  if (back < 50 || chanD(x, z) < 6 || (headK(x) > 0.3 && back < 200) || nearPoint(x, z, 30) || Math.hypot(x, z + 830) < 50) return 0;
  return (fbm(noise, x * 0.008 + 908.2, z * 0.008 - 561.4, 3) > 0.02 ? 0.75 : 0.03) * smoothstep(6, 16, roadDist(x, z)) * (1 - 0.7 * bogC(x, z)) * smoothstep(50, 90, back);
};
const woodsC = gridCache(woodsK, BOUNDS);

export default {
  id: 'liinakhamari',
  name: 'Liinakhamari Landing',
  description: 'The mouth of Pechenga Bay, winter 1985: Liinakhamari’s little port inside the mouth, coastal guns on the headlands either side, shingle coves in the cliffs, the long narrow bay up to Pechenga, tundra and birch scrub under the snow. NATO lands from the Barents Sea, as the Soviets did here in October 1944; the Soviet Army holds.',
  epochs: ['1985'],
  region: 'north',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  armies: { nato: ['usmc', 'no'], pact: ['sov'] }, // (the US Marines’ 4th MAB and Brigade Nord land; the Soviet Army holds the coast)
  conditions: { time: 'dawn', weather: 'overcast' },
  climate: 'winter',
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  airfields: [], // (no runway fits: the rock, the bogs and the bay)
  steep: 0.5, // (vehicles: the quay wall, the headlands and the bay’s sides are no way up — the slipway and the coves are)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft: (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z),
  river: sea,
  woods: (x: number, z: number) => woodsC(x, z) * 0.6, // (scrub: you see a little further through it)

  theme: arcticTheme({
    fogColor: 0xa8b4bc, fogDensity: 0.0006, skyTop: 0x5c6e84, skyHorizon: 0xc4c8cc, skyBottom: 0x7a848c,
    sunIntensity: 1.4, sunDisk: 0.15, clouds: 0.75, sunDir: [0.4, 0.25, -0.85],
    terrain: {
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x), back = sz - z;
        if (back < -3 || chanD(x, z) < 1) return [y > -2 ? 0x6e6c64 : 0x4e5050, 1];           // the stony bottom
        const pt = portK(x);
        if (pt > 0.5 && back < 31) return [0x6a6862, 1];                                       // the foreshore: wet shingle
        if (pt > 0.5 && back < 160 && Math.abs(x - RAMP) > 6) return [0x8a8a86, 0.9];          // the quay’s concrete, swept
        if ((headK(x) > 0.3 || sideK(x) > 0.3) && y > 3 && back < 200) return [0x4e5054, 0.85]; // the bare black rock
        if (chanD(x, z) < 10) return [0x5a5c5e, 0.85];                                         // the bay’s rocky sides
        if (back < 34) return [noise(x * 0.06, z * 0.06) > 0.2 ? 0x8a8880 : 0x6e6c66, 1];      // the coves: grey shingle, snow above the tideline
        return snowSurface(x, z, { road: roadC(x, z), main: false, ice: () => 0, bog: bogC, noise });
      },
    },
  }),

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -830, entries: [-320, 20, 340] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what NATO's land troops come in (systems/Landing.js): squads by LCVP or Type 520, vehicles by Type 520
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: a Perry frigate or a Spruance inshore, a sweeper, the battleship Iowa offshore
    navy: ['frigate', 'destroyer', 'natya', 'battleship'],
    // the Northern Fleet's mine barrier off the bay, a lane left off each beach for the sweepers
    seaMines: { z: [500, 560], count: 60, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_44 },
    // the coastal artillery: a gun battery dug into each headland, laid on the mouth; the Rubezh batteries inland fire on the ships
    forts: [
      { unit: 'artillery', x: HEADS[0].x, z: shoreZ(HEADS[0].x) - 70, facing: 0, name: HEADS[0].name },
      { unit: 'artillery', x: HEADS[1].x, z: shoreZ(HEADS[1].x) - 75, facing: 0, name: HEADS[1].name },
      { unit: 'coastMissile', x: -170, z: -400, facing: 0, name: 'Rubezh battery' }, { unit: 'coastMissile', x: 260, z: -400, facing: 0, name: 'Rubezh battery' },
    ],
    // prepared positions: wire along the back of each cove and the foreshore, minefields, trenches and MG nests over it; tank traps on the slipway
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -480 + i * 11; const z = shoreZ(x) - (portK(x) > 0.5 ? 26 : 30);
        return headK(x) > 0.3 || sideK(x) > 0.2 || Math.abs(x - RAMP) < 18 || chanD(x, z) < 10 ? null : { kind: 'wire', x, z, yaw: 0 }; }).filter(Boolean),
      ...[-12, -4, 4, 12].map((dx) => ({ kind: 'tankTraps', x: RAMP + dx, z: shoreZ(RAMP + dx) - 24, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 64 }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - 54, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - 48, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 38 }))),
    ],
    // the defence at dawn: a motor rifle battalion over the coves and the port, the coast troops’ anti-tank guns and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Motor rifle squad' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56) }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    // the counter-attack: the motor rifle division’s armour from Pechenga down the Liinakhamari road
    counter: { t: 270, units: ['heavyTank', 'ifv', 'tank', 'ifv', 'heavyTank'], say: 'The division’s armour is coming down from Pechenga: T-80s and BMPs, straight for the beachhead', sayOther: 'Enemy armour coming down the road from Pechenga: T-80s and BMPs' },
    // the landing's AI (ai/LandingDirector.js): its buying order, a frigate inshore off the focus beach, a sweeper for the lane
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'tank', 'rifles', 'mgTeam', 'ifv', 'rifles', 'tank', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.8, defenceCp: 1000, defenceIncome: 1.9 },
    // the Marines’ amtracs and LAVs swim in on their own, put in off the beach
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon' },
    // the first wave at dawn, in to all three beaches at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_44);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const skip = (x: number, z: number, rr: number) => roadC(x, z) < 8 + rr || nearPoint(x, z, 16 + rr) || ((headK(x) > 0.3 || sideK(x) > 0.1) && z > shoreZ(x) - 200 - rr)
      || z > shoreZ(x) - 40 - rr || chanD(x, z) < 10 + rr || bogC(x, z) > 0.3 || Math.hypot(x, z + 830) < 45;

    // ---- Liinakhamari port: two cranes on the quay (jibs out over the foreshore), the sheds, the fuel tanks, the naval base's blocks
    const crane = (x: number, z: number) => {
      const y = g(x, z), c = 0x6a6e70;
      for (const [lx, lz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) props.box('metal', x + lx, y + 3.5, z + lz, 0.5, 7, 0.5, 0, c);
      props.box('metal', x, y + 7.3, z, 6, 0.7, 6, 0, c);
      props.box('metal', x, y + 10.8, z, 1.8, 6.5, 1.8, 0, c);
      props.box('metal', x, y + 14.8, z - 0.5, 3.4, 2.6, 4.6, 0, 0xc8a040);
      props.box('metal', x, y + 16 + 7 * Math.sin(0.35), z + 8, 0.8, 0.8, 16, 0, c, -0.35);
      cover.addCylinder({ x, z, radius: 1.2, height: 10 });
    };
    for (const x of [-40, 40]) crane(x, shoreZ(x) - 37);
    for (const [x, w] of [[-45, 30], [42, 26]] as [number, number][]) props.hall({ x, z: shoreZ(x) - 80, yaw: 0, width: w, depth: 14, height: 7, color: 0x7a7468, roof: 0x3e4044, door: 8, name: 'port shed' });
    props.tanks({ x: -55, z: shoreZ(-55) - 125, yaw: 0, count: 3, radius: 5, height: 8, color: 0x8e8e88 });
    for (let i = 0; i < 4; i++) props.crates({ x: 15 + i * 7, z: shoreZ(15) - 55, yaw: 0 });
    for (const [x, zz] of [[45, -125], [-35, -165], [25, -225], [-45, -230]] as [number, number][]) if (!skip(x, zz, 10)) flats(props, { x, z: zz, yaw: 0, storeys: 3, width: 24, depth: 11, name: 'naval base block' });

    // ---- the coastal batteries on the headlands: sandbags and concrete round the guns, a lighthouse on Numeroniemi
    for (const h of HEADS) {
      const z0 = shoreZ(h.x) - 70;
      for (const s of [-1, 1]) props.sandbagRing({ x: h.x + s * 18, z: z0 + 8, radius: 4.5, toward: 1 });
      props.box('stone', h.x, g(h.x, z0 - 16) + 1.2, z0 - 16, 10, 2.4, 6, 0, 0x8a8a84); // (the magazine)
    }
    { const x = HEADS[1].x + 22, z = shoreZ(HEADS[1].x) - 30, y = g(x, z); props.box('stone', x, y + 6, z, 2.6, 12, 2.6, 0, 0xe8e4dc); props.box('plain', x, y + 13, z, 3.2, 2, 3.2, 0, 0xb02a22); }

    // ---- the fishing hamlets over the coves, Liinakhamari's wooden houses
    for (const [id, n] of [['E', 6], ['G', 5], ['F', 4]] as [string, number][]) {
      const p = points.find((q) => q.id === id)!;
      props.rand = mulberry32(4400 + Math.round(p.x * 3 + p.z));
      woodenVillage(props, p, { n, street: 0, skip });
    }
    // ---- Pechenga at the head of the bay: blocks of flats, wooden houses, the Trifonov monastery church; the garrison's barracks
    const k = points.find((q) => q.id === 'K')!;
    props.rand = mulberry32(1985_45);
    for (const [dx, dz] of [[-60, 25], [-60, -30], [60, -40], [70, 30]]) if (!skip(k.x + dx, k.z + dz, 12)) flats(props, { x: k.x + dx, z: k.z + dz, yaw: 0, storeys: 4, width: 26, depth: 11 });
    woodenVillage(props, { x: k.x - 130, z: k.z + 10 }, { n: 6, street: Math.PI / 2, skip });
    if (!skip(k.x + 10, k.z + 60, 10)) props.church({ x: k.x + 10, z: k.z + 60, yaw: 0 });
    for (const [dx, dz] of [[-70, 20], [70, 30], [-75, -30]]) props.hall({ x: dx, z: -830 + dz, yaw: 0, width: 30, depth: 10, height: 6, color: 0x7a7a6a, roof: 0x3a3a3a, door: 4, name: 'barracks' });
    // ---- erratic boulders out on the tundra
    props.rand = r;
    for (let i = 0; i < 80; i++) { const x = (r() * 2 - 1) * 480, z = 100 - r() * 960; if (!skip(x, z, 3)) props.boulder({ x, z, radius: 1.3 + r() * 2 }); }
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: 0, z: -830, r: 34 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadC(x, z) < 5 || z > shoreZ(x) - 40 || chanD(x, z) < 4 || (portK(x) > 0.3 && z > shoreZ(x) - 170) }];
    const update = taiga({ scene, terrain, cover, rand, bounds, palette: this.theme.terrain, avoid, forest: woodsC, maxY: 30, trees: 6000, size: 0.6, birch: 1 });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
