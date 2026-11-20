// The Seelow Heights, 16–19 April 1945 (1945 only; Eastern Front; the big field, 1.0 × 1.12 km): the opening of the
// Berlin operation. Zhukov’s 1st Belorussian Front came out of the Küstrin bridgehead across the Oderbruch — the Oder’s
// flat flood plain, cut into fields by drainage ditches, its meadows flooded where the Germans opened the reservoirs —
// against the escarpment of the Seelow Heights, forty metres of steep slope with the Hauptgraben ditch at its foot and
// the town of Seelow on top, where the Reichsstraße 1 climbs out of the plain on its way to Berlin. Here the map runs
// east (+z, the Soviet side, the Oder behind it) to west (−z, Berlin): the plain with Letschin, Manschnow on the
// Reichsstraße and Neu Langsow and Sachsendorf at the foot of the slope; the Hauptgraben bridge on the Reichsstraße in
// the middle; on the heights Werbig, Seelow and Friedersdorf. The Soviet side has the Reitwein Spur — the high spur
// that juts out over the plain in the south, where Zhukov had his command post — and the ditches and willow rows of the
// plain for cover. Not a mirror but fair: the escarpment and the spur are about the same height and hold about the
// same share of the high ground (the escarpment is lower in the south, behind the spur); each side has two villages
// and one high point (Seelow’s houses on the heights, the spur’s dug-outs), its points about as far from its base as
// the other side’s; the three middle points lie on the plain below the slope, in reach of the spur’s guns as of the
// escarpment’s, and the flooded meadows lie on both sides of the middle.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { commandPost, shellField } from './common.js';
import { segDist, farmVillage } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const noise = createNoise2D(1945_0416);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---- the escarpment: its foot runs across the field at footZ(x); the slope climbs 60 m back to the crest, the
// plateau then falls away gently toward Berlin. Lower in the south (x > 0), behind the Reitwein Spur.
const footZ = (x: number) => -95 + 22 * Math.sin(x * 0.0065 + 0.4) + 10 * Math.sin(x * 0.019);
const crestH = (x: number) => 18 * (1 - 0.35 * smoothstep(150, 350, x));
function plateau(x: number, z: number) {
  const u = footZ(x) - z + fbm(noise, x * 0.01 + 3, 0.7, 2) * 10; // (metres behind the foot)
  return crestH(x) * smoothstep(0, 60, u) * (1 - 0.55 * smoothstep(60, 220, u));
}
// ---- the Reitwein Spur: a broad, flat-topped spur from the southern edge out over the plain
const spurD = (x: number, z: number) => Math.hypot(Math.min(0, x - 360) / 260, (z - 175) / 125);
const spur = (x: number, z: number) => 20 * smoothstep(1, 0.6, spurD(x, z) + fbm(noise, x * 0.012, z * 0.012 + 9, 2) * 0.06);
/** On the plain (below the slope and off the spur). */
const plain = (x: number, z: number) => z > footZ(x) + 15 && spurD(x, z) > 1.05;

// ---- the roads: the Reichsstraße 1 through Manschnow, over the Hauptgraben and up into Seelow; a road along each
// flank; a lateral on the plain and one on the heights
const SEELOW = { x: 10, z: -235 };
const R1 = [[0, 560], [0, BASE_Z], [-20, 250], [15, 5], [12, -120], [SEELOW.x, SEELOW.z], [0, -BASE_Z], [0, -560]];
const ROADS = [R1,
  [[-130, 560], [-200, 420], [-330, 190], [-240, -15], [-290, -185], [-200, -420], [-130, -560]],
  [[130, 560], [260, 380], [330, 160], [240, 30], [310, -195], [200, -420], [130, -560]],
  [[-330, 190], [-20, 250], [330, 160]],
  [[-290, -185], [SEELOW.x, SEELOW.z], [310, -195]]];
const roadDist = (x: number, z: number) => { let d = Infinity; for (const p of ROADS) d = Math.min(d, segDist(p, x, z)); return d; };

const points: ControlPointDef[] = [
  { id: 'A', name: 'Küstrin road', x: -30, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Letschin', x: -330, z: 190, owner: null, sector: 'west' },
  { id: 'C', name: 'Manschnow', x: -20, z: 250, owner: null, sector: 'centre' },
  { id: 'D', name: 'Reitwein Spur', x: 330, z: 160, owner: null, sector: 'east' },
  { id: 'E', name: 'Neu Langsow', x: -240, z: -15, owner: null, sector: 'west' },
  { id: 'F', name: 'Hauptgraben bridge', x: 15, z: 5, owner: null, sector: 'centre', radius: 28 },
  { id: 'G', name: 'Sachsendorf', x: 240, z: 30, owner: null, sector: 'east' },
  { id: 'H', name: 'Werbig', x: -290, z: -185, owner: null, sector: 'west' },
  { id: 'I', name: 'Seelow', x: SEELOW.x, z: SEELOW.z, owner: null, sector: 'centre', radius: 28 },
  { id: 'J', name: 'Friedersdorf', x: 310, z: -195, owner: null, sector: 'east' },
  { id: 'K', name: 'Berlin road', x: -30, z: -470, owner: 'pact', sector: 'centre' },
];

// ---- the drainage ditches of the Oderbruch: laterals across the plain, a few running toward the slope, and the
// Hauptgraben along the foot of it (culverts where the roads cross, none through the villages)
const LATERALS = [70, 200, 335];
const CROSS = [-420, -150, 110, 420];
function ditch(x: number, z: number) {
  if (Math.abs(x) > 485 || !plain(x, z) || roadDist(x, z) < 8) return [Infinity, 0]; // (not out past the field’s edge)
  if (points.some((p) => Math.hypot(p.x - x, p.z - z) < 45) || Math.hypot(x, Math.abs(z) - BASE_Z) < 70) return [Infinity, 0];
  const hg = Math.abs(z - footZ(x) - 32);
  let d = Infinity;
  for (const lz of LATERALS) d = Math.min(d, Math.abs(z - lz - 5 * Math.sin(x * 0.01 + lz)));
  for (const cx of CROSS) if (z < 420) d = Math.min(d, Math.abs(x - cx - 4 * Math.sin(z * 0.012 + cx)));
  return hg < d ? [hg, 1.7] : [d, 1.2];
}

// ---- the flooded meadows: shallow sheets of water on the plain, on both sides of the middle
const POOLS: { x: number; z: number; rx: number; rz: number; rot: number; s: number }[] = [];
const poolQ1 = (L: (typeof POOLS)[0], x: number, z: number) => {
  const c = Math.cos(L.rot), s = Math.sin(L.rot), dx = x - L.x, dz = z - L.z;
  const lx = (dx * c - dz * s) / L.rx, lz = (dx * s + dz * c) / L.rz, a = Math.atan2(lz, lx);
  return Math.hypot(lx, lz) * (1 + 0.12 * Math.sin(2 * a + L.s) + 0.07 * Math.sin(3 * a + 2 * L.s));
};
/** < 1 inside a pool, 1 at its edge. */
const poolQ = (x: number, z: number) => {
  let q = Infinity;
  for (const L of POOLS) if (Math.abs(x - L.x) < 80 && Math.abs(z - L.z) < 80) q = Math.min(q, poolQ1(L, x, z));
  return q;
};
{
  const r = mulberry32(1945_04);
  const count = [0, 0];
  for (let i = 0; count[0] + count[1] < 16 && i < 8000; i++) {
    const x = (r() * 2 - 1) * 460, z = -60 + r() * 520, rx = 18 + r() * 26, rz = 10 + r() * 14, rot = r() * 3, s = r() * 6;
    const R = Math.max(rx, rz) * 1.25, side = z > 110 ? 0 : 1;  // (8 well out on the Soviet side, 8 along the middle)
    if (count[side] >= 8) continue;
    if (!plain(x, z) || !plain(x + R, z) || !plain(x - R, z) || !plain(x, z - R) || z - footZ(x) < R + 45) continue;
    if (roadDist(x, z) < R + 14 || points.some((p) => Math.hypot(p.x - x, p.z - z) < R + 40) || Math.hypot(x, z - BASE_Z) < 130) continue;
    if (POOLS.some((p) => Math.hypot(p.x - x, p.z - z) < (Math.max(p.rx, p.rz) + Math.max(rx, rz)) * 1.25 + 20)) continue;
    POOLS.push({ x, z, rx, rz, rot, s });
    count[side]++;
  }
}

function ground(x: number, z: number) {
  let h = 1.2 + fbm(noise, x * 0.006 + 11, z * 0.006, 3) * 0.6 + fbm(noise, x * 0.04, z * 0.04, 2) * 0.12; // the flat plain
  h += Math.max(plateau(x, z), spur(x, z));
  h += ridged(noise, x * 0.02 + 5, z * 0.02, 3) * 2.2 * smoothstep(2, 10, plateau(x, z)) * smoothstep(-40, 40, footZ(x) - z) * smoothstep(110, 50, footZ(x) - z); // gullies down the slope
  h += smoothstep(500, 620, Math.abs(x)) * 12 + smoothstep(560, 680, Math.abs(z)) * 10;
  return h;
}
const SEELOW_H = ground(SEELOW.x, SEELOW.z);

function height(x: number, z: number) {
  let h = ground(x, z);
  h += (SEELOW_H - h) * smoothstep(90, 60, Math.hypot(x - SEELOW.x, (z - SEELOW.z) * 0.8)); // the town on level ground
  for (const bz of [BASE_Z, -BASE_Z]) h += (lerp(1.6, h, 0.3) - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  const rd = roadDist(x, z);
  if (rd < 9 && plain(x, z)) h = lerp(h, Math.max(h, 2.2), smoothstep(9, 4.5, rd));   // the roads on their low banks over the plain
  const [dd, depth] = ditch(x, z);
  if (dd < 5) h -= depth * smoothstep(5, 1.2, dd);
  const q = poolQ(x, z);
  if (q < 1.25) h = Math.min(h, lerp(h, -0.35, smoothstep(1.2, 0.75, q)));           // the flooded meadows
  return h;
}

/** Flooded meadow: men wade, vehicles crawl; the ditches’ mud slows them a little. */
function soft(x: number, z: number, foot: boolean) {
  if (roadDist(x, z) < 5) return 1;
  const q = poolQ(x, z);
  if (q < 1.05) return foot ? 0.6 : 0.4;
  if (q < 1.5) return foot ? 0.85 : 0.7;
  return ditch(x, z)[0] < 3 ? (foot ? 0.85 : 0.75) : 1;
}

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Platoon' }];

const woodsK = (x: number, z: number) => smoothstep(0.1, 0.22, fbm(noise, x * 0.004 + 31, z * 0.004 - 17, 3));

export default {
  id: 'seelow-heights',
  name: 'Seelow Heights',
  description: 'April 1945, the road to Berlin: the flat, ditch-cut Oderbruch with its flooded meadows below the Seelow escarpment, the town of Seelow on top and the Reichsstraße 1 climbing to it — and the Reitwein Spur jutting out over the plain on the Soviet side.',
  epochs: ['1945'],
  region: 'east', // (the menu’s Eastern Front: maps/index.js REGIONS)
  sides: { nato: 'Soviet Union', pact: 'Germany' },
  armies: { nato: ['sov'], pact: ['wh'] },
  size: 1600,
  segments: 640,
  bounds: { x: 500, z: 560 },
  seed: 1945,
  height,
  soft,
  woods: (x: number, z: number) => woodsK(x, z) * 0.8,
  fields: createFields({ seed: 1945, cell: 70 }),

  theme: {
    // a cold, hazy April day, smoke over the plain
    fogColor: 0xa8aeb0, fogDensity: 0.0016,
    skyTop: 0x6a88a8, skyHorizon: 0xc4cacc, skyBottom: 0x80847a,
    sunColor: 0xfff2dc, sunIntensity: 2.0, sunDisk: 0.4,
    clouds: 0.55, cloudLight: 0xeeeeea, cloudDark: 0x9a9ea4,
    sunDir: [0.4, 0.6, 0.55],
    hemiSky: 0xc0ccd8, hemiGround: 0x4c4834, hemiIntensity: 1.2,
    rimColor: 0xc8d0d8, rimIntensity: 0.22,
    terrain: {
      grass: '#5e7034', grassAlt: '#566a30', dryGrass: '#8a8450', dirt: '#5a4a34', rock: '#6e6a5e',
      pasture: '#62763a', ploughed: '#5c4834', stubble: '#9a8a58', meadow: '#6e8040',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0, // (no default tracks: the roads are painted below)
      surface(x: number, z: number, y: number) {
        const rd = roadDist(x, z);
        if (rd < 4) return [rd < 3.5 && segDist(R1, x, z) < 4 ? 0x5e5c58 : 0x7a7060, 0.85];  // the Reichsstraße’s tarmac, the gravel roads
        if (rd < 6.5) return [0x5a5040, 0.45];
        if (y < 0.4) return [0x34321f, 0.85];                                                   // mud at the water’s edge, the ditches’ bottoms
        if (ditch(x, z)[0] < 4) return [0x4a4a2c, 0.6];
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-130, 0, 130] }, pact: { x: 0, z: -BASE_Z, entries: [-130, 0, 130] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Zug' })),
  },

  /** Zhukov’s bombardment: craters thick along the middle, thinning toward both bases. */
  battlefield() {
    const blasts = shellField(1945_0416, { x: 480, z: 540 }, (x: number, z: number) => 0.9 * smoothstep(260, 40, z) * (roadDist(x, z) < 8 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 30) ? 0 : 1));
    return { blasts, ruins: [], works: [] };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const wet = (x: number, z: number) => poolQ(x, z) < 1.3 || ditch(x, z)[0] < 5;

    // ---- Seelow on the heights: brick houses along the Reichsstraße and the cross street, the church
    props.rand = mulberry32(1945_01);
    {
      const r = props.rand;
      const placed: number[][] = [];
      const house = (x: number, z: number, yaw: number) => {
        if (roadDist(x, z) < 8 || placed.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 11) || Math.hypot(x - SEELOW.x + 30, z - SEELOW.z - 30) < 14) return;
        placed.push([x, z]);
        props.townHouse({ x, z, yaw, width: 8 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.6 ? 2 : 1, name: 'brick house', damaged: 0.35 });
      };
      for (let t = -95; t <= 85; t += 13) { // along the Reichsstraße (z), both sides
        const z = SEELOW.z + t, x = SEELOW.x + (z > SEELOW.z ? 0.02 : 0.04) * (z - SEELOW.z);
        if (Math.abs(t) < 12) continue;
        if (r() > 0.15) house(x - 14, z, Math.PI / 2);
        if (r() > 0.15) house(x + 14, z, -Math.PI / 2);
      }
      for (let t = -110; t <= 110; t += 14) { // along the cross street (x)
        if (Math.abs(t) < 24) continue;
        const x = SEELOW.x + t;
        if (r() > 0.2) house(x, SEELOW.z - 14, 0);
        if (r() > 0.2) house(x, SEELOW.z + 14, Math.PI);
      }
    }
    props.church({ x: SEELOW.x - 30, z: SEELOW.z + 30, yaw: Math.PI / 2 });

    // ---- the villages of the plain and the heights: farmsteads, barns, garden walls
    const skip = (x: number, z: number) => roadDist(x, z) < 10 || wet(x, z) || Math.hypot(x, Math.abs(z) - BASE_Z) < 40;
    for (const [id, seed] of [['B', 11], ['C', 12], ['E', 13], ['G', 14], ['H', 15], ['J', 16]] as [string, number][]) {
      const p = points.find((q) => q.id === id)!;
      farmVillage(props, p.x, p.z, 7, 1945_100 + seed, skip, 1.1);
    }

    // ---- the Hauptgraben bridge: the ruined toll house, barricades and a knocked-out SU on the road
    props.house({ x: 40, z: 22, yaw: 0.1, width: 8, depth: 7 });
    props.logBarricade({ x: 2, z: -8, yaw: 0.1, length: 6 });
    props.logBarricade({ x: 30, z: -14, yaw: -0.2, length: 6 });
    props.sandbagRing({ x: -12, z: -24, radius: 4.5, toward: 1 });
    props.sandbagRing({ x: 44, z: 40, radius: 4.5, toward: -1 });
    props.wreckCar({ x: -6, z: 30, yaw: 0.4 });

    // ---- the Reitwein Spur: Zhukov’s dug-outs on the crest; the German positions along the escarpment’s crest
    props.rand = mulberry32(1945_02);
    for (const [x, z] of [[300, 140], [345, 185], [380, 130], [420, 200], [270, 200], [460, 150]]) props.sandbagRing({ x, z, radius: 4.5, toward: -1 });
    props.lowWall({ x: 330, z: 140, yaw: 0, length: 12, height: 1.3, color: 0x6a5a44 });
    props.tent({ x: 360, z: 205, yaw: 0.2, color: 0x5a5a40 });
    props.mast({ x: 352, z: 214, height: 12 });
    for (const x of [-420, -260, -150, 120, 220, 420]) {
      const z = footZ(x) - 66;
      if (!nearPoint(x, z, 30) && roadDist(x, z) > 10) props.sandbagRing({ x, z, radius: 4.5, toward: 1 });
    }

    // ---- the plain: wrecks where the columns jammed on the roads, haystacks and field barns
    props.rand = mulberry32(1945_03);
    {
      const r = props.rand;
      for (let i = 0; i < 40; i++) {
        const p = ROADS[i % ROADS.length], k = Math.floor(r() * (p.length - 1)), t = r();
        const x0 = p[k][0] + (p[k + 1][0] - p[k][0]) * t, z0 = p[k][1] + (p[k + 1][1] - p[k][1]) * t, side = r() < 0.5 ? -1 : 1;
        const len = Math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) || 1;
        const x = x0 + side * 8 * (p[k + 1][1] - p[k][1]) / len, z = z0 - side * 8 * (p[k + 1][0] - p[k][0]) / len;
        if (nearPoint(x, z, 32) || Math.abs(z) > 440 || wet(x, z) || roadDist(x, z) < 6.5) continue;
        props.wreckCar({ x, z, yaw: r() * 6.28 });
      }
      for (let i = 0; i < 70; i++) {
        const x = (r() * 2 - 1) * 470, z = (r() * 2 - 1) * 520;
        if (nearPoint(x, z, 40) || wet(x, z) || roadDist(x, z) < 10 || Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || Math.hypot(x - SEELOW.x, z - SEELOW.z) < 120) continue;
        const k = r();
        if (k < 0.45) props.hayBales({ x, z, yaw: r() * 3, count: 2 + Math.floor(r() * 3) });
        else if (k < 0.65) props.house({ x, z, yaw: r() * 3, width: 7, depth: 5, height: 2.8 });
        else if (k < 0.85) props.sandbagRing({ x, z, radius: 4, toward: z > 0 ? -1 : 1 });
        else props.logPile({ x, z, yaw: r() * 3, length: 6 });
      }
    }
    commandPost(props, this.bases.nato, -1, 0x5a5a40);
    commandPost(props, this.bases.pact, 1, 0x4e5236);
    props.finish();

    // the flooded meadows’ water
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x4a5450, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.88 });
    for (const L of POOLS) {
      const r = Math.max(L.rx, L.rz) * 1.3 + 2;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), poolMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(L.x, -0.05, L.z);
      mesh.receiveShadow = true;
      mesh.userData.noAO = true;
      scene.add(mesh);
    }

    const avoid = [{ x: 0, z: BASE_Z, r: 28 }, { x: 0, z: -BASE_Z, r: 28 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => wet(x, z) || roadDist(x, z) < 8 }];
    // pine and birch woods on the heights and out on the plain alike, willow rows along the ditches, fruit trees by the villages
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 7000, broadleaf: 0.6, autumn: 0, maxY: 40,
      forest: (x: number, z: number) => {
        if (wet(x, z) || roadDist(x, z) < 9 || nearPoint(x, z, 26) || Math.hypot(x - SEELOW.x, z - SEELOW.z) < 110) return -1;
        if (woodsK(x, z) > 0.5) return 1;
        const d = ditch(x, z)[0];
        if (d > 6 && d < 10) return 0.12;   // (willows along the ditches)
        return nearPoint(x, z, 70) ? 0.08 : -0.04;
      },
    });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2.2, fields: this.fields });

    return {
      buildings: props.buildings,
      update(dt: number, t: number) {
        grass.update(dt, t);
        trees.update(dt, t);
      },
    };
  },
} satisfies MapDef;
