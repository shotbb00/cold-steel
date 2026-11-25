// Keflavík, 1985 (coastal: the Soviet naval infantry lands, the Iceland Defense Force holds; 1.0 × 1.8 km). The
// Reykjanes peninsula, south-west Iceland, and on it Naval Air Station Keflavík — the NATO base in the middle of the
// GIUK gap: the P-3s that hunted the Northern Fleet's submarines going out into the Atlantic, the F-15s of the 57th
// Fighter-Interceptor Squadron that met the Bears, the radar at Rockville. Take it and the gap is open, so a Soviet
// landing here was the nightmare of every NATO war game of the 1980s.
// The real coast of Stakksfjörður, turned so that the bay is the -z side: east is -z, north +x. Keflavík's shore
// runs north–south along the bay's west side: in the north the cove of Helguvík (the NATO fuel depot) and the
// Hólmsberg headland, cliffs of grey basalt; in its lee the little harbour of Grófin behind its breakwater and
// Keflavík's waterfront, a sea wall and a strip of shingle; the low rocky point of Vatnsnes; then the bay bites deep
// into the land at Njarðvík, black sand at its head, and on its far side the Stapi cliffs run out to sea — the
// Reykjanesbraut along their top toward Vogar and Reykjavík. Two places to land, as the coast gives them: the
// waterfront under the town and the sands at the head of Njarðvík bay. Behind them the moss-grown lava south of
// Njarðvík, where no vehicle goes far off the roads, the heath rising west to the air base on Miðnesheiði — the
// main gate on the road up from the towns, the runway, the hangars, the base housing and, north on the heath, the
// Rockville radomes.
// (Compressed: the real base lies 3 km behind the towns; here 600 m.)
// The landing comes in from its base out at sea (systems/Landing.js lands()); flipped (wcampaign/battle.js
// flipLanding) the Marines land and the naval infantry holds the towns.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 1000, z: 1000 };
const noise = createNoise2D(1985_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x22404a }); // (the North Atlantic in Stakksfjörður: cold, slate blue)

/** Stakksfjörður (world): the bay's waterline from Helguvík in the north (+x) round Hólmsberg, Keflavík, Vatnsnes and
 *  Njarðvík bay to the Stapi cliffs running out to sea in the south (-x); closed round the open water. */
const SEA = [
  [3000, -200], [500, -190], [462, -150], [432, -112], [402, -138], [382, -210], [356, -300], [325, -345], [290, -330], [262, -282],
  [236, -238], [180, -226], [100, -232], [20, -242], [-55, -256], [-95, -300], [-118, -335], [-142, -318], [-162, -250],
  [-196, -150], [-236, -62], [-282, -16], [-332, -20], [-372, -62], [-396, -142], [-406, -300], [-412, -600], [-416, -3000], [3000, -3000],
];
/** Distance to the waterline (m, + ashore). */
function coastRaw(x: number, z: number) {
  let inside = false;
  for (let i = 0, j = SEA.length - 1; i < SEA.length; j = i++) {
    const [ax, az] = SEA[i], [bx, bz] = SEA[j];
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  const d = segDist(SEA, x, z);
  return inside ? -d : d;
}
const D0 = gridCacheSmooth(coastRaw, EXT, 4);
const D = (x: number, z: number) => D0(x, z) + fbm(noise, x * 0.01, z * 0.01, 2) * 5;

const bump = (x: number, z: number, cx: number, cz: number, r: number) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
/** The cliffs (0..1): Hólmsberg's basalt, the Stapi running out to sea; Vatnsnes the low rocky point. */
const holmK = (x: number, z: number) => bump(x, z, 330, -270, 95);
const stapiK = (x: number) => smoothstep(-370, -405, x);
const vatnK = (x: number, z: number) => bump(x, z, -112, -290, 50);

/** The roads (world): the coast road round the bay, the Hringbraut up to the main gate, Njarðvík's road up to the
 *  heath, the Reykjanesbraut along Stapi and across the heath, the gate road to the base. */
const ROADS = [
  [[470, -40], [330, -150], [210, -180], [100, -186], [-30, -200], [-110, -205], [-180, -90], [-250, 40], [-330, 52], [-420, -10], [-455, -200], [-462, -900]],
  [[110, -186], [100, -60], [70, 150], [-20, 410]],
  [[-260, 46], [-250, 200], [-150, 390], [-20, 410]],
  [[-520, 250], [-300, 320], [-20, 410], [300, 470], [520, 460]],
  [[-20, 410], [-30, 560], [0, 830]],
  [[-300, 610], [460, 610]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The main runway, east–west on the heath: the base's airfield (systems/Airfields.js) lays its strip on it. */
const onRunway = (x: number, z: number) => Math.abs(z - 720) < 22 && x > -90 && x < 400;
/** The air base on the heath: graded, no lava. */
const baseK = (z: number) => smoothstep(500, 560, z);

/** The towns (kept clear of the lava): Keflavík along the waterfront, Njarðvík round the bay head, Innri-Njarðvík on the Stapi side. */
const TOWNS = [{ x: 120, z: -110, r: 140 }, { x: -270, z: 130, r: 100 }, { x: -450, z: 40, r: 50 }];
/** The lava fields (0..1): the moss-grown flows south of Njarðvík and on the Stapi, patches out on the heath. */
const lavaRaw = (x: number, z: number) => {
  const town = Math.max(...TOWNS.map((t) => smoothstep(t.r, t.r * 0.6, Math.hypot(x - t.x, z - t.z))));
  const where = Math.max(smoothstep(-60, -200, x), 0.4 * smoothstep(200, 300, z));
  return smoothstep(-0.1, 0.25, fbm(noise, x * 0.005 + 11, z * 0.005 - 3, 3) + where * 0.35 - 0.2) * where * smoothstep(40, 90, D0(x, z)) * (1 - town) * (1 - baseK(z));
};
const lavaC = gridCache(lavaRaw, BOUNDS);
const lavaS = gridCacheSmooth(lavaRaw, BOUNDS, 4);

function height(x: number, z: number) {
  const d = D(x, z);
  if (d < 0) { // the bottom: shelving off, rock reefs off the points
    const s = -d, reef = (holmK(x, z) + vatnK(x, z) + stapiK(x) * 0.6) * Math.max(0, 2.5 - s * 0.04) * (0.6 + noise(x * 0.05, z * 0.05));
    return Math.max(0.3 - s * 0.025 - Math.max(0, s - 90) * 0.05 + reef, -20);
  }
  // the shore: shingle and black sand, a storm ridge; then the heath rising west (+z) onto Miðnesheiði, flat at the base
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const ridge = 1.3 * Math.exp(-(((d - 32) / 8) ** 2));
  const heath = 4 + smoothstep(-260, 520, z) * 30 + smoothstep(0, 120, d) * 2 + fbm(noise, x * 0.004, z * 0.004, 3) * 3 * (1 - baseK(z) * 0.8);
  let h = Math.max(beach + ridge, Math.min(heath, beach + d * 0.12));
  // the cliffs: Hólmsberg 26 m, the Stapi 24 m, straight down to the sea; Vatnsnes a low rocky point
  const top = (k: number, hh: number) => { if (k > 0.05) h += (Math.max(h, 0.5 + (hh + fbm(noise, x * 0.03, z * 0.03, 2) * 3) * smoothstep(3, 18, d)) - h) * smoothstep(0.2, 0.7, k); };
  top(holmK(x, z), 26);
  top(stapiK(x), 22 + smoothstep(-200, -700, z) * 6);
  top(vatnK(x, z), 5);
  // the lava: hummocks and ridges, a metre or two of broken rock
  const lk = lavaS(x, z);
  if (lk > 0) h += lk * (0.6 + Math.abs(noise(x * 0.035, z * 0.035)) * 1.4 + Math.abs(noise(x * 0.12 + 5, z * 0.12)) * 0.3);
  return h;
}

/** The lava fields: men pick their way through slowly, vehicles all but stuck off the roads. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = lavaC(x, z);
  return m <= 0.05 ? 1 : 1 - m * (foot ? 0.4 : 0.85);
}

/** The waterline coming in from the sea along x (world z): where the boats ground. */
const shoreAt = (x: number) => { let z = -900; while (z < 600 && coastRaw(x, z) < 0) z += 2; return z; };

/** The landing places (x) and the place each opens. */
export const SECTORS = [
  { x: 150, name: 'Keflavík harbour', inland: { name: 'Keflavík', x: 90, z: -90 } },
  { x: -282, name: 'Njarðvík sands', inland: { name: 'Njarðvík', x: -250, z: 170 } },
];

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'Landing area', x: -60, z: -720, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Keflavík harbour', x: 150, z: shoreAt(150) + 34, owner: null, sector: 'east', radius: 50, opens: 'E' },
  { id: 'C', name: 'Njarðvík sands', x: -282, z: shoreAt(-282) + 34, owner: null, sector: 'west', radius: 50, opens: 'F' },
  // Keflavík's town centre: once it is held, the Hringbraut up the heath to the main gate is open
  { id: 'E', name: 'Keflavík', ...SECTORS[0].inland, owner: null, sector: 'east', opens: 'H' },
  { id: 'F', name: 'Njarðvík', ...SECTORS[1].inland, owner: null, sector: 'west' },
  { id: 'H', name: 'Main gate', x: -30, z: 350, owner: null, sector: 'centre' },
  { id: 'K', name: 'NAS Keflavík', x: -250, z: 640, owner: 'nato', sector: 'centre' },
];
/** The base's airfield: the tower 55 m in front of the runway's middle (systems/Airfields.js strip). */
const AIRFIELD = { faction: 'nato', x: 150, z: 665, yaw: Math.PI / 2, large: true, name: 'NAS Keflavík' };

export default {
  id: 'keflavik',
  name: 'Keflavík Landing',
  description: 'Reykjanes, Iceland, 1985: Stakksfjörður under Hólmsberg — Keflavík’s waterfront and the black sands at the head of Njarðvík bay, the Stapi cliffs, the moss-grown lava and NAS Keflavík on the heath above. The Soviet naval infantry lands; the Iceland Defense Force and the Marines hold the base.',
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
  steep: 0.5, // (vehicles: not up Hólmsberg or the Stapi)
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
        const d = D0(x, z);
        if (onRoad(x, z)) return [0x5a5a5c, 0.9];                                             // asphalt
        if (onRunway(x, z)) return [0x5e5e60, 0.95];                                          // the runway and its shoulders
        if (d < -3) return [y > -2 ? 0x3a3836 : 0x2a2a2a, 1];                                 // black sand under the water
        if ((holmK(x, z) > 0.3 || stapiK(x) > 0.5 || vatnK(x, z) > 0.4) && y > 2.5 && d < 40) return [0x2e2c2a, 0.95]; // the cliffs' dark basalt
        if (d < 34) return [0x4a4844, 1];                                                     // the shore: black sand and shingle
        const m = lavaRaw(x, z);
        if (m > 0.1) return noise(x * 0.03, z * 0.03) > 0.3 ? [0x3a3834, m * 0.9] : [0x8e9672, m * 0.75]; // the woolly moss over the lava, bare black rock in patches
        if (baseK(z) > 0.5) return [0x8a8c6a, 0.5];                                            // the heath, cut
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-250, 0, 250] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Pact lands: its roads are the landing places)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: -60, z: -420 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Soviet landing comes in: the naval infantry by Aist hovercraft or Polnocny, vehicles by Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['polnocny'] },
    // what the landing may call in at sea: the Northern Fleet's escorts (the corvette slot, the Osas, the Natya sweepers, the Tarantul)
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the US Navy's mines across Stakksfjörður, a lane left off each landing place
    seaMines: { z: [500, 560], count: 50, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1985_10 },
    // the Marines' M198s dug in on Hólmsberg and on the Stapi, laid on the bay
    forts: [{ unit: 'artillery', x: 330, z: -240, facing: Math.PI }, { unit: 'artillery', x: -450, z: -260, facing: Math.PI }],
    // prepared positions: wire along the waterfront and round the bay head, minefields, trenches and MG nests behind
    works: [
      ...Array.from({ length: 21 }, (_, i) => 40 + i * 11).map((x) => ({ kind: 'wire', x, z: shoreAt(x) + 26, yaw: 0 })),
      ...Array.from({ length: 17 }, (_, i) => -368 + i * 11).map((x) => ({ kind: 'wire', x, z: shoreAt(x) + 26, yaw: 0 })),
      ...SECTORS.flatMap((s) => [-40, 40].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreAt(s.x + dx) + 60 }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreAt(s.x + dx) + 52, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreAt(s.x + dx) + 46, yaw: Math.PI }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreAt(s.x + dx) + 36 }))),
      { kind: 'trench', x: -115, z: -240, yaw: Math.PI / 2 }, { kind: 'mgNest', x: -112, z: -262, yaw: Math.PI }, // (Vatnsnes, flanking both)
    ],
    // the defence at dawn: the Marine Barracks' security force over each landing place and in the towns, TOW jeeps and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'Marine Barracks squad' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => ({ x: s.x + dx, z: shoreAt(s.x + dx) + (Math.abs(dx) < 30 ? 48 : 56) }))),
      ...SECTORS.map((s) => s.inland), { x: -30, z: 350 }, { x: -115, z: -232 }],
    // the counter-attack: the Marines flown in overnight, their M60s and amtracs down the road from the base
    counter: { t: 270, units: ['tank', 'ifv', 'tank', 'ifv', 'reconVehicle'], say: 'The Marines flown in overnight are coming down from the base: M60s and amtracs, straight for the beachhead', sayOther: 'Enemy armour coming down the road from the air base' },
    // the landing's AI (ai/LandingDirector.js): the naval infantry's buying order, a corvette inshore off the focus beach
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 360 },
    economy: { reserves: 1800, perSector: 500, beachIncome: 0.6, defenceCp: 1000, defenceIncome: 1.8 },
    // the amphibious vehicles swim in on their own: BTRs, BRDMs and the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'pt76', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'ifv', sector: 1 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_10);
    sea.build(scene, terrain);
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < m);
    const dry = (x: number, z: number) => coastRaw(x, z) > 45 && holmK(x, z) < 0.3 && stapiK(x) < 0.3 && roadD(x, z) > 8 && lavaRaw(x, z) < 0.2 && !nearPoint(x, z, 14);

    // ---- the towns: corrugated-iron houses with bright roofs, concrete blocks, fish plants
    for (let [cx, cz, n, sx, sz] of [[120, -100, 30, 130, 80], [-270, 130, 20, 80, 70], [-450, 40, 6, 30, 40]] as number[][]) {
      for (let i = 0; i < n * 4 && n > 0; i++) {
        const x = cx + (r() * 2 - 1) * sx, z = cz + (r() * 2 - 1) * sz;
        if (!dry(x, z)) continue;
        n--;
        const yaw = r() < 0.5 ? 0 : Math.PI / 2;
        if (i % 7 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, yaw);
        else if (i % 3 === 0) props.flatHouse({ x, z, yaw, width: 9 + r() * 4, depth: 8, storeys: r() < 0.5 ? 2 : 3, name: 'apartment block' });
        else props.townHouse({ x, z, yaw, width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house', damaged: 0 });
      }
    }
    props.church({ x: 60, z: -40, yaw: 0 });          // Keflavíkurkirkja
    props.church({ x: -300, z: 180, yaw: Math.PI / 2 }); // Njarðvík's church
    // Grófin: the breakwater under Hólmsberg, the fish plant on the waterfront; the slipway at Njarðvík; Helguvík's fuel tanks
    for (let i = 0; i < 12; i++) props.boulder({ x: 262 - i * 3, z: -284 - i * 1.4, radius: 2.4 });
    props.hall({ x: 215, z: -160, yaw: 0, width: 32, depth: 14, height: 7, color: 0xb8b4a6, roof: 0x8a2e26, door: 8, name: 'fish plant' });
    props.hall({ x: -200, z: 30, yaw: Math.PI / 4, width: 26, depth: 14, height: 8, color: 0x8a8e88, roof: 0x3a5a6a, door: 10, name: 'slipway hall' });
    props.tanks({ x: 450, z: -40, yaw: 0, count: 4, radius: 6, height: 9, color: 0xaaa89e });

    // ---- NAS Keflavík (west of the runway's own hangars and tower — systems/Airfields.js lays those): hangars, the base
    // housing, a hardened shelter, the Rockville radomes north on the heath
    for (const x of [-360, -290]) props.hall({ x, z: 715, yaw: 0, width: 50, depth: 38, height: 15, color: 0x7a7e7a, roof: 0x4a4e52, door: 34, name: 'hangar' });
    for (let i = 0; i < 8; i++) props.flatHouse({ x: -180 + (i % 4) * 26, z: 520 + Math.floor(i / 4) * 24, yaw: 0, width: 18, depth: 10, storeys: 3, name: 'base housing' });
    props.aircraftShelter({ x: 430, z: 790, yaw: Math.PI / 2 });
    props.aircraftWreck({ x: -200, z: 780, yaw: 0.4, scale: 1.4 }); // (a P-3 caught on the apron by the first strike)
    for (const [x, z] of [[400, 380], [440, 340]]) { // Rockville: the radomes on their towers
      const y = terrain.heightAt(x, z);
      props.box('stone', x, y + 4, z, 9, 8, 9, 0, 0xb8b6ae);
      props.push('plain', new THREE.SphereGeometry(7, 16, 10), new THREE.Matrix4().makeTranslation(x, y + 13, z), 0xe8e8e2);
      cover.addCylinder({ x, z, radius: 5, height: 18 });
    }
    props.mast({ x: 460, z: 400, height: 24 });
    props.mast({ x: 330, z: -230, height: 18 }); // (the light on Hólmsberg)
    commandPost(props, this.bases.nato, -1, 0xc8ccc4);

    // ---- the lava: broken blocks standing out of the moss (cover for the men picking their way through)
    for (let i = 0, n = 0; i < 5000 && n < 420; i++) {
      const x = (r() * 2 - 1) * (BOUNDS.x - 10), z = (r() * 2 - 1) * (BOUNDS.z - 10);
      if (lavaRaw(x, z) < 0.45 || roadD(x, z) < 5 || nearPoint(x, z, 30)) continue;
      props.boulder({ x, z, radius: 0.8 + r() * 1.6 });
      n++;
    }
    props.finish();

    cover.finalize(bounds);
    // no trees on Reykjanes: moss, grass and crowberry
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => D0(x, z) < 30 || onRoad(x, z) || onRunway(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); },
    };
  },
} satisfies MapDef;
