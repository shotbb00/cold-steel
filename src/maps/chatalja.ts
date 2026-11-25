// Chatalja (Çatalca), the last fortified line before Constantinople. In November 1912 Nazım Pasha’s Ottomans stopped the
// Bulgarian army here, behind a chain of forts and redoubts on the ridges between Lake Terkos by the Black Sea and the
// Büyükçekmece lagoon on the Sea of Marmara, with the marshes of the Karasu in front. In this war it is the battle that
// would have come had the fleet forced the Dardanelles in 1915: a British, French and ANZAC army landed in Thrace,
// advancing up the Oriental Railway from the west on Constantinople, against the Ottoman army and its German
// officers and batteries in the old forts.
// On the map (west, nato, at +z): Lake Terkos along the whole west edge, the Büyükçekmece lagoon along the whole east
// edge; across the middle the Karasu valley, a wide wet meadow with reed-fringed pools and the stream in its deep
// channel, crossed only where the roads and the railway go on their causeways; the town of Chatalja on its banks with
// the station, the mosque and the railway bridge, Lazarköy on its mound at the west end of the marsh, Kadıköy by the
// lagoon at the east. Behind the valley the two ridges: the Ottoman forts (Fort Hamidiye over Lake Terkos, the
// Mahmudiye Tabya in the middle, Fort Ahmediye over the lagoon) and Hadımköy station behind them; the Allied ridge with
// the works the Bulgarians dug in 1912 (Ormanlı, the Kabakça heights, Ezetin) and the Çerkezköy railhead behind it.
// The land rises toward the Istranca hills over Lake Terkos and falls toward the Marmara lagoon, on both ridges alike.
// Rolling grassland and scrub, small fields, oak copses; a clear early autumn day.
// Not mirrored but fair: the Allied ridge answers the Ottoman one — the same height, levelled tops at the same reach
// from each base, the Bulgarian redoubts of 1912 built like the Ottoman forts (one earthwork pattern for all six); each
// half has its height over Lake Terkos (Ormanlı, Hamidiye) and its height over the lagoon (Ezetin, Ahmediye) at the
// same reach, each with its own road down its lane. Both lagoons run the whole length of the field, as much shore on
// each half. The Karasu valley lies across the middle, its marsh and its channel split between the halves; both fight
// for Lazarköy, Chatalja and Kadıköy in it, crossed on the same three causeways and the railway embankment.
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
const noise = createNoise2D(1912_11);
const bell = (v: number, c: number, w: number) => Math.exp(-(((v - c) / w) ** 2));

/** The lagoons’ shores: Lake Terkos on the west, the Büyükçekmece lagoon on the east, each with a bay on each half. */
const shoreW0 = (z: number) => -445 + 8 * Math.sin(z * 0.007 + 0.4) + fbm(noise, 1.7, z * 0.005, 2) * 8 + 45 * bell(z, 330, 70) + 45 * bell(z, -330, 70) - 40 * bell(z, 0, 90);
const shoreE0 = (z: number) => 448 + 8 * Math.sin(z * 0.006 + 2) + fbm(noise, 5.1, z * 0.004, 2) * 8 - 45 * bell(z, 0, 80);
/** Both shores tabled every metre (asked for every height). */
const table = (f: (z: number) => number) => { const t = Float32Array.from({ length: 1201 }, (_, i) => f(i - 600)); return (z: number) => { const i = Math.round(z) + 600; return i >= 0 && i <= 1200 ? t[i] : f(z); }; };
const shoreW = table(shoreW0), shoreE = table(shoreE0);
const wet = (x: number, z: number, pad = 0) => x < shoreW(z) + pad || x > shoreE(z) - pad;

/** The Karasu: its course across the middle (z at x), the valley round it. */
const valZ = (x: number) => 30 * Math.sin(x * 0.006 + 0.5) + 9 * Math.sin(x * 0.017 + 1.3);
const away = (x: number, z: number) => Math.abs(z - valZ(x));

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Çerkezköy railhead', -20, 470, 'centre'),
  P('B', 'Ormanlı', -330, 290, 'west'),
  P('C', 'Kabakça Heights', -40, 265, 'centre', { radius: 26 }),
  P('D', 'Ezetin', 270, 300, 'east'),
  P('E', 'Lazarköy', -310, Math.round(valZ(-310) + 38), 'west'),
  P('F', 'Chatalja', 20, Math.round(valZ(20)), 'centre', { radius: 32 }),
  P('G', 'Kadıköy', 280, Math.round(valZ(280) - 38), 'east'),
  P('H', 'Fort Hamidiye', -335, -290, 'west'),
  P('I', 'Mahmudiye Tabya', -35, -265, 'centre', { radius: 26 }),
  P('J', 'Fort Ahmediye', 260, -300, 'east'),
  P('K', 'Hadımköy station', -20, -470, 'centre'),
] as any[];
const at = (id: string) => points.find((p) => p.id === id);

/** The roads: down each lane from base to base, a lateral behind each ridge, the valley road through the three places in the marsh. */
const ROADS = [
  [[-20, 580], [-20, 470], [-10, 380], [-40, 265], [-30, 130], [-5, 50], [at('F').x, at('F').z], [-5, -50], [-20, -130], [-35, -265], [-10, -380], [-20, -470], [-20, -580]],
  [[-330, 385], [-330, 290], [-320, 160], [at('E').x, at('E').z], [-325, -120], [-335, -290], [-330, -372]],
  [[265, 385], [270, 300], [255, 160], [at('G').x, at('G').z], [265, -160], [260, -300], [265, -372]],
  [[-440, 395], [-330, 385], [-160, 392], [-10, 380], [130, 386], [265, 385], [440, 400]],
  [[-440, -380], [-330, -372], [-150, -362], [-10, -380], [120, -372], [265, -372], [440, -385]],
  [[-400, at('E').z + 6], [at('E').x, at('E').z], [-160, valZ(-160) + 32], [at('F').x, at('F').z], [150, valZ(150) - 32], [at('G').x, at('G').z], [420, at('G').z - 6]],
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
/** The Oriental Railway, Çerkezköy to Hadımköy through Chatalja station (beside the town’s road, east of it). */
const RAIL = [[80, 590], [75, 470], [60, 330], [55, 150], [46, at('F').z + 30], [46, at('F').z - 30], [55, -150], [60, -330], [75, -470], [80, -590]];
const railD = gridCache((x: number, z: number) => segDist(RAIL, x, z), EXT, 2);
/** The causeways over the marsh: the roads and the railway, sampled only over the valley (the height asks it there alone). */
const crossD = gridCache((x: number, z: number) => Math.min(segDist(RAIL, x, z), ...ROADS.slice(0, 3).concat([ROADS[5]]).map((r) => segDist(r, x, z))), { x: 520, z: 150 }, 2);

/** Each half’s heights [x, z, rx, rz, h]: the ridge tops, the heights over the lagoons, the mounds in the marsh. */
const DOMES = [
  [-40, 265, 200, 120, 10], [-35, -265, 200, 120, 10],
  [-330, 290, 120, 110, 6], [-335, -290, 120, 110, 6],
  [270, 300, 120, 110, 6], [260, -300, 120, 110, 6],
  [at('E').x, at('E').z, 60, 45, 3], [at('G').x, at('G').z, 60, 45, 3], [at('F').x, at('F').z, 90, 60, 1.5],
];
/** Spurs (+) and re-entrants (−) down each ridge’s forward slope [x, z, r, h], each half its own. */
const SIDES = [[-180, 160, 90, 12], [170, 175, 80, -10], [-170, -185, 85, 11], [190, -165, 90, -11], [-420, -120, 70, 8], [60, 140, 70, -6]];
/** The ground before the shelves and the lagoon shores (sampled once: its noise is dear). */
const slope = gridCacheSmooth((x: number, z: number) => {
  const a = away(x, z);
  const n = z > valZ(x);                                                                               // (each ridge its own: the Allied a long even slope, the forts’ steeper with a lower back)
  const crest = n ? 245 + 45 * Math.sin(x * 0.009 + 1.4) : 265 + 50 * Math.sin(x * 0.006 + 2.6);
  let h = 1.1 + 25.4 * smoothstep(n ? 60 : 95, crest, a) - (n ? 7 : 11) * smoothstep(crest + 60, crest + 290, a); // the valley, the two ridges, the backs falling to the bases
  h += (fbm(noise, x * 0.004, z * 0.004, 4) * 5 + ridged(noise, x * (n ? 0.008 : 0.011) + 3, z * (n ? 0.008 : 0.011), 3) * 7) * smoothstep(60, 160, a); // rolling grassland
  h += (16 * smoothstep(80, -320, x) - 5 * smoothstep(120, 420, x)) * smoothstep(50, 200, a);          // the land rising north toward the Istranca hills over Lake Terkos, falling to the lagoon in the south (on both ridges)
  for (const [sx, sz, r, sh] of SIDES) h += sh * smoothstep(r, 0, Math.hypot(x - sx, (z - sz) * 0.7)) ** 1.4;
  h += fbm(noise, x * 0.02 + 7, z * 0.02, 2) * 0.6;
  for (const [dx, dz, rx, rz, dh] of DOMES) h += dh * smoothstep(1, 0, Math.hypot((x - dx) / rx, (z - dz) / rz)) ** 1.3;
  // the marsh: reed-fringed pools in the wet meadow (shallow: men wade, wheels keep to the causeways)
  const m = fbm(noise, x * 0.018 + 20, z * 0.018 - 5, 3);
  if (a < 75) h = Math.min(h, h - smoothstep(0.12, 0.28, m) * smoothstep(75, 45, a) * (h + 0.5));
  return h;
}, EXT, 4);

// the shelves the points and bases stand on, the pairs levelled alike (B/H, C/I, D/J, E/G)
const SHELVES = [[-20, BASE_Z, 34], [-20, -BASE_Z, 34], ...points.filter((p) => !p.owner).map((p) => [p.x, p.z, p.id === 'F' ? 40 : 22])];
const PAIRS: Record<string, string> = { B: 'H', H: 'B', C: 'I', I: 'C', D: 'J', J: 'D', E: 'G', G: 'E' };
// (worked out on first use, not at import: every map is imported at start, and this samples a cached grid)
let SHELF_H_: number[] | undefined;
const shelfH = () => (SHELF_H_ ??= SHELVES.map(([x, z], i) => {
  if (i < 2) return (slope(-20, BASE_Z) + slope(-20, -BASE_Z)) / 2;
  const p = points.filter((q) => !q.owner)[i - 2], q = PAIRS[p.id] && at(PAIRS[p.id]);
  const s = q ? (slope(x, z) + slope(q.x, q.z)) / 2 : slope(x, z);
  return Math.max(s, 1.4);
}));
const ground = gridCacheSmooth((x: number, z: number) => {
  let h = slope(x, z);
  SHELVES.forEach(([sx, sz, r], i) => { h += (shelfH()[i] - h) * smoothstep(r + 26, r, Math.hypot(x - sx, z - sz)); });
  return h;
}, EXT, 2);

/** Carved after the cache: the lagoon shores, the Karasu’s channel, the causeways and the railway embankment over the marsh. */
function height(x: number, z: number) {
  const dW = x - shoreW(z), dE = shoreE(z) - x, d = Math.min(dW, dE);
  if (d < 0) return Math.max(-4, -0.6 + d * 0.06);                                                    // the lagoons: shallow, silty
  let h = Math.min(ground(x, z), 0.5 + Math.max(0, d - 8) * 0.22);
  const a = away(x, z);
  if (a < 9) h = Math.min(h, -1.8 + 2.3 * smoothstep(5, 9, a));                                       // the stream in its channel
  if (a < 110) {
    const c = crossD(x, z);
    if (c < 9) h = Math.max(h, 1.2 * smoothstep(9, 5, c) + h * smoothstep(5, 9, c));                  // the causeways and the bridges
  }
  return h;
}

/** The water: one sheet at 0 over the lagoons, the pools and the channel (a land battle — krithia.ts). */
const sea = {
  ...createSea({ level: 0, size: 1600 }),
  waterMesh: null as any,
  sea: false,
  build(scene: any) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a6a70, roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.88 });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), mat);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    water.userData.noAO = true;
    scene.add(water);
    this.waterMesh = water;
  },
};
const lowWet = (x: number, z: number) => away(x, z) < 80 && slope(x, z) < 0.35;

/** The oak copses [x, z, w, d]: the same area on each half. */
const COPSES = [[-200, 200, 80, 60], [150, 230, 70, 60], [-180, 420, 60, 50], [330, 440, 60, 50],
  [-190, -210, 80, 60], [160, -220, 70, 60], [-190, -430, 60, 50], [320, -440, 60, 50]];
const inCopse = (x: number, z: number, pad = 0) => COPSES.some(([gx, gz, w, d]) => Math.abs(x - gx) < w / 2 + pad && Math.abs(z - gz) < d / 2 + pad);

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 22, name: '1st Platoon, 2nd Royal Fusiliers' }];

export default {
  id: 'chatalja',
  name: 'Chatalja',
  description: 'The Chatalja lines in Thrace, the last fortified line before Constantinople, where the Ottomans stopped the Bulgarians in 1912 — here the Allied army that would have come had the Dardanelles been forced. The forts on the ridges between Lake Terkos and the Büyükçekmece lagoon, the Karasu marshes in front, Chatalja town and its station on the Oriental Railway; rolling grassland and scrub.',
  epochs: ['1918'],
  region: 'middleEast',
  armies: { nato: ['uk', 'fr', 'anzac'], pact: ['ot', 'de'] }, // (a British, French and ANZAC army landed in Thrace against the Ottoman army and its German officers and batteries)
  sides: { nato: 'British Empire and France', pact: 'Ottoman Empire' },
  conditions: { time: 'day', weather: 'clear' },
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1912,
  height,
  river: sea,
  fields: createFields({ seed: 191211, cell: 60 }),

  theme: {
    // a clear early-autumn day in Thrace: the grass gone gold, a haze off the lagoons
    fogColor: 0xccd0cc, fogDensity: 0.0008, skyTop: 0x5c84b4, skyHorizon: 0xdcdcd0, skyBottom: 0x9a9a88,
    sunColor: 0xfff0d8, sunIntensity: 2.0, sunDisk: 0.7, clouds: 0.25, cloudLight: 0xf6f2ea, cloudDark: 0xb0b0aa,
    sunDir: [0.35, 0.6, 0.35], hemiSky: 0xd4dce4, hemiGround: 0x7a7050, hemiIntensity: 1.2, rimColor: 0xf0e4c8, rimIntensity: 0.3,
    terrain: {
      grass: '#7e844c', grassAlt: '#727a46', dryGrass: '#b0a470', dirt: '#8a7454', rock: '#a8a08a',
      pasture: '#7a844c', ploughed: '#7a6248', stubble: '#b8a874', meadow: '#828c52',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (wet(x, z, 2)) return [y > -0.8 ? 0x8a8466 : 0x3e6a70, 1];                                 // the mud of the shore, then the lagoon
        if (railD(x, z) < 2.4) return [0x4a443c, 0.85];                                              // the ballast
        if (onRoad(x, z)) return [0xa8946e, 0.85];                                                   // the dusty roads
        if (wet(x, z, 9)) return [0x9a9070, 0.8];                                                    // the lagoon beach
        const a = away(x, z);
        if (a < 80 && y < 0.6) return [0x6a7444, 0.75];                                              // sedge and reeds in the marsh
        if (a < 90) return [0x6e7c48, 0.4];                                                          // the wet meadow
        const scrub = fbm(noise, x * 0.04 + 9, z * 0.04, 2);
        return scrub > 0.2 ? [0x5a6440, Math.min(0.55, (scrub - 0.2) * 2)] : null;                   // thorn and kermes-oak scrub
      },
    },
  },

  bases: { nato: { x: -20, z: BASE_Z, entries: [-330, -20, 265] }, pact: { x: -20, z: -BASE_Z, entries: [-330, -20, 265] } },
  maxStacks: 26,
  cameraStart: { nato: { x: -20, z: 360 }, pact: { x: -20, z: -360 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -40 - s.x, z: -s.z, facing: 0, name: '1. Bölük, 42. Alay' })),
  },

  /** Each side’s fire trench across its forward slope, wire in front (gaps where the roads go, none in the marsh or the lagoons); MG nests at the heights over the lagoons. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -460; x <= 460; x += 25) { const X = x * s; pts.push([X, s > 0 ? 165 + 12 * Math.sin(X * 0.017) : -165 - 12 * Math.sin(X * 0.013 + 2)]); } // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { zig: 1.5, wireAt: 24, belts: 2, gapEvery: 50 })) if (roadD(w.x, w.z) > 9 && railD(w.x, w.z) > 7 && !wet(w.x, w.z, 14)) works.push(w);
      for (const id of s > 0 ? ['B', 'D'] : ['H', 'J']) { const p = at(id); for (const dx of [-14, 14]) { const x = p.x + dx, z = p.z - 18 * s; if (roadD(x, z) > 9) works.push({ kind: 'mgNest', x, z, yaw: f === 'nato' ? Math.PI : 0, faction: f }); } }
    }
    return { blasts: [], ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    sea.build(scene);
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const soggy = (x: number, z: number) => terrain.heightAt(x, z) < 0.5 || away(x, z) < 12;
    const skip = (x: number, z: number) => roadD(x, z) < 9 || railD(x, z) < 9 || wet(x, z, 20) || soggy(x, z) || steepAt(x, z) > 0.3;
    const cyl = (x: number, z: number, r0: number, r1: number, h: number, color: number) => {
      const y = terrain.heightAt(x, z) - 0.3;
      props.push('stone', new THREE.CylinderGeometry(r0, r1, h, 14), new THREE.Matrix4().makeTranslation(x, y + h / 2, z), color);
      cover.addCylinder({ x, z, radius: r1, height: h });
    };
    /** A mosque: the domed prayer hall, the minaret beside it. */
    const mosque = (x: number, z: number, yaw = 0) => {
      if (skip(x, z) || skip(x + 8, z + 4)) return;
      props.flatHouse({ x, z, yaw, width: 11, depth: 9, name: 'mosque', dome: true });
      cyl(x + 8, z + 4, 0.7, 0.9, 16, 0xe2dccc);
      cyl(x + 8, z + 4, 0.1, 0.8, 3.5, 0x8a8a8a);
    };

    // Chatalja: stone and timber houses either side of the stream, the mosque, the station on the railway
    const F = at('F');
    props.rand = mulberry32(1912_01);
    const placed: number[][] = [];
    for (let i = 0; i < 120 && placed.length < 18; i++) {
      const a = props.rand() * Math.PI * 2, dd = 22 + props.rand() * 50, x = F.x + Math.cos(a) * dd * 1.3, z = F.z + Math.sin(a) * dd;
      if (skip(x, z) || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 13)) continue;
      placed.push([x, z]);
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (props.rand() - 0.5) * 0.2, width: 7 + props.rand() * 3, depth: 7 + props.rand() * 2, storeys: props.rand() < 0.4 ? 2 : 1, damaged: 0.1 });
    }
    mosque(F.x - 60, F.z - 30, 0);
    props.flatHouse({ x: 46 + 15, z: F.z + 42, yaw: Math.PI / 2, width: 18, depth: 9, storeys: 2, name: 'Chatalja station' });
    props.wagon({ x: 46, z: F.z + 75, yaw: 0 });
    props.wagon({ x: 47, z: F.z + 90, yaw: 0, kind: 'open' });
    for (let i = 0; i < RAIL.length - 1; i++) props.rails({ x0: RAIL[i][0], z0: RAIL[i][1], x1: RAIL[i + 1][0], z1: RAIL[i + 1][1] });
    // Hadımköy station behind the forts, the railhead at Çerkezköy behind the Allied ridge
    props.flatHouse({ x: 90, z: -440, yaw: Math.PI / 2, width: 16, depth: 8, storeys: 2, name: 'Hadımköy station' });
    props.flatHouse({ x: 92, z: 430, yaw: Math.PI / 2, width: 16, depth: 8, storeys: 1, name: 'railhead office' });
    props.wagon({ x: 76, z: -500, yaw: 0, kind: 'tank' });
    props.wagon({ x: 75, z: 500, yaw: 0 });

    // the villages: Ormanlı, Ezetin, Lazarköy, Kadıköy — farmsteads round a mosque
    for (const [id, n, seed] of [['B', 8, 11], ['D', 8, 12], ['E', 9, 13], ['G', 9, 14]] as [string, number, number][]) {
      const p = at(id);
      farmVillage(props, p.x, p.z, n, 1912_00 + seed, skip, 1.1);
      mosque(p.x + 30, p.z + (p.z > 0 ? 26 : -26), 0);
    }

    // the redoubts: earth walls round each height, a gap toward its own rear — the Ottoman forts of the line on their
    // ridge, the works the Bulgarians dug in 1912 on the Allied one (one pattern for all six)
    props.rand = mulberry32(1912_03);
    for (const id of ['B', 'C', 'D', 'H', 'I', 'J']) {
      const p = at(id), rear = p.z > 0 ? Math.PI / 2 : -Math.PI / 2, R = (p.radius ?? 22) + 14;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        if (Math.abs(Math.atan2(Math.sin(a - rear), Math.cos(a - rear))) < 0.5) continue;
        const x = p.x + Math.cos(a) * R, z = p.z + Math.sin(a) * R;
        if (roadD(x, z) > 7 && railD(x, z) > 7) props.lowWall({ x, z, yaw: -a + Math.PI / 2, length: R * 0.55, height: 1.5, color: 0x9a8c6c });
      }
      props.sandbagRing({ x: p.x + 12, z: p.z + (p.z > 0 ? -10 : 10), radius: 4, toward: p.z > 0 ? -1 : 1 });
    }
    // the camps behind each ridge; dumps by the railheads
    for (let i = 0; i < 6; i++) props.tent({ x: -150 + (i % 3) * 9, z: -BASE_Z + 20 - Math.floor(i / 3) * 9, yaw: 0.1, color: 0xb0a482 });
    for (let i = 0; i < 6; i++) props.tent({ x: -150 + (i % 3) * 9, z: BASE_Z - 20 + Math.floor(i / 3) * 9, yaw: -0.1, color: 0xc0b498 });
    props.crates({ x: 110, z: BASE_Z - 40, yaw: 0.3 });
    props.crates({ x: 110, z: -BASE_Z + 40, yaw: 2.6 });
    // boulders and field stones over the grassland (each half its own)
    const r = mulberry32(1912_05);
    for (let i = 0; i < 360; i++) {
      const x = (r() * 2 - 1) * 470, z = (i % 2 ? -1 : 1) * (40 + r() * 500);
      if (skip(x, z) || away(x, z) < 90 || nearPoint(x, z, 40) || inCopse(x, z, 4) || Math.hypot(x + 20, Math.abs(z) - BASE_Z) < 40) continue;
      props.rand = mulberry32(i);
      props.boulder({ x, z, radius: 0.5 + r() * 1.4 });
    }
    commandPost(props, this.bases.nato, -1, 0xb8ac8c);
    commandPost(props, this.bases.pact, 1, 0xa89c7a);
    props.finish();

    const avoid = [{ x: -20, z: BASE_Z, r: 30 }, { x: -20, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 18 })),
      { test: (x: number, z: number) => roadD(x, z) < 5 || railD(x, z) < 5 || wet(x, z, 8) || terrain.heightAt(x, z) < 0.3 }];
    const north = (x: number, z: number) => z > valZ(x);
    // the scrub: patchy over the grassland, thick along the valley’s edges (as much on each half)
    const s0 = (x: number, z: number) => fbm(noise, x * 0.012 + 40, z * 0.012, 3);
    const tS = evenThreshold(s0, 0.15, north);
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 3200, broadleaf: 1, autumn: 0.2, size: 0.32, maxY: 200,
      avoid: [...avoid, { test: (x: number, z: number) => inCopse(x, z, 2) }],
      forest: (x: number, z: number) => { const a = away(x, z); return a < 80 ? -1 : a < 120 ? 0.4 : s0(x, z) > (north(x, z) ? 0.15 : tS) ? 0.45 : 0.03; } });
    // the oak copses; willows and alders along the Karasu
    const oaks = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 700, broadleaf: 1, autumn: 0.3, size: 0.75, maxY: 200,
      avoid: [...avoid, { test: (x: number, z: number) => !inCopse(x, z, -3) }], forest: (x: number, z: number) => (inCopse(x, z) ? 0.9 : -1) });
    const willows = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x, count: 500, broadleaf: 1, autumn: 0.1, size: 0.6, maxY: 200,
      avoid: [...avoid, { test: (x: number, z: number) => nearPoint(x, z, 45) || lowWet(x, z) }], forest: (x: number, z: number) => { const a = away(x, z); return a > 10 && a < 26 ? 0.5 : -1; } });
    cover.finalize(bounds);
    const grow = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 1.2, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { grow.update(dt, t); scrub.update(dt, t); oaks.update(dt, t); willows.update(dt, t); },
    };
  },
} satisfies MapDef;
