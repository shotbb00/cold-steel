// The Western Front maps of 1918 (Villers-Bretonneux, Le Hamel, St Quentin): one builder for a
// fought-over stretch of Picardy. Not mirrored but fair: each half is its own ground — its own noise, woods, hills,
// villages and trench wander — balanced like for like (the same wooded area on each half, the same depth to each
// line, a hill for one side answered by a hill or a wooded rise for the other). What each map sets:
//   lines     the trench lines each side holds (z from the middle, wire belts in front), or
//   redoubts  closed squares of trench ringed with wire round strongpoints (St Quentin's forward zone; z > 0 nato's)
//   hills     [x, z, r, h] rises (h < 0: a ravine) of the real ground, woodsAt [x, z, r] the named woods
//   front     where no man's land ends on each side (mud, craters, the woods shot to stumps)
//   craters   shell holes per 1000 m² in no man's land (a quiet sector has fewer)
//   ridge     the rise across the middle (m), woods (how much of the ground is wooded), town
//   theme     the sky and the ground's colours over the shared defaults (spring, grey)
// 1918 only (`epochs`).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, trenchLine, shellField } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const MUD = new THREE.Color(0x4f4234);   // churned chalk and clay

interface Line { z: number; wireAt: number; belts: number; gapEvery?: number; seed: number }
interface Front {
  armies?: { nato?: string[], pact?: string[] };
  id: string; name: string; description: string; seed: number; points: ControlPointDef[];
  lines?: Line[]; redoubts?: { x: number; z: number; size: number }[];
  front: number; craters: number; ridge: number; woods?: number;
  town?: { quarters: number[][]; church?: { x: number; z: number } };
  ruins?: [number, number]; fields?: number[]; theme?: Record<string, any>; terrain?: Record<string, any>;
  hills?: number[][]; woodsAt?: number[][];
}

const SKY = { // a grey spring morning over Picardy (each map may change it)
  fogColor: 0x9ea2a0, fogDensity: 0.0016, skyTop: 0x6e767e, skyHorizon: 0xb8b8b0, skyBottom: 0x6a6a64,
  sunColor: 0xe4dccc, sunIntensity: 1.5, sunDisk: 0.1, clouds: 0.8, cloudLight: 0xc4c6c2, cloudDark: 0x70767c,
  sunDir: [-0.4, 0.5, -0.75], hemiSky: 0xc0c6cc, hemiGround: 0x4c4636, hemiIntensity: 1.25, rimColor: 0xbcc4cc, rimIntensity: 0.25,
};
const GROUND = {
  grass: '#5a623c', grassAlt: '#4e5836', dryGrass: '#7e7650', dirt: '#5a4c3e', rock: '#8a8678', strip: '#4c3f30',
  pasture: '#58633c', ploughed: '#7a7262', stubble: '#8a7e56', meadow: '#646c40',   // (the chalk shows through the furrows)
};

export function westernFront(o: Front) {
  const noise = createNoise2D(o.seed);
  const POINTS = o.points;
  const lines = o.lines ?? [];
  const deepest = Math.max(o.front, ...lines.map((l) => l.z), ...(o.redoubts ?? []).map((r) => Math.abs(r.z) + r.size));
  /** How churned the ground is (0..1): no man's land and the lines' edges, a little round each line behind. */
  const churn = (z: number) => {
    const a = Math.abs(z);
    let k = 1 - smoothstep(o.front + 10, o.front + 60, a);
    for (const l of lines) if (l.z > o.front + 30) k = Math.max(k, 0.45 * (1 - smoothstep(20, 60, Math.abs(a - l.z))));
    return k;
  };
  /** Woods (0..1): each half its own, the threshold set per half so both have the same wooded area; the named woods on top. */
  const wn = (x, z) => fbm(noise, x * 0.006 + 40, z * 0.006 - 12, 3);
  const t0 = 0.42 + (0.5 - (o.woods ?? 0.5)) * 0.4;
  const [vN, vP] = [1, -1].map((s) => {
    const v: number[] = [];
    for (let x = -480; x <= 480; x += 20) for (let z = 40; z <= 540; z += 20) v.push(wn(x, z * s));
    return v.sort((a, b) => b - a);
  });
  const share = vN.filter((v) => v > t0 + 0.1).length / vN.length;   // (nato's half keeps the wooded share it had; pact's is cut to match)
  const tHalf = [t0, vP[Math.min(vP.length - 1, Math.floor(vP.length * share))] - 0.1];
  const copse = (x, z) => {
    const t = tHalf[z >= 0 ? 0 : 1];
    let k = smoothstep(t, t + 0.2, wn(x, z));
    for (const [wx, wz, r] of o.woodsAt ?? []) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz)));
    return k;
  };
  const height = (x, z) => {
    let h = fbm(noise, x * 0.0022, z * 0.0022, 3) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.35;
    for (const [hx, hz, r, hh] of o.hills ?? []) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
    h += (1 - smoothstep(0, 140, Math.abs(z + 30 * Math.sin(x * 0.006 + o.seed)))) * o.ridge;   // (the rise wanders)
    h += smoothstep(390 + 50 * Math.sin(x * 0.007 + o.seed * 0.3), 560, Math.abs(z)) * 8;                 // (the edges rise unevenly)
    h += smoothstep(BOUNDS.x - 60 + 60 * Math.sin(z * Math.PI / 280 + (o.seed % 2) * Math.PI), BOUNDS.x + 160, Math.abs(x)) * 30;   // (one whole wave per half: as much high flank on each)
    h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 26;
    for (const p of POINTS) h += (2 + fbm(noise, p.x * 0.01, p.z * 0.01, 2) * 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
    return h;
  };
  /** A trench line across the map at z, its owner facing the other way: its own wander on each side (salients and re-entrants). */
  const line = (z: number, faction: 'nato' | 'pact', seed: number) => {
    const r = mulberry32(faction === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
    for (let x = -480; x <= 480; x += 60) pts.push([x, z + (r() - 0.5) * 24 + 14 * Math.sin(x * 0.009 + ph)]);
    return faction === 'nato' ? pts : pts.map(([x, zz]) => [-x, -zz]);
  };
  /** A redoubt: a closed square of trench round (x, z), walked so every side faces out, its wire ring. */
  const redoubt = (x: number, z: number, s: number) => [[x - s, z - s], [x + s, z - s], [x + s, z + s], [x - s, z + s], [x - s, z - s]];
  const trenchBand = (z) => lines.some((l) => Math.abs(Math.abs(z) - l.z) < (l.z <= o.front ? 45 : 30)) || Math.abs(Math.abs(z) - o.front) < 45;
  const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Section' }];

  return {
    id: o.id, name: o.name, description: o.description, armies: o.armies, // (the armies that fought there: maps/index.js armiesOn)
    epochs: ['1918'], size: 1600, segments: 640, bounds: BOUNDS, seed: o.seed, height,
    fields: createFields({ seed: o.seed, cell: 84, weights: (o.fields ?? [0.3, 0.3, 0.1, 0.3]) as any }),
    theme: { ...SKY, ...o.theme, terrain: { ...GROUND, ...o.terrain, farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: [-300, 0, 300], roadZ: BOUNDS.z - 20 } },
    bases: { nato: { x: 0, z: BASE_Z, entries: [-300, 0, 300] }, pact: { x: 0, z: -BASE_Z, entries: [-300, 0, 300] } },
    maxStacks: 26,
    cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
    points: POINTS,
    spawns: {
      nato: layout.map((s) => ({ ...s, facing: Math.PI })),
      pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
    },

    /** The fought-over field (core/GameEngine.js): craters, ruins, trenches and wire, the mud. */
    battlefield(game) {
      const F = o.front;
      const nml = (z: number) => 1 - smoothstep(F - 20, F + 30, z);
      const dens = (x, z) => nml(z) * o.craters + (z > F ? 0.22 * o.craters * (1 - smoothstep(30, 140, z - F - 50)) : 0) + 0.08;
      const blasts = [...shellField(o.seed, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(o.seed + 1, BOUNDS, dens).filter((b) => b[1] < 0)]; // (each half its own)
      const [near, far] = o.ruins ?? [0.85, 0.4];
      const ruins = game.buildings.list.filter((b) => Math.abs(b.z) < deepest + 40 && mulberry32(b.index * 7 + o.seed)() < (Math.abs(b.z) < F ? near : far)).map((b) => b.index);
      const works = [];
      for (const f of ['nato', 'pact'] as const) {
        for (const l of lines) works.push(...trenchLine(line(l.z, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: l.gapEvery ?? 90 }));
        for (const r of o.redoubts ?? []) if ((r.z > 0) === (f === 'nato')) works.push(...trenchLine(redoubt(r.x, r.z, r.size), f, { wireAt: 14, belts: 1, gapEvery: 40 }));
      }
      const paint = (terrain) => {
        for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
          const k = churn(z) * (0.75 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5) * Math.min(1, o.craters / 3);
          if (k > 0.05) terrain.dig(x, z, 14, 0, (px, pz) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.9, MUD);
        }
      };
      return { blasts, ruins, works, paint };
    },

    decorate({ scene, terrain, cover, rand, bounds }) {
      const props = new PropBuilder({ scene, terrain, cover });
      const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
      for (const p of POINTS) {
        if ((p as any).village === false) continue;   // (a redoubt: no village)
        buildVillage(props, p, o.seed * 10 + Math.round(p.x * 3 + p.z * 7), 1);
      }
      for (const [dx, dz] of o.town?.quarters ?? []) buildVillage(props, { x: dx, z: dz }, o.seed * 10 + 1 + dx * 3 + dz, 1);
      props.rand = mulberry32(o.seed * 7919);
      if (o.town?.church) props.church({ ...o.town.church, yaw: 0 });

      const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
      const sites: any[] = [];
      for (let tries = 0; sites.length < 60 && tries < 6000; tries++) {
        const x = (rand() * 2 - 1) * (bounds.x - 30);
        const z = (sites.length % 2 ? -1 : 1) * (o.front + 40 + rand() * (bounds.z - o.front - 100));   // (each half its own)
        if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;
        if (Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || copse(x, z) > 0.3 || trenchBand(z)) continue;
        sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
      }
      for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
      for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xcfc8b0], [this.bases.pact, 1, 0xb8b4a0]] as const) {
        props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
        props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
        props.tent({ x: base.x - 14, z: base.z - toward * 9, yaw: 0.1, color: canvas });
        props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
      }
      props.finish();

      const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 }))];
      const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1100 + 350 * (o.woodsAt?.length ?? 0), forest: (x, z) => copse(x, z) * 0.9 * (trenchBand(z) ? 0.2 : 1) });
      cover.finalize(bounds);
      const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1600, lane: 0 });
      const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [...avoid, { test: (x, z) => Math.random() < churn(z) * 0.9 * Math.min(1, o.craters / 3) }], density: 2.6, fields: this.fields }); // (hardly a blade of grass left in no man's land)
      return {
        buildings: props.buildings,
        update(dt, t) { ground.update(dt, t); trees.update(dt, t); hedges.update(dt, t); },
      };
    },
  } satisfies MapDef;
}
