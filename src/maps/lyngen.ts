// The Lyngen line, winter 1985 (the big field, 1.0 × 1.12 km): the hypothetical Soviet drive on north Norway, come down
// the E6 from Finnmark along the Lyngenfjord and in from Finland over the E8 down the Skibotn valley. This is the line
// Norway planned to hold: where the E6 squeezes along the fjord's east shore under steep mountains and the
// Skibotndalen comes down to the shore at Skibotn. On the map: the Lyngenfjord down the west side (the Lyngen Alps a wall
// beyond it), the E6 on its shelf along the shore, Skibotn on the delta in the middle with its quay, the E8 east up
// the Skibotn valley; south the side valleys of Kitdalen and Signaldalen, north the old road over the Nordnes shoulder
// and the Kåfjord valley. Everywhere else the mountains rise straight from the road: infantry country (`steep`), the
// vehicles go by the roads or not at all.
// Norway holds the south (+z, from Oteren), the Soviet Army comes from the north (Olderdalen). Fairness: not a mirror —
// the shore winds its own way, the delta bulges into the fjord, the side valleys are each half's own — but each side
// has the same three kinds of route to the middle (the E6 on the shore, an inland road on a shelf, a side valley in the
// east), at about the same distances, and the same mountain walls over them (measured: tools/map_fairness.py).
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
const BASE_Z = 500, BASE_X = -60;
const noise = createNoise2D(1985_71);

// ---- the Lyngenfjord: its east shore winds down the west of the map, the Skibotn delta pushing out into it
const shoreX = (z: number) => -235 + 30 * Math.sin(z * 0.004 + 0.7) + 18 * Math.sin(z * 0.013) + 55 * Math.exp(-((z - 15) ** 2) / (70 * 70));
const WEST = -455; // the fjord's west shore (the Lyngen Alps rise from it)

// ---- the roads, each half its own: the E6 along the shore, the inland road on its shelf, the side valleys' roads
const e6 = (z: number) => shoreX(z) + 38;
const E6: number[][] = [];
for (let z = 560; z >= -560; z -= 40) E6.push([e6(z), z]);
const ROADS: number[][][] = [
  E6,
  [[BASE_X, 500], [-20, 400], [70, 260], [60, 120], [40, 0]],                     // the inland road south: Kitdalen's shelf to Skibotn
  [[40, 0], [80, -130], [90, -270], [-10, -410], [BASE_X, -500]],                 // and north, over the Nordnes shoulder
  [[e6(380), 380], [120, 350], [250, 320], [330, 290]],                           // Signaldalen road
  [[e6(10), 10], [40, 0], [180, -20], [330, -40], [520, -50]],                    // the E8 up the Skibotn valley
  [[e6(-390), -390], [140, -360], [320, -320]],                                   // the Kåfjord valley road
  [[e6(150), 150], [60, 120]], [[e6(-160), -160], [80, -130]],                    // laterals, shore road to the inland road
  [[e6(500), 500], [BASE_X, 500]], [[e6(-500), -500], [BASE_X, -500]],            // the bases onto the E6
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

const points: ControlPointDef[] = [
  { id: 'A', name: 'Oteren road', x: BASE_X, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Hatteng', x: e6(330), z: 330, owner: null, sector: 'west' },
  { id: 'C', name: 'Kitdalen', x: 70, z: 255, owner: null, sector: 'centre' },
  { id: 'D', name: 'Signaldalen', x: 330, z: 290, owner: null, sector: 'east' },
  { id: 'E', name: 'Skibotn quay', x: e6(40) - 8, z: 40, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Skibotn', x: 40, z: 0, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Skibotndalen', x: 320, z: -40, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Djupvik', x: e6(-300), z: -300, owner: null, sector: 'west' },
  { id: 'I', name: 'Nordnes', x: 90, z: -275, owner: null, sector: 'centre' },
  { id: 'J', name: 'Kåfjord valley', x: 320, z: -320, owner: null, sector: 'east' },
  { id: 'K', name: 'Olderdalen road', x: BASE_X, z: -470, owner: 'pact', sector: 'centre' },
];

/** Low ground: the shelves and valleys the roads take, round the points and bases. 0 there, 1 up in the mountains. */
function mountK(x: number, z: number) {
  let d = roadDist(x, z) - 12;
  for (const p of points) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 45);
  for (const bz of [BASE_Z, -BASE_Z]) d = Math.min(d, Math.hypot(x - BASE_X, z - bz) - 60);
  d = Math.min(d, Math.hypot(x - 40, (z - 0) * 1.6) - 120); // the Skibotn delta: a wide flat fan
  d -= Math.max(0, fbm(noise, x * 0.009 + 40, z * 0.009, 2)) * 70; // (the valleys' sides ragged: bays and screes, never narrower than the road)
  return smoothstep(10, 90, d);
}
const rawMt = (x: number, z: number) => ridged(noise, x * 0.006 + 5, z * 0.006, 4) * 80 + fbm(noise, x * 0.002, z * 0.002, 2) * 30;
// the big mountains, each half its own (Otertinden and the Kitdalen fells south; Nordnesfjellet and the Kåfjord fells north): [x, z, r, m]
const MASSIFS = [[230, 430, 110, 20], [430, 160, 100, 25], [220, 160, 70, 15], [250, -440, 110, 55], [420, -180, 100, 45], [230, -170, 70, 30], [440, -470, 120, 15]];
const massif = (x: number, z: number) => MASSIFS.reduce((h, [cx, cz, r, a]) => h + a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r)), 0);

function ground(x: number, z: number) {
  if (x < WEST) return 2 + (WEST - x) * 1.3 + ridged(noise, x * 0.012, z * 0.012, 3) * 60 * smoothstep(0, 25, WEST - x); // the Lyngen Alps, straight up from the far shore
  const fd = x - shoreX(z);
  if (fd < 0) return Math.max(-18, 0.8 + fd * 0.45);                                   // the fjord: steep-sided and deep
  const low = 2.4 + Math.min(fd, 50) * 0.06 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.6 + fbm(noise, x * 0.005, z * 0.005, 2) * 2;
  const mt = Math.max(0, rawMt(x, z) * 0.9 + 30 + massif(x, z)) * mountK(x, z) * smoothstep(0, 20, fd);
  return low + mt + smoothstep(BOUNDS.z - 20, BOUNDS.z + 120, Math.abs(z)) * 30 * smoothstep(0, 40, fd);
}
function height(x: number, z: number) {
  let h = ground(x, z);
  for (const bz of [BASE_Z, -BASE_Z]) h += (5 - h) * smoothstep(36, 18, Math.hypot(x - BASE_X, z - bz));
  return h;
}

/** Birch in the valley bottoms and on the lower slopes. */
const woods = gridCache((x: number, z: number) => smoothstep(0.03, 0.17, fbm(noise, x * 0.008 + 3, z * 0.008, 2)) * smoothstep(40, 22, height(x, z)) * smoothstep(8, 16, roadDist(x, z)) * 0.7, BOUNDS);
const mountC = gridCache((x: number, z: number) => mountK(x, z), BOUNDS);
const soft = (x: number, z: number, foot: boolean) => (roadDist(x, z) < 6 ? 1 : (foot ? 0.9 : 0.85) * (1 - 0.85 * smoothstep(0.2, 0.7, mountC(x, z))));

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
  id: 'lyngen',
  name: 'The Lyngen line',
  description: 'Skibotn on the Lyngenfjord in winter, Norway’s planned defence line: the E6 squeezed along the shore under steep mountains, the E8 down the Skibotn valley from Finland, side valleys north and south. The vehicles go by the roads or not at all.',
  epochs: ['1985'],
  region: 'north',
  airfields: [], // (no flat strip between the fjord and the fells: the aircraft come in from the map edge — systems/Airfields.js)
  armies: { nato: ['no', 'usmc'], pact: ['sov'] }, // (Brigade Nord and the US Marines’ reinforcement for Norway against the Soviet Army)
  sides: { nato: 'NATO', pact: 'Soviet Union' },
  climate: 'winter',
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1985,
  height,
  steep: 0.6, // (vehicles: the roads or nothing)
  soft,
  river: fjord,
  woods,

  theme: {
    // the low sun of late winter over the Lyngen Alps, long blue shadows
    fogColor: 0xbcc6d0, fogDensity: 0.001,
    skyTop: 0x6a84a4, skyHorizon: 0xd8d4cc, skyBottom: 0x8e96a0,
    sunColor: 0xffe2c0, sunIntensity: 1.5, sunDisk: 0.3,
    clouds: 0.4, cloudLight: 0xe8e6e2, cloudDark: 0x8a92a0,
    sunDir: [-0.3, 0.2, 0.9],
    hemiSky: 0xd0dcea, hemiGround: 0x8e949c, hemiIntensity: 1.45,
    rimColor: 0xc8d4e2, rimIntensity: 0.3,
    terrain: {
      grass: '#eef2f4', grassAlt: '#e2e8ec', dryGrass: '#d8d8d0', dirt: '#8a8478', rock: '#5e6064',
      pasture: '#eceff0', ploughed: '#d0ccc4', stubble: '#dcd8ce', meadow: '#f2f4f4',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (x > WEST && roadDist(x, z) < 4.5) return [0xa4a098, 0.85];                      // the ploughed roads
        if (y < 1.2 && x - shoreX(z) < 6 && x > WEST) return [0x5a5a54, 0.8];                // the dark shore below the snow
        if (y > 14) return [0xe4e8ec, smoothstep(-0.35, 0.25, noise(x * 0.025, z * 0.025)) * smoothstep(14, 28, y) * 0.8]; // snow on the mountainsides, the steepest rock bare
        return null;
      },
    },
  },

  bases: { nato: { x: BASE_X, z: BASE_Z, entries: [BASE_X - 40, BASE_X, BASE_X + 40] }, pact: { x: BASE_X, z: -BASE_Z, entries: [BASE_X - 40, BASE_X, BASE_X + 40] } },
  maxStacks: 26,
  cameraStart: { nato: { x: BASE_X, z: 400 }, pact: { x: BASE_X, z: -400 } },
  points,

  spawns: {
    nato: [{ unit: 'rifles', x: BASE_X, z: BASE_Z - 18, name: '1st Platoon', facing: Math.PI }],
    pact: [{ unit: 'rifles', x: BASE_X, z: -BASE_Z + 18, name: '1-ya Rota', facing: 0 }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    fjord.build(scene);
    const free = (x: number, z: number, r = 9) => roadDist(x, z) > r && x - shoreX(z) > 16 && terrain.heightAt(x, z) < 16 && mountC(x, z) < 0.03; // (on the flat: not hanging off a scree)

    // ---- Skibotn: wooden houses on the delta round the E6/E8 junction, the church, the old Sámi market place
    props.rand = mulberry32(1985_72);
    const r0 = props.rand;
    for (let i = 0; i < 40; i++) {
      const a = r0() * Math.PI * 2, d = 25 + r0() * 95, x = 20 + Math.cos(a) * d, z = 10 + Math.sin(a) * d * 0.7;
      if (!free(x, z, 9) || points.some((p) => Math.hypot(p.x - x, p.z - z) < 20)) continue;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r0() * 3, depth: 7 + r0() * 2, storeys: r0() < 0.4 ? 2 : 1, name: 'house', damaged: 0.05 });
    }
    if (free(70, 40)) props.church({ x: 70, z: 40, yaw: Math.PI / 2 });
    // the quay: a pier out into the fjord, a warehouse and the fish plant on the shore
    const q = points[4];
    for (let x = q.x - 14; x > shoreX(q.z) - 40; x -= 6) props.box('stone', x, 0.8, q.z, 6.2, 3, 8, 0, 0x6a6864);
    props.hall({ x: shoreX(q.z + 34) + 14, z: q.z + 34, yaw: Math.PI / 2, width: 20, depth: 10, height: 6, color: 0x8a2e22, roof: 0x3a3a3a, door: 6, name: 'fish plant' });

    // ---- hamlets round the other points (each its own dice), boathouses on the shore, wrecks and boulders by the roads
    for (const p of points) {
      if (!'ABCDGHIJK'.includes(p.id)) continue;
      buildVillage(props, p, 9900 + Math.round(p.x * 3 + p.z), 1);
    }
    for (const m of [1, -1]) {
      props.rand = mulberry32(1985_73 + m);
      const r = props.rand;
      for (let i = 0; i < 60; i++) {
        const z = (30 + r() * 500) * m, x = shoreX(z) + 4 + r() * 260;
        if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 30) || Math.hypot(x - BASE_X, Math.abs(z) - BASE_Z) < 50 || terrain.heightAt(x, z) > 16) continue;
        const fd = x - shoreX(z), rd = roadDist(x, z);
        if (fd > 5 && fd < 14 && rd > 10) props.hall({ x, z, yaw: Math.PI / 2, width: 10, depth: 6, height: 4, color: 0x8a2e22, roof: 0x3a3a3a, door: 4, name: 'boathouse' });
        else if (rd > 7 && rd < 12 && fd > 8) (r() < 0.5 ? props.wreckCar({ x, z, yaw: r() * 6 }) : props.boulder({ x, z, radius: 1.3 + r() }));
      }
    }
    props.rand = mulberry32(404);
    commandPost(props, this.bases.nato, -1, 0xd8dcd8);
    commandPost(props, this.bases.pact, 1, 0xd0d4d0);
    props.finish();

    const avoid = [{ x: BASE_X, z: BASE_Z, r: 34 }, { x: BASE_X, z: -BASE_Z, r: 34 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || x - shoreX(z) < 3 || x < WEST + 10 }];
    // birch and pine on the lower slopes, none above the tree line (maxY)
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 4200, broadleaf: 0, autumn: 1, size: 0.8, maxY: 40, forest: woods });
    cover.finalize(bounds);
    const ground2 = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.6 });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground2.update(dt, t); trees.update(dt, t); },
    };
  },
} satisfies MapDef;
