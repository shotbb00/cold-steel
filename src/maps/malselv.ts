// Målselv / Bardufoss, winter 1985 (the big field, 1.0 × 1.12 km): the hypothetical Soviet drive on north Norway, come
// down the E6 from Nordkjosbotn into the broad Målselv valley in Troms — the heart of Brigade Nord's ground and the
// Norwegian Air Force's Bardufoss air station, the prize of inner Troms. The valley as it really lies: east–west, its
// wide flat floor of farms, birch woods and snowed-over fields filling the field from side to side, the Målselva
// (frozen at the edges, open and fast in the middle) running down it from the east (Øverbygd) to the west (Målsnes),
// three bridges over it: Moen's in the west, the E6's at Bardufoss in the middle, Bjørkeng's in the east. The valley
// sides rise behind each line, not alike: Målselvfjellet's shoulder over the south-east behind Brandvoll, the Andselv
// fells over the north. The glacial river terraces are the ground to hold: Bardufoss air station on its big terrace
// above the north bank in the east, its runway along the valley, and the smaller, lower Rundhaug terrace in the
// south-west. Vehicles keep to the floor and the terraces (`steep`: the mountainsides are for the infantry).
// Norway (with the US Marines' 4th MAB, flown in to reinforce Troms) holds the south (+z) from Setermoen; the Soviet
// Army comes from the north. Fairness by distance, not by shape: the river winds its own way, the air station's
// terrace (north, east) is bigger than Rundhaug's (south, west), traded for Målselvfjellet's shoulder and Fossmoen's
// camp on NATO's side; the roads and woods are each half's — but each side has one bank to itself, one bridge to cross
// on each flank and the E6's in the middle, the same reach of road to its points and a terrace to hold (measured:
// tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildVillage, commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const DECK = 6.5;      // the bridges' decks over the water
const noise = createNoise2D(1985_61);

// ---- the Målselva: east to west across the middle of the valley
const riverZ = (x: number) => 0.11 * x + 22 * Math.sin(x * 0.009) + 8 * Math.sin(x * 0.023);
const riverW = (x: number) => 18 + 4 * Math.sin(x * 0.02 + 1);
/** Metres from the river's water (negative: on it). */
const riverD = (x: number, z: number) => Math.abs(z - riverZ(x)) * 0.95 - riverW(x);

const BRIDGE_HALF = 34; // (deck from the river's line this far each way)
const BRIDGES = [{ x: -300, name: 'Moen bridge' }, { x: 0, name: 'Bardufoss bridge' }, { x: 300, name: 'Bjørkeng bridge' }]
  .map((b) => ({ ...b, z0: riverZ(b.x) - BRIDGE_HALF, z1: riverZ(b.x) + BRIDGE_HALF }));

// ---- the roads, each half its own. The E6 down the middle over the Bardufoss bridge; a road up each flank over its
// bridge; a road along each bank
const ROADS: number[][][] = [
  [[0, 560], [0, 470], [25, 360], [60, 240], [30, 120], [0, 70], [0, -60], [-20, -150], [-40, -270], [-15, -380], [0, -470], [0, -560]], // the E6
  [[0, 420], [-160, 360], [-320, 290], [-300, 160], [-290, 40], [-300, 0], [-300, -130], [-330, -260]],            // west: Rundhaug, Moen, the Moen bridge, Olsborg
  [[-330, -260], [-170, -330], [0, -420]],                                                                          // Olsborg to the E6
  [[0, 430], [170, 380], [340, 330], [330, 200], [300, 110], [300, -20], [280, -60]],                             // east: Brandvoll, the Bjørkeng bridge, the air station
  [[280, -60], [310, -180], [310, -320]],                                                                           // the air station to Skjold
  [[310, -320], [160, -390], [0, -430]],                                                                            // Skjold to the E6
  [[-290, 40], [-140, 70], [12, 82], [150, 98], [300, 110]],                                                        // the south bank road
  [[-300, -110], [-150, -95], [-12, -70], [140, -58], [280, -60]],                                                  // the north bank road
];
function segDist(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
const onBridge = (x: number, z: number) => BRIDGES.some((b) => Math.abs(x - b.x) < 7 && z > b.z0 && z < b.z1);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Setermoen road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Rundhaug', x: -320, z: 290, owner: null, sector: 'west', radius: 24 },
  { id: 'C', name: 'Fossmoen', x: 60, z: 240, owner: null, sector: 'centre' },
  { id: 'D', name: 'Brandvoll', x: 340, z: 330, owner: null, sector: 'east' },
  { id: 'E', name: 'Moen', x: -290, z: 40, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Bardufoss bridge', x: 0, z: riverZ(0), owner: null, sector: 'centre', radius: 22 },
  { id: 'G', name: 'Bardufoss air station', x: 280, z: -60, owner: null, sector: 'east', radius: 28 },
  { id: 'H', name: 'Olsborg', x: -330, z: -260, owner: null, sector: 'west' },
  { id: 'I', name: 'Andselv', x: -40, z: -270, owner: null, sector: 'centre' },
  { id: 'J', name: 'Skjold', x: 310, z: -320, owner: null, sector: 'east', radius: 24 },
  { id: 'K', name: 'Nordkjosbotn road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the terraces: the air station's above the north bank (east), Rundhaug's in the south-west — [cx, cz, hx, hz, h]
const TERRACES = [[250, -110, 190, 70, 14], [-290, 300, 110, 80, 10]];
const RUNWAY = { x0: 120, x1: 400, z: -118, w: 14 }; // Bardufoss's runway (along the valley), on its terrace
function terraceK(x: number, z: number) {
  let k = 0;
  for (const [cx, cz, hx, hz, h] of TERRACES) {
    const d = Math.max(Math.abs(x - cx) - hx, Math.abs(z - cz) - hz, 0);
    k = Math.max(k, h * smoothstep(55, 0, d));
  }
  return k;
}
// the valley sides behind each line, each its own: Målselvfjellet's shoulder (south-east, NATO), the Andselv fells (north, the
// Soviets) and the knoll over the Målsnes bend (north-west) — [x, z, r, h]
const MASSIFS = [[430, 610, 250, 60], [-150, -690, 280, 60], [-600, -280, 170, 28]];
/** The flat field east of the E6 behind the Soviet line where they lay their air strip (NATO's lies on the floor by Rundhaug). */
const stripD = (x: number, z: number) => Math.max(Math.abs(x - 200) - 155, Math.abs(z + 435) - 60);
const massif = (x: number, z: number) => MASSIFS.reduce((h, [cx, cz, r, a]) => h + a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r)), 0)
  * smoothstep(80, 210, Math.min(Math.hypot(x, z - BASE_Z), Math.hypot(x, z + BASE_Z)))   // (each base on the valley floor, its road out open)
  * smoothstep(0, 90, stripD(x, z));                                                         // (and the Soviets' strip behind theirs)

function ground(x: number, z: number) {
  const rd = riverD(x, z);
  if (rd < 0) return Math.max(-4, 0.8 + rd * 0.35);                                   // the river: a gravel bed, deep in the middle
  let h = 5 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.6 + fbm(noise, x * 0.005, z * 0.005, 2) * 2.5; // the valley floor: fields and moraine swells
  h += terraceK(x, z) * smoothstep(10, 45, rd);
  // the valley sides: the floor runs east–west with the river; the mountains rise behind each line, not alike — the
  // Målselvfjellet's shoulder over the south-east (NATO's, behind Brandvoll), the Andselv fells' foot in the north-west
  // (the Soviets', behind Olsborg), lower ground elsewhere where the valley opens toward Målsnes and Øverbygd
  h += massif(x, z) + (ridged(noise, x * 0.006 + 5, z * 0.006, 4) * 0.5 + 0.5) * massif(x, z) * 0.6;
  return 1.6 + (h - 1.6) * smoothstep(0, 18, rd); // the banks down to the water
}
function height(x: number, z: number) {
  let h = ground(x, z);
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(40, 20, Math.hypot(x, z - bz));
  // the runway: graded flat on its terrace
  const rk = smoothstep(RUNWAY.w + 14, RUNWAY.w, Math.abs(z - RUNWAY.z)) * smoothstep(RUNWAY.x0 - 20, RUNWAY.x0, x) * smoothstep(RUNWAY.x1 + 20, RUNWAY.x1, x);
  if (rk > 0) h += (19 - h) * rk;
  // the bridges: a deck across the water, ramps down at each end
  for (const b of BRIDGES) {
    const along = Math.max(b.z0 - z, z - b.z1, 0), k = smoothstep(8.5, 7, Math.abs(x - b.x)) * smoothstep(30, 0, along);
    if (k > 0) h += (Math.max(h, DECK - along * 0.12) - h) * k;
  }
  return h;
}

/** Birch woods on the floor and up the lower slopes, none on the fields round the farms, the runway, the roads. */
const woods = gridCache((x: number, z: number) => smoothstep(0.02, 0.16, fbm(noise, x * 0.007 + 11, z * 0.007 - 4, 3)) * smoothstep(60, 35, height(x, z))
  * smoothstep(8, 16, roadDist(x, z)) * smoothstep(4, 12, riverD(x, z)) * (Math.abs(z - RUNWAY.z) < 60 && x > RUNWAY.x0 - 40 && x < RUNWAY.x1 + 40 ? 0 : 1) * 0.75, BOUNDS);

/** Deep snow off the roads: a little slower; up the mountainsides a crawl (the routes keep to the valley). */
const slope = gridCache((x: number, z: number) => smoothstep(20, 50, height(x, z)), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => (roadDist(x, z) < 6 ? 1 : (foot ? 0.9 : 0.85) * (1 - 0.7 * slope(x, z)));

const water = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false, // (a river: water that stops — world/Sea.js answers the rest)
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2c3e44, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
    this.waterMesh = m;
  },
};

export default {
  id: 'malselv',
  name: 'Målselv',
  description: 'Bardufoss and the broad Målselv valley in Troms, in winter: farms, birch woods and snowed-over fields between the mountains, the Målselva across the middle with three bridges, the air station on its terrace. Brigade Nord’s home ground.',
  epochs: ['1985'],
  region: 'north',
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (Brigade Nord and the US Marines’ 4th MAB against the Soviet Army)
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  climate: 'winter',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  steep: 0.6, // (vehicles: the floor and the terraces)
  soft,
  river: water,
  woods,

  theme: {
    // a grey Arctic winter day, cloud on the tops
    fogColor: 0xb4bec8, fogDensity: 0.001,
    skyTop: 0x62748c, skyHorizon: 0xc8ccd0, skyBottom: 0x7e8690,
    sunColor: 0xffe2c4, sunIntensity: 1.35, sunDisk: 0.15,
    clouds: 0.7, cloudLight: 0xdcdedc, cloudDark: 0x7c8490,
    sunDir: [0.4, 0.25, 0.85],
    hemiSky: 0xccd6e2, hemiGround: 0x8a9098, hemiIntensity: 1.45,
    rimColor: 0xc4d0dc, rimIntensity: 0.3,
    terrain: {
      grass: '#eef2f4', grassAlt: '#e2e8ec', dryGrass: '#d8d8d0', dirt: '#8a8478', rock: '#5e6064',
      pasture: '#eceff0', ploughed: '#d0ccc4', stubble: '#dcd8ce', meadow: '#f2f4f4',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onBridge(x, z)) return [0x6a6a6a, 0.95];                                       // the deck
        if (roadDist(x, z) < 4.5) return [0xa4a098, 0.85];                                 // the ploughed roads
        if (Math.abs(z - RUNWAY.z) < RUNWAY.w && x > RUNWAY.x0 && x < RUNWAY.x1) return [Math.abs(z - RUNWAY.z) < 0.6 && Math.floor(x / 12) % 2 ? 0xe8e8e0 : 0x8a8a88, 0.9]; // Bardufoss's runway, swept
        if (y < 1.4 && riverD(x, z) < 5) return [0x6a6862, 0.8];                            // the gravel banks
        if (y > 30) return [0xe4e8ec, smoothstep(-0.35, 0.25, noise(x * 0.025, z * 0.025)) * smoothstep(30, 45, y) * 0.8]; // snow on the mountainsides, the steepest rock bare
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
    const free = (x: number, z: number, r = 10) => roadDist(x, z) > r && riverD(x, z) > 8 && !BRIDGES.some((b) => Math.abs(x - b.x) < 12 && z > b.z0 - 30 && z < b.z1 + 30);

    // ---- Bardufoss air station: the tower, hangars and the shelters along the runway's north side, the barracks
    props.rand = mulberry32(1985_62);
    props.controlTower({ x: 250, z: -152, yaw: 0 });
    for (const hx of [170, 330]) props.hall({ x: hx, z: -160, yaw: 0, width: 34, depth: 22, height: 11, color: 0x6e7068, roof: 0x4a4c4a, door: 18, name: 'hangar' });
    for (const hx of [205, 295, 375]) props.hall({ x: hx, z: -142, yaw: 0, width: 16, depth: 18, height: 6, color: 0x7a7c74, roof: 0x5a5c58, door: 12, name: 'aircraft shelter' });
    for (const [hx, hz] of [[230, -40], [262, -32], [305, -38]]) props.hall({ x: hx, z: hz, yaw: 0, width: 22, depth: 9, height: 6, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'barracks' });

    // ---- Andselv and Moen: wooden houses along the roads, a church each, a school, the shop
    for (const [p, seed] of [[points[8], 1985_63], [points[4], 1985_64]] as const) {
      props.rand = mulberry32(seed);
      const r = props.rand;
      for (let i = 0; i < 22; i++) {
        const a = r() * Math.PI * 2, d = 26 + r() * 55, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
        if (!free(x, z, 9) || terrain.heightAt(x, z) > 22) continue;
        props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r() * 3, depth: 7 + r() * 2, storeys: r() < 0.4 ? 2 : 1, name: 'house', damaged: 0.05 });
      }
      props.church({ x: p.x + 30, z: p.z + (p.z > 0 ? -38 : 38), yaw: Math.PI / 2 });
    }
    // Fossmoen's camp (Brigade Nord's): barracks blocks round a square
    for (const [dx, dz] of [[-35, -30], [-35, 30], [35, -30], [35, 30]]) if (free(points[2].x + dx, points[2].z + dz, 9)) props.hall({ x: points[2].x + dx, z: points[2].z + dz, yaw: 0, width: 26, depth: 10, height: 7, color: 0x7a5a3e, roof: 0x3a3a3a, door: 4, name: 'barracks' });

    // ---- farms round the other points, scattered farmsteads on the floor, wrecks by the roads (each half its own dice)
    for (const p of points) {
      if (!'ABDHJK'.includes(p.id)) continue;
      buildVillage(props, p, 9800 + Math.round(p.x * 3 + p.z), 1);
    }
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_65 + m);
      const r = props.rand;
      for (let i = 0; i < 70; i++) {
        const x = (r() * 2 - 1) * 340, z = (30 + r() * 480) * m;
        if (stripD(x, z) < 10 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 40) || Math.hypot(x, Math.abs(z) - BASE_Z) < 55 || terrain.heightAt(x, z) > 22
          || (Math.abs(z - RUNWAY.z) < 70 && x > RUNWAY.x0 - 40)) continue;
        const rd = roadDist(x, z);
        if (rd > 14 && rd < 40 && free(x, z, 14) && r() < 0.5) {
          const yaw = r() * 0.3;
          props.house({ x, z, yaw, width: 9, depth: 7, height: 4 });
          if (free(x + 16, z, 14)) props.hall({ x: x + 16, z, yaw, width: 14, depth: 9, height: 6, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'barn' });
        } else if (rd > 7 && rd < 11 && riverD(x, z) > 8) (r() < 0.5 ? props.wreckCar({ x, z, yaw: r() * 6 }) : props.logPile({ x, z, yaw: r() * 0.4, length: 6 + r() * 3 }));
      }
    }

    // ---- the bridges: deck and rails, the piers down into the river
    for (const b of BRIDGES) {
      const mid = (b.z0 + b.z1) / 2, len = b.z1 - b.z0;
      props.box('plain', b.x, DECK - 0.2, mid, 14, 0.6, len, 0, 0x707070);
      for (const s of [-1, 1]) props.box('plain', b.x + s * 6.8, DECK + 0.6, mid, 0.2, 1, len, 0, 0x8a8a8a);
      for (let z = b.z0 + 14; z < b.z1 - 10; z += 14) props.box('stone', b.x, 0.5, z, 8, 11, 2.5, 0, 0x7a7a74);
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 36 }, { x: 0, z: -BASE_Z, r: 36 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || riverD(x, z) < 3 || (Math.abs(z - RUNWAY.z + 20) < 60 && x > RUNWAY.x0 - 30 && x < RUNWAY.x1 + 30) }];
    // birch (bare in winter: spruce-shaped stand-ins kept low) and pine, up to the tree line
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 5000, broadleaf: 0, autumn: 1, size: 0.8, maxY: 60, forest: woods });
    cover.finalize(bounds);
    const ground2 = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.6 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground2.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
