// Zeebrugge, the night of 22–23 April 1918 (coastal, the 1918 epoch: the British land, the Germans hold; 1.6 × 2.0 km).
// The Zeebrugge raid: the U-boats and torpedo boats of the Flanders flotillas came out to sea through the canal from
// Bruges, and the Royal Navy came at night to shut it — the old cruiser Vindictive and the Mersey ferries Iris and
// Daffodil alongside the Mole to storm its batteries, while three blockships filled with concrete steamed past the
// Mole-head into the canal mouth and sank themselves there.
// The Mole (shortened here from its 2.4 km): a stone breakwater curving out from the shore round the harbour, joined
// to the land by an open steel viaduct; a high parapet along its seaward side, sheds, the railway station and the
// seaplane station on it, a battery on the narrow lighthouse extension at its head. Inside, the harbour with the
// canal entrance between its wooden piers, the lock up the canal; behind the dunes the town and the coastal batteries.
// The sea is toward +z: the British come from there.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2400;
const BOUNDS = { x: 800, z: 1000 };
const noise = createNoise2D(1918_04);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e4a52 }); // (the grey-green North Sea off Flanders)

/** The waterline: nearly straight along the Flemish coast. */
const shoreZ = (x: number) => fbm(noise, x * 0.004, 1.7, 2) * 10;
/** The canal from the harbour to Bruges: between x CANAL[0] and CANAL[1], from the shore inland; its piers out into the harbour. */
const CANAL = [-100, -40];
const PIERS = { x: [-112, -28], to: 170, half: 3, deck: 3.2 };
const LOCK = -260; // (z: the lock gates across the canal, a bridge over them)
const ROAD_BRIDGE = -560;

/** The Mole's centre line: the viaduct from the shore, the Mole proper curving round, the lighthouse extension. */
type Seg = { a: [number, number]; b: [number, number]; half: number; deck: number; kind: 'viaduct' | 'mole' | 'head' };
const MOLE_LINE: [number, number][] = [[620, 160], [565, 300], [420, 400], [200, 455], [-60, 470]];
const SEGS: Seg[] = [
  { a: [620, 0], b: [620, 160], half: 4, deck: 5.5, kind: 'viaduct' },
  ...MOLE_LINE.slice(1).map((b, i) => ({ a: MOLE_LINE[i], b, half: 24, deck: 6.5, kind: 'mole' as const })),
  { a: [-60, 470], b: [-265, 452], half: 6, deck: 6, kind: 'head' },
];
const LIGHT = { x: -270, z: 452 };
/** m the deck runs flat past `half` (the terrain grid's last cell slopes from it to the bottom: outside the parapet, not under the men on it). */
const LEDGE = 2.7;

/** Distance from (x, z) to a segment, the point along it (0..1), and which side (+1: seaward, the left of a→b). */
function segD(s: Seg, x: number, z: number) {
  const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
  const px = ax + dx * t, pz = az + dz * t;
  return { d: Math.hypot(x - px, z - pz), t, side: Math.sign(dx * (z - az) - dz * (x - ax)) };
}
/** The Mole at (x, z): its deck height there, or null off it. */
function moleAt(x: number, z: number) {
  let best: { s: Seg; d: number; side: number } | null = null;
  for (const s of SEGS) {
    const r = segD(s, x, z);
    if (r.d <= s.half + (s.kind === 'viaduct' ? 0 : LEDGE) && (!best || r.d < best.d)) best = { s, d: r.d, side: r.side };
  }
  return best;
}

/** The Mole's seaward face nearest (x, z) (systems/Landing.js `alongside`): the point on it and the normal out to sea. */
function wall(x: number, z: number) {
  let best = null as null | { x: number; z: number; nx: number; nz: number; d: number; half: number };
  for (const s of SEGS) {
    if (s.kind === 'viaduct') continue;
    const r = segD(s, x, z), [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az);
    const nx = (bz - az) / len, nz = -(bx - ax) / len, px = ax + (bx - ax) * r.t, pz = az + (bz - az) * r.t;
    const face = s.half + LEDGE + 1.3; // (the wall's face: half-way down the grid's last cell)
    if (!best || r.d < best.d) best = { x: px + nx * face, z: pz + nz * face, nx, nz, d: r.d, half: face };
  }
  return best!;
}

/** Ground height (sea toward +z). */
function height(x: number, z: number) {
  const m = moleAt(x, z);
  if (m) return m.s.deck;                                                                     // the Mole's stone and the viaduct's deck: sheer to the water
  for (const px of PIERS.x) if (Math.abs(x - px) < PIERS.half && z > -5 && z < PIERS.to) return PIERS.deck; // the canal's wooden piers
  const sz = shoreZ(x);
  const d = z - sz; // + out to sea
  if (d > 0) {
    const bottom = Math.max(-1.2 - d * 0.07, -13) + fbm(noise, x * 0.01, z * 0.01, 2) * 0.6; // the bottom shelving away
    const channel = x > PIERS.x[0] + 4 && x < PIERS.x[1] - 4 && z < PIERS.to + 90 ? -9.5 : 0; // (the dredged channel between the piers into the canal: deep enough for a destroyer — or a blockship)
    return Math.min(bottom, channel);
  }
  const back = -d;
  // the canal: dug through the dunes and the polder, quayed; the lock gates and the road bridge cross it
  if (x > CANAL[0] && x < CANAL[1]) {
    if (Math.abs(z - LOCK) < 7 || Math.abs(z - ROAD_BRIDGE) < 6) return 4.6;
    return -6.5;
  }
  // the beach, the dunes behind it (lower by the town and the canal), the polder flat beyond
  const beach = 0.4 + Math.min(back, 35) * 0.1;
  const town = x > 120 && x < 520 && back < 300 ? 0.45 : 1;
  const dunes = (6 + fbm(noise, x * 0.01, 3.1, 2) * 4) * Math.exp(-(((back - 75) / 30) ** 2)) * town;
  const polder = 4.6 + fbm(noise, x * 0.004, z * 0.004, 3) * 0.8; // (well clear of the sea's swell: below ~3 m the water sheet shows through)
  const quay = Math.min(1, Math.min(Math.abs(x - CANAL[0]), Math.abs(x - CANAL[1])) / 6); // (the canal's quay walls)
  return (back < 120 ? Math.max(beach + dunes * smoothstep(20, 45, back), Math.min(polder, beach + back * 0.2)) : polder + dunes * 0.3) * (0.6 + 0.4 * quay);
}

/** The roads: along behind the dunes (the coast road), the road to Bruges inland, the town's streets, the Mole's railway. */
function onRoad(x: number, z: number) {
  const sz = shoreZ(x);
  if (Math.abs(z - (sz - 150)) < 3.5 && x > -760 && x < 760 && !(x > CANAL[0] && x < CANAL[1])) return true; // the coast road
  if (Math.abs(x - (60 + Math.sin(z * 0.004) * 30)) < 3.5 && z < sz - 150) return true;                         // the Bruges road
  if (Math.abs(x - 620) < 3 && z < 0 && z > sz - 150) return true;                                              // up from the viaduct
  return false;
}

const W = (x: number, z: number) => ({ x, z });
/** A barrier across the Mole at `t` along its segment `i` (MOLE_LINE): wire right across the deck, an MG nest behind it. */
function barrier(i: number, t: number) {
  const [ax, az] = MOLE_LINE[i], [bx, bz] = MOLE_LINE[i + 1], len = Math.hypot(bx - ax, bz - az);
  const tx = (bx - ax) / len, tz = (bz - az) / len, nx = tz, nz = -tx;            // along it (toward the head), and out to sea
  const cx = ax + (bx - ax) * t, cz = az + (bz - az) * t;
  const wireYaw = Math.atan2(-nz, nx);                                            // (a wire's length along its local x: across the Mole)
  return [
    ...[-22, -4, 5, 14, 22].map((o) => ({ kind: 'wire', x: cx + nx * o, z: cz + nz * o, yaw: wireYaw })), // (round the shed on the inner side: it closes that part)
    ...[-5, 8].map((o) => ({ kind: 'mgNest', x: cx + nx * o - tx * 10, z: cz + nz * o - tz * 10, yaw: Math.atan2(tx, tz) })), // (behind the wire toward the shore end, facing along the Mole to the head)
  ];
}
/** Where the Mole's sectors are (the storming ships come alongside there, step 2) and what each opens ashore. */
export const SECTORS = [
  { x: -170, name: 'Mole-head battery', at: W(-170, 461), inland: W(-5, -40) },   // (the canal entrance: on the east quay by the piers)
  { x: 120, name: 'Seaplane station', at: W(120, 455), inland: W(330, -170) },
  { x: 460, name: 'Mole sheds', at: W(470, 375), inland: W(620, -40) },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The raiding force', ...W(0, 880), owner: 'nato', sector: 'centre', radius: 90 },
  // the Mole (Landing: the sectors, open from the start; each opens what lies behind it ashore)
  { id: 'B', name: 'Mole-head battery', ...SECTORS[0].at, owner: null, sector: 'west', radius: 30, opens: 'E' },
  { id: 'C', name: 'Seaplane station', ...SECTORS[1].at, owner: null, sector: 'centre', radius: 32, opens: 'F' },
  { id: 'D', name: 'Mole sheds', ...SECTORS[2].at, owner: null, sector: 'east', radius: 32, opens: 'G' },
  // ashore
  { id: 'E', name: 'Canal entrance', ...SECTORS[0].inland, owner: null, sector: 'west', radius: 40 },
  { id: 'F', name: 'Zeebrugge', ...SECTORS[1].inland, owner: null, sector: 'centre', radius: 45 },
  { id: 'G', name: 'The viaduct', ...SECTORS[2].inland, owner: null, sector: 'east', radius: 35 },
  { id: 'K', name: 'The Bruges road', ...W(60, -880), owner: 'pact', sector: 'centre' },
];

export default {
  id: 'zeebrugge',
  name: 'Zeebrugge 1918',
  description: 'St George\'s Day, 1918, at night: the Royal Navy comes alongside the Mole to storm its batteries while blockships steam into the canal mouth to shut the U-boats in. The Mole, its viaduct, the harbour, the canal and the town behind the dunes.',
  epochs: ['1918'],
  theatre: 'coastal',
  modes: ['landing'],
  sides: { nato: 'Britain', pact: 'Germany' },
  armies: { nato: ['uk'], pact: ['de'] },
  conditions: { time: 'night', weather: 'clear' },
  // a light north-easterly off the sea at first — the smoke blows in over the Mole and hides the ships; then, as on the night,
  // the wind swings round to the south-west and blows the smoke back out to sea, leaving the ships in the searchlights
  wind: { from: 210, speed: 4, veer: 0.1, shift: { t: 240, from: 30, over: 60, /* (the game's compass: north is -z — here the land; the sea, +z, is its south) */ say: 'The wind has backed to the south-west — the smoke is blowing back out to sea!' } },
  size: SIZE,
  segments: 900,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 1000, near: 1, far: 7000 },
  seed: 1918,
  height,
  river: sea,
  fields: createFields({ seed: 1918, cell: 70 }),

  theme: {
    fogColor: 0xa4acb2, fogDensity: 0.00045,
    skyTop: 0x6a7c90, skyHorizon: 0xc6ccce, skyBottom: 0x8a969e,
    sunColor: 0xf6ead4, sunIntensity: 2.0, sunDisk: 0.3,
    clouds: 0.3, cloudLight: 0xd8dce0, cloudDark: 0x7a8690,
    sunDir: [0.45, 0.35, -0.8],
    hemiSky: 0xd0d8de, hemiGround: 0x7c7e6a, hemiIntensity: 1.4,
    rimColor: 0xd0d8e0, rimIntensity: 0.25,
    terrain: {
      grass: '#6c7c4a', grassAlt: '#76844e', dryGrass: '#9a9266', dirt: '#7a6e56', rock: '#9a968c',
      pasture: '#6a7a46', ploughed: '#7e705a', stubble: '#9a9060', meadow: '#74824c',
      farmX: [0, 1], farmZ: [0, 1], roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const m = moleAt(x, z);
        if (m) return [m.s.kind === 'viaduct' ? 0x4a4c4e : 0xaaa69c, 1];                                  // the Mole's granite and concrete, the viaduct's steel deck
        for (const px of PIERS.x) if (Math.abs(x - px) < PIERS.half && z > -5 && z < PIERS.to) return [0x6a5a44, 1]; // the piers' timber
        if (onRoad(x, z)) return [0x6e6a62, 0.85];
        const sz = shoreZ(x);
        if (z > sz + 3) return [y > -1 ? 0xb8ae8c : 0x8a8470, 1];                                      // the sand under the water
        if (z > sz - 45) return [0xd8ccaa, 1];                                                            // the beach
        if (z > sz - 130) return [0xc4b88e, 0.75];                                                        // the dunes' sand through the marram grass
        if (x > CANAL[0] - 8 && x < CANAL[1] + 8) return [0x7a766c, 1];                                   // the canal's quays
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 940, entries: SECTORS.map((s) => s.x) }, pact: { x: 60, z: -940, entries: [-300, 60, 400] } }, // (the British land: their ways in are the Mole's sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 100, z: 600 }, pact: { x: 200, z: -100 } },
  points,
  spawns: { nato: [], pact: [] },

  // the landing (systems/Landing.js): the storming ships come alongside the Mole's seaward wall (`alongside`) and
  // their parties go over the brows onto it — Vindictive with the Marines, the ferries Iris and Daffodil, then the
  // motor launches with what's bought
  landing: {
    launchZ: 850,
    wall,
    craft: { infantry: ['ml', 'ml', 'ferry'], vehicle: 'ferry' },
    signal: { t: 20, say: 'Vindictive is going in — the storming parties stand by the brows', sayOther: 'Ships out of the smoke — they are making for the Mole!' },
    waves: [
      { t: 0, units: [
        { unit: 'marines', sector: 1, craft: 'vindictive', dx: 0 }, { unit: 'marines', sector: 1, craft: 'ml' },
        { unit: 'sailors', sector: 0, craft: 'ferry', dx: 0 },        // (Iris)
        { unit: 'marines', sector: 2, craft: 'ferry', dx: 0 },        // (Daffodil)
        { unit: 'sailors', sector: 0, craft: 'ml' }, { unit: 'mgTeam', sector: 1, craft: 'ml' },
      ] },
      { t: 150, say: 'The motor launches are coming in with more of the storming parties', units: [{ unit: 'sailors', sector: 2, craft: 'ml' }, { unit: 'marines', sector: 0, craft: 'ml' }, { unit: 'mortar', sector: 1, craft: 'ml' }] },
    ],
    ai: { order: ['marines', 'sailors', 'mgTeam', 'marines', 'sailors', 'mortar', 'marines', 'sniper', 'sailors', 'mgTeam'], gunship: 'destroyer', gunships: 1, heavy: null, inshore: 400 },
    // the Marinekorps Flandern: the Mole's garrison behind its wire, the town's and the canal's
    defence: ['rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mgTeam', 'rifles', 'mortar', 'rifles', 'artillery', 'rifles', 'mgTeam'],
    names: { rifles: 'Matrosen-Infanterie', mgTeam: 'Marine-MG-Trupp' },
    // the guns: the battery on the Mole's head over the harbour mouth, the heavy coastal batteries behind the dunes; the torpedo boats lying in the harbour
    forts: [
      { unit: 'moleBattery', x: -205, z: 457, facing: 0 },
      { unit: 'coastBattery', x: -440, z: -72, facing: 0 }, { unit: 'coastBattery', x: 720, z: -72, facing: 0 }, // (up on the dunes' crest: from behind them they'd see nothing of the sea)
      { unit: 'destroyer', x: 324, z: 391, facing: -1.33 }, { unit: 'destroyer', x: 68, z: 430, facing: -1.51 }, // (moored alongside the Mole's inner quay, as S 53 and V 69 lay that night)
    ],
    works: [...barrier(3, 0.75), ...barrier(2, 0.45), ...barrier(0, 0.6)],
    // the blockships (systems/Blockships.js): in from the west after the Mole is stormed, round its head under the battery,
    // across the harbour into the canal mouth between the piers; two sunk there shut the canal (the landing's victory)
    blockships: {
      t: 150, need: 2,
      ships: [{ x: -620, z: 900, name: 'Thetis' }, { x: -680, z: 950, name: 'Intrepid' }, { x: -740, z: 900, name: 'Iphigenia' }],
      zone: { x0: PIERS.x[0], x1: PIERS.x[1], z0: -40, z1: PIERS.to },
      scuttleZ: 120, // (the computer's: well between the piers before she goes down)
      route: [{ x: -520, z: 560 }, { x: -420, z: 360 }, { x: -70, z: 340 }, { x: -70, z: 240 }, { x: -70, z: 150 }, { x: -70, z: 90 }], // (lined up over the channel, then straight in between the piers)
    },
    hold: [...SECTORS.map((s) => s.at), ...SECTORS.map((s) => s.inland)],
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.4 },
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1918);
    sea.build(scene, terrain);
    const STONE = 0xb0aca2, DARK = 0x3a3c3e, TIMBER = 0x5a4a36, SHED = 0x6a5a4c, ROOF = 0x4a4c4e;

    // ---- the Mole: the parapet along its seaward edge (cover for the storming parties), the sheds and the station inside
    for (const s of SEGS) {
      const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az);
      const nx = (bz - az) / len, nz = -(bx - ax) / len; // (seaward: the right of a→b — the Mole runs west, the harbour on its left)
      if (s.kind === 'viaduct') { // the open steel viaduct: lattice girders either side, the piles down into the water
        for (const side of [-1, 1]) {
          props.box('plain', (ax + bx) / 2 + nx * side * 3.6, s.deck + 1.1, (az + bz) / 2 + nz * side * 3.6, 0.4, 2.2, len, yaw, DARK);
          for (let t = 0; t <= len; t += 8) {
            const x = ax + (bx - ax) * (t / len) + nx * side * 3.6, z = az + (bz - az) * (t / len) + nz * side * 3.6;
            props.box('plain', x, s.deck / 2 - 3, z, 0.5, s.deck + 6, 0.5, yaw, DARK);                       // a pile
            props.box('plain', x, s.deck + 1.1, z, 0.2, 2.2, 0.2, yaw + 0.6, DARK);                          // a diagonal of the lattice
          }
        }
        continue;
      }
      const wallOff = s.half + LEDGE - 1.6, high = s.kind === 'mole' ? 5 : 3.2; // (along the deck's edge)
      for (let t = 0; t < len; t += 20) {
        const k = (t + Math.min(10, (len - t) / 2)) / len, seg = Math.min(20, len - t);
        const x = ax + (bx - ax) * k + nx * wallOff, z = az + (bz - az) * k + nz * wallOff;
        props.box('stone', x, s.deck + high / 2, z, 3, high, seg + 0.4, yaw, STONE);                             // the parapet
        props.box('stone', x - nx * 2.2, s.deck + high - 1.6, z - nz * 2.2, 1.6, 0.3, seg + 0.4, yaw, 0x7e7a72); // the walkway along its inner face
        props.cover.addBox({ x, z, yaw: yaw + Math.PI / 2, length: seg, thickness: 3, height: high, spots: -1 }); // (its length along the wall; cover on its inner face only — outside is the sea)
      }
      if (s.kind !== 'mole') continue;
      // the railway along the Mole, the sheds on its inner half
      props.box('plain', (ax + bx) / 2 - nx * 4, s.deck + 0.1, (az + bz) / 2 - nz * 4, 2.2, 0.15, len, yaw, 0x3a3630);
      for (let t = 18; t < len - 18; t += 44) {
        const k = t / len, x = ax + (bx - ax) * k - nx * 13, z = az + (bz - az) * k - nz * 13;
        if (r() < 0.75) props.hall({ x, z, yaw, width: 9, depth: 30, height: 6, color: SHED, roof: ROOF, door: 4, name: 'Mole shed' });
      }
    }
    // the railway station on the Mole and the seaplane station: hangars with their slipway into the harbour
    props.hall({ x: 350, z: 405, yaw: 1.3, width: 12, depth: 40, height: 7, color: 0x7a6a58, roof: ROOF, door: 5, name: 'Mole station' });
    for (const dx of [-40, 0, 40]) props.hall({ x: 120 + dx, z: 438, yaw: Math.PI / 2 + 0.07, width: 22, depth: 18, height: 9, color: 0x6e6e66, roof: ROOF, door: 14, name: 'seaplane hangar' });
    props.box('plain', 120, 1.5, 404, 30, 3, 26, 0.07, 0x6a6660);                                               // the slipway
    // the lighthouse at the Mole's head, the battery's gun pits along the extension
    props.tower({ x: LIGHT.x, z: LIGHT.z, concrete: true });
    for (const t of [0.25, 0.5, 0.75]) { const x = -60 + (-265 + 60) * t, z = 470 + (452 - 470) * t; props.sandbagRing({ x, z, radius: 3.5, toward: 1 }); }

    // ---- the canal: the piers' piles, the lock gates and their bridge, the road bridge
    for (const px of PIERS.x) for (let z = 0; z < PIERS.to; z += 9) for (const s of [-1, 1]) props.box('plain', px + s * 2.6, 0, z, 0.4, 8, 0.4, 0, TIMBER);
    for (const dz of [-8, 8]) props.box('plain', (CANAL[0] + CANAL[1]) / 2, 1.5, LOCK + dz, CANAL[1] - CANAL[0], 7, 1.2, 0, 0x4a4036); // the lock gates
    props.hall({ x: CANAL[1] + 18, z: LOCK, yaw: 0, width: 10, depth: 8, height: 5, color: 0x8a7a64, roof: 0x5a3a2a, door: 2, name: 'lock house' });
    props.box('plain', (CANAL[0] + CANAL[1]) / 2, 3.2, ROAD_BRIDGE, CANAL[1] - CANAL[0] + 6, 0.6, 12, 0, DARK);         // the road bridge's girders

    // ---- Zeebrugge: the brick town behind the dunes, its church; the harbour offices by the canal
    for (let i = 0; i < 70; i++) {
      const x = 150 + r() * 360, z = shoreZ(x) - 150 - 10 - r() * 210;
      if (onRoad(x, z) || onRoad(x + 6, z) || onRoad(x - 6, z) || Math.hypot(x - 330, z + 170) < 30) continue; // (the streets; the square round the point)
      props.townHouse({ x, z, yaw: (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.1, width: 7 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.3 ? 3 : 2, damaged: 0.1 });
    }
    props.church({ x: 330, z: -230, yaw: 0 });
    for (const [x, z] of [[75, -70], [-190, -60], [25, -120]] as [number, number][]) props.hall({ x, z, yaw: 0, width: 26, depth: 14, height: 8, color: 0x7a5e4a, roof: ROOF, door: 6, name: 'harbour office' });
    commandPost(props, this.bases.pact, 1, 0x6a6e52);
    props.finish();

    const land = (x: number, z: number) => z < shoreZ(x) - 60 && !(x > CANAL[0] - 10 && x < CANAL[1] + 10) && !(x > 140 && x < 520 && z > -420);
    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), { test: (x: number, z: number) => onRoad(x, z) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, lane: 0, count: 260, broadleaf: 0.7, autumn: 0, maxY: 30,
      avoid: [...avoid, { test: (x: number, z: number) => !land(x, z) || z > shoreZ(x) - 140 }],
      forest: (x: number, z: number) => smoothstep(0.35, 0.6, fbm(noise, x * 0.006 + 4, z * 0.006, 2)) * 0.5 }); // (the poplars and willows of the polder)
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.4, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => z > shoreZ(x) - 30 || !!moleAt(x, z) || (x > CANAL[0] - 8 && x < CANAL[1] + 8) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
