// Maida, July 1806 (coastal, the 1806 epoch: the British land, the French hold; 1.0 × 1.8 km). On 1 July Sir John
// Stuart's 5,000 rowed ashore in the Gulf of Sant'Eufemia from Sicily, on the open sand north of the Lamato's mouth,
// brushing off a Polish battalion and a few guns; on 4 July Reynier came down from his camp on the hills of Maida and
// San Pietro, forded the Lamato and met them on the plain, where Kempt's light infantry broke his 1st Léger with one
// volley at a hundred yards. On the map the gulf is the -z side (the British come from the sea); the long beach
// with its dunes, the old watchtower of Bastia over the middle beach and the marshy coastal plain behind; the
// Lamato coming down out of the hills and across the plain into the sea (deep near its mouth, three summer fords);
// inland the olive and cork slopes rising to Maida on its hill and San Pietro di Maida on its spur, where the
// French come from.
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
const noise = createNoise2D(1806_07);
const sea = createSea({ level: 0, size: SIZE, color: 0x2c6e86 }); // (the Tyrrhenian in July: deep blue-green over the sand)

/** The waterline (world z; the gulf toward -z): a long, slightly bowed sand shore. */
export const shoreZ = (x: number) => -170 + 0.00008 * x * x + fbm(noise, x * 0.004, 2.1, 2) * 12;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Lamato: its line (x at z), its half-width (wide at the mouth), and the three summer fords. */
const lamX = (z: number) => 175 + 35 * Math.sin(z * 0.0045 + 0.6) + 12 * Math.sin(z * 0.012);
const FORDS = [{ name: 'Coast road ford', z: -60 }, { name: 'Bastia ford', z: 250 }, { name: 'San Pietro ford', z: 560 }];
const fordK = (z: number) => Math.max(...FORDS.map((f) => smoothstep(26, 12, Math.abs(z - f.z))));
/** < 0 in the river's water. */
const lam = (x: number, z: number) => Math.abs(x - lamX(z)) - (5 + 8 * smoothstep(-40, -170, z));

/** The hills inland: Maida on its hill (west), San Pietro di Maida on its spur (east). */
const MAIDA = { x: -130, z: 700 };
const SANPIETRO = { x: 330, z: 350 };
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: a bar where the surf breaks, then shelving away
    const s = -d, bar = 0.5 * Math.exp(-(((s - 45) / 14) ** 2));
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const dunes = (2.5 + fbm(noise, x * 0.012, 3.7, 2) * 2) * Math.exp(-(((d - 50) / 16) ** 2));
  // the coastal plain, flat and low (the Sant'Eufemia marshes), then the slopes rising to the hills
  let land = 2.4 + smoothstep(60, 300, d) * 2 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.5
    + smoothstep(420, 900, d) * 34 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.3)
    + hill(x, z, MAIDA.x, MAIDA.z, 130, 16) + hill(x, z, SANPIETRO.x, SANPIETRO.z, 110, 13) + hill(x, z, SANPIETRO.x + 60, SANPIETRO.z + 110, 120, 10);
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 24 * smoothstep(60, 200, d);
  // the Lamato: its valley a shallow trough, its bed too deep to wade but at the fords
  const b = lam(x, z);
  if (b < 40) {
    const bed = -0.35 - 1.3 * (1 - fordK(z));
    h += (Math.min(h, bed) - h) * smoothstep(20, 0, b);
  }
  return h;
}

/** Soft going: the beach sand and the river's mud. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 35) return foot ? 0.85 : 0.6;
  if (lam(x, z) < 9) return foot ? 0.7 : 0.45;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
/** The tracks: the coast road behind the dunes (over the coast-road ford), Sant'Eufemia up to Maida, Bastia to San Pietro by the middle ford. */
const ROADS: number[][] = [
  [-520, -80, -300, -75], [-300, -75, 0, -65], [0, -65, lamX(-60), -60], [lamX(-60), -60, 520, -50],
  [-380, 130, -300, 420], [-300, 420, MAIDA.x, MAIDA.z], [MAIDA.x, MAIDA.z, 0, 900],
  [0, -65, 30, 220], [30, 220, lamX(250), 250], [lamX(250), 250, SANPIETRO.x, SANPIETRO.z], [SANPIETRO.x, SANPIETRO.z, lamX(560), 560],
  [-380, 130, -300, -75], [-380, 130, 30, 220],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -330, name: 'Sant’Eufemia beach', inland: { name: 'Sant’Eufemia', x: -380, z: 130 } },
  { x: 0, name: 'Torre di Bastia', inland: { name: 'The plain of Maida', x: 30, z: 220 } },
  { x: 340, name: 'Lamato mouth', inland: { name: 'San Pietro di Maida', x: SANPIETRO.x, z: SANPIETRO.z } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The transports’ anchorage', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 50, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 42, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Sant’Eufemia', x: -380, z: 130, owner: null, sector: 'west' },
  { id: 'F', name: 'The plain of Maida', x: 30, z: 220, owner: null, sector: 'centre' },
  { id: 'G', name: 'San Pietro di Maida', x: SANPIETRO.x, z: SANPIETRO.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Maida', x: MAIDA.x, z: MAIDA.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const TOWER = { x: 25, z: shoreZ(25) + 70 }; // the Torre di Bastia: a square Saracen watchtower behind the dunes

/** Olive groves and cork oak on the slopes, myrtle and lentisk scrub in patches on the plain, the alders along the Lamato (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 70) return 0;
  let k = smoothstep(0.42, 0.62, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.35 + 0.55 * smoothstep(380, 600, d));
  const b = lam(x, z);
  if (b > 12 && b < 24 && fordK(z) < 0.3) k = Math.max(k, 0.55);
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'maida',
  name: 'Maida 1806',
  description: 'Calabria, July 1806: Stuart’s British row ashore in the Gulf of Sant’Eufemia and meet Reynier on the plain. The long beach and the Bastia tower, the marshy plain, the Lamato and its fords, Maida and San Pietro on their hills.',
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
        const d = inland(x, z);
        if (d < 0) return [y > -1.2 ? 0xd2c6a2 : 0x8e9082, 1];                       // the sand under the water
        if (d < 32) return [0xe0d2ae, 1];                                             // the beach
        if (lam(x, z) < 10) return [0x6a5a42, 0.9];                                    // the river's gravel and mud
        if (roadDist(x, z) < 3) return [0xb09a74, 0.8];                               // the dusty tracks
        if (d < 70) return [0xc8bc90, 0.6];                                           // the dunes' loose sand and marram
        const marsh = smoothstep(0.35, 0.55, fbm(noise, x * 0.006 + 40, z * 0.006, 2)) * smoothstep(320, 120, d);
        return marsh > 0.05 ? [0x5e6a3c, marsh * 0.6] : null;                          // the reedy marsh pools on the plain
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 0, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the British land: their roads are the beach sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -140 } },
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
    // the coast's guns: the Bastia tower's old pieces and a battery by the river mouth; the Polish battalion's field guns behind the dunes
    forts: [
      { unit: 'shoreBattery', x: TOWER.x + 14, z: TOWER.z - 18, facing: Math.PI },
      { unit: 'shoreBattery', x: 400, z: shoreZ(400) + 45, facing: Math.PI },
      { unit: 'artillery', x: -300, z: shoreZ(-300) + 95, facing: Math.PI },
    ],
    // a few entrenchments behind the dunes, felled trees along the back of the sand
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 62, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 36, yaw: 0 }))),
    ],
    // the Poles and the voltigeurs on the coast, the rest in Sant'Eufemia and on the plain
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: '9e Chasseurs à cheval' },
    // Reynier comes down from the hills, fords the Lamato and attacks in column
    counter: { t: 150, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'Reynier is coming down from Maida — over the Lamato and at them in column!', sayOther: 'French columns crossing the Lamato — form line and wait for the word!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 62 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 650, defenceIncome: 0.8 },
    waves: [
      // the first wave: Kempt's light battalion, the 78th and the 81st, the Corsican Rangers and the 20th's riflemen
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'guard', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns, and seamen to drag them', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'Cole’s brigade is coming ashore', units: [{ unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1806_0701);
    sea.build(scene, terrain);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && lam(x, z) > 12 + rr && inland(x, z) > 70 + rr;

    // ---- the Torre di Bastia: a square stone watchtower on a battered base, behind the dunes
    const g0 = terrain.heightAt(TOWER.x, TOWER.z), foot = g0 - 2, STONE = 0xcabca0;
    props.box('stone', TOWER.x, (foot + g0 + 3) / 2, TOWER.z, 11, g0 + 3 - foot, 11, 0.1, 0x9a8c74);   // the battered base
    props.box('stone', TOWER.x, g0 + 8, TOWER.z, 8.5, 10, 8.5, 0.1, STONE);
    for (const [dx, dz] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4], [0, -3.4], [0, 3.4], [-3.4, 0], [3.4, 0]]) props.box('stone', TOWER.x + dx, g0 + 13.6, TOWER.z + dz, 1.5, 1.2, 1.5, 0.1, STONE); // merlons
    props.cover.addBox({ x: TOWER.x, z: TOWER.z, yaw: 0.1, length: 11, thickness: 11, height: 12 });

    // ---- the villages: Sant'Eufemia on the plain, Maida on its hill with its church, San Pietro on its spur
    for (const [p, seed] of [[P.E, 18061], [P.K, 18062], [P.G, 18063]] as const) buildVillage(props, p, seed);
    props.rand = mulberry32(1806_0704);
    props.church({ x: P.K.x + 34, z: P.K.z + 26, yaw: 0.3 });
    props.church({ x: P.E.x - 30, z: P.E.z + 30, yaw: Math.PI / 2 });
    // farmhouses (masserie) on the plain and the slopes, their field walls
    for (let i = 0, n = 0; i < 400 && n < 22; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = -40 + r() * 760;
      if (!free(x, z, 10) || points.some((p) => Math.hypot(p.x - x, p.z - z) < 70) || Math.hypot(x - TOWER.x, z - TOWER.z) < 40) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.house({ x, z, yaw: r() * Math.PI, width: 8 + r() * 4, depth: 6 });
      if (r() < 0.6) props.lowWall({ x: x + 10, z: z + 6, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.1, color: 0x9a8c72 });
    }
    // fishermen's boats drawn up and nets on the sand by the river mouth
    for (let i = 0; i < 4; i++) props.box('plain', 230 + i * 9, terrain.heightAt(230 + i * 9, shoreZ(230) + 18) + 0.4, shoreZ(230 + i * 9) + 18, 1.6, 0.6, 5, 0.3, 0x5a4434);
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: TOWER.x, z: TOWER.z, r: 12 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || lam(x, z) < 11 || inland(x, z) < 60 }];
    // olives, cork oaks and umbrella pines on the slopes, alders by the river
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2600, broadleaf: 0.7, autumn: 0, maxY: 80,
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
