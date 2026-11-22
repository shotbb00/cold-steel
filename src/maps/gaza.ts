// The Third Battle of Gaza, 1–2 November 1917. While Allenby’s real blow fell on Beersheba at the far end of the
// line, the British XXI Corps went in by night against its strongest end: the old city of Gaza and the Ottoman
// redoubts round it — Umbrella Hill and Sea Post in the dunes by the sea, the trenches in the sand with their wire,
// the Ali Muntar ridge south-east of the town. A week later the Ottomans were gone and Gaza was taken.
// On the map: the Mediterranean along the west edge and its sand dunes all down the shore (Sheikh Ajlin and Samson
// Ridge on the British half, Umbrella Hill and Sea Post on the Ottoman); the old town of Gaza in the middle on its low
// hill, the Great Mosque and its minaret; the orchards round the town in their prickly-pear hedges, the sunken lanes
// between cactus walls; the Ali Muntar ridge on the Ottoman half; the Wadi Ghuzze, dry in November, across the
// British half, the Wadi el Hesi across the Ottoman (compressed: it really runs well north of the town); each side’s
// fire trench with its belts of wire in the sand; Mansura and Sheikh Abbas behind the British line.
// Fair, not mirrored: the town is the middle point and stands on neither half. Ali Muntar’s answer is the Sheikh
// Abbas ridge on the British half — as high, as far from the town, laid east–west where Ali Muntar runs north–south.
// The dunes run the whole west flank, so each side has the same sand at the same depths (two dune points each); the
// orchards round the town cover the same area on each half; each half has its own wadi at the same depth.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { createSea } from '../world/Sea.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, trenchLine, buildSite } from './common.js';
import { arabVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const EXT = { x: 520, z: 580 };
const BASE_Z = 500;
const SIDE_X = 300;
const noise = createNoise2D(1917_11);

/** The waterline of the Mediterranean (x of it) down the west edge. */
const shoreX = (z: number) => -462 + 10 * Math.sin(z * 0.006 + 1) + fbm(noise, 3.3, z * 0.004, 2) * 8;
/** The dry wadis: the Wadi Ghuzze across the British half, the Wadi el Hesi across the Ottoman, each to the sea. */
const wadiZ = (x: number, z: number) => (z > 0 ? 215 + 24 * Math.sin(x * 0.009 + 1) : -212 - 28 * Math.sin(x * 0.007 + 3));
const wadiD = (x: number, z: number) => Math.abs(z - wadiZ(x, z));
/** The ridges [x0, z0, x1, z1, half-width, height]: Ali Muntar (north–south) and Sheikh Abbas (east–west). */
const RIDGES = [[225, -55, 300, -205, 60, 19], [150, 145, 375, 105, 58, 19]];

/** The tracks and lanes: the Deir el Belah road up the middle through the town, the coast track behind the dunes, the
 * Beersheba road and the Ali Muntar track to the east, and the lateral road behind each line. */
const ROADS = [
  [[0, 600], [0, 470], [60, 270], [30, 120], [0, 0], [-50, -130], [-50, -260], [0, -470], [0, -600]],
  [[-370, 600], [-370, 300], [-300, 110], [-310, -100], [-400, -310], [-390, -600]],
  [[0, 0], [130, 80], [280, 130], [380, 300], [400, 600]],
  [[0, 0], [150, -60], [260, -120], [330, -300], [380, -600]],
  [[-370, 300], [-150, 360], [0, 400], [300, 380], [500, 390]],
  [[-400, -310], [-180, -380], [0, -390], [280, -360], [500, -380]],
  [[-300, 110], [-150, 40], [0, 0], [-160, -50], [-310, -100]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;

/** The orchards round the town [x, z, w, d], in their cactus hedges: the same area on each half, in other places. */
const GROVES = [[-130, 95, 60, 70], [125, 70, 70, 60], [70, 175, 60, 60], [-220, 215, 80, 50],
  [-120, -85, 70, 60], [110, -100, 60, 70], [-60, -165, 80, 50], [-205, -200, 60, 60]];
const inGrove = (x: number, z: number, pad = 0) => GROVES.some(([gx, gz, w, d]) => Math.abs(x - gx) < w / 2 + pad && Math.abs(z - gz) < d / 2 + pad);
const TOWN_R = 95;

function groundRaw(x: number, z: number) {
  const d = x - shoreX(z);                                                                    // inland of the waterline
  if (d < 0) return Math.max(-9, -0.3 + d * 0.14);                                          // the sea, shelving
  let h = 4 + fbm(noise, x * 0.004, z * 0.004, 4) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.8;
  // the dunes the whole length of the shore: the beach, then hummocks of loose sand, dying out inland
  const dune = smoothstep(14, 50, d) * smoothstep(210, 130, d + fbm(noise, 9, z * 0.01, 2) * 30);
  h = h * smoothstep(0, 40, d) + (0.6 + d * 0.03) * (1 - smoothstep(0, 40, d));
  h += dune * (3 + ridged(noise, x * 0.014 + 2, z * 0.022, 3) * 9);
  h += 7 * smoothstep(120, 40, Math.hypot(x, z));                                            // Gaza on its low hill
  for (const [x0, z0, x1, z1, w, hh] of RIDGES) h += hh * smoothstep(w, 0, segDist([[x0, z0], [x1, z1]], x, z)) ** 1.3;
  h -= 2.4 * smoothstep(9, 3, wadiD(x, z)) * smoothstep(20, 60, d);                          // the wadi beds
  const r = Math.hypot(x, z);
  if (r > 50 && r < 240) h -= 0.9 * smoothstep(5, 2.5, roadD(x, z)) * smoothstep(240, 200, r); // the sunken lanes round the town
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return Math.max(h, 0.6);
}
const height = gridCacheSmooth(groundRaw, EXT, 2);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Deir el Belah road', 0, 470, 'centre'),
  P('B', 'Sheikh Ajlin', -370, 300, 'west'),
  P('C', 'Mansura', 60, 270, 'centre'),
  P('D', 'Sheikh Abbas', 270, 128, 'east'),
  P('E', 'Samson Ridge', -300, 110, 'west'),
  P('F', 'Gaza', 0, 0, 'centre', { radius: 34 }),
  P('G', 'Ali Muntar', 258, -125, 'east'),
  P('H', 'Umbrella Hill', -310, -100, 'west'),
  P('I', 'Tank Redoubt', -50, -260, 'centre'),
  P('J', 'Sea Post', -400, -310, 'west'),
  P('K', 'Huj road', 0, -470, 'centre'),
] as any[];

/** The sea: water that stops, as a river’s does (a land battle — bodo.ts). */
const sea = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false,
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2c6a7c, roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.9 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    water.userData.noAO = true;
    scene.add(water);
    this.waterMesh = water;
  },
};

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Section' }];

export default {
  id: 'gaza',
  name: 'Gaza',
  description: '1–2 November 1917: the strong end of the Gaza–Beersheba line — the old town and its Great Mosque, orchards in prickly-pear hedges and sunken lanes, the Ali Muntar ridge, redoubts and wire in the sand dunes along the Mediterranean, the dry Wadi Ghuzze.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  armies: { nato: ['uk'], pact: ['ot'] }, // (XXI Corps against the Ottoman Eighth Army)
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  conditions: { time: 'dawn', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.6,
  seed: 1917,
  height,
  river: sea,
  fields: createFields({ seed: 191711, cell: 80 }),

  theme: {
    // a clear November morning on the coast, the sun low, a haze off the sea
    fogColor: 0xd6d0bc, fogDensity: 0.0009, skyTop: 0x7aa0c6, skyHorizon: 0xe4dece, skyBottom: 0xb4a88c,
    sunColor: 0xfff0d6, sunIntensity: 2.1, sunDisk: 0.8, clouds: 0.12, cloudLight: 0xf6f2ea, cloudDark: 0xc8c2b6,
    sunDir: [0.55, 0.42, -0.45], hemiSky: 0xd8dee6, hemiGround: 0x9c8a66, hemiIntensity: 1.2, rimColor: 0xf0e4c8, rimIntensity: 0.3,
    terrain: {
      grass: '#a8966c', grassAlt: '#9c8c62', dryGrass: '#c4b07e', dirt: '#9c7a56', rock: '#a69a84',
      pasture: '#a8966a', ploughed: '#96744f', stubble: '#c8b282', meadow: '#a8986c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = x - shoreX(z);
        if (d < 2) return [y > -1.2 ? 0xd8caa2 : 0x4c7c84, 1];                           // the wet sand, then the sea
        if (onRoad(x, z)) return [0xc8b48c, 0.85];
        if (d < 190 && height(x, z) > 2 && d > 0) {
          const k = smoothstep(200, 120, d);
          if (k > 0.2) return [0xe0d0a4, Math.min(1, k * 1.2)];                              // the dunes’ pale loose sand
        }
        if (wadiD(x, z) < 8) return [0xd4caae, 0.85];                                       // the wadi’s stones
        if (inGrove(x, z, 2)) return [0x7e5c3e, 0.7];                                       // the orchards’ red earth
        if (Math.hypot(x, z) < TOWN_R) return [0xb4a284, 0.6];                              // the town’s beaten earth
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.22 ? [0x8c8458, Math.min(0.4, (scrub - 0.22) * 2)] : null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Takım' })),
  },

  /** Each side’s fire trench in front of its points with two belts of wire in the sand, machine guns in the redoubts. */
  battlefield() {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const tz = (x: number) => (s > 0 ? 66 + 12 * Math.sin(x * 0.02) : -68 - 14 * Math.sin(x * 0.017 + 1));
      const pts: number[][] = [];
      for (let x = -440; x <= 470; x += 28) pts.push([x * s, tz(x * s)]);                    // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 26, belts: 2, gapEvery: 60 })) if (!onRoad(w.x, w.z) && Math.hypot(w.x, w.z) > TOWN_R + 6 && w.x > shoreX(w.z) + 6) works.push(w);
      const yaw = f === 'nato' ? Math.PI : 0;
      for (const p of points) if ((s > 0 ? ['B', 'D', 'E'] : ['G', 'H', 'J']).includes(p.id)) works.push({ kind: 'mgNest', x: p.x + 8, z: p.z - 14 * s, yaw, faction: f });
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene);
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, pad = 0) => x < shoreX(z) + pad;
    const skip = (x: number, z: number) => roadD(x, z) < 8 || wadiD(x, z) < 12 || inGrove(x, z, 4) || wet(x, z, 20);

    // ---- the old town of Gaza: flat-roofed houses packed round the Great Mosque, its minaret over everything
    props.rand = mulberry32(1917_01);
    const r0 = props.rand, placed: number[][] = [[-14, 14, 16]];
    props.flatHouse({ x: -14, z: 14, yaw: 0.1, width: 26, depth: 16, storeys: 2, name: 'Great Mosque', dome: true });
    const minaret = (x: number, z: number, h: number) => {
      const g = terrain.heightAt(x, z), m = new THREE.Matrix4();
      props.push('stone', new THREE.CylinderGeometry(1.1, 1.4, h, 8), m.makeTranslation(x, g + h / 2, z), 0xd8ccb0);
      props.push('stone', new THREE.CylinderGeometry(1.9, 1.6, 0.7, 8), m.makeTranslation(x, g + h * 0.8, z), 0xc8bca0); // the gallery
      props.push('stone', new THREE.ConeGeometry(1.2, 3, 8), m.makeTranslation(x, g + h + 1.5, z), 0x7a8a7a);
      cover.addCylinder({ x, z, radius: 1.5, height: h });
    };
    minaret(4, 26, 24);                                                                         // the Great Mosque’s
    minaret(46, -40, 17);                                                                       // a quarter’s mosque
    props.flatHouse({ x: 40, z: -48, yaw: 0, width: 12, depth: 9, name: 'mosque', dome: true });
    placed.push([40, -48, 9]);
    for (let i = 0; i < 400 && placed.length < 52; i++) {
      const a = r0() * Math.PI * 2, d = 18 + r0() * (TOWN_R - 22);
      const px = Math.cos(a) * d, pz = Math.sin(a) * d;
      if (roadD(px, pz) < 7 || nearPoint(px, pz, 12) || placed.some(([qx, qz, qr]) => Math.hypot(qx - px, qz - pz) < qr + 6)) continue;
      placed.push([px, pz, 6]);
      props.flatHouse({ x: px, z: pz, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (r0() - 0.5) * 0.2, width: 6 + r0() * 5, depth: 5 + r0() * 4, storeys: r0() < 0.35 ? 2 : 1 });
      if (r0() < 0.4) props.lowWall({ x: px + 5, z: pz + 4, yaw: r0() < 0.5 ? 0 : Math.PI / 2, length: 6 + r0() * 6, height: 1.8, color: 0xc0aa82 });
    }

    // ---- the villages and the posts: Mansura and Sheikh Ajlin on the British half, the Tank Redoubt’s hamlet and Sea Post on the Ottoman
    for (const [id, n, mosque] of [['C', 8, true], ['B', 6, false], ['I', 8, true], ['J', 6, false]] as [string, number, boolean][]) {
      const p = points.find((q) => q.id === id);
      arabVillage(props, p.x, p.z, n, 1917 + Math.round(p.x * 3 + p.z * 7), skip, mosque);
    }
    // the sheikhs’ tombs on the two ridges (the weli on Ali Muntar, Sheikh Abbas’s own), sandbagged posts round them and on the dunes
    for (const p of points) {
      if (!['D', 'E', 'G', 'H', 'B', 'J', 'I', 'C'].includes(p.id)) continue;
      props.rand = mulberry32(1918 + p.x + p.z);
      if (p.id === 'D' || p.id === 'G') props.flatHouse({ x: p.x - 10, z: p.z + 6, yaw: 0.4, width: 6, depth: 6, name: 'weli', dome: true });
      props.sandbagRing({ x: p.x + 12, z: p.z - 4, radius: 5, toward: p.z > 0 ? -1 : 1 });
      props.sandbagRing({ x: p.x - 14, z: p.z - 10, radius: 4.5, toward: p.z > 0 ? -1 : 1 });
    }

    // ---- the cactus hedges: round each orchard (a gate in each side) and down both sides of the sunken lanes near the town
    props.rand = mulberry32(1917_02);
    const cactus = (x: number, z: number, yaw: number, length = 10) => {
      if (!onRoad(x, z) && !wet(x, z, 10) && Math.hypot(x, z) > TOWN_R - 10 && !nearPoint(x, z, 10)) props.lowWall({ x, z, yaw, length, height: 1.9, color: 0x5e6e3c });
    };
    for (const [gx, gz, w, d] of GROVES) {
      for (const [lx, lz, len, alongX] of [[0, d / 2, w, 1], [0, -d / 2, w, 1], [w / 2, 0, d, 0], [-w / 2, 0, d, 0]] as number[][]) {
        for (let t = -len / 2 + 6; t < len / 2 - 4; t += 12) {
          if (Math.abs(t) < 5) continue;
          cactus(gx + lx + (alongX ? t : 0), gz + lz + (alongX ? 0 : t), alongX ? 0 : Math.PI / 2);
        }
      }
      props.flatHouse({ x: gx + w / 4, z: gz - d / 4, yaw: 0, width: 5, depth: 4, name: 'well-house' });
    }
    for (const poly of ROADS) for (let i = 0; i < poly.length - 1; i++) {
      const [ax, az] = poly[i], [bx, bz] = poly[i + 1], len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len;
      for (let t = 6; t < len - 6; t += 12) {
        const x = ax + dx * t, z = az + dz * t, rr = Math.hypot(x, z);
        if (rr < TOWN_R + 5 || rr > 230 || inGrove(x, z, 6) || (t / 12) % 5 < 1) continue;     // (a field gate now and then)
        for (const o of [-6, 6]) cactus(x - dz * o, z + dx * o, Math.atan2(-dz, dx), 10);
      }
    }

    // ---- rocks, field walls and wrecked carts over the plain; palms by the shore and in the town gardens
    const r = mulberry32(1917);
    for (let i = 0, n = 0; i < 4000 && n < 60; i++) {
      const x = (r() * 2 - 1) * 470, z = (n % 2 ? -1 : 1) * (40 + r() * 470);
      if (skip(x, z) || nearPoint(x, z, 40) || Math.hypot(x, z) < 130 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || x < shoreX(z) + 170) continue;
      n++;
      buildSite(props, { kind: ['rocks', 'fieldwall', 'wrecks', 'fieldwall'][Math.floor(n / 2) % 4], seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    for (let i = 0; i < 160; i++) {
      const z = (i % 2 ? -1 : 1) * (20 + r() * 520), x = i < 70 ? shoreX(z) + 20 + r() * 60 : (r() * 2 - 1) * 480;
      if (skip(x, z) || nearPoint(x, z, 20) || (i >= 70 && Math.hypot(x, z) < TOWN_R && placed.some(([qx, qz, qr]) => Math.hypot(qx - x, qz - z) < qr + 2))) continue;
      props.rand = mulberry32(i);
      props.palm({ x, z, height: 7 + r() * 6 });
    }
    commandPost(props, this.bases.nato, -1, 0xb0a07a);
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 26 }, { x: 0, z: -BASE_Z, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => onRoad(x, z) || wadiD(x, z) < 4 || wet(x, z, 8) || Math.hypot(x, z) < TOWN_R - 10 }];
    // fruit trees in the orchards (figs, oranges, apricots), olives and sycamore figs scattered elsewhere — not on the dunes
    const tP = evenThreshold((x, z) => fbm(noise, x * 0.01 + 20, z * 0.01, 2), 0.32, (x, z) => z > 0);
    const orchards = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1400, broadleaf: 1, autumn: 0.1, size: 0.55, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3) }], forest: (x: number, z: number) => (inGrove(x, z) ? 1 : -1) });
    const olives = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 240, broadleaf: 1, autumn: 0.15, size: 0.7, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 6) || x < shoreX(z) + 200 }],
      forest: (x: number, z: number) => (fbm(noise, x * 0.01 + 20, z * 0.01, 2) > (z > 0 ? 0.32 : tP) ? 0.4 : 0.02) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 0.5, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); orchards.update(dt, t); olives.update(dt, t); },
    };
  },
} satisfies MapDef;
