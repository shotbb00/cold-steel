// Cuxhaven, November 1805 (coastal, the 1806 epoch: the British and the Russians land, the French hold; 1.0 × 1.8 km).
// After Ulm Pitt sent Cathcart's army to the Elbe and the Weser to strike at Hanover behind Napoleon's back: from
// 17 November the transports anchored in the Cuxhaven roads and the King's German Legion, the Guards and Tolstoy's
// Russians came ashore at Cuxhaven and the Ritzebüttel bailiwick, then marched up to the Weser and Bremen. Bernadotte
// had taken most of the French garrison of Hanover to the Danube and only Barbou's men in Hameln were left, so they
// landed unopposed; the map plays it as it might have gone had the French stood on the coast.
// The real corner of land where the Elbe meets the North Sea: north is -z, the open sea; the Elbe estuary fills the
// east flank (+x), its shore running away south-east past the town. The Kugelbake beacon stands on the corner. Two
// landing places: the Döse strand on the North Sea side, under the green sea dyke, and the Alte Liebe — the timber
// pier and the strand by the harbour at the corner, with Cuxhaven on the Elbe bank behind it round its harbour basin.
// Behind the dyke the flat marsh of drained fields and ditches, Ritzebüttel castle (the Hamburg bailiff's brick keep)
// and its village; Duhnen in its dunes off to the west; inland to the south-west the Geest rises, sandy heath and the
// Wernerwald round Altenwalde, where the French come from.
// Both shores are built to be fought from either side (the campaign plays a landing flipped: wcampaign/battle.js).
import { createNoise2D, fbm } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost, buildVillage } from './common.js';
import { coastline, shoreFrame, waterlineZ } from './coastLine.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1805_11);
const sea = createSea({ level: 0, size: SIZE, color: 0x4e6a6a }); // (the Elbe mouth in November: grey-green, thick with silt)

/** The shore (m from the waterline, + ashore): the North Sea strand west to east, round the Kugelbake corner, then down the Elbe bank to the south-east. */
const D0 = coastline([
  [-1200, -30], [-600, -55], [-350, -85], [-100, -125], [100, -170], [215, -235], [285, -228], [330, -150], [360, -40], [395, 110], [440, 320], [520, 540], [700, 900], [900, 1300],
]);
const wob = (x: number, z: number) => fbm(noise, x * 0.006, z * 0.006, 2) * 6;
const D = (x: number, z: number) => D0(x, z) + wob(x, z);
const Dr = (x: number, z: number) => D0.raw(x, z) + wob(x, z); // (uncached: for placing things at load)
/** Cuxhaven's harbour basin, cut into the Elbe bank behind the town; the Alte Liebe pier out from the corner. */
const BASIN = { x0: 330, x1: 420, z0: 40, z1: 100 };
const inBasin = (x: number, z: number) => x > BASIN.x0 && x < BASIN.x1 && z > BASIN.z0 && z < BASIN.z1;
const segD = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const PIER = [322, -170, 402, -236];
const pierD = (x: number, z: number) => segD(x, z, PIER[0], PIER[1], PIER[2], PIER[3]);
/** The Geest edge (z where the land rises out of the marsh: the Altenwalde heights, highest to the south-west). */
const GEEST = 470;
/** The sea dyke along the shore from Döse round the corner and down the Elbe (Duhnen's west is open dune), cut where the roads go over. */
const GAPS = [[-120, -60], [250, -120], [300, 0]];
const dykeK = (x: number, z: number) => smoothstep(-280, -170, x) * (1 - 0.9 * Math.max(...GAPS.map(([gx, gz]) => smoothstep(22, 10, Math.hypot(x - gx, z - gz)))));

const ALTENWALDE = { x: -250, z: 700 };
const RITZ = { x: 10, z: 220 };        // Ritzebüttel village (the castle stands beside it: CASTLE)
const DUHNEN = { x: -390, z: 20 };
const CUX = { x: 300, z: 90 };         // Cuxhaven: the harbour town on the Elbe bank
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = D(x, z);
  if (inBasin(x, z)) return -2.2;
  if (d < 0) { // the bottom: a bar where the surf breaks, then the channel shelving away (the Elbe's fairway deep close in)
    if (pierD(x, z) < 2.5) return 1.8;
    const s = -d, bar = 0.5 * Math.exp(-(((s - 45) / 14) ** 2)) * smoothstep(300, 220, x);
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 * (1 + smoothstep(300, 420, x)) + bar, -16);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const west = 1 - smoothstep(-280, -170, x);
  // Duhnen's dunes: high, ragged sand hills in the west, a low line of them before the dyke elsewhere
  const dunes = (1.5 + 3.5 * west + fbm(noise, x * 0.012, 3.7, 2) * 2) * Math.exp(-(((d - 50) / 16) ** 2)) * (1 - 0.7 * smoothstep(150, 320, x));
  const dyke = 5 * dykeK(x, z) * Math.exp(-(((d - 64) / 11) ** 2));
  // the marsh: dead flat, a metre or two above the sea; then the Geest rising out of it to the south-west, the heath and the woods
  const land = 1.6 + fbm(noise, x * 0.006, z * 0.006, 2) * 0.6
    + smoothstep(GEEST - 80, GEEST + 300, z - 0.25 * x) * 14 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.35)
    + hill(x, z, ALTENWALDE.x, ALTENWALDE.z, 160, 6) + hill(x, z, -40, 620, 120, 4);
  let h = Math.max(beach + Math.max(dunes, dyke) * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  if (x > 300 && z > -60 && z < 200 && d < 30) h = Math.max(h, 2.2 * smoothstep(0, 4, d)); // (the town's quays on the Elbe)
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, -x) * 18 * smoothstep(60, 200, d);
  return h;
}

/** Soft going: the beach sand and the wet marsh behind the dyke in November. */
function soft(x: number, z: number, foot: boolean) {
  const d = D(x, z);
  if (d >= 0 && d < 35) return foot ? 0.85 : 0.6;
  if (d > 90 && z - 0.25 * x < GEEST - 60) return foot ? 0.9 : 0.8;
  return 1;
}

/** The roads: behind the dyke Duhnen – Döse – the Kugelbake, over the dyke at Döse and the corner, the harbour street down the Elbe bank, Ritzebüttel up the Geest to Altenwalde, the Groden road south. */
const ROADS: number[][] = [
  [-520, -10, DUHNEN.x, DUHNEN.z], [DUHNEN.x, DUHNEN.z, -120, -20], [-120, -20, 250, -110], [250, -110, CUX.x, CUX.z],
  [-120, -100, -120, -20], [-120, -20, RITZ.x, RITZ.z], [RITZ.x, RITZ.z, CUX.x, CUX.z], [CUX.x, CUX.z, 380, 300], [380, 300, 330, 600], [330, 600, 200, 900],
  [RITZ.x, RITZ.z, -100, 450], [-100, 450, ALTENWALDE.x, ALTENWALDE.z], [ALTENWALDE.x, ALTENWALDE.z, -150, 900],
  [DUHNEN.x, DUHNEN.z, -380, 380], [-380, 380, ALTENWALDE.x, ALTENWALDE.z], [-100, 450, 330, 600],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => segD(x, z, ax, az, bx, bz)));

/** The two landing places: where the shore is, and the way inland. */
const beachAt = (x: number) => { const z = waterlineZ(Dr, x); return { x, z, ...shoreFrame(Dr, x, z + 4) }; };
const DOSE = beachAt(-110), LIEBE = beachAt(262);
const up = (b: ReturnType<typeof beachAt>, along: number, inl: number) => ({ x: b.x + b.tx * along + b.nx * inl, z: b.z + b.tz * along + b.nz * inl });

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: DOSE.x, name: 'Döse strand', inland: { name: 'Ritzebüttel', ...RITZ } },
  { x: LIEBE.x, name: 'The Alte Liebe', inland: { name: 'Cuxhaven', ...CUX } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The Cuxhaven roads', x: -220, z: -760, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, ...up(DOSE, 0, 46), owner: null, sector: 'west', radius: 55, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, ...up(LIEBE, 0, 40), owner: null, sector: 'east', radius: 45, opens: 'F' },
  { id: 'E', name: 'Ritzebüttel', x: RITZ.x, z: RITZ.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Cuxhaven', x: CUX.x, z: CUX.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Altenwalde', x: ALTENWALDE.x, z: ALTENWALDE.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const CASTLE = { x: RITZ.x + 70, z: RITZ.z - 20 };             // Ritzebüttel castle: the brick keep in its moat
const BAKE = { ...up(LIEBE, -60, 22) };                         // the Kugelbake: the timber beacon on the corner

/** The Wernerwald and the heath copses on the Geest, willows round the farms of the marsh (0..1). */
const woods = (x: number, z: number) => {
  const d = D(x, z);
  if (d < 80) return 0;
  let k = smoothstep(0.4, 0.6, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.12 + 0.78 * smoothstep(GEEST, GEEST + 200, z - 0.25 * x));
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  k = Math.min(k, smoothstep(20, 40, Math.hypot(x - CASTLE.x, z - CASTLE.z)), smoothstep(110, 140, Math.hypot(x - CUX.x - 20, z - CUX.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'cuxhaven',
  name: 'Cuxhaven 1805',
  description: 'The Elbe mouth, November 1805: Cathcart’s British and Tolstoy’s Russians come ashore from the Cuxhaven roads to strike at Hanover. The corner of land where the Elbe meets the North Sea: the Döse strand under the sea dyke, the Kugelbake and the Alte Liebe pier, Cuxhaven round its harbour on the Elbe bank, the marsh round Ritzebüttel castle, and the Geest woods at Altenwalde.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'europe',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb', 'ru'] }, // (the map names gb, so it fields though gb's regions leave out Germany — GameEngine armiesOn)
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' }, // (a grey November day on the Elbe)
  wind: { from: 290, speed: 6, veer: 0.2 }, // (a raw north-westerly off the North Sea)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1805_1117,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1805_8, cell: 80, weights: [0.45, 0.3, 0.1, 0.15] }), // (November: the marsh in pasture, the Geest ploughed)

  theme: {
    // a low grey sky over the North Sea, a wet light
    fogColor: 0xa4aaa8, fogDensity: 0.0006,
    skyTop: 0x6e7c88, skyHorizon: 0xb4bab8, skyBottom: 0x8a9088,
    sunColor: 0xece8dc, sunIntensity: 1.75, sunDisk: 0.2,
    clouds: 0.75, cloudLight: 0xd8dad6, cloudDark: 0x8a9096,
    sunDir: [0.3, 0.45, -0.6],
    hemiSky: 0xc4ccd2, hemiGround: 0x7a7a5e, hemiIntensity: 1.5,
    rimColor: 0xd4d6d2, rimIntensity: 0.2,
    terrain: {
      grass: '#6e7a48', grassAlt: '#667242', dryGrass: '#8e8a5a', dirt: '#6e5a44', rock: '#86827a',
      pasture: '#6a7a44', ploughed: '#5e4a38', stubble: '#9a8a5e', meadow: '#64743e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = D(x, z);
        if (pierD(x, z) < 3 && d < 0) return [0x5a4a38, 1];
        if (d < 0 || inBasin(x, z)) return [y > -1.2 ? 0x9a9686 : 0x6a7068, 1];              // the grey silt under the water
        if (x > 300 && z > -60 && z < 200 && d < 24) return [0x8e8a80, 0.9];                  // the quays
        if (d < 32) return [0xc8bc9a, 1];                                                     // the beach
        if (roadDist(x, z) < 3) return [0x8e7e62, 0.85];                                      // the muddy roads
        if (d < 80) return dykeK(x, z) > 0.5 ? [0x627a40, 0.8] : [0xb8ae88, 0.6];             // the dyke's turf / the dunes' sand and marram
        if (z - 0.25 * x < GEEST - 40) { // the marsh ditches (Wettern), every field edged with water
          const u = (x + fbm(noise, z * 0.004, 1.3, 2) * 30 + 2000) % 90;
          if (u < 1.6) return [0x4a5a52, 0.85];
        } else if (fbm(noise, x * 0.008 - 5, z * 0.008, 2) > 0.35) return [0x7a6248, 0.5];  // the heather on the Geest, gone brown
        return null;
      },
    },
  },

  bases: { nato: { x: -150, z: 830, entries: [-380, -120, 200] }, pact: { x: -200, z: -830, entries: SECTORS.map((s) => s.x) } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 300 }, pact: { x: 60, z: -260 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' }, // (the transports' flatboats and launches)
    launchZ: 700,
    surf: 0.3, // (a November swell in the Elbe mouth)
    signal: { t: 25, say: 'The signal from the flagship — the boats pull for Döse strand and the Alte Liebe', sayOther: 'Boats from the transports in the roads: they are coming ashore' },
    navy: ['frigate', 'destroyer'],
    // the coast's guns: the battery by the Kugelbake over the harbour mouth, a battery on the dyke at Döse, field guns in Duhnen's dunes
    forts: [
      { unit: 'shoreBattery', ...up(LIEBE, -40, 46), facing: Math.PI },
      { unit: 'shoreBattery', ...up(DOSE, 110, 66), facing: Math.PI },
      { unit: 'artillery', ...up(DOSE, -170, 95), facing: Math.PI },
    ],
    // breastworks on the dyke's crest, abatis at the back of the sand
    works: [
      ...[-50, 0, 50].map((dx) => ({ kind: 'trench', ...up(DOSE, dx, 74), yaw: DOSE.yaw })),
      ...[-48, -32, -16, 16, 32, 48].map((dx) => ({ kind: 'wire', ...up(DOSE, dx, 36), yaw: DOSE.yaw })),
      ...[-28, 28].map((dx) => ({ kind: 'trench', ...up(LIEBE, dx, 66), yaw: LIEBE.yaw })),
      ...[-30, -16, 16, 30].map((dx) => ({ kind: 'wire', ...up(LIEBE, dx, 32), yaw: LIEBE.yaw })),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    // the garrison comes down off the Geest from Altenwalde across the marsh
    counter: { t: 160, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'The column from Altenwalde is coming down off the Geest — drive them into the Elbe!', sayOther: 'French columns crossing the marsh from Altenwalde — hold the dyke!' },
    hold: [...[-30, 30].map((dx) => up(DOSE, dx, 74)), ...[-24, 24].map((dx) => up(LIEBE, dx, 66)), RITZ, CUX, DUHNEN],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 700, beachIncome: 0.8, defenceCp: 1100, defenceIncome: 1.3 },
    waves: [
      // the first wave: the King's German Legion's light battalions and the Guards' flank companies
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'guard', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'atTeam', sector: 1 }, { unit: 'rifles', sector: 1 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns over the bar', units: [{ unit: 'artillery', sector: 0 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'Tolstoy’s Russians are coming ashore', units: [{ unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 0 }, { unit: 'reconVehicle', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1805_1118);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && D(x, z) > 90 + rr;
    const clearOf = (x: number, z: number, rr: number) => points.every((p) => Math.hypot(p.x - x, p.z - z) > 18 + rr);

    // ---- Ritzebüttel castle: the brick keep with its stepped gables and the low hall, in a square moat
    const g0 = terrain.heightAt(CASTLE.x, CASTLE.z), BRICK = 0x8a4a38;
    props.box('stone', CASTLE.x, g0 + 7, CASTLE.z, 12, 15, 12, 0.2, BRICK);
    props.box('plain', CASTLE.x, g0 + 16, CASTLE.z, 12.6, 3, 12.6, 0.2, 0x4a3a34);                  // the roof
    props.box('stone', CASTLE.x - 12, g0 + 3, CASTLE.z + 4, 14, 6, 9, 0.2, 0x9a5a44);                // the hall
    for (const [dx, dz, sx, sz] of [[0, -16, 34, 3], [0, 16, 34, 3], [-16, 0, 3, 34], [16, 0, 3, 34]]) props.box('plain', CASTLE.x + dx, g0 - 0.4, CASTLE.z + dz, sx, 0.3, sz, 0.2, 0x3e5050); // the moat's water
    props.cover.addBox({ x: CASTLE.x, z: CASTLE.z, yaw: 0.2, length: 12, thickness: 12, height: 15 });

    // ---- the Kugelbake: the timber beacon on the corner, its ball on top; the Alte Liebe's timber pier
    const gb0 = terrain.heightAt(BAKE.x, BAKE.z), TIMBER = 0x4a3a2a;
    for (const [dx, dz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) props.box('plain', BAKE.x + dx * 0.6, gb0 + 7, BAKE.z + dz * 0.6, 0.5, 14, 0.5, 0, TIMBER, dz * 0.07, -dx * 0.07);
    props.box('plain', BAKE.x, gb0 + 15, BAKE.z, 2.4, 2.4, 2.4, 0.78, TIMBER);
    for (let i = 0; i <= 9; i++) { const x = PIER[0] + (PIER[2] - PIER[0]) * i / 9, z = PIER[1] + (PIER[3] - PIER[1]) * i / 9; if (D(x, z) < 2) props.box('plain', x, 2.2, z, 4, 0.6, 10, Math.atan2(PIER[2] - PIER[0], PIER[3] - PIER[1]), TIMBER); }

    // ---- the villages: Duhnen in the dunes, Ritzebüttel by the castle, Altenwalde on the Geest; Cuxhaven's houses round the harbour
    for (const [p, seed] of [[DUHNEN, 18051], [P.E, 18052], [P.K, 18053]] as const) buildVillage(props, p, seed);
    props.rand = mulberry32(1805_1119);
    props.church({ x: P.K.x + 34, z: P.K.z + 26, yaw: 0.3 });
    props.church({ x: P.E.x - 32, z: P.E.z + 28, yaw: Math.PI / 2 });
    props.church({ x: CUX.x - 40, z: CUX.z + 60, yaw: 0.2 });
    for (let i = 0, n = 0; i < 700 && n < 34; i++) {
      const a = r() * Math.PI * 2, rr = 26 + r() * 100, x = CUX.x + 20 + Math.cos(a) * rr * 0.8, z = CUX.z + Math.sin(a) * rr;
      if (roadDist(x, z) < 8 || !clearOf(x, z, 8) || D(x, z) < 26 || inBasin(x + 6, z) || inBasin(x - 6, z) || Math.hypot(x - CUX.x + 40, z - CUX.z - 60) < 16) continue;
      n++;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + 0.2, width: 7 + r() * 3, depth: 8, storeys: r() < 0.5 ? 2 : 1, name: 'harbour house', damaged: 0 });
    }
    // the windmill on the Geest edge: a brick tower, its sails
    const M = { x: -60, z: 560 }, gm = terrain.heightAt(M.x, M.z);
    props.box('stone', M.x, gm + 5, M.z, 5, 10, 5, 0, 0x8a6a54);
    props.box('plain', M.x, gm + 10.5, M.z, 5.6, 2, 5.6, 0, 0x4a3a2e);
    for (const a of [0.4, 0.4 + Math.PI / 2]) props.box('plain', M.x, gm + 10, M.z - 3.2, 0.5, 15, 0.15, 0, 0xc8bca0, 0, a);
    props.cover.addBox({ x: M.x, z: M.z, yaw: 0, length: 5, thickness: 5, height: 10 });
    // marsh farms (Höfe) on their mounds, the big thatched hall-houses
    for (let i = 0, n = 0; i < 500 && n < 18; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = -40 + r() * 760;
      if (!free(x, z, 10) || !clearOf(x, z, 52) || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 45 || Math.hypot(x - M.x, z - M.z) < 20 || Math.hypot(x - CUX.x, z - CUX.z) < 150 || Math.hypot(x - DUHNEN.x, z - DUHNEN.z) < 40) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 9 + r() * 4, depth: 14, storeys: 1, name: 'hall-house', damaged: 0 });
    }
    // fishing smacks drawn up on the sand at Duhnen, ships in the harbour basin
    for (let i = 0; i < 4; i++) { const x = -330 + i * 9, z = waterlineZ(D, x) + 18; props.box('plain', x, terrain.heightAt(x, z) + 0.4, z, 1.8, 0.7, 6, 0.3, 0x4a3a2c); }
    for (const [x0, z0] of [[355, 70], [395, 62]]) { props.box('plain', x0, -0.4, z0, 18, 2.4, 5, 0, 0x5a4432); props.box('plain', x0, 7, z0, 0.45, 13, 0.45, 0, 0x4a3a2a); }
    commandPost(props, this.bases.nato, -1, 0x5e6250);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: CASTLE.x, z: CASTLE.z, r: 22 }, { x: M.x, z: M.z, r: 8 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || D(x, z) < 80 }];
    // beech, oak and pine in the Wernerwald, willows by the marsh farms — in November mostly bare
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2200, broadleaf: 0.6, autumn: 1, maxY: 60,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.8, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => D(x, z) < 34 || inBasin(x, z) }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
