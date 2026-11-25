// Myebon, 12 January 1945 (1945 only; coastal landing, Burma: the 14th Army’s 3 Commando Brigade against the Imperial
// Japanese Army’s 54th Division; 1.0 × 1.8 km). The Arakan coast is a maze of tidal chaungs — creeks — through mangrove
// swamp, and the Myebon peninsula, a spine of jungle-covered hills running out to sea between Hunter’s Bay and the
// Myebon River, was the door to the coast road the Japanese 28th Army used to get out of Arakan. 42 Commando went in
// first, at low water, onto the beach at the very tip of the peninsula: the Japanese had staked the shallows with lines
// of posts, and a party from a Royal Navy motor launch had swum in before dawn and blown a gap in them with delay
// charges. The tide was lower than the planners thought: many of the LCAs grounded out on the mud, and the following
// commandos waded ashore through it, waist deep. Then the hills along the spine, one after another, each with its code
// name — Rose, Cabbage, Onion — each with its bunkers dug into the slope under the trees; Myebon village and its pagoda
// on the river bank; the paddy; and the way on, across the chaungs to Kangaw (Hill 170, a fortnight later).
// On the map (the sea is +z): the peninsula is a tongue of land pointing out to sea, the tip right in front of the
// transport area. West of it Hunter’s Bay runs far inland, its shore slanting away north-west to the mangroves at the
// bay’s head; east of it the Myebon River, a deep tidal channel 140 m wide, runs the whole length of the map with the
// mangrove of the far bank beyond (scenery: no one crosses). Three landing places: Rose Beach at the tip, hard sand with
// the stakes across its shallows and the commandos’ gap through them; Pinner Cove on the bay side, a strip of sand under
// the jungle; and the mudflats in the river’s mouth on the east side, where the craft ground far out and men wallow in.
// The hills run lengthwise up the spine (Rose over the tip, Cabbage, the gun hill), Onion stands over the bay, Myebon
// village sits on the river bank with its pagoda on a knoll; the harvested paddy lies between; the Kangaw track leaves
// at the back. Not point-mirrored: one side lands, the other holds (modes/landing).
// How it plays: the tip is a narrow front under the bunkers on Rose; the cove is far up the bay, a long run in under
// Onion; the mudflats are the open flank the Japanese can’t cover well but where everything is slow. Inland the spine
// splits the peninsula: the bay side and the river side only meet behind the gun hill, where the counter-attack comes
// down the Kangaw track. (Compressed and turned: the real tip faces south-west; here the sea is +z.)
import * as THREE from 'three';
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
const EXT = { x: 1000, z: 1000 };
const noise = createNoise2D(1945_0112);
const sea = createSea({ level: 0, size: SIZE, color: 0x4a5e4c }); // (the Bay of Bengal off the chaungs: brown-green with silt)

/** The land's outlines (x, z), rounded off (Chaikin): the signed distance to them, m (+ ashore, − at sea). */
function landField(rings: number[][][]) {
  const R = rings.map((p0) => {
    let p = p0;
    for (let k = 0; k < 3; k++) {
      const q: number[][] = [];
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); }
      p = q;
    }
    return p;
  });
  return (x: number, z: number) => {
    let d = Infinity, inside = false;
    for (const p of R) {
      let c = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const ax = p[j][0], az = p[j][1], dx = p[i][0] - ax, dz = p[i][1] - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
        d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
        if ((az > z) !== (p[i][1] > z) && x < (dx * (z - az)) / dz + ax) c = !c;
      }
      inside ||= c;
    }
    return inside ? d : -d;
  };
}
/** The peninsula (with the mainland at the head of Hunter's Bay) and the river's far bank. */
const landRaw = landField([
  [[-1500, -1500], [-1500, -560], [-520, -560], [-450, -520], [-405, -430], [-380, -300], [-335, -175], [-265, -45], [-200, 60], [-130, 165],
    [-75, 240], [-25, 272], [25, 250], [85, 180], [160, 100], [225, 30], [265, -50], [282, -170], [290, -350], [298, -560], [305, -800], [315, -1500]],
  [[445, -1500], [432, -760], [425, -450], [438, -230], [470, -95], [530, -10], [1500, -10], [1500, -1500]],
]);
/** How far ashore (m; < 0: out in the water). */
const inl = gridCacheSmooth((x: number, z: number) => landRaw(x, z) + fbm(noise, x * 0.006, z * 0.006, 2) * 7, EXT, 4);
/** The first land coming in from the sea down lane x. */
const shoreAt = (x: number) => { for (let z = 900; z > -900; z -= 3) if (inl(x, z) > 0) return z; return -900; };
/** From (x, z) inland until `d` m ashore (along the slope of the shore, wherever it faces). */
function inward(x: number, z: number, d: number) {
  for (let k = 0; k < 25 && Math.abs(inl(x, z) - d) > 1; k++) {
    const gx = inl(x + 3, z) - inl(x - 3, z), gz = inl(x, z + 3) - inl(x, z - 3), n = Math.hypot(gx, gz) || 1, s = (d - inl(x, z)) * 0.8;
    x += (gx / n) * s; z += (gz / n) * s;
  }
  return { x: Math.round(x), z: Math.round(z) };
}
/** The Myebon River (x between the peninsula and the far bank, down the east side), its mouth and the mudflats off the east beach (0..1). */
const riverK = (x: number, z: number) => smoothstep(270, 320, x) * smoothstep(470, 420, x) * smoothstep(120, 60, z);
const mudK = (x: number, z: number) => smoothstep(90, 150, x) * smoothstep(330, 290, x) * smoothstep(-80, -10, z);

/** The hills: [x, z, radius, height] — Rose over the tip, Cabbage, the gun hill and the ridge on up the spine; Onion over the bay; the pagoda knoll; the mainland. */
const HILLS = [[-20, 150, 55, 17], [-70, -60, 70, 24], [-30, -520, 85, 30], [40, -330, 60, 14], [-215, -330, 75, 23], [140, -380, 28, 7],
  [120, -640, 80, 20], [-330, -730, 120, 32], [210, -820, 80, 16], [-120, -780, 70, 14]];
function hillExact(x: number, z: number) {
  let h = 0;
  for (const [hx, hz, r, a] of HILLS) { const d2 = ((x - hx) ** 2 + (z - hz) ** 2) / (r * r); if (d2 < 9) h += a * Math.exp(-d2); }
  return h;
}
const hillH = gridCacheSmooth(hillExact, BOUNDS, 4);
const GUN_HILL = { x: -30, z: -520 };
const PAGODA = { x: 140, z: -380 };
const VILLAGE = { x: 190, z: -300 };

/** The tracks: polylines. */
const TRACKS: number[][][] = [
  [[-20, 200], [-40, 80], [-70, -10], [-40, -150], [0, -260], [VILLAGE.x - 20, VILLAGE.z], [180, -450], [120, -620], [100, -700], [40, -860]],   // up the spine from the tip to Myebon, on to Kangaw
  [[200, 10], [215, -100], [VILLAGE.x, VILLAGE.z]],                                                                                                // off the mudflats up the river bank
  [[-300, -200], [-240, -260], [-215, -330], [-170, -430], [-90, -560], [0, -640], [100, -700]],                                                    // up from the cove past Onion
  [[-40, -150], [-140, -200], [-240, -260]],                                                                                                        // across the spine’s saddle
  [[0, -640], [0, -830]],
];
function segD(x: number, z: number, a: number[], b: number[]) {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const roadDist = gridCacheSmooth((x: number, z: number) => { let d = Infinity; for (const l of TRACKS) for (let i = 0; i + 1 < l.length; i++) d = Math.min(d, segD(x, z, l[i], l[i + 1])); return d; }, BOUNDS, 3);
const onRoad = (x: number, z: number) => roadDist(x, z) < 3 && inl(x, z) > 25;

/** The beach sectors, west to east (the landing's lanes in from the sea), and the place each opens. */
export const SECTORS = [
  { x: -320, name: 'Pinner Cove', inland: { name: 'Onion', x: -215, z: -330 } },
  { x: -20, name: 'Rose Beach', inland: { name: 'Cabbage', x: -70, z: -60 } },
  { x: 215, name: 'Myebon River mudflats', inland: { name: 'Myebon', x: VILLAGE.x, z: VILLAGE.z } },
];
const BEACH = SECTORS.map((s) => inward(s.x, shoreAt(s.x), 34));
const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: -160, z: 760, owner: 'nato', sector: 'centre', radius: 90 },
  // the beaches (Landing: open from the start; `opens` the place behind once taken)
  { id: 'B', name: SECTORS[0].name, ...BEACH[0], owner: null, sector: 'west', radius: 42, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, ...BEACH[1], owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, ...inward(SECTORS[2].x, shoreAt(SECTORS[2].x), 46), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: SECTORS[0].inland.name, x: SECTORS[0].inland.x, z: SECTORS[0].inland.z, owner: null, sector: 'west' },
  { id: 'F', name: SECTORS[1].inland.name, x: SECTORS[1].inland.x, z: SECTORS[1].inland.z, owner: null, sector: 'centre' },
  { id: 'G', name: SECTORS[2].inland.name, x: SECTORS[2].inland.x, z: SECTORS[2].inland.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Kangaw track', x: 100, z: -700, owner: 'pact', sector: 'centre' },
];
const nearPoint = (x: number, z: number, r: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < r);
/** Myebon village on the river bank (0..1). */
const villageK = (x: number, z: number) => smoothstep(80, 55, Math.hypot(x - VILLAGE.x, (z - VILLAGE.z) * 1.1));

/** The paddy: the flat ground off the hills, the tracks, the village and the shore (harvested: stubble and dry bunds). */
function paddyExact(x: number, z: number) {
  const a = inl(x, z);
  if (a < 110 || z < -800 || nearPoint(x, z, 45)) return 0;
  return smoothstep(-0.2, 0.05, fbm(noise, x * 0.006 + 11, z * 0.006, 2)) * smoothstep(110, 160, a) * smoothstep(3, 1, hillH(x, z))
    * smoothstep(6, 12, roadDist(x, z)) * (1 - villageK(x, z)) * smoothstep(55, 70, Math.hypot(x, z + 830));
}
const paddyC = gridCache(paddyExact, BOUNDS);

function height(x: number, z: number) {
  const a = inl(x, z);
  if (a < 0) { // the bottom: shelving off; the mudflats in the river mouth very gently (the LCAs ground far out); the river deep
    const m = mudK(x, z), rv = riverK(x, z);
    let h = 0.5 + a * (0.02 - 0.014 * m) - Math.max(0, -a - 120 - 90 * m) * 0.05;
    h = Math.min(h, h * (1 - rv) + Math.max(-4.5, 0.3 + a * 0.12) * rv);
    return Math.max(h, -18);
  }
  // the shore (35–40 m of sand, the mud lower and wetter), then the land: 3–6 m, the hills on it
  const m = mudK(x, z) + smoothstep(270, 300, x) * 0.7;
  const beach = 0.5 + Math.min(a, 40) * 0.04 - Math.min(m, 1) * (0.3 + Math.min(a, 60) * 0.01) * smoothstep(80, 40, a);
  const n = fbm(noise, x * 0.005, z * 0.005, 3);
  const land = 3 + smoothstep(30, 110, a) * 1.5 + n * 2 + hillH(x, z) * smoothstep(0, 30, a);
  let h = Math.max(beach, Math.min(land, beach + a * 0.2));
  const pk = paddyC(x, z);
  if (pk > 0) h += (3.2 + Math.round(n * 5) * 0.25 - h) * pk; // the paddy: terraced flat
  h += (5 - h) * smoothstep(60, 25, Math.hypot(x, z + 830)); // the base: flat
  return h;
}

const mudSoft = (x: number, z: number) => Math.max(mudK(x, z), smoothstep(250, 290, x) * smoothstep(-1000, -900, z)) * smoothstep(70, 35, inl(x, z));
/** The mudflats, the mangrove mud along the river: slow going, vehicles all but stuck; the harvested paddy a little slow. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = mudSoft(x, z);
  if (m > 0.05) return 1 - m * (foot ? 0.4 : 0.7);
  return paddyC(x, z) > 0.3 ? (foot ? 0.92 : 0.82) : 1;
}
/** Jungle on the hills, mangrove along the river and round the bay's head, scrub at the tip. */
const woodsK = (x: number, z: number) => {
  const a = inl(x, z);
  if (a < 30) return 0;
  return Math.max(
    smoothstep(5, 12, hillH(x, z)),
    smoothstep(240, 290, x) * smoothstep(120, 40, a),                                // the mangrove on the river bank
    smoothstep(-300, -420, z) * smoothstep(-300, -380, x) * smoothstep(100, 40, a),   // round the bay's head
    x > 300 ? 1 : 0,                                                                  // the far bank
  ) * smoothstep(4, 12, roadDist(x, z)) * (nearPoint(x, z, 30) ? 0 : 1) * (1 - villageK(x, z));
};
const woodsC = gridCache(woodsK, BOUNDS);
const bund = (x: number, z: number) => {
  const u = x + z * 0.07, v = z - x * 0.08;
  return Math.min(Math.abs(((u % 30) + 30) % 30 - 15), Math.abs(((v % 22) + 22) % 22 - 11)) > 13.6;
};

/** The stakes the Japanese set across the shallows of Rose Beach and Pinner Cove (none on the mud), the commandos’ gap blown through them off the tip. */
export const OBSTACLES = (() => {
  const r = mulberry32(1945_12), out: { x: number, z: number, kind: string, mine: boolean }[] = [];
  for (const [x0, x1] of [[-160, 110], [-390, -250]]) for (const d of [16, 28]) {
    for (let x = x0; x < x1; x += 5 + r() * 3) {
      if (Math.abs(x - SECTORS[1].x) < 22 || r() < 0.1) continue; // (the gap off Rose Beach: the motor launch’s party)
      const p = inward(x, shoreAt(x), -d); // (out from the waterline, whichever way the shore faces)
      out.push({ x: p.x + (r() - 0.5) * 2, z: p.z + (r() - 0.5) * 4, kind: 'stake', mine: r() < 0.15 });
    }
  }
  return out;
})();
/** Along the shore round sector s: `n` places `d` m ashore, `step` m apart. */
const along = (s: number, d: number, offs: number[]) => offs.map((dx) => { const x = SECTORS[s].x + dx; return inward(x, shoreAt(x), d); });

export default {
  id: 'myebon',
  name: 'Myebon',
  description: 'The Arakan coast, 12 January 1945: 3 Commando Brigade lands at low water on the tip of the Myebon peninsula — the staked beach at the tip, a cove up Hunter’s Bay and the mudflats in the Myebon River’s mouth, the bunkered hills Rose, Cabbage and Onion along the spine, the paddy, Myebon village and its pagoda on the river and the track to Kangaw.',
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
        const a = inl(x, z);
        if (onRoad(x, z)) return [0x8a6e4e, 0.85];                                                  // the red-brown tracks
        if (a < -3) return [y > -1.5 ? 0x8a7e62 : 0x6e6450, 1];                                     // the silt under the water
        if (mudSoft(x, z) > 0.3) return [0x5e5240, 0.95];                                           // the mudflats, the mangrove mud
        if (a < 36) return [0xc4b48e, 1];                                                           // the sand
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

  bases: { nato: { x: -160, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its lanes are the beach sectors)
           pact: { x: 0, z: -830, entries: [-180, 0, 120] } },
  maxStacks: 24,
  cameraStart: { nato: { x: -40, z: 380 }, pact: { x: 0, z: -250 } },
  points,
  spawns: {
    nato: [],
    pact: [{ unit: 'rifles', x: VILLAGE.x - 20, z: VILLAGE.z - 20, facing: 0, name: '154th Infantry Regiment' }],
  },

  landing: {
    attacker: 'nato',
    // the boats (systems/Landing.js; data/units45/ships.js gives them their Royal Navy names: LCA, LCT Mk 4)
    craft: { infantry: 'lcvp', vehicle: 'lct' },
    // what the landing may call in at sea: a River-class frigate (for the Royal Indian Navy’s sloops) and a destroyer inshore
    navy: ['frigate', 'destroyer'],
    // the Japanese bunkers (modes/landing.js, data/units45/atlanticWall.js — the Japanese variants): a complex dug into
    // Rose over the tip, one on Onion over the cove, one on the river bank over the mudflats; the guns on the gun hill
    forts: [
      { unit: 'wn', x: -15, z: 150, facing: 0, name: 'Rose bunkers' },
      { unit: 'wn', x: -205, z: -270, facing: -1.1, name: 'Onion bunkers' },
      { unit: 'wn', x: 225, z: -150, facing: 0.3, name: 'River bunkers' },
      { unit: 'battery', x: GUN_HILL.x + 25, z: GUN_HILL.z + 50, facing: 0, name: 'Gun position' },
    ],
    names: { rifles: 'Rifle squad' },
    // fire trenches and MG nests over each beach, mines on the tracks behind the cove and the mudflats
    works: [
      ...SECTORS.flatMap((_, s) => along(s, 56, [-45, 0, 45]).map((p) => ({ kind: 'trench', ...p, yaw: 0 }))),
      ...SECTORS.flatMap((_, s) => along(s, 50, [-22, 22]).map((p) => ({ kind: 'mgNest', ...p, yaw: 0 }))),
      ...[0, 2].flatMap((s) => along(s, 66, [-12, 12]).map((p) => ({ kind: 'mines', ...p }))),
      ...along(1, 40, [-60, -50, -40, -30, 30, 40, 50, 60]).map((p) => ({ kind: 'wire', ...p, yaw: 0 })),
    ],
    obstacles: OBSTACLES,
    // the defence at dawn: over each beach, on the hills, in the village; mortars and snipers behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'atTeam', 'sniper', 'mortar', 'rifles', 'mortar', 'sniper', 'scouts'],
    hold: [...SECTORS.flatMap((_, s) => along(s, 52, [-45, -22, 22, 45])), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    // the counter-attack: the 54th Division’s reserve down the track from Kangaw
    counter: { t: 420, units: ['rifles', 'rifles', 'tank', 'mgTeam', 'rifles', 'atTeam'], say: 'The reserve is coming down the track from Kangaw, straight for the beachhead', sayOther: 'Japanese infantry and a tank coming down the track from Kangaw' },
    // the landing’s AI (ai/LandingDirector.js): commandos first, the sappers for the bunkers, the Stuarts and Lees later
    ai: { order: ['rifles', 'rifles', 'engineers', 'mgTeam', 'rifles', 'tank', 'rifles', 'mortar', 'atTeam', 'rifles', 'heavyTank', 'engineers', 'rifles', 'tank'], gunship: 'destroyer', gunships: 1, heavy: null },
    economy: { reserves: 3300, perSector: 1000, beachIncome: 1.6, defenceCp: 650, defenceIncome: 1.0 }, // (AI vs AI 2026-11-25 on the peninsula: at defenceCp 550 the landing won at 21:11 and 17:09)
    // H-hour: 42 Commando through the gap onto Rose Beach, the rest into the cove and onto the mud
    waves: [{ t: 0, say: '42 Commando is going in through the gap in the stakes', units: [
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
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
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 5 + rr && !nearPoint(x, z, 16 + rr) && inl(x, z) > 38 + rr && x < 280 && Math.hypot(x, z + 830) > 45;
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
    /** A Japanese bunker dug into the slope: a log-and-earth mound, the dark slit facing `yaw`. */
    const bunker = (x: number, z: number, yaw = 0) => {
      const y = g(x, z);
      props.box('plain', x, y + 0.4, z, 5, 1.6, 4, yaw, 0x5a4a32);
      props.box('plain', x, y + 1.3, z, 5.6, 0.4, 4.6, yaw, 0x4a5a2c);   // earth and brush over the logs
      props.box('plain', x + Math.sin(yaw) * 2.02, y + 0.7, z + Math.cos(yaw) * 2.02, 3, 0.35, 0.1, yaw, 0x14120e); // the firing slit
      cover.addBox({ x, z, yaw, length: 4, thickness: 5, height: 1.4 });
    };

    // ---- Myebon: bashas round the village on the river bank, the pagoda on its knoll with small stupas, a monastery hall, a jetty
    for (let i = 0, n = 26; i < 140 && n > 0; i++) {
      const a = r() * Math.PI * 2, dd = 18 + r() * 60, x = VILLAGE.x + Math.cos(a) * dd, z = VILLAGE.z + Math.sin(a) * dd * 0.8;
      if (!free(x, z, 4) || paddyC(x, z) > 0.2) continue;
      basha(x, z, a, 5 + r() * 2, 7 + r() * 3); n--;
    }
    stupa(PAGODA.x, PAGODA.z, 1.3, true);
    for (const [dx, dz] of [[-12, 8], [12, 8], [-12, -10], [12, -10]]) stupa(PAGODA.x + dx, PAGODA.z + dz, 0.35);
    props.house({ x: PAGODA.x - 30, z: PAGODA.z + 18, yaw: 0, width: 12, depth: 8, height: 3.2 });
    { const z = VILLAGE.z + 10; for (let k = 0; k < 7; k++) props.box('plain', 284 + k * 4, 0.6, z, 4.2, 0.25, 2.4, 0, 0x6a5438); } // the jetty out into the river
    // hamlets at the foot of Rose, on the saddle, under Onion and up by the track
    for (const [cx, cz, n0] of [[60, 60, 6], [-170, -150, 6], [-300, -420, 5], [60, -600, 5]] as [number, number, number][]) {
      for (let i = 0, n = n0; i < n0 * 6 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 10 + r() * 35, x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd;
        if (!free(x, z, 4) || paddyC(x, z) > 0.3 || hillH(x, z) > 9) continue;
        basha(x, z, a, 4.5 + r() * 2, 6.5 + r() * 3); n--;
      }
    }
    // sampans drawn up on the river bank and in the cove
    for (const z of [-60, -200, -420, -560]) { const x = 300 - 8, y = Math.max(g(x, z), 0.05); props.box('plain', x, y + 0.3, z, 1.6, 0.6, 7, 0.1, 0x5a4630); }
    // ---- the bunkers dug into the hills’ seaward slopes: Rose over the tip, Onion over the cove, the river bank, Cabbage, the gun hill
    for (const [cx, cz, k, yaw] of [[-15, 170, 6, 0], [-200, -280, 5, -1.1], [225, -130, 4, 0.4], [-70, -20, 4, 0], [GUN_HILL.x, GUN_HILL.z + 50, 3, 0]] as number[][]) {
      for (let i = 0, n = k; i < k * 8 && n > 0; i++) {
        const x = cx + (r() - 0.5) * 80, z = cz + (r() - 0.5) * 40;
        if (roadDist(x, z) < 8 || nearPoint(x, z, 20) || inl(x, z) < 40 || g(x, z) < 4) continue;
        bunker(x, z, yaw); n--;
      }
    }
    // coconut palms along the back of the beaches and round the village
    for (let i = 0; i < 260; i++) {
      const x = -420 + r() * 700, z = 280 - r() * 760, a = inl(x, z);
      if (a < 40 || a > 110 || mudSoft(x, z) > 0.2 || !free(x, z, 2) || g(x, z) < 1) continue;
      props.palm({ x, z, height: 9 + r() * 6 });
    }
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, dd = 30 + r() * 70, x = VILLAGE.x + Math.cos(a) * dd, z = VILLAGE.z + Math.sin(a) * dd;
      if (!free(x, z, 3)) continue;
      props.palm({ x, z, height: 10 + r() * 5 });
    }
    commandPost(props, this.bases.pact, 1, 0x6a6a44);
    props.finish();

    const avoid = [{ x: 0, z: -830, r: 30 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || paddyC(x, z) > 0.2 || villageK(x, z) > 0.4 || inl(x, z) < 40 || terrain.heightAt(x, z) < 0.4 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: bounds.x + 80, count: 6000, broadleaf: 0.95, autumn: 0, maxY: 80, avoid,
      forest: (x: number, z: number) => woodsK(x, z) * 0.95 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 10 })), { test: (x: number, z: number) => inl(x, z) < 36 || villageK(x, z) > 0.6 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
