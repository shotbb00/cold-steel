// Castelnuovo (Herceg Novi), March 1806 (coastal, the 1806 epoch: the Russians land, the French hold; 1.0 × 1.8 km).
// When Austria gave up Dalmatia and the Bocche di Cattaro at Pressburg, Admiral Senyavin’s squadron sailed up from
// Corfu before the French could march in: on 28 February the Russians and Prince-Bishop Petar’s Montenegrins came
// ashore at Castelnuovo, at the mouth of the bay, and the Austrian garrison handed over the forts. Here the French
// are already in the town (Lauriston’s men a few weeks early), and Senyavin has to row in and take it.
// The ground is the real mouth of the Bocche, the open water the −z side (south). The squadron lies in the bay mouth
// with the Luštica peninsula across it: its wooded limestone hills fill the south-east corner, cliffs to the water.
// On the north shore, from west to east: the Sutorina valley, a flat green floor between the Prevlaka hills and the
// town’s mountain, opening on the long shingle of Igalo bay, where the shore runs back deep into the valley mouth; then
// the town — Forte Mare on its rock out in the water, the little harbour (Škver) behind it, the old town climbing the
// mountainside in terraces to the Kanli Kula, the Turks’ “bloody tower”, and high above, the Španjola, where the French
// come from; then the cove of Savina under the monastery, and the steep shore running on toward Meljine. Igalo is wide
// and easy and leads nowhere but up the valley to Topla; the Škver and Savina are small and lead straight up the
// mountain to the Kanli Kula’s walls.
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
import { gridCache, gridCacheSmooth } from './gridCache.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1806_0228);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6478 }); // (the Bocche in late winter: deep, dark blue-green under the mountains)

/** The beach sectors (x), how wide their shingle is, and what lies inland behind each. */
export const SECTORS = [
  { x: -370, w: 110, name: 'Igalo beach', inland: { name: 'Topla', x: -300, z: 120 } },
  { x: -130, w: 38, name: 'Škver', inland: { name: 'Kanli Kula', x: -40, z: 90 } },
  { x: 140, w: 45, name: 'Savina cove', inland: { name: 'Kanli Kula', x: -40, z: 90 } },
];
/** 0..1: how much of a beach the shore is here (1 on the shingle, 0 on the rock between). */
const beachK = (x: number) => Math.max(...SECTORS.map((s) => Math.exp(-(((x - s.x) / s.w) ** 2))));
const FORTE_MARE = { x: -55, z: 0 }; // (z set below: on its rock in the water)

/** The waterline (world z; the bay toward −z): Igalo bay running back deep into the Sutorina’s mouth, Forte Mare’s rock
 * out in the water, the little Savina cove. */
export const shoreZ = (x: number) => -230 + fbm(noise, x * 0.006, 2.1, 2) * 9
  + 170 * Math.exp(-(((x + 360) / 120) ** 2))                    // Igalo bay, deep into the valley mouth
  - 60 * Math.exp(-(((x + 55) / 30) ** 2))                       // Forte Mare’s rock
  + 40 * Math.exp(-(((x - 140) / 50) ** 2));                     // Savina cove
FORTE_MARE.z = shoreZ(-55) + 14;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);
/** The Luštica peninsula across the bay mouth (south-east): > 0 on its land. */
const lustica = (x: number, z: number) => (x - 345) + 0.55 * (-500 - z) + fbm(noise, z * 0.01, x * 0.01, 2) * 20;

/** The Španjola on the mountain over the town; the Sutorina valley (0..1) in the west. */
const SPANJOLA = { x: -10, z: 420 };
const valK = (x: number) => smoothstep(-480, -400, x) * smoothstep(-130, -290, x);
const bump = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function heightRaw(x: number, z: number) {
  const d = inland(x, z), bk = beachK(x);
  const lu = lustica(x, z);
  if (lu > -40 && d < 0) { // Luštica: limestone hills, cliffs into the water
    const k = smoothstep(-40, 30, lu);
    const top = 6 + 0.12 * Math.min(lu, 300) + fbm(noise, x * 0.008 + 5, z * 0.008, 3) * 8;
    const bot = -6 - 0.15 * Math.max(0, -lu);
    return Math.max(-18, bot + (top - bot) * k);
  }
  if (d < 0) { // the bottom: off the beaches a shingle shelf the boats ground on, off the rock deep water at once
    const s = -d, bar = 0.4 * Math.exp(-(((s - 40) / 12) ** 2));
    const shelf = 0.5 - s * 0.022 - Math.max(0, s - 110) * 0.04 + bar, deep = -1.5 - s * 0.22;
    return Math.max(deep + (shelf - deep) * smoothstep(0.15, 0.7, bk), -18);
  }
  const beach = 0.5 + Math.min(d, 25) * 0.06;
  const rock = (1 - smoothstep(0.2, 0.75, bk)) * 8 * smoothstep(0, 10, d) * smoothstep(220, 70, d); // (the rocky shore between the beaches: a low cliff)
  const v = valK(x);
  // the town’s mountain: steep from the water, terraced, up to the Španjola and on toward Orjen
  const mountain = beach + rock + 0.13 * Math.min(d, 520) * smoothstep(0, 40, d) + 0.05 * Math.max(0, Math.min(d, 1100) - 520)
    + fbm(noise, x * 0.006, z * 0.006, 3) * 5 * smoothstep(20, 80, d) + bump(x, z, SPANJOLA.x, SPANJOLA.z, 110, 18)
    + 18 * Math.exp(-(((x - 20) / 55) ** 2)) * smoothstep(60, 200, d) * smoothstep(700, 400, d); // (the spur between the Škver and Savina)
  // the Sutorina valley: a flat green floor, barely rising; the Prevlaka hills along the west edge
  const valley = beach + 2 + Math.max(0, z) * 0.012 + fbm(noise, x * 0.01, z * 0.01, 2) * 1.2;
  const west = smoothstep(-400, -560, x) * (34 + 0.04 * Math.max(0, z + 200)) * smoothstep(-40, 60, d);
  return valley * v + mountain * (1 - v) + west;
}
const height = gridCacheSmooth(heightRaw, BOUNDS, 2);

/** Soft going: the beaches’ shingle, the wet valley floor. */
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
const P0 = SECTORS.map((s) => ({ x: s.x, z: shoreZ(s.x) + 40 }));
const KULA = SECTORS[1].inland, TOPLA = SECTORS[0].inland;
const MONASTERY = { x: 210, z: shoreZ(210) + 150 };
/** The roads: along the shore (Igalo – Topla – the town – Savina – Meljine), the steps up from the Škver to the Kanli Kula
 * and the Španjola, the Sutorina road up the valley, the monastery road from Savina up to the Kanli Kula’s east gate. */
const ROADS: number[][] = [
  [-520, P0[0].z + 30, P0[0].x, P0[0].z], [P0[0].x, P0[0].z, TOPLA.x, TOPLA.z], [TOPLA.x, TOPLA.z, -210, -20], [-210, -20, P0[1].x, P0[1].z],
  [P0[1].x, P0[1].z, 40, shoreZ(40) + 45], [40, shoreZ(40) + 45, P0[2].x, P0[2].z], [P0[2].x, P0[2].z, 520, shoreZ(500) + 50],
  [P0[1].x, P0[1].z, -90, 10], [-90, 10, KULA.x, KULA.z], [KULA.x, KULA.z, -60, 240], [-60, 240, SPANJOLA.x, SPANJOLA.z], [SPANJOLA.x, SPANJOLA.z, 40, 900],
  [TOPLA.x, TOPLA.z, -340, 450], [-340, 450, -330, 900], [-340, 450, SPANJOLA.x, SPANJOLA.z],
  [P0[2].x, P0[2].z, MONASTERY.x, MONASTERY.z], [MONASTERY.x, MONASTERY.z, 60, 40], [60, 40, KULA.x, KULA.z], [MONASTERY.x, MONASTERY.z, 300, 500], [300, 500, 280, 900],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));
const roadC = gridCache(roadDist, BOUNDS, 2);

const points: ControlPointDef[] = [
  { id: 'A', name: 'Senyavin’s anchorage', x: -170, z: -790, owner: 'pact', sector: 'centre', radius: 80 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: P0[0].x, z: P0[0].z, owner: null, sector: 'west', radius: 60, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: P0[1].x, z: P0[1].z, owner: null, sector: 'centre', radius: 40, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: P0[2].x, z: P0[2].z, owner: null, sector: 'east', radius: 45, opens: 'F' },
  { id: 'E', name: TOPLA.name, x: TOPLA.x, z: TOPLA.z, owner: null, sector: 'west' },
  { id: 'F', name: KULA.name, x: KULA.x, z: KULA.z, owner: null, sector: 'centre' },
  { id: 'K', name: 'Španjola', x: SPANJOLA.x, z: SPANJOLA.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const KULA_WALLS = { x: KULA.x + 45, z: KULA.z + 20 }; // the Kanli Kula’s walls: beside the point (F is the square at its gate)
const FORT_TOP = { x: SPANJOLA.x + 10, z: SPANJOLA.z + 50 }; // the Španjola’s walls: behind the point on the top
const pointClear = (x: number, z: number, r: number) => points.every((p) => Math.hypot(p.x - x, p.z - z) > r);

/** The old town: on the mountainside between Forte Mare and the Kanli Kula, and the newer houses on the terraces round it. */
const inTown = (x: number, z: number) => { const d = inland(x, z); return d > 28 && x > -200 && x < 60 && z < 160; };

/** Cypress, oak and chestnut on the slopes, the maquis on Luštica and the rock, gardens round the houses (0..1). */
const woods = gridCache((x: number, z: number) => {
  const d = inland(x, z), lu = lustica(x, z);
  if (lu > 15 && d < 0) return 0.75 * smoothstep(-0.2, 0.3, fbm(noise, x * 0.01, z * 0.01, 2));
  if (d < 30) return 0;
  let k = smoothstep(0.38, 0.6, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.4 + 0.5 * smoothstep(250, 600, d));
  if (inTown(x, z)) k *= 0.3;
  k *= 1 - 0.7 * valK(x) * smoothstep(-500, -440, x);  // (the valley floor: fields and meadows)
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
}, BOUNDS, 4);

export default {
  id: 'castelnuovo',
  name: 'Castelnuovo 1806',
  description: 'The Bocche di Cattaro, March 1806: Senyavin’s Russians row in to Castelnuovo at the mouth of the bay, Luštica across the water. The long shingle of Igalo bay at the Sutorina valley’s mouth, the Škver under Forte Mare and the cove of Savina; the town climbing the mountain to the Kanli Kula and the Španjola.',
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
        if (y < 0.3) return [y > -1.2 ? 0xa4a090 : 0x6a7270, 1];                         // the shingle and rock under the water
        if (d < 0) return [y < 4 ? 0x9c968a : 0x8a8a70, 0.9];                            // Luštica: bare rock at the water, maquis above
        if (d < 26 && bk > 0.3) return [0xbcb4a0, 1];                                   // the grey shingle beaches
        if (d < 16) return [0x9c968a, 1];                                               // the bare limestone at the water
        if (roadC(x, z) < 3) return [inTown(x, z) ? 0xb0a894 : 0x9a8a70, 0.85];          // the town’s stone steps, the stony tracks
        const scree = smoothstep(0.5, 0.65, fbm(noise, x * 0.01 + 40, z * 0.01, 2)) * smoothstep(300, 600, d) * (1 - valK(x));
        return scree > 0.05 ? [0xa09a8e, scree * 0.7] : null;                           // the bare karst showing through on the high slopes
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-330, 0, 280] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Russians land: their roads are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: -100, z: 250 }, pact: { x: -100, z: -330 } },
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
    // the coast’s guns: Forte Mare at the water, a battery over Igalo bay, the Citadela’s bastion east of the Škver; field guns at Savina
    forts: [
      { unit: 'shoreBattery', x: FORTE_MARE.x, z: FORTE_MARE.z + 4, facing: Math.PI },
      { unit: 'shoreBattery', x: -250, z: shoreZ(-250) + 45, facing: Math.PI },
      { unit: 'shoreBattery', x: 30, z: shoreZ(30) + 50, facing: Math.PI }, // (the Citadela’s bastion on the rock east of Forte Mare)
      { unit: 'artillery', x: 200, z: shoreZ(200) + 90, facing: Math.PI },
    ],
    // breastworks behind the beaches, abatis along the shingle
    works: [
      ...SECTORS.flatMap((s) => (s.w > 60 ? [-70, -25, 20, 65] : [-22, 22]).map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 56, yaw: 0 }))),
      ...SECTORS.flatMap((s) => (s.w > 60 ? [-80, -55, -30, 30, 55, 80] : [-32, -20, 20, 32]).map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 30, yaw: 0 }))),
    ],
    // voltigeurs on the beaches, the line in the town and on the hill roads
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'mgTeam'],
    // the battalions from Cattaro’s road come down past the Španjola
    counter: { t: 180, units: ['rifles', 'rifles', 'atTeam', 'reconVehicle', 'artillery'], say: 'The column from the Španjola is coming down — drive them into the sea!', sayOther: 'French columns coming down the mountain from the Španjola!' },
    hold: [
      ...SECTORS.flatMap((s) => [-25, 25].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 60 }))),
      { x: TOPLA.x, z: TOPLA.z }, { x: KULA.x, z: KULA.z }, { x: KULA.x - 30, z: KULA.z - 40 }, { x: MONASTERY.x, z: MONASTERY.z },
    ],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'atTeam', 'artillery', 'rifles', 'atTeam', 'mgTeam', 'rifles', 'mortar', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 280 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 600, defenceIncome: 0.65 },
    waves: [
      // the first boats: the Kozlovsky musketeers, the jägers of the 13th and 14th, the fleet’s grenadiers
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'atTeam', sector: 1 }, { unit: 'mgTeam', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'rifles', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 2 }] },
      { t: 300, say: 'The second division of boats is coming in', units: [{ unit: 'rifles', sector: 2 }, { unit: 'atTeam', sector: 0 }, { unit: 'mortar', sector: 1 }] },
      { t: 840, say: 'Petar’s Montenegrins and the fleet’s grenadiers are coming ashore', units: [{ unit: 'guard', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'guard', sector: 2 }] },
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
    // ---- Forte Mare on its rock at the water, the Kanli Kula over the old town, the Španjola on the top
    fort(FORTE_MARE.x, FORTE_MARE.z, 20, 14, 0, 7, 0);
    fort(KULA_WALLS.x, KULA_WALLS.z, 20, 16, 0.15, 8);
    fort(FORT_TOP.x, FORT_TOP.z, 30, 22, -0.1, 7);
    // the Kanli Kula’s round keep and the Clock Tower gate of the old town
    const kg = terrain.heightAt(KULA_WALLS.x + 12, KULA_WALLS.z + 8);
    props.box('stone', KULA_WALLS.x + 12, kg + 6, KULA_WALLS.z + 8, 9, 14, 9, 0.15 + Math.PI / 4, STONE);
    props.cover.addBox({ x: KULA_WALLS.x + 12, z: KULA_WALLS.z + 8, yaw: 0.15, length: 9, thickness: 9, height: 12 });
    const ct = { x: -110, z: shoreZ(-110) + 110 }, cg = terrain.heightAt(ct.x, ct.z);
    props.box('stone', ct.x, cg + 8, ct.z, 5, 16, 5, 0, STONE);
    props.box('metal', ct.x, cg + 13.5, ct.z, 5.1, 1.2, 1, 0, 0x2a2a28);

    // ---- the town: houses on the terraces between Forte Mare and the Kanli Kula, each on its stone footing
    const footing = (x: number, z: number, w: number, d: number, yaw: number) => {
      const c = Math.cos(yaw), s = Math.sin(yaw), g = terrain.heightAt(x, z);
      const lo = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => terrain.heightAt(x + (a * w * c + b * d * s) / 2, z + (-a * w * s + b * d * c) / 2)));
      if (g - lo > 0.4) props.box('stone', x, (lo - 0.3 + g + 0.3) / 2, z, w + 0.6, g + 0.3 - lo + 0.3, d + 0.6, yaw, DARK);
    };
    const slopeAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 4, z) - terrain.heightAt(x - 4, z), terrain.heightAt(x, z + 4) - terrain.heightAt(x, z - 4)) / 8;
    const forts = [FORTE_MARE, KULA_WALLS, FORT_TOP, ct];
    const clear = (x: number, z: number, rr: number) => roadC(x, z) > 4 + rr && pointClear(x, z, 26 + rr) && forts.every((f) => Math.hypot(f.x - x, f.z - z) > 34 + rr);
    for (let i = 0, n = 0; i < 900 && n < 64; i++) {
      const x = -200 + r() * 260, z = shoreZ(x) + 30 + r() * 300;
      if (!inTown(x, z) || !clear(x, z, 6) || slopeAt(x, z) > 0.32) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      const yaw = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2, w = 7 + r() * 3;
      footing(x, z, w, 8, yaw);
      props.townHouse({ x, z, yaw, width: w, depth: 8, storeys: 2 + (r() < 0.3 ? 1 : 0), damaged: 0 });
    }
    props.rand = mulberry32(1806_0302);
    props.church({ x: -100, z: shoreZ(-100) + 170, yaw: 0.1 }); // (the church of St Michael the Archangel on the square)
    // Topla in the valley mouth, Igalo’s fishermen’s houses, the Savina monastery
    for (const [p, seed] of [[P.E, 18064], [{ x: -430, z: shoreZ(-430) + 90 }, 18066], [MONASTERY, 18065]] as const) buildVillage(props, p, seed);
    props.rand = mulberry32(1806_0303);
    props.church({ x: MONASTERY.x + 40, z: MONASTERY.z + 30, yaw: Math.PI / 2 + 0.2 }); // (Savina: the Dormition, the monks’ church)
    props.church({ x: P.E.x - 38, z: P.E.z + 26, yaw: 0.3 });
    // stone houses and garden walls up the slopes and over the valley floor
    for (let i = 0, n = 0; i < 500 && n < 26; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 50), z = shoreZ(x) + 60 + r() * 600;
      if (inTown(x, z) || !clear(x, z, 10) || slopeAt(x, z) > 0.22) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      const yaw = r() * Math.PI;
      footing(x, z, 9, 6, yaw);
      props.house({ x, z, yaw, width: 8 + r() * 3, depth: 6 });
      if (r() < 0.6) props.lowWall({ x: x + 9, z: z + 7, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.1, color: 0x9a948a });
    }
    // fishing boats drawn up on the Igalo shingle and in the Škver
    for (let i = 0; i < 5; i++) { const x = -330 + i * 11; props.box('plain', x, terrain.heightAt(x, shoreZ(x) + 14) + 0.4, shoreZ(x) + 14, 1.6, 0.6, 5, 0.2, 0x5a4434); }
    for (let i = 0; i < 3; i++) { const x = -150 + i * 8; props.box('plain', x, terrain.heightAt(x, shoreZ(x) + 10) + 0.4, shoreZ(x) + 10, 1.5, 0.6, 4.6, 0.1, 0x4a5a6a); }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), ...forts.map((f) => ({ x: f.x, z: f.z, r: 34 })),
      { test: (x: number, z: number) => roadC(x, z) < 5 || (inland(x, z) < 22 && inland(x, z) > -1) || height(x, z) < 2 }];
    // cypresses, oaks and chestnuts on the slopes, the maquis on Luštica and the rock, the gardens’ olives and oranges
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2600, broadleaf: 0.6, autumn: 0, maxY: 200,
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
