// Ancona from the sea, 1799 (coastal, the 1806 epoch: the Russians and the British land, the French hold; 1.0 × 1.8 km).
// When the Second Coalition drove the French out of Italy, General Monnier held the papal port of Ancona for half a
// year; Admiral Ushakov’s Russo-Turkish squadron, Count Voinovich’s ships, came up the Adriatic from Corfu and shut it
// in from the sea, put Russian grenadiers and marines ashore on the coast north of the town with the Italian
// insurgents, and bombarded the harbour, until Fröhlich’s Austrians closed in by land and Monnier gave up in November.
// On the map the Adriatic is the −z side (the landing comes from the sea): in the west the long sand of Palombina
// running north-west toward Falconara, with Torrette on the Flaminia behind it; in the middle the harbour basin with
// Vanvitelli’s pentagonal Lazzaretto on its west shore and the old mole on its east, Trajan’s marble arch at the mole’s
// root, the town climbing from the quays up Monte Guasco to the cathedral of San Ciriaco over the sea; in the east the
// cliffs of Monte Cardeto, the lantern and the Capuchins on top, broken by the little cove of the Passetto. Inland the
// papal citadel on Monte Astagno, where the French come from, and the Marche’s clay hills.
// A scenario, not a fair battle (MAP_BRIEF_SEA_COAST.md): balanced with AI-vs-AI runs so the landing wins late or the
// defence just holds. Written with the sea on the lander’s side (−z), as `pact` lands; a campaign landing by the
// French is the map turned round (wcampaign/battle.js flipLanding): the same beaches and draws, the coalition in the forts.
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
const noise = createNoise2D(1799_0516);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a7488 }); // (the Adriatic off the Marche: milky green-blue over the sand)

/** The beach sectors (x), how wide their sand is, and what lies inland behind each. */
export const SECTORS = [
  { x: -330, w: 140, name: 'Palombina beach', inland: { name: 'Torrette', x: -320, z: 170 } },
  { x: 10, w: 55, name: 'The harbour quays', inland: { name: 'San Ciriaco', x: 175, z: 150 } },
  { x: 385, w: 40, name: 'The Passetto', inland: { name: 'Monte Cardeto', x: 330, z: 235 } },
];
const beachK = (x: number) => Math.max(...SECTORS.map((s) => Math.exp(-(((x - s.x) / s.w) ** 2))));

/** The waterline (world z; the sea toward −z): the harbour basin cutting in, Guasco’s promontory pushing out, the Passetto cove. */
export const shoreZ = (x: number) => -180 + fbm(noise, x * 0.006, 2.1, 2) * 8 + 65 * Math.exp(-(((x - 10) / 80) ** 2)) - 40 * Math.exp(-(((x - 205) / 70) ** 2)) + 26 * Math.exp(-(((x - 385) / 40) ** 2));
const inland = (x: number, z: number) => z - shoreZ(x);

/** The old mole: from Guasco’s foot out north-west into the sea, sheltering the basin from the east. */
const MOLE = [[125, shoreZ(125) + 6], [110, shoreZ(125) - 45], [80, shoreZ(125) - 95]];
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const moleD = (x: number, z: number) => (x > 50 && x < 160 && z < -60 ? Math.min(seg(x, z, MOLE[0][0], MOLE[0][1], MOLE[1][0], MOLE[1][1]), seg(x, z, MOLE[1][0], MOLE[1][1], MOLE[2][0], MOLE[2][1])) : 99);

/** The hills: Guasco (the cathedral) over the harbour, Cardeto east of it, Astagno with the citadel inland, Posatora west. */
const GUASCO = { x: 190, z: 130 }, CARDETO = { x: 335, z: 240 }, ASTAGNO = { x: 0, z: 600 }, POSATORA = { x: -250, z: 460 };
const bump = (x: number, z: number, c: { x: number; z: number }, r: number, amp: number) => amp * Math.exp(-((x - c.x) ** 2 + (z - c.z) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = inland(x, z), bk = beachK(x);
  if (d < 0) { // the bottom: sand shelving off the beaches and in the basin, deeper water under the cliffs; the mole
    const md = moleD(x, z);
    if (md < 6) return 2.4;
    const s = -d, bar = 0.4 * Math.exp(-(((s - 40) / 12) ** 2));
    const shelf = 0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, deep = -1.5 - s * 0.2;
    return Math.max(deep + (shelf - deep) * smoothstep(0.15, 0.7, bk), -16) - (md < 10 ? (10 - md) * 0.2 : 0);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const rock = (1 - smoothstep(0.2, 0.75, bk)) * 6 * smoothstep(0, 10, d); // (the rocky shore and the cliffs’ foot)
  const hills = bump(x, z, GUASCO, 130, 52) + bump(x, z, CARDETO, 130, 58) + bump(x, z, ASTAGNO, 140, 34) + bump(x, z, POSATORA, 160, 22);
  const land = beach + rock + 0.045 * Math.min(d, 600) * smoothstep(0, 50, d) + smoothstep(500, 1000, d) * 30
    + fbm(noise, x * 0.005, z * 0.005, 3) * 4 * smoothstep(20, 90, d)
    + hills * smoothstep(-5, 30 + 40 * bk, d); // (the hills come down to the water as cliffs, but not onto the beaches)
  return land + smoothstep(BOUNDS.x - 60, BOUNDS.x + 160, Math.abs(x)) * 30 * smoothstep(30, 200, d);
}

/** Soft going: the beaches’ sand. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 30 && beachK(x) > 0.3 && Math.abs(x - 10) > 60) return foot ? 0.85 : 0.6; // (the quays are paved)
  return 1;
}

const P0 = SECTORS.map((s) => ({ x: s.x, z: shoreZ(s.x) + 40 }));
/** The roads: the Flaminia along the coast from Falconara to the harbour, the Strada del Porto up Guasco, the roads up to
 * the citadel and over the hills, the track down to the Passetto. */
const ROADS: number[][] = [
  [-520, -120, P0[0].x, P0[0].z], [P0[0].x, P0[0].z, -170, -95], [-170, -95, P0[1].x, P0[1].z], [P0[1].x, P0[1].z, 95, -40],
  [95, -40, 120, 60], [120, 60, GUASCO.x - 15, 150],
  [P0[1].x, P0[1].z, -20, 300], [-20, 300, ASTAGNO.x, ASTAGNO.z], [ASTAGNO.x, ASTAGNO.z, 0, 900],
  [P0[0].x, P0[0].z, -320, 170], [-320, 170, -270, 440], [-270, 440, ASTAGNO.x, ASTAGNO.z], [-270, 440, -300, 900],
  [P0[2].x, P0[2].z, 330, 235], [330, 235, 260, 460], [260, 460, ASTAGNO.x, ASTAGNO.z], [260, 460, 300, 900], [GUASCO.x - 15, 150, 330, 235],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Voinovich’s squadron', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: P0[0].x, z: P0[0].z, owner: null, sector: 'west', radius: 55, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: P0[1].x, z: P0[1].z, owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: P0[2].x, z: P0[2].z, owner: null, sector: 'east', radius: 45, opens: 'G' },
  { id: 'E', name: SECTORS[0].inland.name, x: SECTORS[0].inland.x, z: SECTORS[0].inland.z, owner: null, sector: 'west' },
  { id: 'F', name: SECTORS[1].inland.name, x: SECTORS[1].inland.x, z: SECTORS[1].inland.z, owner: null, sector: 'centre' },
  { id: 'G', name: SECTORS[2].inland.name, x: SECTORS[2].inland.x, z: SECTORS[2].inland.z, owner: null, sector: 'east' },
  { id: 'K', name: 'The citadel', x: ASTAGNO.x, z: ASTAGNO.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const pointClear = (x: number, z: number, r: number) => points.every((p) => Math.hypot(p.x - x, p.z - z) > r);
const LAZZARETTO = { x: -165, z: shoreZ(-165) + 34 };
const CITADEL = { x: ASTAGNO.x + 5, z: ASTAGNO.z + 62 };
/** The town: from the quays round the basin up the slopes of Guasco. */
const inTown = (x: number, z: number) => { const d = inland(x, z); return d > 25 && d < 300 && x > -90 && x < 270 && Math.hypot(x - P.F.x, z - P.F.z) > 30; };

/** Oak copses and olive rows on the clay hills, the scrub on the cliffs (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 40) return 0;
  let k = smoothstep(0.45, 0.65, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.3 + 0.4 * smoothstep(250, 600, d));
  if (inTown(x, z)) k *= 0.2;
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'ancona-landing',
  name: 'Ancona 1799',
  description: 'Ancona from the sea, 1799: the Russo-Turkish squadron puts its grenadiers ashore at the papal port Monnier’s French hold. Palombina beach, the harbour with Trajan’s arch on the mole, San Ciriaco on Monte Guasco, the cliffs of Cardeto, the citadel inland.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Russia' },
  armies: { nato: ['fr'], pact: ['ru', 'gb'] }, // (Voinovich’s Russians first; the British — Troubridge’s squadron off the coast — when picked. The map names them, so they field in Italy: GameEngine armiesOn)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' }, // (a bright autumn day on the Adriatic)
  wind: { from: 140, speed: 4, veer: 0.15 }, // (the scirocco up the Adriatic)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1799_1113,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.7,
  fields: createFields({ seed: 1799_7, cell: 70, weights: [0.25, 0.35, 0.25, 0.15] }), // (autumn on the clay: ploughland, stubble, vines)

  theme: {
    // a clear autumn day: a soft haze over the sea, the sun low in the south
    fogColor: 0xc8ccc8, fogDensity: 0.0005,
    skyTop: 0x5a86bc, skyHorizon: 0xd4d8d6, skyBottom: 0x9c9a88,
    sunColor: 0xfff0d6, sunIntensity: 1.9, sunDisk: 0.5,
    clouds: 0.25, cloudLight: 0xf2f0ea, cloudDark: 0xbcbcb6,
    sunDir: [-0.3, 0.6, -0.65],
    hemiSky: 0xccd8e2, hemiGround: 0x847650, hemiIntensity: 1.2,
    rimColor: 0xf0e4cc, rimIntensity: 0.3,
    terrain: {
      grass: '#7e864c', grassAlt: '#747c44', dryGrass: '#a89c66', dirt: '#8a6c4e', rock: '#b4aa96',
      pasture: '#8a8c52', ploughed: '#86644a', stubble: '#b4a470', meadow: '#768444',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z), bk = beachK(x);
        if (moleD(x, z) < 7) return [0xc0b8a4, 1];                                     // the mole’s stone
        if (d < 0) return [y > -1.2 ? 0xd0c4a0 : 0x7e8a84, 1];                         // the sand under the water
        if (d < 28 && Math.abs(x - 10) < 70) return [0xb4aa94, 1];                       // the quays
        if (d < 28 && bk > 0.3) return [0xdcceaa, 1];                                   // the beaches
        if (d < 14 || (d < 60 && bk < 0.2 && y > 12)) return [0xc4b8a0, 0.9]; // the pale sandstone cliffs
        if (roadDist(x, z) < 3) return [inTown(x, z) ? 0xb0a690 : 0xa8946e, 0.85];
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-280, 0, 280] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the coalition lands: its roads are the beach sectors)
  maxStacks: 24,
  cameraStart: { nato: { x: 0, z: 280 }, pact: { x: 0, z: -150 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the squadron’s boats: the foot in the flatboats, the guns in the launches
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.15,
    signal: { t: 25, say: 'The signal from the flagship — every boat pulls for the shore', sayOther: 'Boats putting off from the squadron: they are landing!' },
    navy: ['frigate', 'destroyer'],
    // the port’s guns: the battery at the mole’s head, the Lazzaretto’s, Guasco’s over the harbour; field guns behind Palombina
    forts: [
      { unit: 'shoreBattery', x: MOLE[1][0], z: MOLE[1][1], facing: Math.PI },
      { unit: 'shoreBattery', x: LAZZARETTO.x + 30, z: LAZZARETTO.z - 8, facing: Math.PI },
      { unit: 'shoreBattery', x: 245, z: shoreZ(245) + 60, facing: Math.PI },
      { unit: 'artillery', x: -300, z: shoreZ(-300) + 95, facing: Math.PI },
    ],
    // breastworks behind the sand and on the quays, abatis on the beaches
    works: [
      ...SECTORS.flatMap((s) => (s.w > 60 ? [-60, -20, 20, 60] : [-25, 25]).map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 58, yaw: 0 }))),
      ...SECTORS.flatMap((s) => (s.w > 60 ? [-70, -50, -30, 30, 50, 70] : [-32, -20, 20, 32]).map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 30, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'mgTeam'],
    // Monnier’s sortie from the citadel
    counter: { t: 180, units: ['rifles', 'rifles', 'atTeam', 'reconVehicle', 'artillery'], say: 'Monnier is sallying from the citadel — at them before they are formed!', sayOther: 'A French column coming out of the citadel!' },
    hold: [...SECTORS.flatMap((s) => [-25, 25].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 62 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'atTeam', 'artillery', 'marines', 'rifles', 'atTeam', 'mgTeam', 'rifles', 'mortar', 'atTeam'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 280 },
    economy: { reserves: 2000, perSector: 500, beachIncome: 0.7, defenceCp: 750, defenceIncome: 1.0 }, // (tuned on AI-vs-AI runs: the harbour fell too quickly at maida’s rates)
    waves: [
      // the first boats: the grenadiers and the fleet’s marines, the jägers to skirmish
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'marines', sector: 0 },
        { unit: 'atTeam', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'rifles', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'marines', sector: 2 }] },
      { t: 300, say: 'More boats from the squadron', units: [{ unit: 'rifles', sector: 2 }, { unit: 'atTeam', sector: 0 }, { unit: 'mortar', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1799_0516);
    sea.build(scene, terrain);
    const STONE = 0xd2c8b2, DARK = 0x948a76, TOP = 0xbeb49e;
    /** A walled work: four curtains (a gap for the gate in the landward one) from the lowest ground under them, bastions at the corners. */
    const fort = (cx: number, cz: number, hw: number, hd: number, yaw: number, h: number, gate = 6) => {
      const c = Math.cos(yaw), s = Math.sin(yaw), W = (lx: number, lz: number) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
      const g0 = terrain.heightAt(cx, cz);
      const curtain = (lx: number, lz: number, len: number, along: boolean) => {
        const [x, z] = W(lx, lz), ry = yaw + (along ? 0 : Math.PI / 2);
        const foot = Math.min(...[-len / 2, 0, len / 2].map((m) => { const [px, pz] = W(lx + (along ? m : 0), lz + (along ? 0 : m)); return terrain.heightAt(px, pz); })) - 1.5;
        props.box('stone', x, (foot + g0 + h) / 2, z, len, g0 + h - foot, 2.4, ry, STONE);
        props.box('stone', x, (foot + g0 + 1.2) / 2, z, len + 0.1, g0 + 1.2 - foot, 2.7, ry, DARK);
        props.box('stone', x, g0 + h + 0.3, z, len, 0.6, 2.6, ry, TOP);
        props.cover.addBox({ x, z, yaw: ry, length: len, thickness: 2.4, height: h });
      };
      curtain(0, -hd, 2 * hw, true);
      const side = hw - gate / 2;
      curtain(-hw + side / 2, hd, side, true); curtain(hw - side / 2, hd, side, true);
      curtain(-hw, 0, 2 * hd, false); curtain(hw, 0, 2 * hd, false);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const [x, z] = W(sx * hw, sz * hd), foot = terrain.heightAt(x, z) - 2;
        props.box('stone', x, (foot + g0 + h) / 2, z, 9, g0 + h - foot, 9, yaw + Math.PI / 4, STONE); // (the arrowhead bastions, as Sangallo drew them)
        props.cover.addBox({ x, z, yaw: yaw + Math.PI / 4, length: 9, thickness: 9, height: h });
      }
    };
    // ---- the citadel on Astagno (behind the point: its gate toward the town), the Lazzaretto on the basin’s west shore
    fort(CITADEL.x, CITADEL.z, 42, 30, 0.05, 8, 8);
    props.rand = mulberry32(1799_0517);
    for (let k = 0; k < 5; k++) {
      const a = k * Math.PI * 2 / 5, x = LAZZARETTO.x + Math.cos(a) * 18, z = LAZZARETTO.z + Math.sin(a) * 18;
      props.townHouse({ x, z, yaw: -a + Math.PI / 2, width: 20, depth: 6, storeys: 1, name: 'the Lazzaretto', damaged: 0 });
    }
    // ---- Trajan’s arch at the mole’s root: white marble on its high plinth
    const [ax, az] = MOLE[0], ag = terrain.heightAt(ax, az);
    for (const s of [-1, 1]) { props.box('stone', ax + s * 4.2, ag + 4, az, 2.6, 8, 3.2, 0, 0xe4dccc); props.cover.addBox({ x: ax + s * 4.2, z: az, yaw: 0, length: 2.6, thickness: 3.2, height: 7 }); }
    props.box('stone', ax, ag + 10, az, 11.4, 4, 3.6, 0, 0xe4dccc);
    props.box('stone', ax, ag + 0.5, az, 13, 1.6, 6, 0, 0xc8c0b0);
    // the mole’s parapet, and merchantmen and gunboats moored in the basin
    for (let i = 0; i < 2; i++) { const [x0, z0] = MOLE[i], [x1, z1] = MOLE[i + 1], len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(x1 - x0, z1 - z0); props.box('stone', (x0 + x1) / 2 + 4, 3.2, (z0 + z1) / 2, 0.8, 1.6, len, yaw, 0xb8b0a0); }
    for (const [x, z, len] of [[40, shoreZ(40) - 40, 22], [-30, shoreZ(-30) - 55, 18], [70, shoreZ(70) - 70, 16]] as const) {
      props.box('plain', x, 0.6, z, 5, 2.4, len, 0.2, 0x4a3828);
      props.box('plain', x, 8, z, 0.5, 14, 0.5, 0, 0x3a2a1e);
    }
    // ---- San Ciriaco on Guasco (beside the point): the Romanesque cathedral, its green dome; the lantern and the Capuchins on Cardeto
    props.rand = mulberry32(1799_0518);
    props.church({ x: P.F.x + 24, z: P.F.z - 12, yaw: Math.PI / 2 });
    { const g = terrain.heightAt(P.F.x + 24, P.F.z - 12); props.box('stone', P.F.x + 24, g + 13, P.F.z - 12, 7, 5, 7, Math.PI / 4, 0x8aa49a); }
    props.church({ x: P.G.x - 30, z: P.G.z + 22, yaw: 0.2 });
    { const lx = P.G.x + 20, lz = P.G.z - 70, g = terrain.heightAt(lx, lz); props.box('stone', lx, g + 7, lz, 4, 14, 4, 0, 0xe0d8c8); props.box('metal', lx, g + 15, lz, 3, 2.4, 3, 0, 0xd8c070); }
    // ---- the town: houses on their footings round the basin and up Guasco
    const footing = (x: number, z: number, w: number, d: number, yaw: number) => {
      const c = Math.cos(yaw), s = Math.sin(yaw), g = terrain.heightAt(x, z);
      const lo = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => terrain.heightAt(x + (a * w * c + b * d * s) / 2, z + (-a * w * s + b * d * c) / 2)));
      if (g - lo > 0.4) props.box('stone', x, (lo - 0.3 + g + 0.3) / 2, z, w + 0.6, g + 0.3 - lo + 0.3, d + 0.6, yaw, DARK);
    };
    const slopeAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 4, z) - terrain.heightAt(x - 4, z), terrain.heightAt(x, z + 4) - terrain.heightAt(x, z - 4)) / 8;
    const big = [LAZZARETTO, CITADEL, { x: P.F.x + 24, z: P.F.z - 12 }, { x: ax, z: az }];
    const clear = (x: number, z: number, rr: number) => roadDist(x, z) > 5 + rr && pointClear(x, z, 26 + rr) && big.every((f) => Math.hypot(f.x - x, f.z - z) > 30 + rr);
    for (let i = 0, n = 0; i < 1000 && n < 75; i++) {
      const x = -90 + r() * 360, z = shoreZ(x) + 30 + r() * 270;
      if (!inTown(x, z) || !clear(x, z, 6) || slopeAt(x, z) > 0.3) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      const yaw = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.15, w = 7 + r() * 3;
      footing(x, z, w, 9, yaw);
      props.townHouse({ x, z, yaw, width: w, depth: 9, storeys: r() < 0.5 ? 3 : 2, damaged: 0 });
    }
    // Torrette on the Flaminia; farms on the clay hills
    buildVillage(props, P.E, 17991);
    props.rand = mulberry32(1799_0519);
    props.church({ x: P.E.x + 36, z: P.E.z + 28, yaw: 0.1 });
    for (let i = 0, n = 0; i < 500 && n < 22; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 50), z = shoreZ(x) + 80 + r() * 520;
      if (inTown(x, z) || !clear(x, z, 10) || slopeAt(x, z) > 0.22) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      const yaw = r() * Math.PI;
      footing(x, z, 9, 6, yaw);
      props.house({ x, z, yaw, width: 8 + r() * 3, depth: 6 });
      if (r() < 0.5) props.lowWall({ x: x + 9, z: z + 7, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.1, color: 0xa09684 });
    }
    // fishing boats (the lancetta and the trabaccolo) drawn up at Palombina
    for (let i = 0; i < 5; i++) { const x = -250 + i * 10; props.box('plain', x, terrain.heightAt(x, shoreZ(x) + 14) + 0.4, shoreZ(x) + 14, 1.7, 0.6, 5.5, 0.2, 0x6a4a34); }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 16 })), ...big.map((f) => ({ x: f.x, z: f.z, r: 30 })), { x: CITADEL.x, z: CITADEL.z, r: 55 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || inland(x, z) < 30 || moleD(x, z) < 12 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 1800, broadleaf: 0.75, autumn: 0.3, maxY: 200,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 32 || inTown(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
