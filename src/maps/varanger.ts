// Varangerfjord, winter 1985 (coastal: the Soviet naval infantry lands, Norway holds; 1.0 × 1.8 km). The Sør-Varanger
// coast of Finnmark, a few kilometres from the Soviet border: the Northern Fleet’s naval infantry (the 63rd Kirkenes
// Brigade, named for the town it took in 1944) comes in from the Varangerfjord to land behind the Norwegian border
// defence on the Pasvik and the E6 and turn it. Out at sea the Pact’s landing ships and the Royal Norwegian Navy’s
// controlled minefield; then the shore — mostly bare grey rock, low and smooth-scoured, with three small beaches in
// it: Bøkfjord beach on the east shore of the Bøkfjord’s mouth in the west, the harbour under Kirkenes in the middle
// beside A/S Sydvaranger’s iron-ore quay (the long mole the ore carriers berth at, the pellet plant and its stacks
// behind), and Langfjord cove in the east. Rocky points between them. Behind the shore: snow over rolling rock and
// bog, birch scrub in the hollows, Kirkenes (wooden houses and blocks of flats), Hesseng in the west, Bjørnevatn and
// the mine’s black spoil tips in the east, and inland the edge of Høybuktmoen, Kirkenes airport, with its runway.
// The Garrison in Sør-Varanger and the Home Guard hold the shore; Brigade Nord’s armour counter-attacks from the airfield.
// (Compressed: Høybuktmoen is 10 km west of Kirkenes and Bjørnevatn 10 km south; here all lie within a kilometre.)
// Laid out like Andøya (maps/andoya.ts) in a frame with the sea toward +z (`L`), then turned round: the Pact’s side is
// -z, so the sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_19);
const sea = createSea({ level: 0, size: SIZE, color: 0x1d3640 }); // (the Varangerfjord in winter: dark, ice-cold, never frozen)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -320, name: 'Bøkfjord beach', inland: { name: 'Hesseng', x: -300, z: -110 } },
  { x: 10, name: 'Ore quay', inland: { name: 'Kirkenes', x: 50, z: -215 } },
  { x: 340, name: 'Langfjord cove', inland: { name: 'Bjørnevatn', x: 350, z: -130 } },
];
/** The rocky points between the beaches (x), how far they reach out to sea. */
const HEADS = [{ x: -165, reach: 70, w: 46 }, { x: 180, reach: 80, w: 44 }];
const headK = (x: number) => Math.max(...HEADS.map((h) => Math.exp(-(((x - h.x) / h.w) ** 2))));
/** 1 on a beach, 0 on the bare rock of the shore between them (the beaches are small). */
const beachK = (x: number) => Math.max(...SECTORS.map((s) => Math.exp(-(((x - s.x) / 85) ** 2))));
/** The Bøkfjord’s mouth on the west edge: 0 east of it, 1 over the fjord. */
const fjordK = (x: number) => smoothstep(-410, -495, x);
/** The waterline (local z): the beaches a little over a hundred metres from the middle, the points out past them,
 * the bare rock between ragged, the Bøkfjord cutting in at the west edge. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 14 + (1 - beachK(x)) * fbm(noise, x * 0.03, 7.7, 2) * 9
  + Math.max(...HEADS.map((h) => h.reach * Math.exp(-(((x - h.x) / h.w) ** 2)))) - fjordK(x) * 150;
/** The ore quay (local x): Sydvaranger’s mole, 70 m out into the harbour beside the middle beach. */
const QUAY = { x: 112, w: 8, out: 72, deck: 2.6 };
/** The bog inland (0..1): between the villages and the roads. */
const moorK = (x: number, z: number) => smoothstep(0.05, 0.22, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * smoothstep(-130, -210, z - shoreZ(x));
/** Bjørnevatn’s spoil tips (the open-pit mine’s waste rock), east, beside the village. */
const HEAPS: [number, number, number, number][] = [[445, -235, 32, 9], [400, -290, 24, 6]];
const heapK = (x: number, z: number) => HEAPS.reduce((k, [cx, cz, r]) => Math.max(k, smoothstep(r, r * 0.4, Math.hypot(x - cx, z - cz))), 0);
/** Høybuktmoen: the runway (local), east–west, inland; the ground round it graded. */
const onRunway = (x: number, z: number) => Math.abs(z + 720) < 22 && x > -90 && x < 400;
const runK = (x: number, z: number) => smoothstep(95, 55, Math.abs(z + 715)) * smoothstep(330, 280, Math.abs(x - 155));

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  const hk = headK(x);
  const qk = smoothstep(QUAY.w + 3, QUAY.w, Math.abs(x - QUAY.x)) * smoothstep(QUAY.out + 6, QUAY.out, d);
  if (d > 0) { // the bottom: shelving off, skerries off the points and the bare rock
    let h = 0.4 - d * 0.02 - Math.max(0, d - 120) * 0.05 + (hk + (1 - beachK(x)) * 0.4) * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    h = Math.max(h, -20);
    return qk > 0 ? h + (QUAY.deck - h) * qk : h;
  }
  const back = -d;
  const bk = beachK(x);
  // the beach (35 m of grey sand and shingle), or bare smooth rock rising straight from the water between the beaches
  const sand = 0.5 + Math.min(back, 40) * 0.04;
  const rock = 0.5 + (3.5 + fbm(noise, x * 0.04, z * 0.04, 2) * 2.5) * smoothstep(1, 14, back);
  const shore = sand * bk + Math.max(sand, rock) * (1 - bk);
  // the land: 6–11 m of rolling rock and snow, rising slowly inland
  const land = 5 + smoothstep(30, 110, back) * 4 + Math.min(Math.max(0, back - 200) * 0.012, 8) + fbm(noise, x * 0.005, z * 0.005, 3) * 5;
  let h = Math.max(shore, Math.min(land, shore + back * 0.2));
  // the points: bare rock 12–18 m high, a cliff to the sea
  if (hk > 0.05) {
    const top = 13 + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
    h = h + (Math.max(h, 0.5 + top * smoothstep(4, 22, back)) - h) * smoothstep(0.25, 0.7, hk);
  }
  h -= moorK(x, z) * 0.9; // (the bog hollows)
  if (back < 300 && x > 330) for (const [cx, cz, r, a] of HEAPS) h += a * smoothstep(r, r * 0.3, Math.hypot(x - cx, z - cz));
  const rk = back > 600 ? runK(x, z) : 0;
  if (rk > 0) h += (14 - h) * rk; // Høybuktmoen graded
  if (qk > 0) h = Math.max(h, QUAY.deck * qk); // the quay’s root
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The roads (local frame): the coast road behind the beaches, a road up from each, the E6 across by the airfield. */
function onRoadL(x: number, z: number) {
  const sz = shoreZ(x) - headK(x) * 60;
  if (Math.abs(z - (sz - 105 + Math.sin(x * 0.01) * 6)) < 3.5 && x > -400) return true;                        // the coast road
  if (Math.abs(x - (-300 + Math.sin(z * 0.012) * 14)) < 3.5 && z < sz - 40 && z > -720) return true;           // up through Hesseng
  if (Math.abs(x - (40 + Math.sin(z * 0.009) * 20)) < 3.5 && z < sz - 40 && z > -720) return true;             // up from the quay through Kirkenes
  if (Math.abs(x - (330 + Math.sin(z * 0.01) * 12)) < 3.5 && z < sz - 30 && z > -720) return true;             // up from the cove to Bjørnevatn
  if (Math.abs(z - (-600 + Math.sin(x * 0.006) * 20)) < 3.5 && x > -340) return true;                          // the E6, past the airfield
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);

/** The bogs (and the snow over the rock): vehicles all but stuck off the roads. */
const moorC = gridCache((x: number, z: number) => moorK(x, F * z), BOUNDS);
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = moorC(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.45 : 0.85);
}

const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
const beachLine = (x: number) => shoreZ(x) - 40;

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Bøkfjord beach', ...W(-320, beachLine(-320)), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Ore quay', ...W(10, beachLine(10)), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Langfjord cove', ...W(340, beachLine(340)), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Hesseng', ...W(-300, -110), owner: null, sector: 'west' },
  { id: 'F', name: 'Kirkenes', ...W(50, -215), owner: null, sector: 'centre' },
  { id: 'G', name: 'Bjørnevatn', ...W(350, -130), owner: null, sector: 'east' },
  { id: 'K', name: 'Høybuktmoen', ...W(-200, -640), owner: 'nato', sector: 'centre' },
];
/** Høybuktmoen’s airfield (world): the tower 55 m in front of the runway’s middle (systems/Airfields.js strip). */
const AIRFIELD = { faction: 'nato', ...W(150, -665), yaw: Math.PI / 2, large: false, name: 'Høybuktmoen' };

export default {
  id: 'varanger',
  name: 'Varangerfjord Landing',
  description: 'Sør-Varanger, Finnmark, winter 1985: bare rock shores and small beaches on the Varangerfjord, Kirkenes with its iron-ore quay, birch scrub and bog under the snow, Høybuktmoen airfield inland. The Soviet naval infantry lands to turn the border defence; Norway holds.',
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
  steep: 0.5, // (vehicles: the rocky points are no way up)
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
        if (onRoadL(x, lz)) return [0x9a968e, 0.9];                                       // the ploughed road
        if (onRunway(x, lz)) return [0x6a6a6a, 0.95];                                      // the runway, swept
        if (Math.abs(x - QUAY.x) < QUAY.w + 1 && lz > sz - 10 && lz < sz + QUAY.out) return [0x7a7874, 0.95]; // the quay’s concrete
        if (lz > sz + 3) return [y > -2 ? 0x8a8a84 : 0x5a5a56, 1];                          // grey stones under the water
        if (lz > sz - 30 && (headK(x) > 0.3 || beachK(x) < 0.5) && y > 1.2) return [0x55575a, 0.9]; // the bare rock of the shore, washed clear of snow
        if (lz > sz - 36) return [0xb4b0a6, 1];                                             // the beach: grey sand and shingle
        if (x > 330 && heapK(x, lz) > 0.05) return [0x3e3c3a, Math.min(1, heapK(x, lz) * 1.5)]; // the spoil, black
        const m = moorK(x, lz);
        if (m > 0.1) return [noise(x * 0.04, z * 0.04) > 0.1 ? 0x9a9884 : 0xcdd0c8, m * 0.7]; // sedge and dwarf birch through the snow
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 40, 330] }, pact: { x: 0, z: -830, entries: [-320, 10, 340] } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Soviet landing comes in: the naval infantry by Aist hovercraft or Polnocny, vehicles by Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    // what the landing may call in at sea: the Northern Fleet’s escorts (the corvette slot, the Osas, the Natya sweepers, the Tarantul)
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Royal Norwegian Navy’s controlled minefield across the fjord, a lane left off each beach for the sweepers
    seaMines: { z: [500, 560], count: 60, lanes: [-320, 10, 340], lane: 80, seed: 1985_19 },
    // the coastal artillery: a gun dug into each rocky point, laid on the beaches and the water before them
    forts: [{ unit: 'artillery', ...W(-165, shoreZ(-165) - 55), facing: Math.PI }, { unit: 'artillery', ...W(180, shoreZ(180) - 62), facing: Math.PI }],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests in the rock over it
    works: [
      ...Array.from({ length: 82 }, (_, i) => { const x = -400 + i * 11; return headK(x) > 0.3 || Math.abs(x - QUAY.x) < 14 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 54), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 48), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    // the defence at dawn: the Garrison in Sør-Varanger and the Home Guard over each beach and in the villages
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'GSV section' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the counter-attack: Brigade Nord’s armour along the E6 from Høybuktmoen
    counter: { t: 270, units: ['tank', 'ifv', 'tank', 'ifv', 'reconVehicle'], say: 'Brigade Nord is coming along the E6 from Høybuktmoen: Leopards and M113s, straight for the beachhead', sayOther: 'Enemy armour coming down the road from the airfield' },
    // the landing’s AI (ai/LandingDirector.js): the naval infantry’s buying order, a corvette inshore off the focus beach
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 360 },
    economy: { reserves: 1800, perSector: 500, beachIncome: 0.6, defenceCp: 1000, defenceIncome: 2 },
    // the amphibious vehicles swim in on their own: BTRs, BRDMs and the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'pt76', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_19);
    sea.build(scene, terrain);
    const dry = (x: number, z: number) => z < shoreZ(x) - 70 && headK(x) < 0.4 && !onRoadL(x, z) && moorK(x, z) < 0.3 && heapK(x, z) === 0 && fjordK(x) < 0.3;

    // ---- the villages: painted wooden houses (all rebuilt after 1944), Kirkenes the biggest with blocks of flats
    for (let [cx, cz, n, spread] of [[-300, -110, 9, 40], [50, -215, 18, 75], [350, -130, 8, 36]] as [number, number, number, number][]) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 22 + r() * spread;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!dry(x, z)) continue;
        n--;
        if (i % 4 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
        else if (cx === 50 && i % 3 === 0) flats(props, { ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), storeys: 3, width: 22, depth: 10 });
        else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house', damaged: 0 });
      }
    }
    props.church({ ...W(20, -275), yaw: 0 }); // Kirkenes kirke

    // ---- A/S Sydvaranger: the ore quay (bollards and the shiploader on the mole), the pellet plant behind it with its
    // stacks, the conveyor down to the loader; the harbour’s fish plant
    const qs = shoreZ(QUAY.x);
    for (let k = 8; k < QUAY.out; k += 12) for (const s of [-1, 1]) { const w = W(QUAY.x + s * (QUAY.w - 1), qs + k); props.box('plain', w.x, QUAY.deck + 0.35, w.z, 0.6, 0.7, 0.6, 0, 0x2a2a2a); }
    const ld = W(QUAY.x, qs + QUAY.out - 14);
    props.box('plain', ld.x, QUAY.deck + 7, ld.z, 3, 14, 3, 0, 0x8a3a24);                  // the shiploader’s tower
    props.box('plain', ld.x, QUAY.deck + 13.5, ld.z + 6, 2, 1.5, 20, 0, 0x8a3a24);         // its boom, out over the berth
    const pp = W(QUAY.x + 30, qs - 85);
    props.hall({ ...pp, yaw: 0, width: 46, depth: 22, height: 16, color: 0x6a5e54, roof: 0x3a3a3a, door: 10, name: 'pellet plant' });
    for (const dx of [-14, 12]) props.chimney({ ...W(QUAY.x + 30 + dx, qs - 112), height: 48 });
    props.tanks({ ...W(QUAY.x + 75, qs - 80), yaw: 0, count: 3, radius: 5, height: 16, color: 0x8e8a82 }); // the ore silos
    const c0 = W(QUAY.x, qs - 60), c1 = W(QUAY.x, qs + 6);
    props.conveyor({ x0: c0.x, z0: c0.z, y0: 12, x1: c1.x, z1: c1.z, y1: 6 });
    props.hall({ ...W(-30, shoreZ(-30) - 78), yaw: 0, width: 28, depth: 14, height: 7, color: 0x8a2e22, roof: 0x3a3a3c, door: 8, name: 'fish plant' });
    // Bjørnevatn: the mine’s headframe and crusher hall beside the spoil
    props.headframe({ ...W(410, -180), yaw: 0, height: 26 });
    props.hall({ ...W(395, -205), yaw: Math.PI / 2, width: 30, depth: 14, height: 11, color: 0x6e6a64, roof: 0x3e4044, door: 8, name: 'crusher' });

    // ---- the rocky shore: boulders scattered over the bare rock between the beaches (cover for the men coming up it)
    for (let i = 0, n = 0; i < 3000 && n < 160; i++) {
      const x = (r() * 2 - 1) * 470, back = 6 + r() * 34, z = shoreZ(x) - back;
      if (beachK(x) > 0.4 || headK(x) > 0.5 || Math.abs(x - QUAY.x) < 20 || onRoadL(x, z) || fjordK(x) > 0.2) continue;
      props.boulder({ ...W(x, z), radius: 0.8 + r() * 1.6 });
      n++;
    }

    // ---- Høybuktmoen (beside the runway’s own tower and hangar — systems/Airfields.js lays those): the military
    // hangars, the Garrison’s barracks, a hardened shelter
    for (const x of [-330, -260]) props.hall({ ...W(x, -715), yaw: 0, width: 46, depth: 34, height: 13, color: 0x6a6e6a, roof: 0x4a4e52, door: 30, name: 'hangar' });
    for (let i = 0; i < 4; i++) props.hall({ ...W(-150 + (i % 2) * 40, -540 - Math.floor(i / 2) * 24), yaw: 0, width: 30, depth: 10, height: 6, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'barracks' });
    props.aircraftShelter({ ...W(440, -790), yaw: Math.PI / 2 });
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 45 && headK(x) < 0.35 && fjordK(x) < 0.5;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => onRoad(x, z) || onRunway(x, F * z) || runK(x, F * z) > 0.2 || !land(x, z) || heapK(x, F * z) > 0 }];
    // birch scrub: thick in the hollows and round the villages, thin on the bare rock
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1800, broadleaf: 0.4, autumn: 1, size: 0.6, maxY: 30, avoid,
      forest: (x: number, z: number) => smoothstep(0.05, 0.3, fbm(noise, x * 0.008 + 4, z * 0.008, 2)) * 0.8 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => F * z > shoreZ(x) - 30 || onRoad(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
