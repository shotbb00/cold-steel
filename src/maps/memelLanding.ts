// Memel, 1807 (hypothetical; coastal, the 1806 epoch: the Prussians and Russians land, the French hold; 1.0 × 1.8 km).
// Memel was the last corner of the kingdom: Frederick William III and Queen Louise held their court there through the
// winter of 1806–07, and the French never reached it before Tilsit. On this map they have, and the Prussians and
// Russians come back from the sea.
// On the map the Baltic is the -z side (the landing comes from the sea): the Memel Tief — the channel out of the
// Curonian Lagoon — down the west edge, with the bare dunes of the Curonian Spit’s tip (Sandkrug) across it; the
// mainland strand by the Tief’s mouth, the fishing suburb of Bommelsvitte, and Mellneraggen’s strand to the east.
// Inland the little Dange river winds west through the town into the Tief, with three crossings; the old Memelburg
// on its ring of ruined bastions at the Dange’s mouth, the old town round its market south of the river, Tauerlauken
// among the fields to the east. The French come from the Tilsit road in the south.
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
const noise = createNoise2D(1807_0708);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a6470 }); // (the cold green Baltic)

/** The waterline (world z; the Baltic toward -z). */
export const shoreZ = (x: number) => -170 + 0.00005 * (x - 50) ** 2 + fbm(noise, x * 0.004, 2.1, 2) * 9;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Memel Tief down the west edge (east bank at tX), the spit’s tip across it (west of -440, north of z 180). */
const tX = (z: number) => -345 - 12 * Math.sin(z * 0.01);
const SPIT = { x: -440, z: 180 };
/** Signed distance to the Tief’s water (< 0 in it). */
const spitX = (z: number) => SPIT.x - 520 * smoothstep(-60, SPIT.z + 120, z); // (the spit’s inner shore, falling away south-west)
const tiefW = (x: number, z: number) => Math.max(x - tX(z), spitX(z) - x);

/** The Dange: its line (z at x), winding west into the Tief; the three crossings. */
const dZ = (x: number) => 240 + 35 * Math.sin(x * 0.006 + 0.5) + 8 * Math.sin(x * 0.019);
const DCROSS = [{ name: 'Castle bridge', x: -170 }, { name: 'Börse bridge', x: 40 }, { name: 'Mill ford', x: 300 }];
const crossK = (x: number) => Math.max(...DCROSS.map((c) => smoothstep(14, 7, Math.abs(x - c.x))));
const dange = (x: number, z: number) => Math.abs(z - dZ(x)) - 11;

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: a bar where the surf breaks, then shelving away
    const s = -d, bar = 0.5 * Math.exp(-(((s - 40) / 14) ** 2));
    const sh = Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16), w = tiefW(x, z);
    return w < 16 ? sh + (Math.min(sh, -2.6) - sh) * smoothstep(14, -4, w) : sh; // (the channel dredged out through the bar)
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const spit = smoothstep(SPIT.x + 10, SPIT.x - 20, x) * smoothstep(SPIT.z + 60, -60, z);
  const dunes = (2.6 + 5 * spit + fbm(noise, x * 0.012, 3.7, 2) * 2) * Math.exp(-(((d - 55) / (17 + 30 * spit)) ** 2));
  // the low mainland: fields and meadows rising gently inland
  const land = 2.4 + smoothstep(60, 260, d) * 1.4 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.4 + smoothstep(400, 860, d) * 6;
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, x) * 14 * smoothstep(60, 200, d);
  // the Tief: deep water with a shelf at the edge
  const w = tiefW(x, z);
  if (w < 16) h += (Math.min(h, -2.6) - h) * smoothstep(14, -4, w);
  // the Dange: its bed too deep to wade but at the crossings (a causeway under each bridge, the ford)
  const b = dange(x, z);
  if (b < 24) {
    const bed = -1.7 + 2.0 * crossK(x);
    h += (Math.min(h, bed) - h) * smoothstep(12, 0, b);
  }
  return h;
}

/** Soft going: the beach sand and the river mud. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 35) return foot ? 0.85 : 0.6;
  if (dange(x, z) < 5) return foot ? 0.7 : 0.45;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

const CASTLE = { x: -255, z: dZ(-255) + 75 };
const TOWN = { x: 20, z: 400 };
/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -230, name: 'The Tief mouth', inland: { name: 'The Memelburg', x: CASTLE.x, z: CASTLE.z } },
  { x: 60, name: 'Bommelsvitte', inland: { name: 'Memel', x: TOWN.x, z: TOWN.z } },
  { x: 350, name: 'Mellneraggen strand', inland: { name: 'Tauerlauken', x: 320, z: 420 } },
];
const CAMP = { x: 0, z: 730 };

/** The tracks: the strand lane, the streets of the old town over the Dange bridges, the Tilsit road. */
const ROADS: number[][] = [
  [tX(-60) + 10, -60, -230, -60], [-230, -60, 60, -55], [60, -55, 350, -50], [350, -50, 520, -45],
  [-230, -60, -170, dZ(-170) - 20], [-170, dZ(-170) - 20, -170, dZ(-170) + 20], [-170, dZ(-170) + 20, CASTLE.x, CASTLE.z],
  [60, -55, 40, dZ(40) - 20], [40, dZ(40) - 20, 40, dZ(40) + 20], [40, dZ(40) + 20, TOWN.x, TOWN.z],
  [350, -50, 300, dZ(300) - 20], [300, dZ(300) - 20, 300, dZ(300) + 20], [300, dZ(300) + 20, 320, 420],
  [-170, dZ(-170) + 20, TOWN.x, TOWN.z], [TOWN.x, TOWN.z, 320, 420], [CASTLE.x, CASTLE.z, -240, 600], [-240, 600, CAMP.x, CAMP.z],
  [TOWN.x, TOWN.z, CAMP.x, CAMP.z], [320, 420, CAMP.x, CAMP.z], [CAMP.x, CAMP.z, 0, 900],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'The squadron off the Tief', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 48, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 42, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'The Memelburg', x: CASTLE.x, z: CASTLE.z, owner: null, sector: 'west', radius: 45 },
  { id: 'F', name: 'Memel', x: TOWN.x, z: TOWN.z, owner: null, sector: 'centre' },
  { id: 'G', name: 'Tauerlauken', x: 320, z: 420, owner: null, sector: 'east' },
  { id: 'K', name: 'The Tilsit road', x: CAMP.x, z: CAMP.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));

/** Copses of birch and alder along the Dange, pine on the dunes behind the strand, the old town clear (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 75 || tiefW(x, z) < 10) return 0;
  let k = smoothstep(0.42, 0.62, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.3 + 0.4 * smoothstep(250, 120, d));
  const b = dange(x, z);
  if (b > 7 && b < 16 && crossK(x) < 0.2) k = Math.max(k, 0.5);
  k = Math.min(k, smoothstep(120, 170, Math.hypot(x - TOWN.x, z - TOWN.z)));
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'memel-landing',
  name: 'Memel 1807',
  description: 'East Prussia, 1807 (hypothetical): the Prussians and Russians land to take back Memel, the king’s last refuge. The Memel Tief and the Curonian Spit’s tip, the strand at Bommelsvitte, the Dange winding through the old town to the ruined Memelburg.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'east',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Prussia' },
  armies: { nato: ['fr'], pact: ['pr', 'ru'] }, // (L’Estocq’s Prussians and the Russians; the French who would have come up the Tilsit road)
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' }, // (a grey Baltic summer day)
  wind: { from: 280, speed: 5, veer: 0.15 }, // (the westerly off the sea)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1807_0708,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1807_7, cell: 70, weights: [0.3, 0.3, 0.25, 0.15] }), // July: rye ripening, flax, hay meadows

  theme: {
    // a grey northern summer: low cloud off the sea, soft light
    fogColor: 0xb0bcc2, fogDensity: 0.0008,
    skyTop: 0x6a86a0, skyHorizon: 0xc2ccd2, skyBottom: 0x7a8278,
    sunColor: 0xf2ecdc, sunIntensity: 1.6, sunDisk: 0.25,
    clouds: 0.7, cloudLight: 0xdfe4e8, cloudDark: 0x848e98,
    sunDir: [0.4, 0.5, 0.7],
    hemiSky: 0xc0ccd8, hemiGround: 0x4e5438, hemiIntensity: 1.35,
    rimColor: 0xc8d2dc, rimIntensity: 0.25,
    terrain: {
      grass: '#5e7242', grassAlt: '#52663a', dryGrass: '#8a8458', dirt: '#5a4a38', rock: '#6e6a62',
      pasture: '#62763e', ploughed: '#5e4c38', stubble: '#9a8c5a', meadow: '#5a7c3e',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0 || tiefW(x, z) < 0) return [y > -1.2 ? 0xc8bea0 : 0x76807a, 1];      // the sand under the water
        if (d < 32) return [0xdcd2b2, 1];                                              // the beach
        if (tiefW(x, z) < 5) return [0xc0b494, 0.8];                                   // the Tief’s sandy edge
        if (x < spitX(z) + 5) return [0xcec4a0, 0.8];                                    // the spit’s bare dunes
        if (dange(x, z) < 4) return [0x5a5040, 0.9];                                   // the river mud
        if (roadDist(x, z) < 3) return [0x8a7a62, 0.8];                                // the tracks and streets
        if (d < 80) return [0xc4bc98, 0.6];                                            // the dunes’ loose sand and marram
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-220, 0, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the allies land: their roads are the beach sectors)
  maxStacks: 30, // (the old town’s houses make Memel a hard nut: a few more companies ashore than at Maida)
  cameraStart: { nato: { x: 0, z: 420 }, pact: { x: 0, z: -140 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the transports’ boats: the foot in flatboats, the guns in the launches
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.3, // (a westerly swell on the bar)
    signal: { t: 25, say: 'The boats are away — pull for the strand at Bommelsvitte', sayOther: 'Boats off the Tief: they are landing!' },
    navy: ['frigate', 'destroyer'],
    // the French on the coast: a battery at the Tief’s mouth, one on the Bommelsvitte dunes, field guns at Mellneraggen
    forts: [
      { unit: 'shoreBattery', x: tX(-40) + 40, z: shoreZ(tX(-40) + 40) + 55, facing: Math.PI },
      { unit: 'shoreBattery', x: 140, z: shoreZ(140) + 60, facing: Math.PI },
      { unit: 'artillery', x: 420, z: shoreZ(420) + 95, facing: Math.PI },
    ],
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 66, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 34, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Chasseurs à cheval' },
    counter: { t: 160, units: ['rifles', 'atTeam', 'reconVehicle', 'ifv', 'artillery'], say: 'The column from Tilsit is over the Dange — at them before they are formed!', sayOther: 'French columns on the Tilsit road — hold the river!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 66 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'atTeam', 'artillery', 'rifles', 'sniper', 'mgTeam', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 650, defenceIncome: 0.8 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'atTeam', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'sniper', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 1 }, { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 2 }] },
      { t: 300, say: 'The second brigade is coming ashore', units: [{ unit: 'atTeam', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 2 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1807_0709);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && dange(x, z) > 8 + rr && tiefW(x, z) > 8 + rr && inland(x, z) > 80 + rr && x > SPIT.x + 20;
    /** A wall from (x0, z0) to (x1, z1). */
    const wallSeg = (x0: number, z0: number, x1: number, z1: number, h: number, t = 1.2) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height: h, thickness: t });

    // ---- the Memelburg: the Order’s old castle, its curtain and bastions half fallen (gaps where the walls are down)
    {
      const S = 28, cx = CASTLE.x, cz = CASTLE.z, rc = mulberry32(1807_0710);
      for (const [x0, z0, x1, z1] of [[-S, -S, S, -S], [-S, S, S, S], [-S, -S, -S, S], [S, -S, S, S]]) {
        for (let k = 0; k < 4; k++) { // (each curtain in four lengths, one in three tumbled down)
          if (rc() < 0.3 || (k === 1 && z0 === z1 && z0 < 0)) continue; // (and the north gate always open, to the river)
          const a = k / 4, b = (k + 1) / 4;
          wallSeg(cx + x0 + (x1 - x0) * a, cz + z0 + (z1 - z0) * a, cx + x0 + (x1 - x0) * b, cz + z0 + (z1 - z0) * b, 2.2 + rc() * 2);
        }
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = cx + sx * S, z = cz + sz * S, tx = x + sx * 11, tz = z + sz * 11;
        wallSeg(x, z - sz * 11, tx, tz, 3); wallSeg(x - sx * 11, z, tx, tz, 3);
      }
      const g = terrain.heightAt(cx - 16, cz + 16); // (the keep’s stump in the south-west corner, off the centre)
      props.box('stone', cx - 16, g + 5, cz + 16, 9, 10, 9, 0, 0x8a5e4a);
      props.cover.addBox({ x: cx - 16, z: cz + 16, yaw: 0, length: 9, thickness: 9, height: 10 });
    }

    // ---- the bridges over the Dange
    for (const c of DCROSS.slice(0, 2)) {
      const z0 = dZ(c.x) - 14, z1 = dZ(c.x) + 14, y = Math.max(terrain.heightAt(c.x, dZ(c.x)), 0.3) + 0.15;
      props.box('plain', c.x, y, (z0 + z1) / 2, 7, 0.25, z1 - z0, 0, 0x6a5440);
      for (const s of [-1, 1]) props.box('plain', c.x + s * 3.4, y + 0.6, (z0 + z1) / 2, 0.15, 0.12, z1 - z0, 0, 0x5a4434);
    }

    // ---- Memel: the old town round its market south of the Dange; Bommelsvitte’s fishermen; Tauerlauken
    const rr = mulberry32(1807_071);
    const taken: number[][] = [];
    for (let i = 0; i < 400 && taken.length < 44; i++) {
      const x = TOWN.x - 130 + rr() * 260, z = TOWN.z - 130 + rr() * 220;
      if (!free(x, z, 6) || Math.hypot(x - TOWN.x, z - TOWN.z) < 28 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 60 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: rr() < 0.5 ? 0 : Math.PI / 2, width: 7 + rr() * 2, depth: 9, storeys: rr() < 0.6 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(1807_072);
    props.church({ x: TOWN.x + 34, z: TOWN.z + 26, yaw: 0 });            // (St Johann)
    props.hall({ x: TOWN.x - 36, z: TOWN.z + 24, yaw: 0, width: 16, depth: 10, height: 8, color: 0x9a6a52, roof: 0x3e4a42, door: 4, name: 'Rathaus' });
    buildVillage(props, P.G, 18076);
    buildVillage(props, { x: SECTORS[1].x + 70, z: shoreZ(SECTORS[1].x + 70) + 110 }, 18077); // (Bommelsvitte)
    for (let i = 0; i < 5; i++) props.box('plain', 100 + i * 9, terrain.heightAt(100 + i * 9, shoreZ(100) + 18) + 0.4, shoreZ(100 + i * 9) + 18, 1.6, 0.6, 5, 0.3, 0x5a4434); // (boats on the strand)
    // farms in the fields
    for (let i = 0, n = 0; i < 400 && n < 12; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 60 + r() * 760;
      if (!free(x, z, 10) || points.some((p) => Math.hypot(p.x - x, p.z - z) < 80) || Math.hypot(x - TOWN.x, z - TOWN.z) < 170) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 8 + r() * 3, depth: 7, storeys: 1, name: 'farmhouse', damaged: 0 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: CASTLE.x, z: CASTLE.z, r: 46 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || dange(x, z) < 6 || tiefW(x, z) < 6 || inland(x, z) < 60 || x < SPIT.x + 10 }];
    // alders and birches along the Dange, pine copses behind the strand
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 1800, broadleaf: 0.55, autumn: 0, maxY: 60,
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
