// Cádiz from the sea (coastal, the 1806 epoch, hypothetical: the British land, the garrison holds; 1.0 × 1.8 km). In
// July 1797 Nelson's bomb vessels shelled the city from the bay and his boats fought the Spanish gunboats under its
// walls; after Trafalgar the Combined Fleet's wreck lay in the harbour, and a landing on the isthmus was the Royal
// Navy's standing temptation. The Spanish garrison fights here as the French (Spain's ships and men sail and march
// under the French side in this war). On the map the Atlantic is the -z side: the walled city on the tip of its rock
// (the sea walls, Santa Catalina's castle over La Caleta, San Sebastián's castle and lighthouse on its islet off the
// tip), the Puerta de Tierra's land front across the neck, the long narrow sand of the Arrecife running south-east
// with the Bay of Cádiz on its far side (+z), Puntales' fort on the bay shore, the Torregorda tower down the beach,
// and the Isla de León — San Fernando, the salt pans, the observatory hill — widening out at the far end toward the
// Puente Zuazo, where the garrison's supports come from.
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
const noise = createNoise2D(1797_0703);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6a8a }); // (the Atlantic off the bar)

/** The ocean shore (world z; the Atlantic toward -z): straight sand along the isthmus, the city's rock at the west end. */
export const shoreZ = (x: number) => -170 + 0.00004 * (x - 100) ** 2 * (x > 100 ? 1 : 0) + fbm(noise, x * 0.004, 2.1, 2) * 9;
/** The bay shore (land toward -z of it): just behind the isthmus, Puntales' bulge, then the Isla de León turning away north. */
const bayZ = (x: number) => 175 + 45 * Math.exp(-(((x + 20) / 60) ** 2)) + 900 * smoothstep(80, 280, x) + fbm(noise, x * 0.006, 9.3, 2) * 8;
/** How far from the ocean (m; < 0 at sea): the shore, and the city's tip on the west. */
const inland = (x: number, z: number) => Math.min(z - shoreZ(x), x + 528 + fbm(noise, 4.4, z * 0.006, 2) * 6);
/** How far from the bay (m; < 0 in it). */
const bayD = (x: number, z: number) => bayZ(x) - z;
const ROCK = -270; // (west of this the city's rock; east of it sand)
const CALETA = (x: number) => x > -440 && x < -320;  // La Caleta, the city's sand cove between the castles
const sandAt = (x: number) => x > ROCK || CALETA(x);
const SEBASTIAN = { x: -590, z: -215 };              // San Sebastián's islet, off the tip (outside the field)

const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = inland(x, z), bd = bayD(x, z);
  if (d < 0) {
    if (Math.hypot(x - SEBASTIAN.x, z - SEBASTIAN.z) < 30) return 3;
    const s = -d, bar = sandAt(x) ? 0.5 * Math.exp(-(((s - 45) / 14) ** 2)) : 0;
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar - (sandAt(x) ? 0 : 1.2 * smoothstep(0, 10, s)), -16);
  }
  if (bd < 0) return Math.max(-0.4 + bd * 0.06, -6);                   // the bay: mud flats shelving to the anchorage
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const dunes = (2 + fbm(noise, x * 0.012, 3.7, 2) * 1.5) * Math.exp(-(((d - 48) / 15) ** 2)) * (sandAt(x) && x > ROCK ? 1 : 0);
  let land = 2.6 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.2
    + smoothstep(ROCK + 40, ROCK - 40, x) * 6                                    // the city's rock
    + hill(x, z, 420, 540, 120, 12) + hill(x, z, 330, 420, 140, 5)               // the observatory hill, San Fernando's rise
    + smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, x) * 20;
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  if (!sandAt(x)) h = Math.max(h, 3 * smoothstep(0, 4, d));                       // the rock under the sea walls
  return Math.min(h, 0.6 + bd * 0.12);                                           // down to the bay's mud
}

function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 35 && sandAt(x)) return foot ? 0.85 : 0.6;
  if (bayD(x, z) >= 0 && bayD(x, z) < 12) return foot ? 0.75 : 0.5;             // the bay's mud
  return 1;
}

const segD = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
/** The roads: the Arrecife down the isthmus from the Puerta de Tierra to the Isla, the streets to La Caleta, the tracks to Puntales and Torregorda. */
const ROADS: number[][] = [
  [-380, 60, -250, 20], [-250, 20, 0, 10], [0, 10, 170, 90], [170, 90, 330, 400], [330, 400, 250, 720], [250, 720, 300, 900],
  [-380, 60, -390, -90], [-380, 60, -470, 120],
  [-40, 130, 0, 10], [0, 10, 0, -60],
  [360, -50, 330, 400], [170, 90, 360, -50], [-250, -50, 500, -40],
  [330, 400, 460, 560],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => segD(x, z, ax, az, bx, bz)));

export const SECTORS = [
  { x: -380, name: 'La Caleta', inland: { name: 'Cádiz', x: -380, z: 60 } },
  { x: 0, name: 'The Arrecife strand', inland: { name: 'Puntales', x: -40, z: 130 } },
  { x: 360, name: 'Torregorda beach', inland: { name: 'Isla de León', x: 330, z: 400 } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The inshore squadron', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 40, owner: null, sector: 'west', radius: 45, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 50, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 42, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: SECTORS[0].inland.name, x: -380, z: 60, owner: null, sector: 'west' },
  { id: 'F', name: SECTORS[1].inland.name, x: -40, z: 130, owner: null, sector: 'centre' },
  { id: 'G', name: SECTORS[2].inland.name, x: 330, z: 400, owner: null, sector: 'east' },
  { id: 'K', name: 'Puente Zuazo road', x: 250, z: 720, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const CATALINA = { x: -470, z: shoreZ(-470) + 28 };
const PUNTALES = { x: -20, z: 196 };
const TORREGORDA = { x: 440, z: shoreZ(440) + 64 };
const inCity = (x: number, z: number) => x < ROCK - 6 && inland(x, z) > 20 && bayD(x, z) > 20 && Math.hypot(x - CATALINA.x, z - CATALINA.z) > 34;

/** Stone pines on the Isla, a few tamarisks along the bay; the isthmus bare sand (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z), bd = bayD(x, z);
  if (d < 70 || bd < 20 || x < 120) return 0;
  let k = smoothstep(0.45, 0.65, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * smoothstep(250, 500, z) * 0.8;
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'cadiz-landing',
  name: 'Cádiz 1806',
  description: 'Cádiz from the sea, hypothetical (Nelson bombarded it in 1797): the British land on the isthmus against the Spanish garrison. The walled city on its rock, La Caleta, the Puerta de Tierra, the narrow Arrecife with the bay behind, Puntales, Torregorda and the Isla de León.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'iberia',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] }, // (the Spanish garrison fights as fr — no Spanish army; gb's regions include iberia)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 280, speed: 5, veer: 0.15 }, // (the poniente off the Atlantic)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1797_0704,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1797_7, cell: 60, weights: [0.15, 0.25, 0.35, 0.25] }),

  theme: {
    fogColor: 0xdcdcd0, fogDensity: 0.00045,
    skyTop: 0x4c86c8, skyHorizon: 0xdee2de, skyBottom: 0xa8a690,
    sunColor: 0xfff4dc, sunIntensity: 2.2, sunDisk: 0.6,
    clouds: 0.1, cloudLight: 0xf8f6f0, cloudDark: 0xcacac4,
    sunDir: [-0.25, 0.75, -0.5],
    hemiSky: 0xd4e0ea, hemiGround: 0x9a8a64, hemiIntensity: 1.25,
    rimColor: 0xf0e8d4, rimIntensity: 0.3,
    terrain: {
      grass: '#909058', grassAlt: '#868650', dryGrass: '#bcac74', dirt: '#9a7e5a', rock: '#a4987e',
      pasture: '#a09c60', ploughed: '#96764e', stubble: '#c8b680', meadow: '#849050',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z), bd = bayD(x, z);
        if (d < 0) return [y > -1.2 ? 0xd6caa4 : 0x8e9282, 1];
        if (bd < 0) return [y > -1.5 ? 0x8a8268 : 0x6e7a72, 1];                       // the bay's mud and water
        if (bd < 12) return [0x7e7458, 0.9];                                           // the bay shore's mud
        if (!sandAt(x) && d < 12) return [0xaaa08c, 0.9];                              // the ostionera rock
        if (inCity(x, z)) return [0xc4b89c, 0.75];                                     // the white city's paving
        if (d < 32) return [0xe4d6b2, 1];
        if (roadDist(x, z) < 3) return [0xb8a47c, 0.8];
        if (d < 80 && x > ROCK) return [0xd0c296, 0.65];                               // the isthmus' loose sand
        const ix = Math.floor(x / 36), iz = Math.floor(z / 26), mx = x - ix * 36, mz = z - iz * 26; // the salt pans: rectangular beds between low banks
        const salt = x > 160 && z > 450 && mx > 3 && mz > 3 && ((ix * 7 + iz * 13) % 5 + 5) % 5 < 2 && roadDist(x, z) > 10;
        return salt ? [0xd8d6cc, 0.7] : null;
      },
    },
  },

  bases: { nato: { x: 360, z: 830, entries: [260, 360, 460] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } },
  maxStacks: 26,
  cameraStart: { nato: { x: 150, z: 330 }, pact: { x: 0, z: -140 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.3, // (the Atlantic swell on the bar)
    signal: { t: 25, say: 'The signal from the flagship — the boats pull for La Caleta and the Arrecife', sayOther: 'English boats off the bar: they are landing on the isthmus' },
    navy: ['frigate', 'destroyer'],
    // Santa Catalina's guns over La Caleta, the Torregorda battery, field guns on the Arrecife
    forts: [
      { unit: 'shoreBattery', x: CATALINA.x + 8, z: CATALINA.z - 6, facing: Math.PI },
      { unit: 'shoreBattery', x: TORREGORDA.x - 18, z: TORREGORDA.z - 20, facing: Math.PI },
      { unit: 'artillery', x: 120, z: shoreZ(120) + 100, facing: Math.PI },
    ],
    works: [
      ...SECTORS.flatMap((s) => [-40, 0, 40].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 62, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-40, -26, -13, 13, 26, 40].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 34, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    counter: { t: 160, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'The columns from the Isla are coming up the Arrecife — throw them back into the surf!', sayOther: 'Columns coming up the Arrecife from the Isla — hold Puntales and the gate!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 62 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 1000, defenceIncome: 1.3 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'guard', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches bring in the guns and the seamen to drag them', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'The marines and the second brigade are coming ashore', units: [{ unit: 'rifles', sector: 2 }, { unit: 'marines', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1797_0705);
    sea.build(scene, terrain);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const OSTION = 0xc2b494, WHITE = 0xe6e0d0;
    const solid = (x: number, z: number, len: number, thick: number, hgt: number, yaw: number, col: number) => {
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + hgt / 2 - 1.5, z, len, hgt + 3, thick, yaw, col);
      props.cover.addBox({ x, z, yaw, length: len, thickness: thick, height: hgt });
    };
    const taken: number[][] = [];

    // ---- the sea walls round the city (open at La Caleta), the Puerta de Tierra's land front across the neck with its gate
    for (let x = -515; x < ROCK; x += 12) if (!CALETA(x) && Math.hypot(x - CATALINA.x, shoreZ(x) + 10 - CATALINA.z) > 26) solid(x, shoreZ(x) + 10, 12, 2.4, 6, 0, OSTION);
    for (let x = -515; x < ROCK; x += 12) solid(x, bayZ(x) - 10, 12, 2.4, 6, 0, OSTION);
    for (let z = shoreZ(-520) + 16; z < bayZ(-520) - 14; z += 12) solid(-516, z, 12, 2.4, 6, Math.PI / 2, OSTION);
    for (let z = shoreZ(ROCK + 20) + 14; z < bayZ(ROCK + 20) - 10; z += 12) if (roadDist(ROCK + 20, z) > 12) solid(ROCK + 20, z, 12, 3, 8, Math.PI / 2, OSTION);
    for (const z of [shoreZ(ROCK + 20) + 30, bayZ(ROCK + 20) - 26]) solid(ROCK + 30, z, 14, 14, 8, Math.PI / 4, OSTION);   // (the land front's bastions)
    { const g = terrain.heightAt(ROCK + 20, 20); props.box('stone', ROCK + 20, g + 11, 6, 4, 6, 4, 0, WHITE); props.box('stone', ROCK + 20, g + 11, 34, 4, 6, 4, 0, WHITE); } // (the gate's marble towers)
    // ---- Santa Catalina's star fort over La Caleta, San Sebastián's castle and lighthouse on the islet
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; solid(CATALINA.x + Math.cos(a) * 16, CATALINA.z + Math.sin(a) * 16, 14, 3, 7, a + Math.PI / 2, OSTION); solid(CATALINA.x + Math.cos(a) * 22, CATALINA.z + Math.sin(a) * 22, 8, 8, 7, a, OSTION); }
    solid(SEBASTIAN.x, SEBASTIAN.z, 30, 18, 6, 0.3, OSTION);
    { const g = terrain.heightAt(SEBASTIAN.x, SEBASTIAN.z); props.box('stone', SEBASTIAN.x + 8, g + 14, SEBASTIAN.z, 5, 28, 5, 0, WHITE); props.box('plain', SEBASTIAN.x + 8, g + 29, SEBASTIAN.z, 3.6, 3, 3.6, 0, 0xf4e8b0); }
    // ---- the city: white houses with their flat roofs and look-out towers, the new cathedral, the plazas' palms
    props.rand = mulberry32(1797_0706);
    props.church({ x: P.E.x + 50, z: P.E.z - 50, yaw: 0 });
    { const g = terrain.heightAt(P.E.x + 50, P.E.z - 50); props.box('stone', P.E.x + 50, g + 16, P.E.z - 50, 9, 6, 9, Math.PI / 4, 0xc8a84a); } // (the cathedral's gilded dome)
    taken.push([P.E.x + 50, P.E.z - 50]);
    for (let i = 0, n = 0; i < 4000 && n < 80; i++) {
      const x = -510 + r() * 260, z = -150 + r() * 380;
      if (!inCity(x, z) || roadDist(x, z) < 9 || near(x, z, 22) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      if (r() < 0.6) props.flatHouse({ x, z, yaw: r() < 0.5 ? Math.PI / 2 : 0, width: 8 + r() * 3, depth: 9 + r() * 2, storeys: r() < 0.6 ? 3 : 2, name: 'house', dome: false });
      else props.townHouse({ x, z, yaw: r() < 0.5 ? Math.PI / 2 : 0, width: 8 + r() * 3, depth: 9 + r() * 2, storeys: 3, damaged: 0 });
      if (r() < 0.15) { const g = terrain.heightAt(x, z); props.box('stone', x, g + 12, z, 2.6, 4, 2.6, 0, WHITE); }        // (a merchant's torre mirador)
    }
    for (const [px, pz] of [[-372, 30], [-400, 88], [-350, 88], [-410, 40]]) props.palm({ x: px, z: pz, height: 9 });
    // ---- Puntales: the low bastioned fort on the bay shore
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; solid(PUNTALES.x + Math.cos(a) * 15, PUNTALES.z + Math.sin(a) * 15, 30, 2.6, 5, a + Math.PI / 2, OSTION); solid(PUNTALES.x + Math.cos(a + Math.PI / 4) * 22, PUNTALES.z + Math.sin(a + Math.PI / 4) * 22, 9, 9, 5, a + Math.PI / 4, OSTION); }
    // ---- the Torregorda
    { const g = terrain.heightAt(TORREGORDA.x, TORREGORDA.z); props.box('stone', TORREGORDA.x, g + 6, TORREGORDA.z, 8, 15, 8, 0.1, OSTION); props.cover.addBox({ x: TORREGORDA.x, z: TORREGORDA.z, yaw: 0.1, length: 8, thickness: 8, height: 13 }); }
    // ---- San Fernando: the church and the houses round G; the observatory on its hill; the farms out toward the Puente Zuazo
    props.rand = mulberry32(1797_0707);
    props.church({ x: P.G.x + 40, z: P.G.z + 26, yaw: Math.PI / 2 });
    { const g = terrain.heightAt(420, 540); props.box('stone', 420, g + 5, 540, 22, 10, 14, 0, WHITE); props.box('stone', 420, g + 12, 540, 6, 4, 6, 0, 0x9aa4a0); }
    taken.push([P.G.x + 40, P.G.z + 26], [420, 540]);
    for (let i = 0, n = 0; i < 1500 && n < 22; i++) {
      const a = r() * Math.PI * 2, dd = 26 + r() * 70, x = P.G.x + Math.cos(a) * dd, z = P.G.z + Math.sin(a) * dd;
      if (roadDist(x, z) < 9 || near(x, z, 22) || bayD(x, z) < 20 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.flatHouse({ x, z, yaw: r() < 0.5 ? Math.PI / 2 : 0, width: 8 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.5 ? 2 : 1, name: 'house', dome: false });
    }
    buildVillage(props, P.K, 17977);
    for (let i = 0; i < 4; i++) props.box('plain', 230 + i * 9, terrain.heightAt(230 + i * 9, shoreZ(230) + 18) + 0.4, shoreZ(230 + i * 9) + 18, 1.6, 0.6, 5, 0.3, 0x5a4434);
    for (const [x0, z0, len] of [[-200, 420, 30], [-120, 480, 34], [-300, 380, 26], [-60, 560, 30]] as const) { // (the Combined Fleet's remnant at anchor in the bay)
      props.box('plain', x0, 0.8, z0, 8, 3, len, 0.4, 0x4a3a2c);
      for (const m of [-0.3, 0, 0.3]) props.box('plain', x0 + Math.sin(0.4) * m * len, 12, z0 + Math.cos(0.4) * m * len, 0.6, 22, 0.6, 0, 0x3e3226);
    }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: PUNTALES.x, z: PUNTALES.z, r: 30 }, { x: TORREGORDA.x, z: TORREGORDA.z, r: 10 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || inland(x, z) < 60 || bayD(x, z) < 14 || x < ROCK + 30 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 900, broadleaf: 0.3, autumn: 0, maxY: 40,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.7, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 34 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
