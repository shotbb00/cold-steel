// Køge Bay, August 1807 (coastal, the 1806 epoch: the British land, the Danes hold; 1.0 × 1.8 km). To keep the
// Danish fleet out of Napoleon's hands Cathcart's army landed on Zealand and laid siege to Copenhagen: the main body
// came ashore at Vedbæk on 16 August, and the reserve and the guns were put ashore in Køge Bay south of the city,
// where on 29 August Wellesley met General Castenschiold's levy of Zealand militia at Køge, broke it in the town and
// drove the rest back through Herfølge. On the map the landing comes straight in from Køge Bay against the militia.
// The real coast turned so that the bay is the -z side: east is -z, north -x. Zealand's shore runs slantwise across
// the map — the long, flat Køge Nordstrand reaching away north-west toward Copenhagen, the shore swinging out east
// past the town toward Stevns. Two landing places, as the coast gives them: the open sand of the Nordstrand with the
// Ølsemagle shore meadows behind it, and Køge harbour itself, the Køge Å's mouth between two timber moles, with the
// town on the waterfront south of it. The Køge Å winds in from the west (+z), too deep to wade but at its bridge and
// fords; Ølby among its fields to the north-west, Vallø's manor in its beechwoods south along the coast, and Herfølge
// on its rise to the south-west, where the militia gathered.
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
const noise = createNoise2D(1807_08);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a6a7e }); // (the Øresund side of Zealand in August: calm, blue)

/** The shore (m from the waterline, + ashore): slantwise, the Nordstrand far up in the north-west, the harbour mouth, the coast swinging out toward Stevns. */
const D0 = coastline([
  [-1200, 300], [-700, 150], [-450, 70], [-250, 5], [-80, -80], [15, -140], [70, -165], [170, -200], [320, -270], [500, -370], [800, -560], [1200, -780],
]);
const D = (x: number, z: number) => D0(x, z) + fbm(noise, x * 0.006, z * 0.006, 2) * 6;
const Dr = (x: number, z: number) => D0.raw(x, z) + fbm(noise, x * 0.006, z * 0.006, 2) * 6; // (the same, uncached: for placing things at load)

/** The Køge Å: its line (x at z) from the harbour mouth up west into the fields, its fords; < 0 in its water. */
const aaX = (z: number) => 42 - 0.16 * (z + 150) + 26 * Math.sin(z * 0.006 + 0.4) * smoothstep(-150, 50, z);
const FORDS = [{ name: 'The harbour bridge', z: -60 }, { name: 'The mill ford', z: 300 }, { name: 'Lellinge ford', z: 640 }];
const fordK = (z: number) => Math.max(...FORDS.map((f) => smoothstep(26, 12, Math.abs(z - f.z))));
const aa = (x: number, z: number) => (z < -175 ? 99 : Math.abs(x - aaX(z)) - (5 + 8 * smoothstep(-60, -160, z)));
/** The harbour's two timber moles out into the bay either side of the river mouth. */
const segD = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const MOLES = [[16, -130, 6, -232], [76, -160, 82, -236]];
const moleD = (x: number, z: number) => Math.min(...MOLES.map(([a, b, c, d]) => segD(x, z, a, b, c, d)));

const OELBY = { x: -330, z: 380 };
const TOWN = { x: 160, z: 10 };      // Køge: the market square, on the waterfront south of the river
const HERF = { x: 320, z: 700 };     // Herfølge on its rise
const MANOR = { x: 420, z: 170 };    // Vallø manor in its beechwoods
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = D(x, z);
  if (d < 0) {
    if (moleD(x, z) < 3.5 && z > -240) return 1.6;                                         // the moles' timber and stone
    const s = -d, bar = 0.5 * Math.exp(-(((s - 45) / 14) ** 2)) * smoothstep(40, 140, Math.abs(x - 45)); // (no bar in the dredged harbour mouth)
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16);
  }
  const north = smoothstep(-60, -260, x);                                                  // the Nordstrand: a wide flat strand, low dunes
  const beach = 0.5 + Math.min(d, 30 + 20 * north) * (0.05 - 0.015 * north);
  const dunes = (1.2 + 0.8 * north + fbm(noise, x * 0.012, 3.7, 2) * 1.2) * Math.exp(-(((d - 50 - 14 * north) / 14) ** 2)) * smoothstep(60, 140, Math.abs(x - 60));
  // the Zealand moraine: low rolling fields, rising westward inland, Herfølge's rise, the wooded ground round Vallø, the Ølby rise
  const land = 2.2 + smoothstep(60, 400, d) * 3 + fbm(noise, x * 0.005, z * 0.005, 3) * 2.2
    + smoothstep(200, 900, z) * 10 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.35)
    + hill(x, z, HERF.x, HERF.z, 170, 7) + hill(x, z, MANOR.x + 30, MANOR.z + 140, 140, 7) + hill(x, z, OELBY.x + 40, OELBY.z + 120, 150, 5);
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  if (Math.abs(x - 92) < 36 && d < 40) h = Math.max(h, 1.9 * smoothstep(0, 5, d) * smoothstep(36, 24, Math.abs(x - 92)));      // the harbour quays
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 18 * smoothstep(60, 200, d);
  const b = aa(x, z);
  if (b < 40) {
    const bed = -0.35 - 1.3 * (1 - fordK(z));
    h += (Math.min(h, bed) - h) * smoothstep(20, 0, b);
  }
  return h;
}

function soft(x: number, z: number, foot: boolean) {
  const d = D(x, z);
  if (d >= 0 && d < 35 + 15 * smoothstep(-60, -260, x)) return foot ? 0.85 : 0.6;
  if (aa(x, z) < 9) return foot ? 0.7 : 0.45;
  return 1;
}

const seg = segD;
/** The roads: the coast road north through the strand meadows, the harbour bridge into the town, the Ølby road over the mill ford, the Herfølge road, the road south to Vallø, the lanes. */
const ROADS: number[][] = [
  [-520, 190, -300, 120], [-300, 120, -90, 20], [-90, 20, aaX(-60), -60], [aaX(-60), -60, TOWN.x, TOWN.z],
  [TOWN.x, TOWN.z, 380, 90], [380, 90, MANOR.x, MANOR.z], [MANOR.x, MANOR.z, 520, 260],
  [OELBY.x, OELBY.z, aaX(300), 300], [aaX(300), 300, TOWN.x, TOWN.z],
  [TOWN.x, TOWN.z, 250, 380], [250, 380, HERF.x, HERF.z], [HERF.x, HERF.z, 200, 900],
  [OELBY.x, OELBY.z, -300, 120], [OELBY.x, OELBY.z, -520, 460],
  [OELBY.x, OELBY.z, aaX(640), 640], [aaX(640), 640, HERF.x, HERF.z], [MANOR.x, MANOR.z, HERF.x, HERF.z],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

/** The two landing places, where the shore is (its waterline and the way inland). */
const beachAt = (x: number) => { const z = waterlineZ(Dr, x); return { x, z, ...shoreFrame(Dr, x, z + 4) }; };
const NORD = beachAt(-300), HARB = beachAt(175);
const up = (b: ReturnType<typeof beachAt>, along: number, inl: number) => ({ x: b.x + b.tx * along + b.nx * inl, z: b.z + b.tz * along + b.nz * inl });

export const SECTORS = [
  { x: NORD.x, name: 'Køge Nordstrand', inland: { name: 'Ølby', ...OELBY } },
  { x: HARB.x, name: 'Køge harbour', inland: { name: 'Køge', ...TOWN } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'Køge Bay', x: 240, z: -760, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, ...up(NORD, 0, 48), owner: null, sector: 'west', radius: 60, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, ...up(HARB, 0, 40), owner: null, sector: 'east', radius: 45, opens: 'F' },
  { id: 'E', name: 'Ølby', x: OELBY.x, z: OELBY.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Køge', x: TOWN.x, z: TOWN.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Herfølge', x: HERF.x, z: HERF.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const CHURCH = { x: TOWN.x - 40, z: TOWN.z + 46 };      // St Nicolai

/** Zealand's beechwoods (round Vallø and on the rises), alders along the Køge Å (0..1). */
const woods = (x: number, z: number) => {
  const d = D(x, z);
  if (d < 70) return 0;
  let k = smoothstep(0.42, 0.62, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.3 + 0.5 * smoothstep(300, 750, z))
    + 0.6 * smoothstep(230, 110, Math.hypot(x - MANOR.x - 20, z - MANOR.z - 140));
  const b = aa(x, z);
  if (b > 12 && b < 24 && fordK(z) < 0.3) k = Math.max(k, 0.55);
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  k = Math.min(k, smoothstep(120, 160, Math.hypot(x - TOWN.x, z - TOWN.z)), smoothstep(30, 50, Math.hypot(x - MANOR.x, z - MANOR.z)));
  return Math.min(1, k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'koge',
  name: 'Køge Bay 1807',
  description: 'Zealand, August 1807: the British come ashore in Køge Bay for the siege of Copenhagen and meet the Danish militia at Køge. The long flat Nordstrand and Ølsemagle’s meadows, Køge’s harbour between its moles at the mouth of the Køge Å, the town on the waterfront, Vallø’s manor in its beechwoods, and Herfølge on its rise.',
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
        const d = D(x, z);
        if (d < 0) return moleD(x, z) < 4 ? [0x6a5a48, 1] : [y > -1.2 ? 0xd0c6a4 : 0x7a8c88, 1];
        if (Math.abs(x - 92) < 34 && d < 22) return [0x9a9282, 0.9 * smoothstep(34, 22, Math.abs(x - 92))];                      // the quays
        if (d < 30 + 18 * smoothstep(-60, -260, x)) return [0xe0d4b2, 1];
        if (aa(x, z) < 10) return [0x5e5440, 0.9];
        if (roadDist(x, z) < 3) return [0xa8926e, 0.8];
        if (d < 64) return [0xbcb68e, 0.5];
        const meadow = smoothstep(0.35, 0.55, fbm(noise, x * 0.006 + 40, z * 0.006, 2)) * smoothstep(-120, -260, x) * smoothstep(300, 120, d);
        return meadow > 0.05 ? [0x5e7a42, meadow * 0.55] : null; // (Ølsemagle's wet shore meadows behind the Nordstrand)
      },
    },
  },

  bases: { nato: { x: 160, z: 660, entries: [-280, 160, 400] }, pact: { x: -150, z: -830, entries: SECTORS.map((s) => s.x) } },
  maxStacks: 22,
  cameraStart: { nato: { x: 100, z: 300 }, pact: { x: -60, z: -200 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.12, // (a calm bay)
    signal: { t: 25, say: 'The signal from the flagship — the boats pull for the Nordstrand and Køge harbour', sayOther: 'English boats in the bay: they are landing at Køge!' },
    navy: ['frigate', 'destroyer'],
    // the coast's guns: the redoubt at the harbour mouth, a battery on the Nordstrand, the militia's field pieces in the meadows
    forts: [
      { unit: 'shoreBattery', name: 'Køge harbour battery', ...up(HARB, -95, 30), facing: Math.PI },
      { unit: 'shoreBattery', name: 'Nordstrand battery', ...up(NORD, 120, 60), facing: Math.PI },
      { unit: 'artillery', ...up(NORD, -90, 110), facing: Math.PI },
    ],
    works: [
      ...[-50, 0, 50].map((dx) => ({ kind: 'trench', ...up(NORD, dx, 70), yaw: NORD.yaw })),
      ...[-56, -40, -24, 24, 40, 56].map((dx) => ({ kind: 'wire', ...up(NORD, dx, 40), yaw: NORD.yaw })),
      ...[-30, 30].map((dx) => ({ kind: 'trench', ...up(HARB, dx, 62), yaw: HARB.yaw })),
      ...[-30, -16, 16, 30].map((dx) => ({ kind: 'wire', ...up(HARB, dx, 30), yaw: HARB.yaw })),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle', 'rifles', 'rifles', 'mgTeam'], // (Castenschiold's levy: many, if raw)
    counter: { t: 150, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery', 'rifles', 'mgTeam'], say: 'Castenschiold brings the militia up from Herfølge — drive them back to their boats!', sayOther: 'Danish militia coming up the Herfølge road — form on the strand!' },
    hold: [...[-35, 35].map((dx) => up(NORD, dx, 70)), ...[-25, 25].map((dx) => up(HARB, dx, 62)), OELBY, TOWN, { x: TOWN.x + 60, z: TOWN.z - 70 }],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 700, beachIncome: 0.8, defenceCp: 1400, defenceIncome: 2.0 },
    waves: [
      // the first wave: the light companies, the 95th's riflemen and Wellesley's reserve
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'guard', sector: 1 }, { unit: 'atTeam', sector: 1 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns, and seamen to drag them', units: [{ unit: 'artillery', sector: 0 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'Linsingen’s German hussars are coming ashore', units: [{ unit: 'reconVehicle', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1807_0830);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && aa(x, z) > 12 + rr && D(x, z) > 70 + rr;
    const clearOf = (x: number, z: number, rr: number) => points.every((p) => Math.hypot(p.x - x, p.z - z) > 18 + rr);

    // ---- Køge: half-timbered houses packed between the waterfront and the market square, St Nicolai's tower
    props.rand = mulberry32(1807_0831);
    props.church({ ...CHURCH, yaw: 0.5 });
    for (let i = 0, n = 0; i < 900 && n < 40; i++) {
      const a = r() * Math.PI * 2, rr = 26 + r() * 110, x = TOWN.x + Math.cos(a) * rr, z = TOWN.z + Math.sin(a) * rr * 0.9;
      if (roadDist(x, z) < 7 || !clearOf(x, z, 6) || Math.hypot(x - CHURCH.x, z - CHURCH.z) < 18 || aa(x, z) < 14 || D(x, z) < 40) continue;
      n++;
      props.townHouse({ x, z, yaw: 0.45 + Math.round(a / (Math.PI / 2)) * (Math.PI / 2), width: 7 + r() * 3, depth: 8, storeys: r() < 0.5 ? 2 : 1, name: 'town house', damaged: 0 });
    }
    // ---- Vallø manor: the red-brick house, its two towers
    const g0 = terrain.heightAt(MANOR.x, MANOR.z), BRICK = 0x9a4a3a;
    props.box('stone', MANOR.x, g0 + 5, MANOR.z, 34, 10, 11, 0.1, BRICK);
    props.box('plain', MANOR.x, g0 + 11.5, MANOR.z, 34.6, 3, 11.6, 0.1, 0x3a3634);
    for (const s of [-1, 1]) { const tx = MANOR.x + s * 18 * Math.cos(0.1), tz = MANOR.z - s * 18 * Math.sin(0.1); props.box('stone', tx, g0 + 8, tz, 7, 16, 7, 0.1, BRICK); props.box('plain', tx, g0 + 17, tz, 4, 3, 4, 0.1 + Math.PI / 4, 0x3e5a4c); }
    props.cover.addBox({ x: MANOR.x, z: MANOR.z, yaw: 0.1, length: 40, thickness: 11, height: 10 });
    // the harbour: the moles' timber walks, the warehouses on the quay, fishing boats on the Nordstrand
    for (const [ax, az, bx, bz] of MOLES) for (let i = 0; i <= 8; i++) { const x = ax + (bx - ax) * i / 8, z = az + (bz - az) * i / 8; props.box('plain', x, 2.1, z, 4, 1, 12, Math.atan2(bx - ax, bz - az), 0x5a4c3c); }
    for (const [wx, wz] of [[96, -112], [214, -150], [250, -170]]) if (clearOf(wx, wz, 12) && D(wx, wz) > 14) props.townHouse({ x: wx, z: wz, yaw: 0.45, width: 14, depth: 8, storeys: 2, name: 'warehouse', damaged: 0 });
    for (let i = 0; i < 5; i++) { const q = up(NORD, -60 + i * 10, 18); props.box('plain', q.x, terrain.heightAt(q.x, q.z) + 0.4, q.z, 1.6, 0.6, 5, NORD.yaw + 0.3, 0x4a3a2c); }
    // ---- the villages, each with its whitewashed church: Ølby, Herfølge; the farms (gårde) round their yards
    for (const [p, seed] of [[P.E, 18081], [P.K, 18082]] as const) buildVillage(props, p, seed);
    props.church({ x: P.K.x + 34, z: P.K.z + 26, yaw: 0.3 });
    props.church({ x: P.E.x - 30, z: P.E.z + 30, yaw: Math.PI / 2 });
    // the windmill on the rise behind the town
    const M = { x: 60, z: 230 }, gm = terrain.heightAt(M.x, M.z);
    props.box('plain', M.x, gm + 4.5, M.z, 4.5, 9, 4.5, 0, 0x6a5a48);
    props.box('plain', M.x, gm + 9.6, M.z, 5, 2, 5, 0, 0x4a3a2e);
    for (const a of [0.5, 0.5 + Math.PI / 2]) props.box('plain', M.x, gm + 9, M.z - 3, 0.5, 14, 0.15, 0, 0xc8bca0, 0, a);
    props.cover.addBox({ x: M.x, z: M.z, yaw: 0, length: 4.5, thickness: 4.5, height: 9 });
    for (let i = 0, n = 0; i < 500 && n < 18; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = -200 + r() * 950;
      if (!free(x, z, 10) || !clearOf(x, z, 52) || Math.hypot(x - TOWN.x, z - TOWN.z) < 150 || Math.hypot(x - MANOR.x, z - MANOR.z) < 50 || Math.hypot(x - M.x, z - M.z) < 20 || woods(x, z) > 0.4) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 9 + r() * 3, depth: 12, storeys: 1, name: 'farmstead', damaged: 0 });
      if (r() < 0.5) props.hayBales({ x: x + 12, z: z + 8, yaw: r() * Math.PI, count: 3 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a5e4e);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: MANOR.x, z: MANOR.z, r: 26 }, { x: M.x, z: M.z, r: 8 }, { x: CHURCH.x, z: CHURCH.z, r: 14 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || aa(x, z) < 11 || D(x, z) < 64 }];
    // Zealand's beech, oak and alder
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2600, broadleaf: 0.85, autumn: 0.1, maxY: 60,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => D(x, z) < 34 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
