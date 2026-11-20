// Novorossiysk, the night of 4 February 1943 (1945 only; coastal: the Black Sea and Malaya Zemlya, 1.0 × 1.8 km). The main
// landing at Yuzhnaya Ozereyka was going wrong in the storm; the diversion went in at Stanichka, the southern suburb on the
// west shore of Tsemes Bay: Major Tsezar Kunikov's detachment of naval infantry, some 250 men in patrol boats, tugs and
// fishing boats, came in at about one in the morning under the German guns, smoke and the boats' 45s covering them, took a
// foothold a few hundred metres deep and held it. Reinforced night after night, "the little land" held for 225 days, until
// the city was freed in September. Kunikov was mortally wounded on the beach a week later.
// On the map, from the sea (+z) looking inland: on the left (-x) the shore under Cape Myskhako — a narrow shingle strip
// under a rock bank no vehicle climbs, one gully with a track up it to the vineyards on Myskhako's slope; in the middle
// the shingle beach of Stanichka, the village of fishermen's and workers' houses rising behind it; on the right (+x) the
// cemented quays of the fish cannery and the cement works, the town's southern suburbs up behind them. Inland, Myskhako
// hill (west) and the Markotkh ridge across the back, scrub oak and juniper on both, where the German guns stood.
// Not point-mirrored: one side lands, the other holds (modes/landing). The Soviet side lands (`nato`: the Red Army),
// the Wehrmacht holds (`pact`).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1943_02);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e4a54 }); // (the Black Sea in winter: dark slate-green)

/** The quays (east): how much of the shore at x is the cannery's concrete. */
const quayK = (x: number) => smoothstep(200, 250, x);
/** The rock bank under Cape Myskhako (west): 1 under it, 0 in the gully and east of the beach. */
const GULLY = -330;
const cliffK = (x: number) => smoothstep(-150, -230, x) * smoothstep(12, 30, Math.abs(x - GULLY));
/** The waterline (z): the shore bowed a little, the quays' straight face standing out into the bay. */
export const shoreZ = (x: number) => (150 + fbm(noise, x * 0.004, 1.3, 2) * 12 - smoothstep(-150, -230, x) * 8) * (1 - quayK(x)) + 172 * quayK(x);

/** Myskhako hill and the Markotkh ridge: the high ground the German guns stood on. */
const hills = (x: number, z: number) => 58 * Math.exp(-((x + 440) ** 2 + (z + 330) ** 2) / (2 * 175 ** 2)) + smoothstep(-470, -760, z) * 52 * (0.85 + 0.3 * fbm(noise, x * 0.004, 5.5, 2));

function height(x: number, z: number) {
  const sz = shoreZ(x), d = z - sz, q = quayK(x);
  if (d > 0) { // the bottom: shingle shelving quickly (the boats ground 20–30 m out), deep water hard against the quays
    const shelf = 0.6 - d * 0.06 - Math.max(0, d - 60) * 0.08;
    const quay = 1.6 - smoothstep(0, 3, d) * 4.4 - d * 0.02;
    return Math.max(-16, shelf * (1 - q) + quay * q);
  }
  const back = -d; // m inland of the waterline
  const beach = 0.6 + back * 0.06;
  const land = 2.4 + back * 0.04 + fbm(noise, x * 0.006, z * 0.006, 3) * 3 * smoothstep(20, 120, back) + hills(x, z);
  let h = beach + (land - beach) * smoothstep(8, 40, back);
  const ck = cliffK(x); // (the rock bank: 10 m straight up behind 12 m of shingle — men scramble up it, nothing on wheels)
  if (ck > 0) h += (Math.max(h, beach + (land + 9 * smoothstep(130, 70, back) - beach) * smoothstep(12, 26, back)) - h) * ck; // (the bank's top falls back to the slope inland: the gully is 100 m long)
  if (q > 0) h = h * (1 - q) + (back < 70 ? 1.6 : 1.6 + (land - 1.6) * smoothstep(70, 140, back)) * q; // (the concrete apron, the cannery yard)
  return h;
}

/** The streets and tracks: along the shore, up the gully, up through Stanichka, up from the quays, the Myskhako road across. */
function onRoad(x: number, z: number) {
  const sz = shoreZ(x), back = sz - z;
  if (x > -200 && Math.abs(back - 62) < 3.5) return true;                                                   // the shore road
  if (Math.abs(x - (GULLY + Math.sin(z * 0.012) * 10)) < 3.5 && back > 6 && z > -470) return true;         // up the gully
  if (Math.abs(x - (20 + Math.sin(z * 0.01) * 18)) < 3.5 && back > 30 && z > -660) return true;            // Stanichka's street
  if (Math.abs(x - (340 + Math.sin(z * 0.011) * 14)) < 3.5 && back > 20 && z > -660) return true;          // up from the quays
  if (Math.abs(z - (-460 + Math.sin(x * 0.006) * 22)) < 3.5) return true;                                   // the Myskhako road
  return false;
}

/** The beach sectors (x) and what each opens. */
export const SECTORS = [
  { x: GULLY, name: 'Myskhako shore' },
  { x: 20, name: 'Stanichka beach' },
  { x: 340, name: 'Cannery quay' },
];
const VILLAGE = { x: 20, z: -110 };       // Stanichka
const VINEYARDS = { x: -320, z: -190 };   // on Myskhako's slope
const SUBURBS = { x: 350, z: -200 };      // Novorossiysk's southern edge

/** The German bunkers: one over the gully, two over Stanichka, one on the quays; the coastal guns on Myskhako that fire on the boats. */
const FORTS = [
  ...[GULLY + 70, -50, 90, 300].map((x) => ({ unit: 'wn', x, z: shoreZ(x) - (x > 200 ? 84 : x < -200 ? 34 : 46), facing: 0 })),
  { unit: 'battery', x: -430, z: -410, facing: 0 },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Tsemes Bay', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'Myskhako shore', x: GULLY, z: shoreZ(GULLY) - 16, owner: null, sector: 'west', radius: 40, opens: 'E' },
  { id: 'C', name: 'Stanichka beach', x: 20, z: shoreZ(20) - 26, owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: 'Cannery quay', x: 340, z: shoreZ(340) - 32, owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: 'Myskhako vineyards', ...VINEYARDS, owner: null, sector: 'west' },
  { id: 'F', name: 'Stanichka', ...VILLAGE, owner: null, sector: 'centre' },
  { id: 'G', name: 'Southern suburbs', ...SUBURBS, owner: null, sector: 'east' },
  { id: 'K', name: 'Markotkh ridge', x: 40, z: -640, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'novorossiysk',
  name: 'Novorossiysk',
  description: 'Malaya Zemlya, the night of 4 February 1943: Kunikov’s naval infantry come in by patrol boat to the shingle at Stanichka and the cannery quays south of Novorossiysk, under the German guns on Myskhako and the Markotkh ridge.',
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
  steep: 0.45, // (vehicles: the rock bank under Myskhako is no way up — the gully is)
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
        const sz = shoreZ(x), back = sz - z;
        if (onRoad(x, z)) return [0x6a6050, 0.85];
        if (back < -4) return [y > 0.3 ? 0xa8a296 : 0x7e7a70, 1];                       // the bottom: shingle and silt
        if (quayK(x) > 0.5 && back < 72) return [0x8c8a84, 1];                           // the cemented quays
        if (back < 22) return [0x9a958a, 1];                                             // the shingle
        if (cliffK(x) > 0.3 && back < 30) return [0x9a9282, 0.9];                        // the bank's grey marl
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -700, entries: [-280, 40, 340] } },
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,
  spawns: { nato: [], pact: [] }, // (no warships: the Black Sea Fleet's cruisers and destroyers shelled from far out and went home before dawn)

  landing: {
    // what the naval infantry come in (systems/Landing.js): a section on an MO-4's deck, a gun or a tank in a tender
    craft: { infantry: ['moBoat', 'moBoat', 'tender'], vehicle: 'tender' },
    // nothing to call in at sea: the fleet's ships fired their preparation from far offshore and left (the game has no
    // Soviet warships), and the bay was not swept — the boats ran in through the German fire, not through mines
    navy: [],
    // the German positions: bunkers either side of each landing place, the coastal guns on Myskhako that fire on the boats
    forts: FORTS,
    // wire along the shingle, mines before the village and up the gully, tank traps across the gully and the cannery street
    works: [
      ...Array.from({ length: 86 }, (_, i) => { const x = -470 + i * 11; return { kind: 'wire', x, z: shoreZ(x) - (quayK(x) > 0.5 ? 8 : 14), yaw: 0 }; }),
      ...SECTORS.flatMap((s) => [-34, 34].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - (s.x < -200 ? 40 : 48) }))),
      ...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - (s.x > 200 ? 78 : s.x < -200 ? 52 : 70), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-20, 20].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - (s.x > 200 ? 74 : s.x < -200 ? 46 : 64), yaw: 0 }))),
      { kind: 'tankTraps', x: GULLY, z: shoreZ(GULLY) - 30, yaw: 0 }, { kind: 'tankTraps', x: 340, z: shoreZ(340) - 66, yaw: 0 },
    ],
    // the 73rd Infantry Division's men over the beaches and in the houses, mortars and the guns behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mortar', 'atTeam', 'rifles', 'mortar', 'rifles', 'scouts'],
    hold: [
      ...SECTORS.flatMap((s) => [-50, 50].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (s.x > 200 ? 90 : s.x < -200 ? 50 : 70) }))),
      VINEYARDS, VILLAGE, SUBURBS,
    ],
    // the morning's counter-attack: assault guns and grenadiers down from the ridge
    counter: { t: 420, units: ['tankDestroyer', 'rifles', 'tankDestroyer', 'rifles'], say: 'Assault guns and grenadiers are coming down from the Markotkh ridge, straight for the beachhead', sayOther: 'Enemy assault guns coming down from the ridge' },
    // the landing's AI (ai/LandingDirector.js): no ships to buy — men first, a gun and the Lend-Lease tanks later
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'engineers', 'rifles', 'atTeam', 'mortar', 'rifles', 'mgTeam', 'tank', 'rifles', 'engineers', 'rifles', 'tank'], gunship: null, gunships: 0, heavy: null },
    economy: { reserves: 3000, perSector: 900, beachIncome: 1.2, defenceCp: 500, defenceIncome: 1.0 }, // (AI vs AI 2026-11-20: from 2200/700/0.85 with six bunkers the landing never got off the beach; at 1.3 one win at 18 min, one held with 2 of 3 inland; at 1.2 held, 2 of 3 inland at the whistle)
    // Kunikov's detachment: in on Stanichka beach and the quays first, the Myskhako shore at the same time
    waves: [{ t: 0, say: 'Kunikov’s detachment is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1943);
    sea.build(scene, terrain);
    const back = (x: number, z: number) => shoreZ(x) - z;
    const forts = FORTS;
    const clear = (x: number, z: number, d = 18) => !onRoad(x, z) && !forts.some((f) => Math.hypot(f.x - x, f.z - z) < d + 10) && !points.some((p) => Math.hypot(p.x - x, p.z - z) < 14);

    // ---- Stanichka: one-storey houses with walled gardens either side of the street, up the slope
    for (let i = 0; i < 46; i++) {
      const x = -170 + r() * 360, z = shoreZ(x) - 80 - r() * 260;
      if (!clear(x, z, 10) || quayK(x) > 0.2) continue;
      const yaw = Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.1;
      if (r() < 0.25) props.townHouse({ x, z, yaw, width: 8 + r() * 3, depth: 7, storeys: 1, name: 'house', damaged: 0.3 });
      else props.house({ x, z, yaw, width: 7 + r() * 3, depth: 6 + r() * 2, height: 3 });
      if (r() < 0.6) props.lowWall({ x: x + Math.cos(yaw) * 7, z: z - Math.sin(yaw) * 7, yaw: yaw + Math.PI / 2, length: 10, height: 1.2, color: 0xa29c8c });
    }
    // fishermen's boats drawn up on the shingle
    for (let i = 0; i < 10; i++) {
      const x = -140 + r() * 300; if (Math.abs(x - 20) < 30) continue;
      const z = shoreZ(x) - 8 - r() * 6, g = terrain.heightAt(x, z);
      props.box('plain', x, g + 0.4, z, 1.8, 0.8, 6, r() * 0.6 - 0.3 + Math.PI / 2, 0x4e5a5e);
    }

    // ---- the quays: bollards on the edge, the fish cannery's sheds, the cement works behind (chimney, silos, conveyor)
    for (let x = 250; x < 500; x += 16) props.column({ x, z: shoreZ(x) - 1.5, radius: 0.35, height: 0.8 });
    for (let i = 0; i < 3; i++) props.hall({ x: 250 + i * 46 + (i === 2 ? 30 : 0), z: shoreZ(300) - 106, yaw: 0, width: 32, depth: 14, height: 6, color: 0x9a8e7a, roof: 0x5a5c5e, door: 5, name: 'cannery shed' });
    props.hall({ x: 450, z: shoreZ(450) - 52, yaw: Math.PI / 2, width: 28, depth: 12, height: 7, color: 0x8e8a80, roof: 0x4e5052, door: 6, name: 'warehouse' });
    props.tanks({ x: 445, z: -40, yaw: 0, count: 3, radius: 4, height: 16, color: 0xa4a29a });
    props.chimney({ x: 470, z: -80, height: 36 });
    props.hall({ x: 440, z: -90, yaw: 0, width: 30, depth: 16, height: 10, color: 0x8a8678, roof: 0x4a4c4e, door: 6, name: 'cement works' });
    props.conveyor({ x0: 445, z0: -30, x1: 470, z1: 60, y0: 16, y1: 6 });

    // ---- the southern suburbs: workers' blocks and houses, knocked about
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3, dd = 40 + r() * 70;
      const x = SUBURBS.x + Math.cos(a) * dd, z = SUBURBS.z + Math.sin(a) * dd * 0.8;
      if (!clear(x, z, 12) || x > 485) continue;
      if (i % 4 === 0) props.ruinBlock({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 22, depth: 11, storeys: 3, ruin: 0.4, name: 'apartment block' });
      else props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 8 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0.4 });
    }

    // ---- the vineyards on Myskhako's slope: rows of vines on their stakes, in blocks
    for (const [vx, vz, w, dpt] of [[-330, -200, 140, 90], [-430, -130, 90, 70], [-220, -260, 90, 70], [-380, -300, 100, 60]] as const) {
      for (let row = 0; row < dpt; row += 3.2) for (let s = 0; s < w; s += 5) {
        const x = vx - w / 2 + s + 2.5, z = vz - dpt / 2 + row;
        if (onRoad(x, z) || Math.hypot(x - VINEYARDS.x, z - VINEYARDS.z) < 12 || forts.some((f) => Math.hypot(f.x - x, f.z - z) < 30)) continue;
        props.box('plain', x, terrain.heightAt(x, z) + 0.55, z, 4.6, 1.1, 0.35, 0, 0x3e3a28); // (February: bare brown vines on the wires)
      }
    }
    // a few farm buildings and a winery on the Myskhako road
    for (let i = 0; i < 6; i++) { const x = -420 + i * 60 + (r() - 0.5) * 20, z = -485 - r() * 30; if (clear(x, z, 10)) props.house({ x, z, yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 9, depth: 7, height: 3.4 }); }
    commandPost(props, this.bases.pact, 1, 0x6a6a5a);
    props.finish();

    const land = (x: number, z: number) => back(x, z) > 30;
    const avoid = [{ x: 0, z: -700, r: 26 }, ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) }];
    // scrub oak and juniper on Myskhako and the ridge, a few trees in the gardens
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1400, broadleaf: 0.7, autumn: 0.35, maxY: 120,
      avoid: [...avoid, { test: (x: number, z: number) => !land(x, z) || quayK(x) > 0.5 && back(x, z) < 150 }],
      forest: (x: number, z: number) => Math.min(1, smoothstep(14, 40, hills(x, z)) * 0.9 + smoothstep(0.2, 0.5, fbm(noise, x * 0.008 + 3, z * 0.008, 2)) * 0.3) });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => back(x, z) < 24 || quayK(x) > 0.5 && back(x, z) < 75 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
