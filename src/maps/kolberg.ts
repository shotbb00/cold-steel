// Kolberg, spring 1807 — HYPOTHETICAL (coastal, the 1806 epoch: the Prussians and the British land, the French hold;
// 1.0 × 1.8 km). After Jena Kolberg was one of the few Prussian fortresses that would not give up: Gneisenau,
// Nettelbeck's burghers and Schill's free corps held it from March to July 1807 against Loison's besiegers, fed and
// armed from the sea through the mouth of the Persante, with British and Swedish ships off the coast. A relief from
// the sea was talked of and never came; the map plays it — the boats come in on the beaches either side of the river
// mouth to break the siege lines round the town.
// On the map the Baltic is the -z side. The Persante runs north out of the Pomeranian plain into the sea, too deep to
// wade below the town but at its fords; west of the mouth the Maikuhle, the pine-wooded dunes the French fought
// through, east of it the harbour fort of Münde and the long strand toward the salt meadows; inland on the east bank
// the fortress town — the Marienkirche over the red roofs inside its bastioned ramparts — and south-east of it the
// Wolfsberg, the sand hill the French crowned with their siege batteries; to the south, the besiegers' camp at Zernin.
// Both shores are built to be fought from either side (the campaign plays a landing flipped: wcampaign/battle.js).
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
const noise = createNoise2D(1807_03);
const sea = createSea({ level: 0, size: SIZE, color: 0x3e6a78 }); // (the Baltic in May: cold, clear, grey-blue)

/** The waterline (world z; the sea toward -z): a long straight sand shore, the river mouth in it. */
export const shoreZ = (x: number) => -170 + 0.00005 * x * x + fbm(noise, x * 0.004, 2.1, 2) * 10;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Persante: its line (x at z), its fords, and < 0 in its water (wide at the mouth). */
const perX = (z: number) => -160 - 0.12 * z + 30 * Math.sin(z * 0.006 + 0.4) + 10 * Math.sin(z * 0.015);
const FORDS = [{ name: 'Münde ferry', z: -40 }, { name: 'The Lauenburg gate bridge', z: 260 }, { name: 'Sellnow ford', z: 580 }];
const fordK = (z: number) => Math.max(...FORDS.map((f) => smoothstep(26, 12, Math.abs(z - f.z))));
const per = (x: number, z: number) => Math.abs(x - perX(z)) - (6 + 9 * smoothstep(-40, -170, z));

const TOWN = { x: 30, z: 250 };       // Kolberg: the fortress town on the east bank
const WOLF = { x: 330, z: 340 };      // the Wolfsberg
const MAIK = { x: -380, z: 120 };     // the Maikuhle (the point in its clearing)
const ZERNIN = { x: 60, z: 710 };     // the besiegers' camp
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) {
    const s = -d, bar = 0.5 * Math.exp(-(((s - 45) / 14) ** 2));
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const west = 1 - smoothstep(-260, -120, x);
  // the dunes: high and wooded in the Maikuhle, a low line along the east strand
  const dunes = (2.5 + 2.5 * west + fbm(noise, x * 0.012, 3.7, 2) * 2) * Math.exp(-(((d - 52) / (16 + 14 * west)) ** 2));
  // the plain: low and green by the river and the salt meadows, rising gently south; the Wolfsberg and the town's rise
  const land = 2.4 + smoothstep(80, 500, d) * 4 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.4
    + smoothstep(450, 900, d) * 10 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.3)
    + hill(x, z, WOLF.x, WOLF.z, 95, 13) + hill(x, z, TOWN.x, TOWN.z, 120, 2.5) + hill(x, z, -330, 520, 140, 6);
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 18 * smoothstep(60, 200, d);
  const b = per(x, z);
  if (b < 40) {
    const bed = -0.35 - 1.4 * (1 - fordK(z));
    h += (Math.min(h, bed) - h) * smoothstep(20, 0, b);
  }
  return h;
}

/** Soft going: the beach sand, the river mud, the salt meadows east of the town. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 35) return foot ? 0.85 : 0.6;
  if (per(x, z) < 9) return foot ? 0.7 : 0.45;
  return 1;
}

const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
/** The roads: Münde to the town, the coast track, the Lauenburg road west over the bridge, the Köslin road east past the Wolfsberg, the Belgard road south to Zernin. */
const ROADS: number[][] = [
  [-520, 20, MAIK.x, MAIK.z], [MAIK.x, MAIK.z, perX(-40), -40], [perX(-40), -40, -20, -60], [-20, -60, 520, -40],
  [-20, -60, TOWN.x, TOWN.z], [TOWN.x, TOWN.z, perX(260), 260], [perX(260), 260, -520, 300],
  [TOWN.x, TOWN.z, WOLF.x, WOLF.z], [WOLF.x, WOLF.z, 520, 420], [340, -45, WOLF.x, WOLF.z],
  [TOWN.x, TOWN.z, ZERNIN.x, ZERNIN.z], [ZERNIN.x, ZERNIN.z, 0, 900],
  [MAIK.x, MAIK.z, -330, 420], [-330, 420, perX(580), 580], [perX(580), 580, ZERNIN.x, ZERNIN.z],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

export const SECTORS = [
  { x: -330, name: 'The Maikuhle strand', inland: { name: 'The Maikuhle', ...MAIK } },
  { x: 0, name: 'Münde', inland: { name: 'Kolberg', ...TOWN } },
  { x: 340, name: 'The east strand', inland: { name: 'The Wolfsberg', ...WOLF } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The roads off Kolberg', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 46, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 42, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'The Maikuhle', x: MAIK.x, z: MAIK.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Kolberg', x: TOWN.x, z: TOWN.z, owner: null, sector: 'centre' },
  { id: 'G', name: 'The Wolfsberg', x: WOLF.x, z: WOLF.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Zernin', x: ZERNIN.x, z: ZERNIN.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const MUENDE = { x: 70, z: shoreZ(70) + 70 };     // the Münde fort behind the harbour mouth
const RAMPART = 82;                               // the town's bastioned ring (m from its centre)

/** The Maikuhle's pines in the west dunes, copses and the alders along the Persante elsewhere (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 60) return 0;
  const west = 1 - smoothstep(-280, -200, x);
  let k = Math.max(west * smoothstep(60, 110, d) * smoothstep(560, 420, d) * 0.9,
    smoothstep(0.45, 0.65, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.3 + 0.5 * smoothstep(380, 600, d)));
  const b = per(x, z);
  if (b > 12 && b < 24 && fordK(z) < 0.3) k = Math.max(k, 0.55);
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  k = Math.min(k, smoothstep(RAMPART, RAMPART + 40, Math.hypot(x - TOWN.x, z - TOWN.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'kolberg',
  name: 'Kolberg 1807',
  description: 'A relief that never came: Prussians and British row ashore by the mouth of the Persante to break Loison’s siege of Kolberg in spring 1807. The Maikuhle’s wooded dunes, the Münde fort, the bastioned town under the Marienkirche, the Wolfsberg’s siege batteries and the camp at Zernin.',
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
        if (d < 0) return [y > -1.2 ? 0xc8c0a0 : 0x7a8a86, 1];
        if (d < 32) return [0xe2d8b8, 1];
        if (per(x, z) < 10) return [0x5e5440, 0.9];
        if (roadDist(x, z) < 3) return [0xa08c6c, 0.8];
        if (d < 70) return [0xc8c09a, 0.6];
        const salt = smoothstep(0.3, 0.5, fbm(noise, x * 0.006 + 40, z * 0.006, 2)) * smoothstep(120, 260, x) * smoothstep(300, 120, d);
        return salt > 0.05 ? [0x6e7a50, salt * 0.6] : null; // (the salt meadows east of the town, where the salt works were)
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
    signal: { t: 25, say: 'The frigate’s gun — the boats pull in on both sides of the Persante', sayOther: 'Boats coming in off Münde: a relief from the sea!' },
    navy: ['frigate', 'destroyer'],
    // the besiegers' guns on the coast: a battery on the Maikuhle dunes over the mouth, one on the east strand, field guns by Münde
    forts: [
      { unit: 'shoreBattery', x: -240, z: shoreZ(-240) + 70, facing: Math.PI },
      { unit: 'shoreBattery', x: 400, z: shoreZ(400) + 50, facing: Math.PI },
      { unit: 'artillery', x: MUENDE.x + 40, z: MUENDE.z + 30, facing: Math.PI },
    ],
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 62, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 36, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    counter: { t: 150, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'Loison sends the reserve up from Zernin — throw them back into the sea!', sayOther: 'French columns coming up from Zernin — hold on to the strand!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 62 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 650, defenceIncome: 0.8 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'guard', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 1 }, { unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'Schill’s hussars are coming ashore', units: [{ unit: 'reconVehicle', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1807_0521);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && per(x, z) > 12 + rr && inland(x, z) > 70 + rr;
    const clearOf = (x: number, z: number, rr: number) => points.every((p) => Math.hypot(p.x - x, p.z - z) > 18 + rr);

    // ---- the fortress town: the bastioned rampart (earth faced with brick) with its gates on the roads, the town inside
    const BRICK = 0x8a5040;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, x = TOWN.x + Math.cos(a) * RAMPART, z = TOWN.z + Math.sin(a) * RAMPART;
      if (roadDist(x, z) < 9 || per(x, z) < 6) continue; // (the gates)
      props.lowWall({ x, z, yaw: a + Math.PI / 2, length: 2 * Math.PI * RAMPART / 40 + 0.6, height: 2.2, color: BRICK });
    }
    for (let i = 0; i < 5; i++) { // the bastions' points
      const a = (i / 5) * Math.PI * 2 + 0.3, x = TOWN.x + Math.cos(a) * (RAMPART + 10), z = TOWN.z + Math.sin(a) * (RAMPART + 10);
      if (roadDist(x, z) < 12 || per(x, z) < 10) continue;
      props.box('stone', x, terrain.heightAt(x, z) + 1.2, z, 12, 2.4, 12, a + Math.PI / 4, BRICK);
      props.cover.addBox({ x, z, yaw: a + Math.PI / 4, length: 12, thickness: 12, height: 2.4 });
    }
    props.rand = mulberry32(1807_0522);
    props.church({ x: TOWN.x + 30, z: TOWN.z - 24, yaw: 0 }); // the Marienkirche
    for (let i = 0, n = 0; i < 500 && n < 30; i++) {
      const a = r() * Math.PI * 2, rr = 22 + r() * (RAMPART - 32), x = TOWN.x + Math.cos(a) * rr, z = TOWN.z + Math.sin(a) * rr;
      if (roadDist(x, z) < 7 || !clearOf(x, z, 6) || Math.hypot(x - TOWN.x - 30, z - TOWN.z + 24) < 18) continue;
      n++;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 9, storeys: r() < 0.6 ? 2 : 1, name: 'burgher house', damaged: 0.1 });
    }
    // ---- the Münde fort: a low square of brick and earth behind the harbour mouth
    const gm = terrain.heightAt(MUENDE.x, MUENDE.z);
    for (const [dx, dz, sx, sz] of [[0, -14, 30, 3], [0, 14, 30, 3], [-14, 0, 3, 30], [14, 0, 3, 30]]) {
      props.box('stone', MUENDE.x + dx, gm + 1.3, MUENDE.z + dz, sx, 2.6, sz, 0, BRICK);
      props.cover.addBox({ x: MUENDE.x + dx, z: MUENDE.z + dz, yaw: 0, length: sx, thickness: sz, height: 2.6 });
    }
    // the moles at the river mouth, the salt works' sheds on the meadows
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const z = shoreZ(perX(-170)) + 6 - i * 9, x = perX(-170) + s * 18; props.box('plain', x, Math.max(terrain.heightAt(x, z), 0) + 0.8, z, 3, 1.4, 9, 0, 0x5a4c3c); }
    // ---- the villages: the Maikuhle's huts, Zernin, the hamlet under the Wolfsberg; the siege batteries on the Wolfsberg
    for (const [p, seed] of [[P.E, 18071], [P.K, 18072], [{ x: WOLF.x + 90, z: WOLF.z + 60 }, 18073]] as const) buildVillage(props, p, seed);
    props.church({ x: P.K.x - 34, z: P.K.z + 26, yaw: 0.2 });
    for (let i = 0; i < 3; i++) {
      const a = -2.2 + i * 0.5, x = WOLF.x + Math.cos(a) * 30, z = WOLF.z + Math.sin(a) * 30;
      props.box('plain', x, terrain.heightAt(x, z) + 0.6, z, 9, 1.2, 2.5, a + Math.PI / 2, 0x7a6848); // the gabion breastworks
    }
    for (let i = 0, n = 0; i < 400 && n < 16; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 0 + r() * 700;
      if (!free(x, z, 10) || !clearOf(x, z, 52) || Math.hypot(x - TOWN.x, z - TOWN.z) < RAMPART + 30 || woods(x, z) > 0.4) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 9 + r() * 3, depth: 12, storeys: 1, name: 'farmstead', damaged: 0.1 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: TOWN.x, z: TOWN.z, r: RAMPART + 14 }, { x: MUENDE.x, z: MUENDE.z, r: 22 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || per(x, z) < 11 || inland(x, z) < 60 }];
    // the Maikuhle's pines, oak and beech copses, alders by the river
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2600, broadleaf: 0.45, autumn: 0, maxY: 60,
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
