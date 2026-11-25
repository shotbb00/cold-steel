// Felixstowe, Suffolk, 1985 (coastal: the Soviet naval infantry lands, the US holds; 1.0 × 1.8 km). A war that did not
// happen: a Soviet amphibious landing on the Suffolk coast to seize the port of Felixstowe — Britain’s biggest container
// port, where NATO’s reinforcements and stores come in — and to strike inland at the East Anglian US air bases,
// Bentwaters and Woodbridge across the Deben, Lakenheath and Mildenhall beyond. Out at sea the Baltic Fleet’s landing
// ships and the mine barrier off the coast; then the shingle beaches of Suffolk, steep and narrow, a bank of grey-brown
// pebbles. In the west Landguard Point: Landguard Fort on the spit at the mouth of the Orwell and the Stour, and behind
// it the container port — the quay along the estuary, the blue gantry cranes, the container stacks on the reclaimed
// flats, a ship alongside; across the water Harwich and its lighthouse. In the middle Felixstowe on its low cliffs:
// the seafront and the pier, the Spa Pavilion at the foot of the Bent Hill gap, the Victorian hotels and the town on
// top, the cliff gardens down to Cobbold’s Point. In the east Felixstowe Ferry at the Deben’s mouth: the golf links,
// the sailing club and the Martello towers, the King’s Fleet marshes behind, Bawdsey Manor and its radar masts across
// the river. Inland Walton village and its fields, and at the end of the roads Martlesham Heath — NATO’s ground, the
// road to Woodbridge and the air bases.
// (Compressed: Landguard Point to Felixstowe Ferry is 6 km; here 800 m. The real coast runs south-west to north-east,
// here straight across the map; the Orwell and the Deben run inland along the map’s two edges.)
// Laid out like Scheveningen (maps/scheveningen.ts) in a frame with the sea toward +z (`L`), then turned round: the
// Pact’s side is -z, so the sea is there (the landing comes from its base out at sea: systems/Landing.js lands()).
import * as THREE from 'three';
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround, plantHedgerows } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_23);
const sea = createSea({ level: 0, size: SIZE, color: 0x4a5a56 }); // (the North Sea off Suffolk: brown-grey, silty)
const F = -1; // the frame turned round: local z (sea +) → world z (sea −)

/** The waterline (local z): the Suffolk coast, gently bowed, a little over a hundred and fifty metres from the middle. */
const shoreZ = (x: number) => 168 + fbm(noise, x * 0.003, 2.1, 2) * 8;
/** Felixstowe’s low cliffs (the town to Cobbold’s Point): how much cliff there is at x. */
const cliffK = (x: number) => smoothstep(-215, -160, x) * smoothstep(265, 215, x);
/** The Orwell and Stour’s mouth (west) and the Deben’s (east): the channels running inland at the map’s edges. */
const CHANNELS = [{ x: -522, half: 52 }, { x: 524, half: 42 }];
const chanK = (x: number) => Math.max(...CHANNELS.map((c) => smoothstep(c.half + 12, c.half, Math.abs(x - c.x))));
/** The container port: the reclaimed flats behind Landguard (x west of here, back past the spit). */
const dockK = (x: number, back: number) => smoothstep(-255, -290, x) * smoothstep(70, 100, back);
const QUAY_X = -460;
/** The King’s Fleet marshes behind Felixstowe Ferry. */
const MARSH = { x: 300, z: -180, rx: 105, rz: 70 };
const marshD = (x: number, z: number) => Math.hypot((x - MARSH.x) / MARSH.rx, (z - MARSH.z) / MARSH.rz);
/** The roads up from the beaches (x at local z): Langer Road into the docks, Bent Hill to Walton, Ferry Road. */
const dockX = (z: number) => -300 + Math.sin(z * 0.012) * 10;
const waltonX = (z: number) => 20 + Math.sin(z * 0.009) * 20;
const ferryX = (z: number) => 385 + Math.sin(z * 0.01) * 10;
/** The road gaps through the cliff (Bent Hill), 0–1. */
const gapK = (x: number, z: number) => Math.exp(-(((x - waltonX(z)) / 18) ** 2));
/** Walton High Street (local z), the A14 across the back. */
const highZ = (x: number) => -240 + Math.sin(x * 0.006) * 15;
const a14Z = (x: number) => -600 + Math.sin(x * 0.006) * 25;

/** The land’s swells (0 ± 1): sampled once onto a grid, read between the samples. */
const landN = gridCacheSmooth((x: number, z: number) => fbm(noise, x * 0.005 + 3, z * 0.005, 3), { x: 1000, z: 1000 }, 4);

/** Ground height in the local frame (sea toward +z). */
function heightL(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  let h: number;
  if (d > 0) { // the bottom: shingle shelving fast, a bar or two, then the landing ships’ water a couple of hundred metres out
    h = Math.max(0.6 - d * 0.018 - Math.max(0, d - 130) * 0.045 + Math.sin(d * 0.06 + x * 0.003) * 0.3 * smoothstep(20, 60, d) * smoothstep(130, 90, d), -18);
  } else {
    const back = -d; // m inland of the waterline
    const n = landN(x, z);
    // the shingle bank (40 m, up to 3.4 m at its crest), then the low land behind rising inland: Walton 10 m, the heath 20 m
    const beach = 0.6 + Math.min(back, 40) * 0.07;
    const land = 2.4 + smoothstep(80, 420, back) * 7 + smoothstep(520, 860, back) * 8 + n * 2.5 * smoothstep(40, 160, back);
    h = back < 40 ? beach : land + (3.4 - land) * smoothstep(60, 40, back);
    // the cliffs: the promenade at the foot (3.4 m), the face 62–90 m back, the town 13–16 m up; the Bent Hill gap a ramp
    const ck = cliffK(x);
    if (ck > 0 && back > 40) {
      const top = 13 + n * 1.5 + smoothstep(100, 400, back) * 3;
      const g = gapK(x, z);
      const up = smoothstep(62, 90, back) * (1 - g) + smoothstep(45, 190, back) * g;
      h += (Math.max(h, 3.4 + (top - 3.4) * up) - h) * ck;
    }
    // the docks: reclaimed flats at 3.5 m
    const dk = dockK(x, back);
    if (dk > 0) h += (3.5 - h) * dk;
    // the King’s Fleet: grazing marsh a metre above the sea
    const md = marshD(x, z);
    if (md < 1.3) h += (1.0 - h) * smoothstep(1.3, 0.9, md);
  }
  // the estuaries: deep water, the ships’ channels (the container quay straight down into the Orwell)
  const ck = chanK(x);
  if (ck > 0) h = h * (1 - ck) - 10 * ck;
  return h;
}
const height = (x: number, z: number) => heightL(x, F * z);

/** The roads (local frame). */
function onRoadL(x: number, z: number) {
  const back = shoreZ(x) - z;
  if (Math.abs(back - 130 - Math.sin(x * 0.01) * 5) < 3.5 && x > -280 && x < 380) return true;  // the cliff-top road (Sea Road, Cliff Road, Old Felixstowe)
  if (Math.abs(x - dockX(z)) < 3.5 && back > 40 && z > -650) return true;                       // Langer Road, up from Landguard into the docks
  if (Math.abs(x - waltonX(z)) < 3.5 && back > 40 && z > -650) return true;                     // up Bent Hill, through Walton
  if (Math.abs(x - ferryX(z)) < 3.5 && back > 40 && z > -650) return true;                      // Ferry Road
  if (Math.abs(z - highZ(x)) < 3 && x > -300 && x < 390) return true;                           // Walton High Street
  if (Math.abs(z - a14Z(x)) < 3.5 && x > -440 && x < 470) return true;                          // the A14, to Ipswich and the docks
  return false;
}
const onRoad = (x: number, z: number) => onRoadL(x, F * z);
const inDock = (x: number, z: number) => dockK(x, shoreZ(x) - z) > 0.5;

/** The beach sectors (x) and the places up behind them (local z). */
export const SECTORS = [
  { x: -300, name: 'Landguard', inland: { name: 'Port of Felixstowe', x: -330, z: -90 } },
  { x: 20, name: 'Felixstowe seafront', inland: { name: 'Walton', x: 30, z: -240 } },
  { x: 360, name: 'Felixstowe Ferry', inland: { name: 'Felixstowe Ferry', x: 385, z: -90 } },
];
const W = (x: number, z: number) => ({ x, z: F * z }); // local → world

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', ...W(0, 770), owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (open from the start; `opens` the place behind once taken), out to the shingle’s crest or the promenade
  { id: 'B', name: 'Landguard beach', ...W(-300, shoreZ(-300) - 44), owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Felixstowe seafront', ...W(20, shoreZ(20) - 44), owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Felixstowe Ferry beach', ...W(360, shoreZ(360) - 44), owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Port of Felixstowe', ...W(-330, -90), owner: null, sector: 'west' },
  { id: 'F', name: 'Walton', ...W(30, -240), owner: null, sector: 'centre' },
  { id: 'G', name: 'Felixstowe Ferry', ...W(385, -90), owner: null, sector: 'east' },
  { id: 'K', name: 'Martlesham Heath', ...W(60, -640), owner: 'nato', sector: 'centre' },
];

export default {
  id: 'felixstowe',
  name: 'Felixstowe Landing',
  description: 'The Suffolk coast, 1985: shingle beaches and Felixstowe’s low cliffs, the container port and its cranes on the Orwell behind Landguard Fort, Martello towers, the Deben’s mouth at Felixstowe Ferry, marshes and heath behind. Soviet naval infantry land to seize the port and strike at the US air bases; the Americans hold the coast.',
  epochs: ['1985'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Warsaw Pact' },
  armies: { nato: ['us'], pact: ['sov'] }, // (the US air bases’ defence and reinforcements hold; Soviet naval infantry land)
  conditions: { time: 'dawn', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the cliffs are no way up but by Bent Hill, the quay none at all)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  river: sea,
  airfields: [], // (no strip: cliffs, the town, the container port and the marshes — Airfields off)
  fields: createFields({ seed: 1985_23, cell: 70, weights: [0.45, 0.2, 0.2, 0.15] }),

  theme: {
    fogColor: 0xaab2b4, fogDensity: 0.0006,
    skyTop: 0x6c7c90, skyHorizon: 0xcacecf, skyBottom: 0x868c90,
    sunColor: 0xf4e6d2, sunIntensity: 1.6, sunDisk: 0.2,
    clouds: 0.75, cloudLight: 0xdcdedc, cloudDark: 0x868e94,
    sunDir: [0.45, 0.45, 0.75],
    hemiSky: 0xc8d2d8, hemiGround: 0x4e5638, hemiIntensity: 1.3,
    rimColor: 0xd0d8dc, rimIntensity: 0.2,
    terrain: {
      grass: '#5e7040', grassAlt: '#526638', dryGrass: '#8e8a58', dirt: '#5a4c3a', rock: '#7a7266',
      pasture: '#60723e', ploughed: '#5a4834', stubble: '#90865a', meadow: '#6a7a40',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const lz = F * z, back = shoreZ(x) - lz;
        if (onRoadL(x, lz)) return [0x55555a, 0.9];                                           // asphalt
        if (chanK(x) > 0.5) return [0x7a7262, 1];                                             // the estuary’s mud
        if (back < -4) return [y > 0.3 ? 0x9a9078 : 0x7e7664, 1];                              // shingle and sand under the water
        if (back < 40) return [0x9c917c, 1];                                                  // the shingle bank
        if (inDock(x, lz)) return [0x7a7872, 0.95];                                           // the container park’s concrete
        if (cliffK(x) > 0.5 && back < 62) return [0xa29a8c, 0.95];                            // the promenade
        if (cliffK(x) > 0.4 && back < 92 && y > 4.5 && y < 12.5) return [0x7a6a4e, 0.7];      // the cliff face, the gardens’ paths
        if (cliffK(x) > 0.5 && back < 330) return [0x7c776c, 0.55];                           // the town: streets and squares
        if (marshD(x, lz) < 1.05) return noise(x * 0.05, lz * 0.05) > 0.3 ? [0x4a5a46, 0.8] : [0x6a7448, 0.8]; // the marsh: reeds, grazing, the fleets
        if (x > 300 && back < 150) return [0x6e7a44, 0.8];                                    // the golf links
        if (back > 720) return noise(x * 0.03, lz * 0.03) > 0.1 ? [0x6a5a48, 0.6] : [0x9a8e5e, 0.6]; // Martlesham Heath: heather and sandy grass
        return null;                                                                          // the fields
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 30, 385] }, pact: { x: 0, z: -830, entries: [-300, 20, 360] } }, // (the Pact lands: its roads are the beach sectors)
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 150 }, pact: { x: 0, z: -330 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what the Soviet land troops come in (systems/Landing.js): the naval infantry by Aist hovercraft or Polnocny, vehicles by Frosch or Polnocny
    craft: { infantry: ['aist', 'aist', 'polnocny'], vehicle: ['frosch', 'polnocny'] },
    // what the landing may call in at sea: the escorts (the Tarantul in the ptBoat slot) and the Natya sweepers
    navy: ['parchim', 'osa', 'natya', 'ptBoat'],
    // the Royal Navy’s mine barrier off the coast, a lane left off each sector for the sweepers to widen
    seaMines: { z: [520, 580], count: 60, lanes: [-300, 20, 360], lane: 80, seed: 1985_23 },
    // the coastal missile battery inland: two launcher trucks that fire on the ships, then move
    forts: [{ unit: 'coastMissile', ...W(-150, -420), facing: Math.PI }, { unit: 'coastMissile', ...W(250, -470), facing: Math.PI }],
    // prepared positions: wire along the shingle’s crest, minefields and trenches behind it and along the promenade
    works: [
      ...Array.from({ length: 84 }, (_, i) => { const x = -450 + i * 11; return x > 462 ? null : { kind: 'wire', ...W(x, shoreZ(x) - 30), yaw: 0 }; }).filter(Boolean),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 64) }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...W(s.x + dx, shoreZ(s.x + dx) - 52), yaw: 0 }))),
      // MG nests over each beach, in the sector’s zone; a strip of mines on the shingle in front of them, behind the wire
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', ...W(s.x + dx, shoreZ(s.x + dx) - 47), yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', ...W(s.x + dx, shoreZ(s.x + dx) - 38) }))),
    ],
    // the defence at dawn: the air bases’ security police and the port’s guard over each beach, TOW and mortars behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => W(s.x + dx, shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 47 : 56)))), ...SECTORS.map((s) => W(s.inland.x, s.inland.z))],
    // the armoured counter-attack: the POMCUS tanks drawn at the docks’ stores and the brigade flown in, after five and a half minutes
    counter: { t: 330, units: ['heavyTank', 'ifv', 'heavyTank', 'ifv'], say: 'The reinforcement brigade is coming down the A14 from Martlesham Heath: Abrams and Bradleys, straight for the beachhead', sayOther: 'Enemy armour coming down the A14 from the heath' },
    // the landing’s AI (ai/LandingDirector.js): the naval infantry’s buying order, a Parchim inshore off the focus sector
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'pt76', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'parchim', gunships: 1, sweeper: 'natya', heavy: null, inshore: 380 },
    economy: { reserves: 2000, perSector: 550, beachIncome: 0.75, defenceCp: 975, defenceIncome: 1.9 }, // (Scheveningen’s: the later, smaller counter-attack — AI vs AI 2026-11-22: 3 of 4 runs the defence just holds at 2 of 3 inland, 1 the landing takes all at 20:31)
    // the amphibious vehicles swim in on their own, put in off the beach: BMPs, BTRs and BRDMs, the PT-76s
    swim: { ifv: 'swimIfv', reconVehicle: 'swimRecon', pt76: 'swimPT76' },
    // the first wave at dawn, in to all three sectors at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'pt76', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_23);
    sea.build(scene, terrain);
    const at = (x: number, z: number) => { const w = W(x, z); return { ...w, y: terrain.heightAt(w.x, w.z) }; };
    const nearPoint = (x: number, z: number, m: number) => points.some((p) => Math.hypot(p.x - x, p.z - F * z) < m);
    const nearRoad = (x: number, z: number, m: number) => onRoadL(x, z) || onRoadL(x + m, z) || onRoadL(x - m, z) || onRoadL(x, z + m) || onRoadL(x, z - m);
    const cyl = (x: number, z: number, y: number, r0: number, r1: number, h: number, color: number, key = 'metal', seg = 16) => {
      const w = W(x, z);
      props.push(key, new THREE.CylinderGeometry(r0, r1, h, seg), new THREE.Matrix4().makeTranslation(w.x, y + h / 2, w.z), color);
    };
    const martello = (x: number, z: number) => { // a squat brick tower, its parapet; cover round it
      const p = at(x, z);
      cyl(x, z, p.y - 0.5, 5.6, 6.6, 10.5, 0xa89878, 'stone');
      cyl(x, z, p.y + 10, 5.8, 5.8, 1.2, 0x8e8068, 'stone');
      cover.addCylinder({ x: p.x, z: p.z, radius: 6.4, height: 10 });
    };

    // ---- the container port: the quay along the Orwell, the gantry cranes, the container stacks, a ship alongside
    const COLORS = [0x8a2a22, 0x2a4a7a, 0x3a6a3a, 0xb8862a, 0x6a6a6a, 0xc84a2a, 0x2a6a7a, 0xd8d4c8];
    for (let b = 110; b < 640; b += 10) { const w = W(QUAY_X - 2, shoreZ(QUAY_X) - b - 5); props.box('stone', w.x, 0.2, w.z, 3, 7, 10, 0, 0x8a867e); } // the quay wall
    for (let b = 150; b < 560; b += 70) { // (a gantry crane: four legs straddling the quay’s rails, the girder, the boom out over the water)
      const w = W(QUAY_X + 10, shoreZ(QUAY_X) - b), y = 3.5;
      for (const sx of [-9, 9]) for (const sz of [-6, 6]) props.box('metal', w.x + sx, y + 15, w.z + sz, 1.2, 30, 1.2, 0, 0x2e5a8a);
      for (const sz of [-6, 6]) props.box('metal', w.x - 10, y + 31, w.z + sz, 50, 2, 1.4, 0, 0x2e5a8a);
      props.box('metal', w.x - 2, y + 33, w.z, 8, 4, 10, 0, 0xd8d8d0);                           // the machinery house
      props.box('metal', w.x + 2, y + 40, w.z, 1.2, 14, 1.2, 0, 0x2e5a8a);                       // the A-frame
      cover.addBox({ x: w.x, z: w.z, yaw: 0, length: 20, thickness: 14, height: 3, spots: false });
    }
    { // a container ship alongside: the hull, the boxes on deck, the bridge aft
      const w = W(QUAY_X - 22, shoreZ(QUAY_X) - 360);
      props.box('metal', w.x, 1, w.z, 20, 10, 170, 0, 0x2a3036);
      for (let k = -70; k < 50; k += 13) props.box('plain', w.x, 7.5, w.z + k, 18, 3 + (Math.abs(k) % 3) * 2.6, 12, 0, COLORS[Math.abs(k) % COLORS.length]);
      props.box('plain', w.x, 12, w.z + 70, 18, 12, 12, 0, 0xe8e6e0);
    }
    for (let x = -437; x < -300; x += 14) for (let b = 110; b < 600; b += 16) { // the stacks: blocks of four boxes side by side, one to four high
      const z = shoreZ(x) - b, cx = x + 5;
      if (nearRoad(cx, z, 10) || nearPoint(cx, z, 30) || Math.abs(z - a14Z(cx)) < 14 || r() < 0.18) continue;
      const tiers = 1 + Math.floor(r() * 4), w = W(cx, z);
      for (let t = 0; t < tiers; t++) for (let c = 0; c < 4; c++) props.box('plain', w.x - 3.75 + c * 2.5, 3.5 + 1.3 + t * 2.6, w.z, 2.4, 2.55, 12, 0, COLORS[Math.floor(r() * COLORS.length)]);
      cover.addBox({ x: w.x, z: w.z, yaw: Math.PI / 2, length: 12, thickness: 10, height: tiers * 2.6 });
    }
    props.hall({ ...W(-280, -330), yaw: 0, width: 40, depth: 20, height: 9, color: 0xb8b4aa, roof: 0x4a5a6a, door: 10, name: 'container freight station' });
    props.flatHouse({ ...W(-360, -40), yaw: 0, width: 22, depth: 12, storeys: 4, name: 'port offices' });

    // ---- Landguard Fort on the spit: the brick curtain and bastions, the barracks inside; the point’s lookout
    { const fx = -405, fz = shoreZ(-405) - 78;
      for (const [dx, dz, yaw, len] of [[0, -24, 0, 44], [0, 24, 0, 44], [-24, 0, Math.PI / 2, 44], [24, 0, Math.PI / 2, 44]] as [number, number, number, number][]) props.lowWall({ ...W(fx + dx, fz + dz), yaw, length: len, height: 6, color: 0x8a5a44 });
      for (const [dx, dz] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) { const p = at(fx + dx, fz + dz); props.box('stone', p.x, p.y + 3, p.z, 9, 6.5, 9, Math.PI / 4, 0x84543e); cover.addBox({ x: p.x, z: p.z, yaw: Math.PI / 4, length: 9, thickness: 9, height: 6 }); }
      props.townHouse({ ...W(fx, fz + 8), yaw: 0, width: 24, depth: 8, storeys: 2, name: 'Landguard barracks', damaged: 0 });
    }
    martello(-215, shoreZ(-215) - 70);                                                          // tower P, Langer Road

    // ---- Felixstowe on its cliffs: the pier, the Spa Pavilion, the seafront hotels, the town, the cliff gardens
    for (let d = -2; d < 130; d += 12) { // the pier: a deck on piles out over the sea
      const p = W(-140, shoreZ(-140) + d);
      for (const o of [-3, 3]) props.box('metal', p.x + o, 1.5, p.z, 0.5, 7, 0.5, 0, 0x5a5e5e);
      props.box('stone', p.x, 4.6, p.z, 8, 0.5, 12.4, 0, 0xb8b0a0);
    }
    props.hall({ ...W(-140, shoreZ(-140) - 52), yaw: 0, width: 26, depth: 14, height: 6, color: 0xd8d4c8, roof: 0x4a6a7a, door: 8, name: 'pier pavilion' });
    props.hall({ ...W(75, shoreZ(75) - 54), yaw: 0, width: 30, depth: 14, height: 7, color: 0xe0dcd0, roof: 0x5a6a6e, door: 8, name: 'Spa Pavilion' });
    for (let x = -190; x < 240; x += 26) { // the hotels and boarding houses along the cliff top
      const z = shoreZ(x) - 108;
      if (Math.abs(x - waltonX(z)) < 22 || nearRoad(x, z, 8)) continue;
      props.townHouse({ ...W(x, z), yaw: 0, width: 18, depth: 12, storeys: 3 + Math.floor(r() * 2), name: x > 120 && x < 170 ? 'Felix Hotel' : 'hotel', damaged: 0 });
    }
    for (let i = 0; i < 90; i++) { // the town behind
      const x = -200 + r() * 430, z = shoreZ(x) - 145 - r() * 170;
      if (nearRoad(x, z, 6) || nearPoint(x, z, 22) || marshD(x, z) < 1.2) continue;
      if (r() < 0.2) props.flatHouse({ ...W(x, z), yaw: 0, width: 14 + r() * 6, depth: 10, storeys: 3, name: 'shops and flats' });
      else props.townHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 7 + r() * 3, depth: 9, storeys: 2 + Math.floor(r() * 2), name: 'town house', damaged: 0 });
    }
    props.church({ ...W(-60, -60), yaw: 0 });
    martello(160, shoreZ(160) - 112);                                                           // a tower on the cliff top by Cobbold’s Point

    // ---- Walton: the old village round its church, the farms along the High Street
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + r() * 0.4, dd = 28 + r() * 55, x = 30 + Math.cos(a) * dd, z = -240 + Math.sin(a) * dd * 0.8;
      if (nearRoad(x, z, 5) || nearPoint(x, z, 18)) continue;
      props.townHouse({ ...W(x, z), yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: 2, name: 'house', damaged: 0 });
    }
    props.church({ ...W(70, -290), yaw: 0 });
    for (let i = 0; i < 9; i++) {
      const x = -260 + i * 70 + (r() - 0.5) * 30, z = highZ(x) - 40 - r() * 30;
      if (Math.abs(x - 30) < 90 || nearRoad(x, z, 12) || marshD(x, z) < 1.3 || inDock(x, z) || x > 440) continue;
      buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, W(x, z).x, W(x, z).z, 0);
    }

    // ---- Felixstowe Ferry at the Deben’s mouth: the cottages, the sailing club, boats drawn up, the Martello towers
    for (let i = 0; i < 14; i++) {
      const x = 385 + (r() - 0.5) * 120, z = -90 + (r() - 0.5) * 90;
      if (x > 455 || nearRoad(x, z, 5) || nearPoint(x, z, 16) || marshD(x, z) < 1.2) continue;
      props.townHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 7 + r() * 2, depth: 7, storeys: r() < 0.5 ? 1 : 2, name: 'cottage', damaged: 0 });
    }
    props.hall({ ...W(445, -20), yaw: Math.PI / 2, width: 20, depth: 10, height: 5, color: 0xd8d0c0, roof: 0x3a4a5a, door: 6, name: 'sailing club' });
    for (let i = 0; i < 8; i++) { const w = W(452 + (r() - 0.5) * 8, -40 - i * 9); props.box('plain', w.x, terrain.heightAt(w.x, w.z) + 0.6, w.z, 2.2, 1.2, 6, 0.2 + r() * 0.3, i % 2 ? 0xe8e4dc : 0x3a5a7a); }
    martello(300, shoreZ(300) - 62);                                                            // tower T
    martello(440, shoreZ(440) - 60);                                                            // tower U

    // ---- Martlesham Heath at the end of the roads: the old airfield’s hangars, the new houses, a church
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, dd = 34 + r() * 110, x = 60 + Math.cos(a) * dd * 1.4, z = -640 + Math.sin(a) * dd * 0.6;
      if (Math.abs(x) > 470 || nearRoad(x, z, 6) || nearPoint(x, z, 20)) continue;
      props.townHouse({ ...W(x, z), yaw: 0, width: 9 + r() * 6, depth: 9, storeys: 2, name: 'house', damaged: 0 });
    }
    props.hall({ ...W(-200, -700), yaw: 0, width: 40, depth: 26, height: 10, color: 0x6a6e66, roof: 0x4a4c4e, door: 18, name: 'old RAF hangar' });
    props.church({ ...W(-20, -690), yaw: 0 });
    commandPost(props, this.bases.nato, -1, 0x6a6e52);

    // ---- across the water: Harwich (its High Lighthouse, the town) beyond the Orwell, Bawdsey Manor and its radar masts beyond the Deben
    for (let i = 0; i < 26; i++) {
      const x = -600 - r() * 260, z = -60 - r() * 500;
      props.townHouse({ ...W(x, z), yaw: r() < 0.5 ? 0 : Math.PI / 2, width: 8 + r() * 4, depth: 9, storeys: 2 + Math.floor(r() * 2), name: 'house', damaged: 0 });
    }
    { const p = at(-620, -40); cyl(-620, -40, p.y, 2.6, 3.4, 26, 0xc8b89a, 'stone', 9); }
    props.townHouse({ ...W(640, -200), yaw: 0, width: 30, depth: 14, storeys: 3, name: 'Bawdsey Manor', damaged: 0 });
    for (const [x, z] of [[620, -320], [680, -380], [720, -300]]) props.mast({ ...W(x, z), height: 70 });
    props.finish();

    // ---- trees: the cliff gardens’ pines and holm oaks, Walton’s hedges and copses, the heath’s Scots pine belts; none on the docks
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => onRoad(x, z) }];
    const land = (x: number, z: number) => { const lz = F * z, back = shoreZ(x) - lz; return back > 66 && chanK(x) <= 0 && !inDock(x, lz) && marshD(x, lz) > 1.1 && Math.abs(x) < 495; };
    const treeK = (x: number, z: number) => {
      const lz = F * z, back = shoreZ(x) - lz;
      if (!land(x, z)) return 0;
      if (cliffK(x) > 0.5 && back < 100) return 0.55;                                                           // the cliff gardens
      if (cliffK(x) > 0.5 && back < 330) return 0.06;                                                           // the town’s gardens
      if (x > 300 && back < 150) return 0;                                                                      // the golf links
      if (back > 720) return smoothstep(0.0, 0.35, fbm(noise, x * 0.008 + 7, lz * 0.008, 2)) * 0.85;           // the heath’s pine belts
      return smoothstep(0.25, 0.5, fbm(noise, x * 0.007 + 4, lz * 0.007, 2)) * 0.8;                             // copses among the fields
    };
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1300, broadleaf: 0.5, autumn: 0.2, maxY: 40,
      avoid: [...avoid, { test: (x: number, z: number) => treeK(x, z) <= 0 }], forest: treeK });
    cover.finalize(bounds);
    const farm = (x: number, z: number) => { const lz = F * z; return land(x, z) && cliffK(x) < 0.3 && shoreZ(x) - lz > 150 && shoreZ(x) - lz < 720 && !(x > 300 && shoreZ(x) - lz < 160); };
    const hedges = plantHedgerows({ scene, terrain, cover, rand, fields: this.fields, area: bounds, count: 9000, lane: 0,
      avoid: [...avoid, { test: (x: number, z: number) => !farm(x, z) || Math.hypot(x - 30, F * z + 240) < 100 || Math.hypot(x - 385, F * z + 90) < 70 }] });
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => { const lz = F * z; return shoreZ(x) - lz < 45 || chanK(x) > 0 || inDock(x, lz) || (cliffK(x) > 0.5 && shoreZ(x) - lz < 330); } }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); hedges.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
