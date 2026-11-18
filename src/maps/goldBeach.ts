// Gold Beach, 6 June 1944 (1945 only; coastal: the sea and the land in one battle, 1.0 × 1.8 km). The 50th
// (Northumbrian) Division comes in from the sea (+z) with Hobart's Funnies — the flails, the AVREs, the DD
// Shermans — and the Wehrmacht's 716th and 352nd Divisions hold the land (-z). Unlike Omaha there are no
// bluffs: a long, flat beach of hard sand that the tide covers and uncovers (world/Sea.js level), the
// obstacle belts across it, low dunes and the coast road behind, then marshy lowland, and the ground rising
// gently to the Meuvaines ridge and the open fields and hedgerows beyond. The fight is for the seafront
// strongpoints, where the Germans' casemates fire along the beach, not out to sea: Le Hamel (WN 37, its
// casemate in the sanatorium, held out till the afternoon) on Jig, the Hable de Heurtot and the Mont Fleury
// lighthouse (WN 35, WN 34) on King Green, La Rivière (WN 33, its 88 knocked out by a flail) on King Red.
// West, past Le Hamel, the coast climbs to the cliffs of St-Côme and Arromanches. Three exits through the
// dunes, each with its lane inland: to Asnelles, to the Mont Fleury battery (CSM Hollis's VC), to Ver-sur-Mer.
// Not point-mirrored: one side lands, the other holds (modes/landing, coastal step 3).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 }; // (the sea runs 400 m out past the mines: room for a destroyer's turning circle in the transport area)
const noise = createNoise2D(1944_50);
const sea = createSea({ level: 0, size: SIZE, color: 0x34525a }); // (the Channel: grey-green, never blue)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The high-water mark (z) along the beach: the foot of the dunes and the sea walls. */
export const shingleZ = (x: number) => 140 + fbm(noise, x * 0.004, 1.3, 2) * 12;
const RIDGE = 38;     // the Meuvaines ridge, behind the lowland
/** The beach sectors, west to east: x on the beach, and the village up the lane from its exit. */
export const SECTORS = [
  { id: 'Jig Green', x: -240, vx: -275, vz: -70, village: 'Asnelles', entry: -90 },
  { id: 'King Green', x: 120, vx: 140, vz: -150, village: 'Mont Fleury', entry: 0 },
  { id: 'King Red', x: 360, vx: 320, vz: -215, village: 'Ver-sur-Mer', entry: 90 },
];
const BASE_Z = -680;  // Crépon: the Germans' rear
/** A sector's lane: from its exit through the dunes up to its village, then on to Crépon. */
const laneX = (s: typeof SECTORS[number], z: number) => (z > s.vz
  ? lerp(s.x, s.vx, smoothstep(shingleZ(s.x), s.vz, z))
  : lerp(s.vx, s.entry, smoothstep(s.vz, BASE_Z + 20, z))) + Math.sin(z * 0.013 + s.x) * 6;
/** The seafront towns behind their sea walls: Le Hamel (and Asnelles behind it), La Rivière. */
const TOWNS = [[-345, -160], [270, 480]];
const inTown = (x: number) => TOWNS.some(([a, b]) => x > a && x < b);
/** The St-Côme / Arromanches cliffs: the coast climbing west of Le Hamel (0 east of it, 1 at the map's west edge). */
const cliffK = (x: number) => smoothstep(-340, -480, x);

/** The marsh behind the dunes between Le Hamel and La Rivière: reeds and standing water, men wade, vehicles bog. */
function marshK(x: number, z: number) {
  if (x < -170 || x > 280) return 0;
  return smoothstep(0.0, 0.22, fbm(noise, x * 0.007 + 3.1, z * 0.009 + 1.7, 2)) * smoothstep(shingleZ(x) - 40, shingleZ(x) - 62, z) * smoothstep(-90, -30, z)
    * smoothstep(-170, -130, x) * smoothstep(280, 240, x);
}

function height(x: number, z: number) {
  const sz = shingleZ(x);
  let h: number;
  if (z > sz) { // the beach and the sea floor: hard sand shelving gently, a runnel and bar on it, then the bottom falling away
    const d = z - sz;
    h = 1.7 - d * 0.017 + Math.sin(d * 0.045 + x * 0.004) * 0.25 * smoothstep(40, 90, d) * smoothstep(260, 200, d);
    h = Math.min(h, 1.7 - d * 0.017 - Math.max(0, d - 165) * 0.1); // (past where the boats ground, the bottom shelves away: the destroyers came in close)
    h = Math.max(h, -16);
    h += smoothstep(10, 0, d) * 1.3;                                                  // the dunes' / sea wall's seaward face
  } else { // the dunes, the lowland behind them, then the long gentle rise to the ridge and the fields beyond
    const d = sz - z;
    const dune = inTown(x) ? 0 : 1.4 * smoothstep(0, 6, d) * smoothstep(30, 14, d) * (0.7 + fbm(noise, x * 0.05, 3, 2) * 0.6);
    const rise = smoothstep(-20, -320, z);
    const ridge = RIDGE + fbm(noise, x * 0.003, z * 0.003, 3) * 6 + Math.max(0, -z - 400) * 0.01;
    h = 3 + dune + fbm(noise, x * 0.02, z * 0.02, 2) * 0.4 + (ridge - 3) * rise * rise * (3 - 2 * rise);
    h += 9 * Math.exp(-((x - 150) ** 2 + (z + 170) ** 2) / (95 * 95)) * smoothstep(sz - 30, sz - 90, z); // the Mont Fleury rise over King Green
    h = lerp(h, 2.3, marshK(x, z));
  }
  // the cliffs: west of Le Hamel the coast climbs to the St-Côme / Arromanches headland, its face straight onto the sand
  const k = cliffK(x);
  if (k > 0) {
    const top = 52 + fbm(noise, x * 0.01, z * 0.01 + 5, 2) * 5;
    h = Math.max(h, lerp(h, top, k) * smoothstep(sz + 3, sz - 26, z) + h * (1 - smoothstep(sz + 3, sz - 26, z)));
  }
  return h;
}

/** Firm (1) or soft ground: the marsh. Men wade slowly, vehicles crawl — the lanes and their causeways are firm. */
function soft(x: number, z: number, foot: boolean) {
  if (onRoad(x, z)) return 1;
  const m = marshK(x, z);
  return m <= 0 ? 1 : 1 - m * (foot ? 0.4 : 0.7);
}

/**
 * The beach obstacles on the tidal flat (systems/Landing.js), three belts between the high- and the low-water
 * mark: ramped stakes nearest the dunes, hedgehogs, Belgian gates furthest out — many with a Teller mine on top.
 */
export const OBSTACLES = (() => {
  const r = mulberry32(1944_50), out: { x: number, z: number, kind: string, mine: boolean }[] = [];
  [['stake', 46, 0.6, 7], ['hedgehog', 66, 0.25, 8], ['gate', 90, 0.4, 11]].forEach(([kind, d, mined, step]) => {
    for (let x = -485; x < 485; x += (step as number) + r() * 4) {
      if (r() < 0.1) continue; // (a gap: some were never set, some knocked down by the sea)
      out.push({ x: x + (r() - 0.5) * 2, z: shingleZ(x) + (d as number) + (r() - 0.5) * 8, kind: kind as string, mine: r() < (mined as number) });
    }
  });
  return out;
})();

/** The coast road behind the dunes (Arromanches – Le Hamel – La Rivière – Ver-sur-Mer). */
const coastZ = (x: number) => shingleZ(x) - 44 + Math.sin(x * 0.01) * 4;
/** The road along the Meuvaines ridge. */
const ridgeZ = (x: number) => -330 + Math.sin(x * 0.005) * 22;
/** On a road: the three lanes inland from the exits, the coast road, the ridge road. */
function onRoad(x: number, z: number) {
  for (const s of SECTORS) if (z < shingleZ(x) - 8 && z > BASE_Z && Math.abs(x - laneX(s, z)) < 3.5) return true;
  if (x > -330 && Math.abs(z - coastZ(x)) < 3.5) return true;
  if (Math.abs(z - ridgeZ(x)) < 3.5) return true;
  return false;
}

const points: ControlPointDef[] = [
  { id: 'A', name: 'Transport area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the village up its lane once taken)
  { id: 'B', name: 'Jig Green', x: SECTORS[0].x, z: shingleZ(SECTORS[0].x) + 22, owner: null, sector: 'west', radius: 40, opens: 'E' },
  { id: 'C', name: 'King Green', x: SECTORS[1].x, z: shingleZ(SECTORS[1].x) + 22, owner: null, sector: 'centre', radius: 40, opens: 'F' },
  { id: 'D', name: 'King Red', x: SECTORS[2].x, z: shingleZ(SECTORS[2].x) + 22, owner: null, sector: 'east', radius: 40, opens: 'G' },
  { id: 'E', name: 'Asnelles', x: -275, z: -70, owner: null, sector: 'west' },
  { id: 'F', name: 'Mont Fleury', x: 140, z: -150, owner: null, sector: 'centre' },
  { id: 'G', name: 'Ver-sur-Mer', x: 320, z: -215, owner: null, sector: 'east' },
  { id: 'K', name: 'Crépon', x: 0, z: -620, owner: 'pact', sector: 'centre' },
];

/** The Atlantic Wall's resistance nests along the seafront: x, and the WN number for the comment. */
const NESTS = [-300 /* WN 37, Le Hamel west: the sanatorium */, -175 /* WN 36, Le Hamel east */, 35 /* WN 35, Hable de Heurtot */, 215 /* WN 34, the Mont Fleury lighthouse */, 425 /* WN 33, La Rivière */];

export default {
  id: 'goldBeach',
  name: 'Gold Beach',
  description: 'Normandy, 6 June 1944: a flat beach between Le Hamel and La Rivière, casemates firing along the sand, marsh behind the dunes and the Arromanches cliffs to the west. The British land with Hobart\'s Funnies; the Wehrmacht holds the seafront.',
  epochs: ['1945'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['brit21'], pact: ['wh'] }, // (the 50th Northumbrian Division and the 8th Armoured Brigade against the 716th and 352nd Infantry Divisions)
  conditions: { time: 'day', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (the cliffs: vehicles keep off them)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1944,
  height,
  soft,
  river: sea,
  fields: createFields({ seed: 1950, cell: 70, weights: [0.4, 0.15, 0.25, 0.2] }),

  theme: {
    // a grey June morning, a stiff north-westerly, the cloud breaking
    fogColor: 0xa9b0b0, fogDensity: 0.0006,
    skyTop: 0x7c8890, skyHorizon: 0xc2c6c2, skyBottom: 0x80888a,
    sunColor: 0xeee6d4, sunIntensity: 1.6, sunDisk: 0.2,
    clouds: 0.7, cloudLight: 0xd8dad6, cloudDark: 0x8a9094,
    sunDir: [0.3, 0.55, 0.75],
    hemiSky: 0xc8d0d4, hemiGround: 0x4e5038, hemiIntensity: 1.3,
    rimColor: 0xc8d0d4, rimIntensity: 0.2,
    terrain: {
      grass: '#58683c', grassAlt: '#4c5c36', dryGrass: '#8c8654', dirt: '#5e5040', rock: '#8a8470', // (the cliffs: pale limestone and clay)
      pasture: '#5a6a3c', ploughed: '#584634', stubble: '#8e8452', meadow: '#66743e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shingleZ(x);
        if (onRoad(x, z)) return [0x6a5c48, 0.85];
        if (z > sz + 4) return [y > 0.4 ? 0xcfc2a0 : 0xa89c80, 1];                    // the sand: dry above the water, darker wet and under it
        if (cliffK(x) > 0.25 && z > sz - 30 && y > 6) return [0x8c8a7a, 0.85];         // the cliff face: grey limestone and clay
        if (marshK(x, z) > 0.35) return [0x77704c, 0.9];                              // the marsh: reeds and black water
        if (z > sz - 28 && !inTown(x)) return [0xb8ad88, 0.6];                         // the dunes: sand and marram grass
        return null;                                                                   // the fields
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: SECTORS.map((s) => s.x) }, // (the side that lands: its roads are the beach sectors Jig, King Green, King Red)
           pact: { x: 0, z: BASE_Z, entries: [-200, 0, 200] } },
  maxStacks: 26,
  cameraStart: { nato: { x: 60, z: 330 }, pact: { x: 60, z: -150 } },
  points,

  // H-hour, 07:25: the assault brigades in on Jig and King together (systems/Landing.js); the destroyers already off the beach
  landing: {
    // the Atlantic Wall (modes/landing.js, data/units45/atlanticWall.js): the seafront resistance nests, and the two
    // batteries inland that fire on the ships — Mont Fleury (WN 35a, still building) and Ver-sur-Mer (WN 32)
    forts: [
      ...NESTS.map((x) => ({ unit: 'wn', x, z: shingleZ(x) - 14, facing: 0 })),
      { unit: 'battery', x: 200, z: -255, facing: 0 }, { unit: 'battery', x: 400, z: -420, facing: 0 },
    ],
    // wire along the dunes, a belt of tank traps edge to edge (no vehicle off the sand till the engineers or a flail
    // make a gap), mines on the dunes before each exit, tank traps across each exit
    works: [
      ...Array.from({ length: 80 }, (_, i) => { const x = -390 + i * 11; return { kind: 'wire', x, z: shingleZ(x) - 2, yaw: 0 }; }), // (none under the cliffs: nobody lands there)
      ...Array.from({ length: 112 }, (_, i) => { const x = -400 + i * 8; return { kind: 'tankTraps', x, z: shingleZ(x) - 8, yaw: 0 }; }), // (to the east edge, and in the west to the cliff's foot: no way round)
      ...SECTORS.flatMap((s) => [{ kind: 'mines', x: s.x - 30, z: shingleZ(s.x) - 22 }, { kind: 'mines', x: s.x + 30, z: shingleZ(s.x) - 22 }, { kind: 'tankTraps', x: laneX(s, shingleZ(s.x) - 30), z: shingleZ(s.x) - 30 }]),
    ],
    // the tide: low water at H-hour (later than Omaha's: the reefs off Gold), coming in over the battle
    tide: { rise: 1.6, over: 1500, band: [90, 430] },
    seaMines: { z: [520, 590], count: 60, lanes: SECTORS.map((s) => s.x), lane: 80, seed: 1950 },
    // Force G's bombardment: the destroyers inshore, the minesweepers, the cruisers (Ajax and Argonaut) offshore
    navy: ['destroyer', 'minesweeper', 'lightCruiser'],
    obstacles: OBSTACLES,
    // the defence at H-hour: in the seafront houses either side of each exit, on the Mont Fleury rise, in the villages
    hold: [
      ...SECTORS.flatMap((s) => [{ x: s.x - 60, z: shingleZ(s.x - 60) - 30 }, { x: s.x + 60, z: shingleZ(s.x + 60) - 30 }]),
      { x: 150, z: -120 }, { x: -230, z: -40 },
      ...SECTORS.map((s) => ({ x: s.vx, z: s.vz })),
    ],
    // the afternoon's counter-attack: Kampfgruppe Meyer (the 352nd's reserve) with its assault guns, onto the beachhead's flank
    counter: { t: 300, units: ['tankDestroyer', 'rifles', 'tankDestroyer', 'ifv', 'rifles'], say: 'Kampfgruppe Meyer is coming up: assault guns and grenadiers, straight for the beachhead', sayOther: 'Enemy assault guns and infantry coming down from Crépon' },
    // the first wave: infantry and the Funnies together — the flails and AVREs to open the exits, the Shermans in their LCTs
    waves: [{ t: 0, say: 'H-hour: the assault brigades are going in on Jig and King', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mineClear', sector: 0 }, { unit: 'tank', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'cev', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 2 }, { unit: 'mineClear', sector: 2 }, { unit: 'tank', sector: 2 },
    ] }],
  },

  spawns: {
    nato: [{ unit: 'destroyer', x: -60, z: 850, facing: Math.PI / 2 }, { unit: 'destroyer', x: 240, z: 860, facing: -Math.PI / 2 }], // (between the lanes: clear of the boats launching off each sector)
    pact: [{ unit: 'rifles', x: 140, z: -165, facing: 0, name: '7. Kompanie' }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1950);
    sea.build(scene, terrain);
    const nearNest = (x: number) => NESTS.some((n) => Math.abs(x - n) < 22); // (the casemates: no house on them)
    const nearLane = (x: number, z: number, w: number) => SECTORS.some((s) => Math.abs(x - laneX(s, z)) < w);

    // ---- the seafronts: the sea wall, the villas and boarding houses behind it (Le Hamel, La Rivière)
    for (const [a, b] of TOWNS) {
      for (let x = a; x < b; x += 6) {
        const z = shingleZ(x) - 5;
        if (nearLane(x, z, 10)) continue; // (the exit's gap: tank traps close it, systems/Construction.js)
        props.wall({ x, z, yaw: Math.atan2(shingleZ(x + 6) - shingleZ(x), 6), length: 6.2, height: 1.3, thickness: 0.8 }); // (men climb it, vehicles don't)
      }
      for (let x = a + 10; x < b - 8; x += 18 + r() * 8) {
        const z = shingleZ(x) - 24 - r() * 6;
        if (nearNest(x) || nearLane(x, z, 14)) continue;
        props.townHouse({ x, z, yaw: Math.PI, width: 8 + r() * 3, depth: 8, storeys: r() < 0.5 ? 3 : 2, name: 'seafront villa', damaged: 0.35 });
        const z2 = coastZ(x) - 14 - r() * 6; // (and a row behind the coast road)
        if (!nearLane(x, z2, 14) && r() < 0.7) props.townHouse({ x: x + 4, z: z2, yaw: 0, width: 7 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0.2 });
      }
    }

    // ---- the villages inland: Asnelles behind Le Hamel, Ver-sur-Mer, Meuvaines on the ridge, Crépon at the back
    const village = (cx: number, cz: number, n: number, churchAt: [number, number] | null) => {
      if (churchAt) props.church({ x: churchAt[0], z: churchAt[1], yaw: Math.PI / 2 });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.4, dd = 30 + r() * 28;
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (onRoad(x, z) || nearLane(x, z, 9) || (churchAt && Math.hypot(x - churchAt[0], z - churchAt[1]) < 18) || marshK(x, z) > 0) continue;
        if (i % 3 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, a + Math.PI / 2);
        else props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.5 ? 2 : 1, name: 'stone house', damaged: 0.1 });
      }
    };
    village(-275, -70, 10, [-245, -95]);  // Asnelles
    village(320, -215, 11, [345, -240]);  // Ver-sur-Mer
    village(-40, -360, 7, [-20, -385]);   // Meuvaines
    village(0, -560, 9, [40, -560]);      // Crépon
    // Mont Fleury: the house on the rise (the Green Howards' objective) and the lighthouse by the beach
    props.townHouse({ x: 165, z: -140, yaw: Math.PI, width: 12, depth: 9, storeys: 2, name: 'Mont Fleury house', damaged: 0.3 });
    {
      const lx = 245, lz = shingleZ(245) - 50, g = terrain.heightAt(lx, lz);
      props.box('stone', lx, g + 9, lz, 3.4, 18, 3.4, 0, 0xd8d4c8);       // the Ver-sur-Mer lighthouse: white stone
      props.box('metal', lx, g + 19, lz, 2.6, 2, 2.6, 0, 0x2a3036);       // its lantern
      props.box('stone', lx, g + 20.3, lz, 3.2, 0.5, 3.2, 0, 0x6e6b62);
      cover.addCylinder({ x: lx, z: lz, radius: 1.8, height: 18, spots: false });
    }
    // farmsteads out in the fields
    for (let i = 0; i < 16; i++) {
      const x = (r() * 2 - 1) * 440, z = -180 - r() * 450;
      if (onRoad(x, z) || nearLane(x, z, 12) || Math.hypot(x, z - BASE_Z) < 60 || points.some((p) => Math.hypot(p.x - x, p.z - z) < 70) || cliffK(x) > 0.2) continue;
      buildSite(props, { kind: r() < 0.6 ? 'farm' : 'fieldwall', seed: Math.floor(r() * 1e9) }, x, z, r() * 3);
    }
    commandPost(props, this.bases.pact, 1, 0x7a7458);
    props.finish();

    const inland = (x: number, z: number) => z < -150 && cliffK(x) < 0.5;
    const avoid = [
      { x: 0, z: BASE_Z, r: 26 },
      ...points.map((p) => ({ x: p.x, z: p.z, r: 14 })),
      { test: (x: number, z: number) => onRoad(x, z) },
    ];
    // orchards round the villages and copses on the ridge; scrub on the cliff tops; nothing on the dunes or in the marsh
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 800, broadleaf: 0.85, autumn: 0, maxY: 80,
      avoid: [...avoid, { test: (x: number, z: number) => z > shingleZ(x) - 30 || marshK(x, z) > 0 }],
      forest: (x: number, z: number) => Math.max(cliffK(x) * 0.35, inland(x, z) ? smoothstep(0.25, 0.55, fbm(noise, x * 0.008 + 9, z * 0.008, 2)) * 0.6 : 0) });
    cover.finalize(bounds);
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 12000, lane: 0, // (the fields above the lowland: hedged, but more open than the bocage further south)
      avoid: [...avoid, { test: (x: number, z: number) => !inland(x, z) }] });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2.2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => z > shingleZ(x) - 10 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); hedges.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
