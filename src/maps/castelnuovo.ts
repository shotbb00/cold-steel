// Castelnuovo (Herceg Novi), March 1806 (coastal, the 1806 epoch: the Russians land, the French hold; 1.0 × 1.8 km).
// When Austria gave up Dalmatia and the Bocche di Cattaro at Pressburg, Admiral Senyavin’s squadron sailed up from
// Corfu before the French could march in: on 28 February the Russians and Prince-Bishop Petar’s Montenegrins came
// ashore at Castelnuovo, at the mouth of the bay, and the Austrian garrison handed over the forts. Here the French
// are already in the town (Lauriston’s men a few weeks early), and Senyavin has to row in and take it.
// On the map the bay’s mouth is the −z side (the Russians come from the sea): the steep coast under Mount Orjen with
// three ways ashore — the long shingle beach of Igalo at the mouth of the Sutorina in the west, the little harbour
// (Škver) under Forte Mare in the middle, where the town climbs the hill in terraces, and the cove of Savina in the
// east under the monastery. Between them the shore is rock. Above the old town the Kanli Kula, the Turks’ “bloody
// tower”, and on the top of the hill the Španjola, the fort the Spaniards began in 1538, where the French come from.
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
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1806_0228);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6478 }); // (the Bocche in late winter: deep, dark blue-green under the mountains)

/** The beach sectors (x), how wide their shingle is, and what lies inland behind each. */
export const SECTORS = [
  { x: -330, w: 120, name: 'Igalo beach', inland: { name: 'Topla', x: -300, z: 170 } },
  { x: -60, w: 45, name: 'Škver', inland: { name: 'Kanli Kula', x: -20, z: 250 } },
  { x: 320, w: 55, name: 'Savina cove', inland: { name: 'Savina monastery', x: 300, z: 210 } },
];
/** 0..1: how much of a beach the shore is here (1 on the shingle, 0 on the rock between). */
const beachK = (x: number) => Math.max(...SECTORS.map((s) => Math.exp(-(((x - s.x) / s.w) ** 2))));
const FORTE_MARE = { x: 40, z: 0 }; // (z set below: on the water)

/** The waterline (world z; the bay toward −z): Forte Mare’s rock pushing out, the Savina cove cutting in. */
export const shoreZ = (x: number) => -190 + fbm(noise, x * 0.006, 2.1, 2) * 10 - 26 * Math.exp(-(((x - 40) / 32) ** 2)) + 34 * Math.exp(-(((x - 320) / 80) ** 2)) - 0.00006 * x * x;
FORTE_MARE.z = shoreZ(40) + 12;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Španjola on the hill top and the spurs coming down between the three draws. */
const SPANJOLA = { x: 60, z: 640 };
const SPURS = [-190, 160];
const bump = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = inland(x, z), bk = beachK(x);
  if (d < 0) { // the bottom: off the beaches a shingle shelf the boats ground on, off the rock deep water at once
    const s = -d, bar = 0.4 * Math.exp(-(((s - 40) / 12) ** 2));
    const shelf = 0.5 - s * 0.022 - Math.max(0, s - 110) * 0.04 + bar, deep = -1.5 - s * 0.22;
    return Math.max(deep + (shelf - deep) * smoothstep(0.15, 0.7, bk), -18);
  }
  const beach = 0.5 + Math.min(d, 25) * 0.06;
  const rock = (1 - smoothstep(0.2, 0.75, bk)) * 8 * smoothstep(0, 10, d); // (the rocky shore between the beaches: a low cliff)
  // the hillside: gentle over the Sutorina flats in the west, steep where the town climbs, a long slope up from Savina
  const slope = 0.055 + 0.07 * smoothstep(-260, -120, x) - 0.01 * smoothstep(150, 260, x);
  let land = beach + rock + slope * Math.min(d, 560) * smoothstep(0, 40, d) + smoothstep(480, 980, d) * 45
    + fbm(noise, x * 0.006, z * 0.006, 3) * 4 * smoothstep(20, 80, d)
    + bump(x, z, SPANJOLA.x, SPANJOLA.z, 120, 22);
  for (const sx of SPURS) land += 16 * Math.exp(-(((x - sx) / 55) ** 2)) * smoothstep(50, 200, d) * smoothstep(760, 420, d);
  // Mount Orjen closing in at the edges
  land += smoothstep(BOUNDS.x - 70, BOUNDS.x + 160, Math.abs(x)) * 55 * smoothstep(30, 220, d);
  return land;
}

/** Soft going: the beaches’ shingle. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 28 && beachK(x) > 0.3) return foot ? 0.85 : 0.6;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const P0 = SECTORS.map((s) => ({ x: s.x, z: shoreZ(s.x) + 45 }));
/** The roads: along the shore behind the beaches (Igalo – the town – Savina – Meljine), the steps up from Škver past
 * the Kanli Kula to the Španjola, the Sutorina road up from Topla, and the monastery road climbing from Savina. */
const ROADS: number[][] = [
  [-520, -110, P0[0].x, P0[0].z], [P0[0].x, P0[0].z, -180, -95], [-180, -95, P0[1].x, P0[1].z], [P0[1].x, P0[1].z, 150, -105], [150, -105, P0[2].x, P0[2].z], [P0[2].x, P0[2].z, 520, -70],
  [P0[1].x, P0[1].z, -70, 90], [-70, 90, -20, 250], [-20, 250, 30, 420], [30, 420, SPANJOLA.x, SPANJOLA.z], [SPANJOLA.x, SPANJOLA.z, 0, 900],
  [P0[0].x, P0[0].z, -300, 170], [-300, 170, -260, 420], [-260, 420, -300, 900], [-260, 420, 30, 420],
  [P0[2].x, P0[2].z, 300, 210], [300, 210, 260, 450], [260, 450, 300, 900], [260, 450, 30, 420],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Senyavin’s anchorage', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 40, owner: null, sector: 'west', radius: 55, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 40, owner: null, sector: 'centre', radius: 45, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 40, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: SECTORS[0].inland.name, x: SECTORS[0].inland.x, z: SECTORS[0].inland.z, owner: null, sector: 'west' },
  { id: 'F', name: SECTORS[1].inland.name, x: SECTORS[1].inland.x, z: SECTORS[1].inland.z, owner: null, sector: 'centre' },
  { id: 'G', name: SECTORS[2].inland.name, x: SECTORS[2].inland.x, z: SECTORS[2].inland.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Španjola', x: SPANJOLA.x, z: SPANJOLA.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const KULA = { x: 35, z: 265 };       // the Kanli Kula: off the point (F is the square in front of its gate)
const FORT_TOP = { x: 60, z: 700 };   // the Španjola’s walls: behind the point on the hill top
const pointClear = (x: number, z: number, r: number) => points.every((p) => Math.hypot(p.x - x, p.z - z) > r);

/** The old town: inside the walls between Forte Mare and the Kanli Kula, and the newer houses on the terraces round it. */
const inTown = (x: number, z: number) => { const d = inland(x, z); return d > 30 && d < 330 && x > -170 && x < 150; };

/** Cypress, oak and chestnut on the slopes, the maquis on the rock, orange and olive gardens round the houses (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 30) return 0;
  let k = smoothstep(0.38, 0.6, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.4 + 0.5 * smoothstep(250, 600, d));
  if (inTown(x, z)) k *= 0.3;
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'castelnuovo',
  name: 'Castelnuovo 1806',
  description: 'The Bocche di Cattaro, March 1806: Senyavin’s Russians row in to Castelnuovo at the mouth of the bay. Igalo beach, the harbour under Forte Mare and the cove of Savina; the town climbing the steep hill to the Kanli Kula and the Španjola.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Russia' },
  armies: { nato: ['fr'], pact: ['ru'] }, // (the map names ru, so it fields in Italy though ru's regions are Poland's — GameEngine armiesOn)
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' }, // (late February: the bora off the mountains, low cloud on Orjen)
  wind: { from: 20, speed: 5, veer: 0.2 }, // (the bora: cold, gusting down off the mountains into the bay)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1806_0301,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_33, cell: 60, weights: [0.45, 0.25, 0.05, 0.25] }), // (winter: pasture, the vegetable gardens dug over)

  theme: {
    // a grey late-winter day in the Bocche: cloud on the mountains, the light flat and cold over the water
    fogColor: 0xa8b0b4, fogDensity: 0.0006,
    skyTop: 0x6c7c8e, skyHorizon: 0xbcc4c8, skyBottom: 0x8a9088,
    sunColor: 0xeef0ec, sunIntensity: 1.5, sunDisk: 0.2,
    clouds: 0.7, cloudLight: 0xd8dcde, cloudDark: 0x8a9098,
    sunDir: [-0.35, 0.6, -0.6],
    hemiSky: 0xc0ccd6, hemiGround: 0x6a6a56, hemiIntensity: 1.25,
    rimColor: 0xd8dce0, rimIntensity: 0.25,
    terrain: {
      grass: '#6e7a48', grassAlt: '#66703e', dryGrass: '#8e8a5c', dirt: '#7a6650', rock: '#9a968c',
      pasture: '#76804c', ploughed: '#7a5e44', stubble: '#9a9060', meadow: '#6a7a44',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z), bk = beachK(x);
        if (d < 0) return [y > -1.2 ? 0xa4a090 : 0x6a7270, 1];                         // the shingle and rock under the water
        if (d < 26 && bk > 0.3) return [0xbcb4a0, 1];                                   // the grey shingle beaches
        if (d < 16) return [0x9c968a, 1];                                               // the bare limestone at the water
        if (roadDist(x, z) < 3) return [inTown(x, z) ? 0xb0a894 : 0x9a8a70, 0.85];       // the town’s stone steps, the stony tracks
        const scree = smoothstep(0.5, 0.65, fbm(noise, x * 0.01 + 40, z * 0.01, 2)) * smoothstep(300, 600, inland(x, z));
        return scree > 0.05 ? [0xa09a8e, scree * 0.7] : null;                           // the bare karst showing through on the high slopes
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-280, 40, 280] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Russians land: their roads are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 300 }, pact: { x: 0, z: -160 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the squadron’s boats: the foot in the flatboats, the guns in the launches (the Russian fleet’s own: data/units1806/ships.js has none yet)
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.25, // (the bora kicks up a chop in the bay mouth)
    signal: { t: 25, say: 'A gun from the flagship — the boats pull for Castelnuovo', sayOther: 'Boats coming in from the squadron at the bay mouth — every man to the walls!' },
    // Senyavin’s frigates and brigs close in under the forts
    navy: ['frigate', 'destroyer'],
    // the coast’s guns: Forte Mare at the water, a battery over the Igalo beach, the Citadela’s bastion east of it; field guns at Savina
    forts: [
      { unit: 'shoreBattery', x: FORTE_MARE.x, z: FORTE_MARE.z + 4, facing: Math.PI },
      { unit: 'shoreBattery', x: -200, z: shoreZ(-200) + 40, facing: Math.PI },
      { unit: 'shoreBattery', x: 150, z: shoreZ(150) + 45, facing: Math.PI }, // (the Citadela’s bastion on the rock east of Forte Mare)
      { unit: 'artillery', x: 250, z: shoreZ(250) + 80, facing: Math.PI },
    ],
    // breastworks behind the beaches, abatis along the shingle
    works: [
      ...SECTORS.flatMap((s) => (s.w > 60 ? [-60, -20, 20, 60] : [-25, 25]).map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 58, yaw: 0 }))),
      ...SECTORS.flatMap((s) => (s.w > 60 ? [-70, -50, -30, 30, 50, 70] : [-36, -22, 22, 36]).map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 30, yaw: 0 }))),
    ],
    // voltigeurs on the beaches, the line in the town and on the hill roads
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'mgTeam'],
    // the battalions from Cattaro’s road come down past the Španjola
    counter: { t: 180, units: ['rifles', 'rifles', 'atTeam', 'reconVehicle', 'artillery'], say: 'The column from the Španjola is coming down — drive them into the sea!', sayOther: 'French columns coming down the hill from the Španjola!' },
    hold: [...SECTORS.flatMap((s) => [-25, 25].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 62 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'atTeam', 'artillery', 'rifles', 'atTeam', 'mgTeam', 'rifles', 'mortar', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 280 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 600, defenceIncome: 0.65 }, // (tuned on AI-vs-AI runs: at maida’s rates the Kanli Kula held to the end)
    waves: [
      // the first boats: the Kozlovsky musketeers, the jägers of the 13th and 14th, the fleet’s grenadiers
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'atTeam', sector: 1 }, { unit: 'mgTeam', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'rifles', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 2 }] },
      { t: 300, say: 'The second division of boats is coming in', units: [{ unit: 'rifles', sector: 2 }, { unit: 'atTeam', sector: 0 }, { unit: 'mortar', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1806_0228);
    sea.build(scene, terrain);
    const STONE = 0xc8bca4, DARK = 0x8e8270, TOP = 0xb4a88e;
    /** A walled work: four curtains (a gap for the gate in the landward one) standing from the lowest ground under them, square towers at the corners. */
    const fort = (cx: number, cz: number, hw: number, hd: number, yaw: number, h: number, gate = 6) => {
      const c = Math.cos(yaw), s = Math.sin(yaw), W = (lx: number, lz: number) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
      const g0 = terrain.heightAt(cx, cz);
      const curtain = (lx: number, lz: number, len: number, along: boolean) => {
        const [x, z] = W(lx, lz), ry = yaw + (along ? 0 : Math.PI / 2);
        const foot = Math.min(...[-len / 2, 0, len / 2].map((m) => { const [px, pz] = W(lx + (along ? m : 0), lz + (along ? 0 : m)); return terrain.heightAt(px, pz); })) - 1.5;
        props.box('stone', x, (foot + g0 + h) / 2, z, len, g0 + h - foot, 2.2, ry, STONE);
        props.box('stone', x, (foot + g0 + 1.2) / 2, z, len + 0.1, g0 + 1.2 - foot, 2.5, ry, DARK);
        for (let m = -len / 2 + 1; m <= len / 2 - 1; m += 2.6) { const [px, pz] = W(lx + (along ? m : 0), lz + (along ? 0 : m)); props.box('stone', px, g0 + h + 0.45, pz, 1.1, 0.9, 2.2, ry, TOP); }
        props.cover.addBox({ x, z, yaw: ry, length: len, thickness: 2.2, height: h });
      };
      curtain(0, -hd, 2 * hw, true);
      const side = hw - gate / 2;
      curtain(-hw + side / 2, hd, side, true); curtain(hw - side / 2, hd, side, true); // (the gate: landward, +z)
      curtain(-hw, 0, 2 * hd, false); curtain(hw, 0, 2 * hd, false);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const [x, z] = W(sx * hw, sz * hd), foot = terrain.heightAt(x, z) - 2;
        props.box('stone', x, (foot + g0 + h + 2) / 2, z, 6, g0 + h + 2 - foot, 6, yaw, STONE);
        props.cover.addBox({ x, z, yaw, length: 6, thickness: 6, height: h + 2 });
      }
    };
    // ---- Forte Mare on its rock at the water, the Kanli Kula over the old town, the Španjola on the hill top
    fort(FORTE_MARE.x, FORTE_MARE.z, 22, 14, 0, 7, 0);
    fort(KULA.x, KULA.z + 10, 20, 16, 0.15, 8);
    fort(FORT_TOP.x, FORT_TOP.z, 30, 22, -0.1, 7);
    // the Kanli Kula’s round keep and the Clock Tower gate of the old town
    const kg = terrain.heightAt(KULA.x + 12, KULA.z + 18);
    props.box('stone', KULA.x + 12, kg + 6, KULA.z + 18, 9, 14, 9, 0.15 + Math.PI / 4, STONE);
    props.cover.addBox({ x: KULA.x + 12, z: KULA.z + 18, yaw: 0.15, length: 9, thickness: 9, height: 12 });
    const ct = { x: -95, z: shoreZ(-95) + 95 }, cg = terrain.heightAt(ct.x, ct.z);
    props.box('stone', ct.x, cg + 8, ct.z, 5, 16, 5, 0, STONE);
    props.box('metal', ct.x, cg + 13.5, ct.z, 5.1, 1.2, 1, 0, 0x2a2a28);

    // ---- the town: houses on the terraces between Forte Mare and the Kanli Kula, each on its stone footing
    const footing = (x: number, z: number, w: number, d: number, yaw: number) => {
      const c = Math.cos(yaw), s = Math.sin(yaw), g = terrain.heightAt(x, z);
      const lo = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => terrain.heightAt(x + (a * w * c + b * d * s) / 2, z + (-a * w * s + b * d * c) / 2)));
      if (g - lo > 0.4) props.box('stone', x, (lo - 0.3 + g + 0.3) / 2, z, w + 0.6, g + 0.3 - lo + 0.3, d + 0.6, yaw, DARK);
    };
    const slopeAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 4, z) - terrain.heightAt(x - 4, z), terrain.heightAt(x, z + 4) - terrain.heightAt(x, z - 4)) / 8;
    const forts = [FORTE_MARE, { x: KULA.x, z: KULA.z + 10 }, FORT_TOP, ct];
    const clear = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && pointClear(x, z, 26 + rr) && forts.every((f) => Math.hypot(f.x - x, f.z - z) > 34 + rr);
    for (let i = 0, n = 0; i < 900 && n < 70; i++) {
      const x = -170 + r() * 320, z = shoreZ(x) + 35 + r() * 300;
      if (!inTown(x, z) || !clear(x, z, 6) || slopeAt(x, z) > 0.3) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      const yaw = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2, w = 7 + r() * 3;
      footing(x, z, w, 8, yaw);
      props.townHouse({ x, z, yaw, width: w, depth: 8, storeys: 2 + (r() < 0.3 ? 1 : 0), damaged: 0 });
    }
    props.rand = mulberry32(1806_0302);
    props.church({ x: -60, z: shoreZ(-60) + 150, yaw: 0.1 }); // (the church of St Michael the Archangel on the square)
    // Topla and Savina: the villages, the monastery’s church
    for (const [p, seed] of [[P.E, 18064], [P.G, 18065]] as const) buildVillage(props, p, seed);
    props.rand = mulberry32(1806_0303);
    props.church({ x: P.G.x + 40, z: P.G.z + 30, yaw: Math.PI / 2 + 0.2 }); // (Savina: the Dormition, the monks’ church)
    props.church({ x: P.E.x - 38, z: P.E.z + 26, yaw: 0.3 });
    // stone houses and garden walls scattered up the slopes and over the Sutorina flats
    for (let i = 0, n = 0; i < 500 && n < 24; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 50), z = shoreZ(x) + 60 + r() * 520;
      if (inTown(x, z) || !clear(x, z, 10) || slopeAt(x, z) > 0.22) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      const yaw = r() * Math.PI;
      footing(x, z, 9, 6, yaw);
      props.house({ x, z, yaw, width: 8 + r() * 3, depth: 6 });
      if (r() < 0.6) props.lowWall({ x: x + 9, z: z + 7, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.1, color: 0x9a948a });
    }
    // fishing boats drawn up on the Igalo shingle and in the Škver
    for (let i = 0; i < 5; i++) { const x = -420 + i * 11; props.box('plain', x, terrain.heightAt(x, shoreZ(x) + 14) + 0.4, shoreZ(x) + 14, 1.6, 0.6, 5, 0.2, 0x5a4434); }
    for (let i = 0; i < 3; i++) { const x = -85 + i * 8; props.box('plain', x, terrain.heightAt(x, shoreZ(x) + 10) + 0.4, shoreZ(x) + 10, 1.5, 0.6, 4.6, 0.1, 0x4a5a6a); }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), ...forts.map((f) => ({ x: f.x, z: f.z, r: 34 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || inland(x, z) < 22 }];
    // cypresses, oaks and chestnuts on the slopes, the maquis on the rock, the gardens’ olives and oranges
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2400, broadleaf: 0.6, autumn: 0, maxY: 200,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 28 || inTown(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
