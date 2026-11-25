// Krithia, 28 April – 4 June 1915: the land battle at Cape Helles after the landings. Three times Hunter-Weston’s
// British, the French of the Corps Expéditionnaire on the right and, in May, the Australian and New Zealand brigades
// brought down from Anzac went up the long, gently rising slope from the Helles beaches toward the village of Krithia
// and the hump of Achi Baba behind it, and three times the Ottoman Fifth Army — German officers on its staff — held
// them in front of trenches dug across the scrub, with the deep gullies that cut the slope (Gully Ravine by the
// Aegean, Krithia Nullah in the middle, Kereves Dere on the French flank) carrying the fight up their beds. A few
// hundred yards bought for each attack; Krithia and Achi Baba were never taken.
// On the map (south, nato, at +z): the narrow end of the peninsula, the Aegean below its clay cliffs on the west edge,
// the Dardanelles with its beaches on the east; the three gullies running the whole length of the field, scrub-choked
// beds between steep yellow banks; Hill 138 over the Helles beaches and the ruined village of Sedd el Bahr with the old
// fort on the strait on the Allied half; Achi Baba and Gurkha Bluff on the Ottoman; in the middle the ruins of
// Krithia with its windmills, Fir Tree Wood by Gully Ravine and the Haricot Redoubt above Kereves Dere. Scrub and
// thorn, olive groves and small fields; a fresh green May.
// Not mirrored but fair: Hill 138 answers Achi Baba — the same height, levelled tops at the same reach from each base
// (Achi Baba broad and long, Hill 138 a narrower whale-back); each half has its clifftop on the Aegean (X Beach,
// Gurkha Bluff) and its spur over the strait (Sedd el Bahr, Kereves Spur) at the same reach and height, each with a
// track up its own lane from its base. The three gullies split both halves alike, crossed only where the tracks go,
// on causeways: two laterals on each half and the Krithia road across the middle. Both fight for Fir Tree Wood,
// Krithia and the Haricot Redoubt between the lines.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost, trenchLine } from './common.js';
import { segDist, farmVillage, evenThreshold } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 500;
const noise = createNoise2D(1915_06);
const bell = (v: number, c: number, w: number) => Math.exp(-(((v - c) / w) ** 2));

/** The waterlines: the Aegean under its cliffs on the west, the Dardanelles with its beaches on the east (Morto Bay on the Allied half, the bay under Kereves Dere on the Ottoman). */
const shoreW = (z: number) => -452 + 8 * Math.sin(z * 0.007 + 0.4) + fbm(noise, 1.7, z * 0.005, 2) * 8;
const shoreE = (z: number) => 455 + 8 * Math.sin(z * 0.006 + 2) + fbm(noise, 5.1, z * 0.004, 2) * 8 - 30 * bell(z, 440, 70) - 24 * bell(z, -420, 60);

/** The gullies, the whole length of the field (x of each bed at z): Gully Ravine, Krithia Nullah, Kereves Dere. */
const GULLIES = [
  (z: number) => -205 + 22 * Math.sin(z * 0.009 + 1) + 10 * Math.sin(z * 0.023),
  (z: number) => 120 + 26 * Math.sin(z * 0.008 + 2.4) + 8 * Math.sin(z * 0.02 + 1),
  (z: number) => 385 + 18 * Math.sin(z * 0.01 + 0.7),
];
const gullyD = (x: number, z: number) => Math.min(...GULLIES.map((g) => Math.abs(x - g(z))));

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Lancashire Landing', -20, 470, 'centre'),
  P('B', 'X Beach', -340, 290, 'west'),
  P('C', 'Hill 138', -50, 265, 'centre', { radius: 26 }),
  P('D', 'Sedd el Bahr', 265, 300, 'east'),
  P('E', 'Fir Tree Wood', -330, 35, 'west'),
  P('F', 'Krithia', -40, -5, 'centre', { radius: 30 }),
  P('G', 'Haricot Redoubt', 250, -30, 'east'),
  P('H', 'Gurkha Bluff', -335, -290, 'west'),
  P('I', 'Achi Baba', -35, -265, 'centre', { radius: 26 }),
  P('J', 'Kereves Spur', 260, -300, 'east'),
  P('K', 'Kilitbahir road', -20, -470, 'centre'),
] as any[];
const at = (id: string) => points.find((p) => p.id === id);

/** The tracks: up each lane from base to base, two laterals on each half, the Krithia road across the middle. */
const ROADS = [
  [[-20, 580], [-20, 470], [-10, 380], [-50, 265], [-30, 130], [-40, -5], [-20, -130], [-35, -265], [-10, -380], [-20, -470], [-20, -580]],
  [[-340, 385], [-340, 290], [-320, 160], [-330, 35], [-345, -160], [-335, -290], [-330, -372]],
  [[265, 385], [265, 300], [245, 150], [250, -30], [270, -170], [260, -300], [265, -372]],
  [[-440, 395], [-340, 385], [-160, 392], [-10, 380], [130, 386], [265, 385], [440, 400]],
  [[-440, -380], [-330, -372], [-150, -362], [-10, -380], [120, -372], [265, -372], [440, -385]],
  [[-440, 22], [-330, 35], [-190, 15], [-40, -5], [110, -20], [250, -30], [440, -12]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;

/** Each half’s heights [x, z, rx, rz, h]: Hill 138 and Achi Baba, the clifftop spurs on the Aegean, the spurs over the strait, the low rise Krithia stands on. */
const DOMES = [
  [-50, 265, 170, 160, 34], [-35, -265, 235, 140, 34],
  [-345, 300, 120, 140, 12], [-330, -300, 140, 115, 12],
  [270, 290, 130, 110, 10], [260, -300, 115, 135, 10],
  [-40, 0, 140, 90, 7],
];
/** The slope before the shelves and the cliffs (sampled once: its noise is dear). */
const slope = gridCacheSmooth((x: number, z: number) => {
  let h = 6 + fbm(noise, x * 0.004, z * 0.004, 4) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.8;
  h += ridged(noise, x * 0.009 + 3, z * 0.009, 3) * 5;                                                 // folds in the slope
  for (const [dx, dz, rx, rz, dh] of DOMES) h += dh * smoothstep(1, 0, Math.hypot((x - dx) / rx, (z - dz) / rz)) ** 1.3;
  const g = gullyD(x, z) + fbm(noise, x * 0.03, z * 0.03 + 4, 2) * 5;                                   // the gullies: a bed, steep clay banks (none where a track crosses on its causeway)
  const w = 1 + 0.35 * fbm(noise, x * 0.006 + 11, z * 0.006, 2);                                      // (wider and narrower along its course)
  const cut = 14 * smoothstep(26 * w, 8 * w, g) * smoothstep(7, 16, roadD(x, z));
  return Math.max(h - cut, Math.min(h, 2.5));                                                          // (the bed stays dry, above the sea)
}, EXT, 4);

// the shelves the points and bases stand on, the pairs levelled alike (B/H, C/I, D/J, E/G)
const SHELVES = [[-20, BASE_Z, 34], [-20, -BASE_Z, 34], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'F' ? 30 : 22])];
const PAIRS: Record<string, string> = { B: 'H', H: 'B', C: 'I', I: 'C', D: 'J', J: 'D', E: 'G', G: 'E' };
// (worked out on first use, not at import: every map is imported at start, and this samples a cached grid)
let SHELF_H_: number[] | undefined;
const shelfH = () => (SHELF_H_ ??= SHELVES.map(([x, z], i) => {
  if (i < 2) return slope(-20, BASE_Z);
  const p = points.filter((q) => !q.owner)[i - 2], q = PAIRS[p.id] && at(PAIRS[p.id]);
  return q ? (slope(x, z) + slope(q.x, q.z)) / 2 : slope(x, z);
}));
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = slope(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { h += (shelfH()[i] - h) * smoothstep(r + 26, r, Math.hypot(x - sx, z - sz)); });
  return h;
}, EXT, 2);

/** The coasts carved after the cache: the clay cliffs down to a strip of sand on the Aegean, the low beaches on the strait. */
function height(x: number, z: number) {
  const dW = x - shoreW(z), dE = shoreE(z) - x, d = Math.min(dW, dE);
  if (d < 0) return Math.max(-10, -0.8 + d * 0.25);
  const h = ground(x, z);
  return Math.min(h, dW < dE ? 0.6 + Math.max(0, dW - 6) * 1.1 : 0.6 + Math.max(0, dE - 10) * 0.2);
}
const wet = (x: number, z: number, pad = 0) => x < shoreW(z) + pad || x > shoreE(z) - pad;

/** The sea: water that stops, as a river’s does (a land battle — gaza.ts). */
const sea = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false,
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a6278, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.9 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    water.userData.noAO = true;
    scene.add(water);
    this.waterMesh = water;
  },
};

/** The olive groves [x, z, w, d]: round Krithia and Sedd el Bahr, the same area on each half in other places. */
const GROVES = [[-120, 60, 70, 50], [60, 110, 60, 60], [330, 240, 60, 50], [-280, 200, 50, 60],
  [40, -80, 70, 60], [-140, -110, 60, 50], [320, -230, 50, 60], [-280, -200, 60, 50]];
const inGrove = (x: number, z: number, pad = 0) => GROVES.some(([gx, gz, w, d]) => Math.abs(x - gx) < w / 2 + pad && Math.abs(z - gz) < d / 2 + pad);
const FORT = { x: 395, z: 515 }; // (the old fort of Sedd el Bahr on the strait, behind the Allied base)

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Platoon, 1st Lancashire Fusiliers' }];

export default {
  id: 'krithia',
  name: 'Krithia',
  description: 'Cape Helles, Gallipoli, April–June 1915: the British, French and ANZACs push up the long scrubby slope from the beaches toward Krithia and Achi Baba, up the deep gullies — Gully Ravine, Krithia Nullah, Kereves Dere — against the Ottoman trenches. The Aegean under the cliffs on one flank, the Dardanelles on the other.',
  epochs: ['1918'],
  region: 'middleEast',
  airfields: [], // (the gullies cut the slope every 250 m: no 240 m strip fits between them; the RNAS flew from Tenedos and Imbros — the aircraft come in from the map edge)
  armies: { nato: ['uk', 'anzac', 'fr'], pact: ['ot', 'de'] }, // (VIII Corps, the Corps Expéditionnaire d’Orient and the ANZAC brigades against the Ottoman Fifth Army under Liman von Sanders)
  sides: { nato: 'British Empire and France', pact: 'Ottoman Empire' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.6, // (the gullies’ banks: men scramble, wheels cross on the causeways)
  seed: 1915,
  height,
  river: sea,
  fields: createFields({ seed: 191506, cell: 60 }),

  theme: {
    // a hot, clear day in early summer: haze off the sea, the scrub still green
    fogColor: 0xc8ccc8, fogDensity: 0.0008, skyTop: 0x5e86b4, skyHorizon: 0xdcd8cc, skyBottom: 0x9a9a88,
    sunColor: 0xfff0d4, sunIntensity: 2.1, sunDisk: 0.7, clouds: 0.12, cloudLight: 0xf6f2ea, cloudDark: 0xb8b8b0,
    sunDir: [0.3, 0.6, 0.4], hemiSky: 0xd4dce4, hemiGround: 0x7a7050, hemiIntensity: 1.25, rimColor: 0xf0e4c8, rimIntensity: 0.3,
    terrain: {
      grass: '#76804a', grassAlt: '#6c7644', dryGrass: '#a89c6a', dirt: '#9a7e56', rock: '#c8b48a',
      pasture: '#7a844c', ploughed: '#8a6e4c', stubble: '#b0a06a', meadow: '#808a50',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const dW = x - shoreW(z), dE = shoreE(z) - x;
        if (dW < 2 || dE < 2) return [y > -1.2 ? 0xc8b88e : 0x4a7480, 1];                         // the wet sand, then the sea
        if (dW < 8 || dE < 14) return [0xd0c098, 1];                                                 // the beaches
        if (onRoad(x, z)) return [0xb09a74, 0.85];                                                   // the dusty tracks
        const g = Math.hypot(height(x + 2, z) - height(x - 2, z), height(x, z + 2) - height(x, z - 2)) / 4;
        if (g > 0.7) return [0xd2b884, Math.min(1, 0.5 + (g - 0.7) * 2)];                           // the yellow clay of the cliffs and the gullies’ banks
        if (gullyD(x, z) < 9) return [0x9a8a66, 0.7];                                                // the gully beds’ gravel
        if (inGrove(x, z, 2)) return [0x8a7450, 0.5];                                                // the groves’ ploughed earth
        const scrub = fbm(noise, x * 0.04 + 9, z * 0.04, 2);
        return scrub > 0.15 ? [0x56603a, Math.min(0.6, (scrub - 0.15) * 2)] : null;                  // thorn and holly-oak scrub
      },
    },
  },

  bases: { nato: { x: -20, z: BASE_Z, entries: [-320, -20, 265] }, pact: { x: -20, z: -BASE_Z, entries: [-320, -20, 265] } },
  maxStacks: 26,
  cameraStart: { nato: { x: -20, z: 360 }, pact: { x: -20, z: -360 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -40 - s.x, z: -s.z, facing: 0, name: '1. Bölük, 25. Alay' })),
  },

  /** Each side’s fire trench across the slope, wire in front (gaps where the tracks go, none in the gullies or the sea); MG nests on the clifftops and the spurs. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -460; x <= 460; x += 25) { const X = x * s; pts.push([X, s > 0 ? 150 + 14 * Math.sin(X * 0.017) : -150 - 12 * Math.sin(X * 0.013 + 2)]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { zig: 1.5, wireAt: 24, belts: 2, gapEvery: 50 })) if (roadD(w.x, w.z) > 9 && gullyD(w.x, w.z) > 26 && !wet(w.x, w.z, 12)) works.push(w);
      for (const id of s > 0 ? ['B', 'D'] : ['H', 'J']) { const p = at(id); for (const dx of [-14, 14]) { const x = p.x + dx, z = p.z - 18 * s; if (roadD(x, z) > 9) works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f }); } }
    }
    // Krithia and Sedd el Bahr: shelled to ruins (the fleet’s guns, then both sides’ batteries)
    const ruins = game.buildings.list.filter((b: any) => ['F', 'D'].some((id) => Math.hypot(b.x - at(id).x, b.z - at(id).z) < 80)).map((b: any) => b.index);
    return { blasts: [], ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene);
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const skip = (x: number, z: number) => roadD(x, z) < 9 || gullyD(x, z) < 30 || wet(x, z, 24) || steepAt(x, z) > 0.3;
    const cyl = (x: number, z: number, r0: number, r1: number, h: number, color: number) => {
      const y = terrain.heightAt(x, z) - 0.3;
      props.push('stone', new THREE.CylinderGeometry(r0, r1, h, 14), new THREE.Matrix4().makeTranslation(x, y + h / 2, z), color);
      cover.addCylinder({ x, z, radius: r1, height: h });
    };

    // the villages: Krithia (stone houses, tiled roofs, garden walls) round its point; Sedd el Bahr by the strait
    farmVillage(props, at('F').x, at('F').z, 12, 1915_01, skip, 1.2);
    farmVillage(props, at('D').x, at('D').z, 8, 1915_02, skip);
    // Krithia’s windmills on the rise west of the village, their sails shot away
    for (const [x, z] of [[-112, -48], [-128, -30], [-100, -68]]) if (!skip(x, z)) cyl(x, z, 2.2, 3, 8, 0xc4b8a0);
    // the old fort of Sedd el Bahr: curtain walls and two round towers on the shore, breached by the fleet in February
    props.rand = mulberry32(1915_03);
    for (const [dx, dz, yaw, len] of [[-18, -14, 0, 30], [18, -14, 0, 14], [-18, 14, 0, 36], [-36, 0, Math.PI / 2, 28]]) {
      const x = FORT.x + dx, z = FORT.z + dz;
      if (!wet(x, z, 4)) props.lowWall({ x, z, yaw, length: len, height: 4.5, color: 0xb8aa8c });
    }
    for (const [dx, dz] of [[-36, -14], [-36, 14]]) cyl(FORT.x + dx, FORT.z + dz, 4.5, 5, 7, 0xb4a688);
    for (let i = 0; i < 10; i++) props.rubble(FORT.x - 10 + props.rand() * 24, FORT.z - 8 + props.rand() * 16, 1 + props.rand() * 1.5, true);
    // the Ottoman camp behind Achi Baba; the French and British dumps behind the beaches
    for (let i = 0; i < 6; i++) props.tent({ x: 60 + (i % 3) * 9, z: -BASE_Z + 20 - Math.floor(i / 3) * 9, yaw: 0.1, color: 0xb0a482 });
    for (let i = 0; i < 6; i++) props.tent({ x: -140 + (i % 3) * 9, z: BASE_Z + 10 + Math.floor(i / 3) * 9, yaw: -0.1, color: 0xc0b498 });
    props.crates({ x: -110, z: BASE_Z - 8, yaw: 0.3 });
    props.crates({ x: 70, z: -BASE_Z + 6, yaw: 2.6 });
    // the hedges of prickly pear and the field walls round the groves (a gap for the gate)
    props.rand = mulberry32(1915_04);
    for (const [gx, gz, w, d] of GROVES) {
      for (const [lx, lz, len, alongX] of [[0, d / 2, w, 1], [0, -d / 2, w, 1], [w / 2, 0, d, 0], [-w / 2, 0, d, 0]] as number[][]) {
        for (let t = -len / 2 + 6; t < len / 2 - 4; t += 12) {
          if (Math.abs(t) < 5) continue;
          const x = gx + lx + (alongX ? t : 0), z = gz + lz + (alongX ? 0 : t);
          if (roadD(x, z) > 6 && gullyD(x, z) > 28 && !nearPoint(x, z, 26)) props.lowWall({ x, z, yaw: alongX ? 0 : Math.PI / 2, length: 10, height: 1.2, color: 0xa89c80 });
        }
      }
    }
    // sangars on the heights; boulders and loose stone over the slope (each half its own)
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J']) {
      const p = at(id), s = p.z > 0 ? -1 : 1;
      for (const dx of [-24, 24]) if (roadD(p.x + dx, p.z + 20 * s) > 9) props.lowWall({ x: p.x + dx, z: p.z + 20 * s, yaw: 0.2 * dx / 24, length: 7, height: 1.3, color: 0xa8a090 });
    }
    { const f = at('F'); props.sandbagRing({ x: f.x - 26, z: f.z + 18, radius: 4, toward: 1 }); props.sandbagRing({ x: f.x + 26, z: f.z - 18, radius: 4, toward: -1 }); }
    const r = mulberry32(1915_05);
    for (let i = 0; i < 400; i++) {
      const x = (r() * 2 - 1) * 470, z = (i % 2 ? -1 : 1) * (20 + r() * 520);
      if (skip(x, z) || nearPoint(x, z, 28) || inGrove(x, z, 4) || Math.hypot(x + 20, Math.abs(z) - BASE_Z) < 40) continue;
      props.rand = mulberry32(i);
      props.boulder({ x, z, radius: 0.6 + r() * 1.6 });
    }
    commandPost(props, this.bases.nato, -1, 0xb8ac8c);
    commandPost(props, this.bases.pact, 1, 0xa89c7a);
    props.finish();

    const avoid = [{ x: -20, z: BASE_Z, r: 30 }, { x: -20, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      { test: (x: number, z: number) => roadD(x, z) < 5 || wet(x, z, 10) || Math.hypot(x - FORT.x, z - FORT.z) < 45 }];
    const north = (x: number, z: number) => z > 0;
    // the scrub: chest-high holly-oak and thorn, thick in the gullies, patchy on the slope (as much on each half)
    const s0 = (x: number, z: number) => fbm(noise, x * 0.012 + 40, z * 0.012, 3);
    const tS = evenThreshold(s0, 0.05, north);
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 4200, broadleaf: 1, autumn: 0, size: 0.32, maxY: 200,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 2) }],
      forest: (x: number, z: number) => (gullyD(x, z) < 22 ? 0.7 : s0(x, z) > (z > 0 ? 0.05 : tS) ? 0.5 : 0.04) });
    // the olives in their groves; the pines of Fir Tree Wood and the copse by the Haricot Redoubt (the same size)
    const olives = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 600, broadleaf: 1, autumn: 0.1, size: 0.6, maxY: 200,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3) }], forest: (x: number, z: number) => (inGrove(x, z) ? 1 : -1) });
    const copse = (x: number, z: number) => Math.min(Math.hypot(x - at('E').x - 10, z - at('E').z + 25), Math.hypot(x - at('G').x + 15, z - at('G').z - 25)) < 55;
    const pines = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 260, broadleaf: 0, autumn: 0, size: 0.8, maxY: 200, avoid,
      forest: (x: number, z: number) => (copse(x, z) && gullyD(x, z) > 26 ? 0.7 : 0) });
    cover.finalize(bounds);
    const grow = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.2, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grow.update(dt, t); scrub.update(dt, t); olives.update(dt, t); pines.update(dt, t); },
    };
  },
} satisfies MapDef;
