// Hyères, autumn 1793 (coastal, the 1806 epoch: the British land, the French hold; 1.0 × 1.8 km). While Hood's fleet
// held Toulon for the royalists, the Republic's batteries were built along the shore of the Hyères roads to deny the
// fleet its eastern anchorage, and the allies landed parties there to burn them and to forage the plain; here it is
// a landing in force on the roads east of Toulon. On the map the Hyères roads are the -z side (the boats come from
// the sea; west, -x, is the Giens side): the sand of the Almanarre tombolo running out to Giens with the salt pans
// of the Pesquiers behind it, the open beach of L'Ayguade in the middle, the Gapeau coming down across the plain into
// the sea to the east; inland the flat, rich plain of Hyères with its orange and olive gardens and its bastides,
// Costebelle's hill, and the old town of Hyères on its hill under the ruined castle at the back, where the French
// come from.
// Flipped (a French landing, src/wcampaign/battle.js flipLanding): the same beaches, the allies holding the salt works,
// the bastides and the bridge.
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
const noise = createNoise2D(1793_1201);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a7088 }); // (the Mediterranean in late autumn: clear blue-green)

/** The waterline (world z; the roads toward -z): the long curve of the bay, the tombolo straighter to the west. */
export const shoreZ = (x: number) => -170 + 0.00007 * (x - 60) ** 2 + fbm(noise, x * 0.004, 2.1, 2) * 9;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The Gapeau: its line (x at z), its half-width (wide at the mouth), and its crossings. */
const gapX = (z: number) => 220 + 30 * Math.sin(z * 0.0045 + 1.1) + 10 * Math.sin(z * 0.012);
const FORDS = [{ name: 'The coast road ford', z: -60 }, { name: 'The Gapeau bridge', z: 330 }, { name: 'Sainte-Eulalie ford', z: 600 }];
const fordK = (z: number) => Math.max(...FORDS.map((f) => smoothstep(26, 12, Math.abs(z - f.z))));
/** < 0 in the river's water. */
const gap = (x: number, z: number) => Math.abs(x - gapX(z)) - (5 + 8 * smoothstep(-40, -170, z));

/** The salt pans of the Pesquiers behind the tombolo (> 0 inside the pans' field), and the pans' grid (dykes between). */
const PANS = { x0: -490, x1: -200, d0: 70, d1: 330 };
const pansK = (x: number, z: number) => {
  const d = inland(x, z);
  return smoothstep(PANS.x1, PANS.x1 - 20, x) * smoothstep(PANS.d0, PANS.d0 + 15, d) * smoothstep(PANS.d1, PANS.d1 - 15, d);
};
const dyke = (x: number, z: number) => { const u = ((x + 1000) % 48) - 24, v = ((z + 1000) % 40) - 20; return Math.min(Math.abs(u), Math.abs(v)); };

/** The heights: Hyères on its hill, Costebelle to the west. */
const HYERES = { x: 20, z: 740 };
const COSTEBELLE = { x: -300, z: 560 };
const SALINS = { x: -330, z: 170 };
const PALY = { x: 0, z: 260 };
const BRIDGE = { x: 350, z: 360 };
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: a sand bar, then the roads deepening
    const s = -d, bar = 0.45 * Math.exp(-(((s - 40) / 14) ** 2));
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.045 + bar, -16);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const dunes = (2.2 + fbm(noise, x * 0.012, 3.7, 2) * 1.8) * Math.exp(-(((d - 48) / 15) ** 2));
  // the plain of Hyères: flat and low, then the town's hill and Costebelle rising out of it
  let land = 2.2 + smoothstep(60, 400, d) * 2.5 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.4
    + smoothstep(500, 900, d) * 16 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.3)
    + hill(x, z, HYERES.x, HYERES.z, 150, 26) + hill(x, z, COSTEBELLE.x, COSTEBELLE.z, 130, 20);
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += smoothstep(BOUNDS.x - 40, BOUNDS.x + 160, Math.abs(x)) * 24 * smoothstep(60, 200, d);
  // the salt pans: shallow brine (wadeable) in a grid of low dykes, the salt works on its dry island
  const k = pansK(x, z) * smoothstep(50, 75, Math.hypot(x - SALINS.x, z - SALINS.z));
  if (k > 0) h += ((dyke(x, z) < 2 ? 0.7 : -0.25) - h) * k;
  // the Gapeau: too deep to wade but at the fords and the bridge
  const b = gap(x, z);
  if (b < 120) h += (Math.min(h, 3.2) - h) * smoothstep(120, 25, b); // (its flat valley floor through the rising ground, no gorge)
  if (b < 40) {
    const bed = -0.35 - 1.3 * (1 - fordK(z));
    h += (Math.min(h, bed) - h) * smoothstep(20, 0, b);
  }
  return h;
}

/** Soft going: the beach sand, the brine of the pans, the river's mud. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 34) return foot ? 0.85 : 0.6;
  if (pansK(x, z) > 0.5 && dyke(x, z) > 2) return foot ? 0.6 : 0.4;
  if (gap(x, z) < 9) return foot ? 0.7 : 0.45;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -360, name: 'The Almanarre', inland: { name: 'Les Salins des Pesquiers', x: SALINS.x, z: SALINS.z } },
  { x: 0, name: 'L’Ayguade', inland: { name: 'Le Palyvestre', x: PALY.x, z: PALY.z } },
  { x: 370, name: 'The Gapeau mouth', inland: { name: 'The Gapeau bridge', x: BRIDGE.x, z: BRIDGE.z } },
];

/** The roads: the coast road over the Gapeau, the Giens road down the tombolo to the salt works, the roads up to the town. */
const ROADS: number[][] = [
  [-180, -60, gapX(-60), -60], [gapX(-60), -60, 520, -50],
  [-180, -60, SALINS.x, SALINS.z], [SALINS.x, SALINS.z, -520, 0], [-180, -60, -170, 380],
  [0, -60, PALY.x, PALY.z], [PALY.x, PALY.z, gapX(330), 330], [gapX(330), 330, BRIDGE.x, BRIDGE.z], [BRIDGE.x, BRIDGE.z, 370, -50],
  [PALY.x, PALY.z, HYERES.x, HYERES.z], [HYERES.x, HYERES.z, 0, 900], [-170, 380, HYERES.x, HYERES.z], [-170, 380, COSTEBELLE.x, COSTEBELLE.z],
  [BRIDGE.x, BRIDGE.z, 380, 640], [380, 640, gapX(600), 600], [gapX(600), 600, HYERES.x, HYERES.z], [380, 640, 480, 880], [COSTEBELLE.x, COSTEBELLE.z, -480, 860],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => seg(x, z, ax, az, bx, bz)));

const points: ControlPointDef[] = [
  { id: 'A', name: 'Hood’s inshore squadron', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  // the beach sectors (Landing: open from the start; `opens` what lies behind once taken)
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 40, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 48, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 42, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: SECTORS[0].inland.name, x: SALINS.x, z: SALINS.z, owner: null, sector: 'west' },
  { id: 'F', name: SECTORS[1].inland.name, x: PALY.x, z: PALY.z, owner: null, sector: 'centre' },
  { id: 'G', name: SECTORS[2].inland.name, x: BRIDGE.x, z: BRIDGE.z, owner: null, sector: 'east' },
  { id: 'K', name: 'Hyères', x: HYERES.x, z: HYERES.z, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const TOUR = { x: -470, z: shoreZ(-470) + 60 }; // a round coast-guard tower at the root of the tombolo

/** Orange and olive gardens on the plain, pines and holm oak on the hills, the Gapeau's poplars and canes (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 75 || pansK(x, z) > 0.05) return 0;
  let k = smoothstep(0.4, 0.6, fbm(noise, x * 0.008 + 11, z * 0.008 - 3, 3)) * (0.35 + 0.5 * smoothstep(380, 620, d));
  const b = gap(x, z);
  if (b > 12 && b < 24 && fordK(z) < 0.3) k = Math.max(k, 0.55);
  for (const p of points) k = Math.min(k, smoothstep(35, 65, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'hyeres',
  name: 'Hyères 1793',
  description: 'Provence, autumn 1793: while Hood holds Toulon, the allies land on the Hyères roads to burn the Republic’s batteries. The Almanarre tombolo and the Pesquiers salt pans, L’Ayguade beach, the Gapeau and its bridge, the gardens of the plain and the old town on its hill.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] }, // (Carteaux's and Lapoype's Republicans against Hood's landing parties; gb fields here though its regions leave out Italy — GameEngine armiesOn, as Maida)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' }, // (a bright, cold mistral day)
  wind: { from: 320, speed: 7, veer: 0.15 }, // (the mistral, offshore: the boats pull against it)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1793_1201,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1793_12, cell: 60, weights: [0.3, 0.25, 0.25, 0.2] }), // market gardens, vines cut back, olive ground

  theme: {
    // the mistral's sky: hard, clear and blue, long winter shadows
    fogColor: 0xc8d2d8, fogDensity: 0.0004,
    skyTop: 0x3e74b8, skyHorizon: 0xc4d4e0, skyBottom: 0x9a9a88,
    sunColor: 0xfff0d8, sunIntensity: 2, sunDisk: 0.6,
    clouds: 0.08, cloudLight: 0xf4f4f4, cloudDark: 0xc4c8cc,
    sunDir: [-0.3, 0.5, -0.7],
    hemiSky: 0xc8d8e8, hemiGround: 0x7a7458, hemiIntensity: 1.2,
    rimColor: 0xf0e8d8, rimIntensity: 0.3,
    terrain: {
      grass: '#7a8648', grassAlt: '#707e42', dryGrass: '#a49a64', dirt: '#8a6c4c', rock: '#a09484',
      pasture: '#8a8e52', ploughed: '#8a6a48', stubble: '#b4a272', meadow: '#748444',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) return [y > -1.2 ? 0xd4caa8 : 0x88968e, 1];                     // the sand under the water
        if (d < 32) return [0xe2d6b4, 1];                                           // the beach
        if (pansK(x, z) > 0.4) return dyke(x, z) < 2 ? [0xb8ae94, 0.9] : [0xd8d4cc, 0.85]; // the dykes; the salt crust over the brine
        if (gap(x, z) < 10) return [0x6a5c44, 0.9];                                  // the river's gravel and mud
        if (roadDist(x, z) < 3) return [0xbaa880, 0.8];                             // the white dusty roads
        if (d < 70) return [0xccc096, 0.6];                                         // the dunes
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 0, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } }, // (the allies land: their roads are the beach sectors)
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 330 }, pact: { x: 0, z: -140 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.15, // (the mistral blows offshore: a flat sea on the beaches)
    signal: { t: 25, say: 'The signal from the Victory — the boats pull for the beaches of Hyères', sayOther: 'Boats crossing the roads: the English are landing under the guns of the fleet!' },
    navy: ['frigate', 'destroyer'],
    // the Republic's new batteries along the shore, and the field guns on the plain
    forts: [
      { unit: 'shoreBattery', x: TOUR.x + 20, z: TOUR.z - 10, facing: Math.PI },
      { unit: 'shoreBattery', x: 140, z: shoreZ(140) + 55, facing: Math.PI },
      { unit: 'artillery', x: 300, z: shoreZ(300) + 95, facing: Math.PI },
    ],
    // the coast guard's trenches behind the sand, stakes along the beach
    works: [
      ...SECTORS.flatMap((s) => [-42, 0, 42].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 60, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 34, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Dragons de l’Armée d’Italie' },
    // Lapoype's division comes down from the town
    counter: { t: 150, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'Lapoype’s battalions are coming down from Hyères — into the sea with them!', sayOther: 'Republican columns coming down off the hill of Hyères!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 60 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2200, perSector: 600, beachIncome: 0.75, defenceCp: 650, defenceIncome: 0.95 },
    waves: [
      // the first wave: the marines of the fleet, the 30th and 69th serving as marines, Spanish and Neapolitan companies
      { t: 0, units: [
        { unit: 'marines', sector: 0 }, { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'sniper', sector: 1 }, { unit: 'guard', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns, and seamen to spike the batteries', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 2 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'O’Hara’s second detachment is coming ashore', units: [{ unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1793_1202);
    sea.build(scene, terrain);
    const near = (x: number, z: number, rr: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < rr);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 4 + rr && gap(x, z) > 12 + rr && inland(x, z) > 75 + rr && pansK(x, z) === 0;

    // ---- the coast-guard tower at the root of the tombolo
    {
      const g = terrain.heightAt(TOUR.x, TOUR.z);
      props.box('stone', TOUR.x, g + 5, TOUR.z, 7, 10, 7, 0.3, 0xc8b898);
      props.cover.addBox({ x: TOUR.x, z: TOUR.z, yaw: 0.3, length: 7, thickness: 7, height: 10 });
    }
    // ---- the salt works: the saltworkers' houses and the salt heaps on their dry island among the pans
    props.rand = mulberry32(1793_1203);
    for (const [dx, dz, yaw] of [[-30, 18, 0], [26, 24, 0.2], [-20, -28, Math.PI / 2]] as const)
      props.townHouse({ x: SALINS.x + dx, z: SALINS.z + dz, yaw, width: 12, depth: 7, storeys: 1, name: 'salt works', damaged: 0 });
    for (let i = 0; i < 6; i++) { // the camelles: long white heaps of salt
      const x = SALINS.x + 34 + (i % 3) * 9, z = SALINS.z - 22 + Math.floor(i / 3) * 12;
      props.box('plain', x, terrain.heightAt(x, z) + 1, z, 6, 2.2, 9, 0, 0xf0eee6, 0, 0);
    }
    // ---- Le Palyvestre: a bastide in its garden walls; the bastides of the plain
    for (const [p, seed] of [[P.F, 17931], [P.G, 17932]] as const) buildVillage(props, p, seed);
    props.townHouse({ x: PALY.x + 34, z: PALY.z + 20, yaw: 0, width: 16, depth: 10, storeys: 2, name: 'bastide', damaged: 0 });
    props.lowWall({ x: PALY.x + 34, z: PALY.z + 40, yaw: 0, length: 36, height: 2, color: 0xc8b898 });
    // ---- the Gapeau bridge: a stone bridge's parapets over the bridge ford, a mill and a chapel by it
    {
      const bx = gapX(330);
      for (const s of [-1, 1]) props.box('stone', bx, terrain.heightAt(bx, 330 + s * 5) + 0.8, 330 + s * 5, 28, 1.2, 0.6, 0, 0xb4a488);
      props.townHouse({ x: BRIDGE.x + 30, z: BRIDGE.z + 26, yaw: 0.3, width: 10, depth: 8, storeys: 2, name: 'mill', damaged: 0 });
      props.church({ x: BRIDGE.x - 10, z: BRIDGE.z + 44, yaw: Math.PI / 2 });
    }
    // ---- Hyères: the old town packed on its hill, the collegiate church, the castle's ruined walls on the summit
    props.rand = mulberry32(1793_1204);
    props.church({ x: HYERES.x + 30, z: HYERES.z - 30, yaw: 0.1 });
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2, rr = 26 + r() * 60;
      const x = HYERES.x + Math.cos(a) * rr, z = HYERES.z - 20 + Math.sin(a) * rr * 0.6;
      if (roadDist(x, z) < 7 || Math.hypot(x - HYERES.x - 30, z - HYERES.z + 30) < 18) continue;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: Math.atan2(z - HYERES.z, x - HYERES.x) + Math.PI / 2, width: 7 + r() * 3, depth: 8, storeys: 2 + (r() < 0.4 ? 1 : 0), damaged: 0 });
    }
    for (let i = 0; i < 7; i++) { // the castle's curtain wall, broken, round the hilltop behind the town
      const a = (i / 7) * Math.PI * 1.6 + 0.4;
      props.wall({ x: HYERES.x + Math.cos(a) * 55, z: HYERES.z + 70 + Math.sin(a) * 35, yaw: a + Math.PI / 2, length: 18, height: 5, thickness: 2 });
    }
    // bastides and farms on the plain, their garden walls
    for (let i = 0, n = 0; i < 400 && n < 20; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 60 + r() * 640;
      if (!free(x, z, 10) || near(x, z, 80) || Math.hypot(x - HYERES.x, z - HYERES.z) < 120) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: r() * Math.PI, width: 9 + r() * 4, depth: 7, storeys: r() < 0.4 ? 2 : 1, name: 'bastide', damaged: 0 });
      if (r() < 0.6) props.lowWall({ x: x + 10, z: z + 6, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.4, color: 0xb8a888 });
    }
    // fishermen's boats drawn up on the sand
    for (let i = 0; i < 4; i++) props.box('plain', 120 + i * 9, terrain.heightAt(120 + i * 9, shoreZ(120) + 16) + 0.4, shoreZ(120 + i * 9) + 16, 1.6, 0.6, 5, 0.3, 0x5a4434);
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: TOUR.x, z: TOUR.z, r: 12 }, { x: HYERES.x, z: HYERES.z, r: 100 },
      { test: (x: number, z: number) => roadDist(x, z) < 5 || gap(x, z) < 11 || inland(x, z) < 65 || pansK(x, z) > 0 }];
    // orange and olive gardens, umbrella pines and holm oaks, the Gapeau's poplars
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2000, broadleaf: 0.7, autumn: 0, maxY: 80,
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
