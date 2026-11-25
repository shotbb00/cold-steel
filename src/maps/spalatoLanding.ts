// Spalato (Split) from the sea (coastal, the 1806 epoch, hypothetical: the British and Russians land, the French
// hold; 1.0 × 1.8 km). Dalmatia went to France at Pressburg; Seniavin’s Russians held the Bocche and the islands,
// and from 1807 to 1813 British frigates out of Lissa raided the Dalmatian coast. Here the Allies land at Spalato.
// On the map the channel between the islands is the -z side; the coast, compressed: to the west the low Kaštela
// shore with its tower-castles, then the Marjan hill on its peninsula, pine-clad, its cliffs in the sea; in the
// middle the Riva and Diocletian’s palace, the town packed inside its Roman walls round the Peristyle, the medieval
// town spreading west of it; to the east the beach at Bačvice. Inland the Salona ruins at Solin, the slopes of
// Kozjak and Mosor rising behind, and Klis fortress on its spur over the pass. The French come down the Sinj road
// through the Klis pass (+z).
// Both shores work: flipped (campaign flipLanding) the French land and the Allies hold the town and the fortress.
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
const noise = createNoise2D(1806_61);
const sea = createSea({ level: 0, size: SIZE, color: 0x1f6a86 }); // (the Adriatic among the islands: deep clear blue)

const MARJAN = { x: -210, r: 125 };
/** The waterline (world z; the sea toward -z): the Marjan peninsula pushing out to sea between Kaštela and the Riva. */
export const shoreZ = (x: number) => -170 - 70 * Math.exp(-(((x - MARJAN.x) / MARJAN.r) ** 2)) + fbm(noise, x * 0.005, 2.1, 2) * 9;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);
const hill = (x: number, z: number, cx: number, cz: number, r: number, amp: number) => amp * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

const PALACE = { x: 30, z: shoreZ(30) + 85, hx: 58, hz: 46 };
const KLIS = { x: 330, z: 420 };

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: a shingle bar, deep close in under Marjan
    const s = -d, steep = 1 + 1.5 * Math.exp(-(((x - MARJAN.x) / 110) ** 2));
    return Math.max(0.4 - s * 0.03 * steep - Math.max(0, s - 90) * 0.05, -18);
  }
  const marjan = hill(x, z, MARJAN.x, shoreZ(MARJAN.x) + 95, 120, 46) * smoothstep(0, 18, d);                        // Marjan, its cliffs into the sea
  let h = 0.4 + Math.min(d, 60) * 0.05 + smoothstep(60, 400, d) * 6
    + smoothstep(420, 860, d) * 44 * (1 + fbm(noise, x * 0.004 + 7, z * 0.004, 2) * 0.35)                              // Kozjak and Mosor rising behind
    + ridged(noise, x * 0.01, z * 0.01 + 5, 2) * 3 * smoothstep(300, 600, d)                                          // the karst ribs
    + hill(x, z, KLIS.x, KLIS.z, 95, 26) + marjan;
  if (Math.abs(x - PALACE.x) < PALACE.hx + 30 && Math.abs(z - PALACE.z) < PALACE.hz + 30) h += (2.6 - h) * smoothstep(30, 0, Math.max(Math.abs(x - PALACE.x) - PALACE.hx, Math.abs(z - PALACE.z) - PALACE.hz, 0)); // (the palace’s level court)
  return h;
}

/** Soft going: the shingle beaches. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 24) return foot ? 0.85 : 0.6;
  return 1;
}

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const poly = (pts: number[][]) => pts.slice(1).map((p, i) => [...pts[i], ...p]);
/** The roads: the coast road (round Marjan’s neck), the palace’s cardo out to Solin and to Klis, the Sinj road over the pass. */
const ROADS: number[][] = [
  ...poly([[-500, shoreZ(-500) + 24], [-380, shoreZ(-380) + 24], [-300, 20], [-150, 30], [-60, shoreZ(-60) + 30], [PALACE.x, PALACE.z - PALACE.hz - 10], [200, shoreZ(200) + 26], [340, shoreZ(340) + 26], [500, shoreZ(500) + 26]]),
  ...poly([[PALACE.x, PALACE.z - PALACE.hz - 10], [PALACE.x, PALACE.z + PALACE.hz + 10], [-60, 150], [-330, 300]]),
  ...poly([[-380, shoreZ(-380) + 24], [-400, 150], [-330, 300]]),
  ...poly([[PALACE.x, PALACE.z + PALACE.hz + 10], [180, 200], [KLIS.x - 40, KLIS.z - 120], [KLIS.x, KLIS.z]]),
  ...poly([[340, shoreZ(340) + 26], [400, 150], [KLIS.x - 40, KLIS.z - 120]]),
  ...poly([[KLIS.x, KLIS.z], [200, 560], [0, 830]]), ...poly([[-330, 300], [-200, 560], [0, 700], [0, 830]]),
];
const roadDist = (x: number, z: number) => { let d = Infinity; for (const [ax, az, bx, bz] of ROADS) d = Math.min(d, seg(x, z, ax, az, bx, bz)); return d; };
const inPalace = (x: number, z: number, m = 0) => Math.abs(x - PALACE.x) < PALACE.hx + m && Math.abs(z - PALACE.z) < PALACE.hz + m;

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -380, name: 'Kaštela shore', inland: { name: 'Solin', x: -330, z: 300 } },
  { x: 30, name: 'The Riva', inland: { name: 'Diocletian’s palace', x: PALACE.x, z: PALACE.z } },
  { x: 340, name: 'Bačvice', inland: { name: 'Klis', x: KLIS.x, z: KLIS.z } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The squadron’s anchorage', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 40, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 22, owner: null, sector: 'centre', radius: 40, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 40, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Solin', x: -330, z: 300, owner: null, sector: 'west' },
  { id: 'F', name: 'Diocletian’s palace', x: PALACE.x, z: PALACE.z, owner: null, sector: 'centre', radius: 34 },
  { id: 'G', name: 'Klis', x: KLIS.x, z: KLIS.z, owner: null, sector: 'east', radius: 30 },
  { id: 'K', name: 'The Sinj road', x: 0, z: 700, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const KASTEL = { x: -450, z: shoreZ(-450) + 34 }; // a Kaštel: a fortified tower-house on the shore

/** Aleppo pine on Marjan, olives and vines on the lower slopes, holm oak and scrub up the mountain (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 30 || inPalace(x, z, 30)) return 0;
  const onMarjan = Math.hypot(x - MARJAN.x, z - (shoreZ(MARJAN.x) + 95)) < 140 ? 0.85 : 0;
  let k = Math.max(onMarjan * smoothstep(0.2, 0.4, fbm(noise, x * 0.02, z * 0.02, 2) + 0.4), smoothstep(0.42, 0.62, fbm(noise, x * 0.007 + 11, z * 0.007 - 3, 3)) * (0.35 + 0.45 * smoothstep(300, 600, d)));
  if (x > -120 && x < 220 && d < 200) k *= 0.2; // (the town and its gardens)
  for (const p of points) k = Math.min(k, smoothstep(34, 62, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'spalato-landing',
  name: 'Spalato 1806',
  description: 'Spalato (Split), Dalmatia (hypothetical; the British raided this coast from Lissa 1807–13): the Allies land on the Kaštela shore, the Riva under Diocletian’s palace and at Bačvice, and push for Solin and Klis fortress over the pass.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb', 'ru'] }, // (Lissa’s frigates and a British battalion with Seniavin’s Russians from the Bocche)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 150, speed: 4, veer: 0.2 }, // (the jugo: a warm south-easter off the sea)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1806_1061,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_62, cell: 50, weights: [0.25, 0.15, 0.3, 0.3] }), // (vines, olives and stony pasture behind dry-stone walls)

  theme: {
    fogColor: 0xd0d6d8, fogDensity: 0.0004,
    skyTop: 0x4a84c4, skyHorizon: 0xd6dee6, skyBottom: 0xa0a49a,
    sunColor: 0xfff2da, sunIntensity: 2.1, sunDisk: 0.6,
    clouds: 0.15, cloudLight: 0xf6f6f2, cloudDark: 0xc4c6c4,
    sunDir: [-0.3, 0.68, -0.55],
    hemiSky: 0xcedce8, hemiGround: 0x847a5c, hemiIntensity: 1.2,
    rimColor: 0xf0e8d6, rimIntensity: 0.3,
    terrain: {
      grass: '#848a4c', grassAlt: '#7a8046', dryGrass: '#ae9e68', dirt: '#8c6e4e', rock: '#bcb6a6',
      pasture: '#8e8e56', ploughed: '#8a684a', stubble: '#bca876', meadow: '#7a8648',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) return [y > -1.5 ? 0xc0b8a6 : 0x7a8484, 1];                       // the shingle and rock under the water
        if (d < 22) return [0xd0c8b2, 1];                                             // the shingle beaches, the Riva
        if (roadDist(x, z) < 3.2) return [0xc0b49a, 0.85];                            // the white roads
        if (inPalace(x, z, 4)) return [0xb4aa98, 0.9];                                // the palace’s paving
        if (d > 380) return [0xb0a898, 0.45 * smoothstep(0, 0.4, fbm(noise, x * 0.03, z * 0.03, 2) + 0.2)]; // the karst showing on the slopes
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
    surf: 0.2,
    signal: { t: 25, say: 'The signal from HMS Amphion — every boat pulls for the shore', sayOther: 'Boats in the channel: the English and the Russians are coming ashore' },
    navy: ['frigate', 'destroyer'],
    // the battery on Marjan’s point, the one at Bačvice, the field guns on the Riva
    forts: [
      { unit: 'shoreBattery', x: MARJAN.x + 40, z: shoreZ(MARJAN.x + 40) + 30, facing: Math.PI },
      { unit: 'shoreBattery', x: 440, z: shoreZ(440) + 36, facing: Math.PI },
      { unit: 'artillery', x: PALACE.x - 70, z: shoreZ(PALACE.x - 70) + 40, facing: Math.PI },
    ],
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + (s.x === 30 ? 32 : 58), yaw: 0 }))).filter((w) => !inPalace(w.x, w.z, 6)),
      ...SECTORS.flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 18, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Chasseurs dalmates' },
    // Marmont’s men come down through the Klis pass
    counter: { t: 170, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'Marmont’s column is through the Klis pass — down to Solin and the palace!', sayOther: 'French columns coming down from Klis!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 40 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 800, defenceIncome: 1.0 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'marines', sector: 1 }, { unit: 'rifles', sector: 1 }, { unit: 'guard', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'The second division of boats is coming in', units: [{ unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 0 }, { unit: 'artillery', sector: 2 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1806_1062);
    sea.build(scene, terrain);
    const taken: number[][] = [];
    const nearPoint = (x: number, z: number, rr: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < rr);
    const steepAt = (x: number, z: number) => Math.hypot(terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z), terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2)) / 4;
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 5 + rr && inland(x, z) > 24 + rr && steepAt(x, z) < 0.3 && !inPalace(x, z, rr + 6) && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < rr + 8);
    const STONE = 0xd8cfba;
    const block = (x: number, z: number, len: number, thick: number, hgt: number, yaw: number) => {
      const g = Math.min(terrain.heightAt(x, z), terrain.heightAt(x + Math.cos(yaw) * len * 0.45, z - Math.sin(yaw) * len * 0.45), terrain.heightAt(x - Math.cos(yaw) * len * 0.45, z + Math.sin(yaw) * len * 0.45));
      props.box('stone', x, g + hgt / 2 - 1, z, len, hgt + 2, thick, yaw, STONE);
      props.cover.addBox({ x, z, yaw, length: len, thickness: thick, height: hgt });
    };
    const tower = (x: number, z: number, s: number, hgt: number) => { const g = terrain.heightAt(x, z); props.box('stone', x, g + hgt / 2 - 1, z, s, hgt + 2, s, 0, STONE); props.cover.addBox({ x, z, yaw: 0, length: s, thickness: s, height: hgt }); };

    // ---- Diocletian’s palace: the four walls with their gates (Brass, Golden, Silver, Iron) in the middle of each, corner towers
    const { x: px, z: pz, hx, hz } = PALACE, GATE = 12;
    for (const s of [-1, 1]) {
      for (const k of [-1, 1]) block(px + k * (hx + GATE / 2) / 2, pz + s * hz, hx - GATE / 2, 3, 9, 0);              // the south (sea) and north walls
      for (const k of [-1, 1]) block(px + s * hx, pz + k * (hz + GATE / 2) / 2, hz - GATE / 2, 3, 9, Math.PI / 2);     // the east and west walls
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower(px + sx * hx, pz + sz * hz, 9, 13);
    // inside: the Peristyle open round the point, the cathedral (the emperor’s mausoleum) to the east, the town in the quarters
    props.rand = mulberry32(1806_1063);
    for (let i = -2; i <= 2; i++) props.column({ x: px + i * 5, z: pz + 12, radius: 0.5, height: 5 });
    { const g = terrain.heightAt(px + 30, pz + 6); props.box('stone', px + 30, g + 6, pz + 6, 14, 12, 14, 0, STONE); props.box('stone', px + 30, g + 16, pz + 6, 5, 10, 5, 0, STONE); taken.push([px + 30, pz + 6]); } // (the octagon and its campanile, squared)
    const rr = mulberry32(1806_1064);
    for (let i = 0, n = 0; i < 1500 && n < 16; i++) {
      const x = px + (rr() * 2 - 1) * (hx - 10), z = pz + (rr() * 2 - 1) * (hz - 9);
      if (Math.abs(x - px) < 9 || Math.abs(z - pz) < 8 || Math.hypot(x - px, z - pz) < 24 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 11)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.round(rr()) * (Math.PI / 2), width: 7 + rr() * 2, depth: 7 + rr() * 2, storeys: 3, damaged: 0 });
    }
    // the medieval town west of the palace, Veli Varoš under Marjan
    for (let i = 0, n = 0; i < 2500 && n < 50; i++) {
      const x = -150 + rr() * 160, z = shoreZ(x) + 30 + rr() * 150;
      if (!free(x, z, 5) || nearPoint(x, z, 36)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: Math.round(rr() * 3) * (Math.PI / 2) + (rr() - 0.5) * 0.2, width: 7 + rr() * 3, depth: 7 + rr() * 2, storeys: 2 + Math.floor(rr() * 2), damaged: 0 });
    }
    props.rand = mulberry32(1806_1065);
    props.church({ x: -40, z: shoreZ(-40) + 120, yaw: 0 }); taken.push([-40, shoreZ(-40) + 120]);   // (the Franciscans)

    // ---- Klis: the fortress’s three rings on its spur, the gate on the south where the road comes up
    const { x: kx, z: kz } = KLIS;
    block(kx, kz + 32, 70, 3, 7, 0);
    block(kx - 36, kz, 64, 3, 7, Math.PI / 2);
    block(kx + 36, kz, 64, 3, 7, Math.PI / 2);
    block(kx - 23, kz - 32, 26, 3, 7, 0); block(kx + 23, kz - 32, 26, 3, 7, 0);
    tower(kx + 24, kz + 20, 10, 12); tower(kx - 36, kz + 32, 8, 10);
    taken.push([kx, kz], [kx + 24, kz + 20]);

    // ---- a Kaštel on the shore; Solin among the Salona ruins; the village on the Sinj road; farms
    tower(KASTEL.x, KASTEL.z, 12, 14); taken.push([KASTEL.x, KASTEL.z]);
    for (let i = 0; i < 14; i++) { const a = i * 0.45, x = P.E.x + 60 + Math.cos(a) * 30, z = P.E.z - 50 + Math.sin(a) * 18; if (free(x, z, 2)) props.column({ x, z, radius: 0.6, height: 1.5 + r() * 3 }); }
    for (const [x, z, yaw, len] of [[P.E.x + 50, P.E.z - 78, 0, 40], [P.E.x + 92, P.E.z - 50, Math.PI / 2, 30]] as const) if (free(x, z, 2)) props.lowWall({ x, z, yaw, length: len, height: 1.3, color: 0xc8bea8 });
    for (const [p, seed] of [[P.E, 18081], [P.K, 18082]] as const) buildVillage(props, p, seed);
    props.church({ x: P.E.x - 32, z: P.E.z + 26, yaw: 0 }); taken.push([P.E.x - 32, P.E.z + 26]);
    for (let i = 0, n = 0; i < 800 && n < 22; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = -100 + r() * 800;
      if (!free(x, z, 10) || nearPoint(x, z, 60) || (x > -160 && x < 220 && inland(x, z) < 220)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.house({ x, z, yaw: r() * Math.PI, width: 8 + r() * 3, depth: 6 });
    }
    for (let i = 0, n = 0; i < 3000 && n < 50; i++) {
      const x = (r() * 2 - 1) * 480, z = 100 + r() * 750;
      if (!free(x, z, 6) || nearPoint(x, z, 34) || Math.hypot(x, z - 830) < 60) continue;
      n++;
      props.wall({ x, z, yaw: Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.3, length: 14 + r() * 14, height: 1.1, thickness: 0.8 });
    }
    // fishing boats on the Riva and at Bačvice
    for (const [x0, n0] of [[-60, 4], [300, 3]] as const) for (let i = 0; i < n0; i++) props.box('plain', x0 + i * 9, terrain.heightAt(x0 + i * 9, shoreZ(x0 + i * 9) + 10) + 0.4, shoreZ(x0 + i * 9) + 10, 1.8, 0.6, 5.5, 0.2, 0x5a4434);
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 10 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || inland(x, z) < 26 || inPalace(x, z, 8) || Math.hypot(x - KLIS.x, z - KLIS.z) < 44 }];
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2800, broadleaf: 0.5, autumn: 0, maxY: 140,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 1.1, fields: this.fields, avoid });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
