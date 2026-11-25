// Primosole Bridge, Sicily, 13–17 July 1943 — Operation Fustian (1945 only; the big field, 1.0 × 1.12 km). The 1st
// Parachute Brigade dropped by night, scattered across the Catania plain, to take the steel truss bridge over the Simeto
// ahead of the 8th Army; Fallschirmjäger of the 1st Parachute Division, dropped near Catania the same day, threw them
// off it, and the Durham Light Infantry of the 50th Division, come up from Lentini, crossed the river at a ford
// upstream and took the bridge back in three days of fighting in the vineyards and the lemon groves. Compressed onto
// the map: the Simeto across the middle, low and slow in July between its levees, the truss bridge on the Lentini –
// Catania road in the middle, the stepping-stones ford upstream (west) and a ford down by the mouth (east). South,
// the British side (+z): the low hills the paratroops called Johnny I and Johnny II, Agnone among its lemon groves, a
// dry old bed of the Simeto. North, the German side (-z): the Fosso Bottaceto (the anti-tank ditch before Catania),
// the rise of Monte Turcisi, Gerbini and its orange groves; stone masserie, stubble and the open fields of the plain
// between; Etna on the skyline beyond Catania. Gliders down in the fields on both banks (they came down everywhere).
// Not mirrored, but fair: each side has a hill near its centre (Johnny I and Monte Turcisi, the same height), a low
// rise on one flank (Johnny II west, Gerbini east), a village among groves on the other (Agnone east, the Bottaceto
// ditch and its farm west), a dry ditch for cover across one half (the old bed east, the Bottaceto west); the three
// crossings lie on the river line between, each point about as far from one base as its counterpart is from the other.
// No `climate`, like Gela: the plain is green and gold, not desert.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { buildSite, commandPost } from './common.js';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const FORD_W = -290, FORD_E = 360; // the two fords
const HW = 13;     // the Simeto’s half-width in July
const LEVEE = 34;  // the levees, from the river’s middle
const noise = createNoise2D(1943_0714);

// the Simeto: meandering slowly east to the sea
const riverZ = (x: number) => 16 * Math.sin(x * 0.0055 + 0.5) + 7 * Math.sin(x * 0.016 + 1.2) - 6;
const away = (x: number, z: number) => Math.abs(z - riverZ(x));

const STEEL = new THREE.MeshStandardMaterial({ color: 0x3e413e, roughness: 0.7, metalness: 0.45 });
function bars(list: [number[], number[], number][]) {
  const geos = list.map(([a, b, t]) => {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const g = new THREE.BoxGeometry(t, d.length(), t);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    return g;
  });
  const m = new THREE.Mesh(mergeGeometries(geos), STEEL);
  m.castShadow = m.receiveShadow = true;
  return m;
}
/** The Primosole bridge’s steel: a through Warren truss either side of the road, slanted end posts, braced overhead. */
function truss(L: number, w: number, deck: number, H: number, panels: number) {
  const list: [number[], number[], number][] = [];
  const lo = deck + 0.45, hi = lo + H, Z = (i: number) => -L / 2 + (L * i) / panels;
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 + 0.35);
    for (let i = 0; i < panels; i++) {
      const z0 = Z(i), z1 = Z(i + 1);
      list.push([[x, lo, z0], [x, lo, z1], 0.5]);                                                      // bottom chord
      if (i === 0) list.push([[x, lo, z0], [x, hi, z1], 0.55]);                                       // end posts
      else if (i === panels - 1) list.push([[x, hi, z0], [x, lo, z1], 0.55]);
      else {
        list.push([[x, hi, z0], [x, hi, z1], 0.55]);                                                  // top chord
        list.push(i % 2 ? [[x, hi, z0], [x, lo, z1], 0.22] : [[x, lo, z0], [x, hi, z1], 0.22]);     // diagonals
      }
      if (i > 0) list.push([[x, lo, z0], [x, hi, z0], 0.24]);                                          // verticals
    }
  }
  for (let i = 1; i < panels; i++) list.push([[-(w / 2 + 0.35), hi, Z(i)], [w / 2 + 0.35, hi, Z(i)], 0.25]); // overhead bracing
  return bars(list);
}

const river = createRiver({
  path: riverZ,
  halfWidth: HW,
  level: 0,
  depth: 2.4,
  valley: 36,
  crossings: [
    { name: 'Stepping stones ford', x: FORD_W, kind: 'ford', width: 10 },
    { name: 'Primosole Bridge', x: 0, kind: 'bridge', width: 8, truss: { height: 6, panels: 6 } },
    { name: 'Simeto mouth ford', x: FORD_E, kind: 'ford', width: 10 },
  ],
});
{ // the steel truss over the stone causeway’s span (it falls with the span when blown)
  const stoneBridge = river.bridgeMesh;
  river.bridgeMesh = function (c: any, stone: any, dark: any, terrain: any) {
    const g = stoneBridge.call(river, c, stone, dark, terrain);
    if (c.truss) c.span.add(truss(c.spanL + 4, c.width, river.deck, c.truss.height, c.truss.panels));
    return g;
  };
}

// ---- the places
const JOHNNY1 = { x: 70, z: 235 };    // Johnny I (C), the hill south of the bridge
const JOHNNY2 = { x: -330, z: 285 };  // Johnny II (B), a low rise west
const AGNONE = { x: 330, z: 290 };    // Agnone (D) among the lemon groves
const TURCISI = { x: -140, z: -250 };  // Monte Turcisi (I)
const BOTTACETO = { x: -290, z: -285 }; // Fosso Bottaceto (H): the farm by the ditch
const GERBINI = { x: 360, z: -290 };  // Gerbini (J), on its low rise

// ---- the roads: three north–south (the Lentini – Catania road over the bridge, the tracks to each ford), one lateral on each bank
const NS = [FORD_W, 0, FORD_E];
const nsX = (rx: number, z: number) => rx + 12 * Math.sin(z * 0.01 + rx * 0.01) * smoothstep(50, 130, Math.abs(z));
const latS = (x: number) => 175 + 14 * Math.sin(x * 0.007 + 0.6);
const latN = (x: number) => -190 + 12 * Math.sin(x * 0.009 + 2.1);
function roadDist(x: number, z: number) {
  if (away(x, z) < HW + 5) return Infinity;
  let d = Math.min(Math.abs(z - latS(x)), Math.abs(z - latN(x)));
  for (const rx of NS) d = Math.min(d, Math.abs(x - nsX(rx, z)));
  return d;
}

// ---- the ditches: the dry old bed of the Simeto (south, east half, winding) and the Fosso Bottaceto (north, west half, dug straight)
const oldBedZ = (x: number) => 120 + 30 * Math.sin(x * 0.012 + 1);
const bottZ = (x: number) => -245 + x * 0.04;
const ditch = (x: number, z: number) => {
  let k = 0;
  if (x > 150 && x < 520) k = Math.max(k, smoothstep(11, 4, Math.abs(z - oldBedZ(x))) * smoothstep(150, 200, x));
  if (x < -190 && x > -520) k = Math.max(k, smoothstep(8, 3.5, Math.abs(z - bottZ(x))) * smoothstep(-190, -240, x));
  return k;
};

// ---- the groves: orange and lemon trees in rows round Agnone and Gerbini, and a grove on each bank near the river
const GROVES: [number, number, number][] = [[AGNONE.x - 30, AGNONE.z - 60, 85], [GERBINI.x + 20, GERBINI.z + 60, 85], [-170, 110, 65], [170, -105, 65]];
const groveK = (x: number, z: number) => { let k = 0; for (const [gx, gz, r] of GROVES) k = Math.max(k, smoothstep(r + 15, r - 10, Math.hypot(x - gx, z - gz))); return k; };

const hill = (x: number, z: number, c: { x: number, z: number }, rx: number, rz: number, h: number) => h * Math.max(0, 1 - Math.hypot((x - c.x) / rx, (z - c.z) / rz)) ** 1.3;
const FLAT: [number, number, number][] = [[AGNONE.x, AGNONE.z, 55], [0, BASE_Z, 34], [0, -BASE_Z, 34]];

/** The plain without the river: a soft swell, the hills, the levees, the ditches (the dear part: cached). */
function ground(x: number, z: number) {
  const a = away(x, z);
  let h = 4 + fbm(noise, x * 0.004, z * 0.004, 3) * 1.6 + smoothstep(60, 420, a) * 2.5;
  h += hill(x, z, JOHNNY1, 105, 70, 17) + hill(x, z, TURCISI, 95, 75, 17) + hill(x, z, JOHNNY2, 80, 60, 9) + hill(x, z, GERBINI, 85, 60, 9);
  h += 2 * smoothstep(8, 2.5, Math.abs(a - LEVEE));                                                     // the levees
  const dk = ditch(x, z);
  if (dk > 0) h -= 2.2 * dk * smoothstep(5, 12, roadDist(x, z));                                       // (filled where the roads cross)
  h += smoothstep(470, 600, Math.abs(x)) * 8 + smoothstep(560, 680, Math.abs(z)) * 8;
  h += smoothstep(-600, -800, z) * 30;                                                                  // the first of Etna’s slopes beyond Catania
  for (const [fx, fz, fr] of FLAT) { const k = smoothstep(fr, fr * 0.55, Math.hypot(x - fx, z - fz)); if (k > 0) h += (4.5 + fbm(noise, fx * 0.004, fz * 0.004, 3) * 1.6 - h) * k; }
  return h;
}
const groundC = gridCacheSmooth(ground, { x: 820, z: 820 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.3, groundC(x, z)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Lentini road', x: -40, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Johnny II', x: JOHNNY2.x, z: JOHNNY2.z, owner: null, sector: 'west' },
  { id: 'C', name: 'Johnny I', x: JOHNNY1.x, z: JOHNNY1.z, owner: null, sector: 'centre' },
  { id: 'D', name: 'Agnone', x: AGNONE.x, z: AGNONE.z, owner: null, sector: 'east' },
  { id: 'E', name: 'Stepping stones', x: FORD_W, z: riverZ(FORD_W), owner: null, sector: 'west', radius: 30 },
  { id: 'F', name: 'Primosole Bridge', x: 0, z: riverZ(0), owner: null, sector: 'centre', radius: 32 }, // (reaches both ends)
  { id: 'G', name: 'Simeto mouth', x: FORD_E, z: riverZ(FORD_E), owner: null, sector: 'east', radius: 30 },
  { id: 'H', name: 'Fosso Bottaceto', x: BOTTACETO.x, z: BOTTACETO.z, owner: null, sector: 'west' },
  { id: 'I', name: 'Monte Turcisi', x: TURCISI.x, z: TURCISI.z, owner: null, sector: 'centre' },
  { id: 'J', name: 'Gerbini', x: GERBINI.x, z: GERBINI.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Catania', x: -40, z: -470, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

const etna = (scene: any) => { // the volcano on the skyline beyond Catania (haze-blue, out past the fog)
  const prof = [[0, 520], [70, 530], [160, 490], [420, 360], [800, 190], [1250, 60], [1700, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshBasicMaterial({ color: 0x95a0ae, fog: false, side: THREE.DoubleSide }));
  mesh.position.set(-700, -10, -2500);
  scene.add(mesh);
};

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

export default {
  id: 'primosole',
  name: 'Primosole Bridge',
  description: 'Sicily, 14–17 July 1943: the steel truss bridge over the Simeto, the British paratroops and the 8th Army against the Fallschirmjäger. The river between its levees, two fords, the Fosso Bottaceto and a dry old river bed, orange and lemon groves, stone farmhouses and the open fields of the Catania plain, Etna on the skyline.',
  epochs: ['1945'],
  region: 'africa', // (the North Africa & Mediterranean theatre, with Gela: maps/index.js REGIONS)
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['brit'], pact: ['fj', 'wh'] }, // (the 1st Parachute Brigade and the 50th Division against the 1st Fallschirmjäger Division and the Hermann Göring’s Kampfgruppe Schmalz)
  conditions: { time: 'day', weather: 'clear' }, // (hot, clear July days)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  camera: { far: 3600 },
  seed: 1943_0714,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => groveK(x, z) * 0.6, // (the groves: thick, low trees in rows)
  fields: createFields({ seed: 1943_0714, cell: 64, weights: [0.12, 0.2, 0.55, 0.13] }), // (July: most of the wheat cut)

  theme: {
    // a hot, clear afternoon: hard light, a pale haze over the plain (Gela’s)
    fogColor: 0xd6d2c2, fogDensity: 0.0006,
    skyTop: 0x4a82bc, skyHorizon: 0xe6e0cc, skyBottom: 0xa8a28a,
    sunColor: 0xfff2d8, sunIntensity: 2.4, sunDisk: 0.9,
    clouds: 0.08, cloudLight: 0xf6f2ea, cloudDark: 0xc8c4ba,
    sunDir: [0.35, 0.75, 0.55],
    hemiSky: 0xd4dce6, hemiGround: 0x9a8a60, hemiIntensity: 1.2,
    rimColor: 0xf0e2c6, rimIntensity: 0.28,
    terrain: {
      grass: '#8e8a50', grassAlt: '#7e7e48', dryGrass: '#c2ad70', dirt: '#a68658', rock: '#b8a482',
      pasture: '#9a9458', ploughed: '#9a7850', stubble: '#ccb474', meadow: '#8a8a50',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number) {
        const a = away(x, z);
        if (a < HW + 4) return [0xa49a80, 1];                                              // the river’s gravel and mud
        if (roadDist(x, z) < 3.5) return [0xb4a07c, 0.9];                                  // white dust roads
        if (ditch(x, z) > 0.3) return [0xbcae90, 0.85];                                    // the gravel in the ditches
        if (a < LEVEE + 6) return [0x7e8048, 0.6];                                          // reeds and grass between the levees
        const g = groveK(x, z);
        if (g > 0.3) return [0x5e6a34, g * 0.6];                                           // the irrigated groves: green under the trees
        return null;                                                                        // the fields
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: NS }, pact: { x: 0, z: -BASE_Z, entries: NS } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = props.rand = mulberry32(1943_0714);
    const clear = (x: number, z: number, w = 9) => roadDist(x, z) > w && away(x, z) > LEVEE + 10 && ditch(x, z) < 0.05;

    /** A Horsa glider come down hard in a field: the fuselage, a wing, the tail broken off (cover). (Arnhem’s.) */
    const horsa = (x: number, z: number, yaw: number) => {
      const g = terrain.heightAt(x, z);
      const P = (lx: number, ly: number, lz: number, sx: number, sy: number, sz: number, c: number, ry = 0, rx = 0, rz = 0) => { const [wx, wz] = PropBuilder.local(x, z, yaw, lx, lz); props.box('plain', wx, g + ly, wz, sx, sy, sz, yaw + ry, c, rx, rz); };
      const ply = 0x5a5a40;
      P(0, 1.5, 0, 2.6, 2.7, 15, ply, 0, 0.04);
      P(0, 1.3, 9, 2.3, 2.2, 3, 0x3a3a30, 0, 0.2);
      P(0, 3.1, -1, 26 * (0.5 + r() * 0.5), 0.3, 3, ply, 0, 0, (r() - 0.5) * 0.25);
      P(2.5, 0.7, -12, 1.6, 1.3, 7, ply, 0.5, 0, 0.6);
      P(3, 2.4, -14.5, 0.25, 3.4, 2.4, ply, 0.5);
      cover.addBox({ x, z, yaw, length: 2.6, thickness: 15, height: 2.8 });
    };
    /** A masseria: a stone farmhouse behind its yard walls. */
    const masseria = (x: number, z: number, yaw: number, storeys = 1) => {
      props.flatHouse({ x, z, yaw, width: 11 + r() * 4, depth: 7.5, storeys, name: 'masseria' });
      for (const [lx, lz, ry] of [[0, 12, 0], [-14, 0, Math.PI / 2], [14, 0, Math.PI / 2]]) {
        const [wx, wz] = PropBuilder.local(x, z, yaw, lx, lz);
        if (roadDist(wx, wz) > 13) props.lowWall({ x: wx, z: wz, yaw: yaw + ry, length: 22, height: 1.4, color: 0xb0a080 });
      }
    };
    /** A village: flat-roofed houses round a church. */
    const village = (cx: number, cz: number, n: number, seed: number, spread: number) => {
      const vr = mulberry32(seed);
      props.church({ x: cx + 18, z: cz - 14, yaw: Math.PI / 2 });
      for (let i = 0; i < n; i++) {
        const ang = vr() * Math.PI * 2, d = 18 + vr() * spread;
        const x = cx + Math.cos(ang) * d, z = cz + Math.sin(ang) * d;
        if (roadDist(x, z) < 8 || Math.hypot(x - cx, z - cz) < 14 || Math.hypot(x - cx - 18, z - cz + 14) < 15) continue;
        props.flatHouse({ x, z, yaw: Math.round(ang / (Math.PI / 2)) * (Math.PI / 2), width: 7 + vr() * 4, depth: 7 + vr() * 3, storeys: vr() < 0.4 ? 2 : 1 });
      }
    };

    // ---- the bridge: a concrete pillbox and sandbags at each end, the road blocked with wire on the north
    for (const m of [1, -1]) {
      const z0 = riverZ(0) + m * (HW + 22);
      props.sandbagRing({ x: -14, z: z0, radius: 4, toward: -m });
      props.sandbagRing({ x: 14, z: z0 + m * 6, radius: 4, toward: -m });
      const pz = z0 + m * 10, py = Math.min(...[19, 25].flatMap((x) => [pz - 3, pz + 3].map((z) => terrain.heightAt(x, z)))) - 0.3; // (sunk to its lowest corner)
      props.box('plain', 22, py + 1.2, pz, 6, 2.4, 6, 0, 0xa8a090);  // the pillbox (the Italians built them at both ends)
      props.box('plain', 22, py + 2.55, pz, 6.6, 0.3, 6.6, 0, 0x8e887a);
      cover.addBox({ x: 22, z: pz, yaw: 0, length: 6, thickness: 6, height: 2.4 });
    }
    // ---- the villages: Agnone (south-east), Gerbini (north-east)
    village(AGNONE.x, AGNONE.z, 16, 1943_71, 34);
    village(GERBINI.x, GERBINI.z, 14, 1943_72, 34);
    // ---- the farms on the hills and by the ditch
    masseria(JOHNNY1.x + 34, JOHNNY1.z + 26, 0.3, 2);
    masseria(TURCISI.x - 36, TURCISI.z - 24, 2.9, 2);
    masseria(JOHNNY2.x + 36, JOHNNY2.z + 30, 1.4);
    masseria(BOTTACETO.x + 34, BOTTACETO.z - 30, 0.2);
    // ---- the positions: on the hills’ crests, along the Bottaceto and the old bed
    for (const [c, s] of [[JOHNNY1, -1], [TURCISI, 1], [JOHNNY2, -1], [GERBINI, 1]] as [{ x: number, z: number }, number][]) {
      for (const [dx, dz] of [[-26, -12], [10, -20], [30, 4]]) props.sandbagRing({ x: c.x + dx, z: c.z + dz * s, radius: 4.5, toward: s });
    }
    for (let x = -480; x < -240; x += 70) props.sandbagRing({ x: x + r() * 20, z: bottZ(x) - 14, radius: 4, toward: 1 });
    for (let x = 220; x < 480; x += 70) props.sandbagRing({ x: x + r() * 20, z: oldBedZ(x) + 16, radius: 4, toward: -1 });

    // ---- the masserie out on the plain, and the dry-stone walls
    for (let i = 0, n = 0; i < 400 && n < 26; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 520;
      if (!clear(x, z, 16) || nearPoint(x, z, 70) || groveK(x, z) > 0.2 || Math.hypot(x, Math.abs(z) - BASE_Z) < 70) continue;
      n++;
      if (r() < 0.6) masseria(x, z, r() * 3, r() < 0.4 ? 2 : 1);
      else buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    for (let i = 0; i < 80; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 520, yaw = r() < 0.5 ? 0 : Math.PI / 2, len = 20 + r() * 40;
      if (!clear(x, z, 4 + len / 2) || nearPoint(x, z, 40 + len / 2) || groveK(x, z) > 0.1 || Math.hypot(x, Math.abs(z) - BASE_Z) < 60 + len / 2) continue;
      props.lowWall({ x, z, yaw, length: len, height: 1.2, color: 0xb4a684 });
    }
    // ---- the gliders, down in the fields on both banks; hay in the stubble
    for (let i = 0, n = 0; i < 80 && n < 12; i++) {
      const x = (r() * 2 - 1) * 440, z = (r() < 0.5 ? 1 : -1) * (60 + r() * 330);
      if (!clear(x, z, 16) || nearPoint(x, z, 30) || groveK(x, z) > 0.05) continue;
      n++; horsa(x, z, r() * Math.PI * 2);
    }
    for (let i = 0; i < 16; i++) {
      const x = (r() * 2 - 1) * 440, z = (r() * 2 - 1) * 440, yaw = r() * 3;
      if (!clear(x, z, 12) || nearPoint(x, z, 26) || groveK(x, z) > 0.1) continue;
      props.hayBales({ x, z, yaw, count: 4 });
    }
    commandPost(props, this.bases.nato, -1, 0xb8a078);
    commandPost(props, this.bases.pact, 1, 0x9a8a62);
    props.finish();
    river.build(scene, terrain);
    etna(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => away(x, z) < HW + 4 || roadDist(x, z) < 6 || ditch(x, z) > 0.2 }];
    // the groves: oranges and lemons in rows; eucalyptus and poplars along the levees; olives and carobs about the fields
    // (lane: the whole field — plantTrees asks forest() only inside its lane)
    const rows = (x: number, z: number) => Math.abs(((x + 1000) % 6) - 3) < 1.2 && Math.abs(((z + 1000) % 5) - 2.5) < 1.6;
    const grove = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 2000, count: 6000, broadleaf: 1, autumn: 0, size: 0.45, maxY: 40,
      forest: (x: number, z: number) => (groveK(x, z) > 0.3 && rows(x, z) ? 0.95 : -1) });
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 2000, count: 1400, broadleaf: 0.85, autumn: 0, size: 0.8, maxY: 60,
      forest: (x: number, z: number) => {
        if (groveK(x, z) > 0.1 || nearPoint(x, z, 22)) return -1;
        const a = away(x, z);
        if (a > HW + 6 && a < LEVEE + 12) return 0.35;                                       // along the river
        return smoothstep(0.25, 0.45, fbm(noise, x * 0.008 + 9, z * 0.008, 2)) * 0.3 - 0.02;  // olive patches in the fields
      } });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.8, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grove.update?.(dt, t); trees.update?.(dt, t); grass.update(dt, t); },
    };
  },
} satisfies MapDef;
