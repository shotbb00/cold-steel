// A British raid on Trieste (coastal, the 1806 epoch, hypothetical: the British land, the French hold; 1.0 × 1.8 km).
// From 1809 to 1813 the Royal Navy’s Adriatic frigates raided the Illyrian coast at will — boats cut out convoys
// under the batteries, landing parties spiked the guns and burnt the stores, and in 1813 Rowley’s squadron took
// Trieste’s castle with the Austrians. Here the raid comes in force.
// The ground is the real head of the gulf, the water the -z side (south-west; north-west is -x). The town lies on its
// narrow shore strip under the Karst edge: the harbour between the Lanterna mole and the Molo San Carlo, the Borgo
// Teresiano’s grid, the old town round the hill of San Giusto with the castle and the cathedral on top; west of it
// the shore runs on under the cliffs toward Barcola. South-east of the town the coast turns sharply inland at Servola
// and the Bay of Muggia cuts deep into the land, half a kilometre and more, to the Zaule salt pans at its head; its far
// shore, Muggia, is off the map to the south-east. Behind everything the Karst edge rises steeply onto the limestone
// plateau (as trieste1805.ts: dolines, dry-stone walls, scrub oak and black pine), with Cattinara on the spur over
// the bay’s head. Two ways in: the harbour, straight under the castle; and the long row up the Bay of Muggia past
// Servola’s guns to the mud and the salt pans of Zaule, and up the spur to Cattinara. The French come down from the
// Sežana road (+z).
// Both shores work: flipped (campaign flipLanding) the French land and the British hold the port.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
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
const noise = createNoise2D(1806_52);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e6878 }); // (the gulf: clear blue-green over the rock)

/** Where the Bay of Muggia opens (x): east of it the water runs deep inland. */
const BAY_X = 235;
const BAY_HEAD = 230;
/** The waterline (world z; the gulf toward -z): the town's shore curving in, then the Bay of Muggia cutting deep inland. */
export const shoreZ = (x: number) => -140 + 45 * Math.exp(-(((x + 20) / 210) ** 2)) + fbm(noise, x * 0.005, 2.1, 2) * 8
  + (BAY_HEAD + 130) * smoothstep(BAY_X - 25, BAY_X + 30, x) - 25 * smoothstep(380, 500, x);
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);
const EDGE = 62; // the Karst edge’s height over the strip
/** How far from the water (m): from the gulf's shore, or across from the Bay of Muggia's west bank and its head. */
const fromWater = (x: number, z: number) => Math.min(inland(x, z), Math.hypot(Math.max(0, BAY_X + 5 - x), Math.max(0, z - BAY_HEAD)));
/** 0..1 up the edge: the shore strip (0) to the plateau (1). */
const edgeK = (x: number, z: number) => smoothstep(110, 300, fromWater(x, z) + 25 * Math.sin(x * 0.009));

/** The moles: [x, length]: the Lanterna mole (west) and the Molo San Carlo (east), out into the harbour. */
const MOLES = [[-125, 85], [110, 70]];
const SANGIUSTO = { x: 40, z: shoreZ(40) + 125 };
/** The Zaule salt pans at the head of the bay: the pans (x, z, w, d), a little under the sea. */
const PANS: number[][] = [];
for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) PANS.push([300 + i * 48, BAY_HEAD + 85 + j * 32, 20, 12]);
const inPan = (x: number, z: number) => PANS.some(([cx, cz, w, d]) => Math.abs(x - cx) < w && Math.abs(z - cz) < d);
const saltK = (x: number, z: number) => smoothstep(BAY_X + 30, BAY_X + 60, x) * smoothstep(BAY_HEAD + 170, BAY_HEAD + 135, z) * (inland(x, z) > 0 ? 1 : 0);
/** The dolines [x, z, r] on the plateau, clear of the points. */
const DOLINES = [[-150, 380, 24], [80, 360, 20], [160, 470, 26], [-380, 520, 22], [-60, 520, 18], [150, 680, 22], [-250, 650, 20], [400, 760, 24]];

function heightRaw(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: shingle shelving away fast off the town, the bay's mud shoaling gently to its head
    const s = -d, bay = smoothstep(BAY_X, BAY_X + 50, x);
    return Math.max(0.4 - s * (0.05 - 0.035 * bay) - Math.max(0, s - 60) * (0.06 - 0.04 * bay), -14);
  }
  const ek = edgeK(x, z);
  let h = 0.4 + Math.min(d, 40) * 0.06 + EDGE * ek;
  if (ek > 0.05) h += (ridged(noise, x * 0.011 + 3, z * 0.011, 3) * 5 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.6) * ek;     // the limestone ribs
  const sk = saltK(x, z);
  if (sk > 0) h += (0.6 - h) * sk * (1 - ek);                                                                         // the salt pans' flat
  const sg = Math.hypot(x - SANGIUSTO.x, z - SANGIUSTO.z);
  if (sg < 110) h += 28 * smoothstep(110, 0, sg) ** 1.2 * smoothstep(0, 22, d);                                           // San Giusto’s hill
  h += 16 * Math.exp(-(((x - 200) / 55) ** 2)) * smoothstep(-160, -60, z) * smoothstep(260, 120, z) * smoothstep(0, 30, d); // Servola's hill over the bay
  if (ek > 0.9) for (const [dx, dz, dr] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const q = Math.hypot(x - dx, z - dz); if (q < dr) h -= 5 * smoothstep(dr, 0, q) ** 1.4; }
  return h;
}
const heightC = gridCacheSmooth(heightRaw, BOUNDS, 2);
function height(x: number, z: number) {
  let h = heightC(x, z);
  if (z > BAY_HEAD + 60 && z < BAY_HEAD + 140 && x > 270 && inPan(x, z)) return Math.min(h, -0.35);  // the brine in the pans
  if (z > -40 || z < -280 || x < -140 || x > 125) return h;
  const d = inland(x, z);
  if (d < 0 && d > -90) for (const [mx, len] of MOLES) if (Math.abs(x - mx) < 9 && -d < len) h = Math.max(h, 1.3 * smoothstep(9, 6, Math.abs(x - mx)) + h * smoothstep(6, 9, Math.abs(x - mx)));
  return h;
}

/** Soft going: the shingle of the town's shore, the mud and salt of Zaule. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 22) return foot ? 0.85 : 0.6;
  if (saltK(x, z) > 0.5) return foot ? 0.8 : 0.5;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const poly = (pts: number[][]) => pts.slice(1).map((p, i) => [...pts[i], ...p]);
const ZAULE = { x: 370, z: shoreZ(370) + 32 };
const CATTINARA = { x: 300, z: 610 };
const OPICINA = { x: -280, z: 380 };
/** The roads: the coast road (Barcola – the town – Servola – round the bay to Zaule), the Strada Nuova’s hairpins to Opicina,
 * the climb to the castle and on to Cattinara, Zaule up the spur to Cattinara, the plateau roads, the Sežana road. */
const ROADS: number[][] = [
  ...poly(Array.from({ length: 15 }, (_, i) => -500 + i * 50).map((x) => [x, shoreZ(x) + 22])),
  ...poly([[200, shoreZ(200) + 22], [215, 0], [212, 120], [215, BAY_HEAD + 30], [ZAULE.x, ZAULE.z], [520, ZAULE.z + 10]]),          // Servola and round the bay
  ...poly([[-170, shoreZ(-170) + 22], [-200, 0], [-120, 50], [-210, 110], [-150, 170], [-260, 210], [-260, 300], [OPICINA.x, OPICINA.z]]),           // the Strada Nuova
  ...poly([[10, shoreZ(10) + 22], [20, SANGIUSTO.z - 40], [SANGIUSTO.x, SANGIUSTO.z]]),                                                // up to the castle
  ...poly([[SANGIUSTO.x, SANGIUSTO.z], [130, 90], [100, 200], [170, 300], [150, 420], [230, 500], [CATTINARA.x, CATTINARA.z]]),                        // the Cattinara road
  ...poly([[ZAULE.x, ZAULE.z], [400, 420], [350, 500], [CATTINARA.x, CATTINARA.z]]),                                                                    // up the spur from Zaule
  ...poly([[OPICINA.x, OPICINA.z], [-60, 420], [150, 420]]), ...poly([[OPICINA.x, OPICINA.z], [-150, 750], [-140, 900]]), ...poly([[CATTINARA.x, CATTINARA.z], [60, 720], [-150, 750]]),
];
const roadDist = (x: number, z: number) => { let d = Infinity; for (const [ax, az, bx, bz] of ROADS) d = Math.min(d, seg(x, z, ax, az, bx, bz)); return d; };
const roadC = gridCache(roadDist, BOUNDS, 2);
const inTown = (x: number, z: number) => x > -240 && x < 190 && inland(x, z) > 26 && inland(x, z) < 145;

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -10, name: 'The harbour', inland: { name: 'San Giusto', x: SANGIUSTO.x, z: SANGIUSTO.z } },
  { x: ZAULE.x, name: 'Zaule', inland: { name: 'Cattinara', ...CATTINARA } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The squadron’s anchorage', x: 120, z: -790, owner: 'pact', sector: 'centre', radius: 80 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 40, owner: null, sector: 'west', radius: 50, opens: 'F' },
  { id: 'C', name: SECTORS[1].name, x: ZAULE.x, z: ZAULE.z, owner: null, sector: 'east', radius: 55, opens: 'G' },
  { id: 'F', name: 'San Giusto', x: SANGIUSTO.x, z: SANGIUSTO.z, owner: null, sector: 'west', radius: 30 },
  { id: 'G', name: 'Cattinara', x: CATTINARA.x, z: CATTINARA.z, owner: null, sector: 'east' },
  { id: 'K', name: 'The Sežana road', x: -150, z: 740, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));

/** Scrub oak and hornbeam down the edge, black pine in patches on the plateau (0..1). */
const woods = gridCache((x: number, z: number) => {
  const d = inland(x, z), ek = edgeK(x, z);
  if (d < 30 || inTown(x, z) || saltK(x, z) > 0.2) return 0;
  let k = ek * (1 - ek) * 4 * 0.7 * smoothstep(-0.3, 0.1, fbm(noise, x * 0.01 + 4, z * 0.01 - 9, 2));
  k = Math.max(k, smoothstep(0.48, 0.66, fbm(noise, x * 0.007 - 20, z * 0.007 + 3, 3)) * 0.75 * ek);
  for (const p of points) k = Math.min(k, smoothstep(34, 62, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
}, BOUNDS, 4);

export default {
  id: 'trieste-raid',
  name: 'Trieste Raid',
  description: 'Trieste, a British raid in force (hypothetical; the Royal Navy raided the Illyrian coast 1809–13 and took the castle in 1813): boats into the harbour under San Giusto’s castle and up the Bay of Muggia past Servola to the Zaule salt pans, the Karst edge over all, Cattinara on its spur.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb'] }, // (the frigates’ landing parties and a battalion from Sicily against the Illyrian garrison)
  airfields: [], // (a port under a cliff and pitted karst; 1806 has no aircraft)
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 70, speed: 5, veer: 0.2 }, // (the bora off the Karst: hard and gusty down onto the gulf)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5, // (the edge is just gentle enough for the guns; men climb anywhere)
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1806_1309,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_53, cell: 56, weights: [0.3, 0.1, 0.2, 0.4] }), // (the karst’s little walled fields and stony pasture)

  theme: {
    // a clear bora day: hard blue sky, sharp light, no haze
    fogColor: 0xc4d0dc, fogDensity: 0.0004,
    skyTop: 0x4a80c0, skyHorizon: 0xd0dce8, skyBottom: 0x9aa4a4,
    sunColor: 0xfff4e0, sunIntensity: 2.0, sunDisk: 0.6,
    clouds: 0.15, cloudLight: 0xf6f6f4, cloudDark: 0xc4c8cc,
    sunDir: [-0.4, 0.62, -0.5],
    hemiSky: 0xcadaea, hemiGround: 0x7e7660, hemiIntensity: 1.2,
    rimColor: 0xf0e8d8, rimIntensity: 0.3,
    terrain: {
      grass: '#7e8448', grassAlt: '#747a42', dryGrass: '#a49c66', dirt: '#8a6e50', rock: '#b4ae9e',
      pasture: '#8a8c54', ploughed: '#86644a', stubble: '#b4a474', meadow: '#768444',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (y < 0.3 && inPan(x, z)) return [0xc8ccc4, 1];                              // the brine in the pans
        if (d < 0) return [y > -1.5 ? (x > BAY_X ? 0x8a8068 : 0xb8b0a0) : 0x7e8680, 1]; // the bay's mud, the shingle and rock under the water
        if (saltK(x, z) > 0.4) return [inPan(x, z) ? 0xdcdcd4 : 0x9a9478, 0.9];         // the salt pans and their dykes
        if (d < 22) return [0xc8c0aa, 1];                                             // the shingle, the quays
        if (roadC(x, z) < 3.2) return [0xb8ac90, 0.85];                               // the roads, white with karst dust
        if (inTown(x, z)) return [0xa09684, 0.7];                                     // the town’s paving
        const ek = edgeK(x, z);
        if (ek > 0.15 && ek < 0.85) return [0xa8a292, 0.5 * smoothstep(0.1, 0.4, fbm(noise, x * 0.03, z * 0.03, 2) + 0.2)]; // the limestone showing down the edge
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-200, 50, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } },
  maxStacks: 24,
  cameraStart: { nato: { x: 100, z: 450 }, pact: { x: 100, z: -250 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.3, // (the bora’s chop in the gulf)
    signal: { t: 25, say: 'The signal from HMS Eagle — the boats pull for the moles and up the bay', sayOther: 'Boats in the gulf: the English are coming for the port and up the Bay of Muggia' },
    navy: ['frigate', 'destroyer'],
    // the Molo battery and the Lanterna’s guns, Servola’s battery over the bay, field guns on San Giusto
    forts: [
      { unit: 'shoreBattery', x: 110, z: shoreZ(110) + 16, facing: Math.PI },
      { unit: 'shoreBattery', x: -125, z: shoreZ(-125) + 16, facing: Math.PI },
      { unit: 'shoreBattery', x: 205, z: 60, facing: Math.PI / 2 + 0.6 },
      { unit: 'artillery', x: SANGIUSTO.x - 22, z: SANGIUSTO.z - 14, facing: Math.PI },
    ],
    works: [
      ...[-50, 0, 50].map((dx) => ({ kind: 'trench', x: SECTORS[0].x + dx, z: shoreZ(SECTORS[0].x + dx) + 56, yaw: 0 })),
      ...[-70, -25, 25, 70].map((dx) => ({ kind: 'trench', x: ZAULE.x + dx, z: ZAULE.z + 26, yaw: 0 })),
      ...[-44, -30, 30, 44].map((dx) => ({ kind: 'wire', x: SECTORS[0].x + dx, z: shoreZ(SECTORS[0].x + dx) + 30, yaw: 0 })),
      ...[-80, -60, -40, 40, 60, 80].map((dx) => ({ kind: 'wire', x: ZAULE.x + dx, z: ZAULE.z - 10, yaw: 0 })),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Chasseurs d’Illyrie' },
    // the Illyrian garrison comes down the Strada Nuova and the Cattinara road
    counter: { t: 170, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'The garrison is coming down from the plateau — to the town and the salt pans!', sayOther: 'French columns coming down off the Karst!' },
    hold: [
      { x: SECTORS[0].x - 30, z: shoreZ(SECTORS[0].x) + 56 }, { x: SECTORS[0].x + 30, z: shoreZ(SECTORS[0].x) + 56 }, { x: ZAULE.x - 40, z: ZAULE.z + 30 }, { x: ZAULE.x + 40, z: ZAULE.z + 30 },
      { x: 215, z: 60 }, { x: SANGIUSTO.x, z: SANGIUSTO.z }, { x: CATTINARA.x, z: CATTINARA.z }, { x: CATTINARA.x + 40, z: CATTINARA.z - 80 },
    ],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 700, beachIncome: 0.8, defenceCp: 850, defenceIncome: 1.05 },
    waves: [
      { t: 0, units: [
        { unit: 'marines', sector: 0 }, { unit: 'sailors', sector: 0 }, { unit: 'marines', sector: 0 }, { unit: 'mgTeam', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'mgTeam', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'atTeam', sector: 1 }, { unit: 'rifles', sector: 1 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 1 }, { unit: 'rifles', sector: 0 }, { unit: 'rifles', sector: 1 }] },
      { t: 300, say: 'The battalion from Sicily is coming ashore', units: [{ unit: 'rifles', sector: 1 }, { unit: 'guard', sector: 0 }, { unit: 'artillery', sector: 1 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1806_1310);
    sea.build(scene, terrain);
    const taken: number[][] = [];
    const nearPoint = (x: number, z: number, rr: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < rr);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const free = (x: number, z: number, rr: number) => roadC(x, z) > 5 + rr && inland(x, z) > 24 + rr && steepAt(x, z) < 0.3 && saltK(x, z) < 0.2 && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < rr + 8);
    const STONE = 0xd2c8b2;
    const block = (x: number, z: number, len: number, thick: number, hgt: number, yaw: number) => {
      const g = Math.min(terrain.heightAt(x, z), terrain.heightAt(x + Math.cos(yaw) * len * 0.45, z - Math.sin(yaw) * len * 0.45), terrain.heightAt(x - Math.cos(yaw) * len * 0.45, z + Math.sin(yaw) * len * 0.45));
      props.box('stone', x, g + hgt / 2 - 1, z, len, hgt + 2, thick, yaw, STONE);
      props.cover.addBox({ x, z, yaw, length: len, thickness: thick, height: hgt });
    };

    // ---- San Giusto: the castle’s curtain round the hilltop (the gate on the town side), the cathedral beside it
    const { x: cx, z: cz } = SANGIUSTO;
    block(cx, cz + 26, 56, 3, 6, 0);
    block(cx - 28, cz, 52, 3, 6, Math.PI / 2);
    block(cx + 28, cz, 52, 3, 6, Math.PI / 2);
    block(cx - 18, cz - 26, 20, 3, 6, 0); block(cx + 18, cz - 26, 20, 3, 6, 0);                     // (the gate between)
    for (const [dx, dz] of [[-28, 26], [28, 26], [28, -26]]) { const g = terrain.heightAt(cx + dx, cz + dz); props.box('stone', cx + dx, g + 4.5, cz + dz, 9, 11, 9, 0.2, STONE); props.cover.addBox({ x: cx + dx, z: cz + dz, yaw: 0.2, length: 9, thickness: 9, height: 9 }); }
    taken.push([cx, cz]);
    props.rand = mulberry32(1806_1311);
    props.church({ x: cx - 52, z: cz - 6, yaw: Math.PI / 2 }); taken.push([cx - 52, cz - 6]);

    // ---- the moles: stone on top, a lantern on the west one; the quays along the harbour
    for (const [mx, len] of MOLES) props.box('stone', mx, 0.6, shoreZ(mx) - len / 2, 12, 1.8, len, 0, 0xb4ac9c);
    { const lx = MOLES[0][0], lz = shoreZ(lx) - MOLES[0][1] + 4; props.box('stone', lx, 6, lz, 4, 12, 4, 0, 0xe0d8c8); props.box('plain', lx, 12.6, lz, 2.4, 1.6, 2.4, 0, 0x3a3a38); }
    for (const [x, len] of [[-60, 60], [55, 60]]) props.box('stone', x, 0.5, shoreZ(x) + 2, len, 1.4, 4, 0, 0xb4ac9c);
    // trabaccoli and a brig at the moles, fishing boats drawn up at Zaule
    for (const [x, dz, l] of [[-90, -30, 16], [-150, -50, 14], [80, -25, 13], [150, -40, 18]]) props.box('plain', x, 0.5, shoreZ(x) + dz, 4, 1.6, l, 0, 0x5a4432);
    for (let i = 0; i < 4; i++) { const x = 300 + i * 10, z = shoreZ(x) + 8; props.box('plain', x, terrain.heightAt(x, z) + 0.4, z, 1.6, 0.6, 5, 0.2, 0x5a4434); }

    // ---- the town: the Borgo Teresiano’s blocks west of the hill, the old town round its foot, the warehouses on the quays
    const rr = mulberry32(1806_1312);
    for (let i = 0, n = 0; i < 3000 && n < 70; i++) {
      const x = -240 + rr() * 430, z = shoreZ(x) + 28 + rr() * 115;
      if (!inTown(x, z) || roadC(x, z) < 10 || steepAt(x, z) > 0.3 || Math.hypot(x - cx, z - cz) < 44 || nearPoint(x, z, 30) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      const grid = x < cx - 40;
      props.townHouse({ x, z, yaw: grid ? 0 : Math.round(rr() * 3) * (Math.PI / 2) + (rr() - 0.5) * 0.2, width: 8 + rr() * 3, depth: 8 + rr() * 2, storeys: grid ? 3 : 2 + Math.floor(rr() * 2), damaged: 0 });
    }
    props.rand = mulberry32(1806_1313);
    props.church({ x: -120, z: shoreZ(-120) + 95, yaw: 0 }); taken.push([-120, shoreZ(-120) + 95]); // (Sant’Antonio at the head of the canal)
    // the salt works' sheds by the pans
    for (const [x, z] of [[290, BAY_HEAD + 150], [430, BAY_HEAD + 150]]) { props.rand = mulberry32(x * 13); props.townHouse({ x, z, yaw: 0, width: 16, depth: 7, storeys: 1, name: 'salt store', damaged: 0.05 }); taken.push([x, z]); }

    // ---- Barcola, Servola, Opicina, Cattinara; the plateau’s dry-stone walls; the command post on the Sežana road
    for (const [p, seed] of [[OPICINA, 18071], [P.G, 18072], [P.K, 18073], [{ x: -420, z: shoreZ(-420) + 60 }, 18074]] as const) buildVillage(props, p, seed);
    props.church({ x: OPICINA.x + 30, z: OPICINA.z + 24, yaw: 0 }); taken.push([OPICINA.x + 30, OPICINA.z + 24]);
    for (let i = 0, n = 0; i < 300 && n < 10; i++) { // Servola's houses on its hill over the bay
      const x = 170 + r() * 50, z = -60 + r() * 200;
      if (!free(x, z, 6) || nearPoint(x, z, 40)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.house({ x, z, yaw: Math.PI / 2 * Math.round(r()), width: 7 + r() * 3, depth: 6, height: 3.2 });
    }
    for (let i = 0, n = 0; i < 3000 && n < 60; i++) {
      const x = (r() * 2 - 1) * 480, z = 150 + r() * 700, yaw = Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.3;
      if (edgeK(x, z) < 0.95 || !free(x, z, 6) || nearPoint(x, z, 30) || Math.hypot(x, z - 830) < 60) continue;
      n++;
      props.wall({ x, z, yaw, length: 14 + r() * 16, height: 1.1, thickness: 0.8 });
    }
    for (let i = 0; i < 300; i++) {
      const x = (r() * 2 - 1) * 490, z = -60 + r() * 900, ek = edgeK(x, z);
      if (ek < 0.1 || ek > 0.9 || nearPoint(x, z, 30) || roadC(x, z) < 8 || inTown(x, z) || saltK(x, z) > 0.1) continue;
      props.boulder({ x, z, radius: 1 + r() * 1.6 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 10 })),
      { test: (x: number, z: number) => roadC(x, z) < 5 || inland(x, z) < 26 || inTown(x, z) || Math.hypot(x - cx, z - cz) < 36 || saltK(x, z) > 0.1 }];
    // holm and scrub oak, hornbeam and black pine; cypresses in the town gardens
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: bounds.x + 80, count: 2800, broadleaf: 0.55, autumn: 0, maxY: 140,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2, fields: this.fields, avoid });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
