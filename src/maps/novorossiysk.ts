// Novorossiysk, the night of 4 February 1943 (1945 only; coastal: the Black Sea and Malaya Zemlya, 1.0 × 1.8 km). The main
// landing at Yuzhnaya Ozereyka was going wrong in the storm; the diversion went in at Stanichka, the southern suburb on the
// west shore of Tsemes Bay: Major Tsezar Kunikov's detachment of naval infantry, some 250 men in patrol boats, tugs and
// fishing boats, came in at about one in the morning under the German guns, smoke and the boats' 45s covering them, took a
// foothold a few hundred metres deep and held it. Reinforced night after night, "the little land" held for 225 days, until
// the city was freed in September. Kunikov was mortally wounded on the beach a week later.
// Laid out on the real bay: Tsemes Bay is a long inlet, and the map looks up it from its mouth. The open sea is out
// at +z; Cape Myskhako is the headland in the west, a rock bank under it no boat lands on; from the cape the bay's
// west shore runs on the slant, away to the south-east corner, and the whole east of the map is the bay itself —
// the far shore, Sudzhuk spit and the German guns at Kabardinka, is off the map. Two landing places, as in 1943: the
// shingle of Stanichka just inside the cape, the village of fishermen's and workers' houses rising behind it up
// Myskhako's slope; and deep in the bay the fish cannery's cemented quays, the cement works and the town's southern
// suburbs behind them — the boats' run to them is a kilometre up the bay under every gun on the west shore. Myskhako
// hill (west, the coastal battery) and the Markotkh ridge across the back, scrub oak and juniper on both.
// Not point-mirrored: one side lands, the other holds (modes/landing). The Soviet side lands (`nato`: the Red Army),
// the Wehrmacht holds (`pact`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1943_02);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e4a54 }); // (the Black Sea in winter: dark slate-green)

type P2 = [number, number];
/** The waterline, west to east (z of the shore at x; the water on the +z side): the open coast under the cape, Cape
 *  Myskhako, then the bay's west shore on the slant — Stanichka's shingle, the cannery quays' straight face — away up the bay. */
const SHORE: P2[] = [[-1010, 300], [-470, 340], [-415, 405], [-372, 410], [-300, 300], [-235, 170], [-200, 105], [-130, 40], [-75, -60], [-10, -180], [20, -310], [170, -312], [205, -372], [290, -520], [380, -700], [440, -910], [1010, -2000]];
export const shoreZ = (x: number) => { for (let i = 0; i < SHORE.length - 1; i++) { const [ax, az] = SHORE[i], [bx, bz] = SHORE[i + 1]; if (x <= bx) return az + (bz - az) * (x - ax) / (bx - ax); } return -2000; };
function segD(x: number, z: number, a: P2, b: P2) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
const lineD = (x: number, z: number, L: P2[]) => { let d = Infinity; for (let i = 0; i < L.length - 1; i++) d = Math.min(d, segD(x, z, L[i], L[i + 1])); return d; };
/** Signed distance to the water's edge: + on land (m inland), − in the water. */
const shoreD = (x: number, z: number) => (z < shoreZ(x) ? 1 : -1) * lineD(x, z, SHORE);

/** The quays (deep in the bay): how much of the shore here is the cannery's concrete. */
const quayK = (x: number, z: number) => smoothstep(0, 30, x) * smoothstep(190, 160, x) * smoothstep(-250, -290, z);
/** The rock bank round Cape Myskhako: 1 under it, 0 at Stanichka and up the bay. */
const cliffK = (x: number, z: number) => smoothstep(-215, -265, x) * smoothstep(150, 220, z);

/** Myskhako hill and the Markotkh ridge: the high ground the German guns stood on. */
const hills = (x: number, z: number) => 66 * Math.exp(-((x + 380) ** 2 + (z + 120) ** 2) / (2 * 150 ** 2))
  + smoothstep(-560, -800, z + 0.35 * x) * 50 * (0.85 + 0.3 * fbm(noise, x * 0.004, 5.5, 2)) * smoothstep(-60, 120, -x + 60);

const heightC = gridCacheSmooth((x: number, z: number) => {
  const sd = shoreD(x, z), q = quayK(x, z);
  if (sd < 0) { // the bottom: shingle shelving quickly (the boats ground 20–30 m out), deep water hard against the quays and up the bay
    const d = -sd;
    const shelf = Math.max(-16, 0.6 - d * 0.06 - Math.max(0, d - 60) * 0.08);
    const quay = Math.max(-16, 1.6 - smoothstep(0, 3, d) * 4.4 - d * 0.02);
    return shelf * (1 - q) + quay * q;
  }
  const back = sd;
  const beach = 0.6 + back * 0.06;
  const land = 2.4 + back * 0.04 + fbm(noise, x * 0.006, z * 0.006, 3) * 3 * smoothstep(20, 120, back) + hills(x, z);
  let h = beach + (land - beach) * smoothstep(8, 40, back);
  const ck = cliffK(x, z); // (the rock bank: 12 m straight up behind a strip of shingle — men scramble up it, nothing on wheels)
  if (ck > 0) h += (Math.max(h, beach + (land + 11 * smoothstep(140, 70, back) - beach) * smoothstep(10, 22, back)) - h) * ck;
  if (q > 0) h = h * (1 - q) + (back < 70 ? 1.6 : 1.6 + (land - 1.6) * smoothstep(70, 140, back)) * q; // (the concrete apron, the cannery yard)
  return h;
}, { x: 1000, z: 1000 }, 3);
const height = (x: number, z: number) => heightC(x, z);

/** The streets and tracks (polylines): the shore road up the bay, Stanichka's street, up from the quays, the Myskhako road over the saddle. */
const ROADS: P2[][] = [
  [[-250, 120], [-180, 20], [-110, -70], [-50, -180], [-20, -330], [80, -390], [190, -440], [260, -580], [330, -760], [370, -900]], // the shore road
  [[-150, 30], [-230, -60], [-290, -110], [-270, -260], [-230, -420]],                                                         // Stanichka's street, up past the vineyards
  [[90, -360], [140, -520], [60, -600]],                                                                                       // up from the quays into the suburbs
  [[-500, -380], [-230, -420], [-60, -470], [60, -600], [-120, -700], [-200, -820], [-220, -910]],                             // the Myskhako road over the saddle, on to the ridge
];
const roadD = (x: number, z: number) => { let d = Infinity; for (const L of ROADS) d = Math.min(d, lineD(x, z, L)); return d; };
const onRoad = (x: number, z: number, m = 0) => roadD(x, z) < 3.5 + m;

/** The beach sectors (x) and what each opens. */
export const SECTORS = [
  { x: -165, name: 'Stanichka beach' },
  { x: 95, name: 'Cannery quay' },
];
const VILLAGE = { x: -255, z: -95 };      // Stanichka, up the slope
const SUBURBS = { x: 175, z: -530 };      // Novorossiysk's southern edge, up the bay
const VINEYARDS = { x: -300, z: -300 };   // on Myskhako's slope

/** The German bunkers: over Stanichka's shingle, on the cape over the bay's mouth, on the quays; the coastal guns on Myskhako that fire on the boats. */
const FORTS = [
  { unit: 'wn', x: -215, z: 35, facing: 0 }, { unit: 'wn', x: -95, z: -50, facing: 0 },
  { unit: 'wn', x: -305, z: 250, facing: 0.6 }, { unit: 'wn', x: 150, z: -385, facing: 0 },
  { unit: 'battery', x: -390, z: -150, facing: 0 },
];
/** Where a work goes: `back` m in from the shore off x, along the line the boats come in on. */
const behind = (x: number, back: number) => ({ x, z: shoreZ(x) - back });
const shoreYaw = (x: number) => -Math.atan2(shoreZ(x + 5) - shoreZ(x - 5), 10);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Tsemes Bay', x: 270, z: 720, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Stanichka beach', ...behind(-165, 40), owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: 'Cannery quay', ...behind(95, 40), owner: null, sector: 'east', radius: 45, opens: 'F' },
  { id: 'E', name: 'Stanichka', ...VILLAGE, owner: null, sector: 'west' },
  { id: 'F', name: 'Southern suburbs', ...SUBURBS, owner: null, sector: 'east' },
  { id: 'K', name: 'Markotkh ridge', x: -170, z: -720, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'novorossiysk',
  name: 'Novorossiysk',
  description: 'Malaya Zemlya, the night of 4 February 1943: Kunikov’s naval infantry come in by patrol boat to the shingle at Stanichka inside Cape Myskhako and up Tsemes Bay to the cannery quays south of Novorossiysk, under the German guns on Myskhako and the Markotkh ridge.',
  epochs: ['1945'],
  region: 'east', // (the menu's Eastern Front: maps/index.js REGIONS)
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Soviet Union', pact: 'Germany' },
  armies: { nato: ['sov'], pact: ['wh'] }, // (the Black Sea Fleet's naval infantry — the Red Army's roster — against the Wehrmacht's 73rd Infantry Division)
  airfields: [], // (no room for a runway between the hills and the bay: the aircraft come in from the map edge)
  conditions: { time: 'night', weather: 'clear' }, // (in at about one in the morning)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the rock bank under Myskhako is no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1943,
  height,
  river: sea,
  fields: createFields({ seed: 1943, cell: 60, weights: [0.3, 0.2, 0.3, 0.2] }),

  theme: {
    // a hard, clear winter's day on the Black Sea coast (Conditions.js makes it the night)
    fogColor: 0xa8b2b8, fogDensity: 0.0005,
    skyTop: 0x5e7a96, skyHorizon: 0xc8d0d4, skyBottom: 0x8a949a,
    sunColor: 0xf2e6d2, sunIntensity: 1.8, sunDisk: 0.3,
    clouds: 0.4, cloudLight: 0xe4e6e6, cloudDark: 0x8a949c,
    sunDir: [0.4, 0.4, 0.8],
    hemiSky: 0xc4ccd4, hemiGround: 0x5a5440, hemiIntensity: 1.3,
    rimColor: 0xc8d0d8, rimIntensity: 0.2,
    terrain: {
      grass: '#6a6a44', grassAlt: '#5c5e3c', dryGrass: '#8e8458', dirt: '#6a5844', rock: '#8a8478', // (February: brown grass, bare limestone and marl)
      pasture: '#6c6c46', ploughed: '#5e4a38', stubble: '#8a7e56', meadow: '#686c44',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        if (onRoad(x, z)) return [0x6a6050, 0.85];
        const sd = shoreD(x, z);
        if (sd < -4) return [y > 0.3 ? 0xa8a296 : 0x7e7a70, 1];                          // the bottom: shingle and silt
        if (quayK(x, z) > 0.5 && sd < 72) return [0x8c8a84, 1];                           // the cemented quays
        if (sd < 22) return [0x9a958a, 1];                                                // the shingle
        if (cliffK(x, z) > 0.3 && sd < 30) return [0x9a9282, 0.9];                        // the bank's grey marl
        return null;
      },
    },
  },

  bases: { nato: { x: 270, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: -200, z: -800, entries: [-150, 0, 150] } },
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 300 }, pact: { x: -100, z: -200 } },
  points,
  spawns: { nato: [], pact: [] }, // (no warships: the Black Sea Fleet's cruisers and destroyers shelled from far out and went home before dawn)

  landing: {
    // what the naval infantry come in (systems/Landing.js): a section on an MO-4's deck, a gun or a tank in a tender
    craft: { infantry: ['moBoat', 'moBoat', 'tender'], vehicle: 'tender' },
    // nothing to call in at sea: the fleet's ships fired their preparation from far offshore and left (the game has no
    // Soviet warships), and the bay was not swept — the boats ran in through the German fire, not through mines
    navy: [],
    // the German positions: bunkers over the shingle, on the cape and on the quays, the coastal guns on Myskhako that fire on the boats
    forts: FORTS,
    // wire along the shingle and the quay edge, mines before the village and the cannery, tank traps across the ways up
    works: [
      ...Array.from({ length: 60 }, (_, i) => { const x = -250 + i * 8; return x > 210 ? null : { kind: 'wire', ...behind(x, quayK(x, shoreZ(x) - 10) > 0.5 ? 8 : 14), yaw: shoreYaw(x) }; }).filter((w) => !!w),
      ...SECTORS.flatMap((s) => [-34, 34].map((dx) => ({ kind: 'mines', ...behind(s.x + dx, 48) }))),
      ...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => ({ kind: 'trench', ...behind(s.x + dx, s.x > 0 ? 78 : 66), yaw: shoreYaw(s.x + dx) }))),
      ...SECTORS.flatMap((s) => [-20, 20].map((dx) => ({ kind: 'mgNest', ...behind(s.x + dx, s.x > 0 ? 72 : 60), yaw: shoreYaw(s.x + dx) }))),
      { kind: 'tankTraps', ...behind(-150, 30), yaw: shoreYaw(-150) }, { kind: 'tankTraps', ...behind(95, 66), yaw: 0 },
    ],
    // the 73rd Infantry Division's men over the beaches and in the houses, mortars and the guns behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mortar', 'atTeam', 'rifles', 'mortar', 'rifles', 'scouts'],
    hold: [
      ...SECTORS.flatMap((s) => [-50, 50].map((dx) => behind(s.x + dx, s.x > 0 ? 90 : 72))),
      VILLAGE, SUBURBS, VINEYARDS, { x: -30, z: -420 },
    ],
    // the morning's counter-attack: assault guns and grenadiers down from the ridge
    counter: { t: 420, units: ['tankDestroyer', 'rifles', 'tankDestroyer', 'rifles'], say: 'Assault guns and grenadiers are coming down from the Markotkh ridge, straight for the beachhead', sayOther: 'Enemy assault guns coming down from the ridge' },
    // the landing's AI (ai/LandingDirector.js): no ships to buy — men first, a gun and the Lend-Lease tanks later
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'engineers', 'rifles', 'atTeam', 'mortar', 'rifles', 'mgTeam', 'tank', 'rifles', 'engineers', 'rifles', 'tank'], gunship: null, gunships: 0, heavy: null },
    economy: { reserves: 3000, perSector: 1000, beachIncome: 1.5, defenceCp: 500, defenceIncome: 1.0 }, // (two ways in, the quays a long run up the bay: AI vs AI 2026-11-25 — the landing won at 20 and 27 min)
    // Kunikov's detachment: in on Stanichka's shingle first, the quays at the same time
    waves: [{ t: 0, say: 'Kunikov’s detachment is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'engineers', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1943);
    sea.build(scene, terrain);
    const forts = FORTS;
    const clear = (x: number, z: number, d = 18) => !onRoad(x, z, 2) && !forts.some((f) => Math.hypot(f.x - x, f.z - z) < d + 10) && !points.some((p) => Math.hypot(p.x - x, p.z - z) < 14 + d * 0.3) && Math.abs(x) < 488;

    // ---- Stanichka: one-storey houses with walled gardens either side of the street, up the slope
    for (let i = 0; i < 60; i++) {
      const x = -320 + r() * 230, z = -10 - r() * 200;
      if (!clear(x, z, 10) || shoreD(x, z) < 70) continue;
      const yaw = Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.1;
      if (r() < 0.25) props.townHouse({ x, z, yaw, width: 8 + r() * 3, depth: 7, storeys: 1, name: 'house', damaged: 0.3 });
      else props.house({ x, z, yaw, width: 7 + r() * 3, depth: 6 + r() * 2, height: 3 });
      if (r() < 0.6) props.lowWall({ x: x + Math.cos(yaw) * 7, z: z - Math.sin(yaw) * 7, yaw: yaw + Math.PI / 2, length: 10, height: 1.2, color: 0xa29c8c });
    }
    // fishermen's boats drawn up on the shingle
    for (let i = 0; i < 12; i++) {
      const x = -230 + r() * 200; if (Math.abs(x + 165) < 26) continue;
      const p = behind(x, 6 + r() * 6), g = terrain.heightAt(p.x, p.z);
      props.box('plain', p.x, g + 0.4, p.z, 1.8, 0.8, 6, r() * 0.6 - 0.3 + Math.PI / 2, 0x4e5a5e);
    }

    // ---- the quays: bollards on the edge, the fish cannery's sheds, the cement works behind (chimney, silos, conveyor)
    for (let x = 25; x < 170; x += 14) props.column({ ...behind(x, 1.5), radius: 0.35, height: 0.8 });
    for (const [x, z] of [[40, -400], [150, -420], [60, -450]] as [number, number][]) props.hall({ x, z, yaw: 0, width: 32, depth: 14, height: 6, color: 0x9a8e7a, roof: 0x5a5c5e, door: 5, name: 'cannery shed' });
    props.hall({ x: 230, z: -470, yaw: 1.0, width: 28, depth: 12, height: 7, color: 0x8e8a80, roof: 0x4e5052, door: 6, name: 'warehouse' });
    props.tanks({ x: 10, z: -520, yaw: 0, count: 3, radius: 4, height: 16, color: 0xa4a29a });
    props.chimney({ x: -20, z: -560, height: 36 });
    props.hall({ x: 20, z: -575, yaw: 0, width: 30, depth: 16, height: 10, color: 0x8a8678, roof: 0x4a4c4e, door: 6, name: 'cement works' });
    props.conveyor({ x0: 10, z0: -510, x1: 0, z1: -440, y0: 16, y1: 6 });

    // ---- the southern suburbs: workers' blocks and houses, knocked about
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + r() * 0.3, dd = 40 + r() * 80;
      const x = SUBURBS.x + Math.cos(a) * dd, z = SUBURBS.z + Math.sin(a) * dd * 0.9;
      if (!clear(x, z, 12) || shoreD(x, z) < 30) continue;
      if (i % 4 === 0) props.ruinBlock({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 22, depth: 11, storeys: 3, ruin: 0.4, name: 'apartment block' });
      else props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0.4 });
    }

    // ---- the vineyards on Myskhako's slope: rows of vines on their stakes, in blocks
    for (const [vx, vz, w, dpt] of [[-300, -300, 130, 80], [-420, -330, 90, 70], [-190, -270, 80, 60], [-360, -420, 100, 60]] as const) {
      for (let row = 0; row < dpt; row += 3.2) for (let s = 0; s < w; s += 5) {
        const x = vx - w / 2 + s + 2.5, z = vz - dpt / 2 + row;
        if (onRoad(x, z, 1) || Math.hypot(x - VINEYARDS.x, z - VINEYARDS.z) < 12 || forts.some((f) => Math.hypot(f.x - x, f.z - z) < 30) || Math.abs(x) > 495) continue;
        props.box('plain', x, terrain.heightAt(x, z) + 0.55, z, 4.6, 1.1, 0.35, 0, 0x3e3a28); // (February: bare brown vines on the wires)
      }
    }
    // a few farm buildings and a winery on the Myskhako road; the lighthouse on the cape
    for (let i = 0; i < 6; i++) { const x = -460 + i * 55 + (r() - 0.5) * 20, z = -440 - r() * 30; if (clear(x, z, 10)) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 7, height: 3.4 }); }
    { const x = -400, z = 360, g = terrain.heightAt(x, z);
      props.box('stone', x, g + 7, z, 3.4, 14, 3.4, 0, 0xe8e4dc); props.box('metal', x, g + 15, z, 3.8, 2, 3.8, 0, 0x2a2a2a); }
    commandPost(props, this.bases.pact, 1, 0x6a6a5a);
    props.finish();

    const land = (x: number, z: number) => shoreD(x, z) > 30;
    const avoid = [{ x: -200, z: -800, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z, 1) }];
    // scrub oak and juniper on Myskhako and the ridge, a few trees in the gardens
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1400, broadleaf: 0.7, autumn: 0.35, maxY: 120,
      avoid: [...avoid, { test: (x: number, z: number) => !land(x, z) || quayK(x, z) > 0.5 && shoreD(x, z) < 150 }],
      forest: (x: number, z: number) => Math.min(1, smoothstep(14, 40, hills(x, z)) * 0.9 + smoothstep(0.2, 0.5, fbm(noise, x * 0.008 + 3, z * 0.008, 2)) * 0.3) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => shoreD(x, z) < 24 || quayK(x, z) > 0.5 && shoreD(x, z) < 75 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
