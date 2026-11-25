// Red Beach, Guadalcanal, 7 August 1942 (1945 only; coastal landing, the Pacific: the 1st Marine Division against the
// Imperial Japanese Navy’s garrison and, two weeks later, the Army’s Ichiki detachment; 1.0 × 1.8 km). Operation
// Watchtower, the first American landing of the war: the Marines came over the side into Higgins boats off the north
// coast of Guadalcanal and ran in to Red Beach, east of Lunga Point, at 09:10, behind the cruisers’ shelling. Nobody
// shot at them. The Japanese on the Lunga plain were mostly the 11th and 13th Construction Units — two thousand
// labourers building an airstrip — and a few hundred naval troops; they ran for the jungle and left their camp at
// Lunga Point, their rice, their trucks and road rollers, their ice plant and the nearly finished strip (the Marines
// named it Henderson Field). The 1st Marines pushed south-west through the plantation and the jungle for the "Grassy
// Knoll" — Mount Austen, which turned out to be miles away — and the 5th Marines went west along the coast over the
// Ilu’s sandspit to the Lunga. Then, on 21 August, Colonel Ichiki’s detachment of the 28th Infantry, landed by
// destroyer at Taivu Point, came along the coast in the night and charged the Marines’ line on the sandspit at the
// Ilu’s mouth (the Battle of the Tenaru: the Marines took the Ilu for the Tenaru) and died there.
// On the map, sea to the north (+z), west to the left (-x): Lunga Point and the Lunga’s open mouth in the west, the
// Japanese camp beside it; the Ilu (Alligator Creek) in the middle, its mouth closed by the sandspit, a lagoon behind
// it, two fords upstream; Red Beach east of it, Lever Brothers’ coconut plantation in rows behind the sand. Inland
// the kunai grass and the jungle, the half-built airstrip on the plain between the two rivers, the Grassy Knoll’s
// kunai-topped spur in the east, Mount Austen’s jungled foothills across the south edge.
// How it plays: the beaches are almost undefended — a strongpoint at Lunga Point, riflemen in the trees — and the
// boats get ashore. The fight is inland: the camp, the strip and the knoll, each held by the garrison in the grass
// and the jungle, the coast gun south of the strip laid on the beach; then the Ichiki detachment comes out of the
// jungle at the beachhead (landing.counter). The rivers channel everything to the sandspit and the fords.
// Not point-mirrored: one side lands, the other holds (modes/landing).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1942_0807);
const sea = createSea({ level: 0, size: SIZE, color: 0x245e70 }); // (Sealark Channel — soon Ironbottom Sound: deep blue-green)

/** Lunga Point: the low, palm-covered point at the Lunga’s mouth, out past the rest of the shore. */
const lungaPoint = (x: number) => 42 * Math.exp(-(((x + 445) / 48) ** 2));
/** The waterline (z): a long, nearly straight shore, Lunga Point out in the west. */
export const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 3.3, 2) * 8 + lungaPoint(x);
/** How far inland (m from the waterline; < 0 at sea). */
const inland = (x: number, z: number) => shoreZ(x) - z;

/** The rivers, from out at sea to their heads: the Lunga, wide and open at its mouth; the Ilu (Alligator Creek), barred by the sandspit. */
const LUNGA: [number, number][] = [[-428, 300], [-425, 160], [-412, 20], [-432, -190], [-408, -420], [-430, -640], [-415, -960]];
const ILU: [number, number][] = [[-118, 300], [-118, 150], [-104, 60], [-80, -150], [-42, -350], [-2, -520], [26, -690]];
function lineDist(x: number, z: number, pts: [number, number][]) {
  let d = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}
const lungaD = gridCacheSmooth((x: number, z: number) => lineDist(x, z, LUNGA), BOUNDS, 2);
const iluD = gridCacheSmooth((x: number, z: number) => lineDist(x, z, ILU), BOUNDS, 2);
/** x of the Ilu’s mouth at the waterline (the sandspit across it). */
const ILU_MOUTH = -112;
/** The fords: the shallows where men and vehicles cross (the rivers elsewhere are too deep to wade). */
const FORDS = [
  { name: 'Ilu log crossing', x: -78, z: -160, r: 15 },
  { name: 'Ilu upper ford', x: -10, z: -485, r: 15 },
  { name: 'Lunga ford', x: -420, z: -300, r: 16 },
];
const fordK = (x: number, z: number) => Math.max(...FORDS.map((f) => smoothstep(f.r + 14, f.r - 4, Math.hypot(x - f.x, z - f.z))));

/** The half-built airstrip on the Lunga plain: graded coral and gravel, along x. */
export const STRIP = { x: -235, z: -330, len: 270, w: 40, h: 4.2 };
const offStrip = (x: number, z: number) => Math.max(Math.abs(x - STRIP.x) - STRIP.len / 2, Math.abs(z - STRIP.z) - STRIP.w / 2, 0);
/** The Japanese camp at Lunga Point: huts, tents, the ice plant, the stores. */
const CAMP = { x: -320, z: -10, r: 70 };
/** The Grassy Knoll: Mount Austen’s northern spur, kunai on top. */
const KNOLL = { x: 230, z: -420, r: 95, h: 26 };
const PACT_BASE = { x: 0, z: -830 };

/** The ground without the rivers: the beach, the plain, the knoll, Mount Austen’s foothills rising to the south. */
const knollH = (x: number, z: number) => KNOLL.h * Math.exp(-((Math.hypot(x - KNOLL.x, (z - KNOLL.z) * 0.8) / KNOLL.r) ** 2));
const foothills = (z: number) => 30 * smoothstep(-520, -940, z);
function ground(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) return Math.max(-16, -0.6 + d * 0.03 - Math.max(0, -d - 150) * 0.06); // the bottom: shelving off the beach
  const plain = 2.6 + fbm(noise, x * 0.004, z * 0.004, 3) * 1.4 + fbm(noise, x * 0.03 + 5, z * 0.03, 2) * 0.35
    + smoothstep(150, 700, d) * 3 + foothills(z) * (0.75 + fbm(noise, x * 0.006 - 4, z * 0.006, 3) * 0.5);
  let h = 0.35 + 1.4 * smoothstep(0, 26, d) + smoothstep(22, 120, d) * (plain - 1.75);
  h += knollH(x, z) * (1 + fbm(noise, x * 0.02, z * 0.02, 2) * 0.2);
  h += (STRIP.h - h) * smoothstep(40, 6, offStrip(x, z));                                   // the strip: graded
  h += (3 - h) * smoothstep(CAMP.r + 20, CAMP.r - 20, Math.hypot(x - CAMP.x, z - CAMP.z)) * 0.6; // the camp: level ground
  h += (2.6 + 3 + foothills(PACT_BASE.z) - h) * smoothstep(55, 25, Math.hypot(x - PACT_BASE.x, z - PACT_BASE.z));
  return h;
}

/** A river’s cut: the valley falling to its banks, the bed under the water (deep: no wading; the fords: shallow, with gentle ramps). */
function carve(h: number, x: number, z: number, dist: number, hw: number, deepBed: number) {
  const f = fordK(x, z), e = dist - hw;
  if (e > 70) return h;
  const bed = deepBed + (-0.5 - deepBed) * f;
  h = Math.min(h, 1.3 + Math.max(0, e) * (0.14 - 0.08 * f));                                 // the valley
  return h + (Math.min(h, bed) - h) * smoothstep(4 + 14 * f, -2, e);
}
function height(x: number, z: number) {
  let h = ground(x, z);
  const d = inland(x, z);
  if (d < -40) return h;
  // the Lunga: 30 m of brown water, open to the sea at Lunga Point
  h = carve(h, x, z, lungaD(x, z), 14 + 6 * smoothstep(120, 20, d), -2.4);
  // the Ilu: the sandspit across its mouth (the bar: dry sand men and tanks cross), the lagoon behind it, the creek upstream
  const bar = smoothstep(14, 4, Math.abs(d - 12)) * smoothstep(60, 40, Math.abs(x - ILU_MOUTH));
  const hw = 9 + 12 * smoothstep(110, 50, d), head = smoothstep(-600, -690, z);
  const cut = carve(h, x, z, iluD(x, z), hw * (1 - head * 0.4), -1.7 + head * 1.4);
  h = cut + (Math.max(cut, 0.5 + 0.4 * smoothstep(20, 4, Math.abs(d - 12))) - cut) * bar;
  return h;
}

/** Soft going: the beach’s sand, the rivers’ mud banks. */
const riverEdge = gridCache((x: number, z: number) => Math.min(lungaD(x, z) - 14, iluD(x, z) - 10), BOUNDS);
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 24) return foot ? 0.85 : 0.6;
  if (riverEdge(x, z) < 6) return foot ? 0.75 : 0.5;
  return 1;
}

/** The tracks: the coast track behind the beach, the camp to the strip, the strip and the beach to the knoll, the Japanese trail south. */
const TRACKS: [number, number][][] = [
  [[-500, 105], [-330, 100], [-120, 100], [100, 108], [500, 112]],
  [[-320, 60], [-320, -10], [-290, -150], [-240, -305]],
  [[-100, -330], [-78, -160], [-60, 0], [-90, 95]],
  [[220, 105], [210, -100], [220, -330]],
  [[-235, -350], [-160, -520], [-10, -485], [0, -800]],
  [[-10, -485], [130, -470], [215, -440]],
];
const roadDist = gridCache((x: number, z: number) => Math.min(...TRACKS.map((t) => lineDist(x, z, t))), BOUNDS);

/** Lever Brothers’ coconut plantations: behind Red Beach and round the camp at Lunga. */
const plantationK = (x: number, z: number) => {
  const d = inland(x, z);
  return Math.max(
    smoothstep(1, 0.85, Math.hypot((x - 210) / 260, (d - 170) / 140)),
    smoothstep(1, 0.85, Math.hypot((x + 300) / 110, (d - 120) / 90)),
  ) * smoothstep(26, 40, d);
};
/** The jungle (0..1): rain forest along the rivers, in patches on the plain, solid in the foothills; never on the knoll’s kunai top, the strip or the plantations. */
const jungleK = gridCache((x: number, z: number) => {
  let k = smoothstep(0.05, 0.3, fbm(noise, x * 0.006 + 11, z * 0.006 - 3, 3));
  k = Math.max(k, smoothstep(80, 30, riverEdge(x, z)) * 0.95, smoothstep(-520, -640, z));
  k = Math.min(k, 1 - plantationK(x, z), smoothstep(60, 120, offStrip(x, z)), smoothstep(15, 9, knollH(x, z)));
  return k * smoothstep(30, 60, inland(x, z)) * smoothstep(55, 90, Math.hypot(x - CAMP.x, z - CAMP.z)) * smoothstep(50, 80, Math.hypot(x - PACT_BASE.x, z - PACT_BASE.z));
}, BOUNDS);

const SECTORS = [
  { x: -330, name: 'Lunga Point' },
  { x: -88, name: 'Ilu sandspit' },
  { x: 220, name: 'Red Beach' },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies inland of each once taken)
  { id: 'B', name: 'Lunga Point', x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) - 30, owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Ilu sandspit', x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) - 22, owner: null, sector: 'centre', radius: 40, opens: 'F' },
  { id: 'D', name: 'Red Beach', x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) - 30, owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: 'Japanese camp', x: CAMP.x, z: CAMP.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Lunga airstrip', x: STRIP.x + 40, z: STRIP.z, owner: null, sector: 'centre', radius: 32 },
  { id: 'G', name: 'Grassy Knoll', x: KNOLL.x, z: KNOLL.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Mount Austen', x: PACT_BASE.x, z: PACT_BASE.z + 40, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);

/** The cruisers’ and destroyers’ shelling before H-hour, and the carrier planes’: on Lunga Point, the camp and the strip. */
function craters() {
  const r = mulberry32(1942_0807), out: number[][] = [];
  for (let i = 0; i < 900; i++) {
    const x = (r() * 2 - 1) * 480, z = 140 - r() * 720, d = inland(x, z);
    if (d < 30 || riverEdge(x, z) < 6 || offStrip(x, z) < 1) continue;
    const near = Math.max(smoothstep(110, 0, Math.hypot(x - CAMP.x, z - CAMP.z)), smoothstep(80, 0, offStrip(x, z)) * 0.7, smoothstep(120, 40, d) * 0.4);
    if (r() > 0.08 + near * 0.6) continue;
    const big = r();
    out.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10, 3 + big * 5, 0.4 + big * big * 1.3]);
  }
  return out;
}

export default {
  id: 'red-beach',
  name: 'Red Beach',
  description: '7 August 1942: the 1st Marine Division lands on Red Beach east of Lunga Point, Guadalcanal — coconut plantations, the Ilu’s sandspit and the Lunga, kunai grass and jungle, the Japanese camp and the half-built airstrip, Mount Austen behind. Then the Ichiki detachment comes out of the jungle.',
  epochs: ['1945'],
  theatre: 'coastal',
  region: 'pacific',
  pacific: true,                                       // (data/factions.js armiesFrom: the Pacific’s armies)
  modes: ['landing'],
  sides: { nato: 'United States', pact: 'Japan' },
  armies: { nato: ['usmc'], pact: ['jp'] },            // (the 1st Marine Division; the Japanese garrison and the 28th Infantry’s Ichiki detachment)
  airfields: [],                                       // (the strip is half built and the prize, nobody’s base: the carriers’ Wildcats and Dauntlesses and Rabaul’s bombers come in from the map edge)
  conditions: { time: 'day', weather: 'clear' },       // (a hot, still morning; the haze of the shelling over the plain)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.55,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1942,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => Math.max(jungleK(x, z) * 0.9, plantationK(x, z) * 0.3),

  theme: {
    // the Solomons in August: a hot hazy sky, towering cloud, hard light
    fogColor: 0xb4bcb0, fogDensity: 0.0006,
    skyTop: 0x5f86ac, skyHorizon: 0xc4ccc8, skyBottom: 0x8a9488,
    sunColor: 0xfff0d8, sunIntensity: 1.9, sunDisk: 0.25,
    clouds: 0.55, cloudLight: 0xf0f0ec, cloudDark: 0x8a9298,
    sunDir: [0.35, 0.75, 0.45],
    hemiSky: 0xc8d4d8, hemiGround: 0x3e4a2c, hemiIntensity: 1.25,
    rimColor: 0xd4dcd8, rimIntensity: 0.22,
    terrain: {
      grass: '#4f6a2c', grassAlt: '#46602a', dryGrass: '#8a8a4a', dirt: '#5e4a32', rock: '#9a9282',
      pasture: '#5a7034', ploughed: '#5a4630', stubble: '#8a8648', meadow: '#5a7430',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0, // (no farmland: the plantations and the kunai are painted below)
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < -2) return [y > -1.4 ? 0x8a826a : 0x5e5a4c, 1];                                  // the bottom: grey volcanic sand
        if (d < 24) return [0x8e8670, 1];                                                         // the beach: dark grey-brown sand
        if (riverEdge(x, z) < 3) return [0x5a4a36, 0.9];                                          // the rivers’ mud banks
        const rd = roadDist(x, z);
        if (rd < 3.5) return [0x7a6a4c, smoothstep(3.5, 1.5, rd) * 0.85];                         // the tracks: coral grit and mud
        const s = offStrip(x, z);
        if (s < 0.5) return [x > STRIP.x + 70 ? 0x7a7466 : 0x9a9482, 0.9];                        // the strip: rolled coral, the east end still raw gravel
        if (s < 25) return [0x8a7a58, 0.6 * smoothstep(25, 4, s)];                                // the graded apron
        if (Math.hypot(x - CAMP.x, z - CAMP.z) < CAMP.r * 0.8) return [0x7a6a4e, 0.55];           // the camp’s trodden yards
        if (plantationK(x, z) > 0.4) return [0x5c6e36, 0.45];                                     // the plantations’ cut grass
        if (jungleK(x, z) < 0.3 && fbm(noise, x * 0.01 - 7, z * 0.01, 2) > -0.05) return [0xa49e5a, 0.55]; // kunai grass: tall, pale, sharp
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the three beach sectors)
           pact: { x: PACT_BASE.x, z: PACT_BASE.z, entries: [-250, 0, 250] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 300 }, pact: { x: -60, z: -250 } },
  points,

  battlefield() { return { blasts: craters(), ruins: [], works: [] }; },

  landing: {
    // the boats (data/units45/ships.js: the US names — Higgins boats and LCTs)
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    // what the landing may call in at sea: the destroyers inshore, the minesweepers (the old four-stackers), the cruisers
    // that shelled the beach (Quincy, Vincennes, Astoria: all three sunk off Savo two nights later)
    navy: ['destroyer', 'minesweeper', 'cruiser'],
    // almost nothing on the beach (data/units45/atlanticWall.js, the Japanese variants): a strongpoint by the camp at Lunga
    // Point, the naval gun dug in south of the strip
    forts: [
      { unit: 'wn', x: -280, z: shoreZ(-280) - 60, facing: 0 },
      { unit: 'battery', x: -120, z: -560, facing: 0 },
      { unit: 'wn', x: STRIP.x + 150, z: STRIP.z + 25, facing: 0 },   // the strip’s east end, dug in by the naval troops
      { unit: 'wn', x: KNOLL.x + 10, z: KNOLL.z + 30, facing: 0 },    // the knoll’s crest
    ],
    // a little wire and digging round the camp and the strip; mines only on the strip’s approach (the garrison had no time)
    works: [
      ...[-350, -320, -290, -260].map((x) => ({ kind: 'wire', x, z: shoreZ(x) - 45, yaw: 0 })),
      { kind: 'trench', x: CAMP.x - 30, z: CAMP.z + 50, yaw: 0 }, { kind: 'trench', x: CAMP.x + 30, z: CAMP.z + 45, yaw: 0 },
      { kind: 'mgNest', x: CAMP.x + 60, z: CAMP.z + 20, yaw: 0 },
      { kind: 'trench', x: STRIP.x + 40, z: STRIP.z + 40, yaw: 0 }, { kind: 'trench', x: STRIP.x + 110, z: STRIP.z + 30, yaw: 0 },
      { kind: 'mgNest', x: STRIP.x + 135, z: STRIP.z + 5, yaw: Math.PI / 2 }, { kind: 'mines', x: STRIP.x + 150, z: STRIP.z + 50 },
      { kind: 'trench', x: KNOLL.x - 20, z: KNOLL.z + 45, yaw: 0 }, { kind: 'mgNest', x: KNOLL.x + 25, z: KNOLL.z + 40, yaw: 0 },
    ],
    obstacles: [],
    // the defence at H-hour: a few riflemen in the trees behind the beach; the rest back at the camp, the strip, the knoll
    hold: [
      { x: SECTORS[0].x + 40, z: shoreZ(SECTORS[0].x) - 90 }, { x: SECTORS[2].x - 40, z: shoreZ(SECTORS[2].x) - 110 },
      { x: -60, z: shoreZ(-60) - 80 },
      { x: CAMP.x, z: CAMP.z - 10 }, { x: CAMP.x + 40, z: CAMP.z + 25 },
      { x: STRIP.x + 40, z: STRIP.z + 30 }, { x: STRIP.x + 120, z: STRIP.z - 20 }, { x: STRIP.x - 60, z: STRIP.z + 25 },
      { x: KNOLL.x, z: KNOLL.z + 20 }, { x: KNOLL.x - 50, z: KNOLL.z + 40 },
      { x: STRIP.x + 170, z: STRIP.z - 30 }, { x: KNOLL.x + 45, z: KNOLL.z - 10 }, { x: CAMP.x - 40, z: CAMP.z - 40 },
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'scouts', 'mortar', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mgTeam'],
    names: { wn: 'Strongpoint', battery: 'Naval gun', rifles: 'Naval landing squad' },
    // the Ichiki detachment: out of the jungle in the east, at the beachhead with the bayonet
    counter: { t: 420, units: ['rifles', 'rifles', 'mgTeam', 'rifles', 'engineers', 'rifles', 'mgTeam', 'rifles', 'atTeam', 'rifles', 'mortar', 'rifles'],
      say: 'The Ichiki detachment is here: the 28th Infantry, straight out of the jungle at the beachhead',
      sayOther: 'Japanese infantry coming out of the jungle in strength: a banzai charge on the beachhead' },
    // the landing’s AI (ai/LandingDirector.js): no sea mines, no sweeper; two destroyers inshore, a cruiser offshore later
    ai: { order: ['rifles', 'rifles', 'engineers', 'rifles', 'mgTeam', 'tank', 'rifles', 'atTeam', 'mortar', 'rifles', 'tank', 'rifles'], gunship: 'destroyer', gunships: 2, heavy: 'cruiser' },
    economy: { reserves: 2400, perSector: 500, beachIncome: 0.95, defenceCp: 1200, defenceIncome: 2.0 }, // (AI vs AI 2026-11-22: 2400/700/0.9 with a thinner defence fell by 657 s; 2000/0.75 and 2200/0.85 held four times; these: a win at 1460 s, a hold)
    // H-hour, 09:10: the 5th and 1st Marines go in, most of them to Red Beach
    waves: [{ t: 0, say: 'H-hour: the Higgins boats are going in — and nobody is shooting', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'tank', sector: 2 }, { unit: 'mgTeam', sector: 2 },
    ] }],
  },

  spawns: {
    // (between the boat lanes, bows to the shore)
    nato: [{ unit: 'destroyer', x: -210, z: 800, facing: Math.PI / 2 }, { unit: 'destroyer', x: 65, z: 810, facing: -Math.PI / 2 }],
    pact: [],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1942_08);
    props.rand = r;
    sea.build(scene, terrain);
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 5 + rr && !nearPoint(x, z, 14 + rr) && riverEdge(x, z) > 6 + rr && inland(x, z) > 28 + rr && offStrip(x, z) > 8 + rr;

    // ---- the Japanese camp at Lunga Point: thatched huts and tents in rows, the stores, the ice plant, the radio mast
    for (let i = 0; i < 60; i++) {
      const a = r() * Math.PI * 2, dd = 18 + r() * (CAMP.r - 10), x = CAMP.x + Math.cos(a) * dd, z = CAMP.z + Math.sin(a) * dd;
      if (!free(x, z, 3) || Math.hypot(x + 280, z - shoreZ(-280) + 60) < 26) continue;
      const yaw = Math.round(r() * 2) * (Math.PI / 2) + (r() - 0.5) * 0.1;
      if (r() < 0.45) {
        props.box('plain', x, g(x, z) + 1.2, z, 5, 2.4, 8, yaw, 0x7a6a48);       // a hut on its posts
        props.box('plain', x, g(x, z) + 2.8, z, 6.2, 1, 9.2, yaw, 0x8a7a50);     // its thatch
        cover.addBox({ x, z, yaw, length: 8, thickness: 5, height: 2.4 });
      } else if (r() < 0.6) props.tent({ x, z, yaw, color: 0x6a6448 });
      else props.crates({ x, z, yaw });                                         // the rice and the stores they left
    }
    props.hall({ x: CAMP.x - 35, z: CAMP.z - 45, yaw: 0.1, width: 18, depth: 10, height: 5, color: 0x8a7e66, roof: 0x5a564e, door: 4, name: 'ice plant' });
    props.hall({ x: CAMP.x + 30, z: CAMP.z - 55, yaw: -0.05, width: 14, depth: 8, height: 4, color: 0x7a6a50, roof: 0x4e4a40, door: 4, name: 'power house' });
    props.mast({ x: CAMP.x + 52, z: CAMP.z - 30, height: 18 });
    for (const [x, z, yaw] of [[-300, 35, 0.4], [-270, -50, 1.9], [-350, -60, 2.8]] as [number, number, number][]) if (free(x, z, 2)) props.wreckCar({ x, z, yaw }); // (the trucks they left)
    // the jetty at Lunga Point
    for (let s = 4; s < 70; s += 6) {
      const x = -372, z = shoreZ(x) + s;
      props.box('plain', x, 1.3, z, 4, 0.4, 6.2, 0, 0x6a5a46);
      for (const k of [-1, 1]) props.box('plain', x + k * 1.7, -1.2, z, 0.4, 5, 0.4, 0, 0x4a4038);
    }

    // ---- the airstrip: the construction camp along its north side, road rollers, log piles; the Pagoda going up
    for (let i = 0; i < 9; i++) {
      const x = STRIP.x - 120 + i * 30 + (r() - 0.5) * 6, z = STRIP.z + 38 + r() * 10;
      if (!free(x, z, 2)) continue;
      if (i % 3 === 0) props.logPile({ x, z, yaw: r() * 0.4, length: 8 });
      else if (i % 3 === 1) props.tent({ x, z, yaw: 0, color: 0x6a6448 });
      else props.crates({ x, z, yaw: r() });
    }
    for (const x of [STRIP.x + 95, STRIP.x + 118]) props.wreckCar({ x, z: STRIP.z - 8, yaw: 0 }); // (the road rollers at the raw east end)
    props.timberHangar({ x: STRIP.x - 70, z: STRIP.z - 52, yaw: 0 });
    {
      const px = STRIP.x + 10, pz = STRIP.z + 62, y = g(px, pz); // the Pagoda: the operations building, two storeys up of three
      for (let k = 0; k < 2; k++) {
        const w = 9 - k * 2.2, yy = y + k * 3.2;
        props.box('plain', px, yy + 1.4, pz, w, 2.8, w, 0, 0x7a6448);
        props.box('plain', px, yy + 3.0, pz, w + 2.6, 0.4, w + 2.6, 0, 0x4a3a2c);
      }
      cover.addBox({ x: px, z: pz, yaw: 0, length: 9, thickness: 9, height: 6 });
    }

    // ---- the coconut plantations: palms in rows, the odd one shot through
    for (let x = -490; x < 490; x += 10) for (let z = -120; z < 160; z += 10) {
      const jx = x + (r() - 0.5) * 1.5, jz = z + (r() - 0.5) * 1.5;
      if (plantationK(jx, jz) < 0.5 || r() < 0.1 || !free(jx, jz, 1) || Math.hypot(jx - CAMP.x, jz - CAMP.z) < CAMP.r * 0.9) continue;
      props.palm({ x: jx, z: jz, height: r() < 0.08 ? 3 + r() * 3 : 10 + r() * 6 });
    }
    // palms along the top of the beach everywhere, and on Lunga Point
    for (let x = -490; x < 490; x += 9) {
      const z = shoreZ(x) - 27 - r() * 8;
      if (r() < 0.35 || roadDist(x, z) < 5 || nearPoint(x, z, 14) || riverEdge(x, z) < 6 || Math.abs(x - ILU_MOUTH) < 50) continue;
      props.palm({ x, z, height: 8 + r() * 6 });
    }

    // ---- the Grassy Knoll: rocks in the kunai
    for (let i = 0; i < 16; i++) {
      const x = KNOLL.x + (r() - 0.5) * 160, z = KNOLL.z + (r() - 0.5) * 140;
      if (!free(x, z, 2)) continue;
      props.boulder({ x, z, radius: 0.8 + r() * 1.6 });
    }
    commandPost(props, PACT_BASE, 1, 0x6a6444);
    props.finish();

    const avoid = [{ x: PACT_BASE.x, z: PACT_BASE.z, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 16 })),
      ...FORDS.map((f) => ({ x: f.x, z: f.z, r: f.r + 10 })),
      { test: (x: number, z: number) => roadDist(x, z) < 6 || riverEdge(x, z) < 3 || offStrip(x, z) < 26 || inland(x, z) < 30 || Math.hypot(x - CAMP.x, z - CAMP.z) < CAMP.r * 0.85 || Math.abs(inland(x, z) - 12) < 30 && Math.abs(x - ILU_MOUTH) < 60 }];
    // the rain forest: broadleaf, dense; open on the kunai, cleared round the camp and the strip
    const trees = plantTrees({
      scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 6500, broadleaf: 1, autumn: 0, maxY: 80, size: 1.15,
      forest: (x: number, z: number) => {
        if (plantationK(x, z) > 0.4) return -1;
        const j = jungleK(x, z);
        return j > 0.5 ? 1 : j * 0.12;
      },
    });
    cover.finalize(bounds);
    const grass = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, avoid, density: 2, fields: null });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); grass.update(dt, t); },
    };
  },
} satisfies MapDef;
