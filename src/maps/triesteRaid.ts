// A British raid on Trieste (coastal, the 1806 epoch, hypothetical: the British land, the French hold; 1.0 × 1.8 km).
// From 1809 to 1813 the Royal Navy’s Adriatic frigates raided the Illyrian coast at will — boats cut out convoys
// under the batteries, landing parties spiked the guns and burnt the stores, and in 1813 Rowley’s squadron took
// Trieste’s castle with the Austrians. Here the raid comes in force. On the map the Gulf of Trieste is the -z side
// (the British come from the sea); the town on its narrow shore strip in the bay — the harbour between the Molo San
// Carlo and the Lanterna mole, the Borgo Teresiano’s grid, the old town round the hill of San Giusto with the
// castle and the cathedral on top; Barcola’s fishing beach to the west, Servola’s to the east. Behind the town the
// Karst edge rises steeply onto the limestone plateau (as trieste1805.ts: dolines, dry-stone walls, scrub oak and
// black pine), with Opicina at the head of the Strada Nuova and Cattinara above Servola. The French come down from
// the Sežana road (+z).
// Both shores work: flipped (campaign flipLanding) the French land and the British hold the port.
import { createNoise2D, fbm, ridged } from '../world/Noise.js';
import { PropBuilder } from '../world/Props.js';
import { createFields } from '../world/Fields.js';
import { plantTrees, growGround } from '../world/Vegetation.js';
import { mulberry32, smoothstep } from '../core/math.js';
import { createSea } from '../world/Sea.js';
import { commandPost, buildVillage } from './common.js';
import type { MapDef, ControlPointDef } from '../types.ts';

const SIZE = 2000;
const BOUNDS = { x: 500, z: 900 };
const noise = createNoise2D(1806_52);
const sea = createSea({ level: 0, size: SIZE, color: 0x2e6878 }); // (the gulf: clear blue-green over the rock)

/** The waterline (world z; the gulf toward -z): the bay of Trieste curving in at the town. */
export const shoreZ = (x: number) => -170 + 55 * Math.exp(-((x / 230) ** 2)) + fbm(noise, x * 0.005, 2.1, 2) * 8;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);
const EDGE = 62; // the Karst edge’s height over the strip
/** 0..1 up the edge: the shore strip (0) to the plateau (1). */
const edgeK = (x: number, z: number) => smoothstep(115, 310, inland(x, z) + 25 * Math.sin(x * 0.009));

/** The moles: [x, length]: the Lanterna mole (west) and the Molo San Carlo (east), out into the harbour. */
const MOLES = [[-125, 85], [125, 70]];
const SANGIUSTO = { x: 60, z: shoreZ(60) + 120 };
/** The dolines [x, z, r] on the plateau, clear of the points. */
const DOLINES = [[-150, 380, 24], [80, 330, 20], [200, 470, 26], [-380, 520, 22], [420, 420, 20], [-60, 520, 18], [150, 620, 22], [-250, 650, 20]];

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: shingle shelving away fast, the moles out on their piles of stone
    const s = -d;
    let h = Math.max(0.4 - s * 0.05 - Math.max(0, s - 60) * 0.06, -14);
    for (const [mx, len] of MOLES) if (Math.abs(x - mx) < 9 && s < len) h = Math.max(h, 1.3 * smoothstep(9, 6, Math.abs(x - mx)) + h * smoothstep(6, 9, Math.abs(x - mx)));
    return h;
  }
  const ek = edgeK(x, z);
  let h = 0.4 + Math.min(d, 40) * 0.06 + EDGE * ek;
  if (ek > 0.05) h += (ridged(noise, x * 0.011 + 3, z * 0.011, 3) * 5 + fbm(noise, x * 0.05, z * 0.05, 2) * 0.6) * ek;     // the limestone ribs
  const sg = Math.hypot(x - SANGIUSTO.x, z - SANGIUSTO.z);
  if (sg < 110) h += 28 * smoothstep(110, 0, sg) ** 1.2 * smoothstep(0, 22, d);                                           // San Giusto’s hill
  if (ek > 0.9) for (const [dx, dz, dr] of DOLINES) { if (Math.abs(x - dx) > dr || Math.abs(z - dz) > dr) continue; const q = Math.hypot(x - dx, z - dz); if (q < dr) h -= 5 * smoothstep(dr, 0, q) ** 1.4; }
  return h;
}

/** Soft going: the shingle of the beaches. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 22) return foot ? 0.85 : 0.6;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const poly = (pts: number[][]) => pts.slice(1).map((p, i) => [...pts[i], ...p]);
/** The roads: the coast road, the Strada Nuova’s hairpins to Opicina, Barcola’s and Servola’s climbs, the plateau roads, the Sežana road. */
const ROADS: number[][] = [
  ...poly(Array.from({ length: 21 }, (_, i) => -500 + i * 50).map((x) => [x, shoreZ(x) + 22])),
  ...poly([[-170, shoreZ(-170) + 22], [-200, 0], [-120, 50], [-210, 110], [-150, 170], [-260, 210], [-280, 330]]),     // the Strada Nuova
  ...poly([[-340, shoreZ(-340) + 22], [-360, 40], [-300, 120], [-380, 200], [-280, 330]]),                             // Barcola’s climb
  ...poly([[330, shoreZ(330) + 22], [360, 40], [280, 110], [360, 180], [300, 300]]),                                     // Servola’s
  ...poly([[10, shoreZ(10) + 22], [30, SANGIUSTO.z - 40], [SANGIUSTO.x, SANGIUSTO.z]]),                                // up to the castle
  ...poly([[SANGIUSTO.x, SANGIUSTO.z], [140, 90], [100, 180], [170, 240], [300, 300]]),                                // the Cattinara road
  ...poly([[-280, 330], [-20, 300], [300, 300]]), ...poly([[-280, 330], [-60, 600], [0, 830]]), ...poly([[300, 300], [60, 600], [0, 830]]),
];
const roadDist = (x: number, z: number) => { let d = Infinity; for (const [ax, az, bx, bz] of ROADS) d = Math.min(d, seg(x, z, ax, az, bx, bz)); return d; };
const inTown = (x: number, z: number) => Math.abs(x) < 230 && inland(x, z) > 26 && inland(x, z) < 140;

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -340, name: 'Barcola', inland: { name: 'Opicina', x: -280, z: 330 } },
  { x: 0, name: 'The harbour', inland: { name: 'San Giusto', x: SANGIUSTO.x, z: SANGIUSTO.z } },
  { x: 330, name: 'Servola', inland: { name: 'Cattinara', x: 300, z: 300 } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The squadron’s anchorage', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 40, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 40, owner: null, sector: 'centre', radius: 50, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 40, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Opicina', x: -280, z: 330, owner: null, sector: 'west' },
  { id: 'F', name: 'San Giusto', x: SANGIUSTO.x, z: SANGIUSTO.z, owner: null, sector: 'centre', radius: 30 },
  { id: 'G', name: 'Cattinara', x: 300, z: 300, owner: null, sector: 'east' },
  { id: 'K', name: 'The Sežana road', x: 0, z: 700, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));

/** Scrub oak and hornbeam down the edge, black pine in patches on the plateau (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z), ek = edgeK(x, z);
  if (d < 30 || inTown(x, z)) return 0;
  let k = ek * (1 - ek) * 4 * 0.7 * smoothstep(-0.3, 0.1, fbm(noise, x * 0.01 + 4, z * 0.01 - 9, 2));
  k = Math.max(k, smoothstep(0.48, 0.66, fbm(noise, x * 0.007 - 20, z * 0.007 + 3, 3)) * 0.75 * ek);
  for (const p of points) k = Math.min(k, smoothstep(34, 62, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'trieste-raid',
  name: 'Trieste Raid',
  description: 'Trieste, a British raid in force (hypothetical; the Royal Navy raided the Illyrian coast 1809–13 and took the castle in 1813): boats at Barcola, the harbour and Servola, the town under San Giusto’s castle, the Karst edge to Opicina and Cattinara.',
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
        if (d < 0) return [y > -1.5 ? 0xb8b0a0 : 0x7e8680, 1];                       // the shingle and rock under the water
        if (d < 22) return [0xc8c0aa, 1];                                             // the shingle beaches, the quays
        if (roadDist(x, z) < 3.2) return [0xb8ac90, 0.85];                            // the roads, white with karst dust
        if (inTown(x, z)) return [0xa09684, 0.7];                                     // the town’s paving
        const ek = edgeK(x, z);
        if (ek > 0.15 && ek < 0.85) return [0xa8a292, 0.5 * smoothstep(0.1, 0.4, fbm(noise, x * 0.03, z * 0.03, 2) + 0.2)]; // the limestone showing down the edge
        return null;
      },
    },
  },

  bases: { nato: { x: 0, z: 830, entries: [-300, 0, 300] }, pact: { x: 0, z: -830, entries: SECTORS.map((s) => s.x) } },
  maxStacks: 26,
  cameraStart: { nato: { x: 0, z: 300 }, pact: { x: 0, z: -140 } },
  points,
  spawns: { nato: [], pact: [] },

  landing: {
    attacker: 'pact',
    craft: { infantry: 'flatboat', vehicle: 'horseBoat' },
    launchZ: 700,
    surf: 0.3, // (the bora’s chop in the gulf)
    signal: { t: 25, say: 'The signal from HMS Eagle — the boats pull for the moles and the beaches', sayOther: 'Boats in the gulf: the English are coming for the port' },
    navy: ['frigate', 'destroyer'],
    // the Molo battery and the Lanterna’s guns, the Barcola battery, field guns on San Giusto
    forts: [
      { unit: 'shoreBattery', x: 125, z: shoreZ(125) + 16, facing: Math.PI },
      { unit: 'shoreBattery', x: -420, z: shoreZ(-420) + 38, facing: Math.PI },
      { unit: 'artillery', x: SANGIUSTO.x - 22, z: SANGIUSTO.z - 14, facing: Math.PI },
    ],
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 58, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 30, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Chasseurs d’Illyrie' },
    // the Illyrian garrison comes down the Strada Nuova and the Cattinara road
    counter: { t: 170, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'The garrison is coming down from Opicina — to the town and the moles!', sayOther: 'French columns on the hairpins above the town!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 58 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 1000, defenceIncome: 1.5 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'marines', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'marines', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'The battalion from Sicily is coming ashore', units: [{ unit: 'rifles', sector: 2 }, { unit: 'guard', sector: 1 }, { unit: 'artillery', sector: 2 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1806_1310);
    sea.build(scene, terrain);
    const taken: number[][] = [];
    const nearPoint = (x: number, z: number, rr: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < rr);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 5 + rr && inland(x, z) > 24 + rr && steepAt(x, z) < 0.3 && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < rr + 8);
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
    for (const [x, len] of [[-60, 60], [60, 60]]) props.box('stone', x, 0.5, shoreZ(x) + 2, len, 1.4, 4, 0, 0xb4ac9c);
    // trabaccoli and a brig at the moles
    for (const [x, dz, l] of [[-100, -30, 16], [-150, -50, 14], [105, -25, 13], [150, -40, 18]]) props.box('plain', x, 0.5, shoreZ(x) + dz, 4, 1.6, l, 0, 0x5a4432);

    // ---- the town: the Borgo Teresiano’s blocks west of the hill, the old town round its foot, the warehouses on the quays
    const rr = mulberry32(1806_1312);
    for (let i = 0, n = 0; i < 3000 && n < 70; i++) {
      const x = (rr() * 2 - 1) * 220, z = shoreZ(x) + 28 + rr() * 110;
      if (!inTown(x, z) || roadDist(x, z) < 10 || steepAt(x, z) > 0.3 || Math.hypot(x - cx, z - cz) < 44 || nearPoint(x, z, 30) || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      const grid = x < cx - 40;
      props.townHouse({ x, z, yaw: grid ? 0 : Math.round(rr() * 3) * (Math.PI / 2) + (rr() - 0.5) * 0.2, width: 8 + rr() * 3, depth: 8 + rr() * 2, storeys: grid ? 3 : 2 + Math.floor(rr() * 2), damaged: 0 });
    }
    props.rand = mulberry32(1806_1313);
    props.church({ x: -110, z: shoreZ(-110) + 90, yaw: 0 }); taken.push([-110, shoreZ(-110) + 90]); // (Sant’Antonio at the head of the canal)

    // ---- Barcola, Servola, Opicina, Cattinara; the plateau’s dry-stone walls; the command post on the Sežana road
    for (const [p, seed] of [[P.E, 18071], [P.G, 18072], [P.K, 18073]] as const) buildVillage(props, p, seed);
    props.church({ x: P.E.x + 30, z: P.E.z + 24, yaw: 0 }); taken.push([P.E.x + 30, P.E.z + 24]);
    for (const [sx, n0] of [[-340, 10], [330, 10]] as const) {
      for (let i = 0, n = 0; i < 300 && n < n0; i++) {
        const x = sx + (r() * 2 - 1) * 110, z = shoreZ(x) + 70 + r() * 60;
        if (!free(x, z, 6) || nearPoint(x, z, 40)) continue;
        taken.push([x, z]); n++;
        props.rand = mulberry32(Math.floor(r() * 1e9));
        props.house({ x, z, yaw: Math.PI / 2 * Math.round(r()), width: 7 + r() * 3, depth: 6, height: 3.2 });
      }
    }
    for (let i = 0, n = 0; i < 3000 && n < 60; i++) {
      const x = (r() * 2 - 1) * 480, z = 150 + r() * 700, yaw = Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.3;
      if (edgeK(x, z) < 0.95 || !free(x, z, 6) || nearPoint(x, z, 30) || Math.hypot(x, z - 830) < 60) continue;
      n++;
      props.wall({ x, z, yaw, length: 14 + r() * 16, height: 1.1, thickness: 0.8 });
    }
    for (let i = 0; i < 300; i++) {
      const x = (r() * 2 - 1) * 490, z = -60 + r() * 900, ek = edgeK(x, z);
      if (ek < 0.1 || ek > 0.9 || nearPoint(x, z, 30) || roadDist(x, z) < 8 || inTown(x, z)) continue;
      props.boulder({ x, z, radius: 1 + r() * 1.6 });
    }
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 10 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || inland(x, z) < 26 || inTown(x, z) || Math.hypot(x - cx, z - cz) < 36 }];
    // holm and scrub oak, hornbeam and black pine; cypresses in the town gardens
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2800, broadleaf: 0.55, autumn: 0, maxY: 140,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.2, fields: this.fields, avoid });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
