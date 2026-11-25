// Civitavecchia (coastal, the 1806 epoch, hypothetical: the British and the Russians land, the French hold; 1.0 × 1.8 km).
// The Papal States' only port on the Tyrrhenian, occupied by the French since 1798 and again from 1806: Trajan's
// harbour with its two moles and the antemurale, the detached breakwater across the mouth, and Michelangelo's Forte
// at the root of the south mole, the square fort with its round corner towers and the tall octagonal keep. No one
// landed here in 1805–07 — Craig's British and Lacy's Russians came ashore at Naples — but the coast was the Royal
// Navy's to choose, and this is the landing they could have made.
// The ground is the real coast, the sea the -z side (south-west; north-west is -x). A wide stretch of open water
// in front; the shore lies far back. In the north-west the walled town on its low rock with the harbour out in front
// of it, the moles reaching two hundred metres into the sea and the antemurale lying across their mouth, so that the
// harbour is a walled pool standing out from the coast; the Forte at the south mole's root. South-east of it the
// coast falls back into the shallow bay of Sant'Agostino with its sand and low dunes, and ends at the point of the
// Torre Chiaruccia, the coast-watch tower over its cove. Behind the shore the Via Aurelia; the plain is flat in the
// north-west round the town and climbs south-east to the Terme Taurine, the Roman baths on their knoll, and on into the
// macchia and oak of the Tolfa hills in the eastern corner, on the Allumiere road, where the French come from. Three ways
// in: the Marina under the Forte, straight into the town's gate; the bay's sand and the cove under the tower, both up to
// the Terme.
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
const noise = createNoise2D(1806_0611);
const sea = createSea({ level: 0, size: SIZE, color: 0x2a6a88 }); // (the Tyrrhenian off Lazio)

/** The waterline (world z; the sea toward -z): far back, the town's rock straight, the bay of Sant'Agostino, the tower's point. */
export const shoreZ = (x: number) => 40 + fbm(noise, x * 0.004, 2.1, 2) * 8 + 60 * smoothstep(-80, 180, x) - 70 * Math.exp(-(((x - 465) / 45) ** 2)) + 18 * Math.exp(-(((x - 385) / 35) ** 2));
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);

/** The moles: the north (Lazzaretto) mole, the south mole under the Forte, the antemurale across the mouth (gaps at both ends). */
const MOLES: number[][][] = [[[-420, 60], [-420, -190]], [[-130, 55], [-175, -190]], [[-390, -238], [-205, -238]]];
const segD = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const moleD = (x: number, z: number) => (x > -440 && x < -110 && z > -260 && z < 80 ? Math.min(...MOLES.map(([[ax, az], [bx, bz]]) => segD(x, z, ax, az, bx, bz))) : 99);
/** In the harbour (between the moles). */
const inHarbour = (x: number, z: number) => x > -415 && x < -140 && z > -235 && inland(x, z) < 0;

const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
const TERME = { x: 120, z: 470 };
const TOLFA = { x: 330, z: 760 };
const SAND = -110; // (south-east of this the shore is sand; north-west of it the town's rock and quays)

function heightRaw(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) {
    if (inHarbour(x, z)) return -4;                             // the basin, dredged
    const s = -d, bar = x > SAND ? 0.5 * Math.exp(-(((s - 45) / 14) ** 2)) : 0;
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 120) * 0.04 + bar, -16);
  }
  const rocky = smoothstep(SAND + 20, SAND - 20, x);
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const dunes = (1.8 + fbm(noise, x * 0.012, 3.7, 2) * 1.5) * Math.exp(-(((d - 45) / 14) ** 2)) * (1 - rocky);
  // the plain: flat round the town, climbing south-east to the Terme and into the Tolfa hills in the eastern corner
  const tolfa = smoothstep(380, 1050, z + 0.55 * x);
  const land = 2.4 + fbm(noise, x * 0.005, z * 0.005, 3) * 1.5 + tolfa * 42 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.35)
    + hill(x, z, TERME.x + 30, TERME.z + 20, 110, 12) + hill(x, z, -300, 200, 140, 4);
  let h = Math.max(beach + dunes * smoothstep(15, 35, d), Math.min(land, beach + d * 0.3));
  h += rocky * (3 * smoothstep(0, 5, d) - (h - 2.4) * 0.3 * smoothstep(60, 0, d));                 // the town's low rock shore and quays
  return h;
}
const heightC = gridCacheSmooth(heightRaw, BOUNDS, 2);
function height(x: number, z: number) {
  const md = moleD(x, z);
  if (md >= 10) return heightC(x, z);
  const h = heightC(x, z);
  return md < 6 ? Math.max(h, 2.4) : Math.max(h, 2.4 - (md - 6) * 1.6); // the moles' tops
}

/** Soft going: the beach sand. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 35 && x > SAND) return foot ? 0.85 : 0.6;
  return 1;
}

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -45, name: 'The Marina', inland: { name: 'Civitavecchia', x: -300, z: 190 } },
  { x: 190, name: 'Sant’Agostino beach', inland: { name: 'Terme Taurine', x: TERME.x, z: TERME.z } },
  { x: 385, name: 'Torre Chiaruccia', inland: { name: 'Terme Taurine', x: TERME.x, z: TERME.z } },
];
const FORTE = { x: -170, z: shoreZ(-170) + 40 };                      // Michelangelo's Forte at the south mole's root
const CHIARUCCIA = { x: 455, z: shoreZ(455) + 30 };                   // the coast-watch tower on its point
const TOWN = SECTORS[0].inland;
/** The roads: the Via Aurelia behind the dunes, the town up to the Terme and the Allumiere road, the beach tracks inland. */
const ROADS: number[][] = [
  [-520, 150, TOWN.x, TOWN.z], [TOWN.x, TOWN.z, -60, 150], [-60, 150, 150, 210], [150, 210, 400, 200], [400, 200, 520, 220],
  [TOWN.x, TOWN.z, -420, 90], [-60, 150, SECTORS[0].x, shoreZ(SECTORS[0].x) + 40], [FORTE.x + 30, FORTE.z + 20, -60, 150],
  [TOWN.x, TOWN.z, -150, 380], [-150, 380, TERME.x, TERME.z], [TERME.x, TERME.z, 230, 620], [230, 620, TOLFA.x, TOLFA.z], [TOLFA.x, TOLFA.z, 300, 900],
  [SECTORS[1].x, shoreZ(SECTORS[1].x) + 40, 150, 210], [150, 210, TERME.x, TERME.z],
  [SECTORS[2].x, shoreZ(SECTORS[2].x) + 40, 400, 200], [400, 200, 330, 420], [330, 420, TERME.x, TERME.z],
  [-150, 380, -260, 900],
];
const roadDist = (x: number, z: number) => Math.min(...ROADS.map(([ax, az, bx, bz]) => segD(x, z, ax, az, bx, bz)));
const roadC = gridCache(roadDist, BOUNDS, 2);

const points: ControlPointDef[] = [
  { id: 'A', name: 'The squadron’s anchorage', x: -280, z: -700, owner: 'pact', sector: 'centre', radius: 80 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 44, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 50, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 40, owner: null, sector: 'east', radius: 40, opens: 'F' },
  { id: 'E', name: TOWN.name, x: TOWN.x, z: TOWN.z, owner: null, sector: 'west' },
  { id: 'F', name: 'Terme Taurine', x: TERME.x, z: TERME.z, owner: null, sector: 'centre' },
  { id: 'K', name: 'The Allumiere road', x: TOLFA.x, z: TOLFA.z, owner: 'nato', sector: 'east' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const inTown = (x: number, z: number) => x > -505 && x < -165 && z < 330 && inland(x, z) > 10 && Math.hypot(x - FORTE.x, z - FORTE.z) > 38;

/** Macchia and holm oak on the Tolfa slopes, olive and vine closer in (0..1). */
const woods = gridCache((x: number, z: number) => {
  const d = inland(x, z);
  if (d < 70 || inTown(x, z) || x < -160 && z < 340) return 0;
  let k = smoothstep(0.42, 0.62, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.3 + 0.6 * smoothstep(450, 850, z + 0.55 * x));
  for (const p of points) k = Math.min(k, smoothstep(30, 60, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
}, BOUNDS, 4);

export default {
  id: 'civitavecchia',
  name: 'Civitavecchia 1806',
  description: 'The papal port, hypothetical 1806: an Anglo-Russian landing against the French garrison. Trajan’s harbour standing out into the sea behind its moles and antemurale, Michelangelo’s Forte, the walled town, the bay of Sant’Agostino and the Torre Chiaruccia, the Terme Taurine and the Tolfa hills.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb', 'ru'] }, // (the map names them, so gb fields in Italy though its regions leave it out — GameEngine armiesOn)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 240, speed: 4, veer: 0.15 }, // (the libeccio off the sea)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1806_0612,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_61, cell: 70, weights: [0.25, 0.3, 0.3, 0.15] }),

  theme: {
    fogColor: 0xd0d4cc, fogDensity: 0.0005,
    skyTop: 0x5888c2, skyHorizon: 0xd8dcd6, skyBottom: 0xa0a08c,
    sunColor: 0xfff0d4, sunIntensity: 2.0, sunDisk: 0.6,
    clouds: 0.2, cloudLight: 0xf6f4ee, cloudDark: 0xc4c6c0,
    sunDir: [-0.35, 0.7, -0.5],
    hemiSky: 0xd0dce6, hemiGround: 0x847a58, hemiIntensity: 1.2,
    rimColor: 0xf0e6d0, rimIntensity: 0.3,
    terrain: {
      grass: '#84884c', grassAlt: '#7a7e46', dryGrass: '#b0a26a', dirt: '#8a6e50', rock: '#9a8e7a',
      pasture: '#949458', ploughed: '#8a6a4a', stubble: '#c0ae78', meadow: '#7a8848',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (moleD(x, z) < 8) return [0xbab2a0, 0.95];                                // the moles' stone
        if (d < 0) return [y > -1.2 ? 0xd0c4a0 : 0x8a8e80, 1];
        if (x < SAND && d < 12) return [0xa8a090, 0.9];                               // the rocks and the quays
        if (inTown(x, z)) return [0xb0a48a, 0.7];                                     // the town's paving
        if (d < 32) return [0xdcceaa, 1];                                             // the sand
        if (roadC(x, z) < 3) return [0xae9a74, 0.8];
        if (d < 70 && x > SAND) return [0xc4b88e, 0.6];                               // the dunes
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-260, 60, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 450 }, pact: { x: 0, z: -100 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.2,
    signal: { t: 25, say: 'The signal from the flagship — the boats pull for the Marina and the bay', sayOther: 'Sails off the harbour: the boats are coming in under the Forte' },
    navy: ['frigate', 'destroyer'],
    // the Forte's guns on the harbour and the Marina, the battery at the Torre Chiaruccia, field guns behind the sand
    forts: [
      { unit: 'shoreBattery', x: FORTE.x + 4, z: FORTE.z - 26, facing: Math.PI },
      { unit: 'shoreBattery', x: CHIARUCCIA.x - 20, z: CHIARUCCIA.z + 10, facing: Math.PI },
      { unit: 'artillery', x: 120, z: shoreZ(120) + 110, facing: Math.PI },
    ],
    works: [
      ...SECTORS.flatMap((s, i) => (i === 2 ? [-25, 25] : [-45, 0, 45]).map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 64, yaw: 0 }))),
      ...SECTORS.flatMap((s, i) => (i === 2 ? [-30, -16, 16, 30] : [-44, -30, -16, 16, 30, 44]).map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 36, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    counter: { t: 160, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'The column from the Tolfa hills is coming down the Allumiere road — drive them into the sea!', sayOther: 'French columns on the Allumiere road — hold the Terme and the walls!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 64 }))), { x: TOWN.x, z: TOWN.z }, { x: TOWN.x + 60, z: TOWN.z - 60 }, { x: TERME.x, z: TERME.z }, { x: TERME.x + 60, z: TERME.z - 50 }],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.0 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'sniper', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'guard', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches bring in the guns and the seamen to drag them', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'The second brigade is coming ashore', units: [{ unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 1 }, { unit: 'artillery', sector: 0 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1806_0613);
    sea.build(scene, terrain);
    const near = (x: number, z: number, d: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < d);
    const STONE = 0xc8bca2, TUFA = 0xb49c7c;
    const solid = (x: number, z: number, len: number, thick: number, hgt: number, yaw: number, col: number) => {
      const g = terrain.heightAt(x, z);
      props.box('stone', x, g + hgt / 2 - 1.5, z, len, hgt + 3, thick, yaw, col);
      props.cover.addBox({ x, z, yaw, length: len, thickness: thick, height: hgt });
    };

    // ---- Michelangelo's Forte: a square of curtain walls, a round(ish) tower at each corner, the octagonal keep
    props.rand = mulberry32(1806_0614);
    const H = 17;
    for (const [dx, dz, yaw] of [[0, -H, 0], [0, H, 0], [-H, 0, Math.PI / 2], [H, 0, Math.PI / 2]] as const) {
      if (dz > 0) { solid(FORTE.x - 11, FORTE.z + dz, 12, 3, 9, yaw, STONE); solid(FORTE.x + 11, FORTE.z + dz, 12, 3, 9, yaw, STONE); } // (the gate on the town side)
      else solid(FORTE.x + dx, FORTE.z + dz, 34, 3, 9, yaw, STONE);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const a of [0, Math.PI / 4]) solid(FORTE.x + sx * H, FORTE.z + sz * H, 10, 10, 11, a, STONE);
    for (const a of [0, Math.PI / 8 * 2]) solid(FORTE.x, FORTE.z, 9, 9, 22, a + Math.PI / 8, 0xd2c6ac);    // the maschio
    // ---- the harbour: ships at anchor in the basin, the lantern on the antemurale
    for (const [x0, z0, len] of [[-360, -60, 22], [-320, -120, 18], [-260, -40, 16], [-220, -150, 20], [-380, -170, 18]] as const) {
      props.box('plain', x0, 0.5, z0, 5, 2, len, 0.15, 0x5a4432);
      props.box('plain', x0, 8, z0, 0.45, 14, 0.45, 0, 0x4a3a2a);
    }
    { const g = 2.4; props.box('stone', -300, g + 6, -238, 5, 12, 5, 0, 0xe0d8c4); props.box('plain', -300, g + 13, -238, 3.4, 2.4, 3.4, 0, 0xf4e8b0); }
    // ---- the town: tufa and stone houses behind the quays, the cathedral, the Urban walls on the land side
    props.rand = mulberry32(1806_0615);
    const taken: number[][] = [];
    props.church({ x: P.E.x + 40, z: P.E.z - 36, yaw: 0 });
    props.townHouse({ x: P.E.x - 40, z: P.E.z + 10, yaw: Math.PI / 2, width: 18, depth: 10, storeys: 2, name: 'the papal governor’s palace', damaged: 0 });
    taken.push([P.E.x + 40, P.E.z - 36], [P.E.x - 40, P.E.z + 10]);
    for (let i = 0, n = 0; i < 3000 && n < 70; i++) {
      const x = -500 + r() * 335, z = 60 + r() * 270;
      if (!inTown(x, z) || roadC(x, z) < 10 || near(x, z, 22) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 13)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.townHouse({ x, z, yaw: (r() < 0.5 ? Math.PI / 2 : 0) + (r() - 0.5) * 0.12, width: 7 + r() * 3, depth: 8 + r() * 2, storeys: r() < 0.5 ? 3 : 2, damaged: 0 });
    }
    for (let x = -495; x < -165; x += 12) if (roadC(x, 340) > 10) solid(x, 340, 12, 2.4, 6, 0, TUFA);       // the land walls
    for (let z = 330; z > 80; z -= 12) if (roadC(-162, z) > 10 && Math.hypot(-162 - FORTE.x, z - FORTE.z) > 30) solid(-162, z, 12, 2.4, 6, Math.PI / 2, TUFA);
    // ---- the Terme Taurine: the Roman baths' broken walls and columns beside the point
    props.rand = mulberry32(1806_0616);
    for (const [dx, dz, len, yaw] of [[34, -10, 16, 0], [34, 14, 16, 0], [26, 2, 22, Math.PI / 2], [44, 2, 22, Math.PI / 2], [-36, 20, 12, 0.2]] as const) solid(TERME.x + dx, TERME.z + dz, len, 1.6, 3.5, yaw, 0xb08a6a);
    for (let i = 0; i < 6; i++) props.column({ x: TERME.x - 30 + i * 5, z: TERME.z - 30, radius: 0.5, height: 2 + (i % 3) });
    // ---- the Torre Chiaruccia
    { const g = terrain.heightAt(CHIARUCCIA.x, CHIARUCCIA.z); props.box('stone', CHIARUCCIA.x, g + 5, CHIARUCCIA.z, 8, 14, 8, 0.2, STONE); props.cover.addBox({ x: CHIARUCCIA.x, z: CHIARUCCIA.z, yaw: 0.2, length: 8, thickness: 8, height: 12 }); }
    // ---- the farms on the slopes: the casale on the Aurelia, the hamlet on the Allumiere road
    for (const [p, seed] of [[{ x: 330, z: 330 }, 18066], [P.K, 18067]] as const) buildVillage(props, p, seed);
    props.rand = mulberry32(1806_0617);
    props.church({ x: P.K.x - 40, z: P.K.z + 26, yaw: 0.3 });
    for (let i = 0, n = 0; i < 400 && n < 18; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 150 + r() * 650;
      if (roadC(x, z) < 14 || inland(x, z) < 90 || x < -150 && z < 360 || near(x, z, 70)) continue;
      n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.house({ x, z, yaw: r() * Math.PI, width: 8 + r() * 4, depth: 6 });
      if (r() < 0.6) props.lowWall({ x: x + 10, z: z + 6, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.1, color: 0x9a8c72 });
    }
    for (let i = 0; i < 4; i++) props.box('plain', 260 + i * 9, terrain.heightAt(260 + i * 9, shoreZ(260 + i * 9) + 18) + 0.4, shoreZ(260 + i * 9) + 18, 1.6, 0.6, 5, 0.3, 0x5a4434);
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), { x: FORTE.x, z: FORTE.z, r: 30 }, { x: CHIARUCCIA.x, z: CHIARUCCIA.z, r: 10 },
      { test: (x: number, z: number) => roadC(x, z) < 5 || inland(x, z) < 60 || inTown(x, z) || x < -158 && z < 345 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2400, broadleaf: 0.6, autumn: 0, maxY: 80,
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
