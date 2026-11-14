// Villers-Bretonneux, Picardy, April 1918: the last ridge before Amiens. The German spring offensive
// ran out of breath here; on 24 April they took the town with tanks — the first tank-against-tank
// fight in history, A7Vs against British Mark IVs at Cachy — and that night the Australians took it
// back. Two trench systems face each other across a crater field: a front line with two belts of wire
// and a support line behind it on each side, the town on its low ridge in no man's land between them,
// shot to ruins, Hangard Wood and Monument Wood shredded to stumps. Behind the lines the chalk downs
// are still green. Point-mirrored like every map. 1918 only (`epochs`).
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
const FRONT = 150;    // the front-line trenches (each side's, z = ±FRONT): no man's land is the 300 m between
const SUPPORT = 255;  // the support line behind
const noise = createNoise2D(1918);
const MUD = new THREE.Color(0x4f4234);   // churned chalk and clay: no man's land
/** How churned the ground is (0..1): no man's land and the lines' edges, a little round the support line. */
const churn = (z: number) => { const a = Math.abs(z); return Math.max(1 - smoothstep(FRONT + 10, FRONT + 60, a), 0.45 * (1 - smoothstep(20, 60, Math.abs(a - SUPPORT)))); };

/** Woods (0..1): Hangard Wood, Monument Wood, the Bois d'Aquenne — the same on both halves. */
const copse = (x, z) => {
  const [ax, az] = z < 0 || (z === 0 && x < 0) ? [-x, -z] : [x, z];
  return smoothstep(0.42, 0.62, fbm(noise, ax * 0.006 + 40, az * 0.006 - 12, 3));
};

function height(x, z) {
  const [ax, az] = z < 0 ? [-x, -z] : [x, z];
  let h = fbm(noise, ax * 0.0022, az * 0.0022, 3) * 3 + fbm(noise, ax * 0.02 + 7, az * 0.02, 3) * 0.35;
  h += (1 - smoothstep(0, 140, Math.abs(z))) * 4.5;                               // the Villers-Bretonneux ridge, across the middle
  h += smoothstep(390, 560, Math.abs(z)) * 8;                                     // the downs behind each side
  h += smoothstep(BOUNDS.x - 30, BOUNDS.x + 160, Math.abs(x)) * 30;
  h += smoothstep(BOUNDS.z - 10, BOUNDS.z + 160, Math.abs(z)) * 26;
  for (const p of POINTS) h += (2 + fbm(noise, p.x * 0.01, p.z * 0.01, 2) * 2 - h) * smoothstep(45, 25, Math.hypot(x - p.x, z - p.z)) * 0.6;
  return h;
}

const POINTS: ControlPointDef[] = [
  { id: 'A', name: 'Bois l\'Abbé', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Cachy', x: -300, z: 320, owner: null, sector: 'west' },
  { id: 'C', name: 'Bois d\'Aquenne', x: 0, z: 330, owner: null, sector: 'centre' },
  { id: 'D', name: 'Fouilloy', x: 300, z: 320, owner: null, sector: 'east' },
  { id: 'E', name: 'Hangard Wood', x: -330, z: 30, owner: null, sector: 'west', radius: 24 },
  { id: 'F', name: 'Villers-Bretonneux', x: 0, z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Monument Wood', x: 330, z: -30, owner: null, sector: 'east', radius: 24 },
  { id: 'H', name: 'Hangard', x: -300, z: -320, owner: null, sector: 'west' },
  { id: 'I', name: 'Marcelcave', x: 0, z: -330, owner: null, sector: 'centre' },
  { id: 'J', name: 'Warfusée', x: 300, z: -320, owner: null, sector: 'east' },
  { id: 'K', name: 'Lamotte', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];

/** A trench line across the map at z, its owner facing the other way: a gentle wander, never straight. */
const line = (z: number, faction: 'nato' | 'pact', seed: number) => {
  const r = mulberry32(seed), pts: number[][] = [];
  for (let x = -480; x <= 480; x += 60) pts.push([x, z + (r() - 0.5) * 24]);
  return faction === 'nato' ? pts : pts.map(([x, zz]) => [-x, -zz]);      // (walked +x the line faces −z, the Allies' way; the mirror faces +z)
};

const layout = [{ unit: 'rifles', x: 0, z: BASE_Z - 24, name: '1st Section' }];

export default {
  id: 'villers-bretonneux',
  name: 'Villers-Bretonneux',
  description: 'April 1918, the last ridge before Amiens: two trench systems face each other across a crater field, the ruined town between them. Wire in front of every line, woods shot to stumps — and the first tank-against-tank fight in history.',
  epochs: ['1918'],
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  seed: 1918,
  height,
  fields: createFields({ seed: 1918, cell: 84, weights: [0.3, 0.3, 0.1, 0.3] }), // spring: young wheat, pasture, ploughland on chalk

  theme: {
    // a grey April morning over Picardy
    fogColor: 0x9ea2a0,
    fogDensity: 0.0016,
    skyTop: 0x6e767e,
    skyHorizon: 0xb8b8b0,
    skyBottom: 0x6a6a64,
    sunColor: 0xe4dccc,
    sunIntensity: 1.5,
    sunDisk: 0.1,
    clouds: 0.8,
    cloudLight: 0xc4c6c2,
    cloudDark: 0x70767c,
    sunDir: [-0.4, 0.5, -0.75],
    hemiSky: 0xc0c6cc,
    hemiGround: 0x4c4636,
    hemiIntensity: 1.25,
    rimColor: 0xbcc4cc,
    rimIntensity: 0.25,
    terrain: {
      grass: '#5a623c',
      grassAlt: '#4e5836',
      dryGrass: '#7e7650',
      dirt: '#5a4c3e',
      rock: '#8a8678',
      strip: '#4c3f30',
      pasture: '#58633c',
      ploughed: '#7a7262',  // (the chalk shows through the furrows)
      stubble: '#8a7e56',
      meadow: '#646c40',
      farmX: [BOUNDS.x - 20, BOUNDS.x + 90],
      farmZ: [BOUNDS.z - 10, BOUNDS.z + 90],
      roads: [-300, 0, 300],
      roadZ: BOUNDS.z - 20,
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

  /** The fought-over field (core/GameEngine.js): the crater field, the ruins, both sides' trenches and wire. */
  battlefield(game) {
    const nml = (z: number) => 1 - smoothstep(FRONT - 20, FRONT + 30, z);            // no man's land (and its edges)
    const blasts = shellField(1918, BOUNDS, (x, z) => nml(z) * 3.2 + (z > FRONT ? 0.7 * (1 - smoothstep(30, 140, Math.abs(z - (FRONT + SUPPORT) / 2))) : 0) + 0.08); // (per 1000 m²: thick between the wire, thinner over the lines, a few in the rear)
    const ruins = game.buildings.list.filter((b) => Math.abs(b.z) < SUPPORT + 40 && mulberry32(b.index * 7 + 1918)() < (Math.abs(b.z) < FRONT ? 0.85 : 0.4)).map((b) => b.index);
    const works = [];
    for (const f of ['nato', 'pact'] as const) {
      works.push(...trenchLine(line(FRONT, f, 11), f, { wireAt: 26, belts: 2 }));
      works.push(...trenchLine(line(SUPPORT, f, 23), f, { wireAt: 18, belts: 1, gapEvery: 60 }));
    }
    // the mud: the ground between the lines turned over and over (a patchy wash, so the fields still show through at the edges)
    const paint = (terrain) => {
      for (let z = -BOUNDS.z; z <= BOUNDS.z; z += 16) for (let x = -BOUNDS.x; x <= BOUNDS.x; x += 16) {
        const k = churn(z) * (0.75 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.5);
        if (k > 0.05) terrain.dig(x, z, 14, 0, (px, pz) => Math.max(0, 1 - Math.hypot(px - x, pz - z) / 14), Math.min(1, k) * 0.9, MUD);
      }
    };
    return { blasts, ruins, works, paint };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const nearPoint = (x, z, r) => POINTS.some((p) => Math.hypot(p.x - x, p.z - z) < r);
    const trenchBand = (z) => Math.abs(Math.abs(z) - FRONT) < 45 || Math.abs(Math.abs(z) - SUPPORT) < 30;

    // the villages at the points; Villers-Bretonneux a small town of brick houses round its church
    for (const p of POINTS) {
      if (p.z < 0 || (p.z === 0 && p.x > 0)) continue;   // the mirror builds the other half
      const seed = 19180 + Math.round(p.x * 3 + p.z);
      buildVillage(props, p, seed, 1);
      if (p.x !== 0 || p.z !== 0) buildVillage(props, { x: -p.x, z: -p.z }, seed, -1);
    }
    for (const [dx, dz] of [[48, 10], [-20, 46]]) { // the town's other quarters (and their mirrors)
      buildVillage(props, { x: dx, z: dz }, 19181 + dx, 1);
      buildVillage(props, { x: -dx, z: -dz }, 19181 + dx, -1);
    }
    props.rand = mulberry32(24041918);
    props.church({ x: 6, z: -26, yaw: 0 });

    // farms, field walls and haystacks behind the lines — none in the trench bands or no man's land
    const kinds = ['farm', 'fieldwall', 'hay', 'fieldwall', 'rocks'];
    const sites: any[] = [];
    for (let tries = 0; sites.length < 30 && tries < 6000; tries++) {
      const x = (rand() * 2 - 1) * (bounds.x - 30);
      const z = FRONT + 40 + rand() * (bounds.z - FRONT - 100);
      if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 60 * 60)) continue;
      if (Math.hypot(x, z - BASE_Z) < 50 || nearPoint(x, z, 50) || copse(x, z) > 0.3 || trenchBand(z)) continue;
      sites.push({ x, z, kind: kinds[sites.length % kinds.length], yaw: rand() * Math.PI, seed: Math.floor(rand() * 1e9) });
    }
    for (const s of sites) {
      buildSite(props, s, s.x, s.z, s.yaw);
      buildSite(props, s, -s.x, -s.z, s.yaw + Math.PI);
    }

    // each side's rear behind its base: tents and stores
    for (const [base, toward, canvas] of [[this.bases.nato, -1, 0xcfc8b0], [this.bases.pact, 1, 0xb8b4a0]] as const) {
      props.tent({ x: base.x - 6, z: base.z - toward * 4, yaw: 0.2, color: canvas });
      props.tent({ x: base.x + 6, z: base.z - toward * 6, yaw: -0.15, color: canvas });
      props.tent({ x: base.x - 14, z: base.z - toward * 9, yaw: 0.1, color: canvas });
      props.crates({ x: base.x + 1, z: base.z + toward * 3, yaw: 0.4 });
    }
    props.finish();

    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...POINTS.map((p) => ({ x: p.x, z: p.z, r: 12 }))];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 1100, forest: (x, z) => copse(x, z) * 0.9 * (trenchBand(z) ? 0.2 : 1) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, avoid, count: 1600, lane: 0 });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid: [...avoid, { test: (x, z) => Math.random() < churn(z) * 0.9 }], density: 2.6, fields: this.fields }); // (hardly a blade of grass left in no man's land)

    return {
      buildings: props.buildings,
      update(dt, t) {
        ground.update(dt, t);
        trees.update(dt, t);
        hedges.update(dt, t);
      },
    };
  },
} satisfies MapDef;
