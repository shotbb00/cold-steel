// Guadalcanal, September–October 1942: Henderson Field (1945 only; the big field, 1.0 × 1.12 km; the Pacific: the
// 1st Marine Division against the Imperial Japanese Army's 17th Army). The Marines landed in August and took the
// airstrip the Japanese had nearly finished on the Lunga plain; for the next three months the island's whole war was
// about that strip — the Cactus Air Force flew from it by day, the Tokyo Express shelled it by night, and the Japanese
// came at it overland: Kawaguchi's brigade up Edson's Ridge (Bloody Ridge) south of the field on 12–14 September, then
// the fights along the Matanikau to the west, then Maruyama's division out of the jungle in late October. Here
// Henderson Field lies across the middle of the map, neutral, with the "Pagoda" (the Japanese-built operations
// building) and the wrecked aircraft in their revetments beside it, Fighter One's grass strip to the east. The Marines
// come from Lunga Point on the coast (+z), the Japanese out of the jungle under Mount Austen (-z). The Matanikau runs
// down the west flank from the hills to the sea, crossed by a ford at its sandspit by the mouth (the Marines' end), a
// bridge level with the airfield and a ford upstream at the one-log crossing (the Japanese end). Fair, not mirrored:
// Edson's Ridge (Hill 123 and Hill 80, kunai grass on top) points at the field from the Japanese side; on the Marines'
// side the coral hills behind Kukum are raised into a ridge as high and as long, offset to the west; Point Cruz's knoll
// beyond the river for the Marines answers the Galloping Horse hills beyond it for the Japanese, each a ford away;
// the coconut plantations of the Lunga give the Marines' half its cover where the jungle gives the Japanese theirs,
// and the jungle runs down the river on both halves. The river is the same water on both sides' left flank.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createRiver } from '../world/River.js';
import { commandPost, shellField, trenchLine } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const BASE_Z = 500;
const BOUNDS = { x: 500, z: 560 };
const noise = createNoise2D(1942_09);

// the Matanikau down the west flank, from the hills (-z) to the sea (+z): the sandspit ford by its mouth, the bridge
// level with the field, the one-log crossing upstream
const MATANIKAU = [[-232, -640], [-250, -480], [-300, -330], [-272, -170], [-300, 10], [-290, 180], [-338, 340], [-332, 520], [-350, 640]];
const river = createRiver({
  paths: [MATANIKAU],
  halfWidth: 12,
  level: 0,
  depth: 2.6,
  valley: 50,
  crossings: [
    { name: 'Matanikau sandspit', x: -333, z: 330, kind: 'ford', width: 14 },
    { name: 'Matanikau bridge', x: -300, z: 10, kind: 'bridge', width: 8 },
    { name: 'One-log crossing', x: -299, z: -325, kind: 'ford', width: 14 },
  ],
});

/** The airstrips, along x: Henderson Field (Marston matting on coral) and Fighter One, the grass "Cow Pasture". */
const STRIPS = [{ x: 0, z: 0, len: 460, w: 40, h: 5 }, { x: 340, z: -30, len: 190, w: 30, h: 4.6 }];
const offStrip = (s: typeof STRIPS[number], x: number, z: number) => Math.max(Math.abs(x - s.x) - s.len / 2, Math.abs(z - s.z) - s.w / 2, 0);

// the hills: ridges [ax, az, bx, bz, width, height] and knolls [x, z, r, h]
const RIDGES: number[][] = [
  [35, -125, 10, -370, 50, 15],     // Edson's Ridge: a grassy spine pointing at the field from the south
  [-82, 125, -45, 375, 52, 15],     // the Kukum hills, raised into the Marines' ridge
  [-400, -290, -470, -170, 60, 10], // the Galloping Horse's long back
  [-400, 300, -470, 420, 50, 8],    // the coral behind Point Cruz
];
const KNOLLS: number[][] = [
  [30, -200, 40, 8],                // Hill 123, where Edson's men made their last stand
  [15, -320, 34, 5],                // Hill 80
  [-70, 210, 40, 8],                // the Kukum ridge's top
  [-55, 320, 34, 5],
  [-400, -290, 60, 12],             // the Galloping Horse
  [-400, 300, 50, 14],              // Point Cruz: a coral knob over the sea
  [-120, -660, 170, 30],            // the shoulder of Mount Austen beyond the jungle (-z)
  [160, 650, 170, 26],              // and the coastal rise by the Tenaru beyond Lunga Point (+z)
];
const seg = (x: number, z: number, [ax, az, bx, bz, w, h]: number[]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return h * Math.exp(-((Math.hypot(x - ax - dx * t, z - az - dz * t) / w) ** 2));
};
const knoll = (x: number, z: number, [kx, kz, r, h]: number[]) => h * Math.exp(-((Math.hypot(x - kx, z - kz) / r) ** 2));

/** The roads and trails: the coast road over the sandspit, the tracks to the field, the Japanese trails out of the jungle. */
const TRACKS: [number, number][][] = [
  [[-500, 345], [-333, 330], [-200, 400], [0, 440], [250, 420], [500, 380]],         // the coast road (Government Track)
  [[0, 500], [0, 440]],
  [[0, 440], [90, 300], [120, 140], [120, 22]],                                       // Lunga Point to the field
  [[0, 440], [-150, 260], [-220, 120], [-230, 10], [-300, 10], [-430, 30]],           // to the Matanikau bridge and over
  [[250, 420], [330, 270], [345, 60], [340, -15]],                                    // the Tenaru side to Fighter One
  [[0, -500], [0, -430]],
  [[0, -430], [-130, -330], [-299, -325], [-420, -300]],                              // the trail to the one-log crossing
  [[-130, -330], [-210, -140], [-230, 10]],                                           // the Japanese trail to the bridge
  [[0, -430], [130, -300], [125, -140], [120, -22]],                                  // Maruyama's trail to the field
  [[130, -300], [320, -270], [345, -90], [340, -45]],                                 // past Coffin Corner to Fighter One
];
function segDist(px: number, pz: number, [ax, az]: [number, number], [bx, bz]: [number, number]) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
const roadDist = (x: number, z: number) => {
  let d = Infinity;
  for (const t of TRACKS) for (let i = 0; i + 1 < t.length; i++) d = Math.min(d, segDist(x, z, t[i], t[i + 1]));
  return d;
};

/** The coconut plantations of the Lunga (Lever Brothers'): on the coastal plain behind Lunga Point and Kukum. */
const plantation = (x: number, z: number) => Math.max(
  smoothstep(1, 0.85, Math.hypot((x - 280) / 170, (z - 270) / 150)),
  smoothstep(1, 0.85, Math.hypot((x + 170) / 80, (z - 430) / 60)),
);
/** The jungle (0..1): rain forest on both halves by noise, thickest along the river and at the edges; not on the ridges' kunai grass. */
const jungle = (x: number, z: number) => {
  let k = smoothstep(-0.05, 0.25, fbm(noise, x * 0.006 + 11, z * 0.006 - 3, 3));
  k = Math.max(k, smoothstep(140, 60, Math.abs(river.project(x, z).d - 50)) * 0.9, smoothstep(400, 470, Math.abs(x)));
  k = Math.min(k, 1 - plantation(x, z), smoothstep(80, 140, STRIPS.reduce((m, s) => Math.min(m, offStrip(s, x, z)), Infinity)));
  return k * smoothstep(13, 8, ridgeTop(x, z));
};
const ridgeTop = (x: number, z: number) => RIDGES.slice(0, 2).reduce((s, r) => s + seg(x, z, r), 0) + KNOLLS.slice(0, 4).reduce((s, k) => s + knoll(x, z, k), 0);

function height(x: number, z: number) {
  let h = 3.2 + fbm(noise, x * 0.004, z * 0.004, 3) * 1.6 + fbm(noise, x * 0.03 + 5, z * 0.03, 2) * 0.35; // the Lunga plain
  h += RIDGES.reduce((s, r) => s + seg(x, z, r), 0) + KNOLLS.reduce((s, k) => s + knoll(x, z, k), 0);
  h += fbm(noise, x * 0.02 + 9, z * 0.02, 3) * 1.6 * smoothstep(6, 14, h);                                   // broken ground on the hills
  h += smoothstep(420, 540, Math.abs(x)) * 24;                                                              // the jungled hills beyond the flanks
  for (const s of STRIPS) h += (s.h - h) * smoothstep(40, 6, offStrip(s, x, z));                            // the strips: graded
  for (const bz of [BASE_Z, -BASE_Z]) h += (5 - h) * smoothstep(34, 18, Math.hypot(x, z - bz));
  return river.carve(x, z, Math.max(1.6, h));
}

const natoLayout = [{ unit: 'rifles', x: 0, z: BASE_Z - 18, name: '1st Battalion, 5th Marines' }];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Lunga Point', x: 0, z: 470, owner: 'nato', sector: 'centre' },
  { id: 'B', name: 'Point Cruz', x: -400, z: 300, owner: null, sector: 'west' },
  { id: 'C', name: 'Kukum ridge', x: -70, z: 210, owner: null, sector: 'centre' },
  { id: 'D', name: 'Alligator Creek', x: 330, z: 265, owner: null, sector: 'east' },
  { id: 'E', name: 'Matanikau bridge', x: -258, z: 12, owner: null, sector: 'west' },
  { id: 'F', name: 'Henderson Field', x: 0, z: 0, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Fighter One', x: 335, z: -28, owner: null, sector: 'east' },
  { id: 'H', name: 'Galloping Horse', x: -400, z: -290, owner: null, sector: 'west' },
  { id: 'I', name: 'Edson’s Ridge', x: 30, z: -200, owner: null, sector: 'centre' },
  { id: 'J', name: 'Coffin Corner', x: 320, z: -268, owner: null, sector: 'east' },
  { id: 'K', name: 'Mount Austen', x: 0, z: -470, owner: 'pact', sector: 'centre' },
];
const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);

export default {
  id: 'guadalcanal',
  name: 'Guadalcanal',
  description: 'September–October 1942: Henderson Field on the Lunga plain, Edson’s Ridge south of it, the Matanikau down the west flank — coconut plantations, kunai grass and rain forest under a hot, wet sky.',
  epochs: ['1945'],
  region: 'pacific',                                   // (the menu's Asia & Pacific: maps/index.js REGIONS)
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific's armies)
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['usmc'], pact: ['jp'] },            // (the 1st Marine Division against the 17th Army; the Army's Americal Division came in October — the US Army does not fight on the Pacific maps: data/factions.js)
  conditions: { time: 'day', weather: 'clear' },
  airfields: [],                                       // (Henderson Field is the prize, nobody's base: the Cactus Air Force and Rabaul's bombers come in from the map edge)
  size: 1600,
  segments: 640,
  bounds: BOUNDS,
  steep: 0.55, // (vehicles: the ridges' steeper faces and the hills beyond the flanks are for men)
  seed: 1942,
  height,
  river,
  bridgeAt: (x: number, z: number) => river.bridgeAt(x, z),
  woods: (x: number, z: number) => Math.max(jungle(x, z) * 0.9, plantation(x, z) * 0.3),

  theme: {
    // the Solomons in the wet season: a hot hazy sky, towering cloud, the light hard between the showers
    fogColor: 0xb4bcb0, fogDensity: 0.0009,
    skyTop: 0x5f86ac, skyHorizon: 0xc4ccc8, skyBottom: 0x8a9488,
    sunColor: 0xfff0d8, sunIntensity: 1.9, sunDisk: 0.25,
    clouds: 0.6, cloudLight: 0xf0f0ec, cloudDark: 0x8a9298,
    sunDir: [0.35, 0.75, 0.45],
    hemiSky: 0xc8d4d8, hemiGround: 0x3e4a2c, hemiIntensity: 1.25,
    rimColor: 0xd4dcd8, rimIntensity: 0.22,
    terrain: {
      grass: '#4f6a2c', grassAlt: '#46602a', dryGrass: '#8a8a4a', dirt: '#5e4a32', rock: '#9a9282',
      pasture: '#5a7034', ploughed: '#5a4630', stubble: '#8a8648', meadow: '#5a7430',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0, // (no farmland: the plantations and the kunai are painted below)
      surface(x: number, z: number) {
        const rd = roadDist(x, z);
        if (rd < 4) return [0x7a6a4c, smoothstep(4, 2, rd) * 0.85];                                        // the tracks: coral grit and mud
        const s = Math.min(offStrip(STRIPS[0], x, z), 999);
        if (s < 0.5) return [0x6c6a5c, 0.9];                                                               // Henderson: Marston matting on rolled coral
        if (offStrip(STRIPS[1], x, z) < 0.5) return [0x7c8a46, 0.6];                                       // Fighter One: mown grass
        if (s < 30) return [0x8a7a58, 0.5 * smoothstep(30, 4, s)];                                         // the graded apron, churned by bombs
        if (ridgeTop(x, z) > 7 || (jungle(x, z) < 0.3 && plantation(x, z) < 0.3 && fbm(noise, x * 0.01 - 7, z * 0.01, 2) > 0.1))
          return [0xa49e5a, 0.55];                                                                         // kunai grass: tall, pale, sharp
        if (plantation(x, z) > 0.4) return [0x5c6e36, 0.4];                                               // the plantations' cut grass
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: BASE_Z, entries: [-150, 0, 160] }, pact: { x: 0, z: -BASE_Z, entries: [-150, 0, 150] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -400 } },
  points,

  spawns: {
    nato: natoLayout.map((s) => ({ ...s, facing: Math.PI })),
    pact: natoLayout.map((s) => ({ ...s, x: -s.x, z: -s.z, facing: 0, name: '124th Infantry Regiment' })),
  },

  /** Weeks of bombing and naval shelling on the field, the ridges dug over; each side's line on its own ridge. */
  battlefield() {
    const density = (x, z) => 0.06 + 0.9 * smoothstep(90, 10, offStrip(STRIPS[0], x, z)) + 0.4 * smoothstep(40, 10, offStrip(STRIPS[1], x, z)) + 0.4 * smoothstep(6, 14, ridgeTop(x, z));
    // (shellField scatters one half and mirrors it: keep its first half each time, the second from another seed turned round)
    const half = (seed, f) => shellField(seed, BOUNDS, f).filter((_, i) => i % 2 === 0);
    const blasts = [...half(1942_0912, density), ...half(1942_1024, (x, z) => density(-x, -z)).map(([x, z, r, d]) => [-x, -z, r, d])];
    const works: any[] = [];
    const lines: [string, [number, number][]][] = [
      ['nato', [[-110, 175], [-85, 168], [-55, 170], [-30, 180]]],      // the Kukum ridge, facing the field
      ['nato', [[-430, 270], [-405, 262], [-378, 268]]],                // Point Cruz
      ['pact', [[65, -170], [40, -162], [15, -165], [-5, -175]]],       // Hill 123 (lines run left to right as their owner faces north)
      ['pact', [[-370, -258], [-398, -250], [-428, -256]]],             // the Galloping Horse
    ];
    for (const [f, l] of lines) works.push(...trenchLine(l, f, { zig: 1, belts: 0 }));
    return { blasts, ruins: [], works };
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const R = mulberry32(1942);
    // ---- Henderson Field: the matting down the strip, revetments along its north side, the wrecks, the Pagoda
    {
      const s = STRIPS[0];
      for (let x = s.x - s.len / 2 + 6; x < s.x + s.len / 2; x += 12) props.box('stone', x, terrain.heightAt(x, s.z) + 0.04, s.z, 12.2, 0.12, 30, 0, 0x6e6c62);
      for (let i = 0; i < 7; i++) { // the revetments: horseshoes of coral and logs, the aircraft dead in some of them
        const x = -180 + i * 60, z = i % 2 ? 58 : -58, g = terrain.heightAt(x, z), side = Math.sign(z);
        if (near(x, z, 14) || roadDist(x, z) < 12) continue;
        props.box('plain', x, g + 1.1, z + side * 7, 16, 2.2, 2.6, 0, 0x6a5e44);
        props.box('plain', x - 8, g + 1.1, z, 2.6, 2.2, 14, 0, 0x6a5e44);
        props.box('plain', x + 8, g + 1.1, z, 2.6, 2.2, 14, 0, 0x6a5e44);
        if (R() < 0.6) props.aircraftWreck({ x, z, yaw: R() * 6.28, scale: 0.7 });
      }
      // the Pagoda: the Japanese-built operations building north of the strip, three timber storeys under curved roofs
      const px = 70, pz = 50, g = terrain.heightAt(px, pz);
      for (let k = 0; k < 3; k++) {
        const w = 9 - k * 2.2, y = g + k * 3.2;
        props.box('plain', px, y + 1.4, pz, w, 2.8, w, 0, 0x7a6448);
        props.box('plain', px, y + 3.0, pz, w + 2.6, 0.4, w + 2.6, 0, 0x4a3a2c);
      }
      cover.addBox({ x: px, z: pz, yaw: 0, length: 9, thickness: 9, height: 6 });
      props.tent({ x: 110, z: 60, yaw: 0.2, color: 0x5a5e3e });
      props.crates({ x: -120, z: 48, yaw: 0.1 });
      props.crates({ x: 150, z: -50, yaw: 2.2 });
    }
    // ---- Fighter One: wrecks and a fuel dump beside the grass
    for (let i = 0; i < 3; i++) props.aircraftWreck({ x: STRIPS[1].x - 60 + i * 55, z: STRIPS[1].z + (i % 2 ? 32 : -32), yaw: R() * 6.28, scale: 0.7 });
    for (let i = 0; i < 6; i++) props.box('metal', 300 + i * 2.2, terrain.heightAt(300 + i * 2.2, 18) + 0.6, 18, 0.9, 1.2, 0.9, 0, 0x5a5a3c); // the drums
    // ---- Kukum: the native village and the Marines' stores by the coast road
    for (let i = 0; i < 12; i++) {
      const x = -230 + R() * 140, z = 380 + R() * 70;
      if (near(x, z, 14) || roadDist(x, z) < 10) continue;
      const g = terrain.heightAt(x, z), yaw = R() * 3;
      props.box('plain', x, g + 1.2, z, 5, 1.6, 7, yaw, 0x7a6a48);
      props.box('plain', x, g + 2.4, z, 6, 0.9, 8.2, yaw, 0x8a7a50); // (thatch)
      cover.addBox({ x, z, yaw, length: 7, thickness: 5, height: 2 });
    }
    // ---- the coconut plantations: palms in rows, the odd one shot through
    for (let x = -480; x < 480; x += 11) for (let z = 100; z < 470; z += 11) {
      const jx = x + (R() - 0.5) * 2, jz = z + (R() - 0.5) * 2;
      if (plantation(jx, jz) < 0.5 || R() < 0.12 || near(jx, jz, 18) || roadDist(jx, jz) < 7 || Math.hypot(jx, jz - BASE_Z) < 34) continue;
      props.palm({ x: jx, z: jz, height: R() < 0.1 ? 3 + R() * 3 : 9 + R() * 6 });
    }
    // ---- Point Cruz and the Galloping Horse: coral outcrops
    for (const [cx, cz] of [[-400, 300], [-400, -290]]) {
      for (let i = 0; i < 18; i++) {
        const x = cx + (R() - 0.5) * 130, z = cz + (R() - 0.5) * 110;
        if (near(x, z, 12) || roadDist(x, z) < 6 || river.project(x, z).d < river.halfWidth + 10) continue;
        props.boulder({ x, z, radius: 0.8 + R() * 1.8 });
      }
    }
    // ---- gun pits behind each ridge, the Japanese supply dumps in the jungle
    for (const [x, z] of [[-90, 260], [-40, 285], [-110, 300]]) props.sandbagRing({ x, z, radius: 4, toward: 1 });
    for (const [x, z] of [[60, -250], [10, -275], [70, -295]]) props.sandbagRing({ x, z, radius: 4, toward: -1 });
    for (let i = 0; i < 4; i++) props.crates({ x: -80 + i * 50, z: -400 - R() * 20, yaw: R() * 3 });
    for (let i = 0; i < 4; i++) props.crates({ x: -90 + i * 55, z: 405 + R() * 20, yaw: R() * 3 });
    commandPost(props, this.bases.nato, -1, 0x4e5236);
    commandPost(props, this.bases.pact, 1, 0x6a6444);
    props.finish();
    river.build(scene, terrain);

    const nearWater = (x: number, z: number, r: number) => river.project(x, z).d < river.halfWidth + r;
    const avoid = [{ x: 0, z: BASE_Z, r: 30 }, { x: 0, z: -BASE_Z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      ...river.crossings.map((c) => ({ x: c.x, z: c.z, r: river.halfWidth + 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 8 || nearWater(x, z, 2) || STRIPS.some((s) => offStrip(s, x, z) < 30) }];
    // the rain forest: broadleaf, dense; cleared round the field, thin on the ridges' kunai
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x - 10, count: 7000, broadleaf: 1, autumn: 0, maxY: 80, size: 1.15,
      forest: (x: number, z: number) => {
        if (near(x, z, 30) || plantation(x, z) > 0.4) return -1;
        const j = jungle(x, z);
        return j > 0.5 ? 1 : j * 0.15;
      },
    });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: null });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
