// Chioggia and the Venetian lagoon (coastal, the 1806 epoch, hypothetical: the British land, the French hold;
// 1.0 × 1.8 km). After Pressburg Venice and its lagoon were French; the Royal Navy ruled the Adriatic and raided
// its coasts, and an Anglo-Austrian descent on the lagoon's southern gate was talked of more than once. Here it
// comes: the boats run in on the lido of Sottomarina, the long sand barrier between the sea and the lagoon. On the
// map the Adriatic is the -z side; the lido with its dunes, the fishing village of Sottomarina and the pine wood;
// behind it the lagoon — open water too deep to wade, the barene (salt-marsh islets) in it, the bricole marking
// the channels — and Chioggia on its island in the lagoon, joined to the lido by two bridges, to Brondolo on the
// mainland by a third, and to the terraferma by the long Ponte della Laguna. To the east the Brenta comes down
// across the reclaimed fields to its mouth at Brondolo, bridged at the coast and at Sant’Anna, with a summer ford
// upstream. Forte San Felice guards the west end of the lido, the Brondolo battery the Brenta mouth. The French come
// from the Padua road past Conche (+z).
// Both shores work: flipped (campaign flipLanding) the French land on the lido and the British hold the town.
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
const noise = createNoise2D(1806_45);
const sea = createSea({ level: 0, size: SIZE, color: 0x3a6c74 }); // (the northern Adriatic: milky green over the sand)

/** The waterline (world z; the sea toward -z): the lido's long, straight sand. */
export const shoreZ = (x: number) => -170 + 0.00004 * x * x + fbm(noise, x * 0.004, 2.1, 2) * 8;
/** How far inland (m; < 0 at sea). */
const inland = (x: number, z: number) => z - shoreZ(x);
const LIDO = 105; // the lido's width: the lagoon begins behind it

/** The lagoon: behind the lido, west of the Brondolo fields (xEast), south of the terraferma (zMain). 1 inside. */
const xEast = (z: number) => 40 + 0.25 * z;
const zMain = (x: number) => 300 + 0.08 * x;
const lagoonK = (x: number, z: number) => smoothstep(LIDO - 6, LIDO + 14, inland(x, z)) * smoothstep(xEast(z) + 10, xEast(z) - 14, x) * smoothstep(zMain(x) + 10, zMain(x) - 14, z);
/** Chioggia's island: 1 on it. */
const TOWN = { x: -210, z: 130, rx: 140, rz: 62 };
const islandE = (x: number, z: number) => ((x - TOWN.x) / TOWN.rx) ** 2 + ((z - TOWN.z) / TOWN.rz) ** 2;
/** The bridges over the lagoon (causeways: terrain): two from the lido, Brondolo's, the Ponte della Laguna. */
const BRIDGES: number[][] = [[-150, -82, -150, 82], [-290, -82, -290, 88], [-82, 130, 112, 130], [-270, 182, -332, 330]];

/** Distance from (x, z) to the segment a–b. */
const seg = (x: number, z: number, ax: number, az: number, bx: number, bz: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};
const bridgeD = (x: number, z: number) => { let d = Infinity; for (const [ax, az, bx, bz] of BRIDGES) d = Math.min(d, seg(x, z, ax, az, bx, bz)); return d; };

/** The Brenta: its line (x at z), its half-width (wide at the mouth), its crossings (two bridges, a summer ford). */
const brX = (z: number) => 290 + 30 * Math.sin(z * 0.004 + 1) + 10 * Math.sin(z * 0.013);
const CROSS = [{ name: 'Brondolo bridge', z: -80, bridge: true }, { name: 'Sant’Anna bridge', z: 330, bridge: true }, { name: 'Ca’ Lino ford', z: 620, bridge: false }];
const brenta = (x: number, z: number) => Math.abs(x - brX(z)) - (9 + 10 * smoothstep(-40, -170, z));

function height(x: number, z: number) {
  const d = inland(x, z);
  if (d < 0) { // the bottom: a bar where the surf breaks, then shelving away
    const s = -d, bar = 0.5 * Math.exp(-(((s - 40) / 14) ** 2));
    return Math.max(0.5 - s * 0.02 - Math.max(0, s - 110) * 0.045 + bar, -16);
  }
  const beach = 0.5 + Math.min(d, 30) * 0.05;
  const dunes = (2.2 + fbm(noise, x * 0.012, 3.7, 2) * 1.6) * Math.exp(-(((d - 48) / 14) ** 2));
  // the reclaimed fields: dead flat, a little higher toward Conche
  const land = 1.7 + fbm(noise, x * 0.006, z * 0.006, 2) * 0.5 + smoothstep(400, 900, z) * 2.5;
  let h = Math.max(beach + dunes * smoothstep(15, 32, d), Math.min(land, beach + d * 0.3));
  // the lagoon: open water too deep to wade, the barene showing in it; the island and the causeways out of it
  const lk = lagoonK(x, z);
  if (lk > 0) {
    const n = fbm(noise, x * 0.011 + 31, z * 0.011 - 7, 2);
    let w = -1.5 + 1.8 * smoothstep(0.2, 0.32, n) * smoothstep(40, 80, Math.hypot(x - TOWN.x, z - TOWN.z) - TOWN.rx * 0.5);
    const isl = smoothstep(1.18, 0.92, islandE(x, z)), cw = smoothstep(6.5, 4.5, bridgeD(x, z));
    w += (1.5 - w) * Math.max(isl, cw);
    h += (w - h) * lk;
  }
  // the Brenta: too deep to wade but at the ford; its bridges carry the road over
  const b = brenta(x, z);
  if (b < 24 && d > 0) {
    let bed = -1.7;
    for (const c of CROSS) bed += ((c.bridge ? 1.6 : -0.35) - bed) * (c.bridge ? smoothstep(6, 4, Math.abs(z - c.z)) : smoothstep(22, 10, Math.abs(z - c.z)));
    h += (Math.min(h, bed) - h) * smoothstep(14, 0, b);
  }
  return h;
}

/** Soft going: the beach sand, the barene's mud, the Brenta's banks. */
function soft(x: number, z: number, foot: boolean) {
  const d = inland(x, z);
  if (d >= 0 && d < 34) return foot ? 0.85 : 0.6;
  if (lagoonK(x, z) > 0.5 && bridgeD(x, z) > 6 && islandE(x, z) > 1) return foot ? 0.65 : 0.4;
  if (brenta(x, z) < 6) return foot ? 0.7 : 0.45;
  return 1;
}

/** The roads: the lido road, the bridges and the Corso, the Ponte della Laguna to Conche, the Brenta roads. */
const ROADS: number[][] = [
  [-500, -76, -200, -83], [-200, -83, 0, -85], [0, -85, 200, -83], [200, -83, 400, -79], [400, -79, 500, -75],
  ...BRIDGES, [-340, 130, -82, 130], [112, 130, 150, 150],
  [-332, 330, -300, 500], [-300, 500, -60, 700], [150, 150, 120, 450], [120, 450, -60, 700], [-60, 700, 0, 830],
  [400, -79, 385, 300], [385, 300, 385, 330], [385, 330, 205, 330], [205, 330, 120, 450], [385, 330, 330, 620], [330, 620, 300, 830], [330, 620, 200, 620],
];
const roadDist = (x: number, z: number) => { let d = Infinity; for (const [ax, az, bx, bz] of ROADS) d = Math.min(d, seg(x, z, ax, az, bx, bz)); return d; };

/** The beach sectors (x) and what lies inland behind each. */
export const SECTORS = [
  { x: -320, name: 'San Felice beach', inland: { name: 'Chioggia', x: TOWN.x, z: TOWN.z } },
  { x: 0, name: 'Sottomarina', inland: { name: 'Brondolo', x: 150, z: 150 } },
  { x: 390, name: 'Brenta mouth', inland: { name: 'Sant’Anna', x: 385, z: 300 } },
];

const points: ControlPointDef[] = [
  { id: 'A', name: 'The squadron’s anchorage', x: 0, z: -770, owner: 'pact', sector: 'centre', radius: 90 },
  { id: 'B', name: SECTORS[0].name, x: SECTORS[0].x, z: shoreZ(SECTORS[0].x) + 42, owner: null, sector: 'west', radius: 50, opens: 'E' },
  { id: 'C', name: SECTORS[1].name, x: SECTORS[1].x, z: shoreZ(SECTORS[1].x) + 50, owner: null, sector: 'centre', radius: 55, opens: 'F' },
  { id: 'D', name: SECTORS[2].name, x: SECTORS[2].x, z: shoreZ(SECTORS[2].x) + 42, owner: null, sector: 'east', radius: 50, opens: 'G' },
  { id: 'E', name: 'Chioggia', x: TOWN.x, z: TOWN.z, owner: null, sector: 'west', radius: 45 },
  { id: 'F', name: 'Brondolo', x: 150, z: 150, owner: null, sector: 'centre' },
  { id: 'G', name: 'Sant’Anna', x: 385, z: 300, owner: null, sector: 'east' },
  { id: 'K', name: 'Conche', x: -60, z: 700, owner: 'nato', sector: 'centre' },
];
const P = Object.fromEntries(points.map((p) => [p.id, p]));
const SANFELICE = { x: -430, z: shoreZ(-430) + 70 };   // the star fort at the lido’s end (squared off)
const BRONDOLO = { x: 245, z: shoreZ(245) + 70 };       // the battery on the Brenta’s west bank

/** The pine wood on the lido, poplars and willow along the Brenta, orchards and hedgerows on the terraferma (0..1). */
const woods = (x: number, z: number) => {
  const d = inland(x, z);
  if (d < 64 || lagoonK(x, z) > 0.05) return 0;
  let k = 0;
  if (d < LIDO) k = smoothstep(0.35, 0.55, fbm(noise, x * 0.01 + 3, z * 0.01, 2)) * (Math.abs(x + 230) > 120 ? 0.9 : 0.25); // (the pineta, thin by the town bridges)
  else k = smoothstep(0.45, 0.62, fbm(noise, x * 0.008 + 11, z * 0.008 - 3, 3)) * 0.7;
  const b = brenta(x, z);
  if (b > 8 && b < 20) k = Math.max(k, 0.5);
  for (const p of points) k = Math.min(k, smoothstep(32, 62, Math.hypot(x - p.x, z - p.z)));
  return Math.min(k, smoothstep(5, 12, roadDist(x, z)));
};

export default {
  id: 'chioggia',
  name: 'Chioggia 1806',
  description: 'The Venetian lagoon (hypothetical): the British row ashore on the lido of Sottomarina to take Chioggia from the French. The lido and its dunes, the lagoon with its barene, Chioggia on its island and its bridges, the Brenta mouth at Brondolo.',
  epochs: ['1806'],
  theatre: 'coastal',
  region: 'italy',
  modes: ['landing'],
  sides: { nato: 'France', pact: 'Britain' },
  armies: { nato: ['fr'], pact: ['gb', 'au'] }, // (the Royal Navy’s landing force with Austrians embarked at Trieste; au has no roster yet: gb fields)
  airfields: [],
  conditions: { time: 'day', weather: 'clear' },
  wind: { from: 60, speed: 4, veer: 0.15 }, // (the bora’s tail off the Alps: a fresh north-easter)
  size: SIZE,
  segments: 800,
  bounds: BOUNDS,
  steep: 0.5,
  camera: { maxHeight: 900, near: 1, far: 6000 },
  seed: 1806_0945,
  height,
  soft,
  river: sea,
  woods: (x: number, z: number) => woods(x, z) * 0.8,
  fields: createFields({ seed: 1806_45, cell: 60, weights: [0.3, 0.3, 0.2, 0.2] }), // (the orti: market gardens and maize on the reclaimed land)

  theme: {
    // the lagoon light: a pale, hazy sky over flat water
    fogColor: 0xc8d0cc, fogDensity: 0.0006,
    skyTop: 0x6a90b8, skyHorizon: 0xdce2de, skyBottom: 0xa8aca0,
    sunColor: 0xfff0d8, sunIntensity: 1.9, sunDisk: 0.5,
    clouds: 0.25, cloudLight: 0xf4f4f0, cloudDark: 0xbcc0c0,
    sunDir: [-0.35, 0.65, -0.55],
    hemiSky: 0xd0dce4, hemiGround: 0x7c7a5a, hemiIntensity: 1.2,
    rimColor: 0xf0e8d8, rimIntensity: 0.3,
    terrain: {
      grass: '#7e8c4c', grassAlt: '#748446', dryGrass: '#a8a06a', dirt: '#86704e', rock: '#9a9282',
      pasture: '#8a9454', ploughed: '#7e6448', stubble: '#b8a874', meadow: '#768a48',
      farmX: [BOUNDS.x + 10, BOUNDS.x + 120], farmZ: [BOUNDS.z + 10, BOUNDS.z + 120],
      roads: [], roadZ: 0,
      surface(x: number, z: number, y: number) {
        const d = inland(x, z);
        if (d < 0) return [y > -1.2 ? 0xd0c6a4 : 0x868a7c, 1];                       // the sand under the water
        if (d < 32) return [0xdcd0ac, 1];                                             // the beach
        if (y < 0.05) return [0x6e6a52, 1];                                           // the lagoon’s mud bottom, the Brenta’s bed
        if (roadDist(x, z) < 3) return [0xb0a080, 0.8];                               // the roads
        if (islandE(x, z) < 1.05) return [0x9a8c78, 0.7];                             // the town’s paving
        if (lagoonK(x, z) > 0.5 && bridgeD(x, z) > 6) return [0x6a7444, 0.9];         // the barene: samphire and sea lavender
        if (d < 70) return [0xc4bc94, 0.6];                                           // the dunes’ loose sand
        return null;
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
    surf: 0.25, // (a short Adriatic chop on the bar)
    signal: { t: 25, say: 'The signal from the frigate — every boat pulls for the lido', sayOther: 'Boats off the lido: the English are coming ashore' },
    navy: ['frigate', 'destroyer'],
    // Forte San Felice at the lido’s end, the Brondolo battery at the Brenta mouth, field guns in Sottomarina
    forts: [
      { unit: 'shoreBattery', x: SANFELICE.x + 12, z: SANFELICE.z - 16, facing: Math.PI },
      { unit: 'shoreBattery', x: BRONDOLO.x, z: BRONDOLO.z - 18, facing: Math.PI },
      { unit: 'artillery', x: 70, z: shoreZ(70) + 92, facing: Math.PI },
    ],
    works: [
      ...SECTORS.flatMap((s) => [-45, 0, 45].map((dx) => ({ kind: 'trench', x: s.x + dx, z: shoreZ(s.x + dx) + 62, yaw: 0 }))),
      ...SECTORS.flatMap((s) => [-44, -30, -16, 16, 30, 44].map((dx) => ({ kind: 'wire', x: s.x + dx, z: shoreZ(s.x + dx) + 36, yaw: 0 }))),
    ],
    defence: ['rifles', 'mgTeam', 'rifles', 'rifles', 'mgTeam', 'atTeam', 'rifles', 'mortar', 'reconVehicle'],
    names: { reconVehicle: 'Chasseurs à cheval italiens' },
    // the garrison of Venice comes down by the Ponte della Laguna and the Brenta road
    counter: { t: 170, units: ['rifles', 'rifles', 'reconVehicle', 'ifv', 'artillery'], say: 'The Venice garrison is coming down the Brenta road and over the Ponte della Laguna!', sayOther: 'French columns on the Brenta road — they are coming for the bridges!' },
    hold: [...SECTORS.flatMap((s) => [-30, 30].map((dx) => ({ x: s.x + dx, z: shoreZ(s.x + dx) + 62 }))), ...SECTORS.map((s) => ({ x: s.inland.x, z: s.inland.z }))],
    ai: { order: ['rifles', 'mgTeam', 'rifles', 'sniper', 'atTeam', 'artillery', 'rifles', 'marines', 'rifles', 'reconVehicle', 'atTeam', 'rifles'], gunship: 'frigate', gunships: 1, heavy: null, inshore: 300 },
    economy: { reserves: 2000, perSector: 600, beachIncome: 0.7, defenceCp: 650, defenceIncome: 0.8 },
    waves: [
      { t: 0, units: [
        { unit: 'rifles', sector: 0 }, { unit: 'mgTeam', sector: 0 }, { unit: 'rifles', sector: 0 },
        { unit: 'rifles', sector: 1 }, { unit: 'marines', sector: 1 }, { unit: 'guard', sector: 1 },
        { unit: 'rifles', sector: 2 }, { unit: 'mgTeam', sector: 2 }, { unit: 'atTeam', sector: 2 },
      ] },
      { t: 150, say: 'The launches are bringing in the guns', units: [{ unit: 'artillery', sector: 1 }, { unit: 'sailors', sector: 1 }, { unit: 'rifles', sector: 0 }] },
      { t: 300, say: 'The second brigade is coming ashore', units: [{ unit: 'rifles', sector: 2 }, { unit: 'rifles', sector: 0 }, { unit: 'artillery', sector: 2 }] },
    ],
  },

  decorate({ scene, terrain, cover, rand, bounds }) {
    const props = new PropBuilder({ scene, terrain, cover });
    const r = mulberry32(1806_0946);
    sea.build(scene, terrain);
    const taken: number[][] = [];
    const nearPoint = (x: number, z: number, rr: number) => points.some((p) => Math.hypot(p.x - x, p.z - z) < rr);
    const dry = (x: number, z: number, rr: number) => [[0, 0], [rr, 0], [-rr, 0], [0, rr], [0, -rr]].every(([dx, dz]) => terrain.heightAt(x + dx, z + dz) > 0.9);
    const free = (x: number, z: number, rr: number) => roadDist(x, z) > 5 + rr && brenta(x, z) > 10 + rr && dry(x, z, rr) && !taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < rr + 8);
    const STONE = 0xcfc4ae, BRICK = 0xa86a4e;
    const fort = (c: { x: number; z: number }, w: number, d: number, hgt: number) => { // a squat brick-faced fort, earth behind
      const g = terrain.heightAt(c.x, c.z);
      for (const [dx, dz, len, yaw] of [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]] as const) {
        props.box('stone', c.x + dx, g + hgt / 2 - 0.5, c.z + dz, len, hgt + 1, 3, yaw, BRICK);
        props.cover.addBox({ x: c.x + dx, z: c.z + dz, yaw, length: len, thickness: 3, height: hgt });
      }
      taken.push([c.x, c.z]);
    };

    // ---- Forte San Felice and the Brondolo battery
    fort(SANFELICE, 34, 26, 4.5);
    fort(BRONDOLO, 24, 20, 3.5);

    // ---- Chioggia: the Corso down the island, the houses in blocks either side, the Duomo, San Domenico, the granary
    props.rand = mulberry32(1806_0947);
    props.church({ x: -318, z: 112, yaw: 0 }); taken.push([-318, 112]);
    props.church({ x: -110, z: 160, yaw: Math.PI / 2 }); taken.push([-110, 160]);
    props.townHouse({ x: -250, z: 110, yaw: 0, width: 22, depth: 9, storeys: 2, name: 'the Granaio', damaged: 0 }); taken.push([-250, 110]);
    const rr = mulberry32(1806_0948);
    for (let i = 0, n = 0; i < 2500 && n < 60; i++) {
      const x = TOWN.x + (rr() * 2 - 1) * (TOWN.rx - 14), z = TOWN.z + (rr() * 2 - 1) * (TOWN.rz - 10);
      if (islandE(x, z) > 0.78 || Math.abs(z - 130) < 11 || bridgeD(x, z) < 12 || Math.hypot(x - P.E.x, z - P.E.z) < 26 || taken.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 12)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(rr() * 1e9));
      props.townHouse({ x, z, yaw: (rr() < 0.8 ? Math.PI / 2 : 0) + (rr() - 0.5) * 0.06, width: 7 + rr() * 3, depth: 8 + rr() * 2, storeys: rr() < 0.5 ? 3 : 2, damaged: 0 });
    }
    // the bridges’ parapets (only to look at: the decks are the terrain)
    for (const [ax, az, bx, bz] of BRIDGES) {
      const len = Math.hypot(bx - ax, bz - az), yaw = -Math.atan2(bz - az, bx - ax), nx = -(bz - az) / len, nz = (bx - ax) / len;
      for (const s of [-1, 1]) props.box('stone', (ax + bx) / 2 + nx * 5 * s, 1.9, (az + bz) / 2 + nz * 5 * s, len - 16, 0.9, 0.5, yaw, STONE);
    }
    // the bricole (pile markers) along the channels, the bragozzi at their moorings
    for (let i = 0, n = 0; i < 1500 && n < 90; i++) {
      const x = -480 + r() * 520, z = -40 + r() * 330;
      if (lagoonK(x, z) < 0.95 || terrain.heightAt(x, z) > -1 || bridgeD(x, z) < 14) continue;
      n++;
      for (let k = 0; k < 3; k++) props.box('plain', x + k * 0.5, -0.5, z + (k % 2) * 0.5, 0.35, 4.4, 0.35, 0, 0x4a3c2c);
    }
    for (let i = 0; i < 8; i++) {
      const x = TOWN.x - 120 + i * 30, z = TOWN.z + TOWN.rz + 10 + (i % 2) * 4;
      if (terrain.heightAt(x, z) < -0.8) props.box('plain', x, 0.25, z, 3.4, 1.1, 11, 0.1 * (i % 3), 0x6a4630);
    }

    // ---- Sottomarina behind the dunes, Brondolo, Sant’Anna, Conche
    for (let i = 0, n = 0; i < 600 && n < 16; i++) {
      const x = -120 + r() * 300, z = shoreZ(x) + 72 + r() * 26;
      if (!free(x, z, 6) || nearPoint(x, z, 40)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.house({ x, z, yaw: Math.PI / 2 * Math.round(r()), width: 7 + r() * 3, depth: 6, height: 3.2 });
    }
    for (const [p, seed] of [[P.F, 18064], [P.G, 18065], [P.K, 18066]] as const) buildVillage(props, p, seed);
    props.rand = mulberry32(1806_0949);
    props.church({ x: P.G.x + 32, z: P.G.z + 22, yaw: Math.PI / 2 }); taken.push([P.G.x + 32, P.G.z + 22]);
    props.church({ x: P.K.x - 30, z: P.K.z + 26, yaw: 0 }); taken.push([P.K.x - 30, P.K.z + 26]);
    // farmhouses (casoni) on the terraferma, their field walls
    for (let i = 0, n = 0; i < 600 && n < 24; i++) {
      const x = (r() * 2 - 1) * (bounds.x - 40), z = 200 + r() * 600;
      if (!free(x, z, 10) || lagoonK(x, z) > 0 || nearPoint(x, z, 70)) continue;
      taken.push([x, z]); n++;
      props.rand = mulberry32(Math.floor(r() * 1e9));
      props.house({ x, z, yaw: r() * Math.PI, width: 8 + r() * 4, depth: 6 });
      if (r() < 0.5) props.lowWall({ x: x + 10, z: z + 6, yaw: r() * Math.PI, length: 10 + r() * 8, height: 1.1, color: 0x9a8c72 });
    }
    // fishing boats drawn up on the beach by the river mouth
    for (let i = 0; i < 4; i++) props.box('plain', 200 + i * 9, terrain.heightAt(200 + i * 9, shoreZ(200) + 18) + 0.4, shoreZ(200 + i * 9) + 18, 1.6, 0.6, 5, 0.3, 0x5a4434);
    commandPost(props, this.bases.nato, -1, 0x6a6e52);
    props.finish();

    const avoid = [...points.map((p) => ({ x: p.x, z: p.z, r: 14 })), ...taken.map(([x, z]) => ({ x, z, r: 10 })),
      { test: (x: number, z: number) => roadDist(x, z) < 5 || brenta(x, z) < 6 || inland(x, z) < 60 || lagoonK(x, z) > 0.05 }];
    // umbrella and maritime pines on the lido, poplars and willows by the Brenta, mulberries and orchards inland
    const trees = plantTrees({ scene, terrain, cover, rand, area: bounds, avoid, lane: 0, count: 2400, broadleaf: 0.6, autumn: 0, maxY: 40,
      forest: (x: number, z: number) => woods(x, z) * 0.9 });
    cover.finalize(bounds);
    const ground = growGround({ scene, terrain, cover, rand, area: bounds, palette: this.theme.terrain, density: 0.9, fields: this.fields,
      avoid: [...avoid, { test: (x: number, z: number) => inland(x, z) < 34 || islandE(x, z) < 1.1 }] });
    return {
      buildings: props.buildings,
      update(dt: number, t: number) { trees.update?.(dt, t); ground.update(dt, t); },
    };
  },
} satisfies MapDef;
