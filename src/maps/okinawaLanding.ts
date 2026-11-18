// Okinawa, L-Day, 1 April 1945 (1945 only; coastal landing, the Pacific: the US Tenth Army — III Amphibious Corps'
// Marines and XXIV Corps' soldiers — against the Imperial Japanese Army). The Hagushi beaches on the island's west
// coast, seen from the sea (+z): north is to the left (-x). The Bishi River comes out in the middle and splits them —
// the Marines' Green and Blue beaches north of it, below Yontan airfield, the Army's Purple and White beaches south of
// it, below Kadena airfield. A coral sea wall runs along the top of the sand. General Ushijima did not fight for the
// beaches: the 32nd Army waited in the south on the Shuri Line, and the landing came ashore almost unopposed — a
// handful of mortars, a few riflemen of the airfield units in the villages, the turtleback tombs on the hillsides and
// the low ridges inland. So the forts here are few; the defence stands back, round the airfields and the villages
// (Sobe, Hagushi, Kadena), among the sugar cane and the tombs. Not point-mirrored: one side lands, the other holds.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2400;
const BOUNDS = { x: 900, z: 900 };
const noise = createNoise2D(1945_04);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6474 }); // (the East China Sea over the reef: green-blue)

/** z of the waterline: a long, gently bowed shore, the Bishi's mouth at x = 0. */
export const shoreZ = (x: number) => 140 - 0.00012 * x * x + fbm(noise, x * 0.006, 1.7, 2) * 10;
/** How far inland (m from the waterline; < 0 at sea). */
const inland = (x: number, z: number) => shoreZ(x) - z;

/** The Bishi River's line (x of it at z) and its bed: deep at the mouth, a fordable stream inland. */
const bishiX = (z: number) => 26 * Math.sin(z * 0.006) - 0.02 * (shoreZ(0) - z);
const bishi = (x: number, z: number) => (z < shoreZ(0) - 560 ? Infinity : Math.abs(x - bishiX(z)) - (z > shoreZ(0) - 90 ? 16 : 9) + smoothstep(shoreZ(0) - 480, shoreZ(0) - 560, z) * 12); // < 0 in the river (its head 560 m inland)

export const AIRFIELDS = [
  { id: 'Yontan', x: -330, z: -330, len: 560, yaw: 0.25, h: 16 },
  { id: 'Kadena', x: 300, z: -330, len: 520, yaw: -0.3, h: 13 },
];
/** The beaches, north to south: the 6th and 1st Marine Divisions, the 7th and 96th Infantry Divisions. */
export const BEACHES = [
  { id: 'Green', x: -520 },
  { id: 'Blue', x: -190 },
  { id: 'Purple', x: 190 },
  { id: 'White', x: 520 },
];
const VILLAGES = [
  { name: 'Sobe', x: -620, z: -120, r: 50 },
  { name: 'Hagushi', x: -70, z: 40, r: 40 },
  { name: 'Kadena', x: 600, z: -150, r: 55 },
];
/** The low ridges inland, where the tombs are: [x, z, half-length, height, yaw]. */
const RIDGES: [number, number, number, number, number][] = [
  [-60, -200, 160, 14, 0.4], [130, -560, 220, 18, -0.2], [-560, -470, 180, 16, 0.3], [600, -460, 170, 15, -0.5], [-140, -620, 140, 12, 0.1],
];
const ridge = (x: number, z: number) => Math.max(0, ...RIDGES.map(([rx, rz, L, h, yaw]) => {
  const fx = Math.cos(yaw), fz = Math.sin(yaw), dx = x - rx, dz = z - rz;
  const along = (dx * fx + dz * fz) / L, across = (-dx * fz + dz * fx) / 55;
  return h * Math.max(0, 1 - along * along) * Math.exp(-across * across);
}));

/** Along an airfield's runway (0 on it, growing off it): its flattened ground. */
function onRunway(a: typeof AIRFIELDS[number], x: number, z: number, pad = 0) {
  const fx = Math.cos(a.yaw), fz = Math.sin(a.yaw), dx = x - a.x, dz = z - a.z;
  const along = Math.abs(dx * fx + dz * fz) - a.len / 2, across = Math.abs(-dx * fz + dz * fx) - 24;
  return Math.max(along, across, 0) - pad;
}
const SEAWALL = 32; // m inland: the coral sea wall along the top of the sand

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) return Math.max(-16, -0.8 + d * 0.035 - Math.max(0, -d - 220) * 0.05); // the reef flat, then shelving off
  // the sand up to the sea wall, a step up behind it, then the rolling farmland rising toward the airfields
  let h = 0.4 + 1.6 * smoothstep(0, SEAWALL, d) + 1.6 * smoothstep(SEAWALL - 2, SEAWALL + 6, d)
    + smoothstep(40, 420, d) * (9 + fbm(noise, x * 0.004, z * 0.004, 3) * 6) + fbm(noise, x * 0.025, z * 0.025, 2) * 1.0 * smoothstep(30, 90, d);
  h += ridge(x, z) * (1 + fbm(noise, x * 0.03, z * 0.03, 2) * 0.15);
  for (const a of AIRFIELDS) {
    const off = onRunway(a, x, z);
    if (off < 50) h += (a.h - h) * smoothstep(50, 0, off);
  }
  for (const v of VILLAGES) h += (Math.max(2.2, h * 0.9) - h) * smoothstep(v.r + 10, v.r - 10, Math.hypot(x - v.x, z - v.z)) * 0.5;
  // the Bishi: a deep tidal mouth across the beach, upstream a shallow stream men and tanks can ford
  const b = bishi(x, z);
  if (b < 30) { // (its banks: gentle — the stream ran in a broad shallow valley)
    const bed = -0.3 - 2.1 * smoothstep(130, 70, d); // (the tidal mouth too deep to wade, the stream above it a ford)
    h += (Math.min(h, bed) - h) * smoothstep(d < 130 ? 10 : 30, 0, b);
  }
  return h;
}

/** Soft sand on the beach and the river's mud: vehicles slow, men tire a little. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < SEAWALL) return foot ? 0.85 : 0.6;
  if (bishi(x, z) < 6) return foot ? 0.7 : 0.45;
  return 1;
}

/** Sugar cane and sweet potato plots, a field mosaic over the farmland (long strips on a skewed grid, each plot its crop). */
const plot = (x: number, z: number) => {
  const u = x * 0.94 + z * 0.34, v = z * 0.94 - x * 0.34, j = Math.floor(v / 38), i = Math.floor(u / 70 + j * 0.37), h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 760, owner: 'nato', sector: 'centre', radius: 90 },
  // the beaches (Landing: open from the start; `opens` what lies inland of each once taken)
  { id: 'B', name: 'Green Beach', x: BEACHES[0].x, z: shoreZ(BEACHES[0].x) - 22, owner: null, sector: 'west', radius: 40, opens: 'E' },
  { id: 'C', name: 'Blue Beach', x: BEACHES[1].x, z: shoreZ(BEACHES[1].x) - 22, owner: null, sector: 'centre', radius: 40, opens: 'F' },
  { id: 'D', name: 'Purple Beach', x: BEACHES[2].x, z: shoreZ(BEACHES[2].x) - 22, owner: null, sector: 'centre', radius: 40, opens: 'G' },
  { id: 'H', name: 'White Beach', x: BEACHES[3].x, z: shoreZ(BEACHES[3].x) - 22, owner: null, sector: 'east', radius: 40, opens: 'I' },
  { id: 'E', name: 'Sobe', x: VILLAGES[0].x, z: VILLAGES[0].z, owner: null, sector: 'west' },
  { id: 'F', name: 'Yontan Airfield', x: AIRFIELDS[0].x, z: AIRFIELDS[0].z, owner: null, sector: 'centre' },
  { id: 'G', name: 'Kadena Airfield', x: AIRFIELDS[1].x, z: AIRFIELDS[1].z, owner: null, sector: 'centre' },
  { id: 'I', name: 'Kadena', x: VILLAGES[2].x, z: VILLAGES[2].z, owner: null, sector: 'east' },
  { id: 'K', name: 'Koza crossroads', x: 0, z: -760, owner: 'pact', sector: 'centre' },
];

/** The pre-landing bombardment (a week of it): most on the beaches' crest and round the airfields. */
function craters() {
  const r = mulberry32(1945_0401), out: number[][] = [];
  for (let i = 0; i < 900; i++) {
    const x = (r() * 2 - 1) * 850, z = (r() * 2 - 1) * 800, d = inland(x, z);
    if (d < SEAWALL + 6 || bishi(x, z) < 8 || VILLAGES.some((v) => Math.hypot(x - v.x, z - v.z) < v.r)) continue;
    const near = Math.max(smoothstep(160, 40, d), ...AIRFIELDS.map((a) => smoothstep(120, 0, onRunway(a, x, z))));
    if (r() > 0.15 + near * 0.6) continue;
    const big = r();
    out.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, 3 + big * 5, 0.4 + big * big * 1.3]);
  }
  return out;
}

export default {
  id: 'okinawaLanding',
  name: 'Okinawa Landing',
  description: 'L-Day, 1 April 1945: the Hagushi beaches either side of the Bishi River. The Marines and the Army come over the reef and the sea wall almost unopposed — the fight is inland, for Yontan and Kadena airfields and the villages among the cane and the tombs.',
  epochs: ['1945'],
  theatre: 'coastal',
  region: 'pacific',
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific's armies)
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['usmc', 'us'], pact: ['jp'] },
  airfields: [],                                       // (the aircraft come off the carriers, from the map edge)
  airLimit: { pact: 0 },                               // (the kamikazes went for the ships offshore, not the beaches)
  conditions: { time: 'day', weather: 'clear' },       // (a cool, clear Easter Sunday morning)
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  steep: 0.55,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1945,
  height,
  soft,
  river: sea,

  theme: {
    // spring in the Ryukyus: soft light, a haze off the sea and the bombardment's smoke drifting inland
    fogColor: 0xc4c8c4, fogDensity: 0.0005,
    skyTop: 0x6a8eb2, skyHorizon: 0xcdd6da, skyBottom: 0x96a0a4,
    sunColor: 0xfff0d8, sunIntensity: 1.9, sunDisk: 0.3,
    clouds: 0.45, cloudLight: 0xf0f0ec, cloudDark: 0xa0a6aa,
    sunDir: [-0.4, 0.65, 0.6],
    hemiSky: 0xccd8de, hemiGround: 0x4a4a36, hemiIntensity: 1.15,
    rimColor: 0xdce0e2, rimIntensity: 0.25,
    terrain: {
      // red-brown Okinawan clay, green cane and sweet potato, pale coral sand
      grass: '#5e7040', grassAlt: '#526438', dryGrass: '#8a8a52', dirt: '#7a5a40', rock: '#9a948a',
      pasture: '#62743e', ploughed: '#74503a', stubble: '#8e8a58', meadow: '#5c6e3c',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) return [y > -1.2 ? 0xc8bfa4 : 0x8a8a78, 1];                      // the reef flat: pale coral sand
        if (d < SEAWALL) return [0xd2c8a8, 1];                                       // the beach
        if (bishi(x, z) < 4) return [0x5a4a36, 0.9];                                 // the river's mud banks
        if (AIRFIELDS.some((a) => onRunway(a, x, z) < 0.5)) return [0x8a8678, 0.95];  // the runways: crushed coral
        if (VILLAGES.some((v) => Math.hypot(x - v.x, z - v.z) < v.r * 0.8)) return [0x8a7a62, 0.5]; // the lanes and yards
        if (ridge(x, z) > 6) return null;                                            // the ridges: scrub
        const p = plot(x, z);
        if (p < 0.35) return [0x6e8a3c, 0.55];                                       // sugar cane
        if (p < 0.6) return [0x7a5a3e, 0.6];                                         // ploughed red earth
        if (p < 0.8) return [0x5a7a3a, 0.5];                                         // sweet potato
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: BEACHES.map((b) => b.x) }, // (the side that lands: its roads are the four beaches)
           pact: { x: 0, z: -830, entries: [-400, 0, 400] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 260 }, pact: { x: 0, z: -300 } },
  points,

  battlefield() { return { blasts: craters(), ruins: [], works: [] }; },

  landing: {
    // almost nothing on the beach (modes/landing.js, data/units45/atlanticWall.js — the Japanese variants): one
    // strongpoint by the Bishi's mouth, the battery inland on the ridge south of Kadena
    forts: [
      { unit: 'wn', x: 60, z: shoreZ(60) - 70, facing: 0 },
      { unit: 'battery', x: 140, z: -540, facing: 0 },
    ],
    // a little wire and a few mines: on the airfields' approaches, not on the sand
    works: [
      ...AIRFIELDS.flatMap((a) => [{ kind: 'mines', x: a.x - 40, z: a.z + 90 }, { kind: 'trench', x: a.x + 30, z: a.z + 80, yaw: 0 }, { kind: 'mgNest', x: a.x - 100, z: a.z + 60, yaw: 0 }]),
      ...Array.from({ length: 5 }, (_, i) => { const x = -20 + i * 20; return { kind: 'wire', x, z: shoreZ(x) - 60, yaw: 0 }; }),
    ],
    obstacles: [],
    navy: ['destroyer', 'lsmr', 'oldBattleship'],
    // the defence at H-hour: back from the beach — the villages, the airfields, the ridges with the tombs
    hold: [
      ...VILLAGES.map((v) => ({ x: v.x, z: v.z - 20 })),
      ...AIRFIELDS.flatMap((a) => [{ x: a.x, z: a.z + 50 }, { x: a.x + 90, z: a.z - 20 }]),
      { x: RIDGES[0][0], z: RIDGES[0][1] }, { x: RIDGES[2][0], z: RIDGES[2][1] }, { x: RIDGES[3][0], z: RIDGES[3][1] },
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'mortar', 'rifles', 'atTeam', 'mgTeam', 'scouts', 'mortar', 'rifles'],
    waves: [{ t: 0, say: 'L-Day: the amtracs are over the reef — and no one is shooting', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'tank', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'tank', sector: 2 },
      { unit: 'rifles', sector: 3 }, { unit: 'rifles', sector: 3 }, { unit: 'mgTeam', sector: 3 },
    ] }],
  },

  spawns: {
    // (between the boat lanes, bows to the shore)
    nato: [{ unit: 'destroyer', x: 0, z: 740, facing: Math.PI / 2 }, { unit: 'lsmr', x: -355, z: 560, facing: Math.PI }, { unit: 'lsmr', x: 355, z: 560, facing: Math.PI }],
    pact: [{ unit: 'rifles', x: AIRFIELDS[0].x, z: AIRFIELDS[0].z + 40, facing: 0, name: '1st Specially Established Regiment' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1945_04);
    sea.build(scene, terrain);
    const nearPoint = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    // ---- the sea wall: coral blocks along the top of the sand, broken by the bombardment and at the river
    for (let x = -880; x <= 880; x += 6) {
      if (r() < 0.12 || Math.abs(x - bishiX(shoreZ(x))) < 22) continue;
      const z = shoreZ(x) - SEAWALL + 1, yaw = Math.atan2(shoreZ(x + 3) - shoreZ(x - 3), 6);
      props.wall({ x, z, yaw: -yaw, length: 6.2, height: 1.6, thickness: 0.9 });
    }
    // ---- the airfields: runways, revetments, wrecked aircraft (the Japanese had left — and left dummies)
    for (const a of AIRFIELDS) {
      const fx = Math.cos(a.yaw), fz = Math.sin(a.yaw), yaw = Math.atan2(fx, fz);
      for (let t = -a.len / 2; t < a.len / 2; t += 12) {
        const x = a.x + fx * (t + 6), z = a.z + fz * (t + 6);
        props.box('stone', x, terrain.heightAt(x, z) + 0.05, z, 34, 0.2, 12.4, yaw, 0x8c887a);
      }
      for (let i = 0; i < 6; i++) {
        const t = (i / 5 - 0.5) * a.len * 0.8, x = a.x + fx * t - fz * 50, z = a.z + fz * t + fx * 50;
        props.box('plain', x, terrain.heightAt(x, z) + 1.2, z, 18, 2.4, 3, yaw, 0x6a5440);
        props.box('plain', x - fx * 9, terrain.heightAt(x, z) + 1.2, z - fz * 9, 3, 2.4, 14, yaw, 0x6a5440);
        if (r() < 0.6) props.aircraftWreck({ x: x + fz * 6, z: z - fx * 6, yaw: r() * 6.28, scale: 0.8 });
      }
      props.controlTower({ x: a.x - fz * 70, z: a.z + fx * 70, yaw });
    }
    // ---- the villages: tiled houses behind coral-stone walls, the lanes between
    for (const v of VILLAGES) {
      for (let i = 0; i < 14; i++) {
        const a = r() * 6.28, d = 8 + r() * (v.r - 8), x = v.x + Math.cos(a) * d, z = v.z + Math.sin(a) * d;
        if (nearPoint(x, z, 16) || bishi(x, z) < 12 || inland(x, z) < SEAWALL + 10) continue;
        const yaw = Math.round(r() * 4) * (Math.PI / 2) + (r() - 0.5) * 0.2;
        props.house({ x, z, yaw, width: 7 + r() * 3, depth: 6 + r() * 2 });
        props.lowWall({ x: x + Math.sin(yaw) * 6, z: z + Math.cos(yaw) * 6, yaw, length: 9, height: 1.5, color: 0xb0a890 });
      }
    }
    // ---- the turtleback tombs: on the ridges' slopes, facing out — the family tombs the defenders fought from
    for (let i = 0, n = 0; n < 70 && i < 2000; i++) {
      const x = (r() * 2 - 1) * 860, z = -60 - r() * 760, g = ridge(x, z);
      if (g < 3 || g > 12 || nearPoint(x, z, 20) || AIRFIELDS.some((a) => onRunway(a, x, z) < 20)) continue;
      const yaw = Math.atan2(terrain.heightAt(x - 3, z) - terrain.heightAt(x + 3, z), terrain.heightAt(x, z - 3) - terrain.heightAt(x, z + 3)), y = terrain.heightAt(x, z);
      props.box('stone', x, y + 0.4, z, 4.2, 2.2, 3.6, yaw, 0xb4ac98);                                  // the vault
      props.box('stone', x, y + 1.75, z, 3.6, 0.7, 3.0, yaw, 0xa8a08c);                                   // the turtle shell over it, stepped
      props.box('stone', x, y + 2.15, z, 2.6, 0.4, 2.1, yaw, 0xa8a08c);
      props.box('plain', x + Math.sin(yaw) * 1.82, y + 0.6, z + Math.cos(yaw) * 1.82, 0.8, 0.9, 0.1, yaw, 0x1a1816); // the door stone's dark mouth
      props.lowWall({ x: x + Math.sin(yaw) * 4, z: z + Math.cos(yaw) * 4, yaw, length: 5, height: 0.8, color: 0xb0a890 }); // the forecourt wall
      n++;
    }
    commandPost(props, this.bases.pact, 1, 0x6f6a44);
    props.finish();

    const avoid = [
      { x: this.bases.pact.x, z: this.bases.pact.z, r: 26 },
      ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      ...VILLAGES.map((v) => ({ x: v.x, z: v.z, r: v.r * 0.7 })),
      { test: (x: number, z: number) => inland(x, z) < SEAWALL + 8 || bishi(x, z) < 6 || AIRFIELDS.some((a) => onRunway(a, x, z) < 14) },
    ];
    // Ryukyu pines on the ridges and in windbreaks, a scatter round the villages; the cane fields open
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 2200, broadleaf: 0.45, autumn: 0, maxY: 60, size: 0.85, avoid,
      forest: (x: number, z: number) => (ridge(x, z) > 3 ? 0.55 : VILLAGES.some((v) => Math.hypot(x - v.x, z - v.z) < v.r + 25) ? 0.12 : 0.02) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.6, avoid });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
