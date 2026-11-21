// Keflavík, 1985 (coastal: the Soviet naval infantry lands, the Iceland Defense Force holds; 1.0 × 1.8 km). The
// Reykjanes peninsula, south-west Iceland, and on it Naval Air Station Keflavík — the NATO base in the middle of the
// GIUK gap: the P-3s that hunted the Northern Fleet's submarines going out into the Atlantic, the F-15s of the 57th
// Fighter-Interceptor Squadron that met the Bears, the radar at Rockville. Take it and the gap is open, so a Soviet
// landing here was the nightmare of every NATO war game of the 1980s. Out at sea the Pact's landing ships and a mine
// barrier the US Navy laid across Stakksfjörður; then three beaches of black volcanic sand and shingle between low
// lava headlands: the harbour at Keflavík in the west, the sands before Njarðvík in the middle (Vatnsnes point
// between them), and Vogavík under the Stapi cliffs in the east. Behind them the lava fields — black, broken rock
// furred with grey-green moss, where no vehicle goes far off the roads — the corrugated-iron towns, and inland on
// the heath the air base itself: its runway and hangars, the base housing, the Rockville radar domes, and the
// Reykjanesbraut running off east toward Reykjavík. The Marine Barracks' security force and the base's own men
// hold the beaches; the Marines' reinforcement comes in by air and down the road from the base.
// (Compressed: the real bay faces north-east and the base lies 3 km behind the towns; here they are 600 m apart.)
// Laid out like Andøya (maps/andoya.ts) in a frame with the sea toward +z (`L`), then turned round: the Pact's side
// is -z, so the sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x22404a }); // (the North Atlantic in Faxaflói: cold, slate blue)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The lava headlands between the beaches (x): Vatnsnes between Keflavík and Njarðvík, the Stapi cliffs before Vogar. */
const HEADS = [{ x: -160, reach: 70, w: 46 }, { x: 185, reach: 80, w: 50 }];
const headK = (x: number) => Math.max(...HEADS.map((h) => Math.exp(-(((x - h.x) / h.w) ** 2))));
/** The waterline (local z): the beaches a little over a hundred metres from the middle, the headlands out past them. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 12 + Math.max(...HEADS.map((h) => h.reach * Math.exp(-(((x - h.x) / h.w) ** 2))));

/** The towns and the base (local): kept clear of the lava. */
const TOWNS = [{ x: -300, z: -120, r: 110 }, { x: 40, z: -240, r: 120 }, { x: 360, z: -110, r: 80 }];
/** The air base on the heath: graded, no lava (local z -560 … -820). */
const baseK = (z: number) => smoothstep(-500, -560, z);
/** The lava fields (0..1): broken, moss-grown rock between the towns, the base and the roads. */
const lavaRaw = (x: number, z: number) => {
  const town = Math.max(...TOWNS.map((t) => smoothstep(t.r, t.r * 0.6, Math.hypot(x - t.x, (z - t.z) * 1.1))));
  return smoothstep(-0.05, 0.25, fbm(noise, x * 0.005 + 11, z * 0.005 - 3, 3)) * smoothstep(-90, -150, z - shoreZ(x)) * (1 - town) * (1 - baseK(z));
};

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  const hk = headK(x);
  if (d > 0) { // the bottom: shelving off, lava reefs off the headlands
    const h = 0.4 - d * 0.02 - Math.max(0, d - 120) * 0.05 + hk * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    return Math.max(h, -20);
  }
  const back = -d;
  // the beach (35 m of black sand and shingle), a storm ridge, then the land: 5–8 m, rising slowly onto the heath (~15 m at the base)
  const beach = 0.5 + Math.min(back, 40) * 0.04;
  const ridge = 1.6 * Math.exp(-(((back - 40) / 9) ** 2));
  let land = 4 + smoothstep(30, 110, back) * 3 + Math.min(Math.max(0, back - 200) * 0.02, 7) + fbm(noise, x * 0.004, z * 0.004, 3) * 3 * (1 - baseK(z) * 0.7);
  let h = Math.max(beach + ridge, Math.min(land, beach + back * 0.2));
  // the headlands: black lava 10–16 m high, a cliff to the sea (Stapi the higher)
  if (hk > 0.05) {
    const top = (x > 0 ? 14 : 10) + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
    h = h + (Math.max(h, 0.5 + top * smoothstep(4, 22, back)) - h) * smoothstep(0.25, 0.7, hk);
  }
  // the lava: hummocks and ridges, a metre or two of broken rock
  const lk = lavaRaw(x, z);
  if (lk > 0) h += lk * (0.6 + Math.abs(noise(x * 0.035, z * 0.035)) * 1.4 + Math.abs(noise(x * 0.12 + 5, z * 0.12)) * 0.3);
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The roads (local frame): the coast road through the towns, up from each, across the base's front, the Reykjanesbraut. */
function onRoadL(x: number, z: number) {
  const sz = shoreZ(x) - headK(x) * 60;
  if (Math.abs(z - (sz - 105 + Math.sin(x * 0.01) * 6)) < 3.5 && x > -470) return true;                          // the coast road
  if (Math.abs(x - (-300 + Math.sin(z * 0.012) * 14)) < 3.5 && z < sz - 40 && z > -600) return true;             // up from Keflavík to the main gate
  if (Math.abs(x - (30 + Math.sin(z * 0.009) * 20)) < 3.5 && z < sz - 40 && z > -600) return true;               // through Njarðvík, inland
  if (Math.abs(x - (340 + Math.sin(z * 0.01) * 12)) < 3.5 && z < sz - 30 && z > -600) return true;               // up from Vogar
  if (Math.abs(z - (-600 + Math.sin(x * 0.006) * 14)) < 3.5 && x > -460) return true;                            // the Reykjanesbraut, past the base, off east to Reykjavík
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);
/** The main runway (local), east–west on the heath: the base's airfield (systems/Airfields.js) lays its strip on it. */
const onRunway = (x: number, z: number) => Math.abs(z + 720) < 22 && x > -90 && x < 400;

const lavaC = gridCache((x: number, z: number) => lavaRaw(x, F * z), BOUNDS);
/** The lava fields: men pick their way through slowly, vehicles all but stuck off the roads. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = lavaC(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.4 : 0.85);
}

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -320, name: 'Keflavík harbour', inland: { name: 'Keflavík', x: -300, z: -120 } },
  { x: 10, name: 'Njarðvík sands', inland: { name: 'Njarðvík', x: 40, z: -240 } },
  { x: 345, name: 'Vogavík', inland: { name: 'Vogar', x: 360, z: -110 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world
const beachLine = (x: number) => shoreZ(x) - 40;

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Keflavík harbour', ...W(-320, beachLine(-320)), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Njarðvík sands', ...W(10, beachLine(10)), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Vogavík', ...W(345, beachLine(345)), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Keflavík', ...W(-300, -120), owner: null, sector: 'west' },
  { id: 'F', name: 'Njarðvík', ...W(40, -240), owner: null, sector: 'centre' },
  { id: 'G', name: 'Vogar', ...W(360, -110), owner: null, sector: 'east' },
  { id: 'K', name: 'NAS Keflavík', ...W(-200, -620), owner: 'nato', sector: 'centre' },
];
/** The base's airfield (world): the tower 55 m in front of the runway's middle (systems/Airfields.js strip). */
const AIRFIELD = { faction: 'nato', ...W(150, -665), yaw: Math.PI / 2, large: true, name: 'NAS Keflavík' };

export default {
  id: 'keflavik',
  name: 'Keflavík Landing',
  description: 'Reykjanes, Iceland, 1985: black-sand beaches between lava headlands, the moss-grown lava fields, Keflavík and Njarðvík on the bay and NAS Keflavík on the heath behind. The Soviet naval infantry lands; the Iceland Defense Force and the Marines hold the base.',
  epochs: ['1985'],
  region: 'north',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  armies: { nato: ['usmc'], pact: ['sov'] }, // (the Iceland Defense Force: the Marine Barracks and the Marines flown in; the Northern Fleet's naval infantry lands)
  conditions: { time: 'dawn', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (vehicles: the lava headlands are no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  soft,
  river: sea,
  airfields: [AIRFIELD],

  theme: {
    fogColor: 0xa4aeb4, fogDensity: 0.0006,
    skyTop: 0x5a6a7c, skyHorizon: 0xc0c6ca, skyBottom: 0x767e84,
    sunColor: 0xffe2c4, sunIntensity: 1.5, sunDisk: 0.15,
    clouds: 0.8, cloudLight: 0xd4d8da, cloudDark: 0x70787e,
    sunDir: [0.45, 0.28, -0.85],
    hemiSky: 0xc8d2dc, hemiGround: 0x4a4c40, hemiIntensity: 1.35,
    rimColor: 0xc8d2dc, rimIntensity: 0.22,
    terrain: {
      grass: '#7e8a5c', grassAlt: '#727e54', dryGrass: '#9a9870', dirt: '#5a5648', rock: '#6a6c5a',
      pasture: '#7c8858', ploughed: '#5a5448', stubble: '#8e8c66', meadow: '#84905e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, sz = shoreZ(x);
        if (onRoadL(x, lz)) return [0x5a5a5c, 0.9];                                         // asphalt
        if (onRunway(x, lz)) return [0x5e5e60, 0.95];                                        // the runway and its shoulders
        if (lz > sz + 3) return [y > -2 ? 0x3a3836 : 0x2a2a2a, 1];                            // black sand under the water
        if (headK(x) > 0.3 && y > 2.5 && lz > sz - 40) return [0x262422, 0.95];              // the headlands' black lava
        if (lz > sz - 36) return [0x4a4844, 1];                                              // the beach: black sand and shingle
        const m = lavaRaw(x, lz);
        if (m > 0.1) return noise(x * 0.03, z * 0.03) > 0.3 ? [0x3a3834, m * 0.9] : [0x8e9672, m * 0.75]; // the woolly moss over the lava, bare black rock in patches
        if (baseK(lz) > 0.5) return [0x8a8c6a, 0.5];                                         // the heath, cut
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
    // the US Navy's mines across Stakksfjörður, a lane left off each beach for the sweepers
    seaMines: { z: [500, 560], count: 60, lanes: [-320, 10, 345], lane: 80, seed: 1985_10 },
    // the Marines' M198s dug in on the two headlands, laid on the beaches and the water before them
    forts: [{ unit: 'artillery', ...W(-160, shoreZ(-160) - 55), facing: Math.PI }, { unit: 'artillery', ...W(185, shoreZ(185) - 62), facing: Math.PI }],
    // prepared positions: wire along the back of each beach, minefields, trenches and MG nests on the ridge over it
    works: [
      ...Array.from({ length: 90 }, (_, i) => { const x = -480 + i * 11; return headK(x) > 0.3 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 54), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 48), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    // the defence at dawn: the Marine Barracks' security force over each beach and in the towns, TOW jeeps and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Marine Barracks squad' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the counter-attack: the Marines flown in overnight, their M60s and amtracs down the road from the base
    counter: { t: 270, units: ['tank', 'ifv', 'tank', 'ifv', 'reconVehicle'], say: 'The Marines flown in overnight are coming down from the base: M60s and amtracs, straight for the beachhead', sayOther: 'Enemy armour coming down the road from the air base' },
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
    const r = mulberry32(1985_10);
    sea.build(scene, terrain);
    const dry = (x: number, z: number) => z < shoreZ(x) - 70 && headK(x) < 0.4 && !onRoadL(x, z) && lavaRaw(x, z) < 0.2;

    // ---- the towns: corrugated-iron houses with bright roofs, concrete blocks, fish plants; Keflavík and Njarðvík the bigger
    for (let [cx, cz, n, spread] of [[-300, -120, 18, 70], [40, -240, 18, 75], [360, -110, 9, 36]] as [number, number, number, number][]) {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 22 + r() * spread;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!dry(x, z)) continue;
        n--;
        if (i % 5 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, a + Math.PI / 2);
        else if (i % 3 === 0) props.flatHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 9 + r() * 4, depth: 8, storeys: r() < 0.5 ? 2 : 3, name: 'apartment block' });
        else props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house', damaged: 0 });
      }
    }
    props.church({ ...W(-260, -170), yaw: 0 }); // Keflavíkurkirkja
    props.church({ ...W(10, -290), yaw: Math.PI / 2 });
    // Keflavík harbour: the breakwater, the fish plant; Njarðvík's slipway hall; oil tanks at Helguvík
    for (let i = 0; i < 16; i++) props.boulder({ ...W(-400 + i * 4.5, shoreZ(-400) + 6 + i * 4), radius: 2.4 });
    props.hall({ ...W(-350, shoreZ(-350) - 78), yaw: 0, width: 32, depth: 14, height: 7, color: 0xb8b4a6, roof: 0x8a2e26, door: 8, name: 'fish plant' });
    props.hall({ ...W(90, shoreZ(90) - 80), yaw: 0, width: 26, depth: 14, height: 8, color: 0x8a8e88, roof: 0x3a5a6a, door: 10, name: 'slipway hall' });
    props.tanks({ ...W(-440, -330), yaw: 0, count: 3, radius: 5, height: 8, color: 0xaaa89e });

    // ---- NAS Keflavík (west of the runway's own hangars and tower — systems/Airfields.js lays those): hangar 831 and
    // its neighbours, the base housing, a hardened shelter, the Rockville radar domes out on the heath
    for (const x of [-360, -290]) props.hall({ ...W(x, -715), yaw: 0, width: 50, depth: 38, height: 15, color: 0x7a7e7a, roof: 0x4a4e52, door: 34, name: 'hangar' });
    for (let i = 0; i < 8; i++) props.flatHouse({ ...W(-150 + (i % 4) * 26, -540 - Math.floor(i / 4) * 24), yaw: 0, width: 18, depth: 10, storeys: 3, name: 'base housing' });
    for (const x of [430]) props.aircraftShelter({ ...W(x, -790), yaw: Math.PI / 2 });
    props.aircraftWreck({ ...W(-200, -780), yaw: 0.4, scale: 1.4 }); // (a P-3 caught on the apron by the first strike)
    for (const [x, z] of [[-440, -470], [-405, -500]]) { // Rockville: the radomes on their towers
      const w = W(x, z), y = terrain.heightAt(w.x, w.z);
      props.box('stone', w.x, y + 4, w.z, 9, 8, 9, 0, 0xb8b6ae);
      props.push('plain', new THREE.SphereGeometry(7, 16, 10), new THREE.Matrix4().makeTranslation(w.x, y + 13, w.z), 0xe8e8e2);
      cover.addCylinder({ x: w.x, z: w.z, radius: 5, height: 18 });
    }
    props.mast({ ...W(-410, -440), height: 24 });
    commandPost(props, this.bases.nato, -1, 0xc8ccc4);

    // ---- the lava: broken blocks of it standing out of the moss (cover for the men picking their way through)
    for (let i = 0, n = 0; i < 4000 && n < 420; i++) {
      const x = (r() * 2 - 1) * (BOUNDS.x - 10), z = (r() * 2 - 1) * (BOUNDS.z - 10);
      if (lavaRaw(x, z) < 0.45 || onRoadL(x, z) || points.some((p) => Math.hypot(p.x - x, p.z - F * z) < 30)) continue;
      props.boulder({ ...W(x, z), radius: 0.8 + r() * 1.6 });
      n++;
    }
    props.finish();

    cover.finalize(bounds);
    // no trees on Reykjanes: moss, grass and crowberry
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => F * z > shoreZ(x) - 30 || onRoad(x, z) || onRunway(x, F * z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); },
    };
  },
} satisfies MapDef;
