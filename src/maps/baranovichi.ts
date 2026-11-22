// Baranovichi, 2–9 July 1916: Evert's answer to the Brusilov Offensive. The Russian Fourth Army attacks the German
// and Austro-Hungarian lines in front of the Baranovichi railway junction — after a week of bombardment, wave after
// wave goes into the wire at Skrobovo, Labuzy and Darevo, takes the first German line in places and is thrown back
// out of it; some eighty thousand Russian casualties for a few hundred metres, and then the front sets hard again for
// another year. The ground: the flat Belarusian lowland, the Shchara winding through a wide floodplain of reed and
// sedge, bogs in the woods, pine and birch forest on low sandy rises, villages of log houses, and the railways
// converging on the junction — the Moscow–Brest and Vilna–Rovno lines raised on embankments across the wet ground and
// crossing the river together on one bridge. A year of static war: two trench lines a side, deep belts of wire, the
// Germans’ concrete shelters and MG posts in the first line.
// Not mirrored but fair: the Shchara runs between the sides, crossed by a ford on each flank and the road-and-rail
// bridge in the middle, where the junction (F) sits astride the river in neither side’s line. The railway is a point-
// symmetric X — two lines from each side’s rear corners meeting at the bridge — so each side has the same embankments
// across its own floodplain. Each side holds two trench lines at the same depth from the water (three belts of wire
// before the first), five first-line strongpoints (German concrete, Russian log-and-earth, the same size), one sandy
// pine rise of the same height at the same reach (Darevo for the Russians, Labuzy for the Germans) and a lesser swell,
// a small ruined town on its western flank (Lyakhovichi, Skrobovo), a floodplain village on its bank by a flank ford
// (Tsirin north by the west ford, Zarechye south by the east ford) and a station by the junction; woods of the same area on each half.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, evenThreshold, segDist } from './greatWarHelpers.ts';
import type { MapDef } from '../types.ts';

const BASE_Z = 500;
const SIDE_X = 330;
const HW = 13;                                              // the Shchara: a slow lowland river
const noise = createNoise2D(1916_07);
const mid = (x: number) => 14 * Math.sin(x * 0.006) + 6 * Math.sin(x * 0.017);   // (0 at the junction)
const river = createRiver({
  path: mid, halfWidth: HW, level: 0, depth: 2.4, valley: 95,
  crossings: [
    { name: 'Tsirin ford', x: -SIDE_X, kind: 'ford', width: 14 },
    { name: 'Shchara road-and-rail bridge', x: 0, kind: 'bridge', width: 9 },
    { name: 'Zarechye ford', x: SIDE_X, kind: 'ford', width: 14 },
  ],
});
const away = (x: number, z: number) => Math.abs(z - mid(x));
/** The railways: the Moscow–Brest line (NW–SE) and the Vilna–Rovno line (NE–SW), a point-symmetric X over the bridge. */
const LINE1 = [[-430, 580], [-220, 320], [-60, 90], [0, 26], [0, -26], [60, -90], [220, -320], [430, -580]];
const LINE2 = LINE1.map(([x, z]) => [-x, z]);
const railD = (x: number, z: number) => Math.min(segDist(LINE1, x, z), segDist(LINE2, x, z));
/** Each side’s lateral road behind its lines, the roads from the crossings to the bases. */
const bankZ = (x: number, north: boolean) => (north ? mid(x) + 168 + 8 * Math.sin(x * 0.01) : mid(x) - 170 + 10 * Math.sin(x * 0.007 + 2));
const roadD = (x: number, z: number) => {
  let d = Math.abs(z - bankZ(x, z > mid(x)));
  for (const bx of [-SIDE_X, 0, SIDE_X]) d = Math.min(d, Math.abs(x - bx));
  return d;
};
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** Each side’s two lines at `line` 0 (first) / 1 (support), each its own wander. */
const trenchZ = (x: number, north: boolean, line: number) => (north
  ? mid(x) * 0.8 + (line ? 225 : 112) + 9 * Math.sin(x * 0.017 + line)
  : mid(x) * 0.8 - (line ? 222 : 114) - 10 * Math.sin(x * 0.013 + 2 + line));

/** One sandy pine rise a side [x, z, r, h]: Darevo on the north, Labuzy on the south; a gentler swell each. */
const RISES = [[90, 268, 165, 7], [-330, 330, 140, 3], [-40, -285, 165, 7], [370, -300, 140, 3]];
const riseAt = (x: number, z: number) => {
  let m = 0;
  for (const [hx, hz, r] of RISES) m = Math.max(m, smoothstep(r * 0.75, 0, Math.hypot(x - hx, z - hz)));
  return m;
};
/** The wide floodplain and the bogs out in the woods (0..1). */
function marshAt(x: number, z: number) {
  const d = away(x, z);
  const plain = d < 125 ? smoothstep(0.05, 0.3, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * (1 - smoothstep(70, 125, d)) : 0;
  const bog = d > 140 && Math.abs(z) < 420 ? smoothstep(0.32, 0.45, fbm(noise, x * 0.009 - 50, z * 0.009 + 20, 2)) * smoothstep(140, 190, d) * (1 - smoothstep(380, 420, Math.abs(z))) : 0;
  return plain || bog ? Math.max(plain, bog) * (1 - riseAt(x, z)) : 0;
}
function height(x: number, z: number) {
  const d = away(x, z);
  let h = 1.2 + smoothstep(40, 170, d) * (3.2 + fbm(noise, x * 0.004 + (z > mid(x) ? 0 : 40), z * 0.004, 4) * 3.2);
  h += fbm(noise, x * 0.015 + 9, z * 0.015, 3) * 0.7 * smoothstep(50, 160, d);
  for (const [hx, hz, r, hh] of RISES) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += smoothstep(BASE_Z - 70 + 40 * Math.sin(x * 0.008 + 1), 640, Math.abs(z)) * 8 + smoothstep(440 + 50 * Math.sin(z * Math.PI / 280), 600, Math.abs(x)) * 12;
  h += (Math.min(h, 1.5) - h) * marshAt(x, z) * 0.85;                            // the floodplain and the bogs
  // the railway embankments across the low ground, let down to the bridge
  const rd = railD(x, z);
  if (rd < 14) h += (Math.max(h, 3.4) - h) * smoothstep(12, 4, rd) * smoothstep(HW + 10, HW + 45, d);
  for (const bx of [-SIDE_X, 0, SIDE_X]) h += (Math.min(h, 1.3 + d * 0.05) - h) * (1 - smoothstep(5, 16, Math.abs(x - bx))) * (1 - smoothstep(90, 140, d));
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 6 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.4, h));
}

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Nesvizh road', 0, 470, 'centre'),
  P('B', 'Lyakhovichi', -350, 300, 'west', { radius: 30 }),
  P('C', 'Darevo', 90, 268, 'centre'),
  P('D', 'Medvedichi', 330, 320, 'east'),
  P('E', 'Tsirin', -290, Math.round(mid(-290) + 74), 'west', { radius: 24 }),
  P('F', 'Baranovichi Junction', 0, 0, 'centre', { radius: 30 }),
  P('G', 'Zarechye', 295, Math.round(mid(295) - 74), 'east', { radius: 24 }),
  P('H', 'Skrobovo', -275, -312, 'west', { radius: 30 }),
  P('I', 'Labuzy', -40, -285, 'centre'),
  P('J', 'Gorodishche', 390, -290, 'east'),
  P('K', 'Slonim road', 0, -470, 'centre'),
] as any[];

/** First-line strongpoints [x, side]: German concrete MG posts on the south, Russian log-and-earth blockhouses on the north, five each. */
const POSTS = [[-430, 1], [-210, 1], [-70, 1], [170, 1], [420, 1], [-420, -1], [-180, -1], [70, -1], [210, -1], [430, -1]]
  .map(([x, s]) => ({ x, z: trenchZ(x, s > 0, 0) + 13 * s, s }))
  .filter((p) => railD(p.x, p.z) > 14 && roadD(p.x, p.z) > 12);
/** The stations at the junction: the passenger station on the north bank, the engine shed on the south. */
const STATION = { x: 70, z: 56 }, SHED = { x: -70, z: -56 };

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'baranovichi',
  name: 'Baranovichi',
  description: 'July 1916: the Russian Fourth Army storms the German and Austro-Hungarian lines before the Baranovichi railway junction, and the front sets hard again for a year. Flat Belarusian lowland, the Shchara in its wide marshy floodplain, pine and birch on sandy rises, railway embankments, deep wire and concrete shelters.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de', 'ah'] }, // (Ragoza’s Fourth Army against Woyrsch’s German and Austro-Hungarian divisions)
  sides: { nato: 'Russia', pact: 'Central Powers' },
  conditions: { time: 'dawn', weather: 'clear' }, // (the assault went in at dawn on 3 July after a night’s bombardment)
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1916_07,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191607, cell: 80, weights: [0.35, 0.3, 0.1, 0.25] as any }),

  theme: {
    // a clear, warm July dawn over the Belarusian lowland
    fogColor: 0xb0b8ae, fogDensity: 0.0013, skyTop: 0x5a84ae, skyHorizon: 0xcad0c6, skyBottom: 0x7e8278,
    sunColor: 0xffecd0, sunIntensity: 1.85, sunDisk: 0.3, clouds: 0.3, cloudLight: 0xf0f0ea, cloudDark: 0x9aa0a6,
    sunDir: [0.6, 0.42, 0.45], hemiSky: 0xc4ccd6, hemiGround: 0x50563a, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#54703a', grassAlt: '#4a6432', dryGrass: '#9a9060', dirt: '#6a5a44', rock: '#86827a', strip: '#4a3e2e',
      pasture: '#56703a', ploughed: '#6a5a44', stubble: '#a49c62', meadow: '#60783e',   // (sandy soil)
      farmX: [460, 600], farmZ: [520, 640], roads: [-SIDE_X, 0, SIDE_X], roadZ: 560,
      surface(x: number, z: number, y: number) {
        if (railD(x, z) < 2.8) return [0x6e665a, 0.9];                                 // the ballast
        if (railD(x, z) < 7 && y > 1.9) return [0x8a7a5a, 0.6];                       // the embankment’s sandy flanks
        if (onRoad(x, z)) return [0x8a7856, 0.85];                                     // sand roads
        if (y < 1.6 && away(x, z) < HW + 12) return [0x6a6a48, 0.85];                   // the reedy banks
        const m = marshAt(x, z);
        if (m > 0.3) return [0x6e6c46, Math.min(0.9, m)];                               // sedge, reed and bog moss
        const r = riseAt(x, z);
        if (r > 0.4) return [0xa8986a, (r - 0.4) * 0.9];                                 // the sandy rises
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-SIDE_X, 0, SIDE_X] }, pact: { x: 0, z: -BASE_Z, entries: [-SIDE_X, 0, SIDE_X] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 380 }, pact: { x: 0, z: -380 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side’s two lines (three belts of wire before the first), MG nests at the roads, a year of shell holes; Lyakhovichi and Skrobovo in ruins. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      for (const line of [0, 1]) {
        const pts: number[][] = [];
        for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato', line)]);   // (left to right as its owner looks)
        for (const w of trenchLine(pts, f, { wireAt: line ? 18 : 22, belts: line ? 1 : 3, gapEvery: line ? 50 : 70 })) {
          if (roadD(w.x, w.z) < 8 || railD(w.x, w.z) < 8 || away(w.x, w.z) < HW + 10 || POSTS.some((p) => Math.hypot(p.x - w.x, p.z - w.z) < 7)) continue;
          works.push(w);
        }
        for (const bx of [-SIDE_X, 0, SIDE_X]) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato', line) - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      }
    }
    const dens = (x: number, z: number) => { const dz = Math.abs(z - mid(x)) - 100; return 0.9 * Math.exp(-((dz / 45) ** 2)) + 0.05; };
    const blasts = [...shellField(1916, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] >= mid(b[0])), ...shellField(1917, { x: 500, z: 560 }, dens).filter((b: number[]) => b[1] < mid(b[0]))]
      .filter((b: number[]) => away(b[0], b[1]) > HW + 12 && !onRoad(b[0], b[1]) && railD(b[0], b[1]) > 8 && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 35));
    const r = mulberry32(1916);
    const ruins = game.buildings.list.filter((b: any) => {
      if (b.name === 'pillbox' || b.name === 'blockhouse' || b.name === 'railway station' || b.name === 'engine shed') return false;
      const town = [points[1], points[7]].some((p) => Math.hypot(b.x - p.x, b.z - p.z) < 95);   // (Lyakhovichi and Skrobovo)
      return r() < (town ? 0.8 : Math.hypot(b.x, b.z - mid(b.x)) < 110 ? 0.3 : 0);
    }).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => away(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => [0, 1].some((l) => Math.abs(z - trenchZ(x, z > mid(x), l)) < (l ? 22 : 34));
    const yard = (x: number, z: number, r = 0) => [STATION, SHED].some((s) => Math.hypot(s.x - x, s.z - z) < 20 + r);
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z) || railD(x, z) < 10 || yard(x, z, 4)
      || marshAt(x, z) > 0.55 || POSTS.some((p) => Math.hypot(p.x - x, p.z - z) < 14);

    // the railways (not over the river: the bridge carries them), the sidings by each station, wagons standing on them
    for (const line of [LINE1, LINE2]) {
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, az] = line[i], [bx, bz] = line[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 20));
        for (let k = 0; k < n; k++) {
          const x0 = ax + ((bx - ax) * k) / n, z0 = az + ((bz - az) * k) / n, x1 = ax + ((bx - ax) * (k + 1)) / n, z1 = az + ((bz - az) * (k + 1)) / n;
          if (wet((x0 + x1) / 2, (z0 + z1) / 2, 6)) continue;
          props.rails({ x0, z0, x1, z1 });
        }
      }
    }
    // the junction: the brick passenger station and a water tower on the north bank, the engine shed and a water tower on the south
    props.hall({ x: STATION.x, z: STATION.z, yaw: Math.atan2(60, 64) + Math.PI / 2, width: 20, depth: 9, height: 6, color: 0x8a5e48, name: 'railway station' });
    props.hall({ x: SHED.x, z: SHED.z, yaw: Math.atan2(60, 64) + Math.PI / 2, width: 20, depth: 9, height: 6, color: 0x7e6252, name: 'engine shed' });
    for (const [tx, tz] of [[30, 110], [-30, -110]]) {
      if (wet(tx, tz, 4)) continue;
      const g = terrain.heightAt(tx, tz);
      props.column({ x: tx, z: tz, radius: 1.6, height: 7 });
      props.box('plain', tx, g + 8.6, tz, 4.6, 3.2, 4.6, 0.3, 0x5a4636);                   // the timber tank house
      props.box('plain', tx, g + 10.5, tz, 5.2, 0.4, 5.2, 0.3, 0x3e4038);
    }
    for (const [i, t] of [[1, 0.5], [1, 0.56], [5, 0.44], [5, 0.5]]) {
      const [ax, az] = LINE1[i], [bx, bz] = LINE1[i + 1];
      props.wagon({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, yaw: Math.atan2(bx - ax, bz - az), kind: 'box', color: 0x4e3a2a });
    }

    // Lyakhovichi and Skrobovo: small towns of brick and log on each side’s western flank, both shot to ruins
    for (const [px, pz, n, seed] of [[points[1].x, points[1].z, 16, 1915], [points[7].x, points[7].z, 16, 1916]]) {
      props.rand = mulberry32(seed);
      for (let i = 0, k = 0; k < n && i < 400; i++) {
        const a = props.rand() * Math.PI * 2, d = 18 + props.rand() * 62, x = px + Math.cos(a) * d * 1.2, z = pz + Math.sin(a) * d;
        if (skip(x, z)) continue;
        props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.3 ? 1 : 0), damaged: 0.4 });
        k++;
      }
    }
    // log houses round the junction on both banks, an Orthodox church with its onion dome on the north, a Catholic church on the south
    props.rand = mulberry32(1916_1);
    for (let i = 0, n = 0; n < 22 && i < 600; i++) {
      const a = props.rand() * Math.PI * 2, d = 55 + props.rand() * 55, x = Math.cos(a) * d * 1.4, z = mid(x) + Math.sin(a) * d * 0.9;
      if (skip(x, z) || nearPoint(x, z, 10)) continue;
      props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 2, depth: 6 });
      n++;
    }
    const orthodox = { x: -32, z: 116 }, catholic = { x: 32, z: -116 };
    props.church({ x: orthodox.x, z: orthodox.z, yaw: Math.PI });
    props.church({ x: catholic.x, z: catholic.z, yaw: 0 });
    {
      const { x, z } = orthodox, g = terrain.heightAt(x, z), m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      m4.compose(v.set(x, g + 12.4, z), q, one); props.push('plain', new THREE.SphereGeometry(2.4, 12, 8), m4, 0x4a7a5c);
      m4.compose(v.set(x, g + 15.2, z), q, one); props.push('plain', new THREE.ConeGeometry(0.9, 2.6, 8), m4, 0x4a7a5c);
      props.box('metal', x, g + 17.2, z, 0.15, 1.6, 0.15, 0, 0xc8a850);
      props.box('metal', x, g + 17.4, z, 0.9, 0.12, 0.12, 0, 0xc8a850);
    }
    // the villages of log houses
    for (const p of points) {
      if ('AKFBH'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, p.id === 'C' || p.id === 'I' ? 4 : 7, 1916 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.15);
    }
    // the first-line strongpoints: German concrete MG posts and shelters, Russian blockhouses of logs and earth, the same size
    for (const { x, z, s } of POSTS) {
      props.rand = mulberry32(Math.round(x * 13 + z));
      const yaw = (s > 0 ? 0 : Math.PI) + (props.rand() - 0.5) * 0.4;
      const german = s < 0, wall = german ? 0x8a877c : 0x5e4a36;
      const b = props.beginBuilding(german ? 'pillbox' : 'blockhouse', x, z, yaw, 7, 6);
      b.plaster = wall;
      props.shell(b, { height: 2.1, key: german ? 'stone' : 'plain', color: wall, t: 0.9, bay: 2.3, sill: 1.15, head: 1.45, frame: 0x4e4a40, front: [], back: [1.6] });
      props.piece(german ? 'stone' : 'plain', b, 0, 2.45, 0, 7.4, 0.7, 6.4, german ? 0x7e7b70 : 0x4e3e2c);
      props.piece('plain', b, 0, 2.85, 0.4, 6.2, 0.25, 4.8, 0x4e4434);                        // earth and sods over it
      props.endBuilding();
    }
    // farmsteads and hay over each side’s fields, log piles for the dugouts behind the support lines
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 100 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x, z - mid(x)) < 140 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
      buildSite(props, { kind: kinds[n++ % kinds.length], seed: Math.floor(rand() * 1e9) }, x, z, rand() * Math.PI);
    }
    for (const s of [1, -1]) for (const bx of [-200, 120, 380]) {
      props.rand = mulberry32(1949 + s * 7 + bx);
      const x = bx * s, z = trenchZ(x, s > 0, 1) + 30 * s;
      if (!skip(x, z)) props.logPile({ x, z, yaw: props.rand() * 0.6, length: 7 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || railD(x, z) < 6 || yard(x, z) || Math.hypot(x * 0.77, z - mid(x)) < 85 }];
    const wood = (x: number, z: number) => fbm(noise, x * 0.007 + 70, z * 0.007, 3) + 0.5 * smoothstep(110, 40, Math.min(Math.hypot(x - 90, z - 268), Math.hypot(x + 40, z + 285)));
    const tN = 0.02, tP = evenThreshold(wood, tN, (x, z) => z > mid(x));   // (pine and birch forest, the two rises wooded alike)
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4400, hedges: 1200, autumn: 0, broadleaf: 0.45,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z)) return 0.03;
        const m = marshAt(x, z);
        if (m > 0.6) return 0.08;                                             // open bog and sedge, a few stunted birches
        if (m > 0.3) return 0.25;                                             // alder and willow carr
        if (away(x, z) < 45) return 0.25;
        return Math.abs(x) > 470 || wood(x, z) > (z > mid(x) ? tN : tP) ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
