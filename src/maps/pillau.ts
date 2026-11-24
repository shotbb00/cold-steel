// Pillau, 1807 (hypothetical; coastal, the 1806 epoch: the Prussians and Russians land, the French hold; 1.0 × 1.8 km).
// Pillau was the allies’ port all through the Polish winter of 1807 — Bennigsen’s supplies and Kamensky’s relief for
// Danzig sailed from it — and the citadel never fell: after Friedland the war ended at Tilsit before the French came
// to it. On this map the French have taken it and the Prussians and Russians come back from the sea.
// On the map the Baltic is the -z side (the landing comes from the sea): Neuhäuser’s strand and the pines of the
// Samland heath to the west, the lighthouse on its dune above the beach below the town, the two moles of the Seetief
// — the channel into the Frisches Haff — in the east, with the bare tip of the Nehrung across it. Inland the little
// garrison town of Pillau round its church, and on the Haff shore the Swedish-built citadel: a five-bastioned star
// in its wet moat, a causeway to its west and north gates. The French come from the Fischhausen road in the south.
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1807_0610);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a6672 }); // (the grey-green Baltic; the Haff browner, the same water)

/** The waterline (world z; the Baltic toward -z). */
export const shoreZ = (x: number) => -170 + 0.00005 * (x + 100) ** 2 + fbm(noise, x * 0.004, 2.1, 2) * 9;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Seetief (the channel into the Haff, x ≈ 410) and the Haff itself (east of hX, south of the channel’s inner end). */
const TIEF = { x: 410, half: 28, z1: 300 };
const hX = (z: number) => 335 - 70 * smoothstep(300, 800, z) + 10 * Math.sin(z * 0.02) + 165 * smoothstep(340, 200, z) + 500 * smoothstep(200, -150, z); // (the Haff shore curving out to the channel’s inner end: the Nehrung’s tip)
/** Signed distance to the channel and Haff water (< 0 in it). */
const water = (x: number, z: number) => Math.min(z < TIEF.z1 ? Math.abs(x - TIEF.x) - TIEF.half : 1e9, hX(z) - x);

/** The citadel: a five-bastioned star in a wet moat, causeways to the west and north gates. */
const CIT = { x: 215, z: 440 };
const MOAT = 60;
const causeway = (x: number, z: number) => (Math.abs(z - CIT.z) < 7 && x < CIT.x) || (Math.abs(x - CIT.x) < 7 && z < CIT.z);
const moat = (x: number, z: number) => Math.abs(Math.hypot(x - CIT.x, z - CIT.z) - MOAT) - 5;

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: a bar where the surf breaks, then shelving away
    const s = -d, bar = 0.5 * Math.exp(-(((s - 40) / 14) ** 2));
    const sh = Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16), w = water(x, z);
    return w < 16 ? sh + (Math.min(sh, -2.6) - sh) * smoothstep(14, -4, w) : sh; // (the channel dredged out through the bar)
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const dunes = (3 + fbm(noise, x * 0.012, 3.7, 2) * 2) * Math.exp(-(((d - 55) / 18) ** 2));
  // the low sandy ground of the town, the Samland heath rising a little to the west and south
  const land = 2.4 + smoothstep(60, 260, d) * 1.2 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.4
    + smoothstep(0, -500, x) * 5 * smoothstep(100, 400, d) + smoothstep(450, 860, d) * 5;
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, -x) * 14 * smoothstep(60, 200, d);
  // the lighthouse dune
  h += 6 * Math.exp(-((x - LIGHT.x) ** 2 + (z - LIGHT.z) ** 2) / 900);
  // the Seetief and the Haff: deep water, a sandy shelf at the edge
  const w = water(x, z);
  if (w < 16) h += (Math.min(h, -2.6) - h) * smoothstep(14, -4, w);
  // the citadel’s wet moat (the causeways cross it)
  const m = moat(x, z);
  if (m < 4 && !causeway(x, z)) h += (Math.min(h, -1.6) - h) * smoothstep(4, 0, m);
  return h;
}

/** Soft going: the beach sand. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 35) return foot ? 0.85 : 0.6;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -330, name: 'Neuhäuser strand', inland: { name: 'Neuhäuser', x: -360, z: 170 } },
  { x: 20, name: 'The lighthouse', inland: { name: 'Pillau', x: 20, z: 240 } },
  { x: 290, name: 'The Seetief moles', inland: { name: 'The citadel', x: CIT.x, z: CIT.z } },
];
const LIGHT = { x: 75, z: shoreZ(75) + 70 };
const TOWN = { x: 20, z: 240 };
const CAMP = { x: -80, z: 720 };

/** The tracks: the coast lane behind the dunes, the town’s main street, the citadel causeways, the Fischhausen road. */
const ROADS: number[][] = [
  [-520, -70, -330, -65], [-330, -65, 20, -55], [20, -55, 300, -50], [300, -50, 370, -40],
  [-330, -65, -360, 170], [-360, 170, -300, 480], [-300, 480, CAMP.x, CAMP.z],
  [20, -55, TOWN.x, TOWN.z], [TOWN.x, TOWN.z, CIT.x - MOAT - 20, CIT.z], [CIT.x - MOAT - 20, CIT.z, CIT.x - 30, CIT.z],
  [300, -50, CIT.x, CIT.z - MOAT - 20], [CIT.x, CIT.z - MOAT - 20, CIT.x, CIT.z - 30],
  [-360, 170, TOWN.x, TOWN.z], [TOWN.x, TOWN.z, CAMP.x, CAMP.z], [CAMP.x, CAMP.z, -100, 900], [CIT.x - MOAT - 20, CIT.z, CAMP.x, CAMP.z],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'The squadron off Pillau', x: -60, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 48, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 42, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Neuhäuser', x: SECTORS[0].inland.x, z: SECTORS[0].inland.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Pillau', x: TOWN.x, z: TOWN.z, owner: null, sector: 'centre' },
  { id: 'G', name: 'The citadel', x: CIT.x, z: CIT.z, owner: null, sector: 'east', radius: 45 },
  { id: 'K', name: 'The Fischhausen road', x: CAMP.x, z: CAMP.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));

/** The pines of the Samland heath (west and south), a few on the Nehrung tip, the glacis and town kept clear (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 75 || water(x, z) < 12) return 0;
  let k = smoothstep(0.38, 0.58, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.3 + 0.6 * smoothstep(-50, -350, x));
  k = Math.min(k, smoothstep(MOAT + 30, MOAT + 80, Math.hypot(x - CIT.x, z - CIT.z)), smoothstep(110, 160, Math.hypot(x - TOWN.x, z - TOWN.z)));
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'pillau',
  name: 'Pillau 1807',
  description: 'East Prussia, 1807 (hypothetical): the Prussians and Russians land to take back Pillau, the port at the mouth of the Frisches Haff. Neuhäuser’s strand, the lighthouse above the beach, the moles of the Seetief, the garrison town and the star-shaped citadel in its moat on the Haff shore.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'east',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Prussia' },
  armies: { nato: ['fr'], pact: ['pr', 'ru'] }, // (L’Estocq’s Prussians with Russians; the French who would have come up from Königsberg)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' }, // (a bright, windy northern June)
  wind: { from: 290, speed: 5, veer: 0.15 }, // (a westerly off the open Baltic)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1807_0610,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1807_6, cell: 70, weights: [0.35, 0.3, 0.2, 0.15] }), // June: green rye, hay meadows by the Haff

  theme: {
    // a clear northern June: high pale sky, a breeze, long light off the sea
    fogColor: 0xbcc8d0, fogDensity: 0.0006,
    skyTop: 0x5a80b0, skyHorizon: 0xcad6de, skyBottom: 0x7e8a80,
    sunColor: 0xfff4e0, sunIntensity: 1.9, sunDisk: 0.45,
    clouds: 0.35, cloudLight: 0xf0f2f4, cloudDark: 0x9aa4ae,
    sunDir: [0.4, 0.6, 0.65],
    hemiSky: 0xc8d4e0, hemiGround: 0x50563a, hemiIntensity: 1.3,
    rimColor: 0xd0dae2, rimIntensity: 0.25,
    terrain: {
      grass: '#627442', grassAlt: '#56683a', dryGrass: '#8e885a', dirt: '#5e4e3a', rock: '#706c64',
      pasture: '#66783e', ploughed: '#604e3a', stubble: '#8e845a', meadow: '#5e7e3e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0 || water(x, z) < 0) return [y > -1.2 ? 0xc8bea0 : 0x76807a, 1];       // the sand under the water
        if (d < 32) return [0xdcd2b2, 1];                                              // the beach
        if (water(x, z) < 5) return [0xc0b494, 0.8];                                   // the channel’s and the Haff’s sandy edge
        if (roadDist(x, z) < 3) return [0x8e7c62, 0.8];                                // the sandy tracks
        if (d < 80) return [0xc4bc98, 0.6];                                            // the dunes’ loose sand and marram
        return null;
      },
    },
  },

  bases: { nato: { x: -60, z: 830, entries: [-320, -100, 120] }, pact: { x: -60, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the allies land: their roads are the beach sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -140 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the transports’ boats: the foot in flatboats, the guns in the launches
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.3, // (a fresh westerly: a surf on the bar)
    signal: { t: 25, say: 'The boats are away — pull for the strand under the lighthouse', sayOther: 'Boats coming in under the lighthouse: they are landing!' },
    // the escort closes in to cover the boats
    navy: ['frigate', 'destroyer'],
    // the French on the coast: the guns on the moles, a battery by the lighthouse, field guns on the Neuhäuser dunes
    forts: [
      { unit: 'shoreBattery', x: 345, z: shoreZ(345) + 40, facing: Math.PI },
      { unit: 'shoreBattery', x: LIGHT.x + 40, z: LIGHT.z + 10, facing: Math.PI },
      { unit: 'artillery', x: -260, z: shoreZ(-260) + 95, facing: Math.PI },
    ],
    // entrenchments behind the dunes, felled trees along the back of the sand
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 66, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 34, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Chasseurs à cheval' },
    counter: { t: 160, units: ['rifles', 'atTeam', 'reconVehicle', 'ifv', 'artillery'], say: 'The division from Königsberg is up the Fischhausen road — drive them into the sea!', sayOther: 'French columns on the Fischhausen road — hold the town!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 66 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'atTeam', 'artillery', 'rifles', 'sniper', 'mgTeam', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 650, defenceIncome: 0.8 },
    waves: [
      // the first wave: fusiliers and grenadiers, the jägers on the flanks
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'atTeam', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'sniper', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'The second brigade is coming ashore', units: [{ unit: 'atTeam', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1807_0611);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && water(x, z) > 8 + rr && inland(x, z) > 80 + rr && moat(x, z) > 8 + rr;
    /** A wall from (x0, z0) to (x1, z1). */
    const wallSeg = (x0: number, z0: number, x1: number, z1: number, h: number, t = 1.2) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height: h, thickness: t });

    // ---- the citadel: five bastions, the gates west (to the town) and north (to the moles); the barracks inside, off the centre
    {
      const pts: number[][] = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.PI / 2, dd = k % 2 ? 30 : 47; pts.push([CIT.x + Math.cos(a) * dd, CIT.z + Math.sin(a) * dd]); }
      for (let k = 0; k < 10; k++) {
        const [x0, z0] = pts[k], [x1, z1] = pts[(k + 1) % 10], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        if (Math.abs(mz - CIT.z) < 22 && mx < CIT.x) { // (the west gate: two stubs and a gap)
          const tx = x1 - x0, tz = z1 - z0, L = Math.hypot(tx, tz), ux = tx / L, uz = tz / L;
          wallSeg(x0, z0, mx - ux * 8, mz - uz * 8, 3.4); wallSeg(mx + ux * 8, mz + uz * 8, x1, z1, 3.4); continue;
        }
        if (Math.abs(mx - CIT.x) < 22 && mz < CIT.z) {
          const tx = x1 - x0, tz = z1 - z0, L = Math.hypot(tx, tz), ux = tx / L, uz = tz / L;
          wallSeg(x0, z0, mx - ux * 8, mz - uz * 8, 3.4); wallSeg(mx + ux * 8, mz + uz * 8, x1, z1, 3.4); continue;
        }
        wallSeg(x0, z0, x1, z1, 3.4);
      }
      props.rand = mulberry32(1807_0612);
      props.hall({ x: CIT.x + 14, z: CIT.z + 14, yaw: 0.6, width: 18, depth: 8, height: 6, color: 0x9a6650, roof: 0x4a3a2e, door: 3, name: 'barracks' });
      props.hall({ x: CIT.x - 12, z: CIT.z + 18, yaw: -0.4, width: 10, depth: 7, height: 5, color: 0x8a7c66, roof: 0x4a3a2e, door: 2, name: 'powder magazine' });
      for (const [x0, x1, z] of [[CIT.x - MOAT - 8, CIT.x - MOAT + 8, CIT.z]] as const) props.box('plain', (x0 + x1) / 2, Math.max(terrain.heightAt((x0 + x1) / 2, z), 0.3) + 0.2, z, x1 - x0, 0.3, 8, 0, 0x6a5440);
      props.box('plain', CIT.x, Math.max(terrain.heightAt(CIT.x, CIT.z - MOAT), 0.3) + 0.2, CIT.z - MOAT, 8, 0.3, 16, 0, 0x6a5440);
    }

    // ---- the lighthouse on its dune
    {
      const g = terrain.heightAt(LIGHT.x, LIGHT.z);
      props.box('stone', LIGHT.x, g + 10, LIGHT.z, 6, 20, 6, 0, 0xd8d0c0);
      props.box('stone', LIGHT.x, g + 20.6, LIGHT.z, 7.4, 1.2, 7.4, 0, 0x5a3a2a);
      props.box('stone', LIGHT.x, g + 22.6, LIGHT.z, 3.2, 2.8, 3.2, 0, 0xe8e4d4);
      props.cover.addBox({ x: LIGHT.x, z: LIGHT.z, yaw: 0, length: 6, thickness: 6, height: 20 });
      props.rand = mulberry32(1807_0613);
      props.townHouse({ x: LIGHT.x + 16, z: LIGHT.z + 6, yaw: 0, width: 8, depth: 7, storeys: 1, name: 'keeper’s house', damaged: 0 });
    }
    // ---- the moles of the Seetief: two long stone piers out into the sea
    for (const sx of [-1, 1]) {
      const x = TIEF.x + sx * (TIEF.half + 4), z0 = shoreZ(x) - 10, z1 = shoreZ(x) - 80;
      for (let z = z1; z < z0 + 20; z += 10) props.box('stone', x, 0.6, z, 6, 2.2, 10.4, 0, 0x8a8478);
    }

    // ---- Pillau: the town round its church, the street down to the beach
    const rr = mulberry32(1807_061);
    const taken: number[][] = [];
    for (let i = 0; i < 400 && taken.length < 40; i++) {
      const x = TOWN.x - 110 + rr() * 220, z = TOWN.z - 120 + rr() * 200;
      if (!free(x, z, 6) || Math.hypot(x - TOWN.x, z - TOWN.z) < 26 || Math.hypot(x - LIGHT.x, z - LIGHT.z) < 30 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2, depth: 9, storeys: rr() < 0.6 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(1807_062);
    props.church({ x: TOWN.x - 34, z: TOWN.z + 24, yaw: 0 });
    buildVillage(props, P.E, 18074);
    for (let i = 0; i < 5; i++) props.box('plain', -400 + i * 9, terrain.heightAt(-400 + i * 9, shoreZ(-400) + 18) + 0.4, shoreZ(-400 + i * 9) + 18, 1.6, 0.6, 5, 0.3, 0x5a4434); // (fishing boats on the strand)
    // farms on the heath
    for (let i = 0, n = 0; i < 400 && n < 12; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 60 + r() * 760;
      if (!free(x, z, 10) || points.some((p) => Math.hypot(p.x - x, p.z - z) < 80)) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 8 + r() * 3, depth: 7, storeys: 1, name: 'farmhouse', damaged: 0 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: CIT.x, z: CIT.z, r: MOAT + 12 }, { x: LIGHT.x, z: LIGHT.z, r: 14 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || water(x, z) < 6 || inland(x, z) < 60 }];
    // pines on the heath, a few birches and limes in the town
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2200, broadleaf: 0.3, autumn: 0, maxY: 60,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 34 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
