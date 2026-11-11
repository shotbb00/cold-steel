// Omaha Beach, 6 June 1944 (1945 only; coastal: the sea and the land in one battle, 1.0 × 1.5 km). The
// Americans come in from the sea (+z), the Wehrmacht holds the land (-z). Out at sea the transport area
// and the destroyers' water; then the tidal flat — a long, gently shelving beach of hard sand that the
// tide covers and uncovers (world/Sea.js level) — up to the shingle bank and, in the Dog sector, a
// sea wall with the villas behind it. Behind the shingle a narrow shelf of marsh and dunes, then the
// bluffs, 35 m of steep grass and scrub that only men on foot climb. Three draws cut them — Vierville
// (D-1), St-Laurent (E-1), Colleville (F-1) — the only ways up for vehicles, each with its lane to a
// village on the plateau: Normandy's bocage, small fields boxed in by hedgerows, orchards, stone farms.
// Not point-mirrored: one side lands, the other holds (modes/landing, coastal step 3).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 750 };
const noise = createNoise2D(1944_06);
const sea = createSea({ level: 0, size: SIZE, color: 0x34525a }); // (the Channel: grey-green, never blue)

/** The shingle's line (z) along the beach: the high-water mark. */
export const shingleZ = (x: number) => 140 + fbm(noise, x * 0.004, 1.3, 2) * 14;
/** The foot and the top of the bluffs behind it. */
const footZ = (x: number) => shingleZ(x) - 55 - fbm(noise, x * 0.006, 4.1, 2) * 20;
const topZ = (x: number) => footZ(x) - 60 - fbm(noise, x * 0.005, 7.7, 2) * 18;
const PLATEAU = 36;
/** The draws: x of each, its half-width at the floor, the village up it. */
export const DRAWS = [
  { id: 'D-1', x: -330, w: 16, village: 'Vierville', vz: -200 },
  { id: 'E-1', x: 10, w: 20, village: 'St-Laurent', vz: -230 },
  { id: 'F-1', x: 330, w: 18, village: 'Colleville', vz: -190 },
];
/** Where a draw's floor climbs from the shelf to the plateau. */
const drawFloor = (x: number, z: number) => 2.6 + (PLATEAU - 2.6) * smoothstep(footZ(x) + 10, footZ(x) - 230, z);

function height(x: number, z: number) {
  const sz = shingleZ(x), fz = footZ(x), tz = topZ(x);
  let h: number;
  if (z > sz) { // the beach and the sea floor: hard sand shelving gently, a runnel and bar on it, then the bottom falling away
    const d = z - sz;
    h = 1.7 - d * 0.017 + Math.sin(d * 0.045 + x * 0.004) * 0.25 * smoothstep(40, 90, d) * smoothstep(260, 200, d);
    h = Math.min(h, 1.7 - d * 0.017 - Math.max(0, d - 230) * 0.025);
    h = Math.max(h, -16);
    h += smoothstep(10, 0, d) * 1.3;                                                  // the shingle bank's seaward face
  } else if (z > fz) { // the shingle, then the shelf: marsh and low dunes
    const d = sz - z;
    h = 3 - smoothstep(0, 10, d) * 0.5 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.6;
  } else { // the bluffs, then the plateau rolling gently inland
    const k = smoothstep(fz, tz, z);
    const plateau = PLATEAU + fbm(noise, x * 0.003, z * 0.003, 3) * 7 + Math.max(0, -z - 200) * 0.012;
    h = 2.6 + (plateau - 2.6) * k * k * (1.6 - 0.6 * k) + fbm(noise, x * 0.02, z * 0.02, 2) * 1.5 * k * (1 - k) * 4;
  }
  // the draws: valleys through the bluffs, their floors climbing to the plateau
  for (const d of DRAWS) {
    const dx = Math.abs(x - d.x + Math.sin(z * 0.012) * 12);
    if (z > sz || dx > d.w + 90) continue;
    const floor = drawFloor(x, z);
    if (floor < h) h = Math.min(h, floor + Math.max(0, dx - d.w) ** 1.25 * 0.55);
  }
  // the ends: the bluffs come down to the sea (Pointe de la Percée in the west, the cliffs past Colleville)
  const end = smoothstep(440, 560, Math.abs(x));
  if (end > 0 && z > fz - 20) h = Math.max(h, (h + (PLATEAU * 0.9 - h) * end) * smoothstep(sz + 120, sz - 40, z) + h * (1 - smoothstep(sz + 120, sz - 40, z)));
  return h;
}

/**
 * The beach obstacles on the tidal flat (systems/Landing.js), three belts between the high- and the low-water
 * mark: ramped stakes nearest the shingle, hedgehogs, Belgian gates furthest out — many with a Teller mine on top.
 */
export const OBSTACLES = (() => {
  const r = mulberry32(1944_2), out: { x: number, z: number, kind: string, mine: boolean }[] = [];
  [['stake', 48, 0.6, 7], ['hedgehog', 68, 0.2, 8], ['gate', 92, 0.4, 11]].forEach(([kind, d, mined, step]) => {
    for (let x = -485; x < 485; x += (step as number) + r() * 4) {
      if (r() < 0.12) continue; // (a gap: some were never set, some knocked down by the sea)
      out.push({ x: x + (r() - 0.5) * 2, z: shingleZ(x) + (d as number) + (r() - 0.5) * 8, kind: kind as string, mine: r() < (mined as number) });
    }
  });
  return out;
})();

/** On a lane: the draw roads up to the villages, the coast road along the plateau, the road inland to the German rear. */
function onRoad(x: number, z: number) {
  for (const d of DRAWS) if (z < shingleZ(x) - 10 && z > d.vz && Math.abs(x - d.x + Math.sin(z * 0.012) * 12) < 3.5) return true;
  if (z < topZ(x) - 30 && Math.abs(z - (-210 + Math.sin(x * 0.006) * 25)) < 3.5) return true;  // the coast road through the villages
  if (z < -220 && Math.abs(x - (Math.sin(z * 0.01) * 30)) < 3.5) return true;                    // to Formigny
  return false;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 620, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the village up its draw once taken)
  { id: 'B', name: 'Dog Green', x: -330, z: shingleZ(-330) + 22, owner: null, sector: 'west', radius: 40, opens: 'E' },
  { id: 'C', name: 'Easy Red', x: 10, z: shingleZ(10) + 22, owner: null, sector: 'centre', radius: 40, opens: 'F' },
  { id: 'D', name: 'Fox Green', x: 330, z: shingleZ(330) + 22, owner: null, sector: 'east', radius: 40, opens: 'G' },
  { id: 'E', name: 'Vierville', x: -330, z: -205, owner: null, sector: 'west' },
  { id: 'F', name: 'St-Laurent', x: 10, z: -235, owner: null, sector: 'centre' },
  { id: 'G', name: 'Colleville', x: 330, z: -195, owner: null, sector: 'east' },
  { id: 'K', name: 'Formigny', x: 0, z: -620, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'omaha',
  name: 'Omaha Beach',
  description: 'Normandy, 6 June 1944: the tidal flat under the bluffs, three draws the only ways up, the bocage behind. The Americans land from the sea, the Wehrmacht holds the heights.',
  epochs: ['1945'],
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Germany' },
  conditions: { time: 'day', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1944,
  height,
  river: sea,
  fields: createFields({ seed: 1944, cell: 64, weights: [0.45, 0.1, 0.25, 0.2] }),

  theme: {
    // a grey June morning, the cloud low, the light flat
    fogColor: 0xa9b0b0, fogDensity: 0.0006,
    skyTop: 0x7c8890, skyHorizon: 0xc2c6c2, skyBottom: 0x80888a,
    sunColor: 0xeee6d4, sunIntensity: 1.5, sunDisk: 0.15,
    clouds: 0.8, cloudLight: 0xd8dad6, cloudDark: 0x8a9094,
    sunDir: [0.3, 0.55, 0.75],
    hemiSky: 0xc8d0d4, hemiGround: 0x4e5038, hemiIntensity: 1.3,
    rimColor: 0xc8d0d4, rimIntensity: 0.2,
    terrain: {
      grass: '#58683c', grassAlt: '#4c5c36', dryGrass: '#8c8654', dirt: '#5e5040', rock: '#686a4c', // (the bluffs: steep grass and scrub, not rock)
      pasture: '#5a6a3c', ploughed: '#584634', stubble: '#8e8452', meadow: '#66743e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shingleZ(x);
        if (onRoad(x, z)) return [0x6a5c48, 0.85];
        if (z > sz + 6) return [y > 0.4 ? 0xcfc2a0 : 0xa89c80, 1];                 // the sand: dry above the water, darker wet and under it
        if (z > sz - 8) return [0x8a8680, 1];                                        // the shingle: grey stones
        if (z > footZ(x) - 6 && y < 4) return [0xb8ad88, 0.55];                      // the shelf: sand, marram grass, marsh
        return null;                                                                 // the bluffs' grass and the fields
      },
    },
  },

  bases: { nato: { x: 0, z: 680, entries: [-330, 10, 330] }, // (the side that lands: its roads are the beach sectors Dog, Easy, Fox)
           pact: { x: 0, z: -680, entries: [-200, 0, 200] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,

  // H-hour: the first wave, in to all three sectors at once (systems/Landing.js); the destroyers are already off the beach
  landing: {
    // the Atlantic Wall (modes/landing.js, data/units45/atlanticWall.js): a resistance nest either side of each draw's
    // mouth, two on the bluffs between them, the coastal battery inland that fires on the ships
    forts: [
      ...DRAWS.flatMap((d) => [-1, 1].map((s) => ({ unit: 'wn', x: d.x + s * 62, z: footZ(d.x + s * 62) - 3, facing: 0 }))),
      { unit: 'battery', x: -250, z: -470, facing: 0 }, { unit: 'battery', x: 270, z: -510, facing: 0 },
    ],
    // wire along the shingle, mines on the shelf before each draw, tank traps across its mouth (systems/Construction.js)
    works: [
      ...Array.from({ length: 88 }, (_, i) => { const x = -480 + i * 11; return { kind: 'wire', x, z: shingleZ(x) - 2, yaw: 0 }; }),
      ...DRAWS.flatMap((d) => [{ kind: 'mines', x: d.x - 28, z: footZ(d.x) + 22 }, { kind: 'mines', x: d.x + 28, z: footZ(d.x) + 22 }, { kind: 'tankTraps', x: d.x, z: footZ(d.x) + 4 }]),
    ],
    // moored mines across the approach, swept lanes off the three sectors (dan buoys)
    seaMines: { z: [360, 450], count: 90, lanes: [-330, 10, 330], lane: 48, seed: 1944 },
    obstacles: OBSTACLES,
    // the defence at H-hour (modes/landing.js): on the bluffs over each sector, in the draws, in the villages
    hold: [...DRAWS.flatMap((d) => [{ x: d.x - 70, z: topZ(d.x - 70) - 4 }, { x: d.x + 70, z: topZ(d.x + 70) - 4 }, { x: d.x, z: footZ(d.x) - 60 }]), ...DRAWS.map((d) => ({ x: d.x, z: d.vz }))],
    waves: [{ t: 0, say: 'H-hour: the first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'tank', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'tank', sector: 2 },
    ] }],
  },

  spawns: {
    nato: [{ unit: 'destroyer', x: -200, z: 560, facing: Math.PI / 2 }, { unit: 'destroyer', x: 220, z: 600, facing: -Math.PI / 2 }],
    pact: [{ unit: 'rifles', x: 10, z: -250, facing: 0, name: '1. Kompanie' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1944);
    sea.build(scene, terrain);

    // ---- the beach obstacles (OBSTACLES: systems/Landing.js knows them too)
    for (const o of OBSTACLES) {
      const y = terrain.heightAt(o.x, o.z), yaw = r() * 0.6 - 0.3;
      if (o.kind === 'hedgehog') props.hedgehog({ x: o.x, z: o.z });
      else if (o.kind === 'gate') { // Element C: a steel gate on rollers, braced behind
        props.box('metal', o.x, y + 1.4, o.z, 3, 0.12, 0.12, yaw, 0x4a3a2e);
        props.box('metal', o.x, y + 2.7, o.z, 3, 0.12, 0.12, yaw, 0x4a3a2e);
        for (const sx of [-1.4, 0, 1.4]) props.box('metal', o.x + Math.cos(yaw) * sx, y + 1.4, o.z - Math.sin(yaw) * sx, 0.12, 2.8, 0.12, yaw, 0x4a3a2e);
        props.box('metal', o.x, y + 1.2, o.z - 1.1, 0.1, 2.6, 0.1, yaw, 0x4a3a2e, 0.7);
        cover.addBox({ x: o.x, z: o.z, yaw, length: 3, thickness: 0.4, height: 2.6 });
      } else { // a log ramp: one stake driven in leaning seaward, a Teller mine on its top
        props.box('plain', o.x, y + 1.1, o.z, 0.25, 2.6, 0.25, yaw, 0x5a4a38, 0.5);
        if (o.mine) props.box('metal', o.x, y + 2.25, o.z + 0.6, 0.35, 0.12, 0.35, 0, 0x3a3e32);
      }
      if (o.mine && o.kind !== 'stake') props.box('metal', o.x, y + (o.kind === 'gate' ? 2.85 : 1.6), o.z, 0.32, 0.12, 0.32, 0, 0x3a3e32);
    }

    // ---- the villas along the shelf behind the sea wall (Dog sector: Hamel-au-Prêtre, the Vierville front), the sea wall itself
    for (let x = -470; x < -150; x += 6) {
      const z = shingleZ(x) - 6;
      props.wall({ x, z, yaw: Math.atan2(shingleZ(x + 6) - shingleZ(x), 6), length: 6.2, height: 2.2, thickness: 0.8 });
    }
    const nearFort = (x: number) => DRAWS.some((d) => [-1, 1].some((s) => Math.abs(x - (d.x + s * 62)) < 30)); // (the resistance nests at the draw mouths: no house on them)
    for (let i = 0; i < 14; i++) {
      const x = -460 + i * 24 + (r() - 0.5) * 8;
      if (Math.abs(x - DRAWS[0].x) < 22 || nearFort(x)) continue;
      props.townHouse({ x, z: shingleZ(x) - 22 - r() * 10, yaw: Math.PI, width: 8 + r() * 3, depth: 8, storeys: 2, name: 'villa', damaged: 0.35 });
    }
    // Les Moulins: a few houses at the foot of the bluffs (east of E-1)
    for (let i = 0; i < 5; i++) { const x = 90 + i * 22; if (nearFort(x)) continue; props.house({ x, z: footZ(x) + 12 + r() * 6, yaw: Math.PI + (r() - 0.5) * 0.2, width: 8, depth: 6 }); }

    // ---- the villages up on the plateau, each at the head of its draw: stone farms round a church
    for (const d of DRAWS) {
      props.church({ x: d.x + 30, z: d.vz - 20, yaw: Math.PI / 2 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + r() * 0.4, dd = 34 + r() * 30;
        const x = d.x + Math.cos(a) * dd, z = d.vz + Math.sin(a) * dd * 0.8;
        if (onRoad(x, z)) continue;
        if (i % 3 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, a + Math.PI / 2);
        else props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.5 ? 2 : 1, name: 'farmhouse', damaged: 0.1 });
      }
    }
    // farmsteads out in the bocage
    for (let i = 0; i < 16; i++) {
      const x = (r() * 2 - 1) * 440, z = -280 - r() * 400;
      if (onRoad(x, z) || Math.hypot(x, z + 680) < 60 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 70)) continue;
      buildSite(props, { kind: r() < 0.6 ? 'farm' : 'fieldwall', seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    commandPost(props, this.bases.pact, 1, 0x7a7458);
    props.finish();

    const plateau = (x: number, z: number) => z < topZ(x) - 15;
    const avoid = [
      { x: 0, z: -680, r: 26 },
      ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => onRoad(x, z) },
    ];
    // scrub and a few trees on the bluffs and down the draws (they were wooded), orchards and copses in the bocage
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 900, broadleaf: 0.85, autumn: 0, maxY: 80,
      avoid: [...avoid, { test: (x: number, z: number) => z > footZ(x) - 4 }],
      forest: (x: number, z: number) => Math.max(...DRAWS.map((d) => smoothstep(70, 25, Math.abs(x - d.x)) * smoothstep(footZ(x), topZ(x) - 40, z) * 0.7), plateau(x, z) ? smoothstep(0.25, 0.55, fbm(noise, x * 0.008 + 9, z * 0.008, 2)) * 0.6 : 0) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 20000, lane: 0, // (only the plateau takes them: ~6000 planted, the bocage)
      avoid: [...avoid, { test: (x: number, z: number) => !plateau(x, z) }] });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2.2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => z > shingleZ(x) - 10 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); hedges.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
