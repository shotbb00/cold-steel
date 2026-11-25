// Hill 70 and Lens, 15–25 August 1917. Currie’s Canadian Corps (here the British Army: it fought in Horne’s First
// Army) was told to take Lens; Currie took the hill instead — the low chalk rise of Hill 70 north of the town, from the
// Loos side — so that the Germans would have to counter-attack it across open ground under his guns. They did, twenty-one
// times in four days. Round the hill lay the Lens coalfield: the miners’ cités (rows of brick terraces, the corons),
// the pitheads (fosses) with their steel headframes, the railway sidings, and the crassiers — the tall black spoil tips
// of the mines, the real high ground of the place, fought over from Loos in 1915 to Lens in 1917.
// On the map: Hill 70 in the middle with the Chalk Pit and Chalk Pit Wood on its western shoulder and Cité Saint-Laurent
// on its eastern; both trench systems with their wire across it (white chalk on the parapets); the Loos road over the
// crest from Loos down into Lens, the Béthune road from Liévin through Saint-Laurent; behind the Canadian line Loos,
// Grenay and Liévin with their cités, the pit at Loos with its headframe and the Double Crassier, the pit and tip by
// Liévin; behind the German line Lens itself, the cités of Saint-Auguste and Saint-Édouard, their pits, tips and sidings.
// Not mirrored but fair: the hill’s crest is no man’s land, reached as soon from each side. Each half has the same black
// high ground — one tall conical tip (24 m) and a double crassier of two long ridges (16 m) — at the same reach behind
// its own front, the double on the west of the British half and on the east of the German, the cones the other way
// round; each has a pit with a headframe and sidings by each tip; three cités behind the British line answer Lens and
// two cités behind the German; the Chalk Pit and its wood on the British side of the crest answer Cité Saint-Laurent and
// Bois Hugo on the German side, each as near its own base.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildVillage, commandPost, trenchLine, shellField } from './common.js';
import { segDist } from './greatWarHelpers.ts';
import type { MapDef, ControlPointDef } from '../types.ts';

const SEED = 1917_08;
const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const FRONT = 105;                                   // each side’s fire trench (z from the middle)
const noise = createNoise2D(SEED);

const P = (id: string, name: string, x: number, z: number, sector: string, o: any = {}): ControlPointDef =>
  ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const POINTS: ControlPointDef[] = [
  P('A', 'Mazingarbe', 0, 470, 'centre'),
  P('B', 'Loos', -390, 280, 'west'),
  P('C', 'Grenay', -70, 375, 'centre'),
  P('D', 'Liévin', 310, 290, 'east'),
  P('E', 'Chalk Pit', -260, 40, 'west', { radius: 26, village: false }),
  P('F', 'Hill 70', 10, -5, 'centre', { radius: 30, village: false }),
  P('G', 'Cité Saint-Laurent', 240, -55, 'east', { radius: 28 }),
  P('H', 'Cité Saint-Auguste', -260, -330, 'west'),
  P('I', 'Lens', 110, -350, 'centre', { radius: 32 }),
  P('J', 'Cité Saint-Édouard', 390, -240, 'east'),
  P('K', 'Sallaumines', 30, -470, 'centre'),
];
const at = (id: string) => { const p = POINTS.find((q) => q.id === id)!; return [p.x, p.z]; };

/** The roads (pavé): the Loos road over the hill into Lens, the Béthune road through Saint-Laurent, and one up from each rear. */
const ROADS = [
  [[-560, 330], at('B'), [-300, 120], [-120, 40], at('F'), [60, -180], at('I'), [90, -600]],   // the Loos road
  [[560, -290], at('J'), at('G'), [290, 130], at('D'), [330, 600]],                            // the Béthune road
  [[0, 600], at('A'), at('C'), [-40, 200], at('F')],
  [[-300, -600], at('H'), [-280, -150], at('E')],
];
const roadD = (x: number, z: number) => { let d = Infinity; for (const r of ROADS) d = Math.min(d, segDist(r, x, z)); return d; };

/** The crassiers: [x, z, rx, rz, yaw, h]. The British half: the Double Crassier by Loos, the tip by Liévin; the German half: the tip by Saint-Auguste, the double by Saint-Édouard. */
const HEAPS = [
  [-180, 215, 75, 17, 0.2, 16], [-165, 250, 75, 17, 0.2, 16], [215, 190, 55, 50, 0.4, 24],
  [-195, -210, 55, 50, -0.3, 24], [250, -205, 72, 17, -0.25, 16], [262, -240, 72, 17, -0.25, 16],
];
/** Normalised distance into the nearest tip (≤ 1 inside its foot). */
const heapD = (x: number, z: number) => {
  let best = 9;
  for (const [hx, hz, rx, rz, yaw] of HEAPS) {
    const dx = x - hx, dz = z - hz;
    if (Math.abs(dx) > rx + 20 || Math.abs(dz) > rx + 20) continue;
    const c = Math.cos(yaw), s = Math.sin(yaw), u = dx * c - dz * s, v = dx * s + dz * c;
    best = Math.min(best, Math.hypot(u / rx, v / rz));
  }
  return best;
};
const heapH = (x: number, z: number) => {
  let h = 0;
  for (const [hx, hz, rx, rz, yaw, hh] of HEAPS) {
    const dx = x - hx, dz = z - hz;
    if (Math.abs(dx) > rx + 5 || Math.abs(dz) > rx + 5) continue;
    const c = Math.cos(yaw), s = Math.sin(yaw), u = dx * c - dz * s, v = dx * s + dz * c, d = Math.hypot(u / rx, v / rz);
    h = Math.max(h, hh * smoothstep(1, 0.3, d) * (1 + 0.05 * fbm(noise, x * 0.08, z * 0.08, 2)));   // (steep black flanks, a flattish top)
  }
  return h;
};

/** The pits (fosses): headframe at [x, z], yaw, and the sidings beside it [x0, z0, x1, z1]. */
const FOSSES = [
  { x: -270, z: 268, yaw: 0.3, rail: [-245, 302, -125, 302] },     // Loos (the twin headframe the Tommies called Tower Bridge)
  { x: 150, z: 262, yaw: -0.2, rail: [60, 300, 230, 300] },        // Liévin
  { x: -110, z: -272, yaw: 2.9, rail: [-195, -300, -25, -300] },   // Saint-Auguste
  { x: 372, z: -118, yaw: 1.4, rail: [425, -60, 425, -185] },      // Saint-Édouard
];
const nearFosse = (x: number, z: number, r: number) => FOSSES.some((f) => Math.hypot(f.x - x, f.z - z) < r);
const railD = (x: number, z: number) => Math.min(...FOSSES.map((f) => segDist([[f.rail[0], f.rail[1]], [f.rail[2], f.rail[3]]], x, z)));

const QUARRY = [-205, 22, 30, 4];                    // the Chalk Pit: a hollow in the hill’s western shoulder
const WOODS = [[-215, 95, 42], [180, -100, 42]];     // Chalk Pit Wood (British side), Bois Hugo (German side)

function raw(x: number, z: number) {
  let h = 2.5 + fbm(noise, x * 0.0024, z * 0.0024, 3) * 3 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.35;
  h += 8 * smoothstep(250, 0, Math.hypot((x + 10) / 1.35, z)) ** 1.3;                         // Hill 70
  h -= QUARRY[3] * smoothstep(QUARRY[2], QUARRY[2] * 0.4, Math.hypot(x - QUARRY[0], z - QUARRY[1]));
  h += smoothstep(390 + 50 * Math.sin(x * 0.007 + 5), 560, Math.abs(z)) * 7;
  h += smoothstep(BOUNDS.x - 60 + 60 * Math.sin(z * Math.PI / 280), BOUNDS.x + 160, Math.abs(x)) * 28; // (one whole wave per half)
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 24;
  return h;
}
const PH = POINTS.map((p) => raw(p.x, p.z));
function height(x: number, z: number) {
  let h = raw(x, z);
  POINTS.forEach((p, i) => { const d2 = (x - p.x) ** 2 + (z - p.z) ** 2; if (d2 < 2025) h += (PH[i] - h) * smoothstep(45, 22, Math.sqrt(d2)) * 0.6; });
  for (const bz of [BASE_Z, -BASE_Z]) h += (h * 0.4 + 3.5 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  for (const f of FOSSES) h += (raw(f.x, f.z) - h) * smoothstep(40, 26, Math.hypot(x - f.x, z - f.z));   // (the pit yards are level)
  return h + heapH(x, z);
}

/** How churned the ground is (0..1): no man’s land over the hill, a little round the lines behind. */
const churn = (z: number) => {
  const a = Math.abs(z);
  return Math.max(1 - smoothstep(FRONT + 10, FRONT + 60, a), 0.45 * (1 - smoothstep(20, 60, Math.abs(a - 215))));
};
const onHill = (x: number, z: number) => smoothstep(220, 120, Math.hypot((x + 10) / 1.35, z));
const copse = (x: number, z: number) => {
  let k = smoothstep(0.2, 0.45, fbm(noise, x * 0.006 + 40, z * 0.006 - 12, 3)) * smoothstep(390, 460, Math.abs(z)) * 0.7;
  for (const [wx, wz, r] of WOODS) k = Math.max(k, smoothstep(r, r * 0.55, Math.hypot(x - wx, z - wz)) * 0.85);
  return k;
};

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Section' }];
const CHALK = new THREE.Color(0xb6b0a0);

/** A coron: a row of brick miners’ terraces, one roof, a door every five metres front and back gardens behind. */
function coron(props: any, x: number, z: number, yaw: number, len: number, seed: number) {
  props.rand = mulberry32(seed);
  const r = props.rand, b = props.beginBuilding('miners’ terrace', x, z, yaw, len, 7);
  const brick = new THREE.Color(0x8a4634).offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.1).getHex();
  b.plaster = brick;
  const front: number[] = [];
  for (let o = -len / 2 + 2.2; o < len / 2 - 1; o += 5.5) front.push(o);
  props.shell(b, { height: 5.4, storeys: 2, key: 'stone', color: brick, t: 0.4, front, back: [len * 0.25], frame: 0xb8ae98, bay: 2.75 });
  props.piece('plain', b, 0, 2.7, 0, len - 0.4, 0.2, 6.6, 0x5a4a3c);
  props.gableRoof(b, { eave: 5.4, t: 0.4, color: r() < 0.6 ? 0x6a3024 : 0x3a3c40, pitch: 0.6, chimney: true });
  props.endBuilding();
}

export default {
  id: 'hill-70',
  name: 'Hill 70',
  description: 'August 1917: the Canadians take Hill 70 on the edge of the Lens coalfield and hold it against counter-attack after counter-attack. A low chalk rise between brick miners’ cités, pitheads and railway sidings, with the black spoil tips — the crassiers — standing over both lines as the only real heights.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['uk'], pact: ['de'] }, // (the Canadian Corps, fighting here as the British Army, against the German Sixth Army)
  conditions: { time: 'dawn', weather: 'clear' },   // (zero hour 4.25 on 15 August, a fine summer morning)
  size: 1600, segments: 640, bounds: BOUNDS, seed: SEED,
  height,
  fields: createFields({ seed: SEED, cell: 84, weights: [0.35, 0.25, 0.1, 0.3] as any }),
  theme: {
    // an August dawn over the coalfield: clear sky, coal smoke and gas haze low over the ground
    fogColor: 0xa4a29a, fogDensity: 0.0015, skyTop: 0x5c7290, skyHorizon: 0xc4bcae, skyBottom: 0x6a665c,
    sunColor: 0xffe6c4, sunIntensity: 1.8, sunDisk: 0.14, clouds: 0.4, cloudLight: 0xd4d0c8, cloudDark: 0x7a7c80,
    sunDir: [0.5, 0.35, -0.75], hemiSky: 0xc4ccd4, hemiGround: 0x4a4436, hemiIntensity: 1.25, rimColor: 0xd4c8b4, rimIntensity: 0.25,
    terrain: {
      grass: '#5e663a', grassAlt: '#545e36', dryGrass: '#8e8458', dirt: '#5a4c3e', rock: '#8a8678', strip: '#4c3f30',
      pasture: '#5a663a', ploughed: '#7a7262', stubble: '#a08c58', meadow: '#646c40',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-300, 0, 300], roadZ: BOUNDS.z - 20,
      surface(x: number, z: number) {
        const hd = heapD(x, z);
        if (hd < 1.05) {                                                                 // the crassiers: black shale, burnt red here and there
          const n = fbm(noise, x * 0.05, z * 0.05, 2);
          return [n > 0.25 ? 0x4a2e26 : n > -0.1 ? 0x24221f : 0x2e2b27, Math.min(0.97, (1.05 - hd) * 4)];
        }
        if (roadD(x, z) < 3.4) return [0x5e5a52, 0.85];                                  // pavé
        if (railD(x, z) < 3 || nearFosse(x, z, 32)) return [0x2e2b26, 0.8];             // coal dust round the pits and sidings
        const m = churn(z);
        if (m <= 0.05) return null;
        const n = fbm(noise, x * 0.03, z * 0.03, 2), hill = onHill(x, z);
        return [hill > 0.5 && n > 0.15 ? 0xa49e8c : n > 0.1 ? 0x5a4c3a : 0x665846, Math.min(0.9, m * (0.7 + n * 0.4))]; // (the chalk shows through on the hill)
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

  /** Two years of shelling: craters thickest over the hill, both trench systems in their wire, the cités and pits in ruins. */
  battlefield(game: any) {
    const nml = (z: number) => 1 - smoothstep(FRONT - 20, FRONT + 30, Math.abs(z));
    const dens = (x: number, z: number) => nml(z) * 2.6 + 0.5 * churn(z) + 0.08;
    const keep = (b: number[]) => heapD(b[0], b[1]) > 1.1 && roadD(b[0], b[1]) > b[2] * 0.5 + 3 && !nearFosse(b[0], b[1], 34) && Math.hypot(b[0], Math.abs(b[1]) - BASE_Z) > 50;
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)].filter(keep);
    const ruins = game.buildings.list.filter((b: any) => Math.abs(b.z) < 430 && mulberry32(b.index * 7 + SEED)() < (Math.abs(b.z) < 260 ? 0.85 : 0.45)).map((b: any) => b.index);
    const works: any[] = [];
    const clear = (w: any) => heapD(w.x, w.z) > 1.15 && !nearFosse(w.x, w.z, 30) && Math.hypot(w.x - QUARRY[0], w.z - QUARRY[1]) > QUARRY[2] * 0.8;
    for (const f of ['nato', 'pact'] as const) {
      for (const [z0, wireAt, belts, gap, seed] of [[FRONT, 22, 2, 60, 31], [215, 16, 1, 50, 57]]) {
        const r = mulberry32(f === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
        for (let x = -480; x <= 480; x += 60) pts.push([x, z0 + (r() - 0.5) * 24 + 14 * Math.sin(x * 0.009 + ph)]);
        const line = f === 'nato' ? pts : pts.map(([x, z]) => [-x, -z]);
        works.push(...trenchLine(line, f, { wireAt, belts, gapEvery: gap }).filter(clear));
      }
    }
    const paint = (terrain: any) => {   // the chalk thrown up on the parapets over the hill
      const r = mulberry32(SEED + 9);
      for (const w of works) {
        if (w.kind !== 'trench' || r() < 0.3) continue;
        terrain.dig(w.x, w.z, 7, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - w.x, pz - w.z) / 7), (0.35 + r() * 0.3) * (0.4 + onHill(w.x, w.z)), CHALK);
      }
      terrain.dig(QUARRY[0], QUARRY[1], QUARRY[2], 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - QUARRY[0], pz - QUARRY[1]) / QUARRY[2]), 0.9, CHALK);
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const busy = (x: number, z: number, road = 9) => roadD(x, z) < road || heapD(x, z) < 1.25 || nearFosse(x, z, 36) || railD(x, z) < 8
      || Math.abs(x) > bounds.x - 20 || Math.abs(z) > bounds.z - 20;

    // the cités: rows of corons on a grid round the point (Lens bigger, round its church)
    const cite = (id: string, rows: number, len: number, yaw: number) => {
      const [px, pz] = at(id), c = Math.cos(yaw), s = Math.sin(yaw);
      let n = 0;
      for (let i = 0; i < rows; i++) for (const side of [-1, 1]) for (const col of [1, 2]) {
        const u = side * (8 + len / 2 + (col - 1) * (len + 9)), v = (i - (rows - 1) / 2) * 20;
        const x = px + u * c + v * s, z = pz - u * s + v * c;
        if (Math.hypot(x - px, z - pz) > 70 || Math.hypot(x - 88, z + 344) < 30 || busy(x, z) || busy(x + c * len / 2, z - s * len / 2) || busy(x - c * len / 2, z + s * len / 2)) continue;
        coron(props, x, z, yaw, len, SEED + id.charCodeAt(0) * 100 + n++);
      }
    };
    props.rand = mulberry32(SEED + 2);
    props.church({ x: 88, z: -344, yaw: Math.PI / 2 + 0.15 });                        // Saint-Léger, Lens (the corons keep clear of it)
    cite('B', 5, 24, 0.25); cite('C', 5, 26, -0.1); cite('D', 5, 24, 0.5);
    cite('G', 4, 24, 0.6); cite('H', 5, 26, -0.3); cite('J', 5, 24, 0.9); cite('I', 6, 26, 0.15);
    for (const id of ['A', 'K']) { const [x, z] = at(id); buildVillage(props, { x, z }, SEED * 10 + x * 3 + z, 1); }

    // the pits: headframe over the shaft, winding house and its chimney behind, the screening shed, wagons on the sidings
    for (const [i, f] of FOSSES.entries()) {
      props.rand = mulberry32(SEED + 50 + i);
      const L = (lx: number, lz: number) => PropBuilder.local(f.x, f.z, f.yaw, lx, lz);
      props.headframe({ x: f.x, z: f.z, yaw: f.yaw, height: 30 + i * 2 });
      if (i === 0) { const [x, z] = L(11, 0); props.headframe({ x, z, yaw: f.yaw, height: 30 }); }  // Tower Bridge: two side by side
      const [wx, wz] = L(0, -19); props.hall({ x: wx, z: wz, yaw: f.yaw, width: 14, depth: 10, height: 8, color: 0x7e4a38, name: 'winding house' });
      const [cx, cz] = L(13, -18); props.chimney({ x: cx, z: cz, height: 28 });
      const [sx, sz] = L(-16, 2); props.hall({ x: sx, z: sz, yaw: f.yaw + Math.PI / 2, width: 18, depth: 11, height: 9, color: 0x6e4434, name: 'screening shed' });
      const [x0, z0, x1, z1] = f.rail;
      props.rails({ x0, z0, x1, z1 });
      props.rails({ x0: x0 + (z1 === z0 ? 12 : 4.5), z0: z0 + (z1 === z0 ? 4.5 : -12), x1: x1 + (z1 === z0 ? -12 : 4.5), z1: z1 + (z1 === z0 ? 4.5 : 12) }); // (a second siding)
      const len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0);
      for (let t = 25; t < len - 20; t += 24) {
        if (props.rand() < 0.35) continue;
        props.wagon({ x: x0 + (x1 - x0) * t / len, z: z0 + (z1 - z0) * t / len, yaw, color: props.rand() < 0.5 ? 0x4a3a30 : 0x5a3426, kind: props.rand() < 0.6 ? 'box' : 'open' });
      }
    }
    commandPost(props, this.bases.nato, -1, 0x6a6a52);
    commandPost(props, this.bases.pact, 1, 0x5e624a);
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      { test: (x: number, z: number) => roadD(x, z) < 6 || heapD(x, z) < 1.1 || nearFosse(x, z, 30) || railD(x, z) < 5 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 900, forest: (x: number, z: number) => copse(x, z) * (churn(z) > 0.5 ? 0.5 : 1) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid: [...avoid, { test: (x: number, z: number) => churn(z) > 0.2 }], count: 600, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [...avoid, { test: (x: number, z: number) => Math.random() < churn(z) * 0.85 }], density: 2.4, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); hedges.update(dt, t); },
    };
  },
} satisfies MapDef;
