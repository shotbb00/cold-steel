// Andenes, March 1985 (the big field, 1.0 × 1.12 km): the fight inland on Andøya after the Soviet naval infantry has
// got ashore (the landing itself: maps/andoya.ts). The beachhead behind the beaches by Bleik and Andenes holds, and
// the Soviet Army's follow-on regiment comes off it for the prize of the island — Andøya air station, the P-3 Orion
// base that watched the Northern Fleet's submarines — while Brigade Nord's Norwegians and the US Marines come up the
// coast road from Dverberg and Risøyhamn to throw them back into the sea. On the map: the air station's runway and
// hangars across the middle; the town of Andenes, its harbour and red lighthouse on the east shore (Andfjorden, the
// east edge); the coast road (Rv82) along it; Andmyran, the great bog plain in the middle of the island, snowed over
// and soft (vehicles keep to the roads); the island's mountain spine down the west — Måtind over Bleik, the fells
// above Stave — with the road along its foot. The Soviets hold the beachhead in the north (-z), NATO comes from the
// south (+z). (Compressed and turned: the real runway runs along the east shore south of the town, Bleik, Nordmela
// and Stave lie over the spine on the west coast, Dverberg and Haugnes far down the coast road.)
// Fairness: not a mirror — the sea is only on the east edge, the spine only on the west, the bog lies where it lies
// and the town and harbour are on the east shore — but each side has the same three roads to the middle (the foot
// of the spine in the west, across the bog in the centre, the coast road in the east), a village on each and a hill
// of its own in the bog plain; the air station, Andenes and the Måtind shoulder sit on the middle line, and each side
// has a strip for its aircraft behind its line (measured: tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildVillage, commandPost } from './common.js';
import { flats } from './common2027.js';
import { segDist } from './arctic2027.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const NATO_BASE = { x: 60, z: 500 }, PACT_BASE = { x: -50, z: -500 };
const noise = createNoise2D(1985_71);

// ---- the sea: Andfjorden on the east edge, Andenes harbour's bight reaching in by the harbour
const coastX = (z: number) => 445 + 10 * Math.sin(z * 0.012) - 45 * Math.exp(-(((z + 225) / 55) ** 2));
/** Metres from the sea (negative: on it). */
const seaD = (x: number, z: number) => coastX(z) - x;

// ---- Andøya air station's runway across the middle (east–west here), the apron either side
const RUNWAY = { x0: -210, x1: 230, z: -15, w: 22 };
const onRunway = (x: number, z: number) => Math.abs(z - RUNWAY.z) < RUNWAY.w && x > RUNWAY.x0 && x < RUNWAY.x1;

const points: ControlPointDef[] = [
  { id: 'A', name: 'Dverberg road', x: 60, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Stave', x: -290, z: 250, owner: null, sector: 'west' },
  { id: 'C', name: 'Andmyran', x: -60, z: 300, owner: null, sector: 'centre' },
  { id: 'D', name: 'Haugnes', x: 320, z: 230, owner: null, sector: 'east' },
  { id: 'E', name: 'Måtind', x: -335, z: -25, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Andøya air station', x: 30, z: -15, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Andenes', x: 335, z: 20, owner: null, sector: 'east', radius: 30 },
  { id: 'H', name: 'Bleik', x: -320, z: -270, owner: null, sector: 'west' },
  { id: 'I', name: 'Nordmela', x: 80, z: -280, owner: null, sector: 'centre' },
  { id: 'J', name: 'Andenes harbour', x: 360, z: -220, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Andenes beachhead', x: -50, z: -470, owner: 'pact', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, [p.x, p.z]]));

// ---- the roads, each half its own: the foot of the spine (west), across the bog (centre), the coast road (east)
const ROADS: number[][][] = [
  [[60, 560], P.A, [30, 390], P.C, [-40, 160], [10, 60], P.F],                       // NATO's road across Andmyran
  [P.F, [60, -120], [90, -200], P.I, [20, -380], P.K, [-50, -560]],                  // the beachhead's road over the bog
  [P.A, [-120, 410], P.B, [-340, 120], P.E],                                         // south along the spine's foot to Stave
  [P.E, [-350, -150], P.H, [-200, -400], P.K],                                       // north under Måtind to Bleik
  [P.A, [200, 400], P.D, [375, 120], P.G],                                           // the coast road (Rv82) from Dverberg
  [P.G, [370, -100], P.J, [150, -400], P.K],                                         // through the town to the harbour
  [P.E, [RUNWAY.x0 - 10, -25]], [[RUNWAY.x1 + 10, -10], P.G],                         // the air station's road, to its runway's ends
  [P.B, [-170, 300], P.C], [P.H, [-150, -290], P.I],                                 // the bog tracks
];
function roadDistExact(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
const roadDist = gridCacheSmooth(roadDistExact, BOUNDS, 2);

// each side's airfield (systems/Airfields.js) behind its line: a strip Brigade Nord grades by the Dverberg road, one
// the Soviets grade on the beachhead's flats — the runway 55 m beyond the tower, graded flat and kept clear
const AIR = [{ faction: 'nato', x: -210, z: 420, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 210, z: -420, yaw: -Math.PI / 2, large: false }];
const STRIPS = AIR.map((a) => ({ x: a.x, z: a.z + (a.faction === 'nato' ? 55 : -55) }));
const onAir = (x: number, z: number, m = 0) => AIR.some((a, i) => Math.abs(x - a.x) < 125 + m && Math.abs(z - (a.z + STRIPS[i].z) / 2) < 50 + m);

/** Low ground: round the roads, the points, the bases, the strips, the runway. 0 there, 1 up in the fells. */
function mountK(x: number, z: number) {
  let d = roadDist(x, z) - 10;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 50);
  for (const b of [NATO_BASE, PACT_BASE]) d = Math.min(d, Math.hypot(x - b.x, z - b.z) - 70);
  AIR.forEach((a, i) => { d = Math.min(d, Math.max(Math.abs(x - a.x) - 135, Math.abs(z - (a.z + STRIPS[i].z) / 2) - 60)); });
  d = Math.min(d, Math.max(Math.abs(x - (RUNWAY.x0 + RUNWAY.x1) / 2) - 240, Math.abs(z - RUNWAY.z) - 90)); // the air station
  return smoothstep(15, 95, d);
}
/** The mountain spine down the west (0 east of its foot). */
const spineK = (x: number) => smoothstep(-345, -470, x);
// Måtind over Bleik and the fells over Stave on the spine; a hill of each side's own out in the bog: [x, z, r, m]
const MASSIFS = [[-450, -110, 90, 35], [-440, 300, 100, 30], [-170, -195, 75, 22], [170, 180, 75, 20]];
const massif = (x: number, z: number) => MASSIFS.reduce((h, [cx, cz, r, a]) => h + a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r)), 0);

/** Andmyran, the bog plain (0..1): between the spine and the coast road, off the air station and the hills. */
function moorExact(x: number, z: number) {
  const region = smoothstep(-320, -240, x) * smoothstep(290, 220, x) * smoothstep(500, 430, Math.abs(z));
  if (region <= 0) return 0;
  const air = Math.max(smoothstep(RUNWAY.x0 - 40, RUNWAY.x0, x) * smoothstep(RUNWAY.x1 + 40, RUNWAY.x1, x) * smoothstep(110, 70, Math.abs(z - RUNWAY.z)), onAir(x, z, 20) ? 1 : 0);
  return region * (1 - air) * smoothstep(0.0, 0.2, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * smoothstep(9, 4, massif(x, z));
}
const moorC = gridCache(moorExact, BOUNDS);

function groundExact(x: number, z: number) {
  const sd = seaD(x, z);
  if (sd < 0) return Math.max(-16, 0.8 + sd * 0.4);                                    // Andfjorden: shelving off steeply
  let h = 3 + Math.min(sd, 80) * 0.03 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.5 + fbm(noise, x * 0.004, z * 0.004, 2) * 2.5;
  const mk = mountK(x, z), sk = spineK(x), ms = massif(x, z);
  if (mk > 0 && (sk > 0 || ms > 0.3)) h += Math.max(0, sk * (ridged(noise, x * 0.006 + 5, z * 0.006, 4) * 60 + fbm(noise, x * 0.002, z * 0.002, 2) * 20 + 25) + ms) * mk;
  h += smoothstep(BOUNDS.z - 20, BOUNDS.z + 120, Math.abs(z)) * 35;                    // the island goes on beyond the edges
  h -= moorExact(x, z) * 1.2;                                                          // the bog hollows
  h = 1.4 + (h - 1.4) * smoothstep(0, 14, sd);                                         // the shore down to the water
  for (const s of STRIPS) h += (5 - h) * smoothstep(60, 22, Math.abs(z - s.z)) * smoothstep(175, 135, Math.abs(x - s.x)); // the strips graded flat
  h += (4.5 - h) * smoothstep(70, 30, Math.abs(z - RUNWAY.z)) * smoothstep(RUNWAY.x0 - 50, RUNWAY.x0, x) * smoothstep(RUNWAY.x1 + 50, RUNWAY.x1, x); // the runway and its aprons
  for (const b of [NATO_BASE, PACT_BASE]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x - b.x, z - b.z));
  return h;
}
const height = gridCacheSmooth(groundExact, BOUNDS, 2);

/** A few birch thickets low down by the spine and the villages; the bog plain is open. */
const woods = gridCache((x: number, z: number) => smoothstep(0.15, 0.35, fbm(noise, x * 0.008 + 3, z * 0.008, 2)) * smoothstep(28, 16, height(x, z))
  * smoothstep(8, 16, roadDist(x, z)) * (1 - moorC(x, z)) * (onAir(x, z, 20) || onRunway(x, z) ? 0 : 1) * 0.6, BOUNDS);

/** The bog, snow over open water and peat: men flounder, vehicles all but stuck off the roads; the fells slow everyone. */
const mountC = gridCache((x: number, z: number) => mountK(x, z) * spineK(x + 40), BOUNDS);
function soft(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 5 || onRunway(x, z)) return 1;
  const m = moorC(x, z), f = 1 - 0.8 * smoothstep(0.2, 0.7, mountC(x, z));
  return (m <= 0.05 ? 1 : 1 - m * (foot ? 0.45 : 0.85)) * f;
}

const fjord = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false, // (water that stops, as a river's does: a land battle — world/Sea.js answers the rest)
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1f3a46, roughness: 0.1, metalness: 0.35, transparent: true, opacity: 0.92 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    water.userData.noAO = true;
    scene.add(water);
    this.waterMesh = water;
  },
};

export default {
  id: 'andenes',
  name: 'Andenes',
  description: 'Andøya, March 1985, the day after the Soviet landing: the air station’s runway and hangars, the town of Andenes and its harbour on Andfjorden, the snowed-over bog of Andmyran and the island’s mountain spine. Norway and the US Marines come up the coast road to drive the beachhead into the sea.',
  epochs: ['1985'],
  region: 'north',
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (Brigade Nord and the US Marines against the Soviet Army come ashore)
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  climate: 'winter',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985_71,
  height,
  steep: 0.6, // (vehicles: the spine is for the infantry)
  soft,
  river: fjord,
  woods,
  airfields: AIR,

  theme: {
    fogColor: 0xb0bac4, fogDensity: 0.001,
    skyTop: 0x5e7088, skyHorizon: 0xc4c8cc, skyBottom: 0x7a828c,
    sunColor: 0xffe0c4, sunIntensity: 1.35, sunDisk: 0.15,
    clouds: 0.75, cloudLight: 0xdadcdc, cloudDark: 0x7a828e,
    sunDir: [0.5, 0.25, 0.8],
    hemiSky: 0xccd6e2, hemiGround: 0x8a9098, hemiIntensity: 1.45,
    rimColor: 0xc4d0dc, rimIntensity: 0.3,
    terrain: {
      grass: '#eef2f4', grassAlt: '#e2e8ec', dryGrass: '#d8d8d0', dirt: '#8a8478', rock: '#5e6064',
      pasture: '#eceff0', ploughed: '#d0ccc4', stubble: '#dcd8ce', meadow: '#f2f4f4',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (roadDist(x, z) < 4.5) return [0xa4a098, 0.85];                                 // the ploughed roads
        if (onRunway(x, z)) return [Math.abs(z - RUNWAY.z) < 0.6 && Math.floor(x / 12) % 2 === 0 ? 0xd8d8d0 : 0x6a6a6c, 0.92]; // the runway, swept, its centre line
        if (y < 1.6 && seaD(x, z) < 8) return [0x5a5a54, 0.8];                              // the dark shore
        const m = moorC(x, z);
        if (m > 0.1) return [noise(x * 0.04, z * 0.04) > 0.1 ? 0x9a9884 : 0xcdd0c8, m * 0.7]; // sedge and heather through the snow
        if (y > 12) return [0xe4e8ec, smoothstep(-0.35, 0.25, noise(x * 0.025, z * 0.025)) * smoothstep(12, 24, y) * 0.8]; // snow on the fellsides
        return null;
      },
    },
  },

  bases: { nato: { ...NATO_BASE, entries: [-40, 0, 40] }, pact: { ...PACT_BASE, entries: [-40, 0, 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 40, z: 400 }, pact: { x: -40, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: NATO_BASE.x, z: NATO_BASE.z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: PACT_BASE.x, z: PACT_BASE.z + 18, name: '1-ya Rota', facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    fjord.build(scene);
    const free = (x: number, z: number, r = 9) => roadDist(x, z) > r && seaD(x, z) > 8 + r * 0.5 && !onAir(x, z, r) && Math.abs(z - RUNWAY.z) > RUNWAY.w + r + 6 && moorC(x, z) < 0.2 && terrain.heightAt(x, z) < 16;

    // ---- Andenes: painted wooden houses and a few blocks of flats on a grid by the shore, the church
    props.rand = mulberry32(1985_72);
    const r0 = props.rand;
    for (let gx = 255; gx <= 425; gx += 18) for (let gz = -80; gz <= 110; gz += 19) {
      const x = gx + (r0() - 0.5) * 4, z = gz + (r0() - 0.5) * 4;
      if (Math.hypot(x - P.G[0], z - P.G[1]) < 26 || !free(x, z, 8) || r0() < 0.2) continue;
      if (r0() < 0.15) flats(props, { x, z, yaw: Math.PI / 2, storeys: 3, width: 16, depth: 10 });
      else props.townHouse({ x, z, yaw: r0() < 0.5 ? Math.PI / 2 : -Math.PI / 2, width: 7 + r0() * 3, depth: 8, storeys: r0() < 0.6 ? 2 : 1, name: 'house', damaged: 0.05 });
    }
    props.church({ x: 290, z: 95, yaw: Math.PI / 2 }); // Andenes kirke

    // ---- Andenes harbour: the quays into the bight, the fish plant, the oil tanks, the breakwater, the red lighthouse
    for (const [qz, len] of [[-245, 34], [-200, 28]] as [number, number][]) {
      const qx0 = coastX(qz) - 4;
      for (let x = qx0; x < qx0 + len; x += 6) props.box('stone', x, 1.5, qz, 6.2, 3, 9, 0, 0x6a6864);
    }
    props.hall({ x: 375, z: -170, yaw: Math.PI / 2, width: 30, depth: 14, height: 7, color: 0x8a2e22, roof: 0x3a3a3c, door: 8, name: 'fish plant' });
    props.tanks({ x: 300, z: -250, yaw: 0, count: 3, radius: 5, height: 9, color: 0xaaa89e });
    for (let i = 0; i < 12; i++) props.boulder({ x: coastX(-290) + 4 + i * 4, z: -290 + i * 3, radius: 2.4 });
    const lx = coastX(-290) - 10, lz = -290, ly = terrain.heightAt(lx, lz);
    props.column({ x: lx, z: lz, radius: 2.4, height: 3 });
    props.box('plain', lx, ly + 20, lz, 3.6, 34, 3.6, 0.4, 0x9a2a22); // Andenes fyr: red cast iron, 1859
    props.box('plain', lx, ly + 38.5, lz, 4.4, 3, 4.4, 0.4, 0x2a2a2a);

    // ---- Andøya air station: hangars and the tower on the aprons either side of the runway, the shelters, a P-3
    // caught on the ground by the first strike
    for (const x of [-150, -95]) props.hall({ x, z: RUNWAY.z - 62, yaw: 0, width: 46, depth: 30, height: 13, color: 0x6a6e6a, roof: 0x4a4e52, door: 30, name: 'hangar' });
    for (const x of [120, 175]) props.hall({ x, z: RUNWAY.z + 62, yaw: Math.PI, width: 46, depth: 30, height: 13, color: 0x6a6e6a, roof: 0x4a4e52, door: 30, name: 'hangar' });
    props.controlTower({ x: -30, z: RUNWAY.z + 58, yaw: Math.PI });
    for (const x of [100, 150]) props.aircraftShelter({ x, z: RUNWAY.z - 58, yaw: 0 });
    for (const x of [-140, -90]) props.aircraftShelter({ x, z: RUNWAY.z + 58, yaw: Math.PI });
    props.aircraftWreck({ x: 190, z: RUNWAY.z - 34, yaw: 0.3, scale: 1.4 });
    props.mast({ x: -330, z: -60, height: 24 }); // (the radar mast on the Måtind shoulder)

    // ---- villages round the other points (each its own dice), the fish-drying racks, wrecks by the roads
    for (const p of points) if ('ABCDHIK'.includes(p.id)) buildVillage(props, p, 7100 + Math.round(p.x * 3 + p.z), 1);
    for (const [cx, cz] of [P.D, P.H, P.B]) for (let k = 0; k < 3; k++) { // the hjeller: rows of poles and rails, low cover
      const x = cx + 30 + k * 10, z = cz - 30;
      if (!free(x, z, 8)) continue;
      const y = terrain.heightAt(x, z);
      props.box('plain', x, y + 2.2, z, 14, 0.15, 0.15, 0, 0x5a4a38);
      for (const s of [-6.5, 0, 6.5]) props.box('plain', x + s, y + 1.1, z, 0.2, 2.2, 0.2, 0, 0x4a3a2a);
    }
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_74 + m);
      const r = props.rand;
      for (let i = 0; i < 40; i++) {
        const x = (r() * 2 - 1) * 460, z = (40 + r() * 500) * m;
        if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 30) || Math.hypot(x - NATO_BASE.x, z - NATO_BASE.z) < 50 || Math.hypot(x - PACT_BASE.x, z - PACT_BASE.z) < 50) continue;
        const rd = roadDist(x, z);
        if (rd > 7 && rd < 12 && free(x, z, 6)) (r() < 0.5 ? props.wreckCar({ x, z, yaw: r() * 6 }) : props.boulder({ x, z, radius: 1.3 + r() }));
      }
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ ...NATO_BASE, r: 34 }, { ...PACT_BASE, r: 34 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || seaD(x, z) < 4 || onAir(x, z, 10) || (x > RUNWAY.x0 - 30 && x < RUNWAY.x1 + 30 && Math.abs(z - RUNWAY.z) < 90) || (x > 245 && x < 435 && z > -90 && z < 120) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1600, broadleaf: 0, autumn: 1, size: 0.6, maxY: 30, forest: woods });
    cover.finalize(bounds);
    const ground2 = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.6 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground2.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
