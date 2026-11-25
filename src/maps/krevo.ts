// Krevo, 9–10 July 1917: the Russian Western Front’s share of the Kerensky offensive. After three days of bombardment
// the Tenth Army goes over the top between Smorgon and Krevo, takes the German first and second lines in the
// Novospasski wood and round the ruined castle — and then stops: whole regiments debate in committees, refuse to
// relieve the assault divisions or to go forward, and by the 11th the Germans have their trenches back. The ground:
// the Belarusian moraine country — a jumble of low rounded hills and kettle hollows left by the ice, birch and pine
// woods on them, marshy meadows in the hollows, the little Krevlyanka winding through it; villages of log houses with
// an Orthodox church and a Catholic one, the Smorgon–Molodechno railway behind the Russian line (Smorgon itself the
// “dead city”, shot to ruins in two years on the front line), and the ruin of Krevo castle — Grand Duke Gediminas’
// brick fortress where Jogaila signed the Union of Krewo in 1385 — on the brook in the middle.
// Two years of static war: two trench lines a side, deep belts of wire, the Germans’ concrete MG posts.
// On the map the Russians come from the Molodechno road (+z), the Germans hold the Oshmiany road (−z). The Germans’
// lines run along the low terminal moraine — a broken ridge across their half, the Novospasski wood on its crest;
// the Russians hold the hummocks opposite, with Bogusha hill and the bigger woods. The Krevlyanka runs diagonally
// through the middle past the castle, from the north-east to the south-west, crossed by fords and the castle bridge.
// Not mirrored but fair: the points are at matching reaches from the two bases (tools/map_fairness.py) and the brook
// runs through the centre, so each side has the same crossings before it; the Germans’ ridge is traded for the
// Russians’ hill and their wider woods; each side the same number of strongpoints in its first line (German concrete,
// Russian timber-and-earth of the same size), a ruined small town on its western flank (Smorgon, Soly) and a station
// on a railway behind it (the Molodechno line, the German field railway).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { smoothstep, mulberry32 } from '../core/math.js';
import { commandPost, trenchLine, buildSite, shellField } from './common.js';
import { vegetation } from './common2027.js';
import { farmVillage, segDist } from './greatWarHelpers.ts';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 480;
const HW = 7;                                               // the Krevlyanka: a small marshy brook
const noise = createNoise2D(1917_07);
const EXT = { x: 640, z: 700 };

// ---- the brook, diagonally through the middle past the castle
const BROOK = [[640, 330], [470, 270], [360, 200], [250, 160], [150, 70], [70, 10], [20, -45], [-50, -50], [-120, -75], [-190, -90], [-300, -190], [-420, -240], [-640, -330]];
const river = createRiver({
  paths: [BROOK], halfWidth: HW, level: 0, depth: 1.8, valley: 40,
  crossings: [
    { name: 'Zalesye ford', x: 360, z: 200, kind: 'ford', width: 14 },
    { name: 'Borune ford', x: 150, z: 70, kind: 'ford', width: 12 },
    { name: 'Castle bridge', x: -15, z: -48, kind: 'bridge', width: 6 },
    { name: 'Gorodki ford', x: -190, z: -90, kind: 'ford', width: 12 },
    { name: 'Soly ford', x: -360, z: -215, kind: 'ford', width: 14 },
  ],
});
const brookD = gridCacheSmooth((x: number, z: number) => segDist(BROOK, x, z), EXT, 4);

// ---- the moraine: low rounded hills and kettle hollows, scattered by the ice (a fixed seed, so the same every game)
const HUMMOCKS: number[][] = [];
{
  const r = mulberry32(1385);
  for (let i = 0; i < 46; i++) {
    const x = (r() * 2 - 1) * 620, z = (r() * 2 - 1) * 680, kettle = r() < 0.28;
    HUMMOCKS.push([x, z, 40 + r() * 70, kettle ? -(2 + r() * 2.5) : 2.5 + r() * 4, 0.6 + r() * 0.8]);   // [x, z, r, h, stretch]
  }
}
/** The Germans’ terminal moraine: a broken ridge across their half, falling away toward the Russians. */
const ridgeZ = (x: number) => -230 + 0.16 * x + 26 * Math.sin(x * 0.009 + 1);
const BOGUSHA = { x: 120, z: 250 };

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}) => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const points = [
  P('A', 'Molodechno road', 0, 440, 'centre'),
  P('B', 'Smorgon', -350, 300, 'west', { radius: 30 }),
  P('C', 'Bogusha Hill', BOGUSHA.x, BOGUSHA.z, 'centre'),
  P('D', 'Zalesye station', 330, 330, 'east'),
  P('E', 'Borune', -250, 5, 'west', { radius: 24 }),
  P('F', 'Krevo Castle', 0, 0, 'centre', { radius: 28 }),
  P('G', 'Gorodki', 260, -5, 'east', { radius: 24 }),
  P('H', 'Soly', -300, -300, 'west', { radius: 30 }),
  P('I', 'Novospasski Wood', -40, -245, 'centre'),
  P('J', 'Kushlyany', 380, -320, 'east'),
  P('K', 'Oshmiany road', 0, -440, 'centre'),
] as any[];
const CASTLE = { x: 0, z: 0, w: 46, d: 38 };

const ground = gridCacheSmooth((x: number, z: number) => {
  let h = 5 + fbm(noise, x * 0.004 + 3, z * 0.004, 3) * 2.5 + fbm(noise, x * 0.018 + 9, z * 0.018, 3) * 0.9;
  for (const [hx, hz, r, hh, k] of HUMMOCKS) { const dx = (x - hx) * k, dz = z - hz, q = (dx * dx + dz * dz) / (r * r); if (q < 9) h += hh * Math.exp(-q); }
  // the German ridge, higher in its middle, broken by saddles
  const rz = ridgeZ(x), saddle = 0.65 + 0.35 * Math.sin(x * 0.014 + 0.4);
  h += 7 * saddle * Math.exp(-(((z - rz) / (z > rz ? 70 : 110)) ** 2));
  h += 8.5 * Math.exp(-((x - BOGUSHA.x) ** 2 + (z - BOGUSHA.z) ** 2) / (115 * 115));             // Bogusha hill
  // the brook’s marshy bottom, the castle on its low mound beside it
  const d = brookD(x, z);
  h = 1.3 + (h - 1.3) * smoothstep(12, 85, d);
  h += 2 * smoothstep(40, 18, Math.hypot(x - CASTLE.x, z - CASTLE.z));
  for (const p of points) if (!'CFI'.includes(p.id)) h += (h * 0.6 + 2.5 - h) * smoothstep(40, 18, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (6 - h) * smoothstep(32, 16, Math.hypot(x, z - bz));
  return h;
}, EXT, 4);
function marshAt(x: number, z: number) { return smoothstep(0.15, 0.4, fbm(noise, x * 0.006 + 30, z * 0.006, 3)) * (1 - smoothstep(30, 70, brookD(x, z))); }
const height = (x: number, z: number) => river.carve(x, z, Math.max(1.4, ground(x, z) - 0.6 * marshAt(x, z)));

// ---- roads and railways
const ROADS = [
  [[0, 640], [0, 440], [20, 330], [60, 200], [150, 70], [60, 30], [0, 0], [-15, -48], [-40, -120], [-30, -320], [0, -440], [0, -640]],   // the Molodechno – Krevo – Oshmiany road
  [[-640, 190], [-350, 300], [-120, 280], [60, 200], [330, 330], [640, 300]],                                                 // behind the Russian line
  [[-640, -280], [-300, -300], [-30, -320], [380, -320], [640, -280]],                                                        // behind the German line
  [[-350, 300], [-250, 5], [-190, -90], [-300, -300]],                                                                       // the Smorgon – Soly road
  [[330, 330], [360, 200], [260, -5], [380, -320]],                                                                          // the Zalesye road
  [[-250, 5], [0, 0], [260, -5]],                                                                                       // through Krevo
];
const roadD = gridCacheSmooth((x: number, z: number) => Math.min(...ROADS.map((r) => segDist(r, x, z))), { x: 520, z: 580 }, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.5;
/** The railways: the Smorgon–Molodechno line behind the Russians, the German field railway behind the Germans. */
const railZ = (x: number, north: boolean) => (north ? 372 + 14 * Math.sin(x * 0.004 + 0.5) : -372 - 12 * Math.sin(x * 0.005 + 2));
/** Each side’s two lines at `line` 0 (first) / 1 (support): the Germans’ along the ridge’s forward slope, the Russians’ opposite. */
const trenchZ = (x: number, north: boolean, line: number) => (north
  ? 176 + 0.16 * x + (line ? 120 : 0) + 9 * Math.sin(x * 0.017 + line)
  : ridgeZ(x) + 44 - (line ? 116 : 0) - 8 * Math.sin(x * 0.013 + 2 + line));

/** First-line strongpoints [x, side]: German concrete MG posts on the south, Russian log-and-earth blockhouses on the north, five each. */
const POSTS = [[-430, 1], [-210, 1], [-60, 1], [170, 1], [420, 1], [-420, -1], [-180, -1], [60, -1], [200, -1], [430, -1]].map(([x, s]) => {
  const z = trenchZ(x, s > 0, 0) + 13 * s;
  return { x, z, s };
});
const CHURCHES = { orthodox: { x: 95, z: 105 }, catholic: { x: -75, z: -115 } };

const layout = [{ unit: 'rifles', x: 10, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'krevo',
  name: 'Krevo',
  description: 'July 1917, the Kerensky offensive: the Russian Tenth Army breaks into the German lines between Smorgon and Krevo, then its regiments refuse to go on. Moraine country of low hills, kettle hollows and birch woods, the Germans on their wooded ridge, the brook and the ruined castle in the middle, two years of trenches, deep wire and concrete MG posts.',
  epochs: ['1918'],
  region: 'east',
  armies: { nato: ['ru'], pact: ['de'] }, // (the Russian Tenth Army against the German Tenth Army’s Landwehr and reserve divisions)
  sides: { nato: 'Russia', pact: 'Germany' },
  conditions: { time: 'dawn', weather: 'clear' }, // (the infantry went over on the morning of 9 July, a hot summer day)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1917_07,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: 191707, cell: 80, weights: [0.3, 0.35, 0.1, 0.25] as any }),

  theme: {
    // a hot, hazy July morning over the Belarusian moraine
    fogColor: 0xb2b8ac, fogDensity: 0.0012, skyTop: 0x5a84ae, skyHorizon: 0xcad0c6, skyBottom: 0x80847a,
    sunColor: 0xfff0d4, sunIntensity: 1.9, sunDisk: 0.3, clouds: 0.35, cloudLight: 0xf0f0ea, cloudDark: 0x9aa0a6,
    sunDir: [0.55, 0.5, 0.5], hemiSky: 0xc4ccd6, hemiGround: 0x52563a, hemiIntensity: 1.25, rimColor: 0xc4ccd2, rimIntensity: 0.25,
    terrain: {
      grass: '#56703a', grassAlt: '#4c6432', dryGrass: '#8e8a58', dirt: '#5e5040', rock: '#86827a', strip: '#4a3e2e',
      pasture: '#58703a', ploughed: '#5e5040', stubble: '#a09a5c', meadow: '#62783e',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-350, 0, 330], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x7a6a52, 0.85];                                     // sand roads
        if (y < 1.6 && brookD(x, z) < HW + 10) return [0x6a6a48, 0.85];                 // the reedy banks
        const m = marshAt(x, z);
        if (m > 0.3) return [0x4c5830, Math.min(0.85, m)];                               // wet meadow, sedge and reed
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-350, 0, 330] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 380] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 370 }, pact: { x: 0, z: -370 } },
  points,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Each side’s two lines (three belts of wire before the first), MG nests at the roads, two years of shell holes; Smorgon and Soly in ruins. */
  battlefield(game: any) {
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      const s = f === 'nato' ? 1 : -1;
      for (const line of [0, 1]) {
        const pts: number[][] = [];
        for (let x = -480; x <= 480; x += 30) pts.push([x * s, trenchZ(x * s, f === 'nato', line)]);   // (left to right as its owner looks)
        for (const w of trenchLine(pts, f, { wireAt: line ? 18 : 22, belts: line ? 1 : 3, gapEvery: line ? 50 : 70 })) {
          if (roadD(w.x, w.z) < 8 || brookD(w.x, w.z) < HW + 10 || POSTS.some((p) => Math.hypot(p.x - w.x, p.z - w.z) < 7)) continue;
          works.push(w);
        }
        for (const bx of [-300, 0, 330]) works.push({ kind: 'mgNest', x: bx + 15 * s, z: trenchZ(bx + 15 * s, f === 'nato', line) - 4 * s, yaw: f === 'nato' ? Math.PI : 0, faction: f });
      }
    }
    const between = (x: number, z: number) => (trenchZ(x, true, 0) + trenchZ(x, false, 0)) / 2;
    const dens = (x: number, z: number) => { const dz = Math.abs(z - between(x, z)) - 150; return 0.9 * Math.exp(-((dz / 45) ** 2)) + 0.05; };
    const blasts = [...shellField(1917, BOUNDS, dens).filter((b: number[]) => b[1] >= between(b[0], b[1])), ...shellField(1918, BOUNDS, dens).filter((b: number[]) => b[1] < between(b[0], b[1]))]
      .filter((b: number[]) => brookD(b[0], b[1]) > HW + 12 && !onRoad(b[0], b[1]) && points.every((p) => Math.hypot(p.x - b[0], p.z - b[1]) > 35));
    const r = mulberry32(1917);
    const ruins = game.buildings.list.filter((b: any) => {
      if (b.name === 'pillbox' || b.name === 'blockhouse') return false;
      const town = [points[1], points[7]].some((p) => Math.hypot(b.x - p.x, b.z - p.z) < 95);   // (Smorgon and Soly: the dead towns)
      return r() < (town ? 0.85 : Math.abs(b.z - between(b.x, b.z)) < 110 ? 0.3 : 0);
    }).map((b: any) => b.index);
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number, r = 0) => brookD(x, z) < HW + 6 + r;
    const trenchBand = (x: number, z: number) => [0, 1].some((l) => [true, false].some((n) => Math.abs(z - trenchZ(x, n, l)) < (l ? 22 : 34)));
    const railD = (x: number, z: number) => Math.abs(z - railZ(x, z > 0));
    const inCastle = (x: number, z: number, r = 0) => Math.abs(x - CASTLE.x) < CASTLE.w / 2 + 6 + r && Math.abs(z - CASTLE.z) < CASTLE.d / 2 + 6 + r;
    const skip = (x: number, z: number) => wet(x, z, 8) || roadD(x, z) < 8 || trenchBand(x, z) || railD(x, z) < 9 || inCastle(x, z, 6)
      || Object.values(CHURCHES).some((c) => Math.hypot(c.x - x, c.z - z) < 22) || POSTS.some((p) => Math.hypot(p.x - x, p.z - z) < 14);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);

    // Krevo castle: the brick curtain walls broken down to stumps, the gates on the road, the Great Tower
    // at the north-west corner and the Small Tower at the south-east, both half fallen
    props.rand = mulberry32(1385);
    const brick = 0x8a5a44, { x: cx, z: cz, w: cw, d: cd } = CASTLE;
    const runs: number[][] = [[-cw / 2, -cd / 2, cw / 2, -cd / 2], [-cw / 2, cd / 2, cw / 2, cd / 2], [-cw / 2, -cd / 2, -cw / 2, cd / 2], [cw / 2, -cd / 2, cw / 2, cd / 2]];
    for (const [x0, z0, x1, z1] of runs) {
      const L = Math.hypot(x1 - x0, z1 - z0), yaw = x0 === x1 ? Math.PI / 2 : 0;
      for (let t = 0; t < L; t += 4) {
        const x = cx + x0 + (x1 - x0) * (t + 2) / L, z = cz + z0 + (z1 - z0) * (t + 2) / L;
        if (Math.abs(x - cx) < 6 || Math.abs(z - cz) < 6 || props.rand() < 0.18) continue;   // (the gates, and the breaches)
        props.lowWall({ x, z, yaw, length: 4.1, height: 2 + props.rand() * 5, color: brick });
      }
    }
    for (const [tx, tz, s, hh] of [[cx - cw / 2, cz + cd / 2, 9, 13], [cx + cw / 2, cz - cd / 2, 6.5, 8]]) {
      const g = terrain.heightAt(tx, tz);
      props.box('stone', tx, g + hh / 2, tz, s, hh, s, 0.05, brick);
      props.box('stone', tx + 1, g + hh + 0.8, tz - 0.6, s * 0.5, 1.6, s * 0.4, 0.3, 0x7e5440, 0.15, 0.1);
      cover.addBox({ x: tx, z: tz, yaw: 0.05, length: s, thickness: s, height: hh });
    }
    for (let i = 0; i < 12; i++) props.rubble(cx + (props.rand() - 0.5) * (cw - 6), cz + (props.rand() - 0.5) * (cd - 6), 0.4 + props.rand() * 0.6);

    // Krevo village round the castle: log houses on both banks, the Orthodox church (onion dome) north of the brook, the Catholic church south
    props.rand = mulberry32(1917_1);
    for (let i = 0, n = 0; n < 24 && i < 600; i++) {
      const a = props.rand() * Math.PI * 2, d = 50 + props.rand() * 70, x = CASTLE.x + Math.cos(a) * d * 1.3, z = CASTLE.z - 20 + Math.sin(a) * d * 0.9;
      if (skip(x, z)) continue;
      props.house({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 2, depth: 6 });
      n++;
    }
    props.church({ x: CHURCHES.orthodox.x, z: CHURCHES.orthodox.z, yaw: Math.PI });
    props.church({ x: CHURCHES.catholic.x, z: CHURCHES.catholic.z, yaw: 0 });
    {
      const { x, z } = CHURCHES.orthodox, g = terrain.heightAt(x, z);
      m4.compose(v.set(x, g + 12.4, z), q.identity(), one); props.push('plain', new THREE.SphereGeometry(2.4, 12, 8), m4, 0x4a7a5c);
      m4.compose(v.set(x, g + 15.2, z), q.identity(), one); props.push('plain', new THREE.ConeGeometry(0.9, 2.6, 8), m4, 0x4a7a5c);
      props.box('metal', x, g + 17.2, z, 0.15, 1.6, 0.15, 0, 0xc8a850);
      props.box('metal', x, g + 17.4, z, 0.9, 0.12, 0.12, 0, 0xc8a850);
    }

    // Smorgon and Soly: small towns of brick and log on each side’s western flank, both shot to ruins
    for (const [px, pz, n, seed] of [[points[1].x, points[1].z, 16, 1915], [points[7].x, points[7].z, 14, 1916]]) {
      props.rand = mulberry32(seed);
      for (let i = 0, k = 0; k < n && i < 400; i++) {
        const a = props.rand() * Math.PI * 2, d = 18 + props.rand() * 62, x = px + Math.cos(a) * d * 1.2, z = pz + Math.sin(a) * d;
        if (skip(x, z)) continue;
        props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 2, width: 7 + props.rand() * 3, depth: 8, storeys: 1 + (props.rand() < 0.4 ? 1 : 0), damaged: 0.4 });
        k++;
      }
    }
    // the villages; Zalesye’s station on the Molodechno line, Soly’s on the German field railway
    for (const p of points) {
      if ('AKFBH'.includes(p.id)) continue;
      farmVillage(props, p.x, p.z, p.id === 'C' || p.id === 'I' ? 4 : 7, 1917 * 10 + Math.round(p.x * 3 + p.z * 7), skip, 1.15);
    }
    for (const s of [points[3], points[7]]) {
      const north = s.z > 0, z = railZ(s.x + 30, north) + (north ? -12 : 12);
      props.hall({ x: s.x + 30, z, yaw: 0, width: 22, depth: 9, height: 6, color: north ? 0x8a6a50 : 0x7a6a58, name: 'railway station' });
      props.wagon({ x: s.x - 40, z: railZ(s.x - 40, north), yaw: Math.PI / 2, kind: 'box' });
    }
    // the railways, level crossings at the roads
    for (const north of [true, false]) {
      for (let x = -520; x < 520; x += 20) {
        const x1 = x + 20, z0 = railZ(x, north), z1 = railZ(x1, north);
        props.rails({ x0: x, z0, x1, z1 });
      }
    }
    // the first-line strongpoints: German concrete MG posts, Russian blockhouses of logs and earth, the same size
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
    // log piles for the dugouts and hay over each side’s meadows and fields
    const kinds = ['farm', 'hay', 'fieldwall', 'hay', 'farm', 'rocks'];
    for (let tries = 0, n = 0; n < 110 && tries < 9000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 20), z = (rand() * 2 - 1) * (bounds.z - 40);
      if (Math.hypot(x - CASTLE.x, z - CASTLE.z) < 140 || Math.hypot(x, Math.abs(z) - BASE_Z) < 45 || nearPoint(x, z, 50) || skip(x, z)) continue;
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
      ...river.crossings.map((c: any) => ({ x: c.x, z: c.z, r: HW + 14 })),
      { test: (x: number, z: number) => wet(x, z, 2) || onRoad(x, z) || railD(x, z) < 4 || inCastle(x, z) || Math.hypot((x - CASTLE.x) * 0.77, z - CASTLE.z + 20) < 80 }];
    // birch and pine on the moraine hills: the German ridge crest wooded (the Novospasski wood), the Russians’ wider woods on their hummocks
    const hill = (x: number, z: number) => ground(x, z) - 5 - fbm(noise, x * 0.004 + 3, z * 0.004, 3) * 2.5;
    const wood = (x: number, z: number) => {
      const crest = Math.exp(-(((z - ridgeZ(x)) / 60) ** 2)) * (0.65 + 0.35 * Math.sin(x * 0.014 + 0.4));
      return z > 0 ? fbm(noise, x * 0.007 + 70, z * 0.007, 3) + 0.04 * hill(x, z) : crest * 0.9 - 0.45 + fbm(noise, x * 0.007 + 70, z * 0.007, 3) * 0.8;
    };
    const update = vegetation({
      scene, terrain, cover, rand, bounds, fields: this.fields, palette: this.theme.terrain, avoid, trees: 4200, hedges: 1200, autumn: 0, broadleaf: 0.6,
      forest: (x: number, z: number) => {
        if (wet(x, z, 3)) return -1;
        if (trenchBand(x, z)) return 0.03;
        if (marshAt(x, z) > 0.5) return 0.2;                                  // alder and willow in the wet meadows
        if (brookD(x, z) < 35) return 0.25;
        return wood(x, z) > 0.12 ? 0.85 : 0;
      },
    });
    return { buildings: props.buildings, update };
  },
} satisfies MapDef;
