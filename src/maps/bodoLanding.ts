// Bodø, winter 1985 (coastal: the Soviet naval infantry lands, Norway and the US Marines hold; 1.0 × 1.8 km). The
// Bodø peninsula on the open sea, and on it Bodø Main Air Station — the F-16s of 331 and 334 Squadrons and the NATO
// and Norwegian command in the rock: the air base that covers all of Nordland. A thrust down from Finnmark would
// take months to reach it; the Northern Fleet's naval infantry could come from the sea in a night. Out at sea the
// Pact's landing ships and the Royal Norwegian Navy's controlled minefield, the skerries off the headlands; then three
// landing places between low rocky points: the grey sand of Bodøsjøen in the west, the town's harbour in the middle
// (quays, the fish plant, the breakwater), and the shingle at Rønvika under Keiservarden in the east. Behind them the
// coast road, the snow-covered moor, the town rebuilt in concrete after 1940, Keiservarden over the town, and close
// behind the shore the air station itself: the runway along the peninsula, its shelters and hangars, and the road
// east (RV80) toward Fauske, down which Brigade Nord and the Marines' armour come.
// (Compressed and turned: the real runway lies along the peninsula's south shore and the harbour faces north;
// here the open sea is the front, the harbour in the middle and the runway 600 m behind the beaches.)
// Laid out like Keflavík and Andøya (maps/keflavik.ts, maps/andoya.ts) in a frame with the sea toward +z (`L`), then
// turned round: the Pact's side is -z, so the sea is there (the landing comes from its base out at sea:
// systems/Landing.js lands()).
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
const noise = createNoise2D(1985_61);
const sea = createSea({ level: 0, size: SIZE, color: 0x1e3842 }); // (Vestfjorden in winter: dark slate green)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The rocky points between the landing places (x): Hernesodden west of the harbour, Rønvikodden east of it. */
const HEADS = [{ x: -160, reach: 70, w: 46 }, { x: 185, reach: 80, w: 50 }];
const headK = (x: number) => Math.max(Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)), Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2)));
const headReach = (x: number) => Math.max(HEADS[0].reach * Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)), HEADS[1].reach * Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2)));
/** The waterline (local z): the beaches a little over a hundred metres from the middle, the points out past them. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 12 + headReach(x);

/** The skerries (local x, metres out from the waterline, radius): bare rock off the points and the west edge, clear of the lanes. */
const SKERRIES = [[-470, 120, 26], [-430, 230, 16], [-180, 150, 22], [-205, 260, 14], [175, 160, 24], [215, 270, 16], [470, 110, 24], [440, 240, 18]]
  .map(([x, off, r]) => ({ x, z: shoreZ(x) + off, r }));
/** Keiservarden over the town (local): a rounded fell east of the middle, rocky and snow-covered. */
const KEISER = { x: 470, z: -330, r: 130, h: 42 };
/** The air station (local): its runway along the peninsula, 600 m behind the beaches, graded flat. */
const RUNWAY_Z = -460;
const onRunway = (x: number, z: number) => Math.abs(z - RUNWAY_Z) < 22 && x > -260 && x < 300;
const airK = (x: number, z: number) => smoothstep(60, 30, Math.abs(z - RUNWAY_Z)) * smoothstep(-300, -270, x) * smoothstep(340, 310, x);

/** The moor inland (0..1): bog under the snow between the town, the air station and the roads. */
const TOWNS = [{ x: -300, z: -110, r: 80 }, { x: 40, z: -230, r: 130 }, { x: 370, z: -170, r: 70 }];
const moorK = (x: number, z: number) => {
  const town = Math.max(...TOWNS.map((t) => smoothstep(t.r, t.r * 0.6, Math.hypot(x - t.x, (z - t.z) * 1.1))));
  return smoothstep(0.02, 0.2, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * smoothstep(-120, -200, z - shoreZ(x)) * (1 - town) * (1 - airK(x, z));
};

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  const hk = headK(x);
  if (d > 0) { // the bottom: shelving off, rocks off the points, the skerries standing out of it
    let h = 0.4 - d * 0.02 - Math.max(0, d - 120) * 0.05 + hk * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    for (const s of SKERRIES) {
      const q = ((x - s.x) ** 2 + (z - s.z) ** 2) / (s.r * s.r);
      if (q < 1.5) h = Math.max(h, (3.2 + noise(x * 0.09, z * 0.09) * 1.2) * (1 - q) - 1.5);
    }
    return Math.max(h, -20);
  }
  const back = -d;
  // the beach (35 m of sand or shingle), a bank of shingle and turf, then the moor: 5–9 m, rising slowly onto the peninsula
  const beach = 0.5 + Math.min(back, 40) * 0.04;
  const ridge = 1.4 * Math.exp(-(((back - 40) / 9) ** 2));
  const land = 4 + smoothstep(30, 110, back) * 3 + Math.min(Math.max(0, back - 200) * 0.015, 6) + fbm(noise, x * 0.005, z * 0.005, 3) * 3;
  let h = Math.max(beach + ridge, Math.min(land, beach + back * 0.2));
  // the points: bare rock 10–16 m high, a cliff to the sea
  if (hk > 0.05) {
    const top = 12 + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
    h = h + (Math.max(h, 0.5 + top * smoothstep(4, 22, back)) - h) * smoothstep(0.25, 0.7, hk);
  }
  // Keiservarden, and the runway graded flat at 11 m
  const kq = ((x - KEISER.x) ** 2 + (z - KEISER.z) ** 2) / (KEISER.r * KEISER.r);
  if (kq < 6) h += KEISER.h * Math.exp(-kq) * (1 + 0.15 * noise(x * 0.02, z * 0.02)) * smoothstep(60, 140, back);
  const ak = airK(x, z);
  if (ak > 0) h += (11 - h) * ak;
  h -= moorK(x, z) * 0.8; // (the bog hollows)
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The roads (local frame): the coast road, one up from each landing place, the air station's apron road, RV80 behind. */
function onRoadL(x: number, z: number) {
  const sz = shoreZ(x) - headK(x) * 60;
  if (Math.abs(z - (sz - 105 + Math.sin(x * 0.01) * 6)) < 3.5 && x > -470) return true;                         // the coast road
  if (Math.abs(x - (-300 + Math.sin(z * 0.012) * 14)) < 3.5 && z < sz - 40 && z > -650) return true;            // up from Bodøsjøen, past the air station's west end
  if (Math.abs(x - (30 + Math.sin(z * 0.009) * 20)) < 3.5 && z < sz - 40 && z > -388) return true;              // up from the harbour through the town to the air station
  if (Math.abs(x - (340 + Math.sin(z * 0.01) * 12)) < 3.5 && z < sz - 30 && z > -650) return true;              // up from Rønvika under Keiservarden
  if (Math.abs(z - (-385 + Math.sin(x * 0.02) * 3)) < 3.5 && x > -300 && x < 345) return true;                  // the apron road in front of the runway
  if (Math.abs(z - (-650 + Math.sin(x * 0.006) * 14)) < 3.5 && x > -470) return true;                           // RV80, off east toward Fauske
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);

const moorC = gridCache((x: number, z: number) => moorK(x, F * z), BOUNDS);
/** The bogs on the moor under the snow: vehicles all but stuck off the roads, men slow. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = moorC(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.45 : 0.85);
}

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -320, name: 'Bodøsjøen', inland: { name: 'Hernes', x: -300, z: -110 } },
  { x: 10, name: 'Bodø harbour', inland: { name: 'Bodø', x: 40, z: -230 } },
  { x: 345, name: 'Rønvika', inland: { name: 'Keiservarden', x: 370, z: -170 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
const beachLine = (x: number) => shoreZ(x) - 40;

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Bodøsjøen', ...W(-320, beachLine(-320)), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Bodø harbour', ...W(10, beachLine(10)), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Rønvika', ...W(345, beachLine(345)), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Hernes', ...W(-300, -110), owner: null, sector: 'west' },
  { id: 'F', name: 'Bodø', ...W(40, -230), owner: null, sector: 'centre' },
  { id: 'G', name: 'Keiservarden', ...W(370, -170), owner: null, sector: 'east' },
  { id: 'K', name: 'Bodø Main Air Station', ...W(-190, -570), owner: 'nato', sector: 'centre' },
];
/** The air station's airfield (world): the tower 55 m in front of the runway's middle (systems/Airfields.js strip). */
const AIRFIELD = { faction: 'nato', ...W(20, RUNWAY_Z + 55), yaw: Math.PI / 2, large: true, name: 'Bodø Main Air Station' };

export default {
  id: 'bodo-landing',
  name: 'Bodø Landing',
  description: 'Bodø, winter 1985: skerries and beaches west of the town, the harbour, Keiservarden above and Bodø Main Air Station’s runway close behind the shore. The Soviet naval infantry lands from the sea; Norway and the US Marines hold the air base.',
  epochs: ['1985'],
  region: 'north',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (the Home Guard and Brigade Nord with the Marines flown in for Norway; the Northern Fleet’s naval infantry lands)
  conditions: { time: 'dawn', weather: 'overcast' },
  climate: 'winter',
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles: the rocky points are no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985_61,
  height,
  soft,
  river: sea,
  airfields: [AIRFIELD],

  theme: {
    // the short grey Arctic day, cloud low on Keiservarden
    fogColor: 0xaab4be, fogDensity: 0.0007,
    skyTop: 0x5a6c84, skyHorizon: 0xc2c6cc, skyBottom: 0x78828c,
    sunColor: 0xffdcc0, sunIntensity: 1.35, sunDisk: 0.15,
    clouds: 0.8, cloudLight: 0xd6d8dc, cloudDark: 0x76808c,
    sunDir: [0.45, 0.22, -0.85],
    hemiSky: 0xccd6e2, hemiGround: 0x8a9098, hemiIntensity: 1.45,
    rimColor: 0xc4d0dc, rimIntensity: 0.28,
    terrain: {
      grass: '#eef2f4', grassAlt: '#e2e8ec', dryGrass: '#d8d8d0', dirt: '#8a8478', rock: '#5a5c60',
      pasture: '#eceff0', ploughed: '#d0ccc4', stubble: '#dcd8ce', meadow: '#f2f4f4',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoadL(x, lz)) return [0x9a968e, 0.9];                                        // the ploughed roads
        if (onRunway(x, lz)) return [0x66666a, 0.95];                                       // the runway, swept
        if (lz > sz + 3) return [y > 0.6 ? 0x4a4c4e : y > -2 ? 0xa8a496 : 0x7a7a70, 1];      // the skerries' rock, the sand under the water
        if (headK(x) > 0.3 && y > 2.5 && lz > sz - 40) return [0x4e5054, 0.9];              // the points' bare rock
        if (lz > sz - 36) return x > 250 ? [0x8e8c86, 1] : [0xc4beae, 1];                   // the beach: grey sand, Rønvika's shingle
        if (y > 16) return [0x7a7c80, smoothstep(0, 0.5, noise(x * 0.03, z * 0.03)) * 0.45]; // Keiservarden: rock through the snow
        const m = moorK(x, lz);
        if (m > 0.1) return [noise(x * 0.04, z * 0.04) > 0.1 ? 0x9a9884 : 0xcdd0c8, m * 0.7]; // sedge and heather through the snow
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 30, 340] }, pact: { x: 0, z: -830, entries: [-320, 10, 345] } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Soviet landing comes in: the naval infantry by Aist hovercraft or Polnocny, vehicles by Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    // what the landing may call in at sea: the Northern Fleet's escorts (the corvette slot, the Osas, the Natya sweepers, the Tarantul)
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Royal Norwegian Navy's controlled minefield off Bodø, a lane left off each landing place for the sweepers
    seaMines: { z: [500, 560], count: 60, lanes: [-320, 10, 345], lane: 80, seed: 1985_61 },
    // the coastal artillery: a gun dug into each point, laid on the beaches and the water before them
    forts: [{ unit: 'artillery', ...W(-160, shoreZ(-160) - 55), facing: Math.PI }, { unit: 'artillery', ...W(185, shoreZ(185) - 62), facing: Math.PI }],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests on the bank over it
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -480 + i * 11; return headK(x) > 0.3 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 54), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 48), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    // the defence at dawn: the Home Guard (Heimevernet) over each beach and in the town, the brigade's anti-tank teams
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Heimevern section' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the counter-attack: Brigade Nord's armour and the Marines down RV80 and past the air station
    counter: { t: 270, units: ['tank', 'ifv', 'tank', 'ifv', 'tank'], say: 'Brigade Nord is coming in past the air station: Leopards and M113s, straight for the beachhead', sayOther: 'Enemy armour coming down from the air station' },
    // the landing's AI (ai/LandingDirector.js): the naval infantry's buying order, a corvette inshore off the focus beach
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
    const r = mulberry32(1985_61);
    sea.build(scene, terrain);
    const dry = (x: number, z: number) => z < shoreZ(x) - 70 && headK(x) < 0.4 && !onRoadL(x, z) && moorK(x, z) < 0.3 && airK(x, z) < 0.05;

    // ---- Bodø: the town rebuilt after 1940 in concrete — blocks of flats along the streets, town houses round them
    for (let gx = -60; gx <= 140; gx += 24) for (let gz = -160; gz >= -310; gz -= 26) {
      const x = gx + (r() - 0.5) * 6, z = gz + (r() - 0.5) * 6;
      if (!dry(x, z) || Math.abs(x - (30 + Math.sin(z * 0.009) * 20)) < 13 || Math.hypot(x - 40, z + 230) < 22 || r() < 0.2) continue;
      if (r() < 0.4) flats(props, { ...W(x, z), yaw: 0, storeys: 3 + Math.floor(r() * 2), width: 18, depth: 10 });
      else props.townHouse({ ...W(x, z), yaw: 0, width: 8 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0.05 });
    }
    props.church({ ...W(-10, -275), yaw: 0 }); // Bodø domkirke
    // ---- Hernes and Rønvik: painted wooden houses, farms, fish-drying racks
    for (const [cx, cz, n, spread] of [[-300, -110, 10, 45], [370, -170, 9, 40]] as [number, number, number, number][]) {
      let left = n;
      for (let i = 0; i < n * 3 && left > 0; i++) {
        const a = r() * Math.PI * 2, dd = 22 + r() * spread;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!dry(x, z)) continue;
        left--;
        if (i % 4 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
        else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house', damaged: 0 });
      }
      for (let k = 0; k < 3; k++) { // the fish-drying racks (hjeller): rows of poles and rails, low cover
        const x = cx - 60 + k * 10, z = cz + 30, w = W(x, z), y = terrain.heightAt(w.x, w.z);
        if (!dry(x, z)) continue;
        props.box('plain', w.x, y + 2.2, w.z, 14, 0.15, 0.15, 0, 0x5a4a38);
        for (const s of [-6.5, 0, 6.5]) props.box('plain', w.x + s, y + 1.1, w.z, 0.2, 2.2, 0.2, 0, 0x4a3a2a);
      }
    }

    // ---- the harbour: two quays out on their pilings either side of the landing place, the breakwater, the fish plant, oil tanks
    for (const qx of [-80, 100]) for (let k = 0; k < 6; k++) {
      const w = W(qx, shoreZ(qx) - 8 + k * 6);
      props.box('stone', w.x, 1.5, w.z, 9, 3, 6.2, 0, 0x6a6864);
    }
    for (let i = 0; i < 16; i++) props.boulder({ ...W(120 + i * 4, shoreZ(120) + 30 + i * 2.5), radius: 2.4 });
    props.hall({ ...W(-70, shoreZ(-70) - 78), yaw: 0, width: 30, depth: 14, height: 8, color: 0xb8b4a6, roof: 0x8a2e26, door: 8, name: 'fish plant' });
    props.hall({ ...W(110, shoreZ(110) - 80), yaw: 0, width: 24, depth: 12, height: 7, color: 0x8a2e22, roof: 0x3a3a3c, door: 8, name: 'warehouse' });
    props.tanks({ ...W(-150, -170), yaw: 0, count: 3, radius: 5, height: 9, color: 0xaaa89e });
    // a light on the outer skerry
    const lh = W(SKERRIES[3].x, SKERRIES[3].z), ly = terrain.heightAt(lh.x, lh.z);
    props.box('plain', lh.x, ly + 4, lh.z, 2.6, 8, 2.6, 0, 0xe8e4dc);
    props.box('plain', lh.x, ly + 8.8, lh.z, 3, 1.6, 3, 0, 0x9a2a22);

    // ---- Bodø Main Air Station (west and east of the game's tower and hangars — systems/Airfields.js lays those): the
    // hardened shelters of 331 and 334 Squadrons, the old hangar, the mountain hall's doors, a mast
    for (const x of [-420, -365]) props.aircraftShelter({ ...W(x, RUNWAY_Z - 10), yaw: 0 });
    for (const x of [230, 280]) props.aircraftShelter({ ...W(x, RUNWAY_Z - 70), yaw: Math.PI });
    props.hall({ ...W(-420, -540), yaw: 0, width: 40, depth: 30, height: 13, color: 0x7a7e7a, roof: 0x4a4e52, door: 26, name: 'hangar' });
    props.aircraftWreck({ ...W(-230, -515), yaw: 0.4, scale: 1.2 }); // (an F-16 caught on the taxiway by the first strike)
    props.mast({ ...W(-440, -610), height: 26 });
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 70 && headK(x) < 0.35;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) || airK(x, F * z) > 0.01 || !land(x, z) }];
    // birch in the shelter of the town and the lower slopes of Keiservarden; the rest open moor
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 900, broadleaf: 0, autumn: 1, size: 0.6, maxY: 34, avoid,
      forest: (x: number, z: number) => smoothstep(0.3, 0.5, fbm(noise, x * 0.008 + 4, z * 0.008, 2)) * 0.6 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => F * z > shoreZ(x) - 30 || onRoad(x, z) || onRunway(x, F * z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
