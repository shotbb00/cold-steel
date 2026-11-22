// Passchendaele, October 1917: the last month of Third Ypres. The Australians, the New Zealanders and then the
// Canadians climb the low ridge from Zonnebeke to Passchendaele village through the Flanders mud — three months of
// shelling had smashed the drains of the clay, the August and October rains filled every hole, and the Ravebeek and the
// Stroombeek drowned into swamps of flooded shell holes. The only firm going was on the engineers' plank roads and the
// duckboard tracks; off them men sank to the waist and guns to the axles. The Germans held the ground in concrete
// pillboxes (MEBUs) — at Tyne Cot on the forward slope, at the Broodseinde crossroads — and shell-hole outposts, with
// counter-attack divisions behind the ridge. The Canadians took the ruins of the village, its church a heap of brick,
// on 6 November.
// On the map: the ridge across the middle (Tyne Cot on its western shoulder, Passchendaele on the crest, Broodseinde at
// the eastern crossroads), the Ravebeek drowned in a chain of flooded shell holes across the British half and the
// Stroombeek across the German half, Polygon Wood shot to stumps round its Butte, the copses by Westroosebeke as
// shredded, Zonnebeke, Gravenstafel, Mosselmarkt, Becelaere. Plank roads (firm for everything) and duckboards (firm
// for men) cross the mud; everywhere else is slow (`soft`), the beek swamps and flooded holes slowest of all.
// Not mirrored but fair: in 1917 the Germans held the ridge and both beeks drained the British slopes; here the ridge
// is no man's land and each side has a drowned beek across its own approaches (the Stroombeek moved to the German half
// to answer the Ravebeek), the same three plank roads and two duckboard tracks from its base, the same number of
// pillboxes on its half, a shattered wood on a rise at the same reach (Polygon Wood and its Butte answered by the
// copses on the Westroosebeke rise), a spur on each flank (Gravenstafel, Keiberg). Tyne Cot sits on the British side
// of the crest and Broodseinde on the German side, each as near to its own base.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createLakes } from '../world/Lakes.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, commandPost, trenchLine, shellField } from './common.js';
import { farmVillage } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const SEED = 1917_10;
const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const FRONT = 120;                                   // each side's outpost line (z from the middle)
const noise = createNoise2D(SEED);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef =>
  ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const POINTS: ControlPointDef[] = [
  P('A', 'Frezenberg', 0, 470, 'centre'),
  P('B', 'Gravenstafel', -380, 300, 'west'),
  P('C', 'Zonnebeke', -90, 380, 'centre'),
  P('D', 'Polygon Wood', 300, 300, 'east', { radius: 26 }),
  P('E', 'Tyne Cot', -260, 60, 'west', { radius: 26 }),
  P('F', 'Passchendaele', 20, -15, 'centre', { radius: 30 }),
  P('G', 'Broodseinde', 230, -30, 'east', { radius: 26 }),
  P('H', 'Westroosebeke', -270, -310, 'west'),
  P('I', 'Mosselmarkt', 60, -380, 'centre'),
  P('J', 'Becelaere', 400, -260, 'east'),
  P('K', 'Moorslede', 0, -470, 'centre'),
];
const at = (id: string) => { const p = POINTS.find((q) => q.id === id)!; return [p.x, p.z]; };

/** The plank roads: firm for guns, lorries and tanks (and men). Three from each base, the ridge road along the crest. */
const ROADS = [
  [[-300, 600], [-310, 440], at('B'), [-350, 190], [-300, 110], at('E')],
  [[0, 600], at('A'), at('C'), [-70, 260], [-30, 140], at('F')],                         // the Zonnebeke–Passchendaele road
  [[300, 600], [300, 420], at('D'), [270, 170], [240, 60], at('G')],
  [[-540, 70], [-380, 75], at('E'), [-120, 20], at('F'), [130, -25], at('G'), [380, -45], [540, -55]], // the ridge road
  [[-300, -600], [-290, -430], at('H'), [-250, -190], [-265, -80], at('E')],
  [[0, -600], at('K'), at('I'), [70, -250], [40, -120], at('F')],
  [[300, -600], [330, -420], at('J'), [330, -160], [250, -90], at('G')],
];
/** The duckboard tracks: firm for men only. Two from each side's rear points up to the ridge. */
const DUCKS = [
  [at('C'), [-180, 250], [-230, 150], at('E')],
  [at('D'), [160, 190], [90, 90], at('F')],
  [at('I'), [150, -260], [200, -140], at('G')],
  [at('H'), [-160, -200], [-70, -90], at('F')],
];
/** The drowned beeks: the Ravebeek across the British half, the Stroombeek across the German. */
const BEEKS = [
  [[-540, 215], [-330, 180], [-150, 140], [40, 165], [220, 130], [400, 160], [540, 150]],
  [[-540, -160], [-340, -190], [-140, -170], [60, -145], [260, -180], [420, -150], [540, -170]],
];
/** Distance from (x, z) to the nearest of the polylines (greatWarHelpers segDist, without Math.hypot: the terrain asks this a million times). */
const minD = (polys: number[][][], x: number, z: number) => {
  let best = Infinity;
  for (const poly of polys) for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), ex = x - a[0] - dx * t, ez = z - a[1] - dz * t;
    best = Math.min(best, ex * ex + ez * ez);
  }
  return Math.sqrt(best);
};
const roadD = (x: number, z: number) => minD(ROADS, x, z);
const duckD = (x: number, z: number) => minD(DUCKS, x, z);
const beekD = (x: number, z: number) => minD(BEEKS, x, z);

/** The swamp along each beek: a chain of flooded shell holes, wadeable (0.6 m), off the roads and duckboards, the same count and sizes on each. */
const POOLS: any[] = [];
for (const [b, beek] of BEEKS.entries()) {
  const r = mulberry32(SEED + b * 101);
  for (let i = 0; i < beek.length - 1; i++) {
    const [ax, az] = beek[i], [bx, bz] = beek[i + 1], len = Math.hypot(bx - ax, bz - az), rot = -Math.atan2(bz - az, bx - ax);
    for (let t = 30; t < len - 20; t += 62) {
      const x = ax + (bx - ax) * t / len + (r() - 0.5) * 16, z = az + (bz - az) * t / len + (r() - 0.5) * 16;
      const rx = 15 + r() * 14, rz = 7 + r() * 5;
      if (Math.abs(x) > 470 || roadD(x, z) < rx + 10 || duckD(x, z) < rx + 8 || POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < rx + 50)) continue;
      POOLS.push({ x, z, rx, rz, rot: rot + (r() - 0.5) * 0.4, depth: 0.6, seed: POOLS.length + 1 });
    }
  }
}
const water = createLakes({ lakes: POOLS });

/** Flooded shell holes over the mud (big ones, a few metres of water-filled crater): each half its own, the same count. */
const FLOODED: number[][] = [];
for (const s of [1, -1]) {
  const r = mulberry32(SEED + (s > 0 ? 7 : 13));
  for (let i = 0, n = 0; n < 55 && i < 3000; i++) {
    const x = (r() * 2 - 1) * 470, z = s * (r() * 340), rr = 13 + r() * 6;
    if (roadD(x, z) < 14 || duckD(x, z) < 10 || beekD(x, z) < 70 || POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < 40)
      || FLOODED.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 30)) continue;
    FLOODED.push([x, z, rr]);
    n++;
  }
}

/** The ridge's crest line (z): Passchendaele on it, wandering a little over each half. */
const ridgeZ = (x: number) => 18 * Math.sin(x * 0.005 + 0.7) - 10 * Math.cos(x * 0.011 + 0.3);
/** [x, z, r, h]: the Gravenstafel spur and Polygon Wood's rise (with the Butte) behind the British; the Westroosebeke rise and the Keiberg spur behind the Germans. */
const HILLS = [[-400, 330, 150, 4], [300, 300, 170, 4.5], [330, 322, 22, 3.5], [-280, -330, 160, 4.5], [400, -270, 160, 4], [-150, -60, 120, 1.5], [140, 70, 120, 1.5]];
function raw(x: number, z: number) {
  let h = 2.8 + fbm(noise, x * 0.0025, z * 0.0025, 3) * 2 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.4;
  h += 9 * (1 - smoothstep(20, 250, Math.abs(z - ridgeZ(x))));                                       // the ridge
  for (const [hx, hz, r, hh] of HILLS) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  const bd = beekD(x, z);
  h -= 2.2 * (1 - smoothstep(10, 120, bd));                                                  // the beek valleys
  h += smoothstep(390 + 50 * Math.sin(x * 0.007 + 3), 560, Math.abs(z)) * 7;
  h += smoothstep(BOUNDS.x - 60 + 60 * Math.sin(z * Math.PI / 280), BOUNDS.x + 160, Math.abs(x)) * 26; // (one whole wave per half: as much high flank on each)
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 24;
  return h;
}
const PH = POINTS.map((p) => raw(p.x, p.z));
function height(x: number, z: number) {
  let h = raw(x, z);
  POINTS.forEach((p, i) => { const d2 = (x - p.x) ** 2 + (z - p.z) ** 2; if (d2 < 2025) h += (PH[i] - h) * smoothstep(45, 22, Math.sqrt(d2)) * 0.6; });
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 3.5 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  if (beekD(x, z) < 130) h = water.carve(x, z, h);                                                 // (the pools lie along the beeks: their basins reach no further)
  const rd = roadD(x, z);
  if (rd < 9) h += (Math.max(h, 1.5) - h) * (1 - smoothstep(4, 9, rd));                               // the plank roads ride the swamp on fascines
  return h;
}

/** How churned the ground is (0..1): all of it between the rear areas. */
const churnZ = (z: number) => 1 - smoothstep(330, 430, Math.abs(z));
const bogK = (x: number, z: number) => {
  let k = 1 - smoothstep(20, 70, beekD(x, z));
  for (const [fx, fz, r] of FLOODED) if (Math.abs(x - fx) < r && Math.abs(z - fz) < r) k = Math.max(k, 1 - smoothstep(r * 0.3, r * 0.5, Math.hypot(x - fx, z - fz)));
  return k;
};

/** Soft ground (world/Nav.js, UnitStack): a speed factor per 4 m cell, worked out once. */
const SC = 4, SNX = Math.ceil((BOUNDS.x + 60) * 2 / SC), SNZ = Math.ceil((BOUNDS.z + 60) * 2 / SC);
let softV: Float32Array | null = null, softF: Float32Array | null = null;
function softGrid() {
  softV = new Float32Array(SNX * SNZ); softF = new Float32Array(SNX * SNZ);
  for (let j = 0; j < SNZ; j++) for (let i = 0; i < SNX; i++) {
    const x = -BOUNDS.x - 60 + (i + 0.5) * SC, z = -BOUNDS.z - 60 + (j + 0.5) * SC, k = j * SNX + i;
    const m = churnZ(z), b = m > 0 ? bogK(x, z) : 0, rd = roadD(x, z);
    softV[k] = rd < 4.5 ? 1 : Math.max(0.15, 1 - 0.5 * m - 0.35 * b);                   // off the planks a gun sinks to the axles
    softF[k] = rd < 4.5 || duckD(x, z) < 3.5 ? 1 : Math.max(0.4, 1 - 0.22 * m - 0.35 * b); // men wade to the knee, in the beeks to the waist
  }
}
function soft(x: number, z: number, foot: boolean) {
  if (!softV) softGrid();
  const i = Math.floor((x + BOUNDS.x + 60) / SC), j = Math.floor((z + BOUNDS.z + 60) / SC);
  if (i < 0 || j < 0 || i >= SNX || j >= SNZ) return 1;
  return (foot ? softF! : softV!)[j * SNX + i];
}

/** The pillboxes (MEBUs): the same number on each half — Tyne Cot's three on the British side of the crest, Broodseinde's three on the German side, two in each outpost line. */
const MEBUS = [
  [-282, 38], [-235, 88], [-238, 22], [-140, 112], [390, 132],
  [212, -55], [262, -8], [250, -62], [130, -118], [-385, -108],
];

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'passchendaele',
  name: 'Passchendaele',
  description: 'October 1917, Third Ypres: up the low ridge from Zonnebeke to the ruins of Passchendaele through the Flanders mud. Concrete pillboxes at Tyne Cot and Broodseinde, the Ravebeek and Stroombeek drowned in flooded shell holes, Polygon Wood shot to stumps — off the plank roads and duckboards everything crawls.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['anzac', 'uk'], pact: ['de'] }, // (the Australians, New Zealanders and Canadians of the BEF against the German Fourth Army)
  conditions: { time: 'dawn', weather: 'rain' },   // (the Canadians went over at 5.40 on 26 October in the rain)
  airfields: [],                                     // (systems/Airfields.js: no strip in this mud — the squadrons fly from behind Ypres)
  size: 1600, segments: 640, bounds: BOUNDS, seed: SEED,
  height,
  soft,
  river: water,
  fields: createFields({ seed: SEED, cell: 84, weights: [0.45, 0.1, 0.05, 0.4] as any }),
  theme: {
    // a wet grey October dawn over Flanders: low cloud, drizzle haze, the ground a brown-grey porridge
    fogColor: 0x9a9c96, fogDensity: 0.0019, skyTop: 0x5e646a, skyHorizon: 0xa8aaa4, skyBottom: 0x66665e,
    sunColor: 0xd8d0c0, sunIntensity: 1.3, sunDisk: 0.05, clouds: 0.95, cloudLight: 0xb4b6b2, cloudDark: 0x5e646a,
    sunDir: [-0.4, 0.45, -0.75], hemiSky: 0xb4bac0, hemiGround: 0x4a4234, hemiIntensity: 1.3, rimColor: 0xb4bcc4, rimIntensity: 0.2,
    terrain: {
      grass: '#565c3a', grassAlt: '#4c5434', dryGrass: '#6e6a4a', dirt: '#55483a', rock: '#7e7a6e', strip: '#4a3e30',
      pasture: '#545e38', ploughed: '#665c4c', stubble: '#7a7050', meadow: '#5c6440',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-300, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        const rd = roadD(x, z);
        if (rd < 3.2) return [0x4a3c2c, 0.95];                                          // the plank roads (the planks themselves: decorate)
        if (duckD(x, z) < 1.2) return [0x5a4a36, 0.7];
        const m = churnZ(z);
        if (m <= 0) return null;
        const b = bogK(x, z), n = fbm(noise, x * 0.03, z * 0.03, 2);
        if (b > 0.2) return [0x3a3a2e, Math.min(0.95, 0.5 + b * 0.45)];                    // the swamp: grey slurry
        return [n > 0.1 ? 0x4e4232 : 0x5a4c3a, Math.min(0.92, m * (0.7 + n * 0.4) + (rd < 7 ? 0.2 : 0))]; // the mud
      },
    },
  },
  bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** Three months of shelling: craters everywhere (thickest in no man's land and the woods), the flooded holes, both outpost lines in their wire, the villages in ruins. */
  battlefield(game: any) {
    const wood = (x: number, z: number) => Math.max(1 - smoothstep(60, 95, Math.hypot(x - 300, z - 300)), 1 - smoothstep(60, 95, Math.hypot(x + 300, z + 330)));
    const dens = (x: number, z: number) => {
      const a = Math.abs(z);
      return 3.0 * (1 - smoothstep(FRONT, FRONT + 70, a)) + 1.3 * smoothstep(FRONT, FRONT + 40, a) * churnZ(z) + 1.6 * wood(x, z) + 0.08;
    };
    const keep = (b: number[]) => roadD(b[0], b[1]) > b[2] * 0.5 + 5 && duckD(b[0], b[1]) > b[2] * 0.45 + 2 && water.q(b[0], b[1]) > 1.6
      && !MEBUS.some(([mx, mz]) => Math.hypot(mx - b[0], mz - b[1]) < b[2] * 0.5 + 6) && Math.hypot(b[0], Math.abs(b[1]) - BASE_Z) > 50;
    const clamp = (b: number[]) => [b[0], b[1], b[2], Math.max(0.2, Math.min(b[3], height(b[0], b[1]) - 0.3))];
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter(keep).map(clamp);
    for (const [x, z, r] of FLOODED) blasts.push([x, z, r, 1.6]);
    const ruins = game.buildings.list.filter((b: any) => b.name !== 'pillbox' && Math.abs(b.z) < 430 && mulberry32(b.index * 7 + SEED)() < (Math.abs(b.z) < 200 ? 0.95 : 0.7)).map((b: any) => b.index);
    const works: any[] = [];
    const clear = (w: any) => roadD(w.x, w.z) > 7 && duckD(w.x, w.z) > 3 && water.q(w.x, w.z) > 1.2 && !MEBUS.some(([mx, mz]) => Math.hypot(mx - w.x, mz - w.z) < 8);
    for (const f of ['nato', 'pact'] as const) {
      const r = mulberry32(f === 'nato' ? 31 : 977), pts: number[][] = [], ph = r() * 6;
      for (let x = -480; x <= 480; x += 60) pts.push([x, FRONT + (r() - 0.5) * 24 + 14 * Math.sin(x * 0.009 + ph)]);
      const line = f === 'nato' ? pts : pts.map(([x, z]) => [-x, -z]);
      works.push(...trenchLine(line, f, { wireAt: 18, belts: 1, gapEvery: 50 }).filter(clear));
    }
    return { blasts, ruins, works };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearMebu = (x: number, z: number, r: number) => MEBUS.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < r);
    const skip = (x: number, z: number) => roadD(x, z) < 10 || duckD(x, z) < 6 || water.q(x, z) < 1.4 || nearMebu(x, z, 14);
    const concrete = 0x8a877c;

    // the pillboxes: a low box of reinforced concrete, firing slits all round, the door at the back (toward the Germans)
    for (const [x, z] of MEBUS) {
      props.rand = mulberry32(Math.round(x * 13 + z));
      const yaw = (props.rand() - 0.5) * 0.5;
      const b = props.beginBuilding('pillbox', x, z, yaw, 7, 6);
      b.plaster = concrete;
      props.shell(b, { height: 2.1, key: 'stone', color: concrete, t: 0.9, bay: 2.3, sill: 1.15, head: 1.45, frame: 0x6e6b62, front: [], back: [1.6] });
      props.piece('stone', b, 0, 2.45, 0, 7.4, 0.7, 6.4, 0x7e7b70);                         // the roof slab, a metre of concrete
      props.piece('plain', b, 0, 2.85, 0.4, 6.2, 0.25, 4.8, 0x4e4434);                        // earth and rubble over it
      props.endBuilding();
    }

    // the villages, every house a ruin by now (battlefield: ruins); Polygon Wood and Tyne Cot have none
    for (const p of POINTS) {
      if (p.id === 'D' || p.id === 'E') continue;
      const big = p.id === 'F' || p.id === 'C' || p.id === 'H' || p.id === 'J';
      farmVillage(props, p.x, p.z, big ? 8 : 5, SEED * 10 + Math.round(p.x * 3 + p.z * 7), skip, big ? 1.3 : 1);
    }
    buildSite(props, { kind: 'farm', seed: 1917 }, -228, 66, 0.4);                          // Tyne Cottage, the barn the Northumbrians named it for
    // Passchendaele church: the nave shot down to stumps of wall, the tower a broken stub over the rubble
    props.rand = mulberry32(SEED + 3);
    const cx = 52, cz = -38, cyaw = 0.3;
    const ch = props.beginBuilding('church', cx, cz, cyaw, 9, 18);
    ch.plaster = 0x8a6a56;
    props.shell(ch, { height: 6, key: 'stone', color: 0x8a6a56, front: [0], t: 0.7, bay: 3.2, sill: 1.8, head: 4.6, frame: 0x7a6050, ruin: 0.75 });
    props.endBuilding();
    const [tx, tz] = PropBuilder.local(cx, cz, cyaw, 0, 9 + 2.6), tg = terrain.heightAt(tx, tz);
    props.box('stone', tx, tg + 3.2, tz, 4.6, 6.4, 4.6, cyaw, 0x8a6a56, 0.04, -0.03);
    props.box('stone', tx + 0.8, tg + 7.2, tz - 0.5, 2.2, 1.8, 2.6, cyaw + 0.3, 0x80624e, 0.2, 0.1);
    cover.addBox({ x: tx, z: tz, yaw: cyaw, length: 4.6, thickness: 4.6, height: 6.4 });
    for (let i = 0; i < 8; i++) props.rubble(cx + (props.rand() - 0.5) * 18, cz + (props.rand() - 0.5) * 22, 0.4 + props.rand() * 0.5);

    // the plank roads (beech planks across on a corduroy of logs, a kerb either side) and the duckboard tracks
    const planks = (poly: number[][], w: number, step: number, color: number, kerb: boolean) => {
      for (let i = 0; i < poly.length - 1; i++) {
        const [ax, az] = poly[i], [bx, bz] = poly[i + 1], len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az);
        for (let t = step / 2; t < len; t += step) {
          const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len;
          if (Math.abs(x) > bounds.x + 20 || Math.abs(z) > bounds.z + 20 || water.q(x, z) < 1.05) continue;
          const y0 = terrain.heightAt(x - Math.sin(yaw) * step / 2, z - Math.cos(yaw) * step / 2), y1 = terrain.heightAt(x + Math.sin(yaw) * step / 2, z + Math.cos(yaw) * step / 2);
          const tilt = Math.atan2(y1 - y0, step), shade = (props.rand() - 0.5) * 0.12;
          props.box('plain', x, (y0 + y1) / 2 + 0.1, z, w, 0.14, step * 0.96, yaw, new THREE.Color(color).offsetHSL(0, 0, shade).getHex(), tilt);
          if (kerb) for (const s of [-1, 1]) props.box('plain', x + Math.cos(yaw) * s * (w / 2 - 0.15), (y0 + y1) / 2 + 0.22, z - Math.sin(yaw) * s * (w / 2 - 0.15), 0.25, 0.2, step, yaw, 0x3e3226, tilt);
        }
      }
    };
    props.rand = mulberry32(SEED + 5);
    for (const r of ROADS) planks(r, 4.6, 3, 0x5c4a34, true);
    for (const d of DUCKS) planks(d, 0.9, 2.2, 0x6e5c40, false);

    // the wreckage of the advance off the planks: a gun sunk to its axles, ammunition boxes, a dead horse’s wagon (each half its own)
    for (const s of [1, -1]) {
      props.rand = mulberry32(SEED + (s > 0 ? 21 : 37));
      for (let n = 0, i = 0; n < 14 && i < 400; i++) {
        const r = ROADS[Math.floor(props.rand() * ROADS.length)], k = Math.floor(props.rand() * (r.length - 1)), t = props.rand();
        const x = r[k][0] + (r[k + 1][0] - r[k][0]) * t + (props.rand() - 0.5) * 30, z = r[k][1] + (r[k + 1][1] - r[k][1]) * t + (props.rand() - 0.5) * 30;
        if (z * s < 0 || Math.abs(z) > 420 || Math.abs(x) > 470 || skip(x, z) || roadD(x, z) < 8) continue;
        props.crates({ x, z, yaw: props.rand() * 3 });
        if (n % 3 === 0) props.logPile({ x: x + 4, z: z + 3, yaw: props.rand() * 3, length: 5 });
        n++;
      }
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();
    water.build(scene);

    // the flooded shell holes: brown water a little below the old ground (the crater is dug under it: battlefield)
    const mat = new THREE.MeshStandardMaterial({ color: 0x3c3a2e, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.94 });
    mat.userData.waterSurface = true;
    for (const [x, z, r] of FLOODED) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r * 0.45, 14), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, height(x, z) - 0.75, z);
      m.userData.noAO = true;
      scene.add(m);
    }

    // trees: hardly any left — Polygon Wood and the Westroosebeke copses as thin stands the shells will cut to stumps, a few broken survivors in the rear
    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => roadD(x, z) < 6 || duckD(x, z) < 3 || water.q(x, z) < 1.3 || nearMebu(x, z, 8) }];
    const bare = { test: (x: number, z: number) => churnZ(z) > 0.25 && copse(x, z) < 0.2 }; // (no man's land and the shelled rear: not a tree standing outside the woods)
    const copse = (x: number, z: number) => {
      const w = Math.max(smoothstep(90, 55, Math.hypot(x - 300, z - 300)), smoothstep(90, 55, Math.hypot(x + 300, z + 330)));
      const rear = smoothstep(380, 470, Math.abs(z)) * smoothstep(0.15, 0.4, fbm(noise, x * 0.006 + 40, z * 0.006 - 12, 3));
      return Math.max(w * 0.8, rear * 0.7);
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid: [...avoid, bare], lane: bounds.x - 10, count: 900, autumn: 0.8, forest: copse });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x: number, z: number) => churnZ(z) > 0.2 }], count: 500, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [...avoid, { test: (x: number, z: number) => Math.random() < churnZ(z) * 0.93 }], density: 2.2, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); hedges.update(dt, t); },
    };
  },
} satisfies MapDef;
