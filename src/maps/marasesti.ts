// Mărășești, 6 August – 3 September 1917: Mackensen’s German Ninth Army attacks north up the Siret valley from
// Focșani to break into Moldavia, the last free corner of Romania, and is stopped by the reformed Romanian First Army
// (Eremia Grigorescu, after Christescu) and the Russian divisions beside it — “Pe aici nu se trece”, they shall not
// pass. For days the fighting went back and forth through the Răzoare forest, round the railway junction of Mărășești
// and along the Siret’s marshy floodplain; by early September the Germans gave up.
// (The Romanian army has no roster of its own yet: it fights as the Russian Army, `ru`, until one is built.)
// On the map: the Siret down the east flank, broad and slow, its floodplain of reed and wet meadow, the railway bridge
// of the Tecuci line in the middle and a pontoon bridge in each half, the strip of its left bank beyond; Mărășești in
// the middle with its station and the junction where the Adjud–Focșani main line meets the branches to Panciu and
// Tecuci; the Răzoare forest west of the town on a low rise; the Mărășești–Panciu road west through it; the low hills
// rising west toward the Carpathian foothills with their vineyards; maize and stubble on the plain; whitewashed villages
// with Orthodox churches (Muncelu, Pădureni, Doaga behind the Romanian line; Varnița, Călimănești, Tișița behind the
// German); a hasty trench line on each side.
// Not mirrored but fair: the Siret runs down the flank through both halves alike — each side a pontoon bridge at the
// same reach from its base and a village by the river (Doaga; Tișița), the railway bridge between them in no man’s land.
// The foothills rise westward the whole length of the field, as high on each half; the Răzoare forest and the town
// straddle the middle; each side one low rise (Pădureni; Călimănești) of the same height at the same reach, its own
// woods of the same area (evenThreshold), the same number of vineyards, a trench line at the same depth.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { pontoons, farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const SEED = 1917_08;
const noise = createNoise2D(SEED);

/** A north–south path’s x at z (its points run south to north). */
const xAt = (poly: number[][], z: number) => {
  for (let i = 0; i < poly.length - 1; i++) if (z <= poly[i + 1][1]) return poly[i][0] + (poly[i + 1][0] - poly[i][0]) * (z - poly[i][1]) / (poly[i + 1][1] - poly[i][1]);
  return poly[poly.length - 1][0];
};

// ---- the Siret down the east flank
const SIRET = [[262, -640], [236, -420], [258, -260], [318, -130], [380, 0], [418, 160], [432, 330], [470, 480], [478, 640]];
const BR = { rail: 0, north: 320, south: -330 };
// ---- the Șușița, out of the hills across the west and through the town’s south side to the Siret
const SUSITA = [[-640, -10, 6], [-470, -40, 6], [-330, -75, 6], [-190, -50, 6], [-60, -60, 7], [70, -80, 7], [200, -110, 8], [xAt(SIRET, -125) - 6, -125, 9]];
const river = createRiver({
  paths: [SIRET, SUSITA], halfWidth: 17, level: 0, depth: 3, valley: 70,
  crossings: [
    { name: 'Răzoare ford', x: -400, z: -57, kind: 'ford', width: 12, channel: 1 },
    { name: 'Panciu road bridge', x: -150, z: -52, kind: 'bridge', width: 6, channel: 1 },
    { name: 'Mărășești bridge', x: 20, z: -72, kind: 'bridge', width: 7, channel: 1 },
    { name: 'Șușița ford', x: 160, z: -100, kind: 'ford', width: 12, channel: 1 },
    { name: 'Siret railway bridge', x: xAt(SIRET, BR.rail), z: BR.rail, kind: 'bridge', width: 10, channel: 0 },
    { name: 'Doaga pontoon bridge', x: xAt(SIRET, BR.north), z: BR.north, kind: 'bridge', width: 6, channel: 0, pontoon: true },
    { name: 'Cosmești pontoon bridge', x: xAt(SIRET, BR.south), z: BR.south, kind: 'bridge', width: 6, channel: 0, pontoon: true },
  ],
});
const wetD = gridCacheSmooth((x: number, z: number) => segDist(SIRET, x, z), { x: 720, z: 780 }, 4);
const susD = gridCacheSmooth((x: number, z: number) => segDist(SUSITA, x, z), { x: 720, z: 780 }, 4);   // (the channel’s middle line: river.project searches the whole course off its grid)
/** The reed marsh and wet meadow of the floodplain (0..1). */
const marshAt = (x: number, z: number) => smoothstep(0.05, 0.3, fbm(noise, x * 0.008 + 30, z * 0.008, 3)) * (1 - smoothstep(120, 190, wetD(x, z)));

// ---- roads and railways
const ROADS = [
  [[0, 640], [0, 470], [12, 260], [0, 120], [40, 10], [20, -72], [0, -140], [-14, -260], [0, -470], [0, -640]],         // Adjud – Mărășești – Focșani
  [[-330, 640], [-330, 470], [-352, 300], [-320, 140], [-300, 15], [-400, -57], [-325, -150], [-342, -300], [-330, -470], [-330, -640]], // the forest track
  [-640, -470, -330, -200, -60, 120, 300, 470, 640].map((z) => [xAt(SIRET, z) - 80, z]),                                    // the Siret road along the floodplain
  [[-500, 290], [-352, 300], [12, 260], [230, 320], [xAt(SIRET, BR.north), BR.north], [520, 330]],           // behind the Romanian line, to Doaga bridge
  [[-500, -310], [-342, -300], [-14, -260], [180, -300], [xAt(SIRET, BR.south), BR.south], [500, -335]],     // behind the German line, to Cosmești bridge
  [[-500, 40], [-300, 15], [-150, -52], [-60, -10], [40, 10]],                                                           // the Mărășești – Panciu road
  [[40, 10], [180, -8], [320, 0], [xAt(SIRET, 0), 0], [520, 4]],                                            // the Tecuci road over the railway bridge
  [-640, -330, 0, 330, 640].map((z) => [xAt(SIRET, z) + 70, z]),                                             // the left-bank road
];
const RAILS = [
  [[30, 640], [35, 300], [62, 40], [60, -20], [40, -300], [25, -640]],   // the main line, Adjud – Focșani
  [[62, 40], [200, 12], [xAt(SIRET, 0), 2], [520, 6]],                   // to Tecuci, over the Siret
  [[58, 18], [-100, 45], [-300, 42], [-500, 55]],                        // to Panciu
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);
const railD = gridCache((x: number, z: number) => Math.min(...RAILS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);

// ---- the points
const TOWN = { x: 40, z: 10 }, RAZ = { x: -290, z: 12 };
const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points: ControlPointDef[] = [
  P('A', 'Adjud road', 0, 470, 'centre'),
  P('B', 'Muncelu', -360, 300, 'west'),
  P('C', 'Pădureni', 50, 272, 'centre'),
  P('D', 'Doaga', 230, 320, 'east'),
  P('E', 'Răzoare forest', RAZ.x, RAZ.z, 'west', { radius: 30 }),
  P('F', 'Mărășești', TOWN.x, TOWN.z, 'centre', { radius: 32 }),
  P('G', 'Siret railway bridge', 320, 0, 'east', { radius: 24 }),
  P('H', 'Varnița', -342, -300, 'west'),
  P('I', 'Călimănești', -24, -265, 'centre'),
  P('J', 'Tișița', 180, -300, 'east'),
  P('K', 'Focșani road', 0, -470, 'centre'),
];

// the Răzoare forest: an oak wood on a low rise west of the town, straddling the middle
const razK = (x: number, z: number) => smoothstep(1, 0.75, Math.hypot((x - RAZ.x) / 140, (z - RAZ.z) / 95) + fbm(noise, x * 0.02 + 3, z * 0.02, 2) * 0.25);
// the two hill masses of the foothills in the west, split by the Șușița valley: the Muncelu–Răzoare heights north of it
// (behind the Romanians), the lower, more wooded Varnița heights south of it (behind the Germans) [x, z, r, h]
const HILLS = [[-450, 300, 300, 17], [-180, 360, 150, 5], [-420, -320, 260, 14], [-200, -380, 150, 4]];
const VARNITA = { x: -330, z: -230 };
// each side’s airfield behind its west flank (strip along x, the tower 55 m off it), graded flat and kept clear
const AIR = [{ faction: 'nato', x: -175, z: 430, yaw: Math.PI / 2, large: false }, { faction: 'pact', x: -175, z: -430, yaw: -Math.PI / 2, large: false }];
const airD = (x: number, z: number) => Math.min(...AIR.map((a) => Math.hypot(Math.max(0, Math.abs(x - a.x) - 125), Math.max(0, Math.abs(z - a.z - 27 * Math.sign(a.z)) - 52))));

const ground = gridCacheSmooth((x: number, z: number) => {
  const north = z > 0;
  // the old terrace of the Siret: a level plain of maize and stubble
  let h = 7 + fbm(noise, x * 0.004 + (north ? 0 : 37), z * 0.004, 4) * 2.5 + fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 0.6;
  const rough = 0.85 + fbm(noise, x * 0.008 + 51, z * 0.008, 3) * 0.6;
  for (const [hx, hz, r, hh] of HILLS) h += hh * smoothstep(r, 0, Math.hypot(x - hx, (z - hz) * 1.2)) ** 1.3 * rough;
  // the Șușița’s valley through the hills and across the terrace
  h = 2.4 + (h - 2.4) * smoothstep(14, 95, susD(x, z));
  h += (6.5 - h) * smoothstep(110, 60, Math.hypot(x - TOWN.x, z - TOWN.z));               // the town on the level
  // the terrace edge, a sharp step down to the wide floodplain; the left bank low beyond the river
  const d = wetD(x, z), east = x > xAt(SIRET, z);
  if (!east) h += (1.6 - h) * smoothstep(240, 185, d);
  else h = 1.6 + smoothstep(60, 120, d) * 2.5;
  h += (1.1 - h) * marshAt(x, z) * 0.85;
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 5 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  h += (7 - h) * smoothstep(30, 6, airD(x, z));
  return h;
}, { x: 700, z: 760 }, 4);
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z)));

// each side’s hasty trench line across the field, at the same depth from the middle (each its own wander); none in the marsh
const TRENCH = 125;
const trenchZ = (x: number, north: boolean) => (north ? TRENCH + 9 * Math.sin(x * 0.017 + 1) : -TRENCH - 10 * Math.sin(x * 0.013 + 2));
const trenchBand = (x: number, z: number) => Math.abs(z - trenchZ(x, z > 0)) < 28;

// the vineyards on the hillsides west: as many on each half, each its own place [x, z, yaw]
// (placed on first use, not at import: roadD/railD fill their grids, which every map's load would pay for)
let VINES_: number[][] | null = null;
const vines = () => {
  if (VINES_) return VINES_;
  const VINES: number[][] = (VINES_ = []);
  for (const s of [1, -1]) {
    const r = mulberry32(SEED + (s > 0 ? 11 : 29));
    for (let i = 0, n = 0; n < 8 && i < 400; i++) {
      const x = -470 + r() * 330, z = s * (160 + r() * 280);
      if (roadD(x, z) < 22 || railD(x, z) < 22 || airD(x, z) < 30 || razK(x, z) > 0 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 60) || VINES.some(([vx, vz]) => Math.hypot(vx - x, vz - z) < 60)) continue;
      VINES.push([x, z, (r() - 0.5) * 0.6]); n++;
    }
  }
  return VINES;
};
const vineD = (x: number, z: number) => Math.min(...vines().map(([vx, vz]) => Math.max(Math.abs(x - vx) - 20, Math.abs(z - vz) - 16)));

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'marasesti',
  name: 'Mărășești',
  description: 'August 1917: Mackensen’s Ninth Army drives up the Siret valley into Moldavia and the Romanian First Army and its Russian allies stop it at Mărășești — “they shall not pass”. The railway junction town, the Răzoare forest, vineyards on the low hills, maize on the plain, and the marshy Siret floodplain with its railway bridge down the east flank.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de'] }, // (Romanians fight as the Russian Army until they have their own roster)
  sides: { nato: 'Romania', pact: 'Germany' },
  conditions: { time: 'day', weather: 'clear' }, // (the attack opened on 6 August, high summer on the Moldavian plain)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: SEED,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  airfields: AIR,
  fields: createFields({ seed: SEED, cell: 80, weights: [0.2, 0.3, 0.3, 0.2] as any }),
  woods: (x: number, z: number) => razK(x, z) * 0.85,

  theme: {
    // a hot, hazy August day
    fogColor: 0xc4c0aa, fogDensity: 0.0011, skyTop: 0x5a86b8, skyHorizon: 0xd6d4c4, skyBottom: 0x8a8670,
    sunColor: 0xfff0d0, sunIntensity: 2.1, sunDisk: 0.35, clouds: 0.25, cloudLight: 0xf4f2ea, cloudDark: 0xa0a4a8,
    sunDir: [0.4, 0.7, 0.45], hemiSky: 0xc8d0da, hemiGround: 0x645a3a, hemiIntensity: 1.25, rimColor: 0xc8ccd0, rimIntensity: 0.25,
    terrain: {
      grass: '#66703a', grassAlt: '#5a6634', dryGrass: '#a89a5c', dirt: '#6e5a42', rock: '#8e887a', strip: '#5a4a36',
      pasture: '#62703a', ploughed: '#5e4c38', stubble: '#b4a462', meadow: '#6c7840',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-330, 0, 260], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (railD(x, z) < 2.8) return [0x5e564c, 0.9];                                 // ballast
        if (roadD(x, z) < 3.5) return [0x8a7458, 0.85];                                 // dusty dirt roads
        if (marshAt(x, z) > 0.3 && wetD(x, z) > 20) return [0x56602e, Math.min(0.85, marshAt(x, z))]; // reed and wet meadow
        if (y < 1.6 && wetD(x, z) < 34) return [0x8e8462, 0.8];                         // the muddy banks
        if (razK(x, z) > 0.4) return [0x4a4a2e, 0.75];                                // leaf litter under the Răzoare oaks
        if (vineD(x, z) < 0) return [0x7a6448, 0.7];                                   // the bare earth between the vine rows
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-330, 0, 260] }, pact: { x: 0, z: -BASE_Z, entries: [-330, 0, 260] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side’s trench line (one belt of wire, gaps at the roads), MG nests at the roads, shell holes between, the town knocked about. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      const pts: number[][] = [];
      for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato')]);   // (left to right as its owner looks)
      for (const w of trenchLine(pts, f, { wireAt: 20, belts: 1, gapEvery: 60 })) {
        if (roadD(w.x, w.z) < 8 || railD(w.x, w.z) < 5 || wetD(w.x, w.z) < 90 || w.x > xAt(SIRET, w.z) || razK(w.x, w.z) > 0.3) continue;
        works.push(w);
      }
      for (const x of [-330, 0, 270]) works.push({ kind: 'mgNest', x: x + 14, z: trenchZ(x + 14, f === 'nato') - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
    }
    const dens = (x: number, z: number) => (wetD(x, z) < 60 ? 0 : 0.8 * Math.exp(-(((Math.abs(z) - 60) / 70) ** 2)) + 0.04);
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b: number[]) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b: number[]) => b[1] < 0)]
      .filter((b: number[]) => roadD(b[0], b[1]) > 5 && railD(b[0], b[1]) > 4 && airD(b[0], b[1]) > 10 && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 30));
    const ruins = game.buildings.list.filter((b: any) => Math.abs(b.z) < 150 && mulberry32(b.index * 7 + SEED)() < 0.45).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const skip = (x: number, z: number) => wetD(x, z) < 40 || roadD(x, z) < 8 || railD(x, z) < 8 || trenchBand(x, z) || airD(x, z) < 25 || vineD(x, z) < 4 || razK(x, z) > 0.2;

    // Mărășești: whitewashed houses round the junction, two churches, the station on the main line
    props.rand = mulberry32(SEED + 1);
    for (let i = 0, n = 0; n < 34 && i < 800; i++) {
      const a = props.rand() * Math.PI * 2, d = 26 + props.rand() * 70, x = TOWN.x + Math.cos(a) * d * 1.2, z = TOWN.z + Math.sin(a) * d;
      if (roadD(x, z) < 7 || railD(x, z) < 9 || Math.hypot(x - 90, z - 30) < 22 || Math.hypot(x - 10, z + 45) < 14 || Math.hypot(x + 10, z - 55) < 14) continue;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: props.rand() < 0.3 ? 2 : 1, damaged: 0.15 });
      n++;
    }
    props.church({ x: 10, z: -45, yaw: 0.1 });
    props.church({ x: -10, z: 55, yaw: Math.PI + 0.1 });
    props.hall({ x: 90, z: 30, yaw: Math.PI / 2, width: 30, depth: 11, height: 7, color: 0xc8beac, name: 'railway station' });
    // the railways: rails on the main line and both branches, wagons in the sidings by the station
    for (const line of RAILS) for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let t = 0; t < L; t += 24) {
        const t1 = Math.min(L, t + 24), x0 = ax + (bx - ax) * t / L, z0 = az + (bz - az) * t / L, x1 = ax + (bx - ax) * t1 / L, z1 = az + (bz - az) * t1 / L;
        if (Math.abs(x0) > 500 || Math.abs(z0) > 560 || wetD(x0, z0) < 22 || wetD(x1, z1) < 22) continue;
        props.rails({ x0, z0, x1, z1 });
      }
    }
    for (const [x, z, kind] of [[70, 80, 'box'], [72, 95, 'open'], [55, -70, 'box']] as const) props.wagon({ x, z, yaw: 0.1, kind });

    // the villages, each with its church
    for (const p of points) {
      if ('AKEFG'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, p.id === 'C' || p.id === 'I' ? 9 : 7, SEED * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.2);
    }
    props.rand = mulberry32(SEED + 3);
    for (const [x, z, yaw] of [[-372, 318, 0.3], [78, 290, 0.1], [252, 338, -0.2], [-362, -318, Math.PI + 0.2], [-50, -282, Math.PI - 0.1], [198, -320, Math.PI + 0.3]]) props.church({ x, z, yaw });
    // the pioneers’ stores by each pontoon bridge, a sandbagged post at each end of the railway bridge
    for (const bz of [BR.north, BR.south]) {
      props.rand = mulberry32(SEED + bz);
      const x = xAt(SIRET, bz) - 34;
      props.logPile({ x, z: bz + 14, yaw: props.rand() * 0.6, length: 7 });
      props.crates({ x: x + 4, z: bz - 14, yaw: props.rand() * 3 });
    }
    props.sandbagRing({ x: xAt(SIRET, 0) - 40, z: 16, radius: 4, toward: 1 });
    props.sandbagRing({ x: xAt(SIRET, 0) - 40, z: -18, radius: 4, toward: -1 });

    // the vineyards: rows of vines on their stakes (visual), an arbour hut at each
    for (const [vx, vz, yaw] of vines()) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      for (let k = -14; k <= 14; k += 2.4) {
        const x = vx + s * k, z = vz + c * k, y = terrain.heightAt(x, z);
        props.box('plain', x, y + 0.65, z, 34, 1.3, 0.55, yaw, 0x4e6228);   // (a row across the offset)
      }
      props.box('plain', vx + c * 22, terrain.heightAt(vx + c * 22, vz - s * 22) + 1.3, vz - s * 22, 3, 2.6, 3, yaw, 0x7a6448);
    }
    // farmsteads, haystacks and field walls over each half’s plain
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 110 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.abs(z) < 110 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z) || x > xAt(SIRET, z) - 60) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);
    pontoons(river, scene);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wetD(x, z) < 22 || roadD(x, z) < 4.5 || railD(x, z) < 4 || airD(x, z) < 12 || vineD(x, z) < 2 || Math.hypot((x - TOWN.x) * 0.8, z - TOWN.z) < 95 }];
    const wood = (x: number, z: number) => (razK(x, z) > 0 || Math.abs(z) < 40 ? -9 : fbm(noise, x * 0.007 + 70, z * 0.007, 3));
    const tN = 0.24, tP = evenThreshold(wood, tN, (_x, z) => z > 0);   // (each half its own copses, the same in area)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 5600, hedges: 1400, autumn: 0.05, broadleaf: 0.85,
      forest: (x: number, z: number) => {
        if (wetD(x, z) < 22) return -1;
        if (razK(x, z) > 0.3) return trenchBand(x, z) ? 0.4 : 0.95;           // the Răzoare oak wood
        if (trenchBand(x, z)) return 0.03;
        if (marshAt(x, z) > 0.4) return 0.3;                                   // willow and poplar scrub in the floodplain
        return Math.abs(x) > 470 || wood(x, z) > (z > 0 ? tN : tP) ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
