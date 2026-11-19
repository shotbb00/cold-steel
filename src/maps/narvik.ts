// Narvik, winter 1985 (the big field, 1.0 × 1.12 km): the ice-free ore port at the head of the Ofotfjord, the prize
// of the northern flank. The town stands on its peninsula between two arms of the fjord — the Rombaksfjord to the
// north, the Beisfjord to the south — with steep snow-covered mountains rising straight from the water all round, so
// every way anywhere is a road along a shore or a bridge: the E6 over the Rombak bridge (north) and the Skjomen
// bridge (south), round the fjord heads, and the shore road through the town. The ore railway (Ofotbanen) leaves the
// LKAB ore port along the Rombaksfjord's side for Sweden, on a shelf blasted out of the mountainside, through its
// tunnels. Vehicles keep to the valleys (`steep`: the mountains are for the infantry).
// Norway and the US Marines hold the south (+z), the Soviet Army comes down from the north (Bjerkvik).
// Fairness: not a mirror — the Beisfjord is narrower than the Rombaksfjord and reaches further in, the roads, the
// mountains and the woods are each half's own — but each fjord arm cuts across one side's way in and each has one
// bridge and a way round its head, so both sides have the same two kinds of route to the town at about the same
// distances, and the same mountain walls to climb (measured: tools/map_fairness.py). The ore port and railway are
// the north's, the town's two shore roads one each.
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
const FZ = 150;        // the fjord arms' middles: z = -150 (Rombaksfjord), +150 (Beisfjord)
const FW = 48;         // their half-width
const HEAD = 210;      // the Rombaksfjord ends at x = +210
const FZB = 185, FWB = 40, HEAD_B = 270; // the Beisfjord: its middle, half-width, and its head at x = -245
const DECK = 7;        // the bridges' decks over the water
const noise = createNoise2D(1985_04);

/** Metres outside the Rombaksfjord (negative: on the water), and outside the Beisfjord. */
const armD = (x: number, z: number) => Math.hypot(Math.max(0, x - HEAD), z + FZ - 9 * Math.sin(x * 0.009)) - FW * (0.92 + 0.08 * Math.sin(x * 0.02 + 1));
const beisD = (x: number, z: number) => Math.hypot(Math.max(0, -HEAD_B - x), z - FZB - 12 * Math.sin(x * 0.011 + 0.5)) - FWB * (0.9 + 0.1 * Math.sin(x * 0.017 + 2));
const fjordD = (x: number, z: number) => Math.min(armD(x, z), beisD(x, z));

// ---- the roads, each half its own. South: the E6 north from the base to Ankenes and the Skjomen bridge, west round
// the Beisfjord's head; north: the E6 south from Bjerkvik to Øyjord and the Rombak bridge, east round the Rombaksfjord's
// head; a shore road into the town from each side
const ROADS: number[][][] = [
  [[0, 520], [20, 400], [40, 310]],                     // E6 to Ankenes
  [[40, 310], [230, 285], [350, 262]],                  // along the Beisfjord to the Skjomen bridge
  [[350, 262], [350, 90], [255, 62]],                   // the Skjomen bridge, up into Fagernes
  [[0, 440], [-200, 360], [-380, 300]],                 // west to Håkvik
  [[-380, 300], [-330, 170], [-285, 60], [-230, -50]],  // round the Beisfjord's head to the ore port
  [[-230, -50], [-110, -18], [0, 0]],                   // the shore road into the town (west)
  [[-380, 300], [-470, 430]],                           // a farm road on
  [[0, -520], [-35, -410], [-85, -295]],                // E6 to Øyjord
  [[-85, -295], [-230, -285], [-370, -246]],            // along the Rombaksfjord to the Rombak bridge
  [[-370, -246], [-370, -75], [-230, -50]],             // the Rombak bridge, down to the ore port
  [[0, -440], [180, -385], [345, -335]],                // east to Rombaksbotn
  [[345, -335], [325, -200], [300, -80], [255, 62]],    // round the Rombaksfjord's head to Fagernes
  [[255, 62], [120, 30], [0, 0]],                       // the shore road into the town (east)
  [[-370, -246], [-450, -400]],                         // the old road west
];
const BRIDGES = [{ x: 350, z0: 262, z1: 90, name: 'Skjomen bridge' }, { x: -370, z0: -246, z1: -75, name: 'Rombak bridge' }];
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
const onBridge = (x: number, z: number) => BRIDGES.some((b) => Math.abs(x - b.x) < 5 && z > Math.min(b.z0, b.z1) && z < Math.max(b.z0, b.z1));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Ballangen road', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Håkvik', x: -380, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Ankenes', x: 40, z: 310, owner: null, sector: 'centre' },
  { id: 'D', name: 'Skjomen bridge', x: 350, z: 268, owner: null, sector: 'east', radius: 22 },
  { id: 'E', name: 'LKAB ore port', x: -230, z: -50, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Narvik', x: 0, z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Fagernes', x: 255, z: 62, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Rombak bridge', x: -370, z: -252, owner: null, sector: 'west', radius: 22 },
  { id: 'I', name: 'Øyjord', x: -85, z: -295, owner: null, sector: 'centre' },
  { id: 'J', name: 'Rombaksbotn', x: 345, z: -335, owner: null, sector: 'east' },
  { id: 'K', name: 'Bjerkvik', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the ore railway: from the port along the Rombaksfjord's side, east for Sweden (decoration; its shelf is cut)
const railZ = (x: number) => -84 + 5 * Math.sin(x * 0.012);
const RAIL_X0 = -300;
const GRADE = 9;

/** Low ground: the valleys the roads take, round the points, the shore shelves. 0 there, 1 up in the mountains. */
function mountK(x: number, z: number) {
  let d = roadDist(x, z) - 10;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 50);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x, z - bz) - 70);
  return smoothstep(15, 95, d);
}
const rawMt = (x: number, z: number) => ridged(noise, x * 0.006 + 5, z * 0.006, 4) * 70 + fbm(noise, x * 0.002, z * 0.002, 2) * 30;
// the big massifs, each half its own (Ankenesfjellet and Skjomtinden south; Rombakstøtta and the Gangsåstoppen ridge north): [x, z, r, m]
const MASSIFS = [[-230, 430, 100, 35], [440, 130, 90, 30], [-100, 200, 80, 25], [-200, -410, 100, 30], [430, -120, 90, 30], [150, -470, 80, 25]];
const massif = (x: number, z: number) => MASSIFS.reduce((h, [cx, cz, r, a]) => h + a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r)), 0);

function ground(x: number, z: number) {
  const fd = fjordD(x, z);
  if (fd < 0) return Math.max(-16, 0.8 + fd * 0.5);                                   // the fjord: steep-sided and deep
  const lowland = 2.2 + Math.min(fd, 60) * 0.04 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.6 + fbm(noise, x * 0.004, z * 0.004, 2) * 3;
  const mt = Math.max(0, rawMt(x, z) * 0.85 + 20 + massif(x, z)) * mountK(x, z) * smoothstep(0, 30, fd);
  let h = lowland + mt;
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 120, Math.abs(x)) * 60 * (1 + 0.5 * fbm(noise, x * 0.004 + 77, z * 0.006, 2)) * smoothstep(0, 40, fd); // mountains round the edges, peaks and cols
  h += smoothstep(BOUNDS.z - 20, BOUNDS.z + 120, Math.abs(z)) * 40;
  return h;
}
function height(x: number, z: number) {
  let h = ground(x, z);
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  // the bridges: a deck across the water, ramps down at each end
  for (const b of BRIDGES) {
    const zl = Math.min(b.z0, b.z1), zh = Math.max(b.z0, b.z1);
    const along = Math.max(zl - z, z - zh, 0), k = smoothstep(5.5, 4.2, Math.abs(x - b.x)) * smoothstep(40, 0, along);
    if (k > 0) h += (Math.max(h, DECK - along * 0.12) - h) * k;
  }
  // the ore railway's shelf, blasted down to its grade out of the mountainside — except where it runs in a tunnel (on low
  // ground it lies on the ground: no embankment across the roads)
  if (x > RAIL_X0 && h > GRADE && h < GRADE + 14) {
    const rd = Math.abs(z - railZ(x));
    if (rd < 9) h += (GRADE - h) * smoothstep(9, 4, rd);
  }
  return h;
}
/** Is the line in a tunnel at x (the mountain stands more than 14 m over its grade)? */
const tunnel = (x: number) => ground(x, railZ(x)) > GRADE + 14;

/** Birch and pine in the valleys and on the lower slopes (sight through them: systems/VisibilitySystem.js). */
const woods = gridCache((x: number, z: number) => smoothstep(0.05, 0.18, fbm(noise, x * 0.008 + 3, z * 0.008, 2)) * smoothstep(30, 18, height(x, z)) * smoothstep(8, 16, roadDist(x, z)) * 0.7, BOUNDS);

/** Up in the mountains, knee-deep in snow on the slopes: everyone goes slowly (and routes keep to the valleys). */
const mountC = gridCache((x: number, z: number) => mountK(x, z), BOUNDS);
const soft = (x: number, z: number) => 1 - 0.85 * smoothstep(0.2, 0.7, mountC(x, z)); // (a crawl up the massifs: the routes find the valleys)

const fjord = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false, // (water that stops, as a river's does: a land battle — world/Sea.js answers the rest)
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x24363e, roughness: 0.1, metalness: 0.35, transparent: true, opacity: 0.92 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    water.userData.noAO = true;
    scene.add(water);
    this.waterMesh = water;
  },
};

export default {
  id: 'narvik',
  name: 'Narvik',
  description: 'The ore port in winter, between the Rombaksfjord and the Beisfjord: steep mountains straight out of the water, the E6 over two bridges, the ore railway through its tunnels. Whoever holds the bridges holds the town.',
  epochs: ['1985'],
  region: 'north',
  airfields: [], // (no flat strip between the fjords and the fells: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (Brigade Nord and the US Marines' reinforcement for Norway against the Soviet Army)
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  climate: 'winter',
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  steep: 0.6, // (vehicles: the valleys or nothing)
  soft,
  river: fjord,
  woods,

  theme: {
    // a short grey Arctic day, cloud on the tops
    fogColor: 0xb0bac4, fogDensity: 0.0011,
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
        if (onBridge(x, z)) return [0x6a6a6a, 0.95];                                      // the deck
        if (roadDist(x, z) < 4.5) return [0xa4a098, 0.85];                                 // the ploughed E6
        if (x > RAIL_X0 && Math.abs(z - railZ(x)) < 3 && !tunnel(x)) return [0x4e4a44, 0.9]; // ballast
        if (y < 1.2 && fjordD(x, z) < 6) return [0x5a5a54, 0.8];                          // the dark shore, below the tide's reach of snow
        if (y > 9) return [0xe4e8ec, smoothstep(-0.35, 0.25, noise(x * 0.025, z * 0.025)) * smoothstep(9, 20, y) * 0.8]; // snow on the mountainsides, the steepest rock bare
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
    fjord.build(scene);
    const free = (x: number, z: number, r = 9) => roadDist(x, z) > r && fjordD(x, z) > 6 && Math.abs(z - railZ(x)) > 8 && terrain.heightAt(x, z) < 14;

    // ---- Narvik: wooden and concrete town houses on the slope above the shore roads (each block its own), the church
    // up the hill to the south, the town hall to the north
    props.rand = mulberry32(1985_41);
    const r0 = props.rand;
    for (let gx = -150; gx <= 150; gx += 21) for (const gz of [-74, -52, -30, 36, 58, 80]) {
      const x = gx + (r0() - 0.5) * 5, z = gz + (r0() - 0.5) * 5;
      if (Math.abs(gx) < 20 || !free(x, z, 8) || r0() < 0.2) continue;
      if (r0() < 0.3) props.ruinBlock({ x, z, yaw: 0, width: 16, depth: 10, storeys: 3, ruin: 0, name: 'apartment block' });
      else props.townHouse({ x, z, yaw: gz < 0 ? 0 : Math.PI, width: 8 + r0() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0.05 });
    }
    props.church({ x: -40, z: 96, yaw: Math.PI });
    props.townHouse({ x: 48, z: -96, yaw: 0, width: 20, depth: 12, storeys: 3, name: 'town hall', damaged: 0 });
    // ---- the LKAB ore port: the piers out into the Rombaksfjord, the loaders, the ore silos, ore trains on the sidings
    for (const px of [-320, -250, -180]) {
      for (let z = -108; z > -150; z -= 6) props.box('stone', px, 3, z, 10, 6, 6.2, 0, 0x6a6864); // the pier on its pilings
      props.conveyor({ x0: px, z0: -70, y0: 10, x1: px, z1: -140, y1: 18 });
    }
    props.tanks({ x: -280, z: -40, yaw: 0, count: 4, radius: 6, height: 22, color: 0x7a6a5e });
    props.hall({ x: -200, z: -20, yaw: 0, width: 40, depth: 16, height: 12, color: 0x5e5450, roof: 0x3a3a3c, door: 10, name: 'ore crushing plant' });
    for (let i = 0; i < 8; i++) props.wagon({ x: -300 + i * 11, z: railZ(-300 + i * 11), yaw: Math.PI / 2, kind: 'open', color: 0x4a2e22 });
    props.headframe({ x: -150, z: -62, yaw: 0, height: 26 }); // (the loading tower over the sidings)

    // ---- the ore railway east for Sweden: rails on its shelf, portals where it goes into the rock
    let inTunnel = tunnel(RAIL_X0), x0 = RAIL_X0;
    for (let x = RAIL_X0; x <= bounds.x + 60; x += 4) {
      const t = tunnel(x);
      if (t !== inTunnel || x >= bounds.x + 60) {
        if (!inTunnel && x - x0 > 6) for (let a = x0; a < x; a += 24) props.rails({ x0: a, z0: railZ(a), x1: Math.min(x, a + 24), z1: railZ(Math.min(x, a + 24)) });
        if (x < bounds.x + 60) { // a portal: dark mouth, concrete face
          const z = railZ(x);
          props.box('stone', x, GRADE + 3.5, z, 1.5, 7, 9, 0, 0x8a8a84);
          props.box('plain', x + (t ? 0.9 : -0.9), GRADE + 2.6, z, 0.3, 5.2, 5, 0, 0x0c0b0a);
        }
        inTunnel = t; x0 = x;
      }
    }

    // ---- the bridges: deck, rails, the towers of the suspension spans
    for (const b of BRIDGES) {
      const zl = Math.min(b.z0, b.z1), zh = Math.max(b.z0, b.z1), mid = (zl + zh) / 2;
      props.box('plain', b.x, DECK - 0.2, mid, 10, 0.6, zh - zl, 0, 0x707070);
      for (const s of [-1, 1]) props.box('plain', b.x + s * 4.8, DECK + 0.6, mid, 0.2, 1, zh - zl, 0, 0x8a8a8a);
      for (const tz of [zl + 40, zh - 40]) for (const s of [-1, 1]) props.box('stone', b.x + s * 5.6, DECK + 14, tz, 1.4, 28, 1.4, 0, 0x9a9a96);
      for (let z = zl; z < zh; z += 12) props.box('stone', b.x, -6, z + 6, 7, 26, 3, 0, 0x7a7a74); // the piers down into the fjord
    }

    // ---- villages round the other points, boathouses on the shores, wrecks by the roads (each half its own dice)
    for (const p of points) {
      if (!'ABCIJK'.includes(p.id)) continue;
      buildVillage(props, p, 9700 + Math.round(p.x * 3 + p.z), 1);
    }
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_42 + m);
      const r = props.rand, flip = 0;
      for (let i = 0; i < 60; i++) {
        const x = (r() * 2 - 1) * 480, z = (20 + r() * 520) * m;
        if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 30) || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || onBridge(x, z) || terrain.heightAt(x, z) > 16) continue;
        const fd = fjordD(x, z), rd = roadDist(x, z);
        if (fd > 4 && fd < 14 && rd > 10 && Math.abs(z - railZ(x)) > 10) props.hall({ x, z, yaw: Math.atan2(x, z) + flip, width: 10, depth: 6, height: 4, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'boathouse' });
        else if (rd > 7 && rd < 12 && fd > 6) (r() < 0.5 ? props.wreckCar({ x, z, yaw: r() * 6 + flip }) : props.boulder({ x, z, radius: 1.3 + r() }));
      }
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 34 }, { x: 0, z: -BASE_Z, r: 34 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || fjordD(x, z) < 3 || (x > RAIL_X0 && Math.abs(z - railZ(x)) < 6) || (Math.abs(x) < 160 && Math.abs(z) < 90) }];
    // birch and pine on the lower slopes, none above the tree line (maxY)
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0, autumn: 1, size: 0.8, maxY: 34,
      forest: woods });
    cover.finalize(bounds);
    const ground2 = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.6 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground2.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
