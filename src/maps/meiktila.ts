// Meiktila, March 1945 (1945 only; Burma; the big field, 1.0 × 1.12 km). Slim’s masterstroke: while the Japanese
// watched the Irrawaddy crossings at Mandalay, the 17th Indian Division and the Shermans of 255th Tank Brigade drove
// a hundred miles through the dry zone and stormed Meiktila — the Japanese base and road and rail hub in the heart of
// Burma — in four days (28 Feb – 3 Mar). Then the Japanese turned and fought for it all March: the town, its lakes and
// the airfields the division lived off, flown in by Dakotas. Meiktila lies between its two lakes, joined by a narrow
// channel the Mandalay–Pyawbwe road crosses on its bridges; the plain round it is the dry zone in the hot season:
// open, dusty, bare paddy and scrub, toddy palms, pagodas and stupas on every rise.
// Here the lakes lie across the middle of the field (x): North Lake in the west, South Lake in the east, running out
// past both edges, with three ways over — the Kyigon causeway (west), the town bridges between the lakes (centre),
// the railway bridge (east). The 14th Army comes down the Mandalay road from the north (+z, Mahlaing), the Japanese up
// the Pyawbwe road from the south. The Thazi–Myingyan railway runs along the south shore.
// Not a mirror but fair: the lakes split the field and neither side starts on them. Each side has one rise across its
// front, as high and as gentle (Pagoda Hill, a long ridge crowned with stupas west of the road; Point 860, a round hill
// east of it with a lower spur running off — about the same share of the high ground on each half), one village with its palms on a flank (Kyigon; the Thazi road), one walled or built-up spot on the other
// flank (the main airfield’s edge; the old hospital lines), one lakeside point by a crossing on its own shore (the
// dak bungalow; the station) and the town between them both; one low tell behind each front. Every point lies about
// as far from one base as its counterpart does from the other.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1945_03);

// the lakes: one course across the field, [x, z, half-width] — wide where the lakes are, narrow at the three crossings
// (two equal points either side of each crossing, so the bridge spans water of the river's own half-width)
const HW = 14;
const LAKE = [
  [-640, 0, 36], [-470, 22, 44], [-380, 30, 70],                    // North Lake
  [-282, -6, HW], [-238, -14, HW],                                  // the Kyigon causeway (x -260)
  [-160, -30, 62], [-70, -22, 54],
  [-22, 2, HW], [22, -2, HW],                                       // the town bridges (x 0), the channel between the lakes
  [100, 20, 54], [180, 44, 70],                                     // South Lake
  [238, 18, HW], [282, 12, HW],                                     // the railway bridge (x 260)
  [370, -10, 50], [470, 0, 44], [640, 10, 36],
];
const XING = { west: { x: -260, z: -10 }, centre: { x: 0, z: 0 }, east: { x: 260, z: 15 } };
const river = createRiver({
  path: LAKE,
  halfWidth: HW,
  level: 0,
  depth: 2.4,
  valley: 50,
  crossings: [
    { name: 'Kyigon causeway', x: XING.west.x, z: XING.west.z, kind: 'bridge', width: 9 },
    { name: 'Meiktila bridges', x: XING.centre.x, z: XING.centre.z, kind: 'bridge', width: 11 },
    { name: 'railway bridge', x: XING.east.x, z: XING.east.z, kind: 'bridge', width: 9 },
  ],
});

const KYIGON = { x: -320, z: 250 };      // B
const PAGODA = { x: -60, z: 243 };       // C: Pagoda Hill
const AIRFIELD = { x: 310, z: 215 };     // D: the main airfield’s edge
const DAK = { x: -310, z: 64 };          // E: the dak bungalow by the causeway (north shore)
const STATION = { x: 275, z: -62 };      // G: Meiktila station (south shore)
const HOSPITAL = { x: -285, z: -205 };   // H
const P860 = { x: 110, z: -252 };        // I: Point 860
const THAZI = { x: 350, z: -235 };       // J

// the rises: [ax, az, bx, bz, width, height] — Pagoda Hill, a long ridge west of the road (north); Point 860, a round
// hill east of it (south) with a lower spur running off south-east
const RISES = [[-190, 257, 40, 229, 34, 9.5], [110, -252, 110.1, -252, 50, 9.5], [130, -262, 290, -330, 32, 7]];
const TELLS = [[190, 340, 55, 4], [-170, -345, 60, 5]];              // a low tell behind each front
const rise = (x: number, z: number, [ax, az, bx, bz, w, h]: number[]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return h * Math.exp(-((Math.hypot(x - ax - dx * t, z - az - dz * t) / w) ** 2)) * (0.85 + 0.15 * Math.sin(t * Math.PI));
};

// the roads: the Mandalay–Pyawbwe road over the town bridges, one over each of the other crossings, and the entries
const ROADS = [
  [[0, 560], [0, BASE_Z], [18, 380], [12, 200], [0, 46], [0, -46], [-12, -200], [20, -380], [0, -BASE_Z], [0, -560]],
  [[-140, 560], [-140, BASE_Z], [-230, 380], [KYIGON.x + 36, KYIGON.z], [-260, 120], [-260, 36], [-260, -56], [-240, -130], [HOSPITAL.x + 52, HOSPITAL.z], [-160, -380], [-140, -BASE_Z], [-140, -560]],
  [[140, 560], [140, BASE_Z], [230, 380], [AIRFIELD.x - 40, AIRFIELD.z], [262, 120], [260, 61], [260, -31], [272, -130], [THAZI.x - 40, THAZI.z], [230, -380], [140, -BASE_Z], [140, -560]],
];
const RAIL = [[-560, -160], [-320, -130], [-170, -142], [-60, -92], [60, -76], [200, -72], [300, -92], [400, -112], [560, -132]];
const roadD = (x: number, z: number) => Math.min(segDist(ROADS[0], x, z), segDist(ROADS[1], x, z), segDist(ROADS[2], x, z));
const railD = (x: number, z: number) => segDist(RAIL, x, z);
const RUNWAY = { x0: 190, x1: 450, z: AIRFIELD.z + 6, hw: 16 };    // the main airfield’s strip, along x
const onRunway = (x: number, z: number) => x > RUNWAY.x0 && x < RUNWAY.x1 && Math.abs(z - RUNWAY.z) < RUNWAY.hw;

// the built-up spots, levelled: [x, z, r, height]
const FLAT = [[KYIGON.x, KYIGON.z, 56, 3], [HOSPITAL.x, HOSPITAL.z, 56, 3], [THAZI.x, THAZI.z, 50, 3.2], [DAK.x, DAK.z, 30, 1.4], [STATION.x, STATION.z - 30, 34, 1.4]];

/** The dry plain, the rises and the rim: everything smooth (cached on a 2 m grid; the lakes are carved after). */
const ground = gridCacheSmooth((x: number, z: number) => {
  const ax = Math.abs(x), az = Math.abs(z);
  let h = 3.6 + fbm(noise, x * 0.004, z * 0.004, 4) * 2.4 + fbm(noise, x * 0.018 + 7, z * 0.018, 2) * 0.5;
  for (const r of RISES) h += rise(x, z, r);
  for (const [tx, tz, tr, th] of TELLS) h += th * Math.max(0, 1 - Math.hypot(x - tx, z - tz) / tr) ** 1.3;
  h += smoothstep(500, 620, ax) * 12 + smoothstep(560, 680, az) * 10;                    // the plain’s rim beyond the edges
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  for (const [fx, fz, fr, fh] of FLAT) h += (fh - h) * smoothstep(fr, fr - 22, Math.hypot(x - fx, z - fz));
  if (ax < 520) {                                                                          // the airfield: graded flat round its strip
    const dx = Math.max(0, RUNWAY.x0 - x, x - RUNWAY.x1), dz = Math.max(0, Math.abs(z - RUNWAY.z) - RUNWAY.hw - 8);
    h += (3.2 - h) * smoothstep(24, 4, Math.hypot(dx, dz));
  }
  return h;
}, { x: 700, z: 760 }, 2);

const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

/** The groves round the villages and the scrub jungle in the hollows: mango, tamarind, thorn. */
const grove = gridCache((x: number, z: number) => smoothstep(0.18, 0.5, fbm(noise, x * 0.007 + 5, z * 0.007 - 3, 3)), { x: 520, z: 580 }, 4);

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon, 1/7th Gurkha Rifles' }];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Mahlaing road', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Kyigon', x: KYIGON.x, z: KYIGON.z, owner: null, sector: 'west' },
  { id: 'C', name: 'Pagoda Hill', x: PAGODA.x, z: PAGODA.z, owner: null, sector: 'centre' },
  { id: 'D', name: 'Meiktila airfield', x: AIRFIELD.x, z: AIRFIELD.z, owner: null, sector: 'east' },
  { id: 'E', name: 'Dak bungalow', x: DAK.x, z: DAK.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Meiktila', x: 0, z: 0, owner: null, sector: 'centre', radius: 26 },
  { id: 'G', name: 'Meiktila station', x: STATION.x, z: STATION.z, owner: null, sector: 'east' },
  { id: 'H', name: 'Hospital lines', x: HOSPITAL.x, z: HOSPITAL.z, owner: null, sector: 'west' },
  { id: 'I', name: 'Point 860', x: P860.x, z: P860.z, owner: null, sector: 'centre' },
  { id: 'J', name: 'Thazi road', x: THAZI.x, z: THAZI.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Pyawbwe road', x: 30, z: -470, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'meiktila',
  name: 'Meiktila',
  description: 'Burma, March 1945: the 14th Army’s armour has struck through the dry zone into Meiktila, the Japanese base between its two lakes, and both sides fight for the town, its bridges and the airfield. Open, dusty plain with toddy palms and scrub, pagodas on the rises, the railway along the lake shore.',
  epochs: ['1945'],
  region: 'pacific',                                   // (the menu’s Asia & Pacific: maps/index.js REGIONS)
  pacific: true,                                       // (data/factions.js armiesFrom: the Imperial Army fights here)
  sides: { nato: 'Britain', pact: 'Japan' },
  armies: { nato: ['brit14'], pact: ['jp'] },          // (the 14th Army’s 17th Indian Division and 255th Tank Brigade against the Japanese 15th and 33rd Armies)
  conditions: { time: 'day', weather: 'clear' },       // (the hot season: dust and glare)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1945,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 1945_03, cell: 60 }),
  woods: (x: number, z: number) => grove(x, z) * 0.6,

  theme: {
    // March in the dry zone: a white-hot sky, dust haze, hard light
    fogColor: 0xd6cab0, fogDensity: 0.0009,
    skyTop: 0x86a8c8, skyHorizon: 0xe0d6c0, skyBottom: 0xb0a080,
    sunColor: 0xfff0d0, sunIntensity: 2.1, sunDisk: 0.8,
    clouds: 0.15, cloudLight: 0xf2ede2, cloudDark: 0xc8bea8,
    sunDir: [0.35, 0.8, -0.4],
    hemiSky: 0xd4dae0, hemiGround: 0x8a7650, hemiIntensity: 1.2,
    rimColor: 0xf0dcc0, rimIntensity: 0.3,
    terrain: {
      grass: '#a69460', grassAlt: '#9c8a58', dryGrass: '#bca670', dirt: '#9a6a46', rock: '#9a8a6a',
      pasture: '#8e8a4c', ploughed: '#8a5c3a', stubble: '#b4a066', meadow: '#8a8e4e',   // bare paddy, stubble, the odd green patch by the water
      farmX: [430, 490], farmZ: [120, 175], roads: [], roadZ: 0,                          // (the roads are painted below)
      surface(x: number, z: number) {
        if (railD(x, z) < 3.5) return [0x5e5244, 0.9];                                    // ballast
        const rd = roadD(x, z);
        if (rd < 3.8) return [0x9a5e3a, 0.85];                                            // red laterite
        if (rd < 6.5) return [0xa47048, 0.35];
        if (onRunway(x, z)) return [0xa8784e, 0.8];                                       // the strip: rolled laterite
        const I = river.project(x, z);
        if (I.d < I.hw + 10) return [0x6a5a40, 0.6 * smoothstep(I.hw + 10, I.hw + 2, I.d)]; // the shore’s cracked mud
        const g = grove(x, z);
        return g > 0.5 ? [0x7a7444, (g - 0.5) * 0.5] : null;                               // leaf litter under the groves
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-140, 0, 140] }, pact: { x: 0, z: -BASE_Z, entries: [-140, 0, 140] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1st Platoon, 214th Infantry' })),
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1945);
    const M = new THREE.Matrix4();
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const wet = (x: number, z: number, m: number) => { const I = river.project(x, z); return I.d < I.hw + m; };
    const clear = (x: number, z: number, m = 8) => roadD(x, z) > m && railD(x, z) > m && !wet(x, z, m + 4) && !onRunway(x, z);
    const WHITE = 0xe8e2d4, GOLD = 0xc8a040, THATCH = 0x9a8456, TIN = 0x7a786e;

    /** A stupa: whitewashed terraces, the bell, the gilded spire (`s`: its scale; 1 ≈ 9 m high). */
    const stupa = (x: number, z: number, s: number, gilt = false) => {
      const g = terrain.heightAt(x, z), c = gilt ? GOLD : WHITE;
      props.box('plaster', x, g, z, 6 * s, 2 * s, 6 * s, 0, WHITE);                           // (sunk into the slope)
      props.box('plaster', x, g + 1.3 * s, z, 4.6 * s, 0.6 * s, 4.6 * s, 0, WHITE);
      props.push('plaster', new THREE.CylinderGeometry(1.3 * s, 2.1 * s, 2.4 * s, 12), M.makeTranslation(x, g + 2.8 * s, z), c);
      props.push('plaster', new THREE.SphereGeometry(1.32 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.makeTranslation(x, g + 4 * s, z), c);
      props.push('metal', new THREE.ConeGeometry(0.75 * s, 4 * s, 10), M.makeTranslation(x, g + 7.2 * s, z), GOLD);
      cover.addCylinder({ x, z, radius: 2.4 * s, height: 4 * s });
    };
    /** A basha: a bamboo hut on stilts under a thatch roof. */
    const basha = (x: number, z: number, yaw: number, w: number, d: number) => {
      const g = terrain.heightAt(x, z);
      props.box('plain', x, g + 1.2, z, w, 1.6, d, yaw, 0x8a7650);
      props.box('plain', x, g + 2.4, z, w + 1, 0.9, d + 1.2, yaw, THATCH);
      cover.addBox({ x, z, yaw, length: d, thickness: w, height: 2 });
    };
    const palms = (cx: number, cz: number, n: number, r0: number, r1: number) => {
      for (let i = 0, k = 0; k < n && i < n * 12; i++) {
        const a = r() * Math.PI * 2, d = r0 + r() * (r1 - r0), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (!clear(x, z, 5) || near(x, z, 12)) continue;
        props.palm({ x, z, height: 10 + r() * 5 }); k++;                                       // toddy palms: tall, straight
      }
    };
    const village = (cx: number, cz: number, n: number, spread: number) => {
      for (let i = 0; i < n * 3 && n > 0; i++) {
        const a = r() * Math.PI * 2, d = 12 + r() * spread, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (!clear(x, z, 8) || near(x, z, 10)) continue;
        basha(x, z, a, 5 + r() * 2, 7 + r() * 3); n--;
      }
    };

    // ---- Meiktila: houses and shophouses on both shores of the channel, a pagoda, the rice mills and godowns
    props.rand = mulberry32(31);
    for (const s of [1, -1]) {
      for (const a of [34, 50, 80, 96, 118]) {
        for (let x = -150; x <= 150; x += 16) {
          const hx = x + (props.rand() - 0.5) * 5, I = river.project(hx, s * a), hz = I.pz + s * (a + (props.rand() - 0.5) * 4);
          if (!clear(hx, hz, 8) || Math.abs(hx) < 12 || near(hx, hz, 12)) { props.rand(); continue; }
          const yaw = s > 0 ? Math.PI : 0;
          if (props.rand() < 0.45) props.flatHouse({ x: hx, z: hz, yaw, width: 7 + props.rand() * 4, depth: 7 + props.rand() * 2, storeys: props.rand() < 0.35 ? 2 : 1, name: 'shophouse' });
          else props.house({ x: hx, z: hz, yaw, width: 7 + props.rand() * 2, depth: 6 + props.rand() });
        }
      }
    }
    stupa(60, 66, 1.4, true);                                                                    // the town pagoda, gilded, on the north shore
    for (const [x, z] of [[46, 52], [76, 54], [48, 82], [74, 80]]) stupa(x, z, 0.35);
    for (const [x, z, yaw] of [[-80, -60, 0.05], [-112, -64, 0.05], [90, -48, -0.05]]) {
      if (clear(x, z, 4)) props.hall({ x, z, yaw, width: 20, depth: 10, height: 5, color: 0x8a7a62, roof: TIN, door: 4, name: 'rice mill' });
    }
    for (const s of [1, -1]) props.sandbagRing({ x: 14, z: s * 30, radius: 4, toward: s });       // a post at each bridgehead

    // ---- Kyigon (B, north-west): bashas among toddy palms, a stupa; the Thazi road village (J, south-east) the same
    village(KYIGON.x, KYIGON.z, 14, 40); stupa(KYIGON.x - 30, KYIGON.z + 24, 0.7);
    village(THAZI.x, THAZI.z, 13, 38); stupa(THAZI.x + 28, THAZI.z - 26, 0.7);
    palms(KYIGON.x, KYIGON.z, 40, 30, 90);
    palms(THAZI.x, THAZI.z, 40, 30, 90);

    // ---- Pagoda Hill (C): the stupas along its crest, a walled terrace; Point 860 (I): bunkers, shattered trees, one stupa
    for (let t = 0; t <= 1; t += 1 / 7) {
      const [ax, az, bx, bz] = RISES[0], x = ax + (bx - ax) * t, z = az + (bz - az) * t + (r() - 0.5) * 16;
      if (!near(x, z, 14) && clear(x, z, 5)) stupa(x, z, 0.5 + r() * 0.5);
    }
    stupa(PAGODA.x + 24, PAGODA.z + 16, 1.1);
    props.lowWall({ x: PAGODA.x, z: PAGODA.z - 18, yaw: Math.PI / 2 - 0.12, length: 30, height: 1.2, color: WHITE });
    for (const [x, z] of [[P860.x - 30, P860.z + 16], [P860.x + 28, P860.z + 10], [P860.x + 70, P860.z - 4], [P860.x - 70, P860.z + 24]]) props.sandbagRing({ x, z, radius: 4, toward: -1 });
    for (const [x, z] of [[PAGODA.x - 30, PAGODA.z - 16], [PAGODA.x + 34, PAGODA.z - 18], [PAGODA.x - 80, PAGODA.z - 10]]) props.sandbagRing({ x, z, radius: 4, toward: 1 });
    stupa(P860.x + 40, P860.z - 24, 0.8);
    for (let i = 0; i < 22; i++) {
      const x = P860.x + (r() - 0.5) * 160, z = P860.z + (r() - 0.5) * 50, g = terrain.heightAt(x, z), h = 2 + r() * 4;
      if (near(x, z, 8) || !clear(x, z, 4)) continue;
      props.box('plain', x, g + h / 2, z, 0.35, h, 0.35, r() * 3, 0x4a3a2a, (r() - 0.5) * 0.3);  // shattered trunks
    }

    // ---- the main airfield (D): the strip’s edge, revetments, the Dakotas’ dumps, a wreck; the Hospital lines (H): huts in their grove
    props.rand = mulberry32(33);
    for (const x of [210, 260, 360, 420]) props.sandbagRing({ x, z: RUNWAY.z + 36, radius: 7, toward: 1 });
    props.aircraftWreck({ x: 400, z: RUNWAY.z - 34, yaw: 2.2, scale: 0.8 });
    for (const x of [228, 330, 390]) props.crates({ x, z: RUNWAY.z - 32, yaw: 0.1 });
    for (const x of [240, 300, 350]) props.tent({ x, z: RUNWAY.z + 58, yaw: 0, color: 0x7a7050 });
    for (const [x, z, yaw] of [[-250, -195, 0.1], [-305, -190, 0.1], [-275, -240, 0.1], [-330, -232, 0.12], [-250, -250, 0.08]]) {
      if (!near(x, z, 10) && clear(x, z, 4)) props.hall({ x, z, yaw, width: 18, depth: 7, height: 3.2, color: 0x8a7a5e, roof: THATCH, door: 3, name: 'hospital hut' });
    }
    for (const [x, z] of [[-320, -170], [-230, -170]]) props.sandbagRing({ x, z, radius: 4, toward: -1 });

    // ---- the dak bungalow (E) on the north shore by the causeway; Meiktila station (G) on the south shore
    props.house({ x: DAK.x - 18, z: DAK.z + 14, yaw: Math.PI, width: 13, depth: 10 });
    props.lowWall({ x: DAK.x - 18, z: DAK.z + 32, yaw: Math.PI / 2, length: 26, height: 1.1, color: WHITE });
    palms(DAK.x, DAK.z, 10, 16, 50);
    const sy = Math.atan2(RAIL[6][0] - RAIL[5][0], RAIL[6][1] - RAIL[5][1]) - Math.PI / 2;
    props.flatHouse({ x: STATION.x - 6, z: STATION.z - 44, yaw: sy, width: 18, depth: 8, storeys: 1, name: 'railway station' });
    props.hall({ x: STATION.x + 40, z: STATION.z - 46, yaw: sy + Math.PI / 2, width: 22, depth: 10, height: 5, color: 0x8a7458, roof: TIN, door: 6, name: 'goods shed' });
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 20);
      for (let k = 0; k < n; k++) props.rails({ x0: ax + (bx - ax) * k / n, z0: az + (bz - az) * k / n, x1: ax + (bx - ax) * (k + 1) / n, z1: az + (bz - az) * (k + 1) / n });
    }
    const along = (x: number) => { for (let i = 0; i < RAIL.length - 1; i++) if (x <= RAIL[i + 1][0]) { const t = (x - RAIL[i][0]) / (RAIL[i + 1][0] - RAIL[i][0]); return { z: RAIL[i][1] + (RAIL[i + 1][1] - RAIL[i][1]) * t, yaw: Math.atan2(RAIL[i + 1][0] - RAIL[i][0], RAIL[i + 1][1] - RAIL[i][1]) }; } return { z: 0, yaw: 0 }; };
    for (const [x, kind, c] of [[320, 'box', 0x6a4a34], [334, 'box', 0x5e4230], [348, 'tank', 0x3a3a34], [-200, 'open', 0x6a5440], [-420, 'box', 0x6a4a34]] as [number, string, number][]) {
      const a = along(x); props.wagon({ x, z: a.z, yaw: a.yaw, kind, color: c });
    }

    // ---- the plain: toddy palms in lines along the field bunds, lone stupas, burnt-out trucks and old positions
    props.rand = mulberry32(37);
    for (let i = 0, n = 0; n < 230 && i < 4000; i++) {
      const x = (r() * 2 - 1) * 480, z = (r() * 2 - 1) * 520;
      if (!clear(x, z, 8) || near(x, z, 24) || Math.abs(Math.abs(z) - BASE_Z) < 40 && Math.abs(x) < 60) continue;
      const k = 2 + Math.floor(r() * 4), a = r() * Math.PI;                                       // (in short rows)
      for (let j = 0; j < k; j++) {
        const px = x + Math.cos(a) * j * 7, pz = z + Math.sin(a) * j * 7;
        if (clear(px, pz, 6)) { props.palm({ x: px, z: pz, height: 10 + props.rand() * 5 }); n++; }
      }
    }
    for (const [x, z] of [[-420, 380], [150, 120], [-120, -330], [420, -380], [-430, -60], [420, 90]]) if (clear(x, z, 8)) stupa(x, z, 0.6);
    for (let i = 0; i < 70; i++) {
      const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * (BASE_Z - 60);
      if (near(x, z, 40) || !clear(x, z, 9)) continue;
      const kind = r();
      props.rand = mulberry32(Math.floor(r() * 1e9));
      if (kind < 0.35) props.wreckCar({ x, z, yaw: props.rand() * 6.28 });
      else if (kind < 0.7) props.sandbagRing({ x, z, radius: 4 + props.rand() * 2, toward: z > 0 ? -1 : 1 });
      else for (let k = 0; k < 3; k++) props.boulder({ x: x + (props.rand() - 0.5) * 8, z: z + (props.rand() - 0.5) * 8, radius: 0.7 + props.rand() * 1.2 });
    }

    commandPost(props, this.bases.nato, -1, 0x6a6444);
    commandPost(props, this.bases.pact, 1, 0x7a704c);
    props.finish();
    river.build(scene, terrain);

    // the groves: mango and tamarind round the villages and in the hollows, thin elsewhere; none on roads, rail, strip or water
    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => !clear(x, z, 6) }];
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2600, broadleaf: 1, autumn: 0.15, maxY: 40, size: 1.1,
      forest: (x: number, z: number) => (!clear(x, z, 7) || near(x, z, 30) ? -1 : grove(x, z) > 0.55 ? 0.7 : 0.03),
    });
    cover.finalize(bounds);
    const scrub = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.7, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); scrub.update(dt, t); },
    };
  },
} satisfies MapDef;
