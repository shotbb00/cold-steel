// Myebon, 12 January 1945 (1945 only; coastal landing, Burma: the 14th Army’s 3 Commando Brigade against the Imperial
// Japanese Army’s 54th Division; 1.0 × 1.8 km). The Arakan coast is a maze of tidal chaungs — creeks — through mangrove
// swamp, and the Myebon peninsula, a spine of jungle-covered hills between them, was the door to the coast road the
// Japanese 28th Army used to get out of Arakan. 42 Commando went in first, at low water, onto the beach at the tip of
// the peninsula: the Japanese had staked the shallows with lines of posts, and a party from a Royal Navy motor launch
// had swum in before dawn and blown a gap in them with delay charges. The tide was lower than the planners thought:
// many of the LCAs grounded out on the mud, and the following commandos waded ashore through it, waist deep. Then the
// hills, one after another, each with its code name — Rose, Pinner, Cabbage, Onion — each with its bunkers dug into
// the slope under the trees; the village of Myebon with its pagoda; the paddy; and the way on, across the chaungs to
// Kangaw (where the brigade fought its hardest battle, on Hill 170, a fortnight later).
// On the map (the sea is +z, the land -z): out at sea the transport area; three beaches between two jungle headlands —
// Rose in the west, Pinner in the east, each with a bunker complex dug into its seaward face. In the west Rose Beach,
// hard sand with the stakes across its shallows and the commandos’ gap blown through them; in the middle Pinner Cove,
// a narrow strip of sand under the jungle with the village track going up from it; in the east the mouth of Myebon
// Chaung, a wide mudflat at low water where the craft ground far out and men wallow in. Behind them the hills Cabbage
// (west) and Onion (east), the harvested paddy (the dry season: firm), Myebon village with its pagoda on a knoll, the
// chaungs winding inland through the mangroves (wadeable at this tide, slow mud), the gun position on the hill behind
// the village, and the track east toward Kangaw. Not point-mirrored: one side lands, the other holds (modes/landing).
// How it plays: the bunkers on Rose and Pinner rake the beaches until the sappers or the guns break them; the mudflats
// are the open flank the Japanese can’t cover well but where everything is slow; the counter-attack comes down the
// Kangaw track at the beachhead while the commandos are still on the hills.
// (Compressed and turned: the real beach faces south-west at the peninsula’s tip; here the sea is +z.)
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCache } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1945_0112);
const sea = createSea({ level: 0, size: SIZE, color: 0x4a5e4c }); // (the Bay of Bengal off the chaungs: brown-green with silt)

/** The two jungle headlands between the beaches, bunkers dug into each: x, how far out to sea, half-width, height. */
const HEADS = [{ x: -165, reach: 70, w: 46, top: 24, name: 'Rose' }, { x: 185, reach: 76, w: 44, top: 26, name: 'Pinner' }];
const headK = (x: number) => Math.max(Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)), Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2)));
/** The waterline (z) at low water: the beaches about 150 m from the middle, the headlands out past them. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.004, 2.1, 2) * 12
  + HEADS[0].reach * Math.exp(-(((x - HEADS[0].x) / HEADS[0].w) ** 2)) + HEADS[1].reach * Math.exp(-(((x - HEADS[1].x) / HEADS[1].w) ** 2));
/** Myebon Chaung’s mudflats in the east (0..1 across x). */
const mudK = (x: number) => smoothstep(225, 285, x);

/** The chaungs: x of the creek at z and its half-width. Myebon Chaung in the east (its mouth on the mudflats), a smaller one in the west. */
const CHAUNGS = [
  { x: (z: number) => 440 + Math.sin(z * 0.008) * 22 + Math.sin(z * 0.021) * 6, hw: (z: number) => 9 + 6 * smoothstep(0, 140, z), head: -880 },
  { x: (z: number) => -455 + Math.sin(z * 0.011 + 1) * 18, hw: () => 7, head: -560 },
];
/** Distance from the nearest chaung’s bank (< 0 in it). */
function chaungD(x: number, z: number) {
  let d = Infinity;
  for (const c of CHAUNGS) {
    if (z < c.head) continue;
    d = Math.min(d, Math.abs(x - c.x(z)) - c.hw(z) + smoothstep(c.head + 80, c.head, z) * 10);
  }
  return d;
}

/** The hills inland: [x, z, radius, height] — Cabbage, Onion, the gun hill behind the village, the pagoda knoll, the ridges toward Kangaw. */
const HILLS = [[-330, -235, 80, 24], [340, -245, 80, 22], [-120, -420, 90, 30], [190, -440, 85, 26], [95, -330, 30, 7],
  [-400, -620, 100, 30], [400, -640, 90, 26], [-170, -720, 70, 18], [230, -760, 70, 16]];
function hillH(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) { const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (d2 < 9) h += a * Math.exp(-d2); }
  return h;
}
const GUN_HILL = { x: -120, z: -420 };
const PAGODA = { x: 95, z: -330 };

/** The tracks: up from each beach, the coast track behind the headlands, the track east toward Kangaw. */
function roadDist(x: number, z: number) {
  const sz = shoreZ(x);
  let d = Infinity;
  if (z < sz - 34 && z > -860) {
    d = Math.min(d, Math.abs(x - (-330 + Math.sin(z * 0.012) * 12)));   // up from Rose Beach over Cabbage
    d = Math.min(d, Math.abs(x - (15 + Math.sin(z * 0.009) * 18)));     // up from Pinner Cove through Myebon
  }
  if (z < sz - 48 && z > -860) d = Math.min(d, Math.abs(x - (335 + Math.sin(z * 0.01) * 12))); // off the mudflats over Onion
  d = Math.min(d, Math.abs(z - (-40 + Math.sin(x * 0.008) * 12)));       // the coast track, behind the headlands
  d = Math.min(d, Math.abs(z - (-620 + Math.sin(x * 0.006) * 25)));      // across, toward Kangaw
  return d;
}
const onRoad = (x: number, z: number) => roadDist(x, z) < 3;

/** The beach sectors and the places up behind them. */
export const SECTORS = [
  { x: -330, name: 'Rose Beach', inland: { name: 'Cabbage', x: -330, z: -235 } },
  { x: 12, name: 'Pinner Cove', inland: { name: 'Myebon', x: 25, z: -250 } },
  { x: 335, name: 'Myebon Chaung mudflats', inland: { name: 'Onion', x: 340, z: -245 } },
];
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beaches (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: 'Rose Beach', x: -330, z: shoreZ(-330) - 30, owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Pinner Cove', x: 12, z: shoreZ(12) - 30, owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: 'Myebon Chaung mudflats', x: 335, z: shoreZ(335) - 50, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Cabbage', x: -330, z: -235, owner: null, sector: 'west' },
  { id: 'F', name: 'Myebon', x: 25, z: -250, owner: null, sector: 'centre' },
  { id: 'G', name: 'Onion', x: 340, z: -245, owner: null, sector: 'east' },
  { id: 'K', name: 'Kangaw track', x: 20, z: -660, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
/** Myebon village round its point (0..1). */
const villageK = (x: number, z: number) => smoothstep(85, 60, Math.hypot(x - 25, (z + 250) * 1.1));

/** The paddy: the low ground inland, off the hills, the tracks, the village, the chaungs and the points (harvested: stubble and dry bunds). */
function paddyK(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (back < 110 || z < -800) return 0;
  const k = smoothstep(-0.2, 0.05, fbm(noise, x * 0.006 + 11, z * 0.006, 2)) * smoothstep(110, 160, back) * smoothstep(3, 1, hillH(x, z));
  if (k <= 0) return 0;
  return k * smoothstep(6, 12, roadDist(x, z)) * smoothstep(8, 25, chaungD(x, z)) * (nearPoint(x, z, 45) ? 0 : 1) * (1 - villageK(x, z));
}

function height(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, hk = headK(x), mk = mudK(x);
  if (d > 0) { // the bottom: shelving off, the mudflats very gently (the LCAs ground far out), rocks off the headlands
    const h = 0.5 - d * (0.018 - 0.005 * mk) - Math.max(0, d - 130 - 80 * mk) * 0.05 + hk * Math.max(0, 3 - d * 0.05) * (0.6 + noise(x * 0.05, z * 0.05));
    return Math.max(h, -18);
  }
  const back = -d;
  // the shore (35–40 m of sand, the mudflats wider and lower), then the land: 3–6 m, rising inland
  const beach = mk > 0 ? 0.5 + Math.min(back, 40) * 0.04 - mk * (0.3 + Math.min(back, 70) * 0.01) * smoothstep(90, 50, back) : 0.5 + Math.min(back, 40) * 0.04;
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  const land = 3 + smoothstep(30, 110, back) * 1.5 + Math.max(0, back - 250) * 0.008 + n * 2 + hillH(x, z);
  let h = Math.max(beach, Math.min(land, beach + back * 0.2));
  // the paddy: terraced flat
  const pk = paddyK(x, z);
  if (pk > 0) h += (3.2 + Math.round(n * 5) * 0.25 - h) * pk;
  // the headlands: jungle hills 24–26 m high, steep to the sea, falling back to the land inland
  if (hk > 0.05) {
    const hd = x < 0 ? HEADS[0] : HEADS[1];
    const top = hd.top + fbm(noise, x * 0.03, z * 0.03, 2) * 5;
    h = h + (Math.max(h, 0.5 + top * smoothstep(4, 80, back) * smoothstep(210, 110, back)) - h) * smoothstep(0.25, 0.7, hk);
  }
  // the chaungs: tidal creeks through the mangroves, a foot or two of water over the mud at this tide (wadeable)
  const cd = chaungD(x, z);
  if (cd < 60) h = Math.min(h, cd < 0 ? -0.85 : 0.15 + cd * 0.075 + Math.max(0, cd - 25) ** 2 * 0.03); // (mud banks shelving gently up through the mangrove, then into the land)
  // the base: flat
  h += (5 - h) * smoothstep(60, 25, Math.hypot(x, z + 830));
  return h;
}

const paddyC = gridCache(paddyK, BOUNDS);
const mudSoft = (x: number, z: number) => mudK(x) * smoothstep(shoreZ(x) - 75, shoreZ(x) - 40, z);
/** The mudflats, the chaungs’ mud and the mangrove: slow going, vehicles all but stuck; the harvested paddy a little slow. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = Math.max(mudSoft(x, z), smoothstep(12, 0, chaungD(x, z)));
  if (m > 0.05) return 1 - m * (foot ? 0.4 : 0.7);
  return paddyC(x, z) > 0.3 ? (foot ? 0.92 : 0.82) : 1;
}
/** Jungle on the hills and the headlands, mangrove along the chaungs. */
const woodsK = (x: number, z: number) => Math.max(
  smoothstep(5, 12, hillH(x, z)),
  smoothstep(0.4, 0.8, headK(x)) * smoothstep(shoreZ(x) - 30, shoreZ(x) - 45, z) * smoothstep(shoreZ(x) - 220, shoreZ(x) - 150, z),
  smoothstep(45, 15, chaungD(x, z)) * smoothstep(3, 6, chaungD(x, z)) * (z < shoreZ(x) - 40 ? 1 : 0),
) * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 30) ? 0 : 1) * (1 - villageK(x, z));
const woodsC = gridCache(woodsK, BOUNDS);
const bund = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return Math.min(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11)) > 13.6;
};

/** The stakes the Japanese set across the shallows of Rose Beach and Pinner Cove (none on the mud), the commandos’ gap blown through them. */
export const OBSTACLES = (() => {
  const r = mulberry32(1945_12), out: { x: number, z: number, kind: string, mine: boolean }[] = [];
  for (const d of [55, 72]) {
    for (let x = -490; x < 260; x += 5 + r() * 3) {
      if (headK(x) > 0.3 || mudK(x) > 0.2 || Math.abs(x + 330) < 22 || r() < 0.1) continue; // (the gap off Rose Beach: the motor launch’s party)
      out.push({ x: x + (r() - 0.5) * 2, z: shoreZ(x) + d + (r() - 0.5) * 6, kind: 'stake', mine: r() < 0.15 });
    }
  }
  return out;
})();

export default {
  id: 'myebon',
  name: 'Myebon',
  description: 'The Arakan coast, 12 January 1945: 3 Commando Brigade lands at low water on the Myebon peninsula — a staked beach, a cove and a mudflat between two jungle headlands, the bunkered hills Rose, Pinner, Cabbage and Onion, the paddy, Myebon village and its pagoda, the chaungs through the mangroves and the track to Kangaw.',
  epochs: ['1945'],
  theatre: 'coastal',
  region: 'pacific',                                   // (the menu’s Asia & Pacific: maps/index.js REGIONS — brit14 stays)
  pacific: true,                                       // (data/factions.js armiesFrom: the Imperial Army fights here)
  modes: ['landing'],
  sides: { nato: 'United Kingdom', pact: 'Japan' },
  armies: { nato: ['brit14'], pact: ['jp'] },          // (the commandos on the 14th Army’s roster; the 54th Division’s men on the peninsula)
  airfields: [],                                       // (no runway fits: hills, paddy, chaungs and mangrove)
  conditions: { time: 'day', weather: 'clear' },       // (the dry season: a clear, hazy morning)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1945,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woodsC(x, z) * 0.85,

  theme: {
    // a January morning on the Arakan coast: haze over the mangroves, the sun climbing
    fogColor: 0xbcc2b2, fogDensity: 0.0008,
    skyTop: 0x6a8cb0, skyHorizon: 0xd6d6c4, skyBottom: 0x8a8c78,
    sunColor: 0xfff0d0, sunIntensity: 1.8, sunDisk: 0.3,
    clouds: 0.3, cloudLight: 0xf2eee4, cloudDark: 0x9ca2a4,
    sunDir: [-0.45, 0.55, 0.7],
    hemiSky: 0xcad4d6, hemiGround: 0x4e5236, hemiIntensity: 1.25,
    rimColor: 0xdcdcd0, rimIntensity: 0.22,
    terrain: {
      grass: '#506a32', grassAlt: '#48602e', dryGrass: '#8a8450', dirt: '#6e5236', rock: '#6a6656',
      pasture: '#566c34', ploughed: '#6a5034', stubble: '#a08e58', meadow: '#5a7036',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const back = shoreZ(x) - z;
        if (onRoad(x, z) && back > 30) return [0x8a6e4e, 0.85];                                     // the red-brown tracks
        if (back < -3) return [y > -1.5 ? 0x8a7e62 : 0x6e6450, 1];                                  // the silt under the water
        if (chaungD(x, z) < 3) return [0x4e4434, 1];                                                // the chaungs’ mud
        if (mudSoft(x, z) > 0.3 || (mudK(x) > 0.3 && back < 40)) return [0x6a5c46, 0.95];           // the mudflats
        if (chaungD(x, z) < 12) return [0x5c5240, 0.85];                                            // the mangrove mud
        if (headK(x) > 0.3 && y > 4 && back < 110) return null;                                     // the headlands: jungle
        if (back < 36) return [0xc4b48e, 1];                                                        // the sand
        if (villageK(x, z) > 0.6) return [0x8e7656, 0.6];                                           // the trodden yards
        const pk = paddyC(x, z);
        if (pk > 0.3) {
          if (bund(x, z)) return [0x7a6a44, 0.8];                                                    // the bunds
          const k = noise(x * 0.04, z * 0.04);
          return [k > 0.3 ? 0xa89462 : k > -0.3 ? 0xb4a06a : 0x8e8656, pk * 0.85];                  // harvested paddy: stubble, dry earth
        }
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -830, entries: [-330, 15, 335] } },
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,
  spawns: {
    nato: [],
    pact: [{ unit: 'rifles', x: 25, z: -270, facing: 0, name: '154th Infantry Regiment' }],
  },

  landing: {
    attacker: 'nato',
    // the boats (systems/Landing.js; data/units45/ships.js gives them their Royal Navy names: LCA, LCT Mk 4)
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    // what the landing may call in at sea: a River-class frigate (for the Royal Indian Navy’s sloops) and a destroyer inshore
    navy: ['frigate', 'destroyer'],
    // the Japanese bunkers (modes/landing.js, data/units45/atlanticWall.js — the Japanese variants): a complex dug into
    // each headland’s seaward face and one into Onion’s over the mudflats; the guns on the hill behind the village
    forts: [
      { unit: 'wn', x: HEADS[0].x, z: shoreZ(HEADS[0].x) - 75, facing: 0, name: 'Rose bunkers' },
      { unit: 'wn', x: HEADS[1].x, z: shoreZ(HEADS[1].x) - 80, facing: 0, name: 'Pinner bunkers' },
      { unit: 'wn', x: 305, z: -155, facing: 0, name: 'Onion bunkers' },
      { unit: 'battery', x: GUN_HILL.x + 20, z: GUN_HILL.z + 45, facing: 0, name: 'Gun position' },
    ],
    names: { rifles: 'Rifle squad' },
    // fire trenches and MG nests over each beach, mines on the tracks behind the cove and the mudflats
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - 54, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - 48, yaw: 0 }))),
      ...SECTORS.slice(1).flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 64 }))),
      ...Array.from({ length: 10 }, (_, i) => { const x = -380 + i * 10; return { kind: 'wire', x, z: shoreZ(x) - 38, yaw: 0 }; }),
    ],
    obstacles: OBSTACLES,
    // the defence at dawn: over each beach, on the hills, in the village; mortars and snipers behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'atTeam', 'sniper', 'mortar', 'rifles', 'mortar', 'sniper', 'scouts'],
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 48 : 56) }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    // the counter-attack: the 54th Division’s reserve down the track from Kangaw
    counter: { t: 420, units: ['rifles', 'rifles', 'tank', 'mgTeam', 'rifles', 'atTeam'], say: 'The reserve is coming down the track from Kangaw, straight for the beachhead', sayOther: 'Japanese infantry and a tank coming down the track from Kangaw' },
    // the landing’s AI (ai/LandingDirector.js): commandos first, the sappers for the bunkers, the Stuarts and Lees later
    ai: { order: ['rifles', 'rifles', 'engineers', 'mgTeam', 'rifles', 'tank', 'rifles', 'mortar', 'atTeam', 'rifles', 'heavyTank', 'engineers', 'rifles', 'tank'], gunship: 'destroyer', gunships: 1, heavy: null },
    economy: { reserves: 3300, perSector: 1000, beachIncome: 1.6, defenceCp: 550, defenceIncome: 1.0 }, // (AI vs AI 2026-11-22: at 3000/900/1.4 Japan held, the commandos 1 of 3 inland; at 3400/1000/1.7 the landing won at 21 and 27 min; at 3300/1000/1.6 with the counter at 480 one win at 16 min, one hold with Onion still Japanese; counter at 420: wins at 22 and 27 min)
    // H-hour: 42 Commando through the gap onto Rose Beach, the rest onto the cove and the mud
    waves: [{ t: 0, say: '42 Commando is going in through the gap in the stakes', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1945_0112);
    props.rand = r;
    sea.build(scene, terrain);
    const M = new THREE.Matrix4();
    const g = (x: number, z: number) => terrain.heightAt(x, z);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 5 + rr && !nearPoint(x, z, 16 + rr) && chaungD(x, z) > 6 + rr && z < shoreZ(x) - 38 - rr && Math.hypot(x, z + 830) > 45;
    const WHITE = 0xe8e2d4, GOLD = 0xc8a040, THATCH = 0x9a8456;

    /** A stupa: whitewashed terraces, the bell, the gilded spire (`s`: its scale; 1 ≈ 9 m high). */
    const stupa = (x: number, z: number, s: number, gilt = false) => {
      const y = g(x, z), c = gilt ? GOLD : WHITE;
      props.box('plaster', x, y, z, 6 * s, 2 * s, 6 * s, 0, WHITE);
      props.box('plaster', x, y + 1.3 * s, z, 4.6 * s, 0.6 * s, 4.6 * s, 0, WHITE);
      props.push('plaster', new THREE.CylinderGeometry(1.3 * s, 2.1 * s, 2.4 * s, 12), M.makeTranslation(x, y + 2.8 * s, z), c);
      props.push('plaster', new THREE.SphereGeometry(1.32 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.makeTranslation(x, y + 4 * s, z), c);
      props.push('metal', new THREE.ConeGeometry(0.75 * s, 4 * s, 10), M.makeTranslation(x, y + 7.2 * s, z), GOLD);
      cover.addCylinder({ x, z, radius: 2.4 * s, height: 4 * s });
    };
    /** A basha: a bamboo hut on stilts under a thatch roof. */
    const basha = (x: number, z: number, yaw: number, w: number, d: number) => {
      const y = g(x, z);
      props.box('plain', x, y + 1.2, z, w, 1.6, d, yaw, 0x8a7650);
      props.box('plain', x, y + 2.4, z, w + 1, 0.9, d + 1.2, yaw, THATCH);
      cover.addBox({ x, z, yaw, length: d, thickness: w, height: 2 });
    };
    /** A Japanese bunker dug into the slope: a log-and-earth mound, the dark slit facing the sea. */
    const bunker = (x: number, z: number) => {
      const y = g(x, z);
      props.box('plain', x, y + 0.4, z, 5, 1.6, 4, 0, 0x5a4a32);
      props.box('plain', x, y + 1.3, z, 5.6, 0.4, 4.6, 0, 0x4a5a2c);   // earth and brush over the logs
      props.box('plain', x, y + 0.7, z + 2.02, 3, 0.35, 0.1, 0, 0x14120e); // the firing slit
      cover.addBox({ x, z, yaw: 0, length: 4, thickness: 5, height: 1.4 });
    };

    // ---- Myebon: bashas round the village, the pagoda on its knoll with small stupas, a monastery hall
    for (let i = 0, n = 26; i < 120 && n > 0; i++) {
      const a = r() * Math.PI * 2, dd = 18 + r() * 60, x = 25 + Math.cos(a) * dd, z = -250 + Math.sin(a) * dd * 0.8;
      if (!free(x, z, 4) || paddyC(x, z) > 0.2) continue;
      basha(x, z, a, 5 + r() * 2, 7 + r() * 3); n--;
    }
    stupa(PAGODA.x, PAGODA.z, 1.3, true);
    for (const [dx, dz] of [[-12, 8], [12, 8], [-12, -10], [12, -10]]) stupa(PAGODA.x + dx, PAGODA.z + dz, 0.35);
    props.house({ x: PAGODA.x - 30, z: PAGODA.z + 18, yaw: 0, width: 12, depth: 8, height: 3.2 });
    // hamlets at the foot of Cabbage and Onion, a few huts by the chaungs
    for (const [cx, cz, n0] of [[-260, -140, 7], [280, -150, 6], [-200, -560, 5], [260, -560, 5]] as [number, number, number][]) {
      for (let i = 0, n = n0; i < n0 * 6 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 10 + r() * 35, x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd;
        if (!free(x, z, 4) || paddyC(x, z) > 0.3 || hillH(x, z) > 9) continue;
        basha(x, z, a, 4.5 + r() * 2, 6.5 + r() * 3); n--;
      }
    }
    // sampans drawn up on the chaungs’ banks
    for (const z of [40, -120, -300, -480]) {
      const c = CHAUNGS[0], x = c.x(z) - c.hw(z) - 3, y = Math.max(g(x, z), 0.05);
      props.box('plain', x, y + 0.3, z, 1.6, 0.6, 7, 0.1, 0x5a4630);
    }
    // ---- the bunkers dug into the hills’ seaward slopes: Rose, Pinner, Cabbage, Onion, the gun hill
    for (const [cx, cz, k] of [[HEADS[0].x, shoreZ(HEADS[0].x) - 60, 6], [HEADS[1].x, shoreZ(HEADS[1].x) - 64, 6], [-330, -190, 4], [340, -200, 4], [GUN_HILL.x, GUN_HILL.z + 50, 3]] as [number, number, number][]) {
      for (let i = 0, n = k; i < k * 8 && n > 0; i++) {
        const x = cx + (r() - 0.5) * 80, z = cz + (r() - 0.5) * 40;
        if (roadDist(x, z) < 8 || nearPoint(x, z, 20) || z > shoreZ(x) - 40 || g(x, z) < 4) continue;
        bunker(x, z); n--;
      }
    }
    // coconut palms along the back of the beaches and round the village
    for (let i = 0; i < 200; i++) {
      const x = (r() * 2 - 1) * 480, z = shoreZ(x) - 40 - r() * 60;
      if (headK(x) > 0.3 || mudK(x) > 0.3 || !free(x, z, 2) || g(x, z) < 1) continue;
      props.palm({ x, z, height: 9 + r() * 6 });
    }
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, dd = 30 + r() * 70, x = 25 + Math.cos(a) * dd, z = -250 + Math.sin(a) * dd;
      if (!free(x, z, 3)) continue;
      props.palm({ x, z, height: 10 + r() * 5 });
    }
    commandPost(props, this.bases.pact, 1, 0x6a6a44);
    props.finish();

    const avoid = [{ x: 0, z: -830, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || paddyC(x, z) > 0.2 || villageK(x, z) > 0.4 || z > shoreZ(x) - 40 || chaungD(x, z) < 2.5 || terrain.heightAt(x, z) < 0.4 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 6000, broadleaf: 0.95, autumn: 0, maxY: 80, avoid,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => z > shoreZ(x) - 36 || chaungD(x, z) < 2 || villageK(x, z) > 0.6 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
