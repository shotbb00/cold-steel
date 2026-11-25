// Kolberg, spring 1807 — HYPOTHETICAL (coastal, the 1806 epoch: the Prussians and the British land, the French hold;
// 1.0 × 1.8 km). After Jena Kolberg was one of the few Prussian fortresses that would not give up: Gneisenau,
// Nettelbeck's burghers and Schill's free corps held it from March to July 1807 against Loison's besiegers, fed and
// armed from the sea through the mouth of the Persante, with British and Swedish ships off the coast. A relief from
// the sea was talked of and never came; the map plays it, with the French already in the town.
// The ground is the real low Pomeranian coast, the Baltic the -z side (north). The shore lies far out: a long, low
// strand with no cliff and no draw, a single line of dunes behind it, and then the flat green plain a few metres over
// the sea, all the way to the siege camp. The Persante comes out of the plain in wide loops from the south-west and
// reaches the sea between the two stone moles of the Münde harbour, with the Münde fort on its east bank; west of the
// river the Maikuhle, the pine wood on the old dunes the French fought through. The town stands back from the sea on
// the east bank, a kilometre of meadow from the beach, in its bastioned ring under the Marienkirche. East of the
// harbour the Salzwiesen: the salt meadows and the brine ponds of the salt works, wet ground no gun crosses, with the
// east strand in front of them; beyond them, south-east, the Wolfsberg, the sand hill the French crowned with their
// siege batteries. Two ways in: the harbour mouth under the Münde fort, straight up the river road into the town, and
// the east strand, round the brine ponds to the Wolfsberg. The French reserve comes from the camp at Zernin, up the
// Belgard road from the south-west.
// Both shores are built to be fought from either side (the campaign plays a landing flipped: wcampaign/battle.js).
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
const noise = createNoise2D(1807_03);
const sea = createSea({ level: 0, size: SIZE, color: 0x3e6a78 }); // (the Baltic in May: cold, clear, grey-blue)

/** The waterline (world z; the sea toward -z): far out, the long low strand, the harbour mouth in it. */
export const shoreZ = (x: number) => -440 + 0.00003 * x * x + 12 * Math.sin(x * 0.004 + 1) + fbm(noise, x * 0.004, 2.1, 2) * 6;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Persante: its line (x at z), wide loops from the south-west down to the mouth between the moles. */
const MOUTH = -70;
const perX = (z: number) => MOUTH - 0.3 * (z + 440) + 45 * Math.sin((z + 440) * 0.0075) * smoothstep(-400, -200, z);
const FORDS = [{ name: 'The Lauenburg gate bridge', z: -60 }, { name: 'Sellnow ford', z: 360 }];
const fordK = (z: number) => Math.max(...FORDS.map((f) => smoothstep(26, 12, Math.abs(z - f.z))));
/** < 0 in the river's water (wider toward the mouth, the harbour between the moles). */
const per = (x: number, z: number) => Math.abs(x - perX(z)) - (9 + 14 * smoothstep(-250, -420, z));

const TOWN = { x: 40, z: -60 };       // Kolberg: the fortress town on the east bank, back from the sea
const WOLF = { x: 330, z: 120 };      // the Wolfsberg
const MAIK = { x: -330, z: -280 };    // the Maikuhle
const ZERNIN = { x: -200, z: 640 };   // the besiegers' camp, on the Belgard road
/** The brine ponds of the salt works on the Salzwiesen (x, z, rx, rz). */
const PONDS: number[][] = [[170, -250, 46, 26], [265, -205, 38, 30], [215, -150, 30, 18], [360, -260, 34, 22], [330, -140, 26, 20]];
const pondD = (x: number, z: number) => Math.min(...PONDS.map(([cx, cz, rx, rz]) => Math.hypot((x - cx) / rx, (z - cz) / rz)));
/** 0..1 on the salt meadows: low, wet ground east of the harbour. */
const saltK = (x: number, z: number) => smoothstep(90, 150, x) * smoothstep(470, 420, x) * smoothstep(-370, -330, z) * smoothstep(-60, -110, z);
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function heightRaw(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) {
    const s = -d, bar = 0.5 * Math.exp(-(((s - 45) / 14) ** 2));
    let h = Math.max(0.5 - s * 0.018 - Math.max(0, s - 140) * 0.035 + bar, -16);
    const m = Math.abs(x - MOUTH) - 30; // (the channel dredged out between the moles)
    if (m < 20 && s < 120) h = Math.min(h, -2.2 + 2 * smoothstep(0, 20, m));
    return h;
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const west = 1 - smoothstep(-260, -140, x);
  // one line of dunes, high and wooded in the Maikuhle, low in front of the salt meadows
  const dunes = (2.2 + 3.5 * west + fbm(noise, x * 0.012, 3.7, 2) * 1.6) * Math.exp(-(((d - 50) / (15 + 20 * west)) ** 2));
  // the plain: flat and green, a metre or two over the sea; the town's rise, the Wolfsberg's sand, the Maikuhle's old dunes
  let land = 2.2 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.3 + smoothstep(300, 1300, d) * 3
    + hill(x, z, WOLF.x, WOLF.z, 90, 14) + hill(x, z, TOWN.x, TOWN.z, 110, 2) + west * smoothstep(60, 140, d) * smoothstep(460, 300, d) * (2 + fbm(noise, x * 0.02, z * 0.02, 2) * 2.5);
  land -= saltK(x, z) * 1.3; // the salt meadows, barely over the sea
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  const pd = pondD(x, z);
  if (pd < 1.4) h += (-0.6 - h) * smoothstep(1.4, 1, pd); // the brine ponds
  const b = per(x, z);
  if (b < 40 && z > shoreZ(perX(z)) - 10) {
    const bed = -0.5 - 1.6 * (1 - fordK(z)) - 1.2 * smoothstep(-250, -420, z);
    h += (Math.min(h, bed) - h) * smoothstep(22, 0, b);
  }
  return h;
}
const heightC = gridCacheSmooth(heightRaw, BOUNDS, 2);
/** The moles of the Münde harbour: two stone piers out from the mouth (on top of the cached ground). */
const MOLES = [MOUTH - 32, MOUTH + 32];
const moleK = (x: number, z: number) => Math.max(...MOLES.map((mx) => smoothstep(6, 3.5, Math.abs(x - mx)))) * smoothstep(-110, -100, inland(x, z)) * smoothstep(20, 5, inland(x, z));
function height(x: number, z: number) {
  const h = heightC(x, z);
  if (Math.abs(x - MOUTH) > 40 || z > -380 || z < -600) return h;
  const mk = moleK(x, z);
  return mk > 0 ? h + (Math.max(h, 1.8) - h) * mk : h;
}

/** Soft going: the beach sand, the river mud, the salt meadows (wet). */
const softC = gridCache((x: number, z: number) => {
  const d = inland(x, z);
  if (d >= 0 && d < 35) return 0;
  if (per(x, z) < 9) return 1;
  return saltK(x, z) > 0.4 ? 2 : 3;
}, BOUNDS, 4);
function soft(x: number, z: number, foot: boolean) {
  const k = softC(x, z);
  if (k === 0) return foot ? 0.85 : 0.6;
  if (k === 1) return foot ? 0.7 : 0.45;
  if (k === 2) return foot ? 0.75 : 0.35;
  return 1;
}

const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const MUENDE = { x: MOUTH + 75, z: shoreZ(MOUTH + 75) + 80 };   // the Münde fort behind the harbour mouth, east bank
const EAST = { x: 330, z: shoreZ(330) + 44 };                    // the east strand's point
/** The roads: the river road Münde – Kolberg, the coast track, the Lauenburg road west over the bridge, round the ponds to
 * the east strand, the Köslin road east past the Wolfsberg, the Belgard road south-west to Zernin. */
const ROADS: number[][] = [
  [MUENDE.x, MUENDE.z, MOUTH + 50, -250], [MOUTH + 50, -250, TOWN.x, TOWN.z],
  [MUENDE.x, MUENDE.z, EAST.x - 140, shoreZ(EAST.x - 140) + 70], [EAST.x - 140, shoreZ(EAST.x - 140) + 70, EAST.x, EAST.z], [EAST.x, EAST.z, 520, shoreZ(500) + 60],
  [TOWN.x, TOWN.z, perX(-60), -60], [perX(-60), -60, MAIK.x, MAIK.z], [MAIK.x, MAIK.z, -520, -330],
  [TOWN.x, TOWN.z, 140, -20], [140, -20, WOLF.x, WOLF.z], [WOLF.x, WOLF.z, 520, 160], [EAST.x, EAST.z, 470, -60], [470, -60, WOLF.x + 60, WOLF.z - 40],
  [TOWN.x, TOWN.z, 0, 250], [0, 250, perX(360), 360], [perX(360), 360, ZERNIN.x, ZERNIN.z], [ZERNIN.x, ZERNIN.z, -150, 900],
  [0, 250, 150, 520], [150, 520, 150, 900], [WOLF.x, WOLF.z, 150, 520],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));
const roadC = gridCache(roadDist, BOUNDS, 2);

export const SECTORS = [
  { x: MOUTH + 70, name: 'Münde', inland: { name: 'Kolberg', ...TOWN } },
  { x: EAST.x, name: 'The east strand', inland: { name: 'The Wolfsberg', ...WOLF } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The roads off Kolberg', x: 180, z: -800, owner: 'pact', sector: 'centre', radius: 80 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 46, owner: null, sector: 'west', radius: 55, opens: 'F' },
  { id: 'C', name: SECTORS[1].name, x: EAST.x, z: EAST.z, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'F', name: 'Kolberg', x: TOWN.x, z: TOWN.z, owner: null, sector: 'west' },
  { id: 'G', name: 'The Wolfsberg', x: WOLF.x, z: WOLF.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Zernin', x: ZERNIN.x, z: ZERNIN.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const RAMPART = 82;                               // the town's bastioned ring (m from its centre)

/** The Maikuhle's pines west of the river, copses and the alders along the Persante elsewhere (0..1). */
const woods = gridCache((x: number, z: number) => {
  const d = inland(x, z);
  if (d < 60 || saltK(x, z) > 0.2 || pondD(x, z) < 1.8) return 0;
  const west = 1 - smoothstep(-200, -140, x);
  let k = Math.max(west * smoothstep(60, 110, d) * smoothstep(620, 480, d) * 0.95,
    smoothstep(0.45, 0.65, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.3 + 0.5 * smoothstep(500, 900, d)));
  const b = per(x, z);
  if (b > 12 && b < 24 && fordK(z) < 0.3) k = Math.max(k, 0.55);
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  k = Math.min(k, smoothstep(RAMPART, RAMPART + 40, Math.hypot(x - TOWN.x, z - TOWN.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
}, BOUNDS, 4);

export default {
  id: 'kolberg',
  name: 'Kolberg 1807',
  description: 'A relief that never came: Prussians and British row ashore at Kolberg in spring 1807 to break Loison’s siege. A long low strand, the Münde harbour between its moles, the town back from the sea on the Persante, the brine ponds of the salt meadows, the Wolfsberg’s siege batteries and the Maikuhle’s pines.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'europe',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Prussia' },
  armies: { nato: ['fr'], pact: ['pr', 'gb'] }, // (Gneisenau's Prussians with the British ships behind them)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' }, // (a fresh May morning on the Baltic)
  wind: { from: 300, speed: 4, veer: 0.15 },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1807_0520,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1807_5, cell: 75, weights: [0.3, 0.3, 0.25, 0.15] }), // (May: young rye, pasture and fallow)

  theme: {
    // a clear northern spring: pale sky, a cool hard light
    fogColor: 0xc0ccd4, fogDensity: 0.0005,
    skyTop: 0x5880b0, skyHorizon: 0xcad4dc, skyBottom: 0x98a294,
    sunColor: 0xfff4e0, sunIntensity: 1.9, sunDisk: 0.5,
    clouds: 0.3, cloudLight: 0xf4f4f2, cloudDark: 0xb8bcc0,
    sunDir: [-0.35, 0.6, 0.55],
    hemiSky: 0xc8d4e0, hemiGround: 0x6e7650, hemiIntensity: 1.2,
    rimColor: 0xe8e8e0, rimIntensity: 0.25,
    terrain: {
      grass: '#6a8a44', grassAlt: '#62803e', dryGrass: '#9a9a5e', dirt: '#7a6448', rock: '#8a8478',
      pasture: '#6e8e46', ploughed: '#6e5640', stubble: '#a8a068', meadow: '#5e8840',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (moleK(x, z) > 0.5) return [0x8a8478, 0.95];                     // the moles' stone
        if (y < 0.3) return [y > -1.2 ? 0xc8c0a0 : 0x7a8a86, 1];
        if (d < 32) return [0xe2d8b8, 1];
        if (per(x, z) < 12) return [0x5e5440, 0.9];
        if (roadC(x, z) < 3) return [0xa08c6c, 0.8];
        if (d < 70) return [0xc8c09a, 0.6];
        if (pondD(x, z) < 1.7) return [0xb8b4a0, 0.8];                    // the salt crust round the brine ponds
        const salt = saltK(x, z);
        return salt > 0.05 ? [0x7a8456, salt * 0.7] : null;                // the salt meadows' sedge
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-160, 60, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } },
  maxStacks: 22,
  cameraStart: { nato: { x: 100, z: 200 }, pact: { x: 100, z: -420 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.2,
    signal: { t: 25, say: 'The frigate’s gun — the boats pull for the harbour mouth and the east strand', sayOther: 'Boats coming in off Münde: a relief from the sea!' },
    navy: ['frigate', 'destroyer'],
    // the besiegers' guns on the coast: the Münde fort's battery over the harbour mouth, one on the east strand's dunes, field guns by the ponds
    forts: [
      { unit: 'shoreBattery', x: MUENDE.x + 20, z: MUENDE.z - 34, facing: Math.PI },
      { unit: 'shoreBattery', x: EAST.x + 90, z: shoreZ(EAST.x + 90) + 55, facing: Math.PI },
      { unit: 'artillery', x: 200, z: shoreZ(200) + 120, facing: Math.PI },
      { unit: 'artillery', x: WOLF.x - 20, z: WOLF.z - 35, facing: Math.PI }, // (the siege battery on the Wolfsberg, turned round)
    ],
    works: [
      ...[-30, 20, 60].map((dx) => ({ kind: 'trench', x: SECTORS[0].x + dx, z: shoreZ(SECTORS[0].x + dx) + 66, yaw: 0 })),
      ...[-50, -10, 30, 70].map((dx) => ({ kind: 'trench', x: EAST.x + dx, z: shoreZ(EAST.x + dx) + 64, yaw: 0 })),
      ...[-10, 4, 30, 44].map((dx) => ({ kind: 'wire', x: SECTORS[0].x + dx, z: shoreZ(SECTORS[0].x + dx) + 34, yaw: 0 })),
      ...[-60, -44, -28, 28, 44, 60].map((dx) => ({ kind: 'wire', x: EAST.x + dx, z: shoreZ(EAST.x + dx) + 34, yaw: 0 })),
      // the Wolfsberg's siege lines and the town's outworks, faced toward the sea
      ...[-2.4, -1.9, -1.4, -0.9].map((a) => ({ kind: 'trench', x: WOLF.x + Math.cos(a) * 55, z: WOLF.z + Math.sin(a) * 55, yaw: a + Math.PI / 2 })),
      ...[-2.2, -1.57, -0.9].map((a) => ({ kind: 'trench', x: TOWN.x + Math.cos(a) * (RAMPART + 30), z: TOWN.z + Math.sin(a) * (RAMPART + 30), yaw: a + Math.PI / 2 })),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle', 'rifles', 'mgTeam'],
    counter: { t: 160, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'Loison sends the reserve up from Zernin — throw them back into the sea!', sayOther: 'French columns coming up the Belgard road from Zernin — hold on to the strand!' },
    hold: [
      { x: SECTORS[0].x - 25, z: shoreZ(SECTORS[0].x) + 66 }, { x: SECTORS[0].x + 40, z: shoreZ(SECTORS[0].x) + 66 },
      { x: EAST.x - 30, z: EAST.z + 22 }, { x: EAST.x + 40, z: EAST.z + 22 }, { x: MUENDE.x, z: MUENDE.z + 40 },
      { x: TOWN.x, z: TOWN.z }, { x: TOWN.x - 30, z: TOWN.z - 50 }, { x: WOLF.x, z: WOLF.z }, { x: WOLF.x - 60, z: WOLF.z - 70 },
    ],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.0 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'guard', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'sniper', sector: 1 }, { unit: 'atTeam', sector: 1 }, { unit: 'rifles', sector: 1 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'Schill’s hussars are coming ashore', units: [{ unit: 'reconVehicle', sector: 1 }, { unit: 'rifles', sector: 0 }, { unit: 'artillery', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1807_0521);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadC(x, z) > 4 + rr && per(x, z) > 12 + rr && inland(x, z) > 80 + rr && pondD(x, z) > 1.6 && saltK(x, z) < 0.3;
    const clearOf = (x: number, z: number, rr: number) => points.every((p) => Math.hypot(p.x - x, p.z - z) > 18 + rr);

    // ---- the fortress town: the bastioned rampart (earth faced with brick) with its gates on the roads, the town inside
    const BRICK = 0x8a5040;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, x = TOWN.x + Math.cos(a) * RAMPART, z = TOWN.z + Math.sin(a) * RAMPART;
      if (roadC(x, z) < 9 || per(x, z) < 6) continue; // (the gates)
      props.lowWall({ x, z, yaw: a + Math.PI / 2, length: 2 * Math.PI * RAMPART / 40 + 0.6, height: 2.2, color: BRICK });
    }
    for (let i = 0; i < 5; i++) { // the bastions' points
      const a = (i / 5) * Math.PI * 2 + 0.3, x = TOWN.x + Math.cos(a) * (RAMPART + 10), z = TOWN.z + Math.sin(a) * (RAMPART + 10);
      if (roadC(x, z) < 12 || per(x, z) < 10) continue;
      props.box('stone', x, terrain.heightAt(x, z) + 1.2, z, 12, 2.4, 12, a + Math.PI / 4, BRICK);
      props.cover.addBox({ x, z, yaw: a + Math.PI / 4, length: 12, thickness: 12, height: 2.4 });
    }
    props.rand = mulberry32(1807_0522);
    props.church({ x: TOWN.x + 30, z: TOWN.z + 24, yaw: 0 }); // the Marienkirche
    for (let i = 0, n = 0; i < 500 && n < 30; i++) {
      const a = r() * Math.PI * 2, rr = 22 + r() * (RAMPART - 32), x = TOWN.x + Math.cos(a) * rr, z = TOWN.z + Math.sin(a) * rr;
      if (roadC(x, z) < 7 || !clearOf(x, z, 6) || Math.hypot(x - TOWN.x - 30, z - TOWN.z - 24) < 18 || per(x, z) < 12) continue;
      n++;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 9, storeys: r() < 0.6 ? 2 : 1, name: 'burgher house', damaged: 0.1 });
    }
    // ---- the Münde fort: a low square of brick and earth behind the harbour mouth
    const gm = terrain.heightAt(MUENDE.x, MUENDE.z);
    for (const [dx, dz, sx, sz] of [[0, -14, 30, 3], [0, 14, 30, 3], [-14, 0, 3, 30], [14, 0, 3, 30]]) {
      props.box('stone', MUENDE.x + dx, gm + 1.3, MUENDE.z + dz, sx, 2.6, sz, 0, BRICK);
      props.cover.addBox({ x: MUENDE.x + dx, z: MUENDE.z + dz, yaw: 0, length: sx, thickness: sz, height: 2.6 });
    }
    // the moles' bollards and the harbour light; the salt works' boiling houses by the ponds
    for (const mx of MOLES) for (let i = 0; i < 5; i++) { const z = shoreZ(mx) - 10 - i * 20; props.box('plain', mx, 2.4, z, 0.6, 1.2, 0.6, 0, 0x4a3c30); }
    { const x = MOLES[1], z = shoreZ(x) - 100; props.box('stone', x, 4, z, 3, 5, 3, 0, 0xd8d0c0); }
    for (const [cx, cz] of [[210, -300], [300, -170], [395, -205]]) {
      if (pondD(cx, cz) < 1.5) continue;
      props.rand = mulberry32(cx * 31 + 7);
      props.townHouse({ x: cx, z: cz, yaw: 0.1, width: 14, depth: 8, storeys: 1, name: 'salt boiling house', damaged: 0.05 });
    }
    // ---- the villages: the huts in the Maikuhle, Zernin, the hamlet under the Wolfsberg; the siege batteries on the Wolfsberg
    for (const [p, seed] of [[MAIK, 18071], [P.K, 18072], [{ x: WOLF.x + 90, z: WOLF.z + 60 }, 18073]] as const) buildVillage(props, p, seed);
    props.church({ x: P.K.x - 34, z: P.K.z + 26, yaw: 0.2 });
    for (let i = 0; i < 3; i++) {
      const a = -2.2 + i * 0.5, x = WOLF.x + Math.cos(a) * 30, z = WOLF.z + Math.sin(a) * 30;
      props.box('plain', x, terrain.heightAt(x, z) + 0.6, z, 9, 1.2, 2.5, a + Math.PI / 2, 0x7a6848); // the gabion breastworks
    }
    for (let i = 0, n = 0; i < 500 && n < 18; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = -300 + r() * 1000;
      if (!free(x, z, 10) || !clearOf(x, z, 52) || Math.hypot(x - TOWN.x, z - TOWN.z) < RAMPART + 30 || woods(x, z) > 0.4) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 9 + r() * 3, depth: 12, storeys: 1, name: 'farmstead', damaged: 0.1 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: TOWN.x, z: TOWN.z, r: RAMPART + 14 }, { x: MUENDE.x, z: MUENDE.z, r: 22 },
      { test: (x: number, z: number) => roadC(x, z) < 5 || per(x, z) < 11 || inland(x, z) < 60 || pondD(x, z) < 1.5 }];
    // the Maikuhle's pines, oak and beech copses, alders by the river
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2600, broadleaf: 0.45, autumn: 0, maxY: 60,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 34 || saltK(x, z) > 0.5 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
