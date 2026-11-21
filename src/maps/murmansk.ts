// Murmansk, winter 1985 (the big field, 1.0 × 1.12 km): the approaches to the Soviet Northern Fleet’s home on the Kola
// Peninsula, where NATO’s counterstroke out of Norway would have had to go — the way the Germans tried in 1941 and
// stopped on the Litsa. The map is turned: real north (the Barents Sea, Severomorsk, Polyarny) is the east edge, real
// south (Kola, the lakes) the west edge; the Kola Bay’s west shore is the south half (+z), its east shore — the city —
// the north half (-z). Across the middle: the Kola Bay, ice-free all winter thanks to the Gulf Stream, broad in the
// east and narrowing to its head; the Tuloma coming in from the west, held by the Nizhne-Tulomskaya dam at Murmashi.
// On the map: NATO (Brigade Nord with the US Marines’ 4th MAB) comes down the Pechenga road from Shonguy; the Soviets
// hold Safonovo (Severomorsk-1, the Fleet’s air base). The west bank: Murmashi with the airport’s edge, Kildinstroy on
// the Kola road, the Abram-Mys repair yard on the bay. The crossings: the Nizhne-Tulomskaya dam, the Tuloma bridge and
// the bridge at the bay head by Kola. The city side: Khrushchyovka blocks on the hills over Semyonovskoye lake under the
// Alyosha memorial, Murmansk’s centre and the port’s cranes, the Rosta naval yards on the Murmansk–Severomorsk road.
// Fairness: not a mirror — the Tuloma winds its own way and the bay is wide in the east and narrow in the west, NATO’s
// big hill is in the east by Abram-Mys and the Soviets’ (the Green Cape over Semyonovskoye) in the west — but each side
// has its own shore, the same three crossings to share (dam, bridge, bay head, none of them closer to either base),
// a town, a road village and a yard on the bay at the same reach of road, a big hill and a low rise of its own, and a
// strip for its aircraft behind its line: Murmashi for NATO, Safonovo for the Soviets (measured: tools/map_fairness.py).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { flats } from './common2027.js';
import { gridCache } from './gridCache.js';
import { segDist, arcticTheme, snowSurface, snowSoft, woodenVillage, roadside, taiga } from './arctic2027.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const DECK = 6.5;
const noise = createNoise2D(1985_91);

// ---- the water across the middle: the Tuloma in the west, opening east of the bay head into the Kola Bay
const waterZ = (x: number) => -0.03 * x + 14 * Math.sin(x * 0.009 + 0.4) + 5 * Math.sin(x * 0.025) - 2;
const waterW = (x: number) => 13 + 2 * Math.sin(x * 0.02 + 1) + 160 * Math.max(0, Math.min(1, x / 450)) ** 0.9;
/** Metres from the water (negative: on it). */
const waterD = (x: number, z: number) => Math.abs(z - waterZ(x)) * 0.95 - waterW(x);
/** z of each shore road (s = 1 the west shore, NATO’s; -1 the city shore). */
const shoreZ = (x: number, s: number) => waterZ(x) + s * (waterW(x) + 58);
const BRIDGES = [{ x: -380, name: 'Nizhne-Tulomskaya dam' }, { x: -180, name: 'Tuloma bridge' }, { x: -30, name: 'Kola bridge' }]
  .map((b) => ({ ...b, z0: waterZ(b.x) - waterW(b.x) - 16, z1: waterZ(b.x) + waterW(b.x) + 16 }));
const onBridge = (x: number, z: number) => BRIDGES.some((b) => Math.abs(x - b.x) < 7 && z > b.z0 && z < b.z1);

// ---- the roads: the Kola road down the middle over the bay-head bridge, a road up the west flank over the dam, a
// road out to each yard on the bay, a road along each shore (the city one is the Murmansk–Severomorsk road)
const shoreRoad = (s: number) => { const l: number[][] = []; for (let x = -380; x <= 580; x += 40) l.push([x, shoreZ(x, s)]); return l; };
const DZ = shoreZ(300, 1), JZ = shoreZ(290, -1);
const ROADS: number[][][] = [
  [[0, 560], [0, 470], [25, 360], [-10, 250], [-20, 160], [-30, 95], [-30, -95], [-45, -160], [-35, -250], [10, -370], [0, -470], [0, -560]], // the Kola road
  [[25, 360], [-170, 345], [-330, 300], [-360, 190], [-380, 95], [-380, -95], [-370, -180], [-340, -300], [-180, -340], [10, -370]],         // west: Murmashi, the dam, Semyonovskoye
  [[25, 360], [170, 330], [300, DZ]],                                                                                                        // to Abram-Mys
  shoreRoad(1),
  shoreRoad(-1),
  [[10, -370], [150, -330], [290, JZ]],                                                                                                      // to Rosta
  [[-180, shoreZ(-180, 1)], [-180, shoreZ(-180, -1)]],                                                                                       // over the Tuloma bridge
];
function roadDist(x: number, z: number) {
  let d = Infinity;
  for (const l of ROADS) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1]));
  return d;
}
/** x of a road at z (its first stretch that spans z). */
const polyX = (l: number[][], z: number) => {
  for (let i = 0; i < l.length - 1; i++) { const [x0, z0] = l[i], [x1, z1] = l[i + 1]; if ((z - z0) * (z - z1) <= 0 && z0 !== z1) return x0 + (x1 - x0) * (z - z0) / (z1 - z0); }
  return l[0][0];
};
const mainDist = (x: number, z: number) => { let d = Infinity; const l = ROADS[0]; for (let i = 0; i < l.length - 1; i++) d = Math.min(d, segDist(x, z, l[i], l[i + 1])); return d; };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Shonguy', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Murmashi', x: -330, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Kildinstroy', x: -10, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Abram-Mys', x: 300, z: DZ, owner: null, sector: 'east' },
  { id: 'E', name: 'Nizhne-Tulomsky', x: -380, z: waterZ(-380), owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Tuloma bridge', x: -180, z: waterZ(-180), owner: null, sector: 'centre', radius: 24 },
  { id: 'G', name: 'Kola bridge', x: -30, z: waterZ(-30), owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Semyonovskoye', x: -340, z: -300, owner: null, sector: 'west', radius: 30 },
  { id: 'I', name: 'Murmansk', x: -35, z: -250, owner: null, sector: 'centre', radius: 30 },
  { id: 'J', name: 'Rosta', x: 290, z: JZ, owner: null, sector: 'east' },
  { id: 'K', name: 'Safonovo', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

// each side's airfield (systems/Airfields.js): the edge of Murmashi airport for NATO, Severomorsk-1 at Safonovo for
// the Soviets — the runway 55 m behind the tower, graded flat and kept clear
const AIR = [{ faction: 'nato', x: -200, z: 400, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: 200, z: -395, yaw: -Math.PI / 2, large: false }];
const STRIPS = AIR.map((a) => ({ x: a.x, z: a.z + (a.faction === 'nato' ? 55 : -55) }));
const onAir = (x: number, z: number, m = 0) => AIR.some((a, i) => Math.abs(x - a.x) < 125 + m && Math.abs(z - (a.z + STRIPS[i].z) / 2) < 50 + m);

const DRY = [...points.map((p) => [p.x, p.z, 55]), [0, BASE_Z, 70], [0, -BASE_Z, 70]];
const keepClear = (x: number, z: number) => {
  let k = smoothstep(10, 26, roadDist(x, z)) * smoothstep(6, 20, waterD(x, z));
  for (const [px, pz, r] of DRY) k = Math.min(k, smoothstep(r - 15, r + 15, Math.hypot(x - px, z - pz)));
  return Math.min(k, onAir(x, z, 30) ? 0 : 1);
};
const bogC = gridCache((x: number, z: number) => smoothstep(0.1, 0.22, fbm(noise, x * 0.006 + 323.3, z * 0.006 - 161.1, 3)) * keepClear(x, z), BOUNDS);
// birch scrub in the hollows and along the water, bare tundra on the tops (taiga's maxY)
const woodsK = (x: number, z: number) => (waterD(x, z) < 3 ? -1 : 1) * (fbm(noise, x * 0.008 + 708.2, z * 0.008 - 461.4, 3) > 0.02 ? 0.75 : 0.03)
  * smoothstep(6, 16, roadDist(x, z)) * (1 - 0.7 * bogC(x, z)) * (onAir(x, z, 15) ? 0 : 1)
  * Math.min(1, ...DRY.map(([px, pz, r]) => smoothstep(r * 0.55, r + 10, Math.hypot(x - px, z - pz))));
const woodsC = gridCache((x: number, z: number) => Math.max(0, woodsK(x, z)), BOUNDS);

// the hills, each half its own: NATO's big one by Abram-Mys (east) and a low rise (west); the Green Cape over
// Semyonovskoye (west) and a low rise over the port (east) on the city side; the smaller knolls by the bases
const RISES: [number, number, number, number][] = [[200, 230, 75, 20], [-150, 160, 55, 8], [190, 430, 60, 12],
  [-180, -170, 80, 20], [130, -170, 50, 8], [-170, -430, 60, 12]];

function ground(x: number, z: number) {
  const rd = waterD(x, z);
  if (rd < 0) return Math.max(x > 0 ? -7 : -3.5, 0.8 + rd * 0.35);                    // the river and the bay: deep in the middle
  let h = 12 + fbm(noise, x * 0.004, z * 0.004, 4) * 8 + fbm(noise, x * 0.03 + 9, z * 0.03, 2) * 0.8;
  for (const [cx, cz, r, a] of RISES) h += a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  h -= smoothstep(18, 5, roadDist(x, z)) * (h - 10) * 0.5;                            // the roads keep to the low ground
  h -= bogC(x, z) * 1.2;
  for (const s of STRIPS) h += (12 - h) * smoothstep(60, 20, Math.abs(z - s.z)) * smoothstep(170, 130, Math.abs(x - s.x)); // the strips graded flat
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 110, Math.abs(z)) * 14 + smoothstep(BOUNDS.x - 20, BOUNDS.x + 120, -x) * 20;
  for (const bz of [BASE_Z, -BASE_Z]) h += (12 - h) * smoothstep(40, 20, Math.hypot(x, z - bz));
  return 1.6 + (h - 1.6) * smoothstep(0, 70, rd);                                    // the banks down to the water
}
function height(x: number, z: number) {
  let h = ground(x, z);
  for (const b of BRIDGES) { // the decks across the water, ramps down at each end
    const along = Math.max(b.z0 - z, z - b.z1, 0), k = smoothstep(8.5, 7, Math.abs(x - b.x)) * smoothstep(30, 0, along);
    if (k > 0) h += (Math.max(h, DECK - along * 0.12) - h) * k;
  }
  return h;
}

const softV = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, false), BOUNDS);
const softF = gridCache((x: number, z: number) => snowSoft(roadDist, bogC)(x, z, true), BOUNDS);

const water = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false, // (the river and the bay: water that stops — world/Sea.js answers the rest)
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x26363e, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
    this.waterMesh = m;
  },
};

export default {
  id: 'murmansk',
  name: 'Murmansk',
  description: 'The approaches to Murmansk, home of the Soviet Northern Fleet, in winter 1985: the ice-free Kola Bay and the Tuloma across the middle, the city’s Khrushchyovka blocks on the hills, the port and the Rosta naval yards, Murmashi airport. Snowed-over tundra hills and birch scrub.',
  epochs: ['1985'],
  region: 'north',
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (Brigade Nord and the US Marines’ 4th MAB against the Soviet Army on Kola)
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  climate: 'winter', // whitewash and snow smocks (render/paint.js CLIMATE)
  conditions: { time: 'day', weather: 'overcast' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985_91,
  height,
  soft: (x: number, z: number, foot: boolean) => (foot ? softF : softV)(x, z),
  river: water,
  airfields: AIR,
  woods: (x: number, z: number) => woodsC(x, z) * 0.6, // (scrub: you see a little further through it)

  theme: arcticTheme({
    clouds: 0.75, sunIntensity: 1.25, fogDensity: 0.0012, skyTop: 0x62788e,
    terrain: {
      surface(x: number, z: number, y: number) {
        if (onBridge(x, z)) return [0x6a6a6a, 0.95];                                      // the decks
        if (y < 1.3 && waterD(x, z) < 6) return [0x6a6862, 0.8];                          // the dark stony shore
        return snowSurface(x, z, { road: roadDist(x, z), main: mainDist(x, z) < 4.5, ice: () => 0, bog: bogC, noise });
      },
    },
  }),

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
    const skip = (x: number, z: number, r: number) => roadDist(x, z) < 9 + r || waterD(x, z) < 6 + r || onAir(x, z, r)
      || BRIDGES.some((b) => Math.abs(x - b.x) < 14 + r && z > b.z0 - 30 && z < b.z1 + 30);
    const pt = (id: string) => points.find((p) => p.id === id)!;
    const blocks = (cx: number, cz: number, list: number[][], storeys = 5) => {
      for (const [dx, dz, yaw = 0] of list) if (!skip(cx + dx, cz + dz, 14)) flats(props, { x: cx + dx, z: cz + dz, yaw, storeys, width: 28, depth: 11, name: 'Khrushchyovka' });
    };
    // a yard on the bay at x along shore s: quays out into the water, a crane on each, a hull alongside
    const yard = (x0: number, x1: number, s: number, hull: number, sub: boolean) => {
      for (let x = x0, i = 0; x <= x1; x += 55, i++) {
        const sz = waterZ(x) + s * waterW(x), out = -s;           // the waterline, and the way out into the bay
        props.box('stone', x, 0.2, sz + out * 14, 12, 3.2, 36, 0, 0x6c6a64);
        // the crane: four legs on the quay, the cab and the jib out over the water
        for (const [lx, lz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) props.box('metal', x + lx, 7.8, sz + out * 22 + lz, 0.6, 12, 0.6, 0, 0x9a7a32);
        props.box('metal', x, 15, sz + out * 22, 8, 3, 6, 0, 0x9a7a32);
        props.box('metal', x + 10, 16.5, sz + out * 22, 22, 1, 1.2, 0, 0x9a7a32);
        if (i % 2 === 0) { // a hull alongside: a destroyer’s grey or a submarine’s black
          const k = sub && i % 4 === 0, hx = x + 16, hz = sz + out * 24;
          props.box('metal', hx, 0.6, hz, 7, 3.2, k ? 44 : 48, 0, k ? 0x1e2226 : hull);
          props.box('metal', hx, k ? 3.6 : 4.2, hz + (k ? -6 : 4), k ? 2.4 : 5, k ? 4 : 4.2, k ? 7 : 14, 0, k ? 0x1e2226 : hull);
          if (!k) props.mast({ x: hx, z: hz + 2, height: 10 });
        }
      }
    };

    // ---- Murmansk: five-storey blocks on the hill round the centre and down toward the port; the port on the bay
    const i0 = pt('I');
    props.rand = mulberry32(1985_92);
    blocks(i0.x, i0.z, [[55, -35, Math.PI / 2], [60, 15, Math.PI / 2], [-60, 25], [-60, -25], [10, 60], [25, -65], [-30, -75], [95, -70, Math.PI / 2], [-105, 0, Math.PI / 2]]);
    blocks(80, -150, [[0, 0], [45, 25, Math.PI / 2], [-40, 20], [60, -30]]);
    props.hall({ x: i0.x + 10, z: i0.z + 120, yaw: 0, width: 36, depth: 16, height: 11, color: 0x8a6e5a, roof: 0x3e4044, door: 8, name: 'fish combine' });
    yard(110, 220, -1, 0x6a7078, false);
    // ---- Semyonovskoye: blocks round the lake under the Green Cape, and the Alyosha memorial on its top
    const h = pt('H');
    props.rand = mulberry32(1985_93);
    blocks(h.x, h.z, [[50, -40, Math.PI / 2], [55, 10, Math.PI / 2], [45, 50, Math.PI / 2], [-50, 40], [-10, 65], [-55, -15]]);
    props.box('stone', -180, terrain.heightAt(-180, -170) + 2.5, -170, 10, 5, 10, 0, 0x7a7a72);
    props.box('stone', -180, terrain.heightAt(-180, -170) + 15, -170, 3.2, 20, 3.2, 0, 0x8a8a82);
    // ---- Rosta: the naval yards on the bay, their halls and a barracks behind; Safonovo's garrison
    const j = pt('J');
    props.rand = mulberry32(1985_94);
    for (const [dx, dz] of [[-70, -45], [0, -55], [70, -50]]) if (!skip(j.x + dx, j.z + dz, 18)) props.hall({ x: j.x + dx, z: j.z + dz, yaw: 0, width: 40, depth: 20, height: 14, color: 0x6e6a64, roof: 0x3e4044, door: 12, name: 'Rosta ship hall' });
    yard(230, 400, -1, 0x5e646c, true);
    for (const [dx, dz] of [[-70, 20], [70, 30], [-75, -30]]) props.hall({ x: dx, z: -BASE_Z + dz, yaw: 0, width: 30, depth: 10, height: 6, color: 0x7a7a6a, roof: 0x3a3a3a, door: 4, name: 'barracks' });
    // ---- Abram-Mys: the repair yard on the west shore, its halls and wooden houses; Shonguy's company post
    const d = pt('D');
    props.rand = mulberry32(1985_95);
    for (const [dx, dz] of [[-70, 45], [0, 55], [70, 50]]) if (!skip(d.x + dx, d.z + dz, 18)) props.hall({ x: d.x + dx, z: d.z + dz, yaw: 0, width: 36, depth: 18, height: 12, color: 0x746e66, roof: 0x3e4044, door: 10, name: 'Abram-Mys ship hall' });
    yard(250, 410, 1, 0x6a7078, false);
    for (const [dx, dz] of [[-65, -20], [65, -25]]) props.hall({ x: dx, z: BASE_Z + dz, yaw: 0, width: 26, depth: 10, height: 6, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'barracks' });
    // ---- Murmashi: a few blocks and the wooden village by the airport's edge
    const b0 = pt('B');
    blocks(b0.x, b0.z, [[55, -40, Math.PI / 2], [-55, -30]], 4);

    // ---- the crossings: the Nizhne-Tulomskaya power station on its dam, checkpoints at the Tuloma bridge, the old
    // Kola cathedral by the bay-head bridge, Soviet watchtowers along the city shore
    const e = pt('E');
    props.hall({ x: e.x + 45, z: e.z - 48, yaw: 0, width: 30, depth: 16, height: 12, color: 0x9a948a, roof: 0x3e4044, door: 6, name: 'Nizhne-Tulomskaya power station' });
    props.rand = mulberry32(1985_96);
    const f = pt('F');
    for (const [dx, dz] of [[-6, 50], [6, 56], [-6, -52], [6, -58]]) props.jersey({ x: f.x + dx, z: f.z + dz, yaw: 0.1, length: 5 });
    const g = pt('G');
    props.church({ x: g.x + 45, z: g.z + 50, yaw: Math.PI / 2 });
    for (const tx of [-280, -100, 80]) { const tz = waterZ(tx) - waterW(tx) - 22; if (!skip(tx, tz, 2)) props.tower({ x: tx, z: tz }); }

    // ---- the villages on the west bank
    for (const id of 'BC') {
      const p = pt(id);
      props.rand = mulberry32(9100 + Math.round(p.x * 3 + p.z));
      woodenVillage(props, p, { n: id === 'C' ? 6 : 5, big: false, skip });
    }
    roadside(props, 1985_97, { along: (k: number, z: number) => [polyX(ROADS[k % 2], z)], points, road: (x: number, z: number) => (skip(x, z, 0) ? 0 : roadDist(x, z)), ice: () => 0, bases: [this.bases.nato, this.bases.pact] });

    // ---- the bridges: deck, rails, piers; the dam a wall of concrete under the west one
    for (const b of BRIDGES) {
      const mid = (b.z0 + b.z1) / 2, len = b.z1 - b.z0;
      props.box('plain', b.x, DECK - 0.2, mid, 14, 0.6, len, 0, 0x707070);
      for (const s of [-1, 1]) props.box('plain', b.x + s * 6.8, DECK + 0.6, mid, 0.2, 1, len, 0, 0x8a8a8a);
      if (b.x < -300) props.box('stone', b.x - 10, 1.5, mid, 6, 9, len - 20, 0, 0x8a8a84);
      else for (let z = b.z0 + 14; z < b.z1 - 10; z += 14) props.box('stone', b.x, 0.5, z, 8, 11, 2.5, 0, 0x7a7a74);
    }
    props.rand = mulberry32(405);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 34 }, { x: 0, z: -BASE_Z, r: 34 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || waterD(x, z) < 3 || onAir(x, z, 10) || onBridge(x, z) }];
    const update = taiga({ scene, terrain, cover, rand, bounds, palette: this.theme.terrain, avoid, forest: woodsK, maxY: 30, trees: 6000, size: 0.6 });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
