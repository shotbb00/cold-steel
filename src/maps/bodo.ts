// Bodø, winter 1985 (the big field, 1.0 × 1.12 km): NATO's air base and headquarters town on the Northern Flank —
// Bodø Main Air Station with its F-16s and the NATO and Norwegian command bunkers in the rock — under a Soviet
// thrust come down from the north. Whoever holds Bodø holds the air over all of Nordland, so a Soviet drive through
// Finnmark and Troms would have had to end here. On the map: the town on its point, rebuilt in concrete after 1940,
// and its harbour on the open sea (Vestfjorden, the west edge); Keiservarden, the mountain over the town; two fjord
// arms across the map — the Saltfjord to the south with the Saltstraumen narrows (the world's strongest tidal
// current) under the Saltstraumen bridge, and Mistfjorden to the north with the RV80 bridge at Løding; snow-covered
// fells round the edges; birch and pine low down. NATO (Brigade Nord's Norwegians and the US Marines flown in for
// Norway) holds the air station in the south (+z), the Soviet Army comes down the road from Fauske in the north (-z).
// (Compressed and turned: the real air station lies just west of the town, Saltstraumen 30 km south-east, the Fauske
// road east along the Saltfjord; Mistfjorden really opens to the sea in the west — here it reaches in from the east.)
// Fairness: not a mirror — the sea is only on the west edge, Saltstraumen is a narrows and Mistfjorden broad,
// Keiservarden stands east of the town, the fells and woods are each half's own — but each fjord arm cuts across
// one side's way in and each has one bridge and a way round its head (Saltstraumen west and Mørkved east for NATO,
// Mjelle west and Løding east for the Soviets), so both sides have the same two kinds of route to the town at about
// the same distances; the town, the harbour and Keiservarden sit on the middle line, and each side has a strip for
// its aircraft behind its line (measured: tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildVillage, commandPost } from './common.js';
import { flats } from './common2027.js';
import { segDist } from './arctic2027.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const DECK = 7; // the bridges' decks over the water
const noise = createNoise2D(1985_51);

// ---- the water: the open sea on the west edge (the harbour's bight at the town), the Saltfjord in from it across
// the south with the Saltstraumen narrows, Mistfjorden in from the east edge across the north
const coastX = (z: number) => -455 + 10 * Math.sin(z * 0.013) + 70 * Math.exp(-((z / 70) ** 2));
const SALT_HEAD = 200, MIST_HEAD = -180, NARROWS = -300, LODING = 330;
const saltZ = (x: number) => 170 + 10 * Math.sin(x * 0.01);
const saltW = (x: number) => 46 + 4 * Math.sin(x * 0.02) - 24 * Math.exp(-(((x - NARROWS) / 45) ** 2));
const mistZ = (x: number) => -170 + 9 * Math.sin(x * 0.012 + 1);
const mistW = (x: number) => 44 + 3 * Math.sin(x * 0.017 + 2) - 12 * Math.exp(-(((x - LODING) / 50) ** 2));
const saltD = (x: number, z: number) => Math.hypot(Math.max(0, x - SALT_HEAD), z - saltZ(x)) - saltW(Math.min(x, SALT_HEAD));
const mistD = (x: number, z: number) => Math.hypot(Math.max(0, MIST_HEAD - x), z - mistZ(x)) - mistW(Math.max(x, MIST_HEAD));
/** Metres from the water (negative: on it). */
const waterD = (x: number, z: number) => Math.min(x - coastX(z), saltD(x, z), mistD(x, z));

const BRIDGES = [{ x: NARROWS, w: saltW(NARROWS), c: saltZ(NARROWS), name: 'Saltstraumen bridge' }, { x: LODING, w: mistW(LODING), c: mistZ(LODING), name: 'Løding bridge' }]
  .map((b) => ({ ...b, z0: b.c - b.w - 16, z1: b.c + b.w + 16 }));
const onBridge = (x: number, z: number) => BRIDGES.some((b) => Math.abs(x - b.x) < 7 && z > b.z0 && z < b.z1);

// ---- the roads, each half its own. South: from the air station to Hunstad, west over the Saltstraumen bridge to the
// harbour, east round the Saltfjord's head by Mørkved to Keiservarden; north: the Fauske road to Hopen, west round
// Mistfjorden's head by Mjelle to the harbour, east over the Løding bridge to Keiservarden; the shore road through town
const B0 = BRIDGES[0], B1 = BRIDGES[1];
const ROADS: number[][][] = [
  [[0, 560], [0, 470], [20, 385], [-40, 300]],                         // from the air station's gate to Hunstad
  [[-40, 300], [-180, 280], [-300, 222], [-300, B0.z1]],                // west to Saltstraumen
  [[-300, B0.z0], [-300, 110], [-325, 60], [-340, 10]],                 // over the bridge, down to the harbour
  [[20, 385], [190, 340], [330, 255]],                                  // east to Mørkved
  [[330, 255], [355, 120], [300, 40], [250, -30]],                      // round the Saltfjord's head, up to Keiservarden
  [[-340, 10], [-200, 22], [-50, 15], [100, 15], [185, 35], [250, -30]],            // the shore road through Bodø
  [[0, -560], [0, -470], [-20, -390], [55, -305]],                      // the Fauske road to Hopen
  [[55, -305], [-200, -300], [-370, -235]],                             // west to Mjelle
  [[-370, -235], [-395, -110], [-340, 10]],                             // round Mistfjorden's head, down to the harbour
  [[55, -305], [200, -300], [330, -252], [330, B1.z0]],                 // east to Løding
  [[330, B1.z1], [330, -110], [250, -30]],                              // over the bridge, up to Keiservarden
  [[60, -80], [160, -108], [330, -108]],                                // the shore track under Keiservarden, the town to the Løding bridge
];
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Bodø Main Air Station', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Saltstraumen', x: -300, z: 215, owner: null, sector: 'west', radius: 22 },
  { id: 'C', name: 'Hunstad', x: -40, z: 300, owner: null, sector: 'centre' },
  { id: 'D', name: 'Mørkved', x: 330, z: 255, owner: null, sector: 'east' },
  { id: 'E', name: 'Bodø harbour', x: -340, z: 10, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Bodø', x: -50, z: 15, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Keiservarden', x: 250, z: -30, owner: null, sector: 'east', radius: 26 },
  { id: 'H', name: 'Mjelle', x: -370, z: -235, owner: null, sector: 'west' },
  { id: 'I', name: 'Hopen', x: 55, z: -305, owner: null, sector: 'centre' },
  { id: 'J', name: 'Løding', x: 330, z: -245, owner: null, sector: 'east', radius: 22 },
  { id: 'K', name: 'Fauske road', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// each side's airfield (systems/Airfields.js): Bodø Main Air Station's runway behind NATO's line, a strip the Soviets
// grade on the Fauske road flats behind theirs — the runway 55 m behind the tower, graded flat and kept clear
const AIR = [{ faction: 'nato', x: -240, z: 400, yaw: Math.PI / 2, large: false, name: 'Bodø Main Air Station' }, { faction: 'pact', x: 230, z: -405, yaw: -Math.PI / 2, large: false }];
const STRIPS = AIR.map((a) => ({ x: a.x, z: a.z + (a.faction === 'nato' ? 55 : -55) }));
const onAir = (x: number, z: number, m = 0) => AIR.some((a, i) => Math.abs(x - a.x) < 125 + m && Math.abs(z - (a.z + STRIPS[i].z) / 2) < 50 + m);
/** The air station's own long runway (painted on west and east of the game's strip, which lies on its middle). */
const onRunway = (x: number, z: number) => Math.abs(z - STRIPS[0].z) < 21 && x > -470 && x < -60;

/** Low ground: the valleys the roads take, round the points, the shore shelves, the strips. 0 there, 1 up in the fells. */
function mountK(x: number, z: number) {
  let d = roadDist(x, z) - 10;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 50);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x, z - bz) - 70);
  d = Math.min(d, Math.max(Math.abs(x + 150) - 250, Math.abs(z) - 95)); // the town, on its low point between the fjords
  AIR.forEach((a, i) => { d = Math.min(d, Math.max(Math.abs(x - a.x) - 135, Math.abs(z - (a.z + STRIPS[i].z) / 2) - 60)); }); // the strips
  d = Math.min(d, Math.max(Math.abs(x + 270) - 210, Math.abs(z - STRIPS[0].z) - 35)); // the long runway
  return smoothstep(15, 95, d);
}
const rawMt = (x: number, z: number) => ridged(noise, x * 0.006 + 5, z * 0.006, 4) * 60 + fbm(noise, x * 0.002, z * 0.002, 2) * 26;
// the fells, each half its own (Løpsfjellet and the Hunstad hills south; Mjellefjellet and the ridge over Hopen north);
// Keiservarden itself over the town on the middle line: [x, z, r, m]
const MASSIFS = [[320, 420, 90, 30], [-150, 245, 60, 18], [-220, -430, 110, 30], [-30, -200, 60, 18], [165, -75, 70, 40]];
const massif = (x: number, z: number) => MASSIFS.reduce((h, [cx, cz, r, a]) => h + a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r)), 0);

function ground(x: number, z: number) {
  const fd = waterD(x, z);
  if (fd < 0) return Math.max(-16, 0.8 + fd * 0.5);                                   // the fjords: steep-sided and deep
  const lowland = 2.2 + Math.min(fd, 60) * 0.04 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.6 + fbm(noise, x * 0.004, z * 0.004, 2) * 3;
  const mt = Math.max(0, rawMt(x, z) * 0.8 + 18 + massif(x, z)) * mountK(x, z) * smoothstep(0, 30, fd);
  let h = lowland + mt;
  h += 14 * Math.exp(-((x - 245) ** 2 + (z + 25) ** 2) / (130 * 130)) * smoothstep(0, 40, fd); // Keiservarden's shoulder: the road climbs to it
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 120, x) * 60 * (1 + 0.5 * fbm(noise, x * 0.004 + 77, z * 0.006, 2)) * smoothstep(0, 40, fd); // the fells on the east edge
  h += smoothstep(BOUNDS.z - 20, BOUNDS.z + 120, Math.abs(z)) * 40 * smoothstep(0, 40, fd);
  for (const s of STRIPS) h += (5 - h) * smoothstep(60, 22, Math.abs(z - s.z)) * smoothstep(175, 135, Math.abs(x - s.x)); // the strips graded flat
  h += (5 - h) * smoothstep(50, 24, Math.abs(z - STRIPS[0].z)) * smoothstep(-500, -470, x) * smoothstep(-30, -60, x) * smoothstep(0, 20, fd); // the long runway
  return h;
}
function height(x: number, z: number) {
  let h = ground(x, z);
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  // the bridges: a deck across the water, ramps down at each end
  for (const b of BRIDGES) {
    const along = Math.max(b.z0 - z, z - b.z1, 0), k = smoothstep(8.5, 7, Math.abs(x - b.x)) * smoothstep(40, 0, along);
    if (k > 0) h += (Math.max(h, DECK - along * 0.12) - h) * k;
  }
  return h;
}

/** Birch and pine in the valleys and on the lower slopes (sight through them: systems/VisibilitySystem.js). */
const woods = gridCache((x: number, z: number) => smoothstep(0.05, 0.18, fbm(noise, x * 0.008 + 3, z * 0.008, 2)) * smoothstep(30, 18, height(x, z))
  * smoothstep(8, 16, roadDist(x, z)) * (onAir(x, z, 20) || onRunway(x, z) ? 0 : 1) * 0.7, BOUNDS);

/** Up in the fells, knee-deep in snow on the slopes: everyone goes slowly (and routes keep to the valleys). */
const mountC = gridCache((x: number, z: number) => mountK(x, z), BOUNDS);
const soft = (x: number, z: number) => 1 - 0.85 * smoothstep(0.2, 0.7, mountC(x, z));

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
  id: 'bodo',
  name: 'Bodø',
  description: 'NATO’s air base town on the Northern Flank in winter 1985: Bodø and its harbour under Keiservarden, the main air station’s runway, the Saltstraumen narrows and bridge, Mistfjorden and the road north to Fauske. Snow-covered fells, every way in a bridge or a fjord head.',
  epochs: ['1985'],
  region: 'north',
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (Brigade Nord and the US Marines flown in for Norway against the Soviet Army)
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  climate: 'winter',
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985_51,
  height,
  steep: 0.6, // (vehicles: the valleys or nothing)
  soft,
  river: fjord,
  woods,
  airfields: AIR,

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
        if (roadDist(x, z) < 4.5) return [0xa4a098, 0.85];                                 // the ploughed roads
        if (onRunway(x, z)) return [0x6a6a6c, 0.9];                                        // the air station's runway, swept
        if (y < 1.2 && waterD(x, z) < 6) return [0x5a5a54, 0.8];                          // the dark shore, below the tide's reach of snow
        if (y > 9) return [0xe4e8ec, smoothstep(-0.35, 0.25, noise(x * 0.025, z * 0.025)) * smoothstep(9, 20, y) * 0.8]; // snow on the fellsides, the steepest rock bare
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
    const free = (x: number, z: number, r = 9) => roadDist(x, z) > r && waterD(x, z) > 6 + r * 0.5 && !onAir(x, z, r) && !onRunway(x, z) && terrain.heightAt(x, z) < 16;

    // ---- Bodø: the town rebuilt after 1940 in concrete — blocks of flats along the shore road, town houses up the
    // slope behind, the cathedral, the town hall
    props.rand = mulberry32(1985_52);
    const r0 = props.rand;
    for (let gx = -300; gx <= 110; gx += 22) for (const gz of [-75, -50, 50, 75]) {
      const x = gx + (r0() - 0.5) * 5, z = gz + (r0() - 0.5) * 5;
      if (Math.abs(gx + 50) < 24 || !free(x, z, 9) || r0() < 0.2) continue;
      if (r0() < 0.35) flats(props, { x, z, yaw: 0, storeys: 3 + Math.floor(r0() * 2), width: 18, depth: 10 });
      else props.townHouse({ x, z, yaw: gz < 0 ? 0 : Math.PI, width: 8 + r0() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0.05 });
    }
    props.church({ x: -110, z: 62, yaw: Math.PI }); // Bodø domkirke
    props.townHouse({ x: 10, z: -60, yaw: 0, width: 22, depth: 12, storeys: 3, name: 'town hall', damaged: 0 });

    // ---- the harbour: quays out into the bight on their pilings, the fish plant, the oil tanks, a stranded coaster
    for (const [qz, len] of [[-35, 44], [45, 36]] as [number, number][]) {
      const qx0 = coastX(qz) + 4;
      for (let x = qx0; x > qx0 - len; x -= 6) props.box('stone', x, 1.5, qz, 6.2, 3, 9, 0, 0x6a6864);
    }
    props.hall({ x: -375, z: 78, yaw: 0, width: 30, depth: 14, height: 8, color: 0xb8b4a6, roof: 0x8a2e26, door: 8, name: 'fish plant' });
    props.tanks({ x: -315, z: -82, yaw: 0, count: 3, radius: 5, height: 9, color: 0xaaa89e });
    props.box('plain', coastX(-5) - 30, 1.2, -5, 9, 4, 42, 0.2, 0x3a3e44); // (the coaster's hull, sunk at her mooring)
    props.box('plain', coastX(-5) - 30, 4.6, 5, 7, 3, 9, 0.2, 0xd8d6cc);

    // ---- Bodø Main Air Station (west of the game's tower and hangars — systems/Airfields.js lays those): the
    // hardened shelters of 331 and 334 Squadrons along the taxiway, the old hangars, the mountain hall's doors
    for (const x of [-430, -395]) props.aircraftShelter({ x, z: 395, yaw: 0 });
    for (const x of [-60, -20]) props.aircraftShelter({ x, z: 410, yaw: 0 });
    props.hall({ x: -430, z: 520, yaw: 0, width: 40, depth: 30, height: 13, color: 0x7a7e7a, roof: 0x4a4e52, door: 26, name: 'hangar' });
    props.mast({ x: -470, z: 360, height: 26 });

    // ---- the bridges: deck, rails, the piers and (Saltstraumen) the concrete arch
    for (const b of BRIDGES) {
      const mid = (b.z0 + b.z1) / 2, len = b.z1 - b.z0;
      props.box('plain', b.x, DECK - 0.2, mid, 14, 0.6, len, 0, 0x707070);
      for (const s of [-1, 1]) props.box('plain', b.x + s * 6.8, DECK + 0.6, mid, 0.2, 1, len, 0, 0x8a8a8a);
      for (let z = b.z0 + 16; z < b.z1 - 10; z += 14) props.box('stone', b.x, -5, z, 7, 22, 2.5, 0, 0x7a7a74);
    }
    for (let i = 0; i <= 12; i++) { // Saltstraumen's arch under the deck
      const t = i / 12, z = B0.c - B0.w + t * 2 * B0.w, y = DECK - 1 - (1 - Math.sin(t * Math.PI)) * 7;
      props.box('stone', B0.x, y, z, 6, 1.4, 2 * B0.w / 12 + 0.6, 0, 0x9a9a94);
    }
    // the maelstrom: white rings turning on the current below the narrows
    props.rand = mulberry32(1985_53);
    for (let i = 0; i < 7; i++) {
      const x = NARROWS - 30 - props.rand() * 70, z = saltZ(x) + (props.rand() - 0.5) * 40, R = 4 + props.rand() * 6;
      props.push('plain', new THREE.RingGeometry(R, R + 1.2, 20).rotateX(-Math.PI / 2), new THREE.Matrix4().makeTranslation(x, 0.08, z), 0xdfe6ea);
    }

    // ---- villages round the other points (each its own dice), boathouses on the shores, wrecks by the roads
    for (const p of points) {
      if (!'ACDHIJK'.includes(p.id)) continue;
      buildVillage(props, p, 5100 + Math.round(p.x * 3 + p.z), 1);
    }
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_54 + m);
      const r = props.rand;
      for (let i = 0; i < 60; i++) {
        const x = (r() * 2 - 1) * 480, z = (20 + r() * 520) * m;
        if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 30) || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || onAir(x, z, 10) || onRunway(x, z) || terrain.heightAt(x, z) > 16) continue;
        if (BRIDGES.some((b) => Math.abs(x - b.x) < 16 && z > b.z0 - 40 && z < b.z1 + 40)) continue;
        const fd = waterD(x, z), rd = roadDist(x, z);
        if (fd > 4 && fd < 14 && rd > 10) props.hall({ x, z, yaw: Math.atan2(x, z), width: 10, depth: 6, height: 4, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'boathouse' });
        else if (rd > 7 && rd < 12 && fd > 6) (r() < 0.5 ? props.wreckCar({ x, z, yaw: r() * 6 }) : props.boulder({ x, z, radius: 1.3 + r() }));
      }
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 34 }, { x: 0, z: -BASE_Z, r: 34 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || waterD(x, z) < 3 || onAir(x, z, 10) || onRunway(x, z) || (x > -330 && x < 120 && Math.abs(z) < 95) }];
    // birch and pine on the lower slopes, none above the tree line (maxY)
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0, autumn: 1, size: 0.8, maxY: 34, forest: woods });
    cover.finalize(bounds);
    const ground2 = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.6 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground2.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
