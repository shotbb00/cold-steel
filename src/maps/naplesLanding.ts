// Naples, November 1805 (coastal, the 1806 epoch: the British and the Russians land, the French hold; 1.0 × 1.8 km).
// On 20 November 1805 Lacy's Russians from Corfu and Craig's British from Malta came ashore at Naples and Castellammare
// to bring the Bourbon kingdom into the Coalition; they never met the French — after Austerlitz they sailed away again
// and Joseph's army marched in. Here they land against it: the city as Lowe's men saw it from Capri, the bay shore from
// the Posillipo point in the west along the Chiaia beach and the Villa Reale's gardens, Castel dell'Ovo on its islet at
// the end of the causeway under Pizzofalcone, the Santa Lucia strand, Castel Nuovo and the Molo Grande, and the
// Marinella beach east of the port toward the Carmine and the Piazza del Mercato. Behind the city the Vomero rises to
// Castel Sant'Elmo, where the French come from; Vesuvius stands off to the east beyond the Maddalena. On the map the
// bay is the -z side (the lander comes from the sea).
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
const noise = createNoise2D(1805_1120);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6484 }); // (the bay in November, grey-blue)

/** The waterline (world z; the bay toward -z): the Posillipo point out to sea on the west, a straight city shore. */
export const shoreZ = (x: number) => -170 - 110 * smoothstep(-430, -560, x) + fbm(noise, x * 0.004, 2.1, 2) * 8;
/** Castel dell'Ovo's islet (Megaride) and its causeway; the Molo Grande. */
const OVO = { x: -110, z: -250 };
const segD = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const islet = (x: number, z: number) => Math.min(Math.hypot((x - OVO.x) / 1.3, z - OVO.z) - 26, segD(x, z, OVO.x, OVO.z + 20, OVO.x, -160) - 5);
const moleD = (x: number, z: number) => segD(x, z, 190, -165, 220, -285);
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);
/** The sand: Chiaia, the Santa Lucia strand, the Marinella; elsewhere the quays and the rocks. */
const sandAt = (x: number) => (x > -420 && x < -180) || (x > -10 && x < 95) || x > 250;

const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
const ELMO = { x: -200, z: 690 };
const VESUVIUS = { x: 960, z: 480 };

function height(x: number, z: number) {
  const d = inland(x, z), md = moleD(x, z), il = islet(x, z);
  if (d < 0) {
    if (il < 0) return 3.2;                                                   // Megaride and the causeway
    if (md < 6) return 2.4;                                                   // the Molo Grande
    const s = -d, bar = sandAt(x) ? 0.5 * Math.exp(-(((s - 45) / 14) ** 2)) : 0;
    let bed = Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16);
    if (!sandAt(x)) bed -= 1.2 * smoothstep(0, 10, s);                       // (the quay walls drop straight into deep water)
    return Math.max(bed, 3.2 - il * 1.2, 2.4 - (md - 6) * 1.5);
  }
  const rocky = sandAt(x) ? 0 : 1;
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  let land = 2.6 + smoothstep(60, 400, d) * 8 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.5
    + smoothstep(380, 820, d) * 46 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.25) * (1 - 0.45 * smoothstep(0, 450, x))  // the Vomero, lower toward the east
    + hill(x, z, ELMO.x, ELMO.z, 170, 16)                                                                                            // Sant'Elmo's crest
    + hill(x, z, -100, -70, 55, 20)                                                                                                  // Pizzofalcone (Monte Echia)
    + hill(x, z, -540, 0, 220, 55);                                                                                                  // Posillipo
  let h = Math.max(beach, Math.min(land, beach + d * 0.3));
  if (rocky) h = Math.max(h, 2.8 * smoothstep(0, 4, d));                                                                            // the quays
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, -x) * 30 * smoothstep(60, 200, d);
  const rv = Math.hypot(x - VESUVIUS.x, z - VESUVIUS.z);                                                                            // Vesuvius, off the east edge
  if (rv < 470) h += 200 * Math.pow(1 - rv / 470, 1.25) - 30 * smoothstep(60, 20, rv);
  return h;
}

function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 35 && sandAt(x)) return foot ? 0.85 : 0.6;
  return 1;
}

/** The streets: the Riviera di Chiaia and the Strada Marina along the shore, Toledo up from the Palace, the Mercato up the east, the ramps to Sant'Elmo. */
const ROADS: number[][] = [
  [-520, -90, -300, -110], [-300, -110, -160, -100], [-160, -100, -60, 20], [-60, 20, 30, 180],
  [30, 180, 120, -90], [120, -90, 300, -110], [300, -110, 520, -100],
  [30, 180, 20, 450], [20, 450, -90, 600], [-90, 600, -120, 700], [-120, 700, 0, 900],
  [-310, 120, -300, -110], [-310, 120, 30, 180], [-310, 120, -250, 450], [-250, 450, -90, 600],
  [360, 230, 370, -105], [360, 230, 30, 180], [360, 230, 260, 520], [260, 520, -120, 700],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => segD(x, z, ax, az, bx, bz)));

export const SECTORS = [
  { x: -300, name: 'Chiaia beach', inland: { name: 'Chiaia', x: -310, z: 120 } },
  { x: 40, name: 'Santa Lucia', inland: { name: 'Largo di Palazzo', x: 30, z: 180 } },
  { x: 370, name: 'The Marinella', inland: { name: 'Piazza del Mercato', x: 360, z: 230 } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The fleet off Posillipo', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 44, owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 42, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: SECTORS[0].inland.name, x: -310, z: 120, owner: null, sector: 'west' },
  { id: 'F', name: SECTORS[1].inland.name, x: 30, z: 180, owner: null, sector: 'centre' },
  { id: 'G', name: SECTORS[2].inland.name, x: 360, z: 230, owner: null, sector: 'east' },
  { id: 'K', name: 'The Vomero below Sant’Elmo', x: -120, z: 700, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const NUOVO = { x: 150, z: -60 };                                     // Castel Nuovo (the Maschio Angioino)
const VILLA = (x: number, z: number) => x > -430 && x < -170 && inland(x, z) > 36 && inland(x, z) < 110; // the Villa Reale's gardens along the Chiaia shore
const inCity = (x: number, z: number) => x > -440 && x < 470 && inland(x, z) > 22 && z < 480 - 0.25 * x && !VILLA(x, z) && Math.hypot(x - NUOVO.x, z - NUOVO.z) > 40;

/** The Villa Reale's holm oaks, the Vomero's vineyards and gardens, Posillipo's pines (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 40 || Math.hypot(x - VESUVIUS.x, z - VESUVIUS.z) < 320) return 0;
  let k = VILLA(x, z) ? 0.6 : inCity(x, z) ? 0 : smoothstep(0.42, 0.62, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.35 + 0.5 * smoothstep(300, 600, d));
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'naples-landing',
  name: 'Naples 1805',
  description: 'Naples, November 1805: the Anglo-Russian army that landed to save the Bourbon kingdom comes ashore against the French. The Chiaia beach, Castel dell’Ovo on its islet, Santa Lucia, Castel Nuovo and the port, the Marinella; Sant’Elmo above the city and Vesuvius to the east.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb', 'ru'] }, // (Craig's British and Lacy's Russians; the map names gb so it fields in Italy — GameEngine armiesOn)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 200, speed: 4, veer: 0.15 }, // (the scirocco up the bay)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1805_1121,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_11, cell: 60, weights: [0.3, 0.3, 0.25, 0.15] }),

  theme: {
    fogColor: 0xc8ccc8, fogDensity: 0.0005,
    skyTop: 0x6688b8, skyHorizon: 0xd4d6d2, skyBottom: 0x9c9c8c,
    sunColor: 0xfff0d8, sunIntensity: 1.8, sunDisk: 0.5,
    clouds: 0.35, cloudLight: 0xf2f2ee, cloudDark: 0xb8bab8,
    sunDir: [-0.3, 0.6, -0.6],
    hemiSky: 0xcad6e2, hemiGround: 0x7e7458, hemiIntensity: 1.15,
    rimColor: 0xf0e6d0, rimIntensity: 0.3,
    terrain: {
      grass: '#7e8448', grassAlt: '#747a42', dryGrass: '#a89c66', dirt: '#7e6a52', rock: '#6e6660',
      pasture: '#8a8e54', ploughed: '#7e6448', stubble: '#b4a470', meadow: '#748444',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (islet(x, z) < 1 || moleD(x, z) < 7) return [0xb4aa96, 0.95];
        if (d < 0) return [y > -1.2 ? 0xc8bc9c : 0x7e8478, 1];
        if (Math.hypot(x - VESUVIUS.x, z - VESUVIUS.z) < 420) return [y > 90 ? 0x4a4440 : 0x5e5648, 0.9];   // ash and old lava
        if (!sandAt(x) && d < 14) return [0xa49c8c, 0.9];                                // the quays
        if (d < 32) return [0xb8aa8a, 1];                                                 // the dark volcanic sand
        if (roadDist(x, z) < 4) return [0x9a9080, 0.85];                                  // the lava paving
        if (inCity(x, z)) return [0xa89c86, 0.7];
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 0, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -140 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.2,
    signal: { t: 25, say: 'The signal from the flagship — the boats pull for the Chiaia and the Marinella', sayOther: 'The bay is full of boats: the English and the Russians are coming ashore' },
    navy: ['frigate', 'destroyer'],
    // the castles' guns: Castel dell'Ovo on its islet, Castel Nuovo over the port; field guns by the Carmine
    forts: [
      { unit: 'shoreBattery', x: OVO.x + 18, z: OVO.z - 8, facing: Math.PI },
      { unit: 'shoreBattery', x: NUOVO.x - 10, z: NUOVO.z - 42, facing: Math.PI },
      { unit: 'artillery', x: 300, z: shoreZ(300) + 95, facing: Math.PI },
    ],
    works: [
      ...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 60, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-40, -26, -13, 13, 26, 40].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 34, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    counter: { t: 160, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'The columns from Sant’Elmo are coming down Toledo — into the sea with them!', sayOther: 'French columns coming down from the Vomero — hold the squares!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 60 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 1000, defenceIncome: 1.3 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'guard', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches bring in the guns and the seamen to drag them', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'Lacy’s Russians are coming ashore at the Marinella', units: [{ unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1805_1122);
    sea.build(scene, terrain);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const STONE = 0xc4b89c, TUFA = 0xb8a07a, PIPERNO = 0x6a6660;
    const solid = (x: number, z: number, len: number, thick: number, hgt: number, yaw: number, col: number) => {
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + hgt / 2 - 1.5, z, len, hgt + 3, thick, yaw, col);
      props.cover.addBox({ x, z, yaw, length: len, thickness: thick, height: hgt });
    };
    const taken: number[][] = [];

    // ---- Castel dell'Ovo: the long block on Megaride, its bastion toward the sea
    solid(OVO.x, OVO.z + 4, 26, 18, 10, 0, STONE); solid(OVO.x - 4, OVO.z - 16, 14, 10, 7, 0.4, STONE); solid(OVO.x + 12, OVO.z + 14, 10, 8, 14, 0, STONE);
    // ---- Castel Nuovo: the square of grey piperno with its round towers
    const H = 20;
    for (const [dz, yaw] of [[-H, 0], [H, 0]] as const) solid(NUOVO.x, NUOVO.z + dz, 2 * H, 3, 12, yaw, PIPERNO);
    for (const dx of [-H, H]) solid(NUOVO.x + dx, NUOVO.z, 2 * H, 3, 12, Math.PI / 2, PIPERNO);
    for (const [dx, dz] of [[-H, -H], [H, -H], [-H, H], [H, H], [0, -H]] as const) for (const a of [0, Math.PI / 4]) solid(NUOVO.x + dx, NUOVO.z + dz, 9, 9, 17, a, PIPERNO);
    { const g = terrain.heightAt(NUOVO.x, NUOVO.z - H); props.box('stone', NUOVO.x, g + 8, NUOVO.z - H - 1.6, 5, 9, 0.8, 0, 0xe8e2d4); } // (the white marble triumphal arch)
    // ---- the Molo Grande's lantern; ships at the quays
    { const g = 2.4; props.box('stone', 218, g + 9, -280, 5, 18, 5, 0, 0xe0d8c4); props.box('plain', 218, g + 19, -280, 3.4, 2.4, 3.4, 0, 0xf4e8b0); }
    for (const [x0, z0, len] of [[235, -200, 22], [255, -230, 18], [160, -190, 16]] as const) {
      props.box('plain', x0, 0.5, z0, 5, 2, len, 0.1, 0x5a4432);
      props.box('plain', x0, 8, z0, 0.45, 14, 0.45, 0, 0x4a3a2a);
    }
    // ---- the Royal Palace on the Largo, San Francesco di Paola facing it, the Carmine by the Mercato
    props.rand = mulberry32(1805_1123);
    props.townHouse({ x: P.F.x + 62, z: P.F.z - 30, yaw: Math.PI / 2, width: 60, depth: 18, storeys: 3, name: 'the Royal Palace', damaged: 0 });
    props.church({ x: P.F.x - 50, z: P.F.z - 10, yaw: Math.PI / 2 });
    props.church({ x: P.G.x + 36, z: P.G.z - 34, yaw: 0 });
    props.church({ x: P.E.x + 42, z: P.E.z + 30, yaw: 0 });
    { const g = terrain.heightAt(P.G.x + 36, P.G.z - 54); props.box('stone', P.G.x + 36, g + 18, P.G.z - 54, 6, 36, 6, 0, 0xd8ccb0); } // (the Carmine's bell tower)
    taken.push([P.F.x + 62, P.F.z - 30], [P.F.x + 62, P.F.z - 5], [P.F.x + 62, P.F.z - 55], [P.F.x - 50, P.F.z - 10], [P.G.x + 36, P.G.z - 34], [P.G.x + 36, P.G.z - 54], [P.E.x + 42, P.E.z + 30]);
    // ---- the city: tall tufa-and-stucco houses packed between the streets
    for (let i = 0, n = 0; i < 6000 && n < 130; i++) {
      const x = -440 + r() * 910, z = -120 + r() * 600;
      if (!inCity(x, z) || roadDist(x, z) < 10 || near(x, z, 24) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: (r() < 0.5 ? Math.PI / 2 : 0) + (r() - 0.5) * 0.12, width: 8 + r() * 3, depth: 9 + r() * 2, storeys: r() < 0.6 ? 4 : 3, damaged: 0 });
    }
    // ---- Castel Sant'Elmo: the six-pointed star on the Vomero, west of the French camp
    props.rand = mulberry32(1805_1124);
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, b = a + Math.PI / 6, R = 38, r2 = 24;
      const [px, pz] = [ELMO.x + Math.cos(a) * R, ELMO.z + Math.sin(a) * R], [qx, qz] = [ELMO.x + Math.cos(b) * r2, ELMO.z + Math.sin(b) * r2], [sx, sz] = [ELMO.x + Math.cos(a + Math.PI / 3) * R, ELMO.z + Math.sin(a + Math.PI / 3) * R];
      for (const [x0, z0, x1, z1] of [[px, pz, qx, qz], [qx, qz, sx, sz]]) solid((x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0) + 2, 3.5, 10, -Math.atan2(z1 - z0, x1 - x0), TUFA);
    }
    solid(ELMO.x, ELMO.z, 16, 12, 8, 0.2, TUFA);
    // ---- villas and farms on the Vomero
    for (let i = 0, n = 0; i < 500 && n < 16; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 300 + r() * 500;
      if (inCity(x, z) || roadDist(x, z) < 14 || near(x, z, 60) || Math.hypot(x - ELMO.x, z - ELMO.z) < 60) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.house({ x, z, yaw: r() * Math.PI, width: 9 + r() * 4, depth: 7 });
      if (r() < 0.6) props.lowWall({ x: x + 10, z: z + 6, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.4, color: 0xa89470 });
    }
    for (let i = 0; i < 5; i++) props.box('plain', 300 + i * 9, terrain.heightAt(300 + i * 9, shoreZ(300) + 18) + 0.4, shoreZ(300 + i * 9) + 18, 1.6, 0.6, 5, 0.3, 0x5a4434); // (the fishermen's boats on the Marinella)
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: ELMO.x, z: ELMO.z, r: 44 }, { x: NUOVO.x, z: NUOVO.z, r: 32 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || inland(x, z) < 40 || inCity(x, z) }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2200, broadleaf: 0.6, autumn: 0.2, maxY: 120,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 34 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
