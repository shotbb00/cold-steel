// Reykjanes, 1985 (the big field, 1.0 × 1.12 km): the fight inland on Iceland once the Soviet naval infantry is ashore
// at Keflavík (the landing itself: maps/keflavik.ts). From the beachhead the one good road, the Reykjanesbraut, runs
// north-east along the coast of the peninsula to Hafnarfjörður and Reykjavík, thirty kilometres of it across the
// lava fields — hraun, black broken rock under a thick grey-green moss where a man picks his way and a vehicle hardly
// goes at all off the asphalt. The Marines brought in to hold Iceland meet the Soviet push on that road.
// On the map (turned: the road runs -z → +z, the sea of Faxaflói on the west edge, the hills inland on the east):
// NATO comes from Hafnarfjörður's edge (+z), the Soviets from Vogastapi above Vogar (-z). Down the middle the
// Reykjanesbraut: Vogar, Kúagerði's spring half way, Kapelluhraun's young lava with its chapel ruin. Along the coast
// the old shore road: the farms and Kálfatjörn church of Vatnsleysuströnd, the summer houses of Hvassahraun, the
// Straumsvík aluminium smelter's potlines on their bay. Inland the Krýsuvík road: Keilir, the cone everyone knows,
// Krýsuvík's steaming geothermal ground under the Sveifluháls ridge with Kleifarvatn beyond it, and Helgafell's
// block over Hafnarfjörður. No trees — moss, grass and crowberry.
// (Compressed: Vogar to Hafnarfjörður is 20 km; Keilir, Krýsuvík and Kleifarvatn lie 5–10 km further inland.)
// Fairness: not a mirror — the coast wanders, the smelter stands in the NATO half and Vogar's houses in the Soviet
// one, Keilir is a sharp cone and Helgafell a broad block, the lava lies where it flowed — but each side has the same
// three roads, a coast place, a road place and an inland place at the same reach of them, its own hill by the inland
// road (Helgafell for NATO, Keilir for the Soviets), and the middle row — Hvassahraun, Kúagerði, Krýsuvík with the
// Sveifluháls ridge across the middle line — between them; each side a strip for its aircraft behind its line
// (measured: tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { flats } from './common2027.js';
import { segDist } from './arctic2027.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 560, z: 620 }; // (the caches: the field and a margin)
const BASE_Z = 500;
const noise = createNoise2D(1985_93);

// ---- the sea (Faxaflói) on the west edge: Straumsvík's bay by the smelter, Vatnsleysuvík in the south
const coastX = (z: number) => -450 + 14 * Math.sin(z * 0.011 + 1) + 6 * Math.sin(z * 0.037) + 55 * Math.exp(-(((z - 235) / 45) ** 2)) + 40 * Math.exp(-(((z + 215) / 55) ** 2));
/** Metres in from the shore (negative: the sea). */
const seaD = (x: number, z: number) => x - coastX(z);
/** Kleifarvatn, beyond the Sveifluháls ridge on the east edge (<1: the water). */
const lakeQ = (x: number, z: number) => Math.hypot((x - 565) / 100, z / 170);

// ---- the roads: the Reykjanesbraut down the middle, the old shore road on the west, the Krýsuvík road and the
// track past Keilir on the east, a cross road through the middle row
const ROADS: number[][][] = [
  [[0, -560], [0, -470], [15, -380], [40, -250], [15, -120], [-10, 25], [10, 140], [20, 240], [10, 380], [0, 470], [0, 560]], // the Reykjanesbraut
  [[15, -380], [-130, -350], [-250, -300], [-330, -170], [-360, -10], [-345, 140], [-300, 270], [-160, 350], [10, 380]],       // the shore road
  [[10, 380], [170, 360], [300, 290], [345, 150], [330, -30], [345, -140], [330, -250], [180, -340], [15, -380]],              // Krýsuvík road, Keilir track
  [[-360, -10], [-180, 15], [-10, 25], [160, -5], [330, -30]],                                                                // the cross road
];
function roadDistExact(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
const roadDist = gridCacheSmooth(roadDistExact, EXT, 2);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Hafnarfjörður', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Straumsvík', x: -300, z: 270, owner: null, sector: 'west' },
  { id: 'C', name: 'Kapelluhraun', x: 20, z: 240, owner: null, sector: 'centre' },
  { id: 'D', name: 'Helgafell', x: 300, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Hvassahraun', x: -360, z: -10, owner: null, sector: 'west' },
  { id: 'F', name: 'Kúagerði', x: -10, z: 25, owner: null, sector: 'centre' },
  { id: 'G', name: 'Krýsuvík', x: 330, z: -30, owner: null, sector: 'east' },
  { id: 'H', name: 'Vatnsleysuströnd', x: -250, z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Vogar', x: 40, z: -250, owner: null, sector: 'centre' },
  { id: 'J', name: 'Keilir', x: 330, z: -250, owner: null, sector: 'east' },
  { id: 'K', name: 'Vogastapi', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// each side's airfield (systems/Airfields.js): a strip graded on the heath behind its line, the runway 55 m behind the tower
const AIR = [{ faction: 'nato', x: -220, z: 410, yaw: Math.PI / 2, large: false, name: 'Hvaleyri strip' }, { faction: 'pact', x: 200, z: -410, yaw: -Math.PI / 2, large: false }];
const STRIPS = AIR.map((a) => ({ x: a.x, z: a.z + (a.faction === 'nato' ? 55 : -55) }));
const onAir = (x: number, z: number, m = 0) => AIR.some((a, i) => Math.abs(x - a.x) < 125 + m && Math.abs(z - (a.z + STRIPS[i].z) / 2) < 50 + m);

// ---- the hills inland: Helgafell's block (NATO half), Keilir's cone (Soviet half), the Sveifluháls ridge across the middle
const HELGA = { x: 390, z: 360 }, KEILIR = { x: 385, z: -335 };
const hills = (x: number, z: number) => 32 * smoothstep(92, 38, Math.hypot(x - HELGA.x, (z - HELGA.z) * 1.2))
  + 40 * Math.max(0, 1 - Math.hypot(x - KEILIR.x, z - KEILIR.z) / 78) ** 1.25
  + 26 * Math.exp(-(((x - 445 - 10 * Math.sin(z * 0.012)) / 42) ** 2)) * smoothstep(210, 120, Math.abs(z));
// ---- Krýsuvík's geothermal ground (Seltún and its neighbours): hot clay, mud pots, fumaroles
const GEO = [{ x: 380, z: -70, r: 45 }, { x: 372, z: 55, r: 40 }];
const geoK = (x: number, z: number) => GEO.reduce((k, g) => Math.max(k, smoothstep(g.r, g.r * 0.5, Math.hypot(x - g.x, z - g.z))), 0);

/** The heath's level (no lava, no hills): low by the sea, rising inland. */
const heath = (x: number, z: number) => 3 + Math.min(Math.max(seaD(x, z), 0), 40) * 0.06 + smoothstep(0, 900, seaD(x, z)) * 16;
/** Kept off the lava: the towns, round the points and the bases, the strips, the smelter. */
const TOWNS = [{ x: 150, z: 470, r: 110 }, { x: 80, z: -260, r: 85 }, { x: -385, z: 330, r: 80 }];
function lavaExact(x: number, z: number) {
  let k = smoothstep(9, 20, roadDist(x, z)) * smoothstep(4, 20, seaD(x, z)) * (1 - geoK(x, z)) * smoothstep(12, 4, hills(x, z));
  if (k <= 0) return 0;
  for (const p of points) k = Math.min(k, smoothstep(30, 50, Math.hypot(x - p.x, z - p.z)));
  for (const t of TOWNS) k = Math.min(k, smoothstep(t.r * 0.6, t.r, Math.hypot(x - t.x, z - t.z)));
  for (const bz of [BASE_Z, -BASE_Z]) k = Math.min(k, smoothstep(50, 75, Math.hypot(x, z - bz)));
  if (onAir(x, z, 20)) return 0;
  return k * smoothstep(-0.2, 0.06, fbm(noise, x * 0.0045 + 11, z * 0.0045 - 3, 3));
}
/** The lava fields (0..1). */
const lavaC = gridCacheSmooth(lavaExact, EXT, 4);

/** The smooth ground: heath, hills, the lava's thickness, the lake, graded strips and bases (cached). */
function groundExact(x: number, z: number) {
  const sd = seaD(x, z);
  if (sd < 0) return Math.max(-12, 0.6 + sd * 0.25);                                    // the sea: shelving off
  let h = heath(x, z) + fbm(noise, x * 0.003, z * 0.003, 3) * 4 + hills(x, z);
  h += lavaC(x, z) * 2.2;                                                                 // the flows stand a couple of metres proud
  h += geoK(x, z) * fbm(noise, x * 0.02 + 40, z * 0.02, 2) * 1.5;                         // the hot ground, slumped and bulged
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 10;
  STRIPS.forEach((s, i) => { const g = heath(s.x, (AIR[i].z + s.z) / 2) + 1; h += (g - h) * smoothstep(60, 22, Math.abs(z - (AIR[i].z + s.z) / 2)) * smoothstep(175, 135, Math.abs(x - s.x)); });
  for (const bz of [BASE_Z, -BASE_Z]) h += (heath(0, bz) - h) * smoothstep(40, 20, Math.hypot(x, z - bz));
  h = 1 + (h - 1) * smoothstep(0, 14, sd);                                                // the shore: black shingle
  const q = lakeQ(x, z);                                                                  // Kleifarvatn
  if (q < 1) return Math.max(-6, (q - 1) * 30 - 0.5);
  return 0.8 + (h - 0.8) * smoothstep(1, 1.25, q);
}
const groundC = gridCacheSmooth(groundExact, EXT, 3);

function height(x: number, z: number) {
  let h = groundC(x, z);
  const lk = lavaC(x, z);                                                                 // the lava's hummocks and broken blocks
  if (lk > 0.02) h += lk * (Math.abs(noise(x * 0.035, z * 0.035)) * 1.4 + Math.abs(noise(x * 0.12 + 5, z * 0.12)) * 0.4);
  return h;
}

/** The lava: men pick their way through slowly, vehicles all but stuck off the roads; the hot clay at Krýsuvík soft. */
const softK = (foot: boolean) => (x: number, z: number) => {
  if (roadDist(x, z) < 4.5) return 1;
  const m = lavaC(x, z), g = geoK(x, z);
  return Math.min(m <= 0.05 ? 1 : 1 - m * (foot ? 0.4 : 0.85), 1 - g * (foot ? 0.2 : 0.5));
};
const softV = gridCache(softK(false), BOUNDS), softF = gridCache(softK(true), BOUNDS);

const water = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false, // (water that stops, as a river's does: a land battle — world/Sea.js answers the rest)
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x22404a, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.92 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
    this.waterMesh = m;
  },
};

export default {
  id: 'reykjanes',
  name: 'Reykjanes',
  description: 'Iceland, 1985, inland from the Soviet beachhead at Keflavík: the Reykjanesbraut across the moss-grown lava fields to Hafnarfjörður, the Straumsvík smelter on its bay, Vogar, Keilir’s cone and Krýsuvík’s steaming ground under the Kleifarvatn hills. Off the roads the lava stops vehicles; there are no trees.',
  epochs: ['1985'],
  region: 'north',
  armies: { nato: ['usmc'], pact: ['sov'] }, // (the Marines brought in to hold Iceland against the Northern Fleet’s naval infantry and the troops landed behind them)
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985_93,
  height,
  soft: (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z),
  river: water,
  airfields: AIR,

  theme: {
    fogColor: 0xa4aeb4, fogDensity: 0.0007,
    skyTop: 0x5a6a7c, skyHorizon: 0xc0c6ca, skyBottom: 0x767e84,
    sunColor: 0xffe2c4, sunIntensity: 1.5, sunDisk: 0.15,
    clouds: 0.8, cloudLight: 0xd4d8da, cloudDark: 0x70787e,
    sunDir: [0.45, 0.32, 0.8],
    hemiSky: 0xc8d2dc, hemiGround: 0x4a4c40, hemiIntensity: 1.35,
    rimColor: 0xc8d2dc, rimIntensity: 0.22,
    terrain: {
      grass: '#7e8a5c', grassAlt: '#727e54', dryGrass: '#9a9870', dirt: '#5a5648', rock: '#6a6c5a',
      pasture: '#7c8858', ploughed: '#5a5448', stubble: '#8e8c66', meadow: '#84905e',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < 4) return [0x5a5a5c, 0.9];                                    // asphalt
        if (y < 1.4 && (seaD(x, z) < 16 || lakeQ(x, z) < 1.3)) return [0x3a3836, 1];        // black sand and shingle
        const g = geoK(x, z);
        if (g > 0.05) { const n = noise(x * 0.06, z * 0.06); return [n > 0.25 ? 0xd8d0b4 : n > -0.2 ? 0xc0a060 : 0xa0603e, Math.min(1, g * 1.4)]; } // the hot clay: white, sulphur, rust
        const m = lavaC(x, z);
        if (m > 0.1) return noise(x * 0.03, z * 0.03) > 0.3 ? [0x3a3834, m * 0.9] : [0x8e9672, m * 0.75]; // the woolly moss over the lava, bare black rock in patches
        if (y > 26) return [0x6e6a5a, 0.5 * smoothstep(26, 40, y)];                         // the hilltops: scree and palagonite
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-40, 0, 40] }, pact: { x: 0, z: -BASE_Z, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: 0, z: -BASE_Z + 18, name: '1-ya Rota', facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    water.build(scene);
    const placed: [number, number][] = [];
    const free = (x: number, z: number, r = 8) => roadDist(x, z) > 7 + r && seaD(x, z) > 10 + r && lakeQ(x, z) > 1.3 && !onAir(x, z, r) && geoK(x, z) === 0
      && lavaC(x, z) < 0.3 && terrain.heightAt(x, z) < 30 && Math.hypot(x, Math.abs(z) - BASE_Z) > 45 && !placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 13 + r * 0.5);
    const pt = (id: string) => points.find((p) => p.id === id)!;
    /** A corrugated-iron town round (cx, cz): houses with bright roofs, some blocks of flats. */
    const town = (cx: number, cz: number, n: number, spread: number, seed: number, blocks: number) => {
      const r = mulberry32(seed);
      for (let i = 0; i < n * 6 && n > 0; i++) {
        const a = r() * Math.PI * 2, d = 14 + r() * spread, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (!free(x, z, 7) || points.some((p) => Math.hypot(p.x - x, p.z - z) < 18)) continue;
        placed.push([x, z]); n--;
        const yaw = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
        if (r() < blocks) flats(props, { x, z, yaw, storeys: 3, width: 20, depth: 10 });
        else props.townHouse({ x, z, yaw, width: 7 + r() * 3, depth: 8, storeys: r() < 0.6 ? 2 : 1, name: 'house', damaged: 0 });
      }
    };

    // ---- Hafnarfjörður's edge (east of the road, the strip west of it) and Vogar
    props.rand = mulberry32(1985_94);
    town(150, 450, 22, 110, 1985_95, 0.3);
    props.church({ x: 120, z: 520, yaw: 0 }); // Hafnarfjarðarkirkja
    town(85, -265, 18, 75, 1985_96, 0.2);
    props.church({ x: 110, z: -320, yaw: Math.PI / 2 });

    // ---- Straumsvík: the aluminium smelter's two long potlines on the bay, the alumina silos, the stack, the pier
    for (const x of [-395, -368]) { props.hall({ x, z: 320, yaw: 0, width: 16, depth: 100, height: 9, color: 0xa4a6a2, roof: 0x5a5e62, door: 6, name: 'potline' }); placed.push([x, 320], [x, 280], [x, 360]); }
    props.tanks({ x: -395, z: 395, yaw: 0, count: 2, radius: 6, height: 18, color: 0xc8c6be });
    props.chimney({ x: -345, z: 345, height: 40 });
    for (let x = coastX(235) + 2; x > coastX(235) - 50; x -= 6) props.box('stone', x, 1.5, 235, 6.2, 3, 9, 0, 0x6a6864);

    // ---- the shore: Vatnsleysuströnd's farms and Kálfatjörn church, Hvassahraun's summer houses
    const h = pt('H'), e = pt('E');
    for (const [dx, dz, s] of [[-45, 30, 1], [40, -35, 2], [-30, -50, 3]]) if (free(h.x + dx, h.z + dz)) { placed.push([h.x + dx, h.z + dz]); buildSite(props, { kind: 'farm', seed: 1985_970 + s }, h.x + dx, h.z + dz, dx * 0.03); }
    props.church({ x: h.x - 60, z: h.z - 45, yaw: 0 });
    props.rand = mulberry32(1985_98);
    for (const [dx, dz] of [[-35, 30], [-40, -30], [30, 35], [35, -32]]) if (free(e.x + dx, e.z + dz, 4)) { placed.push([e.x + dx, e.z + dz]); props.townHouse({ x: e.x + dx, z: e.z + dz, yaw: dx > 0 ? 0 : Math.PI / 2, width: 6, depth: 6, storeys: 1, name: 'summer house', damaged: 0 }); }

    // ---- the road: Kapelluhraun's chapel ruin (low lava-stone walls), the hut at Kúagerði's spring
    const c = pt('C'), f = pt('F');
    for (const [dx, dz, w, d] of [[0, -2.5, 6, 0.8], [0, 2.5, 6, 0.8], [-3, 0, 0.8, 5], [3, 0, 0.8, 5]]) props.box('stone', c.x - 30 + dx, terrain.heightAt(c.x - 30, c.z + 25) + 0.5, c.z + 25 + dz, w, 1.2, d, 0, 0x3e3c38);
    cover.addCylinder({ x: c.x - 30, z: c.z + 25, radius: 3, height: 1.2 });
    props.townHouse({ x: f.x + 28, z: f.z - 22, yaw: 0, width: 6, depth: 5, storeys: 1, name: 'hut', damaged: 0 });

    // ---- inland: Kaldársel's farm under Helgafell, the mountain hut by Keilir, Krýsuvík's church and the bore-hole shed
    const d0 = pt('D'), j = pt('J'), g = pt('G');
    if (free(d0.x - 40, d0.z + 25)) buildSite(props, { kind: 'farm', seed: 1985_991 }, d0.x - 40, d0.z + 25, 0.3);
    props.townHouse({ x: j.x - 30, z: j.z + 26, yaw: 0, width: 7, depth: 6, storeys: 1, name: 'mountain hut', damaged: 0 });
    props.church({ x: g.x - 35, z: g.z + 40, yaw: Math.PI / 2 }); // Krýsuvíkurkirkja
    props.hall({ x: g.x + 10, z: g.z - 40, yaw: 0.3, width: 14, depth: 9, height: 5, color: 0x8a8e88, roof: 0x7a2e26, door: 4, name: 'bore-hole shed' });
    for (let i = 0; i < 8; i++) { const x = g.x + 18 + i * 4, z = g.z - 30 - i * 2.2; props.box('metal', x, terrain.heightAt(x, z) + 1, z, 4.2, 0.6, 0.6, -0.5, 0xb0b0a8); } // the steam pipe out to the field

    // ---- the lava: broken blocks standing out of the moss; wrecks by the roads
    props.rand = mulberry32(1985_99);
    const r = props.rand;
    for (let i = 0, n = 0; i < 5000 && n < 450; i++) {
      const x = (r() * 2 - 1) * (BOUNDS.x - 10), z = (r() * 2 - 1) * (BOUNDS.z - 10);
      if (lavaC(x, z) < 0.45 || roadDist(x, z) < 8 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 35)) continue;
      props.boulder({ x, z, radius: 0.8 + r() * 1.6 });
      n++;
    }
    for (let i = 0, n = 0; i < 400 && n < 14; i++) {
      const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 520, rd = roadDist(x, z);
      if (rd < 10 || rd > 13 || !free(x, z, 3) || Math.abs(z) > 440) continue;
      props.wreckCar({ x, z, yaw: r() * 6 }); placed.push([x, z]); n++;
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xc8ccc4);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8,
      avoid: [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 10 })),
        { test: (x: number, z: number) => roadDist(x, z) < 5 || seaD(x, z) < 8 || lakeQ(x, z) < 1.1 || onAir(x, z, 10) || geoK(x, z) > 0.2 }] });

    // the steam off Krýsuvík's fumaroles and mud pots, drifting on the wind (the game's own smoke puffs)
    const vr = mulberry32(1985_90), vents: { x: number; y: number; z: number }[] = [];
    for (const v of GEO) for (let i = 0; i < 5; i++) { const a = vr() * Math.PI * 2, d = vr() * v.r * 0.55, x = v.x + Math.cos(a) * d, z = v.z + Math.sin(a) * d; vents.push({ x, z, y: terrain.heightAt(x, z) }); }
    let acc = 0, k = 0;
    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        ground.update(dt, t);
        const S = (globalThis as any).game?.effects?.smoke;
        if (!S || (acc += dt) < 0.25) return;
        acc = 0;
        const v = vents[k++ % vents.length];
        S.spawn(v.x + (vr() - 0.5) * 2, v.y + 0.5, v.z + (vr() - 0.5) * 2, { vx: 0, vy: 1.4, vz: 0, size: 1.6, grow: 3.5, life: 9, alpha: 0.32, color: 0xf0f2f2, drag: 0.4, wind: 1 });
      },
    };
  },
} satisfies MapDef;
