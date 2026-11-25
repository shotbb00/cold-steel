// Corfu (hypothetical; coastal, the 1806 epoch: the Russians land, the French hold; 1.0 × 1.8 km). Corfu was the
// Russians’ base in the Mediterranean from Ushakov’s siege of 1799 until Tilsit gave the Ionian Islands to France in
// 1807, when César Berthier’s French marched in and Donzelot held the place to 1814. Here Senyavin’s squadron comes
// back to take it from them.
// The ground is the real town on its headland, the Corfu channel the −z side (east; north is −x). The Old Fortress
// stands far out in the sea on its own rock with its two peaks, cut off from the town by the Contrafossa, the Venetian
// sea moat, with one bridge over it; behind the moat the Spianada, the great open esplanade, and the walled town on
// its low hill. North of the town the old port under the New Fortress on its hill, with the island of Vido out in
// the channel; south of the Old Fortress the deep round curve of Garitsa bay running far back inland to its beach; at
// the bay’s southern horn the windmill point of Anemomylos and the wooded hill of Analipsis over ancient Palaiopolis.
// Four ways in: the old port, up to the New Fortress; the Old Fortress’s own landing under the Sea Peak and over the
// bridge onto the Spianada; the beach at the head of Garitsa bay, the long row in under the fortress guns, and
// straight across to the Spianada; Anemomylos, up to Analipsis. Inland the olive groves and Monte Abramo, where the
// French come from.
// A scenario, not a fair battle (MAP_BRIEF_SEA_COAST.md): balanced with AI-vs-AI runs so the landing wins late or the
// defence just holds. Written with the sea on the lander’s side (−z), as `pact` lands; a campaign landing by the
// French is the map turned round (wcampaign/battle.js flipLanding): the same beaches and draws, the Russians in the forts.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost, buildVillage } from './common.js';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1807_0808);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a7a92 }); // (the Ionian: clear blue over the sand and weed)

/** The Old Fortress’s rock (x), out in the sea. */
const OLD = { x: -75, w: 62 };
/** The waterline (world z; the channel toward −z): the old port’s cove, the Old Fortress’s rock far out, Garitsa bay deep in, Anemomylos. */
export const shoreZ = (x: number) => -210 + fbm(noise, x * 0.006, 2.1, 2) * 8
  + 40 * Math.exp(-(((x + 320) / 70) ** 2))                      // the old port
  - 220 * Math.exp(-(((x - OLD.x) / OLD.w) ** 4))                 // the Old Fortress
  + 250 * Math.exp(-(((x - 170) / 140) ** 2))                     // Garitsa bay
  - 70 * Math.exp(-(((x - 420) / 70) ** 2));                      // Anemomylos point
const inland = (x: number, z: number) => z - shoreZ(x);

/** The beach sectors (x), how wide their beach is, and what lies inland behind each. */
export const SECTORS = [
  { x: -320, w: 55, name: 'The old port', inland: { name: 'The New Fortress', x: -340, z: -20 } },
  { x: -60, w: 22, name: 'The Old Fortress', inland: { name: 'The Spianada', x: -75, z: -110 } },
  { x: 170, w: 70, name: 'Garitsa beach', inland: { name: 'The Spianada', x: -75, z: -110 } },
  { x: 410, w: 40, name: 'Anemomylos', inland: { name: 'Analipsis', x: 330, z: 200 } },
];
const beachK = (x: number) => Math.max(...SECTORS.map((s) => Math.exp(-(((x - s.x) / s.w) ** 2))));
/** The Contrafossa: the sea moat across the neck (z), and its one bridge (x). */
const MOAT = { z: -265, half: 9, bridge: -40 };
const inMoat = (x: number, z: number) => Math.abs(z - MOAT.z) < MOAT.half && Math.abs(x - OLD.x) < OLD.w + 30 && Math.abs(x - MOAT.bridge) > 9;

/** The Old Fortress’s two peaks (the Sea Peak and the Land Peak) on the rock’s north side, the New Fortress’s hill, the town’s hill, Analipsis, Monte Abramo. */
const PEAKS = [{ x: -105, z: -400, r: 30, h: 40 }, { x: -110, z: -330, r: 28, h: 28 }];
const NEWF = { x: -370, z: 40 }, ANALIPSIS = { x: 345, z: 230 }, ABRAMO = { x: 150, z: 620 }, TOWNHILL = { x: -220, z: -70 };
/** Vido, the island in the channel off the old port. */
const VIDO = { x: -440, z: -610, r: 75 };
const bump = (x: number, z: number, c: { x: number; z: number }, r: number, amp: number) => amp * Math.exp(-((x - c.x) ** 2 + (z - c.z) ** 2) / (r * r));
/** 0..1 on the Old Fortress’s rock (beyond the moat). */
const onRock = (x: number, z: number) => smoothstep(1.4, 0.8, Math.abs(x - OLD.x) / OLD.w) * smoothstep(MOAT.z + 5, MOAT.z - 5, z);

function heightRaw(x: number, z: number) {
  const d = inland(x, z), bk = beachK(x);
  if (d < 0) { // the bottom: sand shelving off the beaches, deep water round the fortress rock and along the town wall; Vido
    const s = -d, bar = 0.4 * Math.exp(-(((s - 40) / 12) ** 2));
    const shelf = 0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, deep = -1.5 - s * 0.22;
    let h = Math.max(deep + (shelf - deep) * smoothstep(0.15, 0.7, bk), -18);
    const vd = Math.hypot(x - VIDO.x, (z - VIDO.z) * 0.8);
    if (vd < VIDO.r + 40) h = Math.max(h, (14 + fbm(noise, x * 0.03, z * 0.03, 2) * 3) * smoothstep(VIDO.r + 5, VIDO.r - 40, vd) + 0.6 - 7 * smoothstep(VIDO.r - 5, VIDO.r + 40, vd));
    return h;
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const rock = (1 - smoothstep(0.2, 0.75, bk)) * 5 * smoothstep(0, 10, d) * smoothstep(200, 60, d); // (the sea walls and the rocky shore)
  let land = beach + rock + 0.03 * Math.min(Math.max(z + 200, 0), 700) * smoothstep(0, 60, d)
    + fbm(noise, x * 0.005, z * 0.005, 3) * 4 * smoothstep(20, 90, d)
    + bump(x, z, NEWF, 90, 26) + bump(x, z, ANALIPSIS, 110, 36) + bump(x, z, ABRAMO, 170, 30) + bump(x, z, TOWNHILL, 120, 10);
  for (const p of PEAKS) land += bump(x, z, p, p.r, p.h) * smoothstep(-2, 8, d);
  if (inMoat(x, z)) land = Math.min(land, -2.5); // the Contrafossa
  return land + smoothstep(BOUNDS.x - 60, BOUNDS.x + 160, Math.abs(x)) * 20 * smoothstep(30, 200, d);
}
const height = gridCacheSmooth(heightRaw, BOUNDS, 2);

/** Soft going: the beaches’ sand. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 30 && beachK(x) > 0.3) return foot ? 0.85 : 0.6;
  return 1;
}

const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const P0 = SECTORS.map((s) => ({ x: s.x, z: shoreZ(s.x) + (s.w < 30 ? 32 : 40) }));
const SPIANADA = SECTORS[1].inland;
/** The roads: along the shore from the old port through the town onto the Spianada, round Garitsa to Anemomylos; out over
 * the bridge to the Old Fortress; up to the New Fortress; inland to Monte Abramo; up Analipsis. */
const ROADS: number[][] = [
  [-520, P0[0].z + 40, P0[0].x, P0[0].z], [P0[0].x, P0[0].z, -230, -150], [-230, -150, SPIANADA.x, SPIANADA.z], [SPIANADA.x, SPIANADA.z, 40, -40],
  [40, -40, P0[2].x, P0[2].z], [P0[2].x, P0[2].z, 300, -60], [300, -60, P0[3].x, P0[3].z],
  [SPIANADA.x, SPIANADA.z, MOAT.bridge, MOAT.z + 20], [MOAT.bridge, MOAT.z + 20, MOAT.bridge, MOAT.z - 30], [MOAT.bridge, MOAT.z - 30, P0[1].x, P0[1].z],
  [P0[0].x, P0[0].z, -340, -20], [-340, -20, -300, 300], [-300, 300, ABRAMO.x, ABRAMO.z], [-300, 300, -300, 900],
  [-230, -150, -100, 250], [-100, 250, ABRAMO.x, ABRAMO.z], [ABRAMO.x, ABRAMO.z, 60, 900],
  [300, -60, 330, 200], [330, 200, 280, 420], [280, 420, ABRAMO.x, ABRAMO.z], [280, 420, 380, 900],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));
const roadC = gridCache(roadDist, BOUNDS, 2);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Senyavin’s squadron', x: 150, z: -790, owner: 'pact', sector: 'centre', radius: 80 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: P0[0].x, z: P0[0].z, owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: P0[1].x, z: P0[1].z, owner: null, sector: 'centre', radius: 35, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: P0[2].x, z: P0[2].z, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'H', name: SECTORS[3].name, x: P0[3].x, z: P0[3].z, owner: null, sector: 'east', radius: 40, opens: 'G' },
  { id: 'E', name: SECTORS[0].inland.name, x: SECTORS[0].inland.x, z: SECTORS[0].inland.z, owner: null, sector: 'west' },
  { id: 'F', name: SPIANADA.name, x: SPIANADA.x, z: SPIANADA.z, owner: null, sector: 'centre', radius: 50 },
  { id: 'G', name: SECTORS[3].inland.name, x: SECTORS[3].inland.x, z: SECTORS[3].inland.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Monte Abramo', x: ABRAMO.x, z: ABRAMO.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const pointClear = (x: number, z: number, r: number) => points.every((p) => Math.hypot(p.x - x, p.z - z) > r);
const OLDF = { x: -105, z: -365 };     // the Old Fortress’s walls round its peaks (the rock’s north side)
const NEWF_WALLS = { x: NEWF.x + 10, z: NEWF.z + 45 }; // the New Fortress: behind its point (the gate toward the town)
/** The walled town: on its hill between the old port and the Spianada. */
const inTown = (x: number, z: number) => { const d = inland(x, z); return d > 25 && z < 60 && x > -300 && x < -130 && onRock(x, z) < 0.2; };

/** Olive groves everywhere inland, cypresses, the wood on Analipsis (0..1). */
const woods = gridCache((x: number, z: number) => {
  const d = inland(x, z);
  if (d < 0) return Math.hypot(x - VIDO.x, z - VIDO.z) < VIDO.r - 20 ? 0.6 : 0;
  if (d < 40 || inTown(x, z) || onRock(x, z) > 0.3 || Math.hypot(x - SPIANADA.x, z - SPIANADA.z) < 90) return 0;
  let k = smoothstep(0.35, 0.58, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.45 + 0.4 * smoothstep(150, 500, d));
  k = Math.max(k, 0.7 * Math.exp(-((x - ANALIPSIS.x) ** 2 + (z - ANALIPSIS.z) ** 2) / 150 ** 2));
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
}, BOUNDS, 4);

export default {
  id: 'corfu-landing',
  name: 'Corfu 1807',
  description: 'Corfu (hypothetical), 1807: Senyavin’s Russians come back to take the island the French were given at Tilsit. The Old Fortress far out on its rock behind the Contrafossa, the Spianada and the walled town, the old port under the New Fortress with Vido off it, the deep curve of Garitsa bay, Anemomylos and Analipsis.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Russia' },
  armies: { nato: ['fr'], pact: ['ru'] }, // (the map names ru, so it fields in the Ionian though ru's regions are Poland's — GameEngine armiesOn)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' }, // (late summer in the Ionian)
  wind: { from: 330, speed: 4, veer: 0.15 }, // (the maestro: the summer north-westerly down the channel)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1807_0808,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1807_8, cell: 60, weights: [0.3, 0.3, 0.25, 0.15] }), // (the dry summer grass under the olives)

  theme: {
    // a hot, clear Ionian day: the Albanian mountains hazy across the channel
    fogColor: 0xd0d4d0, fogDensity: 0.00045,
    skyTop: 0x4e86c4, skyHorizon: 0xd6dcde, skyBottom: 0xa0a08c,
    sunColor: 0xfff2d8, sunIntensity: 2.1, sunDisk: 0.6,
    clouds: 0.1, cloudLight: 0xf6f4ee, cloudDark: 0xc8c8c0,
    sunDir: [0.3, 0.7, -0.55],
    hemiSky: 0xd0dce6, hemiGround: 0x847a56, hemiIntensity: 1.2,
    rimColor: 0xf0e6d0, rimIntensity: 0.3,
    terrain: {
      grass: '#848a4e', grassAlt: '#7a8046', dryGrass: '#b0a06a', dirt: '#8e7050', rock: '#a89c86',
      pasture: '#949258', ploughed: '#8e6c4a', stubble: '#c0ac76', meadow: '#7a8848',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z), bk = beachK(x);
        if (y < 0.3) return [y > -1.2 ? 0xd4caa8 : 0x6e8a84, 1];                         // the sand and the weed under the water
        if (d < 0) return [y < 3 ? 0xb8ac94 : 0x8a8a5a, 0.9];                            // Vido: its rock and its scrub
        if (d < 28 && bk > 0.3) return [0xdcd0ac, 1];                                     // the beaches
        if (d < 14 || onRock(x, z) > 0.5) return [0xb8ac94, 0.9];                         // the rock and the fortress’s stone
        if (Math.hypot(x - SPIANADA.x, z - SPIANADA.z) < 85) return [0x9c9a64, 0.6];      // the Spianada’s worn grass
        if (roadC(x, z) < 3) return [inTown(x, z) ? 0xb4aa94 : 0xb09a74, 0.85];
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 60, 380] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Russians land: their roads are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 250 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.15,
    signal: { t: 25, say: 'A gun from the flagship — the boats pull for the shore', sayOther: 'Boats coming across the channel: the Russians are landing!' },
    navy: ['frigate', 'destroyer'],
    // the Old Fortress’s batteries (the Sea Peak and the Land Peak), the New Fortress’s over the old port, a field battery behind Garitsa
    forts: [
      { unit: 'shoreBattery', x: PEAKS[0].x + 10, z: PEAKS[0].z - 20, facing: Math.PI },
      { unit: 'shoreBattery', x: -20, z: -300, facing: Math.PI / 2 + 0.4 },
      { unit: 'shoreBattery', x: NEWF.x + 40, z: NEWF.z - 50, facing: Math.PI },
      { unit: 'artillery', x: 260, z: shoreZ(260) + 80, facing: Math.PI },
    ],
    works: [
      ...SECTORS.filter((s) => s.w > 30).flatMap((s) => (s.w > 60 ? [-50, -15, 20, 55] : [-25, 25]).map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 58, yaw: 0 }))),
      ...SECTORS.filter((s) => s.w > 30).flatMap((s) => (s.w > 60 ? [-60, -40, -20, 20, 40, 60] : [-34, -20, 20, 34]).map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 30, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'mgTeam', 'rifles'],
    // Donzelot’s reserve from Monte Abramo
    counter: { t: 150, units: ['rifles', 'rifles', 'atTeam', 'reconVehicle', 'artillery'], say: 'The reserve is coming down from Monte Abramo — throw them back into the sea!', sayOther: 'French columns coming down through the olive groves!' },
    hold: [
      ...SECTORS.filter((s) => s.w > 30).flatMap((s) => [-25, 25].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 62 }))),
      { x: -80, z: -330 }, { x: SPIANADA.x, z: SPIANADA.z }, { x: SPIANADA.x + 40, z: SPIANADA.z + 40 }, { x: P.E.x, z: P.E.z }, { x: P.G.x, z: P.G.z },
    ],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'atTeam', 'artillery', 'rifles', 'atTeam', 'mgTeam', 'rifles', 'mortar', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 280 },
    economy: { reserves: 1900, perSector: 450, beachIncome: 0.5, defenceCp: 850, defenceIncome: 1.05 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'atTeam', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'rifles', sector: 2 },
        { unit: 'rifles', sector: 3 }, { unit: 'mgTeam', sector: 3 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 2 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 3 }] },
      { t: 300, say: 'The second division of boats is coming in', units: [{ unit: 'rifles', sector: 3 }, { unit: 'atTeam', sector: 2 }, { unit: 'mortar', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1807_0809);
    sea.build(scene, terrain);
    const STONE = 0xcabe9e, DARK = 0x8e8268, TOP = 0xb8ac8c;
    /** A walled work: four curtains (a gap for the gate in the landward one) from the lowest ground under them, bastions at the corners. */
    const fort = (cx: number, cz: number, hw: number, hd: number, yaw: number, h: number, gate = 6) => {
      const c = Math.cos(yaw), s = Math.sin(yaw), W = (lx: number, lz: number) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
      /** A curtain in pieces of at most 12 m, each standing on its own ground (the walls climb the rock). */
      const curtain = (lx: number, lz: number, len: number, along: boolean) => {
        const ry = yaw + (along ? 0 : Math.PI / 2), n = Math.ceil(len / 12), pl = len / n;
        for (let i = 0; i < n; i++) {
          const m0 = -len / 2 + pl * (i + 0.5), at = (m: number) => W(lx + (along ? m : 0), lz + (along ? 0 : m));
          const [x, z] = at(m0), hs = [-pl / 2, 0, pl / 2].map((m) => { const [px, pz] = at(m0 + m); return terrain.heightAt(px, pz); });
          const foot = Math.min(...hs) - 1.5, top = Math.max(...hs) + h;
          props.box('stone', x, (foot + top) / 2, z, pl + 0.3, top - foot, 2.4, ry, STONE);
          props.box('stone', x, top + 0.3, z, pl + 0.3, 0.6, 2.6, ry, TOP);
          props.cover.addBox({ x, z, yaw: ry, length: pl, thickness: 2.4, height: h });
        }
      };
      curtain(0, -hd, 2 * hw, true);
      const side = hw - gate / 2;
      curtain(-hw + side / 2, hd, side, true); curtain(hw - side / 2, hd, side, true);
      curtain(-hw, 0, 2 * hd, false); curtain(hw, 0, 2 * hd, false);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const [x, z] = W(sx * hw, sz * hd), g = terrain.heightAt(x, z);
        props.box('stone', x, g + (h - 1) / 2, z, 9, h + 3, 9, yaw + Math.PI / 4, STONE);
        props.cover.addBox({ x, z, yaw: yaw + Math.PI / 4, length: 9, thickness: 9, height: h });
      }
    };
    // ---- the Old Fortress round its peaks (the rock’s north side), the New Fortress on its hill (its gate toward the town)
    fort(OLDF.x, OLDF.z, 22, 62, 0, 7, 8);
    fort(NEWF_WALLS.x, NEWF_WALLS.z, 34, 26, -0.2, 8, 8);
    // the Old Fortress’s lighthouse on the Sea Peak, the Venetian barracks on the parade beside the peaks
    { const p = PEAKS[0], g = terrain.heightAt(p.x, p.z); props.box('stone', p.x, g + 5, p.z, 4, 10, 4, 0, 0xe2dac8); props.box('metal', p.x, g + 11, p.z, 3, 2, 3, 0, 0xd8c070); }
    props.rand = mulberry32(1807_0810);
    props.townHouse({ x: -30, z: -330, yaw: Math.PI / 2, width: 22, depth: 8, storeys: 2, name: 'the Venetian barracks', damaged: 0 });
    // the bridge over the Contrafossa
    { const g = Math.max(terrain.heightAt(MOAT.bridge, MOAT.z + 12), 1.2); props.box('stone', MOAT.bridge, g - 0.3, MOAT.z, 16, 0.6, MOAT.half * 2 + 6, 0, STONE); for (const s of [-1, 1]) props.box('stone', MOAT.bridge + s * 8, g + 0.3, MOAT.z, 0.4, 0.8, MOAT.half * 2 + 6, 0, TOP); }
    // ---- the town: tall Venetian houses inside the walls, each on its footing
    const footing = (x: number, z: number, w: number, d: number, yaw: number) => {
      const c = Math.cos(yaw), s = Math.sin(yaw), g = terrain.heightAt(x, z);
      const lo = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => terrain.heightAt(x + (a * w * c + b * d * s) / 2, z + (-a * w * s + b * d * c) / 2)));
      if (g - lo > 0.4) props.box('stone', x, (lo - 0.3 + g + 0.3) / 2, z, w + 0.6, g + 0.3 - lo + 0.3, d + 0.6, yaw, DARK);
    };
    const slopeAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 4, z) - terrain.heightAt(x - 4, z), terrain.heightAt(x, z + 4) - terrain.heightAt(x, z - 4)) / 8;
    const clear = (x: number, z: number, rr: number) => roadC(x, z) > 5 + rr && pointClear(x, z, 26 + rr) && Math.hypot(x - OLDF.x, z - OLDF.z) > 75 + rr && Math.hypot(x - NEWF_WALLS.x, z - NEWF_WALLS.z) > 48 + rr;
    for (let i = 0, n = 0; i < 1000 && n < 75; i++) {
      const x = -300 + r() * 170, z = -200 + r() * 260;
      if (!inTown(x, z) || !clear(x, z, 6) || slopeAt(x, z) > 0.3) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      const yaw = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.15, w = 7 + r() * 3;
      footing(x, z, w, 9, yaw);
      props.townHouse({ x, z, yaw, width: w, depth: 9, storeys: r() < 0.6 ? 3 : 2, damaged: 0 });
    }
    // the Liston’s arcade along the Spianada’s town side, the church of Saint Spyridon behind it
    props.rand = mulberry32(1807_0811);
    props.townHouse({ x: SPIANADA.x - 80, z: SPIANADA.z + 10, yaw: Math.PI / 2, width: 60, depth: 10, storeys: 3, name: 'the Liston', damaged: 0 });
    props.church({ x: SPIANADA.x - 115, z: SPIANADA.z + 60, yaw: 0 });
    // Analipsis: the hamlet over Palaiopolis, the windmill’s tower on Anemomylos point; the monastery on Vido
    buildVillage(props, P.G, 18071);
    { const x = SECTORS[3].x + 45, z = shoreZ(SECTORS[3].x + 45) + 22, g = terrain.heightAt(x, z); props.box('stone', x, g + 4, z, 5, 8, 5, 0, 0xe6dece); props.box('plain', x, g + 8.6, z, 4.6, 1.4, 4.6, 0.4, 0x6a5a48); }
    props.church({ x: VIDO.x + 15, z: VIDO.z + 10, yaw: 0.3 });
    // farms in the olive groves
    for (let i = 0, n = 0; i < 500 && n < 24; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 50), z = shoreZ(x) + 80 + r() * 560;
      if (inTown(x, z) || !clear(x, z, 10) || slopeAt(x, z) > 0.22 || Math.hypot(x - SPIANADA.x, z - SPIANADA.z) < 100 || z > 760) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      const yaw = r() * Math.PI;
      footing(x, z, 9, 6, yaw);
      props.house({ x, z, yaw, width: 8 + r() * 3, depth: 6 });
      if (r() < 0.5) props.lowWall({ x: x + 9, z: z + 7, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.1, color: 0xa49a86 });
    }
    for (let i = 0; i < 4; i++) { const x = -350 + i * 10; props.box('plain', x, terrain.heightAt(x, shoreZ(x) + 12) + 0.4, shoreZ(x) + 12, 1.6, 0.6, 5, 0.2, 0x5a4434); }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { x: OLDF.x, z: OLDF.z, r: 75 }, { x: NEWF_WALLS.x, z: NEWF_WALLS.z, r: 48 },
      { test: (x: number, z: number) => roadC(x, z) < 5 || (inland(x, z) < 30 && inland(x, z) > -1) || height(x, z) < 1.5 || inTown(x, z) || Math.hypot(x - SPIANADA.x, z - SPIANADA.z) < 85 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2600, broadleaf: 0.75, autumn: 0, maxY: 200,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 32 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
