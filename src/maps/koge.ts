// Køge Bay, August 1807 (coastal, the 1806 epoch: the British land, the Danes hold; 1.0 × 1.8 km). To keep the
// Danish fleet out of Napoleon's hands Cathcart's army landed on Zealand and laid siege to Copenhagen: the main body
// came ashore at Vedbæk on 16 August, and the reserve and the guns were put ashore in Køge Bay south of the city,
// where on 29 August Wellesley met General Castenschiold's levy of Zealand militia at Køge, broke it in the town and
// drove the rest back through Herfølge. On the map the landing comes straight in from Køge Bay against the militia.
// On the map the bay is the -z side. The shore runs from Ølsemagle's strand and meadows past Køge's harbour at the
// mouth of the Køge Å to the long south strand toward Vallø; the Køge Å winds down from the south-east, too deep to
// wade but at its fords. Inland: Ølby among its fields, the town of Køge round St Nicolai's tower and its market
// square, Vallø's manor among the beechwoods, and to the south Herfølge on its rise, where the militia gathered.
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
const noise = createNoise2D(1807_08);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a6a7e }); // (the Øresund side of Zealand in August: calm, blue)

/** The waterline (world z; the bay toward -z): a gently bowed sandy shore. */
export const shoreZ = (x: number) => -170 + 0.00007 * x * x + fbm(noise, x * 0.004, 2.1, 2) * 10;
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Køge Å: its line (x at z), its fords, and < 0 in its water (wide at the mouth). */
const aaX = (z: number) => 160 + 0.22 * Math.max(0, z) + 25 * Math.sin(z * 0.007 + 0.3) + 8 * Math.sin(z * 0.017);
const FORDS = [{ name: 'The harbour bridge', z: -40 }, { name: 'The mill ford', z: 300 }, { name: 'Lellinge ford', z: 620 }];
const fordK = (z: number) => Math.max(...FORDS.map((f) => smoothstep(26, 12, Math.abs(z - f.z))));
const aa = (x: number, z: number) => Math.abs(x - aaX(z)) - (5 + 9 * smoothstep(-40, -170, z));

const OELBY = { x: -370, z: 130 };
const TOWN = { x: 10, z: 220 };       // Køge: the market square
const VALLOE = { x: 360, z: 300 };    // Vallø (the manor beside it: MANOR)
const HERF = { x: 40, z: 710 };       // Herfølge
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) {
    const s = -d, bar = 0.5 * Math.exp(-(((s - 45) / 14) ** 2));
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const dunes = (1.6 + fbm(noise, x * 0.012, 3.7, 2) * 1.4) * Math.exp(-(((d - 48) / 14) ** 2)); // (a low sandy bank behind the strand)
  // the Zealand moraine: low, rolling fields, rising to Herfølge's rise and the wooded ground round Vallø
  const land = 2.2 + smoothstep(60, 400, d) * 4 + fbm(noise, x * 0.005, z * 0.005, 3) * 2.2
    + smoothstep(420, 900, d) * 12 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.35)
    + hill(x, z, HERF.x, HERF.z, 150, 6) + hill(x, z, VALLOE.x + 60, VALLOE.z + 120, 130, 7) + hill(x, z, -300, 480, 120, 5);
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 18 * smoothstep(60, 200, d);
  const b = aa(x, z);
  if (b < 40) {
    const bed = -0.35 - 1.3 * (1 - fordK(z));
    h += (Math.min(h, bed) - h) * smoothstep(20, 0, b);
  }
  return h;
}

function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 35) return foot ? 0.85 : 0.6;
  if (aa(x, z) < 9) return foot ? 0.7 : 0.45;
  return 1;
}

const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
/** The roads: the coast road north to Copenhagen through Ølby, the harbour, the road south over the bridge to Vallø, the Ringsted road to Herfølge, the lanes. */
const ROADS: number[][] = [
  [-520, 60, OELBY.x, OELBY.z], [OELBY.x, OELBY.z, TOWN.x, TOWN.z], [TOWN.x, TOWN.z, 0, -60], [0, -60, aaX(-40), -40], [aaX(-40), -40, 340, -50], [340, -50, VALLOE.x, VALLOE.z],
  [TOWN.x, TOWN.z, aaX(300), 300], [aaX(300), 300, VALLOE.x, VALLOE.z], [VALLOE.x, VALLOE.z, 520, 420],
  [TOWN.x, TOWN.z, HERF.x, HERF.z], [HERF.x, HERF.z, 0, 900], [OELBY.x, OELBY.z, -330, 0], [-330, 0, 0, -60],
  [OELBY.x, OELBY.z, -320, 460], [-320, 460, HERF.x, HERF.z], [HERF.x, HERF.z, aaX(620), 620], [aaX(620), 620, VALLOE.x, VALLOE.z],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

export const SECTORS = [
  { x: -330, name: 'Ølsemagle strand', inland: { name: 'Ølby', ...OELBY } },
  { x: 0, name: 'Køge harbour', inland: { name: 'Køge', ...TOWN } },
  { x: 340, name: 'The south strand', inland: { name: 'Vallø', ...VALLOE } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Køge Bay', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 46, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 42, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Ølby', x: OELBY.x, z: OELBY.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Køge', x: TOWN.x, z: TOWN.z, owner: null, sector: 'centre' },
  { id: 'G', name: 'Vallø', x: VALLOE.x, z: VALLOE.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Herfølge', x: HERF.x, z: HERF.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const MANOR = { x: VALLOE.x + 70, z: VALLOE.z + 40 };   // Vallø manor: the red-brick house with its two towers
const CHURCH = { x: TOWN.x + 32, z: TOWN.z + 26 };      // St Nicolai

/** Zealand's beechwoods (round Vallø and on the rises), alders along the Køge Å (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 70) return 0;
  let k = smoothstep(0.42, 0.62, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.3 + 0.5 * smoothstep(350, 600, d))
    + 0.5 * smoothstep(220, 120, Math.hypot(x - MANOR.x - 60, z - MANOR.z - 120));
  const b = aa(x, z);
  if (b > 12 && b < 24 && fordK(z) < 0.3) k = Math.max(k, 0.55);
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  k = Math.min(k, smoothstep(90, 130, Math.hypot(x - TOWN.x, z - TOWN.z)), smoothstep(30, 50, Math.hypot(x - MANOR.x, z - MANOR.z)));
  return Math.min(1, k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'koge',
  name: 'Køge Bay 1807',
  description: 'Zealand, August 1807: the British come ashore in Køge Bay for the siege of Copenhagen and meet the Danish militia at Køge. Ølsemagle’s strand, Køge’s harbour at the mouth of the Køge Å, the town round St Nicolai, Vallø’s manor in its beechwoods, and Herfølge on its rise.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'europe',
  modes: ['landing'],
  sides: { nato: 'Denmark', pact: 'Britain' },
  armies: { nato: ['dk'], pact: ['gb'] }, // (Castenschiold's militia against Cathcart's army; both named, so both field — GameEngine armiesOn)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' }, // (late August: the harvest in, a warm still day)
  wind: { from: 240, speed: 3, veer: 0.15 },
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1807_0829,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.85,
  fields: createFields({ seed: 1807_9, cell: 80, weights: [0.2, 0.25, 0.4, 0.15] }), // (late August: the corn cut and stooked, stubble)

  theme: {
    // a Danish late-summer day: high soft clouds, a warm light
    fogColor: 0xc8d0d4, fogDensity: 0.00045,
    skyTop: 0x5a86b8, skyHorizon: 0xd0d8dc, skyBottom: 0xa0a68c,
    sunColor: 0xfff0d8, sunIntensity: 2.0, sunDisk: 0.55,
    clouds: 0.35, cloudLight: 0xf6f6f2, cloudDark: 0xbcc0c4,
    sunDir: [0.35, 0.62, 0.5],
    hemiSky: 0xccd8e2, hemiGround: 0x7a7a50, hemiIntensity: 1.2,
    rimColor: 0xf0e8d8, rimIntensity: 0.25,
    terrain: {
      grass: '#728a46', grassAlt: '#6a8240', dryGrass: '#a8a064', dirt: '#7e6648', rock: '#8a8478',
      pasture: '#6e8a44', ploughed: '#7a5e42', stubble: '#c8b474', meadow: '#668a42',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) return [y > -1.2 ? 0xd0c6a4 : 0x7a8c88, 1];
        if (d < 30) return [0xe0d4b2, 1];
        if (aa(x, z) < 10) return [0x5e5440, 0.9];
        if (roadDist(x, z) < 3) return [0xa8926e, 0.8];
        if (d < 64) return [0xbcb68e, 0.5];
        const meadow = smoothstep(0.35, 0.55, fbm(noise, x * 0.006 + 40, z * 0.006, 2)) * smoothstep(-200, -330, x) * smoothstep(260, 100, d);
        return meadow > 0.05 ? [0x5e7a42, meadow * 0.5] : null; // (Ølsemagle's wet shore meadows)
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
    surf: 0.12, // (a calm bay)
    signal: { t: 25, say: 'The signal from the flagship — the boats pull for Køge strand', sayOther: 'English boats in the bay: they are landing at Køge!' },
    navy: ['frigate', 'destroyer'],
    // the coast's guns: a battery at the harbour mouth, the guns on the south strand, the militia's field pieces at Ølsemagle
    forts: [
      { unit: 'shoreBattery', x: aaX(-40) - 40, z: shoreZ(110) + 60, facing: Math.PI },
      { unit: 'shoreBattery', x: 420, z: shoreZ(420) + 50, facing: Math.PI },
      { unit: 'artillery', x: -280, z: shoreZ(-280) + 95, facing: Math.PI },
    ],
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 62, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 36, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    counter: { t: 150, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'Castenschiold brings the militia up from Herfølge — drive them back to their boats!', sayOther: 'Danish militia coming up the Herfølge road — form on the strand!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 62 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 1000, defenceIncome: 1.2 },
    waves: [
      // the first wave: the light companies, the 95th's riflemen and Wellesley's reserve
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'guard', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns, and seamen to drag them', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'Linsingen’s German hussars are coming ashore', units: [{ unit: 'reconVehicle', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1807_0830);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && aa(x, z) > 12 + rr && inland(x, z) > 70 + rr;
    const clearOf = (x: number, z: number, rr: number) => points.every((p) => Math.hypot(p.x - x, p.z - z) > 18 + rr);

    // ---- Køge: half-timbered houses round the market square, St Nicolai's tower
    props.rand = mulberry32(1807_0831);
    props.church({ ...CHURCH, yaw: 0 });
    for (let i = 0, n = 0; i < 600 && n < 32; i++) {
      const a = r() * Math.PI * 2, rr = 24 + r() * 80, x = TOWN.x + Math.cos(a) * rr, z = TOWN.z + Math.sin(a) * rr * 0.9;
      if (roadDist(x, z) < 7 || !clearOf(x, z, 6) || Math.hypot(x - CHURCH.x, z - CHURCH.z) < 18 || aa(x, z) < 14) continue;
      n++;
      props.townHouse({ x, z, yaw: Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.5 ? 2 : 1, name: 'town house', damaged: 0 });
    }
    // ---- Vallø manor: the red-brick house, its two towers, the moat round it
    const g0 = terrain.heightAt(MANOR.x, MANOR.z), BRICK = 0x9a4a3a;
    props.box('stone', MANOR.x, g0 + 5, MANOR.z, 34, 10, 11, 0.1, BRICK);
    props.box('plain', MANOR.x, g0 + 11.5, MANOR.z, 34.6, 3, 11.6, 0.1, 0x3a3634);
    for (const s of [-1, 1]) { const tx = MANOR.x + s * 18 * Math.cos(0.1), tz = MANOR.z + s * 18 * Math.sin(0.1); props.box('stone', tx, g0 + 8, tz, 7, 16, 7, 0.1, BRICK); props.box('plain', tx, g0 + 17, tz, 4, 3, 4, 0.1 + Math.PI / 4, 0x3e5a4c); }
    props.cover.addBox({ x: MANOR.x, z: MANOR.z, yaw: 0.1, length: 40, thickness: 11, height: 10 });
    // the harbour: the timber quays at the river mouth, fishing boats on the sand
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const x = aaX(-170) + s * 20, z = shoreZ(x) + 6 - i * 9; props.box('plain', x, Math.max(terrain.heightAt(x, z), 0) + 0.8, z, 3, 1.4, 9, 0, 0x5a4c3c); }
    for (let i = 0; i < 4; i++) props.box('plain', -380 + i * 9, terrain.heightAt(-380 + i * 9, shoreZ(-380) + 18) + 0.4, shoreZ(-380 + i * 9) + 18, 1.6, 0.6, 5, 0.3, 0x4a3a2c);
    // ---- the villages, each with its whitewashed church: Ølby, Herfølge; the farms (gårde) round their yards
    for (const [p, seed] of [[P.E, 18081], [P.K, 18082], [P.G, 18083]] as const) buildVillage(props, p, seed);
    props.church({ x: P.K.x + 34, z: P.K.z + 26, yaw: 0.3 });
    props.church({ x: P.E.x - 30, z: P.E.z + 30, yaw: Math.PI / 2 });
    // the windmill on the rise behind the town
    const M = { x: -150, z: 400 }, gm = terrain.heightAt(M.x, M.z);
    props.box('plain', M.x, gm + 4.5, M.z, 4.5, 9, 4.5, 0, 0x6a5a48);
    props.box('plain', M.x, gm + 9.6, M.z, 5, 2, 5, 0, 0x4a3a2e);
    for (const a of [0.5, 0.5 + Math.PI / 2]) props.box('plain', M.x, gm + 9, M.z - 3, 0.5, 14, 0.15, 0, 0xc8bca0, 0, a);
    props.cover.addBox({ x: M.x, z: M.z, yaw: 0, length: 4.5, thickness: 4.5, height: 9 });
    for (let i = 0, n = 0; i < 400 && n < 16; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 0 + r() * 700;
      if (!free(x, z, 10) || !clearOf(x, z, 52) || Math.hypot(x - TOWN.x, z - TOWN.z) < 120 || Math.hypot(x - MANOR.x, z - MANOR.z) < 50 || Math.hypot(x - M.x, z - M.z) < 20 || woods(x, z) > 0.4) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 9 + r() * 3, depth: 12, storeys: 1, name: 'farmstead', damaged: 0 });
      if (r() < 0.5) props.hayBales({ x: x + 12, z: z + 8, yaw: r() * Math.PI, count: 3 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a5e4e);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: MANOR.x, z: MANOR.z, r: 26 }, { x: M.x, z: M.z, r: 8 }, { x: CHURCH.x, z: CHURCH.z, r: 14 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || aa(x, z) < 11 || inland(x, z) < 64 }];
    // Zealand's beech, oak and alder
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2600, broadleaf: 0.85, autumn: 0.1, maxY: 60,
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
