// The Hermada, May–August 1917: the Tenth and Eleventh Battles of the Isonzo on the Carso. The Italian Third Army
// (the Duke of Aosta’s) ground east over the barren Karst plateau toward Trieste: in May and June it took Jamiano and
// the Flondar trench line and got into Medeazza at the foot of Monte Hermada, then lost most of it again to
// Boroević’s counter-attacks; in August it came again and again stopped under the Hermada — the last height before
// Trieste, honeycombed with caverns and galleries, which it never took.
// The ground, as it lies: Monte Hermada is one great stony dome standing right over the sea in the south-west, Duino
// with its castle on the rock at its seaward foot, the Adriatic filling the south-west corner. North of the dome the
// low ground: the Timavo wells up out of the rock at San Giovanni under the dome’s north foot and runs a short way
// south-west to the sea, and the Lisert’s reed marshes spread north from it along the west edge with the hump of
// Quota 12 in them; the Südbahn and the coast road run along the foot of the karst. East of the low ground the karst
// plateau: grey limestone, burnt grass and scrub, dolines everywhere and dry-stone walls round every patch of soil,
// Quota 144 rising on the Italian half and falling away east toward the Vallone; Flondar, Jamiano, Ceroglie and
// Medeazza in the stone.
// Fair by distance, not by a mirror: each side’s points pair up at the same reach from its own base (Quota 144
// against the Hermada, Quota 12 in the marsh against Duino by the sea, Jamiano against Ceroglie on the east
// plateau); the springs, Medeazza under the dome and Flondar lie between the bases. The Austrians have the one
// great height; the Italians have Quota 144, the plateau’s higher ground to the north-east and the marsh’s reeds.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createSea } from '../world/Sea.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const SEED = 1917_0812;
const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 500;
const noise = createNoise2D(SEED);
/** The waterline of the bay in the south-west corner (x of the shore at z; north of z ≈ −40 it runs out of the map). */
const shoreX = (z: number) => -560 + 305 * smoothstep(-20, -310, z) - 30 * smoothstep(-330, -560, z) + 6 * Math.sin(z * 0.03);
const inland = (x: number, z: number) => x - shoreX(z);
/** The Timavo: from its springs under the dome’s north foot south-west to the sea. */
const TIMAVO = [[-312, -18], [-345, -42], [-392, -70], [-440, -92], [-520, -118]];
const timHW = (x: number) => 5 + 9 * smoothstep(-330, -470, x);
const timD = (x: number, z: number) => (x > -306 ? Infinity : segDist(TIMAVO, x, z));
/** The Hermada’s dome and Quota 144 [x, z, r, h]. */
const DOME = [-170, -175, 205, 82], Q144 = [175, 205, 150, 44];

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Doberdò road', 0, 470, 'centre'),
  P('B', 'Quota 12', -180, 320, 'west'),
  P('C', 'Quota 144', 190, 180, 'east', { radius: 24 }),
  P('D', 'Jamiano', 310, 260, 'east', { radius: 26 }),
  P('E', 'San Giovanni', -285, 0, 'west', { radius: 24 }),
  P('F', 'Flondar', 90, 0, 'centre', { radius: 30 }),
  P('G', 'Medeazza', -90, 0, 'centre', { radius: 26 }),
  P('H', 'Duino', -200, -330, 'west', { radius: 24 }),
  P('I', 'Monte Hermada', -170, -170, 'west', { radius: 26 }),
  P('J', 'Ceroglie', 300, -260, 'east', { radius: 26 }),
  P('K', 'Sistiana road', 0, -470, 'centre'),
] as any[];
const at = (id: string) => { const p = points.find((q) => q.id === id); return [p.x, p.z]; };

/** The Südbahn along the foot of the karst, over the Timavo and round the dome’s seaward foot past Duino. */
const RAIL = [[-330, 600], [-318, 320], [-262, 120], [-268, 30], [-330, -70], [-300, -220], [-268, -300], [-232, -420], [-212, -600]];
/** The roads: the coast road; each base’s trunk; the dome’s road; the karst-foot road through the springs; the plateau roads. */
const ROADS = [
  [[-405, 600], [-380, 420], [-300, 360], at('B'), [-238, 150], at('E'), [-342, -62], [-318, -200], at('H'), [-190, -450], [-120, -600]],
  [[0, BASE_Z], [70, 360], at('C'), [150, 90], at('F')],
  [[0, BASE_Z], [-100, 400], at('B')],
  [[0, BASE_Z], [170, 420], at('D')],
  [[0, -BASE_Z], [-60, -400], [-140, -300], at('I'), [-110, -80], at('G')],
  [at('I'), [-210, -260], at('H')],
  [at('E'), [-180, 15], at('G'), at('F'), [220, -20], [420, -10], [600, 0]],
  [[0, -BASE_Z], [160, -420], at('J')],
  [at('D'), [380, 120], [330, -100], at('J'), [600, -300]],
  [at('C'), at('D'), [600, 300]],
  [at('F'), [120, -200], [0, -BASE_Z]],
  [at('G'), [-60, 200], at('B')],
];
const SEGS = [...ROADS, RAIL].flatMap((r) => r.slice(1).map((b, i) => { const a = r[i]; return [a[0], a[1], b[0], b[1], Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; }));
/** The segments within 30 m of each 40 m cell (the roads are asked for every vertex: the far ones skipped). */
const RB = new Map<number, number[][]>();
for (const sg of SEGS) for (let i = Math.floor((sg[4] - 30) / 40); i <= Math.floor((sg[5] + 30) / 40); i++) for (let j = Math.floor((sg[6] - 30) / 40); j <= Math.floor((sg[7] + 30) / 40); j++) { const k = i * 1000 + j; if (!RB.has(k)) RB.set(k, []); RB.get(k)!.push(sg); }
function roadD0(x: number, z: number, cap = 30) {
  let best = cap;
  for (const [ax, az, bx, bz, x0, x1, z0, z1] of RB.get(Math.floor(x / 40) * 1000 + Math.floor(z / 40)) ?? []) {
    if (x < x0 - best || x > x1 + best || z < z0 - best || z > z1 + best) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
const roadDc = gridCache((x: number, z: number) => roadD0(x, z, 30), EXT, 2); // (sampled once: the ground, the surfaces and the soft ground ask it everywhere)
const roadD = (x: number, z: number, cap = 30) => Math.min(cap, roadDc(x, z));
const railD = (x: number, z: number) => segDist(RAIL, x, z);

/** The low ground west of the karst’s foot, north of the dome (the Lisert): 0..1. */
const lowK = (x: number, z: number) => smoothstep(-200, -300, x + 40 * Math.sin(z * 0.006)) * smoothstep(-120, -20, z);
/** The reed marsh in it (off the coast road’s causeway and the karst foot): 0..1. */
const marshK = (x: number, z: number) => lowK(x, z) * smoothstep(-270, -320, x) * (1 - smoothstep(470, 540, z));
/** The karst above its foot: 0..1. */
const plateauK = (x: number, z: number) => 1 - lowK(x, z);

/** Dolines on the plateau and the dome’s flanks (kept off the points, roads and bases). */
const DOLINES: number[][] = [];
{
  const r = mulberry32(SEED + 3);
  for (let i = 0; i < 900 && DOLINES.length < 90; i++) {
    const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 540, rad = 7 + r() * 9;
    if (plateauK(x, z) < 0.95 || inland(x, z) < 60 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 45) || roadD0(x, z) < rad + 8 || Math.hypot(x, Math.abs(z) - BASE_Z) < 60) continue;
    DOLINES.push([x, z, rad, 2 + r() * 2.6]);
  }
}

/** The land before the sea and the Timavo are cut into it, sampled once every 2 m (its noise is too dear for every vertex). */
const land = gridCacheSmooth((x: number, z: number) => {
  const inl = inland(x, z), pk = plateauK(x, z);
  let h = 1.2 + fbm(noise, x * 0.01, z * 0.01, 2) * 0.6;
  h += 30 * pk + 22 * smoothstep(-100, 600, x + z) * pk;                                       // the karst’s foot and the plateau, higher to the north-east
  h -= 10 * smoothstep(260, 480, x - 0.3 * z) * pk;                                            // (falling away east toward the Vallone)
  if (pk > 0.001) h += (ridged(noise, x * 0.014 + 3, z * 0.014, 3) * 5 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.8) * pk; // limestone ribs and hollows
  for (const [hx, hz, hr, hh] of [DOME, Q144]) { const d = Math.hypot(x - hx, (z - hz) * 1.1); if (d < hr * 1.6) h += hh * Math.exp(-((d / hr) ** 2) * 1.6); }
  { const c = smoothstep(170, 40, Math.hypot(x - DOME[0], z - DOME[1])); if (c > 0) h += ridged(noise, x * 0.03 + 9, z * 0.03, 2) * 6 * c; } // the dome’s stony crown
  if (inl < 40) h += (0.3 + Math.max(inl, 0) * 0.03 - h) * (1 - smoothstep(14, 40, inl));                         // the pebble shore under Duino
  const mk = marshK(x, z);
  if (mk > 0) {
    const n = fbm(noise, x * 0.04 + 11, z * 0.04, 2);
    h += (0.7 + 0.25 * n - h) * mk;                                                             // the marsh
    h -= 1.2 * mk * smoothstep(0.3, 0.42, n);                                                  // its pools (wadeable)
  }
  { const d = Math.hypot(x - at('B')[0], z - at('B')[1]); if (d < 60) h += 5 * smoothstep(60, 15, d); }                  // Quota 12’s hump
  for (const [dx, dz, dr, dd] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const d = Math.hypot(x - dx, z - dz); if (d < dr) h -= dd * smoothstep(dr, 0, d) ** 1.5; }
  for (const bz of [BASE_Z, -BASE_Z]) { const b = Math.hypot(x, z - bz); if (b < 36) h += (BASE_H - h) * smoothstep(36, 18, b); }
  return h;
}, EXT, 2);
const BASE_H = 40;
function height(x: number, z: number) {
  const inl = inland(x, z);
  if (inl < 0) return Math.max(-8, -0.8 + inl * 0.08);                                         // the Adriatic
  let h = land(x, z);
  const hw = timHW(x), td = timD(x, z);
  if (td < hw + 8) h = Math.min(h, -2.2 + (h + 2.2) * smoothstep(hw - 3, hw + 6, td));        // the Timavo
  if (inl > 14) { const rd = roadD(x, z, 8); if (rd < 6 && h < 1.3) h = Math.max(h, (td < hw + 8 ? 1.3 : 0.9) * smoothstep(6, 4, rd)); } // causeways over the marsh, bridges over the Timavo
  return h;
}

/** The marsh drags at everything off its causeways. */
const soft = (x: number, z: number, foot: boolean) => { const mk = marshK(x, z); return mk < 0.05 || roadD(x, z, 6) < 4.5 ? 1 : 1 - mk * (foot ? 0.35 : 0.6); };

/** One water sheet at the sea’s level (the Adriatic, the Timavo, the marsh pools). */
const water = {
  ...createSea({ level: 0, size: 1600 }),
  sea: false,
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3e6a72, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.86 });
    mat.userData.waterSurface = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.noAO = true;
    scene.add(m);
  },
};

/** Each side’s fire trench (left to right as its owner looks): the Italians’ across the plateau from the marsh’s edge
 *  to the Vallone, the Austrians’ round the dome’s north face and on east over the plateau. */
const LINE_N = Array.from({ length: 34 }, (_, i) => { const x = 470 - i * 24; return [x, 120 + 14 * Math.sin(x * 0.017) + 40 * smoothstep(-80, -260, x)]; });
const LINE_S = Array.from({ length: 34 }, (_, i) => { const x = -330 + i * 24; return [x, -70 - 10 * Math.sin(x * 0.021 + 1.3) - 50 * smoothstep(-40, 160, x)]; });

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1ª Squadra' }];

export default {
  id: 'hermada',
  name: 'Hermada',
  description: 'May–August 1917, the Tenth and Eleventh Isonzo: the Italian Third Army on the barren Karst before Trieste — the great stony dome of Monte Hermada over the sea and Duino’s castle, the Timavo springs under its foot and the Lisert marshes along the coast, Flondar, Medeazza and Quota 144 in the limestone.',
  epochs: ['1918'],
  region: 'italy',
  airfields: [], // (systems/Airfields.js: dolines, stone walls and marsh — the squadrons fly from Aquileia and Prosecco)
  armies: { nato: ['it'], pact: ['ah'] }, // (the Italian Third Army against Boroević’s Fifth Army)
  sides: { nato: 'Italy', pact: 'Austria-Hungary' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  soft,
  river: water,
  fields: createFields({ seed: SEED, cell: 60, weights: [0.6, 0.05, 0.1, 0.25] as any }),

  theme: {
    // a hot Karst summer: white glare off the limestone, a hazy sea
    fogColor: 0xc4c6c0, fogDensity: 0.0013, skyTop: 0x5f86ae, skyHorizon: 0xd2d6d2, skyBottom: 0x8a8a80,
    sunColor: 0xfff0d8, sunIntensity: 1.7, sunDisk: 0.3, clouds: 0.25, cloudLight: 0xf2f2ee, cloudDark: 0x9aa2aa,
    sunDir: [0.4, 0.75, 0.3], hemiSky: 0xc8d4e0, hemiGround: 0x7a7660, hemiIntensity: 1.3, rimColor: 0xe8e4d8, rimIntensity: 0.25,
    terrain: {
      grass: '#6a6a44', grassAlt: '#62663e', dryGrass: '#8e865a', dirt: '#7a6c54', rock: '#7c7a5c', // (the plateau’s 40 m all count as ‘high’ to world/Terrain.js: its scrubby grey-olive karst, the bare limestone in surface())
      pasture: '#76784a', ploughed: '#7e6a50', stubble: '#ae9e66', meadow: '#7c8250',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (y < 0.25) return [0x5a5648, 0.95];                                                    // under the water
        const inl = inland(x, z);
        if (inl < 40 && y < 2.5) return [0xbab4a4, 0.95];                                         // the pebble shore
        if (railD(x, z) < 3) return [0x5e5850, 0.95];                                             // the railway’s ballast
        if (roadD(x, z, 4) < 3.2) return [0xc0b8a4, 0.9];                                         // the white limestone roads
        const mk = marshK(x, z);
        if (mk > 0.2) return [0x5a6440, Math.min(0.9, mk)];                                       // reeds and rushes
        for (const [dx, dz, dr] of DOLINES) if (Math.abs(x - dx) < dr && Math.abs(z - dz) < dr && Math.hypot(x - dx, z - dz) < dr * 0.5) return [0x7a5a3e, 0.6]; // the red earth in the dolines’ bottoms
        const dome = smoothstep(150, 40, Math.hypot(x - DOME[0], z - DOME[1]));
        if (dome > 0.1) return [0xb6b2a6, Math.min(0.85, dome)];                                  // the Hermada’s crown shelled to bare stone
        const pk = plateauK(x, z);
        if (pk > 0.2) { const n = fbm(noise, x * 0.035 + 7, z * 0.035, 2); if (n > 0.05) return [n > 0.3 ? 0xb2aea2 : 0x9a968a, Math.min(0.8, pk * (n + 0.1) * 2)]; } // bare limestone
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-60, 0, 60] }, pact: { x: 0, z: -BASE_Z, entries: [-60, 0, 60] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: -40, z: -360 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Schwarm' })),
  },

  /** Each side’s fire trench (zig-zagged, wire in front, gaps at the roads), MG posts on its heights; months of shelling in between. */
  battlefield(game: any) {
    const dry = (x: number, z: number) => height(x, z) > 1 && marshK(x, z) < 0.2 && timD(x, z) > 16;
    const keep = (b: number[]) => roadD(b[0], b[1]) > b[2] * 0.5 + 5 && dry(b[0], b[1]) && inland(b[0], b[1]) > 40 && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 20) && Math.hypot(b[0], Math.abs(b[1]) - BASE_Z) > 60;
    const dens = (x: number, z: number) => 1.6 * (1 - smoothstep(60, 220, Math.abs(z - 25))) + 0.05;
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter(keep).map((b) => [b[0], b[1], b[2], Math.max(0.2, Math.min(b[3], 1.4))]);
    const ruins = game.buildings.list.filter((b: any) => b.name !== 'castle' && Math.abs(b.z) < 300 && mulberry32(b.index * 7 + SEED)() < 0.7).map((b: any) => b.index);
    const works: any[] = [];
    for (const [f, line] of [['nato', LINE_N], ['pact', LINE_S]] as const) {
      for (const w of trenchLine(line as number[][], f, { zig: 2.5, wireAt: 18, belts: 1, gapEvery: 50 })) if (roadD(w.x, w.z) > 9 && dry(w.x, w.z) && inland(w.x, w.z) > 40 && points.every((p) => Math.hypot(p.x - w.x, p.z - w.z) > 28)) works.push(w);
      for (const id of f === 'nato' ? ['B', 'C', 'D'] : ['H', 'I', 'J']) { const p = points.find((q) => q.id === id), s = f === 'nato' ? 1 : -1; for (const dx of [-12, 12]) if (roadD(p.x + dx, p.z - 16 * s) > 7) works.push({ kind: 'mgNest', x: p.x + dx, z: p.z - 16 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f }); }
    }
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number) => height(x, z) < 1 || marshK(x, z) > 0.15 || timD(x, z) < timHW(x) + 8;
    const skip = (x: number, z: number) => roadD(x, z) < 9 || railD(x, z) < 8 || wet(x, z) || inland(x, z) < 40 || DOLINES.some(([dx, dz, dr]) => Math.hypot(x - dx, z - dz) < dr + 4);
    const stone = 0xb0aa9c;

    // the karst villages: stone houses round their wells — Jamiano, Medeazza, Ceroglie, Flondar’s farms, the huts on Quota 12
    for (const [id, n, sp] of [['D', 8, 1.1], ['G', 8, 1.1], ['J', 8, 1.1], ['F', 5, 1.2], ['B', 4, 0.9]] as [string, number, number][]) { const [x, z] = at(id); farmVillage(props, x, z, n, SEED + Math.round(x * 3 + z * 7), skip, sp); }
    props.rand = mulberry32(SEED + 21);
    props.church({ x: at('D')[0] + 30, z: at('D')[1] + 28, yaw: Math.PI });
    props.church({ x: at('J')[0] + 28, z: at('J')[1] - 30, yaw: 0 });
    // San Giovanni in Tuba: the church by the springs, the mill over the water
    props.church({ x: at('E')[0] + 26, z: at('E')[1] + 26, yaw: Math.PI / 2 });
    props.townHouse({ x: -300, z: -40, yaw: 0.6, width: 8, depth: 7, storeys: 2, name: 'mill', damaged: 0.5 });
    // Duino: the village by the sea and the castle on its rock — curtain walls, the keep, the old ruin below
    {
      const [hx, hz] = at('H');
      farmVillage(props, hx + 34, hz + 10, 7, SEED + 31, skip, 1);
      const cx = hx - 30, cz = hz - 34, g = terrain.heightAt(cx, cz);
      const b = props.beginBuilding('castle', cx, cz, 0.6, 22, 18);
      b.plaster = stone;
      props.shell(b, { height: 7, key: 'stone', color: stone, t: 1.2, bay: 3, sill: 3.5, head: 4.6, frame: 0x7a7468, front: [], back: [2] });
      props.piece('stone', b, 0, 7.3, 0, 22.6, 0.6, 18.6, 0x9e988a);
      props.endBuilding();
      const [kx, kz] = PropBuilder.local(cx, cz, 0.6, 8, -6);
      props.box('stone', kx, g + 10, kz, 7, 20, 7, 0.6, 0xa8a294);
      cover.addBox({ x: kx, z: kz, yaw: 0.6, length: 7, thickness: 7, height: 20 });
      const ox = cx - 26, oz = cz - 30;
      props.box('stone', ox, terrain.heightAt(ox, oz) + 4, oz, 6, 8, 6, 0.1, 0x8e887a, 0.04, -0.03); // the old castle’s broken tower
    }
    // the railway: the track, a few wagons left on it, the station hut by the springs
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    props.wagon({ x: -300, z: 250, yaw: Math.atan2(-56, -200), kind: 'box' });
    props.wagon({ x: -290, z: -250, yaw: Math.atan2(-32, -80), kind: 'open' });
    props.house({ x: -245, z: 70, yaw: 0.2, width: 9, depth: 6, height: 3.4 });
    // the bridges over the Timavo: stone parapets where the coast road and the railway cross
    for (const line of [ROADS[0], ROADS[6], RAIL]) for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let u = 1.5; u < L; u += 3) { const x = ax + ux * u, z = az + uz * u; if (timD(x, z) > timHW(x) + 4) continue; for (const s of [-1, 1]) props.box('stone', x + uz * 3.8 * s, 1.8, z - ux * 3.8 * s, 0.5, 1, 3.2, Math.atan2(ux, uz), 0x9a9486); }
    }
    // caverns in the dome’s flanks (the Hermada’s galleries) and in Quota 144: dark mouths with a sandbag wall
    for (const [x, z, s] of [[-130, -40, 1], [-40, -120, 1], [-250, -90, 1], [150, 120, -1], [230, 130, -1]]) {
      if (roadD(x, z) < 10) continue;
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + 1.4, z, 4.5, 3, 2.5, 0, 0x2a2824);
      props.sandbagRing({ x, z: z + s * 4, radius: 3, toward: s });
    }
    // dry-stone walls round the patches of soil, loose limestone, sangars (each half its own dice)
    for (const s of [1, -1]) {
      const r = mulberry32(SEED + (s > 0 ? 41 : 57));
      for (let i = 0; i < 460; i++) {
        const x = (r() * 2 - 1) * 480, z = s * (15 + r() * 520), big = r();
        if (nearPoint(x, z, 30) || skip(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40) continue;
        if (big < 0.45) props.boulder({ x, z, radius: 0.6 + r() * 1.4 });
        else props.lowWall({ x, z, yaw: r() * 3, length: 6 + r() * 8, height: 1.0, color: stone });
      }
      for (let i = 0, n = 0; i < 2000 && n < 14; i++) {
        const x = (r() * 2 - 1) * 460, z = s * (140 + r() * 320);
        if (skip(x, z) || nearPoint(x, z, 45)) continue;
        n++;
        buildSite(props, { kind: ['fieldwall', 'rocks', 'farm', 'fieldwall'][n % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
      }
    }
    // the stone parapets in front of each fire trench (rock that would not take a spade)
    for (const [line, s] of [[LINE_N, 1], [LINE_S, -1]] as [number[][], number][]) for (const [x, z0] of line) {
      const z = z0 - s * 7;
      if (skip(x, z) || nearPoint(x, z, 30)) continue;
      props.lowWall({ x, z, yaw: 0, length: 9, height: 0.9, color: 0xa29c8e });
    }
    commandPost(props, this.bases.nato, -1, 0x6e6c58);
    commandPost(props, this.bases.pact, 1, 0x5e6250);
    props.finish();
    water.build(scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 32 }, { x: 0, z: -BASE_Z, r: 32 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => roadD(x, z) < 6 || railD(x, z) < 5 || wet(x, z) || inland(x, z) < 40 }];
    // stunted scrub (sumac, hornbeam, juniper) and a few black pines; thicker on the karst’s foot and the dome’s seaward
    // slope, bare on the crown and in no man’s land
    const scrub0 = (x: number, z: number) => fbm(noise, x * 0.008 + 40, z * 0.008, 3);
    const north = (x: number, z: number) => z > 25;
    const tP = evenThreshold(scrub0, 0.1, north);
    const forest = (x: number, z: number) => {
      const front = 1 - smoothstep(70, 190, Math.abs(z - 25)), w = scrub0(x, z) - (north(x, z) ? 0 : tP - 0.1);
      const crown = smoothstep(120, 60, Math.hypot(x - DOME[0], z - DOME[1]));
      return ((w > 0.1 ? 0.5 : 0.08) * (1 - 0.85 * front) + (lowK(x, z) > 0.1 && lowK(x, z) < 0.9 ? 0.25 : 0)) * (1 - crown);
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, avoid, count: 2600, broadleaf: 0.7, autumn: 0.1, maxY: 140, size: 0.55, forest });
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, avoid, count: 260, broadleaf: 0, autumn: 0, maxY: 140, size: 0.85, forest: (x: number, z: number) => forest(x, z) * 0.6 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [{ test: (x: number, z: number) => roadD(x, z) < 4 || height(x, z) < 0.3 || inland(x, z) < 30 }], density: 1.6, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); pines.update(dt, t); },
    };
  },
} satisfies MapDef;
