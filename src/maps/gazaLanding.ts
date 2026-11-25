// The landing behind Gaza, autumn 1917 (coastal, the 1918 epoch: the British Empire lands, the Ottomans and their
// German allies hold; 1.0 × 1.8 km). A battle that was planned, not fought: while Allenby made ready for the Third
// Battle of Gaza, his staff and the Royal Navy worked out a landing on the open coast at Gaza itself, the boats to
// come up from the anchorage off Deir el-Belah — where every day the surf boats ran the army's stores in over the
// beach — and put a force ashore behind the Ottoman coastal sector: Sea Post, Umbrella Hill, the redoubts in the
// dunes. The boats and the troops for it were never spared, and the navy's monitors and destroyers only shelled the
// coast while the army broke the line at Beersheba and the 54th Division stormed the dunes from the south. This map
// plays it as it might have gone: the boats come in at dawn through the swell.
// The real coast, turned so that the sea is the +z side: it runs slantwise across the map, south-west (+x, toward
// Deir el-Belah) to north-east (-x), the Mediterranean to the north-west. In the south-west corner the Wadi Ghuzze
// comes down to the sea, a deep dry bed with a lagoon behind the sand bar at its mouth, the Deir el-Belah palms
// beyond it. Along the shore the dune belt, the widest on the coast, piled into hills: Umbrella Hill, the Sea Post
// on the shore, Sheikh Hasan's weli on its dune in the north-east. Under Sheikh Hasan el-Mina, Gaza's beach and its
// boats; near the wadi the beach under Sheikh Ajlin's weli. Inland, beyond the sand, Gaza on its hill in its cactus
// hedges and gardens — the Great Mosque, the minarets — and south-east of it the Ali Muntar ridge, the Ottoman
// headquarters. The El Mina beach opens Sheikh Hasan's dune, the Sheikh Ajlin beach Umbrella Hill; from either the
// way into Gaza is open.
// A scenario, not a fair battle (MAP_BRIEF_SEA_COAST.md): balanced with AI-vs-AI runs so the landing wins late or
// the defence just holds.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import { arabVillage, segDist } from './greatWarHelpers.ts';
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const EXT = { x: 520, z: 920 };
const noise = createNoise2D(1917_09);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6a80 }); // (the Levantine Mediterranean: turquoise over the sand)
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
const bump = (x: number, z: number, cx: number, cz: number, r: number) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

/** The waterline (world z at x): slantwise, the sea +z; el-Mina's shallow bight under Sheikh Hasan. */
const SLOPE = -0.3, COS = 1 / Math.hypot(1, SLOPE);
const shoreZ = (x: number) => 210 + SLOPE * x + fbm(noise, x * 0.005, 2.1, 2) * 8 - 14 * bell(x, -300, 70);
/** m inland of the waterline, square to the shore (- out at sea). */
const backOf = (x: number, z: number) => (shoreZ(x) - z) * COS;
const S = (x: number, back: number) => ({ x, z: shoreZ(x) - back / COS });

/** The Wadi Ghuzze, from its mouth in the south-west up through the dunes and away south-east. */
const WADI = [[420, 260], [405, 140], [385, 40], [352, -80], [338, -250], [378, -420], [450, -600], [520, -800], [560, -1000]];
const FORD = { x: 365, z: -490 }; // (the Gaza–Deir el-Belah road crosses at a ford)
/** The tracks up from the beaches and along the dunes (they cross the dunes by saddles). */
const TRACKS = [
  [[-300, 340], [-300, 250], [-275, 100], [-255, -60], [-235, -300]],
  [[262, 180], [255, 60], [200, -60], [90, -180], [-60, -330], [-200, -410]],
  [[-470, 160], [-330, 130], [-130, 60], [60, -40], [250, 20]],
];
const GAZA = { x: -230, z: -430 };
const ROADS = [
  ...TRACKS,
  [[GAZA.x, GAZA.z], [0, -470], [FORD.x, FORD.z], [520, -540]],        // to Deir el-Belah and Khan Yunis
  [[GAZA.x, GAZA.z], [-120, -610], [40, -840]],                          // to Ali Muntar
  [[GAZA.x, GAZA.z], [-400, -390], [-540, -380]],                        // north toward Jaffa
];
const roadD = gridCache((x: number, z: number) => Math.min(...ROADS.map((p) => segDist(p, x, z))), EXT, 2);
const onRoad = (x: number, z: number) => roadD(x, z) < 3.2;
const wadiD = gridCache((x: number, z: number) => segDist(WADI, x, z), EXT, 2);

/** Gaza's gardens [x, z, w, d], each in its prickly-pear hedge; a grove by el-Mina; the palms of Sheikh Ajlin. */
const GROVES = [[-120, -380, 70, 60], [-110, -480, 60, 60], [-330, -320, 60, 50], [-360, -500, 60, 60], [-230, -560, 70, 50],
  [-30, -560, 60, 50], [-420, -260, 50, 40], [440, -260, 60, 60], [470, -120, 50, 60]];
const inGrove = (x: number, z: number, pad = 0) => GROVES.some(([gx, gz, w, d]) => Math.abs(x - gx) < w / 2 + pad && Math.abs(z - gz) < d / 2 + pad);

const PACT_BASE = { x: 40, z: -840 };
/** The dune hills: Sheikh Hasan, the Sea Post, Umbrella Hill, the El Arish redoubt's dune (x, back, r, m). */
const HILLS = [[-360, 170, 70, 11], [-120, 95, 45, 6], [80, 240, 70, 13], [-60, 330, 60, 8]];

function groundRaw(x: number, z: number) {
  const back = backOf(x, z);
  const wd = segDist(WADI, x, z) + fbm(noise, x * 0.02 + 6, z * 0.02, 2) * 5;
  if (back < 0) { // the sandy bottom shelving off, a bar a hundred metres out (the boats ground short of the beach)
    const d = -back, bar = 0.9 * bell(d, 90, 18) + 0.6 * bell(d, 20, 10) * smoothstep(60, 20, wd);
    return Math.max(-0.4 - d * 0.04 - Math.max(0, d - 60) * 0.06 + bar, -16);
  }
  const tk = Math.max(...TRACKS.map((t) => smoothstep(26, 8, segDist(t, x, z))));
  const beach = 0.5 + back * 0.05;
  const plain = 7 + smoothstep(350, 900, back) * 6 + fbm(noise, x * 0.004, z * 0.004, 3) * 2.5 + fbm(noise, x * 0.03 + 5, z * 0.03, 2) * 0.4
    + 14 * bump(x, z, GAZA.x, GAZA.z, 190)                                                          // Gaza on its hill
    + 24 * Math.exp(-(((x + 70) / 260) ** 2) - (((z + 690) / 70) ** 2));                             // the Ali Muntar ridge
  let h = Math.min(plain, beach + back * 0.12);
  // the dune belt, 400 m and more of it: ridges and hollows, the named hills, low saddles where the tracks cross
  const belt = smoothstep(30, 80, back) * smoothstep(470, 360, back + fbm(noise, 9, x * 0.01, 2) * 50);
  const hills = HILLS.reduce((a, [hx, hb, r, m]) => a + m * bump(x, back, hx, hb, r), 0);
  h += (belt * (6 + ridged(noise, x * 0.012 + 2, z * 0.016, 3) * 14) + hills) * (1 - 0.85 * tk);
  // the Wadi Ghuzze: a dry bed of stones and sand with steep banks; the lagoon behind the bar at its mouth; the ford
  const bed = back < 70 ? -0.6 : 0.6 + back * 0.008;
  const ford = smoothstep(40, 10, Math.hypot(x - FORD.x, z - FORD.z));
  h += (Math.min(h, bed + ford * 2) - h) * smoothstep(30, 12 + ford * 10, wd);
  h += (plain - h) * smoothstep(40, 22, Math.hypot(x - PACT_BASE.x, z - PACT_BASE.z));
  return back > 70 || wd > 40 ? Math.max(h, 0.4) : h;
}
const height = gridCacheSmooth(groundRaw, EXT, 2);

/** The beach sectors (x) and what each opens. */
export const SECTORS = [
  { x: -300, name: 'El Mina beach', inland: { ...S(-360, 170) } },
  { x: 262, name: 'Sheikh Ajlin beach', inland: { ...S(80, 240) } },
];

const points: (ControlPointDef & { opens?: string })[] = [
  { id: 'A', name: 'The fleet', x: 80, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  { id: 'B', name: 'El Mina beach', ...S(-300, 38), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Sheikh Ajlin beach', ...S(262, 40), owner: null, sector: 'east', radius: 50, opens: 'F' },
  { id: 'E', name: 'Sheikh Hasan', ...SECTORS[0].inland, owner: null, sector: 'west', opens: 'G' },
  { id: 'F', name: 'Umbrella Hill', ...SECTORS[1].inland, owner: null, sector: 'east', opens: 'G' },
  { id: 'G', name: 'Gaza', x: GAZA.x + 20, z: GAZA.z + 30, owner: null, sector: 'centre' },
  { id: 'K', name: 'Ali Muntar', x: -60, z: -680, owner: 'pact', sector: 'centre' },
];
/** The coastal guns on the dune crests: at the Sea Post and behind Umbrella Hill. */
const GUNS = [{ name: 'Sea Post battery', x: -150, back: 150 }, { name: 'Umbrella Hill battery', x: 170, back: 170 }].map((g) => ({ ...g, ...S(g.x, g.back) }));

export default {
  id: 'gaza-landing',
  name: 'Gaza Coast',
  description: 'The landing planned at Gaza in autumn 1917, as it might have gone: boats up from the Deir el-Belah anchorage at dawn onto the slantwise Mediterranean shore — the Wadi Ghuzze’s mouth and lagoon, the great dune belt with Umbrella Hill, the Sea Post and Sheikh Hasan — against Ottoman trenches and coastal guns in the sand, Gaza on its hill in its cactus hedges inland and Ali Muntar behind it.',
  epochs: ['1918'],
  region: 'middleEast',
  climate: 'desert',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'British Empire', pact: 'Ottoman Empire' },
  armies: { nato: ['uk', 'anzac'], pact: ['ot', 'de'] }, // (XXI Corps and the Anzac Mounted Division; the Ottoman Eighth Army and the German Asia Corps)
  conditions: { time: 'dawn', weather: 'clear' },
  wind: { from: 280, speed: 4, veer: 0.1 }, // (a westerly off the sea: the November swell on the bar)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  navCell: 1.5,
  steep: 0.45, // (vehicles: not up the dunes' faces nor the wadi's banks — by the tracks and the ford)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1917,
  height,
  river: sea,
  fields: createFields({ seed: 191709, cell: 80 }),

  theme: {
    // a clear November dawn on the coast: the sun coming up over the land, the sea still grey-blue
    fogColor: 0xd2ccba, fogDensity: 0.0006, skyTop: 0x7298c0, skyHorizon: 0xe8dcc4, skyBottom: 0xb0a488,
    sunColor: 0xffe6c4, sunIntensity: 1.9, sunDisk: 0.7, clouds: 0.15, cloudLight: 0xf6eee2, cloudDark: 0xc0b8aa,
    sunDir: [0.3, 0.32, -0.88], hemiSky: 0xd6dce4, hemiGround: 0x9c8a66, hemiIntensity: 1.2, rimColor: 0xf0e0c4, rimIntensity: 0.3,
    terrain: {
      grass: '#a8966c', grassAlt: '#9c8c62', dryGrass: '#c4b07e', dirt: '#9c7a56', rock: '#b09a78',
      pasture: '#a8966a', ploughed: '#96744f', stubble: '#c8b282', meadow: '#a8986c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const back = backOf(x, z);
        if (y < 0 && back > -2) return [0x6a9a90, 1];                                              // the lagoon
        if (back < -2) return [y > -1.5 ? 0xd2c6a0 : 0x4e8a94, 1];                                 // the sand under the water
        if (onRoad(x, z) && back > 20) return [0xc8b48c, 0.85];                                    // the tracks
        if (back < 20) return [0xe2d4aa, 1];                                                       // the beach
        if (wadiD(x, z) < 14) return [0xd0c4a6, 0.85];                                            // the wadi's stones and sand
        const belt = smoothstep(30, 80, back) * smoothstep(470, 360, back);
        if (belt > 0.25) return [0xe6d6a8, Math.min(1, belt * 1.3)];                               // the dunes' pale loose sand
        if (inGrove(x, z, 2)) return [0x7e5c3e, 0.7];                                            // the gardens' red earth
        if (bump(x, z, GAZA.x, GAZA.z, 120) > 0.5) return [0xb8a27e, 0.6];                         // Gaza's lanes
        const scrub = fbm(noise, x * 0.03 + 50, z * 0.03, 2);
        return scrub > 0.22 ? [0x8c8458, Math.min(0.4, (scrub - 0.22) * 2)] : null;
      },
    },
  },

  bases: { nato: { x: 0, z: 880, entries: SECTORS.map((s) => s.x) }, pact: { ...PACT_BASE, entries: [-230, 40, 300] } }, // (the British land: their ways in are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 560 }, pact: { x: -100, z: -200 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'nato',
    // the boats: ship's cutters and lighters towed in by the motor launches, the tanks and guns in ferries (systems/Landing.js craft)
    craft: { infantry: ['ml'], vehicle: 'ferry' },
    launchZ: 780,
    signal: { t: 15, say: 'The tows are casting off — the boats pull for the shore through the swell', sayOther: 'Boats off el-Mina! The English are landing — stand to!' },
    // what the landing may call in at sea: the destroyers inshore, a cruiser, the monitor Raglan's big guns (the battleship)
    navy: ['destroyer', 'lightCruiser', 'battleship'],
    // the guns: heavy coastal guns on the dune crests (ships only) and two Ottoman field batteries inland
    forts: [
      ...GUNS.map((g) => ({ unit: 'coastBattery', name: g.name, x: g.x, z: g.z, facing: 0 })),
      { unit: 'artillery', x: -60, z: -420, facing: 0 },
      { unit: 'artillery', x: 160, z: -330, facing: 0 },
    ],
    // the trenches in the dunes over each beach, Maxims at their ends, wire along the back of the beach (gaps at the tracks)
    works: [
      ...SECTORS.flatMap((s) => [-50, -10, 30].map((dx) => ({ kind: 'trench', ...S(s.x + dx, 70), yaw: Math.atan(-SLOPE) }))),
      ...SECTORS.flatMap((s) => [-30, 50].map((dx) => ({ kind: 'mgNest', ...S(s.x + dx, 62), yaw: Math.atan(-SLOPE) }))),
      ...Array.from({ length: 86 }, (_, i) => -470 + i * 11).filter((x) => TRACKS.slice(0, 2).every((t) => Math.abs(t[0][0] - x) > 16) && segDist(WADI, x, S(x, 28).z) > 40)
        .map((x) => ({ kind: 'wire', ...S(x, 28), yaw: Math.atan(-SLOPE) })),
      ...GUNS.flatMap((g) => [-26, 26].map((dx) => ({ kind: 'trench', ...S(g.x + dx * 0.9, g.back + 30), yaw: Math.atan(-SLOPE) }))),
      // the Sea Post and the redoubts on the dune hills
      { kind: 'trench', ...S(-120, 100), yaw: Math.atan(-SLOPE) }, { kind: 'mgNest', ...S(-100, 90), yaw: Math.atan(-SLOPE) },
      { kind: 'trench', ...S(60, 250), yaw: 0.4 }, { kind: 'trench', ...S(100, 230), yaw: -0.4 }, { kind: 'trench', ...S(-340, 180), yaw: 0.2 },
    ],
    // the coast's garrison at dawn: an Ottoman regiment in the dunes, the German machine-gun company, gunners and snipers
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'sniper', 'rifles', 'mortar', 'rifles', 'mgTeam'],
    hold: [...SECTORS.flatMap((s) => [-50, -10, 30].map((dx) => S(s.x + dx, 76))), ...SECTORS.map((s) => s.inland), { x: GAZA.x + 20, z: GAZA.z + 30 }, S(-120, 110)],
    // the reserve from Ali Muntar: the 7th Division's battalions and the Süvari, down the roads to the coast
    counter: { t: 270, units: ['rifles', 'reconVehicle', 'mgTeam', 'rifles', 'reconVehicle', 'rifles'], say: 'The reserve is coming down from Ali Muntar — infantry and the cavalry, straight for the beaches', sayOther: 'Turkish cavalry and infantry coming down from Ali Muntar!' },
    ai: { order: ['rifles', 'rifles', 'mgTeam', 'engineers', 'rifles', 'mortar', 'tank', 'rifles', 'mgTeam', 'sniper', 'rifles', 'artillery'], gunship: 'destroyer', gunships: 1, heavy: 'battleship', inshore: 420 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.4 },
    waves: [
      // dawn, the first wave: two battalions of the 52nd (Lowland) Division onto el-Mina's beach, one under Sheikh Ajlin
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'engineers', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'rifles', sector: 1 },
      ] },
      { t: 150, say: 'The lighters are bringing in the second wave — and a tank in a ferry', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'tank', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1917);
    sea.build(scene, terrain);
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < m);
    const skip = (x: number, z: number) => roadD(x, z) < 8 || wadiD(x, z) < 26 || inGrove(x, z, 4) || backOf(x, z) < 60;
    const yawS = Math.atan(-SLOPE);

    // ---- Gaza: the town packed on its hill, the Great Mosque, minarets; el-Mina's huts by the beach; the welis on their dunes
    for (const [x, z, n, mosque, seed] of [[GAZA.x, GAZA.z, 14, true, 1], [GAZA.x + 90, GAZA.z - 40, 10, true, 2], [GAZA.x - 80, GAZA.z + 60, 10, false, 3],
      [GAZA.x - 40, GAZA.z - 110, 9, true, 4], [GAZA.x + 60, GAZA.z + 90, 8, false, 5]] as [number, number, number, boolean, number][]) {
      arabVillage(props, x, z, n, 1917_20 + seed, (px, pz) => skip(px, pz) || nearPoint(px, pz, 12), mosque);
    }
    props.rand = mulberry32(1917_02);
    props.flatHouse({ x: GAZA.x - 10, z: GAZA.z - 40, yaw: 0.1, width: 22, depth: 16, name: 'Great Mosque', dome: true });
    for (const [x, z] of [[GAZA.x - 26, GAZA.z - 56], [GAZA.x + 60, GAZA.z - 70], [GAZA.x - 70, GAZA.z + 40]]) props.column({ x, z, radius: 1.3, height: 18 });
    { const p = S(-280, 75); arabVillage(props, p.x, p.z, 6, 1917_30, (px, pz) => roadD(px, pz) < 6 || backOf(px, pz) < 45 || nearPoint(px, pz, 12), false); }
    for (const [x, b] of [[-370, 185], [300, 95]]) { const p = S(x, b); props.flatHouse({ ...p, yaw: yawS, width: 6, depth: 6, name: 'weli', dome: true }); }
    for (let i = 0; i < 7; i++) { const p = S(-330 + i * 14, 12); props.box('plain', p.x, terrain.heightAt(p.x, p.z) + 0.5, p.z, 2.2, 0.9, 8, yawS + 0.2 * (i % 3), 0x6a4a32); } // (el-Mina's boats drawn up on the sand)
    for (const g of GUNS) {
      props.sandbagRing({ x: g.x + 18, z: g.z - 10, radius: 4.5, toward: 1 });
      props.sandbagRing({ x: g.x - 18, z: g.z - 12, radius: 4.5, toward: 1 });
      for (let i = 0; i < 3; i++) props.tent({ x: g.x - 20 + i * 12, z: g.z - 40, yaw: 0.1, color: 0xb8a882 });
    }

    // ---- the prickly-pear hedges round each garden (a gate in each side)
    const cactus = (x: number, z: number, yaw: number) => { if (!onRoad(x, z) && !nearPoint(x, z, 10) && wadiD(x, z) > 20) props.lowWall({ x, z, yaw, length: 10, height: 1.9, color: 0x5e6e3c }); };
    for (const [gx, gz, w, d] of GROVES) {
      for (const [lx, lz, len, alongX] of [[0, d / 2, w, 1], [0, -d / 2, w, 1], [w / 2, 0, d, 0], [-w / 2, 0, d, 0]] as number[][]) {
        for (let t = -len / 2 + 6; t < len / 2 - 4; t += 12) {
          if (Math.abs(t) < 5) continue;
          cactus(gx + lx + (alongX ? t : 0), gz + lz + (alongX ? 0 : t), alongX ? 0 : Math.PI / 2);
        }
      }
    }
    // ---- palms by Gaza, along the wadi and in Sheikh Ajlin's grove; the Ottoman camp under Ali Muntar
    for (let i = 0, n = 0; i < 900 && n < 150; i++) {
      const x = (r() * 2 - 1) * 480, z = 200 - r() * 1060;
      const byWadi = wadiD(x, z) > 20 && wadiD(x, z) < 45, byGrove = inGrove(x, z, 14) && !inGrove(x, z, 2);
      if (!(byWadi || byGrove) || roadD(x, z) < 6 || nearPoint(x, z, 12) || backOf(x, z) < 60) continue;
      n++;
      props.rand = mulberry32(i);
      props.palm({ x, z, height: 7 + r() * 6 });
    }
    for (let i = 0; i < 6; i++) props.tent({ x: -20 + (i % 3) * 10, z: -780 - Math.floor(i / 3) * 10, yaw: 0.1, color: 0xb0a07a });
    commandPost(props, this.bases.pact, 1, 0xa09474);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: PACT_BASE.x, z: PACT_BASE.z, r: 26 },
      { test: (x: number, z: number) => onRoad(x, z) || wadiD(x, z) < 10 || backOf(x, z) < 40 }];
    // fruit trees in the gardens (figs, oranges, olives); tamarisk and broom on the plain, a few in the dunes
    const orchards = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1000, broadleaf: 1, autumn: 0.1, size: 0.55, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => !inGrove(x, z, -3) }], forest: (x: number, z: number) => (inGrove(x, z) ? 1 : -1) });
    const scrub = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 600, broadleaf: 1, autumn: 0.15, size: 0.32, maxY: 60,
      avoid: [...avoid, { test: (x: number, z: number) => inGrove(x, z, 6) || bump(x, z, GAZA.x, GAZA.z, 120) > 0.4 }],
      forest: (x: number, z: number) => { const back = backOf(x, z); return (back < 420 ? 0.05 : 0.2) + (wadiD(x, z) < 35 ? 0.5 : 0) + Math.max(0, fbm(noise, x * 0.01 + 20, z * 0.01, 2)) * 0.5; } });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.6, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => { const b = backOf(x, z); return b > 60 && b < 400; } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { orchards.update?.(dt, t); scrub.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
