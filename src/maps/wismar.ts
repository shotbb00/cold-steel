// Wismar Bay, Mecklenburg, 1985 (coastal: NATO lands, the GDR holds; 1.0 × 1.8 km). Hohwacht the other way round:
// the landing NATO's planners kept for the day the Pact's tanks were past the Elbe — the Bundeswehr's and the US
// Marines' battalions put ashore behind the front from the Bundesmarine's Type 520 landing craft and the
// amphibious ships' LCVPs, with the German and Danish Baltic navies to cover them. Wismar Bay, on the GDR's coast
// 25 km over the water from Travemünde: in the west the shore under the Hohen Wieschendorf Huk (a clay cliff) and
// the beach at Zierow with its manor; in the middle the head of the bay at Wendorf, then the quays of Wismar's
// harbour and the Mathias-Thesen shipyard, and up behind them the Hanseatic old town — the brick gables round the
// Markt, St Marien's tower and St Nikolai's tall nave; in the east Poel island, cut off by the Breitling, with the
// beach at Timmendorf and Kirchdorf's church inland, joined to the mainland only by the dam at Fährdorf. Along
// the shore the Grenzbrigade Küste's concrete watchtowers and trenches, the NVA's Rubezh coastal missile
// battery inland; behind it all the big collective farms' fields (no hedges here: the LPGs took them out), beech
// woods, and Dorf Mecklenburg on the road to Schwerin.
// Laid out like Omaha (maps/omaha.ts): the lander is NATO, so the sea is toward +z and NATO's base is out in it
// (the landing comes from its base out at sea: systems/Landing.js lands()); the Pact holds the land, -z.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { buildSite, commandPost } from './common.js';
import { craftType } from '../data/units/baltic85.js';
import { TYPES_1985, UNIT_TYPES } from '../data/units/index.js';
import { buildLCT, buildLCVP } from '../data/models/landingCraft45.js';
import type { MapDef, ControlPointDef } from '../types.ts';

// ---- NATO's landing craft, 1985 (the roster has only the Pact's: data/units/baltic85.js). Real boats on the 1944
// frames they grew out of: the Bundesmarine's Type 520 (Barbe class, 22 built for the Baltic: a 40 m ramped LCU, the
// wheelhouse aft — the LCT's lines) and the US Navy's LCVP Mk 7 (still the Higgins boat's shape, off the amphibious ships).
const lcu520 = craftType({
  engine: 'engine.diesel',
  id: 'lcu520', name: 'Landing Craft (Type 520)', shortName: 'Type 520',
  names: { nato: ['Barbe', 'Delphin', 'Dorsch', 'Felchen', 'Forelle', 'Hering', 'Karpfen', 'Lachs', 'Renke', 'Salm', 'Stör', 'Zander'], pact: ['L-1'] },
  hull: { length: 40, beam: 8.8 },
  stats: { draft: 1.4, hp: 1300, armor: 0.06, speed: 7.5, accel: 0.4, turnRate: 0.17, turretRate: 1, radius: 5, height: 5, eyeHeight: 6, sight: 600, smallCraft: true, range: 0, aggroRange: 0, preferredRange: 0, damage: 0 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 60, height: 18, shoulder: 0 },
  models: { nato: buildLCT, pact: buildLCT },
  variants: { nato: { name: 'Type 520 landing craft (Barbe class)', weapon: '2 × 20 mm', text: 'The Bundesmarine’s landing craft, built for the Baltic: a Leopard or a company of Panzergrenadiere straight onto the sand through the bow ramp. Slow and big on the run in.' }, pact: { name: 'Landing craft', weapon: '—', text: 'A landing craft.' } },
});
const lcvp85 = craftType({
  engine: 'engine.dieselSmall',
  id: 'lcvp85', name: 'Landing Craft (LCVP Mk 7)', shortName: 'LCVP',
  names: { nato: ['LCVP 1', 'LCVP 2', 'LCVP 3', 'LCVP 4', 'LCVP 5', 'LCVP 6', 'LCVP 7', 'LCVP 8'], pact: ['L-2'] },
  hull: { length: 10.9, beam: 3.3 },
  stats: { draft: 0.9, hp: 300, armor: 0.04, speed: 9, accel: 0.8, turnRate: 0.45, turretRate: 1, radius: 2.4, height: 2.6, eyeHeight: 3, sight: 400, smallCraft: true, stealth: 0.4, range: 0, aggroRange: 0, preferredRange: 0, damage: 0 },
  mounts: { nato: [], pact: [] },
  camera: { distance: 26, height: 9, shoulder: 0 },
  models: { nato: buildLCVP, pact: buildLCVP },
  variants: { nato: { name: 'LCVP Mk 7', weapon: '—', text: 'The amphibious ships’ small landing craft: a squad from the ship to the beach, the ramp down, out. Forty years on, still the Higgins boat.' }, pact: { name: 'Landing craft', weapon: '—', text: 'A small landing craft.' } },
});
for (const t of [lcu520, lcvp85]) { TYPES_1985[t.id] ??= t; if (UNIT_TYPES.frosch) UNIT_TYPES[t.id] ??= t; } // (1985's roster: data/epoch.js swaps it in)

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1985_10);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a5a62 }); // (the western Baltic: grey-green, brackish)

/** The waterline (z, sea toward +z): the bay's head at Wendorf furthest in, Poel's shore further out in the east. */
const shoreZ = (x: number) => 150 + fbm(noise, x * 0.003, 2.1, 2) * 14 - 55 * Math.exp(-(((x - 20) / 230) ** 2)) + smoothstep(220, 270, x) * 18;
/** The Hohen Wieschendorf Huk (far west): the clay cliff. */
const cliffK = (x: number) => smoothstep(-390, -460, x);
/** Wismar's harbour: quay walls instead of a beach. */
const harbourK = (x: number) => smoothstep(68, 92, x) * smoothstep(222, 200, x);
/** The Breitling, between the mainland and Poel: down from the bay, then east past the Fährdorf dam. */
const BREIT = [[232, 300], [232, -190], [275, -275], [520, -300]];
function breitD(x: number, z: number) {
  let d = Infinity;
  for (let i = 0; i < BREIT.length - 1; i++) {
    const [ax, az] = BREIT[i], [bx, bz] = BREIT[i + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return d;
}
const DAM_X = 395; // (the Fährdorf dam: the Poel road over the Breitling)
const onPoel = (x: number, z: number) => x > 240 && z > -280 + (x - 240) * -0.08;
/** The old town: inside the line of the old walls. */
const inTown = (x: number, z: number) => x > -175 && x < 195 && z < -130 && z > -390;

function height(x: number, z: number) {
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  const hk = harbourK(x);
  let h: number;
  if (d > 0) { // the bottom: a sandbar or two close in, then shelving away; dredged deep along the quays
    h = 0.6 - d * 0.014 - Math.max(0, d - 140) * 0.045 + Math.sin(d * 0.06 + x * 0.003) * 0.3 * smoothstep(20, 60, d) * smoothstep(140, 100, d);
    h = Math.max(h, -18);
    if (hk > 0) h += (Math.min(h, -6) - h) * hk;
  } else {
    const back = -d; // m inland of the waterline
    // the beach (30–40 m of sand), low dunes, then the land behind: 6–10 m and rolling, rising inland (Poel lower)
    const beach = 0.6 + back * 0.04;
    const dune = 2.8 * Math.exp(-(((back - 46) / 12) ** 2)) * (0.8 + 0.4 * fbm(noise, x * 0.02, 3.3, 2));
    const poel = onPoel(x, z) ? 0.6 : 1;
    const land = (4 + smoothstep(40, 140, back) * 4 + Math.max(0, back - 140) * 0.02 + fbm(noise, x * 0.004, z * 0.004, 3) * 6) * poel;
    h = Math.max(beach + dune * smoothstep(20, 40, back), Math.min(land, beach + back * 0.25));
    // the Huk: the land 16 m up straight behind a narrow beach
    const ck = cliffK(x);
    if (ck > 0) {
      const top = 16 + fbm(noise, x * 0.01, 7.1, 2) * 3 + Math.max(0, back - 80) * 0.02;
      h += (Math.max(h, beach + (top - beach) * smoothstep(24, 44, back)) - h) * ck;
    }
    // the quays: a flat apron 2.6 m up, straight out of deep water
    if (hk > 0) h += (Math.max(2.6, Math.min(h, 2.6 + Math.max(0, back - 70) * 0.06)) - h) * hk;
  }
  // the Breitling: shallow water, reedy banks — and the dam across it
  const bd = breitD(x, z);
  if (bd < 120) {
    h = Math.min(h, -2.4 + Math.max(0, bd - 14) * 0.2); // (the banks: low and gentle — the land comes down to the water over 100 m)
    if (Math.abs(x - DAM_X) < 6 && z < -200 && bd < 34) h = Math.max(h, 1.6); // (the dam: level with the banks where they reach 1.6 m)
  }
  return h;
}

/** Roads: the coast road behind the beach, the roads inland (Zierow, the Schwerin road, the Poel road over the dam), two across. */
function onRoad(x: number, z: number) {
  const sz = shoreZ(x);
  if (x < 70 && cliffK(x) < 0.4 && Math.abs(z - (sz - 82 + Math.sin(x * 0.01) * 4)) < 3.5) return true;     // the coast road
  if (Math.abs(x - (-320 + Math.sin(z * 0.012) * 16)) < 3.5 && z < sz - 40 && z > -900) return true;          // up through Zierow
  if (Math.abs(x - (-30 + Math.sin(z * 0.009) * 14)) < 3.5 && z < sz - 40 && z > -900) return true;           // the Schwerin road (F 106) through the old town
  if (Math.abs(x - DAM_X) < 3.5 && z < sz - 40 && z > -900) return true;                                       // the Poel road, over the dam
  if (Math.abs(z - (-470 + Math.sin(x * 0.006) * 25)) < 3.5) return true;                                      // across, south of the town (the F 105)
  if (x > -175 && x < 225 && Math.abs(z - (-205 + Math.sin(x * 0.02) * 3)) < 3) return true;                   // the Lübsche Straße, harbour to the Markt
  if (harbourK(x) > 0.5 && Math.abs(z - (sz - 22)) < 3) return true;                                           // along the quays
  return false;
}

/** The beach sectors (x) and the places up behind them. */
export const SECTORS = [
  { x: -320, name: 'Zierow beach', inland: { name: 'Zierow', x: -320, z: -90 } },
  { x: -30, name: 'Wendorf beach', inland: { name: 'Wismar old town', x: -20, z: -255 } },
  { x: 330, name: 'Timmendorf Strand', inland: { name: 'Kirchdorf', x: 380, z: -110 } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Landing area', x: 0, z: 770, owner: 'nato', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` the place behind once taken), out to the trenches over each
  { id: 'B', name: 'Zierow beach', x: -320, z: shoreZ(-320) - 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: 'Wendorf beach', x: -30, z: shoreZ(-30) - 44, owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: 'Timmendorf Strand', x: 330, z: shoreZ(330) - 44, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Zierow', x: -320, z: -90, owner: null, sector: 'west' },
  { id: 'F', name: 'Wismar old town', x: -20, z: -255, owner: null, sector: 'centre' },
  { id: 'G', name: 'Kirchdorf', x: 380, z: -110, owner: null, sector: 'east' },
  { id: 'K', name: 'Dorf Mecklenburg', x: -30, z: -660, owner: 'pact', sector: 'centre' },
];

export default {
  id: 'wismar',
  name: 'Wismar Bay Landing',
  description: 'Mecklenburg, 1985: the beaches of Wismar Bay under the Huk, the quays and the Hanseatic old town of Wismar, Poel island behind the Breitling, the collective farms’ fields inland. NATO lands from the sea; the NVA and the Soviet Army hold the GDR’s coast.',
  epochs: ['1985'],
  region: 'europe',
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'NATO', pact: 'Warsaw Pact' },
  armies: { nato: ['bw', 'us'], pact: ['nva', 'sov'] }, // (the Bundeswehr and the US Marines’ battalions land; the NVA and the Soviet Army hold)
  conditions: { time: 'dawn', weather: 'overcast' },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.45, // (vehicles: the Huk and the quay walls are no way up)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1985,
  height,
  river: sea,
  fields: createFields({ seed: 1985_10, cell: 110, weights: [0.3, 0.1, 0.4, 0.2] }), // (the LPGs’ big fields)

  theme: {
    fogColor: 0xa6b0b4, fogDensity: 0.0006,
    skyTop: 0x6f8094, skyHorizon: 0xc8cccc, skyBottom: 0x828a8e,
    sunColor: 0xf2e8d6, sunIntensity: 1.6, sunDisk: 0.2,
    clouds: 0.7, cloudLight: 0xdadcd8, cloudDark: 0x8a9298,
    sunDir: [0.75, 0.45, 0.4],
    hemiSky: 0xc8d2d8, hemiGround: 0x4e5638, hemiIntensity: 1.3,
    rimColor: 0xd0d8dc, rimIntensity: 0.2,
    terrain: {
      grass: '#5a6c3c', grassAlt: '#4e6036', dryGrass: '#8e8a58', dirt: '#5c4e3c', rock: '#7a6a52',
      pasture: '#5c6c3c', ploughed: '#5a4834', stubble: '#90865a', meadow: '#68763e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const sz = shoreZ(x);
        if (onRoad(x, z)) return [0x55555a, 0.9];                                           // asphalt, cobbles in the town
        if (y < -0.3) return [0xb0a486, 1];                                                  // the sand under the water
        if (harbourK(x) > 0.5 && z > sz - 80) return [0x7a7a74, 0.95];                       // the quays' concrete
        if (z > sz - 34 && breitD(x, z) > 40) return [0xddd0ae, 1];                          // the beach
        if (breitD(x, z) < 42) return [0x6a7448, 0.8];                                       // the Breitling's reeds
        if (cliffK(x) > 0.3 && z > sz - 52 && y > 3) return [0x8a7458, 0.85];                // the Huk's clay face
        if (z > sz - 62 && cliffK(x) < 0.5) return [0xc2b78c, 0.7];                          // the dunes, marram grass
        if (inTown(x, z)) return [0x6e6862, 0.8];                                            // the old town's streets and yards
        return null;                                                                        // the fields
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-320, -30, 330] }, // (the side that lands: its roads are the beach sectors)
           pact: { x: 0, z: -830, entries: [-320, -30, DAM_X] } },
  maxStacks: 22,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -150 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    // what NATO's land troops come in (systems/Landing.js; the craft above): squads by LCVP or Type 520, vehicles by Type 520
    craft: { infantry: ['lcvp85', 'lcvp85', 'lcu520'], vehicle: ['lcu520'] },
    // what the landing may call in at sea: the Bundesmarine's Bremen frigates, its destroyers, the Schnellboote (frames: data/units/ships85.js)
    navy: ['frigate', 'destroyer', 'ptBoat'],
    // the Volksmarine's mine barrier across the bay, a lane left off each sector (dan buoys)
    seaMines: { z: [520, 580], count: 60, lanes: [-320, -30, 330], lane: 80, seed: 1985_10 },
    // Küstenraketenregiment 18's Rubezh launchers inland: they fire on the ships, then move (systems/Landing.js batteries)
    forts: [{ unit: 'coastMissile', x: -170, z: -330, facing: 0 }, { unit: 'coastMissile', x: 160, z: -520, facing: 0 }],
    // the Grenzbrigade Küste's positions: wire along the back of the beach, minefields, trenches and MG nests on the dunes over each sector
    works: [
      ...Array.from({ length: 91 }, (_, i) => { const x = -495 + i * 11; return harbourK(x) > 0.05 || breitD(x, shoreZ(x) - 30) < 46 ? null : { kind: 'wire', x, z: shoreZ(x) - (cliffK(x) > 0.3 ? 18 : 30), yaw: 0 }; }).filter((w) => !!w),
      ...SECTORS.flatMap((s) => [-38, 38].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 64 }))),
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) - 52, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-22, 22].map((dx) => ({ kind: 'mgNest', x: s.x + dx, z: shoreZ(s.x + dx) - 47, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-12, 12].map((dx) => ({ kind: 'mines', x: s.x + dx, z: shoreZ(s.x + dx) - 38 }))),
    ],
    // the defence at dawn: the border brigade's companies in the trenches and the villages, the motor riflemen's anti-tank guns behind
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'mgTeam', 'atTeam', 'mgTeam', 'atTeam', 'mgTeam', 'rifles', 'tankDestroyer', 'mortar', 'rifles', 'tankDestroyer', 'mortar', 'scouts'],
    names: { rifles: 'GBK-Zug', coastMissile: 'Küstenraketenbatterie' },
    hold: [...SECTORS.flatMap((s) => [-45, -22, 22, 45].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) - (Math.abs(dx) < 30 ? 47 : 56) }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    // the armoured counter-attack: the 8th Motor Rifle Division's reserve, up the Schwerin road and over the Poel dam
    counter: { t: 360, units: ['heavyTank', 'ifv', 'tank', 'ifv', 'heavyTank'], say: 'The 8th Motor Rifle Division is coming up from Schwerin: T-72s and BMPs, straight for the beachhead', sayOther: 'Enemy armour coming up the Schwerin road: T-72s and BMPs' },
    // the landing's AI (ai/LandingDirector.js): the battalions' buying order, a frigate inshore off the focus sector
    ai: { order: ['rifles', 'ifv', 'rifles', 'engineers', 'reconVehicle', 'rifles', 'mgTeam', 'tank', 'rifles', 'ifv', 'atTeam', 'mortar', 'rifles', 'tank'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 380 },
    economy: { reserves: 3000, perSector: 600, beachIncome: 0.8, defenceCp: 800, defenceIncome: 1.5 },
    // the scout vehicles swim in on their own, put in off the beach: the Luchs, the M3 on its screen
    swim: { reconVehicle: 'swimRecon' },
    // the first wave at dawn, in to all three sectors at once
    waves: [{ t: 0, say: 'The first wave is going in', units: [
      { unit: 'rifles', sector: 0 }, { unit: 'ifv', sector: 0 },
      { unit: 'rifles', sector: 1 }, { unit: 'reconVehicle', sector: 1 }, { unit: 'tank', sector: 1 }, { unit: 'engineers', sector: 1 },
      { unit: 'rifles', sector: 2 }, { unit: 'ifv', sector: 2 },
    ] }],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1985_10);
    sea.build(scene, terrain);
    const y0 = (x: number, z: number) => terrain.heightAt(x, z);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const free = (x: number, z: number) => !onRoad(x, z) && breitD(x, z) > 50 && z < shoreZ(x) - 60 && !near(x, z, 18);
    const BRICK = 0x7e3a2c, BRICK2 = 0x6a3428, ROOF = 0x4a3c38;

    // ---- the old town: gabled brick and plaster houses in the blocks between the streets
    for (let gx = -165; gx < 190; gx += 21) for (let gz = -140; gz > -385; gz -= 19) {
      const x = gx + (r() - 0.5) * 4, z = gz + (r() - 0.5) * 4;
      if (r() < 0.25 || !free(x, z) || onRoad(x, z + 6) || onRoad(x, z - 6) || onRoad(x + 6, z) || onRoad(x - 6, z)) continue;
      if (Math.hypot(x + 70, z + 230) < 30 || Math.hypot(x - 60, z + 300) < 34 || Math.hypot(x - 10, z + 205) < 12) continue; // (St Marien, St Nikolai, the Markt)
      props.townHouse({ x, z, yaw: Math.abs(x) % 2 < 1 ? 0 : Math.PI, width: 8 + r() * 3, depth: 10 + r() * 3, storeys: 3 + (r() < 0.3 ? 1 : 0), name: 'gabled house', damaged: 0 });
    }
    // St Marien's tower (80 m: the sea-mark), its nave gone; St Nikolai's tall brick nave and tower
    { const x = -70, z = -230, g = y0(x, z);
      props.box('stone', x, g + 30, z, 13, 60, 13, 0, BRICK);
      props.box('stone', x, g + 62, z, 9, 4, 9, 0, BRICK2);
      cover.addBox({ x, z, yaw: 0, length: 13, thickness: 13, height: 60 }); }
    props.hall({ x: 60, z: -300, yaw: 0, width: 18, depth: 50, height: 24, color: BRICK, roof: ROOF, door: 4, name: 'St Nikolai' });
    { const x = 60, z = -268, g = y0(x, z);
      props.box('stone', x, g + 24, z, 10, 48, 10, 0, BRICK2);
      cover.addBox({ x, z, yaw: 0, length: 10, thickness: 10, height: 48 }); }
    // ---- the harbour: the quays, the warehouses and cranes, a freighter tied up, the shipyard by the Breitling
    for (let x = 100; x < 175; x += 26) props.hall({ x, z: shoreZ(x) - 45, yaw: 0, width: 22, depth: 14, height: 9, color: BRICK2, roof: ROOF, door: 6, name: 'warehouse' });
    for (const x of [96, 134, 166]) { const z = shoreZ(x) - 8, g = y0(x, z);
      for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) props.box('metal', x + dx, g + 6, z + dz, 0.5, 12, 0.5, 0, 0x6a6e6a);
      props.box('metal', x, g + 13, z, 4, 3, 5, 0, 0x8a4a2a);
      props.box('metal', x, g + 15, z + 8, 1.2, 1.2, 20, 0, 0x8a4a2a); } // (the jib out over the water)
    { const x = 140, z = shoreZ(140) + 14; // (a Deutsche Seereederei freighter at the quay)
      props.box('plain', x, 1.6, z, 76, 6.5, 11, 0, 0x2e3438);
      props.box('plain', x - 26, 7.5, z, 12, 6, 10, 0, 0xe8e4dc);
      props.box('plain', x - 26, 12, z, 3, 4, 3, 0, 0xb83a2a); }
    props.hall({ x: 192, z: shoreZ(192) - 62, yaw: Math.PI / 2, width: 56, depth: 30, height: 20, color: 0x7a7e7a, roof: 0x5a5e62, door: 14, name: 'Mathias-Thesen-Werft' });
    for (const [x0, len] of [[78, 70], [214, 60]] as [number, number][]) for (let k = 0; k < len; k += 4.5) props.boulder({ x: x0, z: shoreZ(x0) + 4 + k, radius: 2.3 }); // (the moles)
    // ---- Zierow: the manor, farms and houses; the Huk's summer houses
    props.hall({ x: -360, z: -60, yaw: 0, width: 26, depth: 13, height: 9, color: 0xd8ccb4, roof: 0x5a4038, door: 3, name: 'Zierow manor' });
    for (let [cx, cz, n] of [[-320, -110, 10], [-440, -40, 6], [-30, -660, 16], [380, -120, 12]] as [number, number, number][]) {
      for (let i = 0; i < n * 2 && n > 0; i++) {
        const a = r() * Math.PI * 2, dd = 26 + r() * (n > 12 ? 70 : 42);
        const x = cx + Math.cos(a) * dd, z = cz + Math.sin(a) * dd * 0.8;
        if (!free(x, z) || Math.abs(x) > 485 || Math.hypot(x + 360, z + 60) < 22) continue;
        n--;
        if (i % 3 === 0) buildSite(props, { kind: 'farm', seed: Math.floor(r() * 1e9) }, x, z, a + Math.PI / 2);
        else props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.3 ? 1 : 2, name: 'house', damaged: 0 });
      }
    }
    props.church({ x: 350, z: -150, yaw: 0 });  // Kirchdorf's church
    props.church({ x: -70, z: -690, yaw: 0 });  // Dorf Mecklenburg's
    // Timmendorf: the pilots' harbour and its little lighthouse on Poel
    { const x = 460, z = shoreZ(460) - 18, g = y0(x, z);
      props.box('stone', x, g + 6, z, 3, 12, 3, 0, 0xe8e4dc);
      props.box('metal', x, g + 13, z, 3.4, 2, 3.4, 0, 0x2a2a2a); }
    // ---- the Grenzbrigade Küste's concrete watchtowers along the shore, a hall of the LPG's out in the fields
    for (const x of [-430, -190, 30, 300, 440]) props.tower({ x, z: shoreZ(x) - (cliffK(x) > 0.3 ? 60 : 70), concrete: true });
    for (const [x, z] of [[-230, -540], [250, -620], [-400, -720]]) props.hall({ x, z, yaw: 0.3, width: 40, depth: 14, height: 6, color: 0x9a9488, roof: 0x5a5c5e, door: 8, name: 'LPG barn' });
    commandPost(props, this.bases.pact, 1, 0x6a6e52);
    props.finish();

    const land = (x: number, z: number) => z < shoreZ(x) - 70 && breitD(x, z) > 52;
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: 0, z: -830, r: 26 }, { test: (x: number, z: number) => onRoad(x, z) || inTown(x, z) || !land(x, z) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 1300, broadleaf: 0.85, autumn: 0.25, maxY: 80, avoid,
      forest: (x: number, z: number) => smoothstep(0.2, 0.5, fbm(noise, x * 0.006 + 4, z * 0.006, 2)) * 0.85 * (onPoel(x, z) ? 0.3 : 1) }); // (the beech woods; Poel nearly bare)
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 2, fields: this.fields,
      avoid: [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { test: (x: number, z: number) => z > shoreZ(x) - 30 || breitD(x, z) < 40 || inTown(x, z) || onRoad(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
