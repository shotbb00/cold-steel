// Maida, July 1806 (coastal, the 1806 epoch: the British land, the French hold; 1.0 × 1.8 km). On 1 July Sir John
// Stuart's 5,000 rowed ashore in the Gulf of Sant'Eufemia from Sicily, on the open sand north of the Lamato's mouth,
// brushing off a Polish battalion and a few guns; on 4 July Reynier came down from his camp on the hills of Maida and
// San Pietro and met them on the plain, where Kempt's light infantry broke his 1st Léger with one volley at a
// hundred yards.
// The real gulf turned so that its water is the -z side: west is -z, north +x. The shore is the long, almost straight
// sand of the gulf, set well back; behind its middle stretch the dunes shut in a reedy lagoon (the Sant'Eufemia
// marshes, the pantano), so the sand there is a bare lido between the sea and the reeds. Two landing places either
// side of it: the strand by Sant'Eufemia at the north end, and the Bastia beach under the old Saracen watchtower just
// north of the Lamato's mouth. The Lamato runs in from the south-east, down the south flank, deep near its mouth and
// fordable at three summer fords; inland the plain of Maida, then the olive and cork slopes rising east to Maida on
// its hill and the spur of San Pietro, where the French come from.
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
const noise = createNoise2D(1806_07);
const sea = createSea({ level: 0, size: SIZE, color: 0x2c6e86 }); // (the Tyrrhenian in July: deep blue-green over the sand)

/** The shore (m from the waterline, + ashore): the gulf's long sand, set back, bowing a little in toward the Lamato's mouth. */
const D0 = coastline([[-1200, -90], [-500, -55], [-260, -35], [-200, -60], [-160, -105], [-120, -60], [-60, -35], [100, -30], [350, -55], [600, -75], [1200, -110]]);
const wob = (x: number, z: number) => fbm(noise, x * 0.005, z * 0.005, 2) * 7;
const D = (x: number, z: number) => D0(x, z) + wob(x, z);
const Dr = (x: number, z: number) => D0.raw(x, z) + wob(x, z); // (uncached: for placing things at load)

/** The pantano: the reedy lagoon behind the dunes (< 1 inside). */
const LAGOON = { x: 135, z: 105, rx: 145, rz: 36 };
const lagK = (x: number, z: number) => Math.hypot((x - LAGOON.x) / LAGOON.rx, (z - LAGOON.z - 0.08 * (x - LAGOON.x)) / LAGOON.rz) + fbm(noise, x * 0.02, z * 0.02, 2) * 0.12;

/** The Lamato: in from the south-east down the south flank to its mouth (x at z), its half-width, the fords; < 0 in its water. */
const lamX = (z: number) => -160 - 0.2 * Math.max(0, z) + 22 * Math.sin(z * 0.009 + 0.5) * smoothstep(-20, 120, z);
const FORDS = [{ name: 'Coast road ford', z: 60 }, { name: 'The Maida ford', z: 360 }, { name: 'San Pietro ford', z: 650 }];
const fordK = (z: number) => Math.max(...FORDS.map((f) => smoothstep(26, 12, Math.abs(z - f.z))));
const lam = (x: number, z: number) => Math.abs(x - lamX(z)) - (5 + 8 * smoothstep(40, -20, z));

/** The hills inland: Maida on its hill (south-east), San Pietro di Maida on its spur (north-east). */
const MAIDA = { x: -170, z: 720 };
const SANPIETRO = { x: 250, z: 660 };
const SANTEU = { x: 340, z: 290 };   // Sant'Eufemia
const PLAIN = { x: -60, z: 340 };    // the plain of Maida, where the lines met
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = D(x, z);
  if (d < 0) { // the bottom: a bar where the surf breaks, then shelving away
    const s = -d, bar = 0.5 * Math.exp(-(((s - 45) / 14) ** 2));
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const dunes = (2.5 + fbm(noise, x * 0.012, 3.7, 2) * 2) * Math.exp(-(((d - 50) / 16) ** 2));
  // the coastal plain, flat and low, then the slopes rising east to the hills
  const land = 2.2 + smoothstep(60, 300, d) * 1.5 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.5
    + smoothstep(420, 860, z) * 30 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.3)
    + hill(x, z, MAIDA.x, MAIDA.z, 140, 16) + hill(x, z, SANPIETRO.x, SANPIETRO.z, 120, 14) + hill(x, z, SANPIETRO.x + 120, SANPIETRO.z - 100, 110, 8);
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 24 * smoothstep(60, 200, d);
  // the pantano: shallow water among the reeds
  const lk = lagK(x, z);
  if (lk < 1.3) h += (-0.9 + 0.8 * lk - h) * smoothstep(1.3, 0.85, lk);
  // the Lamato: its bed too deep to wade but at the fords
  const b = lam(x, z);
  if (b < 40 && z > -130) {
    const bed = -0.35 - 1.3 * (1 - fordK(z));
    h += (Math.min(h, bed) - h) * smoothstep(20, 0, b);
  }
  return h;
}

/** Soft going: the beach sand, the reeds round the lagoon, the river's mud. */
function soft(x: number, z: number, foot: boolean) {
  const d = D(x, z);
  if (d >= 0 && d < 35) return foot ? 0.85 : 0.6;
  if (lagK(x, z) < 1.45) return foot ? 0.7 : 0.45;
  if (lam(x, z) < 9) return foot ? 0.7 : 0.45;
  return 1;
}

const segD = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
/** The tracks: the coast road behind the dunes round the landward side of the pantano, over the coast-road ford; Sant'Eufemia up to San Pietro; the plain up to Maida; across by the Maida ford. */
const ROADS: number[][] = [
  [520, 120, SANTEU.x, SANTEU.z], [SANTEU.x, SANTEU.z, 125, 270], [125, 270, -30, 250], [-30, 250, -40, 120], [-40, 120, lamX(60), 60], [lamX(60), 60, -520, 20],
  [SANTEU.x, SANTEU.z, SANPIETRO.x, SANPIETRO.z], [SANPIETRO.x, SANPIETRO.z, 200, 900],
  [-40, 120, PLAIN.x, PLAIN.z], [PLAIN.x, PLAIN.z, MAIDA.x, MAIDA.z], [MAIDA.x, MAIDA.z, -100, 900], [PLAIN.x, PLAIN.z, 125, 270],
  [PLAIN.x, PLAIN.z, lamX(360), 360], [lamX(360), 360, -520, 420], [MAIDA.x, MAIDA.z, SANPIETRO.x, SANPIETRO.z], [MAIDA.x, MAIDA.z, lamX(650), 650],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => segD(x, z, ax, az, bx, bz)));

/** The two landing places: where the shore is, and the way inland. */
const beachAt = (x: number) => { const z = waterlineZ(Dr, x); return { x, z, ...shoreFrame(Dr, x, z + 4) }; };
const NORTH = beachAt(350), BASTIA = beachAt(-70);
const up = (b: ReturnType<typeof beachAt>, along: number, inl: number) => ({ x: b.x + b.tx * along + b.nx * inl, z: b.z + b.tz * along + b.nz * inl });

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: NORTH.x, name: 'Sant’Eufemia strand', inland: { name: 'Sant’Eufemia', ...SANTEU } },
  { x: BASTIA.x, name: 'Torre di Bastia', inland: { name: 'The plain of Maida', ...PLAIN } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The transports’ anchorage', x: 120, z: -780, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, ...up(NORTH, 0, 46), owner: null, sector: 'east', radius: 55, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, ...up(BASTIA, 0, 50), owner: null, sector: 'west', radius: 55, opens: 'F' },
  { id: 'E', name: 'Sant’Eufemia', ...SANTEU, owner: null, sector: 'east' },
  { id: 'F', name: 'The plain of Maida', ...PLAIN, owner: null, sector: 'west' },
  { id: 'K', name: 'Maida', ...MAIDA, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const TOWER = up(BASTIA, 40, 72); // the Torre di Bastia: a square Saracen watchtower behind the dunes

/** Olive groves and cork oak on the slopes, myrtle and lentisk scrub in patches on the plain, the alders along the Lamato (0..1). */
const woods = (x: number, z: number) => {
  const d = D(x, z);
  if (d < 70 || lagK(x, z) < 1.5) return 0;
  let k = smoothstep(0.42, 0.62, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.35 + 0.55 * smoothstep(380, 600, z));
  const b = lam(x, z);
  if (b > 12 && b < 24 && fordK(z) < 0.3) k = Math.max(k, 0.55);
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'maida',
  name: 'Maida 1806',
  description: 'Calabria, July 1806: Stuart’s British row ashore in the Gulf of Sant’Eufemia and meet Reynier on the plain. The long sand with the reedy pantano behind it, the strand by Sant’Eufemia and the Bastia tower, the Lamato down the south flank, the plain, Maida and San Pietro on their hills.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] }, // (Reynier's division against Stuart's expedition from Sicily; the map names gb, so it fields though gb's regions leave out Italy — GameEngine armiesOn)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' }, // (a blazing July day: the men bathed in the sea before the battle)
  wind: { from: 250, speed: 3, veer: 0.15 }, // (the afternoon sea breeze into the gulf)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1806_0704,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_7, cell: 70, weights: [0.2, 0.35, 0.3, 0.15] }), // July: the wheat cut, stubble and dry pasture

  theme: {
    // high summer in Calabria: a hard white sky at the horizon, the heat haze over the plain
    fogColor: 0xd4d4c4, fogDensity: 0.0005,
    skyTop: 0x5a88c0, skyHorizon: 0xdadcd4, skyBottom: 0xa4a28a,
    sunColor: 0xfff2d4, sunIntensity: 2.1, sunDisk: 0.6,
    clouds: 0.1, cloudLight: 0xf6f4ee, cloudDark: 0xc8c8c0,
    sunDir: [-0.3, 0.7, -0.55],
    hemiSky: 0xd0dce6, hemiGround: 0x8a7c56, hemiIntensity: 1.2,
    rimColor: 0xf0e6d0, rimIntensity: 0.3,
    terrain: {
      grass: '#8a8a4e', grassAlt: '#7e8046', dryGrass: '#b4a46a', dirt: '#8e7050', rock: '#9a8a74',
      pasture: '#9a9458', ploughed: '#8e6c4a', stubble: '#c4b078', meadow: '#7e8a48',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = D(x, z);
        if (d < 0) return [y > -1.2 ? 0xd2c6a2 : 0x8e9082, 1];                       // the sand under the water
        if (d < 32) return [0xe0d2ae, 1];                                             // the beach
        const lk = lagK(x, z);
        if (lk < 1) return [0x5a6248, 1];                                             // the lagoon's mud
        if (lk < 1.45) return [0x6e7a40, 0.8];                                        // the reeds
        if (lam(x, z) < 10) return [0x6a5a42, 0.9];                                   // the river's gravel and mud
        if (roadDist(x, z) < 3) return [0xb09a74, 0.8];                               // the dusty tracks
        if (d < 70) return [0xc8bc90, 0.6];                                           // the dunes' loose sand and marram
        const marsh = smoothstep(0.35, 0.55, fbm(noise, x * 0.006 + 40, z * 0.006, 2)) * smoothstep(320, 120, d);
        return marsh > 0.05 ? [0x5e6a3c, marsh * 0.6] : null;                          // the reedy marsh pools on the plain
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-200, 60, 300] }, pact: { x: 120, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the British land: their roads are the beach sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 360 }, pact: { x: 100, z: -120 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    // the fleet's boats: the foot in flatboats, the guns and horses in the launches
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.15, // (a calm summer sea: the boats ground on the sand without trouble)
    signal: { t: 25, say: 'The signal from HMS Endymion — every boat pulls for the shore', sayOther: 'Boats in the gulf: the English are coming ashore' },
    // Sir Sidney Smith's ships close in to cover the boats
    navy: ['frigate', 'destroyer'],
    // the coast's guns: the Bastia tower's old pieces, a battery on the lido over the north strand; the Polish battalion's field guns
    forts: [
      { unit: 'shoreBattery', ...up(BASTIA, 30, 55), facing: Math.PI },
      { unit: 'shoreBattery', ...up(NORTH, -150, 50), facing: Math.PI },
      { unit: 'artillery', ...up(BASTIA, -55, 120), facing: Math.PI },
    ],
    // a few entrenchments behind the dunes, felled trees along the back of the sand
    works: [
      ...[NORTH, BASTIA].flatMap((b) => [-45, 0, 45].map((dx) => ({ kind: 'trench', ...up(b, dx, 64), yaw: b.yaw }))),
      ...[NORTH, BASTIA].flatMap((b) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', ...up(b, dx, 36), yaw: b.yaw }))),
    ],
    // the Poles and the voltigeurs on the coast, the rest in Sant'Eufemia and on the plain
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: '9e Chasseurs à cheval' },
    // Reynier comes down from the hills and attacks in column
    counter: { t: 150, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'Reynier is coming down from Maida — at them in column!', sayOther: 'French columns coming down onto the plain — form line and wait for the word!' },
    hold: [...[NORTH, BASTIA].flatMap((b) => [-30, 30].map((dx) => up(b, dx, 64))), SANTEU, PLAIN, { x: TOWER.x - 20, z: TOWER.z + 30 }],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 700, beachIncome: 0.8, defenceCp: 850, defenceIncome: 1.05 },
    waves: [
      // the first wave: Kempt's light battalion, the 78th and the 81st, the Corsican Rangers and the 20th's riflemen
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'guard', sector: 1 }, { unit: 'atTeam', sector: 1 }, { unit: 'rifles', sector: 1 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns, and seamen to drag them', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'Cole’s brigade is coming ashore', units: [{ unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1806_0701);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && lam(x, z) > 12 + rr && D(x, z) > 70 + rr && lagK(x, z) > 1.5;

    // ---- the Torre di Bastia: a square stone watchtower on a battered base, behind the dunes
    const g0 = terrain.heightAt(TOWER.x, TOWER.z), foot = g0 - 2, STONE = 0xcabca0;
    props.box('stone', TOWER.x, (foot + g0 + 3) / 2, TOWER.z, 11, g0 + 3 - foot, 11, 0.1, 0x9a8c74);   // the battered base
    props.box('stone', TOWER.x, g0 + 8, TOWER.z, 8.5, 10, 8.5, 0.1, STONE);
    for (const [dx, dz] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4], [0, -3.4], [0, 3.4], [-3.4, 0], [3.4, 0]]) props.box('stone', TOWER.x + dx, g0 + 13.6, TOWER.z + dz, 1.5, 1.2, 1.5, 0.1, STONE); // merlons
    props.cover.addBox({ x: TOWER.x, z: TOWER.z, yaw: 0.1, length: 11, thickness: 11, height: 12 });

    // ---- the villages: Sant'Eufemia by the north strand, Maida on its hill with its church, San Pietro on its spur
    for (const [p, seed] of [[P.E, 18061], [P.K, 18062], [SANPIETRO, 18063]] as const) buildVillage(props, p, seed);
    props.rand = mulberry32(1806_0704);
    props.church({ x: P.K.x + 34, z: P.K.z + 26, yaw: 0.3 });
    props.church({ x: P.E.x + 30, z: P.E.z + 34, yaw: Math.PI / 2 });
    props.church({ x: SANPIETRO.x - 30, z: SANPIETRO.z + 26, yaw: 0.1 });
    // farmhouses (masserie) on the plain and the slopes, their field walls
    for (let i = 0, n = 0; i < 500 && n < 22; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 0 + r() * 760;
      if (!free(x, z, 10) || points.some((p) => Math.hypot(p.x - x, p.z - z) < 70) || Math.hypot(x - TOWER.x, z - TOWER.z) < 40 || Math.hypot(x - SANPIETRO.x, z - SANPIETRO.z) < 50) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.house({ x, z, yaw: r() * Math.PI, width: 8 + r() * 4, depth: 6 });
      if (r() < 0.6) props.lowWall({ x: x + 10, z: z + 6, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.1, color: 0x9a8c72 });
    }
    // fishermen's boats drawn up on the sand by the river mouth, their huts on the lido
    for (let i = 0; i < 4; i++) { const q = up(BASTIA, -50 - i * 9, 18); props.box('plain', q.x, terrain.heightAt(q.x, q.z) + 0.4, q.z, 1.6, 0.6, 5, 0.3, 0x5a4434); }
    for (const dx of [60, 130, 190]) { const q = up(BASTIA, dx + 70, 62); if (lagK(q.x, q.z) > 1.3) props.house({ x: q.x, z: q.z, yaw: 0.05, width: 6, depth: 4, height: 2.4 }); }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: TOWER.x, z: TOWER.z, r: 12 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || lam(x, z) < 11 || D(x, z) < 60 || lagK(x, z) < 1.35 }];
    // olives, cork oaks and umbrella pines on the slopes, alders by the river
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2600, broadleaf: 0.7, autumn: 0, maxY: 80,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => D(x, z) < 34 || lagK(x, z) < 1.1 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
