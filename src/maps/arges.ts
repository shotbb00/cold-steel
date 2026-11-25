// The Argeș, 1–3 December 1916: the battle for Bucharest. Mackensen’s Danube Army has crossed from Bulgaria at
// Zimnicea and marches up the Giurgiu road on the capital while Falkenhayn’s Ninth Army comes down out of the
// Carpathian passes from the west; between them, on the Argeș and the Neajlov, General Prezan’s manoeuvre group of the
// Romanian army, with Russian troops beside it, strikes south-west into the gap — and after three days of fighting
// through the villages along the Neajlov the counter-attack is broken, and Bucharest falls on 6 December.
// (The Romanian army has no roster of its own yet: it fights as the Russian Army, `ru`, until one is built, as on Mărășești.)
// On the map: the flat Wallachian plain in early winter, maize stubble and winter wheat, poplars along the water; the
// Neajlov winding across the middle from west to east, small and reedy, crossed at Prunaru, at Călugăreni (the old
// bridge where Michael the Brave beat the Turks in 1595) beside the iron bridge of the Bucharest–Giurgiu railway, and
// at Singureni; it falls into the Argeș on the east flank, a broader river running the whole length of the field,
// bridged at Mihăilești and Grădinari. Beyond the Argeș, the edge of Bucharest’s plateau and the western arc of
// Brialmont’s ring of the 1880s — Fort Bragadiru, Fort Măgurele and Fort Jilava, low concrete-and-earth works with their
// ramparts and ditches, the strip road running through their gorges. Whitewashed villages with Orthodox churches:
// Bulbucata, Mihai Bravu and Mihăilești on the Romanian side, Stoenești, Uzunu and Comana on the German; a hasty trench
// line on each side.
// Not mirrored but fair: the Neajlov lies across the middle between the two sides, each side as far from its bends, both
// fighting for Prunaru and Călugăreni on it; its four crossings serve both halves alike. The Argeș runs down the east
// flank through both halves — each side one bridge at the same reach from its base, a fort in its own half beyond it,
// and Fort Măgurele between them in the middle, reached from either bridge by the same length of the strip road. The
// plain is as flat on each half, each side one low rise (Mihai Bravu; Uzunu) of the same height at the same reach, its
// own copses of the same area (evenThreshold), a trench line at the same depth.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SEED = 1916_12;
const noise = createNoise2D(SEED);

/** A north–south path’s x at z (its points run south to north). */
const xAt = (poly: number[][], z: number) => {
  for (let i = 0; i < poly.length - 1; i++) if (z <= poly[i + 1][1]) return poly[i][0] + (poly[i + 1][0] - poly[i][0]) * (z - poly[i][1]) / (poly[i + 1][1] - poly[i][1]);
  return poly[poly.length - 1][0];
};
/** A west–east path’s z at x (its points run west to east). */
const zAt = (poly: number[][], x: number) => {
  for (let i = 0; i < poly.length - 1; i++) if (x <= poly[i + 1][0]) return poly[i][1] + (poly[i + 1][1] - poly[i][1]) * (x - poly[i][0]) / (poly[i + 1][0] - poly[i][0]);
  return poly[poly.length - 1][1];
};

// ---- the Argeș down the east flank, the Neajlov across the middle into it
const ARGES = [[350, -640], [332, -420], [354, -200], [336, 0], [352, 200], [334, 420], [348, 640]];
const NEAJ = [[-660, 6, 9], [-480, -14, 9], [-330, 10, 9], [-170, -12, 9], [0, 6, 9], [140, -10, 9], [262, 4, 10], [xAt(ARGES, 0), 0, 12]];
const BR = { north: 300, south: -300 };
const NX = { prunaru: -330, road: 0, rail: 80, singureni: 220 };
const river = createRiver({
  paths: [ARGES, NEAJ], halfWidth: 15, level: 0, depth: 3, valley: 70,
  crossings: [
    { name: 'Mihăilești bridge', x: xAt(ARGES, BR.north), z: BR.north, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Grădinari bridge', x: xAt(ARGES, BR.south), z: BR.south, kind: 'bridge', width: 8, channel: 0 },
    { name: 'Prunaru bridge', x: NX.prunaru, z: zAt(NEAJ, NX.prunaru), kind: 'bridge', width: 6, channel: 1 },
    { name: 'Călugăreni bridge', x: NX.road, z: zAt(NEAJ, NX.road), kind: 'bridge', width: 8, channel: 1 },
    { name: 'Călugăreni railway bridge', x: NX.rail, z: zAt(NEAJ, NX.rail), kind: 'bridge', width: 6, channel: 1 },
    { name: 'Singureni bridge', x: NX.singureni, z: zAt(NEAJ, NX.singureni), kind: 'bridge', width: 6, channel: 1 },
  ],
});
const argD = gridCacheSmooth((x: number, z: number) => segDist(ARGES, x, z), { x: 720, z: 780 }, 4);
const neaD = gridCacheSmooth((x: number, z: number) => segDist(NEAJ, x, z), { x: 720, z: 780 }, 4);
const wetD = (x: number, z: number) => Math.min(argD(x, z), neaD(x, z));
const eastBank = (x: number, z: number) => x > xAt(ARGES, z);
/** The reedy bottoms along the Neajlov (0..1). */
const marshAt = (x: number, z: number) => smoothstep(0.1, 0.35, fbm(noise, x * 0.009 + 30, z * 0.009, 3)) * (1 - smoothstep(45, 95, neaD(x, z))) * (eastBank(x, z) ? 0 : 1);

// ---- roads and the railway
const RX = { west: -330, centre: 0, east: 230 };
const ROADS = [
  [[0, 640], [0, 470], [12, 260], [0, 120], [0, -120], [-14, -260], [0, -470], [0, -640]],                                  // Bucharest – Călugăreni – Giurgiu
  [[-330, 640], [-330, 470], [-352, 300], [-322, 140], [-330, 60], [-330, -60], [-325, -150], [-342, -300], [-330, -470], [-330, -640]], // over Prunaru bridge
  [[230, 640], [230, 470], [265, 300], [228, 140], [220, 60], [220, -60], [230, -140], [265, -300], [230, -470], [230, -640]],  // over Singureni bridge
  [[-500, 290], [-352, 300], [12, 260], [265, 300], [xAt(ARGES, BR.north), BR.north], [455, 300]],                    // behind the Romanian line, to Mihăilești bridge
  [[-500, -310], [-342, -300], [-14, -260], [265, -300], [xAt(ARGES, BR.south), BR.south], [455, -300]],              // behind the German line, to Grădinari bridge
  [[455, -640], [455, -420], [445, -380], [445, -330], [455, -300], [445, -40], [445, 40], [455, 300], [445, 330], [445, 380], [455, 420], [455, 640]], // the strip road through the forts’ gorges
];
const RAIL = [[95, 640], [95, 300], [80, 80], [80, -80], [95, -300], [95, -640]];   // Bucharest – Giurgiu
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), { x: 520, z: 580 }, 2);

// ---- the forts of the Bucharest ring beyond the Argeș [x, z]: a rampart round a parade, a dry ditch, a glacis; the gorge open north and south
const FORTS = [[445, 380], [445, 0], [445, -380]];
const fortRise = (x: number, z: number) => {
  let out = 0;
  for (const [fx, fz] of FORTS) {
    const lx = Math.abs(x - fx), lz = Math.abs(z - fz), d = Math.max(lx, lz * 1.25);
    if (d > 46) continue;
    let k = 1.2 * (1 - smoothstep(24, 27, d)) + 2.3 * smoothstep(13, 18, d) * (1 - smoothstep(21, 24, d))
      - 2 * smoothstep(24, 27, d) * (1 - smoothstep(29, 32, d)) + 0.8 * smoothstep(29, 32, d) * (1 - smoothstep(32, 46, d));
    const g = 1 - smoothstep(4, 7, lx);                       // the road through the gorge: level with the parade
    k = k * (1 - g) + 1.2 * (1 - smoothstep(30, 46, d)) * g;
    out += k;
  }
  return out;
};

// ---- the points
const CAL = { x: 0, z: zAt(NEAJ, 0) }, PRU = { x: -330, z: zAt(NEAJ, -330) };
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points: ControlPointDef[] = [
  P('A', 'Bucharest road', 0, 470, 'centre'),
  P('B', 'Bulbucata', -350, 300, 'west'),
  P('C', 'Mihai Bravu', 50, 275, 'centre'),
  P('D', 'Mihăilești', 268, 300, 'east'),
  P('E', 'Prunaru', PRU.x, PRU.z, 'west', { radius: 30 }),
  P('F', 'Călugăreni', CAL.x + 20, CAL.z, 'centre', { radius: 32 }),
  P('G', 'Fort Măgurele', FORTS[1][0], FORTS[1][1], 'east', { radius: 28 }),
  P('H', 'Stoenești', -342, -300, 'west'),
  P('I', 'Uzunu', -24, -265, 'centre'),
  P('J', 'Comana', 268, -300, 'east'),
  P('K', 'Giurgiu road', 0, -470, 'centre'),
];

// one low rise a side [x, z, r, h]: Mihai Bravu’s on the north, Uzunu’s on the south
const RISES = [[60, 300, 160, 5], [-30, -295, 160, 5]];
// each side’s airfield behind its west flank (strip along x, the tower 55 m off it), graded flat and kept clear
const AIR = [{ faction: 'nato', x: -175, z: 430, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -175, z: -430, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

const ground = gridCacheSmooth((x: number, z: number) => {
  const north = z > 0;
  let h = 5 + fbm(noise, x * 0.004 + (north ? 0 : 37), z * 0.004, 4) * 2.5 + fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 0.5;   // the flat Wallachian plain
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(BASE_Z - 90 + 50 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 8;    // (the rims rise, as much on each half)
  // the Neajlov’s shallow valley across the middle
  h += (1.7 - h) * smoothstep(130, 40, neaD(x, z));
  h += (1.1 - h) * marshAt(x, z) * 0.8;
  // the Argeș: its floodplain on the west bank, the terrace of Bucharest’s plateau beyond it
  const d = argD(x, z);
  if (!eastBank(x, z)) h += (1.7 - h) * smoothstep(170, 60, d);
  else h = 1.7 + smoothstep(30, 80, d) * 5 + fbm(noise, x * 0.01 + 77, z * 0.01, 2) * 0.6 * smoothstep(40, 80, d);
  h += fortRise(x, z);
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 7 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  h += (6 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, { x: 700, z: 760 }, 2);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// each side’s hasty trench line across the field, at the same depth from the middle (each its own wander); not over the Argeș
const TRENCH = 125;
const trenchZ = (x: number, north: boolean) => (north ? TRENCH + 9 * Math.sin(x * 0.017 + 1) : -TRENCH - 10 * Math.sin(x * 0.013 + 2));
const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > 0)) < 28;
const fortD = (x: number, z: number) => Math.min(...FORTS.map(([fx, fz]) => Math.max(Math.abs(x - fx), Math.abs(z - fz) * 1.25)));

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'arges',
  name: 'Argeș',
  description: 'December 1916, the battle for Bucharest: the Romanian army and its Russian allies counter-attack Mackensen’s and Falkenhayn’s armies on the Argeș and the Neajlov, and lose the capital. The flat Wallachian plain in early winter, maize stubble and poplar-lined rivers, whitewashed villages, the Giurgiu railway, and Brialmont’s forts of the Bucharest ring beyond the Argeș.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de', 'bg'] }, // (Romanians fight as the Russian Army until they have their own roster; the Bulgarians as the Germans until theirs)
  sides: { nato: 'Romania', pact: 'Germany' },
  conditions: { time: 'day', weather: 'overcast' }, // (grey, cold early-December days, no snow yet)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 80, weights: [0.15, 0.25, 0.4, 0.2] as any }),

  theme: {
    // a raw grey day at the start of winter
    fogColor: 0xa8aaa4, fogDensity: 0.0013, skyTop: 0x6c7884, skyHorizon: 0xc0c2bc, skyBottom: 0x74746a,
    sunColor: 0xece2cc, sunIntensity: 1.5, sunDisk: 0.12, clouds: 0.8, cloudLight: 0xd0d2cc, cloudDark: 0x707680,
    sunDir: [0.5, 0.35, 0.6], hemiSky: 0xc0c6cc, hemiGround: 0x4e4838, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#626640', grassAlt: '#585e3a', dryGrass: '#958a5e', dirt: '#66563f', rock: '#8a8476', strip: '#4e4232',
      pasture: '#5e663e', ploughed: '#4e4032', stubble: '#a69460', meadow: '#646a40',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [RX.west, RX.centre, RX.east], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (railD(x, z) < 2.8) return [0x5e564c, 0.9];                                  // ballast
        if (roadD(x, z) < 3.5) return [0x6e5e48, 0.85];                                  // muddy dirt roads
        const f = fortD(x, z);
        if (f > 13 && f < 24) return [0x6a7048, 0.7];                                    // the grassed ramparts
        if (f >= 24 && f < 32) return [0x5e5240, 0.7];                                   // the ditch
        if (marshAt(x, z) > 0.3 && neaD(x, z) > 14) return [0x5e6038, Math.min(0.85, marshAt(x, z))]; // reed and wet meadow
        if (y < 1.6 && wetD(x, z) < 34) return [0x7a6e54, 0.8];                          // the muddy banks
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [RX.west, RX.centre, RX.east] }, pact: { x: 0, z: -BASE_Z, entries: [RX.west, RX.centre, RX.east] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side’s trench line (one belt of wire, gaps at the roads), MG nests at the roads, shell holes between, the Neajlov villages knocked about. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 20, belts: 1, gapEvery: 60 })) {
        if (roadD(w.x, w.z) < 8 || railD(w.x, w.z) < 5 || argD(w.x, w.z) < 80 || eastBank(w.x, w.z)) continue;
        works.push(w);
      }
      for (const x of [RX.west, RX.centre, RX.east]) works.push({ kind: 'mgNest', x: x + 14, z: trenchZ(x + 14, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    const dens = (x: number, z: number) => (wetD(x, z) < 30 || eastBank(x, z) ? 0 : 0.6 * Math.exp(-(((Math.abs(z) - 60) / 70) ** 2)) + 0.03);
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b: number[]) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => roadD(b[0], b[1]) > 5 && railD(b[0], b[1]) > 4 && airD(b[0], b[1]) > 10 && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 30));
    const ruins = game.buildings.list.filter((b: any) => b.name !== 'casemate' && Math.abs(b.z) < 80 && mulberry32(b.index * 7 + SEED)() < 0.35).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => wetD(x, z) < 26 || roadD(x, z) < 8 || railD(x, z) < 8 || trenchBand(x, z) || airD(x, z) < 25 || fortD(x, z) < 50;

    // the villages, each with its church; Prunaru and Călugăreni on both banks of the Neajlov
    for (const p of points) {
      if ('AKG'.includes(p.id)) continue;
      const big = p.id === 'C' || p.id === 'I' || p.id === 'F';
      farmVillage(props, p.x, p.z, big ? 10 : 8, SEED * 10 + Math.round(p.x * 3 + p.z * 7), skip, 'EF'.includes(p.id) ? 1.5 : 1.2);
    }
    props.rand = mulberry32(SEED + 3);
    for (const [x, z, yaw] of [[-376, 320, 0.3], [82, 296, 0.1], [244, 322, -0.2], [-366, -322, Math.PI + 0.2], [-52, -286, Math.PI - 0.1], [244, -322, Math.PI + 0.3],
      [-290, PRU.z + 46, 0.2], [-30, CAL.z + 44, Math.PI + 0.1], [44, CAL.z - 46, 0.1]]) props.church({ x, z, yaw });
    // the railway: the Giurgiu line down the middle, a halt by Călugăreni, wagons in its siding
    for (let i = 0; i < RAIL.length - 1; i++) {
      const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let t = 0; t < L; t += 24) {
        const t1 = Math.min(L, t + 24), x0 = ax + (bx - ax) * t / L, z0 = az + (bz - az) * t / L, x1 = ax + (bx - ax) * t1 / L, z1 = az + (bz - az) * t1 / L;
        if (Math.abs(z0) > 560 || neaD(x0, z0) < 26 || neaD(x1, z1) < 26) continue;
        props.rails({ x0, z0, x1, z1 });
      }
    }
    props.hall({ x: 108, z: 70, yaw: Math.PI / 2, width: 18, depth: 9, height: 6, color: 0xd8d0c0, name: 'Călugăreni halt' });
    for (const [x, z, kind] of [[96, -70, 'box'], [96, -86, 'open']] as const) props.wagon({ x, z, yaw: 0, kind });

    // the forts: a concrete casemate in each parade under its earth cover, a sandbagged post at each gorge
    const concrete = 0x8a877c;
    for (const [fx, fz] of FORTS) {
      props.rand = mulberry32(Math.round(fx * 13 + fz));
      for (const sx of [-1, 1]) {
        const b = props.beginBuilding('casemate', fx + sx * 13, fz, 0, 6, 12);
        b.plaster = concrete;
        props.shell(b, { height: 2.4, key: 'stone', color: concrete, t: 0.9, bay: 2.3, sill: 1.15, head: 1.5, frame: 0x6e6b62 });
        props.piece('stone', b, 0, 2.75, 0, 6.4, 0.7, 12.4, 0x7e7b70);
        props.piece('plain', b, 0, 3.15, 0, 5.2, 0.25, 10.8, 0x5a5e3c);
        props.endBuilding();
      }
      props.sandbagRing({ x: fx + 9, z: fz + 26, radius: 3.5, toward: 1 });
      props.sandbagRing({ x: fx - 9, z: fz - 26, radius: 3.5, toward: -1 });
    }
    // the edge of Bucharest beyond the forts: a few whitewashed suburban houses, as many on each half
    props.rand = mulberry32(SEED + 9);
    for (const [x, z] of [[480, 210], [482, 160], [478, -210], [482, -160], [482, 500], [480, -500]]) props.townHouse({ x, z, yaw: Math.PI / 2, width: 7, depth: 8, storeys: 1, damaged: 0.1 });

    // farmsteads, haystacks and field walls over each half’s plain
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'hay'];
    for (let tries = 0, n = 0; n < 100 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.abs(z) < 90 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z) || x > xAt(ARGES, z) - 50) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 19 || roadD(x, z) < 4.5 || railD(x, z) < 4 || airD(x, z) < 12 || fortD(x, z) < 34 }];
    const wood = (x: number, z: number) => (Math.abs(z) < 40 || eastBank(x, z) ? -9 : fbm(noise, x * 0.007 + 70, z * 0.007, 3));
    const tN = 0.3, tP = evenThreshold(wood, tN, (_x, z) => z > 0);   // (each half its own copses, the same in area)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 900, autumn: 0.85, broadleaf: 0.95,
      forest: (x: number, z: number) => {
        const w = wetD(x, z);
        if (w < 19) return -1;
        if (w < 32) return fbm(noise, x * 0.03 + 5, z * 0.03, 2) > -0.25 ? 0.75 : 0;  // the poplars along the banks, a gap here and there
        if (trenchBand(x, z)) return 0.02;
        if (marshAt(x, z) > 0.4) return 0.25;                                       // willow scrub in the bottoms
        return Math.abs(x) > 480 || wood(x, z) > (z > 0 ? tN : tP) ? 0.8 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
