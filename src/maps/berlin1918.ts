// Berlin 1918 — a battle that never was. In August 1914 the Entente’s hope was the Russian “steamroller”: millions of
// men rolling west through Posen to Berlin while the French held the Marne. It broke at Tannenberg, and by 1918 Russia
// was out of the war. This map asks what if Germany’s eastern front had collapsed instead, and a Russian army stood on
// the Spree east of the capital in the autumn of 1918, with the Landsturm, the depot battalions and the Replacement
// Army thrown out of the barracks to stop it on the city’s edge.
// The ground is the real south-east of Berlin, compressed: the Spree with its bridges; the Müggelsee, the city’s
// biggest lake; the pine heath on the Brandenburg sand round it; the Müggelberge rising from the lake’s south shore —
// the highest ground in Berlin, with the wooden Müggelturm on top — and the Püttberge dunes north of it; Köpenick’s
// old town on its island where the Dahme meets the Spree, the red-brick Rathaus and the Schloss. In that town hall on
// 16 October 1906 the cobbler Wilhelm Voigt, in a second-hand captain’s uniform, took command of a squad of soldiers
// off the street, arrested the mayor and walked off with the town treasury — the “Captain of Köpenick”, the joke all
// Europe told about Prussian obedience to a uniform. Round it: Oberschöneweide’s AEG cable works, the Schöneweide
// railway yards and gasworks, brick kilns, Spindler’s dye works at Spindlersfeld, the fishermen’s Kietz, Friedrichshagen
// and its brewery, Adlershof by the Johannisthal airfield, garden-colony allotments, the Silesian line on its S-Bahn
// embankment — and on the western horizon, behind the German line, the dome of the Berlin Cathedral and the Reichstag.
// Not mirrored but fair: the Spree runs between the sides and splits round Köpenick island (F), in neither side’s
// hands, a bridge on each arm (Dammbrücke, Lange Brücke); the Stubenrauch railway bridge on the west flank and the
// Dämeritz bridge on the east serve both banks alike. The Müggelsee lies on the river line in the east reach, bulging
// into both banks the same, and each side has an equal height rising from its shore at the same reach: the Püttberge
// (B) for the Russians, the Müggelberge (H) for the Germans, the same 14 m and the same pine woods. Each side has a town
// point at the same reach in the centre (Friedrichshagen, Adlershof) on the same low rise, an industrial point on the
// railway on its west flank (Oberschöneweide, the Schöneweide yards) and a river quarter by the island (Spindlersfeld,
// the Kietz); woods are cut to the same area each side, and each side has a garden colony behind its centre.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { createLakes } from '../world/Lakes.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const CROSS = [-330, 0, 410];                               // the roads over the Spree: Stubenrauch, Köpenick, Dämeritz
const HW = 18;                                              // the Spree (each arm round Köpenick island)
const RAIL_X = -335;                                        // the Silesian line on its embankment, over the Stubenrauch bridge
const noise = createNoise2D(1918_10);
const mid = (x: number) => 11 * Math.sin(x * 0.005 + 0.9) + 6 * Math.sin(x * 0.017) - 3;
const split = (x: number) => 60 * Math.exp(-((x / 100) ** 2));                   // the Spree and the Dahme round Köpenick island
const armN = (x: number) => mid(x) + split(x), armS = (x: number) => mid(x) - split(x);
const river = createRiver({
  path: armN, paths: [armN, armS], halfWidth: HW, level: 0, depth: 2.4, valley: 55,
  crossings: [
    { name: 'Stubenrauch bridge', x: CROSS[0] - 2, kind: 'bridge', width: 13 },
    { name: 'Dammbrücke', x: 0, kind: 'bridge', width: 7, channel: 0 },
    { name: 'Lange Brücke', x: 0, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Dämeritz bridge', x: CROSS[2], kind: 'bridge', width: 7 },
  ],
});
/** The Müggelsee, on the river line in the east reach (its water drawn by the river's sheet). */
const LAKE = { x: 222, z: mid(222), rx: 96, rz: 60, rot: 0.04, depth: 4, seed: 3 };
const lakes = createLakes({ lakes: [LAKE] });
const nearLake = (x: number, z: number) => Math.abs(x - LAKE.x) < 200 && Math.abs(z - LAKE.z) < 150;
const lakeQ = (x: number, z: number) => (nearLake(x, z) ? lakes.q(x, z) : 9);
/** m from the nearer arm's middle (the lake counted as river). */
const away = (x: number, z: number) => Math.min(Math.abs(z - armN(x)), Math.abs(z - armS(x)), nearLake(x, z) ? Math.max(0, (lakeQ(x, z) - 1) * LAKE.rz) + HW : 1e9);
/** Each side's lateral road behind the river, the roads from the crossings to the bases. */
const bankZ = (x: number, north: boolean) => (north ? mid(x) + 170 + 8 * Math.sin(x * 0.01) : mid(x) - 168 + 10 * Math.sin(x * 0.007 + 2));
const roadD = (x: number, z: number) => {
  let d = Math.abs(z - bankZ(x, z > mid(x)));
  for (const bx of CROSS) d = Math.min(d, Math.abs(x - bx));
  return d;
};
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The hasty positions: rifle pits and scrapes each side in the sand. */
const trenchZ = (x: number, north: boolean) => (north ? mid(x) + split(x) * 0.6 + 110 + 9 * Math.sin(x * 0.017) : mid(x) - split(x) * 0.6 - 110 - 10 * Math.sin(x * 0.013 + 2));

/** The heights over the lake [x, z, r, h]: the Püttberge (north) and the Müggelberge (south); a low rise behind each centre town. */
const RISES = [[310, 295, 150, 14], [290, -300, 150, 14], [80, 300, 150, 4.5], [-60, -300, 160, 4.6]];
/** Each side's airfield on the flat west fields (the Johannisthal kind): the tower at (x, z), the strip 55 m behind it. */
const AIR = [{ faction: 'nato', x: -150, z: 400, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -150, z: -400, yaw: -Math.PI / 2, large: false }];
const padK = (x: number, z: number) => smoothstep(150, 128, Math.abs(x + 150)) * smoothstep(62, 44, Math.abs(Math.abs(z) - 430));
const ground = gridCacheSmooth((x: number, z: number) => {
  const d = away(x, z);
  let h = 1.2 + smoothstep(25, 130, d) * (3.2 + fbm(noise, x * 0.004 + (z > mid(x) ? 0 : 40), z * 0.004, 4) * 3.4);
  h += fbm(noise, x * 0.016 + 9, z * 0.016, 3) * 0.9 * smoothstep(40, 140, d);      // the sand's little dunes
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += 0.8 * smoothstep(1, 0.3, Math.hypot(x / 90, (z - mid(x)) / 36));                 // Köpenick island
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 8 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 12;
  for (const bx of CROSS) h += (Math.min(h, 1.3 + d * 0.06) - h) * (1 - smoothstep(5, 18, Math.abs(x - bx))) * (1 - smoothstep(150, 220, d)); // (the descents to the bridges)
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  h += (5.5 - h) * padK(x, z);                                                                   // (the airfields levelled)
  // the S-Bahn embankment: 1.8 m of ballast on a gentle bank, let down to the ground at the river and the road crossings
  const emb = smoothstep(10, 4, Math.abs(x - RAIL_X)) * smoothstep(40, 80, d) * smoothstep(6, 18, Math.abs(z - bankZ(x, z > mid(x))));
  h += 1.8 * emb;
  return Math.max(1.4, h);
}, { x: 640, z: 700 }, 4);
const height = (x: number, z: number) => {
  const h = river.carve(x, z, ground(x, z));
  return nearLake(x, z) ? lakes.carve(x, z, h) : h;
};

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Erkner road', 0, 470, 'centre'),
  P('B', 'Püttberge', 310, 295, 'east'),
  P('C', 'Friedrichshagen', 80, 268, 'centre', { radius: 28 }),
  P('D', 'Oberschöneweide', -290, 315, 'west', { radius: 28 }),
  P('E', 'Spindlersfeld', -170, Math.round(armN(-170) + 62), 'west', { radius: 24 }),
  P('F', 'Köpenick Rathaus', 0, Math.round(mid(0)), 'centre', { radius: 30 }),
  P('G', 'Kietz', 95, Math.round(armS(95) - 60), 'east', { radius: 24 }),
  P('H', 'Müggelberge', 290, -300, 'east'),
  P('I', 'Adlershof', -60, -268, 'centre', { radius: 28 }),
  P('J', 'Schöneweide yards', -290, -315, 'west', { radius: 28 }),
  P('K', 'Treptow road', 0, -470, 'centre'),
] as any[];
const TOWNS = [{ x: points[2].x, z: points[2].z, r: 70 }, { x: points[8].x, z: points[8].z, r: 70 }];
/** The garden colonies behind each centre town [x, z]: 4 × 3 plots of 12 m. */
const COLONIES = [[-120, 250], [70, -380]];
const inColony = (x: number, z: number, r = 0) => COLONIES.some(([cx, cz]) => Math.abs(x - cx) < 24 + r && Math.abs(z - cz) < 18 + r);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'berlin-1918',
  name: 'Berlin 1918',
  description: 'Autumn 1918, as it never was: Germany’s eastern front has collapsed and the Russian steamroller the Entente hoped for in 1914 reaches the Spree east of Berlin. The Müggelsee and the Müggelberge in the pine heath, Köpenick’s island town hall, Schöneweide’s factories, gasworks and railway yards, garden allotments, and the Cathedral dome and the Reichstag on the skyline.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de'] }, // (a Russian army at the gates; the Landsturm, depot battalions and the Replacement Army)
  sides: { nato: 'Russia', pact: 'Germany' },
  conditions: { time: 'day', weather: 'clear' }, // (a bright, cool October day)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1918_10,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191810, cell: 80, weights: [0.3, 0.3, 0.15, 0.25] as any }),

  theme: {
    // a clear, cool autumn day over the Mark Brandenburg
    fogColor: 0xc4ccd2, fogDensity: 0.0011, skyTop: 0x5a86b8, skyHorizon: 0xc8d4dc, skyBottom: 0x9a9c94,
    sunColor: 0xfff0d8, sunIntensity: 1.9, sunDisk: 0.2, clouds: 0.35, cloudLight: 0xf4f4f0, cloudDark: 0x9aa2aa,
    sunDir: [0.5, 0.5, -0.6], hemiSky: 0xc8d8e8, hemiGround: 0x8a8068, hemiIntensity: 1.3, rimColor: 0xd8dce0, rimIntensity: 0.25,
    terrain: {
      grass: '#7e8058', grassAlt: '#888658', dryGrass: '#a89a6a', dirt: '#8a7a5a', rock: '#a09884', strip: '#8a7c5e',
      pasture: '#7c7e56', ploughed: '#7a6a4e', stubble: '#b0a070', meadow: '#768050',
      farmX: [460, 600], farmZ: [520, 640], roads: CROSS, roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x8a8070, 0.85];                                      // the roads: cobbles and sand
        if (Math.abs(x - RAIL_X) < 3) return [0x4e4a44, 0.75];                           // the embankment's ballast
        if (inColony(x, z, -1)) return [0x6a6a3e, 0.45];                                 // the allotments' beds
        const s = fbm(noise, x * 0.02 + 31, z * 0.02, 3) + (y - 5) * 0.02;                  // the Mark's bare sand, more on the heights
        if (s > 0.32) return [0xc8b88c, Math.min(0.8, (s - 0.32) * 5)];
        if (y < 1.7 && away(x, z) < HW + 10) return [0x6a6a4a, 0.6];                    // the reedy banks
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: CROSS }, pact: { x: 0, z: -BASE_Z, entries: CROSS } },
  airfields: AIR,
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side's hasty line: stretches of rifle pits with gaps, a little wire, an MG at each road. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);
      for (const w of trenchLine(pts, f, { wireAt: 16, belts: 1, gapEvery: 30 })) {
        if (roadD(w.x, w.z) < 8 || Math.abs(w.x - RAIL_X) < 8 || away(w.x, w.z) < HW + 10 || inColony(w.x, w.z, 6)) continue;
        const stretch = Math.sin(w.x * s * 0.045) > -0.1;
        if (!stretch || (w.kind === 'wire' && Math.sin(w.x * s * 0.11) < 0.3)) continue;
        works.push(w);
      }
      for (const bx of CROSS) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r || lakeQ(x, z) < 1.12;
    const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > mid(x))) < 26;
    const railD = (x: number) => Math.abs(x - RAIL_X);
    const yardD = (x: number, z: number) => (Math.abs(Math.abs(z) - 315) < 95 ? Math.min(railD(x), Math.abs(x - RAIL_X + 7), Math.abs(x - RAIL_X + 14)) : railD(x));
    const isle = { x: 0, z: mid(0) };
    const skip = (x: number, z: number) => padK(x, z) > 0 || wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z) || yardD(x, z) < 10 || inColony(x, z, 4)
      || Math.hypot(x - isle.x, z - isle.z) < 34;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const BRICK = 0x8e4a36, YBRICK = 0xb89a6a, COPPER = 0x5c8c7a, GOLD = 0xc8a850;
    const dome = (x: number, y: number, z: number, r: number, h: number, color: number) => {
      m4.compose(v.set(x, y, z), q.identity(), v.clone().set(r, h, r)); props.push('plain', new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m4, color);
    };
    const cyl = (x: number, y: number, z: number, r: number, h: number, color: number, key = 'stone') => {
      m4.compose(v.set(x, y + h / 2, z), q.identity(), one); props.push(key, new THREE.CylinderGeometry(r, r, h, 14), m4, color);
    };

    // ---- Köpenick island: the red-brick Rathaus with its tower (the Captain's town hall), the Schloss at the island's tip
    {
      props.rand = mulberry32(1906);
      const x = isle.x + 24, z = isle.z + 2;                                           // (east of the road over the island)
      const b = props.beginBuilding('Köpenick Rathaus', x, z, 0, 26, 15);
      b.plaster = BRICK;
      props.shell(b, { height: 10, key: 'stone', color: BRICK, front: [0], back: [-6], left: [2], t: 0.8, bay: 3.2, sill: 1.6, head: 8.4, frame: 0xd8cfb8 });
      props.gableRoof(b, { eave: 10, pitch: 0.7, color: 0x5a3a30, t: 0.8 });
      props.endBuilding();
      const tx = x + 10, tz = z - 9.5, g = terrain.heightAt(tx, tz);
      props.box('stone', tx, g + 11, tz, 5, 22, 5, 0, BRICK);
      props.box('metal', tx, g + 18, tz, 5.1, 1.4, 1, 0, 0x2a2420);
      m4.compose(v.set(tx, g + 26, tz), q.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)), one); props.push('plain', new THREE.ConeGeometry(3.6, 8, 4), m4, COPPER);
      cover.addBox({ x: tx, z: tz, yaw: 0, length: 5, thickness: 5, height: 22 });
      const sb = props.beginBuilding('Schloss Köpenick', isle.x - 44, isle.z - 4, 0, 26, 13);
      sb.plaster = 0xe2d6b4;
      props.shell(sb, { height: 10, key: 'plaster', color: 0xe2d6b4, front: [0], back: [0], left: [0], t: 0.8, bay: 3.2, sill: 1.6, head: 8, frame: 0xf2ece0 });
      props.gableRoof(sb, { eave: 10, pitch: 0.5, color: 0x8a4a3a, t: 0.8 });
      props.endBuilding();
      for (const [dx, dz, yaw] of [[-20, 13, 0], [-20, -13, Math.PI], [49, 10, Math.PI / 2], [49, -8, Math.PI / 2]]) {
        props.townHouse({ x: isle.x + dx, z: isle.z + dz, yaw, width: 9, depth: 8, storeys: 2, damaged: 0.05 });
      }
    }
    // ---- Friedrichshagen (north): Bölschestraße's houses, the Bürgerbräu brewery and its chimney
    // ---- Adlershof (south): the same street of houses, the aircraft works by the Johannisthal field
    for (const [p, seed] of [[points[2], 1], [points[8], 2]] as const) {
      props.rand = mulberry32(1918_20 + seed);
      for (const side of [1, -1]) for (let x = p.x - 72; x <= p.x + 72; x += 13) {
        const z = p.z + side * 22;
        if (Math.abs(x - p.x) < 14 || skip(x, z)) continue;
        props.townHouse({ x, z, yaw: side > 0 ? Math.PI : 0, width: 11, depth: 9, storeys: 2 + (props.rand() < 0.5 ? 1 : 0), damaged: 0.05 });
      }
      const s = p.z > 0 ? 1 : -1;
      props.hall({ x: p.x + 40, z: p.z + 52 * s, yaw: 0, width: 28, depth: 14, height: 9, color: seed === 1 ? YBRICK : 0x9a9488, name: seed === 1 ? 'Bürgerbräu brewery' : 'aircraft works' });
      props.chimney({ x: p.x + 62, z: p.z + 52 * s, height: 26 });
      props.church({ x: p.x - 40, z: p.z + 50 * s, yaw: s > 0 ? Math.PI : 0 });
    }
    // ---- the works on the railway: Oberschöneweide's AEG cable works and a brick kiln (north),
    //      the Schöneweide yards and the gasworks (south) — the same halls, stacks and holders each side
    for (let z = -560; z < 560; z += 20) props.rails({ x0: RAIL_X, z0: z, x1: RAIL_X, z1: z + 20 });
    for (const s of [points[3], points[9]]) {
      const north = s.z > 0, k = north ? 1 : -1;
      for (const dx of [-7, -14]) for (let z = s.z - 80; z < s.z + 80; z += 20) props.rails({ x0: RAIL_X + dx, z0: z, x1: RAIL_X + dx, z1: z + 20 });
      props.hall({ x: RAIL_X + 30, z: s.z - 4 * k, yaw: Math.PI / 2, width: 34, depth: 16, height: 10, color: BRICK, name: north ? 'AEG cable works' : 'engine shed' });
      props.hall({ x: s.x + 48, z: s.z + 30 * k, yaw: 0, width: 30, depth: 14, height: 9, color: north ? BRICK : 0x7a5a46, name: north ? 'AEG cable works' : 'gasworks retort house' });
      props.hall({ x: s.x + 40, z: s.z - 40 * k, yaw: 0, width: 22, depth: 10, height: 6, color: 0x7e5a44, name: north ? 'brick kiln' : 'goods shed' });
      props.chimney({ x: s.x + 66, z: s.z - 40 * k, height: 30 });
      props.chimney({ x: s.x + 70, z: s.z + 30 * k, height: 34 });
      props.tanks({ x: s.x + 30, z: s.z + 70 * k, yaw: 0, count: 2, radius: 9, height: north ? 10 : 15, color: 0x6e6a60 });
      props.rand = mulberry32(1918 + k);
      for (const [dx, dz, kind] of [[0, 40, 'box'], [-7, -30, 'box'], [-7, -16, 'tank'], [-14, 10, 'box'], [-14, 24, 'open'], [-14, -48, 'box'], [0, -56, 'box'], [-7, 54, 'box']] as const) {
        props.wagon({ x: RAIL_X + dx, z: s.z + dz * k, yaw: 0, kind, color: [0x5a3426, 0x4e3a2a, 0x3e3a34][Math.floor(props.rand() * 3)] });
      }
    }
    // ---- the river quarters: Spindlersfeld's dye works (north), the fishermen's Kietz (south)
    for (const [p, seed, works] of [[points[4], 1, true], [points[6], 2, false]] as const) {
      props.rand = mulberry32(1918_30 + seed);
      for (let i = 0, k = 0; k < 10 && i < 500; i++) {
        const a = props.rand() * Math.PI * 2, d = 20 + props.rand() * 50, x = p.x + Math.cos(a) * d * 1.3, z = p.z + Math.sin(a) * d * 0.9;
        if (skip(x, z) || Math.hypot(x - p.x, z - p.z) < 14) continue;
        const yaw = Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2;
        if (works) props.townHouse({ x, z, yaw, width: 9, depth: 8, storeys: 2, damaged: 0.05 });
        else props.house({ x, z, yaw, width: 8 + props.rand() * 2, depth: 6 });
        k++;
      }
      const s = p.z > mid(p.x) ? 1 : -1;
      for (const dx of [-26, 26]) {
        const x = p.x + dx, z = p.z + 30 * s;
        if (!skip(x, z)) props.hall({ x, z, yaw: 0, width: works ? 24 : 14, depth: 10, height: works ? 7 : 4.5, color: works ? YBRICK : 0x6a5a48, name: works ? 'Spindler dye works' : 'boat shed' });
      }
      if (works) props.chimney({ x: p.x, z: p.z + 46 * s, height: 24 });
    }
    // ---- the towers on the heights: the wooden Müggelturm (south), a fire-watch tower on the Püttberge (north)
    for (const p of [points[1], points[7]]) {
      const x = p.x + 18, z = p.z, g = terrain.heightAt(x, z), hh = 14;
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) props.box('plain', x + dx, g + hh / 2, z + dz, 0.4, hh, 0.4, 0, 0x5a4632);
      for (let y = 3; y < hh; y += 3.5) props.box('plain', x, g + y, z, 4.4, 0.25, 4.4, 0, 0x6a5440);
      props.box('plain', x, g + hh + 1.2, z, 5, 2.4, 5, 0, 0x7a6248);
      m4.compose(v.set(x, g + hh + 3.6, z), q.setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)), one); props.push('plain', new THREE.ConeGeometry(4, 2.6, 4), m4, 0x4a3a30);
      cover.addBox({ x, z, yaw: 0, length: 4.4, thickness: 4.4, height: 3 });
    }
    // ---- the garden colonies: allotment plots, each with its shed and a picket round it
    for (const [cx, cz] of COLONIES) {
      props.rand = mulberry32(1918_40 + Math.round(cz));
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        const x = cx - 18 + i * 12, z = cz - 12 + j * 12, g = terrain.heightAt(x + 3, z + 3);
        props.box('plain', x + 3, g + 1.1, z + 3, 2.6, 2.2, 2.2, 0, [0x7a6a4a, 0x5e6a4a, 0x8a5a3a][Math.floor(props.rand() * 3)]);
        props.box('plain', x + 3, g + 2.3, z + 3, 3, 0.2, 2.6, 0, 0x3e3a34);
        cover.addBox({ x: x + 3, z: z + 3, yaw: 0, length: 2.6, thickness: 2.2, height: 2.2 });
        props.box('plain', x - 2, g + 0.5, z - 2, 1.2, 1, 1.2, 0, 0x4a6a2a);                    // a currant bush
      }
      for (const [dx, dz, yaw, L] of [[0, -18, 0, 48], [0, 18, 0, 48], [-24, 0, Math.PI / 2, 36], [24, 0, Math.PI / 2, 36]]) {
        for (let t = -L / 2 + 3; t < L / 2; t += 6) if (Math.abs(t) > 4) props.lowWall({ x: cx + dx + (yaw ? 0 : t), z: cz + dz + (yaw ? t : 0), yaw, length: 6, height: 0.9, color: 0x8a7a5a });
      }
    }
    // ---- barricades round the towns, the same number each side
    for (const t of TOWNS) {
      props.rand = mulberry32(1918_5 + Math.round(t.z));
      for (let i = 0, k = 0; k < 8 && i < 300; i++) {
        const a = props.rand() * Math.PI * 2, d = 26 + props.rand() * 40, x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
        if (skip(x, z) || roadD(x, z) < 10) continue;
        props.logBarricade({ x, z, yaw: a + Math.PI / 2, length: 5 + props.rand() * 3 });
        k++;
      }
    }
    // the farms and villages out on the flanks
    farmVillage(props, 400, 420, 4, 191810, skip, 1.1);
    farmVillage(props, 400, -420, 4, 191811, skip, 1.1);
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 70 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 140 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }

    // ---- the skyline beyond the German line: the city's roofs, stacks and spires, the Cathedral dome and the Reichstag
    {
      props.rand = mulberry32(1894);
      const SZ = -735;
      const LAND = [[-190, 50], [70, 40]];                                                     // (room kept for the two landmarks)
      for (let x = -620; x <= 620; x += 18) {
        if (LAND.some(([lx, r]) => Math.abs(x - lx) < r)) continue;
        for (const dz of [0, 26]) {
          const w = 12 + props.rand() * 8, hh = 13 + props.rand() * 9, zz = SZ - dz + (props.rand() - 0.5) * 10, g = terrain.heightAt(x, zz);
          props.box('stone', x, g + hh / 2 - 1, zz, w, hh, 14, 0, [0x9a9284, 0x8a8478, 0xa89c84, 0x7e7a72][Math.floor(props.rand() * 4)]);
          props.box('plain', x, g + hh - 0.6, zz, w + 0.4, 1.2, 14.4, 0, 0x5a4a44);
        }
        if (props.rand() < 0.14) props.chimney({ x: x + 6, z: SZ - 40, height: 30 + props.rand() * 12 });
        else if (props.rand() < 0.07) {
          const g = terrain.heightAt(x, SZ - 14);
          props.box('stone', x, g + 18, SZ - 14, 5, 36, 5, 0, 0x8a7a66);
          m4.compose(v.set(x, g + 42, SZ - 14), q.identity(), one); props.push('plain', new THREE.ConeGeometry(3.4, 12, 6), m4, COPPER);
        }
      }
      // the Berlin Cathedral: the sandstone block, the great copper dome on its drum, a tower with a cupola at each corner
      {
        const x = 70, z = SZ - 10, g = terrain.heightAt(x, z), SAND = 0x9e9886;
        props.box('stone', x, g + 12, z, 58, 26, 40, 0, SAND);
        cyl(x, g + 25, z, 13, 10, SAND);
        dome(x, g + 35, z, 13.5, 16, COPPER);
        cyl(x, g + 50, z, 2.2, 6, COPPER, 'plain');
        dome(x, g + 56, z, 2.4, 2.4, GOLD);
        props.box('metal', x, g + 60, z, 0.4, 3, 0.4, 0, GOLD);
        for (const [dx, dz] of [[-26, -17], [26, -17], [-26, 17], [26, 17]]) {
          props.box('stone', x + dx, g + 17, z + dz, 8, 34, 8, 0, SAND);
          dome(x + dx, g + 34, z + dz, 4.2, 5.5, COPPER);
        }
      }
      // the Reichstag: the long block, a square tower at each corner, the glass-and-steel dome over the middle
      {
        const x = -190, z = SZ - 12, g = terrain.heightAt(x, z), STONE = 0xa8a08a;
        props.box('stone', x, g + 10, z, 88, 22, 50, 0, STONE);
        for (const [dx, dz] of [[-40, -21], [40, -21], [-40, 21], [40, 21]]) props.box('stone', x + dx, g + 14, z + dz, 13, 30, 13, 0, STONE);
        props.box('stone', x, g + 24, z, 26, 8, 26, 0, STONE);
        dome(x, g + 28, z, 13, 11, 0x7a8a8c);
        props.box('metal', x, g + 40, z, 3, 2.4, 3, 0, 0x5a6a6a);
      }
    }

    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || yardD(x, z) < 6 || inColony(x, z, 2) || Math.hypot(x - isle.x, z - isle.z) < 30 }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3);
    const tN = 0.12, tP = evenThreshold(wood, tN, (x, z) => z > mid(x));
    const hillK = (x: number, z: number) => Math.max(...[0, 1].map((i) => smoothstep(RISES[i][2] * 0.85, 30, Math.hypot(x - RISES[i][0], z - RISES[i][1]))));
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4500, hedges: 700, autumn: 0.45, broadleaf: 0.25,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z) || padK(x, z) > 0) return 0.03;
        if (TOWNS.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + 20)) return 0.04;
        if (hillK(x, z) > 0.2 && roadD(x, z) > 10 && !nearPoint(x, z, 26)) return 0.85;      // the pine-clad heights over the lake
        if (away(x, z) < 45) return 0.2;                                                     // alders and willows on the banks
        return Math.abs(x) > 470 || wood(x, z) > (z > mid(x) ? tN : tP) ? 0.8 : 0;           // the pine heath
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
