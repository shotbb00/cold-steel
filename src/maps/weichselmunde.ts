// Weichselmünde, May 1807 (coastal, the 1806 epoch: the Russians land, the French hold; 1.0 × 1.8 km). With Danzig
// besieged since March, Bennigsen shipped Kamensky’s relief corps — some 8,000 Russians and Prussians — from Pillau
// to the Vistula mouth. They came ashore at Neufahrwasser and under the guns of Weichselmünde, the fort that still
// held for the garrison, and on 15 May attacked up the Holm and the Nehrung against the French lines that cut the
// city off from the sea; Lannes and Oudinot’s grenadiers came over from the siege camp and threw them back, and
// Danzig capitulated nine days later.
// On the map the Baltic is the -z side (the landing comes from the sea): the long sand shore with Brösen’s fishing
// strand to the west, the Vistula’s mouth in the middle with Weichselmünde’s square fort and its round tower on the
// east bank, the dunes and pines of the Nehrung to the east. Inland the Vistula comes up from Danzig with the Holm
// island in its fork (the Holm bridge and the ferry by the fort; a bridge of boats up by the siege camp), the harbour
// town of Neufahrwasser west of it, Heubude among the Nehrung pines east, and Lefebvre’s siege lines across the
// south where the French come from.
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
const noise = createNoise2D(1807_0515);
const sea = createSea({ level: 0, size: SIZE, color: 0x3c6874 }); // (the grey-green Baltic in May)

/** The waterline (world z; the Baltic toward -z): a long, nearly straight sand shore. */
export const shoreZ = (x: number) => -170 + 0.00004 * x * x + fbm(noise, x * 0.004, 2.1, 2) * 10;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Vistula: its line (x at z), wider toward its mouth. */
const vX = (z: number) => -60 + 45 * Math.sin(z * 0.004 + 0.3) + 10 * Math.sin(z * 0.011);
const vHalf = (z: number) => 13 + 9 * smoothstep(-20, -170, z);
/** The west arm round the Holm (z 120..560): how far west of the Vistula. */
const ARM = { z0: 120, z1: 560, w: 150 };
const armOff = (z: number) => (z > ARM.z0 && z < ARM.z1 ? ARM.w * Math.sin(Math.PI * (z - ARM.z0) / (ARM.z1 - ARM.z0)) : -1e9);
/** The crossings: on the Vistula the ferry by the fort, the Holm bridge, the siege camp’s bridge of boats; one bridge over the west arm. */
const CROSS = [{ name: 'Weichselmünde ferry', z: -40 }, { name: 'Holm bridge', z: 340 }, { name: 'Bridge of boats', z: 660 }];
const ARM_CROSS = 340;
const crossK = (z: number) => Math.max(...CROSS.map((c) => smoothstep(14, 7, Math.abs(z - c.z))));
const armCrossK = (z: number) => smoothstep(14, 7, Math.abs(z - ARM_CROSS));
/** < 0 in the Vistula’s water (and in the west arm’s). */
const vis = (x: number, z: number) => Math.abs(x - vX(z)) - vHalf(z);
const arm = (x: number, z: number) => Math.abs(x - (vX(z) - armOff(z))) - 10;

const HOLM = { x: vX(340) - 75, z: 340 };
function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: a bar where the surf breaks, then shelving away
    const s = -d, bar = 0.5 * Math.exp(-(((s - 40) / 14) ** 2));
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  // the dunes: low on the west strand, high and broad on the Nehrung (east of the river)
  const east = smoothstep(vX(z) + 30, vX(z) + 200, x);
  const dunes = (2.2 + 4.5 * east + fbm(noise, x * 0.012, 3.7, 2) * 2) * Math.exp(-(((d - 55) / (16 + 20 * east)) ** 2));
  // the Nehrung’s rolling sand under the pines, the flat Werder and the Holm’s meadows by the river
  const land = 2.2 + smoothstep(60, 260, d) * 1.2 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.2
    + east * (2.5 + 3 * Math.max(0, fbm(noise, x * 0.009 + 5, z * 0.009, 3))) * smoothstep(90, 200, d)
    + smoothstep(500, 860, d) * 4;
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 14 * smoothstep(60, 200, d);
  // the Vistula and the west arm: beds too deep to wade, but at the crossings (a causeway under each bridge)
  const b = vis(x, z);
  if (b < 30) {
    const bed = -1.8 + 2.1 * crossK(z);
    h += (Math.min(h, bed) - h) * smoothstep(16, 0, b);
  }
  const a = arm(x, z);
  if (a < 24) {
    const bed = -1.6 + 1.9 * armCrossK(z);
    h += (Math.min(h, bed) - h) * smoothstep(12, 0, a);
  }
  return h;
}

/** Soft going: the beach sand, the Nehrung’s loose dune sand, the river mud. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 35) return foot ? 0.85 : 0.6;
  if (vis(x, z) < 7 || arm(x, z) < 5) return foot ? 0.7 : 0.45;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -330, name: 'Brösen strand', inland: { name: 'Neufahrwasser', x: -370, z: 170 } },
  { x: 70, name: 'Weichselmünde', inland: { name: 'The Holm', x: HOLM.x, z: HOLM.z } },
  { x: 350, name: 'The Nehrung dunes', inland: { name: 'Heubude', x: 300, z: 390 } },
];
const FORT = { x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 60 }; // (Weichselmünde: the beach point sits in the fort’s yard)
const CAMP = { x: 150, z: 720 };

/** The tracks: the strand lane, the fort’s road up the east bank to the Holm bridge, Neufahrwasser to Danzig, the Nehrung road to Heubude and the camp. */
const ROADS: number[][] = [
  [-520, -75, -330, -70], [-330, -70, vX(-40) - 25, -40], [vX(-40) - 25, -40, vX(-40) + 25, -40], [vX(-40) + 25, -40, FORT.x, FORT.z],
  [FORT.x, FORT.z, 340, -55], [340, -55, 520, -50],
  [-330, -70, -370, 170], [-370, 170, -320, 520], [-320, 520, -260, 900],
  [-370, 170, vX(340) - ARM.w - 20, 340], [vX(340) - ARM.w - 20, 340, vX(340) + 25, 340],
  [FORT.x, FORT.z, vX(150) + 40, 150], [vX(150) + 40, 150, vX(340) + 25, 340], [vX(340) + 25, 340, 300, 390],
  [340, -55, 300, 390], [300, 390, CAMP.x, CAMP.z], [CAMP.x, CAMP.z, vX(660) + 25, 660], [vX(660) + 25, 660, vX(660) - 25, 660], [vX(660) - 25, 660, -320, 520],
  [CAMP.x, CAMP.z, 0, 900],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'The transports off the bar', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: FORT.x, z: FORT.z, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 46, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Neufahrwasser', x: SECTORS[0].inland.x, z: SECTORS[0].inland.z, owner: null, sector: 'west' },
  { id: 'F', name: 'The Holm', x: HOLM.x, z: HOLM.z, owner: null, sector: 'centre', radius: 45 },
  { id: 'G', name: 'Heubude', x: SECTORS[2].inland.x, z: SECTORS[2].inland.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Lefebvre’s siege camp', x: CAMP.x, z: CAMP.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));

/** The Nehrung’s pine woods east of the river, alder and willow along the arms, a few copses on the Werder (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 75) return 0;
  const east = smoothstep(vX(z) + 60, vX(z) + 220, x);
  let k = smoothstep(0.4, 0.6, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.25 + 0.6 * east);
  const b = vis(x, z), a = arm(x, z);
  if ((b > 10 && b < 20 && crossK(z) < 0.2) || (a > 8 && a < 16 && armCrossK(z) < 0.2)) k = Math.max(k, 0.5);
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'weichselmunde',
  name: 'Weichselmünde 1807',
  description: 'Danzig, May 1807: Kamensky’s Russian relief corps lands at the Vistula mouth under Weichselmünde’s guns and attacks up the Holm and the Nehrung into Lefebvre’s siege lines. Brösen’s strand, the fort and its round tower, the Holm in the river’s fork, Neufahrwasser and Heubude among the pines.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'east',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Russia' },
  armies: { nato: ['fr'], pact: ['ru', 'pr'] }, // (Lefebvre’s X Corps against Kamensky’s Russians, with Prussians of the garrison)
  airfields: [],
  conditions: { time: 'day', weather: 'overcast' }, // (a raw Baltic May morning)
  wind: { from: 320, speed: 4, veer: 0.15 }, // (a north-westerly off the sea)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1807_0515,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1807_5, cell: 70, weights: [0.35, 0.3, 0.2, 0.15] }), // May: young rye, pasture on the Werder

  theme: {
    // a cool Baltic spring: grey-blue sky off the sea, a thin haze, the trees just leafing
    fogColor: 0xb4bcc0, fogDensity: 0.0008,
    skyTop: 0x6a86a4, skyHorizon: 0xc6d0d4, skyBottom: 0x7a8278,
    sunColor: 0xf6eedc, sunIntensity: 1.7, sunDisk: 0.3,
    clouds: 0.6, cloudLight: 0xe2e6e8, cloudDark: 0x86909a,
    sunDir: [0.45, 0.5, 0.7],
    hemiSky: 0xc4d0dc, hemiGround: 0x4c5038, hemiIntensity: 1.3,
    rimColor: 0xc8d2dc, rimIntensity: 0.25,
    terrain: {
      grass: '#5e7040', grassAlt: '#526438', dryGrass: '#8a8458', dirt: '#5a4a38', rock: '#6e6a62',
      pasture: '#62743e', ploughed: '#5e4c38', stubble: '#8a8058', meadow: '#5a7a3c',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) return [y > -1.2 ? 0xc8bea0 : 0x7a8478, 1];                        // the sand under the water
        if (d < 32) return [0xdcd2b2, 1];                                              // the beach
        if (vis(x, z) < 6 || arm(x, z) < 4) return [0x5a5040, 0.9];                     // the river mud
        if (roadDist(x, z) < 3) return [0x8e7c62, 0.8];                                // the sandy tracks
        if (d < 80) return [0xc4bc98, 0.6];                                            // the dunes’ loose sand and marram
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 0, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the Russians land: their roads are the beach sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 400 }, pact: { x: 0, z: -140 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the transports’ boats: the foot in flatboats, the guns in the launches
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.25, // (a short Baltic chop on the bar)
    signal: { t: 25, say: 'The boats are away from the transports — pull for the shore under the fort’s guns', sayOther: 'Boats off the Vistula mouth: the Russian relief is landing!' },
    // the escort’s frigate and sloops close in to cover the boats
    navy: ['frigate', 'destroyer'],
    // the French guns on the coast: a battery on the Brösen dunes, one on the west bank of the mouth, one dug into the Nehrung dunes
    forts: [
      { unit: 'shoreBattery', x: -250, z: shoreZ(-250) + 60, facing: Math.PI },
      { unit: 'shoreBattery', x: vX(-60) - 55, z: shoreZ(vX(-60) - 55) + 55, facing: Math.PI },
      { unit: 'artillery', x: 300, z: shoreZ(300) + 100, facing: Math.PI },
    ],
    // entrenchments behind the dunes, felled trees along the back of the sand
    works: [
      ...SECTORS.flatMap((s) => (s === SECTORS[1] ? [-75, 75] : [-45, 0, 45]).map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 66, yaw: 0 }))),
      ...[SECTORS[0], SECTORS[2]].flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 34, yaw: 0 }))),
    ],
    // the Poles and Saxons of the siege corps on the coast, the rest in Neufahrwasser, on the Holm and at Heubude
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Chasseurs à cheval polonais' },
    // Lannes brings Oudinot’s grenadiers over from the siege camp
    counter: { t: 160, units: ['rifles', 'atTeam', 'reconVehicle', 'ifv', 'artillery'], say: 'Oudinot’s grenadiers are over the bridge of boats — Lannes leads them at the landing!', sayOther: 'French grenadiers coming from the siege camp — hold the dunes!' },
    hold: [
      ...[SECTORS[0], SECTORS[2]].flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 66 }))),
      { x: FORT.x - 30, z: FORT.z + 60 }, { x: FORT.x + 30, z: FORT.z + 60 },
      ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z })),
    ],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'atTeam', 'artillery', 'rifles', 'sniper', 'mgTeam', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 650, defenceIncome: 0.8 },
    waves: [
      // the first wave: jägers and musketeers of Kamensky’s corps, the Prussian fusiliers of the garrison
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'atTeam', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'sniper', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'The grenadiers are coming ashore', units: [{ unit: 'atTeam', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1807_0516);
    sea.build(scene, terrain);
    const wet = (x: number, z: number, rr: number) => vis(x, z) < 12 + rr || arm(x, z) < 10 + rr;
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && !wet(x, z, rr) && inland(x, z) > 80 + rr;
    /** A wall from (x0, z0) to (x1, z1). */
    const wallSeg = (x0: number, z0: number, x1: number, z1: number, h: number, t = 1.2) => props.wall({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0), length: Math.hypot(x1 - x0, z1 - z0) + 0.4, height: h, thickness: t });

    // ---- Weichselmünde: a square bastioned fort round the old round tower (gates to the sea and up the river road)
    {
      const S = 30, h = 3.2, cx = FORT.x, cz = FORT.z;
      for (const [side, x0, z0, x1, z1] of [['n', -S, -S, S, -S], ['s', -S, S, S, S], ['w', -S, -S, -S, S], ['e', S, -S, S, S]] as const) {
        if (side === 'e') { wallSeg(cx + x0, cz + z0, cx + x1, cz + z1, h); continue; }
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ux = Math.sign(x1 - x0) * 8, uz = Math.sign(z1 - z0) * 8;
        wallSeg(cx + x0, cz + z0, cx + mx - ux, cz + mz - uz, h);
        wallSeg(cx + mx + ux, cz + mz + uz, cx + x1, cz + z1, h);
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = cx + sx * S, z = cz + sz * S, tx = x + sx * 12, tz = z + sz * 12;
        wallSeg(x, z - sz * 12, tx, tz, h);
        wallSeg(x - sx * 12, z, tx, tz, h);
      }
      // the round tower (the old lighthouse) in the north-east corner of the yard, clear of the point’s centre
      const tx = cx + 17, tz = cz - 17, g = terrain.heightAt(tx, tz);
      for (let k = 0; k < 8; k++) props.box('stone', tx, g + 6, tz, 7.2, 12, 7.2, (k / 8) * Math.PI / 2, 0x8a5a48);
      props.box('stone', tx, g + 12.6, tz, 8.6, 1.2, 8.6, 0, 0x5a3a2a);
      props.box('stone', tx, g + 14.2, tz, 3, 2.2, 3, 0, 0xe0dccc); // (the lantern)
      props.cover.addBox({ x: tx, z: tz, yaw: 0, length: 8, thickness: 8, height: 12 });
      props.rand = mulberry32(1807_0517);
      props.hall({ x: cx - 16, z: cz + 18, yaw: 0, width: 16, depth: 7, height: 4, color: 0x8a7c66, roof: 0x4a3a2e, door: 3, name: 'casemate' });
    }

    // ---- Neufahrwasser: the harbour town on the west bank; Heubude among the pines; Brösen’s fishermen
    const rr = mulberry32(1807_051);
    const taken: number[][] = [];
    for (let i = 0; i < 300 && taken.length < 26; i++) {
      const x = P.E.x - 90 + rr() * 180, z = P.E.z - 70 + rr() * 150;
      if (!free(x, z, 6) || Math.hypot(x - P.E.x, z - P.E.z) < 24 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 14)) continue;
      taken.push([x, z]);
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.abs(x - P.E.x) > Math.abs(z - P.E.z) ? Math.PI / 2 : 0, width: 7 + rr() * 2, depth: 9, storeys: rr() < 0.6 ? 2 : 1, damaged: 0 });
    }
    props.rand = mulberry32(1807_052);
    props.church({ x: P.E.x + 30, z: P.E.z + 40, yaw: 0 });
    for (const [p, seed] of [[P.G, 18071], [P.F, 18072]] as const) buildVillage(props, p, seed);
    buildVillage(props, { x: SECTORS[0].x - 60, z: shoreZ(SECTORS[0].x - 60) + 110 }, 18073); // (Brösen)
    for (let i = 0; i < 5; i++) props.box('plain', -420 + i * 9, terrain.heightAt(-420 + i * 9, shoreZ(-420) + 18) + 0.4, shoreZ(-420 + i * 9) + 18, 1.6, 0.6, 5, 0.3, 0x5a4434); // (boats on the strand)

    // ---- the bridges: plank decks with rails over the causeways
    const bridge = (x0: number, x1: number, z: number) => {
      const y = Math.max(terrain.heightAt((x0 + x1) / 2, z), 0.3) + 0.15;
      props.box('plain', (x0 + x1) / 2, y, z, Math.abs(x1 - x0), 0.25, 7, 0, 0x6a5440);
      for (const s of [-1, 1]) props.box('plain', (x0 + x1) / 2, y + 0.6, z + s * 3.4, Math.abs(x1 - x0), 0.12, 0.15, 0, 0x5a4434);
    };
    for (const c of CROSS) bridge(vX(c.z) - vHalf(c.z) - 3, vX(c.z) + vHalf(c.z) + 3, c.z);
    bridge(vX(ARM_CROSS) - armOff(ARM_CROSS) - 13, vX(ARM_CROSS) - armOff(ARM_CROSS) + 13, ARM_CROSS);

    // ---- Lefebvre’s siege lines: the parallel and its batteries across the south, the camp’s tents
    for (const [x0, x1] of [[-460, -340], [-220, vX(560) - 30], [vX(560) + 30, 60], [240, 340]] as const) props.wall({ x: (x0 + x1) / 2, z: 560 + (x0 + x1) * 0.02, yaw: 0, length: x1 - x0, height: 1.3, thickness: 1.4 });
    for (const [x, z] of [[-380, 540], [-150, 550], [260, 570]] as const) props.sandbagRing({ x, z, radius: 6, toward: -1 });
    for (let i = 0; i < 10; i++) { const x = CAMP.x - 70 + (i % 5) * 30, z = CAMP.z + 40 + Math.floor(i / 5) * 18; if (roadDist(x, z) > 6) props.tent({ x, z, yaw: 0.1, color: 0xd8d0b8 }); }
    // farms on the Werder
    for (let i = 0, n = 0; i < 400 && n < 14; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 60 + r() * 760;
      if (!free(x, z, 10) || points.some((p) => Math.hypot(p.x - x, p.z - z) < 70)) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 8 + r() * 3, depth: 7, storeys: 1, name: 'farmhouse', damaged: 0 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: FORT.x, z: FORT.z, r: 48 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || wet(x, z, 0) || inland(x, z) < 60 }];
    // pines on the Nehrung, alders and willows along the arms, birch and oak copses on the Werder
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2400, broadleaf: 0.35, autumn: 0, maxY: 60,
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
