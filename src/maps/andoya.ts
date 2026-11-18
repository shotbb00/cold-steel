// Andøya, March 1985 (coastal: the Soviet naval infantry lands, Norway holds; 1.0 × 1.8 km). The northern tip of
// Andøya in Vesterålen, and on it Andøya air station — the Royal Norwegian Air Force's P-3 Orion base that watched the
// Soviet Northern Fleet's submarines going out into the Norwegian Sea: an obvious first objective for a landing in
// the north. Out at sea the Pact's landing ships and the mine barrier; then three beaches of pale shell sand between
// rocky headlands: Bleik beach under the steep Måtind massif in the west, the open beach before Andenes in the
// middle, and the cove by Andenes harbour and its red lighthouse in the east. Behind them the snow-covered moor (bog:
// vehicles keep to the roads), the fishing villages, and inland the air station with its runway.
// Laid out like Hohwacht in a frame with the sea toward +z (`L`), then turned round: the Pact's side is -z, so the
// sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_03);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f3a46 }); // (the Norwegian Sea: cold, dark blue-green)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The rocky headlands between the beaches (x), how far they reach out to sea. */
const HEADS = [{ x: -160, reach: 75, w: 48 }, { x: 175, reach: 85, w: 44 }];
const headK = (x: number) => Math.max(...HEADS.map((h) => Math.exp(-(((x - h.x) / h.w) ** 2))));
/** The waterline (local z): the beaches a little over a hundred metres from the middle, the headlands out past them. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 14 + Math.max(...HEADS.map((h) => h.reach * Math.exp(-(((x - h.x) / h.w) ** 2))));
/** The Måtind massif in the west: 0 east of Bleik, 1 under the mountain. */
const mtnK = (x: number) => smoothstep(-400, -490, x);
/** The moor inland (0..1): bog between the villages and the roads. */
const moorK = (x: number, z: number) => smoothstep(0.02, 0.2, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * smoothstep(-120, -200, z - shoreZ(x) + 0) * (1 - mtnK(x));

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  const hk = headK(x);
  if (d > 0) { // the bottom: shelving off, rocks off the headlands
    const h = 0.4 - d * 0.02 - Math.max(0, d - 120) * 0.05 + hk * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    return Math.max(h, -20);
  }
  const back = -d;
  // the beach (35 m of sand), a low bank of shingle and turf, then the moor: 5–9 m, rising slowly inland
  const beach = 0.5 + Math.min(back, 40) * 0.04;
  let land = 4 + smoothstep(30, 110, back) * 3 + Math.max(0, back - 200) * 0.01 + fbm(noise, x * 0.005, z * 0.005, 3) * 3;
  let h = Math.max(beach, Math.min(land, beach + back * 0.2));
  // the headlands: bare rock 12–18 m high, a cliff to the sea
  if (hk > 0.05) {
    const top = 13 + fbm(noise, x * 0.03, z * 0.03, 2) * 6;
    h = h + (Math.max(h, 0.5 + top * smoothstep(4, 22, back)) - h) * smoothstep(0.25, 0.7, hk);
  }
  // Måtind: the mountain rising straight behind Bleik
  const mk = mtnK(x);
  if (mk > 0) h += mk * smoothstep(40, 120, back) * (45 + fbm(noise, x * 0.01, z * 0.01, 3) * 25);
  h -= moorK(x, z) * 0.8; // (the bog hollows)
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The roads (local frame): the coast road behind the beaches, the road up to Bleik, the road through Andenes to the air station. */
function onRoadL(x: number, z: number) {
  const sz = shoreZ(x) - headK(x) * 60;
  if (Math.abs(z - (sz - 105 + Math.sin(x * 0.01) * 6)) < 3.5 && x > -420) return true;                        // the coast road
  if (Math.abs(x - (-300 + Math.sin(z * 0.012) * 14)) < 3.5 && z < sz - 40 && z > -720) return true;           // up from Bleik
  if (Math.abs(x - (30 + Math.sin(z * 0.009) * 20)) < 3.5 && z < sz - 40 && z > -720) return true;             // through Andenes, inland
  if (Math.abs(x - (330 + Math.sin(z * 0.01) * 12)) < 3.5 && z < sz - 30 && z > -720) return true;             // from the harbour
  if (Math.abs(z - (-600 + Math.sin(x * 0.006) * 20)) < 3.5 && x > -340) return true;                          // across, by the air station
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);
/** The runway (local): east–west, inland. */
const onRunway = (x: number, z: number) => Math.abs(z + 700) < 16 && x > -260 && x < 420;

/** The bogs on the moor (and the shoulders of the headlands are firm): vehicles all but stuck off the roads. */
const moorC = gridCache((x: number, z: number) => moorK(x, F * z), BOUNDS);
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = moorC(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.45 : 0.85);
}

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -320, name: 'Bleik beach', inland: { name: 'Bleik', x: -300, z: -90 } },
  { x: 10, name: 'Andenes beach', inland: { name: 'Andenes', x: 40, z: -230 } },
  { x: 340, name: 'Harbour cove', inland: { name: 'Andenes lighthouse', x: 360, z: -110 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
const beachLine = (x: number) => shoreZ(x) - 40;

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Bleik beach', ...W(-320, beachLine(-320)), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Andenes beach', ...W(10, beachLine(10)), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Harbour cove', ...W(340, beachLine(340)), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Bleik', ...W(-300, -90), owner: null, sector: 'west' },
  { id: 'F', name: 'Andenes', ...W(40, -230), owner: null, sector: 'centre' },
  { id: 'G', name: 'Andenes lighthouse', ...W(360, -110), owner: null, sector: 'east' },
  { id: 'K', name: 'Andøya air station', ...W(120, -640), owner: 'nato', sector: 'centre' },
];

export default {
  id: 'andoya',
  name: 'Andøya Landing',
  description: 'Vesterålen, March 1985: shell-sand beaches between rocky headlands, Måtind over Bleik, the moor behind and the P-3 base at Andøya inland. The Soviet naval infantry lands; Norway and the US Marines hold.',
  epochs: ['1985'],
  region: 'north',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (the Home Guard and Brigade Nord with the Marines' reinforcement; the Northern Fleet's naval infantry lands)
  conditions: { time: 'dawn', weather: 'overcast' },
  climate: 'winter',
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles: the headlands and Måtind are no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft,
  river: sea,

  theme: {
    fogColor: 0xa8b4bc, fogDensity: 0.0006,
    skyTop: 0x5c6e84, skyHorizon: 0xc4c8cc, skyBottom: 0x7a848c,
    sunColor: 0xffe4cc, sunIntensity: 1.45, sunDisk: 0.15,
    clouds: 0.75, cloudLight: 0xd8dadc, cloudDark: 0x7a848e,
    sunDir: [0.4, 0.3, -0.85],
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
        if (lz > sz + 3) return [y > -2 ? 0xd8d4c4 : 0x9a9888, 1];                          // the sand under the water
        if (headK(x) > 0.3 && y > 2.5 && lz > sz - 40) return [0x4e5054, 0.9];             // the headlands' bare rock
        if (lz > sz - 36) return [0xe2dccc, 1];                                             // the beach: pale shell sand
        const m = moorK(x, lz);
        if (m > 0.1) return [noise(x * 0.04, z * 0.04) > 0.1 ? 0x9a9884 : 0xcdd0c8, m * 0.7]; // sedge and heather through the snow
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 30, 330] }, pact: { x: 0, z: -830, entries: [-320, 10, 340] } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Soviet landing comes in: the naval infantry by Aist hovercraft or Polnocny, vehicles by Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    // what the landing may call in at sea: the Northern Fleet's escorts (the corvette slot, the Osas, the Natya sweepers, the Tarantul)
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Royal Norwegian Navy's controlled minefield off the beaches, a lane left off each for the sweepers
    seaMines: { z: [500, 560], count: 60, lanes: [-320, 10, 340], lane: 80, seed: 1985_03 },
    // the coastal artillery: a gun battery dug into each headland, laid on the beaches and the water before them
    forts: [{ unit: 'artillery', ...W(-160, shoreZ(-160) - 55), facing: Math.PI }, { unit: 'artillery', ...W(175, shoreZ(175) - 60), facing: Math.PI }],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests on the bank over it
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -480 + i * 11; return headK(x) > 0.3 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 54), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 48), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    // the defence at dawn: the Home Guard (Heimevernet) over each beach and in the villages, the brigade's anti-tank teams
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Heimevern section' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the counter-attack: Brigade Nord's armour down the road from the air station, and the Marines with it
    counter: { t: 270, units: ['tank', 'ifv', 'tank', 'ifv', 'tank'], say: 'Brigade Nord is coming up from the air station: Leopards and M113s, straight for the beachhead', sayOther: 'Enemy armour coming down the road from the air station' },
    // the landing's AI (ai/LandingDirector.js): the naval infantry's buying order, a corvette inshore off the focus beach
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, heavy: null, inshore: 360 },
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
    const r = mulberry32(1985_03);
    sea.build(scene, terrain);
    const dry = (x: number, z: number) => z < shoreZ(x) - 70 && headK(x) < 0.4 && !onRoadL(x, z) && moorK(x, z) < 0.3;

    // ---- the villages: painted wooden houses, fish-drying racks, a church; Andenes the biggest
    for (let [cx, cz, n, spread] of [[-300, -90, 10, 40], [40, -230, 18, 75], [360, -110, 8, 34]] as [number, number, number, number][]) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 22 + r() * spread;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!dry(x, z)) continue;
        n--;
        if (i % 4 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
        else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house', damaged: 0 });
      }
      for (let k = 0; k < 3; k++) { // the fish-drying racks (hjeller): rows of poles and rails, low cover
        const x = cx + 50 + k * 10, z = cz + 40, w = W(x, z), y = terrain.heightAt(w.x, w.z);
        if (!dry(x, z)) continue;
        props.box('plain', w.x, y + 2.2, w.z, 14, 0.15, 0.15, 0, 0x5a4a38);
        for (const s of [-6.5, 0, 6.5]) props.box('plain', w.x + s, y + 1.1, w.z, 0.2, 2.2, 0.2, 0, 0x4a3a2a);
      }
    }
    props.church({ ...W(10, -280), yaw: 0 });
    // Andenes harbour: the breakwater, the fish plant, and the lighthouse (red cast iron, 1859)
    for (let i = 0; i < 14; i++) props.boulder({ ...W(400 + i * 5, shoreZ(400) + 8 + i * 4), radius: 2.4 });
    props.hall({ ...W(330, shoreZ(330) - 75), yaw: 0, width: 30, depth: 14, height: 7, color: 0x8a2e22, roof: 0x3a3a3c, door: 8, name: 'fish plant' });
    const lh = W(390, -140), ly = terrain.heightAt(lh.x, lh.z);
    props.column({ ...lh, radius: 2.4, height: 3 });
    props.box('plain', lh.x, ly + 20, lh.z, 3.6, 34, 3.6, 0.4, 0x9a2a22);
    props.box('plain', lh.x, ly + 38.5, lh.z, 4.4, 3, 4.4, 0.4, 0x2a2a2a);

    // ---- Andøya air station: the runway (painted), the hangars, the tower, aircraft shelters off the taxiway
    for (const x of [-180, -110, -40]) props.hall({ ...W(x, -660), yaw: 0, width: 46, depth: 34, height: 13, color: 0x6a6e6a, roof: 0x4a4e52, door: 30, name: 'hangar' });
    props.controlTower({ ...W(80, -660), yaw: 0 });
    for (const x of [200, 260, 320]) props.aircraftShelter({ ...W(x, -655), yaw: 0 });
    props.aircraftWreck({ ...W(-60, -730), yaw: 0.3, scale: 1.4 }); // (a P-3 caught on the ground by the first strike)
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    props.finish();

    const land = (x: number, z: number) => F * z < shoreZ(x) - 70 && headK(x) < 0.35;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) || onRunway(x, F * z) || !land(x, z) }];
    // a few stands of downy birch in the shelter of the villages; the rest is open moor
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 700, broadleaf: 0, autumn: 1, size: 0.6, maxY: 30, avoid,
      forest: (x: number, z: number) => smoothstep(0.3, 0.5, fbm(noise, x * 0.008 + 4, z * 0.008, 2)) * 0.6 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => F * z > shoreZ(x) - 30 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
