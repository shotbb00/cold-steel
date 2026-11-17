// Iwo Jima, 19 February 1945 (1945 only; coastal landing, the Pacific: the US Marine Corps against the Imperial
// Japanese Army). The island lies along x, tilted: Mount Suribachi, the dead volcano, at the south-west tip (-x), the
// narrow neck below it, then the island widening north-east to the Motoyama plateau and its two airfields, the
// broken, cave-riddled northern plateau at the far end (+x, -z). The Marines come in from the sea to the south-east
// (+z) onto Green, Red and Blue beaches: steep terraces of black volcanic ash that bog down vehicles and tire the
// men (map.soft). Almost nothing defends the waterline — General Kuribayashi let them land — the pillboxes and
// blockhouses are inland, on the terraces' crest, round the airfields and in the rock, and every gun on Suribachi
// and the plateau is laid on the beach. The LSM(R) rocket ships run in with the first waves (data/units45/ships.js lsmr).
// Not point-mirrored: one side lands, the other holds (modes/landing).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2400;
const BOUNDS = { x: 900, z: 900 };
const noise = createNoise2D(1945_02);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e5a6c }); // (the Pacific: deep blue-green)

/** The island's spine (z of its middle line) and half-width along x: Suribachi's round tip, the neck, the wide plateau. */
const spine = (x: number) => -150 - 0.2 * x;
const WIDTH: [number, number][] = [[-900, 0], [-830, 120], [-700, 185], [-560, 175], [-430, 140], [-330, 170], [-150, 290], [150, 360], [450, 410], [680, 340], [820, 200], [900, 0]];
function halfWidth(x: number) {
  if (x <= WIDTH[0][0] || x >= WIDTH[WIDTH.length - 1][0]) return 0;
  let i = 0;
  while (x > WIDTH[i + 1][0]) i++;
  const [x0, w0] = WIDTH[i], [x1, w1] = WIDTH[i + 1], k = (x - x0) / (x1 - x0);
  return w0 + (w1 - w0) * (k * k * (3 - 2 * k));
}
/** The shore to the south-east (the landing beaches): z of the waterline. */
export const shoreZ = (x: number) => spine(x) + halfWidth(x) + fbm(noise, x * 0.006, 2.2, 2) * 14;
/** How far inside the island (m from the nearest shore; < 0 at sea). */
const inland = (x: number, z: number) => halfWidth(x) + fbm(noise, x * 0.006, z * 0.006 + 2.2, 2) * 14 - Math.abs(z - spine(x));

const SURIBACHI = { x: -690, z: spine(-690), r: 165, h: 92 };
export const AIRFIELDS = [
  { id: 'No. 1', x: -60, z: -110, len: 480, yaw: 0.35, h: 24 },
  { id: 'No. 2', x: 330, z: -330, len: 420, yaw: -0.5, h: 34 },
];
const PLATEAU_N = { x: 620, z: -470 };
export const BEACHES = [
  { id: 'Green', x: -360 },
  { id: 'Red', x: -110 },
  { id: 'Blue', x: 150 },
];

/** Along an airfield's runway (0 on it, growing off it): its flattened ground. */
function onRunway(a: typeof AIRFIELDS[number], x: number, z: number, pad = 0) {
  const fx = Math.cos(a.yaw), fz = Math.sin(a.yaw), dx = x - a.x, dz = z - a.z;
  const along = Math.abs(dx * fx + dz * fz) - a.len / 2, across = Math.abs(-dx * fz + dz * fx) - 22;
  return Math.max(along, across, 0) - pad;
}

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) return Math.max(-18, -1 + d * 0.06 - Math.max(0, -d - 120) * 0.12); // the sea floor, shelving off steeply (a volcanic island)
  // the beach terraces: ash rising in three steps over the first 110 m, then the rolling plateau
  const terraces = 1 + 4 * smoothstep(8, 22, d) + 4 * smoothstep(45, 58, d) + 5 * smoothstep(85, 100, d);
  const north = smoothstep(200, 700, x) * (18 + fbm(noise, x * 0.012, z * 0.012, 3) * 16); // the northern plateau: high, broken, gullied
  let h = terraces + smoothstep(100, 260, d) * (12 + north + fbm(noise, x * 0.004, z * 0.004, 3) * 8) + fbm(noise, x * 0.03, z * 0.03, 2) * 1.2 * smoothstep(20, 80, d);
  // Suribachi: the cone, steep, its crater at the top
  const sr = Math.hypot(x - SURIBACHI.x, z - SURIBACHI.z) / SURIBACHI.r;
  if (sr < 1.3) {
    const cone = SURIBACHI.h * Math.max(0, 1 - sr) ** 1.35 * (1 + fbm(noise, x * 0.04, z * 0.04, 2) * 0.12) - (sr < 0.18 ? (0.18 - sr) * 120 : 0);
    h = Math.max(h, cone + 2 * (1 - smoothstep(1, 1.3, sr)));
  }
  // the airfields: graded flat
  for (const a of AIRFIELDS) {
    const off = onRunway(a, x, z);
    if (off < 40) h += (a.h - h) * smoothstep(40, 0, off);
  }
  return h;
}

/** Soft volcanic ash: on the beach and its terraces vehicles crawl and men tire (UnitStack locomotion). */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d < 0 || d > 110 || z < spine(x)) return 1; // (the beaches face south-east: the north shore is rock)
  return foot ? 0.78 : 0.42;
}

const shore = (x: number) => ({ x, z: shoreZ(x) });
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: -60, z: 760, owner: 'nato', sector: 'centre', radius: 90 },
  // the beaches (Landing: open from the start; `opens` what lies up from each once taken)
  { id: 'B', name: 'Green Beach', x: BEACHES[0].x, z: shoreZ(BEACHES[0].x) - 25, owner: null, sector: 'west', radius: 40, opens: 'E' },
  { id: 'C', name: 'Red Beach', x: BEACHES[1].x, z: shoreZ(BEACHES[1].x) - 25, owner: null, sector: 'centre', radius: 40, opens: 'F' },
  { id: 'D', name: 'Blue Beach', x: BEACHES[2].x, z: shoreZ(BEACHES[2].x) - 25, owner: null, sector: 'east', radius: 40, opens: 'G' },
  { id: 'E', name: 'Mount Suribachi', x: SURIBACHI.x + 30, z: SURIBACHI.z + 10, owner: null, sector: 'west', radius: 26 },
  { id: 'F', name: 'Motoyama Airfield No. 1', x: AIRFIELDS[0].x, z: AIRFIELDS[0].z, owner: null, sector: 'centre' },
  { id: 'G', name: 'Motoyama Airfield No. 2', x: AIRFIELDS[1].x, z: AIRFIELDS[1].z, owner: null, sector: 'east' },
  { id: 'K', name: 'Northern Plateau', x: PLATEAU_N.x, z: PLATEAU_N.z, owner: 'pact', sector: 'centre' },
];

/** The pre-landing bombardment's craters (weeks of it): thick on the beaches' crest and round the airfields, everywhere a few. */
function craters() {
  const r = mulberry32(1945_19), out: number[][] = [];
  for (let i = 0; i < 1400; i++) {
    const x = (r() * 2 - 1) * 850, z = (r() * 2 - 1) * 750, d = inland(x, z);
    if (d < 12 || Math.hypot(x - SURIBACHI.x, z - SURIBACHI.z) < SURIBACHI.r * 0.7) continue;
    const near = Math.max(smoothstep(160, 60, d) * (z > spine(x) ? 1 : 0), ...AIRFIELDS.map((a) => smoothstep(140, 0, onRunway(a, x, z))));
    if (r() > 0.25 + near * 0.75) continue;
    const big = r();
    out.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, 3 + big * 6, 0.4 + big * big * 1.6]);
  }
  return out;
}

export default {
  id: 'iwoJima',
  name: 'Iwo Jima',
  description: '19 February 1945: black volcanic sand under Mount Suribachi. The Marines land on Green, Red and Blue beaches, the Imperial Army waits inland in pillboxes and caves, every gun laid on the terraces.',
  epochs: ['1945'],
  theatre: 'coastal',
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific's armies)
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['usmc'], pact: ['jp'] },
  airfields: [],                                       // (systems/Airfields.js: no squadrons on the island — the Marines' aircraft come off the carriers, from the map edge)
  airLimit: { pact: 0 },                               // (by February 1945 no Japanese aircraft over Iwo Jima)
  conditions: { time: 'day', weather: 'clear' },
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  steep: 0.55, // (vehicles: Suribachi's flanks and the plateau's gullies are for men only)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1945,
  height,
  soft,
  river: sea,

  theme: {
    // a clear February morning in the Bonins, the light hard, the haze of the bombardment's smoke
    fogColor: 0xb9b6ae, fogDensity: 0.00045,
    skyTop: 0x5d82a8, skyHorizon: 0xc6cfd4, skyBottom: 0x8a9298,
    sunColor: 0xfff2dc, sunIntensity: 2.0, sunDisk: 0.3,
    clouds: 0.35, cloudLight: 0xeeeeea, cloudDark: 0x9aa0a4,
    sunDir: [0.4, 0.7, 0.55],
    hemiSky: 0xc8d4dc, hemiGround: 0x3a3632, hemiIntensity: 1.2,
    rimColor: 0xd8dce0, rimIntensity: 0.25,
    terrain: {
      // the island: dark volcanic ash and rock, grey-green scrub on the plateau, sulphur yellow in the north
      grass: '#5c5e46', grassAlt: '#4e5040', dryGrass: '#7a7458', dirt: '#3a3530', rock: '#4a4642',
      pasture: '#5a5c44', ploughed: '#3c3630', stubble: '#6e6850', meadow: '#5e6046',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) return [y > -1.5 ? 0x2a2622 : 0x24221e, 1];                    // under the water: black sand
        if (d < 110 && z > spine(x)) return [0x2f2b28, 1];                            // the beaches and terraces: black volcanic ash
        if (AIRFIELDS.some((a) => onRunway(a, x, z) < 0.5)) return [0x6a6458, 0.95];  // the runways: graded, pale
        if (Math.hypot(x - SURIBACHI.x, z - SURIBACHI.z) < SURIBACHI.r * 0.95) return [0x3e3934, 0.9]; // Suribachi: ash and rock
        if (x > 450 && fbm(noise, x * 0.01, z * 0.01, 2) > 0.35) return [0x8c7c40, 0.55];  // the north: sulphur
        return null;
      },
    },
  },

  bases: { nato: { x: -60, z: 830, entries: BEACHES.map((b) => b.x) }, // (the side that lands: its roads are the three beaches)
           pact: { x: 560, z: -560, entries: [440, 560, 680] } },
  maxStacks: 26,
  cameraStart: { nato: { x: -110, z: 260 }, pact: { x: 200, z: -200 } },
  points,

  // the pre-landing bombardment: the island already cratered (GameEngine: replayed quietly before the battle)
  battlefield() { return { blasts: craters(), ruins: [], works: [] }; },

  landing: {
    // the defence (modes/landing.js, data/units45/atlanticWall.js — the Japanese variants): pillbox complexes on the
    // terraces' crest over each beach and round the airfields, the coast guns on Suribachi and the plateau laid on the ships
    forts: [
      ...BEACHES.flatMap((b) => [-1, 1].map((s) => { const x = b.x + s * 70; return { unit: 'wn', x, z: shoreZ(x) - 120, facing: 0 }; })),
      ...AIRFIELDS.map((a) => ({ unit: 'wn', x: a.x + 60, z: a.z + 70, facing: 0 })),
      { unit: 'battery', x: SURIBACHI.x + 40, z: SURIBACHI.z + 70, facing: 0 },
      { unit: 'battery', x: 520, z: -300, facing: 0 },
    ],
    // wire and mines on the terraces, more round the airfields (systems/Construction.js)
    works: [
      ...BEACHES.flatMap((b) => [-50, 0, 50].map((dx) => ({ kind: 'mines', x: b.x + dx, z: shoreZ(b.x + dx) - 70 }))),
      ...BEACHES.flatMap((b) => Array.from({ length: 10 }, (_, i) => { const x = b.x - 90 + i * 20; return { kind: 'wire', x, z: shoreZ(x) - 100, yaw: 0 }; })),
      ...AIRFIELDS.flatMap((a) => [{ kind: 'trench', x: a.x - 40, z: a.z + 90, yaw: 0 }, { kind: 'trench', x: a.x + 30, z: a.z + 95, yaw: 0 }, { kind: 'mgNest', x: a.x - 90, z: a.z + 60, yaw: 0 }]),
    ],
    // no beach obstacles, no tide to speak of, few sea mines: the ships could come close in
    obstacles: [],
    navy: ['destroyer', 'lsmr', 'oldBattleship'],
    // the defence at H-hour: on the terraces' crest, round the airfields, on Suribachi, in the north
    hold: [
      ...BEACHES.map((b) => ({ x: b.x, z: shoreZ(b.x) - 140 })),
      { x: SURIBACHI.x + 20, z: SURIBACHI.z + 40 }, { x: SURIBACHI.x - 30, z: SURIBACHI.z - 20 },
      ...AIRFIELDS.flatMap((a) => [{ x: a.x, z: a.z + 40 }, { x: a.x + 80, z: a.z - 30 }]),
      { x: PLATEAU_N.x - 120, z: PLATEAU_N.z + 80 },
    ],
    waves: [{ t: 0, say: 'H-hour: the first wave is going in — the LSM(R)s have rocketed the beaches', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'tank', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'tank', sector: 2 },
    ] }],
  },

  spawns: {
    // (between the boat lanes, bows to the shore: the craft run in past them — systems/Landing.js goes straight for the beach)
    nato: [{ unit: 'destroyer', x: 360, z: 760, facing: Math.PI / 2 }, { unit: 'lsmr', x: -235, z: 560, facing: Math.PI }, { unit: 'lsmr', x: 20, z: 580, facing: Math.PI }],
    pact: [{ unit: 'rifles', x: AIRFIELDS[0].x, z: AIRFIELDS[0].z + 40, facing: 0, name: '145th Regiment' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1945);
    sea.build(scene, terrain);
    // ---- the airfields' runways: graded strips, the dispersal revetments beside them, wrecked aircraft
    for (const a of AIRFIELDS) {
      const fx = Math.cos(a.yaw), fz = Math.sin(a.yaw), yaw = Math.atan2(fx, fz);
      for (let t = -a.len / 2; t < a.len / 2; t += 12) {
        const x = a.x + fx * (t + 6), z = a.z + fz * (t + 6);
        props.box('stone', x, terrain.heightAt(x, z) + 0.05, z, 30, 0.2, 12.4, yaw, 0x77705f);
      }
      for (let i = 0; i < 6; i++) { // the revetments: horseshoes of earth for the planes that are gone
        const t = (i / 5 - 0.5) * a.len * 0.8, x = a.x + fx * t - fz * 45, z = a.z + fz * t + fx * 45;
        props.box('plain', x, terrain.heightAt(x, z) + 1.2, z, 18, 2.4, 3, yaw, 0x4a4438);
        props.box('plain', x - fx * 9, terrain.heightAt(x, z) + 1.2, z - fz * 9, 3, 2.4, 14, yaw, 0x4a4438);
        if (r() < 0.5) props.aircraftWreck({ x: x + fz * 6, z: z - fx * 6, yaw: r() * 6.28, scale: 0.8 });
      }
    }
    // ---- Motoyama village: the few houses on the plateau, burnt out
    for (let i = 0; i < 10; i++) {
      const x = 120 + (r() - 0.5) * 160, z = -230 + (r() - 0.5) * 120;
      if (AIRFIELDS.some((a) => onRunway(a, x, z) < 30) || points.some((p) => Math.hypot(p.x - x, p.z - z) < 30)) continue;
      props.house({ x, z, yaw: r() * 6.28, width: 6 + r() * 3, depth: 5 + r() * 2 });
    }
    // ---- rocks: the volcanic boulders of the north and round Suribachi
    for (let i = 0; i < 260; i++) {
      const x = (r() * 2 - 1) * 860, z = (r() * 2 - 1) * 760, d = inland(x, z);
      if (d < 120 || AIRFIELDS.some((a) => onRunway(a, x, z) < 15) || points.some((p) => Math.hypot(p.x - x, p.z - z) < 30)) continue;
      if (x < 300 && Math.hypot(x - SURIBACHI.x, z - SURIBACHI.z) > SURIBACHI.r * 1.4 && r() < 0.7) continue;
      props.boulder({ x, z, radius: 1.5 + r() * 3.5 });
    }
    commandPost(props, this.bases.pact, 1, 0x6f6a44);
    props.finish();

    const avoid = [
      { x: this.bases.pact.x, z: this.bases.pact.z, r: 26 },
      ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => inland(x, z) < 60 || AIRFIELDS.some((a) => onRunway(a, x, z) < 10) },
    ];
    // scrub and a few stunted trees inland, thicker in the north (blasted bare near the beaches and the airfields)
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 500, broadleaf: 0.9, autumn: 0, maxY: 90, size: 0.6, avoid,
      forest: (x: number, z: number) => smoothstep(0, 600, x) * 0.5 * smoothstep(0.2, 0.5, fbm(noise, x * 0.008 + 3, z * 0.008, 2)) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.4,
      avoid: [...avoid.slice(0, -1), { test: (x: number, z: number) => inland(x, z) < 110 || AIRFIELDS.some((a) => onRunway(a, x, z) < 4) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
