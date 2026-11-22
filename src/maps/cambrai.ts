// Cambrai, 20 November 1917: the first mass tank attack. Without a preliminary bombardment, in the dawn mist, 476
// British tanks — each with a great fascine of brushwood chained on its roof to drop into the trench — rolled over
// the Hindenburg Line on firm, unshelled chalk downland: fire trenches dug far too wide for a tank to straddle, wire
// belts fifty yards deep. On Flesquières ridge in the centre the German field guns knocked tank after tank out as
// they came over the crest; on the right the tanks reached the St Quentin Canal, where the bridge at Masnières broke
// under one of them; on the left Bourlon Wood on its hill held out and became the battle. On the map: Flesquières
// on its ridge across the middle, Havrincourt over the dry cut of the unfinished Canal du Nord on the west flank, the
// St Quentin Canal down the east flank with Masnières on its far bank and a bridge in each half, Bourlon Wood on its
// hill behind the German line, Havrincourt Wood behind the British, and a Hindenburg-style system for each side —
// a wide fire trench with three belts of wire, a support line behind it — across open, still green country.
// Not mirrored but fair: both canals run the whole length of the map, so each side has the same water and the same
// three crossings of each (one in its own half, one in the middle, one in the other's). Bourlon's hill and wood
// for the Germans are answered by Welsh Ridge (a hill of the same height and spread) and Havrincourt and Dessart
// Woods (the same wooded area) for the British; the trench systems are at the same depth from each base; each side
// has a village on the canal's far bank as near as the other's. The structure follows maps/westernFront.ts.
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { createRiver } from '../world/River.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { buildSite, buildVillage, trenchLine, shellField } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SEED = 191711;
const BOUNDS = { x: 500, z: 560 };
const BASE_Z = 500;
const ENTRIES = [-300, 0, 390];          // (the east entry on the canal's far bank: both sides reach their own village there)
const MUD = new THREE.Color(0x6a604c);   // chalk and clay thrown up from the trenches
const noise = createNoise2D(SEED);

/** The St Quentin Canal down the east flank (its x at z), each half its own bends. */
const stq = (z: number) => 292 + 12 * Math.sin(z * 0.006 + 0.7) + 5 * Math.sin(z * 0.017);
const HW = 9;
const COURSE: number[][] = [];
for (let z = 680; z >= -680; z -= 20) COURSE.push([stq(z), z]);
const BRIDGES_Z = [215, 5, -215];
const river = createRiver({
  paths: [COURSE], halfWidth: HW, level: 0, depth: 2.6, valley: 34,
  crossings: [
    { name: 'Banteux bridge', x: stq(BRIDGES_Z[0]), z: BRIDGES_Z[0], kind: 'bridge', width: 7, channel: 0 },
    { name: 'Masnières bridge', x: stq(BRIDGES_Z[1]), z: BRIDGES_Z[1], kind: 'bridge', width: 7, channel: 0 },
    { name: 'Marcoing bridge', x: stq(BRIDGES_Z[2]), z: BRIDGES_Z[2], kind: 'bridge', width: 7, channel: 0 },
  ],
});
const wet = (x: number, z: number, r = 0) => Math.abs(x - stq(z)) < HW + 6 + r;

/** The Canal du Nord down the west flank: dug but never filled in 1914, a dry cut with spoil banks; a causeway over it in each half and in the middle. */
const cdn = (z: number) => -440 + 7 * Math.sin(z * 0.008 + 2);
const CAUSEWAYS = [265, 20, -265];
const cut = (x: number, z: number) => {
  const d = Math.abs(x - cdn(z));
  const fill = Math.max(...CAUSEWAYS.map((cz) => smoothstep(16, 8, Math.abs(z - cz))));
  return { depth: 4.5 * smoothstep(15, 7, d) * (1 - fill), spoil: 1.6 * smoothstep(13, 18, d) * smoothstep(30, 20, d) * (1 - fill) };
};

const P = (id: string, name: string, x: number, z: number, sector: 'west' | 'centre' | 'east', o: any = {}): ControlPointDef => ({ id, name, x, z, owner: id === 'A' ? 'nato' : id === 'K' ? 'pact' : null, sector, ...o });
const POINTS = [
  P('A', 'Metz-en-Couture', 0, 470, 'centre'),
  P('B', 'Hermies', -350, 310, 'west'),
  P('C', 'Trescault', -90, 370, 'centre'),
  P('D', 'Bantouzelle', 395, 300, 'east'),
  P('E', 'Havrincourt', -290, 40, 'west', { radius: 26 }),
  P('F', 'Flesquières', 10, -10, 'centre', { radius: 30 }),
  P('G', 'Masnières', 390, -5, 'east', { radius: 26 }),
  P('H', 'Bourlon Wood', -280, -310, 'west', { radius: 28 }),
  P('I', 'Fontaine-Notre-Dame', 40, -375, 'centre'),
  P('J', 'Rumilly', 395, -290, 'east'),
  P('K', 'Cambrai road', 0, -470, 'centre'),
];

// Bourlon's hill for the Germans answered by Welsh Ridge for the British (same height and spread); Flesquières ridge across the middle
const HILLS = [[-280, -315, 170, 12], [195, 285, 170, 12], [-120, 230, 140, 3], [110, -220, 140, 3], [-330, 120, 120, 2.5], [200, -90, 120, 2.5]];
// Havrincourt and Dessart Woods for the British, Bourlon Wood and Nine Wood (by Noyelles) for the Germans: the same wooded area
const WOODS = [[-200, 410, 100], [120, 455, 55], [-280, -315, 85], [190, -260, 75]];
const ridgeZ = (x: number) => 18 * Math.sin(x * 0.006 + 1);
const FRONT = 120;
// the Hindenburg system on each side: the wide fire trench with three belts of deep wire, the support line behind it
const LINES = [{ z: FRONT, wireAt: 26, belts: 3, gapEvery: 80, seed: 17, zig: 2 }, { z: 235, wireAt: 20, belts: 2, gapEvery: 70, seed: 53, zig: 1.5 }];
const CRATERS = 0.45;   // (the ground unshelled: the attack went in without a bombardment)

const wn = (x: number, z: number) => fbm(noise, x * 0.006 + 40, z * 0.006 - 12, 3);
const T_WOOD = 0.62;    // (the downland mostly open: only the named woods and a few copses)
const copse = (x: number, z: number) => {
  let k = smoothstep(T_WOOD, T_WOOD + 0.15, wn(x, z));
  for (const [wx, wz, r] of WOODS) k = Math.max(k, smoothstep(r, r * 0.6, Math.hypot(x - wx, z - wz)));
  return k;
};
const churn = (z: number) => {
  const a = Math.abs(z);
  let k = 1 - smoothstep(FRONT + 10, FRONT + 60, a);
  for (const l of LINES) if (l.z > FRONT + 30) k = Math.max(k, 0.45 * (1 - smoothstep(20, 60, Math.abs(a - l.z))));
  return k;
};

function height(x: number, z: number) {
  let h = 3 + fbm(noise, x * 0.0022, z * 0.0022, 3) * 4 + fbm(noise, x * 0.02 + 7, z * 0.02, 3) * 0.35;   // the rolling chalk downs
  for (const [hx, hz, r, hh] of HILLS) h += hh * smoothstep(r, 0, Math.hypot(x - hx, z - hz)) ** 1.5;
  h += (1 - smoothstep(0, 150, Math.abs(z - ridgeZ(x)))) * 7 * (1 - smoothstep(200, 300, x));               // Flesquières ridge (down to the canal valley)
  h += smoothstep(390 + 50 * Math.sin(x * 0.007 + 1), 560, Math.abs(z)) * 8;
  h += smoothstep(460 + 30 * Math.sin(z * Math.PI / 280), 640, x) * 18 + smoothstep(470 + 30 * Math.sin(z * Math.PI / 280 + Math.PI), 640, -x) * 18;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 26;
  for (const p of POINTS) if (p.id !== 'F' && p.id !== 'H') h += (3 + fbm(noise, p.x * 0.01, p.z * 0.01, 2) * 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.5;
  for (const bz of [BASE_Z, -BASE_Z]) h += (4 - h) * smoothstep(30, 16, Math.hypot(x, z - bz));
  const c = cut(x, z);
  h += c.spoil - c.depth;
  return river.carve(x, z, Math.max(1.4, h));
}

/** A trench line across the map at z, its owner facing the other way: its own wander on each side. */
const line = (z: number, faction: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(faction === 'nato' ? seed : seed * 31 + 7), pts: number[][] = [], ph = r() * 6;
  for (let x = -480; x <= 480; x += 60) pts.push([x, z + (r() - 0.5) * 24 + 14 * Math.sin(x * 0.009 + ph)]);
  return faction === 'nato' ? pts : pts.map(([x, zz]) => [-x, -zz]);
};
const trenchBand = (z: number) => LINES.some((l) => Math.abs(Math.abs(z) - l.z) < (l.z <= FRONT ? 45 : 30));
const offLimits = (x: number, z: number, r = 0) => wet(x, z, r) || Math.abs(x - cdn(z)) < 20 + r;
const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'cambrai',
  name: 'Cambrai',
  description: '20 November 1917: the first mass tank attack — British tanks carrying fascines roll over the Hindenburg Line’s wide trenches and deep wire on firm, unshelled chalk downs. Flesquières on its ridge, Bourlon Wood on its hill, the St Quentin Canal and Masnières bridge, the dry Canal du Nord.',
  epochs: ['1918'],
  region: 'europe',
  armies: { nato: ['uk'], pact: ['de'] }, // (Byng’s Third Army and the Tank Corps against the German Second Army)
  conditions: { time: 'dawn', weather: 'fog' }, // (zero hour 6:20 in the morning mist)
  size: 1600, segments: 640, bounds: BOUNDS, seed: SEED, height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  fields: createFields({ seed: SEED, cell: 84, weights: [0.35, 0.2, 0.15, 0.3] as any }),
  theme: { // a grey, still November morning, the mist lifting off the downs
    fogColor: 0xa6a8a4, fogDensity: 0.0019, skyTop: 0x6c7278, skyHorizon: 0xb4b4ac, skyBottom: 0x6a6a64,
    sunColor: 0xe0d6c4, sunIntensity: 1.35, sunDisk: 0.08, clouds: 0.85, cloudLight: 0xc0c2be, cloudDark: 0x6c7276,
    sunDir: [0.5, 0.35, -0.7], hemiSky: 0xbcc2c6, hemiGround: 0x4c4838, hemiIntensity: 1.3, rimColor: 0xbcc4cc, rimIntensity: 0.25,
    terrain: {
      grass: '#58623c', grassAlt: '#4e5a36', dryGrass: '#8a7e56', dirt: '#6a5e4a', rock: '#a8a496', strip: '#5a4e3c',
      pasture: '#56623a', ploughed: '#8a8270', stubble: '#9a8c5e', meadow: '#5e6a3e',   // (white chalk in the furrows)
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90], farmZ: [BOUNDS.z - 10, BOUNDS.z + 90], roads: ENTRIES, roadZ: BOUNDS.z - 20,
      surface(x: number, z: number, y: number) {
        if (y < 1.6 && wet(x, z, 4)) return [0x8a8470, 0.85];                 // the towpaths
        if (cut(x, z).depth > 0.5) return [0xb8b2a0, 0.8];                     // the chalk walls of the dry cut
        if (cut(x, z).spoil > 0.4) return [0x9c9682, 0.6];                     // its spoil banks
        return null;
      },
    },
  },
  bases: { nato: { x: 0, z: BASE_Z, entries: ENTRIES }, pact: { x: 0, z: -BASE_Z, entries: ENTRIES } },
  airfields: [{ faction: 'nato', x: -195, z: 385, yaw: Math.PI / 2 }, { faction: 'pact', x: 140, z: -425, yaw: -Math.PI / 2 }], // (each behind its own line)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points: POINTS,
  spawns: {
    nato: layout.map((s) => ({ ...s, facing: Math.PI })),
    pact: layout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '1. Gruppe' })),
  },

  /** The Hindenburg system on each side, a few shell holes, the chalk thrown up along the lines. */
  battlefield(game: any) {
    const nml = (z: number) => 1 - smoothstep(FRONT - 20, FRONT + 30, z);
    const dens = (x: number, z: number) => (offLimits(x, z, 4) ? 0 : nml(z) * CRATERS + 0.05);
    const blasts = [...shellField(SEED, BOUNDS, dens).filter((b) => b[1] >= 0), ...shellField(SEED + 1, BOUNDS, dens).filter((b) => b[1] < 0)]
      .filter((b) => !offLimits(b[0], b[1], 6));
    const ruins = game.buildings.list.filter((b: any) => Math.abs(b.z) < 280 && mulberry32(b.index * 7 + SEED)() < (Math.abs(b.z) < FRONT ? 0.3 : 0.1)).map((b: any) => b.index);
    const works: any[] = [];
    for (const f of ['nato', 'pact'] as const) {
      for (const l of LINES) works.push(...trenchLine(line(l.z, f, l.seed), f, { wireAt: l.wireAt, belts: l.belts, gapEvery: l.gapEvery, zig: l.zig }).filter((w: any) => !offLimits(w.x, w.z, 2)));
    }
    const paint = (terrain: any) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
        const k = churn(z) * (0.75 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5) * 0.3;
        if (k > 0.05 && !offLimits(x, z, 4)) terrain.dig(x, z, 14, 0, (px: number, pz: number) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.9, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }: any) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x: number, z: number, r: number) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    for (const p of POINTS) {
      if (p.id === 'H') continue;   // (the wood: no village)
      buildVillage(props, p, SEED * 10 + Math.round(p.x * 3 + p.z * 7), 1);
    }
    // Flesquières and Havrincourt (the château) the larger villages; Bourlon village at the foot of its wood
    for (const [dx, dz] of [[44, 18], [-30, -36], [-250, 70], [-200, -250]]) buildVillage(props, { x: dx, z: dz }, SEED * 10 + 1 + dx * 3 + dz, 1);
    props.rand = mulberry32(SEED * 7919);
    props.church({ x: -6, z: 22, yaw: 0 });
    props.church({ x: -268, z: 12, yaw: 0.3 });

    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 60 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30);
      const z = (sites.length % 2 ? -1 : 1) * (FRONT + 40 + rand() * (bounds.z - FRONT - 100));   // (each half its own)
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;
      if (Math.hypot(x, Math.abs(z) - BASE_Z) < 50 || nearPoint(x, z, 50) || copse(x, z) > 0.3 || trenchBand(z) || offLimits(x, z, 10)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) buildSite(props, s, s.x, s.z, s.yaw);
    // the tanks’ fascines waiting behind the British line, the German field-gun ammunition behind theirs
    props.rand = mulberry32(SEED + 3);
    for (const fx of [-230, -60, 120]) props.logPile({ x: fx, z: 300 + props.rand() * 20, yaw: props.rand() * 0.4, length: 4 });
    for (const fx of [-120, 60, 200]) props.crates({ x: fx, z: -300 - props.rand() * 20, yaw: props.rand() * 3 });
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xcfc8b0], [this.bases.pact, 1, 0xb8b4a0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 9, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();
    river.build(scene, terrain);

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 })),
      ...river.crossings.map((c: any) => ({ x: c.x, z: c.z, r: HW + 14 })), { test: (x: number, z: number) => offLimits(x, z, 1) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 2200, forest: (x: number, z: number) => (offLimits(x, z, 2) ? 0 : copse(x, z) * 0.9 * (trenchBand(z) ? 0.2 : 1)) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1400, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [...avoid, { test: (x: number, z: number) => Math.random() < churn(z) * 0.3 }], density: 2.6, fields: this.fields });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { ground.update(dt, t); trees.update(dt, t); hedges.update(dt, t); },
    };
  },
} satisfies MapDef;
